/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SnippetSession_1;
import { groupBy } from '../../../../base/common/arrays.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { getLeadingWhitespace } from '../../../../base/common/strings.js';
import './snippetSession.css';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Choice, Placeholder, SnippetParser, Text, TextmateSnippet, } from './snippetParser.js';
import { ClipboardBasedVariableResolver, CommentBasedVariableResolver, CompositeSnippetVariableResolver, ModelBasedVariableResolver, RandomBasedVariableResolver, SelectionBasedVariableResolver, TimeBasedVariableResolver, WorkspaceBasedVariableResolver, } from './snippetVariables.js';
export class OneSnippet {
    static { this._decor = {
        active: ModelDecorationOptions.register({
            description: 'snippet-placeholder-1',
            stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
            className: 'snippet-placeholder',
        }),
        inactive: ModelDecorationOptions.register({
            description: 'snippet-placeholder-2',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            className: 'snippet-placeholder',
        }),
        activeFinal: ModelDecorationOptions.register({
            description: 'snippet-placeholder-3',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            className: 'finish-snippet-placeholder',
        }),
        inactiveFinal: ModelDecorationOptions.register({
            description: 'snippet-placeholder-4',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            className: 'finish-snippet-placeholder',
        }),
    }; }
    constructor(_editor, _snippet, _snippetLineLeadingWhitespace) {
        this._editor = _editor;
        this._snippet = _snippet;
        this._snippetLineLeadingWhitespace = _snippetLineLeadingWhitespace;
        this._offset = -1;
        this._nestingLevel = 1;
        this._placeholderGroups = groupBy(_snippet.placeholders, Placeholder.compareByIndex);
        this._placeholderGroupsIdx = -1;
    }
    initialize(textChange) {
        this._offset = textChange.newPosition;
    }
    dispose() {
        if (this._placeholderDecorations) {
            this._editor.removeDecorations([...this._placeholderDecorations.values()]);
        }
        this._placeholderGroups.length = 0;
    }
    _initDecorations() {
        if (this._offset === -1) {
            throw new Error(`Snippet not initialized!`);
        }
        if (this._placeholderDecorations) {
            // already initialized
            return;
        }
        this._placeholderDecorations = new Map();
        const model = this._editor.getModel();
        this._editor.changeDecorations((accessor) => {
            // create a decoration for each placeholder
            for (const placeholder of this._snippet.placeholders) {
                const placeholderOffset = this._snippet.offset(placeholder);
                const placeholderLen = this._snippet.fullLen(placeholder);
                const range = Range.fromPositions(model.getPositionAt(this._offset + placeholderOffset), model.getPositionAt(this._offset + placeholderOffset + placeholderLen));
                const options = placeholder.isFinalTabstop
                    ? OneSnippet._decor.inactiveFinal
                    : OneSnippet._decor.inactive;
                const handle = accessor.addDecoration(range, options);
                this._placeholderDecorations.set(placeholder, handle);
            }
        });
    }
    move(fwd) {
        if (!this._editor.hasModel()) {
            return [];
        }
        this._initDecorations();
        // Transform placeholder text if necessary
        if (this._placeholderGroupsIdx >= 0) {
            const operations = [];
            for (const placeholder of this._placeholderGroups[this._placeholderGroupsIdx]) {
                // Check if the placeholder has a transformation
                if (placeholder.transform) {
                    const id = this._placeholderDecorations.get(placeholder);
                    const range = this._editor.getModel().getDecorationRange(id);
                    const currentValue = this._editor.getModel().getValueInRange(range);
                    const transformedValueLines = placeholder.transform
                        .resolve(currentValue)
                        .split(/\r\n|\r|\n/);
                    // fix indentation for transformed lines
                    for (let i = 1; i < transformedValueLines.length; i++) {
                        transformedValueLines[i] = this._editor
                            .getModel()
                            .normalizeIndentation(this._snippetLineLeadingWhitespace + transformedValueLines[i]);
                    }
                    operations.push(EditOperation.replace(range, transformedValueLines.join(this._editor.getModel().getEOL())));
                }
            }
            if (operations.length > 0) {
                this._editor.executeEdits('snippet.placeholderTransform', operations);
            }
        }
        let couldSkipThisPlaceholder = false;
        if (fwd === true && this._placeholderGroupsIdx < this._placeholderGroups.length - 1) {
            this._placeholderGroupsIdx += 1;
            couldSkipThisPlaceholder = true;
        }
        else if (fwd === false && this._placeholderGroupsIdx > 0) {
            this._placeholderGroupsIdx -= 1;
            couldSkipThisPlaceholder = true;
        }
        else {
            // the selection of the current placeholder might
            // not acurate any more -> simply restore it
        }
        const newSelections = this._editor.getModel().changeDecorations((accessor) => {
            const activePlaceholders = new Set();
            // change stickiness to always grow when typing at its edges
            // because these decorations represent the currently active
            // tabstop.
            // Special case #1: reaching the final tabstop
            // Special case #2: placeholders enclosing active placeholders
            const selections = [];
            for (const placeholder of this._placeholderGroups[this._placeholderGroupsIdx]) {
                const id = this._placeholderDecorations.get(placeholder);
                const range = this._editor.getModel().getDecorationRange(id);
                selections.push(new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn));
                // consider to skip this placeholder index when the decoration
                // range is empty but when the placeholder wasn't. that's a strong
                // hint that the placeholder has been deleted. (all placeholder must match this)
                couldSkipThisPlaceholder =
                    couldSkipThisPlaceholder && this._hasPlaceholderBeenCollapsed(placeholder);
                accessor.changeDecorationOptions(id, placeholder.isFinalTabstop ? OneSnippet._decor.activeFinal : OneSnippet._decor.active);
                activePlaceholders.add(placeholder);
                for (const enclosingPlaceholder of this._snippet.enclosingPlaceholders(placeholder)) {
                    const id = this._placeholderDecorations.get(enclosingPlaceholder);
                    accessor.changeDecorationOptions(id, enclosingPlaceholder.isFinalTabstop
                        ? OneSnippet._decor.activeFinal
                        : OneSnippet._decor.active);
                    activePlaceholders.add(enclosingPlaceholder);
                }
            }
            // change stickness to never grow when typing at its edges
            // so that in-active tabstops never grow
            for (const [placeholder, id] of this._placeholderDecorations) {
                if (!activePlaceholders.has(placeholder)) {
                    accessor.changeDecorationOptions(id, placeholder.isFinalTabstop
                        ? OneSnippet._decor.inactiveFinal
                        : OneSnippet._decor.inactive);
                }
            }
            return selections;
        });
        return !couldSkipThisPlaceholder ? (newSelections ?? []) : this.move(fwd);
    }
    _hasPlaceholderBeenCollapsed(placeholder) {
        // A placeholder is empty when it wasn't empty when authored but
        // when its tracking decoration is empty. This also applies to all
        // potential parent placeholders
        let marker = placeholder;
        while (marker) {
            if (marker instanceof Placeholder) {
                const id = this._placeholderDecorations.get(marker);
                const range = this._editor.getModel().getDecorationRange(id);
                if (range.isEmpty() && marker.toString().length > 0) {
                    return true;
                }
            }
            marker = marker.parent;
        }
        return false;
    }
    get isAtFirstPlaceholder() {
        return this._placeholderGroupsIdx <= 0 || this._placeholderGroups.length === 0;
    }
    get isAtLastPlaceholder() {
        return this._placeholderGroupsIdx === this._placeholderGroups.length - 1;
    }
    get hasPlaceholder() {
        return this._snippet.placeholders.length > 0;
    }
    /**
     * A snippet is trivial when it has no placeholder or only a final placeholder at
     * its very end
     */
    get isTrivialSnippet() {
        if (this._snippet.placeholders.length === 0) {
            return true;
        }
        if (this._snippet.placeholders.length === 1) {
            const [placeholder] = this._snippet.placeholders;
            if (placeholder.isFinalTabstop) {
                if (this._snippet.rightMostDescendant === placeholder) {
                    return true;
                }
            }
        }
        return false;
    }
    computePossibleSelections() {
        const result = new Map();
        for (const placeholdersWithEqualIndex of this._placeholderGroups) {
            let ranges;
            for (const placeholder of placeholdersWithEqualIndex) {
                if (placeholder.isFinalTabstop) {
                    // ignore those
                    break;
                }
                if (!ranges) {
                    ranges = [];
                    result.set(placeholder.index, ranges);
                }
                const id = this._placeholderDecorations.get(placeholder);
                const range = this._editor.getModel().getDecorationRange(id);
                if (!range) {
                    // one of the placeholder lost its decoration and
                    // therefore we bail out and pretend the placeholder
                    // (with its mirrors) doesn't exist anymore.
                    result.delete(placeholder.index);
                    break;
                }
                ranges.push(range);
            }
        }
        return result;
    }
    get activeChoice() {
        if (!this._placeholderDecorations) {
            return undefined;
        }
        const placeholder = this._placeholderGroups[this._placeholderGroupsIdx][0];
        if (!placeholder?.choice) {
            return undefined;
        }
        const id = this._placeholderDecorations.get(placeholder);
        if (!id) {
            return undefined;
        }
        const range = this._editor.getModel().getDecorationRange(id);
        if (!range) {
            return undefined;
        }
        return { range, choice: placeholder.choice };
    }
    get hasChoice() {
        let result = false;
        this._snippet.walk((marker) => {
            result = marker instanceof Choice;
            return !result;
        });
        return result;
    }
    merge(others) {
        const model = this._editor.getModel();
        this._nestingLevel *= 10;
        this._editor.changeDecorations((accessor) => {
            // For each active placeholder take one snippet and merge it
            // in that the placeholder (can be many for `$1foo$1foo`). Because
            // everything is sorted by editor selection we can simply remove
            // elements from the beginning of the array
            for (const placeholder of this._placeholderGroups[this._placeholderGroupsIdx]) {
                const nested = others.shift();
                console.assert(nested._offset !== -1);
                console.assert(!nested._placeholderDecorations);
                // Massage placeholder-indicies of the nested snippet to be
                // sorted right after the insertion point. This ensures we move
                // through the placeholders in the correct order
                const indexLastPlaceholder = nested._snippet.placeholderInfo.last.index;
                for (const nestedPlaceholder of nested._snippet.placeholderInfo.all) {
                    if (nestedPlaceholder.isFinalTabstop) {
                        nestedPlaceholder.index =
                            placeholder.index + (indexLastPlaceholder + 1) / this._nestingLevel;
                    }
                    else {
                        nestedPlaceholder.index =
                            placeholder.index + nestedPlaceholder.index / this._nestingLevel;
                    }
                }
                this._snippet.replace(placeholder, nested._snippet.children);
                // Remove the placeholder at which position are inserting
                // the snippet and also remove its decoration.
                const id = this._placeholderDecorations.get(placeholder);
                accessor.removeDecoration(id);
                this._placeholderDecorations.delete(placeholder);
                // For each *new* placeholder we create decoration to monitor
                // how and if it grows/shrinks.
                for (const placeholder of nested._snippet.placeholders) {
                    const placeholderOffset = nested._snippet.offset(placeholder);
                    const placeholderLen = nested._snippet.fullLen(placeholder);
                    const range = Range.fromPositions(model.getPositionAt(nested._offset + placeholderOffset), model.getPositionAt(nested._offset + placeholderOffset + placeholderLen));
                    const handle = accessor.addDecoration(range, OneSnippet._decor.inactive);
                    this._placeholderDecorations.set(placeholder, handle);
                }
            }
            // Last, re-create the placeholder groups by sorting placeholders by their index.
            this._placeholderGroups = groupBy(this._snippet.placeholders, Placeholder.compareByIndex);
        });
    }
    getEnclosingRange() {
        let result;
        const model = this._editor.getModel();
        for (const decorationId of this._placeholderDecorations.values()) {
            const placeholderRange = model.getDecorationRange(decorationId) ?? undefined;
            if (!result) {
                result = placeholderRange;
            }
            else {
                result = result.plusRange(placeholderRange);
            }
        }
        return result;
    }
}
const _defaultOptions = {
    overwriteBefore: 0,
    overwriteAfter: 0,
    adjustWhitespace: true,
    clipboardText: undefined,
    overtypingCapturer: undefined,
};
let SnippetSession = SnippetSession_1 = class SnippetSession {
    static adjustWhitespace(model, position, adjustIndentation, snippet, filter) {
        const line = model.getLineContent(position.lineNumber);
        const lineLeadingWhitespace = getLeadingWhitespace(line, 0, position.column - 1);
        // the snippet as inserted
        let snippetTextString;
        snippet.walk((marker) => {
            // all text elements that are not inside choice
            if (!(marker instanceof Text) || marker.parent instanceof Choice) {
                return true;
            }
            // check with filter (iff provided)
            if (filter && !filter.has(marker)) {
                return true;
            }
            const lines = marker.value.split(/\r\n|\r|\n/);
            if (adjustIndentation) {
                // adjust indentation of snippet test
                // -the snippet-start doesn't get extra-indented (lineLeadingWhitespace), only normalized
                // -all N+1 lines get extra-indented and normalized
                // -the text start get extra-indented and normalized when following a linebreak
                const offset = snippet.offset(marker);
                if (offset === 0) {
                    // snippet start
                    lines[0] = model.normalizeIndentation(lines[0]);
                }
                else {
                    // check if text start is after a linebreak
                    snippetTextString = snippetTextString ?? snippet.toString();
                    const prevChar = snippetTextString.charCodeAt(offset - 1);
                    if (prevChar === 10 /* CharCode.LineFeed */ || prevChar === 13 /* CharCode.CarriageReturn */) {
                        lines[0] = model.normalizeIndentation(lineLeadingWhitespace + lines[0]);
                    }
                }
                for (let i = 1; i < lines.length; i++) {
                    lines[i] = model.normalizeIndentation(lineLeadingWhitespace + lines[i]);
                }
            }
            const newValue = lines.join(model.getEOL());
            if (newValue !== marker.value) {
                marker.parent.replace(marker, [new Text(newValue)]);
                snippetTextString = undefined;
            }
            return true;
        });
        return lineLeadingWhitespace;
    }
    static adjustSelection(model, selection, overwriteBefore, overwriteAfter) {
        if (overwriteBefore !== 0 || overwriteAfter !== 0) {
            // overwrite[Before|After] is compute using the position, not the whole
            // selection. therefore we adjust the selection around that position
            const { positionLineNumber, positionColumn } = selection;
            const positionColumnBefore = positionColumn - overwriteBefore;
            const positionColumnAfter = positionColumn + overwriteAfter;
            const range = model.validateRange({
                startLineNumber: positionLineNumber,
                startColumn: positionColumnBefore,
                endLineNumber: positionLineNumber,
                endColumn: positionColumnAfter,
            });
            selection = Selection.createWithDirection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn, selection.getDirection());
        }
        return selection;
    }
    static createEditsAndSnippetsFromSelections(editor, template, overwriteBefore, overwriteAfter, enforceFinalTabstop, adjustWhitespace, clipboardText, overtypingCapturer, languageConfigurationService) {
        const edits = [];
        const snippets = [];
        if (!editor.hasModel()) {
            return { edits, snippets };
        }
        const model = editor.getModel();
        const workspaceService = editor.invokeWithinContext((accessor) => accessor.get(IWorkspaceContextService));
        const modelBasedVariableResolver = editor.invokeWithinContext((accessor) => new ModelBasedVariableResolver(accessor.get(ILabelService), model));
        const readClipboardText = () => clipboardText;
        // know what text the overwrite[Before|After] extensions
        // of the primary cursor have selected because only when
        // secondary selections extend to the same text we can grow them
        const firstBeforeText = model.getValueInRange(SnippetSession_1.adjustSelection(model, editor.getSelection(), overwriteBefore, 0));
        const firstAfterText = model.getValueInRange(SnippetSession_1.adjustSelection(model, editor.getSelection(), 0, overwriteAfter));
        // remember the first non-whitespace column to decide if
        // `keepWhitespace` should be overruled for secondary selections
        const firstLineFirstNonWhitespace = model.getLineFirstNonWhitespaceColumn(editor.getSelection().positionLineNumber);
        // sort selections by their start position but remeber
        // the original index. that allows you to create correct
        // offset-based selection logic without changing the
        // primary selection
        const indexedSelections = editor
            .getSelections()
            .map((selection, idx) => ({ selection, idx }))
            .sort((a, b) => Range.compareRangesUsingStarts(a.selection, b.selection));
        for (const { selection, idx } of indexedSelections) {
            // extend selection with the `overwriteBefore` and `overwriteAfter` and then
            // compare if this matches the extensions of the primary selection
            let extensionBefore = SnippetSession_1.adjustSelection(model, selection, overwriteBefore, 0);
            let extensionAfter = SnippetSession_1.adjustSelection(model, selection, 0, overwriteAfter);
            if (firstBeforeText !== model.getValueInRange(extensionBefore)) {
                extensionBefore = selection;
            }
            if (firstAfterText !== model.getValueInRange(extensionAfter)) {
                extensionAfter = selection;
            }
            // merge the before and after selection into one
            const snippetSelection = selection
                .setStartPosition(extensionBefore.startLineNumber, extensionBefore.startColumn)
                .setEndPosition(extensionAfter.endLineNumber, extensionAfter.endColumn);
            const snippet = new SnippetParser().parse(template, true, enforceFinalTabstop);
            // adjust the template string to match the indentation and
            // whitespace rules of this insert location (can be different for each cursor)
            // happens when being asked for (default) or when this is a secondary
            // cursor and the leading whitespace is different
            const start = snippetSelection.getStartPosition();
            const snippetLineLeadingWhitespace = SnippetSession_1.adjustWhitespace(model, start, adjustWhitespace ||
                (idx > 0 &&
                    firstLineFirstNonWhitespace !==
                        model.getLineFirstNonWhitespaceColumn(selection.positionLineNumber)), snippet);
            snippet.resolveVariables(new CompositeSnippetVariableResolver([
                modelBasedVariableResolver,
                new ClipboardBasedVariableResolver(readClipboardText, idx, indexedSelections.length, editor.getOption(80 /* EditorOption.multiCursorPaste */) === 'spread'),
                new SelectionBasedVariableResolver(model, selection, idx, overtypingCapturer),
                new CommentBasedVariableResolver(model, selection, languageConfigurationService),
                new TimeBasedVariableResolver(),
                new WorkspaceBasedVariableResolver(workspaceService),
                new RandomBasedVariableResolver(),
            ]));
            // store snippets with the index of their originating selection.
            // that ensures the primary cursor stays primary despite not being
            // the one with lowest start position
            edits[idx] = EditOperation.replace(snippetSelection, snippet.toString());
            edits[idx].identifier = { major: idx, minor: 0 }; // mark the edit so only our undo edits will be used to generate end cursors
            edits[idx]._isTracked = true;
            snippets[idx] = new OneSnippet(editor, snippet, snippetLineLeadingWhitespace);
        }
        return { edits, snippets };
    }
    static createEditsAndSnippetsFromEdits(editor, snippetEdits, enforceFinalTabstop, adjustWhitespace, clipboardText, overtypingCapturer, languageConfigurationService) {
        if (!editor.hasModel() || snippetEdits.length === 0) {
            return { edits: [], snippets: [] };
        }
        const edits = [];
        const model = editor.getModel();
        const parser = new SnippetParser();
        const snippet = new TextmateSnippet();
        // snippet variables resolver
        const resolver = new CompositeSnippetVariableResolver([
            editor.invokeWithinContext((accessor) => new ModelBasedVariableResolver(accessor.get(ILabelService), model)),
            new ClipboardBasedVariableResolver(() => clipboardText, 0, editor.getSelections().length, editor.getOption(80 /* EditorOption.multiCursorPaste */) === 'spread'),
            new SelectionBasedVariableResolver(model, editor.getSelection(), 0, overtypingCapturer),
            new CommentBasedVariableResolver(model, editor.getSelection(), languageConfigurationService),
            new TimeBasedVariableResolver(),
            new WorkspaceBasedVariableResolver(editor.invokeWithinContext((accessor) => accessor.get(IWorkspaceContextService))),
            new RandomBasedVariableResolver(),
        ]);
        //
        snippetEdits = snippetEdits.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
        let offset = 0;
        for (let i = 0; i < snippetEdits.length; i++) {
            const { range, template, keepWhitespace } = snippetEdits[i];
            // gaps between snippet edits are appended as text nodes. this
            // ensures placeholder-offsets are later correct
            if (i > 0) {
                const lastRange = snippetEdits[i - 1].range;
                const textRange = Range.fromPositions(lastRange.getEndPosition(), range.getStartPosition());
                const textNode = new Text(model.getValueInRange(textRange));
                snippet.appendChild(textNode);
                offset += textNode.value.length;
            }
            const newNodes = parser.parseFragment(template, snippet);
            SnippetSession_1.adjustWhitespace(model, range.getStartPosition(), keepWhitespace !== undefined ? !keepWhitespace : adjustWhitespace, snippet, new Set(newNodes));
            snippet.resolveVariables(resolver);
            const snippetText = snippet.toString();
            const snippetFragmentText = snippetText.slice(offset);
            offset = snippetText.length;
            // make edit
            const edit = EditOperation.replace(range, snippetFragmentText);
            edit.identifier = { major: i, minor: 0 }; // mark the edit so only our undo edits will be used to generate end cursors
            edit._isTracked = true;
            edits.push(edit);
        }
        //
        parser.ensureFinalTabstop(snippet, enforceFinalTabstop, true);
        return {
            edits,
            snippets: [new OneSnippet(editor, snippet, '')],
        };
    }
    constructor(_editor, _template, _options = _defaultOptions, _languageConfigurationService) {
        this._editor = _editor;
        this._template = _template;
        this._options = _options;
        this._languageConfigurationService = _languageConfigurationService;
        this._templateMerges = [];
        this._snippets = [];
    }
    dispose() {
        dispose(this._snippets);
    }
    _logInfo() {
        return `template="${this._template}", merged_templates="${this._templateMerges.join(' -> ')}"`;
    }
    insert() {
        if (!this._editor.hasModel()) {
            return;
        }
        // make insert edit and start with first selections
        const { edits, snippets } = typeof this._template === 'string'
            ? SnippetSession_1.createEditsAndSnippetsFromSelections(this._editor, this._template, this._options.overwriteBefore, this._options.overwriteAfter, false, this._options.adjustWhitespace, this._options.clipboardText, this._options.overtypingCapturer, this._languageConfigurationService)
            : SnippetSession_1.createEditsAndSnippetsFromEdits(this._editor, this._template, false, this._options.adjustWhitespace, this._options.clipboardText, this._options.overtypingCapturer, this._languageConfigurationService);
        this._snippets = snippets;
        this._editor.executeEdits('snippet', edits, (_undoEdits) => {
            // Sometimes, the text buffer will remove automatic whitespace when doing any edits,
            // so we need to look only at the undo edits relevant for us.
            // Our edits have an identifier set so that's how we can distinguish them
            const undoEdits = _undoEdits.filter((edit) => !!edit.identifier);
            for (let idx = 0; idx < snippets.length; idx++) {
                snippets[idx].initialize(undoEdits[idx].textChange);
            }
            if (this._snippets[0].hasPlaceholder) {
                return this._move(true);
            }
            else {
                return undoEdits.map((edit) => Selection.fromPositions(edit.range.getEndPosition()));
            }
        });
        this._editor.revealRange(this._editor.getSelections()[0]);
    }
    merge(template, options = _defaultOptions) {
        if (!this._editor.hasModel()) {
            return;
        }
        this._templateMerges.push([
            this._snippets[0]._nestingLevel,
            this._snippets[0]._placeholderGroupsIdx,
            template,
        ]);
        const { edits, snippets } = SnippetSession_1.createEditsAndSnippetsFromSelections(this._editor, template, options.overwriteBefore, options.overwriteAfter, true, options.adjustWhitespace, options.clipboardText, options.overtypingCapturer, this._languageConfigurationService);
        this._editor.executeEdits('snippet', edits, (_undoEdits) => {
            // Sometimes, the text buffer will remove automatic whitespace when doing any edits,
            // so we need to look only at the undo edits relevant for us.
            // Our edits have an identifier set so that's how we can distinguish them
            const undoEdits = _undoEdits.filter((edit) => !!edit.identifier);
            for (let idx = 0; idx < snippets.length; idx++) {
                snippets[idx].initialize(undoEdits[idx].textChange);
            }
            // Trivial snippets have no placeholder or are just the final placeholder. That means they
            // are just text insertions and we don't need to merge the nested snippet into the existing
            // snippet
            const isTrivialSnippet = snippets[0].isTrivialSnippet;
            if (!isTrivialSnippet) {
                for (const snippet of this._snippets) {
                    snippet.merge(snippets);
                }
                console.assert(snippets.length === 0);
            }
            if (this._snippets[0].hasPlaceholder && !isTrivialSnippet) {
                return this._move(undefined);
            }
            else {
                return undoEdits.map((edit) => Selection.fromPositions(edit.range.getEndPosition()));
            }
        });
    }
    next() {
        const newSelections = this._move(true);
        this._editor.setSelections(newSelections);
        this._editor.revealPositionInCenterIfOutsideViewport(newSelections[0].getPosition());
    }
    prev() {
        const newSelections = this._move(false);
        this._editor.setSelections(newSelections);
        this._editor.revealPositionInCenterIfOutsideViewport(newSelections[0].getPosition());
    }
    _move(fwd) {
        const selections = [];
        for (const snippet of this._snippets) {
            const oneSelection = snippet.move(fwd);
            selections.push(...oneSelection);
        }
        return selections;
    }
    get isAtFirstPlaceholder() {
        return this._snippets[0].isAtFirstPlaceholder;
    }
    get isAtLastPlaceholder() {
        return this._snippets[0].isAtLastPlaceholder;
    }
    get hasPlaceholder() {
        return this._snippets[0].hasPlaceholder;
    }
    get hasChoice() {
        return this._snippets[0].hasChoice;
    }
    get activeChoice() {
        return this._snippets[0].activeChoice;
    }
    isSelectionWithinPlaceholders() {
        if (!this.hasPlaceholder) {
            return false;
        }
        const selections = this._editor.getSelections();
        if (selections.length < this._snippets.length) {
            // this means we started snippet mode with N
            // selections and have M (N > M) selections.
            // So one snippet is without selection -> cancel
            return false;
        }
        const allPossibleSelections = new Map();
        for (const snippet of this._snippets) {
            const possibleSelections = snippet.computePossibleSelections();
            // for the first snippet find the placeholder (and its ranges)
            // that contain at least one selection. for all remaining snippets
            // the same placeholder (and their ranges) must be used.
            if (allPossibleSelections.size === 0) {
                for (const [index, ranges] of possibleSelections) {
                    ranges.sort(Range.compareRangesUsingStarts);
                    for (const selection of selections) {
                        if (ranges[0].containsRange(selection)) {
                            allPossibleSelections.set(index, []);
                            break;
                        }
                    }
                }
            }
            if (allPossibleSelections.size === 0) {
                // return false if we couldn't associate a selection to
                // this (the first) snippet
                return false;
            }
            // add selections from 'this' snippet so that we know all
            // selections for this placeholder
            allPossibleSelections.forEach((array, index) => {
                array.push(...possibleSelections.get(index));
            });
        }
        // sort selections (and later placeholder-ranges). then walk both
        // arrays and make sure the placeholder-ranges contain the corresponding
        // selection
        selections.sort(Range.compareRangesUsingStarts);
        for (const [index, ranges] of allPossibleSelections) {
            if (ranges.length !== selections.length) {
                allPossibleSelections.delete(index);
                continue;
            }
            ranges.sort(Range.compareRangesUsingStarts);
            for (let i = 0; i < ranges.length; i++) {
                if (!ranges[i].containsRange(selections[i])) {
                    allPossibleSelections.delete(index);
                    continue;
                }
            }
        }
        // from all possible selections we have deleted those
        // that don't match with the current selection. if we don't
        // have any left, we don't have a selection anymore
        return allPossibleSelections.size > 0;
    }
    getEnclosingRange() {
        let result;
        for (const snippet of this._snippets) {
            const snippetRange = snippet.getEnclosingRange();
            if (!result) {
                result = snippetRange;
            }
            else {
                result = result.plusRange(snippetRange);
            }
        }
        return result;
    }
};
SnippetSession = SnippetSession_1 = __decorate([
    __param(3, ILanguageConfigurationService)
], SnippetSession);
export { SnippetSession };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFNlc3Npb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbmlwcGV0L2Jyb3dzZXIvc25pcHBldFNlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekUsT0FBTyxzQkFBc0IsQ0FBQTtBQUc3QixPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLHVDQUF1QyxDQUFBO0FBRTNGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFN0QsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFNMUcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFDTixNQUFNLEVBRU4sV0FBVyxFQUNYLGFBQWEsRUFDYixJQUFJLEVBQ0osZUFBZSxHQUNmLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUNOLDhCQUE4QixFQUM5Qiw0QkFBNEIsRUFDNUIsZ0NBQWdDLEVBQ2hDLDBCQUEwQixFQUMxQiwyQkFBMkIsRUFDM0IsOEJBQThCLEVBQzlCLHlCQUF5QixFQUN6Qiw4QkFBOEIsR0FDOUIsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5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
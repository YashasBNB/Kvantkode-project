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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { ShiftCommand } from '../../../common/commands/shiftCommand.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { IModelService } from '../../../common/services/model.js';
import * as indentUtils from '../common/indentUtils.js';
import * as nls from '../../../../nls.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { getGoodIndentForLine, getIndentMetadata } from '../../../common/languages/autoIndent.js';
import { getReindentEditOperations } from '../common/indentation.js';
import { getStandardTokenTypeAtPosition } from '../../../common/tokens/lineTokens.js';
export class IndentationToSpacesAction extends EditorAction {
    static { this.ID = 'editor.action.indentationToSpaces'; }
    constructor() {
        super({
            id: IndentationToSpacesAction.ID,
            label: nls.localize2('indentationToSpaces', 'Convert Indentation to Spaces'),
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('indentationToSpacesDescription', 'Convert the tab indentation to spaces.'),
            },
        });
    }
    run(accessor, editor) {
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const modelOpts = model.getOptions();
        const selection = editor.getSelection();
        if (!selection) {
            return;
        }
        const command = new IndentationToSpacesCommand(selection, modelOpts.tabSize);
        editor.pushUndoStop();
        editor.executeCommands(this.id, [command]);
        editor.pushUndoStop();
        model.updateOptions({
            insertSpaces: true,
        });
    }
}
export class IndentationToTabsAction extends EditorAction {
    static { this.ID = 'editor.action.indentationToTabs'; }
    constructor() {
        super({
            id: IndentationToTabsAction.ID,
            label: nls.localize2('indentationToTabs', 'Convert Indentation to Tabs'),
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('indentationToTabsDescription', 'Convert the spaces indentation to tabs.'),
            },
        });
    }
    run(accessor, editor) {
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const modelOpts = model.getOptions();
        const selection = editor.getSelection();
        if (!selection) {
            return;
        }
        const command = new IndentationToTabsCommand(selection, modelOpts.tabSize);
        editor.pushUndoStop();
        editor.executeCommands(this.id, [command]);
        editor.pushUndoStop();
        model.updateOptions({
            insertSpaces: false,
        });
    }
}
export class ChangeIndentationSizeAction extends EditorAction {
    constructor(insertSpaces, displaySizeOnly, opts) {
        super(opts);
        this.insertSpaces = insertSpaces;
        this.displaySizeOnly = displaySizeOnly;
    }
    run(accessor, editor) {
        const quickInputService = accessor.get(IQuickInputService);
        const modelService = accessor.get(IModelService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const creationOpts = modelService.getCreationOptions(model.getLanguageId(), model.uri, model.isForSimpleWidget);
        const modelOpts = model.getOptions();
        const picks = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
            id: n.toString(),
            label: n.toString(),
            // add description for tabSize value set in the configuration
            description: n === creationOpts.tabSize && n === modelOpts.tabSize
                ? nls.localize('configuredTabSize', 'Configured Tab Size')
                : n === creationOpts.tabSize
                    ? nls.localize('defaultTabSize', 'Default Tab Size')
                    : n === modelOpts.tabSize
                        ? nls.localize('currentTabSize', 'Current Tab Size')
                        : undefined,
        }));
        // auto focus the tabSize set for the current editor
        const autoFocusIndex = Math.min(model.getOptions().tabSize - 1, 7);
        setTimeout(() => {
            quickInputService
                .pick(picks, {
                placeHolder: nls.localize({ key: 'selectTabWidth', comment: ['Tab corresponds to the tab key'] }, 'Select Tab Size for Current File'),
                activeItem: picks[autoFocusIndex],
            })
                .then((pick) => {
                if (pick) {
                    if (model && !model.isDisposed()) {
                        const pickedVal = parseInt(pick.label, 10);
                        if (this.displaySizeOnly) {
                            model.updateOptions({
                                tabSize: pickedVal,
                            });
                        }
                        else {
                            model.updateOptions({
                                tabSize: pickedVal,
                                indentSize: pickedVal,
                                insertSpaces: this.insertSpaces,
                            });
                        }
                    }
                }
            });
        }, 50 /* quick input is sensitive to being opened so soon after another */);
    }
}
export class IndentUsingTabs extends ChangeIndentationSizeAction {
    static { this.ID = 'editor.action.indentUsingTabs'; }
    constructor() {
        super(false, false, {
            id: IndentUsingTabs.ID,
            label: nls.localize2('indentUsingTabs', 'Indent Using Tabs'),
            precondition: undefined,
            metadata: {
                description: nls.localize2('indentUsingTabsDescription', 'Use indentation with tabs.'),
            },
        });
    }
}
export class IndentUsingSpaces extends ChangeIndentationSizeAction {
    static { this.ID = 'editor.action.indentUsingSpaces'; }
    constructor() {
        super(true, false, {
            id: IndentUsingSpaces.ID,
            label: nls.localize2('indentUsingSpaces', 'Indent Using Spaces'),
            precondition: undefined,
            metadata: {
                description: nls.localize2('indentUsingSpacesDescription', 'Use indentation with spaces.'),
            },
        });
    }
}
export class ChangeTabDisplaySize extends ChangeIndentationSizeAction {
    static { this.ID = 'editor.action.changeTabDisplaySize'; }
    constructor() {
        super(true, true, {
            id: ChangeTabDisplaySize.ID,
            label: nls.localize2('changeTabDisplaySize', 'Change Tab Display Size'),
            precondition: undefined,
            metadata: {
                description: nls.localize2('changeTabDisplaySizeDescription', 'Change the space size equivalent of the tab.'),
            },
        });
    }
}
export class DetectIndentation extends EditorAction {
    static { this.ID = 'editor.action.detectIndentation'; }
    constructor() {
        super({
            id: DetectIndentation.ID,
            label: nls.localize2('detectIndentation', 'Detect Indentation from Content'),
            precondition: undefined,
            metadata: {
                description: nls.localize2('detectIndentationDescription', 'Detect the indentation from content.'),
            },
        });
    }
    run(accessor, editor) {
        const modelService = accessor.get(IModelService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const creationOpts = modelService.getCreationOptions(model.getLanguageId(), model.uri, model.isForSimpleWidget);
        model.detectIndentation(creationOpts.insertSpaces, creationOpts.tabSize);
    }
}
export class ReindentLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.reindentlines',
            label: nls.localize2('editor.reindentlines', 'Reindent Lines'),
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('editor.reindentlinesDescription', 'Reindent the lines of the editor.'),
            },
        });
    }
    run(accessor, editor) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const edits = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        if (edits.length > 0) {
            editor.pushUndoStop();
            editor.executeEdits(this.id, edits);
            editor.pushUndoStop();
        }
    }
}
export class ReindentSelectedLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.reindentselectedlines',
            label: nls.localize2('editor.reindentselectedlines', 'Reindent Selected Lines'),
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('editor.reindentselectedlinesDescription', 'Reindent the selected lines of the editor.'),
            },
        });
    }
    run(accessor, editor) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const selections = editor.getSelections();
        if (selections === null) {
            return;
        }
        const edits = [];
        for (const selection of selections) {
            let startLineNumber = selection.startLineNumber;
            let endLineNumber = selection.endLineNumber;
            if (startLineNumber !== endLineNumber && selection.endColumn === 1) {
                endLineNumber--;
            }
            if (startLineNumber === 1) {
                if (startLineNumber === endLineNumber) {
                    continue;
                }
            }
            else {
                startLineNumber--;
            }
            const editOperations = getReindentEditOperations(model, languageConfigurationService, startLineNumber, endLineNumber);
            edits.push(...editOperations);
        }
        if (edits.length > 0) {
            editor.pushUndoStop();
            editor.executeEdits(this.id, edits);
            editor.pushUndoStop();
        }
    }
}
export class AutoIndentOnPasteCommand {
    constructor(edits, initialSelection) {
        this._initialSelection = initialSelection;
        this._edits = [];
        this._selectionId = null;
        for (const edit of edits) {
            if (edit.range && typeof edit.text === 'string') {
                this._edits.push(edit);
            }
        }
    }
    getEditOperations(model, builder) {
        for (const edit of this._edits) {
            builder.addEditOperation(Range.lift(edit.range), edit.text);
        }
        let selectionIsSet = false;
        if (Array.isArray(this._edits) &&
            this._edits.length === 1 &&
            this._initialSelection.isEmpty()) {
            if (this._edits[0].range.startColumn === this._initialSelection.endColumn &&
                this._edits[0].range.startLineNumber === this._initialSelection.endLineNumber) {
                selectionIsSet = true;
                this._selectionId = builder.trackSelection(this._initialSelection, true);
            }
            else if (this._edits[0].range.endColumn === this._initialSelection.startColumn &&
                this._edits[0].range.endLineNumber === this._initialSelection.startLineNumber) {
                selectionIsSet = true;
                this._selectionId = builder.trackSelection(this._initialSelection, false);
            }
        }
        if (!selectionIsSet) {
            this._selectionId = builder.trackSelection(this._initialSelection);
        }
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this._selectionId);
    }
}
let AutoIndentOnPaste = class AutoIndentOnPaste {
    static { this.ID = 'editor.contrib.autoIndentOnPaste'; }
    constructor(editor, _languageConfigurationService) {
        this.editor = editor;
        this._languageConfigurationService = _languageConfigurationService;
        this.callOnDispose = new DisposableStore();
        this.callOnModel = new DisposableStore();
        this.callOnDispose.add(editor.onDidChangeConfiguration(() => this.update()));
        this.callOnDispose.add(editor.onDidChangeModel(() => this.update()));
        this.callOnDispose.add(editor.onDidChangeModelLanguage(() => this.update()));
    }
    update() {
        // clean up
        this.callOnModel.clear();
        // we are disabled
        if (this.editor.getOption(12 /* EditorOption.autoIndent */) < 4 /* EditorAutoIndentStrategy.Full */ ||
            this.editor.getOption(57 /* EditorOption.formatOnPaste */)) {
            return;
        }
        // no model
        if (!this.editor.hasModel()) {
            return;
        }
        this.callOnModel.add(this.editor.onDidPaste(({ range }) => {
            this.trigger(range);
        }));
    }
    trigger(range) {
        const selections = this.editor.getSelections();
        if (selections === null || selections.length > 1) {
            return;
        }
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        const containsOnlyWhitespace = this.rangeContainsOnlyWhitespaceCharacters(model, range);
        if (containsOnlyWhitespace) {
            return;
        }
        if (isStartOrEndInString(model, range)) {
            return;
        }
        if (!model.tokenization.isCheapToTokenize(range.getStartPosition().lineNumber)) {
            return;
        }
        const autoIndent = this.editor.getOption(12 /* EditorOption.autoIndent */);
        const { tabSize, indentSize, insertSpaces } = model.getOptions();
        const textEdits = [];
        const indentConverter = {
            shiftIndent: (indentation) => {
                return ShiftCommand.shiftIndent(indentation, indentation.length + 1, tabSize, indentSize, insertSpaces);
            },
            unshiftIndent: (indentation) => {
                return ShiftCommand.unshiftIndent(indentation, indentation.length + 1, tabSize, indentSize, insertSpaces);
            },
        };
        let startLineNumber = range.startLineNumber;
        while (startLineNumber <= range.endLineNumber) {
            if (this.shouldIgnoreLine(model, startLineNumber)) {
                startLineNumber++;
                continue;
            }
            break;
        }
        if (startLineNumber > range.endLineNumber) {
            return;
        }
        let firstLineText = model.getLineContent(startLineNumber);
        if (!/\S/.test(firstLineText.substring(0, range.startColumn - 1))) {
            const indentOfFirstLine = getGoodIndentForLine(autoIndent, model, model.getLanguageId(), startLineNumber, indentConverter, this._languageConfigurationService);
            if (indentOfFirstLine !== null) {
                const oldIndentation = strings.getLeadingWhitespace(firstLineText);
                const newSpaceCnt = indentUtils.getSpaceCnt(indentOfFirstLine, tabSize);
                const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, tabSize);
                if (newSpaceCnt !== oldSpaceCnt) {
                    const newIndent = indentUtils.generateIndent(newSpaceCnt, tabSize, insertSpaces);
                    textEdits.push({
                        range: new Range(startLineNumber, 1, startLineNumber, oldIndentation.length + 1),
                        text: newIndent,
                    });
                    firstLineText = newIndent + firstLineText.substring(oldIndentation.length);
                }
                else {
                    const indentMetadata = getIndentMetadata(model, startLineNumber, this._languageConfigurationService);
                    if (indentMetadata === 0 || indentMetadata === 8 /* IndentConsts.UNINDENT_MASK */) {
                        // we paste content into a line where only contains whitespaces
                        // after pasting, the indentation of the first line is already correct
                        // the first line doesn't match any indentation rule
                        // then no-op.
                        return;
                    }
                }
            }
        }
        const firstLineNumber = startLineNumber;
        // ignore empty or ignored lines
        while (startLineNumber < range.endLineNumber) {
            if (!/\S/.test(model.getLineContent(startLineNumber + 1))) {
                startLineNumber++;
                continue;
            }
            break;
        }
        if (startLineNumber !== range.endLineNumber) {
            const virtualModel = {
                tokenization: {
                    getLineTokens: (lineNumber) => {
                        return model.tokenization.getLineTokens(lineNumber);
                    },
                    getLanguageId: () => {
                        return model.getLanguageId();
                    },
                    getLanguageIdAtPosition: (lineNumber, column) => {
                        return model.getLanguageIdAtPosition(lineNumber, column);
                    },
                },
                getLineContent: (lineNumber) => {
                    if (lineNumber === firstLineNumber) {
                        return firstLineText;
                    }
                    else {
                        return model.getLineContent(lineNumber);
                    }
                },
            };
            const indentOfSecondLine = getGoodIndentForLine(autoIndent, virtualModel, model.getLanguageId(), startLineNumber + 1, indentConverter, this._languageConfigurationService);
            if (indentOfSecondLine !== null) {
                const newSpaceCntOfSecondLine = indentUtils.getSpaceCnt(indentOfSecondLine, tabSize);
                const oldSpaceCntOfSecondLine = indentUtils.getSpaceCnt(strings.getLeadingWhitespace(model.getLineContent(startLineNumber + 1)), tabSize);
                if (newSpaceCntOfSecondLine !== oldSpaceCntOfSecondLine) {
                    const spaceCntOffset = newSpaceCntOfSecondLine - oldSpaceCntOfSecondLine;
                    for (let i = startLineNumber + 1; i <= range.endLineNumber; i++) {
                        const lineContent = model.getLineContent(i);
                        const originalIndent = strings.getLeadingWhitespace(lineContent);
                        const originalSpacesCnt = indentUtils.getSpaceCnt(originalIndent, tabSize);
                        const newSpacesCnt = originalSpacesCnt + spaceCntOffset;
                        const newIndent = indentUtils.generateIndent(newSpacesCnt, tabSize, insertSpaces);
                        if (newIndent !== originalIndent) {
                            textEdits.push({
                                range: new Range(i, 1, i, originalIndent.length + 1),
                                text: newIndent,
                            });
                        }
                    }
                }
            }
        }
        if (textEdits.length > 0) {
            this.editor.pushUndoStop();
            const cmd = new AutoIndentOnPasteCommand(textEdits, this.editor.getSelection());
            this.editor.executeCommand('autoIndentOnPaste', cmd);
            this.editor.pushUndoStop();
        }
    }
    rangeContainsOnlyWhitespaceCharacters(model, range) {
        const lineContainsOnlyWhitespace = (content) => {
            return content.trim().length === 0;
        };
        let containsOnlyWhitespace = true;
        if (range.startLineNumber === range.endLineNumber) {
            const lineContent = model.getLineContent(range.startLineNumber);
            const linePart = lineContent.substring(range.startColumn - 1, range.endColumn - 1);
            containsOnlyWhitespace = lineContainsOnlyWhitespace(linePart);
        }
        else {
            for (let i = range.startLineNumber; i <= range.endLineNumber; i++) {
                const lineContent = model.getLineContent(i);
                if (i === range.startLineNumber) {
                    const linePart = lineContent.substring(range.startColumn - 1);
                    containsOnlyWhitespace = lineContainsOnlyWhitespace(linePart);
                }
                else if (i === range.endLineNumber) {
                    const linePart = lineContent.substring(0, range.endColumn - 1);
                    containsOnlyWhitespace = lineContainsOnlyWhitespace(linePart);
                }
                else {
                    containsOnlyWhitespace = model.getLineFirstNonWhitespaceColumn(i) === 0;
                }
                if (!containsOnlyWhitespace) {
                    break;
                }
            }
        }
        return containsOnlyWhitespace;
    }
    shouldIgnoreLine(model, lineNumber) {
        model.tokenization.forceTokenization(lineNumber);
        const nonWhitespaceColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
        if (nonWhitespaceColumn === 0) {
            return true;
        }
        const tokens = model.tokenization.getLineTokens(lineNumber);
        if (tokens.getCount() > 0) {
            const firstNonWhitespaceTokenIndex = tokens.findTokenIndexAtOffset(nonWhitespaceColumn);
            if (firstNonWhitespaceTokenIndex >= 0 &&
                tokens.getStandardTokenType(firstNonWhitespaceTokenIndex) === 1 /* StandardTokenType.Comment */) {
                return true;
            }
        }
        return false;
    }
    dispose() {
        this.callOnDispose.dispose();
        this.callOnModel.dispose();
    }
};
AutoIndentOnPaste = __decorate([
    __param(1, ILanguageConfigurationService)
], AutoIndentOnPaste);
export { AutoIndentOnPaste };
function isStartOrEndInString(model, range) {
    const isPositionInString = (position) => {
        const tokenType = getStandardTokenTypeAtPosition(model, position);
        return tokenType === 2 /* StandardTokenType.String */;
    };
    return isPositionInString(range.getStartPosition()) || isPositionInString(range.getEndPosition());
}
function getIndentationEditOperations(model, builder, tabSize, tabsToSpaces) {
    if (model.getLineCount() === 1 && model.getLineMaxColumn(1) === 1) {
        // Model is empty
        return;
    }
    let spaces = '';
    for (let i = 0; i < tabSize; i++) {
        spaces += ' ';
    }
    const spacesRegExp = new RegExp(spaces, 'gi');
    for (let lineNumber = 1, lineCount = model.getLineCount(); lineNumber <= lineCount; lineNumber++) {
        let lastIndentationColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
        if (lastIndentationColumn === 0) {
            lastIndentationColumn = model.getLineMaxColumn(lineNumber);
        }
        if (lastIndentationColumn === 1) {
            continue;
        }
        const originalIndentationRange = new Range(lineNumber, 1, lineNumber, lastIndentationColumn);
        const originalIndentation = model.getValueInRange(originalIndentationRange);
        const newIndentation = tabsToSpaces
            ? originalIndentation.replace(/\t/gi, spaces)
            : originalIndentation.replace(spacesRegExp, '\t');
        builder.addEditOperation(originalIndentationRange, newIndentation);
    }
}
export class IndentationToSpacesCommand {
    constructor(selection, tabSize) {
        this.selection = selection;
        this.tabSize = tabSize;
        this.selectionId = null;
    }
    getEditOperations(model, builder) {
        this.selectionId = builder.trackSelection(this.selection);
        getIndentationEditOperations(model, builder, this.tabSize, true);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this.selectionId);
    }
}
export class IndentationToTabsCommand {
    constructor(selection, tabSize) {
        this.selection = selection;
        this.tabSize = tabSize;
        this.selectionId = null;
    }
    getEditOperations(model, builder) {
        this.selectionId = builder.trackSelection(this.selection);
        getIndentationEditOperations(model, builder, this.tabSize, false);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this.selectionId);
    }
}
registerEditorContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(IndentationToSpacesAction);
registerEditorAction(IndentationToTabsAction);
registerEditorAction(IndentUsingTabs);
registerEditorAction(IndentUsingSpaces);
registerEditorAction(ChangeTabDisplaySize);
registerEditorAction(DetectIndentation);
registerEditorAction(ReindentLinesAction);
registerEditorAction(ReindentSelectedLinesAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmRlbnRhdGlvbi9icm93c2VyL2luZGVudGF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRTdELE9BQU8sRUFDTixZQUFZLEVBR1osb0JBQW9CLEVBQ3BCLDBCQUEwQixHQUUxQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUd2RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFRN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFJeEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFMUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pFLE9BQU8sS0FBSyxXQUFXLE1BQU0sMEJBQTBCLENBQUE7QUFDdkQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdyRixNQUFNLE9BQU8seUJBQTBCLFNBQVEsWUFBWTthQUNuQyxPQUFFLEdBQUcsbUNB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
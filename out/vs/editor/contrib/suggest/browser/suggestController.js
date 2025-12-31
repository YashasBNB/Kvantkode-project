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
var SuggestController_1;
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedError, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { KeyCodeChord } from '../../../../base/common/keybindings.js';
import { DisposableStore, dispose, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { assertType, isObject } from '../../../../base/common/types.js';
import { StableEditorScrollState } from '../../../browser/stableEditorScroll.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { SnippetController2 } from '../../snippet/browser/snippetController2.js';
import { SnippetParser } from '../../snippet/browser/snippetParser.js';
import { ISuggestMemoryService } from './suggestMemory.js';
import { WordContextKey } from './wordContextKey.js';
import * as nls from '../../../../nls.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Context as SuggestContext, suggestWidgetStatusbarMenu, } from './suggest.js';
import { SuggestAlternatives } from './suggestAlternatives.js';
import { CommitCharacterController } from './suggestCommitCharacters.js';
import { SuggestModel } from './suggestModel.js';
import { OvertypingCapturer } from './suggestOvertypingCapturer.js';
import { SuggestWidget } from './suggestWidget.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { basename, extname } from '../../../../base/common/resources.js';
import { hash } from '../../../../base/common/hash.js';
import { WindowIdleValue, getWindow } from '../../../../base/browser/dom.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
// sticky suggest widget which doesn't disappear on focus out and such
const _sticky = false;
// || Boolean("true") // done "weirdly" so that a lint warning prevents you from pushing this
class LineSuffix {
    constructor(_model, _position) {
        this._model = _model;
        this._position = _position;
        this._decorationOptions = ModelDecorationOptions.register({
            description: 'suggest-line-suffix',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        // spy on what's happening right of the cursor. two cases:
        // 1. end of line -> check that it's still end of line
        // 2. mid of line -> add a marker and compute the delta
        const maxColumn = _model.getLineMaxColumn(_position.lineNumber);
        if (maxColumn !== _position.column) {
            const offset = _model.getOffsetAt(_position);
            const end = _model.getPositionAt(offset + 1);
            _model.changeDecorations((accessor) => {
                if (this._marker) {
                    accessor.removeDecoration(this._marker);
                }
                this._marker = accessor.addDecoration(Range.fromPositions(_position, end), this._decorationOptions);
            });
        }
    }
    dispose() {
        if (this._marker && !this._model.isDisposed()) {
            this._model.changeDecorations((accessor) => {
                accessor.removeDecoration(this._marker);
                this._marker = undefined;
            });
        }
    }
    delta(position) {
        if (this._model.isDisposed() || this._position.lineNumber !== position.lineNumber) {
            // bail out early if things seems fishy
            return 0;
        }
        // read the marker (in case suggest was triggered at line end) or compare
        // the cursor to the line end.
        if (this._marker) {
            const range = this._model.getDecorationRange(this._marker);
            const end = this._model.getOffsetAt(range.getStartPosition());
            return end - this._model.getOffsetAt(position);
        }
        else {
            return this._model.getLineMaxColumn(position.lineNumber) - position.column;
        }
    }
}
var InsertFlags;
(function (InsertFlags) {
    InsertFlags[InsertFlags["None"] = 0] = "None";
    InsertFlags[InsertFlags["NoBeforeUndoStop"] = 1] = "NoBeforeUndoStop";
    InsertFlags[InsertFlags["NoAfterUndoStop"] = 2] = "NoAfterUndoStop";
    InsertFlags[InsertFlags["KeepAlternativeSuggestions"] = 4] = "KeepAlternativeSuggestions";
    InsertFlags[InsertFlags["AlternativeOverwriteConfig"] = 8] = "AlternativeOverwriteConfig";
})(InsertFlags || (InsertFlags = {}));
let SuggestController = class SuggestController {
    static { SuggestController_1 = this; }
    static { this.ID = 'editor.contrib.suggestController'; }
    static get(editor) {
        return editor.getContribution(SuggestController_1.ID);
    }
    constructor(editor, _memoryService, _commandService, _contextKeyService, _instantiationService, _logService, _telemetryService) {
        this._memoryService = _memoryService;
        this._commandService = _commandService;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._lineSuffix = new MutableDisposable();
        this._toDispose = new DisposableStore();
        this._selectors = new PriorityRegistry((s) => s.priority);
        this._onWillInsertSuggestItem = new Emitter();
        this.onWillInsertSuggestItem = this._onWillInsertSuggestItem.event;
        this.editor = editor;
        this.model = _instantiationService.createInstance(SuggestModel, this.editor);
        // default selector
        this._selectors.register({
            priority: 0,
            select: (model, pos, items) => this._memoryService.select(model, pos, items),
        });
        // context key: update insert/replace mode
        const ctxInsertMode = SuggestContext.InsertMode.bindTo(_contextKeyService);
        ctxInsertMode.set(editor.getOption(123 /* EditorOption.suggest */).insertMode);
        this._toDispose.add(this.model.onDidTrigger(() => ctxInsertMode.set(editor.getOption(123 /* EditorOption.suggest */).insertMode)));
        this.widget = this._toDispose.add(new WindowIdleValue(getWindow(editor.getDomNode()), () => {
            const widget = this._instantiationService.createInstance(SuggestWidget, this.editor);
            this._toDispose.add(widget);
            this._toDispose.add(widget.onDidSelect((item) => this._insertSuggestion(item, 0 /* InsertFlags.None */), this));
            // Wire up logic to accept a suggestion on certain characters
            const commitCharacterController = new CommitCharacterController(this.editor, widget, this.model, (item) => this._insertSuggestion(item, 2 /* InsertFlags.NoAfterUndoStop */));
            this._toDispose.add(commitCharacterController);
            // Wire up makes text edit context key
            const ctxMakesTextEdit = SuggestContext.MakesTextEdit.bindTo(this._contextKeyService);
            const ctxHasInsertAndReplace = SuggestContext.HasInsertAndReplaceRange.bindTo(this._contextKeyService);
            const ctxCanResolve = SuggestContext.CanResolve.bindTo(this._contextKeyService);
            this._toDispose.add(toDisposable(() => {
                ctxMakesTextEdit.reset();
                ctxHasInsertAndReplace.reset();
                ctxCanResolve.reset();
            }));
            this._toDispose.add(widget.onDidFocus(({ item }) => {
                // (ctx: makesTextEdit)
                const position = this.editor.getPosition();
                const startColumn = item.editStart.column;
                const endColumn = position.column;
                let value = true;
                if (this.editor.getOption(1 /* EditorOption.acceptSuggestionOnEnter */) === 'smart' &&
                    this.model.state === 2 /* State.Auto */ &&
                    !item.completion.additionalTextEdits &&
                    !(item.completion.insertTextRules & 4 /* CompletionItemInsertTextRule.InsertAsSnippet */) &&
                    endColumn - startColumn === item.completion.insertText.length) {
                    const oldText = this.editor.getModel().getValueInRange({
                        startLineNumber: position.lineNumber,
                        startColumn,
                        endLineNumber: position.lineNumber,
                        endColumn,
                    });
                    value = oldText !== item.completion.insertText;
                }
                ctxMakesTextEdit.set(value);
                // (ctx: hasInsertAndReplaceRange)
                ctxHasInsertAndReplace.set(!Position.equals(item.editInsertEnd, item.editReplaceEnd));
                // (ctx: canResolve)
                ctxCanResolve.set(Boolean(item.provider.resolveCompletionItem) ||
                    Boolean(item.completion.documentation) ||
                    item.completion.detail !== item.completion.label);
            }));
            this._toDispose.add(widget.onDetailsKeyDown((e) => {
                // cmd + c on macOS, ctrl + c on Win / Linux
                if (e
                    .toKeyCodeChord()
                    .equals(new KeyCodeChord(true, false, false, false, 33 /* KeyCode.KeyC */)) ||
                    (platform.isMacintosh &&
                        e
                            .toKeyCodeChord()
                            .equals(new KeyCodeChord(false, false, false, true, 33 /* KeyCode.KeyC */)))) {
                    e.stopPropagation();
                    return;
                }
                if (!e.toKeyCodeChord().isModifierKey()) {
                    this.editor.focus();
                }
            }));
            return widget;
        }));
        // Wire up text overtyping capture
        this._overtypingCapturer = this._toDispose.add(new WindowIdleValue(getWindow(editor.getDomNode()), () => {
            return this._toDispose.add(new OvertypingCapturer(this.editor, this.model));
        }));
        this._alternatives = this._toDispose.add(new WindowIdleValue(getWindow(editor.getDomNode()), () => {
            return this._toDispose.add(new SuggestAlternatives(this.editor, this._contextKeyService));
        }));
        this._toDispose.add(_instantiationService.createInstance(WordContextKey, editor));
        this._toDispose.add(this.model.onDidTrigger((e) => {
            this.widget.value.showTriggered(e.auto, e.shy ? 250 : 50);
            this._lineSuffix.value = new LineSuffix(this.editor.getModel(), e.position);
        }));
        this._toDispose.add(this.model.onDidSuggest((e) => {
            if (e.triggerOptions.shy) {
                return;
            }
            let index = -1;
            for (const selector of this._selectors.itemsOrderedByPriorityDesc) {
                index = selector.select(this.editor.getModel(), this.editor.getPosition(), e.completionModel.items);
                if (index !== -1) {
                    break;
                }
            }
            if (index === -1) {
                index = 0;
            }
            if (this.model.state === 0 /* State.Idle */) {
                // selecting an item can "pump" out selection/cursor change events
                // which can cancel suggest halfway through this function. therefore
                // we need to check again and bail if the session has been canceled
                return;
            }
            let noFocus = false;
            if (e.triggerOptions.auto) {
                // don't "focus" item when configured to do
                const options = this.editor.getOption(123 /* EditorOption.suggest */);
                if (options.selectionMode === 'never' || options.selectionMode === 'always') {
                    // simple: always or never
                    noFocus = options.selectionMode === 'never';
                }
                else if (options.selectionMode === 'whenTriggerCharacter') {
                    // on with trigger character
                    noFocus = e.triggerOptions.triggerKind !== 1 /* CompletionTriggerKind.TriggerCharacter */;
                }
                else if (options.selectionMode === 'whenQuickSuggestion') {
                    // without trigger character or when refiltering
                    noFocus =
                        e.triggerOptions.triggerKind === 1 /* CompletionTriggerKind.TriggerCharacter */ &&
                            !e.triggerOptions.refilter;
                }
            }
            this.widget.value.showSuggestions(e.completionModel, index, e.isFrozen, e.triggerOptions.auto, noFocus);
        }));
        this._toDispose.add(this.model.onDidCancel((e) => {
            if (!e.retrigger) {
                this.widget.value.hideWidget();
            }
        }));
        this._toDispose.add(this.editor.onDidBlurEditorWidget(() => {
            if (!_sticky) {
                this.model.cancel();
                this.model.clear();
            }
        }));
        // Manage the acceptSuggestionsOnEnter context key
        const acceptSuggestionsOnEnter = SuggestContext.AcceptSuggestionsOnEnter.bindTo(_contextKeyService);
        const updateFromConfig = () => {
            const acceptSuggestionOnEnter = this.editor.getOption(1 /* EditorOption.acceptSuggestionOnEnter */);
            acceptSuggestionsOnEnter.set(acceptSuggestionOnEnter === 'on' || acceptSuggestionOnEnter === 'smart');
        };
        this._toDispose.add(this.editor.onDidChangeConfiguration(() => updateFromConfig()));
        updateFromConfig();
    }
    dispose() {
        this._alternatives.dispose();
        this._toDispose.dispose();
        this.widget.dispose();
        this.model.dispose();
        this._lineSuffix.dispose();
        this._onWillInsertSuggestItem.dispose();
    }
    _insertSuggestion(event, flags) {
        if (!event || !event.item) {
            this._alternatives.value.reset();
            this.model.cancel();
            this.model.clear();
            return;
        }
        if (!this.editor.hasModel()) {
            return;
        }
        const snippetController = SnippetController2.get(this.editor);
        if (!snippetController) {
            return;
        }
        this._onWillInsertSuggestItem.fire({ item: event.item });
        const model = this.editor.getModel();
        const modelVersionNow = model.getAlternativeVersionId();
        const { item } = event;
        //
        const tasks = [];
        const cts = new CancellationTokenSource();
        // pushing undo stops *before* additional text edits and
        // *after* the main edit
        if (!(flags & 1 /* InsertFlags.NoBeforeUndoStop */)) {
            this.editor.pushUndoStop();
        }
        // compute overwrite[Before|After] deltas BEFORE applying extra edits
        const info = this.getOverwriteInfo(item, Boolean(flags & 8 /* InsertFlags.AlternativeOverwriteConfig */));
        // keep item in memory
        this._memoryService.memorize(model, this.editor.getPosition(), item);
        const isResolved = item.isResolved;
        // telemetry data points: duration of command execution, info about async additional edits (-1=n/a, -2=none, 1=success, 0=failed)
        let _commandExectionDuration = -1;
        let _additionalEditsAppliedAsync = -1;
        if (Array.isArray(item.completion.additionalTextEdits)) {
            // cancel -> stops all listening and closes widget
            this.model.cancel();
            // sync additional edits
            const scrollState = StableEditorScrollState.capture(this.editor);
            this.editor.executeEdits('suggestController.additionalTextEdits.sync', item.completion.additionalTextEdits.map((edit) => {
                let range = Range.lift(edit.range);
                if (range.startLineNumber === item.position.lineNumber &&
                    range.startColumn > item.position.column) {
                    // shift additional edit when it is "after" the completion insertion position
                    const columnDelta = this.editor.getPosition().column - item.position.column;
                    const startColumnDelta = columnDelta;
                    const endColumnDelta = Range.spansMultipleLines(range) ? 0 : columnDelta;
                    range = new Range(range.startLineNumber, range.startColumn + startColumnDelta, range.endLineNumber, range.endColumn + endColumnDelta);
                }
                return EditOperation.replaceMove(range, edit.text);
            }));
            scrollState.restoreRelativeVerticalPositionOfCursor(this.editor);
        }
        else if (!isResolved) {
            // async additional edits
            const sw = new StopWatch();
            let position;
            const docListener = model.onDidChangeContent((e) => {
                if (e.isFlush) {
                    cts.cancel();
                    docListener.dispose();
                    return;
                }
                for (const change of e.changes) {
                    const thisPosition = Range.getEndPosition(change.range);
                    if (!position || Position.isBefore(thisPosition, position)) {
                        position = thisPosition;
                    }
                }
            });
            const oldFlags = flags;
            flags |= 2 /* InsertFlags.NoAfterUndoStop */;
            let didType = false;
            const typeListener = this.editor.onWillType(() => {
                typeListener.dispose();
                didType = true;
                if (!(oldFlags & 2 /* InsertFlags.NoAfterUndoStop */)) {
                    this.editor.pushUndoStop();
                }
            });
            tasks.push(item
                .resolve(cts.token)
                .then(() => {
                if (!item.completion.additionalTextEdits || cts.token.isCancellationRequested) {
                    return undefined;
                }
                if (position &&
                    item.completion.additionalTextEdits.some((edit) => Position.isBefore(position, Range.getStartPosition(edit.range)))) {
                    return false;
                }
                if (didType) {
                    this.editor.pushUndoStop();
                }
                const scrollState = StableEditorScrollState.capture(this.editor);
                this.editor.executeEdits('suggestController.additionalTextEdits.async', item.completion.additionalTextEdits.map((edit) => EditOperation.replaceMove(Range.lift(edit.range), edit.text)));
                scrollState.restoreRelativeVerticalPositionOfCursor(this.editor);
                if (didType || !(oldFlags & 2 /* InsertFlags.NoAfterUndoStop */)) {
                    this.editor.pushUndoStop();
                }
                return true;
            })
                .then((applied) => {
                this._logService.trace('[suggest] async resolving of edits DONE (ms, applied?)', sw.elapsed(), applied);
                _additionalEditsAppliedAsync = applied === true ? 1 : applied === false ? 0 : -2;
            })
                .finally(() => {
                docListener.dispose();
                typeListener.dispose();
            }));
        }
        let { insertText } = item.completion;
        if (!(item.completion.insertTextRules & 4 /* CompletionItemInsertTextRule.InsertAsSnippet */)) {
            insertText = SnippetParser.escape(insertText);
        }
        // cancel -> stops all listening and closes widget
        this.model.cancel();
        snippetController.insert(insertText, {
            overwriteBefore: info.overwriteBefore,
            overwriteAfter: info.overwriteAfter,
            undoStopBefore: false,
            undoStopAfter: false,
            adjustWhitespace: !(item.completion.insertTextRules & 1 /* CompletionItemInsertTextRule.KeepWhitespace */),
            clipboardText: event.model.clipboardText,
            overtypingCapturer: this._overtypingCapturer.value,
        });
        if (!(flags & 2 /* InsertFlags.NoAfterUndoStop */)) {
            this.editor.pushUndoStop();
        }
        if (item.completion.command) {
            if (item.completion.command.id === TriggerSuggestAction.id) {
                // retigger
                this.model.trigger({ auto: true, retrigger: true });
            }
            else {
                // exec command, done
                const sw = new StopWatch();
                tasks.push(this._commandService
                    .executeCommand(item.completion.command.id, ...(item.completion.command.arguments ? [...item.completion.command.arguments] : []))
                    .catch((e) => {
                    if (item.completion.extensionId) {
                        onUnexpectedExternalError(e);
                    }
                    else {
                        onUnexpectedError(e);
                    }
                })
                    .finally(() => {
                    _commandExectionDuration = sw.elapsed();
                }));
            }
        }
        if (flags & 4 /* InsertFlags.KeepAlternativeSuggestions */) {
            this._alternatives.value.set(event, (next) => {
                // cancel resolving of additional edits
                cts.cancel();
                // this is not so pretty. when inserting the 'next'
                // suggestion we undo until we are at the state at
                // which we were before inserting the previous suggestion...
                while (model.canUndo()) {
                    if (modelVersionNow !== model.getAlternativeVersionId()) {
                        model.undo();
                    }
                    this._insertSuggestion(next, 1 /* InsertFlags.NoBeforeUndoStop */ |
                        2 /* InsertFlags.NoAfterUndoStop */ |
                        (flags & 8 /* InsertFlags.AlternativeOverwriteConfig */
                            ? 8 /* InsertFlags.AlternativeOverwriteConfig */
                            : 0));
                    break;
                }
            });
        }
        this._alertCompletionItem(item);
        // clear only now - after all tasks are done
        Promise.all(tasks).finally(() => {
            this._reportSuggestionAcceptedTelemetry(item, model, isResolved, _commandExectionDuration, _additionalEditsAppliedAsync, event.index, event.model.items);
            this.model.clear();
            cts.dispose();
        });
    }
    _reportSuggestionAcceptedTelemetry(item, model, itemResolved, commandExectionDuration, additionalEditsAppliedAsync, index, completionItems) {
        if (Math.random() > 0.0001) {
            // 0.01%
            return;
        }
        const labelMap = new Map();
        for (let i = 0; i < Math.min(30, completionItems.length); i++) {
            const label = completionItems[i].textLabel;
            if (labelMap.has(label)) {
                labelMap.get(label).push(i);
            }
            else {
                labelMap.set(label, [i]);
            }
        }
        const firstIndexArray = labelMap.get(item.textLabel);
        const hasDuplicates = firstIndexArray && firstIndexArray.length > 1;
        const firstIndex = hasDuplicates ? firstIndexArray[0] : -1;
        this._telemetryService.publicLog2('suggest.acceptedSuggestion', {
            extensionId: item.extensionId?.value ?? 'unknown',
            providerId: item.provider._debugDisplayName ?? 'unknown',
            kind: item.completion.kind,
            basenameHash: hash(basename(model.uri)).toString(16),
            languageId: model.getLanguageId(),
            fileExtension: extname(model.uri),
            resolveInfo: !item.provider.resolveCompletionItem ? -1 : itemResolved ? 1 : 0,
            resolveDuration: item.resolveDuration,
            commandDuration: commandExectionDuration,
            additionalEditsAsync: additionalEditsAppliedAsync,
            index,
            firstIndex,
        });
    }
    getOverwriteInfo(item, toggleMode) {
        assertType(this.editor.hasModel());
        let replace = this.editor.getOption(123 /* EditorOption.suggest */).insertMode === 'replace';
        if (toggleMode) {
            replace = !replace;
        }
        const overwriteBefore = item.position.column - item.editStart.column;
        const overwriteAfter = (replace ? item.editReplaceEnd.column : item.editInsertEnd.column) - item.position.column;
        const columnDelta = this.editor.getPosition().column - item.position.column;
        const suffixDelta = this._lineSuffix.value
            ? this._lineSuffix.value.delta(this.editor.getPosition())
            : 0;
        return {
            overwriteBefore: overwriteBefore + columnDelta,
            overwriteAfter: overwriteAfter + suffixDelta,
        };
    }
    _alertCompletionItem(item) {
        if (isNonEmptyArray(item.completion.additionalTextEdits)) {
            const msg = nls.localize('aria.alert.snippet', "Accepting '{0}' made {1} additional edits", item.textLabel, item.completion.additionalTextEdits.length);
            alert(msg);
        }
    }
    triggerSuggest(onlyFrom, auto, noFilter) {
        if (this.editor.hasModel()) {
            this.model.trigger({
                auto: auto ?? false,
                completionOptions: {
                    providerFilter: onlyFrom,
                    kindFilter: noFilter ? new Set() : undefined,
                },
            });
            this.editor.revealPosition(this.editor.getPosition(), 0 /* ScrollType.Smooth */);
            this.editor.focus();
        }
    }
    triggerSuggestAndAcceptBest(arg) {
        if (!this.editor.hasModel()) {
            return;
        }
        const positionNow = this.editor.getPosition();
        const fallback = () => {
            if (positionNow.equals(this.editor.getPosition())) {
                this._commandService.executeCommand(arg.fallback);
            }
        };
        const makesTextEdit = (item) => {
            if (item.completion.insertTextRules & 4 /* CompletionItemInsertTextRule.InsertAsSnippet */ ||
                item.completion.additionalTextEdits) {
                // snippet, other editor -> makes edit
                return true;
            }
            const position = this.editor.getPosition();
            const startColumn = item.editStart.column;
            const endColumn = position.column;
            if (endColumn - startColumn !== item.completion.insertText.length) {
                // unequal lengths -> makes edit
                return true;
            }
            const textNow = this.editor.getModel().getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn,
                endLineNumber: position.lineNumber,
                endColumn,
            });
            // unequal text -> makes edit
            return textNow !== item.completion.insertText;
        };
        Event.once(this.model.onDidTrigger)((_) => {
            // wait for trigger because only then the cancel-event is trustworthy
            const listener = [];
            Event.any(this.model.onDidTrigger, this.model.onDidCancel)(() => {
                // retrigger or cancel -> try to type default text
                dispose(listener);
                fallback();
            }, undefined, listener);
            this.model.onDidSuggest(({ completionModel }) => {
                dispose(listener);
                if (completionModel.items.length === 0) {
                    fallback();
                    return;
                }
                const index = this._memoryService.select(this.editor.getModel(), this.editor.getPosition(), completionModel.items);
                const item = completionModel.items[index];
                if (!makesTextEdit(item)) {
                    fallback();
                    return;
                }
                this.editor.pushUndoStop();
                this._insertSuggestion({ index, item, model: completionModel }, 4 /* InsertFlags.KeepAlternativeSuggestions */ |
                    1 /* InsertFlags.NoBeforeUndoStop */ |
                    2 /* InsertFlags.NoAfterUndoStop */);
            }, undefined, listener);
        });
        this.model.trigger({ auto: false, shy: true });
        this.editor.revealPosition(positionNow, 0 /* ScrollType.Smooth */);
        this.editor.focus();
    }
    acceptSelectedSuggestion(keepAlternativeSuggestions, alternativeOverwriteConfig) {
        const item = this.widget.value.getFocusedItem();
        let flags = 0;
        if (keepAlternativeSuggestions) {
            flags |= 4 /* InsertFlags.KeepAlternativeSuggestions */;
        }
        if (alternativeOverwriteConfig) {
            flags |= 8 /* InsertFlags.AlternativeOverwriteConfig */;
        }
        this._insertSuggestion(item, flags);
    }
    acceptNextSuggestion() {
        this._alternatives.value.next();
    }
    acceptPrevSuggestion() {
        this._alternatives.value.prev();
    }
    cancelSuggestWidget() {
        this.model.cancel();
        this.model.clear();
        this.widget.value.hideWidget();
    }
    focusSuggestion() {
        this.widget.value.focusSelected();
    }
    selectNextSuggestion() {
        this.widget.value.selectNext();
    }
    selectNextPageSuggestion() {
        this.widget.value.selectNextPage();
    }
    selectLastSuggestion() {
        this.widget.value.selectLast();
    }
    selectPrevSuggestion() {
        this.widget.value.selectPrevious();
    }
    selectPrevPageSuggestion() {
        this.widget.value.selectPreviousPage();
    }
    selectFirstSuggestion() {
        this.widget.value.selectFirst();
    }
    toggleSuggestionDetails() {
        this.widget.value.toggleDetails();
    }
    toggleExplainMode() {
        this.widget.value.toggleExplainMode();
    }
    toggleSuggestionFocus() {
        this.widget.value.toggleDetailsFocus();
    }
    resetWidgetSize() {
        this.widget.value.resetPersistedSize();
    }
    forceRenderingAbove() {
        this.widget.value.forceRenderingAbove();
    }
    stopForceRenderingAbove() {
        if (!this.widget.isInitialized) {
            // This method has no effect if the widget is not initialized yet.
            return;
        }
        this.widget.value.stopForceRenderingAbove();
    }
    registerSelector(selector) {
        return this._selectors.register(selector);
    }
};
SuggestController = SuggestController_1 = __decorate([
    __param(1, ISuggestMemoryService),
    __param(2, ICommandService),
    __param(3, IContextKeyService),
    __param(4, IInstantiationService),
    __param(5, ILogService),
    __param(6, ITelemetryService)
], SuggestController);
export { SuggestController };
class PriorityRegistry {
    constructor(prioritySelector) {
        this.prioritySelector = prioritySelector;
        this._items = new Array();
    }
    register(value) {
        if (this._items.indexOf(value) !== -1) {
            throw new Error('Value is already registered');
        }
        this._items.push(value);
        this._items.sort((s1, s2) => this.prioritySelector(s2) - this.prioritySelector(s1));
        return {
            dispose: () => {
                const idx = this._items.indexOf(value);
                if (idx >= 0) {
                    this._items.splice(idx, 1);
                }
            },
        };
    }
    get itemsOrderedByPriorityDesc() {
        return this._items;
    }
}
export class TriggerSuggestAction extends EditorAction {
    static { this.id = 'editor.action.triggerSuggest'; }
    constructor() {
        super({
            id: TriggerSuggestAction.id,
            label: nls.localize2('suggest.trigger.label', 'Trigger Suggest'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasCompletionItemProvider, SuggestContext.Visible.toNegated()),
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */],
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */,
                    secondary: [512 /* KeyMod.Alt */ | 9 /* KeyCode.Escape */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */],
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(_accessor, editor, args) {
        const controller = SuggestController.get(editor);
        if (!controller) {
            return;
        }
        let auto;
        if (args && typeof args === 'object') {
            if (args.auto === true) {
                auto = true;
            }
        }
        controller.triggerSuggest(undefined, auto, undefined);
    }
}
registerEditorContribution(SuggestController.ID, SuggestController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(TriggerSuggestAction);
const weight = 100 /* KeybindingWeight.EditorContrib */ + 90;
const SuggestCommand = EditorCommand.bindToContribution(SuggestController.get);
registerEditorCommand(new SuggestCommand({
    id: 'acceptSelectedSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, SuggestContext.HasFocusedSuggestion),
    handler(x) {
        x.acceptSelectedSuggestion(true, false);
    },
    kbOpts: [
        {
            // normal tab
            primary: 2 /* KeyCode.Tab */,
            kbExpr: ContextKeyExpr.and(SuggestContext.Visible, EditorContextKeys.textInputFocus),
            weight,
        },
        {
            // accept on enter has special rules
            primary: 3 /* KeyCode.Enter */,
            kbExpr: ContextKeyExpr.and(SuggestContext.Visible, EditorContextKeys.textInputFocus, SuggestContext.AcceptSuggestionsOnEnter, SuggestContext.MakesTextEdit),
            weight,
        },
    ],
    menuOpts: [
        {
            menuId: suggestWidgetStatusbarMenu,
            title: nls.localize('accept.insert', 'Insert'),
            group: 'left',
            order: 1,
            when: SuggestContext.HasInsertAndReplaceRange.toNegated(),
        },
        {
            menuId: suggestWidgetStatusbarMenu,
            title: nls.localize('accept.insert', 'Insert'),
            group: 'left',
            order: 1,
            when: ContextKeyExpr.and(SuggestContext.HasInsertAndReplaceRange, SuggestContext.InsertMode.isEqualTo('insert')),
        },
        {
            menuId: suggestWidgetStatusbarMenu,
            title: nls.localize('accept.replace', 'Replace'),
            group: 'left',
            order: 1,
            when: ContextKeyExpr.and(SuggestContext.HasInsertAndReplaceRange, SuggestContext.InsertMode.isEqualTo('replace')),
        },
    ],
}));
registerEditorCommand(new SuggestCommand({
    id: 'acceptAlternativeSelectedSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, EditorContextKeys.textInputFocus, SuggestContext.HasFocusedSuggestion),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
        secondary: [1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */],
    },
    handler(x) {
        x.acceptSelectedSuggestion(false, true);
    },
    menuOpts: [
        {
            menuId: suggestWidgetStatusbarMenu,
            group: 'left',
            order: 2,
            when: ContextKeyExpr.and(SuggestContext.HasInsertAndReplaceRange, SuggestContext.InsertMode.isEqualTo('insert')),
            title: nls.localize('accept.replace', 'Replace'),
        },
        {
            menuId: suggestWidgetStatusbarMenu,
            group: 'left',
            order: 2,
            when: ContextKeyExpr.and(SuggestContext.HasInsertAndReplaceRange, SuggestContext.InsertMode.isEqualTo('replace')),
            title: nls.localize('accept.insert', 'Insert'),
        },
    ],
}));
// continue to support the old command
CommandsRegistry.registerCommandAlias('acceptSelectedSuggestionOnEnter', 'acceptSelectedSuggestion');
registerEditorCommand(new SuggestCommand({
    id: 'hideSuggestWidget',
    precondition: SuggestContext.Visible,
    handler: (x) => x.cancelSuggestWidget(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    },
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectNextSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: (c) => c.selectNextSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 18 /* KeyCode.DownArrow */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
        mac: {
            primary: 18 /* KeyCode.DownArrow */,
            secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */, 256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */],
        },
    },
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectNextPageSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: (c) => c.selectNextPageSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 12 /* KeyCode.PageDown */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */],
    },
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectLastSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: (c) => c.selectLastSuggestion(),
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectPrevSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: (c) => c.selectPrevSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 16 /* KeyCode.UpArrow */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
        mac: {
            primary: 16 /* KeyCode.UpArrow */,
            secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */, 256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */],
        },
    },
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectPrevPageSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: (c) => c.selectPrevPageSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 11 /* KeyCode.PageUp */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */],
    },
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectFirstSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: (c) => c.selectFirstSuggestion(),
}));
registerEditorCommand(new SuggestCommand({
    id: 'focusSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, SuggestContext.HasFocusedSuggestion.negate()),
    handler: (x) => x.focusSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */],
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */, secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */] },
    },
}));
registerEditorCommand(new SuggestCommand({
    id: 'focusAndAcceptSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, SuggestContext.HasFocusedSuggestion.negate()),
    handler: (c) => {
        c.focusSuggestion();
        c.acceptSelectedSuggestion(true, false);
    },
}));
registerEditorCommand(new SuggestCommand({
    id: 'toggleSuggestionDetails',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, SuggestContext.HasFocusedSuggestion),
    handler: (x) => x.toggleSuggestionDetails(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */],
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */, secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */] },
    },
    menuOpts: [
        {
            menuId: suggestWidgetStatusbarMenu,
            group: 'right',
            order: 1,
            when: ContextKeyExpr.and(SuggestContext.DetailsVisible, SuggestContext.CanResolve),
            title: nls.localize('detail.more', 'Show Less'),
        },
        {
            menuId: suggestWidgetStatusbarMenu,
            group: 'right',
            order: 1,
            when: ContextKeyExpr.and(SuggestContext.DetailsVisible.toNegated(), SuggestContext.CanResolve),
            title: nls.localize('detail.less', 'Show More'),
        },
    ],
}));
registerEditorCommand(new SuggestCommand({
    id: 'toggleExplainMode',
    precondition: SuggestContext.Visible,
    handler: (x) => x.toggleExplainMode(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
    },
}));
registerEditorCommand(new SuggestCommand({
    id: 'toggleSuggestionFocus',
    precondition: SuggestContext.Visible,
    handler: (x) => x.toggleSuggestionFocus(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */,
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */ },
    },
}));
//#region tab completions
registerEditorCommand(new SuggestCommand({
    id: 'insertBestCompletion',
    precondition: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.equals('config.editor.tabCompletion', 'on'), WordContextKey.AtEnd, SuggestContext.Visible.toNegated(), SuggestAlternatives.OtherSuggestions.toNegated(), SnippetController2.InSnippetMode.toNegated()),
    handler: (x, arg) => {
        x.triggerSuggestAndAcceptBest(isObject(arg) ? { fallback: 'tab', ...arg } : { fallback: 'tab' });
    },
    kbOpts: {
        weight,
        primary: 2 /* KeyCode.Tab */,
    },
}));
registerEditorCommand(new SuggestCommand({
    id: 'insertNextSuggestion',
    precondition: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.equals('config.editor.tabCompletion', 'on'), SuggestAlternatives.OtherSuggestions, SuggestContext.Visible.toNegated(), SnippetController2.InSnippetMode.toNegated()),
    handler: (x) => x.acceptNextSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 2 /* KeyCode.Tab */,
    },
}));
registerEditorCommand(new SuggestCommand({
    id: 'insertPrevSuggestion',
    precondition: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.equals('config.editor.tabCompletion', 'on'), SuggestAlternatives.OtherSuggestions, SuggestContext.Visible.toNegated(), SnippetController2.InSnippetMode.toNegated()),
    handler: (x) => x.acceptPrevSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */,
    },
}));
registerEditorAction(class extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.resetSuggestSize',
            label: nls.localize2('suggest.reset.label', 'Reset Suggest Widget Size'),
            precondition: undefined,
        });
    }
    run(_accessor, editor) {
        SuggestController.get(editor)?.resetWidgetSize();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdENvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvc3VnZ2VzdENvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckUsT0FBTyxFQUNOLGVBQWUsRUFDZixPQUFPLEVBRVAsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEYsT0FBTyxFQUNOLFlBQVksRUFDWixhQUFhLEVBRWIsb0JBQW9CLEVBQ3BCLHFCQUFxQixFQUNyQiwwQkFBMEIsR0FFMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDckUs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
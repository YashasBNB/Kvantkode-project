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
import { WindowIntervalTimer } from '../../../../base/browser/dom.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { themeColorFromId, ThemeIcon } from '../../../../base/common/themables.js';
import { StableEditorScrollState } from '../../../../editor/browser/stableEditorScroll.js';
import { LineSource, RenderOptions, renderLines, } from '../../../../editor/browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { LineRange } from '../../../../editor/common/core/lineRange.js';
import { Range } from '../../../../editor/common/core/range.js';
import { OverviewRulerLane, } from '../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { InlineDecoration } from '../../../../editor/common/viewModel.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { countWords } from '../../chat/common/chatWordCounter.js';
import { ACTION_TOGGLE_DIFF, CTX_INLINE_CHAT_CHANGE_HAS_DIFF, CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF, MENU_INLINE_CHAT_ZONE, minimapInlineChatDiffInserted, overviewRulerInlineChatDiffInserted, } from '../common/inlineChat.js';
import { assertType } from '../../../../base/common/types.js';
import { performAsyncTextEdit, asProgressiveEdit } from './utils.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { Schemas } from '../../../../base/common/network.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { DefaultChatTextEditor } from '../../chat/browser/codeBlockPart.js';
import { isEqual } from '../../../../base/common/resources.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { ConflictActionsFactory, } from '../../mergeEditor/browser/view/conflictActions.js';
import { observableValue } from '../../../../base/common/observable.js';
import { IMenuService, MenuItemAction } from '../../../../platform/actions/common/actions.js';
export var HunkAction;
(function (HunkAction) {
    HunkAction[HunkAction["Accept"] = 0] = "Accept";
    HunkAction[HunkAction["Discard"] = 1] = "Discard";
    HunkAction[HunkAction["MoveNext"] = 2] = "MoveNext";
    HunkAction[HunkAction["MovePrev"] = 3] = "MovePrev";
    HunkAction[HunkAction["ToggleDiff"] = 4] = "ToggleDiff";
})(HunkAction || (HunkAction = {}));
let LiveStrategy = class LiveStrategy {
    constructor(_session, _editor, _zone, _showOverlayToolbar, contextKeyService, _editorWorkerService, _accessibilityService, _configService, _menuService, _contextService, _textFileService, _instaService) {
        this._session = _session;
        this._editor = _editor;
        this._zone = _zone;
        this._showOverlayToolbar = _showOverlayToolbar;
        this._editorWorkerService = _editorWorkerService;
        this._accessibilityService = _accessibilityService;
        this._configService = _configService;
        this._menuService = _menuService;
        this._contextService = _contextService;
        this._textFileService = _textFileService;
        this._instaService = _instaService;
        this._decoInsertedText = ModelDecorationOptions.register({
            description: 'inline-modified-line',
            className: 'inline-chat-inserted-range-linehighlight',
            isWholeLine: true,
            overviewRuler: {
                position: OverviewRulerLane.Full,
                color: themeColorFromId(overviewRulerInlineChatDiffInserted),
            },
            minimap: {
                position: 1 /* MinimapPosition.Inline */,
                color: themeColorFromId(minimapInlineChatDiffInserted),
            },
        });
        this._decoInsertedTextRange = ModelDecorationOptions.register({
            description: 'inline-chat-inserted-range-linehighlight',
            className: 'inline-chat-inserted-range',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        this._store = new DisposableStore();
        this._onDidAccept = this._store.add(new Emitter());
        this._onDidDiscard = this._store.add(new Emitter());
        this._editCount = 0;
        this._hunkData = new Map();
        this.onDidAccept = this._onDidAccept.event;
        this.onDidDiscard = this._onDidDiscard.event;
        this._ctxCurrentChangeHasDiff = CTX_INLINE_CHAT_CHANGE_HAS_DIFF.bindTo(contextKeyService);
        this._ctxCurrentChangeShowsDiff = CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF.bindTo(contextKeyService);
        this._progressiveEditingDecorations = this._editor.createDecorationsCollection();
        this._lensActionsFactory = this._store.add(new ConflictActionsFactory(this._editor));
    }
    dispose() {
        this._resetDiff();
        this._store.dispose();
    }
    _resetDiff() {
        this._ctxCurrentChangeHasDiff.reset();
        this._ctxCurrentChangeShowsDiff.reset();
        this._zone.widget.updateStatus('');
        this._progressiveEditingDecorations.clear();
        for (const data of this._hunkData.values()) {
            data.remove();
        }
    }
    async apply() {
        this._resetDiff();
        if (this._editCount > 0) {
            this._editor.pushUndoStop();
        }
        await this._doApplyChanges(true);
    }
    cancel() {
        this._resetDiff();
        return this._session.hunkData.discardAll();
    }
    async makeChanges(edits, obs, undoStopBefore) {
        return this._makeChanges(edits, obs, undefined, undefined, undoStopBefore);
    }
    async makeProgressiveChanges(edits, obs, opts, undoStopBefore) {
        // add decorations once per line that got edited
        const progress = new Progress((edits) => {
            const newLines = new Set();
            for (const edit of edits) {
                LineRange.fromRange(edit.range).forEach((line) => newLines.add(line));
            }
            const existingRanges = this._progressiveEditingDecorations
                .getRanges()
                .map(LineRange.fromRange);
            for (const existingRange of existingRanges) {
                existingRange.forEach((line) => newLines.delete(line));
            }
            const newDecorations = [];
            for (const line of newLines) {
                newDecorations.push({
                    range: new Range(line, 1, line, Number.MAX_VALUE),
                    options: this._decoInsertedText,
                });
            }
            this._progressiveEditingDecorations.append(newDecorations);
        });
        return this._makeChanges(edits, obs, opts, progress, undoStopBefore);
    }
    async _makeChanges(edits, obs, opts, progress, undoStopBefore) {
        // push undo stop before first edit
        if (undoStopBefore) {
            this._editor.pushUndoStop();
        }
        this._editCount++;
        if (opts) {
            // ASYNC
            const durationInSec = opts.duration / 1000;
            for (const edit of edits) {
                const wordCount = countWords(edit.text ?? '');
                const speed = wordCount / durationInSec;
                // console.log({ durationInSec, wordCount, speed: wordCount / durationInSec });
                const asyncEdit = asProgressiveEdit(new WindowIntervalTimer(this._zone.domNode), edit, speed, opts.token);
                await performAsyncTextEdit(this._session.textModelN, asyncEdit, progress, obs);
            }
        }
        else {
            // SYNC
            obs.start();
            this._session.textModelN.pushEditOperations(null, edits, (undoEdits) => {
                progress?.report(undoEdits);
                return null;
            });
            obs.stop();
        }
    }
    performHunkAction(hunk, action) {
        const displayData = this._findDisplayData(hunk);
        if (!displayData) {
            // no hunks (left or not yet) found, make sure to
            // finish the sessions
            if (action === 0 /* HunkAction.Accept */) {
                this._onDidAccept.fire();
            }
            else if (action === 1 /* HunkAction.Discard */) {
                this._onDidDiscard.fire();
            }
            return;
        }
        if (action === 0 /* HunkAction.Accept */) {
            displayData.acceptHunk();
        }
        else if (action === 1 /* HunkAction.Discard */) {
            displayData.discardHunk();
        }
        else if (action === 2 /* HunkAction.MoveNext */) {
            displayData.move(true);
        }
        else if (action === 3 /* HunkAction.MovePrev */) {
            displayData.move(false);
        }
        else if (action === 4 /* HunkAction.ToggleDiff */) {
            displayData.toggleDiff?.();
        }
    }
    _findDisplayData(hunkInfo) {
        let result;
        if (hunkInfo) {
            // use context hunk (from tool/buttonbar)
            result = this._hunkData.get(hunkInfo);
        }
        if (!result && this._zone.position) {
            // find nearest from zone position
            const zoneLine = this._zone.position.lineNumber;
            let distance = Number.MAX_SAFE_INTEGER;
            for (const candidate of this._hunkData.values()) {
                if (candidate.hunk.getState() !== 0 /* HunkState.Pending */) {
                    continue;
                }
                const hunkRanges = candidate.hunk.getRangesN();
                if (hunkRanges.length === 0) {
                    // bogous hunk
                    continue;
                }
                const myDistance = zoneLine <= hunkRanges[0].startLineNumber
                    ? hunkRanges[0].startLineNumber - zoneLine
                    : zoneLine - hunkRanges[0].endLineNumber;
                if (myDistance < distance) {
                    distance = myDistance;
                    result = candidate;
                }
            }
        }
        if (!result) {
            // fallback: first hunk that is pending
            result = Iterable.first(Iterable.filter(this._hunkData.values(), (candidate) => candidate.hunk.getState() === 0 /* HunkState.Pending */));
        }
        return result;
    }
    async renderChanges() {
        this._progressiveEditingDecorations.clear();
        const renderHunks = () => {
            let widgetData;
            changeDecorationsAndViewZones(this._editor, (decorationsAccessor, viewZoneAccessor) => {
                const keysNow = new Set(this._hunkData.keys());
                widgetData = undefined;
                for (const hunkData of this._session.hunkData.getInfo()) {
                    keysNow.delete(hunkData);
                    const hunkRanges = hunkData.getRangesN();
                    let data = this._hunkData.get(hunkData);
                    if (!data) {
                        // first time -> create decoration
                        const decorationIds = [];
                        for (let i = 0; i < hunkRanges.length; i++) {
                            decorationIds.push(decorationsAccessor.addDecoration(hunkRanges[i], i === 0 ? this._decoInsertedText : this._decoInsertedTextRange));
                        }
                        const acceptHunk = () => {
                            hunkData.acceptChanges();
                            renderHunks();
                        };
                        const discardHunk = () => {
                            hunkData.discardChanges();
                            renderHunks();
                        };
                        // original view zone
                        const mightContainNonBasicASCII = this._session.textModel0.mightContainNonBasicASCII();
                        const mightContainRTL = this._session.textModel0.mightContainRTL();
                        const renderOptions = RenderOptions.fromEditor(this._editor);
                        const originalRange = hunkData.getRanges0()[0];
                        const source = new LineSource(LineRange.fromRangeInclusive(originalRange).mapToLineArray((l) => this._session.textModel0.tokenization.getLineTokens(l)), [], mightContainNonBasicASCII, mightContainRTL);
                        const domNode = document.createElement('div');
                        domNode.className = 'inline-chat-original-zone2';
                        const result = renderLines(source, renderOptions, [
                            new InlineDecoration(new Range(originalRange.startLineNumber, 1, originalRange.startLineNumber, 1), '', 0 /* InlineDecorationType.Regular */),
                        ], domNode);
                        const viewZoneData = {
                            afterLineNumber: -1,
                            heightInLines: result.heightInLines,
                            domNode,
                            ordinal: 50000 + 2, // more than https://github.com/microsoft/vscode/blob/bf52a5cfb2c75a7327c9adeaefbddc06d529dcad/src/vs/workbench/contrib/inlineChat/browser/inlineChatZoneWidget.ts#L42
                        };
                        const toggleDiff = () => {
                            const scrollState = StableEditorScrollState.capture(this._editor);
                            changeDecorationsAndViewZones(this._editor, (_decorationsAccessor, viewZoneAccessor) => {
                                assertType(data);
                                if (!data.diffViewZoneId) {
                                    const [hunkRange] = hunkData.getRangesN();
                                    viewZoneData.afterLineNumber = hunkRange.startLineNumber - 1;
                                    data.diffViewZoneId = viewZoneAccessor.addZone(viewZoneData);
                                }
                                else {
                                    viewZoneAccessor.removeZone(data.diffViewZoneId);
                                    data.diffViewZoneId = undefined;
                                }
                            });
                            this._ctxCurrentChangeShowsDiff.set(typeof data?.diffViewZoneId === 'string');
                            scrollState.restore(this._editor);
                        };
                        let lensActions;
                        const lensActionsViewZoneIds = [];
                        if (this._showOverlayToolbar && hunkData.getState() === 0 /* HunkState.Pending */) {
                            lensActions = new DisposableStore();
                            const menu = this._menuService.createMenu(MENU_INLINE_CHAT_ZONE, this._contextService);
                            const makeActions = () => {
                                const actions = [];
                                const tuples = menu.getActions({ arg: hunkData });
                                for (const [, group] of tuples) {
                                    for (const item of group) {
                                        if (item instanceof MenuItemAction) {
                                            let text = item.label;
                                            if (item.id === ACTION_TOGGLE_DIFF) {
                                                text = item.checked ? 'Hide Changes' : 'Show Changes';
                                            }
                                            else if (ThemeIcon.isThemeIcon(item.item.icon)) {
                                                text = `$(${item.item.icon.id}) ${text}`;
                                            }
                                            actions.push({
                                                text,
                                                tooltip: item.tooltip,
                                                action: async () => item.run(),
                                            });
                                        }
                                    }
                                }
                                return actions;
                            };
                            const obs = observableValue(this, makeActions());
                            lensActions.add(menu.onDidChange(() => obs.set(makeActions(), undefined)));
                            lensActions.add(menu);
                            lensActions.add(this._lensActionsFactory.createWidget(viewZoneAccessor, hunkRanges[0].startLineNumber - 1, obs, lensActionsViewZoneIds));
                        }
                        const remove = () => {
                            changeDecorationsAndViewZones(this._editor, (decorationsAccessor, viewZoneAccessor) => {
                                assertType(data);
                                for (const decorationId of data.decorationIds) {
                                    decorationsAccessor.removeDecoration(decorationId);
                                }
                                if (data.diffViewZoneId) {
                                    viewZoneAccessor.removeZone(data.diffViewZoneId);
                                }
                                data.decorationIds = [];
                                data.diffViewZoneId = undefined;
                                data.lensActionsViewZoneIds?.forEach(viewZoneAccessor.removeZone);
                                data.lensActionsViewZoneIds = undefined;
                            });
                            lensActions?.dispose();
                        };
                        const move = (next) => {
                            const keys = Array.from(this._hunkData.keys());
                            const idx = keys.indexOf(hunkData);
                            const nextIdx = (idx + (next ? 1 : -1) + keys.length) % keys.length;
                            if (nextIdx !== idx) {
                                const nextData = this._hunkData.get(keys[nextIdx]);
                                this._zone.updatePositionAndHeight(nextData?.position);
                                renderHunks();
                            }
                        };
                        const zoneLineNumber = this._zone.position?.lineNumber ?? this._editor.getPosition().lineNumber;
                        const myDistance = zoneLineNumber <= hunkRanges[0].startLineNumber
                            ? hunkRanges[0].startLineNumber - zoneLineNumber
                            : zoneLineNumber - hunkRanges[0].endLineNumber;
                        data = {
                            hunk: hunkData,
                            decorationIds,
                            diffViewZoneId: '',
                            diffViewZone: viewZoneData,
                            lensActionsViewZoneIds,
                            distance: myDistance,
                            position: hunkRanges[0].getStartPosition().delta(-1),
                            acceptHunk,
                            discardHunk,
                            toggleDiff: !hunkData.isInsertion() ? toggleDiff : undefined,
                            remove,
                            move,
                        };
                        this._hunkData.set(hunkData, data);
                    }
                    else if (hunkData.getState() !== 0 /* HunkState.Pending */) {
                        data.remove();
                    }
                    else {
                        // update distance and position based on modifiedRange-decoration
                        const zoneLineNumber = this._zone.position?.lineNumber ?? this._editor.getPosition().lineNumber;
                        const modifiedRangeNow = hunkRanges[0];
                        data.position = modifiedRangeNow.getStartPosition().delta(-1);
                        data.distance =
                            zoneLineNumber <= modifiedRangeNow.startLineNumber
                                ? modifiedRangeNow.startLineNumber - zoneLineNumber
                                : zoneLineNumber - modifiedRangeNow.endLineNumber;
                    }
                    if (hunkData.getState() === 0 /* HunkState.Pending */ &&
                        (!widgetData || data.distance < widgetData.distance)) {
                        widgetData = data;
                    }
                }
                for (const key of keysNow) {
                    const data = this._hunkData.get(key);
                    if (data) {
                        this._hunkData.delete(key);
                        data.remove();
                    }
                }
            });
            if (widgetData) {
                this._zone.reveal(widgetData.position);
                const mode = this._configService.getValue("inlineChat.accessibleDiffView" /* InlineChatConfigKeys.AccessibleDiffView */);
                if (mode === 'on' ||
                    (mode === 'auto' && this._accessibilityService.isScreenReaderOptimized())) {
                    this._zone.widget.showAccessibleHunk(this._session, widgetData.hunk);
                }
                this._ctxCurrentChangeHasDiff.set(Boolean(widgetData.toggleDiff));
            }
            else if (this._hunkData.size > 0) {
                // everything accepted or rejected
                let oneAccepted = false;
                for (const hunkData of this._session.hunkData.getInfo()) {
                    if (hunkData.getState() === 1 /* HunkState.Accepted */) {
                        oneAccepted = true;
                        break;
                    }
                }
                if (oneAccepted) {
                    this._onDidAccept.fire();
                }
                else {
                    this._onDidDiscard.fire();
                }
            }
            return widgetData;
        };
        return renderHunks()?.position;
    }
    getWholeRangeDecoration() {
        // don't render the blue in live mode
        return [];
    }
    async _doApplyChanges(ignoreLocal) {
        const untitledModels = [];
        const editor = this._instaService.createInstance(DefaultChatTextEditor);
        for (const request of this._session.chatModel.getRequests()) {
            if (!request.response?.response) {
                continue;
            }
            for (const item of request.response.response.value) {
                if (item.kind !== 'textEditGroup') {
                    continue;
                }
                if (ignoreLocal && isEqual(item.uri, this._session.textModelN.uri)) {
                    continue;
                }
                await editor.apply(request.response, item, undefined);
                if (item.uri.scheme === Schemas.untitled) {
                    const untitled = this._textFileService.untitled.get(item.uri);
                    if (untitled) {
                        untitledModels.push(untitled);
                    }
                }
            }
        }
        for (const untitledModel of untitledModels) {
            if (!untitledModel.isDisposed()) {
                await untitledModel.resolve();
                await untitledModel.save({ reason: 1 /* SaveReason.EXPLICIT */ });
            }
        }
    }
};
LiveStrategy = __decorate([
    __param(4, IContextKeyService),
    __param(5, IEditorWorkerService),
    __param(6, IAccessibilityService),
    __param(7, IConfigurationService),
    __param(8, IMenuService),
    __param(9, IContextKeyService),
    __param(10, ITextFileService),
    __param(11, IInstantiationService)
], LiveStrategy);
export { LiveStrategy };
function changeDecorationsAndViewZones(editor, callback) {
    editor.changeDecorations((decorationsAccessor) => {
        editor.changeViewZones((viewZoneAccessor) => {
            callback(decorationsAccessor, viewZoneAccessor);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFN0cmF0ZWdpZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdFN0cmF0ZWdpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFckUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFNbEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDMUYsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsV0FBVyxHQUNYLE1BQU0sNEZBQTRGLENBQUE7QUFFbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUvRCxPQUFPLEVBS04saUJBQWlCLEdBRWpCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLHdDQUF3QyxDQUFBO0FBQy9GLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsT0FBTyxFQUFFLFVB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
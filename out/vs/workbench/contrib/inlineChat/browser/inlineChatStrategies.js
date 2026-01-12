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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFN0cmF0ZWdpZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvYnJvd3Nlci9pbmxpbmVDaGF0U3RyYXRlZ2llcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQU1sRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMxRixPQUFPLEVBQ04sVUFBVSxFQUNWLGFBQWEsRUFDYixXQUFXLEdBQ1gsTUFBTSw0RkFBNEYsQ0FBQTtBQUVuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRS9ELE9BQU8sRUFLTixpQkFBaUIsR0FFakIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQXdCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0YsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSxPQUFPLEVB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
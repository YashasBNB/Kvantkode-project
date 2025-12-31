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
var ChatEditingCodeEditorIntegration_1, DiffHunkWidget_1;
import '../media/chatEditorController.css';
import { getTotalWidth } from '../../../../../base/browser/dom.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore, dispose, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, constObservable, derived, observableFromEvent, observableValue, } from '../../../../../base/common/observable.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { themeColorFromId } from '../../../../../base/common/themables.js';
import { observableCodeEditor } from '../../../../../editor/browser/observableCodeEditor.js';
import { AccessibleDiffViewer, } from '../../../../../editor/browser/widget/diffEditor/components/accessibleDiffViewer.js';
import { RenderOptions, LineSource, renderLines, } from '../../../../../editor/browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { diffAddDecoration, diffWholeLineAddDecoration, diffDeleteDecoration, } from '../../../../../editor/browser/widget/diffEditor/registrations.contribution.js';
import { LineRange } from '../../../../../editor/common/core/lineRange.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { OverviewRulerLane, } from '../../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../../editor/common/model/textModel.js';
import { InlineDecoration } from '../../../../../editor/common/viewModel.js';
import { localize } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { MenuWorkbenchToolBar, } from '../../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { isDiffEditorInput } from '../../../../common/editor.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { overviewRulerModifiedForeground, minimapGutterModifiedBackground, overviewRulerAddedForeground, minimapGutterAddedBackground, overviewRulerDeletedForeground, minimapGutterDeletedBackground, } from '../../../scm/common/quickDiff.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { isTextDiffEditorForEntry } from './chatEditing.js';
import { ChatAgentLocation } from '../../common/constants.js';
let ChatEditingCodeEditorIntegration = class ChatEditingCodeEditorIntegration {
    static { ChatEditingCodeEditorIntegration_1 = this; }
    static { this._diffLineDecorationData = ModelDecorationOptions.register({
        description: 'diff-line-decoration',
    }); }
    constructor(_entry, _editor, documentDiffInfo, _chatAgentService, _editorService, _accessibilitySignalsService, instantiationService) {
        this._entry = _entry;
        this._editor = _editor;
        this._chatAgentService = _chatAgentService;
        this._editorService = _editorService;
        this._accessibilitySignalsService = _accessibilitySignalsService;
        this._currentIndex = observableValue(this, -1);
        this.currentIndex = this._currentIndex;
        this._store = new DisposableStore();
        this._diffHunksRenderStore = this._store.add(new DisposableStore());
        this._diffHunkWidgets = [];
        this._viewZones = [];
        this._accessibleDiffViewVisible = observableValue(this, false);
        this._diffLineDecorations = _editor.createDecorationsCollection();
        const codeEditorObs = observableCodeEditor(_editor);
        this._diffLineDecorations = this._editor.createDecorationsCollection(); // tracks the line range w/o visuals (used for navigate)
        this._diffVisualDecorations = this._editor.createDecorationsCollection(); // tracks the real diff with character level inserts
        const enabledObs = derived((r) => {
            if (!isEqual(codeEditorObs.model.read(r)?.uri, documentDiffInfo.read(r).modifiedModel.uri)) {
                return false;
            }
            if (this._editor.getOption(63 /* EditorOption.inDiffEditor */) &&
                !instantiationService.invokeFunction(isTextDiffEditorForEntry, _entry, this._editor)) {
                return false;
            }
            return true;
        });
        // update decorations
        this._store.add(autorun((r) => {
            if (!enabledObs.read(r)) {
                this._diffLineDecorations.clear();
                return;
            }
            const data = [];
            const diff = documentDiffInfo.read(r);
            for (const diffEntry of diff.changes) {
                data.push({
                    range: diffEntry.modified.toInclusiveRange() ??
                        new Range(diffEntry.modified.startLineNumber, 1, diffEntry.modified.startLineNumber, Number.MAX_SAFE_INTEGER),
                    options: ChatEditingCodeEditorIntegration_1._diffLineDecorationData,
                });
            }
            this._diffLineDecorations.set(data);
        }));
        // INIT current index when: enabled, not streaming anymore, once per request, and when having changes
        let lastModifyingRequestId;
        this._store.add(autorun((r) => {
            if (enabledObs.read(r) &&
                !_entry.isCurrentlyBeingModifiedBy.read(r) &&
                lastModifyingRequestId !== _entry.lastModifyingRequestId &&
                !documentDiffInfo.read(r).identical) {
                lastModifyingRequestId = _entry.lastModifyingRequestId;
                const position = _editor.getPosition() ?? new Position(1, 1);
                const ranges = this._diffLineDecorations.getRanges();
                let initialIndex = ranges.findIndex((r) => r.containsPosition(position));
                if (initialIndex < 0) {
                    initialIndex = 0;
                    for (; initialIndex < ranges.length - 1; initialIndex++) {
                        const range = ranges[initialIndex];
                        if (range.endLineNumber >= position.lineNumber) {
                            break;
                        }
                    }
                }
                this._currentIndex.set(initialIndex, undefined);
                _editor.revealRange(ranges[initialIndex]);
            }
        }));
        // render diff decorations
        this._store.add(autorun((r) => {
            if (!enabledObs.read(r)) {
                this._clearDiffRendering();
                return;
            }
            // done: render diff
            if (!_entry.isCurrentlyBeingModifiedBy.read(r)) {
                // Add diff decoration to the UI (unless in diff editor)
                if (!this._editor.getOption(63 /* EditorOption.inDiffEditor */)) {
                    codeEditorObs.getOption(52 /* EditorOption.fontInfo */).read(r);
                    codeEditorObs.getOption(68 /* EditorOption.lineHeight */).read(r);
                    const reviewMode = _entry.reviewMode.read(r);
                    const diff = documentDiffInfo.read(r);
                    this._updateDiffRendering(diff, reviewMode);
                }
                else {
                    this._clearDiffRendering();
                }
            }
        }));
        // accessibility: signals while cursor changes
        this._store.add(autorun((r) => {
            const position = codeEditorObs.positions.read(r)?.at(0);
            if (!position || !enabledObs.read(r)) {
                return;
            }
            const diff = documentDiffInfo.read(r);
            const mapping = diff.changes.find((m) => m.modified.contains(position.lineNumber) ||
                (m.modified.isEmpty && m.modified.startLineNumber === position.lineNumber));
            if (mapping?.modified.isEmpty) {
                this._accessibilitySignalsService.playSignal(AccessibilitySignal.diffLineDeleted, {
                    source: 'chatEditingEditor.cursorPositionChanged',
                });
            }
            else if (mapping?.original.isEmpty) {
                this._accessibilitySignalsService.playSignal(AccessibilitySignal.diffLineInserted, {
                    source: 'chatEditingEditor.cursorPositionChanged',
                });
            }
            else if (mapping) {
                this._accessibilitySignalsService.playSignal(AccessibilitySignal.diffLineModified, {
                    source: 'chatEditingEditor.cursorPositionChanged',
                });
            }
        }));
        // accessibility: diff view
        this._store.add(autorunWithStore((r, store) => {
            const visible = this._accessibleDiffViewVisible.read(r);
            if (!visible || !enabledObs.read(r)) {
                return;
            }
            const accessibleDiffWidget = new AccessibleDiffViewContainer();
            _editor.addOverlayWidget(accessibleDiffWidget);
            store.add(toDisposable(() => _editor.removeOverlayWidget(accessibleDiffWidget)));
            store.add(instantiationService.createInstance(AccessibleDiffViewer, accessibleDiffWidget.getDomNode(), enabledObs, (visible, tx) => this._accessibleDiffViewVisible.set(visible, tx), constObservable(true), codeEditorObs.layoutInfo.map((v, r) => v.width), codeEditorObs.layoutInfo.map((v, r) => v.height), documentDiffInfo.map((diff) => diff.changes.slice()), instantiationService.createInstance(AccessibleDiffViewerModel, documentDiffInfo, _editor)));
        }));
        // ---- readonly while streaming
        let actualOptions;
        const restoreActualOptions = () => {
            if (actualOptions !== undefined) {
                this._editor.updateOptions(actualOptions);
                actualOptions = undefined;
            }
        };
        this._store.add(toDisposable(restoreActualOptions));
        const renderAsBeingModified = derived(this, (r) => {
            return enabledObs.read(r) && Boolean(_entry.isCurrentlyBeingModifiedBy.read(r));
        });
        this._store.add(autorun((r) => {
            const value = renderAsBeingModified.read(r);
            if (value) {
                actualOptions ??= {
                    readOnly: this._editor.getOption(96 /* EditorOption.readOnly */),
                    stickyScroll: this._editor.getOption(120 /* EditorOption.stickyScroll */),
                    codeLens: this._editor.getOption(17 /* EditorOption.codeLens */),
                    guides: this._editor.getOption(16 /* EditorOption.guides */),
                };
                this._editor.updateOptions({
                    readOnly: true,
                    stickyScroll: { enabled: false },
                    codeLens: false,
                    guides: { indentation: false, bracketPairs: false },
                });
            }
            else {
                restoreActualOptions();
            }
        }));
    }
    dispose() {
        this._clear();
        this._store.dispose();
    }
    _clear() {
        this._diffLineDecorations.clear();
        this._clearDiffRendering();
        this._currentIndex.set(-1, undefined);
    }
    // ---- diff rendering logic
    _clearDiffRendering() {
        this._editor.changeViewZones((viewZoneChangeAccessor) => {
            for (const id of this._viewZones) {
                viewZoneChangeAccessor.removeZone(id);
            }
        });
        this._viewZones = [];
        this._diffHunksRenderStore.clear();
        this._diffVisualDecorations.clear();
    }
    _updateDiffRendering(diff, reviewMode) {
        const chatDiffAddDecoration = ModelDecorationOptions.createDynamic({
            ...diffAddDecoration,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        const chatDiffWholeLineAddDecoration = ModelDecorationOptions.createDynamic({
            ...diffWholeLineAddDecoration,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        const createOverviewDecoration = (overviewRulerColor, minimapColor) => {
            return ModelDecorationOptions.createDynamic({
                description: 'chat-editing-decoration',
                overviewRuler: {
                    color: themeColorFromId(overviewRulerColor),
                    position: OverviewRulerLane.Left,
                },
                minimap: { color: themeColorFromId(minimapColor), position: 2 /* MinimapPosition.Gutter */ },
            });
        };
        const modifiedDecoration = createOverviewDecoration(overviewRulerModifiedForeground, minimapGutterModifiedBackground);
        const addedDecoration = createOverviewDecoration(overviewRulerAddedForeground, minimapGutterAddedBackground);
        const deletedDecoration = createOverviewDecoration(overviewRulerDeletedForeground, minimapGutterDeletedBackground);
        this._diffHunksRenderStore.clear();
        this._diffHunkWidgets.length = 0;
        const diffHunkDecorations = [];
        this._editor.changeViewZones((viewZoneChangeAccessor) => {
            for (const id of this._viewZones) {
                viewZoneChangeAccessor.removeZone(id);
            }
            this._viewZones = [];
            const modifiedVisualDecorations = [];
            const mightContainNonBasicASCII = diff.originalModel.mightContainNonBasicASCII();
            const mightContainRTL = diff.originalModel.mightContainRTL();
            const renderOptions = RenderOptions.fromEditor(this._editor);
            const editorLineCount = this._editor.getModel()?.getLineCount();
            for (const diffEntry of diff.changes) {
                const originalRange = diffEntry.original;
                diff.originalModel.tokenization.forceTokenization(Math.max(1, originalRange.endLineNumberExclusive - 1));
                const source = new LineSource(originalRange.mapToLineArray((l) => diff.originalModel.tokenization.getLineTokens(l)), [], mightContainNonBasicASCII, mightContainRTL);
                const decorations = [];
                if (reviewMode) {
                    for (const i of diffEntry.innerChanges || []) {
                        decorations.push(new InlineDecoration(i.originalRange.delta(-(diffEntry.original.startLineNumber - 1)), diffDeleteDecoration.className, 0 /* InlineDecorationType.Regular */));
                        // If the original range is empty, the start line number is 1 and the new range spans the entire file, don't draw an Added decoration
                        if (!(i.originalRange.isEmpty() &&
                            i.originalRange.startLineNumber === 1 &&
                            i.modifiedRange.endLineNumber === editorLineCount) &&
                            !i.modifiedRange.isEmpty()) {
                            modifiedVisualDecorations.push({
                                range: i.modifiedRange,
                                options: chatDiffAddDecoration,
                            });
                        }
                    }
                }
                // Render an added decoration but don't also render a deleted decoration for newly inserted content at the start of the file
                // Note, this is a workaround for the `LineRange.isEmpty()` in diffEntry.original being `false` for newly inserted content
                const isCreatedContent = decorations.length === 1 &&
                    decorations[0].range.isEmpty() &&
                    diffEntry.original.startLineNumber === 1;
                if (!diffEntry.modified.isEmpty &&
                    !(isCreatedContent && diffEntry.modified.endLineNumberExclusive - 1 === editorLineCount)) {
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: chatDiffWholeLineAddDecoration,
                    });
                }
                if (diffEntry.original.isEmpty) {
                    // insertion
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: addedDecoration,
                    });
                }
                else if (diffEntry.modified.isEmpty) {
                    // deletion
                    modifiedVisualDecorations.push({
                        range: new Range(diffEntry.modified.startLineNumber - 1, 1, diffEntry.modified.startLineNumber, 1),
                        options: deletedDecoration,
                    });
                }
                else {
                    // modification
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: modifiedDecoration,
                    });
                }
                if (reviewMode) {
                    const domNode = document.createElement('div');
                    domNode.className =
                        'chat-editing-original-zone view-lines line-delete monaco-mouse-cursor-text';
                    const result = renderLines(source, renderOptions, decorations, domNode);
                    if (!isCreatedContent) {
                        const viewZoneData = {
                            afterLineNumber: diffEntry.modified.startLineNumber - 1,
                            heightInLines: result.heightInLines,
                            domNode,
                            ordinal: 50000 + 2, // more than https://github.com/microsoft/vscode/blob/bf52a5cfb2c75a7327c9adeaefbddc06d529dcad/src/vs/workbench/contrib/inlineChat/browser/inlineChatZoneWidget.ts#L42
                        };
                        this._viewZones.push(viewZoneChangeAccessor.addZone(viewZoneData));
                    }
                    // Add content widget for each diff change
                    const widget = this._editor.invokeWithinContext((accessor) => {
                        const instaService = accessor.get(IInstantiationService);
                        return instaService.createInstance(DiffHunkWidget, diff, diffEntry, this._editor.getModel().getVersionId(), this._editor, isCreatedContent ? 0 : result.heightInLines);
                    });
                    widget.layout(diffEntry.modified.startLineNumber);
                    this._diffHunkWidgets.push(widget);
                    diffHunkDecorations.push({
                        range: diffEntry.modified.toInclusiveRange() ??
                            new Range(diffEntry.modified.startLineNumber, 1, diffEntry.modified.startLineNumber, Number.MAX_SAFE_INTEGER),
                        options: {
                            description: 'diff-hunk-widget',
                            stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
                        },
                    });
                }
            }
            this._diffVisualDecorations.set(modifiedVisualDecorations);
        });
        const diffHunkDecoCollection = this._editor.createDecorationsCollection(diffHunkDecorations);
        this._diffHunksRenderStore.add(toDisposable(() => {
            dispose(this._diffHunkWidgets);
            this._diffHunkWidgets.length = 0;
            diffHunkDecoCollection.clear();
        }));
        const positionObs = observableFromEvent(this._editor.onDidChangeCursorPosition, (_) => this._editor.getPosition());
        const activeWidgetIdx = derived((r) => {
            const position = positionObs.read(r);
            if (!position) {
                return -1;
            }
            const idx = diffHunkDecoCollection.getRanges().findIndex((r) => r.containsPosition(position));
            return idx;
        });
        const toggleWidget = (activeWidget) => {
            const positionIdx = activeWidgetIdx.get();
            for (let i = 0; i < this._diffHunkWidgets.length; i++) {
                const widget = this._diffHunkWidgets[i];
                widget.toggle(widget === activeWidget || i === positionIdx);
            }
        };
        this._diffHunksRenderStore.add(autorun((r) => {
            // reveal when cursor inside
            const idx = activeWidgetIdx.read(r);
            const widget = this._diffHunkWidgets[idx];
            toggleWidget(widget);
        }));
        this._diffHunksRenderStore.add(this._editor.onMouseMove((e) => {
            // reveal when hovering over
            if (e.target.type === 12 /* MouseTargetType.OVERLAY_WIDGET */) {
                const id = e.target.detail;
                const widget = this._diffHunkWidgets.find((w) => w.getId() === id);
                toggleWidget(widget);
            }
            else if (e.target.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */) {
                const zone = e.target.detail;
                const idx = this._viewZones.findIndex((id) => id === zone.viewZoneId);
                toggleWidget(this._diffHunkWidgets[idx]);
            }
            else if (e.target.position) {
                const { position } = e.target;
                const idx = diffHunkDecoCollection
                    .getRanges()
                    .findIndex((r) => r.containsPosition(position));
                toggleWidget(this._diffHunkWidgets[idx]);
            }
            else {
                toggleWidget(undefined);
            }
        }));
        this._diffHunksRenderStore.add(Event.any(this._editor.onDidScrollChange, this._editor.onDidLayoutChange)(() => {
            for (let i = 0; i < this._diffHunkWidgets.length; i++) {
                const widget = this._diffHunkWidgets[i];
                const range = diffHunkDecoCollection.getRange(i);
                if (range) {
                    widget.layout(range?.startLineNumber);
                }
                else {
                    widget.dispose();
                }
            }
        }));
    }
    enableAccessibleDiffView() {
        this._accessibleDiffViewVisible.set(true, undefined);
    }
    // ---- navigation logic
    reveal(firstOrLast) {
        const decorations = this._diffLineDecorations
            .getRanges()
            .sort((a, b) => Range.compareRangesUsingStarts(a, b));
        const index = firstOrLast ? 0 : decorations.length - 1;
        const range = decorations.at(index);
        if (range) {
            this._editor.setPosition(range.getStartPosition());
            this._editor.revealRange(range);
            this._editor.focus();
            this._currentIndex.set(index, undefined);
        }
    }
    next(wrap) {
        return this._reveal(true, !wrap);
    }
    previous(wrap) {
        return this._reveal(false, !wrap);
    }
    _reveal(next, strict) {
        const position = this._editor.getPosition();
        if (!position) {
            this._currentIndex.set(-1, undefined);
            return false;
        }
        const decorations = this._diffLineDecorations
            .getRanges()
            .sort((a, b) => Range.compareRangesUsingStarts(a, b));
        if (decorations.length === 0) {
            this._currentIndex.set(-1, undefined);
            return false;
        }
        let newIndex = -1;
        for (let i = 0; i < decorations.length; i++) {
            const range = decorations[i];
            if (range.containsPosition(position)) {
                newIndex = i + (next ? 1 : -1);
                break;
            }
            else if (Position.isBefore(position, range.getStartPosition())) {
                newIndex = next ? i : i - 1;
                break;
            }
        }
        if (strict && (newIndex < 0 || newIndex >= decorations.length)) {
            // NO change
            return false;
        }
        newIndex = (newIndex + decorations.length) % decorations.length;
        this._currentIndex.set(newIndex, undefined);
        const targetRange = decorations[newIndex];
        const targetPosition = next ? targetRange.getStartPosition() : targetRange.getEndPosition();
        this._editor.setPosition(targetPosition);
        this._editor.revealPositionInCenter(targetPosition);
        this._editor.focus();
        return true;
    }
    // --- hunks
    _findClosestWidget() {
        if (!this._editor.hasModel()) {
            return undefined;
        }
        const lineRelativeTop = this._editor.getTopForLineNumber(this._editor.getPosition().lineNumber) -
            this._editor.getScrollTop();
        let closestWidget;
        let closestDistance = Number.MAX_VALUE;
        for (const widget of this._diffHunkWidgets) {
            const widgetTop = (widget.getPosition()?.preference)?.top;
            if (widgetTop !== undefined) {
                const distance = Math.abs(widgetTop - lineRelativeTop);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestWidget = widget;
                }
            }
        }
        return closestWidget;
    }
    rejectNearestChange(closestWidget) {
        closestWidget = closestWidget ?? this._findClosestWidget();
        if (closestWidget instanceof DiffHunkWidget) {
            closestWidget.reject();
            this.next(true);
        }
    }
    acceptNearestChange(closestWidget) {
        closestWidget = closestWidget ?? this._findClosestWidget();
        if (closestWidget instanceof DiffHunkWidget) {
            closestWidget.accept();
            this.next(true);
        }
    }
    async toggleDiff(widget) {
        if (!this._editor.hasModel()) {
            return;
        }
        let selection = this._editor.getSelection();
        if (widget instanceof DiffHunkWidget) {
            const lineNumber = widget.getStartLineNumber();
            const position = lineNumber ? new Position(lineNumber, 1) : undefined;
            if (position && !selection.containsPosition(position)) {
                selection = Selection.fromPositions(position);
            }
        }
        const isDiffEditor = this._editor.getOption(63 /* EditorOption.inDiffEditor */);
        if (isDiffEditor) {
            // normal EDITOR
            await this._editorService.openEditor({
                resource: this._entry.modifiedURI,
                options: {
                    selection,
                    selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */,
                },
            });
        }
        else {
            // DIFF editor
            const defaultAgentName = this._chatAgentService.getDefaultAgent(ChatAgentLocation.EditingSession)?.fullName;
            const diffEditor = await this._editorService.openEditor({
                original: { resource: this._entry.originalURI, options: { selection: undefined } },
                modified: { resource: this._entry.modifiedURI, options: { selection } },
                label: defaultAgentName
                    ? localize('diff.agent', '{0} (changes from {1})', basename(this._entry.modifiedURI), defaultAgentName)
                    : localize('diff.generic', '{0} (changes from chat)', basename(this._entry.modifiedURI)),
            });
            if (diffEditor && diffEditor.input) {
                // this is needed, passing the selection doesn't seem to work
                diffEditor.getControl()?.setSelection(selection);
                // close diff editor when entry is decided
                const d = autorun((r) => {
                    const state = this._entry.state.read(r);
                    if (state === 1 /* WorkingSetEntryState.Accepted */ || state === 2 /* WorkingSetEntryState.Rejected */) {
                        d.dispose();
                        const editorIdents = [];
                        for (const candidate of this._editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
                            if (isDiffEditorInput(candidate.editor) &&
                                isEqual(candidate.editor.original.resource, this._entry.originalURI) &&
                                isEqual(candidate.editor.modified.resource, this._entry.modifiedURI)) {
                                editorIdents.push(candidate);
                            }
                        }
                        this._editorService.closeEditors(editorIdents);
                    }
                });
            }
        }
    }
};
ChatEditingCodeEditorIntegration = ChatEditingCodeEditorIntegration_1 = __decorate([
    __param(3, IChatAgentService),
    __param(4, IEditorService),
    __param(5, IAccessibilitySignalService),
    __param(6, IInstantiationService)
], ChatEditingCodeEditorIntegration);
export { ChatEditingCodeEditorIntegration };
let DiffHunkWidget = class DiffHunkWidget {
    static { DiffHunkWidget_1 = this; }
    static { this._idPool = 0; }
    constructor(_diffInfo, _change, _versionId, _editor, _lineDelta, instaService) {
        this._diffInfo = _diffInfo;
        this._change = _change;
        this._versionId = _versionId;
        this._editor = _editor;
        this._lineDelta = _lineDelta;
        this._id = `diff-change-widget-${DiffHunkWidget_1._idPool++}`;
        this._store = new DisposableStore();
        this._domNode = document.createElement('div');
        this._domNode.className = 'chat-diff-change-content-widget';
        const toolbar = instaService.createInstance(MenuWorkbenchToolBar, this._domNode, MenuId.ChatEditingEditorHunk, {
            telemetrySource: 'chatEditingEditorHunk',
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            toolbarOptions: { primaryGroup: () => true },
            menuOptions: {
                renderShortTitle: true,
                arg: this,
            },
        });
        this._store.add(toolbar);
        this._store.add(toolbar.actionRunner.onWillRun((_) => _editor.focus()));
        this._editor.addOverlayWidget(this);
    }
    dispose() {
        this._store.dispose();
        this._editor.removeOverlayWidget(this);
    }
    getId() {
        return this._id;
    }
    layout(startLineNumber) {
        const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
        const { contentLeft, contentWidth, verticalScrollbarWidth } = this._editor.getLayoutInfo();
        const scrollTop = this._editor.getScrollTop();
        this._position = {
            stackOridinal: 1,
            preference: {
                top: this._editor.getTopForLineNumber(startLineNumber) -
                    scrollTop -
                    lineHeight * this._lineDelta,
                left: contentLeft + contentWidth - (2 * verticalScrollbarWidth + getTotalWidth(this._domNode)),
            },
        };
        this._editor.layoutOverlayWidget(this);
        this._lastStartLineNumber = startLineNumber;
    }
    toggle(show) {
        this._domNode.classList.toggle('hover', show);
        if (this._lastStartLineNumber) {
            this.layout(this._lastStartLineNumber);
        }
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return this._position ?? null;
    }
    getStartLineNumber() {
        return this._lastStartLineNumber;
    }
    // ---
    async reject() {
        if (this._versionId !== this._editor.getModel()?.getVersionId()) {
            return false;
        }
        return await this._diffInfo.undo(this._change);
    }
    async accept() {
        if (this._versionId !== this._editor.getModel()?.getVersionId()) {
            return false;
        }
        return this._diffInfo.keep(this._change);
    }
};
DiffHunkWidget = DiffHunkWidget_1 = __decorate([
    __param(5, IInstantiationService)
], DiffHunkWidget);
class AccessibleDiffViewContainer {
    constructor() {
        this._domNode = document.createElement('div');
        this._domNode.className = 'accessible-diff-view';
        this._domNode.style.width = '100%';
        this._domNode.style.position = 'absolute';
    }
    getId() {
        return 'chatEdits.accessibleDiffView';
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            preference: { top: 0, left: 0 },
            stackOridinal: 1,
        };
    }
}
class AccessibleDiffViewerModel {
    constructor(_documentDiffInfo, _editor) {
        this._documentDiffInfo = _documentDiffInfo;
        this._editor = _editor;
    }
    getOriginalModel() {
        return this._documentDiffInfo.get().originalModel;
    }
    getOriginalOptions() {
        return this._editor.getOptions();
    }
    originalReveal(range) {
        const changes = this._documentDiffInfo.get().changes;
        const idx = changes.findIndex((value) => value.original.intersect(LineRange.fromRange(range)));
        if (idx >= 0) {
            range = changes[idx].modified.toInclusiveRange() ?? range;
        }
        this.modifiedReveal(range);
    }
    getModifiedModel() {
        return this._editor.getModel();
    }
    getModifiedOptions() {
        return this._editor.getOptions();
    }
    modifiedReveal(range) {
        if (range) {
            this._editor.revealRange(range);
            this._editor.setSelection(range);
        }
        this._editor.focus();
    }
    modifiedSetSelection(range) {
        this._editor.setSelection(range);
    }
    modifiedFocus() {
        this._editor.focus();
    }
    getModifiedPosition() {
        return this._editor.getPosition() ?? undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdDb2RlRWRpdG9ySW50ZWdyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdDb2RlRWRpdG9ySW50ZWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sbUNBQW1DLENBQUE7QUFFMUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRyxPQUFPLEVBQ04sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixlQUFlLEVBQ2YsT0FBTyxFQUVQLG1CQUFtQixFQUNuQixlQUFlLEdBQ2YsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBUzFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxvRkFBb0YsQ0FBQTtBQUMzRixPQUFPLEVBQ04sYUFBYSxFQUNiLFVBQVUsRUFDVixXQUFXLEdBQ1gsTUFBTSwrRkFBK0YsQ0FBQTtBQUN0RyxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLDBCQUEwQixFQUMxQixvQkFBb0IsR0FDcEIsTUFBTSwrRUFBK0UsQ0FBQTtBQUV0RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHMUUsT0FBTyxFQUlOLGlCQUFpQixHQUVqQixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBd0IsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxtRkFBbUYsQ0FBQTtBQUMxRixPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRTFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBbUMsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDcEYsT0FBTyxFQUNOLCtCQUErQixFQUMvQiwrQkFBK0IsRUFDL0IsNEJBQTRCLEVBQzVCLDRCQUE0QixFQUM1Qiw4QkFBOEIsRUFDOUIsOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFPOUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFVdEQsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBZ0M7O2FBQ3BCLDRCQUF1QixHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztRQUNqRixXQUFXLEVBQUUsc0JBQXNCO0tBQ25DLENBQUMsQUFGNkMsQ0FFN0M7SUFjRixZQUNrQixNQUEwQixFQUMxQixPQUFvQixFQUNyQyxnQkFBNkMsRUFDMUIsaUJBQXFELEVBQ3hELGNBQStDLEVBRS9ELDRCQUEwRSxFQUNuRCxvQkFBMkM7UUFQakQsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7UUFDMUIsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUVELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDdkMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBRTlDLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBNkI7UUFuQjFELGtCQUFhLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pELGlCQUFZLEdBQXdCLElBQUksQ0FBQyxhQUFhLENBQUE7UUFDOUMsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFJOUIsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBQzlELHFCQUFnQixHQUFxQixFQUFFLENBQUE7UUFDaEQsZUFBVSxHQUFhLEVBQUUsQ0FBQTtRQUVoQiwrQkFBMEIsR0FBRyxlQUFlLENBQVUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBWWxGLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTtRQUNqRSxNQUFNLGFBQWEsR0FBRyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVuRCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxDQUFBLENBQUMsd0RBQXdEO1FBQy9ILElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLENBQUEsQ0FBQyxvREFBb0Q7UUFFN0gsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDaEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM1RixPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFDRCxJQUNDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxvQ0FBMkI7Z0JBQ2pELENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHdCQUF3QixFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQ25GLENBQUM7Z0JBQ0YsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUMsQ0FBQTtRQUVGLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZCxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNiLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDakMsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLElBQUksR0FBNEIsRUFBRSxDQUFBO1lBQ3hDLE1BQU0sSUFBSSxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyQyxLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQztvQkFDVCxLQUFLLEVBQ0osU0FBUyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRTt3QkFDckMsSUFBSSxLQUFLLENBQ1IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQ2xDLENBQUMsRUFDRCxTQUFTLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFDbEMsTUFBTSxDQUFDLGdCQUFnQixDQUN2QjtvQkFDRixPQUFPLEVBQUUsa0NBQWdDLENBQUMsdUJBQXVCO2lCQUNqRSxDQUFDLENBQUE7WUFDSCxDQUFDO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQscUdBQXFHO1FBQ3JHLElBQUksc0JBQTBDLENBQUE7UUFDOUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2QsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDYixJQUNDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNsQixDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxzQkFBc0IsS0FBSyxNQUFNLENBQUMsc0JBQXNCO2dCQUN4RCxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQ2xDLENBQUM7Z0JBQ0Ysc0JBQXNCLEdBQUcsTUFBTSxDQUFDLHNCQUFzQixDQUFBO2dCQUN0RCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUM1RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLENBQUE7Z0JBQ3BELElBQUksWUFBWSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO2dCQUN4RSxJQUFJLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDdEIsWUFBWSxHQUFHLENBQUMsQ0FBQTtvQkFDaEIsT0FBTyxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsWUFBWSxFQUFFLEVBQUUsQ0FBQzt3QkFDekQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO3dCQUNsQyxJQUFJLEtBQUssQ0FBQyxhQUFhLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDOzRCQUNoRCxNQUFLO3dCQUNOLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2dCQUNELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDL0MsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtZQUMxQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELDBCQUEwQjtRQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZCxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNiLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO2dCQUMxQixPQUFNO1lBQ1AsQ0FBQztZQUVELG9CQUFvQjtZQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNoRCx3REFBd0Q7Z0JBQ3hELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsb0NBQTJCLEVBQUUsQ0FBQztvQkFDeEQsYUFBYSxDQUFDLFNBQVMsZ0NBQXVCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUN0RCxhQUFhLENBQUMsU0FBUyxrQ0FBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBRXhELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUM1QyxNQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3JDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBQzVDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtnQkFDM0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsOENBQThDO1FBQzlDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUNkLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2IsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZELElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3JDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUNoQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztnQkFDeEMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsS0FBSyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQzNFLENBQUE7WUFDRCxJQUFJLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsZUFBZSxFQUFFO29CQUNqRixNQUFNLEVBQUUseUNBQXlDO2lCQUNqRCxDQUFDLENBQUE7WUFDSCxDQUFDO2lCQUFNLElBQUksT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsRUFBRTtvQkFDbEYsTUFBTSxFQUFFLHlDQUF5QztpQkFDakQsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztpQkFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsNEJBQTRCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixFQUFFO29CQUNsRixNQUFNLEVBQUUseUNBQXlDO2lCQUNqRCxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELDJCQUEyQjtRQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZCxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUM3QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXZELElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLDJCQUEyQixFQUFFLENBQUE7WUFDOUQsT0FBTyxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDOUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWhGLEtBQUssQ0FBQyxHQUFHLENBQ1Isb0JBQW9CLENBQUMsY0FBYyxDQUNsQyxvQkFBb0IsRUFDcEIsb0JBQW9CLENBQUMsVUFBVSxFQUFFLEVBQ2pDLFVBQVUsRUFDVixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxFQUNqRSxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQ3JCLGFBQWEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUMvQyxhQUFhLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFDaEQsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQ3BELG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMseUJBQXlCLEVBQ3pCLGdCQUFnQixFQUNoQixPQUFPLENBQ1AsQ0FDRCxDQUNELENBQUE7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsZ0NBQWdDO1FBRWhDLElBQUksYUFBeUMsQ0FBQTtRQUU3QyxNQUFNLG9CQUFvQixHQUFHLEdBQUcsRUFBRTtZQUNqQyxJQUFJLGFBQWEsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBQ3pDLGFBQWEsR0FBRyxTQUFTLENBQUE7WUFDMUIsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUE7UUFFbkQsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDakQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEYsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZCxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNiLE1BQU0sS0FBSyxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzQyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLGFBQWEsS0FBSztvQkFDakIsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxnQ0FBdUI7b0JBQ3ZELFlBQVksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMscUNBQTJCO29CQUMvRCxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGdDQUF1QjtvQkFDdkQsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyw4QkFBcUI7aUJBQ25ELENBQUE7Z0JBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7b0JBQzFCLFFBQVEsRUFBRSxJQUFJO29CQUNkLFlBQVksRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUU7b0JBQ2hDLFFBQVEsRUFBRSxLQUFLO29CQUNmLE1BQU0sRUFBRSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRTtpQkFDbkQsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLG9CQUFvQixFQUFFLENBQUE7WUFDdkIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVPLE1BQU07UUFDYixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDakMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDMUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUVELDRCQUE0QjtJQUVwQixtQkFBbUI7UUFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFO1lBQ3ZELEtBQUssTUFBTSxFQUFFLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNsQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNwQyxDQUFDO0lBRU8sb0JBQW9CLENBQUMsSUFBb0IsRUFBRSxVQUFtQjtRQUNyRSxNQUFNLHFCQUFxQixHQUFHLHNCQUFzQixDQUFDLGFBQWEsQ0FBQztZQUNsRSxHQUFHLGlCQUFpQjtZQUNwQixVQUFVLDREQUFvRDtTQUM5RCxDQUFDLENBQUE7UUFDRixNQUFNLDhCQUE4QixHQUFHLHNCQUFzQixDQUFDLGFBQWEsQ0FBQztZQUMzRSxHQUFHLDBCQUEwQjtZQUM3QixVQUFVLDREQUFvRDtTQUM5RCxDQUFDLENBQUE7UUFDRixNQUFNLHdCQUF3QixHQUFHLENBQUMsa0JBQTBCLEVBQUUsWUFBb0IsRUFBRSxFQUFFO1lBQ3JGLE9BQU8sc0JBQXNCLENBQUMsYUFBYSxDQUFDO2dCQUMzQyxXQUFXLEVBQUUseUJBQXlCO2dCQUN0QyxhQUFhLEVBQUU7b0JBQ2QsS0FBSyxFQUFFLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDO29CQUMzQyxRQUFRLEVBQUUsaUJBQWlCLENBQUMsSUFBSTtpQkFDaEM7Z0JBQ0QsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxFQUFFLFFBQVEsZ0NBQXdCLEVBQUU7YUFDcEYsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFBO1FBQ0QsTUFBTSxrQkFBa0IsR0FBRyx3QkFBd0IsQ0FDbEQsK0JBQStCLEVBQy9CLCtCQUErQixDQUMvQixDQUFBO1FBQ0QsTUFBTSxlQUFlLEdBQUcsd0JBQXdCLENBQy9DLDRCQUE0QixFQUM1Qiw0QkFBNEIsQ0FDNUIsQ0FBQTtRQUNELE1BQU0saUJBQWlCLEdBQUcsd0JBQXdCLENBQ2pELDhCQUE4QixFQUM5Qiw4QkFBOEIsQ0FDOUIsQ0FBQTtRQUVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNsQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNoQyxNQUFNLG1CQUFtQixHQUE0QixFQUFFLENBQUE7UUFFdkQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFO1lBQ3ZELEtBQUssTUFBTSxFQUFFLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNsQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdEMsQ0FBQztZQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFBO1lBQ3BCLE1BQU0seUJBQXlCLEdBQTRCLEVBQUUsQ0FBQTtZQUM3RCxNQUFNLHlCQUF5QixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMseUJBQXlCLEVBQUUsQ0FBQTtZQUNoRixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFBO1lBQzVELE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQzVELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsWUFBWSxFQUFFLENBQUE7WUFFL0QsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUE7Z0JBQ3hDLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUNoRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLENBQ3JELENBQUE7Z0JBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLENBQzVCLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNyRixFQUFFLEVBQ0YseUJBQXlCLEVBQ3pCLGVBQWUsQ0FDZixDQUFBO2dCQUNELE1BQU0sV0FBVyxHQUF1QixFQUFFLENBQUE7Z0JBRTFDLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ2hCLEtBQUssTUFBTSxDQUFDLElBQUksU0FBUyxDQUFDLFlBQVksSUFBSSxFQUFFLEVBQUUsQ0FBQzt3QkFDOUMsV0FBVyxDQUFDLElBQUksQ0FDZixJQUFJLGdCQUFnQixDQUNuQixDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFDaEUsb0JBQW9CLENBQUMsU0FBVSx1Q0FFL0IsQ0FDRCxDQUFBO3dCQUVELHFJQUFxSTt3QkFDckksSUFDQyxDQUFDLENBQ0EsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUU7NEJBQ3pCLENBQUMsQ0FBQyxhQUFhLENBQUMsZUFBZSxLQUFLLENBQUM7NEJBQ3JDLENBQUMsQ0FBQyxhQUFhLENBQUMsYUFBYSxLQUFLLGVBQWUsQ0FDakQ7NEJBQ0QsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxFQUN6QixDQUFDOzRCQUNGLHlCQUF5QixDQUFDLElBQUksQ0FBQztnQ0FDOUIsS0FBSyxFQUFFLENBQUMsQ0FBQyxhQUFhO2dDQUN0QixPQUFPLEVBQUUscUJBQXFCOzZCQUM5QixDQUFDLENBQUE7d0JBQ0gsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsNEhBQTRIO2dCQUM1SCwwSEFBMEg7Z0JBQzFILE1BQU0sZ0JBQWdCLEdBQ3JCLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQztvQkFDeEIsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7b0JBQzlCLFNBQVMsQ0FBQyxRQUFRLENBQUMsZUFBZSxLQUFLLENBQUMsQ0FBQTtnQkFFekMsSUFDQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTztvQkFDM0IsQ0FBQyxDQUFDLGdCQUFnQixJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxLQUFLLGVBQWUsQ0FBQyxFQUN2RixDQUFDO29CQUNGLHlCQUF5QixDQUFDLElBQUksQ0FBQzt3QkFDOUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUc7d0JBQzdDLE9BQU8sRUFBRSw4QkFBOEI7cUJBQ3ZDLENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUVELElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDaEMsWUFBWTtvQkFDWix5QkFBeUIsQ0FBQyxJQUFJLENBQUM7d0JBQzlCLEtBQUssRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFHO3dCQUM3QyxPQUFPLEVBQUUsZUFBZTtxQkFDeEIsQ0FBQyxDQUFBO2dCQUNILENBQUM7cUJBQU0sSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUN2QyxXQUFXO29CQUNYLHlCQUF5QixDQUFDLElBQUksQ0FBQzt3QkFDOUIsS0FBSyxFQUFFLElBQUksS0FBSyxDQUNmLFNBQVMsQ0FBQyxRQUFRLENBQUMsZUFBZSxHQUFHLENBQUMsRUFDdEMsQ0FBQyxFQUNELFNBQVMsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUNsQyxDQUFDLENBQ0Q7d0JBQ0QsT0FBTyxFQUFFLGlCQUFpQjtxQkFDMUIsQ0FBQyxDQUFBO2dCQUNILENBQUM7cUJBQU0sQ0FBQztvQkFDUCxlQUFlO29CQUNmLHlCQUF5QixDQUFDLElBQUksQ0FBQzt3QkFDOUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUc7d0JBQzdDLE9BQU8sRUFBRSxrQkFBa0I7cUJBQzNCLENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUVELElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ2hCLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQzdDLE9BQU8sQ0FBQyxTQUFTO3dCQUNoQiw0RUFBNEUsQ0FBQTtvQkFDN0UsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFBO29CQUV2RSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQzt3QkFDdkIsTUFBTSxZQUFZLEdBQWM7NEJBQy9CLGVBQWUsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxDQUFDOzRCQUN2RCxhQUFhLEVBQUUsTUFBTSxDQUFDLGFBQWE7NEJBQ25DLE9BQU87NEJBQ1AsT0FBTyxFQUFFLEtBQUssR0FBRyxDQUFDLEVBQUUsc0tBQXNLO3lCQUMxTCxDQUFBO3dCQUVELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO29CQUNuRSxDQUFDO29CQUVELDBDQUEwQztvQkFDMUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO3dCQUM1RCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7d0JBQ3hELE9BQU8sWUFBWSxDQUFDLGNBQWMsQ0FDakMsY0FBYyxFQUNkLElBQUksRUFDSixTQUFTLEVBQ1QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUcsQ0FBQyxZQUFZLEVBQUUsRUFDdkMsSUFBSSxDQUFDLE9BQU8sRUFDWixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUMzQyxDQUFBO29CQUNGLENBQUMsQ0FBQyxDQUFBO29CQUVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQTtvQkFFakQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDbEMsbUJBQW1CLENBQUMsSUFBSSxDQUFDO3dCQUN4QixLQUFLLEVBQ0osU0FBUyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRTs0QkFDckMsSUFBSSxLQUFLLENBQ1IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQ2xDLENBQUMsRUFDRCxTQUFTLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFDbEMsTUFBTSxDQUFDLGdCQUFnQixDQUN2Qjt3QkFDRixPQUFPLEVBQUU7NEJBQ1IsV0FBVyxFQUFFLGtCQUFrQjs0QkFDL0IsVUFBVSw2REFBcUQ7eUJBQy9EO3FCQUNELENBQUMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUMzRCxDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBRTVGLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQzdCLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQzlCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQ2hDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQy9CLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDckYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FDMUIsQ0FBQTtRQUVELE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3JDLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDcEMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDVixDQUFDO1lBQ0QsTUFBTSxHQUFHLEdBQUcsc0JBQXNCLENBQUMsU0FBUyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUM3RixPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxZQUFZLEdBQUcsQ0FBQyxZQUF3QyxFQUFFLEVBQUU7WUFDakUsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ3pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3ZELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssWUFBWSxJQUFJLENBQUMsS0FBSyxXQUFXLENBQUMsQ0FBQTtZQUM1RCxDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FDN0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDYiw0QkFBNEI7WUFDNUIsTUFBTSxHQUFHLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDekMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3JCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzlCLDRCQUE0QjtZQUM1QixJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSw0Q0FBbUMsRUFBRSxDQUFDO2dCQUN0RCxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQTtnQkFDMUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dCQUNsRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDckIsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSw4Q0FBc0MsRUFBRSxDQUFDO2dCQUNoRSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQTtnQkFDNUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3JFLFlBQVksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN6QyxDQUFDO2lCQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUE7Z0JBQzdCLE1BQU0sR0FBRyxHQUFHLHNCQUFzQjtxQkFDaEMsU0FBUyxFQUFFO3FCQUNYLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7Z0JBQ2hELFlBQVksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN6QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3hCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FDN0IsS0FBSyxDQUFDLEdBQUcsQ0FDUixJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUM5QixDQUFDLEdBQUcsRUFBRTtZQUNOLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3ZELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdkMsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNoRCxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNYLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO2dCQUN0QyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNqQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsd0JBQXdCO1FBQ3ZCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCx3QkFBd0I7SUFFeEIsTUFBTSxDQUFDLFdBQW9CO1FBQzFCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0I7YUFDM0MsU0FBUyxFQUFFO2FBQ1gsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXRELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUN0RCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ25DLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFBO1lBQ2xELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9CLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDcEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLElBQWE7UUFDakIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBYTtRQUNyQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVPLE9BQU8sQ0FBQyxJQUFhLEVBQUUsTUFBZTtRQUM3QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQzNDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3JDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0I7YUFDM0MsU0FBUyxFQUFFO2FBQ1gsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXRELElBQUksV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUNyQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLFFBQVEsR0FBVyxDQUFDLENBQUMsQ0FBQTtRQUN6QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1QixJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzlCLE1BQUs7WUFDTixDQUFDO2lCQUFNLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNsRSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQzNCLE1BQUs7WUFDTixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksTUFBTSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsSUFBSSxRQUFRLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDaEUsWUFBWTtZQUNaLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELFFBQVEsR0FBRyxDQUFDLFFBQVEsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQTtRQUUvRCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFM0MsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUMzRixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFcEIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsWUFBWTtJQUVKLGtCQUFrQjtRQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxNQUFNLGVBQWUsR0FDcEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQztZQUN2RSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQzVCLElBQUksYUFBeUMsQ0FBQTtRQUM3QyxJQUFJLGVBQWUsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFBO1FBRXRDLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDNUMsTUFBTSxTQUFTLEdBQW1ELENBQ2pFLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxVQUFVLENBQy9CLEVBQUUsR0FBRyxDQUFBO1lBQ1AsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQyxDQUFBO2dCQUN0RCxJQUFJLFFBQVEsR0FBRyxlQUFlLEVBQUUsQ0FBQztvQkFDaEMsZUFBZSxHQUFHLFFBQVEsQ0FBQTtvQkFDMUIsYUFBYSxHQUFHLE1BQU0sQ0FBQTtnQkFDdkIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxhQUFhLENBQUE7SUFDckIsQ0FBQztJQUVELG1CQUFtQixDQUFDLGFBQXVEO1FBQzFFLGFBQWEsR0FBRyxhQUFhLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDMUQsSUFBSSxhQUFhLFlBQVksY0FBYyxFQUFFLENBQUM7WUFDN0MsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEIsQ0FBQztJQUNGLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxhQUF1RDtRQUMxRSxhQUFhLEdBQUcsYUFBYSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1FBQzFELElBQUksYUFBYSxZQUFZLGNBQWMsRUFBRSxDQUFDO1lBQzdDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2hCLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFnRDtRQUNoRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUMzQyxJQUFJLE1BQU0sWUFBWSxjQUFjLEVBQUUsQ0FBQztZQUN0QyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtZQUM5QyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQ3JFLElBQUksUUFBUSxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZELFNBQVMsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzlDLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLG9DQUEyQixDQUFBO1FBRXRFLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsZ0JBQWdCO1lBQ2hCLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUM7Z0JBQ3BDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVc7Z0JBQ2pDLE9BQU8sRUFBRTtvQkFDUixTQUFTO29CQUNULG1CQUFtQixnRUFBd0Q7aUJBQzNFO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDUCxjQUFjO1lBQ2QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUM5RCxpQkFBaUIsQ0FBQyxjQUFjLENBQ2hDLEVBQUUsUUFBUSxDQUFBO1lBQ1gsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQztnQkFDdkQsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRTtnQkFDbEYsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFO2dCQUN2RSxLQUFLLEVBQUUsZ0JBQWdCO29CQUN0QixDQUFDLENBQUMsUUFBUSxDQUNSLFlBQVksRUFDWix3QkFBd0IsRUFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQ2pDLGdCQUFnQixDQUNoQjtvQkFDRixDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSx5QkFBeUIsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQzthQUN6RixDQUFDLENBQUE7WUFFRixJQUFJLFVBQVUsSUFBSSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3BDLDZEQUE2RDtnQkFDN0QsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFFaEQsMENBQTBDO2dCQUMxQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDdkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUN2QyxJQUFJLEtBQUssMENBQWtDLElBQUksS0FBSywwQ0FBa0MsRUFBRSxDQUFDO3dCQUN4RixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7d0JBRVgsTUFBTSxZQUFZLEdBQXdCLEVBQUUsQ0FBQTt3QkFDNUMsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsMkNBRXJELEVBQUUsQ0FBQzs0QkFDSCxJQUNDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7Z0NBQ25DLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7Z0NBQ3BFLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFDbkUsQ0FBQztnQ0FDRixZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBOzRCQUM3QixDQUFDO3dCQUNGLENBQUM7d0JBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7b0JBQy9DLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7O0FBbnNCVyxnQ0FBZ0M7SUFxQjFDLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLDJCQUEyQixDQUFBO0lBRTNCLFdBQUEscUJBQXFCLENBQUE7R0F6QlgsZ0NBQWdDLENBb3NCNUM7O0FBRUQsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBYzs7YUFDSixZQUFPLEdBQUcsQ0FBQyxBQUFKLENBQUk7SUFRMUIsWUFDa0IsU0FBeUIsRUFDekIsT0FBaUMsRUFDakMsVUFBa0IsRUFDbEIsT0FBb0IsRUFDcEIsVUFBa0IsRUFDWixZQUFtQztRQUx6QyxjQUFTLEdBQVQsU0FBUyxDQUFnQjtRQUN6QixZQUFPLEdBQVAsT0FBTyxDQUEwQjtRQUNqQyxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2xCLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDcEIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQVpuQixRQUFHLEdBQVcsc0JBQXNCLGdCQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQTtRQUc5RCxXQUFNLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQVk5QyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsaUNBQWlDLENBQUE7UUFFM0QsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FDMUMsb0JBQW9CLEVBQ3BCLElBQUksQ0FBQyxRQUFRLEVBQ2IsTUFBTSxDQUFDLHFCQUFxQixFQUM1QjtZQUNDLGVBQWUsRUFBRSx1QkFBdUI7WUFDeEMsa0JBQWtCLG9DQUEyQjtZQUM3QyxjQUFjLEVBQUUsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFO1lBQzVDLFdBQVcsRUFBRTtnQkFDWixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixHQUFHLEVBQUUsSUFBSTthQUNUO1NBQ0QsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDckIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQTtJQUNoQixDQUFDO0lBRUQsTUFBTSxDQUFDLGVBQXVCO1FBQzdCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxrQ0FBeUIsQ0FBQTtRQUNsRSxNQUFNLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxzQkFBc0IsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDMUYsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUU3QyxJQUFJLENBQUMsU0FBUyxHQUFHO1lBQ2hCLGFBQWEsRUFBRSxDQUFDO1lBQ2hCLFVBQVUsRUFBRTtnQkFDWCxHQUFHLEVBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUM7b0JBQ2pELFNBQVM7b0JBQ1QsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVO2dCQUM3QixJQUFJLEVBQ0gsV0FBVyxHQUFHLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxzQkFBc0IsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ3pGO1NBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLGVBQWUsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQWE7UUFDbkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDdkMsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxXQUFXO1FBQ1YsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQTtJQUM5QixDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ2pDLENBQUM7SUFFRCxNQUFNO0lBRU4sS0FBSyxDQUFDLE1BQU07UUFDWCxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDO1lBQ2pFLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE9BQU8sTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNO1FBQ1gsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUNqRSxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN6QyxDQUFDOztBQXZHSSxjQUFjO0lBZWpCLFdBQUEscUJBQXFCLENBQUE7R0FmbEIsY0FBYyxDQXdHbkI7QUFFRCxNQUFNLDJCQUEyQjtJQUdoQztRQUNDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxzQkFBc0IsQ0FBQTtRQUNoRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUE7SUFDMUMsQ0FBQztJQUVELEtBQUs7UUFDSixPQUFPLDhCQUE4QixDQUFBO0lBQ3RDLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxXQUFXO1FBQ1YsT0FBTztZQUNOLFVBQVUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUMvQixhQUFhLEVBQUUsQ0FBQztTQUNoQixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSx5QkFBeUI7SUFDOUIsWUFDa0IsaUJBQThDLEVBQzlDLE9BQW9CO1FBRHBCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBNkI7UUFDOUMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtJQUNuQyxDQUFDO0lBRUosZ0JBQWdCO1FBQ2YsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFBO0lBQ2xELENBQUM7SUFFRCxrQkFBa0I7UUFDakIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFRCxjQUFjLENBQUMsS0FBWTtRQUMxQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFBO1FBQ3BELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzlGLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2QsS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxLQUFLLENBQUE7UUFDMUQsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELGdCQUFnQjtRQUNmLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsY0FBYyxDQUFDLEtBQVk7UUFDMUIsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9CLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pDLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxLQUFZO1FBQ2hDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxhQUFhO1FBQ1osSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNyQixDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsSUFBSSxTQUFTLENBQUE7SUFDL0MsQ0FBQztDQUNEIn0=
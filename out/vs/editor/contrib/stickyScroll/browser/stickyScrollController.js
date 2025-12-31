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
var StickyScrollController_1;
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { StickyScrollWidget, StickyScrollWidgetState } from './stickyScrollWidget.js';
import { StickyLineCandidateProvider, } from './stickyScrollProvider.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ClickLinkGesture, } from '../../gotoSymbol/browser/link/clickLinkGesture.js';
import { Range } from '../../../common/core/range.js';
import { getDefinitionsAtPosition } from '../../gotoSymbol/browser/goToSymbol.js';
import { goToDefinitionWithLocation } from '../../inlayHints/browser/inlayHintsLocations.js';
import { Position } from '../../../common/core/position.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import * as dom from '../../../../base/browser/dom.js';
import { StickyRange } from './stickyScrollElement.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { FoldingController } from '../../folding/browser/folding.js';
import { toggleCollapseState } from '../../folding/browser/foldingModel.js';
import { Emitter } from '../../../../base/common/event.js';
import { mainWindow } from '../../../../base/browser/window.js';
let StickyScrollController = class StickyScrollController extends Disposable {
    static { StickyScrollController_1 = this; }
    static { this.ID = 'store.contrib.stickyScrollController'; }
    constructor(_editor, _contextMenuService, _languageFeaturesService, _instaService, _languageConfigurationService, _languageFeatureDebounceService, _contextKeyService) {
        super();
        this._editor = _editor;
        this._contextMenuService = _contextMenuService;
        this._languageFeaturesService = _languageFeaturesService;
        this._instaService = _instaService;
        this._contextKeyService = _contextKeyService;
        this._sessionStore = new DisposableStore();
        this._maxStickyLines = Number.MAX_SAFE_INTEGER;
        this._candidateDefinitionsLength = -1;
        this._focusedStickyElementIndex = -1;
        this._enabled = false;
        this._focused = false;
        this._positionRevealed = false;
        this._onMouseDown = false;
        this._endLineNumbers = [];
        this._mouseTarget = null;
        this._onDidChangeStickyScrollHeight = this._register(new Emitter());
        this.onDidChangeStickyScrollHeight = this._onDidChangeStickyScrollHeight.event;
        this._stickyScrollWidget = new StickyScrollWidget(this._editor);
        this._stickyLineCandidateProvider = new StickyLineCandidateProvider(this._editor, _languageFeaturesService, _languageConfigurationService);
        this._register(this._stickyScrollWidget);
        this._register(this._stickyLineCandidateProvider);
        this._widgetState = StickyScrollWidgetState.Empty;
        const stickyScrollDomNode = this._stickyScrollWidget.getDomNode();
        this._register(this._editor.onDidChangeConfiguration((e) => {
            this._readConfigurationChange(e);
        }));
        this._register(dom.addDisposableListener(stickyScrollDomNode, dom.EventType.CONTEXT_MENU, async (event) => {
            this._onContextMenu(dom.getWindow(stickyScrollDomNode), event);
        }));
        this._stickyScrollFocusedContextKey = EditorContextKeys.stickyScrollFocused.bindTo(this._contextKeyService);
        this._stickyScrollVisibleContextKey = EditorContextKeys.stickyScrollVisible.bindTo(this._contextKeyService);
        const focusTracker = this._register(dom.trackFocus(stickyScrollDomNode));
        this._register(focusTracker.onDidBlur((_) => {
            // Suppose that the blurring is caused by scrolling, then keep the focus on the sticky scroll
            // This is determined by the fact that the height of the widget has become zero and there has been no position revealing
            if (this._positionRevealed === false && stickyScrollDomNode.clientHeight === 0) {
                this._focusedStickyElementIndex = -1;
                this.focus();
            }
            // In all other casees, dispose the focus on the sticky scroll
            else {
                this._disposeFocusStickyScrollStore();
            }
        }));
        this._register(focusTracker.onDidFocus((_) => {
            this.focus();
        }));
        this._registerMouseListeners();
        // Suppose that mouse down on the sticky scroll, then do not focus on the sticky scroll because this will be followed by the revealing of a position
        this._register(dom.addDisposableListener(stickyScrollDomNode, dom.EventType.MOUSE_DOWN, (e) => {
            this._onMouseDown = true;
        }));
        this._register(this._stickyScrollWidget.onDidChangeStickyScrollHeight((e) => {
            this._onDidChangeStickyScrollHeight.fire(e);
        }));
        this._onDidResize();
        this._readConfiguration();
    }
    get stickyScrollCandidateProvider() {
        return this._stickyLineCandidateProvider;
    }
    get stickyScrollWidgetState() {
        return this._widgetState;
    }
    get stickyScrollWidgetHeight() {
        return this._stickyScrollWidget.height;
    }
    static get(editor) {
        return editor.getContribution(StickyScrollController_1.ID);
    }
    _disposeFocusStickyScrollStore() {
        this._stickyScrollFocusedContextKey.set(false);
        this._focusDisposableStore?.dispose();
        this._focused = false;
        this._positionRevealed = false;
        this._onMouseDown = false;
    }
    isFocused() {
        return this._focused;
    }
    focus() {
        // If the mouse is down, do not focus on the sticky scroll
        if (this._onMouseDown) {
            this._onMouseDown = false;
            this._editor.focus();
            return;
        }
        const focusState = this._stickyScrollFocusedContextKey.get();
        if (focusState === true) {
            return;
        }
        this._focused = true;
        this._focusDisposableStore = new DisposableStore();
        this._stickyScrollFocusedContextKey.set(true);
        this._focusedStickyElementIndex = this._stickyScrollWidget.lineNumbers.length - 1;
        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
    }
    focusNext() {
        if (this._focusedStickyElementIndex < this._stickyScrollWidget.lineNumberCount - 1) {
            this._focusNav(true);
        }
    }
    focusPrevious() {
        if (this._focusedStickyElementIndex > 0) {
            this._focusNav(false);
        }
    }
    selectEditor() {
        this._editor.focus();
    }
    // True is next, false is previous
    _focusNav(direction) {
        this._focusedStickyElementIndex = direction
            ? this._focusedStickyElementIndex + 1
            : this._focusedStickyElementIndex - 1;
        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
    }
    goToFocused() {
        const lineNumbers = this._stickyScrollWidget.lineNumbers;
        this._disposeFocusStickyScrollStore();
        this._revealPosition({ lineNumber: lineNumbers[this._focusedStickyElementIndex], column: 1 });
    }
    _revealPosition(position) {
        this._reveaInEditor(position, () => this._editor.revealPosition(position));
    }
    _revealLineInCenterIfOutsideViewport(position) {
        this._reveaInEditor(position, () => this._editor.revealLineInCenterIfOutsideViewport(position.lineNumber, 0 /* ScrollType.Smooth */));
    }
    _reveaInEditor(position, revealFunction) {
        if (this._focused) {
            this._disposeFocusStickyScrollStore();
        }
        this._positionRevealed = true;
        revealFunction();
        this._editor.setSelection(Range.fromPositions(position));
        this._editor.focus();
    }
    _registerMouseListeners() {
        const sessionStore = this._register(new DisposableStore());
        const gesture = this._register(new ClickLinkGesture(this._editor, {
            extractLineNumberFromMouseEvent: (e) => {
                const position = this._stickyScrollWidget.getEditorPositionFromNode(e.target.element);
                return position ? position.lineNumber : 0;
            },
        }));
        const getMouseEventTarget = (mouseEvent) => {
            if (!this._editor.hasModel()) {
                return null;
            }
            if (mouseEvent.target.type !== 12 /* MouseTargetType.OVERLAY_WIDGET */ ||
                mouseEvent.target.detail !== this._stickyScrollWidget.getId()) {
                // not hovering over our widget
                return null;
            }
            const mouseTargetElement = mouseEvent.target.element;
            if (!mouseTargetElement || mouseTargetElement.innerText !== mouseTargetElement.innerHTML) {
                // not on a span element rendering text
                return null;
            }
            const position = this._stickyScrollWidget.getEditorPositionFromNode(mouseTargetElement);
            if (!position) {
                // not hovering a sticky scroll line
                return null;
            }
            return {
                range: new Range(position.lineNumber, position.column, position.lineNumber, position.column + mouseTargetElement.innerText.length),
                textElement: mouseTargetElement,
            };
        };
        const stickyScrollWidgetDomNode = this._stickyScrollWidget.getDomNode();
        this._register(dom.addStandardDisposableListener(stickyScrollWidgetDomNode, dom.EventType.CLICK, (mouseEvent) => {
            if (mouseEvent.ctrlKey || mouseEvent.altKey || mouseEvent.metaKey) {
                // modifier pressed
                return;
            }
            if (!mouseEvent.leftButton) {
                // not left click
                return;
            }
            if (mouseEvent.shiftKey) {
                // shift click
                const lineIndex = this._stickyScrollWidget.getLineIndexFromChildDomNode(mouseEvent.target);
                if (lineIndex === null) {
                    return;
                }
                const position = new Position(this._endLineNumbers[lineIndex], 1);
                this._revealLineInCenterIfOutsideViewport(position);
                return;
            }
            const isInFoldingIconDomNode = this._stickyScrollWidget.isInFoldingIconDomNode(mouseEvent.target);
            if (isInFoldingIconDomNode) {
                // clicked on folding icon
                const lineNumber = this._stickyScrollWidget.getLineNumberFromChildDomNode(mouseEvent.target);
                this._toggleFoldingRegionForLine(lineNumber);
                return;
            }
            const isInStickyLine = this._stickyScrollWidget.isInStickyLine(mouseEvent.target);
            if (!isInStickyLine) {
                return;
            }
            // normal click
            let position = this._stickyScrollWidget.getEditorPositionFromNode(mouseEvent.target);
            if (!position) {
                const lineNumber = this._stickyScrollWidget.getLineNumberFromChildDomNode(mouseEvent.target);
                if (lineNumber === null) {
                    // not hovering a sticky scroll line
                    return;
                }
                position = new Position(lineNumber, 1);
            }
            this._revealPosition(position);
        }));
        const mouseMoveListener = (mouseEvent) => {
            this._mouseTarget = mouseEvent.target;
            this._onMouseMoveOrKeyDown(mouseEvent);
        };
        const keyDownListener = (mouseEvent) => {
            this._onMouseMoveOrKeyDown(mouseEvent);
        };
        const keyUpListener = (e) => {
            if (this._showEndForLine !== undefined) {
                this._showEndForLine = undefined;
                this._renderStickyScroll();
            }
        };
        mainWindow.addEventListener(dom.EventType.MOUSE_MOVE, mouseMoveListener);
        mainWindow.addEventListener(dom.EventType.KEY_DOWN, keyDownListener);
        mainWindow.addEventListener(dom.EventType.KEY_UP, keyUpListener);
        this._register(toDisposable(() => {
            mainWindow.removeEventListener(dom.EventType.MOUSE_MOVE, mouseMoveListener);
            mainWindow.removeEventListener(dom.EventType.KEY_DOWN, keyDownListener);
            mainWindow.removeEventListener(dom.EventType.KEY_UP, keyUpListener);
        }));
        this._register(gesture.onMouseMoveOrRelevantKeyDown(([mouseEvent, _keyboardEvent]) => {
            const mouseTarget = getMouseEventTarget(mouseEvent);
            if (!mouseTarget || !mouseEvent.hasTriggerModifier || !this._editor.hasModel()) {
                sessionStore.clear();
                return;
            }
            const { range, textElement } = mouseTarget;
            if (!range.equalsRange(this._stickyRangeProjectedOnEditor)) {
                this._stickyRangeProjectedOnEditor = range;
                sessionStore.clear();
            }
            else if (textElement.style.textDecoration === 'underline') {
                return;
            }
            const cancellationToken = new CancellationTokenSource();
            sessionStore.add(toDisposable(() => cancellationToken.dispose(true)));
            let currentHTMLChild;
            getDefinitionsAtPosition(this._languageFeaturesService.definitionProvider, this._editor.getModel(), new Position(range.startLineNumber, range.startColumn + 1), false, cancellationToken.token).then((candidateDefinitions) => {
                if (cancellationToken.token.isCancellationRequested) {
                    return;
                }
                if (candidateDefinitions.length !== 0) {
                    this._candidateDefinitionsLength = candidateDefinitions.length;
                    const childHTML = textElement;
                    if (currentHTMLChild !== childHTML) {
                        sessionStore.clear();
                        currentHTMLChild = childHTML;
                        currentHTMLChild.style.textDecoration = 'underline';
                        sessionStore.add(toDisposable(() => {
                            currentHTMLChild.style.textDecoration = 'none';
                        }));
                    }
                    else if (!currentHTMLChild) {
                        currentHTMLChild = childHTML;
                        currentHTMLChild.style.textDecoration = 'underline';
                        sessionStore.add(toDisposable(() => {
                            currentHTMLChild.style.textDecoration = 'none';
                        }));
                    }
                }
                else {
                    sessionStore.clear();
                }
            });
        }));
        this._register(gesture.onCancel(() => {
            sessionStore.clear();
        }));
        this._register(gesture.onExecute(async (e) => {
            if (e.target.type !== 12 /* MouseTargetType.OVERLAY_WIDGET */ ||
                e.target.detail !== this._stickyScrollWidget.getId()) {
                // not hovering over our widget
                return;
            }
            const position = this._stickyScrollWidget.getEditorPositionFromNode(e.target.element);
            if (!position) {
                // not hovering a sticky scroll line
                return;
            }
            if (!this._editor.hasModel() || !this._stickyRangeProjectedOnEditor) {
                return;
            }
            if (this._candidateDefinitionsLength > 1) {
                if (this._focused) {
                    this._disposeFocusStickyScrollStore();
                }
                this._revealPosition({ lineNumber: position.lineNumber, column: 1 });
            }
            this._instaService.invokeFunction(goToDefinitionWithLocation, e, this._editor, { uri: this._editor.getModel().uri, range: this._stickyRangeProjectedOnEditor });
        }));
    }
    _onContextMenu(targetWindow, e) {
        const event = new StandardMouseEvent(targetWindow, e);
        this._contextMenuService.showContextMenu({
            menuId: MenuId.StickyScrollContext,
            getAnchor: () => event,
        });
    }
    _onMouseMoveOrKeyDown(mouseEvent) {
        if (!mouseEvent.shiftKey) {
            return;
        }
        if (!this._mouseTarget || !dom.isHTMLElement(this._mouseTarget)) {
            return;
        }
        const currentEndForLineIndex = this._stickyScrollWidget.getLineIndexFromChildDomNode(this._mouseTarget);
        if (currentEndForLineIndex === null || this._showEndForLine === currentEndForLineIndex) {
            return;
        }
        this._showEndForLine = currentEndForLineIndex;
        this._renderStickyScroll();
    }
    _toggleFoldingRegionForLine(line) {
        if (!this._foldingModel || line === null) {
            return;
        }
        const stickyLine = this._stickyScrollWidget.getRenderedStickyLine(line);
        const foldingIcon = stickyLine?.foldingIcon;
        if (!foldingIcon) {
            return;
        }
        toggleCollapseState(this._foldingModel, 1, [line]);
        foldingIcon.isCollapsed = !foldingIcon.isCollapsed;
        const scrollTop = (foldingIcon.isCollapsed
            ? this._editor.getTopForLineNumber(foldingIcon.foldingEndLine)
            : this._editor.getTopForLineNumber(foldingIcon.foldingStartLine)) -
            this._editor.getOption(68 /* EditorOption.lineHeight */) * stickyLine.index +
            1;
        this._editor.setScrollTop(scrollTop);
        this._renderStickyScroll(line);
    }
    _readConfiguration() {
        const options = this._editor.getOption(120 /* EditorOption.stickyScroll */);
        if (options.enabled === false) {
            this._editor.removeOverlayWidget(this._stickyScrollWidget);
            this._resetState();
            this._sessionStore.clear();
            this._enabled = false;
            return;
        }
        else if (options.enabled && !this._enabled) {
            // When sticky scroll was just enabled, add the listeners on the sticky scroll
            this._editor.addOverlayWidget(this._stickyScrollWidget);
            this._sessionStore.add(this._editor.onDidScrollChange((e) => {
                if (e.scrollTopChanged) {
                    this._showEndForLine = undefined;
                    this._renderStickyScroll();
                }
            }));
            this._sessionStore.add(this._editor.onDidLayoutChange(() => this._onDidResize()));
            this._sessionStore.add(this._editor.onDidChangeModelTokens((e) => this._onTokensChange(e)));
            this._sessionStore.add(this._stickyLineCandidateProvider.onDidChangeStickyScroll(() => {
                this._showEndForLine = undefined;
                this._renderStickyScroll();
            }));
            this._enabled = true;
        }
        const lineNumberOption = this._editor.getOption(69 /* EditorOption.lineNumbers */);
        if (lineNumberOption.renderType === 2 /* RenderLineNumbersType.Relative */) {
            this._sessionStore.add(this._editor.onDidChangeCursorPosition(() => {
                this._showEndForLine = undefined;
                this._renderStickyScroll(0);
            }));
        }
    }
    _readConfigurationChange(event) {
        if (event.hasChanged(120 /* EditorOption.stickyScroll */) ||
            event.hasChanged(74 /* EditorOption.minimap */) ||
            event.hasChanged(68 /* EditorOption.lineHeight */) ||
            event.hasChanged(115 /* EditorOption.showFoldingControls */) ||
            event.hasChanged(69 /* EditorOption.lineNumbers */)) {
            this._readConfiguration();
        }
        if (event.hasChanged(69 /* EditorOption.lineNumbers */) ||
            event.hasChanged(45 /* EditorOption.folding */) ||
            event.hasChanged(115 /* EditorOption.showFoldingControls */)) {
            this._renderStickyScroll(0);
        }
    }
    _needsUpdate(event) {
        const stickyLineNumbers = this._stickyScrollWidget.getCurrentLines();
        for (const stickyLineNumber of stickyLineNumbers) {
            for (const range of event.ranges) {
                if (stickyLineNumber >= range.fromLineNumber && stickyLineNumber <= range.toLineNumber) {
                    return true;
                }
            }
        }
        return false;
    }
    _onTokensChange(event) {
        if (this._needsUpdate(event)) {
            // Rebuilding the whole widget from line 0
            this._renderStickyScroll(0);
        }
    }
    _onDidResize() {
        const layoutInfo = this._editor.getLayoutInfo();
        // Make sure sticky scroll doesn't take up more than 25% of the editor
        const theoreticalLines = layoutInfo.height / this._editor.getOption(68 /* EditorOption.lineHeight */);
        this._maxStickyLines = Math.round(theoreticalLines * 0.25);
        this._renderStickyScroll(0);
    }
    async _renderStickyScroll(rebuildFromLine) {
        const model = this._editor.getModel();
        if (!model || model.isTooLargeForTokenization()) {
            this._resetState();
            return;
        }
        const nextRebuildFromLine = this._updateAndGetMinRebuildFromLine(rebuildFromLine);
        const stickyWidgetVersion = this._stickyLineCandidateProvider.getVersionId();
        const shouldUpdateState = stickyWidgetVersion === undefined || stickyWidgetVersion === model.getVersionId();
        if (shouldUpdateState) {
            if (!this._focused) {
                await this._updateState(nextRebuildFromLine);
            }
            else {
                // Suppose that previously the sticky scroll widget had height 0, then if there are visible lines, set the last line as focused
                if (this._focusedStickyElementIndex === -1) {
                    await this._updateState(nextRebuildFromLine);
                    this._focusedStickyElementIndex = this._stickyScrollWidget.lineNumberCount - 1;
                    if (this._focusedStickyElementIndex !== -1) {
                        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
                    }
                }
                else {
                    const focusedStickyElementLineNumber = this._stickyScrollWidget.lineNumbers[this._focusedStickyElementIndex];
                    await this._updateState(nextRebuildFromLine);
                    // Suppose that after setting the state, there are no sticky lines, set the focused index to -1
                    if (this._stickyScrollWidget.lineNumberCount === 0) {
                        this._focusedStickyElementIndex = -1;
                    }
                    else {
                        const previousFocusedLineNumberExists = this._stickyScrollWidget.lineNumbers.includes(focusedStickyElementLineNumber);
                        // If the line number is still there, do not change anything
                        // If the line number is not there, set the new focused line to be the last line
                        if (!previousFocusedLineNumberExists) {
                            this._focusedStickyElementIndex = this._stickyScrollWidget.lineNumberCount - 1;
                        }
                        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
                    }
                }
            }
        }
    }
    _updateAndGetMinRebuildFromLine(rebuildFromLine) {
        if (rebuildFromLine !== undefined) {
            const minRebuildFromLineOrInfinity = this._minRebuildFromLine !== undefined ? this._minRebuildFromLine : Infinity;
            this._minRebuildFromLine = Math.min(rebuildFromLine, minRebuildFromLineOrInfinity);
        }
        return this._minRebuildFromLine;
    }
    async _updateState(rebuildFromLine) {
        this._minRebuildFromLine = undefined;
        this._foldingModel = (await FoldingController.get(this._editor)?.getFoldingModel()) ?? undefined;
        this._widgetState = this.findScrollWidgetState();
        const stickyWidgetHasLines = this._widgetState.startLineNumbers.length > 0;
        this._stickyScrollVisibleContextKey.set(stickyWidgetHasLines);
        this._stickyScrollWidget.setState(this._widgetState, this._foldingModel, rebuildFromLine);
    }
    async _resetState() {
        this._minRebuildFromLine = undefined;
        this._foldingModel = undefined;
        this._widgetState = StickyScrollWidgetState.Empty;
        this._stickyScrollVisibleContextKey.set(false);
        this._stickyScrollWidget.setState(undefined, undefined);
    }
    findScrollWidgetState() {
        if (!this._editor.hasModel()) {
            return StickyScrollWidgetState.Empty;
        }
        const textModel = this._editor.getModel();
        const maxNumberStickyLines = Math.min(this._maxStickyLines, this._editor.getOption(120 /* EditorOption.stickyScroll */).maxLineCount);
        const scrollTop = this._editor.getScrollTop();
        let lastLineRelativePosition = 0;
        const startLineNumbers = [];
        const endLineNumbers = [];
        const arrayVisibleRanges = this._editor.getVisibleRanges();
        if (arrayVisibleRanges.length !== 0) {
            const fullVisibleRange = new StickyRange(arrayVisibleRanges[0].startLineNumber, arrayVisibleRanges[arrayVisibleRanges.length - 1].endLineNumber);
            const candidateRanges = this._stickyLineCandidateProvider.getCandidateStickyLinesIntersecting(fullVisibleRange);
            for (const range of candidateRanges) {
                const start = range.startLineNumber;
                const end = range.endLineNumber;
                const isValidRange = textModel.isValidRange({
                    startLineNumber: start,
                    endLineNumber: end,
                    startColumn: 1,
                    endColumn: 1,
                });
                if (isValidRange && end - start > 0) {
                    const topOfElement = range.top;
                    const bottomOfElement = topOfElement + range.height;
                    const topOfBeginningLine = this._editor.getTopForLineNumber(start) - scrollTop;
                    const bottomOfEndLine = this._editor.getBottomForLineNumber(end) - scrollTop;
                    if (topOfElement > topOfBeginningLine && topOfElement <= bottomOfEndLine) {
                        startLineNumbers.push(start);
                        endLineNumbers.push(end + 1);
                        if (bottomOfElement > bottomOfEndLine) {
                            lastLineRelativePosition = bottomOfEndLine - bottomOfElement;
                        }
                    }
                    if (startLineNumbers.length === maxNumberStickyLines) {
                        break;
                    }
                }
            }
        }
        this._endLineNumbers = endLineNumbers;
        return new StickyScrollWidgetState(startLineNumbers, endLineNumbers, lastLineRelativePosition, this._showEndForLine);
    }
    dispose() {
        super.dispose();
        this._sessionStore.dispose();
    }
};
StickyScrollController = StickyScrollController_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, ILanguageFeaturesService),
    __param(3, IInstantiationService),
    __param(4, ILanguageConfigurationService),
    __param(5, ILanguageFeatureDebounceService),
    __param(6, IContextKeyService)
], StickyScrollController);
export { StickyScrollController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N0aWNreVNjcm9sbC9icm93c2VyL3N0aWNreVNjcm9sbENvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBTXZGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JGLE9BQU8sRUFFTiwyQkFBMkIsR0FDM0IsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdkUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDN0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDakYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDNUYsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3RFLE9B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
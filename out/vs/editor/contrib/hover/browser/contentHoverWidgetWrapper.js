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
import * as dom from '../../../../base/browser/dom.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { TokenizationRegistry } from '../../../common/languages.js';
import { HoverOperation } from './hoverOperation.js';
import { HoverParticipantRegistry, HoverRangeAnchor, } from './hoverTypes.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ContentHoverWidget } from './contentHoverWidget.js';
import { ContentHoverComputer } from './contentHoverComputer.js';
import { ContentHoverResult } from './contentHoverTypes.js';
import { Emitter } from '../../../../base/common/event.js';
import { RenderedContentHover } from './contentHoverRendered.js';
import { isMousePositionWithinElement } from './hoverUtils.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let ContentHoverWidgetWrapper = class ContentHoverWidgetWrapper extends Disposable {
    constructor(_editor, _instantiationService, _keybindingService, _hoverService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._currentResult = null;
        this._renderedContentHover = this._register(new MutableDisposable());
        this._onContentsChanged = this._register(new Emitter());
        this.onContentsChanged = this._onContentsChanged.event;
        this._contentHoverWidget = this._register(this._instantiationService.createInstance(ContentHoverWidget, this._editor));
        this._participants = this._initializeHoverParticipants();
        this._hoverOperation = this._register(new HoverOperation(this._editor, new ContentHoverComputer(this._editor, this._participants)));
        this._registerListeners();
    }
    _initializeHoverParticipants() {
        const participants = [];
        for (const participant of HoverParticipantRegistry.getAll()) {
            const participantInstance = this._instantiationService.createInstance(participant, this._editor);
            participants.push(participantInstance);
        }
        participants.sort((p1, p2) => p1.hoverOrdinal - p2.hoverOrdinal);
        this._register(this._contentHoverWidget.onDidResize(() => {
            this._participants.forEach((participant) => participant.handleResize?.());
        }));
        this._register(this._contentHoverWidget.onDidScroll((e) => {
            this._participants.forEach((participant) => participant.handleScroll?.(e));
        }));
        return participants;
    }
    _registerListeners() {
        this._register(this._hoverOperation.onResult((result) => {
            const messages = result.hasLoadingMessage ? this._addLoadingMessage(result) : result.value;
            this._withResult(new ContentHoverResult(messages, result.isComplete, result.options));
        }));
        const contentHoverWidgetNode = this._contentHoverWidget.getDomNode();
        this._register(dom.addStandardDisposableListener(contentHoverWidgetNode, 'keydown', (e) => {
            if (e.equals(9 /* KeyCode.Escape */)) {
                this.hide();
            }
        }));
        this._register(dom.addStandardDisposableListener(contentHoverWidgetNode, 'mouseleave', (e) => {
            this._onMouseLeave(e);
        }));
        this._register(TokenizationRegistry.onDidChange(() => {
            if (this._contentHoverWidget.position && this._currentResult) {
                this._setCurrentResult(this._currentResult); // render again
            }
        }));
    }
    /**
     * Returns true if the hover shows now or will show.
     */
    _startShowingOrUpdateHover(anchor, mode, source, focus, mouseEvent) {
        const contentHoverIsVisible = this._contentHoverWidget.position && this._currentResult;
        if (!contentHoverIsVisible) {
            if (anchor) {
                this._startHoverOperationIfNecessary(anchor, mode, source, focus, false);
                return true;
            }
            return false;
        }
        const isHoverSticky = this._editor.getOption(62 /* EditorOption.hover */).sticky;
        const isMouseGettingCloser = mouseEvent &&
            this._contentHoverWidget.isMouseGettingCloser(mouseEvent.event.posx, mouseEvent.event.posy);
        const isHoverStickyAndIsMouseGettingCloser = isHoverSticky && isMouseGettingCloser;
        // The mouse is getting closer to the hover, so we will keep the hover untouched
        // But we will kick off a hover update at the new anchor, insisting on keeping the hover visible.
        if (isHoverStickyAndIsMouseGettingCloser) {
            if (anchor) {
                this._startHoverOperationIfNecessary(anchor, mode, source, focus, true);
            }
            return true;
        }
        // If mouse is not getting closer and anchor not defined, hide the hover
        if (!anchor) {
            this._setCurrentResult(null);
            return false;
        }
        // If mouse if not getting closer and anchor is defined, and the new anchor is the same as the previous anchor
        const currentAnchorEqualsPreviousAnchor = this._currentResult && this._currentResult.options.anchor.equals(anchor);
        if (currentAnchorEqualsPreviousAnchor) {
            return true;
        }
        // If mouse if not getting closer and anchor is defined, and the new anchor is not compatible with the previous anchor
        const currentAnchorCompatibleWithPreviousAnchor = this._currentResult &&
            anchor.canAdoptVisibleHover(this._currentResult.options.anchor, this._contentHoverWidget.position);
        if (!currentAnchorCompatibleWithPreviousAnchor) {
            this._setCurrentResult(null);
            this._startHoverOperationIfNecessary(anchor, mode, source, focus, false);
            return true;
        }
        // We aren't getting any closer to the hover, so we will filter existing results
        // and keep those which also apply to the new anchor.
        if (this._currentResult) {
            this._setCurrentResult(this._currentResult.filter(anchor));
        }
        this._startHoverOperationIfNecessary(anchor, mode, source, focus, false);
        return true;
    }
    _startHoverOperationIfNecessary(anchor, mode, source, shouldFocus, insistOnKeepingHoverVisible) {
        const currentAnchorEqualToPreviousHover = this._hoverOperation.options && this._hoverOperation.options.anchor.equals(anchor);
        if (currentAnchorEqualToPreviousHover) {
            return;
        }
        this._hoverOperation.cancel();
        const contentHoverComputerOptions = {
            anchor,
            source,
            shouldFocus,
            insistOnKeepingHoverVisible,
        };
        this._hoverOperation.start(mode, contentHoverComputerOptions);
    }
    _setCurrentResult(hoverResult) {
        let currentHoverResult = hoverResult;
        const currentResultEqualToPreviousResult = this._currentResult === currentHoverResult;
        if (currentResultEqualToPreviousResult) {
            return;
        }
        const currentHoverResultIsEmpty = currentHoverResult && currentHoverResult.hoverParts.length === 0;
        if (currentHoverResultIsEmpty) {
            currentHoverResult = null;
        }
        this._currentResult = currentHoverResult;
        if (this._currentResult) {
            this._showHover(this._currentResult);
        }
        else {
            this._hideHover();
        }
    }
    _addLoadingMessage(hoverResult) {
        for (const participant of this._participants) {
            if (!participant.createLoadingMessage) {
                continue;
            }
            const loadingMessage = participant.createLoadingMessage(hoverResult.options.anchor);
            if (!loadingMessage) {
                continue;
            }
            return hoverResult.value.slice(0).concat([loadingMessage]);
        }
        return hoverResult.value;
    }
    _withResult(hoverResult) {
        const previousHoverIsVisibleWithCompleteResult = this._contentHoverWidget.position && this._currentResult && this._currentResult.isComplete;
        if (!previousHoverIsVisibleWithCompleteResult) {
            this._setCurrentResult(hoverResult);
        }
        // The hover is visible with a previous complete result.
        const isCurrentHoverResultComplete = hoverResult.isComplete;
        if (!isCurrentHoverResultComplete) {
            // Instead of rendering the new partial result, we wait for the result to be complete.
            return;
        }
        const currentHoverResultIsEmpty = hoverResult.hoverParts.length === 0;
        const insistOnKeepingPreviousHoverVisible = hoverResult.options.insistOnKeepingHoverVisible;
        const shouldKeepPreviousHoverVisible = currentHoverResultIsEmpty && insistOnKeepingPreviousHoverVisible;
        if (shouldKeepPreviousHoverVisible) {
            // The hover would now hide normally, so we'll keep the previous messages
            return;
        }
        this._setCurrentResult(hoverResult);
    }
    _showHover(hoverResult) {
        const context = this._getHoverContext();
        this._renderedContentHover.value = new RenderedContentHover(this._editor, hoverResult, this._participants, context, this._keybindingService, this._hoverService);
        if (this._renderedContentHover.value.domNodeHasChildren) {
            this._contentHoverWidget.show(this._renderedContentHover.value);
        }
        else {
            this._renderedContentHover.clear();
        }
    }
    _hideHover() {
        this._contentHoverWidget.hide();
        this._participants.forEach((participant) => participant.handleHide?.());
    }
    _getHoverContext() {
        const hide = () => {
            this.hide();
        };
        const onContentsChanged = () => {
            this._onContentsChanged.fire();
            this._contentHoverWidget.onContentsChanged();
        };
        const setMinimumDimensions = (dimensions) => {
            this._contentHoverWidget.setMinimumDimensions(dimensions);
        };
        const focus = () => this.focus();
        return { hide, onContentsChanged, setMinimumDimensions, focus };
    }
    showsOrWillShow(mouseEvent) {
        const isContentWidgetResizing = this._contentHoverWidget.isResizing;
        if (isContentWidgetResizing) {
            return true;
        }
        const anchorCandidates = this._findHoverAnchorCandidates(mouseEvent);
        const anchorCandidatesExist = anchorCandidates.length > 0;
        if (!anchorCandidatesExist) {
            return this._startShowingOrUpdateHover(null, 0 /* HoverStartMode.Delayed */, 0 /* HoverStartSource.Mouse */, false, mouseEvent);
        }
        const anchor = anchorCandidates[0];
        return this._startShowingOrUpdateHover(anchor, 0 /* HoverStartMode.Delayed */, 0 /* HoverStartSource.Mouse */, false, mouseEvent);
    }
    _findHoverAnchorCandidates(mouseEvent) {
        const anchorCandidates = [];
        for (const participant of this._participants) {
            if (!participant.suggestHoverAnchor) {
                continue;
            }
            const anchor = participant.suggestHoverAnchor(mouseEvent);
            if (!anchor) {
                continue;
            }
            anchorCandidates.push(anchor);
        }
        const target = mouseEvent.target;
        switch (target.type) {
            case 6 /* MouseTargetType.CONTENT_TEXT */: {
                anchorCandidates.push(new HoverRangeAnchor(0, target.range, mouseEvent.event.posx, mouseEvent.event.posy));
                break;
            }
            case 7 /* MouseTargetType.CONTENT_EMPTY */: {
                const epsilon = this._editor.getOption(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth / 2;
                // Let hover kick in even when the mouse is technically in the empty area after a line, given the distance is small enough
                const mouseIsWithinLinesAndCloseToHover = !target.detail.isAfterLines &&
                    typeof target.detail.horizontalDistanceToText === 'number' &&
                    target.detail.horizontalDistanceToText < epsilon;
                if (!mouseIsWithinLinesAndCloseToHover) {
                    break;
                }
                anchorCandidates.push(new HoverRangeAnchor(0, target.range, mouseEvent.event.posx, mouseEvent.event.posy));
                break;
            }
        }
        anchorCandidates.sort((a, b) => b.priority - a.priority);
        return anchorCandidates;
    }
    _onMouseLeave(e) {
        const editorDomNode = this._editor.getDomNode();
        const isMousePositionOutsideOfEditor = !editorDomNode || !isMousePositionWithinElement(editorDomNode, e.x, e.y);
        if (isMousePositionOutsideOfEditor) {
            this.hide();
        }
    }
    startShowingAtRange(range, mode, source, focus) {
        this._startShowingOrUpdateHover(new HoverRangeAnchor(0, range, undefined, undefined), mode, source, focus, null);
    }
    getWidgetContent() {
        const node = this._contentHoverWidget.getDomNode();
        if (!node.textContent) {
            return undefined;
        }
        return node.textContent;
    }
    async updateHoverVerbosityLevel(action, index, focus) {
        this._renderedContentHover.value?.updateHoverVerbosityLevel(action, index, focus);
    }
    doesHoverAtIndexSupportVerbosityAction(index, action) {
        return (this._renderedContentHover.value?.doesHoverAtIndexSupportVerbosityAction(index, action) ??
            false);
    }
    getAccessibleWidgetContent() {
        return this._renderedContentHover.value?.getAccessibleWidgetContent();
    }
    getAccessibleWidgetContentAtIndex(index) {
        return this._renderedContentHover.value?.getAccessibleWidgetContentAtIndex(index);
    }
    focusedHoverPartIndex() {
        return this._renderedContentHover.value?.focusedHoverPartIndex ?? -1;
    }
    containsNode(node) {
        return node ? this._contentHoverWidget.getDomNode().contains(node) : false;
    }
    focus() {
        const hoverPartsCount = this._renderedContentHover.value?.hoverPartsCount;
        if (hoverPartsCount === 1) {
            this.focusHoverPartWithIndex(0);
            return;
        }
        this._contentHoverWidget.focus();
    }
    focusHoverPartWithIndex(index) {
        this._renderedContentHover.value?.focusHoverPartWithIndex(index);
    }
    scrollUp() {
        this._contentHoverWidget.scrollUp();
    }
    scrollDown() {
        this._contentHoverWidget.scrollDown();
    }
    scrollLeft() {
        this._contentHoverWidget.scrollLeft();
    }
    scrollRight() {
        this._contentHoverWidget.scrollRight();
    }
    pageUp() {
        this._contentHoverWidget.pageUp();
    }
    pageDown() {
        this._contentHoverWidget.pageDown();
    }
    goToTop() {
        this._contentHoverWidget.goToTop();
    }
    goToBottom() {
        this._contentHoverWidget.goToBottom();
    }
    hide() {
        this._hoverOperation.cancel();
        this._setCurrentResult(null);
    }
    getDomNode() {
        return this._contentHoverWidget.getDomNode();
    }
    get isColorPickerVisible() {
        return this._renderedContentHover.value?.isColorPickerVisible() ?? false;
    }
    get isVisibleFromKeyboard() {
        return this._contentHoverWidget.isVisibleFromKeyboard;
    }
    get isVisible() {
        return this._contentHoverWidget.isVisible;
    }
    get isFocused() {
        return this._contentHoverWidget.isFocused;
    }
    get isResizing() {
        return this._contentHoverWidget.isResizing;
    }
    get widget() {
        return this._contentHoverWidget;
    }
};
ContentHoverWidgetWrapper = __decorate([
    __param(1, IInstantiationService),
    __param(2, IKeybindingService),
    __param(3, IHoverService)
], ContentHoverWidgetWrapper);
export { ContentHoverWidgetWrapper };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyV2lkZ2V0V3JhcHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvY29udGVudEhvdmVyV2lkZ2V0V3JhcHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUlwRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFpRCxNQUFNLHFCQUFxQixDQUFBO0FBQ25HLE9BQU8sRUFFTix3QkFBd0IsRUFDeEIsZ0JBQWdCLEdBS2hCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLG9CQUFvQixFQUErQixNQUFNLDJCQUEyQixDQUFBO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFcEUsSUFBTSx5QkFBeUIsR0FBL0Is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
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
var ContentHoverController_1;
import { DECREASE_HOVER_VERBOSITY_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_ID, SHOW_OR_FOCUS_HOVER_ACTION_ID, } from './hoverActionIds.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { InlineSuggestionHintsContentWidget } from '../../inlineCompletions/browser/hintsWidget/inlineCompletionsHintsWidget.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { isMousePositionWithinElement } from './hoverUtils.js';
import { ContentHoverWidgetWrapper } from './contentHoverWidgetWrapper.js';
import './hover.css';
import { Emitter } from '../../../../base/common/event.js';
import { isOnColorDecorator } from '../../colorPicker/browser/hoverColorPicker/hoverColorPicker.js';
// sticky hover widget which doesn't disappear on focus out and such
const _sticky = false;
let ContentHoverController = class ContentHoverController extends Disposable {
    static { ContentHoverController_1 = this; }
    static { this.ID = 'editor.contrib.contentHover'; }
    constructor(_editor, _instantiationService, _keybindingService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._keybindingService = _keybindingService;
        this._onHoverContentsChanged = this._register(new Emitter());
        this.onHoverContentsChanged = this._onHoverContentsChanged.event;
        this.shouldKeepOpenOnEditorMouseMoveOrLeave = false;
        this._listenersStore = new DisposableStore();
        this._isMouseDown = false;
        this._reactToEditorMouseMoveRunner = this._register(new RunOnceScheduler(() => {
            if (this._mouseMoveEvent) {
                this._reactToEditorMouseMove(this._mouseMoveEvent);
            }
        }, 0));
        this._hookListeners();
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(62 /* EditorOption.hover */)) {
                this._unhookListeners();
                this._hookListeners();
            }
        }));
    }
    static get(editor) {
        return editor.getContribution(ContentHoverController_1.ID);
    }
    _hookListeners() {
        const hoverOpts = this._editor.getOption(62 /* EditorOption.hover */);
        this._hoverSettings = {
            enabled: hoverOpts.enabled,
            sticky: hoverOpts.sticky,
            hidingDelay: hoverOpts.hidingDelay,
        };
        if (!hoverOpts.enabled) {
            this._cancelSchedulerAndHide();
        }
        this._listenersStore.add(this._editor.onMouseDown((e) => this._onEditorMouseDown(e)));
        this._listenersStore.add(this._editor.onMouseUp(() => this._onEditorMouseUp()));
        this._listenersStore.add(this._editor.onMouseMove((e) => this._onEditorMouseMove(e)));
        this._listenersStore.add(this._editor.onKeyDown((e) => this._onKeyDown(e)));
        this._listenersStore.add(this._editor.onMouseLeave((e) => this._onEditorMouseLeave(e)));
        this._listenersStore.add(this._editor.onDidChangeModel(() => this._cancelSchedulerAndHide()));
        this._listenersStore.add(this._editor.onDidChangeModelContent(() => this._cancelScheduler()));
        this._listenersStore.add(this._editor.onDidScrollChange((e) => this._onEditorScrollChanged(e)));
    }
    _unhookListeners() {
        this._listenersStore.clear();
    }
    _cancelSchedulerAndHide() {
        this._cancelScheduler();
        this.hideContentHover();
    }
    _cancelScheduler() {
        this._mouseMoveEvent = undefined;
        this._reactToEditorMouseMoveRunner.cancel();
    }
    _onEditorScrollChanged(e) {
        if (e.scrollTopChanged || e.scrollLeftChanged) {
            this.hideContentHover();
        }
    }
    _onEditorMouseDown(mouseEvent) {
        this._isMouseDown = true;
        const shouldKeepHoverWidgetVisible = this._shouldKeepHoverWidgetVisible(mouseEvent);
        if (shouldKeepHoverWidgetVisible) {
            return;
        }
        this.hideContentHover();
    }
    _shouldKeepHoverWidgetVisible(mouseEvent) {
        return (this._isMouseOnContentHoverWidget(mouseEvent) ||
            this._isContentWidgetResizing() ||
            isOnColorDecorator(mouseEvent));
    }
    _isMouseOnContentHoverWidget(mouseEvent) {
        if (!this._contentWidget) {
            return false;
        }
        return isMousePositionWithinElement(this._contentWidget.getDomNode(), mouseEvent.event.posx, mouseEvent.event.posy);
    }
    _onEditorMouseUp() {
        this._isMouseDown = false;
    }
    _onEditorMouseLeave(mouseEvent) {
        if (this.shouldKeepOpenOnEditorMouseMoveOrLeave) {
            return;
        }
        this._cancelScheduler();
        const shouldKeepHoverWidgetVisible = this._shouldKeepHoverWidgetVisible(mouseEvent);
        if (shouldKeepHoverWidgetVisible) {
            return;
        }
        if (_sticky) {
            return;
        }
        this.hideContentHover();
    }
    _shouldKeepCurrentHover(mouseEvent) {
        const contentWidget = this._contentWidget;
        if (!contentWidget) {
            return false;
        }
        const isHoverSticky = this._hoverSettings.sticky;
        const isMouseOnStickyContentHoverWidget = (mouseEvent, isHoverSticky) => {
            const isMouseOnContentHoverWidget = this._isMouseOnContentHoverWidget(mouseEvent);
            return isHoverSticky && isMouseOnContentHoverWidget;
        };
        const isMouseOnColorPickerOrChoosingColor = (mouseEvent) => {
            const isColorPickerVisible = contentWidget.isColorPickerVisible;
            const isMouseOnContentHoverWidget = this._isMouseOnContentHoverWidget(mouseEvent);
            const isMouseOnHoverWithColorPicker = isColorPickerVisible && isMouseOnContentHoverWidget;
            const isMaybeChoosingColor = isColorPickerVisible && this._isMouseDown;
            return isMouseOnHoverWithColorPicker || isMaybeChoosingColor;
        };
        // TODO@aiday-mar verify if the following is necessary code
        const isTextSelectedWithinContentHoverWidget = (mouseEvent, sticky) => {
            const view = mouseEvent.event.browserEvent.view;
            if (!view) {
                return false;
            }
            return (sticky &&
                contentWidget.containsNode(view.document.activeElement) &&
                !view.getSelection()?.isCollapsed);
        };
        const isFocused = contentWidget.isFocused;
        const isResizing = contentWidget.isResizing;
        const isStickyAndVisibleFromKeyboard = this._hoverSettings.sticky && contentWidget.isVisibleFromKeyboard;
        return (this.shouldKeepOpenOnEditorMouseMoveOrLeave ||
            isFocused ||
            isResizing ||
            isStickyAndVisibleFromKeyboard ||
            isMouseOnStickyContentHoverWidget(mouseEvent, isHoverSticky) ||
            isMouseOnColorPickerOrChoosingColor(mouseEvent) ||
            isTextSelectedWithinContentHoverWidget(mouseEvent, isHoverSticky));
    }
    _onEditorMouseMove(mouseEvent) {
        this._mouseMoveEvent = mouseEvent;
        const shouldKeepCurrentHover = this._shouldKeepCurrentHover(mouseEvent);
        if (shouldKeepCurrentHover) {
            this._reactToEditorMouseMoveRunner.cancel();
            return;
        }
        const shouldRescheduleHoverComputation = this._shouldRescheduleHoverComputation();
        if (shouldRescheduleHoverComputation) {
            if (!this._reactToEditorMouseMoveRunner.isScheduled()) {
                this._reactToEditorMouseMoveRunner.schedule(this._hoverSettings.hidingDelay);
            }
            return;
        }
        this._reactToEditorMouseMove(mouseEvent);
    }
    _shouldRescheduleHoverComputation() {
        const hidingDelay = this._hoverSettings.hidingDelay;
        const isContentHoverWidgetVisible = this._contentWidget?.isVisible ?? false;
        // If the mouse is not over the widget, and if sticky is on,
        // then give it a grace period before reacting to the mouse event
        return isContentHoverWidgetVisible && this._hoverSettings.sticky && hidingDelay > 0;
    }
    _reactToEditorMouseMove(mouseEvent) {
        if (this._hoverSettings.enabled) {
            const contentWidget = this._getOrCreateContentWidget();
            if (contentWidget.showsOrWillShow(mouseEvent)) {
                return;
            }
        }
        if (_sticky) {
            return;
        }
        this.hideContentHover();
    }
    _onKeyDown(e) {
        if (!this._contentWidget) {
            return;
        }
        const isPotentialKeyboardShortcut = this._isPotentialKeyboardShortcut(e);
        const isModifierKeyPressed = this._isModifierKeyPressed(e);
        if (isPotentialKeyboardShortcut || isModifierKeyPressed) {
            return;
        }
        if (this._contentWidget.isFocused && e.keyCode === 2 /* KeyCode.Tab */) {
            return;
        }
        this.hideContentHover();
    }
    _isPotentialKeyboardShortcut(e) {
        if (!this._editor.hasModel() || !this._contentWidget) {
            return false;
        }
        const resolvedKeyboardEvent = this._keybindingService.softDispatch(e, this._editor.getDomNode());
        const moreChordsAreNeeded = resolvedKeyboardEvent.kind === 1 /* ResultKind.MoreChordsNeeded */;
        const isHoverAction = resolvedKeyboardEvent.kind === 2 /* ResultKind.KbFound */ &&
            (resolvedKeyboardEvent.commandId === SHOW_OR_FOCUS_HOVER_ACTION_ID ||
                resolvedKeyboardEvent.commandId === INCREASE_HOVER_VERBOSITY_ACTION_ID ||
                resolvedKeyboardEvent.commandId === DECREASE_HOVER_VERBOSITY_ACTION_ID) &&
            this._contentWidget.isVisible;
        return moreChordsAreNeeded || isHoverAction;
    }
    _isModifierKeyPressed(e) {
        return (e.keyCode === 5 /* KeyCode.Ctrl */ ||
            e.keyCode === 6 /* KeyCode.Alt */ ||
            e.keyCode === 57 /* KeyCode.Meta */ ||
            e.keyCode === 4 /* KeyCode.Shift */);
    }
    hideContentHover() {
        if (_sticky) {
            return;
        }
        if (InlineSuggestionHintsContentWidget.dropDownVisible) {
            return;
        }
        this._contentWidget?.hide();
    }
    _getOrCreateContentWidget() {
        if (!this._contentWidget) {
            this._contentWidget = this._instantiationService.createInstance(ContentHoverWidgetWrapper, this._editor);
            this._listenersStore.add(this._contentWidget.onContentsChanged(() => this._onHoverContentsChanged.fire()));
        }
        return this._contentWidget;
    }
    showContentHover(range, mode, source, focus) {
        this._getOrCreateContentWidget().startShowingAtRange(range, mode, source, focus);
    }
    _isContentWidgetResizing() {
        return this._contentWidget?.widget.isResizing || false;
    }
    focusedHoverPartIndex() {
        return this._getOrCreateContentWidget().focusedHoverPartIndex();
    }
    doesHoverAtIndexSupportVerbosityAction(index, action) {
        return this._getOrCreateContentWidget().doesHoverAtIndexSupportVerbosityAction(index, action);
    }
    updateHoverVerbosityLevel(action, index, focus) {
        this._getOrCreateContentWidget().updateHoverVerbosityLevel(action, index, focus);
    }
    focus() {
        this._contentWidget?.focus();
    }
    focusHoverPartWithIndex(index) {
        this._contentWidget?.focusHoverPartWithIndex(index);
    }
    scrollUp() {
        this._contentWidget?.scrollUp();
    }
    scrollDown() {
        this._contentWidget?.scrollDown();
    }
    scrollLeft() {
        this._contentWidget?.scrollLeft();
    }
    scrollRight() {
        this._contentWidget?.scrollRight();
    }
    pageUp() {
        this._contentWidget?.pageUp();
    }
    pageDown() {
        this._contentWidget?.pageDown();
    }
    goToTop() {
        this._contentWidget?.goToTop();
    }
    goToBottom() {
        this._contentWidget?.goToBottom();
    }
    getWidgetContent() {
        return this._contentWidget?.getWidgetContent();
    }
    getAccessibleWidgetContent() {
        return this._contentWidget?.getAccessibleWidgetContent();
    }
    getAccessibleWidgetContentAtIndex(index) {
        return this._contentWidget?.getAccessibleWidgetContentAtIndex(index);
    }
    get isColorPickerVisible() {
        return this._contentWidget?.isColorPickerVisible;
    }
    get isHoverVisible() {
        return this._contentWidget?.isVisible;
    }
    dispose() {
        super.dispose();
        this._unhookListeners();
        this._listenersStore.dispose();
        this._contentWidget?.dispose();
    }
};
ContentHoverController = ContentHoverController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IKeybindingService)
], ContentHoverController);
export { ContentHoverController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvY29udGVudEhvdmVyQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxrQ0FBa0MsRUFDbEMsNkJBQTZCLEdBQzdCLE1BQU0scUJBQXFCLENBQUE7QUFFNUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVVsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUNoSSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUd6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRSxPQUFPLGFBQWEsQ0FBQTtBQUNwQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFHbkcsb0VBQW9FO0FBQ3BFLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQTtBQVFkLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTs7YUFJOUIsT0FBRSxHQUFHLDZCQUE2QixBQUFoQyxDQUFnQztJQWN6RCxZQUNrQixPQUFvQixFQUNkLHFCQUE2RCxFQUNoRSxrQkFBdUQ7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
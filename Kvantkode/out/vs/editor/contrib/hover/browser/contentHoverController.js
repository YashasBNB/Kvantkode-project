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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9jb250ZW50SG92ZXJDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLGtDQUFrQyxFQUNsQyw2QkFBNkIsR0FDN0IsTUFBTSxxQkFBcUIsQ0FBQTtBQUU1QixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBVWxGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQ2hJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBR3pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzlELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFFLE9BQU8sYUFBYSxDQUFBO0FBQ3BCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUduRyxvRUFBb0U7QUFDcEUsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFBO0FBUWQsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVOzthQUk5QixPQUFFLEdBQUcsNkJBQTZCLEFBQWhDLENBQWdDO0lBY3pELFlBQ2tCLE9BQW9CLEVBQ2QscUJBQTZELEVBQ2hFLGtC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
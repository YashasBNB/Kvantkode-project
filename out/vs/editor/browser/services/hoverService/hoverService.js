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
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { editorHoverBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { HoverWidget } from './hoverWidget.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { addDisposableListener, EventType, getActiveElement, isAncestorOfActiveElement, isAncestor, getWindow, isHTMLElement, isEditableElement, } from '../../../../base/browser/dom.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { ContextViewHandler } from '../../../../platform/contextview/browser/contextViewService.js';
import { ManagedHoverWidget } from './updatableHoverWidget.js';
import { timeout, TimeoutTimer } from '../../../../base/common/async.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isNumber } from '../../../../base/common/types.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
let HoverService = class HoverService extends Disposable {
    constructor(_instantiationService, _configurationService, contextMenuService, _keybindingService, _layoutService, _accessibilityService) {
        super();
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._keybindingService = _keybindingService;
        this._layoutService = _layoutService;
        this._accessibilityService = _accessibilityService;
        this._currentDelayedHoverWasShown = false;
        this._delayedHovers = new Map();
        this._managedHovers = new Map();
        this._register(contextMenuService.onDidShowContextMenu(() => this.hideHover()));
        this._contextViewHandler = this._register(new ContextViewHandler(this._layoutService));
        this._register(KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: 'workbench.action.showHover',
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ - 1,
            when: EditorContextKeys.editorTextFocus.negate(),
            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
            handler: () => {
                this._showAndFocusHoverForActiveElement();
            },
        }));
    }
    showInstantHover(options, focus, skipLastFocusedUpdate, dontShow) {
        const hover = this._createHover(options, skipLastFocusedUpdate);
        if (!hover) {
            return undefined;
        }
        this._showHover(hover, options, focus);
        return hover;
    }
    showDelayedHover(options, lifecycleOptions) {
        // Set `id` to default if it's undefined
        if (options.id === undefined) {
            options.id = getHoverIdFromContent(options.content);
        }
        if (!this._currentDelayedHover || this._currentDelayedHoverWasShown) {
            // Current hover is locked, reject
            if (this._currentHover?.isLocked) {
                return undefined;
            }
            // Identity is the same, return current hover
            if (getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
                return this._currentHover;
            }
            // Check group identity, if it's the same skip the delay and show the hover immediately
            if (this._currentHover &&
                !this._currentHover.isDisposed &&
                this._currentDelayedHoverGroupId !== undefined &&
                this._currentDelayedHoverGroupId === lifecycleOptions?.groupId) {
                return this.showInstantHover({
                    ...options,
                    appearance: {
                        ...options.appearance,
                        skipFadeInAnimation: true,
                    },
                });
            }
        }
        else if (this._currentDelayedHover &&
            getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
            // If the hover is the same but timeout is not finished yet, return the current hover
            return this._currentDelayedHover;
        }
        const hover = this._createHover(options, undefined);
        if (!hover) {
            this._currentDelayedHover = undefined;
            this._currentDelayedHoverWasShown = false;
            this._currentDelayedHoverGroupId = undefined;
            return undefined;
        }
        this._currentDelayedHover = hover;
        this._currentDelayedHoverWasShown = false;
        this._currentDelayedHoverGroupId = lifecycleOptions?.groupId;
        timeout(this._configurationService.getValue('workbench.hover.delay')).then(() => {
            if (hover && !hover.isDisposed) {
                this._currentDelayedHoverWasShown = true;
                this._showHover(hover, options);
            }
        });
        return hover;
    }
    setupDelayedHover(target, options, lifecycleOptions) {
        const resolveHoverOptions = () => ({
            ...(typeof options === 'function' ? options() : options),
            target,
        });
        return this._setupDelayedHover(target, resolveHoverOptions, lifecycleOptions);
    }
    setupDelayedHoverAtMouse(target, options, lifecycleOptions) {
        const resolveHoverOptions = (e) => ({
            ...(typeof options === 'function' ? options() : options),
            target: {
                targetElements: [target],
                x: e !== undefined ? e.x + 10 : undefined,
            },
        });
        return this._setupDelayedHover(target, resolveHoverOptions, lifecycleOptions);
    }
    _setupDelayedHover(target, resolveHoverOptions, lifecycleOptions) {
        const store = new DisposableStore();
        store.add(addDisposableListener(target, EventType.MOUSE_OVER, (e) => {
            this.showDelayedHover(resolveHoverOptions(e), {
                groupId: lifecycleOptions?.groupId,
            });
        }));
        if (lifecycleOptions?.setupKeyboardEvents) {
            store.add(addDisposableListener(target, EventType.KEY_DOWN, (e) => {
                const evt = new StandardKeyboardEvent(e);
                if (evt.equals(10 /* KeyCode.Space */) || evt.equals(3 /* KeyCode.Enter */)) {
                    this.showInstantHover(resolveHoverOptions(), true);
                }
            }));
        }
        this._delayedHovers.set(target, {
            show: (focus) => {
                this.showInstantHover(resolveHoverOptions(), focus);
            },
        });
        store.add(toDisposable(() => this._delayedHovers.delete(target)));
        return store;
    }
    _createHover(options, skipLastFocusedUpdate) {
        this._currentDelayedHover = undefined;
        if (this._currentHover?.isLocked) {
            return undefined;
        }
        // Set `id` to default if it's undefined
        if (options.id === undefined) {
            options.id = getHoverIdFromContent(options.content);
        }
        if (getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
            return undefined;
        }
        this._currentHoverOptions = options;
        this._lastHoverOptions = options;
        const trapFocus = options.trapFocus || this._accessibilityService.isScreenReaderOptimized();
        const activeElement = getActiveElement();
        // HACK, remove this check when #189076 is fixed
        if (!skipLastFocusedUpdate) {
            if (trapFocus && activeElement) {
                if (!activeElement.classList.contains('monaco-hover')) {
                    this._lastFocusedElementBeforeOpen = activeElement;
                }
            }
            else {
                this._lastFocusedElementBeforeOpen = undefined;
            }
        }
        const hoverDisposables = new DisposableStore();
        const hover = this._instantiationService.createInstance(HoverWidget, options);
        if (options.persistence?.sticky) {
            hover.isLocked = true;
        }
        // Adjust target position when a mouse event is provided as the hover position
        if (options.position?.hoverPosition && !isNumber(options.position.hoverPosition)) {
            options.target = {
                targetElements: isHTMLElement(options.target)
                    ? [options.target]
                    : options.target.targetElements,
                x: options.position.hoverPosition.x + 10,
            };
        }
        hover.onDispose(() => {
            const hoverWasFocused = this._currentHover?.domNode && isAncestorOfActiveElement(this._currentHover.domNode);
            if (hoverWasFocused) {
                // Required to handle cases such as closing the hover with the escape key
                this._lastFocusedElementBeforeOpen?.focus();
            }
            // Only clear the current options if it's the current hover, the current options help
            // reduce flickering when the same hover is shown multiple times
            if (getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
                this.doHideHover();
            }
            hoverDisposables.dispose();
        }, undefined, hoverDisposables);
        // Set the container explicitly to enable aux window support
        if (!options.container) {
            const targetElement = isHTMLElement(options.target)
                ? options.target
                : options.target.targetElements[0];
            options.container = this._layoutService.getContainer(getWindow(targetElement));
        }
        hover.onRequestLayout(() => this._contextViewHandler.layout(), undefined, hoverDisposables);
        if (options.persistence?.sticky) {
            hoverDisposables.add(addDisposableListener(getWindow(options.container).document, EventType.MOUSE_DOWN, (e) => {
                if (!isAncestor(e.target, hover.domNode)) {
                    this.doHideHover();
                }
            }));
        }
        else {
            if ('targetElements' in options.target) {
                for (const element of options.target.targetElements) {
                    hoverDisposables.add(addDisposableListener(element, EventType.CLICK, () => this.hideHover()));
                }
            }
            else {
                hoverDisposables.add(addDisposableListener(options.target, EventType.CLICK, () => this.hideHover()));
            }
            const focusedElement = getActiveElement();
            if (focusedElement) {
                const focusedElementDocument = getWindow(focusedElement).document;
                hoverDisposables.add(addDisposableListener(focusedElement, EventType.KEY_DOWN, (e) => this._keyDown(e, hover, !!options.persistence?.hideOnKeyDown)));
                hoverDisposables.add(addDisposableListener(focusedElementDocument, EventType.KEY_DOWN, (e) => this._keyDown(e, hover, !!options.persistence?.hideOnKeyDown)));
                hoverDisposables.add(addDisposableListener(focusedElement, EventType.KEY_UP, (e) => this._keyUp(e, hover)));
                hoverDisposables.add(addDisposableListener(focusedElementDocument, EventType.KEY_UP, (e) => this._keyUp(e, hover)));
            }
        }
        if ('IntersectionObserver' in mainWindow) {
            const observer = new IntersectionObserver((e) => this._intersectionChange(e, hover), {
                threshold: 0,
            });
            const firstTargetElement = 'targetElements' in options.target ? options.target.targetElements[0] : options.target;
            observer.observe(firstTargetElement);
            hoverDisposables.add(toDisposable(() => observer.disconnect()));
        }
        this._currentHover = hover;
        return hover;
    }
    _showHover(hover, options, focus) {
        this._contextViewHandler.showContextView(new HoverContextViewDelegate(hover, focus), options.container);
    }
    hideHover(force) {
        if ((!force && this._currentHover?.isLocked) || !this._currentHoverOptions) {
            return;
        }
        this.doHideHover();
    }
    doHideHover() {
        this._currentHover = undefined;
        this._currentHoverOptions = undefined;
        this._contextViewHandler.hideContextView();
    }
    _intersectionChange(entries, hover) {
        const entry = entries[entries.length - 1];
        if (!entry.isIntersecting) {
            hover.dispose();
        }
    }
    showAndFocusLastHover() {
        if (!this._lastHoverOptions) {
            return;
        }
        this.showInstantHover(this._lastHoverOptions, true, true);
    }
    _showAndFocusHoverForActiveElement() {
        // TODO: if hover is visible, focus it to avoid flickering
        let activeElement = getActiveElement();
        while (activeElement) {
            const hover = this._delayedHovers.get(activeElement) ?? this._managedHovers.get(activeElement);
            if (hover) {
                hover.show(true);
                return;
            }
            activeElement = activeElement.parentElement;
        }
    }
    _keyDown(e, hover, hideOnKeyDown) {
        if (e.key === 'Alt') {
            hover.isLocked = true;
            return;
        }
        const event = new StandardKeyboardEvent(e);
        const keybinding = this._keybindingService.resolveKeyboardEvent(event);
        if (keybinding.getSingleModifierDispatchChords().some((value) => !!value) ||
            this._keybindingService.softDispatch(event, event.target).kind !== 0 /* ResultKind.NoMatchingKb */) {
            return;
        }
        if (hideOnKeyDown && (!this._currentHoverOptions?.trapFocus || e.key !== 'Tab')) {
            this.hideHover();
            this._lastFocusedElementBeforeOpen?.focus();
        }
    }
    _keyUp(e, hover) {
        if (e.key === 'Alt') {
            hover.isLocked = false;
            // Hide if alt is released while the mouse is not over hover/target
            if (!hover.isMouseIn) {
                this.hideHover();
                this._lastFocusedElementBeforeOpen?.focus();
            }
        }
    }
    // TODO: Investigate performance of this function. There seems to be a lot of content created
    //       and thrown away on start up
    setupManagedHover(hoverDelegate, targetElement, content, options) {
        targetElement.setAttribute('custom-hover', 'true');
        if (targetElement.title !== '') {
            console.warn('HTML element already has a title attribute, which will conflict with the custom hover. Please remove the title attribute.');
            console.trace('Stack trace:', targetElement.title);
            targetElement.title = '';
        }
        let hoverPreparation;
        let hoverWidget;
        const hideHover = (disposeWidget, disposePreparation) => {
            const hadHover = hoverWidget !== undefined;
            if (disposeWidget) {
                hoverWidget?.dispose();
                hoverWidget = undefined;
            }
            if (disposePreparation) {
                hoverPreparation?.dispose();
                hoverPreparation = undefined;
            }
            if (hadHover) {
                hoverDelegate.onDidHideHover?.();
                hoverWidget = undefined;
            }
        };
        const triggerShowHover = (delay, focus, target, trapFocus) => {
            return new TimeoutTimer(async () => {
                if (!hoverWidget || hoverWidget.isDisposed) {
                    hoverWidget = new ManagedHoverWidget(hoverDelegate, target || targetElement, delay > 0);
                    await hoverWidget.update(typeof content === 'function' ? content() : content, focus, {
                        ...options,
                        trapFocus,
                    });
                }
            }, delay);
        };
        const store = new DisposableStore();
        let isMouseDown = false;
        store.add(addDisposableListener(targetElement, EventType.MOUSE_DOWN, () => {
            isMouseDown = true;
            hideHover(true, true);
        }, true));
        store.add(addDisposableListener(targetElement, EventType.MOUSE_UP, () => {
            isMouseDown = false;
        }, true));
        store.add(addDisposableListener(targetElement, EventType.MOUSE_LEAVE, (e) => {
            isMouseDown = false;
            hideHover(false, e.fromElement === targetElement);
        }, true));
        store.add(addDisposableListener(targetElement, EventType.MOUSE_OVER, (e) => {
            if (hoverPreparation) {
                return;
            }
            const mouseOverStore = new DisposableStore();
            const target = {
                targetElements: [targetElement],
                dispose: () => { },
            };
            if (hoverDelegate.placement === undefined || hoverDelegate.placement === 'mouse') {
                // track the mouse position
                const onMouseMove = (e) => {
                    target.x = e.x + 10;
                    if (isHTMLElement(e.target) &&
                        getHoverTargetElement(e.target, targetElement) !== targetElement) {
                        hideHover(true, true);
                    }
                };
                mouseOverStore.add(addDisposableListener(targetElement, EventType.MOUSE_MOVE, onMouseMove, true));
            }
            hoverPreparation = mouseOverStore;
            if (isHTMLElement(e.target) &&
                getHoverTargetElement(e.target, targetElement) !== targetElement) {
                return; // Do not show hover when the mouse is over another hover target
            }
            mouseOverStore.add(triggerShowHover(typeof hoverDelegate.delay === 'function'
                ? hoverDelegate.delay(content)
                : hoverDelegate.delay, false, target));
        }, true));
        const onFocus = () => {
            if (isMouseDown || hoverPreparation) {
                return;
            }
            const target = {
                targetElements: [targetElement],
                dispose: () => { },
            };
            const toDispose = new DisposableStore();
            const onBlur = () => hideHover(true, true);
            toDispose.add(addDisposableListener(targetElement, EventType.BLUR, onBlur, true));
            toDispose.add(triggerShowHover(typeof hoverDelegate.delay === 'function'
                ? hoverDelegate.delay(content)
                : hoverDelegate.delay, false, target));
            hoverPreparation = toDispose;
        };
        // Do not show hover when focusing an input or textarea
        if (!isEditableElement(targetElement)) {
            store.add(addDisposableListener(targetElement, EventType.FOCUS, onFocus, true));
        }
        const hover = {
            show: (focus) => {
                hideHover(false, true); // terminate a ongoing mouse over preparation
                triggerShowHover(0, focus, undefined, focus); // show hover immediately
            },
            hide: () => {
                hideHover(true, true);
            },
            update: async (newContent, hoverOptions) => {
                content = newContent;
                await hoverWidget?.update(content, undefined, hoverOptions);
            },
            dispose: () => {
                this._managedHovers.delete(targetElement);
                store.dispose();
                hideHover(true, true);
            },
        };
        this._managedHovers.set(targetElement, hover);
        return hover;
    }
    showManagedHover(target) {
        const hover = this._managedHovers.get(target);
        if (hover) {
            hover.show(true);
        }
    }
    dispose() {
        this._managedHovers.forEach((hover) => hover.dispose());
        super.dispose();
    }
};
HoverService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService),
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, ILayoutService),
    __param(5, IAccessibilityService)
], HoverService);
export { HoverService };
function getHoverOptionsIdentity(options) {
    if (options === undefined) {
        return undefined;
    }
    return options?.id ?? options;
}
function getHoverIdFromContent(content) {
    if (isHTMLElement(content)) {
        return undefined;
    }
    if (typeof content === 'string') {
        return content.toString();
    }
    return content.value;
}
class HoverContextViewDelegate {
    get anchorPosition() {
        return this._hover.anchor;
    }
    constructor(_hover, _focus = false) {
        this._hover = _hover;
        this._focus = _focus;
        // Render over all other context views
        this.layer = 1;
    }
    render(container) {
        this._hover.render(container);
        if (this._focus) {
            this._hover.focus();
        }
        return this._hover;
    }
    getAnchor() {
        return {
            x: this._hover.x,
            y: this._hover.y,
        };
    }
    layout() {
        this._hover.layout();
    }
}
function getHoverTargetElement(element, stopElement) {
    stopElement = stopElement ?? getWindow(element).document.body;
    while (!element.hasAttribute('custom-hover') && element !== stopElement) {
        element = element.parentElement;
    }
    return element;
}
registerSingleton(IHoverService, HoverService, 1 /* InstantiationType.Delayed */);
registerThemingParticipant((theme, collector) => {
    const hoverBorder = theme.getColor(editorHoverBorder);
    if (hoverBorder) {
        collector.addRule(`.monaco-workbench .workbench-hover .hover-row:not(:first-child):not(:empty) { border-top: 1px solid ${hoverBorder.transparent(0.5)}; }`);
        collector.addRule(`.monaco-workbench .workbench-hover hr { border-top: 1px solid ${hoverBorder.transparent(0.5)}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9zZXJ2aWNlcy9ob3ZlclNlcnZpY2UvaG92ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBSzlDLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsU0FBUyxFQUNULGdCQUFnQixFQUNoQix5QkFBeUIsRUFDekIsVUFBVSxFQUNWLFNBQVMsRUFDVCxhQUFhLEVBQ2IsaUJBQWlCLEdBQ2pCLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FB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
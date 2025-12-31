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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvc2VydmljZXMvaG92ZXJTZXJ2aWNlL2hvdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUs5QyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLFNBQVMsRUFDVCxnQkFBZ0IsRUFDaEIseUJBQXlCLEVBQ3pCLFVBQVUsRUFDVixTQUFTLEVBQ1QsYUFBYSxFQUNiLGlCQUFpQixHQUNqQixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixP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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, addDisposableListener, EventType, getActiveElement, getWindow, isAncestor, isHTMLElement, } from '../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { Menu } from '../../../base/browser/ui/menu/menu.js';
import { ActionRunner, } from '../../../base/common/actions.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { combinedDisposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { defaultMenuStyles } from '../../theme/browser/defaultStyles.js';
export class ContextMenuHandler {
    constructor(contextViewService, telemetryService, notificationService, keybindingService) {
        this.contextViewService = contextViewService;
        this.telemetryService = telemetryService;
        this.notificationService = notificationService;
        this.keybindingService = keybindingService;
        this.focusToReturn = null;
        this.lastContainer = null;
        this.block = null;
        this.blockDisposable = null;
        this.options = { blockMouse: true };
    }
    configure(options) {
        this.options = options;
    }
    showContextMenu(delegate) {
        const actions = delegate.getActions();
        if (!actions.length) {
            return; // Don't render an empty context menu
        }
        this.focusToReturn = getActiveElement();
        let menu;
        const shadowRootElement = isHTMLElement(delegate.domForShadowRoot)
            ? delegate.domForShadowRoot
            : undefined;
        this.contextViewService.showContextView({
            getAnchor: () => delegate.getAnchor(),
            canRelayout: false,
            anchorAlignment: delegate.anchorAlignment,
            anchorAxisAlignment: delegate.anchorAxisAlignment,
            layer: delegate.layer,
            render: (container) => {
                this.lastContainer = container;
                const className = delegate.getMenuClassName ? delegate.getMenuClassName() : '';
                if (className) {
                    container.className += ' ' + className;
                }
                // Render invisible div to block mouse interaction in the rest of the UI
                if (this.options.blockMouse) {
                    this.block = container.appendChild($('.context-view-block'));
                    this.block.style.position = 'fixed';
                    this.block.style.cursor = 'initial';
                    this.block.style.left = '0';
                    this.block.style.top = '0';
                    this.block.style.width = '100%';
                    this.block.style.height = '100%';
                    this.block.style.zIndex = '-1';
                    this.blockDisposable?.dispose();
                    this.blockDisposable = addDisposableListener(this.block, EventType.MOUSE_DOWN, (e) => e.stopPropagation());
                }
                const menuDisposables = new DisposableStore();
                const actionRunner = delegate.actionRunner || menuDisposables.add(new ActionRunner());
                actionRunner.onWillRun((evt) => this.onActionRun(evt, !delegate.skipTelemetry), this, menuDisposables);
                actionRunner.onDidRun(this.onDidActionRun, this, menuDisposables);
                menu = new Menu(container, actions, {
                    actionViewItemProvider: delegate.getActionViewItem,
                    context: delegate.getActionsContext ? delegate.getActionsContext() : null,
                    actionRunner,
                    getKeyBinding: delegate.getKeyBinding
                        ? delegate.getKeyBinding
                        : (action) => this.keybindingService.lookupKeybinding(action.id),
                }, defaultMenuStyles);
                menu.onDidCancel(() => this.contextViewService.hideContextView(true), null, menuDisposables);
                menu.onDidBlur(() => this.contextViewService.hideContextView(true), null, menuDisposables);
                const targetWindow = getWindow(container);
                menuDisposables.add(addDisposableListener(targetWindow, EventType.BLUR, () => this.contextViewService.hideContextView(true)));
                menuDisposables.add(addDisposableListener(targetWindow, EventType.MOUSE_DOWN, (e) => {
                    if (e.defaultPrevented) {
                        return;
                    }
                    const event = new StandardMouseEvent(targetWindow, e);
                    let element = event.target;
                    // Don't do anything as we are likely creating a context menu
                    if (event.rightButton) {
                        return;
                    }
                    while (element) {
                        if (element === container) {
                            return;
                        }
                        element = element.parentElement;
                    }
                    this.contextViewService.hideContextView(true);
                }));
                return combinedDisposable(menuDisposables, menu);
            },
            focus: () => {
                menu?.focus(!!delegate.autoSelectFirstItem);
            },
            onHide: (didCancel) => {
                delegate.onHide?.(!!didCancel);
                if (this.block) {
                    this.block.remove();
                    this.block = null;
                }
                this.blockDisposable?.dispose();
                this.blockDisposable = null;
                if (!!this.lastContainer &&
                    (getActiveElement() === this.lastContainer ||
                        isAncestor(getActiveElement(), this.lastContainer))) {
                    this.focusToReturn?.focus();
                }
                this.lastContainer = null;
            },
        }, shadowRootElement, !!shadowRootElement);
    }
    onActionRun(e, logTelemetry) {
        if (logTelemetry) {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: 'contextMenu' });
        }
        this.contextViewService.hideContextView(false);
    }
    onDidActionRun(e) {
        if (e.error && !isCancellationError(e.error)) {
            this.notificationService.error(e.error);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dE1lbnVIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29udGV4dHZpZXcvYnJvd3Nlci9jb250ZXh0TWVudUhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUNOLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsU0FBUyxFQUNULGdCQUFnQixFQUNoQixTQUFTLEVBQ1QsVUFBVSxFQUNWLGFBQWEsR0FDYixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sWUFBWSxHQUlaLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBS3BHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBTXhFLE1BQU0sT0FBTyxrQkFBa0I7SUFPOUIsWUFDUyxrQkFBdUMsRUFDdkMsZ0JBQW1DLEVBQ25DLG1CQUF5QyxFQUN6QyxpQkFBcUM7UUFIckMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN2QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ25DLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDekMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQVZ0QyxrQkFBYSxHQUF1QixJQUFJLENBQUE7UUFDeEMsa0JBQWEsR0FBdUIsSUFBSSxDQUFBO1FBQ3hDLFVBQUssR0FBdUIsSUFBSSxDQUFBO1FBQ2hDLG9CQUFlLEdB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
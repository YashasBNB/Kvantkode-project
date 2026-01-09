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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dE1lbnVIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb250ZXh0dmlldy9icm93c2VyL2NvbnRleHRNZW51SGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQ04sQ0FBQyxFQUNELHFCQUFxQixFQUNyQixTQUFTLEVBQ1QsZ0JBQWdCLEVBQ2hCLFNBQVMsRUFDVCxVQUFVLEVBQ1YsYUFBYSxHQUNiLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFDTixZQUFZLEdBSVosTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFLcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFNeEUsTUFBTSxPQUFPLGtCQUFrQjtJQU85QixZQUNTLGtCQUF1QyxFQUN2QyxnQkFBbUMsRUFDbkMsbUJBQXlDLEVBQ3pDLGlCQUFxQztRQUhyQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3ZDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDbkMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUN6QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBVnRDLGtCQUFhLEdBQXVCLElBQUksQ0FBQTtRQUN4QyxrQkFBYSxHQUF1QixJQUFJLENBQUE7UUFDeEMsVUFBSyxHQUF1QixJ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
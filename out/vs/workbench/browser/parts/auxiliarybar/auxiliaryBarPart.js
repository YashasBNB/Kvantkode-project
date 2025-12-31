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
var AuxiliaryBarPart_1;
import './media/auxiliaryBarPart.css';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { contrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ActiveAuxiliaryContext, AuxiliaryBarFocusContext } from '../../../common/contextkeys.js';
import { ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND, ACTIVITY_BAR_TOP_ACTIVE_BORDER, ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER, ACTIVITY_BAR_TOP_FOREGROUND, ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND, PANEL_ACTIVE_TITLE_BORDER, PANEL_ACTIVE_TITLE_FOREGROUND, PANEL_DRAG_AND_DROP_BORDER, PANEL_INACTIVE_TITLE_FOREGROUND, SIDE_BAR_BACKGROUND, SIDE_BAR_BORDER, SIDE_BAR_TITLE_BORDER, SIDE_BAR_FOREGROUND, } from '../../../common/theme.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { Separator, SubmenuAction, toAction } from '../../../../base/common/actions.js';
import { ToggleAuxiliaryBarAction } from './auxiliaryBarActions.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { ToggleSidebarPositionAction } from '../../actions/layoutActions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { AbstractPaneCompositePart, CompositeBarPosition } from '../paneCompositePart.js';
import { prepareActions, } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { $ } from '../../../../base/browser/dom.js';
import { WorkbenchToolBar, } from '../../../../platform/actions/browser/toolbar.js';
import { ActionViewItem, } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { CompositeMenuActions } from '../../actions.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let AuxiliaryBarPart = class AuxiliaryBarPart extends AbstractPaneCompositePart {
    static { AuxiliaryBarPart_1 = this; }
    static { this.activeViewSettingsKey = 'workbench.auxiliarybar.activepanelid'; }
    static { this.pinnedViewsKey = 'workbench.auxiliarybar.pinnedPanels'; }
    static { this.placeholdeViewContainersKey = 'workbench.auxiliarybar.placeholderPanels'; }
    static { this.viewContainersWorkspaceStateKey = 'workbench.auxiliarybar.viewContainersWorkspaceState'; }
    get preferredHeight() {
        // Don't worry about titlebar or statusbar visibility
        // The difference is minimal and keeps this function clean
        return this.layoutService.mainContainerDimension.height * 0.4;
    }
    get preferredWidth() {
        const activeComposite = this.getActivePaneComposite();
        if (!activeComposite) {
            return;
        }
        const width = activeComposite.getOptimalWidth();
        if (typeof width !== 'number') {
            return;
        }
        return Math.max(width, 300);
    }
    constructor(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, commandService, menuService, configurationService) {
        super("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */, {
            hasTitle: true,
            borderWidth: () => this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder) ? 1 : 0,
        }, AuxiliaryBarPart_1.activeViewSettingsKey, ActiveAuxiliaryContext.bindTo(contextKeyService), AuxiliaryBarFocusContext.bindTo(contextKeyService), 'auxiliarybar', 'auxiliarybar', undefined, SIDE_BAR_TITLE_BORDER, notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService);
        this.commandService = commandService;
        this.configurationService = configurationService;
        // Use the side bar dimensions
        this.minimumWidth = 280; // Void changed this (was 170)
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this.minimumHeight = 0;
        this.maximumHeight = Number.POSITIVE_INFINITY;
        this.priority = 1 /* LayoutPriority.Low */;
        this.configuration = this.resolveConfiguration();
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
                this.configuration = this.resolveConfiguration();
                this.onDidChangeActivityBarLocation();
            }
            else if (e.affectsConfiguration('workbench.secondarySideBar.showLabels')) {
                this.configuration = this.resolveConfiguration();
                this.updateCompositeBar(true);
            }
        }));
    }
    resolveConfiguration() {
        const position = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        const canShowLabels = position !== "top" /* ActivityBarPosition.TOP */; // otherwise labels would repeat vertically
        const showLabels = canShowLabels &&
            this.configurationService.getValue('workbench.secondarySideBar.showLabels') !== false;
        return { position, canShowLabels, showLabels };
    }
    onDidChangeActivityBarLocation() {
        this.updateCompositeBar();
        const id = this.getActiveComposite()?.getId();
        if (id) {
            this.onTitleAreaUpdate(id);
        }
    }
    updateStyles() {
        super.updateStyles();
        const container = assertIsDefined(this.getContainer());
        container.style.backgroundColor = this.getColor(SIDE_BAR_BACKGROUND) || '';
        const borderColor = this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder);
        const isPositionLeft = this.layoutService.getSideBarPosition() === 1 /* Position.RIGHT */;
        container.style.color = this.getColor(SIDE_BAR_FOREGROUND) || '';
        container.style.borderLeftColor = borderColor ?? '';
        container.style.borderRightColor = borderColor ?? '';
        container.style.borderLeftStyle = borderColor && !isPositionLeft ? 'solid' : 'none';
        container.style.borderRightStyle = borderColor && isPositionLeft ? 'solid' : 'none';
        container.style.borderLeftWidth = borderColor && !isPositionLeft ? '1px' : '0px';
        container.style.borderRightWidth = borderColor && isPositionLeft ? '1px' : '0px';
    }
    getCompositeBarOptions() {
        const $this = this;
        return {
            partContainerClass: 'auxiliarybar',
            pinnedViewContainersKey: AuxiliaryBarPart_1.pinnedViewsKey,
            placeholderViewContainersKey: AuxiliaryBarPart_1.placeholdeViewContainersKey,
            viewContainersWorkspaceStateKey: AuxiliaryBarPart_1.viewContainersWorkspaceStateKey,
            icon: !this.configuration.showLabels,
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            recomputeSizes: true,
            activityHoverOptions: {
                position: () => this.getCompositeBarPosition() === CompositeBarPosition.BOTTOM
                    ? 3 /* HoverPosition.ABOVE */
                    : 2 /* HoverPosition.BELOW */,
            },
            fillExtraContextMenuActions: (actions) => this.fillExtraContextMenuActions(actions),
            compositeSize: 0,
            iconSize: 16,
            // Add 10px spacing if the overflow action is visible to no confuse the user with ... between the toolbars
            get overflowActionSize() {
                return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? 40 : 30;
            },
            colors: (theme) => ({
                activeBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                inactiveBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                get activeBorderBottomColor() {
                    return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE
                        ? theme.getColor(PANEL_ACTIVE_TITLE_BORDER)
                        : theme.getColor(ACTIVITY_BAR_TOP_ACTIVE_BORDER);
                },
                get activeForegroundColor() {
                    return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE
                        ? theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND)
                        : theme.getColor(ACTIVITY_BAR_TOP_FOREGROUND);
                },
                get inactiveForegroundColor() {
                    return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE
                        ? theme.getColor(PANEL_INACTIVE_TITLE_FOREGROUND)
                        : theme.getColor(ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND);
                },
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
                get dragAndDropBorder() {
                    return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE
                        ? theme.getColor(PANEL_DRAG_AND_DROP_BORDER)
                        : theme.getColor(ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER);
                },
            }),
            compact: true,
        };
    }
    fillExtraContextMenuActions(actions) {
        const currentPositionRight = this.layoutService.getSideBarPosition() === 0 /* Position.LEFT */;
        if (this.getCompositeBarPosition() === CompositeBarPosition.TITLE) {
            const viewsSubmenuAction = this.getViewsSubmenuAction();
            if (viewsSubmenuAction) {
                actions.push(new Separator());
                actions.push(viewsSubmenuAction);
            }
        }
        const activityBarPositionMenu = this.menuService.getMenuActions(MenuId.ActivityBarPositionMenu, this.contextKeyService, { shouldForwardArgs: true, renderShortTitle: true });
        const positionActions = getContextMenuActions(activityBarPositionMenu).secondary;
        const toggleShowLabelsAction = toAction({
            id: 'workbench.action.auxiliarybar.toggleShowLabels',
            label: this.configuration.showLabels
                ? localize('showIcons', 'Show Icons')
                : localize('showLabels', 'Show Labels'),
            enabled: this.configuration.canShowLabels,
            run: () => this.configurationService.updateValue('workbench.secondarySideBar.showLabels', !this.configuration.showLabels),
        });
        actions.push(...[
            new Separator(),
            new SubmenuAction('workbench.action.panel.position', localize('activity bar position', 'Activity Bar Position'), positionActions),
            toAction({
                id: ToggleSidebarPositionAction.ID,
                label: currentPositionRight
                    ? localize('move second side bar left', 'Move KvantKode Side Bar Left')
                    : localize('move second side bar right', 'Move KvantKode Side Bar Right'),
                run: () => this.commandService.executeCommand(ToggleSidebarPositionAction.ID),
            }),
            toggleShowLabelsAction,
            toAction({
                id: ToggleAuxiliaryBarAction.ID,
                label: localize('hide second side bar', 'Hide KvantKode Side Bar'),
                run: () => this.commandService.executeCommand(ToggleAuxiliaryBarAction.ID),
            }),
        ]);
    }
    shouldShowCompositeBar() {
        return this.configuration.position !== "hidden" /* ActivityBarPosition.HIDDEN */;
    }
    getCompositeBarPosition() {
        switch (this.configuration.position) {
            case "top" /* ActivityBarPosition.TOP */:
                return CompositeBarPosition.TOP;
            case "bottom" /* ActivityBarPosition.BOTTOM */:
                return CompositeBarPosition.BOTTOM;
            case "hidden" /* ActivityBarPosition.HIDDEN */:
                return CompositeBarPosition.TITLE;
            case "default" /* ActivityBarPosition.DEFAULT */:
                return CompositeBarPosition.TITLE;
            default:
                return CompositeBarPosition.TITLE;
        }
    }
    createHeaderArea() {
        const headerArea = super.createHeaderArea();
        const globalHeaderContainer = $('.auxiliary-bar-global-header');
        // Add auxillary header action
        const menu = this.headerFooterCompositeBarDispoables.add(this.instantiationService.createInstance(CompositeMenuActions, MenuId.AuxiliaryBarHeader, undefined, undefined));
        const toolBar = this.headerFooterCompositeBarDispoables.add(this.instantiationService.createInstance(WorkbenchToolBar, globalHeaderContainer, {
            actionViewItemProvider: (action, options) => this.headerActionViewItemProvider(action, options),
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            getKeyBinding: (action) => this.keybindingService.lookupKeybinding(action.id),
        }));
        toolBar.setActions(prepareActions(menu.getPrimaryActions()));
        this.headerFooterCompositeBarDispoables.add(menu.onDidChange(() => toolBar.setActions(prepareActions(menu.getPrimaryActions()))));
        headerArea.appendChild(globalHeaderContainer);
        return headerArea;
    }
    headerActionViewItemProvider(action, options) {
        if (action.id === ToggleAuxiliaryBarAction.ID) {
            return this.instantiationService.createInstance(ActionViewItem, undefined, action, options);
        }
        return undefined;
    }
    toJSON() {
        return {
            type: "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */,
        };
    }
};
AuxiliaryBarPart = AuxiliaryBarPart_1 = __decorate([
    __param(0, INotificationService),
    __param(1, IStorageService),
    __param(2, IContextMenuService),
    __param(3, IWorkbenchLayoutService),
    __param(4, IKeybindingService),
    __param(5, IHoverService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IViewDescriptorService),
    __param(9, IContextKeyService),
    __param(10, IExtensionService),
    __param(11, ICommandService),
    __param(12, IMenuService),
    __param(13, IConfigurationService)
], AuxiliaryBarPart);
export { AuxiliaryBarPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5QmFyUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2F1eGlsaWFyeWJhci9hdXhpbGlhcnlCYXJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLDZCQUE2QixFQUM3Qiw4QkFBOEIsRUFDOUIscUNBQXFDLEVBQ3JDLDJCQUEyQixFQUMzQixvQ0FBb0MsRUFDcEMseUJBQXlCLEVBQ3pCLDZCQUE2QixFQUM3QiwwQkFBMEIsRUFDMUIsK0JBQStCLEVBQy9CLG1CQUFtQixFQUNuQixlQUFlLEVBQ2YscUJBQXFCLEVBQ3JCLG1CQUFtQixHQUNuQixNQUFN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
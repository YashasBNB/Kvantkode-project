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
var PanelPart_1;
import './media/panelpart.css';
import { localize } from '../../../../nls.js';
import { Separator, SubmenuAction, toAction } from '../../../../base/common/actions.js';
import { ActivePanelContext, PanelFocusContext } from '../../../common/contextkeys.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TogglePanelAction } from './panelActions.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { PANEL_BACKGROUND, PANEL_BORDER, PANEL_TITLE_BORDER, PANEL_ACTIVE_TITLE_FOREGROUND, PANEL_INACTIVE_TITLE_FOREGROUND, PANEL_ACTIVE_TITLE_BORDER, PANEL_DRAG_AND_DROP_BORDER, PANEL_TITLE_BADGE_BACKGROUND, PANEL_TITLE_BADGE_FOREGROUND, } from '../../../common/theme.js';
import { contrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Dimension } from '../../../../base/browser/dom.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { AbstractPaneCompositePart, CompositeBarPosition } from '../paneCompositePart.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let PanelPart = class PanelPart extends AbstractPaneCompositePart {
    static { PanelPart_1 = this; }
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
    //#endregion
    static { this.activePanelSettingsKey = 'workbench.panelpart.activepanelid'; }
    constructor(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, commandService, menuService, configurationService) {
        super("workbench.parts.panel" /* Parts.PANEL_PART */, { hasTitle: true }, PanelPart_1.activePanelSettingsKey, ActivePanelContext.bindTo(contextKeyService), PanelFocusContext.bindTo(contextKeyService), 'panel', 'panel', undefined, PANEL_TITLE_BORDER, notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService);
        this.commandService = commandService;
        this.configurationService = configurationService;
        //#region IView
        this.minimumWidth = 300;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this.minimumHeight = 77;
        this.maximumHeight = Number.POSITIVE_INFINITY;
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('workbench.panel.showLabels')) {
                this.updateCompositeBar(true);
            }
        }));
    }
    updateStyles() {
        super.updateStyles();
        const container = assertIsDefined(this.getContainer());
        container.style.backgroundColor = this.getColor(PANEL_BACKGROUND) || '';
        const borderColor = this.getColor(PANEL_BORDER) || this.getColor(contrastBorder) || '';
        container.style.borderLeftColor = borderColor;
        container.style.borderRightColor = borderColor;
        container.style.borderBottomColor = borderColor;
        const title = this.getTitleArea();
        if (title) {
            title.style.borderTopColor =
                this.getColor(PANEL_BORDER) || this.getColor(contrastBorder) || '';
        }
    }
    getCompositeBarOptions() {
        return {
            partContainerClass: 'panel',
            pinnedViewContainersKey: 'workbench.panel.pinnedPanels',
            placeholderViewContainersKey: 'workbench.panel.placeholderPanels',
            viewContainersWorkspaceStateKey: 'workbench.panel.viewContainersWorkspaceState',
            icon: this.configurationService.getValue('workbench.panel.showLabels') === false,
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            recomputeSizes: true,
            activityHoverOptions: {
                position: () => this.layoutService.getPanelPosition() === 2 /* Position.BOTTOM */ &&
                    !this.layoutService.isPanelMaximized()
                    ? 3 /* HoverPosition.ABOVE */
                    : 2 /* HoverPosition.BELOW */,
            },
            fillExtraContextMenuActions: (actions) => this.fillExtraContextMenuActions(actions),
            compositeSize: 0,
            iconSize: 16,
            compact: true, // Only applies to icons, not labels
            overflowActionSize: 44,
            colors: (theme) => ({
                activeBackgroundColor: theme.getColor(PANEL_BACKGROUND), // Background color for overflow action
                inactiveBackgroundColor: theme.getColor(PANEL_BACKGROUND), // Background color for overflow action
                activeBorderBottomColor: theme.getColor(PANEL_ACTIVE_TITLE_BORDER),
                activeForegroundColor: theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND),
                inactiveForegroundColor: theme.getColor(PANEL_INACTIVE_TITLE_FOREGROUND),
                badgeBackground: theme.getColor(PANEL_TITLE_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(PANEL_TITLE_BADGE_FOREGROUND),
                dragAndDropBorder: theme.getColor(PANEL_DRAG_AND_DROP_BORDER),
            }),
        };
    }
    fillExtraContextMenuActions(actions) {
        if (this.getCompositeBarPosition() === CompositeBarPosition.TITLE) {
            const viewsSubmenuAction = this.getViewsSubmenuAction();
            if (viewsSubmenuAction) {
                actions.push(new Separator());
                actions.push(viewsSubmenuAction);
            }
        }
        const panelPositionMenu = this.menuService.getMenuActions(MenuId.PanelPositionMenu, this.contextKeyService, { shouldForwardArgs: true });
        const panelAlignMenu = this.menuService.getMenuActions(MenuId.PanelAlignmentMenu, this.contextKeyService, { shouldForwardArgs: true });
        const positionActions = getContextMenuActions(panelPositionMenu).secondary;
        const alignActions = getContextMenuActions(panelAlignMenu).secondary;
        const panelShowLabels = this.configurationService.getValue('workbench.panel.showLabels');
        const toggleShowLabelsAction = toAction({
            id: 'workbench.action.panel.toggleShowLabels',
            label: panelShowLabels
                ? localize('showIcons', 'Show Icons')
                : localize('showLabels', 'Show Labels'),
            run: () => this.configurationService.updateValue('workbench.panel.showLabels', !panelShowLabels),
        });
        actions.push(...[
            new Separator(),
            new SubmenuAction('workbench.action.panel.position', localize('panel position', 'Panel Position'), positionActions),
            new SubmenuAction('workbench.action.panel.align', localize('align panel', 'Align Panel'), alignActions),
            toggleShowLabelsAction,
            toAction({
                id: TogglePanelAction.ID,
                label: localize('hidePanel', 'Hide Panel'),
                run: () => this.commandService.executeCommand(TogglePanelAction.ID),
            }),
        ]);
    }
    layout(width, height, top, left) {
        let dimensions;
        switch (this.layoutService.getPanelPosition()) {
            case 1 /* Position.RIGHT */:
                dimensions = new Dimension(width - 1, height); // Take into account the 1px border when layouting
                break;
            case 3 /* Position.TOP */:
                dimensions = new Dimension(width, height - 1); // Take into account the 1px border when layouting
                break;
            default:
                dimensions = new Dimension(width, height);
                break;
        }
        // Layout contents
        super.layout(dimensions.width, dimensions.height, top, left);
    }
    shouldShowCompositeBar() {
        return true;
    }
    getCompositeBarPosition() {
        return CompositeBarPosition.TITLE;
    }
    toJSON() {
        return {
            type: "workbench.parts.panel" /* Parts.PANEL_PART */,
        };
    }
};
PanelPart = PanelPart_1 = __decorate([
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
], PanelPart);
export { PanelPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZWxQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvcGFuZWwvcGFuZWxQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQVcsU0FBUyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN0RixPQUFPLEVBQ04sdUJBQXVCLEdBR3ZCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLFlBQVksRUFDWixrQkFBa0IsRUFDbEIsNkJBQTZCLEVBQzdCLCtCQUErQixFQUMvQix5QkFBeUIsRUFDekIsMEJBQTBCLEVBQzFCLDRCQUE0QixFQUM1Qiw0QkFBNEIsR0FDNUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbkYsT0FB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
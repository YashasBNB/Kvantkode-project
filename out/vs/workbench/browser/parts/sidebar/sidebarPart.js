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
var SidebarPart_1;
import './media/sidebarpart.css';
import './sidebarActions.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { SidebarFocusContext, ActiveViewletContext } from '../../../common/contextkeys.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { contrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { SIDE_BAR_TITLE_FOREGROUND, SIDE_BAR_TITLE_BORDER, SIDE_BAR_BACKGROUND, SIDE_BAR_FOREGROUND, SIDE_BAR_BORDER, SIDE_BAR_DRAG_AND_DROP_BACKGROUND, ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND, ACTIVITY_BAR_TOP_FOREGROUND, ACTIVITY_BAR_TOP_ACTIVE_BORDER, ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND, ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER, } from '../../../common/theme.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { AbstractPaneCompositePart, CompositeBarPosition } from '../paneCompositePart.js';
import { ActivityBarCompositeBar, ActivitybarPart } from '../activitybar/activitybarPart.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Action2, IMenuService, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { Separator } from '../../../../base/common/actions.js';
import { ToggleActivityBarVisibilityActionId } from '../../actions/layoutActions.js';
import { localize2 } from '../../../../nls.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let SidebarPart = class SidebarPart extends AbstractPaneCompositePart {
    static { SidebarPart_1 = this; }
    static { this.activeViewletSettingsKey = 'workbench.sidebar.activeviewletid'; }
    get snap() {
        return true;
    }
    get preferredWidth() {
        const viewlet = this.getActivePaneComposite();
        if (!viewlet) {
            return;
        }
        const width = viewlet.getOptimalWidth();
        if (typeof width !== 'number') {
            return;
        }
        return Math.max(width, 300);
    }
    //#endregion
    constructor(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, configurationService, menuService) {
        super("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, {
            hasTitle: true,
            borderWidth: () => this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder) ? 1 : 0,
        }, SidebarPart_1.activeViewletSettingsKey, ActiveViewletContext.bindTo(contextKeyService), SidebarFocusContext.bindTo(contextKeyService), 'sideBar', 'viewlet', SIDE_BAR_TITLE_FOREGROUND, SIDE_BAR_TITLE_BORDER, notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService);
        this.configurationService = configurationService;
        //#region IView
        this.minimumWidth = 170;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this.minimumHeight = 0;
        this.maximumHeight = Number.POSITIVE_INFINITY;
        this.priority = 1 /* LayoutPriority.Low */;
        this.activityBarPart = this._register(this.instantiationService.createInstance(ActivitybarPart, this));
        this.rememberActivityBarVisiblePosition();
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
                this.onDidChangeActivityBarLocation();
            }
        }));
        this.registerActions();
    }
    onDidChangeActivityBarLocation() {
        this.activityBarPart.hide();
        this.updateCompositeBar();
        const id = this.getActiveComposite()?.getId();
        if (id) {
            this.onTitleAreaUpdate(id);
        }
        if (this.shouldShowActivityBar()) {
            this.activityBarPart.show();
        }
        this.rememberActivityBarVisiblePosition();
    }
    updateStyles() {
        super.updateStyles();
        const container = assertIsDefined(this.getContainer());
        container.style.backgroundColor = this.getColor(SIDE_BAR_BACKGROUND) || '';
        container.style.color = this.getColor(SIDE_BAR_FOREGROUND) || '';
        const borderColor = this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder);
        const isPositionLeft = this.layoutService.getSideBarPosition() === 0 /* SideBarPosition.LEFT */;
        container.style.borderRightWidth = borderColor && isPositionLeft ? '1px' : '';
        container.style.borderRightStyle = borderColor && isPositionLeft ? 'solid' : '';
        container.style.borderRightColor = isPositionLeft ? borderColor || '' : '';
        container.style.borderLeftWidth = borderColor && !isPositionLeft ? '1px' : '';
        container.style.borderLeftStyle = borderColor && !isPositionLeft ? 'solid' : '';
        container.style.borderLeftColor = !isPositionLeft ? borderColor || '' : '';
        container.style.outlineColor = this.getColor(SIDE_BAR_DRAG_AND_DROP_BACKGROUND) ?? '';
    }
    layout(width, height, top, left) {
        if (!this.layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            return;
        }
        super.layout(width, height, top, left);
    }
    getTitleAreaDropDownAnchorAlignment() {
        return this.layoutService.getSideBarPosition() === 0 /* SideBarPosition.LEFT */
            ? 0 /* AnchorAlignment.LEFT */
            : 1 /* AnchorAlignment.RIGHT */;
    }
    createCompositeBar() {
        return this.instantiationService.createInstance(ActivityBarCompositeBar, this.getCompositeBarOptions(), this.partId, this, false);
    }
    getCompositeBarOptions() {
        return {
            partContainerClass: 'sidebar',
            pinnedViewContainersKey: ActivitybarPart.pinnedViewContainersKey,
            placeholderViewContainersKey: ActivitybarPart.placeholderViewContainersKey,
            viewContainersWorkspaceStateKey: ActivitybarPart.viewContainersWorkspaceStateKey,
            icon: true,
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            recomputeSizes: true,
            activityHoverOptions: {
                position: () => this.getCompositeBarPosition() === CompositeBarPosition.BOTTOM
                    ? 3 /* HoverPosition.ABOVE */
                    : 2 /* HoverPosition.BELOW */,
            },
            fillExtraContextMenuActions: (actions) => {
                if (this.getCompositeBarPosition() === CompositeBarPosition.TITLE) {
                    const viewsSubmenuAction = this.getViewsSubmenuAction();
                    if (viewsSubmenuAction) {
                        actions.push(new Separator());
                        actions.push(viewsSubmenuAction);
                    }
                }
            },
            compositeSize: 0,
            iconSize: 16,
            overflowActionSize: 30,
            colors: (theme) => ({
                activeBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                inactiveBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                activeBorderBottomColor: theme.getColor(ACTIVITY_BAR_TOP_ACTIVE_BORDER),
                activeForegroundColor: theme.getColor(ACTIVITY_BAR_TOP_FOREGROUND),
                inactiveForegroundColor: theme.getColor(ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND),
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
                dragAndDropBorder: theme.getColor(ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER),
            }),
            compact: true,
        };
    }
    shouldShowCompositeBar() {
        const activityBarPosition = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        return (activityBarPosition === "top" /* ActivityBarPosition.TOP */ ||
            activityBarPosition === "bottom" /* ActivityBarPosition.BOTTOM */);
    }
    shouldShowActivityBar() {
        if (this.shouldShowCompositeBar()) {
            return false;
        }
        return (this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) !==
            "hidden" /* ActivityBarPosition.HIDDEN */);
    }
    getCompositeBarPosition() {
        const activityBarPosition = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        switch (activityBarPosition) {
            case "top" /* ActivityBarPosition.TOP */:
                return CompositeBarPosition.TOP;
            case "bottom" /* ActivityBarPosition.BOTTOM */:
                return CompositeBarPosition.BOTTOM;
            case "hidden" /* ActivityBarPosition.HIDDEN */:
            case "default" /* ActivityBarPosition.DEFAULT */: // noop
            default:
                return CompositeBarPosition.TITLE;
        }
    }
    rememberActivityBarVisiblePosition() {
        const activityBarPosition = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        if (activityBarPosition !== "hidden" /* ActivityBarPosition.HIDDEN */) {
            this.storageService.store("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, activityBarPosition, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
    getRememberedActivityBarVisiblePosition() {
        const activityBarPosition = this.storageService.get("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, 0 /* StorageScope.PROFILE */);
        switch (activityBarPosition) {
            case "top" /* ActivityBarPosition.TOP */:
                return "top" /* ActivityBarPosition.TOP */;
            case "bottom" /* ActivityBarPosition.BOTTOM */:
                return "bottom" /* ActivityBarPosition.BOTTOM */;
            default:
                return "default" /* ActivityBarPosition.DEFAULT */;
        }
    }
    getPinnedPaneCompositeIds() {
        return this.shouldShowCompositeBar()
            ? super.getPinnedPaneCompositeIds()
            : this.activityBarPart.getPinnedPaneCompositeIds();
    }
    getVisiblePaneCompositeIds() {
        return this.shouldShowCompositeBar()
            ? super.getVisiblePaneCompositeIds()
            : this.activityBarPart.getVisiblePaneCompositeIds();
    }
    getPaneCompositeIds() {
        return this.shouldShowCompositeBar()
            ? super.getPaneCompositeIds()
            : this.activityBarPart.getPaneCompositeIds();
    }
    async focusActivityBar() {
        if (this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) ===
            "hidden" /* ActivityBarPosition.HIDDEN */) {
            await this.configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, this.getRememberedActivityBarVisiblePosition());
            this.onDidChangeActivityBarLocation();
        }
        if (this.shouldShowCompositeBar()) {
            this.focusCompositeBar();
        }
        else {
            if (!this.layoutService.isVisible("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */)) {
                this.layoutService.setPartHidden(false, "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */);
            }
            this.activityBarPart.show(true);
        }
    }
    registerActions() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: ToggleActivityBarVisibilityActionId,
                    title: localize2('toggleActivityBar', 'Toggle Activity Bar Visibility'),
                });
            }
            run() {
                const value = that.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) ===
                    "hidden" /* ActivityBarPosition.HIDDEN */
                    ? that.getRememberedActivityBarVisiblePosition()
                    : "hidden" /* ActivityBarPosition.HIDDEN */;
                return that.configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, value);
            }
        }));
    }
    toJSON() {
        return {
            type: "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */,
        };
    }
};
SidebarPart = SidebarPart_1 = __decorate([
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
    __param(11, IConfigurationService),
    __param(12, IMenuService)
], SidebarPart);
export { SidebarPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhclBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9zaWRlYmFyL3NpZGViYXJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUVOLHVCQUF1QixHQUl2QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ25GLE9BQU8sRUFDTix5QkFBeUIsRUFDekIscUJBQXFCLEVBQ3JCLG1CQUFtQixFQUNuQixtQkFBbUIsRUFDbkIsZUFBZSxFQUNmLGlDQUFpQyxFQUNqQyw2QkFBNkIsRUFDN0IsNkJBQTZCLEVBQzdCLDJCQUEyQixFQUMzQiw4QkFBOEIsRUFDOUIsb0NBQW9DLEVBQ3BDLHFDQUFxQyxHQUNyQyxNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FB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
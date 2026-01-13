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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhclBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3NpZGViYXIvc2lkZWJhclBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBRU4sdUJBQXVCLEdBSXZCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbkYsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixxQkFBcUIsRUFDckIsbUJBQW1CLEVBQ25CLG1CQUFtQixFQUNuQixlQUFlLEVBQ2YsaUNBQWlDLEVBQ2pDLDZCQUE2QixFQUM3Qiw2QkFBNkIsRUFDN0IsMkJBQTJCLEVBQzNCLDhCQUE4QixFQUM5QixvQ0FBb0MsRUFDcEMscUNBQXFDLEdBQ3JDLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLGtCQUFrQixF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
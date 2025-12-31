/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ViewContainerExtensions, Extensions as ViewExtensions, IViewDescriptorService, } from '../../../common/views.js';
import * as nls from '../../../../nls.js';
// import { Codicon } from '../../../../base/common/codicons.js';
// import { localize } from '../../../../nls.js';
// import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
// import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
// import { IDisposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { mountSidebar } from './react/out/sidebar-tsx/index.js';
import { Codicon } from '../../../../base/common/codicons.js';
// import { IDisposable } from '../../../../base/common/lifecycle.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
// compare against search.contribution.ts and debug.contribution.ts, scm.contribution.ts (source control)
// ---------- Define viewpane ----------
let SidebarViewPane = class SidebarViewPane extends ViewPane {
    constructor(options, instantiationService, viewDescriptorService, configurationService, contextKeyService, themeService, contextMenuService, keybindingService, openerService, telemetryService, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
    }
    renderBody(parent) {
        super.renderBody(parent);
        parent.style.overflow = 'auto';
        parent.style.userSelect = 'text';
        // gets set immediately
        this.instantiationService.invokeFunction((accessor) => {
            // mount react
            const disposeFn = mountSidebar(parent, accessor)?.dispose;
            this._register(toDisposable(() => disposeFn?.()));
        });
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.element.style.height = `${height}px`;
        this.element.style.width = `${width}px`;
    }
};
SidebarViewPane = __decorate([
    __param(1, IInstantiationService),
    __param(2, IViewDescriptorService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IThemeService),
    __param(6, IContextMenuService),
    __param(7, IKeybindingService),
    __param(8, IOpenerService),
    __param(9, ITelemetryService),
    __param(10, IHoverService)
], SidebarViewPane);
// ---------- Register viewpane inside the void container ----------
// const voidThemeIcon = Codicon.symbolObject;
// const voidViewIcon = registerIcon('void-view-icon', voidThemeIcon, localize('voidViewIcon', 'View icon of the Void chat view.'));
// called VIEWLET_ID in other places for some reason
export const VOID_VIEW_CONTAINER_ID = 'workbench.view.void';
export const VOID_VIEW_ID = VOID_VIEW_CONTAINER_ID;
// Register view container
const viewContainerRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
const container = viewContainerRegistry.registerViewContainer({
    id: VOID_VIEW_CONTAINER_ID,
    title: nls.localize2('voidContainer', 'Chat'), // this is used to say "Void" (Ctrl + L)
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
        VOID_VIEW_CONTAINER_ID,
        {
            mergeViewWithContainerWhenSingleView: true,
            orientation: 1 /* Orientation.HORIZONTAL */,
        },
    ]),
    hideIfEmpty: false,
    order: 1,
    rejectAddedViews: true,
    icon: Codicon.symbolMethod,
}, 2 /* ViewContainerLocation.AuxiliaryBar */, { doNotRegisterOpenCommand: true, isDefault: true });
// Register search default location to the container (sidebar)
const viewsRegistry = Registry.as(ViewExtensions.ViewsRegistry);
viewsRegistry.registerViews([
    {
        id: VOID_VIEW_ID,
        hideByDefault: false, // start open
        // containerIcon: voidViewIcon,
        name: nls.localize2('voidChat', ''), // this says ... : CHAT
        ctorDescriptor: new SyncDescriptor(SidebarViewPane),
        canToggleVisibility: false,
        canMoveView: false, // can't move this out of its container
        weight: 80,
        order: 1,
        // singleViewPaneContainerTitle: 'hi',
        // openCommandActionDescriptor: {
        // 	id: VOID_VIEW_CONTAINER_ID,
        // 	keybindings: {
        // 		primary: KeyMod.CtrlCmd | KeyCode.KeyL,
        // 	},
        // 	order: 1
        // },
    },
], container);
// open sidebar
export const VOID_OPEN_SIDEBAR_ACTION_ID = 'void.openSidebar';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_OPEN_SIDEBAR_ACTION_ID,
            title: 'Open KvantKode Sidebar',
        });
    }
    run(accessor) {
        const viewsService = accessor.get(IViewsService);
        viewsService.openViewContainer(VOID_VIEW_CONTAINER_ID);
    }
});
let SidebarStartContribution = class SidebarStartContribution {
    static { this.ID = 'workbench.contrib.startupVoidSidebar'; }
    constructor(commandService) {
        this.commandService = commandService;
        this.commandService.executeCommand(VOID_OPEN_SIDEBAR_ACTION_ID);
    }
};
SidebarStartContribution = __decorate([
    __param(0, ICommandService)
], SidebarStartContribution);
export { SidebarStartContribution };
registerWorkbenchContribution2(SidebarStartContribution.ID, SidebarStartContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhclBhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvc2lkZWJhclBhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixVQUFVLElBQUksdUJBQXVCLEVBSXJDLFVBQVUsSUFBSSxjQUFjLEVBQzVCLHNCQUFzQixHQUN0QixNQUFNLDBCQUEwQixDQUFBO0FBRWpDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsaUVBQWlFO0FBQ2pFLGlEQUFpRDtBQUNqRCxvRkFBb0Y7QUFDcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLHlFQUF5RTtBQUV6RSxPQUFPLEVBQW9CLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRXJGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLHNFQUFzRTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFB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
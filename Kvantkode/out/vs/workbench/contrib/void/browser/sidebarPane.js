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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhclBhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9zaWRlYmFyUGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsRUFJckMsVUFBVSxJQUFJLGNBQWMsRUFDNUIsc0JBQXNCLEdBQ3RCLE1BQU0sMEJBQTBCLENBQUE7QUFFakMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxpRUFBaUU7QUFDakUsaURBQWlEO0FBQ2pELG9GQUFvRjtBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYseUVBQXlFO0FBRXpFLE9BQU8sRUFBb0IsUUFBUSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsc0VBQXNFO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FB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
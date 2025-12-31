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
var TerminalLinkContribution_1;
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton, } from '../../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown, } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { isDetachedTerminalInstance, } from '../../../terminal/browser/terminal.js';
import { registerActiveInstanceAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { isTerminalProcessManager } from '../../../terminal/common/terminal.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { terminalStrings } from '../../../terminal/common/terminalStrings.js';
import { ITerminalLinkProviderService } from './links.js';
import { TerminalLinkManager } from './terminalLinkManager.js';
import { TerminalLinkProviderService } from './terminalLinkProviderService.js';
import { TerminalLinkQuickpick } from './terminalLinkQuickpick.js';
import { TerminalLinkResolver } from './terminalLinkResolver.js';
// #region Services
registerSingleton(ITerminalLinkProviderService, TerminalLinkProviderService, 1 /* InstantiationType.Delayed */);
// #endregion
// #region Terminal Contributions
let TerminalLinkContribution = class TerminalLinkContribution extends DisposableStore {
    static { TerminalLinkContribution_1 = this; }
    static { this.ID = 'terminal.link'; }
    static get(instance) {
        return instance.getContribution(TerminalLinkContribution_1.ID);
    }
    constructor(_ctx, _instantiationService, _terminalLinkProviderService) {
        super();
        this._ctx = _ctx;
        this._instantiationService = _instantiationService;
        this._terminalLinkProviderService = _terminalLinkProviderService;
        this._linkResolver = this._instantiationService.createInstance(TerminalLinkResolver);
    }
    xtermReady(xterm) {
        const linkManager = (this._linkManager = this.add(this._instantiationService.createInstance(TerminalLinkManager, xterm.raw, this._ctx.processManager, this._ctx.instance.capabilities, this._linkResolver)));
        // Set widget manager
        if (isTerminalProcessManager(this._ctx.processManager)) {
            const disposable = linkManager.add(Event.once(this._ctx.processManager.onProcessReady)(() => {
                linkManager.setWidgetManager(this._ctx.widgetManager);
                this.delete(disposable);
            }));
        }
        else {
            linkManager.setWidgetManager(this._ctx.widgetManager);
        }
        // Attach the external link provider to the instance and listen for changes
        if (!isDetachedTerminalInstance(this._ctx.instance)) {
            for (const linkProvider of this._terminalLinkProviderService.linkProviders) {
                linkManager.externalProvideLinksCb = linkProvider.provideLinks.bind(linkProvider, this._ctx.instance);
            }
            linkManager.add(this._terminalLinkProviderService.onDidAddLinkProvider((e) => {
                linkManager.externalProvideLinksCb = e.provideLinks.bind(e, this._ctx.instance);
            }));
        }
        linkManager.add(this._terminalLinkProviderService.onDidRemoveLinkProvider(() => (linkManager.externalProvideLinksCb = undefined)));
    }
    async showLinkQuickpick(extended) {
        if (!this._terminalLinkQuickpick) {
            this._terminalLinkQuickpick = this.add(this._instantiationService.createInstance(TerminalLinkQuickpick));
            this._terminalLinkQuickpick.onDidRequestMoreLinks(() => {
                this.showLinkQuickpick(true);
            });
        }
        const links = await this._getLinks();
        return await this._terminalLinkQuickpick.show(this._ctx.instance, links);
    }
    async _getLinks() {
        if (!this._linkManager) {
            throw new Error('terminal links are not ready, cannot generate link quick pick');
        }
        return this._linkManager.getLinks();
    }
    async openRecentLink(type) {
        if (!this._linkManager) {
            throw new Error('terminal links are not ready, cannot open a link');
        }
        this._linkManager.openRecentLink(type);
    }
};
TerminalLinkContribution = TerminalLinkContribution_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITerminalLinkProviderService)
], TerminalLinkContribution);
registerTerminalContribution(TerminalLinkContribution.ID, TerminalLinkContribution, true);
// #endregion
// #region Actions
const category = terminalStrings.actionCategory;
registerActiveInstanceAction({
    id: "workbench.action.terminal.openDetectedLink" /* TerminalLinksCommandId.OpenDetectedLink */,
    title: localize2('workbench.action.terminal.openDetectedLink', 'Open Detected Link...'),
    f1: true,
    category,
    precondition: TerminalContextKeys.terminalHasBeenCreated,
    keybinding: [
        {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 45 /* KeyCode.KeyO */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
            when: TerminalContextKeys.focus,
        },
        {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 37 /* KeyCode.KeyG */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
            when: ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */)),
        },
    ],
    run: (activeInstance) => TerminalLinkContribution.get(activeInstance)?.showLinkQuickpick(),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.openUrlLink" /* TerminalLinksCommandId.OpenWebLink */,
    title: localize2('workbench.action.terminal.openLastUrlLink', 'Open Last URL Link'),
    metadata: {
        description: localize2('workbench.action.terminal.openLastUrlLink.description', 'Opens the last detected URL/URI link in the terminal'),
    },
    f1: true,
    category,
    precondition: TerminalContextKeys.terminalHasBeenCreated,
    run: (activeInstance) => TerminalLinkContribution.get(activeInstance)?.openRecentLink('url'),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.openFileLink" /* TerminalLinksCommandId.OpenFileLink */,
    title: localize2('workbench.action.terminal.openLastLocalFileLink', 'Open Last Local File Link'),
    f1: true,
    category,
    precondition: TerminalContextKeys.terminalHasBeenCreated,
    run: (activeInstance) => TerminalLinkContribution.get(activeInstance)?.openRecentLink('localFile'),
});
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwubGlua3MuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWwubGlua3MuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVqRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0IscUJBQXFCLEdBQ3JCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUlOLDBCQUEwQixHQUMxQixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzNGLE9BQU8sRUFDTiw0QkFBNEIsR0FHNUIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFN0UsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3pELE9B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
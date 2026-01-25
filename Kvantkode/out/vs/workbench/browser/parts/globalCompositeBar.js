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
var GlobalCompositeBar_1;
import { localize } from '../../../nls.js';
import { ActionBar } from '../../../base/browser/ui/actionbar/actionbar.js';
import { ACCOUNTS_ACTIVITY_ID, GLOBAL_ACTIVITY_ID } from '../../common/activity.js';
import { IActivityService } from '../../services/activity/common/activity.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { DisposableStore, Disposable } from '../../../base/common/lifecycle.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { IStorageService, } from '../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { CompositeBarActionViewItem, CompositeBarAction, } from './compositeBarActions.js';
import { Codicon } from '../../../base/common/codicons.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { registerIcon } from '../../../platform/theme/common/iconRegistry.js';
import { Action, Separator, SubmenuAction, toAction, } from '../../../base/common/actions.js';
import { IMenuService, MenuId } from '../../../platform/actions/common/actions.js';
import { addDisposableListener, EventType, append, clearNode, hide, show, EventHelper, $, runWhenWindowIdle, getWindow, } from '../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { EventType as TouchEventType } from '../../../base/browser/touch.js';
import { Lazy } from '../../../base/common/lazy.js';
import { getActionBarActions } from '../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { ISecretStorageService } from '../../../platform/secrets/common/secrets.js';
import { getCurrentAuthenticationSessionInfo, } from '../../services/authentication/browser/authenticationService.js';
import { IAuthenticationService, } from '../../services/authentication/common/authentication.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { ILifecycleService } from '../../services/lifecycle/common/lifecycle.js';
import { IUserDataProfileService } from '../../services/userDataProfile/common/userDataProfile.js';
import { DEFAULT_ICON } from '../../services/userDataProfile/common/userDataProfileIcons.js';
import { isString } from '../../../base/common/types.js';
import { ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND } from '../../common/theme.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
let GlobalCompositeBar = class GlobalCompositeBar extends Disposable {
    static { GlobalCompositeBar_1 = this; }
    static { this.ACCOUNTS_ACTION_INDEX = 0; }
    static { this.ACCOUNTS_ICON = registerIcon('accounts-view-bar-icon', Codicon.account, localize('accountsViewBarIcon', 'Accounts icon in the view bar.')); }
    constructor(contextMenuActionsProvider, colors, activityHoverOptions, configurationService, instantiationService, storageService, extensionService) {
        super();
        this.contextMenuActionsProvider = contextMenuActionsProvider;
        this.colors = colors;
        this.activityHoverOptions = activityHoverOptions;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.globalActivityAction = this._register(new Action(GLOBAL_ACTIVITY_ID));
        this.accountAction = this._register(new Action(ACCOUNTS_ACTIVITY_ID));
        this.element = $('div');
        const contextMenuAlignmentOptions = () => ({
            anchorAlignment: configurationService.getValue('workbench.sideBar.location') === 'left'
                ? 1 /* AnchorAlignment.RIGHT */
                : 0 /* AnchorAlignment.LEFT */,
            anchorAxisAlignment: 1 /* AnchorAxisAlignment.HORIZONTAL */,
        });
        this.globalActivityActionBar = this._register(new ActionBar(this.element, {
            actionViewItemProvider: (action, options) => {
                if (action.id === GLOBAL_ACTIVITY_ID) {
                    return this.instantiationService.createInstance(GlobalActivityActionViewItem, this.contextMenuActionsProvider, { ...options, colors: this.colors, hoverOptions: this.activityHoverOptions }, contextMenuAlignmentOptions);
                }
                if (action.id === ACCOUNTS_ACTIVITY_ID) {
                    return this.instantiationService.createInstance(AccountsActivityActionViewItem, this.contextMenuActionsProvider, {
                        ...options,
                        colors: this.colors,
                        hoverOptions: this.activityHoverOptions,
                    }, contextMenuAlignmentOptions, (actions) => {
                        actions.unshift(...[
                            toAction({
                                id: 'hideAccounts',
                                label: localize('hideAccounts', 'Hide Accounts'),
                                run: () => setAccountsActionVisible(storageService, false),
                            }),
                            new Separator(),
                        ]);
                    });
                }
                throw new Error(`No view item for action '${action.id}'`);
            },
            orientation: 1 /* ActionsOrientation.VERTICAL */,
            ariaLabel: localize('manage', 'Manage'),
            preventLoopNavigation: true,
        }));
        if (this.accountsVisibilityPreference) {
            this.globalActivityActionBar.push(this.accountAction, {
                index: GlobalCompositeBar_1.ACCOUNTS_ACTION_INDEX,
            });
        }
        this.globalActivityActionBar.push(this.globalActivityAction);
        this.registerListeners();
    }
    registerListeners() {
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            if (!this._store.isDisposed) {
                this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, AccountsActivityActionViewItem.ACCOUNTS_VISIBILITY_PREFERENCE_KEY, this._store)(() => this.toggleAccountsActivity()));
            }
        });
    }
    create(parent) {
        parent.appendChild(this.element);
    }
    focus() {
        this.globalActivityActionBar.focus(true);
    }
    size() {
        return this.globalActivityActionBar.viewItems.length;
    }
    getContextMenuActions() {
        return [
            toAction({
                id: 'toggleAccountsVisibility',
                label: localize('accounts', 'Accounts'),
                checked: this.accountsVisibilityPreference,
                run: () => (this.accountsVisibilityPreference = !this.accountsVisibilityPreference),
            }),
        ];
    }
    toggleAccountsActivity() {
        if (this.globalActivityActionBar.length() === 2 && this.accountsVisibilityPreference) {
            return;
        }
        if (this.globalActivityActionBar.length() === 2) {
            this.globalActivityActionBar.pull(GlobalCompositeBar_1.ACCOUNTS_ACTION_INDEX);
        }
        else {
            this.globalActivityActionBar.push(this.accountAction, {
                index: GlobalCompositeBar_1.ACCOUNTS_ACTION_INDEX,
            });
        }
    }
    get accountsVisibilityPreference() {
        return isAccountsActionVisible(this.storageService);
    }
    set accountsVisibilityPreference(value) {
        setAccountsActionVisible(this.storageService, value);
    }
};
GlobalCompositeBar = GlobalCompositeBar_1 = __decorate([
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, IExtensionService)
], GlobalCompositeBar);
export { GlobalCompositeBar };
let AbstractGlobalActivityActionViewItem = class AbstractGlobalActivityActionViewItem extends CompositeBarActionViewItem {
    constructor(menuId, action, options, contextMenuActionsProvider, contextMenuAlignmentOptions, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, keybindingService, activityService) {
        super(action, { draggable: false, icon: true, hasPopup: true, ...options }, () => true, themeService, hoverService, configurationService, keybindingService);
        this.menuId = menuId;
        this.contextMenuActionsProvider = contextMenuActionsProvider;
        this.contextMenuAlignmentOptions = contextMenuAlignmentOptions;
        this.menuService = menuService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.activityService = activityService;
        this.updateItemActivity();
        this._register(this.activityService.onDidChangeActivity((viewContainerOrAction) => {
            if (isString(viewContainerOrAction) &&
                viewContainerOrAction === this.compositeBarActionItem.id) {
                this.updateItemActivity();
            }
        }));
    }
    updateItemActivity() {
        ;
        this.action.activities = this.activityService.getActivity(this.compositeBarActionItem.id);
    }
    render(container) {
        super.render(container);
        this._register(addDisposableListener(this.container, EventType.MOUSE_DOWN, async (e) => {
            EventHelper.stop(e, true);
            const isLeftClick = e?.button !== 2;
            // Left-click run
            if (isLeftClick) {
                this.run();
            }
        }));
        // The rest of the activity bar uses context menu event for the context menu, so we match this
        this._register(addDisposableListener(this.container, EventType.CONTEXT_MENU, async (e) => {
            // Let the item decide on the context menu instead of the toolbar
            e.stopPropagation();
            const disposables = new DisposableStore();
            const actions = await this.resolveContextMenuActions(disposables);
            const event = new StandardMouseEvent(getWindow(this.container), e);
            this.contextMenuService.showContextMenu({
                getAnchor: () => event,
                getActions: () => actions,
                onHide: () => disposables.dispose(),
            });
        }));
        this._register(addDisposableListener(this.container, EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                EventHelper.stop(e, true);
                this.run();
            }
        }));
        this._register(addDisposableListener(this.container, TouchEventType.Tap, (e) => {
            EventHelper.stop(e, true);
            this.run();
        }));
    }
    async resolveContextMenuActions(disposables) {
        return this.contextMenuActionsProvider();
    }
    async run() {
        const disposables = new DisposableStore();
        const menu = disposables.add(this.menuService.createMenu(this.menuId, this.contextKeyService));
        const actions = await this.resolveMainMenuActions(menu, disposables);
        const { anchorAlignment, anchorAxisAlignment } = this.contextMenuAlignmentOptions() ?? {
            anchorAlignment: undefined,
            anchorAxisAlignment: undefined,
        };
        this.contextMenuService.showContextMenu({
            getAnchor: () => this.label,
            anchorAlignment,
            anchorAxisAlignment,
            getActions: () => actions,
            onHide: () => disposables.dispose(),
            menuActionOptions: { renderShortTitle: true },
        });
    }
    async resolveMainMenuActions(menu, _disposable) {
        return getActionBarActions(menu.getActions({ renderShortTitle: true })).secondary;
    }
};
AbstractGlobalActivityActionViewItem = __decorate([
    __param(5, IThemeService),
    __param(6, IHoverService),
    __param(7, IMenuService),
    __param(8, IContextMenuService),
    __param(9, IContextKeyService),
    __param(10, IConfigurationService),
    __param(11, IKeybindingService),
    __param(12, IActivityService)
], AbstractGlobalActivityActionViewItem);
let AccountsActivityActionViewItem = class AccountsActivityActionViewItem extends AbstractGlobalActivityActionViewItem {
    static { this.ACCOUNTS_VISIBILITY_PREFERENCE_KEY = 'workbench.activity.showAccounts'; }
    constructor(contextMenuActionsProvider, options, contextMenuAlignmentOptions, fillContextMenuActions, themeService, lifecycleService, hoverService, contextMenuService, menuService, contextKeyService, authenticationService, environmentService, productService, configurationService, keybindingService, secretStorageService, logService, activityService, instantiationService, commandService) {
        const action = instantiationService.createInstance(CompositeBarAction, {
            id: ACCOUNTS_ACTIVITY_ID,
            name: localize('accounts', 'Accounts'),
            classNames: ThemeIcon.asClassNameArray(GlobalCompositeBar.ACCOUNTS_ICON),
        });
        super(MenuId.AccountsContext, action, options, contextMenuActionsProvider, contextMenuAlignmentOptions, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, keybindingService, activityService);
        this.fillContextMenuActions = fillContextMenuActions;
        this.lifecycleService = lifecycleService;
        this.authenticationService = authenticationService;
        this.productService = productService;
        this.secretStorageService = secretStorageService;
        this.logService = logService;
        this.commandService = commandService;
        this.groupedAccounts = new Map();
        this.problematicProviders = new Set();
        this.initialized = false;
        this.sessionFromEmbedder = new Lazy(() => getCurrentAuthenticationSessionInfo(this.secretStorageService, this.productService));
        this._register(action);
        this.registerListeners();
        this.initialize();
    }
    registerListeners() {
        this._register(this.authenticationService.onDidRegisterAuthenticationProvider(async (e) => {
            await this.addAccountsFromProvider(e.id);
        }));
        this._register(this.authenticationService.onDidUnregisterAuthenticationProvider((e) => {
            this.groupedAccounts.delete(e.id);
            this.problematicProviders.delete(e.id);
        }));
        this._register(this.authenticationService.onDidChangeSessions(async (e) => {
            if (e.event.removed) {
                for (const removed of e.event.removed) {
                    this.removeAccount(e.providerId, removed.account);
                }
            }
            for (const changed of [...(e.event.changed ?? []), ...(e.event.added ?? [])]) {
                try {
                    await this.addOrUpdateAccount(e.providerId, changed.account);
                }
                catch (e) {
                    this.logService.error(e);
                }
            }
        }));
    }
    // This function exists to ensure that the accounts are added for auth providers that had already been registered
    // before the menu was created.
    async initialize() {
        // Resolving the menu doesn't need to happen immediately, so we can wait until after the workbench has been restored
        // and only run this when the system is idle.
        await this.lifecycleService.when(3 /* LifecyclePhase.Restored */);
        if (this._store.isDisposed) {
            return;
        }
        const disposable = this._register(runWhenWindowIdle(getWindow(this.element), async () => {
            await this.doInitialize();
            disposable.dispose();
        }));
    }
    async doInitialize() {
        const providerIds = this.authenticationService.getProviderIds();
        const results = await Promise.allSettled(providerIds.map((providerId) => this.addAccountsFromProvider(providerId)));
        // Log any errors that occurred while initializing. We try to be best effort here to show the most amount of accounts
        for (const result of results) {
            if (result.status === 'rejected') {
                this.logService.error(result.reason);
            }
        }
        this.initialized = true;
    }
    //#region overrides
    async resolveMainMenuActions(accountsMenu, disposables) {
        await super.resolveMainMenuActions(accountsMenu, disposables);
        const providers = this.authenticationService.getProviderIds();
        const otherCommands = accountsMenu.getActions();
        let menus = [];
        for (const providerId of providers) {
            if (!this.initialized) {
                const noAccountsAvailableAction = disposables.add(new Action('noAccountsAvailable', localize('loading', 'Loading...'), undefined, false));
                menus.push(noAccountsAvailableAction);
                break;
            }
            const providerLabel = this.authenticationService.getProvider(providerId).label;
            const accounts = this.groupedAccounts.get(providerId);
            if (!accounts) {
                if (this.problematicProviders.has(providerId)) {
                    const providerUnavailableAction = disposables.add(new Action('providerUnavailable', localize('authProviderUnavailable', '{0} is currently unavailable', providerLabel), undefined, false));
                    menus.push(providerUnavailableAction);
                    // try again in the background so that if the failure was intermittent, we can resolve it on the next showing of the menu
                    try {
                        await this.addAccountsFromProvider(providerId);
                    }
                    catch (e) {
                        this.logService.error(e);
                    }
                }
                continue;
            }
            for (const account of accounts) {
                const manageExtensionsAction = toAction({
                    id: `configureSessions${account.label}`,
                    label: localize('manageTrustedExtensions', 'Manage Trusted Extensions'),
                    enabled: true,
                    run: () => this.commandService.executeCommand('_manageTrustedExtensionsForAccount', {
                        providerId,
                        accountLabel: account.label,
                    }),
                });
                const providerSubMenuActions = [manageExtensionsAction];
                if (account.canSignOut) {
                    providerSubMenuActions.push(toAction({
                        id: 'signOut',
                        label: localize('signOut', 'Sign Out'),
                        enabled: true,
                        run: () => this.commandService.executeCommand('_signOutOfAccount', {
                            providerId,
                            accountLabel: account.label,
                        }),
                    }));
                }
                const providerSubMenu = new SubmenuAction('activitybar.submenu', `${account.label} (${providerLabel})`, providerSubMenuActions);
                menus.push(providerSubMenu);
            }
        }
        if (providers.length && !menus.length) {
            const noAccountsAvailableAction = disposables.add(new Action('noAccountsAvailable', localize('noAccounts', 'You are not signed in to any accounts'), undefined, false));
            menus.push(noAccountsAvailableAction);
        }
        if (menus.length && otherCommands.length) {
            menus.push(new Separator());
        }
        otherCommands.forEach((group, i) => {
            const actions = group[1];
            menus = menus.concat(actions);
            if (i !== otherCommands.length - 1) {
                menus.push(new Separator());
            }
        });
        return menus;
    }
    async resolveContextMenuActions(disposables) {
        const actions = await super.resolveContextMenuActions(disposables);
        this.fillContextMenuActions(actions);
        return actions;
    }
    //#endregion
    //#region groupedAccounts helpers
    async addOrUpdateAccount(providerId, account) {
        let accounts = this.groupedAccounts.get(providerId);
        if (!accounts) {
            accounts = [];
            this.groupedAccounts.set(providerId, accounts);
        }
        const sessionFromEmbedder = await this.sessionFromEmbedder.value;
        let canSignOut = true;
        if (sessionFromEmbedder && // if we have a session from the embedder
            !sessionFromEmbedder.canSignOut && // and that session says we can't sign out
            (await this.authenticationService.getSessions(providerId)) // and that session is associated with the account we are adding/updating
                .some((s) => s.id === sessionFromEmbedder.id && s.account.id === account.id)) {
            canSignOut = false;
        }
        const existingAccount = accounts.find((a) => a.label === account.label);
        if (existingAccount) {
            // if we have an existing account and we discover that we
            // can't sign out of it, update the account to mark it as "can't sign out"
            if (!canSignOut) {
                existingAccount.canSignOut = canSignOut;
            }
        }
        else {
            accounts.push({ ...account, canSignOut });
        }
    }
    removeAccount(providerId, account) {
        const accounts = this.groupedAccounts.get(providerId);
        if (!accounts) {
            return;
        }
        const index = accounts.findIndex((a) => a.id === account.id);
        if (index === -1) {
            return;
        }
        accounts.splice(index, 1);
        if (accounts.length === 0) {
            this.groupedAccounts.delete(providerId);
        }
    }
    async addAccountsFromProvider(providerId) {
        try {
            const sessions = await this.authenticationService.getSessions(providerId);
            this.problematicProviders.delete(providerId);
            for (const session of sessions) {
                try {
                    await this.addOrUpdateAccount(providerId, session.account);
                }
                catch (e) {
                    this.logService.error(e);
                }
            }
        }
        catch (e) {
            this.logService.error(e);
            this.problematicProviders.add(providerId);
        }
    }
};
AccountsActivityActionViewItem = __decorate([
    __param(4, IThemeService),
    __param(5, ILifecycleService),
    __param(6, IHoverService),
    __param(7, IContextMenuService),
    __param(8, IMenuService),
    __param(9, IContextKeyService),
    __param(10, IAuthenticationService),
    __param(11, IWorkbenchEnvironmentService),
    __param(12, IProductService),
    __param(13, IConfigurationService),
    __param(14, IKeybindingService),
    __param(15, ISecretStorageService),
    __param(16, ILogService),
    __param(17, IActivityService),
    __param(18, IInstantiationService),
    __param(19, ICommandService)
], AccountsActivityActionViewItem);
export { AccountsActivityActionViewItem };
let GlobalActivityActionViewItem = class GlobalActivityActionViewItem extends AbstractGlobalActivityActionViewItem {
    constructor(contextMenuActionsProvider, options, contextMenuAlignmentOptions, userDataProfileService, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, environmentService, keybindingService, instantiationService, activityService) {
        const action = instantiationService.createInstance(CompositeBarAction, {
            id: GLOBAL_ACTIVITY_ID,
            name: localize('manage', 'Manage'),
            classNames: ThemeIcon.asClassNameArray(userDataProfileService.currentProfile.icon
                ? ThemeIcon.fromId(userDataProfileService.currentProfile.icon)
                : DEFAULT_ICON),
        });
        super(MenuId.GlobalActivity, action, options, contextMenuActionsProvider, contextMenuAlignmentOptions, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, keybindingService, activityService);
        this.userDataProfileService = userDataProfileService;
        this._register(action);
        this._register(this.userDataProfileService.onDidChangeCurrentProfile((e) => {
            action.compositeBarActionItem = {
                ...action.compositeBarActionItem,
                classNames: ThemeIcon.asClassNameArray(userDataProfileService.currentProfile.icon
                    ? ThemeIcon.fromId(userDataProfileService.currentProfile.icon)
                    : DEFAULT_ICON),
            };
        }));
    }
    render(container) {
        super.render(container);
        this.profileBadge = append(container, $('.profile-badge'));
        this.profileBadgeContent = append(this.profileBadge, $('.profile-badge-content'));
        this.updateProfileBadge();
    }
    updateProfileBadge() {
        if (!this.profileBadge || !this.profileBadgeContent) {
            return;
        }
        clearNode(this.profileBadgeContent);
        hide(this.profileBadge);
        if (this.userDataProfileService.currentProfile.isDefault) {
            return;
        }
        if (this.userDataProfileService.currentProfile.icon &&
            this.userDataProfileService.currentProfile.icon !== DEFAULT_ICON.id) {
            return;
        }
        if (this.action.activities.length > 0) {
            return;
        }
        show(this.profileBadge);
        this.profileBadgeContent.classList.add('profile-text-overlay');
        this.profileBadgeContent.textContent = this.userDataProfileService.currentProfile.name
            .substring(0, 2)
            .toUpperCase();
    }
    updateActivity() {
        super.updateActivity();
        this.updateProfileBadge();
    }
    computeTitle() {
        return this.userDataProfileService.currentProfile.isDefault
            ? super.computeTitle()
            : localize('manage profile', 'Manage {0} (Profile)', this.userDataProfileService.currentProfile.name);
    }
};
GlobalActivityActionViewItem = __decorate([
    __param(3, IUserDataProfileService),
    __param(4, IThemeService),
    __param(5, IHoverService),
    __param(6, IMenuService),
    __param(7, IContextMenuService),
    __param(8, IContextKeyService),
    __param(9, IConfigurationService),
    __param(10, IWorkbenchEnvironmentService),
    __param(11, IKeybindingService),
    __param(12, IInstantiationService),
    __param(13, IActivityService)
], GlobalActivityActionViewItem);
export { GlobalActivityActionViewItem };
let SimpleAccountActivityActionViewItem = class SimpleAccountActivityActionViewItem extends AccountsActivityActionViewItem {
    constructor(hoverOptions, options, themeService, lifecycleService, hoverService, contextMenuService, menuService, contextKeyService, authenticationService, environmentService, productService, configurationService, keybindingService, secretStorageService, storageService, logService, activityService, instantiationService, commandService) {
        super(() => simpleActivityContextMenuActions(storageService, true), {
            ...options,
            colors: (theme) => ({
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
            }),
            hoverOptions,
            compact: true,
        }, () => undefined, (actions) => actions, themeService, lifecycleService, hoverService, contextMenuService, menuService, contextKeyService, authenticationService, environmentService, productService, configurationService, keybindingService, secretStorageService, logService, activityService, instantiationService, commandService);
    }
};
SimpleAccountActivityActionViewItem = __decorate([
    __param(2, IThemeService),
    __param(3, ILifecycleService),
    __param(4, IHoverService),
    __param(5, IContextMenuService),
    __param(6, IMenuService),
    __param(7, IContextKeyService),
    __param(8, IAuthenticationService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IProductService),
    __param(11, IConfigurationService),
    __param(12, IKeybindingService),
    __param(13, ISecretStorageService),
    __param(14, IStorageService),
    __param(15, ILogService),
    __param(16, IActivityService),
    __param(17, IInstantiationService),
    __param(18, ICommandService)
], SimpleAccountActivityActionViewItem);
export { SimpleAccountActivityActionViewItem };
let SimpleGlobalActivityActionViewItem = class SimpleGlobalActivityActionViewItem extends GlobalActivityActionViewItem {
    constructor(hoverOptions, options, userDataProfileService, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, environmentService, keybindingService, instantiationService, activityService, storageService) {
        super(() => simpleActivityContextMenuActions(storageService, false), {
            ...options,
            colors: (theme) => ({
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
            }),
            hoverOptions,
            compact: true,
        }, () => undefined, userDataProfileService, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, environmentService, keybindingService, instantiationService, activityService);
    }
};
SimpleGlobalActivityActionViewItem = __decorate([
    __param(2, IUserDataProfileService),
    __param(3, IThemeService),
    __param(4, IHoverService),
    __param(5, IMenuService),
    __param(6, IContextMenuService),
    __param(7, IContextKeyService),
    __param(8, IConfigurationService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IKeybindingService),
    __param(11, IInstantiationService),
    __param(12, IActivityService),
    __param(13, IStorageService)
], SimpleGlobalActivityActionViewItem);
export { SimpleGlobalActivityActionViewItem };
function simpleActivityContextMenuActions(storageService, isAccount) {
    const currentElementContextMenuActions = [];
    if (isAccount) {
        currentElementContextMenuActions.push(toAction({
            id: 'hideAccounts',
            label: localize('hideAccounts', 'Hide Accounts'),
            run: () => setAccountsActionVisible(storageService, false),
        }), new Separator());
    }
    return [
        ...currentElementContextMenuActions,
        toAction({
            id: 'toggle.hideAccounts',
            label: localize('accounts', 'Accounts'),
            checked: isAccountsActionVisible(storageService),
            run: () => setAccountsActionVisible(storageService, !isAccountsActionVisible(storageService)),
        }),
        toAction({
            id: 'toggle.hideManage',
            label: localize('manage', 'Manage'),
            checked: true,
            enabled: false,
            run: () => {
                throw new Error('"Manage" can not be hidden');
            },
        }),
    ];
}
export function isAccountsActionVisible(storageService) {
    return storageService.getBoolean(AccountsActivityActionViewItem.ACCOUNTS_VISIBILITY_PREFERENCE_KEY, 0 /* StorageScope.PROFILE */, true);
}
function setAccountsActionVisible(storageService, visible) {
    storageService.store(AccountsActivityActionViewItem.ACCOUNTS_VISIBILITY_PREFERENCE_KEY, visible, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsQ29tcG9zaXRlQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9nbG9iYWxDb21wb3NpdGVCYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsU0FBUyxFQUFzQixNQUFNLGlEQUFpRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0UsT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzNGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRixPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLGtCQUFrQixHQUlsQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdFLE9BQU8sRUFDTixNQUFNLEVBRU4sU0FBUyxFQUNULGFBQWEsRUFDYixRQUFRLEdBQ1IsTUFBTSxpQ0FBaUMsQ0FBQTtB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
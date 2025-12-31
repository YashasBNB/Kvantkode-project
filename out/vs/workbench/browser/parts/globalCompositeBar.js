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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsQ29tcG9zaXRlQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZ2xvYmFsQ29tcG9zaXRlQmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLFNBQVMsRUFBc0IsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9FLE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMzRixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUNOLDBCQUEwQixFQUMxQixrQkFBa0IsR0FJbEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sTUFBTSxFQUVOLFNBQVMsRUFDVCxhQUFhLEVBQ2IsUUFBUSxHQUNSLE1BQU0saUNBQWlDLENBQUE7QUFDeEMs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
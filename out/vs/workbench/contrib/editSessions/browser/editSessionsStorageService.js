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
var EditSessionsWorkbenchService_1;
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { createSyncHeaders, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IAuthenticationService, } from '../../../services/authentication/common/authentication.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { EDIT_SESSIONS_SIGNED_IN, EDIT_SESSION_SYNC_CATEGORY, EDIT_SESSIONS_SIGNED_IN_KEY, IEditSessionsLogService, EDIT_SESSIONS_PENDING_KEY, } from '../common/editSessions.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { getCurrentAuthenticationSessionInfo } from '../../../services/authentication/browser/authenticationService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { UserDataSyncMachinesService, } from '../../../../platform/userDataSync/common/userDataSyncMachines.js';
import { Emitter } from '../../../../base/common/event.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
let EditSessionsWorkbenchService = class EditSessionsWorkbenchService extends Disposable {
    static { EditSessionsWorkbenchService_1 = this; }
    static { this.CACHED_SESSION_STORAGE_KEY = 'editSessionAccountPreference'; }
    get isSignedIn() {
        return this.existingSessionId !== undefined;
    }
    get onDidSignIn() {
        return this._didSignIn.event;
    }
    get onDidSignOut() {
        return this._didSignOut.event;
    }
    get lastWrittenResources() {
        return this._lastWrittenResources;
    }
    get lastReadResources() {
        return this._lastReadResources;
    }
    constructor(fileService, storageService, quickInputService, authenticationService, extensionService, environmentService, logService, productService, contextKeyService, dialogService, secretStorageService) {
        super();
        this.fileService = fileService;
        this.storageService = storageService;
        this.quickInputService = quickInputService;
        this.authenticationService = authenticationService;
        this.extensionService = extensionService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.productService = productService;
        this.contextKeyService = contextKeyService;
        this.dialogService = dialogService;
        this.secretStorageService = secretStorageService;
        this.SIZE_LIMIT = Math.floor(1024 * 1024 * 1.9); // 2 MB
        this.serverConfiguration = this.productService['editSessions.store'];
        this.initialized = false;
        this._didSignIn = new Emitter();
        this._didSignOut = new Emitter();
        this._lastWrittenResources = new Map();
        this._lastReadResources = new Map();
        // If the user signs out of the current session, reset our cached auth state in memory and on disk
        this._register(this.authenticationService.onDidChangeSessions((e) => this.onDidChangeSessions(e.event)));
        // If another window changes the preferred session storage, reset our cached auth state in memory
        this._register(this.storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, EditSessionsWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, this._store)(() => this.onDidChangeStorage()));
        this.registerSignInAction();
        this.registerResetAuthenticationAction();
        this.signedInContext = EDIT_SESSIONS_SIGNED_IN.bindTo(this.contextKeyService);
        this.signedInContext.set(this.existingSessionId !== undefined);
    }
    /**
     * @param resource: The resource to retrieve content for.
     * @param content An object representing resource state to be restored.
     * @returns The ref of the stored state.
     */
    async write(resource, content) {
        await this.initialize('write', false);
        if (!this.initialized) {
            throw new Error('Please sign in to store your edit session.');
        }
        if (typeof content !== 'string' && content.machine === undefined) {
            content.machine = await this.getOrCreateCurrentMachineId();
        }
        content = typeof content === 'string' ? content : JSON.stringify(content);
        const ref = await this.storeClient.writeResource(resource, content, null, undefined, createSyncHeaders(generateUuid()));
        this._lastWrittenResources.set(resource, { ref, content });
        return ref;
    }
    /**
     * @param resource: The resource to retrieve content for.
     * @param ref: A specific content ref to retrieve content for, if it exists.
     * If undefined, this method will return the latest saved edit session, if any.
     *
     * @returns An object representing the requested or latest state, if any.
     */
    async read(resource, ref) {
        await this.initialize('read', false);
        if (!this.initialized) {
            throw new Error('Please sign in to apply your latest edit session.');
        }
        let content;
        const headers = createSyncHeaders(generateUuid());
        try {
            if (ref !== undefined) {
                content = await this.storeClient?.resolveResourceContent(resource, ref, undefined, headers);
            }
            else {
                const result = await this.storeClient?.readResource(resource, null, undefined, headers);
                content = result?.content;
                ref = result?.ref;
            }
        }
        catch (ex) {
            this.logService.error(ex);
        }
        // TODO@joyceerhl Validate session data, check schema version
        if (content !== undefined && content !== null && ref !== undefined) {
            this._lastReadResources.set(resource, { ref, content });
            return { ref, content };
        }
        return undefined;
    }
    async delete(resource, ref) {
        await this.initialize('write', false);
        if (!this.initialized) {
            throw new Error(`Unable to delete edit session with ref ${ref}.`);
        }
        try {
            await this.storeClient?.deleteResource(resource, ref);
        }
        catch (ex) {
            this.logService.error(ex);
        }
    }
    async list(resource) {
        await this.initialize('read', false);
        if (!this.initialized) {
            throw new Error(`Unable to list edit sessions.`);
        }
        try {
            return this.storeClient?.getAllResourceRefs(resource) ?? [];
        }
        catch (ex) {
            this.logService.error(ex);
        }
        return [];
    }
    async initialize(reason, silent = false) {
        if (this.initialized) {
            return true;
        }
        this.initialized = await this.doInitialize(reason, silent);
        this.signedInContext.set(this.initialized);
        if (this.initialized) {
            this._didSignIn.fire();
        }
        return this.initialized;
    }
    /**
     *
     * Ensures that the store client is initialized,
     * meaning that authentication is configured and it
     * can be used to communicate with the remote storage service
     */
    async doInitialize(reason, silent) {
        // Wait for authentication extensions to be registered
        await this.extensionService.whenInstalledExtensionsRegistered();
        if (!this.serverConfiguration?.url) {
            throw new Error('Unable to initialize sessions sync as session sync preference is not configured in product.json.');
        }
        if (this.storeClient === undefined) {
            return false;
        }
        this._register(this.storeClient.onTokenFailed(() => {
            this.logService.info('Clearing edit sessions authentication preference because of successive token failures.');
            this.clearAuthenticationPreference();
        }));
        if (this.machineClient === undefined) {
            this.machineClient = new UserDataSyncMachinesService(this.environmentService, this.fileService, this.storageService, this.storeClient, this.logService, this.productService);
        }
        // If we already have an existing auth session in memory, use that
        if (this.authenticationInfo !== undefined) {
            return true;
        }
        const authenticationSession = await this.getAuthenticationSession(reason, silent);
        if (authenticationSession !== undefined) {
            this.authenticationInfo = authenticationSession;
            this.storeClient.setAuthToken(authenticationSession.token, authenticationSession.providerId);
        }
        return authenticationSession !== undefined;
    }
    async getMachineById(machineId) {
        await this.initialize('read', false);
        if (!this.cachedMachines) {
            const machines = await this.machineClient.getMachines();
            this.cachedMachines = machines.reduce((map, machine) => map.set(machine.id, machine.name), new Map());
        }
        return this.cachedMachines.get(machineId);
    }
    async getOrCreateCurrentMachineId() {
        const currentMachineId = await this.machineClient.getMachines().then((machines) => machines.find((m) => m.isCurrent)?.id);
        if (currentMachineId === undefined) {
            await this.machineClient.addCurrentMachine();
            return await this.machineClient.getMachines().then((machines) => machines.find((m) => m.isCurrent).id);
        }
        return currentMachineId;
    }
    async getAuthenticationSession(reason, silent) {
        // If the user signed in previously and the session is still available, reuse that without prompting the user again
        if (this.existingSessionId) {
            this.logService.info(`Searching for existing authentication session with ID ${this.existingSessionId}`);
            const existingSession = await this.getExistingSession();
            if (existingSession) {
                this.logService.info(`Found existing authentication session with ID ${existingSession.session.id}`);
                return {
                    sessionId: existingSession.session.id,
                    token: existingSession.session.idToken ?? existingSession.session.accessToken,
                    providerId: existingSession.session.providerId,
                };
            }
            else {
                this._didSignOut.fire();
            }
        }
        // If settings sync is already enabled, avoid asking again to authenticate
        if (this.shouldAttemptEditSessionInit()) {
            this.logService.info(`Reusing user data sync enablement`);
            const authenticationSessionInfo = await getCurrentAuthenticationSessionInfo(this.secretStorageService, this.productService);
            if (authenticationSessionInfo !== undefined) {
                this.logService.info(`Using current authentication session with ID ${authenticationSessionInfo.id}`);
                this.existingSessionId = authenticationSessionInfo.id;
                return {
                    sessionId: authenticationSessionInfo.id,
                    token: authenticationSessionInfo.accessToken,
                    providerId: authenticationSessionInfo.providerId,
                };
            }
        }
        // If we aren't supposed to prompt the user because
        // we're in a silent flow, just return here
        if (silent) {
            return;
        }
        // Ask the user to pick a preferred account
        const authenticationSession = await this.getAccountPreference(reason);
        if (authenticationSession !== undefined) {
            this.existingSessionId = authenticationSession.id;
            return {
                sessionId: authenticationSession.id,
                token: authenticationSession.idToken ?? authenticationSession.accessToken,
                providerId: authenticationSession.providerId,
            };
        }
        return undefined;
    }
    shouldAttemptEditSessionInit() {
        return (isWeb &&
            this.storageService.isNew(-1 /* StorageScope.APPLICATION */) &&
            this.storageService.isNew(1 /* StorageScope.WORKSPACE */));
    }
    /**
     *
     * Prompts the user to pick an authentication option for storing and getting edit sessions.
     */
    async getAccountPreference(reason) {
        const disposables = new DisposableStore();
        const quickpick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        quickpick.ok = false;
        quickpick.placeholder =
            reason === 'read'
                ? localize('choose account read placeholder', 'Select an account to restore your working changes from the cloud')
                : localize('choose account placeholder', 'Select an account to store your working changes in the cloud');
        quickpick.ignoreFocusOut = true;
        quickpick.items = await this.createQuickpickItems();
        return new Promise((resolve, reject) => {
            disposables.add(quickpick.onDidHide((e) => {
                reject(new CancellationError());
                disposables.dispose();
            }));
            disposables.add(quickpick.onDidAccept(async (e) => {
                const selection = quickpick.selectedItems[0];
                const session = 'provider' in selection
                    ? {
                        ...(await this.authenticationService.createSession(selection.provider.id, selection.provider.scopes)),
                        providerId: selection.provider.id,
                    }
                    : 'session' in selection
                        ? selection.session
                        : undefined;
                resolve(session);
                quickpick.hide();
            }));
            quickpick.show();
        });
    }
    async createQuickpickItems() {
        const options = [];
        options.push({ type: 'separator', label: localize('signed in', 'Signed In') });
        const sessions = await this.getAllSessions();
        options.push(...sessions);
        options.push({ type: 'separator', label: localize('others', 'Others') });
        for (const authenticationProvider of await this.getAuthenticationProviders()) {
            const signedInForProvider = sessions.some((account) => account.session.providerId === authenticationProvider.id);
            if (!signedInForProvider ||
                this.authenticationService.getProvider(authenticationProvider.id).supportsMultipleAccounts) {
                const providerName = this.authenticationService.getProvider(authenticationProvider.id).label;
                options.push({
                    label: localize('sign in using account', 'Sign in with {0}', providerName),
                    provider: authenticationProvider,
                });
            }
        }
        return options;
    }
    /**
     *
     * Returns all authentication sessions available from {@link getAuthenticationProviders}.
     */
    async getAllSessions() {
        const authenticationProviders = await this.getAuthenticationProviders();
        const accounts = new Map();
        let currentSession;
        for (const provider of authenticationProviders) {
            const sessions = await this.authenticationService.getSessions(provider.id, provider.scopes);
            for (const session of sessions) {
                const item = {
                    label: session.account.label,
                    description: this.authenticationService.getProvider(provider.id).label,
                    session: { ...session, providerId: provider.id },
                };
                accounts.set(item.session.account.id, item);
                if (this.existingSessionId === session.id) {
                    currentSession = item;
                }
            }
        }
        if (currentSession !== undefined) {
            accounts.set(currentSession.session.account.id, currentSession);
        }
        return [...accounts.values()].sort((a, b) => a.label.localeCompare(b.label));
    }
    /**
     *
     * Returns all authentication providers which can be used to authenticate
     * to the remote storage service, based on product.json configuration
     * and registered authentication providers.
     */
    async getAuthenticationProviders() {
        if (!this.serverConfiguration) {
            throw new Error('Unable to get configured authentication providers as session sync preference is not configured in product.json.');
        }
        // Get the list of authentication providers configured in product.json
        const authenticationProviders = this.serverConfiguration.authenticationProviders;
        const configuredAuthenticationProviders = Object.keys(authenticationProviders).reduce((result, id) => {
            result.push({ id, scopes: authenticationProviders[id].scopes });
            return result;
        }, []);
        // Filter out anything that isn't currently available through the authenticationService
        const availableAuthenticationProviders = this.authenticationService.declaredProviders;
        return configuredAuthenticationProviders.filter(({ id }) => availableAuthenticationProviders.some((provider) => provider.id === id));
    }
    get existingSessionId() {
        return this.storageService.get(EditSessionsWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
    }
    set existingSessionId(sessionId) {
        this.logService.trace(`Saving authentication session preference for ID ${sessionId}.`);
        if (sessionId === undefined) {
            this.storageService.remove(EditSessionsWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        }
        else {
            this.storageService.store(EditSessionsWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, sessionId, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
    }
    async getExistingSession() {
        const accounts = await this.getAllSessions();
        return accounts.find((account) => account.session.id === this.existingSessionId);
    }
    async onDidChangeStorage() {
        const newSessionId = this.existingSessionId;
        const previousSessionId = this.authenticationInfo?.sessionId;
        if (previousSessionId !== newSessionId) {
            this.logService.trace(`Resetting authentication state because authentication session ID preference changed from ${previousSessionId} to ${newSessionId}.`);
            this.authenticationInfo = undefined;
            this.initialized = false;
        }
    }
    clearAuthenticationPreference() {
        this.authenticationInfo = undefined;
        this.initialized = false;
        this.existingSessionId = undefined;
        this.signedInContext.set(false);
    }
    onDidChangeSessions(e) {
        if (this.authenticationInfo?.sessionId &&
            e.removed?.find((session) => session.id === this.authenticationInfo?.sessionId)) {
            this.clearAuthenticationPreference();
        }
    }
    registerSignInAction() {
        if (!this.serverConfiguration?.url) {
            return;
        }
        const that = this;
        const id = 'workbench.editSessions.actions.signIn';
        const when = ContextKeyExpr.and(ContextKeyExpr.equals(EDIT_SESSIONS_PENDING_KEY, false), ContextKeyExpr.equals(EDIT_SESSIONS_SIGNED_IN_KEY, false));
        this._register(registerAction2(class ResetEditSessionAuthenticationAction extends Action2 {
            constructor() {
                super({
                    id,
                    title: localize('sign in', 'Turn on Cloud Changes...'),
                    category: EDIT_SESSION_SYNC_CATEGORY,
                    precondition: when,
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                        },
                        {
                            id: MenuId.AccountsContext,
                            group: '2_editSessions',
                            when,
                        },
                    ],
                });
            }
            async run() {
                return await that.initialize('write', false);
            }
        }));
        this._register(MenuRegistry.appendMenuItem(MenuId.AccountsContext, {
            group: '2_editSessions',
            command: {
                id,
                title: localize('sign in badge', 'Turn on Cloud Changes... (1)'),
            },
            when: ContextKeyExpr.and(ContextKeyExpr.equals(EDIT_SESSIONS_PENDING_KEY, true), ContextKeyExpr.equals(EDIT_SESSIONS_SIGNED_IN_KEY, false)),
        }));
    }
    registerResetAuthenticationAction() {
        const that = this;
        this._register(registerAction2(class ResetEditSessionAuthenticationAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.resetAuth',
                    title: localize('reset auth.v3', 'Turn off Cloud Changes...'),
                    category: EDIT_SESSION_SYNC_CATEGORY,
                    precondition: ContextKeyExpr.equals(EDIT_SESSIONS_SIGNED_IN_KEY, true),
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                        },
                        {
                            id: MenuId.AccountsContext,
                            group: '2_editSessions',
                            when: ContextKeyExpr.equals(EDIT_SESSIONS_SIGNED_IN_KEY, true),
                        },
                    ],
                });
            }
            async run() {
                const result = await that.dialogService.confirm({
                    message: localize('sign out of cloud changes clear data prompt', 'Do you want to disable storing working changes in the cloud?'),
                    checkbox: {
                        label: localize('delete all cloud changes', 'Delete all stored data from the cloud.'),
                    },
                });
                if (result.confirmed) {
                    if (result.checkboxChecked) {
                        that.storeClient?.deleteResource('editSessions', null);
                    }
                    that.clearAuthenticationPreference();
                }
            }
        }));
    }
};
EditSessionsWorkbenchService = EditSessionsWorkbenchService_1 = __decorate([
    __param(0, IFileService),
    __param(1, IStorageService),
    __param(2, IQuickInputService),
    __param(3, IAuthenticationService),
    __param(4, IExtensionService),
    __param(5, IEnvironmentService),
    __param(6, IEditSessionsLogService),
    __param(7, IProductService),
    __param(8, IContextKeyService),
    __param(9, IDialogService),
    __param(10, ISecretStorageService)
], EditSessionsWorkbenchService);
export { EditSessionsWorkbenchService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zU3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRTZXNzaW9ucy9icm93c2VyL2VkaXRTZXNzaW9uc1N0b3JhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sT0FBTyxFQUNQLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixrQkFBa0IsR0FHbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLGlCQUFpQixHQUdqQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFHTixzQkFBc0IsR0FDdEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQ04sdUJBQXVCLEVBRXZCLDBCQUEwQixFQUUxQiwyQkFBMkIs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
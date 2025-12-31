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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zU3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lZGl0U2Vzc2lvbnMvYnJvd3Nlci9lZGl0U2Vzc2lvbnNTdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLE9BQU8sRUFDUCxNQUFNLEVBQ04sWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sa0JBQWtCLEdBR2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixpQkFBaUIsR0FHakIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBR04sc0JBQXNCLEdBQ3RCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUNOLHVCQUF1QixFQUV2QiwwQkFBMEIsRUFFMUIsMkJBQTJCLEVBQzNCLHVCQUF1QixFQUV2Qix5QkFB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
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
import { Action } from '../../../../base/common/actions.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { isNumber, isObject, isString } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { CONFIGURATION_KEY_HOST_NAME, CONFIGURATION_KEY_PREFIX, CONFIGURATION_KEY_PREVENT_SLEEP, INACTIVE_TUNNEL_MODE, IRemoteTunnelService, LOGGER_NAME, LOG_ID, } from '../../../../platform/remoteTunnel/common/remoteTunnel.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService, isUntitledWorkspace, } from '../../../../platform/workspace/common/workspace.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { IAuthenticationService, } from '../../../services/authentication/common/authentication.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
export const REMOTE_TUNNEL_CATEGORY = localize2('remoteTunnel.category', 'Remote Tunnels');
export const REMOTE_TUNNEL_CONNECTION_STATE_KEY = 'remoteTunnelConnection';
export const REMOTE_TUNNEL_CONNECTION_STATE = new RawContextKey(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'disconnected');
const REMOTE_TUNNEL_USED_STORAGE_KEY = 'remoteTunnelServiceUsed';
const REMOTE_TUNNEL_PROMPTED_PREVIEW_STORAGE_KEY = 'remoteTunnelServicePromptedPreview';
const REMOTE_TUNNEL_EXTENSION_RECOMMENDED_KEY = 'remoteTunnelExtensionRecommended';
const REMOTE_TUNNEL_HAS_USED_BEFORE = 'remoteTunnelHasUsed';
const REMOTE_TUNNEL_EXTENSION_TIMEOUT = 4 * 60 * 1000; // show the recommendation that a machine started using tunnels if it joined less than 4 minutes ago
const INVALID_TOKEN_RETRIES = 2;
var RemoteTunnelCommandIds;
(function (RemoteTunnelCommandIds) {
    RemoteTunnelCommandIds["turnOn"] = "workbench.remoteTunnel.actions.turnOn";
    RemoteTunnelCommandIds["turnOff"] = "workbench.remoteTunnel.actions.turnOff";
    RemoteTunnelCommandIds["connecting"] = "workbench.remoteTunnel.actions.connecting";
    RemoteTunnelCommandIds["manage"] = "workbench.remoteTunnel.actions.manage";
    RemoteTunnelCommandIds["showLog"] = "workbench.remoteTunnel.actions.showLog";
    RemoteTunnelCommandIds["configure"] = "workbench.remoteTunnel.actions.configure";
    RemoteTunnelCommandIds["copyToClipboard"] = "workbench.remoteTunnel.actions.copyToClipboard";
    RemoteTunnelCommandIds["learnMore"] = "workbench.remoteTunnel.actions.learnMore";
})(RemoteTunnelCommandIds || (RemoteTunnelCommandIds = {}));
// name shown in nofications
var RemoteTunnelCommandLabels;
(function (RemoteTunnelCommandLabels) {
    RemoteTunnelCommandLabels.turnOn = localize('remoteTunnel.actions.turnOn', 'Turn on Remote Tunnel Access...');
    RemoteTunnelCommandLabels.turnOff = localize('remoteTunnel.actions.turnOff', 'Turn off Remote Tunnel Access...');
    RemoteTunnelCommandLabels.showLog = localize('remoteTunnel.actions.showLog', 'Show Remote Tunnel Service Log');
    RemoteTunnelCommandLabels.configure = localize('remoteTunnel.actions.configure', 'Configure Tunnel Name...');
    RemoteTunnelCommandLabels.copyToClipboard = localize('remoteTunnel.actions.copyToClipboard', 'Copy Browser URI to Clipboard');
    RemoteTunnelCommandLabels.learnMore = localize('remoteTunnel.actions.learnMore', 'Get Started with Tunnels');
})(RemoteTunnelCommandLabels || (RemoteTunnelCommandLabels = {}));
let RemoteTunnelWorkbenchContribution = class RemoteTunnelWorkbenchContribution extends Disposable {
    constructor(authenticationService, dialogService, extensionService, contextKeyService, productService, storageService, loggerService, quickInputService, environmentService, remoteTunnelService, commandService, workspaceContextService, progressService, notificationService) {
        super();
        this.authenticationService = authenticationService;
        this.dialogService = dialogService;
        this.extensionService = extensionService;
        this.contextKeyService = contextKeyService;
        this.storageService = storageService;
        this.quickInputService = quickInputService;
        this.environmentService = environmentService;
        this.remoteTunnelService = remoteTunnelService;
        this.commandService = commandService;
        this.workspaceContextService = workspaceContextService;
        this.progressService = progressService;
        this.notificationService = notificationService;
        this.expiredSessions = new Set();
        this.logger = this._register(loggerService.createLogger(joinPath(environmentService.logsHome, `${LOG_ID}.log`), {
            id: LOG_ID,
            name: LOGGER_NAME,
        }));
        this.connectionStateContext = REMOTE_TUNNEL_CONNECTION_STATE.bindTo(this.contextKeyService);
        const serverConfiguration = productService.tunnelApplicationConfig;
        if (!serverConfiguration || !productService.tunnelApplicationName) {
            this.logger.error("Missing 'tunnelApplicationConfig' or 'tunnelApplicationName' in product.json. Remote tunneling is not available.");
            this.serverConfiguration = {
                authenticationProviders: {},
                editorWebUrl: '',
                extension: { extensionId: '', friendlyName: '' },
            };
            return;
        }
        this.serverConfiguration = serverConfiguration;
        this._register(this.remoteTunnelService.onDidChangeTunnelStatus((s) => this.handleTunnelStatusUpdate(s)));
        this.registerCommands();
        this.initialize();
        this.recommendRemoteExtensionIfNeeded();
    }
    handleTunnelStatusUpdate(status) {
        this.connectionInfo = undefined;
        if (status.type === 'disconnected') {
            if (status.onTokenFailed) {
                this.expiredSessions.add(status.onTokenFailed.sessionId);
            }
            this.connectionStateContext.set('disconnected');
        }
        else if (status.type === 'connecting') {
            this.connectionStateContext.set('connecting');
        }
        else if (status.type === 'connected') {
            this.connectionInfo = status.info;
            this.connectionStateContext.set('connected');
        }
    }
    async recommendRemoteExtensionIfNeeded() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const remoteExtension = this.serverConfiguration.extension;
        const shouldRecommend = async () => {
            if (this.storageService.getBoolean(REMOTE_TUNNEL_EXTENSION_RECOMMENDED_KEY, -1 /* StorageScope.APPLICATION */)) {
                return false;
            }
            if (await this.extensionService.getExtension(remoteExtension.extensionId)) {
                return false;
            }
            const usedOnHostMessage = this.storageService.get(REMOTE_TUNNEL_USED_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            if (!usedOnHostMessage) {
                return false;
            }
            let usedTunnelName;
            try {
                const message = JSON.parse(usedOnHostMessage);
                if (!isObject(message)) {
                    return false;
                }
                const { hostName, timeStamp } = message;
                if (!isString(hostName) ||
                    !isNumber(timeStamp) ||
                    new Date().getTime() > timeStamp + REMOTE_TUNNEL_EXTENSION_TIMEOUT) {
                    return false;
                }
                usedTunnelName = hostName;
            }
            catch (_) {
                // problems parsing the message, likly the old message format
                return false;
            }
            const currentTunnelName = await this.remoteTunnelService.getTunnelName();
            if (!currentTunnelName || currentTunnelName === usedTunnelName) {
                return false;
            }
            return usedTunnelName;
        };
        const recommed = async () => {
            const usedOnHost = await shouldRecommend();
            if (!usedOnHost) {
                return false;
            }
            this.notificationService.notify({
                severity: Severity.Info,
                message: localize({
                    key: 'recommend.remoteExtension',
                    comment: [
                        '{0} will be a tunnel name, {1} will the link address to the web UI, {6} an extension name. [label](command:commandId) is a markdown link. Only translate the label, do not modify the format',
                    ],
                }, "Tunnel '{0}' is avaiable for remote access. The {1} extension can be used to connect to it.", usedOnHost, remoteExtension.friendlyName),
                actions: {
                    primary: [
                        new Action('showExtension', localize('action.showExtension', 'Show Extension'), undefined, true, () => {
                            return this.commandService.executeCommand('workbench.extensions.action.showExtensionsWithIds', [remoteExtension.extensionId]);
                        }),
                        new Action('doNotShowAgain', localize('action.doNotShowAgain', 'Do not show again'), undefined, true, () => {
                            this.storageService.store(REMOTE_TUNNEL_EXTENSION_RECOMMENDED_KEY, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                        }),
                    ],
                },
            });
            return true;
        };
        if (await shouldRecommend()) {
            const disposables = this._register(new DisposableStore());
            disposables.add(this.storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, REMOTE_TUNNEL_USED_STORAGE_KEY, disposables)(async () => {
                const success = await recommed();
                if (success) {
                    disposables.dispose();
                }
            }));
        }
    }
    async initialize() {
        const [mode, status] = await Promise.all([
            this.remoteTunnelService.getMode(),
            this.remoteTunnelService.getTunnelStatus(),
        ]);
        this.handleTunnelStatusUpdate(status);
        if (mode.active && mode.session.token) {
            return; // already initialized, token available
        }
        const doInitialStateDiscovery = async (progress) => {
            const listener = progress &&
                this.remoteTunnelService.onDidChangeTunnelStatus((status) => {
                    switch (status.type) {
                        case 'connecting':
                            if (status.progress) {
                                progress.report({ message: status.progress });
                            }
                            break;
                    }
                });
            let newSession;
            if (mode.active) {
                const token = await this.getSessionToken(mode.session);
                if (token) {
                    newSession = { ...mode.session, token };
                }
            }
            const status = await this.remoteTunnelService.initialize(mode.active && newSession ? { ...mode, session: newSession } : INACTIVE_TUNNEL_MODE);
            listener?.dispose();
            if (status.type === 'connected') {
                this.connectionInfo = status.info;
                this.connectionStateContext.set('connected');
                return;
            }
        };
        const hasUsed = this.storageService.getBoolean(REMOTE_TUNNEL_HAS_USED_BEFORE, -1 /* StorageScope.APPLICATION */, false);
        if (hasUsed) {
            await this.progressService.withProgress({
                location: 10 /* ProgressLocation.Window */,
                title: localize({
                    key: 'initialize.progress.title',
                    comment: [
                        "Only translate 'Looking for remote tunnel', do not change the format of the rest (markdown link format)",
                    ],
                }, '[Looking for remote tunnel](command:{0})', RemoteTunnelCommandIds.showLog),
            }, doInitialStateDiscovery);
        }
        else {
            doInitialStateDiscovery(undefined);
        }
    }
    getPreferredTokenFromSession(session) {
        return session.session.accessToken || session.session.idToken;
    }
    async startTunnel(asService) {
        if (this.connectionInfo) {
            return this.connectionInfo;
        }
        this.storageService.store(REMOTE_TUNNEL_HAS_USED_BEFORE, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        let tokenProblems = false;
        for (let i = 0; i < INVALID_TOKEN_RETRIES; i++) {
            tokenProblems = false;
            const authenticationSession = await this.getAuthenticationSession();
            if (authenticationSession === undefined) {
                this.logger.info('No authentication session available, not starting tunnel');
                return undefined;
            }
            const result = await this.progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: localize({
                    key: 'startTunnel.progress.title',
                    comment: [
                        "Only translate 'Starting remote tunnel', do not change the format of the rest (markdown link format)",
                    ],
                }, '[Starting remote tunnel](command:{0})', RemoteTunnelCommandIds.showLog),
            }, (progress) => {
                return new Promise((s, e) => {
                    let completed = false;
                    const listener = this.remoteTunnelService.onDidChangeTunnelStatus((status) => {
                        switch (status.type) {
                            case 'connecting':
                                if (status.progress) {
                                    progress.report({ message: status.progress });
                                }
                                break;
                            case 'connected':
                                listener.dispose();
                                completed = true;
                                s(status.info);
                                if (status.serviceInstallFailed) {
                                    this.notificationService.notify({
                                        severity: Severity.Warning,
                                        message: localize({
                                            key: 'remoteTunnel.serviceInstallFailed',
                                            comment: ['{Locked="](command:{0})"}'],
                                        }, 'Installation as a service failed, and we fell back to running the tunnel for this session. See the [error log](command:{0}) for details.', RemoteTunnelCommandIds.showLog),
                                    });
                                }
                                break;
                            case 'disconnected':
                                listener.dispose();
                                completed = true;
                                tokenProblems = !!status.onTokenFailed;
                                s(undefined);
                                break;
                        }
                    });
                    const token = this.getPreferredTokenFromSession(authenticationSession);
                    const account = {
                        sessionId: authenticationSession.session.id,
                        token,
                        providerId: authenticationSession.providerId,
                        accountLabel: authenticationSession.session.account.label,
                    };
                    this.remoteTunnelService
                        .startTunnel({ active: true, asService, session: account })
                        .then((status) => {
                        if (!completed && (status.type === 'connected' || status.type === 'disconnected')) {
                            listener.dispose();
                            if (status.type === 'connected') {
                                s(status.info);
                            }
                            else {
                                tokenProblems = !!status.onTokenFailed;
                                s(undefined);
                            }
                        }
                    });
                });
            });
            if (result || !tokenProblems) {
                return result;
            }
        }
        return undefined;
    }
    async getAuthenticationSession() {
        const sessions = await this.getAllSessions();
        const disposables = new DisposableStore();
        const quickpick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        quickpick.ok = false;
        quickpick.placeholder = localize('accountPreference.placeholder', 'Sign in to an account to enable remote access');
        quickpick.ignoreFocusOut = true;
        quickpick.items = await this.createQuickpickItems(sessions);
        return new Promise((resolve, reject) => {
            disposables.add(quickpick.onDidHide((e) => {
                resolve(undefined);
                disposables.dispose();
            }));
            disposables.add(quickpick.onDidAccept(async (e) => {
                const selection = quickpick.selectedItems[0];
                if ('provider' in selection) {
                    const session = await this.authenticationService.createSession(selection.provider.id, selection.provider.scopes);
                    resolve(this.createExistingSessionItem(session, selection.provider.id));
                }
                else if ('session' in selection) {
                    resolve(selection);
                }
                else {
                    resolve(undefined);
                }
                quickpick.hide();
            }));
            quickpick.show();
        });
    }
    createExistingSessionItem(session, providerId) {
        return {
            label: session.account.label,
            description: this.authenticationService.getProvider(providerId).label,
            session,
            providerId,
        };
    }
    async createQuickpickItems(sessions) {
        const options = [];
        if (sessions.length) {
            options.push({ type: 'separator', label: localize('signed in', 'Signed In') });
            options.push(...sessions);
            options.push({ type: 'separator', label: localize('others', 'Others') });
        }
        for (const authenticationProvider of await this.getAuthenticationProviders()) {
            const signedInForProvider = sessions.some((account) => account.providerId === authenticationProvider.id);
            const provider = this.authenticationService.getProvider(authenticationProvider.id);
            if (!signedInForProvider || provider.supportsMultipleAccounts) {
                options.push({
                    label: localize({
                        key: 'sign in using account',
                        comment: ['{0} will be a auth provider (e.g. Github)'],
                    }, 'Sign in with {0}', provider.label),
                    provider: authenticationProvider,
                });
            }
        }
        return options;
    }
    /**
     * Returns all authentication sessions available from {@link getAuthenticationProviders}.
     */
    async getAllSessions() {
        const authenticationProviders = await this.getAuthenticationProviders();
        const accounts = new Map();
        const currentAccount = await this.remoteTunnelService.getMode();
        let currentSession;
        for (const provider of authenticationProviders) {
            const sessions = await this.authenticationService.getSessions(provider.id, provider.scopes);
            for (const session of sessions) {
                if (!this.expiredSessions.has(session.id)) {
                    const item = this.createExistingSessionItem(session, provider.id);
                    accounts.set(item.session.account.id, item);
                    if (currentAccount.active && currentAccount.session.sessionId === session.id) {
                        currentSession = item;
                    }
                }
            }
        }
        if (currentSession !== undefined) {
            accounts.set(currentSession.session.account.id, currentSession);
        }
        return [...accounts.values()];
    }
    async getSessionToken(session) {
        if (session) {
            const sessionItem = (await this.getAllSessions()).find((s) => s.session.id === session.sessionId);
            if (sessionItem) {
                return this.getPreferredTokenFromSession(sessionItem);
            }
        }
        return undefined;
    }
    /**
     * Returns all authentication providers which can be used to authenticate
     * to the remote storage service, based on product.json configuration
     * and registered authentication providers.
     */
    async getAuthenticationProviders() {
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
    registerCommands() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.turnOn,
                    title: RemoteTunnelCommandLabels.turnOn,
                    category: REMOTE_TUNNEL_CATEGORY,
                    precondition: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'disconnected'),
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                        },
                        {
                            id: MenuId.AccountsContext,
                            group: '2_remoteTunnel',
                            when: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'disconnected'),
                        },
                    ],
                });
            }
            async run(accessor) {
                const notificationService = accessor.get(INotificationService);
                const clipboardService = accessor.get(IClipboardService);
                const commandService = accessor.get(ICommandService);
                const storageService = accessor.get(IStorageService);
                const dialogService = accessor.get(IDialogService);
                const quickInputService = accessor.get(IQuickInputService);
                const productService = accessor.get(IProductService);
                const didNotifyPreview = storageService.getBoolean(REMOTE_TUNNEL_PROMPTED_PREVIEW_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, false);
                if (!didNotifyPreview) {
                    const { confirmed } = await dialogService.confirm({
                        message: localize('tunnel.preview', 'Remote Tunnels is currently in preview. Please report any problems using the "Help: Report Issue" command.'),
                        primaryButton: localize({ key: 'enable', comment: ['&& denotes a mnemonic'] }, '&&Enable'),
                    });
                    if (!confirmed) {
                        return;
                    }
                    storageService.store(REMOTE_TUNNEL_PROMPTED_PREVIEW_STORAGE_KEY, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
                const disposables = new DisposableStore();
                const quickPick = quickInputService.createQuickPick();
                quickPick.placeholder = localize('tunnel.enable.placeholder', 'Select how you want to enable access');
                quickPick.items = [
                    {
                        service: false,
                        label: localize('tunnel.enable.session', 'Turn on for this session'),
                        description: localize('tunnel.enable.session.description', 'Run whenever {0} is open', productService.nameShort),
                    },
                    {
                        service: true,
                        label: localize('tunnel.enable.service', 'Install as a service'),
                        description: localize('tunnel.enable.service.description', "Run whenever you're logged in"),
                    },
                ];
                const asService = await new Promise((resolve) => {
                    disposables.add(quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0]?.service)));
                    disposables.add(quickPick.onDidHide(() => resolve(undefined)));
                    quickPick.show();
                });
                quickPick.dispose();
                if (asService === undefined) {
                    return; // no-op
                }
                const connectionInfo = await that.startTunnel(/* installAsService= */ asService);
                if (connectionInfo) {
                    const linkToOpen = that.getLinkToOpen(connectionInfo);
                    const remoteExtension = that.serverConfiguration.extension;
                    const linkToOpenForMarkdown = linkToOpen.toString(false).replace(/\)/g, '%29');
                    notificationService.notify({
                        severity: Severity.Info,
                        message: localize({
                            key: 'progress.turnOn.final',
                            comment: [
                                '{0} will be the tunnel name, {1} will the link address to the web UI, {6} an extension name, {7} a link to the extension documentation. [label](command:commandId) is a markdown link. Only translate the label, do not modify the format',
                            ],
                        }, 'You can now access this machine anywhere via the secure tunnel [{0}](command:{4}). To connect via a different machine, use the generated [{1}]({2}) link or use the [{6}]({7}) extension in the desktop or web. You can [configure](command:{3}) or [turn off](command:{5}) this access via the VS Code Accounts menu.', connectionInfo.tunnelName, connectionInfo.domain, linkToOpenForMarkdown, RemoteTunnelCommandIds.manage, RemoteTunnelCommandIds.configure, RemoteTunnelCommandIds.turnOff, remoteExtension.friendlyName, 'https://code.visualstudio.com/docs/remote/tunnels'),
                        actions: {
                            primary: [
                                new Action('copyToClipboard', localize('action.copyToClipboard', 'Copy Browser Link to Clipboard'), undefined, true, () => clipboardService.writeText(linkToOpen.toString(true))),
                                new Action('showExtension', localize('action.showExtension', 'Show Extension'), undefined, true, () => {
                                    return commandService.executeCommand('workbench.extensions.action.showExtensionsWithIds', [remoteExtension.extensionId]);
                                }),
                            ],
                        },
                    });
                    const usedOnHostMessage = {
                        hostName: connectionInfo.tunnelName,
                        timeStamp: new Date().getTime(),
                    };
                    storageService.store(REMOTE_TUNNEL_USED_STORAGE_KEY, JSON.stringify(usedOnHostMessage), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
                else {
                    notificationService.notify({
                        severity: Severity.Info,
                        message: localize('progress.turnOn.failed', 'Unable to turn on the remote tunnel access. Check the Remote Tunnel Service log for details.'),
                    });
                    await commandService.executeCommand(RemoteTunnelCommandIds.showLog);
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.manage,
                    title: localize('remoteTunnel.actions.manage.on.v2', 'Remote Tunnel Access is On'),
                    category: REMOTE_TUNNEL_CATEGORY,
                    menu: [
                        {
                            id: MenuId.AccountsContext,
                            group: '2_remoteTunnel',
                            when: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'connected'),
                        },
                    ],
                });
            }
            async run() {
                that.showManageOptions();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.connecting,
                    title: localize('remoteTunnel.actions.manage.connecting', 'Remote Tunnel Access is Connecting'),
                    category: REMOTE_TUNNEL_CATEGORY,
                    menu: [
                        {
                            id: MenuId.AccountsContext,
                            group: '2_remoteTunnel',
                            when: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'connecting'),
                        },
                    ],
                });
            }
            async run() {
                that.showManageOptions();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.turnOff,
                    title: RemoteTunnelCommandLabels.turnOff,
                    category: REMOTE_TUNNEL_CATEGORY,
                    precondition: ContextKeyExpr.notEquals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'disconnected'),
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.notEquals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, ''),
                        },
                    ],
                });
            }
            async run() {
                const message = that.connectionInfo?.isAttached
                    ? localize('remoteTunnel.turnOffAttached.confirm', 'Do you want to turn off Remote Tunnel Access? This will also stop the service that was started externally.')
                    : localize('remoteTunnel.turnOff.confirm', 'Do you want to turn off Remote Tunnel Access?');
                const { confirmed } = await that.dialogService.confirm({ message });
                if (confirmed) {
                    that.remoteTunnelService.stopTunnel();
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.showLog,
                    title: RemoteTunnelCommandLabels.showLog,
                    category: REMOTE_TUNNEL_CATEGORY,
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.notEquals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, ''),
                        },
                    ],
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                outputService.showChannel(LOG_ID);
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.configure,
                    title: RemoteTunnelCommandLabels.configure,
                    category: REMOTE_TUNNEL_CATEGORY,
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.notEquals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, ''),
                        },
                    ],
                });
            }
            async run(accessor) {
                const preferencesService = accessor.get(IPreferencesService);
                preferencesService.openSettings({ query: CONFIGURATION_KEY_PREFIX });
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.copyToClipboard,
                    title: RemoteTunnelCommandLabels.copyToClipboard,
                    category: REMOTE_TUNNEL_CATEGORY,
                    precondition: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'connected'),
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'connected'),
                        },
                    ],
                });
            }
            async run(accessor) {
                const clipboardService = accessor.get(IClipboardService);
                if (that.connectionInfo) {
                    const linkToOpen = that.getLinkToOpen(that.connectionInfo);
                    clipboardService.writeText(linkToOpen.toString(true));
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.learnMore,
                    title: RemoteTunnelCommandLabels.learnMore,
                    category: REMOTE_TUNNEL_CATEGORY,
                    menu: [],
                });
            }
            async run(accessor) {
                const openerService = accessor.get(IOpenerService);
                await openerService.open('https://aka.ms/vscode-server-doc');
            }
        }));
    }
    getLinkToOpen(connectionInfo) {
        const workspace = this.workspaceContextService.getWorkspace();
        const folders = workspace.folders;
        let resource;
        if (folders.length === 1) {
            resource = folders[0].uri;
        }
        else if (workspace.configuration &&
            !isUntitledWorkspace(workspace.configuration, this.environmentService)) {
            resource = workspace.configuration;
        }
        const link = URI.parse(connectionInfo.link);
        if (resource?.scheme === Schemas.file) {
            return joinPath(link, resource.path);
        }
        return joinPath(link, this.environmentService.userHome.path);
    }
    async showManageOptions() {
        const account = await this.remoteTunnelService.getMode();
        return new Promise((c, e) => {
            const disposables = new DisposableStore();
            const quickPick = this.quickInputService.createQuickPick({ useSeparators: true });
            quickPick.placeholder = localize('manage.placeholder', 'Select a command to invoke');
            disposables.add(quickPick);
            const items = [];
            items.push({
                id: RemoteTunnelCommandIds.learnMore,
                label: RemoteTunnelCommandLabels.learnMore,
            });
            if (this.connectionInfo) {
                quickPick.title = this.connectionInfo.isAttached
                    ? localize({ key: 'manage.title.attached', comment: ['{0} is the tunnel name'] }, 'Remote Tunnel Access enabled for {0} (launched externally)', this.connectionInfo.tunnelName)
                    : localize({ key: 'manage.title.orunning', comment: ['{0} is the tunnel name'] }, 'Remote Tunnel Access enabled for {0}', this.connectionInfo.tunnelName);
                items.push({
                    id: RemoteTunnelCommandIds.copyToClipboard,
                    label: RemoteTunnelCommandLabels.copyToClipboard,
                    description: this.connectionInfo.domain,
                });
            }
            else {
                quickPick.title = localize('manage.title.off', 'Remote Tunnel Access not enabled');
            }
            items.push({
                id: RemoteTunnelCommandIds.showLog,
                label: localize('manage.showLog', 'Show Log'),
            });
            items.push({ type: 'separator' });
            items.push({
                id: RemoteTunnelCommandIds.configure,
                label: localize('manage.tunnelName', 'Change Tunnel Name'),
                description: this.connectionInfo?.tunnelName,
            });
            items.push({
                id: RemoteTunnelCommandIds.turnOff,
                label: RemoteTunnelCommandLabels.turnOff,
                description: account.active
                    ? `${account.session.accountLabel} (${account.session.providerId})`
                    : undefined,
            });
            quickPick.items = items;
            disposables.add(quickPick.onDidAccept(() => {
                if (quickPick.selectedItems[0] && quickPick.selectedItems[0].id) {
                    this.commandService.executeCommand(quickPick.selectedItems[0].id);
                }
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidHide(() => {
                disposables.dispose();
                c();
            }));
            quickPick.show();
        });
    }
};
RemoteTunnelWorkbenchContribution = __decorate([
    __param(0, IAuthenticationService),
    __param(1, IDialogService),
    __param(2, IExtensionService),
    __param(3, IContextKeyService),
    __param(4, IProductService),
    __param(5, IStorageService),
    __param(6, ILoggerService),
    __param(7, IQuickInputService),
    __param(8, INativeEnvironmentService),
    __param(9, IRemoteTunnelService),
    __param(10, ICommandService),
    __param(11, IWorkspaceContextService),
    __param(12, IProgressService),
    __param(13, INotificationService)
], RemoteTunnelWorkbenchContribution);
export { RemoteTunnelWorkbenchContribution };
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(RemoteTunnelWorkbenchContribution, 3 /* LifecyclePhase.Restored */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    type: 'object',
    properties: {
        [CONFIGURATION_KEY_HOST_NAME]: {
            description: localize('remoteTunnelAccess.machineName', 'The name under which the remote tunnel access is registered. If not set, the host name is used.'),
            type: 'string',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            ignoreSync: true,
            pattern: '^(\\w[\\w-]*)?$',
            patternErrorMessage: localize('remoteTunnelAccess.machineNameRegex', 'The name must only consist of letters, numbers, underscore and dash. It must not start with a dash.'),
            maxLength: 20,
            default: '',
        },
        [CONFIGURATION_KEY_PREVENT_SLEEP]: {
            description: localize('remoteTunnelAccess.preventSleep', 'Prevent this computer from sleeping when remote tunnel access is turned on.'),
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            default: false,
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVHVubmVsLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZVR1bm5lbC9lbGVjdHJvbi1zYW5kYm94L3JlbW90ZVR1bm5lbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsR0FHckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RB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
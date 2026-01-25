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
var RemoteStatusIndicator_1;
import * as nls from '../../../../nls.js';
import { IRemoteAgentService, remoteConnectionLatencyMeasurer, } from '../../../services/remote/common/remoteAgentService.js';
import { RunOnceScheduler, retry } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { MenuId, IMenuService, MenuItemAction, MenuRegistry, registerAction2, Action2, } from '../../../../platform/actions/common/actions.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Schemas } from '../../../../base/common/network.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { PlatformToString, isWeb, platform, } from '../../../../base/common/platform.js';
import { truncate } from '../../../../base/common/strings.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { getRemoteName } from '../../../../platform/remote/common/remoteHosts.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { getCodiconAriaLabel } from '../../../../base/common/iconLabels.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ReloadWindowAction } from '../../../browser/actions/windowActions.js';
import { EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT, IExtensionGalleryService, IExtensionManagementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionsWorkbenchService, LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID, } from '../../extensions/common/extensions.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { RemoteNameContext, VirtualWorkspaceContext } from '../../../common/contextkeys.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { infoIcon } from '../../extensions/browser/extensionsIcons.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../base/common/severity.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
let RemoteStatusIndicator = class RemoteStatusIndicator extends Disposable {
    static { RemoteStatusIndicator_1 = this; }
    static { this.ID = 'workbench.contrib.remoteStatusIndicator'; }
    static { this.REMOTE_ACTIONS_COMMAND_ID = 'workbench.action.remote.showMenu'; }
    static { this.CLOSE_REMOTE_COMMAND_ID = 'workbench.action.remote.close'; }
    static { this.SHOW_CLOSE_REMOTE_COMMAND_ID = !isWeb; } // web does not have a "Close Remote" command
    static { this.INSTALL_REMOTE_EXTENSIONS_ID = 'workbench.action.remote.extensions'; }
    static { this.REMOTE_STATUS_LABEL_MAX_LENGTH = 40; }
    static { this.REMOTE_CONNECTION_LATENCY_SCHEDULER_DELAY = 60 * 1000; }
    static { this.REMOTE_CONNECTION_LATENCY_SCHEDULER_FIRST_RUN_DELAY = 10 * 1000; }
    get remoteExtensionMetadata() {
        if (!this._remoteExtensionMetadata) {
            const remoteExtensionTips = {
                ...this.productService.remoteExtensionTips,
                ...this.productService.virtualWorkspaceExtensionTips,
            };
            this._remoteExtensionMetadata = Object.values(remoteExtensionTips)
                .filter((value) => value.startEntry !== undefined)
                .map((value) => {
                return {
                    id: value.extensionId,
                    installed: false,
                    friendlyName: value.friendlyName,
                    isPlatformCompatible: false,
                    dependencies: [],
                    helpLink: value.startEntry?.helpLink ?? '',
                    startConnectLabel: value.startEntry?.startConnectLabel ?? '',
                    startCommand: value.startEntry?.startCommand ?? '',
                    priority: value.startEntry?.priority ?? 10,
                    supportedPlatforms: value.supportedPlatforms,
                };
            });
            this.remoteExtensionMetadata.sort((ext1, ext2) => ext1.priority - ext2.priority);
        }
        return this._remoteExtensionMetadata;
    }
    get remoteAuthority() {
        return this.environmentService.remoteAuthority;
    }
    constructor(statusbarService, environmentService, labelService, contextKeyService, menuService, quickInputService, commandService, extensionService, remoteAgentService, remoteAuthorityResolverService, hostService, workspaceContextService, logService, extensionGalleryService, telemetryService, productService, extensionManagementService, extensionsWorkbenchService, dialogService, lifecycleService, openerService, configurationService) {
        super();
        this.statusbarService = statusbarService;
        this.environmentService = environmentService;
        this.labelService = labelService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.extensionService = extensionService;
        this.remoteAgentService = remoteAgentService;
        this.remoteAuthorityResolverService = remoteAuthorityResolverService;
        this.hostService = hostService;
        this.workspaceContextService = workspaceContextService;
        this.logService = logService;
        this.extensionGalleryService = extensionGalleryService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.extensionManagementService = extensionManagementService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.dialogService = dialogService;
        this.lifecycleService = lifecycleService;
        this.openerService = openerService;
        this.configurationService = configurationService;
        this.virtualWorkspaceLocation = undefined;
        this.connectionState = undefined;
        this.connectionToken = undefined;
        this.networkState = undefined;
        this.measureNetworkConnectionLatencyScheduler = undefined;
        this.loggedInvalidGroupNames = Object.create(null);
        this._remoteExtensionMetadata = undefined;
        this.remoteMetadataInitialized = false;
        this._onDidChangeEntries = this._register(new Emitter());
        this.onDidChangeEntries = this._onDidChangeEntries.event;
        this.legacyIndicatorMenu = this._register(this.menuService.createMenu(MenuId.StatusBarWindowIndicatorMenu, this.contextKeyService)); // to be removed once migration completed
        this.remoteIndicatorMenu = this._register(this.menuService.createMenu(MenuId.StatusBarRemoteIndicatorMenu, this.contextKeyService));
        this.connectionStateContextKey = new RawContextKey('remoteConnectionState', '').bindTo(this.contextKeyService);
        // Set initial connection state
        if (this.remoteAuthority) {
            this.connectionState = 'initializing';
            this.connectionStateContextKey.set(this.connectionState);
        }
        else {
            this.updateVirtualWorkspaceLocation();
        }
        this.registerActions();
        this.registerListeners();
        // Initialize network state on startup
        try {
            // navigator is available in browser contexts (including Electron renderer)
            // This ensures the status reflects current connectivity immediately
            this.setNetworkState(navigator.onLine ? 'online' : 'offline');
        }
        catch {
            // no-op if navigator is not available
        }
        this.updateWhenInstalledExtensionsRegistered();
        this.updateRemoteStatusIndicator();
    }
    registerActions() {
        const category = nls.localize2('remote.category', 'Remote');
        // Show Remote Menu
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteStatusIndicator_1.REMOTE_ACTIONS_COMMAND_ID,
                    category,
                    title: nls.localize2('remote.showMenu', 'Show Remote Menu'),
                    f1: true,
                    keybinding: {
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 45 /* KeyCode.KeyO */,
                    },
                });
                this.run = () => that.showRemoteMenu();
            }
        }));
        // Close Remote Connection
        if (RemoteStatusIndicator_1.SHOW_CLOSE_REMOTE_COMMAND_ID) {
            this._register(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: RemoteStatusIndicator_1.CLOSE_REMOTE_COMMAND_ID,
                        category,
                        title: nls.localize2('remote.close', 'Close Remote Connection'),
                        f1: true,
                        precondition: ContextKeyExpr.or(RemoteNameContext, VirtualWorkspaceContext),
                    });
                    this.run = () => that.hostService.openWindow({ forceReuseWindow: true, remoteAuthority: null });
                }
            }));
            if (this.remoteAuthority) {
                MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
                    group: '6_close',
                    command: {
                        id: RemoteStatusIndicator_1.CLOSE_REMOTE_COMMAND_ID,
                        title: nls.localize({ key: 'miCloseRemote', comment: ['&& denotes a mnemonic'] }, 'Close Re&&mote Connection'),
                    },
                    order: 3.5,
                });
            }
        }
        if (this.extensionGalleryService.isEnabled()) {
            this._register(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: RemoteStatusIndicator_1.INSTALL_REMOTE_EXTENSIONS_ID,
                        category,
                        title: nls.localize2('remote.install', 'Install Remote Development Extensions'),
                        f1: true,
                    });
                    this.run = (accessor, input) => {
                        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                        return extensionsWorkbenchService.openSearch(`@recommended:remotes`);
                    };
                }
            }));
        }
    }
    registerListeners() {
        // Menu changes
        const updateRemoteActions = () => {
            this.remoteMenuActionsGroups = undefined;
            this.updateRemoteStatusIndicator();
        };
        this._register(this.legacyIndicatorMenu.onDidChange(updateRemoteActions));
        this._register(this.remoteIndicatorMenu.onDidChange(updateRemoteActions));
        // Update indicator when formatter changes as it may have an impact on the remote label
        this._register(this.labelService.onDidChangeFormatters(() => this.updateRemoteStatusIndicator()));
        // Update based on remote indicator changes if any
        const remoteIndicator = this.environmentService.options?.windowIndicator;
        if (remoteIndicator && remoteIndicator.onDidChange) {
            this._register(remoteIndicator.onDidChange(() => this.updateRemoteStatusIndicator()));
        }
        // Listen to changes of the connection
        if (this.remoteAuthority) {
            const connection = this.remoteAgentService.getConnection();
            if (connection) {
                this._register(connection.onDidStateChange((e) => {
                    switch (e.type) {
                        case 0 /* PersistentConnectionEventType.ConnectionLost */:
                        case 2 /* PersistentConnectionEventType.ReconnectionRunning */:
                        case 1 /* PersistentConnectionEventType.ReconnectionWait */:
                            this.setConnectionState('reconnecting');
                            break;
                        case 3 /* PersistentConnectionEventType.ReconnectionPermanentFailure */:
                            this.setConnectionState('disconnected');
                            break;
                        case 4 /* PersistentConnectionEventType.ConnectionGain */:
                            this.setConnectionState('connected');
                            break;
                    }
                }));
            }
        }
        else {
            this._register(this.workspaceContextService.onDidChangeWorkbenchState(() => {
                this.updateVirtualWorkspaceLocation();
                this.updateRemoteStatusIndicator();
            }));
        }
        // Online / Offline changes
        this._register(Event.any(this._register(new DomEmitter(mainWindow, 'online')).event, this._register(new DomEmitter(mainWindow, 'offline')).event)(() => this.setNetworkState(navigator.onLine ? 'online' : 'offline')));
        this._register(this.extensionService.onDidChangeExtensions(async (result) => {
            for (const ext of result.added) {
                const index = this.remoteExtensionMetadata.findIndex((value) => ExtensionIdentifier.equals(value.id, ext.identifier));
                if (index > -1) {
                    this.remoteExtensionMetadata[index].installed = true;
                }
            }
        }));
        this._register(this.extensionManagementService.onDidUninstallExtension(async (result) => {
            const index = this.remoteExtensionMetadata.findIndex((value) => ExtensionIdentifier.equals(value.id, result.identifier.id));
            if (index > -1) {
                this.remoteExtensionMetadata[index].installed = false;
            }
        }));
    }
    async initializeRemoteMetadata() {
        if (this.remoteMetadataInitialized) {
            return;
        }
        const currentPlatform = PlatformToString(platform);
        for (let i = 0; i < this.remoteExtensionMetadata.length; i++) {
            const extensionId = this.remoteExtensionMetadata[i].id;
            const supportedPlatforms = this.remoteExtensionMetadata[i].supportedPlatforms;
            const isInstalled = (await this.extensionManagementService.getInstalled()).find((value) => ExtensionIdentifier.equals(value.identifier.id, extensionId))
                ? true
                : false;
            this.remoteExtensionMetadata[i].installed = isInstalled;
            if (isInstalled) {
                this.remoteExtensionMetadata[i].isPlatformCompatible = true;
            }
            else if (supportedPlatforms && !supportedPlatforms.includes(currentPlatform)) {
                this.remoteExtensionMetadata[i].isPlatformCompatible = false;
            }
            else {
                this.remoteExtensionMetadata[i].isPlatformCompatible = true;
            }
        }
        this.remoteMetadataInitialized = true;
        this._onDidChangeEntries.fire();
        this.updateRemoteStatusIndicator();
    }
    updateVirtualWorkspaceLocation() {
        this.virtualWorkspaceLocation = getVirtualWorkspaceLocation(this.workspaceContextService.getWorkspace());
    }
    async updateWhenInstalledExtensionsRegistered() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const remoteAuthority = this.remoteAuthority;
        if (remoteAuthority) {
            // Try to resolve the authority to figure out connection state
            ;
            (async () => {
                try {
                    const { authority } = await this.remoteAuthorityResolverService.resolveAuthority(remoteAuthority);
                    this.connectionToken = authority.connectionToken;
                    this.setConnectionState('connected');
                }
                catch (error) {
                    this.setConnectionState('disconnected');
                }
            })();
        }
        this.updateRemoteStatusIndicator();
        this.initializeRemoteMetadata();
    }
    setConnectionState(newState) {
        if (this.connectionState !== newState) {
            this.connectionState = newState;
            // simplify context key which doesn't support `connecting`
            if (this.connectionState === 'reconnecting') {
                this.connectionStateContextKey.set('disconnected');
            }
            else {
                this.connectionStateContextKey.set(this.connectionState);
            }
            // indicate status
            this.updateRemoteStatusIndicator();
            // start measuring connection latency once connected
            if (newState === 'connected') {
                this.scheduleMeasureNetworkConnectionLatency();
            }
        }
    }
    scheduleMeasureNetworkConnectionLatency() {
        if (!this.remoteAuthority || // only when having a remote connection
            this.measureNetworkConnectionLatencyScheduler // already scheduled
        ) {
            return;
        }
        this.measureNetworkConnectionLatencyScheduler = this._register(new RunOnceScheduler(() => this.measureNetworkConnectionLatency(), RemoteStatusIndicator_1.REMOTE_CONNECTION_LATENCY_SCHEDULER_DELAY));
        this.measureNetworkConnectionLatencyScheduler.schedule(RemoteStatusIndicator_1.REMOTE_CONNECTION_LATENCY_SCHEDULER_FIRST_RUN_DELAY);
    }
    async measureNetworkConnectionLatency() {
        // Measure latency if we are online
        // but only when the window has focus to prevent constantly
        // waking up the connection to the remote
        if (this.hostService.hasFocus && this.networkState !== 'offline') {
            const measurement = await remoteConnectionLatencyMeasurer.measure(this.remoteAgentService);
            if (measurement) {
                if (measurement.high) {
                    this.setNetworkState('high-latency');
                }
                else if (this.networkState === 'high-latency') {
                    this.setNetworkState('online');
                }
            }
        }
        this.measureNetworkConnectionLatencyScheduler?.schedule();
    }
    setNetworkState(newState) {
        if (this.networkState !== newState) {
            const oldState = this.networkState;
            this.networkState = newState;
            if (newState === 'high-latency') {
                this.logService.warn(`Remote network connection appears to have high latency (${remoteConnectionLatencyMeasurer.latency?.current?.toFixed(2)}ms last, ${remoteConnectionLatencyMeasurer.latency?.average?.toFixed(2)}ms average)`);
            }
            if (this.connectionToken) {
                if (newState === 'online' && oldState === 'high-latency') {
                    this.logNetworkConnectionHealthTelemetry(this.connectionToken, 'good');
                }
                else if (newState === 'high-latency' && oldState === 'online') {
                    this.logNetworkConnectionHealthTelemetry(this.connectionToken, 'poor');
                }
            }
            // update status
            this.updateRemoteStatusIndicator();
        }
    }
    logNetworkConnectionHealthTelemetry(connectionToken, connectionHealth) {
        this.telemetryService.publicLog2('remoteConnectionHealth', {
            remoteName: getRemoteName(this.remoteAuthority),
            reconnectionToken: connectionToken,
            connectionHealth,
        });
    }
    validatedGroup(group) {
        if (!group.match(/^(remote|virtualfs)_(\d\d)_(([a-z][a-z0-9+.-]*)_(.*))$/)) {
            if (!this.loggedInvalidGroupNames[group]) {
                this.loggedInvalidGroupNames[group] = true;
                this.logService.warn(`Invalid group name used in "statusBar/remoteIndicator" menu contribution: ${group}. Entries ignored. Expected format: 'remote_$ORDER_$REMOTENAME_$GROUPING or 'virtualfs_$ORDER_$FILESCHEME_$GROUPING.`);
            }
            return false;
        }
        return true;
    }
    getRemoteMenuActions(doNotUseCache) {
        if (!this.remoteMenuActionsGroups || doNotUseCache) {
            this.remoteMenuActionsGroups = this.remoteIndicatorMenu
                .getActions()
                .filter((a) => this.validatedGroup(a[0]))
                .concat(this.legacyIndicatorMenu.getActions());
        }
        return this.remoteMenuActionsGroups;
    }
    updateRemoteStatusIndicator() {
        // Remote Indicator: show if provided via options, e.g. by the web embedder API
        const remoteIndicator = this.environmentService.options?.windowIndicator;
        if (remoteIndicator) {
            let remoteIndicatorLabel = remoteIndicator.label.trim();
            if (!remoteIndicatorLabel.startsWith('$(')) {
                remoteIndicatorLabel = `$(remote) ${remoteIndicatorLabel}`; // ensure the indicator has a codicon
            }
            this.renderRemoteStatusIndicator(truncate(remoteIndicatorLabel, RemoteStatusIndicator_1.REMOTE_STATUS_LABEL_MAX_LENGTH), remoteIndicator.tooltip, remoteIndicator.command);
            return;
        }
        // Show for remote windows on the desktop
        if (this.remoteAuthority) {
            const hostLabel = this.labelService.getHostLabel(Schemas.vscodeRemote, this.remoteAuthority) ||
                this.remoteAuthority;
            switch (this.connectionState) {
                case 'initializing':
                    this.renderRemoteStatusIndicator(nls.localize('host.open', 'Opening Remote...'), nls.localize('host.open', 'Opening Remote...'), undefined, true /* progress */);
                    break;
                case 'reconnecting':
                    this.renderRemoteStatusIndicator(`${nls.localize('host.reconnecting', 'Reconnecting to {0}...', truncate(hostLabel, RemoteStatusIndicator_1.REMOTE_STATUS_LABEL_MAX_LENGTH))}`, undefined, undefined, true /* progress */);
                    break;
                case 'disconnected':
                    this.renderRemoteStatusIndicator(`$(alert) ${nls.localize('disconnectedFrom', 'Disconnected from {0}', truncate(hostLabel, RemoteStatusIndicator_1.REMOTE_STATUS_LABEL_MAX_LENGTH))}`);
                    break;
                default: {
                    const tooltip = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
                    const hostNameTooltip = this.labelService.getHostTooltip(Schemas.vscodeRemote, this.remoteAuthority);
                    if (hostNameTooltip) {
                        tooltip.appendMarkdown(hostNameTooltip);
                    }
                    else {
                        tooltip.appendText(nls.localize({ key: 'host.tooltip', comment: ['{0} is a remote host name, e.g. Dev Container'] }, 'Editing on {0}', hostLabel));
                    }
                    this.renderRemoteStatusIndicator(`$(remote) ${truncate(hostLabel, RemoteStatusIndicator_1.REMOTE_STATUS_LABEL_MAX_LENGTH)}`, tooltip);
                }
            }
            return;
        }
        // Show when in a virtual workspace
        if (this.virtualWorkspaceLocation) {
            // Workspace with label: indicate editing source
            const workspaceLabel = this.labelService.getHostLabel(this.virtualWorkspaceLocation.scheme, this.virtualWorkspaceLocation.authority);
            if (workspaceLabel) {
                const tooltip = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
                const hostNameTooltip = this.labelService.getHostTooltip(this.virtualWorkspaceLocation.scheme, this.virtualWorkspaceLocation.authority);
                if (hostNameTooltip) {
                    tooltip.appendMarkdown(hostNameTooltip);
                }
                else {
                    tooltip.appendText(nls.localize({
                        key: 'workspace.tooltip',
                        comment: ['{0} is a remote workspace name, e.g. GitHub'],
                    }, 'Editing on {0}', workspaceLabel));
                }
                if (!isWeb || this.remoteAuthority) {
                    tooltip.appendMarkdown('\n\n');
                    tooltip.appendMarkdown(nls.localize({
                        key: 'workspace.tooltip2',
                        comment: [
                            '[features are not available]({1}) is a link. Only translate `features are not available`. Do not change brackets and parentheses or {0}',
                        ],
                    }, 'Some [features are not available]({0}) for resources located on a virtual file system.', `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`));
                }
                this.renderRemoteStatusIndicator(`$(remote) ${truncate(workspaceLabel, RemoteStatusIndicator_1.REMOTE_STATUS_LABEL_MAX_LENGTH)}`, tooltip);
                return;
            }
        }
        this.renderRemoteStatusIndicator(`$(remote)`, nls.localize('noHost.tooltip', 'Open a Remote Window'));
        return;
    }
    renderRemoteStatusIndicator(initialText, initialTooltip, command, showProgress) {
        const { text, tooltip, ariaLabel } = this.withNetworkStatus(initialText, initialTooltip, showProgress);
        const properties = {
            name: nls.localize('remoteHost', 'Remote Host'),
            kind: this.networkState === 'offline' ? 'offline' : 'remote',
            ariaLabel,
            text,
            showProgress,
            tooltip,
            command: command ?? RemoteStatusIndicator_1.REMOTE_ACTIONS_COMMAND_ID,
        };
        if (this.remoteStatusEntry) {
            this.remoteStatusEntry.update(properties);
        }
        else {
            this.remoteStatusEntry = this.statusbarService.addEntry(properties, 'status.host', 0 /* StatusbarAlignment.LEFT */, Number.POSITIVE_INFINITY /* first entry */);
        }
    }
    withNetworkStatus(initialText, initialTooltip, showProgress) {
        let text = initialText;
        let tooltip = initialTooltip;
        let ariaLabel = getCodiconAriaLabel(text);
        function textWithAlert() {
            // `initialText` can have a codicon in the beginning that already
            // indicates some kind of status, or we may have been asked to
            // show progress, where a spinning codicon appears. we only want
            // to replace with an alert icon for when a normal remote indicator
            // is shown.
            if (!showProgress && initialText.startsWith('$(remote)')) {
                return initialText.replace('$(remote)', '$(alert)');
            }
            return initialText;
        }
        switch (this.networkState) {
            case 'offline': {
                const offlineMessage = nls.localize('networkStatusOfflineTooltip', 'Network appears to be offline, certain features might be unavailable.');
                text = textWithAlert();
                tooltip = this.appendTooltipLine(tooltip, offlineMessage);
                ariaLabel = `${ariaLabel}, ${offlineMessage}`;
                break;
            }
            case 'high-latency':
                text = textWithAlert();
                tooltip = this.appendTooltipLine(tooltip, nls.localize('networkStatusHighLatencyTooltip', 'Network appears to have high latency ({0}ms last, {1}ms average), certain features may be slow to respond.', remoteConnectionLatencyMeasurer.latency?.current?.toFixed(2), remoteConnectionLatencyMeasurer.latency?.average?.toFixed(2)));
                break;
        }
        return { text, tooltip, ariaLabel };
    }
    appendTooltipLine(tooltip, line) {
        let markdownTooltip;
        if (typeof tooltip === 'string') {
            markdownTooltip = new MarkdownString(tooltip, { isTrusted: true, supportThemeIcons: true });
        }
        else {
            markdownTooltip =
                tooltip ?? new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        }
        if (markdownTooltip.value.length > 0) {
            markdownTooltip.appendMarkdown('\n\n');
        }
        markdownTooltip.appendMarkdown(line);
        return markdownTooltip;
    }
    async installExtension(extensionId, remoteLabel) {
        try {
            await this.extensionsWorkbenchService.install(extensionId, {
                isMachineScoped: false,
                donotIncludePackAndDependencies: false,
                context: { [EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT]: true },
            });
        }
        catch (error) {
            if (!this.lifecycleService.willShutdown) {
                const { confirmed } = await this.dialogService.confirm({
                    type: Severity.Error,
                    message: nls.localize('unknownSetupError', 'An error occurred while setting up {0}. Would you like to try again?', remoteLabel),
                    detail: error && !isCancellationError(error) ? toErrorMessage(error) : undefined,
                    primaryButton: nls.localize('retry', 'Retry'),
                });
                if (confirmed) {
                    return this.installExtension(extensionId, remoteLabel);
                }
            }
            throw error;
        }
    }
    async runRemoteStartCommand(extensionId, startCommand) {
        // check to ensure the extension is installed
        await retry(async () => {
            const ext = await this.extensionService.getExtension(extensionId);
            if (!ext) {
                throw Error('Failed to find installed remote extension');
            }
            return ext;
        }, 300, 10);
        this.commandService.executeCommand(startCommand);
        this.telemetryService.publicLog2('workbenchActionExecuted', {
            id: 'remoteInstallAndRun',
            detail: extensionId,
            from: 'remote indicator',
        });
    }
    showRemoteMenu() {
        const getCategoryLabel = (action) => {
            if (action.item.category) {
                return typeof action.item.category === 'string'
                    ? action.item.category
                    : action.item.category.value;
            }
            return undefined;
        };
        const matchCurrentRemote = () => {
            if (this.remoteAuthority) {
                return new RegExp(`^remote_\\d\\d_${getRemoteName(this.remoteAuthority)}_`);
            }
            else if (this.virtualWorkspaceLocation) {
                return new RegExp(`^virtualfs_\\d\\d_${this.virtualWorkspaceLocation.scheme}_`);
            }
            return undefined;
        };
        const computeItems = () => {
            let actionGroups = this.getRemoteMenuActions(true);
            const items = [];
            const currentRemoteMatcher = matchCurrentRemote();
            if (currentRemoteMatcher) {
                // commands for the current remote go first
                actionGroups = actionGroups.sort((g1, g2) => {
                    const isCurrentRemote1 = currentRemoteMatcher.test(g1[0]);
                    const isCurrentRemote2 = currentRemoteMatcher.test(g2[0]);
                    if (isCurrentRemote1 !== isCurrentRemote2) {
                        return isCurrentRemote1 ? -1 : 1;
                    }
                    // legacy indicator commands go last
                    if (g1[0] !== '' && g2[0] === '') {
                        return -1;
                    }
                    else if (g1[0] === '' && g2[0] !== '') {
                        return 1;
                    }
                    return g1[0].localeCompare(g2[0]);
                });
            }
            let lastCategoryName = undefined;
            for (const actionGroup of actionGroups) {
                let hasGroupCategory = false;
                for (const action of actionGroup[1]) {
                    if (action instanceof MenuItemAction) {
                        if (!hasGroupCategory) {
                            const category = getCategoryLabel(action);
                            if (category !== lastCategoryName) {
                                items.push({ type: 'separator', label: category });
                                lastCategoryName = category;
                            }
                            hasGroupCategory = true;
                        }
                        const label = typeof action.item.title === 'string' ? action.item.title : action.item.title.value;
                        items.push({
                            type: 'item',
                            id: action.item.id,
                            label,
                        });
                    }
                }
            }
            const showExtensionRecommendations = this.configurationService.getValue('workbench.remoteIndicator.showExtensionRecommendations');
            if (showExtensionRecommendations &&
                this.extensionGalleryService.isEnabled() &&
                this.remoteMetadataInitialized) {
                const notInstalledItems = [];
                for (const metadata of this.remoteExtensionMetadata) {
                    if (!metadata.installed && metadata.isPlatformCompatible) {
                        // Create Install QuickPick with a help link
                        const label = metadata.startConnectLabel;
                        const buttons = [
                            {
                                iconClass: ThemeIcon.asClassName(infoIcon),
                                tooltip: nls.localize('remote.startActions.help', 'Learn More'),
                            },
                        ];
                        notInstalledItems.push({
                            type: 'item',
                            id: metadata.id,
                            label: label,
                            buttons: buttons,
                        });
                    }
                }
                items.push({
                    type: 'separator',
                    label: nls.localize('remote.startActions.install', 'Install'),
                });
                items.push(...notInstalledItems);
            }
            items.push({
                type: 'separator',
            });
            const entriesBeforeConfig = items.length;
            if (RemoteStatusIndicator_1.SHOW_CLOSE_REMOTE_COMMAND_ID) {
                if (this.remoteAuthority) {
                    items.push({
                        type: 'item',
                        id: RemoteStatusIndicator_1.CLOSE_REMOTE_COMMAND_ID,
                        label: nls.localize('closeRemoteConnection.title', 'Close Remote Connection'),
                    });
                    if (this.connectionState === 'disconnected') {
                        items.push({
                            type: 'item',
                            id: ReloadWindowAction.ID,
                            label: nls.localize('reloadWindow', 'Reload Window'),
                        });
                    }
                }
                else if (this.virtualWorkspaceLocation) {
                    items.push({
                        type: 'item',
                        id: RemoteStatusIndicator_1.CLOSE_REMOTE_COMMAND_ID,
                        label: nls.localize('closeVirtualWorkspace.title', 'Close Remote Workspace'),
                    });
                }
            }
            if (items.length === entriesBeforeConfig) {
                items.pop(); // remove the separator again
            }
            return items;
        };
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        quickPick.placeholder = nls.localize('remoteActions', 'Select an option to open a Remote Window');
        quickPick.items = computeItems();
        quickPick.sortByLabel = false;
        quickPick.canSelectMany = false;
        disposables.add(Event.once(quickPick.onDidAccept)(async (_) => {
            const selectedItems = quickPick.selectedItems;
            if (selectedItems.length === 1) {
                const commandId = selectedItems[0].id;
                const remoteExtension = this.remoteExtensionMetadata.find((value) => ExtensionIdentifier.equals(value.id, commandId));
                if (remoteExtension) {
                    quickPick.items = [];
                    quickPick.busy = true;
                    quickPick.placeholder = nls.localize('remote.startActions.installingExtension', 'Installing extension... ');
                    try {
                        await this.installExtension(remoteExtension.id, selectedItems[0].label);
                    }
                    catch (error) {
                        return;
                    }
                    finally {
                        quickPick.hide();
                    }
                    await this.runRemoteStartCommand(remoteExtension.id, remoteExtension.startCommand);
                }
                else {
                    this.telemetryService.publicLog2('workbenchActionExecuted', {
                        id: commandId,
                        from: 'remote indicator',
                    });
                    this.commandService.executeCommand(commandId);
                    quickPick.hide();
                }
            }
        }));
        disposables.add(Event.once(quickPick.onDidTriggerItemButton)(async (e) => {
            const remoteExtension = this.remoteExtensionMetadata.find((value) => ExtensionIdentifier.equals(value.id, e.item.id));
            if (remoteExtension) {
                await this.openerService.open(URI.parse(remoteExtension.helpLink));
            }
        }));
        // refresh the items when actions change
        disposables.add(this.legacyIndicatorMenu.onDidChange(() => (quickPick.items = computeItems())));
        disposables.add(this.remoteIndicatorMenu.onDidChange(() => (quickPick.items = computeItems())));
        disposables.add(quickPick.onDidHide(() => disposables.dispose()));
        if (!this.remoteMetadataInitialized) {
            quickPick.busy = true;
            this._register(this.onDidChangeEntries(() => {
                // If quick pick is open, update the quick pick items after initialization.
                quickPick.busy = false;
                quickPick.items = computeItems();
            }));
        }
        quickPick.show();
    }
};
RemoteStatusIndicator = RemoteStatusIndicator_1 = __decorate([
    __param(0, IStatusbarService),
    __param(1, IBrowserWorkbenchEnvironmentService),
    __param(2, ILabelService),
    __param(3, IContextKeyService),
    __param(4, IMenuService),
    __param(5, IQuickInputService),
    __param(6, ICommandService),
    __param(7, IExtensionService),
    __param(8, IRemoteAgentService),
    __param(9, IRemoteAuthorityResolverService),
    __param(10, IHostService),
    __param(11, IWorkspaceContextService),
    __param(12, ILogService),
    __param(13, IExtensionGalleryService),
    __param(14, ITelemetryService),
    __param(15, IProductService),
    __param(16, IExtensionManagementService),
    __param(17, IExtensionsWorkbenchService),
    __param(18, IDialogService),
    __param(19, ILifecycleService),
    __param(20, IOpenerService),
    __param(21, IConfigurationService)
], RemoteStatusIndicator);
export { RemoteStatusIndicator };
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.remoteIndicator.showExtensionRecommendations': {
            type: 'boolean',
            markdownDescription: nls.localize('remote.showExtensionRecommendations', 'When enabled, remote extensions recommendations will be shown in the Remote Indicator menu.'),
            default: true,
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlSW5kaWNhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvYnJvd3Nlci9yZW1vdGVJbmRpY2F0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwrQkFBK0IsR0FDL0IsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFDTixNQUFNLEVBQ04sWUFBWSxFQUNaLGNBQWMsRUFDZCxZQUFZLEVBQ1osZUFBZSxFQUNmLE9BQU8sR0FHUCxNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFFTixpQkFBaUIsR0FHakIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBRU4sa0JBQWtCLEdBRWxCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFFakgsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDL0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFFTixnQkFBZ0IsRUFDaEIsS0FBSyxFQUNMLFFBQVEsR0FDUixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDdkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzlFLE9BQU8sRUFDTiwwQ0FBMEMsRUFDMUMsd0JBQXdCLEVBQ3hCLDJCQUEyQixHQUMzQixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IsZ0RBQWdELEdBQ2hELE1BQU0sdUNBQXVDLENBQUE7QUFFOUMsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQU90RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBQ3JDLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQWdCNUUsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVOzthQUNwQyxPQUFFLEdBQUcseUNBQXlDLEFBQTVDLENBQTRDO2FBRXRDLDhCQUF5QixHQUFHLGtDQUFrQyxBQUFyQyxDQUFxQzthQUM5RCw0QkFBdUIsR0FBRywrQkFBK0IsQUFBbEMsQ0FBa0M7YUFDekQsaUNBQTRCLEdBQUcsQ0FBQyxLQUFLLEFBQVQsQ0FBUyxHQUFDLDZDQUE2QzthQUNuRixpQ0FBNEIsR0FBRyxvQ0FBb0MsQUFBdkMsQ0FBdUM7YUFFbkUsbUNBQThCLEdBQUcsRUFBRSxBQUFMLENBQUs7YUFFbkMsOENBQXlDLEdBQUcsRUFBRSxHQUFHLElBQUksQUFBWixDQUFZO2FBQ3JELHdEQUFtRCxHQUFHLEVBQUUsR0FBRyxJQUFJLEFBQVosQ0FBWTtJQTRCdkYsSUFBWSx1QkFBdUI7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sbUJBQW1CLEdBQUc7Z0JBQzNCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUI7Z0JBQzFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyw2QkFBNkI7YUFDcEQsQ0FBQTtZQUNELElBQUksQ0FBQyx3QkFBd0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDO2lCQUNoRSxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLEtBQUssU0FBUyxDQUFDO2lCQUNqRCxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDZCxPQUFPO29CQUNOLEVBQUUsRUFBRSxLQUFLLENBQUMsV0FBVztvQkFDckIsU0FBUyxFQUFFLEtBQUs7b0JBQ2hCLFlBQVksRUFBRSxLQUFLLENBQUMsWUFBWTtvQkFDaEMsb0JBQW9CLEVBQUUsS0FBSztvQkFDM0IsWUFBWSxFQUFFLEVBQUU7b0JBQ2hCLFFBQVEsRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLFFBQVEsSUFBSSxFQUFFO29CQUMxQyxpQkFBaUIsRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLGlCQUFpQixJQUFJLEVBQUU7b0JBQzVELFlBQVksRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLFlBQVksSUFBSSxFQUFFO29CQUNsRCxRQUFRLEVBQUUsS0FBSyxDQUFDLFVBQVUsRUFBRSxRQUFRLElBQUksRUFBRTtvQkFDMUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLGtCQUFrQjtpQkFDNUMsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1lBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsSUFBWSxlQUFlO1FBQzFCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQTtJQUMvQyxDQUFDO0lBTUQsWUFDb0IsZ0JBQW9ELEVBRXZFLGtCQUF3RSxFQUN6RCxZQUE0QyxFQUN2QyxpQkFBNkMsRUFDbkQsV0FBaUMsRUFDM0IsaUJBQXNELEVBQ3pELGNBQWdELEVBQzlDLGdCQUFvRCxFQUNsRCxrQkFBd0QsRUFFN0UsOEJBQWdGLEVBQ2xFLFdBQTBDLEVBQzlCLHVCQUFrRSxFQUMvRSxVQUF3QyxFQUMzQix1QkFBa0UsRUFDekUsZ0JBQW9ELEVBQ3RELGNBQWdELEVBRWpFLDBCQUF3RSxFQUV4RSwwQkFBd0UsRUFDeEQsYUFBOEMsRUFDM0MsZ0JBQW9ELEVBQ3ZELGFBQThDLEVBQ3ZDLG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQTtRQTNCNkIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUV0RCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFDO1FBQ3hDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQy9CLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDM0MsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDVixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3hDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUM3QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ2pDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFFNUQsbUNBQThCLEdBQTlCLDhCQUE4QixDQUFpQztRQUNqRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNiLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUFDOUQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNWLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUFDeEQscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNyQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFFaEQsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE2QjtRQUV2RCwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBQ3ZDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUMxQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3RDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN0Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBbEY1RSw2QkFBd0IsR0FBc0QsU0FBUyxDQUFBO1FBRXZGLG9CQUFlLEdBS1IsU0FBUyxDQUFBO1FBQ2hCLG9CQUFlLEdBQXVCLFNBQVMsQ0FBQTtRQUsvQyxpQkFBWSxHQUFzRCxTQUFTLENBQUE7UUFDM0UsNkNBQXdDLEdBQWlDLFNBQVMsQ0FBQTtRQUVsRiw0QkFBdUIsR0FBaUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUUzRSw2QkFBd0IsR0FBMEMsU0FBUyxDQUFBO1FBa0MzRSw4QkFBeUIsR0FBWSxLQUFLLENBQUE7UUFDakMsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDekQsdUJBQWtCLEdBQWdCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7UUFnQ2hGLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN4QyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsNEJBQTRCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQ3hGLENBQUEsQ0FBQyx5Q0FBeUM7UUFDM0MsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3hDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FDeEYsQ0FBQTtRQUVELElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLGFBQWEsQ0FFaEQsdUJBQXVCLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRTdELCtCQUErQjtRQUMvQixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQTtZQUNyQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUN6RCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFBO1FBQ3RDLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDdEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFFeEIsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQztZQUNKLDJFQUEyRTtZQUMzRSxvRUFBb0U7WUFDcEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixzQ0FBc0M7UUFDdkMsQ0FBQztRQUVELElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxDQUFBO1FBQzlDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFBO0lBQ25DLENBQUM7SUFFTyxlQUFlO1FBQ3RCLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFM0QsbUJBQW1CO1FBQ25CLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsU0FBUyxDQUNiLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztZQUNwQjtnQkFDQyxLQUFLLENBQUM7b0JBQ0wsRUFBRSxFQUFFLHVCQUFxQixDQUFDLHlCQUF5QjtvQkFDbkQsUUFBUTtvQkFDUixLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQztvQkFDM0QsRUFBRSxFQUFFLElBQUk7b0JBQ1IsVUFBVSxFQUFFO3dCQUNYLE1BQU0sNkNBQW1DO3dCQUN6QyxPQUFPLEVBQUUsZ0RBQTJCLHdCQUFlO3FCQUNuRDtpQkFDRCxDQUFDLENBQUE7Z0JBRUgsUUFBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtZQURqQyxDQUFDO1NBRUQsQ0FDRCxDQUNELENBQUE7UUFFRCwwQkFBMEI7UUFDMUIsSUFBSSx1QkFBcUIsQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO1lBQ3hELElBQUksQ0FBQyxTQUFTLENBQ2IsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO2dCQUNwQjtvQkFDQyxLQUFLLENBQUM7d0JBQ0wsRUFBRSxFQUFFLHVCQUFxQixDQUFDLHVCQUF1Qjt3QkFDakQsUUFBUTt3QkFDUixLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUseUJBQXlCLENBQUM7d0JBQy9ELEVBQUUsRUFBRSxJQUFJO3dCQUNSLFlBQVksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLGlCQUFpQixFQUFFLHVCQUF1QixDQUFDO3FCQUMzRSxDQUFDLENBQUE7b0JBRUgsUUFBRyxHQUFHLEdBQUcsRUFBRSxDQUNWLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUYvRSxDQUFDO2FBR0QsQ0FDRCxDQUNELENBQUE7WUFDRCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDMUIsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFO29CQUNuRCxLQUFLLEVBQUUsU0FBUztvQkFDaEIsT0FBTyxFQUFFO3dCQUNSLEVBQUUsRUFBRSx1QkFBcUIsQ0FBQyx1QkFBdUI7d0JBQ2pELEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNsQixFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUM1RCwyQkFBMkIsQ0FDM0I7cUJBQ0Q7b0JBQ0QsS0FBSyxFQUFFLEdBQUc7aUJBQ1YsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxTQUFTLENBQ2IsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO2dCQUNwQjtvQkFDQyxLQUFLLENBQUM7d0JBQ0wsRUFBRSxFQUFFLHVCQUFxQixDQUFDLDRCQUE0Qjt3QkFDdEQsUUFBUTt3QkFDUixLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSx1Q0FBdUMsQ0FBQzt3QkFDL0UsRUFBRSxFQUFFLElBQUk7cUJBQ1IsQ0FBQyxDQUFBO29CQUVILFFBQUcsR0FBRyxDQUFDLFFBQTBCLEVBQUUsS0FBYSxFQUFFLEVBQUU7d0JBQ25ELE1BQU0sMEJBQTBCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO3dCQUM1RSxPQUFPLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO29CQUNyRSxDQUFDLENBQUE7Z0JBSkQsQ0FBQzthQUtELENBQ0QsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsZUFBZTtRQUNmLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxFQUFFO1lBQ2hDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxTQUFTLENBQUE7WUFDeEMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDbkMsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQTtRQUN6RSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFBO1FBRXpFLHVGQUF1RjtRQUN2RixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxZQUFZLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FDakYsQ0FBQTtRQUVELGtEQUFrRDtRQUNsRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQTtRQUN4RSxJQUFJLGVBQWUsSUFBSSxlQUFlLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0RixDQUFDO1FBRUQsc0NBQXNDO1FBQ3RDLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUMxRCxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsU0FBUyxDQUNiLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUNqQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDaEIsMERBQWtEO3dCQUNsRCwrREFBdUQ7d0JBQ3ZEOzRCQUNDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsQ0FBQTs0QkFDdkMsTUFBSzt3QkFDTjs0QkFDQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUE7NEJBQ3ZDLE1BQUs7d0JBQ047NEJBQ0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFBOzRCQUNwQyxNQUFLO29CQUNQLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHVCQUF1QixDQUFDLHlCQUF5QixDQUFDLEdBQUcsRUFBRTtnQkFDM0QsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUE7Z0JBQ3JDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFBO1lBQ25DLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBRUQsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLEdBQUcsQ0FDUixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksVUFBVSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFDMUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQzNELENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQ3RFLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDNUQsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUM5RCxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQ3BELENBQUE7Z0JBQ0QsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7Z0JBQ3JELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN4RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDOUQsbUJBQW1CLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FDMUQsQ0FBQTtZQUNELElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFBO1lBQ3RELENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyx3QkFBd0I7UUFDckMsSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztZQUNwQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2xELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtZQUN0RCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQTtZQUM3RSxNQUFNLFdBQVcsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDekYsbUJBQW1CLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUM1RDtnQkFDQSxDQUFDLENBQUMsSUFBSTtnQkFDTixDQUFDLENBQUMsS0FBSyxDQUFBO1lBRVIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUE7WUFDdkQsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQTtZQUM1RCxDQUFDO2lCQUFNLElBQUksa0JBQWtCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztnQkFDaEYsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQTtZQUM3RCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQTtZQUM1RCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLENBQUE7UUFDckMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQy9CLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFBO0lBQ25DLENBQUM7SUFFTyw4QkFBOEI7UUFDckMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLDJCQUEyQixDQUMxRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQzNDLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLHVDQUF1QztRQUNwRCxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQ0FBaUMsRUFBRSxDQUFBO1FBRS9ELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUE7UUFDNUMsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNyQiw4REFBOEQ7WUFDOUQsQ0FBQztZQUFBLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQ1osSUFBSSxDQUFDO29CQUNKLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FDbEIsTUFBTSxJQUFJLENBQUMsOEJBQThCLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUE7b0JBQzVFLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQTtvQkFFaEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUNyQyxDQUFDO2dCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7b0JBQ2hCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDeEMsQ0FBQztZQUNGLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDTCxDQUFDO1FBRUQsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDbEMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7SUFDaEMsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFFBQXVEO1FBQ2pGLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQTtZQUUvQiwwREFBMEQ7WUFDMUQsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLGNBQWMsRUFBRSxDQUFDO2dCQUM3QyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ25ELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUN6RCxDQUFDO1lBRUQsa0JBQWtCO1lBQ2xCLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFBO1lBRWxDLG9EQUFvRDtZQUNwRCxJQUFJLFFBQVEsS0FBSyxXQUFXLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLENBQUE7WUFDL0MsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sdUNBQXVDO1FBQzlDLElBQ0MsQ0FBQyxJQUFJLENBQUMsZUFBZSxJQUFJLHVDQUF1QztZQUNoRSxJQUFJLENBQUMsd0NBQXdDLENBQUMsb0JBQW9CO1VBQ2pFLENBQUM7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyx3Q0FBd0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM3RCxJQUFJLGdCQUFnQixDQUNuQixHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsRUFDNUMsdUJBQXFCLENBQUMseUNBQXlDLENBQy9ELENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyx3Q0FBd0MsQ0FBQyxRQUFRLENBQ3JELHVCQUFxQixDQUFDLG1EQUFtRCxDQUN6RSxDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQywrQkFBK0I7UUFDNUMsbUNBQW1DO1FBQ25DLDJEQUEyRDtRQUMzRCx5Q0FBeUM7UUFFekMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2xFLE1BQU0sV0FBVyxHQUFHLE1BQU0sK0JBQStCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQzFGLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLElBQUksV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUN0QixJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUNyQyxDQUFDO3FCQUFNLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxjQUFjLEVBQUUsQ0FBQztvQkFDakQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDL0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLFFBQVEsRUFBRSxDQUFBO0lBQzFELENBQUM7SUFFTyxlQUFlLENBQUMsUUFBK0M7UUFDdEUsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUE7WUFDbEMsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUE7WUFFNUIsSUFBSSxRQUFRLEtBQUssY0FBYyxFQUFFLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUNuQiwyREFBMkQsK0JBQStCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksK0JBQStCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FDNU0sQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxRQUFRLEtBQUssUUFBUSxJQUFJLFFBQVEsS0FBSyxjQUFjLEVBQUUsQ0FBQztvQkFDMUQsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQ3ZFLENBQUM7cUJBQU0sSUFBSSxRQUFRLEtBQUssY0FBYyxJQUFJLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDakUsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQ3ZFLENBQUM7WUFDRixDQUFDO1lBRUQsZ0JBQWdCO1lBQ2hCLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFBO1FBQ25DLENBQUM7SUFDRixDQUFDO0lBRU8sbUNBQW1DLENBQzFDLGVBQXVCLEVBQ3ZCLGdCQUFpQztRQTBCakMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FHOUIsd0JBQXdCLEVBQUU7WUFDM0IsVUFBVSxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO1lBQy9DLGlCQUFpQixFQUFFLGVBQWU7WUFDbEMsZ0JBQWdCO1NBQ2hCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxjQUFjLENBQUMsS0FBYTtRQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxFQUFFLENBQUM7WUFDNUUsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFBO2dCQUMxQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDbkIsNkVBQTZFLEtBQUssc0hBQXNILENBQ3hNLENBQUE7WUFDRixDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sb0JBQW9CLENBQUMsYUFBdUI7UUFDbkQsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNwRCxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQjtpQkFDckQsVUFBVSxFQUFFO2lCQUNaLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQTtJQUNwQyxDQUFDO0lBRU8sMkJBQTJCO1FBQ2xDLCtFQUErRTtRQUMvRSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQTtRQUN4RSxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLElBQUksb0JBQW9CLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUN2RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzVDLG9CQUFvQixHQUFHLGFBQWEsb0JBQW9CLEVBQUUsQ0FBQSxDQUFDLHFDQUFxQztZQUNqRyxDQUFDO1lBRUQsSUFBSSxDQUFDLDJCQUEyQixDQUMvQixRQUFRLENBQUMsb0JBQW9CLEVBQUUsdUJBQXFCLENBQUMsOEJBQThCLENBQUMsRUFDcEYsZUFBZSxDQUFDLE9BQU8sRUFDdkIsZUFBZSxDQUFDLE9BQU8sQ0FDdkIsQ0FBQTtZQUNELE9BQU07UUFDUCxDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLE1BQU0sU0FBUyxHQUNkLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQztnQkFDMUUsSUFBSSxDQUFDLGVBQWUsQ0FBQTtZQUNyQixRQUFRLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDOUIsS0FBSyxjQUFjO29CQUNsQixJQUFJLENBQUMsMkJBQTJCLENBQy9CLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLG1CQUFtQixDQUFDLEVBQzlDLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLG1CQUFtQixDQUFDLEVBQzlDLFNBQVMsRUFDVCxJQUFJLENBQUMsY0FBYyxDQUNuQixDQUFBO29CQUNELE1BQUs7Z0JBQ04sS0FBSyxjQUFjO29CQUNsQixJQUFJLENBQUMsMkJBQTJCLENBQy9CLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSx3QkFBd0IsRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLHVCQUFxQixDQUFDLDhCQUE4QixDQUFDLENBQUMsRUFBRSxFQUMzSSxTQUFTLEVBQ1QsU0FBUyxFQUNULElBQUksQ0FBQyxjQUFjLENBQ25CLENBQUE7b0JBQ0QsTUFBSztnQkFDTixLQUFLLGNBQWM7b0JBQ2xCLElBQUksQ0FBQywyQkFBMkIsQ0FDL0IsWUFBWSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHVCQUF1QixFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsdUJBQXFCLENBQUMsOEJBQThCLENBQUMsQ0FBQyxFQUFFLENBQ2xKLENBQUE7b0JBQ0QsTUFBSztnQkFDTixPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUNULE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtvQkFDcEYsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQ3ZELE9BQU8sQ0FBQyxZQUFZLEVBQ3BCLElBQUksQ0FBQyxlQUFlLENBQ3BCLENBQUE7b0JBQ0QsSUFBSSxlQUFlLEVBQUUsQ0FBQzt3QkFDckIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtvQkFDeEMsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE9BQU8sQ0FBQyxVQUFVLENBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQ1gsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxDQUFDLCtDQUErQyxDQUFDLEVBQUUsRUFDbkYsZ0JBQWdCLEVBQ2hCLFNBQVMsQ0FDVCxDQUNELENBQUE7b0JBQ0YsQ0FBQztvQkFDRCxJQUFJLENBQUMsMkJBQTJCLENBQy9CLGFBQWEsUUFBUSxDQUFDLFNBQVMsRUFBRSx1QkFBcUIsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLEVBQ3hGLE9BQU8sQ0FDUCxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTTtRQUNQLENBQUM7UUFDRCxtQ0FBbUM7UUFDbkMsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNuQyxnREFBZ0Q7WUFDaEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQ3BELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQ3BDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQ3ZDLENBQUE7WUFDRCxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7Z0JBQ3BGLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUN2RCxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUNwQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsU0FBUyxDQUN2QyxDQUFBO2dCQUNELElBQUksZUFBZSxFQUFFLENBQUM7b0JBQ3JCLE9BQU8sQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUE7Z0JBQ3hDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsVUFBVSxDQUNqQixHQUFHLENBQUMsUUFBUSxDQUNYO3dCQUNDLEdBQUcsRUFBRSxtQkFBbUI7d0JBQ3hCLE9BQU8sRUFBRSxDQUFDLDZDQUE2QyxDQUFDO3FCQUN4RCxFQUNELGdCQUFnQixFQUNoQixjQUFjLENBQ2QsQ0FDRCxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ3BDLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQzlCLE9BQU8sQ0FBQyxjQUFjLENBQ3JCLEdBQUcsQ0FBQyxRQUFRLENBQ1g7d0JBQ0MsR0FBRyxFQUFFLG9CQUFvQjt3QkFDekIsT0FBTyxFQUFFOzRCQUNSLHlJQUF5STt5QkFDekk7cUJBQ0QsRUFDRCx3RkFBd0YsRUFDeEYsV0FBVyxnREFBZ0QsRUFBRSxDQUM3RCxDQUNELENBQUE7Z0JBQ0YsQ0FBQztnQkFDRCxJQUFJLENBQUMsMkJBQTJCLENBQy9CLGFBQWEsUUFBUSxDQUFDLGNBQWMsRUFBRSx1QkFBcUIsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLEVBQzdGLE9BQU8sQ0FDUCxDQUFBO2dCQUNELE9BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQywyQkFBMkIsQ0FDL0IsV0FBVyxFQUNYLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsc0JBQXNCLENBQUMsQ0FDdEQsQ0FBQTtRQUNELE9BQU07SUFDUCxDQUFDO0lBRU8sMkJBQTJCLENBQ2xDLFdBQW1CLEVBQ25CLGNBQXdDLEVBQ3hDLE9BQWdCLEVBQ2hCLFlBQXNCO1FBRXRCLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FDMUQsV0FBVyxFQUNYLGNBQWMsRUFDZCxZQUFZLENBQ1osQ0FBQTtRQUVELE1BQU0sVUFBVSxHQUFvQjtZQUNuQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDO1lBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRO1lBQzVELFNBQVM7WUFDVCxJQUFJO1lBQ0osWUFBWTtZQUNaLE9BQU87WUFDUCxPQUFPLEVBQUUsT0FBTyxJQUFJLHVCQUFxQixDQUFDLHlCQUF5QjtTQUNuRSxDQUFBO1FBRUQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzFDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQ3RELFVBQVUsRUFDVixhQUFhLG1DQUViLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FDMUMsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCLENBQ3hCLFdBQW1CLEVBQ25CLGNBQXdDLEVBQ3hDLFlBQXNCO1FBRXRCLElBQUksSUFBSSxHQUFHLFdBQVcsQ0FBQTtRQUN0QixJQUFJLE9BQU8sR0FBRyxjQUFjLENBQUE7UUFDNUIsSUFBSSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFekMsU0FBUyxhQUFhO1lBQ3JCLGlFQUFpRTtZQUNqRSw4REFBOEQ7WUFDOUQsZ0VBQWdFO1lBQ2hFLG1FQUFtRTtZQUNuRSxZQUFZO1lBRVosSUFBSSxDQUFDLFlBQVksSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQzFELE9BQU8sV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDcEQsQ0FBQztZQUVELE9BQU8sV0FBVyxDQUFBO1FBQ25CLENBQUM7UUFFRCxRQUFRLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMzQixLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hCLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ2xDLDZCQUE2QixFQUM3Qix1RUFBdUUsQ0FDdkUsQ0FBQTtnQkFFRCxJQUFJLEdBQUcsYUFBYSxFQUFFLENBQUE7Z0JBQ3RCLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFBO2dCQUN6RCxTQUFTLEdBQUcsR0FBRyxTQUFTLEtBQUssY0FBYyxFQUFFLENBQUE7Z0JBQzdDLE1BQUs7WUFDTixDQUFDO1lBQ0QsS0FBSyxjQUFjO2dCQUNsQixJQUFJLEdBQUcsYUFBYSxFQUFFLENBQUE7Z0JBQ3RCLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQy9CLE9BQU8sRUFDUCxHQUFHLENBQUMsUUFBUSxDQUNYLGlDQUFpQyxFQUNqQyw0R0FBNEcsRUFDNUcsK0JBQStCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQzVELCtCQUErQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUM1RCxDQUNELENBQUE7Z0JBQ0QsTUFBSztRQUNQLENBQUM7UUFFRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQTtJQUNwQyxDQUFDO0lBRU8saUJBQWlCLENBQ3hCLE9BQTRDLEVBQzVDLElBQVk7UUFFWixJQUFJLGVBQStCLENBQUE7UUFDbkMsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqQyxlQUFlLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzVGLENBQUM7YUFBTSxDQUFDO1lBQ1AsZUFBZTtnQkFDZCxPQUFPLElBQUksSUFBSSxjQUFjLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFFRCxJQUFJLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RDLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELGVBQWUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFcEMsT0FBTyxlQUFlLENBQUE7SUFDdkIsQ0FBQztJQUVPLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFtQixFQUFFLFdBQW1CO1FBQ3RFLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7Z0JBQzFELGVBQWUsRUFBRSxLQUFLO2dCQUN0QiwrQkFBK0IsRUFBRSxLQUFLO2dCQUN0QyxPQUFPLEVBQUUsRUFBRSxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsSUFBSSxFQUFFO2FBQy9ELENBQUMsQ0FBQTtRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3pDLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO29CQUN0RCxJQUFJLEVBQUUsUUFBUSxDQUFDLEtBQUs7b0JBQ3BCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNwQixtQkFBbUIsRUFDbkIsc0VBQXNFLEVBQ3RFLFdBQVcsQ0FDWDtvQkFDRCxNQUFNLEVBQUUsS0FBSyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztvQkFDaEYsYUFBYSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztpQkFDN0MsQ0FBQyxDQUFBO2dCQUNGLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUN2RCxDQUFDO1lBQ0YsQ0FBQztZQUNELE1BQU0sS0FBSyxDQUFBO1FBQ1osQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMscUJBQXFCLENBQUMsV0FBbUIsRUFBRSxZQUFvQjtRQUM1RSw2Q0FBNkM7UUFDN0MsTUFBTSxLQUFLLENBQ1YsS0FBSyxJQUFJLEVBQUU7WUFDVixNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDakUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNWLE1BQU0sS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUE7WUFDekQsQ0FBQztZQUNELE9BQU8sR0FBRyxDQUFBO1FBQ1gsQ0FBQyxFQUNELEdBQUcsRUFDSCxFQUFFLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBRzlCLHlCQUF5QixFQUFFO1lBQzVCLEVBQUUsRUFBRSxxQkFBcUI7WUFDekIsTUFBTSxFQUFFLFdBQVc7WUFDbkIsSUFBSSxFQUFFLGtCQUFrQjtTQUN4QixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sY0FBYztRQUNyQixNQUFNLGdCQUFnQixHQUFHLENBQUMsTUFBc0IsRUFBRSxFQUFFO1lBQ25ELElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVE7b0JBQzlDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVE7b0JBQ3RCLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUE7WUFDOUIsQ0FBQztZQUNELE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUMsQ0FBQTtRQUVELE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxFQUFFO1lBQy9CLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUMxQixPQUFPLElBQUksTUFBTSxDQUFDLGtCQUFrQixhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM1RSxDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7Z0JBQzFDLE9BQU8sSUFBSSxNQUFNLENBQUMscUJBQXFCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQ2hGLENBQUM7WUFDRCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDLENBQUE7UUFFRCxNQUFNLFlBQVksR0FBRyxHQUFHLEVBQUU7WUFDekIsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFBO1lBRWxELE1BQU0sS0FBSyxHQUFvQixFQUFFLENBQUE7WUFFakMsTUFBTSxvQkFBb0IsR0FBRyxrQkFBa0IsRUFBRSxDQUFBO1lBQ2pELElBQUksb0JBQW9CLEVBQUUsQ0FBQztnQkFDMUIsMkNBQTJDO2dCQUMzQyxZQUFZLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtvQkFDM0MsTUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3pELE1BQU0sZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUN6RCxJQUFJLGdCQUFnQixLQUFLLGdCQUFnQixFQUFFLENBQUM7d0JBQzNDLE9BQU8sZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ2pDLENBQUM7b0JBQ0Qsb0NBQW9DO29CQUNwQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO3dCQUNsQyxPQUFPLENBQUMsQ0FBQyxDQUFBO29CQUNWLENBQUM7eUJBQU0sSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQzt3QkFDekMsT0FBTyxDQUFDLENBQUE7b0JBQ1QsQ0FBQztvQkFDRCxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xDLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUVELElBQUksZ0JBQWdCLEdBQXVCLFNBQVMsQ0FBQTtZQUVwRCxLQUFLLE1BQU0sV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUN4QyxJQUFJLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtnQkFDNUIsS0FBSyxNQUFNLE1BQU0sSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxNQUFNLFlBQVksY0FBYyxFQUFFLENBQUM7d0JBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDOzRCQUN2QixNQUFNLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTs0QkFDekMsSUFBSSxRQUFRLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztnQ0FDbkMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0NBQ2xELGdCQUFnQixHQUFHLFFBQVEsQ0FBQTs0QkFDNUIsQ0FBQzs0QkFDRCxnQkFBZ0IsR0FBRyxJQUFJLENBQUE7d0JBQ3hCLENBQUM7d0JBQ0QsTUFBTSxLQUFLLEdBQ1YsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUE7d0JBQ3BGLEtBQUssQ0FBQyxJQUFJLENBQUM7NEJBQ1YsSUFBSSxFQUFFLE1BQU07NEJBQ1osRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTs0QkFDbEIsS0FBSzt5QkFDTCxDQUFDLENBQUE7b0JBQ0gsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDdEUsd0RBQXdELENBQ3hELENBQUE7WUFDRCxJQUNDLDRCQUE0QjtnQkFDNUIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsRUFBRTtnQkFDeEMsSUFBSSxDQUFDLHlCQUF5QixFQUM3QixDQUFDO2dCQUNGLE1BQU0saUJBQWlCLEdBQW9CLEVBQUUsQ0FBQTtnQkFDN0MsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztvQkFDckQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLElBQUksUUFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUM7d0JBQzFELDRDQUE0Qzt3QkFDNUMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFBO3dCQUN4QyxNQUFNLE9BQU8sR0FBd0I7NEJBQ3BDO2dDQUNDLFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQztnQ0FDMUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsWUFBWSxDQUFDOzZCQUMvRDt5QkFDRCxDQUFBO3dCQUNELGlCQUFpQixDQUFDLElBQUksQ0FBQzs0QkFDdEIsSUFBSSxFQUFFLE1BQU07NEJBQ1osRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFOzRCQUNmLEtBQUssRUFBRSxLQUFLOzRCQUNaLE9BQU8sRUFBRSxPQUFPO3lCQUNoQixDQUFDLENBQUE7b0JBQ0gsQ0FBQztnQkFDRixDQUFDO2dCQUVELEtBQUssQ0FBQyxJQUFJLENBQUM7b0JBQ1YsSUFBSSxFQUFFLFdBQVc7b0JBQ2pCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLFNBQVMsQ0FBQztpQkFDN0QsQ0FBQyxDQUFBO2dCQUNGLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxpQkFBaUIsQ0FBQyxDQUFBO1lBQ2pDLENBQUM7WUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNWLElBQUksRUFBRSxXQUFXO2FBQ2pCLENBQUMsQ0FBQTtZQUVGLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQTtZQUV4QyxJQUFJLHVCQUFxQixDQUFDLDRCQUE0QixFQUFFLENBQUM7Z0JBQ3hELElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO29CQUMxQixLQUFLLENBQUMsSUFBSSxDQUFDO3dCQUNWLElBQUksRUFBRSxNQUFNO3dCQUNaLEVBQUUsRUFBRSx1QkFBcUIsQ0FBQyx1QkFBdUI7d0JBQ2pELEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLHlCQUF5QixDQUFDO3FCQUM3RSxDQUFDLENBQUE7b0JBRUYsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLGNBQWMsRUFBRSxDQUFDO3dCQUM3QyxLQUFLLENBQUMsSUFBSSxDQUFDOzRCQUNWLElBQUksRUFBRSxNQUFNOzRCQUNaLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFOzRCQUN6QixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO3lCQUNwRCxDQUFDLENBQUE7b0JBQ0gsQ0FBQztnQkFDRixDQUFDO3FCQUFNLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7b0JBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUM7d0JBQ1YsSUFBSSxFQUFFLE1BQU07d0JBQ1osRUFBRSxFQUFFLHVCQUFxQixDQUFDLHVCQUF1Qjt3QkFDakQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsd0JBQXdCLENBQUM7cUJBQzVFLENBQUMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxtQkFBbUIsRUFBRSxDQUFDO2dCQUMxQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUEsQ0FBQyw2QkFBNkI7WUFDMUMsQ0FBQztZQUVELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQyxDQUFBO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNoQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQy9ELENBQUE7UUFDRCxTQUFTLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ25DLGVBQWUsRUFDZiwwQ0FBMEMsQ0FDMUMsQ0FBQTtRQUNELFNBQVMsQ0FBQyxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUE7UUFDaEMsU0FBUyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFDN0IsU0FBUyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUE7UUFDL0IsV0FBVyxDQUFDLEdBQUcsQ0FDZCxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDN0MsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQTtZQUM3QyxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFHLENBQUE7Z0JBQ3RDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUNuRSxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FDL0MsQ0FBQTtnQkFDRCxJQUFJLGVBQWUsRUFBRSxDQUFDO29CQUNyQixTQUFTLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQTtvQkFDcEIsU0FBUyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7b0JBQ3JCLFNBQVMsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDbkMseUNBQXlDLEVBQ3pDLDBCQUEwQixDQUMxQixDQUFBO29CQUVELElBQUksQ0FBQzt3QkFDSixNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDeEUsQ0FBQztvQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO3dCQUNoQixPQUFNO29CQUNQLENBQUM7NEJBQVMsQ0FBQzt3QkFDVixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUE7b0JBQ2pCLENBQUM7b0JBQ0QsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQ25GLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUc5Qix5QkFBeUIsRUFBRTt3QkFDNUIsRUFBRSxFQUFFLFNBQVM7d0JBQ2IsSUFBSSxFQUFFLGtCQUFrQjtxQkFDeEIsQ0FBQyxDQUFBO29CQUNGLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUM3QyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ2pCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELFdBQVcsQ0FBQyxHQUFHLENBQ2QsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDeEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ25FLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQy9DLENBQUE7WUFDRCxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNyQixNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7WUFDbkUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCx3Q0FBd0M7UUFDeEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvRixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRS9GLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpFLElBQUksQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztZQUNyQyxTQUFTLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtZQUNyQixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUU7Z0JBQzVCLDJFQUEyRTtnQkFDM0UsU0FBUyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUE7Z0JBQ3RCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUE7WUFDakMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFFRCxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDakIsQ0FBQzs7QUF0L0JXLHFCQUFxQjtJQTZFL0IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLG1DQUFtQyxDQUFBO0lBRW5DLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSwrQkFBK0IsQ0FBQTtJQUUvQixZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsd0JBQXdCLENBQUE7SUFDeEIsWUFBQSxXQUFXLENBQUE7SUFDWCxZQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFlBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSxlQUFlLENBQUE7SUFDZixZQUFBLDJCQUEyQixDQUFBO0lBRTNCLFlBQUEsMkJBQTJCLENBQUE7SUFFM0IsWUFBQSxjQUFjLENBQUE7SUFDZCxZQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxxQkFBcUIsQ0FBQTtHQXRHWCxxQkFBcUIsQ0F1L0JqQzs7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUNoRyxHQUFHLDhCQUE4QjtJQUNqQyxVQUFVLEVBQUU7UUFDWCx3REFBd0QsRUFBRTtZQUN6RCxJQUFJLEVBQUUsU0FBUztZQUNmLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLHFDQUFxQyxFQUNyQyw2RkFBNkYsQ0FDN0Y7WUFDRCxPQUFPLEVBQUUsSUFBSTtTQUNiO0tBQ0Q7Q0FDRCxDQUFDLENBQUEifQ==
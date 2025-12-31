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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlSW5kaWNhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2Jyb3dzZXIvcmVtb3RlSW5kaWNhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsK0JBQStCLEdBQy9CLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFDWixjQUFjLEVBQ2QsWUFBWSxFQUNaLGVBQWUsRUFDZixPQUFPLEdBR1AsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBRU4saUJBQWlCLEdBR2pCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUVOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFB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
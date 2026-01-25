var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Extensions, } from '../../../common/views.js';
import { IRemoteExplorerService, PORT_AUTO_FALLBACK_SETTING, PORT_AUTO_FORWARD_SETTING, PORT_AUTO_SOURCE_SETTING, PORT_AUTO_SOURCE_SETTING_HYBRID, PORT_AUTO_SOURCE_SETTING_OUTPUT, PORT_AUTO_SOURCE_SETTING_PROCESS, PortsEnablement, TUNNEL_VIEW_CONTAINER_ID, TUNNEL_VIEW_ID, } from '../../../services/remote/common/remoteExplorerService.js';
import { AutoTunnelSource, forwardedPortsFeaturesEnabled, forwardedPortsViewEnabled, makeAddress, mapHasAddressLocalhostOrAllInterfaces, OnPortForward, TunnelCloseReason, TunnelSource, } from '../../../services/remote/common/tunnelModel.js';
import { ForwardPortAction, OpenPortInBrowserAction, TunnelPanel, TunnelPanelDescriptor, TunnelViewModel, OpenPortInPreviewAction, openPreviewEnabledContext, } from './tunnelView.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
import { UrlFinder } from './urlFinder.js';
import Severity from '../../../../base/common/severity.js';
import { INotificationService, } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITerminalService } from '../../terminal/browser/terminal.js';
import { IDebugService } from '../../debug/common/debug.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ITunnelService, TunnelPrivacyId, } from '../../../../platform/tunnel/common/tunnel.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { portsViewIcon } from './remoteIcons.js';
import { Event } from '../../../../base/common/event.js';
import { IExternalUriOpenerService } from '../../externalUriOpener/common/externalUriOpenerService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchConfigurationService } from '../../../services/configuration/common/configuration.js';
import { Action } from '../../../../base/common/actions.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export const VIEWLET_ID = 'workbench.view.remote';
let ForwardedPortsView = class ForwardedPortsView extends Disposable {
    constructor(contextKeyService, environmentService, remoteExplorerService, tunnelService, activityService, statusbarService) {
        super();
        this.contextKeyService = contextKeyService;
        this.environmentService = environmentService;
        this.remoteExplorerService = remoteExplorerService;
        this.tunnelService = tunnelService;
        this.activityService = activityService;
        this.statusbarService = statusbarService;
        this.contextKeyListener = this._register(new MutableDisposable());
        this.activityBadge = this._register(new MutableDisposable());
        this.hasPortsInSession = false;
        this._register(Registry.as(Extensions.ViewsRegistry).registerViewWelcomeContent(TUNNEL_VIEW_ID, {
            content: this.environmentService.remoteAuthority
                ? nls.localize('remoteNoPorts', 'No forwarded ports. Forward a port to access your running services locally.\n[Forward a Port]({0})', `command:${ForwardPortAction.INLINE_ID}`)
                : nls.localize('noRemoteNoPorts', 'No forwarded ports. Forward a port to access your locally running services over the internet.\n[Forward a Port]({0})', `command:${ForwardPortAction.INLINE_ID}`),
        }));
        this.enableBadgeAndStatusBar();
        this.enableForwardedPortsFeatures();
        if (!this.environmentService.remoteAuthority) {
            this._register(Event.once(this.tunnelService.onTunnelOpened)(() => {
                this.hasPortsInSession = true;
            }));
        }
    }
    async getViewContainer() {
        return Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({
            id: TUNNEL_VIEW_CONTAINER_ID,
            title: nls.localize2('ports', 'Ports'),
            icon: portsViewIcon,
            ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
                TUNNEL_VIEW_CONTAINER_ID,
                { mergeViewWithContainerWhenSingleView: true },
            ]),
            storageId: TUNNEL_VIEW_CONTAINER_ID,
            hideIfEmpty: true,
            order: 5,
        }, 1 /* ViewContainerLocation.Panel */);
    }
    async enableForwardedPortsFeatures() {
        this.contextKeyListener.clear();
        const featuresEnabled = !!forwardedPortsFeaturesEnabled.getValue(this.contextKeyService);
        const viewEnabled = !!forwardedPortsViewEnabled.getValue(this.contextKeyService);
        if (featuresEnabled || viewEnabled) {
            // Also enable the view if it isn't already.
            if (!viewEnabled) {
                this.contextKeyService.createKey(forwardedPortsViewEnabled.key, true);
            }
            const viewContainer = await this.getViewContainer();
            const tunnelPanelDescriptor = new TunnelPanelDescriptor(new TunnelViewModel(this.remoteExplorerService, this.tunnelService), this.environmentService);
            const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
            if (viewContainer) {
                this.remoteExplorerService.enablePortsFeatures(!featuresEnabled);
                viewsRegistry.registerViews([tunnelPanelDescriptor], viewContainer);
            }
        }
        else {
            this.contextKeyListener.value = this.contextKeyService.onDidChangeContext((e) => {
                if (e.affectsSome(new Set([...forwardedPortsFeaturesEnabled.keys(), ...forwardedPortsViewEnabled.keys()]))) {
                    this.enableForwardedPortsFeatures();
                }
            });
        }
    }
    enableBadgeAndStatusBar() {
        const disposable = Registry.as(Extensions.ViewsRegistry).onViewsRegistered((e) => {
            if (e.find((view) => view.views.find((viewDescriptor) => viewDescriptor.id === TUNNEL_VIEW_ID))) {
                this._register(Event.debounce(this.remoteExplorerService.tunnelModel.onForwardPort, (_last, e) => e, 50)(() => {
                    this.updateActivityBadge();
                    this.updateStatusBar();
                }));
                this._register(Event.debounce(this.remoteExplorerService.tunnelModel.onClosePort, (_last, e) => e, 50)(() => {
                    this.updateActivityBadge();
                    this.updateStatusBar();
                }));
                this.updateActivityBadge();
                this.updateStatusBar();
                disposable.dispose();
            }
        });
    }
    async updateActivityBadge() {
        if (this.remoteExplorerService.tunnelModel.forwarded.size > 0) {
            this.activityBadge.value = this.activityService.showViewActivity(TUNNEL_VIEW_ID, {
                badge: new NumberBadge(this.remoteExplorerService.tunnelModel.forwarded.size, (n) => n === 1
                    ? nls.localize('1forwardedPort', '1 forwarded port')
                    : nls.localize('nForwardedPorts', '{0} forwarded ports', n)),
            });
        }
        else {
            this.activityBadge.clear();
        }
    }
    updateStatusBar() {
        if (!this.environmentService.remoteAuthority && !this.hasPortsInSession) {
            // We only want to show the ports status bar entry when the user has taken an action that indicates that they might care about it.
            return;
        }
        if (!this.entryAccessor) {
            this._register((this.entryAccessor = this.statusbarService.addEntry(this.entry, 'status.forwardedPorts', 0 /* StatusbarAlignment.LEFT */, 40)));
        }
        else {
            this.entryAccessor.update(this.entry);
        }
    }
    get entry() {
        let tooltip;
        const count = this.remoteExplorerService.tunnelModel.forwarded.size +
            this.remoteExplorerService.tunnelModel.detected.size;
        const text = `${count}`;
        if (count === 0) {
            tooltip = nls.localize('remote.forwardedPorts.statusbarTextNone', 'No Ports Forwarded');
        }
        else {
            const allTunnels = Array.from(this.remoteExplorerService.tunnelModel.forwarded.values());
            allTunnels.push(...Array.from(this.remoteExplorerService.tunnelModel.detected.values()));
            tooltip = nls.localize('remote.forwardedPorts.statusbarTooltip', 'Forwarded Ports: {0}', allTunnels.map((forwarded) => forwarded.remotePort).join(', '));
        }
        return {
            name: nls.localize('status.forwardedPorts', 'Forwarded Ports'),
            text: `$(radio-tower) ${text}`,
            ariaLabel: tooltip,
            tooltip,
            command: `${TUNNEL_VIEW_ID}.focus`,
        };
    }
};
ForwardedPortsView = __decorate([
    __param(0, IContextKeyService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IRemoteExplorerService),
    __param(3, ITunnelService),
    __param(4, IActivityService),
    __param(5, IStatusbarService)
], ForwardedPortsView);
export { ForwardedPortsView };
let PortRestore = class PortRestore {
    constructor(remoteExplorerService, logService) {
        this.remoteExplorerService = remoteExplorerService;
        this.logService = logService;
        if (!this.remoteExplorerService.tunnelModel.environmentTunnelsSet) {
            Event.once(this.remoteExplorerService.tunnelModel.onEnvironmentTunnelsSet)(async () => {
                await this.restore();
            });
        }
        else {
            this.restore();
        }
    }
    async restore() {
        this.logService.trace('ForwardedPorts: Doing first restore.');
        return this.remoteExplorerService.restore();
    }
};
PortRestore = __decorate([
    __param(0, IRemoteExplorerService),
    __param(1, ILogService)
], PortRestore);
export { PortRestore };
let AutomaticPortForwarding = class AutomaticPortForwarding extends Disposable {
    constructor(terminalService, notificationService, openerService, externalOpenerService, remoteExplorerService, environmentService, contextKeyService, configurationService, debugService, remoteAgentService, tunnelService, hostService, logService, storageService, preferencesService) {
        super();
        this.terminalService = terminalService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.externalOpenerService = externalOpenerService;
        this.remoteExplorerService = remoteExplorerService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.debugService = debugService;
        this.tunnelService = tunnelService;
        this.hostService = hostService;
        this.logService = logService;
        this.storageService = storageService;
        this.preferencesService = preferencesService;
        if (!environmentService.remoteAuthority) {
            return;
        }
        configurationService
            .whenRemoteConfigurationLoaded()
            .then(() => remoteAgentService.getEnvironment())
            .then((environment) => {
            this.setup(environment);
            this._register(configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration(PORT_AUTO_SOURCE_SETTING)) {
                    this.setup(environment);
                }
                else if (e.affectsConfiguration(PORT_AUTO_FALLBACK_SETTING) && !this.portListener) {
                    this.listenForPorts();
                }
            }));
        });
        if (!this.storageService.getBoolean('processPortForwardingFallback', 1 /* StorageScope.WORKSPACE */, true)) {
            this.configurationService.updateValue(PORT_AUTO_FALLBACK_SETTING, 0, 5 /* ConfigurationTarget.WORKSPACE */);
        }
    }
    getPortAutoFallbackNumber() {
        const fallbackAt = this.configurationService.inspect(PORT_AUTO_FALLBACK_SETTING);
        if (fallbackAt.value !== undefined &&
            (fallbackAt.value === 0 || fallbackAt.value !== fallbackAt.defaultValue)) {
            return fallbackAt.value;
        }
        const inspectSource = this.configurationService.inspect(PORT_AUTO_SOURCE_SETTING);
        if (inspectSource.applicationValue === PORT_AUTO_SOURCE_SETTING_PROCESS ||
            inspectSource.userValue === PORT_AUTO_SOURCE_SETTING_PROCESS ||
            inspectSource.userLocalValue === PORT_AUTO_SOURCE_SETTING_PROCESS ||
            inspectSource.userRemoteValue === PORT_AUTO_SOURCE_SETTING_PROCESS ||
            inspectSource.workspaceFolderValue === PORT_AUTO_SOURCE_SETTING_PROCESS ||
            inspectSource.workspaceValue === PORT_AUTO_SOURCE_SETTING_PROCESS) {
            return 0;
        }
        return fallbackAt.value ?? 20;
    }
    listenForPorts() {
        let fallbackAt = this.getPortAutoFallbackNumber();
        if (fallbackAt === 0) {
            this.portListener?.dispose();
            return;
        }
        if (this.procForwarder &&
            !this.portListener &&
            this.configurationService.getValue(PORT_AUTO_SOURCE_SETTING) ===
                PORT_AUTO_SOURCE_SETTING_PROCESS) {
            this.portListener = this._register(this.remoteExplorerService.tunnelModel.onForwardPort(async () => {
                fallbackAt = this.getPortAutoFallbackNumber();
                if (fallbackAt === 0) {
                    this.portListener?.dispose();
                    return;
                }
                if (Array.from(this.remoteExplorerService.tunnelModel.forwarded.values()).filter((tunnel) => tunnel.source.source === TunnelSource.Auto).length > fallbackAt) {
                    await this.configurationService.updateValue(PORT_AUTO_SOURCE_SETTING, PORT_AUTO_SOURCE_SETTING_HYBRID);
                    this.notificationService.notify({
                        message: nls.localize('remote.autoForwardPortsSource.fallback', 'Over 20 ports have been automatically forwarded. The `process` based automatic port forwarding has been switched to `hybrid` in settings. Some ports may no longer be detected.'),
                        severity: Severity.Warning,
                        actions: {
                            primary: [
                                new Action('switchBack', nls.localize('remote.autoForwardPortsSource.fallback.switchBack', 'Undo'), undefined, true, async () => {
                                    await this.configurationService.updateValue(PORT_AUTO_SOURCE_SETTING, PORT_AUTO_SOURCE_SETTING_PROCESS);
                                    await this.configurationService.updateValue(PORT_AUTO_FALLBACK_SETTING, 0, 5 /* ConfigurationTarget.WORKSPACE */);
                                    this.portListener?.dispose();
                                    this.portListener = undefined;
                                }),
                                new Action('showPortSourceSetting', nls.localize('remote.autoForwardPortsSource.fallback.showPortSourceSetting', 'Show Setting'), undefined, true, async () => {
                                    await this.preferencesService.openSettings({
                                        query: 'remote.autoForwardPortsSource',
                                    });
                                }),
                            ],
                        },
                    });
                }
            }));
        }
        else {
            this.portListener?.dispose();
            this.portListener = undefined;
        }
    }
    setup(environment) {
        const alreadyForwarded = this.procForwarder?.forwarded;
        const isSwitch = this.outputForwarder || this.procForwarder;
        this.procForwarder?.dispose();
        this.procForwarder = undefined;
        this.outputForwarder?.dispose();
        this.outputForwarder = undefined;
        if (environment?.os !== 3 /* OperatingSystem.Linux */) {
            if (this.configurationService.inspect(PORT_AUTO_SOURCE_SETTING).default?.value !==
                PORT_AUTO_SOURCE_SETTING_OUTPUT) {
                Registry.as(ConfigurationExtensions.Configuration).registerDefaultConfigurations([
                    { overrides: { 'remote.autoForwardPortsSource': PORT_AUTO_SOURCE_SETTING_OUTPUT } },
                ]);
            }
            this.outputForwarder = this._register(new OutputAutomaticPortForwarding(this.terminalService, this.notificationService, this.openerService, this.externalOpenerService, this.remoteExplorerService, this.configurationService, this.debugService, this.tunnelService, this.hostService, this.logService, this.contextKeyService, () => false));
        }
        else {
            const useProc = () => this.configurationService.getValue(PORT_AUTO_SOURCE_SETTING) ===
                PORT_AUTO_SOURCE_SETTING_PROCESS;
            if (useProc()) {
                this.procForwarder = this._register(new ProcAutomaticPortForwarding(false, alreadyForwarded, !isSwitch, this.configurationService, this.remoteExplorerService, this.notificationService, this.openerService, this.externalOpenerService, this.tunnelService, this.hostService, this.logService, this.contextKeyService));
            }
            else if (this.configurationService.getValue(PORT_AUTO_SOURCE_SETTING) ===
                PORT_AUTO_SOURCE_SETTING_HYBRID) {
                this.procForwarder = this._register(new ProcAutomaticPortForwarding(true, alreadyForwarded, !isSwitch, this.configurationService, this.remoteExplorerService, this.notificationService, this.openerService, this.externalOpenerService, this.tunnelService, this.hostService, this.logService, this.contextKeyService));
            }
            this.outputForwarder = this._register(new OutputAutomaticPortForwarding(this.terminalService, this.notificationService, this.openerService, this.externalOpenerService, this.remoteExplorerService, this.configurationService, this.debugService, this.tunnelService, this.hostService, this.logService, this.contextKeyService, useProc));
        }
        this.listenForPorts();
    }
};
AutomaticPortForwarding = __decorate([
    __param(0, ITerminalService),
    __param(1, INotificationService),
    __param(2, IOpenerService),
    __param(3, IExternalUriOpenerService),
    __param(4, IRemoteExplorerService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IContextKeyService),
    __param(7, IWorkbenchConfigurationService),
    __param(8, IDebugService),
    __param(9, IRemoteAgentService),
    __param(10, ITunnelService),
    __param(11, IHostService),
    __param(12, ILogService),
    __param(13, IStorageService),
    __param(14, IPreferencesService)
], AutomaticPortForwarding);
export { AutomaticPortForwarding };
class OnAutoForwardedAction extends Disposable {
    static { this.NOTIFY_COOL_DOWN = 5000; } // milliseconds
    constructor(notificationService, remoteExplorerService, openerService, externalOpenerService, tunnelService, hostService, logService, contextKeyService) {
        super();
        this.notificationService = notificationService;
        this.remoteExplorerService = remoteExplorerService;
        this.openerService = openerService;
        this.externalOpenerService = externalOpenerService;
        this.tunnelService = tunnelService;
        this.hostService = hostService;
        this.logService = logService;
        this.contextKeyService = contextKeyService;
        this.alreadyOpenedOnce = new Set();
        this.lastNotifyTime = new Date();
        this.lastNotifyTime.setFullYear(this.lastNotifyTime.getFullYear() - 1);
    }
    async doAction(tunnels) {
        this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Starting action for ${tunnels[0]?.tunnelRemotePort}`);
        this.doActionTunnels = tunnels;
        const tunnel = await this.portNumberHeuristicDelay();
        this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Heuristic chose ${tunnel?.tunnelRemotePort}`);
        if (tunnel) {
            const allAttributes = await this.remoteExplorerService.tunnelModel.getAttributes([
                { port: tunnel.tunnelRemotePort, host: tunnel.tunnelRemoteHost },
            ]);
            const attributes = allAttributes?.get(tunnel.tunnelRemotePort)?.onAutoForward;
            this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) onAutoForward action is ${attributes}`);
            switch (attributes) {
                case OnPortForward.OpenBrowserOnce: {
                    if (this.alreadyOpenedOnce.has(tunnel.localAddress)) {
                        break;
                    }
                    this.alreadyOpenedOnce.add(tunnel.localAddress);
                    // Intentionally do not break so that the open browser path can be run.
                }
                case OnPortForward.OpenBrowser: {
                    const address = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                    await OpenPortInBrowserAction.run(this.remoteExplorerService.tunnelModel, this.openerService, address);
                    break;
                }
                case OnPortForward.OpenPreview: {
                    const address = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                    await OpenPortInPreviewAction.run(this.remoteExplorerService.tunnelModel, this.openerService, this.externalOpenerService, address);
                    break;
                }
                case OnPortForward.Silent:
                    break;
                default: {
                    const elapsed = new Date().getTime() - this.lastNotifyTime.getTime();
                    this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) time elapsed since last notification ${elapsed} ms`);
                    if (elapsed > OnAutoForwardedAction.NOTIFY_COOL_DOWN) {
                        await this.showNotification(tunnel);
                    }
                }
            }
        }
    }
    hide(removedPorts) {
        if (this.doActionTunnels) {
            this.doActionTunnels = this.doActionTunnels.filter((value) => !removedPorts.includes(value.tunnelRemotePort));
        }
        if (this.lastShownPort && removedPorts.indexOf(this.lastShownPort) >= 0) {
            this.lastNotification?.close();
        }
    }
    async portNumberHeuristicDelay() {
        this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Starting heuristic delay`);
        if (!this.doActionTunnels || this.doActionTunnels.length === 0) {
            return;
        }
        this.doActionTunnels = this.doActionTunnels.sort((a, b) => a.tunnelRemotePort - b.tunnelRemotePort);
        const firstTunnel = this.doActionTunnels.shift();
        // Heuristic.
        if (firstTunnel.tunnelRemotePort % 1000 === 0) {
            this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Heuristic chose tunnel because % 1000: ${firstTunnel.tunnelRemotePort}`);
            this.newerTunnel = firstTunnel;
            return firstTunnel;
            // 9229 is the node inspect port
        }
        else if (firstTunnel.tunnelRemotePort < 10000 && firstTunnel.tunnelRemotePort !== 9229) {
            this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Heuristic chose tunnel because < 10000: ${firstTunnel.tunnelRemotePort}`);
            this.newerTunnel = firstTunnel;
            return firstTunnel;
        }
        this.logService.trace(`ForwardedPorts: (OnAutoForwardedAction) Waiting for "better" tunnel than ${firstTunnel.tunnelRemotePort}`);
        this.newerTunnel = undefined;
        return new Promise((resolve) => {
            setTimeout(() => {
                if (this.newerTunnel) {
                    resolve(undefined);
                }
                else if (this.doActionTunnels?.includes(firstTunnel)) {
                    resolve(firstTunnel);
                }
                else {
                    resolve(undefined);
                }
            }, 3000);
        });
    }
    async basicMessage(tunnel) {
        const properties = await this.remoteExplorerService.tunnelModel.getAttributes([{ host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort }], false);
        const label = properties?.get(tunnel.tunnelRemotePort)?.label;
        return nls.localize('remote.tunnelsView.automaticForward', 'Your application{0} running on port {1} is available.  ', label ? ` (${label})` : '', tunnel.tunnelRemotePort);
    }
    linkMessage() {
        return nls.localize({
            key: 'remote.tunnelsView.notificationLink2',
            comment: [
                '[See all forwarded ports]({0}) is a link. Only translate `See all forwarded ports`. Do not change brackets and parentheses or {0}',
            ],
        }, '[See all forwarded ports]({0})', `command:${TunnelPanel.ID}.focus`);
    }
    async showNotification(tunnel) {
        if (!(await this.hostService.hadLastFocus())) {
            return;
        }
        this.lastNotification?.close();
        let message = await this.basicMessage(tunnel);
        const choices = [this.openBrowserChoice(tunnel)];
        if (!isWeb || openPreviewEnabledContext.getValue(this.contextKeyService)) {
            choices.push(this.openPreviewChoice(tunnel));
        }
        if (tunnel.tunnelLocalPort !== tunnel.tunnelRemotePort &&
            this.tunnelService.canElevate &&
            this.tunnelService.isPortPrivileged(tunnel.tunnelRemotePort)) {
            // Privileged ports are not on Windows, so it's safe to use "superuser"
            message += nls.localize('remote.tunnelsView.elevationMessage', "You'll need to run as superuser to use port {0} locally.  ", tunnel.tunnelRemotePort);
            choices.unshift(this.elevateChoice(tunnel));
        }
        if (tunnel.privacy === TunnelPrivacyId.Private &&
            isWeb &&
            this.tunnelService.canChangePrivacy) {
            choices.push(this.makePublicChoice(tunnel));
        }
        message += this.linkMessage();
        this.lastNotification = this.notificationService.prompt(Severity.Info, message, choices, {
            neverShowAgain: { id: 'remote.tunnelsView.autoForwardNeverShow', isSecondary: true },
        });
        this.lastShownPort = tunnel.tunnelRemotePort;
        this.lastNotifyTime = new Date();
        this.lastNotification.onDidClose(() => {
            this.lastNotification = undefined;
            this.lastShownPort = undefined;
        });
    }
    makePublicChoice(tunnel) {
        return {
            label: nls.localize('remote.tunnelsView.makePublic', 'Make Public'),
            run: async () => {
                const oldTunnelDetails = mapHasAddressLocalhostOrAllInterfaces(this.remoteExplorerService.tunnelModel.forwarded, tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                await this.remoteExplorerService.close({ host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort }, TunnelCloseReason.Other);
                return this.remoteExplorerService.forward({
                    remote: { host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort },
                    local: tunnel.tunnelLocalPort,
                    name: oldTunnelDetails?.name,
                    elevateIfNeeded: true,
                    privacy: TunnelPrivacyId.Public,
                    source: oldTunnelDetails?.source,
                });
            },
        };
    }
    openBrowserChoice(tunnel) {
        const address = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
        return {
            label: OpenPortInBrowserAction.LABEL,
            run: () => OpenPortInBrowserAction.run(this.remoteExplorerService.tunnelModel, this.openerService, address),
        };
    }
    openPreviewChoice(tunnel) {
        const address = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
        return {
            label: OpenPortInPreviewAction.LABEL,
            run: () => OpenPortInPreviewAction.run(this.remoteExplorerService.tunnelModel, this.openerService, this.externalOpenerService, address),
        };
    }
    elevateChoice(tunnel) {
        return {
            // Privileged ports are not on Windows, so it's ok to stick to just "sudo".
            label: nls.localize('remote.tunnelsView.elevationButton', 'Use Port {0} as Sudo...', tunnel.tunnelRemotePort),
            run: async () => {
                await this.remoteExplorerService.close({ host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort }, TunnelCloseReason.Other);
                const newTunnel = await this.remoteExplorerService.forward({
                    remote: { host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort },
                    local: tunnel.tunnelRemotePort,
                    elevateIfNeeded: true,
                    source: AutoTunnelSource,
                });
                if (!newTunnel || typeof newTunnel === 'string') {
                    return;
                }
                this.lastNotification?.close();
                this.lastShownPort = newTunnel.tunnelRemotePort;
                this.lastNotification = this.notificationService.prompt(Severity.Info, (await this.basicMessage(newTunnel)) + this.linkMessage(), [this.openBrowserChoice(newTunnel), this.openPreviewChoice(tunnel)], { neverShowAgain: { id: 'remote.tunnelsView.autoForwardNeverShow', isSecondary: true } });
                this.lastNotification.onDidClose(() => {
                    this.lastNotification = undefined;
                    this.lastShownPort = undefined;
                });
            },
        };
    }
}
class OutputAutomaticPortForwarding extends Disposable {
    constructor(terminalService, notificationService, openerService, externalOpenerService, remoteExplorerService, configurationService, debugService, tunnelService, hostService, logService, contextKeyService, privilegedOnly) {
        super();
        this.terminalService = terminalService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.externalOpenerService = externalOpenerService;
        this.remoteExplorerService = remoteExplorerService;
        this.configurationService = configurationService;
        this.debugService = debugService;
        this.tunnelService = tunnelService;
        this.hostService = hostService;
        this.logService = logService;
        this.contextKeyService = contextKeyService;
        this.privilegedOnly = privilegedOnly;
        this.notifier = new OnAutoForwardedAction(notificationService, remoteExplorerService, openerService, externalOpenerService, tunnelService, hostService, logService, contextKeyService);
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(PORT_AUTO_FORWARD_SETTING)) {
                this.tryStartStopUrlFinder();
            }
        }));
        this.portsFeatures = this._register(this.remoteExplorerService.onEnabledPortsFeatures(() => {
            this.tryStartStopUrlFinder();
        }));
        this.tryStartStopUrlFinder();
        if (configurationService.getValue(PORT_AUTO_SOURCE_SETTING) === PORT_AUTO_SOURCE_SETTING_HYBRID) {
            this._register(this.tunnelService.onTunnelClosed((tunnel) => this.notifier.hide([tunnel.port])));
        }
    }
    tryStartStopUrlFinder() {
        if (this.configurationService.getValue(PORT_AUTO_FORWARD_SETTING)) {
            this.startUrlFinder();
        }
        else {
            this.stopUrlFinder();
        }
    }
    startUrlFinder() {
        if (!this.urlFinder &&
            this.remoteExplorerService.portsFeaturesEnabled !== PortsEnablement.AdditionalFeatures) {
            return;
        }
        this.portsFeatures?.dispose();
        this.urlFinder = this._register(new UrlFinder(this.terminalService, this.debugService));
        this._register(this.urlFinder.onDidMatchLocalUrl(async (localUrl) => {
            if (mapHasAddressLocalhostOrAllInterfaces(this.remoteExplorerService.tunnelModel.detected, localUrl.host, localUrl.port)) {
                return;
            }
            const attributes = (await this.remoteExplorerService.tunnelModel.getAttributes([localUrl]))?.get(localUrl.port);
            if (attributes?.onAutoForward === OnPortForward.Ignore) {
                return;
            }
            if (this.privilegedOnly() && !this.tunnelService.isPortPrivileged(localUrl.port)) {
                return;
            }
            const forwarded = await this.remoteExplorerService.forward({ remote: localUrl, source: AutoTunnelSource }, attributes ?? null);
            if (forwarded && typeof forwarded !== 'string') {
                this.notifier.doAction([forwarded]);
            }
        }));
    }
    stopUrlFinder() {
        if (this.urlFinder) {
            this.urlFinder.dispose();
            this.urlFinder = undefined;
        }
    }
}
class ProcAutomaticPortForwarding extends Disposable {
    constructor(unforwardOnly, alreadyAutoForwarded, needsInitialCandidates, configurationService, remoteExplorerService, notificationService, openerService, externalOpenerService, tunnelService, hostService, logService, contextKeyService) {
        super();
        this.unforwardOnly = unforwardOnly;
        this.alreadyAutoForwarded = alreadyAutoForwarded;
        this.needsInitialCandidates = needsInitialCandidates;
        this.configurationService = configurationService;
        this.remoteExplorerService = remoteExplorerService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.externalOpenerService = externalOpenerService;
        this.tunnelService = tunnelService;
        this.hostService = hostService;
        this.logService = logService;
        this.contextKeyService = contextKeyService;
        this.autoForwarded = new Set();
        this.notifiedOnly = new Set();
        this.initialCandidates = new Set();
        this.notifier = new OnAutoForwardedAction(notificationService, remoteExplorerService, openerService, externalOpenerService, tunnelService, hostService, logService, contextKeyService);
        alreadyAutoForwarded?.forEach((port) => this.autoForwarded.add(port));
        this.initialize();
    }
    get forwarded() {
        return this.autoForwarded;
    }
    async initialize() {
        if (!this.remoteExplorerService.tunnelModel.environmentTunnelsSet) {
            await new Promise((resolve) => this.remoteExplorerService.tunnelModel.onEnvironmentTunnelsSet(() => resolve()));
        }
        this._register(this.configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration(PORT_AUTO_FORWARD_SETTING)) {
                await this.startStopCandidateListener();
            }
        }));
        this.portsFeatures = this._register(this.remoteExplorerService.onEnabledPortsFeatures(async () => {
            await this.startStopCandidateListener();
        }));
        this.startStopCandidateListener();
    }
    async startStopCandidateListener() {
        if (this.configurationService.getValue(PORT_AUTO_FORWARD_SETTING)) {
            await this.startCandidateListener();
        }
        else {
            this.stopCandidateListener();
        }
    }
    stopCandidateListener() {
        if (this.candidateListener) {
            this.candidateListener.dispose();
            this.candidateListener = undefined;
        }
    }
    async startCandidateListener() {
        if (this.candidateListener ||
            this.remoteExplorerService.portsFeaturesEnabled !== PortsEnablement.AdditionalFeatures) {
            return;
        }
        this.portsFeatures?.dispose();
        // Capture list of starting candidates so we don't auto forward them later.
        await this.setInitialCandidates();
        // Need to check the setting again, since it may have changed while we waited for the initial candidates to be set.
        if (this.configurationService.getValue(PORT_AUTO_FORWARD_SETTING)) {
            this.candidateListener = this._register(this.remoteExplorerService.tunnelModel.onCandidatesChanged(this.handleCandidateUpdate, this));
        }
    }
    async setInitialCandidates() {
        if (!this.needsInitialCandidates) {
            this.logService.debug(`ForwardedPorts: (ProcForwarding) Not setting initial candidates`);
            return;
        }
        let startingCandidates = this.remoteExplorerService.tunnelModel.candidatesOrUndefined;
        if (!startingCandidates) {
            await new Promise((resolve) => this.remoteExplorerService.tunnelModel.onCandidatesChanged(() => resolve()));
            startingCandidates = this.remoteExplorerService.tunnelModel.candidates;
        }
        for (const value of startingCandidates) {
            this.initialCandidates.add(makeAddress(value.host, value.port));
        }
        this.logService.debug(`ForwardedPorts: (ProcForwarding) Initial candidates set to ${startingCandidates.map((candidate) => candidate.port).join(', ')}`);
    }
    async forwardCandidates() {
        let attributes;
        const allTunnels = [];
        this.logService.trace(`ForwardedPorts: (ProcForwarding) Attempting to forward ${this.remoteExplorerService.tunnelModel.candidates.length} candidates`);
        for (const value of this.remoteExplorerService.tunnelModel.candidates) {
            if (!value.detail) {
                this.logService.trace(`ForwardedPorts: (ProcForwarding) Port ${value.port} missing detail`);
                continue;
            }
            if (!attributes) {
                attributes = await this.remoteExplorerService.tunnelModel.getAttributes(this.remoteExplorerService.tunnelModel.candidates);
            }
            const portAttributes = attributes?.get(value.port);
            const address = makeAddress(value.host, value.port);
            if (this.initialCandidates.has(address) && portAttributes?.onAutoForward === undefined) {
                continue;
            }
            if (this.notifiedOnly.has(address) || this.autoForwarded.has(address)) {
                continue;
            }
            const alreadyForwarded = mapHasAddressLocalhostOrAllInterfaces(this.remoteExplorerService.tunnelModel.forwarded, value.host, value.port);
            if (mapHasAddressLocalhostOrAllInterfaces(this.remoteExplorerService.tunnelModel.detected, value.host, value.port)) {
                continue;
            }
            if (portAttributes?.onAutoForward === OnPortForward.Ignore) {
                this.logService.trace(`ForwardedPorts: (ProcForwarding) Port ${value.port} is ignored`);
                continue;
            }
            const forwarded = await this.remoteExplorerService.forward({ remote: value, source: AutoTunnelSource }, portAttributes ?? null);
            if (!alreadyForwarded && forwarded) {
                this.logService.trace(`ForwardedPorts: (ProcForwarding) Port ${value.port} has been forwarded`);
                this.autoForwarded.add(address);
            }
            else if (forwarded) {
                this.logService.trace(`ForwardedPorts: (ProcForwarding) Port ${value.port} has been notified`);
                this.notifiedOnly.add(address);
            }
            if (forwarded && typeof forwarded !== 'string') {
                allTunnels.push(forwarded);
            }
        }
        this.logService.trace(`ForwardedPorts: (ProcForwarding) Forwarded ${allTunnels.length} candidates`);
        if (allTunnels.length === 0) {
            return undefined;
        }
        return allTunnels;
    }
    async handleCandidateUpdate(removed) {
        const removedPorts = [];
        let autoForwarded;
        if (this.unforwardOnly) {
            autoForwarded = new Map();
            for (const entry of this.remoteExplorerService.tunnelModel.forwarded.entries()) {
                if (entry[1].source.source === TunnelSource.Auto) {
                    autoForwarded.set(entry[0], entry[1]);
                }
            }
        }
        else {
            autoForwarded = new Map(this.autoForwarded.entries());
        }
        for (const removedPort of removed) {
            const key = removedPort[0];
            let value = removedPort[1];
            const forwardedValue = mapHasAddressLocalhostOrAllInterfaces(autoForwarded, value.host, value.port);
            if (forwardedValue) {
                if (typeof forwardedValue === 'string') {
                    this.autoForwarded.delete(key);
                }
                else {
                    value = { host: forwardedValue.remoteHost, port: forwardedValue.remotePort };
                }
                await this.remoteExplorerService.close(value, TunnelCloseReason.AutoForwardEnd);
                removedPorts.push(value.port);
            }
            else if (this.notifiedOnly.has(key)) {
                this.notifiedOnly.delete(key);
                removedPorts.push(value.port);
            }
            else if (this.initialCandidates.has(key)) {
                this.initialCandidates.delete(key);
            }
        }
        if (this.unforwardOnly) {
            return;
        }
        if (removedPorts.length > 0) {
            await this.notifier.hide(removedPorts);
        }
        const tunnels = await this.forwardCandidates();
        if (tunnels) {
            await this.notifier.doAction(tunnels);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXhwbG9yZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9icm93c2VyL3JlbW90ZUV4cGxvcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpHLE9BQU8sRUFDTixVQUFVLEdBS1YsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLDBCQUEwQixFQUMxQix5QkFBeUIsRUFDekIsd0JBQXdCLEVBQ3hCLCtCQUErQixFQUMvQiwrQkFBK0IsRUFDL0IsZ0NBQWdDLEVBQ2hDLGVBQWUsRUFDZix3QkFBd0IsRUFDeEIsY0FBYyxHQUNkLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUVOLGdCQUFnQixFQUNoQiw2QkFBNkIsRUFDN0IseUJBQXlCLEVBQ3pCLFdBQVcsRUFDWCxxQ0FBcUMsRUFDckMsYUFBYSxFQUViLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHVCQUF1QixFQUN2QixXQUFXLEVBQ1gscUJBQXFCLEVBQ3JCLGVBQWUsRUFDZix1QkFBdUIsRUFDdkIseUJBQXlCLEdBQ3pCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDekcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9B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
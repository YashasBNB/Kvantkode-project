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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXhwbG9yZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvYnJvd3Nlci9yZW1vdGVFeHBsb3Jlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRyxPQUFPLEVBQ04sVUFBVSxHQUtWLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLHNCQUFzQixFQUN0QiwwQkFBMEIsRUFDMUIseUJBQXlCLEVBQ3pCLHdCQUF3QixFQUN4QiwrQkFBK0IsRUFDL0IsK0JBQStCLEVBQy9CLGdDQUFnQyxFQUNoQyxlQUFlLEVBQ2Ysd0JBQXdCLEVBQ3hCLGNBQWMsR0FDZCxNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFFTixnQkFBZ0IsRUFDaEIsNkJBQTZCLEVBQzdCLHlCQUF5QixFQUN6QixXQUFXLEVBQ1gscUNBQXFDLEVBQ3JDLGFBQWEsRUFFYixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLGlCQUFpQixFQUNqQix1QkFBdUIsRUFDdkIsV0FBVyxFQUNYLHFCQUFxQixFQUNyQixlQUFlLEVBQ2YsdUJBQXVCLEVBQ3ZCLHlCQUF5QixHQUN6QixNQUFNLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVB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
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
import * as nls from '../../../../nls.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IRemoteAuthorityResolverService, } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITunnelService, TunnelProtocol, TunnelPrivacyId, LOCALHOST_ADDRESSES, isLocalhost, isAllInterfaces, ProvidedOnAutoForward, ALL_INTERFACES_ADDRESSES, } from '../../../../platform/tunnel/common/tunnel.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isNumber, isObject, isString } from '../../../../base/common/types.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
const MISMATCH_LOCAL_PORT_COOLDOWN = 10 * 1000; // 10 seconds
const TUNNELS_TO_RESTORE = 'remote.tunnels.toRestore';
const TUNNELS_TO_RESTORE_EXPIRATION = 'remote.tunnels.toRestoreExpiration';
const RESTORE_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 14; // 2 weeks
export const ACTIVATION_EVENT = 'onTunnel';
export const forwardedPortsFeaturesEnabled = new RawContextKey('forwardedPortsViewEnabled', false, nls.localize('tunnel.forwardedPortsViewEnabled', 'Whether the Ports view is enabled.'));
export const forwardedPortsViewEnabled = new RawContextKey('forwardedPortsViewOnlyEnabled', false, nls.localize('tunnel.forwardedPortsViewEnabled', 'Whether the Ports view is enabled.'));
export function parseAddress(address) {
    const matches = address.match(/^([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*:)?([0-9]+)$/);
    if (!matches) {
        return undefined;
    }
    return {
        host: matches[1]?.substring(0, matches[1].length - 1) || 'localhost',
        port: Number(matches[2]),
    };
}
export var TunnelCloseReason;
(function (TunnelCloseReason) {
    TunnelCloseReason["Other"] = "Other";
    TunnelCloseReason["User"] = "User";
    TunnelCloseReason["AutoForwardEnd"] = "AutoForwardEnd";
})(TunnelCloseReason || (TunnelCloseReason = {}));
export var TunnelSource;
(function (TunnelSource) {
    TunnelSource[TunnelSource["User"] = 0] = "User";
    TunnelSource[TunnelSource["Auto"] = 1] = "Auto";
    TunnelSource[TunnelSource["Extension"] = 2] = "Extension";
})(TunnelSource || (TunnelSource = {}));
export const UserTunnelSource = {
    source: TunnelSource.User,
    description: nls.localize('tunnel.source.user', 'User Forwarded'),
};
export const AutoTunnelSource = {
    source: TunnelSource.Auto,
    description: nls.localize('tunnel.source.auto', 'Auto Forwarded'),
};
export function mapHasAddress(map, host, port) {
    const initialAddress = map.get(makeAddress(host, port));
    if (initialAddress) {
        return initialAddress;
    }
    if (isLocalhost(host)) {
        // Do localhost checks
        for (const testHost of LOCALHOST_ADDRESSES) {
            const testAddress = makeAddress(testHost, port);
            if (map.has(testAddress)) {
                return map.get(testAddress);
            }
        }
    }
    else if (isAllInterfaces(host)) {
        // Do all interfaces checks
        for (const testHost of ALL_INTERFACES_ADDRESSES) {
            const testAddress = makeAddress(testHost, port);
            if (map.has(testAddress)) {
                return map.get(testAddress);
            }
        }
    }
    return undefined;
}
export function mapHasAddressLocalhostOrAllInterfaces(map, host, port) {
    const originalAddress = mapHasAddress(map, host, port);
    if (originalAddress) {
        return originalAddress;
    }
    const otherHost = isAllInterfaces(host) ? 'localhost' : isLocalhost(host) ? '0.0.0.0' : undefined;
    if (otherHost) {
        return mapHasAddress(map, otherHost, port);
    }
    return undefined;
}
export function makeAddress(host, port) {
    return host + ':' + port;
}
export var OnPortForward;
(function (OnPortForward) {
    OnPortForward["Notify"] = "notify";
    OnPortForward["OpenBrowser"] = "openBrowser";
    OnPortForward["OpenBrowserOnce"] = "openBrowserOnce";
    OnPortForward["OpenPreview"] = "openPreview";
    OnPortForward["Silent"] = "silent";
    OnPortForward["Ignore"] = "ignore";
})(OnPortForward || (OnPortForward = {}));
export function isCandidatePort(candidate) {
    return (candidate &&
        'host' in candidate &&
        typeof candidate.host === 'string' &&
        'port' in candidate &&
        typeof candidate.port === 'number' &&
        (!('detail' in candidate) || typeof candidate.detail === 'string') &&
        (!('pid' in candidate) || typeof candidate.pid === 'string'));
}
export class PortsAttributes extends Disposable {
    static { this.SETTING = 'remote.portsAttributes'; }
    static { this.DEFAULTS = 'remote.otherPortsAttributes'; }
    static { this.RANGE = /^(\d+)\-(\d+)$/; }
    static { this.HOST_AND_PORT = /^([a-z0-9\-]+):(\d{1,5})$/; }
    constructor(configurationService) {
        super();
        this.configurationService = configurationService;
        this.portsAttributes = [];
        this._onDidChangeAttributes = new Emitter();
        this.onDidChangeAttributes = this._onDidChangeAttributes.event;
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(PortsAttributes.SETTING) ||
                e.affectsConfiguration(PortsAttributes.DEFAULTS)) {
                this.updateAttributes();
            }
        }));
        this.updateAttributes();
    }
    updateAttributes() {
        this.portsAttributes = this.readSetting();
        this._onDidChangeAttributes.fire();
    }
    getAttributes(port, host, commandLine) {
        let index = this.findNextIndex(port, host, commandLine, this.portsAttributes, 0);
        const attributes = {
            label: undefined,
            onAutoForward: undefined,
            elevateIfNeeded: undefined,
            requireLocalPort: undefined,
            protocol: undefined,
        };
        while (index >= 0) {
            const found = this.portsAttributes[index];
            if (found.key === port) {
                attributes.onAutoForward = found.onAutoForward ?? attributes.onAutoForward;
                attributes.elevateIfNeeded =
                    found.elevateIfNeeded !== undefined ? found.elevateIfNeeded : attributes.elevateIfNeeded;
                attributes.label = found.label ?? attributes.label;
                attributes.requireLocalPort = found.requireLocalPort;
                attributes.protocol = found.protocol;
            }
            else {
                // It's a range or regex, which means that if the attribute is already set, we keep it
                attributes.onAutoForward = attributes.onAutoForward ?? found.onAutoForward;
                attributes.elevateIfNeeded =
                    attributes.elevateIfNeeded !== undefined
                        ? attributes.elevateIfNeeded
                        : found.elevateIfNeeded;
                attributes.label = attributes.label ?? found.label;
                attributes.requireLocalPort =
                    attributes.requireLocalPort !== undefined ? attributes.requireLocalPort : undefined;
                attributes.protocol = attributes.protocol ?? found.protocol;
            }
            index = this.findNextIndex(port, host, commandLine, this.portsAttributes, index + 1);
        }
        if (attributes.onAutoForward !== undefined ||
            attributes.elevateIfNeeded !== undefined ||
            attributes.label !== undefined ||
            attributes.requireLocalPort !== undefined ||
            attributes.protocol !== undefined) {
            return attributes;
        }
        // If we find no matches, then use the other port attributes.
        return this.getOtherAttributes();
    }
    hasStartEnd(value) {
        return value.start !== undefined && value.end !== undefined;
    }
    hasHostAndPort(value) {
        return (value.host !== undefined &&
            value.port !== undefined &&
            isString(value.host) &&
            isNumber(value.port));
    }
    findNextIndex(port, host, commandLine, attributes, fromIndex) {
        if (fromIndex >= attributes.length) {
            return -1;
        }
        const shouldUseHost = !isLocalhost(host) && !isAllInterfaces(host);
        const sliced = attributes.slice(fromIndex);
        const foundIndex = sliced.findIndex((value) => {
            if (isNumber(value.key)) {
                return shouldUseHost ? false : value.key === port;
            }
            else if (this.hasStartEnd(value.key)) {
                return shouldUseHost ? false : port >= value.key.start && port <= value.key.end;
            }
            else if (this.hasHostAndPort(value.key)) {
                return port === value.key.port && host === value.key.host;
            }
            else {
                return commandLine ? value.key.test(commandLine) : false;
            }
        });
        return foundIndex >= 0 ? foundIndex + fromIndex : -1;
    }
    readSetting() {
        const settingValue = this.configurationService.getValue(PortsAttributes.SETTING);
        if (!settingValue || !isObject(settingValue)) {
            return [];
        }
        const attributes = [];
        for (const attributesKey in settingValue) {
            if (attributesKey === undefined) {
                continue;
            }
            const setting = settingValue[attributesKey];
            let key = undefined;
            if (Number(attributesKey)) {
                key = Number(attributesKey);
            }
            else if (isString(attributesKey)) {
                if (PortsAttributes.RANGE.test(attributesKey)) {
                    const match = attributesKey.match(PortsAttributes.RANGE);
                    key = { start: Number(match[1]), end: Number(match[2]) };
                }
                else if (PortsAttributes.HOST_AND_PORT.test(attributesKey)) {
                    const match = attributesKey.match(PortsAttributes.HOST_AND_PORT);
                    key = { host: match[1], port: Number(match[2]) };
                }
                else {
                    let regTest = undefined;
                    try {
                        regTest = RegExp(attributesKey);
                    }
                    catch (e) {
                        // The user entered an invalid regular expression.
                    }
                    if (regTest) {
                        key = regTest;
                    }
                }
            }
            if (!key) {
                continue;
            }
            attributes.push({
                key: key,
                elevateIfNeeded: setting.elevateIfNeeded,
                onAutoForward: setting.onAutoForward,
                label: setting.label,
                requireLocalPort: setting.requireLocalPort,
                protocol: setting.protocol,
            });
        }
        const defaults = this.configurationService.getValue(PortsAttributes.DEFAULTS);
        if (defaults) {
            this.defaultPortAttributes = {
                elevateIfNeeded: defaults.elevateIfNeeded,
                label: defaults.label,
                onAutoForward: defaults.onAutoForward,
                requireLocalPort: defaults.requireLocalPort,
                protocol: defaults.protocol,
            };
        }
        return this.sortAttributes(attributes);
    }
    sortAttributes(attributes) {
        function getVal(item, thisRef) {
            if (isNumber(item.key)) {
                return item.key;
            }
            else if (thisRef.hasStartEnd(item.key)) {
                return item.key.start;
            }
            else if (thisRef.hasHostAndPort(item.key)) {
                return item.key.port;
            }
            else {
                return Number.MAX_VALUE;
            }
        }
        return attributes.sort((a, b) => {
            return getVal(a, this) - getVal(b, this);
        });
    }
    getOtherAttributes() {
        return this.defaultPortAttributes;
    }
    static providedActionToAction(providedAction) {
        switch (providedAction) {
            case ProvidedOnAutoForward.Notify:
                return OnPortForward.Notify;
            case ProvidedOnAutoForward.OpenBrowser:
                return OnPortForward.OpenBrowser;
            case ProvidedOnAutoForward.OpenBrowserOnce:
                return OnPortForward.OpenBrowserOnce;
            case ProvidedOnAutoForward.OpenPreview:
                return OnPortForward.OpenPreview;
            case ProvidedOnAutoForward.Silent:
                return OnPortForward.Silent;
            case ProvidedOnAutoForward.Ignore:
                return OnPortForward.Ignore;
            default:
                return undefined;
        }
    }
    async addAttributes(port, attributes, target) {
        const settingValue = this.configurationService.inspect(PortsAttributes.SETTING);
        const remoteValue = settingValue.userRemoteValue;
        let newRemoteValue;
        if (!remoteValue || !isObject(remoteValue)) {
            newRemoteValue = {};
        }
        else {
            newRemoteValue = deepClone(remoteValue);
        }
        if (!newRemoteValue[`${port}`]) {
            newRemoteValue[`${port}`] = {};
        }
        for (const attribute in attributes) {
            newRemoteValue[`${port}`][attribute] = attributes[attribute];
        }
        return this.configurationService.updateValue(PortsAttributes.SETTING, newRemoteValue, target);
    }
}
let TunnelModel = class TunnelModel extends Disposable {
    constructor(tunnelService, storageService, configurationService, environmentService, remoteAuthorityResolverService, workspaceContextService, logService, dialogService, extensionService, contextKeyService) {
        super();
        this.tunnelService = tunnelService;
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.environmentService = environmentService;
        this.remoteAuthorityResolverService = remoteAuthorityResolverService;
        this.workspaceContextService = workspaceContextService;
        this.logService = logService;
        this.dialogService = dialogService;
        this.extensionService = extensionService;
        this.contextKeyService = contextKeyService;
        this.inProgress = new Map();
        this._onForwardPort = new Emitter();
        this.onForwardPort = this._onForwardPort.event;
        this._onClosePort = new Emitter();
        this.onClosePort = this._onClosePort.event;
        this._onPortName = new Emitter();
        this.onPortName = this._onPortName.event;
        this._onCandidatesChanged = new Emitter();
        // onCandidateChanged returns the removed candidates
        this.onCandidatesChanged = this._onCandidatesChanged.event;
        this._onEnvironmentTunnelsSet = new Emitter();
        this.onEnvironmentTunnelsSet = this._onEnvironmentTunnelsSet.event;
        this._environmentTunnelsSet = false;
        this.restoreListener = undefined;
        this.restoreComplete = false;
        this.onRestoreComplete = new Emitter();
        this.unrestoredExtensionTunnels = new Map();
        this.sessionCachedProperties = new Map();
        this.portAttributesProviders = [];
        this.hasCheckedExtensionsOnTunnelOpened = false;
        this.mismatchCooldown = new Date();
        this.configPortsAttributes = new PortsAttributes(configurationService);
        this.tunnelRestoreValue = this.getTunnelRestoreValue();
        this._register(this.configPortsAttributes.onDidChangeAttributes(this.updateAttributes, this));
        this.forwarded = new Map();
        this.remoteTunnels = new Map();
        this.tunnelService.tunnels.then(async (tunnels) => {
            const attributes = await this.getAttributes(tunnels.map((tunnel) => {
                return { port: tunnel.tunnelRemotePort, host: tunnel.tunnelRemoteHost };
            }));
            for (const tunnel of tunnels) {
                if (tunnel.localAddress) {
                    const key = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                    const matchingCandidate = mapHasAddressLocalhostOrAllInterfaces(this._candidates ?? new Map(), tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                    this.forwarded.set(key, {
                        remotePort: tunnel.tunnelRemotePort,
                        remoteHost: tunnel.tunnelRemoteHost,
                        localAddress: tunnel.localAddress,
                        protocol: attributes?.get(tunnel.tunnelRemotePort)?.protocol ?? TunnelProtocol.Http,
                        localUri: await this.makeLocalUri(tunnel.localAddress, attributes?.get(tunnel.tunnelRemotePort)),
                        localPort: tunnel.tunnelLocalPort,
                        name: attributes?.get(tunnel.tunnelRemotePort)?.label,
                        runningProcess: matchingCandidate?.detail,
                        hasRunningProcess: !!matchingCandidate,
                        pid: matchingCandidate?.pid,
                        privacy: tunnel.privacy,
                        source: UserTunnelSource,
                    });
                    this.remoteTunnels.set(key, tunnel);
                }
            }
        });
        this.detected = new Map();
        this._register(this.tunnelService.onTunnelOpened(async (tunnel) => {
            const key = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
            if (!mapHasAddressLocalhostOrAllInterfaces(this.forwarded, tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort) &&
                !mapHasAddressLocalhostOrAllInterfaces(this.detected, tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort) &&
                !mapHasAddressLocalhostOrAllInterfaces(this.inProgress, tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort) &&
                tunnel.localAddress) {
                const matchingCandidate = mapHasAddressLocalhostOrAllInterfaces(this._candidates ?? new Map(), tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                const attributes = (await this.getAttributes([
                    { port: tunnel.tunnelRemotePort, host: tunnel.tunnelRemoteHost },
                ]))?.get(tunnel.tunnelRemotePort);
                this.forwarded.set(key, {
                    remoteHost: tunnel.tunnelRemoteHost,
                    remotePort: tunnel.tunnelRemotePort,
                    localAddress: tunnel.localAddress,
                    protocol: attributes?.protocol ?? TunnelProtocol.Http,
                    localUri: await this.makeLocalUri(tunnel.localAddress, attributes),
                    localPort: tunnel.tunnelLocalPort,
                    name: attributes?.label,
                    closeable: true,
                    runningProcess: matchingCandidate?.detail,
                    hasRunningProcess: !!matchingCandidate,
                    pid: matchingCandidate?.pid,
                    privacy: tunnel.privacy,
                    source: UserTunnelSource,
                });
            }
            await this.storeForwarded();
            this.checkExtensionActivationEvents(true);
            this.remoteTunnels.set(key, tunnel);
            this._onForwardPort.fire(this.forwarded.get(key));
        }));
        this._register(this.tunnelService.onTunnelClosed((address) => {
            return this.onTunnelClosed(address, TunnelCloseReason.Other);
        }));
        this.checkExtensionActivationEvents(false);
    }
    extensionHasActivationEvent() {
        if (this.extensionService.extensions.find((extension) => extension.activationEvents?.includes(ACTIVATION_EVENT))) {
            this.contextKeyService.createKey(forwardedPortsViewEnabled.key, true);
            return true;
        }
        return false;
    }
    checkExtensionActivationEvents(tunnelOpened) {
        if (this.hasCheckedExtensionsOnTunnelOpened) {
            return;
        }
        if (tunnelOpened) {
            this.hasCheckedExtensionsOnTunnelOpened = true;
        }
        const hasRemote = this.environmentService.remoteAuthority !== undefined;
        if (hasRemote && !tunnelOpened) {
            // We don't activate extensions on startup if there is a remote
            return;
        }
        if (this.extensionHasActivationEvent()) {
            return;
        }
        const activationDisposable = this._register(this.extensionService.onDidRegisterExtensions(() => {
            if (this.extensionHasActivationEvent()) {
                activationDisposable.dispose();
            }
        }));
    }
    async onTunnelClosed(address, reason) {
        const key = makeAddress(address.host, address.port);
        if (this.forwarded.has(key)) {
            this.forwarded.delete(key);
            await this.storeForwarded();
            this._onClosePort.fire(address);
        }
    }
    makeLocalUri(localAddress, attributes) {
        if (localAddress.startsWith('http')) {
            return URI.parse(localAddress);
        }
        const protocol = attributes?.protocol ?? 'http';
        return URI.parse(`${protocol}://${localAddress}`);
    }
    async addStorageKeyPostfix(prefix) {
        const workspace = this.workspaceContextService.getWorkspace();
        const workspaceHash = workspace.configuration
            ? hash(workspace.configuration.path)
            : workspace.folders.length > 0
                ? hash(workspace.folders[0].uri.path)
                : undefined;
        if (workspaceHash === undefined) {
            this.logService.debug('Could not get workspace hash for forwarded ports storage key.');
            return undefined;
        }
        return `${prefix}.${this.environmentService.remoteAuthority}.${workspaceHash}`;
    }
    async getTunnelRestoreStorageKey() {
        return this.addStorageKeyPostfix(TUNNELS_TO_RESTORE);
    }
    async getRestoreExpirationStorageKey() {
        return this.addStorageKeyPostfix(TUNNELS_TO_RESTORE_EXPIRATION);
    }
    async getTunnelRestoreValue() {
        const deprecatedValue = this.storageService.get(TUNNELS_TO_RESTORE, 1 /* StorageScope.WORKSPACE */);
        if (deprecatedValue) {
            this.storageService.remove(TUNNELS_TO_RESTORE, 1 /* StorageScope.WORKSPACE */);
            await this.storeForwarded();
            return deprecatedValue;
        }
        const storageKey = await this.getTunnelRestoreStorageKey();
        if (!storageKey) {
            return undefined;
        }
        return this.storageService.get(storageKey, 0 /* StorageScope.PROFILE */);
    }
    async restoreForwarded() {
        this.cleanupExpiredTunnelsForRestore();
        if (this.configurationService.getValue('remote.restoreForwardedPorts')) {
            const tunnelRestoreValue = await this.tunnelRestoreValue;
            if (tunnelRestoreValue && tunnelRestoreValue !== this.knownPortsRestoreValue) {
                const tunnels = JSON.parse(tunnelRestoreValue) ?? [];
                this.logService.trace(`ForwardedPorts: (TunnelModel) restoring ports ${tunnels.map((tunnel) => tunnel.remotePort).join(', ')}`);
                for (const tunnel of tunnels) {
                    const alreadyForwarded = mapHasAddressLocalhostOrAllInterfaces(this.detected, tunnel.remoteHost, tunnel.remotePort);
                    // Extension forwarded ports should only be updated, not restored.
                    if ((tunnel.source.source !== TunnelSource.Extension && !alreadyForwarded) ||
                        (tunnel.source.source === TunnelSource.Extension && alreadyForwarded)) {
                        await this.doForward({
                            remote: { host: tunnel.remoteHost, port: tunnel.remotePort },
                            local: tunnel.localPort,
                            name: tunnel.name,
                            elevateIfNeeded: true,
                            source: tunnel.source,
                        });
                    }
                    else if (tunnel.source.source === TunnelSource.Extension && !alreadyForwarded) {
                        this.unrestoredExtensionTunnels.set(makeAddress(tunnel.remoteHost, tunnel.remotePort), tunnel);
                    }
                }
            }
        }
        this.restoreComplete = true;
        this.onRestoreComplete.fire();
        if (!this.restoreListener) {
            // It's possible that at restore time the value hasn't synced.
            const key = await this.getTunnelRestoreStorageKey();
            this.restoreListener = this._register(new DisposableStore());
            this.restoreListener.add(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, this.restoreListener)(async (e) => {
                if (e.key === key) {
                    this.tunnelRestoreValue = Promise.resolve(this.storageService.get(key, 0 /* StorageScope.PROFILE */));
                    await this.restoreForwarded();
                }
            }));
        }
    }
    cleanupExpiredTunnelsForRestore() {
        const keys = this.storageService
            .keys(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */)
            .filter((key) => key.startsWith(TUNNELS_TO_RESTORE_EXPIRATION));
        for (const key of keys) {
            const expiration = this.storageService.getNumber(key, 0 /* StorageScope.PROFILE */);
            if (expiration && expiration < Date.now()) {
                this.tunnelRestoreValue = Promise.resolve(undefined);
                const storageKey = key.replace(TUNNELS_TO_RESTORE_EXPIRATION, TUNNELS_TO_RESTORE);
                this.storageService.remove(key, 0 /* StorageScope.PROFILE */);
                this.storageService.remove(storageKey, 0 /* StorageScope.PROFILE */);
            }
        }
    }
    async storeForwarded() {
        if (this.configurationService.getValue('remote.restoreForwardedPorts')) {
            const forwarded = Array.from(this.forwarded.values());
            const restorableTunnels = forwarded.map((tunnel) => {
                return {
                    remoteHost: tunnel.remoteHost,
                    remotePort: tunnel.remotePort,
                    localPort: tunnel.localPort,
                    name: tunnel.name,
                    localAddress: tunnel.localAddress,
                    localUri: tunnel.localUri,
                    protocol: tunnel.protocol,
                    source: tunnel.source,
                };
            });
            let valueToStore;
            if (forwarded.length > 0) {
                valueToStore = JSON.stringify(restorableTunnels);
            }
            const key = await this.getTunnelRestoreStorageKey();
            const expirationKey = await this.getRestoreExpirationStorageKey();
            if (!valueToStore && key && expirationKey) {
                this.storageService.remove(key, 0 /* StorageScope.PROFILE */);
                this.storageService.remove(expirationKey, 0 /* StorageScope.PROFILE */);
            }
            else if (valueToStore !== this.knownPortsRestoreValue && key && expirationKey) {
                this.storageService.store(key, valueToStore, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
                this.storageService.store(expirationKey, Date.now() + RESTORE_EXPIRATION_TIME, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            }
            this.knownPortsRestoreValue = valueToStore;
        }
    }
    async showPortMismatchModalIfNeeded(tunnel, expectedLocal, attributes) {
        if (!tunnel.tunnelLocalPort || !attributes?.requireLocalPort) {
            return;
        }
        if (tunnel.tunnelLocalPort === expectedLocal) {
            return;
        }
        const newCooldown = new Date();
        if (this.mismatchCooldown.getTime() + MISMATCH_LOCAL_PORT_COOLDOWN > newCooldown.getTime()) {
            return;
        }
        this.mismatchCooldown = newCooldown;
        const mismatchString = nls.localize('remote.localPortMismatch.single', 'Local port {0} could not be used for forwarding to remote port {1}.\n\nThis usually happens when there is already another process using local port {0}.\n\nPort number {2} has been used instead.', expectedLocal, tunnel.tunnelRemotePort, tunnel.tunnelLocalPort);
        return this.dialogService.info(mismatchString);
    }
    async forward(tunnelProperties, attributes) {
        if (!this.restoreComplete && this.environmentService.remoteAuthority) {
            await Event.toPromise(this.onRestoreComplete.event);
        }
        return this.doForward(tunnelProperties, attributes);
    }
    async doForward(tunnelProperties, attributes) {
        await this.extensionService.activateByEvent(ACTIVATION_EVENT);
        const existingTunnel = mapHasAddressLocalhostOrAllInterfaces(this.forwarded, tunnelProperties.remote.host, tunnelProperties.remote.port);
        attributes =
            attributes ??
                (attributes !== null
                    ? (await this.getAttributes([tunnelProperties.remote]))?.get(tunnelProperties.remote.port)
                    : undefined);
        const localPort = tunnelProperties.local !== undefined ? tunnelProperties.local : tunnelProperties.remote.port;
        let noTunnelValue;
        if (!existingTunnel) {
            const authority = this.environmentService.remoteAuthority;
            const addressProvider = authority
                ? {
                    getAddress: async () => {
                        return (await this.remoteAuthorityResolverService.resolveAuthority(authority))
                            .authority;
                    },
                }
                : undefined;
            const key = makeAddress(tunnelProperties.remote.host, tunnelProperties.remote.port);
            this.inProgress.set(key, true);
            tunnelProperties = this.mergeCachedAndUnrestoredProperties(key, tunnelProperties);
            const tunnel = await this.tunnelService.openTunnel(addressProvider, tunnelProperties.remote.host, tunnelProperties.remote.port, undefined, localPort, !tunnelProperties.elevateIfNeeded
                ? attributes?.elevateIfNeeded
                : tunnelProperties.elevateIfNeeded, tunnelProperties.privacy, attributes?.protocol);
            if (typeof tunnel === 'string') {
                // There was an error  while creating the tunnel.
                noTunnelValue = tunnel;
            }
            else if (tunnel && tunnel.localAddress) {
                const matchingCandidate = mapHasAddressLocalhostOrAllInterfaces(this._candidates ?? new Map(), tunnelProperties.remote.host, tunnelProperties.remote.port);
                const protocol = tunnel.protocol
                    ? tunnel.protocol === TunnelProtocol.Https
                        ? TunnelProtocol.Https
                        : TunnelProtocol.Http
                    : (attributes?.protocol ?? TunnelProtocol.Http);
                const newForward = {
                    remoteHost: tunnel.tunnelRemoteHost,
                    remotePort: tunnel.tunnelRemotePort,
                    localPort: tunnel.tunnelLocalPort,
                    name: attributes?.label ?? tunnelProperties.name,
                    closeable: true,
                    localAddress: tunnel.localAddress,
                    protocol,
                    localUri: await this.makeLocalUri(tunnel.localAddress, attributes),
                    runningProcess: matchingCandidate?.detail,
                    hasRunningProcess: !!matchingCandidate,
                    pid: matchingCandidate?.pid,
                    source: tunnelProperties.source ?? UserTunnelSource,
                    privacy: tunnel.privacy,
                };
                this.forwarded.set(key, newForward);
                this.remoteTunnels.set(key, tunnel);
                this.inProgress.delete(key);
                await this.storeForwarded();
                await this.showPortMismatchModalIfNeeded(tunnel, localPort, attributes);
                this._onForwardPort.fire(newForward);
                return tunnel;
            }
            this.inProgress.delete(key);
        }
        else {
            return this.mergeAttributesIntoExistingTunnel(existingTunnel, tunnelProperties, attributes);
        }
        return noTunnelValue;
    }
    mergeCachedAndUnrestoredProperties(key, tunnelProperties) {
        const map = this.unrestoredExtensionTunnels.has(key)
            ? this.unrestoredExtensionTunnels
            : this.sessionCachedProperties.has(key)
                ? this.sessionCachedProperties
                : undefined;
        if (map) {
            const updateProps = map.get(key);
            map.delete(key);
            if (updateProps) {
                tunnelProperties.name = updateProps.name ?? tunnelProperties.name;
                tunnelProperties.local =
                    ('local' in updateProps
                        ? updateProps.local
                        : 'localPort' in updateProps
                            ? updateProps.localPort
                            : undefined) ?? tunnelProperties.local;
                tunnelProperties.privacy = tunnelProperties.privacy;
            }
        }
        return tunnelProperties;
    }
    async mergeAttributesIntoExistingTunnel(existingTunnel, tunnelProperties, attributes) {
        const newName = attributes?.label ?? tunnelProperties.name;
        let MergedAttributeAction;
        (function (MergedAttributeAction) {
            MergedAttributeAction[MergedAttributeAction["None"] = 0] = "None";
            MergedAttributeAction[MergedAttributeAction["Fire"] = 1] = "Fire";
            MergedAttributeAction[MergedAttributeAction["Reopen"] = 2] = "Reopen";
        })(MergedAttributeAction || (MergedAttributeAction = {}));
        let mergedAction = MergedAttributeAction.None;
        if (newName !== existingTunnel.name) {
            existingTunnel.name = newName;
            mergedAction = MergedAttributeAction.Fire;
        }
        // Source of existing tunnel wins so that original source is maintained
        if ((attributes?.protocol || existingTunnel.protocol !== TunnelProtocol.Http) &&
            attributes?.protocol !== existingTunnel.protocol) {
            tunnelProperties.source = existingTunnel.source;
            mergedAction = MergedAttributeAction.Reopen;
        }
        // New privacy value wins
        if (tunnelProperties.privacy && existingTunnel.privacy !== tunnelProperties.privacy) {
            mergedAction = MergedAttributeAction.Reopen;
        }
        switch (mergedAction) {
            case MergedAttributeAction.Fire: {
                this._onForwardPort.fire();
                break;
            }
            case MergedAttributeAction.Reopen: {
                await this.close(existingTunnel.remoteHost, existingTunnel.remotePort, TunnelCloseReason.User);
                await this.doForward(tunnelProperties, attributes);
            }
        }
        return mapHasAddressLocalhostOrAllInterfaces(this.remoteTunnels, tunnelProperties.remote.host, tunnelProperties.remote.port);
    }
    async name(host, port, name) {
        const existingForwarded = mapHasAddressLocalhostOrAllInterfaces(this.forwarded, host, port);
        const key = makeAddress(host, port);
        if (existingForwarded) {
            existingForwarded.name = name;
            await this.storeForwarded();
            this._onPortName.fire({ host, port });
            return;
        }
        else if (this.detected.has(key)) {
            this.detected.get(key).name = name;
            this._onPortName.fire({ host, port });
        }
    }
    async close(host, port, reason) {
        const key = makeAddress(host, port);
        const oldTunnel = this.forwarded.get(key);
        if (reason === TunnelCloseReason.AutoForwardEnd &&
            oldTunnel &&
            oldTunnel.source.source === TunnelSource.Auto) {
            this.sessionCachedProperties.set(key, {
                local: oldTunnel.localPort,
                name: oldTunnel.name,
                privacy: oldTunnel.privacy,
            });
        }
        await this.tunnelService.closeTunnel(host, port);
        return this.onTunnelClosed({ host, port }, reason);
    }
    address(host, port) {
        const key = makeAddress(host, port);
        return (this.forwarded.get(key) || this.detected.get(key))?.localAddress;
    }
    get environmentTunnelsSet() {
        return this._environmentTunnelsSet;
    }
    addEnvironmentTunnels(tunnels) {
        if (tunnels) {
            for (const tunnel of tunnels) {
                const matchingCandidate = mapHasAddressLocalhostOrAllInterfaces(this._candidates ?? new Map(), tunnel.remoteAddress.host, tunnel.remoteAddress.port);
                const localAddress = typeof tunnel.localAddress === 'string'
                    ? tunnel.localAddress
                    : makeAddress(tunnel.localAddress.host, tunnel.localAddress.port);
                this.detected.set(makeAddress(tunnel.remoteAddress.host, tunnel.remoteAddress.port), {
                    remoteHost: tunnel.remoteAddress.host,
                    remotePort: tunnel.remoteAddress.port,
                    localAddress: localAddress,
                    protocol: TunnelProtocol.Http,
                    localUri: this.makeLocalUri(localAddress),
                    closeable: false,
                    runningProcess: matchingCandidate?.detail,
                    hasRunningProcess: !!matchingCandidate,
                    pid: matchingCandidate?.pid,
                    privacy: TunnelPrivacyId.ConstantPrivate,
                    source: {
                        source: TunnelSource.Extension,
                        description: nls.localize('tunnel.staticallyForwarded', 'Statically Forwarded'),
                    },
                });
                this.tunnelService.setEnvironmentTunnel(tunnel.remoteAddress.host, tunnel.remoteAddress.port, localAddress, TunnelPrivacyId.ConstantPrivate, TunnelProtocol.Http);
            }
        }
        this._environmentTunnelsSet = true;
        this._onEnvironmentTunnelsSet.fire();
        this._onForwardPort.fire();
    }
    setCandidateFilter(filter) {
        this._candidateFilter = filter;
    }
    async setCandidates(candidates) {
        let processedCandidates = candidates;
        if (this._candidateFilter) {
            // When an extension provides a filter, we do the filtering on the extension host before the candidates are set here.
            // However, when the filter doesn't come from an extension we filter here.
            processedCandidates = await this._candidateFilter(candidates);
        }
        const removedCandidates = this.updateInResponseToCandidates(processedCandidates);
        this.logService.trace(`ForwardedPorts: (TunnelModel) removed candidates ${Array.from(removedCandidates.values())
            .map((candidate) => candidate.port)
            .join(', ')}`);
        this._onCandidatesChanged.fire(removedCandidates);
    }
    // Returns removed candidates
    updateInResponseToCandidates(candidates) {
        const removedCandidates = this._candidates ?? new Map();
        const candidatesMap = new Map();
        this._candidates = candidatesMap;
        candidates.forEach((value) => {
            const addressKey = makeAddress(value.host, value.port);
            candidatesMap.set(addressKey, {
                host: value.host,
                port: value.port,
                detail: value.detail,
                pid: value.pid,
            });
            if (removedCandidates.has(addressKey)) {
                removedCandidates.delete(addressKey);
            }
            const forwardedValue = mapHasAddressLocalhostOrAllInterfaces(this.forwarded, value.host, value.port);
            if (forwardedValue) {
                forwardedValue.runningProcess = value.detail;
                forwardedValue.hasRunningProcess = true;
                forwardedValue.pid = value.pid;
            }
        });
        removedCandidates.forEach((_value, key) => {
            const parsedAddress = parseAddress(key);
            if (!parsedAddress) {
                return;
            }
            const forwardedValue = mapHasAddressLocalhostOrAllInterfaces(this.forwarded, parsedAddress.host, parsedAddress.port);
            if (forwardedValue) {
                forwardedValue.runningProcess = undefined;
                forwardedValue.hasRunningProcess = false;
                forwardedValue.pid = undefined;
            }
            const detectedValue = mapHasAddressLocalhostOrAllInterfaces(this.detected, parsedAddress.host, parsedAddress.port);
            if (detectedValue) {
                detectedValue.runningProcess = undefined;
                detectedValue.hasRunningProcess = false;
                detectedValue.pid = undefined;
            }
        });
        return removedCandidates;
    }
    get candidates() {
        return this._candidates ? Array.from(this._candidates.values()) : [];
    }
    get candidatesOrUndefined() {
        return this._candidates ? this.candidates : undefined;
    }
    async updateAttributes() {
        // If the label changes in the attributes, we should update it.
        const tunnels = Array.from(this.forwarded.values());
        const allAttributes = await this.getAttributes(tunnels.map((tunnel) => {
            return { port: tunnel.remotePort, host: tunnel.remoteHost };
        }), false);
        if (!allAttributes) {
            return;
        }
        for (const forwarded of tunnels) {
            const attributes = allAttributes.get(forwarded.remotePort);
            if ((attributes?.protocol || forwarded.protocol !== TunnelProtocol.Http) &&
                attributes?.protocol !== forwarded.protocol) {
                await this.doForward({
                    remote: { host: forwarded.remoteHost, port: forwarded.remotePort },
                    local: forwarded.localPort,
                    name: forwarded.name,
                    source: forwarded.source,
                }, attributes);
            }
            if (!attributes) {
                continue;
            }
            if (attributes.label && attributes.label !== forwarded.name) {
                await this.name(forwarded.remoteHost, forwarded.remotePort, attributes.label);
            }
        }
    }
    async getAttributes(forwardedPorts, checkProviders = true) {
        const matchingCandidates = new Map();
        const pidToPortsMapping = new Map();
        forwardedPorts.forEach((forwardedPort) => {
            const matchingCandidate = mapHasAddressLocalhostOrAllInterfaces(this._candidates ?? new Map(), LOCALHOST_ADDRESSES[0], forwardedPort.port) ?? forwardedPort;
            if (matchingCandidate) {
                matchingCandidates.set(forwardedPort.port, matchingCandidate);
                const pid = isCandidatePort(matchingCandidate) ? matchingCandidate.pid : undefined;
                if (!pidToPortsMapping.has(pid)) {
                    pidToPortsMapping.set(pid, []);
                }
                pidToPortsMapping.get(pid)?.push(forwardedPort.port);
            }
        });
        const configAttributes = new Map();
        forwardedPorts.forEach((forwardedPort) => {
            const attributes = this.configPortsAttributes.getAttributes(forwardedPort.port, forwardedPort.host, matchingCandidates.get(forwardedPort.port)?.detail);
            if (attributes) {
                configAttributes.set(forwardedPort.port, attributes);
            }
        });
        if (this.portAttributesProviders.length === 0 || !checkProviders) {
            return configAttributes.size > 0 ? configAttributes : undefined;
        }
        // Group calls to provide attributes by pid.
        const allProviderResults = await Promise.all(this.portAttributesProviders.flatMap((provider) => {
            return Array.from(pidToPortsMapping.entries()).map((entry) => {
                const portGroup = entry[1];
                const matchingCandidate = matchingCandidates.get(portGroup[0]);
                return provider.providePortAttributes(portGroup, matchingCandidate?.pid, matchingCandidate?.detail, CancellationToken.None);
            });
        }));
        const providedAttributes = new Map();
        allProviderResults.forEach((attributes) => attributes.forEach((attribute) => {
            if (attribute) {
                providedAttributes.set(attribute.port, attribute);
            }
        }));
        if (!configAttributes && !providedAttributes) {
            return undefined;
        }
        // Merge. The config wins.
        const mergedAttributes = new Map();
        forwardedPorts.forEach((forwardedPorts) => {
            const config = configAttributes.get(forwardedPorts.port);
            const provider = providedAttributes.get(forwardedPorts.port);
            mergedAttributes.set(forwardedPorts.port, {
                elevateIfNeeded: config?.elevateIfNeeded,
                label: config?.label,
                onAutoForward: config?.onAutoForward ??
                    PortsAttributes.providedActionToAction(provider?.autoForwardAction),
                requireLocalPort: config?.requireLocalPort,
                protocol: config?.protocol,
            });
        });
        return mergedAttributes;
    }
    addAttributesProvider(provider) {
        this.portAttributesProviders.push(provider);
    }
};
__decorate([
    debounce(1000)
], TunnelModel.prototype, "storeForwarded", null);
TunnelModel = __decorate([
    __param(0, ITunnelService),
    __param(1, IStorageService),
    __param(2, IConfigurationService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IRemoteAuthorityResolverService),
    __param(5, IWorkspaceContextService),
    __param(6, ILogService),
    __param(7, IDialogService),
    __param(8, IExtensionService),
    __param(9, IContextKeyService)
], TunnelModel);
export { TunnelModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcmVtb3RlL2NvbW1vbi90dW5uZWxNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVwRSxPQUFPLEVBQ04sK0JBQStCLEdBRS9CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFFTixjQUFjLEVBQ2QsY0FBYyxFQUNkLGVBQWUsRUFDZixtQkFBbUIsRUFHbkIsV0FBVyxFQUNYLGVBQWUsRUFDZixxQkFBcUIsRUFDckIsd0JBQXdCLEdBQ3hCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1B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
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
var ExtensionHostManager_1;
import { IntervalTimer } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import * as errors from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { RemoteAuthorityResolverErrorCode, getRemoteAuthorityPrefix, } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { ExtHostCustomersRegistry } from './extHostCustomers.js';
import { extensionHostKindToString } from './extensionHostKind.js';
import { RPCProtocol, } from './rpcProtocol.js';
// Enable to see detailed message communication between window and extension host
const LOG_EXTENSION_HOST_COMMUNICATION = false;
const LOG_USE_COLORS = true;
let ExtensionHostManager = ExtensionHostManager_1 = class ExtensionHostManager extends Disposable {
    get pid() {
        return this._extensionHost.pid;
    }
    get kind() {
        return this._extensionHost.runningLocation.kind;
    }
    get startup() {
        return this._extensionHost.startup;
    }
    get friendyName() {
        return friendlyExtHostName(this.kind, this.pid);
    }
    constructor(extensionHost, initialActivationEvents, _internalExtensionService, _instantiationService, _environmentService, _telemetryService, _logService) {
        super();
        this._internalExtensionService = _internalExtensionService;
        this._instantiationService = _instantiationService;
        this._environmentService = _environmentService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._onDidChangeResponsiveState = this._register(new Emitter());
        this.onDidChangeResponsiveState = this._onDidChangeResponsiveState.event;
        this._hasStarted = false;
        this._cachedActivationEvents = new Map();
        this._resolvedActivationEvents = new Set();
        this._rpcProtocol = null;
        this._customers = [];
        this._extensionHost = extensionHost;
        this.onDidExit = this._extensionHost.onExit;
        const startingTelemetryEvent = {
            time: Date.now(),
            action: 'starting',
            kind: extensionHostKindToString(this.kind),
        };
        this._telemetryService.publicLog2('extensionHostStartup', startingTelemetryEvent);
        this._proxy = this._extensionHost.start().then((protocol) => {
            this._hasStarted = true;
            // Track healthy extension host startup
            const successTelemetryEvent = {
                time: Date.now(),
                action: 'success',
                kind: extensionHostKindToString(this.kind),
            };
            this._telemetryService.publicLog2('extensionHostStartup', successTelemetryEvent);
            return this._createExtensionHostCustomers(this.kind, protocol);
        }, (err) => {
            this._logService.error(`Error received from starting extension host (kind: ${extensionHostKindToString(this.kind)})`);
            this._logService.error(err);
            // Track errors during extension host startup
            const failureTelemetryEvent = {
                time: Date.now(),
                action: 'error',
                kind: extensionHostKindToString(this.kind),
            };
            if (err && err.name) {
                failureTelemetryEvent.errorName = err.name;
            }
            if (err && err.message) {
                failureTelemetryEvent.errorMessage = err.message;
            }
            if (err && err.stack) {
                failureTelemetryEvent.errorStack = err.stack;
            }
            this._telemetryService.publicLog2('extensionHostStartup', failureTelemetryEvent);
            return null;
        });
        this._proxy.then(() => {
            initialActivationEvents.forEach((activationEvent) => this.activateByEvent(activationEvent, 0 /* ActivationKind.Normal */));
            this._register(registerLatencyTestProvider({
                measure: () => this.measure(),
            }));
        });
    }
    async disconnect() {
        await this._extensionHost?.disconnect?.();
    }
    dispose() {
        this._extensionHost?.dispose();
        this._rpcProtocol?.dispose();
        for (let i = 0, len = this._customers.length; i < len; i++) {
            const customer = this._customers[i];
            try {
                customer.dispose();
            }
            catch (err) {
                errors.onUnexpectedError(err);
            }
        }
        this._proxy = null;
        super.dispose();
    }
    async measure() {
        const proxy = await this._proxy;
        if (!proxy) {
            return null;
        }
        const latency = await this._measureLatency(proxy);
        const down = await this._measureDown(proxy);
        const up = await this._measureUp(proxy);
        return {
            remoteAuthority: this._extensionHost.remoteAuthority,
            latency,
            down,
            up,
        };
    }
    async ready() {
        await this._proxy;
    }
    async _measureLatency(proxy) {
        const COUNT = 10;
        let sum = 0;
        for (let i = 0; i < COUNT; i++) {
            const sw = StopWatch.create();
            await proxy.test_latency(i);
            sw.stop();
            sum += sw.elapsed();
        }
        return sum / COUNT;
    }
    static _convert(byteCount, elapsedMillis) {
        return (byteCount * 1000 * 8) / elapsedMillis;
    }
    async _measureUp(proxy) {
        const SIZE = 10 * 1024 * 1024; // 10MB
        const buff = VSBuffer.alloc(SIZE);
        const value = Math.ceil(Math.random() * 256);
        for (let i = 0; i < buff.byteLength; i++) {
            buff.writeUInt8(i, value);
        }
        const sw = StopWatch.create();
        await proxy.test_up(buff);
        sw.stop();
        return ExtensionHostManager_1._convert(SIZE, sw.elapsed());
    }
    async _measureDown(proxy) {
        const SIZE = 10 * 1024 * 1024; // 10MB
        const sw = StopWatch.create();
        await proxy.test_down(SIZE);
        sw.stop();
        return ExtensionHostManager_1._convert(SIZE, sw.elapsed());
    }
    _createExtensionHostCustomers(kind, protocol) {
        let logger = null;
        if (LOG_EXTENSION_HOST_COMMUNICATION ||
            this._environmentService.logExtensionHostCommunication) {
            logger = new RPCLogger(kind);
        }
        else if (TelemetryRPCLogger.isEnabled()) {
            logger = new TelemetryRPCLogger(this._telemetryService);
        }
        this._rpcProtocol = new RPCProtocol(protocol, logger);
        this._register(this._rpcProtocol.onDidChangeResponsiveState((responsiveState) => this._onDidChangeResponsiveState.fire(responsiveState)));
        let extensionHostProxy = null;
        let mainProxyIdentifiers = [];
        const extHostContext = {
            remoteAuthority: this._extensionHost.remoteAuthority,
            extensionHostKind: this.kind,
            getProxy: (identifier) => this._rpcProtocol.getProxy(identifier),
            set: (identifier, instance) => this._rpcProtocol.set(identifier, instance),
            dispose: () => this._rpcProtocol.dispose(),
            assertRegistered: (identifiers) => this._rpcProtocol.assertRegistered(identifiers),
            drain: () => this._rpcProtocol.drain(),
            //#region internal
            internalExtensionService: this._internalExtensionService,
            _setExtensionHostProxy: (value) => {
                extensionHostProxy = value;
            },
            _setAllMainProxyIdentifiers: (value) => {
                mainProxyIdentifiers = value;
            },
            //#endregion
        };
        // Named customers
        const namedCustomers = ExtHostCustomersRegistry.getNamedCustomers();
        for (let i = 0, len = namedCustomers.length; i < len; i++) {
            const [id, ctor] = namedCustomers[i];
            try {
                const instance = this._instantiationService.createInstance(ctor, extHostContext);
                this._customers.push(instance);
                this._rpcProtocol.set(id, instance);
            }
            catch (err) {
                this._logService.error(`Cannot instantiate named customer: '${id.sid}'`);
                this._logService.error(err);
                errors.onUnexpectedError(err);
            }
        }
        // Customers
        const customers = ExtHostCustomersRegistry.getCustomers();
        for (const ctor of customers) {
            try {
                const instance = this._instantiationService.createInstance(ctor, extHostContext);
                this._customers.push(instance);
            }
            catch (err) {
                this._logService.error(err);
                errors.onUnexpectedError(err);
            }
        }
        if (!extensionHostProxy) {
            throw new Error(`Missing IExtensionHostProxy!`);
        }
        // Check that no named customers are missing
        this._rpcProtocol.assertRegistered(mainProxyIdentifiers);
        return extensionHostProxy;
    }
    async activate(extension, reason) {
        const proxy = await this._proxy;
        if (!proxy) {
            return false;
        }
        return proxy.activate(extension, reason);
    }
    activateByEvent(activationEvent, activationKind) {
        if (activationKind === 1 /* ActivationKind.Immediate */ && !this._hasStarted) {
            return Promise.resolve();
        }
        if (!this._cachedActivationEvents.has(activationEvent)) {
            this._cachedActivationEvents.set(activationEvent, this._activateByEvent(activationEvent, activationKind));
        }
        return this._cachedActivationEvents.get(activationEvent);
    }
    activationEventIsDone(activationEvent) {
        return this._resolvedActivationEvents.has(activationEvent);
    }
    async _activateByEvent(activationEvent, activationKind) {
        if (!this._proxy) {
            return;
        }
        const proxy = await this._proxy;
        if (!proxy) {
            // this case is already covered above and logged.
            // i.e. the extension host could not be started
            return;
        }
        if (!this._extensionHost.extensions.containsActivationEvent(activationEvent)) {
            this._resolvedActivationEvents.add(activationEvent);
            return;
        }
        await proxy.activateByEvent(activationEvent, activationKind);
        this._resolvedActivationEvents.add(activationEvent);
    }
    async getInspectPort(tryEnableInspector) {
        if (this._extensionHost) {
            if (tryEnableInspector) {
                await this._extensionHost.enableInspectPort();
            }
            const port = this._extensionHost.getInspectPort();
            if (port) {
                return port;
            }
        }
        return undefined;
    }
    async resolveAuthority(remoteAuthority, resolveAttempt) {
        const sw = StopWatch.create(false);
        const prefix = () => `[${extensionHostKindToString(this._extensionHost.runningLocation.kind)}${this._extensionHost.runningLocation.affinity}][resolveAuthority(${getRemoteAuthorityPrefix(remoteAuthority)},${resolveAttempt})][${sw.elapsed()}ms] `;
        const logInfo = (msg) => this._logService.info(`${prefix()}${msg}`);
        const logError = (msg, err = undefined) => this._logService.error(`${prefix()}${msg}`, err);
        logInfo(`obtaining proxy...`);
        const proxy = await this._proxy;
        if (!proxy) {
            logError(`no proxy`);
            return {
                type: 'error',
                error: {
                    message: `Cannot resolve authority`,
                    code: RemoteAuthorityResolverErrorCode.Unknown,
                    detail: undefined,
                },
            };
        }
        logInfo(`invoking...`);
        const intervalLogger = new IntervalTimer();
        try {
            intervalLogger.cancelAndSet(() => logInfo('waiting...'), 1000);
            const resolverResult = await proxy.resolveAuthority(remoteAuthority, resolveAttempt);
            intervalLogger.dispose();
            if (resolverResult.type === 'ok') {
                logInfo(`returned ${resolverResult.value.authority.connectTo}`);
            }
            else {
                logError(`returned an error`, resolverResult.error);
            }
            return resolverResult;
        }
        catch (err) {
            intervalLogger.dispose();
            logError(`returned an error`, err);
            return {
                type: 'error',
                error: {
                    message: err.message,
                    code: RemoteAuthorityResolverErrorCode.Unknown,
                    detail: err,
                },
            };
        }
    }
    async getCanonicalURI(remoteAuthority, uri) {
        const proxy = await this._proxy;
        if (!proxy) {
            throw new Error(`Cannot resolve canonical URI`);
        }
        return proxy.getCanonicalURI(remoteAuthority, uri);
    }
    async start(extensionRegistryVersionId, allExtensions, myExtensions) {
        const proxy = await this._proxy;
        if (!proxy) {
            return;
        }
        const deltaExtensions = this._extensionHost.extensions.set(extensionRegistryVersionId, allExtensions, myExtensions);
        return proxy.startExtensionHost(deltaExtensions);
    }
    async extensionTestsExecute() {
        const proxy = await this._proxy;
        if (!proxy) {
            throw new Error('Could not obtain Extension Host Proxy');
        }
        return proxy.extensionTestsExecute();
    }
    representsRunningLocation(runningLocation) {
        return this._extensionHost.runningLocation.equals(runningLocation);
    }
    async deltaExtensions(incomingExtensionsDelta) {
        const proxy = await this._proxy;
        if (!proxy) {
            return;
        }
        const outgoingExtensionsDelta = this._extensionHost.extensions.delta(incomingExtensionsDelta);
        if (!outgoingExtensionsDelta) {
            // The extension host already has this version of the extensions.
            return;
        }
        return proxy.deltaExtensions(outgoingExtensionsDelta);
    }
    containsExtension(extensionId) {
        return this._extensionHost.extensions?.containsExtension(extensionId) ?? false;
    }
    async setRemoteEnvironment(env) {
        const proxy = await this._proxy;
        if (!proxy) {
            return;
        }
        return proxy.setRemoteEnvironment(env);
    }
};
ExtensionHostManager = ExtensionHostManager_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, ITelemetryService),
    __param(6, ILogService)
], ExtensionHostManager);
export { ExtensionHostManager };
export function friendlyExtHostName(kind, pid) {
    if (pid) {
        return `${extensionHostKindToString(kind)} pid: ${pid}`;
    }
    return `${extensionHostKindToString(kind)}`;
}
const colorTables = [
    ['#2977B1', '#FC802D', '#34A13A', '#D3282F', '#9366BA'],
    ['#8B564C', '#E177C0', '#7F7F7F', '#BBBE3D', '#2EBECD'],
];
function prettyWithoutArrays(data) {
    if (Array.isArray(data)) {
        return data;
    }
    if (data && typeof data === 'object' && typeof data.toString === 'function') {
        const result = data.toString();
        if (result !== '[object Object]') {
            return result;
        }
    }
    return data;
}
function pretty(data) {
    if (Array.isArray(data)) {
        return data.map(prettyWithoutArrays);
    }
    return prettyWithoutArrays(data);
}
class RPCLogger {
    constructor(_kind) {
        this._kind = _kind;
        this._totalIncoming = 0;
        this._totalOutgoing = 0;
    }
    _log(direction, totalLength, msgLength, req, initiator, str, data) {
        data = pretty(data);
        const colorTable = colorTables[initiator];
        const color = LOG_USE_COLORS ? colorTable[req % colorTable.length] : '#000000';
        let args = [
            `%c[${extensionHostKindToString(this._kind)}][${direction}]%c[${String(totalLength).padStart(7)}]%c[len: ${String(msgLength).padStart(5)}]%c${String(req).padStart(5)} - ${str}`,
            'color: darkgreen',
            'color: grey',
            'color: grey',
            `color: ${color}`,
        ];
        if (/\($/.test(str)) {
            args = args.concat(data);
            args.push(')');
        }
        else {
            args.push(data);
        }
        console.log.apply(console, args);
    }
    logIncoming(msgLength, req, initiator, str, data) {
        this._totalIncoming += msgLength;
        this._log('Ext \u2192 Win', this._totalIncoming, msgLength, req, initiator, str, data);
    }
    logOutgoing(msgLength, req, initiator, str, data) {
        this._totalOutgoing += msgLength;
        this._log('Win \u2192 Ext', this._totalOutgoing, msgLength, req, initiator, str, data);
    }
}
let TelemetryRPCLogger = class TelemetryRPCLogger {
    static isEnabled() {
        return Math.random() < 0.0001; // 0.01% of users
    }
    constructor(_telemetryService) {
        this._telemetryService = _telemetryService;
        this._pendingRequests = new Map();
    }
    logIncoming(msgLength, req, initiator, str) {
        if (initiator === 0 /* RequestInitiator.LocalSide */ && /^receiveReply(Err)?:/.test(str)) {
            // log the size of reply messages
            const requestStr = this._pendingRequests.get(req) ?? 'unknown_reply';
            this._pendingRequests.delete(req);
            this._telemetryService.publicLog2('extensionhost.incoming', {
                type: `${str} ${requestStr}`,
                length: msgLength,
            });
        }
        if (initiator === 1 /* RequestInitiator.OtherSide */ && /^receiveRequest /.test(str)) {
            // incoming request
            this._telemetryService.publicLog2('extensionhost.incoming', {
                type: `${str}`,
                length: msgLength,
            });
        }
    }
    logOutgoing(msgLength, req, initiator, str) {
        if (initiator === 0 /* RequestInitiator.LocalSide */ && str.startsWith('request: ')) {
            this._pendingRequests.set(req, str);
            this._telemetryService.publicLog2('extensionhost.outgoing', {
                type: str,
                length: msgLength,
            });
        }
    }
};
TelemetryRPCLogger = __decorate([
    __param(0, ITelemetryService)
], TelemetryRPCLogger);
const providers = [];
function registerLatencyTestProvider(provider) {
    providers.push(provider);
    return {
        dispose: () => {
            for (let i = 0; i < providers.length; i++) {
                if (providers[i] === provider) {
                    providers.splice(i, 1);
                    return;
                }
            }
        },
    };
}
function getLatencyTestProviders() {
    return providers.slice(0);
}
registerAction2(class MeasureExtHostLatencyAction extends Action2 {
    constructor() {
        super({
            id: 'editor.action.measureExtHostLatency',
            title: nls.localize2('measureExtHostLatency', 'Measure Extension Host Latency'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const measurements = await Promise.all(getLatencyTestProviders().map((provider) => provider.measure()));
        editorService.openEditor({
            resource: undefined,
            contents: measurements.map(MeasureExtHostLatencyAction._print).join('\n\n'),
            options: { pinned: true },
        });
    }
    static _print(m) {
        if (!m) {
            return '';
        }
        return `${m.remoteAuthority ? `Authority: ${m.remoteAuthority}\n` : ``}Roundtrip latency: ${m.latency.toFixed(3)}ms\nUp: ${MeasureExtHostLatencyAction._printSpeed(m.up)}\nDown: ${MeasureExtHostLatencyAction._printSpeed(m.down)}\n`;
    }
    static _printSpeed(n) {
        if (n <= 1024) {
            return `${n} bps`;
        }
        if (n < 1024 * 1024) {
            return `${(n / 1024).toFixed(1)} kbps`;
        }
        return `${(n / 1024 / 1024).toFixed(1)} Mbps`;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uSG9zdE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdoRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBS3pGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyx3QkFBd0IsR0FDeEIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7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
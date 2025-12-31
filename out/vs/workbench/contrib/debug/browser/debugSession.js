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
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { distinct } from '../../../../base/common/arrays.js';
import { Queue, RunOnceScheduler, raceTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { canceled } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable, dispose, } from '../../../../base/common/lifecycle.js';
import { mixin } from '../../../../base/common/objects.js';
import * as platform from '../../../../base/common/platform.js';
import * as resources from '../../../../base/common/resources.js';
import Severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ICustomEndpointTelemetryService, ITelemetryService, } from '../../../../platform/telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { RawDebugSession } from './rawDebugSession.js';
import { IDebugService, VIEWLET_ID, isFrameDeemphasized, } from '../common/debug.js';
import { ExpressionContainer, MemoryRegion, Thread } from '../common/debugModel.js';
import { Source } from '../common/debugSource.js';
import { filterExceptionsFromTelemetry } from '../common/debugUtils.js';
import { ReplModel } from '../common/replModel.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { isDefined } from '../../../../base/common/types.js';
import { ITestService } from '../../testing/common/testService.js';
import { ITestResultService } from '../../testing/common/testResultService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
const TRIGGERED_BREAKPOINT_MAX_DELAY = 1500;
let DebugSession = class DebugSession {
    constructor(id, _configuration, root, model, options, debugService, telemetryService, hostService, configurationService, paneCompositeService, workspaceContextService, productService, notificationService, lifecycleService, uriIdentityService, instantiationService, customEndpointTelemetryService, workbenchEnvironmentService, logService, testService, testResultService, accessibilityService) {
        this.id = id;
        this._configuration = _configuration;
        this.root = root;
        this.model = model;
        this.debugService = debugService;
        this.telemetryService = telemetryService;
        this.hostService = hostService;
        this.configurationService = configurationService;
        this.paneCompositeService = paneCompositeService;
        this.workspaceContextService = workspaceContextService;
        this.productService = productService;
        this.notificationService = notificationService;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this.customEndpointTelemetryService = customEndpointTelemetryService;
        this.workbenchEnvironmentService = workbenchEnvironmentService;
        this.logService = logService;
        this.testService = testService;
        this.accessibilityService = accessibilityService;
        this.initialized = false;
        this.sources = new Map();
        this.threads = new Map();
        this.threadIds = [];
        this.cancellationMap = new Map();
        this.rawListeners = new DisposableStore();
        this.globalDisposables = new DisposableStore();
        this.stoppedDetails = [];
        this.statusQueue = this.rawListeners.add(new ThreadStatusScheduler());
        this._onDidChangeState = new Emitter();
        this._onDidEndAdapter = new Emitter();
        this._onDidLoadedSource = new Emitter();
        this._onDidCustomEvent = new Emitter();
        this._onDidProgressStart = new Emitter();
        this._onDidProgressUpdate = new Emitter();
        this._onDidProgressEnd = new Emitter();
        this._onDidInvalidMemory = new Emitter();
        this._onDidChangeREPLElements = new Emitter();
        this._onDidChangeName = new Emitter();
        this._options = options || {};
        this.parentSession = this._options.parentSession;
        if (this.hasSeparateRepl()) {
            this.repl = new ReplModel(this.configurationService);
        }
        else {
            this.repl = this.parentSession.repl;
        }
        const toDispose = this.globalDisposables;
        const replListener = toDispose.add(new MutableDisposable());
        replListener.value = this.repl.onDidChangeElements((e) => this._onDidChangeREPLElements.fire(e));
        if (lifecycleService) {
            toDispose.add(lifecycleService.onWillShutdown(() => {
                this.shutdown();
                dispose(toDispose);
            }));
        }
        // Cast here, it's not possible to reference a hydrated result in this code path.
        this.correlatedTestRun = options?.testRun
            ? testResultService.getResult(options.testRun.runId)
            : this.parentSession?.correlatedTestRun;
        if (this.correlatedTestRun) {
            // Listen to the test completing because the user might have taken the cancel action rather than stopping the session.
            toDispose.add(this.correlatedTestRun.onComplete(() => this.terminate()));
        }
        const compoundRoot = this._options.compoundRoot;
        if (compoundRoot) {
            toDispose.add(compoundRoot.onDidSessionStop(() => this.terminate()));
        }
        this.passFocusScheduler = new RunOnceScheduler(() => {
            // If there is some session or thread that is stopped pass focus to it
            if (this.debugService
                .getModel()
                .getSessions()
                .some((s) => s.state === 2 /* State.Stopped */) ||
                this.getAllThreads().some((t) => t.stopped)) {
                if (typeof this.lastContinuedThreadId === 'number') {
                    const thread = this.debugService.getViewModel().focusedThread;
                    if (thread && thread.threadId === this.lastContinuedThreadId && !thread.stopped) {
                        const toFocusThreadId = this.getStoppedDetails()?.threadId;
                        const toFocusThread = typeof toFocusThreadId === 'number' ? this.getThread(toFocusThreadId) : undefined;
                        this.debugService.focusStackFrame(undefined, toFocusThread);
                    }
                }
                else {
                    const session = this.debugService.getViewModel().focusedSession;
                    if (session && session.getId() === this.getId() && session.state !== 2 /* State.Stopped */) {
                        this.debugService.focusStackFrame(undefined);
                    }
                }
            }
        }, 800);
        const parent = this._options.parentSession;
        if (parent) {
            toDispose.add(parent.onDidEndAdapter(() => {
                // copy the parent repl and get a new detached repl for this child, and
                // remove its parent, if it's still running
                if (!this.hasSeparateRepl() && this.raw?.isInShutdown === false) {
                    this.repl = this.repl.clone();
                    replListener.value = this.repl.onDidChangeElements((e) => this._onDidChangeREPLElements.fire(e));
                    this.parentSession = undefined;
                }
            }));
        }
    }
    getId() {
        return this.id;
    }
    setSubId(subId) {
        this._subId = subId;
    }
    getMemory(memoryReference) {
        return new MemoryRegion(memoryReference, this);
    }
    get subId() {
        return this._subId;
    }
    get configuration() {
        return this._configuration.resolved;
    }
    get unresolvedConfiguration() {
        return this._configuration.unresolved;
    }
    get lifecycleManagedByParent() {
        return !!this._options.lifecycleManagedByParent;
    }
    get compact() {
        return !!this._options.compact;
    }
    get saveBeforeRestart() {
        return this._options.saveBeforeRestart ?? !this._options?.parentSession;
    }
    get compoundRoot() {
        return this._options.compoundRoot;
    }
    get suppressDebugStatusbar() {
        return this._options.suppressDebugStatusbar ?? false;
    }
    get suppressDebugToolbar() {
        return this._options.suppressDebugToolbar ?? false;
    }
    get suppressDebugView() {
        return this._options.suppressDebugView ?? false;
    }
    get autoExpandLazyVariables() {
        // This tiny helper avoids converting the entire debug model to use service injection
        const screenReaderOptimized = this.accessibilityService.isScreenReaderOptimized();
        const value = this.configurationService.getValue('debug').autoExpandLazyVariables;
        return (value === 'auto' && screenReaderOptimized) || value === 'on';
    }
    setConfiguration(configuration) {
        this._configuration = configuration;
    }
    getLabel() {
        const includeRoot = this.workspaceContextService.getWorkspace().folders.length > 1;
        return includeRoot && this.root
            ? `${this.name} (${resources.basenameOrAuthority(this.root.uri)})`
            : this.name;
    }
    setName(name) {
        this._name = name;
        this._onDidChangeName.fire(name);
    }
    get name() {
        return this._name || this.configuration.name;
    }
    get state() {
        if (!this.initialized) {
            return 1 /* State.Initializing */;
        }
        if (!this.raw) {
            return 0 /* State.Inactive */;
        }
        const focusedThread = this.debugService.getViewModel().focusedThread;
        if (focusedThread && focusedThread.session === this) {
            return focusedThread.stopped ? 2 /* State.Stopped */ : 3 /* State.Running */;
        }
        if (this.getAllThreads().some((t) => t.stopped)) {
            return 2 /* State.Stopped */;
        }
        return 3 /* State.Running */;
    }
    get capabilities() {
        return this.raw ? this.raw.capabilities : Object.create(null);
    }
    //---- events
    get onDidChangeState() {
        return this._onDidChangeState.event;
    }
    get onDidEndAdapter() {
        return this._onDidEndAdapter.event;
    }
    get onDidChangeReplElements() {
        return this._onDidChangeREPLElements.event;
    }
    get onDidChangeName() {
        return this._onDidChangeName.event;
    }
    //---- DAP events
    get onDidCustomEvent() {
        return this._onDidCustomEvent.event;
    }
    get onDidLoadedSource() {
        return this._onDidLoadedSource.event;
    }
    get onDidProgressStart() {
        return this._onDidProgressStart.event;
    }
    get onDidProgressUpdate() {
        return this._onDidProgressUpdate.event;
    }
    get onDidProgressEnd() {
        return this._onDidProgressEnd.event;
    }
    get onDidInvalidateMemory() {
        return this._onDidInvalidMemory.event;
    }
    //---- DAP requests
    /**
     * create and initialize a new debug adapter for this session
     */
    async initialize(dbgr) {
        if (this.raw) {
            // if there was already a connection make sure to remove old listeners
            await this.shutdown();
        }
        try {
            const debugAdapter = await dbgr.createDebugAdapter(this);
            this.raw = this.instantiationService.createInstance(RawDebugSession, debugAdapter, dbgr, this.id, this.configuration.name);
            await this.raw.start();
            this.registerListeners();
            await this.raw.initialize({
                clientID: 'vscode',
                clientName: this.productService.nameLong,
                adapterID: this.configuration.type,
                pathFormat: 'path',
                linesStartAt1: true,
                columnsStartAt1: true,
                supportsVariableType: true, // #8858
                supportsVariablePaging: true, // #9537
                supportsRunInTerminalRequest: true, // #10574
                locale: platform.language, // #169114
                supportsProgressReporting: true, // #92253
                supportsInvalidatedEvent: true, // #106745
                supportsMemoryReferences: true, //#129684
                supportsArgsCanBeInterpretedByShell: true, // #149910
                supportsMemoryEvent: true, // #133643
                supportsStartDebuggingRequest: true,
                supportsANSIStyling: true,
            });
            this.initialized = true;
            this._onDidChangeState.fire();
            this.rememberedCapabilities = this.raw.capabilities;
            this.debugService.setExceptionBreakpointsForSession(this, (this.raw && this.raw.capabilities.exceptionBreakpointFilters) || []);
            this.debugService
                .getModel()
                .registerBreakpointModes(this.configuration.type, this.raw.capabilities.breakpointModes || []);
        }
        catch (err) {
            this.initialized = true;
            this._onDidChangeState.fire();
            await this.shutdown();
            throw err;
        }
    }
    /**
     * launch or attach to the debuggee
     */
    async launchOrAttach(config) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'launch or attach'));
        }
        if (this.parentSession && this.parentSession.state === 0 /* State.Inactive */) {
            throw canceled();
        }
        // __sessionID only used for EH debugging (but we add it always for now...)
        config.__sessionId = this.getId();
        try {
            await this.raw.launchOrAttach(config);
        }
        catch (err) {
            this.shutdown();
            throw err;
        }
    }
    /**
     * Terminate any linked test run.
     */
    cancelCorrelatedTestRun() {
        if (this.correlatedTestRun && !this.correlatedTestRun.completedAt) {
            this.didTerminateTestRun = true;
            this.testService.cancelTestRun(this.correlatedTestRun.id);
        }
    }
    /**
     * terminate the current debug adapter session
     */
    async terminate(restart = false) {
        if (!this.raw) {
            // Adapter went down but it did not send a 'terminated' event, simulate like the event has been sent
            this.onDidExitAdapter();
        }
        this.cancelAllRequests();
        if (this._options.lifecycleManagedByParent && this.parentSession) {
            await this.parentSession.terminate(restart);
        }
        else if (this.correlatedTestRun &&
            !this.correlatedTestRun.completedAt &&
            !this.didTerminateTestRun) {
            this.cancelCorrelatedTestRun();
        }
        else if (this.raw) {
            if (this.raw.capabilities.supportsTerminateRequest &&
                this._configuration.resolved.request === 'launch') {
                await this.raw.terminate(restart);
            }
            else {
                await this.raw.disconnect({ restart, terminateDebuggee: true });
            }
        }
        if (!restart) {
            this._options.compoundRoot?.sessionStopped();
        }
    }
    /**
     * end the current debug adapter session
     */
    async disconnect(restart = false, suspend = false) {
        if (!this.raw) {
            // Adapter went down but it did not send a 'terminated' event, simulate like the event has been sent
            this.onDidExitAdapter();
        }
        this.cancelAllRequests();
        if (this._options.lifecycleManagedByParent && this.parentSession) {
            await this.parentSession.disconnect(restart, suspend);
        }
        else if (this.raw) {
            // TODO terminateDebuggee should be undefined by default?
            await this.raw.disconnect({ restart, terminateDebuggee: false, suspendDebuggee: suspend });
        }
        if (!restart) {
            this._options.compoundRoot?.sessionStopped();
        }
    }
    /**
     * restart debug adapter session
     */
    async restart() {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'restart'));
        }
        this.cancelAllRequests();
        if (this._options.lifecycleManagedByParent && this.parentSession) {
            await this.parentSession.restart();
        }
        else {
            await this.raw.restart({ arguments: this.configuration });
        }
    }
    async sendBreakpoints(modelUri, breakpointsToSend, sourceModified) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'breakpoints'));
        }
        if (!this.raw.readyForBreakpoints) {
            return Promise.resolve(undefined);
        }
        const rawSource = this.getRawSource(modelUri);
        if (breakpointsToSend.length && !rawSource.adapterData) {
            rawSource.adapterData = breakpointsToSend[0].adapterData;
        }
        // Normalize all drive letters going out from vscode to debug adapters so we are consistent with our resolving #43959
        if (rawSource.path) {
            rawSource.path = normalizeDriveLetter(rawSource.path);
        }
        const response = await this.raw.setBreakpoints({
            source: rawSource,
            lines: breakpointsToSend.map((bp) => bp.sessionAgnosticData.lineNumber),
            breakpoints: breakpointsToSend.map((bp) => bp.toDAP()),
            sourceModified,
        });
        if (response?.body) {
            const data = new Map();
            for (let i = 0; i < breakpointsToSend.length; i++) {
                data.set(breakpointsToSend[i].getId(), response.body.breakpoints[i]);
            }
            this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
        }
    }
    async sendFunctionBreakpoints(fbpts) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'function breakpoints'));
        }
        if (this.raw.readyForBreakpoints) {
            const response = await this.raw.setFunctionBreakpoints({
                breakpoints: fbpts.map((bp) => bp.toDAP()),
            });
            if (response?.body) {
                const data = new Map();
                for (let i = 0; i < fbpts.length; i++) {
                    data.set(fbpts[i].getId(), response.body.breakpoints[i]);
                }
                this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
            }
        }
    }
    async sendExceptionBreakpoints(exbpts) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'exception breakpoints'));
        }
        if (this.raw.readyForBreakpoints) {
            const args = this.capabilities
                .supportsExceptionFilterOptions
                ? {
                    filters: [],
                    filterOptions: exbpts.map((exb) => {
                        if (exb.condition) {
                            return { filterId: exb.filter, condition: exb.condition };
                        }
                        return { filterId: exb.filter };
                    }),
                }
                : { filters: exbpts.map((exb) => exb.filter) };
            const response = await this.raw.setExceptionBreakpoints(args);
            if (response?.body && response.body.breakpoints) {
                const data = new Map();
                for (let i = 0; i < exbpts.length; i++) {
                    data.set(exbpts[i].getId(), response.body.breakpoints[i]);
                }
                this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
            }
        }
    }
    dataBytesBreakpointInfo(address, bytes) {
        if (this.raw?.capabilities.supportsDataBreakpointBytes === false) {
            throw new Error(localize('sessionDoesNotSupporBytesBreakpoints', 'Session does not support breakpoints with bytes'));
        }
        return this._dataBreakpointInfo({ name: address, bytes, asAddress: true });
    }
    dataBreakpointInfo(name, variablesReference) {
        return this._dataBreakpointInfo({ name, variablesReference });
    }
    async _dataBreakpointInfo(args) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'data breakpoints info'));
        }
        if (!this.raw.readyForBreakpoints) {
            throw new Error(localize('sessionNotReadyForBreakpoints', 'Session is not ready for breakpoints'));
        }
        const response = await this.raw.dataBreakpointInfo(args);
        return response?.body;
    }
    async sendDataBreakpoints(dataBreakpoints) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'data breakpoints'));
        }
        if (this.raw.readyForBreakpoints) {
            const converted = await Promise.all(dataBreakpoints.map(async (bp) => {
                try {
                    const dap = await bp.toDAP(this);
                    return { dap, bp };
                }
                catch (e) {
                    return { bp, message: e.message };
                }
            }));
            const response = await this.raw.setDataBreakpoints({
                breakpoints: converted.map((d) => d.dap).filter(isDefined),
            });
            if (response?.body) {
                const data = new Map();
                let i = 0;
                for (const dap of converted) {
                    if (!dap.dap) {
                        data.set(dap.bp.getId(), dap.message);
                    }
                    else if (i < response.body.breakpoints.length) {
                        data.set(dap.bp.getId(), response.body.breakpoints[i++]);
                    }
                }
                this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
            }
        }
    }
    async sendInstructionBreakpoints(instructionBreakpoints) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'instruction breakpoints'));
        }
        if (this.raw.readyForBreakpoints) {
            const response = await this.raw.setInstructionBreakpoints({
                breakpoints: instructionBreakpoints.map((ib) => ib.toDAP()),
            });
            if (response?.body) {
                const data = new Map();
                for (let i = 0; i < instructionBreakpoints.length; i++) {
                    data.set(instructionBreakpoints[i].getId(), response.body.breakpoints[i]);
                }
                this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
            }
        }
    }
    async breakpointsLocations(uri, lineNumber) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'breakpoints locations'));
        }
        const source = this.getRawSource(uri);
        const response = await this.raw.breakpointLocations({ source, line: lineNumber });
        if (!response || !response.body || !response.body.breakpoints) {
            return [];
        }
        const positions = response.body.breakpoints.map((bp) => ({
            lineNumber: bp.line,
            column: bp.column || 1,
        }));
        return distinct(positions, (p) => `${p.lineNumber}:${p.column}`);
    }
    getDebugProtocolBreakpoint(breakpointId) {
        return this.model.getDebugProtocolBreakpoint(breakpointId, this.getId());
    }
    customRequest(request, args) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", request));
        }
        return this.raw.custom(request, args);
    }
    stackTrace(threadId, startFrame, levels, token) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'stackTrace'));
        }
        const sessionToken = this.getNewCancellationToken(threadId, token);
        return this.raw.stackTrace({ threadId, startFrame, levels }, sessionToken);
    }
    async exceptionInfo(threadId) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'exceptionInfo'));
        }
        const response = await this.raw.exceptionInfo({ threadId });
        if (response) {
            return {
                id: response.body.exceptionId,
                description: response.body.description,
                breakMode: response.body.breakMode,
                details: response.body.details,
            };
        }
        return undefined;
    }
    scopes(frameId, threadId) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'scopes'));
        }
        const token = this.getNewCancellationToken(threadId);
        return this.raw.scopes({ frameId }, token);
    }
    variables(variablesReference, threadId, filter, start, count) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'variables'));
        }
        const token = threadId ? this.getNewCancellationToken(threadId) : undefined;
        return this.raw.variables({ variablesReference, filter, start, count }, token);
    }
    evaluate(expression, frameId, context, location) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'evaluate'));
        }
        return this.raw.evaluate({
            expression,
            frameId,
            context,
            line: location?.line,
            column: location?.column,
            source: location?.source,
        });
    }
    async restartFrame(frameId, threadId) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'restartFrame'));
        }
        await this.raw.restartFrame({ frameId }, threadId);
    }
    setLastSteppingGranularity(threadId, granularity) {
        const thread = this.getThread(threadId);
        if (thread) {
            thread.lastSteppingGranularity = granularity;
        }
    }
    async next(threadId, granularity) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'next'));
        }
        this.setLastSteppingGranularity(threadId, granularity);
        await this.raw.next({ threadId, granularity });
    }
    async stepIn(threadId, targetId, granularity) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'stepIn'));
        }
        this.setLastSteppingGranularity(threadId, granularity);
        await this.raw.stepIn({ threadId, targetId, granularity });
    }
    async stepOut(threadId, granularity) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'stepOut'));
        }
        this.setLastSteppingGranularity(threadId, granularity);
        await this.raw.stepOut({ threadId, granularity });
    }
    async stepBack(threadId, granularity) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'stepBack'));
        }
        this.setLastSteppingGranularity(threadId, granularity);
        await this.raw.stepBack({ threadId, granularity });
    }
    async continue(threadId) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'continue'));
        }
        await this.raw.continue({ threadId });
    }
    async reverseContinue(threadId) {
        await this.waitForTriggeredBreakpoints();
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'reverse continue'));
        }
        await this.raw.reverseContinue({ threadId });
    }
    async pause(threadId) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'pause'));
        }
        await this.raw.pause({ threadId });
    }
    async terminateThreads(threadIds) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'terminateThreads'));
        }
        await this.raw.terminateThreads({ threadIds });
    }
    setVariable(variablesReference, name, value) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'setVariable'));
        }
        return this.raw.setVariable({ variablesReference, name, value });
    }
    setExpression(frameId, expression, value) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'setExpression'));
        }
        return this.raw.setExpression({ expression, value, frameId });
    }
    gotoTargets(source, line, column) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'gotoTargets'));
        }
        return this.raw.gotoTargets({ source, line, column });
    }
    goto(threadId, targetId) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'goto'));
        }
        return this.raw.goto({ threadId, targetId });
    }
    loadSource(resource) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'loadSource')));
        }
        const source = this.getSourceForUri(resource);
        let rawSource;
        if (source) {
            rawSource = source.raw;
        }
        else {
            // create a Source
            const data = Source.getEncodedDebugData(resource);
            rawSource = { path: data.path, sourceReference: data.sourceReference };
        }
        return this.raw.source({ sourceReference: rawSource.sourceReference || 0, source: rawSource });
    }
    async getLoadedSources() {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'getLoadedSources')));
        }
        const response = await this.raw.loadedSources({});
        if (response?.body && response.body.sources) {
            return response.body.sources.map((src) => this.getSource(src));
        }
        else {
            return [];
        }
    }
    async completions(frameId, threadId, text, position, token) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'completions')));
        }
        const sessionCancelationToken = this.getNewCancellationToken(threadId, token);
        return this.raw.completions({
            frameId,
            text,
            column: position.column,
            line: position.lineNumber,
        }, sessionCancelationToken);
    }
    async stepInTargets(frameId) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'stepInTargets')));
        }
        const response = await this.raw.stepInTargets({ frameId });
        return response?.body.targets;
    }
    async cancel(progressId) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'cancel')));
        }
        return this.raw.cancel({ progressId });
    }
    async disassemble(memoryReference, offset, instructionOffset, instructionCount) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'disassemble')));
        }
        const response = await this.raw.disassemble({
            memoryReference,
            offset,
            instructionOffset,
            instructionCount,
            resolveSymbols: true,
        });
        return response?.body?.instructions;
    }
    readMemory(memoryReference, offset, count) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'readMemory')));
        }
        return this.raw.readMemory({ count, memoryReference, offset });
    }
    writeMemory(memoryReference, offset, data, allowPartial) {
        if (!this.raw) {
            return Promise.reject(new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'disassemble')));
        }
        return this.raw.writeMemory({ memoryReference, offset, allowPartial, data });
    }
    async resolveLocationReference(locationReference) {
        if (!this.raw) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'locations'));
        }
        const location = await this.raw.locations({ locationReference });
        if (!location?.body) {
            throw new Error(localize('noDebugAdapter', "No debugger available, can not send '{0}'", 'locations'));
        }
        const source = this.getSource(location.body.source);
        return { column: 1, ...location.body, source };
    }
    //---- threads
    getThread(threadId) {
        return this.threads.get(threadId);
    }
    getAllThreads() {
        const result = [];
        this.threadIds.forEach((threadId) => {
            const thread = this.threads.get(threadId);
            if (thread) {
                result.push(thread);
            }
        });
        return result;
    }
    clearThreads(removeThreads, reference = undefined) {
        if (reference !== undefined && reference !== null) {
            const thread = this.threads.get(reference);
            if (thread) {
                thread.clearCallStack();
                thread.stoppedDetails = undefined;
                thread.stopped = false;
                if (removeThreads) {
                    this.threads.delete(reference);
                }
            }
        }
        else {
            this.threads.forEach((thread) => {
                thread.clearCallStack();
                thread.stoppedDetails = undefined;
                thread.stopped = false;
            });
            if (removeThreads) {
                this.threads.clear();
                this.threadIds = [];
                ExpressionContainer.allValues.clear();
            }
        }
    }
    getStoppedDetails() {
        return this.stoppedDetails.length >= 1 ? this.stoppedDetails[0] : undefined;
    }
    rawUpdate(data) {
        this.threadIds = [];
        data.threads.forEach((thread) => {
            this.threadIds.push(thread.id);
            if (!this.threads.has(thread.id)) {
                // A new thread came in, initialize it.
                this.threads.set(thread.id, new Thread(this, thread.name, thread.id));
            }
            else if (thread.name) {
                // Just the thread name got updated #18244
                const oldThread = this.threads.get(thread.id);
                if (oldThread) {
                    oldThread.name = thread.name;
                }
            }
        });
        this.threads.forEach((t) => {
            // Remove all old threads which are no longer part of the update #75980
            if (this.threadIds.indexOf(t.threadId) === -1) {
                this.threads.delete(t.threadId);
            }
        });
        const stoppedDetails = data.stoppedDetails;
        if (stoppedDetails) {
            // Set the availability of the threads' callstacks depending on
            // whether the thread is stopped or not
            if (stoppedDetails.allThreadsStopped) {
                this.threads.forEach((thread) => {
                    thread.stoppedDetails =
                        thread.threadId === stoppedDetails.threadId
                            ? stoppedDetails
                            : { reason: thread.stoppedDetails?.reason };
                    thread.stopped = true;
                    thread.clearCallStack();
                });
            }
            else {
                const thread = typeof stoppedDetails.threadId === 'number'
                    ? this.threads.get(stoppedDetails.threadId)
                    : undefined;
                if (thread) {
                    // One thread is stopped, only update that thread.
                    thread.stoppedDetails = stoppedDetails;
                    thread.clearCallStack();
                    thread.stopped = true;
                }
            }
        }
    }
    waitForTriggeredBreakpoints() {
        if (!this._waitToResume) {
            return;
        }
        return raceTimeout(this._waitToResume, TRIGGERED_BREAKPOINT_MAX_DELAY);
    }
    async fetchThreads(stoppedDetails) {
        if (this.raw) {
            const response = await this.raw.threads();
            if (response?.body && response.body.threads) {
                this.model.rawUpdate({
                    sessionId: this.getId(),
                    threads: response.body.threads,
                    stoppedDetails,
                });
            }
        }
    }
    initializeForTest(raw) {
        this.raw = raw;
        this.registerListeners();
    }
    //---- private
    registerListeners() {
        if (!this.raw) {
            return;
        }
        this.rawListeners.add(this.raw.onDidInitialize(async () => {
            aria.status(this.configuration.noDebug
                ? localize('debuggingStartedNoDebug', 'Started running without debugging.')
                : localize('debuggingStarted', 'Debugging started.'));
            const sendConfigurationDone = async () => {
                if (this.raw && this.raw.capabilities.supportsConfigurationDoneRequest) {
                    try {
                        await this.raw.configurationDone();
                    }
                    catch (e) {
                        // Disconnect the debug session on configuration done error #10596
                        this.notificationService.error(e);
                        this.raw?.disconnect({});
                    }
                }
                return undefined;
            };
            // Send all breakpoints
            try {
                await this.debugService.sendAllBreakpoints(this);
            }
            finally {
                await sendConfigurationDone();
                await this.fetchThreads();
            }
        }));
        const statusQueue = this.statusQueue;
        this.rawListeners.add(this.raw.onDidStop((event) => this.handleStop(event.body)));
        this.rawListeners.add(this.raw.onDidThread((event) => {
            statusQueue.cancel([event.body.threadId]);
            if (event.body.reason === 'started') {
                // debounce to reduce threadsRequest frequency and improve performance
                if (!this.fetchThreadsScheduler) {
                    this.fetchThreadsScheduler = new RunOnceScheduler(() => {
                        this.fetchThreads();
                    }, 100);
                    this.rawListeners.add(this.fetchThreadsScheduler);
                }
                if (!this.fetchThreadsScheduler.isScheduled()) {
                    this.fetchThreadsScheduler.schedule();
                }
            }
            else if (event.body.reason === 'exited') {
                this.model.clearThreads(this.getId(), true, event.body.threadId);
                const viewModel = this.debugService.getViewModel();
                const focusedThread = viewModel.focusedThread;
                this.passFocusScheduler.cancel();
                if (focusedThread && event.body.threadId === focusedThread.threadId) {
                    // De-focus the thread in case it was focused
                    this.debugService.focusStackFrame(undefined, undefined, viewModel.focusedSession, {
                        explicit: false,
                    });
                }
            }
        }));
        this.rawListeners.add(this.raw.onDidTerminateDebugee(async (event) => {
            aria.status(localize('debuggingStopped', 'Debugging stopped.'));
            if (event.body && event.body.restart) {
                await this.debugService.restartSession(this, event.body.restart);
            }
            else if (this.raw) {
                await this.raw.disconnect({ terminateDebuggee: false });
            }
        }));
        this.rawListeners.add(this.raw.onDidContinued((event) => {
            const allThreads = event.body.allThreadsContinued !== false;
            statusQueue.cancel(allThreads ? undefined : [event.body.threadId]);
            const threadId = allThreads ? undefined : event.body.threadId;
            if (typeof threadId === 'number') {
                this.stoppedDetails = this.stoppedDetails.filter((sd) => sd.threadId !== threadId);
                const tokens = this.cancellationMap.get(threadId);
                this.cancellationMap.delete(threadId);
                tokens?.forEach((t) => t.dispose(true));
            }
            else {
                this.stoppedDetails = [];
                this.cancelAllRequests();
            }
            this.lastContinuedThreadId = threadId;
            // We need to pass focus to other sessions / threads with a timeout in case a quick stop event occurs #130321
            this.passFocusScheduler.schedule();
            this.model.clearThreads(this.getId(), false, threadId);
            this._onDidChangeState.fire();
        }));
        const outputQueue = new Queue();
        this.rawListeners.add(this.raw.onDidOutput(async (event) => {
            const outputSeverity = event.body.category === 'stderr'
                ? Severity.Error
                : event.body.category === 'console'
                    ? Severity.Warning
                    : Severity.Info;
            // When a variables event is received, execute immediately to obtain the variables value #126967
            if (event.body.variablesReference) {
                const source = event.body.source && event.body.line
                    ? {
                        lineNumber: event.body.line,
                        column: event.body.column ? event.body.column : 1,
                        source: this.getSource(event.body.source),
                    }
                    : undefined;
                const container = new ExpressionContainer(this, undefined, event.body.variablesReference, generateUuid());
                const children = container.getChildren();
                // we should put appendToRepl into queue to make sure the logs to be displayed in correct order
                // see https://github.com/microsoft/vscode/issues/126967#issuecomment-874954269
                outputQueue.queue(async () => {
                    const resolved = await children;
                    // For single logged variables, try to use the output if we can so
                    // present a better (i.e. ANSI-aware) representation of the output
                    if (resolved.length === 1) {
                        this.appendToRepl({ output: event.body.output, expression: resolved[0], sev: outputSeverity, source }, event.body.category === 'important');
                        return;
                    }
                    resolved.forEach((child) => {
                        // Since we can not display multiple trees in a row, we are displaying these variables one after the other (ignoring their names)
                        ;
                        child.name = null;
                        this.appendToRepl({ output: '', expression: child, sev: outputSeverity, source }, event.body.category === 'important');
                    });
                });
                return;
            }
            outputQueue.queue(async () => {
                if (!event.body || !this.raw) {
                    return;
                }
                if (event.body.category === 'telemetry') {
                    // only log telemetry events from debug adapter if the debug extension provided the telemetry key
                    // and the user opted in telemetry
                    const telemetryEndpoint = this.raw.dbgr.getCustomTelemetryEndpoint();
                    if (telemetryEndpoint && this.telemetryService.telemetryLevel !== 0 /* TelemetryLevel.NONE */) {
                        // __GDPR__TODO__ We're sending events in the name of the debug extension and we can not ensure that those are declared correctly.
                        let data = event.body.data;
                        if (!telemetryEndpoint.sendErrorTelemetry && event.body.data) {
                            data = filterExceptionsFromTelemetry(event.body.data);
                        }
                        this.customEndpointTelemetryService.publicLog(telemetryEndpoint, event.body.output, data);
                    }
                    return;
                }
                // Make sure to append output in the correct order by properly waiting on preivous promises #33822
                const source = event.body.source && event.body.line
                    ? {
                        lineNumber: event.body.line,
                        column: event.body.column ? event.body.column : 1,
                        source: this.getSource(event.body.source),
                    }
                    : undefined;
                if (event.body.group === 'start' || event.body.group === 'startCollapsed') {
                    const expanded = event.body.group === 'start';
                    this.repl.startGroup(this, event.body.output || '', expanded, source);
                    return;
                }
                if (event.body.group === 'end') {
                    this.repl.endGroup();
                    if (!event.body.output) {
                        // Only return if the end event does not have additional output in it
                        return;
                    }
                }
                if (typeof event.body.output === 'string') {
                    this.appendToRepl({ output: event.body.output, sev: outputSeverity, source }, event.body.category === 'important');
                }
            });
        }));
        this.rawListeners.add(this.raw.onDidBreakpoint((event) => {
            const id = event.body && event.body.breakpoint ? event.body.breakpoint.id : undefined;
            const breakpoint = this.model
                .getBreakpoints()
                .find((bp) => bp.getIdFromAdapter(this.getId()) === id);
            const functionBreakpoint = this.model
                .getFunctionBreakpoints()
                .find((bp) => bp.getIdFromAdapter(this.getId()) === id);
            const dataBreakpoint = this.model
                .getDataBreakpoints()
                .find((dbp) => dbp.getIdFromAdapter(this.getId()) === id);
            const exceptionBreakpoint = this.model
                .getExceptionBreakpoints()
                .find((excbp) => excbp.getIdFromAdapter(this.getId()) === id);
            if (event.body.reason === 'new' &&
                event.body.breakpoint.source &&
                event.body.breakpoint.line) {
                const source = this.getSource(event.body.breakpoint.source);
                const bps = this.model.addBreakpoints(source.uri, [
                    {
                        column: event.body.breakpoint.column,
                        enabled: true,
                        lineNumber: event.body.breakpoint.line,
                    },
                ], false);
                if (bps.length === 1) {
                    const data = new Map([
                        [bps[0].getId(), event.body.breakpoint],
                    ]);
                    this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
                }
            }
            if (event.body.reason === 'removed') {
                if (breakpoint) {
                    this.model.removeBreakpoints([breakpoint]);
                }
                if (functionBreakpoint) {
                    this.model.removeFunctionBreakpoints(functionBreakpoint.getId());
                }
                if (dataBreakpoint) {
                    this.model.removeDataBreakpoints(dataBreakpoint.getId());
                }
            }
            if (event.body.reason === 'changed') {
                if (breakpoint) {
                    if (!breakpoint.column) {
                        event.body.breakpoint.column = undefined;
                    }
                    const data = new Map([
                        [breakpoint.getId(), event.body.breakpoint],
                    ]);
                    this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
                }
                if (functionBreakpoint) {
                    const data = new Map([
                        [functionBreakpoint.getId(), event.body.breakpoint],
                    ]);
                    this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
                }
                if (dataBreakpoint) {
                    const data = new Map([
                        [dataBreakpoint.getId(), event.body.breakpoint],
                    ]);
                    this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
                }
                if (exceptionBreakpoint) {
                    const data = new Map([
                        [exceptionBreakpoint.getId(), event.body.breakpoint],
                    ]);
                    this.model.setBreakpointSessionData(this.getId(), this.capabilities, data);
                }
            }
        }));
        this.rawListeners.add(this.raw.onDidLoadedSource((event) => {
            this._onDidLoadedSource.fire({
                reason: event.body.reason,
                source: this.getSource(event.body.source),
            });
        }));
        this.rawListeners.add(this.raw.onDidCustomEvent((event) => {
            this._onDidCustomEvent.fire(event);
        }));
        this.rawListeners.add(this.raw.onDidProgressStart((event) => {
            this._onDidProgressStart.fire(event);
        }));
        this.rawListeners.add(this.raw.onDidProgressUpdate((event) => {
            this._onDidProgressUpdate.fire(event);
        }));
        this.rawListeners.add(this.raw.onDidProgressEnd((event) => {
            this._onDidProgressEnd.fire(event);
        }));
        this.rawListeners.add(this.raw.onDidInvalidateMemory((event) => {
            this._onDidInvalidMemory.fire(event);
        }));
        this.rawListeners.add(this.raw.onDidInvalidated(async (event) => {
            const areas = event.body.areas || ['all'];
            // If invalidated event only requires to update variables or watch, do that, otherwise refetch threads https://github.com/microsoft/vscode/issues/106745
            if (areas.includes('threads') || areas.includes('stacks') || areas.includes('all')) {
                this.cancelAllRequests();
                this.model.clearThreads(this.getId(), true);
                const details = this.stoppedDetails;
                this.stoppedDetails.length = 1;
                await Promise.all(details.map((d) => this.handleStop(d)));
            }
            const viewModel = this.debugService.getViewModel();
            if (viewModel.focusedSession === this) {
                viewModel.updateViews();
            }
        }));
        this.rawListeners.add(this.raw.onDidExitAdapter((event) => this.onDidExitAdapter(event)));
    }
    async handleStop(event) {
        this.passFocusScheduler.cancel();
        this.stoppedDetails.push(event);
        // do this very eagerly if we have hitBreakpointIds, since it may take a
        // moment for breakpoints to set and we want to do our best to not miss
        // anything
        if (event.hitBreakpointIds) {
            this._waitToResume = this.enableDependentBreakpoints(event.hitBreakpointIds);
        }
        this.statusQueue.run(this.fetchThreads(event).then(() => event.threadId === undefined ? this.threadIds : [event.threadId]), async (threadId, token) => {
            const hasLotsOfThreads = event.threadId === undefined && this.threadIds.length > 10;
            // If the focus for the current session is on a non-existent thread, clear the focus.
            const focusedThread = this.debugService.getViewModel().focusedThread;
            const focusedThreadDoesNotExist = focusedThread !== undefined &&
                focusedThread.session === this &&
                !this.threads.has(focusedThread.threadId);
            if (focusedThreadDoesNotExist) {
                this.debugService.focusStackFrame(undefined, undefined);
            }
            const thread = typeof threadId === 'number' ? this.getThread(threadId) : undefined;
            if (thread) {
                // Call fetch call stack twice, the first only return the top stack frame.
                // Second retrieves the rest of the call stack. For performance reasons #25605
                // Second call is only done if there's few threads that stopped in this event.
                const promises = this.model.refreshTopOfCallstack(thread, 
                /* fetchFullStack= */ !hasLotsOfThreads);
                const focus = async () => {
                    if (focusedThreadDoesNotExist ||
                        (!event.preserveFocusHint && thread.getCallStack().length)) {
                        const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
                        if (!focusedStackFrame || focusedStackFrame.thread.session === this) {
                            // Only take focus if nothing is focused, or if the focus is already on the current session
                            const preserveFocus = !this.configurationService.getValue('debug')
                                .focusEditorOnBreak;
                            await this.debugService.focusStackFrame(undefined, thread, undefined, {
                                preserveFocus,
                            });
                        }
                        if (thread.stoppedDetails && !token.isCancellationRequested) {
                            if (thread.stoppedDetails.reason === 'breakpoint' &&
                                this.configurationService.getValue('debug').openDebug ===
                                    'openOnDebugBreak' &&
                                !this.suppressDebugView) {
                                await this.paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */);
                            }
                            if (this.configurationService.getValue('debug')
                                .focusWindowOnBreak &&
                                !this.workbenchEnvironmentService.extensionTestsLocationURI) {
                                const activeWindow = getActiveWindow();
                                if (!activeWindow.document.hasFocus()) {
                                    await this.hostService.focus(mainWindow, {
                                        force: true /* Application may not be active */,
                                    });
                                }
                            }
                        }
                    }
                };
                await promises.topCallStack;
                if (!event.hitBreakpointIds) {
                    // if hitBreakpointIds are present, this is handled earlier on
                    this._waitToResume = this.enableDependentBreakpoints(thread);
                }
                if (token.isCancellationRequested) {
                    return;
                }
                focus();
                await promises.wholeCallStack;
                if (token.isCancellationRequested) {
                    return;
                }
                const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
                if (!focusedStackFrame || isFrameDeemphasized(focusedStackFrame)) {
                    // The top stack frame can be deemphesized so try to focus again #68616
                    focus();
                }
            }
            this._onDidChangeState.fire();
        });
    }
    async enableDependentBreakpoints(hitBreakpointIdsOrThread) {
        let breakpoints;
        if (Array.isArray(hitBreakpointIdsOrThread)) {
            breakpoints = this.model
                .getBreakpoints()
                .filter((bp) => hitBreakpointIdsOrThread.includes(bp.getIdFromAdapter(this.id)));
        }
        else {
            const frame = hitBreakpointIdsOrThread.getTopStackFrame();
            if (frame === undefined) {
                return;
            }
            if (hitBreakpointIdsOrThread.stoppedDetails &&
                hitBreakpointIdsOrThread.stoppedDetails.reason !== 'breakpoint') {
                return;
            }
            breakpoints = this.getBreakpointsAtPosition(frame.source.uri, frame.range.startLineNumber, frame.range.endLineNumber, frame.range.startColumn, frame.range.endColumn);
        }
        // find the current breakpoints
        // check if the current breakpoints are dependencies, and if so collect and send the dependents to DA
        const urisToResend = new Set();
        this.model.getBreakpoints({ triggeredOnly: true, enabledOnly: true }).forEach((bp) => {
            breakpoints.forEach((cbp) => {
                if (bp.enabled && bp.triggeredBy === cbp.getId()) {
                    bp.setSessionDidTrigger(this.getId());
                    urisToResend.add(bp.uri.toString());
                }
            });
        });
        const results = [];
        urisToResend.forEach((uri) => results.push(this.debugService.sendBreakpoints(URI.parse(uri), undefined, this)));
        return Promise.all(results);
    }
    getBreakpointsAtPosition(uri, startLineNumber, endLineNumber, startColumn, endColumn) {
        return this.model.getBreakpoints({ uri: uri }).filter((bp) => {
            if (bp.lineNumber < startLineNumber || bp.lineNumber > endLineNumber) {
                return false;
            }
            if (bp.column && (bp.column < startColumn || bp.column > endColumn)) {
                return false;
            }
            return true;
        });
    }
    onDidExitAdapter(event) {
        this.initialized = true;
        this.model.setBreakpointSessionData(this.getId(), this.capabilities, undefined);
        this.shutdown();
        this._onDidEndAdapter.fire(event);
    }
    // Disconnects and clears state. Session can be initialized again for a new connection.
    shutdown() {
        this.rawListeners.clear();
        if (this.raw) {
            // Send out disconnect and immediatly dispose (do not wait for response) #127418
            this.raw.disconnect({});
            this.raw.dispose();
            this.raw = undefined;
        }
        this.fetchThreadsScheduler?.dispose();
        this.fetchThreadsScheduler = undefined;
        this.passFocusScheduler.cancel();
        this.passFocusScheduler.dispose();
        this.model.clearThreads(this.getId(), true);
        this._onDidChangeState.fire();
    }
    dispose() {
        this.cancelAllRequests();
        this.rawListeners.dispose();
        this.globalDisposables.dispose();
    }
    //---- sources
    getSourceForUri(uri) {
        return this.sources.get(this.uriIdentityService.asCanonicalUri(uri).toString());
    }
    getSource(raw) {
        let source = new Source(raw, this.getId(), this.uriIdentityService, this.logService);
        const uriKey = source.uri.toString();
        const found = this.sources.get(uriKey);
        if (found) {
            source = found;
            // merge attributes of new into existing
            source.raw = mixin(source.raw, raw);
            if (source.raw && raw) {
                // Always take the latest presentation hint from adapter #42139
                source.raw.presentationHint = raw.presentationHint;
            }
        }
        else {
            this.sources.set(uriKey, source);
        }
        return source;
    }
    getRawSource(uri) {
        const source = this.getSourceForUri(uri);
        if (source) {
            return source.raw;
        }
        else {
            const data = Source.getEncodedDebugData(uri);
            return { name: data.name, path: data.path, sourceReference: data.sourceReference };
        }
    }
    getNewCancellationToken(threadId, token) {
        const tokenSource = new CancellationTokenSource(token);
        const tokens = this.cancellationMap.get(threadId) || [];
        tokens.push(tokenSource);
        this.cancellationMap.set(threadId, tokens);
        return tokenSource.token;
    }
    cancelAllRequests() {
        this.cancellationMap.forEach((tokens) => tokens.forEach((t) => t.dispose(true)));
        this.cancellationMap.clear();
    }
    // REPL
    getReplElements() {
        return this.repl.getReplElements();
    }
    hasSeparateRepl() {
        return !this.parentSession || this._options.repl !== 'mergeWithParent';
    }
    removeReplExpressions() {
        this.repl.removeReplExpressions();
    }
    async addReplExpression(stackFrame, expression) {
        await this.repl.addReplExpression(this, stackFrame, expression);
        // Evaluate all watch expressions and fetch variables again since repl evaluation might have changed some.
        this.debugService.getViewModel().updateViews();
    }
    appendToRepl(data, isImportant) {
        this.repl.appendToRepl(this, data);
        if (isImportant) {
            this.notificationService.notify({
                message: data.output.toString(),
                severity: data.sev,
                source: this.name,
            });
        }
    }
};
DebugSession = __decorate([
    __param(5, IDebugService),
    __param(6, ITelemetryService),
    __param(7, IHostService),
    __param(8, IConfigurationService),
    __param(9, IPaneCompositePartService),
    __param(10, IWorkspaceContextService),
    __param(11, IProductService),
    __param(12, INotificationService),
    __param(13, ILifecycleService),
    __param(14, IUriIdentityService),
    __param(15, IInstantiationService),
    __param(16, ICustomEndpointTelemetryService),
    __param(17, IWorkbenchEnvironmentService),
    __param(18, ILogService),
    __param(19, ITestService),
    __param(20, ITestResultService),
    __param(21, IAccessibilityService)
], DebugSession);
export { DebugSession };
/**
 * Keeps track of events for threads, and cancels any previous operations for
 * a thread when the thread goes into a new state. Currently, the operations a thread has are:
 *
 * - started
 * - stopped
 * - continue
 * - exited
 *
 * In each case, the new state preempts the old state, so we don't need to
 * queue work, just cancel old work. It's up to the caller to make sure that
 * no UI effects happen at the point when the `token` is cancelled.
 */
export class ThreadStatusScheduler extends Disposable {
    constructor() {
        super(...arguments);
        /**
         * An array of set of thread IDs. When a 'stopped' event is encountered, the
         * editor refreshes its thread IDs. In the meantime, the thread may change
         * state it again. So the editor puts a Set into this array when it starts
         * the refresh, and checks it after the refresh is finished, to see if
         * any of the threads it looked up should now be invalidated.
         */
        this.pendingCancellations = [];
        /**
         * Cancellation tokens for currently-running operations on threads.
         */
        this.threadOps = this._register(new DisposableMap());
    }
    /**
     * Runs the operation.
     * If thread is undefined it affects all threads.
     */
    async run(threadIdsP, operation) {
        const cancelledWhileLookingUpThreads = new Set();
        this.pendingCancellations.push(cancelledWhileLookingUpThreads);
        const threadIds = await threadIdsP;
        // Now that we got our threads,
        // 1. Remove our pending set, and
        // 2. Cancel any slower callers who might also have found this thread
        for (let i = 0; i < this.pendingCancellations.length; i++) {
            const s = this.pendingCancellations[i];
            if (s === cancelledWhileLookingUpThreads) {
                this.pendingCancellations.splice(i, 1);
                break;
            }
            else {
                for (const threadId of threadIds) {
                    s.add(threadId);
                }
            }
        }
        if (cancelledWhileLookingUpThreads.has(undefined)) {
            return;
        }
        await Promise.all(threadIds.map((threadId) => {
            if (cancelledWhileLookingUpThreads.has(threadId)) {
                return;
            }
            this.threadOps.get(threadId)?.cancel();
            const cts = new CancellationTokenSource();
            this.threadOps.set(threadId, cts);
            return operation(threadId, cts.token);
        }));
    }
    /**
     * Cancels all ongoing state operations on the given threads.
     * If threads is undefined it cancel all threads.
     */
    cancel(threadIds) {
        if (!threadIds) {
            for (const [_, op] of this.threadOps) {
                op.cancel();
            }
            this.threadOps.clearAndDisposeAll();
            for (const s of this.pendingCancellations) {
                s.add(undefined);
            }
        }
        else {
            for (const threadId of threadIds) {
                this.threadOps.get(threadId)?.cancel();
                this.threadOps.deleteAndDispose(threadId);
                for (const s of this.pendingCancellations) {
                    s.add(threadId);
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXNzaW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1Nlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sVUFBVSxFQUNWLGFBQWEsRUFDYixlQUFlLEVBRWYsaUJBQWlCLEVBQ2pCLE9BQU8sR0FDUCxNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7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
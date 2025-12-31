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
import { Emitter } from '../../../../base/common/event.js';
import * as objects from '../../../../base/common/objects.js';
import { toAction } from '../../../../base/common/actions.js';
import * as errors from '../../../../base/common/errors.js';
import { createErrorWithActions } from '../../../../base/common/errorMessage.js';
import { formatPII, isUri } from '../common/debugUtils.js';
import { IExtensionHostDebugService, } from '../../../../platform/debug/common/extensionHostDebug.js';
import { URI } from '../../../../base/common/uri.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { Schemas } from '../../../../base/common/network.js';
/**
 * Encapsulates the DebugAdapter lifecycle and some idiosyncrasies of the Debug Adapter Protocol.
 */
let RawDebugSession = class RawDebugSession {
    constructor(debugAdapter, dbgr, sessionId, name, extensionHostDebugService, openerService, notificationService, dialogSerivce) {
        this.dbgr = dbgr;
        this.sessionId = sessionId;
        this.name = name;
        this.extensionHostDebugService = extensionHostDebugService;
        this.openerService = openerService;
        this.notificationService = notificationService;
        this.dialogSerivce = dialogSerivce;
        this.allThreadsContinued = true;
        this._readyForBreakpoints = false;
        // shutdown
        this.debugAdapterStopped = false;
        this.inShutdown = false;
        this.terminated = false;
        this.firedAdapterExitEvent = false;
        // telemetry
        this.startTime = 0;
        this.didReceiveStoppedEvent = false;
        // DAP events
        this._onDidInitialize = new Emitter();
        this._onDidStop = new Emitter();
        this._onDidContinued = new Emitter();
        this._onDidTerminateDebugee = new Emitter();
        this._onDidExitDebugee = new Emitter();
        this._onDidThread = new Emitter();
        this._onDidOutput = new Emitter();
        this._onDidBreakpoint = new Emitter();
        this._onDidLoadedSource = new Emitter();
        this._onDidProgressStart = new Emitter();
        this._onDidProgressUpdate = new Emitter();
        this._onDidProgressEnd = new Emitter();
        this._onDidInvalidated = new Emitter();
        this._onDidInvalidateMemory = new Emitter();
        this._onDidCustomEvent = new Emitter();
        this._onDidEvent = new Emitter();
        // DA events
        this._onDidExitAdapter = new Emitter();
        this.stoppedSinceLastStep = false;
        this.toDispose = [];
        this.debugAdapter = debugAdapter;
        this._capabilities = Object.create(null);
        this.toDispose.push(this.debugAdapter.onError((err) => {
            this.shutdown(err);
        }));
        this.toDispose.push(this.debugAdapter.onExit((code) => {
            if (code !== 0) {
                this.shutdown(new Error(`exit code: ${code}`));
            }
            else {
                // normal exit
                this.shutdown();
            }
        }));
        this.debugAdapter.onEvent((event) => {
            switch (event.event) {
                case 'initialized':
                    this._readyForBreakpoints = true;
                    this._onDidInitialize.fire(event);
                    break;
                case 'loadedSource':
                    this._onDidLoadedSource.fire(event);
                    break;
                case 'capabilities':
                    if (event.body) {
                        const capabilities = event.body.capabilities;
                        this.mergeCapabilities(capabilities);
                    }
                    break;
                case 'stopped':
                    this.didReceiveStoppedEvent = true; // telemetry: remember that debugger stopped successfully
                    this.stoppedSinceLastStep = true;
                    this._onDidStop.fire(event);
                    break;
                case 'continued':
                    this.allThreadsContinued =
                        event.body.allThreadsContinued === false ? false : true;
                    this._onDidContinued.fire(event);
                    break;
                case 'thread':
                    this._onDidThread.fire(event);
                    break;
                case 'output':
                    this._onDidOutput.fire(event);
                    break;
                case 'breakpoint':
                    this._onDidBreakpoint.fire(event);
                    break;
                case 'terminated':
                    this._onDidTerminateDebugee.fire(event);
                    break;
                case 'exited':
                    this._onDidExitDebugee.fire(event);
                    break;
                case 'progressStart':
                    this._onDidProgressStart.fire(event);
                    break;
                case 'progressUpdate':
                    this._onDidProgressUpdate.fire(event);
                    break;
                case 'progressEnd':
                    this._onDidProgressEnd.fire(event);
                    break;
                case 'invalidated':
                    this._onDidInvalidated.fire(event);
                    break;
                case 'memory':
                    this._onDidInvalidateMemory.fire(event);
                    break;
                case 'process':
                    break;
                case 'module':
                    break;
                default:
                    this._onDidCustomEvent.fire(event);
                    break;
            }
            this._onDidEvent.fire(event);
        });
        this.debugAdapter.onRequest((request) => this.dispatchRequest(request));
    }
    get isInShutdown() {
        return this.inShutdown;
    }
    get onDidExitAdapter() {
        return this._onDidExitAdapter.event;
    }
    get capabilities() {
        return this._capabilities;
    }
    /**
     * DA is ready to accepts setBreakpoint requests.
     * Becomes true after "initialized" events has been received.
     */
    get readyForBreakpoints() {
        return this._readyForBreakpoints;
    }
    //---- DAP events
    get onDidInitialize() {
        return this._onDidInitialize.event;
    }
    get onDidStop() {
        return this._onDidStop.event;
    }
    get onDidContinued() {
        return this._onDidContinued.event;
    }
    get onDidTerminateDebugee() {
        return this._onDidTerminateDebugee.event;
    }
    get onDidExitDebugee() {
        return this._onDidExitDebugee.event;
    }
    get onDidThread() {
        return this._onDidThread.event;
    }
    get onDidOutput() {
        return this._onDidOutput.event;
    }
    get onDidBreakpoint() {
        return this._onDidBreakpoint.event;
    }
    get onDidLoadedSource() {
        return this._onDidLoadedSource.event;
    }
    get onDidCustomEvent() {
        return this._onDidCustomEvent.event;
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
    get onDidInvalidated() {
        return this._onDidInvalidated.event;
    }
    get onDidInvalidateMemory() {
        return this._onDidInvalidateMemory.event;
    }
    get onDidEvent() {
        return this._onDidEvent.event;
    }
    //---- DebugAdapter lifecycle
    /**
     * Starts the underlying debug adapter and tracks the session time for telemetry.
     */
    async start() {
        if (!this.debugAdapter) {
            return Promise.reject(new Error(nls.localize('noDebugAdapterStart', 'No debug adapter, can not start debug session.')));
        }
        await this.debugAdapter.startSession();
        this.startTime = new Date().getTime();
    }
    /**
     * Send client capabilities to the debug adapter and receive DA capabilities in return.
     */
    async initialize(args) {
        const response = await this.send('initialize', args, undefined, undefined, false);
        if (response) {
            this.mergeCapabilities(response.body);
        }
        return response;
    }
    /**
     * Terminate the debuggee and shutdown the adapter
     */
    disconnect(args) {
        const terminateDebuggee = this.capabilities.supportTerminateDebuggee
            ? args.terminateDebuggee
            : undefined;
        const suspendDebuggee = this.capabilities.supportTerminateDebuggee && this.capabilities.supportSuspendDebuggee
            ? args.suspendDebuggee
            : undefined;
        return this.shutdown(undefined, args.restart, terminateDebuggee, suspendDebuggee);
    }
    //---- DAP requests
    async launchOrAttach(config) {
        const response = await this.send(config.request, config, undefined, undefined, false);
        if (response) {
            this.mergeCapabilities(response.body);
        }
        return response;
    }
    /**
     * Try killing the debuggee softly...
     */
    terminate(restart = false) {
        if (this.capabilities.supportsTerminateRequest) {
            if (!this.terminated) {
                this.terminated = true;
                return this.send('terminate', { restart }, undefined);
            }
            return this.disconnect({ terminateDebuggee: true, restart });
        }
        return Promise.reject(new Error('terminated not supported'));
    }
    restart(args) {
        if (this.capabilities.supportsRestartRequest) {
            return this.send('restart', args);
        }
        return Promise.reject(new Error('restart not supported'));
    }
    async next(args) {
        this.stoppedSinceLastStep = false;
        const response = await this.send('next', args);
        if (!this.stoppedSinceLastStep) {
            this.fireSimulatedContinuedEvent(args.threadId);
        }
        return response;
    }
    async stepIn(args) {
        this.stoppedSinceLastStep = false;
        const response = await this.send('stepIn', args);
        if (!this.stoppedSinceLastStep) {
            this.fireSimulatedContinuedEvent(args.threadId);
        }
        return response;
    }
    async stepOut(args) {
        this.stoppedSinceLastStep = false;
        const response = await this.send('stepOut', args);
        if (!this.stoppedSinceLastStep) {
            this.fireSimulatedContinuedEvent(args.threadId);
        }
        return response;
    }
    async continue(args) {
        this.stoppedSinceLastStep = false;
        const response = await this.send('continue', args);
        if (response && response.body && response.body.allThreadsContinued !== undefined) {
            this.allThreadsContinued = response.body.allThreadsContinued;
        }
        if (!this.stoppedSinceLastStep) {
            this.fireSimulatedContinuedEvent(args.threadId, this.allThreadsContinued);
        }
        return response;
    }
    pause(args) {
        return this.send('pause', args);
    }
    terminateThreads(args) {
        if (this.capabilities.supportsTerminateThreadsRequest) {
            return this.send('terminateThreads', args);
        }
        return Promise.reject(new Error('terminateThreads not supported'));
    }
    setVariable(args) {
        if (this.capabilities.supportsSetVariable) {
            return this.send('setVariable', args);
        }
        return Promise.reject(new Error('setVariable not supported'));
    }
    setExpression(args) {
        if (this.capabilities.supportsSetExpression) {
            return this.send('setExpression', args);
        }
        return Promise.reject(new Error('setExpression not supported'));
    }
    async restartFrame(args, threadId) {
        if (this.capabilities.supportsRestartFrame) {
            this.stoppedSinceLastStep = false;
            const response = await this.send('restartFrame', args);
            if (!this.stoppedSinceLastStep) {
                this.fireSimulatedContinuedEvent(threadId);
            }
            return response;
        }
        return Promise.reject(new Error('restartFrame not supported'));
    }
    stepInTargets(args) {
        if (this.capabilities.supportsStepInTargetsRequest) {
            return this.send('stepInTargets', args);
        }
        return Promise.reject(new Error('stepInTargets not supported'));
    }
    completions(args, token) {
        if (this.capabilities.supportsCompletionsRequest) {
            return this.send('completions', args, token);
        }
        return Promise.reject(new Error('completions not supported'));
    }
    setBreakpoints(args) {
        return this.send('setBreakpoints', args);
    }
    setFunctionBreakpoints(args) {
        if (this.capabilities.supportsFunctionBreakpoints) {
            return this.send('setFunctionBreakpoints', args);
        }
        return Promise.reject(new Error('setFunctionBreakpoints not supported'));
    }
    dataBreakpointInfo(args) {
        if (this.capabilities.supportsDataBreakpoints) {
            return this.send('dataBreakpointInfo', args);
        }
        return Promise.reject(new Error('dataBreakpointInfo not supported'));
    }
    setDataBreakpoints(args) {
        if (this.capabilities.supportsDataBreakpoints) {
            return this.send('setDataBreakpoints', args);
        }
        return Promise.reject(new Error('setDataBreakpoints not supported'));
    }
    setExceptionBreakpoints(args) {
        return this.send('setExceptionBreakpoints', args);
    }
    breakpointLocations(args) {
        if (this.capabilities.supportsBreakpointLocationsRequest) {
            return this.send('breakpointLocations', args);
        }
        return Promise.reject(new Error('breakpointLocations is not supported'));
    }
    configurationDone() {
        if (this.capabilities.supportsConfigurationDoneRequest) {
            return this.send('configurationDone', null);
        }
        return Promise.reject(new Error('configurationDone not supported'));
    }
    stackTrace(args, token) {
        return this.send('stackTrace', args, token);
    }
    exceptionInfo(args) {
        if (this.capabilities.supportsExceptionInfoRequest) {
            return this.send('exceptionInfo', args);
        }
        return Promise.reject(new Error('exceptionInfo not supported'));
    }
    scopes(args, token) {
        return this.send('scopes', args, token);
    }
    variables(args, token) {
        return this.send('variables', args, token);
    }
    source(args) {
        return this.send('source', args);
    }
    locations(args) {
        return this.send('locations', args);
    }
    loadedSources(args) {
        if (this.capabilities.supportsLoadedSourcesRequest) {
            return this.send('loadedSources', args);
        }
        return Promise.reject(new Error('loadedSources not supported'));
    }
    threads() {
        return this.send('threads', null);
    }
    evaluate(args) {
        return this.send('evaluate', args);
    }
    async stepBack(args) {
        if (this.capabilities.supportsStepBack) {
            this.stoppedSinceLastStep = false;
            const response = await this.send('stepBack', args);
            if (!this.stoppedSinceLastStep) {
                this.fireSimulatedContinuedEvent(args.threadId);
            }
            return response;
        }
        return Promise.reject(new Error('stepBack not supported'));
    }
    async reverseContinue(args) {
        if (this.capabilities.supportsStepBack) {
            this.stoppedSinceLastStep = false;
            const response = await this.send('reverseContinue', args);
            if (!this.stoppedSinceLastStep) {
                this.fireSimulatedContinuedEvent(args.threadId);
            }
            return response;
        }
        return Promise.reject(new Error('reverseContinue not supported'));
    }
    gotoTargets(args) {
        if (this.capabilities.supportsGotoTargetsRequest) {
            return this.send('gotoTargets', args);
        }
        return Promise.reject(new Error('gotoTargets is not supported'));
    }
    async goto(args) {
        if (this.capabilities.supportsGotoTargetsRequest) {
            this.stoppedSinceLastStep = false;
            const response = await this.send('goto', args);
            if (!this.stoppedSinceLastStep) {
                this.fireSimulatedContinuedEvent(args.threadId);
            }
            return response;
        }
        return Promise.reject(new Error('goto is not supported'));
    }
    async setInstructionBreakpoints(args) {
        if (this.capabilities.supportsInstructionBreakpoints) {
            return await this.send('setInstructionBreakpoints', args);
        }
        return Promise.reject(new Error('setInstructionBreakpoints is not supported'));
    }
    async disassemble(args) {
        if (this.capabilities.supportsDisassembleRequest) {
            return await this.send('disassemble', args);
        }
        return Promise.reject(new Error('disassemble is not supported'));
    }
    async readMemory(args) {
        if (this.capabilities.supportsReadMemoryRequest) {
            return await this.send('readMemory', args);
        }
        return Promise.reject(new Error('readMemory is not supported'));
    }
    async writeMemory(args) {
        if (this.capabilities.supportsWriteMemoryRequest) {
            return await this.send('writeMemory', args);
        }
        return Promise.reject(new Error('writeMemory is not supported'));
    }
    cancel(args) {
        return this.send('cancel', args);
    }
    custom(request, args) {
        return this.send(request, args);
    }
    //---- private
    async shutdown(error, restart = false, terminateDebuggee = undefined, suspendDebuggee = undefined) {
        if (!this.inShutdown) {
            this.inShutdown = true;
            if (this.debugAdapter) {
                try {
                    const args = { restart };
                    if (typeof terminateDebuggee === 'boolean') {
                        args.terminateDebuggee = terminateDebuggee;
                    }
                    if (typeof suspendDebuggee === 'boolean') {
                        args.suspendDebuggee = suspendDebuggee;
                    }
                    // if there's an error, the DA is probably already gone, so give it a much shorter timeout.
                    await this.send('disconnect', args, undefined, error ? 200 : 2000);
                }
                catch (e) {
                    // Catch the potential 'disconnect' error - no need to show it to the user since the adapter is shutting down
                }
                finally {
                    await this.stopAdapter(error);
                }
            }
            else {
                return this.stopAdapter(error);
            }
        }
    }
    async stopAdapter(error) {
        try {
            if (this.debugAdapter) {
                const da = this.debugAdapter;
                this.debugAdapter = null;
                await da.stopSession();
                this.debugAdapterStopped = true;
            }
        }
        finally {
            this.fireAdapterExitEvent(error);
        }
    }
    fireAdapterExitEvent(error) {
        if (!this.firedAdapterExitEvent) {
            this.firedAdapterExitEvent = true;
            const e = {
                emittedStopped: this.didReceiveStoppedEvent,
                sessionLengthInSeconds: (new Date().getTime() - this.startTime) / 1000,
            };
            if (error && !this.debugAdapterStopped) {
                e.error = error;
            }
            this._onDidExitAdapter.fire(e);
        }
    }
    async dispatchRequest(request) {
        const response = {
            type: 'response',
            seq: 0,
            command: request.command,
            request_seq: request.seq,
            success: true,
        };
        const safeSendResponse = (response) => this.debugAdapter && this.debugAdapter.sendResponse(response);
        if (request.command === 'launchVSCode') {
            try {
                let result = await this.launchVsCode(request.arguments);
                if (!result.success) {
                    const { confirmed } = await this.dialogSerivce.confirm({
                        type: Severity.Warning,
                        message: nls.localize('canNotStart', 'The debugger needs to open a new tab or window for the debuggee but the browser prevented this. You must give permission to continue.'),
                        primaryButton: nls.localize({ key: 'continue', comment: ['&& denotes a mnemonic'] }, '&&Continue'),
                    });
                    if (confirmed) {
                        result = await this.launchVsCode(request.arguments);
                    }
                    else {
                        response.success = false;
                        safeSendResponse(response);
                        await this.shutdown();
                    }
                }
                response.body = {
                    rendererDebugPort: result.rendererDebugPort,
                };
                safeSendResponse(response);
            }
            catch (err) {
                response.success = false;
                response.message = err.message;
                safeSendResponse(response);
            }
        }
        else if (request.command === 'runInTerminal') {
            try {
                const shellProcessId = await this.dbgr.runInTerminal(request.arguments, this.sessionId);
                const resp = response;
                resp.body = {};
                if (typeof shellProcessId === 'number') {
                    resp.body.shellProcessId = shellProcessId;
                }
                safeSendResponse(resp);
            }
            catch (err) {
                response.success = false;
                response.message = err.message;
                safeSendResponse(response);
            }
        }
        else if (request.command === 'startDebugging') {
            try {
                const args = request.arguments;
                const config = {
                    ...args.configuration,
                    ...{
                        request: args.request,
                        type: this.dbgr.type,
                        name: args.configuration.name || this.name,
                    },
                };
                const success = await this.dbgr.startDebugging(config, this.sessionId);
                if (success) {
                    safeSendResponse(response);
                }
                else {
                    response.success = false;
                    response.message = 'Failed to start debugging';
                    safeSendResponse(response);
                }
            }
            catch (err) {
                response.success = false;
                response.message = err.message;
                safeSendResponse(response);
            }
        }
        else {
            response.success = false;
            response.message = `unknown request '${request.command}'`;
            safeSendResponse(response);
        }
    }
    launchVsCode(vscodeArgs) {
        const args = [];
        for (const arg of vscodeArgs.args) {
            const a2 = (arg.prefix || '') + (arg.path || '');
            const match = /^--(.+)=(.+)$/.exec(a2);
            if (match && match.length === 3) {
                const key = match[1];
                let value = match[2];
                if ((key === 'file-uri' || key === 'folder-uri') && !isUri(arg.path)) {
                    value = isUri(value) ? value : URI.file(value).toString();
                }
                args.push(`--${key}=${value}`);
            }
            else {
                args.push(a2);
            }
        }
        if (vscodeArgs.env) {
            args.push(`--extensionEnvironment=${JSON.stringify(vscodeArgs.env)}`);
        }
        return this.extensionHostDebugService.openExtensionDevelopmentHostWindow(args, !!vscodeArgs.debugRenderer);
    }
    send(command, args, token, timeout, showErrors = true) {
        return new Promise((completeDispatch, errorDispatch) => {
            if (!this.debugAdapter) {
                if (this.inShutdown) {
                    // We are in shutdown silently complete
                    completeDispatch(undefined);
                }
                else {
                    errorDispatch(new Error(nls.localize('noDebugAdapter', "No debugger available found. Can not send '{0}'.", command)));
                }
                return;
            }
            let cancelationListener;
            const requestId = this.debugAdapter.sendRequest(command, args, (response) => {
                cancelationListener?.dispose();
                if (response.success) {
                    completeDispatch(response);
                }
                else {
                    errorDispatch(response);
                }
            }, timeout);
            if (token) {
                cancelationListener = token.onCancellationRequested(() => {
                    cancelationListener.dispose();
                    if (this.capabilities.supportsCancelRequest) {
                        this.cancel({ requestId });
                    }
                });
            }
        }).then(undefined, (err) => Promise.reject(this.handleErrorResponse(err, showErrors)));
    }
    handleErrorResponse(errorResponse, showErrors) {
        if (errorResponse.command === 'canceled' && errorResponse.message === 'canceled') {
            return new errors.CancellationError();
        }
        const error = errorResponse?.body?.error;
        const errorMessage = errorResponse?.message || '';
        const userMessage = error ? formatPII(error.format, false, error.variables) : errorMessage;
        const url = error?.url;
        if (error && url) {
            const label = error.urlLabel ? error.urlLabel : nls.localize('moreInfo', 'More Info');
            const uri = URI.parse(url);
            // Use a suffixed id if uri invokes a command, so default 'Open launch.json' command is suppressed on dialog
            const actionId = uri.scheme === Schemas.command ? 'debug.moreInfo.command' : 'debug.moreInfo';
            return createErrorWithActions(userMessage, [
                toAction({
                    id: actionId,
                    label,
                    run: () => this.openerService.open(uri, { allowCommands: true }),
                }),
            ]);
        }
        if (showErrors && error && error.format && error.showUser) {
            this.notificationService.error(userMessage);
        }
        const result = new errors.ErrorNoTelemetry(userMessage);
        result.showUser = error?.showUser;
        return result;
    }
    mergeCapabilities(capabilities) {
        if (capabilities) {
            this._capabilities = objects.mixin(this._capabilities, capabilities);
        }
    }
    fireSimulatedContinuedEvent(threadId, allThreadsContinued = false) {
        this._onDidContinued.fire({
            type: 'event',
            event: 'continued',
            body: {
                threadId,
                allThreadsContinued,
            },
            seq: undefined,
        });
    }
    dispose() {
        dispose(this.toDispose);
    }
};
RawDebugSession = __decorate([
    __param(4, IExtensionHostDebugService),
    __param(5, IOpenerService),
    __param(6, INotificationService),
    __param(7, IDialogService)
], RawDebugSession);
export { RawDebugSession };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3RGVidWdTZXNzaW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9yYXdEZWJ1Z1Nlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTFELE9BQU8sRUFDTiwwQkFBMEIsR0FFMUIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUzRSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFrQjVEOztHQUVHO0FBQ0ksSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZTtJQXdDM0IsWUFDQyxZQUEyQixFQUNYLElB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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3RGVidWdTZXNzaW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL3Jhd0RlYnVnU2Vzc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFMUQsT0FBTyxFQUNOLDBCQUEwQixHQUUxQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTNFLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQWtCNUQ7O0dBRUc7QUFDSSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFlO0lBd0MzQixZQUNDLFlBQTJCLEVBQ1gsSUFBZSxFQUNkLFNBQWlCLEVBQ2pCLElBQVksRUFFN0IseUJBQXNFLEVBQ3RELGFBQThDLEVBQ3hDLG1CQUEwRCxFQUNoRSxhQUE4QztRQVA5QyxTQUFJLEdBQUosSUFBSSxDQUFXO1FBQ2QsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNqQixTQUFJLEdBQUosSUFBSSxDQUFRO1FBRVosOEJBQXlCLEdBQXpCLHlCQUF5QixDQUE0QjtRQUNyQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDdkIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUMvQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFoRHZELHdCQUFtQixHQUFHLElBQUksQ0FBQTtRQUMxQix5QkFBb0IsR0FBRyxLQUFLLENBQUE7UUFHcEMsV0FBVztRQUNILHdCQUFtQixHQUFHLEtBQUssQ0FBQTtRQUMzQixlQUFVLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLGVBQVUsR0FBRyxLQUFLLENBQUE7UUFDbEIsMEJBQXFCLEdBQUcsS0FBSyxDQUFBO1FBRXJDLFlBQVk7UUFDSixjQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2IsMkJBQXNCLEdBQUcsS0FBSyxDQUFBO1FBRXRDLGFBQWE7UUFDSSxxQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBa0MsQ0FBQTtRQUNoRSxlQUFVLEdBQUcsSUFBSSxPQUFPLEVBQThCLENBQUE7UUFDdEQsb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBZ0MsQ0FBQTtRQUM3RCwyQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBaUMsQ0FBQTtRQUNyRSxzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBNkIsQ0FBQTtRQUM1RCxpQkFBWSxHQUFHLElBQUksT0FBTyxFQUE2QixDQUFBO1FBQ3ZELGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQTZCLENBQUE7UUFDdkQscUJBQWdCLEdBQUcsSUFBSSxPQUFPLEVBQWlDLENBQUE7UUFDL0QsdUJBQWtCLEdBQUcsSUFBSSxPQUFPLEVBQW1DLENBQUE7UUFDbkUsd0JBQW1CLEdBQUcsSUFBSSxPQUFPLEVBQW9DLENBQUE7UUFDckUseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQXFDLENBQUE7UUFDdkUsc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQWtDLENBQUE7UUFDakUsc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQWtDLENBQUE7UUFDakUsMkJBQXNCLEdBQUcsSUFBSSxPQUFPLEVBQTZCLENBQUE7UUFDakUsc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQXVCLENBQUE7UUFDdEQsZ0JBQVcsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQTtRQUVqRSxZQUFZO1FBQ0ssc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQW1CLENBQUE7UUFFM0QseUJBQW9CLEdBQUcsS0FBSyxDQUFBO1FBRTVCLGNBQVMsR0FBa0IsRUFBRSxDQUFBO1FBYXBDLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV4QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDbEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNqQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ25CLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDbEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNqQyxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxjQUFjLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsY0FBYztnQkFDZCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ25DLFFBQVEsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNyQixLQUFLLGFBQWE7b0JBQ2pCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUE7b0JBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ2pDLE1BQUs7Z0JBQ04sS0FBSyxjQUFjO29CQUNsQixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFrQyxLQUFLLENBQUMsQ0FBQTtvQkFDcEUsTUFBSztnQkFDTixLQUFLLGNBQWM7b0JBQ2xCLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNoQixNQUFNLFlBQVksR0FBcUMsS0FBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUE7d0JBQy9FLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtvQkFDckMsQ0FBQztvQkFDRCxNQUFLO2dCQUNOLEtBQUssU0FBUztvQkFDYixJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFBLENBQUMseURBQXlEO29CQUM1RixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFBO29CQUNoQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBNkIsS0FBSyxDQUFDLENBQUE7b0JBQ3ZELE1BQUs7Z0JBQ04sS0FBSyxXQUFXO29CQUNmLElBQUksQ0FBQyxtQkFBbUI7d0JBQ1EsS0FBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO29CQUN4RixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBK0IsS0FBSyxDQUFDLENBQUE7b0JBQzlELE1BQUs7Z0JBQ04sS0FBSyxRQUFRO29CQUNaLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUE0QixLQUFLLENBQUMsQ0FBQTtvQkFDeEQsTUFBSztnQkFDTixLQUFLLFFBQVE7b0JBQ1osSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQTRCLEtBQUssQ0FBQyxDQUFBO29CQUN4RCxNQUFLO2dCQUNOLEtBQUssWUFBWTtvQkFDaEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBZ0MsS0FBSyxDQUFDLENBQUE7b0JBQ2hFLE1BQUs7Z0JBQ04sS0FBSyxZQUFZO29CQUNoQixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFnQyxLQUFLLENBQUMsQ0FBQTtvQkFDdEUsTUFBSztnQkFDTixLQUFLLFFBQVE7b0JBQ1osSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBNEIsS0FBSyxDQUFDLENBQUE7b0JBQzdELE1BQUs7Z0JBQ04sS0FBSyxlQUFlO29CQUNuQixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEtBQXlDLENBQUMsQ0FBQTtvQkFDeEUsTUFBSztnQkFDTixLQUFLLGdCQUFnQjtvQkFDcEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxLQUEwQyxDQUFDLENBQUE7b0JBQzFFLE1BQUs7Z0JBQ04sS0FBSyxhQUFhO29CQUNqQixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQXVDLENBQUMsQ0FBQTtvQkFDcEUsTUFBSztnQkFDTixLQUFLLGFBQWE7b0JBQ2pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBdUMsQ0FBQyxDQUFBO29CQUNwRSxNQUFLO2dCQUNOLEtBQUssUUFBUTtvQkFDWixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEtBQWtDLENBQUMsQ0FBQTtvQkFDcEUsTUFBSztnQkFDTixLQUFLLFNBQVM7b0JBQ2IsTUFBSztnQkFDTixLQUFLLFFBQVE7b0JBQ1osTUFBSztnQkFDTjtvQkFDQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUNsQyxNQUFLO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7SUFDcEMsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBSSxtQkFBbUI7UUFDdEIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUE7SUFDakMsQ0FBQztJQUVELGlCQUFpQjtJQUVqQixJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFBO0lBQzdCLENBQUM7SUFFRCxJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxxQkFBcUI7UUFDeEIsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO0lBQ3pDLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7SUFDcEMsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7SUFDL0IsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7SUFDL0IsQ0FBQztJQUVELElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7SUFDbkMsQ0FBQztJQUVELElBQUksaUJBQWlCO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtJQUNyQyxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7SUFDdEMsQ0FBQztJQUVELElBQUksbUJBQW1CO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtJQUN2QyxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7SUFDcEMsQ0FBQztJQUVELElBQUkscUJBQXFCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQTtJQUN6QyxDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQTtJQUM5QixDQUFDO0lBRUQsNkJBQTZCO0lBRTdCOztPQUVHO0lBQ0gsS0FBSyxDQUFDLEtBQUs7UUFDVixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FDcEIsSUFBSSxLQUFLLENBQ1IsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxnREFBZ0QsQ0FBQyxDQUNyRixDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsVUFBVSxDQUNmLElBQThDO1FBRTlDLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakYsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEMsQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFRDs7T0FFRztJQUNILFVBQVUsQ0FBQyxJQUF1QztRQUNqRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsd0JBQXdCO1lBQ25FLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCO1lBQ3hCLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDWixNQUFNLGVBQWUsR0FDcEIsSUFBSSxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLHNCQUFzQjtZQUNyRixDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWU7WUFDdEIsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUNiLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUNsRixDQUFDO0lBRUQsbUJBQW1CO0lBRW5CLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBZTtRQUNuQyxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyRixJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxDQUFDLE9BQU8sR0FBRyxLQUFLO1FBQ3hCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBO2dCQUN0QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDdEQsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxPQUFPLENBQ04sSUFBb0M7UUFFcEMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDOUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsQyxDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFpQztRQUMzQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFBO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDaEQsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUNYLElBQW1DO1FBRW5DLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUE7UUFDakMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNoRCxDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQ1osSUFBb0M7UUFFcEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQTtRQUNqQyxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hELENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FDYixJQUFxQztRQUVyQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFBO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBaUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2xGLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNsRixJQUFJLENBQUMsbUJBQW1CLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQTtRQUM3RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQzFFLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQWtDO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVELGdCQUFnQixDQUNmLElBQTZDO1FBRTdDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQywrQkFBK0IsRUFBRSxDQUFDO1lBQ3ZELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzQyxDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsV0FBVyxDQUNWLElBQXdDO1FBRXhDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBb0MsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3pFLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFRCxhQUFhLENBQ1osSUFBMEM7UUFFMUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDN0MsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFzQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0UsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQ2pCLElBQXlDLEVBQ3pDLFFBQWdCO1FBRWhCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUE7WUFDakMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0RCxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUMzQyxDQUFDO1lBQ0QsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVELGFBQWEsQ0FDWixJQUEwQztRQUUxQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUNwRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFBO0lBQ2hFLENBQUM7SUFFRCxXQUFXLENBQ1YsSUFBd0MsRUFDeEMsS0FBd0I7UUFFeEIsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFDbEQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFvQyxhQUFhLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hGLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFRCxjQUFjLENBQ2IsSUFBMkM7UUFFM0MsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUF1QyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsc0JBQXNCLENBQ3JCLElBQW1EO1FBRW5ELElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1lBQ25ELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBK0Msd0JBQXdCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0YsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVELGtCQUFrQixDQUNqQixJQUErQztRQUUvQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUMvQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQTJDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZGLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFRCxrQkFBa0IsQ0FDakIsSUFBK0M7UUFFL0MsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDL0MsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUEyQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBRUQsdUJBQXVCLENBQ3RCLElBQW9EO1FBRXBELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBZ0QseUJBQXlCLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDakcsQ0FBQztJQUVELG1CQUFtQixDQUNsQixJQUFnRDtRQUVoRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsa0NBQWtDLEVBQUUsQ0FBQztZQUMxRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztZQUN4RCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVELFVBQVUsQ0FDVCxJQUF1QyxFQUN2QyxLQUF3QjtRQUV4QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQW1DLFlBQVksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDOUUsQ0FBQztJQUVELGFBQWEsQ0FDWixJQUEwQztRQUUxQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUNwRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQXNDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RSxDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBRUQsTUFBTSxDQUNMLElBQW1DLEVBQ25DLEtBQXdCO1FBRXhCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBK0IsUUFBUSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRUQsU0FBUyxDQUNSLElBQXNDLEVBQ3RDLEtBQXlCO1FBRXpCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBa0MsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQW1DO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBK0IsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQy9ELENBQUM7SUFFRCxTQUFTLENBQ1IsSUFBc0M7UUFFdEMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFrQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUVELGFBQWEsQ0FDWixJQUEwQztRQUUxQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUNwRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQXNDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RSxDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBZ0MsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFRCxRQUFRLENBQ1AsSUFBcUM7UUFFckMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFpQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRLENBQ2IsSUFBcUM7UUFFckMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQTtZQUNqQyxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNoRCxDQUFDO1lBQ0QsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQ3BCLElBQTRDO1FBRTVDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUE7WUFDakMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNoRCxDQUFDO1lBQ0QsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUE7SUFDbEUsQ0FBQztJQUVELFdBQVcsQ0FDVixJQUF3QztRQUV4QyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUNsRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQWlDO1FBQzNDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUE7WUFDakMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM5QyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDaEQsQ0FBQztZQUNELE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFRCxLQUFLLENBQUMseUJBQXlCLENBQzlCLElBQXNEO1FBRXRELElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO1lBQ3RELE9BQU8sTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFELENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUNoQixJQUF3QztRQUV4QyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUNsRCxPQUFPLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQ2YsSUFBdUM7UUFFdkMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDakQsT0FBTyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFBO0lBQ2hFLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUNoQixJQUF3QztRQUV4QyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUNsRCxPQUFPLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFtQztRQUN6QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxNQUFNLENBQUMsT0FBZSxFQUFFLElBQVM7UUFDaEMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsY0FBYztJQUVOLEtBQUssQ0FBQyxRQUFRLENBQ3JCLEtBQWEsRUFDYixPQUFPLEdBQUcsS0FBSyxFQUNmLG9CQUF5QyxTQUFTLEVBQ2xELGtCQUF1QyxTQUFTO1FBRWhELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7WUFDdEIsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQztvQkFDSixNQUFNLElBQUksR0FBc0MsRUFBRSxPQUFPLEVBQUUsQ0FBQTtvQkFDM0QsSUFBSSxPQUFPLGlCQUFpQixLQUFLLFNBQVMsRUFBRSxDQUFDO3dCQUM1QyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUE7b0JBQzNDLENBQUM7b0JBRUQsSUFBSSxPQUFPLGVBQWUsS0FBSyxTQUFTLEVBQUUsQ0FBQzt3QkFDMUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7b0JBQ3ZDLENBQUM7b0JBRUQsMkZBQTJGO29CQUMzRixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNuRSxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1osNkdBQTZHO2dCQUM5RyxDQUFDO3dCQUFTLENBQUM7b0JBQ1YsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUM5QixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQWE7UUFDdEMsSUFBSSxDQUFDO1lBQ0osSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUE7Z0JBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO2dCQUN4QixNQUFNLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtnQkFDdEIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQTtZQUNoQyxDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRU8sb0JBQW9CLENBQUMsS0FBYTtRQUN6QyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQTtZQUVqQyxNQUFNLENBQUMsR0FBb0I7Z0JBQzFCLGNBQWMsRUFBRSxJQUFJLENBQUMsc0JBQXNCO2dCQUMzQyxzQkFBc0IsRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUk7YUFDdEUsQ0FBQTtZQUNELElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQ3hDLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1lBQ2hCLENBQUM7WUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGVBQWUsQ0FBQyxPQUE4QjtRQUMzRCxNQUFNLFFBQVEsR0FBMkI7WUFDeEMsSUFBSSxFQUFFLFVBQVU7WUFDaEIsR0FBRyxFQUFFLENBQUM7WUFDTixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDeEIsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHO1lBQ3hCLE9BQU8sRUFBRSxJQUFJO1NBQ2IsQ0FBQTtRQUVELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxRQUFnQyxFQUFFLEVBQUUsQ0FDN0QsSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU5RCxJQUFJLE9BQU8sQ0FBQyxPQUFPLEtBQUssY0FBYyxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDO2dCQUNKLElBQUksTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBeUIsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUMvRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNyQixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQzt3QkFDdEQsSUFBSSxFQUFFLFFBQVEsQ0FBQyxPQUFPO3dCQUN0QixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDcEIsYUFBYSxFQUNiLHVJQUF1SSxDQUN2STt3QkFDRCxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDMUIsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDdkQsWUFBWSxDQUNaO3FCQUNELENBQUMsQ0FBQTtvQkFDRixJQUFJLFNBQVMsRUFBRSxDQUFDO3dCQUNmLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQXlCLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDNUUsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLFFBQVEsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO3dCQUN4QixnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTt3QkFDMUIsTUFBTSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7b0JBQ3RCLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxRQUFRLENBQUMsSUFBSSxHQUFHO29CQUNmLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7aUJBQzNDLENBQUE7Z0JBQ0QsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDM0IsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QsUUFBUSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7Z0JBQ3hCLFFBQVEsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQTtnQkFDOUIsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDM0IsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEtBQUssZUFBZSxFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDO2dCQUNKLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQ25ELE9BQU8sQ0FBQyxTQUF3RCxFQUNoRSxJQUFJLENBQUMsU0FBUyxDQUNkLENBQUE7Z0JBQ0QsTUFBTSxJQUFJLEdBQUcsUUFBK0MsQ0FBQTtnQkFDNUQsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUE7Z0JBQ2QsSUFBSSxPQUFPLGNBQWMsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFBO2dCQUMxQyxDQUFDO2dCQUNELGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3ZCLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLFFBQVEsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO2dCQUN4QixRQUFRLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUE7Z0JBQzlCLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzNCLENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxLQUFLLGdCQUFnQixFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDO2dCQUNKLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxTQUF5RCxDQUFBO2dCQUM5RSxNQUFNLE1BQU0sR0FBWTtvQkFDdkIsR0FBRyxJQUFJLENBQUMsYUFBYTtvQkFDckIsR0FBRzt3QkFDRixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87d0JBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7d0JBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSTtxQkFDMUM7aUJBQ0QsQ0FBQTtnQkFDRCxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ3RFLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzNCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxRQUFRLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtvQkFDeEIsUUFBUSxDQUFDLE9BQU8sR0FBRywyQkFBMkIsQ0FBQTtvQkFDOUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzNCLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxRQUFRLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtnQkFDeEIsUUFBUSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFBO2dCQUM5QixnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxRQUFRLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtZQUN4QixRQUFRLENBQUMsT0FBTyxHQUFHLG9CQUFvQixPQUFPLENBQUMsT0FBTyxHQUFHLENBQUE7WUFDekQsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFTyxZQUFZLENBQUMsVUFBa0M7UUFDdEQsTUFBTSxJQUFJLEdBQWEsRUFBRSxDQUFBO1FBRXpCLEtBQUssTUFBTSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25DLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUE7WUFDaEQsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN0QyxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3BCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFFcEIsSUFBSSxDQUFDLEdBQUcsS0FBSyxVQUFVLElBQUksR0FBRyxLQUFLLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN0RSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQzFELENBQUM7Z0JBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQy9CLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDdEUsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLGtDQUFrQyxDQUN2RSxJQUFJLEVBQ0osQ0FBQyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQzFCLENBQUE7SUFDRixDQUFDO0lBRU8sSUFBSSxDQUNYLE9BQWUsRUFDZixJQUFTLEVBQ1QsS0FBeUIsRUFDekIsT0FBZ0IsRUFDaEIsVUFBVSxHQUFHLElBQUk7UUFFakIsT0FBTyxJQUFJLE9BQU8sQ0FBcUMsQ0FBQyxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsRUFBRTtZQUMxRixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN4QixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDckIsdUNBQXVDO29CQUN2QyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDNUIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGFBQWEsQ0FDWixJQUFJLEtBQUssQ0FDUixHQUFHLENBQUMsUUFBUSxDQUNYLGdCQUFnQixFQUNoQixrREFBa0QsRUFDbEQsT0FBTyxDQUNQLENBQ0QsQ0FDRCxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLG1CQUFnQyxDQUFBO1lBQ3BDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUM5QyxPQUFPLEVBQ1AsSUFBSSxFQUNKLENBQUMsUUFBZ0MsRUFBRSxFQUFFO2dCQUNwQyxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsQ0FBQTtnQkFFOUIsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ3RCLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUMzQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUN4QixDQUFDO1lBQ0YsQ0FBQyxFQUNELE9BQU8sQ0FDUCxDQUFBO1lBRUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxtQkFBbUIsR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO29CQUN4RCxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtvQkFDN0IsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixFQUFFLENBQUM7d0JBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO29CQUMzQixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdkYsQ0FBQztJQUVPLG1CQUFtQixDQUFDLGFBQXFDLEVBQUUsVUFBbUI7UUFDckYsSUFBSSxhQUFhLENBQUMsT0FBTyxLQUFLLFVBQVUsSUFBSSxhQUFhLENBQUMsT0FBTyxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ2xGLE9BQU8sSUFBSSxNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN0QyxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQXNDLGFBQWEsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFBO1FBQzNFLE1BQU0sWUFBWSxHQUFHLGFBQWEsRUFBRSxPQUFPLElBQUksRUFBRSxDQUFBO1FBRWpELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFBO1FBQzFGLE1BQU0sR0FBRyxHQUFHLEtBQUssRUFBRSxHQUFHLENBQUE7UUFDdEIsSUFBSSxLQUFLLElBQUksR0FBRyxFQUFFLENBQUM7WUFDbEIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDckYsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMxQiw0R0FBNEc7WUFDNUcsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUE7WUFDN0YsT0FBTyxzQkFBc0IsQ0FBQyxXQUFXLEVBQUU7Z0JBQzFDLFFBQVEsQ0FBQztvQkFDUixFQUFFLEVBQUUsUUFBUTtvQkFDWixLQUFLO29CQUNMLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUM7aUJBQ2hFLENBQUM7YUFDRixDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsSUFBSSxVQUFVLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzNELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUN0RDtRQUFNLE1BQU8sQ0FBQyxRQUFRLEdBQUcsS0FBSyxFQUFFLFFBQVEsQ0FBQTtRQUV6QyxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxZQUFvRDtRQUM3RSxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ3JFLENBQUM7SUFDRixDQUFDO0lBRU8sMkJBQTJCLENBQUMsUUFBZ0IsRUFBRSxtQkFBbUIsR0FBRyxLQUFLO1FBQ2hGLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDO1lBQ3pCLElBQUksRUFBRSxPQUFPO1lBQ2IsS0FBSyxFQUFFLFdBQVc7WUFDbEIsSUFBSSxFQUFFO2dCQUNMLFFBQVE7Z0JBQ1IsbUJBQW1CO2FBQ25CO1lBQ0QsR0FBRyxFQUFFLFNBQVU7U0FDZixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDeEIsQ0FBQztDQUNELENBQUE7QUF0NUJZLGVBQWU7SUE2Q3pCLFdBQUEsMEJBQTBCLENBQUE7SUFFMUIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsY0FBYyxDQUFBO0dBakRKLGVBQWUsQ0FzNUIzQiJ9
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../../../../base/common/async.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { AbstractDebugAdapter } from '../../common/abstractDebugAdapter.js';
import { DebugStorage } from '../../common/debugStorage.js';
export class MockDebugService {
    get state() {
        throw new Error('not implemented');
    }
    get onWillNewSession() {
        throw new Error('not implemented');
    }
    get onDidNewSession() {
        throw new Error('not implemented');
    }
    get onDidEndSession() {
        throw new Error('not implemented');
    }
    get onDidChangeState() {
        throw new Error('not implemented');
    }
    getConfigurationManager() {
        throw new Error('not implemented');
    }
    getAdapterManager() {
        throw new Error('Method not implemented.');
    }
    canSetBreakpointsIn(model) {
        throw new Error('Method not implemented.');
    }
    focusStackFrame(focusedStackFrame) {
        throw new Error('not implemented');
    }
    sendAllBreakpoints(session) {
        throw new Error('not implemented');
    }
    sendBreakpoints(modelUri, sourceModified, session) {
        throw new Error('not implemented');
    }
    addBreakpoints(uri, rawBreakpoints) {
        throw new Error('not implemented');
    }
    updateBreakpoints(uri, data, sendOnResourceSaved) {
        throw new Error('not implemented');
    }
    enableOrDisableBreakpoints(enabled) {
        throw new Error('not implemented');
    }
    setBreakpointsActivated() {
        throw new Error('not implemented');
    }
    removeBreakpoints() {
        throw new Error('not implemented');
    }
    addInstructionBreakpoint(opts) {
        throw new Error('Method not implemented.');
    }
    removeInstructionBreakpoints(address) {
        throw new Error('Method not implemented.');
    }
    setExceptionBreakpointCondition(breakpoint, condition) {
        throw new Error('Method not implemented.');
    }
    setExceptionBreakpointsForSession(session, data) {
        throw new Error('Method not implemented.');
    }
    addFunctionBreakpoint() { }
    moveWatchExpression(id, position) { }
    updateFunctionBreakpoint(id, update) {
        throw new Error('not implemented');
    }
    removeFunctionBreakpoints(id) {
        throw new Error('not implemented');
    }
    addDataBreakpoint() {
        throw new Error('Method not implemented.');
    }
    updateDataBreakpoint(id, update) {
        throw new Error('not implemented');
    }
    removeDataBreakpoints(id) {
        throw new Error('Method not implemented.');
    }
    addReplExpression(name) {
        throw new Error('not implemented');
    }
    removeReplExpressions() { }
    addWatchExpression(name) {
        throw new Error('not implemented');
    }
    renameWatchExpression(id, newName) {
        throw new Error('not implemented');
    }
    removeWatchExpressions(id) { }
    startDebugging(launch, configOrName, options) {
        return Promise.resolve(true);
    }
    restartSession() {
        throw new Error('not implemented');
    }
    stopSession() {
        throw new Error('not implemented');
    }
    getModel() {
        throw new Error('not implemented');
    }
    getViewModel() {
        throw new Error('not implemented');
    }
    sourceIsNotAvailable(uri) { }
    tryToAutoFocusStackFrame(thread) {
        throw new Error('not implemented');
    }
    runTo(uri, lineNumber, column) {
        throw new Error('Method not implemented.');
    }
}
export class MockSession {
    constructor() {
        this.suppressDebugToolbar = false;
        this.suppressDebugStatusbar = false;
        this.suppressDebugView = false;
        this.autoExpandLazyVariables = false;
        this.configuration = { type: 'mock', name: 'mock', request: 'launch' };
        this.unresolvedConfiguration = { type: 'mock', name: 'mock', request: 'launch' };
        this.state = 2 /* State.Stopped */;
        this.capabilities = {};
    }
    getMemory(memoryReference) {
        throw new Error('Method not implemented.');
    }
    get onDidInvalidateMemory() {
        throw new Error('Not implemented');
    }
    readMemory(memoryReference, offset, count) {
        throw new Error('Method not implemented.');
    }
    writeMemory(memoryReference, offset, data, allowPartial) {
        throw new Error('Method not implemented.');
    }
    cancelCorrelatedTestRun() { }
    get compoundRoot() {
        return undefined;
    }
    get saveBeforeRestart() {
        return true;
    }
    get isSimpleUI() {
        return false;
    }
    get lifecycleManagedByParent() {
        return false;
    }
    stepInTargets(frameId) {
        throw new Error('Method not implemented.');
    }
    cancel(_progressId) {
        throw new Error('Method not implemented.');
    }
    breakpointsLocations(uri, lineNumber) {
        throw new Error('Method not implemented.');
    }
    dataBytesBreakpointInfo(address, bytes) {
        throw new Error('Method not implemented.');
    }
    dataBreakpointInfo(name, variablesReference) {
        throw new Error('Method not implemented.');
    }
    sendDataBreakpoints(dbps) {
        throw new Error('Method not implemented.');
    }
    get compact() {
        return false;
    }
    setSubId(subId) {
        throw new Error('Method not implemented.');
    }
    get parentSession() {
        return undefined;
    }
    getReplElements() {
        return [];
    }
    hasSeparateRepl() {
        return true;
    }
    removeReplExpressions() { }
    get onDidChangeReplElements() {
        throw new Error('not implemented');
    }
    addReplExpression(stackFrame, name) {
        return Promise.resolve(undefined);
    }
    appendToRepl(data) { }
    getId() {
        return 'mock';
    }
    getLabel() {
        return 'mockname';
    }
    get name() {
        return 'mockname';
    }
    setName(name) {
        throw new Error('not implemented');
    }
    getSourceForUri(modelUri) {
        throw new Error('not implemented');
    }
    getThread(threadId) {
        throw new Error('not implemented');
    }
    getStoppedDetails() {
        throw new Error('not implemented');
    }
    get onDidCustomEvent() {
        throw new Error('not implemented');
    }
    get onDidLoadedSource() {
        throw new Error('not implemented');
    }
    get onDidChangeState() {
        throw new Error('not implemented');
    }
    get onDidEndAdapter() {
        throw new Error('not implemented');
    }
    get onDidChangeName() {
        throw new Error('not implemented');
    }
    get onDidProgressStart() {
        throw new Error('not implemented');
    }
    get onDidProgressUpdate() {
        throw new Error('not implemented');
    }
    get onDidProgressEnd() {
        throw new Error('not implemented');
    }
    setConfiguration(configuration) { }
    getAllThreads() {
        return [];
    }
    getSource(raw) {
        throw new Error('not implemented');
    }
    getLoadedSources() {
        return Promise.resolve([]);
    }
    completions(frameId, threadId, text, position) {
        throw new Error('not implemented');
    }
    clearThreads(removeThreads, reference) { }
    rawUpdate(data) { }
    initialize(dbgr) {
        throw new Error('Method not implemented.');
    }
    launchOrAttach(config) {
        throw new Error('Method not implemented.');
    }
    restart() {
        throw new Error('Method not implemented.');
    }
    sendBreakpoints(modelUri, bpts, sourceModified) {
        throw new Error('Method not implemented.');
    }
    sendFunctionBreakpoints(fbps) {
        throw new Error('Method not implemented.');
    }
    sendExceptionBreakpoints(exbpts) {
        throw new Error('Method not implemented.');
    }
    sendInstructionBreakpoints(dbps) {
        throw new Error('Method not implemented.');
    }
    getDebugProtocolBreakpoint(breakpointId) {
        throw new Error('Method not implemented.');
    }
    customRequest(request, args) {
        throw new Error('Method not implemented.');
    }
    stackTrace(threadId, startFrame, levels, token) {
        throw new Error('Method not implemented.');
    }
    exceptionInfo(threadId) {
        throw new Error('Method not implemented.');
    }
    scopes(frameId) {
        throw new Error('Method not implemented.');
    }
    variables(variablesReference, threadId, filter, start, count) {
        throw new Error('Method not implemented.');
    }
    evaluate(expression, frameId, context) {
        throw new Error('Method not implemented.');
    }
    restartFrame(frameId, threadId) {
        throw new Error('Method not implemented.');
    }
    next(threadId, granularity) {
        throw new Error('Method not implemented.');
    }
    stepIn(threadId, targetId, granularity) {
        throw new Error('Method not implemented.');
    }
    stepOut(threadId, granularity) {
        throw new Error('Method not implemented.');
    }
    stepBack(threadId, granularity) {
        throw new Error('Method not implemented.');
    }
    continue(threadId) {
        throw new Error('Method not implemented.');
    }
    reverseContinue(threadId) {
        throw new Error('Method not implemented.');
    }
    pause(threadId) {
        throw new Error('Method not implemented.');
    }
    terminateThreads(threadIds) {
        throw new Error('Method not implemented.');
    }
    setVariable(variablesReference, name, value) {
        throw new Error('Method not implemented.');
    }
    setExpression(frameId, expression, value) {
        throw new Error('Method not implemented.');
    }
    loadSource(resource) {
        throw new Error('Method not implemented.');
    }
    disassemble(memoryReference, offset, instructionOffset, instructionCount) {
        throw new Error('Method not implemented.');
    }
    terminate(restart = false) {
        throw new Error('Method not implemented.');
    }
    disconnect(restart = false) {
        throw new Error('Method not implemented.');
    }
    gotoTargets(source, line, column) {
        throw new Error('Method not implemented.');
    }
    goto(threadId, targetId) {
        throw new Error('Method not implemented.');
    }
    resolveLocationReference(locationReference) {
        throw new Error('Method not implemented.');
    }
}
export class MockRawSession {
    constructor() {
        this.capabilities = {};
        this.disconnected = false;
        this.sessionLengthInSeconds = 0;
        this.readyForBreakpoints = true;
        this.emittedStopped = true;
        this.onDidStop = null;
    }
    getLengthInSeconds() {
        return 100;
    }
    stackTrace(args) {
        return Promise.resolve({
            seq: 1,
            type: 'response',
            request_seq: 1,
            success: true,
            command: 'stackTrace',
            body: {
                stackFrames: [
                    {
                        id: 1,
                        name: 'mock',
                        line: 5,
                        column: 6,
                    },
                ],
            },
        });
    }
    exceptionInfo(args) {
        throw new Error('not implemented');
    }
    launchOrAttach(args) {
        throw new Error('not implemented');
    }
    scopes(args) {
        throw new Error('not implemented');
    }
    variables(args) {
        throw new Error('not implemented');
    }
    evaluate(args) {
        return Promise.resolve(null);
    }
    custom(request, args) {
        throw new Error('not implemented');
    }
    terminate(restart = false) {
        throw new Error('not implemented');
    }
    disconnect(restart) {
        throw new Error('not implemented');
    }
    threads() {
        throw new Error('not implemented');
    }
    stepIn(args) {
        throw new Error('not implemented');
    }
    stepOut(args) {
        throw new Error('not implemented');
    }
    stepBack(args) {
        throw new Error('not implemented');
    }
    continue(args) {
        throw new Error('not implemented');
    }
    reverseContinue(args) {
        throw new Error('not implemented');
    }
    pause(args) {
        throw new Error('not implemented');
    }
    terminateThreads(args) {
        throw new Error('not implemented');
    }
    setVariable(args) {
        throw new Error('not implemented');
    }
    restartFrame(args) {
        throw new Error('not implemented');
    }
    completions(args) {
        throw new Error('not implemented');
    }
    next(args) {
        throw new Error('not implemented');
    }
    source(args) {
        throw new Error('not implemented');
    }
    loadedSources(args) {
        throw new Error('not implemented');
    }
    setBreakpoints(args) {
        throw new Error('not implemented');
    }
    setFunctionBreakpoints(args) {
        throw new Error('not implemented');
    }
    setExceptionBreakpoints(args) {
        throw new Error('not implemented');
    }
}
export class MockDebugAdapter extends AbstractDebugAdapter {
    constructor() {
        super(...arguments);
        this.seq = 0;
        this.pendingResponses = new Map();
    }
    startSession() {
        return Promise.resolve();
    }
    stopSession() {
        return Promise.resolve();
    }
    sendMessage(message) {
        if (message.type === 'request') {
            setTimeout(() => {
                const request = message;
                switch (request.command) {
                    case 'evaluate':
                        this.evaluate(request, request.arguments);
                        return;
                }
                this.sendResponseBody(request, {});
                return;
            }, 0);
        }
        else if (message.type === 'response') {
            const response = message;
            if (this.pendingResponses.has(response.command)) {
                this.pendingResponses.get(response.command).complete(response);
            }
        }
    }
    sendResponseBody(request, body) {
        const response = {
            seq: ++this.seq,
            type: 'response',
            request_seq: request.seq,
            command: request.command,
            success: true,
            body,
        };
        this.acceptMessage(response);
    }
    sendEventBody(event, body) {
        const response = {
            seq: ++this.seq,
            type: 'event',
            event,
            body,
        };
        this.acceptMessage(response);
    }
    waitForResponseFromClient(command) {
        const deferred = new DeferredPromise();
        if (this.pendingResponses.has(command)) {
            return this.pendingResponses.get(command).p;
        }
        this.pendingResponses.set(command, deferred);
        return deferred.p;
    }
    sendRequestBody(command, args) {
        const response = {
            seq: ++this.seq,
            type: 'request',
            command,
            arguments: args,
        };
        this.acceptMessage(response);
    }
    evaluate(request, args) {
        if (args.expression.indexOf('before.') === 0) {
            this.sendEventBody('output', { output: args.expression });
        }
        this.sendResponseBody(request, {
            result: '=' + args.expression,
            variablesReference: 0,
        });
        if (args.expression.indexOf('after.') === 0) {
            this.sendEventBody('output', { output: args.expression });
        }
    }
}
export class MockDebugStorage extends DebugStorage {
    constructor(storageService) {
        super(storageService, undefined, undefined, new NullLogService());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0RlYnVnLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9jb21tb24vbW9ja0RlYnVnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQU1yRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFHMUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFvQzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUzRCxNQUFNLE9BQU8sZ0JBQWdCO0lBRzVCLElBQUksS0FBSztRQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLGVBQWU7UUFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLGVBQWU7UUFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELHVCQUF1QjtRQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELG1CQUFtQixDQUFDLEtBQWlCO1FBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsZUFBZSxDQUFDLGlCQUE4QjtRQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELGtCQUFrQixDQUFDLE9BQXVCO1FBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsZUFBZSxDQUNkLFFBQWEsRUFDYixjQUFvQyxFQUNwQyxPQUFtQztRQUVuQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELGNBQWMsQ0FBQyxHQUFRLEVBQUUsY0FBaUM7UUFDekQsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxpQkFBaUIsQ0FDaEIsR0FBUSxFQUNSLElBQXdDLEVBQ3hDLG1CQUE0QjtRQUU1QixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELDBCQUEwQixDQUFDLE9BQWdCO1FBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsdUJBQXVCO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsd0JBQXdCLENBQUMsSUFBbUM7UUFDM0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxPQUFnQjtRQUM1QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELCtCQUErQixDQUM5QixVQUFnQyxFQUNoQyxTQUFpQjtRQUVqQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELGlDQUFpQyxDQUNoQyxPQUFzQixFQUN0QixJQUFnRDtRQUVoRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELHFCQUFxQixLQUFVLENBQUM7SUFFaEMsbUJBQW1CLENBQUMsRUFBVSxFQUFFLFFBQWdCLElBQVMsQ0FBQztJQUUxRCx3QkFBd0IsQ0FDdkIsRUFBVSxFQUNWLE1BQW9FO1FBRXBFLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQseUJBQXlCLENBQUMsRUFBVztRQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELG9CQUFvQixDQUNuQixFQUFVLEVBQ1YsTUFBcUQ7UUFFckQsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxFQUF1QjtRQUM1QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELGlCQUFpQixDQUFDLElBQVk7UUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxxQkFBcUIsS0FBVSxDQUFDO0lBRWhDLGtCQUFrQixDQUFDLElBQWE7UUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxFQUFVLEVBQUUsT0FBZTtRQUNoRCxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELHNCQUFzQixDQUFDLEVBQVcsSUFBUyxDQUFDO0lBRTVDLGNBQWMsQ0FDYixNQUFlLEVBQ2YsWUFBK0IsRUFDL0IsT0FBOEI7UUFFOUIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFRCxjQUFjO1FBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxXQUFXO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxRQUFRO1FBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxZQUFZO1FBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxHQUFRLElBQVMsQ0FBQztJQUV2Qyx3QkFBd0IsQ0FBQyxNQUFlO1FBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQixFQUFFLE1BQWU7UUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxXQUFXO0lBQXhCO1FBQ1UseUJBQW9CLEdBQUcsS0FBSyxDQUFBO1FBQzVCLDJCQUFzQixHQUFHLEtBQUssQ0FBQTtRQUM5QixzQkFBaUIsR0FBRyxLQUFLLENBQUE7UUFDekIsNEJBQXVCLEdBQUcsS0FBSyxDQUFBO1FBOEd4QyxrQkFBYSxHQUFZLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQTtRQUMxRSw0QkFBdUIsR0FBWSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUE7UUFDcEYsVUFBSyx5QkFBZ0I7UUFFckIsaUJBQVksR0FBK0IsRUFBRSxDQUFBO0lBK045QyxDQUFDO0lBL1VBLFNBQVMsQ0FBQyxlQUF1QjtRQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELElBQUkscUJBQXFCO1FBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsVUFBVSxDQUNULGVBQXVCLEVBQ3ZCLE1BQWMsRUFDZCxLQUFhO1FBRWIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxXQUFXLENBQ1YsZUFBdUIsRUFDdkIsTUFBYyxFQUNkLElBQVksRUFDWixZQUFzQjtRQUV0QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELHVCQUF1QixLQUFVLENBQUM7SUFFbEMsSUFBSSxZQUFZO1FBQ2YsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELElBQUksaUJBQWlCO1FBQ3BCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksd0JBQXdCO1FBQzNCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELGFBQWEsQ0FBQyxPQUFlO1FBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQW1CO1FBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsdUJBQXVCLENBQ3RCLE9BQWUsRUFDZixLQUFhO1FBRWIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxrQkFBa0IsQ0FDakIsSUFBWSxFQUNaLGtCQUF1QztRQUl2QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELG1CQUFtQixDQUFDLElBQXVCO1FBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBSUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQXlCO1FBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxlQUFlO1FBQ2QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsZUFBZTtRQUNkLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELHFCQUFxQixLQUFVLENBQUM7SUFDaEMsSUFBSSx1QkFBdUI7UUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxVQUF1QixFQUFFLElBQVk7UUFDdEQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxZQUFZLENBQUMsSUFBeUIsSUFBUyxDQUFDO0lBUWhELEtBQUs7UUFDSixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxVQUFVLENBQUE7SUFDbEIsQ0FBQztJQUVELElBQUksSUFBSTtRQUNQLE9BQU8sVUFBVSxDQUFBO0lBQ2xCLENBQUM7SUFFRCxPQUFPLENBQUMsSUFBWTtRQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELGVBQWUsQ0FBQyxRQUFhO1FBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsU0FBUyxDQUFDLFFBQWdCO1FBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLGlCQUFpQjtRQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxrQkFBa0I7UUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLG1CQUFtQjtRQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsYUFBeUQsSUFBRyxDQUFDO0lBRTlFLGFBQWE7UUFDWixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxTQUFTLENBQUMsR0FBeUI7UUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELFdBQVcsQ0FDVixPQUFlLEVBQ2YsUUFBZ0IsRUFDaEIsSUFBWSxFQUNaLFFBQWtCO1FBRWxCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsWUFBWSxDQUFDLGFBQXNCLEVBQUUsU0FBa0IsSUFBUyxDQUFDO0lBRWpFLFNBQVMsQ0FBQyxJQUFxQixJQUFTLENBQUM7SUFFekMsVUFBVSxDQUFDLElBQWU7UUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxjQUFjLENBQUMsTUFBZTtRQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELE9BQU87UUFDTixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELGVBQWUsQ0FBQyxRQUFhLEVBQUUsSUFBbUIsRUFBRSxjQUF1QjtRQUMxRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELHVCQUF1QixDQUFDLElBQTJCO1FBQ2xELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0Qsd0JBQXdCLENBQUMsTUFBOEI7UUFDdEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCwwQkFBMEIsQ0FBQyxJQUE4QjtRQUN4RCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELDBCQUEwQixDQUFDLFlBQW9CO1FBQzlDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsYUFBYSxDQUFDLE9BQWUsRUFBRSxJQUFTO1FBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsVUFBVSxDQUNULFFBQWdCLEVBQ2hCLFVBQWtCLEVBQ2xCLE1BQWMsRUFDZCxLQUF3QjtRQUV4QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELGFBQWEsQ0FBQyxRQUFnQjtRQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELE1BQU0sQ0FBQyxPQUFlO1FBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsU0FBUyxDQUNSLGtCQUEwQixFQUMxQixRQUE0QixFQUM1QixNQUEyQixFQUMzQixLQUFhLEVBQ2IsS0FBYTtRQUViLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsUUFBUSxDQUNQLFVBQWtCLEVBQ2xCLE9BQWUsRUFDZixPQUFnQjtRQUVoQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELFlBQVksQ0FBQyxPQUFlLEVBQUUsUUFBZ0I7UUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxJQUFJLENBQUMsUUFBZ0IsRUFBRSxXQUErQztRQUNyRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELE1BQU0sQ0FDTCxRQUFnQixFQUNoQixRQUFpQixFQUNqQixXQUErQztRQUUvQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELE9BQU8sQ0FBQyxRQUFnQixFQUFFLFdBQStDO1FBQ3hFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsUUFBUSxDQUFDLFFBQWdCLEVBQUUsV0FBK0M7UUFDekUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxRQUFRLENBQUMsUUFBZ0I7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxlQUFlLENBQUMsUUFBZ0I7UUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxLQUFLLENBQUMsUUFBZ0I7UUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxnQkFBZ0IsQ0FBQyxTQUFtQjtRQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELFdBQVcsQ0FDVixrQkFBMEIsRUFDMUIsSUFBWSxFQUNaLEtBQWE7UUFFYixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELGFBQWEsQ0FDWixPQUFlLEVBQ2YsVUFBa0IsRUFDbEIsS0FBYTtRQUViLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsVUFBVSxDQUFDLFFBQWE7UUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxXQUFXLENBQ1YsZUFBdUIsRUFDdkIsTUFBYyxFQUNkLGlCQUF5QixFQUN6QixnQkFBd0I7UUFFeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxTQUFTLENBQUMsT0FBTyxHQUFHLEtBQUs7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxVQUFVLENBQUMsT0FBTyxHQUFHLEtBQUs7UUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxXQUFXLENBQ1YsTUFBNEIsRUFDNUIsSUFBWSxFQUNaLE1BQTJCO1FBRTNCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsSUFBSSxDQUFDLFFBQWdCLEVBQUUsUUFBZ0I7UUFDdEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCx3QkFBd0IsQ0FBQyxpQkFBeUI7UUFDakQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxjQUFjO0lBQTNCO1FBQ0MsaUJBQVksR0FBK0IsRUFBRSxDQUFBO1FBQzdDLGlCQUFZLEdBQUcsS0FBSyxDQUFBO1FBQ3BCLDJCQUFzQixHQUFXLENBQUMsQ0FBQTtRQUVsQyx3QkFBbUIsR0FBRyxJQUFJLENBQUE7UUFDMUIsbUJBQWMsR0FBRyxJQUFJLENBQUE7UUFrSlosY0FBUyxHQUFzQyxJQUFLLENBQUE7SUFDOUQsQ0FBQztJQWpKQSxrQkFBa0I7UUFDakIsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQXVDO1FBQ2pELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUN0QixHQUFHLEVBQUUsQ0FBQztZQUNOLElBQUksRUFBRSxVQUFVO1lBQ2hCLFdBQVcsRUFBRSxDQUFDO1lBQ2QsT0FBTyxFQUFFLElBQUk7WUFDYixPQUFPLEVBQUUsWUFBWTtZQUNyQixJQUFJLEVBQUU7Z0JBQ0wsV0FBVyxFQUFFO29CQUNaO3dCQUNDLEVBQUUsRUFBRSxDQUFDO3dCQUNMLElBQUksRUFBRSxNQUFNO3dCQUNaLElBQUksRUFBRSxDQUFDO3dCQUNQLE1BQU0sRUFBRSxDQUFDO3FCQUNUO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsYUFBYSxDQUNaLElBQTBDO1FBRTFDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsY0FBYyxDQUFDLElBQWE7UUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBbUM7UUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxTQUFTLENBQUMsSUFBc0M7UUFDL0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBcUM7UUFDN0MsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUssQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFRCxNQUFNLENBQUMsT0FBZSxFQUFFLElBQVM7UUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxTQUFTLENBQUMsT0FBTyxHQUFHLEtBQUs7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxVQUFVLENBQUMsT0FBaUI7UUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxPQUFPO1FBQ04sTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBbUM7UUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxPQUFPLENBQUMsSUFBb0M7UUFDM0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBcUM7UUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBcUM7UUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxlQUFlLENBQ2QsSUFBNEM7UUFFNUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBa0M7UUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxnQkFBZ0IsQ0FDZixJQUE2QztRQUU3QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELFdBQVcsQ0FDVixJQUF3QztRQUV4QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELFlBQVksQ0FDWCxJQUF5QztRQUV6QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELFdBQVcsQ0FDVixJQUF3QztRQUV4QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFpQztRQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFtQztRQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELGFBQWEsQ0FDWixJQUEwQztRQUUxQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELGNBQWMsQ0FDYixJQUEyQztRQUUzQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELHNCQUFzQixDQUNyQixJQUFtRDtRQUVuRCxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELHVCQUF1QixDQUN0QixJQUFvRDtRQUVwRCxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztDQUdEO0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLG9CQUFvQjtJQUExRDs7UUFDUyxRQUFHLEdBQUcsQ0FBQyxDQUFBO1FBRVAscUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQW1ELENBQUE7SUFzRnRGLENBQUM7SUFwRkEsWUFBWTtRQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFRCxXQUFXO1FBQ1YsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUFzQztRQUNqRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDaEMsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDZixNQUFNLE9BQU8sR0FBRyxPQUFnQyxDQUFBO2dCQUNoRCxRQUFRLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDekIsS0FBSyxVQUFVO3dCQUNkLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTt3QkFDekMsT0FBTTtnQkFDUixDQUFDO2dCQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7Z0JBQ2xDLE9BQU07WUFDUCxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDO2FBQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sUUFBUSxHQUFHLE9BQWlDLENBQUE7WUFDbEQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNqRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDaEUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsT0FBOEIsRUFBRSxJQUFTO1FBQ3pELE1BQU0sUUFBUSxHQUEyQjtZQUN4QyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRztZQUNmLElBQUksRUFBRSxVQUFVO1lBQ2hCLFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRztZQUN4QixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDeEIsT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJO1NBQ0osQ0FBQTtRQUNELElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVELGFBQWEsQ0FBQyxLQUFhLEVBQUUsSUFBUztRQUNyQyxNQUFNLFFBQVEsR0FBd0I7WUFDckMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDZixJQUFJLEVBQUUsT0FBTztZQUNiLEtBQUs7WUFDTCxJQUFJO1NBQ0osQ0FBQTtRQUNELElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVELHlCQUF5QixDQUFDLE9BQWU7UUFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFlLEVBQTBCLENBQUE7UUFDOUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDeEMsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QyxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDNUMsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBQ2xCLENBQUM7SUFFRCxlQUFlLENBQUMsT0FBZSxFQUFFLElBQVM7UUFDekMsTUFBTSxRQUFRLEdBQTBCO1lBQ3ZDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2YsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPO1lBQ1AsU0FBUyxFQUFFLElBQUk7U0FDZixDQUFBO1FBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRUQsUUFBUSxDQUFDLE9BQThCLEVBQUUsSUFBcUM7UUFDN0UsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRTtZQUM5QixNQUFNLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVO1lBQzdCLGtCQUFrQixFQUFFLENBQUM7U0FDckIsQ0FBQyxDQUFBO1FBRUYsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUMxRCxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFlBQVk7SUFDakQsWUFBWSxjQUErQjtRQUMxQyxLQUFLLENBQUMsY0FBYyxFQUFFLFNBQWdCLEVBQUUsU0FBZ0IsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUE7SUFDaEYsQ0FBQztDQUNEIn0=
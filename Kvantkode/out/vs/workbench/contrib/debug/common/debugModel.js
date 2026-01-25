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
import { distinct } from '../../../../base/common/arrays.js';
import { findLastIdx } from '../../../../base/common/arraysFind.js';
import { DeferredPromise, RunOnceScheduler } from '../../../../base/common/async.js';
import { VSBuffer, decodeBase64, encodeBase64 } from '../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, trackSetChanges } from '../../../../base/common/event.js';
import { stringHash } from '../../../../base/common/hash.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { mixin } from '../../../../base/common/objects.js';
import { autorun } from '../../../../base/common/observable.js';
import * as resources from '../../../../base/common/resources.js';
import { isString, isUndefinedOrNull } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { Range } from '../../../../editor/common/core/range.js';
import * as nls from '../../../../nls.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { DEBUG_MEMORY_SCHEME, isFrameDeemphasized, } from './debug.js';
import { UNKNOWN_SOURCE_LABEL, getUriFromSource } from './debugSource.js';
import { DisassemblyViewInput } from './disassemblyViewInput.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
export class ExpressionContainer {
    static { this.allValues = new Map(); }
    // Use chunks to support variable paging #9537
    static { this.BASE_CHUNK_SIZE = 100; }
    constructor(session, threadId, _reference, id, namedVariables = 0, indexedVariables = 0, memoryReference = undefined, startOfVariables = 0, presentationHint = undefined, valueLocationReference = undefined) {
        this.session = session;
        this.threadId = threadId;
        this._reference = _reference;
        this.id = id;
        this.namedVariables = namedVariables;
        this.indexedVariables = indexedVariables;
        this.memoryReference = memoryReference;
        this.startOfVariables = startOfVariables;
        this.presentationHint = presentationHint;
        this.valueLocationReference = valueLocationReference;
        this.valueChanged = false;
        this._value = '';
    }
    get reference() {
        return this._reference;
    }
    set reference(value) {
        this._reference = value;
        this.children = undefined; // invalidate children cache
    }
    async evaluateLazy() {
        if (typeof this.reference === 'undefined') {
            return;
        }
        const response = await this.session.variables(this.reference, this.threadId, undefined, undefined, undefined);
        if (!response ||
            !response.body ||
            !response.body.variables ||
            response.body.variables.length !== 1) {
            return;
        }
        const dummyVar = response.body.variables[0];
        this.reference = dummyVar.variablesReference;
        this._value = dummyVar.value;
        this.namedVariables = dummyVar.namedVariables;
        this.indexedVariables = dummyVar.indexedVariables;
        this.memoryReference = dummyVar.memoryReference;
        this.presentationHint = dummyVar.presentationHint;
        this.valueLocationReference = dummyVar.valueLocationReference;
        // Also call overridden method to adopt subclass props
        this.adoptLazyResponse(dummyVar);
    }
    adoptLazyResponse(response) { }
    getChildren() {
        if (!this.children) {
            this.children = this.doGetChildren();
        }
        return this.children;
    }
    async doGetChildren() {
        if (!this.hasChildren) {
            return [];
        }
        if (!this.getChildrenInChunks) {
            return this.fetchVariables(undefined, undefined, undefined);
        }
        // Check if object has named variables, fetch them independent from indexed variables #9670
        const children = this.namedVariables
            ? await this.fetchVariables(undefined, undefined, 'named')
            : [];
        // Use a dynamic chunk size based on the number of elements #9774
        let chunkSize = ExpressionContainer.BASE_CHUNK_SIZE;
        while (!!this.indexedVariables &&
            this.indexedVariables > chunkSize * ExpressionContainer.BASE_CHUNK_SIZE) {
            chunkSize *= ExpressionContainer.BASE_CHUNK_SIZE;
        }
        if (!!this.indexedVariables && this.indexedVariables > chunkSize) {
            // There are a lot of children, create fake intermediate values that represent chunks #9537
            const numberOfChunks = Math.ceil(this.indexedVariables / chunkSize);
            for (let i = 0; i < numberOfChunks; i++) {
                const start = (this.startOfVariables || 0) + i * chunkSize;
                const count = Math.min(chunkSize, this.indexedVariables - i * chunkSize);
                children.push(new Variable(this.session, this.threadId, this, this.reference, `[${start}..${start + count - 1}]`, '', '', undefined, count, undefined, { kind: 'virtual' }, undefined, undefined, true, start));
            }
            return children;
        }
        const variables = await this.fetchVariables(this.startOfVariables, this.indexedVariables, 'indexed');
        return children.concat(variables);
    }
    getId() {
        return this.id;
    }
    getSession() {
        return this.session;
    }
    get value() {
        return this._value;
    }
    get hasChildren() {
        // only variables with reference > 0 have children.
        return !!this.reference && this.reference > 0 && !this.presentationHint?.lazy;
    }
    async fetchVariables(start, count, filter) {
        try {
            const response = await this.session.variables(this.reference || 0, this.threadId, filter, start, count);
            if (!response || !response.body || !response.body.variables) {
                return [];
            }
            const nameCount = new Map();
            const vars = response.body.variables
                .filter((v) => !!v)
                .map((v) => {
                if (isString(v.value) && isString(v.name) && typeof v.variablesReference === 'number') {
                    const count = nameCount.get(v.name) || 0;
                    const idDuplicationIndex = count > 0 ? count.toString() : '';
                    nameCount.set(v.name, count + 1);
                    return new Variable(this.session, this.threadId, this, v.variablesReference, v.name, v.evaluateName, v.value, v.namedVariables, v.indexedVariables, v.memoryReference, v.presentationHint, v.type, v.__vscodeVariableMenuContext, true, 0, idDuplicationIndex, v.declarationLocationReference, v.valueLocationReference);
                }
                return new Variable(this.session, this.threadId, this, 0, '', undefined, nls.localize('invalidVariableAttributes', 'Invalid variable attributes'), 0, 0, undefined, { kind: 'virtual' }, undefined, undefined, false);
            });
            if (this.session.autoExpandLazyVariables) {
                await Promise.all(vars.map((v) => v.presentationHint?.lazy && v.evaluateLazy()));
            }
            return vars;
        }
        catch (e) {
            return [
                new Variable(this.session, this.threadId, this, 0, '', undefined, e.message, 0, 0, undefined, { kind: 'virtual' }, undefined, undefined, false),
            ];
        }
    }
    // The adapter explicitly sents the children count of an expression only if there are lots of children which should be chunked.
    get getChildrenInChunks() {
        return !!this.indexedVariables;
    }
    set value(value) {
        this._value = value;
        this.valueChanged =
            !!ExpressionContainer.allValues.get(this.getId()) &&
                ExpressionContainer.allValues.get(this.getId()) !== Expression.DEFAULT_VALUE &&
                ExpressionContainer.allValues.get(this.getId()) !== value;
        ExpressionContainer.allValues.set(this.getId(), value);
    }
    toString() {
        return this.value;
    }
    async evaluateExpression(expression, session, stackFrame, context, keepLazyVars = false, location) {
        if (!session || (!stackFrame && context !== 'repl')) {
            this.value =
                context === 'repl'
                    ? nls.localize('startDebugFirst', 'Please start a debug session to evaluate expressions')
                    : Expression.DEFAULT_VALUE;
            this.reference = 0;
            return false;
        }
        this.session = session;
        try {
            const response = await session.evaluate(expression, stackFrame ? stackFrame.frameId : undefined, context, location);
            if (response && response.body) {
                this.value = response.body.result || '';
                this.reference = response.body.variablesReference;
                this.namedVariables = response.body.namedVariables;
                this.indexedVariables = response.body.indexedVariables;
                this.memoryReference = response.body.memoryReference;
                this.type = response.body.type || this.type;
                this.presentationHint = response.body.presentationHint;
                this.valueLocationReference = response.body.valueLocationReference;
                if (!keepLazyVars && response.body.presentationHint?.lazy) {
                    await this.evaluateLazy();
                }
                return true;
            }
            return false;
        }
        catch (e) {
            this.value = e.message || '';
            this.reference = 0;
            return false;
        }
    }
}
function handleSetResponse(expression, response) {
    if (response && response.body) {
        expression.value = response.body.value || '';
        expression.type = response.body.type || expression.type;
        expression.reference = response.body.variablesReference;
        expression.namedVariables = response.body.namedVariables;
        expression.indexedVariables = response.body.indexedVariables;
        // todo @weinand: the set responses contain most properties, but not memory references. Should they?
    }
}
export class VisualizedExpression {
    evaluateLazy() {
        return Promise.resolve();
    }
    getChildren() {
        return this.visualizer.getVisualizedChildren(this.session, this.treeId, this.treeItem.id);
    }
    getId() {
        return this.id;
    }
    get name() {
        return this.treeItem.label;
    }
    get value() {
        return this.treeItem.description || '';
    }
    get hasChildren() {
        return this.treeItem.collapsibleState !== 0 /* DebugTreeItemCollapsibleState.None */;
    }
    constructor(session, visualizer, treeId, treeItem, original) {
        this.session = session;
        this.visualizer = visualizer;
        this.treeId = treeId;
        this.treeItem = treeItem;
        this.original = original;
        this.id = generateUuid();
    }
    getSession() {
        return this.session;
    }
    /** Edits the value, sets the {@link errorMessage} and returns false if unsuccessful */
    async edit(newValue) {
        try {
            await this.visualizer.editTreeItem(this.treeId, this.treeItem, newValue);
            return true;
        }
        catch (e) {
            this.errorMessage = e.message;
            return false;
        }
    }
}
export class Expression extends ExpressionContainer {
    static { this.DEFAULT_VALUE = nls.localize('notAvailable', 'not available'); }
    constructor(name, id = generateUuid()) {
        super(undefined, undefined, 0, id);
        this.name = name;
        this._onDidChangeValue = new Emitter();
        this.onDidChangeValue = this._onDidChangeValue.event;
        this.available = false;
        // name is not set if the expression is just being added
        // in that case do not set default value to prevent flashing #14499
        if (name) {
            this.value = Expression.DEFAULT_VALUE;
        }
    }
    async evaluate(session, stackFrame, context, keepLazyVars, location) {
        const hadDefaultValue = this.value === Expression.DEFAULT_VALUE;
        this.available = await this.evaluateExpression(this.name, session, stackFrame, context, keepLazyVars, location);
        if (hadDefaultValue || this.valueChanged) {
            this._onDidChangeValue.fire(this);
        }
    }
    toString() {
        return `${this.name}\n${this.value}`;
    }
    async setExpression(value, stackFrame) {
        if (!this.session) {
            return;
        }
        const response = await this.session.setExpression(stackFrame.frameId, this.name, value);
        handleSetResponse(this, response);
    }
}
export class Variable extends ExpressionContainer {
    constructor(session, threadId, parent, reference, name, evaluateName, value, namedVariables, indexedVariables, memoryReference, presentationHint, type = undefined, variableMenuContext = undefined, available = true, startOfVariables = 0, idDuplicationIndex = '', declarationLocationReference = undefined, valueLocationReference = undefined) {
        super(session, threadId, reference, `variable:${parent.getId()}:${name}:${idDuplicationIndex}`, namedVariables, indexedVariables, memoryReference, startOfVariables, presentationHint, valueLocationReference);
        this.parent = parent;
        this.name = name;
        this.evaluateName = evaluateName;
        this.variableMenuContext = variableMenuContext;
        this.available = available;
        this.declarationLocationReference = declarationLocationReference;
        this.value = value || '';
        this.type = type;
    }
    getThreadId() {
        return this.threadId;
    }
    async setVariable(value, stackFrame) {
        if (!this.session) {
            return;
        }
        try {
            // Send out a setExpression for debug extensions that do not support set variables https://github.com/microsoft/vscode/issues/124679#issuecomment-869844437
            if (this.session.capabilities.supportsSetExpression &&
                !this.session.capabilities.supportsSetVariable &&
                this.evaluateName) {
                return this.setExpression(value, stackFrame);
            }
            const response = await this.session.setVariable(this.parent.reference, this.name, value);
            handleSetResponse(this, response);
        }
        catch (err) {
            this.errorMessage = err.message;
        }
    }
    async setExpression(value, stackFrame) {
        if (!this.session || !this.evaluateName) {
            return;
        }
        const response = await this.session.setExpression(stackFrame.frameId, this.evaluateName, value);
        handleSetResponse(this, response);
    }
    toString() {
        return this.name ? `${this.name}: ${this.value}` : this.value;
    }
    adoptLazyResponse(response) {
        this.evaluateName = response.evaluateName;
    }
    toDebugProtocolObject() {
        return {
            name: this.name,
            variablesReference: this.reference || 0,
            memoryReference: this.memoryReference,
            value: this.value,
            evaluateName: this.evaluateName,
        };
    }
}
export class Scope extends ExpressionContainer {
    constructor(stackFrame, id, name, reference, expensive, namedVariables, indexedVariables, range) {
        super(stackFrame.thread.session, stackFrame.thread.threadId, reference, `scope:${name}:${id}`, namedVariables, indexedVariables);
        this.stackFrame = stackFrame;
        this.name = name;
        this.expensive = expensive;
        this.range = range;
    }
    toString() {
        return this.name;
    }
    toDebugProtocolObject() {
        return {
            name: this.name,
            variablesReference: this.reference || 0,
            expensive: this.expensive,
        };
    }
}
export class ErrorScope extends Scope {
    constructor(stackFrame, index, message) {
        super(stackFrame, index, message, 0, false);
    }
    toString() {
        return this.name;
    }
}
export class StackFrame {
    constructor(thread, frameId, source, name, presentationHint, range, index, canRestart, instructionPointerReference) {
        this.thread = thread;
        this.frameId = frameId;
        this.source = source;
        this.name = name;
        this.presentationHint = presentationHint;
        this.range = range;
        this.index = index;
        this.canRestart = canRestart;
        this.instructionPointerReference = instructionPointerReference;
    }
    getId() {
        return `stackframe:${this.thread.getId()}:${this.index}:${this.source.name}`;
    }
    getScopes() {
        if (!this.scopes) {
            this.scopes = this.thread.session.scopes(this.frameId, this.thread.threadId).then((response) => {
                if (!response || !response.body || !response.body.scopes) {
                    return [];
                }
                const usedIds = new Set();
                return response.body.scopes.map((rs) => {
                    // form the id based on the name and location so that it's the
                    // same across multiple pauses to retain expansion state
                    let id = 0;
                    do {
                        id = stringHash(`${rs.name}:${rs.line}:${rs.column}`, id);
                    } while (usedIds.has(id));
                    usedIds.add(id);
                    return new Scope(this, id, rs.name, rs.variablesReference, rs.expensive, rs.namedVariables, rs.indexedVariables, rs.line && rs.column && rs.endLine && rs.endColumn
                        ? new Range(rs.line, rs.column, rs.endLine, rs.endColumn)
                        : undefined);
                });
            }, (err) => [new ErrorScope(this, 0, err.message)]);
        }
        return this.scopes;
    }
    async getMostSpecificScopes(range) {
        const scopes = await this.getScopes();
        const nonExpensiveScopes = scopes.filter((s) => !s.expensive);
        const haveRangeInfo = nonExpensiveScopes.some((s) => !!s.range);
        if (!haveRangeInfo) {
            return nonExpensiveScopes;
        }
        const scopesContainingRange = nonExpensiveScopes
            .filter((scope) => scope.range && Range.containsRange(scope.range, range))
            .sort((first, second) => first.range.endLineNumber -
            first.range.startLineNumber -
            (second.range.endLineNumber - second.range.startLineNumber));
        return scopesContainingRange.length ? scopesContainingRange : nonExpensiveScopes;
    }
    restart() {
        return this.thread.session.restartFrame(this.frameId, this.thread.threadId);
    }
    forgetScopes() {
        this.scopes = undefined;
    }
    toString() {
        const lineNumberToString = typeof this.range.startLineNumber === 'number' ? `:${this.range.startLineNumber}` : '';
        const sourceToString = `${this.source.inMemory ? this.source.name : this.source.uri.fsPath}${lineNumberToString}`;
        return sourceToString === UNKNOWN_SOURCE_LABEL ? this.name : `${this.name} (${sourceToString})`;
    }
    async openInEditor(editorService, preserveFocus, sideBySide, pinned) {
        const threadStopReason = this.thread.stoppedDetails?.reason;
        if (this.instructionPointerReference &&
            (threadStopReason === 'instruction breakpoint' ||
                (threadStopReason === 'step' && this.thread.lastSteppingGranularity === 'instruction') ||
                editorService.activeEditor instanceof DisassemblyViewInput)) {
            return editorService.openEditor(DisassemblyViewInput.instance, {
                pinned: true,
                revealIfOpened: true,
            });
        }
        if (this.source.available) {
            return this.source.openInEditor(editorService, this.range, preserveFocus, sideBySide, pinned);
        }
        return undefined;
    }
    equals(other) {
        return (this.name === other.name &&
            other.thread === this.thread &&
            this.frameId === other.frameId &&
            other.source === this.source &&
            Range.equalsRange(this.range, other.range));
    }
}
const KEEP_SUBTLE_FRAME_AT_TOP_REASONS = [
    'breakpoint',
    'step',
    'function breakpoint',
];
export class Thread {
    constructor(session, name, threadId) {
        this.session = session;
        this.name = name;
        this.threadId = threadId;
        this.callStackCancellationTokens = [];
        this.reachedEndOfCallStack = false;
        this.callStack = [];
        this.staleCallStack = [];
        this.stopped = false;
    }
    getId() {
        return `thread:${this.session.getId()}:${this.threadId}`;
    }
    clearCallStack() {
        if (this.callStack.length) {
            this.staleCallStack = this.callStack;
        }
        this.callStack = [];
        this.callStackCancellationTokens.forEach((c) => c.dispose(true));
        this.callStackCancellationTokens = [];
    }
    getCallStack() {
        return this.callStack;
    }
    getStaleCallStack() {
        return this.staleCallStack;
    }
    getTopStackFrame() {
        const callStack = this.getCallStack();
        const stopReason = this.stoppedDetails?.reason;
        // Allow stack frame without source and with instructionReferencePointer as top stack frame when using disassembly view.
        const firstAvailableStackFrame = callStack.find((sf) => !!(((stopReason === 'instruction breakpoint' ||
            (stopReason === 'step' && this.lastSteppingGranularity === 'instruction')) &&
            sf.instructionPointerReference) ||
            (sf.source &&
                sf.source.available &&
                (KEEP_SUBTLE_FRAME_AT_TOP_REASONS.includes(stopReason) || !isFrameDeemphasized(sf)))));
        return firstAvailableStackFrame;
    }
    get stateLabel() {
        if (this.stoppedDetails) {
            return (this.stoppedDetails.description ||
                (this.stoppedDetails.reason
                    ? nls.localize({ key: 'pausedOn', comment: ['indicates reason for program being paused'] }, 'Paused on {0}', this.stoppedDetails.reason)
                    : nls.localize('paused', 'Paused')));
        }
        return nls.localize({ key: 'running', comment: ['indicates state'] }, 'Running');
    }
    /**
     * Queries the debug adapter for the callstack and returns a promise
     * which completes once the call stack has been retrieved.
     * If the thread is not stopped, it returns a promise to an empty array.
     * Only fetches the first stack frame for performance reasons. Calling this method consecutive times
     * gets the remainder of the call stack.
     */
    async fetchCallStack(levels = 20) {
        if (this.stopped) {
            const start = this.callStack.length;
            const callStack = await this.getCallStackImpl(start, levels);
            this.reachedEndOfCallStack = callStack.length < levels;
            if (start < this.callStack.length) {
                // Set the stack frames for exact position we requested. To make sure no concurrent requests create duplicate stack frames #30660
                this.callStack.splice(start, this.callStack.length - start);
            }
            this.callStack = this.callStack.concat(callStack || []);
            if (typeof this.stoppedDetails?.totalFrames === 'number' &&
                this.stoppedDetails.totalFrames === this.callStack.length) {
                this.reachedEndOfCallStack = true;
            }
        }
    }
    async getCallStackImpl(startFrame, levels) {
        try {
            const tokenSource = new CancellationTokenSource();
            this.callStackCancellationTokens.push(tokenSource);
            const response = await this.session.stackTrace(this.threadId, startFrame, levels, tokenSource.token);
            if (!response || !response.body || tokenSource.token.isCancellationRequested) {
                return [];
            }
            if (this.stoppedDetails) {
                this.stoppedDetails.totalFrames = response.body.totalFrames;
            }
            return response.body.stackFrames.map((rsf, index) => {
                const source = this.session.getSource(rsf.source);
                return new StackFrame(this, rsf.id, source, rsf.name, rsf.presentationHint, new Range(rsf.line, rsf.column, rsf.endLine || rsf.line, rsf.endColumn || rsf.column), startFrame + index, typeof rsf.canRestart === 'boolean' ? rsf.canRestart : true, rsf.instructionPointerReference);
            });
        }
        catch (err) {
            if (this.stoppedDetails) {
                this.stoppedDetails.framesErrorMessage = err.message;
            }
            return [];
        }
    }
    /**
     * Returns exception info promise if the exception was thrown, otherwise undefined
     */
    get exceptionInfo() {
        if (this.stoppedDetails && this.stoppedDetails.reason === 'exception') {
            if (this.session.capabilities.supportsExceptionInfoRequest) {
                return this.session.exceptionInfo(this.threadId);
            }
            return Promise.resolve({
                description: this.stoppedDetails.text,
                breakMode: null,
            });
        }
        return Promise.resolve(undefined);
    }
    next(granularity) {
        return this.session.next(this.threadId, granularity);
    }
    stepIn(granularity) {
        return this.session.stepIn(this.threadId, undefined, granularity);
    }
    stepOut(granularity) {
        return this.session.stepOut(this.threadId, granularity);
    }
    stepBack(granularity) {
        return this.session.stepBack(this.threadId, granularity);
    }
    continue() {
        return this.session.continue(this.threadId);
    }
    pause() {
        return this.session.pause(this.threadId);
    }
    terminate() {
        return this.session.terminateThreads([this.threadId]);
    }
    reverseContinue() {
        return this.session.reverseContinue(this.threadId);
    }
}
/**
 * Gets a URI to a memory in the given session ID.
 */
export const getUriForDebugMemory = (sessionId, memoryReference, range, displayName = 'memory') => {
    return URI.from({
        scheme: DEBUG_MEMORY_SCHEME,
        authority: sessionId,
        path: '/' + encodeURIComponent(memoryReference) + `/${encodeURIComponent(displayName)}.bin`,
        query: range ? `?range=${range.fromOffset}:${range.toOffset}` : undefined,
    });
};
export class MemoryRegion extends Disposable {
    constructor(memoryReference, session) {
        super();
        this.memoryReference = memoryReference;
        this.session = session;
        this.invalidateEmitter = this._register(new Emitter());
        /** @inheritdoc */
        this.onDidInvalidate = this.invalidateEmitter.event;
        /** @inheritdoc */
        this.writable = !!this.session.capabilities.supportsWriteMemoryRequest;
        this._register(session.onDidInvalidateMemory((e) => {
            if (e.body.memoryReference === memoryReference) {
                this.invalidate(e.body.offset, e.body.count - e.body.offset);
            }
        }));
    }
    async read(fromOffset, toOffset) {
        const length = toOffset - fromOffset;
        const offset = fromOffset;
        const result = await this.session.readMemory(this.memoryReference, offset, length);
        if (result === undefined || !result.body?.data) {
            return [{ type: 1 /* MemoryRangeType.Unreadable */, offset, length }];
        }
        let data;
        try {
            data = decodeBase64(result.body.data);
        }
        catch {
            return [
                {
                    type: 2 /* MemoryRangeType.Error */,
                    offset,
                    length,
                    error: 'Invalid base64 data from debug adapter',
                },
            ];
        }
        const unreadable = result.body.unreadableBytes || 0;
        const dataLength = length - unreadable;
        if (data.byteLength < dataLength) {
            const pad = VSBuffer.alloc(dataLength - data.byteLength);
            pad.buffer.fill(0);
            data = VSBuffer.concat([data, pad], dataLength);
        }
        else if (data.byteLength > dataLength) {
            data = data.slice(0, dataLength);
        }
        if (!unreadable) {
            return [{ type: 0 /* MemoryRangeType.Valid */, offset, length, data }];
        }
        return [
            { type: 0 /* MemoryRangeType.Valid */, offset, length: dataLength, data },
            { type: 1 /* MemoryRangeType.Unreadable */, offset: offset + dataLength, length: unreadable },
        ];
    }
    async write(offset, data) {
        const result = await this.session.writeMemory(this.memoryReference, offset, encodeBase64(data), true);
        const written = result?.body?.bytesWritten ?? data.byteLength;
        this.invalidate(offset, offset + written);
        return written;
    }
    dispose() {
        super.dispose();
    }
    invalidate(fromOffset, toOffset) {
        this.invalidateEmitter.fire({ fromOffset, toOffset });
    }
}
export class Enablement {
    constructor(enabled, id) {
        this.enabled = enabled;
        this.id = id;
    }
    getId() {
        return this.id;
    }
}
function toBreakpointSessionData(data, capabilities) {
    return mixin({
        supportsConditionalBreakpoints: !!capabilities.supportsConditionalBreakpoints,
        supportsHitConditionalBreakpoints: !!capabilities.supportsHitConditionalBreakpoints,
        supportsLogPoints: !!capabilities.supportsLogPoints,
        supportsFunctionBreakpoints: !!capabilities.supportsFunctionBreakpoints,
        supportsDataBreakpoints: !!capabilities.supportsDataBreakpoints,
        supportsInstructionBreakpoints: !!capabilities.supportsInstructionBreakpoints,
    }, data);
}
export class BaseBreakpoint extends Enablement {
    constructor(id, opts) {
        super(opts.enabled ?? true, id);
        this.sessionData = new Map();
        this.condition = opts.condition;
        this.hitCondition = opts.hitCondition;
        this.logMessage = opts.logMessage;
        this.mode = opts.mode;
        this.modeLabel = opts.modeLabel;
    }
    setSessionData(sessionId, data) {
        if (!data) {
            this.sessionData.delete(sessionId);
        }
        else {
            data.sessionId = sessionId;
            this.sessionData.set(sessionId, data);
        }
        const allData = Array.from(this.sessionData.values());
        const verifiedData = distinct(allData.filter((d) => d.verified), (d) => `${d.line}:${d.column}`);
        if (verifiedData.length) {
            // In case multiple session verified the breakpoint and they provide different data show the intial data that the user set (corner case)
            this.data = verifiedData.length === 1 ? verifiedData[0] : undefined;
        }
        else {
            // No session verified the breakpoint
            this.data = allData.length ? allData[0] : undefined;
        }
    }
    get message() {
        if (!this.data) {
            return undefined;
        }
        return this.data.message;
    }
    get verified() {
        return this.data ? this.data.verified : true;
    }
    get sessionsThatVerified() {
        const sessionIds = [];
        for (const [sessionId, data] of this.sessionData) {
            if (data.verified) {
                sessionIds.push(sessionId);
            }
        }
        return sessionIds;
    }
    getIdFromAdapter(sessionId) {
        const data = this.sessionData.get(sessionId);
        return data ? data.id : undefined;
    }
    getDebugProtocolBreakpoint(sessionId) {
        const data = this.sessionData.get(sessionId);
        if (data) {
            const bp = {
                id: data.id,
                verified: data.verified,
                message: data.message,
                source: data.source,
                line: data.line,
                column: data.column,
                endLine: data.endLine,
                endColumn: data.endColumn,
                instructionReference: data.instructionReference,
                offset: data.offset,
            };
            return bp;
        }
        return undefined;
    }
    toJSON() {
        return {
            id: this.getId(),
            enabled: this.enabled,
            condition: this.condition,
            hitCondition: this.hitCondition,
            logMessage: this.logMessage,
            mode: this.mode,
            modeLabel: this.modeLabel,
        };
    }
}
export class Breakpoint extends BaseBreakpoint {
    constructor(opts, textFileService, uriIdentityService, logService, id = generateUuid()) {
        super(id, opts);
        this.textFileService = textFileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._uri = opts.uri;
        this._lineNumber = opts.lineNumber;
        this._column = opts.column;
        this._adapterData = opts.adapterData;
        this.triggeredBy = opts.triggeredBy;
    }
    toDAP() {
        return {
            line: this.sessionAgnosticData.lineNumber,
            column: this.sessionAgnosticData.column,
            condition: this.condition,
            hitCondition: this.hitCondition,
            logMessage: this.logMessage,
            mode: this.mode,
        };
    }
    get originalUri() {
        return this._uri;
    }
    get lineNumber() {
        return this.verified && this.data && typeof this.data.line === 'number'
            ? this.data.line
            : this._lineNumber;
    }
    get verified() {
        if (this.data) {
            return this.data.verified && !this.textFileService.isDirty(this._uri);
        }
        return true;
    }
    get pending() {
        if (this.data) {
            return false;
        }
        return this.triggeredBy !== undefined;
    }
    get uri() {
        return this.verified && this.data && this.data.source
            ? getUriFromSource(this.data.source, this.data.source.path, this.data.sessionId, this.uriIdentityService, this.logService)
            : this._uri;
    }
    get column() {
        return this.verified && this.data && typeof this.data.column === 'number'
            ? this.data.column
            : this._column;
    }
    get message() {
        if (this.textFileService.isDirty(this.uri)) {
            return nls.localize('breakpointDirtydHover', 'Unverified breakpoint. File is modified, please restart debug session.');
        }
        return super.message;
    }
    get adapterData() {
        return this.data && this.data.source && this.data.source.adapterData
            ? this.data.source.adapterData
            : this._adapterData;
    }
    get endLineNumber() {
        return this.verified && this.data ? this.data.endLine : undefined;
    }
    get endColumn() {
        return this.verified && this.data ? this.data.endColumn : undefined;
    }
    get sessionAgnosticData() {
        return {
            lineNumber: this._lineNumber,
            column: this._column,
        };
    }
    get supported() {
        if (!this.data) {
            return true;
        }
        if (this.logMessage && !this.data.supportsLogPoints) {
            return false;
        }
        if (this.condition && !this.data.supportsConditionalBreakpoints) {
            return false;
        }
        if (this.hitCondition && !this.data.supportsHitConditionalBreakpoints) {
            return false;
        }
        return true;
    }
    setSessionData(sessionId, data) {
        super.setSessionData(sessionId, data);
        if (!this._adapterData) {
            this._adapterData = this.adapterData;
        }
    }
    toJSON() {
        return {
            ...super.toJSON(),
            uri: this._uri,
            lineNumber: this._lineNumber,
            column: this._column,
            adapterData: this.adapterData,
            triggeredBy: this.triggeredBy,
        };
    }
    toString() {
        return `${resources.basenameOrAuthority(this.uri)} ${this.lineNumber}`;
    }
    setSessionDidTrigger(sessionId, didTrigger = true) {
        if (didTrigger) {
            this.sessionsDidTrigger ??= new Set();
            this.sessionsDidTrigger.add(sessionId);
        }
        else {
            this.sessionsDidTrigger?.delete(sessionId);
        }
    }
    getSessionDidTrigger(sessionId) {
        return !!this.sessionsDidTrigger?.has(sessionId);
    }
    update(data) {
        if (data.hasOwnProperty('lineNumber') && !isUndefinedOrNull(data.lineNumber)) {
            this._lineNumber = data.lineNumber;
        }
        if (data.hasOwnProperty('column')) {
            this._column = data.column;
        }
        if (data.hasOwnProperty('condition')) {
            this.condition = data.condition;
        }
        if (data.hasOwnProperty('hitCondition')) {
            this.hitCondition = data.hitCondition;
        }
        if (data.hasOwnProperty('logMessage')) {
            this.logMessage = data.logMessage;
        }
        if (data.hasOwnProperty('mode')) {
            this.mode = data.mode;
            this.modeLabel = data.modeLabel;
        }
        if (data.hasOwnProperty('triggeredBy')) {
            this.triggeredBy = data.triggeredBy;
            this.sessionsDidTrigger = undefined;
        }
    }
}
export class FunctionBreakpoint extends BaseBreakpoint {
    constructor(opts, id = generateUuid()) {
        super(id, opts);
        this.name = opts.name;
    }
    toDAP() {
        return {
            name: this.name,
            condition: this.condition,
            hitCondition: this.hitCondition,
        };
    }
    toJSON() {
        return {
            ...super.toJSON(),
            name: this.name,
        };
    }
    get supported() {
        if (!this.data) {
            return true;
        }
        return this.data.supportsFunctionBreakpoints;
    }
    toString() {
        return this.name;
    }
}
export class DataBreakpoint extends BaseBreakpoint {
    constructor(opts, id = generateUuid()) {
        super(id, opts);
        this.sessionDataIdForAddr = new WeakMap();
        this.description = opts.description;
        if ('dataId' in opts) {
            //  back compat with old saved variables in 1.87
            opts.src = { type: 0 /* DataBreakpointSetType.Variable */, dataId: opts.dataId };
        }
        this.src = opts.src;
        this.canPersist = opts.canPersist;
        this.accessTypes = opts.accessTypes;
        this.accessType = opts.accessType;
        if (opts.initialSessionData) {
            this.sessionDataIdForAddr.set(opts.initialSessionData.session, opts.initialSessionData.dataId);
        }
    }
    async toDAP(session) {
        let dataId;
        if (this.src.type === 0 /* DataBreakpointSetType.Variable */) {
            dataId = this.src.dataId;
        }
        else {
            let sessionDataId = this.sessionDataIdForAddr.get(session);
            if (!sessionDataId) {
                sessionDataId = (await session.dataBytesBreakpointInfo(this.src.address, this.src.bytes))
                    ?.dataId;
                if (!sessionDataId) {
                    return undefined;
                }
                this.sessionDataIdForAddr.set(session, sessionDataId);
            }
            dataId = sessionDataId;
        }
        return {
            dataId,
            accessType: this.accessType,
            condition: this.condition,
            hitCondition: this.hitCondition,
        };
    }
    toJSON() {
        return {
            ...super.toJSON(),
            description: this.description,
            src: this.src,
            accessTypes: this.accessTypes,
            accessType: this.accessType,
            canPersist: this.canPersist,
        };
    }
    get supported() {
        if (!this.data) {
            return true;
        }
        return this.data.supportsDataBreakpoints;
    }
    toString() {
        return this.description;
    }
}
export class ExceptionBreakpoint extends BaseBreakpoint {
    constructor(opts, id = generateUuid()) {
        super(id, opts);
        this.supportedSessions = new Set();
        this.fallback = false;
        this.filter = opts.filter;
        this.label = opts.label;
        this.supportsCondition = opts.supportsCondition;
        this.description = opts.description;
        this.conditionDescription = opts.conditionDescription;
        this.fallback = opts.fallback || false;
    }
    toJSON() {
        return {
            ...super.toJSON(),
            filter: this.filter,
            label: this.label,
            enabled: this.enabled,
            supportsCondition: this.supportsCondition,
            conditionDescription: this.conditionDescription,
            condition: this.condition,
            fallback: this.fallback,
            description: this.description,
        };
    }
    setSupportedSession(sessionId, supported) {
        if (supported) {
            this.supportedSessions.add(sessionId);
        }
        else {
            this.supportedSessions.delete(sessionId);
        }
    }
    /**
     * Used to specify which breakpoints to show when no session is specified.
     * Useful when no session is active and we want to show the exception breakpoints from the last session.
     */
    setFallback(isFallback) {
        this.fallback = isFallback;
    }
    get supported() {
        return true;
    }
    /**
     * Checks if the breakpoint is applicable for the specified session.
     * If sessionId is undefined, returns true if this breakpoint is a fallback breakpoint.
     */
    isSupportedSession(sessionId) {
        return sessionId ? this.supportedSessions.has(sessionId) : this.fallback;
    }
    matches(filter) {
        return (this.filter === filter.filter &&
            this.label === filter.label &&
            this.supportsCondition === !!filter.supportsCondition &&
            this.conditionDescription === filter.conditionDescription &&
            this.description === filter.description);
    }
    toString() {
        return this.label;
    }
}
export class InstructionBreakpoint extends BaseBreakpoint {
    constructor(opts, id = generateUuid()) {
        super(id, opts);
        this.instructionReference = opts.instructionReference;
        this.offset = opts.offset;
        this.canPersist = opts.canPersist;
        this.address = opts.address;
    }
    toDAP() {
        return {
            instructionReference: this.instructionReference,
            condition: this.condition,
            hitCondition: this.hitCondition,
            mode: this.mode,
            offset: this.offset,
        };
    }
    toJSON() {
        return {
            ...super.toJSON(),
            instructionReference: this.instructionReference,
            offset: this.offset,
            canPersist: this.canPersist,
            address: this.address,
        };
    }
    get supported() {
        if (!this.data) {
            return true;
        }
        return this.data.supportsInstructionBreakpoints;
    }
    toString() {
        return this.instructionReference;
    }
}
export class ThreadAndSessionIds {
    constructor(sessionId, threadId) {
        this.sessionId = sessionId;
        this.threadId = threadId;
    }
    getId() {
        return `${this.sessionId}:${this.threadId}`;
    }
}
let DebugModel = class DebugModel extends Disposable {
    constructor(debugStorage, textFileService, uriIdentityService, logService) {
        super();
        this.textFileService = textFileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.schedulers = new Map();
        this.breakpointsActivated = true;
        this._onDidChangeBreakpoints = this._register(new Emitter());
        this._onDidChangeCallStack = this._register(new Emitter());
        this._onDidChangeWatchExpressions = this._register(new Emitter());
        this._onDidChangeWatchExpressionValue = this._register(new Emitter());
        this._breakpointModes = new Map();
        this._register(autorun((reader) => {
            this.breakpoints = debugStorage.breakpoints.read(reader);
            this.functionBreakpoints = debugStorage.functionBreakpoints.read(reader);
            this.exceptionBreakpoints = debugStorage.exceptionBreakpoints.read(reader);
            this.dataBreakpoints = debugStorage.dataBreakpoints.read(reader);
            this._onDidChangeBreakpoints.fire(undefined);
        }));
        this._register(autorun((reader) => {
            this.watchExpressions = debugStorage.watchExpressions.read(reader);
            this._onDidChangeWatchExpressions.fire(undefined);
        }));
        this._register(trackSetChanges(() => new Set(this.watchExpressions), this.onDidChangeWatchExpressions, (we) => we.onDidChangeValue((e) => this._onDidChangeWatchExpressionValue.fire(e))));
        this.instructionBreakpoints = [];
        this.sessions = [];
    }
    getId() {
        return 'root';
    }
    getSession(sessionId, includeInactive = false) {
        if (sessionId) {
            return this.getSessions(includeInactive).find((s) => s.getId() === sessionId);
        }
        return undefined;
    }
    getSessions(includeInactive = false) {
        // By default do not return inactive sessions.
        // However we are still holding onto inactive sessions due to repl and debug service session revival (eh scenario)
        return this.sessions.filter((s) => includeInactive || s.state !== 0 /* State.Inactive */);
    }
    addSession(session) {
        this.sessions = this.sessions.filter((s) => {
            if (s.getId() === session.getId()) {
                // Make sure to de-dupe if a session is re-initialized. In case of EH debugging we are adding a session again after an attach.
                return false;
            }
            if (s.state === 0 /* State.Inactive */ && s.configuration.name === session.configuration.name) {
                // Make sure to remove all inactive sessions that are using the same configuration as the new session
                return false;
            }
            return true;
        });
        let i = 1;
        while (this.sessions.some((s) => s.getLabel() === session.getLabel())) {
            session.setName(`${session.configuration.name} ${++i}`);
        }
        let index = -1;
        if (session.parentSession) {
            // Make sure that child sessions are placed after the parent session
            index = findLastIdx(this.sessions, (s) => s.parentSession === session.parentSession || s === session.parentSession);
        }
        if (index >= 0) {
            this.sessions.splice(index + 1, 0, session);
        }
        else {
            this.sessions.push(session);
        }
        this._onDidChangeCallStack.fire(undefined);
    }
    get onDidChangeBreakpoints() {
        return this._onDidChangeBreakpoints.event;
    }
    get onDidChangeCallStack() {
        return this._onDidChangeCallStack.event;
    }
    get onDidChangeWatchExpressions() {
        return this._onDidChangeWatchExpressions.event;
    }
    get onDidChangeWatchExpressionValue() {
        return this._onDidChangeWatchExpressionValue.event;
    }
    rawUpdate(data) {
        const session = this.sessions.find((p) => p.getId() === data.sessionId);
        if (session) {
            session.rawUpdate(data);
            this._onDidChangeCallStack.fire(undefined);
        }
    }
    clearThreads(id, removeThreads, reference = undefined) {
        const session = this.sessions.find((p) => p.getId() === id);
        this.schedulers.forEach((entry) => {
            entry.scheduler.dispose();
            entry.completeDeferred.complete();
        });
        this.schedulers.clear();
        if (session) {
            session.clearThreads(removeThreads, reference);
            this._onDidChangeCallStack.fire(undefined);
        }
    }
    /**
     * Update the call stack and notify the call stack view that changes have occurred.
     */
    async fetchCallstack(thread, levels) {
        if (thread.reachedEndOfCallStack) {
            return;
        }
        const totalFrames = thread.stoppedDetails?.totalFrames;
        const remainingFrames = typeof totalFrames === 'number' ? totalFrames - thread.getCallStack().length : undefined;
        if (!levels || (remainingFrames && levels > remainingFrames)) {
            levels = remainingFrames;
        }
        if (levels && levels > 0) {
            await thread.fetchCallStack(levels);
            this._onDidChangeCallStack.fire();
        }
        return;
    }
    refreshTopOfCallstack(thread, fetchFullStack = true) {
        if (thread.session.capabilities.supportsDelayedStackTraceLoading) {
            // For improved performance load the first stack frame and then load the rest async.
            let topCallStack = Promise.resolve();
            const wholeCallStack = new Promise((c, e) => {
                topCallStack = thread.fetchCallStack(1).then(() => {
                    if (!fetchFullStack) {
                        c();
                        this._onDidChangeCallStack.fire();
                        return;
                    }
                    if (!this.schedulers.has(thread.getId())) {
                        const deferred = new DeferredPromise();
                        this.schedulers.set(thread.getId(), {
                            completeDeferred: deferred,
                            scheduler: new RunOnceScheduler(() => {
                                thread
                                    .fetchCallStack(19)
                                    .then(() => {
                                    const stale = thread.getStaleCallStack();
                                    const current = thread.getCallStack();
                                    let bottomOfCallStackChanged = stale.length !== current.length;
                                    for (let i = 1; i < stale.length && !bottomOfCallStackChanged; i++) {
                                        bottomOfCallStackChanged = !stale[i].equals(current[i]);
                                    }
                                    if (bottomOfCallStackChanged) {
                                        this._onDidChangeCallStack.fire();
                                    }
                                })
                                    .finally(() => {
                                    deferred.complete();
                                    this.schedulers.delete(thread.getId());
                                });
                            }, 420),
                        });
                    }
                    const entry = this.schedulers.get(thread.getId());
                    entry.scheduler.schedule();
                    entry.completeDeferred.p.then(c, e);
                    this._onDidChangeCallStack.fire();
                });
            });
            return { topCallStack, wholeCallStack };
        }
        const wholeCallStack = thread.fetchCallStack();
        return { wholeCallStack, topCallStack: wholeCallStack };
    }
    getBreakpoints(filter) {
        if (filter) {
            const uriStr = filter.uri?.toString();
            const originalUriStr = filter.originalUri?.toString();
            return this.breakpoints.filter((bp) => {
                if (uriStr && bp.uri.toString() !== uriStr) {
                    return false;
                }
                if (originalUriStr && bp.originalUri.toString() !== originalUriStr) {
                    return false;
                }
                if (filter.lineNumber && bp.lineNumber !== filter.lineNumber) {
                    return false;
                }
                if (filter.column && bp.column !== filter.column) {
                    return false;
                }
                if (filter.enabledOnly && (!this.breakpointsActivated || !bp.enabled)) {
                    return false;
                }
                if (filter.triggeredOnly && bp.triggeredBy === undefined) {
                    return false;
                }
                return true;
            });
        }
        return this.breakpoints;
    }
    getFunctionBreakpoints() {
        return this.functionBreakpoints;
    }
    getDataBreakpoints() {
        return this.dataBreakpoints;
    }
    getExceptionBreakpoints() {
        return this.exceptionBreakpoints;
    }
    getExceptionBreakpointsForSession(sessionId) {
        return this.exceptionBreakpoints.filter((ebp) => ebp.isSupportedSession(sessionId));
    }
    getInstructionBreakpoints() {
        return this.instructionBreakpoints;
    }
    setExceptionBreakpointsForSession(sessionId, filters) {
        if (!filters) {
            return;
        }
        let didChangeBreakpoints = false;
        filters.forEach((d) => {
            let ebp = this.exceptionBreakpoints.filter((exbp) => exbp.matches(d)).pop();
            if (!ebp) {
                didChangeBreakpoints = true;
                ebp = new ExceptionBreakpoint({
                    filter: d.filter,
                    label: d.label,
                    enabled: !!d.default,
                    supportsCondition: !!d.supportsCondition,
                    description: d.description,
                    conditionDescription: d.conditionDescription,
                });
                this.exceptionBreakpoints.push(ebp);
            }
            ebp.setSupportedSession(sessionId, true);
        });
        if (didChangeBreakpoints) {
            this._onDidChangeBreakpoints.fire(undefined);
        }
    }
    removeExceptionBreakpointsForSession(sessionId) {
        this.exceptionBreakpoints.forEach((ebp) => ebp.setSupportedSession(sessionId, false));
    }
    // Set last focused session as fallback session.
    // This is done to keep track of the exception breakpoints to show when no session is active.
    setExceptionBreakpointFallbackSession(sessionId) {
        this.exceptionBreakpoints.forEach((ebp) => ebp.setFallback(ebp.isSupportedSession(sessionId)));
    }
    setExceptionBreakpointCondition(exceptionBreakpoint, condition) {
        ;
        exceptionBreakpoint.condition = condition;
        this._onDidChangeBreakpoints.fire(undefined);
    }
    areBreakpointsActivated() {
        return this.breakpointsActivated;
    }
    setBreakpointsActivated(activated) {
        this.breakpointsActivated = activated;
        this._onDidChangeBreakpoints.fire(undefined);
    }
    addBreakpoints(uri, rawData, fireEvent = true) {
        const newBreakpoints = rawData.map((rawBp) => {
            return new Breakpoint({
                uri,
                lineNumber: rawBp.lineNumber,
                column: rawBp.column,
                enabled: rawBp.enabled ?? true,
                condition: rawBp.condition,
                hitCondition: rawBp.hitCondition,
                logMessage: rawBp.logMessage,
                triggeredBy: rawBp.triggeredBy,
                adapterData: undefined,
                mode: rawBp.mode,
                modeLabel: rawBp.modeLabel,
            }, this.textFileService, this.uriIdentityService, this.logService, rawBp.id);
        });
        this.breakpoints = this.breakpoints.concat(newBreakpoints);
        this.breakpointsActivated = true;
        this.sortAndDeDup();
        if (fireEvent) {
            this._onDidChangeBreakpoints.fire({ added: newBreakpoints, sessionOnly: false });
        }
        return newBreakpoints;
    }
    removeBreakpoints(toRemove) {
        this.breakpoints = this.breakpoints.filter((bp) => !toRemove.some((toRemove) => toRemove.getId() === bp.getId()));
        this._onDidChangeBreakpoints.fire({ removed: toRemove, sessionOnly: false });
    }
    updateBreakpoints(data) {
        const updated = [];
        this.breakpoints.forEach((bp) => {
            const bpData = data.get(bp.getId());
            if (bpData) {
                bp.update(bpData);
                updated.push(bp);
            }
        });
        this.sortAndDeDup();
        this._onDidChangeBreakpoints.fire({ changed: updated, sessionOnly: false });
    }
    setBreakpointSessionData(sessionId, capabilites, data) {
        this.breakpoints.forEach((bp) => {
            if (!data) {
                bp.setSessionData(sessionId, undefined);
            }
            else {
                const bpData = data.get(bp.getId());
                if (bpData) {
                    bp.setSessionData(sessionId, toBreakpointSessionData(bpData, capabilites));
                }
            }
        });
        this.functionBreakpoints.forEach((fbp) => {
            if (!data) {
                fbp.setSessionData(sessionId, undefined);
            }
            else {
                const fbpData = data.get(fbp.getId());
                if (fbpData) {
                    fbp.setSessionData(sessionId, toBreakpointSessionData(fbpData, capabilites));
                }
            }
        });
        this.dataBreakpoints.forEach((dbp) => {
            if (!data) {
                dbp.setSessionData(sessionId, undefined);
            }
            else {
                const dbpData = data.get(dbp.getId());
                if (dbpData) {
                    dbp.setSessionData(sessionId, toBreakpointSessionData(dbpData, capabilites));
                }
            }
        });
        this.exceptionBreakpoints.forEach((ebp) => {
            if (!data) {
                ebp.setSessionData(sessionId, undefined);
            }
            else {
                const ebpData = data.get(ebp.getId());
                if (ebpData) {
                    ebp.setSessionData(sessionId, toBreakpointSessionData(ebpData, capabilites));
                }
            }
        });
        this.instructionBreakpoints.forEach((ibp) => {
            if (!data) {
                ibp.setSessionData(sessionId, undefined);
            }
            else {
                const ibpData = data.get(ibp.getId());
                if (ibpData) {
                    ibp.setSessionData(sessionId, toBreakpointSessionData(ibpData, capabilites));
                }
            }
        });
        this._onDidChangeBreakpoints.fire({
            sessionOnly: true,
        });
    }
    getDebugProtocolBreakpoint(breakpointId, sessionId) {
        const bp = this.breakpoints.find((bp) => bp.getId() === breakpointId);
        if (bp) {
            return bp.getDebugProtocolBreakpoint(sessionId);
        }
        return undefined;
    }
    getBreakpointModes(forBreakpointType) {
        return [...this._breakpointModes.values()].filter((mode) => mode.appliesTo.includes(forBreakpointType));
    }
    registerBreakpointModes(debugType, modes) {
        for (const mode of modes) {
            const key = `${mode.mode}/${mode.label}`;
            const rec = this._breakpointModes.get(key);
            if (rec) {
                for (const target of mode.appliesTo) {
                    if (!rec.appliesTo.includes(target)) {
                        rec.appliesTo.push(target);
                    }
                }
            }
            else {
                const duplicate = [...this._breakpointModes.values()].find((r) => r !== rec && r.label === mode.label);
                if (duplicate) {
                    duplicate.label = `${duplicate.label} (${duplicate.firstFromDebugType})`;
                }
                this._breakpointModes.set(key, {
                    mode: mode.mode,
                    label: duplicate ? `${mode.label} (${debugType})` : mode.label,
                    firstFromDebugType: debugType,
                    description: mode.description,
                    appliesTo: mode.appliesTo.slice(), // avoid later mutations
                });
            }
        }
    }
    sortAndDeDup() {
        this.breakpoints = this.breakpoints.sort((first, second) => {
            if (first.uri.toString() !== second.uri.toString()) {
                return resources
                    .basenameOrAuthority(first.uri)
                    .localeCompare(resources.basenameOrAuthority(second.uri));
            }
            if (first.lineNumber === second.lineNumber) {
                if (first.column && second.column) {
                    return first.column - second.column;
                }
                return 1;
            }
            return first.lineNumber - second.lineNumber;
        });
        this.breakpoints = distinct(this.breakpoints, (bp) => `${bp.uri.toString()}:${bp.lineNumber}:${bp.column}`);
    }
    setEnablement(element, enable) {
        if (element instanceof Breakpoint ||
            element instanceof FunctionBreakpoint ||
            element instanceof ExceptionBreakpoint ||
            element instanceof DataBreakpoint ||
            element instanceof InstructionBreakpoint) {
            const changed = [];
            if (element.enabled !== enable &&
                (element instanceof Breakpoint ||
                    element instanceof FunctionBreakpoint ||
                    element instanceof DataBreakpoint ||
                    element instanceof InstructionBreakpoint)) {
                changed.push(element);
            }
            element.enabled = enable;
            if (enable) {
                this.breakpointsActivated = true;
            }
            this._onDidChangeBreakpoints.fire({ changed: changed, sessionOnly: false });
        }
    }
    enableOrDisableAllBreakpoints(enable) {
        const changed = [];
        this.breakpoints.forEach((bp) => {
            if (bp.enabled !== enable) {
                changed.push(bp);
            }
            bp.enabled = enable;
        });
        this.functionBreakpoints.forEach((fbp) => {
            if (fbp.enabled !== enable) {
                changed.push(fbp);
            }
            fbp.enabled = enable;
        });
        this.dataBreakpoints.forEach((dbp) => {
            if (dbp.enabled !== enable) {
                changed.push(dbp);
            }
            dbp.enabled = enable;
        });
        this.instructionBreakpoints.forEach((ibp) => {
            if (ibp.enabled !== enable) {
                changed.push(ibp);
            }
            ibp.enabled = enable;
        });
        if (enable) {
            this.breakpointsActivated = true;
        }
        this._onDidChangeBreakpoints.fire({ changed: changed, sessionOnly: false });
    }
    addFunctionBreakpoint(opts, id) {
        const newFunctionBreakpoint = new FunctionBreakpoint(opts, id);
        this.functionBreakpoints.push(newFunctionBreakpoint);
        this._onDidChangeBreakpoints.fire({ added: [newFunctionBreakpoint], sessionOnly: false });
        return newFunctionBreakpoint;
    }
    updateFunctionBreakpoint(id, update) {
        const functionBreakpoint = this.functionBreakpoints.find((fbp) => fbp.getId() === id);
        if (functionBreakpoint) {
            if (typeof update.name === 'string') {
                functionBreakpoint.name = update.name;
            }
            if (typeof update.condition === 'string') {
                functionBreakpoint.condition = update.condition;
            }
            if (typeof update.hitCondition === 'string') {
                functionBreakpoint.hitCondition = update.hitCondition;
            }
            this._onDidChangeBreakpoints.fire({ changed: [functionBreakpoint], sessionOnly: false });
        }
    }
    removeFunctionBreakpoints(id) {
        let removed;
        if (id) {
            removed = this.functionBreakpoints.filter((fbp) => fbp.getId() === id);
            this.functionBreakpoints = this.functionBreakpoints.filter((fbp) => fbp.getId() !== id);
        }
        else {
            removed = this.functionBreakpoints;
            this.functionBreakpoints = [];
        }
        this._onDidChangeBreakpoints.fire({ removed, sessionOnly: false });
    }
    addDataBreakpoint(opts, id) {
        const newDataBreakpoint = new DataBreakpoint(opts, id);
        this.dataBreakpoints.push(newDataBreakpoint);
        this._onDidChangeBreakpoints.fire({ added: [newDataBreakpoint], sessionOnly: false });
    }
    updateDataBreakpoint(id, update) {
        const dataBreakpoint = this.dataBreakpoints.find((fbp) => fbp.getId() === id);
        if (dataBreakpoint) {
            if (typeof update.condition === 'string') {
                dataBreakpoint.condition = update.condition;
            }
            if (typeof update.hitCondition === 'string') {
                dataBreakpoint.hitCondition = update.hitCondition;
            }
            this._onDidChangeBreakpoints.fire({ changed: [dataBreakpoint], sessionOnly: false });
        }
    }
    removeDataBreakpoints(id) {
        let removed;
        if (id) {
            removed = this.dataBreakpoints.filter((fbp) => fbp.getId() === id);
            this.dataBreakpoints = this.dataBreakpoints.filter((fbp) => fbp.getId() !== id);
        }
        else {
            removed = this.dataBreakpoints;
            this.dataBreakpoints = [];
        }
        this._onDidChangeBreakpoints.fire({ removed, sessionOnly: false });
    }
    addInstructionBreakpoint(opts) {
        const newInstructionBreakpoint = new InstructionBreakpoint(opts);
        this.instructionBreakpoints.push(newInstructionBreakpoint);
        this._onDidChangeBreakpoints.fire({ added: [newInstructionBreakpoint], sessionOnly: true });
    }
    removeInstructionBreakpoints(instructionReference, offset) {
        let removed = [];
        if (instructionReference) {
            for (let i = 0; i < this.instructionBreakpoints.length; i++) {
                const ibp = this.instructionBreakpoints[i];
                if (ibp.instructionReference === instructionReference &&
                    (offset === undefined || ibp.offset === offset)) {
                    removed.push(ibp);
                    this.instructionBreakpoints.splice(i--, 1);
                }
            }
        }
        else {
            removed = this.instructionBreakpoints;
            this.instructionBreakpoints = [];
        }
        this._onDidChangeBreakpoints.fire({ removed, sessionOnly: false });
    }
    getWatchExpressions() {
        return this.watchExpressions;
    }
    addWatchExpression(name) {
        const we = new Expression(name || '');
        this.watchExpressions.push(we);
        this._onDidChangeWatchExpressions.fire(we);
        return we;
    }
    renameWatchExpression(id, newName) {
        const filtered = this.watchExpressions.filter((we) => we.getId() === id);
        if (filtered.length === 1) {
            filtered[0].name = newName;
            this._onDidChangeWatchExpressions.fire(filtered[0]);
        }
    }
    removeWatchExpressions(id = null) {
        this.watchExpressions = id ? this.watchExpressions.filter((we) => we.getId() !== id) : [];
        this._onDidChangeWatchExpressions.fire(undefined);
    }
    moveWatchExpression(id, position) {
        const we = this.watchExpressions.find((we) => we.getId() === id);
        if (we) {
            this.watchExpressions = this.watchExpressions.filter((we) => we.getId() !== id);
            this.watchExpressions = this.watchExpressions
                .slice(0, position)
                .concat(we, this.watchExpressions.slice(position));
            this._onDidChangeWatchExpressions.fire(undefined);
        }
    }
    sourceIsNotAvailable(uri) {
        this.sessions.forEach((s) => {
            const source = s.getSourceForUri(uri);
            if (source) {
                source.available = false;
            }
        });
        this._onDidChangeCallStack.fire(undefined);
    }
};
DebugModel = __decorate([
    __param(1, ITextFileService),
    __param(2, IUriIdentityService),
    __param(3, ILogService)
], DebugModel);
export { DebugModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBUyxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBYyxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFNUYsT0FBTyxFQUNOLG1CQUFtQixFQWdDbkIsbUJBQW1CLEdBQ25CLE1BQU0sWUFBWSxDQUFBO0FBQ25CLE9BQU8sRUFBVSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBR2pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRWhFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBTWpGLE1BQU0sT0FBTyxtQkFBbUI7YUFDUixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWtCLEFBQTVCLENBQTRCO0lBQzVELDhDQUE4QzthQUN0QixvQkFBZSxHQUFHLEdBQUcsQUFBTixDQUFNO0lBTzdDLFlBQ1csT0FBa0MsRUFDekIsUUFBNEIsRUFDdkMsVUFBOEIsRUFDckIsRUFBVSxFQUNwQixpQkFBcUMsQ0FBQyxFQUN0QyxtQkFBdUMsQ0FBQyxFQUN4QyxrQkFBc0MsU0FBUyxFQUM5QyxtQkFBdUMsQ0FBQyxFQUN6QyxtQkFBdUUsU0FBUyxFQUNoRix5QkFBNkMsU0FBUztRQVRuRCxZQUFPLEdBQVAsT0FBTyxDQUEyQjtRQUN6QixhQUFRLEdBQVIsUUFBUSxDQUFvQjtRQUN2QyxlQUFVLEdBQVYsVUFBVSxDQUFvQjtRQUNyQixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBQ3BCLG1CQUFjLEdBQWQsY0FBYyxDQUF3QjtRQUN0QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXdCO1FBQ3hDLG9CQUFlLEdBQWYsZUFBZSxDQUFnQztRQUM5QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXdCO1FBQ3pDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBZ0U7UUFDaEYsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFnQztRQWR2RCxpQkFBWSxHQUFHLEtBQUssQ0FBQTtRQUNuQixXQUFNLEdBQVcsRUFBRSxDQUFBO0lBY3hCLENBQUM7SUFFSixJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztJQUVELElBQUksU0FBUyxDQUFDLEtBQXlCO1FBQ3RDLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFBLENBQUMsNEJBQTRCO0lBQ3ZELENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWTtRQUNqQixJQUFJLE9BQU8sSUFBSSxDQUFDLFNBQVMsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUMzQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQVEsQ0FBQyxTQUFTLENBQzdDLElBQUksQ0FBQyxTQUFTLEVBQ2QsSUFBSSxDQUFDLFFBQVEsRUFDYixTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1FBQ0QsSUFDQyxDQUFDLFFBQVE7WUFDVCxDQUFDLFFBQVEsQ0FBQyxJQUFJO1lBQ2QsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVM7WUFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFDbkMsQ0FBQztZQUNGLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsa0JBQWtCLENBQUE7UUFDNUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBQzVCLElBQUksQ0FBQyxjQUFjLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFBO1FBQ2pELElBQUksQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQTtRQUMvQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFBO1FBQ2pELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUE7UUFDN0Qsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRVMsaUJBQWlCLENBQUMsUUFBZ0MsSUFBUyxDQUFDO0lBRXRFLFdBQVc7UUFDVixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3JDLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQy9CLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzVELENBQUM7UUFFRCwyRkFBMkY7UUFDM0YsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWM7WUFDbkMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQztZQUMxRCxDQUFDLENBQUMsRUFBRSxDQUFBO1FBRUwsaUVBQWlFO1FBQ2pFLElBQUksU0FBUyxHQUFHLG1CQUFtQixDQUFDLGVBQWUsQ0FBQTtRQUNuRCxPQUNDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCO1lBQ3ZCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLEdBQUcsbUJBQW1CLENBQUMsZUFBZSxFQUN0RSxDQUFDO1lBQ0YsU0FBUyxJQUFJLG1CQUFtQixDQUFDLGVBQWUsQ0FBQTtRQUNqRCxDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLEVBQUUsQ0FBQztZQUNsRSwyRkFBMkY7WUFDM0YsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLENBQUE7WUFDbkUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGNBQWMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN6QyxNQUFNLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFBO2dCQUMxRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFBO2dCQUN4RSxRQUFRLENBQUMsSUFBSSxDQUNaLElBQUksUUFBUSxDQUNYLElBQUksQ0FBQyxPQUFPLEVBQ1osSUFBSSxDQUFDLFFBQVEsRUFDYixJQUFJLEVBQ0osSUFBSSxDQUFDLFNBQVMsRUFDZCxJQUFJLEtBQUssS0FBSyxLQUFLLEdBQUcsS0FBSyxHQUFHLENBQUMsR0FBRyxFQUNsQyxFQUFFLEVBQ0YsRUFBRSxFQUNGLFNBQVMsRUFDVCxLQUFLLEVBQ0wsU0FBUyxFQUNULEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUNuQixTQUFTLEVBQ1QsU0FBUyxFQUNULElBQUksRUFDSixLQUFLLENBQ0wsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztZQUVELE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQzFDLElBQUksQ0FBQyxnQkFBZ0IsRUFDckIsSUFBSSxDQUFDLGdCQUFnQixFQUNyQixTQUFTLENBQ1QsQ0FBQTtRQUNELE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQTtJQUNmLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLG1EQUFtRDtRQUNuRCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQTtJQUM5RSxDQUFDO0lBRU8sS0FBSyxDQUFDLGNBQWMsQ0FDM0IsS0FBeUIsRUFDekIsS0FBeUIsRUFDekIsTUFBdUM7UUFFdkMsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBUSxDQUFDLFNBQVMsQ0FDN0MsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLEVBQ25CLElBQUksQ0FBQyxRQUFRLEVBQ2IsTUFBTSxFQUNOLEtBQUssRUFDTCxLQUFLLENBQ0wsQ0FBQTtZQUNELElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDN0QsT0FBTyxFQUFFLENBQUE7WUFDVixDQUFDO1lBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7WUFDM0MsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTO2lCQUNsQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ2xCLEdBQUcsQ0FBQyxDQUFDLENBQW9DLEVBQUUsRUFBRTtnQkFDN0MsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsa0JBQWtCLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3ZGLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDeEMsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtvQkFDNUQsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDaEMsT0FBTyxJQUFJLFFBQVEsQ0FDbEIsSUFBSSxDQUFDLE9BQU8sRUFDWixJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksRUFDSixDQUFDLENBQUMsa0JBQWtCLEVBQ3BCLENBQUMsQ0FBQyxJQUFJLEVBQ04sQ0FBQyxDQUFDLFlBQVksRUFDZCxDQUFDLENBQUMsS0FBSyxFQUNQLENBQUMsQ0FBQyxjQUFjLEVBQ2hCLENBQUMsQ0FBQyxnQkFBZ0IsRUFDbEIsQ0FBQyxDQUFDLGVBQWUsRUFDakIsQ0FBQyxDQUFDLGdCQUFnQixFQUNsQixDQUFDLENBQUMsSUFBSSxFQUNOLENBQUMsQ0FBQywyQkFBMkIsRUFDN0IsSUFBSSxFQUNKLENBQUMsRUFDRCxrQkFBa0IsRUFDbEIsQ0FBQyxDQUFDLDRCQUE0QixFQUM5QixDQUFDLENBQUMsc0JBQXNCLENBQ3hCLENBQUE7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLElBQUksUUFBUSxDQUNsQixJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxFQUNKLENBQUMsRUFDRCxFQUFFLEVBQ0YsU0FBUyxFQUNULEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsNkJBQTZCLENBQUMsRUFDeEUsQ0FBQyxFQUNELENBQUMsRUFDRCxTQUFTLEVBQ1QsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEVBQ25CLFNBQVMsRUFDVCxTQUFTLEVBQ1QsS0FBSyxDQUNMLENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtZQUVILElBQUksSUFBSSxDQUFDLE9BQVEsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLElBQUksSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pGLENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osT0FBTztnQkFDTixJQUFJLFFBQVEsQ0FDWCxJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxFQUNKLENBQUMsRUFDRCxFQUFFLEVBQ0YsU0FBUyxFQUNULENBQUMsQ0FBQyxPQUFPLEVBQ1QsQ0FBQyxFQUNELENBQUMsRUFDRCxTQUFTLEVBQ1QsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEVBQ25CLFNBQVMsRUFDVCxTQUFTLEVBQ1QsS0FBSyxDQUNMO2FBQ0QsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsK0hBQStIO0lBQy9ILElBQVksbUJBQW1CO1FBQzlCLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUMvQixDQUFDO0lBRUQsSUFBSSxLQUFLLENBQUMsS0FBYTtRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUNuQixJQUFJLENBQUMsWUFBWTtZQUNoQixDQUFDLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2pELG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssVUFBVSxDQUFDLGFBQWE7Z0JBQzVFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssS0FBSyxDQUFBO1FBQzFELG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQ3ZCLFVBQWtCLEVBQ2xCLE9BQWtDLEVBQ2xDLFVBQW1DLEVBQ25DLE9BQWUsRUFDZixZQUFZLEdBQUcsS0FBSyxFQUNwQixRQUFpQztRQUVqQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxVQUFVLElBQUksT0FBTyxLQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDckQsSUFBSSxDQUFDLEtBQUs7Z0JBQ1QsT0FBTyxLQUFLLE1BQU07b0JBQ2pCLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHNEQUFzRCxDQUFDO29CQUN6RixDQUFDLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQTtZQUM1QixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtZQUNsQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtRQUN0QixJQUFJLENBQUM7WUFDSixNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQ3RDLFVBQVUsRUFDVixVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFDM0MsT0FBTyxFQUNQLFFBQVEsQ0FDUixDQUFBO1lBRUQsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQTtnQkFDdkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFBO2dCQUNqRCxJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFBO2dCQUNsRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtnQkFDdEQsSUFBSSxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQTtnQkFDcEQsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFBO2dCQUMzQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtnQkFDdEQsSUFBSSxDQUFDLHNCQUFzQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUE7Z0JBRWxFLElBQUksQ0FBQyxZQUFZLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsQ0FBQztvQkFDM0QsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7Z0JBQzFCLENBQUM7Z0JBRUQsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUE7WUFDNUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUE7WUFDbEIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO0lBQ0YsQ0FBQzs7QUFHRixTQUFTLGlCQUFpQixDQUN6QixVQUErQixFQUMvQixRQUE2RjtJQUU3RixJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDL0IsVUFBVSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUE7UUFDNUMsVUFBVSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFBO1FBQ3ZELFVBQVUsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQTtRQUN2RCxVQUFVLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFBO1FBQ3hELFVBQVUsQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFBO1FBQzVELG9HQUFvRztJQUNyRyxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sT0FBTyxvQkFBb0I7SUFJaEMsWUFBWTtRQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFDRCxXQUFXO1FBQ1YsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzFGLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFBO0lBQ2YsQ0FBQztJQUVELElBQUksSUFBSTtRQUNQLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLCtDQUF1QyxDQUFBO0lBQzdFLENBQUM7SUFFRCxZQUNrQixPQUFrQyxFQUNsQyxVQUFtQyxFQUNwQyxNQUFjLEVBQ2QsUUFBcUMsRUFDckMsUUFBbUI7UUFKbEIsWUFBTyxHQUFQLE9BQU8sQ0FBMkI7UUFDbEMsZUFBVSxHQUFWLFVBQVUsQ0FBeUI7UUFDcEMsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLGFBQVEsR0FBUixRQUFRLENBQTZCO1FBQ3JDLGFBQVEsR0FBUixRQUFRLENBQVc7UUE5Qm5CLE9BQUUsR0FBRyxZQUFZLEVBQUUsQ0FBQTtJQStCakMsQ0FBQztJQUVHLFVBQVU7UUFDaEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7SUFFRCx1RkFBdUY7SUFDaEYsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFnQjtRQUNqQyxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUN4RSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFBO1lBQzdCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxVQUFXLFNBQVEsbUJBQW1CO2FBQ2xDLGtCQUFhLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLEFBQWhELENBQWdEO0lBTzdFLFlBQ1EsSUFBWSxFQUNuQixFQUFFLEdBQUcsWUFBWSxFQUFFO1FBRW5CLEtBQUssQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUgzQixTQUFJLEdBQUosSUFBSSxDQUFRO1FBSkgsc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQWUsQ0FBQTtRQUMvQyxxQkFBZ0IsR0FBdUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtRQU9sRixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUN0Qix3REFBd0Q7UUFDeEQsbUVBQW1FO1FBQ25FLElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUE7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsUUFBUSxDQUNiLE9BQWtDLEVBQ2xDLFVBQW1DLEVBQ25DLE9BQWUsRUFDZixZQUFzQixFQUN0QixRQUFpQztRQUVqQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVUsQ0FBQyxhQUFhLENBQUE7UUFDL0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FDN0MsSUFBSSxDQUFDLElBQUksRUFDVCxPQUFPLEVBQ1AsVUFBVSxFQUNWLE9BQU8sRUFDUCxZQUFZLEVBQ1osUUFBUSxDQUNSLENBQUE7UUFDRCxJQUFJLGVBQWUsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsQyxDQUFDO0lBQ0YsQ0FBQztJQUVRLFFBQVE7UUFDaEIsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3JDLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQWEsRUFBRSxVQUF1QjtRQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkYsaUJBQWlCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7O0FBR0YsTUFBTSxPQUFPLFFBQVMsU0FBUSxtQkFBbUI7SUFJaEQsWUFDQyxPQUFrQyxFQUNsQyxRQUE0QixFQUNaLE1BQTRCLEVBQzVDLFNBQTZCLEVBQ2IsSUFBWSxFQUNyQixZQUFnQyxFQUN2QyxLQUF5QixFQUN6QixjQUFrQyxFQUNsQyxnQkFBb0MsRUFDcEMsZUFBbUMsRUFDbkMsZ0JBQW9FLEVBQ3BFLE9BQTJCLFNBQVMsRUFDcEIsc0JBQTBDLFNBQVMsRUFDbkQsWUFBWSxJQUFJLEVBQ2hDLGdCQUFnQixHQUFHLENBQUMsRUFDcEIsa0JBQWtCLEdBQUcsRUFBRSxFQUNQLCtCQUFtRCxTQUFTLEVBQzVFLHlCQUE2QyxTQUFTO1FBRXRELEtBQUssQ0FDSixPQUFPLEVBQ1AsUUFBUSxFQUNSLFNBQVMsRUFDVCxZQUFZLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxJQUFJLElBQUksa0JBQWtCLEVBQUUsRUFDMUQsY0FBYyxFQUNkLGdCQUFnQixFQUNoQixlQUFlLEVBQ2YsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQixzQkFBc0IsQ0FDdEIsQ0FBQTtRQTVCZSxXQUFNLEdBQU4sTUFBTSxDQUFzQjtRQUU1QixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ3JCLGlCQUFZLEdBQVosWUFBWSxDQUFvQjtRQU92Qix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQWdDO1FBQ25ELGNBQVMsR0FBVCxTQUFTLENBQU87UUFHaEIsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUFnQztRQWU1RSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUE7UUFDeEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7SUFDakIsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBYSxFQUFFLFVBQXVCO1FBQ3ZELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSiwySkFBMko7WUFDM0osSUFDQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxxQkFBcUI7Z0JBQy9DLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsbUJBQW1CO2dCQUM5QyxJQUFJLENBQUMsWUFBWSxFQUNoQixDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDN0MsQ0FBQztZQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQ3hCLElBQUksQ0FBQyxNQUFPLENBQUMsU0FBUyxFQUM1QyxJQUFJLENBQUMsSUFBSSxFQUNULEtBQUssQ0FDTCxDQUFBO1lBQ0QsaUJBQWlCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFBO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFhLEVBQUUsVUFBdUI7UUFDekQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDekMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvRixpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVRLFFBQVE7UUFDaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQzlELENBQUM7SUFFa0IsaUJBQWlCLENBQUMsUUFBZ0M7UUFDcEUsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFBO0lBQzFDLENBQUM7SUFFRCxxQkFBcUI7UUFDcEIsT0FBTztZQUNOLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLGtCQUFrQixFQUFFLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQztZQUN2QyxlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWU7WUFDckMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtTQUMvQixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLEtBQU0sU0FBUSxtQkFBbUI7SUFDN0MsWUFDaUIsVUFBdUIsRUFDdkMsRUFBVSxFQUNNLElBQVksRUFDNUIsU0FBaUIsRUFDVixTQUFrQixFQUN6QixjQUF1QixFQUN2QixnQkFBeUIsRUFDVCxLQUFjO1FBRTlCLEtBQUssQ0FDSixVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFDekIsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQzFCLFNBQVMsRUFDVCxTQUFTLElBQUksSUFBSSxFQUFFLEVBQUUsRUFDckIsY0FBYyxFQUNkLGdCQUFnQixDQUNoQixDQUFBO1FBaEJlLGVBQVUsR0FBVixVQUFVLENBQWE7UUFFdkIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUVyQixjQUFTLEdBQVQsU0FBUyxDQUFTO1FBR1QsVUFBSyxHQUFMLEtBQUssQ0FBUztJQVUvQixDQUFDO0lBRVEsUUFBUTtRQUNoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDakIsQ0FBQztJQUVELHFCQUFxQjtRQUNwQixPQUFPO1lBQ04sSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2Ysa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDO1lBQ3ZDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztTQUN6QixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFVBQVcsU0FBUSxLQUFLO0lBQ3BDLFlBQVksVUFBdUIsRUFBRSxLQUFhLEVBQUUsT0FBZTtRQUNsRSxLQUFLLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFUSxRQUFRO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtJQUNqQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sVUFBVTtJQUd0QixZQUNpQixNQUFjLEVBQ2QsT0FBZSxFQUNmLE1BQWMsRUFDZCxJQUFZLEVBQ1osZ0JBQW9DLEVBQ3BDLEtBQWEsRUFDWixLQUFhLEVBQ2QsVUFBbUIsRUFDbkIsMkJBQW9DO1FBUnBDLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2YsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW9CO1FBQ3BDLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDWixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2QsZUFBVSxHQUFWLFVBQVUsQ0FBUztRQUNuQixnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQVM7SUFDbEQsQ0FBQztJQUVKLEtBQUs7UUFDSixPQUFPLGNBQWMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDN0UsQ0FBQztJQUVELFNBQVM7UUFDUixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQ2hGLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQ1osSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUMxRCxPQUFPLEVBQUUsQ0FBQTtnQkFDVixDQUFDO2dCQUVELE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7Z0JBQ2pDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7b0JBQ3RDLDhEQUE4RDtvQkFDOUQsd0RBQXdEO29CQUN4RCxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7b0JBQ1YsR0FBRyxDQUFDO3dCQUNILEVBQUUsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO29CQUMxRCxDQUFDLFFBQVEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBQztvQkFFekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDZixPQUFPLElBQUksS0FBSyxDQUNmLElBQUksRUFDSixFQUFFLEVBQ0YsRUFBRSxDQUFDLElBQUksRUFDUCxFQUFFLENBQUMsa0JBQWtCLEVBQ3JCLEVBQUUsQ0FBQyxTQUFTLEVBQ1osRUFBRSxDQUFDLGNBQWMsRUFDakIsRUFBRSxDQUFDLGdCQUFnQixFQUNuQixFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsU0FBUzt3QkFDakQsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUM7d0JBQ3pELENBQUMsQ0FBQyxTQUFTLENBQ1osQ0FBQTtnQkFDRixDQUFDLENBQUMsQ0FBQTtZQUNILENBQUMsRUFDRCxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUMvQyxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQixDQUFDLEtBQWE7UUFDeEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDckMsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM3RCxNQUFNLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDL0QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sa0JBQWtCLENBQUE7UUFDMUIsQ0FBQztRQUVELE1BQU0scUJBQXFCLEdBQUcsa0JBQWtCO2FBQzlDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDekUsSUFBSSxDQUNKLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQ2pCLEtBQUssQ0FBQyxLQUFNLENBQUMsYUFBYTtZQUMxQixLQUFLLENBQUMsS0FBTSxDQUFDLGVBQWU7WUFDNUIsQ0FBQyxNQUFNLENBQUMsS0FBTSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBTSxDQUFDLGVBQWUsQ0FBQyxDQUM5RCxDQUFBO1FBQ0YsT0FBTyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQTtJQUNqRixDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0lBRUQsWUFBWTtRQUNYLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxRQUFRO1FBQ1AsTUFBTSxrQkFBa0IsR0FDdkIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ3ZGLE1BQU0sY0FBYyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQTtRQUVqSCxPQUFPLGNBQWMsS0FBSyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLGNBQWMsR0FBRyxDQUFBO0lBQ2hHLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUNqQixhQUE2QixFQUM3QixhQUF1QixFQUN2QixVQUFvQixFQUNwQixNQUFnQjtRQUVoQixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQTtRQUMzRCxJQUNDLElBQUksQ0FBQywyQkFBMkI7WUFDaEMsQ0FBQyxnQkFBZ0IsS0FBSyx3QkFBd0I7Z0JBQzdDLENBQUMsZ0JBQWdCLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEtBQUssYUFBYSxDQUFDO2dCQUN0RixhQUFhLENBQUMsWUFBWSxZQUFZLG9CQUFvQixDQUFDLEVBQzNELENBQUM7WUFDRixPQUFPLGFBQWEsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFO2dCQUM5RCxNQUFNLEVBQUUsSUFBSTtnQkFDWixjQUFjLEVBQUUsSUFBSTthQUNwQixDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5RixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFrQjtRQUN4QixPQUFPLENBQ04sSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSTtZQUN4QixLQUFLLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxNQUFNO1lBQzVCLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxDQUFDLE9BQU87WUFDOUIsS0FBSyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsTUFBTTtZQUM1QixLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUMxQyxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxnQ0FBZ0MsR0FBc0I7SUFDM0QsWUFBWTtJQUNaLE1BQU07SUFDTixxQkFBcUI7Q0FDckIsQ0FBQTtBQUVELE1BQU0sT0FBTyxNQUFNO0lBU2xCLFlBQ2lCLE9BQXNCLEVBQy9CLElBQVksRUFDSCxRQUFnQjtRQUZoQixZQUFPLEdBQVAsT0FBTyxDQUFlO1FBQy9CLFNBQUksR0FBSixJQUFJLENBQVE7UUFDSCxhQUFRLEdBQVIsUUFBUSxDQUFRO1FBVHpCLGdDQUEyQixHQUE4QixFQUFFLENBQUE7UUFHNUQsMEJBQXFCLEdBQUcsS0FBSyxDQUFBO1FBUW5DLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1FBQ25CLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO0lBQ3JCLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxVQUFVLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3pELENBQUM7SUFFRCxjQUFjO1FBQ2IsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQTtRQUNyQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7UUFDbkIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLElBQUksQ0FBQywyQkFBMkIsR0FBRyxFQUFFLENBQUE7SUFDdEMsQ0FBQztJQUVELFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUVELGdCQUFnQjtRQUNmLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNyQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQTtRQUM5Qyx3SEFBd0g7UUFDeEgsTUFBTSx3QkFBd0IsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUM5QyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQ04sQ0FBQyxDQUFDLENBQ0QsQ0FBQyxDQUFDLFVBQVUsS0FBSyx3QkFBd0I7WUFDeEMsQ0FBQyxVQUFVLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyx1QkFBdUIsS0FBSyxhQUFhLENBQUMsQ0FBQztZQUMxRSxFQUFFLENBQUMsMkJBQTJCLENBQUM7WUFDaEMsQ0FBQyxFQUFFLENBQUMsTUFBTTtnQkFDVCxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVM7Z0JBQ25CLENBQUMsZ0NBQWdDLENBQUMsUUFBUSxDQUFDLFVBQVcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUN0RixDQUNGLENBQUE7UUFDRCxPQUFPLHdCQUF3QixDQUFBO0lBQ2hDLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixPQUFPLENBQ04sSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXO2dCQUMvQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTTtvQkFDMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQ1osRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLDJDQUEyQyxDQUFDLEVBQUUsRUFDM0UsZUFBZSxFQUNmLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUMxQjtvQkFDRixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FDcEMsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNqRixDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsRUFBRTtRQUMvQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQTtZQUNuQyxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDNUQsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1lBQ3RELElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ25DLGlJQUFpSTtnQkFDakksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFBO1lBQzVELENBQUM7WUFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUN2RCxJQUNDLE9BQU8sSUFBSSxDQUFDLGNBQWMsRUFBRSxXQUFXLEtBQUssUUFBUTtnQkFDcEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQ3hELENBQUM7Z0JBQ0YsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQTtZQUNsQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBa0IsRUFBRSxNQUFjO1FBQ2hFLElBQUksQ0FBQztZQUNKLE1BQU0sV0FBVyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtZQUNqRCxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ2xELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQzdDLElBQUksQ0FBQyxRQUFRLEVBQ2IsVUFBVSxFQUNWLE1BQU0sRUFDTixXQUFXLENBQUMsS0FBSyxDQUNqQixDQUFBO1lBQ0QsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dCQUM5RSxPQUFPLEVBQUUsQ0FBQTtZQUNWLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUE7WUFDNUQsQ0FBQztZQUVELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUNuRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBRWpELE9BQU8sSUFBSSxVQUFVLENBQ3BCLElBQUksRUFDSixHQUFHLENBQUMsRUFBRSxFQUNOLE1BQU0sRUFDTixHQUFHLENBQUMsSUFBSSxFQUNSLEdBQUcsQ0FBQyxnQkFBZ0IsRUFDcEIsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFDckYsVUFBVSxHQUFHLEtBQUssRUFDbEIsT0FBTyxHQUFHLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUMzRCxHQUFHLENBQUMsMkJBQTJCLENBQy9CLENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQTtZQUNyRCxDQUFDO1lBRUQsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxhQUFhO1FBQ2hCLElBQUksSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUN2RSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLDRCQUE0QixFQUFFLENBQUM7Z0JBQzVELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2pELENBQUM7WUFDRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUM7Z0JBQ3RCLFdBQVcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUk7Z0JBQ3JDLFNBQVMsRUFBRSxJQUFJO2FBQ2YsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxDQUFDLFdBQStDO1FBQ25ELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQStDO1FBQ3JELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDbEUsQ0FBQztJQUVELE9BQU8sQ0FBQyxXQUErQztRQUN0RCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVELFFBQVEsQ0FBQyxXQUErQztRQUN2RCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFRCxTQUFTO1FBQ1IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLENBQ25DLFNBQWlCLEVBQ2pCLGVBQXVCLEVBQ3ZCLEtBQWdELEVBQ2hELFdBQVcsR0FBRyxRQUFRLEVBQ3JCLEVBQUU7SUFDSCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDZixNQUFNLEVBQUUsbUJBQW1CO1FBQzNCLFNBQVMsRUFBRSxTQUFTO1FBQ3BCLElBQUksRUFBRSxHQUFHLEdBQUcsa0JBQWtCLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsTUFBTTtRQUMzRixLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssQ0FBQyxVQUFVLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTO0tBQ3pFLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQTtBQUVELE1BQU0sT0FBTyxZQUFhLFNBQVEsVUFBVTtJQVMzQyxZQUNrQixlQUF1QixFQUN2QixPQUFzQjtRQUV2QyxLQUFLLEVBQUUsQ0FBQTtRQUhVLG9CQUFlLEdBQWYsZUFBZSxDQUFRO1FBQ3ZCLFlBQU8sR0FBUCxPQUFPLENBQWU7UUFWdkIsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBNEIsQ0FBQyxDQUFBO1FBRTVGLGtCQUFrQjtRQUNGLG9CQUFlLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtRQUU5RCxrQkFBa0I7UUFDRixhQUFRLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFBO1FBT2hGLElBQUksQ0FBQyxTQUFTLENBQ2IsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDbkMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsS0FBSyxlQUFlLEVBQUUsQ0FBQztnQkFDaEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzdELENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVNLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBa0IsRUFBRSxRQUFnQjtRQUNyRCxNQUFNLE1BQU0sR0FBRyxRQUFRLEdBQUcsVUFBVSxDQUFBO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQTtRQUN6QixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRWxGLElBQUksTUFBTSxLQUFLLFNBQVMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLEVBQUUsSUFBSSxvQ0FBNEIsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBRUQsSUFBSSxJQUFjLENBQUE7UUFDbEIsSUFBSSxDQUFDO1lBQ0osSUFBSSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixPQUFPO2dCQUNOO29CQUNDLElBQUksK0JBQXVCO29CQUMzQixNQUFNO29CQUNOLE1BQU07b0JBQ04sS0FBSyxFQUFFLHdDQUF3QztpQkFDL0M7YUFDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxJQUFJLENBQUMsQ0FBQTtRQUNuRCxNQUFNLFVBQVUsR0FBRyxNQUFNLEdBQUcsVUFBVSxDQUFBO1FBQ3RDLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLEVBQUUsQ0FBQztZQUNsQyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDeEQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbEIsSUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEQsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLEVBQUUsQ0FBQztZQUN6QyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDakMsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsRUFBRSxJQUFJLCtCQUF1QixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMvRCxDQUFDO1FBRUQsT0FBTztZQUNOLEVBQUUsSUFBSSwrQkFBdUIsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUU7WUFDakUsRUFBRSxJQUFJLG9DQUE0QixFQUFFLE1BQU0sRUFBRSxNQUFNLEdBQUcsVUFBVSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUU7U0FDckYsQ0FBQTtJQUNGLENBQUM7SUFFTSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQWMsRUFBRSxJQUFjO1FBQ2hELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQzVDLElBQUksQ0FBQyxlQUFlLEVBQ3BCLE1BQU0sRUFDTixZQUFZLENBQUMsSUFBSSxDQUFDLEVBQ2xCLElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUM3RCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUE7UUFDekMsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRWUsT0FBTztRQUN0QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVPLFVBQVUsQ0FBQyxVQUFrQixFQUFFLFFBQWdCO1FBQ3RELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sVUFBVTtJQUN0QixZQUNRLE9BQWdCLEVBQ04sRUFBVTtRQURwQixZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ04sT0FBRSxHQUFGLEVBQUUsQ0FBUTtJQUN6QixDQUFDO0lBRUosS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQTtJQUNmLENBQUM7Q0FDRDtBQVlELFNBQVMsdUJBQXVCLENBQy9CLElBQThCLEVBQzlCLFlBQXdDO0lBRXhDLE9BQU8sS0FBSyxDQUNYO1FBQ0MsOEJBQThCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyw4QkFBOEI7UUFDN0UsaUNBQWlDLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxpQ0FBaUM7UUFDbkYsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxpQkFBaUI7UUFDbkQsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQywyQkFBMkI7UUFDdkUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyx1QkFBdUI7UUFDL0QsOEJBQThCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyw4QkFBOEI7S0FDN0UsRUFDRCxJQUFJLENBQ0osQ0FBQTtBQUNGLENBQUM7QUFXRCxNQUFNLE9BQWdCLGNBQWUsU0FBUSxVQUFVO0lBU3RELFlBQVksRUFBVSxFQUFFLElBQTRCO1FBQ25ELEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQVR4QixnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFBO1FBVTlELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQTtRQUMvQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUE7UUFDckMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQTtRQUNyQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDaEMsQ0FBQztJQUVELGNBQWMsQ0FBQyxTQUFpQixFQUFFLElBQXdDO1FBQ3pFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ25DLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7WUFDMUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUNyRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQzVCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFDakMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQzlCLENBQUE7UUFDRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6Qix3SUFBd0k7WUFDeEksSUFBSSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDcEUsQ0FBQzthQUFNLENBQUM7WUFDUCxxQ0FBcUM7WUFDckMsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUNwRCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDekIsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtJQUM3QyxDQUFDO0lBRUQsSUFBSSxvQkFBb0I7UUFDdkIsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUFBO1FBQy9CLEtBQUssTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEQsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ25CLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDM0IsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO0lBSUQsZ0JBQWdCLENBQUMsU0FBaUI7UUFDakMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDNUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsMEJBQTBCLENBQUMsU0FBaUI7UUFDM0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDNUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNWLE1BQU0sRUFBRSxHQUE2QjtnQkFDcEMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUNYLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtnQkFDdkIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNyQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDckIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUN6QixvQkFBb0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CO2dCQUMvQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07YUFDbkIsQ0FBQTtZQUNELE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTztZQUNOLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ2hCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7U0FDekIsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQVVELE1BQU0sT0FBTyxVQUFXLFNBQVEsY0FBYztJQVE3QyxZQUNDLElBQXdCLEVBQ1AsZUFBaUMsRUFDakMsa0JBQXVDLEVBQ3ZDLFVBQXVCLEVBQ3hDLEVBQUUsR0FBRyxZQUFZLEVBQUU7UUFFbkIsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUxFLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUNqQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3ZDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFJeEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUNsQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7UUFDMUIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU87WUFDTixJQUFJLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVU7WUFDekMsTUFBTSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNO1lBQ3ZDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtTQUNmLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ2pCLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVE7WUFDdEUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtZQUNoQixDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUNwQixDQUFDO0lBRUQsSUFBYSxRQUFRO1FBQ3BCLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0RSxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLEtBQUssU0FBUyxDQUFBO0lBQ3RDLENBQUM7SUFFRCxJQUFJLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU07WUFDcEQsQ0FBQyxDQUFDLGdCQUFnQixDQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFDbkIsSUFBSSxDQUFDLGtCQUFrQixFQUN2QixJQUFJLENBQUMsVUFBVSxDQUNmO1lBQ0YsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRO1lBQ3hFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU07WUFDbEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDaEIsQ0FBQztJQUVELElBQWEsT0FBTztRQUNuQixJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FDbEIsdUJBQXVCLEVBQ3ZCLHdFQUF3RSxDQUN4RSxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQTtJQUNyQixDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVc7WUFDbkUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVc7WUFDOUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDckIsQ0FBQztJQUVELElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUNsRSxDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDcEUsQ0FBQztJQUVELElBQUksbUJBQW1CO1FBQ3RCLE9BQU87WUFDTixVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDNUIsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPO1NBQ3BCLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDckQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO1lBQ2pFLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEVBQUUsQ0FBQztZQUN2RSxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFUSxjQUFjLENBQUMsU0FBaUIsRUFBRSxJQUF3QztRQUNsRixLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUNyQyxDQUFDO0lBQ0YsQ0FBQztJQUVRLE1BQU07UUFDZCxPQUFPO1lBQ04sR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQ2pCLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNkLFVBQVUsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM1QixNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDcEIsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztTQUM3QixDQUFBO0lBQ0YsQ0FBQztJQUVRLFFBQVE7UUFDaEIsT0FBTyxHQUFHLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ3ZFLENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxTQUFpQixFQUFFLFVBQVUsR0FBRyxJQUFJO1FBQy9ELElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLGtCQUFrQixLQUFLLElBQUksR0FBRyxFQUFFLENBQUE7WUFDckMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN2QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0MsQ0FBQztJQUNGLENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxTQUFpQjtRQUM1QyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFRCxNQUFNLENBQUMsSUFBMkI7UUFDakMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDOUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO1FBQ25DLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7UUFDM0IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQTtRQUNoQyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO1FBQ3RDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDbEMsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQTtZQUNyQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUE7UUFDaEMsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtZQUNuQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO1FBQ3BDLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFNRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsY0FBYztJQUdyRCxZQUFZLElBQWdDLEVBQUUsRUFBRSxHQUFHLFlBQVksRUFBRTtRQUNoRSxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2YsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ3RCLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTztZQUNOLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7U0FDL0IsQ0FBQTtJQUNGLENBQUM7SUFFUSxNQUFNO1FBQ2QsT0FBTztZQUNOLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRTtZQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7U0FDZixDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFBO0lBQzdDLENBQUM7SUFFUSxRQUFRO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtJQUNqQixDQUFDO0NBQ0Q7QUFXRCxNQUFNLE9BQU8sY0FBZSxTQUFRLGNBQWM7SUFTakQsWUFBWSxJQUE0QixFQUFFLEVBQUUsR0FBRyxZQUFZLEVBQUU7UUFDNUQsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQVRDLHlCQUFvQixHQUFHLElBQUksT0FBTyxFQUFnQyxDQUFBO1FBVWxGLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUNuQyxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUN0QixnREFBZ0Q7WUFDaEQsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLElBQUksd0NBQWdDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFnQixFQUFFLENBQUE7UUFDbkYsQ0FBQztRQUNELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtRQUNuQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQ25DLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUNqQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDL0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQXNCO1FBQ2pDLElBQUksTUFBYyxDQUFBO1FBQ2xCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLDJDQUFtQyxFQUFFLENBQUM7WUFDdEQsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFBO1FBQ3pCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMxRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3BCLGFBQWEsR0FBRyxDQUFDLE1BQU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ3hGLEVBQUUsTUFBTSxDQUFBO2dCQUNULElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDcEIsT0FBTyxTQUFTLENBQUE7Z0JBQ2pCLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDdEQsQ0FBQztZQUNELE1BQU0sR0FBRyxhQUFhLENBQUE7UUFDdkIsQ0FBQztRQUVELE9BQU87WUFDTixNQUFNO1lBQ04sVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7U0FDL0IsQ0FBQTtJQUNGLENBQUM7SUFFUSxNQUFNO1FBQ2QsT0FBTztZQUNOLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRTtZQUNqQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDN0IsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2IsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7U0FDM0IsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQTtJQUN6QyxDQUFDO0lBRVEsUUFBUTtRQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztDQUNEO0FBV0QsTUFBTSxPQUFPLG1CQUFvQixTQUFRLGNBQWM7SUFVdEQsWUFBWSxJQUFpQyxFQUFFLEVBQUUsR0FBRyxZQUFZLEVBQUU7UUFDakUsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQVZSLHNCQUFpQixHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFBO1FBTzFDLGFBQVEsR0FBWSxLQUFLLENBQUE7UUFJaEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQTtRQUN2QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFBO1FBQy9DLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUNuQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFBO1FBQ3JELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUE7SUFDdkMsQ0FBQztJQUVRLE1BQU07UUFDZCxPQUFPO1lBQ04sR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQ2pCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLGlCQUFpQixFQUFFLElBQUksQ0FBQyxpQkFBaUI7WUFDekMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLG9CQUFvQjtZQUMvQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQ3ZCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztTQUM3QixDQUFBO0lBQ0YsQ0FBQztJQUVELG1CQUFtQixDQUFDLFNBQWlCLEVBQUUsU0FBa0I7UUFDeEQsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7SUFDRixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsV0FBVyxDQUFDLFVBQW1CO1FBQzlCLElBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRDs7O09BR0c7SUFDSCxrQkFBa0IsQ0FBQyxTQUFrQjtRQUNwQyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUN6RSxDQUFDO0lBRUQsT0FBTyxDQUFDLE1BQWdEO1FBQ3ZELE9BQU8sQ0FDTixJQUFJLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxNQUFNO1lBQzdCLElBQUksQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDLEtBQUs7WUFDM0IsSUFBSSxDQUFDLGlCQUFpQixLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCO1lBQ3JELElBQUksQ0FBQyxvQkFBb0IsS0FBSyxNQUFNLENBQUMsb0JBQW9CO1lBQ3pELElBQUksQ0FBQyxXQUFXLEtBQUssTUFBTSxDQUFDLFdBQVcsQ0FDdkMsQ0FBQTtJQUNGLENBQUM7SUFFUSxRQUFRO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQTtJQUNsQixDQUFDO0NBQ0Q7QUFTRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsY0FBYztJQU14RCxZQUFZLElBQW1DLEVBQUUsRUFBRSxHQUFHLFlBQVksRUFBRTtRQUNuRSxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2YsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQTtRQUNyRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7UUFDekIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUM1QixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU87WUFDTixvQkFBb0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CO1lBQy9DLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1NBQ25CLENBQUE7SUFDRixDQUFDO0lBRVEsTUFBTTtRQUNkLE9BQU87WUFDTixHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDakIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLG9CQUFvQjtZQUMvQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztTQUNyQixDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFBO0lBQ2hELENBQUM7SUFFUSxRQUFRO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ2pDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxtQkFBbUI7SUFDL0IsWUFDUSxTQUFpQixFQUNqQixRQUFnQjtRQURoQixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLGFBQVEsR0FBUixRQUFRLENBQVE7SUFDckIsQ0FBQztJQUVKLEtBQUs7UUFDSixPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDNUMsQ0FBQztDQUNEO0FBTU0sSUFBTSxVQUFVLEdBQWhCLE1BQU0sVUFBVyxTQUFRLFVBQVU7SUF5QnpDLFlBQ0MsWUFBMEIsRUFDUixlQUFrRCxFQUMvQyxrQkFBd0QsRUFDaEUsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFKNEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQzlCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDL0MsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQTNCOUMsZUFBVSxHQUFHLElBQUksR0FBRyxFQUd6QixDQUFBO1FBQ0sseUJBQW9CLEdBQUcsSUFBSSxDQUFBO1FBQ2xCLDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3hELElBQUksT0FBTyxFQUF1QyxDQUNsRCxDQUFBO1FBQ2dCLDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzNELGlDQUE0QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzdELElBQUksT0FBTyxFQUEyQixDQUN0QyxDQUFBO1FBQ2dCLHFDQUFnQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2pFLElBQUksT0FBTyxFQUEyQixDQUN0QyxDQUFBO1FBQ2dCLHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUFtQyxDQUFBO1FBZ0I3RSxJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2xCLElBQUksQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDMUUsSUFBSSxDQUFDLGVBQWUsR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNoRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2xCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2xFLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsZUFBZSxDQUNkLEdBQUcsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUNwQyxJQUFJLENBQUMsMkJBQTJCLEVBQ2hDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDakYsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEVBQUUsQ0FBQTtRQUNoQyxJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELFVBQVUsQ0FBQyxTQUE2QixFQUFFLGVBQWUsR0FBRyxLQUFLO1FBQ2hFLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssU0FBUyxDQUFDLENBQUE7UUFDOUUsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxXQUFXLENBQUMsZUFBZSxHQUFHLEtBQUs7UUFDbEMsOENBQThDO1FBQzlDLGtIQUFrSDtRQUNsSCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLEtBQUssMkJBQW1CLENBQUMsQ0FBQTtJQUNsRixDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQXNCO1FBQ2hDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDbkMsOEhBQThIO2dCQUM5SCxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxLQUFLLDJCQUFtQixJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3ZGLHFHQUFxRztnQkFDckcsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNULE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3ZFLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDeEQsQ0FBQztRQUVELElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2QsSUFBSSxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDM0Isb0VBQW9FO1lBQ3BFLEtBQUssR0FBRyxXQUFXLENBQ2xCLElBQUksQ0FBQyxRQUFRLEVBQ2IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLEtBQUssT0FBTyxDQUFDLGFBQWEsSUFBSSxDQUFDLEtBQUssT0FBTyxDQUFDLGFBQWEsQ0FDL0UsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM1QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzVCLENBQUM7UUFDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLHNCQUFzQjtRQUN6QixPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUE7SUFDMUMsQ0FBQztJQUVELElBQUksb0JBQW9CO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtJQUN4QyxDQUFDO0lBRUQsSUFBSSwyQkFBMkI7UUFDOUIsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFBO0lBQy9DLENBQUM7SUFFRCxJQUFJLCtCQUErQjtRQUNsQyxPQUFPLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxLQUFLLENBQUE7SUFDbkQsQ0FBQztJQUVELFNBQVMsQ0FBQyxJQUFxQjtRQUM5QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN2RSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN2QixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzNDLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWSxDQUNYLEVBQVUsRUFDVixhQUFzQixFQUN0QixZQUFnQyxTQUFTO1FBRXpDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNqQyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3pCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNsQyxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFdkIsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0MsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBZSxFQUFFLE1BQWU7UUFDcEQsSUFBYSxNQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUM1QyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFBO1FBQ3RELE1BQU0sZUFBZSxHQUNwQixPQUFPLFdBQVcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFFekYsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLGVBQWUsSUFBSSxNQUFNLEdBQUcsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUM5RCxNQUFNLEdBQUcsZUFBZSxDQUFBO1FBQ3pCLENBQUM7UUFFRCxJQUFJLE1BQU0sSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUIsTUFBZSxNQUFPLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzdDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNsQyxDQUFDO1FBRUQsT0FBTTtJQUNQLENBQUM7SUFFRCxxQkFBcUIsQ0FDcEIsTUFBYyxFQUNkLGNBQWMsR0FBRyxJQUFJO1FBRXJCLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztZQUNsRSxvRkFBb0Y7WUFDcEYsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3BDLE1BQU0sY0FBYyxHQUFHLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNqRCxZQUFZLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO29CQUNqRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7d0JBQ3JCLENBQUMsRUFBRSxDQUFBO3dCQUNILElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTt3QkFDakMsT0FBTTtvQkFDUCxDQUFDO29CQUVELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO3dCQUMxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFBO3dCQUM1QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUU7NEJBQ25DLGdCQUFnQixFQUFFLFFBQVE7NEJBQzFCLFNBQVMsRUFBRSxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtnQ0FDcEMsTUFBTTtxQ0FDSixjQUFjLENBQUMsRUFBRSxDQUFDO3FDQUNsQixJQUFJLENBQUMsR0FBRyxFQUFFO29DQUNWLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO29DQUN4QyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUE7b0NBQ3JDLElBQUksd0JBQXdCLEdBQUcsS0FBSyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsTUFBTSxDQUFBO29DQUM5RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7d0NBQ3BFLHdCQUF3QixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQ0FDeEQsQ0FBQztvQ0FFRCxJQUFJLHdCQUF3QixFQUFFLENBQUM7d0NBQzlCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtvQ0FDbEMsQ0FBQztnQ0FDRixDQUFDLENBQUM7cUNBQ0QsT0FBTyxDQUFDLEdBQUcsRUFBRTtvQ0FDYixRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7b0NBQ25CLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dDQUN2QyxDQUFDLENBQUMsQ0FBQTs0QkFDSixDQUFDLEVBQUUsR0FBRyxDQUFDO3lCQUNQLENBQUMsQ0FBQTtvQkFDSCxDQUFDO29CQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBRSxDQUFBO29CQUNsRCxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFBO29CQUMxQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7b0JBQ25DLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDbEMsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDLENBQUMsQ0FBQTtZQUVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLENBQUE7UUFDeEMsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsQ0FBQTtJQUN4RCxDQUFDO0lBRUQsY0FBYyxDQUFDLE1BT2Q7UUFDQSxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQTtZQUNyQyxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxDQUFBO1lBQ3JELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDckMsSUFBSSxNQUFNLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxNQUFNLEVBQUUsQ0FBQztvQkFDNUMsT0FBTyxLQUFLLENBQUE7Z0JBQ2IsQ0FBQztnQkFDRCxJQUFJLGNBQWMsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLGNBQWMsRUFBRSxDQUFDO29CQUNwRSxPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDO2dCQUNELElBQUksTUFBTSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsVUFBVSxLQUFLLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDOUQsT0FBTyxLQUFLLENBQUE7Z0JBQ2IsQ0FBQztnQkFDRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2xELE9BQU8sS0FBSyxDQUFBO2dCQUNiLENBQUM7Z0JBQ0QsSUFBSSxNQUFNLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDdkUsT0FBTyxLQUFLLENBQUE7Z0JBQ2IsQ0FBQztnQkFDRCxJQUFJLE1BQU0sQ0FBQyxhQUFhLElBQUksRUFBRSxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDMUQsT0FBTyxLQUFLLENBQUE7Z0JBQ2IsQ0FBQztnQkFFRCxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0lBRUQsc0JBQXNCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFBO0lBQ2hDLENBQUM7SUFFRCxrQkFBa0I7UUFDakIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFFRCx1QkFBdUI7UUFDdEIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUE7SUFDakMsQ0FBQztJQUVELGlDQUFpQyxDQUFDLFNBQWtCO1FBQ25ELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFDcEYsQ0FBQztJQUVELHlCQUF5QjtRQUN4QixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsaUNBQWlDLENBQ2hDLFNBQWlCLEVBQ2pCLE9BQW1EO1FBRW5ELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxvQkFBb0IsR0FBRyxLQUFLLENBQUE7UUFDaEMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3JCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUUzRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ1Ysb0JBQW9CLEdBQUcsSUFBSSxDQUFBO2dCQUMzQixHQUFHLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQztvQkFDN0IsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNO29CQUNoQixLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUs7b0JBQ2QsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTztvQkFDcEIsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUI7b0JBQ3hDLFdBQVcsRUFBRSxDQUFDLENBQUMsV0FBVztvQkFDMUIsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQjtpQkFDNUMsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDcEMsQ0FBQztZQUVELEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekMsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM3QyxDQUFDO0lBQ0YsQ0FBQztJQUVELG9DQUFvQyxDQUFDLFNBQWlCO1FBQ3JELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUN0RixDQUFDO0lBRUQsZ0RBQWdEO0lBQ2hELDZGQUE2RjtJQUM3RixxQ0FBcUMsQ0FBQyxTQUFpQjtRQUN0RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVELCtCQUErQixDQUM5QixtQkFBeUMsRUFDekMsU0FBNkI7UUFFN0IsQ0FBQztRQUFDLG1CQUEyQyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDbkUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsdUJBQXVCO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ2pDLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxTQUFrQjtRQUN6QyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsU0FBUyxDQUFBO1FBQ3JDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELGNBQWMsQ0FBQyxHQUFRLEVBQUUsT0FBMEIsRUFBRSxTQUFTLEdBQUcsSUFBSTtRQUNwRSxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDNUMsT0FBTyxJQUFJLFVBQVUsQ0FDcEI7Z0JBQ0MsR0FBRztnQkFDSCxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVU7Z0JBQzVCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtnQkFDcEIsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLElBQUksSUFBSTtnQkFDOUIsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO2dCQUMxQixZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVk7Z0JBQ2hDLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtnQkFDNUIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO2dCQUM5QixXQUFXLEVBQUUsU0FBUztnQkFDdEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO2dCQUNoQixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7YUFDMUIsRUFDRCxJQUFJLENBQUMsZUFBZSxFQUNwQixJQUFJLENBQUMsa0JBQWtCLEVBQ3ZCLElBQUksQ0FBQyxVQUFVLEVBQ2YsS0FBSyxDQUFDLEVBQUUsQ0FDUixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUE7UUFDaEMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBRW5CLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNqRixDQUFDO1FBRUQsT0FBTyxjQUFjLENBQUE7SUFDdEIsQ0FBQztJQUVELGlCQUFpQixDQUFDLFFBQXVCO1FBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQ3pDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FDckUsQ0FBQTtRQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQzdFLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxJQUF3QztRQUN6RCxNQUFNLE9BQU8sR0FBa0IsRUFBRSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7WUFDL0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUNuQyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDakIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ25CLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQzVFLENBQUM7SUFFRCx3QkFBd0IsQ0FDdkIsU0FBaUIsRUFDakIsV0FBdUMsRUFDdkMsSUFBdUQ7UUFFdkQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtZQUMvQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsRUFBRSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDeEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7Z0JBQ25DLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osRUFBRSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7Z0JBQzNFLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDeEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLEdBQUcsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3pDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dCQUNyQyxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLEdBQUcsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO2dCQUM3RSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNwQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDekMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7Z0JBQ3JDLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7Z0JBQzdFLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDekMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLEdBQUcsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3pDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dCQUNyQyxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLEdBQUcsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO2dCQUM3RSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQzNDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWCxHQUFHLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN6QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtnQkFDckMsSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDYixHQUFHLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtnQkFDN0UsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUM7WUFDakMsV0FBVyxFQUFFLElBQUk7U0FDakIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELDBCQUEwQixDQUN6QixZQUFvQixFQUNwQixTQUFpQjtRQUVqQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLFlBQVksQ0FBQyxDQUFBO1FBQ3JFLElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNoRCxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELGtCQUFrQixDQUNqQixpQkFBa0U7UUFFbEUsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDMUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FDMUMsQ0FBQTtJQUNGLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxTQUFpQixFQUFFLEtBQXFDO1FBQy9FLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUN4QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzFDLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ1QsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO3dCQUNyQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDM0IsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQ3pELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FDMUMsQ0FBQTtnQkFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLFNBQVMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxTQUFTLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQyxrQkFBa0IsR0FBRyxDQUFBO2dCQUN6RSxDQUFDO2dCQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO29CQUM5QixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7b0JBQ2YsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztvQkFDOUQsa0JBQWtCLEVBQUUsU0FBUztvQkFDN0IsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO29CQUM3QixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsRUFBRSx3QkFBd0I7aUJBQzNELENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLFlBQVk7UUFDbkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMxRCxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUNwRCxPQUFPLFNBQVM7cUJBQ2QsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztxQkFDOUIsYUFBYSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMzRCxDQUFDO1lBQ0QsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDbkMsT0FBTyxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUE7Z0JBQ3BDLENBQUM7Z0JBQ0QsT0FBTyxDQUFDLENBQUE7WUFDVCxDQUFDO1lBRUQsT0FBTyxLQUFLLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUE7UUFDNUMsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FDMUIsSUFBSSxDQUFDLFdBQVcsRUFDaEIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FDNUQsQ0FBQTtJQUNGLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBb0IsRUFBRSxNQUFlO1FBQ2xELElBQ0MsT0FBTyxZQUFZLFVBQVU7WUFDN0IsT0FBTyxZQUFZLGtCQUFrQjtZQUNyQyxPQUFPLFlBQVksbUJBQW1CO1lBQ3RDLE9BQU8sWUFBWSxjQUFjO1lBQ2pDLE9BQU8sWUFBWSxxQkFBcUIsRUFDdkMsQ0FBQztZQUNGLE1BQU0sT0FBTyxHQUVULEVBQUUsQ0FBQTtZQUNOLElBQ0MsT0FBTyxDQUFDLE9BQU8sS0FBSyxNQUFNO2dCQUMxQixDQUFDLE9BQU8sWUFBWSxVQUFVO29CQUM3QixPQUFPLFlBQVksa0JBQWtCO29CQUNyQyxPQUFPLFlBQVksY0FBYztvQkFDakMsT0FBTyxZQUFZLHFCQUFxQixDQUFDLEVBQ3pDLENBQUM7Z0JBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN0QixDQUFDO1lBRUQsT0FBTyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7WUFDeEIsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFBO1lBQ2pDLENBQUM7WUFFRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUM1RSxDQUFDO0lBQ0YsQ0FBQztJQUVELDZCQUE2QixDQUFDLE1BQWU7UUFDNUMsTUFBTSxPQUFPLEdBRVQsRUFBRSxDQUFBO1FBRU4sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtZQUMvQixJQUFJLEVBQUUsQ0FBQyxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDakIsQ0FBQztZQUNELEVBQUUsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3hDLElBQUksR0FBRyxDQUFDLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsQixDQUFDO1lBQ0QsR0FBRyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3BDLElBQUksR0FBRyxDQUFDLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsQixDQUFDO1lBQ0QsR0FBRyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDM0MsSUFBSSxHQUFHLENBQUMsT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM1QixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2xCLENBQUM7WUFDRCxHQUFHLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFBO1FBQ2pDLENBQUM7UUFFRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0lBRUQscUJBQXFCLENBQUMsSUFBZ0MsRUFBRSxFQUFXO1FBQ2xFLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3BELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRXpGLE9BQU8scUJBQXFCLENBQUE7SUFDN0IsQ0FBQztJQUVELHdCQUF3QixDQUN2QixFQUFVLEVBQ1YsTUFBb0U7UUFFcEUsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDckYsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hCLElBQUksT0FBTyxNQUFNLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNyQyxrQkFBa0IsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQTtZQUN0QyxDQUFDO1lBQ0QsSUFBSSxPQUFPLE1BQU0sQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzFDLGtCQUFrQixDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFBO1lBQ2hELENBQUM7WUFDRCxJQUFJLE9BQU8sTUFBTSxDQUFDLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDN0Msa0JBQWtCLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUE7WUFDdEQsQ0FBQztZQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7SUFDRixDQUFDO0lBRUQseUJBQXlCLENBQUMsRUFBVztRQUNwQyxJQUFJLE9BQTZCLENBQUE7UUFDakMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDdEUsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUN4RixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUE7WUFDbEMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEVBQUUsQ0FBQTtRQUM5QixDQUFDO1FBQ0QsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsaUJBQWlCLENBQUMsSUFBNEIsRUFBRSxFQUFXO1FBQzFELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDdEYsQ0FBQztJQUVELG9CQUFvQixDQUFDLEVBQVUsRUFBRSxNQUFxRDtRQUNyRixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQzdFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsSUFBSSxPQUFPLE1BQU0sQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzFDLGNBQWMsQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQTtZQUM1QyxDQUFDO1lBQ0QsSUFBSSxPQUFPLE1BQU0sQ0FBQyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzdDLGNBQWMsQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQTtZQUNsRCxDQUFDO1lBQ0QsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLENBQUM7SUFDRixDQUFDO0lBRUQscUJBQXFCLENBQUMsRUFBVztRQUNoQyxJQUFJLE9BQXlCLENBQUE7UUFDN0IsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQ2xFLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNoRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFBO1lBQzlCLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFBO1FBQzFCLENBQUM7UUFDRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxJQUFtQztRQUMzRCxNQUFNLHdCQUF3QixHQUFHLElBQUkscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQzVGLENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxvQkFBNkIsRUFBRSxNQUFlO1FBQzFFLElBQUksT0FBTyxHQUE0QixFQUFFLENBQUE7UUFDekMsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzdELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDMUMsSUFDQyxHQUFHLENBQUMsb0JBQW9CLEtBQUssb0JBQW9CO29CQUNqRCxDQUFDLE1BQU0sS0FBSyxTQUFTLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsRUFDOUMsQ0FBQztvQkFDRixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUNqQixJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMzQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQTtZQUNyQyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsRUFBRSxDQUFBO1FBQ2pDLENBQUM7UUFDRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxtQkFBbUI7UUFDbEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUVELGtCQUFrQixDQUFDLElBQWE7UUFDL0IsTUFBTSxFQUFFLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDOUIsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUUxQyxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxFQUFVLEVBQUUsT0FBZTtRQUNoRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDeEUsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNCLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFBO1lBQzFCLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsQ0FBQztJQUNGLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxLQUFvQixJQUFJO1FBQzlDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ3pGLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELG1CQUFtQixDQUFDLEVBQVUsRUFBRSxRQUFnQjtRQUMvQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDaEUsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDL0UsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0I7aUJBQzNDLEtBQUssQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDO2lCQUNsQixNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUNuRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xELENBQUM7SUFDRixDQUFDO0lBRUQsb0JBQW9CLENBQUMsR0FBUTtRQUM1QixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzNCLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDckMsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixNQUFNLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtZQUN6QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDRCxDQUFBO0FBMXVCWSxVQUFVO0lBMkJwQixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxXQUFXLENBQUE7R0E3QkQsVUFBVSxDQTB1QnRCIn0=
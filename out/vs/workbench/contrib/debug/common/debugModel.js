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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQVMsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQWMsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFB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
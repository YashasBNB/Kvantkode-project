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
import { TerminalShellExecutionCommandLineConfidence } from './extHostTypes.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { MainContext, } from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { Emitter } from '../../../base/common/event.js';
import { URI } from '../../../base/common/uri.js';
import { AsyncIterableObject, Barrier, } from '../../../base/common/async.js';
export const IExtHostTerminalShellIntegration = createDecorator('IExtHostTerminalShellIntegration');
let ExtHostTerminalShellIntegration = class ExtHostTerminalShellIntegration extends Disposable {
    constructor(extHostRpc, _extHostTerminalService) {
        super();
        this._extHostTerminalService = _extHostTerminalService;
        this._activeShellIntegrations = new Map();
        this._onDidChangeTerminalShellIntegration = new Emitter();
        this.onDidChangeTerminalShellIntegration = this._onDidChangeTerminalShellIntegration.event;
        this._onDidStartTerminalShellExecution = new Emitter();
        this.onDidStartTerminalShellExecution = this._onDidStartTerminalShellExecution.event;
        this._onDidEndTerminalShellExecution = new Emitter();
        this.onDidEndTerminalShellExecution = this._onDidEndTerminalShellExecution.event;
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadTerminalShellIntegration);
        // Clean up listeners
        this._register(toDisposable(() => {
            for (const [_, integration] of this._activeShellIntegrations) {
                integration.dispose();
            }
            this._activeShellIntegrations.clear();
        }));
        // Convenient test code:
        // this.onDidChangeTerminalShellIntegration(e => {
        // 	console.log('*** onDidChangeTerminalShellIntegration', e);
        // });
        // this.onDidStartTerminalShellExecution(async e => {
        // 	console.log('*** onDidStartTerminalShellExecution', e);
        // 	// new Promise<void>(r => {
        // 	// 	(async () => {
        // 	// 		for await (const d of e.execution.read()) {
        // 	// 			console.log('data2', d);
        // 	// 		}
        // 	// 	})();
        // 	// });
        // 	for await (const d of e.execution.read()) {
        // 		console.log('data', d);
        // 	}
        // });
        // this.onDidEndTerminalShellExecution(e => {
        // 	console.log('*** onDidEndTerminalShellExecution', e);
        // });
        // setTimeout(() => {
        // 	console.log('before executeCommand(\"echo hello\")');
        // 	Array.from(this._activeShellIntegrations.values())[0].value.executeCommand('echo hello');
        // 	console.log('after executeCommand(\"echo hello\")');
        // }, 4000);
    }
    $shellIntegrationChange(instanceId) {
        const terminal = this._extHostTerminalService.getTerminalById(instanceId);
        if (!terminal) {
            return;
        }
        const apiTerminal = terminal.value;
        let shellIntegration = this._activeShellIntegrations.get(instanceId);
        if (!shellIntegration) {
            shellIntegration = new InternalTerminalShellIntegration(terminal.value, this._onDidStartTerminalShellExecution);
            this._activeShellIntegrations.set(instanceId, shellIntegration);
            shellIntegration.store.add(terminal.onWillDispose(() => this._activeShellIntegrations.get(instanceId)?.dispose()));
            shellIntegration.store.add(shellIntegration.onDidRequestShellExecution((commandLine) => this._proxy.$executeCommand(instanceId, commandLine)));
            shellIntegration.store.add(shellIntegration.onDidRequestEndExecution((e) => this._onDidEndTerminalShellExecution.fire(e)));
            shellIntegration.store.add(shellIntegration.onDidRequestChangeShellIntegration((e) => this._onDidChangeTerminalShellIntegration.fire(e)));
            terminal.shellIntegration = shellIntegration.value;
        }
        this._onDidChangeTerminalShellIntegration.fire({
            terminal: apiTerminal,
            shellIntegration: shellIntegration.value,
        });
    }
    $shellExecutionStart(instanceId, commandLineValue, commandLineConfidence, isTrusted, cwd) {
        // Force shellIntegration creation if it hasn't been created yet, this could when events
        // don't come through on startup
        if (!this._activeShellIntegrations.has(instanceId)) {
            this.$shellIntegrationChange(instanceId);
        }
        const commandLine = {
            value: commandLineValue,
            confidence: commandLineConfidence,
            isTrusted,
        };
        this._activeShellIntegrations.get(instanceId)?.startShellExecution(commandLine, URI.revive(cwd));
    }
    $shellExecutionEnd(instanceId, commandLineValue, commandLineConfidence, isTrusted, exitCode) {
        const commandLine = {
            value: commandLineValue,
            confidence: commandLineConfidence,
            isTrusted,
        };
        this._activeShellIntegrations.get(instanceId)?.endShellExecution(commandLine, exitCode);
    }
    $shellExecutionData(instanceId, data) {
        this._activeShellIntegrations.get(instanceId)?.emitData(data);
    }
    $shellEnvChange(instanceId, shellEnvKeys, shellEnvValues, isTrusted) {
        this._activeShellIntegrations.get(instanceId)?.setEnv(shellEnvKeys, shellEnvValues, isTrusted);
    }
    $cwdChange(instanceId, cwd) {
        this._activeShellIntegrations.get(instanceId)?.setCwd(URI.revive(cwd));
    }
    $closeTerminal(instanceId) {
        this._activeShellIntegrations.get(instanceId)?.dispose();
        this._activeShellIntegrations.delete(instanceId);
    }
};
ExtHostTerminalShellIntegration = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostTerminalService)
], ExtHostTerminalShellIntegration);
export { ExtHostTerminalShellIntegration };
export class InternalTerminalShellIntegration extends Disposable {
    get currentExecution() {
        return this._currentExecution;
    }
    constructor(_terminal, _onDidStartTerminalShellExecution) {
        super();
        this._terminal = _terminal;
        this._onDidStartTerminalShellExecution = _onDidStartTerminalShellExecution;
        this._pendingExecutions = [];
        this.store = this._register(new DisposableStore());
        this._onDidRequestChangeShellIntegration = this._register(new Emitter());
        this.onDidRequestChangeShellIntegration = this._onDidRequestChangeShellIntegration.event;
        this._onDidRequestShellExecution = this._register(new Emitter());
        this.onDidRequestShellExecution = this._onDidRequestShellExecution.event;
        this._onDidRequestEndExecution = this._register(new Emitter());
        this.onDidRequestEndExecution = this._onDidRequestEndExecution.event;
        this._onDidRequestNewExecution = this._register(new Emitter());
        this.onDidRequestNewExecution = this._onDidRequestNewExecution.event;
        const that = this;
        this.value = {
            get cwd() {
                return that._cwd;
            },
            get env() {
                if (!that._env) {
                    return undefined;
                }
                return Object.freeze({
                    isTrusted: that._env.isTrusted,
                    value: Object.freeze({ ...that._env.value }),
                });
            },
            // executeCommand(commandLine: string): vscode.TerminalShellExecution;
            // executeCommand(executable: string, args: string[]): vscode.TerminalShellExecution;
            executeCommand(commandLineOrExecutable, args) {
                let commandLineValue = commandLineOrExecutable;
                if (args) {
                    for (const arg of args) {
                        const wrapInQuotes = !arg.match(/["'`]/) && arg.match(/\s/);
                        if (wrapInQuotes) {
                            commandLineValue += ` "${arg}"`;
                        }
                        else {
                            commandLineValue += ` ${arg}`;
                        }
                    }
                }
                that._onDidRequestShellExecution.fire(commandLineValue);
                // Fire the event in a microtask to allow the extension to use the execution before
                // the start event fires
                const commandLine = {
                    value: commandLineValue,
                    confidence: TerminalShellExecutionCommandLineConfidence.High,
                    isTrusted: true,
                };
                const execution = that.requestNewShellExecution(commandLine, that._cwd).value;
                return execution;
            },
        };
    }
    requestNewShellExecution(commandLine, cwd) {
        const execution = new InternalTerminalShellExecution(commandLine, cwd ?? this._cwd);
        const unresolvedCommandLines = splitAndSanitizeCommandLine(commandLine.value);
        if (unresolvedCommandLines.length > 1) {
            this._currentExecutionProperties = {
                isMultiLine: true,
                unresolvedCommandLines: splitAndSanitizeCommandLine(commandLine.value),
            };
        }
        this._pendingExecutions.push(execution);
        this._onDidRequestNewExecution.fire(commandLine.value);
        return execution;
    }
    startShellExecution(commandLine, cwd) {
        // Since an execution is starting, fire the end event for any execution that is awaiting to
        // end. When this happens it means that the data stream may not be flushed and therefore may
        // fire events after the end event.
        if (this._pendingEndingExecution) {
            this._onDidRequestEndExecution.fire({
                terminal: this._terminal,
                shellIntegration: this.value,
                execution: this._pendingEndingExecution.value,
                exitCode: undefined,
            });
            this._pendingEndingExecution = undefined;
        }
        if (this._currentExecution) {
            // If the current execution is multi-line, check if this command line is part of it.
            if (this._currentExecutionProperties?.isMultiLine &&
                this._currentExecutionProperties.unresolvedCommandLines) {
                const subExecutionResult = isSubExecution(this._currentExecutionProperties.unresolvedCommandLines, commandLine);
                if (subExecutionResult) {
                    this._currentExecutionProperties.unresolvedCommandLines =
                        subExecutionResult.unresolvedCommandLines;
                    return;
                }
            }
            this._currentExecution.endExecution(undefined);
            this._currentExecution.flush();
            this._onDidRequestEndExecution.fire({
                terminal: this._terminal,
                shellIntegration: this.value,
                execution: this._currentExecution.value,
                exitCode: undefined,
            });
        }
        // Get the matching pending execution, how strict this is depends on the confidence of the
        // command line
        let currentExecution;
        if (commandLine.confidence === TerminalShellExecutionCommandLineConfidence.High) {
            for (const [i, execution] of this._pendingExecutions.entries()) {
                if (execution.value.commandLine.value === commandLine.value) {
                    currentExecution = execution;
                    this._currentExecutionProperties = {
                        isMultiLine: false,
                        unresolvedCommandLines: undefined,
                    };
                    currentExecution = execution;
                    this._pendingExecutions.splice(i, 1);
                    break;
                }
                else {
                    const subExecutionResult = isSubExecution(splitAndSanitizeCommandLine(execution.value.commandLine.value), commandLine);
                    if (subExecutionResult) {
                        this._currentExecutionProperties = {
                            isMultiLine: true,
                            unresolvedCommandLines: subExecutionResult.unresolvedCommandLines,
                        };
                        currentExecution = execution;
                        this._pendingExecutions.splice(i, 1);
                        break;
                    }
                }
            }
        }
        else {
            currentExecution = this._pendingExecutions.shift();
        }
        // If there is no execution, create a new one
        if (!currentExecution) {
            // Fallback to the shell integration's cwd as the cwd may not have been restored after a reload
            currentExecution = new InternalTerminalShellExecution(commandLine, cwd ?? this._cwd);
        }
        this._currentExecution = currentExecution;
        this._onDidStartTerminalShellExecution.fire({
            terminal: this._terminal,
            shellIntegration: this.value,
            execution: this._currentExecution.value,
        });
    }
    emitData(data) {
        this.currentExecution?.emitData(data);
    }
    endShellExecution(commandLine, exitCode) {
        // If the current execution is multi-line, don't end it until the next command line is
        // confirmed to not be a part of it.
        if (this._currentExecutionProperties?.isMultiLine) {
            if (this._currentExecutionProperties.unresolvedCommandLines &&
                this._currentExecutionProperties.unresolvedCommandLines.length > 0) {
                return;
            }
        }
        if (this._currentExecution) {
            const commandLineForEvent = this._currentExecutionProperties?.isMultiLine
                ? this._currentExecution.value.commandLine
                : commandLine;
            this._currentExecution.endExecution(commandLineForEvent);
            const currentExecution = this._currentExecution;
            this._pendingEndingExecution = currentExecution;
            this._currentExecution = undefined;
            // IMPORTANT: Ensure the current execution's data events are flushed in order to
            // prevent data events firing after the end event fires.
            currentExecution.flush().then(() => {
                // Only fire if it's still the same execution, if it's changed it would have already
                // been fired.
                if (this._pendingEndingExecution === currentExecution) {
                    this._onDidRequestEndExecution.fire({
                        terminal: this._terminal,
                        shellIntegration: this.value,
                        execution: currentExecution.value,
                        exitCode,
                    });
                    this._pendingEndingExecution = undefined;
                }
            });
        }
    }
    setEnv(keys, values, isTrusted) {
        const env = {};
        for (let i = 0; i < keys.length; i++) {
            env[keys[i]] = values[i];
        }
        this._env = { value: env, isTrusted };
        this._fireChangeEvent();
    }
    setCwd(cwd) {
        let wasChanged = false;
        if (URI.isUri(this._cwd)) {
            wasChanged = !URI.isUri(cwd) || this._cwd.toString() !== cwd.toString();
        }
        else if (this._cwd !== cwd) {
            wasChanged = true;
        }
        if (wasChanged) {
            this._cwd = cwd;
            this._fireChangeEvent();
        }
    }
    _fireChangeEvent() {
        this._onDidRequestChangeShellIntegration.fire({
            terminal: this._terminal,
            shellIntegration: this.value,
        });
    }
}
class InternalTerminalShellExecution {
    constructor(_commandLine, cwd) {
        this._commandLine = _commandLine;
        this.cwd = cwd;
        this._isEnded = false;
        const that = this;
        this.value = {
            get commandLine() {
                return that._commandLine;
            },
            get cwd() {
                return that.cwd;
            },
            read() {
                return that._createDataStream();
            },
        };
    }
    _createDataStream() {
        if (!this._dataStream) {
            if (this._isEnded) {
                return AsyncIterableObject.EMPTY;
            }
            this._dataStream = new ShellExecutionDataStream();
        }
        return this._dataStream.createIterable();
    }
    emitData(data) {
        if (!this._isEnded) {
            this._dataStream?.emitData(data);
        }
    }
    endExecution(commandLine) {
        if (commandLine) {
            this._commandLine = commandLine;
        }
        this._dataStream?.endExecution();
        this._isEnded = true;
    }
    async flush() {
        if (this._dataStream) {
            await this._dataStream.flush();
            this._dataStream.dispose();
            this._dataStream = undefined;
        }
    }
}
class ShellExecutionDataStream extends Disposable {
    constructor() {
        super(...arguments);
        this._iterables = [];
        this._emitters = [];
    }
    createIterable() {
        if (!this._barrier) {
            this._barrier = new Barrier();
        }
        const barrier = this._barrier;
        const iterable = new AsyncIterableObject(async (emitter) => {
            this._emitters.push(emitter);
            await barrier.wait();
        });
        this._iterables.push(iterable);
        return iterable;
    }
    emitData(data) {
        for (const emitter of this._emitters) {
            emitter.emitOne(data);
        }
    }
    endExecution() {
        this._barrier?.open();
    }
    async flush() {
        await Promise.all(this._iterables.map((e) => e.toPromise()));
    }
}
function splitAndSanitizeCommandLine(commandLine) {
    return commandLine
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}
/**
 * When executing something that the shell considers multiple commands, such as
 * a comment followed by a command, this needs to all be tracked under a single
 * execution.
 */
function isSubExecution(unresolvedCommandLines, commandLine) {
    if (unresolvedCommandLines.length === 0) {
        return false;
    }
    const newUnresolvedCommandLines = [...unresolvedCommandLines];
    const subExecutionLines = splitAndSanitizeCommandLine(commandLine.value);
    if (newUnresolvedCommandLines && newUnresolvedCommandLines.length > 0) {
        // If all sub-execution lines are in the command line, this is part of the
        // multi-line execution.
        while (newUnresolvedCommandLines.length > 0) {
            if (newUnresolvedCommandLines[0] !== subExecutionLines[0]) {
                break;
            }
            newUnresolvedCommandLines.shift();
            subExecutionLines.shift();
        }
        if (subExecutionLines.length === 0) {
            return { unresolvedCommandLines: newUnresolvedCommandLines };
        }
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUZXJtaW5hbFNoZWxsSW50ZWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixXQUFXLEdBR1gsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFjLE1BQU0sK0JBQStCLENBQUE7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBc0IsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLE9BQU8sR0FFUCxNQUFNLCtCQUErQixDQUFBO0FBU3RDLE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLGVBQWUsQ0FDOUQsa0NBQWtDLENBQ2xDLENBQUE7QUFFTSxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUNaLFNBQVEsVUFBVTtJQW9CbEIsWUFDcUIsVUFBOEIsRUFDekIsdUJBQWlFO1FBRTFGLEtBQUssRUFBRSxDQUFBO1FBRm1DLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBeUI7UUFmbkYsNkJBQXdCLEdBQy9CLElBQUksR0FBRyxFQUFFLENBQUE7UUFFUyx5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
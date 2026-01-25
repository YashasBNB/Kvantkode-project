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
/* eslint-disable local/code-no-native-private */
import { validateConstraint } from '../../../base/common/types.js';
import * as extHostTypes from './extHostTypes.js';
import * as extHostTypeConverter from './extHostTypeConverters.js';
import { cloneAndChange } from '../../../base/common/objects.js';
import { MainContext, } from './extHost.protocol.js';
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { revive } from '../../../base/common/marshalling.js';
import { Range } from '../../../editor/common/core/range.js';
import { Position } from '../../../editor/common/core/position.js';
import { URI } from '../../../base/common/uri.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { TestItemImpl } from './extHostTestItem.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { TelemetryTrustedValue } from '../../../platform/telemetry/common/telemetryUtils.js';
import { IExtHostTelemetry } from './extHostTelemetry.js';
import { generateUuid } from '../../../base/common/uuid.js';
let ExtHostCommands = class ExtHostCommands {
    #proxy;
    #telemetry;
    #extHostTelemetry;
    constructor(extHostRpc, logService, extHostTelemetry) {
        this._commands = new Map();
        this._apiCommands = new Map();
        this.#proxy = extHostRpc.getProxy(MainContext.MainThreadCommands);
        this._logService = logService;
        this.#extHostTelemetry = extHostTelemetry;
        this.#telemetry = extHostRpc.getProxy(MainContext.MainThreadTelemetry);
        this.converter = new CommandsConverter(this, (id) => {
            // API commands that have no return type (void) can be
            // converted to their internal command and don't need
            // any indirection commands
            const candidate = this._apiCommands.get(id);
            return candidate?.result === ApiCommandResult.Void ? candidate : undefined;
        }, logService);
        this._argumentProcessors = [
            {
                processArgument(a) {
                    // URI, Regex
                    return revive(a);
                },
            },
            {
                processArgument(arg) {
                    return cloneAndChange(arg, function (obj) {
                        // Reverse of https://github.com/microsoft/vscode/blob/1f28c5fc681f4c01226460b6d1c7e91b8acb4a5b/src/vs/workbench/api/node/extHostCommands.ts#L112-L127
                        if (Range.isIRange(obj)) {
                            return extHostTypeConverter.Range.to(obj);
                        }
                        if (Position.isIPosition(obj)) {
                            return extHostTypeConverter.Position.to(obj);
                        }
                        if (Range.isIRange(obj.range) &&
                            URI.isUri(obj.uri)) {
                            return extHostTypeConverter.location.to(obj);
                        }
                        if (obj instanceof VSBuffer) {
                            return obj.buffer.buffer;
                        }
                        if (!Array.isArray(obj)) {
                            return obj;
                        }
                    });
                },
            },
        ];
    }
    registerArgumentProcessor(processor) {
        this._argumentProcessors.push(processor);
    }
    registerApiCommand(apiCommand) {
        const registration = this.registerCommand(false, apiCommand.id, async (...apiArgs) => {
            const internalArgs = apiCommand.args.map((arg, i) => {
                if (!arg.validate(apiArgs[i])) {
                    throw new Error(`Invalid argument '${arg.name}' when running '${apiCommand.id}', received: ${typeof apiArgs[i] === 'object' ? JSON.stringify(apiArgs[i], null, '\t') : apiArgs[i]} `);
                }
                return arg.convert(apiArgs[i]);
            });
            const internalResult = await this.executeCommand(apiCommand.internalId, ...internalArgs);
            return apiCommand.result.convert(internalResult, apiArgs, this.converter);
        }, undefined, {
            description: apiCommand.description,
            args: apiCommand.args,
            returns: apiCommand.result.description,
        });
        this._apiCommands.set(apiCommand.id, apiCommand);
        return new extHostTypes.Disposable(() => {
            registration.dispose();
            this._apiCommands.delete(apiCommand.id);
        });
    }
    registerCommand(global, id, callback, thisArg, metadata, extension) {
        this._logService.trace('ExtHostCommands#registerCommand', id);
        if (!id.trim().length) {
            throw new Error('invalid id');
        }
        if (this._commands.has(id)) {
            throw new Error(`command '${id}' already exists`);
        }
        this._commands.set(id, { callback, thisArg, metadata, extension });
        if (global) {
            this.#proxy.$registerCommand(id);
        }
        return new extHostTypes.Disposable(() => {
            if (this._commands.delete(id)) {
                if (global) {
                    this.#proxy.$unregisterCommand(id);
                }
            }
        });
    }
    executeCommand(id, ...args) {
        this._logService.trace('ExtHostCommands#executeCommand', id);
        return this._doExecuteCommand(id, args, true);
    }
    async _doExecuteCommand(id, args, retry) {
        if (this._commands.has(id)) {
            // - We stay inside the extension host and support
            // 	 to pass any kind of parameters around.
            // - We still emit the corresponding activation event
            //   BUT we don't await that event
            this.#proxy.$fireCommandActivationEvent(id);
            return this._executeContributedCommand(id, args, false);
        }
        else {
            // automagically convert some argument types
            let hasBuffers = false;
            const toArgs = cloneAndChange(args, function (value) {
                if (value instanceof extHostTypes.Position) {
                    return extHostTypeConverter.Position.from(value);
                }
                else if (value instanceof extHostTypes.Range) {
                    return extHostTypeConverter.Range.from(value);
                }
                else if (value instanceof extHostTypes.Location) {
                    return extHostTypeConverter.location.from(value);
                }
                else if (extHostTypes.NotebookRange.isNotebookRange(value)) {
                    return extHostTypeConverter.NotebookRange.from(value);
                }
                else if (value instanceof ArrayBuffer) {
                    hasBuffers = true;
                    return VSBuffer.wrap(new Uint8Array(value));
                }
                else if (value instanceof Uint8Array) {
                    hasBuffers = true;
                    return VSBuffer.wrap(value);
                }
                else if (value instanceof VSBuffer) {
                    hasBuffers = true;
                    return value;
                }
                if (!Array.isArray(value)) {
                    return value;
                }
            });
            try {
                const result = await this.#proxy.$executeCommand(id, hasBuffers ? new SerializableObjectWithBuffers(toArgs) : toArgs, retry);
                return revive(result);
            }
            catch (e) {
                // Rerun the command when it wasn't known, had arguments, and when retry
                // is enabled. We do this because the command might be registered inside
                // the extension host now and can therefore accept the arguments as-is.
                if (e instanceof Error && e.message === '$executeCommand:retry') {
                    return this._doExecuteCommand(id, args, false);
                }
                else {
                    throw e;
                }
            }
        }
    }
    async _executeContributedCommand(id, args, annotateError) {
        const command = this._commands.get(id);
        if (!command) {
            throw new Error('Unknown command');
        }
        const { callback, thisArg, metadata } = command;
        if (metadata?.args) {
            for (let i = 0; i < metadata.args.length; i++) {
                try {
                    validateConstraint(args[i], metadata.args[i].constraint);
                }
                catch (err) {
                    throw new Error(`Running the contributed command: '${id}' failed. Illegal argument '${metadata.args[i].name}' - ${metadata.args[i].description}`);
                }
            }
        }
        const stopWatch = StopWatch.create();
        try {
            return await callback.apply(thisArg, args);
        }
        catch (err) {
            // The indirection-command from the converter can fail when invoking the actual
            // command and in that case it is better to blame the correct command
            if (id === this.converter.delegatingCommandId) {
                const actual = this.converter.getActualCommand(...args);
                if (actual) {
                    id = actual.command;
                }
            }
            this._logService.error(err, id, command.extension?.identifier);
            if (!annotateError) {
                throw err;
            }
            if (command.extension?.identifier) {
                const reported = this.#extHostTelemetry.onExtensionError(command.extension.identifier, err);
                this._logService.trace('forwarded error to extension?', reported, command.extension?.identifier);
            }
            throw new (class CommandError extends Error {
                constructor() {
                    super(toErrorMessage(err));
                    this.id = id;
                    this.source = command.extension?.displayName ?? command.extension?.name;
                }
            })();
        }
        finally {
            this._reportTelemetry(command, id, stopWatch.elapsed());
        }
    }
    _reportTelemetry(command, id, duration) {
        if (!command.extension) {
            return;
        }
        this.#telemetry.$publicLog2('Extension:ActionExecuted', {
            extensionId: command.extension.identifier.value,
            id: new TelemetryTrustedValue(id),
            duration: duration,
        });
    }
    $executeContributedCommand(id, ...args) {
        this._logService.trace('ExtHostCommands#$executeContributedCommand', id);
        const cmdHandler = this._commands.get(id);
        if (!cmdHandler) {
            return Promise.reject(new Error(`Contributed command '${id}' does not exist.`));
        }
        else {
            args = args.map((arg) => this._argumentProcessors.reduce((r, p) => p.processArgument(r, cmdHandler.extension), arg));
            return this._executeContributedCommand(id, args, true);
        }
    }
    getCommands(filterUnderscoreCommands = false) {
        this._logService.trace('ExtHostCommands#getCommands', filterUnderscoreCommands);
        return this.#proxy.$getCommands().then((result) => {
            if (filterUnderscoreCommands) {
                result = result.filter((command) => command[0] !== '_');
            }
            return result;
        });
    }
    $getContributedCommandMetadata() {
        const result = Object.create(null);
        for (const [id, command] of this._commands) {
            const { metadata } = command;
            if (metadata) {
                result[id] = metadata;
            }
        }
        return Promise.resolve(result);
    }
};
ExtHostCommands = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService),
    __param(2, IExtHostTelemetry)
], ExtHostCommands);
export { ExtHostCommands };
export const IExtHostCommands = createDecorator('IExtHostCommands');
export class CommandsConverter {
    // --- conversion between internal and api commands
    constructor(_commands, _lookupApiCommand, _logService) {
        this._commands = _commands;
        this._lookupApiCommand = _lookupApiCommand;
        this._logService = _logService;
        this.delegatingCommandId = `__vsc${generateUuid()}`;
        this._cache = new Map();
        this._cachIdPool = 0;
        this._commands.registerCommand(true, this.delegatingCommandId, this._executeConvertedCommand, this);
    }
    toInternal(command, disposables) {
        if (!command) {
            return undefined;
        }
        const result = {
            $ident: undefined,
            id: command.command,
            title: command.title,
            tooltip: command.tooltip,
        };
        if (!command.command) {
            // falsy command id -> return converted command but don't attempt any
            // argument or API-command dance since this command won't run anyways
            return result;
        }
        const apiCommand = this._lookupApiCommand(command.command);
        if (apiCommand) {
            // API command with return-value can be converted inplace
            result.id = apiCommand.internalId;
            result.arguments = apiCommand.args.map((arg, i) => arg.convert(command.arguments && command.arguments[i]));
        }
        else if (isNonEmptyArray(command.arguments)) {
            // we have a contributed command with arguments. that
            // means we don't want to send the arguments around
            const id = `${command.command} /${++this._cachIdPool}`;
            this._cache.set(id, command);
            disposables.add(toDisposable(() => {
                this._cache.delete(id);
                this._logService.trace('CommandsConverter#DISPOSE', id);
            }));
            result.$ident = id;
            result.id = this.delegatingCommandId;
            result.arguments = [id];
            this._logService.trace('CommandsConverter#CREATE', command.command, id);
        }
        return result;
    }
    fromInternal(command) {
        if (typeof command.$ident === 'string') {
            return this._cache.get(command.$ident);
        }
        else {
            return {
                command: command.id,
                title: command.title,
                arguments: command.arguments,
            };
        }
    }
    getActualCommand(...args) {
        return this._cache.get(args[0]);
    }
    _executeConvertedCommand(...args) {
        const actualCmd = this.getActualCommand(...args);
        this._logService.trace('CommandsConverter#EXECUTE', args[0], actualCmd ? actualCmd.command : 'MISSING');
        if (!actualCmd) {
            return Promise.reject(`Actual command not found, wanted to execute ${args[0]}`);
        }
        return this._commands.executeCommand(actualCmd.command, ...(actualCmd.arguments || []));
    }
}
export class ApiCommandArgument {
    static { this.Uri = new ApiCommandArgument('uri', 'Uri of a text document', (v) => URI.isUri(v), (v) => v); }
    static { this.Position = new ApiCommandArgument('position', 'A position in a text document', (v) => extHostTypes.Position.isPosition(v), extHostTypeConverter.Position.from); }
    static { this.Range = new ApiCommandArgument('range', 'A range in a text document', (v) => extHostTypes.Range.isRange(v), extHostTypeConverter.Range.from); }
    static { this.Selection = new ApiCommandArgument('selection', 'A selection in a text document', (v) => extHostTypes.Selection.isSelection(v), extHostTypeConverter.Selection.from); }
    static { this.Number = new ApiCommandArgument('number', '', (v) => typeof v === 'number', (v) => v); }
    static { this.String = new ApiCommandArgument('string', '', (v) => typeof v === 'string', (v) => v); }
    static { this.StringArray = ApiCommandArgument.Arr(ApiCommandArgument.String); }
    static Arr(element) {
        return new ApiCommandArgument(`${element.name}_array`, `Array of ${element.name}, ${element.description}`, (v) => Array.isArray(v) && v.every((e) => element.validate(e)), (v) => v.map((e) => element.convert(e)));
    }
    static { this.CallHierarchyItem = new ApiCommandArgument('item', 'A call hierarchy item', (v) => v instanceof extHostTypes.CallHierarchyItem, extHostTypeConverter.CallHierarchyItem.from); }
    static { this.TypeHierarchyItem = new ApiCommandArgument('item', 'A type hierarchy item', (v) => v instanceof extHostTypes.TypeHierarchyItem, extHostTypeConverter.TypeHierarchyItem.from); }
    static { this.TestItem = new ApiCommandArgument('testItem', 'A VS Code TestItem', (v) => v instanceof TestItemImpl, extHostTypeConverter.TestItem.from); }
    static { this.TestProfile = new ApiCommandArgument('testProfile', 'A VS Code test profile', (v) => v instanceof extHostTypes.TestRunProfileBase, extHostTypeConverter.TestRunProfile.from); }
    constructor(name, description, validate, convert) {
        this.name = name;
        this.description = description;
        this.validate = validate;
        this.convert = convert;
    }
    optional() {
        return new ApiCommandArgument(this.name, `(optional) ${this.description}`, (value) => value === undefined || value === null || this.validate(value), (value) => (value === undefined ? undefined : value === null ? null : this.convert(value)));
    }
    with(name, description) {
        return new ApiCommandArgument(name ?? this.name, description ?? this.description, this.validate, this.convert);
    }
}
export class ApiCommandResult {
    static { this.Void = new ApiCommandResult('no result', (v) => v); }
    constructor(description, convert) {
        this.description = description;
        this.convert = convert;
    }
}
export class ApiCommand {
    constructor(id, internalId, description, args, result) {
        this.id = id;
        this.internalId = internalId;
        this.description = description;
        this.args = args;
        this.result = result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsaURBQWlEO0FBRWpELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRWxFLE9BQU8sS0FBSyxZQUFZLE1BQU0sbUJBQW1CLENBQUE7QUFDakQsT0FBTyxLQUFLLG9CQUFvQixNQUFNLDRCQUE0QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sV0FBVyxHQU1YLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFtQixZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FB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
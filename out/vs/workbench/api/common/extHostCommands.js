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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdENvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLGlEQUFpRDtBQUVqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVsRSxPQUFPLEtBQUssWUFBWSxNQUFNLG1CQUFtQixDQUFBO0FBQ2pELE9BQU8sS0FBSyxvQkFBb0IsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDaEUsT0FBTyxFQUNOLFdBQVcsR0FNWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRSxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBbUIsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRTNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENB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
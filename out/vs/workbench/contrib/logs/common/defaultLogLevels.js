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
import { ILogService, ILoggerService, LogLevelToString, getLogLevel, parseLogLevel, } from '../../../../platform/log/common/log.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IFileService, toFileOperationResult, } from '../../../../platform/files/common/files.js';
import { IJSONEditingService } from '../../../services/configuration/common/jsonEditing.js';
import { isString, isUndefined } from '../../../../base/common/types.js';
import { EXTENSION_IDENTIFIER_WITH_LOG_REGEX } from '../../../../platform/environment/common/environmentService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { parse } from '../../../../base/common/json.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
export const IDefaultLogLevelsService = createDecorator('IDefaultLogLevelsService');
let DefaultLogLevelsService = class DefaultLogLevelsService extends Disposable {
    constructor(environmentService, fileService, jsonEditingService, logService, loggerService) {
        super();
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.jsonEditingService = jsonEditingService;
        this.logService = logService;
        this.loggerService = loggerService;
        this._onDidChangeDefaultLogLevels = this._register(new Emitter());
        this.onDidChangeDefaultLogLevels = this._onDidChangeDefaultLogLevels.event;
    }
    async getDefaultLogLevels() {
        const argvLogLevel = await this._parseLogLevelsFromArgv();
        return {
            default: argvLogLevel?.default ?? this._getDefaultLogLevelFromEnv(),
            extensions: argvLogLevel?.extensions ?? this._getExtensionsDefaultLogLevelsFromEnv(),
        };
    }
    async getDefaultLogLevel(extensionId) {
        const argvLogLevel = (await this._parseLogLevelsFromArgv()) ?? {};
        if (extensionId) {
            extensionId = extensionId.toLowerCase();
            return this._getDefaultLogLevel(argvLogLevel, extensionId);
        }
        else {
            return this._getDefaultLogLevel(argvLogLevel);
        }
    }
    async setDefaultLogLevel(defaultLogLevel, extensionId) {
        const argvLogLevel = (await this._parseLogLevelsFromArgv()) ?? {};
        if (extensionId) {
            extensionId = extensionId.toLowerCase();
            const currentDefaultLogLevel = this._getDefaultLogLevel(argvLogLevel, extensionId);
            argvLogLevel.extensions = argvLogLevel.extensions ?? [];
            const extension = argvLogLevel.extensions.find(([extension]) => extension === extensionId);
            if (extension) {
                extension[1] = defaultLogLevel;
            }
            else {
                argvLogLevel.extensions.push([extensionId, defaultLogLevel]);
            }
            await this._writeLogLevelsToArgv(argvLogLevel);
            const extensionLoggers = [...this.loggerService.getRegisteredLoggers()].filter((logger) => logger.extensionId && logger.extensionId.toLowerCase() === extensionId);
            for (const { resource } of extensionLoggers) {
                if (this.loggerService.getLogLevel(resource) === currentDefaultLogLevel) {
                    this.loggerService.setLogLevel(resource, defaultLogLevel);
                }
            }
        }
        else {
            const currentLogLevel = this._getDefaultLogLevel(argvLogLevel);
            argvLogLevel.default = defaultLogLevel;
            await this._writeLogLevelsToArgv(argvLogLevel);
            if (this.loggerService.getLogLevel() === currentLogLevel) {
                this.loggerService.setLogLevel(defaultLogLevel);
            }
        }
        this._onDidChangeDefaultLogLevels.fire();
    }
    _getDefaultLogLevel(argvLogLevels, extension) {
        if (extension) {
            const extensionLogLevel = argvLogLevels.extensions?.find(([extensionId]) => extensionId === extension);
            if (extensionLogLevel) {
                return extensionLogLevel[1];
            }
        }
        return argvLogLevels.default ?? getLogLevel(this.environmentService);
    }
    async _writeLogLevelsToArgv(logLevels) {
        const logLevelsValue = [];
        if (!isUndefined(logLevels.default)) {
            logLevelsValue.push(LogLevelToString(logLevels.default));
        }
        for (const [extension, logLevel] of logLevels.extensions ?? []) {
            logLevelsValue.push(`${extension}=${LogLevelToString(logLevel)}`);
        }
        await this.jsonEditingService.write(this.environmentService.argvResource, [{ path: ['log-level'], value: logLevelsValue.length ? logLevelsValue : undefined }], true);
    }
    async _parseLogLevelsFromArgv() {
        const result = { extensions: [] };
        const logLevels = await this._readLogLevelsFromArgv();
        for (const extensionLogLevel of logLevels) {
            const matches = EXTENSION_IDENTIFIER_WITH_LOG_REGEX.exec(extensionLogLevel);
            if (matches && matches[1] && matches[2]) {
                const logLevel = parseLogLevel(matches[2]);
                if (!isUndefined(logLevel)) {
                    result.extensions?.push([matches[1].toLowerCase(), logLevel]);
                }
            }
            else {
                const logLevel = parseLogLevel(extensionLogLevel);
                if (!isUndefined(logLevel)) {
                    result.default = logLevel;
                }
            }
        }
        return !isUndefined(result.default) || result.extensions?.length ? result : undefined;
    }
    async _readLogLevelsFromArgv() {
        try {
            const content = await this.fileService.readFile(this.environmentService.argvResource);
            const argv = parse(content.value.toString());
            return isString(argv['log-level'])
                ? [argv['log-level']]
                : Array.isArray(argv['log-level'])
                    ? argv['log-level']
                    : [];
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
        }
        return [];
    }
    _getDefaultLogLevelFromEnv() {
        return getLogLevel(this.environmentService);
    }
    _getExtensionsDefaultLogLevelsFromEnv() {
        const result = [];
        for (const [extension, logLevelValue] of this.environmentService.extensionLogLevel ?? []) {
            const logLevel = parseLogLevel(logLevelValue);
            if (!isUndefined(logLevel)) {
                result.push([extension, logLevel]);
            }
        }
        return result;
    }
};
DefaultLogLevelsService = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IFileService),
    __param(2, IJSONEditingService),
    __param(3, ILogService),
    __param(4, ILoggerService)
], DefaultLogLevelsService);
registerSingleton(IDefaultLogLevelsService, DefaultLogLevelsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdExvZ0xldmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9ncy9jb21tb24vZGVmYXVsdExvZ0xldmVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sV0FBVyxFQUNYLGNBQWMsRUFFZCxnQkFBZ0IsRUFDaEIsV0FBVyxFQUNYLGFBQWEsR0FDYixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBRU4sWUFBWSxFQUNaLHFCQUFxQixHQUNyQixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDbkgsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBU2pFLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLGVBQWUsQ0FDdEQsMEJBQTBCLENBQzFCLENBQUE7QUFpQkQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBTS9D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
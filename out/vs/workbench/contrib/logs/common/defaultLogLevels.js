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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdExvZ0xldmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvZ3MvY29tbW9uL2RlZmF1bHRMb2dMZXZlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFdBQVcsRUFDWCxjQUFjLEVBRWQsZ0JBQWdCLEVBQ2hCLFdBQVcsRUFDWCxhQUFhLEdBQ2IsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDekcsT0FBTyxFQUVOLFlBQVksRUFDWixxQkFBcUIsR0FDckIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ25ILE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQVNqRSxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxlQUFlLENBQ3RELDBCQUEwQixDQUMxQixDQUFBO0FBaUJELElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTtJQU0vQyxZQUMrQixrQkFBaUUsRUFDakYsV0FB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
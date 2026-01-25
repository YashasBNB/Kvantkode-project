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
var SettingsFileSystemProvider_1;
import { NotSupportedError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { FilePermission, FileSystemProviderErrorCode, FileType, } from '../../../../platform/files/common/files.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import * as JSONContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ILogService, LogLevel } from '../../../../platform/log/common/log.js';
import { isEqual } from '../../../../base/common/resources.js';
const schemaRegistry = Registry.as(JSONContributionRegistry.Extensions.JSONContribution);
let SettingsFileSystemProvider = class SettingsFileSystemProvider extends Disposable {
    static { SettingsFileSystemProvider_1 = this; }
    static { this.SCHEMA = Schemas.vscode; }
    static { this.SCHEMA_ASSOCIATIONS = URI.parse(`${Schemas.vscode}://schemas-associations/schemas-associations.json`); }
    constructor(preferencesService, logService) {
        super();
        this.preferencesService = preferencesService;
        this.logService = logService;
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */ + 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this.onDidChangeCapabilities = Event.None;
        this._register(schemaRegistry.onDidChangeSchema((schemaUri) => {
            this._onDidChangeFile.fire([
                { resource: URI.parse(schemaUri), type: 0 /* FileChangeType.UPDATED */ },
            ]);
        }));
        this._register(schemaRegistry.onDidChangeSchemaAssociations(() => {
            this._onDidChangeFile.fire([
                {
                    resource: SettingsFileSystemProvider_1.SCHEMA_ASSOCIATIONS,
                    type: 0 /* FileChangeType.UPDATED */,
                },
            ]);
        }));
        this._register(preferencesService.onDidDefaultSettingsContentChanged((uri) => {
            this._onDidChangeFile.fire([{ resource: uri, type: 0 /* FileChangeType.UPDATED */ }]);
        }));
    }
    async readFile(uri) {
        if (uri.scheme !== SettingsFileSystemProvider_1.SCHEMA) {
            throw new NotSupportedError();
        }
        let content;
        if (uri.authority === 'schemas') {
            content = this.getSchemaContent(uri);
        }
        else if (uri.authority === SettingsFileSystemProvider_1.SCHEMA_ASSOCIATIONS.authority) {
            content = JSON.stringify(schemaRegistry.getSchemaAssociations());
        }
        else if (uri.authority === 'defaultsettings') {
            content = this.preferencesService.getDefaultSettingsContent(uri);
        }
        if (content) {
            return VSBuffer.fromString(content).buffer;
        }
        throw FileSystemProviderErrorCode.FileNotFound;
    }
    async stat(uri) {
        if (schemaRegistry.hasSchemaContent(uri.toString()) ||
            this.preferencesService.hasDefaultSettingsContent(uri)) {
            const currentTime = Date.now();
            return {
                type: FileType.File,
                permissions: FilePermission.Readonly,
                mtime: currentTime,
                ctime: currentTime,
                size: 0,
            };
        }
        if (isEqual(uri, SettingsFileSystemProvider_1.SCHEMA_ASSOCIATIONS)) {
            const currentTime = Date.now();
            return {
                type: FileType.File,
                permissions: FilePermission.Readonly,
                mtime: currentTime,
                ctime: currentTime,
                size: 0,
            };
        }
        throw FileSystemProviderErrorCode.FileNotFound;
    }
    watch(resource, opts) {
        return Disposable.None;
    }
    async mkdir(resource) { }
    async readdir(resource) {
        return [];
    }
    async rename(from, to, opts) { }
    async delete(resource, opts) { }
    async writeFile() {
        throw new NotSupportedError();
    }
    getSchemaContent(uri) {
        const startTime = Date.now();
        const content = schemaRegistry.getSchemaContent(uri.toString()) ??
            '{}'; /* Use empty schema if not yet registered */
        const logLevel = this.logService.getLevel();
        if (logLevel === LogLevel.Debug || logLevel === LogLevel.Trace) {
            const endTime = Date.now();
            const uncompressed = JSON.stringify(schemaRegistry.getSchemaContributions().schemas[uri.toString()]);
            this.logService.debug(`${uri.toString()}: ${uncompressed.length} -> ${content.length} (${Math.round(((uncompressed.length - content.length) / uncompressed.length) * 100)}%) Took ${endTime - startTime}ms`);
        }
        return content;
    }
};
SettingsFileSystemProvider = SettingsFileSystemProvider_1 = __decorate([
    __param(0, IPreferencesService),
    __param(1, ILogService)
], SettingsFileSystemProvider);
export { SettingsFileSystemProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NGaWxlc3lzdGVtUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2NvbW1vbi9zZXR0aW5nc0ZpbGVzeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUVOLGNBQWMsRUFFZCwyQkFBMkIsRUFDM0IsUUFBUSxHQU9SLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxLQUFLLHdCQUF3QixNQUFNLHFFQUFxRSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU5RCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUNqQyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQ3BELENBQUE7QUFFTSxJQUFN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
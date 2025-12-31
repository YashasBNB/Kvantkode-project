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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NGaWxlc3lzdGVtUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9jb21tb24vc2V0dGluZ3NGaWxlc3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBZSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFFTixjQUFjLEVBRWQsMkJBQTJCLEVBQzNCLFFBQVEsR0FPUixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sS0FBSyx3QkFBd0IsTUFBTSxxRUFBcUUsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFOUQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDakMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUNwRCxDQUFBO0FBRU0sSUFBTSwwQkFB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
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
import { Queue } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { ResourceMap } from '../../../base/common/map.js';
import { URI } from '../../../base/common/uri.js';
import { isIExtensionIdentifier } from './extensionManagement.js';
import { areSameExtensions } from './extensionManagementUtil.js';
import { IFileService, toFileOperationResult, } from '../../files/common/files.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { isObject, isString, isUndefined } from '../../../base/common/types.js';
import { getErrorMessage } from '../../../base/common/errors.js';
export var ExtensionsProfileScanningErrorCode;
(function (ExtensionsProfileScanningErrorCode) {
    /**
     * Error when trying to scan extensions from a profile that does not exist.
     */
    ExtensionsProfileScanningErrorCode["ERROR_PROFILE_NOT_FOUND"] = "ERROR_PROFILE_NOT_FOUND";
    /**
     * Error when profile file is invalid.
     */
    ExtensionsProfileScanningErrorCode["ERROR_INVALID_CONTENT"] = "ERROR_INVALID_CONTENT";
})(ExtensionsProfileScanningErrorCode || (ExtensionsProfileScanningErrorCode = {}));
export class ExtensionsProfileScanningError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
export const IExtensionsProfileScannerService = createDecorator('IExtensionsProfileScannerService');
let AbstractExtensionsProfileScannerService = class AbstractExtensionsProfileScannerService extends Disposable {
    constructor(extensionsLocation, fileService, userDataProfilesService, uriIdentityService, logService) {
        super();
        this.extensionsLocation = extensionsLocation;
        this.fileService = fileService;
        this.userDataProfilesService = userDataProfilesService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._onAddExtensions = this._register(new Emitter());
        this.onAddExtensions = this._onAddExtensions.event;
        this._onDidAddExtensions = this._register(new Emitter());
        this.onDidAddExtensions = this._onDidAddExtensions.event;
        this._onRemoveExtensions = this._register(new Emitter());
        this.onRemoveExtensions = this._onRemoveExtensions.event;
        this._onDidRemoveExtensions = this._register(new Emitter());
        this.onDidRemoveExtensions = this._onDidRemoveExtensions.event;
        this.resourcesAccessQueueMap = new ResourceMap();
    }
    scanProfileExtensions(profileLocation, options) {
        return this.withProfileExtensions(profileLocation, undefined, options);
    }
    async addExtensionsToProfile(extensions, profileLocation, keepExistingVersions) {
        const extensionsToRemove = [];
        const extensionsToAdd = [];
        try {
            await this.withProfileExtensions(profileLocation, (existingExtensions) => {
                const result = [];
                if (keepExistingVersions) {
                    result.push(...existingExtensions);
                }
                else {
                    for (const existing of existingExtensions) {
                        if (extensions.some(([e]) => areSameExtensions(e.identifier, existing.identifier) &&
                            e.manifest.version !== existing.version)) {
                            // Remove the existing extension with different version
                            extensionsToRemove.push(existing);
                        }
                        else {
                            result.push(existing);
                        }
                    }
                }
                for (const [extension, metadata] of extensions) {
                    const index = result.findIndex((e) => areSameExtensions(e.identifier, extension.identifier) &&
                        e.version === extension.manifest.version);
                    const extensionToAdd = {
                        identifier: extension.identifier,
                        version: extension.manifest.version,
                        location: extension.location,
                        metadata,
                    };
                    if (index === -1) {
                        extensionsToAdd.push(extensionToAdd);
                        result.push(extensionToAdd);
                    }
                    else {
                        result.splice(index, 1, extensionToAdd);
                    }
                }
                if (extensionsToAdd.length) {
                    this._onAddExtensions.fire({ extensions: extensionsToAdd, profileLocation });
                }
                if (extensionsToRemove.length) {
                    this._onRemoveExtensions.fire({ extensions: extensionsToRemove, profileLocation });
                }
                return result;
            });
            if (extensionsToAdd.length) {
                this._onDidAddExtensions.fire({ extensions: extensionsToAdd, profileLocation });
            }
            if (extensionsToRemove.length) {
                this._onDidRemoveExtensions.fire({ extensions: extensionsToRemove, profileLocation });
            }
            return extensionsToAdd;
        }
        catch (error) {
            if (extensionsToAdd.length) {
                this._onDidAddExtensions.fire({ extensions: extensionsToAdd, error, profileLocation });
            }
            if (extensionsToRemove.length) {
                this._onDidRemoveExtensions.fire({ extensions: extensionsToRemove, error, profileLocation });
            }
            throw error;
        }
    }
    async updateMetadata(extensions, profileLocation) {
        const updatedExtensions = [];
        await this.withProfileExtensions(profileLocation, (profileExtensions) => {
            const result = [];
            for (const profileExtension of profileExtensions) {
                const extension = extensions.find(([e]) => areSameExtensions(e.identifier, profileExtension.identifier) &&
                    e.manifest.version === profileExtension.version);
                if (extension) {
                    profileExtension.metadata = { ...profileExtension.metadata, ...extension[1] };
                    updatedExtensions.push(profileExtension);
                    result.push(profileExtension);
                }
                else {
                    result.push(profileExtension);
                }
            }
            return result;
        });
        return updatedExtensions;
    }
    async removeExtensionsFromProfile(extensions, profileLocation) {
        const extensionsToRemove = [];
        try {
            await this.withProfileExtensions(profileLocation, (profileExtensions) => {
                const result = [];
                for (const e of profileExtensions) {
                    if (extensions.some((extension) => areSameExtensions(e.identifier, extension))) {
                        extensionsToRemove.push(e);
                    }
                    else {
                        result.push(e);
                    }
                }
                if (extensionsToRemove.length) {
                    this._onRemoveExtensions.fire({ extensions: extensionsToRemove, profileLocation });
                }
                return result;
            });
            if (extensionsToRemove.length) {
                this._onDidRemoveExtensions.fire({ extensions: extensionsToRemove, profileLocation });
            }
        }
        catch (error) {
            if (extensionsToRemove.length) {
                this._onDidRemoveExtensions.fire({ extensions: extensionsToRemove, error, profileLocation });
            }
            throw error;
        }
    }
    async withProfileExtensions(file, updateFn, options) {
        return this.getResourceAccessQueue(file).queue(async () => {
            let extensions = [];
            // Read
            let storedProfileExtensions;
            try {
                const content = await this.fileService.readFile(file);
                storedProfileExtensions = JSON.parse(content.value.toString().trim() || '[]');
            }
            catch (error) {
                if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    throw error;
                }
                // migrate from old location, remove this after couple of releases
                if (this.uriIdentityService.extUri.isEqual(file, this.userDataProfilesService.defaultProfile.extensionsResource)) {
                    storedProfileExtensions = await this.migrateFromOldDefaultProfileExtensionsLocation();
                }
                if (!storedProfileExtensions && options?.bailOutWhenFileNotFound) {
                    throw new ExtensionsProfileScanningError(getErrorMessage(error), "ERROR_PROFILE_NOT_FOUND" /* ExtensionsProfileScanningErrorCode.ERROR_PROFILE_NOT_FOUND */);
                }
            }
            if (storedProfileExtensions) {
                if (!Array.isArray(storedProfileExtensions)) {
                    this.throwInvalidConentError(file);
                }
                // TODO @sandy081: Remove this migration after couple of releases
                let migrate = false;
                for (const e of storedProfileExtensions) {
                    if (!isStoredProfileExtension(e)) {
                        this.throwInvalidConentError(file);
                    }
                    let location;
                    if (isString(e.relativeLocation) && e.relativeLocation) {
                        // Extension in new format. No migration needed.
                        location = this.resolveExtensionLocation(e.relativeLocation);
                    }
                    else if (isString(e.location)) {
                        this.logService.warn(`Extensions profile: Ignoring extension with invalid location: ${e.location}`);
                        continue;
                    }
                    else {
                        location = URI.revive(e.location);
                        const relativePath = this.toRelativePath(location);
                        if (relativePath) {
                            // Extension in old format. Migrate to new format.
                            migrate = true;
                            e.relativeLocation = relativePath;
                        }
                    }
                    if (isUndefined(e.metadata?.hasPreReleaseVersion) && e.metadata?.preRelease) {
                        migrate = true;
                        e.metadata.hasPreReleaseVersion = true;
                    }
                    const uuid = e.metadata?.id ?? e.identifier.uuid;
                    extensions.push({
                        identifier: uuid ? { id: e.identifier.id, uuid } : { id: e.identifier.id },
                        location,
                        version: e.version,
                        metadata: e.metadata,
                    });
                }
                if (migrate) {
                    await this.fileService.writeFile(file, VSBuffer.fromString(JSON.stringify(storedProfileExtensions)));
                }
            }
            // Update
            if (updateFn) {
                extensions = updateFn(extensions);
                const storedProfileExtensions = extensions.map((e) => ({
                    identifier: e.identifier,
                    version: e.version,
                    // retain old format so that old clients can read it
                    location: e.location.toJSON(),
                    relativeLocation: this.toRelativePath(e.location),
                    metadata: e.metadata,
                }));
                await this.fileService.writeFile(file, VSBuffer.fromString(JSON.stringify(storedProfileExtensions)));
            }
            return extensions;
        });
    }
    throwInvalidConentError(file) {
        throw new ExtensionsProfileScanningError(`Invalid extensions content in ${file.toString()}`, "ERROR_INVALID_CONTENT" /* ExtensionsProfileScanningErrorCode.ERROR_INVALID_CONTENT */);
    }
    toRelativePath(extensionLocation) {
        return this.uriIdentityService.extUri.isEqual(this.uriIdentityService.extUri.dirname(extensionLocation), this.extensionsLocation)
            ? this.uriIdentityService.extUri.basename(extensionLocation)
            : undefined;
    }
    resolveExtensionLocation(path) {
        return this.uriIdentityService.extUri.joinPath(this.extensionsLocation, path);
    }
    async migrateFromOldDefaultProfileExtensionsLocation() {
        if (!this._migrationPromise) {
            this._migrationPromise = (async () => {
                const oldDefaultProfileExtensionsLocation = this.uriIdentityService.extUri.joinPath(this.userDataProfilesService.defaultProfile.location, 'extensions.json');
                const oldDefaultProfileExtensionsInitLocation = this.uriIdentityService.extUri.joinPath(this.extensionsLocation, '.init-default-profile-extensions');
                let content;
                try {
                    content = (await this.fileService.readFile(oldDefaultProfileExtensionsLocation)).value.toString();
                }
                catch (error) {
                    if (toFileOperationResult(error) === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                        return undefined;
                    }
                    throw error;
                }
                this.logService.info('Migrating extensions from old default profile location', oldDefaultProfileExtensionsLocation.toString());
                let storedProfileExtensions;
                try {
                    const parsedData = JSON.parse(content);
                    if (Array.isArray(parsedData) &&
                        parsedData.every((candidate) => isStoredProfileExtension(candidate))) {
                        storedProfileExtensions = parsedData;
                    }
                    else {
                        this.logService.warn('Skipping migrating from old default profile locaiton: Found invalid data', parsedData);
                    }
                }
                catch (error) {
                    /* Ignore */
                    this.logService.error(error);
                }
                if (storedProfileExtensions) {
                    try {
                        await this.fileService.createFile(this.userDataProfilesService.defaultProfile.extensionsResource, VSBuffer.fromString(JSON.stringify(storedProfileExtensions)), { overwrite: false });
                        this.logService.info('Migrated extensions from old default profile location to new location', oldDefaultProfileExtensionsLocation.toString(), this.userDataProfilesService.defaultProfile.extensionsResource.toString());
                    }
                    catch (error) {
                        if (toFileOperationResult(error) === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
                            this.logService.info('Migration from old default profile location to new location is done by another window', oldDefaultProfileExtensionsLocation.toString(), this.userDataProfilesService.defaultProfile.extensionsResource.toString());
                        }
                        else {
                            throw error;
                        }
                    }
                }
                try {
                    await this.fileService.del(oldDefaultProfileExtensionsLocation);
                }
                catch (error) {
                    if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                        this.logService.error(error);
                    }
                }
                try {
                    await this.fileService.del(oldDefaultProfileExtensionsInitLocation);
                }
                catch (error) {
                    if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                        this.logService.error(error);
                    }
                }
                return storedProfileExtensions;
            })();
        }
        return this._migrationPromise;
    }
    getResourceAccessQueue(file) {
        let resourceQueue = this.resourcesAccessQueueMap.get(file);
        if (!resourceQueue) {
            resourceQueue = new Queue();
            this.resourcesAccessQueueMap.set(file, resourceQueue);
        }
        return resourceQueue;
    }
};
AbstractExtensionsProfileScannerService = __decorate([
    __param(1, IFileService),
    __param(2, IUserDataProfilesService),
    __param(3, IUriIdentityService),
    __param(4, ILogService)
], AbstractExtensionsProfileScannerService);
export { AbstractExtensionsProfileScannerService };
function isStoredProfileExtension(candidate) {
    return (isObject(candidate) &&
        isIExtensionIdentifier(candidate.identifier) &&
        (isUriComponents(candidate.location) || (isString(candidate.location) && candidate.location)) &&
        (isUndefined(candidate.relativeLocation) || isString(candidate.relativeLocation)) &&
        candidate.version &&
        isString(candidate.version));
}
function isUriComponents(thing) {
    if (!thing) {
        return false;
    }
    return isString(thing.path) && isString(thing.scheme);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Byb2ZpbGVTY2FubmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbnNQcm9maWxlU2Nhbm5lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBWSxzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWhFLE9BQU8sRUFFTixZQUFZLEVBQ1oscUJBQXFCLEdBQ3JCLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQVcsUUFBUSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4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
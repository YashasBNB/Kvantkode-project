/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getErrorMessage } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { combinedDisposable, Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../base/common/map.js';
import { getIdAndVersion } from '../common/extensionManagementUtil.js';
import { ExtensionIdentifier, } from '../../extensions/common/extensions.js';
export class ExtensionsWatcher extends Disposable {
    constructor(extensionManagementService, extensionsScannerService, userDataProfilesService, extensionsProfileScannerService, uriIdentityService, fileService, logService) {
        super();
        this.extensionManagementService = extensionManagementService;
        this.extensionsScannerService = extensionsScannerService;
        this.userDataProfilesService = userDataProfilesService;
        this.extensionsProfileScannerService = extensionsProfileScannerService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.logService = logService;
        this._onDidChangeExtensionsByAnotherSource = this._register(new Emitter());
        this.onDidChangeExtensionsByAnotherSource = this._onDidChangeExtensionsByAnotherSource.event;
        this.allExtensions = new Map();
        this.extensionsProfileWatchDisposables = this._register(new DisposableMap());
        this.initialize().then(null, (error) => logService.error('Error while initializing Extensions Watcher', getErrorMessage(error)));
    }
    async initialize() {
        await this.extensionsScannerService.initializeDefaultProfileExtensions();
        await this.onDidChangeProfiles(this.userDataProfilesService.profiles);
        this.registerListeners();
        await this.deleteExtensionsNotInProfiles();
    }
    registerListeners() {
        this._register(this.userDataProfilesService.onDidChangeProfiles((e) => this.onDidChangeProfiles(e.added)));
        this._register(this.extensionsProfileScannerService.onAddExtensions((e) => this.onAddExtensions(e)));
        this._register(this.extensionsProfileScannerService.onDidAddExtensions((e) => this.onDidAddExtensions(e)));
        this._register(this.extensionsProfileScannerService.onRemoveExtensions((e) => this.onRemoveExtensions(e)));
        this._register(this.extensionsProfileScannerService.onDidRemoveExtensions((e) => this.onDidRemoveExtensions(e)));
        this._register(this.fileService.onDidFilesChange((e) => this.onDidFilesChange(e)));
    }
    async onDidChangeProfiles(added) {
        try {
            if (added.length) {
                await Promise.all(added.map((profile) => {
                    this.extensionsProfileWatchDisposables.set(profile.id, combinedDisposable(this.fileService.watch(this.uriIdentityService.extUri.dirname(profile.extensionsResource)), 
                    // Also listen to the resource incase the resource is a symlink - https://github.com/microsoft/vscode/issues/118134
                    this.fileService.watch(profile.extensionsResource)));
                    return this.populateExtensionsFromProfile(profile.extensionsResource);
                }));
            }
        }
        catch (error) {
            this.logService.error(error);
            throw error;
        }
    }
    async onAddExtensions(e) {
        for (const extension of e.extensions) {
            this.addExtensionWithKey(this.getKey(extension.identifier, extension.version), e.profileLocation);
        }
    }
    async onDidAddExtensions(e) {
        for (const extension of e.extensions) {
            const key = this.getKey(extension.identifier, extension.version);
            if (e.error) {
                this.removeExtensionWithKey(key, e.profileLocation);
            }
            else {
                this.addExtensionWithKey(key, e.profileLocation);
            }
        }
    }
    async onRemoveExtensions(e) {
        for (const extension of e.extensions) {
            this.removeExtensionWithKey(this.getKey(extension.identifier, extension.version), e.profileLocation);
        }
    }
    async onDidRemoveExtensions(e) {
        const extensionsToDelete = [];
        const promises = [];
        for (const extension of e.extensions) {
            const key = this.getKey(extension.identifier, extension.version);
            if (e.error) {
                this.addExtensionWithKey(key, e.profileLocation);
            }
            else {
                this.removeExtensionWithKey(key, e.profileLocation);
                if (!this.allExtensions.has(key)) {
                    this.logService.debug('Extension is removed from all profiles', extension.identifier.id, extension.version);
                    promises.push(this.extensionManagementService
                        .scanInstalledExtensionAtLocation(extension.location)
                        .then((result) => {
                        if (result) {
                            extensionsToDelete.push(result);
                        }
                        else {
                            this.logService.info('Extension not found at the location', extension.location.toString());
                        }
                    }, (error) => this.logService.error(error)));
                }
            }
        }
        try {
            await Promise.all(promises);
            if (extensionsToDelete.length) {
                await this.deleteExtensionsNotInProfiles(extensionsToDelete);
            }
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    onDidFilesChange(e) {
        for (const profile of this.userDataProfilesService.profiles) {
            if (e.contains(profile.extensionsResource, 0 /* FileChangeType.UPDATED */, 1 /* FileChangeType.ADDED */)) {
                this.onDidExtensionsProfileChange(profile.extensionsResource);
            }
        }
    }
    async onDidExtensionsProfileChange(profileLocation) {
        const added = [], removed = [];
        const extensions = await this.extensionsProfileScannerService.scanProfileExtensions(profileLocation);
        const extensionKeys = new Set();
        const cached = new Set();
        for (const [key, profiles] of this.allExtensions) {
            if (profiles.has(profileLocation)) {
                cached.add(key);
            }
        }
        for (const extension of extensions) {
            const key = this.getKey(extension.identifier, extension.version);
            extensionKeys.add(key);
            if (!cached.has(key)) {
                added.push(extension.identifier);
                this.addExtensionWithKey(key, profileLocation);
            }
        }
        for (const key of cached) {
            if (!extensionKeys.has(key)) {
                const extension = this.fromKey(key);
                if (extension) {
                    removed.push(extension.identifier);
                    this.removeExtensionWithKey(key, profileLocation);
                }
            }
        }
        if (added.length || removed.length) {
            this._onDidChangeExtensionsByAnotherSource.fire({
                added: added.length ? { extensions: added, profileLocation } : undefined,
                removed: removed.length ? { extensions: removed, profileLocation } : undefined,
            });
        }
    }
    async populateExtensionsFromProfile(extensionsProfileLocation) {
        const extensions = await this.extensionsProfileScannerService.scanProfileExtensions(extensionsProfileLocation);
        for (const extension of extensions) {
            this.addExtensionWithKey(this.getKey(extension.identifier, extension.version), extensionsProfileLocation);
        }
    }
    async deleteExtensionsNotInProfiles(toDelete) {
        if (!toDelete) {
            const installed = await this.extensionManagementService.scanAllUserInstalledExtensions();
            toDelete = installed.filter((installedExtension) => !this.allExtensions.has(this.getKey(installedExtension.identifier, installedExtension.manifest.version)));
        }
        if (toDelete.length) {
            await this.extensionManagementService.deleteExtensions(...toDelete);
        }
    }
    addExtensionWithKey(key, extensionsProfileLocation) {
        let profiles = this.allExtensions.get(key);
        if (!profiles) {
            this.allExtensions.set(key, (profiles = new ResourceSet((uri) => this.uriIdentityService.extUri.getComparisonKey(uri))));
        }
        profiles.add(extensionsProfileLocation);
    }
    removeExtensionWithKey(key, profileLocation) {
        const profiles = this.allExtensions.get(key);
        if (profiles) {
            profiles.delete(profileLocation);
        }
        if (!profiles?.size) {
            this.allExtensions.delete(key);
        }
    }
    getKey(identifier, version) {
        return `${ExtensionIdentifier.toKey(identifier.id)}@${version}`;
    }
    fromKey(key) {
        const [id, version] = getIdAndVersion(key);
        return version ? { identifier: { id }, version } : undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1dhdGNoZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvbm9kZS9leHRlbnNpb25zV2F0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDakcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXpELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVN0RSxPQUFPLEVBQ04sbUJBQW1CLEdBR25CLE1BQU0sdUNBQXVDLENBQUE7QUFvQjlDLE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxVQUFVO0lBU2hELFlBQ2tCLDBCQUFtRSxFQUNuRSx3QkFBbUQsRUFDbkQsdUJBQWlELEVBQ2pELCtCQUFpRSxFQUNqRSxrQkFBdUMsRUFDdkMsV0FBeUIsRUFDekIsVUFBdUI7UUFFeEMsS0FBSyxFQUFFLENBQUE7UUFSVSwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQXlDO1FBQ25FLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMkI7UUFDbkQsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUNqRCxvQ0FBK0IsR0FBL0IsK0JBQStCLENBQWtDO1FBQ2pFLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDdkMsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDekIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQWZ4QiwwQ0FBcUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN0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
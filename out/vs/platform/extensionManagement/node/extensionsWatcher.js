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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1dhdGNoZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L25vZGUvZXh0ZW5zaW9uc1dhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFTdEUsT0FBTyxFQUNOLG1CQUFtQixHQUduQixNQUFNLHVDQUF1QyxDQUFBO0FBb0I5QyxNQUFNLE9BQU8saUJBQWtCLFNBQVEsVUFBVTtJQVNoRCxZQUNrQiwwQkFBbUUsRUFDbkUsd0JBQW1ELEVBQ25ELHVCQUFpRCxFQUNqRCwrQkFBaUUsRUFDakUsa0JBQXVDLEVBQ3ZDLFdBQXlCLEVBQ3pCLFVBQXVCO1FBRXhDLEtBQUssRUFBRSxDQUFBO1FBUlUsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUF5QztRQUNuRSw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTJCO1FBQ25ELDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUFDakQsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztRQUNqRSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3ZDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3pCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFmeEIsMENBQXFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdEUsSUFB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
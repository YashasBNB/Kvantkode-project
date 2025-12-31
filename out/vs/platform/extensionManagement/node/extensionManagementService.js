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
import * as fs from 'fs';
import { Promises, Queue } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationError, getErrorMessage } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { hash } from '../../../base/common/hash.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../base/common/map.js';
import { Schemas } from '../../../base/common/network.js';
import * as path from '../../../base/common/path.js';
import { joinPath } from '../../../base/common/resources.js';
import * as semver from '../../../base/common/semver/semver.js';
import { isBoolean, isDefined, isUndefined } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import * as pfs from '../../../base/node/pfs.js';
import { extract, zip } from '../../../base/node/zip.js';
import * as nls from '../../../nls.js';
import { IDownloadService } from '../../download/common/download.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { AbstractExtensionManagementService, AbstractExtensionTask, toExtensionManagementError, } from '../common/abstractExtensionManagementService.js';
import { ExtensionManagementError, IExtensionGalleryService, IExtensionManagementService, EXTENSION_INSTALL_CLIENT_TARGET_PLATFORM_CONTEXT, ExtensionSignatureVerificationCode, computeSize, IAllowedExtensionsService, } from '../common/extensionManagement.js';
import { areSameExtensions, computeTargetPlatform, ExtensionKey, getGalleryExtensionId, groupByExtension, } from '../common/extensionManagementUtil.js';
import { IExtensionsProfileScannerService, } from '../common/extensionsProfileScannerService.js';
import { IExtensionsScannerService, } from '../common/extensionsScannerService.js';
import { ExtensionsDownloader } from './extensionDownloader.js';
import { ExtensionsLifecycle } from './extensionLifecycle.js';
import { fromExtractError, getManifest } from './extensionManagementUtil.js';
import { ExtensionsManifestCache } from './extensionsManifestCache.js';
import { ExtensionsWatcher } from './extensionsWatcher.js';
import { isEngineValid } from '../../extensions/common/extensionValidator.js';
import { IFileService, toFileOperationResult, } from '../../files/common/files.js';
import { IInstantiationService, refineServiceDecorator, } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { isLinux } from '../../../base/common/platform.js';
import { IExtensionGalleryManifestService } from '../common/extensionGalleryManifest.js';
export const INativeServerExtensionManagementService = refineServiceDecorator(IExtensionManagementService);
const DELETED_FOLDER_POSTFIX = '.vsctmp';
let ExtensionManagementService = class ExtensionManagementService extends AbstractExtensionManagementService {
    constructor(galleryService, telemetryService, logService, environmentService, extensionsScannerService, extensionsProfileScannerService, downloadService, instantiationService, fileService, configurationService, extensionGalleryManifestService, productService, allowedExtensionsService, uriIdentityService, userDataProfilesService) {
        super(galleryService, telemetryService, uriIdentityService, logService, productService, allowedExtensionsService, userDataProfilesService);
        this.environmentService = environmentService;
        this.extensionsScannerService = extensionsScannerService;
        this.extensionsProfileScannerService = extensionsProfileScannerService;
        this.downloadService = downloadService;
        this.instantiationService = instantiationService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.extractingGalleryExtensions = new Map();
        this.knownDirectories = new ResourceSet();
        const extensionLifecycle = this._register(instantiationService.createInstance(ExtensionsLifecycle));
        this.extensionsScanner = this._register(instantiationService.createInstance(ExtensionsScanner, (extension) => extensionLifecycle.postUninstall(extension)));
        this.manifestCache = this._register(new ExtensionsManifestCache(userDataProfilesService, fileService, uriIdentityService, this, this.logService));
        this.extensionsDownloader = this._register(instantiationService.createInstance(ExtensionsDownloader));
        const extensionsWatcher = this._register(new ExtensionsWatcher(this, this.extensionsScannerService, userDataProfilesService, extensionsProfileScannerService, uriIdentityService, fileService, logService));
        this._register(extensionsWatcher.onDidChangeExtensionsByAnotherSource((e) => this.onDidChangeExtensionsFromAnotherSource(e)));
        this.watchForExtensionsNotInstalledBySystem();
    }
    getTargetPlatform() {
        if (!this._targetPlatformPromise) {
            this._targetPlatformPromise = computeTargetPlatform(this.fileService, this.logService);
        }
        return this._targetPlatformPromise;
    }
    async zip(extension) {
        this.logService.trace('ExtensionManagementService#zip', extension.identifier.id);
        const files = await this.collectFiles(extension);
        const location = await zip(joinPath(this.extensionsDownloader.extensionsDownloadDir, generateUuid()).fsPath, files);
        return URI.file(location);
    }
    async getManifest(vsix) {
        const { location, cleanup } = await this.downloadVsix(vsix);
        const zipPath = path.resolve(location.fsPath);
        try {
            return await getManifest(zipPath);
        }
        finally {
            await cleanup();
        }
    }
    getInstalled(type, profileLocation = this.userDataProfilesService.defaultProfile.extensionsResource, productVersion = {
        version: this.productService.version,
        date: this.productService.date,
    }) {
        return this.extensionsScanner.scanExtensions(type ?? null, profileLocation, productVersion);
    }
    scanAllUserInstalledExtensions() {
        return this.extensionsScanner.scanAllUserExtensions();
    }
    scanInstalledExtensionAtLocation(location) {
        return this.extensionsScanner.scanUserExtensionAtLocation(location);
    }
    async install(vsix, options = {}) {
        this.logService.trace('ExtensionManagementService#install', vsix.toString());
        const { location, cleanup } = await this.downloadVsix(vsix);
        try {
            const manifest = await getManifest(path.resolve(location.fsPath));
            const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
            if (manifest.engines &&
                manifest.engines.vscode &&
                !isEngineValid(manifest.engines.vscode, this.productService.version, this.productService.date)) {
                throw new Error(nls.localize('incompatible', "Unable to install extension '{0}' as it is not compatible with VS Code '{1}'.", extensionId, this.productService.version));
            }
            const allowedToInstall = this.allowedExtensionsService.isAllowed({
                id: extensionId,
                version: manifest.version,
                publisherDisplayName: undefined,
            });
            if (allowedToInstall !== true) {
                throw new Error(nls.localize('notAllowed', 'This extension cannot be installed because {0}', allowedToInstall.value));
            }
            const results = await this.installExtensions([{ manifest, extension: location, options }]);
            const result = results.find(({ identifier }) => areSameExtensions(identifier, { id: extensionId }));
            if (result?.local) {
                return result.local;
            }
            if (result?.error) {
                throw result.error;
            }
            throw toExtensionManagementError(new Error(`Unknown error while installing extension ${extensionId}`));
        }
        finally {
            await cleanup();
        }
    }
    async installFromLocation(location, profileLocation) {
        this.logService.trace('ExtensionManagementService#installFromLocation', location.toString());
        const local = await this.extensionsScanner.scanUserExtensionAtLocation(location);
        if (!local || !local.manifest.name || !local.manifest.version) {
            throw new Error(`Cannot find a valid extension from the location ${location.toString()}`);
        }
        await this.addExtensionsToProfile([[local, { source: 'resource' }]], profileLocation);
        this.logService.info('Successfully installed extension', local.identifier.id, profileLocation.toString());
        return local;
    }
    async installExtensionsFromProfile(extensions, fromProfileLocation, toProfileLocation) {
        this.logService.trace('ExtensionManagementService#installExtensionsFromProfile', extensions, fromProfileLocation.toString(), toProfileLocation.toString());
        const extensionsToInstall = (await this.getInstalled(1 /* ExtensionType.User */, fromProfileLocation)).filter((e) => extensions.some((id) => areSameExtensions(id, e.identifier)));
        if (extensionsToInstall.length) {
            const metadata = await Promise.all(extensionsToInstall.map((e) => this.extensionsScanner.scanMetadata(e, fromProfileLocation)));
            await this.addExtensionsToProfile(extensionsToInstall.map((e, index) => [e, metadata[index]]), toProfileLocation);
            this.logService.info('Successfully installed extensions', extensionsToInstall.map((e) => e.identifier.id), toProfileLocation.toString());
        }
        return extensionsToInstall;
    }
    async updateMetadata(local, metadata, profileLocation) {
        this.logService.trace('ExtensionManagementService#updateMetadata', local.identifier.id);
        if (metadata.isPreReleaseVersion) {
            metadata.preRelease = true;
            metadata.hasPreReleaseVersion = true;
        }
        // unset if false
        if (metadata.isMachineScoped === false) {
            metadata.isMachineScoped = undefined;
        }
        if (metadata.isBuiltin === false) {
            metadata.isBuiltin = undefined;
        }
        if (metadata.pinned === false) {
            metadata.pinned = undefined;
        }
        local = await this.extensionsScanner.updateMetadata(local, metadata, profileLocation);
        this.manifestCache.invalidate(profileLocation);
        this._onDidUpdateExtensionMetadata.fire({ local, profileLocation });
        return local;
    }
    removeExtension(extension) {
        return this.extensionsScanner.deleteExtension(extension, 'remove');
    }
    copyExtension(extension, fromProfileLocation, toProfileLocation, metadata) {
        return this.extensionsScanner.copyExtension(extension, fromProfileLocation, toProfileLocation, metadata);
    }
    copyExtensions(fromProfileLocation, toProfileLocation) {
        return this.extensionsScanner.copyExtensions(fromProfileLocation, toProfileLocation, {
            version: this.productService.version,
            date: this.productService.date,
        });
    }
    deleteExtensions(...extensions) {
        return this.extensionsScanner.setExtensionsForRemoval(...extensions);
    }
    async cleanUp() {
        this.logService.trace('ExtensionManagementService#cleanUp');
        try {
            await this.extensionsScanner.cleanUp();
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    async download(extension, operation, donotVerifySignature) {
        const { location } = await this.downloadExtension(extension, operation, !donotVerifySignature);
        return location;
    }
    async downloadVsix(vsix) {
        if (vsix.scheme === Schemas.file) {
            return { location: vsix, async cleanup() { } };
        }
        this.logService.trace('Downloading extension from', vsix.toString());
        const location = joinPath(this.extensionsDownloader.extensionsDownloadDir, generateUuid());
        await this.downloadService.download(vsix, location);
        this.logService.info('Downloaded extension to', location.toString());
        const cleanup = async () => {
            try {
                await this.fileService.del(location);
            }
            catch (error) {
                this.logService.error(error);
            }
        };
        return { location, cleanup };
    }
    getCurrentExtensionsManifestLocation() {
        return this.userDataProfilesService.defaultProfile.extensionsResource;
    }
    createInstallExtensionTask(manifest, extension, options) {
        const extensionKey = extension instanceof URI
            ? new ExtensionKey({ id: getGalleryExtensionId(manifest.publisher, manifest.name) }, manifest.version)
            : ExtensionKey.create(extension);
        return this.instantiationService.createInstance(InstallExtensionInProfileTask, extensionKey, manifest, extension, options, (operation, token) => {
            if (extension instanceof URI) {
                return this.extractVSIX(extensionKey, extension, options, token);
            }
            let promise = this.extractingGalleryExtensions.get(extensionKey.toString());
            if (!promise) {
                this.extractingGalleryExtensions.set(extensionKey.toString(), (promise = this.downloadAndExtractGalleryExtension(extensionKey, extension, operation, options, token)));
                promise.finally(() => this.extractingGalleryExtensions.delete(extensionKey.toString()));
            }
            return promise;
        }, this.extensionsScanner);
    }
    createUninstallExtensionTask(extension, options) {
        return new UninstallExtensionInProfileTask(extension, options, this.extensionsProfileScannerService);
    }
    async downloadAndExtractGalleryExtension(extensionKey, gallery, operation, options, token) {
        const { verificationStatus, location } = await this.downloadExtension(gallery, operation, !options.donotVerifySignature, options.context?.[EXTENSION_INSTALL_CLIENT_TARGET_PLATFORM_CONTEXT]);
        try {
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            // validate manifest
            const manifest = await getManifest(location.fsPath);
            if (!new ExtensionKey(gallery.identifier, gallery.version).equals(new ExtensionKey({ id: getGalleryExtensionId(manifest.publisher, manifest.name) }, manifest.version))) {
                throw new ExtensionManagementError(nls.localize('invalidManifest', "Cannot install '{0}' extension because of manifest mismatch with Marketplace", gallery.identifier.id), "Invalid" /* ExtensionManagementErrorCode.Invalid */);
            }
            const local = await this.extensionsScanner.extractUserExtension(extensionKey, location.fsPath, false, token);
            if (verificationStatus !== ExtensionSignatureVerificationCode.Success &&
                this.environmentService.isBuilt) {
                try {
                    await this.extensionsDownloader.delete(location);
                }
                catch (e) {
                    /* Ignore */
                    this.logService.warn(`Error while deleting the downloaded file`, location.toString(), getErrorMessage(e));
                }
            }
            return { local, verificationStatus };
        }
        catch (error) {
            try {
                await this.extensionsDownloader.delete(location);
            }
            catch (e) {
                /* Ignore */
                this.logService.warn(`Error while deleting the downloaded file`, location.toString(), getErrorMessage(e));
            }
            throw toExtensionManagementError(error);
        }
    }
    async downloadExtension(extension, operation, verifySignature, clientTargetPlatform) {
        if (verifySignature) {
            const value = this.configurationService.getValue('extensions.verifySignature');
            verifySignature = isBoolean(value) ? value : true;
        }
        const { location, verificationStatus } = await this.extensionsDownloader.download(extension, operation, verifySignature, clientTargetPlatform);
        const shouldRequireSignature = (await this.extensionGalleryManifestService.getExtensionGalleryManifest())?.capabilities.signing?.allRepositorySigned;
        if (verificationStatus !== ExtensionSignatureVerificationCode.Success &&
            !(verificationStatus === ExtensionSignatureVerificationCode.NotSigned &&
                !shouldRequireSignature) &&
            verifySignature &&
            this.environmentService.isBuilt &&
            !(isLinux && this.productService.quality === 'stable')) {
            try {
                await this.extensionsDownloader.delete(location);
            }
            catch (e) {
                /* Ignore */
                this.logService.warn(`Error while deleting the downloaded file`, location.toString(), getErrorMessage(e));
            }
            if (!verificationStatus) {
                throw new ExtensionManagementError(nls.localize('signature verification not executed', 'Signature verification was not executed.'), "SignatureVerificationInternal" /* ExtensionManagementErrorCode.SignatureVerificationInternal */);
            }
            switch (verificationStatus) {
                case ExtensionSignatureVerificationCode.PackageIntegrityCheckFailed:
                case ExtensionSignatureVerificationCode.SignatureIsInvalid:
                case ExtensionSignatureVerificationCode.SignatureManifestIsInvalid:
                case ExtensionSignatureVerificationCode.SignatureIntegrityCheckFailed:
                case ExtensionSignatureVerificationCode.EntryIsMissing:
                case ExtensionSignatureVerificationCode.EntryIsTampered:
                case ExtensionSignatureVerificationCode.Untrusted:
                case ExtensionSignatureVerificationCode.CertificateRevoked:
                case ExtensionSignatureVerificationCode.SignatureIsNotValid:
                case ExtensionSignatureVerificationCode.SignatureArchiveHasTooManyEntries:
                case ExtensionSignatureVerificationCode.NotSigned:
                    throw new ExtensionManagementError(nls.localize('signature verification failed', "Signature verification failed with '{0}' error.", verificationStatus), "SignatureVerificationFailed" /* ExtensionManagementErrorCode.SignatureVerificationFailed */);
            }
            throw new ExtensionManagementError(nls.localize('signature verification failed', "Signature verification failed with '{0}' error.", verificationStatus), "SignatureVerificationInternal" /* ExtensionManagementErrorCode.SignatureVerificationInternal */);
        }
        return { location, verificationStatus };
    }
    async extractVSIX(extensionKey, location, options, token) {
        const local = await this.extensionsScanner.extractUserExtension(extensionKey, path.resolve(location.fsPath), isBoolean(options.keepExisting) ? !options.keepExisting : true, token);
        return { local };
    }
    async collectFiles(extension) {
        const collectFilesFromDirectory = async (dir) => {
            let entries = await pfs.Promises.readdir(dir);
            entries = entries.map((e) => path.join(dir, e));
            const stats = await Promise.all(entries.map((e) => fs.promises.stat(e)));
            let promise = Promise.resolve([]);
            stats.forEach((stat, index) => {
                const entry = entries[index];
                if (stat.isFile()) {
                    promise = promise.then((result) => [...result, entry]);
                }
                if (stat.isDirectory()) {
                    promise = promise.then((result) => collectFilesFromDirectory(entry).then((files) => [...result, ...files]));
                }
            });
            return promise;
        };
        const files = await collectFilesFromDirectory(extension.location.fsPath);
        return files.map((f) => ({
            path: `extension/${path.relative(extension.location.fsPath, f)}`,
            localPath: f,
        }));
    }
    async onDidChangeExtensionsFromAnotherSource({ added, removed, }) {
        if (removed) {
            const removedExtensions = added &&
                this.uriIdentityService.extUri.isEqual(removed.profileLocation, added.profileLocation)
                ? removed.extensions.filter((e) => added.extensions.every((identifier) => !areSameExtensions(identifier, e)))
                : removed.extensions;
            for (const identifier of removedExtensions) {
                this.logService.info('Extensions removed from another source', identifier.id, removed.profileLocation.toString());
                this._onDidUninstallExtension.fire({ identifier, profileLocation: removed.profileLocation });
            }
        }
        if (added) {
            const extensions = await this.getInstalled(1 /* ExtensionType.User */, added.profileLocation);
            const addedExtensions = extensions.filter((e) => added.extensions.some((identifier) => areSameExtensions(identifier, e.identifier)));
            this._onDidInstallExtensions.fire(addedExtensions.map((local) => {
                this.logService.info('Extensions added from another source', local.identifier.id, added.profileLocation.toString());
                return {
                    identifier: local.identifier,
                    local,
                    profileLocation: added.profileLocation,
                    operation: 1 /* InstallOperation.None */,
                };
            }));
        }
    }
    async watchForExtensionsNotInstalledBySystem() {
        this._register(this.extensionsScanner.onExtract((resource) => this.knownDirectories.add(resource)));
        const stat = await this.fileService.resolve(this.extensionsScannerService.userExtensionsLocation);
        for (const childStat of stat.children ?? []) {
            if (childStat.isDirectory) {
                this.knownDirectories.add(childStat.resource);
            }
        }
        this._register(this.fileService.watch(this.extensionsScannerService.userExtensionsLocation));
        this._register(this.fileService.onDidFilesChange((e) => this.onDidFilesChange(e)));
    }
    async onDidFilesChange(e) {
        if (!e.affects(this.extensionsScannerService.userExtensionsLocation, 1 /* FileChangeType.ADDED */)) {
            return;
        }
        const added = [];
        for (const resource of e.rawAdded) {
            // Check if this is a known directory
            if (this.knownDirectories.has(resource)) {
                continue;
            }
            // Is not immediate child of extensions resource
            if (!this.uriIdentityService.extUri.isEqual(this.uriIdentityService.extUri.dirname(resource), this.extensionsScannerService.userExtensionsLocation)) {
                continue;
            }
            // .obsolete file changed
            if (this.uriIdentityService.extUri.isEqual(resource, this.uriIdentityService.extUri.joinPath(this.extensionsScannerService.userExtensionsLocation, '.obsolete'))) {
                continue;
            }
            // Ignore changes to files starting with `.`
            if (this.uriIdentityService.extUri.basename(resource).startsWith('.')) {
                continue;
            }
            // Ignore changes to the deleted folder
            if (this.uriIdentityService.extUri.basename(resource).endsWith(DELETED_FOLDER_POSTFIX)) {
                continue;
            }
            try {
                // Check if this is a directory
                if (!(await this.fileService.stat(resource)).isDirectory) {
                    continue;
                }
            }
            catch (error) {
                if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    this.logService.error(error);
                }
                continue;
            }
            // Check if this is an extension added by another source
            // Extension added by another source will not have installed timestamp
            const extension = await this.extensionsScanner.scanUserExtensionAtLocation(resource);
            if (extension && extension.installedTimestamp === undefined) {
                this.knownDirectories.add(resource);
                added.push(extension);
            }
        }
        if (added.length) {
            await this.addExtensionsToProfile(added.map((e) => [e, undefined]), this.userDataProfilesService.defaultProfile.extensionsResource);
            this.logService.info('Added extensions to default profile from external source', added.map((e) => e.identifier.id));
        }
    }
    async addExtensionsToProfile(extensions, profileLocation) {
        const localExtensions = extensions.map((e) => e[0]);
        await this.extensionsScanner.unsetExtensionsForRemoval(...localExtensions.map((extension) => ExtensionKey.create(extension)));
        await this.extensionsProfileScannerService.addExtensionsToProfile(extensions, profileLocation);
        this._onDidInstallExtensions.fire(localExtensions.map((local) => ({
            local,
            identifier: local.identifier,
            operation: 1 /* InstallOperation.None */,
            profileLocation,
        })));
    }
};
ExtensionManagementService = __decorate([
    __param(0, IExtensionGalleryService),
    __param(1, ITelemetryService),
    __param(2, ILogService),
    __param(3, INativeEnvironmentService),
    __param(4, IExtensionsScannerService),
    __param(5, IExtensionsProfileScannerService),
    __param(6, IDownloadService),
    __param(7, IInstantiationService),
    __param(8, IFileService),
    __param(9, IConfigurationService),
    __param(10, IExtensionGalleryManifestService),
    __param(11, IProductService),
    __param(12, IAllowedExtensionsService),
    __param(13, IUriIdentityService),
    __param(14, IUserDataProfilesService)
], ExtensionManagementService);
export { ExtensionManagementService };
let ExtensionsScanner = class ExtensionsScanner extends Disposable {
    constructor(beforeRemovingExtension, fileService, extensionsScannerService, extensionsProfileScannerService, uriIdentityService, telemetryService, logService) {
        super();
        this.beforeRemovingExtension = beforeRemovingExtension;
        this.fileService = fileService;
        this.extensionsScannerService = extensionsScannerService;
        this.extensionsProfileScannerService = extensionsProfileScannerService;
        this.uriIdentityService = uriIdentityService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this._onExtract = this._register(new Emitter());
        this.onExtract = this._onExtract.event;
        this.scanAllExtensionPromise = new ResourceMap();
        this.scanUserExtensionsPromise = new ResourceMap();
        this.obsoletedResource = joinPath(this.extensionsScannerService.userExtensionsLocation, '.obsolete');
        this.obsoleteFileLimiter = new Queue();
    }
    async cleanUp() {
        await this.removeTemporarilyDeletedFolders();
        await this.deleteExtensionsMarkedForRemoval();
        //TODO: Remove this initiialization after coupe of releases
        await this.initializeExtensionSize();
    }
    async scanExtensions(type, profileLocation, productVersion) {
        try {
            const userScanOptions = {
                includeInvalid: true,
                profileLocation,
                productVersion,
            };
            let scannedExtensions = [];
            if (type === null || type === 0 /* ExtensionType.System */) {
                let scanAllExtensionsPromise = this.scanAllExtensionPromise.get(profileLocation);
                if (!scanAllExtensionsPromise) {
                    scanAllExtensionsPromise = this.extensionsScannerService
                        .scanAllExtensions({}, userScanOptions)
                        .finally(() => this.scanAllExtensionPromise.delete(profileLocation));
                    this.scanAllExtensionPromise.set(profileLocation, scanAllExtensionsPromise);
                }
                scannedExtensions.push(...(await scanAllExtensionsPromise));
            }
            else if (type === 1 /* ExtensionType.User */) {
                let scanUserExtensionsPromise = this.scanUserExtensionsPromise.get(profileLocation);
                if (!scanUserExtensionsPromise) {
                    scanUserExtensionsPromise = this.extensionsScannerService
                        .scanUserExtensions(userScanOptions)
                        .finally(() => this.scanUserExtensionsPromise.delete(profileLocation));
                    this.scanUserExtensionsPromise.set(profileLocation, scanUserExtensionsPromise);
                }
                scannedExtensions.push(...(await scanUserExtensionsPromise));
            }
            scannedExtensions =
                type !== null ? scannedExtensions.filter((r) => r.type === type) : scannedExtensions;
            return await Promise.all(scannedExtensions.map((extension) => this.toLocalExtension(extension)));
        }
        catch (error) {
            throw toExtensionManagementError(error, "Scanning" /* ExtensionManagementErrorCode.Scanning */);
        }
    }
    async scanAllUserExtensions() {
        try {
            const scannedExtensions = await this.extensionsScannerService.scanAllUserExtensions();
            return await Promise.all(scannedExtensions.map((extension) => this.toLocalExtension(extension)));
        }
        catch (error) {
            throw toExtensionManagementError(error, "Scanning" /* ExtensionManagementErrorCode.Scanning */);
        }
    }
    async scanUserExtensionAtLocation(location) {
        try {
            const scannedExtension = await this.extensionsScannerService.scanExistingExtension(location, 1 /* ExtensionType.User */, { includeInvalid: true });
            if (scannedExtension) {
                return await this.toLocalExtension(scannedExtension);
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        return null;
    }
    async extractUserExtension(extensionKey, zipPath, removeIfExists, token) {
        const folderName = extensionKey.toString();
        const tempLocation = URI.file(path.join(this.extensionsScannerService.userExtensionsLocation.fsPath, `.${generateUuid()}`));
        const extensionLocation = URI.file(path.join(this.extensionsScannerService.userExtensionsLocation.fsPath, folderName));
        if (await this.fileService.exists(extensionLocation)) {
            if (!removeIfExists) {
                try {
                    return await this.scanLocalExtension(extensionLocation, 1 /* ExtensionType.User */);
                }
                catch (error) {
                    this.logService.warn(`Error while scanning the existing extension at ${extensionLocation.path}. Deleting the existing extension and extracting it.`, getErrorMessage(error));
                }
            }
            try {
                await this.deleteExtensionFromLocation(extensionKey.id, extensionLocation, 'removeExisting');
            }
            catch (error) {
                throw new ExtensionManagementError(nls.localize('errorDeleting', "Unable to delete the existing folder '{0}' while installing the extension '{1}'. Please delete the folder manually and try again", extensionLocation.fsPath, extensionKey.id), "Delete" /* ExtensionManagementErrorCode.Delete */);
            }
        }
        try {
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            // Extract
            try {
                this.logService.trace(`Started extracting the extension from ${zipPath} to ${extensionLocation.fsPath}`);
                await extract(zipPath, tempLocation.fsPath, { sourcePath: 'extension', overwrite: true }, token);
                this.logService.info(`Extracted extension to ${extensionLocation}:`, extensionKey.id);
            }
            catch (e) {
                throw fromExtractError(e);
            }
            const metadata = {
                installedTimestamp: Date.now(),
                targetPlatform: extensionKey.targetPlatform,
            };
            try {
                metadata.size = await computeSize(tempLocation, this.fileService);
            }
            catch (error) {
                // Log & ignore
                this.logService.warn(`Error while getting the size of the extracted extension : ${tempLocation.fsPath}`, getErrorMessage(error));
            }
            try {
                await this.extensionsScannerService.updateManifestMetadata(tempLocation, metadata);
            }
            catch (error) {
                this.telemetryService.publicLog2('extension:extract', {
                    extensionId: extensionKey.id,
                    code: `${toFileOperationResult(error)}`,
                });
                throw toExtensionManagementError(error, "UpdateMetadata" /* ExtensionManagementErrorCode.UpdateMetadata */);
            }
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            // Rename
            try {
                this.logService.trace(`Started renaming the extension from ${tempLocation.fsPath} to ${extensionLocation.fsPath}`);
                await this.rename(tempLocation.fsPath, extensionLocation.fsPath);
                this.logService.info('Renamed to', extensionLocation.fsPath);
            }
            catch (error) {
                if (error.code === 'ENOTEMPTY') {
                    this.logService.info(`Rename failed because extension was installed by another source. So ignoring renaming.`, extensionKey.id);
                    try {
                        await this.fileService.del(tempLocation, { recursive: true });
                    }
                    catch (e) {
                        /* ignore */
                    }
                }
                else {
                    this.logService.info(`Rename failed because of ${getErrorMessage(error)}. Deleted from extracted location`, tempLocation);
                    throw error;
                }
            }
            this._onExtract.fire(extensionLocation);
        }
        catch (error) {
            try {
                await this.fileService.del(tempLocation, { recursive: true });
            }
            catch (e) {
                /* ignore */
            }
            throw error;
        }
        return this.scanLocalExtension(extensionLocation, 1 /* ExtensionType.User */);
    }
    async scanMetadata(local, profileLocation) {
        const extension = await this.getScannedExtension(local, profileLocation);
        return extension?.metadata;
    }
    async getScannedExtension(local, profileLocation) {
        const extensions = await this.extensionsProfileScannerService.scanProfileExtensions(profileLocation);
        return extensions.find((e) => areSameExtensions(e.identifier, local.identifier));
    }
    async updateMetadata(local, metadata, profileLocation) {
        try {
            await this.extensionsProfileScannerService.updateMetadata([[local, metadata]], profileLocation);
        }
        catch (error) {
            this.telemetryService.publicLog2('extension:extract', {
                extensionId: local.identifier.id,
                code: `${toFileOperationResult(error)}`,
                isProfile: !!profileLocation,
            });
            throw toExtensionManagementError(error, "UpdateMetadata" /* ExtensionManagementErrorCode.UpdateMetadata */);
        }
        return this.scanLocalExtension(local.location, local.type, profileLocation);
    }
    async setExtensionsForRemoval(...extensions) {
        const extensionsToRemove = [];
        for (const extension of extensions) {
            if (await this.fileService.exists(extension.location)) {
                extensionsToRemove.push(extension);
            }
        }
        const extensionKeys = extensionsToRemove.map((e) => ExtensionKey.create(e));
        await this.withRemovedExtensions((removedExtensions) => extensionKeys.forEach((extensionKey) => {
            removedExtensions[extensionKey.toString()] = true;
            this.logService.info('Marked extension as removed', extensionKey.toString());
        }));
    }
    async unsetExtensionsForRemoval(...extensionKeys) {
        try {
            const results = [];
            await this.withRemovedExtensions((removedExtensions) => extensionKeys.forEach((extensionKey) => {
                if (removedExtensions[extensionKey.toString()]) {
                    results.push(true);
                    delete removedExtensions[extensionKey.toString()];
                }
                else {
                    results.push(false);
                }
            }));
            return results;
        }
        catch (error) {
            throw toExtensionManagementError(error, "UnsetRemoved" /* ExtensionManagementErrorCode.UnsetRemoved */);
        }
    }
    async deleteExtension(extension, type) {
        if (this.uriIdentityService.extUri.isEqualOrParent(extension.location, this.extensionsScannerService.userExtensionsLocation)) {
            await this.deleteExtensionFromLocation(extension.identifier.id, extension.location, type);
            await this.unsetExtensionsForRemoval(ExtensionKey.create(extension));
        }
    }
    async copyExtension(extension, fromProfileLocation, toProfileLocation, metadata) {
        const source = await this.getScannedExtension(extension, fromProfileLocation);
        const target = await this.getScannedExtension(extension, toProfileLocation);
        metadata = { ...source?.metadata, ...metadata };
        if (target) {
            if (this.uriIdentityService.extUri.isEqual(target.location, extension.location)) {
                await this.extensionsProfileScannerService.updateMetadata([[extension, { ...target.metadata, ...metadata }]], toProfileLocation);
            }
            else {
                const targetExtension = await this.scanLocalExtension(target.location, extension.type, toProfileLocation);
                await this.extensionsProfileScannerService.removeExtensionsFromProfile([targetExtension.identifier], toProfileLocation);
                await this.extensionsProfileScannerService.addExtensionsToProfile([[extension, { ...target.metadata, ...metadata }]], toProfileLocation);
            }
        }
        else {
            await this.extensionsProfileScannerService.addExtensionsToProfile([[extension, metadata]], toProfileLocation);
        }
        return this.scanLocalExtension(extension.location, extension.type, toProfileLocation);
    }
    async copyExtensions(fromProfileLocation, toProfileLocation, productVersion) {
        const fromExtensions = await this.scanExtensions(1 /* ExtensionType.User */, fromProfileLocation, productVersion);
        const extensions = await Promise.all(fromExtensions
            .filter((e) => !e.isApplicationScoped) /* remove application scoped extensions */
            .map(async (e) => [e, await this.scanMetadata(e, fromProfileLocation)]));
        await this.extensionsProfileScannerService.addExtensionsToProfile(extensions, toProfileLocation);
    }
    async deleteExtensionFromLocation(id, location, type) {
        this.logService.trace(`Deleting ${type} extension from disk`, id, location.fsPath);
        const renamedLocation = this.uriIdentityService.extUri.joinPath(this.uriIdentityService.extUri.dirname(location), `${this.uriIdentityService.extUri.basename(location)}.${hash(generateUuid()).toString(16)}${DELETED_FOLDER_POSTFIX}`);
        await this.rename(location.fsPath, renamedLocation.fsPath);
        await this.fileService.del(renamedLocation, { recursive: true });
        this.logService.info(`Deleted ${type} extension from disk`, id, location.fsPath);
    }
    withRemovedExtensions(updateFn) {
        return this.obsoleteFileLimiter.queue(async () => {
            let raw;
            try {
                const content = await this.fileService.readFile(this.obsoletedResource, 'utf8');
                raw = content.value.toString();
            }
            catch (error) {
                if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    throw error;
                }
            }
            let removed = {};
            if (raw) {
                try {
                    removed = JSON.parse(raw);
                }
                catch (e) {
                    /* ignore */
                }
            }
            if (updateFn) {
                updateFn(removed);
                if (Object.keys(removed).length) {
                    await this.fileService.writeFile(this.obsoletedResource, VSBuffer.fromString(JSON.stringify(removed)));
                }
                else {
                    try {
                        await this.fileService.del(this.obsoletedResource);
                    }
                    catch (error) {
                        if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                            throw error;
                        }
                    }
                }
            }
            return removed;
        });
    }
    async rename(extractPath, renamePath) {
        try {
            await pfs.Promises.rename(extractPath, renamePath, 2 * 60 * 1000 /* Retry for 2 minutes */);
        }
        catch (error) {
            throw toExtensionManagementError(error, "Rename" /* ExtensionManagementErrorCode.Rename */);
        }
    }
    async scanLocalExtension(location, type, profileLocation) {
        try {
            if (profileLocation) {
                const scannedExtensions = await this.extensionsScannerService.scanUserExtensions({
                    profileLocation,
                });
                const scannedExtension = scannedExtensions.find((e) => this.uriIdentityService.extUri.isEqual(e.location, location));
                if (scannedExtension) {
                    return await this.toLocalExtension(scannedExtension);
                }
            }
            else {
                const scannedExtension = await this.extensionsScannerService.scanExistingExtension(location, type, { includeInvalid: true });
                if (scannedExtension) {
                    return await this.toLocalExtension(scannedExtension);
                }
            }
            throw new ExtensionManagementError(nls.localize('cannot read', 'Cannot read the extension from {0}', location.path), "ScanningExtension" /* ExtensionManagementErrorCode.ScanningExtension */);
        }
        catch (error) {
            throw toExtensionManagementError(error, "ScanningExtension" /* ExtensionManagementErrorCode.ScanningExtension */);
        }
    }
    async toLocalExtension(extension) {
        let stat;
        try {
            stat = await this.fileService.resolve(extension.location);
        }
        catch (error) {
            /* ignore */
        }
        let readmeUrl;
        let changelogUrl;
        if (stat?.children) {
            readmeUrl = stat.children.find(({ name }) => /^readme(\.txt|\.md|)$/i.test(name))?.resource;
            changelogUrl = stat.children.find(({ name }) => /^changelog(\.txt|\.md|)$/i.test(name))?.resource;
        }
        return {
            identifier: extension.identifier,
            type: extension.type,
            isBuiltin: extension.isBuiltin || !!extension.metadata?.isBuiltin,
            location: extension.location,
            manifest: extension.manifest,
            targetPlatform: extension.targetPlatform,
            validations: extension.validations,
            isValid: extension.isValid,
            readmeUrl,
            changelogUrl,
            publisherDisplayName: extension.metadata?.publisherDisplayName,
            publisherId: extension.metadata?.publisherId || null,
            isApplicationScoped: !!extension.metadata?.isApplicationScoped,
            isMachineScoped: !!extension.metadata?.isMachineScoped,
            isPreReleaseVersion: !!extension.metadata?.isPreReleaseVersion,
            hasPreReleaseVersion: !!extension.metadata?.hasPreReleaseVersion,
            preRelease: extension.preRelease,
            installedTimestamp: extension.metadata?.installedTimestamp,
            updated: !!extension.metadata?.updated,
            pinned: !!extension.metadata?.pinned,
            private: !!extension.metadata?.private,
            isWorkspaceScoped: false,
            source: extension.metadata?.source ?? (extension.identifier.uuid ? 'gallery' : 'vsix'),
            size: extension.metadata?.size ?? 0,
        };
    }
    async initializeExtensionSize() {
        const extensions = await this.extensionsScannerService.scanAllUserExtensions();
        await Promise.all(extensions.map(async (extension) => {
            // set size if not set before
            if (isDefined(extension.metadata?.installedTimestamp) &&
                isUndefined(extension.metadata?.size)) {
                const size = await computeSize(extension.location, this.fileService);
                await this.extensionsScannerService.updateManifestMetadata(extension.location, { size });
            }
        }));
    }
    async deleteExtensionsMarkedForRemoval() {
        let removed;
        try {
            removed = await this.withRemovedExtensions();
        }
        catch (error) {
            throw toExtensionManagementError(error, "ReadRemoved" /* ExtensionManagementErrorCode.ReadRemoved */);
        }
        if (Object.keys(removed).length === 0) {
            this.logService.debug(`No extensions are marked as removed.`);
            return;
        }
        this.logService.debug(`Deleting extensions marked as removed:`, Object.keys(removed));
        const extensions = await this.scanAllUserExtensions();
        const installed = new Set();
        for (const e of extensions) {
            if (!removed[ExtensionKey.create(e).toString()]) {
                installed.add(e.identifier.id.toLowerCase());
            }
        }
        try {
            // running post uninstall tasks for extensions that are not installed anymore
            const byExtension = groupByExtension(extensions, (e) => e.identifier);
            await Promises.settled(byExtension.map(async (e) => {
                const latest = e.sort((a, b) => semver.rcompare(a.manifest.version, b.manifest.version))[0];
                if (!installed.has(latest.identifier.id.toLowerCase())) {
                    await this.beforeRemovingExtension(latest);
                }
            }));
        }
        catch (error) {
            this.logService.error(error);
        }
        const toRemove = extensions.filter((e) => e.installedTimestamp /* Installed by System */ &&
            removed[ExtensionKey.create(e).toString()]);
        await Promise.allSettled(toRemove.map((e) => this.deleteExtension(e, 'marked for removal')));
    }
    async removeTemporarilyDeletedFolders() {
        this.logService.trace('ExtensionManagementService#removeTempDeleteFolders');
        let stat;
        try {
            stat = await this.fileService.resolve(this.extensionsScannerService.userExtensionsLocation);
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
            return;
        }
        if (!stat?.children) {
            return;
        }
        try {
            await Promise.allSettled(stat.children.map(async (child) => {
                if (!child.isDirectory || !child.name.endsWith(DELETED_FOLDER_POSTFIX)) {
                    return;
                }
                this.logService.trace('Deleting the temporarily deleted folder', child.resource.toString());
                try {
                    await this.fileService.del(child.resource, { recursive: true });
                    this.logService.trace('Deleted the temporarily deleted folder', child.resource.toString());
                }
                catch (error) {
                    if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                        this.logService.error(error);
                    }
                }
            }));
        }
        catch (error) {
            /* ignore */
        }
    }
};
ExtensionsScanner = __decorate([
    __param(1, IFileService),
    __param(2, IExtensionsScannerService),
    __param(3, IExtensionsProfileScannerService),
    __param(4, IUriIdentityService),
    __param(5, ITelemetryService),
    __param(6, ILogService)
], ExtensionsScanner);
export { ExtensionsScanner };
let InstallExtensionInProfileTask = class InstallExtensionInProfileTask extends AbstractExtensionTask {
    get operation() {
        return this.options.operation ?? this._operation;
    }
    get verificationStatus() {
        return this._verificationStatus;
    }
    constructor(extensionKey, manifest, source, options, extractExtensionFn, extensionsScanner, uriIdentityService, galleryService, userDataProfilesService, extensionsScannerService, extensionsProfileScannerService, logService) {
        super();
        this.extensionKey = extensionKey;
        this.manifest = manifest;
        this.source = source;
        this.options = options;
        this.extractExtensionFn = extractExtensionFn;
        this.extensionsScanner = extensionsScanner;
        this.uriIdentityService = uriIdentityService;
        this.galleryService = galleryService;
        this.userDataProfilesService = userDataProfilesService;
        this.extensionsScannerService = extensionsScannerService;
        this.extensionsProfileScannerService = extensionsProfileScannerService;
        this.logService = logService;
        this._operation = 2 /* InstallOperation.Install */;
        this.identifier = this.extensionKey.identifier;
    }
    async doRun(token) {
        const installed = await this.extensionsScanner.scanExtensions(1 /* ExtensionType.User */, this.options.profileLocation, this.options.productVersion);
        const existingExtension = installed.find((i) => areSameExtensions(i.identifier, this.identifier));
        if (existingExtension) {
            this._operation = 3 /* InstallOperation.Update */;
        }
        const metadata = {
            isApplicationScoped: this.options.isApplicationScoped || existingExtension?.isApplicationScoped,
            isMachineScoped: this.options.isMachineScoped || existingExtension?.isMachineScoped,
            isBuiltin: this.options.isBuiltin || existingExtension?.isBuiltin,
            isSystem: existingExtension?.type === 0 /* ExtensionType.System */ ? true : undefined,
            installedTimestamp: Date.now(),
            pinned: this.options.installGivenVersion
                ? true
                : (this.options.pinned ?? existingExtension?.pinned),
            source: this.source instanceof URI ? 'vsix' : 'gallery',
        };
        let local;
        // VSIX
        if (this.source instanceof URI) {
            if (existingExtension) {
                if (this.extensionKey.equals(new ExtensionKey(existingExtension.identifier, existingExtension.manifest.version))) {
                    try {
                        await this.extensionsScanner.deleteExtension(existingExtension, 'existing');
                    }
                    catch (e) {
                        throw new Error(nls.localize('restartCode', 'Please restart VS Code before reinstalling {0}.', this.manifest.displayName || this.manifest.name));
                    }
                }
            }
            // Remove the extension with same version if it is already uninstalled.
            // Installing a VSIX extension shall replace the existing extension always.
            const existingWithSameVersion = await this.unsetIfRemoved(this.extensionKey);
            if (existingWithSameVersion) {
                try {
                    await this.extensionsScanner.deleteExtension(existingWithSameVersion, 'existing');
                }
                catch (e) {
                    throw new Error(nls.localize('restartCode', 'Please restart VS Code before reinstalling {0}.', this.manifest.displayName || this.manifest.name));
                }
            }
        }
        // Gallery
        else {
            metadata.id = this.source.identifier.uuid;
            metadata.publisherId = this.source.publisherId;
            metadata.publisherDisplayName = this.source.publisherDisplayName;
            metadata.targetPlatform = this.source.properties.targetPlatform;
            metadata.updated = !!existingExtension;
            metadata.private = this.source.private;
            metadata.isPreReleaseVersion = this.source.properties.isPreReleaseVersion;
            metadata.hasPreReleaseVersion =
                existingExtension?.hasPreReleaseVersion || this.source.properties.isPreReleaseVersion;
            metadata.preRelease = isBoolean(this.options.preRelease)
                ? this.options.preRelease
                : this.options.installPreReleaseVersion ||
                    this.source.properties.isPreReleaseVersion ||
                    existingExtension?.preRelease;
            if (existingExtension &&
                existingExtension.type !== 0 /* ExtensionType.System */ &&
                existingExtension.manifest.version === this.source.version) {
                return this.extensionsScanner.updateMetadata(existingExtension, metadata, this.options.profileLocation);
            }
            // Unset if the extension is uninstalled and return the unset extension.
            local = await this.unsetIfRemoved(this.extensionKey);
        }
        if (token.isCancellationRequested) {
            throw toExtensionManagementError(new CancellationError());
        }
        if (!local) {
            const result = await this.extractExtensionFn(this.operation, token);
            local = result.local;
            this._verificationStatus = result.verificationStatus;
        }
        if (this.uriIdentityService.extUri.isEqual(this.userDataProfilesService.defaultProfile.extensionsResource, this.options.profileLocation)) {
            try {
                await this.extensionsScannerService.initializeDefaultProfileExtensions();
            }
            catch (error) {
                throw toExtensionManagementError(error, "IntializeDefaultProfile" /* ExtensionManagementErrorCode.IntializeDefaultProfile */);
            }
        }
        if (token.isCancellationRequested) {
            throw toExtensionManagementError(new CancellationError());
        }
        try {
            await this.extensionsProfileScannerService.addExtensionsToProfile([[local, metadata]], this.options.profileLocation, !local.isValid);
        }
        catch (error) {
            throw toExtensionManagementError(error, "AddToProfile" /* ExtensionManagementErrorCode.AddToProfile */);
        }
        const result = await this.extensionsScanner.scanLocalExtension(local.location, 1 /* ExtensionType.User */, this.options.profileLocation);
        if (!result) {
            throw new ExtensionManagementError('Cannot find the installed extension', "InstalledExtensionNotFound" /* ExtensionManagementErrorCode.InstalledExtensionNotFound */);
        }
        if (this.source instanceof URI) {
            this.updateMetadata(local, token);
        }
        return result;
    }
    async unsetIfRemoved(extensionKey) {
        // If the same version of extension is marked as removed, remove it from there and return the local.
        const [removed] = await this.extensionsScanner.unsetExtensionsForRemoval(extensionKey);
        if (removed) {
            this.logService.info('Removed the extension from removed list:', extensionKey.id);
            const userExtensions = await this.extensionsScanner.scanAllUserExtensions();
            return userExtensions.find((i) => ExtensionKey.create(i).equals(extensionKey));
        }
        return undefined;
    }
    async updateMetadata(extension, token) {
        try {
            let [galleryExtension] = await this.galleryService.getExtensions([{ id: extension.identifier.id, version: extension.manifest.version }], token);
            if (!galleryExtension) {
                ;
                [galleryExtension] = await this.galleryService.getExtensions([{ id: extension.identifier.id }], token);
            }
            if (galleryExtension) {
                const metadata = {
                    id: galleryExtension.identifier.uuid,
                    publisherDisplayName: galleryExtension.publisherDisplayName,
                    publisherId: galleryExtension.publisherId,
                    isPreReleaseVersion: galleryExtension.properties.isPreReleaseVersion,
                    hasPreReleaseVersion: extension.hasPreReleaseVersion || galleryExtension.properties.isPreReleaseVersion,
                    preRelease: galleryExtension.properties.isPreReleaseVersion ||
                        this.options.installPreReleaseVersion,
                };
                await this.extensionsScanner.updateMetadata(extension, metadata, this.options.profileLocation);
            }
        }
        catch (error) {
            /* Ignore Error */
        }
    }
};
InstallExtensionInProfileTask = __decorate([
    __param(6, IUriIdentityService),
    __param(7, IExtensionGalleryService),
    __param(8, IUserDataProfilesService),
    __param(9, IExtensionsScannerService),
    __param(10, IExtensionsProfileScannerService),
    __param(11, ILogService)
], InstallExtensionInProfileTask);
class UninstallExtensionInProfileTask extends AbstractExtensionTask {
    constructor(extension, options, extensionsProfileScannerService) {
        super();
        this.extension = extension;
        this.options = options;
        this.extensionsProfileScannerService = extensionsProfileScannerService;
    }
    doRun(token) {
        return this.extensionsProfileScannerService.removeExtensionsFromProfile([this.extension.identifier], this.options.profileLocation);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L25vZGUvZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sS0FBSyxNQUFNLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxZQUFZLEVB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
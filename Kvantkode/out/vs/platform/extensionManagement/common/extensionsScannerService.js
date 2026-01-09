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
import { coalesce } from '../../../base/common/arrays.js';
import { ThrottledDelayer } from '../../../base/common/async.js';
import * as objects from '../../../base/common/objects.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { getNodeType, parse } from '../../../base/common/json.js';
import { getParseErrorMessage } from '../../../base/common/jsonErrorMessages.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { FileAccess, Schemas } from '../../../base/common/network.js';
import * as path from '../../../base/common/path.js';
import * as platform from '../../../base/common/platform.js';
import { basename, isEqual, joinPath } from '../../../base/common/resources.js';
import * as semver from '../../../base/common/semver/semver.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { areSameExtensions, computeTargetPlatform, getExtensionId, getGalleryExtensionId, } from './extensionManagementUtil.js';
import { ExtensionIdentifier, UNDEFINED_PUBLISHER, BUILTIN_MANIFEST_CACHE_FILE, USER_MANIFEST_CACHE_FILE, ExtensionIdentifierMap, parseEnabledApiProposalNames, } from '../../extensions/common/extensions.js';
import { validateExtensionManifest } from '../../extensions/common/extensionValidator.js';
import { IFileService, toFileOperationResult, } from '../../files/common/files.js';
import { createDecorator, IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { Emitter } from '../../../base/common/event.js';
import { revive } from '../../../base/common/marshalling.js';
import { ExtensionsProfileScanningError, IExtensionsProfileScannerService, } from './extensionsProfileScannerService.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { localizeManifest } from './extensionNls.js';
export var Translations;
(function (Translations) {
    function equals(a, b) {
        if (a === b) {
            return true;
        }
        const aKeys = Object.keys(a);
        const bKeys = new Set();
        for (const key of Object.keys(b)) {
            bKeys.add(key);
        }
        if (aKeys.length !== bKeys.size) {
            return false;
        }
        for (const key of aKeys) {
            if (a[key] !== b[key]) {
                return false;
            }
            bKeys.delete(key);
        }
        return bKeys.size === 0;
    }
    Translations.equals = equals;
})(Translations || (Translations = {}));
export const IExtensionsScannerService = createDecorator('IExtensionsScannerService');
let AbstractExtensionsScannerService = class AbstractExtensionsScannerService extends Disposable {
    constructor(systemExtensionsLocation, userExtensionsLocation, extensionsControlLocation, currentProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService) {
        super();
        this.systemExtensionsLocation = systemExtensionsLocation;
        this.userExtensionsLocation = userExtensionsLocation;
        this.extensionsControlLocation = extensionsControlLocation;
        this.currentProfile = currentProfile;
        this.userDataProfilesService = userDataProfilesService;
        this.extensionsProfileScannerService = extensionsProfileScannerService;
        this.fileService = fileService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.productService = productService;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this._onDidChangeCache = this._register(new Emitter());
        this.onDidChangeCache = this._onDidChangeCache.event;
        this.systemExtensionsCachedScanner = this._register(this.instantiationService.createInstance(CachedExtensionsScanner, this.currentProfile));
        this.userExtensionsCachedScanner = this._register(this.instantiationService.createInstance(CachedExtensionsScanner, this.currentProfile));
        this.extensionsScanner = this._register(this.instantiationService.createInstance(ExtensionsScanner));
        this.initializeDefaultProfileExtensionsPromise = undefined;
        this._register(this.systemExtensionsCachedScanner.onDidChangeCache(() => this._onDidChangeCache.fire(0 /* ExtensionType.System */)));
        this._register(this.userExtensionsCachedScanner.onDidChangeCache(() => this._onDidChangeCache.fire(1 /* ExtensionType.User */)));
    }
    getTargetPlatform() {
        if (!this._targetPlatformPromise) {
            this._targetPlatformPromise = computeTargetPlatform(this.fileService, this.logService);
        }
        return this._targetPlatformPromise;
    }
    async scanAllExtensions(systemScanOptions, userScanOptions) {
        const [system, user] = await Promise.all([
            this.scanSystemExtensions(systemScanOptions),
            this.scanUserExtensions(userScanOptions),
        ]);
        return this.dedupExtensions(system, user, [], await this.getTargetPlatform(), true);
    }
    async scanSystemExtensions(scanOptions) {
        const promises = [];
        promises.push(this.scanDefaultSystemExtensions(scanOptions.language));
        promises.push(this.scanDevSystemExtensions(scanOptions.language, !!scanOptions.checkControlFile));
        const [defaultSystemExtensions, devSystemExtensions] = await Promise.all(promises);
        return this.applyScanOptions([...defaultSystemExtensions, ...devSystemExtensions], 0 /* ExtensionType.System */, { pickLatest: false });
    }
    async scanUserExtensions(scanOptions) {
        this.logService.trace('Started scanning user extensions', scanOptions.profileLocation);
        const profileScanOptions = this.uriIdentityService.extUri.isEqual(scanOptions.profileLocation, this.userDataProfilesService.defaultProfile.extensionsResource)
            ? { bailOutWhenFileNotFound: true }
            : undefined;
        const extensionsScannerInput = await this.createExtensionScannerInput(scanOptions.profileLocation, true, 1 /* ExtensionType.User */, scanOptions.language, true, profileScanOptions, scanOptions.productVersion ?? this.getProductVersion());
        const extensionsScanner = scanOptions.useCache && !extensionsScannerInput.devMode
            ? this.userExtensionsCachedScanner
            : this.extensionsScanner;
        let extensions;
        try {
            extensions = await extensionsScanner.scanExtensions(extensionsScannerInput);
        }
        catch (error) {
            if (error instanceof ExtensionsProfileScanningError &&
                error.code === "ERROR_PROFILE_NOT_FOUND" /* ExtensionsProfileScanningErrorCode.ERROR_PROFILE_NOT_FOUND */) {
                await this.doInitializeDefaultProfileExtensions();
                extensions = await extensionsScanner.scanExtensions(extensionsScannerInput);
            }
            else {
                throw error;
            }
        }
        extensions = await this.applyScanOptions(extensions, 1 /* ExtensionType.User */, {
            includeInvalid: scanOptions.includeInvalid,
            pickLatest: true,
        });
        this.logService.trace('Scanned user extensions:', extensions.length);
        return extensions;
    }
    async scanAllUserExtensions(scanOptions = {
        includeInvalid: true,
        includeAllVersions: true,
    }) {
        const extensionsScannerInput = await this.createExtensionScannerInput(this.userExtensionsLocation, false, 1 /* ExtensionType.User */, undefined, true, undefined, this.getProductVersion());
        const extensions = await this.extensionsScanner.scanExtensions(extensionsScannerInput);
        return this.applyScanOptions(extensions, 1 /* ExtensionType.User */, {
            includeAllVersions: scanOptions.includeAllVersions,
            includeInvalid: scanOptions.includeInvalid,
        });
    }
    async scanExtensionsUnderDevelopment(existingExtensions, scanOptions) {
        if (this.environmentService.isExtensionDevelopment &&
            this.environmentService.extensionDevelopmentLocationURI) {
            const extensions = (await Promise.all(this.environmentService.extensionDevelopmentLocationURI
                .filter((extLoc) => extLoc.scheme === Schemas.file)
                .map(async (extensionDevelopmentLocationURI) => {
                const input = await this.createExtensionScannerInput(extensionDevelopmentLocationURI, false, 1 /* ExtensionType.User */, scanOptions.language, false /* do not validate */, undefined, this.getProductVersion());
                const extensions = await this.extensionsScanner.scanOneOrMultipleExtensions(input);
                return extensions.map((extension) => {
                    // Override the extension type from the existing extensions
                    extension.type =
                        existingExtensions.find((e) => areSameExtensions(e.identifier, extension.identifier))?.type ?? extension.type;
                    // Validate the extension
                    return this.extensionsScanner.validate(extension, input);
                });
            }))).flat();
            return this.applyScanOptions(extensions, 'development', {
                includeInvalid: scanOptions.includeInvalid,
                pickLatest: true,
            });
        }
        return [];
    }
    async scanExistingExtension(extensionLocation, extensionType, scanOptions) {
        const extensionsScannerInput = await this.createExtensionScannerInput(extensionLocation, false, extensionType, scanOptions.language, true, undefined, this.getProductVersion());
        const extension = await this.extensionsScanner.scanExtension(extensionsScannerInput);
        if (!extension) {
            return null;
        }
        if (!scanOptions.includeInvalid && !extension.isValid) {
            return null;
        }
        return extension;
    }
    async scanOneOrMultipleExtensions(extensionLocation, extensionType, scanOptions) {
        const extensionsScannerInput = await this.createExtensionScannerInput(extensionLocation, false, extensionType, scanOptions.language, true, undefined, this.getProductVersion());
        const extensions = await this.extensionsScanner.scanOneOrMultipleExtensions(extensionsScannerInput);
        return this.applyScanOptions(extensions, extensionType, {
            includeInvalid: scanOptions.includeInvalid,
            pickLatest: true,
        });
    }
    async scanMultipleExtensions(extensionLocations, extensionType, scanOptions) {
        const extensions = [];
        await Promise.all(extensionLocations.map(async (extensionLocation) => {
            const scannedExtensions = await this.scanOneOrMultipleExtensions(extensionLocation, extensionType, scanOptions);
            extensions.push(...scannedExtensions);
        }));
        return this.applyScanOptions(extensions, extensionType, {
            includeInvalid: scanOptions.includeInvalid,
            pickLatest: true,
        });
    }
    async updateManifestMetadata(extensionLocation, metaData) {
        const manifestLocation = joinPath(extensionLocation, 'package.json');
        const content = (await this.fileService.readFile(manifestLocation)).value.toString();
        const manifest = JSON.parse(content);
        manifest.__metadata = { ...manifest.__metadata, ...metaData };
        await this.fileService.writeFile(joinPath(extensionLocation, 'package.json'), VSBuffer.fromString(JSON.stringify(manifest, null, '\t')));
    }
    async initializeDefaultProfileExtensions() {
        try {
            await this.extensionsProfileScannerService.scanProfileExtensions(this.userDataProfilesService.defaultProfile.extensionsResource, { bailOutWhenFileNotFound: true });
        }
        catch (error) {
            if (error instanceof ExtensionsProfileScanningError &&
                error.code === "ERROR_PROFILE_NOT_FOUND" /* ExtensionsProfileScanningErrorCode.ERROR_PROFILE_NOT_FOUND */) {
                await this.doInitializeDefaultProfileExtensions();
            }
            else {
                throw error;
            }
        }
    }
    async doInitializeDefaultProfileExtensions() {
        if (!this.initializeDefaultProfileExtensionsPromise) {
            this.initializeDefaultProfileExtensionsPromise = (async () => {
                try {
                    this.logService.info('Started initializing default profile extensions in extensions installation folder.', this.userExtensionsLocation.toString());
                    const userExtensions = await this.scanAllUserExtensions({ includeInvalid: true });
                    if (userExtensions.length) {
                        await this.extensionsProfileScannerService.addExtensionsToProfile(userExtensions.map((e) => [e, e.metadata]), this.userDataProfilesService.defaultProfile.extensionsResource);
                    }
                    else {
                        try {
                            await this.fileService.createFile(this.userDataProfilesService.defaultProfile.extensionsResource, VSBuffer.fromString(JSON.stringify([])));
                        }
                        catch (error) {
                            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                                this.logService.warn('Failed to create default profile extensions manifest in extensions installation folder.', this.userExtensionsLocation.toString(), getErrorMessage(error));
                            }
                        }
                    }
                    this.logService.info('Completed initializing default profile extensions in extensions installation folder.', this.userExtensionsLocation.toString());
                }
                catch (error) {
                    this.logService.error(error);
                }
                finally {
                    this.initializeDefaultProfileExtensionsPromise = undefined;
                }
            })();
        }
        return this.initializeDefaultProfileExtensionsPromise;
    }
    async applyScanOptions(extensions, type, scanOptions = {}) {
        if (!scanOptions.includeAllVersions) {
            extensions = this.dedupExtensions(type === 0 /* ExtensionType.System */ ? extensions : undefined, type === 1 /* ExtensionType.User */ ? extensions : undefined, type === 'development' ? extensions : undefined, await this.getTargetPlatform(), !!scanOptions.pickLatest);
        }
        if (!scanOptions.includeInvalid) {
            extensions = extensions.filter((extension) => extension.isValid);
        }
        return extensions.sort((a, b) => {
            const aLastSegment = path.basename(a.location.fsPath);
            const bLastSegment = path.basename(b.location.fsPath);
            if (aLastSegment < bLastSegment) {
                return -1;
            }
            if (aLastSegment > bLastSegment) {
                return 1;
            }
            return 0;
        });
    }
    dedupExtensions(system, user, development, targetPlatform, pickLatest) {
        const pick = (existing, extension, isDevelopment) => {
            if (existing.isValid && !extension.isValid) {
                return false;
            }
            if (existing.isValid === extension.isValid) {
                if (pickLatest && semver.gt(existing.manifest.version, extension.manifest.version)) {
                    this.logService.debug(`Skipping extension ${extension.location.path} with lower version ${extension.manifest.version} in favour of ${existing.location.path} with version ${existing.manifest.version}`);
                    return false;
                }
                if (semver.eq(existing.manifest.version, extension.manifest.version)) {
                    if (existing.type === 0 /* ExtensionType.System */) {
                        this.logService.debug(`Skipping extension ${extension.location.path} in favour of system extension ${existing.location.path} with same version`);
                        return false;
                    }
                    if (existing.targetPlatform === targetPlatform) {
                        this.logService.debug(`Skipping extension ${extension.location.path} from different target platform ${extension.targetPlatform}`);
                        return false;
                    }
                }
            }
            if (isDevelopment) {
                this.logService.warn(`Overwriting user extension ${existing.location.path} with ${extension.location.path}.`);
            }
            else {
                this.logService.debug(`Overwriting user extension ${existing.location.path} with ${extension.location.path}.`);
            }
            return true;
        };
        const result = new ExtensionIdentifierMap();
        system?.forEach((extension) => {
            const existing = result.get(extension.identifier.id);
            if (!existing || pick(existing, extension, false)) {
                result.set(extension.identifier.id, extension);
            }
        });
        user?.forEach((extension) => {
            const existing = result.get(extension.identifier.id);
            if (!existing && system && extension.type === 0 /* ExtensionType.System */) {
                this.logService.debug(`Skipping obsolete system extension ${extension.location.path}.`);
                return;
            }
            if (!existing || pick(existing, extension, false)) {
                result.set(extension.identifier.id, extension);
            }
        });
        development?.forEach((extension) => {
            const existing = result.get(extension.identifier.id);
            if (!existing || pick(existing, extension, true)) {
                result.set(extension.identifier.id, extension);
            }
            result.set(extension.identifier.id, extension);
        });
        return [...result.values()];
    }
    async scanDefaultSystemExtensions(language) {
        this.logService.trace('Started scanning system extensions');
        const extensionsScannerInput = await this.createExtensionScannerInput(this.systemExtensionsLocation, false, 0 /* ExtensionType.System */, language, true, undefined, this.getProductVersion());
        const extensionsScanner = extensionsScannerInput.devMode
            ? this.extensionsScanner
            : this.systemExtensionsCachedScanner;
        const result = await extensionsScanner.scanExtensions(extensionsScannerInput);
        this.logService.trace('Scanned system extensions:', result.length);
        return result;
    }
    async scanDevSystemExtensions(language, checkControlFile) {
        const devSystemExtensionsList = this.environmentService.isBuilt
            ? []
            : this.productService.builtInExtensions;
        if (!devSystemExtensionsList?.length) {
            return [];
        }
        this.logService.trace('Started scanning dev system extensions');
        const builtinExtensionControl = checkControlFile ? await this.getBuiltInExtensionControl() : {};
        const devSystemExtensionsLocations = [];
        const devSystemExtensionsLocation = URI.file(path.normalize(path.join(FileAccess.asFileUri('').fsPath, '..', '.build', 'builtInExtensions')));
        for (const extension of devSystemExtensionsList) {
            const controlState = builtinExtensionControl[extension.name] || 'marketplace';
            switch (controlState) {
                case 'disabled':
                    break;
                case 'marketplace':
                    devSystemExtensionsLocations.push(joinPath(devSystemExtensionsLocation, extension.name));
                    break;
                default:
                    devSystemExtensionsLocations.push(URI.file(controlState));
                    break;
            }
        }
        const result = await Promise.all(devSystemExtensionsLocations.map(async (location) => this.extensionsScanner.scanExtension(await this.createExtensionScannerInput(location, false, 0 /* ExtensionType.System */, language, true, undefined, this.getProductVersion()))));
        this.logService.trace('Scanned dev system extensions:', result.length);
        return coalesce(result);
    }
    async getBuiltInExtensionControl() {
        try {
            const content = await this.fileService.readFile(this.extensionsControlLocation);
            return JSON.parse(content.value.toString());
        }
        catch (error) {
            return {};
        }
    }
    async createExtensionScannerInput(location, profile, type, language, validate, profileScanOptions, productVersion) {
        const translations = await this.getTranslations(language ?? platform.language);
        const mtime = await this.getMtime(location);
        const applicationExtensionsLocation = profile &&
            !this.uriIdentityService.extUri.isEqual(location, this.userDataProfilesService.defaultProfile.extensionsResource)
            ? this.userDataProfilesService.defaultProfile.extensionsResource
            : undefined;
        const applicationExtensionsLocationMtime = applicationExtensionsLocation
            ? await this.getMtime(applicationExtensionsLocation)
            : undefined;
        return new ExtensionScannerInput(location, mtime, applicationExtensionsLocation, applicationExtensionsLocationMtime, profile, profileScanOptions, type, validate, productVersion.version, productVersion.date, this.productService.commit, !this.environmentService.isBuilt, language, translations);
    }
    async getMtime(location) {
        try {
            const stat = await this.fileService.stat(location);
            if (typeof stat.mtime === 'number') {
                return stat.mtime;
            }
        }
        catch (err) {
            // That's ok...
        }
        return undefined;
    }
    getProductVersion() {
        return {
            version: this.productService.version,
            date: this.productService.date,
        };
    }
};
AbstractExtensionsScannerService = __decorate([
    __param(4, IUserDataProfilesService),
    __param(5, IExtensionsProfileScannerService),
    __param(6, IFileService),
    __param(7, ILogService),
    __param(8, IEnvironmentService),
    __param(9, IProductService),
    __param(10, IUriIdentityService),
    __param(11, IInstantiationService)
], AbstractExtensionsScannerService);
export { AbstractExtensionsScannerService };
export class ExtensionScannerInput {
    constructor(location, mtime, applicationExtensionslocation, applicationExtensionslocationMtime, profile, profileScanOptions, type, validate, productVersion, productDate, productCommit, devMode, language, translations) {
        this.location = location;
        this.mtime = mtime;
        this.applicationExtensionslocation = applicationExtensionslocation;
        this.applicationExtensionslocationMtime = applicationExtensionslocationMtime;
        this.profile = profile;
        this.profileScanOptions = profileScanOptions;
        this.type = type;
        this.validate = validate;
        this.productVersion = productVersion;
        this.productDate = productDate;
        this.productCommit = productCommit;
        this.devMode = devMode;
        this.language = language;
        this.translations = translations;
        // Keep empty!! (JSON.parse)
    }
    static createNlsConfiguration(input) {
        return {
            language: input.language,
            pseudo: input.language === 'pseudo',
            devMode: input.devMode,
            translations: input.translations,
        };
    }
    static equals(a, b) {
        return (isEqual(a.location, b.location) &&
            a.mtime === b.mtime &&
            isEqual(a.applicationExtensionslocation, b.applicationExtensionslocation) &&
            a.applicationExtensionslocationMtime === b.applicationExtensionslocationMtime &&
            a.profile === b.profile &&
            objects.equals(a.profileScanOptions, b.profileScanOptions) &&
            a.type === b.type &&
            a.validate === b.validate &&
            a.productVersion === b.productVersion &&
            a.productDate === b.productDate &&
            a.productCommit === b.productCommit &&
            a.devMode === b.devMode &&
            a.language === b.language &&
            Translations.equals(a.translations, b.translations));
    }
}
let ExtensionsScanner = class ExtensionsScanner extends Disposable {
    constructor(extensionsProfileScannerService, uriIdentityService, fileService, productService, environmentService, logService) {
        super();
        this.extensionsProfileScannerService = extensionsProfileScannerService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.extensionsEnabledWithApiProposalVersion =
            productService.extensionsEnabledWithApiProposalVersion?.map((id) => id.toLowerCase()) ?? [];
    }
    async scanExtensions(input) {
        return input.profile
            ? this.scanExtensionsFromProfile(input)
            : this.scanExtensionsFromLocation(input);
    }
    async scanExtensionsFromLocation(input) {
        const stat = await this.fileService.resolve(input.location);
        if (!stat.children?.length) {
            return [];
        }
        const extensions = await Promise.all(stat.children.map(async (c) => {
            if (!c.isDirectory) {
                return null;
            }
            // Do not consider user extension folder starting with `.`
            if (input.type === 1 /* ExtensionType.User */ && basename(c.resource).indexOf('.') === 0) {
                return null;
            }
            const extensionScannerInput = new ExtensionScannerInput(c.resource, input.mtime, input.applicationExtensionslocation, input.applicationExtensionslocationMtime, input.profile, input.profileScanOptions, input.type, input.validate, input.productVersion, input.productDate, input.productCommit, input.devMode, input.language, input.translations);
            return this.scanExtension(extensionScannerInput);
        }));
        return (coalesce(extensions)
            // Sort: Make sure extensions are in the same order always. Helps cache invalidation even if the order changes.
            .sort((a, b) => (a.location.path < b.location.path ? -1 : 1)));
    }
    async scanExtensionsFromProfile(input) {
        let profileExtensions = await this.scanExtensionsFromProfileResource(input.location, () => true, input);
        if (input.applicationExtensionslocation &&
            !this.uriIdentityService.extUri.isEqual(input.location, input.applicationExtensionslocation)) {
            profileExtensions = profileExtensions.filter((e) => !e.metadata?.isApplicationScoped);
            const applicationExtensions = await this.scanExtensionsFromProfileResource(input.applicationExtensionslocation, (e) => !!e.metadata?.isBuiltin || !!e.metadata?.isApplicationScoped, input);
            profileExtensions.push(...applicationExtensions);
        }
        return profileExtensions;
    }
    async scanExtensionsFromProfileResource(profileResource, filter, input) {
        const scannedProfileExtensions = await this.extensionsProfileScannerService.scanProfileExtensions(profileResource, input.profileScanOptions);
        if (!scannedProfileExtensions.length) {
            return [];
        }
        const extensions = await Promise.all(scannedProfileExtensions.map(async (extensionInfo) => {
            if (filter(extensionInfo)) {
                const extensionScannerInput = new ExtensionScannerInput(extensionInfo.location, input.mtime, input.applicationExtensionslocation, input.applicationExtensionslocationMtime, input.profile, input.profileScanOptions, input.type, input.validate, input.productVersion, input.productDate, input.productCommit, input.devMode, input.language, input.translations);
                return this.scanExtension(extensionScannerInput, extensionInfo);
            }
            return null;
        }));
        return coalesce(extensions);
    }
    async scanOneOrMultipleExtensions(input) {
        try {
            if (await this.fileService.exists(joinPath(input.location, 'package.json'))) {
                const extension = await this.scanExtension(input);
                return extension ? [extension] : [];
            }
            else {
                return await this.scanExtensions(input);
            }
        }
        catch (error) {
            this.logService.error(`Error scanning extensions at ${input.location.path}:`, getErrorMessage(error));
            return [];
        }
    }
    async scanExtension(input, scannedProfileExtension) {
        const validations = [];
        let isValid = true;
        let manifest;
        try {
            manifest = await this.scanExtensionManifest(input.location);
        }
        catch (e) {
            if (scannedProfileExtension) {
                validations.push([Severity.Error, getErrorMessage(e)]);
                isValid = false;
                const [publisher, name] = scannedProfileExtension.identifier.id.split('.');
                manifest = {
                    name,
                    publisher,
                    version: scannedProfileExtension.version,
                    engines: { vscode: '' },
                };
            }
            else {
                if (input.type !== 0 /* ExtensionType.System */) {
                    this.logService.error(e);
                }
                return null;
            }
        }
        // allow publisher to be undefined to make the initial extension authoring experience smoother
        if (!manifest.publisher) {
            manifest.publisher = UNDEFINED_PUBLISHER;
        }
        let metadata;
        if (scannedProfileExtension) {
            metadata = {
                ...scannedProfileExtension.metadata,
                size: manifest.__metadata?.size,
            };
        }
        else if (manifest.__metadata) {
            metadata = {
                installedTimestamp: manifest.__metadata.installedTimestamp,
                size: manifest.__metadata.size,
                targetPlatform: manifest.__metadata.targetPlatform,
            };
        }
        delete manifest.__metadata;
        const id = getGalleryExtensionId(manifest.publisher, manifest.name);
        const identifier = metadata?.id ? { id, uuid: metadata.id } : { id };
        const type = metadata?.isSystem ? 0 /* ExtensionType.System */ : input.type;
        const isBuiltin = type === 0 /* ExtensionType.System */ || !!metadata?.isBuiltin;
        try {
            manifest = await this.translateManifest(input.location, manifest, ExtensionScannerInput.createNlsConfiguration(input));
        }
        catch (error) {
            this.logService.warn('Failed to translate manifest', getErrorMessage(error));
        }
        let extension = {
            type,
            identifier,
            manifest,
            location: input.location,
            isBuiltin,
            targetPlatform: metadata?.targetPlatform ?? "undefined" /* TargetPlatform.UNDEFINED */,
            publisherDisplayName: metadata?.publisherDisplayName,
            metadata,
            isValid,
            validations,
            preRelease: !!metadata?.preRelease,
        };
        if (input.validate) {
            extension = this.validate(extension, input);
        }
        if (manifest.enabledApiProposals &&
            (!this.environmentService.isBuilt ||
                this.extensionsEnabledWithApiProposalVersion.includes(id.toLowerCase()))) {
            manifest.originalEnabledApiProposals = manifest.enabledApiProposals;
            manifest.enabledApiProposals = parseEnabledApiProposalNames([...manifest.enabledApiProposals]);
        }
        return extension;
    }
    validate(extension, input) {
        let isValid = extension.isValid;
        const validateApiVersion = this.environmentService.isBuilt &&
            this.extensionsEnabledWithApiProposalVersion.includes(extension.identifier.id.toLowerCase());
        const validations = validateExtensionManifest(input.productVersion, input.productDate, input.location, extension.manifest, extension.isBuiltin, validateApiVersion);
        for (const [severity, message] of validations) {
            if (severity === Severity.Error) {
                isValid = false;
                this.logService.error(this.formatMessage(input.location, message));
            }
        }
        extension.isValid = isValid;
        extension.validations = [...extension.validations, ...validations];
        return extension;
    }
    async scanExtensionManifest(extensionLocation) {
        const manifestLocation = joinPath(extensionLocation, 'package.json');
        let content;
        try {
            content = (await this.fileService.readFile(manifestLocation)).value.toString();
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(this.formatMessage(extensionLocation, localize('fileReadFail', 'Cannot read file {0}: {1}.', manifestLocation.path, error.message)));
            }
            throw error;
        }
        let manifest;
        try {
            manifest = JSON.parse(content);
        }
        catch (err) {
            // invalid JSON, let's get good errors
            const errors = [];
            parse(content, errors);
            for (const e of errors) {
                this.logService.error(this.formatMessage(extensionLocation, localize('jsonParseFail', 'Failed to parse {0}: [{1}, {2}] {3}.', manifestLocation.path, e.offset, e.length, getParseErrorMessage(e.error))));
            }
            throw err;
        }
        if (getNodeType(manifest) !== 'object') {
            const errorMessage = this.formatMessage(extensionLocation, localize('jsonParseInvalidType', 'Invalid manifest file {0}: Not a JSON object.', manifestLocation.path));
            this.logService.error(errorMessage);
            throw new Error(errorMessage);
        }
        return manifest;
    }
    async translateManifest(extensionLocation, extensionManifest, nlsConfiguration) {
        const localizedMessages = await this.getLocalizedMessages(extensionLocation, extensionManifest, nlsConfiguration);
        if (localizedMessages) {
            try {
                const errors = [];
                // resolveOriginalMessageBundle returns null if localizedMessages.default === undefined;
                const defaults = await this.resolveOriginalMessageBundle(localizedMessages.default, errors);
                if (errors.length > 0) {
                    errors.forEach((error) => {
                        this.logService.error(this.formatMessage(extensionLocation, localize('jsonsParseReportErrors', 'Failed to parse {0}: {1}.', localizedMessages.default?.path, getParseErrorMessage(error.error))));
                    });
                    return extensionManifest;
                }
                else if (getNodeType(localizedMessages) !== 'object') {
                    this.logService.error(this.formatMessage(extensionLocation, localize('jsonInvalidFormat', 'Invalid format {0}: JSON object expected.', localizedMessages.default?.path)));
                    return extensionManifest;
                }
                const localized = localizedMessages.values || Object.create(null);
                return localizeManifest(this.logService, extensionManifest, localized, defaults);
            }
            catch (error) {
                /*Ignore Error*/
            }
        }
        return extensionManifest;
    }
    async getLocalizedMessages(extensionLocation, extensionManifest, nlsConfiguration) {
        const defaultPackageNLS = joinPath(extensionLocation, 'package.nls.json');
        const reportErrors = (localized, errors) => {
            errors.forEach((error) => {
                this.logService.error(this.formatMessage(extensionLocation, localize('jsonsParseReportErrors', 'Failed to parse {0}: {1}.', localized?.path, getParseErrorMessage(error.error))));
            });
        };
        const reportInvalidFormat = (localized) => {
            this.logService.error(this.formatMessage(extensionLocation, localize('jsonInvalidFormat', 'Invalid format {0}: JSON object expected.', localized?.path)));
        };
        const translationId = `${extensionManifest.publisher}.${extensionManifest.name}`;
        const translationPath = nlsConfiguration.translations[translationId];
        if (translationPath) {
            try {
                const translationResource = URI.file(translationPath);
                const content = (await this.fileService.readFile(translationResource)).value.toString();
                const errors = [];
                const translationBundle = parse(content, errors);
                if (errors.length > 0) {
                    reportErrors(translationResource, errors);
                    return { values: undefined, default: defaultPackageNLS };
                }
                else if (getNodeType(translationBundle) !== 'object') {
                    reportInvalidFormat(translationResource);
                    return { values: undefined, default: defaultPackageNLS };
                }
                else {
                    const values = translationBundle.contents ? translationBundle.contents.package : undefined;
                    return { values: values, default: defaultPackageNLS };
                }
            }
            catch (error) {
                return { values: undefined, default: defaultPackageNLS };
            }
        }
        else {
            const exists = await this.fileService.exists(defaultPackageNLS);
            if (!exists) {
                return undefined;
            }
            let messageBundle;
            try {
                messageBundle = await this.findMessageBundles(extensionLocation, nlsConfiguration);
            }
            catch (error) {
                return undefined;
            }
            if (!messageBundle.localized) {
                return { values: undefined, default: messageBundle.original };
            }
            try {
                const messageBundleContent = (await this.fileService.readFile(messageBundle.localized)).value.toString();
                const errors = [];
                const messages = parse(messageBundleContent, errors);
                if (errors.length > 0) {
                    reportErrors(messageBundle.localized, errors);
                    return { values: undefined, default: messageBundle.original };
                }
                else if (getNodeType(messages) !== 'object') {
                    reportInvalidFormat(messageBundle.localized);
                    return { values: undefined, default: messageBundle.original };
                }
                return { values: messages, default: messageBundle.original };
            }
            catch (error) {
                return { values: undefined, default: messageBundle.original };
            }
        }
    }
    /**
     * Parses original message bundle, returns null if the original message bundle is null.
     */
    async resolveOriginalMessageBundle(originalMessageBundle, errors) {
        if (originalMessageBundle) {
            try {
                const originalBundleContent = (await this.fileService.readFile(originalMessageBundle)).value.toString();
                return parse(originalBundleContent, errors);
            }
            catch (error) {
                /* Ignore Error */
            }
        }
        return;
    }
    /**
     * Finds localized message bundle and the original (unlocalized) one.
     * If the localized file is not present, returns null for the original and marks original as localized.
     */
    findMessageBundles(extensionLocation, nlsConfiguration) {
        return new Promise((c, e) => {
            const loop = (locale) => {
                const toCheck = joinPath(extensionLocation, `package.nls.${locale}.json`);
                this.fileService.exists(toCheck).then((exists) => {
                    if (exists) {
                        c({ localized: toCheck, original: joinPath(extensionLocation, 'package.nls.json') });
                    }
                    const index = locale.lastIndexOf('-');
                    if (index === -1) {
                        c({ localized: joinPath(extensionLocation, 'package.nls.json'), original: null });
                    }
                    else {
                        locale = locale.substring(0, index);
                        loop(locale);
                    }
                });
            };
            if (nlsConfiguration.devMode || nlsConfiguration.pseudo || !nlsConfiguration.language) {
                return c({ localized: joinPath(extensionLocation, 'package.nls.json'), original: null });
            }
            loop(nlsConfiguration.language);
        });
    }
    formatMessage(extensionLocation, message) {
        return `[${extensionLocation.path}]: ${message}`;
    }
};
ExtensionsScanner = __decorate([
    __param(0, IExtensionsProfileScannerService),
    __param(1, IUriIdentityService),
    __param(2, IFileService),
    __param(3, IProductService),
    __param(4, IEnvironmentService),
    __param(5, ILogService)
], ExtensionsScanner);
let CachedExtensionsScanner = class CachedExtensionsScanner extends ExtensionsScanner {
    constructor(currentProfile, userDataProfilesService, extensionsProfileScannerService, uriIdentityService, fileService, productService, environmentService, logService) {
        super(extensionsProfileScannerService, uriIdentityService, fileService, productService, environmentService, logService);
        this.currentProfile = currentProfile;
        this.userDataProfilesService = userDataProfilesService;
        this.cacheValidatorThrottler = this._register(new ThrottledDelayer(3000));
        this._onDidChangeCache = this._register(new Emitter());
        this.onDidChangeCache = this._onDidChangeCache.event;
    }
    async scanExtensions(input) {
        const cacheFile = this.getCacheFile(input);
        const cacheContents = await this.readExtensionCache(cacheFile);
        this.input = input;
        if (cacheContents &&
            cacheContents.input &&
            ExtensionScannerInput.equals(cacheContents.input, this.input)) {
            this.logService.debug('Using cached extensions scan result', input.type === 0 /* ExtensionType.System */ ? 'system' : 'user', input.location.toString());
            this.cacheValidatorThrottler.trigger(() => this.validateCache());
            return cacheContents.result.map((extension) => {
                // revive URI object
                extension.location = URI.revive(extension.location);
                return extension;
            });
        }
        const result = await super.scanExtensions(input);
        await this.writeExtensionCache(cacheFile, { input, result });
        return result;
    }
    async readExtensionCache(cacheFile) {
        try {
            const cacheRawContents = await this.fileService.readFile(cacheFile);
            const extensionCacheData = JSON.parse(cacheRawContents.value.toString());
            return { result: extensionCacheData.result, input: revive(extensionCacheData.input) };
        }
        catch (error) {
            this.logService.debug('Error while reading the extension cache file:', cacheFile.path, getErrorMessage(error));
        }
        return null;
    }
    async writeExtensionCache(cacheFile, cacheContents) {
        try {
            await this.fileService.writeFile(cacheFile, VSBuffer.fromString(JSON.stringify(cacheContents)));
        }
        catch (error) {
            this.logService.debug('Error while writing the extension cache file:', cacheFile.path, getErrorMessage(error));
        }
    }
    async validateCache() {
        if (!this.input) {
            // Input has been unset by the time we get here, so skip validation
            return;
        }
        const cacheFile = this.getCacheFile(this.input);
        const cacheContents = await this.readExtensionCache(cacheFile);
        if (!cacheContents) {
            // Cache has been deleted by someone else, which is perfectly fine...
            return;
        }
        const actual = cacheContents.result;
        const expected = JSON.parse(JSON.stringify(await super.scanExtensions(this.input)));
        if (objects.equals(expected, actual)) {
            // Cache is valid and running with it is perfectly fine...
            return;
        }
        try {
            this.logService.info('Invalidating Cache', actual, expected);
            // Cache is invalid, delete it
            await this.fileService.del(cacheFile);
            this._onDidChangeCache.fire();
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    getCacheFile(input) {
        const profile = this.getProfile(input);
        return this.uriIdentityService.extUri.joinPath(profile.cacheHome, input.type === 0 /* ExtensionType.System */ ? BUILTIN_MANIFEST_CACHE_FILE : USER_MANIFEST_CACHE_FILE);
    }
    getProfile(input) {
        if (input.type === 0 /* ExtensionType.System */) {
            return this.userDataProfilesService.defaultProfile;
        }
        if (!input.profile) {
            return this.userDataProfilesService.defaultProfile;
        }
        if (this.uriIdentityService.extUri.isEqual(input.location, this.currentProfile.extensionsResource)) {
            return this.currentProfile;
        }
        return (this.userDataProfilesService.profiles.find((p) => this.uriIdentityService.extUri.isEqual(input.location, p.extensionsResource)) ?? this.currentProfile);
    }
};
CachedExtensionsScanner = __decorate([
    __param(1, IUserDataProfilesService),
    __param(2, IExtensionsProfileScannerService),
    __param(3, IUriIdentityService),
    __param(4, IFileService),
    __param(5, IProductService),
    __param(6, IEnvironmentService),
    __param(7, ILogService)
], CachedExtensionsScanner);
export function toExtensionDescription(extension, isUnderDevelopment) {
    const id = getExtensionId(extension.manifest.publisher, extension.manifest.name);
    return {
        id,
        identifier: new ExtensionIdentifier(id),
        isBuiltin: extension.type === 0 /* ExtensionType.System */,
        isUserBuiltin: extension.type === 1 /* ExtensionType.User */ && extension.isBuiltin,
        isUnderDevelopment,
        extensionLocation: extension.location,
        uuid: extension.identifier.uuid,
        targetPlatform: extension.targetPlatform,
        publisherDisplayName: extension.publisherDisplayName,
        preRelease: extension.preRelease,
        ...extension.manifest,
    };
}
export class NativeExtensionsScannerService extends AbstractExtensionsScannerService {
    constructor(systemExtensionsLocation, userExtensionsLocation, userHome, currentProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService) {
        super(systemExtensionsLocation, userExtensionsLocation, joinPath(userHome, '.vscode-oss-dev', 'extensions', 'control.json'), currentProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService);
        this.translationsPromise = (async () => {
            if (platform.translationsConfigFile) {
                try {
                    const content = await this.fileService.readFile(URI.file(platform.translationsConfigFile));
                    return JSON.parse(content.value.toString());
                }
                catch (err) {
                    /* Ignore Error */
                }
            }
            return Object.create(null);
        })();
    }
    getTranslations(language) {
        return this.translationsPromise;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25zU2Nhbm5lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBYyxNQUFNLDhCQUE4QixDQUFBO0FBQzdFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3JFLE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRSxPQUFPLEtBQUssTUFBTSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxHQUFHLEVB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
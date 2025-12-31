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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQWMsTUFBTSw4QkFBOEIsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRSxPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0UsT0FBTyxLQUFLLE1BQU0sTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFD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
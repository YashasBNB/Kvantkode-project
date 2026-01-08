/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isAbsolute, join, resolve } from '../../base/common/path.js';
import * as platform from '../../base/common/platform.js';
import { cwd } from '../../base/common/process.js';
import { URI } from '../../base/common/uri.js';
import * as performance from '../../base/common/performance.js';
import { transformOutgoingURIs } from '../../base/common/uriIpc.js';
import { ContextKeyDefinedExpr, ContextKeyEqualsExpr, ContextKeyExpr, ContextKeyGreaterEqualsExpr, ContextKeyGreaterExpr, ContextKeyInExpr, ContextKeyNotEqualsExpr, ContextKeyNotExpr, ContextKeyNotInExpr, ContextKeyRegexExpr, ContextKeySmallerEqualsExpr, ContextKeySmallerExpr, } from '../../platform/contextkey/common/contextkey.js';
import { toExtensionDescription, } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { dedupExtensions } from '../../workbench/services/extensions/common/extensionsUtil.js';
import { Schemas } from '../../base/common/network.js';
import { areSameExtensions } from '../../platform/extensionManagement/common/extensionManagementUtil.js';
export class RemoteExtensionsScannerService {
    constructor(_extensionManagementCLI, environmentService, _userDataProfilesService, _extensionsScannerService, _logService, _extensionGalleryService, _languagePackService, _extensionManagementService) {
        this._extensionManagementCLI = _extensionManagementCLI;
        this._userDataProfilesService = _userDataProfilesService;
        this._extensionsScannerService = _extensionsScannerService;
        this._logService = _logService;
        this._extensionGalleryService = _extensionGalleryService;
        this._languagePackService = _languagePackService;
        this._extensionManagementService = _extensionManagementService;
        this._whenBuiltinExtensionsReady = Promise.resolve({
            failed: [],
        });
        this._whenExtensionsReady = Promise.resolve({ failed: [] });
        const builtinExtensionsToInstall = environmentService.args['install-builtin-extension'];
        if (builtinExtensionsToInstall) {
            _logService.trace('Installing builtin extensions passed via args...');
            const installOptions = {
                isMachineScoped: !!environmentService.args['do-not-sync'],
                installPreReleaseVersion: !!environmentService.args['pre-release'],
            };
            performance.mark('code/server/willInstallBuiltinExtensions');
            this._whenExtensionsReady = this._whenBuiltinExtensionsReady = _extensionManagementCLI
                .installExtensions([], this._asExtensionIdOrVSIX(builtinExtensionsToInstall), installOptions, !!environmentService.args['force'])
                .then(() => {
                performance.mark('code/server/didInstallBuiltinExtensions');
                _logService.trace('Finished installing builtin extensions');
                return { failed: [] };
            }, (error) => {
                _logService.error(error);
                return { failed: [] };
            });
        }
        const extensionsToInstall = environmentService.args['install-extension'];
        if (extensionsToInstall) {
            _logService.trace('Installing extensions passed via args...');
            const installOptions = {
                isMachineScoped: !!environmentService.args['do-not-sync'],
                installPreReleaseVersion: !!environmentService.args['pre-release'],
                isApplicationScoped: true, // extensions installed during server startup are available to all profiles
            };
            this._whenExtensionsReady = this._whenBuiltinExtensionsReady
                .then(() => _extensionManagementCLI.installExtensions(this._asExtensionIdOrVSIX(extensionsToInstall), [], installOptions, !!environmentService.args['force']))
                .then(async () => {
                _logService.trace('Finished installing extensions');
                return { failed: [] };
            }, async (error) => {
                _logService.error(error);
                const failed = [];
                const alreadyInstalled = await this._extensionManagementService.getInstalled(1 /* ExtensionType.User */);
                for (const id of this._asExtensionIdOrVSIX(extensionsToInstall)) {
                    if (typeof id === 'string') {
                        if (!alreadyInstalled.some((e) => areSameExtensions(e.identifier, { id }))) {
                            failed.push({ id, installOptions });
                        }
                    }
                }
                if (!failed.length) {
                    _logService.trace(`No extensions to report as failed`);
                    return { failed: [] };
                }
                _logService.info(`Relaying the following extensions to install later: ${failed.map((f) => f.id).join(', ')}`);
                return { failed };
            });
        }
    }
    _asExtensionIdOrVSIX(inputs) {
        return inputs.map((input) => /\.vsix$/i.test(input) ? URI.file(isAbsolute(input) ? input : join(cwd(), input)) : input);
    }
    whenExtensionsReady() {
        return this._whenExtensionsReady;
    }
    async scanExtensions(language, profileLocation, workspaceExtensionLocations, extensionDevelopmentLocations, languagePackId) {
        performance.mark('code/server/willScanExtensions');
        this._logService.trace(`Scanning extensions using UI language: ${language}`);
        await this._whenBuiltinExtensionsReady;
        const extensionDevelopmentPaths = extensionDevelopmentLocations
            ? extensionDevelopmentLocations
                .filter((url) => url.scheme === Schemas.file)
                .map((url) => url.fsPath)
            : undefined;
        profileLocation =
            profileLocation ?? this._userDataProfilesService.defaultProfile.extensionsResource;
        const extensions = await this._scanExtensions(profileLocation, language ?? platform.language, workspaceExtensionLocations, extensionDevelopmentPaths, languagePackId);
        this._logService.trace('Scanned Extensions', extensions);
        this._massageWhenConditions(extensions);
        performance.mark('code/server/didScanExtensions');
        return extensions;
    }
    async _scanExtensions(profileLocation, language, workspaceInstalledExtensionLocations, extensionDevelopmentPath, languagePackId) {
        await this._ensureLanguagePackIsInstalled(language, languagePackId);
        const [builtinExtensions, installedExtensions, workspaceInstalledExtensions, developedExtensions,] = await Promise.all([
            this._scanBuiltinExtensions(language),
            this._scanInstalledExtensions(profileLocation, language),
            this._scanWorkspaceInstalledExtensions(language, workspaceInstalledExtensionLocations),
            this._scanDevelopedExtensions(language, extensionDevelopmentPath),
        ]);
        return dedupExtensions(builtinExtensions, installedExtensions, workspaceInstalledExtensions, developedExtensions, this._logService);
    }
    async _scanDevelopedExtensions(language, extensionDevelopmentPaths) {
        if (extensionDevelopmentPaths) {
            return (await Promise.all(extensionDevelopmentPaths.map((extensionDevelopmentPath) => this._extensionsScannerService.scanOneOrMultipleExtensions(URI.file(resolve(extensionDevelopmentPath)), 1 /* ExtensionType.User */, { language }))))
                .flat()
                .map((e) => toExtensionDescription(e, true));
        }
        return [];
    }
    async _scanWorkspaceInstalledExtensions(language, workspaceInstalledExtensions) {
        const result = [];
        if (workspaceInstalledExtensions?.length) {
            const scannedExtensions = await Promise.all(workspaceInstalledExtensions.map((location) => this._extensionsScannerService.scanExistingExtension(location, 1 /* ExtensionType.User */, {
                language,
            })));
            for (const scannedExtension of scannedExtensions) {
                if (scannedExtension) {
                    result.push(toExtensionDescription(scannedExtension, false));
                }
            }
        }
        return result;
    }
    async _scanBuiltinExtensions(language) {
        const scannedExtensions = await this._extensionsScannerService.scanSystemExtensions({
            language,
        });
        return scannedExtensions.map((e) => toExtensionDescription(e, false));
    }
    async _scanInstalledExtensions(profileLocation, language) {
        const scannedExtensions = await this._extensionsScannerService.scanUserExtensions({
            profileLocation,
            language,
            useCache: true,
        });
        return scannedExtensions.map((e) => toExtensionDescription(e, false));
    }
    async _ensureLanguagePackIsInstalled(language, languagePackId) {
        if (
        // No need to install language packs for the default language
        language === platform.LANGUAGE_DEFAULT ||
            // The extension gallery service needs to be available
            !this._extensionGalleryService.isEnabled()) {
            return;
        }
        try {
            const installed = await this._languagePackService.getInstalledLanguages();
            if (installed.find((p) => p.id === language)) {
                this._logService.trace(`Language Pack ${language} is already installed. Skipping language pack installation.`);
                return;
            }
        }
        catch (err) {
            // We tried to see what is installed but failed. We can try installing anyway.
            this._logService.error(err);
        }
        if (!languagePackId) {
            this._logService.trace(`No language pack id provided for language ${language}. Skipping language pack installation.`);
            return;
        }
        this._logService.trace(`Language Pack ${languagePackId} for language ${language} is not installed. It will be installed now.`);
        try {
            await this._extensionManagementCLI.installExtensions([languagePackId], [], { isMachineScoped: true }, true);
        }
        catch (err) {
            // We tried to install the language pack but failed. We can continue without it thus using the default language.
            this._logService.error(err);
        }
    }
    _massageWhenConditions(extensions) {
        // Massage "when" conditions which mention `resourceScheme`
        const _mapResourceSchemeValue = (value, isRegex) => {
            // console.log(`_mapResourceSchemeValue: ${value}, ${isRegex}`);
            return value.replace(/file/g, 'vscode-remote');
        };
        const _mapResourceRegExpValue = (value) => {
            let flags = '';
            flags += value.global ? 'g' : '';
            flags += value.ignoreCase ? 'i' : '';
            flags += value.multiline ? 'm' : '';
            return new RegExp(_mapResourceSchemeValue(value.source, true), flags);
        };
        const _exprKeyMapper = new (class {
            mapDefined(key) {
                return ContextKeyDefinedExpr.create(key);
            }
            mapNot(key) {
                return ContextKeyNotExpr.create(key);
            }
            mapEquals(key, value) {
                if (key === 'resourceScheme' && typeof value === 'string') {
                    return ContextKeyEqualsExpr.create(key, _mapResourceSchemeValue(value, false));
                }
                else {
                    return ContextKeyEqualsExpr.create(key, value);
                }
            }
            mapNotEquals(key, value) {
                if (key === 'resourceScheme' && typeof value === 'string') {
                    return ContextKeyNotEqualsExpr.create(key, _mapResourceSchemeValue(value, false));
                }
                else {
                    return ContextKeyNotEqualsExpr.create(key, value);
                }
            }
            mapGreater(key, value) {
                return ContextKeyGreaterExpr.create(key, value);
            }
            mapGreaterEquals(key, value) {
                return ContextKeyGreaterEqualsExpr.create(key, value);
            }
            mapSmaller(key, value) {
                return ContextKeySmallerExpr.create(key, value);
            }
            mapSmallerEquals(key, value) {
                return ContextKeySmallerEqualsExpr.create(key, value);
            }
            mapRegex(key, regexp) {
                if (key === 'resourceScheme' && regexp) {
                    return ContextKeyRegexExpr.create(key, _mapResourceRegExpValue(regexp));
                }
                else {
                    return ContextKeyRegexExpr.create(key, regexp);
                }
            }
            mapIn(key, valueKey) {
                return ContextKeyInExpr.create(key, valueKey);
            }
            mapNotIn(key, valueKey) {
                return ContextKeyNotInExpr.create(key, valueKey);
            }
        })();
        const _massageWhenUser = (element) => {
            if (!element || !element.when || !/resourceScheme/.test(element.when)) {
                return;
            }
            const expr = ContextKeyExpr.deserialize(element.when);
            if (!expr) {
                return;
            }
            const massaged = expr.map(_exprKeyMapper);
            element.when = massaged.serialize();
        };
        const _massageWhenUserArr = (elements) => {
            if (Array.isArray(elements)) {
                for (const element of elements) {
                    _massageWhenUser(element);
                }
            }
            else {
                _massageWhenUser(elements);
            }
        };
        const _massageLocWhenUser = (target) => {
            for (const loc in target) {
                _massageWhenUserArr(target[loc]);
            }
        };
        extensions.forEach((extension) => {
            if (extension.contributes) {
                if (extension.contributes.menus) {
                    _massageLocWhenUser(extension.contributes.menus);
                }
                if (extension.contributes.keybindings) {
                    _massageWhenUserArr(extension.contributes.keybindings);
                }
                if (extension.contributes.views) {
                    _massageLocWhenUser(extension.contributes.views);
                }
            }
        });
    }
}
export class RemoteExtensionsScannerChannel {
    constructor(service, getUriTransformer) {
        this.service = service;
        this.getUriTransformer = getUriTransformer;
    }
    listen(context, event) {
        throw new Error('Invalid listen');
    }
    async call(context, command, args) {
        const uriTransformer = this.getUriTransformer(context);
        switch (command) {
            case 'whenExtensionsReady':
                return await this.service.whenExtensionsReady();
            case 'scanExtensions': {
                const language = args[0];
                const profileLocation = args[1]
                    ? URI.revive(uriTransformer.transformIncoming(args[1]))
                    : undefined;
                const workspaceExtensionLocations = Array.isArray(args[2])
                    ? args[2].map((u) => URI.revive(uriTransformer.transformIncoming(u)))
                    : undefined;
                const extensionDevelopmentPath = Array.isArray(args[3])
                    ? args[3].map((u) => URI.revive(uriTransformer.transformIncoming(u)))
                    : undefined;
                const languagePackId = args[4];
                const extensions = await this.service.scanExtensions(language, profileLocation, workspaceExtensionLocations, extensionDevelopmentPath, languagePackId);
                return extensions.map((extension) => transformOutgoingURIs(extension, uriTransformer));
            }
        }
        throw new Error('Invalid call');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uc1NjYW5uZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3JlbW90ZUV4dGVuc2lvbnNTY2FubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3JFLE9BQU8sS0FBSyxRQUFRLE1BQU0sK0JBQStCLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2xELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5QyxPQUFPLEtBQUssV0FBVyxNQUFNLGtDQUFrQyxDQUFBO0FBRS9ELE9BQU8sRUFBbUIscUJBQXFCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVwRixPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLG9CQUFvQixFQUNwQixjQUFjLEVBRWQsMkJBQTJCLEVBQzNCLHFCQUFxQixFQUNyQixnQkFBZ0IsRUFDaEIsdUJBQXVCLEVBQ3ZCLGlCQUFpQixFQUNqQixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBQ25CLDJCQUEyQixFQUMzQixxQkFBcUIsR0FFckIsTUFBTSxnREFBZ0QsQ0FBQTtBQVF2RCxPQUFPLEVBRU4sc0JBQXNCLEdBQ3RCLE1BQU0sdUVBQXVFLENBQUE7QUFROUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUd0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUV4RyxNQUFNLE9BQU8sOEJBQThCO0lBUTFDLFlBQ2tCLHVCQUErQyxFQUNoRSxrQkFBNkMsRUFD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
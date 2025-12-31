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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uc1NjYW5uZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9yZW1vdGVFeHRlbnNpb25zU2Nhbm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNyRSxPQUFPLEtBQUssUUFBUSxNQUFNLCtCQUErQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUMsT0FBTyxLQUFLLFdBQVcsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUvRCxPQUFPLEVBQW1CLHFCQUFxQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFcEYsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixvQkFBb0IsRUFDcEIsY0FBYyxFQUVkLDJCQUEyQixFQUMzQixxQkFBcUIsRUFDckIsZ0JBQWdCLEVBQ2hCLHVCQUF1QixFQUN2QixpQkFBaUIsRUFDakIsbUJBQW1CLEVBQ25CLG1CQUFtQixFQUNuQiwyQkFBMkIsRUFDM0IscUJBQXFCLEdBRXJCLE1BQU0sZ0RBQWdELENBQUE7QUFRdkQsT0FBTyxFQUVOLHNCQUFzQixHQUN0QixNQUFNLHVFQUF1RSxDQUFBO0FBUTlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFHdEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFFeEcsTUFBTSxPQUFPLDhCQUE4QjtJQVExQyxZQUNrQix1QkFBK0MsRUFDaEUsa0JBQTZDLEVBQzVCLHdC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
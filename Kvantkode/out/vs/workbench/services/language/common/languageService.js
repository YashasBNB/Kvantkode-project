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
import { localize } from '../../../../nls.js';
import { clearConfiguredLanguageAssociations, registerConfiguredLanguageAssociation, } from '../../../../editor/common/services/languagesAssociations.js';
import { joinPath } from '../../../../base/common/resources.js';
import { ILanguageService, } from '../../../../editor/common/languages/language.js';
import { LanguageService } from '../../../../editor/common/services/languageService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { FILES_ASSOCIATIONS_CONFIG, } from '../../../../platform/files/common/files.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ExtensionsRegistry, } from '../../extensions/common/extensionsRegistry.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions, } from '../../extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { index } from '../../../../base/common/arrays.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { isString } from '../../../../base/common/types.js';
export const languagesExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languages',
    jsonSchema: {
        description: localize('vscode.extension.contributes.languages', 'Contributes language declarations.'),
        type: 'array',
        items: {
            type: 'object',
            defaultSnippets: [
                {
                    body: {
                        id: '${1:languageId}',
                        aliases: ['${2:label}'],
                        extensions: ['${3:extension}'],
                        configuration: './language-configuration.json',
                    },
                },
            ],
            properties: {
                id: {
                    description: localize('vscode.extension.contributes.languages.id', 'ID of the language.'),
                    type: 'string',
                },
                aliases: {
                    description: localize('vscode.extension.contributes.languages.aliases', 'Name aliases for the language.'),
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                extensions: {
                    description: localize('vscode.extension.contributes.languages.extensions', 'File extensions associated to the language.'),
                    default: ['.foo'],
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                filenames: {
                    description: localize('vscode.extension.contributes.languages.filenames', 'File names associated to the language.'),
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                filenamePatterns: {
                    description: localize('vscode.extension.contributes.languages.filenamePatterns', 'File name glob patterns associated to the language.'),
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                mimetypes: {
                    description: localize('vscode.extension.contributes.languages.mimetypes', 'Mime types associated to the language.'),
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                firstLine: {
                    description: localize('vscode.extension.contributes.languages.firstLine', 'A regular expression matching the first line of a file of the language.'),
                    type: 'string',
                },
                configuration: {
                    description: localize('vscode.extension.contributes.languages.configuration', 'A relative path to a file containing configuration options for the language.'),
                    type: 'string',
                    default: './language-configuration.json',
                },
                icon: {
                    type: 'object',
                    description: localize('vscode.extension.contributes.languages.icon', 'A icon to use as file icon, if no icon theme provides one for the language.'),
                    properties: {
                        light: {
                            description: localize('vscode.extension.contributes.languages.icon.light', 'Icon path when a light theme is used'),
                            type: 'string',
                        },
                        dark: {
                            description: localize('vscode.extension.contributes.languages.icon.dark', 'Icon path when a dark theme is used'),
                            type: 'string',
                        },
                    },
                },
            },
        },
    },
    activationEventsGenerator: (languageContributions, result) => {
        for (const languageContribution of languageContributions) {
            if (languageContribution.id && languageContribution.configuration) {
                result.push(`onLanguage:${languageContribution.id}`);
            }
        }
    },
});
class LanguageTableRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.languages;
    }
    render(manifest) {
        const contributes = manifest.contributes;
        const rawLanguages = contributes?.languages || [];
        const languages = [];
        for (const l of rawLanguages) {
            if (isValidLanguageExtensionPoint(l)) {
                languages.push({
                    id: l.id,
                    name: (l.aliases || [])[0] || l.id,
                    extensions: l.extensions || [],
                    hasGrammar: false,
                    hasSnippets: false,
                });
            }
        }
        const byId = index(languages, (l) => l.id);
        const grammars = contributes?.grammars || [];
        grammars.forEach((grammar) => {
            if (!isString(grammar.language)) {
                // ignore the grammars that are only used as includes in other grammars
                return;
            }
            let language = byId[grammar.language];
            if (language) {
                language.hasGrammar = true;
            }
            else {
                language = {
                    id: grammar.language,
                    name: grammar.language,
                    extensions: [],
                    hasGrammar: true,
                    hasSnippets: false,
                };
                byId[language.id] = language;
                languages.push(language);
            }
        });
        const snippets = contributes?.snippets || [];
        snippets.forEach((snippet) => {
            if (!isString(snippet.language)) {
                // ignore invalid snippets
                return;
            }
            let language = byId[snippet.language];
            if (language) {
                language.hasSnippets = true;
            }
            else {
                language = {
                    id: snippet.language,
                    name: snippet.language,
                    extensions: [],
                    hasGrammar: false,
                    hasSnippets: true,
                };
                byId[language.id] = language;
                languages.push(language);
            }
        });
        if (!languages.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('language id', 'ID'),
            localize('language name', 'Name'),
            localize('file extensions', 'File Extensions'),
            localize('grammar', 'Grammar'),
            localize('snippets', 'Snippets'),
        ];
        const rows = languages
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((l) => {
            return [
                l.id,
                l.name,
                new MarkdownString().appendMarkdown(`${l.extensions.map((e) => `\`${e}\``).join('&nbsp;')}`),
                l.hasGrammar ? '✔︎' : '\u2014',
                l.hasSnippets ? '✔︎' : '\u2014',
            ];
        });
        return {
            data: {
                headers,
                rows,
            },
            dispose: () => { },
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'languages',
    label: localize('languages', 'Programming Languages'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(LanguageTableRenderer),
});
let WorkbenchLanguageService = class WorkbenchLanguageService extends LanguageService {
    constructor(extensionService, configurationService, environmentService, logService) {
        super(environmentService.verbose ||
            environmentService.isExtensionDevelopment ||
            !environmentService.isBuilt);
        this.logService = logService;
        this._configurationService = configurationService;
        this._extensionService = extensionService;
        languagesExtPoint.setHandler((extensions) => {
            const allValidLanguages = [];
            for (let i = 0, len = extensions.length; i < len; i++) {
                const extension = extensions[i];
                if (!Array.isArray(extension.value)) {
                    extension.collector.error(localize('invalid', 'Invalid `contributes.{0}`. Expected an array.', languagesExtPoint.name));
                    continue;
                }
                for (let j = 0, lenJ = extension.value.length; j < lenJ; j++) {
                    const ext = extension.value[j];
                    if (isValidLanguageExtensionPoint(ext, extension.collector)) {
                        let configuration = undefined;
                        if (ext.configuration) {
                            configuration = joinPath(extension.description.extensionLocation, ext.configuration);
                        }
                        allValidLanguages.push({
                            id: ext.id,
                            extensions: ext.extensions,
                            filenames: ext.filenames,
                            filenamePatterns: ext.filenamePatterns,
                            firstLine: ext.firstLine,
                            aliases: ext.aliases,
                            mimetypes: ext.mimetypes,
                            configuration: configuration,
                            icon: ext.icon && {
                                light: joinPath(extension.description.extensionLocation, ext.icon.light),
                                dark: joinPath(extension.description.extensionLocation, ext.icon.dark),
                            },
                        });
                    }
                }
            }
            this._registry.setDynamicLanguages(allValidLanguages);
        });
        this.updateMime();
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(FILES_ASSOCIATIONS_CONFIG)) {
                this.updateMime();
            }
        }));
        this._extensionService.whenInstalledExtensionsRegistered().then(() => {
            this.updateMime();
        });
        this._register(this.onDidRequestRichLanguageFeatures((languageId) => {
            // extension activation
            this._extensionService.activateByEvent(`onLanguage:${languageId}`);
            this._extensionService.activateByEvent(`onLanguage`);
        }));
    }
    updateMime() {
        const configuration = this._configurationService.getValue();
        // Clear user configured mime associations
        clearConfiguredLanguageAssociations();
        // Register based on settings
        if (configuration.files?.associations) {
            Object.keys(configuration.files.associations).forEach((pattern) => {
                const langId = configuration.files.associations[pattern];
                if (typeof langId !== 'string') {
                    this.logService.warn(`Ignoring configured 'files.associations' for '${pattern}' because its type is not a string but '${typeof langId}'`);
                    return; // https://github.com/microsoft/vscode/issues/147284
                }
                const mimeType = this.getMimeType(langId) || `text/x-${langId}`;
                registerConfiguredLanguageAssociation({ id: langId, mime: mimeType, filepattern: pattern });
            });
        }
        this._onDidChange.fire();
    }
};
WorkbenchLanguageService = __decorate([
    __param(0, IExtensionService),
    __param(1, IConfigurationService),
    __param(2, IEnvironmentService),
    __param(3, ILogService)
], WorkbenchLanguageService);
export { WorkbenchLanguageService };
function isUndefinedOrStringArray(value) {
    if (typeof value === 'undefined') {
        return true;
    }
    if (!Array.isArray(value)) {
        return false;
    }
    return value.every((item) => typeof item === 'string');
}
function isValidLanguageExtensionPoint(value, collector) {
    if (!value) {
        collector?.error(localize('invalid.empty', 'Empty value for `contributes.{0}`', languagesExtPoint.name));
        return false;
    }
    if (typeof value.id !== 'string') {
        collector?.error(localize('require.id', 'property `{0}` is mandatory and must be of type `string`', 'id'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.extensions)) {
        collector?.error(localize('opt.extensions', 'property `{0}` can be omitted and must be of type `string[]`', 'extensions'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.filenames)) {
        collector?.error(localize('opt.filenames', 'property `{0}` can be omitted and must be of type `string[]`', 'filenames'));
        return false;
    }
    if (typeof value.firstLine !== 'undefined' && typeof value.firstLine !== 'string') {
        collector?.error(localize('opt.firstLine', 'property `{0}` can be omitted and must be of type `string`', 'firstLine'));
        return false;
    }
    if (typeof value.configuration !== 'undefined' && typeof value.configuration !== 'string') {
        collector?.error(localize('opt.configuration', 'property `{0}` can be omitted and must be of type `string`', 'configuration'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.aliases)) {
        collector?.error(localize('opt.aliases', 'property `{0}` can be omitted and must be of type `string[]`', 'aliases'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.mimetypes)) {
        collector?.error(localize('opt.mimetypes', 'property `{0}` can be omitted and must be of type `string[]`', 'mimetypes'));
        return false;
    }
    if (typeof value.icon !== 'undefined') {
        if (typeof value.icon !== 'object' ||
            typeof value.icon.light !== 'string' ||
            typeof value.icon.dark !== 'string') {
            collector?.error(localize('opt.icon', 'property `{0}` can be omitted and must be of type `object` with properties `{1}` and `{2}` of type `string`', 'icon', 'light', 'dark'));
            return false;
        }
    }
    return true;
}
registerSingleton(ILanguageService, WorkbenchLanguageService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbGFuZ3VhZ2UvY29tbW9uL2xhbmd1YWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLG1DQUFtQyxFQUNuQyxxQ0FBcUMsR0FDckMsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0QsT0FBTyxFQUVOLGdCQUFnQixHQUNoQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQ04seUJBQXlCLEdBRXpCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUVOLGtCQUFrQixHQUdsQixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixVQUFVLEdBTVYsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxF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
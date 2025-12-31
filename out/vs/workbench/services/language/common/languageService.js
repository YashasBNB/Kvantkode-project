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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xhbmd1YWdlL2NvbW1vbi9sYW5ndWFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixtQ0FBbUMsRUFDbkMscUNBQXFDLEdBQ3JDLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRS9ELE9BQU8sRUFFTixnQkFBZ0IsR0FDaEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUNOLHlCQUF5QixHQUV6QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pFLE9BQU8sRUFFTixrQkFBa0IsR0FHbEIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sVUFBVSxHQU1WLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDekQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQWMzRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FDN0Isa0JBQWtCLENBQUMsc0JBQXNCLENBQStCO0lBQ3ZFLGNBQWMsRUFBRSxXQUFXO0lBQzNCLFVBQVUsRUFBRTtRQUNYLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHdDQUF3QyxFQUN4QyxvQ0FBb0MsQ0FDcEM7UUFDRCxJQUFJLEVBQUUsT0FBTztRQUNiLEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxRQUFRO1lBQ2QsZUFBZSxFQUFFO2dCQUNoQjtvQkFDQyxJQUFJLEVBQUU7d0JBQ0wsRUFBRSxFQUFFLGlCQUFpQjt3QkFDckIsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDO3dCQUN2QixVQUFVLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQzt3QkFDOUIsYUFBYSxFQUFFLCtCQUErQjtxQkFDOUM7aUJBQ0Q7YUFDRDtZQUNELFVBQVUsRUFBRTtnQkFDWCxFQUFFLEVBQUU7b0JBQ0gsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsMkNBQTJDLEVBQzNDLHFCQUFxQixDQUNyQjtvQkFDRCxJQUFJLEVBQUUsUUFBUTtpQkFDZDtnQkFDRCxPQUFPLEVBQUU7b0JBQ1IsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsZ0RBQWdELEVBQ2hELGdDQUFnQyxDQUNoQztvQkFDRCxJQUFJLEVBQUUsT0FBTztvQkFDYixLQUFLLEVBQUU7d0JBQ04sSUFBSSxFQUFFLFFBQVE7cUJBQ2Q7aUJBQ0Q7Z0JBQ0QsVUFBVSxFQUFFO29CQUNYLFdBQVcsRUFBRSxRQUFRLENBQ3BCLG1EQUFtRCxFQUNuRCw2Q0FBNkMsQ0FDN0M7b0JBQ0QsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDO29CQUNqQixJQUFJLEVBQUUsT0FBTztvQkFDYixLQUFLLEVBQUU7d0JBQ04sSUFBSSxFQUFFLFFBQVE7cUJBQ2Q7aUJBQ0Q7Z0JBQ0QsU0FBUyxFQUFFO29CQUNWLFdBQVcsRUFBRSxRQUFRLENBQ3BCLGtEQUFrRCxFQUNsRCx3Q0FBd0MsQ0FDeEM7b0JBQ0QsSUFBSSxFQUFFLE9BQU87b0JBQ2IsS0FBSyxFQUFFO3dCQUNOLElBQUksRUFBRSxRQUFRO3FCQUNkO2lCQUNEO2dCQUNELGdCQUFnQixFQUFFO29CQUNqQixXQUFXLEVBQUUsUUFBUSxDQUNwQix5REFBeUQsRUFDekQscURBQXFELENBQ3JEO29CQUNELElBQUksRUFBRSxPQUFPO29CQUNiLEtBQUssRUFBRTt3QkFDTixJQUFJLEVBQUUsUUFBUTtxQkFDZDtpQkFDRDtnQkFDRCxTQUFTLEVBQUU7b0JBQ1YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsa0RBQWtELEVBQ2xELHdDQUF3QyxDQUN4QztvQkFDRCxJQUFJLEVBQUUsT0FBTztvQkFDYixLQUFLLEVBQUU7d0JBQ04sSUFBSSxFQUFFLFFBQVE7cUJBQ2Q7aUJBQ0Q7Z0JBQ0QsU0FBUyxFQUFFO29CQUNWLFdBQVcsRUFBRSxRQUFRLENBQ3BCLGtEQUFrRCxFQUNsRCx5RUFBeUUsQ0FDekU7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0QsYUFBYSxFQUFFO29CQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHNEQUFzRCxFQUN0RCw4RUFBOEUsQ0FDOUU7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLCtCQUErQjtpQkFDeEM7Z0JBQ0QsSUFBSSxFQUFFO29CQUNMLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDZDQUE2QyxFQUM3Qyw2RUFBNkUsQ0FDN0U7b0JBQ0QsVUFBVSxFQUFFO3dCQUNYLEtBQUssRUFBRTs0QkFDTixXQUFXLEVBQUUsUUFBUSxDQUNwQixtREFBbUQsRUFDbkQsc0NBQXNDLENBQ3RDOzRCQUNELElBQUksRUFBRSxRQUFRO3lCQUNkO3dCQUNELElBQUksRUFBRTs0QkFDTCxXQUFXLEVBQUUsUUFBUSxDQUNwQixrREFBa0QsRUFDbEQscUNBQXFDLENBQ3JDOzRCQUNELElBQUksRUFBRSxRQUFRO3lCQUNkO3FCQUNEO2lCQUNEO2FBQ0Q7U0FDRDtLQUNEO0lBQ0QseUJBQXlCLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUM1RCxLQUFLLE1BQU0sb0JBQW9CLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUMxRCxJQUFJLG9CQUFvQixDQUFDLEVBQUUsSUFBSSxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDckQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUgsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBQTlDOztRQUNVLFNBQUksR0FBRyxPQUFPLENBQUE7SUE0R3hCLENBQUM7SUExR0EsWUFBWSxDQUFDLFFBQTRCO1FBQ3hDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFBO0lBQ3pDLENBQUM7SUFFRCxNQUFNLENBQUMsUUFBNEI7UUFDbEMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQTtRQUN4QyxNQUFNLFlBQVksR0FBRyxXQUFXLEVBQUUsU0FBUyxJQUFJLEVBQUUsQ0FBQTtRQUNqRCxNQUFNLFNBQVMsR0FNVCxFQUFFLENBQUE7UUFDUixLQUFLLE1BQU0sQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQzlCLElBQUksNkJBQTZCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsU0FBUyxDQUFDLElBQUksQ0FBQztvQkFDZCxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7b0JBQ1IsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtvQkFDbEMsVUFBVSxFQUFFLENBQUMsQ0FBQyxVQUFVLElBQUksRUFBRTtvQkFDOUIsVUFBVSxFQUFFLEtBQUs7b0JBQ2pCLFdBQVcsRUFBRSxLQUFLO2lCQUNsQixDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUUxQyxNQUFNLFFBQVEsR0FBRyxXQUFXLEVBQUUsUUFBUSxJQUFJLEVBQUUsQ0FBQTtRQUM1QyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDakMsdUVBQXVFO2dCQUN2RSxPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFckMsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxRQUFRLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQTtZQUMzQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsUUFBUSxHQUFHO29CQUNWLEVBQUUsRUFBRSxPQUFPLENBQUMsUUFBUTtvQkFDcEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRO29CQUN0QixVQUFVLEVBQUUsRUFBRTtvQkFDZCxVQUFVLEVBQUUsSUFBSTtvQkFDaEIsV0FBVyxFQUFFLEtBQUs7aUJBQ2xCLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUE7Z0JBQzVCLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDekIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxRQUFRLEdBQUcsV0FBVyxFQUFFLFFBQVEsSUFBSSxFQUFFLENBQUE7UUFDNUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzVCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLDBCQUEwQjtnQkFDMUIsT0FBTTtZQUNQLENBQUM7WUFDRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRXJDLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7WUFDNUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVEsR0FBRztvQkFDVixFQUFFLEVBQUUsT0FBTyxDQUFDLFFBQVE7b0JBQ3BCLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUTtvQkFDdEIsVUFBVSxFQUFFLEVBQUU7b0JBQ2QsVUFBVSxFQUFFLEtBQUs7b0JBQ2pCLFdBQVcsRUFBRSxJQUFJO2lCQUNqQixDQUFBO2dCQUNELElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFBO2dCQUM1QixTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3pCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkIsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDLEVBQUUsQ0FBQTtRQUM5RCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUc7WUFDZixRQUFRLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQztZQUM3QixRQUFRLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQztZQUNqQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUM7WUFDOUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUM7WUFDOUIsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7U0FDaEMsQ0FBQTtRQUNELE1BQU0sSUFBSSxHQUFpQixTQUFTO2FBQ2xDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN4QyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNWLE9BQU87Z0JBQ04sQ0FBQyxDQUFDLEVBQUU7Z0JBQ0osQ0FBQyxDQUFDLElBQUk7Z0JBQ04sSUFBSSxjQUFjLEVBQUUsQ0FBQyxjQUFjLENBQ2xDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FDdkQ7Z0JBQ0QsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRO2dCQUM5QixDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVE7YUFDL0IsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUgsT0FBTztZQUNOLElBQUksRUFBRTtnQkFDTCxPQUFPO2dCQUNQLElBQUk7YUFDSjtZQUNELE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO1NBQ2pCLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUNWLFVBQVUsQ0FBQyx5QkFBeUIsQ0FDcEMsQ0FBQyx3QkFBd0IsQ0FBQztJQUMxQixFQUFFLEVBQUUsV0FBVztJQUNmLEtBQUssRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLHVCQUF1QixDQUFDO0lBQ3JELE1BQU0sRUFBRTtRQUNQLFNBQVMsRUFBRSxLQUFLO0tBQ2hCO0lBQ0QsUUFBUSxFQUFFLElBQUksY0FBYyxDQUFDLHFCQUFxQixDQUFDO0NBQ25ELENBQUMsQ0FBQTtBQUVLLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsZUFBZTtJQUk1RCxZQUNvQixnQkFBbUMsRUFDL0Isb0JBQTJDLEVBQzdDLGtCQUF1QyxFQUM5QixVQUF1QjtRQUVyRCxLQUFLLENBQ0osa0JBQWtCLENBQUMsT0FBTztZQUN6QixrQkFBa0IsQ0FBQyxzQkFBc0I7WUFDekMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQzVCLENBQUE7UUFONkIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQU9yRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsb0JBQW9CLENBQUE7UUFDakQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGdCQUFnQixDQUFBO1FBRXpDLGlCQUFpQixDQUFDLFVBQVUsQ0FDM0IsQ0FBQyxVQUF3RSxFQUFFLEVBQUU7WUFDNUUsTUFBTSxpQkFBaUIsR0FBOEIsRUFBRSxDQUFBO1lBRXZELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdkQsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUUvQixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDckMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQ3hCLFFBQVEsQ0FDUCxTQUFTLEVBQ1QsK0NBQStDLEVBQy9DLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FDRCxDQUFBO29CQUNELFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM5RCxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUM5QixJQUFJLDZCQUE2QixDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQzt3QkFDN0QsSUFBSSxhQUFhLEdBQW9CLFNBQVMsQ0FBQTt3QkFDOUMsSUFBSSxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUM7NEJBQ3ZCLGFBQWEsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7d0JBQ3JGLENBQUM7d0JBQ0QsaUJBQWlCLENBQUMsSUFBSSxDQUFDOzRCQUN0QixFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUU7NEJBQ1YsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVOzRCQUMxQixTQUFTLEVBQUUsR0FBRyxDQUFDLFNBQVM7NEJBQ3hCLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxnQkFBZ0I7NEJBQ3RDLFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUzs0QkFDeEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPOzRCQUNwQixTQUFTLEVBQUUsR0FBRyxDQUFDLFNBQVM7NEJBQ3hCLGFBQWEsRUFBRSxhQUFhOzRCQUM1QixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSTtnQ0FDakIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO2dDQUN4RSxJQUFJLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7NkJBQ3RFO3lCQUNELENBQUMsQ0FBQTtvQkFDSCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3RELENBQUMsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDekQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDO2dCQUN2RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7WUFDbEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsaUNBQWlDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ3BFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNsQixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDcEQsdUJBQXVCO1lBQ3ZCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsY0FBYyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1lBQ2xFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDckQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxVQUFVO1FBQ2pCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLEVBQXVCLENBQUE7UUFFaEYsMENBQTBDO1FBQzFDLG1DQUFtQyxFQUFFLENBQUE7UUFFckMsNkJBQTZCO1FBQzdCLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQztZQUN2QyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ2pFLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxLQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUN6RCxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNoQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDbkIsaURBQWlELE9BQU8sMkNBQTJDLE9BQU8sTUFBTSxHQUFHLENBQ25ILENBQUE7b0JBRUQsT0FBTSxDQUFDLG9EQUFvRDtnQkFDNUQsQ0FBQztnQkFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFVBQVUsTUFBTSxFQUFFLENBQUE7Z0JBRS9ELHFDQUFxQyxDQUFDLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBQzVGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDekIsQ0FBQztDQUNELENBQUE7QUFoSFksd0JBQXdCO0lBS2xDLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsV0FBVyxDQUFBO0dBUkQsd0JBQXdCLENBZ0hwQzs7QUFFRCxTQUFTLHdCQUF3QixDQUFDLEtBQWU7SUFDaEQsSUFBSSxPQUFPLEtBQUssS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUNsQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzNCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsT0FBTyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUE7QUFDdkQsQ0FBQztBQUVELFNBQVMsNkJBQTZCLENBQ3JDLEtBQVUsRUFDVixTQUFxQztJQUVyQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUUsS0FBSyxDQUNmLFFBQVEsQ0FBQyxlQUFlLEVBQUUsbUNBQW1DLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQ3RGLENBQUE7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxJQUFJLE9BQU8sS0FBSyxDQUFDLEVBQUUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNsQyxTQUFTLEVBQUUsS0FBSyxDQUNmLFFBQVEsQ0FBQyxZQUFZLEVBQUUsMERBQTBELEVBQUUsSUFBSSxDQUFDLENBQ3hGLENBQUE7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDakQsU0FBUyxFQUFFLEtBQUssQ0FDZixRQUFRLENBQ1AsZ0JBQWdCLEVBQ2hCLDhEQUE4RCxFQUM5RCxZQUFZLENBQ1osQ0FDRCxDQUFBO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQ2hELFNBQVMsRUFBRSxLQUFLLENBQ2YsUUFBUSxDQUNQLGVBQWUsRUFDZiw4REFBOEQsRUFDOUQsV0FBVyxDQUNYLENBQ0QsQ0FBQTtRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELElBQUksT0FBTyxLQUFLLENBQUMsU0FBUyxLQUFLLFdBQVcsSUFBSSxPQUFPLEtBQUssQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDbkYsU0FBUyxFQUFFLEtBQUssQ0FDZixRQUFRLENBQ1AsZUFBZSxFQUNmLDREQUE0RCxFQUM1RCxXQUFXLENBQ1gsQ0FDRCxDQUFBO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsSUFBSSxPQUFPLEtBQUssQ0FBQyxhQUFhLEtBQUssV0FBVyxJQUFJLE9BQU8sS0FBSyxDQUFDLGFBQWEsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMzRixTQUFTLEVBQUUsS0FBSyxDQUNmLFFBQVEsQ0FDUCxtQkFBbUIsRUFDbkIsNERBQTRELEVBQzVELGVBQWUsQ0FDZixDQUNELENBQUE7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDOUMsU0FBUyxFQUFFLEtBQUssQ0FDZixRQUFRLENBQ1AsYUFBYSxFQUNiLDhEQUE4RCxFQUM5RCxTQUFTLENBQ1QsQ0FDRCxDQUFBO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQ2hELFNBQVMsRUFBRSxLQUFLLENBQ2YsUUFBUSxDQUNQLGVBQWUsRUFDZiw4REFBOEQsRUFDOUQsV0FBVyxDQUNYLENBQ0QsQ0FBQTtRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELElBQUksT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQ3ZDLElBQ0MsT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLFFBQVE7WUFDOUIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRO1lBQ3BDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUNsQyxDQUFDO1lBQ0YsU0FBUyxFQUFFLEtBQUssQ0FDZixRQUFRLENBQ1AsVUFBVSxFQUNWLDZHQUE2RyxFQUM3RyxNQUFNLEVBQ04sT0FBTyxFQUNQLE1BQU0sQ0FDTixDQUNELENBQUE7WUFDRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQsaUJBQWlCLENBQUMsZ0JBQWdCLEVBQUUsd0JBQXdCLGtDQUEwQixDQUFBIn0=
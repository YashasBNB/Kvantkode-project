/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ClearDisplayLanguageAction, ConfigureDisplayLanguageAction, } from './localizationsActions.js';
import { Extensions, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
export class BaseLocalizationWorkbenchContribution extends Disposable {
    constructor() {
        super();
        // Register action to configure locale and related settings
        registerAction2(ConfigureDisplayLanguageAction);
        registerAction2(ClearDisplayLanguageAction);
        ExtensionsRegistry.registerExtensionPoint({
            extensionPoint: 'localizations',
            defaultExtensionKind: ['ui', 'workspace'],
            jsonSchema: {
                description: localize('vscode.extension.contributes.localizations', 'Contributes localizations to the editor'),
                type: 'array',
                default: [],
                items: {
                    type: 'object',
                    required: ['languageId', 'translations'],
                    defaultSnippets: [
                        {
                            body: {
                                languageId: '',
                                languageName: '',
                                localizedLanguageName: '',
                                translations: [{ id: 'vscode', path: '' }],
                            },
                        },
                    ],
                    properties: {
                        languageId: {
                            description: localize('vscode.extension.contributes.localizations.languageId', 'Id of the language into which the display strings are translated.'),
                            type: 'string',
                        },
                        languageName: {
                            description: localize('vscode.extension.contributes.localizations.languageName', 'Name of the language in English.'),
                            type: 'string',
                        },
                        localizedLanguageName: {
                            description: localize('vscode.extension.contributes.localizations.languageNameLocalized', 'Name of the language in contributed language.'),
                            type: 'string',
                        },
                        translations: {
                            description: localize('vscode.extension.contributes.localizations.translations', 'List of translations associated to the language.'),
                            type: 'array',
                            default: [{ id: 'vscode', path: '' }],
                            items: {
                                type: 'object',
                                required: ['id', 'path'],
                                properties: {
                                    id: {
                                        type: 'string',
                                        description: localize('vscode.extension.contributes.localizations.translations.id', 'Id of VS Code or Extension for which this translation is contributed to. Id of VS Code is always `vscode` and of extension should be in format `publisherId.extensionName`.'),
                                        pattern: '^((vscode)|([a-z0-9A-Z][a-z0-9A-Z-]*)\\.([a-z0-9A-Z][a-z0-9A-Z-]*))$',
                                        patternErrorMessage: localize('vscode.extension.contributes.localizations.translations.id.pattern', 'Id should be `vscode` or in format `publisherId.extensionName` for translating VS code or an extension respectively.'),
                                    },
                                    path: {
                                        type: 'string',
                                        description: localize('vscode.extension.contributes.localizations.translations.path', 'A relative path to a file containing translations for the language.'),
                                    },
                                },
                                defaultSnippets: [{ body: { id: '', path: '' } }],
                            },
                        },
                    },
                },
            },
        });
    }
}
class LocalizationsDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.localizations;
    }
    render(manifest) {
        const localizations = manifest.contributes?.localizations || [];
        if (!localizations.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('language id', 'Language ID'),
            localize('localizations language name', 'Language Name'),
            localize('localizations localized language name', 'Language Name (Localized)'),
        ];
        const rows = localizations
            .sort((a, b) => a.languageId.localeCompare(b.languageId))
            .map((localization) => {
            return [
                localization.languageId,
                localization.languageName ?? '',
                localization.localizedLanguageName ?? '',
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
    id: 'localizations',
    label: localize('localizations', 'Langauage Packs'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(LocalizationsDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvY2FsaXphdGlvbi9jb21tb24vbG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVoRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTNFLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsOEJBQThCLEdBQzlCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQU1OLFVBQVUsR0FDVixNQUFNLG1FQUFtRSxDQUFBO0FBQzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRTlGLE1BQU0sT0FBTyxxQ0FDWixTQUFRLFVBQVU7SUFHbEI7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQUVQLDJEQUEyRDtRQUMzRCxlQUFlLENBQUMsOEJBQThCLENBQUMsQ0FBQTtRQUMvQyxlQUFlLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtRQUUzQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUN6QyxjQUFjLEVBQUUsZUFBZTtZQUMvQixvQkFBb0IsRUFBRSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUM7WUFDekMsVUFBVSxFQUFFO2dCQUNYLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDRDQUE0QyxFQUM1Qyx5Q0FBeUMsQ0FDekM7Z0JBQ0Qs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
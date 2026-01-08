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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9jYWxpemF0aW9uL2NvbW1vbi9sb2NhbGl6YXRpb24uY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRWhGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsT0FBTyxFQUNOLDBCQUEwQixFQUMxQiw4QkFBOEIsR0FDOUIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBTU4sVUFBVSxHQUNWLE1BQU0sbUVBQW1FLENBQUE7QUFDMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFFOUYsTUFBTSxPQUFPLHFDQUNaLFNBQVEsVUFBVTtJQUdsQjtRQUNDLEtBQUssRUFBRSxDQUFBO1FBRVAsMkRBQTJEO1FBQzNELGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO1FBQy9DLGVBQWUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO1FBRTNDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDO1lBQ3pDLGNBQWMsRUFBRSxlQUFlO1lBQy9CLG9CQUFvQixFQUFFLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQztZQUN6QyxVQUFVLEVBQUU7Z0JBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsNENBQTRDLEVBQzVDLHlDQUF5QyxDQUN6Qztn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
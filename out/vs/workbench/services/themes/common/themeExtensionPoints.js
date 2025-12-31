/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as types from '../../../../base/common/types.js';
import * as resources from '../../../../base/common/resources.js';
import { ExtensionsRegistry, } from '../../extensions/common/extensionsRegistry.js';
import { ExtensionData } from './workbenchThemeService.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions, } from '../../extensionManagement/common/extensionFeatures.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ThemeTypeSelector } from '../../../../platform/theme/common/theme.js';
export function registerColorThemeExtensionPoint() {
    return ExtensionsRegistry.registerExtensionPoint({
        extensionPoint: 'themes',
        jsonSchema: {
            description: nls.localize('vscode.extension.contributes.themes', 'Contributes textmate color themes.'),
            type: 'array',
            items: {
                type: 'object',
                defaultSnippets: [
                    {
                        body: {
                            label: '${1:label}',
                            id: '${2:id}',
                            uiTheme: ThemeTypeSelector.VS_DARK,
                            path: './themes/${3:id}.tmTheme.',
                        },
                    },
                ],
                properties: {
                    id: {
                        description: nls.localize('vscode.extension.contributes.themes.id', 'Id of the color theme as used in the user settings.'),
                        type: 'string',
                    },
                    label: {
                        description: nls.localize('vscode.extension.contributes.themes.label', 'Label of the color theme as shown in the UI.'),
                        type: 'string',
                    },
                    uiTheme: {
                        description: nls.localize('vscode.extension.contributes.themes.uiTheme', "Base theme defining the colors around the editor: 'vs' is the light color theme, 'vs-dark' is the dark color theme. 'hc-black' is the dark high contrast theme, 'hc-light' is the light high contrast theme."),
                        enum: [
                            ThemeTypeSelector.VS,
                            ThemeTypeSelector.VS_DARK,
                            ThemeTypeSelector.HC_BLACK,
                            ThemeTypeSelector.HC_LIGHT,
                        ],
                    },
                    path: {
                        description: nls.localize('vscode.extension.contributes.themes.path', "Path of the tmTheme file. The path is relative to the extension folder and is typically './colorthemes/awesome-color-theme.json'."),
                        type: 'string',
                    },
                },
                required: ['path', 'uiTheme'],
            },
        },
    });
}
export function registerFileIconThemeExtensionPoint() {
    return ExtensionsRegistry.registerExtensionPoint({
        extensionPoint: 'iconThemes',
        jsonSchema: {
            description: nls.localize('vscode.extension.contributes.iconThemes', 'Contributes file icon themes.'),
            type: 'array',
            items: {
                type: 'object',
                defaultSnippets: [
                    {
                        body: {
                            id: '${1:id}',
                            label: '${2:label}',
                            path: './fileicons/${3:id}-icon-theme.json',
                        },
                    },
                ],
                properties: {
                    id: {
                        description: nls.localize('vscode.extension.contributes.iconThemes.id', 'Id of the file icon theme as used in the user settings.'),
                        type: 'string',
                    },
                    label: {
                        description: nls.localize('vscode.extension.contributes.iconThemes.label', 'Label of the file icon theme as shown in the UI.'),
                        type: 'string',
                    },
                    path: {
                        description: nls.localize('vscode.extension.contributes.iconThemes.path', "Path of the file icon theme definition file. The path is relative to the extension folder and is typically './fileicons/awesome-icon-theme.json'."),
                        type: 'string',
                    },
                },
                required: ['path', 'id'],
            },
        },
    });
}
export function registerProductIconThemeExtensionPoint() {
    return ExtensionsRegistry.registerExtensionPoint({
        extensionPoint: 'productIconThemes',
        jsonSchema: {
            description: nls.localize('vscode.extension.contributes.productIconThemes', 'Contributes product icon themes.'),
            type: 'array',
            items: {
                type: 'object',
                defaultSnippets: [
                    {
                        body: {
                            id: '${1:id}',
                            label: '${2:label}',
                            path: './producticons/${3:id}-product-icon-theme.json',
                        },
                    },
                ],
                properties: {
                    id: {
                        description: nls.localize('vscode.extension.contributes.productIconThemes.id', 'Id of the product icon theme as used in the user settings.'),
                        type: 'string',
                    },
                    label: {
                        description: nls.localize('vscode.extension.contributes.productIconThemes.label', 'Label of the product icon theme as shown in the UI.'),
                        type: 'string',
                    },
                    path: {
                        description: nls.localize('vscode.extension.contributes.productIconThemes.path', "Path of the product icon theme definition file. The path is relative to the extension folder and is typically './producticons/awesome-product-icon-theme.json'."),
                        type: 'string',
                    },
                },
                required: ['path', 'id'],
            },
        },
    });
}
class ThemeDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'markdown';
    }
    shouldRender(manifest) {
        return (!!manifest.contributes?.themes ||
            !!manifest.contributes?.iconThemes ||
            !!manifest.contributes?.productIconThemes);
    }
    render(manifest) {
        const markdown = new MarkdownString();
        if (manifest.contributes?.themes) {
            markdown.appendMarkdown(`### ${nls.localize('color themes', 'Color Themes')}\n\n`);
            for (const theme of manifest.contributes.themes) {
                markdown.appendMarkdown(`- ${theme.label}\n`);
            }
        }
        if (manifest.contributes?.iconThemes) {
            markdown.appendMarkdown(`### ${nls.localize('file icon themes', 'File Icon Themes')}\n\n`);
            for (const theme of manifest.contributes.iconThemes) {
                markdown.appendMarkdown(`- ${theme.label}\n`);
            }
        }
        if (manifest.contributes?.productIconThemes) {
            markdown.appendMarkdown(`### ${nls.localize('product icon themes', 'Product Icon Themes')}\n\n`);
            for (const theme of manifest.contributes.productIconThemes) {
                markdown.appendMarkdown(`- ${theme.label}\n`);
            }
        }
        return {
            data: markdown,
            dispose: () => {
                /* noop */
            },
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'themes',
    label: nls.localize('themes', 'Themes'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(ThemeDataRenderer),
});
export class ThemeRegistry {
    constructor(themesExtPoint, create, idRequired = false, builtInTheme = undefined) {
        this.themesExtPoint = themesExtPoint;
        this.create = create;
        this.idRequired = idRequired;
        this.builtInTheme = builtInTheme;
        this.onDidChangeEmitter = new Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
        this.extensionThemes = [];
        this.initialize();
    }
    dispose() {
        this.themesExtPoint.setHandler(() => { });
    }
    initialize() {
        this.themesExtPoint.setHandler((extensions, delta) => {
            const previousIds = {};
            const added = [];
            for (const theme of this.extensionThemes) {
                previousIds[theme.id] = theme;
            }
            this.extensionThemes.length = 0;
            for (const ext of extensions) {
                const extensionData = ExtensionData.fromName(ext.description.publisher, ext.description.name, ext.description.isBuiltin);
                this.onThemes(extensionData, ext.description.extensionLocation, ext.value, this.extensionThemes, ext.collector);
            }
            for (const theme of this.extensionThemes) {
                if (!previousIds[theme.id]) {
                    added.push(theme);
                }
                else {
                    delete previousIds[theme.id];
                }
            }
            const removed = Object.values(previousIds);
            this.onDidChangeEmitter.fire({ themes: this.extensionThemes, added, removed });
        });
    }
    onThemes(extensionData, extensionLocation, themeContributions, resultingThemes = [], log) {
        if (!Array.isArray(themeContributions)) {
            log?.error(nls.localize('reqarray', 'Extension point `{0}` must be an array.', this.themesExtPoint.name));
            return resultingThemes;
        }
        themeContributions.forEach((theme) => {
            if (!theme.path || !types.isString(theme.path)) {
                log?.error(nls.localize('reqpath', 'Expected string in `contributes.{0}.path`. Provided value: {1}', this.themesExtPoint.name, String(theme.path)));
                return;
            }
            if (this.idRequired && (!theme.id || !types.isString(theme.id))) {
                log?.error(nls.localize('reqid', 'Expected string in `contributes.{0}.id`. Provided value: {1}', this.themesExtPoint.name, String(theme.id)));
                return;
            }
            const themeLocation = resources.joinPath(extensionLocation, theme.path);
            if (!resources.isEqualOrParent(themeLocation, extensionLocation)) {
                log?.warn(nls.localize('invalid.path.1', "Expected `contributes.{0}.path` ({1}) to be included inside extension's folder ({2}). This might make the extension non-portable.", this.themesExtPoint.name, themeLocation.path, extensionLocation.path));
            }
            const themeData = this.create(theme, themeLocation, extensionData);
            resultingThemes.push(themeData);
        });
        return resultingThemes;
    }
    findThemeById(themeId) {
        if (this.builtInTheme && this.builtInTheme.id === themeId) {
            return this.builtInTheme;
        }
        const allThemes = this.getThemes();
        for (const t of allThemes) {
            if (t.id === themeId) {
                return t;
            }
        }
        return undefined;
    }
    findThemeBySettingsId(settingsId, defaultSettingsId) {
        if (this.builtInTheme && this.builtInTheme.settingsId === settingsId) {
            return this.builtInTheme;
        }
        const allThemes = this.getThemes();
        let defaultTheme = undefined;
        for (const t of allThemes) {
            if (t.settingsId === settingsId) {
                return t;
            }
            if (t.settingsId === defaultSettingsId) {
                defaultTheme = t;
            }
        }
        return defaultTheme;
    }
    findThemeByExtensionLocation(extLocation) {
        if (extLocation) {
            return this.getThemes().filter((t) => t.location && resources.isEqualOrParent(t.location, extLocation));
        }
        return [];
    }
    getThemes() {
        return this.extensionThemes;
    }
    getMarketplaceThemes(manifest, extensionLocation, extensionData) {
        const themes = manifest?.contributes?.[this.themesExtPoint.name];
        if (Array.isArray(themes)) {
            return this.onThemes(extensionData, extensionLocation, themes);
        }
        return [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVFeHRlbnNpb25Qb2ludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi90aGVtZUV4dGVuc2lvblBvaW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUE7QUFDekQsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBR04sa0JBQWtCLEdBQ2xCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSw0QkFBNEIsQ0FBQTtBQUVoRixPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFDTixVQUFVLEdBSVYsTUFBTSx1REFBdUQsQ0FBQTtBQUU5RCxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFOUUsTUFBTSxVQUFVLGdDQUFnQztJQUMvQyxPQUFPLGtCQUFrQixDQUFDLHNCQUFzQixDQUF5QjtRQUN4RSxjQUFjLEVBQUUsUUFBUTtRQUN4QixVQUFVLEVBQUU7WUFDWCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIscUNBQXFDLEVBQ3JDLG9DQUFvQyxDQUNwQztZQUNELElBQUksRUFBRSxP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
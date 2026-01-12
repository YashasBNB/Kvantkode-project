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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVFeHRlbnNpb25Qb2ludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL3RoZW1lRXh0ZW5zaW9uUG9pbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RCxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFHTixrQkFBa0IsR0FDbEIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLDRCQUE0QixDQUFBO0FBRWhGLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUNOLFVBQVUsR0FJVixNQUFNLHVEQUF1RCxDQUFBO0FBRTlELE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUU5RSxNQUFNLFVBQVUsZ0NBQWdDO0lBQy9DLE9BQU8sa0JBQWtCLENBQUMsc0JBQXNCLENBQXlCO1FBQ3hFLGNBQWMsRUFBRSxRQUFRO1FBQ3hCLFVBQVUsRUFBRTtZQUNYLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixxQ0FBcUMsRUFDckMsb0NBQW9DLENBQ3BDO1lBQ0QsSUFBSSxF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
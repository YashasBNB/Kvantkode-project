/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { Extensions as ColorRegistryExtensions, } from '../../../../platform/theme/common/colorRegistry.js';
import { Color } from '../../../../base/common/color.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions, } from '../../extensionManagement/common/extensionFeatures.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
const colorRegistry = Registry.as(ColorRegistryExtensions.ColorContribution);
const colorReferenceSchema = colorRegistry.getColorReferenceSchema();
const colorIdPattern = '^\\w+[.\\w+]*$';
const configurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'colors',
    jsonSchema: {
        description: nls.localize('contributes.color', 'Contributes extension defined themable colors'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: nls.localize('contributes.color.id', 'The identifier of the themable color'),
                    pattern: colorIdPattern,
                    patternErrorMessage: nls.localize('contributes.color.id.format', 'Identifiers must only contain letters, digits and dots and can not start with a dot'),
                },
                description: {
                    type: 'string',
                    description: nls.localize('contributes.color.description', 'The description of the themable color'),
                },
                defaults: {
                    type: 'object',
                    properties: {
                        light: {
                            description: nls.localize('contributes.defaults.light', 'The default color for light themes. Either a color value in hex (#RRGGBB[AA]) or the identifier of a themable color which provides the default.'),
                            type: 'string',
                            anyOf: [colorReferenceSchema, { type: 'string', format: 'color-hex' }],
                        },
                        dark: {
                            description: nls.localize('contributes.defaults.dark', 'The default color for dark themes. Either a color value in hex (#RRGGBB[AA]) or the identifier of a themable color which provides the default.'),
                            type: 'string',
                            anyOf: [colorReferenceSchema, { type: 'string', format: 'color-hex' }],
                        },
                        highContrast: {
                            description: nls.localize('contributes.defaults.highContrast', 'The default color for high contrast dark themes. Either a color value in hex (#RRGGBB[AA]) or the identifier of a themable color which provides the default. If not provided, the `dark` color is used as default for high contrast dark themes.'),
                            type: 'string',
                            anyOf: [colorReferenceSchema, { type: 'string', format: 'color-hex' }],
                        },
                        highContrastLight: {
                            description: nls.localize('contributes.defaults.highContrastLight', 'The default color for high contrast light themes. Either a color value in hex (#RRGGBB[AA]) or the identifier of a themable color which provides the default. If not provided, the `light` color is used as default for high contrast light themes.'),
                            type: 'string',
                            anyOf: [colorReferenceSchema, { type: 'string', format: 'color-hex' }],
                        },
                    },
                    required: ['light', 'dark'],
                },
            },
        },
    },
});
export class ColorExtensionPoint {
    constructor() {
        configurationExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize('invalid.colorConfiguration', "'configuration.colors' must be a array"));
                    return;
                }
                const parseColorValue = (s, name) => {
                    if (s.length > 0) {
                        if (s[0] === '#') {
                            return Color.Format.CSS.parseHex(s);
                        }
                        else {
                            return s;
                        }
                    }
                    collector.error(nls.localize('invalid.default.colorType', '{0} must be either a color value in hex (#RRGGBB[AA] or #RGB[A]) or the identifier of a themable color which provides the default.', name));
                    return Color.red;
                };
                for (const colorContribution of extensionValue) {
                    if (typeof colorContribution.id !== 'string' || colorContribution.id.length === 0) {
                        collector.error(nls.localize('invalid.id', "'configuration.colors.id' must be defined and can not be empty"));
                        return;
                    }
                    if (!colorContribution.id.match(colorIdPattern)) {
                        collector.error(nls.localize('invalid.id.format', "'configuration.colors.id' must only contain letters, digits and dots and can not start with a dot"));
                        return;
                    }
                    if (typeof colorContribution.description !== 'string' ||
                        colorContribution.id.length === 0) {
                        collector.error(nls.localize('invalid.description', "'configuration.colors.description' must be defined and can not be empty"));
                        return;
                    }
                    const defaults = colorContribution.defaults;
                    if (!defaults ||
                        typeof defaults !== 'object' ||
                        typeof defaults.light !== 'string' ||
                        typeof defaults.dark !== 'string') {
                        collector.error(nls.localize('invalid.defaults', "'configuration.colors.defaults' must be defined and must contain 'light' and 'dark'"));
                        return;
                    }
                    if (defaults.highContrast && typeof defaults.highContrast !== 'string') {
                        collector.error(nls.localize('invalid.defaults.highContrast', "If defined, 'configuration.colors.defaults.highContrast' must be a string."));
                        return;
                    }
                    if (defaults.highContrastLight && typeof defaults.highContrastLight !== 'string') {
                        collector.error(nls.localize('invalid.defaults.highContrastLight', "If defined, 'configuration.colors.defaults.highContrastLight' must be a string."));
                        return;
                    }
                    colorRegistry.registerColor(colorContribution.id, {
                        light: parseColorValue(defaults.light, 'configuration.colors.defaults.light'),
                        dark: parseColorValue(defaults.dark, 'configuration.colors.defaults.dark'),
                        hcDark: parseColorValue(defaults.highContrast ?? defaults.dark, 'configuration.colors.defaults.highContrast'),
                        hcLight: parseColorValue(defaults.highContrastLight ?? defaults.light, 'configuration.colors.defaults.highContrastLight'),
                    }, colorContribution.description);
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const colorContribution of extensionValue) {
                    colorRegistry.deregisterColor(colorContribution.id);
                }
            }
        });
    }
}
class ColorDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.colors;
    }
    render(manifest) {
        const colors = manifest.contributes?.colors || [];
        if (!colors.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize('id', 'ID'),
            nls.localize('description', 'Description'),
            nls.localize('defaultDark', 'Dark Default'),
            nls.localize('defaultLight', 'Light Default'),
            nls.localize('defaultHC', 'High Contrast Default'),
        ];
        const toColor = (colorReference) => colorReference[0] === '#' ? Color.fromHex(colorReference) : undefined;
        const rows = colors
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((color) => {
            return [
                new MarkdownString().appendMarkdown(`\`${color.id}\``),
                color.description,
                toColor(color.defaults.dark) ??
                    new MarkdownString().appendMarkdown(`\`${color.defaults.dark}\``),
                toColor(color.defaults.light) ??
                    new MarkdownString().appendMarkdown(`\`${color.defaults.light}\``),
                toColor(color.defaults.highContrast) ??
                    new MarkdownString().appendMarkdown(`\`${color.defaults.highContrast}\``),
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
    id: 'colors',
    label: nls.localize('colors', 'Colors'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(ColorDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vY29sb3JFeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ2xGLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBQ3JDLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsR0FNVixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUV6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFRdkUsTUFBTSxhQUFhLEdBQW1CLFFBQVEsQ0FBQyxFQUFFLENBQ2hELHVCQUF1QixDQUFDLGlCQUFpQixDQUN6QyxDQUFBO0FBRUQsTUFBTSxvQkFBb0IsR0FBRyxhQUFhLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtBQUNwRSxNQUFNLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQTtBQUV2QyxNQUFNLHFCQUFxQixHQUFHLGtCQUFrQixDQUFDLHNCQUFzQixDQUF5QjtJQUMvRixjQUFjLEVBQUUsUUFBUTtJQUN4QixVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsR0FBRyxDQUFD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
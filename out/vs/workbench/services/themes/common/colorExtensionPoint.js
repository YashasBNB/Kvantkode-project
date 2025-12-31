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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL2NvbG9yRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNsRixPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUNyQyxNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixVQUFVLEdBTVYsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBUXZFLE1BQU0sYUFBYSxHQUFtQixRQUFRLENBQUMsRUFBRSxDQUNoRCx1QkFBdUIsQ0FBQyxpQkFBaUIsQ0FDekMsQ0FBQTtBQUVELE1BQU0sb0JBQW9CLEdBQUcsYUFBYSxDQUFDLHVCQUF1QixFQUFFLENBQUE7QUFDcEUsTUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUE7QUFFdkMsTUFBTSxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBeUI7SUFDL0YsY0FBYyxFQUFFLFFBQVE7SUFDeEIsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUs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
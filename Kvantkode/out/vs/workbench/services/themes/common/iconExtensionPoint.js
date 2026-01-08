/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { Extensions as IconRegistryExtensions, } from '../../../../platform/theme/common/iconRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import * as resources from '../../../../base/common/resources.js';
import { extname, posix } from '../../../../base/common/path.js';
const iconRegistry = Registry.as(IconRegistryExtensions.IconContribution);
const iconReferenceSchema = iconRegistry.getIconReferenceSchema();
const iconIdPattern = `^${ThemeIcon.iconNameSegment}(-${ThemeIcon.iconNameSegment})+$`;
const iconConfigurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'icons',
    jsonSchema: {
        description: nls.localize('contributes.icons', 'Contributes extension defined themable icons'),
        type: 'object',
        propertyNames: {
            pattern: iconIdPattern,
            description: nls.localize('contributes.icon.id', 'The identifier of the themable icon'),
            patternErrorMessage: nls.localize('contributes.icon.id.format', 'Identifiers can only contain letters, digits and minuses and need to consist of at least two segments in the form `component-iconname`.'),
        },
        additionalProperties: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                    description: nls.localize('contributes.icon.description', 'The description of the themable icon'),
                },
                default: {
                    anyOf: [
                        iconReferenceSchema,
                        {
                            type: 'object',
                            properties: {
                                fontPath: {
                                    description: nls.localize('contributes.icon.default.fontPath', 'The path of the icon font that defines the icon.'),
                                    type: 'string',
                                },
                                fontCharacter: {
                                    description: nls.localize('contributes.icon.default.fontCharacter', 'The character for the icon in the icon font.'),
                                    type: 'string',
                                },
                            },
                            required: ['fontPath', 'fontCharacter'],
                            defaultSnippets: [
                                { body: { fontPath: '${1:myiconfont.woff}', fontCharacter: '${2:\\\\E001}' } },
                            ],
                        },
                    ],
                    description: nls.localize('contributes.icon.default', 'The default of the icon. Either a reference to an existing ThemeIcon or an icon in an icon font.'),
                },
            },
            required: ['description', 'default'],
            defaultSnippets: [
                {
                    body: {
                        description: '${1:my icon}',
                        default: { fontPath: '${2:myiconfont.woff}', fontCharacter: '${3:\\\\E001}' },
                    },
                },
            ],
        },
        defaultSnippets: [
            {
                body: {
                    '${1:my-icon-id}': {
                        description: '${2:my icon}',
                        default: { fontPath: '${3:myiconfont.woff}', fontCharacter: '${4:\\\\E001}' },
                    },
                },
            },
        ],
    },
});
export class IconExtensionPoint {
    constructor() {
        iconConfigurationExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || typeof extensionValue !== 'object') {
                    collector.error(nls.localize('invalid.icons.configuration', "'configuration.icons' must be an object with the icon names as properties."));
                    return;
                }
                for (const id in extensionValue) {
                    if (!id.match(iconIdPattern)) {
                        collector.error(nls.localize('invalid.icons.id.format', "'configuration.icons' keys represent the icon id and can only contain letter, digits and minuses. They need to consist of at least two segments in the form `component-iconname`."));
                        return;
                    }
                    const iconContribution = extensionValue[id];
                    if (typeof iconContribution.description !== 'string' ||
                        iconContribution.description.length === 0) {
                        collector.error(nls.localize('invalid.icons.description', "'configuration.icons.description' must be defined and can not be empty"));
                        return;
                    }
                    const defaultIcon = iconContribution.default;
                    if (typeof defaultIcon === 'string') {
                        iconRegistry.registerIcon(id, { id: defaultIcon }, iconContribution.description);
                    }
                    else if (typeof defaultIcon === 'object' &&
                        typeof defaultIcon.fontPath === 'string' &&
                        typeof defaultIcon.fontCharacter === 'string') {
                        const fileExt = extname(defaultIcon.fontPath).substring(1);
                        const format = formatMap[fileExt];
                        if (!format) {
                            collector.warn(nls.localize('invalid.icons.default.fontPath.extension', "Expected `contributes.icons.default.fontPath` to have file extension 'woff', woff2' or 'ttf', is '{0}'.", fileExt));
                            return;
                        }
                        const extensionLocation = extension.description.extensionLocation;
                        const iconFontLocation = resources.joinPath(extensionLocation, defaultIcon.fontPath);
                        const fontId = getFontId(extension.description, defaultIcon.fontPath);
                        const definition = iconRegistry.registerIconFont(fontId, {
                            src: [{ location: iconFontLocation, format }],
                        });
                        if (!resources.isEqualOrParent(iconFontLocation, extensionLocation)) {
                            collector.warn(nls.localize('invalid.icons.default.fontPath.path', "Expected `contributes.icons.default.fontPath` ({0}) to be included inside extension's folder ({0}).", iconFontLocation.path, extensionLocation.path));
                            return;
                        }
                        iconRegistry.registerIcon(id, {
                            fontCharacter: defaultIcon.fontCharacter,
                            font: {
                                id: fontId,
                                definition,
                            },
                        }, iconContribution.description);
                    }
                    else {
                        collector.error(nls.localize('invalid.icons.default', "'configuration.icons.default' must be either a reference to the id of an other theme icon (string) or a icon definition (object) with properties `fontPath` and `fontCharacter`."));
                    }
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const id in extensionValue) {
                    iconRegistry.deregisterIcon(id);
                }
            }
        });
    }
}
const formatMap = {
    ttf: 'truetype',
    woff: 'woff',
    woff2: 'woff2',
};
function getFontId(description, fontPath) {
    return posix.join(description.identifier.value, fontPath);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkV4dGVuc2lvblBvaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi9pY29uRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNsRixPQUFPLEVBRU4sVUFBVSxJQUFJLHNCQUFzQixHQUNwQyxNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBU2hFLE1BQU0sWUFBWSxHQUFrQixRQUFRLENBQUMsRUFBRSxDQUM5QyxzQkFBc0IsQ0FBQyxnQkFBZ0IsQ0FDdkMsQ0FBQTtBQUVELE1BQU0sbUJBQW1CLEdBQUcsWUFBWSxDQUFDLHNCQUFzQixFQUFFLENBQUE7QUFDakUsTUFBTSxhQUFhLEdBQUcsSUFBSSxTQUFTLENBQUMsZUFBZSxLQUFLLFNBQVMsQ0FBQyxlQUFlLEtBQUssQ0FBQTtBQUV0RixNQUFNLHlCQUF5QixHQUFHLGtCQUFrQixDQUFDLHNCQUFzQixDQUFzQjtJQUNoRyxjQUFjLEVBQUUsT0FBTztJQUN2QixVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSw4Q0FBOEMsQ0FBQztRQUM5RixJQUFJLEVBQUUsUUFBUTtRQUNkLGFB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
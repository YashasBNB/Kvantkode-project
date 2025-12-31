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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkV4dGVuc2lvblBvaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vaWNvbkV4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDbEYsT0FBTyxFQUVOLFVBQVUsSUFBSSxzQkFBc0IsR0FDcEMsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQVNoRSxNQUFNLFlBQVksR0FBa0IsUUFBUSxDQUFDLEVBQUUsQ0FDOUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQ3ZDLENBQUE7QUFFRCxNQUFNLG1CQUFtQixHQUFHLFlBQVksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO0FBQ2pFLE1BQU0sYUFBYSxHQUFHLElBQUksU0FBUyxDQUFDLGVBQWUsS0FBSyxTQUFTLENBQUMsZUFBZSxLQUFLLENBQUE7QUFFdEYsTUFBTSx5QkFBeUIsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBc0I7SUFDaEcsY0FBYyxFQUFFLE9BQU87SUFDdkIsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsOENBQThDLENBQUM7UUFDOUYsSUFBSSxFQUFFLFFBQVE7UUFDZCxhQUFhLEVB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
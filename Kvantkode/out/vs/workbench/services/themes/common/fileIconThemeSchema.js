/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as JSONExtensions, } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { fontWeightRegex, fontStyleRegex, fontSizeRegex, fontIdRegex, fontColorRegex, fontIdErrorMessage, } from '../../../../platform/theme/common/iconRegistry.js';
const schemaId = 'vscode://schemas/icon-theme';
const schema = {
    type: 'object',
    allowComments: true,
    allowTrailingCommas: true,
    definitions: {
        folderExpanded: {
            type: 'string',
            description: nls.localize('schema.folderExpanded', 'The folder icon for expanded folders. The expanded folder icon is optional. If not set, the icon defined for folder will be shown.'),
        },
        folder: {
            type: 'string',
            description: nls.localize('schema.folder', 'The folder icon for collapsed folders, and if folderExpanded is not set, also for expanded folders.'),
        },
        file: {
            type: 'string',
            description: nls.localize('schema.file', "The default file icon, shown for all files that don't match any extension, filename or language id."),
        },
        rootFolder: {
            type: 'string',
            description: nls.localize('schema.rootFolder', 'The folder icon for collapsed root folders, and if rootFolderExpanded is not set, also for expanded root folders.'),
        },
        rootFolderExpanded: {
            type: 'string',
            description: nls.localize('schema.rootFolderExpanded', 'The folder icon for expanded root folders. The expanded root folder icon is optional. If not set, the icon defined for root folder will be shown.'),
        },
        rootFolderNames: {
            type: 'object',
            description: nls.localize('schema.rootFolderNames', 'Associates root folder names to icons. The object key is the root folder name. No patterns or wildcards are allowed. Root folder name matching is case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.folderName', 'The ID of the icon definition for the association.'),
            },
        },
        rootFolderNamesExpanded: {
            type: 'object',
            description: nls.localize('schema.rootFolderNamesExpanded', 'Associates root folder names to icons for expanded root folders. The object key is the root folder name. No patterns or wildcards are allowed. Root folder name matching is case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.rootFolderNameExpanded', 'The ID of the icon definition for the association.'),
            },
        },
        folderNames: {
            type: 'object',
            description: nls.localize('schema.folderNames', 'Associates folder names to icons. The object key is the folder name, not including any path segments. No patterns or wildcards are allowed. Folder name matching is case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.folderName', 'The ID of the icon definition for the association.'),
            },
        },
        folderNamesExpanded: {
            type: 'object',
            description: nls.localize('schema.folderNamesExpanded', 'Associates folder names to icons for expanded folders. The object key is the folder name, not including any path segments. No patterns or wildcards are allowed. Folder name matching is case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.folderNameExpanded', 'The ID of the icon definition for the association.'),
            },
        },
        fileExtensions: {
            type: 'object',
            description: nls.localize('schema.fileExtensions', 'Associates file extensions to icons. The object key is the file extension name. The extension name is the last segment of a file name after the last dot (not including the dot). Extensions are compared case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.fileExtension', 'The ID of the icon definition for the association.'),
            },
        },
        fileNames: {
            type: 'object',
            description: nls.localize('schema.fileNames', 'Associates file names to icons. The object key is the full file name, but not including any path segments. File name can include dots and a possible file extension. No patterns or wildcards are allowed. File name matching is case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.fileName', 'The ID of the icon definition for the association.'),
            },
        },
        languageIds: {
            type: 'object',
            description: nls.localize('schema.languageIds', 'Associates languages to icons. The object key is the language id as defined in the language contribution point.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.languageId', 'The ID of the icon definition for the association.'),
            },
        },
        associations: {
            type: 'object',
            properties: {
                folderExpanded: {
                    $ref: '#/definitions/folderExpanded',
                },
                folder: {
                    $ref: '#/definitions/folder',
                },
                file: {
                    $ref: '#/definitions/file',
                },
                folderNames: {
                    $ref: '#/definitions/folderNames',
                },
                folderNamesExpanded: {
                    $ref: '#/definitions/folderNamesExpanded',
                },
                rootFolder: {
                    $ref: '#/definitions/rootFolder',
                },
                rootFolderExpanded: {
                    $ref: '#/definitions/rootFolderExpanded',
                },
                rootFolderNames: {
                    $ref: '#/definitions/rootFolderNames',
                },
                rootFolderNamesExpanded: {
                    $ref: '#/definitions/rootFolderNamesExpanded',
                },
                fileExtensions: {
                    $ref: '#/definitions/fileExtensions',
                },
                fileNames: {
                    $ref: '#/definitions/fileNames',
                },
                languageIds: {
                    $ref: '#/definitions/languageIds',
                },
            },
        },
    },
    properties: {
        fonts: {
            type: 'array',
            description: nls.localize('schema.fonts', 'Fonts that are used in the icon definitions.'),
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: nls.localize('schema.id', 'The ID of the font.'),
                        pattern: fontIdRegex.source,
                        patternErrorMessage: fontIdErrorMessage,
                    },
                    src: {
                        type: 'array',
                        description: nls.localize('schema.src', 'The location of the font.'),
                        items: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: nls.localize('schema.font-path', 'The font path, relative to the current file icon theme file.'),
                                },
                                format: {
                                    type: 'string',
                                    description: nls.localize('schema.font-format', 'The format of the font.'),
                                    enum: ['woff', 'woff2', 'truetype', 'opentype', 'embedded-opentype', 'svg'],
                                },
                            },
                            required: ['path', 'format'],
                        },
                    },
                    weight: {
                        type: 'string',
                        description: nls.localize('schema.font-weight', 'The weight of the font. See https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight for valid values.'),
                        pattern: fontWeightRegex.source,
                    },
                    style: {
                        type: 'string',
                        description: nls.localize('schema.font-style', 'The style of the font. See https://developer.mozilla.org/en-US/docs/Web/CSS/font-style for valid values.'),
                        pattern: fontStyleRegex.source,
                    },
                    size: {
                        type: 'string',
                        description: nls.localize('schema.font-size', 'The default size of the font. We strongly recommend using a percentage value, for example: 125%.'),
                        pattern: fontSizeRegex.source,
                    },
                },
                required: ['id', 'src'],
            },
        },
        iconDefinitions: {
            type: 'object',
            description: nls.localize('schema.iconDefinitions', 'Description of all icons that can be used when associating files to icons.'),
            additionalProperties: {
                type: 'object',
                description: nls.localize('schema.iconDefinition', 'An icon definition. The object key is the ID of the definition.'),
                properties: {
                    iconPath: {
                        type: 'string',
                        description: nls.localize('schema.iconPath', 'When using a SVG or PNG: The path to the image. The path is relative to the icon set file.'),
                    },
                    fontCharacter: {
                        type: 'string',
                        description: nls.localize('schema.fontCharacter', 'When using a glyph font: The character in the font to use.'),
                    },
                    fontColor: {
                        type: 'string',
                        format: 'color-hex',
                        description: nls.localize('schema.fontColor', 'When using a glyph font: The color to use.'),
                        pattern: fontColorRegex.source,
                    },
                    fontSize: {
                        type: 'string',
                        description: nls.localize('schema.fontSize', 'When using a font: The font size in percentage to the text font. If not set, defaults to the size in the font definition.'),
                        pattern: fontSizeRegex.source,
                    },
                    fontId: {
                        type: 'string',
                        description: nls.localize('schema.fontId', 'When using a font: The id of the font. If not set, defaults to the first font definition.'),
                        pattern: fontIdRegex.source,
                        patternErrorMessage: fontIdErrorMessage,
                    },
                },
            },
        },
        folderExpanded: {
            $ref: '#/definitions/folderExpanded',
        },
        folder: {
            $ref: '#/definitions/folder',
        },
        file: {
            $ref: '#/definitions/file',
        },
        folderNames: {
            $ref: '#/definitions/folderNames',
        },
        folderNamesExpanded: {
            $ref: '#/definitions/folderNamesExpanded',
        },
        rootFolder: {
            $ref: '#/definitions/rootFolder',
        },
        rootFolderExpanded: {
            $ref: '#/definitions/rootFolderExpanded',
        },
        rootFolderNames: {
            $ref: '#/definitions/rootFolderNames',
        },
        rootFolderNamesExpanded: {
            $ref: '#/definitions/rootFolderNamesExpanded',
        },
        fileExtensions: {
            $ref: '#/definitions/fileExtensions',
        },
        fileNames: {
            $ref: '#/definitions/fileNames',
        },
        languageIds: {
            $ref: '#/definitions/languageIds',
        },
        light: {
            $ref: '#/definitions/associations',
            description: nls.localize('schema.light', 'Optional associations for file icons in light color themes.'),
        },
        highContrast: {
            $ref: '#/definitions/associations',
            description: nls.localize('schema.highContrast', 'Optional associations for file icons in high contrast color themes.'),
        },
        hidesExplorerArrows: {
            type: 'boolean',
            description: nls.localize('schema.hidesExplorerArrows', "Configures whether the file explorer's arrows should be hidden when this theme is active."),
        },
        showLanguageModeIcons: {
            type: 'boolean',
            description: nls.localize('schema.showLanguageModeIcons', 'Configures whether the default language icons should be used if the theme does not define an icon for a language.'),
        },
    },
};
export function registerFileIconThemeSchemas() {
    const schemaRegistry = Registry.as(JSONExtensions.JSONContribution);
    schemaRegistry.registerSchema(schemaId, schema);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUljb25UaGVtZVNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vZmlsZUljb25UaGVtZVNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxJQUFJLGNBQWMsR0FFNUIsTUFBTSxxRUFBcUUsQ0FBQTtBQUU1RSxPQUFPLEVBQ04sZUFBZSxFQUNmLGNBQWMsRUFDZCxhQUFhLEVBQ2IsV0FBVyxFQUNYLGNBQWMsRUFDZCxrQkFBa0IsR0FDbEIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxNQUFNLFFBQVEsR0FBRyw2QkFBNkIsQ0FBQTtBQUM5QyxNQUFNLE1BQU0sR0FBZ0I7SUFDM0IsSUFBSSxFQUFFLFFBQVE7SUFDZCxhQUFhLEVBQUUsSUFBSTtJQUNuQixtQkFBbUIsRUFBRSxJQUFJO0lBQ3pCLFdBQVcsRUFBRTtRQUNaLGNBQWMsRUFBRTtZQUNmLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHVCQUF1QixFQUN2QixvSUFBb0ksQ0FDcEk7U0FDRDtRQUNELE1BQU0sRUFBRTtZQUNQLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGVBQWUsRUFDZixxR0FBcUcsQ0FDckc7U0FDRDtRQUNELElBQUksRUFBRTtZQUNMLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGFBQWEsRUFDYixxR0FBcUcsQ0FDckc7U0FDRDtRQUNELFVBQVUsRUFBRTtZQUNYLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG1CQUFtQixFQUNuQixtSEFBbUgsQ0FDbkg7U0FDRDtRQUNELGtCQUFrQixFQUFFO1lBQ25CLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDJCQUEyQixFQUMzQixtSkFBbUosQ0FDbko7U0FDRDtRQUNELGVBQWUsRUFBRTtZQUNoQixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix3QkFBd0IsRUFDeEIscUtBQXFLLENBQ3JLO1lBQ0Qsb0JBQW9CLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixtQkFBbUIsRUFDbkIsb0RBQW9ELENBQ3BEO2FBQ0Q7U0FDRDtRQUNELHVCQUF1QixFQUFFO1lBQ3hCLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGdDQUFnQyxFQUNoQywrTEFBK0wsQ0FDL0w7WUFDRCxvQkFBb0IsRUFBRTtnQkFDckIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLCtCQUErQixFQUMvQixvREFBb0QsQ0FDcEQ7YUFDRDtTQUNEO1FBQ0QsV0FBVyxFQUFFO1lBQ1osSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsb0JBQW9CLEVBQ3BCLHVMQUF1TCxDQUN2TDtZQUNELG9CQUFvQixFQUFFO2dCQUNyQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsbUJBQW1CLEVBQ25CLG9EQUFvRCxDQUNwRDthQUNEO1NBQ0Q7UUFDRCxtQkFBbUIsRUFBRTtZQUNwQixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qiw0QkFBNEIsRUFDNUIsNE1BQTRNLENBQzVNO1lBQ0Qsb0JBQW9CLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwyQkFBMkIsRUFDM0Isb0RBQW9ELENBQ3BEO2FBQ0Q7U0FDRDtRQUNELGNBQWMsRUFBRTtZQUNmLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHVCQUF1QixFQUN2Qiw2TkFBNk4sQ0FDN047WUFFRCxvQkFBb0IsRUFBRTtnQkFDckIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHNCQUFzQixFQUN0QixvREFBb0QsQ0FDcEQ7YUFDRDtTQUNEO1FBQ0QsU0FBUyxFQUFFO1lBQ1YsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsa0JBQWtCLEVBQ2xCLG9QQUFvUCxDQUNwUDtZQUVELG9CQUFvQixFQUFFO2dCQUNyQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsaUJBQWlCLEVBQ2pCLG9EQUFvRCxDQUNwRDthQUNEO1NBQ0Q7UUFDRCxXQUFXLEVBQUU7WUFDWixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixvQkFBb0IsRUFDcEIsaUhBQWlILENBQ2pIO1lBRUQsb0JBQW9CLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixtQkFBbUIsRUFDbkIsb0RBQW9ELENBQ3BEO2FBQ0Q7U0FDRDtRQUNELFlBQVksRUFBRTtZQUNiLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLGNBQWMsRUFBRTtvQkFDZixJQUFJLEVBQUUsOEJBQThCO2lCQUNwQztnQkFDRCxNQUFNLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLHNCQUFzQjtpQkFDNUI7Z0JBQ0QsSUFBSSxFQUFFO29CQUNMLElBQUksRUFBRSxvQkFBb0I7aUJBQzFCO2dCQUNELFdBQVcsRUFBRTtvQkFDWixJQUFJLEVBQUUsMkJBQTJCO2lCQUNqQztnQkFDRCxtQkFBbUIsRUFBRTtvQkFDcEIsSUFBSSxFQUFFLG1DQUFtQztpQkFDekM7Z0JBQ0QsVUFBVSxFQUFFO29CQUNYLElBQUksRUFBRSwwQkFBMEI7aUJBQ2hDO2dCQUNELGtCQUFrQixFQUFFO29CQUNuQixJQUFJLEVBQUUsa0NBQWtDO2lCQUN4QztnQkFDRCxlQUFlLEVBQUU7b0JBQ2hCLElBQUksRUFBRSwrQkFBK0I7aUJBQ3JDO2dCQUNELHVCQUF1QixFQUFFO29CQUN4QixJQUFJLEVBQUUsdUNBQXVDO2lCQUM3QztnQkFDRCxjQUFjLEVBQUU7b0JBQ2YsSUFBSSxFQUFFLDhCQUE4QjtpQkFDcEM7Z0JBQ0QsU0FBUyxFQUFFO29CQUNWLElBQUksRUFBRSx5QkFBeUI7aUJBQy9CO2dCQUNELFdBQVcsRUFBRTtvQkFDWixJQUFJLEVBQUUsMkJBQTJCO2lCQUNqQzthQUNEO1NBQ0Q7S0FDRDtJQUNELFVBQVUsRUFBRTtRQUNYLEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxPQUFPO1lBQ2IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLDhDQUE4QyxDQUFDO1lBQ3pGLEtBQUssRUFBRTtnQkFDTixJQUFJLEVBQUUsUUFBUTtnQkFDZCxVQUFVLEVBQUU7b0JBQ1gsRUFBRSxFQUFFO3dCQUNILElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxxQkFBcUIsQ0FBQzt3QkFDN0QsT0FBTyxFQUFFLFdBQVcsQ0FBQyxNQUFNO3dCQUMzQixtQkFBbUIsRUFBRSxrQkFBa0I7cUJBQ3ZDO29CQUNELEdBQUcsRUFBRTt3QkFDSixJQUFJLEVBQUUsT0FBTzt3QkFDYixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsMkJBQTJCLENBQUM7d0JBQ3BFLEtBQUssRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxVQUFVLEVBQUU7Z0NBQ1gsSUFBSSxFQUFFO29DQUNMLElBQUksRUFBRSxRQUFRO29DQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixrQkFBa0IsRUFDbEIsOERBQThELENBQzlEO2lDQUNEO2dDQUNELE1BQU0sRUFBRTtvQ0FDUCxJQUFJLEVBQUUsUUFBUTtvQ0FDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx5QkFBeUIsQ0FBQztvQ0FDMUUsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixFQUFFLEtBQUssQ0FBQztpQ0FDM0U7NkJBQ0Q7NEJBQ0QsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQzt5QkFDNUI7cUJBQ0Q7b0JBQ0QsTUFBTSxFQUFFO3dCQUNQLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixvQkFBb0IsRUFDcEIsNEdBQTRHLENBQzVHO3dCQUNELE9BQU8sRUFBRSxlQUFlLENBQUMsTUFBTTtxQkFDL0I7b0JBQ0QsS0FBSyxFQUFFO3dCQUNOLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixtQkFBbUIsRUFDbkIsMEdBQTBHLENBQzFHO3dCQUNELE9BQU8sRUFBRSxjQUFjLENBQUMsTUFBTTtxQkFDOUI7b0JBQ0QsSUFBSSxFQUFFO3dCQUNMLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixrQkFBa0IsRUFDbEIsa0dBQWtHLENBQ2xHO3dCQUNELE9BQU8sRUFBRSxhQUFhLENBQUMsTUFBTTtxQkFDN0I7aUJBQ0Q7Z0JBQ0QsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQzthQUN2QjtTQUNEO1FBQ0QsZUFBZSxFQUFFO1lBQ2hCLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHdCQUF3QixFQUN4Qiw0RUFBNEUsQ0FDNUU7WUFDRCxvQkFBb0IsRUFBRTtnQkFDckIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHVCQUF1QixFQUN2QixpRUFBaUUsQ0FDakU7Z0JBQ0QsVUFBVSxFQUFFO29CQUNYLFFBQVEsRUFBRTt3QkFDVCxJQUFJLEVBQUUsUUFBUTt3QkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsaUJBQWlCLEVBQ2pCLDRGQUE0RixDQUM1RjtxQkFDRDtvQkFDRCxhQUFhLEVBQUU7d0JBQ2QsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHNCQUFzQixFQUN0Qiw0REFBNEQsQ0FDNUQ7cUJBQ0Q7b0JBQ0QsU0FBUyxFQUFFO3dCQUNWLElBQUksRUFBRSxRQUFRO3dCQUNkLE1BQU0sRUFBRSxXQUFXO3dCQUNuQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsa0JBQWtCLEVBQ2xCLDRDQUE0QyxDQUM1Qzt3QkFDRCxPQUFPLEVBQUUsY0FBYyxDQUFDLE1BQU07cUJBQzlCO29CQUNELFFBQVEsRUFBRTt3QkFDVCxJQUFJLEVBQUUsUUFBUTt3QkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsaUJBQWlCLEVBQ2pCLDJIQUEySCxDQUMzSDt3QkFDRCxPQUFPLEVBQUUsYUFBYSxDQUFDLE1BQU07cUJBQzdCO29CQUNELE1BQU0sRUFBRTt3QkFDUCxJQUFJLEVBQUUsUUFBUTt3QkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsZUFBZSxFQUNmLDJGQUEyRixDQUMzRjt3QkFDRCxPQUFPLEVBQUUsV0FBVyxDQUFDLE1BQU07d0JBQzNCLG1CQUFtQixFQUFFLGtCQUFrQjtxQkFDdkM7aUJBQ0Q7YUFDRDtTQUNEO1FBQ0QsY0FBYyxFQUFFO1lBQ2YsSUFBSSxFQUFFLDhCQUE4QjtTQUNwQztRQUNELE1BQU0sRUFBRTtZQUNQLElBQUksRUFBRSxzQkFBc0I7U0FDNUI7UUFDRCxJQUFJLEVBQUU7WUFDTCxJQUFJLEVBQUUsb0JBQW9CO1NBQzFCO1FBQ0QsV0FBVyxFQUFFO1lBQ1osSUFBSSxFQUFFLDJCQUEyQjtTQUNqQztRQUNELG1CQUFtQixFQUFFO1lBQ3BCLElBQUksRUFBRSxtQ0FBbUM7U0FDekM7UUFDRCxVQUFVLEVBQUU7WUFDWCxJQUFJLEVBQUUsMEJBQTBCO1NBQ2hDO1FBQ0Qsa0JBQWtCLEVBQUU7WUFDbkIsSUFBSSxFQUFFLGtDQUFrQztTQUN4QztRQUNELGVBQWUsRUFBRTtZQUNoQixJQUFJLEVBQUUsK0JBQStCO1NBQ3JDO1FBQ0QsdUJBQXVCLEVBQUU7WUFDeEIsSUFBSSxFQUFFLHVDQUF1QztTQUM3QztRQUNELGNBQWMsRUFBRTtZQUNmLElBQUksRUFBRSw4QkFBOEI7U0FDcEM7UUFDRCxTQUFTLEVBQUU7WUFDVixJQUFJLEVBQUUseUJBQXlCO1NBQy9CO1FBQ0QsV0FBVyxFQUFFO1lBQ1osSUFBSSxFQUFFLDJCQUEyQjtTQUNqQztRQUNELEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSw0QkFBNEI7WUFDbEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGNBQWMsRUFDZCw2REFBNkQsQ0FDN0Q7U0FDRDtRQUNELFlBQVksRUFBRTtZQUNiLElBQUksRUFBRSw0QkFBNEI7WUFDbEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHFCQUFxQixFQUNyQixxRUFBcUUsQ0FDckU7U0FDRDtRQUNELG1CQUFtQixFQUFFO1lBQ3BCLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDRCQUE0QixFQUM1QiwyRkFBMkYsQ0FDM0Y7U0FDRDtRQUNELHFCQUFxQixFQUFFO1lBQ3RCLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDhCQUE4QixFQUM5QixtSEFBbUgsQ0FDbkg7U0FDRDtLQUNEO0NBQ0QsQ0FBQTtBQUVELE1BQU0sVUFBVSw0QkFBNEI7SUFDM0MsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBNEIsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDOUYsY0FBYyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7QUFDaEQsQ0FBQyJ9
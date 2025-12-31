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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUljb25UaGVtZVNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL2ZpbGVJY29uVGhlbWVTY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLFVBQVUsSUFBSSxjQUFjLEdBRTVCLE1BQU0scUVBQXFFLENBQUE7QUFFNUUsT0FBTyxFQUNOLGVBQWUsRUFDZixjQUFjLEVBQ2QsYUFBYSxFQUNiLFdBQVcsRUFDWCxjQUFjLEVBQ2Qsa0JBQWtCLEdBQ2xCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsTUFBTSxRQUFRLEdBQUcsNkJBQTZCLENBQUE7QUFDOUMsTUFBTSxNQUFNLEdBQWdCO0lBQzNCLElBQUksRUFBRSxRQUFRO0lBQ2QsYUFBYSxFQUFFLElBQUk7SUFDbkIsbUJBQW1CLEVBQUUsSUFBSTtJQUN6QixXQUFXLEVBQUU7UUFDWixjQUFjLEVBQUU7WUFDZixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix1QkFBdUIsRUFDdkIsb0lBQW9JLENBQ3BJO1NBQ0Q7UUFDRCxNQUFNLEVBQUU7WUFDUCxJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixlQUFlLEVBQ2YscUdBQXFHLENBQ3JHO1NBQ0Q7UUFDRCxJQUFJLEVBQUU7WUFDTCxJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixhQUFhLEVBQ2IscUdBQXFHLENBQ3JHO1NBQ0Q7UUFDRCxVQUFVLEVBQUU7WUFD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
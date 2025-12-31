/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as JSONExtensions, } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { fontIdErrorMessage, fontIdRegex, fontStyleRegex, fontWeightRegex, iconsSchemaId, } from '../../../../platform/theme/common/iconRegistry.js';
const schemaId = 'vscode://schemas/product-icon-theme';
const schema = {
    type: 'object',
    allowComments: true,
    allowTrailingCommas: true,
    properties: {
        fonts: {
            type: 'array',
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
                                    description: nls.localize('schema.font-path', 'The font path, relative to the current product icon theme file.'),
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
                        anyOf: [
                            { enum: ['normal', 'bold', 'lighter', 'bolder'] },
                            { type: 'string', pattern: fontWeightRegex.source },
                        ],
                    },
                    style: {
                        type: 'string',
                        description: nls.localize('schema.font-style', 'The style of the font. See https://developer.mozilla.org/en-US/docs/Web/CSS/font-style for valid values.'),
                        anyOf: [
                            { enum: ['normal', 'italic', 'oblique'] },
                            { type: 'string', pattern: fontStyleRegex.source },
                        ],
                    },
                },
                required: ['id', 'src'],
            },
        },
        iconDefinitions: {
            description: nls.localize('schema.iconDefinitions', 'Association of icon name to a font character.'),
            $ref: iconsSchemaId,
        },
    },
};
export function registerProductIconThemeSchemas() {
    const schemaRegistry = Registry.as(JSONExtensions.JSONContribution);
    schemaRegistry.registerSchema(schemaId, schema);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdEljb25UaGVtZVNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL3Byb2R1Y3RJY29uVGhlbWVTY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLFVBQVUsSUFBSSxjQUFjLEdBRTVCLE1BQU0scUVBQXFFLENBQUE7QUFFNUUsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixXQUFXLEVBQ1gsY0FBYyxFQUNkLGVBQWUsRUFDZixhQUFhLEdBQ2IsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxNQUFNLFFBQVEsR0FBRyxxQ0FBcUMsQ0FBQTtBQUN0RCxNQUFNLE1BQU0sR0FBZ0I7SUFDM0IsSUFBSSxFQUFFLFFBQVE7SUFDZCxhQUFhLEVBQUUsSUFBSTtJQUNuQixtQkFBbUIsRUFBRSxJQUFJO0lBQ3pCLFVBQVUsRUFBRTtRQUNYLEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxPQUFPO1lBQ2IsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2dCQUNkLFVBQVUsRUFBRTtvQkFDWCxFQUFFLEVBQUU7d0JBQ0gsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLHFCQUFxQixDQUFDO3dCQUM3RCxPQUFPLEVBQUUsV0FBVyxDQUFDLE1BQU07d0JBQzNCLG1CQUFtQixFQUFFLGtCQUFrQjtxQkFDdkM7b0JBQ0QsR0FBRyxFQUFFO3dCQUNKLElBQUksRUFBRSxPQUFPO3dCQUNiLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSwyQkFBMkIsQ0FBQzt3QkFDcEUsS0FBSyxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFVBQVUsRUFBRTtnQ0FDWCxJQUFJLEVBQUU7b0NBQ0wsSUFBSSxFQUFFLFFBQVE7b0NBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGtCQUFrQixFQUNsQixpRUFBaUUsQ0FDakU7aUNBQ0Q7Z0NBQ0QsTUFBTSxFQUFFO29DQUNQLElBQUksRUFBRSxRQUFRO29DQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHlCQUF5QixDQUFDO29DQUMxRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxDQUFDO2lDQUMzRTs2QkFDRDs0QkFDRCxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO3lCQUM1QjtxQkFDRDtvQkFDRCxNQUFNLEVBQUU7d0JBQ1AsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG9CQUFvQixFQUNwQiw0R0FBNEcsQ0FDNUc7d0JBQ0QsS0FBSyxFQUFFOzRCQUNOLEVBQUUsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLEVBQUU7NEJBQ2pELEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsZUFBZSxDQUFDLE1BQU0sRUFBRTt5QkFDbkQ7cUJBQ0Q7b0JBQ0QsS0FBSyxFQUFFO3dCQUNOLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixtQkFBbUIsRUFDbkIsMEdBQTBHLENBQzFHO3dCQUNELEtBQUssRUFBRTs0QkFDTixFQUFFLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7NEJBQ3pDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRTt5QkFDbEQ7cUJBQ0Q7aUJBQ0Q7Z0JBQ0QsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQzthQUN2QjtTQUNEO1FBQ0QsZUFBZSxFQUFFO1lBQ2hCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix3QkFBd0IsRUFDeEIsK0NBQStDLENBQy9DO1lBQ0QsSUFBSSxFQUFFLGFBQWE7U0FDbkI7S0FDRDtDQUNELENBQUE7QUFFRCxNQUFNLFVBQVUsK0JBQStCO0lBQzlDLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQTRCLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQzlGLGNBQWMsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBQ2hELENBQUMifQ==
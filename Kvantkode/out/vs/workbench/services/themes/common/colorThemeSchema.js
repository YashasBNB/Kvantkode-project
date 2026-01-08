/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as JSONExtensions, } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { workbenchColorsSchemaId } from '../../../../platform/theme/common/colorRegistry.js';
import { tokenStylingSchemaId } from '../../../../platform/theme/common/tokenClassificationRegistry.js';
const textMateScopes = [
    'comment',
    'comment.block',
    'comment.block.documentation',
    'comment.line',
    'constant',
    'constant.character',
    'constant.character.escape',
    'constant.numeric',
    'constant.numeric.integer',
    'constant.numeric.float',
    'constant.numeric.hex',
    'constant.numeric.octal',
    'constant.other',
    'constant.regexp',
    'constant.rgb-value',
    'emphasis',
    'entity',
    'entity.name',
    'entity.name.class',
    'entity.name.function',
    'entity.name.method',
    'entity.name.section',
    'entity.name.selector',
    'entity.name.tag',
    'entity.name.type',
    'entity.other',
    'entity.other.attribute-name',
    'entity.other.inherited-class',
    'invalid',
    'invalid.deprecated',
    'invalid.illegal',
    'keyword',
    'keyword.control',
    'keyword.operator',
    'keyword.operator.new',
    'keyword.operator.assignment',
    'keyword.operator.arithmetic',
    'keyword.operator.logical',
    'keyword.other',
    'markup',
    'markup.bold',
    'markup.changed',
    'markup.deleted',
    'markup.heading',
    'markup.inline.raw',
    'markup.inserted',
    'markup.italic',
    'markup.list',
    'markup.list.numbered',
    'markup.list.unnumbered',
    'markup.other',
    'markup.quote',
    'markup.raw',
    'markup.underline',
    'markup.underline.link',
    'meta',
    'meta.block',
    'meta.cast',
    'meta.class',
    'meta.function',
    'meta.function-call',
    'meta.preprocessor',
    'meta.return-type',
    'meta.selector',
    'meta.tag',
    'meta.type.annotation',
    'meta.type',
    'punctuation.definition.string.begin',
    'punctuation.definition.string.end',
    'punctuation.separator',
    'punctuation.separator.continuation',
    'punctuation.terminator',
    'storage',
    'storage.modifier',
    'storage.type',
    'string',
    'string.interpolated',
    'string.other',
    'string.quoted',
    'string.quoted.double',
    'string.quoted.other',
    'string.quoted.single',
    'string.quoted.triple',
    'string.regexp',
    'string.unquoted',
    'strong',
    'support',
    'support.class',
    'support.constant',
    'support.function',
    'support.other',
    'support.type',
    'support.type.property-name',
    'support.variable',
    'variable',
    'variable.language',
    'variable.name',
    'variable.other',
    'variable.other.readwrite',
    'variable.parameter',
];
export const textmateColorsSchemaId = 'vscode://schemas/textmate-colors';
export const textmateColorGroupSchemaId = `${textmateColorsSchemaId}#/definitions/colorGroup`;
const textmateColorSchema = {
    type: 'array',
    definitions: {
        colorGroup: {
            default: '#FF0000',
            anyOf: [
                {
                    type: 'string',
                    format: 'color-hex',
                },
                {
                    $ref: '#/definitions/settings',
                },
            ],
        },
        settings: {
            type: 'object',
            description: nls.localize('schema.token.settings', 'Colors and styles for the token.'),
            properties: {
                foreground: {
                    type: 'string',
                    description: nls.localize('schema.token.foreground', 'Foreground color for the token.'),
                    format: 'color-hex',
                    default: '#ff0000',
                },
                background: {
                    type: 'string',
                    deprecationMessage: nls.localize('schema.token.background.warning', 'Token background colors are currently not supported.'),
                },
                fontStyle: {
                    type: 'string',
                    description: nls.localize('schema.token.fontStyle', "Font style of the rule: 'italic', 'bold', 'underline', 'strikethrough' or a combination. The empty string unsets inherited settings."),
                    pattern: '^(\\s*\\b(italic|bold|underline|strikethrough))*\\s*$',
                    patternErrorMessage: nls.localize('schema.fontStyle.error', "Font style must be 'italic', 'bold', 'underline', 'strikethrough' or a combination or the empty string."),
                    defaultSnippets: [
                        {
                            label: nls.localize('schema.token.fontStyle.none', 'None (clear inherited style)'),
                            bodyText: '""',
                        },
                        { body: 'italic' },
                        { body: 'bold' },
                        { body: 'underline' },
                        { body: 'strikethrough' },
                        { body: 'italic bold' },
                        { body: 'italic underline' },
                        { body: 'italic strikethrough' },
                        { body: 'bold underline' },
                        { body: 'bold strikethrough' },
                        { body: 'underline strikethrough' },
                        { body: 'italic bold underline' },
                        { body: 'italic bold strikethrough' },
                        { body: 'italic underline strikethrough' },
                        { body: 'bold underline strikethrough' },
                        { body: 'italic bold underline strikethrough' },
                    ],
                },
            },
            additionalProperties: false,
            defaultSnippets: [{ body: { foreground: '${1:#FF0000}', fontStyle: '${2:bold}' } }],
        },
    },
    items: {
        type: 'object',
        defaultSnippets: [
            { body: { scope: '${1:keyword.operator}', settings: { foreground: '${2:#FF0000}' } } },
        ],
        properties: {
            name: {
                type: 'string',
                description: nls.localize('schema.properties.name', 'Description of the rule.'),
            },
            scope: {
                description: nls.localize('schema.properties.scope', 'Scope selector against which this rule matches.'),
                anyOf: [
                    {
                        enum: textMateScopes,
                    },
                    {
                        type: 'string',
                    },
                    {
                        type: 'array',
                        items: {
                            enum: textMateScopes,
                        },
                    },
                    {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                ],
            },
            settings: {
                $ref: '#/definitions/settings',
            },
        },
        required: ['settings'],
        additionalProperties: false,
    },
};
export const colorThemeSchemaId = 'vscode://schemas/color-theme';
const colorThemeSchema = {
    type: 'object',
    allowComments: true,
    allowTrailingCommas: true,
    properties: {
        colors: {
            description: nls.localize('schema.workbenchColors', 'Colors in the workbench'),
            $ref: workbenchColorsSchemaId,
            additionalProperties: false,
        },
        tokenColors: {
            anyOf: [
                {
                    type: 'string',
                    description: nls.localize('schema.tokenColors.path', 'Path to a tmTheme file (relative to the current file).'),
                },
                {
                    description: nls.localize('schema.colors', 'Colors for syntax highlighting'),
                    $ref: textmateColorsSchemaId,
                },
            ],
        },
        semanticHighlighting: {
            type: 'boolean',
            description: nls.localize('schema.supportsSemanticHighlighting', 'Whether semantic highlighting should be enabled for this theme.'),
        },
        semanticTokenColors: {
            type: 'object',
            description: nls.localize('schema.semanticTokenColors', 'Colors for semantic tokens'),
            $ref: tokenStylingSchemaId,
        },
    },
};
export function registerColorThemeSchemas() {
    const schemaRegistry = Registry.as(JSONExtensions.JSONContribution);
    schemaRegistry.registerSchema(colorThemeSchemaId, colorThemeSchema);
    schemaRegistry.registerSchema(textmateColorsSchemaId, textmateColorSchema);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JUaGVtZVNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vY29sb3JUaGVtZVNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxJQUFJLGNBQWMsR0FFNUIsTUFBTSxxRUFBcUUsQ0FBQTtBQUc1RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUV2RyxNQUFNLGNBQWMsR0FBRztJQUN0QixTQUFTO0lBQ1QsZUFBZTtJQUNmLDZCQUE2QjtJQUM3QixjQUFjO0lBQ2QsVUFBVTtJQUNWLG9CQUFvQjtJQUNwQiwyQkFBMkI7SUFDM0Isa0JBQWtCO0lBQ2xCLDBCQUEwQjtJQUMxQix3QkFBd0I7SUFDeEIsc0JBQXNCO0lBQ3RCLHdCQUF3QjtJQUN4QixnQkFBZ0I7SUFDaEIsaUJBQWlCO0lBQ2pCLG9CQUFvQjtJQUNwQixVQUFVO0lBQ1YsUUFBUTtJQUNSLGFBQWE7SUFDYixtQkFBbUI7SUFDbkIsc0JBQXNCO0lBQ3RCLG9CQUFvQjtJQUNwQixxQkFBcUI7SUFDckIsc0JBQXNCO0lBQ3RCLGlCQUFpQjtJQUNqQixrQkFBa0I7SUFDbEIsY0FBYztJQUNkLDZCQUE2QjtJQUM3Qiw4QkFBOEI7SUFDOUIsU0FBUztJQUNULG9CQUFvQjtJQUNwQixpQkFBaUI7SUFDakIsU0FBUztJQUNULGlCQUFpQjtJQUNqQixrQkFBa0I7SUFDbEIsc0JBQXNCO0lBQ3RCLDZCQUE2QjtJ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
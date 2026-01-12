/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { EXTENSION_IDENTIFIER_PATTERN } from '../../../../platform/extensionManagement/common/extensionManagement.js';
export const ExtensionsConfigurationSchemaId = 'vscode://schemas/extensions';
export const ExtensionsConfigurationSchema = {
    id: ExtensionsConfigurationSchemaId,
    allowComments: true,
    allowTrailingCommas: true,
    type: 'object',
    title: localize('app.extensions.json.title', 'Extensions'),
    additionalProperties: false,
    properties: {
        recommendations: {
            type: 'array',
            description: localize('app.extensions.json.recommendations', "List of extensions which should be recommended for users of this workspace. The identifier of an extension is always '${publisher}.${name}'. For example: 'vscode.csharp'."),
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN,
                errorMessage: localize('app.extension.identifier.errorMessage', "Expected format '${publisher}.${name}'. Example: 'vscode.csharp'."),
            },
        },
        unwantedRecommendations: {
            type: 'array',
            description: localize('app.extensions.json.unwantedRecommendations', "List of extensions recommended by VS Code that should not be recommended for users of this workspace. The identifier of an extension is always '${publisher}.${name}'. For example: 'vscode.csharp'."),
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN,
                errorMessage: localize('app.extension.identifier.errorMessage', "Expected format '${publisher}.${name}'. Example: 'vscode.csharp'."),
            },
        },
    },
};
export const ExtensionsConfigurationInitialContent = [
    '{',
    '\t// See https://go.microsoft.com/fwlink/?LinkId=827846 to learn about workspace recommendations.',
    '\t// Extension identifier format: ${publisher}.${name}. Example: vscode.csharp',
    '',
    '\t// List of extensions which should be recommended for users of this workspace.',
    '\t"recommendations": [',
    '\t\t',
    '\t],',
    '\t// List of extensions recommended by VS Code that should not be recommended for users of this workspace.',
    '\t"unwantedRecommendations": [',
    '\t\t',
    '\t]',
    '}',
].join('\n');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0ZpbGVUZW1wbGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uc0ZpbGVUZW1wbGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sd0VBQXdFLENBQUE7QUFFckgsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsNkJBQTZCLENBQUE7QUFDNUUsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQWdCO0lBQ3pELEVBQUUsRUFBRSwrQkFBK0I7SUFDbkMsYUFBYSxFQUFFLElBQUk7SUFDbkIsbUJBQW1CLEVBQUUsSUFBSTtJQUN6QixJQUFJLEVBQUUsUUFBUTtJQUNkLEtBQUssRUFBRSxRQUFRLENBQUMsMkJBQTJCLEVBQUUsWUFBWSxDQUFDO0lBQzFELG9CQUFvQixFQUFFLEtBQUs7SUFDM0IsVUFBVSxFQUFFO1FBQ1gsZUFBZSxFQUFFO1lBQ2hCLElBQUksRUFBRSxPQUFPO1lBQ2IsV0FBVyxFQUFFLFFBQVEsQ0FDcEIscUNBQXFDLEVBQ3JDLDRLQUE0SyxDQUM1SztZQUNELEtBQUssRUFBRTtnQkFDTixJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsNEJBQTRCO2dCQUNyQyxZQUFZLEVBQUUsUUFBUSxDQUNyQix1Q0FBdUMsRUFDdkMsbUVBQW1FLENBQ25FO2FBQ0Q7U0FDRDtRQUNELHVCQUF1QixFQUFFO1lBQ3hCLElBQUksRUFBRSxPQUFPO1lBQ2IsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsNkNBQTZDLEVBQzdDLHNNQUFzTSxDQUN0TTtZQUNELEtBQUssRUFBRTtnQkFDTixJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsNEJBQTRCO2dCQUNyQyxZQUFZLEVBQUUsUUFBUSxDQUNyQix1Q0FBdUMsRUFDdkMsbUVBQW1FLENBQ25FO2FBQ0Q7U0FDRDtLQUNEO0NBQ0QsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLHFDQUFxQyxHQUFXO0lBQzVELEdBQUc7SUFDSCxtR0FBbUc7SUFDbkcsZ0ZBQWdGO0lBQ2hGLEVBQUU7SUFDRixrRkFBa0Y7SUFDbEYsd0JBQXdCO0lBQ3hCLE1BQU07SUFDTixNQUFNO0lBQ04sNEdBQTRHO0lBQzVHLGdDQUFnQztJQUNoQyxNQUFNO0lBQ04sS0FBSztJQUNMLEdBQUc7Q0FDSCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQSJ9
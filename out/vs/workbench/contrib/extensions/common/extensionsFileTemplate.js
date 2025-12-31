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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0ZpbGVUZW1wbGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbnNGaWxlVGVtcGxhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBRXJILE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLDZCQUE2QixDQUFBO0FBQzVFLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFnQjtJQUN6RCxFQUFFLEVBQUUsK0JBQStCO0lBQ25DLGFBQWEsRUFBRSxJQUFJO0lBQ25CLG1CQUFtQixFQUFFLElBQUk7SUFDekIsSUFBSSxFQUFFLFFBQVE7SUFDZCxLQUFLLEVBQUUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLFlBQVksQ0FBQztJQUMxRCxvQkFBb0IsRUFBRSxLQUFLO0lBQzNCLFVBQVUsRUFBRTtRQUNYLGVBQWUsRUFBRTtZQUNoQixJQUFJLEVBQUUsT0FBTztZQUNiLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHFDQUFxQyxFQUNyQyw0S0FBNEssQ0FDNUs7WUFDRCxLQUFLLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLDRCQUE0QjtnQkFDckMsWUFBWSxFQUFFLFFBQVEsQ0FDckIsdUNBQXVDLEVBQ3ZDLG1FQUFtRSxDQUNuRTthQUNEO1NBQ0Q7UUFDRCx1QkFBdUIsRUFBRTtZQUN4QixJQUFJLEVBQUUsT0FBTztZQUNiLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDZDQUE2QyxFQUM3QyxzTUFBc00sQ0FDdE07WUFDRCxLQUFLLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLDRCQUE0QjtnQkFDckMsWUFBWSxFQUFFLFFBQVEsQ0FDckIsdUNBQXVDLEVBQ3ZDLG1FQUFtRSxDQUNuRTthQUNEO1NBQ0Q7S0FDRDtDQUNELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxxQ0FBcUMsR0FBVztJQUM1RCxHQUFHO0lBQ0gsbUdBQW1HO0lBQ25HLGdGQUFnRjtJQUNoRixFQUFFO0lBQ0Ysa0ZBQWtGO0lBQ2xGLHdCQUF3QjtJQUN4QixNQUFNO0lBQ04sTUFBTTtJQUNOLDRHQUE0RztJQUM1RyxnQ0FBZ0M7SUFDaEMsTUFBTTtJQUNOLEtBQUs7SUFDTCxHQUFHO0NBQ0gsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUEifQ==
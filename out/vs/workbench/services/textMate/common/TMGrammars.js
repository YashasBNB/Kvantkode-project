/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { languagesExtPoint } from '../../language/common/languageService.js';
export const grammarsExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'grammars',
    deps: [languagesExtPoint],
    jsonSchema: {
        description: nls.localize('vscode.extension.contributes.grammars', 'Contributes textmate tokenizers.'),
        type: 'array',
        defaultSnippets: [
            {
                body: [
                    {
                        language: '${1:id}',
                        scopeName: 'source.${2:id}',
                        path: './syntaxes/${3:id}.tmLanguage.',
                    },
                ],
            },
        ],
        items: {
            type: 'object',
            defaultSnippets: [
                {
                    body: {
                        language: '${1:id}',
                        scopeName: 'source.${2:id}',
                        path: './syntaxes/${3:id}.tmLanguage.',
                    },
                },
            ],
            properties: {
                language: {
                    description: nls.localize('vscode.extension.contributes.grammars.language', 'Language identifier for which this syntax is contributed to.'),
                    type: 'string',
                },
                scopeName: {
                    description: nls.localize('vscode.extension.contributes.grammars.scopeName', 'Textmate scope name used by the tmLanguage file.'),
                    type: 'string',
                },
                path: {
                    description: nls.localize('vscode.extension.contributes.grammars.path', "Path of the tmLanguage file. The path is relative to the extension folder and typically starts with './syntaxes/'."),
                    type: 'string',
                },
                embeddedLanguages: {
                    description: nls.localize('vscode.extension.contributes.grammars.embeddedLanguages', 'A map of scope name to language id if this grammar contains embedded languages.'),
                    type: 'object',
                },
                tokenTypes: {
                    description: nls.localize('vscode.extension.contributes.grammars.tokenTypes', 'A map of scope name to token types.'),
                    type: 'object',
                    additionalProperties: {
                        enum: ['string', 'comment', 'other'],
                    },
                },
                injectTo: {
                    description: nls.localize('vscode.extension.contributes.grammars.injectTo', 'List of language scope names to which this grammar is injected to.'),
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                balancedBracketScopes: {
                    description: nls.localize('vscode.extension.contributes.grammars.balancedBracketScopes', 'Defines which scope names contain balanced brackets.'),
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    default: ['*'],
                },
                unbalancedBracketScopes: {
                    description: nls.localize('vscode.extension.contributes.grammars.unbalancedBracketScopes', 'Defines which scope names do not contain balanced brackets.'),
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    default: [],
                },
            },
            required: ['scopeName', 'path'],
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVE1HcmFtbWFycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9jb21tb24vVE1HcmFtbWFycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxrQkFBa0IsRUFBbUIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQXFCNUUsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQzVCLGtCQUFrQixDQUFDLHNCQUFzQixDQUE0QjtJQUNwRSxjQUFjLEVBQUUsVUFBVTtJQUMxQixJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztJQUN6QixVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsdUNBQXVDLEVBQ3ZDLGtDQUFrQyxDQUNsQztRQUNELElBQUksRUFBRSxPQUFPO1FBQ2IsZUFBZSxFQUFFO1lBQ2hCO2dCQUNDLElBQUksRUFBRTtvQkFDTDt3QkFDQyxRQUFRLEVBQUUsU0FBUzt3QkFDbkIsU0FBUyxFQUFFLGdCQUFnQjt3QkFDM0IsSUFBSSxFQUFFLGdDQUFnQztxQkFDdEM7aUJBQ0Q7YUFDRDtTQUNEO1FBQ0QsS0FBSyxFQUFFO1lBQ04sSUFBSSxFQUFFLFFBQVE7WUFDZCxlQUFlLEVBQUU7Z0JBQ2hCO29CQUNDLElBQUksRUFBRTt3QkFDTCxRQUFRLEVBQUUsU0FBUzt3QkFDbkIsU0FBUyxFQUFFLGdCQUFnQjt3QkFDM0IsSUFBSSxFQUFFLGdDQUFnQztxQkFDdEM7aUJBQ0Q7YUFDRDtZQUNELFVBQVUsRUFBRTtnQkFDWCxRQUFRLEVBQUU7b0JBQ1QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGdEQUFnRCxFQUNoRCw4REFBOEQsQ0FDOUQ7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0QsU0FBUyxFQUFFO29CQUNWLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixpREFBaUQsRUFDakQsa0RBQWtELENBQ2xEO29CQUNELElBQUksRUFBRSxRQUFRO2lCQUNkO2dCQUNELElBQUksRUFBRTtvQkFDTCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsNENBQTRDLEVBQzVDLG9IQUFvSCxDQUNwSDtvQkFDRCxJQUFJLEVBQUUsUUFBUTtpQkFDZDtnQkFDRCxpQkFBaUIsRUFBRTtvQkFDbEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHlEQUF5RCxFQUN6RCxpRkFBaUYsQ0FDakY7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0QsVUFBVSxFQUFFO29CQUNYLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixrREFBa0QsRUFDbEQscUNBQXFDLENBQ3JDO29CQUNELElBQUksRUFBRSxRQUFRO29CQUNkLG9CQUFvQixFQUFFO3dCQUNyQixJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQztxQkFDcEM7aUJBQ0Q7Z0JBQ0QsUUFBUSxFQUFFO29CQUNULFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixnREFBZ0QsRUFDaEQsb0VBQW9FLENBQ3BFO29CQUNELElBQUksRUFBRSxPQUFPO29CQUNiLEtBQUssRUFBRTt3QkFDTixJQUFJLEVBQUUsUUFBUTtxQkFDZDtpQkFDRDtnQkFDRCxxQkFBcUIsRUFBRTtvQkFDdEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDZEQUE2RCxFQUM3RCxzREFBc0QsQ0FDdEQ7b0JBQ0QsSUFBSSxFQUFFLE9BQU87b0JBQ2IsS0FBSyxFQUFFO3dCQUNOLElBQUksRUFBRSxRQUFRO3FCQUNkO29CQUNELE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQztpQkFDZDtnQkFDRCx1QkFBdUIsRUFBRTtvQkFDeEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLCtEQUErRCxFQUMvRCw2REFBNkQsQ0FDN0Q7b0JBQ0QsSUFBSSxFQUFFLE9BQU87b0JBQ2IsS0FBSyxFQUFFO3dCQUNOLElBQUksRUFBRSxRQUFRO3FCQUNkO29CQUNELE9BQU8sRUFBRSxFQUFFO2lCQUNYO2FBQ0Q7WUFDRCxRQUFRLEVBQUUsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDO1NBQy9CO0tBQ0Q7Q0FDRCxDQUFDLENBQUEifQ==
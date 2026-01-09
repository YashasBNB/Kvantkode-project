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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVE1HcmFtbWFycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2NvbW1vbi9UTUdyYW1tYXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGtCQUFrQixFQUFtQixNQUFNLCtDQUErQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBcUI1RSxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FDNUIsa0JBQWtCLENBQUMsc0JBQXNCLENBQTRCO0lBQ3BFLGNBQWMsRUFBRSxVQUFVO0lBQzFCLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDO0lBQ3pCLFVBQVUsRUFBRTtRQUNYLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix1Q0FBdUMsRUFDdkMsa0NBQWtDLENBQ2xDO1FBQ0QsSUFBSSxFQUFFLE9BQU87UUFDYixlQUFlLEVBQUU7WUFDaEI7Z0JBQ0MsSUFBSSxFQUFFO29CQUNMO3dCQUNDLFFBQVEsRUFBRSxTQUFTO3dCQUNuQixTQUFTLEVBQUUsZ0JBQWdCO3dCQUMzQixJQUFJLEVBQUUsZ0NBQWdDO3FCQUN0QztpQkFDRDthQUNEO1NBQ0Q7UUFDRCxLQUFLLEVBQUU7WUFDTixJQUFJLEVBQUUsUUFBUTtZQUNkLGVBQWUsRUFBRTtnQkFDaEI7b0JBQ0MsSUFBSSxFQUFFO3dCQUNMLFFBQVEsRUFBRSxTQUFTO3dCQUNuQixTQUFTLEVBQUUsZ0JBQWdCO3dCQUMzQixJQUFJLEVBQUUsZ0NBQWdDO3FCQUN0QztpQkFDRDthQUNEO1lBQ0QsVUFBVSxFQUFFO2dCQUNYLFFBQVEsRUFBRTtvQkFDVCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsZ0RBQWdELEVBQ2hELDhEQUE4RCxDQUM5RDtvQkFDRCxJQUFJLEVBQUUsUUFBUTtpQkFDZDtnQkFDRCxTQUFTLEVBQUU7b0JBQ1YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGlEQUFpRCxFQUNqRCxrREFBa0QsQ0FDbEQ7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0QsSUFBSSxFQUFFO29CQUNMLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qiw0Q0FBNEMsRUFDNUMsb0hBQW9ILENBQ3BIO29CQUNELElBQUksRUFBRSxRQUFRO2lCQUNkO2dCQUNELGlCQUFpQixFQUFFO29CQUNsQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIseURBQXlELEVBQ3pELGlGQUFpRixDQUNqRjtvQkFDRCxJQUFJLEVBQUUsUUFBUTtpQkFDZDtnQkFDRCxVQUFVLEVBQUU7b0JBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGtEQUFrRCxFQUNsRCxxQ0FBcUMsQ0FDckM7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7b0JBQ2Qsb0JBQW9CLEVBQUU7d0JBQ3JCLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDO3FCQUNwQztpQkFDRDtnQkFDRCxRQUFRLEVBQUU7b0JBQ1QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGdEQUFnRCxFQUNoRCxvRUFBb0UsQ0FDcEU7b0JBQ0QsSUFBSSxFQUFFLE9BQU87b0JBQ2IsS0FBSyxFQUFFO3dCQUNOLElBQUksRUFBRSxRQUFRO3FCQUNkO2lCQUNEO2dCQUNELHFCQUFxQixFQUFFO29CQUN0QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsNkRBQTZELEVBQzdELHNEQUFzRCxDQUN0RDtvQkFDRCxJQUFJLEVBQUUsT0FBTztvQkFDYixLQUFLLEVBQUU7d0JBQ04sSUFBSSxFQUFFLFFBQVE7cUJBQ2Q7b0JBQ0QsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2lCQUNkO2dCQUNELHVCQUF1QixFQUFFO29CQUN4QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsK0RBQStELEVBQy9ELDZEQUE2RCxDQUM3RDtvQkFDRCxJQUFJLEVBQUUsT0FBTztvQkFDYixLQUFLLEVBQUU7d0JBQ04sSUFBSSxFQUFFLFFBQVE7cUJBQ2Q7b0JBQ0QsT0FBTyxFQUFFLEVBQUU7aUJBQ1g7YUFDRDtZQUNELFFBQVEsRUFBRSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUM7U0FDL0I7S0FDRDtDQUNELENBQUMsQ0FBQSJ9
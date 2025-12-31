/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import * as JSONContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { ConfigureSnippetsAction } from './commands/configureSnippets.js';
import { ApplyFileSnippetAction } from './commands/fileTemplateSnippets.js';
import { InsertSnippetAction } from './commands/insertSnippet.js';
import { SurroundWithSnippetEditorAction } from './commands/surroundWithSnippet.js';
import { SnippetCodeActions } from './snippetCodeActionProvider.js';
import { ISnippetsService } from './snippets.js';
import { SnippetsService } from './snippetsService.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import './tabCompletion.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
// service
registerSingleton(ISnippetsService, SnippetsService, 1 /* InstantiationType.Delayed */);
// actions
registerAction2(InsertSnippetAction);
CommandsRegistry.registerCommandAlias('editor.action.showSnippets', 'editor.action.insertSnippet');
registerAction2(SurroundWithSnippetEditorAction);
registerAction2(ApplyFileSnippetAction);
registerAction2(ConfigureSnippetsAction);
// workbench contribs
const workbenchContribRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchContribRegistry.registerWorkbenchContribution(SnippetCodeActions, 3 /* LifecyclePhase.Restored */);
// config
Registry.as(Extensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.snippets.codeActions.enabled': {
            description: nls.localize('editor.snippets.codeActions.enabled', 'Controls if surround-with-snippets or file template snippets show as Code Actions.'),
            type: 'boolean',
            default: true,
        },
    },
});
// schema
const languageScopeSchemaId = 'vscode://schemas/snippets';
const snippetSchemaProperties = {
    prefix: {
        description: nls.localize('snippetSchema.json.prefix', 'The prefix to use when selecting the snippet in intellisense'),
        type: ['string', 'array'],
    },
    isFileTemplate: {
        description: nls.localize('snippetSchema.json.isFileTemplate', 'The snippet is meant to populate or replace a whole file'),
        type: 'boolean',
    },
    body: {
        markdownDescription: nls.localize('snippetSchema.json.body', 'The snippet content. Use `$1`, `${1:defaultText}` to define cursor positions, use `$0` for the final cursor position. Insert variable values with `${varName}` and `${varName:defaultText}`, e.g. `This is file: $TM_FILENAME`.'),
        type: ['string', 'array'],
        items: {
            type: 'string',
        },
    },
    description: {
        description: nls.localize('snippetSchema.json.description', 'The snippet description.'),
        type: ['string', 'array'],
    },
};
const languageScopeSchema = {
    id: languageScopeSchemaId,
    allowComments: true,
    allowTrailingCommas: true,
    defaultSnippets: [
        {
            label: nls.localize('snippetSchema.json.default', 'Empty snippet'),
            body: {
                '${1:snippetName}': {
                    prefix: '${2:prefix}',
                    body: '${3:snippet}',
                    description: '${4:description}',
                },
            },
        },
    ],
    type: 'object',
    description: nls.localize('snippetSchema.json', 'User snippet configuration'),
    additionalProperties: {
        type: 'object',
        required: ['body'],
        properties: snippetSchemaProperties,
        additionalProperties: false,
    },
};
const globalSchemaId = 'vscode://schemas/global-snippets';
const globalSchema = {
    id: globalSchemaId,
    allowComments: true,
    allowTrailingCommas: true,
    defaultSnippets: [
        {
            label: nls.localize('snippetSchema.json.default', 'Empty snippet'),
            body: {
                '${1:snippetName}': {
                    scope: '${2:scope}',
                    prefix: '${3:prefix}',
                    body: '${4:snippet}',
                    description: '${5:description}',
                },
            },
        },
    ],
    type: 'object',
    description: nls.localize('snippetSchema.json', 'User snippet configuration'),
    additionalProperties: {
        type: 'object',
        required: ['body'],
        properties: {
            ...snippetSchemaProperties,
            scope: {
                description: nls.localize('snippetSchema.json.scope', "A list of language names to which this snippet applies, e.g. 'typescript,javascript'."),
                type: 'string',
            },
        },
        additionalProperties: false,
    },
};
const reg = Registry.as(JSONContributionRegistry.Extensions.JSONContribution);
reg.registerSchema(languageScopeSchemaId, languageScopeSchema);
reg.registerSchema(globalSchemaId, globalSchema);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9zbmlwcGV0cy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sS0FBSyx3QkFBd0IsTUFBTSxxRUFBcUUsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLFVBQVUsSUFBSSxtQkFBbUIsR0FFakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDaEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRXRELE9BQU8sRUFDTixVQUFVLEdBRVYsTUFBTSxvRUFBb0UsQ0FBQTtBQUUzRSxPQUFPLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRTNHLFVBQVU7QUFDVixpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLG9DQUE0QixDQUFBO0FBRS9FLFVBQVU7QUFDVixlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtBQUNwQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyw0QkFBNEIsRUFBRSw2QkFBNkIsQ0FBQyxDQUFBO0FBQ2xHLGVBQWUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO0FBQ2hELGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0FBQ3ZDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO0FBRXhDLHFCQUFxQjtBQUNyQixNQUFNLHdCQUF3QixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQzNDLG1CQUFtQixDQUFDLFNBQVMsQ0FDN0IsQ0FBQTtBQUNELHdCQUF3QixDQUFDLDZCQUE2QixDQUFDLGtCQUFrQixrQ0FBMEIsQ0FBQTtBQUVuRyxTQUFTO0FBQ1QsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBQ25GLEdBQUcsMkJBQTJCO0lBQzlCLFVBQVUsRUFBRTtRQUNYLHFDQUFxQyxFQUFFO1lBQ3RDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixxQ0FBcUMsRUFDckMsb0ZBQW9GLENBQ3BGO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtTQUNiO0tBQ0Q7Q0FDRCxDQUFDLENBQUE7QUFFRixTQUFTO0FBQ1QsTUFBTSxxQkFBcUIsR0FBRywyQkFBMkIsQ0FBQTtBQUV6RCxNQUFNLHVCQUF1QixHQUFtQjtJQUMvQyxNQUFNLEVBQUU7UUFDUCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMkJBQTJCLEVBQzNCLDhEQUE4RCxDQUM5RDtRQUNELElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7S0FDekI7SUFDRCxjQUFjLEVBQUU7UUFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsbUNBQW1DLEVBQ25DLDBEQUEwRCxDQUMxRDtRQUNELElBQUksRUFBRSxTQUFTO0tBQ2Y7SUFDRCxJQUFJLEVBQUU7UUFDTCxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyx5QkFBeUIsRUFDekIsaU9BQWlPLENBQ2pPO1FBQ0QsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQztRQUN6QixLQUFLLEVBQUU7WUFDTixJQUFJLEVBQUUsUUFBUTtTQUNkO0tBQ0Q7SUFDRCxXQUFXLEVBQUU7UUFDWixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSwwQkFBMEIsQ0FBQztRQUN2RixJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO0tBQ3pCO0NBQ0QsQ0FBQTtBQUVELE1BQU0sbUJBQW1CLEdBQWdCO0lBQ3hDLEVBQUUsRUFBRSxxQkFBcUI7SUFDekIsYUFBYSxFQUFFLElBQUk7SUFDbkIsbUJBQW1CLEVBQUUsSUFBSTtJQUN6QixlQUFlLEVBQUU7UUFDaEI7WUFDQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxlQUFlLENBQUM7WUFDbEUsSUFBSSxFQUFFO2dCQUNMLGtCQUFrQixFQUFFO29CQUNuQixNQUFNLEVBQUUsYUFBYTtvQkFDckIsSUFBSSxFQUFFLGNBQWM7b0JBQ3BCLFdBQVcsRUFBRSxrQkFBa0I7aUJBQy9CO2FBQ0Q7U0FDRDtLQUNEO0lBQ0QsSUFBSSxFQUFFLFFBQVE7SUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSw0QkFBNEIsQ0FBQztJQUM3RSxvQkFBb0IsRUFBRTtRQUNyQixJQUFJLEVBQUUsUUFBUTtRQUNkLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNsQixVQUFVLEVBQUUsdUJBQXVCO1FBQ25DLG9CQUFvQixFQUFFLEtBQUs7S0FDM0I7Q0FDRCxDQUFBO0FBRUQsTUFBTSxjQUFjLEdBQUcsa0NBQWtDLENBQUE7QUFDekQsTUFBTSxZQUFZLEdBQWdCO0lBQ2pDLEVBQUUsRUFBRSxjQUFjO0lBQ2xCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLG1CQUFtQixFQUFFLElBQUk7SUFDekIsZUFBZSxFQUFFO1FBQ2hCO1lBQ0MsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsZUFBZSxDQUFDO1lBQ2xFLElBQUksRUFBRTtnQkFDTCxrQkFBa0IsRUFBRTtvQkFDbkIsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLE1BQU0sRUFBRSxhQUFhO29CQUNyQixJQUFJLEVBQUUsY0FBYztvQkFDcEIsV0FBVyxFQUFFLGtCQUFrQjtpQkFDL0I7YUFDRDtTQUNEO0tBQ0Q7SUFDRCxJQUFJLEVBQUUsUUFBUTtJQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDRCQUE0QixDQUFDO0lBQzdFLG9CQUFvQixFQUFFO1FBQ3JCLElBQUksRUFBRSxRQUFRO1FBQ2QsUUFBUSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ2xCLFVBQVUsRUFBRTtZQUNYLEdBQUcsdUJBQXVCO1lBQzFCLEtBQUssRUFBRTtnQkFDTixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMEJBQTBCLEVBQzFCLHVGQUF1RixDQUN2RjtnQkFDRCxJQUFJLEVBQUUsUUFBUTthQUNkO1NBQ0Q7UUFDRCxvQkFBb0IsRUFBRSxLQUFLO0tBQzNCO0NBQ0QsQ0FBQTtBQUVELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQ3RCLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FDcEQsQ0FBQTtBQUNELEdBQUcsQ0FBQyxjQUFjLENBQUMscUJBQXFCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtBQUM5RCxHQUFHLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQSJ9
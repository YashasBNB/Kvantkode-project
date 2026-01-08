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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy9icm93c2VyL3NuaXBwZXRzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxLQUFLLHdCQUF3QixNQUFNLHFFQUFxRSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixHQUVqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFdEQsT0FBTyxFQUNOLFVBQVUsR0FFVixNQUFNLG9FQUFvRSxDQUFBO0FBRTNFLE9B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
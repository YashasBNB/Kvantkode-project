/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter, Event } from '../../../../base/common/event.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { codeActionCommandId, refactorCommandId, sourceActionCommandId, } from '../../../../editor/contrib/codeAction/browser/codeAction.js';
import { CodeActionKind } from '../../../../editor/contrib/codeAction/common/types.js';
import * as nls from '../../../../nls.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
const createCodeActionsAutoSave = (description) => {
    return {
        type: 'string',
        enum: ['always', 'explicit', 'never', true, false],
        enumDescriptions: [
            nls.localize('alwaysSave', 'Triggers Code Actions on explicit saves and auto saves triggered by window or focus changes.'),
            nls.localize('explicitSave', 'Triggers Code Actions only when explicitly saved'),
            nls.localize('neverSave', 'Never triggers Code Actions on save'),
            nls.localize('explicitSaveBoolean', 'Triggers Code Actions only when explicitly saved. This value will be deprecated in favor of "explicit".'),
            nls.localize('neverSaveBoolean', 'Never triggers Code Actions on save. This value will be deprecated in favor of "never".'),
        ],
        default: 'explicit',
        description: description,
    };
};
const createNotebookCodeActionsAutoSave = (description) => {
    return {
        type: ['string', 'boolean'],
        enum: ['explicit', 'never', true, false],
        enumDescriptions: [
            nls.localize('explicit', 'Triggers Code Actions only when explicitly saved.'),
            nls.localize('never', 'Never triggers Code Actions on save.'),
            nls.localize('explicitBoolean', 'Triggers Code Actions only when explicitly saved. This value will be deprecated in favor of "explicit".'),
            nls.localize('neverBoolean', 'Triggers Code Actions only when explicitly saved. This value will be deprecated in favor of "never".'),
        ],
        default: 'explicit',
        description: description,
    };
};
const codeActionsOnSaveSchema = {
    oneOf: [
        {
            type: 'object',
            additionalProperties: {
                type: 'string',
            },
        },
        {
            type: 'array',
            items: { type: 'string' },
        },
    ],
    markdownDescription: nls.localize('editor.codeActionsOnSave', 'Run Code Actions for the editor on save. Code Actions must be specified and the editor must not be shutting down. When {0} is set to `afterDelay`, Code Actions will only be run when the file is saved explicitly. Example: `"source.organizeImports": "explicit" `', '`#files.autoSave#`'),
    type: ['object', 'array'],
    additionalProperties: {
        type: 'string',
        enum: ['always', 'explicit', 'never', true, false],
    },
    default: {},
    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
};
export const editorConfiguration = Object.freeze({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.codeActionsOnSave': codeActionsOnSaveSchema,
    },
});
const notebookCodeActionsOnSaveSchema = {
    oneOf: [
        {
            type: 'object',
            additionalProperties: {
                type: 'string',
            },
        },
        {
            type: 'array',
            items: { type: 'string' },
        },
    ],
    markdownDescription: nls.localize('notebook.codeActionsOnSave', 'Run a series of Code Actions for a notebook on save. Code Actions must be specified and the editor must not be shutting down. When {0} is set to `afterDelay`, Code Actions will only be run when the file is saved explicitly. Example: `"notebook.source.organizeImports": "explicit"`', '`#files.autoSave#`'),
    type: 'object',
    additionalProperties: {
        type: ['string', 'boolean'],
        enum: ['explicit', 'never', true, false],
        // enum: ['explicit', 'always', 'never'], -- autosave support needs to be built first
        // nls.localize('always', 'Always triggers Code Actions on save, including autosave, focus, and window change events.'),
    },
    default: {},
};
export const notebookEditorConfiguration = Object.freeze({
    ...editorConfigurationBaseNode,
    properties: {
        'notebook.codeActionsOnSave': notebookCodeActionsOnSaveSchema,
    },
});
let CodeActionsContribution = class CodeActionsContribution extends Disposable {
    constructor(keybindingService, languageFeatures) {
        super();
        this.languageFeatures = languageFeatures;
        this._onDidChangeSchemaContributions = this._register(new Emitter());
        this._allProvidedCodeActionKinds = [];
        // TODO: @justschen caching of code actions based on extensions loaded: https://github.com/microsoft/vscode/issues/216019
        this._register(Event.runAndSubscribe(Event.debounce(languageFeatures.codeActionProvider.onDidChange, () => { }, 1000), () => {
            this._allProvidedCodeActionKinds = this.getAllProvidedCodeActionKinds();
            this.updateConfigurationSchema(this._allProvidedCodeActionKinds);
            this._onDidChangeSchemaContributions.fire();
        }));
        keybindingService.registerSchemaContribution({
            getSchemaAdditions: () => this.getKeybindingSchemaAdditions(),
            onDidChange: this._onDidChangeSchemaContributions.event,
        });
    }
    getAllProvidedCodeActionKinds() {
        const out = new Map();
        for (const provider of this.languageFeatures.codeActionProvider.allNoModel()) {
            for (const kind of provider.providedCodeActionKinds ?? []) {
                out.set(kind, new HierarchicalKind(kind));
            }
        }
        return Array.from(out.values());
    }
    updateConfigurationSchema(allProvidedKinds) {
        const properties = { ...codeActionsOnSaveSchema.properties };
        const notebookProperties = { ...notebookCodeActionsOnSaveSchema.properties };
        for (const codeActionKind of allProvidedKinds) {
            if (CodeActionKind.Source.contains(codeActionKind) && !properties[codeActionKind.value]) {
                properties[codeActionKind.value] = createCodeActionsAutoSave(nls.localize('codeActionsOnSave.generic', "Controls whether '{0}' actions should be run on file save.", codeActionKind.value));
                notebookProperties[codeActionKind.value] = createNotebookCodeActionsAutoSave(nls.localize('codeActionsOnSave.generic', "Controls whether '{0}' actions should be run on file save.", codeActionKind.value));
            }
        }
        codeActionsOnSaveSchema.properties = properties;
        notebookCodeActionsOnSaveSchema.properties = notebookProperties;
        Registry.as(Extensions.Configuration).notifyConfigurationSchemaUpdated(editorConfiguration);
    }
    getKeybindingSchemaAdditions() {
        const conditionalSchema = (command, kinds) => {
            return {
                if: {
                    required: ['command'],
                    properties: {
                        command: { const: command },
                    },
                },
                then: {
                    properties: {
                        args: {
                            required: ['kind'],
                            properties: {
                                kind: {
                                    anyOf: [{ enum: Array.from(kinds) }, { type: 'string' }],
                                },
                            },
                        },
                    },
                },
            };
        };
        const filterProvidedKinds = (ofKind) => {
            const out = new Set();
            for (const providedKind of this._allProvidedCodeActionKinds) {
                if (ofKind.contains(providedKind)) {
                    out.add(providedKind.value);
                }
            }
            return Array.from(out);
        };
        return [
            conditionalSchema(codeActionCommandId, filterProvidedKinds(HierarchicalKind.Empty)),
            conditionalSchema(refactorCommandId, filterProvidedKinds(CodeActionKind.Refactor)),
            conditionalSchema(sourceActionCommandId, filterProvidedKinds(CodeActionKind.Source)),
        ];
    }
};
CodeActionsContribution = __decorate([
    __param(0, IKeybindingService),
    __param(1, ILanguageFeaturesService)
], CodeActionsContribution);
export { CodeActionsContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbnNDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlQWN0aW9ucy9icm93c2VyL2NvZGVBY3Rpb25zQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQzNHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsaUJBQWlCLEVBQ2pCLHFCQUFxQixHQUNyQixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN0RixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFFTixVQUFVLEdBSVYsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFHM0UsTUFBTSx5QkFBeUIsR0FBRyxDQUFDLFdBQW1CLEVBQWUsRUFBRTtJQUN0RSxPQUFPO1FBQ04sSUFBSSxFQUFFLFFBQVE7UUFDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDO1FB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
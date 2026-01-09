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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbnNDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVBY3Rpb25zL2Jyb3dzZXIvY29kZUFjdGlvbnNDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDM0csT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixpQkFBaUIsRUFDakIscUJBQXFCLEdBQ3JCLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3RGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUVOLFVBQVUsR0FJVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUczRSxNQUFNLHlCQUF5QixHQUFHLENBQUMsV0FBbUIsRUFBZSxFQUFFO0lBQ3RFLE9BQU87UUFDTixJQUFJLEVBQUUsUUFBUTtRQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFF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
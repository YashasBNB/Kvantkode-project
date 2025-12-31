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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { pasteAsCommandId } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteContribution.js';
import { pasteAsPreferenceConfig } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { dropAsPreferenceConfig } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import * as nls from '../../../../nls.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
const dropEnumValues = [];
const dropAsPreferenceSchema = {
    type: 'array',
    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
    description: nls.localize('dropPreferredDescription', 'Configures the preferred type of edit to use when dropping content.\n\nThis is an ordered list of edit kinds. The first available edit of a preferred kind will be used.'),
    default: [],
    items: {
        description: nls.localize('dropKind', 'The kind identifier of the drop edit.'),
        anyOf: [{ type: 'string' }, { enum: dropEnumValues }],
    },
};
const pasteEnumValues = [];
const pasteAsPreferenceSchema = {
    type: 'array',
    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
    description: nls.localize('pastePreferredDescription', 'Configures the preferred type of edit to use when pasting content.\n\nThis is an ordered list of edit kinds. The first available edit of a preferred kind will be used.'),
    default: [],
    items: {
        description: nls.localize('pasteKind', 'The kind identifier of the paste edit.'),
        anyOf: [{ type: 'string' }, { enum: pasteEnumValues }],
    },
};
export const editorConfiguration = Object.freeze({
    ...editorConfigurationBaseNode,
    properties: {
        [pasteAsPreferenceConfig]: pasteAsPreferenceSchema,
        [dropAsPreferenceConfig]: dropAsPreferenceSchema,
    },
});
let DropOrPasteSchemaContribution = class DropOrPasteSchemaContribution extends Disposable {
    static { this.ID = 'workbench.contrib.dropOrPasteIntoSchema'; }
    constructor(keybindingService, languageFeatures) {
        super();
        this.languageFeatures = languageFeatures;
        this._onDidChangeSchemaContributions = this._register(new Emitter());
        this._allProvidedDropKinds = [];
        this._allProvidedPasteKinds = [];
        this._register(Event.runAndSubscribe(Event.debounce(Event.any(languageFeatures.documentPasteEditProvider.onDidChange, languageFeatures.documentPasteEditProvider.onDidChange), () => { }, 1000), () => {
            this.updateProvidedKinds();
            this.updateConfigurationSchema();
            this._onDidChangeSchemaContributions.fire();
        }));
        keybindingService.registerSchemaContribution({
            getSchemaAdditions: () => this.getKeybindingSchemaAdditions(),
            onDidChange: this._onDidChangeSchemaContributions.event,
        });
    }
    updateProvidedKinds() {
        // Drop
        const dropKinds = new Map();
        for (const provider of this.languageFeatures.documentDropEditProvider.allNoModel()) {
            for (const kind of provider.providedDropEditKinds ?? []) {
                dropKinds.set(kind.value, kind);
            }
        }
        this._allProvidedDropKinds = Array.from(dropKinds.values());
        // Paste
        const pasteKinds = new Map();
        for (const provider of this.languageFeatures.documentPasteEditProvider.allNoModel()) {
            for (const kind of provider.providedPasteEditKinds ?? []) {
                pasteKinds.set(kind.value, kind);
            }
        }
        this._allProvidedPasteKinds = Array.from(pasteKinds.values());
    }
    updateConfigurationSchema() {
        pasteEnumValues.length = 0;
        for (const codeActionKind of this._allProvidedPasteKinds) {
            pasteEnumValues.push(codeActionKind.value);
        }
        dropEnumValues.length = 0;
        for (const codeActionKind of this._allProvidedDropKinds) {
            dropEnumValues.push(codeActionKind.value);
        }
        Registry.as(Extensions.Configuration).notifyConfigurationSchemaUpdated(editorConfiguration);
    }
    getKeybindingSchemaAdditions() {
        return [
            {
                if: {
                    required: ['command'],
                    properties: {
                        command: { const: pasteAsCommandId },
                    },
                },
                then: {
                    properties: {
                        args: {
                            oneOf: [
                                {
                                    required: ['kind'],
                                    properties: {
                                        kind: {
                                            anyOf: [
                                                { enum: Array.from(this._allProvidedPasteKinds.map((x) => x.value)) },
                                                { type: 'string' },
                                            ],
                                        },
                                    },
                                },
                                {
                                    required: ['preferences'],
                                    properties: {
                                        preferences: {
                                            type: 'array',
                                            items: {
                                                anyOf: [
                                                    { enum: Array.from(this._allProvidedPasteKinds.map((x) => x.value)) },
                                                    { type: 'string' },
                                                ],
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        ];
    }
};
DropOrPasteSchemaContribution = __decorate([
    __param(0, IKeybindingService),
    __param(1, ILanguageFeaturesService)
], DropOrPasteSchemaContribution);
export { DropOrPasteSchemaContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2Ryb3BPclBhc3RlSW50by9icm93c2VyL2NvbmZpZ3VyYXRpb25TY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUdqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDM0csT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDOUcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkVBQTJFLENBQUE7QUFDbkgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUE7QUFDdkgsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBRU4sVUFBVSxHQUlWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRzNFLE1BQU0sY0FBYyxHQUFhLEVBQUUsQ0FBQTtBQUVuQyxNQUFNLHNCQUFzQixHQUFpQztJQUM1RCxJQUFJLEVBQUUsT0FBTztJQUNiLEtBQUssaURBQXlDO0lBQzlDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwwQkFBMEIsRUFDMUIsMEtBQTBLLENBQzFLO0lBQ0QsT0FBTyxFQUFFLEVBQUU7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
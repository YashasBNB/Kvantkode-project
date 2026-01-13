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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZHJvcE9yUGFzdGVJbnRvL2Jyb3dzZXIvY29uZmlndXJhdGlvblNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBR2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUMzRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUNuSCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2SCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFFTixVQUFVLEdBSVYsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFHM0UsTUFBTSxjQUFjLEdBQWEsRUFBRSxDQUFBO0FBRW5DLE1BQU0sc0JBQXNCLEdBQWlDO0lBQzVELElBQUksRUFBRSxPQUFPO0lBQ2IsS0FBSyxpREFBeUM7SUFDOUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDBCQUEwQixFQUMxQiwwS0FBMEssQ0FD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
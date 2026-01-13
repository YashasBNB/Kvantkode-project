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
var InlineEditsAdapterContribution_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorunWithStore, observableSignalFromEvent, } from '../../../../../base/common/observable.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { InlineEditTriggerKind, } from '../../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
let InlineEditsAdapterContribution = class InlineEditsAdapterContribution extends Disposable {
    static { InlineEditsAdapterContribution_1 = this; }
    static { this.ID = 'editor.contrib.inlineEditsAdapter'; }
    static { this.isFirst = true; }
    constructor(_editor, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        if (InlineEditsAdapterContribution_1.isFirst) {
            InlineEditsAdapterContribution_1.isFirst = false;
            this.instantiationService.createInstance(InlineEditsAdapter);
        }
    }
};
InlineEditsAdapterContribution = InlineEditsAdapterContribution_1 = __decorate([
    __param(1, IInstantiationService)
], InlineEditsAdapterContribution);
export { InlineEditsAdapterContribution };
let InlineEditsAdapter = class InlineEditsAdapter extends Disposable {
    constructor(_languageFeaturesService, _commandService) {
        super();
        this._languageFeaturesService = _languageFeaturesService;
        this._commandService = _commandService;
        const didChangeSignal = observableSignalFromEvent('didChangeSignal', this._languageFeaturesService.inlineEditProvider.onDidChange);
        this._register(autorunWithStore((reader, store) => {
            didChangeSignal.read(reader);
            store.add(this._languageFeaturesService.inlineCompletionsProvider.register('*', {
                async provideInlineCompletions(model, position, context, token) {
                    if (!context.includeInlineEdits) {
                        return undefined;
                    }
                    const allInlineEditProvider = _languageFeaturesService.inlineEditProvider.all(model);
                    const inlineEdits = await Promise.all(allInlineEditProvider.map(async (provider) => {
                        const result = await provider.provideInlineEdit(model, {
                            triggerKind: InlineEditTriggerKind.Automatic,
                            requestUuid: context.requestUuid,
                        }, token);
                        if (!result) {
                            return undefined;
                        }
                        return { result, provider };
                    }));
                    const definedEdits = inlineEdits.filter((e) => !!e);
                    return {
                        edits: definedEdits,
                        items: definedEdits.map((e) => {
                            return {
                                range: e.result.range,
                                showRange: e.result.showRange,
                                insertText: e.result.text,
                                command: e.result.accepted,
                                shownCommand: e.result.shown,
                                action: e.result.action,
                                isInlineEdit: true,
                                edit: e.result,
                            };
                        }),
                        commands: definedEdits.flatMap((e) => e.result.commands ?? []),
                        enableForwardStability: true,
                    };
                },
                handleRejection: (completions, item) => {
                    if (item.edit.rejected) {
                        this._commandService.executeCommand(item.edit.rejected.id, ...(item.edit.rejected.arguments ?? []));
                    }
                },
                freeInlineCompletions(c) {
                    for (const e of c.edits) {
                        e.provider.freeInlineEdit(e.result);
                    }
                },
                toString() {
                    return 'InlineEditsAdapter';
                },
            }));
        }));
    }
};
InlineEditsAdapter = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, ICommandService)
], InlineEditsAdapter);
export { InlineEditsAdapter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNBZGFwdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL2lubGluZUVkaXRzQWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIseUJBQXlCLEdBQ3pCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBR3JHLE9BQU8sRUFPTixxQkFBcUIsR0FDckIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV4QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVuRixJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7O2FBQy9DLE9BQUUsR0FBRyxtQ0FBbUMsQUFBdEMsQ0FBc0M7YUFDeEMsWUFBTyxHQUFHLElBQUksQUFBUCxDQUFPO0lBRTVCLFlBQ0MsT0FBb0IsRUFDb0Isb0JBQTJDO1FBRW5GLEtBQUssRUFBRSxDQUFBO1FBRmlDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFJbkYsSUFBSSxnQ0FBOEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1QyxnQ0FBOEIsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO1lBQzlDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUM3RCxDQUFDO0lBQ0YsQ0FBQzs7QUFkVyw4QkFB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
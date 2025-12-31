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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNBZGFwdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9pbmxpbmVFZGl0c0FkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLHlCQUF5QixHQUN6QixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUdyRyxPQUFPLEVBT04scUJBQXFCLEdBQ3JCLE1BQU0saUNBQWlDLENBQUE7QUFFeEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFbkYsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVOzthQUMvQyxPQUFFLEdBQUcsbUNBQW1DLEFBQXRDLENBQXNDO2FBQ3hDLFlBQU8sR0FBRyxJQUFJLEFBQVAsQ0FBTztJQUU1QixZQUNDLE9BQW9CLEVBQ29CLG9CQUEyQztRQUVuRixLQUFLLEVBQUUsQ0FBQTtRQUZpQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBSW5GLElBQUksZ0NBQThCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDNUMsZ0NBQThCLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtZQUM5QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDN0QsQ0FBQztJQUNGLENBQUM7O0FBZFcsOEJBQThCO0lBTXhDLFdBQUEscUJBQXFCLENB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
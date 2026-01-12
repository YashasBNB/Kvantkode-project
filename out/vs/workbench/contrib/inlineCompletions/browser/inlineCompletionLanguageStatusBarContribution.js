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
var InlineCompletionLanguageStatusBarContribution_1;
import { localize } from '../../../../nls.js';
import { createHotClass } from '../../../../base/common/hotReloadHelpers.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorunWithStore, derived } from '../../../../base/common/observable.js';
import { debouncedObservable } from '../../../../base/common/observableInternal/utils.js';
import Severity from '../../../../base/common/severity.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { ILanguageStatusService } from '../../../services/languageStatus/common/languageStatusService.js';
import { observableCodeEditor } from '../../../../editor/browser/observableCodeEditor.js';
let InlineCompletionLanguageStatusBarContribution = class InlineCompletionLanguageStatusBarContribution extends Disposable {
    static { InlineCompletionLanguageStatusBarContribution_1 = this; }
    static { this.hot = createHotClass(InlineCompletionLanguageStatusBarContribution_1); }
    static { this.Id = 'vs.editor.contrib.inlineCompletionLanguageStatusBarContribution'; }
    static { this.languageStatusBarDisposables = new Set(); }
    constructor(_editor, _languageStatusService) {
        super();
        this._editor = _editor;
        this._languageStatusService = _languageStatusService;
        this._c = InlineCompletionsController.get(this._editor);
        this._state = derived(this, (reader) => {
            const model = this._c?.model.read(reader);
            if (!model) {
                return undefined;
            }
            if (!observableCodeEditor(this._editor).isFocused.read(reader)) {
                return undefined;
            }
            return {
                model,
                status: debouncedObservable(model.status, 300),
            };
        });
        this._register(autorunWithStore((reader, store) => {
            const state = this._state.read(reader);
            if (!state) {
                return;
            }
            const status = state.status.read(reader);
            const statusMap = {
                loading: {
                    shortLabel: '',
                    label: localize('inlineSuggestionLoading', 'Loading...'),
                    loading: true,
                },
                ghostText: {
                    shortLabel: '$(lightbulb)',
                    label: '$(copilot) ' + localize('inlineCompletionAvailable', 'Inline completion available'),
                    loading: false,
                },
                inlineEdit: {
                    shortLabel: '$(lightbulb-sparkle)',
                    label: '$(copilot) ' + localize('inlineEditAvailable', 'Inline edit available'),
                    loading: false,
                },
                noSuggestion: {
                    shortLabel: '$(circle-slash)',
                    label: '$(copilot) ' +
                        localize('noInlineSuggestionAvailable', 'No inline suggestion available'),
                    loading: false,
                },
            };
            // Make sure previous status is cleared before the new is registered. This works, but is a bit hacky.
            // TODO: Use a workbench contribution to get singleton behavior.
            InlineCompletionLanguageStatusBarContribution_1.languageStatusBarDisposables.forEach((d) => d.clear());
            InlineCompletionLanguageStatusBarContribution_1.languageStatusBarDisposables.add(store);
            store.add({
                dispose: () => InlineCompletionLanguageStatusBarContribution_1.languageStatusBarDisposables.delete(store),
            });
            store.add(this._languageStatusService.addStatus({
                accessibilityInfo: undefined,
                busy: statusMap[status].loading,
                command: undefined,
                detail: localize('inlineSuggestionsSmall', 'Inline suggestions'),
                id: 'inlineSuggestions',
                label: { value: statusMap[status].label, shortValue: statusMap[status].shortLabel },
                name: localize('inlineSuggestions', 'Inline Suggestions'),
                selector: { pattern: state.model.textModel.uri.fsPath },
                severity: Severity.Info,
                source: 'inlineSuggestions',
            }));
        }));
    }
};
InlineCompletionLanguageStatusBarContribution = InlineCompletionLanguageStatusBarContribution_1 = __decorate([
    __param(1, ILanguageStatusService)
], InlineCompletionLanguageStatusBarContribution);
export { InlineCompletionLanguageStatusBarContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbkxhbmd1YWdlU3RhdHVzQmFyQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL2lubGluZUNvbXBsZXRpb25MYW5ndWFnZVN0YXR1c0JhckNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFtQixNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxnR0FBZ0csQ0FBQTtBQUM1SSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVsRixJQUFNLDZDQUE2QyxHQUFuRCxNQUFNLDZDQUE4QyxTQUFRLFVBQVU7O2FBQ3JELFFBQUcsR0FBRyxjQUFjLENBQUMsK0NBQTZDLENBQUMsQUFBaEUsQ0FBZ0U7YUFFNUUsT0FBRSxHQUFHLGlFQUFpRSxBQUFwRSxDQUFvRTthQUM3RCxpQ0FBNEIsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQUFBN0IsQ0FBNkI7SUFtQmhGLFlBQ2tCLE9BQW9CLEVBQ2Isc0JBQStE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
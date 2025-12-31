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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbkxhbmd1YWdlU3RhdHVzQmFyQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9pbmxpbmVDb21wbGV0aW9uTGFuZ3VhZ2VTdGF0dXNCYXJDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBbUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFFMUQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0dBQWdHLENBQUE7QUFDNUksT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFbEYsSUFBTSw2Q0FBNkMsR0FBbkQsTUFBTSw2Q0FBOEMsU0FBUSxVQUFVOzthQUNyRCxRQUFHLEdBQUcsY0FBYyxDQUFDLCtDQUE2QyxDQUFDLEFBQWhFLENBQWdFO2FBRTVFLE9BQUUsR0FBRyxpRUFBaUUsQUFBcEUsQ0FBb0U7YUFDN0QsaUNBQTRCLEdBQUcsSUFBSSxHQUFHLEVBQW1CLEFBQTdCLENBQTZCO0lBbUJoRixZQUNrQixPQUFvQixFQUNiLHNCQUErRDtRQUV2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
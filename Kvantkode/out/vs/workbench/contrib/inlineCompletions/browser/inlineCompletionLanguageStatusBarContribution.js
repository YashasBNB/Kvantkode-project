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

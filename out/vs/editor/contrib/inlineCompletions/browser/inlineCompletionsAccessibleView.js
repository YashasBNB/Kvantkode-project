/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { InlineCompletionContextKeys } from './controller/inlineCompletionContextKeys.js';
import { InlineCompletionsController } from './controller/inlineCompletionsController.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { TextEdit } from '../../../common/core/textEdit.js';
import { LineEdit } from '../../../common/core/lineEdit.js';
import { TextModelText } from '../../../common/model/textModelText.js';
import { localize } from '../../../../nls.js';
export class InlineCompletionsAccessibleView {
    constructor() {
        this.type = "view" /* AccessibleViewType.View */;
        this.priority = 95;
        this.name = 'inline-completions';
        this.when = ContextKeyExpr.or(InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.inlineEditVisible);
    }
    getProvider(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!editor) {
            return;
        }
        const model = InlineCompletionsController.get(editor)?.model.get();
        if (!model?.state.get()) {
            return;
        }
        return new InlineCompletionsAccessibleViewContentProvider(editor, model);
    }
}
class InlineCompletionsAccessibleViewContentProvider extends Disposable {
    constructor(_editor, _model) {
        super();
        this._editor = _editor;
        this._model = _model;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this.id = "inlineCompletions" /* AccessibleViewProviderId.InlineCompletions */;
        this.verbositySettingKey = 'accessibility.verbosity.inlineCompletions';
        this.options = {
            language: this._editor.getModel()?.getLanguageId() ?? undefined,
            type: "view" /* AccessibleViewType.View */,
        };
    }
    provideContent() {
        const state = this._model.state.get();
        if (!state) {
            throw new Error('Inline completion is visible but state is not available');
        }
        if (state.kind === 'ghostText') {
            const lineText = this._model.textModel.getLineContent(state.primaryGhostText.lineNumber);
            const ghostText = state.primaryGhostText.renderForScreenReader(lineText);
            if (!ghostText) {
                throw new Error('Inline completion is visible but ghost text is not available');
            }
            return lineText + ghostText;
        }
        else {
            const text = new TextModelText(this._model.textModel);
            const lineEdit = LineEdit.fromTextEdit(new TextEdit(state.edits), text);
            return (localize('inlineEditAvailable', 'There is an inline edit available:') +
                '\n' +
                lineEdit.humanReadablePatch(text.getLines()));
        }
    }
    provideNextContent() {
        // asynchronously update the model and fire the event
        this._model.next().then(() => this._onDidChangeContent.fire());
        return;
    }
    providePreviousContent() {
        // asynchronously update the model and fire the event
        this._model.previous().then(() => this._onDidChangeContent.fire());
        return;
    }
    onClose() {
        this._model.stop();
        this._editor.focus();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNBY2Nlc3NpYmxlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvaW5saW5lQ29tcGxldGlvbnNBY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDekYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFPekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsTUFBTSxPQUFPLCtCQUErQjtJQUE1QztRQUNVLFNBQUksd0NBQTBCO1FBQzlCLGFBQVEsR0FBRyxFQUFFLENBQUE7UUFDYixTQUFJLEdBQUcsb0JBQW9CLENBQUE7UUFDM0IsU0FBSSxHQUFHLGNBQWMsQ0FBQyxFQUFFLENBQ2hDLDJCQUEyQixDQUFDLHVCQUF1QixFQUNuRCwyQkFBMkIsQ0FBQyxpQkFBaUIsQ0FDN0MsQ0FBQTtJQWdCRixDQUFDO0lBZkEsV0FBVyxDQUFD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
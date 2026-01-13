/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { derived } from '../../../../../../base/common/observable.js';
import { localize } from '../../../../../../nls.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { StringText, TextEdit } from '../../../../../common/core/textEdit.js';
import { InlineEditTabAction, } from './inlineEditsViewInterface.js';
import { InlineEditWithChanges } from './inlineEditWithChanges.js';
export class InlineEditModel {
    constructor(_model, inlineEdit, tabAction) {
        this._model = _model;
        this.inlineEdit = inlineEdit;
        this.tabAction = tabAction;
        this.action = this.inlineEdit.inlineCompletion.action;
        this.displayName =
            this.inlineEdit.inlineCompletion.source.provider.displayName ??
                localize('inlineEdit', 'Inline Edit');
        this.extensionCommands =
            this.inlineEdit.inlineCompletion.source.inlineCompletions.commands ?? [];
        this.showCollapsed = this._model.showCollapsed;
    }
    accept() {
        this._model.accept();
    }
    jump() {
        this._model.jump();
    }
    abort(reason) {
        console.error(reason); // TODO: add logs/telemetry
        this._model.stop();
    }
    handleInlineEditShown() {
        this._model.handleInlineEditShown(this.inlineEdit.inlineCompletion);
    }
}
export class InlineEditHost {
    constructor(_model) {
        this._model = _model;
        this.onDidAccept = this._model.onDidAccept;
        this.inAcceptFlow = this._model.inAcceptFlow;
        this.inPartialAcceptFlow = this._model.inPartialAcceptFlow;
    }
}
export class GhostTextIndicator {
    constructor(editor, model, lineRange, inlineCompletion) {
        this.lineRange = lineRange;
        const editorObs = observableCodeEditor(editor);
        const tabAction = derived(this, (reader) => {
            if (editorObs.isFocused.read(reader)) {
                if (model.inlineCompletionState.read(reader)?.inlineCompletion?.sourceInlineCompletion
                    .showInlineEditMenu) {
                    return InlineEditTabAction.Accept;
                }
            }
            return InlineEditTabAction.Inactive;
        });
        this.model = new InlineEditModel(model, new InlineEditWithChanges(new StringText(''), new TextEdit([]), model.primaryPosition.get(), inlineCompletion.source.inlineCompletions.commands ?? [], inlineCompletion.inlineCompletion), tabAction);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBZSxNQUFNLDZDQUE2QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVuRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVyRixPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBSTdFLE9BQU8sRUFHTixtQkFBbUIsR0FDbkIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUVsRSxNQUFNLE9BQU8sZUFBZTtJQU8zQixZQUNrQixNQUE4QixFQUN0QyxVQUFpQyxFQUNqQyxTQUEyQztRQUZuQyxXQUFNLEdBQU4sTUFBTSxDQUF3QjtRQUN0QyxlQUFVLEdBQVYsVUFBVSxDQUF1QjtRQUNqQyxjQUFTLEdBQVQsU0FBUyxDQUFrQztRQUVwRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFBO1FBQ3JELElBQUksQ0FBQyxXQUFXO1lBQ2YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVc7Z0JBQzVELFFBQVEsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLGlCQUFpQjtZQUNyQixJ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
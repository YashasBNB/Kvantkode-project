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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQWUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFbkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFckYsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUk3RSxPQUFPLEVBR04sbUJBQW1CLEdBQ25CLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFbEUsTUFBTSxPQUFPLGVBQWU7SUFPM0IsWUFDa0IsTUFBOEIsRUFDdEMsVUFBaUMsRUFDakMsU0FBMkM7UUFGbkMsV0FBTSxHQUFOLE1BQU0sQ0FBd0I7UUFDdEMsZUFBVSxHQUFWLFVBQVUsQ0FBdUI7UUFDakMsY0FBUyxHQUFULFNBQVMsQ0FBa0M7UUFFcEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQTtRQUNyRCxJQUFJLENBQUMsV0FBVztZQUNmLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXO2dCQUM1RCxRQUFRLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxpQkFBaUI7WUFDckIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQTtRQUV6RSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFBO0lBQy9DLENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNyQixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDbkIsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFjO1FBQ25CLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUEsQ0FBQywyQkFBMkI7UUFDakQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0lBRUQscUJBQXFCO1FBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxjQUFjO0lBSzFCLFlBQTZCLE1BQThCO1FBQTlCLFdBQU0sR0FBTixNQUFNLENBQXdCO1FBQzFELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUE7UUFDMUMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQTtRQUM1QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQTtJQUMzRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sa0JBQWtCO0lBRzlCLFlBQ0MsTUFBbUIsRUFDbkIsS0FBNkIsRUFDcEIsU0FBb0IsRUFDN0IsZ0JBQWtEO1FBRHpDLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFHN0IsTUFBTSxTQUFTLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDOUMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFzQixJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUMvRCxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLElBQ0MsS0FBSyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxzQkFBc0I7cUJBQ2hGLGtCQUFrQixFQUNuQixDQUFDO29CQUNGLE9BQU8sbUJBQW1CLENBQUMsTUFBTSxDQUFBO2dCQUNsQyxDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sbUJBQW1CLENBQUMsUUFBUSxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLGVBQWUsQ0FDL0IsS0FBSyxFQUNMLElBQUkscUJBQXFCLENBQ3hCLElBQUksVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUNsQixJQUFJLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFDaEIsS0FBSyxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsRUFDM0IsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsSUFBSSxFQUFFLEVBQ3hELGdCQUFnQixDQUFDLGdCQUFnQixDQUNqQyxFQUNELFNBQVMsQ0FDVCxDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=
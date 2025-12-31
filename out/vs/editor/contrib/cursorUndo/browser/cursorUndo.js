/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
class CursorState {
    constructor(selections) {
        this.selections = selections;
    }
    equals(other) {
        const thisLen = this.selections.length;
        const otherLen = other.selections.length;
        if (thisLen !== otherLen) {
            return false;
        }
        for (let i = 0; i < thisLen; i++) {
            if (!this.selections[i].equalsSelection(other.selections[i])) {
                return false;
            }
        }
        return true;
    }
}
class StackElement {
    constructor(cursorState, scrollTop, scrollLeft) {
        this.cursorState = cursorState;
        this.scrollTop = scrollTop;
        this.scrollLeft = scrollLeft;
    }
}
export class CursorUndoRedoController extends Disposable {
    static { this.ID = 'editor.contrib.cursorUndoRedoController'; }
    static get(editor) {
        return editor.getContribution(CursorUndoRedoController.ID);
    }
    constructor(editor) {
        super();
        this._editor = editor;
        this._isCursorUndoRedo = false;
        this._undoStack = [];
        this._redoStack = [];
        this._register(editor.onDidChangeModel((e) => {
            this._undoStack = [];
            this._redoStack = [];
        }));
        this._register(editor.onDidChangeModelContent((e) => {
            this._undoStack = [];
            this._redoStack = [];
        }));
        this._register(editor.onDidChangeCursorSelection((e) => {
            if (this._isCursorUndoRedo) {
                return;
            }
            if (!e.oldSelections) {
                return;
            }
            if (e.oldModelVersionId !== e.modelVersionId) {
                return;
            }
            const prevState = new CursorState(e.oldSelections);
            const isEqualToLastUndoStack = this._undoStack.length > 0 &&
                this._undoStack[this._undoStack.length - 1].cursorState.equals(prevState);
            if (!isEqualToLastUndoStack) {
                this._undoStack.push(new StackElement(prevState, editor.getScrollTop(), editor.getScrollLeft()));
                this._redoStack = [];
                if (this._undoStack.length > 50) {
                    // keep the cursor undo stack bounded
                    this._undoStack.shift();
                }
            }
        }));
    }
    cursorUndo() {
        if (!this._editor.hasModel() || this._undoStack.length === 0) {
            return;
        }
        this._redoStack.push(new StackElement(new CursorState(this._editor.getSelections()), this._editor.getScrollTop(), this._editor.getScrollLeft()));
        this._applyState(this._undoStack.pop());
    }
    cursorRedo() {
        if (!this._editor.hasModel() || this._redoStack.length === 0) {
            return;
        }
        this._undoStack.push(new StackElement(new CursorState(this._editor.getSelections()), this._editor.getScrollTop(), this._editor.getScrollLeft()));
        this._applyState(this._redoStack.pop());
    }
    _applyState(stackElement) {
        this._isCursorUndoRedo = true;
        this._editor.setSelections(stackElement.cursorState.selections);
        this._editor.setScrollPosition({
            scrollTop: stackElement.scrollTop,
            scrollLeft: stackElement.scrollLeft,
        });
        this._isCursorUndoRedo = false;
    }
}
export class CursorUndo extends EditorAction {
    constructor() {
        super({
            id: 'cursorUndo',
            label: nls.localize2('cursor.undo', 'Cursor Undo'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 51 /* KeyCode.KeyU */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor, args) {
        CursorUndoRedoController.get(editor)?.cursorUndo();
    }
}
export class CursorRedo extends EditorAction {
    constructor() {
        super({
            id: 'cursorRedo',
            label: nls.localize2('cursor.redo', 'Cursor Redo'),
            precondition: undefined,
        });
    }
    run(accessor, editor, args) {
        CursorUndoRedoController.get(editor)?.cursorRedo();
    }
}
registerEditorContribution(CursorUndoRedoController.ID, CursorUndoRedoController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to listen to record cursor state ASAP
registerEditorAction(CursorUndo);
registerEditorAction(CursorRedo);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVW5kby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2N1cnNvclVuZG8vYnJvd3Nlci9jdXJzb3JVbmRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQ04sWUFBWSxFQUVaLG9CQUFvQixFQUNwQiwwQkFBMEIsR0FFMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUc3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBR3pDLE1BQU0sV0FBVztJQUdoQixZQUFZLFVBQWdDO1FBQzNDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO0lBQzdCLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBa0I7UUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUE7UUFDdEMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUE7UUFDeEMsSUFBSSxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDOUQsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNEO0FBRUQsTUFBTSxZQUFZO0lBQ2pCLFlBQ2lCLFdBQXdCLEVBQ3hCLFNBQWlCLEVBQ2pCLFVBQWtCO1FBRmxCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3hCLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtJQUNoQyxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTthQUNoQyxPQUFFLEdBQUcseUNBQXlDLENBQUE7SUFFOUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFtQjtRQUNwQyxPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQTJCLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFRRCxZQUFZLE1BQW1CO1FBQzlCLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQTtRQUU5QixJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQTtRQUNwQixJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQTtRQUVwQixJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFBO1lBQ3BCLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3BDLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFBO1lBQ3BCLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3ZDLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQzVCLE9BQU07WUFDUCxDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDdEIsT0FBTTtZQUNQLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxpQkFBaUIsS0FBSyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzlDLE9BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ2xELE1BQU0sc0JBQXNCLEdBQzNCLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMxRSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25CLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQzFFLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUE7Z0JBQ3BCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsRUFBRSxFQUFFLENBQUM7b0JBQ2pDLHFDQUFxQztvQkFDckMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDeEIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVNLFVBQVU7UUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDOUQsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDbkIsSUFBSSxZQUFZLENBQ2YsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUM1QixDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFHLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRU0sVUFBVTtRQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM5RCxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUNuQixJQUFJLFlBQVksQ0FDZixJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQzdDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEVBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQzVCLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUcsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFTyxXQUFXLENBQUMsWUFBMEI7UUFDN0MsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQTtRQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQy9ELElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUM7WUFDOUIsU0FBUyxFQUFFLFlBQVksQ0FBQyxTQUFTO1lBQ2pDLFVBQVUsRUFBRSxZQUFZLENBQUMsVUFBVTtTQUNuQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFBO0lBQy9CLENBQUM7O0FBR0YsTUFBTSxPQUFPLFVBQVcsU0FBUSxZQUFZO0lBQzNDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLFlBQVk7WUFDaEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQztZQUNsRCxZQUFZLEVBQUUsU0FBUztZQUN2QixNQUFNLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLGlCQUFpQixDQUFDLGNBQWM7Z0JBQ3hDLE9BQU8sRUFBRSxpREFBNkI7Z0JBQ3RDLE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CLEVBQUUsSUFBUztRQUNwRSx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUE7SUFDbkQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFVBQVcsU0FBUSxZQUFZO0lBQzNDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLFlBQVk7WUFDaEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQztZQUNsRCxZQUFZLEVBQUUsU0FBUztTQUN2QixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUIsRUFBRSxJQUFTO1FBQ3BFLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQTtJQUNuRCxDQUFDO0NBQ0Q7QUFFRCwwQkFBMEIsQ0FDekIsd0JBQXdCLENBQUMsRUFBRSxFQUMzQix3QkFBd0IsZ0RBRXhCLENBQUEsQ0FBQywrREFBK0Q7QUFDakUsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUE7QUFDaEMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUEifQ==
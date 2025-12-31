/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import './dnd.css';
import { registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { DragAndDropCommand } from './dragAndDropCommand.js';
function hasTriggerModifier(e) {
    if (isMacintosh) {
        return e.altKey;
    }
    else {
        return e.ctrlKey;
    }
}
export class DragAndDropController extends Disposable {
    static { this.ID = 'editor.contrib.dragAndDrop'; }
    static { this.TRIGGER_KEY_VALUE = isMacintosh ? 6 /* KeyCode.Alt */ : 5 /* KeyCode.Ctrl */; }
    static get(editor) {
        return editor.getContribution(DragAndDropController.ID);
    }
    constructor(editor) {
        super();
        this._editor = editor;
        this._dndDecorationIds = this._editor.createDecorationsCollection();
        this._register(this._editor.onMouseDown((e) => this._onEditorMouseDown(e)));
        this._register(this._editor.onMouseUp((e) => this._onEditorMouseUp(e)));
        this._register(this._editor.onMouseDrag((e) => this._onEditorMouseDrag(e)));
        this._register(this._editor.onMouseDrop((e) => this._onEditorMouseDrop(e)));
        this._register(this._editor.onMouseDropCanceled(() => this._onEditorMouseDropCanceled()));
        this._register(this._editor.onKeyDown((e) => this.onEditorKeyDown(e)));
        this._register(this._editor.onKeyUp((e) => this.onEditorKeyUp(e)));
        this._register(this._editor.onDidBlurEditorWidget(() => this.onEditorBlur()));
        this._register(this._editor.onDidBlurEditorText(() => this.onEditorBlur()));
        this._mouseDown = false;
        this._modifierPressed = false;
        this._dragSelection = null;
    }
    onEditorBlur() {
        this._removeDecoration();
        this._dragSelection = null;
        this._mouseDown = false;
        this._modifierPressed = false;
    }
    onEditorKeyDown(e) {
        if (!this._editor.getOption(35 /* EditorOption.dragAndDrop */) ||
            this._editor.getOption(22 /* EditorOption.columnSelection */)) {
            return;
        }
        if (hasTriggerModifier(e)) {
            this._modifierPressed = true;
        }
        if (this._mouseDown && hasTriggerModifier(e)) {
            this._editor.updateOptions({
                mouseStyle: 'copy',
            });
        }
    }
    onEditorKeyUp(e) {
        if (!this._editor.getOption(35 /* EditorOption.dragAndDrop */) ||
            this._editor.getOption(22 /* EditorOption.columnSelection */)) {
            return;
        }
        if (hasTriggerModifier(e)) {
            this._modifierPressed = false;
        }
        if (this._mouseDown && e.keyCode === DragAndDropController.TRIGGER_KEY_VALUE) {
            this._editor.updateOptions({
                mouseStyle: 'default',
            });
        }
    }
    _onEditorMouseDown(mouseEvent) {
        this._mouseDown = true;
    }
    _onEditorMouseUp(mouseEvent) {
        this._mouseDown = false;
        // Whenever users release the mouse, the drag and drop operation should finish and the cursor should revert to text.
        this._editor.updateOptions({
            mouseStyle: 'text',
        });
    }
    _onEditorMouseDrag(mouseEvent) {
        const target = mouseEvent.target;
        if (this._dragSelection === null) {
            const selections = this._editor.getSelections() || [];
            const possibleSelections = selections.filter((selection) => target.position && selection.containsPosition(target.position));
            if (possibleSelections.length === 1) {
                this._dragSelection = possibleSelections[0];
            }
            else {
                return;
            }
        }
        if (hasTriggerModifier(mouseEvent.event)) {
            this._editor.updateOptions({
                mouseStyle: 'copy',
            });
        }
        else {
            this._editor.updateOptions({
                mouseStyle: 'default',
            });
        }
        if (target.position) {
            if (this._dragSelection.containsPosition(target.position)) {
                this._removeDecoration();
            }
            else {
                this.showAt(target.position);
            }
        }
    }
    _onEditorMouseDropCanceled() {
        this._editor.updateOptions({
            mouseStyle: 'text',
        });
        this._removeDecoration();
        this._dragSelection = null;
        this._mouseDown = false;
    }
    _onEditorMouseDrop(mouseEvent) {
        if (mouseEvent.target &&
            (this._hitContent(mouseEvent.target) || this._hitMargin(mouseEvent.target)) &&
            mouseEvent.target.position) {
            const newCursorPosition = new Position(mouseEvent.target.position.lineNumber, mouseEvent.target.position.column);
            if (this._dragSelection === null) {
                let newSelections = null;
                if (mouseEvent.event.shiftKey) {
                    const primarySelection = this._editor.getSelection();
                    if (primarySelection) {
                        const { selectionStartLineNumber, selectionStartColumn } = primarySelection;
                        newSelections = [
                            new Selection(selectionStartLineNumber, selectionStartColumn, newCursorPosition.lineNumber, newCursorPosition.column),
                        ];
                    }
                }
                else {
                    newSelections = (this._editor.getSelections() || []).map((selection) => {
                        if (selection.containsPosition(newCursorPosition)) {
                            return new Selection(newCursorPosition.lineNumber, newCursorPosition.column, newCursorPosition.lineNumber, newCursorPosition.column);
                        }
                        else {
                            return selection;
                        }
                    });
                }
                // Use `mouse` as the source instead of `api` and setting the reason to explicit (to behave like any other mouse operation).
                ;
                this._editor.setSelections(newSelections || [], 'mouse', 3 /* CursorChangeReason.Explicit */);
            }
            else if (!this._dragSelection.containsPosition(newCursorPosition) ||
                ((hasTriggerModifier(mouseEvent.event) || this._modifierPressed) &&
                    (this._dragSelection.getEndPosition().equals(newCursorPosition) ||
                        this._dragSelection.getStartPosition().equals(newCursorPosition))) // we allow users to paste content beside the selection
            ) {
                this._editor.pushUndoStop();
                this._editor.executeCommand(DragAndDropController.ID, new DragAndDropCommand(this._dragSelection, newCursorPosition, hasTriggerModifier(mouseEvent.event) || this._modifierPressed));
                this._editor.pushUndoStop();
            }
        }
        this._editor.updateOptions({
            mouseStyle: 'text',
        });
        this._removeDecoration();
        this._dragSelection = null;
        this._mouseDown = false;
    }
    static { this._DECORATION_OPTIONS = ModelDecorationOptions.register({
        description: 'dnd-target',
        className: 'dnd-target',
    }); }
    showAt(position) {
        this._dndDecorationIds.set([
            {
                range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
                options: DragAndDropController._DECORATION_OPTIONS,
            },
        ]);
        this._editor.revealPosition(position, 1 /* ScrollType.Immediate */);
    }
    _removeDecoration() {
        this._dndDecorationIds.clear();
    }
    _hitContent(target) {
        return (target.type === 6 /* MouseTargetType.CONTENT_TEXT */ || target.type === 7 /* MouseTargetType.CONTENT_EMPTY */);
    }
    _hitMargin(target) {
        return (target.type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */ ||
            target.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */ ||
            target.type === 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */);
    }
    dispose() {
        this._removeDecoration();
        this._dragSelection = null;
        this._mouseDown = false;
        this._modifierPressed = false;
        super.dispose();
    }
}
registerEditorContribution(DragAndDropController.ID, DragAndDropController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZG5kL2Jyb3dzZXIvZG5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxXQUFXLENBQUE7QUFRbEIsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBSTdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBTTdELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTVELFNBQVMsa0JBQWtCLENBQUMsQ0FBK0I7SUFDMUQsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNqQixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUE7SUFDaEIsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUE7SUFDakIsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsVUFBVTthQUM3QixPQUFFLEdBQUcsNEJBQTRCLENBQUE7YUFPeEMsc0JBQWlCLEdBQUcsV0FBVyxDQUFDLENBQUMscUJBQWEsQ0FBQyxxQkFBYSxDQUFBO0lBRTVFLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDN0IsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUF3QixxQkFBcUIsQ0FBQyxF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
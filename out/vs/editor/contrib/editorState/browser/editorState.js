/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { Range } from '../../../common/core/range.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorKeybindingCancellationTokenSource } from './keybindingCancellation.js';
export var CodeEditorStateFlag;
(function (CodeEditorStateFlag) {
    CodeEditorStateFlag[CodeEditorStateFlag["Value"] = 1] = "Value";
    CodeEditorStateFlag[CodeEditorStateFlag["Selection"] = 2] = "Selection";
    CodeEditorStateFlag[CodeEditorStateFlag["Position"] = 4] = "Position";
    CodeEditorStateFlag[CodeEditorStateFlag["Scroll"] = 8] = "Scroll";
})(CodeEditorStateFlag || (CodeEditorStateFlag = {}));
export class EditorState {
    constructor(editor, flags) {
        this.flags = flags;
        if ((this.flags & 1 /* CodeEditorStateFlag.Value */) !== 0) {
            const model = editor.getModel();
            this.modelVersionId = model
                ? strings.format('{0}#{1}', model.uri.toString(), model.getVersionId())
                : null;
        }
        else {
            this.modelVersionId = null;
        }
        if ((this.flags & 4 /* CodeEditorStateFlag.Position */) !== 0) {
            this.position = editor.getPosition();
        }
        else {
            this.position = null;
        }
        if ((this.flags & 2 /* CodeEditorStateFlag.Selection */) !== 0) {
            this.selection = editor.getSelection();
        }
        else {
            this.selection = null;
        }
        if ((this.flags & 8 /* CodeEditorStateFlag.Scroll */) !== 0) {
            this.scrollLeft = editor.getScrollLeft();
            this.scrollTop = editor.getScrollTop();
        }
        else {
            this.scrollLeft = -1;
            this.scrollTop = -1;
        }
    }
    _equals(other) {
        if (!(other instanceof EditorState)) {
            return false;
        }
        const state = other;
        if (this.modelVersionId !== state.modelVersionId) {
            return false;
        }
        if (this.scrollLeft !== state.scrollLeft || this.scrollTop !== state.scrollTop) {
            return false;
        }
        if ((!this.position && state.position) ||
            (this.position && !state.position) ||
            (this.position && state.position && !this.position.equals(state.position))) {
            return false;
        }
        if ((!this.selection && state.selection) ||
            (this.selection && !state.selection) ||
            (this.selection && state.selection && !this.selection.equalsRange(state.selection))) {
            return false;
        }
        return true;
    }
    validate(editor) {
        return this._equals(new EditorState(editor, this.flags));
    }
}
/**
 * A cancellation token source that cancels when the editor changes as expressed
 * by the provided flags
 * @param range If provided, changes in position and selection within this range will not trigger cancellation
 */
export class EditorStateCancellationTokenSource extends EditorKeybindingCancellationTokenSource {
    constructor(editor, flags, range, parent) {
        super(editor, parent);
        this._listener = new DisposableStore();
        if (flags & 4 /* CodeEditorStateFlag.Position */) {
            this._listener.add(editor.onDidChangeCursorPosition((e) => {
                if (!range || !Range.containsPosition(range, e.position)) {
                    this.cancel();
                }
            }));
        }
        if (flags & 2 /* CodeEditorStateFlag.Selection */) {
            this._listener.add(editor.onDidChangeCursorSelection((e) => {
                if (!range || !Range.containsRange(range, e.selection)) {
                    this.cancel();
                }
            }));
        }
        if (flags & 8 /* CodeEditorStateFlag.Scroll */) {
            this._listener.add(editor.onDidScrollChange((_) => this.cancel()));
        }
        if (flags & 1 /* CodeEditorStateFlag.Value */) {
            this._listener.add(editor.onDidChangeModel((_) => this.cancel()));
            this._listener.add(editor.onDidChangeModelContent((_) => this.cancel()));
        }
    }
    dispose() {
        this._listener.dispose();
        super.dispose();
    }
}
/**
 * A cancellation token source that cancels when the provided model changes
 */
export class TextModelCancellationTokenSource extends CancellationTokenSource {
    constructor(model, parent) {
        super(parent);
        this._listener = model.onDidChangeContent(() => this.cancel());
    }
    dispose() {
        this._listener.dispose();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU3RhdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9lZGl0b3JTdGF0ZS9icm93c2VyL2VkaXRvclN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFHN0QsT0FBTyxFQUFFLEtBQUssRUFBVSxNQUFNLCtCQUErQixDQUFBO0FBQzdELE9BQU8sRUFBRSx1QkFBdUIsRUFBcUIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFbkYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFckYsTUFBTSxDQUFOLElBQWtCLG1CQUtqQjtBQUxELFdBQWtCLG1CQUFtQjtJQUNwQywrREFBUyxDQUFBO0lBQ1QsdUVBQWEsQ0FBQTtJQUNiLHFFQUFZLENBQUE7SUFDWixpRUFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUxpQixtQkFBbUIsS0FBbkIsbUJBQW1CLFFBS3BDO0FBRUQsTUFBTSxPQUFPLFdBQVc7SUFTdkIsWUFBWSxNQUFtQixFQUFFLEtBQWE7UUFDN0MsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFFbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLG9DQUE0QixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDcEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQy9CLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSztnQkFDMUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFD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
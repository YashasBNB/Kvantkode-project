/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { CharacterSet } from '../../../common/core/characterClassifier.js';
export class CommitCharacterController {
    constructor(editor, widget, model, accept) {
        this._disposables = new DisposableStore();
        this._disposables.add(model.onDidSuggest((e) => {
            if (e.completionModel.items.length === 0) {
                this.reset();
            }
        }));
        this._disposables.add(model.onDidCancel((e) => {
            this.reset();
        }));
        this._disposables.add(widget.onDidShow(() => this._onItem(widget.getFocusedItem())));
        this._disposables.add(widget.onDidFocus(this._onItem, this));
        this._disposables.add(widget.onDidHide(this.reset, this));
        this._disposables.add(editor.onWillType((text) => {
            if (this._active && !widget.isFrozen() && model.state !== 0 /* State.Idle */) {
                const ch = text.charCodeAt(text.length - 1);
                if (this._active.acceptCharacters.has(ch) &&
                    editor.getOption(0 /* EditorOption.acceptSuggestionOnCommitCharacter */)) {
                    accept(this._active.item);
                }
            }
        }));
    }
    _onItem(selected) {
        if (!selected || !isNonEmptyArray(selected.item.completion.commitCharacters)) {
            // no item or no commit characters
            this.reset();
            return;
        }
        if (this._active && this._active.item.item === selected.item) {
            // still the same item
            return;
        }
        // keep item and its commit characters
        const acceptCharacters = new CharacterSet();
        for (const ch of selected.item.completion.commitCharacters) {
            if (ch.length > 0) {
                acceptCharacters.add(ch.charCodeAt(0));
            }
        }
        this._active = { acceptCharacters, item: selected };
    }
    reset() {
        this._active = undefined;
    }
    dispose() {
        this._disposables.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdENvbW1pdENoYXJhY3RlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvc3VnZ2VzdENvbW1pdENoYXJhY3RlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUd0RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFJMUUsTUFBTSxPQUFPLHlCQUF5QjtJQVFyQyxZQUNDLE1BQW1CLEVBQ25CLE1BQXFCLEVBQ3JCLEtBQW1CLEVBQ25CLE1BQThDO1FBWDlCLGlCQUFZLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQWFwRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FDcEIsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hCLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdkIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEYsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDNUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFekQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQ3BCLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUMxQixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksS0FBSyxDQUFDLEtBQUssdUJBQWUsRUFBRSxDQUFDO2dCQUN0RSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQzNDLElBQ0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNyQyxNQUFNLENBQUMsU0FBUyx3REFBZ0QsRUFDL0QsQ0FBQztvQkFDRixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDMUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLE9BQU8sQ0FBQyxRQUF5QztRQUN4RCxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUM5RSxrQ0FBa0M7WUFDbEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ1osT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5RCxzQkFBc0I7WUFDdEIsT0FBTTtRQUNQLENBQUM7UUFFRCxzQ0FBc0M7UUFDdEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFBO1FBQzNDLEtBQUssTUFBTSxFQUFFLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM1RCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ25CLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkMsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFBO0lBQ3BELENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUE7SUFDekIsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzVCLENBQUM7Q0FDRCJ9
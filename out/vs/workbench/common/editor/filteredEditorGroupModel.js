/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
class FilteredEditorGroupModel extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this._onDidModelChange = this._register(new Emitter());
        this.onDidModelChange = this._onDidModelChange.event;
        this._register(this.model.onDidModelChange((e) => {
            const candidateOrIndex = e.editorIndex ?? e.editor;
            if (candidateOrIndex !== undefined) {
                if (!this.filter(candidateOrIndex)) {
                    return; // exclude events for excluded items
                }
            }
            this._onDidModelChange.fire(e);
        }));
    }
    get id() {
        return this.model.id;
    }
    get isLocked() {
        return this.model.isLocked;
    }
    get stickyCount() {
        return this.model.stickyCount;
    }
    get activeEditor() {
        return this.model.activeEditor && this.filter(this.model.activeEditor)
            ? this.model.activeEditor
            : null;
    }
    get previewEditor() {
        return this.model.previewEditor && this.filter(this.model.previewEditor)
            ? this.model.previewEditor
            : null;
    }
    get selectedEditors() {
        return this.model.selectedEditors.filter((e) => this.filter(e));
    }
    isPinned(editorOrIndex) {
        return this.model.isPinned(editorOrIndex);
    }
    isTransient(editorOrIndex) {
        return this.model.isTransient(editorOrIndex);
    }
    isSticky(editorOrIndex) {
        return this.model.isSticky(editorOrIndex);
    }
    isActive(editor) {
        return this.model.isActive(editor);
    }
    isSelected(editorOrIndex) {
        return this.model.isSelected(editorOrIndex);
    }
    isFirst(editor) {
        return this.model.isFirst(editor, this.getEditors(1 /* EditorsOrder.SEQUENTIAL */));
    }
    isLast(editor) {
        return this.model.isLast(editor, this.getEditors(1 /* EditorsOrder.SEQUENTIAL */));
    }
    getEditors(order, options) {
        const editors = this.model.getEditors(order, options);
        return editors.filter((e) => this.filter(e));
    }
    findEditor(candidate, options) {
        const result = this.model.findEditor(candidate, options);
        if (!result) {
            return undefined;
        }
        return this.filter(result[1]) ? result : undefined;
    }
}
export class StickyEditorGroupModel extends FilteredEditorGroupModel {
    get count() {
        return this.model.stickyCount;
    }
    getEditors(order, options) {
        if (options?.excludeSticky) {
            return [];
        }
        if (order === 1 /* EditorsOrder.SEQUENTIAL */) {
            return this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */).slice(0, this.model.stickyCount);
        }
        return super.getEditors(order, options);
    }
    isSticky(editorOrIndex) {
        return true;
    }
    getEditorByIndex(index) {
        return index < this.count ? this.model.getEditorByIndex(index) : undefined;
    }
    indexOf(editor, editors, options) {
        const editorIndex = this.model.indexOf(editor, editors, options);
        if (editorIndex < 0 || editorIndex >= this.model.stickyCount) {
            return -1;
        }
        return editorIndex;
    }
    contains(candidate, options) {
        const editorIndex = this.model.indexOf(candidate, undefined, options);
        return editorIndex >= 0 && editorIndex < this.model.stickyCount;
    }
    filter(candidateOrIndex) {
        return this.model.isSticky(candidateOrIndex);
    }
}
export class UnstickyEditorGroupModel extends FilteredEditorGroupModel {
    get count() {
        return this.model.count - this.model.stickyCount;
    }
    get stickyCount() {
        return 0;
    }
    isSticky(editorOrIndex) {
        return false;
    }
    getEditors(order, options) {
        if (order === 1 /* EditorsOrder.SEQUENTIAL */) {
            return this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */).slice(this.model.stickyCount);
        }
        return super.getEditors(order, options);
    }
    getEditorByIndex(index) {
        return index >= 0 ? this.model.getEditorByIndex(index + this.model.stickyCount) : undefined;
    }
    indexOf(editor, editors, options) {
        const editorIndex = this.model.indexOf(editor, editors, options);
        if (editorIndex < this.model.stickyCount || editorIndex >= this.model.count) {
            return -1;
        }
        return editorIndex - this.model.stickyCount;
    }
    contains(candidate, options) {
        const editorIndex = this.model.indexOf(candidate, undefined, options);
        return editorIndex >= this.model.stickyCount && editorIndex < this.model.count;
    }
    filter(candidateOrIndex) {
        return !this.model.isSticky(candidateOrIndex);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyZWRFZGl0b3JHcm91cE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci9maWx0ZXJlZEVkaXRvckdyb3VwTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RCxNQUFlLHdCQUF5QixTQUFRLFVBQVU7SUFJekQsWUFBK0IsS0FBZ0M7UUFDOUQsS0FBSyxFQUFFLENBQUE7UUFEdUIsVUFBSyxHQUFMLEtBQUssQ0FBMkI7UUFIOUMsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBMEIsQ0FBQyxDQUFBO1FBQ2pGLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFLdkQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDakMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUE7WUFDbEQsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO29CQUNwQyxPQUFNLENBQUMsb0NBQW9DO2dCQUM1QyxDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLEVB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
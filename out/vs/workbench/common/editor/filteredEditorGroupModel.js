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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyZWRFZGl0b3JHcm91cE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvZmlsdGVyZWRFZGl0b3JHcm91cE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFOUQsTUFBZSx3QkFBeUIsU0FBUSxVQUFVO0lBSXpELFlBQStCLEtBQWdDO1FBQzlELEtBQUssRUFBRSxDQUFBO1FBRHVCLFVBQUssR0FBTCxLQUFLLENBQTJCO1FBSDlDLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTBCLENBQUMsQ0FBQTtRQUNqRixxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1FBS3ZELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFBO1lBQ2xELElBQUksZ0JBQWdCLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztvQkFDcEMsT0FBTSxDQUFDLG9DQUFvQztnQkFDNUMsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9CLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxFQUFFO1FB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
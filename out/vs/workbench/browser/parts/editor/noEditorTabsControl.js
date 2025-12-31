/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/singleeditortabscontrol.css';
import { EditorTabsControl } from './editorTabsControl.js';
import { Dimension } from '../../../../base/browser/dom.js';
export class NoEditorTabsControl extends EditorTabsControl {
    constructor() {
        super(...arguments);
        this.activeEditor = null;
    }
    prepareEditorActions(editorActions) {
        return {
            primary: [],
            secondary: [],
        };
    }
    openEditor(editor) {
        return this.handleOpenedEditors();
    }
    openEditors(editors) {
        return this.handleOpenedEditors();
    }
    handleOpenedEditors() {
        const didChange = this.activeEditorChanged();
        this.activeEditor = this.tabsModel.activeEditor;
        return didChange;
    }
    activeEditorChanged() {
        if ((!this.activeEditor && this.tabsModel.activeEditor) || // active editor changed from null => editor
            (this.activeEditor && !this.tabsModel.activeEditor) || // active editor changed from editor => null
            !this.activeEditor ||
            !this.tabsModel.isActive(this.activeEditor) // active editor changed from editorA => editorB
        ) {
            return true;
        }
        return false;
    }
    beforeCloseEditor(editor) { }
    closeEditor(editor) {
        this.handleClosedEditors();
    }
    closeEditors(editors) {
        this.handleClosedEditors();
    }
    handleClosedEditors() {
        this.activeEditor = this.tabsModel.activeEditor;
    }
    moveEditor(editor, fromIndex, targetIndex) { }
    pinEditor(editor) { }
    stickEditor(editor) { }
    unstickEditor(editor) { }
    setActive(isActive) { }
    updateEditorSelections() { }
    updateEditorLabel(editor) { }
    updateEditorDirty(editor) { }
    getHeight() {
        return 0;
    }
    layout(dimensions) {
        return new Dimension(dimensions.container.width, this.getHeight());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9FZGl0b3JUYWJzQ29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9ub0VkaXRvclRhYnNDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8scUNBQXFDLENBQUE7QUFFNUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBSTNELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxpQkFBaUI7SUFBMUQ7O1FBQ1MsaUJBQVksR0FBdUIsSUFBSSxDQUFBO0lBd0VoRCxDQUFDO0lBdEVVLG9CQUFvQixDQUFDLGFBQThCO1FBQzVELE9BQU87WUFDTixPQUFPLEVBQUUsRUFBRTtZQUNYLFNBQVMsRUFBRSxFQUFFO1NBQ2IsQ0FBQTtJQUNGLENBQUM7SUFFRCxVQUFVLENBQUMsTUFBbUI7UUFDN0IsT0FBTyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsV0FBVyxDQUFDLE9BQXNCO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7SUFDbEMsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUM1QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFBO1FBQy9DLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsSUFDQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLDRDQUE0QztZQUNuRyxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLDRDQUE0QztZQUNuRyxDQUFDLElBQUksQ0FBQyxZQUFZO1lBQ2xCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLGdEQUFnRDtVQUMzRixDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsaUJBQWlCLENBQUMsTUFBbUIsSUFBUyxDQUFDO0lBRS9DLFdBQVcsQ0FBQyxNQUFtQjtRQUM5QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0lBRUQsWUFBWSxDQUFDLE9BQXNCO1FBQ2xDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO0lBQzNCLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQTtJQUNoRCxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQW1CLEVBQUUsU0FBaUIsRUFBRSxXQUFtQixJQUFTLENBQUM7SUFFaEYsU0FBUyxDQUFDLE1BQW1CLElBQVMsQ0FBQztJQUV2QyxXQUFXLENBQUMsTUFBbUIsSUFBUyxDQUFDO0lBRXpDLGFBQWEsQ0FBQyxNQUFtQixJQUFTLENBQUM7SUFFM0MsU0FBUyxDQUFDLFFBQWlCLElBQVMsQ0FBQztJQUVyQyxzQkFBc0IsS0FBVSxDQUFDO0lBRWpDLGlCQUFpQixDQUFDLE1BQW1CLElBQVMsQ0FBQztJQUUvQyxpQkFBaUIsQ0FBQyxNQUFtQixJQUFTLENBQUM7SUFFL0MsU0FBUztRQUNSLE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUF5QztRQUMvQyxPQUFPLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUM7Q0FDRCJ9
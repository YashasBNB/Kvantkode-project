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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9FZGl0b3JUYWJzQ29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL25vRWRpdG9yVGFic0NvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxxQ0FBcUMsQ0FBQTtBQUU1QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFJM0QsTUFBTSxPQUFPLG1CQUFvQixTQUFRLGlCQUFpQjtJQUExRDs7UUFDUyxpQkFBWSxHQUF1QixJQUFJLENBQUE7SUF3RWhELENBQUM7SUF0RVUsb0JBQW9CLENBQUMsYUFBOEI7UUFDNUQsT0FBTztZQUNOLE9BQU8sRUFBRSxFQUFFO1lBQ1gsU0FBUyxFQUFFLEVBQUU7U0FDYixDQUFBO0lBQ0YsQ0FBQztJQUVELFVBQVUsQ0FBQyxNQUFtQjtRQUM3QixPQUFPLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFRCxXQUFXLENBQUMsT0FBc0I7UUFDakMsT0FBTyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQzVDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUE7UUFDL0MsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixJQUNDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksNENBQTRDO1lBQ25HLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksNENBQTRDO1lBQ25HLENBQUMsSUFBSSxDQUFDLFlBQVk7WUFDbEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsZ0RBQWdEO1VBQzNGLENBQUM7WUFDRixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxNQUFtQixJQUFTLENBQUM7SUFFL0MsV0FBVyxDQUFDLE1BQW1CO1FBQzlCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO0lBQzNCLENBQUM7SUFFRCxZQUFZLENBQUMsT0FBc0I7UUFDbEMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7SUFDM0IsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFBO0lBQ2hELENBQUM7SUFFRCxVQUFVLENBQUMsTUFBbUIsRUFBRSxTQUFpQixFQUFFLFdBQW1CLElBQVMsQ0FBQztJQUVoRixTQUFTLENBQUMsTUFBbUIsSUFBUyxDQUFDO0lBRXZDLFdBQVcsQ0FBQyxNQUFtQixJQUFTLENBQUM7SUFFekMsYUFBYSxDQUFDLE1BQW1CLElBQVMsQ0FBQztJQUUzQyxTQUFTLENBQUMsUUFBaUIsSUFBUyxDQUFDO0lBRXJDLHNCQUFzQixLQUFVLENBQUM7SUFFakMsaUJBQWlCLENBQUMsTUFBbUIsSUFBUyxDQUFDO0lBRS9DLGlCQUFpQixDQUFDLE1BQW1CLElBQVMsQ0FBQztJQUUvQyxTQUFTO1FBQ1IsT0FBTyxDQUFDLENBQUE7SUFDVCxDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQXlDO1FBQy9DLE9BQU8sSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQztDQUNEIn0=
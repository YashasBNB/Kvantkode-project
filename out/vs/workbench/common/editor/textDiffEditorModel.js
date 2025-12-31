/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DiffEditorModel } from './diffEditorModel.js';
/**
 * The base text editor model for the diff editor. It is made up of two text editor models, the original version
 * and the modified version.
 */
export class TextDiffEditorModel extends DiffEditorModel {
    get originalModel() {
        return this._originalModel;
    }
    get modifiedModel() {
        return this._modifiedModel;
    }
    get textDiffEditorModel() {
        return this._textDiffEditorModel;
    }
    constructor(originalModel, modifiedModel) {
        super(originalModel, modifiedModel);
        this._textDiffEditorModel = undefined;
        this._originalModel = originalModel;
        this._modifiedModel = modifiedModel;
        this.updateTextDiffEditorModel();
    }
    async resolve() {
        await super.resolve();
        this.updateTextDiffEditorModel();
    }
    updateTextDiffEditorModel() {
        if (this.originalModel?.isResolved() && this.modifiedModel?.isResolved()) {
            // Create new
            if (!this._textDiffEditorModel) {
                this._textDiffEditorModel = {
                    original: this.originalModel.textEditorModel,
                    modified: this.modifiedModel.textEditorModel,
                };
            }
            // Update existing
            else {
                this._textDiffEditorModel.original = this.originalModel.textEditorModel;
                this._textDiffEditorModel.modified = this.modifiedModel.textEditorModel;
            }
        }
    }
    isResolved() {
        return !!this._textDiffEditorModel;
    }
    isReadonly() {
        return !!this.modifiedModel && this.modifiedModel.isReadonly();
    }
    dispose() {
        // Free the diff editor model but do not propagate the dispose() call to the two models
        // inside. We never created the two models (original and modified) so we can not dispose
        // them without sideeffects. Rather rely on the models getting disposed when their related
        // inputs get disposed from the diffEditorInput.
        this._textDiffEditorModel = undefined;
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dERpZmZFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL3RleHREaWZmRWRpdG9yTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBR3REOzs7R0FHRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxlQUFlO0lBRXZELElBQWEsYUFBYTtRQUN6QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUdELElBQWEsYUFBYTtRQUN6QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUdELElBQUksbUJBQW1CO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ2pDLENBQUM7SUFFRCxZQUFZLGFBQWtDLEVBQUUsYUFBa0M7UUFDakYsS0FBSyxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQU41Qix5QkFBb0IsR0FBaUMsU0FBUyxDQUFBO1FBUXJFLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFBO1FBQ25DLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFBO1FBRW5DLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFUSxLQUFLLENBQUMsT0FBTztRQUNyQixNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVyQixJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBRU8seUJBQXlCO1FBQ2hDLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDMUUsYUFBYTtZQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHO29CQUMzQixRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlO29CQUM1QyxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlO2lCQUM1QyxDQUFBO1lBQ0YsQ0FBQztZQUVELGtCQUFrQjtpQkFDYixDQUFDO2dCQUNMLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUE7Z0JBQ3ZFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUE7WUFDeEUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRVEsVUFBVTtRQUNsQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUE7SUFDbkMsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDL0QsQ0FBQztJQUVRLE9BQU87UUFDZix1RkFBdUY7UUFDdkYsd0ZBQXdGO1FBQ3hGLDBGQUEwRjtRQUMxRixnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFNBQVMsQ0FBQTtRQUVyQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNEIn0=
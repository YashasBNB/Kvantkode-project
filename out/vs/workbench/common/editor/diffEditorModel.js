/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorModel } from './editorModel.js';
/**
 * The base editor model for the diff editor. It is made up of two editor models, the original version
 * and the modified version.
 */
export class DiffEditorModel extends EditorModel {
    get originalModel() {
        return this._originalModel;
    }
    get modifiedModel() {
        return this._modifiedModel;
    }
    constructor(originalModel, modifiedModel) {
        super();
        this._originalModel = originalModel;
        this._modifiedModel = modifiedModel;
    }
    async resolve() {
        await Promise.all([this._originalModel?.resolve(), this._modifiedModel?.resolve()]);
    }
    isResolved() {
        return !!(this._originalModel?.isResolved() && this._modifiedModel?.isResolved());
    }
    dispose() {
        // Do not propagate the dispose() call to the two models inside. We never created the two models
        // (original and modified) so we can not dispose them without sideeffects. Rather rely on the
        // models getting disposed when their related inputs get disposed from the diffEditorInput.
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci9kaWZmRWRpdG9yTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRzlDOzs7R0FHRztBQUNILE1BQU0sT0FBTyxlQUFnQixTQUFRLFdBQVc7SUFFL0MsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBR0QsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsWUFDQyxhQUFpRCxFQUNqRCxhQUFpRDtRQUVqRCxLQUFLLEVBQUUsQ0FBQTtRQUVQLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFBO1FBQ25DLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFBO0lBQ3BDLENBQUM7SUFFUSxLQUFLLENBQUMsT0FBTztRQUNyQixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFFUSxVQUFVO1FBQ2xCLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7SUFDbEYsQ0FBQztJQUVRLE9BQU87UUFDZixnR0FBZ0c7UUFDaEcsNkZBQTZGO1FBQzdGLDJGQUEyRjtRQUUzRixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNEIn0=
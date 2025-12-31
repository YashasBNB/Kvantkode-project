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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvZGlmZkVkaXRvck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUc5Qzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxXQUFXO0lBRS9DLElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUdELElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUVELFlBQ0MsYUFBaUQsRUFDakQsYUFBaUQ7UUFFakQsS0FBSyxFQUFFLENBQUE7UUFFUCxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQTtRQUNuQyxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQTtJQUNwQyxDQUFDO0lBRVEsS0FBSyxDQUFDLE9BQU87UUFDckIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNwRixDQUFDO0lBRVEsVUFBVTtRQUNsQixPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsVUFBVSxFQUFFLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFBO0lBQ2xGLENBQUM7SUFFUSxPQUFPO1FBQ2YsZ0dBQWdHO1FBQ2hHLDZGQUE2RjtRQUM3RiwyRkFBMkY7UUFFM0YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7Q0FDRCJ9
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { RENDERER_NOT_AVAILABLE, } from '../../common/notebookCommon.js';
let handle = 0;
export class CellOutputViewModel extends Disposable {
    setVisible(visible = true, force = false) {
        if (!visible && this.alwaysShow) {
            // we are forced to show, so no-op
            return;
        }
        if (force && visible) {
            this.alwaysShow = true;
        }
        this.visible.set(visible, undefined);
    }
    get model() {
        return this._outputRawData;
    }
    get pickedMimeType() {
        return this._pickedMimeType;
    }
    set pickedMimeType(value) {
        this._pickedMimeType = value;
    }
    constructor(cellViewModel, _outputRawData, _notebookService) {
        super();
        this.cellViewModel = cellViewModel;
        this._outputRawData = _outputRawData;
        this._notebookService = _notebookService;
        this._onDidResetRendererEmitter = this._register(new Emitter());
        this.onDidResetRenderer = this._onDidResetRendererEmitter.event;
        this.alwaysShow = false;
        this.visible = observableValue('outputVisible', false);
        this.outputHandle = handle++;
    }
    hasMultiMimeType() {
        if (this._outputRawData.outputs.length < 2) {
            return false;
        }
        const firstMimeType = this._outputRawData.outputs[0].mime;
        return this._outputRawData.outputs.some((output) => output.mime !== firstMimeType);
    }
    resolveMimeTypes(textModel, kernelProvides) {
        const mimeTypes = this._notebookService.getOutputMimeTypeInfo(textModel, kernelProvides, this.model);
        const index = mimeTypes.findIndex((mimeType) => mimeType.rendererId !== RENDERER_NOT_AVAILABLE && mimeType.isTrusted);
        return [mimeTypes, Math.max(index, 0)];
    }
    resetRenderer() {
        // reset the output renderer
        this._pickedMimeType = undefined;
        this.model.bumpVersion();
        this._onDidResetRendererEmitter.fire();
    }
    toRawJSON() {
        return {
            outputs: this._outputRawData.outputs,
            // TODO@rebronix, no id, right?
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL2NlbGxPdXRwdXRWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFHMUUsT0FBTyxFQUdOLHNCQUFzQixHQUN0QixNQUFNLGdDQUFnQyxDQUFBO0FBR3ZDLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUNkLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxVQUFVO0lBTWxELFVBQVUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxFQUFFLFFBQWlCLEtBQUs7UUFDaEQsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakMsa0NBQWtDO1lBQ2xDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxLQUFLLElBQUksT0FBTyxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7UUFDdkIsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBR0QsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFBO0lBQzNCLENBQUM7SUFHRCxJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFFRCxJQUFJLGNBQWMsQ0FBQyxLQUFtQztRQUNyRCxJQUFJLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQTtJQUM3QixDQUFDO0lBRUQsWUFDVSxhQUFvQyxFQUM1QixjQUEyQixFQUMzQixnQkFBa0M7UUFFbkQsS0FBSyxFQUFFLENBQUE7UUFKRSxrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7UUFDNUIsbUJBQWMsR0FBZCxjQUFjLENBQWE7UUFDM0IscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQW5DNUMsK0JBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDL0QsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQTtRQUUzRCxlQUFVLEdBQUcsS0FBSyxDQUFBO1FBQzFCLFlBQU8sR0FBRyxlQUFlLENBQVUsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBYzFELGlCQUFZLEdBQUcsTUFBTSxFQUFFLENBQUE7SUFvQnZCLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1QyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDekQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLENBQUE7SUFDbkYsQ0FBQztJQUVELGdCQUFnQixDQUNmLFNBQTRCLEVBQzVCLGNBQTZDO1FBRTdDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FDNUQsU0FBUyxFQUNULGNBQWMsRUFDZCxJQUFJLENBQUMsS0FBSyxDQUNWLENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsU0FBUyxDQUNoQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsS0FBSyxzQkFBc0IsSUFBSSxRQUFRLENBQUMsU0FBUyxDQUNsRixDQUFBO1FBRUQsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxhQUFhO1FBQ1osNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO1FBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDeEIsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxTQUFTO1FBQ1IsT0FBTztZQUNOLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU87WUFDcEMsK0JBQStCO1NBQy9CLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==
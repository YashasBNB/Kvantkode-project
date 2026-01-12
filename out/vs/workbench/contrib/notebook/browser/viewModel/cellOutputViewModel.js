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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvY2VsbE91dHB1dFZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUcxRSxPQUFPLEVBR04sc0JBQXNCLEdBQ3RCLE1BQU0sZ0NBQWdDLENBQUE7QUFHdkMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ2QsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFVBQVU7SUFNbEQsVUFBVSxDQUFDLE9BQU8sR0FBRyxJQUFJLEVBQUUsUUFBaUIsS0FBSztRQUNoRCxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQyxrQ0FBa0M7WUFDbEMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLEtBQUssSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQTtRQUN2QixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFHRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUdELElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUVELElBQUksY0FBYyxDQUFDLEtBQW1DO1FBQ3JELElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFBO0lBQzdCLENBQUM7SUFFRCxZQUNVLGFBQW9DLEVBQzVCLGNBQTJCLEVBQzNCLGdCQUFrQztRQUVuRCxLQUFLLEVBQUUsQ0FBQTtRQUpFLGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtRQUM1QixtQkFBYyxHQUFkLGNBQWMsQ0FBYTtRQUMzQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBbkM1QywrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUMvRCx1QkFBa0IsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO1FBRTNELGVBQVUsR0FBRyxLQUFLLENBQUE7UUFDMUIsWUFBTyxHQUFHLGVBQWUsQ0FBVSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFjMUQsaUJBQVksR0FBRyxNQUFNLEVBQUUsQ0FBQTtJQW9CdkIsQ0FBQztJQUVELGdCQUFnQjtRQUNmLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUN6RCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxhQUFhLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBRUQsZ0JBQWdCLENBQ2YsU0FBNEIsRUFDNUIsY0FBNkM7UUFFN0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixDQUM1RCxTQUFTLEVBQ1QsY0FBYyxFQUNkLElBQUksQ0FBQyxLQUFLLENBQ1YsQ0FBQTtRQUNELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQ2hDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxLQUFLLHNCQUFzQixJQUFJLFFBQVEsQ0FBQyxTQUFTLENBQ2xGLENBQUE7UUFFRCxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELGFBQWE7UUFDWiw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUE7UUFDaEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUN4QixJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDdkMsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPO1lBQ04sT0FBTyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTztZQUNwQywrQkFBK0I7U0FDL0IsQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9
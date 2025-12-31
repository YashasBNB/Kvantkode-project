/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { shouldSynchronizeModel } from '../../../editor/common/model.js';
import { localize } from '../../../nls.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { extHostCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ITextFileService, } from '../../services/textfile/common/textfiles.js';
import { ExtHostContext } from '../common/extHost.protocol.js';
import { raceCancellationError } from '../../../base/common/async.js';
class ExtHostSaveParticipant {
    constructor(extHostContext) {
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocumentSaveParticipant);
    }
    async participate(editorModel, context, _progress, token) {
        if (!editorModel.textEditorModel || !shouldSynchronizeModel(editorModel.textEditorModel)) {
            // the model never made it to the extension
            // host meaning we cannot participate in its save
            return undefined;
        }
        const p = new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error(localize('timeout.onWillSave', 'Aborted onWillSaveTextDocument-event after 1750ms'))), 1750);
            this._proxy
                .$participateInSave(editorModel.resource, context.reason)
                .then((values) => {
                if (!values.every((success) => success)) {
                    return Promise.reject(new Error('listener failed'));
                }
                return undefined;
            })
                .then(resolve, reject);
        });
        return raceCancellationError(p, token);
    }
}
// The save participant can change a model before its saved to support various scenarios like trimming trailing whitespace
let SaveParticipant = class SaveParticipant {
    constructor(extHostContext, instantiationService, _textFileService) {
        this._textFileService = _textFileService;
        this._saveParticipantDisposable = this._textFileService.files.addSaveParticipant(instantiationService.createInstance(ExtHostSaveParticipant, extHostContext));
    }
    dispose() {
        this._saveParticipantDisposable.dispose();
    }
};
SaveParticipant = __decorate([
    extHostCustomer,
    __param(1, IInstantiationService),
    __param(2, ITextFileService)
], SaveParticipant);
export { SaveParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNhdmVQYXJ0aWNpcGFudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkU2F2ZVBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUUvRixPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUVOLGdCQUFnQixHQUdoQixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQXVDLE1BQU0sK0JBQStCLENBQUE7QUFFbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckUsTUFBTSxzQkFBc0I7SUFHM0IsWUFBWSxjQUErQjtRQUMxQyxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLDhCQUE4QixDQUFDLENBQUE7SUFDckYsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQ2hCLFdBQWlDLEVBQ2pDLE9BQXdDLEVBQ3hDLFNBQW1DLEVBQ25DLEtBQXdCO1FBRXhCLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDMUYsMkNBQTJDO1lBQzNDLGlEQUFpRDtZQUNqRCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDOUMsVUFBVSxDQUNULEdBQUcsRUFBRSxDQUNKLE1BQU0sQ0FDTCxJQUFJLEtBQUssQ0FDUixRQUFRLENBQUMsb0JBQW9CLEVBQUUsbURBQW1ELENBQUMsQ0FDbkYsQ0FDRCxFQUNGLElBQUksQ0FDSixDQUFBO1lBQ0QsSUFBSSxDQUFDLE1BQU07aUJBQ1Qsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDO2lCQUN4RCxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ3pDLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7Z0JBQ3BELENBQUM7Z0JBQ0QsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQyxDQUFDO2lCQUNELElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDeEIsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLHFCQUFxQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0NBQ0Q7QUFFRCwwSEFBMEg7QUFFbkgsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZTtJQUczQixZQUNDLGNBQStCLEVBQ1Isb0JBQTJDLEVBQy9CLGdCQUFrQztRQUFsQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBRXJFLElBQUksQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUMvRSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxDQUFDLENBQzNFLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0NBQ0QsQ0FBQTtBQWhCWSxlQUFlO0lBRDNCLGVBQWU7SUFNYixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0JBQWdCLENBQUE7R0FOTixlQUFlLENBZ0IzQiJ9
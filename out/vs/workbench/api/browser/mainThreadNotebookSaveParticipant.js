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
import { localize } from '../../../nls.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { extHostCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, } from '../common/extHost.protocol.js';
import { raceCancellationError } from '../../../base/common/async.js';
import { IWorkingCopyFileService, } from '../../services/workingCopy/common/workingCopyFileService.js';
import { NotebookFileWorkingCopyModel } from '../../contrib/notebook/common/notebookEditorModel.js';
class ExtHostNotebookDocumentSaveParticipant {
    constructor(extHostContext) {
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebookDocumentSaveParticipant);
    }
    async participate(workingCopy, context, _progress, token) {
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return undefined;
        }
        let _warningTimeout;
        const p = new Promise((resolve, reject) => {
            _warningTimeout = setTimeout(() => reject(new Error(localize('timeout.onWillSave', 'Aborted onWillSaveNotebookDocument-event after 1750ms'))), 1750);
            this._proxy
                .$participateInSave(workingCopy.resource, context.reason, token)
                .then((_) => {
                clearTimeout(_warningTimeout);
                return undefined;
            })
                .then(resolve, reject);
        });
        return raceCancellationError(p, token);
    }
}
let SaveParticipant = class SaveParticipant {
    constructor(extHostContext, instantiationService, workingCopyFileService) {
        this.workingCopyFileService = workingCopyFileService;
        this._saveParticipantDisposable = this.workingCopyFileService.addSaveParticipant(instantiationService.createInstance(ExtHostNotebookDocumentSaveParticipant, extHostContext));
    }
    dispose() {
        this._saveParticipantDisposable.dispose();
    }
};
SaveParticipant = __decorate([
    extHostCustomer,
    __param(1, IInstantiationService),
    __param(2, IWorkingCopyFileService)
], SaveParticipant);
export { SaveParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rU2F2ZVBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWROb3RlYm9va1NhdmVQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFL0YsT0FBTyxFQUNOLGVBQWUsR0FFZixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRSxPQUFPLEVBR04sdUJBQXVCLEdBQ3ZCLE1BQU0sNkRBQTZELENBQUE7QUFLcEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFbkcsTUFBTSxzQ0FBc0M7SUFHM0MsWUFBWSxjQUErQjtRQUMxQyxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLHNDQUFzQyxDQUFDLENBQUE7SUFDN0YsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQ2hCLFdBQWdFLEVBQ2hFLE9BQXFELEVBQ3JELFNBQW1DLEVBQ25DLEtBQXdCO1FBRXhCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxZQUFZLDRCQUE0QixDQUFDLEVBQUUsQ0FBQztZQUN4RixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsSUFBSSxlQUFvQixDQUFBO1FBRXhCLE1BQU0sQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzlDLGVBQWUsR0FBRyxVQUFVLENBQzNCLEdBQUcsRUFBRSxDQUNKLE1BQU0sQ0FDTCxJQUFJLEtBQUssQ0FDUixRQUFRLENBQ1Asb0JBQW9CLEVBQ3BCLHVEQUF1RCxDQUN2RCxDQUNELENBQ0QsRUFDRixJQUFJLENBQ0osQ0FBQTtZQUNELElBQUksQ0FBQyxNQUFNO2lCQUNULGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUM7aUJBQy9ELElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNYLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFDN0IsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQyxDQUFDO2lCQUNELElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDeEIsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLHFCQUFxQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0NBQ0Q7QUFHTSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFlO0lBRzNCLFlBQ0MsY0FBK0IsRUFDUixvQkFBMkMsRUFDeEIsc0JBQStDO1FBQS9DLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFFekYsSUFBSSxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FDL0Usb0JBQW9CLENBQUMsY0FBYyxDQUFDLHNDQUFzQyxFQUFFLGNBQWMsQ0FBQyxDQUMzRixDQUFBO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDMUMsQ0FBQztDQUNELENBQUE7QUFoQlksZUFBZTtJQUQzQixlQUFlO0lBTWIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHVCQUF1QixDQUFBO0dBTmIsZUFBZSxDQWdCM0IifQ==
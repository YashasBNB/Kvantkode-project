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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rU2F2ZVBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZE5vdGVib29rU2F2ZVBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUUvRixPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLGNBQWMsR0FFZCxNQUFNLCtCQUErQixDQUFBO0FBRXRDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JFLE9BQU8sRUFHTix1QkFBdUIsR0FDdkIsTUFBTSw2REFBNkQsQ0FBQTtBQUtwRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVuRyxNQUFNLHNDQUFzQztJQUczQyxZQUFZLGNBQStCO1FBQzFDLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsc0NBQXNDLENBQUMsQ0FBQTtJQUM3RixDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FDaEIsV0FBZ0UsRUFDaEUsT0FBcUQsRUFDckQsU0FBbUMsRUFDbkMsS0FBd0I7UUFFeEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLFlBQVksNEJBQTRCLENBQUMsRUFBRSxDQUFDO1lBQ3hGLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUFJLGVBQW9CLENBQUE7UUFFeEIsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDOUMsZUFBZSxHQUFHLFVBQVUsQ0FDM0IsR0FBRyxFQUFFLENBQ0osTUFBTSxDQUNMLElBQUksS0FBSyxDQUNSLFFBQVEsQ0FDUCxvQkFBb0IsRUFDcEIsdURBQXVELENBQ3ZELENBQ0QsQ0FDRCxFQUNGLElBQUksQ0FDSixDQUFBO1lBQ0QsSUFBSSxDQUFDLE1BQU07aUJBQ1Qsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQztpQkFDL0QsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ1gsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUM3QixPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDLENBQUM7aUJBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN4QixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8scUJBQXFCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7Q0FDRDtBQUdNLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWU7SUFHM0IsWUFDQyxjQUErQixFQUNSLG9CQUEyQyxFQUN4QixzQkFBK0M7UUFBL0MsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUV6RixJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixDQUMvRSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0NBQXNDLEVBQUUsY0FBYyxDQUFDLENBQzNGLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0NBQ0QsQ0FBQTtBQWhCWSxlQUFlO0lBRDNCLGVBQWU7SUFNYixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsdUJBQXVCLENBQUE7R0FOYixlQUFlLENBZ0IzQiJ9
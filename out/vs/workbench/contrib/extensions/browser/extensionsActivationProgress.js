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
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { localize } from '../../../../nls.js';
import { DeferredPromise, timeout } from '../../../../base/common/async.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
let ExtensionActivationProgress = class ExtensionActivationProgress {
    constructor(extensionService, progressService, logService) {
        const options = {
            location: 10 /* ProgressLocation.Window */,
            title: localize('activation', 'Activating Extensions...'),
        };
        let deferred;
        let count = 0;
        this._listener = extensionService.onWillActivateByEvent((e) => {
            logService.trace('onWillActivateByEvent: ', e.event);
            if (!deferred) {
                deferred = new DeferredPromise();
                progressService.withProgress(options, (_) => deferred.p);
            }
            count++;
            Promise.race([e.activation, timeout(5000, CancellationToken.None)]).finally(() => {
                if (--count === 0) {
                    deferred.complete(undefined);
                    deferred = undefined;
                }
            });
        });
    }
    dispose() {
        this._listener.dispose();
    }
};
ExtensionActivationProgress = __decorate([
    __param(0, IExtensionService),
    __param(1, IProgressService),
    __param(2, ILogService)
], ExtensionActivationProgress);
export { ExtensionActivationProgress };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0FjdGl2YXRpb25Qcm9ncmVzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zQWN0aXZhdGlvblByb2dyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFcEUsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBMkI7SUFHdkMsWUFDb0IsZ0JBQW1DLEVBQ3BDLGVBQWlDLEVBQ3RDLFVBQXVCO1FBRXBDLE1BQU0sT0FBTyxHQUFHO1lBQ2YsUUFBUSxrQ0FBeUI7WUFDakMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsMEJBQTBCLENBQUM7U0FDekQsQ0FBQTtRQUVELElBQUksUUFBMEMsQ0FBQTtRQUM5QyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUE7UUFFYixJQUFJLENBQUMsU0FBUyxHQUFHLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDN0QsVUFBVSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFcEQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLFFBQVEsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO2dCQUNoQyxlQUFlLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsUUFBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFELENBQUM7WUFFRCxLQUFLLEVBQUUsQ0FBQTtZQUVQLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7Z0JBQ2hGLElBQUksRUFBRSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ25CLFFBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQzdCLFFBQVEsR0FBRyxTQUFTLENBQUE7Z0JBQ3JCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3pCLENBQUM7Q0FDRCxDQUFBO0FBdENZLDJCQUEyQjtJQUlyQyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxXQUFXLENBQUE7R0FORCwyQkFBMkIsQ0FzQ3ZDIn0=
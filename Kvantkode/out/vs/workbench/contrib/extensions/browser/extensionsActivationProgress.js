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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0FjdGl2YXRpb25Qcm9ncmVzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvbnNBY3RpdmF0aW9uUHJvZ3Jlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVwRSxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUEyQjtJQUd2QyxZQUNvQixnQkFBbUMsRUFDcEMsZUFBaUMsRUFDdEMsVUFBdUI7UUFFcEMsTUFBTSxPQUFPLEdBQUc7WUFDZixRQUFRLGtDQUF5QjtZQUNqQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSwwQkFBMEIsQ0FBQztTQUN6RCxDQUFBO1FBRUQsSUFBSSxRQUEwQyxDQUFBO1FBQzlDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUViLElBQUksQ0FBQyxTQUFTLEdBQUcsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM3RCxVQUFVLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUVwRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsUUFBUSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7Z0JBQ2hDLGVBQWUsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUQsQ0FBQztZQUVELEtBQUssRUFBRSxDQUFBO1lBRVAsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtnQkFDaEYsSUFBSSxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDbkIsUUFBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDN0IsUUFBUSxHQUFHLFNBQVMsQ0FBQTtnQkFDckIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDekIsQ0FBQztDQUNELENBQUE7QUF0Q1ksMkJBQTJCO0lBSXJDLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLFdBQVcsQ0FBQTtHQU5ELDJCQUEyQixDQXNDdkMifQ==
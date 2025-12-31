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
import { Disposable, DisposableStore, } from '../../../../../../base/common/lifecycle.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../../../common/contributions.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { INotebookLoggingService } from '../../../common/notebookLoggingService.js';
import { IExtensionService } from '../../../../../services/extensions/common/extensions.js';
let NotebookKernelDetection = class NotebookKernelDetection extends Disposable {
    constructor(_notebookKernelService, _extensionService, _notebookLoggingService) {
        super();
        this._notebookKernelService = _notebookKernelService;
        this._extensionService = _extensionService;
        this._notebookLoggingService = _notebookLoggingService;
        this._detectionMap = new Map();
        this._localDisposableStore = this._register(new DisposableStore());
        this._registerListeners();
    }
    _registerListeners() {
        this._localDisposableStore.clear();
        this._localDisposableStore.add(this._extensionService.onWillActivateByEvent((e) => {
            if (e.event.startsWith('onNotebook:')) {
                if (this._extensionService.activationEventIsDone(e.event)) {
                    return;
                }
                // parse the event to get the notebook type
                const notebookType = e.event.substring('onNotebook:'.length);
                if (notebookType === '*') {
                    // ignore
                    return;
                }
                let shouldStartDetection = false;
                const extensionStatus = this._extensionService.getExtensionsStatus();
                this._extensionService.extensions.forEach((extension) => {
                    if (extensionStatus[extension.identifier.value].activationTimes) {
                        // already activated
                        return;
                    }
                    if (extension.activationEvents?.includes(e.event)) {
                        shouldStartDetection = true;
                    }
                });
                if (shouldStartDetection && !this._detectionMap.has(notebookType)) {
                    this._notebookLoggingService.debug('KernelDetection', `start extension activation for ${notebookType}`);
                    const task = this._notebookKernelService.registerNotebookKernelDetectionTask({
                        notebookType: notebookType,
                    });
                    this._detectionMap.set(notebookType, task);
                }
            }
        }));
        let timer = null;
        this._localDisposableStore.add(this._extensionService.onDidChangeExtensionsStatus(() => {
            if (timer) {
                clearTimeout(timer);
            }
            // activation state might not be updated yet, postpone to next frame
            timer = setTimeout(() => {
                const taskToDelete = [];
                for (const [notebookType, task] of this._detectionMap) {
                    if (this._extensionService.activationEventIsDone(`onNotebook:${notebookType}`)) {
                        this._notebookLoggingService.debug('KernelDetection', `finish extension activation for ${notebookType}`);
                        taskToDelete.push(notebookType);
                        task.dispose();
                    }
                }
                taskToDelete.forEach((notebookType) => {
                    this._detectionMap.delete(notebookType);
                });
            });
        }));
        this._localDisposableStore.add({
            dispose: () => {
                if (timer) {
                    clearTimeout(timer);
                }
            },
        });
    }
};
NotebookKernelDetection = __decorate([
    __param(0, INotebookKernelService),
    __param(1, IExtensionService),
    __param(2, INotebookLoggingService)
], NotebookKernelDetection);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NotebookKernelDetection, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxEZXRlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIva2VybmVsRGV0ZWN0aW9uL25vdGVib29rS2VybmVsRGV0ZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxHQUVmLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pGLE9BQU8sRUFHTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDakYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFHM0YsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBSS9DLFlBQ3lCLHNCQUErRCxFQUNwRSxpQkFBcUQsRUFDL0MsdUJBQWlFO1FBRTFGLEtBQUssRUFBRSxDQUFBO1FBSmtDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFDbkQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUM5Qiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQXlCO1FBTm5GLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUE7UUFDckMsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFTN0UsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7SUFDMUIsQ0FBQztJ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
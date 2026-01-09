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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxEZXRlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9rZXJuZWxEZXRlY3Rpb24vbm90ZWJvb2tLZXJuZWxEZXRlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEdBRWYsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakYsT0FBTyxFQUdOLFVBQVUsSUFBSSxtQkFBbUIsR0FDakMsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUczRixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFJL0MsWUFDeUIsc0JBQStELEVBQ3BFLGlCQUFxRCxFQUMvQyx1QkFBaUU7UUFFMUYsS0FBSyxFQUFFLENBQUE7UUFKa0MsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF3QjtRQUNuRCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQzlCLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBeUI7UUFObkYsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQTtRQUNyQywwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQVM3RSxJQUFJLENBQUMsa0JBQWtC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
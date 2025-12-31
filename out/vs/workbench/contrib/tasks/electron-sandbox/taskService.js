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
import * as nls from '../../../../nls.js';
import * as semver from '../../../../base/common/semver/semver.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { ExecutionEngine } from '../common/tasks.js';
import { AbstractTaskService } from '../browser/abstractTaskService.js';
import { ITaskService } from '../common/taskService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { TerminalTaskSystem } from '../browser/terminalTaskSystem.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { ITerminalGroupService, ITerminalService } from '../../terminal/browser/terminal.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService, } from '../../../../platform/workspace/common/workspaceTrust.js';
import { ITerminalProfileResolverService } from '../../terminal/common/terminal.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
let TaskService = class TaskService extends AbstractTaskService {
    constructor(configurationService, markerService, outputService, paneCompositeService, viewsService, commandService, editorService, fileService, contextService, telemetryService, textFileService, lifecycleService, modelService, extensionService, quickInputService, configurationResolverService, terminalService, terminalGroupService, storageService, progressService, openerService, dialogService, notificationService, contextKeyService, environmentService, terminalProfileResolverService, pathService, textModelResolverService, preferencesService, viewDescriptorService, workspaceTrustRequestService, workspaceTrustManagementService, logService, themeService, instantiationService, remoteAgentService, accessibilitySignalService) {
        super(configurationService, markerService, outputService, paneCompositeService, viewsService, commandService, editorService, fileService, contextService, telemetryService, textFileService, modelService, extensionService, quickInputService, configurationResolverService, terminalService, terminalGroupService, storageService, progressService, openerService, dialogService, notificationService, contextKeyService, environmentService, terminalProfileResolverService, pathService, textModelResolverService, preferencesService, viewDescriptorService, workspaceTrustRequestService, workspaceTrustManagementService, logService, themeService, lifecycleService, remoteAgentService, instantiationService);
        this._register(lifecycleService.onBeforeShutdown((event) => event.veto(this.beforeShutdown(), 'veto.tasks')));
    }
    _getTaskSystem() {
        if (this._taskSystem) {
            return this._taskSystem;
        }
        const taskSystem = this._createTerminalTaskSystem();
        this._taskSystem = taskSystem;
        this._taskSystemListeners = [
            this._taskSystem.onDidStateChange((event) => {
                this._taskRunningState.set(this._taskSystem.isActiveSync());
                this._onDidStateChange.fire(event);
            }),
        ];
        return this._taskSystem;
    }
    _computeLegacyConfiguration(workspaceFolder) {
        const { config, hasParseErrors } = this._getConfiguration(workspaceFolder);
        if (hasParseErrors) {
            return Promise.resolve({
                workspaceFolder: workspaceFolder,
                hasErrors: true,
                config: undefined,
            });
        }
        if (config) {
            return Promise.resolve({ workspaceFolder, config, hasErrors: false });
        }
        else {
            return Promise.resolve({
                workspaceFolder: workspaceFolder,
                hasErrors: true,
                config: undefined,
            });
        }
    }
    _versionAndEngineCompatible(filter) {
        const range = filter && filter.version ? filter.version : undefined;
        const engine = this.executionEngine;
        return (range === undefined ||
            (semver.satisfies('0.1.0', range) && engine === ExecutionEngine.Process) ||
            (semver.satisfies('2.0.0', range) && engine === ExecutionEngine.Terminal));
    }
    beforeShutdown() {
        if (!this._taskSystem) {
            return false;
        }
        if (!this._taskSystem.isActiveSync()) {
            return false;
        }
        // The terminal service kills all terminal on shutdown. So there
        // is nothing we can do to prevent this here.
        if (this._taskSystem instanceof TerminalTaskSystem) {
            return false;
        }
        let terminatePromise;
        if (this._taskSystem.canAutoTerminate()) {
            terminatePromise = Promise.resolve({ confirmed: true });
        }
        else {
            terminatePromise = this._dialogService.confirm({
                message: nls.localize('TaskSystem.runningTask', 'There is a task running. Do you want to terminate it?'),
                primaryButton: nls.localize({ key: 'TaskSystem.terminateTask', comment: ['&& denotes a mnemonic'] }, '&&Terminate Task'),
            });
        }
        return terminatePromise.then((res) => {
            if (res.confirmed) {
                return this._taskSystem.terminateAll().then((responses) => {
                    let success = true;
                    let code = undefined;
                    for (const response of responses) {
                        success = success && response.success;
                        // We only have a code in the old output runner which only has one task
                        // So we can use the first code.
                        if (code === undefined && response.code !== undefined) {
                            code = response.code;
                        }
                    }
                    if (success) {
                        this._taskSystem = undefined;
                        this._disposeTaskSystemListeners();
                        return false; // no veto
                    }
                    else if (code && code === 3 /* TerminateResponseCode.ProcessNotFound */) {
                        return this._dialogService
                            .confirm({
                            message: nls.localize('TaskSystem.noProcess', "The launched task doesn't exist anymore. If the task spawned background processes exiting VS Code might result in orphaned processes. To avoid this start the last background process with a wait flag."),
                            primaryButton: nls.localize({ key: 'TaskSystem.exitAnyways', comment: ['&& denotes a mnemonic'] }, '&&Exit Anyways'),
                            type: 'info',
                        })
                            .then((res) => !res.confirmed);
                    }
                    return true; // veto
                }, (err) => {
                    return true; // veto
                });
            }
            return true; // veto
        });
    }
};
TaskService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IMarkerService),
    __param(2, IOutputService),
    __param(3, IPaneCompositePartService),
    __param(4, IViewsService),
    __param(5, ICommandService),
    __param(6, IEditorService),
    __param(7, IFileService),
    __param(8, IWorkspaceContextService),
    __param(9, ITelemetryService),
    __param(10, ITextFileService),
    __param(11, ILifecycleService),
    __param(12, IModelService),
    __param(13, IExtensionService),
    __param(14, IQuickInputService),
    __param(15, IConfigurationResolverService),
    __param(16, ITerminalService),
    __param(17, ITerminalGroupService),
    __param(18, IStorageService),
    __param(19, IProgressService),
    __param(20, IOpenerService),
    __param(21, IDialogService),
    __param(22, INotificationService),
    __param(23, IContextKeyService),
    __param(24, IWorkbenchEnvironmentService),
    __param(25, ITerminalProfileResolverService),
    __param(26, IPathService),
    __param(27, ITextModelService),
    __param(28, IPreferencesService),
    __param(29, IViewDescriptorService),
    __param(30, IWorkspaceTrustRequestService),
    __param(31, IWorkspaceTrustManagementService),
    __param(32, ILogService),
    __param(33, IThemeService),
    __param(34, IInstantiationService),
    __param(35, IRemoteAgentService),
    __param(36, IAccessibilitySignalService)
], TaskService);
export { TaskService };
registerSingleton(ITaskService, TaskService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9lbGVjdHJvbi1zYW5kYm94L3Rhc2tTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLE1BQU0sTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRSxPQUFPLEVBRU4sd0JBQXdCLEdBQ3hCLE1BQU0sb0RBQW9ELENBQUE7QUFFM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXBELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNwRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDckUsT0FBTyxFQUF1QixjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVwRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0s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
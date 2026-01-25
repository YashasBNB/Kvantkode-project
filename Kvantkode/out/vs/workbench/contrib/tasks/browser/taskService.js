/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExecutionEngine } from '../common/tasks.js';
import { AbstractTaskService } from './abstractTaskService.js';
import { ITaskService } from '../common/taskService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
export class TaskService extends AbstractTaskService {
    static { this.ProcessTaskSystemSupportMessage = nls.localize('taskService.processTaskSystem', 'Process task system is not support in the web.'); }
    _getTaskSystem() {
        if (this._taskSystem) {
            return this._taskSystem;
        }
        if (this.executionEngine !== ExecutionEngine.Terminal) {
            throw new Error(TaskService.ProcessTaskSystemSupportMessage);
        }
        this._taskSystem = this._createTerminalTaskSystem();
        this._taskSystemListeners = [
            this._taskSystem.onDidStateChange((event) => {
                this._taskRunningState.set(this._taskSystem.isActiveSync());
                this._onDidStateChange.fire(event);
            }),
        ];
        return this._taskSystem;
    }
    _computeLegacyConfiguration(workspaceFolder) {
        throw new Error(TaskService.ProcessTaskSystemSupportMessage);
    }
    _versionAndEngineCompatible(filter) {
        return this.executionEngine === ExecutionEngine.Terminal;
    }
}
registerSingleton(ITaskService, TaskService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2Jyb3dzZXIvdGFza1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDcEQsT0FBTyxFQUFFLG1CQUFtQixFQUF1QyxNQUFNLDBCQUEwQixDQUFBO0FBQ25HLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNwRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFFaEUsTUFBTSxPQUFPLFdBQVksU0FBUSxtQkFBbUI7YUFDM0Isb0NBQStCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDckUsK0JBQStCLEVBQy9CLGdEQUFnRCxDQUNoRCxDQUFBO0lBRVMsY0FBYztRQUN2QixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDeEIsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdkQsTUFBTSxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQTtRQUNuRCxJQUFJLENBQUMsb0JBQW9CLEdBQUc7WUFDM0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUMzQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtnQkFDNUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNuQyxDQUFDLENBQUM7U0FDRixDQUFBO1FBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFFUywyQkFBMkIsQ0FDcEMsZUFBaUM7UUFFakMsTUFBTSxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRVMsMkJBQTJCLENBQUMsTUFBb0I7UUFDekQsT0FBTyxJQUFJLENBQUMsZUFBZSxLQUFLLGVBQWUsQ0FBQyxRQUFRLENBQUE7SUFDekQsQ0FBQzs7QUFHRixpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxvQ0FBNEIsQ0FBQSJ9
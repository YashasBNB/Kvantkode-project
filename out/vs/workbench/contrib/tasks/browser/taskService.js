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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9icm93c2VyL3Rhc2tTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFHekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxtQkFBbUIsRUFBdUMsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRyxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDcEUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE1BQU0sT0FBTyxXQUFZLFNBQVEsbUJBQW1CO2FBQzNCLG9DQUErQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ3JFLCtCQUErQixFQUMvQixnREFBZ0QsQ0FDaEQsQ0FBQTtJQUVTLGNBQWM7UUFDdkIsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQ3hCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3ZELE1BQU0sSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLCtCQUErQixDQUFDLENBQUE7UUFDN0QsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7UUFDbkQsSUFBSSxDQUFDLG9CQUFvQixHQUFHO1lBQzNCLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDM0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBWSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7Z0JBQzVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbkMsQ0FBQyxDQUFDO1NBQ0YsQ0FBQTtRQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0lBRVMsMkJBQTJCLENBQ3BDLGVBQWlDO1FBRWpDLE1BQU0sSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLCtCQUErQixDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVTLDJCQUEyQixDQUFDLE1BQW9CO1FBQ3pELE9BQU8sSUFBSSxDQUFDLGVBQWUsS0FBSyxlQUFlLENBQUMsUUFBUSxDQUFBO0lBQ3pELENBQUM7O0FBR0YsaUJBQWlCLENBQUMsWUFBWSxFQUFFLFdBQVcsb0NBQTRCLENBQUEifQ==
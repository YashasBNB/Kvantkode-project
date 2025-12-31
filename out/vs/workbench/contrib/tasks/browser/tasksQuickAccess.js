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
var TasksQuickAccessProvider_1;
import { localize } from '../../../../nls.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { PickerQuickAccessProvider, TriggerAction, } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ITaskService } from '../common/taskService.js';
import { CustomTask, ContributedTask, ConfiguringTask } from '../common/tasks.js';
import { TaskQuickPick } from './taskQuickPick.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isString } from '../../../../base/common/types.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let TasksQuickAccessProvider = class TasksQuickAccessProvider extends PickerQuickAccessProvider {
    static { TasksQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'task '; }
    constructor(extensionService, _taskService, _configurationService, _quickInputService, _notificationService, _dialogService, _themeService, _storageService) {
        super(TasksQuickAccessProvider_1.PREFIX, {
            noResultsPick: {
                label: localize('noTaskResults', 'No matching tasks'),
            },
        });
        this._taskService = _taskService;
        this._configurationService = _configurationService;
        this._quickInputService = _quickInputService;
        this._notificationService = _notificationService;
        this._dialogService = _dialogService;
        this._themeService = _themeService;
        this._storageService = _storageService;
    }
    async _getPicks(filter, disposables, token) {
        if (token.isCancellationRequested) {
            return [];
        }
        const taskQuickPick = new TaskQuickPick(this._taskService, this._configurationService, this._quickInputService, this._notificationService, this._themeService, this._dialogService, this._storageService);
        const topLevelPicks = await taskQuickPick.getTopLevelEntries();
        const taskPicks = [];
        for (const entry of topLevelPicks.entries) {
            const highlights = matchesFuzzy(filter, entry.label);
            if (!highlights) {
                continue;
            }
            if (entry.type === 'separator') {
                taskPicks.push(entry);
            }
            const task = entry.task;
            const quickAccessEntry = entry;
            quickAccessEntry.highlights = { label: highlights };
            quickAccessEntry.trigger = (index) => {
                if (index === 1 && quickAccessEntry.buttons?.length === 2) {
                    const key = task && !isString(task) ? task.getKey() : undefined;
                    if (key) {
                        this._taskService.removeRecentlyUsedTask(key);
                    }
                    return TriggerAction.REFRESH_PICKER;
                }
                else {
                    if (ContributedTask.is(task)) {
                        this._taskService.customize(task, undefined, true);
                    }
                    else if (CustomTask.is(task)) {
                        this._taskService.openConfig(task);
                    }
                    return TriggerAction.CLOSE_PICKER;
                }
            };
            quickAccessEntry.accept = async () => {
                if (isString(task)) {
                    // switch to quick pick and show second level
                    const showResult = await taskQuickPick.show(localize('TaskService.pickRunTask', 'Select the task to run'), undefined, task);
                    if (showResult) {
                        this._taskService.run(showResult, { attachProblemMatcher: true });
                    }
                }
                else {
                    this._taskService.run(await this._toTask(task), { attachProblemMatcher: true });
                }
            };
            taskPicks.push(quickAccessEntry);
        }
        return taskPicks;
    }
    async _toTask(task) {
        if (!ConfiguringTask.is(task)) {
            return task;
        }
        return this._taskService.tryResolveTask(task);
    }
};
TasksQuickAccessProvider = TasksQuickAccessProvider_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, ITaskService),
    __param(2, IConfigurationService),
    __param(3, IQuickInputService),
    __param(4, INotificationService),
    __param(5, IDialogService),
    __param(6, IThemeService),
    __param(7, IStorageService)
], TasksQuickAccessProvider);
export { TasksQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2Jyb3dzZXIvdGFza3NRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBRU4seUJBQXlCLEVBQ3pCLGFBQWEsR0FDYixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsWUFBWSxFQUFRLE1BQU0sMEJBQTBCLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFHakYsT0FBTyxFQUFFLGFBQWEsRUFBK0IsTUFBTSxvQkFBb0IsQ0FBQTtBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFekUsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIs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
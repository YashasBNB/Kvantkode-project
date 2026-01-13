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
var TaskQuickPick_1;
import * as nls from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import { ContributedTask, CustomTask, ConfiguringTask, } from '../common/tasks.js';
import * as Types from '../../../../base/common/types.js';
import { ITaskService } from '../common/taskService.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { getColorClass, createColorStyleElement } from '../../terminal/browser/terminalIcon.js';
import { showWithPinnedItems } from '../../../../platform/quickinput/browser/quickPickPin.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export const QUICKOPEN_DETAIL_CONFIG = 'task.quickOpen.detail';
export const QUICKOPEN_SKIP_CONFIG = 'task.quickOpen.skip';
export function isWorkspaceFolder(folder) {
    return 'uri' in folder;
}
const SHOW_ALL = nls.localize('taskQuickPick.showAll', 'Show All Tasks...');
export const configureTaskIcon = registerIcon('tasks-list-configure', Codicon.gear, nls.localize('configureTaskIcon', 'Configuration icon in the tasks selection list.'));
const removeTaskIcon = registerIcon('tasks-remove', Codicon.close, nls.localize('removeTaskIcon', 'Icon for remove in the tasks selection list.'));
const runTaskStorageKey = 'runTaskStorageKey';
let TaskQuickPick = TaskQuickPick_1 = class TaskQuickPick extends Disposable {
    constructor(_taskService, _configurationService, _quickInputService, _notificationService, _themeService, _dialogService, _storageService) {
        super();
        this._taskService = _taskService;
        this._configurationService = _configurationService;
        this._quickInputService = _quickInputService;
        this._notificationService = _notificationService;
        this._themeService = _themeService;
        this._dialogService = _dialogService;
        this._storageService = _storageService;
        this._sorter = this._taskService.createSorter();
    }
    _showDetail() {
        // Ensure invalid values get converted into boolean values
        return !!this._configurationService.getValue(QUICKOPEN_DETAIL_CONFIG);
    }
    _guessTaskLabel(task) {
        if (task._label) {
            return task._label;
        }
        if (ConfiguringTask.is(task)) {
            let label = task.configures.type;
            const configures = Objects.deepClone(task.configures);
            delete configures['_key'];
            delete configures['type'];
            Object.keys(configures).forEach((key) => (label += `: ${configures[key]}`));
            return label;
        }
        return '';
    }
    static getTaskLabelWithIcon(task, labelGuess) {
        const label = labelGuess || task._label;
        const icon = task.configurationProperties.icon;
        if (!icon) {
            return `${label}`;
        }
        return icon.id ? `$(${icon.id}) ${label}` : `$(${Codicon.tools.id}) ${label}`;
    }
    static applyColorStyles(task, entry, themeService) {
        if (task.configurationProperties.icon?.color) {
            const colorTheme = themeService.getColorTheme();
            const disposable = createColorStyleElement(colorTheme);
            entry.iconClasses = [getColorClass(task.configurationProperties.icon.color)];
            return disposable;
        }
        return;
    }
    _createTaskEntry(task, extraButtons = []) {
        const buttons = [
            {
                iconClass: ThemeIcon.asClassName(configureTaskIcon),
                tooltip: nls.localize('configureTask', 'Configure Task'),
            },
            ...extraButtons,
        ];
        const entry = {
            label: TaskQuickPick_1.getTaskLabelWithIcon(task, this._guessTaskLabel(task)),
            description: this._taskService.getTaskDescription(task),
            task,
            detail: this._showDetail() ? task.configurationProperties.detail : undefined,
            buttons,
        };
        const disposable = TaskQuickPick_1.applyColorStyles(task, entry, this._themeService);
        if (disposable) {
            this._register(disposable);
        }
        return entry;
    }
    _createEntriesForGroup(entries, tasks, groupLabel, extraButtons = []) {
        entries.push({ type: 'separator', label: groupLabel });
        tasks.forEach((task) => {
            if (!task.configurationProperties.hide) {
                entries.push(this._createTaskEntry(task, extraButtons));
            }
        });
    }
    _createTypeEntries(entries, types) {
        entries.push({ type: 'separator', label: nls.localize('contributedTasks', 'contributed') });
        types.forEach((type) => {
            entries.push({
                label: `$(folder) ${type}`,
                task: type,
                ariaLabel: nls.localize('taskType', 'All {0} tasks', type),
            });
        });
        entries.push({ label: SHOW_ALL, task: SHOW_ALL, alwaysShow: true });
    }
    _handleFolderTaskResult(result) {
        const tasks = [];
        Array.from(result).forEach(([key, folderTasks]) => {
            if (folderTasks.set) {
                tasks.push(...folderTasks.set.tasks);
            }
            if (folderTasks.configurations) {
                for (const configuration in folderTasks.configurations.byIdentifier) {
                    tasks.push(folderTasks.configurations.byIdentifier[configuration]);
                }
            }
        });
        return tasks;
    }
    _dedupeConfiguredAndRecent(recentTasks, configuredTasks) {
        let dedupedConfiguredTasks = [];
        const foundRecentTasks = Array(recentTasks.length).fill(false);
        for (let j = 0; j < configuredTasks.length; j++) {
            const workspaceFolder = configuredTasks[j].getWorkspaceFolder()?.uri.toString();
            const definition = configuredTasks[j].getDefinition()?._key;
            const type = configuredTasks[j].type;
            const label = configuredTasks[j]._label;
            const recentKey = configuredTasks[j].getKey();
            const findIndex = recentTasks.findIndex((value) => {
                return ((workspaceFolder &&
                    definition &&
                    value.getWorkspaceFolder()?.uri.toString() === workspaceFolder &&
                    (value.getDefinition()?._key === definition ||
                        (value.type === type && value._label === label))) ||
                    (recentKey && value.getKey() === recentKey));
            });
            if (findIndex === -1) {
                dedupedConfiguredTasks.push(configuredTasks[j]);
            }
            else {
                recentTasks[findIndex] = configuredTasks[j];
                foundRecentTasks[findIndex] = true;
            }
        }
        dedupedConfiguredTasks = dedupedConfiguredTasks.sort((a, b) => this._sorter.compare(a, b));
        const prunedRecentTasks = [];
        for (let i = 0; i < recentTasks.length; i++) {
            if (foundRecentTasks[i] || ConfiguringTask.is(recentTasks[i])) {
                prunedRecentTasks.push(recentTasks[i]);
            }
        }
        return { configuredTasks: dedupedConfiguredTasks, recentTasks: prunedRecentTasks };
    }
    async getTopLevelEntries(defaultEntry) {
        if (this._topLevelEntries !== undefined) {
            return { entries: this._topLevelEntries };
        }
        let recentTasks = (await this._taskService.getSavedTasks('historical')).reverse();
        const configuredTasks = this._handleFolderTaskResult(await this._taskService.getWorkspaceTasks());
        const extensionTaskTypes = this._taskService.taskTypes();
        this._topLevelEntries = [];
        // Dedupe will update recent tasks if they've changed in tasks.json.
        const dedupeAndPrune = this._dedupeConfiguredAndRecent(recentTasks, configuredTasks);
        const dedupedConfiguredTasks = dedupeAndPrune.configuredTasks;
        recentTasks = dedupeAndPrune.recentTasks;
        if (recentTasks.length > 0) {
            const removeRecentButton = {
                iconClass: ThemeIcon.asClassName(removeTaskIcon),
                tooltip: nls.localize('removeRecent', 'Remove Recently Used Task'),
            };
            this._createEntriesForGroup(this._topLevelEntries, recentTasks, nls.localize('recentlyUsed', 'recently used'), [removeRecentButton]);
        }
        if (configuredTasks.length > 0) {
            if (dedupedConfiguredTasks.length > 0) {
                this._createEntriesForGroup(this._topLevelEntries, dedupedConfiguredTasks, nls.localize('configured', 'configured'));
            }
        }
        if (defaultEntry && configuredTasks.length === 0) {
            this._topLevelEntries.push({
                type: 'separator',
                label: nls.localize('configured', 'configured'),
            });
            this._topLevelEntries.push(defaultEntry);
        }
        if (extensionTaskTypes.length > 0) {
            this._createTypeEntries(this._topLevelEntries, extensionTaskTypes);
        }
        return {
            entries: this._topLevelEntries,
            isSingleConfigured: configuredTasks.length === 1 ? configuredTasks[0] : undefined,
        };
    }
    async handleSettingOption(selectedType) {
        const { confirmed } = await this._dialogService.confirm({
            type: Severity.Warning,
            message: nls.localize('TaskQuickPick.changeSettingDetails', 'Task detection for {0} tasks causes files in any workspace you open to be run as code. Enabling {0} task detection is a user setting and will apply to any workspace you open. \n\n Do you want to enable {0} task detection for all workspaces?', selectedType),
            cancelButton: nls.localize('TaskQuickPick.changeSettingNo', 'No'),
        });
        if (confirmed) {
            await this._configurationService.updateValue(`${selectedType}.autoDetect`, 'on');
            await new Promise((resolve) => setTimeout(() => resolve(), 100));
            return this.show(nls.localize('TaskService.pickRunTask', 'Select the task to run'), undefined, selectedType);
        }
        return undefined;
    }
    async show(placeHolder, defaultEntry, startAtType, name) {
        const disposables = new DisposableStore();
        const picker = disposables.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        picker.placeholder = placeHolder;
        picker.matchOnDescription = true;
        picker.ignoreFocusOut = false;
        disposables.add(picker.onDidTriggerItemButton(async (context) => {
            const task = context.item.task;
            if (context.button.iconClass === ThemeIcon.asClassName(removeTaskIcon)) {
                const key = task && !Types.isString(task) ? task.getKey() : undefined;
                if (key) {
                    this._taskService.removeRecentlyUsedTask(key);
                }
                const indexToRemove = picker.items.indexOf(context.item);
                if (indexToRemove >= 0) {
                    picker.items = [
                        ...picker.items.slice(0, indexToRemove),
                        ...picker.items.slice(indexToRemove + 1),
                    ];
                }
            }
            else if (context.button.iconClass === ThemeIcon.asClassName(configureTaskIcon)) {
                this._quickInputService.cancel();
                if (ContributedTask.is(task)) {
                    this._taskService.customize(task, undefined, true);
                }
                else if (CustomTask.is(task) || ConfiguringTask.is(task)) {
                    let canOpenConfig = false;
                    try {
                        canOpenConfig = await this._taskService.openConfig(task);
                    }
                    catch (e) {
                        // do nothing.
                    }
                    if (!canOpenConfig) {
                        this._taskService.customize(task, undefined, true);
                    }
                }
            }
        }));
        if (name) {
            picker.value = name;
        }
        let firstLevelTask = startAtType;
        if (!firstLevelTask) {
            // First show recent tasks configured tasks. Other tasks will be available at a second level
            const topLevelEntriesResult = await this.getTopLevelEntries(defaultEntry);
            if (topLevelEntriesResult.isSingleConfigured &&
                this._configurationService.getValue(QUICKOPEN_SKIP_CONFIG)) {
                disposables.dispose();
                return this._toTask(topLevelEntriesResult.isSingleConfigured);
            }
            const taskQuickPickEntries = topLevelEntriesResult.entries;
            firstLevelTask = await this._doPickerFirstLevel(picker, taskQuickPickEntries, disposables);
        }
        do {
            if (Types.isString(firstLevelTask)) {
                if (name) {
                    await this._doPickerFirstLevel(picker, (await this.getTopLevelEntries(defaultEntry)).entries, disposables);
                    disposables.dispose();
                    return undefined;
                }
                const selectedEntry = await this.doPickerSecondLevel(picker, disposables, firstLevelTask);
                // Proceed to second level of quick pick
                if (selectedEntry && !selectedEntry.settingType && selectedEntry.task === null) {
                    // The user has chosen to go back to the first level
                    picker.value = '';
                    firstLevelTask = await this._doPickerFirstLevel(picker, (await this.getTopLevelEntries(defaultEntry)).entries, disposables);
                }
                else if (selectedEntry && Types.isString(selectedEntry.settingType)) {
                    disposables.dispose();
                    return this.handleSettingOption(selectedEntry.settingType);
                }
                else {
                    disposables.dispose();
                    return selectedEntry?.task && !Types.isString(selectedEntry?.task)
                        ? this._toTask(selectedEntry?.task)
                        : undefined;
                }
            }
            else if (firstLevelTask) {
                disposables.dispose();
                return this._toTask(firstLevelTask);
            }
            else {
                disposables.dispose();
                return firstLevelTask;
            }
        } while (1);
        return;
    }
    async _doPickerFirstLevel(picker, taskQuickPickEntries, disposables) {
        picker.items = taskQuickPickEntries;
        disposables.add(showWithPinnedItems(this._storageService, runTaskStorageKey, picker, true));
        const firstLevelPickerResult = await new Promise((resolve) => {
            disposables.add(Event.once(picker.onDidAccept)(async () => {
                resolve(picker.selectedItems ? picker.selectedItems[0] : undefined);
            }));
        });
        return firstLevelPickerResult?.task;
    }
    async doPickerSecondLevel(picker, disposables, type, name) {
        picker.busy = true;
        if (type === SHOW_ALL) {
            const items = (await this._taskService.tasks())
                .filter((t) => !t.configurationProperties.hide)
                .sort((a, b) => this._sorter.compare(a, b))
                .map((task) => this._createTaskEntry(task));
            items.push(...TaskQuickPick_1.allSettingEntries(this._configurationService));
            picker.items = items;
        }
        else {
            picker.value = name || '';
            picker.items = await this._getEntriesForProvider(type);
        }
        await picker.show();
        picker.busy = false;
        const secondLevelPickerResult = await new Promise((resolve) => {
            disposables.add(Event.once(picker.onDidAccept)(async () => {
                resolve(picker.selectedItems ? picker.selectedItems[0] : undefined);
            }));
        });
        return secondLevelPickerResult;
    }
    static allSettingEntries(configurationService) {
        const entries = [];
        const gruntEntry = TaskQuickPick_1.getSettingEntry(configurationService, 'grunt');
        if (gruntEntry) {
            entries.push(gruntEntry);
        }
        const gulpEntry = TaskQuickPick_1.getSettingEntry(configurationService, 'gulp');
        if (gulpEntry) {
            entries.push(gulpEntry);
        }
        const jakeEntry = TaskQuickPick_1.getSettingEntry(configurationService, 'jake');
        if (jakeEntry) {
            entries.push(jakeEntry);
        }
        return entries;
    }
    static getSettingEntry(configurationService, type) {
        if (configurationService.getValue(`${type}.autoDetect`) === 'off') {
            return {
                label: nls.localize('TaskQuickPick.changeSettingsOptions', '$(gear) {0} task detection is turned off. Enable {1} task detection...', type[0].toUpperCase() + type.slice(1), type),
                task: null,
                settingType: type,
                alwaysShow: true,
            };
        }
        return undefined;
    }
    async _getEntriesForProvider(type) {
        const tasks = (await this._taskService.tasks({ type })).sort((a, b) => this._sorter.compare(a, b));
        let taskQuickPickEntries = [];
        if (tasks.length > 0) {
            for (const task of tasks) {
                if (!task.configurationProperties.hide) {
                    taskQuickPickEntries.push(this._createTaskEntry(task));
                }
            }
            taskQuickPickEntries.push({
                type: 'separator',
            }, {
                label: nls.localize('TaskQuickPick.goBack', 'Go back ↩'),
                task: null,
                alwaysShow: true,
            });
        }
        else {
            taskQuickPickEntries = [
                {
                    label: nls.localize('TaskQuickPick.noTasksForType', 'No {0} tasks found. Go back ↩', type),
                    task: null,
                    alwaysShow: true,
                },
            ];
        }
        const settingEntry = TaskQuickPick_1.getSettingEntry(this._configurationService, type);
        if (settingEntry) {
            taskQuickPickEntries.push(settingEntry);
        }
        return taskQuickPickEntries;
    }
    async _toTask(task) {
        if (!ConfiguringTask.is(task)) {
            return task;
        }
        const resolvedTask = await this._taskService.tryResolveTask(task);
        if (!resolvedTask) {
            this._notificationService.error(nls.localize('noProviderForTask', 'There is no task provider registered for tasks of type "{0}".', task.type));
        }
        return resolvedTask;
    }
};
TaskQuickPick = TaskQuickPick_1 = __decorate([
    __param(0, ITaskService),
    __param(1, IConfigurationService),
    __param(2, IQuickInputService),
    __param(3, INotificationService),
    __param(4, IThemeService),
    __param(5, IDialogService),
    __param(6, IStorageService)
], TaskQuickPick);
export { TaskQuickPick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1F1aWNrUGljay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvYnJvd3Nlci90YXNrUXVpY2tQaWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUVOLGVBQWUsRUFDZixVQUFVLEVBQ1YsZUFBZSxHQUdmLE1BQU0sb0JBQW9CLENBQUE7QUFFM0IsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUE4QixNQUFNLDBCQUEwQixDQUFBO0FBQ25GLE9BQU8sRUFLTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1B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
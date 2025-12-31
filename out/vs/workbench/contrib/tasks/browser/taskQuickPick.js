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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1F1aWNrUGljay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2Jyb3dzZXIvdGFza1F1aWNrUGljay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFFTixlQUFlLEVBQ2YsVUFBVSxFQUNWLGVBQWUsR0FHZixNQUFNLG9CQUFvQixDQUFBO0FBRTNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUE7QUFDekQsT0FBTyxFQUFFLFlBQVksRUFBOEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRixPQUFPLEVBS04sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9B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
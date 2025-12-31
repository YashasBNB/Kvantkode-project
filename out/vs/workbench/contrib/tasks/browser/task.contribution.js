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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { MenuRegistry, MenuId, registerAction2, Action2, } from '../../../../platform/actions/common/actions.js';
import { ProblemMatcherRegistry } from '../common/problemMatcher.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import * as jsonContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
import { Extensions as OutputExt, } from '../../../services/output/common/output.js';
import { TaskGroup, TASKS_CATEGORY, TASK_RUNNING_STATE, TASK_TERMINAL_ACTIVE, TaskEventKind, } from '../common/tasks.js';
import { ITaskService, TaskCommandsRegistered, TaskExecutionSupportedContext, } from '../common/taskService.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { RunAutomaticTasks, ManageAutomaticTaskRunning } from './runAutomaticTasks.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import schemaVersion1 from '../common/jsonSchema_v1.js';
import schemaVersion2, { updateProblemMatchers, updateTaskDefinitions, } from '../common/jsonSchema_v2.js';
import { AbstractTaskService, ConfigureTaskAction } from './abstractTaskService.js';
import { tasksSchemaId } from '../../../services/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { Extensions as QuickAccessExtensions, } from '../../../../platform/quickinput/common/quickAccess.js';
import { TasksQuickAccessProvider } from './tasksQuickAccess.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { TaskDefinitionRegistry } from '../common/taskDefinitionRegistry.js';
import { isString } from '../../../../base/common/types.js';
import { promiseWithResolvers } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { TerminalContextKeys } from '../../terminal/common/terminalContextKey.js';
import { ITerminalService } from '../../terminal/browser/terminal.js';
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(RunAutomaticTasks, 4 /* LifecyclePhase.Eventually */);
registerAction2(ManageAutomaticTaskRunning);
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: ManageAutomaticTaskRunning.ID,
        title: ManageAutomaticTaskRunning.LABEL,
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
let TaskStatusBarContributions = class TaskStatusBarContributions extends Disposable {
    constructor(_taskService, _statusbarService, _progressService) {
        super();
        this._taskService = _taskService;
        this._statusbarService = _statusbarService;
        this._progressService = _progressService;
        this._activeTasksCount = 0;
        this._registerListeners();
    }
    _registerListeners() {
        let promise = undefined;
        let resolve;
        this._register(this._taskService.onDidStateChange((event) => {
            if (event.kind === TaskEventKind.Changed) {
                this._updateRunningTasksStatus();
            }
            if (!this._ignoreEventForUpdateRunningTasksCount(event)) {
                switch (event.kind) {
                    case TaskEventKind.Active:
                        this._activeTasksCount++;
                        if (this._activeTasksCount === 1) {
                            if (!promise) {
                                ;
                                ({ promise, resolve } = promiseWithResolvers());
                            }
                        }
                        break;
                    case TaskEventKind.Inactive:
                        // Since the exiting of the sub process is communicated async we can't order inactive and terminate events.
                        // So try to treat them accordingly.
                        if (this._activeTasksCount > 0) {
                            this._activeTasksCount--;
                            if (this._activeTasksCount === 0) {
                                if (promise && resolve) {
                                    resolve();
                                }
                            }
                        }
                        break;
                    case TaskEventKind.Terminated:
                        if (this._activeTasksCount !== 0) {
                            this._activeTasksCount = 0;
                            if (promise && resolve) {
                                resolve();
                            }
                        }
                        break;
                }
            }
            if (promise && event.kind === TaskEventKind.Active && this._activeTasksCount === 1) {
                this._progressService
                    .withProgress({ location: 10 /* ProgressLocation.Window */, command: 'workbench.action.tasks.showTasks' }, (progress) => {
                    progress.report({ message: nls.localize('building', 'Building...') });
                    return promise;
                })
                    .then(() => {
                    promise = undefined;
                });
            }
        }));
    }
    async _updateRunningTasksStatus() {
        const tasks = await this._taskService.getActiveTasks();
        if (tasks.length === 0) {
            if (this._runningTasksStatusItem) {
                this._runningTasksStatusItem.dispose();
                this._runningTasksStatusItem = undefined;
            }
        }
        else {
            const itemProps = {
                name: nls.localize('status.runningTasks', 'Running Tasks'),
                text: `$(tools) ${tasks.length}`,
                ariaLabel: nls.localize('numberOfRunningTasks', '{0} running tasks', tasks.length),
                tooltip: nls.localize('runningTasks', 'Show Running Tasks'),
                command: 'workbench.action.tasks.showTasks',
            };
            if (!this._runningTasksStatusItem) {
                this._runningTasksStatusItem = this._statusbarService.addEntry(itemProps, 'status.runningTasks', 0 /* StatusbarAlignment.LEFT */, {
                    location: { id: 'status.problems', priority: 50 },
                    alignment: 1 /* StatusbarAlignment.RIGHT */,
                });
            }
            else {
                this._runningTasksStatusItem.update(itemProps);
            }
        }
    }
    _ignoreEventForUpdateRunningTasksCount(event) {
        if (!this._taskService.inTerminal() || event.kind === TaskEventKind.Changed) {
            return false;
        }
        if ((isString(event.group) ? event.group : event.group?._id) !== TaskGroup.Build._id) {
            return true;
        }
        return (event.__task.configurationProperties.problemMatchers === undefined ||
            event.__task.configurationProperties.problemMatchers.length === 0);
    }
};
TaskStatusBarContributions = __decorate([
    __param(0, ITaskService),
    __param(1, IStatusbarService),
    __param(2, IProgressService)
], TaskStatusBarContributions);
export { TaskStatusBarContributions };
workbenchRegistry.registerWorkbenchContribution(TaskStatusBarContributions, 3 /* LifecyclePhase.Restored */);
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "3_run" /* TerminalMenuBarGroup.Run */,
    command: {
        id: 'workbench.action.tasks.runTask',
        title: nls.localize({ key: 'miRunTask', comment: ['&& denotes a mnemonic'] }, '&&Run Task...'),
    },
    order: 1,
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "3_run" /* TerminalMenuBarGroup.Run */,
    command: {
        id: 'workbench.action.tasks.build',
        title: nls.localize({ key: 'miBuildTask', comment: ['&& denotes a mnemonic'] }, 'Run &&Build Task...'),
    },
    order: 2,
    when: TaskExecutionSupportedContext,
});
// Manage Tasks
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "5_manage" /* TerminalMenuBarGroup.Manage */,
    command: {
        precondition: TASK_RUNNING_STATE,
        id: 'workbench.action.tasks.showTasks',
        title: nls.localize({ key: 'miRunningTask', comment: ['&& denotes a mnemonic'] }, 'Show Runnin&&g Tasks...'),
    },
    order: 1,
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "5_manage" /* TerminalMenuBarGroup.Manage */,
    command: {
        precondition: TASK_RUNNING_STATE,
        id: 'workbench.action.tasks.restartTask',
        title: nls.localize({ key: 'miRestartTask', comment: ['&& denotes a mnemonic'] }, 'R&&estart Running Task...'),
    },
    order: 2,
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "5_manage" /* TerminalMenuBarGroup.Manage */,
    command: {
        precondition: TASK_RUNNING_STATE,
        id: 'workbench.action.tasks.terminate',
        title: nls.localize({ key: 'miTerminateTask', comment: ['&& denotes a mnemonic'] }, '&&Terminate Task...'),
    },
    order: 3,
    when: TaskExecutionSupportedContext,
});
// Configure Tasks
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "7_configure" /* TerminalMenuBarGroup.Configure */,
    command: {
        id: 'workbench.action.tasks.configureTaskRunner',
        title: nls.localize({ key: 'miConfigureTask', comment: ['&& denotes a mnemonic'] }, '&&Configure Tasks...'),
    },
    order: 1,
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "7_configure" /* TerminalMenuBarGroup.Configure */,
    command: {
        id: 'workbench.action.tasks.configureDefaultBuildTask',
        title: nls.localize({ key: 'miConfigureBuildTask', comment: ['&& denotes a mnemonic'] }, 'Configure De&&fault Build Task...'),
    },
    order: 2,
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.openWorkspaceFileTasks',
        title: nls.localize2('workbench.action.tasks.openWorkspaceFileTasks', 'Open Workspace Tasks'),
        category: TASKS_CATEGORY,
    },
    when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), TaskExecutionSupportedContext),
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: ConfigureTaskAction.ID,
        title: ConfigureTaskAction.TEXT,
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.showLog',
        title: nls.localize2('ShowLogAction.label', 'Show Task Log'),
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.runTask',
        title: nls.localize2('RunTaskAction.label', 'Run Task'),
        category: TASKS_CATEGORY,
    },
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.reRunTask',
        title: nls.localize2('ReRunTaskAction.label', 'Rerun Last Task'),
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.restartTask',
        title: nls.localize2('RestartTaskAction.label', 'Restart Running Task'),
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.showTasks',
        title: nls.localize2('ShowTasksAction.label', 'Show Running Tasks'),
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.terminate',
        title: nls.localize2('TerminateAction.label', 'Terminate Task'),
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.build',
        title: nls.localize2('BuildAction.label', 'Run Build Task'),
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.test',
        title: nls.localize2('TestAction.label', 'Run Test Task'),
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.configureDefaultBuildTask',
        title: nls.localize2('ConfigureDefaultBuildTask.label', 'Configure Default Build Task'),
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.configureDefaultTestTask',
        title: nls.localize2('ConfigureDefaultTestTask.label', 'Configure Default Test Task'),
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.openUserTasks',
        title: nls.localize2('workbench.action.tasks.openUserTasks', 'Open User Tasks'),
        category: TASKS_CATEGORY,
    },
    when: TaskExecutionSupportedContext,
});
class UserTasksGlobalActionContribution extends Disposable {
    constructor() {
        super();
        this.registerActions();
    }
    registerActions() {
        const id = 'workbench.action.tasks.openUserTasks';
        const title = nls.localize('tasks', 'Tasks');
        this._register(MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            command: {
                id,
                title,
            },
            when: TaskExecutionSupportedContext,
            group: '2_configuration',
            order: 6,
        }));
        this._register(MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
            command: {
                id,
                title,
            },
            when: TaskExecutionSupportedContext,
            group: '2_configuration',
            order: 6,
        }));
    }
}
workbenchRegistry.registerWorkbenchContribution(UserTasksGlobalActionContribution, 3 /* LifecyclePhase.Restored */);
// MenuRegistry.addCommand( { id: 'workbench.action.tasks.rebuild', title: nls.localize('RebuildAction.label', 'Run Rebuild Task'), category: tasksCategory });
// MenuRegistry.addCommand( { id: 'workbench.action.tasks.clean', title: nls.localize('CleanAction.label', 'Run Clean Task'), category: tasksCategory });
KeybindingsRegistry.registerKeybindingRule({
    id: 'workbench.action.tasks.build',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: TaskCommandsRegistered,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 32 /* KeyCode.KeyB */,
});
// Tasks Output channel. Register it before using it in Task Service.
const outputChannelRegistry = Registry.as(OutputExt.OutputChannels);
outputChannelRegistry.registerChannel({
    id: AbstractTaskService.OutputChannelId,
    label: AbstractTaskService.OutputChannelLabel,
    log: false,
});
// Register Quick Access
const quickAccessRegistry = Registry.as(QuickAccessExtensions.Quickaccess);
const tasksPickerContextKey = 'inTasksPicker';
quickAccessRegistry.registerQuickAccessProvider({
    ctor: TasksQuickAccessProvider,
    prefix: TasksQuickAccessProvider.PREFIX,
    contextKey: tasksPickerContextKey,
    placeholder: nls.localize('tasksQuickAccessPlaceholder', 'Type the name of a task to run.'),
    helpEntries: [
        { description: nls.localize('tasksQuickAccessHelp', 'Run Task'), commandCenterOrder: 60 },
    ],
});
// tasks.json validation
const schema = {
    id: tasksSchemaId,
    description: 'Task definition file',
    type: 'object',
    allowTrailingCommas: true,
    allowComments: true,
    default: {
        version: '2.0.0',
        tasks: [
            {
                label: 'My Task',
                command: 'echo hello',
                type: 'shell',
                args: [],
                problemMatcher: ['$tsc'],
                presentation: {
                    reveal: 'always',
                },
                group: 'build',
            },
        ],
    },
};
schema.definitions = {
    ...schemaVersion1.definitions,
    ...schemaVersion2.definitions,
};
schema.oneOf = [...(schemaVersion2.oneOf || []), ...(schemaVersion1.oneOf || [])];
const jsonRegistry = (Registry.as(jsonContributionRegistry.Extensions.JSONContribution));
jsonRegistry.registerSchema(tasksSchemaId, schema);
export class TaskRegistryContribution extends Disposable {
    static { this.ID = 'taskRegistryContribution'; }
    constructor() {
        super();
        this._register(ProblemMatcherRegistry.onMatcherChanged(() => {
            updateProblemMatchers();
            jsonRegistry.notifySchemaChanged(tasksSchemaId);
        }));
        this._register(TaskDefinitionRegistry.onDefinitionsChanged(() => {
            updateTaskDefinitions();
            jsonRegistry.notifySchemaChanged(tasksSchemaId);
        }));
    }
}
registerWorkbenchContribution2(TaskRegistryContribution.ID, TaskRegistryContribution, 3 /* WorkbenchPhase.AfterRestored */);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'task',
    order: 100,
    title: nls.localize('tasksConfigurationTitle', 'Tasks'),
    type: 'object',
    properties: {
        ["task.problemMatchers.neverPrompt" /* TaskSettingId.ProblemMatchersNeverPrompt */]: {
            markdownDescription: nls.localize('task.problemMatchers.neverPrompt', 'Configures whether to show the problem matcher prompt when running a task. Set to `true` to never prompt, or use a dictionary of task types to turn off prompting only for specific task types.'),
            oneOf: [
                {
                    type: 'boolean',
                    markdownDescription: nls.localize('task.problemMatchers.neverPrompt.boolean', 'Sets problem matcher prompting behavior for all tasks.'),
                },
                {
                    type: 'object',
                    patternProperties: {
                        '.*': {
                            type: 'boolean',
                        },
                    },
                    markdownDescription: nls.localize('task.problemMatchers.neverPrompt.array', 'An object containing task type-boolean pairs to never prompt for problem matchers on.'),
                    default: {
                        shell: true,
                    },
                },
            ],
            default: false,
        },
        ["task.autoDetect" /* TaskSettingId.AutoDetect */]: {
            markdownDescription: nls.localize('task.autoDetect', 'Controls enablement of `provideTasks` for all task provider extension. If the Tasks: Run Task command is slow, disabling auto detect for task providers may help. Individual extensions may also provide settings that disable auto detection.'),
            type: 'string',
            enum: ['on', 'off'],
            default: 'on',
        },
        ["task.slowProviderWarning" /* TaskSettingId.SlowProviderWarning */]: {
            markdownDescription: nls.localize('task.slowProviderWarning', 'Configures whether a warning is shown when a provider is slow'),
            oneOf: [
                {
                    type: 'boolean',
                    markdownDescription: nls.localize('task.slowProviderWarning.boolean', 'Sets the slow provider warning for all tasks.'),
                },
                {
                    type: 'array',
                    items: {
                        type: 'string',
                        markdownDescription: nls.localize('task.slowProviderWarning.array', 'An array of task types to never show the slow provider warning.'),
                    },
                },
            ],
            default: true,
        },
        ["task.quickOpen.history" /* TaskSettingId.QuickOpenHistory */]: {
            markdownDescription: nls.localize('task.quickOpen.history', 'Controls the number of recent items tracked in task quick open dialog.'),
            type: 'number',
            default: 30,
            minimum: 0,
            maximum: 30,
        },
        ["task.quickOpen.detail" /* TaskSettingId.QuickOpenDetail */]: {
            markdownDescription: nls.localize('task.quickOpen.detail', 'Controls whether to show the task detail for tasks that have a detail in task quick picks, such as Run Task.'),
            type: 'boolean',
            default: true,
        },
        ["task.quickOpen.skip" /* TaskSettingId.QuickOpenSkip */]: {
            type: 'boolean',
            description: nls.localize('task.quickOpen.skip', 'Controls whether the task quick pick is skipped when there is only one task to pick from.'),
            default: false,
        },
        ["task.quickOpen.showAll" /* TaskSettingId.QuickOpenShowAll */]: {
            type: 'boolean',
            description: nls.localize('task.quickOpen.showAll', 'Causes the Tasks: Run Task command to use the slower "show all" behavior instead of the faster two level picker where tasks are grouped by provider.'),
            default: false,
        },
        ["task.allowAutomaticTasks" /* TaskSettingId.AllowAutomaticTasks */]: {
            type: 'string',
            enum: ['on', 'off'],
            enumDescriptions: [
                nls.localize('task.allowAutomaticTasks.on', 'Always'),
                nls.localize('task.allowAutomaticTasks.off', 'Never'),
            ],
            description: nls.localize('task.allowAutomaticTasks', "Enable automatic tasks - note that tasks won't run in an untrusted workspace."),
            default: 'on',
            restricted: true,
        },
        ["task.reconnection" /* TaskSettingId.Reconnection */]: {
            type: 'boolean',
            description: nls.localize('task.reconnection', 'On window reload, reconnect to tasks that have problem matchers.'),
            default: true,
        },
        ["task.saveBeforeRun" /* TaskSettingId.SaveBeforeRun */]: {
            markdownDescription: nls.localize('task.saveBeforeRun', 'Save all dirty editors before running a task.'),
            type: 'string',
            enum: ['always', 'never', 'prompt'],
            enumDescriptions: [
                nls.localize('task.saveBeforeRun.always', 'Always saves all editors before running.'),
                nls.localize('task.saveBeforeRun.never', 'Never saves editors before running.'),
                nls.localize('task.SaveBeforeRun.prompt', 'Prompts whether to save editors before running.'),
            ],
            default: 'always',
        },
        ["task.verboseLogging" /* TaskSettingId.VerboseLogging */]: {
            type: 'boolean',
            description: nls.localize('task.verboseLogging', 'Enable verbose logging for tasks.'),
            default: false,
        },
    },
});
export const rerunTaskIcon = registerIcon('rerun-task', Codicon.refresh, nls.localize('rerunTaskIcon', 'View icon of the rerun task.'));
export const RerunForActiveTerminalCommandId = 'workbench.action.tasks.rerunForActiveTerminal';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: RerunForActiveTerminalCommandId,
            icon: rerunTaskIcon,
            title: nls.localize2('workbench.action.tasks.rerunForActiveTerminal', 'Rerun Task'),
            precondition: TASK_TERMINAL_ACTIVE,
            menu: [{ id: MenuId.TerminalInstanceContext, when: TASK_TERMINAL_ACTIVE }],
            keybinding: {
                when: TerminalContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */,
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async run(accessor, args) {
        const terminalService = accessor.get(ITerminalService);
        const taskSystem = accessor.get(ITaskService);
        const instance = args ?? terminalService.activeInstance;
        if (instance) {
            await taskSystem.rerun(instance.instanceId);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9icm93c2VyL3Rhc2suY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSxPQUFPLEVBQ04sWUFBWSxFQUNaLE1BQU0sRUFDTixlQUFlLEVBQ2YsT0FBTyxHQUNQLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEUsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtEQUFrRCxDQUFBO0FBRXpELE9BQU8sS0FBSyx3QkFBd0IsTUFBTSxxRUFBcUUsQ0FBQTtBQUcvRyxPQUFPLEVBRU4saUJBQWlCLEdBR2pCLE1BQU0sa0RBQWtELENBQUE7QUFFekQsT0FBTyxFQUVOLFVBQVUsSUFBSSxTQUFTLEdBQ3ZCLE1BQU0sMkNBQTJDLENBQUE7QUFFbEQsT0FBTyxFQUVOLFNBQVMsRUFFVCxjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLG9CQUFvQixFQUNwQixhQUFhLEdBQ2IsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQ04sWUFBWSxFQUNaLHNCQUFzQixFQUN0Qiw2QkFBNkIsR0FDN0IsTUFBTSwwQkFBMEIsQ0FBQTtBQUVqQyxPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixFQUlqQyw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN0RixPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sK0RBQStELENBQUE7QUFFdEUsT0FBTyxjQUFjLE1BQU0sNEJBQTRCLENBQUE7QUFDdkQsT0FBTyxjQUFjLEVBQUUsRUFDdEIscUJBQXFCLEVBQ3JCLHFCQUFxQixHQUNyQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3RFLE9BQU8sRUFFTixVQUFVLElBQUkscUJBQXFCLEdBQ25DLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWhGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRWpGLE9BQU8sRUFBcUIsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV4RixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQ3BDLG1CQUFtQixDQUFDLFNBQVMsQ0FDN0IsQ0FBQTtBQUNELGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLGlCQUFpQixvQ0FBNEIsQ0FBQTtBQUU3RixlQUFlLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtBQUMzQyxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7SUFDbEQsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLDBCQUEwQixDQUFDLEVBQUU7UUFDakMsS0FBSyxFQUFFLDBCQUEwQixDQUFDLEtBQUs7UUFDdkMsUUFBUSxFQUFFLGNBQWM7S0FDeEI7SUFDRCxJQUFJLEVBQUUsNkJBQTZCO0NBQ25DLENBQUMsQ0FBQTtBQUVLLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTtJQUl6RCxZQUNlLFlBQTJDLEVBQ3RDLGlCQUFxRCxFQUN0RCxnQkFBbUQ7UUFFckUsS0FBSyxFQUFFLENBQUE7UUFKd0IsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDckIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNyQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBTDlELHNCQUFpQixHQUFXLENBQUMsQ0FBQTtRQVFwQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLElBQUksT0FBTyxHQUE4QixTQUFTLENBQUE7UUFDbEQsSUFBSSxPQUFnRCxDQUFBO1FBQ3BELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQzVDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO1lBQ2pDLENBQUM7WUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pELFFBQVEsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNwQixLQUFLLGFBQWEsQ0FBQyxNQUFNO3dCQUN4QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTt3QkFDeEIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssQ0FBQyxFQUFFLENBQUM7NEJBQ2xDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQ0FDZCxDQUFDO2dDQUFBLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsb0JBQW9CLEVBQVEsQ0FBQyxDQUFBOzRCQUN2RCxDQUFDO3dCQUNGLENBQUM7d0JBQ0QsTUFBSztvQkFDTixLQUFLLGFBQWEsQ0FBQyxRQUFRO3dCQUMxQiwyR0FBMkc7d0JBQzNHLG9DQUFvQzt3QkFDcEMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQ2hDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBOzRCQUN4QixJQUFJLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQ0FDbEMsSUFBSSxPQUFPLElBQUksT0FBTyxFQUFFLENBQUM7b0NBQ3hCLE9BQVEsRUFBRSxDQUFBO2dDQUNYLENBQUM7NEJBQ0YsQ0FBQzt3QkFDRixDQUFDO3dCQUNELE1BQUs7b0JBQ04sS0FBSyxhQUFhLENBQUMsVUFBVTt3QkFDNUIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssQ0FBQyxFQUFFLENBQUM7NEJBQ2xDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUE7NEJBQzFCLElBQUksT0FBTyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dDQUN4QixPQUFRLEVBQUUsQ0FBQTs0QkFDWCxDQUFDO3dCQUNGLENBQUM7d0JBQ0QsTUFBSztnQkFDUCxDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3BGLElBQUksQ0FBQyxnQkFBZ0I7cUJBQ25CLFlBQVksQ0FDWixFQUFFLFFBQVEsa0NBQXlCLEVBQUUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLEVBQ2xGLENBQUMsUUFBUSxFQUFFLEVBQUU7b0JBQ1osUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7b0JBQ3JFLE9BQU8sT0FBUSxDQUFBO2dCQUNoQixDQUFDLENBQ0Q7cUJBQ0EsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDVixPQUFPLEdBQUcsU0FBUyxDQUFBO2dCQUNwQixDQUFDLENBQUMsQ0FBQTtZQUNKLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyx5QkFBeUI7UUFDdEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3RELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4QixJQUFJLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ3RDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxTQUFTLENBQUE7WUFDekMsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxTQUFTLEdBQW9CO2dCQUNsQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxlQUFlLENBQUM7Z0JBQzFELElBQUksRUFBRSxZQUFZLEtBQUssQ0FBQyxNQUFNLEVBQUU7Z0JBQ2hDLFNBQVMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUM7Z0JBQ2xGLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxvQkFBb0IsQ0FBQztnQkFDM0QsT0FBTyxFQUFFLGtDQUFrQzthQUMzQyxDQUFBO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FDN0QsU0FBUyxFQUNULHFCQUFxQixtQ0FFckI7b0JBQ0MsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUU7b0JBQ2pELFNBQVMsa0NBQTBCO2lCQUNuQyxDQUNELENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMvQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxzQ0FBc0MsQ0FBQyxLQUFpQjtRQUMvRCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM3RSxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3RGLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE9BQU8sQ0FDTixLQUFLLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLGVBQWUsS0FBSyxTQUFTO1lBQ2xFLEtBQUssQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsZUFBZSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQ2pFLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXRIWSwwQkFBMEI7SUFLcEMsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsZ0JBQWdCLENBQUE7R0FQTiwwQkFBMEIsQ0FzSHRDOztBQUVELGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLDBCQUEwQixrQ0FBMEIsQ0FBQTtBQUVwRyxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRTtJQUN2RCxLQUFLLHdDQUEwQjtJQUMvQixPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsZ0NBQWdDO1FBQ3BDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDO0tBQzlGO0lBQ0QsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsNkJBQTZCO0NBQ25DLENBQUMsQ0FBQTtBQUVGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFO0lBQ3ZELEtBQUssd0NBQTBCO0lBQy9CLE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSw4QkFBOEI7UUFDbEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQzFELHFCQUFxQixDQUNyQjtLQUNEO0lBQ0QsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsNkJBQTZCO0NBQ25DLENBQUMsQ0FBQTtBQUVGLGVBQWU7QUFDZixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRTtJQUN2RCxLQUFLLDhDQUE2QjtJQUNsQyxPQUFPLEVBQUU7UUFDUixZQUFZLEVBQUUsa0JBQWtCO1FBQ2hDLEVBQUUsRUFBRSxrQ0FBa0M7UUFDdEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQzVELHlCQUF5QixDQUN6QjtLQUNEO0lBQ0QsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsNkJBQTZCO0NBQ25DLENBQUMsQ0FBQTtBQUVGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFO0lBQ3ZELEtBQUssOENBQTZCO0lBQ2xDLE9BQU8sRUFBRTtRQUNSLFlBQVksRUFBRSxrQkFBa0I7UUFDaEMsRUFBRSxFQUFFLG9DQUFvQztRQUN4QyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDbEIsRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDNUQsMkJBQTJCLENBQzNCO0tBQ0Q7SUFDRCxLQUFLLEVBQUUsQ0FBQztJQUNSLElBQUksRUFBRSw2QkFBNkI7Q0FDbkMsQ0FBQyxDQUFBO0FBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUU7SUFDdkQsS0FBSyw4Q0FBNkI7SUFDbEMsT0FBTyxFQUFFO1FBQ1IsWUFBWSxFQUFFLGtCQUFrQjtRQUNoQyxFQUFFLEVBQUUsa0NBQWtDO1FBQ3RDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNsQixFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQzlELHFCQUFxQixDQUNyQjtLQUNEO0lBQ0QsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsNkJBQTZCO0NBQ25DLENBQUMsQ0FBQTtBQUVGLGtCQUFrQjtBQUNsQixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRTtJQUN2RCxLQUFLLG9EQUFnQztJQUNyQyxPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsNENBQTRDO1FBQ2hELEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNsQixFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQzlELHNCQUFzQixDQUN0QjtLQUNEO0lBQ0QsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsNkJBQTZCO0NBQ25DLENBQUMsQ0FBQTtBQUVGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFO0lBQ3ZELEtBQUssb0RBQWdDO0lBQ3JDLE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSxrREFBa0Q7UUFDdEQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLEVBQUUsR0FBRyxFQUFFLHNCQUFzQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDbkUsbUNBQW1DLENBQ25DO0tBQ0Q7SUFDRCxLQUFLLEVBQUUsQ0FBQztJQUNSLElBQUksRUFBRSw2QkFBNkI7Q0FDbkMsQ0FBQyxDQUFBO0FBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO0lBQ2xELE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSwrQ0FBK0M7UUFDbkQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsK0NBQStDLEVBQUUsc0JBQXNCLENBQUM7UUFDN0YsUUFBUSxFQUFFLGNBQWM7S0FDeEI7SUFDRCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIscUJBQXFCLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUM1Qyw2QkFBNkIsQ0FDN0I7Q0FDRCxDQUFDLENBQUE7QUFFRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7SUFDbEQsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7UUFDMUIsS0FBSyxFQUFFLG1CQUFtQixDQUFDLElBQUk7UUFDL0IsUUFBUSxFQUFFLGNBQWM7S0FDeEI7SUFDRCxJQUFJLEVBQUUsNkJBQTZCO0NBQ25DLENBQUMsQ0FBQTtBQUNGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtJQUNsRCxPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsZ0NBQWdDO1FBQ3BDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHFCQUFxQixFQUFFLGVBQWUsQ0FBQztRQUM1RCxRQUFRLEVBQUUsY0FBYztLQUN4QjtJQUNELElBQUksRUFBRSw2QkFBNkI7Q0FDbkMsQ0FBQyxDQUFBO0FBQ0YsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO0lBQ2xELE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSxnQ0FBZ0M7UUFDcEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDO1FBQ3ZELFFBQVEsRUFBRSxjQUFjO0tBQ3hCO0NBQ0QsQ0FBQyxDQUFBO0FBQ0YsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO0lBQ2xELE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSxrQ0FBa0M7UUFDdEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLEVBQUUsaUJBQWlCLENBQUM7UUFDaEUsUUFBUSxFQUFFLGNBQWM7S0FDeEI7SUFDRCxJQUFJLEVBQUUsNkJBQTZCO0NBQ25DLENBQUMsQ0FBQTtBQUNGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtJQUNsRCxPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsb0NBQW9DO1FBQ3hDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDO1FBQ3ZFLFFBQVEsRUFBRSxjQUFjO0tBQ3hCO0lBQ0QsSUFBSSxFQUFFLDZCQUE2QjtDQUNuQyxDQUFDLENBQUE7QUFDRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7SUFDbEQsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLGtDQUFrQztRQUN0QyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSxvQkFBb0IsQ0FBQztRQUNuRSxRQUFRLEVBQUUsY0FBYztLQUN4QjtJQUNELElBQUksRUFBRSw2QkFBNkI7Q0FDbkMsQ0FBQyxDQUFBO0FBQ0YsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO0lBQ2xELE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSxrQ0FBa0M7UUFDdEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLEVBQUUsZ0JBQWdCLENBQUM7UUFDL0QsUUFBUSxFQUFFLGNBQWM7S0FDeEI7SUFDRCxJQUFJLEVBQUUsNkJBQTZCO0NBQ25DLENBQUMsQ0FBQTtBQUNGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtJQUNsRCxPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsOEJBQThCO1FBQ2xDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLGdCQUFnQixDQUFDO1FBQzNELFFBQVEsRUFBRSxjQUFjO0tBQ3hCO0lBQ0QsSUFBSSxFQUFFLDZCQUE2QjtDQUNuQyxDQUFDLENBQUE7QUFDRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7SUFDbEQsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLDZCQUE2QjtRQUNqQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxlQUFlLENBQUM7UUFDekQsUUFBUSxFQUFFLGNBQWM7S0FDeEI7SUFDRCxJQUFJLEVBQUUsNkJBQTZCO0NBQ25DLENBQUMsQ0FBQTtBQUNGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtJQUNsRCxPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsa0RBQWtEO1FBQ3RELEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLGlDQUFpQyxFQUFFLDhCQUE4QixDQUFDO1FBQ3ZGLFFBQVEsRUFBRSxjQUFjO0tBQ3hCO0lBQ0QsSUFBSSxFQUFFLDZCQUE2QjtDQUNuQyxDQUFDLENBQUE7QUFDRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7SUFDbEQsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLGlEQUFpRDtRQUNyRCxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsRUFBRSw2QkFBNkIsQ0FBQztRQUNyRixRQUFRLEVBQUUsY0FBYztLQUN4QjtJQUNELElBQUksRUFBRSw2QkFBNkI7Q0FDbkMsQ0FBQyxDQUFBO0FBQ0YsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO0lBQ2xELE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSxzQ0FBc0M7UUFDMUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsc0NBQXNDLEVBQUUsaUJBQWlCLENBQUM7UUFDL0UsUUFBUSxFQUFFLGNBQWM7S0FDeEI7SUFDRCxJQUFJLEVBQUUsNkJBQTZCO0NBQ25DLENBQUMsQ0FBQTtBQUVGLE1BQU0saUNBQWtDLFNBQVEsVUFBVTtJQUN6RDtRQUNDLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFTyxlQUFlO1FBQ3RCLE1BQU0sRUFBRSxHQUFHLHNDQUFzQyxDQUFBO1FBQ2pELE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzVDLElBQUksQ0FBQyxTQUFTLENBQ2IsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO1lBQ2xELE9BQU8sRUFBRTtnQkFDUixFQUFFO2dCQUNGLEtBQUs7YUFDTDtZQUNELElBQUksRUFBRSw2QkFBNkI7WUFDbkMsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixLQUFLLEVBQUUsQ0FBQztTQUNSLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRTtZQUMxRCxPQUFPLEVBQUU7Z0JBQ1IsRUFBRTtnQkFDRixLQUFLO2FBQ0w7WUFDRCxJQUFJLEVBQUUsNkJBQTZCO1lBQ25DLEtBQUssRUFBRSxpQkFBaUI7WUFDeEIsS0FBSyxFQUFFLENBQUM7U0FDUixDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUNELGlCQUFpQixDQUFDLDZCQUE2QixDQUM5QyxpQ0FBaUMsa0NBRWpDLENBQUE7QUFFRCwrSkFBK0o7QUFDL0oseUpBQXlKO0FBRXpKLG1CQUFtQixDQUFDLHNCQUFzQixDQUFDO0lBQzFDLEVBQUUsRUFBRSw4QkFBOEI7SUFDbEMsTUFBTSw2Q0FBbUM7SUFDekMsSUFBSSxFQUFFLHNCQUFzQjtJQUM1QixPQUFPLEVBQUUsbURBQTZCLHdCQUFlO0NBQ3JELENBQUMsQ0FBQTtBQUVGLHFFQUFxRTtBQUNyRSxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtBQUMzRixxQkFBcUIsQ0FBQyxlQUFlLENBQUM7SUFDckMsRUFBRSxFQUFFLG1CQUFtQixDQUFDLGVBQWU7SUFDdkMsS0FBSyxFQUFFLG1CQUFtQixDQUFDLGtCQUFrQjtJQUM3QyxHQUFHLEVBQUUsS0FBSztDQUNWLENBQUMsQ0FBQTtBQUVGLHdCQUF3QjtBQUN4QixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXVCLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBQ2hHLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUFBO0FBRTdDLG1CQUFtQixDQUFDLDJCQUEyQixDQUFDO0lBQy9DLElBQUksRUFBRSx3QkFBd0I7SUFDOUIsTUFBTSxFQUFFLHdCQUF3QixDQUFDLE1BQU07SUFDdkMsVUFBVSxFQUFFLHFCQUFxQjtJQUNqQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxpQ0FBaUMsQ0FBQztJQUMzRixXQUFXLEVBQUU7UUFDWixFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLFVBQVUsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsRUFBRTtLQUN6RjtDQUNELENBQUMsQ0FBQTtBQUVGLHdCQUF3QjtBQUN4QixNQUFNLE1BQU0sR0FBZ0I7SUFDM0IsRUFBRSxFQUFFLGFBQWE7SUFDakIsV0FBVyxFQUFFLHNCQUFzQjtJQUNuQyxJQUFJLEVBQUUsUUFBUTtJQUNkLG1CQUFtQixFQUFFLElBQUk7SUFDekIsYUFBYSxFQUFFLElBQUk7SUFDbkIsT0FBTyxFQUFFO1FBQ1IsT0FBTyxFQUFFLE9BQU87UUFDaEIsS0FBSyxFQUFFO1lBQ047Z0JBQ0MsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLE9BQU8sRUFBRSxZQUFZO2dCQUNyQixJQUFJLEVBQUUsT0FBTztnQkFDYixJQUFJLEVBQUUsRUFBRTtnQkFDUixjQUFjLEVBQUUsQ0FBQyxNQUFNLENBQUM7Z0JBQ3hCLFlBQVksRUFBRTtvQkFDYixNQUFNLEVBQUUsUUFBUTtpQkFDaEI7Z0JBQ0QsS0FBSyxFQUFFLE9BQU87YUFDZDtTQUNEO0tBQ0Q7Q0FDRCxDQUFBO0FBRUQsTUFBTSxDQUFDLFdBQVcsR0FBRztJQUNwQixHQUFHLGNBQWMsQ0FBQyxXQUFXO0lBQzdCLEdBQUcsY0FBYyxDQUFDLFdBQVc7Q0FDN0IsQ0FBQTtBQUNELE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBRWpGLE1BQU0sWUFBWSxHQUF1RCxDQUN4RSxRQUFRLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUNqRSxDQUFBO0FBQ0QsWUFBWSxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUE7QUFFbEQsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFVBQVU7YUFDaEQsT0FBRSxHQUFHLDBCQUEwQixDQUFBO0lBQ3RDO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFFUCxJQUFJLENBQUMsU0FBUyxDQUNiLHNCQUFzQixDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtZQUM1QyxxQkFBcUIsRUFBRSxDQUFBO1lBQ3ZCLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUU7WUFDaEQscUJBQXFCLEVBQUUsQ0FBQTtZQUN2QixZQUFZLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7O0FBRUYsOEJBQThCLENBQzdCLHdCQUF3QixDQUFDLEVBQUUsRUFDM0Isd0JBQXdCLHVDQUV4QixDQUFBO0FBRUQsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUN4Qyx1QkFBdUIsQ0FBQyxhQUFhLENBQ3JDLENBQUE7QUFDRCxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztJQUMzQyxFQUFFLEVBQUUsTUFBTTtJQUNWLEtBQUssRUFBRSxHQUFHO0lBQ1YsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsT0FBTyxDQUFDO0lBQ3ZELElBQUksRUFBRSxRQUFRO0lBQ2QsVUFBVSxFQUFFO1FBQ1gsbUZBQTBDLEVBQUU7WUFDM0MsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsa0NBQWtDLEVBQ2xDLGlNQUFpTSxDQUNqTTtZQUNELEtBQUssRUFBRTtnQkFDTjtvQkFDQyxJQUFJLEVBQUUsU0FBUztvQkFDZixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQywwQ0FBMEMsRUFDMUMsd0RBQXdELENBQ3hEO2lCQUNEO2dCQUNEO29CQUNDLElBQUksRUFBRSxRQUFRO29CQUNkLGlCQUFpQixFQUFFO3dCQUNsQixJQUFJLEVBQUU7NEJBQ0wsSUFBSSxFQUFFLFNBQVM7eUJBQ2Y7cUJBQ0Q7b0JBQ0QsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsd0NBQXdDLEVBQ3hDLHVGQUF1RixDQUN2RjtvQkFDRCxPQUFPLEVBQUU7d0JBQ1IsS0FBSyxFQUFFLElBQUk7cUJBQ1g7aUJBQ0Q7YUFDRDtZQUNELE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxrREFBMEIsRUFBRTtZQUMzQixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyxpQkFBaUIsRUFDakIsZ1BBQWdQLENBQ2hQO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO1lBQ25CLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCxvRUFBbUMsRUFBRTtZQUNwQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQywwQkFBMEIsRUFDMUIsK0RBQStELENBQy9EO1lBQ0QsS0FBSyxFQUFFO2dCQUNOO29CQUNDLElBQUksRUFBRSxTQUFTO29CQUNmLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLGtDQUFrQyxFQUNsQywrQ0FBK0MsQ0FDL0M7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsSUFBSSxFQUFFLE9BQU87b0JBQ2IsS0FBSyxFQUFFO3dCQUNOLElBQUksRUFBRSxRQUFRO3dCQUNkLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLGdDQUFnQyxFQUNoQyxpRUFBaUUsQ0FDakU7cUJBQ0Q7aUJBQ0Q7YUFDRDtZQUNELE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCwrREFBZ0MsRUFBRTtZQUNqQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyx3QkFBd0IsRUFDeEIsd0VBQXdFLENBQ3hFO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsRUFBRTtZQUNYLE9BQU8sRUFBRSxDQUFDO1lBQ1YsT0FBTyxFQUFFLEVBQUU7U0FDWDtRQUNELDZEQUErQixFQUFFO1lBQ2hDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLHVCQUF1QixFQUN2Qiw4R0FBOEcsQ0FDOUc7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCx5REFBNkIsRUFBRTtZQUM5QixJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixxQkFBcUIsRUFDckIsMkZBQTJGLENBQzNGO1lBQ0QsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELCtEQUFnQyxFQUFFO1lBQ2pDLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHdCQUF3QixFQUN4QixzSkFBc0osQ0FDdEo7WUFDRCxPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0Qsb0VBQW1DLEVBQUU7WUFDcEMsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO1lBQ25CLGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLFFBQVEsQ0FBQztnQkFDckQsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxPQUFPLENBQUM7YUFDckQ7WUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMEJBQTBCLEVBQzFCLCtFQUErRSxDQUMvRTtZQUNELE9BQU8sRUFBRSxJQUFJO1lBQ2IsVUFBVSxFQUFFLElBQUk7U0FDaEI7UUFDRCxzREFBNEIsRUFBRTtZQUM3QixJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixtQkFBbUIsRUFDbkIsa0VBQWtFLENBQ2xFO1lBQ0QsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELHdEQUE2QixFQUFFO1lBQzlCLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLG9CQUFvQixFQUNwQiwrQ0FBK0MsQ0FDL0M7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDO1lBQ25DLGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDBDQUEwQyxDQUFDO2dCQUNyRixHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLHFDQUFxQyxDQUFDO2dCQUMvRSxHQUFHLENBQUMsUUFBUSxDQUNYLDJCQUEyQixFQUMzQixpREFBaUQsQ0FDakQ7YUFDRDtZQUNELE9BQU8sRUFBRSxRQUFRO1NBQ2pCO1FBQ0QsMERBQThCLEVBQUU7WUFDL0IsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxtQ0FBbUMsQ0FBQztZQUNyRixPQUFPLEVBQUUsS0FBSztTQUNkO0tBQ0Q7Q0FDRCxDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUN4QyxZQUFZLEVBQ1osT0FBTyxDQUFDLE9BQU8sRUFDZixHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSw4QkFBOEIsQ0FBQyxDQUM3RCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsK0NBQStDLENBQUE7QUFDOUYsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLCtCQUErQjtZQUNuQyxJQUFJLEVBQUUsYUFBYTtZQUNuQixLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQywrQ0FBK0MsRUFBRSxZQUFZLENBQUM7WUFDbkYsWUFBWSxFQUFFLG9CQUFvQjtZQUNsQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLENBQUM7WUFDMUUsVUFBVSxFQUFFO2dCQUNYLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxLQUFLO2dCQUMvQixPQUFPLEVBQUUsbURBQTZCLHdCQUFlO2dCQUNyRCxHQUFHLEVBQUU7b0JBQ0osT0FBTyxFQUFFLGtEQUE2Qix3QkFBZTtpQkFDckQ7Z0JBQ0QsTUFBTSw2Q0FBbUM7YUFDekM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLElBQVM7UUFDOUMsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDN0MsTUFBTSxRQUFRLEdBQUksSUFBMEIsSUFBSSxlQUFlLENBQUMsY0FBYyxDQUFBO1FBQzlFLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxNQUFNLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzVDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBIn0=
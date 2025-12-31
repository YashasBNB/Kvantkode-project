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
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { ModesRegistry } from '../../../../editor/common/languages/modesRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { MenuId, registerAction2, Action2, MenuRegistry, } from '../../../../platform/actions/common/actions.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { OutputService } from './outputServices.js';
import { OUTPUT_MODE_ID, OUTPUT_MIME, OUTPUT_VIEW_ID, IOutputService, CONTEXT_IN_OUTPUT, LOG_MODE_ID, LOG_MIME, CONTEXT_OUTPUT_SCROLL_LOCK, ACTIVE_OUTPUT_CHANNEL_CONTEXT, CONTEXT_ACTIVE_OUTPUT_LEVEL_SETTABLE, Extensions, CONTEXT_ACTIVE_OUTPUT_LEVEL, CONTEXT_ACTIVE_OUTPUT_LEVEL_IS_DEFAULT, SHOW_INFO_FILTER_CONTEXT, SHOW_TRACE_FILTER_CONTEXT, SHOW_DEBUG_FILTER_CONTEXT, SHOW_ERROR_FILTER_CONTEXT, SHOW_WARNING_FILTER_CONTEXT, OUTPUT_FILTER_FOCUS_CONTEXT, CONTEXT_ACTIVE_LOG_FILE_OUTPUT, isSingleSourceOutputChannelDescriptor, } from '../../../services/output/common/output.js';
import { OutputViewPane } from './outputView.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Extensions as ViewContainerExtensions, } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { AUX_WINDOW_GROUP, IEditorService, } from '../../../services/editor/common/editorService.js';
import { ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Disposable, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ILoggerService, LogLevel, LogLevelToLocalizedString, LogLevelToString, } from '../../../../platform/log/common/log.js';
import { IDefaultLogLevelsService } from '../../logs/common/defaultLogLevels.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { IsWindowsContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { localize, localize2 } from '../../../../nls.js';
import { viewFilterSubmenu } from '../../../browser/parts/views/viewFilter.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { basename } from '../../../../base/common/resources.js';
const IMPORTED_LOG_ID_PREFIX = 'importedLog.';
// Register Service
registerSingleton(IOutputService, OutputService, 1 /* InstantiationType.Delayed */);
// Register Output Mode
ModesRegistry.registerLanguage({
    id: OUTPUT_MODE_ID,
    extensions: [],
    mimetypes: [OUTPUT_MIME],
});
// Register Log Output Mode
ModesRegistry.registerLanguage({
    id: LOG_MODE_ID,
    extensions: [],
    mimetypes: [LOG_MIME],
});
// register output container
const outputViewIcon = registerIcon('output-view-icon', Codicon.output, nls.localize('outputViewIcon', 'View icon of the output view.'));
const VIEW_CONTAINER = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: OUTPUT_VIEW_ID,
    title: nls.localize2('output', 'Output'),
    icon: outputViewIcon,
    order: 1,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
        OUTPUT_VIEW_ID,
        { mergeViewWithContainerWhenSingleView: true },
    ]),
    storageId: OUTPUT_VIEW_ID,
    hideIfEmpty: true,
}, 1 /* ViewContainerLocation.Panel */, { doNotRegisterOpenCommand: true });
Registry.as(ViewContainerExtensions.ViewsRegistry).registerViews([
    {
        id: OUTPUT_VIEW_ID,
        name: nls.localize2('output', 'Output'),
        containerIcon: outputViewIcon,
        canMoveView: true,
        canToggleVisibility: true,
        ctorDescriptor: new SyncDescriptor(OutputViewPane),
        openCommandActionDescriptor: {
            id: 'workbench.action.output.toggleOutput',
            mnemonicTitle: nls.localize({ key: 'miToggleOutput', comment: ['&& denotes a mnemonic'] }, '&&Output'),
            keybindings: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 51 /* KeyCode.KeyU */,
                linux: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 38 /* KeyCode.KeyH */), // On Ubuntu Ctrl+Shift+U is taken by some global OS command
                },
            },
            order: 1,
        },
    },
], VIEW_CONTAINER);
let OutputContribution = class OutputContribution extends Disposable {
    constructor(outputService, editorService) {
        super();
        this.outputService = outputService;
        this.editorService = editorService;
        this.registerActions();
    }
    registerActions() {
        this.registerSwitchOutputAction();
        this.registerAddCompoundLogAction();
        this.registerRemoveLogAction();
        this.registerShowOutputChannelsAction();
        this.registerClearOutputAction();
        this.registerToggleAutoScrollAction();
        this.registerOpenActiveOutputFileAction();
        this.registerOpenActiveOutputFileInAuxWindowAction();
        this.registerSaveActiveOutputAsAction();
        this.registerShowLogsAction();
        this.registerOpenLogFileAction();
        this.registerConfigureActiveOutputLogLevelAction();
        this.registerLogLevelFilterActions();
        this.registerClearFilterActions();
        this.registerExportLogsAction();
        this.registerImportLogAction();
    }
    registerSwitchOutputAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.output.action.switchBetweenOutputs`,
                    title: nls.localize('switchBetweenOutputs.label', 'Switch Output'),
                });
            }
            async run(accessor, channelId) {
                if (channelId) {
                    accessor.get(IOutputService).showChannel(channelId, true);
                }
            }
        }));
        const switchOutputMenu = new MenuId('workbench.output.menu.switchOutput');
        this._register(MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
            submenu: switchOutputMenu,
            title: nls.localize('switchToOutput.label', 'Switch Output'),
            group: 'navigation',
            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
            order: 1,
            isSelection: true,
        }));
        const registeredChannels = new Map();
        this._register(toDisposable(() => dispose(registeredChannels.values())));
        const registerOutputChannels = (channels) => {
            for (const channel of channels) {
                const title = channel.label;
                const group = channel.user
                    ? '2_user_outputchannels'
                    : channel.extensionId
                        ? '0_ext_outputchannels'
                        : '1_core_outputchannels';
                registeredChannels.set(channel.id, registerAction2(class extends Action2 {
                    constructor() {
                        super({
                            id: `workbench.action.output.show.${channel.id}`,
                            title,
                            toggled: ACTIVE_OUTPUT_CHANNEL_CONTEXT.isEqualTo(channel.id),
                            menu: {
                                id: switchOutputMenu,
                                group,
                            },
                        });
                    }
                    async run(accessor) {
                        return accessor.get(IOutputService).showChannel(channel.id, true);
                    }
                }));
            }
        };
        registerOutputChannels(this.outputService.getChannelDescriptors());
        const outputChannelRegistry = Registry.as(Extensions.OutputChannels);
        this._register(outputChannelRegistry.onDidRegisterChannel((e) => {
            const channel = this.outputService.getChannelDescriptor(e);
            if (channel) {
                registerOutputChannels([channel]);
            }
        }));
        this._register(outputChannelRegistry.onDidRemoveChannel((e) => {
            registeredChannels.get(e.id)?.dispose();
            registeredChannels.delete(e.id);
        }));
    }
    registerAddCompoundLogAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.output.addCompoundLog',
                    title: nls.localize2('addCompoundLog', 'Add Compound Log...'),
                    category: nls.localize2('output', 'Output'),
                    f1: true,
                    menu: [
                        {
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: '2_add',
                        },
                    ],
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const extensionLogs = [], logs = [];
                for (const channel of outputService.getChannelDescriptors()) {
                    if (channel.log && !channel.user) {
                        if (channel.extensionId) {
                            extensionLogs.push(channel);
                        }
                        else {
                            logs.push(channel);
                        }
                    }
                }
                const entries = [];
                for (const log of logs.sort((a, b) => a.label.localeCompare(b.label))) {
                    entries.push(log);
                }
                if (extensionLogs.length && logs.length) {
                    entries.push({
                        type: 'separator',
                        label: nls.localize('extensionLogs', 'Extension Logs'),
                    });
                }
                for (const log of extensionLogs.sort((a, b) => a.label.localeCompare(b.label))) {
                    entries.push(log);
                }
                const result = await quickInputService.pick(entries, {
                    placeHolder: nls.localize('selectlog', 'Select Log'),
                    canPickMany: true,
                });
                if (result?.length) {
                    outputService.showChannel(outputService.registerCompoundLogChannel(result));
                }
            }
        }));
    }
    registerRemoveLogAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.output.remove',
                    title: nls.localize2('removeLog', 'Remove Output...'),
                    category: nls.localize2('output', 'Output'),
                    f1: true,
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const notificationService = accessor.get(INotificationService);
                const entries = outputService
                    .getChannelDescriptors()
                    .filter((channel) => channel.user);
                if (entries.length === 0) {
                    notificationService.info(nls.localize('nocustumoutput', 'No custom outputs to remove.'));
                    return;
                }
                const result = await quickInputService.pick(entries, {
                    placeHolder: nls.localize('selectlog', 'Select Log'),
                    canPickMany: true,
                });
                if (!result?.length) {
                    return;
                }
                const outputChannelRegistry = Registry.as(Extensions.OutputChannels);
                for (const channel of result) {
                    outputChannelRegistry.removeChannel(channel.id);
                }
            }
        }));
    }
    registerShowOutputChannelsAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.showOutputChannels',
                    title: nls.localize2('showOutputChannels', 'Show Output Channels...'),
                    category: nls.localize2('output', 'Output'),
                    f1: true,
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const extensionChannels = [], coreChannels = [];
                for (const channel of outputService.getChannelDescriptors()) {
                    if (channel.extensionId) {
                        extensionChannels.push(channel);
                    }
                    else {
                        coreChannels.push(channel);
                    }
                }
                const entries = [];
                for (const { id, label } of extensionChannels) {
                    entries.push({ id, label });
                }
                if (extensionChannels.length && coreChannels.length) {
                    entries.push({ type: 'separator' });
                }
                for (const { id, label } of coreChannels) {
                    entries.push({ id, label });
                }
                const entry = await quickInputService.pick(entries, {
                    placeHolder: nls.localize('selectOutput', 'Select Output Channel'),
                });
                if (entry) {
                    return outputService.showChannel(entry.id);
                }
            }
        }));
    }
    registerClearOutputAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.output.action.clearOutput`,
                    title: nls.localize2('clearOutput.label', 'Clear Output'),
                    category: Categories.View,
                    menu: [
                        {
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: 'navigation',
                            order: 2,
                        },
                        {
                            id: MenuId.CommandPalette,
                        },
                        {
                            id: MenuId.EditorContext,
                            when: CONTEXT_IN_OUTPUT,
                        },
                    ],
                    icon: Codicon.clearAll,
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
                const activeChannel = outputService.getActiveChannel();
                if (activeChannel) {
                    activeChannel.clear();
                    accessibilitySignalService.playSignal(AccessibilitySignal.clear);
                }
            }
        }));
    }
    registerToggleAutoScrollAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.output.action.toggleAutoScroll`,
                    title: nls.localize2('toggleAutoScroll', 'Toggle Auto Scrolling'),
                    tooltip: nls.localize('outputScrollOff', 'Turn Auto Scrolling Off'),
                    menu: {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', OUTPUT_VIEW_ID)),
                        group: 'navigation',
                        order: 3,
                    },
                    icon: Codicon.lock,
                    toggled: {
                        condition: CONTEXT_OUTPUT_SCROLL_LOCK,
                        icon: Codicon.unlock,
                        tooltip: nls.localize('outputScrollOn', 'Turn Auto Scrolling On'),
                    },
                });
            }
            async run(accessor) {
                const outputView = accessor
                    .get(IViewsService)
                    .getActiveViewWithId(OUTPUT_VIEW_ID);
                outputView.scrollLock = !outputView.scrollLock;
            }
        }));
    }
    registerOpenActiveOutputFileAction() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.openActiveLogOutputFile`,
                    title: nls.localize2('openActiveOutputFile', 'Open Output in Editor'),
                    menu: [
                        {
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: 'navigation',
                            order: 4,
                            isHiddenByDefault: true,
                        },
                    ],
                    icon: Codicon.goToFile,
                });
            }
            async run() {
                that.openActiveOutput();
            }
        }));
    }
    registerOpenActiveOutputFileInAuxWindowAction() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.openActiveLogOutputFileInNewWindow`,
                    title: nls.localize2('openActiveOutputFileInNewWindow', 'Open Output in New Window'),
                    menu: [
                        {
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: 'navigation',
                            order: 5,
                            isHiddenByDefault: true,
                        },
                    ],
                    icon: Codicon.emptyWindow,
                });
            }
            async run() {
                that.openActiveOutput(AUX_WINDOW_GROUP);
            }
        }));
    }
    registerSaveActiveOutputAsAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.saveActiveLogOutputAs`,
                    title: nls.localize2('saveActiveOutputAs', 'Save Output As...'),
                    menu: [
                        {
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: '1_export',
                            order: 1,
                        },
                    ],
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const channel = outputService.getActiveChannel();
                if (channel) {
                    const descriptor = outputService
                        .getChannelDescriptors()
                        .find((c) => c.id === channel.id);
                    if (descriptor) {
                        await outputService.saveOutputAs(descriptor);
                    }
                }
            }
        }));
    }
    async openActiveOutput(group) {
        const channel = this.outputService.getActiveChannel();
        if (channel) {
            await this.editorService.openEditor({
                resource: channel.uri,
                options: {
                    pinned: true,
                },
            }, group);
        }
    }
    registerConfigureActiveOutputLogLevelAction() {
        const logLevelMenu = new MenuId('workbench.output.menu.logLevel');
        this._register(MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
            submenu: logLevelMenu,
            title: nls.localize('logLevel.label', 'Set Log Level...'),
            group: 'navigation',
            when: ContextKeyExpr.and(ContextKeyExpr.equals('view', OUTPUT_VIEW_ID), CONTEXT_ACTIVE_OUTPUT_LEVEL_SETTABLE),
            icon: Codicon.gear,
            order: 6,
        }));
        let order = 0;
        const registerLogLevel = (logLevel) => {
            this._register(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: `workbench.action.output.activeOutputLogLevel.${logLevel}`,
                        title: LogLevelToLocalizedString(logLevel).value,
                        toggled: CONTEXT_ACTIVE_OUTPUT_LEVEL.isEqualTo(LogLevelToString(logLevel)),
                        menu: {
                            id: logLevelMenu,
                            order: order++,
                            group: '0_level',
                        },
                    });
                }
                async run(accessor) {
                    const outputService = accessor.get(IOutputService);
                    const channel = outputService.getActiveChannel();
                    if (channel) {
                        const channelDescriptor = outputService.getChannelDescriptor(channel.id);
                        if (channelDescriptor) {
                            outputService.setLogLevel(channelDescriptor, logLevel);
                        }
                    }
                }
            }));
        };
        registerLogLevel(LogLevel.Trace);
        registerLogLevel(LogLevel.Debug);
        registerLogLevel(LogLevel.Info);
        registerLogLevel(LogLevel.Warning);
        registerLogLevel(LogLevel.Error);
        registerLogLevel(LogLevel.Off);
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.output.activeOutputLogLevelDefault`,
                    title: nls.localize('logLevelDefault.label', 'Set As Default'),
                    menu: {
                        id: logLevelMenu,
                        order,
                        group: '1_default',
                    },
                    precondition: CONTEXT_ACTIVE_OUTPUT_LEVEL_IS_DEFAULT.negate(),
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const loggerService = accessor.get(ILoggerService);
                const defaultLogLevelsService = accessor.get(IDefaultLogLevelsService);
                const channel = outputService.getActiveChannel();
                if (channel) {
                    const channelDescriptor = outputService.getChannelDescriptor(channel.id);
                    if (channelDescriptor && isSingleSourceOutputChannelDescriptor(channelDescriptor)) {
                        const logLevel = loggerService.getLogLevel(channelDescriptor.source.resource);
                        return await defaultLogLevelsService.setDefaultLogLevel(logLevel, channelDescriptor.extensionId);
                    }
                }
            }
        }));
    }
    registerShowLogsAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.showLogs',
                    title: nls.localize2('showLogs', 'Show Logs...'),
                    category: Categories.Developer,
                    menu: {
                        id: MenuId.CommandPalette,
                    },
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const extensionLogs = [], logs = [];
                for (const channel of outputService.getChannelDescriptors()) {
                    if (channel.log) {
                        if (channel.extensionId) {
                            extensionLogs.push(channel);
                        }
                        else {
                            logs.push(channel);
                        }
                    }
                }
                const entries = [];
                for (const { id, label } of logs) {
                    entries.push({ id, label });
                }
                if (extensionLogs.length && logs.length) {
                    entries.push({
                        type: 'separator',
                        label: nls.localize('extensionLogs', 'Extension Logs'),
                    });
                }
                for (const { id, label } of extensionLogs) {
                    entries.push({ id, label });
                }
                const entry = await quickInputService.pick(entries, {
                    placeHolder: nls.localize('selectlog', 'Select Log'),
                });
                if (entry) {
                    return outputService.showChannel(entry.id);
                }
            }
        }));
    }
    registerOpenLogFileAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openLogFile',
                    title: nls.localize2('openLogFile', 'Open Log...'),
                    category: Categories.Developer,
                    menu: {
                        id: MenuId.CommandPalette,
                    },
                    metadata: {
                        description: 'workbench.action.openLogFile',
                        args: [
                            {
                                name: 'logFile',
                                schema: {
                                    markdownDescription: nls.localize('logFile', 'The id of the log file to open, for example `"window"`. Currently the best way to get this is to get the ID by checking the `workbench.action.output.show.<id>` commands'),
                                    type: 'string',
                                },
                            },
                        ],
                    },
                });
            }
            async run(accessor, args) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const editorService = accessor.get(IEditorService);
                let entry;
                const argName = args && typeof args === 'string' ? args : undefined;
                const extensionChannels = [];
                const coreChannels = [];
                for (const c of outputService.getChannelDescriptors()) {
                    if (c.log) {
                        const e = { id: c.id, label: c.label };
                        if (c.extensionId) {
                            extensionChannels.push(e);
                        }
                        else {
                            coreChannels.push(e);
                        }
                        if (e.id === argName) {
                            entry = e;
                        }
                    }
                }
                if (!entry) {
                    const entries = [
                        ...extensionChannels.sort((a, b) => a.label.localeCompare(b.label)),
                    ];
                    if (entries.length && coreChannels.length) {
                        entries.push({ type: 'separator' });
                        entries.push(...coreChannels.sort((a, b) => a.label.localeCompare(b.label)));
                    }
                    entry = (await quickInputService.pick(entries, {
                        placeHolder: nls.localize('selectlogFile', 'Select Log File'),
                    }));
                }
                if (entry?.id) {
                    const channel = outputService.getChannel(entry.id);
                    if (channel) {
                        await editorService.openEditor({
                            resource: channel.uri,
                            options: {
                                pinned: true,
                            },
                        });
                    }
                }
            }
        }));
    }
    registerLogLevelFilterActions() {
        let order = 0;
        const registerLogLevel = (logLevel, toggled) => {
            this._register(registerAction2(class extends ViewAction {
                constructor() {
                    super({
                        id: `workbench.actions.${OUTPUT_VIEW_ID}.toggle.${LogLevelToString(logLevel)}`,
                        title: LogLevelToLocalizedString(logLevel).value,
                        metadata: {
                            description: localize2('toggleTraceDescription', 'Show or hide {0} messages in the output', LogLevelToString(logLevel)),
                        },
                        toggled,
                        menu: {
                            id: viewFilterSubmenu,
                            group: '2_log_filter',
                            when: ContextKeyExpr.and(ContextKeyExpr.equals('view', OUTPUT_VIEW_ID), CONTEXT_ACTIVE_LOG_FILE_OUTPUT),
                            order: order++,
                        },
                        viewId: OUTPUT_VIEW_ID,
                    });
                }
                async runInView(serviceAccessor, view) {
                    this.toggleLogLevelFilter(serviceAccessor.get(IOutputService), logLevel);
                }
                toggleLogLevelFilter(outputService, logLevel) {
                    switch (logLevel) {
                        case LogLevel.Trace:
                            outputService.filters.trace = !outputService.filters.trace;
                            break;
                        case LogLevel.Debug:
                            outputService.filters.debug = !outputService.filters.debug;
                            break;
                        case LogLevel.Info:
                            outputService.filters.info = !outputService.filters.info;
                            break;
                        case LogLevel.Warning:
                            outputService.filters.warning = !outputService.filters.warning;
                            break;
                        case LogLevel.Error:
                            outputService.filters.error = !outputService.filters.error;
                            break;
                    }
                }
            }));
        };
        registerLogLevel(LogLevel.Trace, SHOW_TRACE_FILTER_CONTEXT);
        registerLogLevel(LogLevel.Debug, SHOW_DEBUG_FILTER_CONTEXT);
        registerLogLevel(LogLevel.Info, SHOW_INFO_FILTER_CONTEXT);
        registerLogLevel(LogLevel.Warning, SHOW_WARNING_FILTER_CONTEXT);
        registerLogLevel(LogLevel.Error, SHOW_ERROR_FILTER_CONTEXT);
    }
    registerClearFilterActions() {
        this._register(registerAction2(class extends ViewAction {
            constructor() {
                super({
                    id: `workbench.actions.${OUTPUT_VIEW_ID}.clearFilterText`,
                    title: localize('clearFiltersText', 'Clear filters text'),
                    keybinding: {
                        when: OUTPUT_FILTER_FOCUS_CONTEXT,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: 9 /* KeyCode.Escape */,
                    },
                    viewId: OUTPUT_VIEW_ID,
                });
            }
            async runInView(serviceAccessor, outputView) {
                outputView.clearFilterText();
            }
        }));
    }
    registerExportLogsAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.exportLogs`,
                    title: nls.localize2('exportLogs', 'Export Logs...'),
                    f1: true,
                    category: Categories.Developer,
                    menu: [
                        {
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: '1_export',
                            order: 2,
                        },
                    ],
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const extensionLogs = [], logs = [], userLogs = [];
                for (const channel of outputService.getChannelDescriptors()) {
                    if (channel.log) {
                        if (channel.extensionId) {
                            extensionLogs.push(channel);
                        }
                        else if (channel.user) {
                            userLogs.push(channel);
                        }
                        else {
                            logs.push(channel);
                        }
                    }
                }
                const entries = [];
                for (const log of logs.sort((a, b) => a.label.localeCompare(b.label))) {
                    entries.push(log);
                }
                if (extensionLogs.length && logs.length) {
                    entries.push({
                        type: 'separator',
                        label: nls.localize('extensionLogs', 'Extension Logs'),
                    });
                }
                for (const log of extensionLogs.sort((a, b) => a.label.localeCompare(b.label))) {
                    entries.push(log);
                }
                if (userLogs.length && (extensionLogs.length || logs.length)) {
                    entries.push({ type: 'separator', label: nls.localize('userLogs', 'User Logs') });
                }
                for (const log of userLogs.sort((a, b) => a.label.localeCompare(b.label))) {
                    entries.push(log);
                }
                const result = await quickInputService.pick(entries, {
                    placeHolder: nls.localize('selectlog', 'Select Log'),
                    canPickMany: true,
                });
                if (result?.length) {
                    await outputService.saveOutputAs(...result);
                }
            }
        }));
    }
    registerImportLogAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.importLog`,
                    title: nls.localize2('importLog', 'Import Log...'),
                    f1: true,
                    category: Categories.Developer,
                    menu: [
                        {
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: '2_add',
                            order: 2,
                        },
                    ],
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const fileDialogService = accessor.get(IFileDialogService);
                const result = await fileDialogService.showOpenDialog({
                    title: nls.localize('importLogFile', 'Import Log File'),
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: true,
                    filters: [
                        {
                            name: nls.localize('logFiles', 'Log Files'),
                            extensions: ['log'],
                        },
                    ],
                });
                if (result?.length) {
                    const channelName = basename(result[0]);
                    const channelId = `${IMPORTED_LOG_ID_PREFIX}${Date.now()}`;
                    // Register and show the channel
                    Registry.as(Extensions.OutputChannels).registerChannel({
                        id: channelId,
                        label: channelName,
                        log: true,
                        user: true,
                        source: result.length === 1
                            ? { resource: result[0] }
                            : result.map((resource) => ({
                                resource,
                                name: basename(resource).split('.')[0],
                            })),
                    });
                    outputService.showChannel(channelId);
                }
            }
        }));
    }
};
OutputContribution = __decorate([
    __param(0, IOutputService),
    __param(1, IEditorService)
], OutputContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(OutputContribution, 3 /* LifecyclePhase.Restored */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'output',
    order: 30,
    title: nls.localize('output', 'Output'),
    type: 'object',
    properties: {
        'output.smartScroll.enabled': {
            type: 'boolean',
            description: nls.localize('output.smartScroll.enabled', 'Enable/disable the ability of smart scrolling in the output view. Smart scrolling allows you to lock scrolling automatically when you click in the output view and unlocks when you click in the last line.'),
            default: true,
            scope: 4 /* ConfigurationScope.WINDOW */,
            tags: ['output'],
        },
    },
});
KeybindingsRegistry.registerKeybindingRule({
    id: 'cursorWordAccessibilityLeft',
    when: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext, ContextKeyExpr.equals(FocusedViewContext.key, OUTPUT_VIEW_ID)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
});
KeybindingsRegistry.registerKeybindingRule({
    id: 'cursorWordAccessibilityLeftSelect',
    when: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext, ContextKeyExpr.equals(FocusedViewContext.key, OUTPUT_VIEW_ID)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
});
KeybindingsRegistry.registerKeybindingRule({
    id: 'cursorWordAccessibilityRight',
    when: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext, ContextKeyExpr.equals(FocusedViewContext.key, OUTPUT_VIEW_ID)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
});
KeybindingsRegistry.registerKeybindingRule({
    id: 'cursorWordAccessibilityRightSelect',
    when: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext, ContextKeyExpr.equals(FocusedViewContext.key, OUTPUT_VIEW_ID)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL291dHB1dC9icm93c2VyL291dHB1dC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQVUsUUFBUSxFQUFXLE1BQU0scUNBQXFDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sTUFBTSxFQUNOLGVBQWUsRUFDZixPQUFPLEVBQ1AsWUFBWSxHQUNaLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNuRCxPQUFPLEVBQ04sY0FBYyxFQUNkLFdBQVcsRUFDWCxjQUFjLEVBQ2QsY0FBYyxFQUNkLGlCQUFpQixFQUNqQixXQUFXLEVBQ1gsUUFBUSxFQUNSLDBCQUEwQixFQUUxQiw2QkFBNkIsRUFDN0Isb0NBQW9DLEVBRXBDLFVBQVUsRUFDViwyQkFBMkIsRUFDM0Isc0NBQXNDLEVBQ3RDLHdCQUF3QixFQUN4Qix5QkFBeUIsRUFDekIseUJBQXlCLEVBQ3pCLHlCQUF5QixFQUN6QiwyQkFBMkIsRUFDM0IsMkJBQTJCLEVBQzNCLDhCQUE4QixFQUM5QixxQ0FBcUMsR0FDckMsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGNB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
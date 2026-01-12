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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0cHV0L2Jyb3dzZXIvb3V0cHV0LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBVSxRQUFRLEVBQVcsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixNQUFNLEVBQ04sZUFBZSxFQUNmLE9BQU8sRUFDUCxZQUFZLEdBQ1osTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ25ELE9BQU8sRUFDTixjQUFjLEVBQ2QsV0FBVyxFQUNYLGNBQWMsRUFDZCxjQUFjLEVBQ2QsaUJBQWlCLEVBQ2pCLFdBQVcsRUFDWCxRQUFRLEVBQ1IsMEJBQTBCLEVBRTFCLDZCQUE2QixFQUM3QixvQ0FBb0MsRUFFcEMsVUFBVSxFQUNWLDJCQUEyQixFQUMzQixzQ0FBc0MsRUFDdEMsd0JBQXdCLEVBQ3hCLHlCQUF5QixFQUN6Qix5QkFBeUIsRUFDekIseUJBQXlCLEVBQ3pCLDJCQUEyQixFQUMzQiwyQkFBMkIsRUFDM0IsOEJBQThCLEVBQzlCLHFDQUFxQyxHQUNyQyxNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUNoRCxPQUFPLEVB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
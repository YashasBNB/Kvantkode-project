/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../platform/registry/common/platform.js';
import { localize, localize2 } from '../../nls.js';
import { MenuRegistry, MenuId, registerAction2 } from '../../platform/actions/common/actions.js';
import { Extensions as ConfigurationExtensions, } from '../../platform/configuration/common/configurationRegistry.js';
import { isLinux, isMacintosh, isWindows } from '../../base/common/platform.js';
import { ConfigureRuntimeArgumentsAction, ToggleDevToolsAction, ReloadWindowWithExtensionsDisabledAction, OpenUserDataFolderAction, ShowGPUInfoAction, } from './actions/developerActions.js';
import { ZoomResetAction, ZoomOutAction, ZoomInAction, CloseWindowAction, SwitchWindowAction, QuickSwitchWindowAction, NewWindowTabHandler, ShowPreviousWindowTabHandler, ShowNextWindowTabHandler, MoveWindowTabToNewWindowHandler, MergeWindowTabsHandlerHandler, ToggleWindowTabsBarHandler, } from './actions/windowActions.js';
import { ContextKeyExpr } from '../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry, } from '../../platform/keybinding/common/keybindingsRegistry.js';
import { CommandsRegistry } from '../../platform/commands/common/commands.js';
import { IsMacContext } from '../../platform/contextkey/common/contextkeys.js';
import { INativeHostService } from '../../platform/native/common/native.js';
import { Extensions as JSONExtensions, } from '../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { InstallShellScriptAction, UninstallShellScriptAction } from './actions/installActions.js';
import { EditorsVisibleContext, SingleEditorGroupsContext } from '../common/contextkeys.js';
import { TELEMETRY_SETTING_ID } from '../../platform/telemetry/common/telemetry.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { NativeWindow } from './window.js';
import { ModifierKeyEmitter } from '../../base/browser/dom.js';
import { applicationConfigurationNodeBase, securityConfigurationNodeBase, } from '../common/configuration.js';
import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from '../../platform/window/electron-sandbox/window.js';
import { DefaultAccountManagementContribution } from '../services/accounts/common/defaultAccount.js';
import { registerWorkbenchContribution2 } from '../common/contributions.js';
(function registerActions() {
    // Actions: Zoom
    registerAction2(ZoomInAction);
    registerAction2(ZoomOutAction);
    registerAction2(ZoomResetAction);
    // Actions: Window
    registerAction2(SwitchWindowAction);
    registerAction2(QuickSwitchWindowAction);
    registerAction2(CloseWindowAction);
    if (isMacintosh) {
        // macOS: behave like other native apps that have documents
        // but can run without a document opened and allow to close
        // the window when the last document is closed
        // (https://github.com/microsoft/vscode/issues/126042)
        KeybindingsRegistry.registerKeybindingRule({
            id: CloseWindowAction.ID,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(EditorsVisibleContext.toNegated(), SingleEditorGroupsContext),
            primary: 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */,
        });
    }
    // Actions: Install Shell Script (macOS only)
    if (isMacintosh) {
        registerAction2(InstallShellScriptAction);
        registerAction2(UninstallShellScriptAction);
    }
    // Quit
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: 'workbench.action.quit',
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        async handler(accessor) {
            const nativeHostService = accessor.get(INativeHostService);
            const configurationService = accessor.get(IConfigurationService);
            const confirmBeforeClose = configurationService.getValue('window.confirmBeforeClose');
            if (confirmBeforeClose === 'always' ||
                (confirmBeforeClose === 'keyboardOnly' &&
                    ModifierKeyEmitter.getInstance().isModifierPressed)) {
                const confirmed = await NativeWindow.confirmOnShutdown(accessor, 2 /* ShutdownReason.QUIT */);
                if (!confirmed) {
                    return; // quit prevented by user
                }
            }
            nativeHostService.quit();
        },
        when: undefined,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 47 /* KeyCode.KeyQ */ },
        linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 47 /* KeyCode.KeyQ */ },
    });
    // Actions: macOS Native Tabs
    if (isMacintosh) {
        for (const command of [
            {
                handler: NewWindowTabHandler,
                id: 'workbench.action.newWindowTab',
                title: localize2('newTab', 'New Window Tab'),
            },
            {
                handler: ShowPreviousWindowTabHandler,
                id: 'workbench.action.showPreviousWindowTab',
                title: localize2('showPreviousTab', 'Show Previous Window Tab'),
            },
            {
                handler: ShowNextWindowTabHandler,
                id: 'workbench.action.showNextWindowTab',
                title: localize2('showNextWindowTab', 'Show Next Window Tab'),
            },
            {
                handler: MoveWindowTabToNewWindowHandler,
                id: 'workbench.action.moveWindowTabToNewWindow',
                title: localize2('moveWindowTabToNewWindow', 'Move Window Tab to New Window'),
            },
            {
                handler: MergeWindowTabsHandlerHandler,
                id: 'workbench.action.mergeAllWindowTabs',
                title: localize2('mergeAllWindowTabs', 'Merge All Windows'),
            },
            {
                handler: ToggleWindowTabsBarHandler,
                id: 'workbench.action.toggleWindowTabsBar',
                title: localize2('toggleWindowTabsBar', 'Toggle Window Tabs Bar'),
            },
        ]) {
            CommandsRegistry.registerCommand(command.id, command.handler);
            MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
                command,
                when: ContextKeyExpr.equals('config.window.nativeTabs', true),
            });
        }
    }
    // Actions: Developer
    registerAction2(ReloadWindowWithExtensionsDisabledAction);
    registerAction2(ConfigureRuntimeArgumentsAction);
    registerAction2(ToggleDevToolsAction);
    registerAction2(OpenUserDataFolderAction);
    registerAction2(ShowGPUInfoAction);
})();
(function registerMenu() {
    // Quit
    MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
        group: 'z_Exit',
        command: {
            id: 'workbench.action.quit',
            title: localize({ key: 'miExit', comment: ['&& denotes a mnemonic'] }, 'E&&xit'),
        },
        order: 1,
        when: IsMacContext.toNegated(),
    });
})();
(function registerConfiguration() {
    const registry = Registry.as(ConfigurationExtensions.Configuration);
    // Application
    registry.registerConfiguration({
        ...applicationConfigurationNodeBase,
        properties: {
            'application.shellEnvironmentResolutionTimeout': {
                type: 'number',
                default: 10,
                minimum: 1,
                maximum: 120,
                included: !isWindows,
                scope: 1 /* ConfigurationScope.APPLICATION */,
                markdownDescription: localize('application.shellEnvironmentResolutionTimeout', 'Controls the timeout in seconds before giving up resolving the shell environment when the application is not already launched from a terminal. See our [documentation](https://go.microsoft.com/fwlink/?linkid=2149667) for more information.'),
            },
        },
    });
    // Window
    registry.registerConfiguration({
        id: 'window',
        order: 8,
        title: localize('windowConfigurationTitle', 'Window'),
        type: 'object',
        properties: {
            'window.confirmSaveUntitledWorkspace': {
                type: 'boolean',
                default: true,
                description: localize('confirmSaveUntitledWorkspace', 'Controls whether a confirmation dialog shows asking to save or discard an opened untitled workspace in the window when switching to another workspace. Disabling the confirmation dialog will always discard the untitled workspace.'),
            },
            'window.openWithoutArgumentsInNewWindow': {
                type: 'string',
                enum: ['on', 'off'],
                enumDescriptions: [
                    localize('window.openWithoutArgumentsInNewWindow.on', 'Open a new empty window.'),
                    localize('window.openWithoutArgumentsInNewWindow.off', 'Focus the last active running instance.'),
                ],
                default: isMacintosh ? 'off' : 'on',
                scope: 1 /* ConfigurationScope.APPLICATION */,
                markdownDescription: localize('openWithoutArgumentsInNewWindow', 'Controls whether a new empty window should open when starting a second instance without arguments or if the last running instance should get focus.\nNote that there can still be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).'),
            },
            'window.restoreWindows': {
                type: 'string',
                enum: ['preserve', 'all', 'folders', 'one', 'none'],
                enumDescriptions: [
                    localize('window.reopenFolders.preserve', 'Always reopen all windows. If a folder or workspace is opened (e.g. from the command line) it opens as a new window unless it was opened before. If files are opened they will open in one of the restored windows together with editors that were previously opened.'),
                    localize('window.reopenFolders.all', 'Reopen all windows unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window.'),
                    localize('window.reopenFolders.folders', 'Reopen all windows that had folders or workspaces opened unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window.'),
                    localize('window.reopenFolders.one', 'Reopen the last active window unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window.'),
                    localize('window.reopenFolders.none', 'Never reopen a window. Unless a folder or workspace is opened (e.g. from the command line), an empty window will appear.'),
                ],
                default: 'all',
                scope: 1 /* ConfigurationScope.APPLICATION */,
                description: localize('restoreWindows', 'Controls how windows and editors within are being restored when opening.'),
            },
            'window.restoreFullscreen': {
                type: 'boolean',
                default: false,
                scope: 1 /* ConfigurationScope.APPLICATION */,
                description: localize('restoreFullscreen', 'Controls whether a window should restore to full screen mode if it was exited in full screen mode.'),
            },
            'window.zoomLevel': {
                type: 'number',
                default: 0,
                minimum: MIN_ZOOM_LEVEL,
                maximum: MAX_ZOOM_LEVEL,
                markdownDescription: localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'zoomLevel' }, "Adjust the default zoom level for all windows. Each increment above `0` (e.g. `1`) or below (e.g. `-1`) represents zooming `20%` larger or smaller. You can also enter decimals to adjust the zoom level with a finer granularity. See {0} for configuring if the 'Zoom In' and 'Zoom Out' commands apply the zoom level to all windows or only the active window.", '`#window.zoomPerWindow#`'),
                ignoreSync: true,
                tags: ['accessibility'],
            },
            'window.zoomPerWindow': {
                type: 'boolean',
                default: true,
                markdownDescription: localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'zoomPerWindow' }, "Controls if the 'Zoom In' and 'Zoom Out' commands apply the zoom level to all windows or only the active window. See {0} for configuring a default zoom level for all windows.", '`#window.zoomLevel#`'),
                tags: ['accessibility'],
            },
            'window.newWindowDimensions': {
                type: 'string',
                enum: ['default', 'inherit', 'offset', 'maximized', 'fullscreen'],
                enumDescriptions: [
                    localize('window.newWindowDimensions.default', 'Open new windows in the center of the screen.'),
                    localize('window.newWindowDimensions.inherit', 'Open new windows with same dimension as last active one.'),
                    localize('window.newWindowDimensions.offset', 'Open new windows with same dimension as last active one with an offset position.'),
                    localize('window.newWindowDimensions.maximized', 'Open new windows maximized.'),
                    localize('window.newWindowDimensions.fullscreen', 'Open new windows in full screen mode.'),
                ],
                default: 'default',
                scope: 1 /* ConfigurationScope.APPLICATION */,
                description: localize('newWindowDimensions', 'Controls the dimensions of opening a new window when at least one window is already opened. Note that this setting does not have an impact on the first window that is opened. The first window will always restore the size and location as you left it before closing.'),
            },
            'window.closeWhenEmpty': {
                type: 'boolean',
                default: false,
                description: localize('closeWhenEmpty', 'Controls whether closing the last editor should also close the window. This setting only applies for windows that do not show folders.'),
            },
            'window.doubleClickIconToClose': {
                type: 'boolean',
                default: false,
                scope: 1 /* ConfigurationScope.APPLICATION */,
                markdownDescription: localize('window.doubleClickIconToClose', 'If enabled, this setting will close the window when the application icon in the title bar is double-clicked. The window will not be able to be dragged by the icon. This setting is effective only if {0} is set to `custom`.', '`#window.titleBarStyle#`'),
            },
            'window.titleBarStyle': {
                type: 'string',
                enum: ['native', 'custom'],
                default: 'custom',
                scope: 1 /* ConfigurationScope.APPLICATION */,
                description: localize('titleBarStyle', 'Adjust the appearance of the window title bar to be native by the OS or custom. On Linux and Windows, this setting also affects the application and context menu appearances. Changes require a full restart to apply.'),
            },
            'window.controlsStyle': {
                type: 'string',
                enum: ['native', 'custom', 'hidden'],
                default: 'native',
                included: !isMacintosh,
                scope: 1 /* ConfigurationScope.APPLICATION */,
                description: localize('controlsStyle', 'Adjust the appearance of the window controls to be native by the OS, custom drawn or hidden. Changes require a full restart to apply.'),
            },
            'window.customTitleBarVisibility': {
                type: 'string',
                enum: ['auto', 'windowed', 'never'],
                markdownEnumDescriptions: [
                    localize(`window.customTitleBarVisibility.auto`, 'Automatically changes custom title bar visibility.'),
                    localize(`window.customTitleBarVisibility.windowed`, 'Hide custom titlebar in full screen. When not in full screen, automatically change custom title bar visibility.'),
                    localize(`window.customTitleBarVisibility.never`, 'Hide custom titlebar when {0} is set to `native`.', '`#window.titleBarStyle#`'),
                ],
                default: 'auto',
                scope: 1 /* ConfigurationScope.APPLICATION */,
                markdownDescription: localize('window.customTitleBarVisibility', 'Adjust when the custom title bar should be shown. The custom title bar can be hidden when in full screen mode with `windowed`. The custom title bar can only be hidden in non full screen mode with `never` when {0} is set to `native`.', '`#window.titleBarStyle#`'),
            },
            'window.dialogStyle': {
                type: 'string',
                enum: ['native', 'custom'],
                default: 'native',
                scope: 1 /* ConfigurationScope.APPLICATION */,
                description: localize('dialogStyle', 'Adjust the appearance of dialog windows.'),
            },
            'window.nativeTabs': {
                type: 'boolean',
                default: false,
                scope: 1 /* ConfigurationScope.APPLICATION */,
                description: localize('window.nativeTabs', 'Enables macOS Sierra window tabs. Note that changes require a full restart to apply and that native tabs will disable a custom title bar style if configured.'),
                included: isMacintosh,
            },
            'window.nativeFullScreen': {
                type: 'boolean',
                default: true,
                description: localize('window.nativeFullScreen', 'Controls if native full-screen should be used on macOS. Disable this option to prevent macOS from creating a new space when going full-screen.'),
                scope: 1 /* ConfigurationScope.APPLICATION */,
                included: isMacintosh,
            },
            'window.clickThroughInactive': {
                type: 'boolean',
                default: true,
                scope: 1 /* ConfigurationScope.APPLICATION */,
                description: localize('window.clickThroughInactive', 'If enabled, clicking on an inactive window will both activate the window and trigger the element under the mouse if it is clickable. If disabled, clicking anywhere on an inactive window will activate it only and a second click is required on the element.'),
                included: isMacintosh,
            },
        },
    });
    // Telemetry
    registry.registerConfiguration({
        id: 'telemetry',
        order: 110,
        title: localize('telemetryConfigurationTitle', 'Telemetry'),
        type: 'object',
        properties: {
            'telemetry.enableCrashReporter': {
                type: 'boolean',
                description: localize('telemetry.enableCrashReporting', 'Enable crash reports to be collected. This helps us improve stability. \nThis option requires restart to take effect.'),
                default: true,
                tags: ['usesOnlineServices', 'telemetry'],
                markdownDeprecationMessage: localize('enableCrashReporterDeprecated', "If this setting is false, no telemetry will be sent regardless of the new setting's value. Deprecated due to being combined into the {0} setting.", `\`#${TELEMETRY_SETTING_ID}#\``),
            },
        },
    });
    // Keybinding
    registry.registerConfiguration({
        id: 'keyboard',
        order: 15,
        type: 'object',
        title: localize('keyboardConfigurationTitle', 'Keyboard'),
        properties: {
            'keyboard.touchbar.enabled': {
                type: 'boolean',
                default: true,
                description: localize('touchbar.enabled', 'Enables the macOS touchbar buttons on the keyboard if available.'),
                included: isMacintosh,
            },
            'keyboard.touchbar.ignored': {
                type: 'array',
                items: {
                    type: 'string',
                },
                default: [],
                markdownDescription: localize('touchbar.ignored', 'A set of identifiers for entries in the touchbar that should not show up (for example `workbench.action.navigateBack`).'),
                included: isMacintosh,
            },
        },
    });
    // Security
    registry.registerConfiguration({
        ...securityConfigurationNodeBase,
        properties: {
            'security.promptForLocalFileProtocolHandling': {
                type: 'boolean',
                default: true,
                markdownDescription: localize('security.promptForLocalFileProtocolHandling', 'If enabled, a dialog will ask for confirmation whenever a local file or workspace is about to open through a protocol handler.'),
                scope: 1 /* ConfigurationScope.APPLICATION */,
            },
            'security.promptForRemoteFileProtocolHandling': {
                type: 'boolean',
                default: true,
                markdownDescription: localize('security.promptForRemoteFileProtocolHandling', 'If enabled, a dialog will ask for confirmation whenever a remote file or workspace is about to open through a protocol handler.'),
                scope: 1 /* ConfigurationScope.APPLICATION */,
            },
        },
    });
})();
(function registerJSONSchemas() {
    const argvDefinitionFileSchemaId = 'vscode://schemas/argv';
    const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
    const schema = {
        id: argvDefinitionFileSchemaId,
        allowComments: true,
        allowTrailingCommas: true,
        description: 'VSCode static command line definition file',
        type: 'object',
        additionalProperties: false,
        properties: {
            locale: {
                type: 'string',
                description: localize('argv.locale', 'The display Language to use. Picking a different language requires the associated language pack to be installed.'),
            },
            'disable-lcd-text': {
                type: 'boolean',
                description: localize('argv.disableLcdText', 'Disables LCD font antialiasing.'),
            },
            'proxy-bypass-list': {
                type: 'string',
                description: localize('argv.proxyBypassList', 'Bypass any specified proxy for the given semi-colon-separated list of hosts. Example value "<local>;*.microsoft.com;*foo.com;1.2.3.4:5678", will use the proxy server for all hosts except for local addresses (localhost, 127.0.0.1 etc.), microsoft.com subdomains, hosts that contain the suffix foo.com and anything at 1.2.3.4:5678'),
            },
            'disable-hardware-acceleration': {
                type: 'boolean',
                description: localize('argv.disableHardwareAcceleration', 'Disables hardware acceleration. ONLY change this option if you encounter graphic issues.'),
            },
            'force-color-profile': {
                type: 'string',
                markdownDescription: localize('argv.forceColorProfile', 'Allows to override the color profile to use. If you experience colors appear badly, try to set this to `srgb` and restart.'),
            },
            'enable-crash-reporter': {
                type: 'boolean',
                markdownDescription: localize('argv.enableCrashReporter', 'Allows to disable crash reporting, should restart the app if the value is changed.'),
            },
            'crash-reporter-id': {
                type: 'string',
                markdownDescription: localize('argv.crashReporterId', 'Unique id used for correlating crash reports sent from this app instance.'),
            },
            'enable-proposed-api': {
                type: 'array',
                description: localize('argv.enebleProposedApi', 'Enable proposed APIs for a list of extension ids (such as \`vscode.git\`). Proposed APIs are unstable and subject to breaking without warning at any time. This should only be set for extension development and testing purposes.'),
                items: {
                    type: 'string',
                },
            },
            'log-level': {
                type: ['string', 'array'],
                description: localize('argv.logLevel', "Log level to use. Default is 'info'. Allowed values are 'error', 'warn', 'info', 'debug', 'trace', 'off'."),
            },
            'disable-chromium-sandbox': {
                type: 'boolean',
                description: localize('argv.disableChromiumSandbox', 'Disables the Chromium sandbox. This is useful when running VS Code as elevated on Linux and running under Applocker on Windows.'),
            },
            'use-inmemory-secretstorage': {
                type: 'boolean',
                description: localize('argv.useInMemorySecretStorage', "Ensures that an in-memory store will be used for secret storage instead of using the OS's credential store. This is often used when running VS Code extension tests or when you're experiencing difficulties with the credential store."),
            },
        },
    };
    if (isLinux) {
        schema.properties['force-renderer-accessibility'] = {
            type: 'boolean',
            description: localize('argv.force-renderer-accessibility', 'Forces the renderer to be accessible. ONLY change this if you are using a screen reader on Linux. On other platforms the renderer will automatically be accessible. This flag is automatically set if you have editor.accessibilitySupport: on.'),
        };
        schema.properties['password-store'] = {
            type: 'string',
            description: localize('argv.passwordStore', 'Configures the backend used to store secrets on Linux. This argument is ignored on Windows & macOS.'),
        };
    }
    jsonRegistry.registerSchema(argvDefinitionFileSchemaId, schema);
})();
(function registerWorkbenchContributions() {
    registerWorkbenchContribution2('workbench.contributions.defaultAccountManagement', DefaultAccountManagementContribution, 3 /* WorkbenchPhase.AfterRestored */);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVza3RvcC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9lbGVjdHJvbi1zYW5kYm94L2Rlc2t0b3AuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRyxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9FLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0Isb0JBQW9CLEVBQ3BCLHdDQUF3QyxFQUN4Qyx3QkFBd0IsRUFDeEIsaUJBQWlCLEdBQ2pCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUNOLGVBQWUsRUFDZixhQUFhLEVBQ2IsWUFBWSxFQUNaLGlCQUFpQixFQUNqQixrQkFBa0IsRUFDbEIsdUJBQXVCLEVBQ3ZCLG1CQUFtQixFQUNuQiw0QkFBNEIsRUFDNUIsd0JBQXdCLEVBQ3hCLCtCQUErQixFQUMvQiw2QkFBNkIsRUFDN0IsMEJBQTBCLEdBQzFCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZ0JBQWdC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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVza3RvcC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvZWxlY3Ryb24tc2FuZGJveC9kZXNrdG9wLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDbEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDaEcsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFBTSw4REFBOEQsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sK0JBQStCLEVBQy9CLG9CQUFvQixFQUNwQix3Q0FBd0MsRUFDeEMsd0JBQXdCLEVBQ3hCLGlCQUFpQixHQUNqQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixlQUFlLEVBQ2YsYUFBYSxFQUNiLFlBQVksRUFDWixpQkFBaUIsRUFDakIsa0JBQWtCLEVBQ2xCLHVCQUF1QixFQUN2QixtQkFBbUIsRUFDbkIsNEJBQTRCLEVBQzVCLHdCQUF3QixFQUN4QiwrQkFBK0IsRUFDL0IsNkJBQTZCLEVBQzdCLDBCQUEwQixHQUMxQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUE7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
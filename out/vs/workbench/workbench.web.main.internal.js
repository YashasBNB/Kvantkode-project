/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// #######################################################################
// ###                                                                 ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO WORKBENCH.COMMON.MAIN.TS !!! ###
// ###                                                                 ###
// #######################################################################
//#region --- workbench common
import './workbench.common.main.js';
//#endregion
//#region --- workbench parts
import './browser/parts/dialogs/dialog.web.contribution.js';
//#endregion
//#region --- workbench (web main)
import './browser/web.main.js';
//#endregion
//#region --- workbench services
import './services/integrity/browser/integrityService.js';
import './services/search/browser/searchService.js';
import './services/textfile/browser/browserTextFileService.js';
import './services/keybinding/browser/keyboardLayoutService.js';
import './services/extensions/browser/extensionService.js';
import './services/extensionManagement/browser/extensionsProfileScannerService.js';
import './services/extensions/browser/extensionsScannerService.js';
import './services/extensionManagement/browser/webExtensionsScannerService.js';
import './services/extensionManagement/common/extensionManagementServerService.js';
import './services/extensionManagement/browser/extensionGalleryManifestService.js';
import './services/telemetry/browser/telemetryService.js';
import './services/url/browser/urlService.js';
import './services/update/browser/updateService.js';
import './services/workspaces/browser/workspacesService.js';
import './services/workspaces/browser/workspaceEditingService.js';
import './services/dialogs/browser/fileDialogService.js';
import './services/host/browser/browserHostService.js';
import './services/lifecycle/browser/lifecycleService.js';
import './services/clipboard/browser/clipboardService.js';
import './services/localization/browser/localeService.js';
import './services/path/browser/pathService.js';
import './services/themes/browser/browserHostColorSchemeService.js';
import './services/encryption/browser/encryptionService.js';
import './services/secrets/browser/secretStorageService.js';
import './services/workingCopy/browser/workingCopyBackupService.js';
import './services/tunnel/browser/tunnelService.js';
import './services/files/browser/elevatedFileService.js';
import './services/workingCopy/browser/workingCopyHistoryService.js';
import './services/userDataSync/browser/webUserDataSyncEnablementService.js';
import './services/userDataProfile/browser/userDataProfileStorageService.js';
import './services/configurationResolver/browser/configurationResolverService.js';
import '../platform/extensionResourceLoader/browser/extensionResourceLoaderService.js';
import './services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { registerSingleton, } from '../platform/instantiation/common/extensions.js';
import { IAccessibilityService } from '../platform/accessibility/common/accessibility.js';
import { IContextMenuService } from '../platform/contextview/browser/contextView.js';
import { ContextMenuService } from '../platform/contextview/browser/contextMenuService.js';
import { IExtensionTipsService } from '../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionTipsService } from '../platform/extensionManagement/common/extensionTipsService.js';
import { IWorkbenchExtensionManagementService } from './services/extensionManagement/common/extensionManagement.js';
import { ExtensionManagementService } from './services/extensionManagement/common/extensionManagementService.js';
import { LogLevel } from '../platform/log/common/log.js';
import { UserDataSyncMachinesService, IUserDataSyncMachinesService, } from '../platform/userDataSync/common/userDataSyncMachines.js';
import { IUserDataSyncStoreService, IUserDataSyncService, IUserDataAutoSyncService, IUserDataSyncLocalStoreService, IUserDataSyncResourceProviderService, } from '../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncStoreService } from '../platform/userDataSync/common/userDataSyncStoreService.js';
import { UserDataSyncLocalStoreService } from '../platform/userDataSync/common/userDataSyncLocalStoreService.js';
import { UserDataSyncService } from '../platform/userDataSync/common/userDataSyncService.js';
import { IUserDataSyncAccountService, UserDataSyncAccountService, } from '../platform/userDataSync/common/userDataSyncAccount.js';
import { UserDataAutoSyncService } from '../platform/userDataSync/common/userDataAutoSyncService.js';
import { AccessibilityService } from '../platform/accessibility/browser/accessibilityService.js';
import { ICustomEndpointTelemetryService } from '../platform/telemetry/common/telemetry.js';
import { NullEndpointTelemetryService } from '../platform/telemetry/common/telemetryUtils.js';
import { ITitleService } from './services/title/browser/titleService.js';
import { BrowserTitleService } from './browser/parts/titlebar/titlebarPart.js';
import { ITimerService, TimerService } from './services/timer/browser/timerService.js';
import { IDiagnosticsService, NullDiagnosticsService, } from '../platform/diagnostics/common/diagnostics.js';
import { ILanguagePackService } from '../platform/languagePacks/common/languagePacks.js';
import { WebLanguagePacksService } from '../platform/languagePacks/browser/languagePacks.js';
import { IWebContentExtractorService, NullWebContentExtractorService, ISharedWebContentExtractorService, NullSharedWebContentExtractorService, } from '../platform/webContentExtractor/common/webContentExtractor.js';
import { IDefaultAccountService, NullDefaultAccountService, } from './services/accounts/common/defaultAccount.js';
registerSingleton(IWorkbenchExtensionManagementService, ExtensionManagementService, 1 /* InstantiationType.Delayed */);
registerSingleton(IAccessibilityService, AccessibilityService, 1 /* InstantiationType.Delayed */);
registerSingleton(IContextMenuService, ContextMenuService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncStoreService, UserDataSyncStoreService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncMachinesService, UserDataSyncMachinesService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncLocalStoreService, UserDataSyncLocalStoreService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncAccountService, UserDataSyncAccountService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncService, UserDataSyncService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncResourceProviderService, UserDataSyncResourceProviderService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataAutoSyncService, UserDataAutoSyncService, 0 /* InstantiationType.Eager */);
registerSingleton(ITitleService, BrowserTitleService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtensionTipsService, ExtensionTipsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITimerService, TimerService, 1 /* InstantiationType.Delayed */);
registerSingleton(ICustomEndpointTelemetryService, NullEndpointTelemetryService, 1 /* InstantiationType.Delayed */);
registerSingleton(IDiagnosticsService, NullDiagnosticsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguagePackService, WebLanguagePacksService, 1 /* InstantiationType.Delayed */);
registerSingleton(IWebContentExtractorService, NullWebContentExtractorService, 1 /* InstantiationType.Delayed */);
registerSingleton(ISharedWebContentExtractorService, NullSharedWebContentExtractorService, 1 /* InstantiationType.Delayed */);
registerSingleton(IDefaultAccountService, NullDefaultAccountService, 1 /* InstantiationType.Delayed */);
//#endregion
//#region --- workbench contributions
// Logs
import './contrib/logs/browser/logs.contribution.js';
// Localization
import './contrib/localization/browser/localization.contribution.js';
// Performance
import './contrib/performance/browser/performance.web.contribution.js';
// Preferences
import './contrib/preferences/browser/keyboardLayoutPicker.js';
// Debug
import './contrib/debug/browser/extensionHostDebugService.js';
// Welcome Banner
import './contrib/welcomeBanner/browser/welcomeBanner.contribution.js';
// Welcome Dialog
import './contrib/welcomeDialog/browser/welcomeDialog.contribution.js';
// Webview
import './contrib/webview/browser/webview.web.contribution.js';
// Extensions Management
import './contrib/extensions/browser/extensions.web.contribution.js';
// Terminal
import './contrib/terminal/browser/terminal.web.contribution.js';
import './contrib/externalTerminal/browser/externalTerminal.contribution.js';
import './contrib/terminal/browser/terminalInstanceService.js';
// Tasks
import './contrib/tasks/browser/taskService.js';
// Tags
import './contrib/tags/browser/workspaceTagsService.js';
// Issues
import './contrib/issue/browser/issue.contribution.js';
// Splash
import './contrib/splash/browser/splash.contribution.js';
// Remote Start Entry for the Web
import './contrib/remote/browser/remoteStartEntry.contribution.js';
//#endregion
//#region --- export workbench factory
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// Do NOT change these exports in a way that something is removed unless
// intentional. These exports are used by web embedders and thus require
// an adoption when something changes.
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
import { create, commands, env, window, workspace, logger } from './browser/web.factory.js';
import { Menu } from './browser/web.api.js';
import { URI } from '../base/common/uri.js';
import { Event, Emitter } from '../base/common/event.js';
import { Disposable } from '../base/common/lifecycle.js';
import { GroupOrientation } from './services/editor/common/editorGroupsService.js';
import { UserDataSyncResourceProviderService } from '../platform/userDataSync/common/userDataSyncResourceProvider.js';
import { RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode, } from '../platform/remote/common/remoteAuthorityResolver.js';
// TODO@esm remove me once we stop supporting our web-esm-bridge
if (globalThis.__VSCODE_WEB_ESM_PROMISE) {
    const exports = {
        // Factory
        create: create,
        // Basic Types
        URI: URI,
        Event: Event,
        Emitter: Emitter,
        Disposable: Disposable,
        // GroupOrientation,
        LogLevel: LogLevel,
        RemoteAuthorityResolverError: RemoteAuthorityResolverError,
        RemoteAuthorityResolverErrorCode: RemoteAuthorityResolverErrorCode,
        // Facade API
        env: env,
        window: window,
        workspace: workspace,
        commands: commands,
        logger: logger,
        Menu: Menu,
    };
    globalThis.__VSCODE_WEB_ESM_PROMISE(exports);
    delete globalThis.__VSCODE_WEB_ESM_PROMISE;
}
export { 
// Factory
create, 
// Basic Types
URI, Event, Emitter, Disposable, GroupOrientation, LogLevel, RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode, 
// Facade API
env, window, workspace, commands, logger, Menu, };
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLndlYi5tYWluLmludGVybmFsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvd29ya2JlbmNoLndlYi5tYWluLmludGVybmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFFMUUsOEJBQThCO0FBRTlCLE9BQU8sNEJBQTRCLENBQUE7QUFFbkMsWUFBWTtBQUVaLDZCQUE2QjtBQUU3QixPQUFPLG9EQUFvRCxDQUFBO0FBRTNELFlBQVk7QUFFWixrQ0FBa0M7QUFFbEMsT0FBTyx1QkFBdUIsQ0FBQTtBQUU5QixZQUFZO0FBRVosZ0NBQWdDO0FBRWhDLE9BQU8sa0RBQWtELENBQUE7QUFDekQsT0FBTyw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sMkRBQTJELENBQUE7QUFDbEUsT0FBTyx1RUFBdUUsQ0FBQTtBQUM5RSxPQUFPLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sMkVBQTJFLENBQUE7QUFDbEYsT0FBTyxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8saURBQWlELENBQUE7QUFDeEQsT0FBTywrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sa0RBQWtELENBQUE7QUFDekQsT0FBTyxrREFBa0QsQ0FBQTtBQUN6RCxPQUFP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
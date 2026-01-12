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
//#region --- workbench (desktop main)
import './electron-sandbox/desktop.main.js';
import './electron-sandbox/desktop.contribution.js';
//#endregion
//#region --- workbench parts
import './electron-sandbox/parts/dialogs/dialog.contribution.js';
//#endregion
//#region --- workbench services
import './services/textfile/electron-sandbox/nativeTextFileService.js';
import './services/dialogs/electron-sandbox/fileDialogService.js';
import './services/workspaces/electron-sandbox/workspacesService.js';
import './services/menubar/electron-sandbox/menubarService.js';
import './services/update/electron-sandbox/updateService.js';
import './services/url/electron-sandbox/urlService.js';
import './services/lifecycle/electron-sandbox/lifecycleService.js';
import './services/title/electron-sandbox/titleService.js';
import './services/host/electron-sandbox/nativeHostService.js';
import './services/request/electron-sandbox/requestService.js';
import './services/clipboard/electron-sandbox/clipboardService.js';
import './services/contextmenu/electron-sandbox/contextmenuService.js';
import './services/workspaces/electron-sandbox/workspaceEditingService.js';
import './services/configurationResolver/electron-sandbox/configurationResolverService.js';
import './services/accessibility/electron-sandbox/accessibilityService.js';
import './services/keybinding/electron-sandbox/nativeKeyboardLayout.js';
import './services/path/electron-sandbox/pathService.js';
import './services/themes/electron-sandbox/nativeHostColorSchemeService.js';
import './services/extensionManagement/electron-sandbox/extensionManagementService.js';
import './services/encryption/electron-sandbox/encryptionService.js';
import './services/secrets/electron-sandbox/secretStorageService.js';
import './services/localization/electron-sandbox/languagePackService.js';
import './services/telemetry/electron-sandbox/telemetryService.js';
import './services/extensions/electron-sandbox/extensionHostStarter.js';
import '../platform/extensionResourceLoader/common/extensionResourceLoaderService.js';
import './services/localization/electron-sandbox/localeService.js';
import './services/extensions/electron-sandbox/extensionsScannerService.js';
import './services/extensionManagement/electron-sandbox/extensionManagementServerService.js';
import './services/extensionManagement/electron-sandbox/extensionGalleryManifestService.js';
import './services/extensionManagement/electron-sandbox/extensionTipsService.js';
import './services/userDataSync/electron-sandbox/userDataSyncService.js';
import './services/userDataSync/electron-sandbox/userDataAutoSyncService.js';
import './services/timer/electron-sandbox/timerService.js';
import './services/environment/electron-sandbox/shellEnvironmentService.js';
import './services/integrity/electron-sandbox/integrityService.js';
import './services/workingCopy/electron-sandbox/workingCopyBackupService.js';
import './services/checksum/electron-sandbox/checksumService.js';
import '../platform/remote/electron-sandbox/sharedProcessTunnelService.js';
import './services/tunnel/electron-sandbox/tunnelService.js';
import '../platform/diagnostics/electron-sandbox/diagnosticsService.js';
import '../platform/profiling/electron-sandbox/profilingService.js';
import '../platform/telemetry/electron-sandbox/customEndpointTelemetryService.js';
import '../platform/remoteTunnel/electron-sandbox/remoteTunnelService.js';
import './services/files/electron-sandbox/elevatedFileService.js';
import './services/search/electron-sandbox/searchService.js';
import './services/workingCopy/electron-sandbox/workingCopyHistoryService.js';
import './services/userDataSync/browser/userDataSyncEnablementService.js';
import './services/extensions/electron-sandbox/nativeExtensionService.js';
import '../platform/userDataProfile/electron-sandbox/userDataProfileStorageService.js';
import './services/auxiliaryWindow/electron-sandbox/auxiliaryWindowService.js';
import '../platform/extensionManagement/electron-sandbox/extensionsProfileScannerService.js';
import '../platform/webContentExtractor/electron-sandbox/webContentExtractorService.js';
import { registerSingleton } from '../platform/instantiation/common/extensions.js';
import { IUserDataInitializationService, UserDataInitializationService, } from './services/userData/browser/userDataInit.js';
import { SyncDescriptor } from '../platform/instantiation/common/descriptors.js';
registerSingleton(IUserDataInitializationService, new SyncDescriptor(UserDataInitializationService, [[]], true));
//#endregion
//#region --- workbench contributions
// Logs
import './contrib/logs/electron-sandbox/logs.contribution.js';
// Localizations
import './contrib/localization/electron-sandbox/localization.contribution.js';
// Explorer
import './contrib/files/electron-sandbox/fileActions.contribution.js';
// CodeEditor Contributions
import './contrib/codeEditor/electron-sandbox/codeEditor.contribution.js';
// Debug
import './contrib/debug/electron-sandbox/extensionHostDebugService.js';
// Extensions Management
import './contrib/extensions/electron-sandbox/extensions.contribution.js';
// Issues
import './contrib/issue/electron-sandbox/issue.contribution.js';
// Process
import './contrib/issue/electron-sandbox/process.contribution.js';
// Remote
import './contrib/remote/electron-sandbox/remote.contribution.js';
// Terminal
import './contrib/terminal/electron-sandbox/terminal.contribution.js';
// Themes
import './contrib/themes/browser/themes.test.contribution.js';
import './services/themes/electron-sandbox/themes.contribution.js';
// User Data Sync
import './contrib/userDataSync/electron-sandbox/userDataSync.contribution.js';
// Tags
import './contrib/tags/electron-sandbox/workspaceTagsService.js';
import './contrib/tags/electron-sandbox/tags.contribution.js';
// Performance
import './contrib/performance/electron-sandbox/performance.contribution.js';
// Tasks
import './contrib/tasks/electron-sandbox/taskService.js';
// External terminal
import './contrib/externalTerminal/electron-sandbox/externalTerminal.contribution.js';
// Webview
import './contrib/webview/electron-sandbox/webview.contribution.js';
// Splash
import './contrib/splash/electron-sandbox/splash.contribution.js';
// Local History
import './contrib/localHistory/electron-sandbox/localHistory.contribution.js';
// Merge Editor
import './contrib/mergeEditor/electron-sandbox/mergeEditor.contribution.js';
// Multi Diff Editor
import './contrib/multiDiffEditor/browser/multiDiffEditor.contribution.js';
// Remote Tunnel
import './contrib/remoteTunnel/electron-sandbox/remoteTunnel.contribution.js';
// Chat
import './contrib/chat/electron-sandbox/chat.contribution.js';
import './contrib/inlineChat/electron-sandbox/inlineChat.contribution.js';
// Encryption
import './contrib/encryption/electron-sandbox/encryption.contribution.js';
// Emergency Alert
import './contrib/emergencyAlert/electron-sandbox/emergencyAlert.contribution.js';
// MCP
import './contrib/mcp/electron-sandbox/mcp.contribution.js';
//#endregion
export { main } from './electron-sandbox/desktop.main.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmRlc2t0b3AubWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3dvcmtiZW5jaC5kZXNrdG9wLm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUUxRSw4QkFBOEI7QUFFOUIsT0FBTyw0QkFBNEIsQ0FBQTtBQUVuQyxZQUFZO0FBRVosc0NBQXNDO0FBRXRDLE9BQU8sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyw0Q0FBNEMsQ0FBQTtBQUVuRCxZQUFZO0FBRVosNkJBQTZCO0FBRTdCLE9BQU8seURBQXlELENBQUE7QUFFaEUsWUFBWTtBQUVaLGdDQUFnQztBQUVoQyxPQUFPLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sMERBQTBELENBQUE7QUFDakUsT0FBTyw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8scURBQXFELENBQUE7QUFDNUQsT0FBTywrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sbURBQW1ELENBQUE7QUFDMUQsT0FBTyx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sMkRBQTJELENBQUE7QUFDbEUsT0FBTywrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLG1FQUFtRSxDQUFBO0FBQzFFLE9BQU8sbUZBQW1GLENBQUE7QUFDMUYsT0FBTyxtRUFBbUUsQ0FBQTtBQUMxRSxPQUFPLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8saURBQWlELENBQUE7QUFDeEQsT0FBTyxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLCtFQUErRSxDQUFBO0FBQ3RGLE9BQU8sNkRBQTZELENB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
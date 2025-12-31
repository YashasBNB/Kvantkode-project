/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//#region --- editor/workbench core
import '../editor/editor.all.js';
import './api/browser/extensionHost.contribution.js';
import './browser/workbench.contribution.js';
//#endregion
//#region --- Void
import './contrib/void/browser/void.contribution.js'; // Void added this
//#endregion
//#region --- workbench actions
import './browser/actions/textInputActions.js';
import './browser/actions/developerActions.js';
import './browser/actions/helpActions.js';
import './browser/actions/layoutActions.js';
import './browser/actions/listCommands.js';
import './browser/actions/navigationActions.js';
import './browser/actions/windowActions.js';
import './browser/actions/workspaceActions.js';
import './browser/actions/workspaceCommands.js';
import './browser/actions/quickAccessActions.js';
import './browser/actions/widgetNavigationCommands.js';
//#endregion
//#region --- API Extension Points
import './services/actions/common/menusExtensionPoint.js';
import './api/common/configurationExtensionPoint.js';
import './api/browser/viewsExtensionPoint.js';
//#endregion
//#region --- workbench parts
import './browser/parts/editor/editor.contribution.js';
import './browser/parts/editor/editorParts.js';
import './browser/parts/paneCompositePartService.js';
import './browser/parts/banner/bannerPart.js';
import './browser/parts/statusbar/statusbarPart.js';
//#endregion
//#region --- workbench services
import '../platform/actions/common/actions.contribution.js';
import '../platform/undoRedo/common/undoRedoService.js';
import './services/workspaces/common/editSessionIdentityService.js';
import './services/workspaces/common/canonicalUriService.js';
import './services/extensions/browser/extensionUrlHandler.js';
import './services/keybinding/common/keybindingEditing.js';
import './services/decorations/browser/decorationsService.js';
import './services/dialogs/common/dialogService.js';
import './services/progress/browser/progressService.js';
import './services/editor/browser/codeEditorService.js';
import './services/preferences/browser/preferencesService.js';
import './services/configuration/common/jsonEditingService.js';
import './services/textmodelResolver/common/textModelResolverService.js';
import './services/editor/browser/editorService.js';
import './services/editor/browser/editorResolverService.js';
import './services/aiEmbeddingVector/common/aiEmbeddingVectorService.js';
import './services/aiRelatedInformation/common/aiRelatedInformationService.js';
import './services/history/browser/historyService.js';
import './services/activity/browser/activityService.js';
import './services/keybinding/browser/keybindingService.js';
import './services/untitled/common/untitledTextEditorService.js';
import './services/textresourceProperties/common/textResourcePropertiesService.js';
import './services/textfile/common/textEditorService.js';
import './services/language/common/languageService.js';
import './services/model/common/modelService.js';
import './services/notebook/common/notebookDocumentService.js';
import './services/commands/common/commandService.js';
import './services/themes/browser/workbenchThemeService.js';
import './services/label/common/labelService.js';
import './services/extensions/common/extensionManifestPropertiesService.js';
import './services/extensionManagement/common/extensionGalleryService.js';
import './services/extensionManagement/browser/extensionEnablementService.js';
import './services/extensionManagement/browser/builtinExtensionsScannerService.js';
import './services/extensionRecommendations/common/extensionIgnoredRecommendationsService.js';
import './services/extensionRecommendations/common/workspaceExtensionsConfig.js';
import './services/extensionManagement/common/extensionFeaturesManagemetService.js';
import './services/notification/common/notificationService.js';
import './services/userDataSync/common/userDataSyncUtil.js';
import './services/userDataProfile/browser/userDataProfileImportExportService.js';
import './services/userDataProfile/browser/userDataProfileManagement.js';
import './services/userDataProfile/common/remoteUserDataProfiles.js';
import './services/remote/common/remoteExplorerService.js';
import './services/remote/common/remoteExtensionsScanner.js';
import './services/terminal/common/embedderTerminalService.js';
import './services/workingCopy/common/workingCopyService.js';
import './services/workingCopy/common/workingCopyFileService.js';
import './services/workingCopy/common/workingCopyEditorService.js';
import './services/filesConfiguration/common/filesConfigurationService.js';
import './services/views/browser/viewDescriptorService.js';
import './services/views/browser/viewsService.js';
import './services/quickinput/browser/quickInputService.js';
import './services/userDataSync/browser/userDataSyncWorkbenchService.js';
import './services/authentication/browser/authenticationService.js';
import './services/authentication/browser/authenticationExtensionsService.js';
import './services/authentication/browser/authenticationUsageService.js';
import './services/authentication/browser/authenticationAccessService.js';
import './services/accounts/common/defaultAccount.js';
import '../editor/browser/services/hoverService/hoverService.js';
import './services/assignment/common/assignmentService.js';
import './services/outline/browser/outlineService.js';
import './services/languageDetection/browser/languageDetectionWorkerServiceImpl.js';
import '../editor/common/services/languageFeaturesService.js';
import '../editor/common/services/semanticTokensStylingService.js';
import '../editor/common/services/treeViewsDndService.js';
import './services/textMate/browser/textMateTokenizationFeature.contribution.js';
import './services/treeSitter/browser/treeSitterTokenizationFeature.contribution.js';
import './services/userActivity/common/userActivityService.js';
import './services/userActivity/browser/userActivityBrowser.js';
import './services/editor/browser/editorPaneService.js';
import './services/editor/common/customEditorLabelService.js';
import { registerSingleton, } from '../platform/instantiation/common/extensions.js';
import { GlobalExtensionEnablementService } from '../platform/extensionManagement/common/extensionEnablementService.js';
import { IAllowedExtensionsService, IGlobalExtensionEnablementService, } from '../platform/extensionManagement/common/extensionManagement.js';
import { ContextViewService } from '../platform/contextview/browser/contextViewService.js';
import { IContextViewService } from '../platform/contextview/browser/contextView.js';
import { IListService, ListService } from '../platform/list/browser/listService.js';
import { IEditorWorkerService } from '../editor/common/services/editorWorker.js';
import { WorkbenchEditorWorkerService } from './contrib/codeEditor/browser/workbenchEditorWorkerService.js';
import { MarkerDecorationsService } from '../editor/common/services/markerDecorationsService.js';
import { IMarkerDecorationsService } from '../editor/common/services/markerDecorations.js';
import { IMarkerService } from '../platform/markers/common/markers.js';
import { MarkerService } from '../platform/markers/common/markerService.js';
import { ContextKeyService } from '../platform/contextkey/browser/contextKeyService.js';
import { IContextKeyService } from '../platform/contextkey/common/contextkey.js';
import { ITextResourceConfigurationService } from '../editor/common/services/textResourceConfiguration.js';
import { TextResourceConfigurationService } from '../editor/common/services/textResourceConfigurationService.js';
import { IDownloadService } from '../platform/download/common/download.js';
import { DownloadService } from '../platform/download/common/downloadService.js';
import { OpenerService } from '../editor/browser/services/openerService.js';
import { IOpenerService } from '../platform/opener/common/opener.js';
import { IgnoredExtensionsManagementService, IIgnoredExtensionsManagementService, } from '../platform/userDataSync/common/ignoredExtensions.js';
import { ExtensionStorageService, IExtensionStorageService, } from '../platform/extensionManagement/common/extensionStorage.js';
import { IUserDataSyncLogService } from '../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncLogService } from '../platform/userDataSync/common/userDataSyncLog.js';
registerSingleton(IUserDataSyncLogService, UserDataSyncLogService, 1 /* InstantiationType.Delayed */);
registerSingleton(IAllowedExtensionsService, AllowedExtensionsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IIgnoredExtensionsManagementService, IgnoredExtensionsManagementService, 1 /* InstantiationType.Delayed */);
registerSingleton(IGlobalExtensionEnablementService, GlobalExtensionEnablementService, 1 /* InstantiationType.Delayed */);
registerSingleton(IExtensionStorageService, ExtensionStorageService, 1 /* InstantiationType.Delayed */);
registerSingleton(IContextViewService, ContextViewService, 1 /* InstantiationType.Delayed */);
registerSingleton(IListService, ListService, 1 /* InstantiationType.Delayed */);
registerSingleton(IEditorWorkerService, WorkbenchEditorWorkerService, 0 /* InstantiationType.Eager */);
registerSingleton(IMarkerDecorationsService, MarkerDecorationsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IMarkerService, MarkerService, 1 /* InstantiationType.Delayed */);
registerSingleton(IContextKeyService, ContextKeyService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITextResourceConfigurationService, TextResourceConfigurationService, 1 /* InstantiationType.Delayed */);
registerSingleton(IDownloadService, DownloadService, 1 /* InstantiationType.Delayed */);
registerSingleton(IOpenerService, OpenerService, 1 /* InstantiationType.Delayed */);
//#endregion
//#region --- workbench contributions
// Telemetry
import './contrib/telemetry/browser/telemetry.contribution.js';
// Preferences
import './contrib/preferences/browser/preferences.contribution.js';
import './contrib/preferences/browser/keybindingsEditorContribution.js';
import './contrib/preferences/browser/preferencesSearch.js';
// Performance
import './contrib/performance/browser/performance.contribution.js';
// Context Menus
import './contrib/contextmenu/browser/contextmenu.contribution.js';
// Notebook
import './contrib/notebook/browser/notebook.contribution.js';
// Speech
import './contrib/speech/browser/speech.contribution.js';
// Chat
// Void - this is still registered to avoid console errors, we just commented it out in chatParticipant.contribution.ts
import './contrib/chat/browser/chat.contribution.js';
import './contrib/inlineChat/browser/inlineChat.contribution.js';
import './contrib/mcp/browser/mcp.contribution.js';
// Interactive
import './contrib/interactive/browser/interactive.contribution.js';
// repl
import './contrib/replNotebook/browser/repl.contribution.js';
// Testing
import './contrib/testing/browser/testing.contribution.js';
// Logs
import './contrib/logs/common/logs.contribution.js';
// Quickaccess
import './contrib/quickaccess/browser/quickAccess.contribution.js';
// Explorer
import './contrib/files/browser/explorerViewlet.js';
import './contrib/files/browser/fileActions.contribution.js';
import './contrib/files/browser/files.contribution.js';
// Bulk Edit
import './contrib/bulkEdit/browser/bulkEditService.js';
import './contrib/bulkEdit/browser/preview/bulkEdit.contribution.js';
// Search
import './contrib/search/browser/search.contribution.js';
import './contrib/search/browser/searchView.js';
// Search Editor
import './contrib/searchEditor/browser/searchEditor.contribution.js';
// Sash
import './contrib/sash/browser/sash.contribution.js';
// SCM
import './contrib/scm/browser/scm.contribution.js';
// Debug
import './contrib/debug/browser/debug.contribution.js';
import './contrib/debug/browser/debugEditorContribution.js';
import './contrib/debug/browser/breakpointEditorContribution.js';
import './contrib/debug/browser/callStackEditorContribution.js';
import './contrib/debug/browser/repl.js';
import './contrib/debug/browser/debugViewlet.js';
// Markers
import './contrib/markers/browser/markers.contribution.js';
// Merge Editor
import './contrib/mergeEditor/browser/mergeEditor.contribution.js';
// Multi Diff Editor
import './contrib/multiDiffEditor/browser/multiDiffEditor.contribution.js';
// Commands
import './contrib/commands/common/commands.contribution.js';
// Comments
import './contrib/comments/browser/comments.contribution.js';
// URL Support
import './contrib/url/browser/url.contribution.js';
// Webview
import './contrib/webview/browser/webview.contribution.js';
import './contrib/webviewPanel/browser/webviewPanel.contribution.js';
import './contrib/webviewView/browser/webviewView.contribution.js';
import './contrib/customEditor/browser/customEditor.contribution.js';
// External Uri Opener
import './contrib/externalUriOpener/common/externalUriOpener.contribution.js';
// Extensions Management
import './contrib/extensions/browser/extensions.contribution.js';
import './contrib/extensions/browser/extensionsViewlet.js';
// Output View
import './contrib/output/browser/output.contribution.js';
import './contrib/output/browser/outputView.js';
// Terminal
import './contrib/terminal/terminal.all.js';
// External terminal
import './contrib/externalTerminal/browser/externalTerminal.contribution.js';
// Relauncher
import './contrib/relauncher/browser/relauncher.contribution.js';
// Tasks
import './contrib/tasks/browser/task.contribution.js';
// Remote
import './contrib/remote/common/remote.contribution.js';
import './contrib/remote/browser/remote.contribution.js';
// Emmet
import './contrib/emmet/browser/emmet.contribution.js';
// CodeEditor Contributions
import './contrib/codeEditor/browser/codeEditor.contribution.js';
// Keybindings Contributions
import './contrib/keybindings/browser/keybindings.contribution.js';
// Snippets
import './contrib/snippets/browser/snippets.contribution.js';
// Formatter Help
import './contrib/format/browser/format.contribution.js';
// Folding
import './contrib/folding/browser/folding.contribution.js';
// Limit Indicator
import './contrib/limitIndicator/browser/limitIndicator.contribution.js';
// Inlay Hint Accessibility
import './contrib/inlayHints/browser/inlayHintsAccessibilty.js';
// Themes
import './contrib/themes/browser/themes.contribution.js';
// Update
import './contrib/update/browser/update.contribution.js';
// Surveys
import './contrib/surveys/browser/nps.contribution.js';
import './contrib/surveys/browser/languageSurveys.contribution.js';
// Welcome
// Void: disable all welcome slides and views
// import './contrib/welcomeGettingStarted/browser/gettingStarted.contribution.js';
// import './contrib/welcomeWalkthrough/browser/walkThrough.contribution.js';
// import './contrib/welcomeViews/common/viewsWelcome.contribution.js';
// import './contrib/welcomeViews/common/newFile.contribution.js';
// Call Hierarchy
import './contrib/callHierarchy/browser/callHierarchy.contribution.js';
// Type Hierarchy
import './contrib/typeHierarchy/browser/typeHierarchy.contribution.js';
// Outline
import './contrib/codeEditor/browser/outline/documentSymbolsOutline.js';
import './contrib/outline/browser/outline.contribution.js';
// Language Detection
import './contrib/languageDetection/browser/languageDetection.contribution.js';
// Language Status
import './contrib/languageStatus/browser/languageStatus.contribution.js';
// Authentication
import './contrib/authentication/browser/authentication.contribution.js';
// User Data Sync
import './contrib/userDataSync/browser/userDataSync.contribution.js';
// User Data Profiles
import './contrib/userDataProfile/browser/userDataProfile.contribution.js';
// Continue Edit Session
import './contrib/editSessions/browser/editSessions.contribution.js';
// Code Actions
import './contrib/codeActions/browser/codeActions.contribution.js';
// Timeline
import './contrib/timeline/browser/timeline.contribution.js';
// Local History
import './contrib/localHistory/browser/localHistory.contribution.js';
// Workspace
import './contrib/workspace/browser/workspace.contribution.js';
// Workspaces
import './contrib/workspaces/browser/workspaces.contribution.js';
// List
import './contrib/list/browser/list.contribution.js';
// Accessibility Signals
import './contrib/accessibilitySignals/browser/accessibilitySignal.contribution.js';
// Deprecated Extension Migrator
import './contrib/deprecatedExtensionMigrator/browser/deprecatedExtensionMigrator.contribution.js';
// Bracket Pair Colorizer 2 Telemetry
import './contrib/bracketPairColorizer2Telemetry/browser/bracketPairColorizer2Telemetry.contribution.js';
// Accessibility
import './contrib/accessibility/browser/accessibility.contribution.js';
// Share
import './contrib/share/browser/share.contribution.js';
// Synchronized Scrolling
import './contrib/scrollLocking/browser/scrollLocking.contribution.js';
// Inline Completions
import './contrib/inlineCompletions/browser/inlineCompletions.contribution.js';
// Drop or paste into
import './contrib/dropOrPasteInto/browser/dropOrPasteInto.contribution.js';
import { AllowedExtensionsService } from '../platform/extensionManagement/common/allowedExtensionsService.js';
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmNvbW1vbi5tYWluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3dvcmtiZW5jaC5jb21tb24ubWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxtQ0FBbUM7QUFFbkMsT0FBTyx5QkFBeUIsQ0FBQTtBQUVoQyxPQUFPLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8scUNBQXFDLENBQUE7QUFFNUMsWUFBWTtBQUVaLGtCQUFrQjtBQUNsQixPQUFPLDZDQUE2QyxDQUFBLENBQUMsa0JBQWtCO0FBQ3ZFLFlBQVk7QUFFWiwrQkFBK0I7QUFFL0IsT0FBTyx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLCtDQUErQyxDQUFBO0FBRXRELFlBQVk7QUFFWixrQ0FBa0M7QUFFbEMsT0FBTyxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sc0NBQXNDLENBQUE7QUFFN0MsWUFBWTtBQUVaLDZCQUE2QjtBQUU3QixPQUFPLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sNENBQTRDLENBQUE7QUFFbkQsWUFBWTtBQUVaLGdDQUFnQztBQUVoQyxPQUFPLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sc0RBQXNELENBQUE7QUFDN0QsT0FBTyx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sdUVBQXVFLENBQUE7QUFDOUUsT0FBTyw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8saURBQWlELENBQUE7QUFDeEQsT0FBTywrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sdURBQXVELENBQUE7QUFDOUQsT0FBTyw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sc0VBQXNFLENBQUE7QUFDN0UsT0FBTywyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLHNGQUFzRixDQUFBO0FBQzdGLE9BQU8seUVBQXlFLENBQUE7QUFDaEYsT0FBTyw0RUFBNEUsQ0FBQTtBQUNuRixPQUFPLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sb0RBQW9ELENBQUE7QUFDM0QsT0FBTywwRUFBMEUsQ0FBQTtBQUNqRixPQUFPLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sdURBQXVELENBQUE7QUFDOUQsT0FBTyxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxtRUFBbUUsQ0FBQTtBQUMxRSxPQUFPLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sMENBQTBDLENBQUE7QUFDakQsT0FBTyxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sNERBQTRELENBQUE7QUFDbkUsT0FBTyxzRUFBc0UsQ0FBQTtBQUM3RSxPQUFPLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sa0VBQWtFLENBQUE7QUFDekUsT0FBTyw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sbURBQW1ELENBQUE7QUFDMUQsT0FBTyw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLDRFQUE0RSxDQUFBO0FBQ25GLE9BQU8sc0RBQXNELENBQUE7QUFDN0QsT0FBTywyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8seUVBQXlFLENBQUE7QUFDaEYsT0FBTyw2RUFBNkUsQ0FBQTtBQUNwRixPQUFPLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUN2SCxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLGlDQUFpQyxHQUNqQyxNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDaEYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDM0csT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMxRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNoSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLG1DQUFtQyxHQUNuQyxNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsd0JBQXdCLEdBQ3hCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDekYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFM0YsaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsc0JBQXNCLG9DQUE0QixDQUFBO0FBQzdGLGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixvQ0FBNEIsQ0FBQTtBQUNqRyxpQkFBaUIsQ0FDaEIsbUNBQW1DLEVBQ25DLGtDQUFrQyxvQ0FFbEMsQ0FBQTtBQUNELGlCQUFpQixDQUNoQixpQ0FBaUMsRUFDakMsZ0NBQWdDLG9DQUVoQyxDQUFBO0FBQ0QsaUJBQWlCLENBQUMsd0JBQXdCLEVBQUUsdUJBQXVCLG9DQUE0QixDQUFBO0FBQy9GLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixvQ0FBNEIsQ0FBQTtBQUNyRixpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxvQ0FBNEIsQ0FBQTtBQUN2RSxpQkFBaUIsQ0FDaEIsb0JBQW9CLEVBQ3BCLDRCQUE0QixrQ0FFNUIsQ0FBQTtBQUNELGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixvQ0FBNEIsQ0FBQTtBQUNqRyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsYUFBYSxvQ0FBNEIsQ0FBQTtBQUMzRSxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsb0NBQTRCLENBQUE7QUFDbkYsaUJBQWlCLENBQ2hCLGlDQUFpQyxFQUNqQyxnQ0FBZ0Msb0NBRWhDLENBQUE7QUFDRCxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLG9DQUE0QixDQUFBO0FBQy9FLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxhQUFhLG9DQUE0QixDQUFBO0FBRTNFLFlBQVk7QUFFWixxQ0FBcUM7QUFFckMsWUFBWTtBQUNaLE9BQU8sdURBQXVELENBQUE7QUFFOUQsY0FBYztBQUNkLE9BQU8sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLG9EQUFvRCxDQUFBO0FBRTNELGNBQWM7QUFDZCxPQUFPLDJEQUEyRCxDQUFBO0FBRWxFLGdCQUFnQjtBQUNoQixPQUFPLDJEQUEyRCxDQUFBO0FBRWxFLFdBQVc7QUFDWCxPQUFPLHFEQUFxRCxDQUFBO0FBRTVELFNBQVM7QUFDVCxPQUFPLGlEQUFpRCxDQUFBO0FBRXhELE9BQU87QUFDUCx1SEFBdUg7QUFDdkgsT0FBTyw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sMkNBQTJDLENBQUE7QUFFbEQsY0FBYztBQUNkLE9BQU8sMkRBQTJELENBQUE7QUFFbEUsT0FBTztBQUNQLE9BQU8scURBQXFELENBQUE7QUFFNUQsVUFBVTtBQUNWLE9BQU8sbURBQW1ELENBQUE7QUFFMUQsT0FBTztBQUNQLE9BQU8sNENBQTRDLENBQUE7QUFFbkQsY0FBYztBQUNkLE9BQU8sMkRBQTJELENBQUE7QUFFbEUsV0FBVztBQUNYLE9BQU8sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLCtDQUErQyxDQUFBO0FBRXRELFlBQVk7QUFDWixPQUFPLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sNkRBQTZELENBQUE7QUFFcEUsU0FBUztBQUNULE9BQU8saURBQWlELENBQUE7QUFDeEQsT0FBTyx3Q0FBd0MsQ0FBQTtBQUUvQyxnQkFBZ0I7QUFDaEIsT0FBTyw2REFBNkQsQ0FBQTtBQUVwRSxPQUFPO0FBQ1AsT0FBTyw2Q0FBNkMsQ0FBQTtBQUVwRCxNQUFNO0FBQ04sT0FBTywyQ0FBMkMsQ0FBQTtBQUVsRCxRQUFRO0FBQ1IsT0FBTywrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8seURBQXlELENBQUE7QUFDaEUsT0FBTyx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8seUNBQXlDLENBQUE7QUFFaEQsVUFBVTtBQUNWLE9BQU8sbURBQW1ELENBQUE7QUFFMUQsZUFBZTtBQUNmLE9BQU8sMkRBQTJELENBQUE7QUFFbEUsb0JBQW9CO0FBQ3BCLE9BQU8sbUVBQW1FLENBQUE7QUFFMUUsV0FBVztBQUNYLE9BQU8sb0RBQW9ELENBQUE7QUFFM0QsV0FBVztBQUNYLE9BQU8scURBQXFELENBQUE7QUFFNUQsY0FBYztBQUNkLE9BQU8sMkNBQTJDLENBQUE7QUFFbEQsVUFBVTtBQUNWLE9BQU8sbURBQW1ELENBQUE7QUFDMUQsT0FBTyw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sNkRBQTZELENBQUE7QUFFcEUsc0JBQXNCO0FBQ3RCLE9BQU8sc0VBQXNFLENBQUE7QUFFN0Usd0JBQXdCO0FBQ3hCLE9BQU8seURBQXlELENBQUE7QUFDaEUsT0FBTyxtREFBbUQsQ0FBQTtBQUUxRCxjQUFjO0FBQ2QsT0FBTyxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLHdDQUF3QyxDQUFBO0FBRS9DLFdBQVc7QUFDWCxPQUFPLG9DQUFvQyxDQUFBO0FBRTNDLG9CQUFvQjtBQUNwQixPQUFPLHFFQUFxRSxDQUFBO0FBRTVFLGFBQWE7QUFDYixPQUFPLHlEQUF5RCxDQUFBO0FBRWhFLFFBQVE7QUFDUixPQUFPLDhDQUE4QyxDQUFBO0FBRXJELFNBQVM7QUFDVCxPQUFPLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8saURBQWlELENBQUE7QUFFeEQsUUFBUTtBQUNSLE9BQU8sK0NBQStDLENBQUE7QUFFdEQsMkJBQTJCO0FBQzNCLE9BQU8seURBQXlELENBQUE7QUFFaEUsNEJBQTRCO0FBQzVCLE9BQU8sMkRBQTJELENBQUE7QUFFbEUsV0FBVztBQUNYLE9BQU8scURBQXFELENBQUE7QUFFNUQsaUJBQWlCO0FBQ2pCLE9BQU8saURBQWlELENBQUE7QUFFeEQsVUFBVTtBQUNWLE9BQU8sbURBQW1ELENBQUE7QUFFMUQsa0JBQWtCO0FBQ2xCLE9BQU8saUVBQWlFLENBQUE7QUFFeEUsMkJBQTJCO0FBQzNCLE9BQU8sd0RBQXdELENBQUE7QUFFL0QsU0FBUztBQUNULE9BQU8saURBQWlELENBQUE7QUFFeEQsU0FBUztBQUNULE9BQU8saURBQWlELENBQUE7QUFFeEQsVUFBVTtBQUNWLE9BQU8sK0NBQStDLENBQUE7QUFDdEQsT0FBTywyREFBMkQsQ0FBQTtBQUVsRSxVQUFVO0FBQ1YsNkNBQTZDO0FBQzdDLG1GQUFtRjtBQUNuRiw2RUFBNkU7QUFDN0UsdUVBQXVFO0FBQ3ZFLGtFQUFrRTtBQUVsRSxpQkFBaUI7QUFDakIsT0FBTywrREFBK0QsQ0FBQTtBQUV0RSxpQkFBaUI7QUFDakIsT0FBTywrREFBK0QsQ0FBQTtBQUV0RSxVQUFVO0FBQ1YsT0FBTyxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLG1EQUFtRCxDQUFBO0FBRTFELHFCQUFxQjtBQUNyQixPQUFPLHVFQUF1RSxDQUFBO0FBRTlFLGtCQUFrQjtBQUNsQixPQUFPLGlFQUFpRSxDQUFBO0FBRXhFLGlCQUFpQjtBQUNqQixPQUFPLGlFQUFpRSxDQUFBO0FBRXhFLGlCQUFpQjtBQUNqQixPQUFPLDZEQUE2RCxDQUFBO0FBRXBFLHFCQUFxQjtBQUNyQixPQUFPLG1FQUFtRSxDQUFBO0FBRTFFLHdCQUF3QjtBQUN4QixPQUFPLDZEQUE2RCxDQUFBO0FBRXBFLGVBQWU7QUFDZixPQUFPLDJEQUEyRCxDQUFBO0FBRWxFLFdBQVc7QUFDWCxPQUFPLHFEQUFxRCxDQUFBO0FBRTVELGdCQUFnQjtBQUNoQixPQUFPLDZEQUE2RCxDQUFBO0FBRXBFLFlBQVk7QUFDWixPQUFPLHVEQUF1RCxDQUFBO0FBRTlELGFBQWE7QUFDYixPQUFPLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU87QUFDUCxPQUFPLDZDQUE2QyxDQUFBO0FBRXBELHdCQUF3QjtBQUN4QixPQUFPLDRFQUE0RSxDQUFBO0FBRW5GLGdDQUFnQztBQUNoQyxPQUFPLDJGQUEyRixDQUFBO0FBRWxHLHFDQUFxQztBQUNyQyxPQUFPLGlHQUFpRyxDQUFBO0FBRXhHLGdCQUFnQjtBQUNoQixPQUFPLCtEQUErRCxDQUFBO0FBRXRFLFFBQVE7QUFDUixPQUFPLCtDQUErQyxDQUFBO0FBRXRELHlCQUF5QjtBQUN6QixPQUFPLCtEQUErRCxDQUFBO0FBRXRFLHFCQUFxQjtBQUNyQixPQUFPLHVFQUF1RSxDQUFBO0FBRTlFLHFCQUFxQjtBQUNyQixPQUFPLG1FQUFtRSxDQUFBO0FBQzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBRTdHLFlBQVkifQ==
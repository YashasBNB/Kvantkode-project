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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmNvbW1vbi5tYWluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvd29ya2JlbmNoLmNvbW1vbi5tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLG1DQUFtQztBQUVuQyxPQUFPLHlCQUF5QixDQUFBO0FBRWhDLE9BQU8sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxxQ0FBcUMsQ0FBQTtBQUU1QyxZQUFZO0FBRVosa0JBQWtCO0FBQ2xCLE9BQU8sNkNBQTZDLENBQUEsQ0FBQyxrQkFBa0I7QUFDdkUsWUFBWTtBQUVaLCtCQUErQjtBQUUvQixPQUFPLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sK0NBQStDLENBQUE7QUFFdEQsWUFBWTtBQUVaLGtDQUFrQztBQUVsQyxPQUFPLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxzQ0FBc0MsQ0FBQTtBQUU3QyxZQUFZO0FBRVosNkJBQTZCO0FBRTdCLE9BQU8sK0NBQStDLENBQUE7QUFDdEQsT0FBTyx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyw0Q0FBNEMsQ0FBQTtBQUVuRCxZQUFZO0FBRVosZ0NBQWdDO0FBRWhDLE9BQU8sb0RBQW9ELENBQUE7QUFDM0Qs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
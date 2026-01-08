/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import * as errors from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { combinedDisposable } from '../../../base/common/lifecycle.js';
import { Schemas, matchesScheme } from '../../../base/common/network.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import { TextEditorCursorStyle } from '../../../editor/common/config/editorOptions.js';
import { score, targetsNotebooks } from '../../../editor/common/languageSelector.js';
import * as languageConfiguration from '../../../editor/common/languages/languageConfiguration.js';
import { OverviewRulerLane } from '../../../editor/common/model.js';
import { ExtensionError, ExtensionIdentifierSet, } from '../../../platform/extensions/common/extensions.js';
import * as files from '../../../platform/files/common/files.js';
import { ILogService, ILoggerService, LogLevel } from '../../../platform/log/common/log.js';
import { getRemoteName } from '../../../platform/remote/common/remoteHosts.js';
import { TelemetryTrustedValue } from '../../../platform/telemetry/common/telemetryUtils.js';
import { EditSessionIdentityMatch } from '../../../platform/workspace/common/editSessions.js';
import { DebugConfigurationProviderTriggerKind } from '../../contrib/debug/common/debug.js';
import { UIKind } from '../../services/extensions/common/extensionHostProtocol.js';
import { checkProposedApiEnabled, isProposedApiEnabled, } from '../../services/extensions/common/extensions.js';
import { ExcludeSettingOptions, TextSearchCompleteMessageType, TextSearchContext2, TextSearchMatch2, } from '../../services/search/common/searchExtTypes.js';
import { CandidatePortSource, ExtHostContext, MainContext, } from './extHost.protocol.js';
import { ExtHostRelatedInformation } from './extHostAiRelatedInformation.js';
import { ExtHostApiCommands } from './extHostApiCommands.js';
import { IExtHostApiDeprecationService } from './extHostApiDeprecationService.js';
import { IExtHostAuthentication } from './extHostAuthentication.js';
import { ExtHostBulkEdits } from './extHostBulkEdits.js';
import { ExtHostChatAgents2 } from './extHostChatAgents2.js';
import { ExtHostChatStatus } from './extHostChatStatus.js';
import { ExtHostClipboard } from './extHostClipboard.js';
import { ExtHostEditorInsets } from './extHostCodeInsets.js';
import { ExtHostCodeMapper } from './extHostCodeMapper.js';
import { IExtHostCommands } from './extHostCommands.js';
import { createExtHostComments } from './extHostComments.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { ExtHostCustomEditors } from './extHostCustomEditors.js';
import { IExtHostDebugService } from './extHostDebugService.js';
import { IExtHostDecorations } from './extHostDecorations.js';
import { ExtHostDiagnostics } from './extHostDiagnostics.js';
import { ExtHostDialogs } from './extHostDialogs.js';
import { ExtHostDocumentContentProvider } from './extHostDocumentContentProviders.js';
import { ExtHostDocumentSaveParticipant } from './extHostDocumentSaveParticipant.js';
import { ExtHostDocuments } from './extHostDocuments.js';
import { IExtHostDocumentsAndEditors } from './extHostDocumentsAndEditors.js';
import { IExtHostEditorTabs } from './extHostEditorTabs.js';
import { ExtHostEmbeddings } from './extHostEmbedding.js';
import { ExtHostAiEmbeddingVector } from './extHostEmbeddingVector.js';
import { Extension, IExtHostExtensionService } from './extHostExtensionService.js';
import { ExtHostFileSystem } from './extHostFileSystem.js';
import { IExtHostConsumerFileSystem } from './extHostFileSystemConsumer.js';
import { ExtHostFileSystemEventService, } from './extHostFileSystemEventService.js';
import { IExtHostFileSystemInfo } from './extHostFileSystemInfo.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { ExtHostInteractive } from './extHostInteractive.js';
import { ExtHostLabelService } from './extHostLabelService.js';
import { ExtHostLanguageFeatures } from './extHostLanguageFeatures.js';
import { ExtHostLanguageModelTools } from './extHostLanguageModelTools.js';
import { IExtHostLanguageModels } from './extHostLanguageModels.js';
import { ExtHostLanguages } from './extHostLanguages.js';
import { IExtHostLocalizationService } from './extHostLocalizationService.js';
import { IExtHostManagedSockets } from './extHostManagedSockets.js';
import { IExtHostMpcService } from './extHostMcp.js';
import { ExtHostMessageService } from './extHostMessageService.js';
import { ExtHostNotebookController } from './extHostNotebook.js';
import { ExtHostNotebookDocumentSaveParticipant } from './extHostNotebookDocumentSaveParticipant.js';
import { ExtHostNotebookDocuments } from './extHostNotebookDocuments.js';
import { ExtHostNotebookEditors } from './extHostNotebookEditors.js';
import { ExtHostNotebookKernels } from './extHostNotebookKernels.js';
import { ExtHostNotebookRenderers } from './extHostNotebookRenderers.js';
import { IExtHostOutputService } from './extHostOutput.js';
import { ExtHostProfileContentHandlers } from './extHostProfileContentHandler.js';
import { ExtHostProgress } from './extHostProgress.js';
import { ExtHostQuickDiff } from './extHostQuickDiff.js';
import { createExtHostQuickOpen } from './extHostQuickOpen.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ExtHostSCM } from './extHostSCM.js';
import { IExtHostSearch } from './extHostSearch.js';
import { IExtHostSecretState } from './extHostSecretState.js';
import { ExtHostShare } from './extHostShare.js';
import { ExtHostSpeech } from './extHostSpeech.js';
import { ExtHostStatusBar } from './extHostStatusBar.js';
import { IExtHostStorage } from './extHostStorage.js';
import { IExtensionStoragePaths } from './extHostStoragePaths.js';
import { IExtHostTask } from './extHostTask.js';
import { ExtHostTelemetryLogger, IExtHostTelemetry, isNewAppInstall } from './extHostTelemetry.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { IExtHostTerminalShellIntegration } from './extHostTerminalShellIntegration.js';
import { IExtHostTesting } from './extHostTesting.js';
import { ExtHostEditors } from './extHostTextEditors.js';
import { ExtHostTheming } from './extHostTheming.js';
import { ExtHostTimeline } from './extHostTimeline.js';
import { ExtHostTreeViews } from './extHostTreeViews.js';
import { IExtHostTunnelService } from './extHostTunnelService.js';
import * as typeConverters from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
import { ExtHostUriOpeners } from './extHostUriOpener.js';
import { IURITransformerService } from './extHostUriTransformerService.js';
import { ExtHostUrls } from './extHostUrls.js';
import { ExtHostWebviews } from './extHostWebview.js';
import { ExtHostWebviewPanels } from './extHostWebviewPanels.js';
import { ExtHostWebviewViews } from './extHostWebviewView.js';
import { IExtHostWindow } from './extHostWindow.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
/**
 * This method instantiates and returns the extension API surface
 */
export function createApiFactoryAndRegisterActors(accessor) {
    // services
    const initData = accessor.get(IExtHostInitDataService);
    const extHostFileSystemInfo = accessor.get(IExtHostFileSystemInfo);
    const extHostConsumerFileSystem = accessor.get(IExtHostConsumerFileSystem);
    const extensionService = accessor.get(IExtHostExtensionService);
    const extHostWorkspace = accessor.get(IExtHostWorkspace);
    const extHostTelemetry = accessor.get(IExtHostTelemetry);
    const extHostConfiguration = accessor.get(IExtHostConfiguration);
    const uriTransformer = accessor.get(IURITransformerService);
    const rpcProtocol = accessor.get(IExtHostRpcService);
    const extHostStorage = accessor.get(IExtHostStorage);
    const extensionStoragePaths = accessor.get(IExtensionStoragePaths);
    const extHostLoggerService = accessor.get(ILoggerService);
    const extHostLogService = accessor.get(ILogService);
    const extHostTunnelService = accessor.get(IExtHostTunnelService);
    const extHostApiDeprecation = accessor.get(IExtHostApiDeprecationService);
    const extHostWindow = accessor.get(IExtHostWindow);
    const extHostSecretState = accessor.get(IExtHostSecretState);
    const extHostEditorTabs = accessor.get(IExtHostEditorTabs);
    const extHostManagedSockets = accessor.get(IExtHostManagedSockets);
    const extHostAuthentication = accessor.get(IExtHostAuthentication);
    const extHostLanguageModels = accessor.get(IExtHostLanguageModels);
    const extHostMcp = accessor.get(IExtHostMpcService);
    // register addressable instances
    rpcProtocol.set(ExtHostContext.ExtHostFileSystemInfo, extHostFileSystemInfo);
    rpcProtocol.set(ExtHostContext.ExtHostLogLevelServiceShape, extHostLoggerService);
    rpcProtocol.set(ExtHostContext.ExtHostWorkspace, extHostWorkspace);
    rpcProtocol.set(ExtHostContext.ExtHostConfiguration, extHostConfiguration);
    rpcProtocol.set(ExtHostContext.ExtHostExtensionService, extensionService);
    rpcProtocol.set(ExtHostContext.ExtHostStorage, extHostStorage);
    rpcProtocol.set(ExtHostContext.ExtHostTunnelService, extHostTunnelService);
    rpcProtocol.set(ExtHostContext.ExtHostWindow, extHostWindow);
    rpcProtocol.set(ExtHostContext.ExtHostSecretState, extHostSecretState);
    rpcProtocol.set(ExtHostContext.ExtHostTelemetry, extHostTelemetry);
    rpcProtocol.set(ExtHostContext.ExtHostEditorTabs, extHostEditorTabs);
    rpcProtocol.set(ExtHostContext.ExtHostManagedSockets, extHostManagedSockets);
    rpcProtocol.set(ExtHostContext.ExtHostAuthentication, extHostAuthentication);
    rpcProtocol.set(ExtHostContext.ExtHostChatProvider, extHostLanguageModels);
    // automatically create and register addressable instances
    const extHostDecorations = rpcProtocol.set(ExtHostContext.ExtHostDecorations, accessor.get(IExtHostDecorations));
    const extHostDocumentsAndEditors = rpcProtocol.set(ExtHostContext.ExtHostDocumentsAndEditors, accessor.get(IExtHostDocumentsAndEditors));
    const extHostCommands = rpcProtocol.set(ExtHostContext.ExtHostCommands, accessor.get(IExtHostCommands));
    const extHostTerminalService = rpcProtocol.set(ExtHostContext.ExtHostTerminalService, accessor.get(IExtHostTerminalService));
    const extHostTerminalShellIntegration = rpcProtocol.set(ExtHostContext.ExtHostTerminalShellIntegration, accessor.get(IExtHostTerminalShellIntegration));
    const extHostDebugService = rpcProtocol.set(ExtHostContext.ExtHostDebugService, accessor.get(IExtHostDebugService));
    const extHostSearch = rpcProtocol.set(ExtHostContext.ExtHostSearch, accessor.get(IExtHostSearch));
    const extHostTask = rpcProtocol.set(ExtHostContext.ExtHostTask, accessor.get(IExtHostTask));
    const extHostOutputService = rpcProtocol.set(ExtHostContext.ExtHostOutputService, accessor.get(IExtHostOutputService));
    const extHostLocalization = rpcProtocol.set(ExtHostContext.ExtHostLocalization, accessor.get(IExtHostLocalizationService));
    // manually create and register addressable instances
    const extHostUrls = rpcProtocol.set(ExtHostContext.ExtHostUrls, new ExtHostUrls(rpcProtocol));
    const extHostDocuments = rpcProtocol.set(ExtHostContext.ExtHostDocuments, new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors));
    const extHostDocumentContentProviders = rpcProtocol.set(ExtHostContext.ExtHostDocumentContentProviders, new ExtHostDocumentContentProvider(rpcProtocol, extHostDocumentsAndEditors, extHostLogService));
    const extHostDocumentSaveParticipant = rpcProtocol.set(ExtHostContext.ExtHostDocumentSaveParticipant, new ExtHostDocumentSaveParticipant(extHostLogService, extHostDocuments, rpcProtocol.getProxy(MainContext.MainThreadBulkEdits)));
    const extHostNotebook = rpcProtocol.set(ExtHostContext.ExtHostNotebook, new ExtHostNotebookController(rpcProtocol, extHostCommands, extHostDocumentsAndEditors, extHostDocuments, extHostConsumerFileSystem, extHostSearch, extHostLogService));
    const extHostNotebookDocuments = rpcProtocol.set(ExtHostContext.ExtHostNotebookDocuments, new ExtHostNotebookDocuments(extHostNotebook));
    const extHostNotebookEditors = rpcProtocol.set(ExtHostContext.ExtHostNotebookEditors, new ExtHostNotebookEditors(extHostLogService, extHostNotebook));
    const extHostNotebookKernels = rpcProtocol.set(ExtHostContext.ExtHostNotebookKernels, new ExtHostNotebookKernels(rpcProtocol, initData, extHostNotebook, extHostCommands, extHostLogService));
    const extHostNotebookRenderers = rpcProtocol.set(ExtHostContext.ExtHostNotebookRenderers, new ExtHostNotebookRenderers(rpcProtocol, extHostNotebook));
    const extHostNotebookDocumentSaveParticipant = rpcProtocol.set(ExtHostContext.ExtHostNotebookDocumentSaveParticipant, new ExtHostNotebookDocumentSaveParticipant(extHostLogService, extHostNotebook, rpcProtocol.getProxy(MainContext.MainThreadBulkEdits)));
    const extHostEditors = rpcProtocol.set(ExtHostContext.ExtHostEditors, new ExtHostEditors(rpcProtocol, extHostDocumentsAndEditors));
    const extHostTreeViews = rpcProtocol.set(ExtHostContext.ExtHostTreeViews, new ExtHostTreeViews(rpcProtocol.getProxy(MainContext.MainThreadTreeViews), extHostCommands, extHostLogService));
    const extHostEditorInsets = rpcProtocol.set(ExtHostContext.ExtHostEditorInsets, new ExtHostEditorInsets(rpcProtocol.getProxy(MainContext.MainThreadEditorInsets), extHostEditors, initData.remote));
    const extHostDiagnostics = rpcProtocol.set(ExtHostContext.ExtHostDiagnostics, new ExtHostDiagnostics(rpcProtocol, extHostLogService, extHostFileSystemInfo, extHostDocumentsAndEditors));
    const extHostLanguages = rpcProtocol.set(ExtHostContext.ExtHostLanguages, new ExtHostLanguages(rpcProtocol, extHostDocuments, extHostCommands.converter, uriTransformer));
    const extHostLanguageFeatures = rpcProtocol.set(ExtHostContext.ExtHostLanguageFeatures, new ExtHostLanguageFeatures(rpcProtocol, uriTransformer, extHostDocuments, extHostCommands, extHostDiagnostics, extHostLogService, extHostApiDeprecation, extHostTelemetry));
    const extHostCodeMapper = rpcProtocol.set(ExtHostContext.ExtHostCodeMapper, new ExtHostCodeMapper(rpcProtocol));
    const extHostFileSystem = rpcProtocol.set(ExtHostContext.ExtHostFileSystem, new ExtHostFileSystem(rpcProtocol, extHostLanguageFeatures));
    const extHostFileSystemEvent = rpcProtocol.set(ExtHostContext.ExtHostFileSystemEventService, new ExtHostFileSystemEventService(rpcProtocol, extHostLogService, extHostDocumentsAndEditors));
    const extHostQuickOpen = rpcProtocol.set(ExtHostContext.ExtHostQuickOpen, createExtHostQuickOpen(rpcProtocol, extHostWorkspace, extHostCommands));
    const extHostSCM = rpcProtocol.set(ExtHostContext.ExtHostSCM, new ExtHostSCM(rpcProtocol, extHostCommands, extHostDocuments, extHostLogService));
    const extHostQuickDiff = rpcProtocol.set(ExtHostContext.ExtHostQuickDiff, new ExtHostQuickDiff(rpcProtocol, uriTransformer));
    const extHostShare = rpcProtocol.set(ExtHostContext.ExtHostShare, new ExtHostShare(rpcProtocol, uriTransformer));
    const extHostComment = rpcProtocol.set(ExtHostContext.ExtHostComments, createExtHostComments(rpcProtocol, extHostCommands, extHostDocuments));
    const extHostProgress = rpcProtocol.set(ExtHostContext.ExtHostProgress, new ExtHostProgress(rpcProtocol.getProxy(MainContext.MainThreadProgress)));
    const extHostLabelService = rpcProtocol.set(ExtHostContext.ExtHostLabelService, new ExtHostLabelService(rpcProtocol));
    const extHostTheming = rpcProtocol.set(ExtHostContext.ExtHostTheming, new ExtHostTheming(rpcProtocol));
    const extHostTimeline = rpcProtocol.set(ExtHostContext.ExtHostTimeline, new ExtHostTimeline(rpcProtocol, extHostCommands));
    const extHostWebviews = rpcProtocol.set(ExtHostContext.ExtHostWebviews, new ExtHostWebviews(rpcProtocol, initData.remote, extHostWorkspace, extHostLogService, extHostApiDeprecation));
    const extHostWebviewPanels = rpcProtocol.set(ExtHostContext.ExtHostWebviewPanels, new ExtHostWebviewPanels(rpcProtocol, extHostWebviews, extHostWorkspace));
    const extHostCustomEditors = rpcProtocol.set(ExtHostContext.ExtHostCustomEditors, new ExtHostCustomEditors(rpcProtocol, extHostDocuments, extensionStoragePaths, extHostWebviews, extHostWebviewPanels));
    const extHostWebviewViews = rpcProtocol.set(ExtHostContext.ExtHostWebviewViews, new ExtHostWebviewViews(rpcProtocol, extHostWebviews));
    const extHostTesting = rpcProtocol.set(ExtHostContext.ExtHostTesting, accessor.get(IExtHostTesting));
    const extHostUriOpeners = rpcProtocol.set(ExtHostContext.ExtHostUriOpeners, new ExtHostUriOpeners(rpcProtocol));
    const extHostProfileContentHandlers = rpcProtocol.set(ExtHostContext.ExtHostProfileContentHandlers, new ExtHostProfileContentHandlers(rpcProtocol));
    rpcProtocol.set(ExtHostContext.ExtHostInteractive, new ExtHostInteractive(rpcProtocol, extHostNotebook, extHostDocumentsAndEditors, extHostCommands, extHostLogService));
    const extHostLanguageModelTools = rpcProtocol.set(ExtHostContext.ExtHostLanguageModelTools, new ExtHostLanguageModelTools(rpcProtocol, extHostLanguageModels));
    const extHostChatAgents2 = rpcProtocol.set(ExtHostContext.ExtHostChatAgents2, new ExtHostChatAgents2(rpcProtocol, extHostLogService, extHostCommands, extHostDocuments, extHostLanguageModels, extHostDiagnostics, extHostLanguageModelTools));
    const extHostAiRelatedInformation = rpcProtocol.set(ExtHostContext.ExtHostAiRelatedInformation, new ExtHostRelatedInformation(rpcProtocol));
    const extHostAiEmbeddingVector = rpcProtocol.set(ExtHostContext.ExtHostAiEmbeddingVector, new ExtHostAiEmbeddingVector(rpcProtocol));
    const extHostStatusBar = rpcProtocol.set(ExtHostContext.ExtHostStatusBar, new ExtHostStatusBar(rpcProtocol, extHostCommands.converter));
    const extHostSpeech = rpcProtocol.set(ExtHostContext.ExtHostSpeech, new ExtHostSpeech(rpcProtocol));
    const extHostEmbeddings = rpcProtocol.set(ExtHostContext.ExtHostEmbeddings, new ExtHostEmbeddings(rpcProtocol));
    rpcProtocol.set(ExtHostContext.ExtHostMcp, accessor.get(IExtHostMpcService));
    // Check that no named customers are missing
    const expected = Object.values(ExtHostContext);
    rpcProtocol.assertRegistered(expected);
    // Other instances
    const extHostBulkEdits = new ExtHostBulkEdits(rpcProtocol, extHostDocumentsAndEditors);
    const extHostClipboard = new ExtHostClipboard(rpcProtocol);
    const extHostMessageService = new ExtHostMessageService(rpcProtocol, extHostLogService);
    const extHostDialogs = new ExtHostDialogs(rpcProtocol);
    const extHostChatStatus = new ExtHostChatStatus(rpcProtocol);
    // Register API-ish commands
    ExtHostApiCommands.register(extHostCommands);
    return function (extension, extensionInfo, configProvider) {
        // Wraps an event with error handling and telemetry so that we know what extension fails
        // handling events. This will prevent us from reporting this as "our" error-telemetry and
        // allows for better blaming
        function _asExtensionEvent(actual) {
            return (listener, thisArgs, disposables) => {
                const handle = actual((e) => {
                    try {
                        listener.call(thisArgs, e);
                    }
                    catch (err) {
                        errors.onUnexpectedExternalError(new ExtensionError(extension.identifier, err, 'FAILED to handle event'));
                    }
                });
                disposables?.push(handle);
                return handle;
            };
        }
        // Check document selectors for being overly generic. Technically this isn't a problem but
        // in practice many extensions say they support `fooLang` but need fs-access to do so. Those
        // extension should specify then the `file`-scheme, e.g. `{ scheme: 'fooLang', language: 'fooLang' }`
        // We only inform once, it is not a warning because we just want to raise awareness and because
        // we cannot say if the extension is doing it right or wrong...
        const checkSelector = (function () {
            let done = !extension.isUnderDevelopment;
            function informOnce() {
                if (!done) {
                    extHostLogService.info(`Extension '${extension.identifier.value}' uses a document selector without scheme. Learn more about this: https://go.microsoft.com/fwlink/?linkid=872305`);
                    done = true;
                }
            }
            return function perform(selector) {
                if (Array.isArray(selector)) {
                    selector.forEach(perform);
                }
                else if (typeof selector === 'string') {
                    informOnce();
                }
                else {
                    const filter = selector; // TODO: microsoft/TypeScript#42768
                    if (typeof filter.scheme === 'undefined') {
                        informOnce();
                    }
                    if (typeof filter.exclusive === 'boolean') {
                        checkProposedApiEnabled(extension, 'documentFiltersExclusive');
                    }
                }
                return selector;
            };
        })();
        const authentication = {
            getSession(providerId, scopes, options) {
                if ((typeof options?.forceNewSession === 'object' && options.forceNewSession.learnMore) ||
                    (typeof options?.createIfNone === 'object' && options.createIfNone.learnMore)) {
                    checkProposedApiEnabled(extension, 'authLearnMore');
                }
                return extHostAuthentication.getSession(extension, providerId, scopes, options);
            },
            getAccounts(providerId) {
                return extHostAuthentication.getAccounts(providerId);
            },
            // TODO: remove this after GHPR and Codespaces move off of it
            async hasSession(providerId, scopes) {
                checkProposedApiEnabled(extension, 'authSession');
                return !!(await extHostAuthentication.getSession(extension, providerId, scopes, {
                    silent: true,
                }));
            },
            get onDidChangeSessions() {
                return _asExtensionEvent(extHostAuthentication.getExtensionScopedSessionsEvent(extension.identifier.value));
            },
            registerAuthenticationProvider(id, label, provider, options) {
                return extHostAuthentication.registerAuthenticationProvider(id, label, provider, options);
            },
        };
        // namespace: commands
        const commands = {
            registerCommand(id, command, thisArgs) {
                return extHostCommands.registerCommand(true, id, command, thisArgs, undefined, extension);
            },
            registerTextEditorCommand(id, callback, thisArg) {
                return extHostCommands.registerCommand(true, id, (...args) => {
                    const activeTextEditor = extHostEditors.getActiveTextEditor();
                    if (!activeTextEditor) {
                        extHostLogService.warn('Cannot execute ' + id + ' because there is no active text editor.');
                        return undefined;
                    }
                    return activeTextEditor
                        .edit((edit) => {
                        callback.apply(thisArg, [activeTextEditor, edit, ...args]);
                    })
                        .then((result) => {
                        if (!result) {
                            extHostLogService.warn('Edits from command ' + id + ' were not applied.');
                        }
                    }, (err) => {
                        extHostLogService.warn('An error occurred while running command ' + id, err);
                    });
                }, undefined, undefined, extension);
            },
            registerDiffInformationCommand: (id, callback, thisArg) => {
                checkProposedApiEnabled(extension, 'diffCommand');
                return extHostCommands.registerCommand(true, id, async (...args) => {
                    const activeTextEditor = extHostDocumentsAndEditors.activeEditor(true);
                    if (!activeTextEditor) {
                        extHostLogService.warn('Cannot execute ' + id + ' because there is no active text editor.');
                        return undefined;
                    }
                    const diff = await extHostEditors.getDiffInformation(activeTextEditor.id);
                    callback.apply(thisArg, [diff, ...args]);
                }, undefined, undefined, extension);
            },
            executeCommand(id, ...args) {
                return extHostCommands.executeCommand(id, ...args);
            },
            getCommands(filterInternal = false) {
                return extHostCommands.getCommands(filterInternal);
            },
        };
        // namespace: env
        const env = {
            get machineId() {
                return initData.telemetryInfo.machineId;
            },
            get sessionId() {
                return initData.telemetryInfo.sessionId;
            },
            get language() {
                return initData.environment.appLanguage;
            },
            get appName() {
                return initData.environment.appName;
            },
            get appRoot() {
                return initData.environment.appRoot?.fsPath ?? '';
            },
            get appHost() {
                return initData.environment.appHost;
            },
            get uriScheme() {
                return initData.environment.appUriScheme;
            },
            get clipboard() {
                return extHostClipboard.value;
            },
            get shell() {
                return extHostTerminalService.getDefaultShell(false);
            },
            get onDidChangeShell() {
                return _asExtensionEvent(extHostTerminalService.onDidChangeShell);
            },
            get isTelemetryEnabled() {
                return extHostTelemetry.getTelemetryConfiguration();
            },
            get onDidChangeTelemetryEnabled() {
                return _asExtensionEvent(extHostTelemetry.onDidChangeTelemetryEnabled);
            },
            get telemetryConfiguration() {
                checkProposedApiEnabled(extension, 'telemetry');
                return extHostTelemetry.getTelemetryDetails();
            },
            get onDidChangeTelemetryConfiguration() {
                checkProposedApiEnabled(extension, 'telemetry');
                return _asExtensionEvent(extHostTelemetry.onDidChangeTelemetryConfiguration);
            },
            get isNewAppInstall() {
                return isNewAppInstall(initData.telemetryInfo.firstSessionDate);
            },
            createTelemetryLogger(sender, options) {
                ExtHostTelemetryLogger.validateSender(sender);
                return extHostTelemetry.instantiateLogger(extension, sender, options);
            },
            openExternal(uri, options) {
                return extHostWindow.openUri(uri, {
                    allowTunneling: !!initData.remote.authority,
                    allowContributedOpeners: options?.allowContributedOpeners,
                });
            },
            async asExternalUri(uri) {
                if (uri.scheme === initData.environment.appUriScheme) {
                    return extHostUrls.createAppUri(uri);
                }
                try {
                    return await extHostWindow.asExternalUri(uri, {
                        allowTunneling: !!initData.remote.authority,
                    });
                }
                catch (err) {
                    if (matchesScheme(uri, Schemas.http) || matchesScheme(uri, Schemas.https)) {
                        return uri;
                    }
                    throw err;
                }
            },
            get remoteName() {
                return getRemoteName(initData.remote.authority);
            },
            get remoteAuthority() {
                checkProposedApiEnabled(extension, 'resolvers');
                return initData.remote.authority;
            },
            get uiKind() {
                return initData.uiKind;
            },
            get logLevel() {
                return extHostLogService.getLevel();
            },
            get onDidChangeLogLevel() {
                return _asExtensionEvent(extHostLogService.onDidChangeLogLevel);
            },
            get appQuality() {
                checkProposedApiEnabled(extension, 'resolvers');
                return initData.quality;
            },
            get appCommit() {
                checkProposedApiEnabled(extension, 'resolvers');
                return initData.commit;
            },
        };
        if (!initData.environment.extensionTestsLocationURI) {
            // allow to patch env-function when running tests
            Object.freeze(env);
        }
        // namespace: tests
        const tests = {
            createTestController(provider, label, refreshHandler) {
                return extHostTesting.createTestController(extension, provider, label, refreshHandler);
            },
            createTestObserver() {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.createTestObserver();
            },
            runTests(provider) {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.runTests(provider);
            },
            registerTestFollowupProvider(provider) {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.registerTestFollowupProvider(provider);
            },
            get onDidChangeTestResults() {
                checkProposedApiEnabled(extension, 'testObserver');
                return _asExtensionEvent(extHostTesting.onResultsChanged);
            },
            get testResults() {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.results;
            },
        };
        // namespace: extensions
        const extensionKind = initData.remote.isRemote
            ? extHostTypes.ExtensionKind.Workspace
            : extHostTypes.ExtensionKind.UI;
        const extensions = {
            getExtension(extensionId, includeFromDifferentExtensionHosts) {
                if (!isProposedApiEnabled(extension, 'extensionsAny')) {
                    includeFromDifferentExtensionHosts = false;
                }
                const mine = extensionInfo.mine.getExtensionDescription(extensionId);
                if (mine) {
                    return new Extension(extensionService, extension.identifier, mine, extensionKind, false);
                }
                if (includeFromDifferentExtensionHosts) {
                    const foreign = extensionInfo.all.getExtensionDescription(extensionId);
                    if (foreign) {
                        return new Extension(extensionService, extension.identifier, foreign, extensionKind /* TODO@alexdima THIS IS WRONG */, true);
                    }
                }
                return undefined;
            },
            get all() {
                const result = [];
                for (const desc of extensionInfo.mine.getAllExtensionDescriptions()) {
                    result.push(new Extension(extensionService, extension.identifier, desc, extensionKind, false));
                }
                return result;
            },
            get allAcrossExtensionHosts() {
                checkProposedApiEnabled(extension, 'extensionsAny');
                const local = new ExtensionIdentifierSet(extensionInfo.mine.getAllExtensionDescriptions().map((desc) => desc.identifier));
                const result = [];
                for (const desc of extensionInfo.all.getAllExtensionDescriptions()) {
                    const isFromDifferentExtensionHost = !local.has(desc.identifier);
                    result.push(new Extension(extensionService, extension.identifier, desc, extensionKind /* TODO@alexdima THIS IS WRONG */, isFromDifferentExtensionHost));
                }
                return result;
            },
            get onDidChange() {
                if (isProposedApiEnabled(extension, 'extensionsAny')) {
                    return _asExtensionEvent(Event.any(extensionInfo.mine.onDidChange, extensionInfo.all.onDidChange));
                }
                return _asExtensionEvent(extensionInfo.mine.onDidChange);
            },
        };
        // namespace: languages
        const languages = {
            createDiagnosticCollection(name) {
                return extHostDiagnostics.createDiagnosticCollection(extension.identifier, name);
            },
            get onDidChangeDiagnostics() {
                return _asExtensionEvent(extHostDiagnostics.onDidChangeDiagnostics);
            },
            getDiagnostics: (resource) => {
                return extHostDiagnostics.getDiagnostics(resource);
            },
            getLanguages() {
                return extHostLanguages.getLanguages();
            },
            setTextDocumentLanguage(document, languageId) {
                return extHostLanguages.changeLanguage(document.uri, languageId);
            },
            match(selector, document) {
                const interalSelector = typeConverters.LanguageSelector.from(selector);
                let notebook;
                if (targetsNotebooks(interalSelector)) {
                    notebook = extHostNotebook.notebookDocuments.find((value) => value.apiNotebook.getCells().find((c) => c.document === document))?.apiNotebook;
                }
                return score(interalSelector, document.uri, document.languageId, true, notebook?.uri, notebook?.notebookType);
            },
            registerCodeActionsProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerCodeActionProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerDocumentPasteEditProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerDocumentPasteEditProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerCodeLensProvider(selector, provider) {
                return extHostLanguageFeatures.registerCodeLensProvider(extension, checkSelector(selector), provider);
            },
            registerDefinitionProvider(selector, provider) {
                return extHostLanguageFeatures.registerDefinitionProvider(extension, checkSelector(selector), provider);
            },
            registerDeclarationProvider(selector, provider) {
                return extHostLanguageFeatures.registerDeclarationProvider(extension, checkSelector(selector), provider);
            },
            registerImplementationProvider(selector, provider) {
                return extHostLanguageFeatures.registerImplementationProvider(extension, checkSelector(selector), provider);
            },
            registerTypeDefinitionProvider(selector, provider) {
                return extHostLanguageFeatures.registerTypeDefinitionProvider(extension, checkSelector(selector), provider);
            },
            registerHoverProvider(selector, provider) {
                return extHostLanguageFeatures.registerHoverProvider(extension, checkSelector(selector), provider, extension.identifier);
            },
            registerEvaluatableExpressionProvider(selector, provider) {
                return extHostLanguageFeatures.registerEvaluatableExpressionProvider(extension, checkSelector(selector), provider, extension.identifier);
            },
            registerInlineValuesProvider(selector, provider) {
                return extHostLanguageFeatures.registerInlineValuesProvider(extension, checkSelector(selector), provider, extension.identifier);
            },
            registerDocumentHighlightProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentHighlightProvider(extension, checkSelector(selector), provider);
            },
            registerMultiDocumentHighlightProvider(selector, provider) {
                return extHostLanguageFeatures.registerMultiDocumentHighlightProvider(extension, checkSelector(selector), provider);
            },
            registerLinkedEditingRangeProvider(selector, provider) {
                return extHostLanguageFeatures.registerLinkedEditingRangeProvider(extension, checkSelector(selector), provider);
            },
            registerReferenceProvider(selector, provider) {
                return extHostLanguageFeatures.registerReferenceProvider(extension, checkSelector(selector), provider);
            },
            registerRenameProvider(selector, provider) {
                return extHostLanguageFeatures.registerRenameProvider(extension, checkSelector(selector), provider);
            },
            registerNewSymbolNamesProvider(selector, provider) {
                checkProposedApiEnabled(extension, 'newSymbolNamesProvider');
                return extHostLanguageFeatures.registerNewSymbolNamesProvider(extension, checkSelector(selector), provider);
            },
            registerDocumentSymbolProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerDocumentSymbolProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerWorkspaceSymbolProvider(provider) {
                return extHostLanguageFeatures.registerWorkspaceSymbolProvider(extension, provider);
            },
            registerDocumentFormattingEditProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentFormattingEditProvider(extension, checkSelector(selector), provider);
            },
            registerDocumentRangeFormattingEditProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentRangeFormattingEditProvider(extension, checkSelector(selector), provider);
            },
            registerOnTypeFormattingEditProvider(selector, provider, firstTriggerCharacter, ...moreTriggerCharacters) {
                return extHostLanguageFeatures.registerOnTypeFormattingEditProvider(extension, checkSelector(selector), provider, [firstTriggerCharacter].concat(moreTriggerCharacters));
            },
            registerDocumentSemanticTokensProvider(selector, provider, legend) {
                return extHostLanguageFeatures.registerDocumentSemanticTokensProvider(extension, checkSelector(selector), provider, legend);
            },
            registerDocumentRangeSemanticTokensProvider(selector, provider, legend) {
                return extHostLanguageFeatures.registerDocumentRangeSemanticTokensProvider(extension, checkSelector(selector), provider, legend);
            },
            registerSignatureHelpProvider(selector, provider, firstItem, ...remaining) {
                if (typeof firstItem === 'object') {
                    return extHostLanguageFeatures.registerSignatureHelpProvider(extension, checkSelector(selector), provider, firstItem);
                }
                return extHostLanguageFeatures.registerSignatureHelpProvider(extension, checkSelector(selector), provider, typeof firstItem === 'undefined' ? [] : [firstItem, ...remaining]);
            },
            registerCompletionItemProvider(selector, provider, ...triggerCharacters) {
                return extHostLanguageFeatures.registerCompletionItemProvider(extension, checkSelector(selector), provider, triggerCharacters);
            },
            registerInlineCompletionItemProvider(selector, provider, metadata) {
                if (provider.handleDidShowCompletionItem) {
                    checkProposedApiEnabled(extension, 'inlineCompletionsAdditions');
                }
                if (provider.handleDidPartiallyAcceptCompletionItem) {
                    checkProposedApiEnabled(extension, 'inlineCompletionsAdditions');
                }
                if (metadata) {
                    checkProposedApiEnabled(extension, 'inlineCompletionsAdditions');
                }
                return extHostLanguageFeatures.registerInlineCompletionsProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerInlineEditProvider(selector, provider) {
                checkProposedApiEnabled(extension, 'inlineEdit');
                return extHostLanguageFeatures.registerInlineEditProvider(extension, checkSelector(selector), provider);
            },
            registerDocumentLinkProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentLinkProvider(extension, checkSelector(selector), provider);
            },
            registerColorProvider(selector, provider) {
                return extHostLanguageFeatures.registerColorProvider(extension, checkSelector(selector), provider);
            },
            registerFoldingRangeProvider(selector, provider) {
                return extHostLanguageFeatures.registerFoldingRangeProvider(extension, checkSelector(selector), provider);
            },
            registerSelectionRangeProvider(selector, provider) {
                return extHostLanguageFeatures.registerSelectionRangeProvider(extension, selector, provider);
            },
            registerCallHierarchyProvider(selector, provider) {
                return extHostLanguageFeatures.registerCallHierarchyProvider(extension, selector, provider);
            },
            registerTypeHierarchyProvider(selector, provider) {
                return extHostLanguageFeatures.registerTypeHierarchyProvider(extension, selector, provider);
            },
            setLanguageConfiguration: (language, configuration) => {
                return extHostLanguageFeatures.setLanguageConfiguration(extension, language, configuration);
            },
            getTokenInformationAtPosition(doc, pos) {
                checkProposedApiEnabled(extension, 'tokenInformation');
                return extHostLanguages.tokenAtPosition(doc, pos);
            },
            registerInlayHintsProvider(selector, provider) {
                return extHostLanguageFeatures.registerInlayHintsProvider(extension, selector, provider);
            },
            createLanguageStatusItem(id, selector) {
                return extHostLanguages.createLanguageStatusItem(extension, id, selector);
            },
            registerDocumentDropEditProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerDocumentOnDropEditProvider(extension, selector, provider, metadata);
            },
        };
        // namespace: window
        const window = {
            get activeTextEditor() {
                return extHostEditors.getActiveTextEditor();
            },
            get visibleTextEditors() {
                return extHostEditors.getVisibleTextEditors();
            },
            get activeTerminal() {
                return extHostTerminalService.activeTerminal;
            },
            get terminals() {
                return extHostTerminalService.terminals;
            },
            async showTextDocument(documentOrUri, columnOrOptions, preserveFocus) {
                if (URI.isUri(documentOrUri) &&
                    documentOrUri.scheme === Schemas.vscodeRemote &&
                    !documentOrUri.authority) {
                    extHostApiDeprecation.report('workspace.showTextDocument', extension, `A URI of 'vscode-remote' scheme requires an authority.`);
                }
                const document = await (URI.isUri(documentOrUri)
                    ? Promise.resolve(workspace.openTextDocument(documentOrUri))
                    : Promise.resolve(documentOrUri));
                return extHostEditors.showTextDocument(document, columnOrOptions, preserveFocus);
            },
            createTextEditorDecorationType(options) {
                return extHostEditors.createTextEditorDecorationType(extension, options);
            },
            onDidChangeActiveTextEditor(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeActiveTextEditor)(listener, thisArg, disposables);
            },
            onDidChangeVisibleTextEditors(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeVisibleTextEditors)(listener, thisArg, disposables);
            },
            onDidChangeTextEditorSelection(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorSelection)(listener, thisArgs, disposables);
            },
            onDidChangeTextEditorOptions(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorOptions)(listener, thisArgs, disposables);
            },
            onDidChangeTextEditorVisibleRanges(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorVisibleRanges)(listener, thisArgs, disposables);
            },
            onDidChangeTextEditorViewColumn(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorViewColumn)(listener, thisArg, disposables);
            },
            onDidChangeTextEditorDiffInformation(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'textEditorDiffInformation');
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorDiffInformation)(listener, thisArg, disposables);
            },
            onDidCloseTerminal(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidCloseTerminal)(listener, thisArg, disposables);
            },
            onDidOpenTerminal(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidOpenTerminal)(listener, thisArg, disposables);
            },
            onDidChangeActiveTerminal(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidChangeActiveTerminal)(listener, thisArg, disposables);
            },
            onDidChangeTerminalDimensions(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'terminalDimensions');
                return _asExtensionEvent(extHostTerminalService.onDidChangeTerminalDimensions)(listener, thisArg, disposables);
            },
            onDidChangeTerminalState(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidChangeTerminalState)(listener, thisArg, disposables);
            },
            onDidWriteTerminalData(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'terminalDataWriteEvent');
                return _asExtensionEvent(extHostTerminalService.onDidWriteTerminalData)(listener, thisArg, disposables);
            },
            onDidExecuteTerminalCommand(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'terminalExecuteCommandEvent');
                return _asExtensionEvent(extHostTerminalService.onDidExecuteTerminalCommand)(listener, thisArg, disposables);
            },
            onDidChangeTerminalShellIntegration(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalShellIntegration.onDidChangeTerminalShellIntegration)(listener, thisArg, disposables);
            },
            onDidStartTerminalShellExecution(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalShellIntegration.onDidStartTerminalShellExecution)(listener, thisArg, disposables);
            },
            onDidEndTerminalShellExecution(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalShellIntegration.onDidEndTerminalShellExecution)(listener, thisArg, disposables);
            },
            get state() {
                return extHostWindow.getState();
            },
            onDidChangeWindowState(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostWindow.onDidChangeWindowState)(listener, thisArg, disposables);
            },
            showInformationMessage(message, ...rest) {
                return (extHostMessageService.showMessage(extension, Severity.Info, message, rest[0], rest.slice(1)));
            },
            showWarningMessage(message, ...rest) {
                return (extHostMessageService.showMessage(extension, Severity.Warning, message, rest[0], rest.slice(1)));
            },
            showErrorMessage(message, ...rest) {
                return (extHostMessageService.showMessage(extension, Severity.Error, message, rest[0], rest.slice(1)));
            },
            showQuickPick(items, options, token) {
                return extHostQuickOpen.showQuickPick(extension, items, options, token);
            },
            showWorkspaceFolderPick(options) {
                return extHostQuickOpen.showWorkspaceFolderPick(options);
            },
            showInputBox(options, token) {
                return extHostQuickOpen.showInput(options, token);
            },
            showOpenDialog(options) {
                return extHostDialogs.showOpenDialog(options);
            },
            showSaveDialog(options) {
                return extHostDialogs.showSaveDialog(options);
            },
            createStatusBarItem(alignmentOrId, priorityOrAlignment, priorityArg) {
                let id;
                let alignment;
                let priority;
                if (typeof alignmentOrId === 'string') {
                    id = alignmentOrId;
                    alignment = priorityOrAlignment;
                    priority = priorityArg;
                }
                else {
                    alignment = alignmentOrId;
                    priority = priorityOrAlignment;
                }
                return extHostStatusBar.createStatusBarEntry(extension, id, alignment, priority);
            },
            setStatusBarMessage(text, timeoutOrThenable) {
                return extHostStatusBar.setStatusBarMessage(text, timeoutOrThenable);
            },
            withScmProgress(task) {
                extHostApiDeprecation.report('window.withScmProgress', extension, `Use 'withProgress' instead.`);
                return extHostProgress.withProgress(extension, { location: extHostTypes.ProgressLocation.SourceControl }, (progress, token) => task({
                    report(n) {
                        /*noop*/
                    },
                }));
            },
            withProgress(options, task) {
                return extHostProgress.withProgress(extension, options, task);
            },
            createOutputChannel(name, options) {
                return extHostOutputService.createOutputChannel(name, options, extension);
            },
            createWebviewPanel(viewType, title, showOptions, options) {
                return extHostWebviewPanels.createWebviewPanel(extension, viewType, title, showOptions, options);
            },
            createWebviewTextEditorInset(editor, line, height, options) {
                checkProposedApiEnabled(extension, 'editorInsets');
                return extHostEditorInsets.createWebviewEditorInset(editor, line, height, options, extension);
            },
            createTerminal(nameOrOptions, shellPath, shellArgs) {
                if (typeof nameOrOptions === 'object') {
                    if ('pty' in nameOrOptions) {
                        return extHostTerminalService.createExtensionTerminal(nameOrOptions);
                    }
                    return extHostTerminalService.createTerminalFromOptions(nameOrOptions);
                }
                return extHostTerminalService.createTerminal(nameOrOptions, shellPath, shellArgs);
            },
            registerTerminalLinkProvider(provider) {
                return extHostTerminalService.registerLinkProvider(provider);
            },
            registerTerminalProfileProvider(id, provider) {
                return extHostTerminalService.registerProfileProvider(extension, id, provider);
            },
            registerTerminalCompletionProvider(provider, ...triggerCharacters) {
                checkProposedApiEnabled(extension, 'terminalCompletionProvider');
                return extHostTerminalService.registerTerminalCompletionProvider(extension, provider, ...triggerCharacters);
            },
            registerTerminalQuickFixProvider(id, provider) {
                checkProposedApiEnabled(extension, 'terminalQuickFixProvider');
                return extHostTerminalService.registerTerminalQuickFixProvider(id, extension.identifier.value, provider);
            },
            registerTreeDataProvider(viewId, treeDataProvider) {
                return extHostTreeViews.registerTreeDataProvider(viewId, treeDataProvider, extension);
            },
            createTreeView(viewId, options) {
                return extHostTreeViews.createTreeView(viewId, options, extension);
            },
            registerWebviewPanelSerializer: (viewType, serializer) => {
                return extHostWebviewPanels.registerWebviewPanelSerializer(extension, viewType, serializer);
            },
            registerCustomEditorProvider: (viewType, provider, options = {}) => {
                return extHostCustomEditors.registerCustomEditorProvider(extension, viewType, provider, options);
            },
            registerFileDecorationProvider(provider) {
                return extHostDecorations.registerFileDecorationProvider(provider, extension);
            },
            registerUriHandler(handler) {
                return extHostUrls.registerUriHandler(extension, handler);
            },
            createQuickPick() {
                return extHostQuickOpen.createQuickPick(extension);
            },
            createInputBox() {
                return extHostQuickOpen.createInputBox(extension);
            },
            get activeColorTheme() {
                return extHostTheming.activeColorTheme;
            },
            onDidChangeActiveColorTheme(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTheming.onDidChangeActiveColorTheme)(listener, thisArg, disposables);
            },
            registerWebviewViewProvider(viewId, provider, options) {
                return extHostWebviewViews.registerWebviewViewProvider(extension, viewId, provider, options?.webviewOptions);
            },
            get activeNotebookEditor() {
                return extHostNotebook.activeNotebookEditor;
            },
            onDidChangeActiveNotebookEditor(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostNotebook.onDidChangeActiveNotebookEditor)(listener, thisArgs, disposables);
            },
            get visibleNotebookEditors() {
                return extHostNotebook.visibleNotebookEditors;
            },
            get onDidChangeVisibleNotebookEditors() {
                return _asExtensionEvent(extHostNotebook.onDidChangeVisibleNotebookEditors);
            },
            onDidChangeNotebookEditorSelection(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostNotebookEditors.onDidChangeNotebookEditorSelection)(listener, thisArgs, disposables);
            },
            onDidChangeNotebookEditorVisibleRanges(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostNotebookEditors.onDidChangeNotebookEditorVisibleRanges)(listener, thisArgs, disposables);
            },
            showNotebookDocument(document, options) {
                return extHostNotebook.showNotebookDocument(document, options);
            },
            registerExternalUriOpener(id, opener, metadata) {
                checkProposedApiEnabled(extension, 'externalUriOpener');
                return extHostUriOpeners.registerExternalUriOpener(extension.identifier, id, opener, metadata);
            },
            registerProfileContentHandler(id, handler) {
                checkProposedApiEnabled(extension, 'profileContentHandlers');
                return extHostProfileContentHandlers.registerProfileContentHandler(extension, id, handler);
            },
            registerQuickDiffProvider(selector, quickDiffProvider, label, rootUri) {
                checkProposedApiEnabled(extension, 'quickDiffProvider');
                return extHostQuickDiff.registerQuickDiffProvider(checkSelector(selector), quickDiffProvider, label, rootUri);
            },
            get tabGroups() {
                return extHostEditorTabs.tabGroups;
            },
            registerShareProvider(selector, provider) {
                checkProposedApiEnabled(extension, 'shareProvider');
                return extHostShare.registerShareProvider(checkSelector(selector), provider);
            },
            get nativeHandle() {
                checkProposedApiEnabled(extension, 'nativeWindowHandle');
                return extHostWindow.nativeHandle;
            },
            createChatStatusItem: (id) => {
                checkProposedApiEnabled(extension, 'chatStatusItem');
                return extHostChatStatus.createChatStatusItem(extension, id);
            },
        };
        // namespace: workspace
        const workspace = {
            get rootPath() {
                extHostApiDeprecation.report('workspace.rootPath', extension, `Please use 'workspace.workspaceFolders' instead. More details: https://aka.ms/vscode-eliminating-rootpath`);
                return extHostWorkspace.getPath();
            },
            set rootPath(value) {
                throw new errors.ReadonlyError('rootPath');
            },
            getWorkspaceFolder(resource) {
                return extHostWorkspace.getWorkspaceFolder(resource);
            },
            get workspaceFolders() {
                return extHostWorkspace.getWorkspaceFolders();
            },
            get name() {
                return extHostWorkspace.name;
            },
            set name(value) {
                throw new errors.ReadonlyError('name');
            },
            get workspaceFile() {
                return extHostWorkspace.workspaceFile;
            },
            set workspaceFile(value) {
                throw new errors.ReadonlyError('workspaceFile');
            },
            updateWorkspaceFolders: (index, deleteCount, ...workspaceFoldersToAdd) => {
                return extHostWorkspace.updateWorkspaceFolders(extension, index, deleteCount || 0, ...workspaceFoldersToAdd);
            },
            onDidChangeWorkspaceFolders: function (listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostWorkspace.onDidChangeWorkspace)(listener, thisArgs, disposables);
            },
            asRelativePath: (pathOrUri, includeWorkspace) => {
                return extHostWorkspace.getRelativePath(pathOrUri, includeWorkspace);
            },
            findFiles: (include, exclude, maxResults, token) => {
                // Note, undefined/null have different meanings on "exclude"
                return extHostWorkspace.findFiles(include, exclude, maxResults, extension.identifier, token);
            },
            findFiles2: (filePattern, options, token) => {
                checkProposedApiEnabled(extension, 'findFiles2');
                return extHostWorkspace.findFiles2(filePattern, options, extension.identifier, token);
            },
            findTextInFiles: (query, optionsOrCallback, callbackOrToken, token) => {
                checkProposedApiEnabled(extension, 'findTextInFiles');
                let options;
                let callback;
                if (typeof optionsOrCallback === 'object') {
                    options = optionsOrCallback;
                    callback = callbackOrToken;
                }
                else {
                    options = {};
                    callback = optionsOrCallback;
                    token = callbackOrToken;
                }
                return extHostWorkspace.findTextInFiles(query, options || {}, callback, extension.identifier, token);
            },
            findTextInFiles2: (query, options, token) => {
                checkProposedApiEnabled(extension, 'findTextInFiles2');
                checkProposedApiEnabled(extension, 'textSearchProvider2');
                return extHostWorkspace.findTextInFiles2(query, options, extension.identifier, token);
            },
            save: (uri) => {
                return extHostWorkspace.save(uri);
            },
            saveAs: (uri) => {
                return extHostWorkspace.saveAs(uri);
            },
            saveAll: (includeUntitled) => {
                return extHostWorkspace.saveAll(includeUntitled);
            },
            applyEdit(edit, metadata) {
                return extHostBulkEdits.applyWorkspaceEdit(edit, extension, metadata);
            },
            createFileSystemWatcher: (pattern, optionsOrIgnoreCreate, ignoreChange, ignoreDelete) => {
                const options = {
                    ignoreCreateEvents: Boolean(optionsOrIgnoreCreate),
                    ignoreChangeEvents: Boolean(ignoreChange),
                    ignoreDeleteEvents: Boolean(ignoreDelete),
                };
                return extHostFileSystemEvent.createFileSystemWatcher(extHostWorkspace, configProvider, extension, pattern, options);
            },
            get textDocuments() {
                return extHostDocuments.getAllDocumentData().map((data) => data.document);
            },
            set textDocuments(value) {
                throw new errors.ReadonlyError('textDocuments');
            },
            openTextDocument(uriOrFileNameOrOptions, options) {
                let uriPromise;
                options = (options ?? uriOrFileNameOrOptions);
                if (typeof options?.encoding === 'string') {
                    checkProposedApiEnabled(extension, 'textDocumentEncoding');
                }
                if (typeof uriOrFileNameOrOptions === 'string') {
                    uriPromise = Promise.resolve(URI.file(uriOrFileNameOrOptions));
                }
                else if (URI.isUri(uriOrFileNameOrOptions)) {
                    uriPromise = Promise.resolve(uriOrFileNameOrOptions);
                }
                else if (!options || typeof options === 'object') {
                    uriPromise = extHostDocuments.createDocumentData(options);
                }
                else {
                    throw new Error('illegal argument - uriOrFileNameOrOptions');
                }
                return uriPromise.then((uri) => {
                    extHostLogService.trace(`openTextDocument from ${extension.identifier}`);
                    if (uri.scheme === Schemas.vscodeRemote && !uri.authority) {
                        extHostApiDeprecation.report('workspace.openTextDocument', extension, `A URI of 'vscode-remote' scheme requires an authority.`);
                    }
                    return extHostDocuments.ensureDocumentData(uri, options).then((documentData) => {
                        return documentData.document;
                    });
                });
            },
            onDidOpenTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocuments.onDidAddDocument)(listener, thisArgs, disposables);
            },
            onDidCloseTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocuments.onDidRemoveDocument)(listener, thisArgs, disposables);
            },
            onDidChangeTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocuments.onDidChangeDocument)(listener, thisArgs, disposables);
            },
            onDidSaveTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocuments.onDidSaveDocument)(listener, thisArgs, disposables);
            },
            onWillSaveTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocumentSaveParticipant.getOnWillSaveTextDocumentEvent(extension))(listener, thisArgs, disposables);
            },
            get notebookDocuments() {
                return extHostNotebook.notebookDocuments.map((d) => d.apiNotebook);
            },
            async openNotebookDocument(uriOrType, content) {
                let uri;
                if (URI.isUri(uriOrType)) {
                    uri = uriOrType;
                    await extHostNotebook.openNotebookDocument(uriOrType);
                }
                else if (typeof uriOrType === 'string') {
                    uri = URI.revive(await extHostNotebook.createNotebookDocument({ viewType: uriOrType, content }));
                }
                else {
                    throw new Error('Invalid arguments');
                }
                return extHostNotebook.getNotebookDocument(uri).apiNotebook;
            },
            onDidSaveNotebookDocument(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostNotebookDocuments.onDidSaveNotebookDocument)(listener, thisArg, disposables);
            },
            onDidChangeNotebookDocument(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostNotebookDocuments.onDidChangeNotebookDocument)(listener, thisArg, disposables);
            },
            onWillSaveNotebookDocument(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostNotebookDocumentSaveParticipant.getOnWillSaveNotebookDocumentEvent(extension))(listener, thisArg, disposables);
            },
            get onDidOpenNotebookDocument() {
                return _asExtensionEvent(extHostNotebook.onDidOpenNotebookDocument);
            },
            get onDidCloseNotebookDocument() {
                return _asExtensionEvent(extHostNotebook.onDidCloseNotebookDocument);
            },
            registerNotebookSerializer(viewType, serializer, options, registration) {
                return extHostNotebook.registerNotebookSerializer(extension, viewType, serializer, options, isProposedApiEnabled(extension, 'notebookLiveShare') ? registration : undefined);
            },
            onDidChangeConfiguration: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(configProvider.onDidChangeConfiguration)(listener, thisArgs, disposables);
            },
            getConfiguration(section, scope) {
                scope = arguments.length === 1 ? undefined : scope;
                return configProvider.getConfiguration(section, scope, extension);
            },
            registerTextDocumentContentProvider(scheme, provider) {
                return extHostDocumentContentProviders.registerTextDocumentContentProvider(scheme, provider);
            },
            registerTaskProvider: (type, provider) => {
                extHostApiDeprecation.report('window.registerTaskProvider', extension, `Use the corresponding function on the 'tasks' namespace instead`);
                return extHostTask.registerTaskProvider(extension, type, provider);
            },
            registerFileSystemProvider(scheme, provider, options) {
                return combinedDisposable(extHostFileSystem.registerFileSystemProvider(extension, scheme, provider, options), extHostConsumerFileSystem.addFileSystemProvider(scheme, provider, options));
            },
            get fs() {
                return extHostConsumerFileSystem.value;
            },
            registerFileSearchProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'fileSearchProvider');
                return extHostSearch.registerFileSearchProviderOld(scheme, provider);
            },
            registerTextSearchProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'textSearchProvider');
                return extHostSearch.registerTextSearchProviderOld(scheme, provider);
            },
            registerAITextSearchProvider: (scheme, provider) => {
                // there are some dependencies on textSearchProvider, so we need to check for both
                checkProposedApiEnabled(extension, 'aiTextSearchProvider');
                checkProposedApiEnabled(extension, 'textSearchProvider2');
                return extHostSearch.registerAITextSearchProvider(scheme, provider);
            },
            registerFileSearchProvider2: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'fileSearchProvider2');
                return extHostSearch.registerFileSearchProvider(scheme, provider);
            },
            registerTextSearchProvider2: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'textSearchProvider2');
                return extHostSearch.registerTextSearchProvider(scheme, provider);
            },
            registerRemoteAuthorityResolver: (authorityPrefix, resolver) => {
                checkProposedApiEnabled(extension, 'resolvers');
                return extensionService.registerRemoteAuthorityResolver(authorityPrefix, resolver);
            },
            registerResourceLabelFormatter: (formatter) => {
                checkProposedApiEnabled(extension, 'resolvers');
                return extHostLabelService.$registerResourceLabelFormatter(formatter);
            },
            getRemoteExecServer: (authority) => {
                checkProposedApiEnabled(extension, 'resolvers');
                return extensionService.getRemoteExecServer(authority);
            },
            onDidCreateFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.onDidCreateFile)(listener, thisArg, disposables);
            },
            onDidDeleteFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.onDidDeleteFile)(listener, thisArg, disposables);
            },
            onDidRenameFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.onDidRenameFile)(listener, thisArg, disposables);
            },
            onWillCreateFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.getOnWillCreateFileEvent(extension))(listener, thisArg, disposables);
            },
            onWillDeleteFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.getOnWillDeleteFileEvent(extension))(listener, thisArg, disposables);
            },
            onWillRenameFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.getOnWillRenameFileEvent(extension))(listener, thisArg, disposables);
            },
            openTunnel: (forward) => {
                checkProposedApiEnabled(extension, 'tunnels');
                return extHostTunnelService.openTunnel(extension, forward).then((value) => {
                    if (!value) {
                        throw new Error('cannot open tunnel');
                    }
                    return value;
                });
            },
            get tunnels() {
                checkProposedApiEnabled(extension, 'tunnels');
                return extHostTunnelService.getTunnels();
            },
            onDidChangeTunnels: (listener, thisArg, disposables) => {
                checkProposedApiEnabled(extension, 'tunnels');
                return _asExtensionEvent(extHostTunnelService.onDidChangeTunnels)(listener, thisArg, disposables);
            },
            registerPortAttributesProvider: (portSelector, provider) => {
                checkProposedApiEnabled(extension, 'portsAttributes');
                return extHostTunnelService.registerPortsAttributesProvider(portSelector, provider);
            },
            registerTunnelProvider: (tunnelProvider, information) => {
                checkProposedApiEnabled(extension, 'tunnelFactory');
                return extHostTunnelService.registerTunnelProvider(tunnelProvider, information);
            },
            registerTimelineProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'timeline');
                return extHostTimeline.registerTimelineProvider(scheme, provider, extension.identifier, extHostCommands.converter);
            },
            get isTrusted() {
                return extHostWorkspace.trusted;
            },
            requestWorkspaceTrust: (options) => {
                checkProposedApiEnabled(extension, 'workspaceTrust');
                return extHostWorkspace.requestWorkspaceTrust(options);
            },
            onDidGrantWorkspaceTrust: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostWorkspace.onDidGrantWorkspaceTrust)(listener, thisArgs, disposables);
            },
            registerEditSessionIdentityProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'editSessionIdentityProvider');
                return extHostWorkspace.registerEditSessionIdentityProvider(scheme, provider);
            },
            onWillCreateEditSessionIdentity: (listener, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'editSessionIdentityProvider');
                return _asExtensionEvent(extHostWorkspace.getOnWillCreateEditSessionIdentityEvent(extension))(listener, thisArgs, disposables);
            },
            registerCanonicalUriProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'canonicalUriProvider');
                return extHostWorkspace.registerCanonicalUriProvider(scheme, provider);
            },
            getCanonicalUri: (uri, options, token) => {
                checkProposedApiEnabled(extension, 'canonicalUriProvider');
                return extHostWorkspace.provideCanonicalUri(uri, options, token);
            },
            decode(content, uri, options) {
                checkProposedApiEnabled(extension, 'textDocumentEncoding');
                return extHostWorkspace.decode(content, uri, options);
            },
            encode(content, uri, options) {
                checkProposedApiEnabled(extension, 'textDocumentEncoding');
                return extHostWorkspace.encode(content, uri, options);
            },
        };
        // namespace: scm
        const scm = {
            get inputBox() {
                extHostApiDeprecation.report('scm.inputBox', extension, `Use 'SourceControl.inputBox' instead`);
                return extHostSCM.getLastInputBox(extension); // Strict null override - Deprecated api
            },
            createSourceControl(id, label, rootUri) {
                return extHostSCM.createSourceControl(extension, id, label, rootUri);
            },
        };
        // namespace: comments
        const comments = {
            createCommentController(id, label) {
                return extHostComment.createCommentController(extension, id, label);
            },
        };
        // namespace: debug
        const debug = {
            get activeDebugSession() {
                return extHostDebugService.activeDebugSession;
            },
            get activeDebugConsole() {
                return extHostDebugService.activeDebugConsole;
            },
            get breakpoints() {
                return extHostDebugService.breakpoints;
            },
            get activeStackItem() {
                return extHostDebugService.activeStackItem;
            },
            registerDebugVisualizationProvider(id, provider) {
                checkProposedApiEnabled(extension, 'debugVisualization');
                return extHostDebugService.registerDebugVisualizationProvider(extension, id, provider);
            },
            registerDebugVisualizationTreeProvider(id, provider) {
                checkProposedApiEnabled(extension, 'debugVisualization');
                return extHostDebugService.registerDebugVisualizationTree(extension, id, provider);
            },
            onDidStartDebugSession(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidStartDebugSession)(listener, thisArg, disposables);
            },
            onDidTerminateDebugSession(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidTerminateDebugSession)(listener, thisArg, disposables);
            },
            onDidChangeActiveDebugSession(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidChangeActiveDebugSession)(listener, thisArg, disposables);
            },
            onDidReceiveDebugSessionCustomEvent(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidReceiveDebugSessionCustomEvent)(listener, thisArg, disposables);
            },
            onDidChangeBreakpoints(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidChangeBreakpoints)(listener, thisArgs, disposables);
            },
            onDidChangeActiveStackItem(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidChangeActiveStackItem)(listener, thisArg, disposables);
            },
            registerDebugConfigurationProvider(debugType, provider, triggerKind) {
                return extHostDebugService.registerDebugConfigurationProvider(debugType, provider, triggerKind || DebugConfigurationProviderTriggerKind.Initial);
            },
            registerDebugAdapterDescriptorFactory(debugType, factory) {
                return extHostDebugService.registerDebugAdapterDescriptorFactory(extension, debugType, factory);
            },
            registerDebugAdapterTrackerFactory(debugType, factory) {
                return extHostDebugService.registerDebugAdapterTrackerFactory(debugType, factory);
            },
            startDebugging(folder, nameOrConfig, parentSessionOrOptions) {
                if (!parentSessionOrOptions ||
                    (typeof parentSessionOrOptions === 'object' && 'configuration' in parentSessionOrOptions)) {
                    return extHostDebugService.startDebugging(folder, nameOrConfig, {
                        parentSession: parentSessionOrOptions,
                    });
                }
                return extHostDebugService.startDebugging(folder, nameOrConfig, parentSessionOrOptions || {});
            },
            stopDebugging(session) {
                return extHostDebugService.stopDebugging(session);
            },
            addBreakpoints(breakpoints) {
                return extHostDebugService.addBreakpoints(breakpoints);
            },
            removeBreakpoints(breakpoints) {
                return extHostDebugService.removeBreakpoints(breakpoints);
            },
            asDebugSourceUri(source, session) {
                return extHostDebugService.asDebugSourceUri(source, session);
            },
        };
        const tasks = {
            registerTaskProvider: (type, provider) => {
                return extHostTask.registerTaskProvider(extension, type, provider);
            },
            fetchTasks: (filter) => {
                return extHostTask.fetchTasks(filter);
            },
            executeTask: (task) => {
                return extHostTask.executeTask(extension, task);
            },
            get taskExecutions() {
                return extHostTask.taskExecutions;
            },
            onDidStartTask: (listeners, thisArgs, disposables) => {
                return _asExtensionEvent(extHostTask.onDidStartTask)(listeners, thisArgs, disposables);
            },
            onDidEndTask: (listeners, thisArgs, disposables) => {
                return _asExtensionEvent(extHostTask.onDidEndTask)(listeners, thisArgs, disposables);
            },
            onDidStartTaskProcess: (listeners, thisArgs, disposables) => {
                return _asExtensionEvent(extHostTask.onDidStartTaskProcess)(listeners, thisArgs, disposables);
            },
            onDidEndTaskProcess: (listeners, thisArgs, disposables) => {
                return _asExtensionEvent(extHostTask.onDidEndTaskProcess)(listeners, thisArgs, disposables);
            },
            onDidStartTaskProblemMatchers: (listeners, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'taskProblemMatcherStatus');
                return _asExtensionEvent(extHostTask.onDidStartTaskProblemMatchers)(listeners, thisArgs, disposables);
            },
            onDidEndTaskProblemMatchers: (listeners, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'taskProblemMatcherStatus');
                return _asExtensionEvent(extHostTask.onDidEndTaskProblemMatchers)(listeners, thisArgs, disposables);
            },
        };
        // namespace: notebook
        const notebooks = {
            createNotebookController(id, notebookType, label, handler, rendererScripts) {
                return extHostNotebookKernels.createNotebookController(extension, id, notebookType, label, handler, isProposedApiEnabled(extension, 'notebookMessaging') ? rendererScripts : undefined);
            },
            registerNotebookCellStatusBarItemProvider: (notebookType, provider) => {
                return extHostNotebook.registerNotebookCellStatusBarItemProvider(extension, notebookType, provider);
            },
            createRendererMessaging(rendererId) {
                return extHostNotebookRenderers.createRendererMessaging(extension, rendererId);
            },
            createNotebookControllerDetectionTask(notebookType) {
                checkProposedApiEnabled(extension, 'notebookKernelSource');
                return extHostNotebookKernels.createNotebookControllerDetectionTask(extension, notebookType);
            },
            registerKernelSourceActionProvider(notebookType, provider) {
                checkProposedApiEnabled(extension, 'notebookKernelSource');
                return extHostNotebookKernels.registerKernelSourceActionProvider(extension, notebookType, provider);
            },
            onDidChangeNotebookCellExecutionState(listener, thisArgs, disposables) {
                checkProposedApiEnabled(extension, 'notebookCellExecutionState');
                return _asExtensionEvent(extHostNotebookKernels.onDidChangeNotebookCellExecutionState)(listener, thisArgs, disposables);
            },
        };
        // namespace: l10n
        const l10n = {
            t(...params) {
                if (typeof params[0] === 'string') {
                    const key = params.shift();
                    // We have either rest args which are Array<string | number | boolean> or an array with a single Record<string, any>.
                    // This ensures we get a Record<string | number, any> which will be formatted correctly.
                    const argsFormatted = !params || typeof params[0] !== 'object' ? params : params[0];
                    return extHostLocalization.getMessage(extension.identifier.value, {
                        message: key,
                        args: argsFormatted,
                    });
                }
                return extHostLocalization.getMessage(extension.identifier.value, params[0]);
            },
            get bundle() {
                return extHostLocalization.getBundle(extension.identifier.value);
            },
            get uri() {
                return extHostLocalization.getBundleUri(extension.identifier.value);
            },
        };
        // namespace: interactive
        const interactive = {
            transferActiveChat(toWorkspace) {
                checkProposedApiEnabled(extension, 'interactive');
                return extHostChatAgents2.transferActiveChat(toWorkspace);
            },
        };
        // namespace: ai
        const ai = {
            getRelatedInformation(query, types) {
                checkProposedApiEnabled(extension, 'aiRelatedInformation');
                return extHostAiRelatedInformation.getRelatedInformation(extension, query, types);
            },
            registerRelatedInformationProvider(type, provider) {
                checkProposedApiEnabled(extension, 'aiRelatedInformation');
                return extHostAiRelatedInformation.registerRelatedInformationProvider(extension, type, provider);
            },
            registerEmbeddingVectorProvider(model, provider) {
                checkProposedApiEnabled(extension, 'aiRelatedInformation');
                return extHostAiEmbeddingVector.registerEmbeddingVectorProvider(extension, model, provider);
            },
        };
        // namespace: chat
        const chat = {
            registerChatResponseProvider(id, provider, metadata) {
                checkProposedApiEnabled(extension, 'chatProvider');
                return extHostLanguageModels.registerLanguageModel(extension, id, provider, metadata);
            },
            registerMappedEditsProvider(_selector, _provider) {
                checkProposedApiEnabled(extension, 'mappedEditsProvider');
                // no longer supported
                return { dispose() { } };
            },
            registerMappedEditsProvider2(provider) {
                checkProposedApiEnabled(extension, 'mappedEditsProvider');
                return extHostCodeMapper.registerMappedEditsProvider(extension, provider);
            },
            createChatParticipant(id, handler) {
                return extHostChatAgents2.createChatAgent(extension, id, handler);
            },
            createDynamicChatParticipant(id, dynamicProps, handler) {
                checkProposedApiEnabled(extension, 'chatParticipantPrivate');
                return extHostChatAgents2.createDynamicChatAgent(extension, id, dynamicProps, handler);
            },
            registerChatParticipantDetectionProvider(provider) {
                checkProposedApiEnabled(extension, 'chatParticipantPrivate');
                return extHostChatAgents2.registerChatParticipantDetectionProvider(extension, provider);
            },
            registerRelatedFilesProvider(provider, metadata) {
                checkProposedApiEnabled(extension, 'chatEditing');
                return extHostChatAgents2.registerRelatedFilesProvider(extension, provider, metadata);
            },
            onDidDisposeChatSession: (listeners, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'chatParticipantPrivate');
                return _asExtensionEvent(extHostChatAgents2.onDidDisposeChatSession)(listeners, thisArgs, disposables);
            },
        };
        // namespace: lm
        const lm = {
            selectChatModels: (selector) => {
                return extHostLanguageModels.selectLanguageModels(extension, selector ?? {});
            },
            onDidChangeChatModels: (listener, thisArgs, disposables) => {
                return extHostLanguageModels.onDidChangeProviders(listener, thisArgs, disposables);
            },
            registerChatModelProvider: (id, provider, metadata) => {
                checkProposedApiEnabled(extension, 'chatProvider');
                return extHostLanguageModels.registerLanguageModel(extension, id, provider, metadata);
            },
            // --- embeddings
            get embeddingModels() {
                checkProposedApiEnabled(extension, 'embeddings');
                return extHostEmbeddings.embeddingsModels;
            },
            onDidChangeEmbeddingModels: (listener, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'embeddings');
                return extHostEmbeddings.onDidChange(listener, thisArgs, disposables);
            },
            registerEmbeddingsProvider(embeddingsModel, provider) {
                checkProposedApiEnabled(extension, 'embeddings');
                return extHostEmbeddings.registerEmbeddingsProvider(extension, embeddingsModel, provider);
            },
            async computeEmbeddings(embeddingsModel, input, token) {
                checkProposedApiEnabled(extension, 'embeddings');
                if (typeof input === 'string') {
                    return extHostEmbeddings.computeEmbeddings(embeddingsModel, input, token);
                }
                else {
                    return extHostEmbeddings.computeEmbeddings(embeddingsModel, input, token);
                }
            },
            registerTool(name, tool) {
                return extHostLanguageModelTools.registerTool(extension, name, tool);
            },
            invokeTool(name, parameters, token) {
                return extHostLanguageModelTools.invokeTool(extension, name, parameters, token);
            },
            get tools() {
                return extHostLanguageModelTools.getTools(extension);
            },
            fileIsIgnored(uri, token) {
                return extHostLanguageModels.fileIsIgnored(extension, uri, token);
            },
            registerIgnoredFileProvider(provider) {
                return extHostLanguageModels.registerIgnoredFileProvider(extension, provider);
            },
            registerMcpConfigurationProvider(id, provider) {
                checkProposedApiEnabled(extension, 'mcpConfigurationProvider');
                return extHostMcp.registerMcpConfigurationProvider(extension, id, provider);
            },
        };
        // namespace: speech
        const speech = {
            registerSpeechProvider(id, provider) {
                checkProposedApiEnabled(extension, 'speech');
                return extHostSpeech.registerProvider(extension.identifier, id, provider);
            },
        };
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            version: initData.version,
            // namespaces
            ai,
            authentication,
            commands,
            comments,
            chat,
            debug,
            env,
            extensions,
            interactive,
            l10n,
            languages,
            lm,
            notebooks,
            scm,
            speech,
            tasks,
            tests,
            window,
            workspace,
            // types
            Breakpoint: extHostTypes.Breakpoint,
            TerminalOutputAnchor: extHostTypes.TerminalOutputAnchor,
            ChatResultFeedbackKind: extHostTypes.ChatResultFeedbackKind,
            ChatVariableLevel: extHostTypes.ChatVariableLevel,
            ChatCompletionItem: extHostTypes.ChatCompletionItem,
            ChatReferenceDiagnostic: extHostTypes.ChatReferenceDiagnostic,
            CallHierarchyIncomingCall: extHostTypes.CallHierarchyIncomingCall,
            CallHierarchyItem: extHostTypes.CallHierarchyItem,
            CallHierarchyOutgoingCall: extHostTypes.CallHierarchyOutgoingCall,
            CancellationError: errors.CancellationError,
            CancellationTokenSource: CancellationTokenSource,
            CandidatePortSource: CandidatePortSource,
            CodeAction: extHostTypes.CodeAction,
            CodeActionKind: extHostTypes.CodeActionKind,
            CodeActionTriggerKind: extHostTypes.CodeActionTriggerKind,
            CodeLens: extHostTypes.CodeLens,
            Color: extHostTypes.Color,
            ColorInformation: extHostTypes.ColorInformation,
            ColorPresentation: extHostTypes.ColorPresentation,
            ColorThemeKind: extHostTypes.ColorThemeKind,
            CommentMode: extHostTypes.CommentMode,
            CommentState: extHostTypes.CommentState,
            CommentThreadCollapsibleState: extHostTypes.CommentThreadCollapsibleState,
            CommentThreadState: extHostTypes.CommentThreadState,
            CommentThreadApplicability: extHostTypes.CommentThreadApplicability,
            CommentThreadFocus: extHostTypes.CommentThreadFocus,
            CompletionItem: extHostTypes.CompletionItem,
            CompletionItemKind: extHostTypes.CompletionItemKind,
            CompletionItemTag: extHostTypes.CompletionItemTag,
            CompletionList: extHostTypes.CompletionList,
            CompletionTriggerKind: extHostTypes.CompletionTriggerKind,
            ConfigurationTarget: extHostTypes.ConfigurationTarget,
            CustomExecution: extHostTypes.CustomExecution,
            DebugAdapterExecutable: extHostTypes.DebugAdapterExecutable,
            DebugAdapterInlineImplementation: extHostTypes.DebugAdapterInlineImplementation,
            DebugAdapterNamedPipeServer: extHostTypes.DebugAdapterNamedPipeServer,
            DebugAdapterServer: extHostTypes.DebugAdapterServer,
            DebugConfigurationProviderTriggerKind: DebugConfigurationProviderTriggerKind,
            DebugConsoleMode: extHostTypes.DebugConsoleMode,
            DebugVisualization: extHostTypes.DebugVisualization,
            DecorationRangeBehavior: extHostTypes.DecorationRangeBehavior,
            Diagnostic: extHostTypes.Diagnostic,
            DiagnosticRelatedInformation: extHostTypes.DiagnosticRelatedInformation,
            DiagnosticSeverity: extHostTypes.DiagnosticSeverity,
            DiagnosticTag: extHostTypes.DiagnosticTag,
            Disposable: extHostTypes.Disposable,
            DocumentHighlight: extHostTypes.DocumentHighlight,
            DocumentHighlightKind: extHostTypes.DocumentHighlightKind,
            MultiDocumentHighlight: extHostTypes.MultiDocumentHighlight,
            DocumentLink: extHostTypes.DocumentLink,
            DocumentSymbol: extHostTypes.DocumentSymbol,
            EndOfLine: extHostTypes.EndOfLine,
            EnvironmentVariableMutatorType: extHostTypes.EnvironmentVariableMutatorType,
            EvaluatableExpression: extHostTypes.EvaluatableExpression,
            InlineValueText: extHostTypes.InlineValueText,
            InlineValueVariableLookup: extHostTypes.InlineValueVariableLookup,
            InlineValueEvaluatableExpression: extHostTypes.InlineValueEvaluatableExpression,
            InlineCompletionTriggerKind: extHostTypes.InlineCompletionTriggerKind,
            EventEmitter: Emitter,
            ExtensionKind: extHostTypes.ExtensionKind,
            ExtensionMode: extHostTypes.ExtensionMode,
            ExternalUriOpenerPriority: extHostTypes.ExternalUriOpenerPriority,
            FileChangeType: extHostTypes.FileChangeType,
            FileDecoration: extHostTypes.FileDecoration,
            FileDecoration2: extHostTypes.FileDecoration,
            FileSystemError: extHostTypes.FileSystemError,
            FileType: files.FileType,
            FilePermission: files.FilePermission,
            FoldingRange: extHostTypes.FoldingRange,
            FoldingRangeKind: extHostTypes.FoldingRangeKind,
            FunctionBreakpoint: extHostTypes.FunctionBreakpoint,
            InlineCompletionItem: extHostTypes.InlineSuggestion,
            InlineCompletionList: extHostTypes.InlineSuggestionList,
            Hover: extHostTypes.Hover,
            VerboseHover: extHostTypes.VerboseHover,
            HoverVerbosityAction: extHostTypes.HoverVerbosityAction,
            IndentAction: languageConfiguration.IndentAction,
            Location: extHostTypes.Location,
            MarkdownString: extHostTypes.MarkdownString,
            OverviewRulerLane: OverviewRulerLane,
            ParameterInformation: extHostTypes.ParameterInformation,
            PortAutoForwardAction: extHostTypes.PortAutoForwardAction,
            Position: extHostTypes.Position,
            ProcessExecution: extHostTypes.ProcessExecution,
            ProgressLocation: extHostTypes.ProgressLocation,
            QuickInputButtonLocation: extHostTypes.QuickInputButtonLocation,
            QuickInputButtons: extHostTypes.QuickInputButtons,
            Range: extHostTypes.Range,
            RelativePattern: extHostTypes.RelativePattern,
            Selection: extHostTypes.Selection,
            SelectionRange: extHostTypes.SelectionRange,
            SemanticTokens: extHostTypes.SemanticTokens,
            SemanticTokensBuilder: extHostTypes.SemanticTokensBuilder,
            SemanticTokensEdit: extHostTypes.SemanticTokensEdit,
            SemanticTokensEdits: extHostTypes.SemanticTokensEdits,
            SemanticTokensLegend: extHostTypes.SemanticTokensLegend,
            ShellExecution: extHostTypes.ShellExecution,
            ShellQuoting: extHostTypes.ShellQuoting,
            SignatureHelp: extHostTypes.SignatureHelp,
            SignatureHelpTriggerKind: extHostTypes.SignatureHelpTriggerKind,
            SignatureInformation: extHostTypes.SignatureInformation,
            SnippetString: extHostTypes.SnippetString,
            SourceBreakpoint: extHostTypes.SourceBreakpoint,
            StandardTokenType: extHostTypes.StandardTokenType,
            StatusBarAlignment: extHostTypes.StatusBarAlignment,
            SymbolInformation: extHostTypes.SymbolInformation,
            SymbolKind: extHostTypes.SymbolKind,
            SymbolTag: extHostTypes.SymbolTag,
            Task: extHostTypes.Task,
            TaskEventKind: extHostTypes.TaskEventKind,
            TaskGroup: extHostTypes.TaskGroup,
            TaskPanelKind: extHostTypes.TaskPanelKind,
            TaskRevealKind: extHostTypes.TaskRevealKind,
            TaskScope: extHostTypes.TaskScope,
            TerminalLink: extHostTypes.TerminalLink,
            TerminalQuickFixTerminalCommand: extHostTypes.TerminalQuickFixCommand,
            TerminalQuickFixOpener: extHostTypes.TerminalQuickFixOpener,
            TerminalLocation: extHostTypes.TerminalLocation,
            TerminalProfile: extHostTypes.TerminalProfile,
            TerminalExitReason: extHostTypes.TerminalExitReason,
            TerminalShellExecutionCommandLineConfidence: extHostTypes.TerminalShellExecutionCommandLineConfidence,
            TerminalCompletionItem: extHostTypes.TerminalCompletionItem,
            TerminalCompletionItemKind: extHostTypes.TerminalCompletionItemKind,
            TerminalCompletionList: extHostTypes.TerminalCompletionList,
            TerminalShellType: extHostTypes.TerminalShellType,
            TextDocumentSaveReason: extHostTypes.TextDocumentSaveReason,
            TextEdit: extHostTypes.TextEdit,
            SnippetTextEdit: extHostTypes.SnippetTextEdit,
            TextEditorCursorStyle: TextEditorCursorStyle,
            TextEditorChangeKind: extHostTypes.TextEditorChangeKind,
            TextEditorLineNumbersStyle: extHostTypes.TextEditorLineNumbersStyle,
            TextEditorRevealType: extHostTypes.TextEditorRevealType,
            TextEditorSelectionChangeKind: extHostTypes.TextEditorSelectionChangeKind,
            SyntaxTokenType: extHostTypes.SyntaxTokenType,
            TextDocumentChangeReason: extHostTypes.TextDocumentChangeReason,
            ThemeColor: extHostTypes.ThemeColor,
            ThemeIcon: extHostTypes.ThemeIcon,
            TreeItem: extHostTypes.TreeItem,
            TreeItemCheckboxState: extHostTypes.TreeItemCheckboxState,
            TreeItemCollapsibleState: extHostTypes.TreeItemCollapsibleState,
            TypeHierarchyItem: extHostTypes.TypeHierarchyItem,
            UIKind: UIKind,
            Uri: URI,
            ViewColumn: extHostTypes.ViewColumn,
            WorkspaceEdit: extHostTypes.WorkspaceEdit,
            // proposed api types
            DocumentPasteTriggerKind: extHostTypes.DocumentPasteTriggerKind,
            DocumentDropEdit: extHostTypes.DocumentDropEdit,
            DocumentDropOrPasteEditKind: extHostTypes.DocumentDropOrPasteEditKind,
            DocumentPasteEdit: extHostTypes.DocumentPasteEdit,
            InlayHint: extHostTypes.InlayHint,
            InlayHintLabelPart: extHostTypes.InlayHintLabelPart,
            InlayHintKind: extHostTypes.InlayHintKind,
            RemoteAuthorityResolverError: extHostTypes.RemoteAuthorityResolverError,
            ResolvedAuthority: extHostTypes.ResolvedAuthority,
            ManagedResolvedAuthority: extHostTypes.ManagedResolvedAuthority,
            SourceControlInputBoxValidationType: extHostTypes.SourceControlInputBoxValidationType,
            ExtensionRuntime: extHostTypes.ExtensionRuntime,
            TimelineItem: extHostTypes.TimelineItem,
            NotebookRange: extHostTypes.NotebookRange,
            NotebookCellKind: extHostTypes.NotebookCellKind,
            NotebookCellExecutionState: extHostTypes.NotebookCellExecutionState,
            NotebookCellData: extHostTypes.NotebookCellData,
            NotebookData: extHostTypes.NotebookData,
            NotebookRendererScript: extHostTypes.NotebookRendererScript,
            NotebookCellStatusBarAlignment: extHostTypes.NotebookCellStatusBarAlignment,
            NotebookEditorRevealType: extHostTypes.NotebookEditorRevealType,
            NotebookCellOutput: extHostTypes.NotebookCellOutput,
            NotebookCellOutputItem: extHostTypes.NotebookCellOutputItem,
            CellErrorStackFrame: extHostTypes.CellErrorStackFrame,
            NotebookCellStatusBarItem: extHostTypes.NotebookCellStatusBarItem,
            NotebookControllerAffinity: extHostTypes.NotebookControllerAffinity,
            NotebookControllerAffinity2: extHostTypes.NotebookControllerAffinity2,
            NotebookEdit: extHostTypes.NotebookEdit,
            NotebookKernelSourceAction: extHostTypes.NotebookKernelSourceAction,
            NotebookVariablesRequestKind: extHostTypes.NotebookVariablesRequestKind,
            PortAttributes: extHostTypes.PortAttributes,
            LinkedEditingRanges: extHostTypes.LinkedEditingRanges,
            TestResultState: extHostTypes.TestResultState,
            TestRunRequest: extHostTypes.TestRunRequest,
            TestMessage: extHostTypes.TestMessage,
            TestMessageStackFrame: extHostTypes.TestMessageStackFrame,
            TestTag: extHostTypes.TestTag,
            TestRunProfileKind: extHostTypes.TestRunProfileKind,
            TextSearchCompleteMessageType: TextSearchCompleteMessageType,
            DataTransfer: extHostTypes.DataTransfer,
            DataTransferItem: extHostTypes.DataTransferItem,
            TestCoverageCount: extHostTypes.TestCoverageCount,
            FileCoverage: extHostTypes.FileCoverage,
            StatementCoverage: extHostTypes.StatementCoverage,
            BranchCoverage: extHostTypes.BranchCoverage,
            DeclarationCoverage: extHostTypes.DeclarationCoverage,
            WorkspaceTrustState: extHostTypes.WorkspaceTrustState,
            LanguageStatusSeverity: extHostTypes.LanguageStatusSeverity,
            QuickPickItemKind: extHostTypes.QuickPickItemKind,
            InputBoxValidationSeverity: extHostTypes.InputBoxValidationSeverity,
            TabInputText: extHostTypes.TextTabInput,
            TabInputTextDiff: extHostTypes.TextDiffTabInput,
            TabInputTextMerge: extHostTypes.TextMergeTabInput,
            TabInputCustom: extHostTypes.CustomEditorTabInput,
            TabInputNotebook: extHostTypes.NotebookEditorTabInput,
            TabInputNotebookDiff: extHostTypes.NotebookDiffEditorTabInput,
            TabInputWebview: extHostTypes.WebviewEditorTabInput,
            TabInputTerminal: extHostTypes.TerminalEditorTabInput,
            TabInputInteractiveWindow: extHostTypes.InteractiveWindowInput,
            TabInputChat: extHostTypes.ChatEditorTabInput,
            TabInputTextMultiDiff: extHostTypes.TextMultiDiffTabInput,
            TelemetryTrustedValue: TelemetryTrustedValue,
            LogLevel: LogLevel,
            EditSessionIdentityMatch: EditSessionIdentityMatch,
            InteractiveSessionVoteDirection: extHostTypes.InteractiveSessionVoteDirection,
            ChatCopyKind: extHostTypes.ChatCopyKind,
            ChatEditingSessionActionOutcome: extHostTypes.ChatEditingSessionActionOutcome,
            InteractiveEditorResponseFeedbackKind: extHostTypes.InteractiveEditorResponseFeedbackKind,
            DebugStackFrame: extHostTypes.DebugStackFrame,
            DebugThread: extHostTypes.DebugThread,
            RelatedInformationType: extHostTypes.RelatedInformationType,
            SpeechToTextStatus: extHostTypes.SpeechToTextStatus,
            TextToSpeechStatus: extHostTypes.TextToSpeechStatus,
            PartialAcceptTriggerKind: extHostTypes.PartialAcceptTriggerKind,
            KeywordRecognitionStatus: extHostTypes.KeywordRecognitionStatus,
            ChatResponseMarkdownPart: extHostTypes.ChatResponseMarkdownPart,
            ChatResponseFileTreePart: extHostTypes.ChatResponseFileTreePart,
            ChatResponseAnchorPart: extHostTypes.ChatResponseAnchorPart,
            ChatResponseProgressPart: extHostTypes.ChatResponseProgressPart,
            ChatResponseProgressPart2: extHostTypes.ChatResponseProgressPart2,
            ChatResponseReferencePart: extHostTypes.ChatResponseReferencePart,
            ChatResponseReferencePart2: extHostTypes.ChatResponseReferencePart,
            ChatResponseCodeCitationPart: extHostTypes.ChatResponseCodeCitationPart,
            ChatResponseCodeblockUriPart: extHostTypes.ChatResponseCodeblockUriPart,
            ChatResponseWarningPart: extHostTypes.ChatResponseWarningPart,
            ChatResponseTextEditPart: extHostTypes.ChatResponseTextEditPart,
            ChatResponseNotebookEditPart: extHostTypes.ChatResponseNotebookEditPart,
            ChatResponseMarkdownWithVulnerabilitiesPart: extHostTypes.ChatResponseMarkdownWithVulnerabilitiesPart,
            ChatResponseCommandButtonPart: extHostTypes.ChatResponseCommandButtonPart,
            ChatResponseConfirmationPart: extHostTypes.ChatResponseConfirmationPart,
            ChatResponseMovePart: extHostTypes.ChatResponseMovePart,
            ChatResponseReferencePartStatusKind: extHostTypes.ChatResponseReferencePartStatusKind,
            ChatRequestTurn: extHostTypes.ChatRequestTurn,
            ChatResponseTurn: extHostTypes.ChatResponseTurn,
            ChatLocation: extHostTypes.ChatLocation,
            ChatRequestEditorData: extHostTypes.ChatRequestEditorData,
            ChatRequestNotebookData: extHostTypes.ChatRequestNotebookData,
            ChatReferenceBinaryData: extHostTypes.ChatReferenceBinaryData,
            LanguageModelChatMessageRole: extHostTypes.LanguageModelChatMessageRole,
            LanguageModelChatMessage: extHostTypes.LanguageModelChatMessage,
            LanguageModelChatMessage2: extHostTypes.LanguageModelChatMessage2,
            LanguageModelToolResultPart: extHostTypes.LanguageModelToolResultPart,
            LanguageModelTextPart: extHostTypes.LanguageModelTextPart,
            LanguageModelToolCallPart: extHostTypes.LanguageModelToolCallPart,
            LanguageModelError: extHostTypes.LanguageModelError,
            LanguageModelToolResult: extHostTypes.LanguageModelToolResult,
            LanguageModelDataPart: extHostTypes.LanguageModelDataPart,
            ChatImageMimeType: extHostTypes.ChatImageMimeType,
            ExtendedLanguageModelToolResult: extHostTypes.ExtendedLanguageModelToolResult,
            PreparedTerminalToolInvocation: extHostTypes.PreparedTerminalToolInvocation,
            LanguageModelChatToolMode: extHostTypes.LanguageModelChatToolMode,
            LanguageModelPromptTsxPart: extHostTypes.LanguageModelPromptTsxPart,
            NewSymbolName: extHostTypes.NewSymbolName,
            NewSymbolNameTag: extHostTypes.NewSymbolNameTag,
            NewSymbolNameTriggerKind: extHostTypes.NewSymbolNameTriggerKind,
            InlineEdit: extHostTypes.InlineEdit,
            InlineEditTriggerKind: extHostTypes.InlineEditTriggerKind,
            ExcludeSettingOptions: ExcludeSettingOptions,
            TextSearchContext2: TextSearchContext2,
            TextSearchMatch2: TextSearchMatch2,
            TextSearchCompleteMessageTypeNew: TextSearchCompleteMessageType,
            ChatErrorLevel: extHostTypes.ChatErrorLevel,
            McpSSEServerDefinition: extHostTypes.McpSSEServerDefinition,
            McpStdioServerDefinition: extHostTypes.McpStdioServerDefinition,
        };
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC5hcGkuaW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdC5hcGkuaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RSxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdEYsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BGLE9BQU8sS0FBSyxxQkFBcUIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sY0FBYyxFQUNkLHNCQUFzQixHQUV0QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sS0FBSyxLQUFLLE1BQU0seUNBQXlDLENBQUE7QUFFaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTNGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRixPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLG9CQUFvQixHQUNwQixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFDTixxQkFBcUIsRUFDckIsNkJBQTZCLEVBQzdCLGtCQUFrQixFQUNsQixnQkFBZ0IsR0FDaEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGNBQWMsRUFFZCxXQUFXLEdBQ1gsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUM1RCxPQUFPLEVBQXlCLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDL0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3BELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3pELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sNkJBQTZCLEdBRTdCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDaEUsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDcEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDMUQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDbkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDckQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQy9DLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDakUsT0FBTyxLQUFLLGNBQWMsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RCxPQUFPLEtBQUssWUFBWSxNQUFNLG1CQUFtQixDQUFBO0FBQ2pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDckQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBZXpEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGlDQUFpQyxDQUNoRCxRQUEwQjtJQUUxQixXQUFXO0lBQ1gsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO0lBQ3RELE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0lBQ2xFLE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO0lBQzFFLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0lBQy9ELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3hELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3hELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQ2hFLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtJQUMzRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDcEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNwRCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtJQUNsRSxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDekQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ25ELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQ2hFLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO0lBQ3pFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDbEQsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFDNUQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDMUQsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7SUFDbEUsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7SUFDbEUsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7SUFDbEUsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBRW5ELGlDQUFpQztJQUNqQyxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO0lBQzVFLFdBQVcsQ0FBQyxHQUFHLENBQ2QsY0FBYyxDQUFDLDJCQUEyQixFQUNQLG9CQUFxQixDQUN4RCxDQUFBO0lBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUNsRSxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0lBQzFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDekUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQzlELFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLENBQUE7SUFDMUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQzVELFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLGtCQUFrQixDQUFDLENBQUE7SUFDdEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUNsRSxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3BFLFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLHFCQUFxQixFQUFFLHFCQUFxQixDQUFDLENBQUE7SUFDNUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMscUJBQXFCLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtJQUM1RSxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO0lBRTFFLDBEQUEwRDtJQUMxRCxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3pDLGNBQWMsQ0FBQyxrQkFBa0IsRUFDakMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUNqQyxDQUFBO0lBQ0QsTUFBTSwwQkFBMEIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNqRCxjQUFjLENBQUMsMEJBQTBCLEVBQ3pDLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FDekMsQ0FBQTtJQUNELE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3RDLGNBQWMsQ0FBQyxlQUFlLEVBQzlCLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FDOUIsQ0FBQTtJQUNELE1BQU0sc0JBQXNCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDN0MsY0FBYyxDQUFDLHNCQUFzQixFQUNyQyxRQUFRLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQ3JDLENBQUE7SUFDRCxNQUFNLCtCQUErQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3RELGNBQWMsQ0FBQywrQkFBK0IsRUFDOUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUM5QyxDQUFBO0lBQ0QsTUFBTSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMxQyxjQUFjLENBQUMsbUJBQW1CLEVBQ2xDLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FDbEMsQ0FBQTtJQUNELE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7SUFDakcsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtJQUMzRixNQUFNLG9CQUFvQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzNDLGNBQWMsQ0FBQyxvQkFBb0IsRUFDbkMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUNuQyxDQUFBO0lBQ0QsTUFBTSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMxQyxjQUFjLENBQUMsbUJBQW1CLEVBQ2xDLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FDekMsQ0FBQTtJQUVELHFEQUFxRDtJQUNyRCxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUM3RixNQUFNLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3ZDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDL0IsSUFBSSxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsMEJBQTBCLENBQUMsQ0FDN0QsQ0FBQTtJQUNELE1BQU0sK0JBQStCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDdEQsY0FBYyxDQUFDLCtCQUErQixFQUM5QyxJQUFJLDhCQUE4QixDQUFDLFdBQVcsRUFBRSwwQkFBMEIsRUFBRSxpQkFBaUIsQ0FBQyxDQUM5RixDQUFBO0lBQ0QsTUFBTSw4QkFBOEIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNyRCxjQUFjLENBQUMsOEJBQThCLEVBQzdDLElBQUksOEJBQThCLENBQ2pDLGlCQUFpQixFQUNqQixnQkFBZ0IsRUFDaEIsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FDckQsQ0FDRCxDQUFBO0lBQ0QsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDdEMsY0FBYyxDQUFDLGVBQWUsRUFDOUIsSUFBSSx5QkFBeUIsQ0FDNUIsV0FBVyxFQUNYLGVBQWUsRUFDZiwwQkFBMEIsRUFDMUIsZ0JBQWdCLEVBQ2hCLHlCQUF5QixFQUN6QixhQUFhLEVBQ2IsaUJBQWlCLENBQ2pCLENBQ0QsQ0FBQTtJQUNELE1BQU0sd0JBQXdCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDL0MsY0FBYyxDQUFDLHdCQUF3QixFQUN2QyxJQUFJLHdCQUF3QixDQUFDLGVBQWUsQ0FBQyxDQUM3QyxDQUFBO0lBQ0QsTUFBTSxzQkFBc0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM3QyxjQUFjLENBQUMsc0JBQXNCLEVBQ3JDLElBQUksc0JBQXNCLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLENBQzlELENBQUE7SUFDRCxNQUFNLHNCQUFzQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzdDLGNBQWMsQ0FBQyxzQkFBc0IsRUFDckMsSUFBSSxzQkFBc0IsQ0FDekIsV0FBVyxFQUNYLFFBQVEsRUFDUixlQUFlLEVBQ2YsZUFBZSxFQUNmLGlCQUFpQixDQUNqQixDQUNELENBQUE7SUFDRCxNQUFNLHdCQUF3QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQy9DLGNBQWMsQ0FBQyx3QkFBd0IsRUFDdkMsSUFBSSx3QkFBd0IsQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLENBQzFELENBQUE7SUFDRCxNQUFNLHNDQUFzQyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzdELGNBQWMsQ0FBQyxzQ0FBc0MsRUFDckQsSUFBSSxzQ0FBc0MsQ0FDekMsaUJBQWlCLEVBQ2pCLGVBQWUsRUFDZixXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUNyRCxDQUNELENBQUE7SUFDRCxNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNyQyxjQUFjLENBQUMsY0FBYyxFQUM3QixJQUFJLGNBQWMsQ0FBQyxXQUFXLEVBQUUsMEJBQTBCLENBQUMsQ0FDM0QsQ0FBQTtJQUNELE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDdkMsY0FBYyxDQUFDLGdCQUFnQixFQUMvQixJQUFJLGdCQUFnQixDQUNuQixXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUNyRCxlQUFlLEVBQ2YsaUJBQWlCLENBQ2pCLENBQ0QsQ0FBQTtJQUNELE1BQU0sbUJBQW1CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDMUMsY0FBYyxDQUFDLG1CQUFtQixFQUNsQyxJQUFJLG1CQUFtQixDQUN0QixXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxFQUN4RCxjQUFjLEVBQ2QsUUFBUSxDQUFDLE1BQU0sQ0FDZixDQUNELENBQUE7SUFDRCxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3pDLGNBQWMsQ0FBQyxrQkFBa0IsRUFDakMsSUFBSSxrQkFBa0IsQ0FDckIsV0FBVyxFQUNYLGlCQUFpQixFQUNqQixxQkFBcUIsRUFDckIsMEJBQTBCLENBQzFCLENBQ0QsQ0FBQTtJQUNELE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDdkMsY0FBYyxDQUFDLGdCQUFnQixFQUMvQixJQUFJLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUM5RixDQUFBO0lBQ0QsTUFBTSx1QkFBdUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM5QyxjQUFjLENBQUMsdUJBQXVCLEVBQ3RDLElBQUksdUJBQXVCLENBQzFCLFdBQVcsRUFDWCxjQUFjLEVBQ2QsZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZixrQkFBa0IsRUFDbEIsaUJBQWlCLEVBQ2pCLHFCQUFxQixFQUNyQixnQkFBZ0IsQ0FDaEIsQ0FDRCxDQUFBO0lBQ0QsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUN4QyxjQUFjLENBQUMsaUJBQWlCLEVBQ2hDLElBQUksaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQ2xDLENBQUE7SUFDRCxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3hDLGNBQWMsQ0FBQyxpQkFBaUIsRUFDaEMsSUFBSSxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsdUJBQXVCLENBQUMsQ0FDM0QsQ0FBQTtJQUNELE1BQU0sc0JBQXNCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDN0MsY0FBYyxDQUFDLDZCQUE2QixFQUM1QyxJQUFJLDZCQUE2QixDQUFDLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSwwQkFBMEIsQ0FBQyxDQUM3RixDQUFBO0lBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUN2QyxjQUFjLENBQUMsZ0JBQWdCLEVBQy9CLHNCQUFzQixDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLENBQUMsQ0FDdEUsQ0FBQTtJQUNELE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ2pDLGNBQWMsQ0FBQyxVQUFVLEVBQ3pCLElBQUksVUFBVSxDQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsQ0FDakYsQ0FBQTtJQUNELE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDdkMsY0FBYyxDQUFDLGdCQUFnQixFQUMvQixJQUFJLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FDakQsQ0FBQTtJQUNELE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ25DLGNBQWMsQ0FBQyxZQUFZLEVBQzNCLElBQUksWUFBWSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FDN0MsQ0FBQTtJQUNELE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3JDLGNBQWMsQ0FBQyxlQUFlLEVBQzlCLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsQ0FDckUsQ0FBQTtJQUNELE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3RDLGNBQWMsQ0FBQyxlQUFlLEVBQzlCLElBQUksZUFBZSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FDekUsQ0FBQTtJQUNELE1BQU0sbUJBQW1CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDMUMsY0FBYyxDQUFDLG1CQUFtQixFQUNsQyxJQUFJLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUNwQyxDQUFBO0lBQ0QsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDckMsY0FBYyxDQUFDLGNBQWMsRUFDN0IsSUFBSSxjQUFjLENBQUMsV0FBVyxDQUFDLENBQy9CLENBQUE7SUFDRCxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUN0QyxjQUFjLENBQUMsZUFBZSxFQUM5QixJQUFJLGVBQWUsQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLENBQ2pELENBQUE7SUFDRCxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUN0QyxjQUFjLENBQUMsZUFBZSxFQUM5QixJQUFJLGVBQWUsQ0FDbEIsV0FBVyxFQUNYLFFBQVEsQ0FBQyxNQUFNLEVBQ2YsZ0JBQWdCLEVBQ2hCLGlCQUFpQixFQUNqQixxQkFBcUIsQ0FDckIsQ0FDRCxDQUFBO0lBQ0QsTUFBTSxvQkFBb0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQyxjQUFjLENBQUMsb0JBQW9CLEVBQ25DLElBQUksb0JBQW9CLENBQUMsV0FBVyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUN4RSxDQUFBO0lBQ0QsTUFBTSxvQkFBb0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQyxjQUFjLENBQUMsb0JBQW9CLEVBQ25DLElBQUksb0JBQW9CLENBQ3ZCLFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIscUJBQXFCLEVBQ3JCLGVBQWUsRUFDZixvQkFBb0IsQ0FDcEIsQ0FDRCxDQUFBO0lBQ0QsTUFBTSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMxQyxjQUFjLENBQUMsbUJBQW1CLEVBQ2xDLElBQUksbUJBQW1CLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUNyRCxDQUFBO0lBQ0QsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDckMsY0FBYyxDQUFDLGNBQWMsRUFDN0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FDN0IsQ0FBQTtJQUNELE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDeEMsY0FBYyxDQUFDLGlCQUFpQixFQUNoQyxJQUFJLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUNsQyxDQUFBO0lBQ0QsTUFBTSw2QkFBNkIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNwRCxjQUFjLENBQUMsNkJBQTZCLEVBQzVDLElBQUksNkJBQTZCLENBQUMsV0FBVyxDQUFDLENBQzlDLENBQUE7SUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLGNBQWMsQ0FBQyxrQkFBa0IsRUFDakMsSUFBSSxrQkFBa0IsQ0FDckIsV0FBVyxFQUNYLGVBQWUsRUFDZiwwQkFBMEIsRUFDMUIsZUFBZSxFQUNmLGlCQUFpQixDQUNqQixDQUNELENBQUE7SUFDRCxNQUFNLHlCQUF5QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ2hELGNBQWMsQ0FBQyx5QkFBeUIsRUFDeEMsSUFBSSx5QkFBeUIsQ0FBQyxXQUFXLEVBQUUscUJBQXFCLENBQUMsQ0FDakUsQ0FBQTtJQUNELE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDekMsY0FBYyxDQUFDLGtCQUFrQixFQUNqQyxJQUFJLGtCQUFrQixDQUNyQixXQUFXLEVBQ1gsaUJBQWlCLEVBQ2pCLGVBQWUsRUFDZixnQkFBZ0IsRUFDaEIscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQix5QkFBeUIsQ0FDekIsQ0FDRCxDQUFBO0lBQ0QsTUFBTSwyQkFBMkIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNsRCxjQUFjLENBQUMsMkJBQTJCLEVBQzFDLElBQUkseUJBQXlCLENBQUMsV0FBVyxDQUFDLENBQzFDLENBQUE7SUFDRCxNQUFNLHdCQUF3QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQy9DLGNBQWMsQ0FBQyx3QkFBd0IsRUFDdkMsSUFBSSx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsQ0FDekMsQ0FBQTtJQUNELE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDdkMsY0FBYyxDQUFDLGdCQUFnQixFQUMvQixJQUFJLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxlQUFlLENBQUMsU0FBUyxDQUFDLENBQzVELENBQUE7SUFDRCxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNwQyxjQUFjLENBQUMsYUFBYSxFQUM1QixJQUFJLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FDOUIsQ0FBQTtJQUNELE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDeEMsY0FBYyxDQUFDLGlCQUFpQixFQUNoQyxJQUFJLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUNsQyxDQUFBO0lBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO0lBRTVFLDRDQUE0QztJQUM1QyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUF1QixjQUFjLENBQUMsQ0FBQTtJQUNwRSxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7SUFFdEMsa0JBQWtCO0lBQ2xCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtJQUN0RixNQUFNLGdCQUFnQixHQUFHLElBQUksZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDMUQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3ZGLE1BQU0sY0FBYyxHQUFHLElBQUksY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ3RELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUU1RCw0QkFBNEI7SUFDNUIsa0JBQWtCLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBRTVDLE9BQU8sVUFDTixTQUFnQyxFQUNoQyxhQUFtQyxFQUNuQyxjQUFxQztRQUVyQyx3RkFBd0Y7UUFDeEYseUZBQXlGO1FBQ3pGLDRCQUE0QjtRQUM1QixTQUFTLGlCQUFpQixDQUFJLE1BQXVCO1lBQ3BELE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxFQUFFO2dCQUMxQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDM0IsSUFBSSxDQUFDO3dCQUNKLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO29CQUMzQixDQUFDO29CQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7d0JBQ2QsTUFBTSxDQUFDLHlCQUF5QixDQUMvQixJQUFJLGNBQWMsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSx3QkFBd0IsQ0FBQyxDQUN2RSxDQUFBO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7Z0JBQ0YsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDekIsT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDLENBQUE7UUFDRixDQUFDO1FBRUQsMEZBQTBGO1FBQzFGLDRGQUE0RjtRQUM1RixxR0FBcUc7UUFDckcsK0ZBQStGO1FBQy9GLCtEQUErRDtRQUMvRCxNQUFNLGFBQWEsR0FBRyxDQUFDO1lBQ3RCLElBQUksSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFBO1lBQ3hDLFNBQVMsVUFBVTtnQkFDbEIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNYLGlCQUFpQixDQUFDLElBQUksQ0FDckIsY0FBYyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssa0hBQWtILENBQzFKLENBQUE7b0JBQ0QsSUFBSSxHQUFHLElBQUksQ0FBQTtnQkFDWixDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sU0FBUyxPQUFPLENBQUMsUUFBaUM7Z0JBQ3hELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO29CQUM3QixRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUMxQixDQUFDO3FCQUFNLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3pDLFVBQVUsRUFBRSxDQUFBO2dCQUNiLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLE1BQU0sR0FBRyxRQUFpQyxDQUFBLENBQUMsbUNBQW1DO29CQUNwRixJQUFJLE9BQU8sTUFBTSxDQUFDLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQzt3QkFDMUMsVUFBVSxFQUFFLENBQUE7b0JBQ2IsQ0FBQztvQkFDRCxJQUFJLE9BQU8sTUFBTSxDQUFDLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQzt3QkFDM0MsdUJBQXVCLENBQUMsU0FBUyxFQUFFLDBCQUEwQixDQUFDLENBQUE7b0JBQy9ELENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLFFBQVEsQ0FBQTtZQUNoQixDQUFDLENBQUE7UUFDRixDQUFDLENBQUMsRUFBRSxDQUFBO1FBRUosTUFBTSxjQUFjLEdBQWlDO1lBQ3BELFVBQVUsQ0FDVCxVQUFrQixFQUNsQixNQUF5QixFQUN6QixPQUFnRDtnQkFFaEQsSUFDQyxDQUFDLE9BQU8sT0FBTyxFQUFFLGVBQWUsS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUM7b0JBQ25GLENBQUMsT0FBTyxPQUFPLEVBQUUsWUFBWSxLQUFLLFFBQVEsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxFQUM1RSxDQUFDO29CQUNGLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQTtnQkFDcEQsQ0FBQztnQkFDRCxPQUFPLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxPQUFjLENBQUMsQ0FBQTtZQUN2RixDQUFDO1lBQ0QsV0FBVyxDQUFDLFVBQWtCO2dCQUM3QixPQUFPLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUNyRCxDQUFDO1lBQ0QsNkRBQTZEO1lBQzdELEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBa0IsRUFBRSxNQUF5QjtnQkFDN0QsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUNqRCxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFO29CQUMvRSxNQUFNLEVBQUUsSUFBSTtpQkFDTCxDQUFDLENBQUMsQ0FBQTtZQUNYLENBQUM7WUFDRCxJQUFJLG1CQUFtQjtnQkFDdEIsT0FBTyxpQkFBaUIsQ0FDdkIscUJBQXFCLENBQUMsK0JBQStCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FDakYsQ0FBQTtZQUNGLENBQUM7WUFDRCw4QkFBOEIsQ0FDN0IsRUFBVSxFQUNWLEtBQWEsRUFDYixRQUF1QyxFQUN2QyxPQUE4QztnQkFFOUMsT0FBTyxxQkFBcUIsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUMxRixDQUFDO1NBQ0QsQ0FBQTtRQUVELHNCQUFzQjtRQUN0QixNQUFNLFFBQVEsR0FBMkI7WUFDeEMsZUFBZSxDQUNkLEVBQVUsRUFDVixPQUErQyxFQUMvQyxRQUFjO2dCQUVkLE9BQU8sZUFBZSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzFGLENBQUM7WUFDRCx5QkFBeUIsQ0FDeEIsRUFBVSxFQUNWLFFBSVMsRUFDVCxPQUFhO2dCQUViLE9BQU8sZUFBZSxDQUFDLGVBQWUsQ0FDckMsSUFBSSxFQUNKLEVBQUUsRUFDRixDQUFDLEdBQUcsSUFBVyxFQUFPLEVBQUU7b0JBQ3ZCLE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLG1CQUFtQixFQUFFLENBQUE7b0JBQzdELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO3dCQUN2QixpQkFBaUIsQ0FBQyxJQUFJLENBQ3JCLGlCQUFpQixHQUFHLEVBQUUsR0FBRywwQ0FBMEMsQ0FDbkUsQ0FBQTt3QkFDRCxPQUFPLFNBQVMsQ0FBQTtvQkFDakIsQ0FBQztvQkFFRCxPQUFPLGdCQUFnQjt5QkFDckIsSUFBSSxDQUFDLENBQUMsSUFBMkIsRUFBRSxFQUFFO3dCQUNyQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUE7b0JBQzNELENBQUMsQ0FBQzt5QkFDRCxJQUFJLENBQ0osQ0FBQyxNQUFNLEVBQUUsRUFBRTt3QkFDVixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7NEJBQ2IsaUJBQWlCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQyxDQUFBO3dCQUMxRSxDQUFDO29CQUNGLENBQUMsRUFDRCxDQUFDLEdBQUcsRUFBRSxFQUFFO3dCQUNQLGlCQUFpQixDQUFDLElBQUksQ0FBQywwQ0FBMEMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7b0JBQzdFLENBQUMsQ0FDRCxDQUFBO2dCQUNILENBQUMsRUFDRCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1lBQ0YsQ0FBQztZQUNELDhCQUE4QixFQUFFLENBQy9CLEVBQVUsRUFDVixRQUE0RCxFQUM1RCxPQUFhLEVBQ08sRUFBRTtnQkFDdEIsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUNqRCxPQUFPLGVBQWUsQ0FBQyxlQUFlLENBQ3JDLElBQUksRUFDSixFQUFFLEVBQ0YsS0FBSyxFQUFFLEdBQUcsSUFBVyxFQUFnQixFQUFFO29CQUN0QyxNQUFNLGdCQUFnQixHQUFHLDBCQUEwQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDdEUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQ3ZCLGlCQUFpQixDQUFDLElBQUksQ0FDckIsaUJBQWlCLEdBQUcsRUFBRSxHQUFHLDBDQUEwQyxDQUNuRSxDQUFBO3dCQUNELE9BQU8sU0FBUyxDQUFBO29CQUNqQixDQUFDO29CQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sY0FBYyxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFBO29CQUN6RSxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUE7Z0JBQ3pDLENBQUMsRUFDRCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1lBQ0YsQ0FBQztZQUNELGNBQWMsQ0FBSSxFQUFVLEVBQUUsR0FBRyxJQUFXO2dCQUMzQyxPQUFPLGVBQWUsQ0FBQyxjQUFjLENBQUksRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFDdEQsQ0FBQztZQUNELFdBQVcsQ0FBQyxpQkFBMEIsS0FBSztnQkFDMUMsT0FBTyxlQUFlLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ25ELENBQUM7U0FDRCxDQUFBO1FBRUQsaUJBQWlCO1FBQ2pCLE1BQU0sR0FBRyxHQUFzQjtZQUM5QixJQUFJLFNBQVM7Z0JBQ1osT0FBTyxRQUFRLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQTtZQUN4QyxDQUFDO1lBQ0QsSUFBSSxTQUFTO2dCQUNaLE9BQU8sUUFBUSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUE7WUFDeEMsQ0FBQztZQUNELElBQUksUUFBUTtnQkFDWCxPQUFPLFFBQVEsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFBO1lBQ3hDLENBQUM7WUFDRCxJQUFJLE9BQU87Z0JBQ1YsT0FBTyxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQTtZQUNwQyxDQUFDO1lBQ0QsSUFBSSxPQUFPO2dCQUNWLE9BQU8sUUFBUSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxJQUFJLEVBQUUsQ0FBQTtZQUNsRCxDQUFDO1lBQ0QsSUFBSSxPQUFPO2dCQUNWLE9BQU8sUUFBUSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUE7WUFDcEMsQ0FBQztZQUNELElBQUksU0FBUztnQkFDWixPQUFPLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFBO1lBQ3pDLENBQUM7WUFDRCxJQUFJLFNBQVM7Z0JBQ1osT0FBTyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7WUFDOUIsQ0FBQztZQUNELElBQUksS0FBSztnQkFDUixPQUFPLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNyRCxDQUFDO1lBQ0QsSUFBSSxnQkFBZ0I7Z0JBQ25CLE9BQU8saUJBQWlCLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUNsRSxDQUFDO1lBQ0QsSUFBSSxrQkFBa0I7Z0JBQ3JCLE9BQU8sZ0JBQWdCLENBQUMseUJBQXlCLEVBQUUsQ0FBQTtZQUNwRCxDQUFDO1lBQ0QsSUFBSSwyQkFBMkI7Z0JBQzlCLE9BQU8saUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtZQUN2RSxDQUFDO1lBQ0QsSUFBSSxzQkFBc0I7Z0JBQ3pCLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFDL0MsT0FBTyxnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1lBQzlDLENBQUM7WUFDRCxJQUFJLGlDQUFpQztnQkFDcEMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUMvQyxPQUFPLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLGlDQUFpQyxDQUFDLENBQUE7WUFDN0UsQ0FBQztZQUNELElBQUksZUFBZTtnQkFDbEIsT0FBTyxlQUFlLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ2hFLENBQUM7WUFDRCxxQkFBcUIsQ0FDcEIsTUFBOEIsRUFDOUIsT0FBdUM7Z0JBRXZDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDN0MsT0FBTyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3RFLENBQUM7WUFDRCxZQUFZLENBQUMsR0FBUSxFQUFFLE9BQXdEO2dCQUM5RSxPQUFPLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO29CQUNqQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUztvQkFDM0MsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLHVCQUF1QjtpQkFDekQsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUNELEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBUTtnQkFDM0IsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3RELE9BQU8sV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDckMsQ0FBQztnQkFFRCxJQUFJLENBQUM7b0JBQ0osT0FBTyxNQUFNLGFBQWEsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFO3dCQUM3QyxjQUFjLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUztxQkFDM0MsQ0FBQyxDQUFBO2dCQUNILENBQUM7Z0JBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztvQkFDZCxJQUFJLGFBQWEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQzNFLE9BQU8sR0FBRyxDQUFBO29CQUNYLENBQUM7b0JBRUQsTUFBTSxHQUFHLENBQUE7Z0JBQ1YsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLFVBQVU7Z0JBQ2IsT0FBTyxhQUFhLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNoRCxDQUFDO1lBQ0QsSUFBSSxlQUFlO2dCQUNsQix1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7Z0JBQy9DLE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUE7WUFDakMsQ0FBQztZQUNELElBQUksTUFBTTtnQkFDVCxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUE7WUFDdkIsQ0FBQztZQUNELElBQUksUUFBUTtnQkFDWCxPQUFPLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ3BDLENBQUM7WUFDRCxJQUFJLG1CQUFtQjtnQkFDdEIsT0FBTyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1lBQ2hFLENBQUM7WUFDRCxJQUFJLFVBQVU7Z0JBQ2IsdUJBQXVCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUMvQyxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUE7WUFDeEIsQ0FBQztZQUNELElBQUksU0FBUztnQkFDWix1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7Z0JBQy9DLE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQTtZQUN2QixDQUFDO1NBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDckQsaURBQWlEO1lBQ2pELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbkIsQ0FBQztRQUVELG1CQUFtQjtRQUNuQixNQUFNLEtBQUssR0FBd0I7WUFDbEMsb0JBQW9CLENBQ25CLFFBQVEsRUFDUixLQUFLLEVBQ0wsY0FBMkU7Z0JBRTNFLE9BQU8sY0FBYyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQ3ZGLENBQUM7WUFDRCxrQkFBa0I7Z0JBQ2pCLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQTtnQkFDbEQsT0FBTyxjQUFjLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtZQUMzQyxDQUFDO1lBQ0QsUUFBUSxDQUFDLFFBQVE7Z0JBQ2hCLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQTtnQkFDbEQsT0FBTyxjQUFjLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3pDLENBQUM7WUFDRCw0QkFBNEIsQ0FBQyxRQUFRO2dCQUNwQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUE7Z0JBQ2xELE9BQU8sY0FBYyxDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzdELENBQUM7WUFDRCxJQUFJLHNCQUFzQjtnQkFDekIsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFBO2dCQUNsRCxPQUFPLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQzFELENBQUM7WUFDRCxJQUFJLFdBQVc7Z0JBQ2QsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFBO2dCQUNsRCxPQUFPLGNBQWMsQ0FBQyxPQUFPLENBQUE7WUFDOUIsQ0FBQztTQUNELENBQUE7UUFFRCx3QkFBd0I7UUFDeEIsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRO1lBQzdDLENBQUMsQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLFNBQVM7WUFDdEMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFBO1FBRWhDLE1BQU0sVUFBVSxHQUE2QjtZQUM1QyxZQUFZLENBQ1gsV0FBbUIsRUFDbkIsa0NBQTRDO2dCQUU1QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUFFLENBQUM7b0JBQ3ZELGtDQUFrQyxHQUFHLEtBQUssQ0FBQTtnQkFDM0MsQ0FBQztnQkFDRCxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUNwRSxJQUFJLElBQUksRUFBRSxDQUFDO29CQUNWLE9BQU8sSUFBSSxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUN6RixDQUFDO2dCQUNELElBQUksa0NBQWtDLEVBQUUsQ0FBQztvQkFDeEMsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtvQkFDdEUsSUFBSSxPQUFPLEVBQUUsQ0FBQzt3QkFDYixPQUFPLElBQUksU0FBUyxDQUNuQixnQkFBZ0IsRUFDaEIsU0FBUyxDQUFDLFVBQVUsRUFDcEIsT0FBTyxFQUNQLGFBQWEsQ0FBQyxpQ0FBaUMsRUFDL0MsSUFBSSxDQUNKLENBQUE7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2dCQUNELE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7WUFDRCxJQUFJLEdBQUc7Z0JBQ04sTUFBTSxNQUFNLEdBQTRCLEVBQUUsQ0FBQTtnQkFDMUMsS0FBSyxNQUFNLElBQUksSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEVBQUUsQ0FBQztvQkFDckUsTUFBTSxDQUFDLElBQUksQ0FDVixJQUFJLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQ2pGLENBQUE7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7WUFDRCxJQUFJLHVCQUF1QjtnQkFDMUIsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFBO2dCQUNuRCxNQUFNLEtBQUssR0FBRyxJQUFJLHNCQUFzQixDQUN2QyxhQUFhLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQy9FLENBQUE7Z0JBQ0QsTUFBTSxNQUFNLEdBQTRCLEVBQUUsQ0FBQTtnQkFDMUMsS0FBSyxNQUFNLElBQUksSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLEVBQUUsQ0FBQztvQkFDcEUsTUFBTSw0QkFBNEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUNoRSxNQUFNLENBQUMsSUFBSSxDQUNWLElBQUksU0FBUyxDQUNaLGdCQUFnQixFQUNoQixTQUFTLENBQUMsVUFBVSxFQUNwQixJQUFJLEVBQ0osYUFBYSxDQUFDLGlDQUFpQyxFQUMvQyw0QkFBNEIsQ0FDNUIsQ0FDRCxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDO1lBQ0QsSUFBSSxXQUFXO2dCQUNkLElBQUksb0JBQW9CLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUFFLENBQUM7b0JBQ3RELE9BQU8saUJBQWlCLENBQ3ZCLEtBQUssQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FDeEUsQ0FBQTtnQkFDRixDQUFDO2dCQUNELE9BQU8saUJBQWlCLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUN6RCxDQUFDO1NBQ0QsQ0FBQTtRQUVELHVCQUF1QjtRQUN2QixNQUFNLFNBQVMsR0FBNEI7WUFDMUMsMEJBQTBCLENBQUMsSUFBYTtnQkFDdkMsT0FBTyxrQkFBa0IsQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2pGLENBQUM7WUFDRCxJQUFJLHNCQUFzQjtnQkFDekIsT0FBTyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1lBQ3BFLENBQUM7WUFDRCxjQUFjLEVBQUUsQ0FBQyxRQUFxQixFQUFFLEVBQUU7Z0JBQ3pDLE9BQVksa0JBQWtCLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3hELENBQUM7WUFDRCxZQUFZO2dCQUNYLE9BQU8sZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDdkMsQ0FBQztZQUNELHVCQUF1QixDQUN0QixRQUE2QixFQUM3QixVQUFrQjtnQkFFbEIsT0FBTyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNqRSxDQUFDO1lBQ0QsS0FBSyxDQUFDLFFBQWlDLEVBQUUsUUFBNkI7Z0JBQ3JFLE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ3RFLElBQUksUUFBNkMsQ0FBQTtnQkFDakQsSUFBSSxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO29CQUN2QyxRQUFRLEdBQUcsZUFBZSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQzNELEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUNqRSxFQUFFLFdBQVcsQ0FBQTtnQkFDZixDQUFDO2dCQUNELE9BQU8sS0FBSyxDQUNYLGVBQWUsRUFDZixRQUFRLENBQUMsR0FBRyxFQUNaLFFBQVEsQ0FBQyxVQUFVLEVBQ25CLElBQUksRUFDSixRQUFRLEVBQUUsR0FBRyxFQUNiLFFBQVEsRUFBRSxZQUFZLENBQ3RCLENBQUE7WUFDRixDQUFDO1lBQ0QsMkJBQTJCLENBQzFCLFFBQWlDLEVBQ2pDLFFBQW1DLEVBQ25DLFFBQTRDO2dCQUU1QyxPQUFPLHVCQUF1QixDQUFDLDBCQUEwQixDQUN4RCxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLEVBQ1IsUUFBUSxDQUNSLENBQUE7WUFDRixDQUFDO1lBQ0QsaUNBQWlDLENBQ2hDLFFBQWlDLEVBQ2pDLFFBQTBDLEVBQzFDLFFBQThDO2dCQUU5QyxPQUFPLHVCQUF1QixDQUFDLGlDQUFpQyxDQUMvRCxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLEVBQ1IsUUFBUSxDQUNSLENBQUE7WUFDRixDQUFDO1lBQ0Qsd0JBQXdCLENBQ3ZCLFFBQWlDLEVBQ2pDLFFBQWlDO2dCQUVqQyxPQUFPLHVCQUF1QixDQUFDLHdCQUF3QixDQUN0RCxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCwwQkFBMEIsQ0FDekIsUUFBaUMsRUFDakMsUUFBbUM7Z0JBRW5DLE9BQU8sdUJBQXVCLENBQUMsMEJBQTBCLENBQ3hELFNBQVMsRUFDVCxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQ3ZCLFFBQVEsQ0FDUixDQUFBO1lBQ0YsQ0FBQztZQUNELDJCQUEyQixDQUMxQixRQUFpQyxFQUNqQyxRQUFvQztnQkFFcEMsT0FBTyx1QkFBdUIsQ0FBQywyQkFBMkIsQ0FDekQsU0FBUyxFQUNULGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDdkIsUUFBUSxDQUNSLENBQUE7WUFDRixDQUFDO1lBQ0QsOEJBQThCLENBQzdCLFFBQWlDLEVBQ2pDLFFBQXVDO2dCQUV2QyxPQUFPLHVCQUF1QixDQUFDLDhCQUE4QixDQUM1RCxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCw4QkFBOEIsQ0FDN0IsUUFBaUMsRUFDakMsUUFBdUM7Z0JBRXZDLE9BQU8sdUJBQXVCLENBQUMsOEJBQThCLENBQzVELFNBQVMsRUFDVCxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQ3ZCLFFBQVEsQ0FDUixDQUFBO1lBQ0YsQ0FBQztZQUNELHFCQUFxQixDQUNwQixRQUFpQyxFQUNqQyxRQUE4QjtnQkFFOUIsT0FBTyx1QkFBdUIsQ0FBQyxxQkFBcUIsQ0FDbkQsU0FBUyxFQUNULGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDdkIsUUFBUSxFQUNSLFNBQVMsQ0FBQyxVQUFVLENBQ3BCLENBQUE7WUFDRixDQUFDO1lBQ0QscUNBQXFDLENBQ3BDLFFBQWlDLEVBQ2pDLFFBQThDO2dCQUU5QyxPQUFPLHVCQUF1QixDQUFDLHFDQUFxQyxDQUNuRSxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLEVBQ1IsU0FBUyxDQUFDLFVBQVUsQ0FDcEIsQ0FBQTtZQUNGLENBQUM7WUFDRCw0QkFBNEIsQ0FDM0IsUUFBaUMsRUFDakMsUUFBcUM7Z0JBRXJDLE9BQU8sdUJBQXVCLENBQUMsNEJBQTRCLENBQzFELFNBQVMsRUFDVCxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQ3ZCLFFBQVEsRUFDUixTQUFTLENBQUMsVUFBVSxDQUNwQixDQUFBO1lBQ0YsQ0FBQztZQUNELGlDQUFpQyxDQUNoQyxRQUFpQyxFQUNqQyxRQUEwQztnQkFFMUMsT0FBTyx1QkFBdUIsQ0FBQyxpQ0FBaUMsQ0FDL0QsU0FBUyxFQUNULGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDdkIsUUFBUSxDQUNSLENBQUE7WUFDRixDQUFDO1lBQ0Qsc0NBQXNDLENBQ3JDLFFBQWlDLEVBQ2pDLFFBQStDO2dCQUUvQyxPQUFPLHVCQUF1QixDQUFDLHNDQUFzQyxDQUNwRSxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCxrQ0FBa0MsQ0FDakMsUUFBaUMsRUFDakMsUUFBMkM7Z0JBRTNDLE9BQU8sdUJBQXVCLENBQUMsa0NBQWtDLENBQ2hFLFNBQVMsRUFDVCxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQ3ZCLFFBQVEsQ0FDUixDQUFBO1lBQ0YsQ0FBQztZQUNELHlCQUF5QixDQUN4QixRQUFpQyxFQUNqQyxRQUFrQztnQkFFbEMsT0FBTyx1QkFBdUIsQ0FBQyx5QkFBeUIsQ0FDdkQsU0FBUyxFQUNULGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDdkIsUUFBUSxDQUNSLENBQUE7WUFDRixDQUFDO1lBQ0Qsc0JBQXNCLENBQ3JCLFFBQWlDLEVBQ2pDLFFBQStCO2dCQUUvQixPQUFPLHVCQUF1QixDQUFDLHNCQUFzQixDQUNwRCxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCw4QkFBOEIsQ0FDN0IsUUFBaUMsRUFDakMsUUFBdUM7Z0JBRXZDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFBO2dCQUM1RCxPQUFPLHVCQUF1QixDQUFDLDhCQUE4QixDQUM1RCxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCw4QkFBOEIsQ0FDN0IsUUFBaUMsRUFDakMsUUFBdUMsRUFDdkMsUUFBZ0Q7Z0JBRWhELE9BQU8sdUJBQXVCLENBQUMsOEJBQThCLENBQzVELFNBQVMsRUFDVCxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQ3ZCLFFBQVEsRUFDUixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCwrQkFBK0IsQ0FBQyxRQUF3QztnQkFDdkUsT0FBTyx1QkFBdUIsQ0FBQywrQkFBK0IsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDcEYsQ0FBQztZQUNELHNDQUFzQyxDQUNyQyxRQUFpQyxFQUNqQyxRQUErQztnQkFFL0MsT0FBTyx1QkFBdUIsQ0FBQyxzQ0FBc0MsQ0FDcEUsU0FBUyxFQUNULGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDdkIsUUFBUSxDQUNSLENBQUE7WUFDRixDQUFDO1lBQ0QsMkNBQTJDLENBQzFDLFFBQWlDLEVBQ2pDLFFBQW9EO2dCQUVwRCxPQUFPLHVCQUF1QixDQUFDLDJDQUEyQyxDQUN6RSxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCxvQ0FBb0MsQ0FDbkMsUUFBaUMsRUFDakMsUUFBNkMsRUFDN0MscUJBQTZCLEVBQzdCLEdBQUcscUJBQStCO2dCQUVsQyxPQUFPLHVCQUF1QixDQUFDLG9DQUFvQyxDQUNsRSxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLEVBQ1IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUNyRCxDQUFBO1lBQ0YsQ0FBQztZQUNELHNDQUFzQyxDQUNyQyxRQUFpQyxFQUNqQyxRQUErQyxFQUMvQyxNQUFtQztnQkFFbkMsT0FBTyx1QkFBdUIsQ0FBQyxzQ0FBc0MsQ0FDcEUsU0FBUyxFQUNULGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDdkIsUUFBUSxFQUNSLE1BQU0sQ0FDTixDQUFBO1lBQ0YsQ0FBQztZQUNELDJDQUEyQyxDQUMxQyxRQUFpQyxFQUNqQyxRQUFvRCxFQUNwRCxNQUFtQztnQkFFbkMsT0FBTyx1QkFBdUIsQ0FBQywyQ0FBMkMsQ0FDekUsU0FBUyxFQUNULGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDdkIsUUFBUSxFQUNSLE1BQU0sQ0FDTixDQUFBO1lBQ0YsQ0FBQztZQUNELDZCQUE2QixDQUM1QixRQUFpQyxFQUNqQyxRQUFzQyxFQUN0QyxTQUF5RCxFQUN6RCxHQUFHLFNBQW1CO2dCQUV0QixJQUFJLE9BQU8sU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNuQyxPQUFPLHVCQUF1QixDQUFDLDZCQUE2QixDQUMzRCxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLEVBQ1IsU0FBUyxDQUNULENBQUE7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLHVCQUF1QixDQUFDLDZCQUE2QixDQUMzRCxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLEVBQ1IsT0FBTyxTQUFTLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQ2pFLENBQUE7WUFDRixDQUFDO1lBQ0QsOEJBQThCLENBQzdCLFFBQWlDLEVBQ2pDLFFBQXVDLEVBQ3ZDLEdBQUcsaUJBQTJCO2dCQUU5QixPQUFPLHVCQUF1QixDQUFDLDhCQUE4QixDQUM1RCxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLEVBQ1IsaUJBQWlCLENBQ2pCLENBQUE7WUFDRixDQUFDO1lBQ0Qsb0NBQW9DLENBQ25DLFFBQWlDLEVBQ2pDLFFBQTZDLEVBQzdDLFFBQXNEO2dCQUV0RCxJQUFJLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxDQUFDO29CQUMxQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtnQkFDakUsQ0FBQztnQkFDRCxJQUFJLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSxDQUFDO29CQUNyRCx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtnQkFDakUsQ0FBQztnQkFDRCxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNkLHVCQUF1QixDQUFDLFNBQVMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO2dCQUNqRSxDQUFDO2dCQUNELE9BQU8sdUJBQXVCLENBQUMsaUNBQWlDLENBQy9ELFNBQVMsRUFDVCxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQ3ZCLFFBQVEsRUFDUixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCwwQkFBMEIsQ0FDekIsUUFBaUMsRUFDakMsUUFBbUM7Z0JBRW5DLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTtnQkFDaEQsT0FBTyx1QkFBdUIsQ0FBQywwQkFBMEIsQ0FDeEQsU0FBUyxFQUNULGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDdkIsUUFBUSxDQUNSLENBQUE7WUFDRixDQUFDO1lBQ0QsNEJBQTRCLENBQzNCLFFBQWlDLEVBQ2pDLFFBQXFDO2dCQUVyQyxPQUFPLHVCQUF1QixDQUFDLDRCQUE0QixDQUMxRCxTQUFTLEVBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUN2QixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCxxQkFBcUIsQ0FDcEIsUUFBaUMsRUFDakMsUUFBc0M7Z0JBRXRDLE9BQU8sdUJBQXVCLENBQUMscUJBQXFCLENBQ25ELFNBQVMsRUFDVCxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQ3ZCLFFBQVEsQ0FDUixDQUFBO1lBQ0YsQ0FBQztZQUNELDRCQUE0QixDQUMzQixRQUFpQyxFQUNqQyxRQUFxQztnQkFFckMsT0FBTyx1QkFBdUIsQ0FBQyw0QkFBNEIsQ0FDMUQsU0FBUyxFQUNULGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDdkIsUUFBUSxDQUNSLENBQUE7WUFDRixDQUFDO1lBQ0QsOEJBQThCLENBQzdCLFFBQWlDLEVBQ2pDLFFBQXVDO2dCQUV2QyxPQUFPLHVCQUF1QixDQUFDLDhCQUE4QixDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDN0YsQ0FBQztZQUNELDZCQUE2QixDQUM1QixRQUFpQyxFQUNqQyxRQUFzQztnQkFFdEMsT0FBTyx1QkFBdUIsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQzVGLENBQUM7WUFDRCw2QkFBNkIsQ0FDNUIsUUFBaUMsRUFDakMsUUFBc0M7Z0JBRXRDLE9BQU8sdUJBQXVCLENBQUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUM1RixDQUFDO1lBQ0Qsd0JBQXdCLEVBQUUsQ0FDekIsUUFBZ0IsRUFDaEIsYUFBMkMsRUFDdkIsRUFBRTtnQkFDdEIsT0FBTyx1QkFBdUIsQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQzVGLENBQUM7WUFDRCw2QkFBNkIsQ0FBQyxHQUF3QixFQUFFLEdBQW9CO2dCQUMzRSx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtnQkFDdEQsT0FBTyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ2xELENBQUM7WUFDRCwwQkFBMEIsQ0FDekIsUUFBaUMsRUFDakMsUUFBbUM7Z0JBRW5DLE9BQU8sdUJBQXVCLENBQUMsMEJBQTBCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUN6RixDQUFDO1lBQ0Qsd0JBQXdCLENBQ3ZCLEVBQVUsRUFDVixRQUFpQztnQkFFakMsT0FBTyxnQkFBZ0IsQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQzFFLENBQUM7WUFDRCxnQ0FBZ0MsQ0FDL0IsUUFBaUMsRUFDakMsUUFBeUMsRUFDekMsUUFBa0Q7Z0JBRWxELE9BQU8sdUJBQXVCLENBQUMsa0NBQWtDLENBQ2hFLFNBQVMsRUFDVCxRQUFRLEVBQ1IsUUFBUSxFQUNSLFFBQVEsQ0FDUixDQUFBO1lBQ0YsQ0FBQztTQUNELENBQUE7UUFFRCxvQkFBb0I7UUFDcEIsTUFBTSxNQUFNLEdBQXlCO1lBQ3BDLElBQUksZ0JBQWdCO2dCQUNuQixPQUFPLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1lBQzVDLENBQUM7WUFDRCxJQUFJLGtCQUFrQjtnQkFDckIsT0FBTyxjQUFjLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtZQUM5QyxDQUFDO1lBQ0QsSUFBSSxjQUFjO2dCQUNqQixPQUFPLHNCQUFzQixDQUFDLGNBQWMsQ0FBQTtZQUM3QyxDQUFDO1lBQ0QsSUFBSSxTQUFTO2dCQUNaLE9BQU8sc0JBQXNCLENBQUMsU0FBUyxDQUFBO1lBQ3hDLENBQUM7WUFDRCxLQUFLLENBQUMsZ0JBQWdCLENBQ3JCLGFBQStDLEVBQy9DLGVBQW9FLEVBQ3BFLGFBQXVCO2dCQUV2QixJQUNDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO29CQUN4QixhQUFhLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZO29CQUM3QyxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQ3ZCLENBQUM7b0JBQ0YscUJBQXFCLENBQUMsTUFBTSxDQUMzQiw0QkFBNEIsRUFDNUIsU0FBUyxFQUNULHdEQUF3RCxDQUN4RCxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO29CQUMvQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQzVELENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFzQixhQUFhLENBQUMsQ0FBQyxDQUFBO2dCQUV2RCxPQUFPLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsZUFBZSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ2pGLENBQUM7WUFDRCw4QkFBOEIsQ0FDN0IsT0FBdUM7Z0JBRXZDLE9BQU8sY0FBYyxDQUFDLDhCQUE4QixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUN6RSxDQUFDO1lBQ0QsMkJBQTJCLENBQUMsUUFBUSxFQUFFLE9BQVEsRUFBRSxXQUFZO2dCQUMzRCxPQUFPLGlCQUFpQixDQUFDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxDQUNuRSxRQUFRLEVBQ1IsT0FBTyxFQUNQLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELDZCQUE2QixDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVztnQkFDM0QsT0FBTyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsNkJBQTZCLENBQUMsQ0FDckUsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCw4QkFBOEIsQ0FDN0IsUUFBMkQsRUFDM0QsUUFBYyxFQUNkLFdBQXVDO2dCQUV2QyxPQUFPLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUN0RSxRQUFRLEVBQ1IsUUFBUSxFQUNSLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELDRCQUE0QixDQUMzQixRQUF5RCxFQUN6RCxRQUFjLEVBQ2QsV0FBdUM7Z0JBRXZDLE9BQU8saUJBQWlCLENBQUMsY0FBYyxDQUFDLDRCQUE0QixDQUFDLENBQ3BFLFFBQVEsRUFDUixRQUFRLEVBQ1IsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0Qsa0NBQWtDLENBQ2pDLFFBQStELEVBQy9ELFFBQWMsRUFDZCxXQUF1QztnQkFFdkMsT0FBTyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsa0NBQWtDLENBQUMsQ0FDMUUsUUFBUSxFQUNSLFFBQVEsRUFDUixXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCwrQkFBK0IsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQy9ELE9BQU8saUJBQWlCLENBQUMsY0FBYyxDQUFDLCtCQUErQixDQUFDLENBQ3ZFLFFBQVEsRUFDUixPQUFPLEVBQ1AsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0Qsb0NBQW9DLENBQUMsUUFBUSxFQUFFLE9BQVEsRUFBRSxXQUFZO2dCQUNwRSx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsQ0FBQTtnQkFDL0QsT0FBTyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsb0NBQW9DLENBQUMsQ0FDNUUsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQ2xELE9BQU8saUJBQWlCLENBQUMsc0JBQXNCLENBQUMsa0JBQWtCLENBQUMsQ0FDbEUsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQ2pELE9BQU8saUJBQWlCLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLENBQUMsQ0FDakUsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCx5QkFBeUIsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQ3pELE9BQU8saUJBQWlCLENBQUMsc0JBQXNCLENBQUMseUJBQXlCLENBQUMsQ0FDekUsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCw2QkFBNkIsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQzdELHVCQUF1QixDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO2dCQUN4RCxPQUFPLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLDZCQUE2QixDQUFDLENBQzdFLFFBQVEsRUFDUixPQUFPLEVBQ1AsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0Qsd0JBQXdCLENBQUMsUUFBUSxFQUFFLE9BQVEsRUFBRSxXQUFZO2dCQUN4RCxPQUFPLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLHdCQUF3QixDQUFDLENBQ3hFLFFBQVEsRUFDUixPQUFPLEVBQ1AsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0Qsc0JBQXNCLENBQUMsUUFBUSxFQUFFLE9BQVEsRUFBRSxXQUFZO2dCQUN0RCx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtnQkFDNUQsT0FBTyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUN0RSxRQUFRLEVBQ1IsT0FBTyxFQUNQLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELDJCQUEyQixDQUFDLFFBQVEsRUFBRSxPQUFRLEVBQUUsV0FBWTtnQkFDM0QsdUJBQXVCLENBQUMsU0FBUyxFQUFFLDZCQUE2QixDQUFDLENBQUE7Z0JBQ2pFLE9BQU8saUJBQWlCLENBQUMsc0JBQXNCLENBQUMsMkJBQTJCLENBQUMsQ0FDM0UsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCxtQ0FBbUMsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQ25FLE9BQU8saUJBQWlCLENBQ3ZCLCtCQUErQixDQUFDLG1DQUFtQyxDQUNuRSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDbEMsQ0FBQztZQUNELGdDQUFnQyxDQUFDLFFBQVEsRUFBRSxPQUFRLEVBQUUsV0FBWTtnQkFDaEUsT0FBTyxpQkFBaUIsQ0FBQywrQkFBK0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUN6RixRQUFRLEVBQ1IsT0FBTyxFQUNQLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELDhCQUE4QixDQUFDLFFBQVEsRUFBRSxPQUFRLEVBQUUsV0FBWTtnQkFDOUQsT0FBTyxpQkFBaUIsQ0FBQywrQkFBK0IsQ0FBQyw4QkFBOEIsQ0FBQyxDQUN2RixRQUFRLEVBQ1IsT0FBTyxFQUNQLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELElBQUksS0FBSztnQkFDUixPQUFPLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNoQyxDQUFDO1lBQ0Qsc0JBQXNCLENBQUMsUUFBUSxFQUFFLE9BQVEsRUFBRSxXQUFZO2dCQUN0RCxPQUFPLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUM3RCxRQUFRLEVBQ1IsT0FBTyxFQUNQLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELHNCQUFzQixDQUNyQixPQUFlLEVBQ2YsR0FBRyxJQUFnRTtnQkFFbkUsT0FBc0IsQ0FDckIscUJBQXFCLENBQUMsV0FBVyxDQUNoQyxTQUFTLEVBQ1QsUUFBUSxDQUFDLElBQUksRUFDYixPQUFPLEVBQ1AsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUM2QixJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUNqRCxDQUNELENBQUE7WUFDRixDQUFDO1lBQ0Qsa0JBQWtCLENBQ2pCLE9BQWUsRUFDZixHQUFHLElBQWdFO2dCQUVuRSxPQUFzQixDQUNyQixxQkFBcUIsQ0FBQyxXQUFXLENBQ2hDLFNBQVMsRUFDVCxRQUFRLENBQUMsT0FBTyxFQUNoQixPQUFPLEVBQ1AsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUM2QixJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUNqRCxDQUNELENBQUE7WUFDRixDQUFDO1lBQ0QsZ0JBQWdCLENBQ2YsT0FBZSxFQUNmLEdBQUcsSUFBZ0U7Z0JBRW5FLE9BQXNCLENBQ3JCLHFCQUFxQixDQUFDLFdBQVcsQ0FDaEMsU0FBUyxFQUNULFFBQVEsQ0FBQyxLQUFLLEVBQ2QsT0FBTyxFQUNQLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDNkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FDakQsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztZQUNELGFBQWEsQ0FDWixLQUFVLEVBQ1YsT0FBaUMsRUFDakMsS0FBZ0M7Z0JBRWhDLE9BQU8sZ0JBQWdCLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3hFLENBQUM7WUFDRCx1QkFBdUIsQ0FBQyxPQUEyQztnQkFDbEUsT0FBTyxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN6RCxDQUFDO1lBQ0QsWUFBWSxDQUFDLE9BQWdDLEVBQUUsS0FBZ0M7Z0JBQzlFLE9BQU8sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNsRCxDQUFDO1lBQ0QsY0FBYyxDQUFDLE9BQU87Z0JBQ3JCLE9BQU8sY0FBYyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1lBQ0QsY0FBYyxDQUFDLE9BQU87Z0JBQ3JCLE9BQU8sY0FBYyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1lBQ0QsbUJBQW1CLENBQ2xCLGFBQWtELEVBQ2xELG1CQUF3RCxFQUN4RCxXQUFvQjtnQkFFcEIsSUFBSSxFQUFzQixDQUFBO2dCQUMxQixJQUFJLFNBQTZCLENBQUE7Z0JBQ2pDLElBQUksUUFBNEIsQ0FBQTtnQkFFaEMsSUFBSSxPQUFPLGFBQWEsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDdkMsRUFBRSxHQUFHLGFBQWEsQ0FBQTtvQkFDbEIsU0FBUyxHQUFHLG1CQUFtQixDQUFBO29CQUMvQixRQUFRLEdBQUcsV0FBVyxDQUFBO2dCQUN2QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsU0FBUyxHQUFHLGFBQWEsQ0FBQTtvQkFDekIsUUFBUSxHQUFHLG1CQUFtQixDQUFBO2dCQUMvQixDQUFDO2dCQUVELE9BQU8sZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDakYsQ0FBQztZQUNELG1CQUFtQixDQUNsQixJQUFZLEVBQ1osaUJBQTBDO2dCQUUxQyxPQUFPLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1lBQ3JFLENBQUM7WUFDRCxlQUFlLENBQUksSUFBd0Q7Z0JBQzFFLHFCQUFxQixDQUFDLE1BQU0sQ0FDM0Isd0JBQXdCLEVBQ3hCLFNBQVMsRUFDVCw2QkFBNkIsQ0FDN0IsQ0FBQTtnQkFFRCxPQUFPLGVBQWUsQ0FBQyxZQUFZLENBQ2xDLFNBQVMsRUFDVCxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLEVBQ3pELENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQ25CLElBQUksQ0FBQztvQkFDSixNQUFNLENBQUMsQ0FBUzt3QkFDZixRQUFRO29CQUNULENBQUM7aUJBQ0QsQ0FBQyxDQUNILENBQUE7WUFDRixDQUFDO1lBQ0QsWUFBWSxDQUNYLE9BQStCLEVBQy9CLElBR2dCO2dCQUVoQixPQUFPLGVBQWUsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM5RCxDQUFDO1lBQ0QsbUJBQW1CLENBQUMsSUFBWSxFQUFFLE9BQTJDO2dCQUM1RSxPQUFPLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDMUUsQ0FBQztZQUNELGtCQUFrQixDQUNqQixRQUFnQixFQUNoQixLQUFhLEVBQ2IsV0FBMkYsRUFDM0YsT0FBNEQ7Z0JBRTVELE9BQU8sb0JBQW9CLENBQUMsa0JBQWtCLENBQzdDLFNBQVMsRUFDVCxRQUFRLEVBQ1IsS0FBSyxFQUNMLFdBQVcsRUFDWCxPQUFPLENBQ1AsQ0FBQTtZQUNGLENBQUM7WUFDRCw0QkFBNEIsQ0FDM0IsTUFBeUIsRUFDekIsSUFBWSxFQUNaLE1BQWMsRUFDZCxPQUErQjtnQkFFL0IsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFBO2dCQUNsRCxPQUFPLG1CQUFtQixDQUFDLHdCQUF3QixDQUNsRCxNQUFNLEVBQ04sSUFBSSxFQUNKLE1BQU0sRUFDTixPQUFPLEVBQ1AsU0FBUyxDQUNULENBQUE7WUFDRixDQUFDO1lBQ0QsY0FBYyxDQUNiLGFBQWlGLEVBQ2pGLFNBQWtCLEVBQ2xCLFNBQXNDO2dCQUV0QyxJQUFJLE9BQU8sYUFBYSxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUN2QyxJQUFJLEtBQUssSUFBSSxhQUFhLEVBQUUsQ0FBQzt3QkFDNUIsT0FBTyxzQkFBc0IsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtvQkFDckUsQ0FBQztvQkFDRCxPQUFPLHNCQUFzQixDQUFDLHlCQUF5QixDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUN2RSxDQUFDO2dCQUNELE9BQU8sc0JBQXNCLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbEYsQ0FBQztZQUNELDRCQUE0QixDQUFDLFFBQXFDO2dCQUNqRSxPQUFPLHNCQUFzQixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzdELENBQUM7WUFDRCwrQkFBK0IsQ0FDOUIsRUFBVSxFQUNWLFFBQXdDO2dCQUV4QyxPQUFPLHNCQUFzQixDQUFDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDL0UsQ0FBQztZQUNELGtDQUFrQyxDQUNqQyxRQUEwRSxFQUMxRSxHQUFHLGlCQUEyQjtnQkFFOUIsdUJBQXVCLENBQUMsU0FBUyxFQUFFLDRCQUE0QixDQUFDLENBQUE7Z0JBQ2hFLE9BQU8sc0JBQXNCLENBQUMsa0NBQWtDLENBQy9ELFNBQVMsRUFDVCxRQUFRLEVBQ1IsR0FBRyxpQkFBaUIsQ0FDcEIsQ0FBQTtZQUNGLENBQUM7WUFDRCxnQ0FBZ0MsQ0FDL0IsRUFBVSxFQUNWLFFBQXlDO2dCQUV6Qyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtnQkFDOUQsT0FBTyxzQkFBc0IsQ0FBQyxnQ0FBZ0MsQ0FDN0QsRUFBRSxFQUNGLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUMxQixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCx3QkFBd0IsQ0FDdkIsTUFBYyxFQUNkLGdCQUE4QztnQkFFOUMsT0FBTyxnQkFBZ0IsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDdEYsQ0FBQztZQUNELGNBQWMsQ0FDYixNQUFjLEVBQ2QsT0FBMkQ7Z0JBRTNELE9BQU8sZ0JBQWdCLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbkUsQ0FBQztZQUNELDhCQUE4QixFQUFFLENBQy9CLFFBQWdCLEVBQ2hCLFVBQXlDLEVBQ3hDLEVBQUU7Z0JBQ0gsT0FBTyxvQkFBb0IsQ0FBQyw4QkFBOEIsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzVGLENBQUM7WUFDRCw0QkFBNEIsRUFBRSxDQUM3QixRQUFnQixFQUNoQixRQUErRSxFQUMvRSxVQUdJLEVBQUUsRUFDTCxFQUFFO2dCQUNILE9BQU8sb0JBQW9CLENBQUMsNEJBQTRCLENBQ3ZELFNBQVMsRUFDVCxRQUFRLEVBQ1IsUUFBUSxFQUNSLE9BQU8sQ0FDUCxDQUFBO1lBQ0YsQ0FBQztZQUNELDhCQUE4QixDQUFDLFFBQXVDO2dCQUNyRSxPQUFPLGtCQUFrQixDQUFDLDhCQUE4QixDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUM5RSxDQUFDO1lBQ0Qsa0JBQWtCLENBQUMsT0FBMEI7Z0JBQzVDLE9BQU8sV0FBVyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUMxRCxDQUFDO1lBQ0QsZUFBZTtnQkFDZCxPQUFPLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNuRCxDQUFDO1lBQ0QsY0FBYztnQkFDYixPQUFPLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNsRCxDQUFDO1lBQ0QsSUFBSSxnQkFBZ0I7Z0JBQ25CLE9BQU8sY0FBYyxDQUFDLGdCQUFnQixDQUFBO1lBQ3ZDLENBQUM7WUFDRCwyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQzNELE9BQU8saUJBQWlCLENBQUMsY0FBYyxDQUFDLDJCQUEyQixDQUFDLENBQ25FLFFBQVEsRUFDUixPQUFPLEVBQ1AsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0QsMkJBQTJCLENBQzFCLE1BQWMsRUFDZCxRQUFvQyxFQUNwQyxPQUlDO2dCQUVELE9BQU8sbUJBQW1CLENBQUMsMkJBQTJCLENBQ3JELFNBQVMsRUFDVCxNQUFNLEVBQ04sUUFBUSxFQUNSLE9BQU8sRUFBRSxjQUFjLENBQ3ZCLENBQUE7WUFDRixDQUFDO1lBQ0QsSUFBSSxvQkFBb0I7Z0JBQ3ZCLE9BQU8sZUFBZSxDQUFDLG9CQUFvQixDQUFBO1lBQzVDLENBQUM7WUFDRCwrQkFBK0IsQ0FBQyxRQUFRLEVBQUUsUUFBUyxFQUFFLFdBQVk7Z0JBQ2hFLE9BQU8saUJBQWlCLENBQUMsZUFBZSxDQUFDLCtCQUErQixDQUFDLENBQ3hFLFFBQVEsRUFDUixRQUFRLEVBQ1IsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0QsSUFBSSxzQkFBc0I7Z0JBQ3pCLE9BQU8sZUFBZSxDQUFDLHNCQUFzQixDQUFBO1lBQzlDLENBQUM7WUFDRCxJQUFJLGlDQUFpQztnQkFDcEMsT0FBTyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtZQUM1RSxDQUFDO1lBQ0Qsa0NBQWtDLENBQUMsUUFBUSxFQUFFLFFBQVMsRUFBRSxXQUFZO2dCQUNuRSxPQUFPLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLGtDQUFrQyxDQUFDLENBQ2xGLFFBQVEsRUFDUixRQUFRLEVBQ1IsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0Qsc0NBQXNDLENBQUMsUUFBUSxFQUFFLFFBQVMsRUFBRSxXQUFZO2dCQUN2RSxPQUFPLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLHNDQUFzQyxDQUFDLENBQ3RGLFFBQVEsRUFDUixRQUFRLEVBQ1IsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0Qsb0JBQW9CLENBQUMsUUFBUSxFQUFFLE9BQVE7Z0JBQ3RDLE9BQU8sZUFBZSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUMvRCxDQUFDO1lBQ0QseUJBQXlCLENBQ3hCLEVBQVUsRUFDVixNQUFnQyxFQUNoQyxRQUEwQztnQkFFMUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLG1CQUFtQixDQUFDLENBQUE7Z0JBQ3ZELE9BQU8saUJBQWlCLENBQUMseUJBQXlCLENBQ2pELFNBQVMsQ0FBQyxVQUFVLEVBQ3BCLEVBQUUsRUFDRixNQUFNLEVBQ04sUUFBUSxDQUNSLENBQUE7WUFDRixDQUFDO1lBQ0QsNkJBQTZCLENBQUMsRUFBVSxFQUFFLE9BQXFDO2dCQUM5RSx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtnQkFDNUQsT0FBTyw2QkFBNkIsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQzNGLENBQUM7WUFDRCx5QkFBeUIsQ0FDeEIsUUFBaUMsRUFDakMsaUJBQTJDLEVBQzNDLEtBQWEsRUFDYixPQUFvQjtnQkFFcEIsdUJBQXVCLENBQUMsU0FBUyxFQUFFLG1CQUFtQixDQUFDLENBQUE7Z0JBQ3ZELE9BQU8sZ0JBQWdCLENBQUMseUJBQXlCLENBQ2hELGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDdkIsaUJBQWlCLEVBQ2pCLEtBQUssRUFDTCxPQUFPLENBQ1AsQ0FBQTtZQUNGLENBQUM7WUFDRCxJQUFJLFNBQVM7Z0JBQ1osT0FBTyxpQkFBaUIsQ0FBQyxTQUFTLENBQUE7WUFDbkMsQ0FBQztZQUNELHFCQUFxQixDQUNwQixRQUFpQyxFQUNqQyxRQUE4QjtnQkFFOUIsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFBO2dCQUNuRCxPQUFPLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDN0UsQ0FBQztZQUNELElBQUksWUFBWTtnQkFDZix1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtnQkFDeEQsT0FBTyxhQUFhLENBQUMsWUFBWSxDQUFBO1lBQ2xDLENBQUM7WUFDRCxvQkFBb0IsRUFBRSxDQUFDLEVBQVUsRUFBRSxFQUFFO2dCQUNwQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtnQkFDcEQsT0FBTyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDN0QsQ0FBQztTQUNELENBQUE7UUFFRCx1QkFBdUI7UUFFdkIsTUFBTSxTQUFTLEdBQTRCO1lBQzFDLElBQUksUUFBUTtnQkFDWCxxQkFBcUIsQ0FBQyxNQUFNLENBQzNCLG9CQUFvQixFQUNwQixTQUFTLEVBQ1QsMkdBQTJHLENBQzNHLENBQUE7Z0JBRUQsT0FBTyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNsQyxDQUFDO1lBQ0QsSUFBSSxRQUFRLENBQUMsS0FBSztnQkFDakIsTUFBTSxJQUFJLE1BQU0sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDM0MsQ0FBQztZQUNELGtCQUFrQixDQUFDLFFBQVE7Z0JBQzFCLE9BQU8sZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDckQsQ0FBQztZQUNELElBQUksZ0JBQWdCO2dCQUNuQixPQUFPLGdCQUFnQixDQUFDLG1CQUFtQixFQUFFLENBQUE7WUFDOUMsQ0FBQztZQUNELElBQUksSUFBSTtnQkFDUCxPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQTtZQUM3QixDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsS0FBSztnQkFDYixNQUFNLElBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1lBQ0QsSUFBSSxhQUFhO2dCQUNoQixPQUFPLGdCQUFnQixDQUFDLGFBQWEsQ0FBQTtZQUN0QyxDQUFDO1lBQ0QsSUFBSSxhQUFhLENBQUMsS0FBSztnQkFDdEIsTUFBTSxJQUFJLE1BQU0sQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDaEQsQ0FBQztZQUNELHNCQUFzQixFQUFFLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxHQUFHLHFCQUFxQixFQUFFLEVBQUU7Z0JBQ3hFLE9BQU8sZ0JBQWdCLENBQUMsc0JBQXNCLENBQzdDLFNBQVMsRUFDVCxLQUFLLEVBQ0wsV0FBVyxJQUFJLENBQUMsRUFDaEIsR0FBRyxxQkFBcUIsQ0FDeEIsQ0FBQTtZQUNGLENBQUM7WUFDRCwyQkFBMkIsRUFBRSxVQUFVLFFBQVEsRUFBRSxRQUFTLEVBQUUsV0FBWTtnQkFDdkUsT0FBTyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUM5RCxRQUFRLEVBQ1IsUUFBUSxFQUNSLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELGNBQWMsRUFBRSxDQUFDLFNBQVMsRUFBRSxnQkFBaUIsRUFBRSxFQUFFO2dCQUNoRCxPQUFPLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtZQUNyRSxDQUFDO1lBQ0QsU0FBUyxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFXLEVBQUUsS0FBTSxFQUFFLEVBQUU7Z0JBQ3BELDREQUE0RDtnQkFDNUQsT0FBTyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUM3RixDQUFDO1lBQ0QsVUFBVSxFQUFFLENBQ1gsV0FBaUMsRUFDakMsT0FBa0MsRUFDbEMsS0FBZ0MsRUFDUCxFQUFFO2dCQUMzQix1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUE7Z0JBQ2hELE9BQU8sZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN0RixDQUFDO1lBQ0QsZUFBZSxFQUFFLENBQ2hCLEtBQTZCLEVBQzdCLGlCQUU4QyxFQUM5QyxlQUF3RixFQUN4RixLQUFnQyxFQUMvQixFQUFFO2dCQUNILHVCQUF1QixDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO2dCQUNyRCxJQUFJLE9BQXNDLENBQUE7Z0JBQzFDLElBQUksUUFBbUQsQ0FBQTtnQkFFdkQsSUFBSSxPQUFPLGlCQUFpQixLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUMzQyxPQUFPLEdBQUcsaUJBQWlCLENBQUE7b0JBQzNCLFFBQVEsR0FBRyxlQUE0RCxDQUFBO2dCQUN4RSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxHQUFHLEVBQUUsQ0FBQTtvQkFDWixRQUFRLEdBQUcsaUJBQWlCLENBQUE7b0JBQzVCLEtBQUssR0FBRyxlQUEyQyxDQUFBO2dCQUNwRCxDQUFDO2dCQUVELE9BQU8sZ0JBQWdCLENBQUMsZUFBZSxDQUN0QyxLQUFLLEVBQ0wsT0FBTyxJQUFJLEVBQUUsRUFDYixRQUFRLEVBQ1IsU0FBUyxDQUFDLFVBQVUsRUFDcEIsS0FBSyxDQUNMLENBQUE7WUFDRixDQUFDO1lBQ0QsZ0JBQWdCLEVBQUUsQ0FDakIsS0FBOEIsRUFDOUIsT0FBd0MsRUFDeEMsS0FBZ0MsRUFDQyxFQUFFO2dCQUNuQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtnQkFDdEQsdUJBQXVCLENBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUE7Z0JBQ3pELE9BQU8sZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3RGLENBQUM7WUFDRCxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDYixPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1lBQ0QsTUFBTSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ2YsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDcEMsQ0FBQztZQUNELE9BQU8sRUFBRSxDQUFDLGVBQWdCLEVBQUUsRUFBRTtnQkFDN0IsT0FBTyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDakQsQ0FBQztZQUNELFNBQVMsQ0FDUixJQUEwQixFQUMxQixRQUF1QztnQkFFdkMsT0FBTyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3RFLENBQUM7WUFDRCx1QkFBdUIsRUFBRSxDQUN4QixPQUFPLEVBQ1AscUJBQXFCLEVBQ3JCLFlBQWEsRUFDYixZQUFhLEVBQ2MsRUFBRTtnQkFDN0IsTUFBTSxPQUFPLEdBQW1DO29CQUMvQyxrQkFBa0IsRUFBRSxPQUFPLENBQUMscUJBQXFCLENBQUM7b0JBQ2xELGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUM7b0JBQ3pDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUM7aUJBQ3pDLENBQUE7Z0JBRUQsT0FBTyxzQkFBc0IsQ0FBQyx1QkFBdUIsQ0FDcEQsZ0JBQWdCLEVBQ2hCLGNBQWMsRUFDZCxTQUFTLEVBQ1QsT0FBTyxFQUNQLE9BQU8sQ0FDUCxDQUFBO1lBQ0YsQ0FBQztZQUNELElBQUksYUFBYTtnQkFDaEIsT0FBTyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFFLENBQUM7WUFDRCxJQUFJLGFBQWEsQ0FBQyxLQUFLO2dCQUN0QixNQUFNLElBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUNoRCxDQUFDO1lBQ0QsZ0JBQWdCLENBQ2Ysc0JBRzZELEVBQzdELE9BQStCO2dCQUUvQixJQUFJLFVBQXlCLENBQUE7Z0JBRTdCLE9BQU8sR0FBRyxDQUFDLE9BQU8sSUFBSSxzQkFBc0IsQ0FFaEMsQ0FBQTtnQkFDWixJQUFJLE9BQU8sT0FBTyxFQUFFLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDM0MsdUJBQXVCLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLENBQUE7Z0JBQzNELENBQUM7Z0JBRUQsSUFBSSxPQUFPLHNCQUFzQixLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNoRCxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQTtnQkFDL0QsQ0FBQztxQkFBTSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDO29CQUM5QyxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO2dCQUNyRCxDQUFDO3FCQUFNLElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3BELFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDMUQsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQTtnQkFDN0QsQ0FBQztnQkFFRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtvQkFDOUIsaUJBQWlCLENBQUMsS0FBSyxDQUFDLHlCQUF5QixTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtvQkFDeEUsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQzNELHFCQUFxQixDQUFDLE1BQU0sQ0FDM0IsNEJBQTRCLEVBQzVCLFNBQVMsRUFDVCx3REFBd0QsQ0FDeEQsQ0FBQTtvQkFDRixDQUFDO29CQUNELE9BQU8sZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxFQUFFO3dCQUM5RSxPQUFPLFlBQVksQ0FBQyxRQUFRLENBQUE7b0JBQzdCLENBQUMsQ0FBQyxDQUFBO2dCQUNILENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUNELHFCQUFxQixFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVMsRUFBRSxXQUFZLEVBQUUsRUFBRTtnQkFDNUQsT0FBTyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDN0YsQ0FBQztZQUNELHNCQUFzQixFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVMsRUFBRSxXQUFZLEVBQUUsRUFBRTtnQkFDN0QsT0FBTyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUM3RCxRQUFRLEVBQ1IsUUFBUSxFQUNSLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELHVCQUF1QixFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVMsRUFBRSxXQUFZLEVBQUUsRUFBRTtnQkFDOUQsT0FBTyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUM3RCxRQUFRLEVBQ1IsUUFBUSxFQUNSLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELHFCQUFxQixFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVMsRUFBRSxXQUFZLEVBQUUsRUFBRTtnQkFDNUQsT0FBTyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUMzRCxRQUFRLEVBQ1IsUUFBUSxFQUNSLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELHNCQUFzQixFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVMsRUFBRSxXQUFZLEVBQUUsRUFBRTtnQkFDN0QsT0FBTyxpQkFBaUIsQ0FDdkIsOEJBQThCLENBQUMsOEJBQThCLENBQUMsU0FBUyxDQUFDLENBQ3hFLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUNuQyxDQUFDO1lBQ0QsSUFBSSxpQkFBaUI7Z0JBQ3BCLE9BQU8sZUFBZSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ25FLENBQUM7WUFDRCxLQUFLLENBQUMsb0JBQW9CLENBQUMsU0FBd0IsRUFBRSxPQUE2QjtnQkFDakYsSUFBSSxHQUFRLENBQUE7Z0JBQ1osSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7b0JBQzFCLEdBQUcsR0FBRyxTQUFTLENBQUE7b0JBQ2YsTUFBTSxlQUFlLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ3RELENBQUM7cUJBQU0sSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDMUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQ2YsTUFBTSxlQUFlLENBQUMsc0JBQXNCLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQzlFLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtnQkFDckMsQ0FBQztnQkFDRCxPQUFPLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUE7WUFDNUQsQ0FBQztZQUNELHlCQUF5QixDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVztnQkFDdkQsT0FBTyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUMzRSxRQUFRLEVBQ1IsT0FBTyxFQUNQLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELDJCQUEyQixDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVztnQkFDekQsT0FBTyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQywyQkFBMkIsQ0FBQyxDQUM3RSxRQUFRLEVBQ1IsT0FBTyxFQUNQLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELDBCQUEwQixDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVztnQkFDeEQsT0FBTyxpQkFBaUIsQ0FDdkIsc0NBQXNDLENBQUMsa0NBQWtDLENBQUMsU0FBUyxDQUFDLENBQ3BGLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1lBQ0QsSUFBSSx5QkFBeUI7Z0JBQzVCLE9BQU8saUJBQWlCLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLENBQUE7WUFDcEUsQ0FBQztZQUNELElBQUksMEJBQTBCO2dCQUM3QixPQUFPLGlCQUFpQixDQUFDLGVBQWUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO1lBQ3JFLENBQUM7WUFDRCwwQkFBMEIsQ0FDekIsUUFBZ0IsRUFDaEIsVUFBcUMsRUFDckMsT0FBK0MsRUFDL0MsWUFBOEM7Z0JBRTlDLE9BQU8sZUFBZSxDQUFDLDBCQUEwQixDQUNoRCxTQUFTLEVBQ1QsUUFBUSxFQUNSLFVBQVUsRUFDVixPQUFPLEVBQ1Asb0JBQW9CLENBQUMsU0FBUyxFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUMvRSxDQUFBO1lBQ0YsQ0FBQztZQUNELHdCQUF3QixFQUFFLENBQ3pCLFFBQXlCLEVBQ3pCLFFBQWMsRUFDZCxXQUF1QyxFQUN0QyxFQUFFO2dCQUNILE9BQU8saUJBQWlCLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQ2hFLFFBQVEsRUFDUixRQUFRLEVBQ1IsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0QsZ0JBQWdCLENBQ2YsT0FBZ0IsRUFDaEIsS0FBd0M7Z0JBRXhDLEtBQUssR0FBRyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7Z0JBQ2xELE9BQU8sY0FBYyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbEUsQ0FBQztZQUNELG1DQUFtQyxDQUNsQyxNQUFjLEVBQ2QsUUFBNEM7Z0JBRTVDLE9BQU8sK0JBQStCLENBQUMsbUNBQW1DLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQzdGLENBQUM7WUFDRCxvQkFBb0IsRUFBRSxDQUFDLElBQVksRUFBRSxRQUE2QixFQUFFLEVBQUU7Z0JBQ3JFLHFCQUFxQixDQUFDLE1BQU0sQ0FDM0IsNkJBQTZCLEVBQzdCLFNBQVMsRUFDVCxpRUFBaUUsQ0FDakUsQ0FBQTtnQkFFRCxPQUFPLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ25FLENBQUM7WUFDRCwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU87Z0JBQ25ELE9BQU8sa0JBQWtCLENBQ3hCLGlCQUFpQixDQUFDLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxFQUNsRix5QkFBeUIsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUMxRSxDQUFBO1lBQ0YsQ0FBQztZQUNELElBQUksRUFBRTtnQkFDTCxPQUFPLHlCQUF5QixDQUFDLEtBQUssQ0FBQTtZQUN2QyxDQUFDO1lBQ0QsMEJBQTBCLEVBQUUsQ0FBQyxNQUFjLEVBQUUsUUFBbUMsRUFBRSxFQUFFO2dCQUNuRix1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtnQkFDeEQsT0FBTyxhQUFhLENBQUMsNkJBQTZCLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3JFLENBQUM7WUFDRCwwQkFBMEIsRUFBRSxDQUFDLE1BQWMsRUFBRSxRQUFtQyxFQUFFLEVBQUU7Z0JBQ25GLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO2dCQUN4RCxPQUFPLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDckUsQ0FBQztZQUNELDRCQUE0QixFQUFFLENBQUMsTUFBYyxFQUFFLFFBQXFDLEVBQUUsRUFBRTtnQkFDdkYsa0ZBQWtGO2dCQUNsRix1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtnQkFDMUQsdUJBQXVCLENBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUE7Z0JBQ3pELE9BQU8sYUFBYSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUNwRSxDQUFDO1lBQ0QsMkJBQTJCLEVBQUUsQ0FBQyxNQUFjLEVBQUUsUUFBb0MsRUFBRSxFQUFFO2dCQUNyRix1QkFBdUIsQ0FBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtnQkFDekQsT0FBTyxhQUFhLENBQUMsMEJBQTBCLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ2xFLENBQUM7WUFDRCwyQkFBMkIsRUFBRSxDQUFDLE1BQWMsRUFBRSxRQUFvQyxFQUFFLEVBQUU7Z0JBQ3JGLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO2dCQUN6RCxPQUFPLGFBQWEsQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDbEUsQ0FBQztZQUNELCtCQUErQixFQUFFLENBQ2hDLGVBQXVCLEVBQ3ZCLFFBQXdDLEVBQ3ZDLEVBQUU7Z0JBQ0gsdUJBQXVCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUMvQyxPQUFPLGdCQUFnQixDQUFDLCtCQUErQixDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUNuRixDQUFDO1lBQ0QsOEJBQThCLEVBQUUsQ0FBQyxTQUF3QyxFQUFFLEVBQUU7Z0JBQzVFLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFDL0MsT0FBTyxtQkFBbUIsQ0FBQywrQkFBK0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN0RSxDQUFDO1lBQ0QsbUJBQW1CLEVBQUUsQ0FBQyxTQUFpQixFQUFFLEVBQUU7Z0JBQzFDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFDL0MsT0FBTyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN2RCxDQUFDO1lBQ0QsZ0JBQWdCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFO2dCQUNwRCxPQUFPLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxDQUMvRCxRQUFRLEVBQ1IsT0FBTyxFQUNQLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELGdCQUFnQixFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRTtnQkFDcEQsT0FBTyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsQ0FDL0QsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCxnQkFBZ0IsRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUU7Z0JBQ3BELE9BQU8saUJBQWlCLENBQUMsc0JBQXNCLENBQUMsZUFBZSxDQUFDLENBQy9ELFFBQVEsRUFDUixPQUFPLEVBQ1AsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0QsaUJBQWlCLEVBQUUsQ0FDbEIsUUFBZ0QsRUFDaEQsT0FBYSxFQUNiLFdBQWlDLEVBQ2hDLEVBQUU7Z0JBQ0gsT0FBTyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUNuRixRQUFRLEVBQ1IsT0FBTyxFQUNQLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELGlCQUFpQixFQUFFLENBQ2xCLFFBQWdELEVBQ2hELE9BQWEsRUFDYixXQUFpQyxFQUNoQyxFQUFFO2dCQUNILE9BQU8saUJBQWlCLENBQUMsc0JBQXNCLENBQUMsd0JBQXdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FDbkYsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCxpQkFBaUIsRUFBRSxDQUNsQixRQUFnRCxFQUNoRCxPQUFhLEVBQ2IsV0FBaUMsRUFDaEMsRUFBRTtnQkFDSCxPQUFPLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQ25GLFFBQVEsRUFDUixPQUFPLEVBQ1AsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0QsVUFBVSxFQUFFLENBQUMsT0FBNkIsRUFBRSxFQUFFO2dCQUM3Qyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQzdDLE9BQU8sb0JBQW9CLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtvQkFDekUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtvQkFDdEMsQ0FBQztvQkFDRCxPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDLENBQUMsQ0FBQTtZQUNILENBQUM7WUFDRCxJQUFJLE9BQU87Z0JBQ1YsdUJBQXVCLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUM3QyxPQUFPLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQ3pDLENBQUM7WUFDRCxrQkFBa0IsRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFRLEVBQUUsV0FBWSxFQUFFLEVBQUU7Z0JBQ3hELHVCQUF1QixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDN0MsT0FBTyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUNoRSxRQUFRLEVBQ1IsT0FBTyxFQUNQLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELDhCQUE4QixFQUFFLENBQy9CLFlBQTJDLEVBQzNDLFFBQXVDLEVBQ3RDLEVBQUU7Z0JBQ0gsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUE7Z0JBQ3JELE9BQU8sb0JBQW9CLENBQUMsK0JBQStCLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3BGLENBQUM7WUFDRCxzQkFBc0IsRUFBRSxDQUN2QixjQUFxQyxFQUNyQyxXQUFxQyxFQUNwQyxFQUFFO2dCQUNILHVCQUF1QixDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQTtnQkFDbkQsT0FBTyxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDaEYsQ0FBQztZQUNELHdCQUF3QixFQUFFLENBQUMsTUFBeUIsRUFBRSxRQUFpQyxFQUFFLEVBQUU7Z0JBQzFGLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFDOUMsT0FBTyxlQUFlLENBQUMsd0JBQXdCLENBQzlDLE1BQU0sRUFDTixRQUFRLEVBQ1IsU0FBUyxDQUFDLFVBQVUsRUFDcEIsZUFBZSxDQUFDLFNBQVMsQ0FDekIsQ0FBQTtZQUNGLENBQUM7WUFDRCxJQUFJLFNBQVM7Z0JBQ1osT0FBTyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUE7WUFDaEMsQ0FBQztZQUNELHFCQUFxQixFQUFFLENBQUMsT0FBNkMsRUFBRSxFQUFFO2dCQUN4RSx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtnQkFDcEQsT0FBTyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN2RCxDQUFDO1lBQ0Qsd0JBQXdCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUyxFQUFFLFdBQVksRUFBRSxFQUFFO2dCQUMvRCxPQUFPLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLHdCQUF3QixDQUFDLENBQ2xFLFFBQVEsRUFDUixRQUFRLEVBQ1IsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1lBQ0QsbUNBQW1DLEVBQUUsQ0FDcEMsTUFBYyxFQUNkLFFBQTRDLEVBQzNDLEVBQUU7Z0JBQ0gsdUJBQXVCLENBQUMsU0FBUyxFQUFFLDZCQUE2QixDQUFDLENBQUE7Z0JBQ2pFLE9BQU8sZ0JBQWdCLENBQUMsbUNBQW1DLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQzlFLENBQUM7WUFDRCwrQkFBK0IsRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFTLEVBQUUsV0FBWSxFQUFFLEVBQUU7Z0JBQ3RFLHVCQUF1QixDQUFDLFNBQVMsRUFBRSw2QkFBNkIsQ0FBQyxDQUFBO2dCQUNqRSxPQUFPLGlCQUFpQixDQUN2QixnQkFBZ0IsQ0FBQyx1Q0FBdUMsQ0FBQyxTQUFTLENBQUMsQ0FDbkUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ25DLENBQUM7WUFDRCw0QkFBNEIsRUFBRSxDQUFDLE1BQWMsRUFBRSxRQUFxQyxFQUFFLEVBQUU7Z0JBQ3ZGLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO2dCQUMxRCxPQUFPLGdCQUFnQixDQUFDLDRCQUE0QixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUN2RSxDQUFDO1lBQ0QsZUFBZSxFQUFFLENBQ2hCLEdBQWUsRUFDZixPQUEwQyxFQUMxQyxLQUErQixFQUM5QixFQUFFO2dCQUNILHVCQUF1QixDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO2dCQUMxRCxPQUFPLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDakUsQ0FBQztZQUNELE1BQU0sQ0FBQyxPQUFtQixFQUFFLEdBQTJCLEVBQUUsT0FBOEI7Z0JBQ3RGLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO2dCQUMxRCxPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3RELENBQUM7WUFDRCxNQUFNLENBQUMsT0FBZSxFQUFFLEdBQTJCLEVBQUUsT0FBOEI7Z0JBQ2xGLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO2dCQUMxRCxPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3RELENBQUM7U0FDRCxDQUFBO1FBRUQsaUJBQWlCO1FBQ2pCLE1BQU0sR0FBRyxHQUFzQjtZQUM5QixJQUFJLFFBQVE7Z0JBQ1gscUJBQXFCLENBQUMsTUFBTSxDQUMzQixjQUFjLEVBQ2QsU0FBUyxFQUNULHNDQUFzQyxDQUN0QyxDQUFBO2dCQUVELE9BQU8sVUFBVSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUUsQ0FBQSxDQUFDLHdDQUF3QztZQUN2RixDQUFDO1lBQ0QsbUJBQW1CLENBQUMsRUFBVSxFQUFFLEtBQWEsRUFBRSxPQUFvQjtnQkFDbEUsT0FBTyxVQUFVLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDckUsQ0FBQztTQUNELENBQUE7UUFFRCxzQkFBc0I7UUFDdEIsTUFBTSxRQUFRLEdBQTJCO1lBQ3hDLHVCQUF1QixDQUFDLEVBQVUsRUFBRSxLQUFhO2dCQUNoRCxPQUFPLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3BFLENBQUM7U0FDRCxDQUFBO1FBRUQsbUJBQW1CO1FBQ25CLE1BQU0sS0FBSyxHQUF3QjtZQUNsQyxJQUFJLGtCQUFrQjtnQkFDckIsT0FBTyxtQkFBbUIsQ0FBQyxrQkFBa0IsQ0FBQTtZQUM5QyxDQUFDO1lBQ0QsSUFBSSxrQkFBa0I7Z0JBQ3JCLE9BQU8sbUJBQW1CLENBQUMsa0JBQWtCLENBQUE7WUFDOUMsQ0FBQztZQUNELElBQUksV0FBVztnQkFDZCxPQUFPLG1CQUFtQixDQUFDLFdBQVcsQ0FBQTtZQUN2QyxDQUFDO1lBQ0QsSUFBSSxlQUFlO2dCQUNsQixPQUFPLG1CQUFtQixDQUFDLGVBQWUsQ0FBQTtZQUMzQyxDQUFDO1lBQ0Qsa0NBQWtDLENBQUMsRUFBRSxFQUFFLFFBQVE7Z0JBQzlDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO2dCQUN4RCxPQUFPLG1CQUFtQixDQUFDLGtDQUFrQyxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDdkYsQ0FBQztZQUNELHNDQUFzQyxDQUFDLEVBQUUsRUFBRSxRQUFRO2dCQUNsRCx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtnQkFDeEQsT0FBTyxtQkFBbUIsQ0FBQyw4QkFBOEIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ25GLENBQUM7WUFDRCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQ3RELE9BQU8saUJBQWlCLENBQUMsbUJBQW1CLENBQUMsc0JBQXNCLENBQUMsQ0FDbkUsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCwwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQzFELE9BQU8saUJBQWlCLENBQUMsbUJBQW1CLENBQUMsMEJBQTBCLENBQUMsQ0FDdkUsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCw2QkFBNkIsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQzdELE9BQU8saUJBQWlCLENBQUMsbUJBQW1CLENBQUMsNkJBQTZCLENBQUMsQ0FDMUUsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCxtQ0FBbUMsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQ25FLE9BQU8saUJBQWlCLENBQUMsbUJBQW1CLENBQUMsbUNBQW1DLENBQUMsQ0FDaEYsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsUUFBUyxFQUFFLFdBQVk7Z0JBQ3ZELE9BQU8saUJBQWlCLENBQUMsbUJBQW1CLENBQUMsc0JBQXNCLENBQUMsQ0FDbkUsUUFBUSxFQUNSLFFBQVEsRUFDUixXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCwwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsT0FBUSxFQUFFLFdBQVk7Z0JBQzFELE9BQU8saUJBQWlCLENBQUMsbUJBQW1CLENBQUMsMEJBQTBCLENBQUMsQ0FDdkUsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCxrQ0FBa0MsQ0FDakMsU0FBaUIsRUFDakIsUUFBMkMsRUFDM0MsV0FBMEQ7Z0JBRTFELE9BQU8sbUJBQW1CLENBQUMsa0NBQWtDLENBQzVELFNBQVMsRUFDVCxRQUFRLEVBQ1IsV0FBVyxJQUFJLHFDQUFxQyxDQUFDLE9BQU8sQ0FDNUQsQ0FBQTtZQUNGLENBQUM7WUFDRCxxQ0FBcUMsQ0FDcEMsU0FBaUIsRUFDakIsT0FBNkM7Z0JBRTdDLE9BQU8sbUJBQW1CLENBQUMscUNBQXFDLENBQy9ELFNBQVMsRUFDVCxTQUFTLEVBQ1QsT0FBTyxDQUNQLENBQUE7WUFDRixDQUFDO1lBQ0Qsa0NBQWtDLENBQ2pDLFNBQWlCLEVBQ2pCLE9BQTBDO2dCQUUxQyxPQUFPLG1CQUFtQixDQUFDLGtDQUFrQyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNsRixDQUFDO1lBQ0QsY0FBYyxDQUNiLE1BQTBDLEVBQzFDLFlBQWdELEVBQ2hELHNCQUF5RTtnQkFFekUsSUFDQyxDQUFDLHNCQUFzQjtvQkFDdkIsQ0FBQyxPQUFPLHNCQUFzQixLQUFLLFFBQVEsSUFBSSxlQUFlLElBQUksc0JBQXNCLENBQUMsRUFDeEYsQ0FBQztvQkFDRixPQUFPLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsWUFBWSxFQUFFO3dCQUMvRCxhQUFhLEVBQUUsc0JBQXNCO3FCQUNyQyxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztnQkFDRCxPQUFPLG1CQUFtQixDQUFDLGNBQWMsQ0FDeEMsTUFBTSxFQUNOLFlBQVksRUFDWixzQkFBc0IsSUFBSSxFQUFFLENBQzVCLENBQUE7WUFDRixDQUFDO1lBQ0QsYUFBYSxDQUFDLE9BQTZCO2dCQUMxQyxPQUFPLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNsRCxDQUFDO1lBQ0QsY0FBYyxDQUFDLFdBQXlDO2dCQUN2RCxPQUFPLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUN2RCxDQUFDO1lBQ0QsaUJBQWlCLENBQUMsV0FBeUM7Z0JBQzFELE9BQU8sbUJBQW1CLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDMUQsQ0FBQztZQUNELGdCQUFnQixDQUNmLE1BQWtDLEVBQ2xDLE9BQTZCO2dCQUU3QixPQUFPLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUM3RCxDQUFDO1NBQ0QsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUF3QjtZQUNsQyxvQkFBb0IsRUFBRSxDQUFDLElBQVksRUFBRSxRQUE2QixFQUFFLEVBQUU7Z0JBQ3JFLE9BQU8sV0FBVyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDbkUsQ0FBQztZQUNELFVBQVUsRUFBRSxDQUFDLE1BQTBCLEVBQTJCLEVBQUU7Z0JBQ25FLE9BQU8sV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN0QyxDQUFDO1lBQ0QsV0FBVyxFQUFFLENBQUMsSUFBaUIsRUFBa0MsRUFBRTtnQkFDbEUsT0FBTyxXQUFXLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNoRCxDQUFDO1lBQ0QsSUFBSSxjQUFjO2dCQUNqQixPQUFPLFdBQVcsQ0FBQyxjQUFjLENBQUE7WUFDbEMsQ0FBQztZQUNELGNBQWMsRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFTLEVBQUUsV0FBWSxFQUFFLEVBQUU7Z0JBQ3RELE9BQU8saUJBQWlCLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDdkYsQ0FBQztZQUNELFlBQVksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFTLEVBQUUsV0FBWSxFQUFFLEVBQUU7Z0JBQ3BELE9BQU8saUJBQWlCLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDckYsQ0FBQztZQUNELHFCQUFxQixFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVMsRUFBRSxXQUFZLEVBQUUsRUFBRTtnQkFDN0QsT0FBTyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsQ0FDMUQsU0FBUyxFQUNULFFBQVEsRUFDUixXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCxtQkFBbUIsRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFTLEVBQUUsV0FBWSxFQUFFLEVBQUU7Z0JBQzNELE9BQU8saUJBQWlCLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUM1RixDQUFDO1lBQ0QsNkJBQTZCLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUyxFQUFFLFdBQVksRUFBRSxFQUFFO2dCQUNyRSx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtnQkFDOUQsT0FBTyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsNkJBQTZCLENBQUMsQ0FDbEUsU0FBUyxFQUNULFFBQVEsRUFDUixXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCwyQkFBMkIsRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFTLEVBQUUsV0FBWSxFQUFFLEVBQUU7Z0JBQ25FLHVCQUF1QixDQUFDLFNBQVMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO2dCQUM5RCxPQUFPLGlCQUFpQixDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxDQUNoRSxTQUFTLEVBQ1QsUUFBUSxFQUNSLFdBQVcsQ0FDWCxDQUFBO1lBQ0YsQ0FBQztTQUNELENBQUE7UUFFRCxzQkFBc0I7UUFDdEIsTUFBTSxTQUFTLEdBQTRCO1lBQzFDLHdCQUF3QixDQUN2QixFQUFVLEVBQ1YsWUFBb0IsRUFDcEIsS0FBYSxFQUNiLE9BQVEsRUFDUixlQUFpRDtnQkFFakQsT0FBTyxzQkFBc0IsQ0FBQyx3QkFBd0IsQ0FDckQsU0FBUyxFQUNULEVBQUUsRUFDRixZQUFZLEVBQ1osS0FBSyxFQUNMLE9BQU8sRUFDUCxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQ2xGLENBQUE7WUFDRixDQUFDO1lBQ0QseUNBQXlDLEVBQUUsQ0FDMUMsWUFBb0IsRUFDcEIsUUFBa0QsRUFDakQsRUFBRTtnQkFDSCxPQUFPLGVBQWUsQ0FBQyx5Q0FBeUMsQ0FDL0QsU0FBUyxFQUNULFlBQVksRUFDWixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCx1QkFBdUIsQ0FBQyxVQUFVO2dCQUNqQyxPQUFPLHdCQUF3QixDQUFDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUMvRSxDQUFDO1lBQ0QscUNBQXFDLENBQUMsWUFBb0I7Z0JBQ3pELHVCQUF1QixDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO2dCQUMxRCxPQUFPLHNCQUFzQixDQUFDLHFDQUFxQyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUM3RixDQUFDO1lBQ0Qsa0NBQWtDLENBQ2pDLFlBQW9CLEVBQ3BCLFFBQW1EO2dCQUVuRCx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtnQkFDMUQsT0FBTyxzQkFBc0IsQ0FBQyxrQ0FBa0MsQ0FDL0QsU0FBUyxFQUNULFlBQVksRUFDWixRQUFRLENBQ1IsQ0FBQTtZQUNGLENBQUM7WUFDRCxxQ0FBcUMsQ0FBQyxRQUFRLEVBQUUsUUFBUyxFQUFFLFdBQVk7Z0JBQ3RFLHVCQUF1QixDQUFDLFNBQVMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO2dCQUNoRSxPQUFPLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLHFDQUFxQyxDQUFDLENBQ3JGLFFBQVEsRUFDUixRQUFRLEVBQ1IsV0FBVyxDQUNYLENBQUE7WUFDRixDQUFDO1NBQ0QsQ0FBQTtRQUVELGtCQUFrQjtRQUNsQixNQUFNLElBQUksR0FBdUI7WUFDaEMsQ0FBQyxDQUNBLEdBQUcsTUFTQztnQkFFSixJQUFJLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNuQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFZLENBQUE7b0JBRXBDLHFIQUFxSDtvQkFDckgsd0ZBQXdGO29CQUN4RixNQUFNLGFBQWEsR0FBRyxDQUFDLE1BQU0sSUFBSSxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNuRixPQUFPLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRTt3QkFDakUsT0FBTyxFQUFFLEdBQUc7d0JBQ1osSUFBSSxFQUFFLGFBQXlEO3FCQUMvRCxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztnQkFFRCxPQUFPLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM3RSxDQUFDO1lBQ0QsSUFBSSxNQUFNO2dCQUNULE9BQU8sbUJBQW1CLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDakUsQ0FBQztZQUNELElBQUksR0FBRztnQkFDTixPQUFPLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3BFLENBQUM7U0FDRCxDQUFBO1FBRUQseUJBQXlCO1FBQ3pCLE1BQU0sV0FBVyxHQUE4QjtZQUM5QyxrQkFBa0IsQ0FBQyxXQUF1QjtnQkFDekMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUNqRCxPQUFPLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQzFELENBQUM7U0FDRCxDQUFBO1FBRUQsZ0JBQWdCO1FBQ2hCLE1BQU0sRUFBRSxHQUFxQjtZQUM1QixxQkFBcUIsQ0FDcEIsS0FBYSxFQUNiLEtBQXNDO2dCQUV0Qyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtnQkFDMUQsT0FBTywyQkFBMkIsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2xGLENBQUM7WUFDRCxrQ0FBa0MsQ0FDakMsSUFBbUMsRUFDbkMsUUFBMkM7Z0JBRTNDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO2dCQUMxRCxPQUFPLDJCQUEyQixDQUFDLGtDQUFrQyxDQUNwRSxTQUFTLEVBQ1QsSUFBSSxFQUNKLFFBQVEsQ0FDUixDQUFBO1lBQ0YsQ0FBQztZQUNELCtCQUErQixDQUFDLEtBQWEsRUFBRSxRQUF3QztnQkFDdEYsdUJBQXVCLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLENBQUE7Z0JBQzFELE9BQU8sd0JBQXdCLENBQUMsK0JBQStCLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUM1RixDQUFDO1NBQ0QsQ0FBQTtRQUVELGtCQUFrQjtRQUNsQixNQUFNLElBQUksR0FBdUI7WUFDaEMsNEJBQTRCLENBQzNCLEVBQVUsRUFDVixRQUFxQyxFQUNyQyxRQUE2QztnQkFFN0MsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFBO2dCQUNsRCxPQUFPLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3RGLENBQUM7WUFDRCwyQkFBMkIsQ0FDMUIsU0FBa0MsRUFDbEMsU0FBcUM7Z0JBRXJDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO2dCQUN6RCxzQkFBc0I7Z0JBQ3RCLE9BQU8sRUFBRSxPQUFPLEtBQUksQ0FBQyxFQUFFLENBQUE7WUFDeEIsQ0FBQztZQUNELDRCQUE0QixDQUFDLFFBQXFDO2dCQUNqRSx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtnQkFDekQsT0FBTyxpQkFBaUIsQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDMUUsQ0FBQztZQUNELHFCQUFxQixDQUFDLEVBQVUsRUFBRSxPQUEwQztnQkFDM0UsT0FBTyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNsRSxDQUFDO1lBQ0QsNEJBQTRCLENBQzNCLEVBQVUsRUFDVixZQUFnRCxFQUNoRCxPQUEwQztnQkFFMUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLHdCQUF3QixDQUFDLENBQUE7Z0JBQzVELE9BQU8sa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDdkYsQ0FBQztZQUNELHdDQUF3QyxDQUFDLFFBQWlEO2dCQUN6Rix1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtnQkFDNUQsT0FBTyxrQkFBa0IsQ0FBQyx3Q0FBd0MsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDeEYsQ0FBQztZQUNELDRCQUE0QixDQUMzQixRQUF5QyxFQUN6QyxRQUFpRDtnQkFFakQsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUNqRCxPQUFPLGtCQUFrQixDQUFDLDRCQUE0QixDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDdEYsQ0FBQztZQUNELHVCQUF1QixFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVMsRUFBRSxXQUFZLEVBQUUsRUFBRTtnQkFDL0QsdUJBQXVCLENBQUMsU0FBUyxFQUFFLHdCQUF3QixDQUFDLENBQUE7Z0JBQzVELE9BQU8saUJBQWlCLENBQUMsa0JBQWtCLENBQUMsdUJBQXVCLENBQUMsQ0FDbkUsU0FBUyxFQUNULFFBQVEsRUFDUixXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7U0FDRCxDQUFBO1FBRUQsZ0JBQWdCO1FBQ2hCLE1BQU0sRUFBRSxHQUFxQjtZQUM1QixnQkFBZ0IsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUM5QixPQUFPLHFCQUFxQixDQUFDLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxRQUFRLElBQUksRUFBRSxDQUFDLENBQUE7WUFDN0UsQ0FBQztZQUNELHFCQUFxQixFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVMsRUFBRSxXQUFZLEVBQUUsRUFBRTtnQkFDNUQsT0FBTyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ25GLENBQUM7WUFDRCx5QkFBeUIsRUFBRSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUU7Z0JBQ3JELHVCQUF1QixDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQTtnQkFDbEQsT0FBTyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUN0RixDQUFDO1lBQ0QsaUJBQWlCO1lBQ2pCLElBQUksZUFBZTtnQkFDbEIsdUJBQXVCLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFBO2dCQUNoRCxPQUFPLGlCQUFpQixDQUFDLGdCQUFnQixDQUFBO1lBQzFDLENBQUM7WUFDRCwwQkFBMEIsRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFTLEVBQUUsV0FBWSxFQUFFLEVBQUU7Z0JBQ2pFLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTtnQkFDaEQsT0FBTyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUN0RSxDQUFDO1lBQ0QsMEJBQTBCLENBQUMsZUFBZSxFQUFFLFFBQVE7Z0JBQ25ELHVCQUF1QixDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTtnQkFDaEQsT0FBTyxpQkFBaUIsQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQzFGLENBQUM7WUFDRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxLQUFNO2dCQUNyRCx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUE7Z0JBQ2hELElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQy9CLE9BQU8saUJBQWlCLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDMUUsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8saUJBQWlCLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDMUUsQ0FBQztZQUNGLENBQUM7WUFDRCxZQUFZLENBQUksSUFBWSxFQUFFLElBQWlDO2dCQUM5RCxPQUFPLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3JFLENBQUM7WUFDRCxVQUFVLENBQ1QsSUFBWSxFQUNaLFVBQXdELEVBQ3hELEtBQWdDO2dCQUVoQyxPQUFPLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNoRixDQUFDO1lBQ0QsSUFBSSxLQUFLO2dCQUNSLE9BQU8seUJBQXlCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3JELENBQUM7WUFDRCxhQUFhLENBQUMsR0FBZSxFQUFFLEtBQStCO2dCQUM3RCxPQUFPLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2xFLENBQUM7WUFDRCwyQkFBMkIsQ0FBQyxRQUFpRDtnQkFDNUUsT0FBTyxxQkFBcUIsQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDOUUsQ0FBQztZQUNELGdDQUFnQyxDQUFDLEVBQUUsRUFBRSxRQUFRO2dCQUM1Qyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtnQkFDOUQsT0FBTyxVQUFVLENBQUMsZ0NBQWdDLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUM1RSxDQUFDO1NBQ0QsQ0FBQTtRQUVELG9CQUFvQjtRQUNwQixNQUFNLE1BQU0sR0FBeUI7WUFDcEMsc0JBQXNCLENBQUMsRUFBVSxFQUFFLFFBQStCO2dCQUNqRSx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQzVDLE9BQU8sYUFBYSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQzFFLENBQUM7U0FDRCxDQUFBO1FBRUQsbUVBQW1FO1FBQ25FLE9BQXNCO1lBQ3JCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztZQUN6QixhQUFhO1lBQ2IsRUFBRTtZQUNGLGNBQWM7WUFDZCxRQUFRO1lBQ1IsUUFBUTtZQUNSLElBQUk7WUFDSixLQUFLO1lBQ0wsR0FBRztZQUNILFVBQVU7WUFDVixXQUFXO1lBQ1gsSUFBSTtZQUNKLFNBQVM7WUFDVCxFQUFFO1lBQ0YsU0FBUztZQUNULEdBQUc7WUFDSCxNQUFNO1lBQ04sS0FBSztZQUNMLEtBQUs7WUFDTCxNQUFNO1lBQ04sU0FBUztZQUNULFFBQVE7WUFDUixVQUFVLEVBQUUsWUFBWSxDQUFDLFVBQVU7WUFDbkMsb0JBQW9CLEVBQUUsWUFBWSxDQUFDLG9CQUFvQjtZQUN2RCxzQkFBc0IsRUFBRSxZQUFZLENBQUMsc0JBQXNCO1lBQzNELGlCQUFpQixFQUFFLFlBQVksQ0FBQyxpQkFBaUI7WUFDakQsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLGtCQUFrQjtZQUNuRCx1QkFBdUIsRUFBRSxZQUFZLENBQUMsdUJBQXVCO1lBQzdELHlCQUF5QixFQUFFLFlBQVksQ0FBQyx5QkFBeUI7WUFDakUsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLGlCQUFpQjtZQUNqRCx5QkFBeUIsRUFBRSxZQUFZLENBQUMseUJBQXlCO1lBQ2pFLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7WUFDM0MsdUJBQXVCLEVBQUUsdUJBQXVCO1lBQ2hELG1CQUFtQixFQUFFLG1CQUFtQjtZQUN4QyxVQUFVLEVBQUUsWUFBWSxDQUFDLFVBQVU7WUFDbkMsY0FBYyxFQUFFLFlBQVksQ0FBQyxjQUFjO1lBQzNDLHFCQUFxQixFQUFFLFlBQVksQ0FBQyxxQkFBcUI7WUFDekQsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRO1lBQy9CLEtBQUssRUFBRSxZQUFZLENBQUMsS0FBSztZQUN6QixnQkFBZ0IsRUFBRSxZQUFZLENBQUMsZ0JBQWdCO1lBQy9DLGlCQUFpQixFQUFFLFlBQVksQ0FBQyxpQkFBaUI7WUFDakQsY0FBYyxFQUFFLFlBQVksQ0FBQyxjQUFjO1lBQzNDLFdBQVcsRUFBRSxZQUFZLENBQUMsV0FBVztZQUNyQyxZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDdkMsNkJBQTZCLEVBQUUsWUFBWSxDQUFDLDZCQUE2QjtZQUN6RSxrQkFBa0IsRUFBRSxZQUFZLENBQUMsa0JBQWtCO1lBQ25ELDBCQUEwQixFQUFFLFlBQVksQ0FBQywwQkFBMEI7WUFDbkUsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLGtCQUFrQjtZQUNuRCxjQUFjLEVBQUUsWUFBWSxDQUFDLGNBQWM7WUFDM0Msa0JBQWtCLEVBQUUsWUFBWSxDQUFDLGtCQUFrQjtZQUNuRCxpQkFBaUIsRUFBRSxZQUFZLENBQUMsaUJBQWlCO1lBQ2pELGNBQWMsRUFBRSxZQUFZLENBQUMsY0FBYztZQUMzQyxxQkFBcUIsRUFBRSxZQUFZLENBQUMscUJBQXFCO1lBQ3pELG1CQUFtQixFQUFFLFlBQVksQ0FBQyxtQkFBbUI7WUFDckQsZUFBZSxFQUFFLFlBQVksQ0FBQyxlQUFlO1lBQzdDLHNCQUFzQixFQUFFLFlBQVksQ0FBQyxzQkFBc0I7WUFDM0QsZ0NBQWdDLEVBQUUsWUFBWSxDQUFDLGdDQUFnQztZQUMvRSwyQkFBMkIsRUFBRSxZQUFZLENBQUMsMkJBQTJCO1lBQ3JFLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxrQkFBa0I7WUFDbkQscUNBQXFDLEVBQUUscUNBQXFDO1lBQzVFLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxnQkFBZ0I7WUFDL0Msa0JBQWtCLEVBQUUsWUFBWSxDQUFDLGtCQUFrQjtZQUNuRCx1QkFBdUIsRUFBRSxZQUFZLENBQUMsdUJBQXVCO1lBQzdELFVBQVUsRUFBRSxZQUFZLENBQUMsVUFBVTtZQUNuQyw0QkFBNEIsRUFBRSxZQUFZLENBQUMsNEJBQTRCO1lBQ3ZFLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxrQkFBa0I7WUFDbkQsYUFBYSxFQUFFLFlBQVksQ0FBQyxhQUFhO1lBQ3pDLFVBQVUsRUFBRSxZQUFZLENBQUMsVUFBVTtZQUNuQyxpQkFBaUIsRUFBRSxZQUFZLENBQUMsaUJBQWlCO1lBQ2pELHFCQUFxQixFQUFFLFlBQVksQ0FBQyxxQkFBcUI7WUFDekQsc0JBQXNCLEVBQUUsWUFBWSxDQUFDLHNCQUFzQjtZQUMzRCxZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDdkMsY0FBYyxFQUFFLFlBQVksQ0FBQyxjQUFjO1lBQzNDLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUztZQUNqQyw4QkFBOEIsRUFBRSxZQUFZLENBQUMsOEJBQThCO1lBQzNFLHFCQUFxQixFQUFFLFlBQVksQ0FBQyxxQkFBcUI7WUFDekQsZUFBZSxFQUFFLFlBQVksQ0FBQyxlQUFlO1lBQzdDLHlCQUF5QixFQUFFLFlBQVksQ0FBQyx5QkFBeUI7WUFDakUsZ0NBQWdDLEVBQUUsWUFBWSxDQUFDLGdDQUFnQztZQUMvRSwyQkFBMkIsRUFBRSxZQUFZLENBQUMsMkJBQTJCO1lBQ3JFLFlBQVksRUFBRSxPQUFPO1lBQ3JCLGFBQWEsRUFBRSxZQUFZLENBQUMsYUFBYTtZQUN6QyxhQUFhLEVBQUUsWUFBWSxDQUFDLGFBQWE7WUFDekMseUJBQXlCLEVBQUUsWUFBWSxDQUFDLHlCQUF5QjtZQUNqRSxjQUFjLEVBQUUsWUFBWSxDQUFDLGNBQWM7WUFDM0MsY0FBYyxFQUFFLFlBQVksQ0FBQyxjQUFjO1lBQzNDLGVBQWUsRUFBRSxZQUFZLENBQUMsY0FBYztZQUM1QyxlQUFlLEVBQUUsWUFBWSxDQUFDLGVBQWU7WUFDN0MsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLGNBQWMsRUFBRSxLQUFLLENBQUMsY0FBYztZQUNwQyxZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDdkMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLGdCQUFnQjtZQUMvQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsa0JBQWtCO1lBQ25ELG9CQUFvQixFQUFFLFlBQVksQ0FBQyxnQkFBZ0I7WUFDbkQsb0JBQW9CLEVBQUUsWUFBWSxDQUFDLG9CQUFvQjtZQUN2RCxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUs7WUFDekIsWUFBWSxFQUFFLFlBQVksQ0FBQyxZQUFZO1lBQ3ZDLG9CQUFvQixFQUFFLFlBQVksQ0FBQyxvQkFBb0I7WUFDdkQsWUFBWSxFQUFFLHFCQUFxQixDQUFDLFlBQVk7WUFDaEQsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRO1lBQy9CLGNBQWMsRUFBRSxZQUFZLENBQUMsY0FBYztZQUMzQyxpQkFBaUIsRUFBRSxpQkFBaUI7WUFDcEMsb0JBQW9CLEVBQUUsWUFBWSxDQUFDLG9CQUFvQjtZQUN2RCxxQkFBcUIsRUFBRSxZQUFZLENBQUMscUJBQXFCO1lBQ3pELFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUTtZQUMvQixnQkFBZ0IsRUFBRSxZQUFZLENBQUMsZ0JBQWdCO1lBQy9DLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxnQkFBZ0I7WUFDL0Msd0JBQXdCLEVBQUUsWUFBWSxDQUFDLHdCQUF3QjtZQUMvRCxpQkFBaUIsRUFBRSxZQUFZLENBQUMsaUJBQWlCO1lBQ2pELEtBQUssRUFBRSxZQUFZLENBQUMsS0FBSztZQUN6QixlQUFlLEVBQUUsWUFBWSxDQUFDLGVBQWU7WUFDN0MsU0FBUyxFQUFFLFlBQVksQ0FBQyxTQUFTO1lBQ2pDLGNBQWMsRUFBRSxZQUFZLENBQUMsY0FBYztZQUMzQyxjQUFjLEVBQUUsWUFBWSxDQUFDLGNBQWM7WUFDM0MscUJBQXFCLEVBQUUsWUFBWSxDQUFDLHFCQUFxQjtZQUN6RCxrQkFBa0IsRUFBRSxZQUFZLENBQUMsa0JBQWtCO1lBQ25ELG1CQUFtQixFQUFFLFlBQVksQ0FBQyxtQkFBbUI7WUFDckQsb0JBQW9CLEVBQUUsWUFBWSxDQUFDLG9CQUFvQjtZQUN2RCxjQUFjLEVBQUUsWUFBWSxDQUFDLGNBQWM7WUFDM0MsWUFBWSxFQUFFLFlBQVksQ0FBQyxZQUFZO1lBQ3ZDLGFBQWEsRUFBRSxZQUFZLENBQUMsYUFBYTtZQUN6Qyx3QkFBd0IsRUFBRSxZQUFZLENBQUMsd0JBQXdCO1lBQy9ELG9CQUFvQixFQUFFLFlBQVksQ0FBQyxvQkFBb0I7WUFDdkQsYUFBYSxFQUFFLFlBQVksQ0FBQyxhQUFhO1lBQ3pDLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxnQkFBZ0I7WUFDL0MsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLGlCQUFpQjtZQUNqRCxrQkFBa0IsRUFBRSxZQUFZLENBQUMsa0JBQWtCO1lBQ25ELGlCQUFpQixFQUFFLFlBQVksQ0FBQyxpQkFBaUI7WUFDakQsVUFBVSxFQUFFLFlBQVksQ0FBQyxVQUFVO1lBQ25DLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUztZQUNqQyxJQUFJLEVBQUUsWUFBWSxDQUFDLElBQUk7WUFDdkIsYUFBYSxFQUFFLFlBQVksQ0FBQyxhQUFhO1lBQ3pDLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUztZQUNqQyxhQUFhLEVBQUUsWUFBWSxDQUFDLGFBQWE7WUFDekMsY0FBYyxFQUFFLFlBQVksQ0FBQyxjQUFjO1lBQzNDLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUztZQUNqQyxZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDdkMsK0JBQStCLEVBQUUsWUFBWSxDQUFDLHVCQUF1QjtZQUNyRSxzQkFBc0IsRUFBRSxZQUFZLENBQUMsc0JBQXNCO1lBQzNELGdCQUFnQixFQUFFLFlBQVksQ0FBQyxnQkFBZ0I7WUFDL0MsZUFBZSxFQUFFLFlBQVksQ0FBQyxlQUFlO1lBQzdDLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxrQkFBa0I7WUFDbkQsMkNBQTJDLEVBQzFDLFlBQVksQ0FBQywyQ0FBMkM7WUFDekQsc0JBQXNCLEVBQUUsWUFBWSxDQUFDLHNCQUFzQjtZQUMzRCwwQkFBMEIsRUFBRSxZQUFZLENBQUMsMEJBQTBCO1lBQ25FLHNCQUFzQixFQUFFLFlBQVksQ0FBQyxzQkFBc0I7WUFDM0QsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLGlCQUFpQjtZQUNqRCxzQkFBc0IsRUFBRSxZQUFZLENBQUMsc0JBQXNCO1lBQzNELFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUTtZQUMvQixlQUFlLEVBQUUsWUFBWSxDQUFDLGVBQWU7WUFDN0MscUJBQXFCLEVBQUUscUJBQXFCO1lBQzVDLG9CQUFvQixFQUFFLFlBQVksQ0FBQyxvQkFBb0I7WUFDdkQsMEJBQTBCLEVBQUUsWUFBWSxDQUFDLDBCQUEwQjtZQUNuRSxvQkFBb0IsRUFBRSxZQUFZLENBQUMsb0JBQW9CO1lBQ3ZELDZCQUE2QixFQUFFLFlBQVksQ0FBQyw2QkFBNkI7WUFDekUsZUFBZSxFQUFFLFlBQVksQ0FBQyxlQUFlO1lBQzdDLHdCQUF3QixFQUFFLFlBQVksQ0FBQyx3QkFBd0I7WUFDL0QsVUFBVSxFQUFFLFlBQVksQ0FBQyxVQUFVO1lBQ25DLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUztZQUNqQyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVE7WUFDL0IscUJBQXFCLEVBQUUsWUFBWSxDQUFDLHFCQUFxQjtZQUN6RCx3QkFBd0IsRUFBRSxZQUFZLENBQUMsd0JBQXdCO1lBQy9ELGlCQUFpQixFQUFFLFlBQVksQ0FBQyxpQkFBaUI7WUFDakQsTUFBTSxFQUFFLE1BQU07WUFDZCxHQUFHLEVBQUUsR0FBRztZQUNSLFVBQVUsRUFBRSxZQUFZLENBQUMsVUFBVTtZQUNuQyxhQUFhLEVBQUUsWUFBWSxDQUFDLGFBQWE7WUFDekMscUJBQXFCO1lBQ3JCLHdCQUF3QixFQUFFLFlBQVksQ0FBQyx3QkFBd0I7WUFDL0QsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLGdCQUFnQjtZQUMvQywyQkFBMkIsRUFBRSxZQUFZLENBQUMsMkJBQTJCO1lBQ3JFLGlCQUFpQixFQUFFLFlBQVksQ0FBQyxpQkFBaUI7WUFDakQsU0FBUyxFQUFFLFlBQVksQ0FBQyxTQUFTO1lBQ2pDLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxrQkFBa0I7WUFDbkQsYUFBYSxFQUFFLFlBQVksQ0FBQyxhQUFhO1lBQ3pDLDRCQUE0QixFQUFFLFlBQVksQ0FBQyw0QkFBNEI7WUFDdkUsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLGlCQUFpQjtZQUNqRCx3QkFBd0IsRUFBRSxZQUFZLENBQUMsd0JBQXdCO1lBQy9ELG1DQUFtQyxFQUFFLFlBQVksQ0FBQyxtQ0FBbUM7WUFDckYsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLGdCQUFnQjtZQUMvQyxZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDdkMsYUFBYSxFQUFFLFlBQVksQ0FBQyxhQUFhO1lBQ3pDLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxnQkFBZ0I7WUFDL0MsMEJBQTBCLEVBQUUsWUFBWSxDQUFDLDBCQUEwQjtZQUNuRSxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsZ0JBQWdCO1lBQy9DLFlBQVksRUFBRSxZQUFZLENBQUMsWUFBWTtZQUN2QyxzQkFBc0IsRUFBRSxZQUFZLENBQUMsc0JBQXNCO1lBQzNELDhCQUE4QixFQUFFLFlBQVksQ0FBQyw4QkFBOEI7WUFDM0Usd0JBQXdCLEVBQUUsWUFBWSxDQUFDLHdCQUF3QjtZQUMvRCxrQkFBa0IsRUFBRSxZQUFZLENBQUMsa0JBQWtCO1lBQ25ELHNCQUFzQixFQUFFLFlBQVksQ0FBQyxzQkFBc0I7WUFDM0QsbUJBQW1CLEVBQUUsWUFBWSxDQUFDLG1CQUFtQjtZQUNyRCx5QkFBeUIsRUFBRSxZQUFZLENBQUMseUJBQXlCO1lBQ2pFLDBCQUEwQixFQUFFLFlBQVksQ0FBQywwQkFBMEI7WUFDbkUsMkJBQTJCLEVBQUUsWUFBWSxDQUFDLDJCQUEyQjtZQUNyRSxZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDdkMsMEJBQTBCLEVBQUUsWUFBWSxDQUFDLDBCQUEwQjtZQUNuRSw0QkFBNEIsRUFBRSxZQUFZLENBQUMsNEJBQTRCO1lBQ3ZFLGNBQWMsRUFBRSxZQUFZLENBQUMsY0FBYztZQUMzQyxtQkFBbUIsRUFBRSxZQUFZLENBQUMsbUJBQW1CO1lBQ3JELGVBQWUsRUFBRSxZQUFZLENBQUMsZUFBZTtZQUM3QyxjQUFjLEVBQUUsWUFBWSxDQUFDLGNBQWM7WUFDM0MsV0FBVyxFQUFFLFlBQVksQ0FBQyxXQUFXO1lBQ3JDLHFCQUFxQixFQUFFLFlBQVksQ0FBQyxxQkFBcUI7WUFDekQsT0FBTyxFQUFFLFlBQVksQ0FBQyxPQUFPO1lBQzdCLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxrQkFBa0I7WUFDbkQsNkJBQTZCLEVBQUUsNkJBQTZCO1lBQzVELFlBQVksRUFBRSxZQUFZLENBQUMsWUFBWTtZQUN2QyxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsZ0JBQWdCO1lBQy9DLGlCQUFpQixFQUFFLFlBQVksQ0FBQyxpQkFBaUI7WUFDakQsWUFBWSxFQUFFLFlBQVksQ0FBQyxZQUFZO1lBQ3ZDLGlCQUFpQixFQUFFLFlBQVksQ0FBQyxpQkFBaUI7WUFDakQsY0FBYyxFQUFFLFlBQVksQ0FBQyxjQUFjO1lBQzNDLG1CQUFtQixFQUFFLFlBQVksQ0FBQyxtQkFBbUI7WUFDckQsbUJBQW1CLEVBQUUsWUFBWSxDQUFDLG1CQUFtQjtZQUNyRCxzQkFBc0IsRUFBRSxZQUFZLENBQUMsc0JBQXNCO1lBQzNELGlCQUFpQixFQUFFLFlBQVksQ0FBQyxpQkFBaUI7WUFDakQsMEJBQTBCLEVBQUUsWUFBWSxDQUFDLDBCQUEwQjtZQUNuRSxZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDdkMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLGdCQUFnQjtZQUMvQyxpQkFBaUIsRUFBRSxZQUFZLENBQUMsaUJBQWlCO1lBQ2pELGNBQWMsRUFBRSxZQUFZLENBQUMsb0JBQW9CO1lBQ2pELGdCQUFnQixFQUFFLFlBQVksQ0FBQyxzQkFBc0I7WUFDckQsb0JBQW9CLEVBQUUsWUFBWSxDQUFDLDBCQUEwQjtZQUM3RCxlQUFlLEVBQUUsWUFBWSxDQUFDLHFCQUFxQjtZQUNuRCxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsc0JBQXNCO1lBQ3JELHlCQUF5QixFQUFFLFlBQVksQ0FBQyxzQkFBc0I7WUFDOUQsWUFBWSxFQUFFLFlBQVksQ0FBQyxrQkFBa0I7WUFDN0MscUJBQXFCLEVBQUUsWUFBWSxDQUFDLHFCQUFxQjtZQUN6RCxxQkFBcUIsRUFBRSxxQkFBcUI7WUFDNUMsUUFBUSxFQUFFLFFBQVE7WUFDbEIsd0JBQXdCLEVBQUUsd0JBQXdCO1lBQ2xELCtCQUErQixFQUFFLFlBQVksQ0FBQywrQkFBK0I7WUFDN0UsWUFBWSxFQUFFLFlBQVksQ0FBQyxZQUFZO1lBQ3ZDLCtCQUErQixFQUFFLFlBQVksQ0FBQywrQkFBK0I7WUFDN0UscUNBQXFDLEVBQUUsWUFBWSxDQUFDLHFDQUFxQztZQUN6RixlQUFlLEVBQUUsWUFBWSxDQUFDLGVBQWU7WUFDN0MsV0FBVyxFQUFFLFlBQVksQ0FBQyxXQUFXO1lBQ3JDLHNCQUFzQixFQUFFLFlBQVksQ0FBQyxzQkFBc0I7WUFDM0Qsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLGtCQUFrQjtZQUNuRCxrQkFBa0IsRUFBRSxZQUFZLENBQUMsa0JBQWtCO1lBQ25ELHdCQUF3QixFQUFFLFlBQVksQ0FBQyx3QkFBd0I7WUFDL0Qsd0JBQXdCLEVBQUUsWUFBWSxDQUFDLHdCQUF3QjtZQUMvRCx3QkFBd0IsRUFBRSxZQUFZLENBQUMsd0JBQXdCO1lBQy9ELHdCQUF3QixFQUFFLFlBQVksQ0FBQyx3QkFBd0I7WUFDL0Qsc0JBQXNCLEVBQUUsWUFBWSxDQUFDLHNCQUFzQjtZQUMzRCx3QkFBd0IsRUFBRSxZQUFZLENBQUMsd0JBQXdCO1lBQy9ELHlCQUF5QixFQUFFLFlBQVksQ0FBQyx5QkFBeUI7WUFDakUseUJBQXlCLEVBQUUsWUFBWSxDQUFDLHlCQUF5QjtZQUNqRSwwQkFBMEIsRUFBRSxZQUFZLENBQUMseUJBQXlCO1lBQ2xFLDRCQUE0QixFQUFFLFlBQVksQ0FBQyw0QkFBNEI7WUFDdkUsNEJBQTRCLEVBQUUsWUFBWSxDQUFDLDRCQUE0QjtZQUN2RSx1QkFBdUIsRUFBRSxZQUFZLENBQUMsdUJBQXVCO1lBQzdELHdCQUF3QixFQUFFLFlBQVksQ0FBQyx3QkFBd0I7WUFDL0QsNEJBQTRCLEVBQUUsWUFBWSxDQUFDLDRCQUE0QjtZQUN2RSwyQ0FBMkMsRUFDMUMsWUFBWSxDQUFDLDJDQUEyQztZQUN6RCw2QkFBNkIsRUFBRSxZQUFZLENBQUMsNkJBQTZCO1lBQ3pFLDRCQUE0QixFQUFFLFlBQVksQ0FBQyw0QkFBNEI7WUFDdkUsb0JBQW9CLEVBQUUsWUFBWSxDQUFDLG9CQUFvQjtZQUN2RCxtQ0FBbUMsRUFBRSxZQUFZLENBQUMsbUNBQW1DO1lBQ3JGLGVBQWUsRUFBRSxZQUFZLENBQUMsZUFBZTtZQUM3QyxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsZ0JBQWdCO1lBQy9DLFlBQVksRUFBRSxZQUFZLENBQUMsWUFBWTtZQUN2QyxxQkFBcUIsRUFBRSxZQUFZLENBQUMscUJBQXFCO1lBQ3pELHVCQUF1QixFQUFFLFlBQVksQ0FBQyx1QkFBdUI7WUFDN0QsdUJBQXVCLEVBQUUsWUFBWSxDQUFDLHVCQUF1QjtZQUM3RCw0QkFBNEIsRUFBRSxZQUFZLENBQUMsNEJBQTRCO1lBQ3ZFLHdCQUF3QixFQUFFLFlBQVksQ0FBQyx3QkFBd0I7WUFDL0QseUJBQXlCLEVBQUUsWUFBWSxDQUFDLHlCQUF5QjtZQUNqRSwyQkFBMkIsRUFBRSxZQUFZLENBQUMsMkJBQTJCO1lBQ3JFLHFCQUFxQixFQUFFLFlBQVksQ0FBQyxxQkFBcUI7WUFDekQseUJBQXlCLEVBQUUsWUFBWSxDQUFDLHlCQUF5QjtZQUNqRSxrQkFBa0IsRUFBRSxZQUFZLENBQUMsa0JBQWtCO1lBQ25ELHVCQUF1QixFQUFFLFlBQVksQ0FBQyx1QkFBdUI7WUFDN0QscUJBQXFCLEVBQUUsWUFBWSxDQUFDLHFCQUFxQjtZQUN6RCxpQkFBaUIsRUFBRSxZQUFZLENBQUMsaUJBQWlCO1lBQ2pELCtCQUErQixFQUFFLFlBQVksQ0FBQywrQkFBK0I7WUFDN0UsOEJBQThCLEVBQUUsWUFBWSxDQUFDLDhCQUE4QjtZQUMzRSx5QkFBeUIsRUFBRSxZQUFZLENBQUMseUJBQXlCO1lBQ2pFLDBCQUEwQixFQUFFLFlBQVksQ0FBQywwQkFBMEI7WUFDbkUsYUFBYSxFQUFFLFlBQVksQ0FBQyxhQUFhO1lBQ3pDLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxnQkFBZ0I7WUFDL0Msd0JBQXdCLEVBQUUsWUFBWSxDQUFDLHdCQUF3QjtZQUMvRCxVQUFVLEVBQUUsWUFBWSxDQUFDLFVBQVU7WUFDbkMscUJBQXFCLEVBQUUsWUFBWSxDQUFDLHFCQUFxQjtZQUN6RCxxQkFBcUIsRUFBRSxxQkFBcUI7WUFDNUMsa0JBQWtCLEVBQUUsa0JBQWtCO1lBQ3RDLGdCQUFnQixFQUFFLGdCQUFnQjtZQUNsQyxnQ0FBZ0MsRUFBRSw2QkFBNkI7WUFDL0QsY0FBYyxFQUFFLFlBQVksQ0FBQyxjQUFjO1lBQzNDLHNCQUFzQixFQUFFLFlBQVksQ0FBQyxzQkFBc0I7WUFDM0Qsd0JBQXdCLEVBQUUsWUFBWSxDQUFDLHdCQUF3QjtTQUMvRCxDQUFBO0lBQ0YsQ0FBQyxDQUFBO0FBQ0YsQ0FBQyJ9
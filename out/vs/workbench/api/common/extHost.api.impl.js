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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC5hcGkuaW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3QuYXBpLmltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEUsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDdkQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEtBQUsscUJBQXFCLE1BQU0sMkRBQTJELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbkUsT0FBTyxFQUNOLGNBQWMsRUFDZCxzQkFBc0IsR0FFdEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEtBQUssS0FBSyxNQUFNLHlDQUF5QyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxP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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createProxyIdentifier, } from '../../services/extensions/common/proxyIdentifier.js';
export var TextEditorRevealType;
(function (TextEditorRevealType) {
    TextEditorRevealType[TextEditorRevealType["Default"] = 0] = "Default";
    TextEditorRevealType[TextEditorRevealType["InCenter"] = 1] = "InCenter";
    TextEditorRevealType[TextEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    TextEditorRevealType[TextEditorRevealType["AtTop"] = 3] = "AtTop";
})(TextEditorRevealType || (TextEditorRevealType = {}));
//#region --- tabs model
export var TabInputKind;
(function (TabInputKind) {
    TabInputKind[TabInputKind["UnknownInput"] = 0] = "UnknownInput";
    TabInputKind[TabInputKind["TextInput"] = 1] = "TextInput";
    TabInputKind[TabInputKind["TextDiffInput"] = 2] = "TextDiffInput";
    TabInputKind[TabInputKind["TextMergeInput"] = 3] = "TextMergeInput";
    TabInputKind[TabInputKind["NotebookInput"] = 4] = "NotebookInput";
    TabInputKind[TabInputKind["NotebookDiffInput"] = 5] = "NotebookDiffInput";
    TabInputKind[TabInputKind["CustomEditorInput"] = 6] = "CustomEditorInput";
    TabInputKind[TabInputKind["WebviewEditorInput"] = 7] = "WebviewEditorInput";
    TabInputKind[TabInputKind["TerminalEditorInput"] = 8] = "TerminalEditorInput";
    TabInputKind[TabInputKind["InteractiveEditorInput"] = 9] = "InteractiveEditorInput";
    TabInputKind[TabInputKind["ChatEditorInput"] = 10] = "ChatEditorInput";
    TabInputKind[TabInputKind["MultiDiffEditorInput"] = 11] = "MultiDiffEditorInput";
})(TabInputKind || (TabInputKind = {}));
export var TabModelOperationKind;
(function (TabModelOperationKind) {
    TabModelOperationKind[TabModelOperationKind["TAB_OPEN"] = 0] = "TAB_OPEN";
    TabModelOperationKind[TabModelOperationKind["TAB_CLOSE"] = 1] = "TAB_CLOSE";
    TabModelOperationKind[TabModelOperationKind["TAB_UPDATE"] = 2] = "TAB_UPDATE";
    TabModelOperationKind[TabModelOperationKind["TAB_MOVE"] = 3] = "TAB_MOVE";
})(TabModelOperationKind || (TabModelOperationKind = {}));
export var WebviewEditorCapabilities;
(function (WebviewEditorCapabilities) {
    WebviewEditorCapabilities[WebviewEditorCapabilities["Editable"] = 0] = "Editable";
    WebviewEditorCapabilities[WebviewEditorCapabilities["SupportsHotExit"] = 1] = "SupportsHotExit";
})(WebviewEditorCapabilities || (WebviewEditorCapabilities = {}));
export var WebviewMessageArrayBufferViewType;
(function (WebviewMessageArrayBufferViewType) {
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Int8Array"] = 1] = "Int8Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint8Array"] = 2] = "Uint8Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint8ClampedArray"] = 3] = "Uint8ClampedArray";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Int16Array"] = 4] = "Int16Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint16Array"] = 5] = "Uint16Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Int32Array"] = 6] = "Int32Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint32Array"] = 7] = "Uint32Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Float32Array"] = 8] = "Float32Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Float64Array"] = 9] = "Float64Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["BigInt64Array"] = 10] = "BigInt64Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["BigUint64Array"] = 11] = "BigUint64Array";
})(WebviewMessageArrayBufferViewType || (WebviewMessageArrayBufferViewType = {}));
export var CellOutputKind;
(function (CellOutputKind) {
    CellOutputKind[CellOutputKind["Text"] = 1] = "Text";
    CellOutputKind[CellOutputKind["Error"] = 2] = "Error";
    CellOutputKind[CellOutputKind["Rich"] = 3] = "Rich";
})(CellOutputKind || (CellOutputKind = {}));
export var NotebookEditorRevealType;
(function (NotebookEditorRevealType) {
    NotebookEditorRevealType[NotebookEditorRevealType["Default"] = 0] = "Default";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenter"] = 1] = "InCenter";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    NotebookEditorRevealType[NotebookEditorRevealType["AtTop"] = 3] = "AtTop";
})(NotebookEditorRevealType || (NotebookEditorRevealType = {}));
export var CandidatePortSource;
(function (CandidatePortSource) {
    CandidatePortSource[CandidatePortSource["None"] = 0] = "None";
    CandidatePortSource[CandidatePortSource["Process"] = 1] = "Process";
    CandidatePortSource[CandidatePortSource["Output"] = 2] = "Output";
    CandidatePortSource[CandidatePortSource["Hybrid"] = 3] = "Hybrid";
})(CandidatePortSource || (CandidatePortSource = {}));
export class IdObject {
    static { this._n = 0; }
    static mixin(object) {
        ;
        object._id = IdObject._n++;
        return object;
    }
}
export var ISuggestDataDtoField;
(function (ISuggestDataDtoField) {
    ISuggestDataDtoField["label"] = "a";
    ISuggestDataDtoField["kind"] = "b";
    ISuggestDataDtoField["detail"] = "c";
    ISuggestDataDtoField["documentation"] = "d";
    ISuggestDataDtoField["sortText"] = "e";
    ISuggestDataDtoField["filterText"] = "f";
    ISuggestDataDtoField["preselect"] = "g";
    ISuggestDataDtoField["insertText"] = "h";
    ISuggestDataDtoField["insertTextRules"] = "i";
    ISuggestDataDtoField["range"] = "j";
    ISuggestDataDtoField["commitCharacters"] = "k";
    ISuggestDataDtoField["additionalTextEdits"] = "l";
    ISuggestDataDtoField["kindModifier"] = "m";
    ISuggestDataDtoField["commandIdent"] = "n";
    ISuggestDataDtoField["commandId"] = "o";
    ISuggestDataDtoField["commandArguments"] = "p";
})(ISuggestDataDtoField || (ISuggestDataDtoField = {}));
export var ISuggestResultDtoField;
(function (ISuggestResultDtoField) {
    ISuggestResultDtoField["defaultRanges"] = "a";
    ISuggestResultDtoField["completions"] = "b";
    ISuggestResultDtoField["isIncomplete"] = "c";
    ISuggestResultDtoField["duration"] = "d";
})(ISuggestResultDtoField || (ISuggestResultDtoField = {}));
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the editor.
 */
export class TerminalCompletionListDto {
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    constructor(items, resourceRequestConfig) {
        this.items = items ?? [];
        this.resourceRequestConfig = resourceRequestConfig;
    }
}
export var ExtHostTestingResource;
(function (ExtHostTestingResource) {
    ExtHostTestingResource[ExtHostTestingResource["Workspace"] = 0] = "Workspace";
    ExtHostTestingResource[ExtHostTestingResource["TextDocument"] = 1] = "TextDocument";
})(ExtHostTestingResource || (ExtHostTestingResource = {}));
// --- proxy identifiers
export const MainContext = {
    MainThreadAuthentication: createProxyIdentifier('MainThreadAuthentication'),
    MainThreadBulkEdits: createProxyIdentifier('MainThreadBulkEdits'),
    MainThreadLanguageModels: createProxyIdentifier('MainThreadLanguageModels'),
    MainThreadEmbeddings: createProxyIdentifier('MainThreadEmbeddings'),
    MainThreadChatAgents2: createProxyIdentifier('MainThreadChatAgents2'),
    MainThreadCodeMapper: createProxyIdentifier('MainThreadCodeMapper'),
    MainThreadLanguageModelTools: createProxyIdentifier('MainThreadChatSkills'),
    MainThreadClipboard: createProxyIdentifier('MainThreadClipboard'),
    MainThreadCommands: createProxyIdentifier('MainThreadCommands'),
    MainThreadComments: createProxyIdentifier('MainThreadComments'),
    MainThreadConfiguration: createProxyIdentifier('MainThreadConfiguration'),
    MainThreadConsole: createProxyIdentifier('MainThreadConsole'),
    MainThreadDebugService: createProxyIdentifier('MainThreadDebugService'),
    MainThreadDecorations: createProxyIdentifier('MainThreadDecorations'),
    MainThreadDiagnostics: createProxyIdentifier('MainThreadDiagnostics'),
    MainThreadDialogs: createProxyIdentifier('MainThreadDiaglogs'),
    MainThreadDocuments: createProxyIdentifier('MainThreadDocuments'),
    MainThreadDocumentContentProviders: createProxyIdentifier('MainThreadDocumentContentProviders'),
    MainThreadTextEditors: createProxyIdentifier('MainThreadTextEditors'),
    MainThreadEditorInsets: createProxyIdentifier('MainThreadEditorInsets'),
    MainThreadEditorTabs: createProxyIdentifier('MainThreadEditorTabs'),
    MainThreadErrors: createProxyIdentifier('MainThreadErrors'),
    MainThreadTreeViews: createProxyIdentifier('MainThreadTreeViews'),
    MainThreadDownloadService: createProxyIdentifier('MainThreadDownloadService'),
    MainThreadLanguageFeatures: createProxyIdentifier('MainThreadLanguageFeatures'),
    MainThreadLanguages: createProxyIdentifier('MainThreadLanguages'),
    MainThreadLogger: createProxyIdentifier('MainThreadLogger'),
    MainThreadMessageService: createProxyIdentifier('MainThreadMessageService'),
    MainThreadOutputService: createProxyIdentifier('MainThreadOutputService'),
    MainThreadProgress: createProxyIdentifier('MainThreadProgress'),
    MainThreadQuickDiff: createProxyIdentifier('MainThreadQuickDiff'),
    MainThreadQuickOpen: createProxyIdentifier('MainThreadQuickOpen'),
    MainThreadStatusBar: createProxyIdentifier('MainThreadStatusBar'),
    MainThreadSecretState: createProxyIdentifier('MainThreadSecretState'),
    MainThreadStorage: createProxyIdentifier('MainThreadStorage'),
    MainThreadSpeech: createProxyIdentifier('MainThreadSpeechProvider'),
    MainThreadTelemetry: createProxyIdentifier('MainThreadTelemetry'),
    MainThreadTerminalService: createProxyIdentifier('MainThreadTerminalService'),
    MainThreadTerminalShellIntegration: createProxyIdentifier('MainThreadTerminalShellIntegration'),
    MainThreadWebviews: createProxyIdentifier('MainThreadWebviews'),
    MainThreadWebviewPanels: createProxyIdentifier('MainThreadWebviewPanels'),
    MainThreadWebviewViews: createProxyIdentifier('MainThreadWebviewViews'),
    MainThreadCustomEditors: createProxyIdentifier('MainThreadCustomEditors'),
    MainThreadUrls: createProxyIdentifier('MainThreadUrls'),
    MainThreadUriOpeners: createProxyIdentifier('MainThreadUriOpeners'),
    MainThreadProfileContentHandlers: createProxyIdentifier('MainThreadProfileContentHandlers'),
    MainThreadWorkspace: createProxyIdentifier('MainThreadWorkspace'),
    MainThreadFileSystem: createProxyIdentifier('MainThreadFileSystem'),
    MainThreadFileSystemEventService: createProxyIdentifier('MainThreadFileSystemEventService'),
    MainThreadExtensionService: createProxyIdentifier('MainThreadExtensionService'),
    MainThreadSCM: createProxyIdentifier('MainThreadSCM'),
    MainThreadSearch: createProxyIdentifier('MainThreadSearch'),
    MainThreadShare: createProxyIdentifier('MainThreadShare'),
    MainThreadTask: createProxyIdentifier('MainThreadTask'),
    MainThreadWindow: createProxyIdentifier('MainThreadWindow'),
    MainThreadLabelService: createProxyIdentifier('MainThreadLabelService'),
    MainThreadNotebook: createProxyIdentifier('MainThreadNotebook'),
    MainThreadNotebookDocuments: createProxyIdentifier('MainThreadNotebookDocumentsShape'),
    MainThreadNotebookEditors: createProxyIdentifier('MainThreadNotebookEditorsShape'),
    MainThreadNotebookKernels: createProxyIdentifier('MainThreadNotebookKernels'),
    MainThreadNotebookRenderers: createProxyIdentifier('MainThreadNotebookRenderers'),
    MainThreadInteractive: createProxyIdentifier('MainThreadInteractive'),
    MainThreadTheming: createProxyIdentifier('MainThreadTheming'),
    MainThreadTunnelService: createProxyIdentifier('MainThreadTunnelService'),
    MainThreadManagedSockets: createProxyIdentifier('MainThreadManagedSockets'),
    MainThreadTimeline: createProxyIdentifier('MainThreadTimeline'),
    MainThreadTesting: createProxyIdentifier('MainThreadTesting'),
    MainThreadLocalization: createProxyIdentifier('MainThreadLocalizationShape'),
    MainThreadMcp: createProxyIdentifier('MainThreadMcpShape'),
    MainThreadAiRelatedInformation: createProxyIdentifier('MainThreadAiRelatedInformation'),
    MainThreadAiEmbeddingVector: createProxyIdentifier('MainThreadAiEmbeddingVector'),
    MainThreadChatStatus: createProxyIdentifier('MainThreadChatStatus'),
};
export const ExtHostContext = {
    ExtHostCodeMapper: createProxyIdentifier('ExtHostCodeMapper'),
    ExtHostCommands: createProxyIdentifier('ExtHostCommands'),
    ExtHostConfiguration: createProxyIdentifier('ExtHostConfiguration'),
    ExtHostDiagnostics: createProxyIdentifier('ExtHostDiagnostics'),
    ExtHostDebugService: createProxyIdentifier('ExtHostDebugService'),
    ExtHostDecorations: createProxyIdentifier('ExtHostDecorations'),
    ExtHostDocumentsAndEditors: createProxyIdentifier('ExtHostDocumentsAndEditors'),
    ExtHostDocuments: createProxyIdentifier('ExtHostDocuments'),
    ExtHostDocumentContentProviders: createProxyIdentifier('ExtHostDocumentContentProviders'),
    ExtHostDocumentSaveParticipant: createProxyIdentifier('ExtHostDocumentSaveParticipant'),
    ExtHostEditors: createProxyIdentifier('ExtHostEditors'),
    ExtHostTreeViews: createProxyIdentifier('ExtHostTreeViews'),
    ExtHostFileSystem: createProxyIdentifier('ExtHostFileSystem'),
    ExtHostFileSystemInfo: createProxyIdentifier('ExtHostFileSystemInfo'),
    ExtHostFileSystemEventService: createProxyIdentifier('ExtHostFileSystemEventService'),
    ExtHostLanguages: createProxyIdentifier('ExtHostLanguages'),
    ExtHostLanguageFeatures: createProxyIdentifier('ExtHostLanguageFeatures'),
    ExtHostQuickOpen: createProxyIdentifier('ExtHostQuickOpen'),
    ExtHostQuickDiff: createProxyIdentifier('ExtHostQuickDiff'),
    ExtHostStatusBar: createProxyIdentifier('ExtHostStatusBar'),
    ExtHostShare: createProxyIdentifier('ExtHostShare'),
    ExtHostExtensionService: createProxyIdentifier('ExtHostExtensionService'),
    ExtHostLogLevelServiceShape: createProxyIdentifier('ExtHostLogLevelServiceShape'),
    ExtHostTerminalService: createProxyIdentifier('ExtHostTerminalService'),
    ExtHostTerminalShellIntegration: createProxyIdentifier('ExtHostTerminalShellIntegration'),
    ExtHostSCM: createProxyIdentifier('ExtHostSCM'),
    ExtHostSearch: createProxyIdentifier('ExtHostSearch'),
    ExtHostTask: createProxyIdentifier('ExtHostTask'),
    ExtHostWorkspace: createProxyIdentifier('ExtHostWorkspace'),
    ExtHostWindow: createProxyIdentifier('ExtHostWindow'),
    ExtHostWebviews: createProxyIdentifier('ExtHostWebviews'),
    ExtHostWebviewPanels: createProxyIdentifier('ExtHostWebviewPanels'),
    ExtHostCustomEditors: createProxyIdentifier('ExtHostCustomEditors'),
    ExtHostWebviewViews: createProxyIdentifier('ExtHostWebviewViews'),
    ExtHostEditorInsets: createProxyIdentifier('ExtHostEditorInsets'),
    ExtHostEditorTabs: createProxyIdentifier('ExtHostEditorTabs'),
    ExtHostProgress: createProxyIdentifier('ExtHostProgress'),
    ExtHostComments: createProxyIdentifier('ExtHostComments'),
    ExtHostSecretState: createProxyIdentifier('ExtHostSecretState'),
    ExtHostStorage: createProxyIdentifier('ExtHostStorage'),
    ExtHostUrls: createProxyIdentifier('ExtHostUrls'),
    ExtHostUriOpeners: createProxyIdentifier('ExtHostUriOpeners'),
    ExtHostProfileContentHandlers: createProxyIdentifier('ExtHostProfileContentHandlers'),
    ExtHostOutputService: createProxyIdentifier('ExtHostOutputService'),
    ExtHostLabelService: createProxyIdentifier('ExtHostLabelService'),
    ExtHostNotebook: createProxyIdentifier('ExtHostNotebook'),
    ExtHostNotebookDocuments: createProxyIdentifier('ExtHostNotebookDocuments'),
    ExtHostNotebookEditors: createProxyIdentifier('ExtHostNotebookEditors'),
    ExtHostNotebookKernels: createProxyIdentifier('ExtHostNotebookKernels'),
    ExtHostNotebookRenderers: createProxyIdentifier('ExtHostNotebookRenderers'),
    ExtHostNotebookDocumentSaveParticipant: createProxyIdentifier('ExtHostNotebookDocumentSaveParticipant'),
    ExtHostInteractive: createProxyIdentifier('ExtHostInteractive'),
    ExtHostChatAgents2: createProxyIdentifier('ExtHostChatAgents'),
    ExtHostLanguageModelTools: createProxyIdentifier('ExtHostChatSkills'),
    ExtHostChatProvider: createProxyIdentifier('ExtHostChatProvider'),
    ExtHostSpeech: createProxyIdentifier('ExtHostSpeech'),
    ExtHostEmbeddings: createProxyIdentifier('ExtHostEmbeddings'),
    ExtHostAiRelatedInformation: createProxyIdentifier('ExtHostAiRelatedInformation'),
    ExtHostAiEmbeddingVector: createProxyIdentifier('ExtHostAiEmbeddingVector'),
    ExtHostTheming: createProxyIdentifier('ExtHostTheming'),
    ExtHostTunnelService: createProxyIdentifier('ExtHostTunnelService'),
    ExtHostManagedSockets: createProxyIdentifier('ExtHostManagedSockets'),
    ExtHostAuthentication: createProxyIdentifier('ExtHostAuthentication'),
    ExtHostTimeline: createProxyIdentifier('ExtHostTimeline'),
    ExtHostTesting: createProxyIdentifier('ExtHostTesting'),
    ExtHostTelemetry: createProxyIdentifier('ExtHostTelemetry'),
    ExtHostLocalization: createProxyIdentifier('ExtHostLocalization'),
    ExtHostMcp: createProxyIdentifier('ExtHostMcp'),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC5wcm90b2NvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdC5wcm90b2NvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXNOaEcsT0FBTyxFQUlOLHFCQUFxQixHQUNyQixNQUFNLHFEQUFxRCxDQUFBO0FBOE81RCxNQUFNLENBQU4sSUFBWSxvQkFLWDtBQUxELFdBQVksb0JBQW9CO0lBQy9CLHFFQUFXLENBQUE7SUFDWCx1RUFBWSxDQUFBO0lBQ1oseUdBQTZCLENBQUE7SUFDN0IsaUVBQVMsQ0FBQTtBQUNWLENBQUMsRUFMVyxvQkFBb0IsS0FBcEIsb0JBQW9CLFFBSy9CO0FBa3JCRCx3QkFBd0I7QUFFeEIsTUFBTSxDQUFOLElBQWtCLFlBYWpCO0FBYkQsV0FBa0IsWUFBWTtJQUM3QiwrREFBWSxDQUFBO0lBQ1oseURBQVMsQ0FBQTtJQUNULGlFQUFhLENBQUE7SUFDYixtRUFBYyxDQUFBO0lBQ2QsaUVBQWEsQ0FBQTtJQUNiLHlFQUFpQixDQUFBO0lBQ2pCLHlFQUFpQixDQUFBO0lBQ2pCLDJFQUFrQixDQUFBO0lBQ2xCLDZFQUFtQixDQUFBO0lBQ25CLG1GQUFzQixDQUFBO0lBQ3RCLHNFQUFlLENBQUE7SUFDZixnRkFBb0IsQ0FBQTtBQUNyQixDQUFDLEVBYmlCLFlBQVksS0FBWixZQUFZLFFBYTdCO0FBRUQsTUFBTSxDQUFOLElBQWtCLHFCQUtqQjtBQUxELFdBQWtCLHFCQUFxQjtJQUN0Qyx5RUFBUSxDQUFBO0lBQ1IsMkVBQVMsQ0FBQTtJQUNULDZFQUFVLENBQUE7SUFDVix5RUFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUxpQixxQkFBcUIsS0FBckIscUJBQXFCLFFBS3RDO0FBc0pELE1BQU0sQ0FBTixJQUFZLHlCQUdYO0FBSEQsV0FBWSx5QkFBeUI7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
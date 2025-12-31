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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC5wcm90b2NvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3QucHJvdG9jb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFzTmhHLE9BQU8sRUFJTixxQkFBcUIsR0FDckIsTUFBTSxxREFBcUQsQ0FBQTtBQThPNUQsTUFBTSxDQUFOLElBQVksb0JBS1g7QUFMRCxXQUFZLG9CQUFvQjtJQUMvQixxRUFBVyxDQUFBO0lBQ1gsdUVBQVksQ0FBQTtJQUNaLHlHQUE2QixDQUFBO0lBQzdCLGlFQUFTLENBQUE7QUFDVixDQUFDLEVBTFcsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUsvQjtBQWtyQkQsd0JBQXdCO0FBRXhCLE1BQU0sQ0FBTixJQUFrQixZQWFqQjtBQWJELFdBQWtCLFlBQVk7SUFDN0IsK0RBQVksQ0FBQTtJQUNaLHlEQUFTLENBQUE7SUFDVCxpRUFBYSxDQUFBO0lBQ2IsbUVBQWMsQ0FBQTtJQUNkLGlFQUFhLENBQUE7SUFDYix5RUFBaUIsQ0FBQTtJQUNqQix5RUFBaUIsQ0FBQTtJQUNqQiwyRUFBa0IsQ0FBQTtJQUNsQiw2RUFBbUIsQ0FBQTtJQUNuQixtRkFBc0IsQ0FBQTtJQUN0QixzRUFBZSxDQUFBO0lBQ2YsZ0ZBQW9CLENBQUE7QUFDckIsQ0FBQyxFQWJpQixZQUFZLEtBQVosWUFBWSxRQWE3QjtBQUVELE1BQU0sQ0FBTixJQUFrQixxQkFLakI7QUFMRCxXQUFrQixxQkFBcUI7SUFDdEMseUVBQVEsQ0FBQTtJQUNSLDJFQUFTLENBQUE7SUFDVCw2RUFBVSxDQUFBO0lBQ1YseUVBQVEsQ0FBQTtBQUNULENBQUMsRUFMaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUt0QztBQXNKRCxNQUFNLENBQU4sSUFBWSx5QkFHWDtBQUhELFdBQVkseUJBQXlCO0lBQ3BD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
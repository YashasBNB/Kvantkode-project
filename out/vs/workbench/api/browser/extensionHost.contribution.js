/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { registerWorkbenchContribution2, } from '../../common/contributions.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
// --- other interested parties
import { JSONValidationExtensionPoint } from '../common/jsonValidationExtensionPoint.js';
import { ColorExtensionPoint } from '../../services/themes/common/colorExtensionPoint.js';
import { IconExtensionPoint } from '../../services/themes/common/iconExtensionPoint.js';
import { TokenClassificationExtensionPoints } from '../../services/themes/common/tokenClassificationExtensionPoint.js';
import { LanguageConfigurationFileHandler } from '../../contrib/codeEditor/common/languageConfigurationExtensionPoint.js';
import { StatusBarItemsExtensionPoint } from './statusBarExtensionPoint.js';
// --- mainThread participants
import './mainThreadLocalization.js';
import './mainThreadBulkEdits.js';
import './mainThreadLanguageModels.js';
import './mainThreadChatAgents2.js';
import './mainThreadChatCodeMapper.js';
import './mainThreadLanguageModelTools.js';
import './mainThreadEmbeddings.js';
import './mainThreadCodeInsets.js';
import './mainThreadCLICommands.js';
import './mainThreadClipboard.js';
import './mainThreadCommands.js';
import './mainThreadConfiguration.js';
import './mainThreadConsole.js';
import './mainThreadDebugService.js';
import './mainThreadDecorations.js';
import './mainThreadDiagnostics.js';
import './mainThreadDialogs.js';
import './mainThreadDocumentContentProviders.js';
import './mainThreadDocuments.js';
import './mainThreadDocumentsAndEditors.js';
import './mainThreadEditor.js';
import './mainThreadEditors.js';
import './mainThreadEditorTabs.js';
import './mainThreadErrors.js';
import './mainThreadExtensionService.js';
import './mainThreadFileSystem.js';
import './mainThreadFileSystemEventService.js';
import './mainThreadLanguageFeatures.js';
import './mainThreadLanguages.js';
import './mainThreadLogService.js';
import './mainThreadMessageService.js';
import './mainThreadManagedSockets.js';
import './mainThreadOutputService.js';
import './mainThreadProgress.js';
import './mainThreadQuickDiff.js';
import './mainThreadQuickOpen.js';
import './mainThreadRemoteConnectionData.js';
import './mainThreadSaveParticipant.js';
import './mainThreadSpeech.js';
import './mainThreadEditSessionIdentityParticipant.js';
import './mainThreadSCM.js';
import './mainThreadSearch.js';
import './mainThreadStatusBar.js';
import './mainThreadStorage.js';
import './mainThreadTelemetry.js';
import './mainThreadTerminalService.js';
import './mainThreadTerminalShellIntegration.js';
import './mainThreadTheming.js';
import './mainThreadTreeViews.js';
import './mainThreadDownloadService.js';
import './mainThreadUrls.js';
import './mainThreadUriOpeners.js';
import './mainThreadWindow.js';
import './mainThreadWebviewManager.js';
import './mainThreadWorkspace.js';
import './mainThreadComments.js';
import './mainThreadNotebook.js';
import './mainThreadNotebookKernels.js';
import './mainThreadNotebookDocumentsAndEditors.js';
import './mainThreadNotebookRenderers.js';
import './mainThreadNotebookSaveParticipant.js';
import './mainThreadInteractive.js';
import './mainThreadTask.js';
import './mainThreadLabelService.js';
import './mainThreadTunnelService.js';
import './mainThreadAuthentication.js';
import './mainThreadTimeline.js';
import './mainThreadTesting.js';
import './mainThreadSecretState.js';
import './mainThreadShare.js';
import './mainThreadProfileContentHandlers.js';
import './mainThreadAiRelatedInformation.js';
import './mainThreadAiEmbeddingVector.js';
import './mainThreadMcp.js';
import './mainThreadChatStatus.js';
let ExtensionPoints = class ExtensionPoints {
    static { this.ID = 'workbench.contrib.extensionPoints'; }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        // Classes that handle extension points...
        this.instantiationService.createInstance(JSONValidationExtensionPoint);
        this.instantiationService.createInstance(ColorExtensionPoint);
        this.instantiationService.createInstance(IconExtensionPoint);
        this.instantiationService.createInstance(TokenClassificationExtensionPoints);
        this.instantiationService.createInstance(LanguageConfigurationFileHandler);
        this.instantiationService.createInstance(StatusBarItemsExtensionPoint);
    }
};
ExtensionPoints = __decorate([
    __param(0, IInstantiationService)
], ExtensionPoints);
export { ExtensionPoints };
registerWorkbenchContribution2(ExtensionPoints.ID, ExtensionPoints, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9leHRlbnNpb25Ib3N0LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFL0YsK0JBQStCO0FBQy9CLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3RILE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQ3pILE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRTNFLDhCQUE4QjtBQUM5QixPQUFPLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sMEJBQTBCLENBQUE7QUFDakMsT0FBTywrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8seUJBQXlCLENBQUE7QUFDaEMsT0FB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
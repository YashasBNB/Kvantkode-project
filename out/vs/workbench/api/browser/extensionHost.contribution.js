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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvZXh0ZW5zaW9uSG9zdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRS9GLCtCQUErQjtBQUMvQixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN2RixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUN0SCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUN6SCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUzRSw4QkFBOEI7QUFDOUIsT0FBTyw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sK0JBQStCLENBQUE7QUFDdEMsT0FBTyw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sbUNBQW1DLENBQUE7QUFDMUMsT0FBTywyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sNEJBQTRCLENBQUE7QUFDbkMsT0FBTywwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sOEJBQThCLENBQUE7QUFDckMsT0FB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
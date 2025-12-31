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
import { InlineVoiceChatAction, QuickVoiceChatAction, StartVoiceChatAction, VoiceChatInChatViewAction, StopListeningAction, StopListeningAndSubmitAction, KeywordActivationContribution, InstallSpeechProviderForVoiceChatAction, HoldToVoiceChatInChatViewAction, ReadChatResponseAloud, StopReadAloud, StopReadChatItemAloud, } from './actions/voiceChatActions.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { FetchWebPageTool, FetchWebPageToolData } from './tools/fetchPageTool.js';
import { registerChatDeveloperActions } from './actions/chatDeveloperActions.js';
let NativeBuiltinToolsContribution = class NativeBuiltinToolsContribution extends Disposable {
    static { this.ID = 'chat.nativeBuiltinTools'; }
    constructor(toolsService, instantiationService) {
        super();
        const editTool = instantiationService.createInstance(FetchWebPageTool);
        this._register(toolsService.registerToolData(FetchWebPageToolData));
        this._register(toolsService.registerToolImplementation(FetchWebPageToolData.id, editTool));
    }
};
NativeBuiltinToolsContribution = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, IInstantiationService)
], NativeBuiltinToolsContribution);
registerAction2(StartVoiceChatAction);
registerAction2(InstallSpeechProviderForVoiceChatAction);
registerAction2(VoiceChatInChatViewAction);
registerAction2(HoldToVoiceChatInChatViewAction);
registerAction2(QuickVoiceChatAction);
registerAction2(InlineVoiceChatAction);
registerAction2(StopListeningAction);
registerAction2(StopListeningAndSubmitAction);
registerAction2(ReadChatResponseAloud);
registerAction2(StopReadChatItemAloud);
registerAction2(StopReadAloud);
registerChatDeveloperActions();
registerWorkbenchContribution2(KeywordActivationContribution.ID, KeywordActivationContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(NativeBuiltinToolsContribution.ID, NativeBuiltinToolsContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2VsZWN0cm9uLXNhbmRib3gvY2hhdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixvQkFBb0IsRUFDcEIsb0JBQW9CLEVBQ3BCLHlCQUF5QixFQUN6QixtQkFBbUIsRUFDbkIsNEJBQTRCLEVBQzVCLDZCQUE2QixFQUM3Qix1Q0FBdUMsRUFDdkMsK0JBQStCLEVBQy9CLHFCQUFxQixFQUNyQixhQUFhLEVBQ2IscUJBQXFCLEdBQ3JCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFHTiw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDakYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFaEYsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVO2FBQ3RDLE9BQUUsR0FBRyx5QkFBeUIsQUFBNUIsQ0FBNEI7SUFFOUMsWUFDNkIsWUFBd0MsRUFDN0Msb0JBQTJDO1FBRWxFLEtBQUssRUFBRSxDQUFBO1FBRVAsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBQzNGLENBQUM7O0FBWkksOEJBQThCO0lBSWpDLFdBQUEsMEJBQTBCLENBQUE7SUFDMUIsV0FBQSxxQkFBcUIsQ0FBQTtHQUxsQiw4QkFBOEIsQ0FhbkM7QUFFRCxlQUFlLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtBQUNyQyxlQUFlLENBQUMsdUNBQXVDLENBQUMsQ0FBQTtBQUV4RCxlQUFlLENBQUMseUJBQXlCLENBQUMsQ0FBQTtBQUMxQyxlQUFlLENBQUMsK0JBQStCLENBQUMsQ0FBQTtBQUNoRCxlQUFlLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtBQUNyQyxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUV0QyxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtBQUNwQyxlQUFlLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtBQUU3QyxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUN0QyxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUN0QyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUE7QUFFOUIsNEJBQTRCLEVBQUUsQ0FBQTtBQUU5Qiw4QkFBOEIsQ0FDN0IsNkJBQTZCLENBQUMsRUFBRSxFQUNoQyw2QkFBNkIsdUNBRTdCLENBQUE7QUFDRCw4QkFBOEIsQ0FDN0IsOEJBQThCLENBQUMsRUFBRSxFQUNqQyw4QkFBOEIsdUNBRTlCLENBQUEifQ==
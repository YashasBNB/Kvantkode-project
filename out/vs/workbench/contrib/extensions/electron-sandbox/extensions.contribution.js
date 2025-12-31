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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IExtensionRecommendationNotificationService } from '../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { ExtensionRecommendationNotificationServiceChannel } from '../../../../platform/extensionRecommendations/common/extensionRecommendationsIpc.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { EditorExtensions, } from '../../../common/editor.js';
import { RuntimeExtensionsInput } from '../common/runtimeExtensionsInput.js';
import { DebugExtensionHostAction, DebugExtensionsContribution, } from './debugExtensionHostAction.js';
import { ExtensionHostProfileService } from './extensionProfileService.js';
import { CleanUpExtensionsFolderAction, OpenExtensionsFolderAction } from './extensionsActions.js';
import { ExtensionsAutoProfiler } from './extensionsAutoProfiler.js';
import { InstallRemoteExtensionsContribution, RemoteExtensionsInitializerContribution, } from './remoteExtensionsInit.js';
import { IExtensionHostProfileService, OpenExtensionHostProfileACtion, RuntimeExtensionsEditor, SaveExtensionHostProfileAction, StartExtensionHostProfileAction, StopExtensionHostProfileAction, } from './runtimeExtensionsEditor.js';
// Singletons
registerSingleton(IExtensionHostProfileService, ExtensionHostProfileService, 1 /* InstantiationType.Delayed */);
// Running Extensions Editor
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(RuntimeExtensionsEditor, RuntimeExtensionsEditor.ID, localize('runtimeExtension', 'Running Extensions')), [new SyncDescriptor(RuntimeExtensionsInput)]);
class RuntimeExtensionsInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return '';
    }
    deserialize(instantiationService) {
        return RuntimeExtensionsInput.instance;
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(RuntimeExtensionsInput.ID, RuntimeExtensionsInputSerializer);
// Global actions
let ExtensionsContributions = class ExtensionsContributions extends Disposable {
    constructor(extensionRecommendationNotificationService, sharedProcessService) {
        super();
        sharedProcessService.registerChannel('extensionRecommendationNotification', new ExtensionRecommendationNotificationServiceChannel(extensionRecommendationNotificationService));
        this._register(registerAction2(OpenExtensionsFolderAction));
        this._register(registerAction2(CleanUpExtensionsFolderAction));
    }
};
ExtensionsContributions = __decorate([
    __param(0, IExtensionRecommendationNotificationService),
    __param(1, ISharedProcessService)
], ExtensionsContributions);
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ExtensionsContributions, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(ExtensionsAutoProfiler, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(RemoteExtensionsInitializerContribution, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(InstallRemoteExtensionsContribution, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(DebugExtensionsContribution, 3 /* LifecyclePhase.Restored */);
// Register Commands
registerAction2(DebugExtensionHostAction);
registerAction2(StartExtensionHostProfileAction);
registerAction2(StopExtensionHostProfileAction);
registerAction2(SaveExtensionHostProfileAction);
registerAction2(OpenExtensionHostProfileACtion);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFDOUksT0FBTyxFQUFFLGlEQUFpRCxFQUFFLE1BQU0scUZBQXFGLENBQUE7QUFDdkosT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUF1QixNQUFNLDRCQUE0QixDQUFBO0FBQ3RGLE9BQU8sRUFHTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUNOLGdCQUFnQixHQUdoQixNQUFNLDJCQUEyQixDQUFBO0FBR2xDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVFLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsMkJBQTJCLEdBQzNCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDMUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEUsT0FBTyxFQUNOLG1DQUFtQyxFQUNuQyx1Q0FBdUMsR0FDdkMsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDhCQUE4QixFQUM5Qix1QkFBdUIsRUFDdkIsOEJBQThCLEVBQzlCLCtCQUErQixFQUMvQiw4QkFBOEIsR0FDOUIsTUFBTSw4QkFBOEIsQ0FBQTtBQUVyQyxhQUFhO0FBQ2IsaUJBQWlCLENBQ2hCLDRCQUE0QixFQUM1QiwyQkFBMkIsb0NBRTNCLENBQUE7QUFFRCw0QkFBNEI7QUFDNUIsUUFBUSxDQUFDLEVBQUUsQ0FBc0IsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsa0JBQWtCLENBQy9FLG9CQUFvQixDQUFDLE1BQU0sQ0FDMUIsdUJBQXVCLEVBQ3ZCLHVCQUF1QixDQUFDLEVBQUUsRUFDMUIsUUFBUSxDQUFDLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDLENBQ2xELEVBQ0QsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQzVDLENBQUE7QUFFRCxNQUFNLGdDQUFnQztJQUNyQyxZQUFZLENBQUMsV0FBd0I7UUFDcEMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsU0FBUyxDQUFDLFdBQXdCO1FBQ2pDLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELFdBQVcsQ0FBQyxvQkFBMkM7UUFDdEQsT0FBTyxzQkFBc0IsQ0FBQyxRQUFRLENBQUE7SUFDdkMsQ0FBQztDQUNEO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUMsd0JBQXdCLENBQzNGLHNCQUFzQixDQUFDLEVBQUUsRUFDekIsZ0NBQWdDLENBQ2hDLENBQUE7QUFFRCxpQkFBaUI7QUFFakIsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBQy9DLFlBRUMsMENBQXVGLEVBQ2hFLG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQTtRQUVQLG9CQUFvQixDQUFDLGVBQWUsQ0FDbkMscUNBQXFDLEVBQ3JDLElBQUksaURBQWlELENBQ3BELDBDQUEwQyxDQUMxQyxDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFBO0lBQy9ELENBQUM7Q0FDRCxDQUFBO0FBbEJLLHVCQUF1QjtJQUUxQixXQUFBLDJDQUEyQyxDQUFBO0lBRTNDLFdBQUEscUJBQXFCLENBQUE7R0FKbEIsdUJBQXVCLENBa0I1QjtBQUVELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDcEMsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFBO0FBQ0QsaUJBQWlCLENBQUMsNkJBQTZCLENBQUMsdUJBQXVCLGtDQUEwQixDQUFBO0FBQ2pHLGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLHNCQUFzQixvQ0FBNEIsQ0FBQTtBQUNsRyxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FDOUMsdUNBQXVDLGtDQUV2QyxDQUFBO0FBQ0QsaUJBQWlCLENBQUMsNkJBQTZCLENBQzlDLG1DQUFtQyxrQ0FFbkMsQ0FBQTtBQUNELGlCQUFpQixDQUFDLDZCQUE2QixDQUM5QywyQkFBMkIsa0NBRTNCLENBQUE7QUFFRCxvQkFBb0I7QUFFcEIsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUE7QUFDekMsZUFBZSxDQUFDLCtCQUErQixDQUFDLENBQUE7QUFDaEQsZUFBZSxDQUFDLDhCQUE4QixDQUFDLENBQUE7QUFDL0MsZUFBZSxDQUFDLDhCQUE4QixDQUFDLENBQUE7QUFDL0MsZUFBZSxDQUFDLDhCQUE4QixDQUFDLENBQUEifQ==
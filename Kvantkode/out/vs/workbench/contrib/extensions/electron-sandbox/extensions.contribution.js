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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvZWxlY3Ryb24tc2FuZGJveC9leHRlbnNpb25zLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsMkNBQTJDLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUM5SSxPQUFPLEVBQUUsaURBQWlELEVBQUUsTUFBTSxxRkFBcUYsQ0FBQTtBQUN2SixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUE7QUFDdEYsT0FBTyxFQUdOLFVBQVUsSUFBSSxtQkFBbUIsR0FDakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sZ0JBQWdCLEdBR2hCLE1BQU0sMkJBQTJCLENBQUE7QUFHbEMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUNOLHdCQUF3QixFQUN4QiwyQkFBMkIsR0FDM0Is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
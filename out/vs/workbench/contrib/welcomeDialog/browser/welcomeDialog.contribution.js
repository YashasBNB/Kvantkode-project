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
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { WelcomeWidget } from './welcomeWidget.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { localize } from '../../../../nls.js';
import { applicationConfigurationNodeBase } from '../../../common/configuration.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const configurationKey = 'workbench.welcome.experimental.dialog';
let WelcomeDialogContribution = class WelcomeDialogContribution extends Disposable {
    constructor(storageService, environmentService, configurationService, contextService, codeEditorService, instantiationService, commandService, telemetryService, openerService, editorService) {
        super();
        this.isRendered = false;
        if (!storageService.isNew(-1 /* StorageScope.APPLICATION */)) {
            return; // do not show if this is not the first session
        }
        const setting = configurationService.inspect(configurationKey);
        if (!setting.value) {
            return;
        }
        const welcomeDialog = environmentService.options?.welcomeDialog;
        if (!welcomeDialog) {
            return;
        }
        this._register(editorService.onDidActiveEditorChange(() => {
            if (!this.isRendered) {
                const codeEditor = codeEditorService.getActiveCodeEditor();
                if (codeEditor?.hasModel()) {
                    const scheduler = new RunOnceScheduler(() => {
                        const notificationsVisible = contextService.contextMatchesRules(ContextKeyExpr.deserialize('notificationCenterVisible')) ||
                            contextService.contextMatchesRules(ContextKeyExpr.deserialize('notificationToastsVisible'));
                        if (codeEditor === codeEditorService.getActiveCodeEditor() && !notificationsVisible) {
                            this.isRendered = true;
                            const welcomeWidget = new WelcomeWidget(codeEditor, instantiationService, commandService, telemetryService, openerService);
                            welcomeWidget.render(welcomeDialog.title, welcomeDialog.message, welcomeDialog.buttonText, welcomeDialog.buttonCommand);
                        }
                    }, 3000);
                    this._register(codeEditor.onDidChangeModelContent((e) => {
                        if (!this.isRendered) {
                            scheduler.schedule();
                        }
                    }));
                }
            }
        }));
    }
};
WelcomeDialogContribution = __decorate([
    __param(0, IStorageService),
    __param(1, IBrowserWorkbenchEnvironmentService),
    __param(2, IConfigurationService),
    __param(3, IContextKeyService),
    __param(4, ICodeEditorService),
    __param(5, IInstantiationService),
    __param(6, ICommandService),
    __param(7, ITelemetryService),
    __param(8, IOpenerService),
    __param(9, IEditorService)
], WelcomeDialogContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WelcomeDialogContribution, 4 /* LifecyclePhase.Eventually */);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    ...applicationConfigurationNodeBase,
    properties: {
        'workbench.welcome.experimental.dialog': {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            type: 'boolean',
            default: false,
            tags: ['experimental'],
            description: localize('workbench.welcome.dialog', 'When enabled, a welcome widget is shown in the editor'),
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZURpYWxvZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lRGlhbG9nL2Jyb3dzZXIvd2VsY29tZURpYWxvZy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixVQUFVLElBQUksbUJBQW1CLEdBR2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNqSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsTUFBTSxnQkFBZ0IsR0FBRyx1Q0FBdUMsQ0FBQTtBQUVoRSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7SUFHakQsWUFDa0IsY0FBK0IsRUFDWCxrQkFBdUQsRUFDckUsb0JBQTJDLEVBQzlDLGNBQWtDLEVBQ2xDLGlCQUFxQyxFQUNsQyxvQkFBMkMsRUFDakQsY0FBK0IsRUFDN0IsZ0JBQW1DLEVBQ3RDLGFBQTZCLEVBQzdCLGFBQTZCO1FBRTdDLEtBQUssRUFBRSxDQUFBO1FBZEEsZUFBVSxHQUFHLEtBQUssQ0FBQTtRQWdCekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLG1DQUEwQixFQUFFLENBQUM7WUFDckQsT0FBTSxDQUFDLCtDQUErQztRQUN2RCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsb0JBQW9CLENBQUMsT0FBTyxDQUFVLGdCQUFnQixDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNwQixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUE7UUFDL0QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixhQUFhLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLENBQUE7Z0JBQzFELElBQUksVUFBVSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUM7b0JBQzVCLE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO3dCQUMzQyxNQUFNLG9CQUFvQixHQUN6QixjQUFjLENBQUMsbUJBQW1CLENBQ2pDLGNBQWMsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FDdkQ7NEJBQ0QsY0FBYyxDQUFDLG1CQUFtQixDQUNqQyxjQUFjLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLENBQ3ZELENBQUE7d0JBQ0YsSUFBSSxVQUFVLEtBQUssaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7NEJBQ3JGLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBOzRCQUV0QixNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FDdEMsVUFBVSxFQUNWLG9CQUFvQixFQUNwQixjQUFjLEVBQ2QsZ0JBQWdCLEVBQ2hCLGFBQWEsQ0FDYixDQUFBOzRCQUVELGFBQWEsQ0FBQyxNQUFNLENBQ25CLGFBQWEsQ0FBQyxLQUFLLEVBQ25CLGFBQWEsQ0FBQyxPQUFPLEVBQ3JCLGFBQWEsQ0FBQyxVQUFVLEVBQ3hCLGFBQWEsQ0FBQyxhQUFhLENBQzNCLENBQUE7d0JBQ0YsQ0FBQztvQkFDRixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBRVIsSUFBSSxDQUFDLFNBQVMsQ0FDYixVQUFVLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTt3QkFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzs0QkFDdEIsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFBO3dCQUNyQixDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUE1RUsseUJBQXlCO0lBSTVCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQ0FBbUMsQ0FBQTtJQUNuQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsY0FBYyxDQUFBO0dBYlgseUJBQXlCLENBNEU5QjtBQUVELFFBQVEsQ0FBQyxFQUFFLENBQ1YsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFDLDZCQUE2QixDQUFDLHlCQUF5QixvQ0FBNEIsQ0FBQTtBQUVyRixNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQ3hDLHVCQUF1QixDQUFDLGFBQWEsQ0FDckMsQ0FBQTtBQUNELHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO0lBQzNDLEdBQUcsZ0NBQWdDO0lBQ25DLFVBQVUsRUFBRTtRQUNYLHVDQUF1QyxFQUFFO1lBQ3hDLEtBQUssd0NBQWdDO1lBQ3JDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7WUFDZCxJQUFJLEVBQUUsQ0FBQyxjQUFjLENBQUM7WUFDdEIsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsMEJBQTBCLEVBQzFCLHVEQUF1RCxDQUN2RDtTQUNEO0tBQ0Q7Q0FDRCxDQUFDLENBQUEifQ==
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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../../nls.js';
import { Categories } from '../../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { IStorageService, } from '../../../../../../platform/storage/common/storage.js';
import { Extensions as WorkbenchExtensions, } from '../../../../../common/contributions.js';
import { Memento } from '../../../../../common/memento.js';
import { NotebookSetting } from '../../../common/notebookCommon.js';
import { HAS_OPENED_NOTEBOOK } from '../../../common/notebookContextKeys.js';
import { NotebookEditorInput } from '../../../common/notebookEditorInput.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
const hasOpenedNotebookKey = 'hasOpenedNotebook';
const hasShownGettingStartedKey = 'hasShownNotebookGettingStarted';
/**
 * Sets a context key when a notebook has ever been opened by the user
 */
let NotebookGettingStarted = class NotebookGettingStarted extends Disposable {
    constructor(_editorService, _storageService, _contextKeyService, _commandService, _configurationService) {
        super();
        const hasOpenedNotebook = HAS_OPENED_NOTEBOOK.bindTo(_contextKeyService);
        const memento = new Memento('notebookGettingStarted2', _storageService);
        const storedValue = memento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        if (storedValue[hasOpenedNotebookKey]) {
            hasOpenedNotebook.set(true);
        }
        const needToShowGettingStarted = _configurationService.getValue(NotebookSetting.openGettingStarted) &&
            !storedValue[hasShownGettingStartedKey];
        if (!storedValue[hasOpenedNotebookKey] || needToShowGettingStarted) {
            const onDidOpenNotebook = () => {
                hasOpenedNotebook.set(true);
                storedValue[hasOpenedNotebookKey] = true;
                if (needToShowGettingStarted) {
                    _commandService.executeCommand('workbench.action.openWalkthrough', { category: 'notebooks', step: 'notebookProfile' }, true);
                    storedValue[hasShownGettingStartedKey] = true;
                }
                memento.saveMemento();
            };
            if (_editorService.activeEditor?.typeId === NotebookEditorInput.ID) {
                // active editor is notebook
                onDidOpenNotebook();
                return;
            }
            const listener = this._register(_editorService.onDidActiveEditorChange(() => {
                if (_editorService.activeEditor?.typeId === NotebookEditorInput.ID) {
                    listener.dispose();
                    onDidOpenNotebook();
                }
            }));
        }
    }
};
NotebookGettingStarted = __decorate([
    __param(0, IEditorService),
    __param(1, IStorageService),
    __param(2, IContextKeyService),
    __param(3, ICommandService),
    __param(4, IConfigurationService)
], NotebookGettingStarted);
export { NotebookGettingStarted };
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NotebookGettingStarted, 3 /* LifecyclePhase.Restored */);
registerAction2(class NotebookClearNotebookLayoutAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.notebook.layout.gettingStarted',
            title: localize2('workbench.notebook.layout.gettingStarted.label', 'Reset notebook getting started'),
            f1: true,
            precondition: ContextKeyExpr.equals(`config.${NotebookSetting.openGettingStarted}`, true),
            category: Categories.Developer,
        });
    }
    run(accessor) {
        const storageService = accessor.get(IStorageService);
        const memento = new Memento('notebookGettingStarted', storageService);
        const storedValue = memento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        storedValue[hasOpenedNotebookKey] = undefined;
        memento.saveMemento();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tHZXR0aW5nU3RhcnRlZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9nZXR0aW5nU3RhcnRlZC9ub3RlYm9va0dldHRpbmdTdGFydGVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQy9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBQ2xCLE1BQU0sNERBQTRELENBQUE7QUFFbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBR04sVUFBVSxJQUFJLG1CQUFtQixHQUNqQyxNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBR3ZGLE1BQU0sb0JBQW9CLEdBQUcsbUJBQW1CLENBQUE7QUFDaEQsTUFBTSx5QkFBeUIsR0FBRyxnQ0FBZ0MsQ0FBQTtBQUVsRTs7R0FFRztBQUNJLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTtJQUNyRCxZQUNpQixjQUE4QixFQUM3QixlQUFnQyxFQUM3QixrQkFBc0MsRUFDekMsZUFBZ0MsRUFDMUIscUJBQTRDO1FBRW5FLEtBQUssRUFBRSxDQUFBO1FBRVAsTUFBTSxpQkFBaUIsR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUN4RSxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyx5QkFBeUIsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN2RSxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsVUFBVSwwREFBMEMsQ0FBQTtRQUNoRixJQUFJLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7WUFDdkMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVCLENBQUM7UUFFRCxNQUFNLHdCQUF3QixHQUM3QixxQkFBcUIsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDO1lBQ2xFLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLHdCQUF3QixFQUFFLENBQUM7WUFDcEUsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLEVBQUU7Z0JBQzlCLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDM0IsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsSUFBSSxDQUFBO2dCQUV4QyxJQUFJLHdCQUF3QixFQUFFLENBQUM7b0JBQzlCLGVBQWUsQ0FBQyxjQUFjLENBQzdCLGtDQUFrQyxFQUNsQyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLEVBQ2xELElBQUksQ0FDSixDQUFBO29CQUNELFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLElBQUksQ0FBQTtnQkFDOUMsQ0FBQztnQkFFRCxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDdEIsQ0FBQyxDQUFBO1lBRUQsSUFBSSxjQUFjLENBQUMsWUFBWSxFQUFFLE1BQU0sS0FBSyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDcEUsNEJBQTRCO2dCQUM1QixpQkFBaUIsRUFBRSxDQUFBO2dCQUNuQixPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzlCLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7Z0JBQzNDLElBQUksY0FBYyxDQUFDLFlBQVksRUFBRSxNQUFNLEtBQUssbUJBQW1CLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3BFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtvQkFDbEIsaUJBQWlCLEVBQUUsQ0FBQTtnQkFDcEIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFyRFksc0JBQXNCO0lBRWhDLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtHQU5YLHNCQUFzQixDQXFEbEM7O0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FDVixtQkFBbUIsQ0FBQyxTQUFTLENBQzdCLENBQUMsNkJBQTZCLENBQUMsc0JBQXNCLGtDQUEwQixDQUFBO0FBRWhGLGVBQWUsQ0FDZCxNQUFNLGlDQUFrQyxTQUFRLE9BQU87SUFDdEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsMENBQTBDO1lBQzlDLEtBQUssRUFBRSxTQUFTLENBQ2YsZ0RBQWdELEVBQ2hELGdDQUFnQyxDQUNoQztZQUNELEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSxlQUFlLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLENBQUM7WUFDekYsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1NBQzlCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNwRCxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUVyRSxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsVUFBVSwwREFBMEMsQ0FBQTtRQUNoRixXQUFXLENBQUMsb0JBQW9CLENBQUMsR0FBRyxTQUFTLENBQUE7UUFDN0MsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ3RCLENBQUM7Q0FDRCxDQUNELENBQUEifQ==
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tHZXR0aW5nU3RhcnRlZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2dldHRpbmdTdGFydGVkL25vdGVib29rR2V0dGluZ1N0YXJ0ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsR0FDbEIsTUFBTSw0REFBNEQsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFHTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0Ms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
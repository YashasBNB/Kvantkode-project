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
import { ActionViewItem, } from '../../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Action } from '../../../../../base/common/actions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, } from '../../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { NOTEBOOK_ACTIONS_CATEGORY, SELECT_KERNEL_ID } from '../controller/coreActions.js';
import { getNotebookEditorFromEditorPane } from '../notebookBrowser.js';
import { selectKernelIcon } from '../notebookIcons.js';
import { KernelPickerMRUStrategy, } from './notebookKernelQuickPickStrategy.js';
import { NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_KERNEL_COUNT, } from '../../common/notebookContextKeys.js';
import { INotebookKernelHistoryService, INotebookKernelService, } from '../../common/notebookKernelService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
function getEditorFromContext(editorService, context) {
    let editor;
    if (context !== undefined && 'notebookEditorId' in context) {
        const editorId = context.notebookEditorId;
        const matchingEditor = editorService.visibleEditorPanes.find((editorPane) => {
            const notebookEditor = getNotebookEditorFromEditorPane(editorPane);
            return notebookEditor?.getId() === editorId;
        });
        editor = getNotebookEditorFromEditorPane(matchingEditor);
    }
    else if (context !== undefined && 'notebookEditor' in context) {
        editor = context?.notebookEditor;
    }
    else {
        editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    }
    return editor;
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SELECT_KERNEL_ID,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            title: localize2('notebookActions.selectKernel', 'Select Notebook Kernel'),
            icon: selectKernelIcon,
            f1: true,
            precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, ContextKeyExpr.notEquals('config.notebook.globalToolbar', true)),
                    group: 'navigation',
                    order: -10,
                },
                {
                    id: MenuId.NotebookToolbar,
                    when: ContextKeyExpr.equals('config.notebook.globalToolbar', true),
                    group: 'status',
                    order: -10,
                },
                {
                    id: MenuId.InteractiveToolbar,
                    when: NOTEBOOK_KERNEL_COUNT.notEqualsTo(0),
                    group: 'status',
                    order: -10,
                },
            ],
            metadata: {
                description: localize('notebookActions.selectKernel.args', 'Notebook Kernel Args'),
                args: [
                    {
                        name: 'kernelInfo',
                        description: 'The kernel info',
                        schema: {
                            type: 'object',
                            required: ['id', 'extension'],
                            properties: {
                                id: {
                                    type: 'string',
                                },
                                extension: {
                                    type: 'string',
                                },
                                notebookEditorId: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                ],
            },
        });
    }
    async run(accessor, context) {
        const instantiationService = accessor.get(IInstantiationService);
        const editorService = accessor.get(IEditorService);
        const editor = getEditorFromContext(editorService, context);
        if (!editor || !editor.hasModel()) {
            return false;
        }
        let controllerId = context && 'id' in context ? context.id : undefined;
        let extensionId = context && 'extension' in context ? context.extension : undefined;
        if (controllerId && (typeof controllerId !== 'string' || typeof extensionId !== 'string')) {
            // validate context: id & extension MUST be strings
            controllerId = undefined;
            extensionId = undefined;
        }
        const notebook = editor.textModel;
        const notebookKernelService = accessor.get(INotebookKernelService);
        const matchResult = notebookKernelService.getMatchingKernel(notebook);
        const { selected } = matchResult;
        if (selected &&
            controllerId &&
            selected.id === controllerId &&
            ExtensionIdentifier.equals(selected.extension, extensionId)) {
            // current kernel is wanted kernel -> done
            return true;
        }
        const wantedKernelId = controllerId ? `${extensionId}/${controllerId}` : undefined;
        const strategy = instantiationService.createInstance(KernelPickerMRUStrategy);
        return strategy.showQuickPick(editor, wantedKernelId);
    }
});
let NotebooKernelActionViewItem = class NotebooKernelActionViewItem extends ActionViewItem {
    constructor(actualAction, _editor, options, _notebookKernelService, _notebookKernelHistoryService) {
        const action = new Action('fakeAction', undefined, ThemeIcon.asClassName(selectKernelIcon), true, (event) => actualAction.run(event));
        super(undefined, action, { ...options, label: false, icon: true });
        this._editor = _editor;
        this._notebookKernelService = _notebookKernelService;
        this._notebookKernelHistoryService = _notebookKernelHistoryService;
        this._register(action);
        this._register(_editor.onDidChangeModel(this._update, this));
        this._register(_notebookKernelService.onDidAddKernel(this._update, this));
        this._register(_notebookKernelService.onDidRemoveKernel(this._update, this));
        this._register(_notebookKernelService.onDidChangeNotebookAffinity(this._update, this));
        this._register(_notebookKernelService.onDidChangeSelectedNotebooks(this._update, this));
        this._register(_notebookKernelService.onDidChangeSourceActions(this._update, this));
        this._register(_notebookKernelService.onDidChangeKernelDetectionTasks(this._update, this));
    }
    render(container) {
        this._update();
        super.render(container);
        container.classList.add('kernel-action-view-item');
        this._kernelLabel = document.createElement('a');
        container.appendChild(this._kernelLabel);
        this.updateLabel();
    }
    updateLabel() {
        if (this._kernelLabel) {
            this._kernelLabel.classList.add('kernel-label');
            this._kernelLabel.innerText = this._action.label;
        }
    }
    _update() {
        const notebook = this._editor.textModel;
        if (!notebook) {
            this._resetAction();
            return;
        }
        KernelPickerMRUStrategy.updateKernelStatusAction(notebook, this._action, this._notebookKernelService, this._notebookKernelHistoryService);
        this.updateClass();
    }
    _resetAction() {
        this._action.enabled = false;
        this._action.label = '';
        this._action.class = '';
    }
};
NotebooKernelActionViewItem = __decorate([
    __param(3, INotebookKernelService),
    __param(4, INotebookKernelHistoryService)
], NotebooKernelActionViewItem);
export { NotebooKernelActionViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3UGFydHMvbm90ZWJvb2tLZXJuZWxWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sdUNBQXVDLENBQUE7QUFFdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sY0FBYyxHQUVkLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMxRixPQUFPLEVBQUUsK0JBQStCLEVBQW1CLE1BQU0sdUJBQXVCLENBQUE7QUFDeEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDdEQsT0FBTyxFQUNOLHVCQUF1QixHQUV2QixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFDTix5QkFBeUIsRUFDekIscUJBQXFCLEdBQ3JCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixzQkFBc0IsR0FDdEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFcEYsU0FBUyxvQkFBb0IsQ0FDNUIsYUFBNkIsRUFDN0IsT0FBZ0M7SUFFaEMsSUFBSSxNQUFtQyxDQUFBO0lBQ3ZDLElBQUksT0FBTyxLQUFLLFNBQVMsSUFBSSxrQkFBa0IsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM1RCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUE7UUFDekMsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQzNFLE1BQU0sY0FBYyxHQUFHLCtCQUErQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ2xFLE9BQU8sY0FBYyxFQUFFLEtBQUssRUFBRSxLQUFLLFFBQVEsQ0FBQTtRQUM1QyxDQUFDLENBQUMsQ0FBQTtRQUNGLE1BQU0sR0FBRywrQkFBK0IsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUN6RCxDQUFDO1NBQU0sSUFBSSxPQUFPLEtBQUssU0FBUyxJQUFJLGdCQUFnQixJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2pFLE1BQU0sR0FBRyxPQUFPLEVBQUUsY0FBYyxDQUFBO0lBQ2pDLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxHQUFHLCtCQUErQixDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsZ0JBQWdCO1lBQ3BCLFFBQVEsRUFBRSx5QkFBeUI7WUFDbkMsS0FBSyxFQUFFLFNBQVMsQ0FBQyw4QkFBOEIsRUFBRSx3QkFBd0IsQ0FBQztZQUMxRSxJQUFJLEVBQUUsZ0JBQWdCO1lBQ3RCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLHlCQUF5QjtZQUN2QyxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIseUJBQXlCLEVBQ3pCLGNBQWMsQ0FBQyxTQUFTLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDLENBQy9EO29CQUNELEtBQUssRUFBRSxZQUFZO29CQUNuQixLQUFLLEVBQUUsQ0FBQyxFQUFFO2lCQUNWO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZTtvQkFDMUIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDO29CQUNsRSxLQUFLLEVBQUUsUUFBUTtvQkFDZixLQUFLLEVBQUUsQ0FBQyxFQUFFO2lCQUNWO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO29CQUM3QixJQUFJLEVBQUUscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFDMUMsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUMsRUFBRTtpQkFDVjthQUNEO1lBQ0QsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxRQUFRLENBQUMsbUNBQW1DLEVBQUUsc0JBQXNCLENBQUM7Z0JBQ2xGLElBQUksRUFBRTtvQkFDTDt3QkFDQyxJQUFJLEVBQUUsWUFBWTt3QkFDbEIsV0FBVyxFQUFFLGlCQUFpQjt3QkFDOUIsTUFBTSxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUM7NEJBQzdCLFVBQVUsRUFBRTtnQ0FDWCxFQUFFLEVBQUU7b0NBQ0gsSUFBSSxFQUFFLFFBQVE7aUNBQ2Q7Z0NBQ0QsU0FBUyxFQUFFO29DQUNWLElBQUksRUFBRSxRQUFRO2lDQUNkO2dDQUNELGdCQUFnQixFQUFFO29DQUNqQixJQUFJLEVBQUUsUUFBUTtpQ0FDZDs2QkFDRDt5QkFDRDtxQkFDRDtpQkFDRDthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUFnQztRQUNyRSxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUNoRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRWxELE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUUzRCxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDbkMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxZQUFZLEdBQUcsT0FBTyxJQUFJLElBQUksSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUN0RSxJQUFJLFdBQVcsR0FBRyxPQUFPLElBQUksV0FBVyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBRW5GLElBQUksWUFBWSxJQUFJLENBQUMsT0FBTyxZQUFZLEtBQUssUUFBUSxJQUFJLE9BQU8sV0FBVyxLQUFLLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDM0YsbURBQW1EO1lBQ25ELFlBQVksR0FBRyxTQUFTLENBQUE7WUFDeEIsV0FBVyxHQUFHLFNBQVMsQ0FBQTtRQUN4QixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQTtRQUNqQyxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUNsRSxNQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsV0FBVyxDQUFBO1FBRWhDLElBQ0MsUUFBUTtZQUNSLFlBQVk7WUFDWixRQUFRLENBQUMsRUFBRSxLQUFLLFlBQVk7WUFDNUIsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLEVBQzFELENBQUM7WUFDRiwwQ0FBMEM7WUFDMUMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsSUFBSSxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ2xGLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBQzdFLE9BQU8sUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDdEQsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVNLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsY0FBYztJQUc5RCxZQUNDLFlBQXFCLEVBQ0osT0FNQyxFQUNsQixPQUErQixFQUNVLHNCQUE4QyxFQUV0RSw2QkFBNEQ7UUFFN0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQ3hCLFlBQVksRUFDWixTQUFTLEVBQ1QsU0FBUyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUN2QyxJQUFJLEVBQ0osQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQ2xDLENBQUE7UUFDRCxLQUFLLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxFQUFFLEdBQUcsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFuQmpELFlBQU8sR0FBUCxPQUFPLENBTU47UUFFdUIsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF3QjtRQUV0RSxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQStCO1FBVTdFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzVELElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUN6RSxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUN0RixJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUN2RixJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNuRixJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUMzRixDQUFDO0lBRVEsTUFBTSxDQUFDLFNBQXNCO1FBQ3JDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdkIsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0MsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ25CLENBQUM7SUFFa0IsV0FBVztRQUM3QixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDL0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7SUFFUyxPQUFPO1FBQ2hCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFBO1FBRXZDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUNuQixPQUFNO1FBQ1AsQ0FBQztRQUVELHVCQUF1QixDQUFDLHdCQUF3QixDQUMvQyxRQUFRLEVBQ1IsSUFBSSxDQUFDLE9BQU8sRUFDWixJQUFJLENBQUMsc0JBQXNCLEVBQzNCLElBQUksQ0FBQyw2QkFBNkIsQ0FDbEMsQ0FBQTtRQUVELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0lBRU8sWUFBWTtRQUNuQixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7UUFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0NBQ0QsQ0FBQTtBQTFFWSwyQkFBMkI7SUFhckMsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLDZCQUE2QixDQUFBO0dBZG5CLDJCQUEyQixDQTBFdkMifQ==
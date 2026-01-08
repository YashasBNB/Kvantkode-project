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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdQYXJ0cy9ub3RlYm9va0tlcm5lbFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGNBQWMsR0FFZCxNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BHLE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzFGLE9BQU8sRUFBRSwrQkFBK0IsRUFBbUIsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sdUJBQXVCLEdBRXZCLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixxQkFBcUIsR0FDckIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQ04sNkJBQTZCLEVBQzdC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
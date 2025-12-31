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
import { ToolBar } from '../../../../../../base/browser/ui/toolbar/toolbar.js';
import { Action } from '../../../../../../base/common/actions.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { localize } from '../../../../../../nls.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { getActionBarActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuItemAction, } from '../../../../../../platform/actions/common/actions.js';
import { InputFocusedContext } from '../../../../../../platform/contextkey/common/contextkeys.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { CellContentPart } from '../cellPart.js';
import { registerCellToolbarStickyScroll } from './cellToolbarStickyScroll.js';
import { NOTEBOOK_CELL_EXECUTION_STATE, NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_TYPE, NOTEBOOK_EDITOR_FOCUSED, } from '../../../common/notebookContextKeys.js';
let RunToolbar = class RunToolbar extends CellContentPart {
    constructor(notebookEditor, contextKeyService, cellContainer, runButtonContainer, primaryMenuId, secondaryMenuId, menuService, keybindingService, contextMenuService, instantiationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.contextKeyService = contextKeyService;
        this.cellContainer = cellContainer;
        this.runButtonContainer = runButtonContainer;
        this.keybindingService = keybindingService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.primaryMenu = this._register(menuService.createMenu(primaryMenuId, contextKeyService));
        this.secondaryMenu = this._register(menuService.createMenu(secondaryMenuId, contextKeyService));
        this.createRunCellToolbar(runButtonContainer, cellContainer, contextKeyService);
        const updateActions = () => {
            const actions = this.getCellToolbarActions(this.primaryMenu);
            const primary = actions.primary[0]; // Only allow one primary action
            this.toolbar.setActions(primary ? [primary] : []);
        };
        updateActions();
        this._register(this.primaryMenu.onDidChange(updateActions));
        this._register(this.secondaryMenu.onDidChange(updateActions));
        this._register(this.notebookEditor.notebookOptions.onDidChangeOptions(updateActions));
    }
    didRenderCell(element) {
        this.cellDisposables.add(registerCellToolbarStickyScroll(this.notebookEditor, element, this.runButtonContainer));
        if (this.notebookEditor.hasModel()) {
            const context = {
                ui: true,
                cell: element,
                notebookEditor: this.notebookEditor,
                $mid: 13 /* MarshalledId.NotebookCellActionContext */,
            };
            this.toolbar.context = context;
        }
    }
    getCellToolbarActions(menu) {
        return getActionBarActions(menu.getActions({ shouldForwardArgs: true }), (g) => /^inline/.test(g));
    }
    createRunCellToolbar(container, cellContainer, contextKeyService) {
        const actionViewItemDisposables = this._register(new DisposableStore());
        const dropdownAction = this._register(new Action('notebook.moreRunActions', localize('notebook.moreRunActionsLabel', 'More...'), 'codicon-chevron-down', true));
        const keybindingProvider = (action) => this.keybindingService.lookupKeybinding(action.id, executionContextKeyService);
        const executionContextKeyService = this._register(getCodeCellExecutionContextKeyService(contextKeyService));
        this.toolbar = this._register(new ToolBar(container, this.contextMenuService, {
            getKeyBinding: keybindingProvider,
            actionViewItemProvider: (_action, _options) => {
                actionViewItemDisposables.clear();
                const primary = this.getCellToolbarActions(this.primaryMenu).primary[0];
                if (!(primary instanceof MenuItemAction)) {
                    return undefined;
                }
                const secondary = this.getCellToolbarActions(this.secondaryMenu).secondary;
                if (!secondary.length) {
                    return undefined;
                }
                const item = this.instantiationService.createInstance(DropdownWithPrimaryActionViewItem, primary, dropdownAction, secondary, 'notebook-cell-run-toolbar', {
                    ..._options,
                    getKeyBinding: keybindingProvider,
                });
                actionViewItemDisposables.add(item.onDidChangeDropdownVisibility((visible) => {
                    cellContainer.classList.toggle('cell-run-toolbar-dropdown-active', visible);
                }));
                return item;
            },
            renderDropdownAsChildElement: true,
        }));
    }
};
RunToolbar = __decorate([
    __param(6, IMenuService),
    __param(7, IKeybindingService),
    __param(8, IContextMenuService),
    __param(9, IInstantiationService)
], RunToolbar);
export { RunToolbar };
export function getCodeCellExecutionContextKeyService(contextKeyService) {
    // Create a fake ContextKeyService, and look up the keybindings within this context.
    const executionContextKeyService = contextKeyService.createScoped(document.createElement('div'));
    InputFocusedContext.bindTo(executionContextKeyService).set(true);
    EditorContextKeys.editorTextFocus.bindTo(executionContextKeyService).set(true);
    EditorContextKeys.focus.bindTo(executionContextKeyService).set(true);
    EditorContextKeys.textInputFocus.bindTo(executionContextKeyService).set(true);
    NOTEBOOK_CELL_EXECUTION_STATE.bindTo(executionContextKeyService).set('idle');
    NOTEBOOK_CELL_LIST_FOCUSED.bindTo(executionContextKeyService).set(true);
    NOTEBOOK_EDITOR_FOCUSED.bindTo(executionContextKeyService).set(true);
    NOTEBOOK_CELL_TYPE.bindTo(executionContextKeyService).set('code');
    return executionContextKeyService;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNlbGxSdW5Ub29sYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jb2RlQ2VsbFJ1blRvb2xiYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlGQUFpRixDQUFBO0FBQ25JLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQzNHLE9BQU8sRUFFTixZQUFZLEVBRVosY0FBYyxHQUNkLE1BQU0sc0RBQXNELENBQUE7QUFLN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ2hELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlFLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsMEJB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
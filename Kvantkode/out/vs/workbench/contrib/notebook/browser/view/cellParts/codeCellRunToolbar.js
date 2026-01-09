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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNlbGxSdW5Ub29sYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NvZGVDZWxsUnVuVG9vbGJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUU1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUZBQWlGLENBQUE7QUFDbkksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUVBQXVFLENBQUE7QUFDM0csT0FBTyxFQUVOLFlBQVksRUFFWixjQUFjLEdBQ2QsTUFBTSxzREFBc0QsQ0FBQTtBQUs3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUcvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDaEQsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUUsT0FB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
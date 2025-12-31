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
var NotebookVariablesView_1;
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import * as nls from '../../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchAsyncDataTree } from '../../../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../../../common/views.js';
import { CONTEXT_VARIABLE_EXTENSIONID, CONTEXT_VARIABLE_INTERFACES, CONTEXT_VARIABLE_LANGUAGE, CONTEXT_VARIABLE_NAME, CONTEXT_VARIABLE_TYPE, CONTEXT_VARIABLE_VALUE, } from '../../../../debug/common/debug.js';
import { NotebookVariableDataSource, } from './notebookVariablesDataSource.js';
import { NotebookVariableAccessibilityProvider, NotebookVariableRenderer, NotebookVariablesDelegate, } from './notebookVariablesTree.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { INotebookExecutionStateService, } from '../../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { isCompositeNotebookEditorInput } from '../../../common/notebookEditorInput.js';
let NotebookVariablesView = class NotebookVariablesView extends ViewPane {
    static { NotebookVariablesView_1 = this; }
    static { this.ID = 'notebookVariablesView'; }
    static { this.NOTEBOOK_TITLE = nls.localize2('notebook.notebookVariables', 'Notebook Variables'); }
    static { this.REPL_TITLE = nls.localize2('notebook.ReplVariables', 'REPL Variables'); }
    constructor(options, editorService, notebookKernelService, notebookExecutionStateService, keybindingService, contextMenuService, contextKeyService, configurationService, instantiationService, viewDescriptorService, openerService, quickInputService, commandService, themeService, hoverService, menuService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.editorService = editorService;
        this.notebookKernelService = notebookKernelService;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.menuService = menuService;
        this._register(this.editorService.onDidActiveEditorChange(() => this.handleActiveEditorChange()));
        this._register(this.notebookKernelService.onDidNotebookVariablesUpdate(this.handleVariablesChanged.bind(this)));
        this._register(this.notebookExecutionStateService.onDidChangeExecution(this.handleExecutionStateChange.bind(this)));
        this._register(this.editorService.onDidCloseEditor((e) => this.handleCloseEditor(e)));
        this.handleActiveEditorChange(false);
        this.dataSource = new NotebookVariableDataSource(this.notebookKernelService);
        this.updateScheduler = new RunOnceScheduler(() => this.tree?.updateChildren(), 100);
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'notebookVariablesTree', container, new NotebookVariablesDelegate(), [this.instantiationService.createInstance(NotebookVariableRenderer)], this.dataSource, {
            accessibilityProvider: new NotebookVariableAccessibilityProvider(),
            identityProvider: { getId: (e) => e.id },
        });
        this.tree.layout();
        if (this.activeNotebook) {
            this.tree.setInput({ kind: 'root', notebook: this.activeNotebook });
        }
        this._register(this.tree.onContextMenu((e) => this.onContextMenu(e)));
    }
    onContextMenu(e) {
        if (!e.element) {
            return;
        }
        const element = e.element;
        const arg = {
            source: element.notebook.uri.toString(),
            name: element.name,
            value: element.value,
            type: element.type,
            expression: element.expression,
            language: element.language,
            extensionId: element.extensionId,
        };
        const overlayedContext = this.contextKeyService.createOverlay([
            [CONTEXT_VARIABLE_NAME.key, element.name],
            [CONTEXT_VARIABLE_VALUE.key, element.value],
            [CONTEXT_VARIABLE_TYPE.key, element.type],
            [CONTEXT_VARIABLE_INTERFACES.key, element.interfaces],
            [CONTEXT_VARIABLE_LANGUAGE.key, element.language],
            [CONTEXT_VARIABLE_EXTENSIONID.key, element.extensionId],
        ]);
        const menuActions = this.menuService.getMenuActions(MenuId.NotebookVariablesContext, overlayedContext, { arg, shouldForwardArgs: true });
        const actions = getFlatContextMenuActions(menuActions);
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => actions,
        });
    }
    focus() {
        super.focus();
        this.tree?.domFocus();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree?.layout(height, width);
    }
    setActiveNotebook(notebookDocument, editor, doUpdate = true) {
        this.activeNotebook = notebookDocument;
        if (isCompositeNotebookEditorInput(editor.input)) {
            this.updateTitle(NotebookVariablesView_1.REPL_TITLE.value);
        }
        else {
            this.updateTitle(NotebookVariablesView_1.NOTEBOOK_TITLE.value);
        }
        if (doUpdate) {
            this.tree?.setInput({ kind: 'root', notebook: notebookDocument });
            this.updateScheduler.schedule();
        }
    }
    getActiveNotebook() {
        const notebookEditor = this.editorService.activeEditorPane;
        const notebookDocument = getNotebookEditorFromEditorPane(notebookEditor)?.textModel;
        return notebookDocument && notebookEditor ? { notebookDocument, notebookEditor } : undefined;
    }
    handleCloseEditor(e) {
        if (e.editor.resource && e.editor.resource.toString() === this.activeNotebook?.uri.toString()) {
            this.tree?.setInput({ kind: 'empty' });
            this.updateScheduler.schedule();
        }
    }
    handleActiveEditorChange(doUpdate = true) {
        const found = this.getActiveNotebook();
        if (found && found.notebookDocument !== this.activeNotebook) {
            this.setActiveNotebook(found.notebookDocument, found.notebookEditor, doUpdate);
        }
    }
    handleExecutionStateChange(event) {
        if (this.activeNotebook && event.affectsNotebook(this.activeNotebook.uri)) {
            // new execution state means either new variables or the kernel is busy so we shouldn't ask
            this.dataSource.cancel();
            // changed === undefined -> excecution ended
            if (event.changed === undefined) {
                this.updateScheduler.schedule();
            }
            else {
                this.updateScheduler.cancel();
            }
        }
        else if (!this.getActiveNotebook()) {
            // check if the updated variables are for a visible notebook
            this.editorService.visibleEditorPanes.forEach((editor) => {
                const notebookDocument = getNotebookEditorFromEditorPane(editor)?.textModel;
                if (notebookDocument && event.affectsNotebook(notebookDocument.uri)) {
                    this.setActiveNotebook(notebookDocument, editor);
                }
            });
        }
    }
    handleVariablesChanged(notebookUri) {
        if (this.activeNotebook && notebookUri.toString() === this.activeNotebook.uri.toString()) {
            this.updateScheduler.schedule();
        }
        else if (!this.getActiveNotebook()) {
            // check if the updated variables are for a visible notebook
            this.editorService.visibleEditorPanes.forEach((editor) => {
                const notebookDocument = getNotebookEditorFromEditorPane(editor)?.textModel;
                if (notebookDocument && notebookDocument.uri.toString() === notebookUri.toString()) {
                    this.setActiveNotebook(notebookDocument, editor);
                }
            });
        }
    }
};
NotebookVariablesView = NotebookVariablesView_1 = __decorate([
    __param(1, IEditorService),
    __param(2, INotebookKernelService),
    __param(3, INotebookExecutionStateService),
    __param(4, IKeybindingService),
    __param(5, IContextMenuService),
    __param(6, IContextKeyService),
    __param(7, IConfigurationService),
    __param(8, IInstantiationService),
    __param(9, IViewDescriptorService),
    __param(10, IOpenerService),
    __param(11, IQuickInputService),
    __param(12, ICommandService),
    __param(13, IThemeService),
    __param(14, IHoverService),
    __param(15, IMenuService)
], NotebookVariablesView);
export { NotebookVariablesView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL25vdGVib29rVmFyaWFibGVzL25vdGVib29rVmFyaWFibGVzVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFekUsT0FBTyxLQUFLLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQTtBQUUvQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQTtBQUNqSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDL0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxh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
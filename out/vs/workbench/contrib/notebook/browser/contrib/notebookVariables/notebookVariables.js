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
import * as nls from '../../../../../../nls.js';
import { IConfigurationService, } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { Extensions, IViewDescriptorService } from '../../../../../common/views.js';
import { VIEWLET_ID as debugContainerId } from '../../../../debug/common/debug.js';
import { NOTEBOOK_VARIABLE_VIEW_ENABLED } from './notebookVariableContextKeys.js';
import { NotebookVariablesView } from './notebookVariablesView.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { variablesViewIcon } from '../../notebookIcons.js';
import { NotebookSetting } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { INotebookService } from '../../../common/notebookService.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
let NotebookVariables = class NotebookVariables extends Disposable {
    constructor(contextKeyService, configurationService, editorService, notebookExecutionStateService, notebookKernelService, notebookDocumentService, viewDescriptorService) {
        super();
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.notebookKernelService = notebookKernelService;
        this.notebookDocumentService = notebookDocumentService;
        this.viewDescriptorService = viewDescriptorService;
        this.listeners = [];
        this.initialized = false;
        this.viewEnabled = NOTEBOOK_VARIABLE_VIEW_ENABLED.bindTo(contextKeyService);
        this.listeners.push(this.editorService.onDidActiveEditorChange(() => this.handleInitEvent()));
        this.listeners.push(this.notebookExecutionStateService.onDidChangeExecution((e) => this.handleInitEvent(e.notebook)));
        this.configListener = configurationService.onDidChangeConfiguration((e) => this.handleConfigChange(e));
    }
    handleConfigChange(e) {
        if (e.affectsConfiguration(NotebookSetting.notebookVariablesView)) {
            this.handleInitEvent();
        }
    }
    handleInitEvent(notebook) {
        const enabled = this.editorService.activeEditorPane?.getId() === 'workbench.editor.repl' ||
            this.configurationService.getValue(NotebookSetting.notebookVariablesView) ||
            // old setting key
            this.configurationService.getValue('notebook.experimental.variablesView');
        if (enabled &&
            (!!notebook || this.editorService.activeEditorPane?.getId() === 'workbench.editor.notebook')) {
            if (this.hasVariableProvider(notebook) && !this.initialized && this.initializeView()) {
                this.viewEnabled.set(true);
                this.initialized = true;
                this.listeners.forEach((listener) => listener.dispose());
            }
        }
    }
    hasVariableProvider(notebookUri) {
        const notebook = notebookUri
            ? this.notebookDocumentService.getNotebookTextModel(notebookUri)
            : getNotebookEditorFromEditorPane(this.editorService.activeEditorPane)?.getViewModel()
                ?.notebookDocument;
        return (notebook &&
            this.notebookKernelService.getMatchingKernel(notebook).selected?.hasVariableProvider);
    }
    initializeView() {
        const debugViewContainer = this.viewDescriptorService.getViewContainerById(debugContainerId);
        if (debugViewContainer) {
            const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
            const viewDescriptor = {
                id: 'workbench.notebook.variables',
                name: nls.localize2('notebookVariables', 'Notebook Variables'),
                containerIcon: variablesViewIcon,
                ctorDescriptor: new SyncDescriptor(NotebookVariablesView),
                order: 50,
                weight: 5,
                canToggleVisibility: true,
                canMoveView: true,
                collapsed: false,
                when: NOTEBOOK_VARIABLE_VIEW_ENABLED,
            };
            viewsRegistry.registerViews([viewDescriptor], debugViewContainer);
            return true;
        }
        return false;
    }
    dispose() {
        super.dispose();
        this.listeners.forEach((listener) => listener.dispose());
        this.configListener.dispose();
    }
};
NotebookVariables = __decorate([
    __param(0, IContextKeyService),
    __param(1, IConfigurationService),
    __param(2, IEditorService),
    __param(3, INotebookExecutionStateService),
    __param(4, INotebookKernelService),
    __param(5, INotebookService),
    __param(6, IViewDescriptorService)
], NotebookVariables);
export { NotebookVariables };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvbm90ZWJvb2tWYXJpYWJsZXMvbm90ZWJvb2tWYXJpYWJsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDRDQUE0QyxDQUFBO0FBRXBGLE9BQU8sS0FBSyxHQUFHLE1BQU0sMEJBQTBCLENBQUE7QUFDL0MsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRWpGLE9BQU8sRUFBRSxVQUFVLEVBQUUsc0JBQXNCLEVBQWtCLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkcsT0FBTyxFQUFFLFVBQVUsSUFBSSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRyxPQUFPLEVB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
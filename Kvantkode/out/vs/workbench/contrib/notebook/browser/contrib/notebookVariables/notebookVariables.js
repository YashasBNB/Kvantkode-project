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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va1ZhcmlhYmxlcy9ub3RlYm9va1ZhcmlhYmxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sNENBQTRDLENBQUE7QUFFcEYsT0FBTyxLQUFLLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQTtBQUMvQyxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxzQkFBc0IsRUFBa0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsVUFBVSxJQUFJLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbEUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pHLE9B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
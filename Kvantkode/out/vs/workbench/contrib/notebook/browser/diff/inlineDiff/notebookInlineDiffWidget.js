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
import * as DOM from '../../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { EditorExtensionsRegistry } from '../../../../../../editor/browser/editorExtensions.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { NotebookInlineDiffDecorationContribution } from './notebookInlineDiff.js';
import { NotebookEditorExtensionsRegistry } from '../../notebookEditorExtensions.js';
import { INotebookEditorService } from '../../services/notebookEditorService.js';
let NotebookInlineDiffWidget = class NotebookInlineDiffWidget extends Disposable {
    get editorWidget() {
        return this.widget.value;
    }
    constructor(rootElement, groupId, window, options, dimension, instantiationService, widgetService) {
        super();
        this.rootElement = rootElement;
        this.groupId = groupId;
        this.window = window;
        this.options = options;
        this.dimension = dimension;
        this.instantiationService = instantiationService;
        this.widgetService = widgetService;
        this.widget = { value: undefined };
    }
    async show(input, model, previousModel, options) {
        if (!this.widget.value) {
            this.createNotebookWidget(input, this.groupId, this.rootElement);
        }
        if (this.dimension) {
            this.widget.value?.layout(this.dimension, this.rootElement, this.position);
        }
        if (model) {
            await this.widget.value?.setOptions({ ...options });
            this.widget.value?.notebookOptions.previousModelToCompare.set(previousModel, undefined);
            await this.widget.value.setModel(model, options?.viewState);
        }
    }
    hide() {
        if (this.widget.value) {
            this.widget.value.notebookOptions.previousModelToCompare.set(undefined, undefined);
            this.widget.value.onWillHide();
        }
    }
    setLayout(dimension, position) {
        this.dimension = dimension;
        this.position = position;
    }
    createNotebookWidget(input, groupId, rootElement) {
        const contributions = NotebookEditorExtensionsRegistry.getSomeEditorContributions([
            NotebookInlineDiffDecorationContribution.ID,
        ]);
        const menuIds = {
            notebookToolbar: MenuId.NotebookToolbar,
            cellTitleToolbar: MenuId.NotebookCellTitle,
            cellDeleteToolbar: MenuId.NotebookCellDelete,
            cellInsertToolbar: MenuId.NotebookCellBetween,
            cellTopInsertToolbar: MenuId.NotebookCellListTop,
            cellExecuteToolbar: MenuId.NotebookCellExecute,
            cellExecutePrimary: undefined,
        };
        const skipContributions = [
            'editor.contrib.review',
            'editor.contrib.floatingClickMenu',
            'editor.contrib.dirtydiff',
            'editor.contrib.testingOutputPeek',
            'editor.contrib.testingDecorations',
            'store.contrib.stickyScrollController',
            'editor.contrib.findController',
            'editor.contrib.emptyTextEditorHint',
        ];
        const cellEditorContributions = EditorExtensionsRegistry.getEditorContributions().filter((c) => skipContributions.indexOf(c.id) === -1);
        this.widget = (this.instantiationService.invokeFunction(this.widgetService.retrieveWidget, groupId, input, { contributions, menuIds, cellEditorContributions, options: this.options }, this.dimension, this.window));
        if (this.rootElement && this.widget.value.getDomNode()) {
            this.rootElement.setAttribute('aria-flowto', this.widget.value.getDomNode().id || '');
            DOM.setParentFlowTo(this.widget.value.getDomNode(), this.rootElement);
        }
    }
    dispose() {
        super.dispose();
        if (this.widget.value) {
            this.widget.value.dispose();
        }
    }
};
NotebookInlineDiffWidget = __decorate([
    __param(5, IInstantiationService),
    __param(6, INotebookEditorService)
], NotebookInlineDiffWidget);
export { NotebookInlineDiffWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmxpbmVEaWZmV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvaW5saW5lRGlmZi9ub3RlYm9va0lubGluZURpZmZXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDL0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBR3hHLE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRWxGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBR3BGLE9BQU8sRUFBZ0Isc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUV2RixJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFJdkQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQTtJQUN6QixDQUFDO0lBRUQsWUFDa0IsV0FBd0IsRUFDeEIsT0FBZSxFQUNmLE1BQWtCLEVBQ2xCLE9BQXdCLEVBQ2pDLFNBQW9DLEVBQ3JCLG9CQUE0RCxFQUMzRCxhQUFzRDtRQUU5RSxLQUFLLEVBQUUsQ0FBQTtRQVJVLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3hCLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixXQUFNLEdBQU4sTUFB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
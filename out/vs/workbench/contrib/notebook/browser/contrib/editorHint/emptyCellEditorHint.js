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
import { Schemas } from '../../../../../../base/common/network.js';
import { registerEditorContribution, } from '../../../../../../editor/browser/editorExtensions.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IProductService } from '../../../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { IChatAgentService } from '../../../../chat/common/chatAgents.js';
import { EmptyTextEditorHintContribution, } from '../../../../codeEditor/browser/emptyTextEditorHint/emptyTextEditorHint.js';
import { IInlineChatSessionService } from '../../../../inlineChat/browser/inlineChatSessionService.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { IEditorGroupsService } from '../../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
let EmptyCellEditorHintContribution = class EmptyCellEditorHintContribution extends EmptyTextEditorHintContribution {
    static { this.CONTRIB_ID = 'notebook.editor.contrib.emptyCellEditorHint'; }
    constructor(editor, _editorService, editorGroupsService, commandService, configurationService, hoverService, keybindingService, inlineChatSessionService, chatAgentService, telemetryService, productService, contextMenuService) {
        super(editor, editorGroupsService, commandService, configurationService, hoverService, keybindingService, inlineChatSessionService, chatAgentService, telemetryService, productService, contextMenuService);
        this._editorService = _editorService;
        const activeEditor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
        if (!activeEditor) {
            return;
        }
        this.toDispose.push(activeEditor.onDidChangeActiveCell(() => this.update()));
    }
    _getOptions() {
        return { clickable: false };
    }
    _shouldRenderHint() {
        const model = this.editor.getModel();
        if (!model) {
            return false;
        }
        const isNotebookCell = model?.uri.scheme === Schemas.vscodeNotebookCell;
        if (!isNotebookCell) {
            return false;
        }
        const activeEditor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
        if (!activeEditor || !activeEditor.isDisposed) {
            return false;
        }
        const shouldRenderHint = super._shouldRenderHint();
        if (!shouldRenderHint) {
            return false;
        }
        const activeCell = activeEditor.getActiveCell();
        if (activeCell?.uri.fragment !== model.uri.fragment) {
            return false;
        }
        return true;
    }
};
EmptyCellEditorHintContribution = __decorate([
    __param(1, IEditorService),
    __param(2, IEditorGroupsService),
    __param(3, ICommandService),
    __param(4, IConfigurationService),
    __param(5, IHoverService),
    __param(6, IKeybindingService),
    __param(7, IInlineChatSessionService),
    __param(8, IChatAgentService),
    __param(9, ITelemetryService),
    __param(10, IProductService),
    __param(11, IContextMenuService)
], EmptyCellEditorHintContribution);
export { EmptyCellEditorHintContribution };
registerEditorContribution(EmptyCellEditorHintContribution.CONTRIB_ID, EmptyCellEditorHintContribution, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to render a help message
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlDZWxsRWRpdG9ySGludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9lZGl0b3JIaW50L2VtcHR5Q2VsbEVkaXRvckhpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxFLE9BQU8sRUFFTiwwQkFBMEIsR0FDMUIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sK0JBQStCLEdBRS9CLE1BQU0sMkVBQTJFLENBQUE7QUFDbEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDdEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDMUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFN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
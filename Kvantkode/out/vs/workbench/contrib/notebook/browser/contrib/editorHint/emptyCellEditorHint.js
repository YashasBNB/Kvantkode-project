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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlDZWxsRWRpdG9ySGludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2VkaXRvckhpbnQvZW1wdHlDZWxsRWRpdG9ySGludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEUsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pFLE9BQU8sRUFDTiwrQkFBK0IsR0FFL0IsTUFBTSwyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFF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
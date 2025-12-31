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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { HideWebViewEditorFindCommand, ReloadWebviewAction, ShowWebViewEditorFindWidgetAction, WebViewEditorFindNextCommand, WebViewEditorFindPreviousCommand, } from './webviewCommands.js';
import { WebviewEditor } from './webviewEditor.js';
import { WebviewInput } from './webviewEditorInput.js';
import { WebviewEditorInputSerializer } from './webviewEditorInputSerializer.js';
import { IWebviewWorkbenchService, WebviewEditorService } from './webviewWorkbenchService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(WebviewEditor, WebviewEditor.ID, localize('webview.editor.label', 'webview editor')), [new SyncDescriptor(WebviewInput)]);
let WebviewPanelContribution = class WebviewPanelContribution extends Disposable {
    static { this.ID = 'workbench.contrib.webviewPanel'; }
    constructor(editorService, editorGroupService) {
        super();
        this.editorGroupService = editorGroupService;
        this._register(editorService.onWillOpenEditor((e) => {
            const group = editorGroupService.getGroup(e.groupId);
            if (group) {
                this.onEditorOpening(e.editor, group);
            }
        }));
    }
    onEditorOpening(editor, group) {
        if (!(editor instanceof WebviewInput) || editor.typeId !== WebviewInput.typeId) {
            return;
        }
        if (group.contains(editor)) {
            return;
        }
        let previousGroup;
        const groups = this.editorGroupService.groups;
        for (const group of groups) {
            if (group.contains(editor)) {
                previousGroup = group;
                break;
            }
        }
        if (!previousGroup) {
            return;
        }
        previousGroup.closeEditor(editor);
    }
};
WebviewPanelContribution = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService)
], WebviewPanelContribution);
registerWorkbenchContribution2(WebviewPanelContribution.ID, WebviewPanelContribution, 1 /* WorkbenchPhase.BlockStartup */);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(WebviewEditorInputSerializer.ID, WebviewEditorInputSerializer);
registerSingleton(IWebviewWorkbenchService, WebviewEditorService, 1 /* InstantiationType.Delayed */);
registerAction2(ShowWebViewEditorFindWidgetAction);
registerAction2(HideWebViewEditorFindCommand);
registerAction2(WebViewEditorFindNextCommand);
registerAction2(WebViewEditorFindPreviousCommand);
registerAction2(ReloadWebviewAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1BhbmVsLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXdQYW5lbC9icm93c2VyL3dlYnZpZXdQYW5lbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUF1QixNQUFNLDRCQUE0QixDQUFBO0FBQ3RGLE9BQU8sRUFHTiw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQTBCLE1BQU0sMkJBQTJCLENBQUE7QUFFcEYsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsbUJBQW1CLEVBQ25CLGlDQUFpQyxFQUNqQyw0QkFBNEIsRUFDNUIsZ0NBQWdDLEdBQ2hDLE1BQU0sc0JBQXNCLENBQUE7QUFDN0IsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUs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
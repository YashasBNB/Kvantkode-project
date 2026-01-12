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
import { isCodeEditor, isDiffEditor, isCompositeEditor, getCodeEditor, } from '../../../../editor/browser/editorBrowser.js';
import { AbstractCodeEditorService } from '../../../../editor/browser/services/abstractCodeEditorService.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../common/editorService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { applyTextEditorOptions } from '../../../common/editor/editorOptions.js';
let CodeEditorService = class CodeEditorService extends AbstractCodeEditorService {
    constructor(editorService, themeService, configurationService) {
        super(themeService);
        this.editorService = editorService;
        this.configurationService = configurationService;
        this._register(this.registerCodeEditorOpenHandler(this.doOpenCodeEditor.bind(this)));
        this._register(this.registerCodeEditorOpenHandler(this.doOpenCodeEditorFromDiff.bind(this)));
    }
    getActiveCodeEditor() {
        const activeTextEditorControl = this.editorService.activeTextEditorControl;
        if (isCodeEditor(activeTextEditorControl)) {
            return activeTextEditorControl;
        }
        if (isDiffEditor(activeTextEditorControl)) {
            return activeTextEditorControl.getModifiedEditor();
        }
        const activeControl = this.editorService.activeEditorPane?.getControl();
        if (isCompositeEditor(activeControl) && isCodeEditor(activeControl.activeCodeEditor)) {
            return activeControl.activeCodeEditor;
        }
        return null;
    }
    async doOpenCodeEditorFromDiff(input, source, sideBySide) {
        // Special case: If the active editor is a diff editor and the request to open originates and
        // targets the modified side of it, we just apply the request there to prevent opening the modified
        // side as separate editor.
        const activeTextEditorControl = this.editorService.activeTextEditorControl;
        if (!sideBySide && // we need the current active group to be the target
            isDiffEditor(activeTextEditorControl) && // we only support this for active text diff editors
            input.options && // we need options to apply
            input.resource && // we need a request resource to compare with
            source === activeTextEditorControl.getModifiedEditor() && // we need the source of this request to be the modified side of the diff editor
            activeTextEditorControl.getModel() && // we need a target model to compare with
            isEqual(input.resource, activeTextEditorControl.getModel()?.modified.uri) // we need the input resources to match with modified side
        ) {
            const targetEditor = activeTextEditorControl.getModifiedEditor();
            applyTextEditorOptions(input.options, targetEditor, 0 /* ScrollType.Smooth */);
            return targetEditor;
        }
        return null;
    }
    // Open using our normal editor service
    async doOpenCodeEditor(input, source, sideBySide) {
        // Special case: we want to detect the request to open an editor that
        // is different from the current one to decide whether the current editor
        // should be pinned or not. This ensures that the source of a navigation
        // is not being replaced by the target. An example is "Goto definition"
        // that otherwise would replace the editor everytime the user navigates.
        const enablePreviewFromCodeNavigation = this.configurationService.getValue().workbench?.editor
            ?.enablePreviewFromCodeNavigation;
        if (!enablePreviewFromCodeNavigation && // we only need to do this if the configuration requires it
            source && // we need to know the origin of the navigation
            !input.options?.pinned && // we only need to look at preview editors that open
            !sideBySide && // we only need to care if editor opens in same group
            !isEqual(source.getModel()?.uri, input.resource) // we only need to do this if the editor is about to change
        ) {
            for (const visiblePane of this.editorService.visibleEditorPanes) {
                if (getCodeEditor(visiblePane.getControl()) === source) {
                    visiblePane.group.pinEditor();
                    break;
                }
            }
        }
        // Open as editor
        const control = await this.editorService.openEditor(input, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
        if (control) {
            const widget = control.getControl();
            if (isCodeEditor(widget)) {
                return widget;
            }
            if (isCompositeEditor(widget) && isCodeEditor(widget.activeCodeEditor)) {
                return widget.activeCodeEditor;
            }
        }
        return null;
    }
};
CodeEditorService = __decorate([
    __param(0, IEditorService),
    __param(1, IThemeService),
    __param(2, IConfigurationService)
], CodeEditorService);
export { CodeEditorService };
registerSingleton(ICodeEditorService, CodeEditorService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvYnJvd3Nlci9jb2RlRWRpdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4sWUFBWSxFQUNaLFlBQVksRUFDWixpQkFBaUIsRUFDakIsYUFBYSxHQUNiLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFHNUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWpGLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekUsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSx5QkFBeUI7SUFDL0QsWUFDa0MsYUFBNkIsRUFDL0MsWUFBMkIsRUFDRixvQkFBMkM7UUFFbkYsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBSmMsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBRXRCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFJbkYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsNkJBQTZC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
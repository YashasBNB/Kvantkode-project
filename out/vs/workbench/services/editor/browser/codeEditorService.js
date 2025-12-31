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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL2Jyb3dzZXIvY29kZUVkaXRvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLFlBQVksRUFDWixZQUFZLEVBQ1osaUJBQWlCLEVBQ2pCLGFBQWEsR0FDYixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBRzVHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVqRixPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXpFLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEseUJBQXlCO0lBQy9ELFlBQ2tDLGFBQTZCLEVBQy9DLFlBQTJCLEVBQ0Ysb0JBQTJDO1FBRW5GLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUpjLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUV0Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBSW5GLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFD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
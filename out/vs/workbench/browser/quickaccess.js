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
import { localize } from '../../nls.js';
import { ContextKeyExpr, RawContextKey } from '../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../platform/keybinding/common/keybinding.js';
import { IQuickInputService } from '../../platform/quickinput/common/quickInput.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { getIEditor } from '../../editor/browser/editorBrowser.js';
import { IEditorGroupsService, } from '../services/editor/common/editorGroupsService.js';
import { IEditorService, } from '../services/editor/common/editorService.js';
export const inQuickPickContextKeyValue = 'inQuickOpen';
export const InQuickPickContextKey = new RawContextKey(inQuickPickContextKeyValue, false, localize('inQuickOpen', 'Whether keyboard focus is inside the quick open control'));
export const inQuickPickContext = ContextKeyExpr.has(inQuickPickContextKeyValue);
export const defaultQuickAccessContextKeyValue = 'inFilesPicker';
export const defaultQuickAccessContext = ContextKeyExpr.and(inQuickPickContext, ContextKeyExpr.has(defaultQuickAccessContextKeyValue));
export function getQuickNavigateHandler(id, next) {
    return (accessor) => {
        const keybindingService = accessor.get(IKeybindingService);
        const quickInputService = accessor.get(IQuickInputService);
        const keys = keybindingService.lookupKeybindings(id);
        const quickNavigate = { keybindings: keys };
        quickInputService.navigate(!!next, quickNavigate);
    };
}
let PickerEditorState = class PickerEditorState extends Disposable {
    constructor(editorService, editorGroupsService) {
        super();
        this.editorService = editorService;
        this.editorGroupsService = editorGroupsService;
        this._editorViewState = undefined;
        this.openedTransientEditors = new Set(); // editors that were opened between set and restore
    }
    set() {
        if (this._editorViewState) {
            return; // return early if already done
        }
        const activeEditorPane = this.editorService.activeEditorPane;
        if (activeEditorPane) {
            this._editorViewState = {
                group: activeEditorPane.group,
                editor: activeEditorPane.input,
                state: getIEditor(activeEditorPane.getControl())?.saveViewState() ?? undefined,
            };
        }
    }
    /**
     * Open a transient editor such that it may be closed when the state is restored.
     * Note that, when the state is restored, if the editor is no longer transient, it will not be closed.
     */
    async openTransientEditor(editor, group) {
        editor.options = { ...editor.options, transient: true };
        const editorPane = await this.editorService.openEditor(editor, group);
        if (editorPane?.input &&
            editorPane.input !== this._editorViewState?.editor &&
            editorPane.group.isTransient(editorPane.input)) {
            this.openedTransientEditors.add(editorPane.input);
        }
        return editorPane;
    }
    async restore() {
        if (this._editorViewState) {
            for (const editor of this.openedTransientEditors) {
                if (editor.isDirty()) {
                    continue;
                }
                for (const group of this.editorGroupsService.groups) {
                    if (group.isTransient(editor)) {
                        await group.closeEditor(editor, { preserveFocus: true });
                    }
                }
            }
            await this._editorViewState.group.openEditor(this._editorViewState.editor, {
                viewState: this._editorViewState.state,
                preserveFocus: true, // important to not close the picker as a result
            });
            this.reset();
        }
    }
    reset() {
        this._editorViewState = undefined;
        this.openedTransientEditors.clear();
    }
    dispose() {
        super.dispose();
        this.reset();
    }
};
PickerEditorState = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService)
], PickerEditorState);
export { PickerEditorState };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2thY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3F1aWNrYWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdkMsT0FBTyxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBT2xFLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBR04sY0FBYyxHQUVkLE1BQU0sNENBQTRDLENBQUE7QUFRbkQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsYUFBYSxDQUFBO0FBQ3ZELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLElBQUksYUFBYSxDQUNyRCwwQkFBMEIsRUFDMUIsS0FBSyxFQUNMLFFBQVEsQ0FBQyxhQUFhLEVBQUUseURBQXlELENBQUMsQ0FDbEYsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtBQUVoRixNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxlQUFlLENBQUE7QUFDaEUsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FDMUQsa0JBQWtCLEVBQ2xCLGNBQWMs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
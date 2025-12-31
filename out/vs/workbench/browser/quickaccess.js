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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2thY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9xdWlja2FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFOUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQU9sRSxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUdOLGNBQWMsR0FFZCxNQUFNLDRDQUE0QyxDQUFBO0FBUW5ELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGFBQWEsQ0FBQTtBQUN2RCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGFBQWEsQ0FDckQsMEJBQTBCLEVBQzFCLEtBQUssRUFDTCxRQUFRLENBQUMsYUFBYSxFQUFFLHlEQUF5RCxDQUFDLENBQ2xGLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUE7QUFFaEYsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsZUFBZSxDQUFBO0FBQ2hFLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQzFELGtCQUFrQixFQUNsQixjQUFjLENBQUMs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
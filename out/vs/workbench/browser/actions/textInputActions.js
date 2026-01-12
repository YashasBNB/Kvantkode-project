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
import { Separator, toAction } from '../../../base/common/actions.js';
import { localize } from '../../../nls.js';
import { IWorkbenchLayoutService } from '../../services/layout/browser/layoutService.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { EventHelper, addDisposableListener, getActiveDocument, getWindow, isHTMLInputElement, isHTMLTextAreaElement, } from '../../../base/browser/dom.js';
import { registerWorkbenchContribution2, } from '../../common/contributions.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { Event as BaseEvent } from '../../../base/common/event.js';
import { Lazy } from '../../../base/common/lazy.js';
export function createTextInputActions(clipboardService) {
    return [
        toAction({
            id: 'undo',
            label: localize('undo', 'Undo'),
            run: () => getActiveDocument().execCommand('undo'),
        }),
        toAction({
            id: 'redo',
            label: localize('redo', 'Redo'),
            run: () => getActiveDocument().execCommand('redo'),
        }),
        new Separator(),
        toAction({
            id: 'editor.action.clipboardCutAction',
            label: localize('cut', 'Cut'),
            run: () => getActiveDocument().execCommand('cut'),
        }),
        toAction({
            id: 'editor.action.clipboardCopyAction',
            label: localize('copy', 'Copy'),
            run: () => getActiveDocument().execCommand('copy'),
        }),
        toAction({
            id: 'editor.action.clipboardPasteAction',
            label: localize('paste', 'Paste'),
            run: async (element) => {
                const clipboardText = await clipboardService.readText();
                if (isHTMLTextAreaElement(element) || isHTMLInputElement(element)) {
                    const selectionStart = element.selectionStart || 0;
                    const selectionEnd = element.selectionEnd || 0;
                    element.value = `${element.value.substring(0, selectionStart)}${clipboardText}${element.value.substring(selectionEnd, element.value.length)}`;
                    element.selectionStart = selectionStart + clipboardText.length;
                    element.selectionEnd = element.selectionStart;
                    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                }
            },
        }),
        new Separator(),
        toAction({
            id: 'editor.action.selectAll',
            label: localize('selectAll', 'Select All'),
            run: () => getActiveDocument().execCommand('selectAll'),
        }),
    ];
}
let TextInputActionsProvider = class TextInputActionsProvider extends Disposable {
    static { this.ID = 'workbench.contrib.textInputActionsProvider'; }
    constructor(layoutService, contextMenuService, clipboardService) {
        super();
        this.layoutService = layoutService;
        this.contextMenuService = contextMenuService;
        this.clipboardService = clipboardService;
        this.textInputActions = new Lazy(() => createTextInputActions(this.clipboardService));
        this.registerListeners();
    }
    registerListeners() {
        // Context menu support in input/textarea
        this._register(BaseEvent.runAndSubscribe(this.layoutService.onDidAddContainer, ({ container, disposables }) => {
            disposables.add(addDisposableListener(container, 'contextmenu', (e) => this.onContextMenu(getWindow(container), e)));
        }, { container: this.layoutService.mainContainer, disposables: this._store }));
    }
    onContextMenu(targetWindow, e) {
        if (e.defaultPrevented) {
            return; // make sure to not show these actions by accident if component indicated to prevent
        }
        const target = e.target;
        if (!isHTMLTextAreaElement(target) && !isHTMLInputElement(target)) {
            return; // only for inputs or textareas
        }
        EventHelper.stop(e, true);
        const event = new StandardMouseEvent(targetWindow, e);
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            getActions: () => this.textInputActions.value,
            getActionsContext: () => target,
        });
    }
};
TextInputActionsProvider = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, IContextMenuService),
    __param(2, IClipboardService)
], TextInputActionsProvider);
export { TextInputActionsProvider };
registerWorkbenchContribution2(TextInputActionsProvider.ID, TextInputActionsProvider, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dElucHV0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvYWN0aW9ucy90ZXh0SW5wdXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBVyxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sV0FBVyxFQUNYLHFCQUFxQixFQUNyQixpQkFBaUIsRUFDakIsU0FBUyxFQUNULGtCQUFrQixFQUNsQixxQkFBcUIsR0FDckIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFFLEtBQUssSUFBSSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFbkQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLGdCQUFtQztJQUN6RSxPQUFPO1FBQ04sUUFBUSxDQUFDO1lBQ1IsRUFBRSxFQUFFLE1BQU07WUFDVixLQUFLLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxN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
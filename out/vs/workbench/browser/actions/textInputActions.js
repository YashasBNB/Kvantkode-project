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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dElucHV0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvdGV4dElucHV0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVcsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUNOLFdBQVcsRUFDWCxxQkFBcUIsRUFDckIsaUJBQWlCLEVBQ2pCLFNBQVMsRUFDVCxrQkFBa0IsRUFDbEIscUJBQXFCLEdBQ3JCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLElBQUksU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRW5ELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxnQkFBbUM7SUFDekUsT0FBTztRQUNOLFFBQVEsQ0FBQztZQUNSLEVBQUUsRUFBRSxNQUFNO1lBQ1YsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxD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
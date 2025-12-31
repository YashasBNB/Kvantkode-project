/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextScopedFindInput } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { NotebookFindInputFilterButton } from '../../notebook/browser/contrib/find/notebookFindReplaceWidget.js';
import * as nls from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
export class SearchFindInput extends ContextScopedFindInput {
    constructor(container, contextViewProvider, options, contextKeyService, contextMenuService, instantiationService, filters, filterStartVisiblitity) {
        super(container, contextViewProvider, options, contextKeyService);
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.filters = filters;
        this._filterChecked = false;
        this._onDidChangeAIToggle = this._register(new Emitter());
        this.onDidChangeAIToggle = this._onDidChangeAIToggle.event;
        this._findFilter = this._register(new NotebookFindInputFilterButton(filters, contextMenuService, instantiationService, options, nls.localize('searchFindInputNotebookFilter.label', 'Notebook Find Filters')));
        this._updatePadding();
        this.controls.appendChild(this._findFilter.container);
        this._findFilter.container.classList.add('monaco-custom-toggle');
        this.filterVisible = filterStartVisiblitity;
    }
    _updatePadding() {
        this.inputBox.paddingRight =
            (this.caseSensitive?.visible ? this.caseSensitive.width() : 0) +
                (this.wholeWords?.visible ? this.wholeWords.width() : 0) +
                (this.regex?.visible ? this.regex.width() : 0) +
                (this._findFilter.visible ? this._findFilter.width() : 0);
    }
    set filterVisible(visible) {
        this._findFilter.visible = visible;
        this.updateFilterStyles();
        this._updatePadding();
    }
    setEnabled(enabled) {
        super.setEnabled(enabled);
        if (enabled && (!this._filterChecked || !this._findFilter.visible)) {
            this.regex?.enable();
        }
        else {
            this.regex?.disable();
        }
    }
    updateFilterStyles() {
        // filter is checked if it's in a non-default state
        this._filterChecked =
            !this.filters.markupInput ||
                !this.filters.markupPreview ||
                !this.filters.codeInput ||
                !this.filters.codeOutput;
        // TODO: find a way to express that searching notebook output and markdown preview don't support regex.
        this._findFilter.applyStyles(this._filterChecked);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRmluZElucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoRmluZElucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBRzNHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ2hILE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFELE1BQU0sT0FBTyxlQUFnQixTQUFRLHNCQUFzQjtJQU0xRCxZQUNDLFNBQTZCLEVBQzdCLG1CQUF5QyxFQUN6QyxPQUEwQixFQUMxQixpQkFBcUMsRUFDNUIsa0JBQXVDLEVBQ3ZDLG9CQUEyQyxFQUMzQyxPQUE0QixFQUNyQyxzQkFBK0I7UUFFL0IsS0FBSyxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUx4RCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3ZDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MsWUFBTyxHQUFQLE9BQU8sQ0FBcUI7UUFYOUIsbUJBQWMsR0FBWSxLQUFLLENBQUE7UUFDdEIseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDOUQsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtRQWFwRSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2hDLElBQUksNkJBQTZCLENBQ2hDLE9BQU8sRUFDUCxrQkFBa0IsRUFD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
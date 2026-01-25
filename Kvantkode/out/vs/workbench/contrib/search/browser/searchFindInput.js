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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRmluZElucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hGaW5kSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFHM0csT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDaEgsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsTUFBTSxPQUFPLGVBQWdCLFNBQVEsc0JBQXNCO0lBTTFELFlBQ0MsU0FBNkIsRUFDN0IsbUJBQXlDLEVBQ3pDLE9BQTBCLEVBQzFCLGlCQUFxQyxFQUM1QixrQkFBdUMsRUFDdkMsb0JBQTJDLEVBQzNDLE9BQTRCLEVBQ3JDLHNCQUErQjtRQUUvQixLQUFLLENBQUMsU0FBUyxFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBTHhELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDdkMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUFxQjtRQVg5QixtQkFBYyxHQUFZLEtBQUssQ0FBQTtRQUN0Qix5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFXLENBQUMsQ0FBQTtRQUM5RCx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBYXBFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDaEMsSUFBSSw2QkFBNkIsQ0FDaEMsT0FBTyxFQUNQLGtCQUFr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
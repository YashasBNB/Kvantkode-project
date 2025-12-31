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
import * as DOM from '../../../../base/browser/dom.js';
import { Action } from '../../../../base/common/actions.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import Messages from './messages.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ActionViewItem, } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { MarkersContextKeys } from '../common/markers.js';
import './markersViewActions.css';
export class MarkersFilters extends Disposable {
    constructor(options, contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._excludedFiles = MarkersContextKeys.ShowExcludedFilesFilterContextKey.bindTo(this.contextKeyService);
        this._activeFile = MarkersContextKeys.ShowActiveFileFilterContextKey.bindTo(this.contextKeyService);
        this._showWarnings = MarkersContextKeys.ShowWarningsFilterContextKey.bindTo(this.contextKeyService);
        this._showErrors = MarkersContextKeys.ShowErrorsFilterContextKey.bindTo(this.contextKeyService);
        this._showInfos = MarkersContextKeys.ShowInfoFilterContextKey.bindTo(this.contextKeyService);
        this._showErrors.set(options.showErrors);
        this._showWarnings.set(options.showWarnings);
        this._showInfos.set(options.showInfos);
        this._excludedFiles.set(options.excludedFiles);
        this._activeFile.set(options.activeFile);
        this.filterHistory = options.filterHistory;
    }
    get excludedFiles() {
        return !!this._excludedFiles.get();
    }
    set excludedFiles(filesExclude) {
        if (this._excludedFiles.get() !== filesExclude) {
            this._excludedFiles.set(filesExclude);
            this._onDidChange.fire({ excludedFiles: true });
        }
    }
    get activeFile() {
        return !!this._activeFile.get();
    }
    set activeFile(activeFile) {
        if (this._activeFile.get() !== activeFile) {
            this._activeFile.set(activeFile);
            this._onDidChange.fire({ activeFile: true });
        }
    }
    get showWarnings() {
        return !!this._showWarnings.get();
    }
    set showWarnings(showWarnings) {
        if (this._showWarnings.get() !== showWarnings) {
            this._showWarnings.set(showWarnings);
            this._onDidChange.fire({ showWarnings: true });
        }
    }
    get showErrors() {
        return !!this._showErrors.get();
    }
    set showErrors(showErrors) {
        if (this._showErrors.get() !== showErrors) {
            this._showErrors.set(showErrors);
            this._onDidChange.fire({ showErrors: true });
        }
    }
    get showInfos() {
        return !!this._showInfos.get();
    }
    set showInfos(showInfos) {
        if (this._showInfos.get() !== showInfos) {
            this._showInfos.set(showInfos);
            this._onDidChange.fire({ showInfos: true });
        }
    }
}
export class QuickFixAction extends Action {
    static { this.ID = 'workbench.actions.problems.quickfix'; }
    static { this.CLASS = 'markers-panel-action-quickfix ' + ThemeIcon.asClassName(Codicon.lightBulb); }
    static { this.AUTO_FIX_CLASS = QuickFixAction.CLASS + ' autofixable'; }
    get quickFixes() {
        return this._quickFixes;
    }
    set quickFixes(quickFixes) {
        this._quickFixes = quickFixes;
        this.enabled = this._quickFixes.length > 0;
    }
    autoFixable(autofixable) {
        this.class = autofixable ? QuickFixAction.AUTO_FIX_CLASS : QuickFixAction.CLASS;
    }
    constructor(marker) {
        super(QuickFixAction.ID, Messages.MARKERS_PANEL_ACTION_TOOLTIP_QUICKFIX, QuickFixAction.CLASS, false);
        this.marker = marker;
        this._onShowQuickFixes = this._register(new Emitter());
        this.onShowQuickFixes = this._onShowQuickFixes.event;
        this._quickFixes = [];
    }
    run() {
        this._onShowQuickFixes.fire();
        return Promise.resolve();
    }
}
let QuickFixActionViewItem = class QuickFixActionViewItem extends ActionViewItem {
    constructor(action, options, contextMenuService) {
        super(null, action, { ...options, icon: true, label: false });
        this.contextMenuService = contextMenuService;
    }
    onClick(event) {
        DOM.EventHelper.stop(event, true);
        this.showQuickFixes();
    }
    showQuickFixes() {
        if (!this.element) {
            return;
        }
        if (!this.isEnabled()) {
            return;
        }
        const elementPosition = DOM.getDomNodePagePosition(this.element);
        const quickFixes = this.action.quickFixes;
        if (quickFixes.length) {
            this.contextMenuService.showContextMenu({
                getAnchor: () => ({
                    x: elementPosition.left + 10,
                    y: elementPosition.top + elementPosition.height + 4,
                }),
                getActions: () => quickFixes,
            });
        }
    }
};
QuickFixActionViewItem = __decorate([
    __param(2, IContextMenuService)
], QuickFixActionViewItem);
export { QuickFixActionViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc1ZpZXdBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Vycy9icm93c2VyL21hcmtlcnNWaWV3QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLFFBQVEsTUFBTSxlQUFlLENBQUE7QUFDcEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR2pFLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN6RCxPQUFPLDBCQUEwQixDQUFBO0FBbUJqQyxNQUFNLE9BQU8sY0FBZSxTQUFRLFVBQVU7SUFNN0MsWUFDQyxPQUErQixFQUNkLGlCQUFxQztRQUV0RCxLQUFLLEVBQUUsQ0FBQTtRQUZVLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFQdEMsaUJBQVksR0FBd0MsSUFBSSxDQUFDLFNBQVMsQ0FDbEYsSUFBSSxPQUFPLEVBQThCLENBQ3pDLENBQUE7UUFDUSxnQkFBVyxHQUFzQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQWtCaEUsbUJB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
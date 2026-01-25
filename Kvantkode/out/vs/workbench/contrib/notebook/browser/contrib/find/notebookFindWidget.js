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
import * as DOM from '../../../../../../base/browser/dom.js';
import { alert as alertFn } from '../../../../../../base/browser/ui/aria/aria.js';
import { Lazy } from '../../../../../../base/common/lazy.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import * as strings from '../../../../../../base/common/strings.js';
import { MATCHES_LIMIT } from '../../../../../../editor/contrib/find/browser/findModel.js';
import { FindReplaceState } from '../../../../../../editor/contrib/find/browser/findState.js';
import { NLS_MATCHES_LOCATION, NLS_NO_RESULTS, } from '../../../../../../editor/contrib/find/browser/findWidget.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService, } from '../../../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { FindModel } from './findModel.js';
import { SimpleFindReplaceWidget } from './notebookFindReplaceWidget.js';
import { CellEditState, } from '../../notebookBrowser.js';
import { KEYBINDING_CONTEXT_NOTEBOOK_FIND_WIDGET_FOCUSED } from '../../../common/notebookContextKeys.js';
const FIND_HIDE_TRANSITION = 'find-hide-transition';
const FIND_SHOW_TRANSITION = 'find-show-transition';
let MAX_MATCHES_COUNT_WIDTH = 69;
const PROGRESS_BAR_DELAY = 200; // show progress for at least 200ms
let NotebookFindContrib = class NotebookFindContrib extends Disposable {
    static { this.id = 'workbench.notebook.find'; }
    constructor(notebookEditor, instantiationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.instantiationService = instantiationService;
        this._widget = new Lazy(() => this._register(this.instantiationService.createInstance(NotebookFindWidget, this.notebookEditor)));
    }
    get widget() {
        return this._widget.value;
    }
    show(initialInput, options) {
        return this._widget.value.show(initialInput, options);
    }
    hide() {
        this._widget.rawValue?.hide();
    }
    replace(searchString) {
        return this._widget.value.replace(searchString);
    }
};
NotebookFindContrib = __decorate([
    __param(1, IInstantiationService)
], NotebookFindContrib);
export { NotebookFindContrib };
let NotebookFindWidget = class NotebookFindWidget extends SimpleFindReplaceWidget {
    constructor(_notebookEditor, contextViewService, contextKeyService, configurationService, contextMenuService, hoverService, instantiationService) {
        super(contextViewService, contextKeyService, configurationService, contextMenuService, instantiationService, hoverService, new FindReplaceState(), _notebookEditor);
        this._isFocused = false;
        this._showTimeout = null;
        this._hideTimeout = null;
        this._findModel = new FindModel(this._notebookEditor, this._state, this._configurationService);
        DOM.append(this._notebookEditor.getDomNode(), this.getDomNode());
        this._findWidgetFocused =
            KEYBINDING_CONTEXT_NOTEBOOK_FIND_WIDGET_FOCUSED.bindTo(contextKeyService);
        this._register(this._findInput.onKeyDown((e) => this._onFindInputKeyDown(e)));
        this._register(this._replaceInput.onKeyDown((e) => this._onReplaceInputKeyDown(e)));
        this._register(this._state.onFindReplaceStateChange((e) => {
            this.onInputChanged();
            if (e.isSearching) {
                if (this._state.isSearching) {
                    this._progressBar.infinite().show(PROGRESS_BAR_DELAY);
                }
                else {
                    this._progressBar.stop().hide();
                }
            }
            if (this._findModel.currentMatch >= 0) {
                const currentMatch = this._findModel.getCurrentMatch();
                this._replaceBtn.setEnabled(currentMatch.isModelMatch);
            }
            const matches = this._findModel.findMatches;
            this._replaceAllBtn.setEnabled(matches.length > 0 &&
                matches.find((match) => match.webviewMatches.length > 0) === undefined);
            if (e.filters) {
                this._findInput.updateFilterState(this._state.filters?.isModified() ?? false);
            }
        }));
        this._register(DOM.addDisposableListener(this.getDomNode(), DOM.EventType.FOCUS, (e) => {
            this._previousFocusElement = DOM.isHTMLElement(e.relatedTarget)
                ? e.relatedTarget
                : undefined;
        }, true));
    }
    get findModel() {
        return this._findModel;
    }
    get isFocused() {
        return this._isFocused;
    }
    _onFindInputKeyDown(e) {
        if (e.equals(3 /* KeyCode.Enter */)) {
            this.find(false);
            e.preventDefault();
            return;
        }
        else if (e.equals(1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */)) {
            this.find(true);
            e.preventDefault();
            return;
        }
    }
    _onReplaceInputKeyDown(e) {
        if (e.equals(3 /* KeyCode.Enter */)) {
            this.replaceOne();
            e.preventDefault();
            return;
        }
    }
    onInputChanged() {
        this._state.change({ searchString: this.inputValue }, false);
        // this._findModel.research();
        const findMatches = this._findModel.findMatches;
        if (findMatches && findMatches.length) {
            return true;
        }
        return false;
    }
    findIndex(index) {
        this._findModel.find({ index });
    }
    find(previous) {
        this._findModel.find({ previous });
    }
    replaceOne() {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        if (!this._findModel.findMatches.length) {
            return;
        }
        this._findModel.ensureFindMatches();
        if (this._findModel.currentMatch < 0) {
            this._findModel.find({ previous: false });
        }
        const currentMatch = this._findModel.getCurrentMatch();
        const cell = currentMatch.cell;
        if (currentMatch.isModelMatch) {
            const match = currentMatch.match;
            this._progressBar.infinite().show(PROGRESS_BAR_DELAY);
            const replacePattern = this.replacePattern;
            const replaceString = replacePattern.buildReplaceString(match.matches, this._state.preserveCase);
            const viewModel = this._notebookEditor.getViewModel();
            viewModel.replaceOne(cell, match.range, replaceString).then(() => {
                this._progressBar.stop();
            });
        }
        else {
            // this should not work
            console.error('Replace does not work for output match');
        }
    }
    replaceAll() {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        this._progressBar.infinite().show(PROGRESS_BAR_DELAY);
        const replacePattern = this.replacePattern;
        const cellFindMatches = this._findModel.findMatches;
        const replaceStrings = [];
        cellFindMatches.forEach((cellFindMatch) => {
            cellFindMatch.contentMatches.forEach((match) => {
                const matches = match.matches;
                replaceStrings.push(replacePattern.buildReplaceString(matches, this._state.preserveCase));
            });
        });
        const viewModel = this._notebookEditor.getViewModel();
        viewModel.replaceAll(this._findModel.findMatches, replaceStrings).then(() => {
            this._progressBar.stop();
        });
    }
    findFirst() { }
    onFocusTrackerFocus() {
        this._findWidgetFocused.set(true);
        this._isFocused = true;
    }
    onFocusTrackerBlur() {
        this._previousFocusElement = undefined;
        this._findWidgetFocused.reset();
        this._isFocused = false;
    }
    onReplaceInputFocusTrackerFocus() {
        // throw new Error('Method not implemented.');
    }
    onReplaceInputFocusTrackerBlur() {
        // throw new Error('Method not implemented.');
    }
    onFindInputFocusTrackerFocus() { }
    onFindInputFocusTrackerBlur() { }
    async show(initialInput, options) {
        const searchStringUpdate = this._state.searchString !== initialInput;
        super.show(initialInput, options);
        this._state.change({ searchString: initialInput ?? this._state.searchString, isRevealed: true }, false);
        if (typeof options?.matchIndex === 'number') {
            if (!this._findModel.findMatches.length) {
                await this._findModel.research();
            }
            this.findIndex(options.matchIndex);
        }
        else {
            this._findInput.select();
        }
        if (!searchStringUpdate && options?.searchStringSeededFrom) {
            this._findModel.refreshCurrentMatch(options.searchStringSeededFrom);
        }
        if (this._showTimeout === null) {
            if (this._hideTimeout !== null) {
                DOM.getWindow(this.getDomNode()).clearTimeout(this._hideTimeout);
                this._hideTimeout = null;
                this._notebookEditor.removeClassName(FIND_HIDE_TRANSITION);
            }
            this._notebookEditor.addClassName(FIND_SHOW_TRANSITION);
            this._showTimeout = DOM.getWindow(this.getDomNode()).setTimeout(() => {
                this._notebookEditor.removeClassName(FIND_SHOW_TRANSITION);
                this._showTimeout = null;
            }, 200);
        }
        else {
            // no op
        }
    }
    replace(initialFindInput, initialReplaceInput) {
        super.showWithReplace(initialFindInput, initialReplaceInput);
        this._state.change({
            searchString: initialFindInput ?? '',
            replaceString: initialReplaceInput ?? '',
            isRevealed: true,
        }, false);
        this._replaceInput.select();
        if (this._showTimeout === null) {
            if (this._hideTimeout !== null) {
                DOM.getWindow(this.getDomNode()).clearTimeout(this._hideTimeout);
                this._hideTimeout = null;
                this._notebookEditor.removeClassName(FIND_HIDE_TRANSITION);
            }
            this._notebookEditor.addClassName(FIND_SHOW_TRANSITION);
            this._showTimeout = DOM.getWindow(this.getDomNode()).setTimeout(() => {
                this._notebookEditor.removeClassName(FIND_SHOW_TRANSITION);
                this._showTimeout = null;
            }, 200);
        }
        else {
            // no op
        }
    }
    hide() {
        super.hide();
        this._state.change({ isRevealed: false }, false);
        this._findModel.clear();
        this._notebookEditor.findStop();
        this._progressBar.stop();
        if (this._hideTimeout === null) {
            if (this._showTimeout !== null) {
                DOM.getWindow(this.getDomNode()).clearTimeout(this._showTimeout);
                this._showTimeout = null;
                this._notebookEditor.removeClassName(FIND_SHOW_TRANSITION);
            }
            this._notebookEditor.addClassName(FIND_HIDE_TRANSITION);
            this._hideTimeout = DOM.getWindow(this.getDomNode()).setTimeout(() => {
                this._notebookEditor.removeClassName(FIND_HIDE_TRANSITION);
            }, 200);
        }
        else {
            // no op
        }
        if (this._previousFocusElement && this._previousFocusElement.offsetParent) {
            this._previousFocusElement.focus();
            this._previousFocusElement = undefined;
        }
        if (this._notebookEditor.hasModel()) {
            for (let i = 0; i < this._notebookEditor.getLength(); i++) {
                const cell = this._notebookEditor.cellAt(i);
                if (cell.getEditState() === CellEditState.Editing && cell.editStateSource === 'find') {
                    cell.updateEditState(CellEditState.Preview, 'closeFind');
                }
            }
        }
    }
    _updateMatchesCount() {
        if (!this._findModel || !this._findModel.findMatches) {
            return;
        }
        this._matchesCount.style.width = MAX_MATCHES_COUNT_WIDTH + 'px';
        this._matchesCount.title = '';
        // remove previous content
        this._matchesCount.firstChild?.remove();
        let label;
        if (this._state.matchesCount > 0) {
            let matchesCount = String(this._state.matchesCount);
            if (this._state.matchesCount >= MATCHES_LIMIT) {
                matchesCount += '+';
            }
            const matchesPosition = this._findModel.currentMatch < 0 ? '?' : String(this._findModel.currentMatch + 1);
            label = strings.format(NLS_MATCHES_LOCATION, matchesPosition, matchesCount);
        }
        else {
            label = NLS_NO_RESULTS;
        }
        this._matchesCount.appendChild(document.createTextNode(label));
        alertFn(this._getAriaLabel(label, this._state.currentMatch, this._state.searchString));
        MAX_MATCHES_COUNT_WIDTH = Math.max(MAX_MATCHES_COUNT_WIDTH, this._matchesCount.clientWidth);
    }
    _getAriaLabel(label, currentMatch, searchString) {
        if (label === NLS_NO_RESULTS) {
            return searchString === ''
                ? localize('ariaSearchNoResultEmpty', '{0} found', label)
                : localize('ariaSearchNoResult', "{0} found for '{1}'", label, searchString);
        }
        // TODO@rebornix, aria for `cell ${index}, line {line}`
        return localize('ariaSearchNoResultWithLineNumNoCurrentMatch', "{0} found for '{1}'", label, searchString);
    }
    dispose() {
        this._notebookEditor?.removeClassName(FIND_SHOW_TRANSITION);
        this._notebookEditor?.removeClassName(FIND_HIDE_TRANSITION);
        this._findModel.dispose();
        super.dispose();
    }
};
NotebookFindWidget = __decorate([
    __param(1, IContextViewService),
    __param(2, IContextKeyService),
    __param(3, IConfigurationService),
    __param(4, IContextMenuService),
    __param(5, IHoverService),
    __param(6, IInstantiationService)
], NotebookFindWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tGaW5kV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvZmluZC9ub3RlYm9va0ZpbmRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsS0FBSyxJQUFJLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRWpGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxLQUFLLE9BQU8sTUFBTSwwQ0FBMEMsQ0FBQTtBQUduRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDMUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDN0YsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixjQUFjLEdBQ2QsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsbUJBQW1CLEdBQ25CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBRXhHLE9BQU8sRUFBRSxT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
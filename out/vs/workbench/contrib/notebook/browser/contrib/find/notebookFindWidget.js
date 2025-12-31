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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tGaW5kV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2ZpbmQvbm90ZWJvb2tGaW5kV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUE7QUFFNUQsT0FBTyxFQUFFLEtBQUssSUFBSSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVqRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sS0FBSyxPQUFPLE1BQU0sMENBQTBDLENBQUE7QUFHbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzdGLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsY0FBYyxHQUNkLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLG1CQUFtQixHQUNuQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUV4RyxPQUFPLEVBQUUsU0FBUyxF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
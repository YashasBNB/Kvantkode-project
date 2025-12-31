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
import { addDisposableListener, addStandardDisposableListener, reset, } from '../../../../../base/browser/dom.js';
import { createTrustedTypesPolicy } from '../../../../../base/browser/trustedTypes.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { DomScrollableElement } from '../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { forEachAdjacent, groupAdjacentBy } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, derivedWithStore, observableValue, subtransaction, transaction, } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { applyFontInfo } from '../../../config/domFontInfo.js';
import { applyStyle } from '../utils.js';
import { EditorFontLigatures, } from '../../../../common/config/editorOptions.js';
import { LineRange } from '../../../../common/core/lineRange.js';
import { OffsetRange } from '../../../../common/core/offsetRange.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { LineRangeMapping } from '../../../../common/diff/rangeMapping.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { LineTokens } from '../../../../common/tokens/lineTokens.js';
import { RenderLineInput, renderViewLine2 } from '../../../../common/viewLayout/viewLineRenderer.js';
import { ViewLineRenderingData } from '../../../../common/viewModel.js';
import { localize } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import './accessibleDiffViewer.css';
import { toAction } from '../../../../../base/common/actions.js';
const accessibleDiffViewerInsertIcon = registerIcon('diff-review-insert', Codicon.add, localize('accessibleDiffViewerInsertIcon', "Icon for 'Insert' in accessible diff viewer."));
const accessibleDiffViewerRemoveIcon = registerIcon('diff-review-remove', Codicon.remove, localize('accessibleDiffViewerRemoveIcon', "Icon for 'Remove' in accessible diff viewer."));
const accessibleDiffViewerCloseIcon = registerIcon('diff-review-close', Codicon.close, localize('accessibleDiffViewerCloseIcon', "Icon for 'Close' in accessible diff viewer."));
let AccessibleDiffViewer = class AccessibleDiffViewer extends Disposable {
    static { this._ttPolicy = createTrustedTypesPolicy('diffReview', { createHTML: (value) => value }); }
    constructor(_parentNode, _visible, _setVisible, _canClose, _width, _height, _diffs, _models, _instantiationService) {
        super();
        this._parentNode = _parentNode;
        this._visible = _visible;
        this._setVisible = _setVisible;
        this._canClose = _canClose;
        this._width = _width;
        this._height = _height;
        this._diffs = _diffs;
        this._models = _models;
        this._instantiationService = _instantiationService;
        this._state = derivedWithStore(this, (reader, store) => {
            const visible = this._visible.read(reader);
            this._parentNode.style.visibility = visible ? 'visible' : 'hidden';
            if (!visible) {
                return null;
            }
            const model = store.add(this._instantiationService.createInstance(ViewModel, this._diffs, this._models, this._setVisible, this._canClose));
            const view = store.add(this._instantiationService.createInstance(View, this._parentNode, model, this._width, this._height, this._models));
            return { model, view };
        }).recomputeInitiallyAndOnChange(this._store);
    }
    next() {
        transaction((tx) => {
            const isVisible = this._visible.get();
            this._setVisible(true, tx);
            if (isVisible) {
                this._state.get().model.nextGroup(tx);
            }
        });
    }
    prev() {
        transaction((tx) => {
            this._setVisible(true, tx);
            this._state.get().model.previousGroup(tx);
        });
    }
    close() {
        transaction((tx) => {
            this._setVisible(false, tx);
        });
    }
};
AccessibleDiffViewer = __decorate([
    __param(8, IInstantiationService)
], AccessibleDiffViewer);
export { AccessibleDiffViewer };
let ViewModel = class ViewModel extends Disposable {
    constructor(_diffs, _models, _setVisible, canClose, _accessibilitySignalService) {
        super();
        this._diffs = _diffs;
        this._models = _models;
        this._setVisible = _setVisible;
        this.canClose = canClose;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._groups = observableValue(this, []);
        this._currentGroupIdx = observableValue(this, 0);
        this._currentElementIdx = observableValue(this, 0);
        this.groups = this._groups;
        this.currentGroup = this._currentGroupIdx.map((idx, r) => this._groups.read(r)[idx]);
        this.currentGroupIndex = this._currentGroupIdx;
        this.currentElement = this._currentElementIdx.map((idx, r) => this.currentGroup.read(r)?.lines[idx]);
        this._register(autorun((reader) => {
            /** @description update groups */
            const diffs = this._diffs.read(reader);
            if (!diffs) {
                this._groups.set([], undefined);
                return;
            }
            const groups = computeViewElementGroups(diffs, this._models.getOriginalModel().getLineCount(), this._models.getModifiedModel().getLineCount());
            transaction((tx) => {
                const p = this._models.getModifiedPosition();
                if (p) {
                    const nextGroup = groups.findIndex((g) => p?.lineNumber < g.range.modified.endLineNumberExclusive);
                    if (nextGroup !== -1) {
                        this._currentGroupIdx.set(nextGroup, tx);
                    }
                }
                this._groups.set(groups, tx);
            });
        }));
        this._register(autorun((reader) => {
            /** @description play audio-cue for diff */
            const currentViewItem = this.currentElement.read(reader);
            if (currentViewItem?.type === LineType.Deleted) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineDeleted, {
                    source: 'accessibleDiffViewer.currentElementChanged',
                });
            }
            else if (currentViewItem?.type === LineType.Added) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineInserted, {
                    source: 'accessibleDiffViewer.currentElementChanged',
                });
            }
        }));
        this._register(autorun((reader) => {
            /** @description select lines in editor */
            // This ensures editor commands (like revert/stage) work
            const currentViewItem = this.currentElement.read(reader);
            if (currentViewItem && currentViewItem.type !== LineType.Header) {
                const lineNumber = currentViewItem.modifiedLineNumber ?? currentViewItem.diff.modified.startLineNumber;
                this._models.modifiedSetSelection(Range.fromPositions(new Position(lineNumber, 1)));
            }
        }));
    }
    _goToGroupDelta(delta, tx) {
        const groups = this.groups.get();
        if (!groups || groups.length <= 1) {
            return;
        }
        subtransaction(tx, (tx) => {
            this._currentGroupIdx.set(OffsetRange.ofLength(groups.length).clipCyclic(this._currentGroupIdx.get() + delta), tx);
            this._currentElementIdx.set(0, tx);
        });
    }
    nextGroup(tx) {
        this._goToGroupDelta(1, tx);
    }
    previousGroup(tx) {
        this._goToGroupDelta(-1, tx);
    }
    _goToLineDelta(delta) {
        const group = this.currentGroup.get();
        if (!group || group.lines.length <= 1) {
            return;
        }
        transaction((tx) => {
            this._currentElementIdx.set(OffsetRange.ofLength(group.lines.length).clip(this._currentElementIdx.get() + delta), tx);
        });
    }
    goToNextLine() {
        this._goToLineDelta(1);
    }
    goToPreviousLine() {
        this._goToLineDelta(-1);
    }
    goToLine(line) {
        const group = this.currentGroup.get();
        if (!group) {
            return;
        }
        const idx = group.lines.indexOf(line);
        if (idx === -1) {
            return;
        }
        transaction((tx) => {
            this._currentElementIdx.set(idx, tx);
        });
    }
    revealCurrentElementInEditor() {
        if (!this.canClose.get()) {
            return;
        }
        this._setVisible(false, undefined);
        const curElem = this.currentElement.get();
        if (curElem) {
            if (curElem.type === LineType.Deleted) {
                this._models.originalReveal(Range.fromPositions(new Position(curElem.originalLineNumber, 1)));
            }
            else {
                this._models.modifiedReveal(curElem.type !== LineType.Header
                    ? Range.fromPositions(new Position(curElem.modifiedLineNumber, 1))
                    : undefined);
            }
        }
    }
    close() {
        if (!this.canClose.get()) {
            return;
        }
        this._setVisible(false, undefined);
        this._models.modifiedFocus();
    }
};
ViewModel = __decorate([
    __param(4, IAccessibilitySignalService)
], ViewModel);
const viewElementGroupLineMargin = 3;
function computeViewElementGroups(diffs, originalLineCount, modifiedLineCount) {
    const result = [];
    for (const g of groupAdjacentBy(diffs, (a, b) => b.modified.startLineNumber - a.modified.endLineNumberExclusive <
        2 * viewElementGroupLineMargin)) {
        const viewElements = [];
        viewElements.push(new HeaderViewElement());
        const origFullRange = new LineRange(Math.max(1, g[0].original.startLineNumber - viewElementGroupLineMargin), Math.min(g[g.length - 1].original.endLineNumberExclusive + viewElementGroupLineMargin, originalLineCount + 1));
        const modifiedFullRange = new LineRange(Math.max(1, g[0].modified.startLineNumber - viewElementGroupLineMargin), Math.min(g[g.length - 1].modified.endLineNumberExclusive + viewElementGroupLineMargin, modifiedLineCount + 1));
        forEachAdjacent(g, (a, b) => {
            const origRange = new LineRange(a ? a.original.endLineNumberExclusive : origFullRange.startLineNumber, b ? b.original.startLineNumber : origFullRange.endLineNumberExclusive);
            const modifiedRange = new LineRange(a ? a.modified.endLineNumberExclusive : modifiedFullRange.startLineNumber, b ? b.modified.startLineNumber : modifiedFullRange.endLineNumberExclusive);
            origRange.forEach((origLineNumber) => {
                viewElements.push(new UnchangedLineViewElement(origLineNumber, modifiedRange.startLineNumber + (origLineNumber - origRange.startLineNumber)));
            });
            if (b) {
                b.original.forEach((origLineNumber) => {
                    viewElements.push(new DeletedLineViewElement(b, origLineNumber));
                });
                b.modified.forEach((modifiedLineNumber) => {
                    viewElements.push(new AddedLineViewElement(b, modifiedLineNumber));
                });
            }
        });
        const modifiedRange = g[0].modified.join(g[g.length - 1].modified);
        const originalRange = g[0].original.join(g[g.length - 1].original);
        result.push(new ViewElementGroup(new LineRangeMapping(modifiedRange, originalRange), viewElements));
    }
    return result;
}
var LineType;
(function (LineType) {
    LineType[LineType["Header"] = 0] = "Header";
    LineType[LineType["Unchanged"] = 1] = "Unchanged";
    LineType[LineType["Deleted"] = 2] = "Deleted";
    LineType[LineType["Added"] = 3] = "Added";
})(LineType || (LineType = {}));
class ViewElementGroup {
    constructor(range, lines) {
        this.range = range;
        this.lines = lines;
    }
}
class HeaderViewElement {
    constructor() {
        this.type = LineType.Header;
    }
}
class DeletedLineViewElement {
    constructor(diff, originalLineNumber) {
        this.diff = diff;
        this.originalLineNumber = originalLineNumber;
        this.type = LineType.Deleted;
        this.modifiedLineNumber = undefined;
    }
}
class AddedLineViewElement {
    constructor(diff, modifiedLineNumber) {
        this.diff = diff;
        this.modifiedLineNumber = modifiedLineNumber;
        this.type = LineType.Added;
        this.originalLineNumber = undefined;
    }
}
class UnchangedLineViewElement {
    constructor(originalLineNumber, modifiedLineNumber) {
        this.originalLineNumber = originalLineNumber;
        this.modifiedLineNumber = modifiedLineNumber;
        this.type = LineType.Unchanged;
    }
}
let View = class View extends Disposable {
    constructor(_element, _model, _width, _height, _models, _languageService) {
        super();
        this._element = _element;
        this._model = _model;
        this._width = _width;
        this._height = _height;
        this._models = _models;
        this._languageService = _languageService;
        this.domNode = this._element;
        this.domNode.className = 'monaco-component diff-review monaco-editor-background';
        const actionBarContainer = document.createElement('div');
        actionBarContainer.className = 'diff-review-actions';
        this._actionBar = this._register(new ActionBar(actionBarContainer));
        this._register(autorun((reader) => {
            /** @description update actions */
            this._actionBar.clear();
            if (this._model.canClose.read(reader)) {
                this._actionBar.push(toAction({
                    id: 'diffreview.close',
                    label: localize('label.close', 'Close'),
                    class: 'close-diff-review ' + ThemeIcon.asClassName(accessibleDiffViewerCloseIcon),
                    enabled: true,
                    run: async () => _model.close(),
                }), { label: false, icon: true });
            }
        }));
        this._content = document.createElement('div');
        this._content.className = 'diff-review-content';
        this._content.setAttribute('role', 'code');
        this._scrollbar = this._register(new DomScrollableElement(this._content, {}));
        reset(this.domNode, this._scrollbar.getDomNode(), actionBarContainer);
        this._register(autorun((r) => {
            this._height.read(r);
            this._width.read(r);
            this._scrollbar.scanDomNode();
        }));
        this._register(toDisposable(() => {
            reset(this.domNode);
        }));
        this._register(applyStyle(this.domNode, { width: this._width, height: this._height }));
        this._register(applyStyle(this._content, { width: this._width, height: this._height }));
        this._register(autorunWithStore((reader, store) => {
            /** @description render */
            this._model.currentGroup.read(reader);
            this._render(store);
        }));
        // TODO@hediet use commands
        this._register(addStandardDisposableListener(this.domNode, 'keydown', (e) => {
            if (e.equals(18 /* KeyCode.DownArrow */) ||
                e.equals(2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */) ||
                e.equals(512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */)) {
                e.preventDefault();
                this._model.goToNextLine();
            }
            if (e.equals(16 /* KeyCode.UpArrow */) ||
                e.equals(2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */) ||
                e.equals(512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */)) {
                e.preventDefault();
                this._model.goToPreviousLine();
            }
            if (e.equals(9 /* KeyCode.Escape */) ||
                e.equals(2048 /* KeyMod.CtrlCmd */ | 9 /* KeyCode.Escape */) ||
                e.equals(512 /* KeyMod.Alt */ | 9 /* KeyCode.Escape */) ||
                e.equals(1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */)) {
                e.preventDefault();
                this._model.close();
            }
            if (e.equals(10 /* KeyCode.Space */) || e.equals(3 /* KeyCode.Enter */)) {
                e.preventDefault();
                this._model.revealCurrentElementInEditor();
            }
        }));
    }
    _render(store) {
        const originalOptions = this._models.getOriginalOptions();
        const modifiedOptions = this._models.getModifiedOptions();
        const container = document.createElement('div');
        container.className = 'diff-review-table';
        container.setAttribute('role', 'list');
        container.setAttribute('aria-label', localize('ariaLabel', 'Accessible Diff Viewer. Use arrow up and down to navigate.'));
        applyFontInfo(container, modifiedOptions.get(52 /* EditorOption.fontInfo */));
        reset(this._content, container);
        const originalModel = this._models.getOriginalModel();
        const modifiedModel = this._models.getModifiedModel();
        if (!originalModel || !modifiedModel) {
            return;
        }
        const originalModelOpts = originalModel.getOptions();
        const modifiedModelOpts = modifiedModel.getOptions();
        const lineHeight = modifiedOptions.get(68 /* EditorOption.lineHeight */);
        const group = this._model.currentGroup.get();
        for (const viewItem of group?.lines || []) {
            if (!group) {
                break;
            }
            let row;
            if (viewItem.type === LineType.Header) {
                const header = document.createElement('div');
                header.className = 'diff-review-row';
                header.setAttribute('role', 'listitem');
                const r = group.range;
                const diffIndex = this._model.currentGroupIndex.get();
                const diffsLength = this._model.groups.get().length;
                const getAriaLines = (lines) => lines === 0
                    ? localize('no_lines_changed', 'no lines changed')
                    : lines === 1
                        ? localize('one_line_changed', '1 line changed')
                        : localize('more_lines_changed', '{0} lines changed', lines);
                const originalChangedLinesCntAria = getAriaLines(r.original.length);
                const modifiedChangedLinesCntAria = getAriaLines(r.modified.length);
                header.setAttribute('aria-label', localize({
                    key: 'header',
                    comment: [
                        'This is the ARIA label for a git diff header.',
                        'A git diff header looks like this: @@ -154,12 +159,39 @@.',
                        'That encodes that at original line 154 (which is now line 159), 12 lines were removed/changed with 39 lines.',
                        'Variables 0 and 1 refer to the diff index out of total number of diffs.',
                        'Variables 2 and 4 will be numbers (a line number).',
                        'Variables 3 and 5 will be "no lines changed", "1 line changed" or "X lines changed", localized separately.',
                    ],
                }, 'Difference {0} of {1}: original line {2}, {3}, modified line {4}, {5}', diffIndex + 1, diffsLength, r.original.startLineNumber, originalChangedLinesCntAria, r.modified.startLineNumber, modifiedChangedLinesCntAria));
                const cell = document.createElement('div');
                cell.className = 'diff-review-cell diff-review-summary';
                // e.g.: `1/10: @@ -504,7 +517,7 @@`
                cell.appendChild(document.createTextNode(`${diffIndex + 1}/${diffsLength}: @@ -${r.original.startLineNumber},${r.original.length} +${r.modified.startLineNumber},${r.modified.length} @@`));
                header.appendChild(cell);
                row = header;
            }
            else {
                row = this._createRow(viewItem, lineHeight, this._width.get(), originalOptions, originalModel, originalModelOpts, modifiedOptions, modifiedModel, modifiedModelOpts);
            }
            container.appendChild(row);
            const isSelectedObs = derived((reader) => 
            /** @description isSelected */ this._model.currentElement.read(reader) === viewItem);
            store.add(autorun((reader) => {
                /** @description update tab index */
                const isSelected = isSelectedObs.read(reader);
                row.tabIndex = isSelected ? 0 : -1;
                if (isSelected) {
                    row.focus();
                }
            }));
            store.add(addDisposableListener(row, 'focus', () => {
                this._model.goToLine(viewItem);
            }));
        }
        this._scrollbar.scanDomNode();
    }
    _createRow(item, lineHeight, width, originalOptions, originalModel, originalModelOpts, modifiedOptions, modifiedModel, modifiedModelOpts) {
        const originalLayoutInfo = originalOptions.get(151 /* EditorOption.layoutInfo */);
        const originalLineNumbersWidth = originalLayoutInfo.glyphMarginWidth + originalLayoutInfo.lineNumbersWidth;
        const modifiedLayoutInfo = modifiedOptions.get(151 /* EditorOption.layoutInfo */);
        const modifiedLineNumbersWidth = 10 + modifiedLayoutInfo.glyphMarginWidth + modifiedLayoutInfo.lineNumbersWidth;
        let rowClassName = 'diff-review-row';
        let lineNumbersExtraClassName = '';
        const spacerClassName = 'diff-review-spacer';
        let spacerIcon = null;
        switch (item.type) {
            case LineType.Added:
                rowClassName = 'diff-review-row line-insert';
                lineNumbersExtraClassName = ' char-insert';
                spacerIcon = accessibleDiffViewerInsertIcon;
                break;
            case LineType.Deleted:
                rowClassName = 'diff-review-row line-delete';
                lineNumbersExtraClassName = ' char-delete';
                spacerIcon = accessibleDiffViewerRemoveIcon;
                break;
        }
        const row = document.createElement('div');
        row.style.minWidth = width + 'px';
        row.className = rowClassName;
        row.setAttribute('role', 'listitem');
        row.ariaLevel = '';
        const cell = document.createElement('div');
        cell.className = 'diff-review-cell';
        cell.style.height = `${lineHeight}px`;
        row.appendChild(cell);
        const originalLineNumber = document.createElement('span');
        originalLineNumber.style.width = originalLineNumbersWidth + 'px';
        originalLineNumber.style.minWidth = originalLineNumbersWidth + 'px';
        originalLineNumber.className = 'diff-review-line-number' + lineNumbersExtraClassName;
        if (item.originalLineNumber !== undefined) {
            originalLineNumber.appendChild(document.createTextNode(String(item.originalLineNumber)));
        }
        else {
            originalLineNumber.innerText = '\u00a0';
        }
        cell.appendChild(originalLineNumber);
        const modifiedLineNumber = document.createElement('span');
        modifiedLineNumber.style.width = modifiedLineNumbersWidth + 'px';
        modifiedLineNumber.style.minWidth = modifiedLineNumbersWidth + 'px';
        modifiedLineNumber.style.paddingRight = '10px';
        modifiedLineNumber.className = 'diff-review-line-number' + lineNumbersExtraClassName;
        if (item.modifiedLineNumber !== undefined) {
            modifiedLineNumber.appendChild(document.createTextNode(String(item.modifiedLineNumber)));
        }
        else {
            modifiedLineNumber.innerText = '\u00a0';
        }
        cell.appendChild(modifiedLineNumber);
        const spacer = document.createElement('span');
        spacer.className = spacerClassName;
        if (spacerIcon) {
            const spacerCodicon = document.createElement('span');
            spacerCodicon.className = ThemeIcon.asClassName(spacerIcon);
            spacerCodicon.innerText = '\u00a0\u00a0';
            spacer.appendChild(spacerCodicon);
        }
        else {
            spacer.innerText = '\u00a0\u00a0';
        }
        cell.appendChild(spacer);
        let lineContent;
        if (item.modifiedLineNumber !== undefined) {
            let html = this._getLineHtml(modifiedModel, modifiedOptions, modifiedModelOpts.tabSize, item.modifiedLineNumber, this._languageService.languageIdCodec);
            if (AccessibleDiffViewer._ttPolicy) {
                html = AccessibleDiffViewer._ttPolicy.createHTML(html);
            }
            cell.insertAdjacentHTML('beforeend', html);
            lineContent = modifiedModel.getLineContent(item.modifiedLineNumber);
        }
        else {
            let html = this._getLineHtml(originalModel, originalOptions, originalModelOpts.tabSize, item.originalLineNumber, this._languageService.languageIdCodec);
            if (AccessibleDiffViewer._ttPolicy) {
                html = AccessibleDiffViewer._ttPolicy.createHTML(html);
            }
            cell.insertAdjacentHTML('beforeend', html);
            lineContent = originalModel.getLineContent(item.originalLineNumber);
        }
        if (lineContent.length === 0) {
            lineContent = localize('blankLine', 'blank');
        }
        let ariaLabel = '';
        switch (item.type) {
            case LineType.Unchanged:
                if (item.originalLineNumber === item.modifiedLineNumber) {
                    ariaLabel = localize({
                        key: 'unchangedLine',
                        comment: ['The placeholders are contents of the line and should not be translated.'],
                    }, '{0} unchanged line {1}', lineContent, item.originalLineNumber);
                }
                else {
                    ariaLabel = localize('equalLine', '{0} original line {1} modified line {2}', lineContent, item.originalLineNumber, item.modifiedLineNumber);
                }
                break;
            case LineType.Added:
                ariaLabel = localize('insertLine', '+ {0} modified line {1}', lineContent, item.modifiedLineNumber);
                break;
            case LineType.Deleted:
                ariaLabel = localize('deleteLine', '- {0} original line {1}', lineContent, item.originalLineNumber);
                break;
        }
        row.setAttribute('aria-label', ariaLabel);
        return row;
    }
    _getLineHtml(model, options, tabSize, lineNumber, languageIdCodec) {
        const lineContent = model.getLineContent(lineNumber);
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const lineTokens = LineTokens.createEmpty(lineContent, languageIdCodec);
        const isBasicASCII = ViewLineRenderingData.isBasicASCII(lineContent, model.mightContainNonBasicASCII());
        const containsRTL = ViewLineRenderingData.containsRTL(lineContent, isBasicASCII, model.mightContainRTL());
        const r = renderViewLine2(new RenderLineInput(fontInfo.isMonospace && !options.get(33 /* EditorOption.disableMonospaceOptimizations */), fontInfo.canUseHalfwidthRightwardsArrow, lineContent, false, isBasicASCII, containsRTL, 0, lineTokens, [], tabSize, 0, fontInfo.spaceWidth, fontInfo.middotWidth, fontInfo.wsmiddotWidth, options.get(122 /* EditorOption.stopRenderingLineAfter */), options.get(104 /* EditorOption.renderWhitespace */), options.get(99 /* EditorOption.renderControlCharacters */), options.get(53 /* EditorOption.fontLigatures */) !== EditorFontLigatures.OFF, null));
        return r.html;
    }
};
View = __decorate([
    __param(5, ILanguageService)
], View);
export class AccessibleDiffViewerModelFromEditors {
    constructor(editors) {
        this.editors = editors;
    }
    getOriginalModel() {
        return this.editors.original.getModel();
    }
    getOriginalOptions() {
        return this.editors.original.getOptions();
    }
    originalReveal(range) {
        this.editors.original.revealRange(range);
        this.editors.original.setSelection(range);
        this.editors.original.focus();
    }
    getModifiedModel() {
        return this.editors.modified.getModel();
    }
    getModifiedOptions() {
        return this.editors.modified.getOptions();
    }
    modifiedReveal(range) {
        if (range) {
            this.editors.modified.revealRange(range);
            this.editors.modified.setSelection(range);
        }
        this.editors.modified.focus();
    }
    modifiedSetSelection(range) {
        this.editors.modified.setSelection(range);
    }
    modifiedFocus() {
        this.editors.modified.focus();
    }
    getModifiedPosition() {
        return this.editors.modified.getPosition() ?? undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZURpZmZWaWV3ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9jb21wb25lbnRzL2FjY2Vzc2libGVEaWZmVmlld2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsNkJBQTZCLEVBQzdCLEtBQUssR0FDTCxNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsVUFBVSxFQUFtQixZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRyxPQUFPLEVBR04sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEVBQ1AsZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZixjQUFjLEVBQ2QsV0FBVyxHQUNYLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQ3hDLE9BQU8sRUFDTixtQkFBbUIsR0FHbkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1B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
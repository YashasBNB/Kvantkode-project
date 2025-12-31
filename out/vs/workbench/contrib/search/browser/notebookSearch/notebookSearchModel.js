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
import { coalesce } from '../../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { FindMatch } from '../../../../../editor/common/model.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { resultIsMatch, } from '../../../../services/search/common/search.js';
import { getTextSearchMatchWithModelContext } from '../../../../services/search/common/searchHelpers.js';
import { FindMatchDecorationModel } from '../../../notebook/browser/contrib/find/findMatchDecorationModel.js';
import { CellFindMatchModel } from '../../../notebook/browser/contrib/find/findModel.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { NotebookCellsChangeType } from '../../../notebook/common/notebookCommon.js';
import { CellSearchModel } from '../../common/cellSearchModel.js';
import { isINotebookFileMatchNoModel, rawCellPrefix, } from '../../common/searchNotebookHelpers.js';
import { contentMatchesToTextSearchMatches, isINotebookCellMatchWithModel, isINotebookFileMatchWithModel, webviewMatchesToTextSearchMatches, } from './searchNotebookHelpers.js';
import { MATCH_PREFIX, } from '../searchTreeModel/searchTreeCommon.js';
import { IReplaceService } from '../replace.js';
import { FileMatchImpl } from '../searchTreeModel/fileMatch.js';
import { isIMatchInNotebook, } from './notebookSearchModelBase.js';
import { MatchImpl, textSearchResultToMatches } from '../searchTreeModel/match.js';
export class MatchInNotebook extends MatchImpl {
    constructor(_cellParent, _fullPreviewLines, _fullPreviewRange, _documentRange, webviewIndex) {
        super(_cellParent.parent, _fullPreviewLines, _fullPreviewRange, _documentRange, false);
        this._cellParent = _cellParent;
        this._id =
            MATCH_PREFIX +
                this._parent.resource.toString() +
                '>' +
                this._cellParent.cellIndex +
                (webviewIndex ? '_' + webviewIndex : '') +
                '_' +
                this.notebookMatchTypeString() +
                this._range +
                this.getMatchString();
        this._webviewIndex = webviewIndex;
    }
    parent() {
        // visible parent in search tree
        return this._cellParent.parent;
    }
    get cellParent() {
        return this._cellParent;
    }
    notebookMatchTypeString() {
        return this.isWebviewMatch() ? 'webview' : 'content';
    }
    isWebviewMatch() {
        return this._webviewIndex !== undefined;
    }
    get isReadonly() {
        return super.isReadonly || !this._cellParent.hasCellViewModel() || this.isWebviewMatch();
    }
    get cellIndex() {
        return this._cellParent.cellIndex;
    }
    get webviewIndex() {
        return this._webviewIndex;
    }
    get cell() {
        return this._cellParent.cell;
    }
}
export class CellMatch {
    constructor(_parent, _cell, _cellIndex) {
        this._parent = _parent;
        this._cell = _cell;
        this._cellIndex = _cellIndex;
        this._contentMatches = new Map();
        this._webviewMatches = new Map();
        this._context = new Map();
    }
    hasCellViewModel() {
        return !(this._cell instanceof CellSearchModel);
    }
    get context() {
        return new Map(this._context);
    }
    matches() {
        return [...this._contentMatches.values(), ...this._webviewMatches.values()];
    }
    get contentMatches() {
        return Array.from(this._contentMatches.values());
    }
    get webviewMatches() {
        return Array.from(this._webviewMatches.values());
    }
    remove(matches) {
        if (!Array.isArray(matches)) {
            matches = [matches];
        }
        for (const match of matches) {
            this._contentMatches.delete(match.id());
            this._webviewMatches.delete(match.id());
        }
    }
    clearAllMatches() {
        this._contentMatches.clear();
        this._webviewMatches.clear();
    }
    addContentMatches(textSearchMatches) {
        const contentMatches = textSearchMatchesToNotebookMatches(textSearchMatches, this);
        contentMatches.forEach((match) => {
            this._contentMatches.set(match.id(), match);
        });
        this.addContext(textSearchMatches);
    }
    addContext(textSearchMatches) {
        if (!this.cell) {
            // todo: get closed notebook results in search editor
            return;
        }
        this.cell.resolveTextModel().then((textModel) => {
            const textResultsWithContext = getTextSearchMatchWithModelContext(textSearchMatches, textModel, this.parent.parent().query);
            const contexts = textResultsWithContext.filter(((result) => !resultIsMatch(result)));
            contexts
                .map((context) => ({ ...context, lineNumber: context.lineNumber + 1 }))
                .forEach((context) => {
                this._context.set(context.lineNumber, context.text);
            });
        });
    }
    addWebviewMatches(textSearchMatches) {
        const webviewMatches = textSearchMatchesToNotebookMatches(textSearchMatches, this);
        webviewMatches.forEach((match) => {
            this._webviewMatches.set(match.id(), match);
        });
        // TODO: add webview results to context
    }
    setCellModel(cell) {
        this._cell = cell;
    }
    get parent() {
        return this._parent;
    }
    get id() {
        return this._cell?.id ?? `${rawCellPrefix}${this.cellIndex}`;
    }
    get cellIndex() {
        return this._cellIndex;
    }
    get cell() {
        return this._cell;
    }
}
let NotebookCompatibleFileMatch = class NotebookCompatibleFileMatch extends FileMatchImpl {
    constructor(_query, _previewOptions, _maxResults, _parent, rawMatch, _closestRoot, searchInstanceID, modelService, replaceService, labelService, notebookEditorService) {
        super(_query, _previewOptions, _maxResults, _parent, rawMatch, _closestRoot, modelService, replaceService, labelService);
        this.searchInstanceID = searchInstanceID;
        this.notebookEditorService = notebookEditorService;
        this._notebookEditorWidget = null;
        this._editorWidgetListener = null;
        this._cellMatches = new Map();
        this._notebookUpdateScheduler = new RunOnceScheduler(this.updateMatchesForEditorWidget.bind(this), 250);
    }
    get cellContext() {
        const cellContext = new Map();
        this._cellMatches.forEach((cellMatch) => {
            cellContext.set(cellMatch.id, cellMatch.context);
        });
        return cellContext;
    }
    getCellMatch(cellID) {
        return this._cellMatches.get(cellID);
    }
    addCellMatch(rawCell) {
        const cellMatch = new CellMatch(this, isINotebookCellMatchWithModel(rawCell) ? rawCell.cell : undefined, rawCell.index);
        this._cellMatches.set(cellMatch.id, cellMatch);
        this.addWebviewMatchesToCell(cellMatch.id, rawCell.webviewResults);
        this.addContentMatchesToCell(cellMatch.id, rawCell.contentResults);
    }
    addWebviewMatchesToCell(cellID, webviewMatches) {
        const cellMatch = this.getCellMatch(cellID);
        if (cellMatch !== undefined) {
            cellMatch.addWebviewMatches(webviewMatches);
        }
    }
    addContentMatchesToCell(cellID, contentMatches) {
        const cellMatch = this.getCellMatch(cellID);
        if (cellMatch !== undefined) {
            cellMatch.addContentMatches(contentMatches);
        }
    }
    revealCellRange(match, outputOffset) {
        if (!this._notebookEditorWidget || !match.cell) {
            // match cell should never be a CellSearchModel if the notebook is open
            return;
        }
        if (match.webviewIndex !== undefined) {
            const index = this._notebookEditorWidget.getCellIndex(match.cell);
            if (index !== undefined) {
                this._notebookEditorWidget.revealCellOffsetInCenter(match.cell, outputOffset ?? 0);
            }
        }
        else {
            match.cell.updateEditState(match.cell.getEditState(), 'focusNotebookCell');
            this._notebookEditorWidget.setCellEditorSelection(match.cell, match.range());
            this._notebookEditorWidget.revealRangeInCenterIfOutsideViewportAsync(match.cell, match.range());
        }
    }
    bindNotebookEditorWidget(widget) {
        if (this._notebookEditorWidget === widget) {
            return;
        }
        this._notebookEditorWidget = widget;
        this._editorWidgetListener =
            this._notebookEditorWidget.textModel?.onDidChangeContent((e) => {
                if (!e.rawEvents.some((event) => event.kind === NotebookCellsChangeType.ChangeCellContent ||
                    event.kind === NotebookCellsChangeType.ModelChange)) {
                    return;
                }
                this._notebookUpdateScheduler.schedule();
            }) ?? null;
        this._addNotebookHighlights();
    }
    unbindNotebookEditorWidget(widget) {
        if (widget && this._notebookEditorWidget !== widget) {
            return;
        }
        if (this._notebookEditorWidget) {
            this._notebookUpdateScheduler.cancel();
            this._editorWidgetListener?.dispose();
        }
        this._removeNotebookHighlights();
        this._notebookEditorWidget = null;
    }
    updateNotebookHighlights() {
        if (this.parent().showHighlights) {
            this._addNotebookHighlights();
            this.setNotebookFindMatchDecorationsUsingCellMatches(Array.from(this._cellMatches.values()));
        }
        else {
            this._removeNotebookHighlights();
        }
    }
    _addNotebookHighlights() {
        if (!this._notebookEditorWidget) {
            return;
        }
        this._findMatchDecorationModel?.stopWebviewFind();
        this._findMatchDecorationModel?.dispose();
        this._findMatchDecorationModel = new FindMatchDecorationModel(this._notebookEditorWidget, this.searchInstanceID);
        if (this._selectedMatch instanceof MatchInNotebook) {
            this.highlightCurrentFindMatchDecoration(this._selectedMatch);
        }
    }
    _removeNotebookHighlights() {
        if (this._findMatchDecorationModel) {
            this._findMatchDecorationModel?.stopWebviewFind();
            this._findMatchDecorationModel?.dispose();
            this._findMatchDecorationModel = undefined;
        }
    }
    updateNotebookMatches(matches, modelChange) {
        if (!this._notebookEditorWidget) {
            return;
        }
        const oldCellMatches = new Map(this._cellMatches);
        if (this._notebookEditorWidget.getId() !== this._lastEditorWidgetIdForUpdate) {
            this._cellMatches.clear();
            this._lastEditorWidgetIdForUpdate = this._notebookEditorWidget.getId();
        }
        matches.forEach((match) => {
            let existingCell = this._cellMatches.get(match.cell.id);
            if (this._notebookEditorWidget && !existingCell) {
                const index = this._notebookEditorWidget.getCellIndex(match.cell);
                const existingRawCell = oldCellMatches.get(`${rawCellPrefix}${index}`);
                if (existingRawCell) {
                    existingRawCell.setCellModel(match.cell);
                    existingRawCell.clearAllMatches();
                    existingCell = existingRawCell;
                }
            }
            existingCell?.clearAllMatches();
            const cell = existingCell ?? new CellMatch(this, match.cell, match.index);
            cell.addContentMatches(contentMatchesToTextSearchMatches(match.contentMatches, match.cell));
            cell.addWebviewMatches(webviewMatchesToTextSearchMatches(match.webviewMatches));
            this._cellMatches.set(cell.id, cell);
        });
        this._findMatchDecorationModel?.setAllFindMatchesDecorations(matches);
        if (this._selectedMatch instanceof MatchInNotebook) {
            this.highlightCurrentFindMatchDecoration(this._selectedMatch);
        }
        this._onChange.fire({ forceUpdateModel: modelChange });
    }
    setNotebookFindMatchDecorationsUsingCellMatches(cells) {
        if (!this._findMatchDecorationModel) {
            return;
        }
        const cellFindMatch = coalesce(cells.map((cell) => {
            const webviewMatches = coalesce(cell.webviewMatches.map((match) => {
                if (!match.webviewIndex) {
                    return undefined;
                }
                return {
                    index: match.webviewIndex,
                };
            }));
            if (!cell.cell) {
                return undefined;
            }
            const findMatches = cell.contentMatches.map((match) => {
                return new FindMatch(match.range(), [match.text()]);
            });
            return new CellFindMatchModel(cell.cell, cell.cellIndex, findMatches, webviewMatches);
        }));
        try {
            this._findMatchDecorationModel.setAllFindMatchesDecorations(cellFindMatch);
        }
        catch (e) {
            // no op, might happen due to bugs related to cell output regex search
        }
    }
    async updateMatchesForEditorWidget() {
        if (!this._notebookEditorWidget) {
            return;
        }
        this._textMatches = new Map();
        const wordSeparators = this._query.isWordMatch && this._query.wordSeparators ? this._query.wordSeparators : null;
        const allMatches = await this._notebookEditorWidget.find(this._query.pattern, {
            regex: this._query.isRegExp,
            wholeWord: this._query.isWordMatch,
            caseSensitive: this._query.isCaseSensitive,
            wordSeparators: wordSeparators ?? undefined,
            includeMarkupInput: this._query.notebookInfo?.isInNotebookMarkdownInput,
            includeMarkupPreview: this._query.notebookInfo?.isInNotebookMarkdownPreview,
            includeCodeInput: this._query.notebookInfo?.isInNotebookCellInput,
            includeOutput: this._query.notebookInfo?.isInNotebookCellOutput,
        }, CancellationToken.None, false, true, this.searchInstanceID);
        this.updateNotebookMatches(allMatches, true);
    }
    async showMatch(match) {
        const offset = await this.highlightCurrentFindMatchDecoration(match);
        this.setSelectedMatch(match);
        this.revealCellRange(match, offset);
    }
    async highlightCurrentFindMatchDecoration(match) {
        if (!this._findMatchDecorationModel || !match.cell) {
            // match cell should never be a CellSearchModel if the notebook is open
            return null;
        }
        if (match.webviewIndex === undefined) {
            return this._findMatchDecorationModel.highlightCurrentFindMatchDecorationInCell(match.cell, match.range());
        }
        else {
            return this._findMatchDecorationModel.highlightCurrentFindMatchDecorationInWebview(match.cell, match.webviewIndex);
        }
    }
    matches() {
        const matches = Array.from(this._cellMatches.values()).flatMap((e) => e.matches());
        return [...super.matches(), ...matches];
    }
    removeMatch(match) {
        if (match instanceof MatchInNotebook) {
            match.cellParent.remove(match);
            if (match.cellParent.matches().length === 0) {
                this._cellMatches.delete(match.cellParent.id);
            }
            if (this.isMatchSelected(match)) {
                this.setSelectedMatch(null);
                this._findMatchDecorationModel?.clearCurrentFindMatchDecoration();
            }
            else {
                this.updateHighlights();
            }
            this.setNotebookFindMatchDecorationsUsingCellMatches(this.cellMatches());
        }
        else {
            super.removeMatch(match);
        }
    }
    cellMatches() {
        return Array.from(this._cellMatches.values());
    }
    createMatches() {
        const model = this.modelService.getModel(this._resource);
        if (model) {
            // todo: handle better when ai contributed results has model, currently, createMatches does not work for this
            this.bindModel(model);
            this.updateMatchesForModel();
        }
        else {
            const notebookEditorWidgetBorrow = this.notebookEditorService.retrieveExistingWidgetFromURI(this.resource);
            if (notebookEditorWidgetBorrow?.value) {
                this.bindNotebookEditorWidget(notebookEditorWidgetBorrow.value);
            }
            if (this.rawMatch.results) {
                this.rawMatch.results.filter(resultIsMatch).forEach((rawMatch) => {
                    textSearchResultToMatches(rawMatch, this, false).forEach((m) => this.add(m));
                });
            }
            if (isINotebookFileMatchWithModel(this.rawMatch) ||
                isINotebookFileMatchNoModel(this.rawMatch)) {
                this.rawMatch.cellResults?.forEach((cell) => this.addCellMatch(cell));
                this.setNotebookFindMatchDecorationsUsingCellMatches(this.cellMatches());
                this._onChange.fire({ forceUpdateModel: true });
            }
            this.addContext(this.rawMatch.results);
        }
    }
    get hasChildren() {
        return super.hasChildren || this._cellMatches.size > 0;
    }
    setSelectedMatch(match) {
        if (match) {
            if (!this.isMatchSelected(match) && isIMatchInNotebook(match)) {
                this._selectedMatch = match;
                return;
            }
            if (!this._textMatches.has(match.id())) {
                return;
            }
            if (this.isMatchSelected(match)) {
                return;
            }
        }
        this._selectedMatch = match;
        this.updateHighlights();
    }
    dispose() {
        this.unbindNotebookEditorWidget();
        super.dispose();
    }
};
NotebookCompatibleFileMatch = __decorate([
    __param(7, IModelService),
    __param(8, IReplaceService),
    __param(9, ILabelService),
    __param(10, INotebookEditorService)
], NotebookCompatibleFileMatch);
export { NotebookCompatibleFileMatch };
// text search to notebook matches
export function textSearchMatchesToNotebookMatches(textSearchMatches, cell) {
    const notebookMatches = [];
    textSearchMatches.forEach((textSearchMatch) => {
        const previewLines = textSearchMatch.previewText.split('\n');
        textSearchMatch.rangeLocations.map((rangeLocation) => {
            const previewRange = rangeLocation.preview;
            const match = new MatchInNotebook(cell, previewLines, previewRange, rangeLocation.source, textSearchMatch.webviewIndex);
            notebookMatches.push(match);
        });
    });
    return notebookMatches;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWFyY2hNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL25vdGVib29rU2VhcmNoL25vdGVib29rU2VhcmNoTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTlFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFHTixhQUFhLEdBS2IsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQU94RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUVOLDJCQUEyQixFQUMzQixhQUFhLEdBQ2IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQ04saUNBQWlDLEVBRWpDLDZC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
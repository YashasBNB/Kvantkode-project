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
var FileMatchImpl_1;
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { themeColorFromId } from '../../../../../base/common/themables.js';
import { ModelDecorationOptions } from '../../../../../editor/common/model/textModel.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { overviewRulerFindMatchForeground, minimapFindMatch, } from '../../../../../platform/theme/common/colorRegistry.js';
import { resultIsMatch, DEFAULT_MAX_SEARCH_RESULTS, } from '../../../../services/search/common/search.js';
import { editorMatchesToTextSearchResults, getTextSearchMatchWithModelContext, } from '../../../../services/search/common/searchHelpers.js';
import { IReplaceService } from '../replace.js';
import { FILE_MATCH_PREFIX, } from './searchTreeCommon.js';
import { Emitter } from '../../../../../base/common/event.js';
import { textSearchResultToMatches } from './match.js';
import { OverviewRulerLane } from '../../../../../editor/common/standalone/standaloneEnums.js';
let FileMatchImpl = class FileMatchImpl extends Disposable {
    static { FileMatchImpl_1 = this; }
    static { this._CURRENT_FIND_MATCH = ModelDecorationOptions.register({
        description: 'search-current-find-match',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        zIndex: 13,
        className: 'currentFindMatch',
        inlineClassName: 'currentFindMatchInline',
        overviewRuler: {
            color: themeColorFromId(overviewRulerFindMatchForeground),
            position: OverviewRulerLane.Center,
        },
        minimap: {
            color: themeColorFromId(minimapFindMatch),
            position: 1 /* MinimapPosition.Inline */,
        },
    }); }
    static { this._FIND_MATCH = ModelDecorationOptions.register({
        description: 'search-find-match',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'findMatch',
        inlineClassName: 'findMatchInline',
        overviewRuler: {
            color: themeColorFromId(overviewRulerFindMatchForeground),
            position: OverviewRulerLane.Center,
        },
        minimap: {
            color: themeColorFromId(minimapFindMatch),
            position: 1 /* MinimapPosition.Inline */,
        },
    }); }
    static getDecorationOption(selected) {
        return selected ? FileMatchImpl_1._CURRENT_FIND_MATCH : FileMatchImpl_1._FIND_MATCH;
    }
    get context() {
        return new Map(this._context);
    }
    constructor(_query, _previewOptions, _maxResults, _parent, rawMatch, _closestRoot, modelService, replaceService, labelService) {
        super();
        this._query = _query;
        this._previewOptions = _previewOptions;
        this._maxResults = _maxResults;
        this._parent = _parent;
        this.rawMatch = rawMatch;
        this._closestRoot = _closestRoot;
        this.modelService = modelService;
        this.replaceService = replaceService;
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._onDispose = this._register(new Emitter());
        this.onDispose = this._onDispose.event;
        this._model = null;
        this._modelListener = null;
        this._selectedMatch = null;
        this._modelDecorations = [];
        this._context = new Map();
        this.replaceQ = Promise.resolve();
        this._resource = this.rawMatch.resource;
        this._textMatches = new Map();
        this._removedTextMatches = new Set();
        this._updateScheduler = new RunOnceScheduler(this.updateMatchesForModel.bind(this), 250);
        this._name = new Lazy(() => labelService.getUriBasenameLabel(this.resource));
    }
    get closestRoot() {
        return this._closestRoot;
    }
    hasReadonlyMatches() {
        return this.matches().some((m) => m.isReadonly);
    }
    createMatches() {
        const model = this.modelService.getModel(this._resource);
        if (model) {
            // todo: handle better when ai contributed results has model, currently, createMatches does not work for this
            this.bindModel(model);
            this.updateMatchesForModel();
        }
        else {
            if (this.rawMatch.results) {
                this.rawMatch.results.filter(resultIsMatch).forEach((rawMatch) => {
                    textSearchResultToMatches(rawMatch, this, false).forEach((m) => this.add(m));
                });
            }
        }
    }
    bindModel(model) {
        this._model = model;
        this._modelListener = new DisposableStore();
        this._modelListener.add(this._model.onDidChangeContent(() => {
            this._updateScheduler.schedule();
        }));
        this._modelListener.add(this._model.onWillDispose(() => this.onModelWillDispose()));
        this.updateHighlights();
    }
    onModelWillDispose() {
        // Update matches because model might have some dirty changes
        this.updateMatchesForModel();
        this.unbindModel();
    }
    unbindModel() {
        if (this._model) {
            this._updateScheduler.cancel();
            this._model.changeDecorations((accessor) => {
                this._modelDecorations = accessor.deltaDecorations(this._modelDecorations, []);
            });
            this._model = null;
            this._modelListener.dispose();
        }
    }
    updateMatchesForModel() {
        // this is called from a timeout and might fire
        // after the model has been disposed
        if (!this._model) {
            return;
        }
        this._textMatches = new Map();
        const wordSeparators = this._query.isWordMatch && this._query.wordSeparators ? this._query.wordSeparators : null;
        const matches = this._model.findMatches(this._query.pattern, this._model.getFullModelRange(), !!this._query.isRegExp, !!this._query.isCaseSensitive, wordSeparators, false, this._maxResults ?? DEFAULT_MAX_SEARCH_RESULTS);
        this.updateMatches(matches, true, this._model, false);
    }
    async updatesMatchesForLineAfterReplace(lineNumber, modelChange) {
        if (!this._model) {
            return;
        }
        const range = {
            startLineNumber: lineNumber,
            startColumn: this._model.getLineMinColumn(lineNumber),
            endLineNumber: lineNumber,
            endColumn: this._model.getLineMaxColumn(lineNumber),
        };
        const oldMatches = Array.from(this._textMatches.values()).filter((match) => match.range().startLineNumber === lineNumber);
        oldMatches.forEach((match) => this._textMatches.delete(match.id()));
        const wordSeparators = this._query.isWordMatch && this._query.wordSeparators ? this._query.wordSeparators : null;
        const matches = this._model.findMatches(this._query.pattern, range, !!this._query.isRegExp, !!this._query.isCaseSensitive, wordSeparators, false, this._maxResults ?? DEFAULT_MAX_SEARCH_RESULTS);
        this.updateMatches(matches, modelChange, this._model, false);
    }
    updateMatches(matches, modelChange, model, isAiContributed) {
        const textSearchResults = editorMatchesToTextSearchResults(matches, model, this._previewOptions);
        textSearchResults.forEach((textSearchResult) => {
            textSearchResultToMatches(textSearchResult, this, isAiContributed).forEach((match) => {
                if (!this._removedTextMatches.has(match.id())) {
                    this.add(match);
                    if (this.isMatchSelected(match)) {
                        this._selectedMatch = match;
                    }
                }
            });
        });
        this.addContext(getTextSearchMatchWithModelContext(textSearchResults, model, this.parent().parent().query));
        this._onChange.fire({ forceUpdateModel: modelChange });
        this.updateHighlights();
    }
    updateHighlights() {
        if (!this._model) {
            return;
        }
        this._model.changeDecorations((accessor) => {
            const newDecorations = this.parent().showHighlights
                ? this.matches().map((match) => ({
                    range: match.range(),
                    options: FileMatchImpl_1.getDecorationOption(this.isMatchSelected(match)),
                }))
                : [];
            this._modelDecorations = accessor.deltaDecorations(this._modelDecorations, newDecorations);
        });
    }
    id() {
        return FILE_MATCH_PREFIX + this.resource.toString();
    }
    parent() {
        return this._parent;
    }
    get hasChildren() {
        return this._textMatches.size > 0;
    }
    matches() {
        return [...this._textMatches.values()];
    }
    textMatches() {
        return Array.from(this._textMatches.values());
    }
    remove(matches) {
        if (!Array.isArray(matches)) {
            matches = [matches];
        }
        for (const match of matches) {
            this.removeMatch(match);
            this._removedTextMatches.add(match.id());
        }
        this._onChange.fire({ didRemove: true });
    }
    async replace(toReplace) {
        return (this.replaceQ = this.replaceQ.finally(async () => {
            await this.replaceService.replace(toReplace);
            await this.updatesMatchesForLineAfterReplace(toReplace.range().startLineNumber, false);
        }));
    }
    setSelectedMatch(match) {
        if (match) {
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
    getSelectedMatch() {
        return this._selectedMatch;
    }
    isMatchSelected(match) {
        return !!this._selectedMatch && this._selectedMatch.id() === match.id();
    }
    count() {
        return this.matches().length;
    }
    get resource() {
        return this._resource;
    }
    name() {
        return this._name.value;
    }
    addContext(results) {
        if (!results) {
            return;
        }
        const contexts = results.filter(((result) => !resultIsMatch(result)));
        return contexts.forEach((context) => this._context.set(context.lineNumber, context.text));
    }
    add(match, trigger) {
        this._textMatches.set(match.id(), match);
        if (trigger) {
            this._onChange.fire({ forceUpdateModel: true });
        }
    }
    removeMatch(match) {
        this._textMatches.delete(match.id());
        if (this.isMatchSelected(match)) {
            this.setSelectedMatch(null);
            this._findMatchDecorationModel?.clearCurrentFindMatchDecoration();
        }
        else {
            this.updateHighlights();
        }
    }
    async resolveFileStat(fileService) {
        this._fileStat = await fileService.stat(this.resource).catch(() => undefined);
    }
    get fileStat() {
        return this._fileStat;
    }
    set fileStat(stat) {
        this._fileStat = stat;
    }
    dispose() {
        this.setSelectedMatch(null);
        this.unbindModel();
        this._onDispose.fire();
        super.dispose();
    }
    hasOnlyReadOnlyMatches() {
        return this.matches().every((match) => match.isReadonly);
    }
};
FileMatchImpl = FileMatchImpl_1 = __decorate([
    __param(6, IModelService),
    __param(7, IReplaceService),
    __param(8, ILabelService)
], FileMatchImpl);
export { FileMatchImpl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZU1hdGNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoVHJlZU1vZGVsL2ZpbGVNYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDckYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFTMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDeEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBSzlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLGdCQUFnQixHQUNoQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFJTixhQUFhLEVBQ2IsMEJBQTBCLEdBRzFCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyxrQ0FBa0MsR0FDbEMsTUFBTSxxREFBcUQsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQy9DLE9BQU8sRUFDTixpQkFBaUIsR0FLakIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3RELE9BQU8sRUFB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
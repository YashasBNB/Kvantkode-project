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
import { Emitter } from '../../../../../base/common/event.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { resultIsMatch, } from '../../../../services/search/common/search.js';
import { IReplaceService } from '../replace.js';
import { FileMatchImpl } from '../searchTreeModel/fileMatch.js';
import { TEXT_SEARCH_HEADING_PREFIX, AI_TEXT_SEARCH_RESULT_ID, FOLDER_MATCH_PREFIX, getFileMatches, FILE_MATCH_PREFIX, } from '../searchTreeModel/searchTreeCommon.js';
import { TextSearchHeadingImpl } from '../searchTreeModel/textSearchHeading.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { textSearchResultToMatches } from '../searchTreeModel/match.js';
import { ResourceSet } from '../../../../../base/common/map.js';
let AITextSearchHeadingImpl = class AITextSearchHeadingImpl extends TextSearchHeadingImpl {
    constructor(parent, instantiationService, uriIdentityService) {
        super(false, parent, instantiationService, uriIdentityService);
        this.hidden = true;
    }
    name() {
        return 'AI';
    }
    id() {
        return TEXT_SEARCH_HEADING_PREFIX + AI_TEXT_SEARCH_RESULT_ID;
    }
    get isAIContributed() {
        return true;
    }
    get query() {
        return this._query;
    }
    set query(query) {
        this.clearQuery();
        if (!query) {
            return;
        }
        this._folderMatches = ((query && query.folderQueries) || [])
            .map((fq) => fq.folder)
            .map((resource, index) => (this._createBaseFolderMatch(resource, resource.toString(), index, query)));
        this._folderMatches.forEach((fm) => this._folderMatchesMap.set(fm.resource, fm));
        this._query = query;
    }
    fileCount() {
        const uniqueFileUris = new ResourceSet();
        for (const folderMatch of this.folderMatches()) {
            if (folderMatch.isEmpty()) {
                continue;
            }
            for (const fileMatch of folderMatch.allDownstreamFileMatches()) {
                uniqueFileUris.add(fileMatch.resource);
            }
        }
        return uniqueFileUris.size;
    }
    _createBaseFolderMatch(resource, id, index, query) {
        const folderMatch = this._register(this.createWorkspaceRootWithResourceImpl(resource, id, index, query));
        const disposable = folderMatch.onChange((event) => this._onChange.fire(event));
        this._register(folderMatch.onDispose(() => disposable.dispose()));
        return folderMatch;
    }
    createWorkspaceRootWithResourceImpl(resource, id, index, query) {
        return this.instantiationService.createInstance(AIFolderMatchWorkspaceRootImpl, resource, id, index, query, this);
    }
};
AITextSearchHeadingImpl = __decorate([
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService)
], AITextSearchHeadingImpl);
export { AITextSearchHeadingImpl };
let AIFolderMatchWorkspaceRootImpl = class AIFolderMatchWorkspaceRootImpl extends Disposable {
    constructor(_resource, _id, _index, _query, _parent, instantiationService, labelService) {
        super();
        this._resource = _resource;
        this._index = _index;
        this._query = _query;
        this._parent = _parent;
        this.instantiationService = instantiationService;
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._onDispose = this._register(new Emitter());
        this.onDispose = this._onDispose.event;
        this.latestRank = 0;
        this.replacingAll = false;
        this._fileMatches = new Map();
        this._id = FOLDER_MATCH_PREFIX + _id;
        this._name = new Lazy(() => this.resource ? labelService.getUriBasenameLabel(this.resource) : '');
        this._unDisposedFileMatches = new Map();
    }
    get resource() {
        return this._resource;
    }
    id() {
        return this._id;
    }
    index() {
        return this._index;
    }
    name() {
        return this._name.value;
    }
    count() {
        return this._fileMatches.size;
    }
    doAddFile(fileMatch) {
        this._fileMatches.set(fileMatch.id(), fileMatch);
    }
    createAndConfigureFileMatch(rawFileMatch, searchInstanceID) {
        const fileMatch = this.instantiationService.createInstance(AIFileMatch, this._query.contentPattern, this._query.previewOptions, this._query.maxResults, this, rawFileMatch, this, rawFileMatch.resource.toString() + '_' + Date.now().toString(), this.latestRank++);
        fileMatch.createMatches();
        this.doAddFile(fileMatch);
        const disposable = fileMatch.onChange(({ didRemove }) => this.onFileChange(fileMatch, didRemove));
        this._register(fileMatch.onDispose(() => disposable.dispose()));
        return fileMatch;
    }
    isAIContributed() {
        return true;
    }
    onFileChange(fileMatch, removed = false) {
        let added = false;
        if (!this._fileMatches.has(fileMatch.id())) {
            this.doAddFile(fileMatch);
            added = true;
        }
        if (fileMatch.count() === 0) {
            this.doRemoveFile([fileMatch], false, false);
            added = false;
            removed = true;
        }
        this._onChange.fire({ elements: [fileMatch], added: added, removed: removed });
    }
    get hasChildren() {
        return this._fileMatches.size > 0;
    }
    parent() {
        return this._parent;
    }
    matches() {
        return [...this._fileMatches.values()];
    }
    allDownstreamFileMatches() {
        return [...this._fileMatches.values()];
    }
    remove(matches) {
        if (!Array.isArray(matches)) {
            matches = [matches];
        }
        const allMatches = getFileMatches(matches);
        this.doRemoveFile(allMatches);
    }
    addFileMatch(raw, silent, searchInstanceID) {
        // when adding a fileMatch that has intermediate directories
        const added = [];
        const updated = [];
        raw.forEach((rawFileMatch) => {
            const fileMatch = this.createAndConfigureFileMatch(rawFileMatch, searchInstanceID);
            added.push(fileMatch);
        });
        const elements = [...added, ...updated];
        if (!silent && elements.length) {
            this._onChange.fire({ elements, added: !!added.length });
        }
    }
    isEmpty() {
        return this.recursiveFileCount() === 0;
    }
    clear(clearingAll) {
        const changed = this.allDownstreamFileMatches();
        this.disposeMatches();
        this._onChange.fire({ elements: changed, removed: true, added: false, clearingAll });
    }
    get showHighlights() {
        return this._parent.showHighlights;
    }
    get searchModel() {
        return this._searchResult.searchModel;
    }
    get _searchResult() {
        return this._parent.parent();
    }
    get query() {
        return this._query;
    }
    getDownstreamFileMatch(uri) {
        for (const fileMatch of this._fileMatches.values()) {
            if (fileMatch.resource.toString() === uri.toString()) {
                return fileMatch;
            }
        }
        return null;
    }
    replaceAll() {
        throw new Error('Cannot replace in AI search');
    }
    recursiveFileCount() {
        return this._fileMatches.size;
    }
    doRemoveFile(fileMatches, dispose = true, trigger = true, keepReadonly = false) {
        const removed = [];
        for (const match of fileMatches) {
            if (this._fileMatches.get(match.id())) {
                if (keepReadonly && match.hasReadonlyMatches()) {
                    continue;
                }
                this._fileMatches.delete(match.id());
                if (dispose) {
                    match.dispose();
                }
                else {
                    this._unDisposedFileMatches.set(match.id(), match);
                }
                removed.push(match);
            }
        }
        if (trigger) {
            this._onChange.fire({ elements: removed, removed: true });
        }
    }
    replace(match) {
        throw new Error('Cannot replace in AI search');
    }
    bindModel(model) {
        // no op
    }
    unbindNotebookEditorWidget(editor, resource) {
        //no op
    }
    bindNotebookEditorWidget(editor, resource) {
        //no op
        return Promise.resolve();
    }
    hasOnlyReadOnlyMatches() {
        return Array.from(this._fileMatches.values()).every((fm) => fm.hasOnlyReadOnlyMatches());
    }
    fileMatchesIterator() {
        return this._fileMatches.values();
    }
    folderMatchesIterator() {
        return [].values();
    }
    recursiveMatchCount() {
        return this._fileMatches.size;
    }
    disposeMatches() {
        ;
        [...this._fileMatches.values()].forEach((fileMatch) => fileMatch.dispose());
        [...this._unDisposedFileMatches.values()].forEach((fileMatch) => fileMatch.dispose());
        this._fileMatches.clear();
    }
    dispose() {
        this.disposeMatches();
        this._onDispose.fire();
        super.dispose();
    }
};
AIFolderMatchWorkspaceRootImpl = __decorate([
    __param(5, IInstantiationService),
    __param(6, ILabelService)
], AIFolderMatchWorkspaceRootImpl);
export { AIFolderMatchWorkspaceRootImpl };
let AIFileMatch = class AIFileMatch extends FileMatchImpl {
    constructor(_query, _previewOptions, _maxResults, _parent, rawMatch, _closestRoot, _id, rank, modelService, replaceService, labelService) {
        super({ pattern: _query }, _previewOptions, _maxResults, _parent, rawMatch, _closestRoot, modelService, replaceService, labelService);
        this._id = _id;
        this.rank = rank;
    }
    id() {
        return FILE_MATCH_PREFIX + this._id;
    }
    getFullRange() {
        let earliestStart = undefined;
        let latestEnd = undefined;
        for (const match of this.matches()) {
            const matchStart = match.range().getStartPosition();
            const matchEnd = match.range().getEndPosition();
            if (earliestStart === undefined) {
                earliestStart = matchStart;
            }
            else if (matchStart.isBefore(earliestStart)) {
                earliestStart = matchStart;
            }
            if (latestEnd === undefined) {
                latestEnd = matchEnd;
            }
            else if (!matchEnd.isBefore(latestEnd)) {
                latestEnd = matchEnd;
            }
        }
        if (earliestStart === undefined || latestEnd === undefined) {
            return undefined;
        }
        return new Range(earliestStart.lineNumber, earliestStart.column, latestEnd.lineNumber, latestEnd.column);
    }
    rangeAsString() {
        const range = this.getFullRange();
        if (!range) {
            return undefined;
        }
        return (range.startLineNumber +
            ':' +
            range.startColumn +
            '-' +
            range.endLineNumber +
            ':' +
            range.endColumn);
    }
    name() {
        const range = this.rangeAsString();
        return super.name() + range ? ' ' + range : '';
    }
    createMatches() {
        if (this.rawMatch.results) {
            this.rawMatch.results.filter(resultIsMatch).forEach((rawMatch) => {
                textSearchResultToMatches(rawMatch, this, true).forEach((m) => this.add(m));
            });
        }
    }
};
AIFileMatch = __decorate([
    __param(8, IModelService),
    __param(9, IReplaceService),
    __param(10, ILabelService)
], AIFileMatch);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlTZWFyY2hNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL0FJU2VhcmNoL2FpU2VhcmNoTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFJcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBSU4sYUFBYSxHQUNiLE1BQU0sOENBQThDLENBQUE7QUFFckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUUvQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDL0QsT0FBTyxFQUVOLDBCQUEwQixFQUMxQix3QkFBd0IsRUFReEIsbUJBQW1CLEVBQ25CLGNBQWMsRUFDZCxpQkFBaUIsR0FDakIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFdkUsT0FBTyxFQUFFLFdB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
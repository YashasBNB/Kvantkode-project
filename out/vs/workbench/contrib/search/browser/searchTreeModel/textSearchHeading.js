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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { TernarySearchTree } from '../../../../../base/common/ternarySearchTree.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IReplaceService } from '../replace.js';
import { RangeHighlightDecorations } from './rangeDecorations.js';
import { FolderMatchNoRootImpl, FolderMatchWorkspaceRootImpl } from './folderMatch.js';
import { isSearchTreeFileMatch, isSearchTreeFolderMatch, TEXT_SEARCH_HEADING_PREFIX, PLAIN_TEXT_SEARCH__RESULT_ID, } from './searchTreeCommon.js';
import { isNotebookFileMatch } from '../notebookSearch/notebookSearchModelBase.js';
let TextSearchHeadingImpl = class TextSearchHeadingImpl extends Disposable {
    constructor(_allowOtherResults, _parent, instantiationService, uriIdentityService) {
        super();
        this._allowOtherResults = _allowOtherResults;
        this._parent = _parent;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._isDirty = false;
        this._showHighlights = false;
        this._query = null;
        this.disposePastResults = () => Promise.resolve();
        this._folderMatches = [];
        this._otherFilesMatch = null;
        this._folderMatchesMap = TernarySearchTree.forUris((key) => this.uriIdentityService.extUri.ignorePathCasing(key));
        this.resource = null;
        this.hidden = false;
        this._rangeHighlightDecorations =
            this.instantiationService.createInstance(RangeHighlightDecorations);
        this._register(this.onChange((e) => {
            if (e.removed) {
                this._isDirty = !this.isEmpty();
            }
        }));
    }
    hide() {
        this.hidden = true;
        this.clear();
    }
    parent() {
        return this._parent;
    }
    get hasChildren() {
        return this._folderMatches.length > 0;
    }
    get isDirty() {
        return this._isDirty;
    }
    getFolderMatch(resource) {
        const folderMatch = this._folderMatchesMap.findSubstr(resource);
        if (!folderMatch && this._allowOtherResults && this._otherFilesMatch) {
            return this._otherFilesMatch;
        }
        return folderMatch;
    }
    add(allRaw, searchInstanceID, silent = false) {
        // Split up raw into a list per folder so we can do a batch add per folder.
        const { byFolder, other } = this.groupFilesByFolder(allRaw);
        byFolder.forEach((raw) => {
            if (!raw.length) {
                return;
            }
            // ai results go into the respective folder
            const folderMatch = this.getFolderMatch(raw[0].resource);
            folderMatch?.addFileMatch(raw, silent, searchInstanceID);
        });
        if (!this.isAIContributed) {
            this._otherFilesMatch?.addFileMatch(other, silent, searchInstanceID);
        }
        this.disposePastResults();
    }
    remove(matches, ai = false) {
        if (!Array.isArray(matches)) {
            matches = [matches];
        }
        matches.forEach((m) => {
            if (isSearchTreeFolderMatch(m)) {
                m.clear();
            }
        });
        const fileMatches = matches.filter((m) => isSearchTreeFileMatch(m));
        const { byFolder, other } = this.groupFilesByFolder(fileMatches);
        byFolder.forEach((matches) => {
            if (!matches.length) {
                return;
            }
            this.getFolderMatch(matches[0].resource)?.remove(matches);
        });
        if (other.length) {
            this.getFolderMatch(other[0].resource)?.remove(other);
        }
    }
    groupFilesByFolder(fileMatches) {
        const rawPerFolder = new ResourceMap();
        const otherFileMatches = [];
        this._folderMatches.forEach((fm) => rawPerFolder.set(fm.resource, []));
        fileMatches.forEach((rawFileMatch) => {
            const folderMatch = this.getFolderMatch(rawFileMatch.resource);
            if (!folderMatch) {
                // foldermatch was previously removed by user or disposed for some reason
                return;
            }
            const resource = folderMatch.resource;
            if (resource) {
                rawPerFolder.get(resource).push(rawFileMatch);
            }
            else {
                otherFileMatches.push(rawFileMatch);
            }
        });
        return {
            byFolder: rawPerFolder,
            other: otherFileMatches,
        };
    }
    isEmpty() {
        return this.folderMatches().every((folderMatch) => folderMatch.isEmpty());
    }
    findFolderSubstr(resource) {
        return this._folderMatchesMap.findSubstr(resource);
    }
    clearQuery() {
        // When updating the query we could change the roots, so keep a reference to them to clean up when we trigger `disposePastResults`
        const oldFolderMatches = this.folderMatches();
        this.disposePastResults = async () => {
            oldFolderMatches.forEach((match) => match.clear());
            oldFolderMatches.forEach((match) => match.dispose());
            this._isDirty = false;
        };
        this.cachedSearchComplete = undefined;
        this._rangeHighlightDecorations.removeHighlightRange();
        this._folderMatchesMap = TernarySearchTree.forUris((key) => this.uriIdentityService.extUri.ignorePathCasing(key));
    }
    folderMatches() {
        return this._otherFilesMatch && this._allowOtherResults
            ? [...this._folderMatches, this._otherFilesMatch]
            : this._folderMatches;
    }
    disposeMatches() {
        this.folderMatches().forEach((folderMatch) => folderMatch.dispose());
        this._folderMatches = [];
        this._folderMatchesMap = TernarySearchTree.forUris((key) => this.uriIdentityService.extUri.ignorePathCasing(key));
        this._rangeHighlightDecorations.removeHighlightRange();
    }
    matches() {
        const matches = [];
        this.folderMatches().forEach((folderMatch) => {
            matches.push(folderMatch.allDownstreamFileMatches());
        });
        return [].concat(...matches);
    }
    get showHighlights() {
        return this._showHighlights;
    }
    toggleHighlights(value) {
        if (this._showHighlights === value) {
            return;
        }
        this._showHighlights = value;
        let selectedMatch = null;
        this.matches().forEach((fileMatch) => {
            fileMatch.updateHighlights();
            if (isNotebookFileMatch(fileMatch)) {
                fileMatch.updateNotebookHighlights();
            }
            if (!selectedMatch) {
                selectedMatch = fileMatch.getSelectedMatch();
            }
        });
        if (this._showHighlights && selectedMatch) {
            // TS?
            this._rangeHighlightDecorations.highlightRange(selectedMatch.parent().resource, selectedMatch.range());
        }
        else {
            this._rangeHighlightDecorations.removeHighlightRange();
        }
    }
    get rangeHighlightDecorations() {
        return this._rangeHighlightDecorations;
    }
    fileCount() {
        return this.folderMatches().reduce((prev, match) => prev + match.recursiveFileCount(), 0);
    }
    count() {
        return this.matches().reduce((prev, match) => prev + match.count(), 0);
    }
    clear(clearAll = true) {
        this.cachedSearchComplete = undefined;
        this.folderMatches().forEach((folderMatch) => folderMatch.clear(clearAll));
        this.disposeMatches();
        this._folderMatches = [];
        this._otherFilesMatch = null;
    }
    async dispose() {
        this._rangeHighlightDecorations.dispose();
        this.disposeMatches();
        super.dispose();
        await this.disposePastResults();
    }
};
TextSearchHeadingImpl = __decorate([
    __param(2, IInstantiationService),
    __param(3, IUriIdentityService)
], TextSearchHeadingImpl);
export { TextSearchHeadingImpl };
let PlainTextSearchHeadingImpl = class PlainTextSearchHeadingImpl extends TextSearchHeadingImpl {
    constructor(parent, instantiationService, uriIdentityService, replaceService) {
        super(true, parent, instantiationService, uriIdentityService);
        this.replaceService = replaceService;
    }
    id() {
        return TEXT_SEARCH_HEADING_PREFIX + PLAIN_TEXT_SEARCH__RESULT_ID;
    }
    get isAIContributed() {
        return false;
    }
    replace(match) {
        return this.getFolderMatch(match.resource)?.replace(match) ?? Promise.resolve();
    }
    name() {
        return 'Text';
    }
    replaceAll(progress) {
        this.replacingAll = true;
        const promise = this.replaceService.replace(this.matches(), progress);
        return promise.then(() => {
            this.replacingAll = false;
            this.clear();
        }, () => {
            this.replacingAll = false;
        });
    }
    set replacingAll(running) {
        this.folderMatches().forEach((folderMatch) => {
            folderMatch.replacingAll = running;
        });
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
        this._otherFilesMatch = this._createBaseFolderMatch(null, 'otherFiles', this._folderMatches.length + 1, query);
        this._query = query;
    }
    _createBaseFolderMatch(resource, id, index, query) {
        let folderMatch;
        if (resource) {
            folderMatch = this._register(this.createWorkspaceRootWithResourceImpl(resource, id, index, query));
        }
        else {
            folderMatch = this._register(this.createNoRootWorkspaceImpl(id, index, query));
        }
        const disposable = folderMatch.onChange((event) => this._onChange.fire(event));
        this._register(folderMatch.onDispose(() => disposable.dispose()));
        return folderMatch;
    }
    createWorkspaceRootWithResourceImpl(resource, id, index, query) {
        return this.instantiationService.createInstance(FolderMatchWorkspaceRootImpl, resource, id, index, query, this);
    }
    createNoRootWorkspaceImpl(id, index, query) {
        return this._register(this.instantiationService.createInstance(FolderMatchNoRootImpl, id, index, query, this));
    }
};
PlainTextSearchHeadingImpl = __decorate([
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService),
    __param(3, IReplaceService)
], PlainTextSearchHeadingImpl);
export { PlainTextSearchHeadingImpl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaEhlYWRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hUcmVlTW9kZWwvdGV4dFNlYXJjaEhlYWRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQU8vQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN0RixPQUFPLEVBUU4scUJBQXFCLEVBQ3JCLHVCQUF1QixFQUd2QiwwQkFBMEIsRUFDMUIsNEJBQTRCLEdBRTVCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFM0UsSUFBZSxxQkFBcUIsR0FBcEMsTUFBZSxxQkFDckIsU0FBUSxVQUFVO0lBc0JsQixZQUNTLGtCQUEyQixFQUMzQixPQUFzQixFQUNQLG9CQUE4RCxFQUNoRSxrQkFBd0Q7UUFFN0UsS0FBSyxFQUFFLENBQUE7UUFM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
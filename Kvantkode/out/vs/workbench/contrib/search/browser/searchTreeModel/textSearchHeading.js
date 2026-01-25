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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaEhlYWRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaFRyZWVNb2RlbC90ZXh0U2VhcmNoSGVhZGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBTy9DLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3RGLE9BQU8sRUFRTixxQkFBcUIsRUFDckIsdUJBQXVCLEVBR3ZCLDBCQUEwQixFQUMxQiw0QkFBNEIsR0FFNUIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUUzRSxJQUFlLHFCQUFxQixHQUFwQyxNQUFlLHFCQUNyQixTQUFRLFVBQVU7SUFzQmxCLFlBQ1Msa0JBQTJCLEVBQzNCLE9BQXNCLEVBQ1Asb0JBQThELEVBQ2hFLGtCQUF3RDtRQUU3RSxLQUFLLEVBQUUsQ0FB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
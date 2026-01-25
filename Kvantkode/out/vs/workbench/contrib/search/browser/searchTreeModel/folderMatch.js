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
var FolderMatchImpl_1;
import { Emitter } from '../../../../../base/common/event.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { TernarySearchTree } from '../../../../../base/common/ternarySearchTree.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IReplaceService } from '../replace.js';
import { resultIsMatch, } from '../../../../services/search/common/search.js';
import { isSearchTreeFolderMatchWorkspaceRoot, isSearchTreeFolderMatchNoRoot, FOLDER_MATCH_PREFIX, getFileMatches, } from './searchTreeCommon.js';
import { isINotebookFileMatchNoModel } from '../../common/searchNotebookHelpers.js';
import { NotebookCompatibleFileMatch } from '../notebookSearch/notebookSearchModel.js';
import { isINotebookFileMatchWithModel, getIDFromINotebookCellMatch, } from '../notebookSearch/searchNotebookHelpers.js';
import { isNotebookFileMatch } from '../notebookSearch/notebookSearchModelBase.js';
import { textSearchResultToMatches } from './match.js';
let FolderMatchImpl = FolderMatchImpl_1 = class FolderMatchImpl extends Disposable {
    constructor(_resource, _id, _index, _query, _parent, _searchResult, _closestRoot, replaceService, instantiationService, labelService, uriIdentityService) {
        super();
        this._resource = _resource;
        this._index = _index;
        this._query = _query;
        this._parent = _parent;
        this._searchResult = _searchResult;
        this._closestRoot = _closestRoot;
        this.replaceService = replaceService;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._onDispose = this._register(new Emitter());
        this.onDispose = this._onDispose.event;
        this._replacingAll = false;
        this._fileMatches = new ResourceMap();
        this._folderMatches = new ResourceMap();
        this._folderMatchesMap = TernarySearchTree.forUris((key) => this.uriIdentityService.extUri.ignorePathCasing(key));
        this._unDisposedFileMatches = new ResourceMap();
        this._unDisposedFolderMatches = new ResourceMap();
        this._name = new Lazy(() => this.resource ? labelService.getUriBasenameLabel(this.resource) : '');
        this._id = FOLDER_MATCH_PREFIX + _id;
    }
    get searchModel() {
        return this._searchResult.searchModel;
    }
    get showHighlights() {
        return this._parent.showHighlights;
    }
    get closestRoot() {
        return this._closestRoot;
    }
    set replacingAll(b) {
        this._replacingAll = b;
    }
    id() {
        return this._id;
    }
    get resource() {
        return this._resource;
    }
    index() {
        return this._index;
    }
    name() {
        return this._name.value;
    }
    parent() {
        return this._parent;
    }
    isAIContributed() {
        return false;
    }
    get hasChildren() {
        return this._fileMatches.size > 0 || this._folderMatches.size > 0;
    }
    bindModel(model) {
        const fileMatch = this._fileMatches.get(model.uri);
        if (fileMatch) {
            fileMatch.bindModel(model);
        }
        else {
            const folderMatch = this.getFolderMatch(model.uri);
            const match = folderMatch?.getDownstreamFileMatch(model.uri);
            match?.bindModel(model);
        }
    }
    createIntermediateFolderMatch(resource, id, index, query, baseWorkspaceFolder) {
        const folderMatch = this._register(this.instantiationService.createInstance(FolderMatchWithResourceImpl, resource, id, index, query, this, this._searchResult, baseWorkspaceFolder));
        this.configureIntermediateMatch(folderMatch);
        this.doAddFolder(folderMatch);
        return folderMatch;
    }
    configureIntermediateMatch(folderMatch) {
        const disposable = folderMatch.onChange((event) => this.onFolderChange(folderMatch, event));
        this._register(folderMatch.onDispose(() => disposable.dispose()));
    }
    clear(clearingAll = false) {
        const changed = this.allDownstreamFileMatches();
        this.disposeMatches();
        this._onChange.fire({ elements: changed, removed: true, added: false, clearingAll });
    }
    remove(matches) {
        if (!Array.isArray(matches)) {
            matches = [matches];
        }
        const allMatches = getFileMatches(matches);
        this.doRemoveFile(allMatches);
    }
    async replace(match) {
        return this.replaceService.replace([match]).then(() => {
            this.doRemoveFile([match], true, true, true);
        });
    }
    replaceAll() {
        const matches = this.matches();
        return this.batchReplace(matches);
    }
    matches() {
        return [...this.fileMatchesIterator(), ...this.folderMatchesIterator()];
    }
    fileMatchesIterator() {
        return this._fileMatches.values();
    }
    folderMatchesIterator() {
        return this._folderMatches.values();
    }
    isEmpty() {
        return this.fileCount() + this.folderCount() === 0;
    }
    getDownstreamFileMatch(uri) {
        const directChildFileMatch = this._fileMatches.get(uri);
        if (directChildFileMatch) {
            return directChildFileMatch;
        }
        const folderMatch = this.getFolderMatch(uri);
        const match = folderMatch?.getDownstreamFileMatch(uri);
        if (match) {
            return match;
        }
        return null;
    }
    allDownstreamFileMatches() {
        let recursiveChildren = [];
        const iterator = this.folderMatchesIterator();
        for (const elem of iterator) {
            recursiveChildren = recursiveChildren.concat(elem.allDownstreamFileMatches());
        }
        return [...this.fileMatchesIterator(), ...recursiveChildren];
    }
    fileCount() {
        return this._fileMatches.size;
    }
    folderCount() {
        return this._folderMatches.size;
    }
    count() {
        return this.fileCount() + this.folderCount();
    }
    recursiveFileCount() {
        return this.allDownstreamFileMatches().length;
    }
    recursiveMatchCount() {
        return this.allDownstreamFileMatches().reduce((prev, match) => prev + match.count(), 0);
    }
    get query() {
        return this._query;
    }
    doAddFile(fileMatch) {
        this._fileMatches.set(fileMatch.resource, fileMatch);
        if (this._unDisposedFileMatches.has(fileMatch.resource)) {
            this._unDisposedFileMatches.delete(fileMatch.resource);
        }
    }
    hasOnlyReadOnlyMatches() {
        return Array.from(this._fileMatches.values()).every((fm) => fm.hasOnlyReadOnlyMatches());
    }
    uriHasParent(parent, child) {
        return (this.uriIdentityService.extUri.isEqualOrParent(child, parent) &&
            !this.uriIdentityService.extUri.isEqual(child, parent));
    }
    isInParentChain(folderMatch) {
        let matchItem = this;
        while (matchItem instanceof FolderMatchImpl_1) {
            if (matchItem.id() === folderMatch.id()) {
                return true;
            }
            matchItem = matchItem.parent();
        }
        return false;
    }
    getFolderMatch(resource) {
        const folderMatch = this._folderMatchesMap.findSubstr(resource);
        return folderMatch;
    }
    doAddFolder(folderMatch) {
        if (this.resource && !this.uriHasParent(this.resource, folderMatch.resource)) {
            throw Error(`${folderMatch.resource} does not belong as a child of ${this.resource}`);
        }
        else if (this.isInParentChain(folderMatch)) {
            throw Error(`${folderMatch.resource} is a parent of ${this.resource}`);
        }
        this._folderMatches.set(folderMatch.resource, folderMatch);
        this._folderMatchesMap.set(folderMatch.resource, folderMatch);
        if (this._unDisposedFolderMatches.has(folderMatch.resource)) {
            this._unDisposedFolderMatches.delete(folderMatch.resource);
        }
    }
    async batchReplace(matches) {
        const allMatches = getFileMatches(matches);
        await this.replaceService.replace(allMatches);
        this.doRemoveFile(allMatches, true, true, true);
    }
    onFileChange(fileMatch, removed = false) {
        let added = false;
        if (!this._fileMatches.has(fileMatch.resource)) {
            this.doAddFile(fileMatch);
            added = true;
        }
        if (fileMatch.count() === 0) {
            this.doRemoveFile([fileMatch], false, false);
            added = false;
            removed = true;
        }
        if (!this._replacingAll) {
            this._onChange.fire({ elements: [fileMatch], added: added, removed: removed });
        }
    }
    onFolderChange(folderMatch, event) {
        if (!this._folderMatches.has(folderMatch.resource)) {
            this.doAddFolder(folderMatch);
        }
        if (folderMatch.isEmpty()) {
            this._folderMatches.delete(folderMatch.resource);
            folderMatch.dispose();
        }
        this._onChange.fire(event);
    }
    doRemoveFile(fileMatches, dispose = true, trigger = true, keepReadonly = false) {
        const removed = [];
        for (const match of fileMatches) {
            if (this._fileMatches.get(match.resource)) {
                if (keepReadonly && match.hasReadonlyMatches()) {
                    continue;
                }
                this._fileMatches.delete(match.resource);
                if (dispose) {
                    match.dispose();
                }
                else {
                    this._unDisposedFileMatches.set(match.resource, match);
                }
                removed.push(match);
            }
            else {
                const folder = this.getFolderMatch(match.resource);
                if (folder) {
                    folder.doRemoveFile([match], dispose, trigger);
                }
                else {
                    throw Error(`FileMatch ${match.resource} is not located within FolderMatch ${this.resource}`);
                }
            }
        }
        if (trigger) {
            this._onChange.fire({ elements: removed, removed: true });
        }
    }
    async bindNotebookEditorWidget(editor, resource) {
        const fileMatch = this._fileMatches.get(resource);
        if (isNotebookFileMatch(fileMatch)) {
            if (fileMatch) {
                fileMatch.bindNotebookEditorWidget(editor);
                await fileMatch.updateMatchesForEditorWidget();
            }
            else {
                const folderMatches = this.folderMatchesIterator();
                for (const elem of folderMatches) {
                    await elem.bindNotebookEditorWidget(editor, resource);
                }
            }
        }
    }
    addFileMatch(raw, silent, searchInstanceID) {
        // when adding a fileMatch that has intermediate directories
        const added = [];
        const updated = [];
        raw.forEach((rawFileMatch) => {
            const existingFileMatch = this.getDownstreamFileMatch(rawFileMatch.resource);
            if (existingFileMatch) {
                if (rawFileMatch.results) {
                    rawFileMatch.results.filter(resultIsMatch).forEach((m) => {
                        textSearchResultToMatches(m, existingFileMatch, false).forEach((m) => existingFileMatch.add(m));
                    });
                }
                // add cell matches
                if (isINotebookFileMatchWithModel(rawFileMatch) ||
                    isINotebookFileMatchNoModel(rawFileMatch)) {
                    rawFileMatch.cellResults?.forEach((rawCellMatch) => {
                        if (isNotebookFileMatch(existingFileMatch)) {
                            const existingCellMatch = existingFileMatch.getCellMatch(getIDFromINotebookCellMatch(rawCellMatch));
                            if (existingCellMatch) {
                                existingCellMatch.addContentMatches(rawCellMatch.contentResults);
                                existingCellMatch.addWebviewMatches(rawCellMatch.webviewResults);
                            }
                            else {
                                existingFileMatch.addCellMatch(rawCellMatch);
                            }
                        }
                    });
                }
                updated.push(existingFileMatch);
                if (rawFileMatch.results && rawFileMatch.results.length > 0) {
                    existingFileMatch.addContext(rawFileMatch.results);
                }
            }
            else {
                if (isSearchTreeFolderMatchWorkspaceRoot(this) || isSearchTreeFolderMatchNoRoot(this)) {
                    const fileMatch = this.createAndConfigureFileMatch(rawFileMatch, searchInstanceID);
                    added.push(fileMatch);
                }
            }
        });
        const elements = [...added, ...updated];
        if (!silent && elements.length) {
            this._onChange.fire({ elements, added: !!added.length });
        }
    }
    unbindNotebookEditorWidget(editor, resource) {
        const fileMatch = this._fileMatches.get(resource);
        if (isNotebookFileMatch(fileMatch)) {
            if (fileMatch) {
                fileMatch.unbindNotebookEditorWidget(editor);
            }
            else {
                const folderMatches = this.folderMatchesIterator();
                for (const elem of folderMatches) {
                    elem.unbindNotebookEditorWidget(editor, resource);
                }
            }
        }
    }
    disposeMatches() {
        ;
        [...this._fileMatches.values()].forEach((fileMatch) => fileMatch.dispose());
        [...this._folderMatches.values()].forEach((folderMatch) => folderMatch.disposeMatches());
        [...this._unDisposedFileMatches.values()].forEach((fileMatch) => fileMatch.dispose());
        [...this._unDisposedFolderMatches.values()].forEach((folderMatch) => folderMatch.disposeMatches());
        this._fileMatches.clear();
        this._folderMatches.clear();
        this._unDisposedFileMatches.clear();
        this._unDisposedFolderMatches.clear();
    }
    dispose() {
        this.disposeMatches();
        this._onDispose.fire();
        super.dispose();
    }
};
FolderMatchImpl = FolderMatchImpl_1 = __decorate([
    __param(7, IReplaceService),
    __param(8, IInstantiationService),
    __param(9, ILabelService),
    __param(10, IUriIdentityService)
], FolderMatchImpl);
export { FolderMatchImpl };
let FolderMatchWithResourceImpl = class FolderMatchWithResourceImpl extends FolderMatchImpl {
    constructor(_resource, _id, _index, _query, _parent, _searchResult, _closestRoot, replaceService, instantiationService, labelService, uriIdentityService) {
        super(_resource, _id, _index, _query, _parent, _searchResult, _closestRoot, replaceService, instantiationService, labelService, uriIdentityService);
        this._normalizedResource = new Lazy(() => this.uriIdentityService.extUri.removeTrailingPathSeparator(this.uriIdentityService.extUri.normalizePath(this.resource)));
    }
    get resource() {
        return this._resource;
    }
    get normalizedResource() {
        return this._normalizedResource.value;
    }
};
FolderMatchWithResourceImpl = __decorate([
    __param(7, IReplaceService),
    __param(8, IInstantiationService),
    __param(9, ILabelService),
    __param(10, IUriIdentityService)
], FolderMatchWithResourceImpl);
export { FolderMatchWithResourceImpl };
/**
 * FolderMatchWorkspaceRoot => folder for workspace root
 */
let FolderMatchWorkspaceRootImpl = class FolderMatchWorkspaceRootImpl extends FolderMatchWithResourceImpl {
    constructor(_resource, _id, _index, _query, _parent, replaceService, instantiationService, labelService, uriIdentityService) {
        super(_resource, _id, _index, _query, _parent, _parent.parent(), null, replaceService, instantiationService, labelService, uriIdentityService);
    }
    normalizedUriParent(uri) {
        return this.uriIdentityService.extUri.normalizePath(this.uriIdentityService.extUri.dirname(uri));
    }
    uriEquals(uri1, ur2) {
        return this.uriIdentityService.extUri.isEqual(uri1, ur2);
    }
    createFileMatch(query, previewOptions, maxResults, parent, rawFileMatch, closestRoot, searchInstanceID) {
        // TODO: can probably just create FileMatchImpl if we don't expect cell results from the file.
        const fileMatch = this.instantiationService.createInstance(NotebookCompatibleFileMatch, query, previewOptions, maxResults, parent, rawFileMatch, closestRoot, searchInstanceID);
        fileMatch.createMatches();
        parent.doAddFile(fileMatch);
        const disposable = fileMatch.onChange(({ didRemove }) => parent.onFileChange(fileMatch, didRemove));
        this._register(fileMatch.onDispose(() => disposable.dispose()));
        return fileMatch;
    }
    createAndConfigureFileMatch(rawFileMatch, searchInstanceID) {
        if (!this.uriHasParent(this.resource, rawFileMatch.resource)) {
            throw Error(`${rawFileMatch.resource} is not a descendant of ${this.resource}`);
        }
        const fileMatchParentParts = [];
        let uri = this.normalizedUriParent(rawFileMatch.resource);
        while (!this.uriEquals(this.normalizedResource, uri)) {
            fileMatchParentParts.unshift(uri);
            const prevUri = uri;
            uri = this.uriIdentityService.extUri.removeTrailingPathSeparator(this.normalizedUriParent(uri));
            if (this.uriEquals(prevUri, uri)) {
                throw Error(`${rawFileMatch.resource} is not correctly configured as a child of ${this.normalizedResource}`);
            }
        }
        const root = this.closestRoot ?? this;
        let parent = this;
        for (let i = 0; i < fileMatchParentParts.length; i++) {
            let folderMatch = parent.getFolderMatch(fileMatchParentParts[i]);
            if (!folderMatch) {
                folderMatch = parent.createIntermediateFolderMatch(fileMatchParentParts[i], fileMatchParentParts[i].toString(), -1, this._query, root);
            }
            parent = folderMatch;
        }
        const contentPatternToUse = typeof this._query.contentPattern === 'string'
            ? { pattern: this._query.contentPattern }
            : this._query.contentPattern;
        return this.createFileMatch(contentPatternToUse, this._query.previewOptions, this._query.maxResults, parent, rawFileMatch, root, searchInstanceID);
    }
};
FolderMatchWorkspaceRootImpl = __decorate([
    __param(5, IReplaceService),
    __param(6, IInstantiationService),
    __param(7, ILabelService),
    __param(8, IUriIdentityService)
], FolderMatchWorkspaceRootImpl);
export { FolderMatchWorkspaceRootImpl };
// currently, no support for AI results in out-of-workspace files
let FolderMatchNoRootImpl = class FolderMatchNoRootImpl extends FolderMatchImpl {
    constructor(_id, _index, _query, _parent, replaceService, instantiationService, labelService, uriIdentityService) {
        super(null, _id, _index, _query, _parent, _parent.parent(), null, replaceService, instantiationService, labelService, uriIdentityService);
    }
    createAndConfigureFileMatch(rawFileMatch, searchInstanceID) {
        const contentPatternToUse = typeof this._query.contentPattern === 'string'
            ? { pattern: this._query.contentPattern }
            : this._query.contentPattern;
        // TODO: can probably just create FileMatchImpl if we don't expect cell results from the file.
        const fileMatch = this._register(this.instantiationService.createInstance(NotebookCompatibleFileMatch, contentPatternToUse, this._query.previewOptions, this._query.maxResults, this, rawFileMatch, null, searchInstanceID));
        fileMatch.createMatches();
        this.doAddFile(fileMatch);
        const disposable = fileMatch.onChange(({ didRemove }) => this.onFileChange(fileMatch, didRemove));
        this._register(fileMatch.onDispose(() => disposable.dispose()));
        return fileMatch;
    }
};
FolderMatchNoRootImpl = __decorate([
    __param(4, IReplaceService),
    __param(5, IInstantiationService),
    __param(6, ILabelService),
    __param(7, IUriIdentityService)
], FolderMatchNoRootImpl);
export { FolderMatchNoRootImpl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGVyTWF0Y2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaFRyZWVNb2RlbC9mb2xkZXJNYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBR25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQy9DLE9BQU8sRUFLTixhQUFhLEdBQ2IsTUFBTSw4Q0FBOEMsQ0FBQTtBQUdyRCxPQUFPLEVBU04sb0NBQW9DLEVBRXBDLDZCQUE2QixFQUM3QixtQkFBbUIsRUFDbkIsY0FBYyxHQUNkLE1BQU0sdUJBQXVCLENBQUE7QUFFOUIsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdEYsT0FBTyxFQUNOLDZCQUE2QixFQUM3QiwyQkFBMkIsR0FDM0IsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNu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
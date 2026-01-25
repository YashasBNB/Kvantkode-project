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
var FilesRenderer_1, FileDragAndDrop_1;
import * as DOM from '../../../../../base/browser/dom.js';
import * as glob from '../../../../../base/common/glob.js';
import { IProgressService, } from '../../../../../platform/progress/common/progress.js';
import { INotificationService, Severity, } from '../../../../../platform/notification/common/notification.js';
import { IFileService, FileKind, } from '../../../../../platform/files/common/files.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { isTemporaryWorkspace, IWorkspaceContextService, } from '../../../../../platform/workspace/common/workspace.js';
import { Disposable, dispose, toDisposable, DisposableStore, } from '../../../../../base/common/lifecycle.js';
import { IContextMenuService, IContextViewService, } from '../../../../../platform/contextview/browser/contextView.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { ExplorerFindProviderActive, } from '../../common/files.js';
import { dirname, joinPath, distinctParents, relativePath, } from '../../../../../base/common/resources.js';
import { InputBox } from '../../../../../base/browser/ui/inputbox/inputBox.js';
import { localize } from '../../../../../nls.js';
import { createSingleCallFunction } from '../../../../../base/common/functional.js';
import { equals, deepClone } from '../../../../../base/common/objects.js';
import * as path from '../../../../../base/common/path.js';
import { ExplorerItem, NewExplorerItem } from '../../common/explorerModel.js';
import { compareFileExtensionsDefault, compareFileNamesDefault, compareFileNamesUpper, compareFileExtensionsUpper, compareFileNamesLower, compareFileExtensionsLower, compareFileNamesUnicode, compareFileExtensionsUnicode, } from '../../../../../base/common/comparers.js';
import { CodeDataTransfers, containsDragType } from '../../../../../platform/dnd/browser/dnd.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { DataTransfers } from '../../../../../base/browser/dnd.js';
import { Schemas } from '../../../../../base/common/network.js';
import { NativeDragAndDropData, ExternalElementsDragAndDropData, } from '../../../../../base/browser/ui/list/listView.js';
import { isMacintosh, isWeb } from '../../../../../base/common/platform.js';
import { IDialogService, getFileNamesMessage, } from '../../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceEditingService } from '../../../../services/workspaces/common/workspaceEditing.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { findValidPasteFileTarget } from '../fileActions.js';
import { createMatches } from '../../../../../base/common/filters.js';
import { Emitter, Event, EventMultiplexer } from '../../../../../base/common/event.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { isNumber } from '../../../../../base/common/types.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { ResourceFileEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { IExplorerService } from '../files.js';
import { BrowserFileUpload, ExternalFileImport, getMultipleFilesOverwriteConfirm, } from '../fileImportExport.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { WebFileSystemAccess } from '../../../../../platform/files/browser/webFileSystemAccess.js';
import { IgnoreFile } from '../../../../services/search/common/ignoreFile.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { TernarySearchTree } from '../../../../../base/common/ternarySearchTree.js';
import { defaultCountBadgeStyles, defaultInputBoxStyles, } from '../../../../../platform/theme/browser/defaultStyles.js';
import { timeout } from '../../../../../base/common/async.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { explorerFileContribRegistry } from '../explorerFileContrib.js';
import { ISearchService, getExcludes, } from '../../../../services/search/common/search.js';
import { TreeFindMatchType, TreeFindMode, } from '../../../../../base/browser/ui/tree/abstractTree.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { CountBadge } from '../../../../../base/browser/ui/countBadge/countBadge.js';
import { listFilterMatchHighlight, listFilterMatchHighlightBorder, } from '../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../platform/theme/common/colorUtils.js';
export class ExplorerDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(element) {
        return ExplorerDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        return FilesRenderer.ID;
    }
}
export const explorerRootErrorEmitter = new Emitter();
let ExplorerDataSource = class ExplorerDataSource {
    constructor(fileFilter, findProvider, progressService, configService, notificationService, layoutService, fileService, explorerService, contextService, filesConfigService) {
        this.fileFilter = fileFilter;
        this.findProvider = findProvider;
        this.progressService = progressService;
        this.configService = configService;
        this.notificationService = notificationService;
        this.layoutService = layoutService;
        this.fileService = fileService;
        this.explorerService = explorerService;
        this.contextService = contextService;
        this.filesConfigService = filesConfigService;
    }
    getParent(element) {
        if (element.parent) {
            return element.parent;
        }
        throw new Error('getParent only supported for cached parents');
    }
    hasChildren(element) {
        // don't render nest parents as containing children when all the children are filtered out
        return (Array.isArray(element) ||
            element.hasChildren((stat) => this.fileFilter.filter(stat, 1 /* TreeVisibility.Visible */)));
    }
    getChildren(element) {
        if (Array.isArray(element)) {
            return element;
        }
        if (this.findProvider.isShowingFilterResults()) {
            return Array.from(element.children.values());
        }
        const hasError = element.error;
        const sortOrder = this.explorerService.sortOrderConfiguration.sortOrder;
        const children = element.fetchChildren(sortOrder);
        if (Array.isArray(children)) {
            // fast path when children are known sync (i.e. nested children)
            return children;
        }
        const promise = children.then((children) => {
            // Clear previous error decoration on root folder
            if (element instanceof ExplorerItem &&
                element.isRoot &&
                !element.error &&
                hasError &&
                this.contextService.getWorkbenchState() !== 2 /* WorkbenchState.FOLDER */) {
                explorerRootErrorEmitter.fire(element.resource);
            }
            return children;
        }, (e) => {
            if (element instanceof ExplorerItem && element.isRoot) {
                if (this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                    // Single folder create a dummy explorer item to show error
                    const placeholder = new ExplorerItem(element.resource, this.fileService, this.configService, this.filesConfigService, undefined, undefined, false);
                    placeholder.error = e;
                    return [placeholder];
                }
                else {
                    explorerRootErrorEmitter.fire(element.resource);
                }
            }
            else {
                // Do not show error for roots since we already use an explorer decoration to notify user
                this.notificationService.error(e);
            }
            return []; // we could not resolve any children because of an error
        });
        this.progressService.withProgress({
            location: 1 /* ProgressLocation.Explorer */,
            delay: this.layoutService.isRestored() ? 800 : 1500, // reduce progress visibility when still restoring
        }, (_progress) => promise);
        return promise;
    }
};
ExplorerDataSource = __decorate([
    __param(2, IProgressService),
    __param(3, IConfigurationService),
    __param(4, INotificationService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IFileService),
    __param(7, IExplorerService),
    __param(8, IWorkspaceContextService),
    __param(9, IFilesConfigurationService)
], ExplorerDataSource);
export { ExplorerDataSource };
export class PhantomExplorerItem extends ExplorerItem {
    constructor(resource, fileService, configService, filesConfigService, _parent, _isDirectory) {
        super(resource, fileService, configService, filesConfigService, _parent, _isDirectory);
    }
}
class ExplorerFindHighlightTree {
    constructor() {
        this._tree = new Map();
        this._highlightedItems = new Map();
    }
    get highlightedItems() {
        return Array.from(this._highlightedItems.values());
    }
    get(item) {
        const result = this.find(item);
        if (result === undefined) {
            return 0;
        }
        const { treeLayer, relPath } = result;
        this._highlightedItems.set(relPath, item);
        return treeLayer.childMatches;
    }
    find(item) {
        const rootLayer = this._tree.get(item.root.name);
        if (rootLayer === undefined) {
            return undefined;
        }
        const relPath = relativePath(item.root.resource, item.resource);
        if (relPath === undefined || relPath.startsWith('..')) {
            throw new Error('Resource is not a child of the root');
        }
        if (relPath === '') {
            return { treeLayer: rootLayer, relPath };
        }
        let treeLayer = rootLayer;
        for (const segment of relPath.split('/')) {
            if (!treeLayer.stats[segment]) {
                return undefined;
            }
            treeLayer = treeLayer.stats[segment];
        }
        return { treeLayer, relPath };
    }
    add(resource, root) {
        const relPath = relativePath(root.resource, resource);
        if (relPath === undefined || relPath.startsWith('..')) {
            throw new Error('Resource is not a child of the root');
        }
        let rootLayer = this._tree.get(root.name);
        if (!rootLayer) {
            rootLayer = { childMatches: 0, stats: {}, isMatch: false };
            this._tree.set(root.name, rootLayer);
        }
        rootLayer.childMatches++;
        let treeLayer = rootLayer;
        for (const stat of relPath.split('/')) {
            if (!treeLayer.stats[stat]) {
                treeLayer.stats[stat] = { childMatches: 0, stats: {}, isMatch: false };
            }
            treeLayer = treeLayer.stats[stat];
            treeLayer.childMatches++;
        }
        treeLayer.childMatches--; // the last segment is the file itself
        treeLayer.isMatch = true;
    }
    isMatch(item) {
        const result = this.find(item);
        if (result === undefined) {
            return false;
        }
        const { treeLayer } = result;
        return treeLayer.isMatch;
    }
    clear() {
        this._tree.clear();
    }
}
let ExplorerFindProvider = class ExplorerFindProvider {
    get highlightTree() {
        return this.findHighlightTree;
    }
    constructor(filesFilter, treeProvider, searchService, fileService, configurationService, filesConfigService, progressService, explorerService, contextKeyService) {
        this.filesFilter = filesFilter;
        this.treeProvider = treeProvider;
        this.searchService = searchService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.filesConfigService = filesConfigService;
        this.progressService = progressService;
        this.explorerService = explorerService;
        this.sessionId = 0;
        this.phantomParents = new Set();
        this.findHighlightTree = new ExplorerFindHighlightTree();
        this.explorerFindActiveContextKey = ExplorerFindProviderActive.bindTo(contextKeyService);
    }
    isShowingFilterResults() {
        return !!this.filterSessionStartState;
    }
    isVisible(element) {
        if (!this.filterSessionStartState) {
            return true;
        }
        if (this.explorerService.isEditable(element)) {
            return true;
        }
        return this.filterSessionStartState.rootsWithProviders.has(element.root)
            ? element.isMarkedAsFiltered()
            : true;
    }
    startSession() {
        this.sessionId++;
    }
    async endSession() {
        // Restore view state
        if (this.filterSessionStartState) {
            await this.endFilterSession();
        }
        if (this.highlightSessionStartState) {
            this.endHighlightSession();
        }
    }
    async find(pattern, toggles, token) {
        const promise = this.doFind(pattern, toggles, token);
        return await this.progressService.withProgress({
            location: 1 /* ProgressLocation.Explorer */,
            delay: 750,
        }, (_progress) => promise);
    }
    async doFind(pattern, toggles, token) {
        if (toggles.findMode === TreeFindMode.Highlight) {
            if (this.filterSessionStartState) {
                await this.endFilterSession();
            }
            if (!this.highlightSessionStartState) {
                this.startHighlightSession();
            }
            return await this.doHighlightFind(pattern, toggles.matchType, token);
        }
        if (this.highlightSessionStartState) {
            this.endHighlightSession();
        }
        if (!this.filterSessionStartState) {
            this.startFilterSession();
        }
        return await this.doFilterFind(pattern, toggles.matchType, token);
    }
    // Filter
    startFilterSession() {
        const tree = this.treeProvider();
        const input = tree.getInput();
        if (!input) {
            return;
        }
        const roots = this.explorerService.roots.filter((root) => this.searchSupportsScheme(root.resource.scheme));
        this.filterSessionStartState = {
            viewState: tree.getViewState(),
            input,
            rootsWithProviders: new Set(roots),
        };
        this.explorerFindActiveContextKey.set(true);
    }
    async doFilterFind(pattern, matchType, token) {
        if (!this.filterSessionStartState) {
            throw new Error('ExplorerFindProvider: no session state');
        }
        const roots = Array.from(this.filterSessionStartState.rootsWithProviders);
        const searchResults = await this.getSearchResults(pattern, roots, matchType, token);
        if (token.isCancellationRequested) {
            return undefined;
        }
        this.clearPhantomElements();
        for (const { explorerRoot, files, directories } of searchResults) {
            this.addWorkspaceFilterResults(explorerRoot, files, directories);
        }
        const tree = this.treeProvider();
        await tree.setInput(this.filterSessionStartState.input);
        const hitMaxResults = searchResults.some(({ hitMaxResults }) => hitMaxResults);
        return {
            isMatch: (item) => item.isMarkedAsFiltered(),
            matchCount: searchResults.reduce((acc, { files, directories }) => acc + files.length + directories.length, 0),
            warningMessage: hitMaxResults
                ? localize('searchMaxResultsWarning', 'The result set only contains a subset of all matches. Be more specific in your search to narrow down the results.')
                : undefined,
        };
    }
    addWorkspaceFilterResults(root, files, directories) {
        const results = [
            ...files.map((file) => ({ resource: file, isDirectory: false })),
            ...directories.map((directory) => ({ resource: directory, isDirectory: true })),
        ];
        for (const { resource, isDirectory } of results) {
            const element = root.find(resource);
            if (element && element.root === root) {
                // File is already in the model
                element.markItemAndParentsAsFiltered();
                continue;
            }
            // File is not in the model, create phantom items for the file and it's parents
            const phantomElements = this.createPhantomItems(resource, root, isDirectory);
            if (phantomElements.length === 0) {
                throw new Error('Phantom item was not created even though it is not in the model');
            }
            // Store the first ancestor of the file which is already present in the model
            const firstPhantomParent = phantomElements[0].parent;
            if (!(firstPhantomParent instanceof PhantomExplorerItem)) {
                this.phantomParents.add(firstPhantomParent);
            }
            const phantomFileElement = phantomElements[phantomElements.length - 1];
            phantomFileElement.markItemAndParentsAsFiltered();
        }
    }
    createPhantomItems(resource, root, resourceIsDirectory) {
        const relativePathToRoot = relativePath(root.resource, resource);
        if (!relativePathToRoot) {
            throw new Error('Resource is not a child of the root');
        }
        const phantomElements = [];
        let currentItem = root;
        let currentResource = root.resource;
        const pathSegments = relativePathToRoot.split('/');
        for (const stat of pathSegments) {
            currentResource = currentResource.with({ path: `${currentResource.path}/${stat}` });
            let child = currentItem.getChild(stat);
            if (!child) {
                const isDirectory = pathSegments[pathSegments.length - 1] === stat ? resourceIsDirectory : true;
                child = new PhantomExplorerItem(currentResource, this.fileService, this.configurationService, this.filesConfigService, currentItem, isDirectory);
                currentItem.addChild(child);
                phantomElements.push(child);
            }
            currentItem = child;
        }
        return phantomElements;
    }
    async endFilterSession() {
        this.clearPhantomElements();
        this.explorerFindActiveContextKey.set(false);
        // Restore view state
        if (!this.filterSessionStartState) {
            throw new Error('ExplorerFindProvider: no session state to restore');
        }
        const tree = this.treeProvider();
        await tree.setInput(this.filterSessionStartState.input, this.filterSessionStartState.viewState);
        this.filterSessionStartState = undefined;
        this.explorerService.refresh();
    }
    clearPhantomElements() {
        for (const phantomParent of this.phantomParents) {
            // Clear phantom nodes from model
            phantomParent.forgetChildren();
        }
        this.phantomParents.clear();
        this.explorerService.roots.forEach((root) => root.unmarkItemAndChildren());
    }
    // Highlight
    startHighlightSession() {
        const roots = this.explorerService.roots.filter((root) => this.searchSupportsScheme(root.resource.scheme));
        this.highlightSessionStartState = { rootsWithProviders: new Set(roots) };
    }
    async doHighlightFind(pattern, matchType, token) {
        if (!this.highlightSessionStartState) {
            throw new Error('ExplorerFindProvider: no highlight session state');
        }
        const roots = Array.from(this.highlightSessionStartState.rootsWithProviders);
        const searchResults = await this.getSearchResults(pattern, roots, matchType, token);
        if (token.isCancellationRequested) {
            return undefined;
        }
        this.clearHighlights();
        for (const { explorerRoot, files, directories } of searchResults) {
            this.addWorkspaceHighlightResults(explorerRoot, files.concat(directories));
        }
        const hitMaxResults = searchResults.some(({ hitMaxResults }) => hitMaxResults);
        return {
            isMatch: (item) => this.findHighlightTree.isMatch(item) ||
                (this.findHighlightTree.get(item) > 0 && this.treeProvider().isCollapsed(item)),
            matchCount: searchResults.reduce((acc, { files, directories }) => acc + files.length + directories.length, 0),
            warningMessage: hitMaxResults
                ? localize('searchMaxResultsWarning', 'The result set only contains a subset of all matches. Be more specific in your search to narrow down the results.')
                : undefined,
        };
    }
    addWorkspaceHighlightResults(root, resources) {
        const highlightedDirectories = new Set();
        const storeDirectories = (item) => {
            while (item) {
                highlightedDirectories.add(item);
                item = item.parent;
            }
        };
        for (const resource of resources) {
            const element = root.find(resource);
            if (element && element.root === root) {
                // File is already in the model
                this.findHighlightTree.add(resource, root);
                storeDirectories(element.parent);
                continue;
            }
            const firstParent = findFirstParent(resource, root);
            if (firstParent) {
                this.findHighlightTree.add(resource, root);
                storeDirectories(firstParent.parent);
            }
        }
        const tree = this.treeProvider();
        for (const directory of highlightedDirectories) {
            if (tree.hasNode(directory)) {
                tree.rerender(directory);
            }
        }
    }
    endHighlightSession() {
        this.highlightSessionStartState = undefined;
        this.clearHighlights();
    }
    clearHighlights() {
        const tree = this.treeProvider();
        for (const item of this.findHighlightTree.highlightedItems) {
            if (tree.hasNode(item)) {
                tree.rerender(item);
            }
        }
        this.findHighlightTree.clear();
    }
    // Search
    searchSupportsScheme(scheme) {
        // Limited by the search API
        if (scheme !== Schemas.file && scheme !== Schemas.vscodeRemote) {
            return false;
        }
        return this.searchService.schemeHasFileSearchProvider(scheme);
    }
    async getSearchResults(pattern, roots, matchType, token) {
        const patternLowercase = pattern.toLowerCase();
        const isFuzzyMatch = matchType === TreeFindMatchType.Fuzzy;
        return await Promise.all(roots.map((root, index) => this.searchInWorkspace(patternLowercase, root, index, isFuzzyMatch, token)));
    }
    async searchInWorkspace(patternLowercase, root, rootIndex, isFuzzyMatch, token) {
        const segmentMatchPattern = caseInsensitiveGlobPattern(isFuzzyMatch
            ? fuzzyMatchingGlobPattern(patternLowercase)
            : continousMatchingGlobPattern(patternLowercase));
        const searchExcludePattern = getExcludes(this.configurationService.getValue({ resource: root.resource })) || {};
        const searchOptions = {
            folderQueries: [
                {
                    folder: root.resource,
                    disregardIgnoreFiles: !this.configurationService.getValue('explorer.excludeGitIgnore'),
                },
            ],
            type: 1 /* QueryType.File */,
            shouldGlobMatchFilePattern: true,
            cacheKey: `explorerfindprovider:${root.name}:${rootIndex}:${this.sessionId}`,
            excludePattern: searchExcludePattern,
        };
        let fileResults;
        let folderResults;
        try {
            ;
            [fileResults, folderResults] = await Promise.all([
                this.searchService.fileSearch({ ...searchOptions, filePattern: `**/${segmentMatchPattern}`, maxResults: 512 }, token),
                this.searchService.fileSearch({ ...searchOptions, filePattern: `**/${segmentMatchPattern}/**` }, token),
            ]);
        }
        catch (e) {
            if (!isCancellationError(e)) {
                throw e;
            }
        }
        if (!fileResults || !folderResults || token.isCancellationRequested) {
            return { explorerRoot: root, files: [], directories: [], hitMaxResults: false };
        }
        const fileResultResources = fileResults.results.map((result) => result.resource);
        const directoryResources = getMatchingDirectoriesFromFiles(folderResults.results.map((result) => result.resource), root, segmentMatchPattern);
        const filteredFileResources = fileResultResources.filter((resource) => !this.filesFilter.isIgnored(resource, root.resource, false));
        const filteredDirectoryResources = directoryResources.filter((resource) => !this.filesFilter.isIgnored(resource, root.resource, true));
        return {
            explorerRoot: root,
            files: filteredFileResources,
            directories: filteredDirectoryResources,
            hitMaxResults: !!fileResults.limitHit || !!folderResults.limitHit,
        };
    }
};
ExplorerFindProvider = __decorate([
    __param(2, ISearchService),
    __param(3, IFileService),
    __param(4, IConfigurationService),
    __param(5, IFilesConfigurationService),
    __param(6, IProgressService),
    __param(7, IExplorerService),
    __param(8, IContextKeyService)
], ExplorerFindProvider);
export { ExplorerFindProvider };
function getMatchingDirectoriesFromFiles(resources, root, segmentMatchPattern) {
    const uniqueDirectories = new ResourceSet();
    for (const resource of resources) {
        const relativePathToRoot = relativePath(root.resource, resource);
        if (!relativePathToRoot) {
            throw new Error('Resource is not a child of the root');
        }
        let dirResource = root.resource;
        const stats = relativePathToRoot.split('/').slice(0, -1);
        for (const stat of stats) {
            dirResource = dirResource.with({ path: `${dirResource.path}/${stat}` });
            uniqueDirectories.add(dirResource);
        }
    }
    const matchingDirectories = [];
    for (const dirResource of uniqueDirectories) {
        const stats = dirResource.path.split('/');
        const dirStat = stats[stats.length - 1];
        if (!dirStat || !glob.match(segmentMatchPattern, dirStat)) {
            continue;
        }
        matchingDirectories.push(dirResource);
    }
    return matchingDirectories;
}
function findFirstParent(resource, root) {
    const relativePathToRoot = relativePath(root.resource, resource);
    if (!relativePathToRoot) {
        throw new Error('Resource is not a child of the root');
    }
    let currentItem = root;
    let currentResource = root.resource;
    const pathSegments = relativePathToRoot.split('/');
    for (const stat of pathSegments) {
        currentResource = currentResource.with({ path: `${currentResource.path}/${stat}` });
        const child = currentItem.getChild(stat);
        if (!child) {
            return currentItem;
        }
        currentItem = child;
    }
    return undefined;
}
function fuzzyMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern.split('').join('*') + '*';
}
function continousMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern + '*';
}
function caseInsensitiveGlobPattern(pattern) {
    let caseInsensitiveFilePattern = '';
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        if (/[a-zA-Z]/.test(char)) {
            caseInsensitiveFilePattern += `[${char.toLowerCase()}${char.toUpperCase()}]`;
        }
        else {
            caseInsensitiveFilePattern += char;
        }
    }
    return caseInsensitiveFilePattern;
}
export class CompressedNavigationController {
    static { this.ID = 0; }
    get index() {
        return this._index;
    }
    get count() {
        return this.items.length;
    }
    get current() {
        return this.items[this._index];
    }
    get currentId() {
        return `${this.id}_${this.index}`;
    }
    get labels() {
        return this._labels;
    }
    constructor(id, items, templateData, depth, collapsed) {
        this.id = id;
        this.items = items;
        this.depth = depth;
        this.collapsed = collapsed;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._index = items.length - 1;
        this.updateLabels(templateData);
        this._updateLabelDisposable = templateData.label.onDidRender(() => this.updateLabels(templateData));
    }
    updateLabels(templateData) {
        this._labels = Array.from(templateData.container.querySelectorAll('.label-name'));
        let parents = '';
        for (let i = 0; i < this.labels.length; i++) {
            const ariaLabel = parents.length
                ? `${this.items[i].name}, compact, ${parents}`
                : this.items[i].name;
            this.labels[i].setAttribute('aria-label', ariaLabel);
            this.labels[i].setAttribute('aria-level', `${this.depth + i}`);
            parents = parents.length ? `${this.items[i].name} ${parents}` : this.items[i].name;
        }
        this.updateCollapsed(this.collapsed);
        if (this._index < this.labels.length) {
            this.labels[this._index].classList.add('active');
        }
    }
    previous() {
        if (this._index <= 0) {
            return;
        }
        this.setIndex(this._index - 1);
    }
    next() {
        if (this._index >= this.items.length - 1) {
            return;
        }
        this.setIndex(this._index + 1);
    }
    first() {
        if (this._index === 0) {
            return;
        }
        this.setIndex(0);
    }
    last() {
        if (this._index === this.items.length - 1) {
            return;
        }
        this.setIndex(this.items.length - 1);
    }
    setIndex(index) {
        if (index < 0 || index >= this.items.length) {
            return;
        }
        this.labels[this._index].classList.remove('active');
        this._index = index;
        this.labels[this._index].classList.add('active');
        this._onDidChange.fire();
    }
    updateCollapsed(collapsed) {
        this.collapsed = collapsed;
        for (let i = 0; i < this.labels.length; i++) {
            this.labels[i].setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }
    }
    dispose() {
        this._onDidChange.dispose();
        this._updateLabelDisposable.dispose();
    }
}
let FilesRenderer = class FilesRenderer {
    static { FilesRenderer_1 = this; }
    static { this.ID = 'file'; }
    constructor(container, labels, highlightTree, updateWidth, contextViewService, themeService, configurationService, explorerService, labelService, contextService, contextMenuService, instantiationService) {
        this.labels = labels;
        this.highlightTree = highlightTree;
        this.updateWidth = updateWidth;
        this.contextViewService = contextViewService;
        this.themeService = themeService;
        this.configurationService = configurationService;
        this.explorerService = explorerService;
        this.labelService = labelService;
        this.contextService = contextService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.compressedNavigationControllers = new Map();
        this._onDidChangeActiveDescendant = new EventMultiplexer();
        this.onDidChangeActiveDescendant = this._onDidChangeActiveDescendant.event;
        this.config = this.configurationService.getValue();
        const updateOffsetStyles = () => {
            const indent = this.configurationService.getValue('workbench.tree.indent');
            const offset = Math.max(22 - indent, 0); // derived via inspection
            container.style.setProperty(`--vscode-explorer-align-offset-margin-left`, `${offset}px`);
        };
        this.configListener = this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('explorer')) {
                this.config = this.configurationService.getValue();
            }
            if (e.affectsConfiguration('workbench.tree.indent')) {
                updateOffsetStyles();
            }
        });
        updateOffsetStyles();
    }
    getWidgetAriaLabel() {
        return localize('treeAriaLabel', 'Files Explorer');
    }
    get templateId() {
        return FilesRenderer_1.ID;
    }
    // Void added this
    // // Create void buttons container
    // const voidButtonsContainer = DOM.append(container, DOM.$('div'));
    // voidButtonsContainer.style.position = 'absolute'
    // voidButtonsContainer.style.top = '0'
    // voidButtonsContainer.style.right = '0'
    // // const voidButtons = DOM.append(voidButtonsContainer, DOM.$('span'));
    // // voidButtons.textContent = 'voidbuttons'
    // // voidButtons.addEventListener('click', () => {
    // // 	console.log('ON CLICK', templateData.currentContext?.children)
    // // })
    // const voidLabels = this.labels.create(voidButtonsContainer, { supportHighlights: false, supportIcons: false, });
    // voidLabels.element.textContent = 'hi333'
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const label = templateDisposables.add(this.labels.create(container, { supportHighlights: true }));
        templateDisposables.add(label.onDidRender(() => {
            try {
                if (templateData.currentContext) {
                    this.updateWidth(templateData.currentContext);
                }
            }
            catch (e) {
                // noop since the element might no longer be in the tree, no update of width necessary
            }
        }));
        const contribs = explorerFileContribRegistry.create(this.instantiationService, container, templateDisposables);
        templateDisposables.add(explorerFileContribRegistry.onDidRegisterDescriptor((d) => {
            const contr = d.create(this.instantiationService, container);
            contribs.push(templateDisposables.add(contr));
            contr.setResource(templateData.currentContext?.resource);
        }));
        const templateData = {
            templateDisposables,
            elementDisposables: templateDisposables.add(new DisposableStore()),
            label,
            container,
            contribs,
        };
        return templateData;
    }
    // Void cares about this function, this is where elements in the tree are rendered
    renderElement(node, index, templateData) {
        const stat = node.element;
        templateData.currentContext = stat;
        const editableData = this.explorerService.getEditableData(stat);
        templateData.label.element.classList.remove('compressed');
        // File Label
        if (!editableData) {
            templateData.label.element.style.display = 'flex';
            this.renderStat(stat, stat.name, undefined, node.filterData, templateData);
        }
        // Input Box
        else {
            templateData.label.element.style.display = 'none';
            templateData.contribs.forEach((c) => c.setResource(undefined));
            templateData.elementDisposables.add(this.renderInputBox(templateData.container, stat, editableData));
        }
    }
    renderCompressedElements(node, index, templateData, height) {
        const stat = node.element.elements[node.element.elements.length - 1];
        templateData.currentContext = stat;
        const editable = node.element.elements.filter((e) => this.explorerService.isEditable(e));
        const editableData = editable.length === 0 ? undefined : this.explorerService.getEditableData(editable[0]);
        // File Label
        if (!editableData) {
            templateData.label.element.classList.add('compressed');
            templateData.label.element.style.display = 'flex';
            const id = `compressed-explorer_${CompressedNavigationController.ID++}`;
            const labels = node.element.elements.map((e) => e.name);
            // If there is a fuzzy score, we need to adjust the offset of the score
            // to align with the last stat of the compressed label
            let fuzzyScore = node.filterData;
            if (fuzzyScore && fuzzyScore.length > 2) {
                const filterDataOffset = labels.join('/').length - labels[labels.length - 1].length;
                fuzzyScore = [fuzzyScore[0], fuzzyScore[1] + filterDataOffset, ...fuzzyScore.slice(2)];
            }
            this.renderStat(stat, labels, id, fuzzyScore, templateData);
            const compressedNavigationController = new CompressedNavigationController(id, node.element.elements, templateData, node.depth, node.collapsed);
            templateData.elementDisposables.add(compressedNavigationController);
            const nodeControllers = this.compressedNavigationControllers.get(stat) ?? [];
            this.compressedNavigationControllers.set(stat, [
                ...nodeControllers,
                compressedNavigationController,
            ]);
            // accessibility
            templateData.elementDisposables.add(this._onDidChangeActiveDescendant.add(compressedNavigationController.onDidChange));
            templateData.elementDisposables.add(DOM.addDisposableListener(templateData.container, 'mousedown', (e) => {
                const result = getIconLabelNameFromHTMLElement(e.target);
                if (result) {
                    compressedNavigationController.setIndex(result.index);
                }
            }));
            templateData.elementDisposables.add(toDisposable(() => {
                const nodeControllers = this.compressedNavigationControllers.get(stat) ?? [];
                const renderedIndex = nodeControllers.findIndex((controller) => controller === compressedNavigationController);
                if (renderedIndex < 0) {
                    throw new Error('Disposing unknown navigation controller');
                }
                if (nodeControllers.length === 1) {
                    this.compressedNavigationControllers.delete(stat);
                }
                else {
                    nodeControllers.splice(renderedIndex, 1);
                }
            }));
        }
        // Input Box
        else {
            templateData.label.element.classList.remove('compressed');
            templateData.label.element.style.display = 'none';
            templateData.contribs.forEach((c) => c.setResource(undefined));
            templateData.elementDisposables.add(this.renderInputBox(templateData.container, editable[0], editableData));
        }
    }
    renderStat(stat, label, domId, filterData, templateData) {
        templateData.label.element.style.display = 'flex';
        const extraClasses = ['explorer-item'];
        if (this.explorerService.isCut(stat)) {
            extraClasses.push('cut');
        }
        // Offset nested children unless folders have both chevrons and icons, otherwise alignment breaks
        const theme = this.themeService.getFileIconTheme();
        // Hack to always render chevrons for file nests, or else may not be able to identify them.
        const twistieContainer = templateData.container.parentElement?.parentElement?.querySelector('.monaco-tl-twistie');
        twistieContainer?.classList.toggle('force-twistie', stat.hasNests && theme.hidesExplorerArrows);
        // when explorer arrows are hidden or there are no folder icons, nests get misaligned as they are forced to have arrows and files typically have icons
        // Apply some CSS magic to get things looking as reasonable as possible.
        const themeIsUnhappyWithNesting = theme.hasFileIcons && (theme.hidesExplorerArrows || !theme.hasFolderIcons);
        const realignNestedChildren = stat.nestedParent && themeIsUnhappyWithNesting;
        templateData.contribs.forEach((c) => c.setResource(stat.resource));
        templateData.label.setResource({ resource: stat.resource, name: label }, {
            fileKind: stat.isRoot
                ? FileKind.ROOT_FOLDER
                : stat.isDirectory
                    ? FileKind.FOLDER
                    : FileKind.FILE,
            extraClasses: realignNestedChildren
                ? [...extraClasses, 'align-nest-icon-with-parent-icon']
                : extraClasses,
            fileDecorations: this.config.explorer.decorations,
            matches: createMatches(filterData),
            separator: this.labelService.getSeparator(stat.resource.scheme, stat.resource.authority),
            domId,
        });
        const highlightResults = stat.isDirectory ? this.highlightTree.get(stat) : 0;
        if (highlightResults > 0) {
            const badge = new CountBadge(templateData.label.element.lastElementChild, {}, {
                ...defaultCountBadgeStyles,
                badgeBackground: asCssVariable(listFilterMatchHighlight),
                badgeBorder: asCssVariable(listFilterMatchHighlightBorder),
            });
            badge.setCount(highlightResults);
            badge.setTitleFormat(localize('explorerHighlightFolderBadgeTitle', 'Directory contains {0} matches', highlightResults));
            templateData.elementDisposables.add(badge);
        }
        templateData.label.element.classList.toggle('highlight-badge', highlightResults > 0);
    }
    renderInputBox(container, stat, editableData) {
        // Use a file label only for the icon next to the input box
        const label = this.labels.create(container);
        const extraClasses = ['explorer-item', 'explorer-item-edited'];
        const fileKind = stat.isRoot
            ? FileKind.ROOT_FOLDER
            : stat.isDirectory
                ? FileKind.FOLDER
                : FileKind.FILE;
        const theme = this.themeService.getFileIconTheme();
        const themeIsUnhappyWithNesting = theme.hasFileIcons && (theme.hidesExplorerArrows || !theme.hasFolderIcons);
        const realignNestedChildren = stat.nestedParent && themeIsUnhappyWithNesting;
        const labelOptions = {
            hidePath: true,
            hideLabel: true,
            fileKind,
            extraClasses: realignNestedChildren
                ? [...extraClasses, 'align-nest-icon-with-parent-icon']
                : extraClasses,
        };
        const parent = stat.name ? dirname(stat.resource) : stat.resource;
        const value = stat.name || '';
        label.setFile(joinPath(parent, value || ' '), labelOptions) // Use icon for ' ' if name is empty.
        ;
        label.element.firstElementChild.style.display = 'none';
        // Input field for name
        const inputBox = new InputBox(label.element, this.contextViewService, {
            validationOptions: {
                validation: (value) => {
                    const message = editableData.validationMessage(value);
                    if (!message || message.severity !== Severity.Error) {
                        return null;
                    }
                    return {
                        content: message.content,
                        formatContent: true,
                        type: 3 /* MessageType.ERROR */,
                    };
                },
            },
            ariaLabel: localize('fileInputAriaLabel', 'Type file name. Press Enter to confirm or Escape to cancel.'),
            inputBoxStyles: defaultInputBoxStyles,
        });
        const lastDot = value.lastIndexOf('.');
        let currentSelectionState = 'prefix';
        inputBox.value = value;
        inputBox.focus();
        inputBox.select({ start: 0, end: lastDot > 0 && !stat.isDirectory ? lastDot : value.length });
        const done = createSingleCallFunction((success, finishEditing) => {
            label.element.style.display = 'none';
            const value = inputBox.value;
            dispose(toDispose);
            label.element.remove();
            if (finishEditing) {
                editableData.onFinish(value, success);
            }
        });
        const showInputBoxNotification = () => {
            if (inputBox.isInputValid()) {
                const message = editableData.validationMessage(inputBox.value);
                if (message) {
                    inputBox.showMessage({
                        content: message.content,
                        formatContent: true,
                        type: message.severity === Severity.Info
                            ? 1 /* MessageType.INFO */
                            : message.severity === Severity.Warning
                                ? 2 /* MessageType.WARNING */
                                : 3 /* MessageType.ERROR */,
                    });
                }
                else {
                    inputBox.hideMessage();
                }
            }
        };
        showInputBoxNotification();
        const toDispose = [
            inputBox,
            inputBox.onDidChange((value) => {
                label.setFile(joinPath(parent, value || ' '), labelOptions); // update label icon while typing!
            }),
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, (e) => {
                if (e.equals(60 /* KeyCode.F2 */)) {
                    const dotIndex = inputBox.value.lastIndexOf('.');
                    if (stat.isDirectory || dotIndex === -1) {
                        return;
                    }
                    if (currentSelectionState === 'prefix') {
                        currentSelectionState = 'all';
                        inputBox.select({ start: 0, end: inputBox.value.length });
                    }
                    else if (currentSelectionState === 'all') {
                        currentSelectionState = 'suffix';
                        inputBox.select({ start: dotIndex + 1, end: inputBox.value.length });
                    }
                    else {
                        currentSelectionState = 'prefix';
                        inputBox.select({ start: 0, end: dotIndex });
                    }
                }
                else if (e.equals(3 /* KeyCode.Enter */)) {
                    if (!inputBox.validate()) {
                        done(true, true);
                    }
                }
                else if (e.equals(9 /* KeyCode.Escape */)) {
                    done(false, true);
                }
            }),
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_UP, (e) => {
                showInputBoxNotification();
            }),
            DOM.addDisposableListener(inputBox.inputElement, DOM.EventType.BLUR, async () => {
                while (true) {
                    await timeout(0);
                    const ownerDocument = inputBox.inputElement.ownerDocument;
                    if (!ownerDocument.hasFocus()) {
                        break;
                    }
                    if (DOM.isActiveElement(inputBox.inputElement)) {
                        return;
                    }
                    else if (DOM.isHTMLElement(ownerDocument.activeElement) &&
                        DOM.hasParentWithClass(ownerDocument.activeElement, 'context-view')) {
                        await Event.toPromise(this.contextMenuService.onDidHideContextMenu);
                    }
                    else {
                        break;
                    }
                }
                done(inputBox.isInputValid(), true);
            }),
            label,
        ];
        return toDisposable(() => {
            done(false, false);
        });
    }
    disposeElement(element, index, templateData) {
        templateData.currentContext = undefined;
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.currentContext = undefined;
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    getCompressedNavigationController(stat) {
        return this.compressedNavigationControllers.get(stat);
    }
    // IAccessibilityProvider
    getAriaLabel(element) {
        return element.name;
    }
    getAriaLevel(element) {
        // We need to comput aria level on our own since children of compact folders will otherwise have an incorrect level	#107235
        let depth = 0;
        let parent = element.parent;
        while (parent) {
            parent = parent.parent;
            depth++;
        }
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            depth = depth + 1;
        }
        return depth;
    }
    getActiveDescendantId(stat) {
        return this.compressedNavigationControllers.get(stat)?.[0]?.currentId ?? undefined;
    }
    dispose() {
        this.configListener.dispose();
    }
};
FilesRenderer = FilesRenderer_1 = __decorate([
    __param(4, IContextViewService),
    __param(5, IThemeService),
    __param(6, IConfigurationService),
    __param(7, IExplorerService),
    __param(8, ILabelService),
    __param(9, IWorkspaceContextService),
    __param(10, IContextMenuService),
    __param(11, IInstantiationService)
], FilesRenderer);
export { FilesRenderer };
/**
 * Respects files.exclude setting in filtering out content from the explorer.
 * Makes sure that visible editors are always shown in the explorer even if they are filtered out by settings.
 */
let FilesFilter = class FilesFilter {
    constructor(contextService, configurationService, explorerService, editorService, uriIdentityService, fileService) {
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.hiddenExpressionPerRoot = new Map();
        this.editorsAffectingFilter = new Set();
        this._onDidChange = new Emitter();
        this.toDispose = [];
        // List of ignoreFile resources. Used to detect changes to the ignoreFiles.
        this.ignoreFileResourcesPerRoot = new Map();
        // Ignore tree per root. Similar to `hiddenExpressionPerRoot`
        // Note: URI in the ternary search tree is the URI of the folder containing the ignore file
        // It is not the ignore file itself. This is because of the way the IgnoreFile works and nested paths
        this.ignoreTreesPerRoot = new Map();
        this.toDispose.push(this.contextService.onDidChangeWorkspaceFolders(() => this.updateConfiguration()));
        this.toDispose.push(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('files.exclude') ||
                e.affectsConfiguration('explorer.excludeGitIgnore')) {
                this.updateConfiguration();
            }
        }));
        this.toDispose.push(this.fileService.onDidFilesChange((e) => {
            // Check to see if the update contains any of the ignoreFileResources
            for (const [root, ignoreFileResourceSet] of this.ignoreFileResourcesPerRoot.entries()) {
                ignoreFileResourceSet.forEach(async (ignoreResource) => {
                    if (e.contains(ignoreResource, 0 /* FileChangeType.UPDATED */)) {
                        await this.processIgnoreFile(root, ignoreResource, true);
                    }
                    if (e.contains(ignoreResource, 2 /* FileChangeType.DELETED */)) {
                        this.ignoreTreesPerRoot.get(root)?.delete(dirname(ignoreResource));
                        ignoreFileResourceSet.delete(ignoreResource);
                        this._onDidChange.fire();
                    }
                });
            }
        }));
        this.toDispose.push(this.editorService.onDidVisibleEditorsChange(() => {
            const editors = this.editorService.visibleEditors;
            let shouldFire = false;
            for (const e of editors) {
                if (!e.resource) {
                    continue;
                }
                const stat = this.explorerService.findClosest(e.resource);
                if (stat && stat.isExcluded) {
                    // A filtered resource suddenly became visible since user opened an editor
                    shouldFire = true;
                    break;
                }
            }
            for (const e of this.editorsAffectingFilter) {
                if (!editors.includes(e)) {
                    // Editor that was affecting filtering is no longer visible
                    shouldFire = true;
                    break;
                }
            }
            if (shouldFire) {
                this.editorsAffectingFilter.clear();
                this._onDidChange.fire();
            }
        }));
        this.updateConfiguration();
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    updateConfiguration() {
        let shouldFire = false;
        let updatedGitIgnoreSetting = false;
        this.contextService.getWorkspace().folders.forEach((folder) => {
            const configuration = this.configurationService.getValue({
                resource: folder.uri,
            });
            const excludesConfig = configuration?.files?.exclude || Object.create(null);
            const parseIgnoreFile = configuration.explorer.excludeGitIgnore;
            // If we should be parsing ignoreFiles for this workspace and don't have an ignore tree initialize one
            if (parseIgnoreFile && !this.ignoreTreesPerRoot.has(folder.uri.toString())) {
                updatedGitIgnoreSetting = true;
                this.ignoreFileResourcesPerRoot.set(folder.uri.toString(), new ResourceSet());
                this.ignoreTreesPerRoot.set(folder.uri.toString(), TernarySearchTree.forUris((uri) => this.uriIdentityService.extUri.ignorePathCasing(uri)));
            }
            // If we shouldn't be parsing ignore files but have an ignore tree, clear the ignore tree
            if (!parseIgnoreFile && this.ignoreTreesPerRoot.has(folder.uri.toString())) {
                updatedGitIgnoreSetting = true;
                this.ignoreFileResourcesPerRoot.delete(folder.uri.toString());
                this.ignoreTreesPerRoot.delete(folder.uri.toString());
            }
            if (!shouldFire) {
                const cached = this.hiddenExpressionPerRoot.get(folder.uri.toString());
                shouldFire = !cached || !equals(cached.original, excludesConfig);
            }
            const excludesConfigCopy = deepClone(excludesConfig); // do not keep the config, as it gets mutated under our hoods
            this.hiddenExpressionPerRoot.set(folder.uri.toString(), {
                original: excludesConfigCopy,
                parsed: glob.parse(excludesConfigCopy),
            });
        });
        if (shouldFire || updatedGitIgnoreSetting) {
            this.editorsAffectingFilter.clear();
            this._onDidChange.fire();
        }
    }
    /**
     * Given a .gitignore file resource, processes the resource and adds it to the ignore tree which hides explorer items
     * @param root The root folder of the workspace as a string. Used for lookup key for ignore tree and resource list
     * @param ignoreFileResource The resource of the .gitignore file
     * @param update Whether or not we're updating an existing ignore file. If true it deletes the old entry
     */
    async processIgnoreFile(root, ignoreFileResource, update) {
        // Get the name of the directory which the ignore file is in
        const dirUri = dirname(ignoreFileResource);
        const ignoreTree = this.ignoreTreesPerRoot.get(root);
        if (!ignoreTree) {
            return;
        }
        // Don't process a directory if we already have it in the tree
        if (!update && ignoreTree.has(dirUri)) {
            return;
        }
        // Maybe we need a cancellation token here in case it's super long?
        const content = await this.fileService.readFile(ignoreFileResource);
        // If it's just an update we update the contents keeping all references the same
        if (update) {
            const ignoreFile = ignoreTree.get(dirUri);
            ignoreFile?.updateContents(content.value.toString());
        }
        else {
            // Otherwise we create a new ignorefile and add it to the tree
            const ignoreParent = ignoreTree.findSubstr(dirUri);
            const ignoreFile = new IgnoreFile(content.value.toString(), dirUri.path, ignoreParent);
            ignoreTree.set(dirUri, ignoreFile);
            // If we haven't seen this resource before then we need to add it to the list of resources we're tracking
            if (!this.ignoreFileResourcesPerRoot.get(root)?.has(ignoreFileResource)) {
                this.ignoreFileResourcesPerRoot.get(root)?.add(ignoreFileResource);
            }
        }
        // Notify the explorer of the change so we may ignore these files
        this._onDidChange.fire();
    }
    filter(stat, parentVisibility) {
        // Add newly visited .gitignore files to the ignore tree
        if (stat.name === '.gitignore' && this.ignoreTreesPerRoot.has(stat.root.resource.toString())) {
            this.processIgnoreFile(stat.root.resource.toString(), stat.resource, false);
            return true;
        }
        return this.isVisible(stat, parentVisibility);
    }
    isVisible(stat, parentVisibility) {
        stat.isExcluded = false;
        if (parentVisibility === 0 /* TreeVisibility.Hidden */) {
            stat.isExcluded = true;
            return false;
        }
        if (this.explorerService.getEditableData(stat)) {
            return true; // always visible
        }
        // Hide those that match Hidden Patterns
        const cached = this.hiddenExpressionPerRoot.get(stat.root.resource.toString());
        const globMatch = cached?.parsed(path.relative(stat.root.resource.path, stat.resource.path), stat.name, (name) => !!(stat.parent && stat.parent.getChild(name)));
        // Small optimization to only run isHiddenResource (traverse gitIgnore) if the globMatch from fileExclude returned nothing
        const isHiddenResource = !!globMatch
            ? true
            : this.isIgnored(stat.resource, stat.root.resource, stat.isDirectory);
        if (isHiddenResource || stat.parent?.isExcluded) {
            stat.isExcluded = true;
            const editors = this.editorService.visibleEditors;
            const editor = editors.find((e) => e.resource && this.uriIdentityService.extUri.isEqualOrParent(e.resource, stat.resource));
            if (editor && stat.root === this.explorerService.findClosestRoot(stat.resource)) {
                this.editorsAffectingFilter.add(editor);
                return true; // Show all opened files and their parents
            }
            return false; // hidden through pattern
        }
        return true;
    }
    isIgnored(resource, rootResource, isDirectory) {
        const ignoreFile = this.ignoreTreesPerRoot.get(rootResource.toString())?.findSubstr(resource);
        const isIncludedInTraversal = ignoreFile?.isPathIncludedInTraversal(resource.path, isDirectory);
        // Doing !undefined returns true and we want it to be false when undefined because that means it's not included in the ignore file
        return isIncludedInTraversal === undefined ? false : !isIncludedInTraversal;
    }
    dispose() {
        dispose(this.toDispose);
    }
};
FilesFilter = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IConfigurationService),
    __param(2, IExplorerService),
    __param(3, IEditorService),
    __param(4, IUriIdentityService),
    __param(5, IFileService)
], FilesFilter);
export { FilesFilter };
// Explorer Sorter
let FileSorter = class FileSorter {
    constructor(explorerService, contextService) {
        this.explorerService = explorerService;
        this.contextService = contextService;
    }
    compare(statA, statB) {
        // Do not sort roots
        if (statA.isRoot) {
            if (statB.isRoot) {
                const workspaceA = this.contextService.getWorkspaceFolder(statA.resource);
                const workspaceB = this.contextService.getWorkspaceFolder(statB.resource);
                return workspaceA && workspaceB ? workspaceA.index - workspaceB.index : -1;
            }
            return -1;
        }
        if (statB.isRoot) {
            return 1;
        }
        const sortOrder = this.explorerService.sortOrderConfiguration.sortOrder;
        const lexicographicOptions = this.explorerService.sortOrderConfiguration.lexicographicOptions;
        const reverse = this.explorerService.sortOrderConfiguration.reverse;
        if (reverse) {
            ;
            [statA, statB] = [statB, statA];
        }
        let compareFileNames;
        let compareFileExtensions;
        switch (lexicographicOptions) {
            case 'upper':
                compareFileNames = compareFileNamesUpper;
                compareFileExtensions = compareFileExtensionsUpper;
                break;
            case 'lower':
                compareFileNames = compareFileNamesLower;
                compareFileExtensions = compareFileExtensionsLower;
                break;
            case 'unicode':
                compareFileNames = compareFileNamesUnicode;
                compareFileExtensions = compareFileExtensionsUnicode;
                break;
            default:
                // 'default'
                compareFileNames = compareFileNamesDefault;
                compareFileExtensions = compareFileExtensionsDefault;
        }
        // Sort Directories
        switch (sortOrder) {
            case 'type':
                if (statA.isDirectory && !statB.isDirectory) {
                    return -1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return 1;
                }
                if (statA.isDirectory && statB.isDirectory) {
                    return compareFileNames(statA.name, statB.name);
                }
                break;
            case 'filesFirst':
                if (statA.isDirectory && !statB.isDirectory) {
                    return 1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return -1;
                }
                break;
            case 'foldersNestsFiles':
                if (statA.isDirectory && !statB.isDirectory) {
                    return -1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return 1;
                }
                if (statA.hasNests && !statB.hasNests) {
                    return -1;
                }
                if (statB.hasNests && !statA.hasNests) {
                    return 1;
                }
                break;
            case 'mixed':
                break; // not sorting when "mixed" is on
            default: /* 'default', 'modified' */
                if (statA.isDirectory && !statB.isDirectory) {
                    return -1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return 1;
                }
                break;
        }
        // Sort Files
        switch (sortOrder) {
            case 'type':
                return compareFileExtensions(statA.name, statB.name);
            case 'modified':
                if (statA.mtime !== statB.mtime) {
                    return statA.mtime && statB.mtime && statA.mtime < statB.mtime ? 1 : -1;
                }
                return compareFileNames(statA.name, statB.name);
            default: /* 'default', 'mixed', 'filesFirst' */
                return compareFileNames(statA.name, statB.name);
        }
    }
};
FileSorter = __decorate([
    __param(0, IExplorerService),
    __param(1, IWorkspaceContextService)
], FileSorter);
export { FileSorter };
let FileDragAndDrop = class FileDragAndDrop {
    static { FileDragAndDrop_1 = this; }
    static { this.CONFIRM_DND_SETTING_KEY = 'explorer.confirmDragAndDrop'; }
    constructor(isCollapsed, explorerService, editorService, dialogService, contextService, fileService, configurationService, instantiationService, workspaceEditingService, uriIdentityService) {
        this.isCollapsed = isCollapsed;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.dialogService = dialogService;
        this.contextService = contextService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.workspaceEditingService = workspaceEditingService;
        this.uriIdentityService = uriIdentityService;
        this.compressedDropTargetDisposable = Disposable.None;
        this.disposables = new DisposableStore();
        this.dropEnabled = false;
        const updateDropEnablement = (e) => {
            if (!e || e.affectsConfiguration('explorer.enableDragAndDrop')) {
                this.dropEnabled = this.configurationService.getValue('explorer.enableDragAndDrop');
            }
        };
        updateDropEnablement(undefined);
        this.disposables.add(this.configurationService.onDidChangeConfiguration((e) => updateDropEnablement(e)));
    }
    onDragOver(data, target, targetIndex, targetSector, originalEvent) {
        if (!this.dropEnabled) {
            return false;
        }
        // Compressed folders
        if (target) {
            const compressedTarget = FileDragAndDrop_1.getCompressedStatFromDragEvent(target, originalEvent);
            if (compressedTarget) {
                const iconLabelName = getIconLabelNameFromHTMLElement(originalEvent.target);
                if (iconLabelName && iconLabelName.index < iconLabelName.count - 1) {
                    const result = this.handleDragOver(data, compressedTarget, targetIndex, targetSector, originalEvent);
                    if (result) {
                        if (iconLabelName.element !== this.compressedDragOverElement) {
                            this.compressedDragOverElement = iconLabelName.element;
                            this.compressedDropTargetDisposable.dispose();
                            this.compressedDropTargetDisposable = toDisposable(() => {
                                iconLabelName.element.classList.remove('drop-target');
                                this.compressedDragOverElement = undefined;
                            });
                            iconLabelName.element.classList.add('drop-target');
                        }
                        return typeof result === 'boolean' ? result : { ...result, feedback: [] };
                    }
                    this.compressedDropTargetDisposable.dispose();
                    return false;
                }
            }
        }
        this.compressedDropTargetDisposable.dispose();
        return this.handleDragOver(data, target, targetIndex, targetSector, originalEvent);
    }
    handleDragOver(data, target, targetIndex, targetSector, originalEvent) {
        const isCopy = originalEvent &&
            ((originalEvent.ctrlKey && !isMacintosh) || (originalEvent.altKey && isMacintosh));
        const isNative = data instanceof NativeDragAndDropData;
        const effectType = isNative || isCopy ? 0 /* ListDragOverEffectType.Copy */ : 1 /* ListDragOverEffectType.Move */;
        const effect = { type: effectType, position: "drop-target" /* ListDragOverEffectPosition.Over */ };
        // Native DND
        if (isNative) {
            if (!containsDragType(originalEvent, DataTransfers.FILES, CodeDataTransfers.FILES, DataTransfers.RESOURCES)) {
                return false;
            }
        }
        // Other-Tree DND
        else if (data instanceof ExternalElementsDragAndDropData) {
            return false;
        }
        // In-Explorer DND
        else {
            const items = FileDragAndDrop_1.getStatsFromDragAndDropData(data);
            const isRootsReorder = items.every((item) => item.isRoot);
            if (!target) {
                // Dropping onto the empty area. Do not accept if items dragged are already
                // children of the root unless we are copying the file
                if (!isCopy && items.every((i) => !!i.parent && i.parent.isRoot)) {
                    return false;
                }
                // root is added after last root folder when hovering on empty background
                if (isRootsReorder) {
                    return {
                        accept: true,
                        effect: {
                            type: 1 /* ListDragOverEffectType.Move */,
                            position: "drop-target-after" /* ListDragOverEffectPosition.After */,
                        },
                    };
                }
                return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, effect, autoExpand: false };
            }
            if (!Array.isArray(items)) {
                return false;
            }
            if (!isCopy && items.every((source) => source.isReadonly)) {
                return false; // Cannot move readonly items unless we copy
            }
            if (items.some((source) => {
                if (source.isRoot) {
                    return false; // Root folders are handled seperately
                }
                if (this.uriIdentityService.extUri.isEqual(source.resource, target.resource)) {
                    return true; // Can not move anything onto itself excpet for root folders
                }
                if (!isCopy &&
                    this.uriIdentityService.extUri.isEqual(dirname(source.resource), target.resource)) {
                    return true; // Can not move a file to the same parent unless we copy
                }
                if (this.uriIdentityService.extUri.isEqualOrParent(target.resource, source.resource)) {
                    return true; // Can not move a parent folder into one of its children
                }
                return false;
            })) {
                return false;
            }
            // reordering roots
            if (isRootsReorder) {
                if (!target.isRoot) {
                    return false;
                }
                let dropEffectPosition = undefined;
                switch (targetSector) {
                    case 0 /* ListViewTargetSector.TOP */:
                    case 1 /* ListViewTargetSector.CENTER_TOP */:
                        dropEffectPosition = "drop-target-before" /* ListDragOverEffectPosition.Before */;
                        break;
                    case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
                    case 3 /* ListViewTargetSector.BOTTOM */:
                        dropEffectPosition = "drop-target-after" /* ListDragOverEffectPosition.After */;
                        break;
                }
                return {
                    accept: true,
                    effect: { type: 1 /* ListDragOverEffectType.Move */, position: dropEffectPosition },
                };
            }
        }
        // All (target = model)
        if (!target) {
            return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, effect };
        }
        // All (target = file/folder)
        else {
            if (target.isDirectory) {
                if (target.isReadonly) {
                    return false;
                }
                return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, effect, autoExpand: true };
            }
            if (this.contextService
                .getWorkspace()
                .folders.every((folder) => folder.uri.toString() !== target.resource.toString())) {
                return { accept: true, bubble: 1 /* TreeDragOverBubble.Up */, effect };
            }
        }
        return false;
    }
    getDragURI(element) {
        if (this.explorerService.isEditable(element)) {
            return null;
        }
        return element.resource.toString();
    }
    getDragLabel(elements, originalEvent) {
        if (elements.length === 1) {
            const stat = FileDragAndDrop_1.getCompressedStatFromDragEvent(elements[0], originalEvent);
            return stat.name;
        }
        return String(elements.length);
    }
    onDragStart(data, originalEvent) {
        const items = FileDragAndDrop_1.getStatsFromDragAndDropData(data, originalEvent);
        if (items && items.length && originalEvent.dataTransfer) {
            // Apply some datatransfer types to allow for dragging the element outside of the application
            this.instantiationService.invokeFunction((accessor) => fillEditorsDragData(accessor, items, originalEvent));
            // The only custom data transfer we set from the explorer is a file transfer
            // to be able to DND between multiple code file explorers across windows
            const fileResources = items
                .filter((s) => s.resource.scheme === Schemas.file)
                .map((r) => r.resource.fsPath);
            if (fileResources.length) {
                originalEvent.dataTransfer.setData(CodeDataTransfers.FILES, JSON.stringify(fileResources));
            }
        }
    }
    async drop(data, target, targetIndex, targetSector, originalEvent) {
        this.compressedDropTargetDisposable.dispose();
        // Find compressed target
        if (target) {
            const compressedTarget = FileDragAndDrop_1.getCompressedStatFromDragEvent(target, originalEvent);
            if (compressedTarget) {
                target = compressedTarget;
            }
        }
        // Find parent to add to
        if (!target) {
            target = this.explorerService.roots[this.explorerService.roots.length - 1];
            targetSector = 3 /* ListViewTargetSector.BOTTOM */;
        }
        if (!target.isDirectory && target.parent) {
            target = target.parent;
        }
        if (target.isReadonly) {
            return;
        }
        const resolvedTarget = target;
        if (!resolvedTarget) {
            return;
        }
        try {
            // External file DND (Import/Upload file)
            if (data instanceof NativeDragAndDropData) {
                // Use local file import when supported
                if (!isWeb ||
                    (isTemporaryWorkspace(this.contextService.getWorkspace()) &&
                        WebFileSystemAccess.supported(mainWindow))) {
                    const fileImport = this.instantiationService.createInstance(ExternalFileImport);
                    await fileImport.import(resolvedTarget, originalEvent, mainWindow);
                }
                // Otherwise fallback to browser based file upload
                else {
                    const browserUpload = this.instantiationService.createInstance(BrowserFileUpload);
                    await browserUpload.upload(target, originalEvent);
                }
            }
            // In-Explorer DND (Move/Copy file)
            else {
                await this.handleExplorerDrop(data, resolvedTarget, targetIndex, targetSector, originalEvent);
            }
        }
        catch (error) {
            this.dialogService.error(toErrorMessage(error));
        }
    }
    async handleExplorerDrop(data, target, targetIndex, targetSector, originalEvent) {
        const elementsData = FileDragAndDrop_1.getStatsFromDragAndDropData(data);
        const distinctItems = new Map(elementsData.map((element) => [element, this.isCollapsed(element)]));
        for (const [item, collapsed] of distinctItems) {
            if (collapsed) {
                const nestedChildren = item.nestedChildren;
                if (nestedChildren) {
                    for (const child of nestedChildren) {
                        // if parent is collapsed, then the nested children is considered collapsed to operate as a group
                        // and skip collapsed state check since they're not in the tree
                        distinctItems.set(child, true);
                    }
                }
            }
        }
        const items = distinctParents([...distinctItems.keys()], (s) => s.resource);
        const isCopy = (originalEvent.ctrlKey && !isMacintosh) || (originalEvent.altKey && isMacintosh);
        // Handle confirm setting
        const confirmDragAndDrop = !isCopy &&
            this.configurationService.getValue(FileDragAndDrop_1.CONFIRM_DND_SETTING_KEY);
        if (confirmDragAndDrop) {
            const message = items.length > 1 && items.every((s) => s.isRoot)
                ? localize('confirmRootsMove', 'Are you sure you want to change the order of multiple root folders in your workspace?')
                : items.length > 1
                    ? localize('confirmMultiMove', "Are you sure you want to move the following {0} files into '{1}'?", items.length, target.name)
                    : items[0].isRoot
                        ? localize('confirmRootMove', "Are you sure you want to change the order of root folder '{0}' in your workspace?", items[0].name)
                        : localize('confirmMove', "Are you sure you want to move '{0}' into '{1}'?", items[0].name, target.name);
            const detail = items.length > 1 && !items.every((s) => s.isRoot)
                ? getFileNamesMessage(items.map((i) => i.resource))
                : undefined;
            const confirmation = await this.dialogService.confirm({
                message,
                detail,
                checkbox: {
                    label: localize('doNotAskAgain', 'Do not ask me again'),
                },
                primaryButton: localize({ key: 'moveButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Move'),
            });
            if (!confirmation.confirmed) {
                return;
            }
            // Check for confirmation checkbox
            if (confirmation.checkboxChecked === true) {
                await this.configurationService.updateValue(FileDragAndDrop_1.CONFIRM_DND_SETTING_KEY, false);
            }
        }
        await this.doHandleRootDrop(items.filter((s) => s.isRoot), target, targetSector);
        const sources = items.filter((s) => !s.isRoot);
        if (isCopy) {
            return this.doHandleExplorerDropOnCopy(sources, target);
        }
        return this.doHandleExplorerDropOnMove(sources, target);
    }
    async doHandleRootDrop(roots, target, targetSector) {
        if (roots.length === 0) {
            return;
        }
        const folders = this.contextService.getWorkspace().folders;
        let targetIndex;
        const sourceIndices = [];
        const workspaceCreationData = [];
        const rootsToMove = [];
        for (let index = 0; index < folders.length; index++) {
            const data = {
                uri: folders[index].uri,
                name: folders[index].name,
            };
            // Is current target
            if (target instanceof ExplorerItem &&
                this.uriIdentityService.extUri.isEqual(folders[index].uri, target.resource)) {
                targetIndex = index;
            }
            // Is current source
            for (const root of roots) {
                if (this.uriIdentityService.extUri.isEqual(folders[index].uri, root.resource)) {
                    sourceIndices.push(index);
                    break;
                }
            }
            if (roots.every((r) => r.resource.toString() !== folders[index].uri.toString())) {
                workspaceCreationData.push(data);
            }
            else {
                rootsToMove.push(data);
            }
        }
        if (targetIndex === undefined) {
            targetIndex = workspaceCreationData.length;
        }
        else {
            switch (targetSector) {
                case 3 /* ListViewTargetSector.BOTTOM */:
                case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
                    targetIndex++;
                    break;
            }
            // Adjust target index if source was located before target.
            // The move will cause the index to change
            for (const sourceIndex of sourceIndices) {
                if (sourceIndex < targetIndex) {
                    targetIndex--;
                }
            }
        }
        workspaceCreationData.splice(targetIndex, 0, ...rootsToMove);
        return this.workspaceEditingService.updateFolders(0, workspaceCreationData.length, workspaceCreationData);
    }
    async doHandleExplorerDropOnCopy(sources, target) {
        // Reuse duplicate action when user copies
        const explorerConfig = this.configurationService.getValue().explorer;
        const resourceFileEdits = [];
        for (const { resource, isDirectory } of sources) {
            const allowOverwrite = explorerConfig.incrementalNaming === 'disabled';
            const newResource = await findValidPasteFileTarget(this.explorerService, this.fileService, this.dialogService, target, { resource, isDirectory, allowOverwrite }, explorerConfig.incrementalNaming);
            if (!newResource) {
                continue;
            }
            const resourceEdit = new ResourceFileEdit(resource, newResource, {
                copy: true,
                overwrite: allowOverwrite,
            });
            resourceFileEdits.push(resourceEdit);
        }
        const labelSuffix = getFileOrFolderLabelSuffix(sources);
        await this.explorerService.applyBulkEdit(resourceFileEdits, {
            confirmBeforeUndo: explorerConfig.confirmUndo === "default" /* UndoConfirmLevel.Default */ ||
                explorerConfig.confirmUndo === "verbose" /* UndoConfirmLevel.Verbose */,
            undoLabel: localize('copy', 'Copy {0}', labelSuffix),
            progressLabel: localize('copying', 'Copying {0}', labelSuffix),
        });
        const editors = resourceFileEdits
            .filter((edit) => {
            const item = edit.newResource
                ? this.explorerService.findClosest(edit.newResource)
                : undefined;
            return item && !item.isDirectory;
        })
            .map((edit) => ({ resource: edit.newResource, options: { pinned: true } }));
        await this.editorService.openEditors(editors);
    }
    async doHandleExplorerDropOnMove(sources, target) {
        // Do not allow moving readonly items
        const resourceFileEdits = sources
            .filter((source) => !source.isReadonly)
            .map((source) => new ResourceFileEdit(source.resource, joinPath(target.resource, source.name)));
        const labelSuffix = getFileOrFolderLabelSuffix(sources);
        const options = {
            confirmBeforeUndo: this.configurationService.getValue().explorer.confirmUndo ===
                "verbose" /* UndoConfirmLevel.Verbose */,
            undoLabel: localize('move', 'Move {0}', labelSuffix),
            progressLabel: localize('moving', 'Moving {0}', labelSuffix),
        };
        try {
            await this.explorerService.applyBulkEdit(resourceFileEdits, options);
        }
        catch (error) {
            // Conflict
            if (error.fileOperationResult === 4 /* FileOperationResult.FILE_MOVE_CONFLICT */) {
                const overwrites = [];
                for (const edit of resourceFileEdits) {
                    if (edit.newResource && (await this.fileService.exists(edit.newResource))) {
                        overwrites.push(edit.newResource);
                    }
                }
                // Move with overwrite if the user confirms
                const confirm = getMultipleFilesOverwriteConfirm(overwrites);
                const { confirmed } = await this.dialogService.confirm(confirm);
                if (confirmed) {
                    await this.explorerService.applyBulkEdit(resourceFileEdits.map((re) => new ResourceFileEdit(re.oldResource, re.newResource, { overwrite: true })), options);
                }
            }
            // Any other error: bubble up
            else {
                throw error;
            }
        }
    }
    static getStatsFromDragAndDropData(data, dragStartEvent) {
        if (data.context) {
            return data.context;
        }
        // Detect compressed folder dragging
        if (dragStartEvent && data.elements.length === 1) {
            data.context = [
                FileDragAndDrop_1.getCompressedStatFromDragEvent(data.elements[0], dragStartEvent),
            ];
            return data.context;
        }
        return data.elements;
    }
    static getCompressedStatFromDragEvent(stat, dragEvent) {
        const target = DOM.getWindow(dragEvent).document.elementFromPoint(dragEvent.clientX, dragEvent.clientY);
        const iconLabelName = getIconLabelNameFromHTMLElement(target);
        if (iconLabelName) {
            const { count, index } = iconLabelName;
            let i = count - 1;
            while (i > index && stat.parent) {
                stat = stat.parent;
                i--;
            }
            return stat;
        }
        return stat;
    }
    onDragEnd() {
        this.compressedDropTargetDisposable.dispose();
    }
    dispose() {
        this.compressedDropTargetDisposable.dispose();
    }
};
FileDragAndDrop = FileDragAndDrop_1 = __decorate([
    __param(1, IExplorerService),
    __param(2, IEditorService),
    __param(3, IDialogService),
    __param(4, IWorkspaceContextService),
    __param(5, IFileService),
    __param(6, IConfigurationService),
    __param(7, IInstantiationService),
    __param(8, IWorkspaceEditingService),
    __param(9, IUriIdentityService)
], FileDragAndDrop);
export { FileDragAndDrop };
function getIconLabelNameFromHTMLElement(target) {
    if (!DOM.isHTMLElement(target)) {
        return null;
    }
    let element = target;
    while (element && !element.classList.contains('monaco-list-row')) {
        if (element.classList.contains('label-name') && element.hasAttribute('data-icon-label-count')) {
            const count = Number(element.getAttribute('data-icon-label-count'));
            const index = Number(element.getAttribute('data-icon-label-index'));
            if (isNumber(count) && isNumber(index)) {
                return { element: element, count, index };
            }
        }
        element = element.parentElement;
    }
    return null;
}
export function isCompressedFolderName(target) {
    return !!getIconLabelNameFromHTMLElement(target);
}
export class ExplorerCompressionDelegate {
    isIncompressible(stat) {
        return (stat.isRoot ||
            !stat.isDirectory ||
            stat instanceof NewExplorerItem ||
            !stat.parent ||
            stat.parent.isRoot);
    }
}
function getFileOrFolderLabelSuffix(items) {
    if (items.length === 1) {
        return items[0].name;
    }
    if (items.every((i) => i.isDirectory)) {
        return localize('numberOfFolders', '{0} folders', items.length);
    }
    if (items.every((i) => !i.isDirectory)) {
        return localize('numberOfFiles', '{0} files', items.length);
    }
    return `${items.length} files and folders`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvdmlld3MvZXhwbG9yZXJWaWV3ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQTtBQU0xRCxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sWUFBWSxFQUNaLFFBQVEsR0FJUixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzlGLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsd0JBQXdCLEdBRXhCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUVOLFVBQVUsRUFDVixPQUFPLEVBQ1AsWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLHlDQUF5QyxDQUFBO0FBYWhELE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsbUJBQW1CLEdBQ25CLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sMEJBQTBCLEdBRzFCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUNOLE9BQU8sRUFDUCxRQUFRLEVBQ1IsZUFBZSxFQUNmLFlBQVksR0FDWixNQUFNLHlDQUF5QyxDQUFB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
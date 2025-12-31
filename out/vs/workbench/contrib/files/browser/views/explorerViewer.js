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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL3ZpZXdzL2V4cGxvcmVyVmlld2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFNMUQsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUNOLFlBQVksRUFDWixRQUFRLEdBSVIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM5RixPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLHdCQUF3QixHQUV4QixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFFTixVQUFVLEVBQ1YsT0FBTyxFQUNQLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSx5Q0FBeUMsQ0FBQTtBQWFoRCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLG1CQUFtQixHQUNuQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUNOLDBCQUEwQixHQUcxQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFDTixPQUFPLEVBQ1AsUUFBUSxFQUNSLGVBQWUsRUFDZixZQUFZLEdBQ1osTUFBTSx5Q0FBeUMsQ0FBQTtBQUNo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
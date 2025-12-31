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
var ExplorerService_1;
import { Event } from '../../../../base/common/event.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ExplorerItem, ExplorerModel } from '../common/explorerModel.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { dirname, basename } from '../../../../base/common/resources.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IBulkEditService, } from '../../../../editor/browser/services/bulkEditService.js';
import { UndoRedoSource } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ResourceGlobMatcher } from '../../../common/resources.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
export const UNDO_REDO_SOURCE = new UndoRedoSource();
let ExplorerService = class ExplorerService {
    static { ExplorerService_1 = this; }
    static { this.EXPLORER_FILE_CHANGES_REACT_DELAY = 500; } // delay in ms to react to file changes to give our internal events a chance to react first
    constructor(fileService, configurationService, contextService, clipboardService, editorService, uriIdentityService, bulkEditService, progressService, hostService, filesConfigurationService) {
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.clipboardService = clipboardService;
        this.editorService = editorService;
        this.uriIdentityService = uriIdentityService;
        this.bulkEditService = bulkEditService;
        this.progressService = progressService;
        this.filesConfigurationService = filesConfigurationService;
        this.disposables = new DisposableStore();
        this.fileChangeEvents = [];
        this.config = this.configurationService.getValue('explorer');
        this.model = new ExplorerModel(this.contextService, this.uriIdentityService, this.fileService, this.configurationService, this.filesConfigurationService);
        this.disposables.add(this.model);
        this.disposables.add(this.fileService.onDidRunOperation((e) => this.onDidRunOperation(e)));
        this.onFileChangesScheduler = new RunOnceScheduler(async () => {
            const events = this.fileChangeEvents;
            this.fileChangeEvents = [];
            // Filter to the ones we care
            const types = [2 /* FileChangeType.DELETED */];
            if (this.config.sortOrder === "modified" /* SortOrder.Modified */) {
                types.push(0 /* FileChangeType.UPDATED */);
            }
            let shouldRefresh = false;
            // For DELETED and UPDATED events go through the explorer model and check if any of the items got affected
            this.roots.forEach((r) => {
                if (this.view && !shouldRefresh) {
                    shouldRefresh = doesFileEventAffect(r, this.view, events, types);
                }
            });
            // For ADDED events we need to go through all the events and check if the explorer is already aware of some of them
            // Or if they affect not yet resolved parts of the explorer. If that is the case we will not refresh.
            events.forEach((e) => {
                if (!shouldRefresh) {
                    for (const resource of e.rawAdded) {
                        const parent = this.model.findClosest(dirname(resource));
                        // Parent of the added resource is resolved and the explorer model is not aware of the added resource - we need to refresh
                        if (parent && !parent.getChild(basename(resource))) {
                            shouldRefresh = true;
                            break;
                        }
                    }
                }
            });
            if (shouldRefresh) {
                await this.refresh(false);
            }
        }, ExplorerService_1.EXPLORER_FILE_CHANGES_REACT_DELAY);
        this.disposables.add(this.fileService.onDidFilesChange((e) => {
            this.fileChangeEvents.push(e);
            // Don't mess with the file tree while in the process of editing. #112293
            if (this.editable) {
                return;
            }
            if (!this.onFileChangesScheduler.isScheduled()) {
                this.onFileChangesScheduler.schedule();
            }
        }));
        this.disposables.add(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationUpdated(e)));
        this.disposables.add(Event.any(this.fileService.onDidChangeFileSystemProviderRegistrations, this.fileService.onDidChangeFileSystemProviderCapabilities)(async (e) => {
            let affected = false;
            this.model.roots.forEach((r) => {
                if (r.resource.scheme === e.scheme) {
                    affected = true;
                    r.forgetChildren();
                }
            });
            if (affected) {
                if (this.view) {
                    await this.view.setTreeInput();
                }
            }
        }));
        this.disposables.add(this.model.onDidChangeRoots(() => {
            this.view?.setTreeInput();
        }));
        // Refresh explorer when window gets focus to compensate for missing file events #126817
        this.disposables.add(hostService.onDidChangeFocus((hasFocus) => {
            if (hasFocus) {
                this.refresh(false);
            }
        }));
        this.revealExcludeMatcher = new ResourceGlobMatcher((uri) => getRevealExcludes(configurationService.getValue({ resource: uri })), (event) => event.affectsConfiguration('explorer.autoRevealExclude'), contextService, configurationService);
        this.disposables.add(this.revealExcludeMatcher);
    }
    get roots() {
        return this.model.roots;
    }
    get sortOrderConfiguration() {
        return {
            sortOrder: this.config.sortOrder,
            lexicographicOptions: this.config.sortOrderLexicographicOptions,
            reverse: this.config.sortOrderReverse,
        };
    }
    registerView(contextProvider) {
        this.view = contextProvider;
    }
    getContext(respectMultiSelection, ignoreNestedChildren = false) {
        if (!this.view) {
            return [];
        }
        const items = new Set(this.view.getContext(respectMultiSelection));
        items.forEach((item) => {
            try {
                if (respectMultiSelection &&
                    !ignoreNestedChildren &&
                    this.view?.isItemCollapsed(item) &&
                    item.nestedChildren) {
                    for (const child of item.nestedChildren) {
                        items.add(child);
                    }
                }
            }
            catch {
                // We will error out trying to resolve collapsed nodes that have not yet been resolved.
                // So we catch and ignore them in the multiSelect context
                return;
            }
        });
        return [...items];
    }
    async applyBulkEdit(edit, options) {
        const cancellationTokenSource = new CancellationTokenSource();
        const location = options.progressLocation ?? 10 /* ProgressLocation.Window */;
        let progressOptions;
        if (location === 10 /* ProgressLocation.Window */) {
            progressOptions = {
                location: location,
                title: options.progressLabel,
                cancellable: edit.length > 1,
            };
        }
        else {
            progressOptions = {
                location: location,
                title: options.progressLabel,
                cancellable: edit.length > 1,
                delay: 500,
            };
        }
        const promise = this.progressService.withProgress(progressOptions, async (progress) => {
            await this.bulkEditService.apply(edit, {
                undoRedoSource: UNDO_REDO_SOURCE,
                label: options.undoLabel,
                code: 'undoredo.explorerOperation',
                progress,
                token: cancellationTokenSource.token,
                confirmBeforeUndo: options.confirmBeforeUndo,
            });
        }, () => cancellationTokenSource.cancel());
        await this.progressService.withProgress({ location: 1 /* ProgressLocation.Explorer */, delay: 500 }, () => promise);
        cancellationTokenSource.dispose();
    }
    hasViewFocus() {
        return !!this.view && this.view.hasFocus();
    }
    // IExplorerService methods
    findClosest(resource) {
        return this.model.findClosest(resource);
    }
    findClosestRoot(resource) {
        const parentRoots = this.model.roots
            .filter((r) => this.uriIdentityService.extUri.isEqualOrParent(resource, r.resource))
            .sort((first, second) => second.resource.path.length - first.resource.path.length);
        return parentRoots.length ? parentRoots[0] : null;
    }
    async setEditable(stat, data) {
        if (!this.view) {
            return;
        }
        if (!data) {
            this.editable = undefined;
        }
        else {
            this.editable = { stat, data };
        }
        const isEditing = this.isEditable(stat);
        try {
            await this.view.setEditable(stat, isEditing);
        }
        catch {
            return;
        }
        if (!this.editable &&
            this.fileChangeEvents.length &&
            !this.onFileChangesScheduler.isScheduled()) {
            this.onFileChangesScheduler.schedule();
        }
    }
    async setToCopy(items, cut) {
        const previouslyCutItems = this.cutItems;
        this.cutItems = cut ? items : undefined;
        await this.clipboardService.writeResources(items.map((s) => s.resource));
        this.view?.itemsCopied(items, cut, previouslyCutItems);
    }
    isCut(item) {
        return (!!this.cutItems &&
            this.cutItems.some((i) => this.uriIdentityService.extUri.isEqual(i.resource, item.resource)));
    }
    getEditable() {
        return this.editable;
    }
    getEditableData(stat) {
        return this.editable && this.editable.stat === stat ? this.editable.data : undefined;
    }
    isEditable(stat) {
        return !!this.editable && (this.editable.stat === stat || !stat);
    }
    async select(resource, reveal) {
        if (!this.view) {
            return;
        }
        // If file or parent matches exclude patterns, do not reveal unless reveal argument is 'force'
        const ignoreRevealExcludes = reveal === 'force';
        const fileStat = this.findClosest(resource);
        if (fileStat) {
            if (!this.shouldAutoRevealItem(fileStat, ignoreRevealExcludes)) {
                return;
            }
            await this.view.selectResource(fileStat.resource, reveal);
            return Promise.resolve(undefined);
        }
        // Stat needs to be resolved first and then revealed
        const options = {
            resolveTo: [resource],
            resolveMetadata: this.config.sortOrder === "modified" /* SortOrder.Modified */,
        };
        const root = this.findClosestRoot(resource);
        if (!root) {
            return undefined;
        }
        try {
            const stat = await this.fileService.resolve(root.resource, options);
            // Convert to model
            const modelStat = ExplorerItem.create(this.fileService, this.configurationService, this.filesConfigurationService, stat, undefined, options.resolveTo);
            // Update Input with disk Stat
            ExplorerItem.mergeLocalWithDisk(modelStat, root);
            const item = root.find(resource);
            await this.view.refresh(true, root);
            // Once item is resolved, check again if folder should be expanded
            if (item && !this.shouldAutoRevealItem(item, ignoreRevealExcludes)) {
                return;
            }
            await this.view.selectResource(item ? item.resource : undefined, reveal);
        }
        catch (error) {
            root.error = error;
            await this.view.refresh(false, root);
        }
    }
    async refresh(reveal = true) {
        // Do not refresh the tree when it is showing temporary nodes (phantom elements)
        if (this.view?.hasPhantomElements()) {
            return;
        }
        this.model.roots.forEach((r) => r.forgetChildren());
        if (this.view) {
            await this.view.refresh(true);
            const resource = this.editorService.activeEditor?.resource;
            const autoReveal = this.configurationService.getValue().explorer.autoReveal;
            if (reveal && resource && autoReveal) {
                // We did a top level refresh, reveal the active file #67118
                this.select(resource, autoReveal);
            }
        }
    }
    // File events
    async onDidRunOperation(e) {
        // When nesting, changes to one file in a folder may impact the rendered structure
        // of all the folder's immediate children, thus a recursive refresh is needed.
        // Ideally the tree would be able to recusively refresh just one level but that does not yet exist.
        const shouldDeepRefresh = this.config.fileNesting.enabled;
        // Add
        if (e.isOperation(0 /* FileOperation.CREATE */) || e.isOperation(3 /* FileOperation.COPY */)) {
            const addedElement = e.target;
            const parentResource = dirname(addedElement.resource);
            const parents = this.model.findAll(parentResource);
            if (parents.length) {
                // Add the new file to its parent (Model)
                await Promise.all(parents.map(async (p) => {
                    // We have to check if the parent is resolved #29177
                    const resolveMetadata = this.config.sortOrder === `modified`;
                    if (!p.isDirectoryResolved) {
                        const stat = await this.fileService.resolve(p.resource, { resolveMetadata });
                        if (stat) {
                            const modelStat = ExplorerItem.create(this.fileService, this.configurationService, this.filesConfigurationService, stat, p.parent);
                            ExplorerItem.mergeLocalWithDisk(modelStat, p);
                        }
                    }
                    const childElement = ExplorerItem.create(this.fileService, this.configurationService, this.filesConfigurationService, addedElement, p.parent);
                    // Make sure to remove any previous version of the file if any
                    p.removeChild(childElement);
                    p.addChild(childElement);
                    // Refresh the Parent (View)
                    await this.view?.refresh(shouldDeepRefresh, p);
                }));
            }
        }
        // Move (including Rename)
        else if (e.isOperation(2 /* FileOperation.MOVE */)) {
            const oldResource = e.resource;
            const newElement = e.target;
            const oldParentResource = dirname(oldResource);
            const newParentResource = dirname(newElement.resource);
            const modelElements = this.model.findAll(oldResource);
            const sameParentMove = modelElements.every((e) => !e.nestedParent) &&
                this.uriIdentityService.extUri.isEqual(oldParentResource, newParentResource);
            // Handle Rename
            if (sameParentMove) {
                await Promise.all(modelElements.map(async (modelElement) => {
                    // Rename File (Model)
                    modelElement.rename(newElement);
                    await this.view?.refresh(shouldDeepRefresh, modelElement.parent);
                }));
            }
            // Handle Move
            else {
                const newParents = this.model.findAll(newParentResource);
                if (newParents.length && modelElements.length) {
                    // Move in Model
                    await Promise.all(modelElements.map(async (modelElement, index) => {
                        const oldParent = modelElement.parent;
                        const oldNestedParent = modelElement.nestedParent;
                        modelElement.move(newParents[index]);
                        if (oldNestedParent) {
                            await this.view?.refresh(false, oldNestedParent);
                        }
                        await this.view?.refresh(false, oldParent);
                        await this.view?.refresh(shouldDeepRefresh, newParents[index]);
                    }));
                }
            }
        }
        // Delete
        else if (e.isOperation(1 /* FileOperation.DELETE */)) {
            const modelElements = this.model.findAll(e.resource);
            await Promise.all(modelElements.map(async (modelElement) => {
                if (modelElement.parent) {
                    // Remove Element from Parent (Model)
                    const parent = modelElement.parent;
                    parent.removeChild(modelElement);
                    this.view?.focusNext();
                    const oldNestedParent = modelElement.nestedParent;
                    if (oldNestedParent) {
                        oldNestedParent.removeChild(modelElement);
                        await this.view?.refresh(false, oldNestedParent);
                    }
                    // Refresh Parent (View)
                    await this.view?.refresh(shouldDeepRefresh, parent);
                    if (this.view?.getFocus().length === 0) {
                        this.view?.focusLast();
                    }
                }
            }));
        }
    }
    // Check if an item matches a explorer.autoRevealExclude pattern
    shouldAutoRevealItem(item, ignore) {
        if (item === undefined || ignore) {
            return true;
        }
        if (this.revealExcludeMatcher.matches(item.resource, (name) => !!(item.parent && item.parent.getChild(name)))) {
            return false;
        }
        const root = item.root;
        let currentItem = item.parent;
        while (currentItem !== root) {
            if (currentItem === undefined) {
                return true;
            }
            if (this.revealExcludeMatcher.matches(currentItem.resource)) {
                return false;
            }
            currentItem = currentItem.parent;
        }
        return true;
    }
    async onConfigurationUpdated(event) {
        if (!event.affectsConfiguration('explorer')) {
            return;
        }
        let shouldRefresh = false;
        if (event.affectsConfiguration('explorer.fileNesting')) {
            shouldRefresh = true;
        }
        const configuration = this.configurationService.getValue();
        const configSortOrder = configuration?.explorer?.sortOrder || "default" /* SortOrder.Default */;
        if (this.config.sortOrder !== configSortOrder) {
            shouldRefresh = this.config.sortOrder !== undefined;
        }
        const configLexicographicOptions = configuration?.explorer?.sortOrderLexicographicOptions || "default" /* LexicographicOptions.Default */;
        if (this.config.sortOrderLexicographicOptions !== configLexicographicOptions) {
            shouldRefresh = shouldRefresh || this.config.sortOrderLexicographicOptions !== undefined;
        }
        const sortOrderReverse = configuration?.explorer?.sortOrderReverse || false;
        if (this.config.sortOrderReverse !== sortOrderReverse) {
            shouldRefresh = shouldRefresh || this.config.sortOrderReverse !== undefined;
        }
        this.config = configuration.explorer;
        if (shouldRefresh) {
            await this.refresh();
        }
    }
    dispose() {
        this.disposables.dispose();
    }
};
ExplorerService = ExplorerService_1 = __decorate([
    __param(0, IFileService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceContextService),
    __param(3, IClipboardService),
    __param(4, IEditorService),
    __param(5, IUriIdentityService),
    __param(6, IBulkEditService),
    __param(7, IProgressService),
    __param(8, IHostService),
    __param(9, IFilesConfigurationService)
], ExplorerService);
export { ExplorerService };
function doesFileEventAffect(item, view, events, types) {
    for (const [_name, child] of item.children) {
        if (view.isItemVisible(child)) {
            if (events.some((e) => e.contains(child.resource, ...types))) {
                return true;
            }
            if (child.isDirectory && child.isDirectoryResolved) {
                if (doesFileEventAffect(child, view, events, types)) {
                    return true;
                }
            }
        }
    }
    return false;
}
function getRevealExcludes(configuration) {
    const revealExcludes = configuration && configuration.explorer && configuration.explorer.autoRevealExclude;
    if (!revealExcludes) {
        return {};
    }
    return revealExcludes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9leHBsb3JlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFPdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUV4RSxPQUFPLEVBR04sWUFBWSxHQUlaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWpGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsT0FBTyxFQUNOLGdCQUFnQixHQUloQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFB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
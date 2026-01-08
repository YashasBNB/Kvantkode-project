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
import './outlinePane.css';
import * as dom from '../../../../base/browser/dom.js';
import { ProgressBar } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { TimeoutTimer, timeout } from '../../../../base/common/async.js';
import { toDisposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchDataTree } from '../../../../platform/list/browser/listService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { basename } from '../../../../base/common/resources.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { OutlineViewState } from './outlineViewState.js';
import { IOutlineService, } from '../../../services/outline/browser/outline.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { AbstractTreeViewState, TreeFindMode, } from '../../../../base/browser/ui/tree/abstractTree.js';
import { ctxAllCollapsed, ctxFilterOnType, ctxFocused, ctxFollowsCursor, ctxSortMode, } from './outline.js';
import { defaultProgressBarStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
class OutlineTreeSorter {
    constructor(_comparator, order) {
        this._comparator = _comparator;
        this.order = order;
    }
    compare(a, b) {
        if (this.order === 2 /* OutlineSortOrder.ByKind */) {
            return this._comparator.compareByType(a, b);
        }
        else if (this.order === 1 /* OutlineSortOrder.ByName */) {
            return this._comparator.compareByName(a, b);
        }
        else {
            return this._comparator.compareByPosition(a, b);
        }
    }
}
let OutlinePane = class OutlinePane extends ViewPane {
    static { this.Id = 'outline'; }
    constructor(options, _outlineService, _instantiationService, viewDescriptorService, _storageService, _editorService, configurationService, keybindingService, contextKeyService, contextMenuService, openerService, themeService, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, _instantiationService, openerService, themeService, hoverService);
        this._outlineService = _outlineService;
        this._instantiationService = _instantiationService;
        this._storageService = _storageService;
        this._editorService = _editorService;
        this._disposables = new DisposableStore();
        this._editorControlDisposables = new DisposableStore();
        this._editorPaneDisposables = new DisposableStore();
        this._outlineViewState = new OutlineViewState();
        this._editorListener = new MutableDisposable();
        this._treeStates = new LRUCache(10);
        this._editorControlChangePromise = Promise.resolve();
        this._outlineViewState.restore(this._storageService);
        this._disposables.add(this._outlineViewState);
        contextKeyService.bufferChangeEvents(() => {
            this._ctxFollowsCursor = ctxFollowsCursor.bindTo(contextKeyService);
            this._ctxFilterOnType = ctxFilterOnType.bindTo(contextKeyService);
            this._ctxSortMode = ctxSortMode.bindTo(contextKeyService);
            this._ctxAllCollapsed = ctxAllCollapsed.bindTo(contextKeyService);
        });
        const updateContext = () => {
            this._ctxFollowsCursor.set(this._outlineViewState.followCursor);
            this._ctxFilterOnType.set(this._outlineViewState.filterOnType);
            this._ctxSortMode.set(this._outlineViewState.sortBy);
        };
        updateContext();
        this._disposables.add(this._outlineViewState.onDidChange(updateContext));
    }
    dispose() {
        this._disposables.dispose();
        this._editorPaneDisposables.dispose();
        this._editorControlDisposables.dispose();
        this._editorListener.dispose();
        super.dispose();
    }
    focus() {
        this._editorControlChangePromise.then(() => {
            super.focus();
            this._tree?.domFocus();
        });
    }
    renderBody(container) {
        super.renderBody(container);
        this._domNode = container;
        container.classList.add('outline-pane');
        const progressContainer = dom.$('.outline-progress');
        this._message = dom.$('.outline-message');
        this._progressBar = new ProgressBar(progressContainer, defaultProgressBarStyles);
        this._treeContainer = dom.$('.outline-tree');
        dom.append(container, progressContainer, this._message, this._treeContainer);
        this._disposables.add(this.onDidChangeBodyVisibility((visible) => {
            if (!visible) {
                // stop everything when not visible
                this._editorListener.clear();
                this._editorPaneDisposables.clear();
                this._editorControlDisposables.clear();
            }
            else if (!this._editorListener.value) {
                const event = Event.any(this._editorService.onDidActiveEditorChange, this._outlineService.onDidChange);
                this._editorListener.value = event(() => this._handleEditorChanged(this._editorService.activeEditorPane));
                this._handleEditorChanged(this._editorService.activeEditorPane);
            }
        }));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this._tree?.layout(height, width);
        this._treeDimensions = new dom.Dimension(width, height);
    }
    collapseAll() {
        this._tree?.collapseAll();
    }
    expandAll() {
        this._tree?.expandAll();
    }
    get outlineViewState() {
        return this._outlineViewState;
    }
    _showMessage(message) {
        this._domNode.classList.add('message');
        this._progressBar.stop().hide();
        this._message.innerText = message;
    }
    _captureViewState(uri) {
        if (this._tree) {
            const oldOutline = this._tree.getInput();
            if (!uri) {
                uri = oldOutline?.uri;
            }
            if (oldOutline && uri) {
                this._treeStates.set(`${oldOutline.outlineKind}/${uri}`, this._tree.getViewState());
                return true;
            }
        }
        return false;
    }
    _handleEditorChanged(pane) {
        this._editorPaneDisposables.clear();
        if (pane) {
            // react to control changes from within pane (https://github.com/microsoft/vscode/issues/134008)
            this._editorPaneDisposables.add(pane.onDidChangeControl(() => {
                this._editorControlChangePromise = this._handleEditorControlChanged(pane);
            }));
        }
        this._editorControlChangePromise = this._handleEditorControlChanged(pane);
    }
    async _handleEditorControlChanged(pane) {
        // persist state
        const resource = EditorResourceAccessor.getOriginalUri(pane?.input);
        const didCapture = this._captureViewState();
        this._editorControlDisposables.clear();
        if (!pane || !this._outlineService.canCreateOutline(pane) || !resource) {
            return this._showMessage(localize('no-editor', 'The active editor cannot provide outline information.'));
        }
        let loadingMessage;
        if (!didCapture) {
            loadingMessage = new TimeoutTimer(() => {
                this._showMessage(localize('loading', "Loading document symbols for '{0}'...", basename(resource)));
            }, 100);
        }
        this._progressBar.infinite().show(500);
        const cts = new CancellationTokenSource();
        this._editorControlDisposables.add(toDisposable(() => cts.dispose(true)));
        const newOutline = await this._outlineService.createOutline(pane, 1 /* OutlineTarget.OutlinePane */, cts.token);
        loadingMessage?.dispose();
        if (!newOutline) {
            return;
        }
        if (cts.token.isCancellationRequested) {
            newOutline?.dispose();
            return;
        }
        this._editorControlDisposables.add(newOutline);
        this._progressBar.stop().hide();
        const sorter = new OutlineTreeSorter(newOutline.config.comparator, this._outlineViewState.sortBy);
        const tree = this._instantiationService.createInstance((WorkbenchDataTree), 'OutlinePane', this._treeContainer, newOutline.config.delegate, newOutline.config.renderers, newOutline.config.treeDataSource, {
            ...newOutline.config.options,
            sorter,
            expandOnDoubleClick: false,
            expandOnlyOnTwistieClick: true,
            multipleSelectionSupport: false,
            hideTwistiesOfChildlessElements: true,
            defaultFindMode: this._outlineViewState.filterOnType
                ? TreeFindMode.Filter
                : TreeFindMode.Highlight,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
        });
        ctxFocused.bindTo(tree.contextKeyService);
        // update tree, listen to changes
        const updateTree = () => {
            if (newOutline.isEmpty) {
                // no more elements
                this._showMessage(localize('no-symbols', "No symbols found in document '{0}'", basename(resource)));
                this._captureViewState(resource);
                tree.setInput(undefined);
            }
            else if (!tree.getInput()) {
                // first: init tree
                this._domNode.classList.remove('message');
                const state = this._treeStates.get(`${newOutline.outlineKind}/${newOutline.uri}`);
                tree.setInput(newOutline, state && AbstractTreeViewState.lift(state));
            }
            else {
                // update: refresh tree
                this._domNode.classList.remove('message');
                tree.updateChildren();
            }
        };
        updateTree();
        this._editorControlDisposables.add(newOutline.onDidChange(updateTree));
        tree.findMode = this._outlineViewState.filterOnType
            ? TreeFindMode.Filter
            : TreeFindMode.Highlight;
        // feature: apply panel background to tree
        this._editorControlDisposables.add(this.viewDescriptorService.onDidChangeLocation(({ views }) => {
            if (views.some((v) => v.id === this.id)) {
                tree.updateOptions({ overrideStyles: this.getLocationBasedColors().listOverrideStyles });
            }
        }));
        // feature: filter on type - keep tree and menu in sync
        this._editorControlDisposables.add(tree.onDidChangeFindMode((mode) => (this._outlineViewState.filterOnType = mode === TreeFindMode.Filter)));
        // feature: reveal outline selection in editor
        // on change -> reveal/select defining range
        let idPool = 0;
        this._editorControlDisposables.add(tree.onDidOpen(async (e) => {
            const myId = ++idPool;
            const isDoubleClick = e.browserEvent?.type === 'dblclick';
            if (!isDoubleClick) {
                // workaround for https://github.com/microsoft/vscode/issues/206424
                await timeout(150);
                if (myId !== idPool) {
                    return;
                }
            }
            await newOutline.reveal(e.element, e.editorOptions, e.sideBySide, isDoubleClick);
        }));
        // feature: reveal editor selection in outline
        const revealActiveElement = () => {
            if (!this._outlineViewState.followCursor || !newOutline.activeElement) {
                return;
            }
            let item = newOutline.activeElement;
            while (item) {
                const top = tree.getRelativeTop(item);
                if (top === null) {
                    // not visible -> reveal
                    tree.reveal(item, 0.5);
                }
                if (tree.getRelativeTop(item) !== null) {
                    tree.setFocus([item]);
                    tree.setSelection([item]);
                    break;
                }
                // STILL not visible -> try parent
                item = tree.getParentElement(item);
            }
        };
        revealActiveElement();
        this._editorControlDisposables.add(newOutline.onDidChange(revealActiveElement));
        // feature: update view when user state changes
        this._editorControlDisposables.add(this._outlineViewState.onDidChange((e) => {
            this._outlineViewState.persist(this._storageService);
            if (e.filterOnType) {
                tree.findMode = this._outlineViewState.filterOnType
                    ? TreeFindMode.Filter
                    : TreeFindMode.Highlight;
            }
            if (e.followCursor) {
                revealActiveElement();
            }
            if (e.sortBy) {
                sorter.order = this._outlineViewState.sortBy;
                tree.resort();
            }
        }));
        // feature: expand all nodes when filtering (not when finding)
        let viewState;
        this._editorControlDisposables.add(tree.onDidChangeFindPattern((pattern) => {
            if (tree.findMode === TreeFindMode.Highlight) {
                return;
            }
            if (!viewState && pattern) {
                viewState = tree.getViewState();
                tree.expandAll();
            }
            else if (!pattern && viewState) {
                tree.setInput(tree.getInput(), viewState);
                viewState = undefined;
            }
        }));
        // feature: update all-collapsed context key
        const updateAllCollapsedCtx = () => {
            this._ctxAllCollapsed.set(tree.getNode(null).children.every((node) => !node.collapsible || node.collapsed));
        };
        this._editorControlDisposables.add(tree.onDidChangeCollapseState(updateAllCollapsedCtx));
        this._editorControlDisposables.add(tree.onDidChangeModel(updateAllCollapsedCtx));
        updateAllCollapsedCtx();
        // last: set tree property and wire it up to one of our context keys
        tree.layout(this._treeDimensions?.height, this._treeDimensions?.width);
        this._tree = tree;
        this._editorControlDisposables.add(toDisposable(() => {
            tree.dispose();
            this._tree = undefined;
        }));
    }
};
OutlinePane = __decorate([
    __param(1, IOutlineService),
    __param(2, IInstantiationService),
    __param(3, IViewDescriptorService),
    __param(4, IStorageService),
    __param(5, IEditorService),
    __param(6, IConfigurationService),
    __param(7, IKeybindingService),
    __param(8, IContextKeyService),
    __param(9, IContextMenuService),
    __param(10, IOpenerService),
    __param(11, IThemeService),
    __param(12, IHoverService)
], OutlinePane);
export { OutlinePane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZVBhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL291dGxpbmUvYnJvd3Nlci9vdXRsaW5lUGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEUsT0FBTyxFQUVOLFlBQVksRUFDWixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsUUFB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
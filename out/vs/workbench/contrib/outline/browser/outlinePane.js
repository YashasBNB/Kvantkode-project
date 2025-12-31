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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZVBhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRsaW5lL2Jyb3dzZXIvb3V0bGluZVBhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxtQkFBbUIsQ0FBQTtBQUMxQixPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hFLE9BQU8sRUFFTixZQUFZLEVBQ1osZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFB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
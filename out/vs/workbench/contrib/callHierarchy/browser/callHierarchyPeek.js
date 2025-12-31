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
var CallHierarchyTreePeekWidget_1;
import './media/callHierarchy.css';
import * as peekView from '../../../../editor/contrib/peekView/browser/peekView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchAsyncDataTree, } from '../../../../platform/list/browser/listService.js';
import * as callHTree from './callHierarchyTree.js';
import { localize } from '../../../../nls.js';
import { Range } from '../../../../editor/common/core/range.js';
import { SplitView, Sizing } from '../../../../base/browser/ui/splitview/splitview.js';
import { Dimension, isKeyboardEvent } from '../../../../base/browser/dom.js';
import { Event } from '../../../../base/common/event.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { OverviewRulerLane, } from '../../../../editor/common/model.js';
import { themeColorFromId, IThemeService, } from '../../../../platform/theme/common/themeService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Color } from '../../../../base/common/color.js';
import { TreeMouseEventTarget } from '../../../../base/browser/ui/tree/tree.js';
import { MenuId, IMenuService } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
var State;
(function (State) {
    State["Loading"] = "loading";
    State["Message"] = "message";
    State["Data"] = "data";
})(State || (State = {}));
class LayoutInfo {
    static store(info, storageService) {
        storageService.store('callHierarchyPeekLayout', JSON.stringify(info), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    static retrieve(storageService) {
        const value = storageService.get('callHierarchyPeekLayout', 0 /* StorageScope.PROFILE */, '{}');
        const defaultInfo = { ratio: 0.7, height: 17 };
        try {
            return { ...defaultInfo, ...JSON.parse(value) };
        }
        catch {
            return defaultInfo;
        }
    }
    constructor(ratio, height) {
        this.ratio = ratio;
        this.height = height;
    }
}
class CallHierarchyTree extends WorkbenchAsyncDataTree {
}
let CallHierarchyTreePeekWidget = class CallHierarchyTreePeekWidget extends peekView.PeekViewWidget {
    static { CallHierarchyTreePeekWidget_1 = this; }
    static { this.TitleMenu = new MenuId('callhierarchy/title'); }
    constructor(editor, _where, _direction, themeService, _peekViewService, _editorService, _textModelService, _storageService, _menuService, _contextKeyService, _instantiationService) {
        super(editor, { showFrame: true, showArrow: true, isResizeable: true, isAccessible: true }, _instantiationService);
        this._where = _where;
        this._direction = _direction;
        this._peekViewService = _peekViewService;
        this._editorService = _editorService;
        this._textModelService = _textModelService;
        this._storageService = _storageService;
        this._menuService = _menuService;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._treeViewStates = new Map();
        this._previewDisposable = new DisposableStore();
        this.create();
        this._peekViewService.addExclusiveWidget(editor, this);
        this._applyTheme(themeService.getColorTheme());
        this._disposables.add(themeService.onDidColorThemeChange(this._applyTheme, this));
        this._disposables.add(this._previewDisposable);
    }
    dispose() {
        LayoutInfo.store(this._layoutInfo, this._storageService);
        this._splitView.dispose();
        this._tree.dispose();
        this._editor.dispose();
        super.dispose();
    }
    get direction() {
        return this._direction;
    }
    _applyTheme(theme) {
        const borderColor = theme.getColor(peekView.peekViewBorder) || Color.transparent;
        this.style({
            arrowColor: borderColor,
            frameColor: borderColor,
            headerBackgroundColor: theme.getColor(peekView.peekViewTitleBackground) || Color.transparent,
            primaryHeadingColor: theme.getColor(peekView.peekViewTitleForeground),
            secondaryHeadingColor: theme.getColor(peekView.peekViewTitleInfoForeground),
        });
    }
    _fillHead(container) {
        super._fillHead(container, true);
        const menu = this._menuService.createMenu(CallHierarchyTreePeekWidget_1.TitleMenu, this._contextKeyService);
        const updateToolbar = () => {
            const actions = getFlatActionBarActions(menu.getActions());
            this._actionbarWidget.clear();
            this._actionbarWidget.push(actions, { label: false, icon: true });
        };
        this._disposables.add(menu);
        this._disposables.add(menu.onDidChange(updateToolbar));
        updateToolbar();
    }
    _fillBody(parent) {
        this._layoutInfo = LayoutInfo.retrieve(this._storageService);
        this._dim = new Dimension(0, 0);
        this._parent = parent;
        parent.classList.add('call-hierarchy');
        const message = document.createElement('div');
        message.classList.add('message');
        parent.appendChild(message);
        this._message = message;
        this._message.tabIndex = 0;
        const container = document.createElement('div');
        container.classList.add('results');
        parent.appendChild(container);
        this._splitView = new SplitView(container, { orientation: 1 /* Orientation.HORIZONTAL */ });
        // editor stuff
        const editorContainer = document.createElement('div');
        editorContainer.classList.add('editor');
        container.appendChild(editorContainer);
        const editorOptions = {
            scrollBeyondLastLine: false,
            scrollbar: {
                verticalScrollbarSize: 14,
                horizontal: 'auto',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                alwaysConsumeMouseWheel: false,
            },
            overviewRulerLanes: 2,
            fixedOverflowWidgets: true,
            minimap: {
                enabled: false,
            },
        };
        this._editor = this._instantiationService.createInstance(EmbeddedCodeEditorWidget, editorContainer, editorOptions, {}, this.editor);
        // tree stuff
        const treeContainer = document.createElement('div');
        treeContainer.classList.add('tree');
        container.appendChild(treeContainer);
        const options = {
            sorter: new callHTree.Sorter(),
            accessibilityProvider: new callHTree.AccessibilityProvider(() => this._direction),
            identityProvider: new callHTree.IdentityProvider(() => this._direction),
            expandOnlyOnTwistieClick: true,
            overrideStyles: {
                listBackground: peekView.peekViewResultsBackground,
            },
        };
        this._tree = this._instantiationService.createInstance(CallHierarchyTree, 'CallHierarchyPeek', treeContainer, new callHTree.VirtualDelegate(), [this._instantiationService.createInstance(callHTree.CallRenderer)], this._instantiationService.createInstance(callHTree.DataSource, () => this._direction), options);
        // split stuff
        this._splitView.addView({
            onDidChange: Event.None,
            element: editorContainer,
            minimumSize: 200,
            maximumSize: Number.MAX_VALUE,
            layout: (width) => {
                if (this._dim.height) {
                    this._editor.layout({ height: this._dim.height, width });
                }
            },
        }, Sizing.Distribute);
        this._splitView.addView({
            onDidChange: Event.None,
            element: treeContainer,
            minimumSize: 100,
            maximumSize: Number.MAX_VALUE,
            layout: (width) => {
                if (this._dim.height) {
                    this._tree.layout(this._dim.height, width);
                }
            },
        }, Sizing.Distribute);
        this._disposables.add(this._splitView.onDidSashChange(() => {
            if (this._dim.width) {
                this._layoutInfo.ratio = this._splitView.getViewSize(0) / this._dim.width;
            }
        }));
        // update editor
        this._disposables.add(this._tree.onDidChangeFocus(this._updatePreview, this));
        this._disposables.add(this._editor.onMouseDown((e) => {
            const { event, target } = e;
            if (event.detail !== 2) {
                return;
            }
            const [focus] = this._tree.getFocus();
            if (!focus) {
                return;
            }
            this.dispose();
            this._editorService.openEditor({
                resource: focus.item.uri,
                options: { selection: target.range },
            });
        }));
        this._disposables.add(this._tree.onMouseDblClick((e) => {
            if (e.target === TreeMouseEventTarget.Twistie) {
                return;
            }
            if (e.element) {
                this.dispose();
                this._editorService.openEditor({
                    resource: e.element.item.uri,
                    options: { selection: e.element.item.selectionRange, pinned: true },
                });
            }
        }));
        this._disposables.add(this._tree.onDidChangeSelection((e) => {
            const [element] = e.elements;
            // don't close on click
            if (element && isKeyboardEvent(e.browserEvent)) {
                this.dispose();
                this._editorService.openEditor({
                    resource: element.item.uri,
                    options: { selection: element.item.selectionRange, pinned: true },
                });
            }
        }));
    }
    async _updatePreview() {
        const [element] = this._tree.getFocus();
        if (!element) {
            return;
        }
        this._previewDisposable.clear();
        // update: editor and editor highlights
        const options = {
            description: 'call-hierarchy-decoration',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            className: 'call-decoration',
            overviewRuler: {
                color: themeColorFromId(peekView.peekViewEditorMatchHighlight),
                position: OverviewRulerLane.Center,
            },
        };
        let previewUri;
        if (this._direction === "outgoingCalls" /* CallHierarchyDirection.CallsFrom */) {
            // outgoing calls: show caller and highlight focused calls
            previewUri = element.parent ? element.parent.item.uri : element.model.root.uri;
        }
        else {
            // incoming calls: show caller and highlight focused calls
            previewUri = element.item.uri;
        }
        const value = await this._textModelService.createModelReference(previewUri);
        this._editor.setModel(value.object.textEditorModel);
        // set decorations for caller ranges (if in the same file)
        const decorations = [];
        let fullRange;
        let locations = element.locations;
        if (!locations) {
            locations = [{ uri: element.item.uri, range: element.item.selectionRange }];
        }
        for (const loc of locations) {
            if (loc.uri.toString() === previewUri.toString()) {
                decorations.push({ range: loc.range, options });
                fullRange = !fullRange ? loc.range : Range.plusRange(loc.range, fullRange);
            }
        }
        if (fullRange) {
            this._editor.revealRangeInCenter(fullRange, 1 /* ScrollType.Immediate */);
            const decorationsCollection = this._editor.createDecorationsCollection(decorations);
            this._previewDisposable.add(toDisposable(() => decorationsCollection.clear()));
        }
        this._previewDisposable.add(value);
        // update: title
        const title = this._direction === "outgoingCalls" /* CallHierarchyDirection.CallsFrom */
            ? localize('callFrom', "Calls from '{0}'", element.model.root.name)
            : localize('callsTo', "Callers of '{0}'", element.model.root.name);
        this.setTitle(title);
    }
    showLoading() {
        this._parent.dataset['state'] = "loading" /* State.Loading */;
        this.setTitle(localize('title.loading', 'Loading...'));
        this._show();
    }
    showMessage(message) {
        this._parent.dataset['state'] = "message" /* State.Message */;
        this.setTitle('');
        this.setMetaTitle('');
        this._message.innerText = message;
        this._show();
        this._message.focus();
    }
    async showModel(model) {
        this._show();
        const viewState = this._treeViewStates.get(this._direction);
        await this._tree.setInput(model, viewState);
        const root = this._tree.getNode(model).children[0];
        await this._tree.expand(root.element);
        if (root.children.length === 0) {
            //
            this.showMessage(this._direction === "outgoingCalls" /* CallHierarchyDirection.CallsFrom */
                ? localize('empt.callsFrom', "No calls from '{0}'", model.root.name)
                : localize('empt.callsTo', "No callers of '{0}'", model.root.name));
        }
        else {
            this._parent.dataset['state'] = "data" /* State.Data */;
            if (!viewState || this._tree.getFocus().length === 0) {
                this._tree.setFocus([root.children[0].element]);
            }
            this._tree.domFocus();
            this._updatePreview();
        }
    }
    getModel() {
        return this._tree.getInput();
    }
    getFocused() {
        return this._tree.getFocus()[0];
    }
    async updateDirection(newDirection) {
        const model = this._tree.getInput();
        if (model && newDirection !== this._direction) {
            this._treeViewStates.set(this._direction, this._tree.getViewState());
            this._direction = newDirection;
            await this.showModel(model);
        }
    }
    _show() {
        if (!this._isShowing) {
            this.editor.revealLineInCenterIfOutsideViewport(this._where.lineNumber, 0 /* ScrollType.Smooth */);
            super.show(Range.fromPositions(this._where), this._layoutInfo.height);
        }
    }
    _onWidth(width) {
        if (this._dim) {
            this._doLayoutBody(this._dim.height, width);
        }
    }
    _doLayoutBody(height, width) {
        if (this._dim.height !== height || this._dim.width !== width) {
            super._doLayoutBody(height, width);
            this._dim = new Dimension(width, height);
            this._layoutInfo.height = this._viewZone
                ? this._viewZone.heightInLines
                : this._layoutInfo.height;
            this._splitView.layout(width);
            this._splitView.resizeView(0, width * this._layoutInfo.ratio);
        }
    }
};
CallHierarchyTreePeekWidget = CallHierarchyTreePeekWidget_1 = __decorate([
    __param(3, IThemeService),
    __param(4, peekView.IPeekViewService),
    __param(5, IEditorService),
    __param(6, ITextModelService),
    __param(7, IStorageService),
    __param(8, IMenuService),
    __param(9, IContextKeyService),
    __param(10, IInstantiationService)
], CallHierarchyTreePeekWidget);
export { CallHierarchyTreePeekWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbEhpZXJhcmNoeVBlZWsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jYWxsSGllcmFyY2h5L2Jyb3dzZXIvY2FsbEhpZXJhcmNoeVBlZWsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxLQUFLLFFBQVEsTUFBTSx5REFBeUQsQ0FBQTtBQUVuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBQ04sc0JBQXNCLEdBRXRCLE1BQU0sa0RBQWtELENBQUE7QUFFekQsT0FBTyxLQUFLLFNBQVMsTUFBTSx3QkFBd0IsQ0FBQTtBQUVuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxTQUFTLEVBQWUsTUFBTSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBRW5ILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEYsT0FBTyxFQUlOLGlCQUFpQixHQUNqQixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFD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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbEhpZXJhcmNoeVBlZWsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NhbGxIaWVyYXJjaHkvYnJvd3Nlci9jYWxsSGllcmFyY2h5UGVlay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEtBQUssUUFBUSxNQUFNLHlEQUF5RCxDQUFBO0FBRW5GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFDTixzQkFBc0IsR0FFdEIsTUFBTSxrREFBa0QsQ0FBQTtBQUV6RCxPQUFPLEtBQUssU0FBUyxNQUFNLHdCQUF3QixDQUFBO0FBRW5ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFNBQVMsRUFBZSxNQUFNLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFFbkgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBSU4saUJBQWlCLEdBQ2pCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FB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
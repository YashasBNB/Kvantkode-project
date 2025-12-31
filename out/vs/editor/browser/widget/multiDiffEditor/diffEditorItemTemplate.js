var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, derived, globalTransaction, observableValue, } from '../../../../base/common/observable.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { observableCodeEditor } from '../../observableCodeEditor.js';
import { DiffEditorWidget } from '../diffEditor/diffEditorWidget.js';
import { ActionRunnerWithContext } from './utils.js';
export class TemplateData {
    constructor(viewModel, deltaScrollVertical) {
        this.viewModel = viewModel;
        this.deltaScrollVertical = deltaScrollVertical;
    }
    getId() {
        return this.viewModel;
    }
}
let DiffEditorItemTemplate = class DiffEditorItemTemplate extends Disposable {
    constructor(_container, _overflowWidgetsDomNode, _workbenchUIElementFactory, _instantiationService, _parentContextKeyService) {
        super();
        this._container = _container;
        this._overflowWidgetsDomNode = _overflowWidgetsDomNode;
        this._workbenchUIElementFactory = _workbenchUIElementFactory;
        this._instantiationService = _instantiationService;
        this._viewModel = observableValue(this, undefined);
        this._collapsed = derived(this, (reader) => this._viewModel.read(reader)?.collapsed.read(reader));
        this._editorContentHeight = observableValue(this, 500);
        this.contentHeight = derived(this, (reader) => {
            const h = this._collapsed.read(reader) ? 0 : this._editorContentHeight.read(reader);
            return h + this._outerEditorHeight;
        });
        this._modifiedContentWidth = observableValue(this, 0);
        this._modifiedWidth = observableValue(this, 0);
        this._originalContentWidth = observableValue(this, 0);
        this._originalWidth = observableValue(this, 0);
        this.maxScroll = derived(this, (reader) => {
            const scroll1 = this._modifiedContentWidth.read(reader) - this._modifiedWidth.read(reader);
            const scroll2 = this._originalContentWidth.read(reader) - this._originalWidth.read(reader);
            if (scroll1 > scroll2) {
                return { maxScroll: scroll1, width: this._modifiedWidth.read(reader) };
            }
            else {
                return { maxScroll: scroll2, width: this._originalWidth.read(reader) };
            }
        });
        this._elements = h('div.multiDiffEntry', [
            h('div.header@header', [
                h('div.header-content', [
                    h('div.collapse-button@collapseButton'),
                    h('div.file-path', [
                        h('div.title.modified.show-file-icons@primaryPath', []),
                        h('div.status.deleted@status', ['R']),
                        h('div.title.original.show-file-icons@secondaryPath', []),
                    ]),
                    h('div.actions@actions'),
                ]),
            ]),
            h('div.editorParent', [h('div.editorContainer@editor')]),
        ]);
        this.editor = this._register(this._instantiationService.createInstance(DiffEditorWidget, this._elements.editor, {
            overflowWidgetsDomNode: this._overflowWidgetsDomNode,
        }, {}));
        this.isModifedFocused = observableCodeEditor(this.editor.getModifiedEditor())
            .isFocused;
        this.isOriginalFocused = observableCodeEditor(this.editor.getOriginalEditor())
            .isFocused;
        this.isFocused = derived(this, (reader) => this.isModifedFocused.read(reader) || this.isOriginalFocused.read(reader));
        this._resourceLabel = this._workbenchUIElementFactory.createResourceLabel
            ? this._register(this._workbenchUIElementFactory.createResourceLabel(this._elements.primaryPath))
            : undefined;
        this._resourceLabel2 = this._workbenchUIElementFactory.createResourceLabel
            ? this._register(this._workbenchUIElementFactory.createResourceLabel(this._elements.secondaryPath))
            : undefined;
        this._dataStore = this._register(new DisposableStore());
        this._headerHeight = 40;
        this._lastScrollTop = -1;
        this._isSettingScrollTop = false;
        const btn = new Button(this._elements.collapseButton, {});
        this._register(autorun((reader) => {
            btn.element.className = '';
            btn.icon = this._collapsed.read(reader) ? Codicon.chevronRight : Codicon.chevronDown;
        }));
        this._register(btn.onDidClick(() => {
            this._viewModel.get()?.collapsed.set(!this._collapsed.get(), undefined);
        }));
        this._register(autorun((reader) => {
            this._elements.editor.style.display = this._collapsed.read(reader) ? 'none' : 'block';
        }));
        this._register(this.editor.getModifiedEditor().onDidLayoutChange((e) => {
            const width = this.editor.getModifiedEditor().getLayoutInfo().contentWidth;
            this._modifiedWidth.set(width, undefined);
        }));
        this._register(this.editor.getOriginalEditor().onDidLayoutChange((e) => {
            const width = this.editor.getOriginalEditor().getLayoutInfo().contentWidth;
            this._originalWidth.set(width, undefined);
        }));
        this._register(this.editor.onDidContentSizeChange((e) => {
            globalTransaction((tx) => {
                this._editorContentHeight.set(e.contentHeight, tx);
                this._modifiedContentWidth.set(this.editor.getModifiedEditor().getContentWidth(), tx);
                this._originalContentWidth.set(this.editor.getOriginalEditor().getContentWidth(), tx);
            });
        }));
        this._register(this.editor.getOriginalEditor().onDidScrollChange((e) => {
            if (this._isSettingScrollTop) {
                return;
            }
            if (!e.scrollTopChanged || !this._data) {
                return;
            }
            const delta = e.scrollTop - this._lastScrollTop;
            this._data.deltaScrollVertical(delta);
        }));
        this._register(autorun((reader) => {
            const isActive = this._viewModel.read(reader)?.isActive.read(reader);
            this._elements.root.classList.toggle('active', isActive);
        }));
        this._container.appendChild(this._elements.root);
        this._outerEditorHeight = this._headerHeight;
        this._contextKeyService = this._register(_parentContextKeyService.createScoped(this._elements.actions));
        const instantiationService = this._register(this._instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        this._register(instantiationService.createInstance(MenuWorkbenchToolBar, this._elements.actions, MenuId.MultiDiffEditorFileToolbar, {
            actionRunner: this._register(new ActionRunnerWithContext(() => this._viewModel.get()?.modifiedUri)),
            menuOptions: {
                shouldForwardArgs: true,
            },
            toolbarOptions: { primaryGroup: (g) => g.startsWith('navigation') },
            actionViewItemProvider: (action, options) => createActionViewItem(instantiationService, action, options),
        }));
    }
    setScrollLeft(left) {
        if (this._modifiedContentWidth.get() - this._modifiedWidth.get() >
            this._originalContentWidth.get() - this._originalWidth.get()) {
            this.editor.getModifiedEditor().setScrollLeft(left);
        }
        else {
            this.editor.getOriginalEditor().setScrollLeft(left);
        }
    }
    setData(data) {
        this._data = data;
        function updateOptions(options) {
            return {
                ...options,
                scrollBeyondLastLine: false,
                hideUnchangedRegions: {
                    enabled: true,
                },
                scrollbar: {
                    vertical: 'hidden',
                    horizontal: 'hidden',
                    handleMouseWheel: false,
                    useShadows: false,
                },
                renderOverviewRuler: false,
                fixedOverflowWidgets: true,
                overviewRulerBorder: false,
            };
        }
        if (!data) {
            globalTransaction((tx) => {
                this._viewModel.set(undefined, tx);
                this.editor.setDiffModel(null, tx);
                this._dataStore.clear();
            });
            return;
        }
        const value = data.viewModel.documentDiffItem;
        globalTransaction((tx) => {
            this._resourceLabel?.setUri(data.viewModel.modifiedUri ?? data.viewModel.originalUri, {
                strikethrough: data.viewModel.modifiedUri === undefined,
            });
            let isRenamed = false;
            let isDeleted = false;
            let isAdded = false;
            let flag = '';
            if (data.viewModel.modifiedUri &&
                data.viewModel.originalUri &&
                data.viewModel.modifiedUri.path !== data.viewModel.originalUri.path) {
                flag = 'R';
                isRenamed = true;
            }
            else if (!data.viewModel.modifiedUri) {
                flag = 'D';
                isDeleted = true;
            }
            else if (!data.viewModel.originalUri) {
                flag = 'A';
                isAdded = true;
            }
            this._elements.status.classList.toggle('renamed', isRenamed);
            this._elements.status.classList.toggle('deleted', isDeleted);
            this._elements.status.classList.toggle('added', isAdded);
            this._elements.status.innerText = flag;
            this._resourceLabel2?.setUri(isRenamed ? data.viewModel.originalUri : undefined, {
                strikethrough: true,
            });
            this._dataStore.clear();
            this._viewModel.set(data.viewModel, tx);
            this.editor.setDiffModel(data.viewModel.diffEditorViewModelRef, tx);
            this.editor.updateOptions(updateOptions(value.options ?? {}));
        });
        if (value.onOptionsDidChange) {
            this._dataStore.add(value.onOptionsDidChange(() => {
                this.editor.updateOptions(updateOptions(value.options ?? {}));
            }));
        }
        data.viewModel.isAlive.recomputeInitiallyAndOnChange(this._dataStore, (value) => {
            if (!value) {
                this.setData(undefined);
            }
        });
        if (data.viewModel.documentDiffItem.contextKeys) {
            for (const [key, value] of Object.entries(data.viewModel.documentDiffItem.contextKeys)) {
                this._contextKeyService.createKey(key, value);
            }
        }
    }
    render(verticalRange, width, editorScroll, viewPort) {
        this._elements.root.style.visibility = 'visible';
        this._elements.root.style.top = `${verticalRange.start}px`;
        this._elements.root.style.height = `${verticalRange.length}px`;
        this._elements.root.style.width = `${width}px`;
        this._elements.root.style.position = 'absolute';
        // For sticky scroll
        const maxDelta = verticalRange.length - this._headerHeight;
        const delta = Math.max(0, Math.min(viewPort.start - verticalRange.start, maxDelta));
        this._elements.header.style.transform = `translateY(${delta}px)`;
        globalTransaction((tx) => {
            this.editor.layout({
                width: width - 2 * 8 - 2 * 1,
                height: verticalRange.length - this._outerEditorHeight,
            });
        });
        try {
            this._isSettingScrollTop = true;
            this._lastScrollTop = editorScroll;
            this.editor.getOriginalEditor().setScrollTop(editorScroll);
        }
        finally {
            this._isSettingScrollTop = false;
        }
        this._elements.header.classList.toggle('shadow', delta > 0 || editorScroll > 0);
        this._elements.header.classList.toggle('collapsed', delta === maxDelta);
    }
    hide() {
        this._elements.root.style.top = `-100000px`;
        this._elements.root.style.visibility = 'hidden'; // Some editor parts are still visible
    }
};
DiffEditorItemTemplate = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextKeyService)
], DiffEditorItemTemplate);
export { DiffEditorItemTemplate };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckl0ZW1UZW1wbGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9tdWx0aURpZmZFZGl0b3IvZGlmZkVkaXRvckl0ZW1UZW1wbGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFDTixPQUFPLEVBQ1AsT0FBTyxFQUNQLGlCQUFpQixFQUNqQixlQUFlLEdBQ2YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdkUsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBR2xHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBR3BFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUdw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RyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN4RSxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNsQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtRQUN0RixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN2RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUMsYUFBYSxFQUFFLENBQUMsWUFBWSxDQUFBO1lBQzFFLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN2RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUMsYUFBYSxFQUFFLENBQUMsWUFBWSxDQUFBO1lBQzFFLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUMs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
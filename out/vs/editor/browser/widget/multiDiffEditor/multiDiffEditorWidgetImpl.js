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
import { getWindow, h, scheduleAtNextAnimationFrame, } from '../../../../base/browser/dom.js';
import { SmoothScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { compareBy, numberComparator } from '../../../../base/common/arrays.js';
import { findFirstMax } from '../../../../base/common/arraysFind.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, derivedWithStore, disposableObservableValue, globalTransaction, observableFromEvent, observableValue, transaction, } from '../../../../base/common/observable.js';
import { Scrollable } from '../../../../base/common/scrollable.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { OffsetRange } from '../../../common/core/offsetRange.js';
import { Selection } from '../../../common/core/selection.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ObservableElementSizeObserver } from '../diffEditor/utils.js';
import { DiffEditorItemTemplate, TemplateData } from './diffEditorItemTemplate.js';
import { ObjectPool } from './objectPool.js';
import './style.css';
let MultiDiffEditorWidgetImpl = class MultiDiffEditorWidgetImpl extends Disposable {
    constructor(_element, _dimension, _viewModel, _workbenchUIElementFactory, _parentContextKeyService, _parentInstantiationService) {
        super();
        this._element = _element;
        this._dimension = _dimension;
        this._viewModel = _viewModel;
        this._workbenchUIElementFactory = _workbenchUIElementFactory;
        this._parentContextKeyService = _parentContextKeyService;
        this._parentInstantiationService = _parentInstantiationService;
        this._scrollableElements = h('div.scrollContent', [
            h('div@content', {
                style: {
                    overflow: 'hidden',
                },
            }),
            h('div.monaco-editor@overflowWidgetsDomNode', {}),
        ]);
        this._scrollable = this._register(new Scrollable({
            forceIntegerValues: false,
            scheduleAtNextAnimationFrame: (cb) => scheduleAtNextAnimationFrame(getWindow(this._element), cb),
            smoothScrollDuration: 100,
        }));
        this._scrollableElement = this._register(new SmoothScrollableElement(this._scrollableElements.root, {
            vertical: 1 /* ScrollbarVisibility.Auto */,
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            useShadows: false,
        }, this._scrollable));
        this._elements = h('div.monaco-component.multiDiffEditor', {}, [
            h('div', {}, [this._scrollableElement.getDomNode()]),
            h('div.placeholder@placeholder', {}, [h('div')]),
        ]);
        this._sizeObserver = this._register(new ObservableElementSizeObserver(this._element, undefined));
        this._objectPool = this._register(new ObjectPool((data) => {
            const template = this._instantiationService.createInstance(DiffEditorItemTemplate, this._scrollableElements.content, this._scrollableElements.overflowWidgetsDomNode, this._workbenchUIElementFactory);
            template.setData(data);
            return template;
        }));
        this.scrollTop = observableFromEvent(this, this._scrollableElement.onScroll, () => /** @description scrollTop */ this._scrollableElement.getScrollPosition().scrollTop);
        this.scrollLeft = observableFromEvent(this, this._scrollableElement.onScroll, () => /** @description scrollLeft */ this._scrollableElement.getScrollPosition().scrollLeft);
        this._viewItemsInfo = derivedWithStore(this, (reader, store) => {
            const vm = this._viewModel.read(reader);
            if (!vm) {
                return {
                    items: [],
                    getItem: (_d) => {
                        throw new BugIndicatingError();
                    },
                };
            }
            const viewModels = vm.items.read(reader);
            const map = new Map();
            const items = viewModels.map((d) => {
                const item = store.add(new VirtualizedViewItem(d, this._objectPool, this.scrollLeft, (delta) => {
                    this._scrollableElement.setScrollPosition({
                        scrollTop: this._scrollableElement.getScrollPosition().scrollTop + delta,
                    });
                }));
                const data = this._lastDocStates?.[item.getKey()];
                if (data) {
                    transaction((tx) => {
                        item.setViewState(data, tx);
                    });
                }
                map.set(d, item);
                return item;
            });
            return { items, getItem: (d) => map.get(d) };
        });
        this._viewItems = this._viewItemsInfo.map(this, (items) => items.items);
        this._spaceBetweenPx = 0;
        this._totalHeight = this._viewItems.map(this, (items, reader) => items.reduce((r, i) => r + i.contentHeight.read(reader) + this._spaceBetweenPx, 0));
        this.activeControl = derived(this, (reader) => {
            const activeDiffItem = this._viewModel.read(reader)?.activeDiffItem.read(reader);
            if (!activeDiffItem) {
                return undefined;
            }
            const viewItem = this._viewItemsInfo.read(reader).getItem(activeDiffItem);
            return viewItem.template.read(reader)?.editor;
        });
        this._contextKeyService = this._register(this._parentContextKeyService.createScoped(this._element));
        this._instantiationService = this._register(this._parentInstantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        /** This accounts for documents that are not loaded yet. */
        this._lastDocStates = {};
        this._register(autorunWithStore((reader, store) => {
            const viewModel = this._viewModel.read(reader);
            if (viewModel && viewModel.contextKeys) {
                for (const [key, value] of Object.entries(viewModel.contextKeys)) {
                    const contextKey = this._contextKeyService.createKey(key, undefined);
                    contextKey.set(value);
                    store.add(toDisposable(() => contextKey.reset()));
                }
            }
        }));
        const ctxAllCollapsed = this._parentContextKeyService.createKey(EditorContextKeys.multiDiffEditorAllCollapsed.key, false);
        this._register(autorun((reader) => {
            const viewModel = this._viewModel.read(reader);
            if (viewModel) {
                const allCollapsed = viewModel.items
                    .read(reader)
                    .every((item) => item.collapsed.read(reader));
                ctxAllCollapsed.set(allCollapsed);
            }
        }));
        this._register(autorun((reader) => {
            /** @description Update widget dimension */
            const dimension = this._dimension.read(reader);
            this._sizeObserver.observe(dimension);
        }));
        const placeholderMessage = derived((reader) => {
            const items = this._viewItems.read(reader);
            if (items.length > 0) {
                return undefined;
            }
            const vm = this._viewModel.read(reader);
            return !vm || vm.isLoading.read(reader)
                ? localize('loading', 'Loading...')
                : localize('noChangedFiles', 'No Changed Files');
        });
        this._register(autorun((reader) => {
            const message = placeholderMessage.read(reader);
            this._elements.placeholder.innerText = message ?? '';
            this._elements.placeholder.classList.toggle('visible', !!message);
        }));
        this._scrollableElements.content.style.position = 'relative';
        this._register(autorun((reader) => {
            /** @description Update scroll dimensions */
            const height = this._sizeObserver.height.read(reader);
            this._scrollableElements.root.style.height = `${height}px`;
            const totalHeight = this._totalHeight.read(reader);
            this._scrollableElements.content.style.height = `${totalHeight}px`;
            const width = this._sizeObserver.width.read(reader);
            let scrollWidth = width;
            const viewItems = this._viewItems.read(reader);
            const max = findFirstMax(viewItems, compareBy((i) => i.maxScroll.read(reader).maxScroll, numberComparator));
            if (max) {
                const maxScroll = max.maxScroll.read(reader);
                scrollWidth = width + maxScroll.maxScroll;
            }
            this._scrollableElement.setScrollDimensions({
                width: width,
                height: height,
                scrollHeight: totalHeight,
                scrollWidth,
            });
        }));
        _element.replaceChildren(this._elements.root);
        this._register(toDisposable(() => {
            _element.replaceChildren();
        }));
        this._register(this._register(autorun((reader) => {
            /** @description Render all */
            globalTransaction((tx) => {
                this.render(reader);
            });
        })));
    }
    setScrollState(scrollState) {
        this._scrollableElement.setScrollPosition({
            scrollLeft: scrollState.left,
            scrollTop: scrollState.top,
        });
    }
    reveal(resource, options) {
        const viewItems = this._viewItems.get();
        const index = viewItems.findIndex((item) => item.viewModel.originalUri?.toString() === resource.original?.toString() &&
            item.viewModel.modifiedUri?.toString() === resource.modified?.toString());
        if (index === -1) {
            throw new BugIndicatingError('Resource not found in diff editor');
        }
        const viewItem = viewItems[index];
        this._viewModel.get().activeDiffItem.setCache(viewItem.viewModel, undefined);
        let scrollTop = 0;
        for (let i = 0; i < index; i++) {
            scrollTop += viewItems[i].contentHeight.get() + this._spaceBetweenPx;
        }
        this._scrollableElement.setScrollPosition({ scrollTop });
        const diffEditor = viewItem.template.get()?.editor;
        const editor = 'original' in resource ? diffEditor?.getOriginalEditor() : diffEditor?.getModifiedEditor();
        if (editor && options?.range) {
            editor.revealRangeInCenter(options.range);
            highlightRange(editor, options.range);
        }
    }
    getViewState() {
        return {
            scrollState: {
                top: this.scrollTop.get(),
                left: this.scrollLeft.get(),
            },
            docStates: Object.fromEntries(this._viewItems.get().map((i) => [i.getKey(), i.getViewState()])),
        };
    }
    setViewState(viewState) {
        this.setScrollState(viewState.scrollState);
        this._lastDocStates = viewState.docStates;
        transaction((tx) => {
            /** setViewState */
            if (viewState.docStates) {
                for (const i of this._viewItems.get()) {
                    const state = viewState.docStates[i.getKey()];
                    if (state) {
                        i.setViewState(state, tx);
                    }
                }
            }
        });
    }
    findDocumentDiffItem(resource) {
        const item = this._viewItems
            .get()
            .find((v) => v.viewModel.diffEditorViewModel.model.modified.uri.toString() === resource.toString() ||
            v.viewModel.diffEditorViewModel.model.original.uri.toString() === resource.toString());
        return item?.viewModel.documentDiffItem;
    }
    tryGetCodeEditor(resource) {
        const item = this._viewItems
            .get()
            .find((v) => v.viewModel.diffEditorViewModel.model.modified.uri.toString() === resource.toString() ||
            v.viewModel.diffEditorViewModel.model.original.uri.toString() === resource.toString());
        const editor = item?.template.get()?.editor;
        if (!editor) {
            return undefined;
        }
        if (item.viewModel.diffEditorViewModel.model.modified.uri.toString() === resource.toString()) {
            return { diffEditor: editor, editor: editor.getModifiedEditor() };
        }
        else {
            return { diffEditor: editor, editor: editor.getOriginalEditor() };
        }
    }
    render(reader) {
        const scrollTop = this.scrollTop.read(reader);
        let contentScrollOffsetToScrollOffset = 0;
        let itemHeightSumBefore = 0;
        let itemContentHeightSumBefore = 0;
        const viewPortHeight = this._sizeObserver.height.read(reader);
        const contentViewPort = OffsetRange.ofStartAndLength(scrollTop, viewPortHeight);
        const width = this._sizeObserver.width.read(reader);
        for (const v of this._viewItems.read(reader)) {
            const itemContentHeight = v.contentHeight.read(reader);
            const itemHeight = Math.min(itemContentHeight, viewPortHeight);
            const itemRange = OffsetRange.ofStartAndLength(itemHeightSumBefore, itemHeight);
            const itemContentRange = OffsetRange.ofStartAndLength(itemContentHeightSumBefore, itemContentHeight);
            if (itemContentRange.isBefore(contentViewPort)) {
                contentScrollOffsetToScrollOffset -= itemContentHeight - itemHeight;
                v.hide();
            }
            else if (itemContentRange.isAfter(contentViewPort)) {
                v.hide();
            }
            else {
                const scroll = Math.max(0, Math.min(contentViewPort.start - itemContentRange.start, itemContentHeight - itemHeight));
                contentScrollOffsetToScrollOffset -= scroll;
                const viewPort = OffsetRange.ofStartAndLength(scrollTop + contentScrollOffsetToScrollOffset, viewPortHeight);
                v.render(itemRange, scroll, width, viewPort);
            }
            itemHeightSumBefore += itemHeight + this._spaceBetweenPx;
            itemContentHeightSumBefore += itemContentHeight + this._spaceBetweenPx;
        }
        this._scrollableElements.content.style.transform = `translateY(${-(scrollTop + contentScrollOffsetToScrollOffset)}px)`;
    }
};
MultiDiffEditorWidgetImpl = __decorate([
    __param(4, IContextKeyService),
    __param(5, IInstantiationService)
], MultiDiffEditorWidgetImpl);
export { MultiDiffEditorWidgetImpl };
function highlightRange(targetEditor, range) {
    const modelNow = targetEditor.getModel();
    const decorations = targetEditor.createDecorationsCollection([
        {
            range,
            options: { description: 'symbol-navigate-action-highlight', className: 'symbolHighlight' },
        },
    ]);
    setTimeout(() => {
        if (targetEditor.getModel() === modelNow) {
            decorations.clear();
        }
    }, 350);
}
class VirtualizedViewItem extends Disposable {
    constructor(viewModel, _objectPool, _scrollLeft, _deltaScrollVertical) {
        super();
        this.viewModel = viewModel;
        this._objectPool = _objectPool;
        this._scrollLeft = _scrollLeft;
        this._deltaScrollVertical = _deltaScrollVertical;
        this._templateRef = this._register(disposableObservableValue(this, undefined));
        this.contentHeight = derived(this, (reader) => this._templateRef.read(reader)?.object.contentHeight?.read(reader) ??
            this.viewModel.lastTemplateData.read(reader).contentHeight);
        this.maxScroll = derived(this, (reader) => this._templateRef.read(reader)?.object.maxScroll.read(reader) ?? {
            maxScroll: 0,
            scrollWidth: 0,
        });
        this.template = derived(this, (reader) => this._templateRef.read(reader)?.object);
        this._isHidden = observableValue(this, false);
        this._isFocused = derived(this, (reader) => this.template.read(reader)?.isFocused.read(reader) ?? false);
        this.viewModel.setIsFocused(this._isFocused, undefined);
        this._register(autorun((reader) => {
            const scrollLeft = this._scrollLeft.read(reader);
            this._templateRef.read(reader)?.object.setScrollLeft(scrollLeft);
        }));
        this._register(autorun((reader) => {
            const ref = this._templateRef.read(reader);
            if (!ref) {
                return;
            }
            const isHidden = this._isHidden.read(reader);
            if (!isHidden) {
                return;
            }
            const isFocused = ref.object.isFocused.read(reader);
            if (isFocused) {
                return;
            }
            this._clear();
        }));
    }
    dispose() {
        this._clear();
        super.dispose();
    }
    toString() {
        return `VirtualViewItem(${this.viewModel.documentDiffItem.modified?.uri.toString()})`;
    }
    getKey() {
        return this.viewModel.getKey();
    }
    getViewState() {
        transaction((tx) => {
            this._updateTemplateData(tx);
        });
        return {
            collapsed: this.viewModel.collapsed.get(),
            selections: this.viewModel.lastTemplateData.get().selections,
        };
    }
    setViewState(viewState, tx) {
        this.viewModel.collapsed.set(viewState.collapsed, tx);
        this._updateTemplateData(tx);
        const data = this.viewModel.lastTemplateData.get();
        const selections = viewState.selections?.map(Selection.liftSelection);
        this.viewModel.lastTemplateData.set({
            ...data,
            selections,
        }, tx);
        const ref = this._templateRef.get();
        if (ref) {
            if (selections) {
                ref.object.editor.setSelections(selections);
            }
        }
    }
    _updateTemplateData(tx) {
        const ref = this._templateRef.get();
        if (!ref) {
            return;
        }
        this.viewModel.lastTemplateData.set({
            contentHeight: ref.object.contentHeight.get(),
            selections: ref.object.editor.getSelections() ?? undefined,
        }, tx);
    }
    _clear() {
        const ref = this._templateRef.get();
        if (!ref) {
            return;
        }
        transaction((tx) => {
            this._updateTemplateData(tx);
            ref.object.hide();
            this._templateRef.set(undefined, tx);
        });
    }
    hide() {
        this._isHidden.set(true, undefined);
    }
    render(verticalSpace, offset, width, viewPort) {
        this._isHidden.set(false, undefined);
        let ref = this._templateRef.get();
        if (!ref) {
            ref = this._objectPool.getUnusedObj(new TemplateData(this.viewModel, this._deltaScrollVertical));
            this._templateRef.set(ref, undefined);
            const selections = this.viewModel.lastTemplateData.get().selections;
            if (selections) {
                ref.object.editor.setSelections(selections);
            }
        }
        ref.object.render(verticalSpace, width, offset, viewPort);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yV2lkZ2V0SW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9tdWx0aURpZmZFZGl0b3IvbXVsdGlEaWZmRWRpdG9yV2lkZ2V0SW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4sU0FBUyxFQUNULENBQUMsRUFDRCw0QkFBNEIsR0FDNUIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQWMsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0YsT0FBTyxFQUlOLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsT0FBTyxFQUNQLGdCQUFnQixFQUNoQix5QkFBeUIsRUFDekIsaUJBQWlCLEVBQ2pCLG1CQUFtQixFQUNuQixlQUFlLEVBQ2YsV0FBVyxHQUNYLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLFVBQVUsRUFBdUIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUV2RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdF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
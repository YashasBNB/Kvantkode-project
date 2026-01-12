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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yV2lkZ2V0SW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L211bHRpRGlmZkVkaXRvci9tdWx0aURpZmZFZGl0b3JXaWRnZXRJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTixTQUFTLEVBQ1QsQ0FBQyxFQUNELDRCQUE0QixHQUM1QixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBYyxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRixPQUFPLEVBSU4sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEVBQ1AsZ0JBQWdCLEVBQ2hCLHlCQUF5QixFQUN6QixpQkFBaUIsRUFDakIsbUJBQW1CLEVBQ25CLGVBQWUsRUFDZixXQUFXLEdBQ1gsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsVUFBVSxFQUF1QixNQUFNLHVDQUF1QyxDQUFBO0FBRXZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRWpFLE9BQU8sRUFBYyxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFJbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzVDLE9BQU8sYUFBYSxDQUFBO0FBR2IsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBNEh4RCxZQUNrQixRQUFxQixFQUNyQixVQUE4QyxFQUM5QyxVQUE2RCxFQUM3RCwwQkFBc0QsRUFDbkQsd0JBQTZELEVBQzFELDJCQUFtRTtRQUUxRixLQUFLLEVBQUUsQ0FBQTtRQVBVLGFBQVEsR0FBUixRQUFRLENBQWE7UUFDckIsZUFBVSxHQUFWLFVBQVUsQ0FBb0M7UUFDOUMsZUFBVSxHQUFWLFVBQVUsQ0FBbUQ7UUFDN0QsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE0QjtRQUNsQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQW9CO1FBQ3pDLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBdUI7UUFqSTFFLHdCQUFtQixHQUFHLENBQUMsQ0FBQyxtQkFBbUIsRUFBRTtZQUM3RCxDQUFDLENBQUMsYUFBYSxFQUFFO2dCQUNoQixLQUFLLEVBQUU7b0JBQ04sUUFBUSxFQUFFLFFBQVE7aUJBQ2xCO2FBQ0QsQ0FBQztZQUNGLENBQUMsQ0FBQywwQ0FBMEMsRUFBRSxFQUFFLENBQUM7U0FDakQsQ0FBQyxDQUFBO1FBRWUsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM1QyxJQUFJLFVBQVUsQ0FBQztZQUNkLGtCQUFrQixFQUFFLEtBQUs7WUFDekIsNEJBQTRCLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUNwQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMzRCxvQkFBb0IsRUFBRSxHQUFHO1NBQ3pCLENBQUMsQ0FDRixDQUFBO1FBRWdCLHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ25ELElBQUksdUJBQXVCLENBQzFCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQzdCO1lBQ0MsUUFBUSxrQ0FBMEI7WUFDbEMsVUFBVSxrQ0FBMEI7WUFDcEMsVUFBVSxFQUFFLEtBQUs7U0FDakIsRUFDRCxJQUFJLENBQUMsV0FBVyxDQUNoQixDQUNELENBQUE7UUFFZ0IsY0FBUyxHQUFHLENBQUMsQ0FBQyxzQ0FBc0MsRUFBRSxFQUFFLEVBQUU7WUFDMUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztZQUNwRCxDQUFDLENBQUMsNkJBQTZCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDaEQsQ0FBQyxDQUFBO1FBRWUsa0JBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM5QyxJQUFJLDZCQUE2QixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQzNELENBQUE7UUFFZ0IsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM1QyxJQUFJLFVBQVUsQ0FBdUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUM3RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUN6RCxzQkFBc0IsRUFDdEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFDaEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLHNCQUFzQixFQUMvQyxJQUFJLENBQUMsMEJBQTBCLENBQy9CLENBQUE7WUFDRCxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3RCLE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFZSxjQUFTLEdBQUcsbUJBQW1CLENBQzlDLElBQUksRUFDSixJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUNoQyxHQUFHLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxTQUFTLENBQ3pGLENBQUE7UUFDZSxlQUFVLEdBQUcsbUJBQW1CLENBQy9DLElBQUksRUFDSixJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUNoQyxHQUFHLEVBQUUsQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxVQUFVLENBQzNGLENBQUE7UUFFZ0IsbUJBQWMsR0FBRyxnQkFBZ0IsQ0FHL0MsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzFCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3ZDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDVCxPQUFPO29CQUNOLEtBQUssRUFBRSxFQUFFO29CQUNULE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFO3dCQUNmLE1BQU0sSUFBSSxrQkFBa0IsRUFBRSxDQUFBO29CQUMvQixDQUFDO2lCQUNELENBQUE7WUFDRixDQUFDO1lBQ0QsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQWtELENBQUE7WUFDckUsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNsQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNyQixJQUFJLG1CQUFtQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtvQkFDdkUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixDQUFDO3dCQUN6QyxTQUFTLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixFQUFFLENBQUMsU0FBUyxHQUFHLEtBQUs7cUJBQ3hFLENBQUMsQ0FBQTtnQkFDSCxDQUFDLENBQUMsQ0FDRixDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtnQkFDakQsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTt3QkFDbEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7b0JBQzVCLENBQUMsQ0FBQyxDQUFBO2dCQUNILENBQUM7Z0JBQ0QsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQ2hCLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQyxDQUFDLENBQUE7WUFDRixPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUUsRUFBRSxDQUFBO1FBQzlDLENBQUMsQ0FBQyxDQUFBO1FBRWUsZUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRWxFLG9CQUFlLEdBQUcsQ0FBQyxDQUFBO1FBRW5CLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQzNFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FDbEYsQ0FBQTtRQUNlLGtCQUFhLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3hELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEYsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNyQixPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1lBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ3pFLE9BQU8sUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFBO1FBQzlDLENBQUMsQ0FBQyxDQUFBO1FBRWUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbkQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQ3pELENBQUE7UUFDZ0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdEQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFdBQVcsQ0FDM0MsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQ3BFLENBQ0QsQ0FBQTtRQXVLRCwyREFBMkQ7UUFDbkQsbUJBQWMsR0FBMkMsRUFBRSxDQUFBO1FBNUpsRSxJQUFJLENBQUMsU0FBUyxDQUNiLGdCQUFnQixDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ2xDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzlDLElBQUksU0FBUyxJQUFJLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDeEMsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQ2xFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQWtCLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtvQkFDckYsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDckIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDbEQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FDOUQsaUJBQWlCLENBQUMsMkJBQTJCLENBQUMsR0FBRyxFQUNqRCxLQUFLLENBQ0wsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDOUMsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsS0FBSztxQkFDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQztxQkFDWixLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7Z0JBQzlDLGVBQWUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDbEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2xCLDJDQUEyQztZQUMzQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM5QyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN0QyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUM3QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMxQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7WUFFRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN2QyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDO2dCQUNuQyxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDbEQsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2xCLE1BQU0sT0FBTyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQTtZQUNwRCxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDbEUsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUE7UUFFNUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNsQiw0Q0FBNEM7WUFDNUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3JELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFBO1lBQzFELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2xELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLFdBQVcsSUFBSSxDQUFBO1lBRWxFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUVuRCxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUE7WUFDdkIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDOUMsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUN2QixTQUFTLEVBQ1QsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FDdEUsQ0FBQTtZQUNELElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ1QsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzVDLFdBQVcsR0FBRyxLQUFLLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQTtZQUMxQyxDQUFDO1lBRUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDO2dCQUMzQyxLQUFLLEVBQUUsS0FBSztnQkFDWixNQUFNLEVBQUUsTUFBTTtnQkFDZCxZQUFZLEVBQUUsV0FBVztnQkFDekIsV0FBVzthQUNYLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLFNBQVMsQ0FDYixZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ2pCLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUMzQixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2xCLDhCQUE4QjtZQUM5QixpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3BCLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQ0YsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVNLGNBQWMsQ0FBQyxXQUE0QztRQUNqRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLENBQUM7WUFDekMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxJQUFJO1lBQzVCLFNBQVMsRUFBRSxXQUFXLENBQUMsR0FBRztTQUMxQixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sTUFBTSxDQUFDLFFBQThCLEVBQUUsT0FBdUI7UUFDcEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUN2QyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsU0FBUyxDQUNoQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQ1IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLEtBQUssUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUU7WUFDeEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLEtBQUssUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FDekUsQ0FBQTtRQUNELElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEIsTUFBTSxJQUFJLGtCQUFrQixDQUFDLG1DQUFtQyxDQUFDLENBQUE7UUFDbEUsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUU3RSxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hDLFNBQVMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUE7UUFDckUsQ0FBQztRQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7UUFFeEQsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUE7UUFDbEQsTUFBTSxNQUFNLEdBQ1gsVUFBVSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxDQUFBO1FBQzNGLElBQUksTUFBTSxJQUFJLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUM5QixNQUFNLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3pDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RDLENBQUM7SUFDRixDQUFDO0lBRU0sWUFBWTtRQUNsQixPQUFPO1lBQ04sV0FBVyxFQUFFO2dCQUNaLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtnQkFDekIsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO2FBQzNCO1lBQ0QsU0FBUyxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQzVCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUNoRTtTQUNELENBQUE7SUFDRixDQUFDO0lBS00sWUFBWSxDQUFDLFNBQW9DO1FBQ3ZELElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRTFDLElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQTtRQUV6QyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtZQUNsQixtQkFBbUI7WUFDbkIsSUFBSSxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3pCLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO29CQUN2QyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO29CQUM3QyxJQUFJLEtBQUssRUFBRSxDQUFDO3dCQUNYLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO29CQUMxQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sb0JBQW9CLENBQUMsUUFBYTtRQUN4QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVTthQUMxQixHQUFHLEVBQUU7YUFDTCxJQUFJLENBQ0osQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssUUFBUSxDQUFDLFFBQVEsRUFBRTtZQUNyRixDQUFDLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FDdEYsQ0FBQTtRQUNGLE9BQU8sSUFBSSxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtJQUN4QyxDQUFDO0lBRU0sZ0JBQWdCLENBQ3RCLFFBQWE7UUFFYixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVTthQUMxQixHQUFHLEVBQUU7YUFDTCxJQUFJLENBQ0osQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssUUFBUSxDQUFDLFFBQVEsRUFBRTtZQUNyRixDQUFDLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FDdEYsQ0FBQTtRQUNGLE1BQU0sTUFBTSxHQUFHLElBQUksRUFBRSxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsTUFBTSxDQUFBO1FBQzNDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDOUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUE7UUFDbEUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQTtRQUNsRSxDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyxNQUEyQjtRQUN6QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM3QyxJQUFJLGlDQUFpQyxHQUFHLENBQUMsQ0FBQTtRQUN6QyxJQUFJLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtRQUMzQixJQUFJLDBCQUEwQixHQUFHLENBQUMsQ0FBQTtRQUNsQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDN0QsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUUvRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFbkQsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzlDLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUM5RCxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDL0UsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsZ0JBQWdCLENBQ3BELDBCQUEwQixFQUMxQixpQkFBaUIsQ0FDakIsQ0FBQTtZQUVELElBQUksZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hELGlDQUFpQyxJQUFJLGlCQUFpQixHQUFHLFVBQVUsQ0FBQTtnQkFDbkUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ1QsQ0FBQztpQkFBTSxJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO2dCQUN0RCxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDVCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDdEIsQ0FBQyxFQUNELElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLEdBQUcsVUFBVSxDQUFDLENBQ3hGLENBQUE7Z0JBQ0QsaUNBQWlDLElBQUksTUFBTSxDQUFBO2dCQUMzQyxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsZ0JBQWdCLENBQzVDLFNBQVMsR0FBRyxpQ0FBaUMsRUFDN0MsY0FBYyxDQUNkLENBQUE7Z0JBQ0QsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUM3QyxDQUFDO1lBRUQsbUJBQW1CLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUE7WUFDeEQsMEJBQTBCLElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQTtRQUN2RSxDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLGNBQWMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUE7SUFDdkgsQ0FBQztDQUNELENBQUE7QUFsWVkseUJBQXlCO0lBaUluQyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7R0FsSVgseUJBQXlCLENBa1lyQzs7QUFFRCxTQUFTLGNBQWMsQ0FBQyxZQUF5QixFQUFFLEtBQWE7SUFDL0QsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3hDLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQywyQkFBMkIsQ0FBQztRQUM1RDtZQUNDLEtBQUs7WUFDTCxPQUFPLEVBQUUsRUFBRSxXQUFXLEVBQUUsa0NBQWtDLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFO1NBQzFGO0tBQ0QsQ0FBQyxDQUFBO0lBQ0YsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNwQixDQUFDO0lBQ0YsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQ1IsQ0FBQztBQXlCRCxNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUE2QjNDLFlBQ2lCLFNBQW9DLEVBQ25DLFdBQTZELEVBQzdELFdBQWdDLEVBQ2hDLG9CQUE2QztRQUU5RCxLQUFLLEVBQUUsQ0FBQTtRQUxTLGNBQVMsR0FBVCxTQUFTLENBQTJCO1FBQ25DLGdCQUFXLEdBQVgsV0FBVyxDQUFrRDtRQUM3RCxnQkFBVyxHQUFYLFdBQVcsQ0FBcUI7UUFDaEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF5QjtRQWhDOUMsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM3Qyx5QkFBeUIsQ0FBaUQsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUMxRixDQUFBO1FBRWUsa0JBQWEsR0FBRyxPQUFPLENBQ3RDLElBQUksRUFDSixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ1YsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ2xFLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGFBQWEsQ0FDM0QsQ0FBQTtRQUVlLGNBQVMsR0FBRyxPQUFPLENBQ2xDLElBQUksRUFDSixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ1YsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDaEUsU0FBUyxFQUFFLENBQUM7WUFDWixXQUFXLEVBQUUsQ0FBQztTQUNkLENBQ0YsQ0FBQTtRQUVlLGFBQVEsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNwRixjQUFTLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUvQixlQUFVLEdBQUcsT0FBTyxDQUNwQyxJQUFJLEVBQ0osQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUN2RSxDQUFBO1FBVUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUV2RCxJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2xCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2hELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDakUsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNWLE9BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDNUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ25ELElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDYixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVlLFFBQVE7UUFDdkIsT0FBTyxtQkFBbUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUE7SUFDdEYsQ0FBQztJQUVNLE1BQU07UUFDWixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDL0IsQ0FBQztJQUVNLFlBQVk7UUFDbEIsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7WUFDbEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO1FBQ0YsT0FBTztZQUNOLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7WUFDekMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVTtTQUM1RCxDQUFBO0lBQ0YsQ0FBQztJQUVNLFlBQVksQ0FBQyxTQUE2QixFQUFFLEVBQWdCO1FBQ2xFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXJELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM1QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ2xELE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyRSxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FDbEM7WUFDQyxHQUFHLElBQUk7WUFDUCxVQUFVO1NBQ1YsRUFDRCxFQUFFLENBQ0YsQ0FBQTtRQUNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDbkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxFQUFnQjtRQUMzQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ25DLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQ2xDO1lBQ0MsYUFBYSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRTtZQUM3QyxVQUFVLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLElBQUksU0FBUztTQUMxRCxFQUNELEVBQUUsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLE1BQU07UUFDYixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ25DLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLE9BQU07UUFDUCxDQUFDO1FBQ0QsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7WUFDbEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQzVCLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDakIsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLElBQUk7UUFDVixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVNLE1BQU0sQ0FDWixhQUEwQixFQUMxQixNQUFjLEVBQ2QsS0FBYSxFQUNiLFFBQXFCO1FBRXJCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVwQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FDbEMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FDM0QsQ0FBQTtZQUNELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUVyQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQTtZQUNuRSxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDNUMsQ0FBQztRQUNGLENBQUM7UUFDRCxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0NBQ0QifQ==
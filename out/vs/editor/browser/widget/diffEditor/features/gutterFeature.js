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
import { EventType, addDisposableListener, h } from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, derivedDisposable, derivedWithSetter, observableFromEvent, observableValue, } from '../../../../../base/common/observable.js';
import { MenuWorkbenchToolBar, } from '../../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { WorkbenchHoverDelegate } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { LineRange, LineRangeSet } from '../../../../common/core/lineRange.js';
import { OffsetRange } from '../../../../common/core/offsetRange.js';
import { Range } from '../../../../common/core/range.js';
import { TextEdit } from '../../../../common/core/textEdit.js';
import { DetailedLineRangeMapping } from '../../../../common/diff/rangeMapping.js';
import { TextModelText } from '../../../../common/model/textModelText.js';
import { ActionRunnerWithContext } from '../../multiDiffEditor/utils.js';
import { DiffEditorSash } from '../components/diffEditorSash.js';
import { appendRemoveOnDispose, applyStyle, prependRemoveOnDispose } from '../utils.js';
import { EditorGutter } from '../utils/editorGutter.js';
const emptyArr = [];
const width = 35;
let DiffEditorGutter = class DiffEditorGutter extends Disposable {
    constructor(diffEditorRoot, _diffModel, _editors, _options, _sashLayout, _boundarySashes, _instantiationService, _contextKeyService, _menuService) {
        super();
        this._diffModel = _diffModel;
        this._editors = _editors;
        this._options = _options;
        this._sashLayout = _sashLayout;
        this._boundarySashes = _boundarySashes;
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._menuService = _menuService;
        this._menu = this._register(this._menuService.createMenu(MenuId.DiffEditorHunkToolbar, this._contextKeyService));
        this._actions = observableFromEvent(this, this._menu.onDidChange, () => this._menu.getActions());
        this._hasActions = this._actions.map((a) => a.length > 0);
        this._showSash = derived(this, (reader) => this._options.renderSideBySide.read(reader) && this._hasActions.read(reader));
        this.width = derived(this, (reader) => (this._hasActions.read(reader) ? width : 0));
        this.elements = h('div.gutter@gutter', { style: { position: 'absolute', height: '100%', width: width + 'px' } }, []);
        this._currentDiff = derived(this, (reader) => {
            const model = this._diffModel.read(reader);
            if (!model) {
                return undefined;
            }
            const mappings = model.diff.read(reader)?.mappings;
            const cursorPosition = this._editors.modifiedCursor.read(reader);
            if (!cursorPosition) {
                return undefined;
            }
            return mappings?.find((m) => m.lineRangeMapping.modified.contains(cursorPosition.lineNumber));
        });
        this._selectedDiffs = derived(this, (reader) => {
            /** @description selectedDiffs */
            const model = this._diffModel.read(reader);
            const diff = model?.diff.read(reader);
            // Return `emptyArr` because it is a constant. [] is always a new array and would trigger a change.
            if (!diff) {
                return emptyArr;
            }
            const selections = this._editors.modifiedSelections.read(reader);
            if (selections.every((s) => s.isEmpty())) {
                return emptyArr;
            }
            const selectedLineNumbers = new LineRangeSet(selections.map((s) => LineRange.fromRangeInclusive(s)));
            const selectedMappings = diff.mappings.filter((m) => m.lineRangeMapping.innerChanges &&
                selectedLineNumbers.intersects(m.lineRangeMapping.modified));
            const result = selectedMappings.map((mapping) => ({
                mapping,
                rangeMappings: mapping.lineRangeMapping.innerChanges.filter((c) => selections.some((s) => Range.areIntersecting(c.modifiedRange, s))),
            }));
            if (result.length === 0 || result.every((r) => r.rangeMappings.length === 0)) {
                return emptyArr;
            }
            return result;
        });
        this._register(prependRemoveOnDispose(diffEditorRoot, this.elements.root));
        this._register(addDisposableListener(this.elements.root, 'click', () => {
            this._editors.modified.focus();
        }));
        this._register(applyStyle(this.elements.root, {
            display: this._hasActions.map((a) => (a ? 'block' : 'none')),
        }));
        derivedDisposable(this, (reader) => {
            const showSash = this._showSash.read(reader);
            return !showSash
                ? undefined
                : new DiffEditorSash(diffEditorRoot, this._sashLayout.dimensions, this._options.enableSplitViewResizing, this._boundarySashes, derivedWithSetter(this, (reader) => this._sashLayout.sashLeft.read(reader) - width, (v, tx) => this._sashLayout.sashLeft.set(v + width, tx)), () => this._sashLayout.resetSash());
        }).recomputeInitiallyAndOnChange(this._store);
        const gutterItems = derived(this, (reader) => {
            const model = this._diffModel.read(reader);
            if (!model) {
                return [];
            }
            const diffs = model.diff.read(reader);
            if (!diffs) {
                return [];
            }
            const selection = this._selectedDiffs.read(reader);
            if (selection.length > 0) {
                const m = DetailedLineRangeMapping.fromRangeMappings(selection.flatMap((s) => s.rangeMappings));
                return [
                    new DiffGutterItem(m, true, MenuId.DiffEditorSelectionToolbar, undefined, model.model.original.uri, model.model.modified.uri),
                ];
            }
            const currentDiff = this._currentDiff.read(reader);
            return diffs.mappings.map((m) => new DiffGutterItem(m.lineRangeMapping.withInnerChangesFromLineRanges(), m.lineRangeMapping === currentDiff?.lineRangeMapping, MenuId.DiffEditorHunkToolbar, undefined, model.model.original.uri, model.model.modified.uri));
        });
        this._register(new EditorGutter(this._editors.modified, this.elements.root, {
            getIntersectingGutterItems: (range, reader) => gutterItems.read(reader),
            createView: (item, target) => {
                return this._instantiationService.createInstance(DiffToolBar, item, target, this);
            },
        }));
        this._register(addDisposableListener(this.elements.gutter, EventType.MOUSE_WHEEL, (e) => {
            if (this._editors.modified.getOption(108 /* EditorOption.scrollbar */).handleMouseWheel) {
                this._editors.modified.delegateScrollFromMouseWheelEvent(e);
            }
        }, { passive: false }));
    }
    computeStagedValue(mapping) {
        const c = mapping.innerChanges ?? [];
        const modified = new TextModelText(this._editors.modifiedModel.get());
        const original = new TextModelText(this._editors.original.getModel());
        const edit = new TextEdit(c.map((c) => c.toTextEdit(modified)));
        const value = edit.apply(original);
        return value;
    }
    layout(left) {
        this.elements.gutter.style.left = left + 'px';
    }
};
DiffEditorGutter = __decorate([
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IMenuService)
], DiffEditorGutter);
export { DiffEditorGutter };
class DiffGutterItem {
    constructor(mapping, showAlways, menuId, rangeOverride, originalUri, modifiedUri) {
        this.mapping = mapping;
        this.showAlways = showAlways;
        this.menuId = menuId;
        this.rangeOverride = rangeOverride;
        this.originalUri = originalUri;
        this.modifiedUri = modifiedUri;
    }
    get id() {
        return this.mapping.modified.toString();
    }
    get range() {
        return this.rangeOverride ?? this.mapping.modified;
    }
}
let DiffToolBar = class DiffToolBar extends Disposable {
    constructor(_item, target, gutter, instantiationService) {
        super();
        this._item = _item;
        this._elements = h('div.gutterItem', { style: { height: '20px', width: '34px' } }, [
            h('div.background@background', {}, []),
            h('div.buttons@buttons', {}, []),
        ]);
        this._showAlways = this._item.map(this, (item) => item.showAlways);
        this._menuId = this._item.map(this, (item) => item.menuId);
        this._isSmall = observableValue(this, false);
        this._lastItemRange = undefined;
        this._lastViewRange = undefined;
        const hoverDelegate = this._register(instantiationService.createInstance(WorkbenchHoverDelegate, 'element', { instantHover: true }, { position: { hoverPosition: 1 /* HoverPosition.RIGHT */ } }));
        this._register(appendRemoveOnDispose(target, this._elements.root));
        this._register(autorun((reader) => {
            /** @description update showAlways */
            const showAlways = this._showAlways.read(reader);
            this._elements.root.classList.toggle('noTransition', true);
            this._elements.root.classList.toggle('showAlways', showAlways);
            setTimeout(() => {
                this._elements.root.classList.toggle('noTransition', false);
            }, 0);
        }));
        this._register(autorunWithStore((reader, store) => {
            this._elements.buttons.replaceChildren();
            const i = store.add(instantiationService.createInstance(MenuWorkbenchToolBar, this._elements.buttons, this._menuId.read(reader), {
                orientation: 1 /* ActionsOrientation.VERTICAL */,
                hoverDelegate,
                toolbarOptions: {
                    primaryGroup: (g) => g.startsWith('primary'),
                },
                overflowBehavior: { maxItems: this._isSmall.read(reader) ? 1 : 3 },
                hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
                actionRunner: store.add(new ActionRunnerWithContext(() => {
                    const item = this._item.get();
                    const mapping = item.mapping;
                    return {
                        mapping,
                        originalWithModifiedChanges: gutter.computeStagedValue(mapping),
                        originalUri: item.originalUri,
                        modifiedUri: item.modifiedUri,
                    };
                })),
                menuOptions: {
                    shouldForwardArgs: true,
                },
            }));
            store.add(i.onDidChangeMenuItems(() => {
                if (this._lastItemRange) {
                    this.layout(this._lastItemRange, this._lastViewRange);
                }
            }));
        }));
    }
    layout(itemRange, viewRange) {
        this._lastItemRange = itemRange;
        this._lastViewRange = viewRange;
        let itemHeight = this._elements.buttons.clientHeight;
        this._isSmall.set(this._item.get().mapping.original.startLineNumber === 1 && itemRange.length < 30, undefined);
        // Item might have changed
        itemHeight = this._elements.buttons.clientHeight;
        const middleHeight = itemRange.length / 2 - itemHeight / 2;
        const margin = itemHeight;
        let effectiveCheckboxTop = itemRange.start + middleHeight;
        const preferredViewPortRange = OffsetRange.tryCreate(margin, viewRange.endExclusive - margin - itemHeight);
        const preferredParentRange = OffsetRange.tryCreate(itemRange.start + margin, itemRange.endExclusive - itemHeight - margin);
        if (preferredParentRange &&
            preferredViewPortRange &&
            preferredParentRange.start < preferredParentRange.endExclusive) {
            effectiveCheckboxTop = preferredViewPortRange.clip(effectiveCheckboxTop);
            effectiveCheckboxTop = preferredParentRange.clip(effectiveCheckboxTop);
        }
        this._elements.buttons.style.top = `${effectiveCheckboxTop - itemRange.start}px`;
    }
};
DiffToolBar = __decorate([
    __param(3, IInstantiationService)
], DiffToolBar);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVyRmVhdHVyZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2ZlYXR1cmVzL2d1dHRlckZlYXR1cmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUt4RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUVOLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsT0FBTyxFQUNQLGlCQUFpQixFQUNqQixpQkFBaUIsRUFDakIsbUJBQW1CLEVBQ25CLGVBQWUsR0FDZixNQUFNLDBDQUEwQyxDQUFBO0FBRWpELE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUNBQXlD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
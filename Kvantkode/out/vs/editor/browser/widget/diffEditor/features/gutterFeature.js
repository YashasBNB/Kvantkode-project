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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVyRmVhdHVyZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvZmVhdHVyZXMvZ3V0dGVyRmVhdHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBS3hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBRU4sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEVBQ1AsaUJBQWlCLEVBQ2pCLGlCQUFpQixFQUNqQixtQkFBbUIsRUFDbkIsZUFBZSxHQUNmLE1BQU0sMENBQTBDLENBQUE7QUFFakQsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckcsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5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
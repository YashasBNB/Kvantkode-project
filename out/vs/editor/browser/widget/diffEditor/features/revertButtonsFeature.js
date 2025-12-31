/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, h, EventType } from '../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorunWithStore, derived } from '../../../../../base/common/observable.js';
import { LineRange, LineRangeSet } from '../../../../common/core/lineRange.js';
import { Range } from '../../../../common/core/range.js';
import { LineRangeMapping } from '../../../../common/diff/rangeMapping.js';
import { GlyphMarginLane } from '../../../../common/model.js';
import { localize } from '../../../../../nls.js';
const emptyArr = [];
export class RevertButtonsFeature extends Disposable {
    constructor(_editors, _diffModel, _options, _widget) {
        super();
        this._editors = _editors;
        this._diffModel = _diffModel;
        this._options = _options;
        this._widget = _widget;
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
        this._register(autorunWithStore((reader, store) => {
            if (!this._options.shouldRenderOldRevertArrows.read(reader)) {
                return;
            }
            const model = this._diffModel.read(reader);
            const diff = model?.diff.read(reader);
            if (!model || !diff) {
                return;
            }
            if (model.movedTextToCompare.read(reader)) {
                return;
            }
            const glyphWidgetsModified = [];
            const selectedDiffs = this._selectedDiffs.read(reader);
            const selectedDiffsSet = new Set(selectedDiffs.map((d) => d.mapping));
            if (selectedDiffs.length > 0) {
                // The button to revert the selection
                const selections = this._editors.modifiedSelections.read(reader);
                const btn = store.add(new RevertButton(selections[selections.length - 1].positionLineNumber, this._widget, selectedDiffs.flatMap((d) => d.rangeMappings), true));
                this._editors.modified.addGlyphMarginWidget(btn);
                glyphWidgetsModified.push(btn);
            }
            for (const m of diff.mappings) {
                if (selectedDiffsSet.has(m)) {
                    continue;
                }
                if (!m.lineRangeMapping.modified.isEmpty && m.lineRangeMapping.innerChanges) {
                    const btn = store.add(new RevertButton(m.lineRangeMapping.modified.startLineNumber, this._widget, m.lineRangeMapping, false));
                    this._editors.modified.addGlyphMarginWidget(btn);
                    glyphWidgetsModified.push(btn);
                }
            }
            store.add(toDisposable(() => {
                for (const w of glyphWidgetsModified) {
                    this._editors.modified.removeGlyphMarginWidget(w);
                }
            }));
        }));
    }
}
export class RevertButton extends Disposable {
    static { this.counter = 0; }
    getId() {
        return this._id;
    }
    constructor(_lineNumber, _widget, _diffs, _revertSelection) {
        super();
        this._lineNumber = _lineNumber;
        this._widget = _widget;
        this._diffs = _diffs;
        this._revertSelection = _revertSelection;
        this._id = `revertButton${RevertButton.counter++}`;
        this._domNode = h('div.revertButton', {
            title: this._revertSelection
                ? localize('revertSelectedChanges', 'Revert Selected Changes')
                : localize('revertChange', 'Revert Change'),
        }, [renderIcon(Codicon.arrowRight)]).root;
        this._register(addDisposableListener(this._domNode, EventType.MOUSE_DOWN, (e) => {
            // don't prevent context menu from showing up
            if (e.button !== 2) {
                e.stopPropagation();
                e.preventDefault();
            }
        }));
        this._register(addDisposableListener(this._domNode, EventType.MOUSE_UP, (e) => {
            e.stopPropagation();
            e.preventDefault();
        }));
        this._register(addDisposableListener(this._domNode, EventType.CLICK, (e) => {
            if (this._diffs instanceof LineRangeMapping) {
                this._widget.revert(this._diffs);
            }
            else {
                this._widget.revertRangeMappings(this._diffs);
            }
            e.stopPropagation();
            e.preventDefault();
        }));
    }
    /**
     * Get the dom node of the glyph widget.
     */
    getDomNode() {
        return this._domNode;
    }
    /**
     * Get the placement of the glyph widget.
     */
    getPosition() {
        return {
            lane: GlyphMarginLane.Right,
            range: {
                startColumn: 1,
                startLineNumber: this._lineNumber,
                endColumn: 1,
                endLineNumber: this._lineNumber,
            },
            zIndex: 10001,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmV2ZXJ0QnV0dG9uc0ZlYXR1cmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9mZWF0dXJlcy9yZXZlcnRCdXR0b25zRmVhdHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRixPQUFPLEVBQWUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFNakcsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFnQixNQUFNLHlDQUF5QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFaEQsTUFBTSxRQUFRLEdBQVksRUFBRSxDQUFBO0FBRTVCLE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxVQUFVO0lBQ25ELFlBQ2tCLFFBQTJCLEVBQzNCLFVBQXdELEVBQ3hELFFBQTJCLEVBQzNCLE9BQXlCO1FBRTFDLEtBQUssRUFBRSxDQUFBO1FBTFUsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFDM0IsZUFBVSxHQUFWLFVBQVUs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
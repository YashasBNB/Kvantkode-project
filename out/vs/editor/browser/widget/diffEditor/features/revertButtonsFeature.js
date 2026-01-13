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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmV2ZXJ0QnV0dG9uc0ZlYXR1cmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2ZlYXR1cmVzL3JldmVydEJ1dHRvbnNGZWF0dXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xGLE9BQU8sRUFBZSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQU1qRyxPQUFPLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQWdCLE1BQU0seUNBQXlDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVoRCxNQUFNLFFBQVEsR0FBWSxFQUFFLENBQUE7QUFFNUIsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBQVU7SUFDbkQsWUFDa0IsUUFBMkIsRUFDM0IsVUFBd0QsRUFDeEQsUUFBMkIsRUFDM0IsT0FBeUI7UUFFMUMsS0FBSyxFQUFFLENBQUE7UUFMVSxhQUFRLEdBQVIsUUFBUSxDQUFt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
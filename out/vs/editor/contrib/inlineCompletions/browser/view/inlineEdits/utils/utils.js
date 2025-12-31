/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getDomNodePagePosition, h } from '../../../../../../../base/browser/dom.js';
import { KeybindingLabel, unthemedKeybindingLabelOptions, } from '../../../../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { numberComparator } from '../../../../../../../base/common/arrays.js';
import { findFirstMin } from '../../../../../../../base/common/arraysFind.js';
import { toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { derived, derivedObservableWithCache, derivedOpts, observableValue, transaction, } from '../../../../../../../base/common/observable.js';
import { OS } from '../../../../../../../base/common/platform.js';
import { getIndentationLength, splitLines } from '../../../../../../../base/common/strings.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { MenuEntryActionViewItem } from '../../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { Position } from '../../../../../../common/core/position.js';
import { Range } from '../../../../../../common/core/range.js';
import { SingleTextEdit, TextEdit } from '../../../../../../common/core/textEdit.js';
import { RangeMapping } from '../../../../../../common/diff/rangeMapping.js';
import { indentOfLine } from '../../../../../../common/model/textModel.js';
export function maxContentWidthInRange(editor, range, reader) {
    editor.layoutInfo.read(reader);
    editor.value.read(reader);
    const model = editor.model.read(reader);
    if (!model) {
        return 0;
    }
    let maxContentWidth = 0;
    editor.scrollTop.read(reader);
    for (let i = range.startLineNumber; i < range.endLineNumberExclusive; i++) {
        const column = model.getLineMaxColumn(i);
        let lineContentWidth = editor.editor.getOffsetForColumn(i, column);
        if (lineContentWidth === -1) {
            // approximation
            const typicalHalfwidthCharacterWidth = editor.editor.getOption(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
            const approximation = column * typicalHalfwidthCharacterWidth;
            lineContentWidth = approximation;
        }
        maxContentWidth = Math.max(maxContentWidth, lineContentWidth);
    }
    const lines = range.mapToLineArray((l) => model.getLineContent(l));
    if (maxContentWidth < 5 && lines.some((l) => l.length > 0) && model.uri.scheme !== 'file') {
        console.error('unexpected width');
    }
    return maxContentWidth;
}
export function getOffsetForPos(editor, pos, reader) {
    editor.layoutInfo.read(reader);
    editor.value.read(reader);
    const model = editor.model.read(reader);
    if (!model) {
        return 0;
    }
    editor.scrollTop.read(reader);
    const lineContentWidth = editor.editor.getOffsetForColumn(pos.lineNumber, pos.column);
    return lineContentWidth;
}
export function getPrefixTrim(diffRanges, originalLinesRange, modifiedLines, editor) {
    const textModel = editor.getModel();
    if (!textModel) {
        return { prefixTrim: 0, prefixLeftOffset: 0 };
    }
    const replacementStart = diffRanges.map((r) => (r.isSingleLine() ? r.startColumn - 1 : 0));
    const originalIndents = originalLinesRange.mapToLineArray((line) => indentOfLine(textModel.getLineContent(line)));
    const modifiedIndents = modifiedLines
        .filter((line) => line !== '')
        .map((line) => indentOfLine(line));
    const prefixTrim = Math.min(...replacementStart, ...originalIndents, ...modifiedIndents);
    let prefixLeftOffset;
    const startLineIndent = textModel.getLineIndentColumn(originalLinesRange.startLineNumber);
    if (startLineIndent >= prefixTrim + 1) {
        // We can use the editor to get the offset
        prefixLeftOffset = editor.getOffsetForColumn(originalLinesRange.startLineNumber, prefixTrim + 1);
    }
    else if (modifiedLines.length > 0) {
        // Content is not in the editor, we can use the content width to calculate the offset
        prefixLeftOffset = getContentRenderWidth(modifiedLines[0].slice(0, prefixTrim), editor, textModel);
    }
    else {
        // unable to approximate the offset
        return { prefixTrim: 0, prefixLeftOffset: 0 };
    }
    return { prefixTrim, prefixLeftOffset };
}
export function getContentRenderWidth(content, editor, textModel) {
    const w = editor.getOption(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
    const tabSize = textModel.getOptions().tabSize * w;
    const numTabs = content.split('\t').length - 1;
    const numNoneTabs = content.length - numTabs;
    return numNoneTabs * w + numTabs * tabSize;
}
export class StatusBarViewItem extends MenuEntryActionViewItem {
    constructor() {
        super(...arguments);
        this._updateLabelListener = this._register(this._contextKeyService.onDidChangeContext(() => {
            this.updateLabel();
        }));
    }
    updateLabel() {
        const kb = this._keybindingService.lookupKeybinding(this._action.id, this._contextKeyService, true);
        if (!kb) {
            return super.updateLabel();
        }
        if (this.label) {
            const div = h('div.keybinding').root;
            const keybindingLabel = this._register(new KeybindingLabel(div, OS, { disableTitle: true, ...unthemedKeybindingLabelOptions }));
            keybindingLabel.set(kb);
            this.label.textContent = this._action.label;
            this.label.appendChild(div);
            this.label.classList.add('inlineSuggestionStatusBarItemLabel');
        }
    }
    updateTooltip() {
        // NOOP, disable tooltip
    }
}
export class UniqueUriGenerator {
    static { this._modelId = 0; }
    constructor(scheme) {
        this.scheme = scheme;
    }
    getUniqueUri() {
        return URI.from({
            scheme: this.scheme,
            path: new Date().toString() + String(UniqueUriGenerator._modelId++),
        });
    }
}
export function applyEditToModifiedRangeMappings(rangeMapping, edit) {
    const updatedMappings = [];
    for (const m of rangeMapping) {
        const updatedRange = edit.mapRange(m.modifiedRange);
        updatedMappings.push(new RangeMapping(m.originalRange, updatedRange));
    }
    return updatedMappings;
}
export function classNames(...classes) {
    return classes.filter((c) => typeof c === 'string').join(' ');
}
function offsetRangeToRange(columnOffsetRange, startPos) {
    return new Range(startPos.lineNumber, startPos.column + columnOffsetRange.start, startPos.lineNumber, startPos.column + columnOffsetRange.endExclusive);
}
export function createReindentEdit(text, range) {
    const newLines = splitLines(text);
    const edits = [];
    const minIndent = findFirstMin(range.mapToLineArray((l) => getIndentationLength(newLines[l - 1])), numberComparator);
    range.forEach((lineNumber) => {
        edits.push(new SingleTextEdit(offsetRangeToRange(new OffsetRange(0, minIndent), new Position(lineNumber, 1)), ''));
    });
    return new TextEdit(edits);
}
export class PathBuilder {
    constructor() {
        this._data = '';
    }
    moveTo(point) {
        this._data += `M ${point.x} ${point.y} `;
        return this;
    }
    lineTo(point) {
        this._data += `L ${point.x} ${point.y} `;
        return this;
    }
    curveTo(cp, to) {
        this._data += `Q ${cp.x} ${cp.y} ${to.x} ${to.y} `;
        return this;
    }
    curveTo2(cp1, cp2, to) {
        this._data += `C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${to.x} ${to.y} `;
        return this;
    }
    build() {
        return this._data;
    }
}
// Arguments are a bit messy currently, could be improved
export function createRectangle(layout, padding, borderRadius, options = {}) {
    const topLeftInner = layout.topLeft;
    const topRightInner = topLeftInner.deltaX(layout.width);
    const bottomLeftInner = topLeftInner.deltaY(layout.height);
    const bottomRightInner = bottomLeftInner.deltaX(layout.width);
    // padding
    const { top: paddingTop, bottom: paddingBottom, left: paddingLeft, right: paddingRight, } = typeof padding === 'number'
        ? { top: padding, bottom: padding, left: padding, right: padding }
        : padding;
    // corner radius
    const { topLeft: radiusTL, topRight: radiusTR, bottomLeft: radiusBL, bottomRight: radiusBR, } = typeof borderRadius === 'number'
        ? {
            topLeft: borderRadius,
            topRight: borderRadius,
            bottomLeft: borderRadius,
            bottomRight: borderRadius,
        }
        : borderRadius;
    const totalHeight = layout.height + paddingTop + paddingBottom;
    const totalWidth = layout.width + paddingLeft + paddingRight;
    // The path is drawn from bottom left at the end of the rounded corner in a clockwise direction
    // Before: before the rounded corner
    // After: after the rounded corner
    const topLeft = topLeftInner.deltaX(-paddingLeft).deltaY(-paddingTop);
    const topRight = topRightInner.deltaX(paddingRight).deltaY(-paddingTop);
    const topLeftBefore = topLeft.deltaY(Math.min(radiusTL, totalHeight / 2));
    const topLeftAfter = topLeft.deltaX(Math.min(radiusTL, totalWidth / 2));
    const topRightBefore = topRight.deltaX(-Math.min(radiusTR, totalWidth / 2));
    const topRightAfter = topRight.deltaY(Math.min(radiusTR, totalHeight / 2));
    const bottomLeft = bottomLeftInner.deltaX(-paddingLeft).deltaY(paddingBottom);
    const bottomRight = bottomRightInner.deltaX(paddingRight).deltaY(paddingBottom);
    const bottomLeftBefore = bottomLeft.deltaX(Math.min(radiusBL, totalWidth / 2));
    const bottomLeftAfter = bottomLeft.deltaY(-Math.min(radiusBL, totalHeight / 2));
    const bottomRightBefore = bottomRight.deltaY(-Math.min(radiusBR, totalHeight / 2));
    const bottomRightAfter = bottomRight.deltaX(-Math.min(radiusBR, totalWidth / 2));
    const path = new PathBuilder();
    if (!options.hideLeft) {
        path.moveTo(bottomLeftAfter).lineTo(topLeftBefore);
    }
    if (!options.hideLeft && !options.hideTop) {
        path.curveTo(topLeft, topLeftAfter);
    }
    else {
        path.moveTo(topLeftAfter);
    }
    if (!options.hideTop) {
        path.lineTo(topRightBefore);
    }
    if (!options.hideTop && !options.hideRight) {
        path.curveTo(topRight, topRightAfter);
    }
    else {
        path.moveTo(topRightAfter);
    }
    if (!options.hideRight) {
        path.lineTo(bottomRightBefore);
    }
    if (!options.hideRight && !options.hideBottom) {
        path.curveTo(bottomRight, bottomRightAfter);
    }
    else {
        path.moveTo(bottomRightAfter);
    }
    if (!options.hideBottom) {
        path.lineTo(bottomLeftBefore);
    }
    if (!options.hideBottom && !options.hideLeft) {
        path.curveTo(bottomLeft, bottomLeftAfter);
    }
    else {
        path.moveTo(bottomLeftAfter);
    }
    return path.build();
}
export function mapOutFalsy(obs) {
    const nonUndefinedObs = derivedObservableWithCache(undefined, (reader, lastValue) => obs.read(reader) || lastValue);
    return derivedOpts({
        debugName: () => `${obs.debugName}.mapOutFalsy`,
    }, (reader) => {
        nonUndefinedObs.read(reader);
        const val = obs.read(reader);
        if (!val) {
            return undefined;
        }
        return nonUndefinedObs;
    });
}
export function observeElementPosition(element, store) {
    const topLeft = getDomNodePagePosition(element);
    const top = observableValue('top', topLeft.top);
    const left = observableValue('left', topLeft.left);
    const resizeObserver = new ResizeObserver(() => {
        transaction((tx) => {
            const topLeft = getDomNodePagePosition(element);
            top.set(topLeft.top, tx);
            left.set(topLeft.left, tx);
        });
    });
    resizeObserver.observe(element);
    store.add(toDisposable(() => resizeObserver.disconnect()));
    return {
        top,
        left,
    };
}
export function rectToProps(fn) {
    return {
        left: derived((reader) => /** @description left */ fn(reader).left),
        top: derived((reader) => /** @description top */ fn(reader).top),
        width: derived((reader) => /** @description width */ fn(reader).right - fn(reader).left),
        height: derived((reader) => /** @description height */ fn(reader).bottom - fn(reader).top),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvdXRpbHMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3BGLE9BQU8sRUFDTixlQUFlLEVBQ2YsOEJBQThCLEdBQzlCLE1BQU0seUVBQXlFLENBQUE7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdFLE9BQU8sRUFBbUIsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0YsT0FBTyxFQUNOLE9BQU8sRUFDUCwwQkFBMEIsRUFDMUIsV0FBVyxFQUdYLGVBQWUsRUFDZixXQUFXLEdBQ1gsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQU9sSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxN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
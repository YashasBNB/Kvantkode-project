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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy91dGlscy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDcEYsT0FBTyxFQUNOLGVBQWUsRUFDZiw4QkFBOEIsR0FDOUIsTUFBTSx5RUFBeUUsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDN0UsT0FBTyxFQUFtQixZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RixPQUFPLEVBQ04sT0FBTyxFQUNQLDBCQUEwQixFQUMxQixXQUFXLEVBR1gsZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBT2xILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxF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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PageCoordinates, } from '../editorDom.js';
import { PartFingerprints } from '../view/viewPart.js';
import { ViewLine } from '../viewParts/viewLines/viewLine.js';
import { Position } from '../../common/core/position.js';
import { Range as EditorRange } from '../../common/core/range.js';
import { CursorColumns } from '../../common/core/cursorColumns.js';
import * as dom from '../../../base/browser/dom.js';
import { AtomicTabMoveOperations, } from '../../common/cursor/cursorAtomicMoveOperations.js';
import { Lazy } from '../../../base/common/lazy.js';
var HitTestResultType;
(function (HitTestResultType) {
    HitTestResultType[HitTestResultType["Unknown"] = 0] = "Unknown";
    HitTestResultType[HitTestResultType["Content"] = 1] = "Content";
})(HitTestResultType || (HitTestResultType = {}));
class UnknownHitTestResult {
    constructor(hitTarget = null) {
        this.hitTarget = hitTarget;
        this.type = 0 /* HitTestResultType.Unknown */;
    }
}
class ContentHitTestResult {
    get hitTarget() {
        return this.spanNode;
    }
    constructor(position, spanNode, injectedText) {
        this.position = position;
        this.spanNode = spanNode;
        this.injectedText = injectedText;
        this.type = 1 /* HitTestResultType.Content */;
    }
}
var HitTestResult;
(function (HitTestResult) {
    function createFromDOMInfo(ctx, spanNode, offset) {
        const position = ctx.getPositionFromDOMInfo(spanNode, offset);
        if (position) {
            return new ContentHitTestResult(position, spanNode, null);
        }
        return new UnknownHitTestResult(spanNode);
    }
    HitTestResult.createFromDOMInfo = createFromDOMInfo;
})(HitTestResult || (HitTestResult = {}));
export class PointerHandlerLastRenderData {
    constructor(lastViewCursorsRenderData, lastTextareaPosition) {
        this.lastViewCursorsRenderData = lastViewCursorsRenderData;
        this.lastTextareaPosition = lastTextareaPosition;
    }
}
export class MouseTarget {
    static _deduceRage(position, range = null) {
        if (!range && position) {
            return new EditorRange(position.lineNumber, position.column, position.lineNumber, position.column);
        }
        return range ?? null;
    }
    static createUnknown(element, mouseColumn, position) {
        return {
            type: 0 /* MouseTargetType.UNKNOWN */,
            element,
            mouseColumn,
            position,
            range: this._deduceRage(position),
        };
    }
    static createTextarea(element, mouseColumn) {
        return { type: 1 /* MouseTargetType.TEXTAREA */, element, mouseColumn, position: null, range: null };
    }
    static createMargin(type, element, mouseColumn, position, range, detail) {
        return { type, element, mouseColumn, position, range, detail };
    }
    static createViewZone(type, element, mouseColumn, position, detail) {
        return { type, element, mouseColumn, position, range: this._deduceRage(position), detail };
    }
    static createContentText(element, mouseColumn, position, range, detail) {
        return {
            type: 6 /* MouseTargetType.CONTENT_TEXT */,
            element,
            mouseColumn,
            position,
            range: this._deduceRage(position, range),
            detail,
        };
    }
    static createContentEmpty(element, mouseColumn, position, detail) {
        return {
            type: 7 /* MouseTargetType.CONTENT_EMPTY */,
            element,
            mouseColumn,
            position,
            range: this._deduceRage(position),
            detail,
        };
    }
    static createContentWidget(element, mouseColumn, detail) {
        return {
            type: 9 /* MouseTargetType.CONTENT_WIDGET */,
            element,
            mouseColumn,
            position: null,
            range: null,
            detail,
        };
    }
    static createScrollbar(element, mouseColumn, position) {
        return {
            type: 11 /* MouseTargetType.SCROLLBAR */,
            element,
            mouseColumn,
            position,
            range: this._deduceRage(position),
        };
    }
    static createOverlayWidget(element, mouseColumn, detail) {
        return {
            type: 12 /* MouseTargetType.OVERLAY_WIDGET */,
            element,
            mouseColumn,
            position: null,
            range: null,
            detail,
        };
    }
    static createOutsideEditor(mouseColumn, position, outsidePosition, outsideDistance) {
        return {
            type: 13 /* MouseTargetType.OUTSIDE_EDITOR */,
            element: null,
            mouseColumn,
            position,
            range: this._deduceRage(position),
            outsidePosition,
            outsideDistance,
        };
    }
    static _typeToString(type) {
        if (type === 1 /* MouseTargetType.TEXTAREA */) {
            return 'TEXTAREA';
        }
        if (type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */) {
            return 'GUTTER_GLYPH_MARGIN';
        }
        if (type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */) {
            return 'GUTTER_LINE_NUMBERS';
        }
        if (type === 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
            return 'GUTTER_LINE_DECORATIONS';
        }
        if (type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */) {
            return 'GUTTER_VIEW_ZONE';
        }
        if (type === 6 /* MouseTargetType.CONTENT_TEXT */) {
            return 'CONTENT_TEXT';
        }
        if (type === 7 /* MouseTargetType.CONTENT_EMPTY */) {
            return 'CONTENT_EMPTY';
        }
        if (type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */) {
            return 'CONTENT_VIEW_ZONE';
        }
        if (type === 9 /* MouseTargetType.CONTENT_WIDGET */) {
            return 'CONTENT_WIDGET';
        }
        if (type === 10 /* MouseTargetType.OVERVIEW_RULER */) {
            return 'OVERVIEW_RULER';
        }
        if (type === 11 /* MouseTargetType.SCROLLBAR */) {
            return 'SCROLLBAR';
        }
        if (type === 12 /* MouseTargetType.OVERLAY_WIDGET */) {
            return 'OVERLAY_WIDGET';
        }
        return 'UNKNOWN';
    }
    static toString(target) {
        return (this._typeToString(target.type) +
            ': ' +
            target.position +
            ' - ' +
            target.range +
            ' - ' +
            JSON.stringify(target.detail));
    }
}
class ElementPath {
    static isTextArea(path) {
        return (path.length === 2 &&
            path[0] === 3 /* PartFingerprint.OverflowGuard */ &&
            path[1] === 7 /* PartFingerprint.TextArea */);
    }
    static isChildOfViewLines(path) {
        return (path.length >= 4 &&
            path[0] === 3 /* PartFingerprint.OverflowGuard */ &&
            path[3] === 8 /* PartFingerprint.ViewLines */);
    }
    static isStrictChildOfViewLines(path) {
        return (path.length > 4 &&
            path[0] === 3 /* PartFingerprint.OverflowGuard */ &&
            path[3] === 8 /* PartFingerprint.ViewLines */);
    }
    static isChildOfScrollableElement(path) {
        return (path.length >= 2 &&
            path[0] === 3 /* PartFingerprint.OverflowGuard */ &&
            path[1] === 6 /* PartFingerprint.ScrollableElement */);
    }
    static isChildOfMinimap(path) {
        return (path.length >= 2 &&
            path[0] === 3 /* PartFingerprint.OverflowGuard */ &&
            path[1] === 9 /* PartFingerprint.Minimap */);
    }
    static isChildOfContentWidgets(path) {
        return (path.length >= 4 &&
            path[0] === 3 /* PartFingerprint.OverflowGuard */ &&
            path[3] === 1 /* PartFingerprint.ContentWidgets */);
    }
    static isChildOfOverflowGuard(path) {
        return path.length >= 1 && path[0] === 3 /* PartFingerprint.OverflowGuard */;
    }
    static isChildOfOverflowingContentWidgets(path) {
        return path.length >= 1 && path[0] === 2 /* PartFingerprint.OverflowingContentWidgets */;
    }
    static isChildOfOverlayWidgets(path) {
        return (path.length >= 2 &&
            path[0] === 3 /* PartFingerprint.OverflowGuard */ &&
            path[1] === 4 /* PartFingerprint.OverlayWidgets */);
    }
    static isChildOfOverflowingOverlayWidgets(path) {
        return path.length >= 1 && path[0] === 5 /* PartFingerprint.OverflowingOverlayWidgets */;
    }
}
export class HitTestContext {
    constructor(context, viewHelper, lastRenderData) {
        this.viewModel = context.viewModel;
        const options = context.configuration.options;
        this.layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this.viewDomNode = viewHelper.viewDomNode;
        this.viewLinesGpu = viewHelper.viewLinesGpu;
        this.lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this.stickyTabStops = options.get(121 /* EditorOption.stickyTabStops */);
        this.typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        this.lastRenderData = lastRenderData;
        this._context = context;
        this._viewHelper = viewHelper;
    }
    getZoneAtCoord(mouseVerticalOffset) {
        return HitTestContext.getZoneAtCoord(this._context, mouseVerticalOffset);
    }
    static getZoneAtCoord(context, mouseVerticalOffset) {
        // The target is either a view zone or the empty space after the last view-line
        const viewZoneWhitespace = context.viewLayout.getWhitespaceAtVerticalOffset(mouseVerticalOffset);
        if (viewZoneWhitespace) {
            const viewZoneMiddle = viewZoneWhitespace.verticalOffset + viewZoneWhitespace.height / 2;
            const lineCount = context.viewModel.getLineCount();
            let positionBefore = null;
            let position;
            let positionAfter = null;
            if (viewZoneWhitespace.afterLineNumber !== lineCount) {
                // There are more lines after this view zone
                positionAfter = new Position(viewZoneWhitespace.afterLineNumber + 1, 1);
            }
            if (viewZoneWhitespace.afterLineNumber > 0) {
                // There are more lines above this view zone
                positionBefore = new Position(viewZoneWhitespace.afterLineNumber, context.viewModel.getLineMaxColumn(viewZoneWhitespace.afterLineNumber));
            }
            if (positionAfter === null) {
                position = positionBefore;
            }
            else if (positionBefore === null) {
                position = positionAfter;
            }
            else if (mouseVerticalOffset < viewZoneMiddle) {
                position = positionBefore;
            }
            else {
                position = positionAfter;
            }
            return {
                viewZoneId: viewZoneWhitespace.id,
                afterLineNumber: viewZoneWhitespace.afterLineNumber,
                positionBefore: positionBefore,
                positionAfter: positionAfter,
                position: position,
            };
        }
        return null;
    }
    getFullLineRangeAtCoord(mouseVerticalOffset) {
        if (this._context.viewLayout.isAfterLines(mouseVerticalOffset)) {
            // Below the last line
            const lineNumber = this._context.viewModel.getLineCount();
            const maxLineColumn = this._context.viewModel.getLineMaxColumn(lineNumber);
            return {
                range: new EditorRange(lineNumber, maxLineColumn, lineNumber, maxLineColumn),
                isAfterLines: true,
            };
        }
        const lineNumber = this._context.viewLayout.getLineNumberAtVerticalOffset(mouseVerticalOffset);
        const maxLineColumn = this._context.viewModel.getLineMaxColumn(lineNumber);
        return {
            range: new EditorRange(lineNumber, 1, lineNumber, maxLineColumn),
            isAfterLines: false,
        };
    }
    getLineNumberAtVerticalOffset(mouseVerticalOffset) {
        return this._context.viewLayout.getLineNumberAtVerticalOffset(mouseVerticalOffset);
    }
    isAfterLines(mouseVerticalOffset) {
        return this._context.viewLayout.isAfterLines(mouseVerticalOffset);
    }
    isInTopPadding(mouseVerticalOffset) {
        return this._context.viewLayout.isInTopPadding(mouseVerticalOffset);
    }
    isInBottomPadding(mouseVerticalOffset) {
        return this._context.viewLayout.isInBottomPadding(mouseVerticalOffset);
    }
    getVerticalOffsetForLineNumber(lineNumber) {
        return this._context.viewLayout.getVerticalOffsetForLineNumber(lineNumber);
    }
    findAttribute(element, attr) {
        return HitTestContext._findAttribute(element, attr, this._viewHelper.viewDomNode);
    }
    static _findAttribute(element, attr, stopAt) {
        while (element && element !== element.ownerDocument.body) {
            if (element.hasAttribute && element.hasAttribute(attr)) {
                return element.getAttribute(attr);
            }
            if (element === stopAt) {
                return null;
            }
            element = element.parentNode;
        }
        return null;
    }
    getLineWidth(lineNumber) {
        return this._viewHelper.getLineWidth(lineNumber);
    }
    visibleRangeForPosition(lineNumber, column) {
        return this._viewHelper.visibleRangeForPosition(lineNumber, column);
    }
    getPositionFromDOMInfo(spanNode, offset) {
        return this._viewHelper.getPositionFromDOMInfo(spanNode, offset);
    }
    getCurrentScrollTop() {
        return this._context.viewLayout.getCurrentScrollTop();
    }
    getCurrentScrollLeft() {
        return this._context.viewLayout.getCurrentScrollLeft();
    }
}
class BareHitTestRequest {
    constructor(ctx, editorPos, pos, relativePos) {
        this.editorPos = editorPos;
        this.pos = pos;
        this.relativePos = relativePos;
        this.mouseVerticalOffset = Math.max(0, ctx.getCurrentScrollTop() + this.relativePos.y);
        this.mouseContentHorizontalOffset =
            ctx.getCurrentScrollLeft() + this.relativePos.x - ctx.layoutInfo.contentLeft;
        this.isInMarginArea =
            this.relativePos.x < ctx.layoutInfo.contentLeft &&
                this.relativePos.x >= ctx.layoutInfo.glyphMarginLeft;
        this.isInContentArea = !this.isInMarginArea;
        this.mouseColumn = Math.max(0, MouseTargetFactory._getMouseColumn(this.mouseContentHorizontalOffset, ctx.typicalHalfwidthCharacterWidth));
    }
}
class HitTestRequest extends BareHitTestRequest {
    get target() {
        if (this._useHitTestTarget) {
            return this.hitTestResult.value.hitTarget;
        }
        return this._eventTarget;
    }
    get targetPath() {
        if (this._targetPathCacheElement !== this.target) {
            this._targetPathCacheElement = this.target;
            this._targetPathCacheValue = PartFingerprints.collect(this.target, this._ctx.viewDomNode);
        }
        return this._targetPathCacheValue;
    }
    constructor(ctx, editorPos, pos, relativePos, eventTarget) {
        super(ctx, editorPos, pos, relativePos);
        this.hitTestResult = new Lazy(() => MouseTargetFactory.doHitTest(this._ctx, this));
        this._targetPathCacheElement = null;
        this._targetPathCacheValue = new Uint8Array(0);
        this._ctx = ctx;
        this._eventTarget = eventTarget;
        // If no event target is passed in, we will use the hit test target
        const hasEventTarget = Boolean(this._eventTarget);
        this._useHitTestTarget = !hasEventTarget;
    }
    toString() {
        return `pos(${this.pos.x},${this.pos.y}), editorPos(${this.editorPos.x},${this.editorPos.y}), relativePos(${this.relativePos.x},${this.relativePos.y}), mouseVerticalOffset: ${this.mouseVerticalOffset}, mouseContentHorizontalOffset: ${this.mouseContentHorizontalOffset}\n\ttarget: ${this.target ? this.target.outerHTML : null}`;
    }
    get wouldBenefitFromHitTestTargetSwitch() {
        return (!this._useHitTestTarget &&
            this.hitTestResult.value.hitTarget !== null &&
            this.target !== this.hitTestResult.value.hitTarget);
    }
    switchToHitTestTarget() {
        this._useHitTestTarget = true;
    }
    _getMouseColumn(position = null) {
        if (position && position.column < this._ctx.viewModel.getLineMaxColumn(position.lineNumber)) {
            // Most likely, the line contains foreign decorations...
            return (CursorColumns.visibleColumnFromColumn(this._ctx.viewModel.getLineContent(position.lineNumber), position.column, this._ctx.viewModel.model.getOptions().tabSize) + 1);
        }
        return this.mouseColumn;
    }
    fulfillUnknown(position = null) {
        return MouseTarget.createUnknown(this.target, this._getMouseColumn(position), position);
    }
    fulfillTextarea() {
        return MouseTarget.createTextarea(this.target, this._getMouseColumn());
    }
    fulfillMargin(type, position, range, detail) {
        return MouseTarget.createMargin(type, this.target, this._getMouseColumn(position), position, range, detail);
    }
    fulfillViewZone(type, position, detail) {
        return MouseTarget.createViewZone(type, this.target, this._getMouseColumn(position), position, detail);
    }
    fulfillContentText(position, range, detail) {
        return MouseTarget.createContentText(this.target, this._getMouseColumn(position), position, range, detail);
    }
    fulfillContentEmpty(position, detail) {
        return MouseTarget.createContentEmpty(this.target, this._getMouseColumn(position), position, detail);
    }
    fulfillContentWidget(detail) {
        return MouseTarget.createContentWidget(this.target, this._getMouseColumn(), detail);
    }
    fulfillScrollbar(position) {
        return MouseTarget.createScrollbar(this.target, this._getMouseColumn(position), position);
    }
    fulfillOverlayWidget(detail) {
        return MouseTarget.createOverlayWidget(this.target, this._getMouseColumn(), detail);
    }
}
const EMPTY_CONTENT_AFTER_LINES = { isAfterLines: true };
function createEmptyContentDataInLines(horizontalDistanceToText) {
    return {
        isAfterLines: false,
        horizontalDistanceToText: horizontalDistanceToText,
    };
}
export class MouseTargetFactory {
    constructor(context, viewHelper) {
        this._context = context;
        this._viewHelper = viewHelper;
    }
    mouseTargetIsWidget(e) {
        const t = e.target;
        const path = PartFingerprints.collect(t, this._viewHelper.viewDomNode);
        // Is it a content widget?
        if (ElementPath.isChildOfContentWidgets(path) ||
            ElementPath.isChildOfOverflowingContentWidgets(path)) {
            return true;
        }
        // Is it an overlay widget?
        if (ElementPath.isChildOfOverlayWidgets(path) ||
            ElementPath.isChildOfOverflowingOverlayWidgets(path)) {
            return true;
        }
        return false;
    }
    createMouseTarget(lastRenderData, editorPos, pos, relativePos, target) {
        const ctx = new HitTestContext(this._context, this._viewHelper, lastRenderData);
        const request = new HitTestRequest(ctx, editorPos, pos, relativePos, target);
        try {
            const r = MouseTargetFactory._createMouseTarget(ctx, request);
            if (r.type === 6 /* MouseTargetType.CONTENT_TEXT */) {
                // Snap to the nearest soft tab boundary if atomic soft tabs are enabled.
                if (ctx.stickyTabStops && r.position !== null) {
                    const position = MouseTargetFactory._snapToSoftTabBoundary(r.position, ctx.viewModel);
                    const range = EditorRange.fromPositions(position, position).plusRange(r.range);
                    return request.fulfillContentText(position, range, r.detail);
                }
            }
            // console.log(MouseTarget.toString(r));
            return r;
        }
        catch (err) {
            // console.log(err);
            return request.fulfillUnknown();
        }
    }
    static _createMouseTarget(ctx, request) {
        // console.log(`${domHitTestExecuted ? '=>' : ''}CAME IN REQUEST: ${request}`);
        if (request.target === null) {
            // No target
            return request.fulfillUnknown();
        }
        // we know for a fact that request.target is not null
        const resolvedRequest = request;
        let result = null;
        if (!ElementPath.isChildOfOverflowGuard(request.targetPath) &&
            !ElementPath.isChildOfOverflowingContentWidgets(request.targetPath) &&
            !ElementPath.isChildOfOverflowingOverlayWidgets(request.targetPath)) {
            // We only render dom nodes inside the overflow guard or in the overflowing content widgets
            result = result || request.fulfillUnknown();
        }
        result = result || MouseTargetFactory._hitTestContentWidget(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestOverlayWidget(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestMinimap(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestScrollbarSlider(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestViewZone(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestMargin(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestViewCursor(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestTextArea(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestViewLines(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestScrollbar(ctx, resolvedRequest);
        return result || request.fulfillUnknown();
    }
    static _hitTestContentWidget(ctx, request) {
        // Is it a content widget?
        if (ElementPath.isChildOfContentWidgets(request.targetPath) ||
            ElementPath.isChildOfOverflowingContentWidgets(request.targetPath)) {
            const widgetId = ctx.findAttribute(request.target, 'widgetId');
            if (widgetId) {
                return request.fulfillContentWidget(widgetId);
            }
            else {
                return request.fulfillUnknown();
            }
        }
        return null;
    }
    static _hitTestOverlayWidget(ctx, request) {
        // Is it an overlay widget?
        if (ElementPath.isChildOfOverlayWidgets(request.targetPath) ||
            ElementPath.isChildOfOverflowingOverlayWidgets(request.targetPath)) {
            const widgetId = ctx.findAttribute(request.target, 'widgetId');
            if (widgetId) {
                return request.fulfillOverlayWidget(widgetId);
            }
            else {
                return request.fulfillUnknown();
            }
        }
        return null;
    }
    static _hitTestViewCursor(ctx, request) {
        if (request.target) {
            // Check if we've hit a painted cursor
            const lastViewCursorsRenderData = ctx.lastRenderData.lastViewCursorsRenderData;
            for (const d of lastViewCursorsRenderData) {
                if (request.target === d.domNode) {
                    return request.fulfillContentText(d.position, null, {
                        mightBeForeignElement: false,
                        injectedText: null,
                    });
                }
            }
        }
        if (request.isInContentArea) {
            // Edge has a bug when hit-testing the exact position of a cursor,
            // instead of returning the correct dom node, it returns the
            // first or last rendered view line dom node, therefore help it out
            // and first check if we are on top of a cursor
            const lastViewCursorsRenderData = ctx.lastRenderData.lastViewCursorsRenderData;
            const mouseContentHorizontalOffset = request.mouseContentHorizontalOffset;
            const mouseVerticalOffset = request.mouseVerticalOffset;
            for (const d of lastViewCursorsRenderData) {
                if (mouseContentHorizontalOffset < d.contentLeft) {
                    // mouse position is to the left of the cursor
                    continue;
                }
                if (mouseContentHorizontalOffset > d.contentLeft + d.width) {
                    // mouse position is to the right of the cursor
                    continue;
                }
                const cursorVerticalOffset = ctx.getVerticalOffsetForLineNumber(d.position.lineNumber);
                if (cursorVerticalOffset <= mouseVerticalOffset &&
                    mouseVerticalOffset <= cursorVerticalOffset + d.height) {
                    return request.fulfillContentText(d.position, null, {
                        mightBeForeignElement: false,
                        injectedText: null,
                    });
                }
            }
        }
        return null;
    }
    static _hitTestViewZone(ctx, request) {
        const viewZoneData = ctx.getZoneAtCoord(request.mouseVerticalOffset);
        if (viewZoneData) {
            const mouseTargetType = request.isInContentArea
                ? 8 /* MouseTargetType.CONTENT_VIEW_ZONE */
                : 5 /* MouseTargetType.GUTTER_VIEW_ZONE */;
            return request.fulfillViewZone(mouseTargetType, viewZoneData.position, viewZoneData);
        }
        return null;
    }
    static _hitTestTextArea(ctx, request) {
        // Is it the textarea?
        if (ElementPath.isTextArea(request.targetPath)) {
            if (ctx.lastRenderData.lastTextareaPosition) {
                return request.fulfillContentText(ctx.lastRenderData.lastTextareaPosition, null, {
                    mightBeForeignElement: false,
                    injectedText: null,
                });
            }
            return request.fulfillTextarea();
        }
        return null;
    }
    static _hitTestMargin(ctx, request) {
        if (request.isInMarginArea) {
            const res = ctx.getFullLineRangeAtCoord(request.mouseVerticalOffset);
            const pos = res.range.getStartPosition();
            let offset = Math.abs(request.relativePos.x);
            const detail = {
                isAfterLines: res.isAfterLines,
                glyphMarginLeft: ctx.layoutInfo.glyphMarginLeft,
                glyphMarginWidth: ctx.layoutInfo.glyphMarginWidth,
                lineNumbersWidth: ctx.layoutInfo.lineNumbersWidth,
                offsetX: offset,
            };
            offset -= ctx.layoutInfo.glyphMarginLeft;
            if (offset <= ctx.layoutInfo.glyphMarginWidth) {
                // On the glyph margin
                const modelCoordinate = ctx.viewModel.coordinatesConverter.convertViewPositionToModelPosition(res.range.getStartPosition());
                const lanes = ctx.viewModel.glyphLanes.getLanesAtLine(modelCoordinate.lineNumber);
                detail.glyphMarginLane = lanes[Math.floor(offset / ctx.lineHeight)];
                return request.fulfillMargin(2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */, pos, res.range, detail);
            }
            offset -= ctx.layoutInfo.glyphMarginWidth;
            if (offset <= ctx.layoutInfo.lineNumbersWidth) {
                // On the line numbers
                return request.fulfillMargin(3 /* MouseTargetType.GUTTER_LINE_NUMBERS */, pos, res.range, detail);
            }
            offset -= ctx.layoutInfo.lineNumbersWidth;
            // On the line decorations
            return request.fulfillMargin(4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */, pos, res.range, detail);
        }
        return null;
    }
    static _hitTestViewLines(ctx, request) {
        if (!ElementPath.isChildOfViewLines(request.targetPath)) {
            return null;
        }
        if (ctx.isInTopPadding(request.mouseVerticalOffset)) {
            return request.fulfillContentEmpty(new Position(1, 1), EMPTY_CONTENT_AFTER_LINES);
        }
        // Check if it is below any lines and any view zones
        if (ctx.isAfterLines(request.mouseVerticalOffset) ||
            ctx.isInBottomPadding(request.mouseVerticalOffset)) {
            // This most likely indicates it happened after the last view-line
            const lineCount = ctx.viewModel.getLineCount();
            const maxLineColumn = ctx.viewModel.getLineMaxColumn(lineCount);
            return request.fulfillContentEmpty(new Position(lineCount, maxLineColumn), EMPTY_CONTENT_AFTER_LINES);
        }
        // Check if we are hitting a view-line (can happen in the case of inline decorations on empty lines)
        // See https://github.com/microsoft/vscode/issues/46942
        if (ElementPath.isStrictChildOfViewLines(request.targetPath)) {
            const lineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
            if (ctx.viewModel.getLineLength(lineNumber) === 0) {
                const lineWidth = ctx.getLineWidth(lineNumber);
                const detail = createEmptyContentDataInLines(request.mouseContentHorizontalOffset - lineWidth);
                return request.fulfillContentEmpty(new Position(lineNumber, 1), detail);
            }
            const lineWidth = ctx.getLineWidth(lineNumber);
            if (request.mouseContentHorizontalOffset >= lineWidth) {
                // TODO: This is wrong for RTL
                const detail = createEmptyContentDataInLines(request.mouseContentHorizontalOffset - lineWidth);
                const pos = new Position(lineNumber, ctx.viewModel.getLineMaxColumn(lineNumber));
                return request.fulfillContentEmpty(pos, detail);
            }
        }
        else {
            if (ctx.viewLinesGpu) {
                const lineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
                if (ctx.viewModel.getLineLength(lineNumber) === 0) {
                    const lineWidth = ctx.getLineWidth(lineNumber);
                    const detail = createEmptyContentDataInLines(request.mouseContentHorizontalOffset - lineWidth);
                    return request.fulfillContentEmpty(new Position(lineNumber, 1), detail);
                }
                const lineWidth = ctx.getLineWidth(lineNumber);
                if (request.mouseContentHorizontalOffset >= lineWidth) {
                    // TODO: This is wrong for RTL
                    const detail = createEmptyContentDataInLines(request.mouseContentHorizontalOffset - lineWidth);
                    const pos = new Position(lineNumber, ctx.viewModel.getLineMaxColumn(lineNumber));
                    return request.fulfillContentEmpty(pos, detail);
                }
                const position = ctx.viewLinesGpu.getPositionAtCoordinate(lineNumber, request.mouseContentHorizontalOffset);
                if (position) {
                    const detail = {
                        injectedText: null,
                        mightBeForeignElement: false,
                    };
                    return request.fulfillContentText(position, EditorRange.fromPositions(position, position), detail);
                }
            }
        }
        // Do the hit test (if not already done)
        const hitTestResult = request.hitTestResult.value;
        if (hitTestResult.type === 1 /* HitTestResultType.Content */) {
            return MouseTargetFactory.createMouseTargetFromHitTestPosition(ctx, request, hitTestResult.spanNode, hitTestResult.position, hitTestResult.injectedText);
        }
        // We didn't hit content...
        if (request.wouldBenefitFromHitTestTargetSwitch) {
            // We actually hit something different... Give it one last change by trying again with this new target
            request.switchToHitTestTarget();
            return this._createMouseTarget(ctx, request);
        }
        // We have tried everything...
        return request.fulfillUnknown();
    }
    static _hitTestMinimap(ctx, request) {
        if (ElementPath.isChildOfMinimap(request.targetPath)) {
            const possibleLineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
            const maxColumn = ctx.viewModel.getLineMaxColumn(possibleLineNumber);
            return request.fulfillScrollbar(new Position(possibleLineNumber, maxColumn));
        }
        return null;
    }
    static _hitTestScrollbarSlider(ctx, request) {
        if (ElementPath.isChildOfScrollableElement(request.targetPath)) {
            if (request.target && request.target.nodeType === 1) {
                const className = request.target.className;
                if (className && /\b(slider|scrollbar)\b/.test(className)) {
                    const possibleLineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
                    const maxColumn = ctx.viewModel.getLineMaxColumn(possibleLineNumber);
                    return request.fulfillScrollbar(new Position(possibleLineNumber, maxColumn));
                }
            }
        }
        return null;
    }
    static _hitTestScrollbar(ctx, request) {
        // Is it the overview ruler?
        // Is it a child of the scrollable element?
        if (ElementPath.isChildOfScrollableElement(request.targetPath)) {
            const possibleLineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
            const maxColumn = ctx.viewModel.getLineMaxColumn(possibleLineNumber);
            return request.fulfillScrollbar(new Position(possibleLineNumber, maxColumn));
        }
        return null;
    }
    getMouseColumn(relativePos) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const mouseContentHorizontalOffset = this._context.viewLayout.getCurrentScrollLeft() + relativePos.x - layoutInfo.contentLeft;
        return MouseTargetFactory._getMouseColumn(mouseContentHorizontalOffset, options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth);
    }
    static _getMouseColumn(mouseContentHorizontalOffset, typicalHalfwidthCharacterWidth) {
        if (mouseContentHorizontalOffset < 0) {
            return 1;
        }
        const chars = Math.round(mouseContentHorizontalOffset / typicalHalfwidthCharacterWidth);
        return chars + 1;
    }
    static createMouseTargetFromHitTestPosition(ctx, request, spanNode, pos, injectedText) {
        const lineNumber = pos.lineNumber;
        const column = pos.column;
        const lineWidth = ctx.getLineWidth(lineNumber);
        if (request.mouseContentHorizontalOffset > lineWidth) {
            const detail = createEmptyContentDataInLines(request.mouseContentHorizontalOffset - lineWidth);
            return request.fulfillContentEmpty(pos, detail);
        }
        const visibleRange = ctx.visibleRangeForPosition(lineNumber, column);
        if (!visibleRange) {
            return request.fulfillUnknown(pos);
        }
        const columnHorizontalOffset = visibleRange.left;
        if (Math.abs(request.mouseContentHorizontalOffset - columnHorizontalOffset) < 1) {
            return request.fulfillContentText(pos, null, {
                mightBeForeignElement: !!injectedText,
                injectedText,
            });
        }
        const points = [];
        points.push({ offset: visibleRange.left, column: column });
        if (column > 1) {
            const visibleRange = ctx.visibleRangeForPosition(lineNumber, column - 1);
            if (visibleRange) {
                points.push({ offset: visibleRange.left, column: column - 1 });
            }
        }
        const lineMaxColumn = ctx.viewModel.getLineMaxColumn(lineNumber);
        if (column < lineMaxColumn) {
            const visibleRange = ctx.visibleRangeForPosition(lineNumber, column + 1);
            if (visibleRange) {
                points.push({ offset: visibleRange.left, column: column + 1 });
            }
        }
        points.sort((a, b) => a.offset - b.offset);
        const mouseCoordinates = request.pos.toClientCoordinates(dom.getWindow(ctx.viewDomNode));
        const spanNodeClientRect = spanNode.getBoundingClientRect();
        const mouseIsOverSpanNode = spanNodeClientRect.left <= mouseCoordinates.clientX &&
            mouseCoordinates.clientX <= spanNodeClientRect.right;
        let rng = null;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            if (prev.offset <= request.mouseContentHorizontalOffset &&
                request.mouseContentHorizontalOffset <= curr.offset) {
                rng = new EditorRange(lineNumber, prev.column, lineNumber, curr.column);
                // See https://github.com/microsoft/vscode/issues/152819
                // Due to the use of zwj, the browser's hit test result is skewed towards the left
                // Here we try to correct that if the mouse horizontal offset is closer to the right than the left
                const prevDelta = Math.abs(prev.offset - request.mouseContentHorizontalOffset);
                const nextDelta = Math.abs(curr.offset - request.mouseContentHorizontalOffset);
                pos =
                    prevDelta < nextDelta
                        ? new Position(lineNumber, prev.column)
                        : new Position(lineNumber, curr.column);
                break;
            }
        }
        return request.fulfillContentText(pos, rng, {
            mightBeForeignElement: !mouseIsOverSpanNode || !!injectedText,
            injectedText,
        });
    }
    /**
     * Most probably WebKit browsers and Edge
     */
    static _doHitTestWithCaretRangeFromPoint(ctx, request) {
        // In Chrome, especially on Linux it is possible to click between lines,
        // so try to adjust the `hity` below so that it lands in the center of a line
        const lineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
        const lineStartVerticalOffset = ctx.getVerticalOffsetForLineNumber(lineNumber);
        const lineEndVerticalOffset = lineStartVerticalOffset + ctx.lineHeight;
        const isBelowLastLine = lineNumber === ctx.viewModel.getLineCount() &&
            request.mouseVerticalOffset > lineEndVerticalOffset;
        if (!isBelowLastLine) {
            const lineCenteredVerticalOffset = Math.floor((lineStartVerticalOffset + lineEndVerticalOffset) / 2);
            let adjustedPageY = request.pos.y + (lineCenteredVerticalOffset - request.mouseVerticalOffset);
            if (adjustedPageY <= request.editorPos.y) {
                adjustedPageY = request.editorPos.y + 1;
            }
            if (adjustedPageY >= request.editorPos.y + request.editorPos.height) {
                adjustedPageY = request.editorPos.y + request.editorPos.height - 1;
            }
            const adjustedPage = new PageCoordinates(request.pos.x, adjustedPageY);
            const r = this._actualDoHitTestWithCaretRangeFromPoint(ctx, adjustedPage.toClientCoordinates(dom.getWindow(ctx.viewDomNode)));
            if (r.type === 1 /* HitTestResultType.Content */) {
                return r;
            }
        }
        // Also try to hit test without the adjustment (for the edge cases that we are near the top or bottom)
        return this._actualDoHitTestWithCaretRangeFromPoint(ctx, request.pos.toClientCoordinates(dom.getWindow(ctx.viewDomNode)));
    }
    static _actualDoHitTestWithCaretRangeFromPoint(ctx, coords) {
        const shadowRoot = dom.getShadowRoot(ctx.viewDomNode);
        let range;
        if (shadowRoot) {
            if (typeof shadowRoot.caretRangeFromPoint === 'undefined') {
                range = shadowCaretRangeFromPoint(shadowRoot, coords.clientX, coords.clientY);
            }
            else {
                range = shadowRoot.caretRangeFromPoint(coords.clientX, coords.clientY);
            }
        }
        else {
            range = ctx.viewDomNode.ownerDocument.caretRangeFromPoint(coords.clientX, coords.clientY);
        }
        if (!range || !range.startContainer) {
            return new UnknownHitTestResult();
        }
        // Chrome always hits a TEXT_NODE, while Edge sometimes hits a token span
        const startContainer = range.startContainer;
        if (startContainer.nodeType === startContainer.TEXT_NODE) {
            // startContainer is expected to be the token text
            const parent1 = startContainer.parentNode; // expected to be the token span
            const parent2 = parent1 ? parent1.parentNode : null; // expected to be the view line container span
            const parent3 = parent2 ? parent2.parentNode : null; // expected to be the view line div
            const parent3ClassName = parent3 && parent3.nodeType === parent3.ELEMENT_NODE
                ? parent3.className
                : null;
            if (parent3ClassName === ViewLine.CLASS_NAME) {
                return HitTestResult.createFromDOMInfo(ctx, parent1, range.startOffset);
            }
            else {
                return new UnknownHitTestResult(startContainer.parentNode);
            }
        }
        else if (startContainer.nodeType === startContainer.ELEMENT_NODE) {
            // startContainer is expected to be the token span
            const parent1 = startContainer.parentNode; // expected to be the view line container span
            const parent2 = parent1 ? parent1.parentNode : null; // expected to be the view line div
            const parent2ClassName = parent2 && parent2.nodeType === parent2.ELEMENT_NODE
                ? parent2.className
                : null;
            if (parent2ClassName === ViewLine.CLASS_NAME) {
                return HitTestResult.createFromDOMInfo(ctx, startContainer, startContainer.textContent.length);
            }
            else {
                return new UnknownHitTestResult(startContainer);
            }
        }
        return new UnknownHitTestResult();
    }
    /**
     * Most probably Gecko
     */
    static _doHitTestWithCaretPositionFromPoint(ctx, coords) {
        const hitResult = (ctx.viewDomNode.ownerDocument).caretPositionFromPoint(coords.clientX, coords.clientY);
        if (hitResult.offsetNode.nodeType === hitResult.offsetNode.TEXT_NODE) {
            // offsetNode is expected to be the token text
            const parent1 = hitResult.offsetNode.parentNode; // expected to be the token span
            const parent2 = parent1 ? parent1.parentNode : null; // expected to be the view line container span
            const parent3 = parent2 ? parent2.parentNode : null; // expected to be the view line div
            const parent3ClassName = parent3 && parent3.nodeType === parent3.ELEMENT_NODE
                ? parent3.className
                : null;
            if (parent3ClassName === ViewLine.CLASS_NAME) {
                return HitTestResult.createFromDOMInfo(ctx, hitResult.offsetNode.parentNode, hitResult.offset);
            }
            else {
                return new UnknownHitTestResult(hitResult.offsetNode.parentNode);
            }
        }
        // For inline decorations, Gecko sometimes returns the `<span>` of the line and the offset is the `<span>` with the inline decoration
        // Some other times, it returns the `<span>` with the inline decoration
        if (hitResult.offsetNode.nodeType === hitResult.offsetNode.ELEMENT_NODE) {
            const parent1 = hitResult.offsetNode.parentNode;
            const parent1ClassName = parent1 && parent1.nodeType === parent1.ELEMENT_NODE
                ? parent1.className
                : null;
            const parent2 = parent1 ? parent1.parentNode : null;
            const parent2ClassName = parent2 && parent2.nodeType === parent2.ELEMENT_NODE
                ? parent2.className
                : null;
            if (parent1ClassName === ViewLine.CLASS_NAME) {
                // it returned the `<span>` of the line and the offset is the `<span>` with the inline decoration
                const tokenSpan = hitResult.offsetNode.childNodes[Math.min(hitResult.offset, hitResult.offsetNode.childNodes.length - 1)];
                if (tokenSpan) {
                    return HitTestResult.createFromDOMInfo(ctx, tokenSpan, 0);
                }
            }
            else if (parent2ClassName === ViewLine.CLASS_NAME) {
                // it returned the `<span>` with the inline decoration
                return HitTestResult.createFromDOMInfo(ctx, hitResult.offsetNode, 0);
            }
        }
        return new UnknownHitTestResult(hitResult.offsetNode);
    }
    static _snapToSoftTabBoundary(position, viewModel) {
        const lineContent = viewModel.getLineContent(position.lineNumber);
        const { tabSize } = viewModel.model.getOptions();
        const newPosition = AtomicTabMoveOperations.atomicPosition(lineContent, position.column - 1, tabSize, 2 /* Direction.Nearest */);
        if (newPosition !== -1) {
            return new Position(position.lineNumber, newPosition + 1);
        }
        return position;
    }
    static doHitTest(ctx, request) {
        let result = new UnknownHitTestResult();
        if (typeof ctx.viewDomNode.ownerDocument.caretRangeFromPoint === 'function') {
            result = this._doHitTestWithCaretRangeFromPoint(ctx, request);
        }
        else if (ctx.viewDomNode.ownerDocument.caretPositionFromPoint) {
            result = this._doHitTestWithCaretPositionFromPoint(ctx, request.pos.toClientCoordinates(dom.getWindow(ctx.viewDomNode)));
        }
        if (result.type === 1 /* HitTestResultType.Content */) {
            const injectedText = ctx.viewModel.getInjectedTextAt(result.position);
            const normalizedPosition = ctx.viewModel.normalizePosition(result.position, 2 /* PositionAffinity.None */);
            if (injectedText || !normalizedPosition.equals(result.position)) {
                result = new ContentHitTestResult(normalizedPosition, result.spanNode, injectedText);
            }
        }
        return result;
    }
}
function shadowCaretRangeFromPoint(shadowRoot, x, y) {
    const range = document.createRange();
    // Get the element under the point
    let el = shadowRoot.elementFromPoint(x, y);
    if (el !== null) {
        // Get the last child of the element until its firstChild is a text node
        // This assumes that the pointer is on the right of the line, out of the tokens
        // and that we want to get the offset of the last token of the line
        while (el &&
            el.firstChild &&
            el.firstChild.nodeType !== el.firstChild.TEXT_NODE &&
            el.lastChild &&
            el.lastChild.firstChild) {
            el = el.lastChild;
        }
        // Grab its rect
        const rect = el.getBoundingClientRect();
        // And its font (the computed shorthand font property might be empty, see #3217)
        const elWindow = dom.getWindow(el);
        const fontStyle = elWindow.getComputedStyle(el, null).getPropertyValue('font-style');
        const fontVariant = elWindow.getComputedStyle(el, null).getPropertyValue('font-variant');
        const fontWeight = elWindow.getComputedStyle(el, null).getPropertyValue('font-weight');
        const fontSize = elWindow.getComputedStyle(el, null).getPropertyValue('font-size');
        const lineHeight = elWindow.getComputedStyle(el, null).getPropertyValue('line-height');
        const fontFamily = elWindow.getComputedStyle(el, null).getPropertyValue('font-family');
        const font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`;
        // And also its txt content
        const text = el.innerText;
        // Position the pixel cursor at the left of the element
        let pixelCursor = rect.left;
        let offset = 0;
        let step;
        // If the point is on the right of the box put the cursor after the last character
        if (x > rect.left + rect.width) {
            offset = text.length;
        }
        else {
            const charWidthReader = CharWidthReader.getInstance();
            // Goes through all the characters of the innerText, and checks if the x of the point
            // belongs to the character.
            for (let i = 0; i < text.length + 1; i++) {
                // The step is half the width of the character
                step = charWidthReader.getCharWidth(text.charAt(i), font) / 2;
                // Move to the center of the character
                pixelCursor += step;
                // If the x of the point is smaller that the position of the cursor, the point is over that character
                if (x < pixelCursor) {
                    offset = i;
                    break;
                }
                // Move between the current character and the next
                pixelCursor += step;
            }
        }
        // Creates a range with the text node of the element and set the offset found
        range.setStart(el.firstChild, offset);
        range.setEnd(el.firstChild, offset);
    }
    return range;
}
class CharWidthReader {
    static { this._INSTANCE = null; }
    static getInstance() {
        if (!CharWidthReader._INSTANCE) {
            CharWidthReader._INSTANCE = new CharWidthReader();
        }
        return CharWidthReader._INSTANCE;
    }
    constructor() {
        this._cache = {};
        this._canvas = document.createElement('canvas');
    }
    getCharWidth(char, font) {
        const cacheKey = char + font;
        if (this._cache[cacheKey]) {
            return this._cache[cacheKey];
        }
        const context = this._canvas.getContext('2d');
        context.font = font;
        const metrics = context.measureText(char);
        const width = metrics.width;
        this._cache[cacheKey] = width;
        return width;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW91c2VUYXJnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvbW91c2VUYXJnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFxQmhHLE9BQU8sRUFJTixlQUFlLEdBRWYsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQW1CLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsS0FBSyxJQUFJLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBSWpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRSxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFDTix1QkFBdUIsR0FFdkIsTUFBTSxtREFBbUQsQ0FBQTtBQUkxRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFHbkQsSUFBVyxpQkFHVjtBQUhELFdBQVcsaUJBQWlCO0lBQzNCLCtEQUFPLENBQUE7SUFDUCwrREFBTyxDQUFBO0FBQ1IsQ0FBQyxFQUhVLGlCQUFpQixLQUFqQixpQkFBaUIsUUFHM0I7QUFFRCxNQUFNLG9CQUFvQjtJQUV6QixZQUFxQixZQUFnQyxJQUFJO1FBQXBDLGNBQVMsR0FBVCxTQUFTLENBQTJCO1FBRGhELFNBQUkscUNBQTRCO0lBQ21CLENBQUM7Q0FDN0Q7QUFFRCxNQUFNLG9CQUFvQjtJQUd6QixJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELFlBQ1UsUUFBa0IsRUFDbEIsUUFBcUIsRUFDckIsWUFBaUM7UUFGakMsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUNsQixhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLGlCQUFZLEdBQVosWUFBWSxDQUFxQjtRQVRsQyxTQUFJLHFDQUE0QjtJQVV0QyxDQUFDO0NBQ0o7QUFJRCxJQUFVLGFBQWEsQ0FZdEI7QUFaRCxXQUFVLGFBQWE7SUFDdEIsU0FBZ0IsaUJBQWlCLENBQ2hDLEdBQW1CLEVBQ25CLFFBQXFCLEVBQ3JCLE1BQWM7UUFFZCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzdELElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxPQUFPLElBQUksb0JBQW9CLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFWZSwrQkFBaUIsb0JBVWhDLENBQUE7QUFDRixDQUFDLEVBWlMsYUFBYSxLQUFiLGFBQWEsUUFZdEI7QUFFRCxNQUFNLE9BQU8sNEJBQTRCO0lBQ3hDLFlBQ2lCLHlCQUFrRCxFQUNsRCxvQkFBcUM7UUFEckMsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUF5QjtRQUNsRCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQWlCO0lBQ25ELENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxXQUFXO0lBSWYsTUFBTSxDQUFDLFdBQVcsQ0FDekIsUUFBeUIsRUFDekIsUUFBNEIsSUFBSTtRQUVoQyxJQUFJLENBQUMsS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sSUFBSSxXQUFXLENBQ3JCLFFBQVEsQ0FBQyxVQUFVLEVBQ25CLFFBQVEsQ0FBQyxNQUFNLEVBQ2YsUUFBUSxDQUFDLFVBQVUsRUFDbkIsUUFBUSxDQUFDLE1BQU0sQ0FDZixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxJQUFJLElBQUksQ0FBQTtJQUNyQixDQUFDO0lBQ00sTUFBTSxDQUFDLGFBQWEsQ0FDMUIsT0FBMkIsRUFDM0IsV0FBbUIsRUFDbkIsUUFBeUI7UUFFekIsT0FBTztZQUNOLElBQUksaUNBQXlCO1lBQzdCLE9BQU87WUFDUCxXQUFXO1lBQ1gsUUFBUTtZQUNSLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQztTQUNqQyxDQUFBO0lBQ0YsQ0FBQztJQUNNLE1BQU0sQ0FBQyxjQUFjLENBQzNCLE9BQTJCLEVBQzNCLFdBQW1CO1FBRW5CLE9BQU8sRUFBRSxJQUFJLGtDQUEwQixFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUE7SUFDN0YsQ0FBQztJQUNNLE1BQU0sQ0FBQyxZQUFZLENBQ3pCLElBRzBDLEVBQzFDLE9BQTJCLEVBQzNCLFdBQW1CLEVBQ25CLFFBQWtCLEVBQ2xCLEtBQWtCLEVBQ2xCLE1BQThCO1FBRTlCLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFBO0lBQy9ELENBQUM7SUFDTSxNQUFNLENBQUMsY0FBYyxDQUMzQixJQUEwRSxFQUMxRSxPQUEyQixFQUMzQixXQUFtQixFQUNuQixRQUFrQixFQUNsQixNQUFnQztRQUVoQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFBO0lBQzNGLENBQUM7SUFDTSxNQUFNLENBQUMsaUJBQWlCLENBQzlCLE9BQTJCLEVBQzNCLFdBQW1CLEVBQ25CLFFBQWtCLEVBQ2xCLEtBQXlCLEVBQ3pCLE1BQW1DO1FBRW5DLE9BQU87WUFDTixJQUFJLHNDQUE4QjtZQUNsQyxPQUFPO1lBQ1AsV0FBVztZQUNYLFFBQVE7WUFDUixLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDO1lBQ3hDLE1BQU07U0FDTixDQUFBO0lBQ0YsQ0FBQztJQUNNLE1BQU0sQ0FBQyxrQkFBa0IsQ0FDL0IsT0FBMkIsRUFDM0IsV0FBbUIsRUFDbkIsUUFBa0IsRUFDbEIsTUFBb0M7UUFFcEMsT0FBTztZQUNOLElBQUksdUNBQStCO1lBQ25DLE9BQU87WUFDUCxXQUFXO1lBQ1gsUUFBUTtZQUNSLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQztZQUNqQyxNQUFNO1NBQ04sQ0FBQTtJQUNGLENBQUM7SUFDTSxNQUFNLENBQUMsbUJBQW1CLENBQ2hDLE9BQTJCLEVBQzNCLFdBQW1CLEVBQ25CLE1BQWM7UUFFZCxPQUFPO1lBQ04sSUFBSSx3Q0FBZ0M7WUFDcEMsT0FBTztZQUNQLFdBQVc7WUFDWCxRQUFRLEVBQUUsSUFBSTtZQUNkLEtBQUssRUFBRSxJQUFJO1lBQ1gsTUFBTTtTQUNOLENBQUE7SUFDRixDQUFDO0lBQ00sTUFBTSxDQUFDLGVBQWUsQ0FDNUIsT0FBMkIsRUFDM0IsV0FBbUIsRUFDbkIsUUFBa0I7UUFFbEIsT0FBTztZQUNOLElBQUksb0NBQTJCO1lBQy9CLE9BQU87WUFDUCxXQUFXO1lBQ1gsUUFBUTtZQUNSLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQztTQUNqQyxDQUFBO0lBQ0YsQ0FBQztJQUNNLE1BQU0sQ0FBQyxtQkFBbUIsQ0FDaEMsT0FBMkIsRUFDM0IsV0FBbUIsRUFDbkIsTUFBYztRQUVkLE9BQU87WUFDTixJQUFJLHlDQUFnQztZQUNwQyxPQUFPO1lBQ1AsV0FBVztZQUNYLFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFLElBQUk7WUFDWCxNQUFNO1NBQ04sQ0FBQTtJQUNGLENBQUM7SUFDTSxNQUFNLENBQUMsbUJBQW1CLENBQ2hDLFdBQW1CLEVBQ25CLFFBQWtCLEVBQ2xCLGVBQXFELEVBQ3JELGVBQXVCO1FBRXZCLE9BQU87WUFDTixJQUFJLHlDQUFnQztZQUNwQyxPQUFPLEVBQUUsSUFBSTtZQUNiLFdBQVc7WUFDWCxRQUFRO1lBQ1IsS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO1lBQ2pDLGVBQWU7WUFDZixlQUFlO1NBQ2YsQ0FBQTtJQUNGLENBQUM7SUFFTyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQXFCO1FBQ2pELElBQUksSUFBSSxxQ0FBNkIsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sVUFBVSxDQUFBO1FBQ2xCLENBQUM7UUFDRCxJQUFJLElBQUksZ0RBQXdDLEVBQUUsQ0FBQztZQUNsRCxPQUFPLHFCQUFxQixDQUFBO1FBQzdCLENBQUM7UUFDRCxJQUFJLElBQUksZ0RBQXdDLEVBQUUsQ0FBQztZQUNsRCxPQUFPLHFCQUFxQixDQUFBO1FBQzdCLENBQUM7UUFDRCxJQUFJLElBQUksb0RBQTRDLEVBQUUsQ0FBQztZQUN0RCxPQUFPLHlCQUF5QixDQUFBO1FBQ2pDLENBQUM7UUFDRCxJQUFJLElBQUksNkNBQXFDLEVBQUUsQ0FBQztZQUMvQyxPQUFPLGtCQUFrQixDQUFBO1FBQzFCLENBQUM7UUFDRCxJQUFJLElBQUkseUNBQWlDLEVBQUUsQ0FBQztZQUMzQyxPQUFPLGNBQWMsQ0FBQTtRQUN0QixDQUFDO1FBQ0QsSUFBSSxJQUFJLDBDQUFrQyxFQUFFLENBQUM7WUFDNUMsT0FBTyxlQUFlLENBQUE7UUFDdkIsQ0FBQztRQUNELElBQUksSUFBSSw4Q0FBc0MsRUFBRSxDQUFDO1lBQ2hELE9BQU8sbUJBQW1CLENBQUE7UUFDM0IsQ0FBQztRQUNELElBQUksSUFBSSwyQ0FBbUMsRUFBRSxDQUFDO1lBQzdDLE9BQU8sZ0JBQWdCLENBQUE7UUFDeEIsQ0FBQztRQUNELElBQUksSUFBSSw0Q0FBbUMsRUFBRSxDQUFDO1lBQzdDLE9BQU8sZ0JBQWdCLENBQUE7UUFDeEIsQ0FBQztRQUNELElBQUksSUFBSSx1Q0FBOEIsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sV0FBVyxDQUFBO1FBQ25CLENBQUM7UUFDRCxJQUFJLElBQUksNENBQW1DLEVBQUUsQ0FBQztZQUM3QyxPQUFPLGdCQUFnQixDQUFBO1FBQ3hCLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRU0sTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFvQjtRQUMxQyxPQUFPLENBQ04sSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQy9CLElBQUk7WUFDSixNQUFNLENBQUMsUUFBUTtZQUNmLEtBQUs7WUFDTCxNQUFNLENBQUMsS0FBSztZQUNaLEtBQUs7WUFDTCxJQUFJLENBQUMsU0FBUyxDQUFPLE1BQU8sQ0FBQyxNQUFNLENBQUMsQ0FDcEMsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sV0FBVztJQUNULE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBZ0I7UUFDeEMsT0FBTyxDQUNOLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUNqQixJQUFJLENBQUMsQ0FBQyxDQUFDLDBDQUFrQztZQUN6QyxJQUFJLENBQUMsQ0FBQyxDQUFDLHFDQUE2QixDQUNwQyxDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFnQjtRQUNoRCxPQUFPLENBQ04sSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxDQUFDLENBQUMsMENBQWtDO1lBQ3pDLElBQUksQ0FBQyxDQUFDLENBQUMsc0NBQThCLENBQ3JDLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLHdCQUF3QixDQUFDLElBQWdCO1FBQ3RELE9BQU8sQ0FDTixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDZixJQUFJLENBQUMsQ0FBQyxDQUFDLDBDQUFrQztZQUN6QyxJQUFJLENBQUMsQ0FBQyxDQUFDLHNDQUE4QixDQUNyQyxDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxJQUFnQjtRQUN4RCxPQUFPLENBQ04sSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxDQUFDLENBQUMsMENBQWtDO1lBQ3pDLElBQUksQ0FBQyxDQUFDLENBQUMsOENBQXNDLENBQzdDLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQWdCO1FBQzlDLE9BQU8sQ0FDTixJQUFJLENBQUMsTUFBTSxJQUFJLENBQUM7WUFDaEIsSUFBSSxDQUFDLENBQUMsQ0FBQywwQ0FBa0M7WUFDekMsSUFBSSxDQUFDLENBQUMsQ0FBQyxvQ0FBNEIsQ0FDbkMsQ0FBQTtJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsdUJBQXVCLENBQUMsSUFBZ0I7UUFDckQsT0FBTyxDQUNOLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQztZQUNoQixJQUFJLENBQUMsQ0FBQyxDQUFDLDBDQUFrQztZQUN6QyxJQUFJLENBQUMsQ0FBQyxDQUFDLDJDQUFtQyxDQUMxQyxDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxJQUFnQjtRQUNwRCxPQUFPLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsMENBQWtDLENBQUE7SUFDckUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxrQ0FBa0MsQ0FBQyxJQUFnQjtRQUNoRSxPQUFPLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsc0RBQThDLENBQUE7SUFDakYsQ0FBQztJQUVNLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxJQUFnQjtRQUNyRCxPQUFPLENBQ04sSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxDQUFDLENBQUMsMENBQWtDO1lBQ3pDLElBQUksQ0FBQyxDQUFDLENBQUMsMkNBQW1DLENBQzFDLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLGtDQUFrQyxDQUFDLElBQWdCO1FBQ2hFLE9BQU8sSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxzREFBOEMsQ0FBQTtJQUNqRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sY0FBYztJQWExQixZQUNDLE9BQW9CLEVBQ3BCLFVBQWlDLEVBQ2pDLGNBQTRDO1FBRTVDLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQTtRQUNsQyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUM3QyxJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLG1DQUF5QixDQUFBO1FBQ3RELElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQTtRQUN6QyxJQUFJLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUE7UUFDM0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxrQ0FBeUIsQ0FBQTtRQUN0RCxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxHQUFHLHVDQUE2QixDQUFBO1FBQzlELElBQUksQ0FBQyw4QkFBOEIsR0FBRyxPQUFPLENBQUMsR0FBRyxnQ0FFaEQsQ0FBQyw4QkFBOEIsQ0FBQTtRQUNoQyxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtRQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQTtJQUM5QixDQUFDO0lBRU0sY0FBYyxDQUFDLG1CQUEyQjtRQUNoRCxPQUFPLGNBQWMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFTSxNQUFNLENBQUMsY0FBYyxDQUMzQixPQUFvQixFQUNwQixtQkFBMkI7UUFFM0IsK0VBQStFO1FBQy9FLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyw2QkFBNkIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBRWhHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixNQUFNLGNBQWMsR0FBRyxrQkFBa0IsQ0FBQyxjQUFjLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUN4RixNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFBO1lBQ2xELElBQUksY0FBYyxHQUFvQixJQUFJLENBQUE7WUFDMUMsSUFBSSxRQUF5QixDQUFBO1lBQzdCLElBQUksYUFBYSxHQUFvQixJQUFJLENBQUE7WUFFekMsSUFBSSxrQkFBa0IsQ0FBQyxlQUFlLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3RELDRDQUE0QztnQkFDNUMsYUFBYSxHQUFHLElBQUksUUFBUSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDeEUsQ0FBQztZQUNELElBQUksa0JBQWtCLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM1Qyw0Q0FBNEM7Z0JBQzVDLGNBQWMsR0FBRyxJQUFJLFFBQVEsQ0FDNUIsa0JBQWtCLENBQUMsZUFBZSxFQUNsQyxPQUFPLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUN0RSxDQUFBO1lBQ0YsQ0FBQztZQUVELElBQUksYUFBYSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUM1QixRQUFRLEdBQUcsY0FBYyxDQUFBO1lBQzFCLENBQUM7aUJBQU0sSUFBSSxjQUFjLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3BDLFFBQVEsR0FBRyxhQUFhLENBQUE7WUFDekIsQ0FBQztpQkFBTSxJQUFJLG1CQUFtQixHQUFHLGNBQWMsRUFBRSxDQUFDO2dCQUNqRCxRQUFRLEdBQUcsY0FBYyxDQUFBO1lBQzFCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxRQUFRLEdBQUcsYUFBYSxDQUFBO1lBQ3pCLENBQUM7WUFFRCxPQUFPO2dCQUNOLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFO2dCQUNqQyxlQUFlLEVBQUUsa0JBQWtCLENBQUMsZUFBZTtnQkFDbkQsY0FBYyxFQUFFLGNBQWM7Z0JBQzlCLGFBQWEsRUFBRSxhQUFhO2dCQUM1QixRQUFRLEVBQUUsUUFBUzthQUNuQixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLHVCQUF1QixDQUFDLG1CQUEyQjtRQUl6RCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7WUFDaEUsc0JBQXNCO1lBQ3RCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFBO1lBQ3pELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzFFLE9BQU87Z0JBQ04sS0FBSyxFQUFFLElBQUksV0FBVyxDQUFDLFVBQVUsRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLGFBQWEsQ0FBQztnQkFDNUUsWUFBWSxFQUFFLElBQUk7YUFDbEIsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyw2QkFBNkIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQzlGLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzFFLE9BQU87WUFDTixLQUFLLEVBQUUsSUFBSSxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsYUFBYSxDQUFDO1lBQ2hFLFlBQVksRUFBRSxLQUFLO1NBQ25CLENBQUE7SUFDRixDQUFDO0lBRU0sNkJBQTZCLENBQUMsbUJBQTJCO1FBQy9ELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsNkJBQTZCLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBRU0sWUFBWSxDQUFDLG1CQUEyQjtRQUM5QyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7SUFFTSxjQUFjLENBQUMsbUJBQTJCO1FBQ2hELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVNLGlCQUFpQixDQUFDLG1CQUEyQjtRQUNuRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFDdkUsQ0FBQztJQUVNLDhCQUE4QixDQUFDLFVBQWtCO1FBQ3ZELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsOEJBQThCLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVNLGFBQWEsQ0FBQyxPQUFnQixFQUFFLElBQVk7UUFDbEQsT0FBTyxjQUFjLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUNsRixDQUFDO0lBRU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFnQixFQUFFLElBQVksRUFBRSxNQUFlO1FBQzVFLE9BQU8sT0FBTyxJQUFJLE9BQU8sS0FBSyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzFELElBQUksT0FBTyxDQUFDLFlBQVksSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3hELE9BQU8sT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1lBQ0QsSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELE9BQU8sR0FBWSxPQUFPLENBQUMsVUFBVSxDQUFBO1FBQ3RDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTSxZQUFZLENBQUMsVUFBa0I7UUFDckMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRU0sdUJBQXVCLENBQUMsVUFBa0IsRUFBRSxNQUFjO1FBQ2hFLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVNLHNCQUFzQixDQUFDLFFBQXFCLEVBQUUsTUFBYztRQUNsRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFTSxtQkFBbUI7UUFDekIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO0lBQ3RELENBQUM7SUFFTSxvQkFBb0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0lBQ3ZELENBQUM7Q0FDRDtBQUVELE1BQWUsa0JBQWtCO0lBV2hDLFlBQ0MsR0FBbUIsRUFDbkIsU0FBNkIsRUFDN0IsR0FBb0IsRUFDcEIsV0FBd0M7UUFFeEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDMUIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUE7UUFDZCxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQTtRQUU5QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0RixJQUFJLENBQUMsNEJBQTRCO1lBQ2hDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFBO1FBQzdFLElBQUksQ0FBQyxjQUFjO1lBQ2xCLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsV0FBVztnQkFDL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUE7UUFDckQsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUE7UUFDM0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUMxQixDQUFDLEVBQ0Qsa0JBQWtCLENBQUMsZUFBZSxDQUNqQyxJQUFJLENBQUMsNEJBQTRCLEVBQ2pDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FDbEMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxjQUFlLFNBQVEsa0JBQWtCO0lBUTlDLElBQVcsTUFBTTtRQUNoQixJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzVCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFBO1FBQzFDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUVELElBQVcsVUFBVTtRQUNwQixJQUFJLElBQUksQ0FBQyx1QkFBdUIsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7WUFDMUMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDMUYsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFBO0lBQ2xDLENBQUM7SUFFRCxZQUNDLEdBQW1CLEVBQ25CLFNBQTZCLEVBQzdCLEdBQW9CLEVBQ3BCLFdBQXdDLEVBQ3hDLFdBQStCO1FBRS9CLEtBQUssQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQTNCeEIsa0JBQWEsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXJGLDRCQUF1QixHQUF1QixJQUFJLENBQUE7UUFDbEQsMEJBQXFCLEdBQWUsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUF5QjVELElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFBO1FBQ2YsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUE7UUFFL0IsbUVBQW1FO1FBQ25FLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDakQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLENBQUMsY0FBYyxDQUFBO0lBQ3pDLENBQUM7SUFFZSxRQUFRO1FBQ3ZCLE9BQU8sT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLDJCQUEyQixJQUFJLENBQUMsbUJBQW1CLG1DQUFtQyxJQUFJLENBQUMsNEJBQTRCLGVBQWUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQWUsSUFBSSxDQUFDLE1BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3RWLENBQUM7SUFFRCxJQUFXLG1DQUFtQztRQUM3QyxPQUFPLENBQ04sQ0FBQyxJQUFJLENBQUMsaUJBQWlCO1lBQ3ZCLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFNBQVMsS0FBSyxJQUFJO1lBQzNDLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUNsRCxDQUFBO0lBQ0YsQ0FBQztJQUVNLHFCQUFxQjtRQUMzQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFBO0lBQzlCLENBQUM7SUFFTyxlQUFlLENBQUMsV0FBNEIsSUFBSTtRQUN2RCxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzdGLHdEQUF3RDtZQUN4RCxPQUFPLENBQ04sYUFBYSxDQUFDLHVCQUF1QixDQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUN2RCxRQUFRLENBQUMsTUFBTSxFQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLENBQzlDLEdBQUcsQ0FBQyxDQUNMLENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFFTSxjQUFjLENBQUMsV0FBNEIsSUFBSTtRQUNyRCxPQUFPLFdBQVcsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3hGLENBQUM7SUFDTSxlQUFlO1FBQ3JCLE9BQU8sV0FBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFDTSxhQUFhLENBQ25CLElBRzBDLEVBQzFDLFFBQWtCLEVBQ2xCLEtBQWtCLEVBQ2xCLE1BQThCO1FBRTlCLE9BQU8sV0FBVyxDQUFDLFlBQVksQ0FDOUIsSUFBSSxFQUNKLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFDOUIsUUFBUSxFQUNSLEtBQUssRUFDTCxNQUFNLENBQ04sQ0FBQTtJQUNGLENBQUM7SUFDTSxlQUFlLENBQ3JCLElBQTBFLEVBQzFFLFFBQWtCLEVBQ2xCLE1BQWdDO1FBRWhDLE9BQU8sV0FBVyxDQUFDLGNBQWMsQ0FDaEMsSUFBSSxFQUNKLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFDOUIsUUFBUSxFQUNSLE1BQU0sQ0FDTixDQUFBO0lBQ0YsQ0FBQztJQUNNLGtCQUFrQixDQUN4QixRQUFrQixFQUNsQixLQUF5QixFQUN6QixNQUFtQztRQUVuQyxPQUFPLFdBQVcsQ0FBQyxpQkFBaUIsQ0FDbkMsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUM5QixRQUFRLEVBQ1IsS0FBSyxFQUNMLE1BQU0sQ0FDTixDQUFBO0lBQ0YsQ0FBQztJQUNNLG1CQUFtQixDQUN6QixRQUFrQixFQUNsQixNQUFvQztRQUVwQyxPQUFPLFdBQVcsQ0FBQyxrQkFBa0IsQ0FDcEMsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUM5QixRQUFRLEVBQ1IsTUFBTSxDQUNOLENBQUE7SUFDRixDQUFDO0lBQ00sb0JBQW9CLENBQUMsTUFBYztRQUN6QyxPQUFPLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNwRixDQUFDO0lBQ00sZ0JBQWdCLENBQUMsUUFBa0I7UUFDekMsT0FBTyxXQUFXLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUMxRixDQUFDO0lBQ00sb0JBQW9CLENBQUMsTUFBYztRQUN6QyxPQUFPLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNwRixDQUFDO0NBQ0Q7QUFNRCxNQUFNLHlCQUF5QixHQUFpQyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQTtBQUV0RixTQUFTLDZCQUE2QixDQUNyQyx3QkFBZ0M7SUFFaEMsT0FBTztRQUNOLFlBQVksRUFBRSxLQUFLO1FBQ25CLHdCQUF3QixFQUFFLHdCQUF3QjtLQUNsRCxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sT0FBTyxrQkFBa0I7SUFJOUIsWUFBWSxPQUFvQixFQUFFLFVBQWlDO1FBQ2xFLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO0lBQzlCLENBQUM7SUFFTSxtQkFBbUIsQ0FBQyxDQUFtQjtRQUM3QyxNQUFNLENBQUMsR0FBWSxDQUFDLENBQUMsTUFBTSxDQUFBO1FBQzNCLE1BQU0sSUFBSSxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUV0RSwwQkFBMEI7UUFDMUIsSUFDQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDO1lBQ3pDLFdBQVcsQ0FBQyxrQ0FBa0MsQ0FBQyxJQUFJLENBQUMsRUFDbkQsQ0FBQztZQUNGLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELDJCQUEyQjtRQUMzQixJQUNDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUM7WUFDekMsV0FBVyxDQUFDLGtDQUFrQyxDQUFDLElBQUksQ0FBQyxFQUNuRCxDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU0saUJBQWlCLENBQ3ZCLGNBQTRDLEVBQzVDLFNBQTZCLEVBQzdCLEdBQW9CLEVBQ3BCLFdBQXdDLEVBQ3hDLE1BQTBCO1FBRTFCLE1BQU0sR0FBRyxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUMvRSxNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDNUUsSUFBSSxDQUFDO1lBQ0osTUFBTSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBRTdELElBQUksQ0FBQyxDQUFDLElBQUkseUNBQWlDLEVBQUUsQ0FBQztnQkFDN0MseUVBQXlFO2dCQUN6RSxJQUFJLEdBQUcsQ0FBQyxjQUFjLElBQUksQ0FBQyxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDL0MsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQ3JGLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQzlFLE9BQU8sT0FBTyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUM3RCxDQUFDO1lBQ0YsQ0FBQztZQUVELHdDQUF3QztZQUN4QyxPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2Qsb0JBQW9CO1lBQ3BCLE9BQU8sT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQW1CLEVBQUUsT0FBdUI7UUFDN0UsK0VBQStFO1FBRS9FLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM3QixZQUFZO1lBQ1osT0FBTyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDaEMsQ0FBQztRQUVELHFEQUFxRDtRQUNyRCxNQUFNLGVBQWUsR0FBMkIsT0FBTyxDQUFBO1FBRXZELElBQUksTUFBTSxHQUF3QixJQUFJLENBQUE7UUFFdEMsSUFDQyxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO1lBQ3ZELENBQUMsV0FBVyxDQUFDLGtDQUFrQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7WUFDbkUsQ0FBQyxXQUFXLENBQUMsa0NBQWtDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUNsRSxDQUFDO1lBQ0YsMkZBQTJGO1lBQzNGLE1BQU0sR0FBRyxNQUFNLElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQzVDLENBQUM7UUFFRCxNQUFNLEdBQUcsTUFBTSxJQUFJLGtCQUFrQixDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNqRixNQUFNLEdBQUcsTUFBTSxJQUFJLGtCQUFrQixDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNqRixNQUFNLEdBQUcsTUFBTSxJQUFJLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDM0UsTUFBTSxHQUFHLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDbkYsTUFBTSxHQUFHLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDNUUsTUFBTSxHQUFHLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sR0FBRyxNQUFNLElBQUksa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sR0FBRyxNQUFNLElBQUksa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sR0FBRyxNQUFNLElBQUksa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sR0FBRyxNQUFNLElBQUksa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBRTdFLE9BQU8sTUFBTSxJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0lBRU8sTUFBTSxDQUFDLHFCQUFxQixDQUNuQyxHQUFtQixFQUNuQixPQUErQjtRQUUvQiwwQkFBMEI7UUFDMUIsSUFDQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztZQUN2RCxXQUFXLENBQUMsa0NBQWtDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUNqRSxDQUFDO1lBQ0YsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzlELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxPQUFPLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDOUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQ2hDLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sTUFBTSxDQUFDLHFCQUFxQixDQUNuQyxHQUFtQixFQUNuQixPQUErQjtRQUUvQiwyQkFBMkI7UUFDM0IsSUFDQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztZQUN2RCxXQUFXLENBQUMsa0NBQWtDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUNqRSxDQUFDO1lBQ0YsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzlELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxPQUFPLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDOUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQ2hDLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sTUFBTSxDQUFDLGtCQUFrQixDQUNoQyxHQUFtQixFQUNuQixPQUErQjtRQUUvQixJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQixzQ0FBc0M7WUFDdEMsTUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFBO1lBRTlFLEtBQUssTUFBTSxDQUFDLElBQUkseUJBQXlCLEVBQUUsQ0FBQztnQkFDM0MsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbEMsT0FBTyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUU7d0JBQ25ELHFCQUFxQixFQUFFLEtBQUs7d0JBQzVCLFlBQVksRUFBRSxJQUFJO3FCQUNsQixDQUFDLENBQUE7Z0JBQ0gsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDN0Isa0VBQWtFO1lBQ2xFLDREQUE0RDtZQUM1RCxtRUFBbUU7WUFDbkUsK0NBQStDO1lBRS9DLE1BQU0seUJBQXlCLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQTtZQUM5RSxNQUFNLDRCQUE0QixHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQTtZQUN6RSxNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQTtZQUV2RCxLQUFLLE1BQU0sQ0FBQyxJQUFJLHlCQUF5QixFQUFFLENBQUM7Z0JBQzNDLElBQUksNEJBQTRCLEdBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNsRCw4Q0FBOEM7b0JBQzlDLFNBQVE7Z0JBQ1QsQ0FBQztnQkFDRCxJQUFJLDRCQUE0QixHQUFHLENBQUMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUM1RCwrQ0FBK0M7b0JBQy9DLFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxNQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUV0RixJQUNDLG9CQUFvQixJQUFJLG1CQUFtQjtvQkFDM0MsbUJBQW1CLElBQUksb0JBQW9CLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFDckQsQ0FBQztvQkFDRixPQUFPLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRTt3QkFDbkQscUJBQXFCLEVBQUUsS0FBSzt3QkFDNUIsWUFBWSxFQUFFLElBQUk7cUJBQ2xCLENBQUMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxNQUFNLENBQUMsZ0JBQWdCLENBQzlCLEdBQW1CLEVBQ25CLE9BQStCO1FBRS9CLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDcEUsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsZUFBZTtnQkFDOUMsQ0FBQztnQkFDRCxDQUFDLHlDQUFpQyxDQUFBO1lBQ25DLE9BQU8sT0FBTyxDQUFDLGVBQWUsQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUNyRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sTUFBTSxDQUFDLGdCQUFnQixDQUM5QixHQUFtQixFQUNuQixPQUErQjtRQUUvQixzQkFBc0I7UUFDdEIsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ2hELElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUM3QyxPQUFPLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLElBQUksRUFBRTtvQkFDaEYscUJBQXFCLEVBQUUsS0FBSztvQkFDNUIsWUFBWSxFQUFFLElBQUk7aUJBQ2xCLENBQUMsQ0FBQTtZQUNILENBQUM7WUFDRCxPQUFPLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUNqQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sTUFBTSxDQUFDLGNBQWMsQ0FDNUIsR0FBbUIsRUFDbkIsT0FBK0I7UUFFL0IsSUFBSSxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDNUIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1lBQ3BFLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUN4QyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUMsTUFBTSxNQUFNLEdBQW9DO2dCQUMvQyxZQUFZLEVBQUUsR0FBRyxDQUFDLFlBQVk7Z0JBQzlCLGVBQWUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGVBQWU7Z0JBQy9DLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCO2dCQUNqRCxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtnQkFDakQsT0FBTyxFQUFFLE1BQU07YUFDZixDQUFBO1lBRUQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFBO1lBRXhDLElBQUksTUFBTSxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDL0Msc0JBQXNCO2dCQUN0QixNQUFNLGVBQWUsR0FDcEIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxrQ0FBa0MsQ0FDcEUsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUM1QixDQUFBO2dCQUNGLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ2pGLE1BQU0sQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO2dCQUNuRSxPQUFPLE9BQU8sQ0FBQyxhQUFhLDhDQUFzQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMxRixDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUE7WUFFekMsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUMvQyxzQkFBc0I7Z0JBQ3RCLE9BQU8sT0FBTyxDQUFDLGFBQWEsOENBQXNDLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQzFGLENBQUM7WUFDRCxNQUFNLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUV6QywwQkFBMEI7WUFDMUIsT0FBTyxPQUFPLENBQUMsYUFBYSxrREFBMEMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUYsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLE1BQU0sQ0FBQyxpQkFBaUIsQ0FDL0IsR0FBbUIsRUFDbkIsT0FBK0I7UUFFL0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN6RCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUNyRCxPQUFPLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtRQUNsRixDQUFDO1FBRUQsb0RBQW9EO1FBQ3BELElBQ0MsR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7WUFDN0MsR0FBRyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxFQUNqRCxDQUFDO1lBQ0Ysa0VBQWtFO1lBQ2xFLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDOUMsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMvRCxPQUFPLE9BQU8sQ0FBQyxtQkFBbUIsQ0FDakMsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxFQUN0Qyx5QkFBeUIsQ0FDekIsQ0FBQTtRQUNGLENBQUM7UUFFRCxvR0FBb0c7UUFDcEcsdURBQXVEO1FBQ3ZELElBQUksV0FBVyxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzlELE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUNqRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNuRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUM5QyxNQUFNLE1BQU0sR0FBRyw2QkFBNkIsQ0FDM0MsT0FBTyxDQUFDLDRCQUE0QixHQUFHLFNBQVMsQ0FDaEQsQ0FBQTtnQkFDRCxPQUFPLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDeEUsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUMsSUFBSSxPQUFPLENBQUMsNEJBQTRCLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ3ZELDhCQUE4QjtnQkFDOUIsTUFBTSxNQUFNLEdBQUcsNkJBQTZCLENBQzNDLE9BQU8sQ0FBQyw0QkFBNEIsR0FBRyxTQUFTLENBQ2hELENBQUE7Z0JBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtnQkFDaEYsT0FBTyxPQUFPLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ2hELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN0QixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsNkJBQTZCLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUE7Z0JBQ2pGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ25ELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQzlDLE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUMzQyxPQUFPLENBQUMsNEJBQTRCLEdBQUcsU0FBUyxDQUNoRCxDQUFBO29CQUNELE9BQU8sT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDeEUsQ0FBQztnQkFFRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUM5QyxJQUFJLE9BQU8sQ0FBQyw0QkFBNEIsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDdkQsOEJBQThCO29CQUM5QixNQUFNLE1BQU0sR0FBRyw2QkFBNkIsQ0FDM0MsT0FBTyxDQUFDLDRCQUE0QixHQUFHLFNBQVMsQ0FDaEQsQ0FBQTtvQkFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO29CQUNoRixPQUFPLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQ2hELENBQUM7Z0JBRUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsQ0FDeEQsVUFBVSxFQUNWLE9BQU8sQ0FBQyw0QkFBNEIsQ0FDcEMsQ0FBQTtnQkFDRCxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNkLE1BQU0sTUFBTSxHQUFnQzt3QkFDM0MsWUFBWSxFQUFFLElBQUk7d0JBQ2xCLHFCQUFxQixFQUFFLEtBQUs7cUJBQzVCLENBQUE7b0JBQ0QsT0FBTyxPQUFPLENBQUMsa0JBQWtCLENBQ2hDLFFBQVEsRUFDUixXQUFXLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFDN0MsTUFBTSxDQUNOLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsd0NBQXdDO1FBQ3hDLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFBO1FBRWpELElBQUksYUFBYSxDQUFDLElBQUksc0NBQThCLEVBQUUsQ0FBQztZQUN0RCxPQUFPLGtCQUFrQixDQUFDLG9DQUFvQyxDQUM3RCxHQUFHLEVBQ0gsT0FBTyxFQUNQLGFBQWEsQ0FBQyxRQUFRLEVBQ3RCLGFBQWEsQ0FBQyxRQUFRLEVBQ3RCLGFBQWEsQ0FBQyxZQUFZLENBQzFCLENBQUE7UUFDRixDQUFDO1FBRUQsMkJBQTJCO1FBQzNCLElBQUksT0FBTyxDQUFDLG1DQUFtQyxFQUFFLENBQUM7WUFDakQsc0dBQXNHO1lBQ3RHLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1lBQy9CLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM3QyxDQUFDO1FBRUQsOEJBQThCO1FBQzlCLE9BQU8sT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFBO0lBQ2hDLENBQUM7SUFFTyxNQUFNLENBQUMsZUFBZSxDQUM3QixHQUFtQixFQUNuQixPQUErQjtRQUUvQixJQUFJLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN0RCxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUN6RixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUE7WUFDcEUsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUM3RSxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sTUFBTSxDQUFDLHVCQUF1QixDQUNyQyxHQUFtQixFQUNuQixPQUErQjtRQUUvQixJQUFJLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNoRSxJQUFJLE9BQU8sQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFBO2dCQUMxQyxJQUFJLFNBQVMsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDM0QsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsNkJBQTZCLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUE7b0JBQ3pGLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtvQkFDcEUsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtnQkFDN0UsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sTUFBTSxDQUFDLGlCQUFpQixDQUMvQixHQUFtQixFQUNuQixPQUErQjtRQUUvQiw0QkFBNEI7UUFDNUIsMkNBQTJDO1FBQzNDLElBQUksV0FBVyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ2hFLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1lBQ3pGLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUNwRSxPQUFPLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQzdFLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTSxjQUFjLENBQUMsV0FBd0M7UUFDN0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBQ25ELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLG1DQUF5QixDQUFBO1FBQ3ZELE1BQU0sNEJBQTRCLEdBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFBO1FBQ3pGLE9BQU8sa0JBQWtCLENBQUMsZUFBZSxDQUN4Qyw0QkFBNEIsRUFDNUIsT0FBTyxDQUFDLEdBQUcsZ0NBQXVCLENBQUMsOEJBQThCLENBQ2pFLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLGVBQWUsQ0FDNUIsNEJBQW9DLEVBQ3BDLDhCQUFzQztRQUV0QyxJQUFJLDRCQUE0QixHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEdBQUcsOEJBQThCLENBQUMsQ0FBQTtRQUN2RixPQUFPLEtBQUssR0FBRyxDQUFDLENBQUE7SUFDakIsQ0FBQztJQUVPLE1BQU0sQ0FBQyxvQ0FBb0MsQ0FDbEQsR0FBbUIsRUFDbkIsT0FBdUIsRUFDdkIsUUFBcUIsRUFDckIsR0FBYSxFQUNiLFlBQWlDO1FBRWpDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUE7UUFDakMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQTtRQUV6QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRTlDLElBQUksT0FBTyxDQUFDLDRCQUE0QixHQUFHLFNBQVMsRUFBRSxDQUFDO1lBQ3RELE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsR0FBRyxTQUFTLENBQUMsQ0FBQTtZQUM5RixPQUFPLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDaEQsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFcEUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLE9BQU8sT0FBTyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNuQyxDQUFDO1FBRUQsTUFBTSxzQkFBc0IsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFBO1FBRWhELElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsNEJBQTRCLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNqRixPQUFPLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFO2dCQUM1QyxxQkFBcUIsRUFBRSxDQUFDLENBQUMsWUFBWTtnQkFDckMsWUFBWTthQUNaLENBQUMsQ0FBQTtRQUNILENBQUM7UUFRRCxNQUFNLE1BQU0sR0FBbUIsRUFBRSxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUMxRCxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoQixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsdUJBQXVCLENBQUMsVUFBVSxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN4RSxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQy9ELENBQUM7UUFDRixDQUFDO1FBQ0QsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNoRSxJQUFJLE1BQU0sR0FBRyxhQUFhLEVBQUUsQ0FBQztZQUM1QixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsdUJBQXVCLENBQUMsVUFBVSxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN4RSxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQy9ELENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTFDLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFDM0QsTUFBTSxtQkFBbUIsR0FDeEIsa0JBQWtCLENBQUMsSUFBSSxJQUFJLGdCQUFnQixDQUFDLE9BQU87WUFDbkQsZ0JBQWdCLENBQUMsT0FBTyxJQUFJLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQUVyRCxJQUFJLEdBQUcsR0FBdUIsSUFBSSxDQUFBO1FBRWxDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDeEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMxQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEIsSUFDQyxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyw0QkFBNEI7Z0JBQ25ELE9BQU8sQ0FBQyw0QkFBNEIsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUNsRCxDQUFDO2dCQUNGLEdBQUcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUV2RSx3REFBd0Q7Z0JBQ3hELGtGQUFrRjtnQkFDbEYsa0dBQWtHO2dCQUVsRyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUE7Z0JBQzlFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtnQkFFOUUsR0FBRztvQkFDRixTQUFTLEdBQUcsU0FBUzt3QkFDcEIsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDO3dCQUN2QyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFFekMsTUFBSztZQUNOLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRTtZQUMzQyxxQkFBcUIsRUFBRSxDQUFDLG1CQUFtQixJQUFJLENBQUMsQ0FBQyxZQUFZO1lBQzdELFlBQVk7U0FDWixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFNLENBQUMsaUNBQWlDLENBQy9DLEdBQW1CLEVBQ25CLE9BQTJCO1FBRTNCLHdFQUF3RTtRQUN4RSw2RUFBNkU7UUFDN0UsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sdUJBQXVCLEdBQUcsR0FBRyxDQUFDLDhCQUE4QixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzlFLE1BQU0scUJBQXFCLEdBQUcsdUJBQXVCLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQTtRQUV0RSxNQUFNLGVBQWUsR0FDcEIsVUFBVSxLQUFLLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFO1lBQzNDLE9BQU8sQ0FBQyxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQTtRQUVwRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUM1QyxDQUFDLHVCQUF1QixHQUFHLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUNyRCxDQUFBO1lBQ0QsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUU5RixJQUFJLGFBQWEsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxhQUFhLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3hDLENBQUM7WUFDRCxJQUFJLGFBQWEsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNyRSxhQUFhLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQ25FLENBQUM7WUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLGVBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUV0RSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsdUNBQXVDLENBQ3JELEdBQUcsRUFDSCxZQUFZLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FDaEUsQ0FBQTtZQUNELElBQUksQ0FBQyxDQUFDLElBQUksc0NBQThCLEVBQUUsQ0FBQztnQkFDMUMsT0FBTyxDQUFDLENBQUE7WUFDVCxDQUFDO1FBQ0YsQ0FBQztRQUVELHNHQUFzRztRQUN0RyxPQUFPLElBQUksQ0FBQyx1Q0FBdUMsQ0FDbEQsR0FBRyxFQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FDL0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxNQUFNLENBQUMsdUNBQXVDLENBQ3JELEdBQW1CLEVBQ25CLE1BQXlCO1FBRXpCLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3JELElBQUksS0FBWSxDQUFBO1FBQ2hCLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsSUFBSSxPQUFhLFVBQVcsQ0FBQyxtQkFBbUIsS0FBSyxXQUFXLEVBQUUsQ0FBQztnQkFDbEUsS0FBSyxHQUFHLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM5RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsS0FBSyxHQUFTLFVBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM5RSxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLEdBQVMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxhQUFjLENBQUMsbUJBQW1CLENBQy9ELE1BQU0sQ0FBQyxPQUFPLEVBQ2QsTUFBTSxDQUFDLE9BQU8sQ0FDZCxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckMsT0FBTyxJQUFJLG9CQUFvQixFQUFFLENBQUE7UUFDbEMsQ0FBQztRQUVELHlFQUF5RTtRQUN6RSxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFBO1FBRTNDLElBQUksY0FBYyxDQUFDLFFBQVEsS0FBSyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDMUQsa0RBQWtEO1lBQ2xELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUEsQ0FBQyxnQ0FBZ0M7WUFDMUUsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsQ0FBQyw4Q0FBOEM7WUFDbEcsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsQ0FBQyxtQ0FBbUM7WUFDdkYsTUFBTSxnQkFBZ0IsR0FDckIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLFlBQVk7Z0JBQ25ELENBQUMsQ0FBZSxPQUFRLENBQUMsU0FBUztnQkFDbEMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUVSLElBQUksZ0JBQWdCLEtBQUssUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUM5QyxPQUFPLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQWUsT0FBTyxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUNyRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxJQUFJLG9CQUFvQixDQUFjLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUN4RSxDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksY0FBYyxDQUFDLFFBQVEsS0FBSyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDcEUsa0RBQWtEO1lBQ2xELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUEsQ0FBQyw4Q0FBOEM7WUFDeEYsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsQ0FBQyxtQ0FBbUM7WUFDdkYsTUFBTSxnQkFBZ0IsR0FDckIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLFlBQVk7Z0JBQ25ELENBQUMsQ0FBZSxPQUFRLENBQUMsU0FBUztnQkFDbEMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUVSLElBQUksZ0JBQWdCLEtBQUssUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUM5QyxPQUFPLGFBQWEsQ0FBQyxpQkFBaUIsQ0FDckMsR0FBRyxFQUNVLGNBQWMsRUFDYixjQUFlLENBQUMsV0FBWSxDQUFDLE1BQU0sQ0FDakQsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLElBQUksb0JBQW9CLENBQWMsY0FBYyxDQUFDLENBQUE7WUFDN0QsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksb0JBQW9CLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFNLENBQUMsb0NBQW9DLENBQ2xELEdBQW1CLEVBQ25CLE1BQXlCO1FBRXpCLE1BQU0sU0FBUyxHQUErQyxDQUM3RCxHQUFHLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FDNUIsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUV6RCxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsUUFBUSxLQUFLLFNBQVMsQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdEUsOENBQThDO1lBQzlDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFBLENBQUMsZ0NBQWdDO1lBQ2hGLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBLENBQUMsOENBQThDO1lBQ2xHLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBLENBQUMsbUNBQW1DO1lBQ3ZGLE1BQU0sZ0JBQWdCLEdBQ3JCLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQyxZQUFZO2dCQUNuRCxDQUFDLENBQWUsT0FBUSxDQUFDLFNBQVM7Z0JBQ2xDLENBQUMsQ0FBQyxJQUFJLENBQUE7WUFFUixJQUFJLGdCQUFnQixLQUFLLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDOUMsT0FBTyxhQUFhLENBQUMsaUJBQWlCLENBQ3JDLEdBQUcsRUFDVSxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFDNUMsU0FBUyxDQUFDLE1BQU0sQ0FDaEIsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLElBQUksb0JBQW9CLENBQWMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM5RSxDQUFDO1FBQ0YsQ0FBQztRQUVELHFJQUFxSTtRQUNySSx1RUFBdUU7UUFDdkUsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLFFBQVEsS0FBSyxTQUFTLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3pFLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFBO1lBQy9DLE1BQU0sZ0JBQWdCLEdBQ3JCLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQyxZQUFZO2dCQUNuRCxDQUFDLENBQWUsT0FBUSxDQUFDLFNBQVM7Z0JBQ2xDLENBQUMsQ0FBQyxJQUFJLENBQUE7WUFDUixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUNuRCxNQUFNLGdCQUFnQixHQUNyQixPQUFPLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUMsWUFBWTtnQkFDbkQsQ0FBQyxDQUFlLE9BQVEsQ0FBQyxTQUFTO2dCQUNsQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBRVIsSUFBSSxnQkFBZ0IsS0FBSyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQzlDLGlHQUFpRztnQkFDakcsTUFBTSxTQUFTLEdBQ2QsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQzlCLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQ3RFLENBQUE7Z0JBQ0YsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQWUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUN2RSxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLGdCQUFnQixLQUFLLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDckQsc0RBQXNEO2dCQUN0RCxPQUFPLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQWUsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNsRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxvQkFBb0IsQ0FBYyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVPLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxRQUFrQixFQUFFLFNBQXFCO1FBQzlFLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2hELE1BQU0sV0FBVyxHQUFHLHVCQUF1QixDQUFDLGNBQWMsQ0FDekQsV0FBVyxFQUNYLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUNuQixPQUFPLDRCQUVQLENBQUE7UUFDRCxJQUFJLFdBQVcsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDMUQsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFTSxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQW1CLEVBQUUsT0FBMkI7UUFDdkUsSUFBSSxNQUFNLEdBQWtCLElBQUksb0JBQW9CLEVBQUUsQ0FBQTtRQUN0RCxJQUFJLE9BQWEsR0FBRyxDQUFDLFdBQVcsQ0FBQyxhQUFjLENBQUMsbUJBQW1CLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDcEYsTUFBTSxHQUFHLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDOUQsQ0FBQzthQUFNLElBQVUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxhQUFjLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUN4RSxNQUFNLEdBQUcsSUFBSSxDQUFDLG9DQUFvQyxDQUNqRCxHQUFHLEVBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUMvRCxDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksTUFBTSxDQUFDLElBQUksc0NBQThCLEVBQUUsQ0FBQztZQUMvQyxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUVyRSxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQ3pELE1BQU0sQ0FBQyxRQUFRLGdDQUVmLENBQUE7WUFDRCxJQUFJLFlBQVksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDakUsTUFBTSxHQUFHLElBQUksb0JBQW9CLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUNyRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztDQUNEO0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxVQUFzQixFQUFFLENBQVMsRUFBRSxDQUFTO0lBQzlFLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUVwQyxrQ0FBa0M7SUFDbEMsSUFBSSxFQUFFLEdBQXlCLFVBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFFakUsSUFBSSxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDakIsd0VBQXdFO1FBQ3hFLCtFQUErRTtRQUMvRSxtRUFBbUU7UUFDbkUsT0FDQyxFQUFFO1lBQ0YsRUFBRSxDQUFDLFVBQVU7WUFDYixFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVM7WUFDbEQsRUFBRSxDQUFDLFNBQVM7WUFDWixFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFDdEIsQ0FBQztZQUNGLEVBQUUsR0FBWSxFQUFFLENBQUMsU0FBUyxDQUFBO1FBQzNCLENBQUM7UUFFRCxnQkFBZ0I7UUFDaEIsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFFdkMsZ0ZBQWdGO1FBQ2hGLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDbEMsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNwRixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ3hGLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDdEYsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNsRixNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3RGLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDdEYsTUFBTSxJQUFJLEdBQUcsR0FBRyxTQUFTLElBQUksV0FBVyxJQUFJLFVBQVUsSUFBSSxRQUFRLElBQUksVUFBVSxJQUFJLFVBQVUsRUFBRSxDQUFBO1FBRWhHLDJCQUEyQjtRQUMzQixNQUFNLElBQUksR0FBSSxFQUFVLENBQUMsU0FBUyxDQUFBO1FBRWxDLHVEQUF1RDtRQUN2RCxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBO1FBQzNCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNkLElBQUksSUFBWSxDQUFBO1FBRWhCLGtGQUFrRjtRQUNsRixJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUNyQixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUNyRCxxRkFBcUY7WUFDckYsNEJBQTRCO1lBQzVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMxQyw4Q0FBOEM7Z0JBQzlDLElBQUksR0FBRyxlQUFlLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUM3RCxzQ0FBc0M7Z0JBQ3RDLFdBQVcsSUFBSSxJQUFJLENBQUE7Z0JBQ25CLHFHQUFxRztnQkFDckcsSUFBSSxDQUFDLEdBQUcsV0FBVyxFQUFFLENBQUM7b0JBQ3JCLE1BQU0sR0FBRyxDQUFDLENBQUE7b0JBQ1YsTUFBSztnQkFDTixDQUFDO2dCQUNELGtEQUFrRDtnQkFDbEQsV0FBVyxJQUFJLElBQUksQ0FBQTtZQUNwQixDQUFDO1FBQ0YsQ0FBQztRQUVELDZFQUE2RTtRQUM3RSxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxVQUFXLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUFFRCxNQUFNLGVBQWU7YUFDTCxjQUFTLEdBQTJCLElBQUksQ0FBQTtJQUVoRCxNQUFNLENBQUMsV0FBVztRQUN4QixJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLGVBQWUsQ0FBQyxTQUFTLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNsRCxDQUFDO1FBQ0QsT0FBTyxlQUFlLENBQUMsU0FBUyxDQUFBO0lBQ2pDLENBQUM7SUFLRDtRQUNDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBQ2hCLElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRU0sWUFBWSxDQUFDLElBQVksRUFBRSxJQUFZO1FBQzdDLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUE7UUFDNUIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQTtRQUM5QyxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNuQixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUE7UUFDN0IsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDIn0=
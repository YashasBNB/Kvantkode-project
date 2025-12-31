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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW91c2VUYXJnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb250cm9sbGVyL21vdXNlVGFyZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBcUJoRyxPQUFPLEVBSU4sZUFBZSxHQUVmLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUc3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEQsT0FBTyxFQUFFLEtBQUssSUFBSSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUlqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEUsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQ04sdUJBQXVCLEdBRXZCLE1BQU0sbURBQW1ELENBQUE7QUFJMUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBR25ELElBQVcsaUJBR1Y7QUFIRCxXQUFXLGlCQUFpQjtJQUMzQiwrREFBTyxDQUFBO0lBQ1AsK0RBQU8sQ0FBQTtBQUNSLENBQUMsRUFIVSxpQkFBaUIsS0FBakIsaUJBQWlCLFFBRzNCO0FBRUQsTUFBTSxvQkFBb0I7SUFFekIsWUFBcUIsWUFBZ0MsSUFBSTtRQUFwQyxjQUFTLEdBQVQsU0FBUyxDQUEyQjtRQURoRCxTQUFJLHFDQUE0QjtJQUNtQixDQUFDO0NBQzdEO0FBRUQsTUFBTSxvQkFBb0I7SUFHekIsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxZQUNVLFFBQWtCLEVBQ2xCLFFB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../base/browser/fastDomNode.js';
import { createTrustedTypesPolicy } from '../../../base/browser/trustedTypes.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { StringBuilder } from '../../common/core/stringBuilder.js';
export class RenderedLinesCollection {
    constructor(_lineFactory) {
        this._lineFactory = _lineFactory;
        this._set(1, []);
    }
    flush() {
        this._set(1, []);
    }
    _set(rendLineNumberStart, lines) {
        this._lines = lines;
        this._rendLineNumberStart = rendLineNumberStart;
    }
    _get() {
        return {
            rendLineNumberStart: this._rendLineNumberStart,
            lines: this._lines,
        };
    }
    /**
     * @returns Inclusive line number that is inside this collection
     */
    getStartLineNumber() {
        return this._rendLineNumberStart;
    }
    /**
     * @returns Inclusive line number that is inside this collection
     */
    getEndLineNumber() {
        return this._rendLineNumberStart + this._lines.length - 1;
    }
    getCount() {
        return this._lines.length;
    }
    getLine(lineNumber) {
        const lineIndex = lineNumber - this._rendLineNumberStart;
        if (lineIndex < 0 || lineIndex >= this._lines.length) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._lines[lineIndex];
    }
    /**
     * @returns Lines that were removed from this collection
     */
    onLinesDeleted(deleteFromLineNumber, deleteToLineNumber) {
        if (this.getCount() === 0) {
            // no lines
            return null;
        }
        const startLineNumber = this.getStartLineNumber();
        const endLineNumber = this.getEndLineNumber();
        if (deleteToLineNumber < startLineNumber) {
            // deleting above the viewport
            const deleteCnt = deleteToLineNumber - deleteFromLineNumber + 1;
            this._rendLineNumberStart -= deleteCnt;
            return null;
        }
        if (deleteFromLineNumber > endLineNumber) {
            // deleted below the viewport
            return null;
        }
        // Record what needs to be deleted
        let deleteStartIndex = 0;
        let deleteCount = 0;
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineIndex = lineNumber - this._rendLineNumberStart;
            if (deleteFromLineNumber <= lineNumber && lineNumber <= deleteToLineNumber) {
                // this is a line to be deleted
                if (deleteCount === 0) {
                    // this is the first line to be deleted
                    deleteStartIndex = lineIndex;
                    deleteCount = 1;
                }
                else {
                    deleteCount++;
                }
            }
        }
        // Adjust this._rendLineNumberStart for lines deleted above
        if (deleteFromLineNumber < startLineNumber) {
            // Something was deleted above
            let deleteAboveCount = 0;
            if (deleteToLineNumber < startLineNumber) {
                // the entire deleted lines are above
                deleteAboveCount = deleteToLineNumber - deleteFromLineNumber + 1;
            }
            else {
                deleteAboveCount = startLineNumber - deleteFromLineNumber;
            }
            this._rendLineNumberStart -= deleteAboveCount;
        }
        const deleted = this._lines.splice(deleteStartIndex, deleteCount);
        return deleted;
    }
    onLinesChanged(changeFromLineNumber, changeCount) {
        const changeToLineNumber = changeFromLineNumber + changeCount - 1;
        if (this.getCount() === 0) {
            // no lines
            return false;
        }
        const startLineNumber = this.getStartLineNumber();
        const endLineNumber = this.getEndLineNumber();
        let someoneNotified = false;
        for (let changedLineNumber = changeFromLineNumber; changedLineNumber <= changeToLineNumber; changedLineNumber++) {
            if (changedLineNumber >= startLineNumber && changedLineNumber <= endLineNumber) {
                // Notify the line
                this._lines[changedLineNumber - this._rendLineNumberStart].onContentChanged();
                someoneNotified = true;
            }
        }
        return someoneNotified;
    }
    onLinesInserted(insertFromLineNumber, insertToLineNumber) {
        if (this.getCount() === 0) {
            // no lines
            return null;
        }
        const insertCnt = insertToLineNumber - insertFromLineNumber + 1;
        const startLineNumber = this.getStartLineNumber();
        const endLineNumber = this.getEndLineNumber();
        if (insertFromLineNumber <= startLineNumber) {
            // inserting above the viewport
            this._rendLineNumberStart += insertCnt;
            return null;
        }
        if (insertFromLineNumber > endLineNumber) {
            // inserting below the viewport
            return null;
        }
        if (insertCnt + insertFromLineNumber > endLineNumber) {
            // insert inside the viewport in such a way that all remaining lines are pushed outside
            const deleted = this._lines.splice(insertFromLineNumber - this._rendLineNumberStart, endLineNumber - insertFromLineNumber + 1);
            return deleted;
        }
        // insert inside the viewport, push out some lines, but not all remaining lines
        const newLines = [];
        for (let i = 0; i < insertCnt; i++) {
            newLines[i] = this._lineFactory.createLine();
        }
        const insertIndex = insertFromLineNumber - this._rendLineNumberStart;
        const beforeLines = this._lines.slice(0, insertIndex);
        const afterLines = this._lines.slice(insertIndex, this._lines.length - insertCnt);
        const deletedLines = this._lines.slice(this._lines.length - insertCnt, this._lines.length);
        this._lines = beforeLines.concat(newLines).concat(afterLines);
        return deletedLines;
    }
    onTokensChanged(ranges) {
        if (this.getCount() === 0) {
            // no lines
            return false;
        }
        const startLineNumber = this.getStartLineNumber();
        const endLineNumber = this.getEndLineNumber();
        let notifiedSomeone = false;
        for (let i = 0, len = ranges.length; i < len; i++) {
            const rng = ranges[i];
            if (rng.toLineNumber < startLineNumber || rng.fromLineNumber > endLineNumber) {
                // range outside viewport
                continue;
            }
            const from = Math.max(startLineNumber, rng.fromLineNumber);
            const to = Math.min(endLineNumber, rng.toLineNumber);
            for (let lineNumber = from; lineNumber <= to; lineNumber++) {
                const lineIndex = lineNumber - this._rendLineNumberStart;
                this._lines[lineIndex].onTokensChanged();
                notifiedSomeone = true;
            }
        }
        return notifiedSomeone;
    }
}
export class VisibleLinesCollection {
    constructor(_lineFactory) {
        this._lineFactory = _lineFactory;
        this.domNode = this._createDomNode();
        this._linesCollection = new RenderedLinesCollection(this._lineFactory);
    }
    _createDomNode() {
        const domNode = createFastDomNode(document.createElement('div'));
        domNode.setClassName('view-layer');
        domNode.setPosition('absolute');
        domNode.domNode.setAttribute('role', 'presentation');
        domNode.domNode.setAttribute('aria-hidden', 'true');
        return domNode;
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
            return true;
        }
        return false;
    }
    onFlushed(e, flushDom) {
        // No need to clear the dom node because a full .innerHTML will occur in
        // ViewLayerRenderer._render, however the fallback mechanism in the
        // GPU renderer may cause this to be necessary as the .innerHTML call
        // may not happen depending on the new state, leaving stale DOM nodes
        // around.
        if (flushDom) {
            const start = this._linesCollection.getStartLineNumber();
            const end = this._linesCollection.getEndLineNumber();
            for (let i = start; i <= end; i++) {
                this._linesCollection.getLine(i).getDomNode()?.remove();
            }
        }
        this._linesCollection.flush();
        return true;
    }
    onLinesChanged(e) {
        return this._linesCollection.onLinesChanged(e.fromLineNumber, e.count);
    }
    onLinesDeleted(e) {
        const deleted = this._linesCollection.onLinesDeleted(e.fromLineNumber, e.toLineNumber);
        if (deleted) {
            // Remove from DOM
            for (let i = 0, len = deleted.length; i < len; i++) {
                const lineDomNode = deleted[i].getDomNode();
                lineDomNode?.remove();
            }
        }
        return true;
    }
    onLinesInserted(e) {
        const deleted = this._linesCollection.onLinesInserted(e.fromLineNumber, e.toLineNumber);
        if (deleted) {
            // Remove from DOM
            for (let i = 0, len = deleted.length; i < len; i++) {
                const lineDomNode = deleted[i].getDomNode();
                lineDomNode?.remove();
            }
        }
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged;
    }
    onTokensChanged(e) {
        return this._linesCollection.onTokensChanged(e.ranges);
    }
    onZonesChanged(e) {
        return true;
    }
    // ---- end view event handlers
    getStartLineNumber() {
        return this._linesCollection.getStartLineNumber();
    }
    getEndLineNumber() {
        return this._linesCollection.getEndLineNumber();
    }
    getVisibleLine(lineNumber) {
        return this._linesCollection.getLine(lineNumber);
    }
    renderLines(viewportData) {
        const inp = this._linesCollection._get();
        const renderer = new ViewLayerRenderer(this.domNode.domNode, this._lineFactory, viewportData);
        const ctx = {
            rendLineNumberStart: inp.rendLineNumberStart,
            lines: inp.lines,
            linesLength: inp.lines.length,
        };
        // Decide if this render will do a single update (single large .innerHTML) or many updates (inserting/removing dom nodes)
        const resCtx = renderer.render(ctx, viewportData.startLineNumber, viewportData.endLineNumber, viewportData.relativeVerticalOffset);
        this._linesCollection._set(resCtx.rendLineNumberStart, resCtx.lines);
    }
}
class ViewLayerRenderer {
    static { this._ttPolicy = createTrustedTypesPolicy('editorViewLayer', {
        createHTML: (value) => value,
    }); }
    constructor(_domNode, _lineFactory, _viewportData) {
        this._domNode = _domNode;
        this._lineFactory = _lineFactory;
        this._viewportData = _viewportData;
    }
    render(inContext, startLineNumber, stopLineNumber, deltaTop) {
        const ctx = {
            rendLineNumberStart: inContext.rendLineNumberStart,
            lines: inContext.lines.slice(0),
            linesLength: inContext.linesLength,
        };
        if (ctx.rendLineNumberStart + ctx.linesLength - 1 < startLineNumber ||
            stopLineNumber < ctx.rendLineNumberStart) {
            // There is no overlap whatsoever
            ctx.rendLineNumberStart = startLineNumber;
            ctx.linesLength = stopLineNumber - startLineNumber + 1;
            ctx.lines = [];
            for (let x = startLineNumber; x <= stopLineNumber; x++) {
                ctx.lines[x - startLineNumber] = this._lineFactory.createLine();
            }
            this._finishRendering(ctx, true, deltaTop);
            return ctx;
        }
        // Update lines which will remain untouched
        this._renderUntouchedLines(ctx, Math.max(startLineNumber - ctx.rendLineNumberStart, 0), Math.min(stopLineNumber - ctx.rendLineNumberStart, ctx.linesLength - 1), deltaTop, startLineNumber);
        if (ctx.rendLineNumberStart > startLineNumber) {
            // Insert lines before
            const fromLineNumber = startLineNumber;
            const toLineNumber = Math.min(stopLineNumber, ctx.rendLineNumberStart - 1);
            if (fromLineNumber <= toLineNumber) {
                this._insertLinesBefore(ctx, fromLineNumber, toLineNumber, deltaTop, startLineNumber);
                ctx.linesLength += toLineNumber - fromLineNumber + 1;
            }
        }
        else if (ctx.rendLineNumberStart < startLineNumber) {
            // Remove lines before
            const removeCnt = Math.min(ctx.linesLength, startLineNumber - ctx.rendLineNumberStart);
            if (removeCnt > 0) {
                this._removeLinesBefore(ctx, removeCnt);
                ctx.linesLength -= removeCnt;
            }
        }
        ctx.rendLineNumberStart = startLineNumber;
        if (ctx.rendLineNumberStart + ctx.linesLength - 1 < stopLineNumber) {
            // Insert lines after
            const fromLineNumber = ctx.rendLineNumberStart + ctx.linesLength;
            const toLineNumber = stopLineNumber;
            if (fromLineNumber <= toLineNumber) {
                this._insertLinesAfter(ctx, fromLineNumber, toLineNumber, deltaTop, startLineNumber);
                ctx.linesLength += toLineNumber - fromLineNumber + 1;
            }
        }
        else if (ctx.rendLineNumberStart + ctx.linesLength - 1 > stopLineNumber) {
            // Remove lines after
            const fromLineNumber = Math.max(0, stopLineNumber - ctx.rendLineNumberStart + 1);
            const toLineNumber = ctx.linesLength - 1;
            const removeCnt = toLineNumber - fromLineNumber + 1;
            if (removeCnt > 0) {
                this._removeLinesAfter(ctx, removeCnt);
                ctx.linesLength -= removeCnt;
            }
        }
        this._finishRendering(ctx, false, deltaTop);
        return ctx;
    }
    _renderUntouchedLines(ctx, startIndex, endIndex, deltaTop, deltaLN) {
        const rendLineNumberStart = ctx.rendLineNumberStart;
        const lines = ctx.lines;
        for (let i = startIndex; i <= endIndex; i++) {
            const lineNumber = rendLineNumberStart + i;
            lines[i].layoutLine(lineNumber, deltaTop[lineNumber - deltaLN], this._viewportData.lineHeight);
        }
    }
    _insertLinesBefore(ctx, fromLineNumber, toLineNumber, deltaTop, deltaLN) {
        const newLines = [];
        let newLinesLen = 0;
        for (let lineNumber = fromLineNumber; lineNumber <= toLineNumber; lineNumber++) {
            newLines[newLinesLen++] = this._lineFactory.createLine();
        }
        ctx.lines = newLines.concat(ctx.lines);
    }
    _removeLinesBefore(ctx, removeCount) {
        for (let i = 0; i < removeCount; i++) {
            const lineDomNode = ctx.lines[i].getDomNode();
            lineDomNode?.remove();
        }
        ctx.lines.splice(0, removeCount);
    }
    _insertLinesAfter(ctx, fromLineNumber, toLineNumber, deltaTop, deltaLN) {
        const newLines = [];
        let newLinesLen = 0;
        for (let lineNumber = fromLineNumber; lineNumber <= toLineNumber; lineNumber++) {
            newLines[newLinesLen++] = this._lineFactory.createLine();
        }
        ctx.lines = ctx.lines.concat(newLines);
    }
    _removeLinesAfter(ctx, removeCount) {
        const removeIndex = ctx.linesLength - removeCount;
        for (let i = 0; i < removeCount; i++) {
            const lineDomNode = ctx.lines[removeIndex + i].getDomNode();
            lineDomNode?.remove();
        }
        ctx.lines.splice(removeIndex, removeCount);
    }
    _finishRenderingNewLines(ctx, domNodeIsEmpty, newLinesHTML, wasNew) {
        if (ViewLayerRenderer._ttPolicy) {
            newLinesHTML = ViewLayerRenderer._ttPolicy.createHTML(newLinesHTML);
        }
        const lastChild = this._domNode.lastChild;
        if (domNodeIsEmpty || !lastChild) {
            this._domNode.innerHTML = newLinesHTML; // explains the ugly casts -> https://github.com/microsoft/vscode/issues/106396#issuecomment-692625393;
        }
        else {
            lastChild.insertAdjacentHTML('afterend', newLinesHTML);
        }
        let currChild = this._domNode.lastChild;
        for (let i = ctx.linesLength - 1; i >= 0; i--) {
            const line = ctx.lines[i];
            if (wasNew[i]) {
                line.setDomNode(currChild);
                currChild = currChild.previousSibling;
            }
        }
    }
    _finishRenderingInvalidLines(ctx, invalidLinesHTML, wasInvalid) {
        const hugeDomNode = document.createElement('div');
        if (ViewLayerRenderer._ttPolicy) {
            invalidLinesHTML = ViewLayerRenderer._ttPolicy.createHTML(invalidLinesHTML);
        }
        hugeDomNode.innerHTML = invalidLinesHTML;
        for (let i = 0; i < ctx.linesLength; i++) {
            const line = ctx.lines[i];
            if (wasInvalid[i]) {
                const source = hugeDomNode.firstChild;
                const lineDomNode = line.getDomNode();
                lineDomNode.parentNode.replaceChild(source, lineDomNode);
                line.setDomNode(source);
            }
        }
    }
    static { this._sb = new StringBuilder(100000); }
    _finishRendering(ctx, domNodeIsEmpty, deltaTop) {
        const sb = ViewLayerRenderer._sb;
        const linesLength = ctx.linesLength;
        const lines = ctx.lines;
        const rendLineNumberStart = ctx.rendLineNumberStart;
        const wasNew = [];
        {
            sb.reset();
            let hadNewLine = false;
            for (let i = 0; i < linesLength; i++) {
                const line = lines[i];
                wasNew[i] = false;
                const lineDomNode = line.getDomNode();
                if (lineDomNode) {
                    // line is not new
                    continue;
                }
                const renderResult = line.renderLine(i + rendLineNumberStart, deltaTop[i], this._viewportData.lineHeight, this._viewportData, sb);
                if (!renderResult) {
                    // line does not need rendering
                    continue;
                }
                wasNew[i] = true;
                hadNewLine = true;
            }
            if (hadNewLine) {
                this._finishRenderingNewLines(ctx, domNodeIsEmpty, sb.build(), wasNew);
            }
        }
        {
            sb.reset();
            let hadInvalidLine = false;
            const wasInvalid = [];
            for (let i = 0; i < linesLength; i++) {
                const line = lines[i];
                wasInvalid[i] = false;
                if (wasNew[i]) {
                    // line was new
                    continue;
                }
                const renderResult = line.renderLine(i + rendLineNumberStart, deltaTop[i], this._viewportData.lineHeight, this._viewportData, sb);
                if (!renderResult) {
                    // line does not need rendering
                    continue;
                }
                wasInvalid[i] = true;
                hadInvalidLine = true;
            }
            if (hadInvalidLine) {
                this._finishRenderingInvalidLines(ctx, sb.build(), wasInvalid);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xheWVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3L3ZpZXdMYXllci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFzQ2xFLE1BQU0sT0FBTyx1QkFBdUI7SUFJbkMsWUFBNkIsWUFBNkI7UUFBN0IsaUJBQVksR0FBWixZQUFZLENBQWlCO1FBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ2pCLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDakIsQ0FBQztJQUVELElBQUksQ0FBQyxtQkFBMkIsRUFBRSxLQUFVO1FBQzNDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsSUFBSTtRQUNILE9BQU87WUFDTixtQkFBbUIsRUFBRSxJQUFJLENBQUMsb0JBQW9CO1lBQzlDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTTtTQUNsQixDQUFBO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksa0JBQWtCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ2pDLENBQUM7SUFFRDs7T0FFRztJQUNJLGdCQUFnQjtRQUN0QixPQUFPLElBQUks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
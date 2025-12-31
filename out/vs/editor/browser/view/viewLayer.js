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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xheWVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlldy92aWV3TGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBc0NsRSxNQUFNLE9BQU8sdUJBQXVCO0lBSW5DLFlBQTZCLFlBQTZCO1FBQTdCLGlCQUFZLEdBQVosWUFBWSxDQUFpQjtRQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNqQixDQUFDO0lBRU0sS0FBSztRQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxJQUFJLENBQUMsbUJBQTJCLEVBQUUsS0FBVTtRQUMzQyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUNuQixJQUFJLENBQUMsb0JBQW9CLEdBQUcsbUJBQW1CLENBQUE7SUFDaEQsQ0FBQztJQUVELElBQUk7UUFDSCxPQUFPO1lBQ04sbUJBQW1CLEVBQUUsSUFBSSxDQUFDLG9CQUFvQjtZQUM5QyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU07U0FDbEIsQ0FBQTtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNJLGtCQUFrQjtRQUN4QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQTtJQUNqQyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxnQkFBZ0I7UUFDdEIsT0FBTyxJQUFJLENBQUMs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
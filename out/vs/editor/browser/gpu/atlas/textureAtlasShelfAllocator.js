/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { ensureNonNullable } from '../gpuUtils.js';
/**
 * The shelf allocator is a simple allocator that places glyphs in rows, starting a new row when the
 * current row is full. Due to its simplicity, it can waste space but it is very fast.
 */
export class TextureAtlasShelfAllocator {
    constructor(_canvas, _textureIndex) {
        this._canvas = _canvas;
        this._textureIndex = _textureIndex;
        this._currentRow = {
            x: 0,
            y: 0,
            h: 0,
        };
        /** A set of all glyphs allocated, this is only tracked to enable debug related functionality */
        this._allocatedGlyphs = new Set();
        this._nextIndex = 0;
        this._ctx = ensureNonNullable(this._canvas.getContext('2d', {
            willReadFrequently: true,
        }));
    }
    allocate(rasterizedGlyph) {
        // The glyph does not fit into the atlas page
        const glyphWidth = rasterizedGlyph.boundingBox.right - rasterizedGlyph.boundingBox.left + 1;
        const glyphHeight = rasterizedGlyph.boundingBox.bottom - rasterizedGlyph.boundingBox.top + 1;
        if (glyphWidth > this._canvas.width || glyphHeight > this._canvas.height) {
            throw new BugIndicatingError('Glyph is too large for the atlas page');
        }
        // Finalize and increment row if it doesn't fix horizontally
        if (rasterizedGlyph.boundingBox.right - rasterizedGlyph.boundingBox.left + 1 >
            this._canvas.width - this._currentRow.x) {
            this._currentRow.x = 0;
            this._currentRow.y += this._currentRow.h;
            this._currentRow.h = 1;
        }
        // Return undefined if there isn't any room left
        if (this._currentRow.y +
            rasterizedGlyph.boundingBox.bottom -
            rasterizedGlyph.boundingBox.top +
            1 >
            this._canvas.height) {
            return undefined;
        }
        // Draw glyph
        this._ctx.drawImage(rasterizedGlyph.source, 
        // source
        rasterizedGlyph.boundingBox.left, rasterizedGlyph.boundingBox.top, glyphWidth, glyphHeight, 
        // destination
        this._currentRow.x, this._currentRow.y, glyphWidth, glyphHeight);
        // Create glyph object
        const glyph = {
            pageIndex: this._textureIndex,
            glyphIndex: this._nextIndex++,
            x: this._currentRow.x,
            y: this._currentRow.y,
            w: glyphWidth,
            h: glyphHeight,
            originOffsetX: rasterizedGlyph.originOffset.x,
            originOffsetY: rasterizedGlyph.originOffset.y,
            fontBoundingBoxAscent: rasterizedGlyph.fontBoundingBoxAscent,
            fontBoundingBoxDescent: rasterizedGlyph.fontBoundingBoxDescent,
        };
        // Shift current row
        this._currentRow.x += glyphWidth;
        this._currentRow.h = Math.max(this._currentRow.h, glyphHeight);
        // Set the glyph
        this._allocatedGlyphs.add(glyph);
        return glyph;
    }
    getUsagePreview() {
        const w = this._canvas.width;
        const h = this._canvas.height;
        const canvas = new OffscreenCanvas(w, h);
        const ctx = ensureNonNullable(canvas.getContext('2d'));
        ctx.fillStyle = "#808080" /* UsagePreviewColors.Unused */;
        ctx.fillRect(0, 0, w, h);
        const rowHeight = new Map(); // y -> h
        const rowWidth = new Map(); // y -> w
        for (const g of this._allocatedGlyphs) {
            rowHeight.set(g.y, Math.max(rowHeight.get(g.y) ?? 0, g.h));
            rowWidth.set(g.y, Math.max(rowWidth.get(g.y) ?? 0, g.x + g.w));
        }
        for (const g of this._allocatedGlyphs) {
            ctx.fillStyle = "#4040FF" /* UsagePreviewColors.Used */;
            ctx.fillRect(g.x, g.y, g.w, g.h);
            ctx.fillStyle = "#FF0000" /* UsagePreviewColors.Wasted */;
            ctx.fillRect(g.x, g.y + g.h, g.w, rowHeight.get(g.y) - g.h);
        }
        for (const [rowY, rowW] of rowWidth.entries()) {
            if (rowY !== this._currentRow.y) {
                ctx.fillStyle = "#FF0000" /* UsagePreviewColors.Wasted */;
                ctx.fillRect(rowW, rowY, w - rowW, rowHeight.get(rowY));
            }
        }
        return canvas.convertToBlob();
    }
    getStats() {
        const w = this._canvas.width;
        const h = this._canvas.height;
        let usedPixels = 0;
        let wastedPixels = 0;
        const totalPixels = w * h;
        const rowHeight = new Map(); // y -> h
        const rowWidth = new Map(); // y -> w
        for (const g of this._allocatedGlyphs) {
            rowHeight.set(g.y, Math.max(rowHeight.get(g.y) ?? 0, g.h));
            rowWidth.set(g.y, Math.max(rowWidth.get(g.y) ?? 0, g.x + g.w));
        }
        for (const g of this._allocatedGlyphs) {
            usedPixels += g.w * g.h;
            wastedPixels += g.w * (rowHeight.get(g.y) - g.h);
        }
        for (const [rowY, rowW] of rowWidth.entries()) {
            if (rowY !== this._currentRow.y) {
                wastedPixels += (w - rowW) * rowHeight.get(rowY);
            }
        }
        return [
            `page${this._textureIndex}:`,
            `     Total: ${totalPixels} (${w}x${h})`,
            `      Used: ${usedPixels} (${((usedPixels / totalPixels) * 100).toPrecision(2)}%)`,
            `    Wasted: ${wastedPixels} (${((wastedPixels / totalPixels) * 100).toPrecision(2)}%)`,
            `Efficiency: ${((usedPixels / (usedPixels + wastedPixels)) * 100).toPrecision(2)}%`,
        ].join('\n');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzU2hlbGZBbGxvY2F0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvYXRsYXMvdGV4dHVyZUF0bGFzU2hlbGZBbGxvY2F0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFRbEQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLDBCQUEwQjtJQWN0QyxZQUNrQixPQUF3QixFQUN4QixhQUFxQjtRQURyQixZQUFPLEdBQVAsT0FBTyxDQUFpQjtRQUN4QixrQkFBYSxHQUFiLGFBQWEsQ0FBUTtRQWIvQixnQkFBVyxHQUF1QjtZQUN6QyxDQUFDLEVBQUUsQ0FBQztZQUNKLENBQUMsRUFBRSxDQUFDO1lBQ0osQ0FBQyxFQUFFLENBQUM7U0FDSixDQUFBO1FBRUQsZ0dBQWdHO1FBQy9FLHFCQUFnQixHQUEwQyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBRTVFLGVBQVUsR0FBRyxDQUFDLENBQUE7UUFNckIsSUFBSSxDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFO1lBQzdCLGtCQUFrQixFQUFFLElBQUk7U0FDeEIsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU0sUUFBUSxDQUFDLGVBQWlDO1FBQ2hELDZDQUE2QztRQUM3QyxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7UUFDM0YsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQyxNQUFN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
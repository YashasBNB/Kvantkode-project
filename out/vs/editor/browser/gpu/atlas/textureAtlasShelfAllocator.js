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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzU2hlbGZBbGxvY2F0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9hdGxhcy90ZXh0dXJlQXRsYXNTaGVsZkFsbG9jYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQVFsRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sMEJBQTBCO0lBY3RDLFlBQ2tCLE9BQXdCLEVBQ3hCLGFBQXFCO1FBRHJCLFlBQU8sR0FBUCxPQUFPLENBQWlCO1FBQ3hCLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBYi9CLGdCQUFXLEdBQXVCO1lBQ3pDLENBQUMsRUFBRSxDQUFDO1lBQ0osQ0FBQyxFQUFFLENBQUM7WUFDSixDQUFDLEVBQUUsQ0FBQztTQUNKLENBQUE7UUFFRCxnR0FBZ0c7UUFDL0UscUJBQWdCLEdBQTBDLElBQUksR0FBRyxFQUFFLENBQUE7UUFFNUUsZUFBVSxHQUFHLENBQUMsQ0FBQTtRQU1yQixJQUFJLENBQUMsSUFBSSxHQUFHLGlCQUFpQixDQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUU7WUFDN0Isa0JBQWtCLEVBQUUsSUFBSTtTQUN4QixDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTSxRQUFRLENBQUMsZUFBaUM7UUFDaEQsNkNBQTZDO1FBQzdDLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtRQUMzRixNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7UUFDNUYsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUUsTUFBTSxJQUFJLGtCQUFrQixDQUFDLHVDQUF1QyxDQUFDLENBQUE7UUFDdEUsQ0FBQztRQUVELDREQUE0RDtRQUM1RCxJQUNDLGVBQWUsQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQUM7WUFDeEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQ3RDLENBQUM7WUFDRixJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7WUFDeEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLENBQUM7UUFFRCxnREFBZ0Q7UUFDaEQsSUFDQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDakIsZUFBZSxDQUFDLFdBQVcsQ0FBQyxNQUFNO1lBQ2xDLGVBQWUsQ0FBQyxXQUFXLENBQUMsR0FBRztZQUMvQixDQUFDO1lBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQ2xCLENBQUM7WUFDRixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsYUFBYTtRQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUNsQixlQUFlLENBQUMsTUFBTTtRQUN0QixTQUFTO1FBQ1QsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQ2hDLGVBQWUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUMvQixVQUFVLEVBQ1YsV0FBVztRQUNYLGNBQWM7UUFDZCxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFDbEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQ2xCLFVBQVUsRUFDVixXQUFXLENBQ1gsQ0FBQTtRQUVELHNCQUFzQjtRQUN0QixNQUFNLEtBQUssR0FBMkI7WUFDckMsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQzdCLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQzdCLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDckIsQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNyQixDQUFDLEVBQUUsVUFBVTtZQUNiLENBQUMsRUFBRSxXQUFXO1lBQ2QsYUFBYSxFQUFFLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM3QyxhQUFhLEVBQUUsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzdDLHFCQUFxQixFQUFFLGVBQWUsQ0FBQyxxQkFBcUI7WUFDNUQsc0JBQXNCLEVBQUUsZUFBZSxDQUFDLHNCQUFzQjtTQUM5RCxDQUFBO1FBRUQsb0JBQW9CO1FBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQTtRQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRTlELGdCQUFnQjtRQUNoQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRWhDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLGVBQWU7UUFDckIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDNUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUE7UUFDN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sR0FBRyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUN0RCxHQUFHLENBQUMsU0FBUyw0Q0FBNEIsQ0FBQTtRQUN6QyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhCLE1BQU0sU0FBUyxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFBLENBQUMsU0FBUztRQUMxRCxNQUFNLFFBQVEsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQSxDQUFDLFNBQVM7UUFDekQsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN2QyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUNELEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkMsR0FBRyxDQUFDLFNBQVMsMENBQTBCLENBQUE7WUFDdkMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEMsR0FBRyxDQUFDLFNBQVMsNENBQTRCLENBQUE7WUFDekMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBQ0QsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQy9DLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLEdBQUcsQ0FBQyxTQUFTLDRDQUE0QixDQUFBO2dCQUN6QyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUE7WUFDekQsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRUQsUUFBUTtRQUNQLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFBO1FBQzVCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFBO1FBRTdCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQTtRQUNsQixJQUFJLFlBQVksR0FBRyxDQUFDLENBQUE7UUFDcEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUV6QixNQUFNLFNBQVMsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQSxDQUFDLFNBQVM7UUFDMUQsTUFBTSxRQUFRLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUEsQ0FBQyxTQUFTO1FBQ3pELEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFELFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFDRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkIsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUNELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUMvQyxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxZQUFZLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQTtZQUNsRCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU87WUFDTixPQUFPLElBQUksQ0FBQyxhQUFhLEdBQUc7WUFDNUIsZUFBZSxXQUFXLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRztZQUN4QyxlQUFlLFVBQVUsS0FBSyxDQUFDLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUNuRixlQUFlLFlBQVksS0FBSyxDQUFDLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUN2RixlQUFlLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDbkYsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDYixDQUFDO0NBQ0QifQ==
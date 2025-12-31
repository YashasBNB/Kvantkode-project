/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { NKeyMap } from '../../../../base/common/map.js';
import { ensureNonNullable } from '../gpuUtils.js';
/**
 * The slab allocator is a more complex allocator that places glyphs in square slabs of a fixed
 * size. Slabs are defined by a small range of glyphs sizes they can house, this places like-sized
 * glyphs in the same slab which reduces wasted space.
 *
 * Slabs also may contain "unused" regions on the left and bottom depending on the size of the
 * glyphs they include. This space is used to place very thin or short glyphs, which would otherwise
 * waste a lot of space in their own slab.
 */
export class TextureAtlasSlabAllocator {
    constructor(_canvas, _textureIndex, options) {
        this._canvas = _canvas;
        this._textureIndex = _textureIndex;
        this._slabs = [];
        this._activeSlabsByDims = new NKeyMap();
        this._unusedRects = [];
        this._openRegionsByHeight = new Map();
        this._openRegionsByWidth = new Map();
        /** A set of all glyphs allocated, this is only tracked to enable debug related functionality */
        this._allocatedGlyphs = new Set();
        this._nextIndex = 0;
        this._ctx = ensureNonNullable(this._canvas.getContext('2d', {
            willReadFrequently: true,
        }));
        this._slabW = Math.min(options?.slabW ?? 64 << Math.max(Math.floor(getActiveWindow().devicePixelRatio) - 1, 0), this._canvas.width);
        this._slabH = Math.min(options?.slabH ?? this._slabW, this._canvas.height);
        this._slabsPerRow = Math.floor(this._canvas.width / this._slabW);
        this._slabsPerColumn = Math.floor(this._canvas.height / this._slabH);
    }
    allocate(rasterizedGlyph) {
        // Find ideal slab, creating it if there is none suitable
        const glyphWidth = rasterizedGlyph.boundingBox.right - rasterizedGlyph.boundingBox.left + 1;
        const glyphHeight = rasterizedGlyph.boundingBox.bottom - rasterizedGlyph.boundingBox.top + 1;
        // The glyph does not fit into the atlas page, glyphs should never be this large in practice
        if (glyphWidth > this._canvas.width || glyphHeight > this._canvas.height) {
            throw new BugIndicatingError('Glyph is too large for the atlas page');
        }
        // The glyph does not fit into a slab
        if (glyphWidth > this._slabW || glyphHeight > this._slabH) {
            // Only if this is the allocator's first glyph, resize the slab size to fit the glyph.
            if (this._allocatedGlyphs.size > 0) {
                return undefined;
            }
            // Find the largest power of 2 devisor that the glyph fits into, this ensure there is no
            // wasted space outside the allocated slabs.
            let sizeCandidate = this._canvas.width;
            while (glyphWidth < sizeCandidate / 2 && glyphHeight < sizeCandidate / 2) {
                sizeCandidate /= 2;
            }
            this._slabW = sizeCandidate;
            this._slabH = sizeCandidate;
            this._slabsPerRow = Math.floor(this._canvas.width / this._slabW);
            this._slabsPerColumn = Math.floor(this._canvas.height / this._slabH);
        }
        // const dpr = getActiveWindow().devicePixelRatio;
        // TODO: Include font size as well as DPR in nearestXPixels calculation
        // Round slab glyph dimensions to the nearest x pixels, where x scaled with device pixel ratio
        // const nearestXPixels = Math.max(1, Math.floor(dpr / 0.5));
        // const nearestXPixels = Math.max(1, Math.floor(dpr));
        const desiredSlabSize = {
            // Nearest square number
            // TODO: This can probably be optimized
            // w: 1 << Math.ceil(Math.sqrt(glyphWidth)),
            // h: 1 << Math.ceil(Math.sqrt(glyphHeight)),
            // Nearest x px
            // w: Math.ceil(glyphWidth / nearestXPixels) * nearestXPixels,
            // h: Math.ceil(glyphHeight / nearestXPixels) * nearestXPixels,
            // Round odd numbers up
            // w: glyphWidth % 0 === 1 ? glyphWidth + 1 : glyphWidth,
            // h: glyphHeight % 0 === 1 ? glyphHeight + 1 : glyphHeight,
            // Exact number only
            w: glyphWidth,
            h: glyphHeight,
        };
        // Get any existing slab
        let slab = this._activeSlabsByDims.get(desiredSlabSize.w, desiredSlabSize.h);
        // Check if the slab is full
        if (slab) {
            const glyphsPerSlab = Math.floor(this._slabW / slab.entryW) * Math.floor(this._slabH / slab.entryH);
            if (slab.count >= glyphsPerSlab) {
                slab = undefined;
            }
        }
        let dx;
        let dy;
        // Search for suitable space in unused rectangles
        if (!slab) {
            // Only check availability for the smallest side
            if (glyphWidth < glyphHeight) {
                const openRegions = this._openRegionsByWidth.get(glyphWidth);
                if (openRegions?.length) {
                    // TODO: Don't search everything?
                    // Search from the end so we can typically pop it off the stack
                    for (let i = openRegions.length - 1; i >= 0; i--) {
                        const r = openRegions[i];
                        if (r.w >= glyphWidth && r.h >= glyphHeight) {
                            dx = r.x;
                            dy = r.y;
                            if (glyphWidth < r.w) {
                                this._unusedRects.push({
                                    x: r.x + glyphWidth,
                                    y: r.y,
                                    w: r.w - glyphWidth,
                                    h: glyphHeight,
                                });
                            }
                            r.y += glyphHeight;
                            r.h -= glyphHeight;
                            if (r.h === 0) {
                                if (i === openRegions.length - 1) {
                                    openRegions.pop();
                                }
                                else {
                                    this._unusedRects.splice(i, 1);
                                }
                            }
                            break;
                        }
                    }
                }
            }
            else {
                const openRegions = this._openRegionsByHeight.get(glyphHeight);
                if (openRegions?.length) {
                    // TODO: Don't search everything?
                    // Search from the end so we can typically pop it off the stack
                    for (let i = openRegions.length - 1; i >= 0; i--) {
                        const r = openRegions[i];
                        if (r.w >= glyphWidth && r.h >= glyphHeight) {
                            dx = r.x;
                            dy = r.y;
                            if (glyphHeight < r.h) {
                                this._unusedRects.push({
                                    x: r.x,
                                    y: r.y + glyphHeight,
                                    w: glyphWidth,
                                    h: r.h - glyphHeight,
                                });
                            }
                            r.x += glyphWidth;
                            r.w -= glyphWidth;
                            if (r.h === 0) {
                                if (i === openRegions.length - 1) {
                                    openRegions.pop();
                                }
                                else {
                                    this._unusedRects.splice(i, 1);
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
        // Create a new slab
        if (dx === undefined || dy === undefined) {
            if (!slab) {
                if (this._slabs.length >= this._slabsPerRow * this._slabsPerColumn) {
                    return undefined;
                }
                slab = {
                    x: Math.floor(this._slabs.length % this._slabsPerRow) * this._slabW,
                    y: Math.floor(this._slabs.length / this._slabsPerRow) * this._slabH,
                    entryW: desiredSlabSize.w,
                    entryH: desiredSlabSize.h,
                    count: 0,
                };
                // Track unused regions to use for small glyphs
                // +-------------+----+
                // |             |    |
                // |             |    | <- Unused W region
                // |             |    |
                // |-------------+----+
                // |                  | <- Unused H region
                // +------------------+
                const unusedW = this._slabW % slab.entryW;
                const unusedH = this._slabH % slab.entryH;
                if (unusedW) {
                    addEntryToMapArray(this._openRegionsByWidth, unusedW, {
                        x: slab.x + this._slabW - unusedW,
                        w: unusedW,
                        y: slab.y,
                        h: this._slabH - (unusedH ?? 0),
                    });
                }
                if (unusedH) {
                    addEntryToMapArray(this._openRegionsByHeight, unusedH, {
                        x: slab.x,
                        w: this._slabW,
                        y: slab.y + this._slabH - unusedH,
                        h: unusedH,
                    });
                }
                this._slabs.push(slab);
                this._activeSlabsByDims.set(slab, desiredSlabSize.w, desiredSlabSize.h);
            }
            const glyphsPerRow = Math.floor(this._slabW / slab.entryW);
            dx = slab.x + Math.floor(slab.count % glyphsPerRow) * slab.entryW;
            dy = slab.y + Math.floor(slab.count / glyphsPerRow) * slab.entryH;
            // Shift current row
            slab.count++;
        }
        // Draw glyph
        this._ctx.drawImage(rasterizedGlyph.source, 
        // source
        rasterizedGlyph.boundingBox.left, rasterizedGlyph.boundingBox.top, glyphWidth, glyphHeight, 
        // destination
        dx, dy, glyphWidth, glyphHeight);
        // Create glyph object
        const glyph = {
            pageIndex: this._textureIndex,
            glyphIndex: this._nextIndex++,
            x: dx,
            y: dy,
            w: glyphWidth,
            h: glyphHeight,
            originOffsetX: rasterizedGlyph.originOffset.x,
            originOffsetY: rasterizedGlyph.originOffset.y,
            fontBoundingBoxAscent: rasterizedGlyph.fontBoundingBoxAscent,
            fontBoundingBoxDescent: rasterizedGlyph.fontBoundingBoxDescent,
        };
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
        let slabEntryPixels = 0;
        let usedPixels = 0;
        let slabEdgePixels = 0;
        let restrictedPixels = 0;
        const slabW = 64 << (Math.floor(getActiveWindow().devicePixelRatio) - 1);
        const slabH = slabW;
        // Draw wasted underneath glyphs first
        for (const slab of this._slabs) {
            let x = 0;
            let y = 0;
            for (let i = 0; i < slab.count; i++) {
                if (x + slab.entryW > slabW) {
                    x = 0;
                    y += slab.entryH;
                }
                ctx.fillStyle = "#FF0000" /* UsagePreviewColors.Wasted */;
                ctx.fillRect(slab.x + x, slab.y + y, slab.entryW, slab.entryH);
                slabEntryPixels += slab.entryW * slab.entryH;
                x += slab.entryW;
            }
            const entriesPerRow = Math.floor(slabW / slab.entryW);
            const entriesPerCol = Math.floor(slabH / slab.entryH);
            const thisSlabPixels = slab.entryW * entriesPerRow * slab.entryH * entriesPerCol;
            slabEdgePixels += slabW * slabH - thisSlabPixels;
        }
        // Draw glyphs
        for (const g of this._allocatedGlyphs) {
            usedPixels += g.w * g.h;
            ctx.fillStyle = "#4040FF" /* UsagePreviewColors.Used */;
            ctx.fillRect(g.x, g.y, g.w, g.h);
        }
        // Draw unused space on side
        const unusedRegions = Array.from(this._openRegionsByWidth.values())
            .flat()
            .concat(Array.from(this._openRegionsByHeight.values()).flat());
        for (const r of unusedRegions) {
            ctx.fillStyle = "#FF000088" /* UsagePreviewColors.Restricted */;
            ctx.fillRect(r.x, r.y, r.w, r.h);
            restrictedPixels += r.w * r.h;
        }
        // Overlay actual glyphs on top
        ctx.globalAlpha = 0.5;
        ctx.drawImage(this._canvas, 0, 0);
        ctx.globalAlpha = 1;
        return canvas.convertToBlob();
    }
    getStats() {
        const w = this._canvas.width;
        const h = this._canvas.height;
        let slabEntryPixels = 0;
        let usedPixels = 0;
        let slabEdgePixels = 0;
        let wastedPixels = 0;
        let restrictedPixels = 0;
        const totalPixels = w * h;
        const slabW = 64 << (Math.floor(getActiveWindow().devicePixelRatio) - 1);
        const slabH = slabW;
        // Draw wasted underneath glyphs first
        for (const slab of this._slabs) {
            let x = 0;
            let y = 0;
            for (let i = 0; i < slab.count; i++) {
                if (x + slab.entryW > slabW) {
                    x = 0;
                    y += slab.entryH;
                }
                slabEntryPixels += slab.entryW * slab.entryH;
                x += slab.entryW;
            }
            const entriesPerRow = Math.floor(slabW / slab.entryW);
            const entriesPerCol = Math.floor(slabH / slab.entryH);
            const thisSlabPixels = slab.entryW * entriesPerRow * slab.entryH * entriesPerCol;
            slabEdgePixels += slabW * slabH - thisSlabPixels;
        }
        // Draw glyphs
        for (const g of this._allocatedGlyphs) {
            usedPixels += g.w * g.h;
        }
        // Draw unused space on side
        const unusedRegions = Array.from(this._openRegionsByWidth.values())
            .flat()
            .concat(Array.from(this._openRegionsByHeight.values()).flat());
        for (const r of unusedRegions) {
            restrictedPixels += r.w * r.h;
        }
        const edgeUsedPixels = slabEdgePixels - restrictedPixels;
        wastedPixels = slabEntryPixels - (usedPixels - edgeUsedPixels);
        // usedPixels += slabEdgePixels - restrictedPixels;
        const efficiency = usedPixels / (usedPixels + wastedPixels + restrictedPixels);
        return [
            `page[${this._textureIndex}]:`,
            `     Total: ${totalPixels}px (${w}x${h})`,
            `      Used: ${usedPixels}px (${((usedPixels / totalPixels) * 100).toFixed(2)}%)`,
            `    Wasted: ${wastedPixels}px (${((wastedPixels / totalPixels) * 100).toFixed(2)}%)`,
            `Restricted: ${restrictedPixels}px (${((restrictedPixels / totalPixels) * 100).toFixed(2)}%) (hard to allocate)`,
            `Efficiency: ${efficiency === 1 ? '100' : (efficiency * 100).toFixed(2)}%`,
            `     Slabs: ${this._slabs.length} of ${Math.floor(this._canvas.width / slabW) * Math.floor(this._canvas.height / slabH)}`,
        ].join('\n');
    }
}
function addEntryToMapArray(map, key, entry) {
    let list = map.get(key);
    if (!list) {
        list = [];
        map.set(key, list);
    }
    list.push(entry);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzU2xhYkFsbG9jYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9hdGxhcy90ZXh0dXJlQXRsYXNTbGFiQWxsb2NhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFhbEQ7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLE9BQU8seUJBQXlCO0lBb0JyQyxZQUNrQixPQUF3QixFQUN4QixhQUFxQixFQUN0QyxPQUEwQztRQUZ6QixZQUFPLEdBQVAsT0FBTyxDQUFpQjtRQUN4QixrQkFBYSxHQUFiLGFBQWEsQ0FBUTtRQW5CdEIsV0FBTSxHQUF3QixFQUFFLENBQUE7UUFDaEMsdUJBQWtCLEdBQWlELElBQUksT0FBTyxFQUFFLENBQUE7UUFFaEYsaUJBQVksR0FBa0MsRUFBRSxDQUFBO1FBRWhELHlCQUFvQixHQUErQyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQzVFLHdCQUFtQixHQUErQyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBRTVGLGdHQUFnRztRQUMvRSxxQkFBZ0IsR0FBMEMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQU01RSxlQUFVLEdBQUcsQ0FBQyxDQUFBO1FBT3JCLElBQUksQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRTtZQUM3QixrQkFBa0IsRUFBRSxJQUFJO1NBQ3hCLENBQUMsQ0FD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
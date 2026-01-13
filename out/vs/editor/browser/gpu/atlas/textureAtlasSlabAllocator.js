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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzU2xhYkFsbG9jYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L2F0bGFzL3RleHR1cmVBdGxhc1NsYWJBbGxvY2F0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQWFsRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBTyx5QkFBeUI7SUFvQnJDLFlBQ2tCLE9BQXdCLEVBQ3hCLGFBQXFCLEVBQ3RDLE9BQTBDO1FBRnpCLFlBQU8sR0FBUCxPQUFPLENBQWlCO1FBQ3hCLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBbkJ0QixXQUFNLEdBQXdCLEVBQUUsQ0FBQTtRQUNoQyx1QkFBa0IsR0FBaUQsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUVoRixpQkFBWSxHQUFrQyxFQUFFLENBQUE7UUFFaEQseUJBQW9CLEdBQStDLElBQUksR0FBRyxFQUFFLENBQUE7UUFDNUUsd0JBQW1CLEdBQStDLElBQUksR0FBRyxFQUFFLENBQUE7UUFFNUYsZ0dBQWdHO1FBQy9FLHFCQUFnQixHQUEwQyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBTTVFLGVBQVUsR0FBRyxDQUFDLENBQUE7UUFPckIsSUFBSSxDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFO1lBQzdCLGtCQUFrQixF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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { memoize } from '../../../../base/common/decorators.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { StringBuilder } from '../../../common/core/stringBuilder.js';
import { TokenMetadata } from '../../../common/encodedTokenAttributes.js';
import { ensureNonNullable } from '../gpuUtils.js';
import { ViewGpuContext } from '../viewGpuContext.js';
let nextId = 0;
export class GlyphRasterizer extends Disposable {
    get cacheKey() {
        return `${this.fontFamily}_${this.fontSize}px`;
    }
    constructor(fontSize, fontFamily, devicePixelRatio) {
        super();
        this.fontSize = fontSize;
        this.fontFamily = fontFamily;
        this.devicePixelRatio = devicePixelRatio;
        this.id = nextId++;
        this._workGlyph = {
            source: null,
            boundingBox: {
                left: 0,
                bottom: 0,
                right: 0,
                top: 0,
            },
            originOffset: {
                x: 0,
                y: 0,
            },
            fontBoundingBoxAscent: 0,
            fontBoundingBoxDescent: 0,
        };
        this._workGlyphConfig = { chars: undefined, tokenMetadata: 0, decorationStyleSetId: 0 };
        // TODO: Support workbench.fontAliasing correctly
        this._antiAliasing = isMacintosh ? 'greyscale' : 'subpixel';
        const devicePixelFontSize = Math.ceil(this.fontSize * devicePixelRatio);
        this._canvas = new OffscreenCanvas(devicePixelFontSize * 3, devicePixelFontSize * 3);
        this._ctx = ensureNonNullable(this._canvas.getContext('2d', {
            willReadFrequently: true,
            alpha: this._antiAliasing === 'greyscale',
        }));
        this._ctx.textBaseline = 'top';
        this._ctx.fillStyle = '#FFFFFF';
        this._ctx.font = `${devicePixelFontSize}px ${this.fontFamily}`;
        this._textMetrics = this._ctx.measureText('A');
    }
    /**
     * Rasterizes a glyph. Note that the returned object is reused across different glyphs and
     * therefore is only safe for synchronous access.
     */
    rasterizeGlyph(chars, tokenMetadata, decorationStyleSetId, colorMap) {
        if (chars === '') {
            return {
                source: this._canvas,
                boundingBox: { top: 0, left: 0, bottom: -1, right: -1 },
                originOffset: { x: 0, y: 0 },
                fontBoundingBoxAscent: 0,
                fontBoundingBoxDescent: 0,
            };
        }
        // Check if the last glyph matches the config, reuse if so. This helps avoid unnecessary
        // work when the rasterizer is called multiple times like when the glyph doesn't fit into a
        // page.
        if (this._workGlyphConfig.chars === chars &&
            this._workGlyphConfig.tokenMetadata === tokenMetadata &&
            this._workGlyphConfig.decorationStyleSetId === decorationStyleSetId) {
            return this._workGlyph;
        }
        this._workGlyphConfig.chars = chars;
        this._workGlyphConfig.tokenMetadata = tokenMetadata;
        this._workGlyphConfig.decorationStyleSetId = decorationStyleSetId;
        return this._rasterizeGlyph(chars, tokenMetadata, decorationStyleSetId, colorMap);
    }
    _rasterizeGlyph(chars, tokenMetadata, decorationStyleSetId, colorMap) {
        const devicePixelFontSize = Math.ceil(this.fontSize * this.devicePixelRatio);
        const canvasDim = devicePixelFontSize * 3;
        if (this._canvas.width !== canvasDim) {
            this._canvas.width = canvasDim;
            this._canvas.height = canvasDim;
        }
        this._ctx.save();
        // The sub-pixel x offset is the fractional part of the x pixel coordinate of the cell, this
        // is used to improve the spacing between rendered characters.
        const xSubPixelXOffset = (tokenMetadata & 0b1111) / 10;
        const bgId = TokenMetadata.getBackground(tokenMetadata);
        const bg = colorMap[bgId];
        const decorationStyleSet = ViewGpuContext.decorationStyleCache.getStyleSet(decorationStyleSetId);
        // When SPAA is used, the background color must be present to get the right glyph
        if (this._antiAliasing === 'subpixel') {
            this._ctx.fillStyle = bg;
            this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
        }
        else {
            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        }
        const fontSb = new StringBuilder(200);
        const fontStyle = TokenMetadata.getFontStyle(tokenMetadata);
        if (fontStyle & 1 /* FontStyle.Italic */) {
            fontSb.appendString('italic ');
        }
        if (decorationStyleSet?.bold !== undefined) {
            if (decorationStyleSet.bold) {
                fontSb.appendString('bold ');
            }
        }
        else if (fontStyle & 2 /* FontStyle.Bold */) {
            fontSb.appendString('bold ');
        }
        fontSb.appendString(`${devicePixelFontSize}px ${this.fontFamily}`);
        this._ctx.font = fontSb.build();
        // TODO: Support FontStyle.Strikethrough and FontStyle.Underline text decorations, these
        //       need to be drawn manually to the canvas. See xterm.js for "dodging" the text for
        //       underlines.
        const originX = devicePixelFontSize;
        const originY = devicePixelFontSize;
        if (decorationStyleSet?.color !== undefined) {
            this._ctx.fillStyle = `#${decorationStyleSet.color.toString(16).padStart(8, '0')}`;
        }
        else {
            this._ctx.fillStyle = colorMap[TokenMetadata.getForeground(tokenMetadata)];
        }
        this._ctx.textBaseline = 'top';
        if (decorationStyleSet?.opacity !== undefined) {
            this._ctx.globalAlpha = decorationStyleSet.opacity;
        }
        this._ctx.fillText(chars, originX + xSubPixelXOffset, originY);
        this._ctx.restore();
        const imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
        if (this._antiAliasing === 'subpixel') {
            const bgR = parseInt(bg.substring(1, 3), 16);
            const bgG = parseInt(bg.substring(3, 5), 16);
            const bgB = parseInt(bg.substring(5, 7), 16);
            this._clearColor(imageData, bgR, bgG, bgB);
            this._ctx.putImageData(imageData, 0, 0);
        }
        this._findGlyphBoundingBox(imageData, this._workGlyph.boundingBox);
        // const offset = {
        // 	x: textMetrics.actualBoundingBoxLeft,
        // 	y: textMetrics.actualBoundingBoxAscent
        // };
        // const size = {
        // 	w: textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft,
        // 	y: textMetrics.actualBoundingBoxDescent + textMetrics.actualBoundingBoxAscent,
        // 	wInt: Math.ceil(textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft),
        // 	yInt: Math.ceil(textMetrics.actualBoundingBoxDescent + textMetrics.actualBoundingBoxAscent),
        // };
        // console.log(`${chars}_${fg}`, textMetrics, boundingBox, originX, originY, { width: boundingBox.right - boundingBox.left, height: boundingBox.bottom - boundingBox.top });
        this._workGlyph.source = this._canvas;
        this._workGlyph.originOffset.x = this._workGlyph.boundingBox.left - originX;
        this._workGlyph.originOffset.y = this._workGlyph.boundingBox.top - originY;
        this._workGlyph.fontBoundingBoxAscent = this._textMetrics.fontBoundingBoxAscent;
        this._workGlyph.fontBoundingBoxDescent = this._textMetrics.fontBoundingBoxDescent;
        // const result2: IRasterizedGlyph = {
        // 	source: this._canvas,
        // 	boundingBox: {
        // 		left: Math.floor(originX - textMetrics.actualBoundingBoxLeft),
        // 		right: Math.ceil(originX + textMetrics.actualBoundingBoxRight),
        // 		top: Math.floor(originY - textMetrics.actualBoundingBoxAscent),
        // 		bottom: Math.ceil(originY + textMetrics.actualBoundingBoxDescent),
        // 	},
        // 	originOffset: {
        // 		x: Math.floor(boundingBox.left - originX),
        // 		y: Math.floor(boundingBox.top - originY)
        // 	}
        // };
        // TODO: Verify result 1 and 2 are the same
        // if (result2.boundingBox.left > result.boundingBox.left) {
        // 	debugger;
        // }
        // if (result2.boundingBox.top > result.boundingBox.top) {
        // 	debugger;
        // }
        // if (result2.boundingBox.right < result.boundingBox.right) {
        // 	debugger;
        // }
        // if (result2.boundingBox.bottom < result.boundingBox.bottom) {
        // 	debugger;
        // }
        // if (JSON.stringify(result2.originOffset) !== JSON.stringify(result.originOffset)) {
        // 	debugger;
        // }
        return this._workGlyph;
    }
    _clearColor(imageData, r, g, b) {
        for (let offset = 0; offset < imageData.data.length; offset += 4) {
            // Check exact match
            if (imageData.data[offset] === r &&
                imageData.data[offset + 1] === g &&
                imageData.data[offset + 2] === b) {
                imageData.data[offset + 3] = 0;
            }
        }
    }
    // TODO: Does this even need to happen when measure text is used?
    _findGlyphBoundingBox(imageData, outBoundingBox) {
        const height = this._canvas.height;
        const width = this._canvas.width;
        let found = false;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alphaOffset = y * width * 4 + x * 4 + 3;
                if (imageData.data[alphaOffset] !== 0) {
                    outBoundingBox.top = y;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
        outBoundingBox.left = 0;
        found = false;
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const alphaOffset = y * width * 4 + x * 4 + 3;
                if (imageData.data[alphaOffset] !== 0) {
                    outBoundingBox.left = x;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
        outBoundingBox.right = width;
        found = false;
        for (let x = width - 1; x >= outBoundingBox.left; x--) {
            for (let y = 0; y < height; y++) {
                const alphaOffset = y * width * 4 + x * 4 + 3;
                if (imageData.data[alphaOffset] !== 0) {
                    outBoundingBox.right = x;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
        outBoundingBox.bottom = outBoundingBox.top;
        found = false;
        for (let y = height - 1; y >= 0; y--) {
            for (let x = 0; x < width; x++) {
                const alphaOffset = y * width * 4 + x * 4 + 3;
                if (imageData.data[alphaOffset] !== 0) {
                    outBoundingBox.bottom = y;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
    }
    getTextMetrics(text) {
        return this._ctx.measureText(text);
    }
}
__decorate([
    memoize
], GlyphRasterizer.prototype, "cacheKey", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x5cGhSYXN0ZXJpemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L3Jhc3Rlci9nbHlwaFJhc3Rlcml6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3JFLE9BQU8sRUFBYSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFHckQsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO0FBRWQsTUFBTSxPQUFPLGVBQWdCLFNBQVEsVUFBVTtJQUk5QyxJQUFXLFFBQVE7UUFDbEIsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFBO0lBQy9DLENBQUM7SUErQkQsWUFDVSxRQUFnQixFQUNoQixVQUFrQixFQUNsQixnQkFBd0I7UUFFakMsS0FBSyxFQUFFLENBQUE7UUFKRSxhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFRO1FBdkNsQixPQUFFLEdBQUcsTUFBTSxFQUFFLENBQUE7UUFZckIsZUFBVSxHQUFxQjtZQUN0QyxNQUFNLEVBQUUsSUFBSztZQUNiLFdBQVcsRUFBRTtnQkFDWixJQUFJ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
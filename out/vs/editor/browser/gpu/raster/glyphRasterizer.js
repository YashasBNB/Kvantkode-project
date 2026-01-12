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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x5cGhSYXN0ZXJpemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvcmFzdGVyL2dseXBoUmFzdGVyaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDckUsT0FBTyxFQUFhLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUdyRCxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUE7QUFFZCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxVQUFVO0lBSTlDLElBQVcsUUFBUTtRQUNsQixPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUE7SUFDL0MsQ0FBQztJQStCRCxZQUNVLFFBQWdCLEVBQ2hCLFVBQWtCLEVBQ2xCLGdCQUF3QjtRQUVqQyxLQUFLLEVBQUUsQ0FBQTtRQUpFLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNsQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVE7UUF2Q2xCLE9BQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQTtRQVlyQixlQUFVLEdBQXFCO1lBQ3RDLE1BQU0sRUFBRSxJQUFLO1lBQ2IsV0FBVyxFQUFFO2dCQUNa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
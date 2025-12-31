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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TextureAtlasPage_1;
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { NKeyMap } from '../../../../base/common/map.js';
import { ILogService, LogLevel } from '../../../../platform/log/common/log.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { TextureAtlasShelfAllocator } from './textureAtlasShelfAllocator.js';
import { TextureAtlasSlabAllocator } from './textureAtlasSlabAllocator.js';
let TextureAtlasPage = class TextureAtlasPage extends Disposable {
    static { TextureAtlasPage_1 = this; }
    get version() {
        return this._version;
    }
    /**
     * The maximum number of glyphs that can be drawn to the page. This is currently a hard static
     * cap that must not be reached as it will cause the GPU buffer to overflow.
     */
    static { this.maximumGlyphCount = 5_000; }
    get usedArea() {
        return this._usedArea;
    }
    get source() {
        return this._canvas;
    }
    get glyphs() {
        return this._glyphInOrderSet.values();
    }
    constructor(textureIndex, pageSize, allocatorType, _logService, themeService) {
        super();
        this._logService = _logService;
        this._version = 0;
        this._usedArea = { left: 0, top: 0, right: 0, bottom: 0 };
        this._glyphMap = new NKeyMap();
        this._glyphInOrderSet = new Set();
        this._canvas = new OffscreenCanvas(pageSize, pageSize);
        this._colorMap = themeService.getColorTheme().tokenColorMap;
        switch (allocatorType) {
            case 'shelf':
                this._allocator = new TextureAtlasShelfAllocator(this._canvas, textureIndex);
                break;
            case 'slab':
                this._allocator = new TextureAtlasSlabAllocator(this._canvas, textureIndex);
                break;
            default:
                this._allocator = allocatorType(this._canvas, textureIndex);
                break;
        }
        // Reduce impact of a memory leak if this object is not released
        this._register(toDisposable(() => {
            this._canvas.width = 1;
            this._canvas.height = 1;
        }));
    }
    getGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId) {
        // IMPORTANT: There are intentionally no intermediate variables here to aid in runtime
        // optimization as it's a very hot function
        return (this._glyphMap.get(chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey) ??
            this._createGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId));
    }
    _createGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId) {
        // Ensure the glyph can fit on the page
        if (this._glyphInOrderSet.size >= TextureAtlasPage_1.maximumGlyphCount) {
            return undefined;
        }
        // Rasterize and allocate the glyph
        const rasterizedGlyph = rasterizer.rasterizeGlyph(chars, tokenMetadata, decorationStyleSetId, this._colorMap);
        const glyph = this._allocator.allocate(rasterizedGlyph);
        // Ensure the glyph was allocated
        if (glyph === undefined) {
            // TODO: undefined here can mean the glyph was too large for a slab on the page, this
            // can lead to big problems if we don't handle it properly https://github.com/microsoft/vscode/issues/232984
            return undefined;
        }
        // Save the glyph
        this._glyphMap.set(glyph, chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey);
        this._glyphInOrderSet.add(glyph);
        // Update page version and it's tracked used area
        this._version++;
        this._usedArea.right = Math.max(this._usedArea.right, glyph.x + glyph.w - 1);
        this._usedArea.bottom = Math.max(this._usedArea.bottom, glyph.y + glyph.h - 1);
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace('New glyph', {
                chars,
                tokenMetadata,
                decorationStyleSetId,
                rasterizedGlyph,
                glyph,
            });
        }
        return glyph;
    }
    getUsagePreview() {
        return this._allocator.getUsagePreview();
    }
    getStats() {
        return this._allocator.getStats();
    }
};
TextureAtlasPage = TextureAtlasPage_1 = __decorate([
    __param(3, ILogService),
    __param(4, IThemeService)
], TextureAtlasPage);
export { TextureAtlasPage };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzUGFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9hdGxhcy90ZXh0dXJlQXRsYXNQYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQVFqRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU9uRSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7O0lBRS9DLElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBRUQ7OztPQUdHO2FBQ2Esc0JBQWlCLEdBQUcsS0FBSyxBQUFSLENBQVE7SUFHekMsSUFBVyxRQUFRO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBR0QsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7SUFJRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUN0QyxDQUFDO0lBS0QsWUFDQyxZQUFvQixFQUNwQixRQUFnQixFQUNoQixhQUE0QixFQUNmLFdBQXlDLEVBQ3ZDLFlBQTJCO1FBRTFDLEtB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
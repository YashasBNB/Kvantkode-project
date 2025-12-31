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
var TextureAtlas_1;
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, dispose, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { NKeyMap } from '../../../../base/common/map.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { GlyphRasterizer } from '../raster/glyphRasterizer.js';
import { IdleTaskQueue } from '../taskQueue.js';
import { TextureAtlasPage } from './textureAtlasPage.js';
let TextureAtlas = class TextureAtlas extends Disposable {
    static { TextureAtlas_1 = this; }
    /**
     * The maximum number of texture atlas pages. This is currently a hard static cap that must not
     * be reached.
     */
    static { this.maximumPageCount = 16; }
    get pages() {
        return this._pages;
    }
    constructor(
    /** The maximum texture size supported by the GPU. */
    _maxTextureSize, options, _themeService, _instantiationService) {
        super();
        this._maxTextureSize = _maxTextureSize;
        this._themeService = _themeService;
        this._instantiationService = _instantiationService;
        this._warmUpTask = this._register(new MutableDisposable());
        this._warmedUpRasterizers = new Set();
        /**
         * The main texture atlas pages which are both larger textures and more efficiently packed
         * relative to the scratch page. The idea is the main pages are drawn to and uploaded to the GPU
         * much less frequently so as to not drop frames.
         */
        this._pages = [];
        /**
         * A maps of glyph keys to the page to start searching for the glyph. This is set before
         * searching to have as little runtime overhead (branching, intermediate variables) as possible,
         * so it is not guaranteed to be the actual page the glyph is on. But it is guaranteed that all
         * pages with a lower index do not contain the glyph.
         */
        this._glyphPageIndex = new NKeyMap();
        this._onDidDeleteGlyphs = this._register(new Emitter());
        this.onDidDeleteGlyphs = this._onDidDeleteGlyphs.event;
        this._allocatorType = options?.allocatorType ?? 'slab';
        this._register(Event.runAndSubscribe(this._themeService.onDidColorThemeChange, () => {
            if (this._colorMap) {
                this.clear();
            }
            this._colorMap = this._themeService.getColorTheme().tokenColorMap;
        }));
        const dprFactor = Math.max(1, Math.floor(getActiveWindow().devicePixelRatio));
        this.pageSize = Math.min(1024 * dprFactor, this._maxTextureSize);
        this._initFirstPage();
        this._register(toDisposable(() => dispose(this._pages)));
    }
    _initFirstPage() {
        const firstPage = this._instantiationService.createInstance(TextureAtlasPage, 0, this.pageSize, this._allocatorType);
        this._pages.push(firstPage);
        // IMPORTANT: The first glyph on the first page must be an empty glyph such that zeroed out
        // cells end up rendering nothing
        // TODO: This currently means the first slab is for 0x0 glyphs and is wasted
        const nullRasterizer = new GlyphRasterizer(1, '', 1);
        firstPage.getGlyph(nullRasterizer, '', 0, 0);
        nullRasterizer.dispose();
    }
    clear() {
        // Clear all pages
        for (const page of this._pages) {
            page.dispose();
        }
        this._pages.length = 0;
        this._glyphPageIndex.clear();
        this._warmedUpRasterizers.clear();
        this._warmUpTask.clear();
        // Recreate first
        this._initFirstPage();
        // Tell listeners
        this._onDidDeleteGlyphs.fire();
    }
    getGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId, x) {
        // TODO: Encode font size and family into key
        // Ignore metadata that doesn't affect the glyph
        tokenMetadata &= ~(255 /* MetadataConsts.LANGUAGEID_MASK */ |
            768 /* MetadataConsts.TOKEN_TYPE_MASK */ |
            1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */);
        // Add x offset for sub-pixel rendering to the unused portion or tokenMetadata. This
        // converts the decimal part of the x to a range from 0 to 9, where 0 = 0.0px x offset,
        // 9 = 0.9px x offset
        tokenMetadata |= Math.floor((x % 1) * 10);
        // Warm up common glyphs
        if (!this._warmedUpRasterizers.has(rasterizer.id)) {
            this._warmUpAtlas(rasterizer);
            this._warmedUpRasterizers.add(rasterizer.id);
        }
        // Try get the glyph, overflowing to a new page if necessary
        return this._tryGetGlyph(this._glyphPageIndex.get(chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey) ??
            0, rasterizer, chars, tokenMetadata, decorationStyleSetId);
    }
    _tryGetGlyph(pageIndex, rasterizer, chars, tokenMetadata, decorationStyleSetId) {
        this._glyphPageIndex.set(pageIndex, chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey);
        return (this._pages[pageIndex].getGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId) ??
            (pageIndex + 1 < this._pages.length
                ? this._tryGetGlyph(pageIndex + 1, rasterizer, chars, tokenMetadata, decorationStyleSetId)
                : undefined) ??
            this._getGlyphFromNewPage(rasterizer, chars, tokenMetadata, decorationStyleSetId));
    }
    _getGlyphFromNewPage(rasterizer, chars, tokenMetadata, decorationStyleSetId) {
        if (this._pages.length >= TextureAtlas_1.maximumPageCount) {
            throw new Error(`Attempt to create a texture atlas page past the limit ${TextureAtlas_1.maximumPageCount}`);
        }
        this._pages.push(this._instantiationService.createInstance(TextureAtlasPage, this._pages.length, this.pageSize, this._allocatorType));
        this._glyphPageIndex.set(this._pages.length - 1, chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey);
        return this._pages[this._pages.length - 1].getGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId);
    }
    getUsagePreview() {
        return Promise.all(this._pages.map((e) => e.getUsagePreview()));
    }
    getStats() {
        return this._pages.map((e) => e.getStats());
    }
    /**
     * Warms up the atlas by rasterizing all printable ASCII characters for each token color. This
     * is distrubuted over multiple idle callbacks to avoid blocking the main thread.
     */
    _warmUpAtlas(rasterizer) {
        const colorMap = this._colorMap;
        if (!colorMap) {
            throw new BugIndicatingError('Cannot warm atlas without color map');
        }
        this._warmUpTask.value?.clear();
        const taskQueue = (this._warmUpTask.value = new IdleTaskQueue());
        // Warm up using roughly the larger glyphs first to help optimize atlas allocation
        // A-Z
        for (let code = 65 /* CharCode.A */; code <= 90 /* CharCode.Z */; code++) {
            for (const fgColor of colorMap.keys()) {
                taskQueue.enqueue(() => {
                    for (let x = 0; x < 1; x += 0.1) {
                        this.getGlyph(rasterizer, String.fromCharCode(code), (fgColor << 15 /* MetadataConsts.FOREGROUND_OFFSET */) & 16744448 /* MetadataConsts.FOREGROUND_MASK */, 0, x);
                    }
                });
            }
        }
        // a-z
        for (let code = 97 /* CharCode.a */; code <= 122 /* CharCode.z */; code++) {
            for (const fgColor of colorMap.keys()) {
                taskQueue.enqueue(() => {
                    for (let x = 0; x < 1; x += 0.1) {
                        this.getGlyph(rasterizer, String.fromCharCode(code), (fgColor << 15 /* MetadataConsts.FOREGROUND_OFFSET */) & 16744448 /* MetadataConsts.FOREGROUND_MASK */, 0, x);
                    }
                });
            }
        }
        // Remaining ascii
        for (let code = 33 /* CharCode.ExclamationMark */; code <= 126 /* CharCode.Tilde */; code++) {
            for (const fgColor of colorMap.keys()) {
                taskQueue.enqueue(() => {
                    for (let x = 0; x < 1; x += 0.1) {
                        this.getGlyph(rasterizer, String.fromCharCode(code), (fgColor << 15 /* MetadataConsts.FOREGROUND_OFFSET */) & 16744448 /* MetadataConsts.FOREGROUND_MASK */, 0, x);
                    }
                });
            }
        }
    }
};
TextureAtlas = TextureAtlas_1 = __decorate([
    __param(2, IThemeService),
    __param(3, IInstantiationService)
], TextureAtlas);
export { TextureAtlas };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L2F0bGFzL3RleHR1cmVBdGxhcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsRUFDVixPQUFPLEVBQ1AsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRTlELE9BQU8sRUFBRSxhQUFhLEVBQW1CLE1BQU0saUJBQWlCLENBQUE7QUFFaEUsT0FBTyxFQUFpQixnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBTWhFLElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQWEsU0FBUSxVQUFVOztJQVEzQzs7O09BR0c7YUFDYSxxQkFBZ0IsR0FBRyxFQUFFLEFBQUwsQ0FBSztJQVFyQyxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQWVEO0lBQ0MscURBQXFEO0lBQ3BDLGVBQXVCLEVBQ3hDLE9BQXlDLEVBQzFCLGFBQTZDLEVBQ3JDLHFCQUE2RDtRQUVw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
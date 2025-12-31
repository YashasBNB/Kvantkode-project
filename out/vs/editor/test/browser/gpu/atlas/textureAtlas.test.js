/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, throws } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ensureNonNullable } from '../../../../browser/gpu/gpuUtils.js';
import { TextureAtlas } from '../../../../browser/gpu/atlas/textureAtlas.js';
import { createCodeEditorServices } from '../../testCodeEditor.js';
import { assertIsValidGlyph } from './testUtil.js';
import { TextureAtlasSlabAllocator } from '../../../../browser/gpu/atlas/textureAtlasSlabAllocator.js';
const blackInt = 0x000000ff;
const nullCharMetadata = 0x0;
let lastUniqueGlyph;
function getUniqueGlyphId() {
    if (!lastUniqueGlyph) {
        lastUniqueGlyph = 'a';
    }
    else {
        lastUniqueGlyph = String.fromCharCode(lastUniqueGlyph.charCodeAt(0) + 1);
    }
    return [lastUniqueGlyph, blackInt, nullCharMetadata, 0];
}
class TestGlyphRasterizer {
    constructor() {
        this.id = 0;
        this.cacheKey = '';
        this.nextGlyphColor = [0, 0, 0, 0];
        this.nextGlyphDimensions = [0, 0];
    }
    rasterizeGlyph(chars, tokenMetadata, charMetadata, colorMap) {
        const w = this.nextGlyphDimensions[0];
        const h = this.nextGlyphDimensions[1];
        if (w === 0 || h === 0) {
            throw new Error('TestGlyphRasterizer.nextGlyphDimensions must be set to a non-zero value before calling rasterizeGlyph');
        }
        const imageData = new ImageData(w, h);
        let i = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const [r, g, b, a] = this.nextGlyphColor;
                i = (y * w + x) * 4;
                imageData.data[i + 0] = r;
                imageData.data[i + 1] = g;
                imageData.data[i + 2] = b;
                imageData.data[i + 3] = a;
            }
        }
        const canvas = new OffscreenCanvas(w, h);
        const ctx = ensureNonNullable(canvas.getContext('2d'));
        ctx.putImageData(imageData, 0, 0);
        return {
            source: canvas,
            boundingBox: { top: 0, left: 0, bottom: h - 1, right: w - 1 },
            originOffset: { x: 0, y: 0 },
            fontBoundingBoxAscent: 0,
            fontBoundingBoxDescent: 0,
        };
    }
    getTextMetrics(text) {
        return null;
    }
}
suite('TextureAtlas', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        lastUniqueGlyph = undefined;
    });
    let instantiationService;
    let atlas;
    let glyphRasterizer;
    setup(() => {
        instantiationService = createCodeEditorServices(store);
        atlas = store.add(instantiationService.createInstance(TextureAtlas, 2, undefined));
        glyphRasterizer = new TestGlyphRasterizer();
        glyphRasterizer.nextGlyphDimensions = [1, 1];
        glyphRasterizer.nextGlyphColor = [0, 0, 0, 0xff];
    });
    test('get single glyph', () => {
        assertIsValidGlyph(atlas.getGlyph(glyphRasterizer, ...getUniqueGlyphId()), atlas);
    });
    test('get multiple glyphs', () => {
        atlas = store.add(instantiationService.createInstance(TextureAtlas, 32, undefined));
        for (let i = 0; i < 10; i++) {
            assertIsValidGlyph(atlas.getGlyph(glyphRasterizer, ...getUniqueGlyphId()), atlas);
        }
    });
    test('adding glyph to full page creates new page', () => {
        let pageCount;
        for (let i = 0; i < 4; i++) {
            assertIsValidGlyph(atlas.getGlyph(glyphRasterizer, ...getUniqueGlyphId()), atlas);
            if (pageCount === undefined) {
                pageCount = atlas.pages.length;
            }
            else {
                strictEqual(atlas.pages.length, pageCount, 'the number of pages should not change when the page is being filled');
            }
        }
        assertIsValidGlyph(atlas.getGlyph(glyphRasterizer, ...getUniqueGlyphId()), atlas);
        strictEqual(atlas.pages.length, pageCount + 1, 'the 5th glyph should overflow to a new page');
    });
    test('adding a glyph larger than the atlas', () => {
        glyphRasterizer.nextGlyphDimensions = [3, 2];
        throws(() => atlas.getGlyph(glyphRasterizer, ...getUniqueGlyphId()), 'should throw when the glyph is too large, this should not happen in practice');
    });
    test('adding a glyph larger than the standard slab size', () => {
        glyphRasterizer.nextGlyphDimensions = [2, 2];
        atlas = store.add(instantiationService.createInstance(TextureAtlas, 32, {
            allocatorType: (canvas, textureIndex) => new TextureAtlasSlabAllocator(canvas, textureIndex, { slabW: 1, slabH: 1 }),
        }));
        assertIsValidGlyph(atlas.getGlyph(glyphRasterizer, ...getUniqueGlyphId()), atlas);
    });
    test('adding a non-first glyph larger than the standard slab size, causing an overflow to a new page', () => {
        atlas = store.add(instantiationService.createInstance(TextureAtlas, 2, {
            allocatorType: (canvas, textureIndex) => new TextureAtlasSlabAllocator(canvas, textureIndex, { slabW: 1, slabH: 1 }),
        }));
        assertIsValidGlyph(atlas.getGlyph(glyphRasterizer, ...getUniqueGlyphId()), atlas);
        strictEqual(atlas.pages.length, 1);
        glyphRasterizer.nextGlyphDimensions = [2, 2];
        assertIsValidGlyph(atlas.getGlyph(glyphRasterizer, ...getUniqueGlyphId()), atlas);
        strictEqual(atlas.pages.length, 2, 'the 2nd glyph should overflow to a new page with a larger slab size');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2dwdS9hdGxhcy90ZXh0dXJlQXRsYXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ2xELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRXRHLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQTtBQUMzQixNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQTtBQUU1QixJQUFJLGVBQW1DLENBQUE7QUFDdkMsU0FBUyxnQkFBZ0I7SUFNeEIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3RCLGVBQWUsR0FBRyxHQUFHLENBQUE7SUFDdEIsQ0FBQztTQUFNLENBQUM7UUFDUCxlQUFlLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFDRCxPQUFPLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUN4RCxDQUFDO0FBRUQsTUFBTSxtQkFBbUI7SUFBekI7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
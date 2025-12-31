/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fail, ok } from 'assert';
import { TextureAtlas } from '../../../../browser/gpu/atlas/textureAtlas.js';
import { isNumber } from '../../../../../base/common/types.js';
import { ensureNonNullable } from '../../../../browser/gpu/gpuUtils.js';
export function assertIsValidGlyph(glyph, atlasOrSource) {
    if (glyph === undefined) {
        fail('glyph is undefined');
    }
    const pageW = atlasOrSource instanceof TextureAtlas ? atlasOrSource.pageSize : atlasOrSource.width;
    const pageH = atlasOrSource instanceof TextureAtlas ? atlasOrSource.pageSize : atlasOrSource.width;
    const source = atlasOrSource instanceof TextureAtlas
        ? atlasOrSource.pages[glyph.pageIndex].source
        : atlasOrSource;
    // (x,y) are valid coordinates
    ok(isNumber(glyph.x));
    ok(glyph.x >= 0);
    ok(glyph.x < pageW);
    ok(isNumber(glyph.y));
    ok(glyph.y >= 0);
    ok(glyph.y < pageH);
    // (w,h) are valid dimensions
    ok(isNumber(glyph.w));
    ok(glyph.w > 0);
    ok(glyph.w <= pageW);
    ok(isNumber(glyph.h));
    ok(glyph.h > 0);
    ok(glyph.h <= pageH);
    // (originOffsetX, originOffsetY) are valid offsets
    ok(isNumber(glyph.originOffsetX));
    ok(isNumber(glyph.originOffsetY));
    // (x,y) + (w,h) are within the bounds of the atlas
    ok(glyph.x + glyph.w <= pageW);
    ok(glyph.y + glyph.h <= pageH);
    // Each of the glyph's outer pixel edges contain at least 1 non-transparent pixel
    const ctx = ensureNonNullable(source.getContext('2d'));
    const edges = [
        ctx.getImageData(glyph.x, glyph.y, glyph.w, 1).data,
        ctx.getImageData(glyph.x, glyph.y + glyph.h - 1, glyph.w, 1).data,
        ctx.getImageData(glyph.x, glyph.y, 1, glyph.h).data,
        ctx.getImageData(glyph.x + glyph.w - 1, glyph.y, 1, glyph.h).data,
    ];
    for (const edge of edges) {
        ok(edge.some((color) => (color & 0xff) !== 0));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2dwdS9hdGxhcy90ZXN0VXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUVqQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXZFLE1BQU0sVUFBVSxrQkFBa0IsQ0FDakMsS0FBbUQsRUFDbkQsYUFBNkM7SUFFN0MsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUNELE1BQU0sS0FBSyxHQUFHLGFBQWEsWUFBWSxZQUFZLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUE7SUFDbEcsTUFBTSxLQUFLLEdBQUcsYUFBYSxZQUFZLFlBQVksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQTtJQUNsRyxNQUFNLE1BQU0sR0FDWCxhQUFhLFlBQVksWUFBWTtRQUNwQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTTtRQUM3QyxDQUFDLENBQUMsYUFBYSxDQUFBO0lBRWpCLDhCQUE4QjtJQUM5QixFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lB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
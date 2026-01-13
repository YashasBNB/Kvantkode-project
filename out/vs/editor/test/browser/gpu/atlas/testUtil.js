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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvZ3B1L2F0bGFzL3Rlc3RVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBRWpDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFdkUsTUFBTSxVQUFVLGtCQUFrQixDQUNqQyxLQUFtRCxFQUNuRCxhQUE2QztJQUU3QyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBQ0QsTUFBTSxLQUFLLEdBQUcsYUFBYSxZQUFZLFlBQVksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQTtJQUNsRyxNQUFNLEtBQUssR0FBRyxhQUFhLFlBQVksWUFBWSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFBO0lBQ2xHLE1BQU0sTUFBTSxHQUNYLGFBQWEsWUFBWSxZQUFZO1FBQ3BDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNO1FBQzdDLENBQUMsQ0FBQyxhQUFhLENBQUE7SUFFakIsOEJBQThCO0lBQzlCLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFD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
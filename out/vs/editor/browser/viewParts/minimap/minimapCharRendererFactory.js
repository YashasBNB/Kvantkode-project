/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MinimapCharRenderer } from './minimapCharRenderer.js';
import { allCharCodes } from './minimapCharSheet.js';
import { prebakedMiniMaps } from './minimapPreBaked.js';
import { toUint8 } from '../../../../base/common/uint.js';
/**
 * Creates character renderers. It takes a 'scale' that determines how large
 * characters should be drawn. Using this, it draws data into a canvas and
 * then downsamples the characters as necessary for the current display.
 * This makes rendering more efficient, rather than drawing a full (tiny)
 * font, or downsampling in real-time.
 */
export class MinimapCharRendererFactory {
    /**
     * Creates a new character renderer factory with the given scale.
     */
    static create(scale, fontFamily) {
        // renderers are immutable. By default we'll 'create' a new minimap
        // character renderer whenever we switch editors, no need to do extra work.
        if (this.lastCreated &&
            scale === this.lastCreated.scale &&
            fontFamily === this.lastFontFamily) {
            return this.lastCreated;
        }
        let factory;
        if (prebakedMiniMaps[scale]) {
            factory = new MinimapCharRenderer(prebakedMiniMaps[scale](), scale);
        }
        else {
            factory = MinimapCharRendererFactory.createFromSampleData(MinimapCharRendererFactory.createSampleData(fontFamily).data, scale);
        }
        this.lastFontFamily = fontFamily;
        this.lastCreated = factory;
        return factory;
    }
    /**
     * Creates the font sample data, writing to a canvas.
     */
    static createSampleData(fontFamily) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.style.height = `${16 /* Constants.SAMPLED_CHAR_HEIGHT */}px`;
        canvas.height = 16 /* Constants.SAMPLED_CHAR_HEIGHT */;
        canvas.width = 96 /* Constants.CHAR_COUNT */ * 10 /* Constants.SAMPLED_CHAR_WIDTH */;
        canvas.style.width = 96 /* Constants.CHAR_COUNT */ * 10 /* Constants.SAMPLED_CHAR_WIDTH */ + 'px';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${16 /* Constants.SAMPLED_CHAR_HEIGHT */}px ${fontFamily}`;
        ctx.textBaseline = 'middle';
        let x = 0;
        for (const code of allCharCodes) {
            ctx.fillText(String.fromCharCode(code), x, 16 /* Constants.SAMPLED_CHAR_HEIGHT */ / 2);
            x += 10 /* Constants.SAMPLED_CHAR_WIDTH */;
        }
        return ctx.getImageData(0, 0, 96 /* Constants.CHAR_COUNT */ * 10 /* Constants.SAMPLED_CHAR_WIDTH */, 16 /* Constants.SAMPLED_CHAR_HEIGHT */);
    }
    /**
     * Creates a character renderer from the canvas sample data.
     */
    static createFromSampleData(source, scale) {
        const expectedLength = 16 /* Constants.SAMPLED_CHAR_HEIGHT */ *
            10 /* Constants.SAMPLED_CHAR_WIDTH */ *
            4 /* Constants.RGBA_CHANNELS_CNT */ *
            96 /* Constants.CHAR_COUNT */;
        if (source.length !== expectedLength) {
            throw new Error('Unexpected source in MinimapCharRenderer');
        }
        const charData = MinimapCharRendererFactory._downsample(source, scale);
        return new MinimapCharRenderer(charData, scale);
    }
    static _downsampleChar(source, sourceOffset, dest, destOffset, scale) {
        const width = 1 /* Constants.BASE_CHAR_WIDTH */ * scale;
        const height = 2 /* Constants.BASE_CHAR_HEIGHT */ * scale;
        let targetIndex = destOffset;
        let brightest = 0;
        // This is essentially an ad-hoc rescaling algorithm. Standard approaches
        // like bicubic interpolation are awesome for scaling between image sizes,
        // but don't work so well when scaling to very small pixel values, we end
        // up with blurry, indistinct forms.
        //
        // The approach taken here is simply mapping each source pixel to the target
        // pixels, and taking the weighted values for all pixels in each, and then
        // averaging them out. Finally we apply an intensity boost in _downsample,
        // since when scaling to the smallest pixel sizes there's more black space
        // which causes characters to be much less distinct.
        for (let y = 0; y < height; y++) {
            // 1. For this destination pixel, get the source pixels we're sampling
            // from (x1, y1) to the next pixel (x2, y2)
            const sourceY1 = (y / height) * 16 /* Constants.SAMPLED_CHAR_HEIGHT */;
            const sourceY2 = ((y + 1) / height) * 16 /* Constants.SAMPLED_CHAR_HEIGHT */;
            for (let x = 0; x < width; x++) {
                const sourceX1 = (x / width) * 10 /* Constants.SAMPLED_CHAR_WIDTH */;
                const sourceX2 = ((x + 1) / width) * 10 /* Constants.SAMPLED_CHAR_WIDTH */;
                // 2. Sample all of them, summing them up and weighting them. Similar
                // to bilinear interpolation.
                let value = 0;
                let samples = 0;
                for (let sy = sourceY1; sy < sourceY2; sy++) {
                    const sourceRow = sourceOffset + Math.floor(sy) * 3840 /* Constants.RGBA_SAMPLED_ROW_WIDTH */;
                    const yBalance = 1 - (sy - Math.floor(sy));
                    for (let sx = sourceX1; sx < sourceX2; sx++) {
                        const xBalance = 1 - (sx - Math.floor(sx));
                        const sourceIndex = sourceRow + Math.floor(sx) * 4 /* Constants.RGBA_CHANNELS_CNT */;
                        const weight = xBalance * yBalance;
                        samples += weight;
                        value += ((source[sourceIndex] * source[sourceIndex + 3]) / 255) * weight;
                    }
                }
                const final = value / samples;
                brightest = Math.max(brightest, final);
                dest[targetIndex++] = toUint8(final);
            }
        }
        return brightest;
    }
    static _downsample(data, scale) {
        const pixelsPerCharacter = 2 /* Constants.BASE_CHAR_HEIGHT */ * scale * 1 /* Constants.BASE_CHAR_WIDTH */ * scale;
        const resultLen = pixelsPerCharacter * 96 /* Constants.CHAR_COUNT */;
        const result = new Uint8ClampedArray(resultLen);
        let resultOffset = 0;
        let sourceOffset = 0;
        let brightest = 0;
        for (let charIndex = 0; charIndex < 96 /* Constants.CHAR_COUNT */; charIndex++) {
            brightest = Math.max(brightest, this._downsampleChar(data, sourceOffset, result, resultOffset, scale));
            resultOffset += pixelsPerCharacter;
            sourceOffset += 10 /* Constants.SAMPLED_CHAR_WIDTH */ * 4 /* Constants.RGBA_CHANNELS_CNT */;
        }
        if (brightest > 0) {
            const adjust = 255 / brightest;
            for (let i = 0; i < resultLen; i++) {
                result[i] *= adjust;
            }
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcENoYXJSZW5kZXJlckZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvbWluaW1hcC9taW5pbWFwQ2hhclJlbmRlcmVyRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFhLE1BQU0sdUJBQXVCLENBQUE7QUFDL0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXpEOzs7Ozs7R0FNRztBQUNILE1BQU0sT0FBTywwQkFBMEI7SUFJdEM7O09BRUc7SUFDSSxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQWEsRUFBRSxVQUFrQjtRQUNyRCxtRUFBbUU7UUFDbkUsMkVBQTJFO1FBQzNFLElBQ0MsSUFBSSxDQUFDLFdBQVc7WUFDaEIsS0FBSyxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSztZQUNoQyxVQUFVLEtBQUssSUFBSSxDQUFDLGNBQWMsRUFDakMsQ0FBQztZQUNGLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUN4QixDQUFDO1FBRUQsSUFBSSxPQUE0QixDQUFBO1FBQ2hDLElBQUksZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFPLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BFLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxHQUFHLDBCQUEwQixDQUFDLG9CQUFvQixDQUN4RCwwQkFBMEIsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLEVBQzVELEtBQUssQ0FDTCxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxjQUFjLEdBQUcsVUFBVSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFBO1FBQzFCLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLGdCQUFnQixDQUFDLFVBQWtCO1FBQ2hELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0MsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQTtRQUVwQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLHNDQUE2QixJQUFJLENBQUE7UUFDMUQsTUFBTSxDQUFDLE1BQU0seUNBQWdDLENBQUE7UUFDN0MsTUFBTSxDQUFDLEtBQUssR0FBRyxxRUFBbUQsQ0FBQTtRQUNsRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxxRUFBbUQsR0FBRyxJQUFJLENBQUE7UUFFL0UsR0FBRyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDekIsR0FBRyxDQUFDLElBQUksR0FBRyxRQUFRLHNDQUE2QixNQUFNLFVBQVUsRUFBRSxDQUFBO1FBQ2xFLEdBQUcsQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFBO1FBRTNCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNULEtBQUssTUFBTSxJQUFJLElBQUksWUFBWSxFQUFFLENBQUM7WUFDakMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSx5Q0FBZ0MsQ0FBQyxDQUFDLENBQUE7WUFDN0UsQ0FBQyx5Q0FBZ0MsQ0FBQTtRQUNsQyxDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUMsWUFBWSxDQUN0QixDQUFDLEVBQ0QsQ0FBQyxFQUNELHFFQUFtRCx5Q0FFbkQsQ0FBQTtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxvQkFBb0IsQ0FDakMsTUFBeUIsRUFDekIsS0FBYTtRQUViLE1BQU0sY0FBYyxHQUNuQjtpREFDNEI7K0NBQ0Q7eUNBQ1AsQ0FBQTtRQUNyQixJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssY0FBYyxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFBO1FBQzVELENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3RFLE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVPLE1BQU0sQ0FBQyxlQUFlLENBQzdCLE1BQXlCLEVBQ3pCLFlBQW9CLEVBQ3BCLElBQXVCLEVBQ3ZCLFVBQWtCLEVBQ2xCLEtBQWE7UUFFYixNQUFNLEtBQUssR0FBRyxvQ0FBNEIsS0FBSyxDQUFBO1FBQy9DLE1BQU0sTUFBTSxHQUFHLHFDQUE2QixLQUFLLENBQUE7UUFFakQsSUFBSSxXQUFXLEdBQUcsVUFBVSxDQUFBO1FBQzVCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUVqQix5RUFBeUU7UUFDekUsMEVBQTBFO1FBQzFFLHlFQUF5RTtRQUN6RSxvQ0FBb0M7UUFDcEMsRUFBRTtRQUNGLDRFQUE0RTtRQUM1RSwwRUFBMEU7UUFDMUUsMEVBQTBFO1FBQzFFLDBFQUEwRTtRQUMxRSxvREFBb0Q7UUFDcEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pDLHNFQUFzRTtZQUN0RSwyQ0FBMkM7WUFDM0MsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLHlDQUFnQyxDQUFBO1lBQzdELE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLHlDQUFnQyxDQUFBO1lBRW5FLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLHdDQUErQixDQUFBO2dCQUMzRCxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyx3Q0FBK0IsQ0FBQTtnQkFFakUscUVBQXFFO2dCQUNyRSw2QkFBNkI7Z0JBQzdCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQTtnQkFDYixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUE7Z0JBQ2YsS0FBSyxJQUFJLEVBQUUsR0FBRyxRQUFRLEVBQUUsRUFBRSxHQUFHLFFBQVEsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO29CQUM3QyxNQUFNLFNBQVMsR0FBRyxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsOENBQW1DLENBQUE7b0JBQ2xGLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7b0JBQzFDLEtBQUssSUFBSSxFQUFFLEdBQUcsUUFBUSxFQUFFLEVBQUUsR0FBRyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQzt3QkFDN0MsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTt3QkFDMUMsTUFBTSxXQUFXLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLHNDQUE4QixDQUFBO3dCQUU1RSxNQUFNLE1BQU0sR0FBRyxRQUFRLEdBQUcsUUFBUSxDQUFBO3dCQUNsQyxPQUFPLElBQUksTUFBTSxDQUFBO3dCQUNqQixLQUFLLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxNQUFNLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFBO29CQUMxRSxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxHQUFHLE9BQU8sQ0FBQTtnQkFDN0IsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUN0QyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUF1QixFQUFFLEtBQWE7UUFDaEUsTUFBTSxrQkFBa0IsR0FDdkIscUNBQTZCLEtBQUssb0NBQTRCLEdBQUcsS0FBSyxDQUFBO1FBQ3ZFLE1BQU0sU0FBUyxHQUFHLGtCQUFrQixnQ0FBdUIsQ0FBQTtRQUMzRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRS9DLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQTtRQUNwQixJQUFJLFlBQVksR0FBRyxDQUFDLENBQUE7UUFDcEIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLEtBQUssSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFLFNBQVMsZ0NBQXVCLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN2RSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDbkIsU0FBUyxFQUNULElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUNyRSxDQUFBO1lBQ0QsWUFBWSxJQUFJLGtCQUFrQixDQUFBO1lBQ2xDLFlBQVksSUFBSSwyRUFBMEQsQ0FBQTtRQUMzRSxDQUFDO1FBRUQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQTtZQUM5QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUE7WUFDcEIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7Q0FDRCJ9
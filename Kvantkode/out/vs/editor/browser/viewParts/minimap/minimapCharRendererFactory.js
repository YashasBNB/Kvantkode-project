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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcENoYXJSZW5kZXJlckZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9taW5pbWFwL21pbmltYXBDaGFyUmVuZGVyZXJGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQWEsTUFBTSx1QkFBdUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFekQ7Ozs7OztHQU1HO0FBQ0gsTUFBTSxPQUFPLDBCQUEwQjtJQUl0Qzs7T0FFRztJQUNJLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBYSxFQUFFLFVBQWtCO1FBQ3JELG1FQUFtRTtRQUNuRSwyRUFBMkU7UUFDM0UsSUFDQyxJQUFJLENBQUMsV0FBVztZQUNoQixLQUFLLEtBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLO1lBQ2hDLFVBQVUsS0FBSyxJQUFJLENBQUMsY0FBYyxFQUNqQyxDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQ3hCLENBQUM7UUFFRCxJQUFJLE9BQTRCLENBQUE7UUFDaEMsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdCLE9BQU8sR0FBRyxJQUFJLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEdBQUcsMEJBQTBCLENBQUMsb0JBQW9CLENBQ3hELDBCQUEwQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksRUFDNUQsS0FBSyxDQUNMLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxVQUFVLENBQUE7UUFDaEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUE7UUFDMUIsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsVUFBa0I7UUFDaEQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBRSxDQUFBO1FBRXBDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsc0NBQTZCLElBQUksQ0FBQTtRQUMxRCxNQUFNLENBQUMsTUFBTSx5Q0FBZ0MsQ0FBQTtRQUM3QyxNQUFNLENBQUMsS0FBSyxHQUFHLHFFQUFtRCxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLHFFQUFtRCxHQUFHLElBQUksQ0FBQTtRQUUvRSxHQUFHLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUN6QixHQUFHLENBQUMsSUFBSSxHQUFHLFFBQVEsc0NBQTZCLE1BQU0sVUFBVSxFQUFFLENBQUE7UUFDbEUsR0FBRyxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUE7UUFFM0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1QsS0FBSyxNQUFNLElBQUksSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNqQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLHlDQUFnQyxDQUFDLENBQUMsQ0FBQTtZQUM3RSxDQUFDLHlDQUFnQyxDQUFBO1FBQ2xDLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxZQUFZLENBQ3RCLENBQUMsRUFDRCxDQUFDLEVBQ0QscUVBQW1ELHlDQUVuRCxDQUFBO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLG9CQUFvQixDQUNqQyxNQUF5QixFQUN6QixLQUFhO1FBRWIsTUFBTSxjQUFjLEdBQ25CO2lEQUM0QjsrQ0FDRDt5Q0FDUCxDQUFBO1FBQ3JCLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxjQUFjLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLDBCQUEwQixDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEUsT0FBTyxJQUFJLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRU8sTUFBTSxDQUFDLGVBQWUsQ0FDN0IsTUFBeUIsRUFDekIsWUFBb0IsRUFDcEIsSUFBdUIsRUFDdkIsVUFBa0IsRUFDbEIsS0FBYTtRQUViLE1BQU0sS0FBSyxHQUFHLG9DQUE0QixLQUFLLENBQUE7UUFDL0MsTUFBTSxNQUFNLEdBQUcscUNBQTZCLEtBQUssQ0FBQTtRQUVqRCxJQUFJLFdBQVcsR0FBRyxVQUFVLENBQUE7UUFDNUIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBRWpCLHlFQUF5RTtRQUN6RSwwRUFBMEU7UUFDMUUseUVBQXlFO1FBQ3pFLG9DQUFvQztRQUNwQyxFQUFFO1FBQ0YsNEVBQTRFO1FBQzVFLDBFQUEwRTtRQUMxRSwwRUFBMEU7UUFDMUUsMEVBQTBFO1FBQzFFLG9EQUFvRDtRQUNwRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakMsc0VBQXNFO1lBQ3RFLDJDQUEyQztZQUMzQyxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMseUNBQWdDLENBQUE7WUFDN0QsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMseUNBQWdDLENBQUE7WUFFbkUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNoQyxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsd0NBQStCLENBQUE7Z0JBQzNELE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLHdDQUErQixDQUFBO2dCQUVqRSxxRUFBcUU7Z0JBQ3JFLDZCQUE2QjtnQkFDN0IsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO2dCQUNiLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQTtnQkFDZixLQUFLLElBQUksRUFBRSxHQUFHLFFBQVEsRUFBRSxFQUFFLEdBQUcsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7b0JBQzdDLE1BQU0sU0FBUyxHQUFHLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyw4Q0FBbUMsQ0FBQTtvQkFDbEYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtvQkFDMUMsS0FBSyxJQUFJLEVBQUUsR0FBRyxRQUFRLEVBQUUsRUFBRSxHQUFHLFFBQVEsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO3dCQUM3QyxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO3dCQUMxQyxNQUFNLFdBQVcsR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsc0NBQThCLENBQUE7d0JBRTVFLE1BQU0sTUFBTSxHQUFHLFFBQVEsR0FBRyxRQUFRLENBQUE7d0JBQ2xDLE9BQU8sSUFBSSxNQUFNLENBQUE7d0JBQ2pCLEtBQUssSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUE7b0JBQzFFLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxNQUFNLEtBQUssR0FBRyxLQUFLLEdBQUcsT0FBTyxDQUFBO2dCQUM3QixTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ3RDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNyQyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQXVCLEVBQUUsS0FBYTtRQUNoRSxNQUFNLGtCQUFrQixHQUN2QixxQ0FBNkIsS0FBSyxvQ0FBNEIsR0FBRyxLQUFLLENBQUE7UUFDdkUsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLGdDQUF1QixDQUFBO1FBQzNELE1BQU0sTUFBTSxHQUFHLElBQUksaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFL0MsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFBO1FBQ3BCLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQTtRQUNwQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFDakIsS0FBSyxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUUsU0FBUyxnQ0FBdUIsRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQ3ZFLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUNuQixTQUFTLEVBQ1QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQ3JFLENBQUE7WUFDRCxZQUFZLElBQUksa0JBQWtCLENBQUE7WUFDbEMsWUFBWSxJQUFJLDJFQUEwRCxDQUFBO1FBQzNFLENBQUM7UUFFRCxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuQixNQUFNLE1BQU0sR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFBO1lBQzlCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQTtZQUNwQixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztDQUNEIn0=
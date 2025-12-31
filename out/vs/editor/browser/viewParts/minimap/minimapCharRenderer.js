/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getCharIndex } from './minimapCharSheet.js';
import { toUint8 } from '../../../../base/common/uint.js';
export class MinimapCharRenderer {
    constructor(charData, scale) {
        this.scale = scale;
        this._minimapCharRendererBrand = undefined;
        this.charDataNormal = MinimapCharRenderer.soften(charData, 12 / 15);
        this.charDataLight = MinimapCharRenderer.soften(charData, 50 / 60);
    }
    static soften(input, ratio) {
        const result = new Uint8ClampedArray(input.length);
        for (let i = 0, len = input.length; i < len; i++) {
            result[i] = toUint8(input[i] * ratio);
        }
        return result;
    }
    renderChar(target, dx, dy, chCode, color, foregroundAlpha, backgroundColor, backgroundAlpha, fontScale, useLighterFont, force1pxHeight) {
        const charWidth = 1 /* Constants.BASE_CHAR_WIDTH */ * this.scale;
        const charHeight = 2 /* Constants.BASE_CHAR_HEIGHT */ * this.scale;
        const renderHeight = force1pxHeight ? 1 : charHeight;
        if (dx + charWidth > target.width || dy + renderHeight > target.height) {
            console.warn('bad render request outside image data');
            return;
        }
        const charData = useLighterFont ? this.charDataLight : this.charDataNormal;
        const charIndex = getCharIndex(chCode, fontScale);
        const destWidth = target.width * 4 /* Constants.RGBA_CHANNELS_CNT */;
        const backgroundR = backgroundColor.r;
        const backgroundG = backgroundColor.g;
        const backgroundB = backgroundColor.b;
        const deltaR = color.r - backgroundR;
        const deltaG = color.g - backgroundG;
        const deltaB = color.b - backgroundB;
        const destAlpha = Math.max(foregroundAlpha, backgroundAlpha);
        const dest = target.data;
        let sourceOffset = charIndex * charWidth * charHeight;
        let row = dy * destWidth + dx * 4 /* Constants.RGBA_CHANNELS_CNT */;
        for (let y = 0; y < renderHeight; y++) {
            let column = row;
            for (let x = 0; x < charWidth; x++) {
                const c = (charData[sourceOffset++] / 255) * (foregroundAlpha / 255);
                dest[column++] = backgroundR + deltaR * c;
                dest[column++] = backgroundG + deltaG * c;
                dest[column++] = backgroundB + deltaB * c;
                dest[column++] = destAlpha;
            }
            row += destWidth;
        }
    }
    blockRenderChar(target, dx, dy, color, foregroundAlpha, backgroundColor, backgroundAlpha, force1pxHeight) {
        const charWidth = 1 /* Constants.BASE_CHAR_WIDTH */ * this.scale;
        const charHeight = 2 /* Constants.BASE_CHAR_HEIGHT */ * this.scale;
        const renderHeight = force1pxHeight ? 1 : charHeight;
        if (dx + charWidth > target.width || dy + renderHeight > target.height) {
            console.warn('bad render request outside image data');
            return;
        }
        const destWidth = target.width * 4 /* Constants.RGBA_CHANNELS_CNT */;
        const c = 0.5 * (foregroundAlpha / 255);
        const backgroundR = backgroundColor.r;
        const backgroundG = backgroundColor.g;
        const backgroundB = backgroundColor.b;
        const deltaR = color.r - backgroundR;
        const deltaG = color.g - backgroundG;
        const deltaB = color.b - backgroundB;
        const colorR = backgroundR + deltaR * c;
        const colorG = backgroundG + deltaG * c;
        const colorB = backgroundB + deltaB * c;
        const destAlpha = Math.max(foregroundAlpha, backgroundAlpha);
        const dest = target.data;
        let row = dy * destWidth + dx * 4 /* Constants.RGBA_CHANNELS_CNT */;
        for (let y = 0; y < renderHeight; y++) {
            let column = row;
            for (let x = 0; x < charWidth; x++) {
                dest[column++] = colorR;
                dest[column++] = colorG;
                dest[column++] = colorB;
                dest[column++] = destAlpha;
            }
            row += destWidth;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcENoYXJSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9taW5pbWFwL21pbmltYXBDaGFyUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFhLFlBQVksRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV6RCxNQUFNLE9BQU8sbUJBQW1CO0lBTS9CLFlBQ0MsUUFBMkIsRUFDWCxLQUFhO1FBQWIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQVA5Qiw4QkFBeUIsR0FBUyxTQUFTLENBQUE7UUFTMUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUNuRSxJQUFJLENBQUMsYUFBYSxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFTyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQXdCLEVBQUUsS0FBYTtRQUM1RCxNQUFNLE1BQU0sR0FBRyxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbEQsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUE7UUFDdEMsQ0FBQztRQUNELE9BQU8sTUFBTSxD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
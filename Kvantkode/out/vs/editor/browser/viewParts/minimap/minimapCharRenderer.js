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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcENoYXJSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL21pbmltYXAvbWluaW1hcENoYXJSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQWEsWUFBWSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXpELE1BQU0sT0FBTyxtQkFBbUI7SUFNL0IsWUFDQyxRQUEyQixFQUNYLEtBQWE7UUFBYixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBUDlCLDhCQUF5QixHQUFTLFNBQVMsQ0FBQTtRQVMxQyxJQUFJLENBQUMsY0FBYyxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxhQUFhLEdBQUcsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVPLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBd0IsRUFBRSxLQUFhO1FBQzVELE1BQU0sTUFBTSxHQUFHLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNsRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU0sVUFBVSxDQUNoQixNQUFpQixFQUNqQixFQUFVLEVBQ1YsRUFBVSxFQUNWLE1BQWMsRUFDZCxLQUFZLEVBQ1osZUFBdUIsRUFDdkIsZUFBc0IsRUFDdEIsZUFBdUIsRUFDdkIsU0FBaUIsRUFDakIsY0FBdUIsRUFDdkIsY0FBdUI7UUFFdkIsTUFBTSxTQUFTLEdBQUcsb0NBQTRCLElBQUksQ0FBQyxLQUFLLENBQUE7UUFDeEQsTUFBTSxVQUFVLEdBQUcscUNBQTZCLElBQUksQ0FBQyxLQUFLLENBQUE7UUFDMUQsTUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQTtRQUNwRCxJQUFJLEVBQUUsR0FBRyxTQUFTLEdBQUcsTUFBTSxDQUFDLEtBQUssSUFBSSxFQUFFLEdBQUcsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4RSxPQUFPLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUE7WUFDckQsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUE7UUFDMUUsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVqRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxzQ0FBOEIsQ0FBQTtRQUU1RCxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUE7UUFDckMsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQTtRQUVyQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQTtRQUNwQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQTtRQUNwQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQTtRQUVwQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUU1RCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFBO1FBQ3hCLElBQUksWUFBWSxHQUFHLFNBQVMsR0FBRyxTQUFTLEdBQUcsVUFBVSxDQUFBO1FBRXJELElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxTQUFTLEdBQUcsRUFBRSxzQ0FBOEIsQ0FBQTtRQUMzRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkMsSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFBO1lBQ2hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUMsQ0FBQTtnQkFDcEUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsV0FBVyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUE7Z0JBQ3pDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLFdBQVcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUN6QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxXQUFXLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQTtnQkFDekMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFBO1lBQzNCLENBQUM7WUFFRCxHQUFHLElBQUksU0FBUyxDQUFBO1FBQ2pCLENBQUM7SUFDRixDQUFDO0lBRU0sZUFBZSxDQUNyQixNQUFpQixFQUNqQixFQUFVLEVBQ1YsRUFBVSxFQUNWLEtBQVksRUFDWixlQUF1QixFQUN2QixlQUFzQixFQUN0QixlQUF1QixFQUN2QixjQUF1QjtRQUV2QixNQUFNLFNBQVMsR0FBRyxvQ0FBNEIsSUFBSSxDQUFDLEtBQUssQ0FBQTtRQUN4RCxNQUFNLFVBQVUsR0FBRyxxQ0FBNkIsSUFBSSxDQUFDLEtBQUssQ0FBQTtRQUMxRCxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFBO1FBQ3BELElBQUksRUFBRSxHQUFHLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxJQUFJLEVBQUUsR0FBRyxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3hFLE9BQU8sQ0FBQyxJQUFJLENBQUMsdUNBQXVDLENBQUMsQ0FBQTtZQUNyRCxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxLQUFLLHNDQUE4QixDQUFBO1FBRTVELE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUV2QyxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUE7UUFDckMsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQTtRQUVyQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQTtRQUNwQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQTtRQUNwQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQTtRQUVwQyxNQUFNLE1BQU0sR0FBRyxXQUFXLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUN2QyxNQUFNLE1BQU0sR0FBRyxXQUFXLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUN2QyxNQUFNLE1BQU0sR0FBRyxXQUFXLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUV2QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUU1RCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFBO1FBRXhCLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxTQUFTLEdBQUcsRUFBRSxzQ0FBOEIsQ0FBQTtRQUMzRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkMsSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFBO1lBQ2hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFBO2dCQUN2QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUE7Z0JBQ3ZCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQTtnQkFDdkIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFBO1lBQzNCLENBQUM7WUFFRCxHQUFHLElBQUksU0FBUyxDQUFBO1FBQ2pCLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==
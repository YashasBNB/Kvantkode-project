/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindowId } from '../../../base/browser/dom.js';
import { PixelRatio } from '../../../base/browser/pixelRatio.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { CharWidthRequest, readCharWidths } from './charWidthReader.js';
import { EditorFontLigatures } from '../../common/config/editorOptions.js';
import { FontInfo, SERIALIZED_FONT_INFO_VERSION, } from '../../common/config/fontInfo.js';
export class FontMeasurementsImpl extends Disposable {
    constructor() {
        super(...arguments);
        this._cache = new Map();
        this._evictUntrustedReadingsTimeout = -1;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
    }
    dispose() {
        if (this._evictUntrustedReadingsTimeout !== -1) {
            clearTimeout(this._evictUntrustedReadingsTimeout);
            this._evictUntrustedReadingsTimeout = -1;
        }
        super.dispose();
    }
    /**
     * Clear all cached font information and trigger a change event.
     */
    clearAllFontInfos() {
        this._cache.clear();
        this._onDidChange.fire();
    }
    _ensureCache(targetWindow) {
        const windowId = getWindowId(targetWindow);
        let cache = this._cache.get(windowId);
        if (!cache) {
            cache = new FontMeasurementsCache();
            this._cache.set(windowId, cache);
        }
        return cache;
    }
    _writeToCache(targetWindow, item, value) {
        const cache = this._ensureCache(targetWindow);
        cache.put(item, value);
        if (!value.isTrusted && this._evictUntrustedReadingsTimeout === -1) {
            // Try reading again after some time
            this._evictUntrustedReadingsTimeout = targetWindow.setTimeout(() => {
                this._evictUntrustedReadingsTimeout = -1;
                this._evictUntrustedReadings(targetWindow);
            }, 5000);
        }
    }
    _evictUntrustedReadings(targetWindow) {
        const cache = this._ensureCache(targetWindow);
        const values = cache.getValues();
        let somethingRemoved = false;
        for (const item of values) {
            if (!item.isTrusted) {
                somethingRemoved = true;
                cache.remove(item);
            }
        }
        if (somethingRemoved) {
            this._onDidChange.fire();
        }
    }
    /**
     * Serialized currently cached font information.
     */
    serializeFontInfo(targetWindow) {
        // Only save trusted font info (that has been measured in this running instance)
        const cache = this._ensureCache(targetWindow);
        return cache.getValues().filter((item) => item.isTrusted);
    }
    /**
     * Restore previously serialized font informations.
     */
    restoreFontInfo(targetWindow, savedFontInfos) {
        // Take all the saved font info and insert them in the cache without the trusted flag.
        // The reason for this is that a font might have been installed on the OS in the meantime.
        for (const savedFontInfo of savedFontInfos) {
            if (savedFontInfo.version !== SERIALIZED_FONT_INFO_VERSION) {
                // cannot use older version
                continue;
            }
            const fontInfo = new FontInfo(savedFontInfo, false);
            this._writeToCache(targetWindow, fontInfo, fontInfo);
        }
    }
    /**
     * Read font information.
     */
    readFontInfo(targetWindow, bareFontInfo) {
        const cache = this._ensureCache(targetWindow);
        if (!cache.has(bareFontInfo)) {
            let readConfig = this._actualReadFontInfo(targetWindow, bareFontInfo);
            if (readConfig.typicalHalfwidthCharacterWidth <= 2 ||
                readConfig.typicalFullwidthCharacterWidth <= 2 ||
                readConfig.spaceWidth <= 2 ||
                readConfig.maxDigitWidth <= 2) {
                // Hey, it's Bug 14341 ... we couldn't read
                readConfig = new FontInfo({
                    pixelRatio: PixelRatio.getInstance(targetWindow).value,
                    fontFamily: readConfig.fontFamily,
                    fontWeight: readConfig.fontWeight,
                    fontSize: readConfig.fontSize,
                    fontFeatureSettings: readConfig.fontFeatureSettings,
                    fontVariationSettings: readConfig.fontVariationSettings,
                    lineHeight: readConfig.lineHeight,
                    letterSpacing: readConfig.letterSpacing,
                    isMonospace: readConfig.isMonospace,
                    typicalHalfwidthCharacterWidth: Math.max(readConfig.typicalHalfwidthCharacterWidth, 5),
                    typicalFullwidthCharacterWidth: Math.max(readConfig.typicalFullwidthCharacterWidth, 5),
                    canUseHalfwidthRightwardsArrow: readConfig.canUseHalfwidthRightwardsArrow,
                    spaceWidth: Math.max(readConfig.spaceWidth, 5),
                    middotWidth: Math.max(readConfig.middotWidth, 5),
                    wsmiddotWidth: Math.max(readConfig.wsmiddotWidth, 5),
                    maxDigitWidth: Math.max(readConfig.maxDigitWidth, 5),
                }, false);
            }
            this._writeToCache(targetWindow, bareFontInfo, readConfig);
        }
        return cache.get(bareFontInfo);
    }
    _createRequest(chr, type, all, monospace) {
        const result = new CharWidthRequest(chr, type);
        all.push(result);
        monospace?.push(result);
        return result;
    }
    _actualReadFontInfo(targetWindow, bareFontInfo) {
        const all = [];
        const monospace = [];
        const typicalHalfwidthCharacter = this._createRequest('n', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const typicalFullwidthCharacter = this._createRequest('\uff4d', 0 /* CharWidthRequestType.Regular */, all, null);
        const space = this._createRequest(' ', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit0 = this._createRequest('0', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit1 = this._createRequest('1', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit2 = this._createRequest('2', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit3 = this._createRequest('3', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit4 = this._createRequest('4', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit5 = this._createRequest('5', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit6 = this._createRequest('6', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit7 = this._createRequest('7', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit8 = this._createRequest('8', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit9 = this._createRequest('9', 0 /* CharWidthRequestType.Regular */, all, monospace);
        // monospace test: used for whitespace rendering
        const rightwardsArrow = this._createRequest('→', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const halfwidthRightwardsArrow = this._createRequest('￫', 0 /* CharWidthRequestType.Regular */, all, null);
        // U+00B7 - MIDDLE DOT
        const middot = this._createRequest('·', 0 /* CharWidthRequestType.Regular */, all, monospace);
        // U+2E31 - WORD SEPARATOR MIDDLE DOT
        const wsmiddotWidth = this._createRequest(String.fromCharCode(0x2e31), 0 /* CharWidthRequestType.Regular */, all, null);
        // monospace test: some characters
        const monospaceTestChars = '|/-_ilm%';
        for (let i = 0, len = monospaceTestChars.length; i < len; i++) {
            this._createRequest(monospaceTestChars.charAt(i), 0 /* CharWidthRequestType.Regular */, all, monospace);
            this._createRequest(monospaceTestChars.charAt(i), 1 /* CharWidthRequestType.Italic */, all, monospace);
            this._createRequest(monospaceTestChars.charAt(i), 2 /* CharWidthRequestType.Bold */, all, monospace);
        }
        readCharWidths(targetWindow, bareFontInfo, all);
        const maxDigitWidth = Math.max(digit0.width, digit1.width, digit2.width, digit3.width, digit4.width, digit5.width, digit6.width, digit7.width, digit8.width, digit9.width);
        let isMonospace = bareFontInfo.fontFeatureSettings === EditorFontLigatures.OFF;
        const referenceWidth = monospace[0].width;
        for (let i = 1, len = monospace.length; isMonospace && i < len; i++) {
            const diff = referenceWidth - monospace[i].width;
            if (diff < -0.001 || diff > 0.001) {
                isMonospace = false;
                break;
            }
        }
        let canUseHalfwidthRightwardsArrow = true;
        if (isMonospace && halfwidthRightwardsArrow.width !== referenceWidth) {
            // using a halfwidth rightwards arrow would break monospace...
            canUseHalfwidthRightwardsArrow = false;
        }
        if (halfwidthRightwardsArrow.width > rightwardsArrow.width) {
            // using a halfwidth rightwards arrow would paint a larger arrow than a regular rightwards arrow
            canUseHalfwidthRightwardsArrow = false;
        }
        return new FontInfo({
            pixelRatio: PixelRatio.getInstance(targetWindow).value,
            fontFamily: bareFontInfo.fontFamily,
            fontWeight: bareFontInfo.fontWeight,
            fontSize: bareFontInfo.fontSize,
            fontFeatureSettings: bareFontInfo.fontFeatureSettings,
            fontVariationSettings: bareFontInfo.fontVariationSettings,
            lineHeight: bareFontInfo.lineHeight,
            letterSpacing: bareFontInfo.letterSpacing,
            isMonospace: isMonospace,
            typicalHalfwidthCharacterWidth: typicalHalfwidthCharacter.width,
            typicalFullwidthCharacterWidth: typicalFullwidthCharacter.width,
            canUseHalfwidthRightwardsArrow: canUseHalfwidthRightwardsArrow,
            spaceWidth: space.width,
            middotWidth: middot.width,
            wsmiddotWidth: wsmiddotWidth.width,
            maxDigitWidth: maxDigitWidth,
        }, true);
    }
}
class FontMeasurementsCache {
    constructor() {
        this._keys = Object.create(null);
        this._values = Object.create(null);
    }
    has(item) {
        const itemId = item.getId();
        return !!this._values[itemId];
    }
    get(item) {
        const itemId = item.getId();
        return this._values[itemId];
    }
    put(item, value) {
        const itemId = item.getId();
        this._keys[itemId] = item;
        this._values[itemId] = value;
    }
    remove(item) {
        const itemId = item.getId();
        delete this._keys[itemId];
        delete this._values[itemId];
    }
    getValues() {
        return Object.keys(this._keys).map((id) => this._values[id]);
    }
}
export const FontMeasurements = new FontMeasurementsImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9udE1lYXN1cmVtZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbmZpZy9mb250TWVhc3VyZW1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQXdCLGNBQWMsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFFLE9BQU8sRUFFTixRQUFRLEVBQ1IsNEJBQTRCLEdBQzVCLE1BQU0saUNBQWlDLENBQUE7QUF5QnhDLE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxVQUFVO0lBQXBEOztRQUNrQixXQUFNLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUE7UUFFMUQsbUNBQThCLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFMUIsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNuRCxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO0lBOFB0RCxDQUFDO0lBNVBnQixPQUFPO1FBQ3RCLElBQUksSUFBSSxDQUFDLDhCQUE4QixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDaEQsWUFBWSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO1lBQ2pELElBQUksQ0FBQyw4QkFBOEIsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN6QyxDQUFDO1FBQ0QsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRDs7T0FFRztJQUNJLGlCQUFpQjtRQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ25CLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLFlBQVksQ0FBQyxZQUFvQjtRQUN4QyxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDMUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osS0FBSyxHQUFHLElBQUkscUJBQXFCLEVBQUUsQ0FBQTtZQUNuQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakMsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLGFBQWEsQ0FBQyxZQUFvQixFQUFFLElBQWtCLEVBQUUsS0FBZTtRQUM5RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzdDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXRCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyw4QkFBOEIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3BFLG9DQUFvQztZQUNwQyxJQUFJLENBQUMsOEJBQThCLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2xFLElBQUksQ0FBQyw4QkFBOEIsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDeEMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzNDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNULENBQUM7SUFDRixDQUFDO0lBRU8sdUJBQXVCLENBQUMsWUFBb0I7UUFDbkQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM3QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDaEMsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7UUFDNUIsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNyQixnQkFBZ0IsR0FBRyxJQUFJLENBQUE7Z0JBQ3ZCLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbkIsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksaUJBQWlCLENBQUMsWUFBb0I7UUFDNUMsZ0ZBQWdGO1FBQ2hGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDN0MsT0FBTyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVEOztPQUVHO0lBQ0ksZUFBZSxDQUFDLFlBQW9CLEVBQUUsY0FBcUM7UUFDakYsc0ZBQXNGO1FBQ3RGLDBGQUEwRjtRQUMxRixLQUFLLE1BQU0sYUFBYSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQzVDLElBQUksYUFBYSxDQUFDLE9BQU8sS0FBSyw0QkFBNEIsRUFBRSxDQUFDO2dCQUM1RCwyQkFBMkI7Z0JBQzNCLFNBQVE7WUFDVCxDQUFDO1lBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ25ELElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNyRCxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksWUFBWSxDQUFDLFlBQW9CLEVBQUUsWUFBMEI7UUFDbkUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQzlCLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFFckUsSUFDQyxVQUFVLENBQUMsOEJBQThCLElBQUksQ0FBQztnQkFDOUMsVUFBVSxDQUFDLDhCQUE4QixJQUFJLENBQUM7Z0JBQzlDLFVBQVUsQ0FBQyxVQUFVLElBQUksQ0FBQztnQkFDMUIsVUFBVSxDQUFDLGFBQWEsSUFBSSxDQUFDLEVBQzVCLENBQUM7Z0JBQ0YsMkNBQTJDO2dCQUMzQyxVQUFVLEdBQUcsSUFBSSxRQUFRLENBQ3hCO29CQUNDLFVBQVUsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUs7b0JBQ3RELFVBQVUsRUFBRSxVQUFVLENBQUMsVUFBVTtvQkFDakMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxVQUFVO29CQUNqQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7b0JBQzdCLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxtQkFBbUI7b0JBQ25ELHFCQUFxQixFQUFFLFVBQVUsQ0FBQyxxQkFBcUI7b0JBQ3ZELFVBQVUsRUFBRSxVQUFVLENBQUMsVUFBVTtvQkFDakMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxhQUFhO29CQUN2QyxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVc7b0JBQ25DLDhCQUE4QixFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDhCQUE4QixFQUFFLENBQUMsQ0FBQztvQkFDdEYsOEJBQThCLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsOEJBQThCLEVBQUUsQ0FBQyxDQUFDO29CQUN0Riw4QkFBOEIsRUFBRSxVQUFVLENBQUMsOEJBQThCO29CQUN6RSxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztvQkFDOUMsV0FBVyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7b0JBQ2hELGFBQWEsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO29CQUNwRCxhQUFhLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztpQkFDcEQsRUFDRCxLQUFLLENBQ0wsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDM0QsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRU8sY0FBYyxDQUNyQixHQUFXLEVBQ1gsSUFBMEIsRUFDMUIsR0FBdUIsRUFDdkIsU0FBb0M7UUFFcEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoQixTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZCLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLG1CQUFtQixDQUFDLFlBQW9CLEVBQUUsWUFBMEI7UUFDM0UsTUFBTSxHQUFHLEdBQXVCLEVBQUUsQ0FBQTtRQUNsQyxNQUFNLFNBQVMsR0FBdUIsRUFBRSxDQUFBO1FBRXhDLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FDcEQsR0FBRyx3Q0FFSCxHQUFHLEVBQ0gsU0FBUyxDQUNULENBQUE7UUFDRCxNQUFNLHlCQUF5QixHQUFHLElBQUksQ0FBQyxjQUFjLENBQ3BELFFBQVEsd0NBRVIsR0FBRyxFQUNILElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLHdDQUFnQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLHdDQUFnQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLHdDQUFnQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLHdDQUFnQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLHdDQUFnQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLHdDQUFnQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLHdDQUFnQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLHdDQUFnQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLHdDQUFnQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLHdDQUFnQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9udE1lYXN1cmVtZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29uZmlnL2ZvbnRNZWFzdXJlbWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBd0IsY0FBYyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUUsT0FBTyxFQUVOLFFBQVEsRUFDUiw0QkFBNEIsR0FDNUIsTUFBTSxpQ0FBaUMsQ0FBQTtBQXlCeEMsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBQVU7SUFBcEQ7O1FBQ2tCLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBaUMsQ0FBQTtRQUUxRCxtQ0FBOEIsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUUxQixpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ25ELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7SUE4UHRELENBQUM7SUE1UGdCLE9BQU87UUFDdEIsSUFBSSxJQUFJLENBQUMsOEJBQThCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxZQUFZLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUE7WUFDakQsSUFBSSxDQUFDLDhCQUE4QixHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFDRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksaUJBQWlCO1FBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8sWUFBWSxDQUFDLFlBQW9CO1FBQ3hDLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMxQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixLQUFLLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFBO1lBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sYUFBYSxDQUFDLFlBQW9CLEVBQUUsSUFBa0IsRUFBRSxLQUFlO1FBQzlFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDN0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLDhCQUE4QixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDcEUsb0NBQW9DO1lBQ3BDLElBQUksQ0FBQyw4QkFBOEIsR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDbEUsSUFBSSxDQUFDLDhCQUE4QixHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUN4QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDM0MsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ1QsQ0FBQztJQUNGLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxZQUFvQjtRQUNuRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzdDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUNoQyxJQUFJLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtRQUM1QixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3JCLGdCQUFnQixHQUFHLElBQUksQ0FBQTtnQkFDdkIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNuQixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3pCLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxpQkFBaUIsQ0FBQyxZQUFvQjtRQUM1QyxnRkFBZ0Y7UUFDaEYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM3QyxPQUFPLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxlQUFlLENBQUMsWUFBb0IsRUFBRSxjQUFxQztRQUNqRixzRkFBc0Y7UUFDdEYsMEZBQTBGO1FBQzFGLEtBQUssTUFBTSxhQUFhLElBQUksY0FBYyxFQUFFLENBQUM7WUFDNUMsSUFBSSxhQUFhLENBQUMsT0FBTyxLQUFLLDRCQUE0QixFQUFFLENBQUM7Z0JBQzVELDJCQUEyQjtnQkFDM0IsU0FBUTtZQUNULENBQUM7WUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbkQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3JELENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxZQUFZLENBQUMsWUFBb0IsRUFBRSxZQUEwQjtRQUNuRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDOUIsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUVyRSxJQUNDLFVBQVUsQ0FBQyw4QkFBOEIsSUFBSSxDQUFDO2dCQUM5QyxVQUFVLENBQUMsOEJBQThCLElBQUksQ0FBQztnQkFDOUMsVUFBVSxDQUFDLFVBQVUsSUFBSSxDQUFDO2dCQUMxQixVQUFVLENBQUMsYUFBYSxJQUFJLENBQUMsRUFDNUIsQ0FBQztnQkFDRiwyQ0FBMkM7Z0JBQzNDLFVBQVUsR0FBRyxJQUFJLFFBQVEsQ0FDeEI7b0JBQ0MsVUFBVSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSztvQkFDdEQsVUFBVSxFQUFFLFVBQVUsQ0FBQyxVQUFVO29CQUNqQyxVQUFVLEVBQUUsVUFBVSxDQUFDLFVBQVU7b0JBQ2pDLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUTtvQkFDN0IsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLG1CQUFtQjtvQkFDbkQscUJBQXFCLEVBQUUsVUFBVSxDQUFDLHFCQUFxQjtvQkFDdkQsVUFBVSxFQUFFLFVBQVUsQ0FBQyxVQUFVO29CQUNqQyxhQUFhLEVBQUUsVUFBVSxDQUFDLGFBQWE7b0JBQ3ZDLFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVztvQkFDbkMsOEJBQThCLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsOEJBQThCLEVBQUUsQ0FBQyxDQUFDO29CQUN0Riw4QkFBOEIsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLENBQUM7b0JBQ3RGLDhCQUE4QixFQUFFLFVBQVUsQ0FBQyw4QkFBOEI7b0JBQ3pFLFVBQVUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO29CQUM5QyxXQUFXLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztvQkFDaEQsYUFBYSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7b0JBQ3BELGFBQWEsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO2lCQUNwRCxFQUNELEtBQUssQ0FDTCxDQUFBO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMzRCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFTyxjQUFjLENBQ3JCLEdBQVcsRUFDWCxJQUEwQixFQUMxQixHQUF1QixFQUN2QixTQUFvQztRQUVwQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5QyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2hCLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkIsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sbUJBQW1CLENBQUMsWUFBb0IsRUFBRSxZQUEwQjtRQUMzRSxNQUFNLEdBQUcsR0FBdUIsRUFBRSxDQUFBO1FBQ2xDLE1BQU0sU0FBUyxHQUF1QixFQUFFLENBQUE7UUFFeEMsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUNwRCxHQUFHLHdDQUVILEdBQUcsRUFDSCxTQUFTLENBQ1QsQ0FBQTtRQUNELE1BQU0seUJBQXlCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FDcEQsUUFBUSx3Q0FFUixHQUFHLEVBQ0gsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsd0NBQWdDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsd0NBQWdDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsd0NBQWdDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsd0NBQWdDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsd0NBQWdDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsd0NBQWdDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsd0NBQWdDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsd0NBQWdDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsd0NBQWdDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsd0NBQWdDLEdB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
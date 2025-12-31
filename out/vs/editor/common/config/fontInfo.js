/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as platform from '../../../base/common/platform.js';
import { EditorFontVariations, EditorOptions, EDITOR_FONT_DEFAULTS, } from './editorOptions.js';
import { EditorZoom } from './editorZoom.js';
/**
 * Determined from empirical observations.
 * @internal
 */
export const GOLDEN_LINE_HEIGHT_RATIO = platform.isMacintosh ? 1.5 : 1.35;
/**
 * @internal
 */
export const MINIMUM_LINE_HEIGHT = 8;
export class BareFontInfo {
    /**
     * @internal
     */
    static createFromValidatedSettings(options, pixelRatio, ignoreEditorZoom) {
        const fontFamily = options.get(51 /* EditorOption.fontFamily */);
        const fontWeight = options.get(55 /* EditorOption.fontWeight */);
        const fontSize = options.get(54 /* EditorOption.fontSize */);
        const fontFeatureSettings = options.get(53 /* EditorOption.fontLigatures */);
        const fontVariationSettings = options.get(56 /* EditorOption.fontVariations */);
        const lineHeight = options.get(68 /* EditorOption.lineHeight */);
        const letterSpacing = options.get(65 /* EditorOption.letterSpacing */);
        return BareFontInfo._create(fontFamily, fontWeight, fontSize, fontFeatureSettings, fontVariationSettings, lineHeight, letterSpacing, pixelRatio, ignoreEditorZoom);
    }
    /**
     * @internal
     */
    static createFromRawSettings(opts, pixelRatio, ignoreEditorZoom = false) {
        const fontFamily = EditorOptions.fontFamily.validate(opts.fontFamily);
        const fontWeight = EditorOptions.fontWeight.validate(opts.fontWeight);
        const fontSize = EditorOptions.fontSize.validate(opts.fontSize);
        const fontFeatureSettings = EditorOptions.fontLigatures2.validate(opts.fontLigatures);
        const fontVariationSettings = EditorOptions.fontVariations.validate(opts.fontVariations);
        const lineHeight = EditorOptions.lineHeight.validate(opts.lineHeight);
        const letterSpacing = EditorOptions.letterSpacing.validate(opts.letterSpacing);
        return BareFontInfo._create(fontFamily, fontWeight, fontSize, fontFeatureSettings, fontVariationSettings, lineHeight, letterSpacing, pixelRatio, ignoreEditorZoom);
    }
    /**
     * @internal
     */
    static _create(fontFamily, fontWeight, fontSize, fontFeatureSettings, fontVariationSettings, lineHeight, letterSpacing, pixelRatio, ignoreEditorZoom) {
        if (lineHeight === 0) {
            lineHeight = GOLDEN_LINE_HEIGHT_RATIO * fontSize;
        }
        else if (lineHeight < MINIMUM_LINE_HEIGHT) {
            // Values too small to be line heights in pixels are in ems.
            lineHeight = lineHeight * fontSize;
        }
        // Enforce integer, minimum constraints
        lineHeight = Math.round(lineHeight);
        if (lineHeight < MINIMUM_LINE_HEIGHT) {
            lineHeight = MINIMUM_LINE_HEIGHT;
        }
        const editorZoomLevelMultiplier = 1 + (ignoreEditorZoom ? 0 : EditorZoom.getZoomLevel() * 0.1);
        fontSize *= editorZoomLevelMultiplier;
        lineHeight *= editorZoomLevelMultiplier;
        if (fontVariationSettings === EditorFontVariations.TRANSLATE) {
            if (fontWeight === 'normal' || fontWeight === 'bold') {
                fontVariationSettings = EditorFontVariations.OFF;
            }
            else {
                const fontWeightAsNumber = parseInt(fontWeight, 10);
                fontVariationSettings = `'wght' ${fontWeightAsNumber}`;
                fontWeight = 'normal';
            }
        }
        return new BareFontInfo({
            pixelRatio: pixelRatio,
            fontFamily: fontFamily,
            fontWeight: fontWeight,
            fontSize: fontSize,
            fontFeatureSettings: fontFeatureSettings,
            fontVariationSettings,
            lineHeight: lineHeight,
            letterSpacing: letterSpacing,
        });
    }
    /**
     * @internal
     */
    constructor(opts) {
        this._bareFontInfoBrand = undefined;
        this.pixelRatio = opts.pixelRatio;
        this.fontFamily = String(opts.fontFamily);
        this.fontWeight = String(opts.fontWeight);
        this.fontSize = opts.fontSize;
        this.fontFeatureSettings = opts.fontFeatureSettings;
        this.fontVariationSettings = opts.fontVariationSettings;
        this.lineHeight = opts.lineHeight | 0;
        this.letterSpacing = opts.letterSpacing;
    }
    /**
     * @internal
     */
    getId() {
        return `${this.pixelRatio}-${this.fontFamily}-${this.fontWeight}-${this.fontSize}-${this.fontFeatureSettings}-${this.fontVariationSettings}-${this.lineHeight}-${this.letterSpacing}`;
    }
    /**
     * @internal
     */
    getMassagedFontFamily() {
        const fallbackFontFamily = EDITOR_FONT_DEFAULTS.fontFamily;
        const fontFamily = BareFontInfo._wrapInQuotes(this.fontFamily);
        if (fallbackFontFamily && this.fontFamily !== fallbackFontFamily) {
            return `${fontFamily}, ${fallbackFontFamily}`;
        }
        return fontFamily;
    }
    static _wrapInQuotes(fontFamily) {
        if (/[,"']/.test(fontFamily)) {
            // Looks like the font family might be already escaped
            return fontFamily;
        }
        if (/[+ ]/.test(fontFamily)) {
            // Wrap a font family using + or <space> with quotes
            return `"${fontFamily}"`;
        }
        return fontFamily;
    }
}
// change this whenever `FontInfo` members are changed
export const SERIALIZED_FONT_INFO_VERSION = 2;
export class FontInfo extends BareFontInfo {
    /**
     * @internal
     */
    constructor(opts, isTrusted) {
        super(opts);
        this._editorStylingBrand = undefined;
        this.version = SERIALIZED_FONT_INFO_VERSION;
        this.isTrusted = isTrusted;
        this.isMonospace = opts.isMonospace;
        this.typicalHalfwidthCharacterWidth = opts.typicalHalfwidthCharacterWidth;
        this.typicalFullwidthCharacterWidth = opts.typicalFullwidthCharacterWidth;
        this.canUseHalfwidthRightwardsArrow = opts.canUseHalfwidthRightwardsArrow;
        this.spaceWidth = opts.spaceWidth;
        this.middotWidth = opts.middotWidth;
        this.wsmiddotWidth = opts.wsmiddotWidth;
        this.maxDigitWidth = opts.maxDigitWidth;
    }
    /**
     * @internal
     */
    equals(other) {
        return (this.fontFamily === other.fontFamily &&
            this.fontWeight === other.fontWeight &&
            this.fontSize === other.fontSize &&
            this.fontFeatureSettings === other.fontFeatureSettings &&
            this.fontVariationSettings === other.fontVariationSettings &&
            this.lineHeight === other.lineHeight &&
            this.letterSpacing === other.letterSpacing &&
            this.typicalHalfwidthCharacterWidth === other.typicalHalfwidthCharacterWidth &&
            this.typicalFullwidthCharacterWidth === other.typicalFullwidthCharacterWidth &&
            this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow &&
            this.spaceWidth === other.spaceWidth &&
            this.middotWidth === other.middotWidth &&
            this.wsmiddotWidth === other.wsmiddotWidth &&
            this.maxDigitWidth === other.maxDigitWidth);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9udEluZm8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvbmZpZy9mb250SW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsYUFBYSxFQUdiLG9CQUFvQixHQUNwQixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUU1Qzs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtBQUV6RTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtBQVNwQyxNQUFNLE9BQU8sWUFBWTtJQUd4Qjs7T0FFRztJQUNJLE1BQU0sQ0FBQywyQkFBMkIsQ0FDeEMsT0FBZ0MsRUFDaEMsVUFBa0IsRUFDbEIsZ0JBQXlCO1FBRXpCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF5QixDQUFBO1FBQ3ZELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF5QixDQUFBO1FBQ3ZELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGdDQUF1QixDQUFBO1FBQ25ELE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLEdBQUcscUNBQTRCLENBQUE7UUFDbkUsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMsR0FBRyxzQ0FBNkIsQ0FBQTtRQUN0RSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxrQ0FBeUIsQ0FBQTtRQUN2RCxNQUFNLGFBQWEsR0FBRyxPQUFP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
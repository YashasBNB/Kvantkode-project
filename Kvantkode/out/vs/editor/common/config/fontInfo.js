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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9udEluZm8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29uZmlnL2ZvbnRJbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixhQUFhLEVBR2Isb0JBQW9CLEdBQ3BCLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTVDOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0FBRXpFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxDQUFBO0FBU3BDLE1BQU0sT0FBTyxZQUFZO0lBR3hCOztPQUVHO0lBQ0ksTUFBTSxDQUFDLDJCQUEyQixDQUN4QyxPQUFnQyxFQUNoQyxVQUFrQixFQUNsQixnQkFBeUI7UUFFekIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXlCLENBQUE7UUFDdkQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXlCLENBQUE7UUFDdkQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsZ0NBQXVCLENBQUE7UUFDbkQsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsR0FBRyxxQ0FBNEIsQ0FBQTtRQUNuRSxNQUFNLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxHQUFHLHNDQUE2QixDQUFBO1FBQ3RFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF5QixDQUFBO1FBQ3ZELE1BQU0sYUFBYSxHQUFH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
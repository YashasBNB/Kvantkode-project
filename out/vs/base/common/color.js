/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function roundFloat(number, decimalPoints) {
    const decimal = Math.pow(10, decimalPoints);
    return Math.round(number * decimal) / decimal;
}
export class RGBA {
    constructor(r, g, b, a = 1) {
        this._rgbaBrand = undefined;
        this.r = Math.min(255, Math.max(0, r)) | 0;
        this.g = Math.min(255, Math.max(0, g)) | 0;
        this.b = Math.min(255, Math.max(0, b)) | 0;
        this.a = roundFloat(Math.max(Math.min(1, a), 0), 3);
    }
    static equals(a, b) {
        return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
    }
}
export class HSLA {
    constructor(h, s, l, a) {
        this._hslaBrand = undefined;
        this.h = Math.max(Math.min(360, h), 0) | 0;
        this.s = roundFloat(Math.max(Math.min(1, s), 0), 3);
        this.l = roundFloat(Math.max(Math.min(1, l), 0), 3);
        this.a = roundFloat(Math.max(Math.min(1, a), 0), 3);
    }
    static equals(a, b) {
        return a.h === b.h && a.s === b.s && a.l === b.l && a.a === b.a;
    }
    /**
     * Converts an RGB color value to HSL. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes r, g, and b are contained in the set [0, 255] and
     * returns h in the set [0, 360], s, and l in the set [0, 1].
     */
    static fromRGBA(rgba) {
        const r = rgba.r / 255;
        const g = rgba.g / 255;
        const b = rgba.b / 255;
        const a = rgba.a;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (min + max) / 2;
        const chroma = max - min;
        if (chroma > 0) {
            s = Math.min(l <= 0.5 ? chroma / (2 * l) : chroma / (2 - 2 * l), 1);
            switch (max) {
                case r:
                    h = (g - b) / chroma + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / chroma + 2;
                    break;
                case b:
                    h = (r - g) / chroma + 4;
                    break;
            }
            h *= 60;
            h = Math.round(h);
        }
        return new HSLA(h, s, l, a);
    }
    static _hue2rgb(p, q, t) {
        if (t < 0) {
            t += 1;
        }
        if (t > 1) {
            t -= 1;
        }
        if (t < 1 / 6) {
            return p + (q - p) * 6 * t;
        }
        if (t < 1 / 2) {
            return q;
        }
        if (t < 2 / 3) {
            return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
    }
    /**
     * Converts an HSL color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes h in the set [0, 360] s, and l are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     */
    static toRGBA(hsla) {
        const h = hsla.h / 360;
        const { s, l, a } = hsla;
        let r, g, b;
        if (s === 0) {
            r = g = b = l; // achromatic
        }
        else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = HSLA._hue2rgb(p, q, h + 1 / 3);
            g = HSLA._hue2rgb(p, q, h);
            b = HSLA._hue2rgb(p, q, h - 1 / 3);
        }
        return new RGBA(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), a);
    }
}
export class HSVA {
    constructor(h, s, v, a) {
        this._hsvaBrand = undefined;
        this.h = Math.max(Math.min(360, h), 0) | 0;
        this.s = roundFloat(Math.max(Math.min(1, s), 0), 3);
        this.v = roundFloat(Math.max(Math.min(1, v), 0), 3);
        this.a = roundFloat(Math.max(Math.min(1, a), 0), 3);
    }
    static equals(a, b) {
        return a.h === b.h && a.s === b.s && a.v === b.v && a.a === b.a;
    }
    // from http://www.rapidtables.com/convert/color/rgb-to-hsv.htm
    static fromRGBA(rgba) {
        const r = rgba.r / 255;
        const g = rgba.g / 255;
        const b = rgba.b / 255;
        const cmax = Math.max(r, g, b);
        const cmin = Math.min(r, g, b);
        const delta = cmax - cmin;
        const s = cmax === 0 ? 0 : delta / cmax;
        let m;
        if (delta === 0) {
            m = 0;
        }
        else if (cmax === r) {
            m = ((((g - b) / delta) % 6) + 6) % 6;
        }
        else if (cmax === g) {
            m = (b - r) / delta + 2;
        }
        else {
            m = (r - g) / delta + 4;
        }
        return new HSVA(Math.round(m * 60), s, cmax, rgba.a);
    }
    // from http://www.rapidtables.com/convert/color/hsv-to-rgb.htm
    static toRGBA(hsva) {
        const { h, s, v, a } = hsva;
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        let [r, g, b] = [0, 0, 0];
        if (h < 60) {
            r = c;
            g = x;
        }
        else if (h < 120) {
            r = x;
            g = c;
        }
        else if (h < 180) {
            g = c;
            b = x;
        }
        else if (h < 240) {
            g = x;
            b = c;
        }
        else if (h < 300) {
            r = x;
            b = c;
        }
        else if (h <= 360) {
            r = c;
            b = x;
        }
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        return new RGBA(r, g, b, a);
    }
}
export class Color {
    static fromHex(hex) {
        return Color.Format.CSS.parseHex(hex) || Color.red;
    }
    static equals(a, b) {
        if (!a && !b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.equals(b);
    }
    get hsla() {
        if (this._hsla) {
            return this._hsla;
        }
        else {
            return HSLA.fromRGBA(this.rgba);
        }
    }
    get hsva() {
        if (this._hsva) {
            return this._hsva;
        }
        return HSVA.fromRGBA(this.rgba);
    }
    constructor(arg) {
        if (!arg) {
            throw new Error('Color needs a value');
        }
        else if (arg instanceof RGBA) {
            this.rgba = arg;
        }
        else if (arg instanceof HSLA) {
            this._hsla = arg;
            this.rgba = HSLA.toRGBA(arg);
        }
        else if (arg instanceof HSVA) {
            this._hsva = arg;
            this.rgba = HSVA.toRGBA(arg);
        }
        else {
            throw new Error('Invalid color ctor argument');
        }
    }
    equals(other) {
        return (!!other &&
            RGBA.equals(this.rgba, other.rgba) &&
            HSLA.equals(this.hsla, other.hsla) &&
            HSVA.equals(this.hsva, other.hsva));
    }
    /**
     * http://www.w3.org/TR/WCAG20/#relativeluminancedef
     * Returns the number in the set [0, 1]. O => Darkest Black. 1 => Lightest white.
     */
    getRelativeLuminance() {
        const R = Color._relativeLuminanceForComponent(this.rgba.r);
        const G = Color._relativeLuminanceForComponent(this.rgba.g);
        const B = Color._relativeLuminanceForComponent(this.rgba.b);
        const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        return roundFloat(luminance, 4);
    }
    /**
     * Reduces the "foreground" color on this "background" color unti it is
     * below the relative luminace ratio.
     * @returns the new foreground color
     * @see https://github.com/xtermjs/xterm.js/blob/44f9fa39ae03e2ca6d28354d88a399608686770e/src/common/Color.ts#L315
     */
    reduceRelativeLuminace(foreground, ratio) {
        // This is a naive but fast approach to reducing luminance as converting to
        // HSL and back is expensive
        let { r: fgR, g: fgG, b: fgB } = foreground.rgba;
        let cr = this.getContrastRatio(foreground);
        while (cr < ratio && (fgR > 0 || fgG > 0 || fgB > 0)) {
            // Reduce by 10% until the ratio is hit
            fgR -= Math.max(0, Math.ceil(fgR * 0.1));
            fgG -= Math.max(0, Math.ceil(fgG * 0.1));
            fgB -= Math.max(0, Math.ceil(fgB * 0.1));
            cr = this.getContrastRatio(new Color(new RGBA(fgR, fgG, fgB)));
        }
        return new Color(new RGBA(fgR, fgG, fgB));
    }
    /**
     * Increases the "foreground" color on this "background" color unti it is
     * below the relative luminace ratio.
     * @returns the new foreground color
     * @see https://github.com/xtermjs/xterm.js/blob/44f9fa39ae03e2ca6d28354d88a399608686770e/src/common/Color.ts#L335
     */
    increaseRelativeLuminace(foreground, ratio) {
        // This is a naive but fast approach to reducing luminance as converting to
        // HSL and back is expensive
        let { r: fgR, g: fgG, b: fgB } = foreground.rgba;
        let cr = this.getContrastRatio(foreground);
        while (cr < ratio && (fgR < 0xff || fgG < 0xff || fgB < 0xff)) {
            fgR = Math.min(0xff, fgR + Math.ceil((255 - fgR) * 0.1));
            fgG = Math.min(0xff, fgG + Math.ceil((255 - fgG) * 0.1));
            fgB = Math.min(0xff, fgB + Math.ceil((255 - fgB) * 0.1));
            cr = this.getContrastRatio(new Color(new RGBA(fgR, fgG, fgB)));
        }
        return new Color(new RGBA(fgR, fgG, fgB));
    }
    static _relativeLuminanceForComponent(color) {
        const c = color / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    /**
     * http://www.w3.org/TR/WCAG20/#contrast-ratiodef
     * Returns the contrast ration number in the set [1, 21].
     */
    getContrastRatio(another) {
        const lum1 = this.getRelativeLuminance();
        const lum2 = another.getRelativeLuminance();
        return lum1 > lum2 ? (lum1 + 0.05) / (lum2 + 0.05) : (lum2 + 0.05) / (lum1 + 0.05);
    }
    /**
     *	http://24ways.org/2010/calculating-color-contrast
     *  Return 'true' if darker color otherwise 'false'
     */
    isDarker() {
        const yiq = (this.rgba.r * 299 + this.rgba.g * 587 + this.rgba.b * 114) / 1000;
        return yiq < 128;
    }
    /**
     *	http://24ways.org/2010/calculating-color-contrast
     *  Return 'true' if lighter color otherwise 'false'
     */
    isLighter() {
        const yiq = (this.rgba.r * 299 + this.rgba.g * 587 + this.rgba.b * 114) / 1000;
        return yiq >= 128;
    }
    isLighterThan(another) {
        const lum1 = this.getRelativeLuminance();
        const lum2 = another.getRelativeLuminance();
        return lum1 > lum2;
    }
    isDarkerThan(another) {
        const lum1 = this.getRelativeLuminance();
        const lum2 = another.getRelativeLuminance();
        return lum1 < lum2;
    }
    /**
     * Based on xterm.js: https://github.com/xtermjs/xterm.js/blob/44f9fa39ae03e2ca6d28354d88a399608686770e/src/common/Color.ts#L288
     *
     * Given a foreground color and a background color, either increase or reduce the luminance of the
     * foreground color until the specified contrast ratio is met. If pure white or black is hit
     * without the contrast ratio being met, go the other direction using the background color as the
     * foreground color and take either the first or second result depending on which has the higher
     * contrast ratio.
     *
     * @param foreground The foreground color.
     * @param ratio The contrast ratio to achieve.
     * @returns The adjusted foreground color.
     */
    ensureConstrast(foreground, ratio) {
        const bgL = this.getRelativeLuminance();
        const fgL = foreground.getRelativeLuminance();
        const cr = this.getContrastRatio(foreground);
        if (cr < ratio) {
            if (fgL < bgL) {
                const resultA = this.reduceRelativeLuminace(foreground, ratio);
                const resultARatio = this.getContrastRatio(resultA);
                if (resultARatio < ratio) {
                    const resultB = this.increaseRelativeLuminace(foreground, ratio);
                    const resultBRatio = this.getContrastRatio(resultB);
                    return resultARatio > resultBRatio ? resultA : resultB;
                }
                return resultA;
            }
            const resultA = this.increaseRelativeLuminace(foreground, ratio);
            const resultARatio = this.getContrastRatio(resultA);
            if (resultARatio < ratio) {
                const resultB = this.reduceRelativeLuminace(foreground, ratio);
                const resultBRatio = this.getContrastRatio(resultB);
                return resultARatio > resultBRatio ? resultA : resultB;
            }
            return resultA;
        }
        return foreground;
    }
    lighten(factor) {
        return new Color(new HSLA(this.hsla.h, this.hsla.s, this.hsla.l + this.hsla.l * factor, this.hsla.a));
    }
    darken(factor) {
        return new Color(new HSLA(this.hsla.h, this.hsla.s, this.hsla.l - this.hsla.l * factor, this.hsla.a));
    }
    transparent(factor) {
        const { r, g, b, a } = this.rgba;
        return new Color(new RGBA(r, g, b, a * factor));
    }
    isTransparent() {
        return this.rgba.a === 0;
    }
    isOpaque() {
        return this.rgba.a === 1;
    }
    opposite() {
        return new Color(new RGBA(255 - this.rgba.r, 255 - this.rgba.g, 255 - this.rgba.b, this.rgba.a));
    }
    blend(c) {
        const rgba = c.rgba;
        // Convert to 0..1 opacity
        const thisA = this.rgba.a;
        const colorA = rgba.a;
        const a = thisA + colorA * (1 - thisA);
        if (a < 1e-6) {
            return Color.transparent;
        }
        const r = (this.rgba.r * thisA) / a + (rgba.r * colorA * (1 - thisA)) / a;
        const g = (this.rgba.g * thisA) / a + (rgba.g * colorA * (1 - thisA)) / a;
        const b = (this.rgba.b * thisA) / a + (rgba.b * colorA * (1 - thisA)) / a;
        return new Color(new RGBA(r, g, b, a));
    }
    makeOpaque(opaqueBackground) {
        if (this.isOpaque() || opaqueBackground.rgba.a !== 1) {
            // only allow to blend onto a non-opaque color onto a opaque color
            return this;
        }
        const { r, g, b, a } = this.rgba;
        // https://stackoverflow.com/questions/12228548/finding-equivalent-color-with-opacity
        return new Color(new RGBA(opaqueBackground.rgba.r - a * (opaqueBackground.rgba.r - r), opaqueBackground.rgba.g - a * (opaqueBackground.rgba.g - g), opaqueBackground.rgba.b - a * (opaqueBackground.rgba.b - b), 1));
    }
    flatten(...backgrounds) {
        const background = backgrounds.reduceRight((accumulator, color) => {
            return Color._flatten(color, accumulator);
        });
        return Color._flatten(this, background);
    }
    static _flatten(foreground, background) {
        const backgroundAlpha = 1 - foreground.rgba.a;
        return new Color(new RGBA(backgroundAlpha * background.rgba.r + foreground.rgba.a * foreground.rgba.r, backgroundAlpha * background.rgba.g + foreground.rgba.a * foreground.rgba.g, backgroundAlpha * background.rgba.b + foreground.rgba.a * foreground.rgba.b));
    }
    toString() {
        if (!this._toString) {
            this._toString = Color.Format.CSS.format(this);
        }
        return this._toString;
    }
    toNumber32Bit() {
        if (!this._toNumber32Bit) {
            this._toNumber32Bit =
                ((this.rgba.r /*  */ << 24) |
                    (this.rgba.g /*  */ << 16) |
                    (this.rgba.b /*  */ << 8) |
                    ((this.rgba.a * 0xff) << 0)) >>>
                    0;
        }
        return this._toNumber32Bit;
    }
    static getLighterColor(of, relative, factor) {
        if (of.isLighterThan(relative)) {
            return of;
        }
        factor = factor ? factor : 0.5;
        const lum1 = of.getRelativeLuminance();
        const lum2 = relative.getRelativeLuminance();
        factor = (factor * (lum2 - lum1)) / lum2;
        return of.lighten(factor);
    }
    static getDarkerColor(of, relative, factor) {
        if (of.isDarkerThan(relative)) {
            return of;
        }
        factor = factor ? factor : 0.5;
        const lum1 = of.getRelativeLuminance();
        const lum2 = relative.getRelativeLuminance();
        factor = (factor * (lum1 - lum2)) / lum1;
        return of.darken(factor);
    }
    static { this.white = new Color(new RGBA(255, 255, 255, 1)); }
    static { this.black = new Color(new RGBA(0, 0, 0, 1)); }
    static { this.red = new Color(new RGBA(255, 0, 0, 1)); }
    static { this.blue = new Color(new RGBA(0, 0, 255, 1)); }
    static { this.green = new Color(new RGBA(0, 255, 0, 1)); }
    static { this.cyan = new Color(new RGBA(0, 255, 255, 1)); }
    static { this.lightgrey = new Color(new RGBA(211, 211, 211, 1)); }
    static { this.transparent = new Color(new RGBA(0, 0, 0, 0)); }
}
(function (Color) {
    let Format;
    (function (Format) {
        let CSS;
        (function (CSS) {
            function formatRGB(color) {
                if (color.rgba.a === 1) {
                    return `rgb(${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b})`;
                }
                return Color.Format.CSS.formatRGBA(color);
            }
            CSS.formatRGB = formatRGB;
            function formatRGBA(color) {
                return `rgba(${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b}, ${+color.rgba.a.toFixed(2)})`;
            }
            CSS.formatRGBA = formatRGBA;
            function formatHSL(color) {
                if (color.hsla.a === 1) {
                    return `hsl(${color.hsla.h}, ${(color.hsla.s * 100).toFixed(2)}%, ${(color.hsla.l * 100).toFixed(2)}%)`;
                }
                return Color.Format.CSS.formatHSLA(color);
            }
            CSS.formatHSL = formatHSL;
            function formatHSLA(color) {
                return `hsla(${color.hsla.h}, ${(color.hsla.s * 100).toFixed(2)}%, ${(color.hsla.l * 100).toFixed(2)}%, ${color.hsla.a.toFixed(2)})`;
            }
            CSS.formatHSLA = formatHSLA;
            function _toTwoDigitHex(n) {
                const r = n.toString(16);
                return r.length !== 2 ? '0' + r : r;
            }
            /**
             * Formats the color as #RRGGBB
             */
            function formatHex(color) {
                return `#${_toTwoDigitHex(color.rgba.r)}${_toTwoDigitHex(color.rgba.g)}${_toTwoDigitHex(color.rgba.b)}`;
            }
            CSS.formatHex = formatHex;
            /**
             * Formats the color as #RRGGBBAA
             * If 'compact' is set, colors without transparancy will be printed as #RRGGBB
             */
            function formatHexA(color, compact = false) {
                if (compact && color.rgba.a === 1) {
                    return Color.Format.CSS.formatHex(color);
                }
                return `#${_toTwoDigitHex(color.rgba.r)}${_toTwoDigitHex(color.rgba.g)}${_toTwoDigitHex(color.rgba.b)}${_toTwoDigitHex(Math.round(color.rgba.a * 255))}`;
            }
            CSS.formatHexA = formatHexA;
            /**
             * The default format will use HEX if opaque and RGBA otherwise.
             */
            function format(color) {
                if (color.isOpaque()) {
                    return Color.Format.CSS.formatHex(color);
                }
                return Color.Format.CSS.formatRGBA(color);
            }
            CSS.format = format;
            /**
             * Parse a CSS color and return a {@link Color}.
             * @param css The CSS color to parse.
             * @see https://drafts.csswg.org/css-color/#typedef-color
             */
            function parse(css) {
                if (css === 'transparent') {
                    return Color.transparent;
                }
                if (css.startsWith('#')) {
                    return parseHex(css);
                }
                if (css.startsWith('rgba(')) {
                    const color = css.match(/rgba\((?<r>(?:\+|-)?\d+), *(?<g>(?:\+|-)?\d+), *(?<b>(?:\+|-)?\d+), *(?<a>(?:\+|-)?\d+(\.\d+)?)\)/);
                    if (!color) {
                        throw new Error('Invalid color format ' + css);
                    }
                    const r = parseInt(color.groups?.r ?? '0');
                    const g = parseInt(color.groups?.g ?? '0');
                    const b = parseInt(color.groups?.b ?? '0');
                    const a = parseFloat(color.groups?.a ?? '0');
                    return new Color(new RGBA(r, g, b, a));
                }
                if (css.startsWith('rgb(')) {
                    const color = css.match(/rgb\((?<r>(?:\+|-)?\d+), *(?<g>(?:\+|-)?\d+), *(?<b>(?:\+|-)?\d+)\)/);
                    if (!color) {
                        throw new Error('Invalid color format ' + css);
                    }
                    const r = parseInt(color.groups?.r ?? '0');
                    const g = parseInt(color.groups?.g ?? '0');
                    const b = parseInt(color.groups?.b ?? '0');
                    return new Color(new RGBA(r, g, b));
                }
                // TODO: Support more formats as needed
                return parseNamedKeyword(css);
            }
            CSS.parse = parse;
            function parseNamedKeyword(css) {
                // https://drafts.csswg.org/css-color/#named-colors
                switch (css) {
                    case 'aliceblue':
                        return new Color(new RGBA(240, 248, 255, 1));
                    case 'antiquewhite':
                        return new Color(new RGBA(250, 235, 215, 1));
                    case 'aqua':
                        return new Color(new RGBA(0, 255, 255, 1));
                    case 'aquamarine':
                        return new Color(new RGBA(127, 255, 212, 1));
                    case 'azure':
                        return new Color(new RGBA(240, 255, 255, 1));
                    case 'beige':
                        return new Color(new RGBA(245, 245, 220, 1));
                    case 'bisque':
                        return new Color(new RGBA(255, 228, 196, 1));
                    case 'black':
                        return new Color(new RGBA(0, 0, 0, 1));
                    case 'blanchedalmond':
                        return new Color(new RGBA(255, 235, 205, 1));
                    case 'blue':
                        return new Color(new RGBA(0, 0, 255, 1));
                    case 'blueviolet':
                        return new Color(new RGBA(138, 43, 226, 1));
                    case 'brown':
                        return new Color(new RGBA(165, 42, 42, 1));
                    case 'burlywood':
                        return new Color(new RGBA(222, 184, 135, 1));
                    case 'cadetblue':
                        return new Color(new RGBA(95, 158, 160, 1));
                    case 'chartreuse':
                        return new Color(new RGBA(127, 255, 0, 1));
                    case 'chocolate':
                        return new Color(new RGBA(210, 105, 30, 1));
                    case 'coral':
                        return new Color(new RGBA(255, 127, 80, 1));
                    case 'cornflowerblue':
                        return new Color(new RGBA(100, 149, 237, 1));
                    case 'cornsilk':
                        return new Color(new RGBA(255, 248, 220, 1));
                    case 'crimson':
                        return new Color(new RGBA(220, 20, 60, 1));
                    case 'cyan':
                        return new Color(new RGBA(0, 255, 255, 1));
                    case 'darkblue':
                        return new Color(new RGBA(0, 0, 139, 1));
                    case 'darkcyan':
                        return new Color(new RGBA(0, 139, 139, 1));
                    case 'darkgoldenrod':
                        return new Color(new RGBA(184, 134, 11, 1));
                    case 'darkgray':
                        return new Color(new RGBA(169, 169, 169, 1));
                    case 'darkgreen':
                        return new Color(new RGBA(0, 100, 0, 1));
                    case 'darkgrey':
                        return new Color(new RGBA(169, 169, 169, 1));
                    case 'darkkhaki':
                        return new Color(new RGBA(189, 183, 107, 1));
                    case 'darkmagenta':
                        return new Color(new RGBA(139, 0, 139, 1));
                    case 'darkolivegreen':
                        return new Color(new RGBA(85, 107, 47, 1));
                    case 'darkorange':
                        return new Color(new RGBA(255, 140, 0, 1));
                    case 'darkorchid':
                        return new Color(new RGBA(153, 50, 204, 1));
                    case 'darkred':
                        return new Color(new RGBA(139, 0, 0, 1));
                    case 'darksalmon':
                        return new Color(new RGBA(233, 150, 122, 1));
                    case 'darkseagreen':
                        return new Color(new RGBA(143, 188, 143, 1));
                    case 'darkslateblue':
                        return new Color(new RGBA(72, 61, 139, 1));
                    case 'darkslategray':
                        return new Color(new RGBA(47, 79, 79, 1));
                    case 'darkslategrey':
                        return new Color(new RGBA(47, 79, 79, 1));
                    case 'darkturquoise':
                        return new Color(new RGBA(0, 206, 209, 1));
                    case 'darkviolet':
                        return new Color(new RGBA(148, 0, 211, 1));
                    case 'deeppink':
                        return new Color(new RGBA(255, 20, 147, 1));
                    case 'deepskyblue':
                        return new Color(new RGBA(0, 191, 255, 1));
                    case 'dimgray':
                        return new Color(new RGBA(105, 105, 105, 1));
                    case 'dimgrey':
                        return new Color(new RGBA(105, 105, 105, 1));
                    case 'dodgerblue':
                        return new Color(new RGBA(30, 144, 255, 1));
                    case 'firebrick':
                        return new Color(new RGBA(178, 34, 34, 1));
                    case 'floralwhite':
                        return new Color(new RGBA(255, 250, 240, 1));
                    case 'forestgreen':
                        return new Color(new RGBA(34, 139, 34, 1));
                    case 'fuchsia':
                        return new Color(new RGBA(255, 0, 255, 1));
                    case 'gainsboro':
                        return new Color(new RGBA(220, 220, 220, 1));
                    case 'ghostwhite':
                        return new Color(new RGBA(248, 248, 255, 1));
                    case 'gold':
                        return new Color(new RGBA(255, 215, 0, 1));
                    case 'goldenrod':
                        return new Color(new RGBA(218, 165, 32, 1));
                    case 'gray':
                        return new Color(new RGBA(128, 128, 128, 1));
                    case 'green':
                        return new Color(new RGBA(0, 128, 0, 1));
                    case 'greenyellow':
                        return new Color(new RGBA(173, 255, 47, 1));
                    case 'grey':
                        return new Color(new RGBA(128, 128, 128, 1));
                    case 'honeydew':
                        return new Color(new RGBA(240, 255, 240, 1));
                    case 'hotpink':
                        return new Color(new RGBA(255, 105, 180, 1));
                    case 'indianred':
                        return new Color(new RGBA(205, 92, 92, 1));
                    case 'indigo':
                        return new Color(new RGBA(75, 0, 130, 1));
                    case 'ivory':
                        return new Color(new RGBA(255, 255, 240, 1));
                    case 'khaki':
                        return new Color(new RGBA(240, 230, 140, 1));
                    case 'lavender':
                        return new Color(new RGBA(230, 230, 250, 1));
                    case 'lavenderblush':
                        return new Color(new RGBA(255, 240, 245, 1));
                    case 'lawngreen':
                        return new Color(new RGBA(124, 252, 0, 1));
                    case 'lemonchiffon':
                        return new Color(new RGBA(255, 250, 205, 1));
                    case 'lightblue':
                        return new Color(new RGBA(173, 216, 230, 1));
                    case 'lightcoral':
                        return new Color(new RGBA(240, 128, 128, 1));
                    case 'lightcyan':
                        return new Color(new RGBA(224, 255, 255, 1));
                    case 'lightgoldenrodyellow':
                        return new Color(new RGBA(250, 250, 210, 1));
                    case 'lightgray':
                        return new Color(new RGBA(211, 211, 211, 1));
                    case 'lightgreen':
                        return new Color(new RGBA(144, 238, 144, 1));
                    case 'lightgrey':
                        return new Color(new RGBA(211, 211, 211, 1));
                    case 'lightpink':
                        return new Color(new RGBA(255, 182, 193, 1));
                    case 'lightsalmon':
                        return new Color(new RGBA(255, 160, 122, 1));
                    case 'lightseagreen':
                        return new Color(new RGBA(32, 178, 170, 1));
                    case 'lightskyblue':
                        return new Color(new RGBA(135, 206, 250, 1));
                    case 'lightslategray':
                        return new Color(new RGBA(119, 136, 153, 1));
                    case 'lightslategrey':
                        return new Color(new RGBA(119, 136, 153, 1));
                    case 'lightsteelblue':
                        return new Color(new RGBA(176, 196, 222, 1));
                    case 'lightyellow':
                        return new Color(new RGBA(255, 255, 224, 1));
                    case 'lime':
                        return new Color(new RGBA(0, 255, 0, 1));
                    case 'limegreen':
                        return new Color(new RGBA(50, 205, 50, 1));
                    case 'linen':
                        return new Color(new RGBA(250, 240, 230, 1));
                    case 'magenta':
                        return new Color(new RGBA(255, 0, 255, 1));
                    case 'maroon':
                        return new Color(new RGBA(128, 0, 0, 1));
                    case 'mediumaquamarine':
                        return new Color(new RGBA(102, 205, 170, 1));
                    case 'mediumblue':
                        return new Color(new RGBA(0, 0, 205, 1));
                    case 'mediumorchid':
                        return new Color(new RGBA(186, 85, 211, 1));
                    case 'mediumpurple':
                        return new Color(new RGBA(147, 112, 219, 1));
                    case 'mediumseagreen':
                        return new Color(new RGBA(60, 179, 113, 1));
                    case 'mediumslateblue':
                        return new Color(new RGBA(123, 104, 238, 1));
                    case 'mediumspringgreen':
                        return new Color(new RGBA(0, 250, 154, 1));
                    case 'mediumturquoise':
                        return new Color(new RGBA(72, 209, 204, 1));
                    case 'mediumvioletred':
                        return new Color(new RGBA(199, 21, 133, 1));
                    case 'midnightblue':
                        return new Color(new RGBA(25, 25, 112, 1));
                    case 'mintcream':
                        return new Color(new RGBA(245, 255, 250, 1));
                    case 'mistyrose':
                        return new Color(new RGBA(255, 228, 225, 1));
                    case 'moccasin':
                        return new Color(new RGBA(255, 228, 181, 1));
                    case 'navajowhite':
                        return new Color(new RGBA(255, 222, 173, 1));
                    case 'navy':
                        return new Color(new RGBA(0, 0, 128, 1));
                    case 'oldlace':
                        return new Color(new RGBA(253, 245, 230, 1));
                    case 'olive':
                        return new Color(new RGBA(128, 128, 0, 1));
                    case 'olivedrab':
                        return new Color(new RGBA(107, 142, 35, 1));
                    case 'orange':
                        return new Color(new RGBA(255, 165, 0, 1));
                    case 'orangered':
                        return new Color(new RGBA(255, 69, 0, 1));
                    case 'orchid':
                        return new Color(new RGBA(218, 112, 214, 1));
                    case 'palegoldenrod':
                        return new Color(new RGBA(238, 232, 170, 1));
                    case 'palegreen':
                        return new Color(new RGBA(152, 251, 152, 1));
                    case 'paleturquoise':
                        return new Color(new RGBA(175, 238, 238, 1));
                    case 'palevioletred':
                        return new Color(new RGBA(219, 112, 147, 1));
                    case 'papayawhip':
                        return new Color(new RGBA(255, 239, 213, 1));
                    case 'peachpuff':
                        return new Color(new RGBA(255, 218, 185, 1));
                    case 'peru':
                        return new Color(new RGBA(205, 133, 63, 1));
                    case 'pink':
                        return new Color(new RGBA(255, 192, 203, 1));
                    case 'plum':
                        return new Color(new RGBA(221, 160, 221, 1));
                    case 'powderblue':
                        return new Color(new RGBA(176, 224, 230, 1));
                    case 'purple':
                        return new Color(new RGBA(128, 0, 128, 1));
                    case 'rebeccapurple':
                        return new Color(new RGBA(102, 51, 153, 1));
                    case 'red':
                        return new Color(new RGBA(255, 0, 0, 1));
                    case 'rosybrown':
                        return new Color(new RGBA(188, 143, 143, 1));
                    case 'royalblue':
                        return new Color(new RGBA(65, 105, 225, 1));
                    case 'saddlebrown':
                        return new Color(new RGBA(139, 69, 19, 1));
                    case 'salmon':
                        return new Color(new RGBA(250, 128, 114, 1));
                    case 'sandybrown':
                        return new Color(new RGBA(244, 164, 96, 1));
                    case 'seagreen':
                        return new Color(new RGBA(46, 139, 87, 1));
                    case 'seashell':
                        return new Color(new RGBA(255, 245, 238, 1));
                    case 'sienna':
                        return new Color(new RGBA(160, 82, 45, 1));
                    case 'silver':
                        return new Color(new RGBA(192, 192, 192, 1));
                    case 'skyblue':
                        return new Color(new RGBA(135, 206, 235, 1));
                    case 'slateblue':
                        return new Color(new RGBA(106, 90, 205, 1));
                    case 'slategray':
                        return new Color(new RGBA(112, 128, 144, 1));
                    case 'slategrey':
                        return new Color(new RGBA(112, 128, 144, 1));
                    case 'snow':
                        return new Color(new RGBA(255, 250, 250, 1));
                    case 'springgreen':
                        return new Color(new RGBA(0, 255, 127, 1));
                    case 'steelblue':
                        return new Color(new RGBA(70, 130, 180, 1));
                    case 'tan':
                        return new Color(new RGBA(210, 180, 140, 1));
                    case 'teal':
                        return new Color(new RGBA(0, 128, 128, 1));
                    case 'thistle':
                        return new Color(new RGBA(216, 191, 216, 1));
                    case 'tomato':
                        return new Color(new RGBA(255, 99, 71, 1));
                    case 'turquoise':
                        return new Color(new RGBA(64, 224, 208, 1));
                    case 'violet':
                        return new Color(new RGBA(238, 130, 238, 1));
                    case 'wheat':
                        return new Color(new RGBA(245, 222, 179, 1));
                    case 'white':
                        return new Color(new RGBA(255, 255, 255, 1));
                    case 'whitesmoke':
                        return new Color(new RGBA(245, 245, 245, 1));
                    case 'yellow':
                        return new Color(new RGBA(255, 255, 0, 1));
                    case 'yellowgreen':
                        return new Color(new RGBA(154, 205, 50, 1));
                    default:
                        return null;
                }
            }
            /**
             * Converts an Hex color value to a Color.
             * returns r, g, and b are contained in the set [0, 255]
             * @param hex string (#RGB, #RGBA, #RRGGBB or #RRGGBBAA).
             */
            function parseHex(hex) {
                const length = hex.length;
                if (length === 0) {
                    // Invalid color
                    return null;
                }
                if (hex.charCodeAt(0) !== 35 /* CharCode.Hash */) {
                    // Does not begin with a #
                    return null;
                }
                if (length === 7) {
                    // #RRGGBB format
                    const r = 16 * _parseHexDigit(hex.charCodeAt(1)) + _parseHexDigit(hex.charCodeAt(2));
                    const g = 16 * _parseHexDigit(hex.charCodeAt(3)) + _parseHexDigit(hex.charCodeAt(4));
                    const b = 16 * _parseHexDigit(hex.charCodeAt(5)) + _parseHexDigit(hex.charCodeAt(6));
                    return new Color(new RGBA(r, g, b, 1));
                }
                if (length === 9) {
                    // #RRGGBBAA format
                    const r = 16 * _parseHexDigit(hex.charCodeAt(1)) + _parseHexDigit(hex.charCodeAt(2));
                    const g = 16 * _parseHexDigit(hex.charCodeAt(3)) + _parseHexDigit(hex.charCodeAt(4));
                    const b = 16 * _parseHexDigit(hex.charCodeAt(5)) + _parseHexDigit(hex.charCodeAt(6));
                    const a = 16 * _parseHexDigit(hex.charCodeAt(7)) + _parseHexDigit(hex.charCodeAt(8));
                    return new Color(new RGBA(r, g, b, a / 255));
                }
                if (length === 4) {
                    // #RGB format
                    const r = _parseHexDigit(hex.charCodeAt(1));
                    const g = _parseHexDigit(hex.charCodeAt(2));
                    const b = _parseHexDigit(hex.charCodeAt(3));
                    return new Color(new RGBA(16 * r + r, 16 * g + g, 16 * b + b));
                }
                if (length === 5) {
                    // #RGBA format
                    const r = _parseHexDigit(hex.charCodeAt(1));
                    const g = _parseHexDigit(hex.charCodeAt(2));
                    const b = _parseHexDigit(hex.charCodeAt(3));
                    const a = _parseHexDigit(hex.charCodeAt(4));
                    return new Color(new RGBA(16 * r + r, 16 * g + g, 16 * b + b, (16 * a + a) / 255));
                }
                // Invalid color
                return null;
            }
            CSS.parseHex = parseHex;
            function _parseHexDigit(charCode) {
                switch (charCode) {
                    case 48 /* CharCode.Digit0 */:
                        return 0;
                    case 49 /* CharCode.Digit1 */:
                        return 1;
                    case 50 /* CharCode.Digit2 */:
                        return 2;
                    case 51 /* CharCode.Digit3 */:
                        return 3;
                    case 52 /* CharCode.Digit4 */:
                        return 4;
                    case 53 /* CharCode.Digit5 */:
                        return 5;
                    case 54 /* CharCode.Digit6 */:
                        return 6;
                    case 55 /* CharCode.Digit7 */:
                        return 7;
                    case 56 /* CharCode.Digit8 */:
                        return 8;
                    case 57 /* CharCode.Digit9 */:
                        return 9;
                    case 97 /* CharCode.a */:
                        return 10;
                    case 65 /* CharCode.A */:
                        return 10;
                    case 98 /* CharCode.b */:
                        return 11;
                    case 66 /* CharCode.B */:
                        return 11;
                    case 99 /* CharCode.c */:
                        return 12;
                    case 67 /* CharCode.C */:
                        return 12;
                    case 100 /* CharCode.d */:
                        return 13;
                    case 68 /* CharCode.D */:
                        return 13;
                    case 101 /* CharCode.e */:
                        return 14;
                    case 69 /* CharCode.E */:
                        return 14;
                    case 102 /* CharCode.f */:
                        return 15;
                    case 70 /* CharCode.F */:
                        return 15;
                }
                return 0;
            }
        })(CSS = Format.CSS || (Format.CSS = {}));
    })(Format = Color.Format || (Color.Format = {}));
})(Color || (Color = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9jb2xvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxTQUFTLFVBQVUsQ0FBQyxNQUFjLEVBQUUsYUFBcUI7SUFDeEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDM0MsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUE7QUFDOUMsQ0FBQztBQUVELE1BQU0sT0FBTyxJQUFJO0lBdUJoQixZQUFZLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUyxFQUFFLElBQVksQ0FBQztRQXRCMUQsZUFBVSxHQUFTLFNBQVMsQ0FBQTtRQXVCM0IsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMxQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDMUMsSUFBSSxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFD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SUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzFCLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNuQyxDQUFDO1FBRUQsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sSUFBSTtJQXVCaEIsWUFBWSxDQUFTLEVBQUUsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTO1FBdEJ0RCxlQUFVLEdBQVMsU0FBUyxDQUFBO1FBdUIzQixJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzFDLElBQUksQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxJQUFJLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FB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WUFDWixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ0wsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNOLENBQUM7YUFBTSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNwQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ0wsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNOLENBQUM7YUFBTSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNwQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ0wsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNOLENBQUM7YUFBTSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNwQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ0wsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNOLENBQUM7YUFBTSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNwQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ0wsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNOLENBQUM7YUFBTSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNyQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ0wsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNOLENBQUM7UUFFRCxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUM3QixDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUM3QixDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUU3QixPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzVCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxLQUFLO0lBQ2pCLE1BQU0s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RyxDQUFBO29CQUNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDWixNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxDQUFBO29CQUMvQyxDQUFDO29CQUNELE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtvQkFDMUMsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO29CQUMxQyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7b0JBQzFDLE1BQU0sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtvQkFDNUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN2QyxDQUFDO2dCQUNELElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUM1QixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUN0QixxRUFBcUUsQ0FDckUsQ0FBQTtvQkFDRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsR0FBRyxHQUFHLENBQUMsQ0FBQTtvQkFDL0MsQ0FBQztvQkFDRCxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7b0JBQzFDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtvQkFDMUMsTUFBTSxDQUFDLEdBQUcsUUFB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QyxDQUFDLENBQUMsQ0FBQTtvQkFDNUMsS0FBSyxZQUFZO3dCQUNoQixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQzNDLEtBQUssV0FBVzt3QkFDZixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQzVDLEtBQUssT0FBTzt3QkFDWCxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQzVDLEtBQUssZ0JBQWdCO3dCQUNwQixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQzdDLEtBQUssVUFBVTt3QkFDZCxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQzdDLEtBQUssU0FBUzt3QkFDYixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQzNDLEtBQUssTUFBTTt3QkFDVixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQzNDLEtBQUssVUFBVTt3QkFDZCxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3pDLEtBQUssVUFB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SSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDNUMsS0FBSyxNQUFNO3dCQUNWLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDN0MsS0FBSyxVQUFVO3dCQUNkLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDN0MsS0FBSyxTQUFTO3dCQUNiLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDN0MsS0FBSyxXQUFXO3dCQUNmLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDM0MsS0FBSyxRQUFRO3dCQUNaLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDMUMsS0FBSyxPQUFPO3dCQUNYLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDN0MsS0FBSyxPQUFPO3dCQUNYLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDN0MsS0FBSyxVQUFVO3dCQUNkLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFF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YyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDM0MsTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDM0MsTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDM0MsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQy9ELENBQUM7Z0JBRUQsSUFBSSxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2xCLGVBQWU7b0JBQ2YsTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDM0MsTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDM0MsTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDM0MsTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDM0MsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDbkYsQ0FBQztnQkFFRCxnQkFBZ0I7Z0JBQ2hCLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQWpEZSxZQUFRLFdBaUR2QixDQUFBO1lBRUQsU0FBUyxjQUFjLENBQUMsUUFBa0I7Z0JBQ3pDLFFBQVEsUUFBUSxFQUFFLENBQUM7b0JBQ2xCO3dCQUNDLE9BQU8sQ0FBQyxDQUFBO29CQUNUO3dCQUNDLE9BQU8sQ0FBQyxDQUFBO29CQUNUO3dCQUNDLE9BQU8sQ0FBQyxDQUFBO29CQUNUO3dCQUNDLE9BQU8sQ0FBQyxDQUFBO29CQUNUO3dCQUNDLE9BQU8sQ0FBQyxDQUFBO29CQUNUO3dCQUNDLE9BQU8sQ0FBQyxDQUFBO29CQUNUO3dCQUNDLE9BQU8sQ0FBQyxDQUFBO29CQUNUO3dCQUNDLE9BQU8sQ0FBQyxDQUFBO29CQUNUO3dCQUNDLE9BQU8sQ0FBQyxDQUFBO29CQUNUO3dCQUNDLE9BQU8sQ0FBQyxDQUFBO29CQUNUO3dCQUNDLE9BQU8sRUFBRSxDQUFBO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxDQUFBO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxDQUFBO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxDQUFBO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxDQUFBO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxDQUFBO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxDQUFBO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxDQUFBO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxDQUFBO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxDQUFBO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxDQUFBO29CQUNWO3dCQUNDLE9BQU8sRUFBRSxDQUFBO2dCQUNYLENBQUM7Z0JBQ0QsT0FBTyxDQUFDLENBQUE7WUFDVCxDQUFDO1FBQ0YsQ0FBQyxFQTlmZ0IsR0FBRyxHQUFILFVBQUcsS0FBSCxVQUFHLFFBOGZuQjtJQUNGLENBQUMsRUFoZ0JnQixNQUFNLEdBQU4sWUFBTSxLQUFOLFlBQU0sUUFnZ0J0QjtBQUNGLENBQUMsRUFsZ0JnQixLQUFLLEtBQUwsS0FBSyxRQWtnQnJCIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color } from '../../../../base/common/color.js';
export class ParsedTokenThemeRule {
    constructor(token, index, fontStyle, foreground, background) {
        this._parsedThemeRuleBrand = undefined;
        this.token = token;
        this.index = index;
        this.fontStyle = fontStyle;
        this.foreground = foreground;
        this.background = background;
    }
}
/**
 * Parse a raw theme into rules.
 */
export function parseTokenTheme(source) {
    if (!source || !Array.isArray(source)) {
        return [];
    }
    const result = [];
    let resultLen = 0;
    for (let i = 0, len = source.length; i < len; i++) {
        const entry = source[i];
        let fontStyle = -1 /* FontStyle.NotSet */;
        if (typeof entry.fontStyle === 'string') {
            fontStyle = 0 /* FontStyle.None */;
            const segments = entry.fontStyle.split(' ');
            for (let j = 0, lenJ = segments.length; j < lenJ; j++) {
                const segment = segments[j];
                switch (segment) {
                    case 'italic':
                        fontStyle = fontStyle | 1 /* FontStyle.Italic */;
                        break;
                    case 'bold':
                        fontStyle = fontStyle | 2 /* FontStyle.Bold */;
                        break;
                    case 'underline':
                        fontStyle = fontStyle | 4 /* FontStyle.Underline */;
                        break;
                    case 'strikethrough':
                        fontStyle = fontStyle | 8 /* FontStyle.Strikethrough */;
                        break;
                }
            }
        }
        let foreground = null;
        if (typeof entry.foreground === 'string') {
            foreground = entry.foreground;
        }
        let background = null;
        if (typeof entry.background === 'string') {
            background = entry.background;
        }
        result[resultLen++] = new ParsedTokenThemeRule(entry.token || '', i, fontStyle, foreground, background);
    }
    return result;
}
/**
 * Resolve rules (i.e. inheritance).
 */
function resolveParsedTokenThemeRules(parsedThemeRules, customTokenColors) {
    // Sort rules lexicographically, and then by index if necessary
    parsedThemeRules.sort((a, b) => {
        const r = strcmp(a.token, b.token);
        if (r !== 0) {
            return r;
        }
        return a.index - b.index;
    });
    // Determine defaults
    let defaultFontStyle = 0 /* FontStyle.None */;
    let defaultForeground = '000000';
    let defaultBackground = 'ffffff';
    while (parsedThemeRules.length >= 1 && parsedThemeRules[0].token === '') {
        const incomingDefaults = parsedThemeRules.shift();
        if (incomingDefaults.fontStyle !== -1 /* FontStyle.NotSet */) {
            defaultFontStyle = incomingDefaults.fontStyle;
        }
        if (incomingDefaults.foreground !== null) {
            defaultForeground = incomingDefaults.foreground;
        }
        if (incomingDefaults.background !== null) {
            defaultBackground = incomingDefaults.background;
        }
    }
    const colorMap = new ColorMap();
    // start with token colors from custom token themes
    for (const color of customTokenColors) {
        colorMap.getId(color);
    }
    const foregroundColorId = colorMap.getId(defaultForeground);
    const backgroundColorId = colorMap.getId(defaultBackground);
    const defaults = new ThemeTrieElementRule(defaultFontStyle, foregroundColorId, backgroundColorId);
    const root = new ThemeTrieElement(defaults);
    for (let i = 0, len = parsedThemeRules.length; i < len; i++) {
        const rule = parsedThemeRules[i];
        root.insert(rule.token, rule.fontStyle, colorMap.getId(rule.foreground), colorMap.getId(rule.background));
    }
    return new TokenTheme(colorMap, root);
}
const colorRegExp = /^#?([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/;
export class ColorMap {
    constructor() {
        this._lastColorId = 0;
        this._id2color = [];
        this._color2id = new Map();
    }
    getId(color) {
        if (color === null) {
            return 0;
        }
        const match = color.match(colorRegExp);
        if (!match) {
            throw new Error('Illegal value for token color: ' + color);
        }
        color = match[1].toUpperCase();
        let value = this._color2id.get(color);
        if (value) {
            return value;
        }
        value = ++this._lastColorId;
        this._color2id.set(color, value);
        this._id2color[value] = Color.fromHex('#' + color);
        return value;
    }
    getColorMap() {
        return this._id2color.slice(0);
    }
}
export class TokenTheme {
    static createFromRawTokenTheme(source, customTokenColors) {
        return this.createFromParsedTokenTheme(parseTokenTheme(source), customTokenColors);
    }
    static createFromParsedTokenTheme(source, customTokenColors) {
        return resolveParsedTokenThemeRules(source, customTokenColors);
    }
    constructor(colorMap, root) {
        this._colorMap = colorMap;
        this._root = root;
        this._cache = new Map();
    }
    getColorMap() {
        return this._colorMap.getColorMap();
    }
    /**
     * used for testing purposes
     */
    getThemeTrieElement() {
        return this._root.toExternalThemeTrieElement();
    }
    _match(token) {
        return this._root.match(token);
    }
    match(languageId, token) {
        // The cache contains the metadata without the language bits set.
        let result = this._cache.get(token);
        if (typeof result === 'undefined') {
            const rule = this._match(token);
            const standardToken = toStandardTokenType(token);
            result = (rule.metadata | (standardToken << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)) >>> 0;
            this._cache.set(token, result);
        }
        return (result | (languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)) >>> 0;
    }
}
const STANDARD_TOKEN_TYPE_REGEXP = /\b(comment|string|regex|regexp)\b/;
export function toStandardTokenType(tokenType) {
    const m = tokenType.match(STANDARD_TOKEN_TYPE_REGEXP);
    if (!m) {
        return 0 /* StandardTokenType.Other */;
    }
    switch (m[1]) {
        case 'comment':
            return 1 /* StandardTokenType.Comment */;
        case 'string':
            return 2 /* StandardTokenType.String */;
        case 'regex':
            return 3 /* StandardTokenType.RegEx */;
        case 'regexp':
            return 3 /* StandardTokenType.RegEx */;
    }
    throw new Error('Unexpected match for standard token type!');
}
export function strcmp(a, b) {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}
export class ThemeTrieElementRule {
    constructor(fontStyle, foreground, background) {
        this._themeTrieElementRuleBrand = undefined;
        this._fontStyle = fontStyle;
        this._foreground = foreground;
        this._background = background;
        this.metadata =
            ((this._fontStyle << 11 /* MetadataConsts.FONT_STYLE_OFFSET */) |
                (this._foreground << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
                (this._background << 24 /* MetadataConsts.BACKGROUND_OFFSET */)) >>>
                0;
    }
    clone() {
        return new ThemeTrieElementRule(this._fontStyle, this._foreground, this._background);
    }
    acceptOverwrite(fontStyle, foreground, background) {
        if (fontStyle !== -1 /* FontStyle.NotSet */) {
            this._fontStyle = fontStyle;
        }
        if (foreground !== 0 /* ColorId.None */) {
            this._foreground = foreground;
        }
        if (background !== 0 /* ColorId.None */) {
            this._background = background;
        }
        this.metadata =
            ((this._fontStyle << 11 /* MetadataConsts.FONT_STYLE_OFFSET */) |
                (this._foreground << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
                (this._background << 24 /* MetadataConsts.BACKGROUND_OFFSET */)) >>>
                0;
    }
}
export class ExternalThemeTrieElement {
    constructor(mainRule, children = new Map()) {
        this.mainRule = mainRule;
        if (children instanceof Map) {
            this.children = children;
        }
        else {
            this.children = new Map();
            for (const key in children) {
                this.children.set(key, children[key]);
            }
        }
    }
}
export class ThemeTrieElement {
    constructor(mainRule) {
        this._themeTrieElementBrand = undefined;
        this._mainRule = mainRule;
        this._children = new Map();
    }
    /**
     * used for testing purposes
     */
    toExternalThemeTrieElement() {
        const children = new Map();
        this._children.forEach((element, index) => {
            children.set(index, element.toExternalThemeTrieElement());
        });
        return new ExternalThemeTrieElement(this._mainRule, children);
    }
    match(token) {
        if (token === '') {
            return this._mainRule;
        }
        const dotIndex = token.indexOf('.');
        let head;
        let tail;
        if (dotIndex === -1) {
            head = token;
            tail = '';
        }
        else {
            head = token.substring(0, dotIndex);
            tail = token.substring(dotIndex + 1);
        }
        const child = this._children.get(head);
        if (typeof child !== 'undefined') {
            return child.match(tail);
        }
        return this._mainRule;
    }
    insert(token, fontStyle, foreground, background) {
        if (token === '') {
            // Merge into the main rule
            this._mainRule.acceptOverwrite(fontStyle, foreground, background);
            return;
        }
        const dotIndex = token.indexOf('.');
        let head;
        let tail;
        if (dotIndex === -1) {
            head = token;
            tail = '';
        }
        else {
            head = token.substring(0, dotIndex);
            tail = token.substring(dotIndex + 1);
        }
        let child = this._children.get(head);
        if (typeof child === 'undefined') {
            child = new ThemeTrieElement(this._mainRule.clone());
            this._children.set(head, child);
        }
        child.insert(tail, fontStyle, foreground, background);
    }
}
export function generateTokensCSSForColorMap(colorMap) {
    const rules = [];
    for (let i = 1, len = colorMap.length; i < len; i++) {
        const color = colorMap[i];
        rules[i] = `.mtk${i} { color: ${color}; }`;
    }
    rules.push('.mtki { font-style: italic; }');
    rules.push('.mtkb { font-weight: bold; }');
    rules.push('.mtku { text-decoration: underline; text-underline-position: under; }');
    rules.push('.mtks { text-decoration: line-through; }');
    rules.push('.mtks.mtku { text-decoration: underline line-through; text-underline-position: under; }');
    return rules.join('\n');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9zdXBwb3J0cy90b2tlbml6YXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBZ0J4RCxNQUFNLE9BQU8sb0JBQW9CO0lBYWhDLFlBQ0MsS0FBYSxFQUNiLEtBQWEsRUFDYixTQUFpQixFQUNqQixVQUF5QixFQUN6QixVQUF5QjtRQWpCMUIsMEJBQXFCLEdBQVMsU0FBUyxDQUFBO1FBbUJ0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNsQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNsQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUMxQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtJQUM3QixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUMsTUFBeUI7SUFDeEQsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUN2QyxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxNQUFNLE1BQU0sR0FBMkIsRUFBRSxDQUFBO0lBQ3pDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtJQUNqQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkQsTUFBTSxLQUFLLEdBQUcsTUFBTSxD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
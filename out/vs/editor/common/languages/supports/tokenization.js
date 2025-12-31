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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvc3VwcG9ydHMvdG9rZW5pemF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQWdCeEQsTUFBTSxPQUFPLG9CQUFvQjtJQWFoQyxZQUNDLEtBQWEsRUFDYixLQUFhLEVBQ2IsU0FBaUIsRUFDakIsVUFBeUIsRUFDekIsVUFBeUI7UUFqQjFCLDBCQUFxQixHQUFTLFNBQVMsQ0FBQTtRQW1CdEMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDbEIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDbEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDMUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7SUFDN0IsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsZUFBZSxDQUFDLE1BQXlCO0lBQ3hELElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDdkMsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QsTUFBTSxNQUFNLEdBQTJCLEVBQUUsQ0FBQTtJQUN6QyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUE7SUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ25ELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxD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
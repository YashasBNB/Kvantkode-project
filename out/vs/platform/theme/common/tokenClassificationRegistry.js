/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Color } from '../../../base/common/color.js';
import { Emitter } from '../../../base/common/event.js';
import * as nls from '../../../nls.js';
import { Extensions as JSONExtensions, } from '../../jsonschemas/common/jsonContributionRegistry.js';
import * as platform from '../../registry/common/platform.js';
const TOKEN_TYPE_WILDCARD = '*';
const TOKEN_CLASSIFIER_LANGUAGE_SEPARATOR = ':';
const CLASSIFIER_MODIFIER_SEPARATOR = '.';
const idPattern = '\\w+[-_\\w+]*';
export const typeAndModifierIdPattern = `^${idPattern}$`;
const selectorPattern = `^(${idPattern}|\\*)(\\${CLASSIFIER_MODIFIER_SEPARATOR}${idPattern})*(${TOKEN_CLASSIFIER_LANGUAGE_SEPARATOR}${idPattern})?$`;
const fontStylePattern = '^(\\s*(italic|bold|underline|strikethrough))*\\s*$';
export class TokenStyle {
    constructor(foreground, bold, underline, strikethrough, italic) {
        this.foreground = foreground;
        this.bold = bold;
        this.underline = underline;
        this.strikethrough = strikethrough;
        this.italic = italic;
    }
}
(function (TokenStyle) {
    function toJSONObject(style) {
        return {
            _foreground: style.foreground === undefined ? null : Color.Format.CSS.formatHexA(style.foreground, true),
            _bold: style.bold === undefined ? null : style.bold,
            _underline: style.underline === undefined ? null : style.underline,
            _italic: style.italic === undefined ? null : style.italic,
            _strikethrough: style.strikethrough === undefined ? null : style.strikethrough,
        };
    }
    TokenStyle.toJSONObject = toJSONObject;
    function fromJSONObject(obj) {
        if (obj) {
            const boolOrUndef = (b) => (typeof b === 'boolean' ? b : undefined);
            const colorOrUndef = (s) => (typeof s === 'string' ? Color.fromHex(s) : undefined);
            return new TokenStyle(colorOrUndef(obj._foreground), boolOrUndef(obj._bold), boolOrUndef(obj._underline), boolOrUndef(obj._strikethrough), boolOrUndef(obj._italic));
        }
        return undefined;
    }
    TokenStyle.fromJSONObject = fromJSONObject;
    function equals(s1, s2) {
        if (s1 === s2) {
            return true;
        }
        return (s1 !== undefined &&
            s2 !== undefined &&
            (s1.foreground instanceof Color
                ? s1.foreground.equals(s2.foreground)
                : s2.foreground === undefined) &&
            s1.bold === s2.bold &&
            s1.underline === s2.underline &&
            s1.strikethrough === s2.strikethrough &&
            s1.italic === s2.italic);
    }
    TokenStyle.equals = equals;
    function is(s) {
        return s instanceof TokenStyle;
    }
    TokenStyle.is = is;
    function fromData(data) {
        return new TokenStyle(data.foreground, data.bold, data.underline, data.strikethrough, data.italic);
    }
    TokenStyle.fromData = fromData;
    function fromSettings(foreground, fontStyle, bold, underline, strikethrough, italic) {
        let foregroundColor = undefined;
        if (foreground !== undefined) {
            foregroundColor = Color.fromHex(foreground);
        }
        if (fontStyle !== undefined) {
            bold = italic = underline = strikethrough = false;
            const expression = /italic|bold|underline|strikethrough/g;
            let match;
            while ((match = expression.exec(fontStyle))) {
                switch (match[0]) {
                    case 'bold':
                        bold = true;
                        break;
                    case 'italic':
                        italic = true;
                        break;
                    case 'underline':
                        underline = true;
                        break;
                    case 'strikethrough':
                        strikethrough = true;
                        break;
                }
            }
        }
        return new TokenStyle(foregroundColor, bold, underline, strikethrough, italic);
    }
    TokenStyle.fromSettings = fromSettings;
})(TokenStyle || (TokenStyle = {}));
export var SemanticTokenRule;
(function (SemanticTokenRule) {
    function fromJSONObject(registry, o) {
        if (o && typeof o._selector === 'string' && o._style) {
            const style = TokenStyle.fromJSONObject(o._style);
            if (style) {
                try {
                    return { selector: registry.parseTokenSelector(o._selector), style };
                }
                catch (_ignore) { }
            }
        }
        return undefined;
    }
    SemanticTokenRule.fromJSONObject = fromJSONObject;
    function toJSONObject(rule) {
        return {
            _selector: rule.selector.id,
            _style: TokenStyle.toJSONObject(rule.style),
        };
    }
    SemanticTokenRule.toJSONObject = toJSONObject;
    function equals(r1, r2) {
        if (r1 === r2) {
            return true;
        }
        return (r1 !== undefined &&
            r2 !== undefined &&
            r1.selector &&
            r2.selector &&
            r1.selector.id === r2.selector.id &&
            TokenStyle.equals(r1.style, r2.style));
    }
    SemanticTokenRule.equals = equals;
    function is(r) {
        return r && r.selector && typeof r.selector.id === 'string' && TokenStyle.is(r.style);
    }
    SemanticTokenRule.is = is;
})(SemanticTokenRule || (SemanticTokenRule = {}));
// TokenStyle registry
const Extensions = {
    TokenClassificationContribution: 'base.contributions.tokenClassification',
};
class TokenClassificationRegistry {
    constructor() {
        this._onDidChangeSchema = new Emitter();
        this.onDidChangeSchema = this._onDidChangeSchema.event;
        this.currentTypeNumber = 0;
        this.currentModifierBit = 1;
        this.tokenStylingDefaultRules = [];
        this.tokenStylingSchema = {
            type: 'object',
            properties: {},
            patternProperties: {
                [selectorPattern]: getStylingSchemeEntry(),
            },
            //errorMessage: nls.localize('schema.token.errors', 'Valid token selectors have the form (*|tokenType)(.tokenModifier)*(:tokenLanguage)?.'),
            additionalProperties: false,
            definitions: {
                style: {
                    type: 'object',
                    description: nls.localize('schema.token.settings', 'Colors and styles for the token.'),
                    properties: {
                        foreground: {
                            type: 'string',
                            description: nls.localize('schema.token.foreground', 'Foreground color for the token.'),
                            format: 'color-hex',
                            default: '#ff0000',
                        },
                        background: {
                            type: 'string',
                            deprecationMessage: nls.localize('schema.token.background.warning', 'Token background colors are currently not supported.'),
                        },
                        fontStyle: {
                            type: 'string',
                            description: nls.localize('schema.token.fontStyle', "Sets the all font styles of the rule: 'italic', 'bold', 'underline' or 'strikethrough' or a combination. All styles that are not listed are unset. The empty string unsets all styles."),
                            pattern: fontStylePattern,
                            patternErrorMessage: nls.localize('schema.fontStyle.error', "Font style must be 'italic', 'bold', 'underline' or 'strikethrough' or a combination. The empty string unsets all styles."),
                            defaultSnippets: [
                                {
                                    label: nls.localize('schema.token.fontStyle.none', 'None (clear inherited style)'),
                                    bodyText: '""',
                                },
                                { body: 'italic' },
                                { body: 'bold' },
                                { body: 'underline' },
                                { body: 'strikethrough' },
                                { body: 'italic bold' },
                                { body: 'italic underline' },
                                { body: 'italic strikethrough' },
                                { body: 'bold underline' },
                                { body: 'bold strikethrough' },
                                { body: 'underline strikethrough' },
                                { body: 'italic bold underline' },
                                { body: 'italic bold strikethrough' },
                                { body: 'italic underline strikethrough' },
                                { body: 'bold underline strikethrough' },
                                { body: 'italic bold underline strikethrough' },
                            ],
                        },
                        bold: {
                            type: 'boolean',
                            description: nls.localize('schema.token.bold', "Sets or unsets the font style to bold. Note, the presence of 'fontStyle' overrides this setting."),
                        },
                        italic: {
                            type: 'boolean',
                            description: nls.localize('schema.token.italic', "Sets or unsets the font style to italic. Note, the presence of 'fontStyle' overrides this setting."),
                        },
                        underline: {
                            type: 'boolean',
                            description: nls.localize('schema.token.underline', "Sets or unsets the font style to underline. Note, the presence of 'fontStyle' overrides this setting."),
                        },
                        strikethrough: {
                            type: 'boolean',
                            description: nls.localize('schema.token.strikethrough', "Sets or unsets the font style to strikethrough. Note, the presence of 'fontStyle' overrides this setting."),
                        },
                    },
                    defaultSnippets: [{ body: { foreground: '${1:#FF0000}', fontStyle: '${2:bold}' } }],
                },
            },
        };
        this.tokenTypeById = Object.create(null);
        this.tokenModifierById = Object.create(null);
        this.typeHierarchy = Object.create(null);
    }
    registerTokenType(id, description, superType, deprecationMessage) {
        if (!id.match(typeAndModifierIdPattern)) {
            throw new Error('Invalid token type id.');
        }
        if (superType && !superType.match(typeAndModifierIdPattern)) {
            throw new Error('Invalid token super type id.');
        }
        const num = this.currentTypeNumber++;
        const tokenStyleContribution = {
            num,
            id,
            superType,
            description,
            deprecationMessage,
        };
        this.tokenTypeById[id] = tokenStyleContribution;
        const stylingSchemeEntry = getStylingSchemeEntry(description, deprecationMessage);
        this.tokenStylingSchema.properties[id] = stylingSchemeEntry;
        this.typeHierarchy = Object.create(null);
    }
    registerTokenModifier(id, description, deprecationMessage) {
        if (!id.match(typeAndModifierIdPattern)) {
            throw new Error('Invalid token modifier id.');
        }
        const num = this.currentModifierBit;
        this.currentModifierBit = this.currentModifierBit * 2;
        const tokenStyleContribution = {
            num,
            id,
            description,
            deprecationMessage,
        };
        this.tokenModifierById[id] = tokenStyleContribution;
        this.tokenStylingSchema.properties[`*.${id}`] = getStylingSchemeEntry(description, deprecationMessage);
    }
    parseTokenSelector(selectorString, language) {
        const selector = parseClassifierString(selectorString, language);
        if (!selector.type) {
            return {
                match: () => -1,
                id: '$invalid',
            };
        }
        return {
            match: (type, modifiers, language) => {
                let score = 0;
                if (selector.language !== undefined) {
                    if (selector.language !== language) {
                        return -1;
                    }
                    score += 10;
                }
                if (selector.type !== TOKEN_TYPE_WILDCARD) {
                    const hierarchy = this.getTypeHierarchy(type);
                    const level = hierarchy.indexOf(selector.type);
                    if (level === -1) {
                        return -1;
                    }
                    score += 100 - level;
                }
                // all selector modifiers must be present
                for (const selectorModifier of selector.modifiers) {
                    if (modifiers.indexOf(selectorModifier) === -1) {
                        return -1;
                    }
                }
                return score + selector.modifiers.length * 100;
            },
            id: `${[selector.type, ...selector.modifiers.sort()].join('.')}${selector.language !== undefined ? ':' + selector.language : ''}`,
        };
    }
    registerTokenStyleDefault(selector, defaults) {
        this.tokenStylingDefaultRules.push({ selector, defaults });
    }
    deregisterTokenStyleDefault(selector) {
        const selectorString = selector.id;
        this.tokenStylingDefaultRules = this.tokenStylingDefaultRules.filter((r) => r.selector.id !== selectorString);
    }
    deregisterTokenType(id) {
        delete this.tokenTypeById[id];
        delete this.tokenStylingSchema.properties[id];
        this.typeHierarchy = Object.create(null);
    }
    deregisterTokenModifier(id) {
        delete this.tokenModifierById[id];
        delete this.tokenStylingSchema.properties[`*.${id}`];
    }
    getTokenTypes() {
        return Object.keys(this.tokenTypeById).map((id) => this.tokenTypeById[id]);
    }
    getTokenModifiers() {
        return Object.keys(this.tokenModifierById).map((id) => this.tokenModifierById[id]);
    }
    getTokenStylingSchema() {
        return this.tokenStylingSchema;
    }
    getTokenStylingDefaultRules() {
        return this.tokenStylingDefaultRules;
    }
    getTypeHierarchy(typeId) {
        let hierarchy = this.typeHierarchy[typeId];
        if (!hierarchy) {
            this.typeHierarchy[typeId] = hierarchy = [typeId];
            let type = this.tokenTypeById[typeId];
            while (type && type.superType) {
                hierarchy.push(type.superType);
                type = this.tokenTypeById[type.superType];
            }
        }
        return hierarchy;
    }
    toString() {
        const sorter = (a, b) => {
            const cat1 = a.indexOf('.') === -1 ? 0 : 1;
            const cat2 = b.indexOf('.') === -1 ? 0 : 1;
            if (cat1 !== cat2) {
                return cat1 - cat2;
            }
            return a.localeCompare(b);
        };
        return Object.keys(this.tokenTypeById)
            .sort(sorter)
            .map((k) => `- \`${k}\`: ${this.tokenTypeById[k].description}`)
            .join('\n');
    }
}
const CHAR_LANGUAGE = TOKEN_CLASSIFIER_LANGUAGE_SEPARATOR.charCodeAt(0);
const CHAR_MODIFIER = CLASSIFIER_MODIFIER_SEPARATOR.charCodeAt(0);
export function parseClassifierString(s, defaultLanguage) {
    let k = s.length;
    let language = defaultLanguage;
    const modifiers = [];
    for (let i = k - 1; i >= 0; i--) {
        const ch = s.charCodeAt(i);
        if (ch === CHAR_LANGUAGE || ch === CHAR_MODIFIER) {
            const segment = s.substring(i + 1, k);
            k = i;
            if (ch === CHAR_LANGUAGE) {
                language = segment;
            }
            else {
                modifiers.push(segment);
            }
        }
    }
    const type = s.substring(0, k);
    return { type, modifiers, language };
}
const tokenClassificationRegistry = createDefaultTokenClassificationRegistry();
platform.Registry.add(Extensions.TokenClassificationContribution, tokenClassificationRegistry);
function createDefaultTokenClassificationRegistry() {
    const registry = new TokenClassificationRegistry();
    function registerTokenType(id, description, scopesToProbe = [], superType, deprecationMessage) {
        registry.registerTokenType(id, description, superType, deprecationMessage);
        if (scopesToProbe) {
            registerTokenStyleDefault(id, scopesToProbe);
        }
        return id;
    }
    function registerTokenStyleDefault(selectorString, scopesToProbe) {
        try {
            const selector = registry.parseTokenSelector(selectorString);
            registry.registerTokenStyleDefault(selector, { scopesToProbe });
        }
        catch (e) {
            console.log(e);
        }
    }
    // default token types
    registerTokenType('comment', nls.localize('comment', 'Style for comments.'), [['comment']]);
    registerTokenType('string', nls.localize('string', 'Style for strings.'), [['string']]);
    registerTokenType('keyword', nls.localize('keyword', 'Style for keywords.'), [
        ['keyword.control'],
    ]);
    registerTokenType('number', nls.localize('number', 'Style for numbers.'), [['constant.numeric']]);
    registerTokenType('regexp', nls.localize('regexp', 'Style for expressions.'), [
        ['constant.regexp'],
    ]);
    registerTokenType('operator', nls.localize('operator', 'Style for operators.'), [
        ['keyword.operator'],
    ]);
    registerTokenType('namespace', nls.localize('namespace', 'Style for namespaces.'), [
        ['entity.name.namespace'],
    ]);
    registerTokenType('type', nls.localize('type', 'Style for types.'), [
        ['entity.name.type'],
        ['support.type'],
    ]);
    registerTokenType('struct', nls.localize('struct', 'Style for structs.'), [
        ['entity.name.type.struct'],
    ]);
    registerTokenType('class', nls.localize('class', 'Style for classes.'), [
        ['entity.name.type.class'],
        ['support.class'],
    ]);
    registerTokenType('interface', nls.localize('interface', 'Style for interfaces.'), [
        ['entity.name.type.interface'],
    ]);
    registerTokenType('enum', nls.localize('enum', 'Style for enums.'), [['entity.name.type.enum']]);
    registerTokenType('typeParameter', nls.localize('typeParameter', 'Style for type parameters.'), [
        ['entity.name.type.parameter'],
    ]);
    registerTokenType('function', nls.localize('function', 'Style for functions'), [
        ['entity.name.function'],
        ['support.function'],
    ]);
    registerTokenType('member', nls.localize('member', 'Style for member functions'), [], 'method', 'Deprecated use `method` instead');
    registerTokenType('method', nls.localize('method', 'Style for method (member functions)'), [
        ['entity.name.function.member'],
        ['support.function'],
    ]);
    registerTokenType('macro', nls.localize('macro', 'Style for macros.'), [
        ['entity.name.function.preprocessor'],
    ]);
    registerTokenType('variable', nls.localize('variable', 'Style for variables.'), [
        ['variable.other.readwrite'],
        ['entity.name.variable'],
    ]);
    registerTokenType('parameter', nls.localize('parameter', 'Style for parameters.'), [
        ['variable.parameter'],
    ]);
    registerTokenType('property', nls.localize('property', 'Style for properties.'), [
        ['variable.other.property'],
    ]);
    registerTokenType('enumMember', nls.localize('enumMember', 'Style for enum members.'), [
        ['variable.other.enummember'],
    ]);
    registerTokenType('event', nls.localize('event', 'Style for events.'), [['variable.other.event']]);
    registerTokenType('decorator', nls.localize('decorator', 'Style for decorators & annotations.'), [
        ['entity.name.decorator'],
        ['entity.name.function'],
    ]);
    registerTokenType('label', nls.localize('labels', 'Style for labels. '), undefined);
    // default token modifiers
    registry.registerTokenModifier('declaration', nls.localize('declaration', 'Style for all symbol declarations.'), undefined);
    registry.registerTokenModifier('documentation', nls.localize('documentation', 'Style to use for references in documentation.'), undefined);
    registry.registerTokenModifier('static', nls.localize('static', 'Style to use for symbols that are static.'), undefined);
    registry.registerTokenModifier('abstract', nls.localize('abstract', 'Style to use for symbols that are abstract.'), undefined);
    registry.registerTokenModifier('deprecated', nls.localize('deprecated', 'Style to use for symbols that are deprecated.'), undefined);
    registry.registerTokenModifier('modification', nls.localize('modification', 'Style to use for write accesses.'), undefined);
    registry.registerTokenModifier('async', nls.localize('async', 'Style to use for symbols that are async.'), undefined);
    registry.registerTokenModifier('readonly', nls.localize('readonly', 'Style to use for symbols that are read-only.'), undefined);
    registerTokenStyleDefault('variable.readonly', [['variable.other.constant']]);
    registerTokenStyleDefault('property.readonly', [['variable.other.constant.property']]);
    registerTokenStyleDefault('type.defaultLibrary', [['support.type']]);
    registerTokenStyleDefault('class.defaultLibrary', [['support.class']]);
    registerTokenStyleDefault('interface.defaultLibrary', [['support.class']]);
    registerTokenStyleDefault('variable.defaultLibrary', [
        ['support.variable'],
        ['support.other.variable'],
    ]);
    registerTokenStyleDefault('variable.defaultLibrary.readonly', [['support.constant']]);
    registerTokenStyleDefault('property.defaultLibrary', [['support.variable.property']]);
    registerTokenStyleDefault('property.defaultLibrary.readonly', [['support.constant.property']]);
    registerTokenStyleDefault('function.defaultLibrary', [['support.function']]);
    registerTokenStyleDefault('member.defaultLibrary', [['support.function']]);
    return registry;
}
export function getTokenClassificationRegistry() {
    return tokenClassificationRegistry;
}
function getStylingSchemeEntry(description, deprecationMessage) {
    return {
        description,
        deprecationMessage,
        defaultSnippets: [{ body: '${1:#ff0000}' }],
        anyOf: [
            {
                type: 'string',
                format: 'color-hex',
            },
            {
                $ref: '#/definitions/style',
            },
        ],
    };
}
export const tokenStylingSchemaId = 'vscode://schemas/token-styling';
const schemaRegistry = platform.Registry.as(JSONExtensions.JSONContribution);
schemaRegistry.registerSchema(tokenStylingSchemaId, tokenClassificationRegistry.getTokenStylingSchema());
const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(tokenStylingSchemaId), 200);
tokenClassificationRegistry.onDidChangeSchema(() => {
    if (!delayer.isScheduled()) {
        delayer.schedule();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5DbGFzc2lmaWNhdGlvblJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90aGVtZS9jb21tb24vdG9rZW5DbGFzc2lmaWNhdGlvblJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFFOUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sVUFBVSxJQUFJLGNBQWMsR0FFNUIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEtBQUssUUFBUSxNQUFNLG1DQUFtQyxDQUFBO0FBRzdELE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFBO0FBQy9CLE1BQU0sbUNBQW1DLEdBQUcsR0FBRyxDQUFBO0FBQy9DLE1BQU0sNkJBQTZCLEdBQUcsR0FBRyxDQUFBO0FBS3pDLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQTtBQUNqQyxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLFNBQVMsR0FBRyxDQUFBO0FBRXhELE1BQU0sZUFBZSxHQUFHLEtBQUssU0FBUyxXQUFXLDZCQUE2QixHQUFHLFNBQVMsTUFBTSxtQ0FBbUMsR0FBRyxTQUFTLEtBQUssQ0FBQTtBQUVwSixNQUFNLGdCQUFnQixHQUFHLG9EQUFvRCxDQUFBO0FBdUI3RSxNQUFNLE9BQU8sVUFBVTtJQUN0QixZQUNpQixVQUE2QixFQUM3QixJQUF5QixFQUN6QixTQUE4QixFQUM5QixhQUFrQyxFQUNsQyxNQUEyQjtRQUozQixlQUFVLEdBQVYsVUFBVSxD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
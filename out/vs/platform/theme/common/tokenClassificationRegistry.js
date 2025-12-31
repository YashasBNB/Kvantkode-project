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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5DbGFzc2lmaWNhdGlvblJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvY29tbW9uL3Rva2VuQ2xhc3NpZmljYXRpb25SZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBRTlELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUE7QUFDdEMsT0FBTyxFQUNOLFVBQVUsSUFBSSxjQUFjLEdBRTVCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxLQUFLLFFBQVEsTUFBTSxtQ0FBbUMsQ0FBQTtBQUc3RCxNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQTtBQUMvQixNQUFNLG1DQUFtQyxHQUFHLEdBQUcsQ0FBQTtBQUMvQyxNQUFNLDZCQUE2QixHQUFHLEdBQUcsQ0FBQTtBQUt6QyxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUE7QUFDakMsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxTQUFTLEdBQUcsQ0FBQTtBQUV4RCxNQUFNLGVBQWUsR0FBRyxLQUFLLFNBQVMsV0FBVyw2QkFBNkIsR0FBRyxTQUFTLE1BQU0sbUNBQW1DLEdBQUcsU0FBUyxLQUFLLENBQUE7QUFFcEosTUFBTSxnQkFBZ0IsR0FBRyxvREFBb0QsQ0FBQTtBQXVCN0UsTUFBTSxPQUFPLFVBQVU7SUFDdEIsWUFDaUIsVUFBNkIsRUFDN0IsSUFBeUIsRUFDekIsU0FBOEIsRUFDOUIsYUFBa0MsRUFDbEMsTUFBMkI7UUFKM0IsZUFBVSxHQUFWLFVBQVUsQ0FBbUI7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
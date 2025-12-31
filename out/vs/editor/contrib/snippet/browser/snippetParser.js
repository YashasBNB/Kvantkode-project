/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var TokenType;
(function (TokenType) {
    TokenType[TokenType["Dollar"] = 0] = "Dollar";
    TokenType[TokenType["Colon"] = 1] = "Colon";
    TokenType[TokenType["Comma"] = 2] = "Comma";
    TokenType[TokenType["CurlyOpen"] = 3] = "CurlyOpen";
    TokenType[TokenType["CurlyClose"] = 4] = "CurlyClose";
    TokenType[TokenType["Backslash"] = 5] = "Backslash";
    TokenType[TokenType["Forwardslash"] = 6] = "Forwardslash";
    TokenType[TokenType["Pipe"] = 7] = "Pipe";
    TokenType[TokenType["Int"] = 8] = "Int";
    TokenType[TokenType["VariableName"] = 9] = "VariableName";
    TokenType[TokenType["Format"] = 10] = "Format";
    TokenType[TokenType["Plus"] = 11] = "Plus";
    TokenType[TokenType["Dash"] = 12] = "Dash";
    TokenType[TokenType["QuestionMark"] = 13] = "QuestionMark";
    TokenType[TokenType["EOF"] = 14] = "EOF";
})(TokenType || (TokenType = {}));
export class Scanner {
    constructor() {
        this.value = '';
        this.pos = 0;
    }
    static { this._table = {
        [36 /* CharCode.DollarSign */]: 0 /* TokenType.Dollar */,
        [58 /* CharCode.Colon */]: 1 /* TokenType.Colon */,
        [44 /* CharCode.Comma */]: 2 /* TokenType.Comma */,
        [123 /* CharCode.OpenCurlyBrace */]: 3 /* TokenType.CurlyOpen */,
        [125 /* CharCode.CloseCurlyBrace */]: 4 /* TokenType.CurlyClose */,
        [92 /* CharCode.Backslash */]: 5 /* TokenType.Backslash */,
        [47 /* CharCode.Slash */]: 6 /* TokenType.Forwardslash */,
        [124 /* CharCode.Pipe */]: 7 /* TokenType.Pipe */,
        [43 /* CharCode.Plus */]: 11 /* TokenType.Plus */,
        [45 /* CharCode.Dash */]: 12 /* TokenType.Dash */,
        [63 /* CharCode.QuestionMark */]: 13 /* TokenType.QuestionMark */,
    }; }
    static isDigitCharacter(ch) {
        return ch >= 48 /* CharCode.Digit0 */ && ch <= 57 /* CharCode.Digit9 */;
    }
    static isVariableCharacter(ch) {
        return (ch === 95 /* CharCode.Underline */ ||
            (ch >= 97 /* CharCode.a */ && ch <= 122 /* CharCode.z */) ||
            (ch >= 65 /* CharCode.A */ && ch <= 90 /* CharCode.Z */));
    }
    text(value) {
        this.value = value;
        this.pos = 0;
    }
    tokenText(token) {
        return this.value.substr(token.pos, token.len);
    }
    next() {
        if (this.pos >= this.value.length) {
            return { type: 14 /* TokenType.EOF */, pos: this.pos, len: 0 };
        }
        const pos = this.pos;
        let len = 0;
        let ch = this.value.charCodeAt(pos);
        let type;
        // static types
        type = Scanner._table[ch];
        if (typeof type === 'number') {
            this.pos += 1;
            return { type, pos, len: 1 };
        }
        // number
        if (Scanner.isDigitCharacter(ch)) {
            type = 8 /* TokenType.Int */;
            do {
                len += 1;
                ch = this.value.charCodeAt(pos + len);
            } while (Scanner.isDigitCharacter(ch));
            this.pos += len;
            return { type, pos, len };
        }
        // variable name
        if (Scanner.isVariableCharacter(ch)) {
            type = 9 /* TokenType.VariableName */;
            do {
                ch = this.value.charCodeAt(pos + ++len);
            } while (Scanner.isVariableCharacter(ch) || Scanner.isDigitCharacter(ch));
            this.pos += len;
            return { type, pos, len };
        }
        // format
        type = 10 /* TokenType.Format */;
        do {
            len += 1;
            ch = this.value.charCodeAt(pos + len);
        } while (!isNaN(ch) &&
            typeof Scanner._table[ch] === 'undefined' && // not static token
            !Scanner.isDigitCharacter(ch) && // not number
            !Scanner.isVariableCharacter(ch) // not variable
        );
        this.pos += len;
        return { type, pos, len };
    }
}
export class Marker {
    constructor() {
        this._children = [];
    }
    appendChild(child) {
        if (child instanceof Text && this._children[this._children.length - 1] instanceof Text) {
            // this and previous child are text -> merge them
            ;
            this._children[this._children.length - 1].value += child.value;
        }
        else {
            // normal adoption of child
            child.parent = this;
            this._children.push(child);
        }
        return this;
    }
    replace(child, others) {
        const { parent } = child;
        const idx = parent.children.indexOf(child);
        const newChildren = parent.children.slice(0);
        newChildren.splice(idx, 1, ...others);
        parent._children = newChildren;
        (function _fixParent(children, parent) {
            for (const child of children) {
                child.parent = parent;
                _fixParent(child.children, child);
            }
        })(others, parent);
    }
    get children() {
        return this._children;
    }
    get rightMostDescendant() {
        if (this._children.length > 0) {
            return this._children[this._children.length - 1].rightMostDescendant;
        }
        return this;
    }
    get snippet() {
        let candidate = this;
        while (true) {
            if (!candidate) {
                return undefined;
            }
            if (candidate instanceof TextmateSnippet) {
                return candidate;
            }
            candidate = candidate.parent;
        }
    }
    toString() {
        return this.children.reduce((prev, cur) => prev + cur.toString(), '');
    }
    len() {
        return 0;
    }
}
export class Text extends Marker {
    static escape(value) {
        return value.replace(/\$|}|\\/g, '\\$&');
    }
    constructor(value) {
        super();
        this.value = value;
    }
    toString() {
        return this.value;
    }
    toTextmateString() {
        return Text.escape(this.value);
    }
    len() {
        return this.value.length;
    }
    clone() {
        return new Text(this.value);
    }
}
export class TransformableMarker extends Marker {
}
export class Placeholder extends TransformableMarker {
    static compareByIndex(a, b) {
        if (a.index === b.index) {
            return 0;
        }
        else if (a.isFinalTabstop) {
            return 1;
        }
        else if (b.isFinalTabstop) {
            return -1;
        }
        else if (a.index < b.index) {
            return -1;
        }
        else if (a.index > b.index) {
            return 1;
        }
        else {
            return 0;
        }
    }
    constructor(index) {
        super();
        this.index = index;
    }
    get isFinalTabstop() {
        return this.index === 0;
    }
    get choice() {
        return this._children.length === 1 && this._children[0] instanceof Choice
            ? this._children[0]
            : undefined;
    }
    toTextmateString() {
        let transformString = '';
        if (this.transform) {
            transformString = this.transform.toTextmateString();
        }
        if (this.children.length === 0 && !this.transform) {
            return `\$${this.index}`;
        }
        else if (this.children.length === 0) {
            return `\${${this.index}${transformString}}`;
        }
        else if (this.choice) {
            return `\${${this.index}|${this.choice.toTextmateString()}|${transformString}}`;
        }
        else {
            return `\${${this.index}:${this.children.map((child) => child.toTextmateString()).join('')}${transformString}}`;
        }
    }
    clone() {
        const ret = new Placeholder(this.index);
        if (this.transform) {
            ret.transform = this.transform.clone();
        }
        ret._children = this.children.map((child) => child.clone());
        return ret;
    }
}
export class Choice extends Marker {
    constructor() {
        super(...arguments);
        this.options = [];
    }
    appendChild(marker) {
        if (marker instanceof Text) {
            marker.parent = this;
            this.options.push(marker);
        }
        return this;
    }
    toString() {
        return this.options[0].value;
    }
    toTextmateString() {
        return this.options.map((option) => option.value.replace(/\||,|\\/g, '\\$&')).join(',');
    }
    len() {
        return this.options[0].len();
    }
    clone() {
        const ret = new Choice();
        this.options.forEach(ret.appendChild, ret);
        return ret;
    }
}
export class Transform extends Marker {
    constructor() {
        super(...arguments);
        this.regexp = new RegExp('');
    }
    resolve(value) {
        const _this = this;
        let didMatch = false;
        let ret = value.replace(this.regexp, function () {
            didMatch = true;
            return _this._replace(Array.prototype.slice.call(arguments, 0, -2));
        });
        // when the regex didn't match and when the transform has
        // else branches, then run those
        if (!didMatch &&
            this._children.some((child) => child instanceof FormatString && Boolean(child.elseValue))) {
            ret = this._replace([]);
        }
        return ret;
    }
    _replace(groups) {
        let ret = '';
        for (const marker of this._children) {
            if (marker instanceof FormatString) {
                let value = groups[marker.index] || '';
                value = marker.resolve(value);
                ret += value;
            }
            else {
                ret += marker.toString();
            }
        }
        return ret;
    }
    toString() {
        return '';
    }
    toTextmateString() {
        return `/${this.regexp.source}/${this.children.map((c) => c.toTextmateString())}/${(this.regexp.ignoreCase ? 'i' : '') + (this.regexp.global ? 'g' : '')}`;
    }
    clone() {
        const ret = new Transform();
        ret.regexp = new RegExp(this.regexp.source, '' + (this.regexp.ignoreCase ? 'i' : '') + (this.regexp.global ? 'g' : ''));
        ret._children = this.children.map((child) => child.clone());
        return ret;
    }
}
export class FormatString extends Marker {
    constructor(index, shorthandName, ifValue, elseValue) {
        super();
        this.index = index;
        this.shorthandName = shorthandName;
        this.ifValue = ifValue;
        this.elseValue = elseValue;
    }
    resolve(value) {
        if (this.shorthandName === 'upcase') {
            return !value ? '' : value.toLocaleUpperCase();
        }
        else if (this.shorthandName === 'downcase') {
            return !value ? '' : value.toLocaleLowerCase();
        }
        else if (this.shorthandName === 'capitalize') {
            return !value ? '' : value[0].toLocaleUpperCase() + value.substr(1);
        }
        else if (this.shorthandName === 'pascalcase') {
            return !value ? '' : this._toPascalCase(value);
        }
        else if (this.shorthandName === 'camelcase') {
            return !value ? '' : this._toCamelCase(value);
        }
        else if (Boolean(value) && typeof this.ifValue === 'string') {
            return this.ifValue;
        }
        else if (!Boolean(value) && typeof this.elseValue === 'string') {
            return this.elseValue;
        }
        else {
            return value || '';
        }
    }
    _toPascalCase(value) {
        const match = value.match(/[a-z0-9]+/gi);
        if (!match) {
            return value;
        }
        return match
            .map((word) => {
            return word.charAt(0).toUpperCase() + word.substr(1);
        })
            .join('');
    }
    _toCamelCase(value) {
        const match = value.match(/[a-z0-9]+/gi);
        if (!match) {
            return value;
        }
        return match
            .map((word, index) => {
            if (index === 0) {
                return word.charAt(0).toLowerCase() + word.substr(1);
            }
            return word.charAt(0).toUpperCase() + word.substr(1);
        })
            .join('');
    }
    toTextmateString() {
        let value = '${';
        value += this.index;
        if (this.shorthandName) {
            value += `:/${this.shorthandName}`;
        }
        else if (this.ifValue && this.elseValue) {
            value += `:?${this.ifValue}:${this.elseValue}`;
        }
        else if (this.ifValue) {
            value += `:+${this.ifValue}`;
        }
        else if (this.elseValue) {
            value += `:-${this.elseValue}`;
        }
        value += '}';
        return value;
    }
    clone() {
        const ret = new FormatString(this.index, this.shorthandName, this.ifValue, this.elseValue);
        return ret;
    }
}
export class Variable extends TransformableMarker {
    constructor(name) {
        super();
        this.name = name;
    }
    resolve(resolver) {
        let value = resolver.resolve(this);
        if (this.transform) {
            value = this.transform.resolve(value || '');
        }
        if (value !== undefined) {
            this._children = [new Text(value)];
            return true;
        }
        return false;
    }
    toTextmateString() {
        let transformString = '';
        if (this.transform) {
            transformString = this.transform.toTextmateString();
        }
        if (this.children.length === 0) {
            return `\${${this.name}${transformString}}`;
        }
        else {
            return `\${${this.name}:${this.children.map((child) => child.toTextmateString()).join('')}${transformString}}`;
        }
    }
    clone() {
        const ret = new Variable(this.name);
        if (this.transform) {
            ret.transform = this.transform.clone();
        }
        ret._children = this.children.map((child) => child.clone());
        return ret;
    }
}
function walk(marker, visitor) {
    const stack = [...marker];
    while (stack.length > 0) {
        const marker = stack.shift();
        const recurse = visitor(marker);
        if (!recurse) {
            break;
        }
        stack.unshift(...marker.children);
    }
}
export class TextmateSnippet extends Marker {
    get placeholderInfo() {
        if (!this._placeholders) {
            // fill in placeholders
            const all = [];
            let last;
            this.walk(function (candidate) {
                if (candidate instanceof Placeholder) {
                    all.push(candidate);
                    last = !last || last.index < candidate.index ? candidate : last;
                }
                return true;
            });
            this._placeholders = { all, last };
        }
        return this._placeholders;
    }
    get placeholders() {
        const { all } = this.placeholderInfo;
        return all;
    }
    offset(marker) {
        let pos = 0;
        let found = false;
        this.walk((candidate) => {
            if (candidate === marker) {
                found = true;
                return false;
            }
            pos += candidate.len();
            return true;
        });
        if (!found) {
            return -1;
        }
        return pos;
    }
    fullLen(marker) {
        let ret = 0;
        walk([marker], (marker) => {
            ret += marker.len();
            return true;
        });
        return ret;
    }
    enclosingPlaceholders(placeholder) {
        const ret = [];
        let { parent } = placeholder;
        while (parent) {
            if (parent instanceof Placeholder) {
                ret.push(parent);
            }
            parent = parent.parent;
        }
        return ret;
    }
    resolveVariables(resolver) {
        this.walk((candidate) => {
            if (candidate instanceof Variable) {
                if (candidate.resolve(resolver)) {
                    this._placeholders = undefined;
                }
            }
            return true;
        });
        return this;
    }
    appendChild(child) {
        this._placeholders = undefined;
        return super.appendChild(child);
    }
    replace(child, others) {
        this._placeholders = undefined;
        return super.replace(child, others);
    }
    toTextmateString() {
        return this.children.reduce((prev, cur) => prev + cur.toTextmateString(), '');
    }
    clone() {
        const ret = new TextmateSnippet();
        this._children = this.children.map((child) => child.clone());
        return ret;
    }
    walk(visitor) {
        walk(this.children, visitor);
    }
}
export class SnippetParser {
    constructor() {
        this._scanner = new Scanner();
        this._token = { type: 14 /* TokenType.EOF */, pos: 0, len: 0 };
    }
    static escape(value) {
        return value.replace(/\$|}|\\/g, '\\$&');
    }
    /**
     * Takes a snippet and returns the insertable string, e.g return the snippet-string
     * without any placeholder, tabstop, variables etc...
     */
    static asInsertText(value) {
        return new SnippetParser().parse(value).toString();
    }
    static guessNeedsClipboard(template) {
        return /\${?CLIPBOARD/.test(template);
    }
    parse(value, insertFinalTabstop, enforceFinalTabstop) {
        const snippet = new TextmateSnippet();
        this.parseFragment(value, snippet);
        this.ensureFinalTabstop(snippet, enforceFinalTabstop ?? false, insertFinalTabstop ?? false);
        return snippet;
    }
    parseFragment(value, snippet) {
        const offset = snippet.children.length;
        this._scanner.text(value);
        this._token = this._scanner.next();
        while (this._parse(snippet)) {
            // nothing
        }
        // fill in values for placeholders. the first placeholder of an index
        // that has a value defines the value for all placeholders with that index
        const placeholderDefaultValues = new Map();
        const incompletePlaceholders = [];
        snippet.walk((marker) => {
            if (marker instanceof Placeholder) {
                if (marker.isFinalTabstop) {
                    placeholderDefaultValues.set(0, undefined);
                }
                else if (!placeholderDefaultValues.has(marker.index) && marker.children.length > 0) {
                    placeholderDefaultValues.set(marker.index, marker.children);
                }
                else {
                    incompletePlaceholders.push(marker);
                }
            }
            return true;
        });
        const fillInIncompletePlaceholder = (placeholder, stack) => {
            const defaultValues = placeholderDefaultValues.get(placeholder.index);
            if (!defaultValues) {
                return;
            }
            const clone = new Placeholder(placeholder.index);
            clone.transform = placeholder.transform;
            for (const child of defaultValues) {
                const newChild = child.clone();
                clone.appendChild(newChild);
                // "recurse" on children that are again placeholders
                if (newChild instanceof Placeholder &&
                    placeholderDefaultValues.has(newChild.index) &&
                    !stack.has(newChild.index)) {
                    stack.add(newChild.index);
                    fillInIncompletePlaceholder(newChild, stack);
                    stack.delete(newChild.index);
                }
            }
            snippet.replace(placeholder, [clone]);
        };
        const stack = new Set();
        for (const placeholder of incompletePlaceholders) {
            fillInIncompletePlaceholder(placeholder, stack);
        }
        return snippet.children.slice(offset);
    }
    ensureFinalTabstop(snippet, enforceFinalTabstop, insertFinalTabstop) {
        if (enforceFinalTabstop || (insertFinalTabstop && snippet.placeholders.length > 0)) {
            const finalTabstop = snippet.placeholders.find((p) => p.index === 0);
            if (!finalTabstop) {
                // the snippet uses placeholders but has no
                // final tabstop defined -> insert at the end
                snippet.appendChild(new Placeholder(0));
            }
        }
    }
    _accept(type, value) {
        if (type === undefined || this._token.type === type) {
            const ret = !value ? true : this._scanner.tokenText(this._token);
            this._token = this._scanner.next();
            return ret;
        }
        return false;
    }
    _backTo(token) {
        this._scanner.pos = token.pos + token.len;
        this._token = token;
        return false;
    }
    _until(type) {
        const start = this._token;
        while (this._token.type !== type) {
            if (this._token.type === 14 /* TokenType.EOF */) {
                return false;
            }
            else if (this._token.type === 5 /* TokenType.Backslash */) {
                const nextToken = this._scanner.next();
                if (nextToken.type !== 0 /* TokenType.Dollar */ &&
                    nextToken.type !== 4 /* TokenType.CurlyClose */ &&
                    nextToken.type !== 5 /* TokenType.Backslash */) {
                    return false;
                }
            }
            this._token = this._scanner.next();
        }
        const value = this._scanner.value
            .substring(start.pos, this._token.pos)
            .replace(/\\(\$|}|\\)/g, '$1');
        this._token = this._scanner.next();
        return value;
    }
    _parse(marker) {
        return (this._parseEscaped(marker) ||
            this._parseTabstopOrVariableName(marker) ||
            this._parseComplexPlaceholder(marker) ||
            this._parseComplexVariable(marker) ||
            this._parseAnything(marker));
    }
    // \$, \\, \} -> just text
    _parseEscaped(marker) {
        let value;
        if ((value = this._accept(5 /* TokenType.Backslash */, true))) {
            // saw a backslash, append escaped token or that backslash
            value =
                this._accept(0 /* TokenType.Dollar */, true) ||
                    this._accept(4 /* TokenType.CurlyClose */, true) ||
                    this._accept(5 /* TokenType.Backslash */, true) ||
                    value;
            marker.appendChild(new Text(value));
            return true;
        }
        return false;
    }
    // $foo -> variable, $1 -> tabstop
    _parseTabstopOrVariableName(parent) {
        let value;
        const token = this._token;
        const match = this._accept(0 /* TokenType.Dollar */) &&
            (value = this._accept(9 /* TokenType.VariableName */, true) || this._accept(8 /* TokenType.Int */, true));
        if (!match) {
            return this._backTo(token);
        }
        parent.appendChild(/^\d+$/.test(value) ? new Placeholder(Number(value)) : new Variable(value));
        return true;
    }
    // ${1:<children>}, ${1} -> placeholder
    _parseComplexPlaceholder(parent) {
        let index;
        const token = this._token;
        const match = this._accept(0 /* TokenType.Dollar */) &&
            this._accept(3 /* TokenType.CurlyOpen */) &&
            (index = this._accept(8 /* TokenType.Int */, true));
        if (!match) {
            return this._backTo(token);
        }
        const placeholder = new Placeholder(Number(index));
        if (this._accept(1 /* TokenType.Colon */)) {
            // ${1:<children>}
            while (true) {
                // ...} -> done
                if (this._accept(4 /* TokenType.CurlyClose */)) {
                    parent.appendChild(placeholder);
                    return true;
                }
                if (this._parse(placeholder)) {
                    continue;
                }
                // fallback
                parent.appendChild(new Text('${' + index + ':'));
                placeholder.children.forEach(parent.appendChild, parent);
                return true;
            }
        }
        else if (placeholder.index > 0 && this._accept(7 /* TokenType.Pipe */)) {
            // ${1|one,two,three|}
            const choice = new Choice();
            while (true) {
                if (this._parseChoiceElement(choice)) {
                    if (this._accept(2 /* TokenType.Comma */)) {
                        // opt, -> more
                        continue;
                    }
                    if (this._accept(7 /* TokenType.Pipe */)) {
                        placeholder.appendChild(choice);
                        if (this._accept(4 /* TokenType.CurlyClose */)) {
                            // ..|} -> done
                            parent.appendChild(placeholder);
                            return true;
                        }
                    }
                }
                this._backTo(token);
                return false;
            }
        }
        else if (this._accept(6 /* TokenType.Forwardslash */)) {
            // ${1/<regex>/<format>/<options>}
            if (this._parseTransform(placeholder)) {
                parent.appendChild(placeholder);
                return true;
            }
            this._backTo(token);
            return false;
        }
        else if (this._accept(4 /* TokenType.CurlyClose */)) {
            // ${1}
            parent.appendChild(placeholder);
            return true;
        }
        else {
            // ${1 <- missing curly or colon
            return this._backTo(token);
        }
    }
    _parseChoiceElement(parent) {
        const token = this._token;
        const values = [];
        while (true) {
            if (this._token.type === 2 /* TokenType.Comma */ || this._token.type === 7 /* TokenType.Pipe */) {
                break;
            }
            let value;
            if ((value = this._accept(5 /* TokenType.Backslash */, true))) {
                // \, \|, or \\
                value =
                    this._accept(2 /* TokenType.Comma */, true) ||
                        this._accept(7 /* TokenType.Pipe */, true) ||
                        this._accept(5 /* TokenType.Backslash */, true) ||
                        value;
            }
            else {
                value = this._accept(undefined, true);
            }
            if (!value) {
                // EOF
                this._backTo(token);
                return false;
            }
            values.push(value);
        }
        if (values.length === 0) {
            this._backTo(token);
            return false;
        }
        parent.appendChild(new Text(values.join('')));
        return true;
    }
    // ${foo:<children>}, ${foo} -> variable
    _parseComplexVariable(parent) {
        let name;
        const token = this._token;
        const match = this._accept(0 /* TokenType.Dollar */) &&
            this._accept(3 /* TokenType.CurlyOpen */) &&
            (name = this._accept(9 /* TokenType.VariableName */, true));
        if (!match) {
            return this._backTo(token);
        }
        const variable = new Variable(name);
        if (this._accept(1 /* TokenType.Colon */)) {
            // ${foo:<children>}
            while (true) {
                // ...} -> done
                if (this._accept(4 /* TokenType.CurlyClose */)) {
                    parent.appendChild(variable);
                    return true;
                }
                if (this._parse(variable)) {
                    continue;
                }
                // fallback
                parent.appendChild(new Text('${' + name + ':'));
                variable.children.forEach(parent.appendChild, parent);
                return true;
            }
        }
        else if (this._accept(6 /* TokenType.Forwardslash */)) {
            // ${foo/<regex>/<format>/<options>}
            if (this._parseTransform(variable)) {
                parent.appendChild(variable);
                return true;
            }
            this._backTo(token);
            return false;
        }
        else if (this._accept(4 /* TokenType.CurlyClose */)) {
            // ${foo}
            parent.appendChild(variable);
            return true;
        }
        else {
            // ${foo <- missing curly or colon
            return this._backTo(token);
        }
    }
    _parseTransform(parent) {
        // ...<regex>/<format>/<options>}
        const transform = new Transform();
        let regexValue = '';
        let regexOptions = '';
        // (1) /regex
        while (true) {
            if (this._accept(6 /* TokenType.Forwardslash */)) {
                break;
            }
            let escaped;
            if ((escaped = this._accept(5 /* TokenType.Backslash */, true))) {
                escaped = this._accept(6 /* TokenType.Forwardslash */, true) || escaped;
                regexValue += escaped;
                continue;
            }
            if (this._token.type !== 14 /* TokenType.EOF */) {
                regexValue += this._accept(undefined, true);
                continue;
            }
            return false;
        }
        // (2) /format
        while (true) {
            if (this._accept(6 /* TokenType.Forwardslash */)) {
                break;
            }
            let escaped;
            if ((escaped = this._accept(5 /* TokenType.Backslash */, true))) {
                escaped =
                    this._accept(5 /* TokenType.Backslash */, true) ||
                        this._accept(6 /* TokenType.Forwardslash */, true) ||
                        escaped;
                transform.appendChild(new Text(escaped));
                continue;
            }
            if (this._parseFormatString(transform) || this._parseAnything(transform)) {
                continue;
            }
            return false;
        }
        // (3) /option
        while (true) {
            if (this._accept(4 /* TokenType.CurlyClose */)) {
                break;
            }
            if (this._token.type !== 14 /* TokenType.EOF */) {
                regexOptions += this._accept(undefined, true);
                continue;
            }
            return false;
        }
        try {
            transform.regexp = new RegExp(regexValue, regexOptions);
        }
        catch (e) {
            // invalid regexp
            return false;
        }
        parent.transform = transform;
        return true;
    }
    _parseFormatString(parent) {
        const token = this._token;
        if (!this._accept(0 /* TokenType.Dollar */)) {
            return false;
        }
        let complex = false;
        if (this._accept(3 /* TokenType.CurlyOpen */)) {
            complex = true;
        }
        const index = this._accept(8 /* TokenType.Int */, true);
        if (!index) {
            this._backTo(token);
            return false;
        }
        else if (!complex) {
            // $1
            parent.appendChild(new FormatString(Number(index)));
            return true;
        }
        else if (this._accept(4 /* TokenType.CurlyClose */)) {
            // ${1}
            parent.appendChild(new FormatString(Number(index)));
            return true;
        }
        else if (!this._accept(1 /* TokenType.Colon */)) {
            this._backTo(token);
            return false;
        }
        if (this._accept(6 /* TokenType.Forwardslash */)) {
            // ${1:/upcase}
            const shorthand = this._accept(9 /* TokenType.VariableName */, true);
            if (!shorthand || !this._accept(4 /* TokenType.CurlyClose */)) {
                this._backTo(token);
                return false;
            }
            else {
                parent.appendChild(new FormatString(Number(index), shorthand));
                return true;
            }
        }
        else if (this._accept(11 /* TokenType.Plus */)) {
            // ${1:+<if>}
            const ifValue = this._until(4 /* TokenType.CurlyClose */);
            if (ifValue) {
                parent.appendChild(new FormatString(Number(index), undefined, ifValue, undefined));
                return true;
            }
        }
        else if (this._accept(12 /* TokenType.Dash */)) {
            // ${2:-<else>}
            const elseValue = this._until(4 /* TokenType.CurlyClose */);
            if (elseValue) {
                parent.appendChild(new FormatString(Number(index), undefined, undefined, elseValue));
                return true;
            }
        }
        else if (this._accept(13 /* TokenType.QuestionMark */)) {
            // ${2:?<if>:<else>}
            const ifValue = this._until(1 /* TokenType.Colon */);
            if (ifValue) {
                const elseValue = this._until(4 /* TokenType.CurlyClose */);
                if (elseValue) {
                    parent.appendChild(new FormatString(Number(index), undefined, ifValue, elseValue));
                    return true;
                }
            }
        }
        else {
            // ${1:<else>}
            const elseValue = this._until(4 /* TokenType.CurlyClose */);
            if (elseValue) {
                parent.appendChild(new FormatString(Number(index), undefined, undefined, elseValue));
                return true;
            }
        }
        this._backTo(token);
        return false;
    }
    _parseAnything(marker) {
        if (this._token.type !== 14 /* TokenType.EOF */) {
            marker.appendChild(new Text(this._scanner.tokenText(this._token)));
            this._accept(undefined);
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NuaXBwZXQvYnJvd3Nlci9zbmlwcGV0UGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sQ0FBTixJQUFrQixTQWdCakI7QUFoQkQsV0FBa0IsU0FBUztJQUMxQiw2Q0FBTSxDQUFBO0lBQ04sMkNBQUssQ0FBQTtJQUNMLDJDQUFLLENBQUE7SUFDTCxtREFBUyxDQUFBO0lBQ1QscURBQVUsQ0FBQTtJQUNWLG1EQUFTLENBQUE7SUFDVCx5REFBWSxDQUFBO0lBQ1oseUNBQUksQ0FBQTtJQUNKLHVDQUFHLENBQUE7SUFDSCx5REFBWSxDQUFBO0lBQ1osOENBQU0sQ0FBQTtJQUNOLDBDQUFJLENBQUE7SUFDSiwwQ0FBSSxDQUFBO0lBQ0osMERBQVksQ0FBQTtJQUNaLHdDQUFHLENBQUE7QUFDSixDQUFDLEVBaEJpQixTQUFTLEtBQVQsU0FBUyxRQWdCMUI7QUFRRCxNQUFNLE9BQU8sT0FBTztJQUFwQjtRQTJCQyxVQUFLLEdBQVcsRUFBRSxDQUFBO1FBQ2xCLFFBQUcsR0FBVyxDQUFDLENBQUE7SUFrRWhCLENBQUM7YUE3RmUsV0FBTSxHQUFnQztRQUNwRCw4QkFBcUIsMEJBQWtCO1FBQ3ZDLHlCQUFnQix5QkFBaUI7UUFDakMseUJBQWdCLHlCQUFpQjtRQUNqQyxtQ0FBeUIsNkJBQXFCO1FBQzlDLG9DQUEwQiw4QkFBc0I7UUFDaEQsNkJBQW9CLDZCQUFxQjtRQUN6Qyx5QkFBZ0IsZ0NBQXdCO1FBQ3hDLHlCQUFlLHdCQUFnQjtRQUMvQix3QkFBZSx5QkFBZ0I7UUFDL0Isd0JBQWUseUJBQWdCO1FBQy9CLGdDQUF1QixpQ0FBd0I7S0FDL0MsQUFab0IsQ0FZcEI7SUFFRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFB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
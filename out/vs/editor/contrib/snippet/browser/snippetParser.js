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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc25pcHBldC9icm93c2VyL3NuaXBwZXRQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxDQUFOLElBQWtCLFNBZ0JqQjtBQWhCRCxXQUFrQixTQUFTO0lBQzFCLDZDQUFNLENBQUE7SUFDTiwyQ0FBSyxDQUFBO0lBQ0wsMkNBQUssQ0FBQTtJQUNMLG1EQUFTLENBQUE7SUFDVCxxREFBVSxDQUFBO0lBQ1YsbURBQVMsQ0FBQTtJQUNULHlEQUFZLENBQUE7SUFDWix5Q0FBSSxDQUFBO0lBQ0osdUNBQUcsQ0FBQTtJQUNILHlEQUFZLENBQUE7SUFDWiw4Q0FBTSxDQUFBO0lBQ04sMENBQUksQ0FBQTtJQUNKLDBDQUFJLENBQUE7SUFDSiwwREFBWSxDQUFBO0lBQ1osd0NBQUcsQ0FBQTtBQUNKLENBQUMsRUFoQmlCLFNBQVMsS0FBVCxTQUFTLFFBZ0IxQjtBQVFELE1BQU0sT0FBTyxPQUFPO0lBQXBCO1FBMkJDLFVBQUssR0FBVyxFQUFFLENBQUE7UUFDbEIsUUFBRyxHQUFXLENBQUMsQ0FBQTtJQWtFaEIsQ0FBQzthQTdGZSxXQUFNLEdBQWdDO1FBQ3BELDhCQUFxQiwwQkFBa0I7UUFDdkMseUJBQWdCLHlCQUFpQjtRQUNqQyx5QkFBZ0IseUJBQWlCO1FBQ2pDLG1DQUF5Qiw2QkFBcUI7UUFDOUMsb0NBQTBCLDhCQUFzQjtRQUNoRCw2QkFBb0IsNkJBQXFCO1FBQ3pDLHlCQUFnQixnQ0FBd0I7UUFDeEMseUJBQWUsd0JBQWdCO1FBQy9CLHdCQUFlLHlCQUFnQjtRQUMvQix3QkFBZSx5QkFBZ0I7UUFDL0IsZ0NBQXVCLGlDQUF3QjtLQUMvQyxBQVpvQixDQVlwQjtJQUVELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FB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
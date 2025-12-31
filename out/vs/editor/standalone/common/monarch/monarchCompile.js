/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*
 * This module only exports 'compile' which compiles a JSON language definition
 * into a typed and checked ILexer definition.
 */
import * as monarchCommon from './monarchCommon.js';
/*
 * Type helpers
 *
 * Note: this is just for sanity checks on the JSON description which is
 * helpful for the programmer. No checks are done anymore once the lexer is
 * already 'compiled and checked'.
 *
 */
function isArrayOf(elemType, obj) {
    if (!obj) {
        return false;
    }
    if (!Array.isArray(obj)) {
        return false;
    }
    for (const el of obj) {
        if (!elemType(el)) {
            return false;
        }
    }
    return true;
}
function bool(prop, defValue) {
    if (typeof prop === 'boolean') {
        return prop;
    }
    return defValue;
}
function string(prop, defValue) {
    if (typeof prop === 'string') {
        return prop;
    }
    return defValue;
}
function arrayToHash(array) {
    const result = {};
    for (const e of array) {
        result[e] = true;
    }
    return result;
}
function createKeywordMatcher(arr, caseInsensitive = false) {
    if (caseInsensitive) {
        arr = arr.map(function (x) {
            return x.toLowerCase();
        });
    }
    const hash = arrayToHash(arr);
    if (caseInsensitive) {
        return function (word) {
            return hash[word.toLowerCase()] !== undefined && hash.hasOwnProperty(word.toLowerCase());
        };
    }
    else {
        return function (word) {
            return hash[word] !== undefined && hash.hasOwnProperty(word);
        };
    }
}
function compileRegExp(lexer, str, handleSn) {
    // @@ must be interpreted as a literal @, so we replace all occurences of @@ with a placeholder character
    str = str.replace(/@@/g, `\x01`);
    let n = 0;
    let hadExpansion;
    do {
        hadExpansion = false;
        str = str.replace(/@(\w+)/g, function (s, attr) {
            hadExpansion = true;
            let sub = '';
            if (typeof lexer[attr] === 'string') {
                sub = lexer[attr];
            }
            else if (lexer[attr] && lexer[attr] instanceof RegExp) {
                sub = lexer[attr].source;
            }
            else {
                if (lexer[attr] === undefined) {
                    throw monarchCommon.createError(lexer, "language definition does not contain attribute '" + attr + "', used at: " + str);
                }
                else {
                    throw monarchCommon.createError(lexer, "attribute reference '" + attr + "' must be a string, used at: " + str);
                }
            }
            return monarchCommon.empty(sub) ? '' : '(?:' + sub + ')';
        });
        n++;
    } while (hadExpansion && n < 5);
    // handle escaped @@
    str = str.replace(/\x01/g, '@');
    const flags = (lexer.ignoreCase ? 'i' : '') + (lexer.unicode ? 'u' : '');
    // handle $Sn
    if (handleSn) {
        const match = str.match(/\$[sS](\d\d?)/g);
        if (match) {
            let lastState = null;
            let lastRegEx = null;
            return (state) => {
                if (lastRegEx && lastState === state) {
                    return lastRegEx;
                }
                lastState = state;
                lastRegEx = new RegExp(monarchCommon.substituteMatchesRe(lexer, str, state), flags);
                return lastRegEx;
            };
        }
    }
    return new RegExp(str, flags);
}
/**
 * Compiles guard functions for case matches.
 * This compiles 'cases' attributes into efficient match functions.
 *
 */
function selectScrutinee(id, matches, state, num) {
    if (num < 0) {
        return id;
    }
    if (num < matches.length) {
        return matches[num];
    }
    if (num >= 100) {
        num = num - 100;
        const parts = state.split('.');
        parts.unshift(state);
        if (num < parts.length) {
            return parts[num];
        }
    }
    return null;
}
function createGuard(lexer, ruleName, tkey, val) {
    // get the scrutinee and pattern
    let scrut = -1; // -1: $!, 0-99: $n, 100+n: $Sn
    let oppat = tkey;
    let matches = tkey.match(/^\$(([sS]?)(\d\d?)|#)(.*)$/);
    if (matches) {
        if (matches[3]) {
            // if digits
            scrut = parseInt(matches[3]);
            if (matches[2]) {
                scrut = scrut + 100; // if [sS] present
            }
        }
        oppat = matches[4];
    }
    // get operator
    let op = '~';
    let pat = oppat;
    if (!oppat || oppat.length === 0) {
        op = '!=';
        pat = '';
    }
    else if (/^\w*$/.test(pat)) {
        // just a word
        op = '==';
    }
    else {
        matches = oppat.match(/^(@|!@|~|!~|==|!=)(.*)$/);
        if (matches) {
            op = matches[1];
            pat = matches[2];
        }
    }
    // set the tester function
    let tester;
    // special case a regexp that matches just words
    if ((op === '~' || op === '!~') && /^(\w|\|)*$/.test(pat)) {
        const inWords = createKeywordMatcher(pat.split('|'), lexer.ignoreCase);
        tester = function (s) {
            return op === '~' ? inWords(s) : !inWords(s);
        };
    }
    else if (op === '@' || op === '!@') {
        const words = lexer[pat];
        if (!words) {
            throw monarchCommon.createError(lexer, "the @ match target '" + pat + "' is not defined, in rule: " + ruleName);
        }
        if (!isArrayOf(function (elem) {
            return typeof elem === 'string';
        }, words)) {
            throw monarchCommon.createError(lexer, "the @ match target '" + pat + "' must be an array of strings, in rule: " + ruleName);
        }
        const inWords = createKeywordMatcher(words, lexer.ignoreCase);
        tester = function (s) {
            return op === '@' ? inWords(s) : !inWords(s);
        };
    }
    else if (op === '~' || op === '!~') {
        if (pat.indexOf('$') < 0) {
            // precompile regular expression
            const re = compileRegExp(lexer, '^' + pat + '$', false);
            tester = function (s) {
                return op === '~' ? re.test(s) : !re.test(s);
            };
        }
        else {
            tester = function (s, id, matches, state) {
                const re = compileRegExp(lexer, '^' + monarchCommon.substituteMatches(lexer, pat, id, matches, state) + '$', false);
                return re.test(s);
            };
        }
    }
    else {
        // if (op==='==' || op==='!=') {
        if (pat.indexOf('$') < 0) {
            const patx = monarchCommon.fixCase(lexer, pat);
            tester = function (s) {
                return op === '==' ? s === patx : s !== patx;
            };
        }
        else {
            const patx = monarchCommon.fixCase(lexer, pat);
            tester = function (s, id, matches, state, eos) {
                const patexp = monarchCommon.substituteMatches(lexer, patx, id, matches, state);
                return op === '==' ? s === patexp : s !== patexp;
            };
        }
    }
    // return the branch object
    if (scrut === -1) {
        return {
            name: tkey,
            value: val,
            test: function (id, matches, state, eos) {
                return tester(id, id, matches, state, eos);
            },
        };
    }
    else {
        return {
            name: tkey,
            value: val,
            test: function (id, matches, state, eos) {
                const scrutinee = selectScrutinee(id, matches, state, scrut);
                return tester(!scrutinee ? '' : scrutinee, id, matches, state, eos);
            },
        };
    }
}
/**
 * Compiles an action: i.e. optimize regular expressions and case matches
 * and do many sanity checks.
 *
 * This is called only during compilation but if the lexer definition
 * contains user functions as actions (which is usually not allowed), then this
 * may be called during lexing. It is important therefore to compile common cases efficiently
 */
function compileAction(lexer, ruleName, action) {
    if (!action) {
        return { token: '' };
    }
    else if (typeof action === 'string') {
        return action; // { token: action };
    }
    else if (action.token || action.token === '') {
        if (typeof action.token !== 'string') {
            throw monarchCommon.createError(lexer, "a 'token' attribute must be of type string, in rule: " + ruleName);
        }
        else {
            // only copy specific typed fields (only happens once during compile Lexer)
            const newAction = { token: action.token };
            if (action.token.indexOf('$') >= 0) {
                newAction.tokenSubst = true;
            }
            if (typeof action.bracket === 'string') {
                if (action.bracket === '@open') {
                    newAction.bracket = 1 /* monarchCommon.MonarchBracket.Open */;
                }
                else if (action.bracket === '@close') {
                    newAction.bracket = -1 /* monarchCommon.MonarchBracket.Close */;
                }
                else {
                    throw monarchCommon.createError(lexer, "a 'bracket' attribute must be either '@open' or '@close', in rule: " + ruleName);
                }
            }
            if (action.next) {
                if (typeof action.next !== 'string') {
                    throw monarchCommon.createError(lexer, 'the next state must be a string value in rule: ' + ruleName);
                }
                else {
                    let next = action.next;
                    if (!/^(@pop|@push|@popall)$/.test(next)) {
                        if (next[0] === '@') {
                            next = next.substr(1); // peel off starting @ sign
                        }
                        if (next.indexOf('$') < 0) {
                            // no dollar substitution, we can check if the state exists
                            if (!monarchCommon.stateExists(lexer, monarchCommon.substituteMatches(lexer, next, '', [], ''))) {
                                throw monarchCommon.createError(lexer, "the next state '" + action.next + "' is not defined in rule: " + ruleName);
                            }
                        }
                    }
                    newAction.next = next;
                }
            }
            if (typeof action.goBack === 'number') {
                newAction.goBack = action.goBack;
            }
            if (typeof action.switchTo === 'string') {
                newAction.switchTo = action.switchTo;
            }
            if (typeof action.log === 'string') {
                newAction.log = action.log;
            }
            if (typeof action.nextEmbedded === 'string') {
                newAction.nextEmbedded = action.nextEmbedded;
                lexer.usesEmbedded = true;
            }
            return newAction;
        }
    }
    else if (Array.isArray(action)) {
        const results = [];
        for (let i = 0, len = action.length; i < len; i++) {
            results[i] = compileAction(lexer, ruleName, action[i]);
        }
        return { group: results };
    }
    else if (action.cases) {
        // build an array of test cases
        const cases = [];
        // for each case, push a test function and result value
        for (const tkey in action.cases) {
            if (action.cases.hasOwnProperty(tkey)) {
                const val = compileAction(lexer, ruleName, action.cases[tkey]);
                // what kind of case
                if (tkey === '@default' || tkey === '@' || tkey === '') {
                    cases.push({ test: undefined, value: val, name: tkey });
                }
                else if (tkey === '@eos') {
                    cases.push({
                        test: function (id, matches, state, eos) {
                            return eos;
                        },
                        value: val,
                        name: tkey,
                    });
                }
                else {
                    cases.push(createGuard(lexer, ruleName, tkey, val)); // call separate function to avoid local variable capture
                }
            }
        }
        // create a matching function
        const def = lexer.defaultToken;
        return {
            test: function (id, matches, state, eos) {
                for (const _case of cases) {
                    const didmatch = !_case.test || _case.test(id, matches, state, eos);
                    if (didmatch) {
                        return _case.value;
                    }
                }
                return def;
            },
        };
    }
    else {
        throw monarchCommon.createError(lexer, "an action must be a string, an object with a 'token' or 'cases' attribute, or an array of actions; in rule: " +
            ruleName);
    }
}
/**
 * Helper class for creating matching rules
 */
class Rule {
    constructor(name) {
        this.regex = new RegExp('');
        this.action = { token: '' };
        this.matchOnlyAtLineStart = false;
        this.name = '';
        this.name = name;
    }
    setRegex(lexer, re) {
        let sregex;
        if (typeof re === 'string') {
            sregex = re;
        }
        else if (re instanceof RegExp) {
            sregex = re.source;
        }
        else {
            throw monarchCommon.createError(lexer, 'rules must start with a match string or regular expression: ' + this.name);
        }
        this.matchOnlyAtLineStart = sregex.length > 0 && sregex[0] === '^';
        this.name = this.name + ': ' + sregex;
        this.regex = compileRegExp(lexer, '^(?:' + (this.matchOnlyAtLineStart ? sregex.substr(1) : sregex) + ')', true);
    }
    setAction(lexer, act) {
        this.action = compileAction(lexer, this.name, act);
    }
    resolveRegex(state) {
        if (this.regex instanceof RegExp) {
            return this.regex;
        }
        else {
            return this.regex(state);
        }
    }
}
/**
 * Compiles a json description function into json where all regular expressions,
 * case matches etc, are compiled and all include rules are expanded.
 * We also compile the bracket definitions, supply defaults, and do many sanity checks.
 * If the 'jsonStrict' parameter is 'false', we allow at certain locations
 * regular expression objects and functions that get called during lexing.
 * (Currently we have no samples that need this so perhaps we should always have
 * jsonStrict to true).
 */
export function compile(languageId, json) {
    if (!json || typeof json !== 'object') {
        throw new Error('Monarch: expecting a language definition object');
    }
    // Create our lexer
    const lexer = {
        languageId: languageId,
        includeLF: bool(json.includeLF, false),
        noThrow: false, // raise exceptions during compilation
        maxStack: 100,
        start: typeof json.start === 'string' ? json.start : null,
        ignoreCase: bool(json.ignoreCase, false),
        unicode: bool(json.unicode, false),
        tokenPostfix: string(json.tokenPostfix, '.' + languageId),
        defaultToken: string(json.defaultToken, 'source'),
        usesEmbedded: false, // becomes true if we find a nextEmbedded action
        stateNames: {},
        tokenizer: {},
        brackets: [],
    };
    // For calling compileAction later on
    const lexerMin = json;
    lexerMin.languageId = languageId;
    lexerMin.includeLF = lexer.includeLF;
    lexerMin.ignoreCase = lexer.ignoreCase;
    lexerMin.unicode = lexer.unicode;
    lexerMin.noThrow = lexer.noThrow;
    lexerMin.usesEmbedded = lexer.usesEmbedded;
    lexerMin.stateNames = json.tokenizer;
    lexerMin.defaultToken = lexer.defaultToken;
    // Compile an array of rules into newrules where RegExp objects are created.
    function addRules(state, newrules, rules) {
        for (const rule of rules) {
            let include = rule.include;
            if (include) {
                if (typeof include !== 'string') {
                    throw monarchCommon.createError(lexer, "an 'include' attribute must be a string at: " + state);
                }
                if (include[0] === '@') {
                    include = include.substr(1); // peel off starting @
                }
                if (!json.tokenizer[include]) {
                    throw monarchCommon.createError(lexer, "include target '" + include + "' is not defined at: " + state);
                }
                addRules(state + '.' + include, newrules, json.tokenizer[include]);
            }
            else {
                const newrule = new Rule(state);
                // Set up new rule attributes
                if (Array.isArray(rule) && rule.length >= 1 && rule.length <= 3) {
                    newrule.setRegex(lexerMin, rule[0]);
                    if (rule.length >= 3) {
                        if (typeof rule[1] === 'string') {
                            newrule.setAction(lexerMin, { token: rule[1], next: rule[2] });
                        }
                        else if (typeof rule[1] === 'object') {
                            const rule1 = rule[1];
                            rule1.next = rule[2];
                            newrule.setAction(lexerMin, rule1);
                        }
                        else {
                            throw monarchCommon.createError(lexer, 'a next state as the last element of a rule can only be given if the action is either an object or a string, at: ' +
                                state);
                        }
                    }
                    else {
                        newrule.setAction(lexerMin, rule[1]);
                    }
                }
                else {
                    if (!rule.regex) {
                        throw monarchCommon.createError(lexer, "a rule must either be an array, or an object with a 'regex' or 'include' field at: " +
                            state);
                    }
                    if (rule.name) {
                        if (typeof rule.name === 'string') {
                            newrule.name = rule.name;
                        }
                    }
                    if (rule.matchOnlyAtStart) {
                        newrule.matchOnlyAtLineStart = bool(rule.matchOnlyAtLineStart, false);
                    }
                    newrule.setRegex(lexerMin, rule.regex);
                    newrule.setAction(lexerMin, rule.action);
                }
                newrules.push(newrule);
            }
        }
    }
    // compile the tokenizer rules
    if (!json.tokenizer || typeof json.tokenizer !== 'object') {
        throw monarchCommon.createError(lexer, "a language definition must define the 'tokenizer' attribute as an object");
    }
    lexer.tokenizer = [];
    for (const key in json.tokenizer) {
        if (json.tokenizer.hasOwnProperty(key)) {
            if (!lexer.start) {
                lexer.start = key;
            }
            const rules = json.tokenizer[key];
            lexer.tokenizer[key] = new Array();
            addRules('tokenizer.' + key, lexer.tokenizer[key], rules);
        }
    }
    lexer.usesEmbedded = lexerMin.usesEmbedded; // can be set during compileAction
    // Set simple brackets
    if (json.brackets) {
        if (!Array.isArray(json.brackets)) {
            throw monarchCommon.createError(lexer, "the 'brackets' attribute must be defined as an array");
        }
    }
    else {
        json.brackets = [
            { open: '{', close: '}', token: 'delimiter.curly' },
            { open: '[', close: ']', token: 'delimiter.square' },
            { open: '(', close: ')', token: 'delimiter.parenthesis' },
            { open: '<', close: '>', token: 'delimiter.angle' },
        ];
    }
    const brackets = [];
    for (const el of json.brackets) {
        let desc = el;
        if (desc && Array.isArray(desc) && desc.length === 3) {
            desc = { token: desc[2], open: desc[0], close: desc[1] };
        }
        if (desc.open === desc.close) {
            throw monarchCommon.createError(lexer, "open and close brackets in a 'brackets' attribute must be different: " +
                desc.open +
                "\n hint: use the 'bracket' attribute if matching on equal brackets is required.");
        }
        if (typeof desc.open === 'string' &&
            typeof desc.token === 'string' &&
            typeof desc.close === 'string') {
            brackets.push({
                token: desc.token + lexer.tokenPostfix,
                open: monarchCommon.fixCase(lexer, desc.open),
                close: monarchCommon.fixCase(lexer, desc.close),
            });
        }
        else {
            throw monarchCommon.createError(lexer, "every element in the 'brackets' array must be a '{open,close,token}' object or array");
        }
    }
    lexer.brackets = brackets;
    // Disable throw so the syntax highlighter goes, no matter what
    lexer.noThrow = true;
    return lexer;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaENvbXBpbGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9jb21tb24vbW9uYXJjaC9tb25hcmNoQ29tcGlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7O0dBR0c7QUFFSCxPQUFPLEtBQUssYUFBYSxNQUFNLG9CQUFvQixDQUFBO0FBR25EOzs7Ozs7O0dBT0c7QUFFSCxTQUFTLFNBQVMsQ0FBQyxRQUE2QixFQUFFLEdBQVE7SUFDekQsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ1YsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN6QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxLQUFLLE1BQU0sRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNuQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQsU0FBUyxJQUFJLENBQUMsSUFBUyxFQUFFLFFBQWlCO0lBQ3pDLElBQUksT0FBTyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDL0IsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsT0FBTyxRQUFRLENBQUE7QUFDaEIsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFDLElBQVMsRUFBRSxRQUFnQjtJQUMxQyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzlCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELE9BQU8sUUFBUSxDQUFBO0FBQ2hCLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxLQUFlO0lBQ25DLE1BQU0sTUFBTSxHQUFRLEVBQUUsQ0FBQTtJQUN0QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUE7SUFDakIsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQzVCLEdBQWEsRUFDYixrQkFBMkIsS0FBSztJQUVoQyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3JCLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztZQUN4QixPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUN2QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDN0IsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNyQixPQUFPLFVBQVUsSUFBSTtZQUNwQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtRQUN6RixDQUFDLENBQUE7SUFDRixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sVUFBVSxJQUFJO1lBQ3BCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdELENBQUMsQ0FBQTtJQUNGLENBQUM7QUFDRixDQUFDO0FBZ0JELFNBQVMsYUFBYSxDQUNyQixLQUE4QixFQUM5QixHQUFXLEVBQ1gsUUFBc0I7SUFFdEIseUdBQXlHO0lBQ3pHLEdBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUVoQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDVCxJQUFJLFlBQXFCLENBQUE7SUFDekIsR0FBRyxDQUFDO1FBQ0gsWUFBWSxHQUFHLEtBQUssQ0FBQTtRQUNwQixHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUUsSUFBSztZQUM5QyxZQUFZLEdBQUcsSUFBSSxDQUFBO1lBQ25CLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQTtZQUNaLElBQUksT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3JDLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbEIsQ0FBQztpQkFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksTUFBTSxFQUFFLENBQUM7Z0JBQ3pELEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFBO1lBQ3pCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDL0IsTUFBTSxhQUFhLENBQUMsV0FBVyxDQUM5QixLQUFLLEVBQ0wsa0RBQWtELEdBQUcsSUFBSSxHQUFHLGNBQWMsR0FBRyxHQUFHLENBQ2hGLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sYUFBYSxDQUFDLFdBQVcsQ0FDOUIsS0FBSyxFQUNMLHVCQUF1QixHQUFHLElBQUksR0FBRywrQkFBK0IsR0FBRyxHQUFHLENBQ3RFLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUE7UUFDekQsQ0FBQyxDQUFDLENBQUE7UUFDRixDQUFDLEVBQUUsQ0FBQTtJQUNKLENBQUMsUUFBUSxZQUFZLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBQztJQUUvQixvQkFBb0I7SUFDcEIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBRS9CLE1BQU0sS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7SUFFeEUsYUFBYTtJQUNiLElBQUksUUFBUSxFQUFFLENBQUM7UUFDZCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDekMsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksU0FBUyxHQUFrQixJQUFJLENBQUE7WUFDbkMsSUFBSSxTQUFTLEdBQWtCLElBQUksQ0FBQTtZQUNuQyxPQUFPLENBQUMsS0FBYSxFQUFFLEVBQUU7Z0JBQ3hCLElBQUksU0FBUyxJQUFJLFNBQVMsS0FBSyxLQUFLLEVBQUUsQ0FBQztvQkFDdEMsT0FBTyxTQUFTLENBQUE7Z0JBQ2pCLENBQUM7Z0JBQ0QsU0FBUyxHQUFHLEtBQUssQ0FBQTtnQkFDakIsU0FBUyxHQUFHLElBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUNuRixPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQzlCLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBUyxlQUFlLENBQUMsRUFBVSxFQUFFLE9BQWlCLEVBQUUsS0FBYSxFQUFFLEdBQVc7SUFDakYsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDYixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDMUIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDcEIsQ0FBQztJQUNELElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2hCLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFBO1FBQ2YsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM5QixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BCLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4QixPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNsQixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVELFNBQVMsV0FBVyxDQUNuQixLQUE4QixFQUM5QixRQUFnQixFQUNoQixJQUFZLEVBQ1osR0FBOEI7SUFFOUIsZ0NBQWdDO0lBQ2hDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBLENBQUMsK0JBQStCO0lBQzlDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQTtJQUNoQixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUE7SUFDdEQsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNiLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDaEIsWUFBWTtZQUNaLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUIsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDaEIsS0FBSyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUEsQ0FBQyxrQkFBa0I7WUFDdkMsQ0FBQztRQUNGLENBQUM7UUFDRCxLQUFLLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25CLENBQUM7SUFDRCxlQUFlO0lBQ2YsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFBO0lBQ1osSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFBO0lBQ2YsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2xDLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFDVCxHQUFHLEdBQUcsRUFBRSxDQUFBO0lBQ1QsQ0FBQztTQUFNLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzlCLGNBQWM7UUFDZCxFQUFFLEdBQUcsSUFBSSxDQUFBO0lBQ1YsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQ2hELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2YsR0FBRyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztJQUVELDBCQUEwQjtJQUMxQixJQUFJLE1BQTBGLENBQUE7SUFFOUYsZ0RBQWdEO0lBQ2hELElBQUksQ0FBQyxFQUFFLEtBQUssR0FBRyxJQUFJLEVBQUUsS0FBSyxJQUFJLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDM0QsTUFBTSxPQUFPLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdEUsTUFBTSxHQUFHLFVBQVUsQ0FBQztZQUNuQixPQUFPLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0MsQ0FBQyxDQUFBO0lBQ0YsQ0FBQztTQUFNLElBQUksRUFBRSxLQUFLLEdBQUcsSUFBSSxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDdEMsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sYUFBYSxDQUFDLFdBQVcsQ0FDOUIsS0FBSyxFQUNMLHNCQUFzQixHQUFHLEdBQUcsR0FBRyw2QkFBNkIsR0FBRyxRQUFRLENBQ3ZFLENBQUE7UUFDRixDQUFDO1FBQ0QsSUFDQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLElBQUk7WUFDeEIsT0FBTyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUE7UUFDaEMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUNSLENBQUM7WUFDRixNQUFNLGFBQWEsQ0FBQyxXQUFXLENBQzlCLEtBQUssRUFDTCxzQkFBc0IsR0FBRyxHQUFHLEdBQUcsMENBQTBDLEdBQUcsUUFBUSxDQUNwRixDQUFBO1FBQ0YsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0QsTUFBTSxHQUFHLFVBQVUsQ0FBQztZQUNuQixPQUFPLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0MsQ0FBQyxDQUFBO0lBQ0YsQ0FBQztTQUFNLElBQUksRUFBRSxLQUFLLEdBQUcsSUFBSSxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDdEMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzFCLGdDQUFnQztZQUNoQyxNQUFNLEVBQUUsR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sR0FBRyxVQUFVLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzdDLENBQUMsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSztnQkFDdkMsTUFBTSxFQUFFLEdBQUcsYUFBYSxDQUN2QixLQUFLLEVBQ0wsR0FBRyxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLEdBQUcsR0FBRyxFQUMzRSxLQUFLLENBQ0wsQ0FBQTtnQkFDRCxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbEIsQ0FBQyxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsZ0NBQWdDO1FBQ2hDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQixNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUM5QyxNQUFNLEdBQUcsVUFBVSxDQUFDO2dCQUNuQixPQUFPLEVBQUUsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUE7WUFDN0MsQ0FBQyxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUM5QyxNQUFNLEdBQUcsVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRztnQkFDNUMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDL0UsT0FBTyxFQUFFLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFBO1lBQ2pELENBQUMsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsMkJBQTJCO0lBQzNCLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbEIsT0FBTztZQUNOLElBQUksRUFBRSxJQUFJO1lBQ1YsS0FBSyxFQUFFLEdBQUc7WUFDVixJQUFJLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHO2dCQUN0QyxPQUFPLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDM0MsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU87WUFDTixJQUFJLEVBQUUsSUFBSTtZQUNWLEtBQUssRUFBRSxHQUFHO1lBQ1YsSUFBSSxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRztnQkFDdEMsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUM1RCxPQUFPLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDcEUsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVEOzs7Ozs7O0dBT0c7QUFDSCxTQUFTLGFBQWEsQ0FDckIsS0FBOEIsRUFDOUIsUUFBZ0IsRUFDaEIsTUFBVztJQUVYLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUE7SUFDckIsQ0FBQztTQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDdkMsT0FBTyxNQUFNLENBQUEsQ0FBQyxxQkFBcUI7SUFDcEMsQ0FBQztTQUFNLElBQUksTUFBTSxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLEVBQUUsRUFBRSxDQUFDO1FBQ2hELElBQUksT0FBTyxNQUFNLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sYUFBYSxDQUFDLFdBQVcsQ0FDOUIsS0FBSyxFQUNMLHVEQUF1RCxHQUFHLFFBQVEsQ0FDbEUsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsMkVBQTJFO1lBQzNFLE1BQU0sU0FBUyxHQUEwQixFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDaEUsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsU0FBUyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7WUFDNUIsQ0FBQztZQUNELElBQUksT0FBTyxNQUFNLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUN4QyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEtBQUssT0FBTyxFQUFFLENBQUM7b0JBQ2hDLFNBQVMsQ0FBQyxPQUFPLDRDQUFvQyxDQUFBO2dCQUN0RCxDQUFDO3FCQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDeEMsU0FBUyxDQUFDLE9BQU8sOENBQXFDLENBQUE7Z0JBQ3ZELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLGFBQWEsQ0FBQyxXQUFXLENBQzlCLEtBQUssRUFDTCxxRUFBcUUsR0FBRyxRQUFRLENBQ2hGLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3JDLE1BQU0sYUFBYSxDQUFDLFdBQVcsQ0FDOUIsS0FBSyxFQUNMLGlEQUFpRCxHQUFHLFFBQVEsQ0FDNUQsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxJQUFJLEdBQVcsTUFBTSxDQUFDLElBQUksQ0FBQTtvQkFDOUIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3dCQUMxQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQzs0QkFDckIsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQywyQkFBMkI7d0JBQ2xELENBQUM7d0JBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDOzRCQUMzQiwyREFBMkQ7NEJBQzNELElBQ0MsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUN6QixLQUFLLEVBQ0wsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FDeEQsRUFDQSxDQUFDO2dDQUNGLE1BQU0sYUFBYSxDQUFDLFdBQVcsQ0FDOUIsS0FBSyxFQUNMLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsNEJBQTRCLEdBQUcsUUFBUSxDQUMxRSxDQUFBOzRCQUNGLENBQUM7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO29CQUNELFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO2dCQUN0QixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksT0FBTyxNQUFNLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUN2QyxTQUFTLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUE7WUFDakMsQ0FBQztZQUNELElBQUksT0FBTyxNQUFNLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUN6QyxTQUFTLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUE7WUFDckMsQ0FBQztZQUNELElBQUksT0FBTyxNQUFNLENBQUMsR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNwQyxTQUFTLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUE7WUFDM0IsQ0FBQztZQUNELElBQUksT0FBTyxNQUFNLENBQUMsWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUM3QyxTQUFTLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUE7Z0JBQzVDLEtBQUssQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1lBQzFCLENBQUM7WUFDRCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztTQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sT0FBTyxHQUFnQyxFQUFFLENBQUE7UUFDL0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25ELE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2RCxDQUFDO1FBQ0QsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQTtJQUMxQixDQUFDO1NBQU0sSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDekIsK0JBQStCO1FBQy9CLE1BQU0sS0FBSyxHQUE0QixFQUFFLENBQUE7UUFFekMsdURBQXVEO1FBQ3ZELEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2pDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO2dCQUU5RCxvQkFBb0I7Z0JBQ3BCLElBQUksSUFBSSxLQUFLLFVBQVUsSUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksS0FBSyxFQUFFLEVBQUUsQ0FBQztvQkFDeEQsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDeEQsQ0FBQztxQkFBTSxJQUFJLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztvQkFDNUIsS0FBSyxDQUFDLElBQUksQ0FBQzt3QkFDVixJQUFJLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHOzRCQUN0QyxPQUFPLEdBQUcsQ0FBQTt3QkFDWCxDQUFDO3dCQUNELEtBQUssRUFBRSxHQUFHO3dCQUNWLElBQUksRUFBRSxJQUFJO3FCQUNWLENBQUMsQ0FBQTtnQkFDSCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQSxDQUFDLHlEQUF5RDtnQkFDOUcsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsNkJBQTZCO1FBQzdCLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUE7UUFDOUIsT0FBTztZQUNOLElBQUksRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUc7Z0JBQ3RDLEtBQUssTUFBTSxLQUFLLElBQUksS0FBSyxFQUFFLENBQUM7b0JBQzNCLE1BQU0sUUFBUSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFBO29CQUNuRSxJQUFJLFFBQVEsRUFBRSxDQUFDO3dCQUNkLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQTtvQkFDbkIsQ0FBQztnQkFDRixDQUFDO2dCQUNELE9BQU8sR0FBRyxDQUFBO1lBQ1gsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDO1NBQU0sQ0FBQztRQUNQLE1BQU0sYUFBYSxDQUFDLFdBQVcsQ0FDOUIsS0FBSyxFQUNMLDhHQUE4RztZQUM3RyxRQUFRLENBQ1QsQ0FBQTtJQUNGLENBQUM7QUFDRixDQUFDO0FBSUQ7O0dBRUc7QUFDSCxNQUFNLElBQUk7SUFNVCxZQUFZLElBQVk7UUFMaEIsVUFBSyxHQUEyQixJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMvQyxXQUFNLEdBQThCLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFBO1FBQ2pELHlCQUFvQixHQUFZLEtBQUssQ0FBQTtRQUNyQyxTQUFJLEdBQVcsRUFBRSxDQUFBO1FBR3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO0lBQ2pCLENBQUM7SUFFTSxRQUFRLENBQUMsS0FBOEIsRUFBRSxFQUFtQjtRQUNsRSxJQUFJLE1BQWMsQ0FBQTtRQUNsQixJQUFJLE9BQU8sRUFBRSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzVCLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDWixDQUFDO2FBQU0sSUFBSSxFQUFFLFlBQVksTUFBTSxFQUFFLENBQUM7WUFDakMsTUFBTSxHQUFZLEVBQUcsQ0FBQyxNQUFNLENBQUE7UUFDN0IsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLGFBQWEsQ0FBQyxXQUFXLENBQzlCLEtBQUssRUFDTCw4REFBOEQsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUMxRSxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFBO1FBQ2xFLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFBO1FBQ3JDLElBQUksQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUN6QixLQUFLLEVBQ0wsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLEVBQ3RFLElBQUksQ0FDSixDQUFBO0lBQ0YsQ0FBQztJQUVNLFNBQVMsQ0FBQyxLQUE4QixFQUFFLEdBQTBCO1FBQzFFLElBQUksQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFTSxZQUFZLENBQUMsS0FBYTtRQUNoQyxJQUFJLElBQUksQ0FBQyxLQUFLLFlBQVksTUFBTSxFQUFFLENBQUM7WUFDbEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO1FBQ2xCLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3pCLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sVUFBVSxPQUFPLENBQUMsVUFBa0IsRUFBRSxJQUFzQjtJQUNqRSxJQUFJLENBQUMsSUFBSSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsbUJBQW1CO0lBQ25CLE1BQU0sS0FBSyxHQUF5QjtRQUNuQyxVQUFVLEVBQUUsVUFBVTtRQUN0QixTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDO1FBQ3RDLE9BQU8sRUFBRSxLQUFLLEVBQUUsc0NBQXNDO1FBQ3RELFFBQVEsRUFBRSxHQUFHO1FBQ2IsS0FBSyxFQUFFLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUk7UUFDekQsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQztRQUN4QyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDO1FBQ2xDLFlBQVksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEdBQUcsVUFBVSxDQUFDO1FBQ3pELFlBQVksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUM7UUFDakQsWUFBWSxFQUFFLEtBQUssRUFBRSxnREFBZ0Q7UUFDckUsVUFBVSxFQUFFLEVBQUU7UUFDZCxTQUFTLEVBQUUsRUFBRTtRQUNiLFFBQVEsRUFBRSxFQUFFO0tBQ1osQ0FBQTtJQUVELHFDQUFxQztJQUNyQyxNQUFNLFFBQVEsR0FBaUMsSUFBSSxDQUFBO0lBQ25ELFFBQVEsQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO0lBQ2hDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQTtJQUNwQyxRQUFRLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUE7SUFDdEMsUUFBUSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFBO0lBQ2hDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQTtJQUNoQyxRQUFRLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUE7SUFDMUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFBO0lBQ3BDLFFBQVEsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQTtJQUUxQyw0RUFBNEU7SUFDNUUsU0FBUyxRQUFRLENBQUMsS0FBYSxFQUFFLFFBQStCLEVBQUUsS0FBWTtRQUM3RSxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7WUFDMUIsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNqQyxNQUFNLGFBQWEsQ0FBQyxXQUFXLENBQzlCLEtBQUssRUFDTCw4Q0FBOEMsR0FBRyxLQUFLLENBQ3RELENBQUE7Z0JBQ0YsQ0FBQztnQkFDRCxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztvQkFDeEIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQyxzQkFBc0I7Z0JBQ25ELENBQUM7Z0JBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxhQUFhLENBQUMsV0FBVyxDQUM5QixLQUFLLEVBQ0wsa0JBQWtCLEdBQUcsT0FBTyxHQUFHLHVCQUF1QixHQUFHLEtBQUssQ0FDOUQsQ0FBQTtnQkFDRixDQUFDO2dCQUNELFFBQVEsQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ25FLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLE9BQU8sR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFFL0IsNkJBQTZCO2dCQUM3QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDakUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ25DLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDdEIsSUFBSSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQzs0QkFDakMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO3dCQUMvRCxDQUFDOzZCQUFNLElBQUksT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7NEJBQ3hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTs0QkFDckIsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7NEJBQ3BCLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO3dCQUNuQyxDQUFDOzZCQUFNLENBQUM7NEJBQ1AsTUFBTSxhQUFhLENBQUMsV0FBVyxDQUM5QixLQUFLLEVBQ0wsa0hBQWtIO2dDQUNqSCxLQUFLLENBQ04sQ0FBQTt3QkFDRixDQUFDO29CQUNGLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDckMsQ0FBQztnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDakIsTUFBTSxhQUFhLENBQUMsV0FBVyxDQUM5QixLQUFLLEVBQ0wscUZBQXFGOzRCQUNwRixLQUFLLENBQ04sQ0FBQTtvQkFDRixDQUFDO29CQUNELElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNmLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDOzRCQUNuQyxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7d0JBQ3pCLENBQUM7b0JBQ0YsQ0FBQztvQkFDRCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO3dCQUMzQixPQUFPLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDdEUsQ0FBQztvQkFDRCxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ3RDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDekMsQ0FBQztnQkFFRCxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELDhCQUE4QjtJQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxPQUFPLElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDM0QsTUFBTSxhQUFhLENBQUMsV0FBVyxDQUM5QixLQUFLLEVBQ0wsMEVBQTBFLENBQzFFLENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsR0FBUSxFQUFFLENBQUE7SUFDekIsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDbEMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2xCLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFBO1lBQ2xCLENBQUM7WUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2pDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQTtZQUNsQyxRQUFRLENBQUMsWUFBWSxHQUFHLEdBQUcsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzFELENBQUM7SUFDRixDQUFDO0lBQ0QsS0FBSyxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFBLENBQUMsa0NBQWtDO0lBRTdFLHNCQUFzQjtJQUN0QixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBTSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN4QyxNQUFNLGFBQWEsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLHNEQUFzRCxDQUFDLENBQUE7UUFDL0YsQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsSUFBSSxDQUFDLFFBQVEsR0FBRztZQUNmLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRTtZQUNuRCxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUU7WUFDcEQsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFO1lBQ3pELEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRTtTQUNuRCxDQUFBO0lBQ0YsQ0FBQztJQUNELE1BQU0sUUFBUSxHQUE4QixFQUFFLENBQUE7SUFDOUMsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDaEMsSUFBSSxJQUFJLEdBQVEsRUFBRSxDQUFBO1FBQ2xCLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0RCxJQUFJLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ3pELENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzlCLE1BQU0sYUFBYSxDQUFDLFdBQVcsQ0FDOUIsS0FBSyxFQUNMLHVFQUF1RTtnQkFDdEUsSUFBSSxDQUFDLElBQUk7Z0JBQ1QsaUZBQWlGLENBQ2xGLENBQUE7UUFDRixDQUFDO1FBQ0QsSUFDQyxPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUTtZQUM3QixPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssUUFBUTtZQUM5QixPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUM3QixDQUFDO1lBQ0YsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDYixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsWUFBWTtnQkFDdEMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQzdDLEtBQUssRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDO2FBQy9DLENBQUMsQ0FBQTtRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxhQUFhLENBQUMsV0FBVyxDQUM5QixLQUFLLEVBQ0wsc0ZBQXNGLENBQ3RGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELEtBQUssQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO0lBRXpCLCtEQUErRDtJQUMvRCxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQTtJQUNwQixPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUMifQ==
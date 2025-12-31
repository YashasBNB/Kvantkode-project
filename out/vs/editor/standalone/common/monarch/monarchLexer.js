/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MonarchTokenizer_1;
/**
 * Create a syntax highighter with a fully declarative JSON style lexer description
 * using regular expressions.
 */
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as languages from '../../../common/languages.js';
import { NullState, nullTokenizeEncoded, nullTokenize, } from '../../../common/languages/nullTokenize.js';
import * as monarchCommon from './monarchCommon.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const CACHE_STACK_DEPTH = 5;
/**
 * Reuse the same stack elements up to a certain depth.
 */
class MonarchStackElementFactory {
    static { this._INSTANCE = new MonarchStackElementFactory(CACHE_STACK_DEPTH); }
    static create(parent, state) {
        return this._INSTANCE.create(parent, state);
    }
    constructor(maxCacheDepth) {
        this._maxCacheDepth = maxCacheDepth;
        this._entries = Object.create(null);
    }
    create(parent, state) {
        if (parent !== null && parent.depth >= this._maxCacheDepth) {
            // no caching above a certain depth
            return new MonarchStackElement(parent, state);
        }
        let stackElementId = MonarchStackElement.getStackElementId(parent);
        if (stackElementId.length > 0) {
            stackElementId += '|';
        }
        stackElementId += state;
        let result = this._entries[stackElementId];
        if (result) {
            return result;
        }
        result = new MonarchStackElement(parent, state);
        this._entries[stackElementId] = result;
        return result;
    }
}
class MonarchStackElement {
    constructor(parent, state) {
        this.parent = parent;
        this.state = state;
        this.depth = (this.parent ? this.parent.depth : 0) + 1;
    }
    static getStackElementId(element) {
        let result = '';
        while (element !== null) {
            if (result.length > 0) {
                result += '|';
            }
            result += element.state;
            element = element.parent;
        }
        return result;
    }
    static _equals(a, b) {
        while (a !== null && b !== null) {
            if (a === b) {
                return true;
            }
            if (a.state !== b.state) {
                return false;
            }
            a = a.parent;
            b = b.parent;
        }
        if (a === null && b === null) {
            return true;
        }
        return false;
    }
    equals(other) {
        return MonarchStackElement._equals(this, other);
    }
    push(state) {
        return MonarchStackElementFactory.create(this, state);
    }
    pop() {
        return this.parent;
    }
    popall() {
        let result = this;
        while (result.parent) {
            result = result.parent;
        }
        return result;
    }
    switchTo(state) {
        return MonarchStackElementFactory.create(this.parent, state);
    }
}
class EmbeddedLanguageData {
    constructor(languageId, state) {
        this.languageId = languageId;
        this.state = state;
    }
    equals(other) {
        return this.languageId === other.languageId && this.state.equals(other.state);
    }
    clone() {
        const stateClone = this.state.clone();
        // save an object
        if (stateClone === this.state) {
            return this;
        }
        return new EmbeddedLanguageData(this.languageId, this.state);
    }
}
/**
 * Reuse the same line states up to a certain depth.
 */
class MonarchLineStateFactory {
    static { this._INSTANCE = new MonarchLineStateFactory(CACHE_STACK_DEPTH); }
    static create(stack, embeddedLanguageData) {
        return this._INSTANCE.create(stack, embeddedLanguageData);
    }
    constructor(maxCacheDepth) {
        this._maxCacheDepth = maxCacheDepth;
        this._entries = Object.create(null);
    }
    create(stack, embeddedLanguageData) {
        if (embeddedLanguageData !== null) {
            // no caching when embedding
            return new MonarchLineState(stack, embeddedLanguageData);
        }
        if (stack !== null && stack.depth >= this._maxCacheDepth) {
            // no caching above a certain depth
            return new MonarchLineState(stack, embeddedLanguageData);
        }
        const stackElementId = MonarchStackElement.getStackElementId(stack);
        let result = this._entries[stackElementId];
        if (result) {
            return result;
        }
        result = new MonarchLineState(stack, null);
        this._entries[stackElementId] = result;
        return result;
    }
}
class MonarchLineState {
    constructor(stack, embeddedLanguageData) {
        this.stack = stack;
        this.embeddedLanguageData = embeddedLanguageData;
    }
    clone() {
        const embeddedlanguageDataClone = this.embeddedLanguageData
            ? this.embeddedLanguageData.clone()
            : null;
        // save an object
        if (embeddedlanguageDataClone === this.embeddedLanguageData) {
            return this;
        }
        return MonarchLineStateFactory.create(this.stack, this.embeddedLanguageData);
    }
    equals(other) {
        if (!(other instanceof MonarchLineState)) {
            return false;
        }
        if (!this.stack.equals(other.stack)) {
            return false;
        }
        if (this.embeddedLanguageData === null && other.embeddedLanguageData === null) {
            return true;
        }
        if (this.embeddedLanguageData === null || other.embeddedLanguageData === null) {
            return false;
        }
        return this.embeddedLanguageData.equals(other.embeddedLanguageData);
    }
}
class MonarchClassicTokensCollector {
    constructor() {
        this._tokens = [];
        this._languageId = null;
        this._lastTokenType = null;
        this._lastTokenLanguage = null;
    }
    enterLanguage(languageId) {
        this._languageId = languageId;
    }
    emit(startOffset, type) {
        if (this._lastTokenType === type && this._lastTokenLanguage === this._languageId) {
            return;
        }
        this._lastTokenType = type;
        this._lastTokenLanguage = this._languageId;
        this._tokens.push(new languages.Token(startOffset, type, this._languageId));
    }
    nestedLanguageTokenize(embeddedLanguageLine, hasEOL, embeddedLanguageData, offsetDelta) {
        const nestedLanguageId = embeddedLanguageData.languageId;
        const embeddedModeState = embeddedLanguageData.state;
        const nestedLanguageTokenizationSupport = languages.TokenizationRegistry.get(nestedLanguageId);
        if (!nestedLanguageTokenizationSupport) {
            this.enterLanguage(nestedLanguageId);
            this.emit(offsetDelta, '');
            return embeddedModeState;
        }
        const nestedResult = nestedLanguageTokenizationSupport.tokenize(embeddedLanguageLine, hasEOL, embeddedModeState);
        if (offsetDelta !== 0) {
            for (const token of nestedResult.tokens) {
                this._tokens.push(new languages.Token(token.offset + offsetDelta, token.type, token.language));
            }
        }
        else {
            this._tokens = this._tokens.concat(nestedResult.tokens);
        }
        this._lastTokenType = null;
        this._lastTokenLanguage = null;
        this._languageId = null;
        return nestedResult.endState;
    }
    finalize(endState) {
        return new languages.TokenizationResult(this._tokens, endState);
    }
}
class MonarchModernTokensCollector {
    constructor(languageService, theme) {
        this._languageService = languageService;
        this._theme = theme;
        this._prependTokens = null;
        this._tokens = [];
        this._currentLanguageId = 0 /* LanguageId.Null */;
        this._lastTokenMetadata = 0;
    }
    enterLanguage(languageId) {
        this._currentLanguageId = this._languageService.languageIdCodec.encodeLanguageId(languageId);
    }
    emit(startOffset, type) {
        const metadata = this._theme.match(this._currentLanguageId, type) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */;
        if (this._lastTokenMetadata === metadata) {
            return;
        }
        this._lastTokenMetadata = metadata;
        this._tokens.push(startOffset);
        this._tokens.push(metadata);
    }
    static _merge(a, b, c) {
        const aLen = a !== null ? a.length : 0;
        const bLen = b.length;
        const cLen = c !== null ? c.length : 0;
        if (aLen === 0 && bLen === 0 && cLen === 0) {
            return new Uint32Array(0);
        }
        if (aLen === 0 && bLen === 0) {
            return c;
        }
        if (bLen === 0 && cLen === 0) {
            return a;
        }
        const result = new Uint32Array(aLen + bLen + cLen);
        if (a !== null) {
            result.set(a);
        }
        for (let i = 0; i < bLen; i++) {
            result[aLen + i] = b[i];
        }
        if (c !== null) {
            result.set(c, aLen + bLen);
        }
        return result;
    }
    nestedLanguageTokenize(embeddedLanguageLine, hasEOL, embeddedLanguageData, offsetDelta) {
        const nestedLanguageId = embeddedLanguageData.languageId;
        const embeddedModeState = embeddedLanguageData.state;
        const nestedLanguageTokenizationSupport = languages.TokenizationRegistry.get(nestedLanguageId);
        if (!nestedLanguageTokenizationSupport) {
            this.enterLanguage(nestedLanguageId);
            this.emit(offsetDelta, '');
            return embeddedModeState;
        }
        const nestedResult = nestedLanguageTokenizationSupport.tokenizeEncoded(embeddedLanguageLine, hasEOL, embeddedModeState);
        if (offsetDelta !== 0) {
            for (let i = 0, len = nestedResult.tokens.length; i < len; i += 2) {
                nestedResult.tokens[i] += offsetDelta;
            }
        }
        this._prependTokens = MonarchModernTokensCollector._merge(this._prependTokens, this._tokens, nestedResult.tokens);
        this._tokens = [];
        this._currentLanguageId = 0;
        this._lastTokenMetadata = 0;
        return nestedResult.endState;
    }
    finalize(endState) {
        return new languages.EncodedTokenizationResult(MonarchModernTokensCollector._merge(this._prependTokens, this._tokens, null), endState);
    }
}
let MonarchTokenizer = MonarchTokenizer_1 = class MonarchTokenizer extends Disposable {
    constructor(languageService, standaloneThemeService, languageId, lexer, _configurationService) {
        super();
        this._configurationService = _configurationService;
        this._languageService = languageService;
        this._standaloneThemeService = standaloneThemeService;
        this._languageId = languageId;
        this._lexer = lexer;
        this._embeddedLanguages = Object.create(null);
        this.embeddedLoaded = Promise.resolve(undefined);
        // Set up listening for embedded modes
        let emitting = false;
        this._register(languages.TokenizationRegistry.onDidChange((e) => {
            if (emitting) {
                return;
            }
            let isOneOfMyEmbeddedModes = false;
            for (let i = 0, len = e.changedLanguages.length; i < len; i++) {
                const language = e.changedLanguages[i];
                if (this._embeddedLanguages[language]) {
                    isOneOfMyEmbeddedModes = true;
                    break;
                }
            }
            if (isOneOfMyEmbeddedModes) {
                emitting = true;
                languages.TokenizationRegistry.handleChange([this._languageId]);
                emitting = false;
            }
        }));
        this._maxTokenizationLineLength = this._configurationService.getValue('editor.maxTokenizationLineLength', {
            overrideIdentifier: this._languageId,
        });
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.maxTokenizationLineLength')) {
                this._maxTokenizationLineLength = this._configurationService.getValue('editor.maxTokenizationLineLength', {
                    overrideIdentifier: this._languageId,
                });
            }
        }));
    }
    getLoadStatus() {
        const promises = [];
        for (const nestedLanguageId in this._embeddedLanguages) {
            const tokenizationSupport = languages.TokenizationRegistry.get(nestedLanguageId);
            if (tokenizationSupport) {
                // The nested language is already loaded
                if (tokenizationSupport instanceof MonarchTokenizer_1) {
                    const nestedModeStatus = tokenizationSupport.getLoadStatus();
                    if (nestedModeStatus.loaded === false) {
                        promises.push(nestedModeStatus.promise);
                    }
                }
                continue;
            }
            if (!languages.TokenizationRegistry.isResolved(nestedLanguageId)) {
                // The nested language is in the process of being loaded
                promises.push(languages.TokenizationRegistry.getOrCreate(nestedLanguageId));
            }
        }
        if (promises.length === 0) {
            return {
                loaded: true,
            };
        }
        return {
            loaded: false,
            promise: Promise.all(promises).then((_) => undefined),
        };
    }
    getInitialState() {
        const rootState = MonarchStackElementFactory.create(null, this._lexer.start);
        return MonarchLineStateFactory.create(rootState, null);
    }
    tokenize(line, hasEOL, lineState) {
        if (line.length >= this._maxTokenizationLineLength) {
            return nullTokenize(this._languageId, lineState);
        }
        const tokensCollector = new MonarchClassicTokensCollector();
        const endLineState = this._tokenize(line, hasEOL, lineState, tokensCollector);
        return tokensCollector.finalize(endLineState);
    }
    tokenizeEncoded(line, hasEOL, lineState) {
        if (line.length >= this._maxTokenizationLineLength) {
            return nullTokenizeEncoded(this._languageService.languageIdCodec.encodeLanguageId(this._languageId), lineState);
        }
        const tokensCollector = new MonarchModernTokensCollector(this._languageService, this._standaloneThemeService.getColorTheme().tokenTheme);
        const endLineState = this._tokenize(line, hasEOL, lineState, tokensCollector);
        return tokensCollector.finalize(endLineState);
    }
    _tokenize(line, hasEOL, lineState, collector) {
        if (lineState.embeddedLanguageData) {
            return this._nestedTokenize(line, hasEOL, lineState, 0, collector);
        }
        else {
            return this._myTokenize(line, hasEOL, lineState, 0, collector);
        }
    }
    _findLeavingNestedLanguageOffset(line, state) {
        let rules = this._lexer.tokenizer[state.stack.state];
        if (!rules) {
            rules = monarchCommon.findRules(this._lexer, state.stack.state); // do parent matching
            if (!rules) {
                throw monarchCommon.createError(this._lexer, 'tokenizer state is not defined: ' + state.stack.state);
            }
        }
        let popOffset = -1;
        let hasEmbeddedPopRule = false;
        for (const rule of rules) {
            if (!monarchCommon.isIAction(rule.action) || rule.action.nextEmbedded !== '@pop') {
                continue;
            }
            hasEmbeddedPopRule = true;
            let regex = rule.resolveRegex(state.stack.state);
            const regexSource = regex.source;
            if (regexSource.substr(0, 4) === '^(?:' &&
                regexSource.substr(regexSource.length - 1, 1) === ')') {
                const flags = (regex.ignoreCase ? 'i' : '') + (regex.unicode ? 'u' : '');
                regex = new RegExp(regexSource.substr(4, regexSource.length - 5), flags);
            }
            const result = line.search(regex);
            if (result === -1 || (result !== 0 && rule.matchOnlyAtLineStart)) {
                continue;
            }
            if (popOffset === -1 || result < popOffset) {
                popOffset = result;
            }
        }
        if (!hasEmbeddedPopRule) {
            throw monarchCommon.createError(this._lexer, 'no rule containing nextEmbedded: "@pop" in tokenizer embedded state: ' + state.stack.state);
        }
        return popOffset;
    }
    _nestedTokenize(line, hasEOL, lineState, offsetDelta, tokensCollector) {
        const popOffset = this._findLeavingNestedLanguageOffset(line, lineState);
        if (popOffset === -1) {
            // tokenization will not leave nested language
            const nestedEndState = tokensCollector.nestedLanguageTokenize(line, hasEOL, lineState.embeddedLanguageData, offsetDelta);
            return MonarchLineStateFactory.create(lineState.stack, new EmbeddedLanguageData(lineState.embeddedLanguageData.languageId, nestedEndState));
        }
        const nestedLanguageLine = line.substring(0, popOffset);
        if (nestedLanguageLine.length > 0) {
            // tokenize with the nested language
            tokensCollector.nestedLanguageTokenize(nestedLanguageLine, false, lineState.embeddedLanguageData, offsetDelta);
        }
        const restOfTheLine = line.substring(popOffset);
        return this._myTokenize(restOfTheLine, hasEOL, lineState, offsetDelta + popOffset, tokensCollector);
    }
    _safeRuleName(rule) {
        if (rule) {
            return rule.name;
        }
        return '(unknown)';
    }
    _myTokenize(lineWithoutLF, hasEOL, lineState, offsetDelta, tokensCollector) {
        tokensCollector.enterLanguage(this._languageId);
        const lineWithoutLFLength = lineWithoutLF.length;
        const line = hasEOL && this._lexer.includeLF ? lineWithoutLF + '\n' : lineWithoutLF;
        const lineLength = line.length;
        let embeddedLanguageData = lineState.embeddedLanguageData;
        let stack = lineState.stack;
        let pos = 0;
        let groupMatching = null;
        // See https://github.com/microsoft/monaco-editor/issues/1235
        // Evaluate rules at least once for an empty line
        let forceEvaluation = true;
        while (forceEvaluation || pos < lineLength) {
            const pos0 = pos;
            const stackLen0 = stack.depth;
            const groupLen0 = groupMatching ? groupMatching.groups.length : 0;
            const state = stack.state;
            let matches = null;
            let matched = null;
            let action = null;
            let rule = null;
            let enteringEmbeddedLanguage = null;
            // check if we need to process group matches first
            if (groupMatching) {
                matches = groupMatching.matches;
                const groupEntry = groupMatching.groups.shift();
                matched = groupEntry.matched;
                action = groupEntry.action;
                rule = groupMatching.rule;
                // cleanup if necessary
                if (groupMatching.groups.length === 0) {
                    groupMatching = null;
                }
            }
            else {
                // otherwise we match on the token stream
                if (!forceEvaluation && pos >= lineLength) {
                    // nothing to do
                    break;
                }
                forceEvaluation = false;
                // get the rules for this state
                let rules = this._lexer.tokenizer[state];
                if (!rules) {
                    rules = monarchCommon.findRules(this._lexer, state); // do parent matching
                    if (!rules) {
                        throw monarchCommon.createError(this._lexer, 'tokenizer state is not defined: ' + state);
                    }
                }
                // try each rule until we match
                const restOfLine = line.substr(pos);
                for (const rule of rules) {
                    if (pos === 0 || !rule.matchOnlyAtLineStart) {
                        matches = restOfLine.match(rule.resolveRegex(state));
                        if (matches) {
                            matched = matches[0];
                            action = rule.action;
                            break;
                        }
                    }
                }
            }
            // We matched 'rule' with 'matches' and 'action'
            if (!matches) {
                matches = [''];
                matched = '';
            }
            if (!action) {
                // bad: we didn't match anything, and there is no action to take
                // we need to advance the stream or we get progress trouble
                if (pos < lineLength) {
                    matches = [line.charAt(pos)];
                    matched = matches[0];
                }
                action = this._lexer.defaultToken;
            }
            if (matched === null) {
                // should never happen, needed for strict null checking
                break;
            }
            // advance stream
            pos += matched.length;
            // maybe call action function (used for 'cases')
            while (monarchCommon.isFuzzyAction(action) &&
                monarchCommon.isIAction(action) &&
                action.test) {
                action = action.test(matched, matches, state, pos === lineLength);
            }
            let result = null;
            // set the result: either a string or an array of actions
            if (typeof action === 'string' || Array.isArray(action)) {
                result = action;
            }
            else if (action.group) {
                result = action.group;
            }
            else if (action.token !== null && action.token !== undefined) {
                // do $n replacements?
                if (action.tokenSubst) {
                    result = monarchCommon.substituteMatches(this._lexer, action.token, matched, matches, state);
                }
                else {
                    result = action.token;
                }
                // enter embedded language?
                if (action.nextEmbedded) {
                    if (action.nextEmbedded === '@pop') {
                        if (!embeddedLanguageData) {
                            throw monarchCommon.createError(this._lexer, 'cannot pop embedded language if not inside one');
                        }
                        embeddedLanguageData = null;
                    }
                    else if (embeddedLanguageData) {
                        throw monarchCommon.createError(this._lexer, 'cannot enter embedded language from within an embedded language');
                    }
                    else {
                        enteringEmbeddedLanguage = monarchCommon.substituteMatches(this._lexer, action.nextEmbedded, matched, matches, state);
                    }
                }
                // state transformations
                if (action.goBack) {
                    // back up the stream..
                    pos = Math.max(0, pos - action.goBack);
                }
                if (action.switchTo && typeof action.switchTo === 'string') {
                    let nextState = monarchCommon.substituteMatches(this._lexer, action.switchTo, matched, matches, state); // switch state without a push...
                    if (nextState[0] === '@') {
                        nextState = nextState.substr(1); // peel off starting '@'
                    }
                    if (!monarchCommon.findRules(this._lexer, nextState)) {
                        throw monarchCommon.createError(this._lexer, "trying to switch to a state '" +
                            nextState +
                            "' that is undefined in rule: " +
                            this._safeRuleName(rule));
                    }
                    else {
                        stack = stack.switchTo(nextState);
                    }
                }
                else if (action.transform && typeof action.transform === 'function') {
                    throw monarchCommon.createError(this._lexer, 'action.transform not supported');
                }
                else if (action.next) {
                    if (action.next === '@push') {
                        if (stack.depth >= this._lexer.maxStack) {
                            throw monarchCommon.createError(this._lexer, 'maximum tokenizer stack size reached: [' +
                                stack.state +
                                ',' +
                                stack.parent.state +
                                ',...]');
                        }
                        else {
                            stack = stack.push(state);
                        }
                    }
                    else if (action.next === '@pop') {
                        if (stack.depth <= 1) {
                            throw monarchCommon.createError(this._lexer, 'trying to pop an empty stack in rule: ' + this._safeRuleName(rule));
                        }
                        else {
                            stack = stack.pop();
                        }
                    }
                    else if (action.next === '@popall') {
                        stack = stack.popall();
                    }
                    else {
                        let nextState = monarchCommon.substituteMatches(this._lexer, action.next, matched, matches, state);
                        if (nextState[0] === '@') {
                            nextState = nextState.substr(1); // peel off starting '@'
                        }
                        if (!monarchCommon.findRules(this._lexer, nextState)) {
                            throw monarchCommon.createError(this._lexer, "trying to set a next state '" +
                                nextState +
                                "' that is undefined in rule: " +
                                this._safeRuleName(rule));
                        }
                        else {
                            stack = stack.push(nextState);
                        }
                    }
                }
                if (action.log && typeof action.log === 'string') {
                    monarchCommon.log(this._lexer, this._lexer.languageId +
                        ': ' +
                        monarchCommon.substituteMatches(this._lexer, action.log, matched, matches, state));
                }
            }
            // check result
            if (result === null) {
                throw monarchCommon.createError(this._lexer, 'lexer rule has no well-defined action in rule: ' + this._safeRuleName(rule));
            }
            const computeNewStateForEmbeddedLanguage = (enteringEmbeddedLanguage) => {
                // support language names, mime types, and language ids
                const languageId = this._languageService.getLanguageIdByLanguageName(enteringEmbeddedLanguage) ||
                    this._languageService.getLanguageIdByMimeType(enteringEmbeddedLanguage) ||
                    enteringEmbeddedLanguage;
                const embeddedLanguageData = this._getNestedEmbeddedLanguageData(languageId);
                if (pos < lineLength) {
                    // there is content from the embedded language on this line
                    const restOfLine = lineWithoutLF.substr(pos);
                    return this._nestedTokenize(restOfLine, hasEOL, MonarchLineStateFactory.create(stack, embeddedLanguageData), offsetDelta + pos, tokensCollector);
                }
                else {
                    return MonarchLineStateFactory.create(stack, embeddedLanguageData);
                }
            };
            // is the result a group match?
            if (Array.isArray(result)) {
                if (groupMatching && groupMatching.groups.length > 0) {
                    throw monarchCommon.createError(this._lexer, 'groups cannot be nested: ' + this._safeRuleName(rule));
                }
                if (matches.length !== result.length + 1) {
                    throw monarchCommon.createError(this._lexer, 'matched number of groups does not match the number of actions in rule: ' +
                        this._safeRuleName(rule));
                }
                let totalLen = 0;
                for (let i = 1; i < matches.length; i++) {
                    totalLen += matches[i].length;
                }
                if (totalLen !== matched.length) {
                    throw monarchCommon.createError(this._lexer, 'with groups, all characters should be matched in consecutive groups in rule: ' +
                        this._safeRuleName(rule));
                }
                groupMatching = {
                    rule: rule,
                    matches: matches,
                    groups: [],
                };
                for (let i = 0; i < result.length; i++) {
                    groupMatching.groups[i] = {
                        action: result[i],
                        matched: matches[i + 1],
                    };
                }
                pos -= matched.length;
                // call recursively to initiate first result match
                continue;
            }
            else {
                // regular result
                // check for '@rematch'
                if (result === '@rematch') {
                    pos -= matched.length;
                    matched = ''; // better set the next state too..
                    matches = null;
                    result = '';
                    // Even though `@rematch` was specified, if `nextEmbedded` also specified,
                    // a state transition should occur.
                    if (enteringEmbeddedLanguage !== null) {
                        return computeNewStateForEmbeddedLanguage(enteringEmbeddedLanguage);
                    }
                }
                // check progress
                if (matched.length === 0) {
                    if (lineLength === 0 ||
                        stackLen0 !== stack.depth ||
                        state !== stack.state ||
                        (!groupMatching ? 0 : groupMatching.groups.length) !== groupLen0) {
                        continue;
                    }
                    else {
                        throw monarchCommon.createError(this._lexer, 'no progress in tokenizer in rule: ' + this._safeRuleName(rule));
                    }
                }
                // return the result (and check for brace matching)
                // todo: for efficiency we could pre-sanitize tokenPostfix and substitutions
                let tokenType = null;
                if (monarchCommon.isString(result) && result.indexOf('@brackets') === 0) {
                    const rest = result.substr('@brackets'.length);
                    const bracket = findBracket(this._lexer, matched);
                    if (!bracket) {
                        throw monarchCommon.createError(this._lexer, '@brackets token returned but no bracket defined as: ' + matched);
                    }
                    tokenType = monarchCommon.sanitize(bracket.token + rest);
                }
                else {
                    const token = result === '' ? '' : result + this._lexer.tokenPostfix;
                    tokenType = monarchCommon.sanitize(token);
                }
                if (pos0 < lineWithoutLFLength) {
                    tokensCollector.emit(pos0 + offsetDelta, tokenType);
                }
            }
            if (enteringEmbeddedLanguage !== null) {
                return computeNewStateForEmbeddedLanguage(enteringEmbeddedLanguage);
            }
        }
        return MonarchLineStateFactory.create(stack, embeddedLanguageData);
    }
    _getNestedEmbeddedLanguageData(languageId) {
        if (!this._languageService.isRegisteredLanguageId(languageId)) {
            return new EmbeddedLanguageData(languageId, NullState);
        }
        if (languageId !== this._languageId) {
            // Fire language loading event
            this._languageService.requestBasicLanguageFeatures(languageId);
            languages.TokenizationRegistry.getOrCreate(languageId);
            this._embeddedLanguages[languageId] = true;
        }
        const tokenizationSupport = languages.TokenizationRegistry.get(languageId);
        if (tokenizationSupport) {
            return new EmbeddedLanguageData(languageId, tokenizationSupport.getInitialState());
        }
        return new EmbeddedLanguageData(languageId, NullState);
    }
};
MonarchTokenizer = MonarchTokenizer_1 = __decorate([
    __param(4, IConfigurationService)
], MonarchTokenizer);
export { MonarchTokenizer };
/**
 * Searches for a bracket in the 'brackets' attribute that matches the input.
 */
function findBracket(lexer, matched) {
    if (!matched) {
        return null;
    }
    matched = monarchCommon.fixCase(lexer, matched);
    const brackets = lexer.brackets;
    for (const bracket of brackets) {
        if (bracket.open === matched) {
            return { token: bracket.token, bracketType: 1 /* monarchCommon.MonarchBracket.Open */ };
        }
        else if (bracket.close === matched) {
            return { token: bracket.token, bracketType: -1 /* monarchCommon.MonarchBracket.Close */ };
        }
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaExleGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvY29tbW9uL21vbmFyY2gvbW9uYXJjaExleGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRzs7O0dBR0c7QUFFSCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxLQUFLLFNBQVMsTUFBTSw4QkFBOEIsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sU0FBUyxFQUNULG1CQUFtQixFQUNuQixZQUFZLEdBQ1osTUFBTSwyQ0FBMkMsQ0FBQTtBQUdsRCxPQUFPLEtBQUssYUFBYSxNQUFNLG9CQUFvQixDQUFBO0FBRW5ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBR2xHLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFBO0FBRTNCOztHQUVHO0FBQ0gsTUFBTSwwQkFBMEI7YUFDUCxjQUFTLEdBQUcsSUFBSSwwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQzlFLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBa0MsRUFBRSxLQUFhO1FBQ3JFLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFLRCxZQUFZLGFBQXFCO1FBQ2hDLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFBO1FBQ25DLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRU0sTUFBTSxDQUFDLE1BQWtDLEVBQUUsS0FBYTtRQUM5RCxJQUFJLE1BQU0sS0FBSyxJQUFJLElBQUksTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMs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
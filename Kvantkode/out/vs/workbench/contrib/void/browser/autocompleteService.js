/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { extractCodeFromRegular } from '../common/helpers/extractCodeFromResult.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { isWindows } from '../../../../base/common/platform.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
// import { IContextGatheringService } from './contextGatheringService.js';
const allLinebreakSymbols = ['\r\n', '\n'];
const _ln = isWindows ? allLinebreakSymbols[0] : allLinebreakSymbols[1];
// The extension this was called from is here - https://github.com/voideditor/void/blob/autocomplete/extensions/void/src/extension/extension.ts
/*
A summary of autotab:

Postprocessing
-one common problem for all models is outputting unbalanced parentheses
we solve this by trimming all extra closing parentheses from the generated string
in future, should make sure parentheses are always balanced

-another problem is completing the middle of a string, eg. "const [x, CURSOR] = useState()"
we complete up to first matchup character
but should instead complete the whole line / block (difficult because of parenthesis accuracy)

-too much info is bad. usually we want to show the user 1 line, and have a preloaded response afterwards
this should happen automatically with caching system
should break preloaded responses into \n\n chunks

Preprocessing
- we don't generate if cursor is at end / beginning of a line (no spaces)
- we generate 1 line if there is text to the right of cursor
- we generate 1 line if variable declaration
- (in many cases want to show 1 line but generate multiple)

State
- cache based on prefix (and do some trimming first)
- when press tab on one line, should have an immediate followup response
to do this, show autocompletes before they're fully finished
- [todo] remove each autotab when accepted
!- [todo] provide type information

Details
-generated results are trimmed up to 1 leading/trailing space
-prefixes are cached up to 1 trailing newline
-
*/
class LRUCache {
    constructor(maxSize, disposeCallback) {
        if (maxSize <= 0)
            throw new Error('Cache size must be greater than 0');
        this.items = new Map();
        this.keyOrder = [];
        this.maxSize = maxSize;
        this.disposeCallback = disposeCallback;
    }
    set(key, value) {
        // If key exists, remove it from the order list
        if (this.items.has(key)) {
            this.keyOrder = this.keyOrder.filter((k) => k !== key);
        }
        // If cache is full, remove least recently used item
        else if (this.items.size >= this.maxSize) {
            const key = this.keyOrder[0];
            const value = this.items.get(key);
            // Call dispose callback if it exists
            if (this.disposeCallback && value !== undefined) {
                this.disposeCallback(value, key);
            }
            this.items.delete(key);
            this.keyOrder.shift();
        }
        // Add new item
        this.items.set(key, value);
        this.keyOrder.push(key);
    }
    delete(key) {
        const value = this.items.get(key);
        if (value !== undefined) {
            // Call dispose callback if it exists
            if (this.disposeCallback) {
                this.disposeCallback(value, key);
            }
            this.items.delete(key);
            this.keyOrder = this.keyOrder.filter((k) => k !== key);
            return true;
        }
        return false;
    }
    clear() {
        // Call dispose callback for all items if it exists
        if (this.disposeCallback) {
            for (const [key, value] of this.items.entries()) {
                this.disposeCallback(value, key);
            }
        }
        this.items.clear();
        this.keyOrder = [];
    }
    get size() {
        return this.items.size;
    }
    has(key) {
        return this.items.has(key);
    }
}
const DEBOUNCE_TIME = 500;
const TIMEOUT_TIME = 60000;
const MAX_CACHE_SIZE = 20;
const MAX_PENDING_REQUESTS = 2;
// postprocesses the result
const processStartAndEndSpaces = (result) => {
    // trim all whitespace except for a single leading/trailing space
    // return result.trim()
    ;
    [result] = extractCodeFromRegular({ text: result, recentlyAddedTextLen: result.length });
    const hasLeadingSpace = result.startsWith(' ');
    const hasTrailingSpace = result.endsWith(' ');
    return (hasLeadingSpace ? ' ' : '') + result.trim() + (hasTrailingSpace ? ' ' : '');
};
// trims the end of the prefix to improve cache hit rate
const removeLeftTabsAndTrimEnds = (s) => {
    const trimmedString = s.trimEnd();
    const trailingEnd = s.slice(trimmedString.length);
    // keep only a single trailing newline
    if (trailingEnd.includes(_ln)) {
        s = trimmedString + _ln;
    }
    s = s.replace(/^\s+/gm, ''); // remove left tabs
    return s;
};
const removeAllWhitespace = (str) => str.replace(/\s+/g, '');
function getIsSubsequence({ of, subsequence, }) {
    if (subsequence.length === 0)
        return [true, ''];
    if (of.length === 0)
        return [false, ''];
    let subsequenceIndex = 0;
    let lastMatchChar = '';
    for (let i = 0; i < of.length; i++) {
        if (of[i] === subsequence[subsequenceIndex]) {
            lastMatchChar = of[i];
            subsequenceIndex++;
        }
        if (subsequenceIndex === subsequence.length) {
            return [true, lastMatchChar];
        }
    }
    return [false, lastMatchChar];
}
function getStringUpToUnbalancedClosingParenthesis(s, prefix) {
    const pairs = { ')': '(', '}': '{', ']': '[' };
    // process all bracets in prefix
    let stack = [];
    const firstOpenIdx = prefix.search(/[[({]/);
    if (firstOpenIdx !== -1) {
        const brackets = prefix
            .slice(firstOpenIdx)
            .split('')
            .filter((c) => '()[]{}'.includes(c));
        for (const bracket of brackets) {
            if (bracket === '(' || bracket === '{' || bracket === '[') {
                stack.push(bracket);
            }
            else {
                if (stack.length > 0 && stack[stack.length - 1] === pairs[bracket]) {
                    stack.pop();
                }
                else {
                    stack.push(bracket);
                }
            }
        }
    }
    // iterate through each character
    for (let i = 0; i < s.length; i++) {
        const char = s[i];
        if (char === '(' || char === '{' || char === '[') {
            stack.push(char);
        }
        else if (char === ')' || char === '}' || char === ']') {
            if (stack.length === 0 || stack.pop() !== pairs[char]) {
                return s.substring(0, i);
            }
        }
    }
    return s;
}
// further trim the autocompletion
const postprocessAutocompletion = ({ autocompletionMatchup, autocompletion, prefixAndSuffix, }) => {
    const { prefix, prefixToTheLeftOfCursor, suffixToTheRightOfCursor } = prefixAndSuffix;
    const generatedMiddle = autocompletion.insertText;
    let startIdx = autocompletionMatchup.startIdx;
    let endIdx = generatedMiddle.length; // exclusive bounds
    // const naiveReturnValue = generatedMiddle.slice(startIdx)
    // console.log('naiveReturnValue: ', JSON.stringify(naiveReturnValue))
    // return [{ insertText: naiveReturnValue, }]
    // do postprocessing for better ux
    // this is a bit hacky but may change a lot
    // if there is space at the start of the completion and user has added it, remove it
    const charToLeftOfCursor = prefixToTheLeftOfCursor.slice(-1)[0] || '';
    const userHasAddedASpace = charToLeftOfCursor === ' ' || charToLeftOfCursor === '\t';
    const rawFirstNonspaceIdx = generatedMiddle.slice(startIdx).search(/[^\t ]/);
    if (rawFirstNonspaceIdx > -1 && userHasAddedASpace) {
        const firstNonspaceIdx = rawFirstNonspaceIdx + startIdx;
        // console.log('p0', startIdx, rawFirstNonspaceIdx)
        startIdx = Math.max(startIdx, firstNonspaceIdx);
    }
    // if user is on a blank line and the generation starts with newline(s), remove them
    const numStartingNewlines = generatedMiddle.slice(startIdx).match(new RegExp(`^${_ln}+`))?.[0].length || 0;
    if (!prefixToTheLeftOfCursor.trim() &&
        !suffixToTheRightOfCursor.trim() &&
        numStartingNewlines > 0) {
        // console.log('p1', numStartingNewlines)
        startIdx += numStartingNewlines;
    }
    // if the generated FIM text matches with the suffix on the current line, stop
    if (autocompletion.type === 'single-line-fill-middle' && suffixToTheRightOfCursor.trim()) {
        // completing in the middle of a line
        // complete until there is a match
        const rawMatchIndex = generatedMiddle
            .slice(startIdx)
            .lastIndexOf(suffixToTheRightOfCursor.trim()[0]);
        if (rawMatchIndex > -1) {
            // console.log('p2', rawMatchIndex, startIdx, suffixToTheRightOfCursor.trim()[0], 'AAA', generatedMiddle.slice(startIdx))
            const matchIdx = rawMatchIndex + startIdx;
            const matchChar = generatedMiddle[matchIdx];
            if (`{}()[]<>\`'"`.includes(matchChar)) {
                endIdx = Math.min(endIdx, matchIdx);
            }
        }
    }
    const restOfLineToGenerate = generatedMiddle.slice(startIdx).split(_ln)[0] ?? '';
    // condition to complete as a single line completion
    if (prefixToTheLeftOfCursor.trim() &&
        !suffixToTheRightOfCursor.trim() &&
        restOfLineToGenerate.trim()) {
        const rawNewlineIdx = generatedMiddle.slice(startIdx).indexOf(_ln);
        if (rawNewlineIdx > -1) {
            // console.log('p3', startIdx, rawNewlineIdx)
            const newlineIdx = rawNewlineIdx + startIdx;
            endIdx = Math.min(endIdx, newlineIdx);
        }
    }
    // // if a generated line matches with a suffix line, stop
    // if (suffixLines.length > 1) {
    // 	console.log('4')
    // 	const lines = []
    // 	for (const generatedLine of generatedLines) {
    // 		if (suffixLines.slice(0, 10).some(suffixLine =>
    // 			generatedLine.trim() !== '' && suffixLine.trim() !== ''
    // 			&& generatedLine.trim().startsWith(suffixLine.trim())
    // 		)) break;
    // 		lines.push(generatedLine)
    // 	}
    // 	endIdx = lines.join('\n').length // this is hacky, remove or refactor in future
    // }
    // console.log('pFinal', startIdx, endIdx)
    let completionStr = generatedMiddle.slice(startIdx, endIdx);
    // filter out unbalanced parentheses
    completionStr = getStringUpToUnbalancedClosingParenthesis(completionStr, prefix);
    // console.log('originalCompletionStr: ', JSON.stringify(generatedMiddle.slice(startIdx)))
    // console.log('finalCompletionStr: ', JSON.stringify(completionStr))
    return completionStr;
};
// returns the text in the autocompletion to display, assuming the prefix is already matched
const toInlineCompletions = ({ autocompletionMatchup, autocompletion, prefixAndSuffix, position, debug, }) => {
    let trimmedInsertText = postprocessAutocompletion({
        autocompletionMatchup,
        autocompletion,
        prefixAndSuffix,
    });
    let rangeToReplace = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
    // handle special cases
    // if we redid the suffix, replace the suffix
    if (autocompletion.type === 'single-line-redo-suffix') {
        const oldSuffix = prefixAndSuffix.suffixToTheRightOfCursor;
        const newSuffix = autocompletion.insertText;
        const [isSubsequence, lastMatchingChar] = getIsSubsequence({
            // check that the old text contains the same brackets + symbols as the new text
            subsequence: removeAllWhitespace(oldSuffix), // old suffix
            of: removeAllWhitespace(newSuffix), // new suffix
        });
        if (isSubsequence) {
            rangeToReplace = new Range(position.lineNumber, position.column, position.lineNumber, Number.MAX_SAFE_INTEGER);
        }
        else {
            const lastMatchupIdx = trimmedInsertText.lastIndexOf(lastMatchingChar);
            trimmedInsertText = trimmedInsertText.slice(0, lastMatchupIdx + 1);
            const numCharsToReplace = oldSuffix.lastIndexOf(lastMatchingChar) + 1;
            rangeToReplace = new Range(position.lineNumber, position.column, position.lineNumber, position.column + numCharsToReplace);
            // console.log('show____', trimmedInsertText, rangeToReplace)
        }
    }
    return [
        {
            insertText: trimmedInsertText,
            range: rangeToReplace,
        },
    ];
};
const getPrefixAndSuffixInfo = (model, position) => {
    const fullText = model.getValue(1 /* EndOfLinePreference.LF */);
    const cursorOffset = model.getOffsetAt(position);
    const prefix = fullText.substring(0, cursorOffset);
    const suffix = fullText.substring(cursorOffset);
    const prefixLines = prefix.split(_ln);
    const suffixLines = suffix.split(_ln);
    const prefixToTheLeftOfCursor = prefixLines.slice(-1)[0] ?? '';
    const suffixToTheRightOfCursor = suffixLines[0] ?? '';
    return {
        prefix,
        suffix,
        prefixLines,
        suffixLines,
        prefixToTheLeftOfCursor,
        suffixToTheRightOfCursor,
    };
};
const getIndex = (str, line, char) => {
    return str.split(_ln).slice(0, line).join(_ln).length + (line > 0 ? 1 : 0) + char;
};
const getLastLine = (s) => {
    const matches = s.match(new RegExp(`[^${_ln}]*$`));
    return matches ? matches[0] : '';
};
// returns the startIdx of the match if there is a match, or undefined if there is no match
// all results are wrt `autocompletion.result`
const getAutocompletionMatchup = ({ prefix, autocompletion, }) => {
    const trimmedCurrentPrefix = removeLeftTabsAndTrimEnds(prefix);
    const trimmedCompletionPrefix = removeLeftTabsAndTrimEnds(autocompletion.prefix);
    const trimmedCompletionMiddle = removeLeftTabsAndTrimEnds(autocompletion.insertText);
    // console.log('@result: ', JSON.stringify(autocompletion.insertText))
    // console.log('@trimmedCurrentPrefix: ', JSON.stringify(trimmedCurrentPrefix))
    // console.log('@trimmedCompletionPrefix: ', JSON.stringify(trimmedCompletionPrefix))
    // console.log('@trimmedCompletionMiddle: ', JSON.stringify(trimmedCompletionMiddle))
    if (trimmedCurrentPrefix.length < trimmedCompletionPrefix.length) {
        // user must write text beyond the original prefix at generation time
        // console.log('@undefined1')
        return undefined;
    }
    if (
    // check that completion starts with the prefix
    !(trimmedCompletionPrefix + trimmedCompletionMiddle).startsWith(trimmedCurrentPrefix)) {
        // console.log('@undefined2')
        return undefined;
    }
    // reverse map to find position wrt `autocompletion.result`
    const lineStart = trimmedCurrentPrefix.split(_ln).length - trimmedCompletionPrefix.split(_ln).length;
    if (lineStart < 0) {
        // console.log('@undefined3')
        console.error('Error: No line found.');
        return undefined;
    }
    const currentPrefixLine = getLastLine(trimmedCurrentPrefix);
    const completionPrefixLine = lineStart === 0 ? getLastLine(trimmedCompletionPrefix) : '';
    const completionMiddleLine = autocompletion.insertText.split(_ln)[lineStart];
    const fullCompletionLine = completionPrefixLine + completionMiddleLine;
    // console.log('currentPrefixLine', currentPrefixLine)
    // console.log('completionPrefixLine', completionPrefixLine)
    // console.log('completionMiddleLine', completionMiddleLine)
    const charMatchIdx = fullCompletionLine.indexOf(currentPrefixLine);
    if (charMatchIdx < 0) {
        // console.log('@undefined4', charMatchIdx)
        console.error('Warning: Found character with negative index. This should never happen.');
        return undefined;
    }
    const character = charMatchIdx + currentPrefixLine.length - completionPrefixLine.length;
    const startIdx = getIndex(autocompletion.insertText, lineStart, character);
    return {
        startLine: lineStart,
        startCharacter: character,
        startIdx,
    };
};
const getCompletionOptions = (prefixAndSuffix, relevantContext, justAcceptedAutocompletion) => {
    let { prefix, suffix, prefixToTheLeftOfCursor, suffixToTheRightOfCursor, suffixLines, prefixLines, } = prefixAndSuffix;
    // trim prefix and suffix to not be very large
    suffixLines = suffix.split(_ln).slice(0, 25);
    prefixLines = prefix.split(_ln).slice(-25);
    prefix = prefixLines.join(_ln);
    suffix = suffixLines.join(_ln);
    let completionOptions;
    // if line is empty, do multiline completion
    const isLineEmpty = !prefixToTheLeftOfCursor.trim() && !suffixToTheRightOfCursor.trim();
    const isLinePrefixEmpty = removeAllWhitespace(prefixToTheLeftOfCursor).length === 0;
    const isLineSuffixEmpty = removeAllWhitespace(suffixToTheRightOfCursor).length === 0;
    // TODO add context to prefix
    // llmPrefix = '\n\n/* Relevant context:\n' + relevantContext + '\n*/\n' + llmPrefix
    // if we just accepted an autocompletion, predict a multiline completion starting on the next line
    if (justAcceptedAutocompletion && isLineSuffixEmpty) {
        const prefixWithNewline = prefix + _ln;
        completionOptions = {
            predictionType: 'multi-line-start-on-next-line',
            shouldGenerate: true,
            llmPrefix: prefixWithNewline,
            llmSuffix: suffix,
            stopTokens: [`${_ln}${_ln}`], // double newlines
        };
    }
    // if the current line is empty, predict a single-line completion
    else if (isLineEmpty) {
        completionOptions = {
            predictionType: 'single-line-fill-middle',
            shouldGenerate: true,
            llmPrefix: prefix,
            llmSuffix: suffix,
            stopTokens: allLinebreakSymbols,
        };
    }
    // if suffix is 3 or fewer characters, attempt to complete the line ignorning it
    else if (removeAllWhitespace(suffixToTheRightOfCursor).length <= 3) {
        const suffixLinesIgnoringThisLine = suffixLines.slice(1);
        const suffixStringIgnoringThisLine = suffixLinesIgnoringThisLine.length === 0 ? '' : _ln + suffixLinesIgnoringThisLine.join(_ln);
        completionOptions = {
            predictionType: 'single-line-redo-suffix',
            shouldGenerate: true,
            llmPrefix: prefix,
            llmSuffix: suffixStringIgnoringThisLine,
            stopTokens: allLinebreakSymbols,
        };
    }
    // else attempt to complete the middle of the line if there is a prefix (the completion looks bad if there is no prefix)
    else if (!isLinePrefixEmpty) {
        completionOptions = {
            predictionType: 'single-line-fill-middle',
            shouldGenerate: true,
            llmPrefix: prefix,
            llmSuffix: suffix,
            stopTokens: allLinebreakSymbols,
        };
    }
    else {
        completionOptions = {
            predictionType: 'do-not-predict',
            shouldGenerate: false,
            llmPrefix: prefix,
            llmSuffix: suffix,
            stopTokens: [],
        };
    }
    return completionOptions;
};
export const IAutocompleteService = createDecorator('AutocompleteService');
let AutocompleteService = class AutocompleteService extends Disposable {
    static { this.ID = 'void.autocompleteService'; }
    // private _lastPrefix: string = ''
    // used internally by vscode
    // fires after every keystroke and returns the completion to show
    async _provideInlineCompletionItems(model, position) {
        const isEnabled = this._settingsService.state.globalSettings.enableAutocomplete;
        if (!isEnabled)
            return [];
        const testMode = false;
        const docUriStr = model.uri.fsPath;
        const prefixAndSuffix = getPrefixAndSuffixInfo(model, position);
        const { prefix, suffix } = prefixAndSuffix;
        // initialize cache if it doesnt exist
        // note that whenever an autocompletion is accepted, it is removed from cache
        if (!this._autocompletionsOfDocument[docUriStr]) {
            this._autocompletionsOfDocument[docUriStr] = new LRUCache(MAX_CACHE_SIZE, (autocompletion) => {
                if (autocompletion.requestId)
                    this._llmMessageService.abort(autocompletion.requestId);
            });
        }
        // this._lastPrefix = prefix
        // print all pending autocompletions
        // let _numPending = 0
        // this._autocompletionsOfDocument[docUriStr].items.forEach((a: Autocompletion) => { if (a.status === 'pending') _numPending += 1 })
        // console.log('@numPending: ' + _numPending)
        // get autocompletion from cache
        let cachedAutocompletion = undefined;
        let autocompletionMatchup = undefined;
        for (const autocompletion of this._autocompletionsOfDocument[docUriStr].items.values()) {
            // if the user's change matches with the autocompletion
            autocompletionMatchup = getAutocompletionMatchup({ prefix, autocompletion });
            if (autocompletionMatchup !== undefined) {
                cachedAutocompletion = autocompletion;
                break;
            }
        }
        // if there is a cached autocompletion, return it
        if (cachedAutocompletion && autocompletionMatchup) {
            console.log('AA');
            // console.log('id: ' + cachedAutocompletion.id)
            if (cachedAutocompletion.status === 'finished') {
                console.log('A1');
                const inlineCompletions = toInlineCompletions({
                    autocompletionMatchup,
                    autocompletion: cachedAutocompletion,
                    prefixAndSuffix,
                    position,
                    debug: true,
                });
                return inlineCompletions;
            }
            else if (cachedAutocompletion.status === 'pending') {
                console.log('A2');
                try {
                    await cachedAutocompletion.llmPromise;
                    const inlineCompletions = toInlineCompletions({
                        autocompletionMatchup,
                        autocompletion: cachedAutocompletion,
                        prefixAndSuffix,
                        position,
                    });
                    return inlineCompletions;
                }
                catch (e) {
                    this._autocompletionsOfDocument[docUriStr].delete(cachedAutocompletion.id);
                    console.error('Error creating autocompletion (1): ' + e);
                }
            }
            else if (cachedAutocompletion.status === 'error') {
                console.log('A3');
            }
            else {
                console.log('A4');
            }
            return [];
        }
        // else if no more typing happens, then go forwards with the request
        // wait DEBOUNCE_TIME for the user to stop typing
        const thisTime = Date.now();
        const justAcceptedAutocompletion = thisTime - this._lastCompletionAccept < 500;
        this._lastCompletionStart = thisTime;
        const didTypingHappenDuringDebounce = await new Promise((resolve, reject) => setTimeout(() => {
            if (this._lastCompletionStart === thisTime) {
                resolve(false);
            }
            else {
                resolve(true);
            }
        }, DEBOUNCE_TIME));
        // if more typing happened, then do not go forwards with the request
        if (didTypingHappenDuringDebounce) {
            return [];
        }
        // if there are too many pending requests, cancel the oldest one
        let numPending = 0;
        let oldestPending = undefined;
        for (const autocompletion of this._autocompletionsOfDocument[docUriStr].items.values()) {
            if (autocompletion.status === 'pending') {
                numPending += 1;
                if (oldestPending === undefined) {
                    oldestPending = autocompletion;
                }
                if (numPending >= MAX_PENDING_REQUESTS) {
                    // cancel the oldest pending request and remove it from cache
                    this._autocompletionsOfDocument[docUriStr].delete(oldestPending.id);
                    break;
                }
            }
        }
        // gather relevant context from the code around the user's selection and definitions
        // const relevantSnippetsList = await this._contextGatheringService.readCachedSnippets(model, position, 3);
        // const relevantSnippetsList = this._contextGatheringService.getCachedSnippets();
        // const relevantSnippets = relevantSnippetsList.map((text) => `${text}`).join('\n-------------------------------\n')
        // console.log('@@---------------------\n' + relevantSnippets)
        const relevantContext = '';
        const { shouldGenerate, predictionType, llmPrefix, llmSuffix, stopTokens } = getCompletionOptions(prefixAndSuffix, relevantContext, justAcceptedAutocompletion);
        if (!shouldGenerate)
            return [];
        if (testMode && this._autocompletionId !== 0) {
            // TODO remove this
            return [];
        }
        // create a new autocompletion and add it to cache
        const newAutocompletion = {
            id: this._autocompletionId++,
            prefix: prefix, // the actual prefix and suffix
            suffix: suffix,
            llmPrefix: llmPrefix, // the prefix and suffix the llm sees
            llmSuffix: llmSuffix,
            startTime: Date.now(),
            endTime: undefined,
            type: predictionType,
            status: 'pending',
            llmPromise: undefined,
            insertText: '',
            requestId: null,
            _newlineCount: 0,
        };
        console.log('starting autocomplete...', predictionType);
        const featureName = 'Autocomplete';
        const overridesOfModel = this._settingsService.state.overridesOfModel;
        const modelSelection = this._settingsService.state.modelSelectionOfFeature[featureName];
        const modelSelectionOptions = modelSelection
            ? this._settingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName]
            : undefined;
        // set parameters of `newAutocompletion` appropriately
        newAutocompletion.llmPromise = new Promise((resolve, reject) => {
            const requestId = this._llmMessageService.sendLLMMessage({
                messagesType: 'FIMMessage',
                messages: this._convertToLLMMessageService.prepareFIMMessage({
                    messages: {
                        prefix: llmPrefix,
                        suffix: llmSuffix,
                        stopTokens: stopTokens,
                    },
                }),
                modelSelection,
                modelSelectionOptions,
                overridesOfModel,
                logging: { loggingName: 'Autocomplete' },
                onText: () => { }, // unused in FIMMessage
                // onText: async ({ fullText, newText }) => {
                // 	newAutocompletion.insertText = fullText
                // 	// count newlines in newText
                // 	const numNewlines = newText.match(/\n|\r\n/g)?.length || 0
                // 	newAutocompletion._newlineCount += numNewlines
                // 	// if too many newlines, resolve up to last newline
                // 	if (newAutocompletion._newlineCount > 10) {
                // 		const lastNewlinePos = fullText.lastIndexOf('\n')
                // 		newAutocompletion.insertText = fullText.substring(0, lastNewlinePos)
                // 		resolve(newAutocompletion.insertText)
                // 		return
                // 	}
                // 	// if (!getAutocompletionMatchup({ prefix: this._lastPrefix, autocompletion: newAutocompletion })) {
                // 	// 	reject('LLM response did not match user\'s text.')
                // 	// }
                // },
                onFinalMessage: ({ fullText }) => {
                    // console.log('____res: ', JSON.stringify(newAutocompletion.insertText))
                    newAutocompletion.endTime = Date.now();
                    newAutocompletion.status = 'finished';
                    const [text, _] = extractCodeFromRegular({ text: fullText, recentlyAddedTextLen: 0 });
                    newAutocompletion.insertText = processStartAndEndSpaces(text);
                    // handle special case for predicting starting on the next line, add a newline character
                    if (newAutocompletion.type === 'multi-line-start-on-next-line') {
                        newAutocompletion.insertText = _ln + newAutocompletion.insertText;
                    }
                    resolve(newAutocompletion.insertText);
                },
                onError: ({ message }) => {
                    newAutocompletion.endTime = Date.now();
                    newAutocompletion.status = 'error';
                    reject(message);
                },
                onAbort: () => {
                    reject('Aborted autocomplete');
                },
            });
            newAutocompletion.requestId = requestId;
            // if the request hasnt resolved in TIMEOUT_TIME seconds, reject it
            setTimeout(() => {
                if (newAutocompletion.status === 'pending') {
                    reject('Timeout receiving message to LLM.');
                }
            }, TIMEOUT_TIME);
        });
        // add autocompletion to cache
        this._autocompletionsOfDocument[docUriStr].set(newAutocompletion.id, newAutocompletion);
        // show autocompletion
        try {
            await newAutocompletion.llmPromise;
            // console.log('id: ' + newAutocompletion.id)
            const autocompletionMatchup = {
                startIdx: 0,
                startLine: 0,
                startCharacter: 0,
            };
            const inlineCompletions = toInlineCompletions({
                autocompletionMatchup,
                autocompletion: newAutocompletion,
                prefixAndSuffix,
                position,
            });
            return inlineCompletions;
        }
        catch (e) {
            this._autocompletionsOfDocument[docUriStr].delete(newAutocompletion.id);
            console.error('Error creating autocompletion (2): ' + e);
            return [];
        }
    }
    constructor(_langFeatureService, _llmMessageService, _editorService, _modelService, _settingsService, _convertToLLMMessageService) {
        super();
        this._langFeatureService = _langFeatureService;
        this._llmMessageService = _llmMessageService;
        this._editorService = _editorService;
        this._modelService = _modelService;
        this._settingsService = _settingsService;
        this._convertToLLMMessageService = _convertToLLMMessageService;
        this._autocompletionId = 0;
        this._autocompletionsOfDocument = {};
        this._lastCompletionStart = 0;
        this._lastCompletionAccept = 0;
        this._register(this._langFeatureService.inlineCompletionsProvider.register('*', {
            provideInlineCompletions: async (model, position, context, token) => {
                const items = await this._provideInlineCompletionItems(model, position);
                // console.log('item: ', items?.[0]?.insertText)
                return { items: items };
            },
            freeInlineCompletions: (completions) => {
                // get the `docUriStr` and the `position` of the cursor
                const activePane = this._editorService.activeEditorPane;
                if (!activePane)
                    return;
                const control = activePane.getControl();
                if (!control || !isCodeEditor(control))
                    return;
                const position = control.getPosition();
                if (!position)
                    return;
                const resource = EditorResourceAccessor.getCanonicalUri(this._editorService.activeEditor);
                if (!resource)
                    return;
                const model = this._modelService.getModel(resource);
                if (!model)
                    return;
                const docUriStr = resource.fsPath;
                if (!this._autocompletionsOfDocument[docUriStr])
                    return;
                const { prefix } = getPrefixAndSuffixInfo(model, position);
                // go through cached items and remove matching ones
                // autocompletion.prefix + autocompletion.insertedText ~== insertedText
                this._autocompletionsOfDocument[docUriStr].items.forEach((autocompletion) => {
                    // we can do this more efficiently, I just didn't want to deal with all of the edge cases
                    const matchup = removeAllWhitespace(prefix) ===
                        removeAllWhitespace(autocompletion.prefix + autocompletion.insertText);
                    if (matchup) {
                        console.log('ACCEPT', autocompletion.id);
                        this._lastCompletionAccept = Date.now();
                        this._autocompletionsOfDocument[docUriStr].delete(autocompletion.id);
                    }
                });
            },
        }));
    }
};
AutocompleteService = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, ILLMMessageService),
    __param(2, IEditorService),
    __param(3, IModelService),
    __param(4, IVoidSettingsService),
    __param(5, IConvertToLLMMessageService)
], AutocompleteService);
export { AutocompleteService };
registerWorkbenchContribution2(AutocompleteService.ID, AutocompleteService, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2NvbXBsZXRlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2F1dG9jb21wbGV0ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUk1RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbkYsT0FBTyxFQUFFLDhCQUE4QixFQUFrQixNQUFNLGtDQUFrQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM3RSwyRUFBMkU7QUFFM0UsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJ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
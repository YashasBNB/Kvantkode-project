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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2NvbXBsZXRlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9hdXRvY29tcGxldGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFJNUYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSw4QkFBOEIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFdkUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0UsMkVBQTJFO0FBRTNFLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFD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
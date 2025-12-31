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
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { compare, compareSubstring } from '../../../../base/common/strings.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { SnippetParser } from '../../../../editor/contrib/snippet/browser/snippetParser.js';
import { localize } from '../../../../nls.js';
import { ISnippetsService } from './snippets.js';
import { Snippet } from './snippetsFile.js';
import { isPatternInWord } from '../../../../base/common/filters.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
const markSnippetAsUsed = '_snippet.markAsUsed';
CommandsRegistry.registerCommand(markSnippetAsUsed, (accessor, ...args) => {
    const snippetsService = accessor.get(ISnippetsService);
    const [first] = args;
    if (first instanceof Snippet) {
        snippetsService.updateUsageTimestamp(first);
    }
});
export class SnippetCompletion {
    constructor(snippet, range) {
        this.snippet = snippet;
        this.label = { label: snippet.prefix, description: snippet.name };
        this.detail = localize('detail.snippet', '{0} ({1})', snippet.description || snippet.name, snippet.source);
        this.insertText = snippet.codeSnippet;
        this.extensionId = snippet.extensionId;
        this.range = range;
        this.sortText = `${snippet.snippetSource === 3 /* SnippetSource.Extension */ ? 'z' : 'a'}-${snippet.prefix}`;
        this.kind = 27 /* CompletionItemKind.Snippet */;
        this.insertTextRules = 4 /* CompletionItemInsertTextRule.InsertAsSnippet */;
        this.command = { id: markSnippetAsUsed, title: '', arguments: [snippet] };
    }
    resolve() {
        this.documentation = new MarkdownString().appendCodeblock('', SnippetParser.asInsertText(this.snippet.codeSnippet));
        return this;
    }
    static compareByLabel(a, b) {
        return compare(a.label.label, b.label.label);
    }
}
let SnippetCompletionProvider = class SnippetCompletionProvider {
    constructor(_languageService, _snippets, _languageConfigurationService) {
        this._languageService = _languageService;
        this._snippets = _snippets;
        this._languageConfigurationService = _languageConfigurationService;
        this._debugDisplayName = 'snippetCompletions';
        //
    }
    async provideCompletionItems(model, position, context) {
        const sw = new StopWatch();
        // compute all snippet anchors: word starts and every non word character
        const line = position.lineNumber;
        const word = model.getWordAtPosition(position) ?? {
            startColumn: position.column,
            endColumn: position.column,
            word: '',
        };
        const lineContentLow = model.getLineContent(position.lineNumber).toLowerCase();
        const lineContentWithWordLow = lineContentLow.substring(0, word.startColumn + word.word.length - 1);
        const anchors = this._computeSnippetPositions(model, line, word, lineContentWithWordLow);
        // loop over possible snippets and match them against the anchors
        const columnOffset = position.column - 1;
        const triggerCharacterLow = context.triggerCharacter?.toLowerCase() ?? '';
        const languageId = this._getLanguageIdAtPosition(model, position);
        const languageConfig = this._languageConfigurationService.getLanguageConfiguration(languageId);
        const snippets = new Set(await this._snippets.getSnippets(languageId));
        const suggestions = [];
        for (const snippet of snippets) {
            if (context.triggerKind === 1 /* CompletionTriggerKind.TriggerCharacter */ &&
                !snippet.prefixLow.startsWith(triggerCharacterLow)) {
                // strict -> when having trigger characters they must prefix-match
                continue;
            }
            let candidate;
            for (const anchor of anchors) {
                if (anchor.prefixLow.match(/^\s/) && !snippet.prefixLow.match(/^\s/)) {
                    // only allow whitespace anchor when snippet prefix starts with whitespace too
                    continue;
                }
                if (isPatternInWord(anchor.prefixLow, 0, anchor.prefixLow.length, snippet.prefixLow, 0, snippet.prefixLow.length)) {
                    candidate = anchor;
                    break;
                }
            }
            if (!candidate) {
                continue;
            }
            const pos = candidate.startColumn - 1;
            const prefixRestLen = snippet.prefixLow.length - (columnOffset - pos);
            const endsWithPrefixRest = compareSubstring(lineContentLow, snippet.prefixLow, columnOffset, columnOffset + prefixRestLen, columnOffset - pos);
            const startPosition = position.with(undefined, pos + 1);
            let endColumn = endsWithPrefixRest === 0 ? position.column + prefixRestLen : position.column;
            // First check if there is anything to the right of the cursor
            if (columnOffset < lineContentLow.length) {
                const autoClosingPairs = languageConfig.getAutoClosingPairs();
                const standardAutoClosingPairConditionals = autoClosingPairs.autoClosingPairsCloseSingleChar.get(lineContentLow[columnOffset]);
                // If the character to the right of the cursor is a closing character of an autoclosing pair
                if (standardAutoClosingPairConditionals?.some((p) => 
                // and the start position is the opening character of an autoclosing pair
                p.open === lineContentLow[startPosition.column - 1] &&
                    // and the snippet prefix contains the opening and closing pair at its edges
                    snippet.prefix.startsWith(p.open) &&
                    snippet.prefix[snippet.prefix.length - 1] === p.close)) {
                    // Eat the character that was likely inserted because of auto-closing pairs
                    endColumn++;
                }
            }
            const replace = Range.fromPositions({ lineNumber: line, column: candidate.startColumn }, { lineNumber: line, column: endColumn });
            const insert = replace.setEndPosition(line, position.column);
            suggestions.push(new SnippetCompletion(snippet, { replace, insert }));
            snippets.delete(snippet);
        }
        // add remaing snippets when the current prefix ends in whitespace or when line is empty
        // and when not having a trigger character
        if (!triggerCharacterLow &&
            (/\s/.test(lineContentLow[position.column - 2]) /*end in whitespace */ ||
                !lineContentLow) /*empty line*/) {
            for (const snippet of snippets) {
                const insert = Range.fromPositions(position);
                const replace = lineContentLow.indexOf(snippet.prefixLow, columnOffset) === columnOffset
                    ? insert.setEndPosition(position.lineNumber, position.column + snippet.prefixLow.length)
                    : insert;
                suggestions.push(new SnippetCompletion(snippet, { replace, insert }));
            }
        }
        // dismbiguate suggestions with same labels
        this._disambiguateSnippets(suggestions);
        return {
            suggestions,
            duration: sw.elapsed(),
        };
    }
    _disambiguateSnippets(suggestions) {
        suggestions.sort(SnippetCompletion.compareByLabel);
        for (let i = 0; i < suggestions.length; i++) {
            const item = suggestions[i];
            let to = i + 1;
            for (; to < suggestions.length && item.label === suggestions[to].label; to++) {
                suggestions[to].label.label = localize('snippetSuggest.longLabel', '{0}, {1}', suggestions[to].label.label, suggestions[to].snippet.name);
            }
            if (to > i + 1) {
                suggestions[i].label.label = localize('snippetSuggest.longLabel', '{0}, {1}', suggestions[i].label.label, suggestions[i].snippet.name);
                i = to;
            }
        }
    }
    resolveCompletionItem(item) {
        return item instanceof SnippetCompletion ? item.resolve() : item;
    }
    _computeSnippetPositions(model, line, word, lineContentWithWordLow) {
        const result = [];
        for (let column = 1; column < word.startColumn; column++) {
            const wordInfo = model.getWordAtPosition(new Position(line, column));
            result.push({
                startColumn: column,
                prefixLow: lineContentWithWordLow.substring(column - 1),
                isWord: Boolean(wordInfo),
            });
            if (wordInfo) {
                column = wordInfo.endColumn;
                // the character right after a word is an anchor, always
                result.push({
                    startColumn: wordInfo.endColumn,
                    prefixLow: lineContentWithWordLow.substring(wordInfo.endColumn - 1),
                    isWord: false,
                });
            }
        }
        if (word.word.length > 0 || result.length === 0) {
            result.push({
                startColumn: word.startColumn,
                prefixLow: lineContentWithWordLow.substring(word.startColumn - 1),
                isWord: true,
            });
        }
        return result;
    }
    _getLanguageIdAtPosition(model, position) {
        // validate the `languageId` to ensure this is a user
        // facing language with a name and the chance to have
        // snippets, else fall back to the outer language
        model.tokenization.tokenizeIfCheap(position.lineNumber);
        let languageId = model.getLanguageIdAtPosition(position.lineNumber, position.column);
        if (!this._languageService.getLanguageName(languageId)) {
            languageId = model.getLanguageId();
        }
        return languageId;
    }
};
SnippetCompletionProvider = __decorate([
    __param(0, ILanguageService),
    __param(1, ISnippetsService),
    __param(2, ILanguageConfigurationService)
], SnippetCompletionProvider);
export { SnippetCompletionProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvbXBsZXRpb25Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL2Jyb3dzZXIvc25pcHBldENvbXBsZXRpb25Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFhdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBaUIsTUFBTSxtQkFBbUIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBRXBILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBR25GLE1BQU0saUJBQWlCLEdBQUcscUJBQXFCLENBQUE7QUFFL0MsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLGlCQUFpQixFQUFFLENBQUMsUUFB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
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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { FuzzyScore } from '../../../../base/common/filters.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, RefCountedDisposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Range } from '../../../common/core/range.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { CompletionModel, LineContext } from './completionModel.js';
import { CompletionOptions, provideSuggestionItems, QuickSuggestionsOptions, } from './suggest.js';
import { ISuggestMemoryService } from './suggestMemory.js';
import { SuggestModel } from './suggestModel.js';
import { WordDistance } from './wordDistance.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
class SuggestInlineCompletion {
    constructor(range, insertText, filterText, additionalTextEdits, command, action, completion) {
        this.range = range;
        this.insertText = insertText;
        this.filterText = filterText;
        this.additionalTextEdits = additionalTextEdits;
        this.command = command;
        this.action = action;
        this.completion = completion;
    }
}
let InlineCompletionResults = class InlineCompletionResults extends RefCountedDisposable {
    constructor(model, line, word, completionModel, completions, _suggestMemoryService) {
        super(completions.disposable);
        this.model = model;
        this.line = line;
        this.word = word;
        this.completionModel = completionModel;
        this._suggestMemoryService = _suggestMemoryService;
    }
    canBeReused(model, line, word) {
        return (this.model === model && // same model
            this.line === line &&
            this.word.word.length > 0 &&
            this.word.startColumn === word.startColumn &&
            this.word.endColumn < word.endColumn && // same word
            this.completionModel.getIncompleteProvider().size === 0); // no incomplete results
    }
    get items() {
        const result = [];
        // Split items by preselected index. This ensures the memory-selected item shows first and that better/worst
        // ranked items are before/after
        const { items } = this.completionModel;
        const selectedIndex = this._suggestMemoryService.select(this.model, {
            lineNumber: this.line,
            column: this.word.endColumn + this.completionModel.lineContext.characterCountDelta,
        }, items);
        const first = Iterable.slice(items, selectedIndex);
        const second = Iterable.slice(items, 0, selectedIndex);
        let resolveCount = 5;
        for (const item of Iterable.concat(first, second)) {
            if (item.score === FuzzyScore.Default) {
                // skip items that have no overlap
                continue;
            }
            const range = new Range(item.editStart.lineNumber, item.editStart.column, item.editInsertEnd.lineNumber, item.editInsertEnd.column + this.completionModel.lineContext.characterCountDelta);
            const insertText = item.completion.insertTextRules &&
                item.completion.insertTextRules & 4 /* CompletionItemInsertTextRule.InsertAsSnippet */
                ? { snippet: item.completion.insertText }
                : item.completion.insertText;
            result.push(new SuggestInlineCompletion(range, insertText, item.filterTextLow ?? item.labelLow, item.completion.additionalTextEdits, item.completion.command, item.completion.action, item));
            // resolve the first N suggestions eagerly
            if (resolveCount-- >= 0) {
                item.resolve(CancellationToken.None);
            }
        }
        return result;
    }
};
InlineCompletionResults = __decorate([
    __param(5, ISuggestMemoryService)
], InlineCompletionResults);
let SuggestInlineCompletions = class SuggestInlineCompletions extends Disposable {
    constructor(_languageFeatureService, _clipboardService, _suggestMemoryService, _editorService) {
        super();
        this._languageFeatureService = _languageFeatureService;
        this._clipboardService = _clipboardService;
        this._suggestMemoryService = _suggestMemoryService;
        this._editorService = _editorService;
        this._store.add(_languageFeatureService.inlineCompletionsProvider.register('*', this));
    }
    async provideInlineCompletions(model, position, context, token) {
        if (context.selectedSuggestionInfo) {
            return;
        }
        let editor;
        for (const candidate of this._editorService.listCodeEditors()) {
            if (candidate.getModel() === model) {
                editor = candidate;
                break;
            }
        }
        if (!editor) {
            return;
        }
        const config = editor.getOption(94 /* EditorOption.quickSuggestions */);
        if (QuickSuggestionsOptions.isAllOff(config)) {
            // quick suggest is off (for this model/language)
            return;
        }
        model.tokenization.tokenizeIfCheap(position.lineNumber);
        const lineTokens = model.tokenization.getLineTokens(position.lineNumber);
        const tokenType = lineTokens.getStandardTokenType(lineTokens.findTokenIndexAtOffset(Math.max(position.column - 1 - 1, 0)));
        if (QuickSuggestionsOptions.valueFor(config, tokenType) !== 'inline') {
            // quick suggest is off (for this token)
            return undefined;
        }
        // We consider non-empty leading words and trigger characters. The latter only
        // when no word is being typed (word characters superseed trigger characters)
        let wordInfo = model.getWordAtPosition(position);
        let triggerCharacterInfo;
        if (!wordInfo?.word) {
            triggerCharacterInfo = this._getTriggerCharacterInfo(model, position);
        }
        if (!wordInfo?.word && !triggerCharacterInfo) {
            // not at word, not a trigger character
            return;
        }
        // ensure that we have word information and that we are at the end of a word
        // otherwise we stop because we don't want to do quick suggestions inside words
        if (!wordInfo) {
            wordInfo = model.getWordUntilPosition(position);
        }
        if (wordInfo.endColumn !== position.column) {
            return;
        }
        let result;
        const leadingLineContents = model.getValueInRange(new Range(position.lineNumber, 1, position.lineNumber, position.column));
        if (!triggerCharacterInfo &&
            this._lastResult?.canBeReused(model, position.lineNumber, wordInfo)) {
            // reuse a previous result iff possible, only a refilter is needed
            // TODO@jrieken this can be improved further and only incomplete results can be updated
            // console.log(`REUSE with ${wordInfo.word}`);
            const newLineContext = new LineContext(leadingLineContents, position.column - this._lastResult.word.endColumn);
            this._lastResult.completionModel.lineContext = newLineContext;
            this._lastResult.acquire();
            result = this._lastResult;
        }
        else {
            // refesh model is required
            const completions = await provideSuggestionItems(this._languageFeatureService.completionProvider, model, position, new CompletionOptions(undefined, SuggestModel.createSuggestFilter(editor).itemKind, triggerCharacterInfo?.providers), triggerCharacterInfo && {
                triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */,
                triggerCharacter: triggerCharacterInfo.ch,
            }, token);
            let clipboardText;
            if (completions.needsClipboard) {
                clipboardText = await this._clipboardService.readText();
            }
            const completionModel = new CompletionModel(completions.items, position.column, new LineContext(leadingLineContents, 0), WordDistance.None, editor.getOption(123 /* EditorOption.suggest */), editor.getOption(117 /* EditorOption.snippetSuggestions */), { boostFullMatch: false, firstMatchCanBeWeak: false }, clipboardText);
            result = new InlineCompletionResults(model, position.lineNumber, wordInfo, completionModel, completions, this._suggestMemoryService);
        }
        this._lastResult = result;
        return result;
    }
    handleItemDidShow(_completions, item) {
        item.completion.resolve(CancellationToken.None);
    }
    freeInlineCompletions(result) {
        result.release();
    }
    _getTriggerCharacterInfo(model, position) {
        const ch = model.getValueInRange(Range.fromPositions({ lineNumber: position.lineNumber, column: position.column - 1 }, position));
        const providers = new Set();
        for (const provider of this._languageFeatureService.completionProvider.all(model)) {
            if (provider.triggerCharacters?.includes(ch)) {
                providers.add(provider);
            }
        }
        if (providers.size === 0) {
            return undefined;
        }
        return { providers, ch };
    }
};
SuggestInlineCompletions = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IClipboardService),
    __param(2, ISuggestMemoryService),
    __param(3, ICodeEditorService)
], SuggestInlineCompletions);
export { SuggestInlineCompletions };
registerEditorFeature(SuggestInlineCompletions);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdElubGluZUNvbXBsZXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3N1Z2dlc3RJbmxpbmVDb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUluRixPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFZekUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNuRSxPQUFPLEVBR04saUJBQWlCLEVBQ2pCLHNCQUFzQixFQUN0Qix1QkFBdUIsR0FDdkIsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDMUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUU3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
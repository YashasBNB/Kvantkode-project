/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { CancellationError, isCancellationError, onUnexpectedExternalError, } from '../../../../base/common/errors.js';
import { FuzzyScore } from '../../../../base/common/filters.js';
import { DisposableStore, isDisposable } from '../../../../base/common/lifecycle.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { SnippetParser } from '../../snippet/browser/snippetParser.js';
import { localize } from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { historyNavigationVisible } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
export const Context = {
    Visible: historyNavigationVisible,
    HasFocusedSuggestion: new RawContextKey('suggestWidgetHasFocusedSuggestion', false, localize('suggestWidgetHasSelection', 'Whether any suggestion is focused')),
    DetailsVisible: new RawContextKey('suggestWidgetDetailsVisible', false, localize('suggestWidgetDetailsVisible', 'Whether suggestion details are visible')),
    MultipleSuggestions: new RawContextKey('suggestWidgetMultipleSuggestions', false, localize('suggestWidgetMultipleSuggestions', 'Whether there are multiple suggestions to pick from')),
    MakesTextEdit: new RawContextKey('suggestionMakesTextEdit', true, localize('suggestionMakesTextEdit', 'Whether inserting the current suggestion yields in a change or has everything already been typed')),
    AcceptSuggestionsOnEnter: new RawContextKey('acceptSuggestionOnEnter', true, localize('acceptSuggestionOnEnter', 'Whether suggestions are inserted when pressing Enter')),
    HasInsertAndReplaceRange: new RawContextKey('suggestionHasInsertAndReplaceRange', false, localize('suggestionHasInsertAndReplaceRange', 'Whether the current suggestion has insert and replace behaviour')),
    InsertMode: new RawContextKey('suggestionInsertMode', undefined, {
        type: 'string',
        description: localize('suggestionInsertMode', 'Whether the default behaviour is to insert or replace'),
    }),
    CanResolve: new RawContextKey('suggestionCanResolve', false, localize('suggestionCanResolve', 'Whether the current suggestion supports to resolve further details')),
};
export const suggestWidgetStatusbarMenu = new MenuId('suggestWidgetStatusBar');
export class CompletionItem {
    constructor(position, completion, container, provider) {
        this.position = position;
        this.completion = completion;
        this.container = container;
        this.provider = provider;
        // validation
        this.isInvalid = false;
        // sorting, filtering
        this.score = FuzzyScore.Default;
        this.distance = 0;
        this.textLabel =
            typeof completion.label === 'string' ? completion.label : completion.label?.label;
        // ensure lower-variants (perf)
        this.labelLow = this.textLabel.toLowerCase();
        // validate label
        this.isInvalid = !this.textLabel;
        this.sortTextLow = completion.sortText && completion.sortText.toLowerCase();
        this.filterTextLow = completion.filterText && completion.filterText.toLowerCase();
        this.extensionId = completion.extensionId;
        // normalize ranges
        if (Range.isIRange(completion.range)) {
            this.editStart = new Position(completion.range.startLineNumber, completion.range.startColumn);
            this.editInsertEnd = new Position(completion.range.endLineNumber, completion.range.endColumn);
            this.editReplaceEnd = new Position(completion.range.endLineNumber, completion.range.endColumn);
            // validate range
            this.isInvalid =
                this.isInvalid ||
                    Range.spansMultipleLines(completion.range) ||
                    completion.range.startLineNumber !== position.lineNumber;
        }
        else {
            this.editStart = new Position(completion.range.insert.startLineNumber, completion.range.insert.startColumn);
            this.editInsertEnd = new Position(completion.range.insert.endLineNumber, completion.range.insert.endColumn);
            this.editReplaceEnd = new Position(completion.range.replace.endLineNumber, completion.range.replace.endColumn);
            // validate ranges
            this.isInvalid =
                this.isInvalid ||
                    Range.spansMultipleLines(completion.range.insert) ||
                    Range.spansMultipleLines(completion.range.replace) ||
                    completion.range.insert.startLineNumber !== position.lineNumber ||
                    completion.range.replace.startLineNumber !== position.lineNumber ||
                    completion.range.insert.startColumn !== completion.range.replace.startColumn;
        }
        // create the suggestion resolver
        if (typeof provider.resolveCompletionItem !== 'function') {
            this._resolveCache = Promise.resolve();
            this._resolveDuration = 0;
        }
    }
    // ---- resolving
    get isResolved() {
        return this._resolveDuration !== undefined;
    }
    get resolveDuration() {
        return this._resolveDuration !== undefined ? this._resolveDuration : -1;
    }
    async resolve(token) {
        if (!this._resolveCache) {
            const sub = token.onCancellationRequested(() => {
                this._resolveCache = undefined;
                this._resolveDuration = undefined;
            });
            const sw = new StopWatch(true);
            this._resolveCache = Promise.resolve(this.provider.resolveCompletionItem(this.completion, token))
                .then((value) => {
                Object.assign(this.completion, value);
                this._resolveDuration = sw.elapsed();
            }, (err) => {
                if (isCancellationError(err)) {
                    // the IPC queue will reject the request with the
                    // cancellation error -> reset cached
                    this._resolveCache = undefined;
                    this._resolveDuration = undefined;
                }
            })
                .finally(() => {
                sub.dispose();
            });
        }
        return this._resolveCache;
    }
}
export var SnippetSortOrder;
(function (SnippetSortOrder) {
    SnippetSortOrder[SnippetSortOrder["Top"] = 0] = "Top";
    SnippetSortOrder[SnippetSortOrder["Inline"] = 1] = "Inline";
    SnippetSortOrder[SnippetSortOrder["Bottom"] = 2] = "Bottom";
})(SnippetSortOrder || (SnippetSortOrder = {}));
export class CompletionOptions {
    static { this.default = new CompletionOptions(); }
    constructor(snippetSortOrder = 2 /* SnippetSortOrder.Bottom */, kindFilter = new Set(), providerFilter = new Set(), providerItemsToReuse = new Map(), showDeprecated = true) {
        this.snippetSortOrder = snippetSortOrder;
        this.kindFilter = kindFilter;
        this.providerFilter = providerFilter;
        this.providerItemsToReuse = providerItemsToReuse;
        this.showDeprecated = showDeprecated;
    }
}
let _snippetSuggestSupport;
export function getSnippetSuggestSupport() {
    return _snippetSuggestSupport;
}
export function setSnippetSuggestSupport(support) {
    const old = _snippetSuggestSupport;
    _snippetSuggestSupport = support;
    return old;
}
export class CompletionItemModel {
    constructor(items, needsClipboard, durations, disposable) {
        this.items = items;
        this.needsClipboard = needsClipboard;
        this.durations = durations;
        this.disposable = disposable;
    }
}
export async function provideSuggestionItems(registry, model, position, options = CompletionOptions.default, context = { triggerKind: 0 /* languages.CompletionTriggerKind.Invoke */ }, token = CancellationToken.None) {
    const sw = new StopWatch();
    position = position.clone();
    const word = model.getWordAtPosition(position);
    const defaultReplaceRange = word
        ? new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn)
        : Range.fromPositions(position);
    const defaultRange = {
        replace: defaultReplaceRange,
        insert: defaultReplaceRange.setEndPosition(position.lineNumber, position.column),
    };
    const result = [];
    const disposables = new DisposableStore();
    const durations = [];
    let needsClipboard = false;
    const onCompletionList = (provider, container, sw) => {
        let didAddResult = false;
        if (!container) {
            return didAddResult;
        }
        for (const suggestion of container.suggestions) {
            if (!options.kindFilter.has(suggestion.kind)) {
                // skip if not showing deprecated suggestions
                if (!options.showDeprecated &&
                    suggestion?.tags?.includes(1 /* languages.CompletionItemTag.Deprecated */)) {
                    continue;
                }
                // fill in default range when missing
                if (!suggestion.range) {
                    suggestion.range = defaultRange;
                }
                // fill in default sortText when missing
                if (!suggestion.sortText) {
                    suggestion.sortText =
                        typeof suggestion.label === 'string' ? suggestion.label : suggestion.label.label;
                }
                if (!needsClipboard &&
                    suggestion.insertTextRules &&
                    suggestion.insertTextRules & 4 /* languages.CompletionItemInsertTextRule.InsertAsSnippet */) {
                    needsClipboard = SnippetParser.guessNeedsClipboard(suggestion.insertText);
                }
                result.push(new CompletionItem(position, suggestion, container, provider));
                didAddResult = true;
            }
        }
        if (isDisposable(container)) {
            disposables.add(container);
        }
        durations.push({
            providerName: provider._debugDisplayName ?? 'unknown_provider',
            elapsedProvider: container.duration ?? -1,
            elapsedOverall: sw.elapsed(),
        });
        return didAddResult;
    };
    // ask for snippets in parallel to asking "real" providers. Only do something if configured to
    // do so - no snippet filter, no special-providers-only request
    const snippetCompletions = (async () => {
        if (!_snippetSuggestSupport || options.kindFilter.has(27 /* languages.CompletionItemKind.Snippet */)) {
            return;
        }
        // we have items from a previous session that we can reuse
        const reuseItems = options.providerItemsToReuse.get(_snippetSuggestSupport);
        if (reuseItems) {
            reuseItems.forEach((item) => result.push(item));
            return;
        }
        if (options.providerFilter.size > 0 && !options.providerFilter.has(_snippetSuggestSupport)) {
            return;
        }
        const sw = new StopWatch();
        const list = await _snippetSuggestSupport.provideCompletionItems(model, position, context, token);
        onCompletionList(_snippetSuggestSupport, list, sw);
    })();
    // add suggestions from contributed providers - providers are ordered in groups of
    // equal score and once a group produces a result the process stops
    // get provider groups, always add snippet suggestion provider
    for (const providerGroup of registry.orderedGroups(model)) {
        // for each support in the group ask for suggestions
        let didAddResult = false;
        await Promise.all(providerGroup.map(async (provider) => {
            // we have items from a previous session that we can reuse
            if (options.providerItemsToReuse.has(provider)) {
                const items = options.providerItemsToReuse.get(provider);
                items.forEach((item) => result.push(item));
                didAddResult = didAddResult || items.length > 0;
                return;
            }
            // check if this provider is filtered out
            if (options.providerFilter.size > 0 && !options.providerFilter.has(provider)) {
                return;
            }
            try {
                const sw = new StopWatch();
                const list = await provider.provideCompletionItems(model, position, context, token);
                didAddResult = onCompletionList(provider, list, sw) || didAddResult;
            }
            catch (err) {
                onUnexpectedExternalError(err);
            }
        }));
        if (didAddResult || token.isCancellationRequested) {
            break;
        }
    }
    await snippetCompletions;
    if (token.isCancellationRequested) {
        disposables.dispose();
        return Promise.reject(new CancellationError());
    }
    return new CompletionItemModel(result.sort(getSuggestionComparator(options.snippetSortOrder)), needsClipboard, { entries: durations, elapsed: sw.elapsed() }, disposables);
}
function defaultComparator(a, b) {
    // check with 'sortText'
    if (a.sortTextLow && b.sortTextLow) {
        if (a.sortTextLow < b.sortTextLow) {
            return -1;
        }
        else if (a.sortTextLow > b.sortTextLow) {
            return 1;
        }
    }
    // check with 'label'
    if (a.textLabel < b.textLabel) {
        return -1;
    }
    else if (a.textLabel > b.textLabel) {
        return 1;
    }
    // check with 'type'
    return a.completion.kind - b.completion.kind;
}
function snippetUpComparator(a, b) {
    if (a.completion.kind !== b.completion.kind) {
        if (a.completion.kind === 27 /* languages.CompletionItemKind.Snippet */) {
            return -1;
        }
        else if (b.completion.kind === 27 /* languages.CompletionItemKind.Snippet */) {
            return 1;
        }
    }
    return defaultComparator(a, b);
}
function snippetDownComparator(a, b) {
    if (a.completion.kind !== b.completion.kind) {
        if (a.completion.kind === 27 /* languages.CompletionItemKind.Snippet */) {
            return 1;
        }
        else if (b.completion.kind === 27 /* languages.CompletionItemKind.Snippet */) {
            return -1;
        }
    }
    return defaultComparator(a, b);
}
const _snippetComparators = new Map();
_snippetComparators.set(0 /* SnippetSortOrder.Top */, snippetUpComparator);
_snippetComparators.set(2 /* SnippetSortOrder.Bottom */, snippetDownComparator);
_snippetComparators.set(1 /* SnippetSortOrder.Inline */, defaultComparator);
export function getSuggestionComparator(snippetConfig) {
    return _snippetComparators.get(snippetConfig);
}
CommandsRegistry.registerCommand('_executeCompletionItemProvider', async (accessor, ...args) => {
    const [uri, position, triggerCharacter, maxItemsToResolve] = args;
    assertType(URI.isUri(uri));
    assertType(Position.isIPosition(position));
    assertType(typeof triggerCharacter === 'string' || !triggerCharacter);
    assertType(typeof maxItemsToResolve === 'number' || !maxItemsToResolve);
    const { completionProvider } = accessor.get(ILanguageFeaturesService);
    const ref = await accessor.get(ITextModelService).createModelReference(uri);
    try {
        const result = {
            incomplete: false,
            suggestions: [],
        };
        const resolving = [];
        const actualPosition = ref.object.textEditorModel.validatePosition(position);
        const completions = await provideSuggestionItems(completionProvider, ref.object.textEditorModel, actualPosition, undefined, {
            triggerCharacter: triggerCharacter ?? undefined,
            triggerKind: triggerCharacter
                ? 1 /* languages.CompletionTriggerKind.TriggerCharacter */
                : 0 /* languages.CompletionTriggerKind.Invoke */,
        });
        for (const item of completions.items) {
            if (resolving.length < (maxItemsToResolve ?? 0)) {
                resolving.push(item.resolve(CancellationToken.None));
            }
            result.incomplete = result.incomplete || item.container.incomplete;
            result.suggestions.push(item.completion);
        }
        try {
            await Promise.all(resolving);
            return result;
        }
        finally {
            setTimeout(() => completions.disposable.dispose(), 100);
        }
    }
    finally {
        ref.dispose();
    }
});
export function showSimpleSuggestions(editor, provider) {
    editor
        .getContribution('editor.contrib.suggestController')
        ?.triggerSuggest(new Set().add(provider), undefined, true);
}
export class QuickSuggestionsOptions {
    static isAllOff(config) {
        return config.other === 'off' && config.comments === 'off' && config.strings === 'off';
    }
    static isAllOn(config) {
        return config.other === 'on' && config.comments === 'on' && config.strings === 'on';
    }
    static valueFor(config, tokenType) {
        switch (tokenType) {
            case 1 /* StandardTokenType.Comment */:
                return config.comments;
            case 2 /* StandardTokenType.String */:
                return config.strings;
            default:
                return config.other;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvYnJvd3Nlci9zdWdnZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsbUJBQW1CLEVBQ25CLHlCQUF5QixHQUN6QixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFJckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXBGLE9BQU8sRUFBRSx3QkFB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
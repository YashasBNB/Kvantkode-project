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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3N1Z2dlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixtQkFBbUIsRUFDbkIseUJBQXlCLEdBQ3pCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUlyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFcEYsT0FBTyxFQUFF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
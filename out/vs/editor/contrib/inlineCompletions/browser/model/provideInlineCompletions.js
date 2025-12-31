/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { AsyncIterableObject, DeferredPromise } from '../../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../../base/common/errors.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { SetMap } from '../../../../../base/common/map.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { SingleOffsetEdit } from '../../../../common/core/offsetEdit.js';
import { OffsetRange } from '../../../../common/core/offsetRange.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { InlineCompletionTriggerKind, } from '../../../../common/languages.js';
import { fixBracketsInLine } from '../../../../common/model/bracketPairsTextModelPart/fixBrackets.js';
import { TextModelText } from '../../../../common/model/textModelText.js';
import { SnippetParser, Text } from '../../../snippet/browser/snippetParser.js';
import { getReadonlyEmptyArray } from '../utils.js';
export async function provideInlineCompletions(registry, positionOrRange, model, context, baseToken = CancellationToken.None, languageConfigurationService) {
    const requestUuid = generateUuid();
    const tokenSource = new CancellationTokenSource(baseToken);
    const token = tokenSource.token;
    const contextWithUuid = { ...context, requestUuid: requestUuid };
    const defaultReplaceRange = positionOrRange instanceof Position ? getDefaultRange(positionOrRange, model) : positionOrRange;
    const providers = registry.all(model);
    const multiMap = new SetMap();
    for (const provider of providers) {
        if (provider.groupId) {
            multiMap.add(provider.groupId, provider);
        }
    }
    function getPreferredProviders(provider) {
        if (!provider.yieldsToGroupIds) {
            return [];
        }
        const result = [];
        for (const groupId of provider.yieldsToGroupIds || []) {
            const providers = multiMap.get(groupId);
            for (const p of providers) {
                result.push(p);
            }
        }
        return result;
    }
    const states = new Map();
    const seen = new Set();
    function findPreferredProviderCircle(provider, stack) {
        stack = [...stack, provider];
        if (seen.has(provider)) {
            return stack;
        }
        seen.add(provider);
        try {
            const preferred = getPreferredProviders(provider);
            for (const p of preferred) {
                const c = findPreferredProviderCircle(p, stack);
                if (c) {
                    return c;
                }
            }
        }
        finally {
            seen.delete(provider);
        }
        return undefined;
    }
    function queryProviderOrPreferredProvider(provider) {
        const state = states.get(provider);
        if (state) {
            return state;
        }
        const circle = findPreferredProviderCircle(provider, []);
        if (circle) {
            onUnexpectedExternalError(new Error(`Inline completions: cyclic yield-to dependency detected.` +
                ` Path: ${circle.map((s) => (s.toString ? s.toString() : '' + s)).join(' -> ')}`));
        }
        const deferredPromise = new DeferredPromise();
        states.set(provider, deferredPromise.p);
        (async () => {
            if (!circle) {
                const preferred = getPreferredProviders(provider);
                for (const p of preferred) {
                    const result = await queryProviderOrPreferredProvider(p);
                    if (result && result.inlineCompletions.items.length > 0) {
                        // Skip provider
                        return undefined;
                    }
                }
            }
            return query(provider);
        })().then((c) => deferredPromise.complete(c), (e) => deferredPromise.error(e));
        return deferredPromise.p;
    }
    async function query(provider) {
        let result;
        try {
            if (positionOrRange instanceof Position) {
                result = await provider.provideInlineCompletions(model, positionOrRange, contextWithUuid, token);
            }
            else {
                result = await provider.provideInlineEditsForRange?.(model, positionOrRange, contextWithUuid, token);
            }
        }
        catch (e) {
            onUnexpectedExternalError(e);
            return undefined;
        }
        if (!result) {
            return undefined;
        }
        const list = new InlineCompletionList(result, provider);
        runWhenCancelled(token, () => list.removeRef());
        return list;
    }
    const inlineCompletionLists = AsyncIterableObject.fromPromisesResolveOrder(providers.map(queryProviderOrPreferredProvider));
    if (token.isCancellationRequested) {
        tokenSource.dispose(true);
        // result has been disposed before we could call addRef! So we have to discard everything.
        return new InlineCompletionProviderResult([], new Set(), []);
    }
    const result = await addRefAndCreateResult(contextWithUuid, inlineCompletionLists, defaultReplaceRange, model, languageConfigurationService);
    tokenSource.dispose(true); // This disposes results that are not referenced.
    return result;
}
/** If the token does not leak, this will not leak either. */
function runWhenCancelled(token, callback) {
    if (token.isCancellationRequested) {
        callback();
        return Disposable.None;
    }
    else {
        const listener = token.onCancellationRequested(() => {
            listener.dispose();
            callback();
        });
        return { dispose: () => listener.dispose() };
    }
}
// TODO: check cancellation token!
async function addRefAndCreateResult(context, inlineCompletionLists, defaultReplaceRange, model, languageConfigurationService) {
    // for deduplication
    const itemsByHash = new Map();
    let shouldStop = false;
    const lists = [];
    for await (const completions of inlineCompletionLists) {
        if (!completions) {
            continue;
        }
        completions.addRef();
        lists.push(completions);
        for (const item of completions.inlineCompletions.items) {
            if (!context.includeInlineEdits && (item.isInlineEdit || item.showInlineEditMenu)) {
                continue;
            }
            if (!context.includeInlineCompletions && !(item.isInlineEdit || item.showInlineEditMenu)) {
                continue;
            }
            const inlineCompletionItem = InlineCompletionItem.from(item, completions, defaultReplaceRange, model, languageConfigurationService);
            itemsByHash.set(inlineCompletionItem.hash(), inlineCompletionItem);
            // Stop after first visible inline completion
            if (!(item.isInlineEdit || item.showInlineEditMenu) &&
                context.triggerKind === InlineCompletionTriggerKind.Automatic) {
                const minifiedEdit = inlineCompletionItem
                    .toSingleTextEdit()
                    .removeCommonPrefix(new TextModelText(model));
                if (!minifiedEdit.isEmpty) {
                    shouldStop = true;
                }
            }
        }
        if (shouldStop) {
            break;
        }
    }
    return new InlineCompletionProviderResult(Array.from(itemsByHash.values()), new Set(itemsByHash.keys()), lists);
}
export class InlineCompletionProviderResult {
    constructor(
    /**
     * Free of duplicates.
     */
    completions, hashs, providerResults) {
        this.completions = completions;
        this.hashs = hashs;
        this.providerResults = providerResults;
    }
    has(item) {
        return this.hashs.has(item.hash());
    }
    // TODO: This is not complete as it does not take the textmodel into account
    isEmpty() {
        return (this.completions.length === 0 ||
            this.completions.every((c) => c.range.isEmpty() && c.insertText.length === 0));
    }
    dispose() {
        for (const result of this.providerResults) {
            result.removeRef();
        }
    }
}
/**
 * A ref counted pointer to the computed `InlineCompletions` and the `InlineCompletionsProvider` that
 * computed them.
 */
export class InlineCompletionList {
    constructor(inlineCompletions, provider) {
        this.inlineCompletions = inlineCompletions;
        this.provider = provider;
        this.refCount = 1;
    }
    addRef() {
        this.refCount++;
    }
    removeRef() {
        this.refCount--;
        if (this.refCount === 0) {
            this.provider.freeInlineCompletions(this.inlineCompletions);
        }
    }
}
export class InlineCompletionItem {
    static from(inlineCompletion, source, defaultReplaceRange, textModel, languageConfigurationService) {
        let insertText;
        let snippetInfo;
        let range = inlineCompletion.range ? Range.lift(inlineCompletion.range) : defaultReplaceRange;
        if (typeof inlineCompletion.insertText === 'string') {
            insertText = inlineCompletion.insertText;
            if (languageConfigurationService && inlineCompletion.completeBracketPairs) {
                insertText = closeBrackets(insertText, range.getStartPosition(), textModel, languageConfigurationService);
                // Modify range depending on if brackets are added or removed
                const diff = insertText.length - inlineCompletion.insertText.length;
                if (diff !== 0) {
                    range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + diff);
                }
            }
            snippetInfo = undefined;
        }
        else if ('snippet' in inlineCompletion.insertText) {
            const preBracketCompletionLength = inlineCompletion.insertText.snippet.length;
            if (languageConfigurationService && inlineCompletion.completeBracketPairs) {
                inlineCompletion.insertText.snippet = closeBrackets(inlineCompletion.insertText.snippet, range.getStartPosition(), textModel, languageConfigurationService);
                // Modify range depending on if brackets are added or removed
                const diff = inlineCompletion.insertText.snippet.length - preBracketCompletionLength;
                if (diff !== 0) {
                    range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + diff);
                }
            }
            const snippet = new SnippetParser().parse(inlineCompletion.insertText.snippet);
            if (snippet.children.length === 1 && snippet.children[0] instanceof Text) {
                insertText = snippet.children[0].value;
                snippetInfo = undefined;
            }
            else {
                insertText = snippet.toString();
                snippetInfo = {
                    snippet: inlineCompletion.insertText.snippet,
                    range: range,
                };
            }
        }
        else {
            assertNever(inlineCompletion.insertText);
        }
        return new InlineCompletionItem(insertText, inlineCompletion.command, inlineCompletion.shownCommand, inlineCompletion.action, range, insertText, snippetInfo, Range.lift(inlineCompletion.showRange) ?? undefined, inlineCompletion.additionalTextEdits || getReadonlyEmptyArray(), inlineCompletion, source);
    }
    static { this.ID = 1; }
    constructor(filterText, command, 
    /** @deprecated. Use handleItemDidShow */
    shownCommand, action, range, insertText, snippetInfo, cursorShowRange, additionalTextEdits, 
    /**
     * A reference to the original inline completion this inline completion has been constructed from.
     * Used for event data to ensure referential equality.
     */
    sourceInlineCompletion, 
    /**
     * A reference to the original inline completion list this inline completion has been constructed from.
     * Used for event data to ensure referential equality.
     */
    source, id = `InlineCompletion:${InlineCompletionItem.ID++}`) {
        this.filterText = filterText;
        this.command = command;
        this.shownCommand = shownCommand;
        this.action = action;
        this.range = range;
        this.insertText = insertText;
        this.snippetInfo = snippetInfo;
        this.cursorShowRange = cursorShowRange;
        this.additionalTextEdits = additionalTextEdits;
        this.sourceInlineCompletion = sourceInlineCompletion;
        this.source = source;
        this.id = id;
        this._didCallShow = false;
    }
    get isInlineEdit() {
        return this.sourceInlineCompletion.isInlineEdit;
    }
    get didShow() {
        return this._didCallShow;
    }
    markAsShown() {
        this._didCallShow = true;
    }
    withRangeInsertTextAndFilterText(updatedRange, updatedInsertText, updatedFilterText) {
        return new InlineCompletionItem(updatedFilterText, this.command, this.shownCommand, this.action, updatedRange, updatedInsertText, this.snippetInfo, this.cursorShowRange, this.additionalTextEdits, this.sourceInlineCompletion, this.source, this.id);
    }
    hash() {
        return JSON.stringify({ insertText: this.insertText, range: this.range.toString() });
    }
    toSingleTextEdit() {
        return new SingleTextEdit(this.range, this.insertText);
    }
}
function getDefaultRange(position, model) {
    const word = model.getWordAtPosition(position);
    const maxColumn = model.getLineMaxColumn(position.lineNumber);
    // By default, always replace up until the end of the current line.
    // This default might be subject to change!
    return word
        ? new Range(position.lineNumber, word.startColumn, position.lineNumber, maxColumn)
        : Range.fromPositions(position, position.with(undefined, maxColumn));
}
function closeBrackets(text, position, model, languageConfigurationService) {
    const currentLine = model.getLineContent(position.lineNumber);
    const edit = SingleOffsetEdit.replace(new OffsetRange(position.column - 1, currentLine.length), text);
    const proposedLineTokens = model.tokenization.tokenizeLinesAt(position.lineNumber, [
        edit.apply(currentLine),
    ]);
    const textTokens = proposedLineTokens?.[0].sliceZeroCopy(edit.getRangeAfterApply());
    if (!textTokens) {
        return text;
    }
    const fixedText = fixBracketsInLine(textTokens, languageConfigurationService);
    return fixedText;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZUlubGluZUNvbXBsZXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9wcm92aWRlSW5saW5lQ29tcGxldGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRixPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVwRSxPQUFPLEVBT04sMkJBQTJCLEdBQzNCLE1BQU0saUNBQWlDLENBQUE7QUFHeEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDckcsT0FBTyxFQUFFLGFBQWEs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
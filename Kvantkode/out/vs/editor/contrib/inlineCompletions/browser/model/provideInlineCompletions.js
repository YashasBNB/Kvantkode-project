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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZUlubGluZUNvbXBsZXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL3Byb3ZpZGVJbmxpbmVDb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFGLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXBFLE9BQU8sRUFPTiwyQkFBMkIsR0FDM0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUd4QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FB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
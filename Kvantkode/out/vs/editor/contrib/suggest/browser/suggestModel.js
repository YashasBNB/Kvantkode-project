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
var SuggestModel_1;
import { TimeoutTimer } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { getLeadingWhitespace, isHighSurrogate, isLowSurrogate, } from '../../../../base/common/strings.js';
import { Selection } from '../../../common/core/selection.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
import { WordDistance } from './wordDistance.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CompletionModel } from './completionModel.js';
import { CompletionOptions, getSnippetSuggestSupport, provideSuggestionItems, QuickSuggestionsOptions, } from './suggest.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { FuzzyScoreOptions } from '../../../../base/common/filters.js';
import { assertType } from '../../../../base/common/types.js';
import { InlineCompletionContextKeys } from '../../inlineCompletions/browser/controller/inlineCompletionContextKeys.js';
import { SnippetController2 } from '../../snippet/browser/snippetController2.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
export class LineContext {
    static shouldAutoTrigger(editor) {
        if (!editor.hasModel()) {
            return false;
        }
        const model = editor.getModel();
        const pos = editor.getPosition();
        model.tokenization.tokenizeIfCheap(pos.lineNumber);
        const word = model.getWordAtPosition(pos);
        if (!word) {
            return false;
        }
        if (word.endColumn !== pos.column &&
            word.startColumn + 1 !== pos.column /* after typing a single character before a word */) {
            return false;
        }
        if (!isNaN(Number(word.word))) {
            return false;
        }
        return true;
    }
    constructor(model, position, triggerOptions) {
        this.leadingLineContent = model
            .getLineContent(position.lineNumber)
            .substr(0, position.column - 1);
        this.leadingWord = model.getWordUntilPosition(position);
        this.lineNumber = position.lineNumber;
        this.column = position.column;
        this.triggerOptions = triggerOptions;
    }
}
export var State;
(function (State) {
    State[State["Idle"] = 0] = "Idle";
    State[State["Manual"] = 1] = "Manual";
    State[State["Auto"] = 2] = "Auto";
})(State || (State = {}));
function canShowQuickSuggest(editor, contextKeyService, configurationService) {
    if (!Boolean(contextKeyService.getContextKeyValue(InlineCompletionContextKeys.inlineSuggestionVisible.key))) {
        // Allow if there is no inline suggestion.
        return true;
    }
    const suppressSuggestions = contextKeyService.getContextKeyValue(InlineCompletionContextKeys.suppressSuggestions.key);
    if (suppressSuggestions !== undefined) {
        return !suppressSuggestions;
    }
    return !editor.getOption(64 /* EditorOption.inlineSuggest */).suppressSuggestions;
}
function canShowSuggestOnTriggerCharacters(editor, contextKeyService, configurationService) {
    if (!Boolean(contextKeyService.getContextKeyValue('inlineSuggestionVisible'))) {
        // Allow if there is no inline suggestion.
        return true;
    }
    const suppressSuggestions = contextKeyService.getContextKeyValue(InlineCompletionContextKeys.suppressSuggestions.key);
    if (suppressSuggestions !== undefined) {
        return !suppressSuggestions;
    }
    return !editor.getOption(64 /* EditorOption.inlineSuggest */).suppressSuggestions;
}
let SuggestModel = SuggestModel_1 = class SuggestModel {
    constructor(_editor, _editorWorkerService, _clipboardService, _telemetryService, _logService, _contextKeyService, _configurationService, _languageFeaturesService, _envService) {
        this._editor = _editor;
        this._editorWorkerService = _editorWorkerService;
        this._clipboardService = _clipboardService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._contextKeyService = _contextKeyService;
        this._configurationService = _configurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._envService = _envService;
        this._toDispose = new DisposableStore();
        this._triggerCharacterListener = new DisposableStore();
        this._triggerQuickSuggest = new TimeoutTimer();
        this._triggerState = undefined;
        this._completionDisposables = new DisposableStore();
        this._onDidCancel = new Emitter();
        this._onDidTrigger = new Emitter();
        this._onDidSuggest = new Emitter();
        this.onDidCancel = this._onDidCancel.event;
        this.onDidTrigger = this._onDidTrigger.event;
        this.onDidSuggest = this._onDidSuggest.event;
        this._currentSelection = this._editor.getSelection() || new Selection(1, 1, 1, 1);
        // wire up various listeners
        this._toDispose.add(this._editor.onDidChangeModel(() => {
            this._updateTriggerCharacters();
            this.cancel();
        }));
        this._toDispose.add(this._editor.onDidChangeModelLanguage(() => {
            this._updateTriggerCharacters();
            this.cancel();
        }));
        this._toDispose.add(this._editor.onDidChangeConfiguration(() => {
            this._updateTriggerCharacters();
        }));
        this._toDispose.add(this._languageFeaturesService.completionProvider.onDidChange(() => {
            this._updateTriggerCharacters();
            this._updateActiveSuggestSession();
        }));
        let editorIsComposing = false;
        this._toDispose.add(this._editor.onDidCompositionStart(() => {
            editorIsComposing = true;
        }));
        this._toDispose.add(this._editor.onDidCompositionEnd(() => {
            editorIsComposing = false;
            this._onCompositionEnd();
        }));
        this._toDispose.add(this._editor.onDidChangeCursorSelection((e) => {
            // only trigger suggest when the editor isn't composing a character
            if (!editorIsComposing) {
                this._onCursorChange(e);
            }
        }));
        this._toDispose.add(this._editor.onDidChangeModelContent(() => {
            // only filter completions when the editor isn't composing a character
            // allow-any-unicode-next-line
            // e.g. ¨ + u makes ü but just ¨ cannot be used for filtering
            if (!editorIsComposing && this._triggerState !== undefined) {
                this._refilterCompletionItems();
            }
        }));
        this._updateTriggerCharacters();
    }
    dispose() {
        dispose(this._triggerCharacterListener);
        dispose([this._onDidCancel, this._onDidSuggest, this._onDidTrigger, this._triggerQuickSuggest]);
        this._toDispose.dispose();
        this._completionDisposables.dispose();
        this.cancel();
    }
    _updateTriggerCharacters() {
        this._triggerCharacterListener.clear();
        if (this._editor.getOption(96 /* EditorOption.readOnly */) ||
            !this._editor.hasModel() ||
            !this._editor.getOption(126 /* EditorOption.suggestOnTriggerCharacters */)) {
            return;
        }
        const supportsByTriggerCharacter = new Map();
        for (const support of this._languageFeaturesService.completionProvider.all(this._editor.getModel())) {
            for (const ch of support.triggerCharacters || []) {
                let set = supportsByTriggerCharacter.get(ch);
                if (!set) {
                    set = new Set();
                    const suggestSupport = getSnippetSuggestSupport();
                    if (suggestSupport) {
                        set.add(suggestSupport);
                    }
                    supportsByTriggerCharacter.set(ch, set);
                }
                set.add(support);
            }
        }
        const checkTriggerCharacter = (text) => {
            if (!canShowSuggestOnTriggerCharacters(this._editor, this._contextKeyService, this._configurationService)) {
                return;
            }
            if (LineContext.shouldAutoTrigger(this._editor)) {
                // don't trigger by trigger characters when this is a case for quick suggest
                return;
            }
            if (!text) {
                // came here from the compositionEnd-event
                const position = this._editor.getPosition();
                const model = this._editor.getModel();
                text = model.getLineContent(position.lineNumber).substr(0, position.column - 1);
            }
            let lastChar = '';
            if (isLowSurrogate(text.charCodeAt(text.length - 1))) {
                if (isHighSurrogate(text.charCodeAt(text.length - 2))) {
                    lastChar = text.substr(text.length - 2);
                }
            }
            else {
                lastChar = text.charAt(text.length - 1);
            }
            const supports = supportsByTriggerCharacter.get(lastChar);
            if (supports) {
                // keep existing items that where not computed by the
                // supports/providers that want to trigger now
                const providerItemsToReuse = new Map();
                if (this._completionModel) {
                    for (const [provider, items] of this._completionModel.getItemsByProvider()) {
                        if (!supports.has(provider)) {
                            providerItemsToReuse.set(provider, items);
                        }
                    }
                }
                this.trigger({
                    auto: true,
                    triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */,
                    triggerCharacter: lastChar,
                    retrigger: Boolean(this._completionModel),
                    clipboardText: this._completionModel?.clipboardText,
                    completionOptions: { providerFilter: supports, providerItemsToReuse },
                });
            }
        };
        this._triggerCharacterListener.add(this._editor.onDidType(checkTriggerCharacter));
        this._triggerCharacterListener.add(this._editor.onDidCompositionEnd(() => checkTriggerCharacter()));
    }
    // --- trigger/retrigger/cancel suggest
    get state() {
        if (!this._triggerState) {
            return 0 /* State.Idle */;
        }
        else if (!this._triggerState.auto) {
            return 1 /* State.Manual */;
        }
        else {
            return 2 /* State.Auto */;
        }
    }
    cancel(retrigger = false) {
        if (this._triggerState !== undefined) {
            this._triggerQuickSuggest.cancel();
            this._requestToken?.cancel();
            this._requestToken = undefined;
            this._triggerState = undefined;
            this._completionModel = undefined;
            this._context = undefined;
            this._onDidCancel.fire({ retrigger });
        }
    }
    clear() {
        this._completionDisposables.clear();
    }
    _updateActiveSuggestSession() {
        if (this._triggerState !== undefined) {
            if (!this._editor.hasModel() ||
                !this._languageFeaturesService.completionProvider.has(this._editor.getModel())) {
                this.cancel();
            }
            else {
                this.trigger({ auto: this._triggerState.auto, retrigger: true });
            }
        }
    }
    _onCursorChange(e) {
        if (!this._editor.hasModel()) {
            return;
        }
        const prevSelection = this._currentSelection;
        this._currentSelection = this._editor.getSelection();
        if (!e.selection.isEmpty() ||
            (e.reason !== 0 /* CursorChangeReason.NotSet */ && e.reason !== 3 /* CursorChangeReason.Explicit */) ||
            (e.source !== 'keyboard' && e.source !== 'deleteLeft')) {
            // Early exit if nothing needs to be done!
            // Leave some form of early exit check here if you wish to continue being a cursor position change listener ;)
            this.cancel();
            return;
        }
        if (this._triggerState === undefined && e.reason === 0 /* CursorChangeReason.NotSet */) {
            if (prevSelection.containsRange(this._currentSelection) ||
                prevSelection.getEndPosition().isBeforeOrEqual(this._currentSelection.getPosition())) {
                // cursor did move RIGHT due to typing -> trigger quick suggest
                this._doTriggerQuickSuggest();
            }
        }
        else if (this._triggerState !== undefined && e.reason === 3 /* CursorChangeReason.Explicit */) {
            // suggest is active and something like cursor keys are used to move
            // the cursor. this means we can refilter at the new position
            this._refilterCompletionItems();
        }
    }
    _onCompositionEnd() {
        // trigger or refilter when composition ends
        if (this._triggerState === undefined) {
            this._doTriggerQuickSuggest();
        }
        else {
            this._refilterCompletionItems();
        }
    }
    _doTriggerQuickSuggest() {
        if (QuickSuggestionsOptions.isAllOff(this._editor.getOption(94 /* EditorOption.quickSuggestions */))) {
            // not enabled
            return;
        }
        if (this._editor.getOption(123 /* EditorOption.suggest */).snippetsPreventQuickSuggestions &&
            SnippetController2.get(this._editor)?.isInSnippet()) {
            // no quick suggestion when in snippet mode
            return;
        }
        this.cancel();
        this._triggerQuickSuggest.cancelAndSet(() => {
            if (this._triggerState !== undefined) {
                return;
            }
            if (!LineContext.shouldAutoTrigger(this._editor)) {
                return;
            }
            if (!this._editor.hasModel() || !this._editor.hasWidgetFocus()) {
                return;
            }
            const model = this._editor.getModel();
            const pos = this._editor.getPosition();
            // validate enabled now
            const config = this._editor.getOption(94 /* EditorOption.quickSuggestions */);
            if (QuickSuggestionsOptions.isAllOff(config)) {
                return;
            }
            if (!QuickSuggestionsOptions.isAllOn(config)) {
                // Check the type of the token that triggered this
                model.tokenization.tokenizeIfCheap(pos.lineNumber);
                const lineTokens = model.tokenization.getLineTokens(pos.lineNumber);
                const tokenType = lineTokens.getStandardTokenType(lineTokens.findTokenIndexAtOffset(Math.max(pos.column - 1 - 1, 0)));
                if (QuickSuggestionsOptions.valueFor(config, tokenType) !== 'on') {
                    return;
                }
            }
            if (!canShowQuickSuggest(this._editor, this._contextKeyService, this._configurationService)) {
                // do not trigger quick suggestions if inline suggestions are shown
                return;
            }
            if (!this._languageFeaturesService.completionProvider.has(model)) {
                return;
            }
            // we made it till here -> trigger now
            this.trigger({ auto: true });
        }, this._editor.getOption(95 /* EditorOption.quickSuggestionsDelay */));
    }
    _refilterCompletionItems() {
        assertType(this._editor.hasModel());
        assertType(this._triggerState !== undefined);
        const model = this._editor.getModel();
        const position = this._editor.getPosition();
        const ctx = new LineContext(model, position, { ...this._triggerState, refilter: true });
        this._onNewContext(ctx);
    }
    trigger(options) {
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        const ctx = new LineContext(model, this._editor.getPosition(), options);
        // Cancel previous requests, change state & update UI
        this.cancel(options.retrigger);
        this._triggerState = options;
        this._onDidTrigger.fire({
            auto: options.auto,
            shy: options.shy ?? false,
            position: this._editor.getPosition(),
        });
        // Capture context when request was sent
        this._context = ctx;
        // Build context for request
        let suggestCtx = {
            triggerKind: options.triggerKind ?? 0 /* CompletionTriggerKind.Invoke */,
        };
        if (options.triggerCharacter) {
            suggestCtx = {
                triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */,
                triggerCharacter: options.triggerCharacter,
            };
        }
        this._requestToken = new CancellationTokenSource();
        // kind filter and snippet sort rules
        const snippetSuggestions = this._editor.getOption(117 /* EditorOption.snippetSuggestions */);
        let snippetSortOrder = 1 /* SnippetSortOrder.Inline */;
        switch (snippetSuggestions) {
            case 'top':
                snippetSortOrder = 0 /* SnippetSortOrder.Top */;
                break;
            // 	↓ that's the default anyways...
            // case 'inline':
            // 	snippetSortOrder = SnippetSortOrder.Inline;
            // 	break;
            case 'bottom':
                snippetSortOrder = 2 /* SnippetSortOrder.Bottom */;
                break;
        }
        const { itemKind: itemKindFilter, showDeprecated } = SuggestModel_1.createSuggestFilter(this._editor);
        const completionOptions = new CompletionOptions(snippetSortOrder, options.completionOptions?.kindFilter ?? itemKindFilter, options.completionOptions?.providerFilter, options.completionOptions?.providerItemsToReuse, showDeprecated);
        const wordDistance = WordDistance.create(this._editorWorkerService, this._editor);
        const completions = provideSuggestionItems(this._languageFeaturesService.completionProvider, model, this._editor.getPosition(), completionOptions, suggestCtx, this._requestToken.token);
        Promise.all([completions, wordDistance])
            .then(async ([completions, wordDistance]) => {
            this._requestToken?.dispose();
            if (!this._editor.hasModel()) {
                completions.disposable.dispose();
                return;
            }
            let clipboardText = options?.clipboardText;
            if (!clipboardText && completions.needsClipboard) {
                clipboardText = await this._clipboardService.readText();
            }
            if (this._triggerState === undefined) {
                completions.disposable.dispose();
                return;
            }
            const model = this._editor.getModel();
            // const items = completions.items;
            // if (existing) {
            // 	const cmpFn = getSuggestionComparator(snippetSortOrder);
            // 	items = items.concat(existing.items).sort(cmpFn);
            // }
            const ctx = new LineContext(model, this._editor.getPosition(), options);
            const fuzzySearchOptions = {
                ...FuzzyScoreOptions.default,
                firstMatchCanBeWeak: !this._editor.getOption(123 /* EditorOption.suggest */).matchOnWordStartOnly,
            };
            this._completionModel = new CompletionModel(completions.items, this._context.column, {
                leadingLineContent: ctx.leadingLineContent,
                characterCountDelta: ctx.column - this._context.column,
            }, wordDistance, this._editor.getOption(123 /* EditorOption.suggest */), this._editor.getOption(117 /* EditorOption.snippetSuggestions */), fuzzySearchOptions, clipboardText);
            // store containers so that they can be disposed later
            this._completionDisposables.add(completions.disposable);
            this._onNewContext(ctx);
            // finally report telemetry about durations
            this._reportDurationsTelemetry(completions.durations);
            // report invalid completions by source
            if (!this._envService.isBuilt || this._envService.isExtensionDevelopment) {
                for (const item of completions.items) {
                    if (item.isInvalid) {
                        this._logService.warn(`[suggest] did IGNORE invalid completion item from ${item.provider._debugDisplayName}`, item.completion);
                    }
                }
            }
        })
            .catch(onUnexpectedError);
    }
    /**
     * Report durations telemetry with a 1% sampling rate.
     * The telemetry is reported only if a random number between 0 and 100 is less than or equal to 1.
     */
    _reportDurationsTelemetry(durations) {
        if (Math.random() > 0.0001) {
            // 0.01%
            return;
        }
        setTimeout(() => {
            this._telemetryService.publicLog2('suggest.durations.json', { data: JSON.stringify(durations) });
            this._logService.debug('suggest.durations.json', durations);
        });
    }
    static createSuggestFilter(editor) {
        // kind filter and snippet sort rules
        const result = new Set();
        // snippet setting
        const snippetSuggestions = editor.getOption(117 /* EditorOption.snippetSuggestions */);
        if (snippetSuggestions === 'none') {
            result.add(27 /* CompletionItemKind.Snippet */);
        }
        // type setting
        const suggestOptions = editor.getOption(123 /* EditorOption.suggest */);
        if (!suggestOptions.showMethods) {
            result.add(0 /* CompletionItemKind.Method */);
        }
        if (!suggestOptions.showFunctions) {
            result.add(1 /* CompletionItemKind.Function */);
        }
        if (!suggestOptions.showConstructors) {
            result.add(2 /* CompletionItemKind.Constructor */);
        }
        if (!suggestOptions.showFields) {
            result.add(3 /* CompletionItemKind.Field */);
        }
        if (!suggestOptions.showVariables) {
            result.add(4 /* CompletionItemKind.Variable */);
        }
        if (!suggestOptions.showClasses) {
            result.add(5 /* CompletionItemKind.Class */);
        }
        if (!suggestOptions.showStructs) {
            result.add(6 /* CompletionItemKind.Struct */);
        }
        if (!suggestOptions.showInterfaces) {
            result.add(7 /* CompletionItemKind.Interface */);
        }
        if (!suggestOptions.showModules) {
            result.add(8 /* CompletionItemKind.Module */);
        }
        if (!suggestOptions.showProperties) {
            result.add(9 /* CompletionItemKind.Property */);
        }
        if (!suggestOptions.showEvents) {
            result.add(10 /* CompletionItemKind.Event */);
        }
        if (!suggestOptions.showOperators) {
            result.add(11 /* CompletionItemKind.Operator */);
        }
        if (!suggestOptions.showUnits) {
            result.add(12 /* CompletionItemKind.Unit */);
        }
        if (!suggestOptions.showValues) {
            result.add(13 /* CompletionItemKind.Value */);
        }
        if (!suggestOptions.showConstants) {
            result.add(14 /* CompletionItemKind.Constant */);
        }
        if (!suggestOptions.showEnums) {
            result.add(15 /* CompletionItemKind.Enum */);
        }
        if (!suggestOptions.showEnumMembers) {
            result.add(16 /* CompletionItemKind.EnumMember */);
        }
        if (!suggestOptions.showKeywords) {
            result.add(17 /* CompletionItemKind.Keyword */);
        }
        if (!suggestOptions.showWords) {
            result.add(18 /* CompletionItemKind.Text */);
        }
        if (!suggestOptions.showColors) {
            result.add(19 /* CompletionItemKind.Color */);
        }
        if (!suggestOptions.showFiles) {
            result.add(20 /* CompletionItemKind.File */);
        }
        if (!suggestOptions.showReferences) {
            result.add(21 /* CompletionItemKind.Reference */);
        }
        if (!suggestOptions.showColors) {
            result.add(22 /* CompletionItemKind.Customcolor */);
        }
        if (!suggestOptions.showFolders) {
            result.add(23 /* CompletionItemKind.Folder */);
        }
        if (!suggestOptions.showTypeParameters) {
            result.add(24 /* CompletionItemKind.TypeParameter */);
        }
        if (!suggestOptions.showSnippets) {
            result.add(27 /* CompletionItemKind.Snippet */);
        }
        if (!suggestOptions.showUsers) {
            result.add(25 /* CompletionItemKind.User */);
        }
        if (!suggestOptions.showIssues) {
            result.add(26 /* CompletionItemKind.Issue */);
        }
        return { itemKind: result, showDeprecated: suggestOptions.showDeprecated };
    }
    _onNewContext(ctx) {
        if (!this._context) {
            // happens when 24x7 IntelliSense is enabled and still in its delay
            return;
        }
        if (ctx.lineNumber !== this._context.lineNumber) {
            // e.g. happens when pressing Enter while IntelliSense is computed
            this.cancel();
            return;
        }
        if (getLeadingWhitespace(ctx.leadingLineContent) !==
            getLeadingWhitespace(this._context.leadingLineContent)) {
            // cancel IntelliSense when line start changes
            // happens when the current word gets outdented
            this.cancel();
            return;
        }
        if (ctx.column < this._context.column) {
            // typed -> moved cursor LEFT -> retrigger if still on a word
            if (ctx.leadingWord.word) {
                this.trigger({ auto: this._context.triggerOptions.auto, retrigger: true });
            }
            else {
                this.cancel();
            }
            return;
        }
        if (!this._completionModel) {
            // happens when IntelliSense is not yet computed
            return;
        }
        if (ctx.leadingWord.word.length !== 0 &&
            ctx.leadingWord.startColumn > this._context.leadingWord.startColumn) {
            // started a new word while IntelliSense shows -> retrigger but reuse all items that we currently have
            const shouldAutoTrigger = LineContext.shouldAutoTrigger(this._editor);
            if (shouldAutoTrigger && this._context) {
                // shouldAutoTrigger forces tokenization, which can cause pending cursor change events to be emitted, which can cause
                // suggestions to be cancelled, which causes `this._context` to be undefined
                const map = this._completionModel.getItemsByProvider();
                this.trigger({
                    auto: this._context.triggerOptions.auto,
                    retrigger: true,
                    clipboardText: this._completionModel.clipboardText,
                    completionOptions: { providerItemsToReuse: map },
                });
            }
            return;
        }
        if (ctx.column > this._context.column &&
            this._completionModel.getIncompleteProvider().size > 0 &&
            ctx.leadingWord.word.length !== 0) {
            // typed -> moved cursor RIGHT & incomple model & still on a word -> retrigger
            const providerItemsToReuse = new Map();
            const providerFilter = new Set();
            for (const [provider, items] of this._completionModel.getItemsByProvider()) {
                if (items.length > 0 && items[0].container.incomplete) {
                    providerFilter.add(provider);
                }
                else {
                    providerItemsToReuse.set(provider, items);
                }
            }
            this.trigger({
                auto: this._context.triggerOptions.auto,
                triggerKind: 2 /* CompletionTriggerKind.TriggerForIncompleteCompletions */,
                retrigger: true,
                clipboardText: this._completionModel.clipboardText,
                completionOptions: { providerFilter, providerItemsToReuse },
            });
        }
        else {
            // typed -> moved cursor RIGHT -> update UI
            const oldLineContext = this._completionModel.lineContext;
            let isFrozen = false;
            this._completionModel.lineContext = {
                leadingLineContent: ctx.leadingLineContent,
                characterCountDelta: ctx.column - this._context.column,
            };
            if (this._completionModel.items.length === 0) {
                const shouldAutoTrigger = LineContext.shouldAutoTrigger(this._editor);
                if (!this._context) {
                    // shouldAutoTrigger forces tokenization, which can cause pending cursor change events to be emitted, which can cause
                    // suggestions to be cancelled, which causes `this._context` to be undefined
                    this.cancel();
                    return;
                }
                if (shouldAutoTrigger &&
                    this._context.leadingWord.endColumn < ctx.leadingWord.startColumn) {
                    // retrigger when heading into a new word
                    this.trigger({ auto: this._context.triggerOptions.auto, retrigger: true });
                    return;
                }
                if (!this._context.triggerOptions.auto) {
                    // freeze when IntelliSense was manually requested
                    this._completionModel.lineContext = oldLineContext;
                    isFrozen = this._completionModel.items.length > 0;
                    if (isFrozen && ctx.leadingWord.word.length === 0) {
                        // there were results before but now there aren't
                        // and also we are not on a word anymore -> cancel
                        this.cancel();
                        return;
                    }
                }
                else {
                    // nothing left
                    this.cancel();
                    return;
                }
            }
            this._onDidSuggest.fire({
                completionModel: this._completionModel,
                triggerOptions: ctx.triggerOptions,
                isFrozen,
            });
        }
    }
};
SuggestModel = SuggestModel_1 = __decorate([
    __param(1, IEditorWorkerService),
    __param(2, IClipboardService),
    __param(3, ITelemetryService),
    __param(4, ILogService),
    __param(5, IContextKeyService),
    __param(6, IConfigurationService),
    __param(7, ILanguageFeaturesService),
    __param(8, IEnvironmentService)
], SuggestModel);
export { SuggestModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvc3VnZ2VzdE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixlQUFlLEVBQ2YsY0FBYyxHQUNkLE1BQU0sb0NBQW9DLENBQUE7QUFLM0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBUTdELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFz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QUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLEdBQUcsc0NBQTZCLENBQUE7UUFDeEMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDL0IsTUFBTSxDQUFDLEdBQUcsa0NBQXlCLENBQUE7UUFDcEMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEMsTUFBTSxDQUFDLEdBQUcsbUNBQTBCLENBQUE7UUFDckMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLEdBQUcsc0NBQTZCLENBQUE7UUFDeEMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDL0IsTUFBTSxDQUFDLEdBQUcsa0NBQXlCLENBQUE7UUFDcEMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDckMsTUFBTSxDQUFDLEdBQUcsd0NBQStCLENBQUE7UUFDMUMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbEMsTUFBTSxDQUFDLEdBQUcscUNBQTRCLENBQUE7UUFDdkMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDL0IsTUFBTSxDQUFDLEdBQUcsa0NBQXlCLENBQUE7UUFDcEMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEMsTUFBTSxDQUFDLEdBQUcsbUNBQTBCLENBQUE7UUFDckMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDL0IsTUFBTSxDQUFDLEdBQUcsa0NBQXlCLENBQUE7UUFDcEMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDcEMsTUFBTSxDQUFDLEdBQUcsdUNBQThC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
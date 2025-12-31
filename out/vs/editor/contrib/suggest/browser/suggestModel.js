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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3N1Z2dlc3RNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLGNBQWMsR0FDZCxNQUFNLG9DQUFvQyxDQUFBO0FBSzNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVE3RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDaEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN0RCxPQUFPLEVBR04saUJBQWlCLEVBQ2pCLHdCQUF3QixFQUN4QixzQkFBc0IsRUFDdEIsdUJBQXVCLEdBRXZCLE1BQU0sY0FBYyxDQUFBO0FBRXJCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUN2SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQTZCNUYsTUFBTSxPQUFPLFdBQVc7SUFDdkIsTUFBTSxDQUFDLGlCQUFpQixDQUFDLE1BQW1CO1FBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN4QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDL0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2hDLEtBQUssQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUVsRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDekMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsSUFDQyxJQUFJLENBQUMsU0FBUyxLQUFLLEdBQUcsQ0FBQyxNQUFNO1lBQzdCLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsbURBQW1ELEVBQ3RGLENBQUM7WUFDRixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQy9CLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQVFELFlBQVksS0FBaUIsRUFBRSxRQUFrQixFQUFFLGNBQXFDO1FBQ3ZGLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLO2FBQzdCLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO2FBQ25DLE1BQU0sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDckMsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBQzdCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFBO0lBQ3JDLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBTixJQUFrQixLQUlqQjtBQUpELFdBQWtCLEtBQUs7SUFDdEIsaUNBQVEsQ0FBQTtJQUNSLHFDQUFVLENBQUE7SUFDVixpQ0FBUSxDQUFBO0FBQ1QsQ0FBQyxFQUppQixLQUFLLEtBQUwsS0FBSyxRQUl0QjtBQUVELFNBQVMsbUJBQW1CLENBQzNCLE1BQW1CLEVBQ25CLGlCQUFxQyxFQUNyQyxvQkFBMkM7SUFFM0MsSUFDQyxDQUFDLE9BQU8sQ0FDUCxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQywyQkFBMkIsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsQ0FDN0YsRUFDQSxDQUFDO1FBQ0YsMENBQTBDO1FBQzFDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELE1BQU0sbUJBQW1CLEdBQUcsaUJBQWlCLENBQUMsa0JBQWtCLENBQy9ELDJCQUEyQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FDbkQsQ0FBQTtJQUNELElBQUksbUJBQW1CLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDdkMsT0FBTyxDQUFDLG1CQUFtQixDQUFBO0lBQzVCLENBQUM7SUFDRCxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMscUNBQTRCLENBQUMsbUJBQW1CLENBQUE7QUFDekUsQ0FBQztBQUVELFNBQVMsaUNBQWlDLENBQ3pDLE1BQW1CLEVBQ25CLGlCQUFxQyxFQUNyQyxvQkFBMkM7SUFFM0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMvRSwwQ0FBMEM7UUFDMUMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsTUFBTSxtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FDL0QsMkJBQTJCLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUNuRCxDQUFBO0lBQ0QsSUFBSSxtQkFBbUIsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUN2QyxPQUFPLENBQUMsbUJBQW1CLENBQUE7SUFDNUIsQ0FBQztJQUNELE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxxQ0FBNEIsQ0FBQyxtQkFBbUIsQ0FBQTtBQUN6RSxDQUFDO0FBRU0sSUFBTSxZQUFZLG9CQUFsQixNQUFNLFlBQVk7SUFvQnhCLFlBQ2tCLE9BQW9CLEVBQ2Ysb0JBQTJELEVBQzlELGlCQUFxRCxFQUNyRCxpQkFBcUQsRUFDM0QsV0FBeUMsRUFDbEMsa0JBQXVELEVBQ3BELHFCQUE2RCxFQUMxRCx3QkFBbUUsRUFDeEUsV0FBaUQ7UUFSckQsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNFLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7UUFDN0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNwQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQzFDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ2pCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDbkMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUN6Qyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQ3ZELGdCQUFXLEdBQVgsV0FBVyxDQUFxQjtRQTVCdEQsZUFBVSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDbEMsOEJBQXlCLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNqRCx5QkFBb0IsR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFBO1FBRWxELGtCQUFhLEdBQXNDLFNBQVMsQ0FBQTtRQU1uRCwyQkFBc0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzlDLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQWdCLENBQUE7UUFDMUMsa0JBQWEsR0FBRyxJQUFJLE9BQU8sRUFBaUIsQ0FBQTtRQUM1QyxrQkFBYSxHQUFHLElBQUksT0FBTyxFQUFpQixDQUFBO1FBRXBELGdCQUFXLEdBQXdCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBQzFELGlCQUFZLEdBQXlCLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFBO1FBQzdELGlCQUFZLEdBQXlCLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFBO1FBYXJFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxJQUFJLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpGLDRCQUE0QjtRQUM1QixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7WUFDbEMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7WUFDL0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2QsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRTtZQUMxQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtZQUMvQixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFO1lBQzFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1FBQ2hDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FDbEIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDakUsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7WUFDL0IsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDbkMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksaUJBQWlCLEdBQUcsS0FBSyxDQUFBO1FBQzdCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtZQUN2QyxpQkFBaUIsR0FBRyxJQUFJLENBQUE7UUFDekIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRTtZQUNyQyxpQkFBaUIsR0FBRyxLQUFLLENBQUE7WUFDekIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDekIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDN0MsbUVBQW1FO1lBQ25FLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3hCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ3pDLHNFQUFzRTtZQUN0RSw4QkFBOEI7WUFDOUIsNkRBQTZEO1lBQzdELElBQUksQ0FBQyxpQkFBaUIsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUM1RCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtZQUNoQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO0lBQ2hDLENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3ZDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUE7UUFDL0YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN6QixJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDckMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ2QsQ0FBQztJQUVPLHdCQUF3QjtRQUMvQixJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFdEMsSUFDQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsZ0NBQXVCO1lBQzdDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUU7WUFDeEIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsbURBQXlDLEVBQy9ELENBQUM7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxHQUFHLEVBQXVDLENBQUE7UUFDakYsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsd0JBQXdCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUN6RSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUN2QixFQUFFLENBQUM7WUFDSCxLQUFLLE1BQU0sRUFBRSxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxHQUFHLEdBQUcsMEJBQTBCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUM1QyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ1YsR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7b0JBQ2YsTUFBTSxjQUFjLEdBQUcsd0JBQXdCLEVBQUUsQ0FBQTtvQkFDakQsSUFBSSxjQUFjLEVBQUUsQ0FBQzt3QkFDcEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtvQkFDeEIsQ0FBQztvQkFDRCwwQkFBMEIsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUN4QyxDQUFDO2dCQUNELEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDakIsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLHFCQUFxQixHQUFHLENBQUMsSUFBYSxFQUFFLEVBQUU7WUFDL0MsSUFDQyxDQUFDLGlDQUFpQyxDQUNqQyxJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsSUFBSSxDQUFDLHFCQUFxQixDQUMxQixFQUNBLENBQUM7Z0JBQ0YsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDakQsNEVBQTRFO2dCQUM1RSxPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWCwwQ0FBMEM7Z0JBQzFDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFHLENBQUE7Z0JBQzVDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFHLENBQUE7Z0JBQ3RDLElBQUksR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDaEYsQ0FBQztZQUVELElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQTtZQUNqQixJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN0RCxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN2RCxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUN4QyxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDeEMsQ0FBQztZQUVELE1BQU0sUUFBUSxHQUFHLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN6RCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLHFEQUFxRDtnQkFDckQsOENBQThDO2dCQUM5QyxNQUFNLG9CQUFvQixHQUFHLElBQUksR0FBRyxFQUE0QyxDQUFBO2dCQUNoRixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO29CQUMzQixLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQzt3QkFDNUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQzs0QkFDN0Isb0JBQW9CLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTt3QkFDMUMsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQztvQkFDWixJQUFJLEVBQUUsSUFBSTtvQkFDVixXQUFXLGdEQUF3QztvQkFDbkQsZ0JBQWdCLEVBQUUsUUFBUTtvQkFDMUIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7b0JBQ3pDLGFBQWEsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsYUFBYTtvQkFDbkQsaUJBQWlCLEVBQUUsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFO2lCQUNyRSxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7UUFDakYsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQy9ELENBQUE7SUFDRixDQUFDO0lBRUQsdUNBQXVDO0lBRXZDLElBQUksS0FBSztRQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekIsMEJBQWlCO1FBQ2xCLENBQUM7YUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQyw0QkFBbUI7UUFDcEIsQ0FBQzthQUFNLENBQUM7WUFDUCwwQkFBaUI7UUFDbEIsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsWUFBcUIsS0FBSztRQUNoQyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ2xDLElBQUksQ0FBQyxhQUFhLEVBQUUsTUFBTSxFQUFFLENBQUE7WUFDNUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUE7WUFDOUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUE7WUFDOUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtZQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQTtZQUN6QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3BDLENBQUM7SUFFTywyQkFBMkI7UUFDbEMsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3RDLElBQ0MsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRTtnQkFDeEIsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsRUFDN0UsQ0FBQztnQkFDRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDZCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUNqRSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxlQUFlLENBQUMsQ0FBK0I7UUFDdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUM5QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtRQUM1QyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUVwRCxJQUNDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUU7WUFDdEIsQ0FBQyxDQUFDLENBQUMsTUFBTSxzQ0FBOEIsSUFBSSxDQUFDLENBQUMsTUFBTSx3Q0FBZ0MsQ0FBQztZQUNwRixDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssVUFBVSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssWUFBWSxDQUFDLEVBQ3JELENBQUM7WUFDRiwwQ0FBMEM7WUFDMUMsOEdBQThHO1lBQzlHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNiLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLFNBQVMsSUFBSSxDQUFDLENBQUMsTUFBTSxzQ0FBOEIsRUFBRSxDQUFDO1lBQ2hGLElBQ0MsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7Z0JBQ25ELGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQ25GLENBQUM7Z0JBQ0YsK0RBQStEO2dCQUMvRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtZQUM5QixDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxTQUFTLElBQUksQ0FBQyxDQUFDLE1BQU0sd0NBQWdDLEVBQUUsQ0FBQztZQUN6RixvRUFBb0U7WUFDcEUsNkRBQTZEO1lBQzdELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLDRDQUE0QztRQUM1QyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDOUIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUNoQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLHNCQUFzQjtRQUM3QixJQUFJLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsd0NBQStCLENBQUMsRUFBRSxDQUFDO1lBQzdGLGNBQWM7WUFDZCxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQ0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGdDQUFzQixDQUFDLCtCQUErQjtZQUM1RSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFdBQVcsRUFBRSxFQUNsRCxDQUFDO1lBQ0YsMkNBQTJDO1lBQzNDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBRWIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDM0MsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN0QyxPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ2xELE9BQU07WUFDUCxDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7Z0JBQ2hFLE9BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNyQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ3RDLHVCQUF1QjtZQUN2QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsd0NBQStCLENBQUE7WUFDcEUsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLGtEQUFrRDtnQkFDbEQsS0FBSyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ25FLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxvQkFBb0IsQ0FDaEQsVUFBVSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQ2xFLENBQUE7Z0JBQ0QsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUNsRSxPQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7Z0JBQzdGLG1FQUFtRTtnQkFDbkUsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNsRSxPQUFNO1lBQ1AsQ0FBQztZQUVELHNDQUFzQztZQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDN0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyw2Q0FBb0MsQ0FBQyxDQUFBO0lBQy9ELENBQUM7SUFFTyx3QkFBd0I7UUFDL0IsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNuQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsS0FBSyxTQUFTLENBQUMsQ0FBQTtRQUU1QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3JDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDM0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN2RixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxPQUFPLENBQUMsT0FBOEI7UUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUM5QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDckMsTUFBTSxHQUFHLEdBQUcsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFdkUscURBQXFEO1FBQ3JELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzlCLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFBO1FBQzVCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDO1lBQ3ZCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtZQUNsQixHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsSUFBSSxLQUFLO1lBQ3pCLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRTtTQUNwQyxDQUFDLENBQUE7UUFFRix3Q0FBd0M7UUFDeEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUE7UUFFbkIsNEJBQTRCO1FBQzVCLElBQUksVUFBVSxHQUFzQjtZQUNuQyxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVcsd0NBQWdDO1NBQ2hFLENBQUE7UUFDRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzlCLFVBQVUsR0FBRztnQkFDWixXQUFXLGdEQUF3QztnQkFDbkQsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQjthQUMxQyxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO1FBRWxELHFDQUFxQztRQUNyQyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUywyQ0FBaUMsQ0FBQTtRQUNsRixJQUFJLGdCQUFnQixrQ0FBMEIsQ0FBQTtRQUM5QyxRQUFRLGtCQUFrQixFQUFFLENBQUM7WUFDNUIsS0FBSyxLQUFLO2dCQUNULGdCQUFnQiwrQkFBdUIsQ0FBQTtnQkFDdkMsTUFBSztZQUNOLG1DQUFtQztZQUNuQyxpQkFBaUI7WUFDakIsK0NBQStDO1lBQy9DLFVBQVU7WUFDVixLQUFLLFFBQVE7Z0JBQ1osZ0JBQWdCLGtDQUEwQixDQUFBO2dCQUMxQyxNQUFLO1FBQ1AsQ0FBQztRQUVELE1BQU0sRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxHQUFHLGNBQVksQ0FBQyxtQkFBbUIsQ0FDcEYsSUFBSSxDQUFDLE9BQU8sQ0FDWixDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUM5QyxnQkFBZ0IsRUFDaEIsT0FBTyxDQUFDLGlCQUFpQixFQUFFLFVBQVUsSUFBSSxjQUFjLEVBQ3ZELE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLEVBQ3pDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxvQkFBb0IsRUFDL0MsY0FBYyxDQUNkLENBQUE7UUFDRCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFakYsTUFBTSxXQUFXLEdBQUcsc0JBQXNCLENBQ3pDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxrQkFBa0IsRUFDaEQsS0FBSyxFQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQzFCLGlCQUFpQixFQUNqQixVQUFVLEVBQ1YsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQ3hCLENBQUE7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQ3RDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBRTtZQUMzQyxJQUFJLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxDQUFBO1lBRTdCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQzlCLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ2hDLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxhQUFhLEdBQUcsT0FBTyxFQUFFLGFBQWEsQ0FBQTtZQUMxQyxJQUFJLENBQUMsYUFBYSxJQUFJLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDbEQsYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ3hELENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3RDLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ2hDLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNyQyxtQ0FBbUM7WUFFbkMsa0JBQWtCO1lBQ2xCLDREQUE0RDtZQUM1RCxxREFBcUQ7WUFDckQsSUFBSTtZQUVKLE1BQU0sR0FBRyxHQUFHLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZFLE1BQU0sa0JBQWtCLEdBQUc7Z0JBQzFCLEdBQUcsaUJBQWlCLENBQUMsT0FBTztnQkFDNUIsbUJBQW1CLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsZ0NBQXNCLENBQUMsb0JBQW9CO2FBQ3ZGLENBQUE7WUFDRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxlQUFlLENBQzFDLFdBQVcsQ0FBQyxLQUFLLEVBQ2pCLElBQUksQ0FBQyxRQUFTLENBQUMsTUFBTSxFQUNyQjtnQkFDQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsa0JBQWtCO2dCQUMxQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFTLENBQUMsTUFBTTthQUN2RCxFQUNELFlBQVksRUFDWixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsZ0NBQXNCLEVBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUywyQ0FBaUMsRUFDdkQsa0JBQWtCLEVBQ2xCLGFBQWEsQ0FDYixDQUFBO1lBRUQsc0RBQXNEO1lBQ3RELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBRXZELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFdkIsMkNBQTJDO1lBQzNDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFckQsdUNBQXVDO1lBQ3ZDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQzFFLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUN0QyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQzt3QkFDcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQ3BCLHFEQUFxRCxJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLEVBQ3RGLElBQUksQ0FBQyxVQUFVLENBQ2YsQ0FBQTtvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVEOzs7T0FHRztJQUNLLHlCQUF5QixDQUFDLFNBQThCO1FBQy9ELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO1lBQzVCLFFBQVE7WUFDUixPQUFNO1FBQ1AsQ0FBQztRQUVELFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFXZixJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUNoQyx3QkFBd0IsRUFDeEIsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUNuQyxDQUFBO1lBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDNUQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQW1CO1FBSTdDLHFDQUFxQztRQUNyQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQTtRQUU1QyxrQkFBa0I7UUFDbEIsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsU0FBUywyQ0FBaUMsQ0FBQTtRQUM1RSxJQUFJLGtCQUFrQixLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxHQUFHLHFDQUE0QixDQUFBO1FBQ3ZDLENBQUM7UUFFRCxlQUFlO1FBQ2YsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsZ0NBQXNCLENBQUE7UUFDN0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNqQyxNQUFNLENBQUMsR0FBRyxtQ0FBMkIsQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsR0FBRyxxQ0FBNkIsQ0FBQTtRQUN4QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxHQUFHLHdDQUFnQyxDQUFBO1FBQzNDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxHQUFHLGtDQUEwQixDQUFBO1FBQ3JDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxHQUFHLHFDQUE2QixDQUFBO1FBQ3hDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxHQUFHLGtDQUEwQixDQUFBO1FBQ3JDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxHQUFHLG1DQUEyQixDQUFBO1FBQ3RDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxHQUFHLHNDQUE4QixDQUFBO1FBQ3pDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxHQUFHLG1DQUEyQixDQUFBO1FBQ3RDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxHQUFHLHFDQUE2QixDQUFBO1FBQ3hDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxHQUFHLG1DQUEwQixDQUFBO1FBQ3JDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxHQUFHLHNDQUE2QixDQUFBO1FBQ3hDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxHQUFHLGtDQUF5QixDQUFBO1FBQ3BDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxHQUFHLG1DQUEwQixDQUFBO1FBQ3JDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxHQUFHLHNDQUE2QixDQUFBO1FBQ3hDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxHQUFHLGtDQUF5QixDQUFBO1FBQ3BDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxHQUFHLHdDQUErQixDQUFBO1FBQzFDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxHQUFHLHFDQUE0QixDQUFBO1FBQ3ZDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxHQUFHLGtDQUF5QixDQUFBO1FBQ3BDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxHQUFHLG1DQUEwQixDQUFBO1FBQ3JDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxHQUFHLGtDQUF5QixDQUFBO1FBQ3BDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxHQUFHLHVDQUE4QixDQUFBO1FBQ3pDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxHQUFHLHlDQUFnQyxDQUFBO1FBQzNDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixDQUFBO1FBQ3RDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDeEMsTUFBTSxDQUFDLEdBQUcsMkNBQWtDLENBQUE7UUFDN0MsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbEMsTUFBTSxDQUFDLEdBQUcscUNBQTRCLENBQUE7UUFDdkMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDL0IsTUFBTSxDQUFDLEdBQUcsa0NBQXlCLENBQUE7UUFDcEMsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEMsTUFBTSxDQUFDLEdBQUcsbUNBQTBCLENBQUE7UUFDckMsQ0FBQztRQUVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsY0FBYyxFQUFFLENBQUE7SUFDM0UsQ0FBQztJQUVPLGFBQWEsQ0FBQyxHQUFnQjtRQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLG1FQUFtRTtZQUNuRSxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksR0FBRyxDQUFDLFVBQVUsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pELGtFQUFrRTtZQUNsRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDYixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQ0Msb0JBQW9CLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDO1lBQzVDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsRUFDckQsQ0FBQztZQUNGLDhDQUE4QztZQUM5QywrQ0FBK0M7WUFDL0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ2IsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2Qyw2REFBNkQ7WUFDN0QsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUMzRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ2QsQ0FBQztZQUNELE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVCLGdEQUFnRDtZQUNoRCxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQ0MsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDakMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUNsRSxDQUFDO1lBQ0Ysc0dBQXNHO1lBQ3RHLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNyRSxJQUFJLGlCQUFpQixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDeEMscUhBQXFIO2dCQUNySCw0RUFBNEU7Z0JBQzVFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO2dCQUN0RCxJQUFJLENBQUMsT0FBTyxDQUFDO29CQUNaLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJO29CQUN2QyxTQUFTLEVBQUUsSUFBSTtvQkFDZixhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWE7b0JBQ2xELGlCQUFpQixFQUFFLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO2lCQUNoRCxDQUFDLENBQUE7WUFDSCxDQUFDO1lBQ0QsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUNDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNO1lBQ2pDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDO1lBQ3RELEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQ2hDLENBQUM7WUFDRiw4RUFBOEU7WUFFOUUsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBNEMsQ0FBQTtZQUNoRixNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQTtZQUN4RCxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQztnQkFDNUUsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUN2RCxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUM3QixDQUFDO3FCQUFNLENBQUM7b0JBQ1Asb0JBQW9CLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDMUMsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUNaLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJO2dCQUN2QyxXQUFXLCtEQUF1RDtnQkFDbEUsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsYUFBYSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO2dCQUNsRCxpQkFBaUIsRUFBRSxFQUFFLGNBQWMsRUFBRSxvQkFBb0IsRUFBRTthQUMzRCxDQUFDLENBQUE7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNQLDJDQUEyQztZQUMzQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFBO1lBQ3hELElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQTtZQUVwQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxHQUFHO2dCQUNuQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsa0JBQWtCO2dCQUMxQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTthQUN0RCxDQUFBO1lBRUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNyRSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNwQixxSEFBcUg7b0JBQ3JILDRFQUE0RTtvQkFDNUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO29CQUNiLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxJQUNDLGlCQUFpQjtvQkFDakIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUNoRSxDQUFDO29CQUNGLHlDQUF5QztvQkFDekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7b0JBQzFFLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ3hDLGtEQUFrRDtvQkFDbEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsR0FBRyxjQUFjLENBQUE7b0JBQ2xELFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7b0JBRWpELElBQUksUUFBUSxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDbkQsaURBQWlEO3dCQUNqRCxrREFBa0Q7d0JBQ2xELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTt3QkFDYixPQUFNO29CQUNQLENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGVBQWU7b0JBQ2YsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO29CQUNiLE9BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztnQkFDdkIsZUFBZSxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7Z0JBQ3RDLGNBQWMsRUFBRSxHQUFHLENBQUMsY0FBYztnQkFDbEMsUUFBUTthQUNSLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTl1QlksWUFBWTtJQXNCdEIsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLG1CQUFtQixDQUFBO0dBN0JULFlBQVksQ0E4dUJ4QiJ9
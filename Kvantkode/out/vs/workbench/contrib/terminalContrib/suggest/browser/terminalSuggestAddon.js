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
var SuggestAddon_1;
import * as dom from '../../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { combinedDisposable, Disposable, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { sep } from '../../../../../base/common/path.js';
import { commonPrefixLength } from '../../../../../base/common/strings.js';
import { editorSuggestWidgetSelectedBackground } from '../../../../../editor/contrib/suggest/browser/suggestWidget.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { getListStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { activeContrastBorder } from '../../../../../platform/theme/common/colorRegistry.js';
import { terminalSuggestConfigSection, } from '../common/terminalSuggestConfiguration.js';
import { LineContext } from '../../../../services/suggest/browser/simpleCompletionModel.js';
import { SimpleSuggestWidget, } from '../../../../services/suggest/browser/simpleSuggestWidget.js';
import { ITerminalCompletionService } from './terminalCompletionService.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { ITerminalConfigurationService } from '../../../terminal/browser/terminal.js';
import { GOLDEN_LINE_HEIGHT_RATIO, MINIMUM_LINE_HEIGHT, } from '../../../../../editor/common/config/fontInfo.js';
import { TerminalCompletionModel } from './terminalCompletionModel.js';
import { TerminalCompletionItem, TerminalCompletionItemKind, } from './terminalCompletionItem.js';
import { IntervalTimer, TimeoutTimer } from '../../../../../base/common/async.js';
import { localize } from '../../../../../nls.js';
import { TerminalSuggestTelemetry } from './terminalSuggestTelemetry.js';
import { terminalSymbolAliasIcon, terminalSymbolArgumentIcon, terminalSymbolEnumMember, terminalSymbolFileIcon, terminalSymbolFlagIcon, terminalSymbolInlineSuggestionIcon, terminalSymbolMethodIcon, terminalSymbolOptionIcon, terminalSymbolFolderIcon, } from './terminalSymbolIcons.js';
let SuggestAddon = class SuggestAddon extends Disposable {
    static { SuggestAddon_1 = this; }
    static { this.lastAcceptedCompletionTimestamp = 0; }
    constructor(shellType, _capabilities, _terminalSuggestWidgetVisibleContextKey, _terminalCompletionService, _configurationService, _instantiationService, _extensionService, _terminalConfigurationService) {
        super();
        this._capabilities = _capabilities;
        this._terminalSuggestWidgetVisibleContextKey = _terminalSuggestWidgetVisibleContextKey;
        this._terminalCompletionService = _terminalCompletionService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._extensionService = _extensionService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._promptInputModelSubscriptions = this._register(new MutableDisposable());
        this._enableWidget = true;
        this._pathSeparator = sep;
        this._isFilteringDirectories = false;
        this._cursorIndexDelta = 0;
        this._requestedCompletionsIndex = 0;
        this._lastUserDataTimestamp = 0;
        this.isPasting = false;
        this._onBell = this._register(new Emitter());
        this.onBell = this._onBell.event;
        this._onAcceptedCompletion = this._register(new Emitter());
        this.onAcceptedCompletion = this._onAcceptedCompletion.event;
        this._onDidReceiveCompletions = this._register(new Emitter());
        this.onDidReceiveCompletions = this._onDidReceiveCompletions.event;
        this._onDidFontConfigurationChange = this._register(new Emitter());
        this.onDidFontConfigurationChange = this._onDidFontConfigurationChange.event;
        this._kindToIconMap = new Map([
            [TerminalCompletionItemKind.File, terminalSymbolFileIcon],
            [TerminalCompletionItemKind.Folder, terminalSymbolFolderIcon],
            [TerminalCompletionItemKind.Method, terminalSymbolMethodIcon],
            [TerminalCompletionItemKind.Alias, terminalSymbolAliasIcon],
            [TerminalCompletionItemKind.Argument, terminalSymbolArgumentIcon],
            [TerminalCompletionItemKind.Option, terminalSymbolOptionIcon],
            [TerminalCompletionItemKind.OptionValue, terminalSymbolEnumMember],
            [TerminalCompletionItemKind.Flag, terminalSymbolFlagIcon],
            [TerminalCompletionItemKind.InlineSuggestion, terminalSymbolInlineSuggestionIcon],
            [TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop, terminalSymbolInlineSuggestionIcon],
        ]);
        this._kindToKindLabelMap = new Map([
            [TerminalCompletionItemKind.File, localize('file', 'File')],
            [TerminalCompletionItemKind.Folder, localize('folder', 'Folder')],
            [TerminalCompletionItemKind.Method, localize('method', 'Method')],
            [TerminalCompletionItemKind.Alias, localize('alias', 'Alias')],
            [TerminalCompletionItemKind.Argument, localize('argument', 'Argument')],
            [TerminalCompletionItemKind.Option, localize('option', 'Option')],
            [TerminalCompletionItemKind.OptionValue, localize('optionValue', 'Option Value')],
            [TerminalCompletionItemKind.Flag, localize('flag', 'Flag')],
            [
                TerminalCompletionItemKind.InlineSuggestion,
                localize('inlineSuggestion', 'Inline Suggestion'),
            ],
            [
                TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop,
                localize('inlineSuggestionAlwaysOnTop', 'Inline Suggestion'),
            ],
        ]);
        this._inlineCompletion = {
            label: '',
            // Right arrow is used to accept the completion. This is a common keybinding in pwsh, zsh
            // and fish.
            inputData: '\x1b[C',
            replacementIndex: 0,
            replacementLength: 0,
            provider: 'core',
            detail: 'Inline suggestion',
            kind: TerminalCompletionItemKind.InlineSuggestion,
            kindLabel: 'Inline suggestion',
            icon: this._kindToIconMap.get(TerminalCompletionItemKind.InlineSuggestion),
        };
        this._inlineCompletionItem = new TerminalCompletionItem(this._inlineCompletion);
        this._shouldSyncWhenReady = false;
        // Initialize shell type, including a promise that completions can await for that resolves:
        // - immediately if shell type
        // - after a short delay if shell type gets set
        // - after a long delay if it doesn't get set
        this.shellType = shellType;
        if (this.shellType) {
            this._shellTypeInit = Promise.resolve();
        }
        else {
            const intervalTimer = this._register(new IntervalTimer());
            const timeoutTimer = this._register(new TimeoutTimer());
            this._shellTypeInit = new Promise((r) => {
                intervalTimer.cancelAndSet(() => {
                    if (this.shellType) {
                        r();
                    }
                }, 50);
                timeoutTimer.cancelAndSet(r, 5000);
            }).then(() => {
                this._store.delete(intervalTimer);
                this._store.delete(timeoutTimer);
            });
        }
        this._register(Event.runAndSubscribe(Event.any(this._capabilities.onDidAddCapabilityType, this._capabilities.onDidRemoveCapabilityType), () => {
            const commandDetection = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (commandDetection) {
                if (this._promptInputModel !== commandDetection.promptInputModel) {
                    this._promptInputModel = commandDetection.promptInputModel;
                    this._suggestTelemetry = this._register(this._instantiationService.createInstance(TerminalSuggestTelemetry, commandDetection, this._promptInputModel));
                    this._promptInputModelSubscriptions.value = combinedDisposable(this._promptInputModel.onDidChangeInput((e) => this._sync(e)), this._promptInputModel.onDidFinishInput(() => {
                        this.hideSuggestWidget(true);
                    }));
                    if (this._shouldSyncWhenReady) {
                        this._sync(this._promptInputModel);
                        this._shouldSyncWhenReady = false;
                    }
                }
            }
            else {
                this._promptInputModel = undefined;
            }
        }));
        this._register(this._terminalConfigurationService.onConfigChanged(() => (this._cachedFontInfo = undefined)));
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, (e) => {
            if (!e || e.affectsConfiguration("terminal.integrated.suggest.inlineSuggestion" /* TerminalSuggestSettingId.InlineSuggestion */)) {
                const value = this._configurationService.getValue(terminalSuggestConfigSection).inlineSuggestion;
                this._inlineCompletionItem.isInvalid = value === 'off';
                switch (value) {
                    case 'alwaysOnTopExceptExactMatch': {
                        this._inlineCompletion.kind = TerminalCompletionItemKind.InlineSuggestion;
                        break;
                    }
                    case 'alwaysOnTop':
                    default: {
                        this._inlineCompletion.kind = TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop;
                        break;
                    }
                }
                this._model?.forceRefilterAll();
            }
        }));
    }
    activate(xterm) {
        this._terminal = xterm;
        this._register(xterm.onKey(async (e) => {
            this._lastUserData = e.key;
            this._lastUserDataTimestamp = Date.now();
        }));
        this._register(xterm.onScroll(() => this.hideSuggestWidget(true)));
    }
    async _handleCompletionProviders(terminal, token, explicitlyInvoked) {
        // Nothing to handle if the terminal is not attached
        if (!terminal?.element || !this._enableWidget || !this._promptInputModel) {
            return;
        }
        // Only show the suggest widget if the terminal is focused
        if (!dom.isAncestorOfActiveElement(terminal.element)) {
            return;
        }
        // Require a shell type for completions. This will wait a short period after launching to
        // wait for the shell type to initialize. This prevents user requests sometimes getting lost
        // if requested shortly after the terminal is created.
        await this._shellTypeInit;
        if (!this.shellType) {
            return;
        }
        let doNotRequestExtensionCompletions = false;
        // Ensure that a key has been pressed since the last accepted completion in order to prevent
        // completions being requested again right after accepting a completion
        if (this._lastUserDataTimestamp < SuggestAddon_1.lastAcceptedCompletionTimestamp) {
            doNotRequestExtensionCompletions = true;
        }
        if (!doNotRequestExtensionCompletions) {
            await this._extensionService.activateByEvent('onTerminalCompletionsRequested');
        }
        this._currentPromptInputState = {
            value: this._promptInputModel.value,
            prefix: this._promptInputModel.prefix,
            suffix: this._promptInputModel.suffix,
            cursorIndex: this._promptInputModel.cursorIndex,
            ghostTextIndex: this._promptInputModel.ghostTextIndex,
        };
        this._requestedCompletionsIndex = this._currentPromptInputState.cursorIndex;
        const quickSuggestionsConfig = this._configurationService.getValue(terminalSuggestConfigSection).quickSuggestions;
        const allowFallbackCompletions = explicitlyInvoked || quickSuggestionsConfig.unknown === 'on';
        const providedCompletions = await this._terminalCompletionService.provideCompletions(this._currentPromptInputState.prefix, this._currentPromptInputState.cursorIndex, allowFallbackCompletions, this.shellType, this._capabilities, token, doNotRequestExtensionCompletions);
        if (token.isCancellationRequested) {
            return;
        }
        this._onDidReceiveCompletions.fire();
        this._cursorIndexDelta = this._promptInputModel.cursorIndex - this._requestedCompletionsIndex;
        this._leadingLineContent = this._promptInputModel.prefix.substring(0, this._requestedCompletionsIndex + this._cursorIndexDelta);
        const completions = providedCompletions?.flat() || [];
        if (!explicitlyInvoked && !completions.length) {
            this.hideSuggestWidget(true);
            return;
        }
        const firstChar = this._leadingLineContent.length === 0 ? '' : this._leadingLineContent[0];
        // This is a TabExpansion2 result
        if (this._leadingLineContent.includes(' ') || firstChar === '[') {
            this._leadingLineContent = this._promptInputModel.prefix;
        }
        let normalizedLeadingLineContent = this._leadingLineContent;
        // If there is a single directory in the completions:
        // - `\` and `/` are normalized such that either can be used
        // - Using `\` or `/` will request new completions. It's important that this only occurs
        //   when a directory is present, if not completions like git branches could be requested
        //   which leads to flickering
        this._isFilteringDirectories = completions.some((e) => e.kind === TerminalCompletionItemKind.Folder);
        if (this._isFilteringDirectories) {
            const firstDir = completions.find((e) => e.kind === TerminalCompletionItemKind.Folder);
            const textLabel = typeof firstDir?.label === 'string' ? firstDir.label : firstDir?.label.label;
            this._pathSeparator = textLabel?.match(/(?<sep>[\\\/])/)?.groups?.sep ?? sep;
            normalizedLeadingLineContent = normalizePathSeparator(normalizedLeadingLineContent, this._pathSeparator);
        }
        // Add any "ghost text" suggestion suggested by the shell. This aligns with behavior of the
        // editor and how it interacts with inline completions. This object is tracked and reused as
        // it may change on input.
        this._refreshInlineCompletion(completions);
        // Add any missing icons based on the completion item kind
        for (const completion of completions) {
            if (!completion.icon && completion.kind !== undefined) {
                completion.icon = this._kindToIconMap.get(completion.kind);
                completion.kindLabel = this._kindToKindLabelMap.get(completion.kind);
            }
        }
        const lineContext = new LineContext(normalizedLeadingLineContent, this._cursorIndexDelta);
        const model = new TerminalCompletionModel([
            ...completions.filter((c) => !!c.label).map((c) => new TerminalCompletionItem(c)),
            this._inlineCompletionItem,
        ], lineContext);
        if (token.isCancellationRequested) {
            return;
        }
        this._showCompletions(model, explicitlyInvoked);
    }
    setContainerWithOverflow(container) {
        this._container = container;
    }
    setScreen(screen) {
        this._screen = screen;
    }
    toggleExplainMode() {
        this._suggestWidget?.toggleExplainMode();
    }
    toggleSuggestionFocus() {
        this._suggestWidget?.toggleDetailsFocus();
    }
    toggleSuggestionDetails() {
        this._suggestWidget?.toggleDetails();
    }
    resetWidgetSize() {
        this._suggestWidget?.resetWidgetSize();
    }
    async requestCompletions(explicitlyInvoked) {
        if (!this._promptInputModel) {
            this._shouldSyncWhenReady = true;
            return;
        }
        if (this.isPasting) {
            return;
        }
        if (this._cancellationTokenSource) {
            this._cancellationTokenSource.cancel();
            this._cancellationTokenSource.dispose();
        }
        this._cancellationTokenSource = new CancellationTokenSource();
        const token = this._cancellationTokenSource.token;
        await this._handleCompletionProviders(this._terminal, token, explicitlyInvoked);
    }
    _addPropertiesToInlineCompletionItem(completions) {
        const inlineCompletionLabel = (typeof this._inlineCompletionItem.completion.label === 'string'
            ? this._inlineCompletionItem.completion.label
            : this._inlineCompletionItem.completion.label.label).trim();
        const inlineCompletionMatchIndex = completions.findIndex((c) => typeof c.label === 'string'
            ? c.label === inlineCompletionLabel
            : c.label.label === inlineCompletionLabel);
        if (inlineCompletionMatchIndex !== -1) {
            // Remove the existing inline completion item from the completions list
            const richCompletionMatchingInline = completions.splice(inlineCompletionMatchIndex, 1)[0];
            // Apply its properties to the inline completion item
            this._inlineCompletionItem.completion.label = richCompletionMatchingInline.label;
            this._inlineCompletionItem.completion.detail = richCompletionMatchingInline.detail;
            this._inlineCompletionItem.completion.documentation =
                richCompletionMatchingInline.documentation;
        }
        else if (this._inlineCompletionItem.completion) {
            this._inlineCompletionItem.completion.detail = undefined;
            this._inlineCompletionItem.completion.documentation = undefined;
        }
    }
    _requestTriggerCharQuickSuggestCompletions() {
        if (!this._wasLastInputVerticalArrowKey()) {
            // Only request on trigger character when it's a regular input, or on an arrow if the widget
            // is already visible
            if (!this._wasLastInputIncludedEscape() ||
                this._terminalSuggestWidgetVisibleContextKey.get()) {
                this.requestCompletions();
                return true;
            }
        }
        return false;
    }
    _wasLastInputRightArrowKey() {
        return !!this._lastUserData?.match(/^\x1b[\[O]?C$/);
    }
    _wasLastInputVerticalArrowKey() {
        return !!this._lastUserData?.match(/^\x1b[\[O]?[A-B]$/);
    }
    /**
     * Whether the last input included the escape character. Typically this will mean it was more
     * than just a simple character, such as arrow keys, home, end, etc.
     */
    _wasLastInputIncludedEscape() {
        return !!this._lastUserData?.includes('\x1b');
    }
    _wasLastInputArrowKey() {
        // Never request completions if the last key sequence was up or down as the user was likely
        // navigating history
        return !!this._lastUserData?.match(/^\x1b[\[O]?[A-D]$/);
    }
    _sync(promptInputState) {
        const config = this._configurationService.getValue(terminalSuggestConfigSection);
        {
            let sent = false;
            // If the cursor moved to the right
            if (!this._mostRecentPromptInputState ||
                promptInputState.cursorIndex > this._mostRecentPromptInputState.cursorIndex) {
                // Quick suggestions - Trigger whenever a new non-whitespace character is used
                if (!this._terminalSuggestWidgetVisibleContextKey.get()) {
                    const commandLineHasSpace = promptInputState.prefix.trim().match(/\s/);
                    if ((!commandLineHasSpace && config.quickSuggestions.commands !== 'off') ||
                        (commandLineHasSpace && config.quickSuggestions.arguments !== 'off')) {
                        if (promptInputState.prefix.match(/[^\s]$/)) {
                            sent = this._requestTriggerCharQuickSuggestCompletions();
                        }
                    }
                }
                // Trigger characters - this happens even if the widget is showing
                if (config.suggestOnTriggerCharacters && !sent) {
                    const prefix = promptInputState.prefix;
                    if (
                    // Only trigger on `-` if it's after a space. This is required to not clear
                    // completions when typing the `-` in `git cherry-pick`
                    prefix?.match(/\s[\-]$/) ||
                        // Only trigger on `\` and `/` if it's a directory. Not doing so causes problems
                        // with git branches in particular
                        (this._isFilteringDirectories && prefix?.match(/[\\\/]$/))) {
                        sent = this._requestTriggerCharQuickSuggestCompletions();
                    }
                    if (!sent) {
                        for (const provider of this._terminalCompletionService.providers) {
                            if (!provider.triggerCharacters) {
                                continue;
                            }
                            for (const char of provider.triggerCharacters) {
                                if (prefix?.endsWith(char)) {
                                    sent = this._requestTriggerCharQuickSuggestCompletions();
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            // If the cursor moved to the left
            if (this._mostRecentPromptInputState &&
                promptInputState.cursorIndex < this._mostRecentPromptInputState.cursorIndex &&
                promptInputState.cursorIndex > 0) {
                // We only want to refresh via trigger characters in this case if the widget is
                // already visible
                if (this._terminalSuggestWidgetVisibleContextKey.get()) {
                    // Backspace or left past a trigger character
                    if (config.suggestOnTriggerCharacters &&
                        !sent &&
                        this._mostRecentPromptInputState.cursorIndex > 0) {
                        const char = this._mostRecentPromptInputState.value[this._mostRecentPromptInputState.cursorIndex - 1];
                        if (
                        // Only trigger on `\` and `/` if it's a directory. Not doing so causes problems
                        // with git branches in particular
                        this._isFilteringDirectories &&
                            char.match(/[\\\/]$/)) {
                            sent = this._requestTriggerCharQuickSuggestCompletions();
                        }
                    }
                }
            }
        }
        // Hide the widget if ghost text was just completed via right arrow
        if (this._wasLastInputRightArrowKey() &&
            this._mostRecentPromptInputState?.ghostTextIndex !== -1 &&
            promptInputState.ghostTextIndex === -1 &&
            this._mostRecentPromptInputState?.value === promptInputState.value) {
            this.hideSuggestWidget(false);
        }
        this._mostRecentPromptInputState = promptInputState;
        if (!this._promptInputModel ||
            !this._terminal ||
            !this._suggestWidget ||
            this._leadingLineContent === undefined) {
            return;
        }
        const previousPromptInputState = this._currentPromptInputState;
        this._currentPromptInputState = promptInputState;
        // Hide the widget if the latest character was a space
        if (this._currentPromptInputState.cursorIndex > 1 &&
            this._currentPromptInputState.value.at(this._currentPromptInputState.cursorIndex - 1) === ' ') {
            if (!this._wasLastInputArrowKey()) {
                this.hideSuggestWidget(false);
                return;
            }
        }
        // Hide the widget if the cursor moves to the left and invalidates the completions.
        // Originally this was to the left of the initial position that the completions were
        // requested, but since extensions are expected to allow the client-side to filter, they are
        // only invalidated when whitespace is encountered.
        if (this._currentPromptInputState &&
            this._currentPromptInputState.cursorIndex < this._leadingLineContent.length) {
            if (this._currentPromptInputState.cursorIndex <= 0 ||
                previousPromptInputState?.value[this._currentPromptInputState.cursorIndex]?.match(/[\\\/\s]/)) {
                this.hideSuggestWidget(false);
                return;
            }
        }
        if (this._terminalSuggestWidgetVisibleContextKey.get()) {
            this._cursorIndexDelta =
                this._currentPromptInputState.cursorIndex - this._requestedCompletionsIndex;
            let normalizedLeadingLineContent = this._currentPromptInputState.value.substring(0, this._requestedCompletionsIndex + this._cursorIndexDelta);
            if (this._isFilteringDirectories) {
                normalizedLeadingLineContent = normalizePathSeparator(normalizedLeadingLineContent, this._pathSeparator);
            }
            const lineContext = new LineContext(normalizedLeadingLineContent, this._cursorIndexDelta);
            this._suggestWidget.setLineContext(lineContext);
        }
        this._refreshInlineCompletion(this._model?.items.map((i) => i.completion) || []);
        // Hide and clear model if there are no more items
        if (!this._suggestWidget.hasCompletions()) {
            this.hideSuggestWidget(false);
            return;
        }
        const dimensions = this._getTerminalDimensions();
        if (!dimensions.width || !dimensions.height) {
            return;
        }
        const xtermBox = this._screen.getBoundingClientRect();
        this._suggestWidget.showSuggestions(0, false, true, {
            left: xtermBox.left + this._terminal.buffer.active.cursorX * dimensions.width,
            top: xtermBox.top + this._terminal.buffer.active.cursorY * dimensions.height,
            height: dimensions.height,
        });
    }
    _refreshInlineCompletion(completions) {
        const oldIsInvalid = this._inlineCompletionItem.isInvalid;
        if (!this._currentPromptInputState || this._currentPromptInputState.ghostTextIndex === -1) {
            this._inlineCompletionItem.isInvalid = true;
        }
        else {
            this._inlineCompletionItem.isInvalid = false;
            // Update properties
            const spaceIndex = this._currentPromptInputState.value.lastIndexOf(' ', this._currentPromptInputState.ghostTextIndex - 1);
            const replacementIndex = spaceIndex === -1 ? 0 : spaceIndex + 1;
            const suggestion = this._currentPromptInputState.value.substring(replacementIndex);
            this._inlineCompletion.label = suggestion;
            this._inlineCompletion.replacementIndex = replacementIndex;
            // Note that the cursor index delta must be taken into account here, otherwise filtering
            // wont work correctly.
            this._inlineCompletion.replacementLength =
                this._currentPromptInputState.cursorIndex - replacementIndex - this._cursorIndexDelta;
            // Reset the completion item as the object reference must remain the same but its
            // contents will differ across syncs. This is done so we don't need to reassign the
            // model and the slowdown/flickering that could potentially cause.
            this._addPropertiesToInlineCompletionItem(completions);
            const x = new TerminalCompletionItem(this._inlineCompletion);
            this._inlineCompletionItem.idx = x.idx;
            this._inlineCompletionItem.score = x.score;
            this._inlineCompletionItem.labelLow = x.labelLow;
            this._inlineCompletionItem.textLabel = x.textLabel;
            this._inlineCompletionItem.fileExtLow = x.fileExtLow;
            this._inlineCompletionItem.labelLowExcludeFileExt = x.labelLowExcludeFileExt;
            this._inlineCompletionItem.labelLowNormalizedPath = x.labelLowNormalizedPath;
            this._inlineCompletionItem.underscorePenalty = x.underscorePenalty;
            this._inlineCompletionItem.word = x.word;
            this._model?.forceRefilterAll();
        }
        // Force a filter all in order to re-evaluate the inline completion
        if (this._inlineCompletionItem.isInvalid !== oldIsInvalid) {
            this._model?.forceRefilterAll();
        }
    }
    _getTerminalDimensions() {
        const cssCellDims = this._terminal._core._renderService
            .dimensions.css.cell;
        return {
            width: cssCellDims.width,
            height: cssCellDims.height,
        };
    }
    _getFontInfo() {
        if (this._cachedFontInfo) {
            return this._cachedFontInfo;
        }
        const core = this._terminal._core;
        const font = this._terminalConfigurationService.getFont(dom.getActiveWindow(), core);
        let lineHeight = font.lineHeight;
        const fontSize = font.fontSize;
        const fontFamily = font.fontFamily;
        const letterSpacing = font.letterSpacing;
        const fontWeight = this._configurationService.getValue('editor.fontWeight');
        if (lineHeight <= 1) {
            lineHeight = GOLDEN_LINE_HEIGHT_RATIO * fontSize;
        }
        else if (lineHeight < MINIMUM_LINE_HEIGHT) {
            // Values too small to be line heights in pixels are in ems.
            lineHeight = lineHeight * fontSize;
        }
        // Enforce integer, minimum constraints
        lineHeight = Math.round(lineHeight);
        if (lineHeight < MINIMUM_LINE_HEIGHT) {
            lineHeight = MINIMUM_LINE_HEIGHT;
        }
        const fontInfo = {
            fontSize,
            lineHeight,
            fontWeight: fontWeight.toString(),
            letterSpacing,
            fontFamily,
        };
        this._cachedFontInfo = fontInfo;
        return fontInfo;
    }
    _getAdvancedExplainModeDetails() {
        return `promptInputModel: ${this._promptInputModel?.getCombinedString()}`;
    }
    _showCompletions(model, explicitlyInvoked) {
        if (!this._terminal?.element) {
            return;
        }
        const suggestWidget = this._ensureSuggestWidget(this._terminal);
        suggestWidget.setCompletionModel(model);
        this._register(suggestWidget.onDidFocus(() => this._terminal?.focus()));
        if (!this._promptInputModel || (!explicitlyInvoked && model.items.length === 0)) {
            return;
        }
        this._model = model;
        const dimensions = this._getTerminalDimensions();
        if (!dimensions.width || !dimensions.height) {
            return;
        }
        const xtermBox = this._screen.getBoundingClientRect();
        suggestWidget.showSuggestions(0, false, !explicitlyInvoked, {
            left: xtermBox.left + this._terminal.buffer.active.cursorX * dimensions.width,
            top: xtermBox.top + this._terminal.buffer.active.cursorY * dimensions.height,
            height: dimensions.height,
        });
    }
    _ensureSuggestWidget(terminal) {
        if (!this._suggestWidget) {
            this._suggestWidget = this._register(this._instantiationService.createInstance(SimpleSuggestWidget, this._container, this._instantiationService.createInstance(PersistedWidgetSize), {
                statusBarMenuId: MenuId.MenubarTerminalSuggestStatusMenu,
                showStatusBarSettingId: "terminal.integrated.suggest.showStatusBar" /* TerminalSuggestSettingId.ShowStatusBar */,
            }, this._getFontInfo.bind(this), this._onDidFontConfigurationChange.event.bind(this), this._getAdvancedExplainModeDetails.bind(this)));
            this._suggestWidget.list.style(getListStyles({
                listInactiveFocusBackground: editorSuggestWidgetSelectedBackground,
                listInactiveFocusOutline: activeContrastBorder,
            }));
            this._register(this._suggestWidget.onDidSelect(async (e) => this.acceptSelectedSuggestion(e)));
            this._register(this._suggestWidget.onDidHide(() => this._terminalSuggestWidgetVisibleContextKey.reset()));
            this._register(this._suggestWidget.onDidShow(() => this._terminalSuggestWidgetVisibleContextKey.set(true)));
            this._register(this._configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration("terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */) ||
                    e.affectsConfiguration("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */) ||
                    e.affectsConfiguration("terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */) ||
                    e.affectsConfiguration("terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */) ||
                    e.affectsConfiguration('editor.fontSize') ||
                    e.affectsConfiguration('editor.fontFamily')) {
                    this._onDidFontConfigurationChange.fire();
                }
            }));
            const element = this._terminal?.element?.querySelector('.xterm-helper-textarea');
            if (element) {
                this._register(dom.addDisposableListener(dom.getActiveDocument(), 'click', (event) => {
                    const target = event.target;
                    if (this._terminal?.element?.contains(target)) {
                        this._suggestWidget?.hide();
                    }
                }));
            }
            this._register(this._suggestWidget.onDidBlurDetails((e) => {
                const elt = e.relatedTarget;
                if (this._terminal?.element?.contains(elt)) {
                    // Do nothing, just the terminal getting focused
                    // If there was a mouse click, the suggest widget will be
                    // hidden above
                    return;
                }
                this._suggestWidget?.hide();
            }));
            this._terminalSuggestWidgetVisibleContextKey.set(false);
        }
        return this._suggestWidget;
    }
    selectPreviousSuggestion() {
        this._suggestWidget?.selectPrevious();
    }
    selectPreviousPageSuggestion() {
        this._suggestWidget?.selectPreviousPage();
    }
    selectNextSuggestion() {
        this._suggestWidget?.selectNext();
    }
    selectNextPageSuggestion() {
        this._suggestWidget?.selectNextPage();
    }
    acceptSelectedSuggestion(suggestion, respectRunOnEnter) {
        if (!suggestion) {
            suggestion = this._suggestWidget?.getFocusedItem();
        }
        const initialPromptInputState = this._mostRecentPromptInputState;
        if (!suggestion ||
            !initialPromptInputState ||
            this._leadingLineContent === undefined ||
            !this._model) {
            this._suggestTelemetry?.acceptCompletion(undefined, this._mostRecentPromptInputState?.value);
            return;
        }
        SuggestAddon_1.lastAcceptedCompletionTimestamp = Date.now();
        this._suggestWidget?.hide();
        const currentPromptInputState = this._currentPromptInputState ?? initialPromptInputState;
        // The replacement text is any text after the replacement index for the completions, this
        // includes any text that was there before the completions were requested and any text added
        // since to refine the completion.
        const replacementText = currentPromptInputState.value.substring(suggestion.item.completion.replacementIndex, currentPromptInputState.cursorIndex);
        // Right side of replacement text in the same word
        let rightSideReplacementText = '';
        if (
        // The line didn't end with ghost text
        (currentPromptInputState.ghostTextIndex === -1 ||
            currentPromptInputState.ghostTextIndex > currentPromptInputState.cursorIndex) &&
            // There is more than one charatcer
            currentPromptInputState.value.length > currentPromptInputState.cursorIndex + 1 &&
            // THe next character is not a space
            currentPromptInputState.value.at(currentPromptInputState.cursorIndex) !== ' ') {
            const spaceIndex = currentPromptInputState.value
                .substring(currentPromptInputState.cursorIndex, currentPromptInputState.ghostTextIndex === -1
                ? undefined
                : currentPromptInputState.ghostTextIndex)
                .indexOf(' ');
            rightSideReplacementText = currentPromptInputState.value.substring(currentPromptInputState.cursorIndex, spaceIndex === -1 ? undefined : currentPromptInputState.cursorIndex + spaceIndex);
        }
        const completion = suggestion.item.completion;
        let resultSequence = completion.inputData;
        // Use for amend the label if inputData is not defined
        if (resultSequence === undefined) {
            let completionText = typeof completion.label === 'string' ? completion.label : completion.label.label;
            if ((completion.kind === TerminalCompletionItemKind.Folder || completion.isFileOverride) &&
                completionText.includes(' ')) {
                // Escape spaces in files or folders so they're valid paths
                completionText = completionText.replaceAll(' ', '\\ ');
            }
            let runOnEnter = false;
            if (respectRunOnEnter) {
                const runOnEnterConfig = this._configurationService.getValue(terminalSuggestConfigSection).runOnEnter;
                switch (runOnEnterConfig) {
                    case 'always': {
                        runOnEnter = true;
                        break;
                    }
                    case 'exactMatch': {
                        runOnEnter = replacementText.toLowerCase() === completionText.toLowerCase();
                        break;
                    }
                    case 'exactMatchIgnoreExtension': {
                        runOnEnter = replacementText.toLowerCase() === completionText.toLowerCase();
                        if (completion.isFileOverride) {
                            runOnEnter ||=
                                replacementText.toLowerCase() ===
                                    completionText.toLowerCase().replace(/\.[^\.]+$/, '');
                        }
                        break;
                    }
                }
            }
            const commonPrefixLen = commonPrefixLength(replacementText, completionText);
            const commonPrefix = replacementText.substring(replacementText.length - 1 - commonPrefixLen, replacementText.length - 1);
            const completionSuffix = completionText.substring(commonPrefixLen);
            if (currentPromptInputState.suffix.length > 0 &&
                currentPromptInputState.prefix.endsWith(commonPrefix) &&
                currentPromptInputState.suffix.startsWith(completionSuffix)) {
                // Move right to the end of the completion
                resultSequence = '\x1bOC'.repeat(completionText.length - commonPrefixLen);
            }
            else {
                resultSequence = [
                    // Backspace (left) to remove all additional input
                    '\x7F'.repeat(replacementText.length - commonPrefixLen),
                    // Delete (right) to remove any additional text in the same word
                    '\x1b[3~'.repeat(rightSideReplacementText.length),
                    // Write the completion
                    completionSuffix,
                    // Run on enter if needed
                    runOnEnter ? '\r' : '',
                ].join('');
            }
        }
        // For folders, allow the next completion request to get completions for that folder
        if (completion.kind === TerminalCompletionItemKind.Folder) {
            SuggestAddon_1.lastAcceptedCompletionTimestamp = 0;
        }
        // Send the completion
        this._onAcceptedCompletion.fire(resultSequence);
        this._suggestTelemetry?.acceptCompletion(completion, this._mostRecentPromptInputState?.value);
        this.hideSuggestWidget(true);
    }
    hideSuggestWidget(cancelAnyRequest) {
        if (cancelAnyRequest) {
            this._cancellationTokenSource?.cancel();
            this._cancellationTokenSource = undefined;
        }
        this._currentPromptInputState = undefined;
        this._leadingLineContent = undefined;
        this._suggestWidget?.hide();
    }
};
SuggestAddon = SuggestAddon_1 = __decorate([
    __param(3, ITerminalCompletionService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IExtensionService),
    __param(7, ITerminalConfigurationService)
], SuggestAddon);
export { SuggestAddon };
let PersistedWidgetSize = class PersistedWidgetSize {
    constructor(_storageService) {
        this._storageService = _storageService;
        this._key = "terminal.integrated.suggestSize" /* TerminalStorageKeys.TerminalSuggestSize */;
    }
    restore() {
        const raw = this._storageService.get(this._key, 0 /* StorageScope.PROFILE */) ?? '';
        try {
            const obj = JSON.parse(raw);
            if (dom.Dimension.is(obj)) {
                return dom.Dimension.lift(obj);
            }
        }
        catch {
            // ignore
        }
        return undefined;
    }
    store(size) {
        this._storageService.store(this._key, JSON.stringify(size), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    reset() {
        this._storageService.remove(this._key, 0 /* StorageScope.PROFILE */);
    }
};
PersistedWidgetSize = __decorate([
    __param(0, IStorageService)
], PersistedWidgetSize);
export function normalizePathSeparator(path, sep) {
    if (sep === '/') {
        return path.replaceAll('\\', '/');
    }
    return path.replaceAll('/', '\\');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0QWRkb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvdGVybWluYWxTdWdnZXN0QWRkb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixpQkFBaUIsR0FDakIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDdEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLG1EQUFtRCxDQUFBO0FBUzFELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUc1RixPQUFPLEVBQ04sNEJBQTRCLEdBRzVCLE1BQU0sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQzNGLE9BQU8sRUFFTixtQkFBbUIsR0FDbkIsTUFBTSw2REFBNkQsQ0FBQTtB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
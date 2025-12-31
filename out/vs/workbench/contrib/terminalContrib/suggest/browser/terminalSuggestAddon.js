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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0QWRkb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3Rlcm1pbmFsU3VnZ2VzdEFkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsaUJBQWlCLEdBQ2pCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ3RILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxtREFBbUQsQ0FBQTtBQVMxRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDdEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFHNUYsT0FBTyxFQUNOLDRCQUE0QixHQUc1QixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUMzRixPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0sNkRBQTZELENBQUE7QUFDcEUs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
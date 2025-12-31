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
var SnippetController2_1;
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { assertType } from '../../../../base/common/types.js';
import { EditorCommand, registerEditorCommand, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { Position } from '../../../common/core/position.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { showSimpleSuggestions } from '../../suggest/browser/suggest.js';
import { localize } from '../../../../nls.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { SnippetSession } from './snippetSession.js';
const _defaultOptions = {
    overwriteBefore: 0,
    overwriteAfter: 0,
    undoStopBefore: true,
    undoStopAfter: true,
    adjustWhitespace: true,
    clipboardText: undefined,
    overtypingCapturer: undefined,
};
let SnippetController2 = class SnippetController2 {
    static { SnippetController2_1 = this; }
    static { this.ID = 'snippetController2'; }
    static get(editor) {
        return editor.getContribution(SnippetController2_1.ID);
    }
    static { this.InSnippetMode = new RawContextKey('inSnippetMode', false, localize('inSnippetMode', 'Whether the editor in current in snippet mode')); }
    static { this.HasNextTabstop = new RawContextKey('hasNextTabstop', false, localize('hasNextTabstop', 'Whether there is a next tab stop when in snippet mode')); }
    static { this.HasPrevTabstop = new RawContextKey('hasPrevTabstop', false, localize('hasPrevTabstop', 'Whether there is a previous tab stop when in snippet mode')); }
    constructor(_editor, _logService, _languageFeaturesService, contextKeyService, _languageConfigurationService) {
        this._editor = _editor;
        this._logService = _logService;
        this._languageFeaturesService = _languageFeaturesService;
        this._languageConfigurationService = _languageConfigurationService;
        this._snippetListener = new DisposableStore();
        this._modelVersionId = -1;
        this._inSnippet = SnippetController2_1.InSnippetMode.bindTo(contextKeyService);
        this._hasNextTabstop = SnippetController2_1.HasNextTabstop.bindTo(contextKeyService);
        this._hasPrevTabstop = SnippetController2_1.HasPrevTabstop.bindTo(contextKeyService);
    }
    dispose() {
        this._inSnippet.reset();
        this._hasPrevTabstop.reset();
        this._hasNextTabstop.reset();
        this._session?.dispose();
        this._snippetListener.dispose();
    }
    apply(edits, opts) {
        try {
            this._doInsert(edits, typeof opts === 'undefined' ? _defaultOptions : { ..._defaultOptions, ...opts });
        }
        catch (e) {
            this.cancel();
            this._logService.error(e);
            this._logService.error('snippet_error');
            this._logService.error('insert_edits=', edits);
            this._logService.error('existing_template=', this._session ? this._session._logInfo() : '<no_session>');
        }
    }
    insert(template, opts) {
        // this is here to find out more about the yet-not-understood
        // error that sometimes happens when we fail to inserted a nested
        // snippet
        try {
            this._doInsert(template, typeof opts === 'undefined' ? _defaultOptions : { ..._defaultOptions, ...opts });
        }
        catch (e) {
            this.cancel();
            this._logService.error(e);
            this._logService.error('snippet_error');
            this._logService.error('insert_template=', template);
            this._logService.error('existing_template=', this._session ? this._session._logInfo() : '<no_session>');
        }
    }
    _doInsert(template, opts) {
        if (!this._editor.hasModel()) {
            return;
        }
        // don't listen while inserting the snippet
        // as that is the inflight state causing cancelation
        this._snippetListener.clear();
        if (opts.undoStopBefore) {
            this._editor.getModel().pushStackElement();
        }
        // don't merge
        if (this._session && typeof template !== 'string') {
            this.cancel();
        }
        if (!this._session) {
            this._modelVersionId = this._editor.getModel().getAlternativeVersionId();
            this._session = new SnippetSession(this._editor, template, opts, this._languageConfigurationService);
            this._session.insert();
        }
        else {
            assertType(typeof template === 'string');
            this._session.merge(template, opts);
        }
        if (opts.undoStopAfter) {
            this._editor.getModel().pushStackElement();
        }
        // regster completion item provider when there is any choice element
        if (this._session?.hasChoice) {
            const provider = {
                _debugDisplayName: 'snippetChoiceCompletions',
                provideCompletionItems: (model, position) => {
                    if (!this._session ||
                        model !== this._editor.getModel() ||
                        !Position.equals(this._editor.getPosition(), position)) {
                        return undefined;
                    }
                    const { activeChoice } = this._session;
                    if (!activeChoice || activeChoice.choice.options.length === 0) {
                        return undefined;
                    }
                    const word = model.getValueInRange(activeChoice.range);
                    const isAnyOfOptions = Boolean(activeChoice.choice.options.find((o) => o.value === word));
                    const suggestions = [];
                    for (let i = 0; i < activeChoice.choice.options.length; i++) {
                        const option = activeChoice.choice.options[i];
                        suggestions.push({
                            kind: 13 /* CompletionItemKind.Value */,
                            label: option.value,
                            insertText: option.value,
                            sortText: 'a'.repeat(i + 1),
                            range: activeChoice.range,
                            filterText: isAnyOfOptions ? `${word}_${option.value}` : undefined,
                            command: {
                                id: 'jumpToNextSnippetPlaceholder',
                                title: localize('next', 'Go to next placeholder...'),
                            },
                        });
                    }
                    return { suggestions };
                },
            };
            const model = this._editor.getModel();
            let registration;
            let isRegistered = false;
            const disable = () => {
                registration?.dispose();
                isRegistered = false;
            };
            const enable = () => {
                if (!isRegistered) {
                    registration = this._languageFeaturesService.completionProvider.register({
                        language: model.getLanguageId(),
                        pattern: model.uri.fsPath,
                        scheme: model.uri.scheme,
                        exclusive: true,
                    }, provider);
                    this._snippetListener.add(registration);
                    isRegistered = true;
                }
            };
            this._choiceCompletions = { provider, enable, disable };
        }
        this._updateState();
        this._snippetListener.add(this._editor.onDidChangeModelContent((e) => e.isFlush && this.cancel()));
        this._snippetListener.add(this._editor.onDidChangeModel(() => this.cancel()));
        this._snippetListener.add(this._editor.onDidChangeCursorSelection(() => this._updateState()));
    }
    _updateState() {
        if (!this._session || !this._editor.hasModel()) {
            // canceled in the meanwhile
            return;
        }
        if (this._modelVersionId === this._editor.getModel().getAlternativeVersionId()) {
            // undo until the 'before' state happened
            // and makes use cancel snippet mode
            return this.cancel();
        }
        if (!this._session.hasPlaceholder) {
            // don't listen for selection changes and don't
            // update context keys when the snippet is plain text
            return this.cancel();
        }
        if (this._session.isAtLastPlaceholder || !this._session.isSelectionWithinPlaceholders()) {
            this._editor.getModel().pushStackElement();
            return this.cancel();
        }
        this._inSnippet.set(true);
        this._hasPrevTabstop.set(!this._session.isAtFirstPlaceholder);
        this._hasNextTabstop.set(!this._session.isAtLastPlaceholder);
        this._handleChoice();
    }
    _handleChoice() {
        if (!this._session || !this._editor.hasModel()) {
            this._currentChoice = undefined;
            return;
        }
        const { activeChoice } = this._session;
        if (!activeChoice || !this._choiceCompletions) {
            this._choiceCompletions?.disable();
            this._currentChoice = undefined;
            return;
        }
        if (this._currentChoice !== activeChoice.choice) {
            this._currentChoice = activeChoice.choice;
            this._choiceCompletions.enable();
            // trigger suggest with the special choice completion provider
            queueMicrotask(() => {
                showSimpleSuggestions(this._editor, this._choiceCompletions.provider);
            });
        }
    }
    finish() {
        while (this._inSnippet.get()) {
            this.next();
        }
    }
    cancel(resetSelection = false) {
        this._inSnippet.reset();
        this._hasPrevTabstop.reset();
        this._hasNextTabstop.reset();
        this._snippetListener.clear();
        this._currentChoice = undefined;
        this._session?.dispose();
        this._session = undefined;
        this._modelVersionId = -1;
        if (resetSelection) {
            // reset selection to the primary cursor when being asked
            // for. this happens when explicitly cancelling snippet mode,
            // e.g. when pressing ESC
            this._editor.setSelections([this._editor.getSelection()]);
        }
    }
    prev() {
        this._session?.prev();
        this._updateState();
    }
    next() {
        this._session?.next();
        this._updateState();
    }
    isInSnippet() {
        return Boolean(this._inSnippet.get());
    }
    getSessionEnclosingRange() {
        if (this._session) {
            return this._session.getEnclosingRange();
        }
        return undefined;
    }
};
SnippetController2 = SnippetController2_1 = __decorate([
    __param(1, ILogService),
    __param(2, ILanguageFeaturesService),
    __param(3, IContextKeyService),
    __param(4, ILanguageConfigurationService)
], SnippetController2);
export { SnippetController2 };
registerEditorContribution(SnippetController2.ID, SnippetController2, 4 /* EditorContributionInstantiation.Lazy */);
const CommandCtor = EditorCommand.bindToContribution(SnippetController2.get);
registerEditorCommand(new CommandCtor({
    id: 'jumpToNextSnippetPlaceholder',
    precondition: ContextKeyExpr.and(SnippetController2.InSnippetMode, SnippetController2.HasNextTabstop),
    handler: (ctrl) => ctrl.next(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 30,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 2 /* KeyCode.Tab */,
    },
}));
registerEditorCommand(new CommandCtor({
    id: 'jumpToPrevSnippetPlaceholder',
    precondition: ContextKeyExpr.and(SnippetController2.InSnippetMode, SnippetController2.HasPrevTabstop),
    handler: (ctrl) => ctrl.prev(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 30,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */,
    },
}));
registerEditorCommand(new CommandCtor({
    id: 'leaveSnippet',
    precondition: SnippetController2.InSnippetMode,
    handler: (ctrl) => ctrl.cancel(true),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 30,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    },
}));
registerEditorCommand(new CommandCtor({
    id: 'acceptSnippet',
    precondition: SnippetController2.InSnippetMode,
    handler: (ctrl) => ctrl.finish(),
    // kbOpts: {
    // 	weight: KeybindingWeight.EditorContrib + 30,
    // 	kbExpr: EditorContextKeys.textFocus,
    // 	primary: KeyCode.Enter,
    // }
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvbnRyb2xsZXIyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc25pcHBldC9icm93c2VyL3NuaXBwZXRDb250cm9sbGVyMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU3RCxPQUFPLEVBQ04sYUFBYSxFQUViLHFCQUFxQixFQUNyQiwwQkFBMEIsR0FDMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFNeEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFMUcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQWdCLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBWWxFLE1BQU0sZUFBZSxHQUEwQjtJQUM5QyxlQUFlLEVBQUUsQ0FBQztJQUNsQixjQUFjLEVBQUUsQ0FBQztJQUNqQixjQUFjLEVBQUUsSUFBSTtJQUNwQixhQUFhLEVBQUUsSUFB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
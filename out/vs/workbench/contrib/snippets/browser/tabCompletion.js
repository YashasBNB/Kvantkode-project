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
var TabCompletionController_1;
import { RawContextKey, IContextKeyService, ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { ISnippetsService } from './snippets.js';
import { getNonWhitespacePrefix } from './snippetsService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { registerEditorContribution, EditorCommand, registerEditorCommand, } from '../../../../editor/browser/editorExtensions.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { showSimpleSuggestions } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { SnippetCompletion } from './snippetCompletionProvider.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { EditorState, } from '../../../../editor/contrib/editorState/browser/editorState.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
let TabCompletionController = class TabCompletionController {
    static { TabCompletionController_1 = this; }
    static { this.ID = 'editor.tabCompletionController'; }
    static { this.ContextKey = new RawContextKey('hasSnippetCompletions', undefined); }
    static get(editor) {
        return editor.getContribution(TabCompletionController_1.ID);
    }
    constructor(_editor, _snippetService, _clipboardService, _languageFeaturesService, contextKeyService) {
        this._editor = _editor;
        this._snippetService = _snippetService;
        this._clipboardService = _clipboardService;
        this._languageFeaturesService = _languageFeaturesService;
        this._activeSnippets = [];
        this._hasSnippets = TabCompletionController_1.ContextKey.bindTo(contextKeyService);
        this._configListener = this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(128 /* EditorOption.tabCompletion */)) {
                this._update();
            }
        });
        this._update();
    }
    dispose() {
        this._configListener.dispose();
        this._selectionListener?.dispose();
    }
    _update() {
        const enabled = this._editor.getOption(128 /* EditorOption.tabCompletion */) === 'onlySnippets';
        if (this._enabled !== enabled) {
            this._enabled = enabled;
            if (!this._enabled) {
                this._selectionListener?.dispose();
            }
            else {
                this._selectionListener = this._editor.onDidChangeCursorSelection((e) => this._updateSnippets());
                if (this._editor.getModel()) {
                    this._updateSnippets();
                }
            }
        }
    }
    _updateSnippets() {
        // reset first
        this._activeSnippets = [];
        this._completionProvider?.dispose();
        if (!this._editor.hasModel()) {
            return;
        }
        // lots of dance for getting the
        const selection = this._editor.getSelection();
        const model = this._editor.getModel();
        model.tokenization.tokenizeIfCheap(selection.positionLineNumber);
        const id = model.getLanguageIdAtPosition(selection.positionLineNumber, selection.positionColumn);
        const snippets = this._snippetService.getSnippetsSync(id);
        if (!snippets) {
            // nothing for this language
            this._hasSnippets.set(false);
            return;
        }
        if (Range.isEmpty(selection)) {
            // empty selection -> real text (no whitespace) left of cursor
            const prefix = getNonWhitespacePrefix(model, selection.getPosition());
            if (prefix) {
                for (const snippet of snippets) {
                    if (prefix.endsWith(snippet.prefix)) {
                        this._activeSnippets.push(snippet);
                    }
                }
            }
        }
        else if (!Range.spansMultipleLines(selection) &&
            model.getValueLengthInRange(selection) <= 100) {
            // actual selection -> snippet must be a full match
            const selected = model.getValueInRange(selection);
            if (selected) {
                for (const snippet of snippets) {
                    if (selected === snippet.prefix) {
                        this._activeSnippets.push(snippet);
                    }
                }
            }
        }
        const len = this._activeSnippets.length;
        if (len === 0) {
            this._hasSnippets.set(false);
        }
        else if (len === 1) {
            this._hasSnippets.set(true);
        }
        else {
            this._hasSnippets.set(true);
            this._completionProvider = {
                _debugDisplayName: 'tabCompletion',
                dispose: () => {
                    registration.dispose();
                },
                provideCompletionItems: (_model, position) => {
                    if (_model !== model || !selection.containsPosition(position)) {
                        return;
                    }
                    const suggestions = this._activeSnippets.map((snippet) => {
                        const range = Range.fromPositions(position.delta(0, -snippet.prefix.length), position);
                        return new SnippetCompletion(snippet, range);
                    });
                    return { suggestions };
                },
            };
            const registration = this._languageFeaturesService.completionProvider.register({ language: model.getLanguageId(), pattern: model.uri.fsPath, scheme: model.uri.scheme }, this._completionProvider);
        }
    }
    async performSnippetCompletions() {
        if (!this._editor.hasModel()) {
            return;
        }
        if (this._activeSnippets.length === 1) {
            // one -> just insert
            const [snippet] = this._activeSnippets;
            // async clipboard access might be required and in that case
            // we need to check if the editor has changed in flight and then
            // bail out (or be smarter than that)
            let clipboardText;
            if (snippet.needsClipboard) {
                const state = new EditorState(this._editor, 1 /* CodeEditorStateFlag.Value */ | 4 /* CodeEditorStateFlag.Position */);
                clipboardText = await this._clipboardService.readText();
                if (!state.validate(this._editor)) {
                    return;
                }
            }
            SnippetController2.get(this._editor)?.insert(snippet.codeSnippet, {
                overwriteBefore: snippet.prefix.length,
                overwriteAfter: 0,
                clipboardText,
            });
        }
        else if (this._activeSnippets.length > 1) {
            // two or more -> show IntelliSense box
            if (this._completionProvider) {
                showSimpleSuggestions(this._editor, this._completionProvider);
            }
        }
    }
};
TabCompletionController = TabCompletionController_1 = __decorate([
    __param(1, ISnippetsService),
    __param(2, IClipboardService),
    __param(3, ILanguageFeaturesService),
    __param(4, IContextKeyService)
], TabCompletionController);
export { TabCompletionController };
registerEditorContribution(TabCompletionController.ID, TabCompletionController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to define a context key
const TabCompletionCommand = EditorCommand.bindToContribution(TabCompletionController.get);
registerEditorCommand(new TabCompletionCommand({
    id: 'insertSnippet',
    precondition: TabCompletionController.ContextKey,
    handler: (x) => x.performSnippetCompletions(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, EditorContextKeys.tabDoesNotMoveFocus, SnippetController2.InSnippetMode.toNegated()),
        primary: 2 /* KeyCode.Tab */,
    },
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFiQ29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL2Jyb3dzZXIvdGFiQ29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUNOLGFBQWEsRUFDYixrQkFBa0IsRUFDbEIsY0FBYyxHQUVkLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ2hELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLGFBQWEsRUFDYixxQkFBcUIsR0FFckIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUdsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQ04sV0FBVyxHQUVYLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFHMUYsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7O2FBQ25CLE9BQUUsR0FBRyxnQ0FBZ0MsQUFBbkMsQ0FBbUM7YUFFckMsZUFBVSxHQUFHLElBQUksYUFBYSxDQUFVLHVC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
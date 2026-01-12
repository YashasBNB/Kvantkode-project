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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFiQ29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci90YWJDb21wbGV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQ04sYUFBYSxFQUNiLGtCQUFrQixFQUNsQixjQUFjLEdBRWQsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDaEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFHN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsYUFBYSxFQUNiLHFCQUFxQixHQUVyQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBR2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFDTixXQUFXLEdBRVgsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUcxRixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1Qjs7YUFDbkIsT0FBRSxHQUFHLGdDQUFnQyxBQUFuQyxDQUFtQzthQUVyQyxlQUFVLEdBQUcsSUFBSSxhQUFhLENB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
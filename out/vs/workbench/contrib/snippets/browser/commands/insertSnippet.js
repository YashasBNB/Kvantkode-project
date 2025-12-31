/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { SnippetController2 } from '../../../../../editor/contrib/snippet/browser/snippetController2.js';
import * as nls from '../../../../../nls.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { SnippetEditorAction } from './abstractSnippetsActions.js';
import { pickSnippet } from '../snippetPicker.js';
import { ISnippetsService } from '../snippets.js';
import { Snippet } from '../snippetsFile.js';
class Args {
    static fromUser(arg) {
        if (!arg || typeof arg !== 'object') {
            return Args._empty;
        }
        let { snippet, name, langId } = arg;
        if (typeof snippet !== 'string') {
            snippet = undefined;
        }
        if (typeof name !== 'string') {
            name = undefined;
        }
        if (typeof langId !== 'string') {
            langId = undefined;
        }
        return new Args(snippet, name, langId);
    }
    static { this._empty = new Args(undefined, undefined, undefined); }
    constructor(snippet, name, langId) {
        this.snippet = snippet;
        this.name = name;
        this.langId = langId;
    }
}
export class InsertSnippetAction extends SnippetEditorAction {
    constructor() {
        super({
            id: 'editor.action.insertSnippet',
            title: nls.localize2('snippet.suggestions.label', 'Insert Snippet'),
            f1: true,
            precondition: EditorContextKeys.writable,
            metadata: {
                description: `Insert Snippet`,
                args: [
                    {
                        name: 'args',
                        schema: {
                            type: 'object',
                            properties: {
                                snippet: {
                                    type: 'string',
                                },
                                langId: {
                                    type: 'string',
                                },
                                name: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                ],
            },
        });
    }
    async runEditorCommand(accessor, editor, arg) {
        const languageService = accessor.get(ILanguageService);
        const snippetService = accessor.get(ISnippetsService);
        if (!editor.hasModel()) {
            return;
        }
        const clipboardService = accessor.get(IClipboardService);
        const instaService = accessor.get(IInstantiationService);
        const snippet = await new Promise((resolve, reject) => {
            const { lineNumber, column } = editor.getPosition();
            const { snippet, name, langId } = Args.fromUser(arg);
            if (snippet) {
                return resolve(new Snippet(false, [], '', '', '', snippet, '', 1 /* SnippetSource.User */, `random/${Math.random()}`));
            }
            let languageId;
            if (langId) {
                if (!languageService.isRegisteredLanguageId(langId)) {
                    return resolve(undefined);
                }
                languageId = langId;
            }
            else {
                editor.getModel().tokenization.tokenizeIfCheap(lineNumber);
                languageId = editor.getModel().getLanguageIdAtPosition(lineNumber, column);
                // validate the `languageId` to ensure this is a user
                // facing language with a name and the chance to have
                // snippets, else fall back to the outer language
                if (!languageService.getLanguageName(languageId)) {
                    languageId = editor.getModel().getLanguageId();
                }
            }
            if (name) {
                // take selected snippet
                snippetService
                    .getSnippets(languageId, { includeNoPrefixSnippets: true })
                    .then((snippets) => snippets.find((snippet) => snippet.name === name))
                    .then(resolve, reject);
            }
            else {
                // let user pick a snippet
                resolve(instaService.invokeFunction(pickSnippet, languageId));
            }
        });
        if (!snippet) {
            return;
        }
        let clipboardText;
        if (snippet.needsClipboard) {
            clipboardText = await clipboardService.readText();
        }
        editor.focus();
        SnippetController2.get(editor)?.insert(snippet.codeSnippet, { clipboardText });
        snippetService.updateUsageTimestamp(snippet);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0U25pcHBldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL2Jyb3dzZXIvY29tbWFuZHMvaW5zZXJ0U25pcHBldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN4RyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBQzVDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFpQixNQUFNLG9CQUFvQixDQUFBO0FBRTNELE1BQU0sSUFBSTtJQUNULE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBUTtRQUN2QixJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUNuQixDQUFDO1FBQ0QsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFBO1FBQ25DLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7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
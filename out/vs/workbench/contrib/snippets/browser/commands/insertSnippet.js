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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0U25pcHBldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9jb21tYW5kcy9pbnNlcnRTbmlwcGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQ3hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUE7QUFDNUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ2pELE9BQU8sRUFBRSxPQUFPLEVBQWlCLE1BQU0sb0JBQW9CLENBQUE7QUFFM0QsTUFBTSxJQUFJO0lBQ1QsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFRO1FBQ3ZCLElBQUksQ0FBQyxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDckMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQ25CLENBQUM7UUFDRCxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUE7UUFDbkMsSUFBSSxPQUFPLE9B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
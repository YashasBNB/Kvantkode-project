/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { groupBy, isFalsyOrEmpty } from '../../../../../base/common/arrays.js';
import { compare } from '../../../../../base/common/strings.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { SnippetController2 } from '../../../../../editor/contrib/snippet/browser/snippetController2.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { SnippetsAction } from './abstractSnippetsActions.js';
import { ISnippetsService } from '../snippets.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
export class ApplyFileSnippetAction extends SnippetsAction {
    static { this.Id = 'workbench.action.populateFileFromSnippet'; }
    constructor() {
        super({
            id: ApplyFileSnippetAction.Id,
            title: localize2('label', 'Fill File with Snippet'),
            f1: true,
        });
    }
    async run(accessor) {
        const snippetService = accessor.get(ISnippetsService);
        const quickInputService = accessor.get(IQuickInputService);
        const editorService = accessor.get(IEditorService);
        const langService = accessor.get(ILanguageService);
        const editor = getCodeEditor(editorService.activeTextEditorControl);
        if (!editor || !editor.hasModel()) {
            return;
        }
        const snippets = await snippetService.getSnippets(undefined, {
            fileTemplateSnippets: true,
            noRecencySort: true,
            includeNoPrefixSnippets: true,
        });
        if (snippets.length === 0) {
            return;
        }
        const selection = await this._pick(quickInputService, langService, snippets);
        if (!selection) {
            return;
        }
        if (editor.hasModel()) {
            // apply snippet edit -> replaces everything
            SnippetController2.get(editor)?.apply([
                {
                    range: editor.getModel().getFullModelRange(),
                    template: selection.snippet.body,
                },
            ]);
            // set language if possible
            editor
                .getModel()
                .setLanguage(langService.createById(selection.langId), ApplyFileSnippetAction.Id);
            editor.focus();
        }
    }
    async _pick(quickInputService, langService, snippets) {
        const all = [];
        for (const snippet of snippets) {
            if (isFalsyOrEmpty(snippet.scopes)) {
                all.push({ langId: '', snippet });
            }
            else {
                for (const langId of snippet.scopes) {
                    all.push({ langId, snippet });
                }
            }
        }
        const picks = [];
        const groups = groupBy(all, (a, b) => compare(a.langId, b.langId));
        for (const group of groups) {
            let first = true;
            for (const item of group) {
                if (first) {
                    picks.push({
                        type: 'separator',
                        label: langService.getLanguageName(item.langId) ?? item.langId,
                    });
                    first = false;
                }
                picks.push({
                    snippet: item,
                    label: item.snippet.prefix || item.snippet.name,
                    detail: item.snippet.description,
                });
            }
        }
        const pick = await quickInputService.pick(picks, {
            placeHolder: localize('placeholder', 'Select a snippet'),
            matchOnDetail: true,
        });
        return pick?.snippet;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVRlbXBsYXRlU25pcHBldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy9icm93c2VyL2NvbW1hbmRzL2ZpbGVUZW1wbGF0ZVNuaXBwZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRTNELE9BQU8sRUFDTixrQkFBa0IsR0FHbEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFakQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRXBGLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxjQUFjO2FBQ3pDLE9BQUUsR0FBRywwQ0FBMEMsQ0FBQTtJQUUvRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFO1lBQzdCLEtBQUssRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLHdCQUF3QixDQUFDO1lBQ25ELEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVE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
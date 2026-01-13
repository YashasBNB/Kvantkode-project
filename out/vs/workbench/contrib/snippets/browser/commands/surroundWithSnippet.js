/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { SnippetController2 } from '../../../../../editor/contrib/snippet/browser/snippetController2.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { SnippetEditorAction } from './abstractSnippetsActions.js';
import { pickSnippet } from '../snippetPicker.js';
import { ISnippetsService } from '../snippets.js';
import { localize2 } from '../../../../../nls.js';
export async function getSurroundableSnippets(snippetsService, model, position, includeDisabledSnippets) {
    const { lineNumber, column } = position;
    model.tokenization.tokenizeIfCheap(lineNumber);
    const languageId = model.getLanguageIdAtPosition(lineNumber, column);
    const allSnippets = await snippetsService.getSnippets(languageId, {
        includeNoPrefixSnippets: true,
        includeDisabledSnippets,
    });
    return allSnippets.filter((snippet) => snippet.usesSelection);
}
export class SurroundWithSnippetEditorAction extends SnippetEditorAction {
    static { this.options = {
        id: 'editor.action.surroundWithSnippet',
        title: localize2('label', 'Surround with Snippet...'),
    }; }
    constructor() {
        super({
            ...SurroundWithSnippetEditorAction.options,
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasNonEmptySelection),
            f1: true,
        });
    }
    async runEditorCommand(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const instaService = accessor.get(IInstantiationService);
        const snippetsService = accessor.get(ISnippetsService);
        const clipboardService = accessor.get(IClipboardService);
        const snippets = await getSurroundableSnippets(snippetsService, editor.getModel(), editor.getPosition(), true);
        if (!snippets.length) {
            return;
        }
        const snippet = await instaService.invokeFunction(pickSnippet, snippets);
        if (!snippet) {
            return;
        }
        let clipboardText;
        if (snippet.needsClipboard) {
            clipboardText = await clipboardService.readText();
        }
        editor.focus();
        SnippetController2.get(editor)?.insert(snippet.codeSnippet, { clipboardText });
        snippetsService.updateUsageTimestamp(snippet);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Vycm91bmRXaXRoU25pcHBldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9jb21tYW5kcy9zdXJyb3VuZFdpdGhTbmlwcGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRWpELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ2pELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVqRCxNQUFNLENBQUMsS0FBSyxVQUFVLHVCQUF1QixDQUM1QyxlQUFpQyxFQUNqQyxLQUFpQixFQUNqQixRQUFrQixFQUNsQix1QkFBZ0M7SUFFaEMsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUE7SUFDdkMsS0FBSyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDOUMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUVwRSxNQUFNLFdBQVcsR0FBRyxNQUFNLGVBQWUsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFO1FBQ2pFLHVCQUF1QixFQUFFLElBQUk7UUFDN0IsdUJBQXVCO0tBQ3ZCLENBQUMsQ0FBQTtJQUNGLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0FBQzlELENBQUM7QUFFRCxNQUFNLE9BQU8sK0JBQWdDLFNBQVEsbUJBQW1CO2FBQ3ZELFlBQU8sR0FBRztRQUN6QixFQUFFLEVBQUUsbUNBQW1DO1FBQ3ZDLEtBQUssRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLDBCQUEwQixDQUFDO0tBQ3JELENBQUE7SUFFRDtRQUNDLEtBQUssQ0FBQztZQUNMLEdBQUcsK0JBQStCLENBQUMsT0FBTztZQUMxQyxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDL0IsaUJBQWlCLENBQUMsUUFBUSxFQUMxQixpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FDdEM7WUFDRCxFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUNyRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDeEQsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRXhELE1BQU0sUUFBUSxHQUFHLE1BQU0sdUJBQXVCLENBQzdDLGVBQWUsRUFDZixNQUFNLENBQUMsUUFBUSxFQUFFLEVBQ2pCLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFDcEIsSUFBSSxDQUNKLENBQUE7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxZQUFZLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN4RSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksYUFBaUMsQ0FBQTtRQUNyQyxJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM1QixhQUFhLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNsRCxDQUFDO1FBRUQsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2Qsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQTtRQUM5RSxlQUFlLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDOUMsQ0FBQyJ9
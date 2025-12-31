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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Vycm91bmRXaXRoU25pcHBldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL2Jyb3dzZXIvY29tbWFuZHMvc3Vycm91bmRXaXRoU25pcHBldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVqRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFakQsTUFBTSxDQUFDLEtBQUssVUFBVSx1QkFBdUIsQ0FDNUMsZUFBaUMsRUFDakMsS0FBaUIsRUFDakIsUUFBa0IsRUFDbEIsdUJBQWdDO0lBRWhDLE1BQU0sRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFBO0lBQ3ZDLEtBQUssQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzlDLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFFcEUsTUFBTSxXQUFXLEdBQUcsTUFBTSxlQUFlLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRTtRQUNqRSx1QkFBdUIsRUFBRSxJQUFJO1FBQzdCLHVCQUF1QjtLQUN2QixDQUFDLENBQUE7SUFDRixPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUM5RCxDQUFDO0FBRUQsTUFBTSxPQUFPLCtCQUFnQyxTQUFRLG1CQUFtQjthQUN2RCxZQUFPLEdBQUc7UUFDekIsRUFBRSxFQUFFLG1DQUFtQztRQUN2QyxLQUFLLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSwwQkFBMEIsQ0FBQztLQUNyRCxDQUFBO0lBRUQ7UUFDQyxLQUFLLENBQUM7WUFDTCxHQUFHLCtCQUErQixDQUFDLE9BQU87WUFDMUMsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLGlCQUFpQixDQUFDLFFBQVEsRUFDMUIsaUJBQWlCLENBQUMsb0JBQW9CLENBQ3RDO1lBQ0QsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDckUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUN0RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUV4RCxNQUFNLFFBQVEsR0FBRyxNQUFNLHVCQUF1QixDQUM3QyxlQUFlLEVBQ2YsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUNqQixNQUFNLENBQUMsV0FBVyxFQUFFLEVBQ3BCLElBQUksQ0FDSixDQUFBO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sWUFBWSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDeEUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLGFBQWlDLENBQUE7UUFDckMsSUFBSSxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDNUIsYUFBYSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDbEQsQ0FBQztRQUVELE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNkLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUE7UUFDOUUsZUFBZSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzlDLENBQUMifQ==
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { instantiateTestCodeEditor, createCodeEditorServices } from './testCodeEditor.js';
import { instantiateTextModel } from '../common/testTextModel.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
export function testCommand(lines, languageId, selection, commandFactory, expectedLines, expectedSelection, forceTokenization, prepare) {
    const disposables = new DisposableStore();
    const instantiationService = createCodeEditorServices(disposables);
    if (prepare) {
        instantiationService.invokeFunction(prepare, disposables);
    }
    const model = disposables.add(instantiateTextModel(instantiationService, lines.join('\n'), languageId));
    const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model));
    const viewModel = editor.getViewModel();
    if (forceTokenization) {
        model.tokenization.forceTokenization(model.getLineCount());
    }
    viewModel.setSelections('tests', [selection]);
    const command = instantiationService.invokeFunction((accessor) => commandFactory(accessor, viewModel.getSelection()));
    viewModel.executeCommand(command, 'tests');
    assert.deepStrictEqual(model.getLinesContent(), expectedLines);
    const actualSelection = viewModel.getSelection();
    assert.deepStrictEqual(actualSelection.toString(), expectedSelection.toString());
    disposables.dispose();
}
/**
 * Extract edit operations if command `command` were to execute on model `model`
 */
export function getEditOperation(model, command) {
    const operations = [];
    const editOperationBuilder = {
        addEditOperation: (range, text, forceMoveMarkers = false) => {
            operations.push({
                range: range,
                text: text,
                forceMoveMarkers: forceMoveMarkers,
            });
        },
        addTrackedEditOperation: (range, text, forceMoveMarkers = false) => {
            operations.push({
                range: range,
                text: text,
                forceMoveMarkers: forceMoveMarkers,
            });
        },
        trackSelection: (selection) => {
            return '';
        },
    };
    command.getEditOperations(model, editOperationBuilder);
    return operations;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3Rlc3RDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUszQixPQUFPLEVBQUUseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHbkUsTUFBTSxVQUFVLFdBQVcsQ0FDMUIsS0FBZSxFQUNmLFVBQXlCLEVBQ3pCLFNBQW9CLEVBQ3BCLGNBQThFLEVBQzlFLGFBQXVCLEVBQ3ZCLGlCQUE0QixFQUM1QixpQkFBMkIsRUFDM0IsT0FBNEU7SUFFNUUsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxNQUFNLG9CQUFvQixHQUFHLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ2xFLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFDRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QixvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUN4RSxDQUFBO0lBQ0QsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQ3RGLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUcsQ0FBQTtJQUV4QyxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDdkIsS0FBSyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBRUQsU0FBUyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO0lBRTdDLE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ2hFLGNBQWMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQ2xELENBQUE7SUFDRCxTQUFTLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUUxQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUU5RCxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7SUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUVoRixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7QUFDdEIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUFDLEtBQWlCLEVBQUUsT0FBaUI7SUFDcEUsTUFBTSxVQUFVLEdBQTJCLEVBQUUsQ0FBQTtJQUM3QyxNQUFNLG9CQUFvQixHQUEwQjtRQUNuRCxnQkFBZ0IsRUFBRSxDQUFDLEtBQWEsRUFBRSxJQUFZLEVBQUUsbUJBQTRCLEtBQUssRUFBRSxFQUFFO1lBQ3BGLFVBQVUsQ0FBQyxJQUFJLENBQUM7Z0JBQ2YsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osSUFBSSxFQUFFLElBQUk7Z0JBQ1YsZ0JBQWdCLEVBQUUsZ0JBQWdCO2FBQ2xDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCx1QkFBdUIsRUFBRSxDQUFDLEtBQWEsRUFBRSxJQUFZLEVBQUUsbUJBQTRCLEtBQUssRUFBRSxFQUFFO1lBQzNGLFVBQVUsQ0FBQyxJQUFJLENBQUM7Z0JBQ2YsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osSUFBSSxFQUFFLElBQUk7Z0JBQ1YsZ0JBQWdCLEVBQUUsZ0JBQWdCO2FBQ2xDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxjQUFjLEVBQUUsQ0FBQyxTQUFxQixFQUFFLEVBQUU7WUFDekMsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO0tBQ0QsQ0FBQTtJQUNELE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtJQUN0RCxPQUFPLFVBQVUsQ0FBQTtBQUNsQixDQUFDIn0=
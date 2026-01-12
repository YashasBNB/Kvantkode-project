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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvdGVzdENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBSzNCLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRWpFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUduRSxNQUFNLFVBQVUsV0FBVyxDQUMxQixLQUFlLEVBQ2YsVUFBeUIsRUFDekIsU0FBb0IsRUFDcEIsY0FBOEUsRUFDOUUsYUFBdUIsRUFDdkIsaUJBQTRCLEVBQzVCLGlCQUEyQixFQUMzQixPQUE0RTtJQUU1RSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLE1BQU0sb0JBQW9CLEdBQUcsd0JBQXdCLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDbEUsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNiLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUNELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzVCLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQ3hFLENBQUE7SUFDRCxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDdEYsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksRUFBRyxDQUFBO0lBRXhDLElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUN2QixLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFRCxTQUFTLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFFN0MsTUFBTSxPQUFPLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDaEUsY0FBYyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FDbEQsQ0FBQTtJQUNELFNBQVMsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBRTFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBRTlELE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtJQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBRWhGLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUN0QixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsS0FBaUIsRUFBRSxPQUFpQjtJQUNwRSxNQUFNLFVBQVUsR0FBMkIsRUFBRSxDQUFBO0lBQzdDLE1BQU0sb0JBQW9CLEdBQTBCO1FBQ25ELGdCQUFnQixFQUFFLENBQUMsS0FBYSxFQUFFLElBQVksRUFBRSxtQkFBNEIsS0FBSyxFQUFFLEVBQUU7WUFDcEYsVUFBVSxDQUFDLElBQUksQ0FBQztnQkFDZixLQUFLLEVBQUUsS0FBSztnQkFDWixJQUFJLEVBQUUsSUFBSTtnQkFDVixnQkFBZ0IsRUFBRSxnQkFBZ0I7YUFDbEMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELHVCQUF1QixFQUFFLENBQUMsS0FBYSxFQUFFLElBQVksRUFBRSxtQkFBNEIsS0FBSyxFQUFFLEVBQUU7WUFDM0YsVUFBVSxDQUFDLElBQUksQ0FBQztnQkFDZixLQUFLLEVBQUUsS0FBSztnQkFDWixJQUFJLEVBQUUsSUFBSTtnQkFDVixnQkFBZ0IsRUFBRSxnQkFBZ0I7YUFDbEMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELGNBQWMsRUFBRSxDQUFDLFNBQXFCLEVBQUUsRUFBRTtZQUN6QyxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7S0FDRCxDQUFBO0lBQ0QsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0lBQ3RELE9BQU8sVUFBVSxDQUFBO0FBQ2xCLENBQUMifQ==
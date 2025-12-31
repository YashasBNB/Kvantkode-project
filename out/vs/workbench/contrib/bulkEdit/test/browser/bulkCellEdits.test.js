/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { URI } from '../../../../../base/common/uri.js';
import { mockObject } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { UndoRedoGroup, UndoRedoSource } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { BulkCellEdits, ResourceNotebookCellEdit } from '../../browser/bulkCellEdits.js';
import { CellUri, } from '../../../notebook/common/notebookCommon.js';
import { TestEditorService } from '../../../../test/browser/workbenchTestServices.js';
suite('BulkCellEdits', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    async function runTest(inputUri, resolveUri) {
        const progress = { report: (_) => { } };
        const editorService = store.add(new TestEditorService());
        const notebook = mockObject()();
        notebook.uri.returns(URI.file('/project/notebook.ipynb'));
        const notebookEditorModel = mockObject()({
            notebook: notebook,
        });
        notebookEditorModel.isReadonly.returns(false);
        const notebookService = mockObject()();
        notebookService.resolve.returns({ object: notebookEditorModel, dispose: () => { } });
        const edits = [
            new ResourceNotebookCellEdit(inputUri, {
                index: 0,
                count: 1,
                editType: 1 /* CellEditType.Replace */,
                cells: [],
            }),
        ];
        const bce = new BulkCellEdits(new UndoRedoGroup(), new UndoRedoSource(), progress, CancellationToken.None, edits, editorService, notebookService);
        await bce.apply();
        const resolveArgs = notebookService.resolve.args[0];
        assert.strictEqual(resolveArgs[0].toString(), resolveUri.toString());
    }
    const notebookUri = URI.file('/foo/bar.ipynb');
    test('works with notebook URI', async () => {
        await runTest(notebookUri, notebookUri);
    });
    test('maps cell URI to notebook URI', async () => {
        await runTest(CellUri.generate(notebookUri, 5), notebookUri);
    });
    test('throws for invalid cell URI', async () => {
        const badCellUri = CellUri.generate(notebookUri, 5).with({ fragment: '' });
        await assert.rejects(async () => await runTest(badCellUri, notebookUri));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0NlbGxFZGl0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvdGVzdC9icm93c2VyL2J1bGtDZWxsRWRpdHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV4RixPQUFPLEVBRU4sT0FBTyxHQUVQLE1BQU0sNENBQTRDLENBQUE7QUFFbkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFckYsS0FBSyxDQUFDLGVBQWUsRUFBRTtJQUN0QixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELEtBQUssVUFBVSxPQUFPLENBQUMsUUFBYSxFQUFFLFVBQWU7UUFDcEQsTUFBTSxRQUFRLEdBQW9CLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRSxDQUFDLEVBQUUsQ0FBQTtRQUN2RCxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBRXhELE1BQU0sUUFBUSxHQUFHLFVBQVUsRUFBcUIsRUFBRSxDQUFBO1FBQ2xELFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFBO1FBRXpELE1BQU0sbUJBQW1CLEdBQUcsVUFBVSxFQUFnQyxDQUFDO1lBQ3RFLFFBQVEsRUFBRSxRQUFlO1NBQ3pCLENBQUMsQ0FBQTtRQUNGLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFN0MsTUFBTSxlQUFlLEdBQUcsVUFBVSxFQUF1QyxFQUFFLENBQUE7UUFDM0UsZUFBZSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxNQUFNLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFbkYsTUFBTSxLQUFLLEdBQUc7WUFDYixJQUFJLHdCQUF3QixDQUFDLFFBQVEsRUFBRTtnQkFDdEMsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsUUFBUSw4QkFBc0I7Z0JBQzlCLEtBQUssRUFBRSxFQUFFO2FBQ1QsQ0FBQztTQUNGLENBQUE7UUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLGFBQWEsQ0FDNUIsSUFBSSxhQUFhLEVBQUUsRUFDbkIsSUFBSSxjQUFjLEVBQUUsRUFDcEIsUUFBUSxFQUNSLGlCQUFpQixDQUFDLElBQUksRUFDdEIsS0FBSyxFQUNMLGFBQWEsRUFDYixlQUFzQixDQUN0QixDQUFBO1FBQ0QsTUFBTSxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFakIsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUVELE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUM5QyxJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUMsTUFBTSxPQUFPLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ3hDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtCQUErQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hELE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQzdELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLE1BQU0sT0FBTyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO0lBQ3pFLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==
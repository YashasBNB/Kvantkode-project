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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0NlbGxFZGl0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9idWxrRWRpdC90ZXN0L2Jyb3dzZXIvYnVsa0NlbGxFZGl0cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXhGLE9BQU8sRUFFTixPQUFPLEdBRVAsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVuRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVyRixLQUFLLENBQUMsZUFBZSxFQUFFO0lBQ3RCLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsS0FBSyxVQUFVLE9BQU8sQ0FBQyxRQUFhLEVBQUUsVUFBZTtRQUNwRCxNQUFNLFFBQVEsR0FBb0IsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFFLENBQUMsRUFBRSxDQUFBO1FBQ3ZELE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFFeEQsTUFBTSxRQUFRLEdBQUcsVUFBVSxFQUFxQixFQUFFLENBQUE7UUFDbEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUE7UUFFekQsTUFBTSxtQkFBbUIsR0FBRyxVQUFVLEVBQWdDLENBQUM7WUFDdEUsUUFBUSxFQUFFLFFBQWU7U0FDekIsQ0FBQyxDQUFBO1FBQ0YsbUJBQW1CLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUU3QyxNQUFNLGVBQWUsR0FBRyxVQUFVLEVBQXVDLEVBQUUsQ0FBQTtRQUMzRSxlQUFlLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE1BQU0sRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVuRixNQUFNLEtBQUssR0FBRztZQUNiLElBQUksd0JBQXdCLENBQUMsUUFBUSxFQUFFO2dCQUN0QyxLQUFLLEVBQUUsQ0FBQztnQkFDUixLQUFLLEVBQUUsQ0FBQztnQkFDUixRQUFRLDhCQUFzQjtnQkFDOUIsS0FBSyxFQUFFLEVBQUU7YUFDVCxDQUFDO1NBQ0YsQ0FBQTtRQUNELE1BQU0sR0FBRyxHQUFHLElBQUksYUFBYSxDQUM1QixJQUFJLGFBQWEsRUFBRSxFQUNuQixJQUFJLGNBQWMsRUFBRSxFQUNwQixRQUFRLEVBQ1IsaUJBQWlCLENBQUMsSUFBSSxFQUN0QixLQUFLLEVBQ0wsYUFBYSxFQUNiLGVBQXNCLENBQ3RCLENBQUE7UUFDRCxNQUFNLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUVqQixNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBRUQsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQzlDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMxQyxNQUFNLE9BQU8sQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDeEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0JBQStCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEQsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDMUUsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsTUFBTSxPQUFPLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7SUFDekUsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9
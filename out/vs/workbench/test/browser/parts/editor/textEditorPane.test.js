/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { workbenchInstantiationService, TestServiceAccessor, registerTestFileEditor, createEditorPart, } from '../../workbenchTestServices.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { EditorService } from '../../../../services/editor/browser/editorService.js';
import { isEditorPaneWithSelection, } from '../../../../common/editor.js';
import { DeferredPromise } from '../../../../../base/common/async.js';
import { TextEditorPaneSelection } from '../../../../browser/parts/editor/textEditor.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
suite('TextEditorPane', () => {
    const disposables = new DisposableStore();
    setup(() => {
        disposables.add(registerTestFileEditor());
    });
    teardown(() => {
        disposables.clear();
    });
    async function createServices() {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        return instantiationService.createInstance(TestServiceAccessor);
    }
    test('editor pane selection', async function () {
        const accessor = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        let pane = (await accessor.editorService.openEditor({ resource }));
        assert.ok(pane && isEditorPaneWithSelection(pane));
        const onDidFireSelectionEventOfEditType = new DeferredPromise();
        disposables.add(pane.onDidChangeSelection((e) => {
            if (e.reason === 3 /* EditorPaneSelectionChangeReason.EDIT */) {
                onDidFireSelectionEventOfEditType.complete(e);
            }
        }));
        // Changing model reports selection change
        // of EDIT kind
        const model = disposables.add((await accessor.textFileService.files.resolve(resource)));
        model.textEditorModel.setValue('Hello World');
        const event = await onDidFireSelectionEventOfEditType.p;
        assert.strictEqual(event.reason, 3 /* EditorPaneSelectionChangeReason.EDIT */);
        // getSelection() works and can be restored
        //
        // Note: this is a bit bogus because in tests our code editors have
        //       no view and no cursor can be set as such. So the selection
        //       will always report for the first line and column.
        pane.setSelection(new Selection(1, 1, 1, 1), 2 /* EditorPaneSelectionChangeReason.USER */);
        const selection = pane.getSelection();
        assert.ok(selection);
        await pane.group.closeAllEditors();
        const options = selection.restore({});
        pane = (await accessor.editorService.openEditor({ resource, options }));
        assert.ok(pane && isEditorPaneWithSelection(pane));
        const newSelection = pane.getSelection();
        assert.ok(newSelection);
        assert.strictEqual(newSelection.compare(selection), 1 /* EditorPaneSelectionCompareResult.IDENTICAL */);
        await model.revert();
        await pane.group.closeAllEditors();
    });
    test('TextEditorPaneSelection', function () {
        const sel1 = new TextEditorPaneSelection(new Selection(1, 1, 2, 2));
        const sel2 = new TextEditorPaneSelection(new Selection(5, 5, 6, 6));
        const sel3 = new TextEditorPaneSelection(new Selection(50, 50, 60, 60));
        const sel4 = {
            compare: () => {
                throw new Error();
            },
            restore: (options) => options,
        };
        assert.strictEqual(sel1.compare(sel1), 1 /* EditorPaneSelectionCompareResult.IDENTICAL */);
        assert.strictEqual(sel1.compare(sel2), 2 /* EditorPaneSelectionCompareResult.SIMILAR */);
        assert.strictEqual(sel1.compare(sel3), 3 /* EditorPaneSelectionCompareResult.DIFFERENT */);
        assert.strictEqual(sel1.compare(sel4), 3 /* EditorPaneSelectionCompareResult.DIFFERENT */);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvclBhbmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcGFydHMvZWRpdG9yL3RleHRFZGl0b3JQYW5lLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN0QixnQkFBZ0IsR0FFaEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFJTix5QkFBeUIsR0FDekIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDckUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRzFFLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsV0FBVyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUE7SUFDMUMs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
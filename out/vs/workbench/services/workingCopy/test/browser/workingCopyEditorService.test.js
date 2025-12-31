/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EditorService } from '../../../editor/browser/editorService.js';
import { IEditorGroupsService } from '../../../editor/common/editorGroupsService.js';
import { UntitledTextEditorInput } from '../../../untitled/common/untitledTextEditorInput.js';
import { WorkingCopyEditorService, } from '../../common/workingCopyEditorService.js';
import { createEditorPart, registerTestResourceEditor, TestEditorService, TestServiceAccessor, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
import { TestWorkingCopy } from '../../../../test/common/workbenchTestServices.js';
suite('WorkingCopyEditorService', () => {
    const disposables = new DisposableStore();
    setup(() => {
        disposables.add(registerTestResourceEditor());
    });
    teardown(() => {
        disposables.clear();
    });
    test('registry - basics', () => {
        const service = disposables.add(new WorkingCopyEditorService(disposables.add(new TestEditorService())));
        let handlerEvent = undefined;
        disposables.add(service.onDidRegisterHandler((handler) => {
            handlerEvent = handler;
        }));
        const editorHandler = {
            handles: (workingCopy) => false,
            isOpen: () => false,
            createEditor: (workingCopy) => {
                throw new Error();
            },
        };
        disposables.add(service.registerHandler(editorHandler));
        assert.strictEqual(handlerEvent, editorHandler);
    });
    test('findEditor', async () => {
        const disposables = new DisposableStore();
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        const service = disposables.add(new WorkingCopyEditorService(editorService));
        const resource = URI.parse('custom://some/folder/custom.txt');
        const testWorkingCopy = disposables.add(new TestWorkingCopy(resource, false, 'testWorkingCopyTypeId1'));
        assert.strictEqual(service.findEditor(testWorkingCopy), undefined);
        const editorHandler = {
            handles: (workingCopy) => workingCopy === testWorkingCopy,
            isOpen: (workingCopy, editor) => workingCopy === testWorkingCopy,
            createEditor: (workingCopy) => {
                throw new Error();
            },
        };
        disposables.add(service.registerHandler(editorHandler));
        const editor1 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
        const editor2 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
        await editorService.openEditors([{ editor: editor1 }, { editor: editor2 }]);
        assert.ok(service.findEditor(testWorkingCopy));
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlFZGl0b3JTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9icm93c2VyL3dvcmtpbmdDb3B5RWRpdG9yU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM3RixPQUFPLEVBRU4sd0JBQXdCLEdBQ3hCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUNOLGdCQUFnQixFQUNoQiwwQkFBMEIsRUFDMUIsaUJBQWlCLEVBQ2pCLG1CQUFtQixFQUNuQiw2QkFBNkIsR0FDN0IsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFbEYsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUN0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FB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
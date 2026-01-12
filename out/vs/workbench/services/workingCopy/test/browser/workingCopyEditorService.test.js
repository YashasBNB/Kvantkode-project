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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlFZGl0b3JTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS90ZXN0L2Jyb3dzZXIvd29ya2luZ0NvcHlFZGl0b3JTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzdGLE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLDBCQUEwQixFQUMxQixpQkFBaUIsRUFDakIsbUJBQW1CLEVBQ25CLDZCQUE2QixHQUM3QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVsRixLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBQ3RDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFBO0lBQzlDLENBQUMsQ0FB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
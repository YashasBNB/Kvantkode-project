/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService, TestServiceAccessor, registerTestEditor, registerTestFileEditor, registerTestResourceEditor, TestFileEditorInput, createEditorPart, registerTestSideBySideEditor, TestEditorInput, } from '../../workbenchTestServices.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { IEditorGroupsService, } from '../../../../services/editor/common/editorGroupsService.js';
import { EditorService } from '../../../../services/editor/browser/editorService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { URI } from '../../../../../base/common/uri.js';
import { resolveCommandsContext } from '../../../../browser/parts/editor/editorCommandsContext.js';
class TestListService {
    constructor() {
        this.lastFocusedList = undefined;
    }
}
suite('Resolving Editor Commands Context', () => {
    const disposables = new DisposableStore();
    const TEST_EDITOR_ID = 'MyTestEditorForEditors';
    let instantiationService;
    let accessor;
    const testListService = new TestListService();
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.untitledTextEditorService);
        disposables.add(registerTestFileEditor());
        disposables.add(registerTestSideBySideEditor());
        disposables.add(registerTestResourceEditor());
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput)]));
    });
    teardown(() => {
        disposables.clear();
    });
    let index = 0;
    function input(id = String(index++)) {
        return disposables.add(new TestEditorInput(URI.parse(`file://${id}`), 'testInput'));
    }
    async function createServices() {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        return instantiationService.createInstance(TestServiceAccessor);
    }
    test('use editor group selection', async () => {
        const accessor = await createServices();
        const activeGroup = accessor.editorGroupService.activeGroup;
        const input1 = input();
        const input2 = input();
        const input3 = input();
        activeGroup.openEditor(input1, { pinned: true });
        activeGroup.openEditor(input2, { pinned: true });
        activeGroup.openEditor(input3, { pinned: true });
        activeGroup.setSelection(input1, [input2]);
        // use editor commands context
        const editorCommandContext = {
            groupId: activeGroup.id,
            editorIndex: activeGroup.getIndexOfEditor(input1),
            preserveFocus: true,
        };
        const resolvedContext1 = resolveCommandsContext([editorCommandContext], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext1.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].group.id, activeGroup.id);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors.length, 2);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors[0], input1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors[1], input2);
        assert.strictEqual(resolvedContext1.preserveFocus, true);
        // use URI
        const resolvedContext2 = resolveCommandsContext([input2.resource], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext2.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext2.groupedEditors[0].group.id, activeGroup.id);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors.length, 2);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors[0], input2);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors[1], input1);
        assert.strictEqual(resolvedContext2.preserveFocus, false);
        // use URI and commandContext
        const editor1CommandContext = {
            groupId: activeGroup.id,
            editorIndex: activeGroup.getIndexOfEditor(input1),
            preserveFocus: true,
        };
        const resolvedContext3 = resolveCommandsContext([editor1CommandContext], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext3.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext3.groupedEditors[0].group.id, activeGroup.id);
        assert.strictEqual(resolvedContext3.groupedEditors[0].editors.length, 2);
        assert.strictEqual(resolvedContext3.groupedEditors[0].editors[0], input1);
        assert.strictEqual(resolvedContext3.groupedEditors[0].editors[1], input2);
        assert.strictEqual(resolvedContext3.preserveFocus, true);
    });
    test("don't use editor group selection", async () => {
        const accessor = await createServices();
        const activeGroup = accessor.editorGroupService.activeGroup;
        const input1 = input();
        const input2 = input();
        const input3 = input();
        activeGroup.openEditor(input1, { pinned: true });
        activeGroup.openEditor(input2, { pinned: true });
        activeGroup.openEditor(input3, { pinned: true });
        activeGroup.setSelection(input1, [input2]);
        // use editor commands context
        const editorCommandContext = {
            groupId: activeGroup.id,
            editorIndex: activeGroup.getIndexOfEditor(input3),
            preserveFocus: true,
        };
        const resolvedContext1 = resolveCommandsContext([editorCommandContext], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext1.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].group.id, activeGroup.id);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors[0], input3);
        assert.strictEqual(resolvedContext1.preserveFocus, true);
        // use URI
        const resolvedContext2 = resolveCommandsContext([input3.resource], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext2.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext2.groupedEditors[0].group.id, activeGroup.id);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors.length, 1);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors[0], input3);
        assert.strictEqual(resolvedContext2.preserveFocus, false);
    });
    test('inactive edior group command context', async () => {
        const accessor = await createServices();
        const editorGroupService = accessor.editorGroupService;
        const group1 = editorGroupService.activeGroup;
        const group2 = editorGroupService.addGroup(group1, 3 /* GroupDirection.RIGHT */);
        const input11 = input();
        const input12 = input();
        group1.openEditor(input11, { pinned: true });
        group1.openEditor(input12, { pinned: true });
        const input21 = input();
        group2.openEditor(input21, { pinned: true });
        editorGroupService.activateGroup(group1);
        group1.setSelection(input11, [input12]);
        // use editor commands context of inactive group with editor index
        const editorCommandContext1 = {
            groupId: group2.id,
            editorIndex: group2.getIndexOfEditor(input21),
            preserveFocus: true,
        };
        const resolvedContext1 = resolveCommandsContext([editorCommandContext1], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext1.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].group.id, group2.id);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors[0], input21);
        assert.strictEqual(resolvedContext1.preserveFocus, true);
        // use editor commands context of inactive group without editor index
        const editorCommandContext2 = {
            groupId: group2.id,
            preserveFocus: true,
        };
        const resolvedContext2 = resolveCommandsContext([editorCommandContext2], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext2.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext2.groupedEditors[0].group.id, group2.id);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors[0], input21);
        assert.strictEqual(resolvedContext2.preserveFocus, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbWFuZHNDb250ZXh0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvckNvbW1hbmRzQ29udGV4dC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixFQUNuQixrQkFBa0IsRUFDbEIsc0JBQXNCLEVBQ3RCLDBCQUEwQixFQUMxQixtQkFBbUIsRUFDbkIsZ0JBQWdCLEVBQ2hCLDRCQUE0QixFQUM1QixlQUFlLEdBQ2YsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzVGLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRXBGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQU9sRyxNQUFNLGVBQWU7SUFBckI7UUFFVSxvQkFBZSxHQUFvQyxTQUFTLENBQUE7SUFDdEUsQ0FBQztDQUFBO0FBRUQsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtJQUMvQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUs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
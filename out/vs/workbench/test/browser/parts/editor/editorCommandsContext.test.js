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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbWFuZHNDb250ZXh0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JDb21tYW5kc0NvbnRleHQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixtQkFBbUIsRUFDbkIsa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUN0QiwwQkFBMEIsRUFDMUIsbUJBQW1CLEVBQ25CLGdCQUFnQixFQUNoQiw0QkFBNEIsRUFDNUIsZUFBZSxHQUNmLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUM1RixPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVwRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFPbEcsTUFBTSxlQUFlO0lBQXJCO1FBRVUsb0JBQWUsR0FBb0MsU0FBUyxDQUFBO0lBQ3RFLENBQUM7Q0FBQTtBQUVELEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7SUFDL0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUs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
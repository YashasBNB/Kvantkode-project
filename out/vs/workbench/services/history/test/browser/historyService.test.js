/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestFileEditorInput, registerTestEditor, createEditorPart, registerTestFileEditor, TestServiceAccessor, workbenchTeardown, registerTestSideBySideEditor, } from '../../../../test/browser/workbenchTestServices.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { IEditorGroupsService } from '../../../editor/common/editorGroupsService.js';
import { EditorNavigationStack, HistoryService } from '../../browser/historyService.js';
import { IEditorService, SIDE_GROUP } from '../../../editor/common/editorService.js';
import { EditorService } from '../../../editor/browser/editorService.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IHistoryService } from '../../common/history.js';
import { DeferredPromise, timeout } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { isResourceEditorInput, } from '../../../../common/editor.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { FileChangesEvent, FileOperationEvent, } from '../../../../../platform/files/common/files.js';
import { isLinux } from '../../../../../base/common/platform.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
suite('HistoryService', function () {
    const TEST_EDITOR_ID = 'MyTestEditorForEditorHistory';
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForHistoyService';
    async function createServices(scope = 0 /* GoScope.DEFAULT */, configureSearchExclude = false) {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        const configurationService = new TestConfigurationService();
        if (scope === 1 /* GoScope.EDITOR_GROUP */) {
            configurationService.setUserConfiguration('workbench.editor.navigationScope', 'editorGroup');
        }
        else if (scope === 2 /* GoScope.EDITOR */) {
            configurationService.setUserConfiguration('workbench.editor.navigationScope', 'editor');
        }
        if (configureSearchExclude) {
            configurationService.setUserConfiguration('search', {
                exclude: { '**/node_modules/**': true },
            });
        }
        instantiationService.stub(IConfigurationService, configurationService);
        const historyService = disposables.add(instantiationService.createInstance(HistoryService));
        instantiationService.stub(IHistoryService, historyService);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        return [
            part,
            historyService,
            editorService,
            accessor.textFileService,
            instantiationService,
            configurationService,
        ];
    }
    const disposables = new DisposableStore();
    setup(() => {
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput)]));
        disposables.add(registerTestSideBySideEditor());
        disposables.add(registerTestFileEditor());
    });
    teardown(() => {
        disposables.clear();
    });
    test('back / forward: basics', async () => {
        const [part, historyService] = await createServices();
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input1, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input2, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        await historyService.goForward();
        assert.strictEqual(part.activeGroup.activeEditor, input2);
    });
    test('back / forward: is editor group aware', async function () {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const otherResource = toResource.call(this, '/path/other.html');
        const pane1 = await editorService.openEditor({ resource, options: { pinned: true } });
        const pane2 = await editorService.openEditor({ resource, options: { pinned: true } }, SIDE_GROUP);
        // [index.txt] | [>index.txt<]
        assert.notStrictEqual(pane1, pane2);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } }, pane2?.group);
        // [index.txt] | [index.txt] [>other.html<]
        await historyService.goBack();
        // [index.txt] | [>index.txt<] [other.html]
        assert.strictEqual(part.activeGroup.id, pane2?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource.toString());
        await historyService.goBack();
        // [>index.txt<] | [index.txt] [other.html]
        assert.strictEqual(part.activeGroup.id, pane1?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource.toString());
        await historyService.goForward();
        // [index.txt] | [>index.txt<] [other.html]
        assert.strictEqual(part.activeGroup.id, pane2?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource.toString());
        await historyService.goForward();
        // [index.txt] | [index.txt] [>other.html<]
        assert.strictEqual(part.activeGroup.id, pane2?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), otherResource.toString());
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: in-editor text selection changes (user)', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = (await editorService.openEditor({
            resource,
            options: { pinned: true },
        }));
        await setTextSelection(historyService, pane, new Selection(1, 2, 1, 2));
        await setTextSelection(historyService, pane, new Selection(15, 1, 15, 1)); // will be merged and dropped
        await setTextSelection(historyService, pane, new Selection(16, 1, 16, 1)); // will be merged and dropped
        await setTextSelection(historyService, pane, new Selection(17, 1, 17, 1));
        await setTextSelection(historyService, pane, new Selection(30, 5, 30, 8));
        await setTextSelection(historyService, pane, new Selection(40, 1, 40, 1));
        await historyService.goBack(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(30, 5, 30, 8), pane);
        await historyService.goBack(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(17, 1, 17, 1), pane);
        await historyService.goBack(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(1, 2, 1, 2), pane);
        await historyService.goForward(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(17, 1, 17, 1), pane);
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: in-editor text selection changes (navigation)', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = (await editorService.openEditor({
            resource,
            options: { pinned: true },
        }));
        await setTextSelection(historyService, pane, new Selection(2, 2, 2, 10)); // this is our starting point
        await setTextSelection(historyService, pane, new Selection(5, 3, 5, 20), 4 /* EditorPaneSelectionChangeReason.NAVIGATION */); // this is our first target definition
        await setTextSelection(historyService, pane, new Selection(120, 8, 120, 18), 4 /* EditorPaneSelectionChangeReason.NAVIGATION */); // this is our second target definition
        await setTextSelection(historyService, pane, new Selection(300, 3, 300, 20)); // unrelated user navigation
        await setTextSelection(historyService, pane, new Selection(500, 3, 500, 20)); // unrelated user navigation
        await setTextSelection(historyService, pane, new Selection(200, 3, 200, 20)); // unrelated user navigation
        await historyService.goBack(2 /* GoFilter.NAVIGATION */); // this should reveal the last navigation entry because we are not at it currently
        assertTextSelection(new Selection(120, 8, 120, 18), pane);
        await historyService.goBack(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goBack(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goForward(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(120, 8, 120, 18), pane);
        await historyService.goPrevious(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goPrevious(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(120, 8, 120, 18), pane);
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: in-editor text selection changes (jump)', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = (await editorService.openEditor({
            resource,
            options: { pinned: true },
        }));
        await setTextSelection(historyService, pane, new Selection(2, 2, 2, 10), 2 /* EditorPaneSelectionChangeReason.USER */);
        await setTextSelection(historyService, pane, new Selection(5, 3, 5, 20), 5 /* EditorPaneSelectionChangeReason.JUMP */);
        await setTextSelection(historyService, pane, new Selection(120, 8, 120, 18), 5 /* EditorPaneSelectionChangeReason.JUMP */);
        await historyService.goBack(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goBack(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(2, 2, 2, 10), pane);
        await historyService.goForward(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goLast(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(120, 8, 120, 18), pane);
        await historyService.goPrevious(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goPrevious(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(120, 8, 120, 18), pane);
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: selection changes with JUMP or NAVIGATION source are not merged (#143833)', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = (await editorService.openEditor({
            resource,
            options: { pinned: true },
        }));
        await setTextSelection(historyService, pane, new Selection(2, 2, 2, 10), 2 /* EditorPaneSelectionChangeReason.USER */);
        await setTextSelection(historyService, pane, new Selection(5, 3, 5, 20), 5 /* EditorPaneSelectionChangeReason.JUMP */);
        await setTextSelection(historyService, pane, new Selection(6, 3, 6, 20), 4 /* EditorPaneSelectionChangeReason.NAVIGATION */);
        await historyService.goBack(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goBack(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(2, 2, 2, 10), pane);
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: edit selection changes', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = (await editorService.openEditor({
            resource,
            options: { pinned: true },
        }));
        await setTextSelection(historyService, pane, new Selection(2, 2, 2, 10));
        await setTextSelection(historyService, pane, new Selection(50, 3, 50, 20), 3 /* EditorPaneSelectionChangeReason.EDIT */);
        await setTextSelection(historyService, pane, new Selection(300, 3, 300, 20)); // unrelated user navigation
        await setTextSelection(historyService, pane, new Selection(500, 3, 500, 20)); // unrelated user navigation
        await setTextSelection(historyService, pane, new Selection(200, 3, 200, 20)); // unrelated user navigation
        await setTextSelection(historyService, pane, new Selection(5, 3, 5, 20), 3 /* EditorPaneSelectionChangeReason.EDIT */);
        await setTextSelection(historyService, pane, new Selection(200, 3, 200, 20)); // unrelated user navigation
        await historyService.goBack(1 /* GoFilter.EDITS */); // this should reveal the last navigation entry because we are not at it currently
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goBack(1 /* GoFilter.EDITS */);
        assertTextSelection(new Selection(50, 3, 50, 20), pane);
        await historyService.goForward(1 /* GoFilter.EDITS */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        return workbenchTeardown(instantiationService);
    });
    async function setTextSelection(historyService, pane, selection, reason = 2 /* EditorPaneSelectionChangeReason.USER */) {
        const promise = Event.toPromise(historyService.onDidChangeEditorNavigationStack);
        pane.setSelection(selection, reason);
        await promise;
    }
    function assertTextSelection(expected, pane) {
        const options = pane.options;
        if (!options) {
            assert.fail('EditorPane has no selection');
        }
        assert.strictEqual(options.selection?.startLineNumber, expected.startLineNumber);
        assert.strictEqual(options.selection?.startColumn, expected.startColumn);
        assert.strictEqual(options.selection?.endLineNumber, expected.endLineNumber);
        assert.strictEqual(options.selection?.endColumn, expected.endColumn);
    }
    test('back / forward: tracks editor moves across groups', async function () {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const resource1 = toResource.call(this, '/path/one.txt');
        const resource2 = toResource.call(this, '/path/two.html');
        const pane1 = await editorService.openEditor({ resource: resource1, options: { pinned: true } });
        await editorService.openEditor({ resource: resource2, options: { pinned: true } });
        // [one.txt] [>two.html<]
        const sideGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        // [one.txt] [>two.html<] | <empty>
        const editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        pane1?.group.moveEditor(pane1.input, sideGroup);
        await editorChangePromise;
        // [one.txt] | [>two.html<]
        await historyService.goBack();
        // [>one.txt<] | [two.html]
        assert.strictEqual(part.activeGroup.id, pane1?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource1.toString());
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: tracks group removals', async function () {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const resource1 = toResource.call(this, '/path/one.txt');
        const resource2 = toResource.call(this, '/path/two.html');
        const pane1 = await editorService.openEditor({ resource: resource1, options: { pinned: true } });
        const pane2 = await editorService.openEditor({ resource: resource2, options: { pinned: true } }, SIDE_GROUP);
        // [one.txt] | [>two.html<]
        assert.notStrictEqual(pane1, pane2);
        await pane1?.group.closeAllEditors();
        // [>two.html<]
        await historyService.goBack();
        // [>two.html<]
        assert.strictEqual(part.activeGroup.id, pane2?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource2.toString());
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: editor navigation stack - navigation', async function () {
        const [, , editorService, , instantiationService] = await createServices();
        const stack = instantiationService.createInstance(EditorNavigationStack, 0 /* GoFilter.NONE */, 0 /* GoScope.DEFAULT */);
        const resource = toResource.call(this, '/path/index.txt');
        const otherResource = toResource.call(this, '/path/index.html');
        const pane = await editorService.openEditor({ resource, options: { pinned: true } });
        let changed = false;
        disposables.add(stack.onDidChange(() => (changed = true)));
        assert.strictEqual(stack.canGoBack(), false);
        assert.strictEqual(stack.canGoForward(), false);
        assert.strictEqual(stack.canGoLast(), false);
        // Opening our first editor emits change event
        stack.notifyNavigation(pane, { reason: 2 /* EditorPaneSelectionChangeReason.USER */ });
        assert.strictEqual(changed, true);
        changed = false;
        assert.strictEqual(stack.canGoBack(), false);
        assert.strictEqual(stack.canGoLast(), true);
        // Opening same editor is not treated as new history stop
        stack.notifyNavigation(pane, { reason: 2 /* EditorPaneSelectionChangeReason.USER */ });
        assert.strictEqual(stack.canGoBack(), false);
        // Opening different editor allows to go back
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane, { reason: 2 /* EditorPaneSelectionChangeReason.USER */ });
        assert.strictEqual(changed, true);
        changed = false;
        assert.strictEqual(stack.canGoBack(), true);
        await stack.goBack();
        assert.strictEqual(stack.canGoBack(), false);
        assert.strictEqual(stack.canGoForward(), true);
        assert.strictEqual(stack.canGoLast(), true);
        await stack.goForward();
        assert.strictEqual(stack.canGoBack(), true);
        assert.strictEqual(stack.canGoForward(), false);
        await stack.goPrevious();
        assert.strictEqual(stack.canGoBack(), false);
        assert.strictEqual(stack.canGoForward(), true);
        await stack.goPrevious();
        assert.strictEqual(stack.canGoBack(), true);
        assert.strictEqual(stack.canGoForward(), false);
        await stack.goBack();
        await stack.goLast();
        assert.strictEqual(stack.canGoBack(), true);
        assert.strictEqual(stack.canGoForward(), false);
        stack.dispose();
        assert.strictEqual(stack.canGoBack(), false);
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: editor navigation stack - mutations', async function () {
        const [, , editorService, , instantiationService] = await createServices();
        const stack = disposables.add(instantiationService.createInstance(EditorNavigationStack, 0 /* GoFilter.NONE */, 0 /* GoScope.DEFAULT */));
        const resource = toResource.call(this, '/path/index.txt');
        const otherResource = toResource.call(this, '/path/index.html');
        const unrelatedResource = toResource.call(this, '/path/unrelated.html');
        const pane = await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Clear
        assert.strictEqual(stack.canGoBack(), true);
        stack.clear();
        assert.strictEqual(stack.canGoBack(), false);
        await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Remove unrelated resource does not cause any harm (via internal event)
        await stack.goBack();
        assert.strictEqual(stack.canGoForward(), true);
        stack.remove(new FileOperationEvent(unrelatedResource, 1 /* FileOperation.DELETE */));
        assert.strictEqual(stack.canGoForward(), true);
        // Remove (via internal event)
        await stack.goForward();
        assert.strictEqual(stack.canGoBack(), true);
        stack.remove(new FileOperationEvent(resource, 1 /* FileOperation.DELETE */));
        assert.strictEqual(stack.canGoBack(), false);
        stack.clear();
        await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Remove (via external event)
        assert.strictEqual(stack.canGoBack(), true);
        stack.remove(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], !isLinux));
        assert.strictEqual(stack.canGoBack(), false);
        stack.clear();
        await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Remove (via editor)
        assert.strictEqual(stack.canGoBack(), true);
        stack.remove(pane.input);
        assert.strictEqual(stack.canGoBack(), false);
        stack.clear();
        await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Remove (via group)
        assert.strictEqual(stack.canGoBack(), true);
        stack.remove(pane.group.id);
        assert.strictEqual(stack.canGoBack(), false);
        stack.clear();
        await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Move
        const stat = {
            ctime: 0,
            etag: '',
            mtime: 0,
            isDirectory: false,
            isFile: true,
            isSymbolicLink: false,
            name: 'other.txt',
            readonly: false,
            locked: false,
            size: 0,
            resource: toResource.call(this, '/path/other.txt'),
            children: undefined,
        };
        stack.move(new FileOperationEvent(resource, 2 /* FileOperation.MOVE */, stat));
        await stack.goBack();
        assert.strictEqual(pane?.input?.resource?.toString(), stat.resource.toString());
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: editor group scope', async function () {
        const [part, historyService, editorService, , instantiationService] = await createServices(1 /* GoScope.EDITOR_GROUP */);
        const resource1 = toResource.call(this, '/path/one.txt');
        const resource2 = toResource.call(this, '/path/two.html');
        const resource3 = toResource.call(this, '/path/three.html');
        const pane1 = await editorService.openEditor({ resource: resource1, options: { pinned: true } });
        await editorService.openEditor({ resource: resource2, options: { pinned: true } });
        await editorService.openEditor({ resource: resource3, options: { pinned: true } });
        // [one.txt] [two.html] [>three.html<]
        const sideGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        // [one.txt] [two.html] [>three.html<] | <empty>
        const pane2 = await editorService.openEditor({ resource: resource1, options: { pinned: true } }, sideGroup);
        await editorService.openEditor({ resource: resource2, options: { pinned: true } });
        await editorService.openEditor({ resource: resource3, options: { pinned: true } });
        // [one.txt] [two.html] [>three.html<] | [one.txt] [two.html] [>three.html<]
        await historyService.goBack();
        await historyService.goBack();
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.id, pane2?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource1.toString());
        // [one.txt] [two.html] [>three.html<] | [>one.txt<] [two.html] [three.html]
        await editorService.openEditor({ resource: resource3, options: { pinned: true } }, pane1?.group);
        await historyService.goBack();
        await historyService.goBack();
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.id, pane1?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource1.toString());
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: editor  scope', async function () {
        const [part, historyService, editorService, , instantiationService] = await createServices(2 /* GoScope.EDITOR */);
        const resource1 = toResource.call(this, '/path/one.txt');
        const resource2 = toResource.call(this, '/path/two.html');
        const pane = (await editorService.openEditor({
            resource: resource1,
            options: { pinned: true },
        }));
        await setTextSelection(historyService, pane, new Selection(2, 2, 2, 10));
        await setTextSelection(historyService, pane, new Selection(50, 3, 50, 20));
        await editorService.openEditor({ resource: resource2, options: { pinned: true } });
        await setTextSelection(historyService, pane, new Selection(12, 2, 12, 10));
        await setTextSelection(historyService, pane, new Selection(150, 3, 150, 20));
        await historyService.goBack();
        assertTextSelection(new Selection(12, 2, 12, 10), pane);
        await historyService.goBack();
        assertTextSelection(new Selection(12, 2, 12, 10), pane); // no change
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource2.toString());
        await editorService.openEditor({ resource: resource1, options: { pinned: true } });
        await historyService.goBack();
        assertTextSelection(new Selection(2, 2, 2, 10), pane);
        await historyService.goBack();
        assertTextSelection(new Selection(2, 2, 2, 10), pane); // no change
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource1.toString());
        return workbenchTeardown(instantiationService);
    });
    test('go to last edit location', async function () {
        const [, historyService, editorService, textFileService, instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const otherResource = toResource.call(this, '/path/index.html');
        await editorService.openEditor({ resource });
        const model = (await textFileService.files.resolve(resource));
        model.textEditorModel.setValue('Hello World');
        await timeout(10); // history debounces change events
        await editorService.openEditor({ resource: otherResource });
        const onDidActiveEditorChange = new DeferredPromise();
        disposables.add(editorService.onDidActiveEditorChange((e) => {
            onDidActiveEditorChange.complete(e);
        }));
        historyService.goLast(1 /* GoFilter.EDITS */);
        await onDidActiveEditorChange.p;
        assert.strictEqual(editorService.activeEditor?.resource?.toString(), resource.toString());
        return workbenchTeardown(instantiationService);
    });
    test('reopen closed editor', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = await editorService.openEditor({ resource });
        await pane?.group.closeAllEditors();
        const onDidActiveEditorChange = new DeferredPromise();
        disposables.add(editorService.onDidActiveEditorChange((e) => {
            onDidActiveEditorChange.complete(e);
        }));
        historyService.reopenLastClosedEditor();
        await onDidActiveEditorChange.p;
        assert.strictEqual(editorService.activeEditor?.resource?.toString(), resource.toString());
        return workbenchTeardown(instantiationService);
    });
    test('getHistory', async () => {
        class TestFileEditorInputWithUntyped extends TestFileEditorInput {
            toUntyped() {
                return {
                    resource: this.resource,
                    options: {
                        override: 'testOverride',
                    },
                };
            }
        }
        const [part, historyService, editorService, , instantiationService] = await createServices(undefined, true);
        let history = historyService.getHistory();
        assert.strictEqual(history.length, 0);
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1/node_modules/test.txt'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input1, { pinned: true });
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input2, { pinned: true });
        const input3 = disposables.add(new TestFileEditorInputWithUntyped(URI.parse('foo://bar3'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input3, { pinned: true });
        const input4 = disposables.add(new TestFileEditorInputWithUntyped(URI.file('bar4'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input4, { pinned: true });
        history = historyService.getHistory();
        assert.strictEqual(history.length, 4);
        // first entry is untyped because it implements `toUntyped` and has a supported scheme
        assert.strictEqual(isResourceEditorInput(history[0]) && !(history[0] instanceof EditorInput), true);
        assert.strictEqual(history[0].options?.override, 'testOverride');
        // second entry is not untyped even though it implements `toUntyped` but has unsupported scheme
        assert.strictEqual(history[1] instanceof EditorInput, true);
        assert.strictEqual(history[2] instanceof EditorInput, true);
        assert.strictEqual(history[3] instanceof EditorInput, true);
        historyService.removeFromHistory(input2);
        history = historyService.getHistory();
        assert.strictEqual(history.length, 3);
        assert.strictEqual(history[0].resource?.toString(), input4.resource.toString());
        input1.dispose(); // disposing the editor will apply `search.exclude` rules
        history = historyService.getHistory();
        assert.strictEqual(history.length, 2);
        // side by side
        const input5 = disposables.add(new TestFileEditorInputWithUntyped(URI.parse('file://bar5'), TEST_EDITOR_INPUT_ID));
        const input6 = disposables.add(new TestFileEditorInputWithUntyped(URI.file('file://bar1/node_modules/test.txt'), TEST_EDITOR_INPUT_ID));
        const input7 = new SideBySideEditorInput(undefined, undefined, input6, input5, editorService);
        await part.activeGroup.openEditor(input7, { pinned: true });
        history = historyService.getHistory();
        assert.strictEqual(history.length, 3);
        input7.dispose();
        history = historyService.getHistory();
        assert.strictEqual(history.length, 3); // only input5 survived, input6 is excluded via search.exclude
        return workbenchTeardown(instantiationService);
    });
    test('getLastActiveFile', async () => {
        const [part, historyService] = await createServices();
        assert.ok(!historyService.getLastActiveFile('foo'));
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input1, { pinned: true });
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input2, { pinned: true });
        assert.strictEqual(historyService.getLastActiveFile('foo')?.toString(), input2.resource.toString());
        assert.strictEqual(historyService.getLastActiveFile('foo', 'bar2')?.toString(), input2.resource.toString());
        assert.strictEqual(historyService.getLastActiveFile('foo', 'bar1')?.toString(), input1.resource.toString());
    });
    test('open next/previous recently used editor (single group)', async () => {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input1, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        await part.activeGroup.openEditor(input2, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        let editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openPreviouslyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openNextRecentlyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openPreviouslyUsedEditor(part.activeGroup.id);
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openNextRecentlyUsedEditor(part.activeGroup.id);
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        return workbenchTeardown(instantiationService);
    });
    test('open next/previous recently used editor (multi group)', async () => {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const rootGroup = part.activeGroup;
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        const sideGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        await rootGroup.openEditor(input1, { pinned: true });
        await sideGroup.openEditor(input2, { pinned: true });
        let editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openPreviouslyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup, rootGroup);
        assert.strictEqual(rootGroup.activeEditor, input1);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openNextRecentlyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup, sideGroup);
        assert.strictEqual(sideGroup.activeEditor, input2);
        return workbenchTeardown(instantiationService);
    });
    test('open next/previous recently is reset when other input opens', async () => {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        const input3 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar3'), TEST_EDITOR_INPUT_ID));
        const input4 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar4'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input1, { pinned: true });
        await part.activeGroup.openEditor(input2, { pinned: true });
        await part.activeGroup.openEditor(input3, { pinned: true });
        let editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openPreviouslyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        await timeout(0);
        await part.activeGroup.openEditor(input4, { pinned: true });
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openPreviouslyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openNextRecentlyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input4);
        return workbenchTeardown(instantiationService);
    });
    test('transient editors suspends editor change tracking', async () => {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        const input3 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar3'), TEST_EDITOR_INPUT_ID));
        const input4 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar4'), TEST_EDITOR_INPUT_ID));
        const input5 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar5'), TEST_EDITOR_INPUT_ID));
        let editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        await part.activeGroup.openEditor(input1, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        await editorChangePromise;
        await part.activeGroup.openEditor(input2, { transient: true });
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        await part.activeGroup.openEditor(input3, { transient: true });
        assert.strictEqual(part.activeGroup.activeEditor, input3);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange).then(() => Event.toPromise(editorService.onDidActiveEditorChange));
        await part.activeGroup.openEditor(input4, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input4);
        await part.activeGroup.openEditor(input5, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input5);
        // stack should be [input1, input4, input5]
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.activeEditor, input4);
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        await historyService.goForward();
        assert.strictEqual(part.activeGroup.activeEditor, input4);
        await historyService.goForward();
        assert.strictEqual(part.activeGroup.activeEditor, input5);
        return workbenchTeardown(instantiationService);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2hpc3RvcnkvdGVzdC9icm93c2VyL2hpc3RvcnlTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLGtCQUFrQixFQUNsQixnQkFBZ0IsRUFDaEIsc0JBQXNCLEVBQ3RCLG1CQUFtQixFQUVuQixpQkFBaUIsRUFDakIsNEJBQTRCLEdBQzVCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxvQkFBb0IsRUFBa0IsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNwRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBcUIsZUFBZSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RSxP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LEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxNQUFNLDhDQUFzQyxFQUFFLENBQUMsQ0FBQTtRQUM5RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNqQyxPQUFPLEdBQUcsS0FBSyxDQUFBO1FBRWYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFM0MsTUFBTSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDcEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFM0MsTUFBTSxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFL0MsTUFBTSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFOUMsTUFBTSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcs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
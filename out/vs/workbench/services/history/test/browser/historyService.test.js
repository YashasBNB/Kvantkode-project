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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9oaXN0b3J5L3Rlc3QvYnJvd3Nlci9oaXN0b3J5U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sdUNBQXVDLEVBQ3ZDLFVBQVUsR0FDVixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixFQUNuQixrQkFBa0IsRUFDbEIsZ0JBQWdCLEVBQ2hCLHNCQUFzQixFQUN0QixtQkFBbUIsRUFFbkIsaUJBQWlCLEVBQ2pCLDRCQUE0QixHQUM1QixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsb0JBQW9CLEVBQWtCLE1BQU0sK0NBQStDLENBQUE7QUFDcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQXFCLGVBQWUsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFN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SUFBSSxFQUFFLEVBQUUsTUFBTSw4Q0FBc0MsRUFBRSxDQUFDLENBQUE7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDakMsT0FBTyxHQUFHLEtBQUssQ0FBQTtRQUVmLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTNDLE1BQU0sS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ3BCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTNDLE1BQU0sS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRS9DLE1BQU0sS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTlDLE1BQU0sS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFB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RSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEYsTUFBTSxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLElBQUksU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUUsTUFBTSxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDN0IsbUJBQW1CLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFdkQsTUFBTSxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDN0IsbUJBQW1CLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUEsQ0FBQyxZQUFZO1FBRXBFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBRTdGLE1BQU0sYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVsRixNQUFNLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUM3QixtQkFBbUIsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVyRCxNQUFNLGNBQWMsQ0FBQyxNQUFNLEVB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
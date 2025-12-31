/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService, registerTestEditor, TestFileEditorInput, TestServiceAccessor, workbenchTeardown, createEditorParts, } from '../../../../test/browser/workbenchTestServices.js';
import { isEditorGroup, IEditorGroupsService, } from '../../common/editorGroupsService.js';
import { SideBySideEditor, EditorExtensions, } from '../../../../common/editor.js';
import { URI } from '../../../../../base/common/uri.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { MockScopableContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IContextKeyService, RawContextKey, } from '../../../../../platform/contextkey/common/contextkey.js';
import { Emitter } from '../../../../../base/common/event.js';
import { isEqual } from '../../../../../base/common/resources.js';
suite('EditorGroupsService', () => {
    const TEST_EDITOR_ID = 'MyFileEditorForEditorGroupService';
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForEditorGroupService';
    const disposables = new DisposableStore();
    let testLocalInstantiationService = undefined;
    setup(() => {
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput), new SyncDescriptor(SideBySideEditorInput)], TEST_EDITOR_INPUT_ID));
    });
    teardown(async () => {
        if (testLocalInstantiationService) {
            await workbenchTeardown(testLocalInstantiationService);
            testLocalInstantiationService = undefined;
        }
        disposables.clear();
    });
    async function createParts(instantiationService = workbenchInstantiationService(undefined, disposables)) {
        instantiationService.invokeFunction((accessor) => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        const parts = await createEditorParts(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, parts);
        testLocalInstantiationService = instantiationService;
        return [parts, instantiationService];
    }
    async function createPart(instantiationService) {
        const [parts, testInstantiationService] = await createParts(instantiationService);
        return [parts.testMainPart, testInstantiationService];
    }
    function createTestFileEditorInput(resource, typeId) {
        return disposables.add(new TestFileEditorInput(resource, typeId));
    }
    test('groups basics', async function () {
        const instantiationService = workbenchInstantiationService({
            contextKeyService: (instantiationService) => instantiationService.createInstance(MockScopableContextKeyService),
        }, disposables);
        const [part] = await createPart(instantiationService);
        let activeGroupModelChangeCounter = 0;
        const activeGroupModelChangeListener = part.onDidChangeActiveGroup(() => {
            activeGroupModelChangeCounter++;
        });
        let groupAddedCounter = 0;
        const groupAddedListener = part.onDidAddGroup(() => {
            groupAddedCounter++;
        });
        let groupRemovedCounter = 0;
        const groupRemovedListener = part.onDidRemoveGroup(() => {
            groupRemovedCounter++;
        });
        let groupMovedCounter = 0;
        const groupMovedListener = part.onDidMoveGroup(() => {
            groupMovedCounter++;
        });
        // always a root group
        const rootGroup = part.groups[0];
        assert.strictEqual(isEditorGroup(rootGroup), true);
        assert.strictEqual(part.groups.length, 1);
        assert.strictEqual(part.count, 1);
        assert.strictEqual(rootGroup, part.getGroup(rootGroup.id));
        assert.ok(part.activeGroup === rootGroup);
        assert.strictEqual(rootGroup.label, 'Group 1');
        let mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 1);
        assert.strictEqual(mru[0], rootGroup);
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        assert.strictEqual(rightGroup, part.getGroup(rightGroup.id));
        assert.strictEqual(groupAddedCounter, 1);
        assert.strictEqual(part.groups.length, 2);
        assert.strictEqual(part.count, 2);
        assert.ok(part.activeGroup === rootGroup);
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(rightGroup.label, 'Group 2');
        mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 2);
        assert.strictEqual(mru[0], rootGroup);
        assert.strictEqual(mru[1], rightGroup);
        assert.strictEqual(activeGroupModelChangeCounter, 0);
        let rootGroupActiveChangeCounter = 0;
        const rootGroupModelChangeListener = rootGroup.onDidModelChange((e) => {
            if (e.kind === 0 /* GroupModelChangeKind.GROUP_ACTIVE */) {
                rootGroupActiveChangeCounter++;
            }
        });
        let rightGroupActiveChangeCounter = 0;
        const rightGroupModelChangeListener = rightGroup.onDidModelChange((e) => {
            if (e.kind === 0 /* GroupModelChangeKind.GROUP_ACTIVE */) {
                rightGroupActiveChangeCounter++;
            }
        });
        part.activateGroup(rightGroup);
        assert.ok(part.activeGroup === rightGroup);
        assert.strictEqual(activeGroupModelChangeCounter, 1);
        assert.strictEqual(rootGroupActiveChangeCounter, 1);
        assert.strictEqual(rightGroupActiveChangeCounter, 1);
        rootGroupModelChangeListener.dispose();
        rightGroupModelChangeListener.dispose();
        mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 2);
        assert.strictEqual(mru[0], rightGroup);
        assert.strictEqual(mru[1], rootGroup);
        const downGroup = part.addGroup(rightGroup, 1 /* GroupDirection.DOWN */);
        let didDispose = false;
        disposables.add(downGroup.onWillDispose(() => {
            didDispose = true;
        }));
        assert.strictEqual(groupAddedCounter, 2);
        assert.strictEqual(part.groups.length, 3);
        assert.ok(part.activeGroup === rightGroup);
        assert.ok(!downGroup.activeEditorPane);
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(rightGroup.label, 'Group 2');
        assert.strictEqual(downGroup.label, 'Group 3');
        mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 3);
        assert.strictEqual(mru[0], rightGroup);
        assert.strictEqual(mru[1], rootGroup);
        assert.strictEqual(mru[2], downGroup);
        const gridOrder = part.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        assert.strictEqual(gridOrder.length, 3);
        assert.strictEqual(gridOrder[0], rootGroup);
        assert.strictEqual(gridOrder[0].index, 0);
        assert.strictEqual(gridOrder[1], rightGroup);
        assert.strictEqual(gridOrder[1].index, 1);
        assert.strictEqual(gridOrder[2], downGroup);
        assert.strictEqual(gridOrder[2].index, 2);
        part.moveGroup(downGroup, rightGroup, 1 /* GroupDirection.DOWN */);
        assert.strictEqual(groupMovedCounter, 1);
        part.removeGroup(downGroup);
        assert.ok(!part.getGroup(downGroup.id));
        assert.ok(!part.hasGroup(downGroup.id));
        assert.strictEqual(didDispose, true);
        assert.strictEqual(groupRemovedCounter, 1);
        assert.strictEqual(part.groups.length, 2);
        assert.ok(part.activeGroup === rightGroup);
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(rightGroup.label, 'Group 2');
        mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 2);
        assert.strictEqual(mru[0], rightGroup);
        assert.strictEqual(mru[1], rootGroup);
        const rightGroupContextKeyService = part.activeGroup.scopedContextKeyService;
        const rootGroupContextKeyService = rootGroup.scopedContextKeyService;
        assert.ok(rightGroupContextKeyService);
        assert.ok(rootGroupContextKeyService);
        assert.ok(rightGroupContextKeyService !== rootGroupContextKeyService);
        part.removeGroup(rightGroup);
        assert.strictEqual(groupRemovedCounter, 2);
        assert.strictEqual(part.groups.length, 1);
        assert.ok(part.activeGroup === rootGroup);
        mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 1);
        assert.strictEqual(mru[0], rootGroup);
        part.removeGroup(rootGroup); // cannot remove root group
        assert.strictEqual(part.groups.length, 1);
        assert.strictEqual(groupRemovedCounter, 2);
        assert.ok(part.activeGroup === rootGroup);
        part.setGroupOrientation(part.orientation === 0 /* GroupOrientation.HORIZONTAL */
            ? 1 /* GroupOrientation.VERTICAL */
            : 0 /* GroupOrientation.HORIZONTAL */);
        activeGroupModelChangeListener.dispose();
        groupAddedListener.dispose();
        groupRemovedListener.dispose();
        groupMovedListener.dispose();
    });
    test('sideGroup', async () => {
        const instantiationService = workbenchInstantiationService({
            contextKeyService: (instantiationService) => instantiationService.createInstance(MockScopableContextKeyService),
        }, disposables);
        const [part] = await createPart(instantiationService);
        const rootGroup = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await rootGroup.openEditor(input1, { pinned: true });
        await part.sideGroup.openEditor(input2, { pinned: true });
        assert.strictEqual(part.count, 2);
        part.activateGroup(rootGroup);
        await part.sideGroup.openEditor(input3, { pinned: true });
        assert.strictEqual(part.count, 2);
    });
    test('save & restore state', async function () {
        const [part, instantiationService] = await createPart();
        const rootGroup = part.groups[0];
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        const downGroup = part.addGroup(rightGroup, 1 /* GroupDirection.DOWN */);
        const rootGroupInput = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        await rootGroup.openEditor(rootGroupInput, { pinned: true });
        const rightGroupInput = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await rightGroup.openEditor(rightGroupInput, { pinned: true });
        assert.strictEqual(part.groups.length, 3);
        part.testSaveState();
        part.dispose();
        const [restoredPart] = await createPart(instantiationService);
        assert.strictEqual(restoredPart.groups.length, 3);
        assert.ok(restoredPart.getGroup(rootGroup.id));
        assert.ok(restoredPart.hasGroup(rootGroup.id));
        assert.ok(restoredPart.getGroup(rightGroup.id));
        assert.ok(restoredPart.hasGroup(rightGroup.id));
        assert.ok(restoredPart.getGroup(downGroup.id));
        assert.ok(restoredPart.hasGroup(downGroup.id));
        restoredPart.clearState();
    });
    test('groups index / labels', async function () {
        const [part] = await createPart();
        const rootGroup = part.groups[0];
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        const downGroup = part.addGroup(rightGroup, 1 /* GroupDirection.DOWN */);
        let groupIndexChangedCounter = 0;
        const groupIndexChangedListener = part.onDidChangeGroupIndex(() => {
            groupIndexChangedCounter++;
        });
        let indexChangeCounter = 0;
        const labelChangeListener = downGroup.onDidModelChange((e) => {
            if (e.kind === 1 /* GroupModelChangeKind.GROUP_INDEX */) {
                indexChangeCounter++;
            }
        });
        assert.strictEqual(rootGroup.index, 0);
        assert.strictEqual(rightGroup.index, 1);
        assert.strictEqual(downGroup.index, 2);
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(rightGroup.label, 'Group 2');
        assert.strictEqual(downGroup.label, 'Group 3');
        part.removeGroup(rightGroup);
        assert.strictEqual(rootGroup.index, 0);
        assert.strictEqual(downGroup.index, 1);
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(downGroup.label, 'Group 2');
        assert.strictEqual(indexChangeCounter, 1);
        assert.strictEqual(groupIndexChangedCounter, 1);
        part.moveGroup(downGroup, rootGroup, 0 /* GroupDirection.UP */);
        assert.strictEqual(downGroup.index, 0);
        assert.strictEqual(rootGroup.index, 1);
        assert.strictEqual(downGroup.label, 'Group 1');
        assert.strictEqual(rootGroup.label, 'Group 2');
        assert.strictEqual(indexChangeCounter, 2);
        assert.strictEqual(groupIndexChangedCounter, 3);
        const newFirstGroup = part.addGroup(downGroup, 0 /* GroupDirection.UP */);
        assert.strictEqual(newFirstGroup.index, 0);
        assert.strictEqual(downGroup.index, 1);
        assert.strictEqual(rootGroup.index, 2);
        assert.strictEqual(newFirstGroup.label, 'Group 1');
        assert.strictEqual(downGroup.label, 'Group 2');
        assert.strictEqual(rootGroup.label, 'Group 3');
        assert.strictEqual(indexChangeCounter, 3);
        assert.strictEqual(groupIndexChangedCounter, 6);
        labelChangeListener.dispose();
        groupIndexChangedListener.dispose();
    });
    test('groups label', async function () {
        const [part] = await createPart();
        const rootGroup = part.groups[0];
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        let partLabelChangedCounter = 0;
        const groupIndexChangedListener = part.onDidChangeGroupLabel(() => {
            partLabelChangedCounter++;
        });
        let rootGroupLabelChangeCounter = 0;
        const rootGroupLabelChangeListener = rootGroup.onDidModelChange((e) => {
            if (e.kind === 2 /* GroupModelChangeKind.GROUP_LABEL */) {
                rootGroupLabelChangeCounter++;
            }
        });
        let rightGroupLabelChangeCounter = 0;
        const rightGroupLabelChangeListener = rightGroup.onDidModelChange((e) => {
            if (e.kind === 2 /* GroupModelChangeKind.GROUP_LABEL */) {
                rightGroupLabelChangeCounter++;
            }
        });
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(rightGroup.label, 'Group 2');
        part.notifyGroupsLabelChange('Window 2');
        assert.strictEqual(rootGroup.label, 'Window 2: Group 1');
        assert.strictEqual(rightGroup.label, 'Window 2: Group 2');
        assert.strictEqual(rootGroupLabelChangeCounter, 1);
        assert.strictEqual(rightGroupLabelChangeCounter, 1);
        assert.strictEqual(partLabelChangedCounter, 2);
        part.notifyGroupsLabelChange('Window 3');
        assert.strictEqual(rootGroup.label, 'Window 3: Group 1');
        assert.strictEqual(rightGroup.label, 'Window 3: Group 2');
        assert.strictEqual(rootGroupLabelChangeCounter, 2);
        assert.strictEqual(rightGroupLabelChangeCounter, 2);
        assert.strictEqual(partLabelChangedCounter, 4);
        rootGroupLabelChangeListener.dispose();
        rightGroupLabelChangeListener.dispose();
        groupIndexChangedListener.dispose();
    });
    test('copy/merge groups', async () => {
        const [part] = await createPart();
        let groupAddedCounter = 0;
        const groupAddedListener = part.onDidAddGroup(() => {
            groupAddedCounter++;
        });
        let groupRemovedCounter = 0;
        const groupRemovedListener = part.onDidRemoveGroup(() => {
            groupRemovedCounter++;
        });
        const rootGroup = part.groups[0];
        let rootGroupDisposed = false;
        const disposeListener = rootGroup.onWillDispose(() => {
            rootGroupDisposed = true;
        });
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        await rootGroup.openEditor(input, { pinned: true });
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        part.activateGroup(rightGroup);
        const downGroup = part.copyGroup(rootGroup, rightGroup, 1 /* GroupDirection.DOWN */);
        assert.strictEqual(groupAddedCounter, 2);
        assert.strictEqual(downGroup.count, 1);
        assert.ok(downGroup.activeEditor instanceof TestFileEditorInput);
        let res = part.mergeGroup(rootGroup, rightGroup, { mode: 0 /* MergeGroupMode.COPY_EDITORS */ });
        assert.strictEqual(res, true);
        assert.strictEqual(rightGroup.count, 1);
        assert.ok(rightGroup.activeEditor instanceof TestFileEditorInput);
        res = part.mergeGroup(rootGroup, rightGroup, { mode: 1 /* MergeGroupMode.MOVE_EDITORS */ });
        assert.strictEqual(res, true);
        assert.strictEqual(rootGroup.count, 0);
        res = part.mergeGroup(rootGroup, downGroup);
        assert.strictEqual(res, true);
        assert.strictEqual(groupRemovedCounter, 1);
        assert.strictEqual(rootGroupDisposed, true);
        groupAddedListener.dispose();
        groupRemovedListener.dispose();
        disposeListener.dispose();
        part.dispose();
    });
    test('merge all groups', async () => {
        const [part] = await createPart();
        const rootGroup = part.groups[0];
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await rootGroup.openEditor(input1, { pinned: true });
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        await rightGroup.openEditor(input2, { pinned: true });
        const downGroup = part.copyGroup(rootGroup, rightGroup, 1 /* GroupDirection.DOWN */);
        await downGroup.openEditor(input3, { pinned: true });
        part.activateGroup(rootGroup);
        assert.strictEqual(rootGroup.count, 1);
        const result = part.mergeAllGroups(part.activeGroup);
        assert.strictEqual(result, true);
        assert.strictEqual(rootGroup.count, 3);
        part.dispose();
    });
    test('whenReady / whenRestored', async () => {
        const [part] = await createPart();
        await part.whenReady;
        assert.strictEqual(part.isReady, true);
        await part.whenRestored;
    });
    test('options', async () => {
        const [part] = await createPart();
        let oldOptions;
        let newOptions;
        disposables.add(part.onDidChangeEditorPartOptions((event) => {
            oldOptions = event.oldPartOptions;
            newOptions = event.newPartOptions;
        }));
        const currentOptions = part.partOptions;
        assert.ok(currentOptions);
        disposables.add(part.enforcePartOptions({ showTabs: 'single' }));
        assert.strictEqual(part.partOptions.showTabs, 'single');
        assert.strictEqual(newOptions.showTabs, 'single');
        assert.strictEqual(oldOptions, currentOptions);
    });
    test('editor basics', async function () {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        let activeEditorChangeCounter = 0;
        let editorDidOpenCounter = 0;
        const editorOpenEvents = [];
        let editorCloseCounter = 0;
        const editorCloseEvents = [];
        let editorPinCounter = 0;
        let editorStickyCounter = 0;
        let editorCapabilitiesCounter = 0;
        const editorGroupModelChangeListener = group.onDidModelChange((e) => {
            if (e.kind === 5 /* GroupModelChangeKind.EDITOR_OPEN */) {
                assert.ok(e.editor);
                editorDidOpenCounter++;
                editorOpenEvents.push(e);
            }
            else if (e.kind === 11 /* GroupModelChangeKind.EDITOR_PIN */) {
                assert.ok(e.editor);
                editorPinCounter++;
            }
            else if (e.kind === 13 /* GroupModelChangeKind.EDITOR_STICKY */) {
                assert.ok(e.editor);
                editorStickyCounter++;
            }
            else if (e.kind === 10 /* GroupModelChangeKind.EDITOR_CAPABILITIES */) {
                assert.ok(e.editor);
                editorCapabilitiesCounter++;
            }
            else if (e.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */) {
                assert.ok(e.editor);
                editorCloseCounter++;
                editorCloseEvents.push(e);
            }
        });
        const activeEditorChangeListener = group.onDidActiveEditorChange((e) => {
            assert.ok(e.editor);
            activeEditorChangeCounter++;
        });
        let editorCloseCounter1 = 0;
        const editorCloseListener = group.onDidCloseEditor(() => {
            editorCloseCounter1++;
        });
        let editorWillCloseCounter = 0;
        const editorWillCloseListener = group.onWillCloseEditor(() => {
            editorWillCloseCounter++;
        });
        let editorDidCloseCounter = 0;
        const editorDidCloseListener = group.onDidCloseEditor(() => {
            editorDidCloseCounter++;
        });
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputInactive, { inactive: true });
        assert.strictEqual(group.isActive(input), true);
        assert.strictEqual(group.isActive(inputInactive), false);
        assert.strictEqual(group.contains(input), true);
        assert.strictEqual(group.contains(inputInactive), true);
        assert.strictEqual(group.isEmpty, false);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(editorCapabilitiesCounter, 0);
        assert.strictEqual(editorDidOpenCounter, 2);
        assert.strictEqual(editorOpenEvents[0].editorIndex, 0);
        assert.strictEqual(editorOpenEvents[1].editorIndex, 1);
        assert.strictEqual(editorOpenEvents[0].editor, input);
        assert.strictEqual(editorOpenEvents[1].editor, inputInactive);
        assert.strictEqual(activeEditorChangeCounter, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        assert.strictEqual(group.getIndexOfEditor(input), 0);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 1);
        assert.strictEqual(group.isFirst(input), true);
        assert.strictEqual(group.isFirst(inputInactive), false);
        assert.strictEqual(group.isLast(input), false);
        assert.strictEqual(group.isLast(inputInactive), true);
        input.capabilities = 16 /* EditorInputCapabilities.RequiresTrust */;
        assert.strictEqual(editorCapabilitiesCounter, 1);
        inputInactive.capabilities = 8 /* EditorInputCapabilities.Singleton */;
        assert.strictEqual(editorCapabilitiesCounter, 2);
        assert.strictEqual(group.previewEditor, inputInactive);
        assert.strictEqual(group.isPinned(inputInactive), false);
        group.pinEditor(inputInactive);
        assert.strictEqual(editorPinCounter, 1);
        assert.strictEqual(group.isPinned(inputInactive), true);
        assert.ok(!group.previewEditor);
        assert.strictEqual(group.activeEditor, input);
        assert.strictEqual(group.activeEditorPane?.getId(), TEST_EDITOR_ID);
        assert.strictEqual(group.count, 2);
        const mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input);
        assert.strictEqual(mru[1], inputInactive);
        await group.openEditor(inputInactive);
        assert.strictEqual(activeEditorChangeCounter, 2);
        assert.strictEqual(group.activeEditor, inputInactive);
        await group.openEditor(input);
        const closed = await group.closeEditor(inputInactive);
        assert.strictEqual(closed, true);
        assert.strictEqual(activeEditorChangeCounter, 3);
        assert.strictEqual(editorCloseCounter, 1);
        assert.strictEqual(editorCloseEvents[0].editorIndex, 1);
        assert.strictEqual(editorCloseEvents[0].editor, inputInactive);
        assert.strictEqual(editorCloseCounter1, 1);
        assert.strictEqual(editorWillCloseCounter, 1);
        assert.strictEqual(editorDidCloseCounter, 1);
        assert.ok(inputInactive.gotDisposed);
        assert.strictEqual(group.activeEditor, input);
        assert.strictEqual(editorStickyCounter, 0);
        group.stickEditor(input);
        assert.strictEqual(editorStickyCounter, 1);
        group.unstickEditor(input);
        assert.strictEqual(editorStickyCounter, 2);
        editorCloseListener.dispose();
        editorWillCloseListener.dispose();
        editorDidCloseListener.dispose();
        activeEditorChangeListener.dispose();
        editorGroupModelChangeListener.dispose();
    });
    test('openEditors / closeEditors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive },
        ]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        await group.closeEditors([input, inputInactive]);
        assert.ok(input.gotDisposed);
        assert.ok(inputInactive.gotDisposed);
        assert.strictEqual(group.isEmpty, true);
    });
    test('closeEditor - dirty editor handling', async () => {
        const [part, instantiationService] = await createPart();
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        const group = part.activeGroup;
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        input.dirty = true;
        await group.openEditor(input);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        let closed = await group.closeEditor(input);
        assert.strictEqual(closed, false);
        assert.ok(!input.gotDisposed);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        closed = await group.closeEditor(input);
        assert.strictEqual(closed, true);
        assert.ok(input.gotDisposed);
    });
    test('closeEditor (one, opened in multiple groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive },
        ]);
        await rightGroup.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive },
        ]);
        let closed = await rightGroup.closeEditor(input);
        assert.strictEqual(closed, true);
        assert.ok(!input.gotDisposed);
        closed = await group.closeEditor(input);
        assert.strictEqual(closed, true);
        assert.ok(input.gotDisposed);
    });
    test('closeEditors - dirty editor handling', async () => {
        const [part, instantiationService] = await createPart();
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        let closeResult = false;
        const group = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input1);
        await group.openEditor(input2);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        closeResult = await group.closeEditors([input1, input2]);
        assert.strictEqual(closeResult, false);
        assert.ok(!input1.gotDisposed);
        assert.ok(!input2.gotDisposed);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        closeResult = await group.closeEditors([input1, input2]);
        assert.strictEqual(closeResult, true);
        assert.ok(input1.gotDisposed);
        assert.ok(input2.gotDisposed);
    });
    test('closeEditors (except one)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 },
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ except: input2 });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), input2);
    });
    test('closeEditors (except one, sticky editor)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true, sticky: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 },
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ except: input2, excludeSticky: true });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        await group.closeEditors({ except: input2 });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.getEditorByIndex(0), input2);
    });
    test('closeEditors (saved only)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 },
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ savedOnly: true });
        assert.strictEqual(group.count, 0);
    });
    test('closeEditors (saved only, sticky editor)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true, sticky: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 },
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ savedOnly: true, excludeSticky: true });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        await group.closeEditors({ savedOnly: true });
        assert.strictEqual(group.count, 0);
    });
    test('closeEditors (direction: right)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 },
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ direction: 1 /* CloseDirection.RIGHT */, except: input2 });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
    });
    test('closeEditors (direction: right, sticky editor)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true, sticky: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 },
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({
            direction: 1 /* CloseDirection.RIGHT */,
            except: input2,
            excludeSticky: true,
        });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        await group.closeEditors({ direction: 1 /* CloseDirection.RIGHT */, except: input2 });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
    });
    test('closeEditors (direction: left)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 },
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ direction: 0 /* CloseDirection.LEFT */, except: input2 });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input2);
        assert.strictEqual(group.getEditorByIndex(1), input3);
    });
    test('closeEditors (direction: left, sticky editor)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true, sticky: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 },
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({
            direction: 0 /* CloseDirection.LEFT */,
            except: input2,
            excludeSticky: true,
        });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ direction: 0 /* CloseDirection.LEFT */, except: input2 });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input2);
        assert.strictEqual(group.getEditorByIndex(1), input3);
    });
    test('closeAllEditors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive },
        ]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        await group.closeAllEditors();
        assert.strictEqual(group.isEmpty, true);
    });
    test('closeAllEditors - dirty editor handling', async () => {
        const [part, instantiationService] = await createPart();
        let closeResult = true;
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        const group = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input1);
        await group.openEditor(input2);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        closeResult = await group.closeAllEditors();
        assert.strictEqual(closeResult, false);
        assert.ok(!input1.gotDisposed);
        assert.ok(!input2.gotDisposed);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        closeResult = await group.closeAllEditors();
        assert.strictEqual(closeResult, true);
        assert.ok(input1.gotDisposed);
        assert.ok(input2.gotDisposed);
    });
    test('closeAllEditors (sticky editor)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input, options: { pinned: true, sticky: true } },
            { editor: inputInactive },
        ]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.stickyCount, 1);
        await group.closeAllEditors({ excludeSticky: true });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
        await group.closeAllEditors();
        assert.strictEqual(group.isEmpty, true);
    });
    test('moveEditor (same group)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        const moveEvents = [];
        const editorGroupModelChangeListener = group.onDidModelChange((e) => {
            if (e.kind === 7 /* GroupModelChangeKind.EDITOR_MOVE */) {
                assert.ok(e.editor);
                moveEvents.push(e);
            }
        });
        await group.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive },
        ]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        group.moveEditor(inputInactive, group, { index: 0 });
        assert.strictEqual(moveEvents.length, 1);
        assert.strictEqual(moveEvents[0].editorIndex, 0);
        assert.strictEqual(moveEvents[0].oldEditorIndex, 1);
        assert.strictEqual(moveEvents[0].editor, inputInactive);
        assert.strictEqual(group.getEditorByIndex(0), inputInactive);
        assert.strictEqual(group.getEditorByIndex(1), input);
        const res = group.moveEditors([{ editor: inputInactive, options: { index: 1 } }], group);
        assert.strictEqual(res, true);
        assert.strictEqual(moveEvents.length, 2);
        assert.strictEqual(moveEvents[1].editorIndex, 1);
        assert.strictEqual(moveEvents[1].oldEditorIndex, 0);
        assert.strictEqual(moveEvents[1].editor, inputInactive);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        editorGroupModelChangeListener.dispose();
    });
    test('moveEditor (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive },
        ]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        group.moveEditor(inputInactive, rightGroup, { index: 0 });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(rightGroup.count, 1);
        assert.strictEqual(rightGroup.getEditorByIndex(0), inputInactive);
    });
    test('moveEditors (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3, options: { pinned: true } },
        ]);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        group.moveEditors([{ editor: input2 }, { editor: input3 }], rightGroup);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(rightGroup.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(rightGroup.getEditorByIndex(0), input2);
        assert.strictEqual(rightGroup.getEditorByIndex(1), input3);
    });
    test('copyEditor (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive },
        ]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        group.copyEditor(inputInactive, rightGroup, { index: 0 });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        assert.strictEqual(rightGroup.count, 1);
        assert.strictEqual(rightGroup.getEditorByIndex(0), inputInactive);
    });
    test('copyEditors (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3, options: { pinned: true } },
        ]);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        group.copyEditors([{ editor: input1 }, { editor: input2 }, { editor: input3 }], rightGroup);
        [group, rightGroup].forEach((group) => {
            assert.strictEqual(group.getEditorByIndex(0), input1);
            assert.strictEqual(group.getEditorByIndex(1), input2);
            assert.strictEqual(group.getEditorByIndex(2), input3);
        });
    });
    test('replaceEditors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
        await group.replaceEditors([{ editor: input, replacement: inputInactive }]);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), inputInactive);
    });
    test('replaceEditors - dirty editor handling', async () => {
        const [part, instantiationService] = await createPart();
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        const group = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input1);
        assert.strictEqual(group.activeEditor, input1);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        await group.replaceEditors([{ editor: input1, replacement: input2 }]);
        assert.strictEqual(group.activeEditor, input1);
        assert.ok(!input1.gotDisposed);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        await group.replaceEditors([{ editor: input1, replacement: input2 }]);
        assert.strictEqual(group.activeEditor, input2);
        assert.ok(input1.gotDisposed);
    });
    test('replaceEditors - forceReplaceDirty flag', async () => {
        const [part, instantiationService] = await createPart();
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        const group = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input1);
        assert.strictEqual(group.activeEditor, input1);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        await group.replaceEditors([{ editor: input1, replacement: input2, forceReplaceDirty: false }]);
        assert.strictEqual(group.activeEditor, input1);
        assert.ok(!input1.gotDisposed);
        await group.replaceEditors([{ editor: input1, replacement: input2, forceReplaceDirty: true }]);
        assert.strictEqual(group.activeEditor, input2);
        assert.ok(input1.gotDisposed);
    });
    test('replaceEditors - proper index handling', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        const input4 = createTestFileEditorInput(URI.file('foo/bar4'), TEST_EDITOR_INPUT_ID);
        const input5 = createTestFileEditorInput(URI.file('foo/bar5'), TEST_EDITOR_INPUT_ID);
        const input6 = createTestFileEditorInput(URI.file('foo/bar6'), TEST_EDITOR_INPUT_ID);
        const input7 = createTestFileEditorInput(URI.file('foo/bar7'), TEST_EDITOR_INPUT_ID);
        const input8 = createTestFileEditorInput(URI.file('foo/bar8'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input1, { pinned: true });
        await group.openEditor(input2, { pinned: true });
        await group.openEditor(input3, { pinned: true });
        await group.openEditor(input4, { pinned: true });
        await group.openEditor(input5, { pinned: true });
        await group.replaceEditors([
            { editor: input1, replacement: input6 },
            { editor: input3, replacement: input7 },
            { editor: input5, replacement: input8 },
        ]);
        assert.strictEqual(group.getEditorByIndex(0), input6);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input7);
        assert.strictEqual(group.getEditorByIndex(3), input4);
        assert.strictEqual(group.getEditorByIndex(4), input8);
    });
    test('replaceEditors - should be able to replace when side by side editor is involved with same input side by side', async () => {
        const [part, instantiationService] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, input, input);
        await group.openEditor(input);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
        await group.replaceEditors([{ editor: input, replacement: sideBySideInput }]);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), sideBySideInput);
        await group.replaceEditors([{ editor: sideBySideInput, replacement: input }]);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
    });
    test('find editors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        const group2 = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar1'), `${TEST_EDITOR_INPUT_ID}-1`);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        const input4 = createTestFileEditorInput(URI.file('foo/bar4'), TEST_EDITOR_INPUT_ID);
        const input5 = createTestFileEditorInput(URI.file('foo/bar4'), `${TEST_EDITOR_INPUT_ID}-1`);
        await group.openEditor(input1, { pinned: true });
        await group.openEditor(input2, { pinned: true });
        await group.openEditor(input3, { pinned: true });
        await group.openEditor(input4, { pinned: true });
        await group2.openEditor(input5, { pinned: true });
        let foundEditors = group.findEditors(URI.file('foo/bar1'));
        assert.strictEqual(foundEditors.length, 2);
        foundEditors = group2.findEditors(URI.file('foo/bar4'));
        assert.strictEqual(foundEditors.length, 1);
    });
    test('find editors (side by side support)', async () => {
        const [part, instantiationService] = await createPart();
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const secondaryInput = createTestFileEditorInput(URI.file('foo/bar-secondary'), TEST_EDITOR_INPUT_ID);
        const primaryInput = createTestFileEditorInput(URI.file('foo/bar-primary'), `${TEST_EDITOR_INPUT_ID}-1`);
        const sideBySideEditor = new SideBySideEditorInput(undefined, undefined, secondaryInput, primaryInput, accessor.editorService);
        await group.openEditor(sideBySideEditor, { pinned: true });
        let foundEditors = group.findEditors(URI.file('foo/bar-secondary'));
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = group.findEditors(URI.file('foo/bar-secondary'), {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = group.findEditors(URI.file('foo/bar-primary'), {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = group.findEditors(URI.file('foo/bar-secondary'), {
            supportSideBySide: SideBySideEditor.SECONDARY,
        });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = group.findEditors(URI.file('foo/bar-primary'), {
            supportSideBySide: SideBySideEditor.SECONDARY,
        });
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = group.findEditors(URI.file('foo/bar-secondary'), {
            supportSideBySide: SideBySideEditor.ANY,
        });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = group.findEditors(URI.file('foo/bar-primary'), {
            supportSideBySide: SideBySideEditor.ANY,
        });
        assert.strictEqual(foundEditors.length, 1);
    });
    test('find neighbour group (left/right)', async function () {
        const [part] = await createPart();
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        assert.strictEqual(rightGroup, part.findGroup({ direction: 3 /* GroupDirection.RIGHT */ }, rootGroup));
        assert.strictEqual(rootGroup, part.findGroup({ direction: 2 /* GroupDirection.LEFT */ }, rightGroup));
    });
    test('find neighbour group (up/down)', async function () {
        const [part] = await createPart();
        const rootGroup = part.activeGroup;
        const downGroup = part.addGroup(rootGroup, 1 /* GroupDirection.DOWN */);
        assert.strictEqual(downGroup, part.findGroup({ direction: 1 /* GroupDirection.DOWN */ }, rootGroup));
        assert.strictEqual(rootGroup, part.findGroup({ direction: 0 /* GroupDirection.UP */ }, downGroup));
    });
    test('find group by location (left/right)', async function () {
        const [part] = await createPart();
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        const downGroup = part.addGroup(rightGroup, 1 /* GroupDirection.DOWN */);
        assert.strictEqual(rootGroup, part.findGroup({ location: 0 /* GroupLocation.FIRST */ }));
        assert.strictEqual(downGroup, part.findGroup({ location: 1 /* GroupLocation.LAST */ }));
        assert.strictEqual(rightGroup, part.findGroup({ location: 2 /* GroupLocation.NEXT */ }, rootGroup));
        assert.strictEqual(rootGroup, part.findGroup({ location: 3 /* GroupLocation.PREVIOUS */ }, rightGroup));
        assert.strictEqual(downGroup, part.findGroup({ location: 2 /* GroupLocation.NEXT */ }, rightGroup));
        assert.strictEqual(rightGroup, part.findGroup({ location: 3 /* GroupLocation.PREVIOUS */ }, downGroup));
    });
    test('applyLayout (2x2)', async function () {
        const [part] = await createPart();
        part.applyLayout({
            groups: [{ groups: [{}, {}] }, { groups: [{}, {}] }],
            orientation: 0 /* GroupOrientation.HORIZONTAL */,
        });
        assert.strictEqual(part.groups.length, 4);
    });
    test('getLayout', async function () {
        const [part] = await createPart();
        // 2x2
        part.applyLayout({
            groups: [{ groups: [{}, {}] }, { groups: [{}, {}] }],
            orientation: 0 /* GroupOrientation.HORIZONTAL */,
        });
        let layout = part.getLayout();
        assert.strictEqual(layout.orientation, 0 /* GroupOrientation.HORIZONTAL */);
        assert.strictEqual(layout.groups.length, 2);
        assert.strictEqual(layout.groups[0].groups.length, 2);
        assert.strictEqual(layout.groups[1].groups.length, 2);
        // 3 columns
        part.applyLayout({ groups: [{}, {}, {}], orientation: 1 /* GroupOrientation.VERTICAL */ });
        layout = part.getLayout();
        assert.strictEqual(layout.orientation, 1 /* GroupOrientation.VERTICAL */);
        assert.strictEqual(layout.groups.length, 3);
        assert.ok(typeof layout.groups[0].size === 'number');
        assert.ok(typeof layout.groups[1].size === 'number');
        assert.ok(typeof layout.groups[2].size === 'number');
    });
    test('centeredLayout', async function () {
        const [part] = await createPart();
        part.centerLayout(true);
        assert.strictEqual(part.isLayoutCentered(), true);
    });
    test('sticky editors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 0);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputInactive, { inactive: true });
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.isSticky(input), false);
        assert.strictEqual(group.isSticky(inputInactive), false);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 2);
        group.stickEditor(input);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(input), true);
        assert.strictEqual(group.isSticky(inputInactive), false);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 1);
        group.unstickEditor(input);
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.isSticky(input), false);
        assert.strictEqual(group.isSticky(inputInactive), false);
        assert.strictEqual(group.getIndexOfEditor(input), 0);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 2);
        let editorMoveCounter = 0;
        const editorGroupModelChangeListener = group.onDidModelChange((e) => {
            if (e.kind === 7 /* GroupModelChangeKind.EDITOR_MOVE */) {
                assert.ok(e.editor);
                editorMoveCounter++;
            }
        });
        group.stickEditor(inputInactive);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(input), false);
        assert.strictEqual(group.isSticky(inputInactive), true);
        assert.strictEqual(group.getIndexOfEditor(input), 1);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 0);
        assert.strictEqual(editorMoveCounter, 1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 1);
        const inputSticky = createTestFileEditorInput(URI.file('foo/bar/sticky'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(inputSticky, { sticky: true });
        assert.strictEqual(group.stickyCount, 2);
        assert.strictEqual(group.isSticky(input), false);
        assert.strictEqual(group.isSticky(inputInactive), true);
        assert.strictEqual(group.isSticky(inputSticky), true);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 0);
        assert.strictEqual(group.getIndexOfEditor(inputSticky), 1);
        assert.strictEqual(group.getIndexOfEditor(input), 2);
        await group.openEditor(input, { sticky: true });
        assert.strictEqual(group.stickyCount, 3);
        assert.strictEqual(group.isSticky(input), true);
        assert.strictEqual(group.isSticky(inputInactive), true);
        assert.strictEqual(group.isSticky(inputSticky), true);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 0);
        assert.strictEqual(group.getIndexOfEditor(inputSticky), 1);
        assert.strictEqual(group.getIndexOfEditor(input), 2);
        editorGroupModelChangeListener.dispose();
    });
    test('sticky: true wins over index', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.stickyCount, 0);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        const inputSticky = createTestFileEditorInput(URI.file('foo/bar/sticky'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputInactive, { inactive: true });
        await group.openEditor(inputSticky, { sticky: true, index: 2 });
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(inputSticky), true);
        assert.strictEqual(group.getIndexOfEditor(input), 1);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 2);
        assert.strictEqual(group.getIndexOfEditor(inputSticky), 0);
    });
    test('selection: setSelection, isSelected, selectedEditors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        function isSelection(inputs) {
            for (const input of inputs) {
                if (group.selectedEditors.indexOf(input) === -1) {
                    return false;
                }
            }
            return inputs.length === group.selectedEditors.length;
        }
        // Active: input1, Selected: input1
        await group.openEditors([input1, input2, input3].map((editor) => ({ editor, options: { pinned: true } })));
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), false);
        assert.strictEqual(group.isSelected(input3), false);
        assert.strictEqual(isSelection([input1]), true);
        // Active: input1, Selected: input1, input3
        await group.setSelection(input1, [input3]);
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), false);
        assert.strictEqual(group.isSelected(input3), true);
        assert.strictEqual(isSelection([input1, input3]), true);
        // Active: input2, Selected: input1, input3
        await group.setSelection(input2, [input1, input3]);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isActive(input2), true);
        assert.strictEqual(group.isSelected(input2), true);
        assert.strictEqual(group.isSelected(input3), true);
        assert.strictEqual(isSelection([input1, input2, input3]), true);
        await group.setSelection(input1, []);
        // Selected: input3
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), false);
        assert.strictEqual(group.isSelected(input3), false);
        assert.strictEqual(isSelection([input1]), true);
    });
    test('moveEditor with context (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        const thirdInput = createTestFileEditorInput(URI.file('foo/bar/third'), TEST_EDITOR_INPUT_ID);
        let leftFiredCount = 0;
        const leftGroupListener = group.onWillMoveEditor(() => {
            leftFiredCount++;
        });
        let rightFiredCount = 0;
        const rightGroupListener = rightGroup.onWillMoveEditor(() => {
            rightFiredCount++;
        });
        await group.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive },
            { editor: thirdInput },
        ]);
        assert.strictEqual(leftFiredCount, 0);
        assert.strictEqual(rightFiredCount, 0);
        let result = group.moveEditor(input, rightGroup);
        assert.strictEqual(result, true);
        assert.strictEqual(leftFiredCount, 1);
        assert.strictEqual(rightFiredCount, 0);
        result = group.moveEditor(inputInactive, rightGroup);
        assert.strictEqual(result, true);
        assert.strictEqual(leftFiredCount, 2);
        assert.strictEqual(rightFiredCount, 0);
        result = rightGroup.moveEditor(inputInactive, group);
        assert.strictEqual(result, true);
        assert.strictEqual(leftFiredCount, 2);
        assert.strictEqual(rightFiredCount, 1);
        leftGroupListener.dispose();
        rightGroupListener.dispose();
    });
    test('moveEditor disabled', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        const thirdInput = createTestFileEditorInput(URI.file('foo/bar/third'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive },
            { editor: thirdInput },
        ]);
        input.setMoveDisabled('disabled');
        const result = group.moveEditor(input, rightGroup);
        assert.strictEqual(result, false);
        assert.strictEqual(group.count, 3);
    });
    test('onWillOpenEditor', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const secondInput = createTestFileEditorInput(URI.file('foo/bar/second'), TEST_EDITOR_INPUT_ID);
        const thirdInput = createTestFileEditorInput(URI.file('foo/bar/third'), TEST_EDITOR_INPUT_ID);
        let leftFiredCount = 0;
        const leftGroupListener = group.onWillOpenEditor(() => {
            leftFiredCount++;
        });
        let rightFiredCount = 0;
        const rightGroupListener = rightGroup.onWillOpenEditor(() => {
            rightFiredCount++;
        });
        await group.openEditor(input);
        assert.strictEqual(leftFiredCount, 1);
        assert.strictEqual(rightFiredCount, 0);
        rightGroup.openEditor(secondInput);
        assert.strictEqual(leftFiredCount, 1);
        assert.strictEqual(rightFiredCount, 1);
        group.openEditor(thirdInput);
        assert.strictEqual(leftFiredCount, 2);
        assert.strictEqual(rightFiredCount, 1);
        // Ensure move fires the open event too
        rightGroup.moveEditor(secondInput, group);
        assert.strictEqual(leftFiredCount, 3);
        assert.strictEqual(rightFiredCount, 1);
        leftGroupListener.dispose();
        rightGroupListener.dispose();
    });
    test('copyEditor with context (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        let firedCount = 0;
        const moveListener = group.onWillMoveEditor(() => firedCount++);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive },
        ]);
        assert.strictEqual(firedCount, 0);
        group.copyEditor(inputInactive, rightGroup, { index: 0 });
        assert.strictEqual(firedCount, 0);
        moveListener.dispose();
    });
    test('locked groups - basics', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        let leftFiredCountFromPart = 0;
        let rightFiredCountFromPart = 0;
        const partListener = part.onDidChangeGroupLocked((g) => {
            if (g === group) {
                leftFiredCountFromPart++;
            }
            else if (g === rightGroup) {
                rightFiredCountFromPart++;
            }
        });
        let leftFiredCountFromGroup = 0;
        const leftGroupListener = group.onDidModelChange((e) => {
            if (e.kind === 3 /* GroupModelChangeKind.GROUP_LOCKED */) {
                leftFiredCountFromGroup++;
            }
        });
        let rightFiredCountFromGroup = 0;
        const rightGroupListener = rightGroup.onDidModelChange((e) => {
            if (e.kind === 3 /* GroupModelChangeKind.GROUP_LOCKED */) {
                rightFiredCountFromGroup++;
            }
        });
        rightGroup.lock(true);
        rightGroup.lock(true);
        assert.strictEqual(leftFiredCountFromGroup, 0);
        assert.strictEqual(leftFiredCountFromPart, 0);
        assert.strictEqual(rightFiredCountFromGroup, 1);
        assert.strictEqual(rightFiredCountFromPart, 1);
        rightGroup.lock(false);
        rightGroup.lock(false);
        assert.strictEqual(leftFiredCountFromGroup, 0);
        assert.strictEqual(leftFiredCountFromPart, 0);
        assert.strictEqual(rightFiredCountFromGroup, 2);
        assert.strictEqual(rightFiredCountFromPart, 2);
        group.lock(true);
        group.lock(true);
        assert.strictEqual(leftFiredCountFromGroup, 1);
        assert.strictEqual(leftFiredCountFromPart, 1);
        assert.strictEqual(rightFiredCountFromGroup, 2);
        assert.strictEqual(rightFiredCountFromPart, 2);
        group.lock(false);
        group.lock(false);
        assert.strictEqual(leftFiredCountFromGroup, 2);
        assert.strictEqual(leftFiredCountFromPart, 2);
        assert.strictEqual(rightFiredCountFromGroup, 2);
        assert.strictEqual(rightFiredCountFromPart, 2);
        partListener.dispose();
        leftGroupListener.dispose();
        rightGroupListener.dispose();
    });
    test('locked groups - single group is can be locked', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        group.lock(true);
        assert.strictEqual(group.isLocked, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        rightGroup.lock(true);
        assert.strictEqual(rightGroup.isLocked, true);
        part.removeGroup(group);
        assert.strictEqual(rightGroup.isLocked, true);
        const rightGroup2 = part.addGroup(rightGroup, 3 /* GroupDirection.RIGHT */);
        rightGroup.lock(true);
        rightGroup2.lock(true);
        assert.strictEqual(rightGroup.isLocked, true);
        assert.strictEqual(rightGroup2.isLocked, true);
        part.removeGroup(rightGroup2);
        assert.strictEqual(rightGroup.isLocked, true);
    });
    test('locked groups - auto locking via setting', async () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const configurationService = new TestConfigurationService();
        await configurationService.setUserConfiguration('workbench', {
            editor: { autoLockGroups: { testEditorInputForEditorGroupService: true } },
        });
        instantiationService.stub(IConfigurationService, configurationService);
        const [part] = await createPart(instantiationService);
        const rootGroup = part.activeGroup;
        let rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        let input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        let input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        // First editor opens in right group: Locked=true
        await rightGroup.openEditor(input1, { pinned: true });
        assert.strictEqual(rightGroup.isLocked, true);
        // Second editors opens in now unlocked right group: Locked=false
        rightGroup.lock(false);
        await rightGroup.openEditor(input2, { pinned: true });
        assert.strictEqual(rightGroup.isLocked, false);
        //First editor opens in root group without other groups being opened: Locked=false
        await rightGroup.closeAllEditors();
        part.removeGroup(rightGroup);
        await rootGroup.closeAllEditors();
        input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await rootGroup.openEditor(input1, { pinned: true });
        assert.strictEqual(rootGroup.isLocked, false);
        rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        assert.strictEqual(rootGroup.isLocked, false);
        const leftGroup = part.addGroup(rootGroup, 2 /* GroupDirection.LEFT */);
        assert.strictEqual(rootGroup.isLocked, false);
        part.removeGroup(leftGroup);
        assert.strictEqual(rootGroup.isLocked, false);
    });
    test('maximize editor group', async () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const [part] = await createPart(instantiationService);
        const rootGroup = part.activeGroup;
        const editorPartSize = part.getSize(rootGroup);
        // If there is only one group, it should not be considered maximized
        assert.strictEqual(part.hasMaximizedGroup(), false);
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        const rightBottomGroup = part.addGroup(rightGroup, 1 /* GroupDirection.DOWN */);
        const sizeRootGroup = part.getSize(rootGroup);
        const sizeRightGroup = part.getSize(rightGroup);
        const sizeRightBottomGroup = part.getSize(rightBottomGroup);
        let maximizedValue;
        const maxiizeGroupEventDisposable = part.onDidChangeGroupMaximized((maximized) => {
            maximizedValue = maximized;
        });
        assert.strictEqual(part.hasMaximizedGroup(), false);
        part.arrangeGroups(0 /* GroupsArrangement.MAXIMIZE */, rootGroup);
        assert.strictEqual(part.hasMaximizedGroup(), true);
        // getSize()
        assert.deepStrictEqual(part.getSize(rootGroup), editorPartSize);
        assert.deepStrictEqual(part.getSize(rightGroup), { width: 0, height: 0 });
        assert.deepStrictEqual(part.getSize(rightBottomGroup), { width: 0, height: 0 });
        assert.deepStrictEqual(maximizedValue, true);
        part.toggleMaximizeGroup();
        assert.strictEqual(part.hasMaximizedGroup(), false);
        // Size is restored
        assert.deepStrictEqual(part.getSize(rootGroup), sizeRootGroup);
        assert.deepStrictEqual(part.getSize(rightGroup), sizeRightGroup);
        assert.deepStrictEqual(part.getSize(rightBottomGroup), sizeRightBottomGroup);
        assert.deepStrictEqual(maximizedValue, false);
        maxiizeGroupEventDisposable.dispose();
    });
    test('transient editors - basics', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputTransient = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputTransient, { transient: true });
        assert.strictEqual(group.isTransient(input), false);
        assert.strictEqual(group.isTransient(inputTransient), true);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputTransient, { transient: true });
        assert.strictEqual(group.isTransient(inputTransient), true);
        await group.openEditor(inputTransient, { transient: false });
        assert.strictEqual(group.isTransient(inputTransient), false);
        await group.openEditor(inputTransient, { transient: true });
        assert.strictEqual(group.isTransient(inputTransient), false); // cannot make a non-transient editor transient when already opened
    });
    test('transient editors - pinning clears transient', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputTransient = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputTransient, { transient: true });
        assert.strictEqual(group.isTransient(input), false);
        assert.strictEqual(group.isTransient(inputTransient), true);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputTransient, { pinned: true, transient: true });
        assert.strictEqual(group.isTransient(inputTransient), false);
    });
    test('transient editors - overrides enablePreview setting', async function () {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const configurationService = new TestConfigurationService();
        await configurationService.setUserConfiguration('workbench', {
            editor: { enablePreview: false },
        });
        instantiationService.stub(IConfigurationService, configurationService);
        const [part] = await createPart(instantiationService);
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: false });
        assert.strictEqual(group.isPinned(input), true);
        await group.openEditor(input2, { transient: true });
        assert.strictEqual(group.isPinned(input2), false);
        group.focus();
        assert.strictEqual(group.isPinned(input2), true);
    });
    test('working sets - create / apply state', async function () {
        const [part] = await createPart();
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const pane1 = await part.activeGroup.openEditor(input, { pinned: true });
        const pane2 = await part.sideGroup.openEditor(input2, { pinned: true });
        const state = part.createState();
        await pane2?.group.closeAllEditors();
        await pane1?.group.closeAllEditors();
        assert.strictEqual(part.count, 1);
        assert.strictEqual(part.activeGroup.isEmpty, true);
        await part.applyState(state);
        assert.strictEqual(part.count, 2);
        assert.strictEqual(part.groups[0].contains(input), true);
        assert.strictEqual(part.groups[1].contains(input2), true);
        for (const group of part.groups) {
            await group.closeAllEditors();
        }
        const emptyState = part.createState();
        await part.applyState(emptyState);
        assert.strictEqual(part.count, 1);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        input3.dirty = true;
        await part.activeGroup.openEditor(input3, { pinned: true });
        await part.applyState(emptyState);
        assert.strictEqual(part.count, 1);
        assert.strictEqual(part.groups[0].contains(input3), true); // dirty editors enforce to be there even when state is empty
        await part.applyState('empty');
        assert.strictEqual(part.count, 1);
        assert.strictEqual(part.groups[0].contains(input3), true); // dirty editors enforce to be there even when state is empty
        input3.dirty = false;
        await part.applyState('empty');
        assert.strictEqual(part.count, 1);
        assert.strictEqual(part.activeGroup.isEmpty, true);
    });
    test('context key provider', async function () {
        const disposables = new DisposableStore();
        // Instantiate workbench and setup initial state
        const instantiationService = workbenchInstantiationService({
            contextKeyService: (instantiationService) => instantiationService.createInstance(MockScopableContextKeyService),
        }, disposables);
        const rootContextKeyService = instantiationService.get(IContextKeyService);
        const [parts] = await createParts(instantiationService);
        const input1 = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        const group1 = parts.activeGroup;
        const group2 = parts.addGroup(group1, 3 /* GroupDirection.RIGHT */);
        await group2.openEditor(input2, { pinned: true });
        await group1.openEditor(input1, { pinned: true });
        // Create context key provider
        const rawContextKey = new RawContextKey('testContextKey', parts.activeGroup.id);
        const contextKeyProvider = {
            contextKey: rawContextKey,
            getGroupContextKeyValue: (group) => group.id,
        };
        disposables.add(parts.registerContextKeyProvider(contextKeyProvider));
        // Initial state: group1 is active
        assert.strictEqual(parts.activeGroup.id, group1.id);
        let globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        let group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        let group2ContextKeyValue = group2.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, group1.id);
        assert.strictEqual(group1ContextKeyValue, group1.id);
        assert.strictEqual(group2ContextKeyValue, group2.id);
        // Make group2 active and ensure both gloabal and local context key values are updated
        parts.activateGroup(group2);
        globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        group2ContextKeyValue = group2.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, group2.id);
        assert.strictEqual(group1ContextKeyValue, group1.id);
        assert.strictEqual(group2ContextKeyValue, group2.id);
        // Add a new group and ensure both gloabal and local context key values are updated
        // Group 3 will be active
        const group3 = parts.addGroup(group2, 3 /* GroupDirection.RIGHT */);
        await group3.openEditor(input3, { pinned: true });
        globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        group2ContextKeyValue = group2.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        const group3ContextKeyValue = group3.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, group3.id);
        assert.strictEqual(group1ContextKeyValue, group1.id);
        assert.strictEqual(group2ContextKeyValue, group2.id);
        assert.strictEqual(group3ContextKeyValue, group3.id);
        disposables.dispose();
    });
    test('context key provider: onDidChange', async function () {
        const disposables = new DisposableStore();
        // Instantiate workbench and setup initial state
        const instantiationService = workbenchInstantiationService({
            contextKeyService: (instantiationService) => instantiationService.createInstance(MockScopableContextKeyService),
        }, disposables);
        const rootContextKeyService = instantiationService.get(IContextKeyService);
        const parts = await createEditorParts(instantiationService, disposables);
        const input1 = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const group1 = parts.activeGroup;
        const group2 = parts.addGroup(group1, 3 /* GroupDirection.RIGHT */);
        await group2.openEditor(input2, { pinned: true });
        await group1.openEditor(input1, { pinned: true });
        // Create context key provider
        let offset = 0;
        const _onDidChange = new Emitter();
        const rawContextKey = new RawContextKey('testContextKey', parts.activeGroup.id);
        const contextKeyProvider = {
            contextKey: rawContextKey,
            getGroupContextKeyValue: (group) => group.id + offset,
            onDidChange: _onDidChange.event,
        };
        disposables.add(parts.registerContextKeyProvider(contextKeyProvider));
        // Initial state: group1 is active
        assert.strictEqual(parts.activeGroup.id, group1.id);
        let globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        let group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        let group2ContextKeyValue = group2.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, group1.id + offset);
        assert.strictEqual(group1ContextKeyValue, group1.id + offset);
        assert.strictEqual(group2ContextKeyValue, group2.id + offset);
        // Make a change to the context key provider and fire onDidChange such that all context key values are updated
        offset = 10;
        _onDidChange.fire();
        globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        group2ContextKeyValue = group2.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, group1.id + offset);
        assert.strictEqual(group1ContextKeyValue, group1.id + offset);
        assert.strictEqual(group2ContextKeyValue, group2.id + offset);
        disposables.dispose();
    });
    test('context key provider: active editor change', async function () {
        const disposables = new DisposableStore();
        // Instantiate workbench and setup initial state
        const instantiationService = workbenchInstantiationService({
            contextKeyService: (instantiationService) => instantiationService.createInstance(MockScopableContextKeyService),
        }, disposables);
        const rootContextKeyService = instantiationService.get(IContextKeyService);
        const parts = await createEditorParts(instantiationService, disposables);
        const input1 = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const group1 = parts.activeGroup;
        await group1.openEditor(input2, { pinned: true });
        await group1.openEditor(input1, { pinned: true });
        // Create context key provider
        const rawContextKey = new RawContextKey('testContextKey', input1.resource.toString());
        const contextKeyProvider = {
            contextKey: rawContextKey,
            getGroupContextKeyValue: (group) => group.activeEditor?.resource?.toString() ?? '',
        };
        disposables.add(parts.registerContextKeyProvider(contextKeyProvider));
        // Initial state: input1 is active
        assert.strictEqual(isEqual(group1.activeEditor?.resource, input1.resource), true);
        let globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        let group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, input1.resource.toString());
        assert.strictEqual(group1ContextKeyValue, input1.resource.toString());
        // Make input2 active and ensure both gloabal and local context key values are updated
        await group1.openEditor(input2);
        globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, input2.resource.toString());
        assert.strictEqual(group1ContextKeyValue, input2.resource.toString());
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBzU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci90ZXN0L2Jyb3dzZXIvZWRpdG9yR3JvdXBzU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLGtCQUFrQixFQUNsQixtQkFBbUIsRUFFbkIsbUJBQW1CLEVBRW5CLGlCQUFpQixFQUNqQixpQkFBaUIsR0FFakIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBTU4sYUFBYSxFQUNiLG9CQUFvQixHQUdwQixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFNTixnQkFBZ0IsRUFFaEIsZ0JBQWdCLEdBQ2hCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFFdkgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFPMUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzlFLE9BQU8sRUFD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QUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVyQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxxQ0FBNkIsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsVUFBVSw4QkFBc0IsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsS0FBSyxVQUFVLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRS9DLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUywwQ0FBa0MsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFckMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFBO1FBQzVFLE1BQU0sMEJBQTBCLEdBQUcsU0FBUyxDQUFDLHVCQUF1QixDQUFBO1FBRXBFLE1BQU0sQ0FBQyxFQUFFLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsRUFBRSxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLEVBQUUsQ0FBQywyQkFBMkIsS0FBSywwQkFBMEIsQ0FBQyxDQUFBO1FBRXJFLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDNUIs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QUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQzdDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7U0FDN0MsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUMzRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3QyxN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LEVBQUUsRUFBRTtZQUM3QyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQzdDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7U0FDN0MsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQzFGO1FBQUEsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdEQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxn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QUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNqRixDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRW5ELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUUvQywyQ0FBMkM7UUFDM0MsTUFBTSxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWxELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFdkQsMkNBQTJDO1FBQzNDLE1BQU0sS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUVsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFL0QsTUFBTSxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVwQyxtQkFBbUI7UUFDbkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxD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QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTlDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEIsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV0QixNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTlDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVoQixNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTlDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDakIsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVqQixNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENB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
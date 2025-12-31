/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EditorExtensions, } from '../../../../common/editor.js';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestFileEditorInput, registerTestEditor, createEditorPart, registerTestSideBySideEditor, } from '../../../../test/browser/workbenchTestServices.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { IEditorGroupsService } from '../../common/editorGroupsService.js';
import { EditorActivation } from '../../../../../platform/editor/common/editor.js';
import { WillSaveStateReason } from '../../../../../platform/storage/common/storage.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { EditorsObserver } from '../../../../browser/parts/editor/editorsObserver.js';
import { timeout } from '../../../../../base/common/async.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('EditorsObserver', function () {
    const TEST_EDITOR_ID = 'MyTestEditorForEditorsObserver';
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForEditorsObserver';
    const TEST_SERIALIZABLE_EDITOR_INPUT_ID = 'testSerializableEditorInputForEditorsObserver';
    const disposables = new DisposableStore();
    setup(() => {
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput)], TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        disposables.add(registerTestSideBySideEditor());
    });
    teardown(() => {
        disposables.clear();
    });
    async function createPart() {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        instantiationService.invokeFunction((accessor) => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        disposables.add(toDisposable(() => part.clearState()));
        return [part, instantiationService];
    }
    async function createEditorObserver(scoped = false) {
        const [part, instantiationService] = await createPart();
        const observer = disposables.add(new EditorsObserver(scoped ? part : undefined, part, disposables.add(new TestStorageService())));
        return [part, observer, instantiationService];
    }
    test('basics (single group)', async () => {
        await testSingleGroupBasics();
    });
    test('basics (single group, scoped)', async () => {
        await testSingleGroupBasics(true);
    });
    async function testSingleGroupBasics(scoped = false) {
        const [part, observer] = await createEditorObserver();
        let onDidMostRecentlyActiveEditorsChangeCalled = false;
        disposables.add(observer.onDidMostRecentlyActiveEditorsChange(() => {
            onDidMostRecentlyActiveEditorsChangeCalled = true;
        }));
        let currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 0);
        assert.strictEqual(onDidMostRecentlyActiveEditorsChangeCalled, false);
        const input1 = new TestFileEditorInput(URI.parse('foo://bar1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);
        await part.activeGroup.openEditor(input1, { pinned: true });
        currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 1);
        assert.strictEqual(currentEditorsMRU[0].groupId, part.activeGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input1);
        assert.strictEqual(onDidMostRecentlyActiveEditorsChangeCalled, true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditors(input1.resource), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: 'unknownTypeId',
            editorId: 'unknownTypeId',
        }), false);
        const input2 = new TestFileEditorInput(URI.parse('foo://bar2'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);
        const input3 = new TestFileEditorInput(URI.parse('foo://bar3'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);
        assert.strictEqual(observer.hasEditors(input2.resource), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
        await part.activeGroup.openEditor(input2, { pinned: true });
        await part.activeGroup.openEditor(input3, { pinned: true });
        currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 3);
        assert.strictEqual(currentEditorsMRU[0].groupId, part.activeGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input3);
        assert.strictEqual(currentEditorsMRU[1].groupId, part.activeGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input2);
        assert.strictEqual(currentEditorsMRU[2].groupId, part.activeGroup.id);
        assert.strictEqual(currentEditorsMRU[2].editor, input1);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        await part.activeGroup.openEditor(input2, { pinned: true });
        currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 3);
        assert.strictEqual(currentEditorsMRU[0].groupId, part.activeGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input2);
        assert.strictEqual(currentEditorsMRU[1].groupId, part.activeGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input3);
        assert.strictEqual(currentEditorsMRU[2].groupId, part.activeGroup.id);
        assert.strictEqual(currentEditorsMRU[2].editor, input1);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        onDidMostRecentlyActiveEditorsChangeCalled = false;
        await part.activeGroup.closeEditor(input1);
        currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 2);
        assert.strictEqual(currentEditorsMRU[0].groupId, part.activeGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input2);
        assert.strictEqual(currentEditorsMRU[1].groupId, part.activeGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input3);
        assert.strictEqual(onDidMostRecentlyActiveEditorsChangeCalled, true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        await part.activeGroup.closeAllEditors();
        currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 0);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), false);
    }
    test('basics (multi group)', async () => {
        const [part, observer] = await createEditorObserver();
        const rootGroup = part.activeGroup;
        let currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 0);
        const sideGroup = disposables.add(part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */));
        const input1 = new TestFileEditorInput(URI.parse('foo://bar1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);
        await rootGroup.openEditor(input1, { pinned: true, activation: EditorActivation.ACTIVATE });
        await sideGroup.openEditor(input1, { pinned: true, activation: EditorActivation.ACTIVATE });
        currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 2);
        assert.strictEqual(currentEditorsMRU[0].groupId, sideGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input1);
        assert.strictEqual(currentEditorsMRU[1].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input1);
        assert.strictEqual(observer.hasEditors(input1.resource), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        await rootGroup.openEditor(input1, { pinned: true, activation: EditorActivation.ACTIVATE });
        currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 2);
        assert.strictEqual(currentEditorsMRU[0].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input1);
        assert.strictEqual(currentEditorsMRU[1].groupId, sideGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input1);
        assert.strictEqual(observer.hasEditors(input1.resource), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        // Opening an editor inactive should not change
        // the most recent editor, but rather put it behind
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        await rootGroup.openEditor(input2, { inactive: true });
        currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 3);
        assert.strictEqual(currentEditorsMRU[0].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input1);
        assert.strictEqual(currentEditorsMRU[1].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input2);
        assert.strictEqual(currentEditorsMRU[2].groupId, sideGroup.id);
        assert.strictEqual(currentEditorsMRU[2].editor, input1);
        assert.strictEqual(observer.hasEditors(input1.resource), true);
        assert.strictEqual(observer.hasEditors(input2.resource), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        await rootGroup.closeAllEditors();
        currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 1);
        assert.strictEqual(currentEditorsMRU[0].groupId, sideGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input1);
        assert.strictEqual(observer.hasEditors(input1.resource), true);
        assert.strictEqual(observer.hasEditors(input2.resource), false);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
        await sideGroup.closeAllEditors();
        currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 0);
        assert.strictEqual(observer.hasEditors(input1.resource), false);
        assert.strictEqual(observer.hasEditors(input2.resource), false);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
        part.removeGroup(sideGroup);
    });
    test('hasEditor/hasEditors - same resource, different type id', async () => {
        const [part, observer] = await createEditorObserver();
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(input1.resource, 'otherTypeId'));
        assert.strictEqual(observer.hasEditors(input1.resource), false);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
        await part.activeGroup.openEditor(input1, { pinned: true });
        assert.strictEqual(observer.hasEditors(input1.resource), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
        await part.activeGroup.openEditor(input2, { pinned: true });
        assert.strictEqual(observer.hasEditors(input1.resource), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        await part.activeGroup.closeEditor(input2);
        assert.strictEqual(observer.hasEditors(input1.resource), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
        await part.activeGroup.closeEditor(input1);
        assert.strictEqual(observer.hasEditors(input1.resource), false);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
    });
    test('hasEditor/hasEditors - side by side editor support', async () => {
        const [part, observer, instantiationService] = await createEditorObserver();
        const primary = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        const secondary = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), 'otherTypeId'));
        const input = instantiationService.createInstance(SideBySideEditorInput, 'name', undefined, secondary, primary);
        assert.strictEqual(observer.hasEditors(primary.resource), false);
        assert.strictEqual(observer.hasEditor({
            resource: primary.resource,
            typeId: primary.typeId,
            editorId: primary.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: secondary.resource,
            typeId: secondary.typeId,
            editorId: secondary.editorId,
        }), false);
        await part.activeGroup.openEditor(input, { pinned: true });
        assert.strictEqual(observer.hasEditors(primary.resource), true);
        assert.strictEqual(observer.hasEditor({
            resource: primary.resource,
            typeId: primary.typeId,
            editorId: primary.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: secondary.resource,
            typeId: secondary.typeId,
            editorId: secondary.editorId,
        }), false);
        await part.activeGroup.openEditor(primary, { pinned: true });
        assert.strictEqual(observer.hasEditors(primary.resource), true);
        assert.strictEqual(observer.hasEditor({
            resource: primary.resource,
            typeId: primary.typeId,
            editorId: primary.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: secondary.resource,
            typeId: secondary.typeId,
            editorId: secondary.editorId,
        }), false);
        await part.activeGroup.closeEditor(input);
        assert.strictEqual(observer.hasEditors(primary.resource), true);
        assert.strictEqual(observer.hasEditor({
            resource: primary.resource,
            typeId: primary.typeId,
            editorId: primary.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: secondary.resource,
            typeId: secondary.typeId,
            editorId: secondary.editorId,
        }), false);
        await part.activeGroup.closeEditor(primary);
        assert.strictEqual(observer.hasEditors(primary.resource), false);
        assert.strictEqual(observer.hasEditor({
            resource: primary.resource,
            typeId: primary.typeId,
            editorId: primary.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: secondary.resource,
            typeId: secondary.typeId,
            editorId: secondary.editorId,
        }), false);
    });
    test('copy group', async function () {
        const [part, observer] = await createEditorObserver();
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        const input3 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar3'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        const rootGroup = part.activeGroup;
        await rootGroup.openEditor(input1, { pinned: true });
        await rootGroup.openEditor(input2, { pinned: true });
        await rootGroup.openEditor(input3, { pinned: true });
        let currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 3);
        assert.strictEqual(currentEditorsMRU[0].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input3);
        assert.strictEqual(currentEditorsMRU[1].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input2);
        assert.strictEqual(currentEditorsMRU[2].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[2].editor, input1);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        const copiedGroup = part.copyGroup(rootGroup, rootGroup, 3 /* GroupDirection.RIGHT */);
        copiedGroup.setActive(true);
        copiedGroup.focus();
        currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 6);
        assert.strictEqual(currentEditorsMRU[0].groupId, copiedGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input3);
        assert.strictEqual(currentEditorsMRU[1].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input3);
        assert.strictEqual(currentEditorsMRU[2].groupId, copiedGroup.id);
        assert.strictEqual(currentEditorsMRU[2].editor, input2);
        assert.strictEqual(currentEditorsMRU[3].groupId, copiedGroup.id);
        assert.strictEqual(currentEditorsMRU[3].editor, input1);
        assert.strictEqual(currentEditorsMRU[4].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[4].editor, input2);
        assert.strictEqual(currentEditorsMRU[5].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[5].editor, input1);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        await rootGroup.closeAllEditors();
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        await copiedGroup.closeAllEditors();
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), false);
    });
    test('initial editors are part of observer and state is persisted & restored (single group)', async () => {
        const [part] = await createPart();
        const rootGroup = part.activeGroup;
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        const input3 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar3'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        await rootGroup.openEditor(input1, { pinned: true });
        await rootGroup.openEditor(input2, { pinned: true });
        await rootGroup.openEditor(input3, { pinned: true });
        const storage = disposables.add(new TestStorageService());
        const observer = disposables.add(new EditorsObserver(undefined, part, storage));
        await part.whenReady;
        let currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 3);
        assert.strictEqual(currentEditorsMRU[0].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input3);
        assert.strictEqual(currentEditorsMRU[1].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input2);
        assert.strictEqual(currentEditorsMRU[2].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[2].editor, input1);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        storage.testEmitWillSaveState(WillSaveStateReason.SHUTDOWN);
        const restoredObserver = disposables.add(new EditorsObserver(undefined, part, storage));
        await part.whenReady;
        currentEditorsMRU = restoredObserver.editors;
        assert.strictEqual(currentEditorsMRU.length, 3);
        assert.strictEqual(currentEditorsMRU[0].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input3);
        assert.strictEqual(currentEditorsMRU[1].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input2);
        assert.strictEqual(currentEditorsMRU[2].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[2].editor, input1);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
    });
    test('initial editors are part of observer (multi group)', async () => {
        const [part] = await createPart();
        const rootGroup = part.activeGroup;
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        const input3 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar3'), TEST_SERIALIZABLE_EDITOR_INPUT_ID));
        await rootGroup.openEditor(input1, { pinned: true });
        await rootGroup.openEditor(input2, { pinned: true });
        const sideGroup = disposables.add(part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */));
        await sideGroup.openEditor(input3, { pinned: true });
        const storage = disposables.add(new TestStorageService());
        const observer = disposables.add(new EditorsObserver(undefined, part, storage));
        await part.whenReady;
        let currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 3);
        assert.strictEqual(currentEditorsMRU[0].groupId, sideGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input3);
        assert.strictEqual(currentEditorsMRU[1].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input2);
        assert.strictEqual(currentEditorsMRU[2].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[2].editor, input1);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        storage.testEmitWillSaveState(WillSaveStateReason.SHUTDOWN);
        const restoredObserver = disposables.add(new EditorsObserver(undefined, part, storage));
        await part.whenReady;
        currentEditorsMRU = restoredObserver.editors;
        assert.strictEqual(currentEditorsMRU.length, 3);
        assert.strictEqual(currentEditorsMRU[0].groupId, sideGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input3);
        assert.strictEqual(currentEditorsMRU[1].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[1].editor, input2);
        assert.strictEqual(currentEditorsMRU[2].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[2].editor, input1);
        assert.strictEqual(restoredObserver.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(restoredObserver.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(restoredObserver.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
    });
    test('observer does not restore editors that cannot be serialized', async () => {
        const [part] = await createPart();
        const rootGroup = part.activeGroup;
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        await rootGroup.openEditor(input1, { pinned: true });
        const storage = disposables.add(new TestStorageService());
        const observer = disposables.add(new EditorsObserver(undefined, part, storage));
        await part.whenReady;
        let currentEditorsMRU = observer.editors;
        assert.strictEqual(currentEditorsMRU.length, 1);
        assert.strictEqual(currentEditorsMRU[0].groupId, rootGroup.id);
        assert.strictEqual(currentEditorsMRU[0].editor, input1);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        storage.testEmitWillSaveState(WillSaveStateReason.SHUTDOWN);
        const restoredObserver = disposables.add(new EditorsObserver(undefined, part, storage));
        await part.whenReady;
        currentEditorsMRU = restoredObserver.editors;
        assert.strictEqual(currentEditorsMRU.length, 0);
        assert.strictEqual(restoredObserver.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
    });
    test('observer closes editors when limit reached (across all groups)', async () => {
        const [part] = await createPart();
        disposables.add(part.enforcePartOptions({ limit: { enabled: true, value: 3 } }));
        const storage = disposables.add(new TestStorageService());
        const observer = disposables.add(new EditorsObserver(undefined, part, storage));
        const rootGroup = part.activeGroup;
        const sideGroup = disposables.add(part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */));
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        const input3 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar3'), TEST_EDITOR_INPUT_ID));
        const input4 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar4'), TEST_EDITOR_INPUT_ID));
        await rootGroup.openEditor(input1, { pinned: true });
        await rootGroup.openEditor(input2, { pinned: true });
        await rootGroup.openEditor(input3, { pinned: true });
        await rootGroup.openEditor(input4, { pinned: true });
        assert.strictEqual(rootGroup.count, 3);
        assert.strictEqual(rootGroup.contains(input1), false);
        assert.strictEqual(rootGroup.contains(input2), true);
        assert.strictEqual(rootGroup.contains(input3), true);
        assert.strictEqual(rootGroup.contains(input4), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input4.resource,
            typeId: input4.typeId,
            editorId: input4.editorId,
        }), true);
        input2.setDirty();
        disposables.add(part.enforcePartOptions({ limit: { enabled: true, value: 1 } }));
        await timeout(0);
        assert.strictEqual(rootGroup.count, 2);
        assert.strictEqual(rootGroup.contains(input1), false);
        assert.strictEqual(rootGroup.contains(input2), true); // dirty
        assert.strictEqual(rootGroup.contains(input3), false);
        assert.strictEqual(rootGroup.contains(input4), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input4.resource,
            typeId: input4.typeId,
            editorId: input4.editorId,
        }), true);
        const input5 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar5'), TEST_EDITOR_INPUT_ID));
        await sideGroup.openEditor(input5, { pinned: true });
        assert.strictEqual(rootGroup.count, 1);
        assert.strictEqual(rootGroup.contains(input1), false);
        assert.strictEqual(rootGroup.contains(input2), true); // dirty
        assert.strictEqual(rootGroup.contains(input3), false);
        assert.strictEqual(rootGroup.contains(input4), false);
        assert.strictEqual(sideGroup.contains(input5), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input4.resource,
            typeId: input4.typeId,
            editorId: input4.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input5.resource,
            typeId: input5.typeId,
            editorId: input5.editorId,
        }), true);
    });
    test('observer closes editors when limit reached (in group)', async () => {
        const [part] = await createPart();
        disposables.add(part.enforcePartOptions({ limit: { enabled: true, value: 3, perEditorGroup: true } }));
        const storage = disposables.add(new TestStorageService());
        const observer = disposables.add(new EditorsObserver(undefined, part, storage));
        const rootGroup = part.activeGroup;
        const sideGroup = disposables.add(part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */));
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        const input3 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar3'), TEST_EDITOR_INPUT_ID));
        const input4 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar4'), TEST_EDITOR_INPUT_ID));
        await rootGroup.openEditor(input1, { pinned: true });
        await rootGroup.openEditor(input2, { pinned: true });
        await rootGroup.openEditor(input3, { pinned: true });
        await rootGroup.openEditor(input4, { pinned: true });
        assert.strictEqual(rootGroup.count, 3); // 1 editor got closed due to our limit!
        assert.strictEqual(rootGroup.contains(input1), false);
        assert.strictEqual(rootGroup.contains(input2), true);
        assert.strictEqual(rootGroup.contains(input3), true);
        assert.strictEqual(rootGroup.contains(input4), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input4.resource,
            typeId: input4.typeId,
            editorId: input4.editorId,
        }), true);
        await sideGroup.openEditor(input1, { pinned: true });
        await sideGroup.openEditor(input2, { pinned: true });
        await sideGroup.openEditor(input3, { pinned: true });
        await sideGroup.openEditor(input4, { pinned: true });
        assert.strictEqual(sideGroup.count, 3);
        assert.strictEqual(sideGroup.contains(input1), false);
        assert.strictEqual(sideGroup.contains(input2), true);
        assert.strictEqual(sideGroup.contains(input3), true);
        assert.strictEqual(sideGroup.contains(input4), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input4.resource,
            typeId: input4.typeId,
            editorId: input4.editorId,
        }), true);
        disposables.add(part.enforcePartOptions({ limit: { enabled: true, value: 1, perEditorGroup: true } }));
        await timeout(10);
        assert.strictEqual(rootGroup.count, 1);
        assert.strictEqual(rootGroup.contains(input1), false);
        assert.strictEqual(rootGroup.contains(input2), false);
        assert.strictEqual(rootGroup.contains(input3), false);
        assert.strictEqual(rootGroup.contains(input4), true);
        assert.strictEqual(sideGroup.count, 1);
        assert.strictEqual(sideGroup.contains(input1), false);
        assert.strictEqual(sideGroup.contains(input2), false);
        assert.strictEqual(sideGroup.contains(input3), false);
        assert.strictEqual(sideGroup.contains(input4), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input4.resource,
            typeId: input4.typeId,
            editorId: input4.editorId,
        }), true);
    });
    test('observer does not close sticky', async () => {
        const [part] = await createPart();
        disposables.add(part.enforcePartOptions({ limit: { enabled: true, value: 3 } }));
        const storage = disposables.add(new TestStorageService());
        const observer = disposables.add(new EditorsObserver(undefined, part, storage));
        const rootGroup = part.activeGroup;
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        const input3 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar3'), TEST_EDITOR_INPUT_ID));
        const input4 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar4'), TEST_EDITOR_INPUT_ID));
        await rootGroup.openEditor(input1, { pinned: true, sticky: true });
        await rootGroup.openEditor(input2, { pinned: true });
        await rootGroup.openEditor(input3, { pinned: true });
        await rootGroup.openEditor(input4, { pinned: true });
        assert.strictEqual(rootGroup.count, 3);
        assert.strictEqual(rootGroup.contains(input1), true);
        assert.strictEqual(rootGroup.contains(input2), false);
        assert.strictEqual(rootGroup.contains(input3), true);
        assert.strictEqual(rootGroup.contains(input4), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input4.resource,
            typeId: input4.typeId,
            editorId: input4.editorId,
        }), true);
    });
    test('observer does not close scratchpads', async () => {
        const [part] = await createPart();
        disposables.add(part.enforcePartOptions({ limit: { enabled: true, value: 3 } }));
        const storage = disposables.add(new TestStorageService());
        const observer = disposables.add(new EditorsObserver(undefined, part, storage));
        const rootGroup = part.activeGroup;
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        input1.capabilities = 4 /* EditorInputCapabilities.Untitled */ | 512 /* EditorInputCapabilities.Scratchpad */;
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        const input3 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar3'), TEST_EDITOR_INPUT_ID));
        const input4 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar4'), TEST_EDITOR_INPUT_ID));
        await rootGroup.openEditor(input1, { pinned: true });
        await rootGroup.openEditor(input2, { pinned: true });
        await rootGroup.openEditor(input3, { pinned: true });
        await rootGroup.openEditor(input4, { pinned: true });
        assert.strictEqual(rootGroup.count, 3);
        assert.strictEqual(rootGroup.contains(input1), true);
        assert.strictEqual(rootGroup.contains(input2), false);
        assert.strictEqual(rootGroup.contains(input3), true);
        assert.strictEqual(rootGroup.contains(input4), true);
        assert.strictEqual(observer.hasEditor({
            resource: input1.resource,
            typeId: input1.typeId,
            editorId: input1.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input2.resource,
            typeId: input2.typeId,
            editorId: input2.editorId,
        }), false);
        assert.strictEqual(observer.hasEditor({
            resource: input3.resource,
            typeId: input3.typeId,
            editorId: input3.editorId,
        }), true);
        assert.strictEqual(observer.hasEditor({
            resource: input4.resource,
            typeId: input4.typeId,
            editorId: input4.editorId,
        }), true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yc09ic2VydmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9lZGl0b3JzT2JzZXJ2ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUVOLGdCQUFnQixHQUVoQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixFQUNuQixrQkFBa0IsRUFFbEIsZ0JBQWdCLEVBQ2hCLDRCQUE0QixHQUM1QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDNUYsT0FBTyxFQUFrQixvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUUxRixP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R0FBRyxDQUM3QixJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FDdEUsQ0FBQTtRQUVELE1BQU0sU0FBUyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNwRCxNQUFNLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDcEQsTUFBTSxTQUFTLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sU0FBUyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUVwRCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyx3Q0FBd0M7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDbEIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1lBQ3pCLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtZQUNyQixRQUFRLEVBQUUsTUFBTSxDQUFD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
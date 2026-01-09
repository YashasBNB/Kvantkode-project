/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EditorGroupModel, } from '../../../../common/editor/editorGroupModel.js';
import { EditorExtensions, } from '../../../../common/editor.js';
import { TestLifecycleService } from '../../workbenchTestServices.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { TestContextService, TestStorageService } from '../../../common/workbenchTestServices.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { StickyEditorGroupModel, UnstickyEditorGroupModel, } from '../../../../common/editor/filteredEditorGroupModel.js';
suite('FilteredEditorGroupModel', () => {
    let testInstService;
    suiteTeardown(() => {
        testInstService?.dispose();
        testInstService = undefined;
    });
    function inst() {
        if (!testInstService) {
            testInstService = new TestInstantiationService();
        }
        const inst = testInstService;
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', {
            editor: { openPositioning: 'right', focusRecentEditorAfterClose: true },
        });
        inst.stub(IConfigurationService, config);
        return inst;
    }
    function createEditorGroupModel(serialized) {
        const group = disposables.add(inst().createInstance(EditorGroupModel, serialized));
        disposables.add(toDisposable(() => {
            for (const editor of group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
                group.closeEditor(editor);
            }
        }));
        return group;
    }
    let index = 0;
    class TestEditorInput extends EditorInput {
        constructor(id) {
            super();
            this.id = id;
            this.resource = undefined;
        }
        get typeId() {
            return 'testEditorInputForGroups';
        }
        async resolve() {
            return null;
        }
        matches(other) {
            return other && this.id === other.id && other instanceof TestEditorInput;
        }
        setDirty() {
            this._onDidChangeDirty.fire();
        }
        setLabel() {
            this._onDidChangeLabel.fire();
        }
    }
    class NonSerializableTestEditorInput extends EditorInput {
        constructor(id) {
            super();
            this.id = id;
            this.resource = undefined;
        }
        get typeId() {
            return 'testEditorInputForGroups-nonSerializable';
        }
        async resolve() {
            return null;
        }
        matches(other) {
            return other && this.id === other.id && other instanceof NonSerializableTestEditorInput;
        }
    }
    class TestFileEditorInput extends EditorInput {
        constructor(id, resource) {
            super();
            this.id = id;
            this.resource = resource;
            this.preferredResource = this.resource;
        }
        get typeId() {
            return 'testFileEditorInputForGroups';
        }
        get editorId() {
            return this.id;
        }
        async resolve() {
            return null;
        }
        setPreferredName(name) { }
        setPreferredDescription(description) { }
        setPreferredResource(resource) { }
        async setEncoding(encoding) { }
        getEncoding() {
            return undefined;
        }
        setPreferredEncoding(encoding) { }
        setForceOpenAsBinary() { }
        setPreferredContents(contents) { }
        setLanguageId(languageId) { }
        setPreferredLanguageId(languageId) { }
        isResolved() {
            return false;
        }
        matches(other) {
            if (super.matches(other)) {
                return true;
            }
            if (other instanceof TestFileEditorInput) {
                return isEqual(other.resource, this.resource);
            }
            return false;
        }
    }
    function input(id = String(index++), nonSerializable, resource) {
        if (resource) {
            return disposables.add(new TestFileEditorInput(id, resource));
        }
        return nonSerializable
            ? disposables.add(new NonSerializableTestEditorInput(id))
            : disposables.add(new TestEditorInput(id));
    }
    function closeAllEditors(group) {
        for (const editor of group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)) {
            group.closeEditor(editor, undefined, false);
        }
    }
    class TestEditorInputSerializer {
        static { this.disableSerialize = false; }
        static { this.disableDeserialize = false; }
        canSerialize(editorInput) {
            return true;
        }
        serialize(editorInput) {
            if (TestEditorInputSerializer.disableSerialize) {
                return undefined;
            }
            const testEditorInput = editorInput;
            const testInput = {
                id: testEditorInput.id,
            };
            return JSON.stringify(testInput);
        }
        deserialize(instantiationService, serializedEditorInput) {
            if (TestEditorInputSerializer.disableDeserialize) {
                return undefined;
            }
            const testInput = JSON.parse(serializedEditorInput);
            return disposables.add(new TestEditorInput(testInput.id));
        }
    }
    const disposables = new DisposableStore();
    setup(() => {
        TestEditorInputSerializer.disableSerialize = false;
        TestEditorInputSerializer.disableDeserialize = false;
        disposables.add(Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer('testEditorInputForGroups', TestEditorInputSerializer));
    });
    teardown(() => {
        disposables.clear();
        index = 1;
    });
    test('Sticky/Unsticky count', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1, { pinned: true, sticky: true });
        model.openEditor(input2, { pinned: true, sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.count, 2);
        assert.strictEqual(unstickyFilteredEditorGroup.count, 0);
        model.unstick(input1);
        assert.strictEqual(stickyFilteredEditorGroup.count, 1);
        assert.strictEqual(unstickyFilteredEditorGroup.count, 1);
        model.unstick(input2);
        assert.strictEqual(stickyFilteredEditorGroup.count, 0);
        assert.strictEqual(unstickyFilteredEditorGroup.count, 2);
    });
    test('Sticky/Unsticky stickyCount', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1, { pinned: true, sticky: true });
        model.openEditor(input2, { pinned: true, sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.stickyCount, 2);
        assert.strictEqual(unstickyFilteredEditorGroup.stickyCount, 0);
        model.unstick(input1);
        assert.strictEqual(stickyFilteredEditorGroup.stickyCount, 1);
        assert.strictEqual(unstickyFilteredEditorGroup.stickyCount, 0);
        model.unstick(input2);
        assert.strictEqual(stickyFilteredEditorGroup.stickyCount, 0);
        assert.strictEqual(unstickyFilteredEditorGroup.stickyCount, 0);
    });
    test('Sticky/Unsticky isEmpty', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1, { pinned: true, sticky: false });
        model.openEditor(input2, { pinned: true, sticky: false });
        assert.strictEqual(stickyFilteredEditorGroup.count === 0, true);
        assert.strictEqual(unstickyFilteredEditorGroup.count === 0, false);
        model.stick(input1);
        assert.strictEqual(stickyFilteredEditorGroup.count === 0, false);
        assert.strictEqual(unstickyFilteredEditorGroup.count === 0, false);
        model.stick(input2);
        assert.strictEqual(stickyFilteredEditorGroup.count === 0, false);
        assert.strictEqual(unstickyFilteredEditorGroup.count === 0, true);
    });
    test('Sticky/Unsticky editors', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1, { pinned: true, sticky: true });
        model.openEditor(input2, { pinned: true, sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 2);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        model.unstick(input1);
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 1);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 1);
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input2);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        model.unstick(input2);
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 2);
    });
    test('Sticky/Unsticky activeEditor', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1, { pinned: true, sticky: true, active: true });
        assert.strictEqual(stickyFilteredEditorGroup.activeEditor, input1);
        assert.strictEqual(unstickyFilteredEditorGroup.activeEditor, null);
        model.openEditor(input2, { pinned: true, sticky: false, active: true });
        assert.strictEqual(stickyFilteredEditorGroup.activeEditor, null);
        assert.strictEqual(unstickyFilteredEditorGroup.activeEditor, input2);
        model.closeEditor(input1);
        assert.strictEqual(stickyFilteredEditorGroup.activeEditor, null);
        assert.strictEqual(unstickyFilteredEditorGroup.activeEditor, input2);
        model.closeEditor(input2);
        assert.strictEqual(stickyFilteredEditorGroup.activeEditor, null);
        assert.strictEqual(unstickyFilteredEditorGroup.activeEditor, null);
    });
    test('Sticky/Unsticky previewEditor', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1);
        assert.strictEqual(stickyFilteredEditorGroup.previewEditor, null);
        assert.strictEqual(unstickyFilteredEditorGroup.previewEditor, input1);
        model.openEditor(input2, { sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.previewEditor, null);
        assert.strictEqual(unstickyFilteredEditorGroup.previewEditor, input1);
    });
    test('Sticky/Unsticky isSticky()', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1, { pinned: true, sticky: true });
        model.openEditor(input2, { pinned: true, sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.isSticky(input1), true);
        assert.strictEqual(stickyFilteredEditorGroup.isSticky(input2), true);
        model.unstick(input1);
        model.closeEditor(input1);
        model.openEditor(input2, { pinned: true, sticky: true });
        assert.strictEqual(unstickyFilteredEditorGroup.isSticky(input1), false);
        assert.strictEqual(unstickyFilteredEditorGroup.isSticky(input2), false);
    });
    test('Sticky/Unsticky isPinned()', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        model.openEditor(input1, { pinned: true, sticky: true });
        model.openEditor(input2, { pinned: true, sticky: false });
        model.openEditor(input3, { pinned: false, sticky: true });
        model.openEditor(input4, { pinned: false, sticky: false });
        assert.strictEqual(stickyFilteredEditorGroup.isPinned(input1), true);
        assert.strictEqual(unstickyFilteredEditorGroup.isPinned(input2), true);
        assert.strictEqual(stickyFilteredEditorGroup.isPinned(input3), true);
        assert.strictEqual(unstickyFilteredEditorGroup.isPinned(input4), false);
    });
    test('Sticky/Unsticky isActive()', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1, { pinned: true, sticky: true, active: true });
        assert.strictEqual(stickyFilteredEditorGroup.isActive(input1), true);
        model.openEditor(input2, { pinned: true, sticky: false, active: true });
        assert.strictEqual(stickyFilteredEditorGroup.isActive(input1), false);
        assert.strictEqual(unstickyFilteredEditorGroup.isActive(input2), true);
        model.unstick(input1);
        assert.strictEqual(unstickyFilteredEditorGroup.isActive(input1), false);
        assert.strictEqual(unstickyFilteredEditorGroup.isActive(input2), true);
    });
    test('Sticky/Unsticky getEditors()', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1, { pinned: true, sticky: true, active: true });
        model.openEditor(input2, { pinned: true, sticky: true, active: true });
        // all sticky editors
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 2);
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 2);
        // no unsticky editors
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        // options: excludeSticky
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 0);
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: false })
            .length, 2);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true })
            .length, 0);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: false })
            .length, 0);
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0], input2);
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1], input1);
        model.unstick(input1);
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 1);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 1);
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0], input2);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        model.unstick(input2);
        // all unsticky editors
        assert.strictEqual(stickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 2);
        // order: MOST_RECENTLY_ACTIVE
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0], input2);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1], input1);
        // order: SEQUENTIAL
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input2);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input1);
    });
    test('Sticky/Unsticky getEditorByIndex()', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        const input3 = input();
        model.openEditor(input1, { pinned: true, sticky: true });
        model.openEditor(input2, { pinned: true, sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.getEditorByIndex(0), input1);
        assert.strictEqual(stickyFilteredEditorGroup.getEditorByIndex(1), input2);
        assert.strictEqual(stickyFilteredEditorGroup.getEditorByIndex(2), undefined);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditorByIndex(0), undefined);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditorByIndex(1), undefined);
        model.openEditor(input3, { pinned: true, sticky: false });
        assert.strictEqual(stickyFilteredEditorGroup.getEditorByIndex(0), input1);
        assert.strictEqual(stickyFilteredEditorGroup.getEditorByIndex(1), input2);
        assert.strictEqual(stickyFilteredEditorGroup.getEditorByIndex(2), undefined);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditorByIndex(0), input3);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditorByIndex(1), undefined);
        model.unstick(input1);
        assert.strictEqual(stickyFilteredEditorGroup.getEditorByIndex(0), input2);
        assert.strictEqual(stickyFilteredEditorGroup.getEditorByIndex(1), undefined);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditorByIndex(0), input1);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditorByIndex(1), input3);
        assert.strictEqual(unstickyFilteredEditorGroup.getEditorByIndex(2), undefined);
    });
    test('Sticky/Unsticky indexOf()', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        const input3 = input();
        model.openEditor(input1, { pinned: true, sticky: true });
        model.openEditor(input2, { pinned: true, sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.indexOf(input1), 0);
        assert.strictEqual(stickyFilteredEditorGroup.indexOf(input2), 1);
        assert.strictEqual(unstickyFilteredEditorGroup.indexOf(input1), -1);
        assert.strictEqual(unstickyFilteredEditorGroup.indexOf(input2), -1);
        model.openEditor(input3, { pinned: true, sticky: false });
        assert.strictEqual(stickyFilteredEditorGroup.indexOf(input1), 0);
        assert.strictEqual(stickyFilteredEditorGroup.indexOf(input2), 1);
        assert.strictEqual(stickyFilteredEditorGroup.indexOf(input3), -1);
        assert.strictEqual(unstickyFilteredEditorGroup.indexOf(input1), -1);
        assert.strictEqual(unstickyFilteredEditorGroup.indexOf(input2), -1);
        assert.strictEqual(unstickyFilteredEditorGroup.indexOf(input3), 0);
        model.unstick(input1);
        assert.strictEqual(stickyFilteredEditorGroup.indexOf(input1), -1);
        assert.strictEqual(stickyFilteredEditorGroup.indexOf(input2), 0);
        assert.strictEqual(stickyFilteredEditorGroup.indexOf(input3), -1);
        assert.strictEqual(unstickyFilteredEditorGroup.indexOf(input1), 0);
        assert.strictEqual(unstickyFilteredEditorGroup.indexOf(input2), -1);
        assert.strictEqual(unstickyFilteredEditorGroup.indexOf(input3), 1);
    });
    test('Sticky/Unsticky isFirst()', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1, { pinned: true, sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.isFirst(input1), true);
        model.openEditor(input2, { pinned: true, sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.isFirst(input1), true);
        assert.strictEqual(stickyFilteredEditorGroup.isFirst(input2), false);
        model.unstick(input1);
        assert.strictEqual(unstickyFilteredEditorGroup.isFirst(input1), true);
        assert.strictEqual(stickyFilteredEditorGroup.isFirst(input2), true);
        model.unstick(input2);
        assert.strictEqual(unstickyFilteredEditorGroup.isFirst(input1), false);
        assert.strictEqual(unstickyFilteredEditorGroup.isFirst(input2), true);
        model.moveEditor(input2, 1);
        assert.strictEqual(unstickyFilteredEditorGroup.isFirst(input1), true);
        assert.strictEqual(unstickyFilteredEditorGroup.isFirst(input2), false);
    });
    test('Sticky/Unsticky isLast()', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1, { pinned: true, sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.isLast(input1), true);
        model.openEditor(input2, { pinned: true, sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.isLast(input1), false);
        assert.strictEqual(stickyFilteredEditorGroup.isLast(input2), true);
        model.unstick(input1);
        assert.strictEqual(unstickyFilteredEditorGroup.isLast(input1), true);
        assert.strictEqual(stickyFilteredEditorGroup.isLast(input2), true);
        model.unstick(input2);
        assert.strictEqual(unstickyFilteredEditorGroup.isLast(input1), true);
        assert.strictEqual(unstickyFilteredEditorGroup.isLast(input2), false);
        model.moveEditor(input2, 1);
        assert.strictEqual(unstickyFilteredEditorGroup.isLast(input1), false);
        assert.strictEqual(unstickyFilteredEditorGroup.isLast(input2), true);
    });
    test('Sticky/Unsticky contains()', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        model.openEditor(input1, { pinned: true, sticky: true });
        model.openEditor(input2, { pinned: true, sticky: true });
        assert.strictEqual(stickyFilteredEditorGroup.contains(input1), true);
        assert.strictEqual(stickyFilteredEditorGroup.contains(input2), true);
        assert.strictEqual(unstickyFilteredEditorGroup.contains(input1), false);
        assert.strictEqual(unstickyFilteredEditorGroup.contains(input2), false);
        model.unstick(input1);
        assert.strictEqual(stickyFilteredEditorGroup.contains(input1), false);
        assert.strictEqual(stickyFilteredEditorGroup.contains(input2), true);
        assert.strictEqual(unstickyFilteredEditorGroup.contains(input1), true);
        assert.strictEqual(unstickyFilteredEditorGroup.contains(input2), false);
        model.unstick(input2);
        assert.strictEqual(stickyFilteredEditorGroup.contains(input1), false);
        assert.strictEqual(stickyFilteredEditorGroup.contains(input2), false);
        assert.strictEqual(unstickyFilteredEditorGroup.contains(input1), true);
        assert.strictEqual(unstickyFilteredEditorGroup.contains(input2), true);
    });
    test('Sticky/Unsticky group information', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        // same id
        assert.strictEqual(stickyFilteredEditorGroup.id, model.id);
        assert.strictEqual(unstickyFilteredEditorGroup.id, model.id);
        // group locking same behaviour
        assert.strictEqual(stickyFilteredEditorGroup.isLocked, model.isLocked);
        assert.strictEqual(unstickyFilteredEditorGroup.isLocked, model.isLocked);
        model.lock(true);
        assert.strictEqual(stickyFilteredEditorGroup.isLocked, model.isLocked);
        assert.strictEqual(unstickyFilteredEditorGroup.isLocked, model.isLocked);
        model.lock(false);
        assert.strictEqual(stickyFilteredEditorGroup.isLocked, model.isLocked);
        assert.strictEqual(unstickyFilteredEditorGroup.isLocked, model.isLocked);
    });
    test('Multiple Editors - Editor Emits Dirty and Label Changed', function () {
        const model1 = createEditorGroupModel();
        const model2 = createEditorGroupModel();
        const stickyFilteredEditorGroup1 = disposables.add(new StickyEditorGroupModel(model1));
        const unstickyFilteredEditorGroup1 = disposables.add(new UnstickyEditorGroupModel(model1));
        const stickyFilteredEditorGroup2 = disposables.add(new StickyEditorGroupModel(model2));
        const unstickyFilteredEditorGroup2 = disposables.add(new UnstickyEditorGroupModel(model2));
        const input1 = input();
        const input2 = input();
        model1.openEditor(input1, { pinned: true, active: true });
        model2.openEditor(input2, { pinned: true, active: true, sticky: true });
        // DIRTY
        let dirty1CounterSticky = 0;
        disposables.add(stickyFilteredEditorGroup1.onDidModelChange((e) => {
            if (e.kind === 14 /* GroupModelChangeKind.EDITOR_DIRTY */) {
                dirty1CounterSticky++;
            }
        }));
        let dirty1CounterUnsticky = 0;
        disposables.add(unstickyFilteredEditorGroup1.onDidModelChange((e) => {
            if (e.kind === 14 /* GroupModelChangeKind.EDITOR_DIRTY */) {
                dirty1CounterUnsticky++;
            }
        }));
        let dirty2CounterSticky = 0;
        disposables.add(stickyFilteredEditorGroup2.onDidModelChange((e) => {
            if (e.kind === 14 /* GroupModelChangeKind.EDITOR_DIRTY */) {
                dirty2CounterSticky++;
            }
        }));
        let dirty2CounterUnsticky = 0;
        disposables.add(unstickyFilteredEditorGroup2.onDidModelChange((e) => {
            if (e.kind === 14 /* GroupModelChangeKind.EDITOR_DIRTY */) {
                dirty2CounterUnsticky++;
            }
        }));
        // LABEL
        let label1ChangeCounterSticky = 0;
        disposables.add(stickyFilteredEditorGroup1.onDidModelChange((e) => {
            if (e.kind === 9 /* GroupModelChangeKind.EDITOR_LABEL */) {
                label1ChangeCounterSticky++;
            }
        }));
        let label1ChangeCounterUnsticky = 0;
        disposables.add(unstickyFilteredEditorGroup1.onDidModelChange((e) => {
            if (e.kind === 9 /* GroupModelChangeKind.EDITOR_LABEL */) {
                label1ChangeCounterUnsticky++;
            }
        }));
        let label2ChangeCounterSticky = 0;
        disposables.add(stickyFilteredEditorGroup2.onDidModelChange((e) => {
            if (e.kind === 9 /* GroupModelChangeKind.EDITOR_LABEL */) {
                label2ChangeCounterSticky++;
            }
        }));
        let label2ChangeCounterUnsticky = 0;
        disposables.add(unstickyFilteredEditorGroup2.onDidModelChange((e) => {
            if (e.kind === 9 /* GroupModelChangeKind.EDITOR_LABEL */) {
                label2ChangeCounterUnsticky++;
            }
        }));
        input1.setDirty();
        input1.setLabel();
        assert.strictEqual(dirty1CounterSticky, 0);
        assert.strictEqual(dirty1CounterUnsticky, 1);
        assert.strictEqual(label1ChangeCounterSticky, 0);
        assert.strictEqual(label1ChangeCounterUnsticky, 1);
        input2.setDirty();
        input2.setLabel();
        assert.strictEqual(dirty2CounterSticky, 1);
        assert.strictEqual(dirty2CounterUnsticky, 0);
        assert.strictEqual(label2ChangeCounterSticky, 1);
        assert.strictEqual(label2ChangeCounterUnsticky, 0);
        closeAllEditors(model2);
        input2.setDirty();
        input2.setLabel();
        assert.strictEqual(dirty2CounterSticky, 1);
        assert.strictEqual(dirty2CounterUnsticky, 0);
        assert.strictEqual(label2ChangeCounterSticky, 1);
        assert.strictEqual(label2ChangeCounterUnsticky, 0);
        assert.strictEqual(dirty1CounterSticky, 0);
        assert.strictEqual(dirty1CounterUnsticky, 1);
        assert.strictEqual(label1ChangeCounterSticky, 0);
        assert.strictEqual(label1ChangeCounterUnsticky, 1);
    });
    test('Sticky/Unsticky isTransient()', async () => {
        const model = createEditorGroupModel();
        const stickyFilteredEditorGroup = disposables.add(new StickyEditorGroupModel(model));
        const unstickyFilteredEditorGroup = disposables.add(new UnstickyEditorGroupModel(model));
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        model.openEditor(input1, { pinned: true, transient: false });
        model.openEditor(input2, { pinned: true });
        model.openEditor(input3, { pinned: true, transient: true });
        model.openEditor(input4, { pinned: false, transient: true });
        assert.strictEqual(stickyFilteredEditorGroup.isTransient(input1), false);
        assert.strictEqual(unstickyFilteredEditorGroup.isTransient(input2), false);
        assert.strictEqual(stickyFilteredEditorGroup.isTransient(input3), true);
        assert.strictEqual(unstickyFilteredEditorGroup.isTransient(input4), true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyZWRFZGl0b3JHcm91cE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcGFydHMvZWRpdG9yL2ZpbHRlcmVkRWRpdG9yR3JvdXBNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUNOLGdCQUFnQixHQU1oQixNQUFNLDhCQUE4QixDQUFBO0FBRXJDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbkYsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUs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eUJBQXlCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3hFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdDLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixFQUFFLENBQUE7UUFFdEMsTUFBTSx5QkFBeUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNwRixNQUFNLDJCQUEyQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBRXhGLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBRXRCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRXRFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXBFLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRXZFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXRFLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFckIsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDdkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0MsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLHlCQUF5QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sMkJBQTJCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFeEYsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFFdEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdEUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFdEUscUJBQXFCO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0YsTUFBTSxDQUFDLFdBQVcsQ0FDakIseUJBQXlCLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxNQUFNLEVBQzlFLENBQUMsQ0FDRCxDQUFBO1FBRUQsc0JBQXNCO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0YsTUFBTSxDQUFDLFdBQVcsQ0FDakIsMkJBQTJCLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxNQUFNLEVBQ2hGLENBQUMsQ0FDRCxDQUFBO1FBRUQseUJBQXlCO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLHlCQUF5QixDQUFDLFVBQVUsa0NBQTBCLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxFQUM3RixDQUFDLENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLHlCQUF5QixDQUFDLFVBQVUsa0NBQTBCLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDO2FBQ3JGLE1BQU0sRUFDUixDQUFDLENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLDJCQUEyQixDQUFDLFVBQVUsa0NBQTBCLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDO2FBQ3RGLE1BQU0sRUFDUixDQUFDLENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLDJCQUEyQixDQUFDLFVBQVUsa0NBQTBCLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDO2FBQ3ZGLE1BQU0sRUFDUixDQUFDLENBQ0QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLHlCQUF5QixDQUFDLFVBQVUsMkNBQW1DLENBQUMsQ0FBQyxDQUFDLEVBQzFFLE1BQU0sQ0FDTixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIseUJBQXlCLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxDQUFDLENBQUMsRUFDMUUsTUFBTSxDQUNOLENBQUE7UUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXJCLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0YsTUFBTSxDQUFDLFdBQVcsQ0FDakIsMkJBQTJCLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxNQUFNLEVBQ2hGLENBQUMsQ0FDRCxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FDakIseUJBQXlCLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxDQUFDLENBQUMsRUFDMUUsTUFBTSxDQUNOLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLFVBQVUsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFOUYsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVyQix1QkFBdUI7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLGlDQUF5QixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRixNQUFNLENBQUMsV0FBVyxDQUNqQiwyQkFBMkIsQ0FBQyxVQUFVLDJDQUFtQyxDQUFDLE1BQU0sRUFDaEYsQ0FBQyxDQUNELENBQUE7UUFFRCw4QkFBOEI7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FDakIsMkJBQTJCLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxDQUFDLENBQUMsRUFDNUUsTUFBTSxDQUNOLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQiwyQkFBMkIsQ0FBQyxVQUFVLDJDQUFtQyxDQUFDLENBQUMsQ0FBQyxFQUM1RSxNQUFNLENBQ04sQ0FBQTtRQUVELG9CQUFvQjtRQUNwQixNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLFVBQVUsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUYsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQy9GLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JELE1BQU0sS0FBSyxHQUFHLHNCQUFzQixFQUFFLENBQUE7UUFFdEMsTUFBTSx5QkFBeUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNwRixNQUFNLDJCQUEyQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBRXhGLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBRXRCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN6RSxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM5RSxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRTlFLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUV6RCxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFOUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVyQixNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDL0UsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkJBQTJCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUMsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLHlCQUF5QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sMkJBQTJCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFeEYsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFFdEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3hELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUV4RCxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbkUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRXpELE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxFLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkJBQTJCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUMsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLHlCQUF5QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sMkJBQTJCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFeEYsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFFdEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRXhELE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRW5FLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUV4RCxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVwRSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXJCLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRW5FLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFckIsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFckUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0MsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLHlCQUF5QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sMkJBQTJCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFeEYsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFFdEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRXhELE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWxFLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUV4RCxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVsRSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXJCLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWxFLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFckIsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFckUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDckUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0MsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLHlCQUF5QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sMkJBQTJCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFeEYsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFFdEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3hELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUV4RCxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVwRSxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2RSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXJCLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXBFLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXZFLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFckUsTUFB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
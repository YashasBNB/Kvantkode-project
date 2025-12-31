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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyZWRFZGl0b3JHcm91cE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3BhcnRzL2VkaXRvci9maWx0ZXJlZEVkaXRvckdyb3VwTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixnQkFBZ0IsR0FNaEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUVyQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFF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LENBQUE7UUFFeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdkUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVyQixNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVwRSxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2RSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXJCLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXJFLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJC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
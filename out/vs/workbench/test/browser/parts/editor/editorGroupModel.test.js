/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EditorGroupModel, isGroupEditorChangeEvent, isGroupEditorCloseEvent, isGroupEditorMoveEvent, isGroupEditorOpenEvent, } from '../../../../common/editor/editorGroupModel.js';
import { EditorExtensions, SideBySideEditor, EditorCloseContext, } from '../../../../common/editor.js';
import { URI } from '../../../../../base/common/uri.js';
import { TestLifecycleService, workbenchInstantiationService } from '../../workbenchTestServices.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { TestContextService, TestStorageService } from '../../../common/workbenchTestServices.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('EditorGroupModel', () => {
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
    function closeAllEditors(group) {
        for (const editor of group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)) {
            group.closeEditor(editor, undefined, false);
        }
    }
    function closeEditors(group, except, direction) {
        const index = group.indexOf(except);
        if (index === -1) {
            return; // not found
        }
        // Close to the left
        if (direction === 0 /* CloseDirection.LEFT */) {
            for (let i = index - 1; i >= 0; i--) {
                group.closeEditor(group.getEditorByIndex(i));
            }
        }
        // Close to the right
        else if (direction === 1 /* CloseDirection.RIGHT */) {
            for (let i = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length - 1; i > index; i--) {
                group.closeEditor(group.getEditorByIndex(i));
            }
        }
        // Both directions
        else {
            group
                .getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)
                .filter((editor) => !editor.matches(except))
                .forEach((editor) => group.closeEditor(editor));
        }
    }
    function groupListener(group) {
        const groupEvents = {
            active: [],
            index: [],
            label: [],
            locked: [],
            opened: [],
            closed: [],
            activated: [],
            pinned: [],
            unpinned: [],
            sticky: [],
            unsticky: [],
            transient: [],
            moved: [],
            disposed: [],
        };
        disposables.add(group.onDidModelChange((e) => {
            if (e.kind === 3 /* GroupModelChangeKind.GROUP_LOCKED */) {
                groupEvents.locked.push(group.id);
                return;
            }
            else if (e.kind === 0 /* GroupModelChangeKind.GROUP_ACTIVE */) {
                groupEvents.active.push(group.id);
                return;
            }
            else if (e.kind === 1 /* GroupModelChangeKind.GROUP_INDEX */) {
                groupEvents.index.push(group.id);
                return;
            }
            else if (e.kind === 2 /* GroupModelChangeKind.GROUP_LABEL */) {
                groupEvents.label.push(group.id);
                return;
            }
            if (!e.editor) {
                return;
            }
            switch (e.kind) {
                case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                    if (isGroupEditorOpenEvent(e)) {
                        groupEvents.opened.push(e);
                    }
                    break;
                case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                    if (isGroupEditorCloseEvent(e)) {
                        groupEvents.closed.push(e);
                    }
                    break;
                case 8 /* GroupModelChangeKind.EDITOR_ACTIVE */:
                    if (isGroupEditorChangeEvent(e)) {
                        groupEvents.activated.push(e);
                    }
                    break;
                case 11 /* GroupModelChangeKind.EDITOR_PIN */:
                    if (isGroupEditorChangeEvent(e)) {
                        group.isPinned(e.editor) ? groupEvents.pinned.push(e) : groupEvents.unpinned.push(e);
                    }
                    break;
                case 13 /* GroupModelChangeKind.EDITOR_STICKY */:
                    if (isGroupEditorChangeEvent(e)) {
                        group.isSticky(e.editor) ? groupEvents.sticky.push(e) : groupEvents.unsticky.push(e);
                    }
                    break;
                case 12 /* GroupModelChangeKind.EDITOR_TRANSIENT */:
                    if (isGroupEditorChangeEvent(e)) {
                        groupEvents.transient.push(e);
                    }
                    break;
                case 7 /* GroupModelChangeKind.EDITOR_MOVE */:
                    if (isGroupEditorMoveEvent(e)) {
                        groupEvents.moved.push(e);
                    }
                    break;
                case 15 /* GroupModelChangeKind.EDITOR_WILL_DISPOSE */:
                    if (isGroupEditorChangeEvent(e)) {
                        groupEvents.disposed.push(e);
                    }
                    break;
            }
        }));
        return groupEvents;
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
    test('Clone Group', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Pinned and Active
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        // Sticky
        group.stick(input2);
        assert.ok(group.isSticky(input2));
        // Locked
        assert.strictEqual(group.isLocked, false);
        group.lock(true);
        assert.strictEqual(group.isLocked, true);
        const clone = disposables.add(group.clone());
        assert.notStrictEqual(group.id, clone.id);
        assert.strictEqual(clone.count, 3);
        assert.strictEqual(clone.isLocked, false); // locking does not clone over
        let didEditorLabelChange = false;
        const toDispose = clone.onDidModelChange((e) => {
            if (e.kind === 9 /* GroupModelChangeKind.EDITOR_LABEL */) {
                didEditorLabelChange = true;
            }
        });
        input1.setLabel();
        assert.ok(didEditorLabelChange);
        assert.strictEqual(clone.isPinned(input1), true);
        assert.strictEqual(clone.isActive(input1), false);
        assert.strictEqual(clone.isSticky(input1), false);
        assert.strictEqual(clone.isPinned(input2), true);
        assert.strictEqual(clone.isActive(input2), false);
        assert.strictEqual(clone.isSticky(input2), true);
        assert.strictEqual(clone.isPinned(input3), false);
        assert.strictEqual(clone.isActive(input3), true);
        assert.strictEqual(clone.isSticky(input3), false);
        toDispose.dispose();
    });
    test('isActive - untyped', () => {
        const group = createEditorGroupModel();
        const input = disposables.add(new TestFileEditorInput('testInput', URI.file('fake')));
        const input2 = disposables.add(new TestFileEditorInput('testInput2', URI.file('fake2')));
        const untypedInput = { resource: URI.file('/fake'), options: { override: 'testInput' } };
        const untypedNonActiveInput = {
            resource: URI.file('/fake2'),
            options: { override: 'testInput2' },
        };
        group.openEditor(input, { pinned: true, active: true });
        group.openEditor(input2, { active: false });
        assert.ok(group.isActive(input));
        assert.ok(group.isActive(untypedInput));
        assert.ok(!group.isActive(untypedNonActiveInput));
    });
    test('openEditor - prefers existing side by side editor if same', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const group = createEditorGroupModel();
        const input1 = disposables.add(new TestFileEditorInput('testInput', URI.file('fake1')));
        const input2 = disposables.add(new TestFileEditorInput('testInput', URI.file('fake2')));
        const sideBySideInputSame = instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, input1, input1);
        const sideBySideInputDifferent = instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, input1, input2);
        let res = group.openEditor(sideBySideInputSame, { pinned: true, active: true });
        assert.strictEqual(res.editor, sideBySideInputSame);
        assert.strictEqual(res.isNew, true);
        res = group.openEditor(input1, {
            pinned: true,
            active: true,
            supportSideBySide: SideBySideEditor.BOTH,
        });
        assert.strictEqual(res.editor, sideBySideInputSame);
        assert.strictEqual(res.isNew, false);
        group.closeEditor(sideBySideInputSame);
        res = group.openEditor(sideBySideInputDifferent, { pinned: true, active: true });
        assert.strictEqual(res.editor, sideBySideInputDifferent);
        assert.strictEqual(res.isNew, true);
        res = group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(res.editor, input1);
        assert.strictEqual(res.isNew, true);
    });
    test('indexOf() - prefers direct matching editor over side by side matching one', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const group = createEditorGroupModel();
        const input1 = disposables.add(new TestFileEditorInput('testInput', URI.file('fake1')));
        const sideBySideInput = instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, input1, input1);
        group.openEditor(sideBySideInput, { pinned: true, active: true });
        assert.strictEqual(group.indexOf(sideBySideInput), 0);
        assert.strictEqual(group.indexOf(input1), -1);
        assert.strictEqual(group.indexOf(input1, undefined, { supportSideBySide: SideBySideEditor.BOTH }), 0);
        assert.strictEqual(group.indexOf(input1, undefined, { supportSideBySide: SideBySideEditor.ANY }), 0);
        group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input1, undefined, { supportSideBySide: SideBySideEditor.BOTH }), 1);
        assert.strictEqual(group.indexOf(input1, undefined, { supportSideBySide: SideBySideEditor.ANY }), 1);
    });
    test('contains() - untyped', function () {
        const group = createEditorGroupModel();
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const input1 = input('input1', false, URI.file('/input1'));
        const input2 = input('input2', false, URI.file('/input2'));
        const untypedInput1 = { resource: URI.file('/input1'), options: { override: 'input1' } };
        const untypedInput2 = { resource: URI.file('/input2'), options: { override: 'input2' } };
        const diffInput1 = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input1, input2, undefined);
        const diffInput2 = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input2, input1, undefined);
        const untypedDiffInput1 = {
            original: untypedInput1,
            modified: untypedInput2,
        };
        const untypedDiffInput2 = {
            original: untypedInput2,
            modified: untypedInput1,
        };
        const sideBySideInputSame = instantiationService.createInstance(SideBySideEditorInput, 'name', undefined, input1, input1);
        const sideBySideInputDifferent = instantiationService.createInstance(SideBySideEditorInput, 'name', undefined, input1, input2);
        const untypedSideBySideInputSame = {
            primary: untypedInput1,
            secondary: untypedInput1,
        };
        const untypedSideBySideInputDifferent = {
            primary: untypedInput2,
            secondary: untypedInput1,
        };
        group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedInput1), true);
        assert.strictEqual(group.contains(untypedInput1, { strictEquals: true }), false);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.BOTH }), true);
        assert.strictEqual(group.contains(untypedInput2), false);
        assert.strictEqual(group.contains(untypedInput2, { strictEquals: true }), false);
        assert.strictEqual(group.contains(untypedInput2, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(untypedInput2, { supportSideBySide: SideBySideEditor.BOTH }), false);
        assert.strictEqual(group.contains(untypedDiffInput1), false);
        assert.strictEqual(group.contains(untypedDiffInput2), false);
        group.openEditor(input2, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedInput1), true);
        assert.strictEqual(group.contains(untypedInput2), true);
        assert.strictEqual(group.contains(untypedDiffInput1), false);
        assert.strictEqual(group.contains(untypedDiffInput2), false);
        group.openEditor(diffInput1, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedInput1), true);
        assert.strictEqual(group.contains(untypedInput2), true);
        assert.strictEqual(group.contains(untypedDiffInput1), true);
        assert.strictEqual(group.contains(untypedDiffInput2), false);
        group.openEditor(diffInput2, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedInput1), true);
        assert.strictEqual(group.contains(untypedInput2), true);
        assert.strictEqual(group.contains(untypedDiffInput1), true);
        assert.strictEqual(group.contains(untypedDiffInput2), true);
        group.closeEditor(input1);
        assert.strictEqual(group.contains(untypedInput1), false);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.BOTH }), false);
        assert.strictEqual(group.contains(untypedInput2), true);
        assert.strictEqual(group.contains(untypedDiffInput1), true);
        assert.strictEqual(group.contains(untypedDiffInput2), true);
        group.closeEditor(input2);
        assert.strictEqual(group.contains(untypedInput1), false);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput2), false);
        assert.strictEqual(group.contains(untypedInput2, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedDiffInput1), true);
        assert.strictEqual(group.contains(untypedDiffInput2), true);
        group.closeEditor(diffInput1);
        assert.strictEqual(group.contains(untypedInput1), false);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput2), false);
        assert.strictEqual(group.contains(untypedInput2, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedDiffInput1), false);
        assert.strictEqual(group.contains(untypedDiffInput2), true);
        group.closeEditor(diffInput2);
        assert.strictEqual(group.contains(untypedInput1), false);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(untypedInput2), false);
        assert.strictEqual(group.contains(untypedInput2, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(untypedDiffInput1), false);
        assert.strictEqual(group.contains(untypedDiffInput2), false);
        assert.strictEqual(group.count, 0);
        group.openEditor(sideBySideInputSame, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedSideBySideInputSame), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.BOTH }), true);
        assert.strictEqual(group.contains(untypedInput1, {
            supportSideBySide: SideBySideEditor.ANY,
            strictEquals: true,
        }), false);
        assert.strictEqual(group.contains(untypedInput1, {
            supportSideBySide: SideBySideEditor.BOTH,
            strictEquals: true,
        }), false);
        group.closeEditor(sideBySideInputSame);
        assert.strictEqual(group.count, 0);
        group.openEditor(sideBySideInputDifferent, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedSideBySideInputDifferent), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.BOTH }), false);
    });
    test('contains()', () => {
        const group = createEditorGroupModel();
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const input1 = input();
        const input2 = input();
        const diffInput1 = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input1, input2, undefined);
        const diffInput2 = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input2, input1, undefined);
        const sideBySideInputSame = instantiationService.createInstance(SideBySideEditorInput, 'name', undefined, input1, input1);
        const sideBySideInputDifferent = instantiationService.createInstance(SideBySideEditorInput, 'name', undefined, input1, input2);
        group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(group.contains(input1), true);
        assert.strictEqual(group.contains(input1, { strictEquals: true }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input2), false);
        assert.strictEqual(group.contains(input2, { strictEquals: true }), false);
        assert.strictEqual(group.contains(input2, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(diffInput1), false);
        assert.strictEqual(group.contains(diffInput2), false);
        group.openEditor(input2, { pinned: true, active: true });
        assert.strictEqual(group.contains(input1), true);
        assert.strictEqual(group.contains(input2), true);
        assert.strictEqual(group.contains(diffInput1), false);
        assert.strictEqual(group.contains(diffInput2), false);
        group.openEditor(diffInput1, { pinned: true, active: true });
        assert.strictEqual(group.contains(input1), true);
        assert.strictEqual(group.contains(input2), true);
        assert.strictEqual(group.contains(diffInput1), true);
        assert.strictEqual(group.contains(diffInput2), false);
        group.openEditor(diffInput2, { pinned: true, active: true });
        assert.strictEqual(group.contains(input1), true);
        assert.strictEqual(group.contains(input2), true);
        assert.strictEqual(group.contains(diffInput1), true);
        assert.strictEqual(group.contains(diffInput2), true);
        group.closeEditor(input1);
        assert.strictEqual(group.contains(input1), false);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input2), true);
        assert.strictEqual(group.contains(diffInput1), true);
        assert.strictEqual(group.contains(diffInput2), true);
        group.closeEditor(input2);
        assert.strictEqual(group.contains(input1), false);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input2), false);
        assert.strictEqual(group.contains(input2, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(diffInput1), true);
        assert.strictEqual(group.contains(diffInput2), true);
        group.closeEditor(diffInput1);
        assert.strictEqual(group.contains(input1), false);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input2), false);
        assert.strictEqual(group.contains(input2, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(diffInput1), false);
        assert.strictEqual(group.contains(diffInput2), true);
        group.closeEditor(diffInput2);
        assert.strictEqual(group.contains(input1), false);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(input2), false);
        assert.strictEqual(group.contains(input2, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(diffInput1), false);
        assert.strictEqual(group.contains(diffInput2), false);
        const input3 = input(undefined, true, URI.parse('foo://bar'));
        const input4 = input(undefined, true, URI.parse('foo://barsomething'));
        group.openEditor(input3, { pinned: true, active: true });
        assert.strictEqual(group.contains(input4), false);
        assert.strictEqual(group.contains(input3), true);
        group.closeEditor(input3);
        assert.strictEqual(group.contains(input3), false);
        assert.strictEqual(group.count, 0);
        group.openEditor(sideBySideInputSame, { pinned: true, active: true });
        assert.strictEqual(group.contains(sideBySideInputSame), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.BOTH }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY, strictEquals: true }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.BOTH, strictEquals: true }), true);
        group.closeEditor(sideBySideInputSame);
        assert.strictEqual(group.count, 0);
        group.openEditor(sideBySideInputDifferent, { pinned: true, active: true });
        assert.strictEqual(group.contains(sideBySideInputDifferent), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY, strictEquals: true }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.BOTH }), false);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.BOTH, strictEquals: true }), false);
    });
    test('group serialization', function () {
        inst().invokeFunction((accessor) => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Case 1: inputs can be serialized and deserialized
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        let deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 3);
        assert.strictEqual(deserialized.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 3);
        assert.strictEqual(deserialized.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 3);
        assert.strictEqual(deserialized.isPinned(input1), true);
        assert.strictEqual(deserialized.isPinned(input2), true);
        assert.strictEqual(deserialized.isPinned(input3), false);
        assert.strictEqual(deserialized.isActive(input3), true);
        // Case 2: inputs cannot be serialized
        TestEditorInputSerializer.disableSerialize = true;
        deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(deserialized.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        // Case 3: inputs cannot be deserialized
        TestEditorInputSerializer.disableSerialize = false;
        TestEditorInputSerializer.disableDeserialize = true;
        deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(deserialized.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
    });
    test('group serialization (sticky editor)', function () {
        inst().invokeFunction((accessor) => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Case 1: inputs can be serialized and deserialized
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        group.stick(input2);
        assert.ok(group.isSticky(input2));
        let deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 3);
        assert.strictEqual(deserialized.isPinned(input1), true);
        assert.strictEqual(deserialized.isActive(input1), false);
        assert.strictEqual(deserialized.isSticky(input1), false);
        assert.strictEqual(deserialized.isPinned(input2), true);
        assert.strictEqual(deserialized.isActive(input2), false);
        assert.strictEqual(deserialized.isSticky(input2), true);
        assert.strictEqual(deserialized.isPinned(input3), false);
        assert.strictEqual(deserialized.isActive(input3), true);
        assert.strictEqual(deserialized.isSticky(input3), false);
        // Case 2: inputs cannot be serialized
        TestEditorInputSerializer.disableSerialize = true;
        deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.stickyCount, 0);
        assert.strictEqual(deserialized.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(deserialized.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        // Case 3: inputs cannot be deserialized
        TestEditorInputSerializer.disableSerialize = false;
        TestEditorInputSerializer.disableDeserialize = true;
        deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.stickyCount, 0);
        assert.strictEqual(deserialized.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(deserialized.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
    });
    test('group serialization (locked group)', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        assert.strictEqual(events.locked.length, 0);
        group.lock(true);
        group.lock(true);
        assert.strictEqual(events.locked.length, 1);
        group.lock(false);
        group.lock(false);
        assert.strictEqual(events.locked.length, 2);
    });
    test('locked group', function () {
        const group = createEditorGroupModel();
        group.lock(true);
        let deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.isLocked, true);
        group.lock(false);
        deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.isLocked, false);
    });
    test('index', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        assert.strictEqual(events.index.length, 0);
        group.setIndex(4);
        assert.strictEqual(events.index.length, 1);
    });
    test('label', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        assert.strictEqual(events.label.length, 0);
        group.setLabel('Window 1');
        assert.strictEqual(events.label.length, 1);
    });
    test('active', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        assert.strictEqual(events.active.length, 0);
        group.setActive(undefined);
        assert.strictEqual(events.active.length, 1);
    });
    test('One Editor', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        // Active && Pinned
        const input1 = input();
        const { editor: openedEditor, isNew } = group.openEditor(input1, { active: true, pinned: true });
        assert.strictEqual(openedEditor, input1);
        assert.strictEqual(isNew, true);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 1);
        assert.strictEqual(group.findEditor(input1)[0], input1);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isPinned(input1), true);
        assert.strictEqual(group.isPinned(0), true);
        assert.strictEqual(group.isFirst(input1), true);
        assert.strictEqual(group.isLast(input1), true);
        assert.strictEqual(events.opened[0].editor, input1);
        assert.strictEqual(events.opened[0].editorIndex, 0);
        assert.strictEqual(events.activated[0].editor, input1);
        assert.strictEqual(events.activated[0].editorIndex, 0);
        const index = group.indexOf(input1);
        assert.strictEqual(group.findEditor(input1)[1], index);
        let event = group.closeEditor(input1, EditorCloseContext.UNPIN);
        assert.strictEqual(event?.editor, input1);
        assert.strictEqual(event?.editorIndex, index);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(group.isFirst(input1), false);
        assert.strictEqual(group.isLast(input1), false);
        assert.strictEqual(events.closed[0].editor, input1);
        assert.strictEqual(events.closed[0].editorIndex, 0);
        assert.strictEqual(events.closed[0].context === EditorCloseContext.UNPIN, true);
        // Active && Preview
        const input2 = input();
        group.openEditor(input2, { active: true, pinned: false });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 1);
        assert.strictEqual(group.activeEditor, input2);
        assert.strictEqual(group.isActive(input2), true);
        assert.strictEqual(group.isPinned(input2), false);
        assert.strictEqual(group.isPinned(0), false);
        assert.strictEqual(events.opened[1].editor, input2);
        assert.strictEqual(events.opened[1].editorIndex, 0);
        assert.strictEqual(events.activated[1].editor, input2);
        assert.strictEqual(events.activated[1].editorIndex, 0);
        group.closeEditor(input2);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(events.closed[1].editor, input2);
        assert.strictEqual(events.closed[1].editorIndex, 0);
        assert.strictEqual(events.closed[1].context === EditorCloseContext.REPLACE, false);
        event = group.closeEditor(input2);
        assert.ok(!event);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(events.closed[1].editor, input2);
        // Nonactive && Pinned => gets active because its first editor
        const input3 = input();
        group.openEditor(input3, { active: false, pinned: true });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 1);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.isActive(input3), true);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.isPinned(0), true);
        assert.strictEqual(events.opened[2].editor, input3);
        assert.strictEqual(events.activated[2].editor, input3);
        group.closeEditor(input3);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(events.closed[2].editor, input3);
        assert.strictEqual(events.opened[2].editor, input3);
        assert.strictEqual(events.activated[2].editor, input3);
        group.closeEditor(input3);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(events.closed[2].editor, input3);
        // Nonactive && Preview => gets active because its first editor
        const input4 = input();
        group.openEditor(input4);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 1);
        assert.strictEqual(group.activeEditor, input4);
        assert.strictEqual(group.isActive(input4), true);
        assert.strictEqual(group.isPinned(input4), false);
        assert.strictEqual(group.isPinned(0), false);
        assert.strictEqual(events.opened[3].editor, input4);
        assert.strictEqual(events.activated[3].editor, input4);
        group.closeEditor(input4);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(events.closed[3].editor, input4);
    });
    test('Multiple Editors - Pinned and Active', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input('1');
        const input1Copy = input('1');
        const input2 = input('2');
        const input3 = input('3');
        // Pinned and Active
        let openedEditorResult = group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(openedEditorResult.editor, input1);
        assert.strictEqual(openedEditorResult.isNew, true);
        openedEditorResult = group.openEditor(input1Copy, { pinned: true, active: true }); // opening copy of editor should still return existing one
        assert.strictEqual(openedEditorResult.editor, input1);
        assert.strictEqual(openedEditorResult.isNew, false);
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: true, active: true });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 3);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.isActive(input1), false);
        assert.strictEqual(group.isPinned(input1), true);
        assert.strictEqual(group.isActive(input2), false);
        assert.strictEqual(group.isPinned(input2), true);
        assert.strictEqual(group.isActive(input3), true);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.isFirst(input1), true);
        assert.strictEqual(group.isFirst(input2), false);
        assert.strictEqual(group.isFirst(input3), false);
        assert.strictEqual(group.isLast(input1), false);
        assert.strictEqual(group.isLast(input2), false);
        assert.strictEqual(group.isLast(input3), true);
        assert.strictEqual(events.opened[0].editor, input1);
        assert.strictEqual(events.opened[1].editor, input2);
        assert.strictEqual(events.opened[2].editor, input3);
        assert.strictEqual(events.activated[0].editor, input1);
        assert.strictEqual(events.activated[0].editorIndex, 0);
        assert.strictEqual(events.activated[1].editor, input2);
        assert.strictEqual(events.activated[1].editorIndex, 1);
        assert.strictEqual(events.activated[2].editor, input3);
        assert.strictEqual(events.activated[2].editorIndex, 2);
        const mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input3);
        assert.strictEqual(mru[1], input2);
        assert.strictEqual(mru[2], input1);
        // Add some tests where a matching input is used
        // and verify that events carry the original input
        const sameInput1 = input('1');
        group.openEditor(sameInput1, { pinned: true, active: true });
        assert.strictEqual(events.activated[3].editor, input1);
        assert.strictEqual(events.activated[3].editorIndex, 0);
        group.unpin(sameInput1);
        assert.strictEqual(events.unpinned[0].editor, input1);
        assert.strictEqual(events.unpinned[0].editorIndex, 0);
        group.pin(sameInput1);
        assert.strictEqual(events.pinned[0].editor, input1);
        assert.strictEqual(events.pinned[0].editorIndex, 0);
        group.stick(sameInput1);
        assert.strictEqual(events.sticky[0].editor, input1);
        assert.strictEqual(events.sticky[0].editorIndex, 0);
        group.unstick(sameInput1);
        assert.strictEqual(events.unsticky[0].editor, input1);
        assert.strictEqual(events.unsticky[0].editorIndex, 0);
        group.moveEditor(sameInput1, 1);
        assert.strictEqual(events.moved[0].editor, input1);
        assert.strictEqual(events.moved[0].oldEditorIndex, 0);
        assert.strictEqual(events.moved[0].editorIndex, 1);
        group.closeEditor(sameInput1);
        assert.strictEqual(events.closed[0].editor, input1);
        assert.strictEqual(events.closed[0].editorIndex, 1);
        closeAllEditors(group);
        assert.strictEqual(events.closed.length, 3);
        assert.strictEqual(group.count, 0);
    });
    test('Multiple Editors - Preview editor moves to the side of the active one', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: false, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: true, active: true });
        assert.strictEqual(input3, group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2]);
        const input4 = input();
        group.openEditor(input4, { pinned: false, active: true }); // this should cause the preview editor to move after input3
        assert.strictEqual(input4, group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2]);
    });
    test('Multiple Editors - Pinned and Active (DEFAULT_OPEN_EDITOR_DIRECTION = Direction.LEFT)', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        inst.stub(IConfigurationService, config);
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'left' } });
        const group = disposables.add(inst.createInstance(EditorGroupModel, undefined));
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Pinned and Active
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: true, active: true });
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input1);
        closeAllEditors(group);
        assert.strictEqual(events.closed.length, 3);
        assert.strictEqual(group.count, 0);
        inst.dispose();
    });
    test('Multiple Editors - Pinned and Not Active', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Pinned and Active
        group.openEditor(input1, { pinned: true });
        group.openEditor(input2, { pinned: true });
        group.openEditor(input3, { pinned: true });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 3);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isPinned(input1), true);
        assert.strictEqual(group.isPinned(0), true);
        assert.strictEqual(group.isActive(input2), false);
        assert.strictEqual(group.isPinned(input2), true);
        assert.strictEqual(group.isPinned(1), true);
        assert.strictEqual(group.isActive(input3), false);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.isPinned(2), true);
        assert.strictEqual(group.isPinned(input3), true);
        const mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input1);
        assert.strictEqual(mru[1], input3);
        assert.strictEqual(mru[2], input2);
    });
    test('Multiple Editors - Preview gets overwritten', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Non active, preview
        group.openEditor(input1); // becomes active, preview
        group.openEditor(input2); // overwrites preview
        group.openEditor(input3); // overwrites preview
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 1);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.isActive(input3), true);
        assert.strictEqual(group.isPinned(input3), false);
        assert.strictEqual(!group.isPinned(input3), true);
        assert.strictEqual(events.opened[0].editor, input1);
        assert.strictEqual(events.opened[1].editor, input2);
        assert.strictEqual(events.opened[2].editor, input3);
        assert.strictEqual(events.closed[0].editor, input1);
        assert.strictEqual(events.closed[1].editor, input2);
        assert.strictEqual(events.closed[0].context === EditorCloseContext.REPLACE, true);
        assert.strictEqual(events.closed[1].context === EditorCloseContext.REPLACE, true);
        const mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input3);
        assert.strictEqual(mru.length, 1);
    });
    test('Multiple Editors - set active', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        assert.strictEqual(group.activeEditor, input3);
        let mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input3);
        assert.strictEqual(mru[1], input2);
        assert.strictEqual(mru[2], input1);
        group.setActive(input3);
        assert.strictEqual(events.activated.length, 3);
        group.setActive(input1);
        assert.strictEqual(events.activated[3].editor, input1);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isActive(input2), false);
        assert.strictEqual(group.isActive(input3), false);
        mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input1);
        assert.strictEqual(mru[1], input3);
        assert.strictEqual(mru[2], input2);
    });
    test('Multiple Editors - pin and unpin', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 3);
        group.pin(input3);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.isActive(input3), true);
        assert.strictEqual(events.pinned[0].editor, input3);
        assert.strictEqual(group.count, 3);
        group.unpin(input1);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.isPinned(input1), false);
        assert.strictEqual(group.isActive(input1), false);
        assert.strictEqual(events.unpinned[0].editor, input1);
        assert.strictEqual(group.count, 3);
        group.unpin(input2);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 2); // 2 previews got merged into one
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input3);
        assert.strictEqual(events.closed[0].editor, input1);
        assert.strictEqual(group.count, 2);
        group.unpin(input3);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 1); // pinning replaced the preview
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input3);
        assert.strictEqual(events.closed[1].editor, input2);
        assert.strictEqual(group.count, 1);
    });
    test('Multiple Editors - closing picks next from MRU list', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        const input5 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: true, active: true });
        group.openEditor(input4, { pinned: true, active: true });
        group.openEditor(input5, { pinned: true, active: true });
        assert.strictEqual(group.activeEditor, input5);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0], input5);
        assert.strictEqual(group.count, 5);
        group.closeEditor(input5);
        assert.strictEqual(group.activeEditor, input4);
        assert.strictEqual(events.activated[5].editor, input4);
        assert.strictEqual(group.count, 4);
        group.setActive(input1);
        group.setActive(input4);
        group.closeEditor(input4);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.count, 3);
        group.closeEditor(input1);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 2);
        group.setActive(input2);
        group.closeEditor(input2);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 1);
        group.closeEditor(input3);
        assert.ok(!group.activeEditor);
        assert.strictEqual(group.count, 0);
    });
    test('Multiple Editors - closing picks next to the right', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { focusRecentEditorAfterClose: false } });
        inst.stub(IConfigurationService, config);
        const group = disposables.add(inst.createInstance(EditorGroupModel, undefined));
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        const input5 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: true, active: true });
        group.openEditor(input4, { pinned: true, active: true });
        group.openEditor(input5, { pinned: true, active: true });
        assert.strictEqual(group.activeEditor, input5);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0], input5);
        assert.strictEqual(group.count, 5);
        group.closeEditor(input5);
        assert.strictEqual(group.activeEditor, input4);
        assert.strictEqual(events.activated[5].editor, input4);
        assert.strictEqual(group.count, 4);
        group.setActive(input1);
        group.closeEditor(input1);
        assert.strictEqual(group.activeEditor, input2);
        assert.strictEqual(group.count, 3);
        group.setActive(input3);
        group.closeEditor(input3);
        assert.strictEqual(group.activeEditor, input4);
        assert.strictEqual(group.count, 2);
        group.closeEditor(input4);
        assert.strictEqual(group.activeEditor, input2);
        assert.strictEqual(group.count, 1);
        group.closeEditor(input2);
        assert.ok(!group.activeEditor);
        assert.strictEqual(group.count, 0);
        inst.dispose();
    });
    test('Multiple Editors - move editor', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        const input5 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.moveEditor(input1, 1);
        assert.strictEqual(events.moved[0].editor, input1);
        assert.strictEqual(events.moved[0].oldEditorIndex, 0);
        assert.strictEqual(events.moved[0].editorIndex, 1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input1);
        group.setActive(input1);
        group.openEditor(input3, { pinned: true, active: true });
        group.openEditor(input4, { pinned: true, active: true });
        group.openEditor(input5, { pinned: true, active: true });
        group.moveEditor(input4, 0);
        assert.strictEqual(events.moved[1].editor, input4);
        assert.strictEqual(events.moved[1].oldEditorIndex, 3);
        assert.strictEqual(events.moved[1].editorIndex, 0);
        assert.strictEqual(events.moved[1].editor, input4);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input4);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[3], input3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[4], input5);
        group.moveEditor(input4, 3);
        group.moveEditor(input2, 1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[3], input4);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[4], input5);
        assert.strictEqual(events.moved.length, 4);
        group.moveEditor(input1, 0);
        assert.strictEqual(events.moved.length, 4);
        group.moveEditor(input1, -1);
        assert.strictEqual(events.moved.length, 4);
        group.moveEditor(input5, 4);
        assert.strictEqual(events.moved.length, 4);
        group.moveEditor(input5, 100);
        assert.strictEqual(events.moved.length, 4);
        group.moveEditor(input5, -1);
        assert.strictEqual(events.moved.length, 5);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input5);
        group.moveEditor(input1, 100);
        assert.strictEqual(events.moved.length, 6);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[4], input1);
    });
    test('Multiple Editors - move editor across groups', function () {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const g1_input1 = input();
        const g1_input2 = input();
        const g2_input1 = input();
        group1.openEditor(g1_input1, { active: true, pinned: true });
        group1.openEditor(g1_input2, { active: true, pinned: true });
        group2.openEditor(g2_input1, { active: true, pinned: true });
        // A move across groups is a close in the one group and an open in the other group at a specific index
        group2.closeEditor(g2_input1);
        group1.openEditor(g2_input1, { active: true, pinned: true, index: 1 });
        assert.strictEqual(group1.count, 3);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], g1_input1);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], g2_input1);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], g1_input2);
    });
    test('Multiple Editors - move editor across groups (input already exists in group 1)', function () {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const g1_input1 = input();
        const g1_input2 = input();
        const g1_input3 = input();
        const g2_input1 = g1_input2;
        group1.openEditor(g1_input1, { active: true, pinned: true });
        group1.openEditor(g1_input2, { active: true, pinned: true });
        group1.openEditor(g1_input3, { active: true, pinned: true });
        group2.openEditor(g2_input1, { active: true, pinned: true });
        // A move across groups is a close in the one group and an open in the other group at a specific index
        group2.closeEditor(g2_input1);
        group1.openEditor(g2_input1, { active: true, pinned: true, index: 0 });
        assert.strictEqual(group1.count, 3);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], g1_input2);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], g1_input1);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], g1_input3);
    });
    test('Multiple Editors - Pinned & Non Active', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        group.openEditor(input1);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.previewEditor, input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        assert.strictEqual(group.count, 1);
        const input2 = input();
        group.openEditor(input2, { pinned: true, active: false });
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.previewEditor, input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input2);
        assert.strictEqual(group.count, 2);
        const input3 = input();
        group.openEditor(input3, { pinned: true, active: false });
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.previewEditor, input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input2);
        assert.strictEqual(group.isPinned(input1), false);
        assert.strictEqual(group.isPinned(input2), true);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.count, 3);
    });
    test('Multiple Editors - Close Others, Close Left, Close Right', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        const input5 = input();
        group.openEditor(input1, { active: true, pinned: true });
        group.openEditor(input2, { active: true, pinned: true });
        group.openEditor(input3, { active: true, pinned: true });
        group.openEditor(input4, { active: true, pinned: true });
        group.openEditor(input5, { active: true, pinned: true });
        // Close Others
        closeEditors(group, group.activeEditor);
        assert.strictEqual(group.activeEditor, input5);
        assert.strictEqual(group.count, 1);
        closeAllEditors(group);
        group.openEditor(input1, { active: true, pinned: true });
        group.openEditor(input2, { active: true, pinned: true });
        group.openEditor(input3, { active: true, pinned: true });
        group.openEditor(input4, { active: true, pinned: true });
        group.openEditor(input5, { active: true, pinned: true });
        group.setActive(input3);
        // Close Left
        assert.strictEqual(group.activeEditor, input3);
        closeEditors(group, group.activeEditor, 0 /* CloseDirection.LEFT */);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input4);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input5);
        closeAllEditors(group);
        group.openEditor(input1, { active: true, pinned: true });
        group.openEditor(input2, { active: true, pinned: true });
        group.openEditor(input3, { active: true, pinned: true });
        group.openEditor(input4, { active: true, pinned: true });
        group.openEditor(input5, { active: true, pinned: true });
        group.setActive(input3);
        // Close Right
        assert.strictEqual(group.activeEditor, input3);
        closeEditors(group, group.activeEditor, 1 /* CloseDirection.RIGHT */);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input3);
    });
    test('Multiple Editors - real user example', function () {
        const group = createEditorGroupModel();
        // [] -> /index.html/
        const indexHtml = input('index.html');
        let openedEditor = group.openEditor(indexHtml).editor;
        assert.strictEqual(openedEditor, indexHtml);
        assert.strictEqual(group.activeEditor, indexHtml);
        assert.strictEqual(group.previewEditor, indexHtml);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], indexHtml);
        assert.strictEqual(group.count, 1);
        // /index.html/ -> /index.html/
        const sameIndexHtml = input('index.html');
        openedEditor = group.openEditor(sameIndexHtml).editor;
        assert.strictEqual(openedEditor, indexHtml);
        assert.strictEqual(group.activeEditor, indexHtml);
        assert.strictEqual(group.previewEditor, indexHtml);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], indexHtml);
        assert.strictEqual(group.count, 1);
        // /index.html/ -> /style.css/
        const styleCss = input('style.css');
        openedEditor = group.openEditor(styleCss).editor;
        assert.strictEqual(openedEditor, styleCss);
        assert.strictEqual(group.activeEditor, styleCss);
        assert.strictEqual(group.previewEditor, styleCss);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], styleCss);
        assert.strictEqual(group.count, 1);
        // /style.css/ -> [/style.css/, test.js]
        const testJs = input('test.js');
        openedEditor = group.openEditor(testJs, { active: true, pinned: true }).editor;
        assert.strictEqual(openedEditor, testJs);
        assert.strictEqual(group.previewEditor, styleCss);
        assert.strictEqual(group.activeEditor, testJs);
        assert.strictEqual(group.isPinned(styleCss), false);
        assert.strictEqual(group.isPinned(testJs), true);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], styleCss);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], testJs);
        assert.strictEqual(group.count, 2);
        // [/style.css/, test.js] -> [test.js, /index.html/]
        const indexHtml2 = input('index.html');
        group.openEditor(indexHtml2, { active: true });
        assert.strictEqual(group.activeEditor, indexHtml2);
        assert.strictEqual(group.previewEditor, indexHtml2);
        assert.strictEqual(group.isPinned(indexHtml2), false);
        assert.strictEqual(group.isPinned(testJs), true);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], testJs);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], indexHtml2);
        assert.strictEqual(group.count, 2);
        // make test.js active
        const testJs2 = input('test.js');
        group.setActive(testJs2);
        assert.strictEqual(group.activeEditor, testJs);
        assert.strictEqual(group.isActive(testJs2), true);
        assert.strictEqual(group.count, 2);
        // [test.js, /indexHtml/] -> [test.js, index.html]
        const indexHtml3 = input('index.html');
        group.pin(indexHtml3);
        assert.strictEqual(group.isPinned(indexHtml3), true);
        assert.strictEqual(group.activeEditor, testJs);
        // [test.js, index.html] -> [test.js, file.ts, index.html]
        const fileTs = input('file.ts');
        group.openEditor(fileTs, { active: true, pinned: true });
        assert.strictEqual(group.isPinned(fileTs), true);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.activeEditor, fileTs);
        // [test.js, index.html, file.ts] -> [test.js, /file.ts/, index.html]
        group.unpin(fileTs);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.isPinned(fileTs), false);
        assert.strictEqual(group.activeEditor, fileTs);
        // [test.js, /file.ts/, index.html] -> [test.js, /other.ts/, index.html]
        const otherTs = input('other.ts');
        group.openEditor(otherTs, { active: true });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.activeEditor, otherTs);
        assert.ok(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].matches(testJs));
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], otherTs);
        assert.ok(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2].matches(indexHtml));
        // make index.html active
        const indexHtml4 = input('index.html');
        group.setActive(indexHtml4);
        assert.strictEqual(group.activeEditor, indexHtml2);
        // [test.js, /other.ts/, index.html] -> [test.js, /other.ts/]
        group.closeEditor(indexHtml);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.activeEditor, otherTs);
        assert.ok(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].matches(testJs));
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], otherTs);
        // [test.js, /other.ts/] -> [test.js]
        group.closeEditor(otherTs);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.activeEditor, testJs);
        assert.ok(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].matches(testJs));
        // [test.js] -> /test.js/
        group.unpin(testJs);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.activeEditor, testJs);
        assert.ok(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].matches(testJs));
        assert.strictEqual(group.isPinned(testJs), false);
        // /test.js/ -> []
        group.closeEditor(testJs);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(group.previewEditor, null);
    });
    test('Single Group, Single Editor - persist', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        const lifecycle = disposables.add(new TestLifecycleService());
        inst.stub(ILifecycleService, lifecycle);
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'right' } });
        inst.stub(IConfigurationService, config);
        inst.invokeFunction((accessor) => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        let group = createEditorGroupModel();
        const input1 = input();
        group.openEditor(input1);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.activeEditor.matches(input1), true);
        assert.strictEqual(group.previewEditor.matches(input1), true);
        assert.strictEqual(group.isActive(input1), true);
        // Create model again - should load from storage
        group = disposables.add(inst.createInstance(EditorGroupModel, group.serialize()));
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.activeEditor.matches(input1), true);
        assert.strictEqual(group.previewEditor.matches(input1), true);
        assert.strictEqual(group.isActive(input1), true);
        inst.dispose();
    });
    test('Multiple Groups, Multiple editors - persist', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        const lifecycle = disposables.add(new TestLifecycleService());
        inst.stub(ILifecycleService, lifecycle);
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'right' } });
        inst.stub(IConfigurationService, config);
        inst.invokeFunction((accessor) => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        let group1 = createEditorGroupModel();
        const g1_input1 = input();
        const g1_input2 = input();
        const g1_input3 = input();
        group1.openEditor(g1_input1, { active: true, pinned: true });
        group1.openEditor(g1_input2, { active: true, pinned: false });
        group1.openEditor(g1_input3, { active: false, pinned: true });
        let group2 = createEditorGroupModel();
        const g2_input1 = input();
        const g2_input2 = input();
        const g2_input3 = input();
        group2.openEditor(g2_input1, { active: true, pinned: true });
        group2.openEditor(g2_input2, { active: false, pinned: false });
        group2.openEditor(g2_input3, { active: false, pinned: true });
        assert.strictEqual(group1.count, 3);
        assert.strictEqual(group2.count, 3);
        assert.strictEqual(group1.activeEditor.matches(g1_input2), true);
        assert.strictEqual(group2.activeEditor.matches(g2_input1), true);
        assert.strictEqual(group1.previewEditor.matches(g1_input2), true);
        assert.strictEqual(group2.previewEditor.matches(g2_input2), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(g1_input2), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(g1_input3), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[2].matches(g1_input1), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(g2_input1), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(g2_input3), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[2].matches(g2_input2), true);
        // Create model again - should load from storage
        group1 = disposables.add(inst.createInstance(EditorGroupModel, group1.serialize()));
        group2 = disposables.add(inst.createInstance(EditorGroupModel, group2.serialize()));
        assert.strictEqual(group1.count, 3);
        assert.strictEqual(group2.count, 3);
        assert.strictEqual(group1.activeEditor.matches(g1_input2), true);
        assert.strictEqual(group2.activeEditor.matches(g2_input1), true);
        assert.strictEqual(group1.previewEditor.matches(g1_input2), true);
        assert.strictEqual(group2.previewEditor.matches(g2_input2), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(g1_input2), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(g1_input3), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[2].matches(g1_input1), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(g2_input1), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(g2_input3), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[2].matches(g2_input2), true);
        inst.dispose();
    });
    test('Single group, multiple editors - persist (some not persistable)', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        const lifecycle = disposables.add(new TestLifecycleService());
        inst.stub(ILifecycleService, lifecycle);
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'right' } });
        inst.stub(IConfigurationService, config);
        inst.invokeFunction((accessor) => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        let group = createEditorGroupModel();
        const serializableInput1 = input();
        const nonSerializableInput2 = input('3', true);
        const serializableInput2 = input();
        group.openEditor(serializableInput1, { active: true, pinned: true });
        group.openEditor(nonSerializableInput2, { active: true, pinned: false });
        group.openEditor(serializableInput2, { active: false, pinned: true });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.activeEditor.matches(nonSerializableInput2), true);
        assert.strictEqual(group.previewEditor.matches(nonSerializableInput2), true);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(nonSerializableInput2), true);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(serializableInput2), true);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[2].matches(serializableInput1), true);
        // Create model again - should load from storage
        group = disposables.add(inst.createInstance(EditorGroupModel, group.serialize()));
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.activeEditor.matches(serializableInput2), true);
        assert.strictEqual(group.previewEditor, null);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(serializableInput2), true);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(serializableInput1), true);
        inst.dispose();
    });
    test('Single group, multiple editors - persist (some not persistable, sticky editors)', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        const lifecycle = disposables.add(new TestLifecycleService());
        inst.stub(ILifecycleService, lifecycle);
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'right' } });
        inst.stub(IConfigurationService, config);
        inst.invokeFunction((accessor) => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        let group = createEditorGroupModel();
        const serializableInput1 = input();
        const nonSerializableInput2 = input('3', true);
        const serializableInput2 = input();
        group.openEditor(serializableInput1, { active: true, pinned: true });
        group.openEditor(nonSerializableInput2, { active: true, pinned: true, sticky: true });
        group.openEditor(serializableInput2, { active: false, pinned: true });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        // Create model again - should load from storage
        group = disposables.add(inst.createInstance(EditorGroupModel, group.serialize()));
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.stickyCount, 0);
        inst.dispose();
    });
    test('Multiple groups, multiple editors - persist (some not persistable, causes empty group)', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        const lifecycle = disposables.add(new TestLifecycleService());
        inst.stub(ILifecycleService, lifecycle);
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'right' } });
        inst.stub(IConfigurationService, config);
        inst.invokeFunction((accessor) => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        let group1 = createEditorGroupModel();
        let group2 = createEditorGroupModel();
        const serializableInput1 = input();
        const serializableInput2 = input();
        const nonSerializableInput = input('2', true);
        group1.openEditor(serializableInput1, { pinned: true });
        group1.openEditor(serializableInput2);
        group2.openEditor(nonSerializableInput);
        // Create model again - should load from storage
        group1 = disposables.add(inst.createInstance(EditorGroupModel, group1.serialize()));
        group2 = disposables.add(inst.createInstance(EditorGroupModel, group2.serialize()));
        assert.strictEqual(group1.count, 2);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].matches(serializableInput1), true);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1].matches(serializableInput2), true);
        inst.dispose();
    });
    test('Multiple Editors - Editor Dispose', function () {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const group1Listener = groupListener(group1);
        const group2Listener = groupListener(group2);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group1.openEditor(input1, { pinned: true, active: true });
        group1.openEditor(input2, { pinned: true, active: true });
        group1.openEditor(input3, { pinned: true, active: true });
        group2.openEditor(input1, { pinned: true, active: true });
        group2.openEditor(input2, { pinned: true, active: true });
        input1.dispose();
        assert.strictEqual(group1Listener.disposed.length, 1);
        assert.strictEqual(group1Listener.disposed[0].editorIndex, 0);
        assert.strictEqual(group2Listener.disposed.length, 1);
        assert.strictEqual(group2Listener.disposed[0].editorIndex, 0);
        assert.ok(group1Listener.disposed[0].editor.matches(input1));
        assert.ok(group2Listener.disposed[0].editor.matches(input1));
        input3.dispose();
        assert.strictEqual(group1Listener.disposed.length, 2);
        assert.strictEqual(group1Listener.disposed[1].editorIndex, 2);
        assert.strictEqual(group2Listener.disposed.length, 1);
        assert.ok(group1Listener.disposed[1].editor.matches(input3));
    });
    test('Preview tab does not have a stable position (https://github.com/microsoft/vscode/issues/8245)', function () {
        const group1 = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group1.openEditor(input1, { pinned: true, active: true });
        group1.openEditor(input2, { active: true });
        group1.setActive(input1);
        group1.openEditor(input3, { active: true });
        assert.strictEqual(group1.indexOf(input3), 1);
    });
    test('Multiple Editors - Editor Emits Dirty and Label Changed', function () {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        group1.openEditor(input1, { pinned: true, active: true });
        group2.openEditor(input2, { pinned: true, active: true });
        let dirty1Counter = 0;
        disposables.add(group1.onDidModelChange((e) => {
            if (e.kind === 14 /* GroupModelChangeKind.EDITOR_DIRTY */) {
                dirty1Counter++;
            }
        }));
        let dirty2Counter = 0;
        disposables.add(group2.onDidModelChange((e) => {
            if (e.kind === 14 /* GroupModelChangeKind.EDITOR_DIRTY */) {
                dirty2Counter++;
            }
        }));
        let label1ChangeCounter = 0;
        disposables.add(group1.onDidModelChange((e) => {
            if (e.kind === 9 /* GroupModelChangeKind.EDITOR_LABEL */) {
                label1ChangeCounter++;
            }
        }));
        let label2ChangeCounter = 0;
        disposables.add(group2.onDidModelChange((e) => {
            if (e.kind === 9 /* GroupModelChangeKind.EDITOR_LABEL */) {
                label2ChangeCounter++;
            }
        }));
        input1.setDirty();
        input1.setLabel();
        assert.strictEqual(dirty1Counter, 1);
        assert.strictEqual(label1ChangeCounter, 1);
        input2.setDirty();
        input2.setLabel();
        assert.strictEqual(dirty2Counter, 1);
        assert.strictEqual(label2ChangeCounter, 1);
        closeAllEditors(group2);
        input2.setDirty();
        input2.setLabel();
        assert.strictEqual(dirty2Counter, 1);
        assert.strictEqual(label2ChangeCounter, 1);
        assert.strictEqual(dirty1Counter, 1);
        assert.strictEqual(label1ChangeCounter, 1);
    });
    test('Sticky Editors', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 3);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 3);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 3);
        // Stick last editor should move it first and pin
        group.stick(input3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: false }).length, 3);
        assert.strictEqual(group.isSticky(input1), false);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input2), 2);
        assert.strictEqual(group.indexOf(input3), 0);
        let sequentialAllEditors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        assert.strictEqual(sequentialAllEditors.length, 3);
        let sequentialEditorsExcludingSticky = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, {
            excludeSticky: true,
        });
        assert.strictEqual(sequentialEditorsExcludingSticky.length, 2);
        assert.ok(sequentialEditorsExcludingSticky.indexOf(input1) >= 0);
        assert.ok(sequentialEditorsExcludingSticky.indexOf(input2) >= 0);
        let mruAllEditors = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mruAllEditors.length, 3);
        let mruEditorsExcludingSticky = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, {
            excludeSticky: true,
        });
        assert.strictEqual(mruEditorsExcludingSticky.length, 2);
        assert.ok(mruEditorsExcludingSticky.indexOf(input1) >= 0);
        assert.ok(mruEditorsExcludingSticky.indexOf(input2) >= 0);
        // Sticking same editor again is a no-op
        group.stick(input3);
        assert.strictEqual(group.isSticky(input3), true);
        // Sticking last editor now should move it after sticky one
        group.stick(input2);
        assert.strictEqual(group.stickyCount, 2);
        assert.strictEqual(group.isSticky(input1), false);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.indexOf(input1), 2);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 0);
        sequentialAllEditors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        assert.strictEqual(sequentialAllEditors.length, 3);
        sequentialEditorsExcludingSticky = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, {
            excludeSticky: true,
        });
        assert.strictEqual(sequentialEditorsExcludingSticky.length, 1);
        assert.ok(sequentialEditorsExcludingSticky.indexOf(input1) >= 0);
        mruAllEditors = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mruAllEditors.length, 3);
        mruEditorsExcludingSticky = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, {
            excludeSticky: true,
        });
        assert.strictEqual(mruEditorsExcludingSticky.length, 1);
        assert.ok(mruEditorsExcludingSticky.indexOf(input1) >= 0);
        // Sticking remaining editor also works
        group.stick(input1);
        assert.strictEqual(group.stickyCount, 3);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.indexOf(input1), 2);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 0);
        sequentialAllEditors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        assert.strictEqual(sequentialAllEditors.length, 3);
        sequentialEditorsExcludingSticky = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, {
            excludeSticky: true,
        });
        assert.strictEqual(sequentialEditorsExcludingSticky.length, 0);
        mruAllEditors = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mruAllEditors.length, 3);
        mruEditorsExcludingSticky = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, {
            excludeSticky: true,
        });
        assert.strictEqual(mruEditorsExcludingSticky.length, 0);
        // Unsticking moves editor after sticky ones
        group.unstick(input3);
        assert.strictEqual(group.stickyCount, 2);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input2), 0);
        assert.strictEqual(group.indexOf(input3), 2);
        // Unsticking all works
        group.unstick(input1);
        group.unstick(input2);
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.isSticky(input1), false);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), false);
        group.moveEditor(input1, 0);
        group.moveEditor(input2, 1);
        group.moveEditor(input3, 2);
        // Opening a new editor always opens after sticky editors
        group.stick(input1);
        group.stick(input2);
        group.setActive(input1);
        const events = groupListener(group);
        group.openEditor(input4, { pinned: true, active: true });
        assert.strictEqual(group.indexOf(input4), 2);
        group.closeEditor(input4);
        assert.strictEqual(events.closed[0].sticky, false);
        group.setActive(input2);
        group.openEditor(input4, { pinned: true, active: true });
        assert.strictEqual(group.indexOf(input4), 2);
        group.closeEditor(input4);
        assert.strictEqual(events.closed[1].sticky, false);
        // Reset
        assert.strictEqual(group.stickyCount, 2);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 2);
        // Moving a sticky editor works
        group.moveEditor(input1, 1); // still moved within sticky range
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input2), 0);
        assert.strictEqual(group.indexOf(input3), 2);
        group.moveEditor(input1, 0); // still moved within sticky range
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 2);
        group.moveEditor(input1, 2); // moved out of sticky range//
        assert.strictEqual(group.isSticky(input1), false);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 2);
        assert.strictEqual(group.indexOf(input2), 0);
        assert.strictEqual(group.indexOf(input3), 1);
        group.moveEditor(input2, 2); // moved out of sticky range
        assert.strictEqual(group.isSticky(input1), false);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input2), 2);
        assert.strictEqual(group.indexOf(input3), 0);
        // Reset
        group.moveEditor(input1, 0);
        group.moveEditor(input2, 1);
        group.moveEditor(input3, 2);
        group.stick(input1);
        group.unstick(input2);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 2);
        // Moving a unsticky editor in works
        group.moveEditor(input3, 1); // still moved within unsticked range
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 2);
        assert.strictEqual(group.indexOf(input3), 1);
        group.moveEditor(input3, 2); // still moved within unsticked range
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 2);
        group.moveEditor(input3, 0); // moved into sticky range//
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input2), 2);
        assert.strictEqual(group.indexOf(input3), 0);
        group.moveEditor(input2, 0); // moved into sticky range
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.indexOf(input1), 2);
        assert.strictEqual(group.indexOf(input2), 0);
        assert.strictEqual(group.indexOf(input3), 1);
        // Closing a sticky editor updates state properly
        group.stick(input1);
        group.stick(input2);
        group.unstick(input3);
        assert.strictEqual(group.stickyCount, 2);
        group.closeEditor(input1);
        assert.strictEqual(events.closed[2].sticky, true);
        assert.strictEqual(group.stickyCount, 1);
        group.closeEditor(input2);
        assert.strictEqual(events.closed[3].sticky, true);
        assert.strictEqual(group.stickyCount, 0);
        closeAllEditors(group);
        assert.strictEqual(group.stickyCount, 0);
        // Open sticky
        group.openEditor(input1, { sticky: true });
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(input1), true);
        group.openEditor(input2, { pinned: true, active: true });
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), false);
        group.openEditor(input2, { sticky: true });
        assert.strictEqual(group.stickyCount, 2);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        group.openEditor(input3, { pinned: true, active: true });
        group.openEditor(input4, { pinned: false, active: true, sticky: true });
        assert.strictEqual(group.stickyCount, 3);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.isSticky(input4), true);
        assert.strictEqual(group.isPinned(input4), true);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 3);
        assert.strictEqual(group.indexOf(input4), 2);
    });
    test('Sticky/Unsticky Editors sends correct editor index', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        assert.strictEqual(group.stickyCount, 0);
        const events = groupListener(group);
        group.stick(input3);
        assert.strictEqual(events.sticky[0].editorIndex, 0);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.stickyCount, 1);
        group.stick(input2);
        assert.strictEqual(events.sticky[1].editorIndex, 1);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.stickyCount, 2);
        group.unstick(input3);
        assert.strictEqual(events.unsticky[0].editorIndex, 1);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.stickyCount, 1);
    });
    test('onDidMoveEditor Event', () => {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const input1group1 = input();
        const input2group1 = input();
        const input1group2 = input();
        const input2group2 = input();
        // Open all the editors
        group1.openEditor(input1group1, { pinned: true, active: true, index: 0 });
        group1.openEditor(input2group1, { pinned: true, active: false, index: 1 });
        group2.openEditor(input1group2, { pinned: true, active: true, index: 0 });
        group2.openEditor(input2group2, { pinned: true, active: false, index: 1 });
        const group1Events = groupListener(group1);
        const group2Events = groupListener(group2);
        group1.moveEditor(input1group1, 1);
        assert.strictEqual(group1Events.moved[0].editor, input1group1);
        assert.strictEqual(group1Events.moved[0].oldEditorIndex, 0);
        assert.strictEqual(group1Events.moved[0].editorIndex, 1);
        group2.moveEditor(input1group2, 1);
        assert.strictEqual(group2Events.moved[0].editor, input1group2);
        assert.strictEqual(group2Events.moved[0].oldEditorIndex, 0);
        assert.strictEqual(group2Events.moved[0].editorIndex, 1);
    });
    test('onDidOpeneditor Event', () => {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const group1Events = groupListener(group1);
        const group2Events = groupListener(group2);
        const input1group1 = input();
        const input2group1 = input();
        const input1group2 = input();
        const input2group2 = input();
        // Open all the editors
        group1.openEditor(input1group1, { pinned: true, active: true, index: 0 });
        group1.openEditor(input2group1, { pinned: true, active: false, index: 1 });
        group2.openEditor(input1group2, { pinned: true, active: true, index: 0 });
        group2.openEditor(input2group2, { pinned: true, active: false, index: 1 });
        assert.strictEqual(group1Events.opened.length, 2);
        assert.strictEqual(group1Events.opened[0].editor, input1group1);
        assert.strictEqual(group1Events.opened[0].editorIndex, 0);
        assert.strictEqual(group1Events.opened[1].editor, input2group1);
        assert.strictEqual(group1Events.opened[1].editorIndex, 1);
        assert.strictEqual(group2Events.opened.length, 2);
        assert.strictEqual(group2Events.opened[0].editor, input1group2);
        assert.strictEqual(group2Events.opened[0].editorIndex, 0);
        assert.strictEqual(group2Events.opened[1].editor, input2group2);
        assert.strictEqual(group2Events.opened[1].editorIndex, 1);
    });
    test('moving editor sends sticky event when sticky changes', () => {
        const group1 = createEditorGroupModel();
        const input1group1 = input();
        const input2group1 = input();
        const input3group1 = input();
        // Open all the editors
        group1.openEditor(input1group1, { pinned: true, active: true, index: 0, sticky: true });
        group1.openEditor(input2group1, { pinned: true, active: false, index: 1 });
        group1.openEditor(input3group1, { pinned: true, active: false, index: 2 });
        const group1Events = groupListener(group1);
        group1.moveEditor(input2group1, 0);
        assert.strictEqual(group1Events.sticky[0].editor, input2group1);
        assert.strictEqual(group1Events.sticky[0].editorIndex, 0);
        const group2 = createEditorGroupModel();
        const input1group2 = input();
        const input2group2 = input();
        const input3group2 = input();
        // Open all the editors
        group2.openEditor(input1group2, { pinned: true, active: true, index: 0, sticky: true });
        group2.openEditor(input2group2, { pinned: true, active: false, index: 1 });
        group2.openEditor(input3group2, { pinned: true, active: false, index: 2 });
        const group2Events = groupListener(group2);
        group2.moveEditor(input1group2, 1);
        assert.strictEqual(group2Events.unsticky[0].editor, input1group2);
        assert.strictEqual(group2Events.unsticky[0].editorIndex, 1);
    });
    function assertSelection(group, activeEditor, selectedEditors) {
        assert.strictEqual(group.activeEditor, activeEditor);
        assert.strictEqual(group.selectedEditors.length, selectedEditors.length);
        for (let i = 0; i < selectedEditors.length; i++) {
            assert.strictEqual(group.selectedEditors[i], selectedEditors[i]);
        }
    }
    test('editor selection: selectedEditors', () => {
        const group = createEditorGroupModel();
        const activeEditor = group.activeEditor;
        const selectedEditors = group.selectedEditors;
        assert.strictEqual(activeEditor, null);
        assert.strictEqual(selectedEditors.length, 0);
        // active editor: input1, selection: [input1]
        const input1 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        assertSelection(group, input1, [input1]);
        // active editor: input3, selection: [input3]
        const input2 = input();
        const input3 = input();
        group.openEditor(input2, { pinned: true, active: true, index: 1 });
        group.openEditor(input3, { pinned: true, active: true, index: 2 });
        assertSelection(group, input3, [input3]);
        // active editor: input2, selection: [input1, input2] (in sequential order)
        group.setSelection(input2, [input1]);
        assertSelection(group, input2, [input1, input2]);
    });
    test('editor selection: openEditor with inactive selection', () => {
        const group = createEditorGroupModel();
        // active editor: input3, selection: [input3]
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        group.openEditor(input2, { pinned: true, active: true, index: 1 });
        group.openEditor(input3, { pinned: true, active: true, index: 2 });
        // active editor: input2, selection: [input1, input2, input3] (in sequential order)
        group.openEditor(input2, { active: true, inactiveSelection: [input3, input1] });
        assertSelection(group, input2, [input1, input2, input3]);
        // active editor: input1, selection: [input1, input3] (in sequential order)
        // test duplicate entries
        group.openEditor(input1, { active: true, inactiveSelection: [input3, input1, input3] });
        assertSelection(group, input1, [input1, input3]);
        // active editor: input1, selection: [input1, input2] (in sequential order)
        // open new Editor as inactive with selection
        const input4 = input();
        group.openEditor(input4, { pinned: true, active: false, inactiveSelection: [input2], index: 3 });
        assertSelection(group, input1, [input1, input2]);
        // active editor: input5, selection: [input4, input5] (in sequential order)
        // open new Editor as active with selection
        const input5 = input();
        group.openEditor(input5, { pinned: true, active: true, inactiveSelection: [input4], index: 4 });
        assertSelection(group, input5, [input4, input5]);
    });
    test('editor selection: closeEditor keeps selection', () => {
        const group = createEditorGroupModel();
        // active editor: input3, selection: [input3]
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        group.openEditor(input2, { pinned: true, active: true, index: 1 });
        group.openEditor(input3, { pinned: true, active: true, index: 2 });
        group.setSelection(input2, [input3, input1]);
        group.closeEditor(input3);
        assertSelection(group, input2, [input1, input2]);
    });
    test('editor selection: setSeletion', () => {
        const group = createEditorGroupModel();
        // active editor: input3, selection: [input3]
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        group.openEditor(input2, { pinned: true, active: true, index: 1 });
        group.openEditor(input3, { pinned: true, active: true, index: 2 });
        // active editor: input2, selection: [input1, input2, input3] (in sequential order)
        group.setSelection(input2, [input3, input1]);
        assertSelection(group, input2, [input1, input2, input3]);
        // active editor: input3, selection: [input3]
        group.setSelection(input3, []);
        assertSelection(group, input3, [input3]);
        // active editor: input2, selection: [input1, input2]
        // test duplicate entries
        group.setSelection(input2, [input1, input2, input1]);
        assertSelection(group, input2, [input1, input2]);
    });
    test('editor selection: isSelected', () => {
        const group = createEditorGroupModel();
        // active editor: input3, selection: [input3]
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        group.openEditor(input2, { pinned: true, active: true, index: 1 });
        group.openEditor(input3, { pinned: true, active: true, index: 2 });
        // active editor: input2, selection: [input1, input2, input3] (in sequential order)
        group.setSelection(input2, [input3, input1]);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), true);
        assert.strictEqual(group.isSelected(input3), true);
        // active editor: input3, selection: [input3]
        group.setSelection(input3, []);
        assert.strictEqual(group.isSelected(input1), false);
        assert.strictEqual(group.isSelected(input2), false);
        assert.strictEqual(group.isSelected(input3), true);
        // use index
        assert.strictEqual(group.isSelected(0), false);
        assert.strictEqual(group.isSelected(1), false);
        assert.strictEqual(group.isSelected(2), true);
    });
    test('editor selection: select invalid editor', () => {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        group.setSelection(input2, [input1]);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.selectedEditors.length, 1);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), false);
        group.setSelection(input1, [input2]);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.selectedEditors.length, 1);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), false);
    });
    test('editor transient: basics', () => {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(group.isTransient(input1), false);
        assert.strictEqual(events.transient.length, 0);
        group.openEditor(input2, { pinned: true, active: true, transient: true });
        assert.strictEqual(events.transient[0].editor, input2);
        assert.strictEqual(group.isTransient(input2), true);
        group.setTransient(input1, true);
        assert.strictEqual(group.isTransient(input1), true);
        assert.strictEqual(events.transient[1].editor, input1);
        group.setTransient(input2, false);
        assert.strictEqual(group.isTransient(input2), false);
        assert.strictEqual(events.transient[2].editor, input2);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yR3JvdXBNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sZ0JBQWdCLEVBTWhCLHdCQUF3QixFQUN4Qix1QkFBdUIsRUFDdkIsc0JBQXNCLEVBQ3RCLHNCQUFzQixHQUN0QixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixnQkFBZ0IsRUFRaEIsZ0JBQWdCLEVBQ2hCLGtCQUFrQixHQUVsQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLGVB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S0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTVELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUV4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTVELEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUU1RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTVELEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLEVBQUUsTUFBTSxFQUFF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QUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXJELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUV4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFckQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRTVELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVyRCxLQUFLLENBQUMsVUFBVSxDQUFD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LEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRXpELEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFakMsSUFBSSxZQUFZLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4RCxNQUFN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QUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ2IsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUxQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRTFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2QsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUzQyxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDNUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsWUFBWSxFQUFFO1FBQ2xCLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixFQUFFLENBQUE7UUFDdEMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRW5DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLDJDQUFtQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqRixtQkFBbUI7UUFDbkIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRS9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLDJDQUFtQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV0RCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2RCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLDJDQUFtQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFL0Usb0JBQW9CO1FBQ3BCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUV6RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdEQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFB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Q0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUU5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUVuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV0RCxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUVsQyxnREFBZ0Q7UUFDaEQsa0RBQWtEO1FBQ2xELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM3QixLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXRELEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJELEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRW5ELEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRW5ELEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJELEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxELEtBQUssQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRW5ELGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV0QixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFD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QUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRTFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLDJDQUFtQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FB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QUUsTUFBTSxDQUFDLENBQUE7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFbEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTlDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakQsR0FBRyxHQUFHLEtBQUssQ0FBQyxVQUFVLDJDQUFtQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxF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eEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbEMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVuQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsK0JBQStCO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscURBQXFELEVBQUU7UUFDM0QsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFbkMsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFFdEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3hELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3hELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUV4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbEMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN2QixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZCLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVsQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXpCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN2QixLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXpCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbEMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUV6QixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvREFBb0QsRUFBRTtRQUMxRCxNQUFNLElBQUksR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUE7UUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pFLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxrQkFBa0IsRUFBRSxDQUFDLENBQUE7UUFDN0QsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBRWxELE1BQU0sTUFBTSxHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtRQUM3QyxNQUFNLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsMkJBQTJCLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzVGLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFeEMsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDL0UsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRW5DLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBRXRCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3hELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsMkNBQW1DLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUV6QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUV6QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVsQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXpCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNmLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdDQUFnQyxFQUFFO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixFQUFFLENBQUE7UUFDdEMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRW5DLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBRXRCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFeEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRXhFLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3hELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFeEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFeEUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0IsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRXhFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzVCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0IsTUFBTSxD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QU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBRXRCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3hELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFeEQsZUFBZTtRQUNmLFlBQVksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLFlBQWEsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbEMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4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LENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUU1RCxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FB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LFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxrQ0FBa0M7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyw4QkFBOEI7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyw0QkFBNEI7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUMsUUFBUTtRQUNSLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNCLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUMsb0NBQW9DO1FBQ3BDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMscUNBQXFDO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMscUNBQXFDO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsNEJBQTRCO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsMEJBQTBCO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLGlEQUFpRDtRQUNqRCxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25CLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFeEMsY0FBYztRQUNkLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVoRCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVoRCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUMsTUFB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UUFDdkIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDekUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDekUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFMUUsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzFDLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUxQyxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV4RCxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQTtRQUN2QyxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsRUFBRSxDQUFBO1FBRXZDLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxQyxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFMUMsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDNUIsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDNUIsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDNUIsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFFNUIsdUJBQXVCO1FBQ3ZCLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRTFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV6RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0RBQXNELEVBQUUsR0FBRyxFQUFFO1FBQ2pFLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixFQUFFLENBQUE7UUFFdkMsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDNUIsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDNUIsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFFNUIsdUJBQXVCO1FBQ3ZCLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdkYsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFMUUsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMs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bEUsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRXBDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRW5ELEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUVwQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNwRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7UUFDckMsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFbkMsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDdEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRXhELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTlDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRW5ELEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRXRELEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZELENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9
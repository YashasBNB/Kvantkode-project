/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { EditorPane, EditorMemento } from '../../../../browser/parts/editor/editorPane.js';
import { WorkspaceTrustRequiredPlaceholderEditor } from '../../../../browser/parts/editor/editorPlaceholder.js';
import { EditorExtensions, } from '../../../../common/editor.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { workbenchInstantiationService, TestEditorGroupView, TestEditorGroupsService, registerTestResourceEditor, TestEditorInput, createEditorPart, TestTextResourceConfigurationService, } from '../../workbenchTestServices.js';
import { TextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { URI } from '../../../../../base/common/uri.js';
import { EditorPaneDescriptor } from '../../../../browser/editor.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { TestStorageService, TestWorkspaceTrustManagementService, } from '../../../common/workbenchTestServices.js';
import { extUri } from '../../../../../base/common/resources.js';
import { EditorService } from '../../../../services/editor/browser/editorService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IEditorGroupsService, } from '../../../../services/editor/common/editorGroupsService.js';
import { IWorkspaceTrustManagementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const NullThemeService = new TestThemeService();
const editorRegistry = Registry.as(EditorExtensions.EditorPane);
const editorInputRegistry = Registry.as(EditorExtensions.EditorFactory);
class TestEditor extends EditorPane {
    constructor(group) {
        const disposables = new DisposableStore();
        super('TestEditor', group, NullTelemetryService, NullThemeService, disposables.add(new TestStorageService()));
        this._register(disposables);
    }
    getId() {
        return 'testEditor';
    }
    layout() { }
    createEditor() { }
}
class OtherTestEditor extends EditorPane {
    constructor(group) {
        const disposables = new DisposableStore();
        super('testOtherEditor', group, NullTelemetryService, NullThemeService, disposables.add(new TestStorageService()));
        this._register(disposables);
    }
    getId() {
        return 'testOtherEditor';
    }
    layout() { }
    createEditor() { }
}
class TestInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(input) {
        return input.toString();
    }
    deserialize(instantiationService, raw) {
        return {};
    }
}
class TestInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = undefined;
    }
    prefersEditorPane(editors) {
        return editors[1];
    }
    get typeId() {
        return 'testInput';
    }
    resolve() {
        return null;
    }
}
class OtherTestInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = undefined;
    }
    get typeId() {
        return 'otherTestInput';
    }
    resolve() {
        return null;
    }
}
class TestResourceEditorInput extends TextResourceEditorInput {
}
suite('EditorPane', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('EditorPane API', async () => {
        const group = new TestEditorGroupView(1);
        const editor = new TestEditor(group);
        assert.ok(editor.group);
        const input = disposables.add(new OtherTestInput());
        const options = {};
        assert(!editor.isVisible());
        assert(!editor.input);
        await editor.setInput(input, options, Object.create(null), CancellationToken.None);
        assert.strictEqual(input, editor.input);
        editor.setVisible(true);
        assert(editor.isVisible());
        editor.dispose();
        editor.clearInput();
        editor.setVisible(false);
        assert(!editor.isVisible());
        assert(!editor.input);
        assert(!editor.getControl());
    });
    test('EditorPaneDescriptor', () => {
        const editorDescriptor = EditorPaneDescriptor.create(TestEditor, 'id', 'name');
        assert.strictEqual(editorDescriptor.typeId, 'id');
        assert.strictEqual(editorDescriptor.name, 'name');
    });
    test('Editor Pane Registration', function () {
        const editorDescriptor1 = EditorPaneDescriptor.create(TestEditor, 'id1', 'name');
        const editorDescriptor2 = EditorPaneDescriptor.create(OtherTestEditor, 'id2', 'name');
        const oldEditorsCnt = editorRegistry.getEditorPanes().length;
        const oldInputCnt = editorRegistry.getEditors().length;
        disposables.add(editorRegistry.registerEditorPane(editorDescriptor1, [new SyncDescriptor(TestInput)]));
        disposables.add(editorRegistry.registerEditorPane(editorDescriptor2, [
            new SyncDescriptor(TestInput),
            new SyncDescriptor(OtherTestInput),
        ]));
        assert.strictEqual(editorRegistry.getEditorPanes().length, oldEditorsCnt + 2);
        assert.strictEqual(editorRegistry.getEditors().length, oldInputCnt + 3);
        assert.strictEqual(editorRegistry.getEditorPane(disposables.add(new TestInput())), editorDescriptor2);
        assert.strictEqual(editorRegistry.getEditorPane(disposables.add(new OtherTestInput())), editorDescriptor2);
        assert.strictEqual(editorRegistry.getEditorPaneByType('id1'), editorDescriptor1);
        assert.strictEqual(editorRegistry.getEditorPaneByType('id2'), editorDescriptor2);
        assert(!editorRegistry.getEditorPaneByType('id3'));
    });
    test('Editor Pane Lookup favors specific class over superclass (match on specific class)', function () {
        const d1 = EditorPaneDescriptor.create(TestEditor, 'id1', 'name');
        disposables.add(registerTestResourceEditor());
        disposables.add(editorRegistry.registerEditorPane(d1, [new SyncDescriptor(TestResourceEditorInput)]));
        const inst = workbenchInstantiationService(undefined, disposables);
        const group = new TestEditorGroupView(1);
        const editor = disposables.add(editorRegistry
            .getEditorPane(disposables.add(inst.createInstance(TestResourceEditorInput, URI.file('/fake'), 'fake', '', undefined, undefined)))
            .instantiate(inst, group));
        assert.strictEqual(editor.getId(), 'testEditor');
        const otherEditor = disposables.add(editorRegistry
            .getEditorPane(disposables.add(inst.createInstance(TextResourceEditorInput, URI.file('/fake'), 'fake', '', undefined, undefined)))
            .instantiate(inst, group));
        assert.strictEqual(otherEditor.getId(), 'workbench.editors.textResourceEditor');
    });
    test('Editor Pane Lookup favors specific class over superclass (match on super class)', function () {
        const inst = workbenchInstantiationService(undefined, disposables);
        const group = new TestEditorGroupView(1);
        disposables.add(registerTestResourceEditor());
        const editor = disposables.add(editorRegistry
            .getEditorPane(disposables.add(inst.createInstance(TestResourceEditorInput, URI.file('/fake'), 'fake', '', undefined, undefined)))
            .instantiate(inst, group));
        assert.strictEqual('workbench.editors.textResourceEditor', editor.getId());
    });
    test('Editor Input Serializer', function () {
        const testInput = disposables.add(new TestEditorInput(URI.file('/fake'), 'testTypeId'));
        workbenchInstantiationService(undefined, disposables).invokeFunction((accessor) => editorInputRegistry.start(accessor));
        disposables.add(editorInputRegistry.registerEditorSerializer(testInput.typeId, TestInputSerializer));
        let factory = editorInputRegistry.getEditorSerializer('testTypeId');
        assert(factory);
        factory = editorInputRegistry.getEditorSerializer(testInput);
        assert(factory);
        // throws when registering serializer for same type
        assert.throws(() => editorInputRegistry.registerEditorSerializer(testInput.typeId, TestInputSerializer));
    });
    test('EditorMemento - basics', function () {
        const testGroup0 = new TestEditorGroupView(0);
        const testGroup1 = new TestEditorGroupView(1);
        const testGroup4 = new TestEditorGroupView(4);
        const configurationService = new TestTextResourceConfigurationService();
        const editorGroupService = new TestEditorGroupsService([
            testGroup0,
            testGroup1,
            new TestEditorGroupView(2),
        ]);
        const rawMemento = Object.create(null);
        let memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, editorGroupService, configurationService));
        let res = memento.loadEditorState(testGroup0, URI.file('/A'));
        assert.ok(!res);
        memento.saveEditorState(testGroup0, URI.file('/A'), { line: 3 });
        res = memento.loadEditorState(testGroup0, URI.file('/A'));
        assert.ok(res);
        assert.strictEqual(res.line, 3);
        memento.saveEditorState(testGroup1, URI.file('/A'), { line: 5 });
        res = memento.loadEditorState(testGroup1, URI.file('/A'));
        assert.ok(res);
        assert.strictEqual(res.line, 5);
        // Ensure capped at 3 elements
        memento.saveEditorState(testGroup0, URI.file('/B'), { line: 1 });
        memento.saveEditorState(testGroup0, URI.file('/C'), { line: 1 });
        memento.saveEditorState(testGroup0, URI.file('/D'), { line: 1 });
        memento.saveEditorState(testGroup0, URI.file('/E'), { line: 1 });
        assert.ok(!memento.loadEditorState(testGroup0, URI.file('/A')));
        assert.ok(!memento.loadEditorState(testGroup0, URI.file('/B')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/C')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/D')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/E')));
        // Save at an unknown group
        memento.saveEditorState(testGroup4, URI.file('/E'), { line: 1 });
        assert.ok(memento.loadEditorState(testGroup4, URI.file('/E'))); // only gets removed when memento is saved
        memento.saveEditorState(testGroup4, URI.file('/C'), { line: 1 });
        assert.ok(memento.loadEditorState(testGroup4, URI.file('/C'))); // only gets removed when memento is saved
        memento.saveState();
        memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, editorGroupService, configurationService));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/C')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/D')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/E')));
        // Check on entries no longer there from invalid groups
        assert.ok(!memento.loadEditorState(testGroup4, URI.file('/E')));
        assert.ok(!memento.loadEditorState(testGroup4, URI.file('/C')));
        memento.clearEditorState(URI.file('/C'), testGroup4);
        memento.clearEditorState(URI.file('/E'));
        assert.ok(!memento.loadEditorState(testGroup4, URI.file('/C')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/D')));
        assert.ok(!memento.loadEditorState(testGroup0, URI.file('/E')));
    });
    test('EditorMemento - move', function () {
        const testGroup0 = new TestEditorGroupView(0);
        const configurationService = new TestTextResourceConfigurationService();
        const editorGroupService = new TestEditorGroupsService([testGroup0]);
        const rawMemento = Object.create(null);
        const memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, editorGroupService, configurationService));
        memento.saveEditorState(testGroup0, URI.file('/some/folder/file-1.txt'), { line: 1 });
        memento.saveEditorState(testGroup0, URI.file('/some/folder/file-2.txt'), { line: 2 });
        memento.saveEditorState(testGroup0, URI.file('/some/other/file.txt'), { line: 3 });
        memento.moveEditorState(URI.file('/some/folder/file-1.txt'), URI.file('/some/folder/file-moved.txt'), extUri);
        let res = memento.loadEditorState(testGroup0, URI.file('/some/folder/file-1.txt'));
        assert.ok(!res);
        res = memento.loadEditorState(testGroup0, URI.file('/some/folder/file-moved.txt'));
        assert.strictEqual(res?.line, 1);
        memento.moveEditorState(URI.file('/some/folder'), URI.file('/some/folder-moved'), extUri);
        res = memento.loadEditorState(testGroup0, URI.file('/some/folder-moved/file-moved.txt'));
        assert.strictEqual(res?.line, 1);
        res = memento.loadEditorState(testGroup0, URI.file('/some/folder-moved/file-2.txt'));
        assert.strictEqual(res?.line, 2);
    });
    test('EditoMemento - use with editor input', function () {
        const testGroup0 = new TestEditorGroupView(0);
        class TestEditorInput extends EditorInput {
            constructor(resource, id = 'testEditorInputForMementoTest') {
                super();
                this.resource = resource;
                this.id = id;
            }
            get typeId() {
                return 'testEditorInputForMementoTest';
            }
            async resolve() {
                return null;
            }
            matches(other) {
                return other && this.id === other.id && other instanceof TestEditorInput;
            }
        }
        const rawMemento = Object.create(null);
        const memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, new TestEditorGroupsService(), new TestTextResourceConfigurationService()));
        const testInputA = disposables.add(new TestEditorInput(URI.file('/A')));
        let res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(!res);
        memento.saveEditorState(testGroup0, testInputA, { line: 3 });
        res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(res);
        assert.strictEqual(res.line, 3);
        // State removed when input gets disposed
        testInputA.dispose();
        res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(!res);
    });
    test('EditoMemento - clear on editor dispose', function () {
        const testGroup0 = new TestEditorGroupView(0);
        class TestEditorInput extends EditorInput {
            constructor(resource, id = 'testEditorInputForMementoTest') {
                super();
                this.resource = resource;
                this.id = id;
            }
            get typeId() {
                return 'testEditorInputForMementoTest';
            }
            async resolve() {
                return null;
            }
            matches(other) {
                return other && this.id === other.id && other instanceof TestEditorInput;
            }
        }
        const rawMemento = Object.create(null);
        const memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, new TestEditorGroupsService(), new TestTextResourceConfigurationService()));
        const testInputA = disposables.add(new TestEditorInput(URI.file('/A')));
        let res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(!res);
        memento.saveEditorState(testGroup0, testInputA.resource, { line: 3 });
        res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(res);
        assert.strictEqual(res.line, 3);
        // State not yet removed when input gets disposed
        // because we used resource
        testInputA.dispose();
        res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(res);
        const testInputB = disposables.add(new TestEditorInput(URI.file('/B')));
        res = memento.loadEditorState(testGroup0, testInputB);
        assert.ok(!res);
        memento.saveEditorState(testGroup0, testInputB.resource, { line: 3 });
        res = memento.loadEditorState(testGroup0, testInputB);
        assert.ok(res);
        assert.strictEqual(res.line, 3);
        memento.clearEditorStateOnDispose(testInputB.resource, testInputB);
        // State removed when input gets disposed
        testInputB.dispose();
        res = memento.loadEditorState(testGroup0, testInputB);
        assert.ok(!res);
    });
    test('EditorMemento - workbench.editor.sharedViewState', function () {
        const testGroup0 = new TestEditorGroupView(0);
        const testGroup1 = new TestEditorGroupView(1);
        const configurationService = new TestTextResourceConfigurationService(new TestConfigurationService({
            workbench: {
                editor: {
                    sharedViewState: true,
                },
            },
        }));
        const editorGroupService = new TestEditorGroupsService([testGroup0]);
        const rawMemento = Object.create(null);
        const memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, editorGroupService, configurationService));
        const resource = URI.file('/some/folder/file-1.txt');
        memento.saveEditorState(testGroup0, resource, { line: 1 });
        let res = memento.loadEditorState(testGroup0, resource);
        assert.strictEqual(res.line, 1);
        res = memento.loadEditorState(testGroup1, resource);
        assert.strictEqual(res.line, 1);
        memento.saveEditorState(testGroup0, resource, { line: 3 });
        res = memento.loadEditorState(testGroup1, resource);
        assert.strictEqual(res.line, 3);
        memento.saveEditorState(testGroup1, resource, { line: 1 });
        res = memento.loadEditorState(testGroup1, resource);
        assert.strictEqual(res.line, 1);
        memento.clearEditorState(resource, testGroup0);
        memento.clearEditorState(resource, testGroup1);
        res = memento.loadEditorState(testGroup1, resource);
        assert.strictEqual(res.line, 1);
        memento.clearEditorState(resource);
        res = memento.loadEditorState(testGroup1, resource);
        assert.ok(!res);
    });
    test('WorkspaceTrustRequiredEditor', async function () {
        let TrustRequiredTestEditor = class TrustRequiredTestEditor extends EditorPane {
            constructor(group, telemetryService) {
                super('TestEditor', group, NullTelemetryService, NullThemeService, disposables.add(new TestStorageService()));
            }
            getId() {
                return 'trustRequiredTestEditor';
            }
            layout() { }
            createEditor() { }
        };
        TrustRequiredTestEditor = __decorate([
            __param(1, ITelemetryService)
        ], TrustRequiredTestEditor);
        class TrustRequiredTestInput extends EditorInput {
            constructor() {
                super(...arguments);
                this.resource = undefined;
            }
            get typeId() {
                return 'trustRequiredTestInput';
            }
            get capabilities() {
                return 16 /* EditorInputCapabilities.RequiresTrust */;
            }
            resolve() {
                return null;
            }
        }
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const workspaceTrustService = disposables.add(instantiationService.createInstance(TestWorkspaceTrustManagementService));
        instantiationService.stub(IWorkspaceTrustManagementService, workspaceTrustService);
        workspaceTrustService.setWorkspaceTrust(false);
        const editorPart = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, editorPart);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        const group = editorPart.activeGroup;
        const editorDescriptor = EditorPaneDescriptor.create(TrustRequiredTestEditor, 'id1', 'name');
        disposables.add(editorRegistry.registerEditorPane(editorDescriptor, [
            new SyncDescriptor(TrustRequiredTestInput),
        ]));
        const testInput = disposables.add(new TrustRequiredTestInput());
        await group.openEditor(testInput);
        assert.strictEqual(group.activeEditorPane?.getId(), WorkspaceTrustRequiredPlaceholderEditor.ID);
        const getEditorPaneIdAsync = () => new Promise((resolve) => {
            disposables.add(editorService.onDidActiveEditorChange(() => {
                resolve(group.activeEditorPane?.getId());
            }));
        });
        workspaceTrustService.setWorkspaceTrust(true);
        assert.strictEqual(await getEditorPaneIdAsync(), 'trustRequiredTestEditor');
        workspaceTrustService.setWorkspaceTrust(false);
        assert.strictEqual(await getEditorPaneIdAsync(), WorkspaceTrustRequiredPlaceholderEditor.ID);
        await group.closeAllEditors();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFuZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JQYW5lLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDMUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDL0csT0FBTyxFQUdOLGdCQUFnQixHQUloQixNQUFNLDhCQUE4QixDQUFBO0FBRXJDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixtQkFBbUIsRUFDbkIsdUJBQXVCLEVBQ3ZCLDBCQUEwQixFQUMxQixlQUFlLEVBQ2YsZ0JBQWdCLEVBQ2hCLG9DQUFvQyxHQUNwQyxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQXNCLE1BQU0sK0JBQStCLENBQUE7QUFDeEYs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
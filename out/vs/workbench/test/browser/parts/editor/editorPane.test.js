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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFuZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yUGFuZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQy9HLE9BQU8sRUFHTixnQkFBZ0IsR0FJaEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUVyQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2pHLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLHVCQUF1QixFQUN2QiwwQkFBMEIsRUFDMUIsZUFBZSxFQUNmLGdCQUFnQixFQUNoQixvQ0FBb0MsR0FDcEMsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLG9CQUFvQixFQUFzQixNQUFNLCtCQUErQixDQUFBO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxN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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { EditorResolverService } from '../../browser/editorResolverService.js';
import { IEditorGroupsService } from '../../common/editorGroupsService.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../common/editorResolverService.js';
import { createEditorPart, TestFileEditorInput, TestServiceAccessor, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
suite('EditorResolverService', () => {
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForEditorResolverService';
    const disposables = new DisposableStore();
    teardown(() => disposables.clear());
    ensureNoDisposablesAreLeakedInTestSuite();
    async function createEditorResolverService(instantiationService = workbenchInstantiationService(undefined, disposables)) {
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorResolverService = instantiationService.createInstance(EditorResolverService);
        instantiationService.stub(IEditorResolverService, editorResolverService);
        disposables.add(editorResolverService);
        return [part, editorResolverService, instantiationService.createInstance(TestServiceAccessor)];
    }
    function constructDisposableFileEditorInput(uri, typeId, store) {
        const editor = new TestFileEditorInput(uri, typeId);
        store.add(editor);
        return editor;
    }
    test('Simple Resolve', async () => {
        const [part, service] = await createEditorResolverService();
        const registeredEditor = service.registerEditor('*.test', {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default,
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({
                editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID),
            }),
        });
        const resultingResolution = await service.resolveEditor({ resource: URI.file('my://resource-basics.test') }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ &&
            resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, TEST_EDITOR_INPUT_ID);
            resultingResolution.editor.dispose();
        }
        registeredEditor.dispose();
    });
    test('Untitled Resolve', async () => {
        const UNTITLED_TEST_EDITOR_INPUT_ID = 'UNTITLED_TEST_INPUT';
        const [part, service] = await createEditorResolverService();
        const registeredEditor = service.registerEditor('*.test', {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default,
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({
                editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID),
            }),
            createUntitledEditorInput: ({ resource, options }, group) => ({
                editor: new TestFileEditorInput(resource ? resource : URI.from({ scheme: Schemas.untitled }), UNTITLED_TEST_EDITOR_INPUT_ID),
            }),
        });
        // Untyped untitled - no resource
        let resultingResolution = await service.resolveEditor({ resource: undefined }, part.activeGroup);
        assert.ok(resultingResolution);
        // We don't expect untitled to match the *.test glob
        assert.strictEqual(typeof resultingResolution, 'number');
        // Untyped untitled - with untitled resource
        resultingResolution = await service.resolveEditor({ resource: URI.from({ scheme: Schemas.untitled, path: 'foo.test' }) }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ &&
            resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, UNTITLED_TEST_EDITOR_INPUT_ID);
            resultingResolution.editor.dispose();
        }
        // Untyped untitled - file resource with forceUntitled
        resultingResolution = await service.resolveEditor({ resource: URI.file('/fake.test'), forceUntitled: true }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ &&
            resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, UNTITLED_TEST_EDITOR_INPUT_ID);
            resultingResolution.editor.dispose();
        }
        registeredEditor.dispose();
    });
    test('Side by side Resolve', async () => {
        const [part, service] = await createEditorResolverService();
        const registeredEditorPrimary = service.registerEditor('*.test-primary', {
            id: 'TEST_EDITOR_PRIMARY',
            label: 'Test Editor Label Primary',
            detail: 'Test Editor Details Primary',
            priority: RegisteredEditorPriority.default,
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({
                editor: constructDisposableFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID, disposables),
            }),
        });
        const registeredEditorSecondary = service.registerEditor('*.test-secondary', {
            id: 'TEST_EDITOR_SECONDARY',
            label: 'Test Editor Label Secondary',
            detail: 'Test Editor Details Secondary',
            priority: RegisteredEditorPriority.default,
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({
                editor: constructDisposableFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID, disposables),
            }),
        });
        const resultingResolution = await service.resolveEditor({
            primary: { resource: URI.file('my://resource-basics.test-primary') },
            secondary: { resource: URI.file('my://resource-basics.test-secondary') },
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ &&
            resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editorinputs.sidebysideEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        registeredEditorPrimary.dispose();
        registeredEditorSecondary.dispose();
    });
    test('Diff editor Resolve', async () => {
        const [part, service, accessor] = await createEditorResolverService();
        const registeredEditor = service.registerEditor('*.test-diff', {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default,
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({
                editor: constructDisposableFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID, disposables),
            }),
            createDiffEditorInput: ({ modified, original, options }, group) => ({
                editor: accessor.instantiationService.createInstance(DiffEditorInput, 'name', 'description', constructDisposableFileEditorInput(URI.parse(original.toString()), TEST_EDITOR_INPUT_ID, disposables), constructDisposableFileEditorInput(URI.parse(modified.toString()), TEST_EDITOR_INPUT_ID, disposables), undefined),
            }),
        });
        const resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-diff') },
            modified: { resource: URI.file('my://resource-basics.test-diff') },
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ &&
            resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        registeredEditor.dispose();
    });
    test('Diff editor Resolve - Different Types', async () => {
        const [part, service, accessor] = await createEditorResolverService();
        let diffOneCounter = 0;
        let diffTwoCounter = 0;
        let defaultDiffCounter = 0;
        const registeredEditor = service.registerEditor('*.test-diff', {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default,
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({
                editor: constructDisposableFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID, disposables),
            }),
            createDiffEditorInput: ({ modified, original, options }, group) => {
                diffOneCounter++;
                return {
                    editor: accessor.instantiationService.createInstance(DiffEditorInput, 'name', 'description', constructDisposableFileEditorInput(URI.parse(original.toString()), TEST_EDITOR_INPUT_ID, disposables), constructDisposableFileEditorInput(URI.parse(modified.toString()), TEST_EDITOR_INPUT_ID, disposables), undefined),
                };
            },
        });
        const secondRegisteredEditor = service.registerEditor('*.test-secondDiff', {
            id: 'TEST_EDITOR_2',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default,
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({
                editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID),
            }),
            createDiffEditorInput: ({ modified, original, options }, group) => {
                diffTwoCounter++;
                return {
                    editor: accessor.instantiationService.createInstance(DiffEditorInput, 'name', 'description', constructDisposableFileEditorInput(URI.parse(original.toString()), TEST_EDITOR_INPUT_ID, disposables), constructDisposableFileEditorInput(URI.parse(modified.toString()), TEST_EDITOR_INPUT_ID, disposables), undefined),
                };
            },
        });
        const defaultRegisteredEditor = service.registerEditor('*', {
            id: 'default',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.option,
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({
                editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID),
            }),
            createDiffEditorInput: ({ modified, original, options }, group) => {
                defaultDiffCounter++;
                return {
                    editor: accessor.instantiationService.createInstance(DiffEditorInput, 'name', 'description', constructDisposableFileEditorInput(URI.parse(original.toString()), TEST_EDITOR_INPUT_ID, disposables), constructDisposableFileEditorInput(URI.parse(modified.toString()), TEST_EDITOR_INPUT_ID, disposables), undefined),
                };
            },
        });
        let resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-diff') },
            modified: { resource: URI.file('my://resource-basics.test-diff') },
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ &&
            resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(diffOneCounter, 1);
            assert.strictEqual(diffTwoCounter, 0);
            assert.strictEqual(defaultDiffCounter, 0);
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-secondDiff') },
            modified: { resource: URI.file('my://resource-basics.test-secondDiff') },
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ &&
            resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(diffOneCounter, 1);
            assert.strictEqual(diffTwoCounter, 1);
            assert.strictEqual(defaultDiffCounter, 0);
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-secondDiff') },
            modified: { resource: URI.file('my://resource-basics.test-diff') },
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ &&
            resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(diffOneCounter, 1);
            assert.strictEqual(diffTwoCounter, 1);
            assert.strictEqual(defaultDiffCounter, 1);
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-diff') },
            modified: { resource: URI.file('my://resource-basics.test-secondDiff') },
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ &&
            resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(diffOneCounter, 1);
            assert.strictEqual(diffTwoCounter, 1);
            assert.strictEqual(defaultDiffCounter, 2);
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-secondDiff') },
            modified: { resource: URI.file('my://resource-basics.test-diff') },
            options: { override: 'TEST_EDITOR' },
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ &&
            resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(diffOneCounter, 2);
            assert.strictEqual(diffTwoCounter, 1);
            assert.strictEqual(defaultDiffCounter, 2);
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        registeredEditor.dispose();
        secondRegisteredEditor.dispose();
        defaultRegisteredEditor.dispose();
    });
    test('Registry & Events', async () => {
        const [, service] = await createEditorResolverService();
        let eventCounter = 0;
        disposables.add(service.onDidChangeEditorRegistrations(() => {
            eventCounter++;
        }));
        const editors = service.getEditors();
        const registeredEditor = service.registerEditor('*.test', {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default,
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({
                editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID),
            }),
        });
        assert.strictEqual(eventCounter, 1);
        assert.strictEqual(service.getEditors().length, editors.length + 1);
        assert.strictEqual(service.getEditors().some((editor) => editor.id === 'TEST_EDITOR'), true);
        registeredEditor.dispose();
        assert.strictEqual(eventCounter, 2);
        assert.strictEqual(service.getEditors().length, editors.length);
        assert.strictEqual(service.getEditors().some((editor) => editor.id === 'TEST_EDITOR'), false);
    });
    test('Multiple registrations to same glob and id #155859', async () => {
        const [part, service, accessor] = await createEditorResolverService();
        const testEditorInfo = {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default,
        };
        const registeredSingleEditor = service.registerEditor('*.test', testEditorInfo, {}, {
            createEditorInput: ({ resource, options }, group) => ({
                editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID),
            }),
        });
        const registeredDiffEditor = service.registerEditor('*.test', testEditorInfo, {}, {
            createDiffEditorInput: ({ modified, original, options }, group) => ({
                editor: accessor.instantiationService.createInstance(DiffEditorInput, 'name', 'description', constructDisposableFileEditorInput(URI.parse(original.toString()), TEST_EDITOR_INPUT_ID, disposables), constructDisposableFileEditorInput(URI.parse(modified.toString()), TEST_EDITOR_INPUT_ID, disposables), undefined),
            }),
        });
        // Resolve a diff
        let resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test') },
            modified: { resource: URI.file('my://resource-basics.test') },
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ &&
            resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        // Remove diff registration
        registeredDiffEditor.dispose();
        // Resolve a diff again, expected failure
        resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test') },
            modified: { resource: URI.file('my://resource-basics.test') },
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.strictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.fail();
        }
        registeredSingleEditor.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvdGVzdC9icm93c2VyL2VkaXRvclJlc29sdmVyU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDMUUsT0FBTyxFQUNOLHNCQUFzQixFQUV0Qix3QkFBd0IsR0FDeEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQ04sZ0JBQWdCLEVBRWhCLG1CQUFtQixFQUNuQixtQkFBbUIsRUFDbkIsNkJBQTZCLEdBQzdCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNuQyxNQUFNLG9CQUFvQixHQUFHLHlDQUF5QyxDQUFBO0lBQ3RFLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFL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
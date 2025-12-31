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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9lZGl0b3JSZXNvbHZlclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFFLE9BQU8sRUFDTixzQkFBc0IsRUFFdEIsd0JBQXdCLEdBQ3hCLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUNOLGdCQUFnQixFQUVoQixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBQ25CLDZCQUE2QixHQUM3QixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsTUFBTSxvQkFBb0IsR0FBRyx5Q0FBeUMsQ0FBQTtJQUN0RSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRXpDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUVuQyx1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
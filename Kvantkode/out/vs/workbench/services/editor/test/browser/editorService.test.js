/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EditorActivation, } from '../../../../../platform/editor/common/editor.js';
import { URI } from '../../../../../base/common/uri.js';
import { Event } from '../../../../../base/common/event.js';
import { DEFAULT_EDITOR_ASSOCIATION, EditorCloseContext, isEditorInputWithOptions, SideBySideEditor, isEditorInput, } from '../../../../common/editor.js';
import { workbenchInstantiationService, TestServiceAccessor, registerTestEditor, TestFileEditorInput, registerTestResourceEditor, registerTestSideBySideEditor, createEditorPart, registerTestFileEditor, TestTextFileEditor, TestSingletonFileEditorInput, workbenchTeardown, } from '../../../../test/browser/workbenchTestServices.js';
import { EditorService } from '../../browser/editorService.js';
import { IEditorGroupsService, } from '../../common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../common/editorService.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { FileEditorInput } from '../../../../contrib/files/browser/editors/fileEditorInput.js';
import { timeout } from '../../../../../base/common/async.js';
import { FileOperationEvent } from '../../../../../platform/files/common/files.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { MockScopableContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { RegisteredEditorPriority } from '../../common/editorResolverService.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { ErrorPlaceholderEditor } from '../../../../browser/parts/editor/editorPlaceholder.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('EditorService', () => {
    const TEST_EDITOR_ID = 'MyTestEditorForEditorService';
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForEditorService';
    const disposables = new DisposableStore();
    let testLocalInstantiationService = undefined;
    setup(() => {
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput), new SyncDescriptor(TestSingletonFileEditorInput)], TEST_EDITOR_INPUT_ID));
        disposables.add(registerTestResourceEditor());
        disposables.add(registerTestSideBySideEditor());
    });
    teardown(async () => {
        if (testLocalInstantiationService) {
            await workbenchTeardown(testLocalInstantiationService);
            testLocalInstantiationService = undefined;
        }
        disposables.clear();
    });
    async function createEditorService(instantiationService = workbenchInstantiationService(undefined, disposables)) {
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        testLocalInstantiationService = instantiationService;
        return [part, editorService, instantiationService.createInstance(TestServiceAccessor)];
    }
    function createTestFileEditorInput(resource, typeId) {
        return disposables.add(new TestFileEditorInput(resource, typeId));
    }
    test('openEditor() - basics', async () => {
        const [, service, accessor] = await createEditorService();
        await testOpenBasics(service, accessor.editorPaneService);
    });
    test('openEditor() - basics (scoped)', async () => {
        const [part, service, accessor] = await createEditorService();
        const scoped = service.createScoped('main', disposables);
        await part.whenReady;
        await testOpenBasics(scoped, accessor.editorPaneService);
    });
    async function testOpenBasics(editorService, editorPaneService) {
        let input = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        let otherInput = createTestFileEditorInput(URI.parse('my://resource2-basics'), TEST_EDITOR_INPUT_ID);
        let activeEditorChangeEventCounter = 0;
        disposables.add(editorService.onDidActiveEditorChange(() => {
            activeEditorChangeEventCounter++;
        }));
        let visibleEditorChangeEventCounter = 0;
        disposables.add(editorService.onDidVisibleEditorsChange(() => {
            visibleEditorChangeEventCounter++;
        }));
        let willOpenEditorListenerCounter = 0;
        disposables.add(editorService.onWillOpenEditor(() => {
            willOpenEditorListenerCounter++;
        }));
        let didCloseEditorListenerCounter = 0;
        disposables.add(editorService.onDidCloseEditor(() => {
            didCloseEditorListenerCounter++;
        }));
        let willInstantiateEditorPaneListenerCounter = 0;
        disposables.add(editorPaneService.onWillInstantiateEditorPane((e) => {
            if (e.typeId === TEST_EDITOR_ID) {
                willInstantiateEditorPaneListenerCounter++;
            }
        }));
        // Open input
        let editor = await editorService.openEditor(input, { pinned: true });
        assert.strictEqual(editor?.getId(), TEST_EDITOR_ID);
        assert.strictEqual(editor, editorService.activeEditorPane);
        assert.strictEqual(1, editorService.count);
        assert.strictEqual(input, editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].editor);
        assert.strictEqual(input, editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].editor);
        assert.strictEqual(input, editorService.activeEditor);
        assert.strictEqual(editorService.visibleEditorPanes.length, 1);
        assert.strictEqual(editorService.visibleEditorPanes[0], editor);
        assert.ok(!editorService.activeTextEditorControl);
        assert.ok(!editorService.activeTextEditorLanguageId);
        assert.strictEqual(editorService.visibleTextEditorControls.length, 0);
        assert.strictEqual(editorService.getVisibleTextEditorControls(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(editorService.isOpened(input), true);
        assert.strictEqual(editorService.isOpened({
            resource: input.resource,
            typeId: input.typeId,
            editorId: input.editorId,
        }), true);
        assert.strictEqual(editorService.isOpened({
            resource: input.resource,
            typeId: input.typeId,
            editorId: 'unknownTypeId',
        }), false);
        assert.strictEqual(editorService.isOpened({
            resource: input.resource,
            typeId: 'unknownTypeId',
            editorId: input.editorId,
        }), false);
        assert.strictEqual(editorService.isOpened({
            resource: input.resource,
            typeId: 'unknownTypeId',
            editorId: 'unknownTypeId',
        }), false);
        assert.strictEqual(editorService.isVisible(input), true);
        assert.strictEqual(editorService.isVisible(otherInput), false);
        assert.strictEqual(willOpenEditorListenerCounter, 1);
        assert.strictEqual(activeEditorChangeEventCounter, 1);
        assert.strictEqual(visibleEditorChangeEventCounter, 1);
        assert.ok(editorPaneService.didInstantiateEditorPane(TEST_EDITOR_ID));
        assert.strictEqual(willInstantiateEditorPaneListenerCounter, 1);
        // Close input
        await editor?.group.closeEditor(input);
        assert.strictEqual(0, editorService.count);
        assert.strictEqual(0, editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length);
        assert.strictEqual(0, editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length);
        assert.strictEqual(didCloseEditorListenerCounter, 1);
        assert.strictEqual(activeEditorChangeEventCounter, 2);
        assert.strictEqual(visibleEditorChangeEventCounter, 2);
        assert.ok(input.gotDisposed);
        // Open again 2 inputs (disposed editors are ignored!)
        await editorService.openEditor(input, { pinned: true });
        assert.strictEqual(0, editorService.count);
        // Open again 2 inputs (recreate because disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-basics'), TEST_EDITOR_INPUT_ID);
        await editorService.openEditor(input, { pinned: true });
        editor = await editorService.openEditor(otherInput, { pinned: true });
        assert.strictEqual(2, editorService.count);
        assert.strictEqual(otherInput, editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].editor);
        assert.strictEqual(input, editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].editor);
        assert.strictEqual(input, editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].editor);
        assert.strictEqual(otherInput, editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1].editor);
        assert.strictEqual(editorService.visibleEditorPanes.length, 1);
        assert.strictEqual(editorService.isOpened(input), true);
        assert.strictEqual(editorService.isOpened({
            resource: input.resource,
            typeId: input.typeId,
            editorId: input.editorId,
        }), true);
        assert.strictEqual(editorService.isOpened(otherInput), true);
        assert.strictEqual(editorService.isOpened({
            resource: otherInput.resource,
            typeId: otherInput.typeId,
            editorId: otherInput.editorId,
        }), true);
        assert.strictEqual(activeEditorChangeEventCounter, 4);
        assert.strictEqual(willOpenEditorListenerCounter, 3);
        assert.strictEqual(visibleEditorChangeEventCounter, 4);
        const stickyInput = createTestFileEditorInput(URI.parse('my://resource3-basics'), TEST_EDITOR_INPUT_ID);
        await editorService.openEditor(stickyInput, { sticky: true });
        assert.strictEqual(3, editorService.count);
        const allSequentialEditors = editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        assert.strictEqual(allSequentialEditors.length, 3);
        assert.strictEqual(stickyInput, allSequentialEditors[0].editor);
        assert.strictEqual(input, allSequentialEditors[1].editor);
        assert.strictEqual(otherInput, allSequentialEditors[2].editor);
        const sequentialEditorsExcludingSticky = editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */, {
            excludeSticky: true,
        });
        assert.strictEqual(sequentialEditorsExcludingSticky.length, 2);
        assert.strictEqual(input, sequentialEditorsExcludingSticky[0].editor);
        assert.strictEqual(otherInput, sequentialEditorsExcludingSticky[1].editor);
        const mruEditorsExcludingSticky = editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, {
            excludeSticky: true,
        });
        assert.strictEqual(mruEditorsExcludingSticky.length, 2);
        assert.strictEqual(input, sequentialEditorsExcludingSticky[0].editor);
        assert.strictEqual(otherInput, sequentialEditorsExcludingSticky[1].editor);
    }
    test('openEditor() - multiple calls are cancelled and indicated as such', async () => {
        const [, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-basics'), TEST_EDITOR_INPUT_ID);
        let activeEditorChangeEventCounter = 0;
        const activeEditorChangeListener = service.onDidActiveEditorChange(() => {
            activeEditorChangeEventCounter++;
        });
        let visibleEditorChangeEventCounter = 0;
        const visibleEditorChangeListener = service.onDidVisibleEditorsChange(() => {
            visibleEditorChangeEventCounter++;
        });
        const editorP1 = service.openEditor(input, { pinned: true });
        const editorP2 = service.openEditor(otherInput, { pinned: true });
        const editor1 = await editorP1;
        assert.strictEqual(editor1, undefined);
        const editor2 = await editorP2;
        assert.strictEqual(editor2?.input, otherInput);
        assert.strictEqual(activeEditorChangeEventCounter, 1);
        assert.strictEqual(visibleEditorChangeEventCounter, 1);
        activeEditorChangeListener.dispose();
        visibleEditorChangeListener.dispose();
    });
    test('openEditor() - same input does not cancel previous one - https://github.com/microsoft/vscode/issues/136684', async () => {
        const [, service] = await createEditorService();
        let input = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        let editorP1 = service.openEditor(input, { pinned: true });
        let editorP2 = service.openEditor(input, { pinned: true });
        let editor1 = await editorP1;
        assert.strictEqual(editor1?.input, input);
        let editor2 = await editorP2;
        assert.strictEqual(editor2?.input, input);
        assert.ok(editor2.group);
        await editor2.group.closeAllEditors();
        input = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        const inputSame = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        editorP1 = service.openEditor(input, { pinned: true });
        editorP2 = service.openEditor(inputSame, { pinned: true });
        editor1 = await editorP1;
        assert.strictEqual(editor1?.input, input);
        editor2 = await editorP2;
        assert.strictEqual(editor2?.input, input);
    });
    test('openEditor() - singleton typed editors reveal instead of split', async () => {
        const [part, service] = await createEditorService();
        const input1 = disposables.add(new TestSingletonFileEditorInput(URI.parse('my://resource-basics1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestSingletonFileEditorInput(URI.parse('my://resource-basics2'), TEST_EDITOR_INPUT_ID));
        const input1Group = (await service.openEditor(input1, { pinned: true }))?.group;
        const input2Group = (await service.openEditor(input2, { pinned: true }, SIDE_GROUP))?.group;
        assert.strictEqual(part.activeGroup, input2Group);
        await service.openEditor(input1, { pinned: true });
        assert.strictEqual(part.activeGroup, input1Group);
    });
    test('openEditor() - locked groups', async () => {
        disposables.add(registerTestFileEditor());
        const [part, service, accessor] = await createEditorService();
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-locked-group-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: (editor) => ({
                editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID),
            }),
        }));
        const input1 = {
            resource: URI.parse('file://resource-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input2 = {
            resource: URI.parse('file://resource2-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input3 = {
            resource: URI.parse('file://resource3-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input4 = {
            resource: URI.parse('file://resource4-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input5 = {
            resource: URI.parse('file://resource5-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input6 = {
            resource: URI.parse('file://resource6-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input7 = {
            resource: URI.parse('file://resource7-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const editor1 = await service.openEditor(input1, { pinned: true });
        const editor2 = await service.openEditor(input2, { pinned: true }, SIDE_GROUP);
        const group1 = editor1?.group;
        assert.strictEqual(group1?.count, 1);
        const group2 = editor2?.group;
        assert.strictEqual(group2?.count, 1);
        group2.lock(true);
        part.activateGroup(group2.id);
        // Will open in group 1 because group 2 is locked
        await service.openEditor(input3, { pinned: true });
        assert.strictEqual(group1.count, 2);
        assert.strictEqual(group1.activeEditor?.resource?.toString(), input3.resource.toString());
        assert.strictEqual(group2.count, 1);
        // Will open in group 2 because group was provided
        await service.openEditor(input3, { pinned: true }, group2.id);
        assert.strictEqual(group1.count, 2);
        assert.strictEqual(group2.count, 2);
        assert.strictEqual(group2.activeEditor?.resource?.toString(), input3.resource.toString());
        // Will reveal editor in group 2 because it is contained
        await service.openEditor(input2, { pinned: true }, group2);
        await service.openEditor(input2, { pinned: true }, ACTIVE_GROUP);
        assert.strictEqual(group1.count, 2);
        assert.strictEqual(group2.count, 2);
        assert.strictEqual(group2.activeEditor?.resource?.toString(), input2.resource.toString());
        // Will open a new group because side group is locked
        part.activateGroup(group1.id);
        const editor3 = await service.openEditor(input4, { pinned: true }, SIDE_GROUP);
        assert.strictEqual(part.count, 3);
        const group3 = editor3?.group;
        assert.strictEqual(group3?.count, 1);
        // Will reveal editor in group 2 because it is contained
        await service.openEditor(input3, { pinned: true }, group2);
        part.activateGroup(group1.id);
        await service.openEditor(input3, { pinned: true }, SIDE_GROUP);
        assert.strictEqual(part.count, 3);
        // Will open a new group if all groups are locked
        group1.lock(true);
        group2.lock(true);
        group3.lock(true);
        part.activateGroup(group1.id);
        const editor5 = await service.openEditor(input5, { pinned: true });
        const group4 = editor5?.group;
        assert.strictEqual(group4?.count, 1);
        assert.strictEqual(group4.activeEditor?.resource?.toString(), input5.resource.toString());
        assert.strictEqual(part.count, 4);
        // Will open editor in most recently non-locked group
        group1.lock(false);
        group2.lock(false);
        group3.lock(false);
        group4.lock(false);
        part.activateGroup(group3.id);
        part.activateGroup(group2.id);
        part.activateGroup(group4.id);
        group4.lock(true);
        group2.lock(true);
        await service.openEditor(input6, { pinned: true });
        assert.strictEqual(part.count, 4);
        assert.strictEqual(part.activeGroup, group3);
        assert.strictEqual(group3.activeEditor?.resource?.toString(), input6.resource.toString());
        // Will find the right group where editor is already opened in when all groups are locked
        group1.lock(true);
        group2.lock(true);
        group3.lock(true);
        group4.lock(true);
        part.activateGroup(group1.id);
        await service.openEditor(input6, { pinned: true });
        assert.strictEqual(part.count, 4);
        assert.strictEqual(part.activeGroup, group3);
        assert.strictEqual(group3.activeEditor?.resource?.toString(), input6.resource.toString());
        assert.strictEqual(part.activeGroup, group3);
        assert.strictEqual(group3.activeEditor?.resource?.toString(), input6.resource.toString());
        part.activateGroup(group1.id);
        await service.openEditor(input6, { pinned: true });
        assert.strictEqual(part.count, 4);
        assert.strictEqual(part.activeGroup, group3);
        assert.strictEqual(group3.activeEditor?.resource?.toString(), input6.resource.toString());
        // Will reveal an opened editor in the active locked group
        await service.openEditor(input7, { pinned: true }, group3);
        await service.openEditor(input6, { pinned: true });
        assert.strictEqual(part.count, 4);
        assert.strictEqual(part.activeGroup, group3);
        assert.strictEqual(group3.activeEditor?.resource?.toString(), input6.resource.toString());
    });
    test('locked groups - workbench.editor.revealIfOpen', async () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const configurationService = new TestConfigurationService();
        await configurationService.setUserConfiguration('workbench', { editor: { revealIfOpen: true } });
        instantiationService.stub(IConfigurationService, configurationService);
        disposables.add(registerTestFileEditor());
        const [part, service, accessor] = await createEditorService(instantiationService);
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-locked-group-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: (editor) => ({
                editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID),
            }),
        }));
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        part.activateGroup(rootGroup);
        const input1 = {
            resource: URI.parse('file://resource-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input2 = {
            resource: URI.parse('file://resource2-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input3 = {
            resource: URI.parse('file://resource3-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input4 = {
            resource: URI.parse('file://resource4-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        await service.openEditor(input1, rootGroup.id);
        await service.openEditor(input2, rootGroup.id);
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        await service.openEditor(input3, rightGroup.id);
        await service.openEditor(input4, rightGroup.id);
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        rootGroup.lock(true);
        rightGroup.lock(true);
        await service.openEditor(input1);
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input1.resource.toString());
        await service.openEditor(input3);
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input3.resource.toString());
        assert.strictEqual(part.groups.length, 2);
    });
    test('locked groups - revealIfVisible', async () => {
        disposables.add(registerTestFileEditor());
        const [part, service, accessor] = await createEditorService();
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-locked-group-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: (editor) => ({
                editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID),
            }),
        }));
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        part.activateGroup(rootGroup);
        const input1 = {
            resource: URI.parse('file://resource-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input2 = {
            resource: URI.parse('file://resource2-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input3 = {
            resource: URI.parse('file://resource3-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input4 = {
            resource: URI.parse('file://resource4-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        await service.openEditor(input1, rootGroup.id);
        await service.openEditor(input2, rootGroup.id);
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        await service.openEditor(input3, rightGroup.id);
        await service.openEditor(input4, rightGroup.id);
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        rootGroup.lock(true);
        rightGroup.lock(true);
        await service.openEditor({ ...input2, options: { ...input2.options, revealIfVisible: true } });
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input2.resource.toString());
        await service.openEditor({ ...input4, options: { ...input4.options, revealIfVisible: true } });
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input4.resource.toString());
        assert.strictEqual(part.groups.length, 2);
    });
    test('locked groups - revealIfOpened', async () => {
        disposables.add(registerTestFileEditor());
        const [part, service, accessor] = await createEditorService();
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-locked-group-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: (editor) => ({
                editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID),
            }),
        }));
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        part.activateGroup(rootGroup);
        const input1 = {
            resource: URI.parse('file://resource-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input2 = {
            resource: URI.parse('file://resource2-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input3 = {
            resource: URI.parse('file://resource3-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        const input4 = {
            resource: URI.parse('file://resource4-basics.editor-service-locked-group-tests'),
            options: { pinned: true },
        };
        await service.openEditor(input1, rootGroup.id);
        await service.openEditor(input2, rootGroup.id);
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        await service.openEditor(input3, rightGroup.id);
        await service.openEditor(input4, rightGroup.id);
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        rootGroup.lock(true);
        rightGroup.lock(true);
        await service.openEditor({ ...input1, options: { ...input1.options, revealIfOpened: true } });
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input1.resource.toString());
        await service.openEditor({ ...input3, options: { ...input3.options, revealIfOpened: true } });
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input3.resource.toString());
        assert.strictEqual(part.groups.length, 2);
    });
    test('openEditor() - untyped, typed', () => {
        return testOpenEditors(false);
    });
    test('openEditors() - untyped, typed', () => {
        return testOpenEditors(true);
    });
    async function testOpenEditors(useOpenEditors) {
        disposables.add(registerTestFileEditor());
        const [part, service, accessor] = await createEditorService();
        let rootGroup = part.activeGroup;
        let editorFactoryCalled = 0;
        let untitledEditorFactoryCalled = 0;
        let diffEditorFactoryCalled = 0;
        let lastEditorFactoryEditor = undefined;
        let lastUntitledEditorFactoryEditor = undefined;
        let lastDiffEditorFactoryEditor = undefined;
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-override-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: (editor) => {
                editorFactoryCalled++;
                lastEditorFactoryEditor = editor;
                return { editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID) };
            },
            createUntitledEditorInput: (untitledEditor) => {
                untitledEditorFactoryCalled++;
                lastUntitledEditorFactoryEditor = untitledEditor;
                return {
                    editor: createTestFileEditorInput(untitledEditor.resource ??
                        URI.parse(`untitled://my-untitled-editor-${untitledEditorFactoryCalled}`), TEST_EDITOR_INPUT_ID),
                };
            },
            createDiffEditorInput: (diffEditor) => {
                diffEditorFactoryCalled++;
                lastDiffEditorFactoryEditor = diffEditor;
                return {
                    editor: createTestFileEditorInput(URI.file(`diff-editor-${diffEditorFactoryCalled}`), TEST_EDITOR_INPUT_ID),
                };
            },
        }));
        async function resetTestState() {
            editorFactoryCalled = 0;
            untitledEditorFactoryCalled = 0;
            diffEditorFactoryCalled = 0;
            lastEditorFactoryEditor = undefined;
            lastUntitledEditorFactoryEditor = undefined;
            lastDiffEditorFactoryEditor = undefined;
            await workbenchTeardown(accessor.instantiationService);
            rootGroup = part.activeGroup;
        }
        async function openEditor(editor, group) {
            if (useOpenEditors) {
                // The type safety isn't super good here, so we assist with runtime checks
                // Open editors expects untyped or editor input with options, you cannot pass a typed editor input
                // without options
                if (!isEditorInputWithOptions(editor) && isEditorInput(editor)) {
                    editor = { editor: editor, options: {} };
                }
                const panes = await service.openEditors([editor], group);
                return panes[0];
            }
            if (isEditorInputWithOptions(editor)) {
                return service.openEditor(editor.editor, editor.options, group);
            }
            return service.openEditor(editor, group);
        }
        // untyped
        {
            // untyped resource editor, no options, no group
            {
                const untypedEditor = {
                    resource: URI.file('file.editor-service-override-tests'),
                };
                const pane = await openEditor(untypedEditor);
                let typedEditor = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedEditor instanceof TestFileEditorInput);
                assert.strictEqual(typedEditor.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 1);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor, untypedEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                // opening the same editor should not create
                // a new editor input
                await openEditor(untypedEditor);
                assert.strictEqual(pane?.group.activeEditor, typedEditor);
                // replaceEditors should work too
                const untypedEditorReplacement = {
                    resource: URI.file('file-replaced.editor-service-override-tests'),
                };
                await service.replaceEditors([
                    {
                        editor: typedEditor,
                        replacement: untypedEditorReplacement,
                    },
                ], rootGroup);
                typedEditor = rootGroup.activeEditor;
                assert.ok(typedEditor instanceof TestFileEditorInput);
                assert.strictEqual(typedEditor?.resource?.toString(), untypedEditorReplacement.resource.toString());
                assert.strictEqual(editorFactoryCalled, 3);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor, untypedEditorReplacement);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped resource editor, options (override text), no group
            {
                const untypedEditor = {
                    resource: URI.file('file.editor-service-override-tests'),
                    options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
                };
                const pane = await openEditor(untypedEditor);
                const typedEditor = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedEditor instanceof FileEditorInput);
                assert.strictEqual(typedEditor.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                // opening the same editor should not create
                // a new editor input
                await openEditor(untypedEditor);
                assert.strictEqual(pane?.group.activeEditor, typedEditor);
                await resetTestState();
            }
            // untyped resource editor, options (override text, sticky: true, preserveFocus: true), no group
            {
                const untypedEditor = {
                    resource: URI.file('file.editor-service-override-tests'),
                    options: { sticky: true, preserveFocus: true, override: DEFAULT_EDITOR_ASSOCIATION.id },
                };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof FileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // untyped resource editor, options (override default), no group
            {
                const untypedEditor = {
                    resource: URI.file('file.editor-service-override-tests'),
                    options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
                };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof FileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped resource editor, options (override: TEST_EDITOR_INPUT_ID), no group
            {
                const untypedEditor = {
                    resource: URI.file('file.editor-service-override-tests'),
                    options: { override: TEST_EDITOR_INPUT_ID },
                };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 1);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor, untypedEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped resource editor, options (sticky: true, preserveFocus: true), no group
            {
                const untypedEditor = {
                    resource: URI.file('file.editor-service-override-tests'),
                    options: { sticky: true, preserveFocus: true },
                };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 1);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(lastEditorFactoryEditor.options?.preserveFocus, true);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // untyped resource editor, options (override: TEST_EDITOR_INPUT_ID, sticky: true, preserveFocus: true), no group
            {
                const untypedEditor = {
                    resource: URI.file('file.editor-service-override-tests'),
                    options: { sticky: true, preserveFocus: true, override: TEST_EDITOR_INPUT_ID },
                };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 1);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(lastEditorFactoryEditor.options?.preserveFocus, true);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // untyped resource editor, no options, SIDE_GROUP
            {
                const untypedEditor = {
                    resource: URI.file('file.editor-service-override-tests'),
                };
                const pane = await openEditor(untypedEditor, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane?.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 1);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor, untypedEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped resource editor, options (override text), SIDE_GROUP
            {
                const untypedEditor = {
                    resource: URI.file('file.editor-service-override-tests'),
                    options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
                };
                const pane = await openEditor(untypedEditor, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof FileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // Typed
        {
            // typed editor, no options, no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor });
                let typedInput = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedInput instanceof TestFileEditorInput);
                assert.strictEqual(typedInput.resource.toString(), typedEditor.resource.toString());
                // It's a typed editor input so the resolver should not have been called
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                // opening the same editor should not create
                // a new editor input
                await openEditor(typedEditor);
                assert.strictEqual(pane?.group.activeEditor, typedInput);
                // replaceEditors should work too
                const typedEditorReplacement = createTestFileEditorInput(URI.file('file-replaced.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                await service.replaceEditors([
                    {
                        editor: typedEditor,
                        replacement: typedEditorReplacement,
                    },
                ], rootGroup);
                typedInput = rootGroup.activeEditor;
                assert.ok(typedInput instanceof TestFileEditorInput);
                assert.strictEqual(typedInput.resource.toString(), typedEditorReplacement.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // typed editor, no options, no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor });
                const typedInput = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedInput instanceof TestFileEditorInput);
                assert.strictEqual(typedInput.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                // opening the same editor should not create
                // a new editor input
                await openEditor(typedEditor);
                assert.strictEqual(pane?.group.activeEditor, typedEditor);
                await resetTestState();
            }
            // typed editor, options (no override, sticky: true, preserveFocus: true), no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({
                    editor: typedEditor,
                    options: { sticky: true, preserveFocus: true },
                });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // typed editor, options (override default), no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({
                    editor: typedEditor,
                    options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
                });
                assert.strictEqual(pane?.group, rootGroup);
                // We shouldn't have resolved because it is a typed editor, even though we have an override specified
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // typed editor, options (override: TEST_EDITOR_INPUT_ID), no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({
                    editor: typedEditor,
                    options: { override: TEST_EDITOR_INPUT_ID },
                });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // typed editor, options (sticky: true, preserveFocus: true), no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({
                    editor: typedEditor,
                    options: { sticky: true, preserveFocus: true },
                });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // typed editor, options (override: TEST_EDITOR_INPUT_ID, sticky: true, preserveFocus: true), no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({
                    editor: typedEditor,
                    options: { sticky: true, preserveFocus: true, override: TEST_EDITOR_INPUT_ID },
                });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // typed editor, no options, SIDE_GROUP
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor }, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane?.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // typed editor, options (no override), SIDE_GROUP
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor }, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // Untyped untitled
        {
            // untyped untitled editor, no options, no group
            {
                const untypedEditor = {
                    resource: undefined,
                    options: { override: TEST_EDITOR_INPUT_ID },
                };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.scheme, 'untitled');
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 1);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.strictEqual(lastUntitledEditorFactoryEditor, untypedEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped untitled editor, no options, SIDE_GROUP
            {
                const untypedEditor = {
                    resource: undefined,
                    options: { override: TEST_EDITOR_INPUT_ID },
                };
                const pane = await openEditor(untypedEditor, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane?.input.resource.scheme, 'untitled');
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 1);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.strictEqual(lastUntitledEditorFactoryEditor, untypedEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped untitled editor with associated resource, no options, no group
            {
                const untypedEditor = {
                    resource: URI.file('file-original.editor-service-override-tests').with({
                        scheme: 'untitled',
                    }),
                };
                const pane = await openEditor(untypedEditor);
                const typedEditor = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedEditor instanceof TestFileEditorInput);
                assert.strictEqual(typedEditor.resource.scheme, 'untitled');
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 1);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.strictEqual(lastUntitledEditorFactoryEditor, untypedEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                // opening the same editor should not create
                // a new editor input
                await openEditor(untypedEditor);
                assert.strictEqual(pane?.group.activeEditor, typedEditor);
                await resetTestState();
            }
            // untyped untitled editor, options (sticky: true, preserveFocus: true), no group
            {
                const untypedEditor = {
                    resource: undefined,
                    options: { sticky: true, preserveFocus: true, override: TEST_EDITOR_INPUT_ID },
                };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.scheme, 'untitled');
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 1);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.strictEqual(lastUntitledEditorFactoryEditor, untypedEditor);
                assert.strictEqual(lastUntitledEditorFactoryEditor.options
                    ?.preserveFocus, true);
                assert.strictEqual(lastUntitledEditorFactoryEditor.options?.sticky, true);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // Untyped diff
        {
            // untyped diff editor, no options, no group
            {
                const untypedEditor = {
                    original: { resource: URI.file('file-original.editor-service-override-tests') },
                    modified: { resource: URI.file('file-modified.editor-service-override-tests') },
                    options: { override: TEST_EDITOR_INPUT_ID },
                };
                const pane = await openEditor(untypedEditor);
                const typedEditor = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedEditor instanceof TestFileEditorInput);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 1);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.strictEqual(lastDiffEditorFactoryEditor, untypedEditor);
                await resetTestState();
            }
            // untyped diff editor, no options, SIDE_GROUP
            {
                const untypedEditor = {
                    original: { resource: URI.file('file-original.editor-service-override-tests') },
                    modified: { resource: URI.file('file-modified.editor-service-override-tests') },
                    options: { override: TEST_EDITOR_INPUT_ID },
                };
                const pane = await openEditor(untypedEditor, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 1);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.strictEqual(lastDiffEditorFactoryEditor, untypedEditor);
                await resetTestState();
            }
            // untyped diff editor, options (sticky: true, preserveFocus: true), no group
            {
                const untypedEditor = {
                    original: { resource: URI.file('file-original.editor-service-override-tests') },
                    modified: { resource: URI.file('file-modified.editor-service-override-tests') },
                    options: {
                        override: TEST_EDITOR_INPUT_ID,
                        sticky: true,
                        preserveFocus: true,
                    },
                };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 1);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.strictEqual(lastDiffEditorFactoryEditor, untypedEditor);
                assert.strictEqual(lastDiffEditorFactoryEditor.options?.preserveFocus, true);
                assert.strictEqual(lastDiffEditorFactoryEditor.options?.sticky, true);
                await resetTestState();
            }
        }
        // typed editor, not registered
        {
            // no options, no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.something'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input, typedEditor);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // no options, SIDE_GROUP
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.something'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor }, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane?.input, typedEditor);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // typed editor, not supporting `toUntyped`
        {
            // no options, no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.something'), TEST_EDITOR_INPUT_ID);
                typedEditor.disableToUntyped = true;
                const pane = await openEditor({ editor: typedEditor });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input, typedEditor);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // no options, SIDE_GROUP
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.something'), TEST_EDITOR_INPUT_ID);
                typedEditor.disableToUntyped = true;
                const pane = await openEditor({ editor: typedEditor }, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane?.input, typedEditor);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // openEditors with >1 editor
        if (useOpenEditors) {
            // mix of untyped and typed editors
            {
                const untypedEditor1 = {
                    resource: URI.file('file1.editor-service-override-tests'),
                };
                const untypedEditor2 = {
                    resource: URI.file('file2.editor-service-override-tests'),
                };
                const untypedEditor3 = {
                    editor: createTestFileEditorInput(URI.file('file3.editor-service-override-tests'), TEST_EDITOR_INPUT_ID),
                };
                const untypedEditor4 = {
                    editor: createTestFileEditorInput(URI.file('file4.editor-service-override-tests'), TEST_EDITOR_INPUT_ID),
                };
                const untypedEditor5 = {
                    resource: URI.file('file5.editor-service-override-tests'),
                };
                const pane = (await service.openEditors([
                    untypedEditor1,
                    untypedEditor2,
                    untypedEditor3,
                    untypedEditor4,
                    untypedEditor5,
                ]))[0];
                assert.strictEqual(pane?.group, rootGroup);
                assert.strictEqual(pane?.group.count, 5);
                // Only the untyped editors should have had factories called (3 untyped editors)
                assert.strictEqual(editorFactoryCalled, 3);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // untyped default editor
        {
            // untyped default editor, options: revealIfVisible
            {
                const untypedEditor1 = {
                    resource: URI.file('file-1'),
                    options: { revealIfVisible: true, pinned: true },
                };
                const untypedEditor2 = {
                    resource: URI.file('file-2'),
                    options: { pinned: true },
                };
                const rootPane = await openEditor(untypedEditor1);
                const sidePane = await openEditor(untypedEditor2, SIDE_GROUP);
                assert.strictEqual(rootPane?.group.count, 1);
                assert.strictEqual(sidePane?.group.count, 1);
                accessor.editorGroupService.activateGroup(sidePane.group);
                await openEditor(untypedEditor1);
                assert.strictEqual(rootPane?.group.count, 1);
                assert.strictEqual(sidePane?.group.count, 1);
                await resetTestState();
            }
            // untyped default editor, options: revealIfOpened
            {
                const untypedEditor1 = {
                    resource: URI.file('file-1'),
                    options: { revealIfOpened: true, pinned: true },
                };
                const untypedEditor2 = {
                    resource: URI.file('file-2'),
                    options: { pinned: true },
                };
                const rootPane = await openEditor(untypedEditor1);
                await openEditor(untypedEditor2);
                assert.strictEqual(rootPane?.group.activeEditor?.resource?.toString(), untypedEditor2.resource.toString());
                const sidePane = await openEditor(untypedEditor2, SIDE_GROUP);
                assert.strictEqual(rootPane?.group.count, 2);
                assert.strictEqual(sidePane?.group.count, 1);
                accessor.editorGroupService.activateGroup(sidePane.group);
                await openEditor(untypedEditor1);
                assert.strictEqual(rootPane?.group.count, 2);
                assert.strictEqual(sidePane?.group.count, 1);
                await resetTestState();
            }
        }
    }
    test('openEditor() applies options if editor already opened', async () => {
        disposables.add(registerTestFileEditor());
        const [, service, accessor] = await createEditorService();
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-override-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: (editor) => ({
                editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID),
            }),
        }));
        // Typed editor
        let pane = await service.openEditor(createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID));
        pane = await service.openEditor(createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID), { sticky: true, preserveFocus: true });
        assert.strictEqual(pane?.options?.sticky, true);
        assert.strictEqual(pane?.options?.preserveFocus, true);
        await pane.group.closeAllEditors();
        // Untyped editor (without registered editor)
        pane = await service.openEditor({ resource: URI.file('resource-openEditors') });
        pane = await service.openEditor({
            resource: URI.file('resource-openEditors'),
            options: { sticky: true, preserveFocus: true },
        });
        assert.ok(pane instanceof TestTextFileEditor);
        assert.strictEqual(pane?.options?.sticky, true);
        assert.strictEqual(pane?.options?.preserveFocus, true);
        // Untyped editor (with registered editor)
        pane = await service.openEditor({ resource: URI.file('file.editor-service-override-tests') });
        pane = await service.openEditor({
            resource: URI.file('file.editor-service-override-tests'),
            options: { sticky: true, preserveFocus: true },
        });
        assert.strictEqual(pane?.options?.sticky, true);
        assert.strictEqual(pane?.options?.preserveFocus, true);
    });
    test('isOpen() with side by side editor', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = new SideBySideEditorInput('sideBySide', '', input, otherInput, service);
        const editor1 = await service.openEditor(sideBySideInput, { pinned: true });
        assert.strictEqual(part.activeGroup.count, 1);
        assert.strictEqual(service.isOpened(input), false);
        assert.strictEqual(service.isOpened(otherInput), true);
        assert.strictEqual(service.isOpened({
            resource: input.resource,
            typeId: input.typeId,
            editorId: input.editorId,
        }), false);
        assert.strictEqual(service.isOpened({
            resource: otherInput.resource,
            typeId: otherInput.typeId,
            editorId: otherInput.editorId,
        }), true);
        const editor2 = await service.openEditor(input, { pinned: true });
        assert.strictEqual(part.activeGroup.count, 2);
        assert.strictEqual(service.isOpened(input), true);
        assert.strictEqual(service.isOpened(otherInput), true);
        assert.strictEqual(service.isOpened({
            resource: input.resource,
            typeId: input.typeId,
            editorId: input.editorId,
        }), true);
        assert.strictEqual(service.isOpened({
            resource: otherInput.resource,
            typeId: otherInput.typeId,
            editorId: otherInput.editorId,
        }), true);
        await editor2?.group.closeEditor(input);
        assert.strictEqual(part.activeGroup.count, 1);
        assert.strictEqual(service.isOpened(input), false);
        assert.strictEqual(service.isOpened(otherInput), true);
        assert.strictEqual(service.isOpened({
            resource: input.resource,
            typeId: input.typeId,
            editorId: input.editorId,
        }), false);
        assert.strictEqual(service.isOpened({
            resource: otherInput.resource,
            typeId: otherInput.typeId,
            editorId: otherInput.editorId,
        }), true);
        await editor1?.group.closeEditor(sideBySideInput);
        assert.strictEqual(service.isOpened(input), false);
        assert.strictEqual(service.isOpened(otherInput), false);
        assert.strictEqual(service.isOpened({
            resource: input.resource,
            typeId: input.typeId,
            editorId: input.editorId,
        }), false);
        assert.strictEqual(service.isOpened({
            resource: otherInput.resource,
            typeId: otherInput.typeId,
            editorId: otherInput.editorId,
        }), false);
    });
    test('openEditors() / replaceEditors()', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        const replaceInput = createTestFileEditorInput(URI.parse('my://resource3-openEditors'), TEST_EDITOR_INPUT_ID);
        // Open editors
        await service.openEditors([{ editor: input }, { editor: otherInput }]);
        assert.strictEqual(part.activeGroup.count, 2);
        // Replace editors
        await service.replaceEditors([{ editor: input, replacement: replaceInput }], part.activeGroup);
        assert.strictEqual(part.activeGroup.count, 2);
        assert.strictEqual(part.activeGroup.getIndexOfEditor(replaceInput), 0);
    });
    test('openEditors() handles workspace trust (typed editors)', async () => {
        const [part, service, accessor] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1-openEditors'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.parse('my://resource3-openEditors'), TEST_EDITOR_INPUT_ID);
        const input4 = createTestFileEditorInput(URI.parse('my://resource4-openEditors'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = new SideBySideEditorInput('side by side', undefined, input3, input4, service);
        const oldHandler = accessor.workspaceTrustRequestService.requestOpenUrisHandler;
        try {
            // Trust: cancel
            let trustEditorUris = [];
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = async (uris) => {
                trustEditorUris = uris;
                return 3 /* WorkspaceTrustUriResponse.Cancel */;
            };
            await service.openEditors([{ editor: input1 }, { editor: input2 }, { editor: sideBySideInput }], undefined, { validateTrust: true });
            assert.strictEqual(part.activeGroup.count, 0);
            assert.strictEqual(trustEditorUris.length, 4);
            assert.strictEqual(trustEditorUris.some((uri) => uri.toString() === input1.resource.toString()), true);
            assert.strictEqual(trustEditorUris.some((uri) => uri.toString() === input2.resource.toString()), true);
            assert.strictEqual(trustEditorUris.some((uri) => uri.toString() === input3.resource.toString()), true);
            assert.strictEqual(trustEditorUris.some((uri) => uri.toString() === input4.resource.toString()), true);
            // Trust: open in new window
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = async (uris) => 2 /* WorkspaceTrustUriResponse.OpenInNewWindow */;
            await service.openEditors([{ editor: input1 }, { editor: input2 }, { editor: sideBySideInput }], undefined, { validateTrust: true });
            assert.strictEqual(part.activeGroup.count, 0);
            // Trust: allow
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = async (uris) => 1 /* WorkspaceTrustUriResponse.Open */;
            await service.openEditors([{ editor: input1 }, { editor: input2 }, { editor: sideBySideInput }], undefined, { validateTrust: true });
            assert.strictEqual(part.activeGroup.count, 3);
        }
        finally {
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = oldHandler;
        }
    });
    test('openEditors() ignores trust when `validateTrust: false', async () => {
        const [part, service, accessor] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1-openEditors'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.parse('my://resource3-openEditors'), TEST_EDITOR_INPUT_ID);
        const input4 = createTestFileEditorInput(URI.parse('my://resource4-openEditors'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = new SideBySideEditorInput('side by side', undefined, input3, input4, service);
        const oldHandler = accessor.workspaceTrustRequestService.requestOpenUrisHandler;
        try {
            // Trust: cancel
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = async (uris) => 3 /* WorkspaceTrustUriResponse.Cancel */;
            await service.openEditors([
                { editor: input1 },
                { editor: input2 },
                { editor: sideBySideInput },
            ]);
            assert.strictEqual(part.activeGroup.count, 3);
        }
        finally {
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = oldHandler;
        }
    });
    test('openEditors() extracts proper resources from untyped editors for workspace trust', async () => {
        const [, service, accessor] = await createEditorService();
        const input = { resource: URI.file('resource-openEditors') };
        const otherInput = {
            original: { resource: URI.parse('my://resource2-openEditors') },
            modified: { resource: URI.parse('my://resource3-openEditors') },
        };
        const oldHandler = accessor.workspaceTrustRequestService.requestOpenUrisHandler;
        try {
            let trustEditorUris = [];
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = async (uris) => {
                trustEditorUris = uris;
                return oldHandler(uris);
            };
            await service.openEditors([input, otherInput], undefined, { validateTrust: true });
            assert.strictEqual(trustEditorUris.length, 3);
            assert.strictEqual(trustEditorUris.some((uri) => uri.toString() === input.resource.toString()), true);
            assert.strictEqual(trustEditorUris.some((uri) => uri.toString() === otherInput.original.resource?.toString()), true);
            assert.strictEqual(trustEditorUris.some((uri) => uri.toString() === otherInput.modified.resource?.toString()), true);
        }
        finally {
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = oldHandler;
        }
    });
    test('close editor does not dispose when editor opened in other group', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-close1'), TEST_EDITOR_INPUT_ID);
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        // Open input
        await service.openEditor(input, { pinned: true });
        await service.openEditor(input, { pinned: true }, rightGroup);
        const editors = service.editors;
        assert.strictEqual(editors.length, 2);
        assert.strictEqual(editors[0], input);
        assert.strictEqual(editors[1], input);
        // Close input
        await rootGroup.closeEditor(input);
        assert.strictEqual(input.isDisposed(), false);
        await rightGroup.closeEditor(input);
        assert.strictEqual(input.isDisposed(), true);
    });
    test('open to the side', async () => {
        const [part, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1-openside'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource2-openside'), TEST_EDITOR_INPUT_ID);
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true }, rootGroup);
        let editor = await service.openEditor(input1, { pinned: true, preserveFocus: true }, SIDE_GROUP);
        assert.strictEqual(part.activeGroup, rootGroup);
        assert.strictEqual(part.count, 2);
        assert.strictEqual(editor?.group, part.groups[1]);
        assert.strictEqual(service.isVisible(input1), true);
        assert.strictEqual(service.isOpened(input1), true);
        // Open to the side uses existing neighbour group if any
        editor = await service.openEditor(input2, { pinned: true, preserveFocus: true }, SIDE_GROUP);
        assert.strictEqual(part.activeGroup, rootGroup);
        assert.strictEqual(part.count, 2);
        assert.strictEqual(editor?.group, part.groups[1]);
        assert.strictEqual(service.isVisible(input2), true);
        assert.strictEqual(service.isOpened(input2), true);
    });
    test('editor group activation', async () => {
        const [part, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1-openside'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource2-openside'), TEST_EDITOR_INPUT_ID);
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true }, rootGroup);
        let editor = await service.openEditor(input2, { pinned: true, preserveFocus: true, activation: EditorActivation.ACTIVATE }, SIDE_GROUP);
        const sideGroup = editor?.group;
        assert.strictEqual(part.activeGroup, sideGroup);
        editor = await service.openEditor(input1, { pinned: true, preserveFocus: true, activation: EditorActivation.PRESERVE }, rootGroup);
        assert.strictEqual(part.activeGroup, sideGroup);
        editor = await service.openEditor(input1, { pinned: true, preserveFocus: true, activation: EditorActivation.ACTIVATE }, rootGroup);
        assert.strictEqual(part.activeGroup, rootGroup);
        editor = await service.openEditor(input2, { pinned: true, activation: EditorActivation.PRESERVE }, sideGroup);
        assert.strictEqual(part.activeGroup, rootGroup);
        editor = await service.openEditor(input2, { pinned: true, activation: EditorActivation.ACTIVATE }, sideGroup);
        assert.strictEqual(part.activeGroup, sideGroup);
        part.arrangeGroups(1 /* GroupsArrangement.EXPAND */);
        editor = await service.openEditor(input1, { pinned: true, preserveFocus: true, activation: EditorActivation.RESTORE }, rootGroup);
        assert.strictEqual(part.activeGroup, sideGroup);
    });
    test('inactive editor group does not activate when closing editor (#117686)', async () => {
        const [part, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1-openside'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource2-openside'), TEST_EDITOR_INPUT_ID);
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true }, rootGroup);
        await service.openEditor(input2, { pinned: true }, rootGroup);
        const sideGroup = (await service.openEditor(input2, { pinned: true }, SIDE_GROUP))?.group;
        assert.strictEqual(part.activeGroup, sideGroup);
        assert.notStrictEqual(rootGroup, sideGroup);
        part.arrangeGroups(1 /* GroupsArrangement.EXPAND */, part.activeGroup);
        await rootGroup.closeEditor(input2);
        assert.strictEqual(part.activeGroup, sideGroup);
        assert(!part.isGroupExpanded(rootGroup));
        assert(part.isGroupExpanded(part.activeGroup));
    });
    test('active editor change / visible editor change events', async function () {
        const [part, service] = await createEditorService();
        let input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        let otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        let activeEditorChangeEventFired = false;
        const activeEditorChangeListener = service.onDidActiveEditorChange(() => {
            activeEditorChangeEventFired = true;
        });
        let visibleEditorChangeEventFired = false;
        const visibleEditorChangeListener = service.onDidVisibleEditorsChange(() => {
            visibleEditorChangeEventFired = true;
        });
        function assertActiveEditorChangedEvent(expected) {
            assert.strictEqual(activeEditorChangeEventFired, expected, `Unexpected active editor change state (got ${activeEditorChangeEventFired}, expected ${expected})`);
            activeEditorChangeEventFired = false;
        }
        function assertVisibleEditorsChangedEvent(expected) {
            assert.strictEqual(visibleEditorChangeEventFired, expected, `Unexpected visible editors change state (got ${visibleEditorChangeEventFired}, expected ${expected})`);
            visibleEditorChangeEventFired = false;
        }
        async function closeEditorAndWaitForNextToOpen(group, input) {
            await group.closeEditor(input);
            await timeout(0); // closing an editor will not immediately open the next one, so we need to wait
        }
        // 1.) open, open same, open other, close
        let editor = await service.openEditor(input, { pinned: true });
        const group = editor?.group;
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        editor = await service.openEditor(input);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        editor = await service.openEditor(otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        await closeEditorAndWaitForNextToOpen(group, otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        await closeEditorAndWaitForNextToOpen(group, input);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 2.) open, open same (forced open) (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        editor = await service.openEditor(input, { forceReload: true });
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await closeEditorAndWaitForNextToOpen(group, input);
        // 3.) open, open inactive, close (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        editor = await service.openEditor(otherInput, { inactive: true });
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 4.) open, open inactive, close inactive (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        editor = await service.openEditor(otherInput, { inactive: true });
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await closeEditorAndWaitForNextToOpen(group, otherInput);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 5.) add group, remove group (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        let rightGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        rightGroup.focus();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(false);
        part.removeGroup(rightGroup);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(false);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 6.) open editor in inactive group (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        rightGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await rightGroup.openEditor(otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        await closeEditorAndWaitForNextToOpen(rightGroup, otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 7.) activate group (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        rightGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await rightGroup.openEditor(otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        group.focus();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(false);
        await closeEditorAndWaitForNextToOpen(rightGroup, otherInput);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(true);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 8.) move editor (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        editor = await service.openEditor(otherInput, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        group.moveEditor(otherInput, group, { index: 0 });
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 9.) close editor in inactive group (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        rightGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await rightGroup.openEditor(otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        await closeEditorAndWaitForNextToOpen(group, input);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(true);
        // cleanup
        activeEditorChangeListener.dispose();
        visibleEditorChangeListener.dispose();
    });
    test('editors change event', async function () {
        const [part, service] = await createEditorService();
        const rootGroup = part.activeGroup;
        let input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        let otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        let editorsChangeEventCounter = 0;
        async function assertEditorsChangeEvent(fn, expected) {
            const p = Event.toPromise(service.onDidEditorsChange);
            await fn();
            await p;
            editorsChangeEventCounter++;
            assert.strictEqual(editorsChangeEventCounter, expected);
        }
        // open
        await assertEditorsChangeEvent(() => service.openEditor(input, { pinned: true }), 1);
        // open (other)
        await assertEditorsChangeEvent(() => service.openEditor(otherInput, { pinned: true }), 2);
        // close (inactive)
        await assertEditorsChangeEvent(() => rootGroup.closeEditor(input), 3);
        // close (active)
        await assertEditorsChangeEvent(() => rootGroup.closeEditor(otherInput), 4);
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        // open editors
        await assertEditorsChangeEvent(() => service.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: otherInput, options: { pinned: true } },
        ]), 5);
        // active editor change
        await assertEditorsChangeEvent(() => service.openEditor(otherInput), 6);
        // move editor (in group)
        await assertEditorsChangeEvent(() => service.openEditor(input, { pinned: true, index: 1 }), 7);
        const rightGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        await assertEditorsChangeEvent(async () => rootGroup.moveEditor(input, rightGroup), 8);
        // move group
        await assertEditorsChangeEvent(async () => part.moveGroup(rightGroup, rootGroup, 2 /* GroupDirection.LEFT */), 9);
    });
    test('two active editor change events when opening editor to the side', async function () {
        const [, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        let activeEditorChangeEvents = 0;
        const activeEditorChangeListener = service.onDidActiveEditorChange(() => {
            activeEditorChangeEvents++;
        });
        function assertActiveEditorChangedEvent(expected) {
            assert.strictEqual(activeEditorChangeEvents, expected, `Unexpected active editor change state (got ${activeEditorChangeEvents}, expected ${expected})`);
            activeEditorChangeEvents = 0;
        }
        await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(1);
        await service.openEditor(input, { pinned: true }, SIDE_GROUP);
        // we expect 2 active editor change events: one for the fact that the
        // active editor is now in the side group but also one for when the
        // editor has finished loading. we used to ignore that second change
        // event, however many listeners are interested on the active editor
        // when it has fully loaded (e.g. a model is set). as such, we cannot
        // simply ignore that second event from the editor service, even though
        // the actual editor input is the same
        assertActiveEditorChangedEvent(2);
        // cleanup
        activeEditorChangeListener.dispose();
    });
    test('activeTextEditorControl / activeTextEditorMode', async () => {
        const [, service] = await createEditorService();
        // Open untitled input
        const editor = await service.openEditor({ resource: undefined });
        assert.strictEqual(service.activeEditorPane, editor);
        assert.strictEqual(service.activeTextEditorControl, editor?.getControl());
        assert.strictEqual(service.activeTextEditorLanguageId, PLAINTEXT_LANGUAGE_ID);
    });
    test('openEditor returns undefined when inactive', async function () {
        const [, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-inactive'), TEST_EDITOR_INPUT_ID);
        const editor = await service.openEditor(input, { pinned: true });
        assert.ok(editor);
        const otherEditor = await service.openEditor(otherInput, { inactive: true });
        assert.ok(!otherEditor);
    });
    test('openEditor shows placeholder when opening fails', async function () {
        const [, service] = await createEditorService();
        const failingInput = createTestFileEditorInput(URI.parse('my://resource-failing'), TEST_EDITOR_INPUT_ID);
        failingInput.setFailToOpen();
        const failingEditor = await service.openEditor(failingInput);
        assert.ok(failingEditor instanceof ErrorPlaceholderEditor);
    });
    test('openEditor shows placeholder when restoring fails', async function () {
        const [, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        const failingInput = createTestFileEditorInput(URI.parse('my://resource-failing'), TEST_EDITOR_INPUT_ID);
        await service.openEditor(input, { pinned: true });
        await service.openEditor(failingInput, { inactive: true });
        failingInput.setFailToOpen();
        const failingEditor = await service.openEditor(failingInput);
        assert.ok(failingEditor instanceof ErrorPlaceholderEditor);
    });
    test('save, saveAll, revertAll', async function () {
        const [part, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.parse('my://resource2'), TEST_EDITOR_INPUT_ID);
        input2.dirty = true;
        const sameInput1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        sameInput1.dirty = true;
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true });
        await service.openEditor(input2, { pinned: true });
        await service.openEditor(sameInput1, { pinned: true }, SIDE_GROUP);
        const res1 = await service.save({ groupId: rootGroup.id, editor: input1 });
        assert.strictEqual(res1.success, true);
        assert.strictEqual(res1.editors[0], input1);
        assert.strictEqual(input1.gotSaved, true);
        input1.gotSaved = false;
        input1.gotSavedAs = false;
        input1.gotReverted = false;
        input1.dirty = true;
        input2.dirty = true;
        sameInput1.dirty = true;
        const res2 = await service.save({ groupId: rootGroup.id, editor: input1 }, { saveAs: true });
        assert.strictEqual(res2.success, true);
        assert.strictEqual(res2.editors[0], input1);
        assert.strictEqual(input1.gotSavedAs, true);
        input1.gotSaved = false;
        input1.gotSavedAs = false;
        input1.gotReverted = false;
        input1.dirty = true;
        input2.dirty = true;
        sameInput1.dirty = true;
        const revertRes = await service.revertAll();
        assert.strictEqual(revertRes, true);
        assert.strictEqual(input1.gotReverted, true);
        input1.gotSaved = false;
        input1.gotSavedAs = false;
        input1.gotReverted = false;
        input1.dirty = true;
        input2.dirty = true;
        sameInput1.dirty = true;
        const res3 = await service.saveAll();
        assert.strictEqual(res3.success, true);
        assert.strictEqual(res3.editors.length, 2);
        assert.strictEqual(input1.gotSaved, true);
        assert.strictEqual(input2.gotSaved, true);
        input1.gotSaved = false;
        input1.gotSavedAs = false;
        input1.gotReverted = false;
        input2.gotSaved = false;
        input2.gotSavedAs = false;
        input2.gotReverted = false;
        input1.dirty = true;
        input2.dirty = true;
        sameInput1.dirty = true;
        await service.saveAll({ saveAs: true });
        assert.strictEqual(input1.gotSavedAs, true);
        assert.strictEqual(input2.gotSavedAs, true);
        // services dedupes inputs automatically
        assert.strictEqual(sameInput1.gotSaved, false);
        assert.strictEqual(sameInput1.gotSavedAs, false);
        assert.strictEqual(sameInput1.gotReverted, false);
    });
    test('saveAll, revertAll (sticky editor)', async function () {
        const [, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.parse('my://resource2'), TEST_EDITOR_INPUT_ID);
        input2.dirty = true;
        const sameInput1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        sameInput1.dirty = true;
        await service.openEditor(input1, { pinned: true, sticky: true });
        await service.openEditor(input2, { pinned: true });
        await service.openEditor(sameInput1, { pinned: true }, SIDE_GROUP);
        const revertRes = await service.revertAll({ excludeSticky: true });
        assert.strictEqual(revertRes, true);
        assert.strictEqual(input1.gotReverted, false);
        assert.strictEqual(sameInput1.gotReverted, true);
        input1.gotSaved = false;
        input1.gotSavedAs = false;
        input1.gotReverted = false;
        sameInput1.gotSaved = false;
        sameInput1.gotSavedAs = false;
        sameInput1.gotReverted = false;
        input1.dirty = true;
        input2.dirty = true;
        sameInput1.dirty = true;
        const saveRes = await service.saveAll({ excludeSticky: true });
        assert.strictEqual(saveRes.success, true);
        assert.strictEqual(saveRes.editors.length, 2);
        assert.strictEqual(input1.gotSaved, false);
        assert.strictEqual(input2.gotSaved, true);
        assert.strictEqual(sameInput1.gotSaved, true);
    });
    test('saveAll, revertAll untitled (exclude untitled)', async function () {
        await testSaveRevertUntitled({}, false, false);
        await testSaveRevertUntitled({ includeUntitled: false }, false, false);
    });
    test('saveAll, revertAll untitled (include untitled)', async function () {
        await testSaveRevertUntitled({ includeUntitled: true }, true, false);
        await testSaveRevertUntitled({ includeUntitled: { includeScratchpad: false } }, true, false);
    });
    test('saveAll, revertAll untitled (include scratchpad)', async function () {
        await testSaveRevertUntitled({ includeUntitled: { includeScratchpad: true } }, true, true);
    });
    async function testSaveRevertUntitled(options, expectUntitled, expectScratchpad) {
        const [, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const untitledInput = createTestFileEditorInput(URI.parse('my://resource2'), TEST_EDITOR_INPUT_ID);
        untitledInput.dirty = true;
        untitledInput.capabilities = 4 /* EditorInputCapabilities.Untitled */;
        const scratchpadInput = createTestFileEditorInput(URI.parse('my://resource3'), TEST_EDITOR_INPUT_ID);
        scratchpadInput.modified = true;
        scratchpadInput.capabilities =
            512 /* EditorInputCapabilities.Scratchpad */ | 4 /* EditorInputCapabilities.Untitled */;
        await service.openEditor(input1, { pinned: true, sticky: true });
        await service.openEditor(untitledInput, { pinned: true });
        await service.openEditor(scratchpadInput, { pinned: true });
        const revertRes = await service.revertAll(options);
        assert.strictEqual(revertRes, true);
        assert.strictEqual(input1.gotReverted, true);
        assert.strictEqual(untitledInput.gotReverted, expectUntitled);
        assert.strictEqual(scratchpadInput.gotReverted, expectScratchpad);
        input1.gotSaved = false;
        untitledInput.gotSavedAs = false;
        scratchpadInput.gotReverted = false;
        input1.gotSaved = false;
        untitledInput.gotSavedAs = false;
        scratchpadInput.gotReverted = false;
        input1.dirty = true;
        untitledInput.dirty = true;
        scratchpadInput.modified = true;
        const saveRes = await service.saveAll(options);
        assert.strictEqual(saveRes.success, true);
        assert.strictEqual(saveRes.editors.length, expectScratchpad ? 3 : expectUntitled ? 2 : 1);
        assert.strictEqual(input1.gotSaved, true);
        assert.strictEqual(untitledInput.gotSaved, expectUntitled);
        assert.strictEqual(scratchpadInput.gotSaved, expectScratchpad);
    }
    test('file delete closes editor', async function () {
        return testFileDeleteEditorClose(false);
    });
    test('file delete leaves dirty editors open', function () {
        return testFileDeleteEditorClose(true);
    });
    async function testFileDeleteEditorClose(dirty) {
        const [part, service, accessor] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = dirty;
        const input2 = createTestFileEditorInput(URI.parse('my://resource2'), TEST_EDITOR_INPUT_ID);
        input2.dirty = dirty;
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true });
        await service.openEditor(input2, { pinned: true });
        assert.strictEqual(rootGroup.activeEditor, input2);
        const activeEditorChangePromise = awaitActiveEditorChange(service);
        accessor.fileService.fireAfterOperation(new FileOperationEvent(input2.resource, 1 /* FileOperation.DELETE */));
        if (!dirty) {
            await activeEditorChangePromise;
        }
        if (dirty) {
            assert.strictEqual(rootGroup.activeEditor, input2);
        }
        else {
            assert.strictEqual(rootGroup.activeEditor, input1);
        }
    }
    test('file move asks input to move', async function () {
        const [part, service, accessor] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        const movedInput = createTestFileEditorInput(URI.parse('my://resource2'), TEST_EDITOR_INPUT_ID);
        input1.movedEditor = { editor: movedInput };
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true });
        const activeEditorChangePromise = awaitActiveEditorChange(service);
        accessor.fileService.fireAfterOperation(new FileOperationEvent(input1.resource, 2 /* FileOperation.MOVE */, {
            resource: movedInput.resource,
            ctime: 0,
            etag: '',
            isDirectory: false,
            isFile: true,
            mtime: 0,
            name: 'resource2',
            size: 0,
            isSymbolicLink: false,
            readonly: false,
            locked: false,
            children: undefined,
        }));
        await activeEditorChangePromise;
        assert.strictEqual(rootGroup.activeEditor, movedInput);
    });
    function awaitActiveEditorChange(editorService) {
        return Event.toPromise(Event.once(editorService.onDidActiveEditorChange));
    }
    test('file watcher gets installed for out of workspace files', async function () {
        const [, service, accessor] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('file://resource1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('file://resource2'), TEST_EDITOR_INPUT_ID);
        await service.openEditor(input1, { pinned: true });
        assert.strictEqual(accessor.fileService.watches.length, 1);
        assert.strictEqual(accessor.fileService.watches[0].toString(), input1.resource.toString());
        const editor = await service.openEditor(input2, { pinned: true });
        assert.strictEqual(accessor.fileService.watches.length, 1);
        assert.strictEqual(accessor.fileService.watches[0].toString(), input2.resource.toString());
        await editor?.group.closeAllEditors();
        assert.strictEqual(accessor.fileService.watches.length, 0);
    });
    test('activeEditorPane scopedContextKeyService', async function () {
        const instantiationService = workbenchInstantiationService({
            contextKeyService: (instantiationService) => instantiationService.createInstance(MockScopableContextKeyService),
        }, disposables);
        const [part, service] = await createEditorService(instantiationService);
        const input1 = createTestFileEditorInput(URI.parse('file://resource1'), TEST_EDITOR_INPUT_ID);
        createTestFileEditorInput(URI.parse('file://resource2'), TEST_EDITOR_INPUT_ID);
        await service.openEditor(input1, { pinned: true });
        const editorContextKeyService = service.activeEditorPane?.scopedContextKeyService;
        assert.ok(!!editorContextKeyService);
        assert.strictEqual(editorContextKeyService, part.activeGroup.activeEditorPane?.scopedContextKeyService);
    });
    test('editorResolverService - openEditor', async function () {
        const [, service, accessor] = await createEditorService();
        const editorResolverService = accessor.editorResolverService;
        const textEditorService = accessor.textEditorService;
        let editorCount = 0;
        const registrationDisposable = editorResolverService.registerEditor('*.md', {
            id: 'TestEditor',
            label: 'Test Editor',
            detail: 'Test Editor Provider',
            priority: RegisteredEditorPriority.builtin,
        }, {}, {
            createEditorInput: (editorInput) => {
                editorCount++;
                return { editor: textEditorService.createTextEditor(editorInput) };
            },
            createDiffEditorInput: (diffEditor) => ({
                editor: textEditorService.createTextEditor(diffEditor),
            }),
        });
        assert.strictEqual(editorCount, 0);
        const input1 = { resource: URI.parse('file://test/path/resource1.txt') };
        const input2 = { resource: URI.parse('file://test/path/resource1.md') };
        // Open editor input 1 and it shouln't trigger override as the glob doesn't match
        await service.openEditor(input1);
        assert.strictEqual(editorCount, 0);
        // Open editor input 2 and it should trigger override as the glob doesn match
        await service.openEditor(input2);
        assert.strictEqual(editorCount, 1);
        // Because we specify an override we shouldn't see it triggered even if it matches
        await service.openEditor({ ...input2, options: { override: 'default' } });
        assert.strictEqual(editorCount, 1);
        registrationDisposable.dispose();
    });
    test('editorResolverService - openEditors', async function () {
        const [, service, accessor] = await createEditorService();
        const editorResolverService = accessor.editorResolverService;
        const textEditorService = accessor.textEditorService;
        let editorCount = 0;
        const registrationDisposable = editorResolverService.registerEditor('*.md', {
            id: 'TestEditor',
            label: 'Test Editor',
            detail: 'Test Editor Provider',
            priority: RegisteredEditorPriority.builtin,
        }, {}, {
            createEditorInput: (editorInput) => {
                editorCount++;
                return { editor: textEditorService.createTextEditor(editorInput) };
            },
            createDiffEditorInput: (diffEditor) => ({
                editor: textEditorService.createTextEditor(diffEditor),
            }),
        });
        assert.strictEqual(editorCount, 0);
        const input1 = createTestFileEditorInput(URI.parse('file://test/path/resource1.txt'), TEST_EDITOR_INPUT_ID).toUntyped();
        const input2 = createTestFileEditorInput(URI.parse('file://test/path/resource2.txt'), TEST_EDITOR_INPUT_ID).toUntyped();
        const input3 = createTestFileEditorInput(URI.parse('file://test/path/resource3.md'), TEST_EDITOR_INPUT_ID).toUntyped();
        const input4 = createTestFileEditorInput(URI.parse('file://test/path/resource4.md'), TEST_EDITOR_INPUT_ID).toUntyped();
        assert.ok(input1);
        assert.ok(input2);
        assert.ok(input3);
        assert.ok(input4);
        // Open editor inputs
        await service.openEditors([input1, input2, input3, input4]);
        // Only two matched the factory glob
        assert.strictEqual(editorCount, 2);
        registrationDisposable.dispose();
    });
    test('editorResolverService - replaceEditors', async function () {
        const [part, service, accessor] = await createEditorService();
        const editorResolverService = accessor.editorResolverService;
        const textEditorService = accessor.textEditorService;
        let editorCount = 0;
        const registrationDisposable = editorResolverService.registerEditor('*.md', {
            id: 'TestEditor',
            label: 'Test Editor',
            detail: 'Test Editor Provider',
            priority: RegisteredEditorPriority.builtin,
        }, {}, {
            createEditorInput: (editorInput) => {
                editorCount++;
                return { editor: textEditorService.createTextEditor(editorInput) };
            },
            createDiffEditorInput: (diffEditor) => ({
                editor: textEditorService.createTextEditor(diffEditor),
            }),
        });
        assert.strictEqual(editorCount, 0);
        const input1 = createTestFileEditorInput(URI.parse('file://test/path/resource2.md'), TEST_EDITOR_INPUT_ID);
        const untypedInput1 = input1.toUntyped();
        assert.ok(untypedInput1);
        // Open editor input 1 and it shouldn't trigger because typed inputs aren't overriden
        await service.openEditor(input1);
        assert.strictEqual(editorCount, 0);
        await service.replaceEditors([
            {
                editor: input1,
                replacement: untypedInput1,
            },
        ], part.activeGroup);
        assert.strictEqual(editorCount, 1);
        registrationDisposable.dispose();
    });
    test('closeEditor', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        // Open editors
        await service.openEditors([{ editor: input }, { editor: otherInput }]);
        assert.strictEqual(part.activeGroup.count, 2);
        // Close editor
        await service.closeEditor({ editor: input, groupId: part.activeGroup.id });
        assert.strictEqual(part.activeGroup.count, 1);
        await service.closeEditor({ editor: input, groupId: part.activeGroup.id });
        assert.strictEqual(part.activeGroup.count, 1);
        await service.closeEditor({ editor: otherInput, groupId: part.activeGroup.id });
        assert.strictEqual(part.activeGroup.count, 0);
        await service.closeEditor({ editor: otherInput, groupId: 999 });
        assert.strictEqual(part.activeGroup.count, 0);
    });
    test('closeEditors', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        // Open editors
        await service.openEditors([{ editor: input }, { editor: otherInput }]);
        assert.strictEqual(part.activeGroup.count, 2);
        // Close editors
        await service.closeEditors([
            { editor: input, groupId: part.activeGroup.id },
            { editor: otherInput, groupId: part.activeGroup.id },
        ]);
        assert.strictEqual(part.activeGroup.count, 0);
    });
    test('findEditors (in group)', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        // Open editors
        await service.openEditors([{ editor: input }, { editor: otherInput }]);
        assert.strictEqual(part.activeGroup.count, 2);
        // Try using find editors for opened editors
        {
            const found1 = service.findEditors(input.resource, undefined, part.activeGroup);
            assert.strictEqual(found1.length, 1);
            assert.strictEqual(found1[0], input);
            const found2 = service.findEditors(input, undefined, part.activeGroup);
            assert.strictEqual(found2, input);
        }
        {
            const found1 = service.findEditors(otherInput.resource, undefined, part.activeGroup);
            assert.strictEqual(found1.length, 1);
            assert.strictEqual(found1[0], otherInput);
            const found2 = service.findEditors(otherInput, undefined, part.activeGroup);
            assert.strictEqual(found2, otherInput);
        }
        // Make sure we don't find non-opened editors
        {
            const found1 = service.findEditors(URI.parse('my://no-such-resource'), undefined, part.activeGroup);
            assert.strictEqual(found1.length, 0);
            const found2 = service.findEditors({
                resource: URI.parse('my://no-such-resource'),
                typeId: '',
                editorId: TEST_EDITOR_INPUT_ID,
            }, undefined, part.activeGroup);
            assert.strictEqual(found2, undefined);
        }
        // Make sure we don't find editors across groups
        {
            const newEditor = await service.openEditor(createTestFileEditorInput(URI.parse('my://other-group-resource'), TEST_EDITOR_INPUT_ID), { pinned: true, preserveFocus: true }, SIDE_GROUP);
            const found1 = service.findEditors(input.resource, undefined, newEditor.group.id);
            assert.strictEqual(found1.length, 0);
            const found2 = service.findEditors(input, undefined, newEditor.group.id);
            assert.strictEqual(found2, undefined);
        }
        // Check we don't find editors after closing them
        await part.activeGroup.closeAllEditors();
        {
            const found1 = service.findEditors(input.resource, undefined, part.activeGroup);
            assert.strictEqual(found1.length, 0);
            const found2 = service.findEditors(input, undefined, part.activeGroup);
            assert.strictEqual(found2, undefined);
        }
    });
    test('findEditors (across groups)', async () => {
        const [part, service] = await createEditorService();
        const rootGroup = part.activeGroup;
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        // Open editors
        await service.openEditors([{ editor: input }, { editor: otherInput }]);
        const sideEditor = await service.openEditor(input, { pinned: true }, SIDE_GROUP);
        // Try using find editors for opened editors
        {
            const found1 = service.findEditors(input.resource);
            assert.strictEqual(found1.length, 2);
            assert.strictEqual(found1[0].editor, input);
            assert.strictEqual(found1[0].groupId, sideEditor?.group.id);
            assert.strictEqual(found1[1].editor, input);
            assert.strictEqual(found1[1].groupId, rootGroup.id);
            const found2 = service.findEditors(input);
            assert.strictEqual(found2.length, 2);
            assert.strictEqual(found2[0].editor, input);
            assert.strictEqual(found2[0].groupId, sideEditor?.group.id);
            assert.strictEqual(found2[1].editor, input);
            assert.strictEqual(found2[1].groupId, rootGroup.id);
        }
        {
            const found1 = service.findEditors(otherInput.resource);
            assert.strictEqual(found1.length, 1);
            assert.strictEqual(found1[0].editor, otherInput);
            assert.strictEqual(found1[0].groupId, rootGroup.id);
            const found2 = service.findEditors(otherInput);
            assert.strictEqual(found2.length, 1);
            assert.strictEqual(found2[0].editor, otherInput);
            assert.strictEqual(found2[0].groupId, rootGroup.id);
        }
        // Make sure we don't find non-opened editors
        {
            const found1 = service.findEditors(URI.parse('my://no-such-resource'));
            assert.strictEqual(found1.length, 0);
            const found2 = service.findEditors({
                resource: URI.parse('my://no-such-resource'),
                typeId: '',
                editorId: TEST_EDITOR_INPUT_ID,
            });
            assert.strictEqual(found2.length, 0);
        }
        // Check we don't find editors after closing them
        await rootGroup.closeAllEditors();
        await sideEditor?.group.closeAllEditors();
        {
            const found1 = service.findEditors(input.resource);
            assert.strictEqual(found1.length, 0);
            const found2 = service.findEditors(input);
            assert.strictEqual(found2.length, 0);
        }
    });
    test('findEditors (support side by side via options)', async () => {
        const [, service] = await createEditorService();
        const secondaryInput = createTestFileEditorInput(URI.parse('my://resource-findEditors-secondary'), TEST_EDITOR_INPUT_ID);
        const primaryInput = createTestFileEditorInput(URI.parse('my://resource-findEditors-primary'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = new SideBySideEditorInput(undefined, undefined, secondaryInput, primaryInput, service);
        await service.openEditor(sideBySideInput, { pinned: true });
        let foundEditors = service.findEditors(URI.parse('my://resource-findEditors-primary'));
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-primary'), {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-secondary'), {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-primary'), {
            supportSideBySide: SideBySideEditor.SECONDARY,
        });
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-secondary'), {
            supportSideBySide: SideBySideEditor.SECONDARY,
        });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-primary'), {
            supportSideBySide: SideBySideEditor.ANY,
        });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-secondary'), {
            supportSideBySide: SideBySideEditor.ANY,
        });
        assert.strictEqual(foundEditors.length, 1);
    });
    test('side by side editor is not matching all other editors (https://github.com/microsoft/vscode/issues/132859)', async () => {
        const [part, service] = await createEditorService();
        const rootGroup = part.activeGroup;
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = new SideBySideEditorInput(undefined, undefined, input, input, service);
        const otherSideBySideInput = new SideBySideEditorInput(undefined, undefined, otherInput, otherInput, service);
        await service.openEditor(sideBySideInput, undefined, SIDE_GROUP);
        part.activateGroup(rootGroup);
        await service.openEditor(otherSideBySideInput, { revealIfOpened: true, revealIfVisible: true });
        assert.strictEqual(rootGroup.count, 1);
    });
    test('onDidCloseEditor indicates proper context when moving editor across groups', async () => {
        const [part, service] = await createEditorService();
        const rootGroup = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.parse('my://resource-onDidCloseEditor1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource-onDidCloseEditor2'), TEST_EDITOR_INPUT_ID);
        await service.openEditor(input1, { pinned: true });
        await service.openEditor(input2, { pinned: true });
        const sidegroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        const events = [];
        disposables.add(service.onDidCloseEditor((e) => {
            events.push(e);
        }));
        rootGroup.moveEditor(input1, sidegroup);
        assert.strictEqual(events[0].context, EditorCloseContext.MOVE);
        await sidegroup.closeEditor(input1);
        assert.strictEqual(events[1].context, EditorCloseContext.UNKNOWN);
    });
    test('onDidCloseEditor indicates proper context when replacing an editor', async () => {
        const [part, service] = await createEditorService();
        const rootGroup = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.parse('my://resource-onDidCloseEditor1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource-onDidCloseEditor2'), TEST_EDITOR_INPUT_ID);
        await service.openEditor(input1, { pinned: true });
        const events = [];
        disposables.add(service.onDidCloseEditor((e) => {
            events.push(e);
        }));
        await rootGroup.replaceEditors([{ editor: input1, replacement: input2 }]);
        assert.strictEqual(events[0].context, EditorCloseContext.REPLACE);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9lZGl0b3JTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsa0JBQWtCLEVBTWxCLHdCQUF3QixFQUd4QixnQkFBZ0IsRUFDaEIsYUFBYSxHQUViLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixtQkFBbUIsRUFDbkIsa0JBQWtCLEVBQ2xCLG1CQUFtQixFQUVuQiwwQkFBMEIsRUFDMUIsNEJBQTRCLEVBQzVCLGdCQUFnQixFQUNoQixzQkFBc0IsRUFDdEIsa0JBQWtCLEVBQ2xCLDRCQUE0QixFQUM1QixpQkFBaUIsR0FDakIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDOUQsT0FBTyxFQUVOLG9CQUFvQixHQUdwQixNQUFNLHFDQUFxQyxDQUFBO0FBRTVDLE9BQU8sRUFDTixZQUFZLEVBRVosY0FBYyxFQUVkLFVBQVUsR0FDVixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1B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Q0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBRXpGLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRTdCLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUVsRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBRXpGLDBEQUEwRDtRQUMxRCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzFELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUVsRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQzFGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxD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QUUsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXJELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRS9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXRELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEIsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVyQixNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUU5RixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUNqQixJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQ25ELE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQzFCLENBQUE7UUFFRCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUU5RixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUNqQixJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQ25ELE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQzFCLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzFDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2pELFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQTtRQUU3RCxXQUFXLENBQUMsR0FBRyxDQUNkLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQzVDLHFDQUFxQyxFQUNyQyxFQUFFLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsRUFDMUYsRUFBRSxFQUNGO1lBQ0MsaUJBQWlCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQy9CLE1BQU0sRUFBRSx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLG9CQUFvQixDQUFDO2FBQ3hFLENBQUM7U0FDRixDQUNELENBQ0QsQ0FBQTtRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDbEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLCtCQUF1QixDQUFBO1FBRWpFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFN0IsTUFBTSxNQUFNLEdBQXlCO1lBQ3BDLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDBEQUEwRCxDQUFDO1lBQy9FLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7U0FDekIsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUF5QjtZQUNwQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQywyREFBMkQsQ0FBQztZQUNoRixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1NBQ3pCLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBeUI7WUFDcEMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkRBQTJELENBQUM7WUFDaEYsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtTQUN6QixDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQXlCO1lBQ3BDLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxDQUFDO1lBQ2hGLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7U0FDekIsQ0FBQTtRQUVELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXJELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRS9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXRELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEIsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVyQixNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUU3RixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUNqQixJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQ25ELE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQzFCLENBQUE7UUFFRCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUU3RixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUNqQixJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQ25ELE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQzFCLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzFDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtRQUMxQyxPQUFPLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDM0MsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUsZUFBZSxDQUFDLGNBQXVCO1FBQ3JELFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQTtRQUU3RCxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBRWhDLElBQUksbUJBQW1CLEdBQUcsQ0FBQyxDQUFBO1FBQzNCLElBQUksMkJBQTJCLEdBQUcsQ0FBQyxDQUFBO1FBQ25DLElBQUksdUJBQXVCLEdBQUcsQ0FBQyxDQUFBO1FBRS9CLElBQUksdUJBQXVCLEdBQXFDLFNBQVMsQ0FBQTtRQUN6RSxJQUFJLCtCQUErQixHQUFpRCxTQUFTLENBQUE7UUFDN0YsSUFBSSwyQkFBMkIsR0FBeUMsU0FBUyxDQUFBO1FBRWpGLFdBQVcsQ0FBQyxHQUFHLENBQ2QsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FDNUMsaUNBQWlDLEVBQ2pDLEVBQUUsRUFBRSxFQUFFLG9CQUFvQixFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLHdCQUF3QixDQUFDLFNBQVMsRUFBRSxFQUMxRixFQUFFLEVBQ0Y7WUFDQyxpQkFBaUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUM3QixtQkFBbUIsRUFBRSxDQUFBO2dCQUNyQix1QkFBdUIsR0FBRyxNQUFNLENBQUE7Z0JBRWhDLE9BQU8sRUFBRSxNQUFNLEVBQUUseUJBQXlCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLENBQUE7WUFDcEYsQ0FBQztZQUNELHlCQUF5QixFQUFFLENBQUMsY0FBYyxFQUFFLEVBQUU7Z0JBQzdDLDJCQUEyQixFQUFFLENBQUE7Z0JBQzdCLCtCQUErQixHQUFHLGNBQWMsQ0FBQTtnQkFFaEQsT0FBTztvQkFDTixNQUFNLEVBQUUseUJBQXlCLENBQ2hDLGNBQWMsQ0FBQyxRQUFRO3dCQUN0QixHQUFHLENBQUMsS0FBSyxDQUFDLGlDQUFpQywyQkFBMkIsRUFBRSxDQUFDLEVBQzFFLG9CQUFvQixDQUNwQjtpQkFDRCxDQUFBO1lBQ0YsQ0FBQztZQUNELHFCQUFxQixFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUU7Z0JBQ3JDLHVCQUF1QixFQUFFLENBQUE7Z0JBQ3pCLDJCQUEyQixHQUFHLFVBQVUsQ0FBQTtnQkFFeEMsT0FBTztvQkFDTixNQUFNLEVBQUUseUJBQXlCLENBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSx1QkFBdUIsRUFBRSxDQUFDLEVBQ2xELG9CQUFvQixDQUNwQjtpQkFDRCxDQUFBO1lBQ0YsQ0FBQztTQUNELENBQ0QsQ0FDRCxDQUFBO1FBRUQsS0FBSyxVQUFVLGNBQWM7WUFDNUIsbUJBQW1CLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZCLDJCQUEyQixHQUFHLENBQUMsQ0FBQTtZQUMvQix1QkFBdUIsR0FBRyxDQUFDLENBQUE7WUFFM0IsdUJBQXVCLEdBQUcsU0FBUyxDQUFBO1lBQ25DLCtCQUErQixHQUFHLFNBQVMsQ0FBQTtZQUMzQywyQkFBMkIsR0FBRyxTQUFTLENBQUE7WUFFdkMsTUFBTSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUV0RCxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUM3QixDQUFDO1FBRUQsS0FBSyxVQUFVLFVBQVUsQ0FDeEIsTUFBb0QsRUFDcEQsS0FBc0I7WUFFdEIsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsMEVBQTBFO2dCQUMxRSxrR0FBa0c7Z0JBQ2xHLGtCQUFrQjtnQkFDbEIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUNoRSxNQUFNLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQTtnQkFDekMsQ0FBQztnQkFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDeEQsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEIsQ0FBQztZQUVELElBQUksd0JBQXdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNoRSxDQUFDO1lBRUQsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN6QyxDQUFDO1FBRUQsVUFBVTtRQUNWLENBQUM7WUFDQSxnREFBZ0Q7WUFDaEQsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBeUI7b0JBQzNDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDO2lCQUN4RCxDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUM1QyxJQUFJLFdBQVcsR0FBRyxJQUFJLEVBQUUsS0FBSyxDQUFBO2dCQUU3QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxZQUFZLG1CQUFtQixDQUFDLENBQUE7Z0JBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBRXRGLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsYUFBYSxDQUFDLENBQUE7Z0JBQzFELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFFdkMsNENBQTRDO2dCQUM1QyxxQkFBcUI7Z0JBQ3JCLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUV6RCxpQ0FBaUM7Z0JBQ2pDLE1BQU0sd0JBQXdCLEdBQXlCO29CQUN0RCxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQztpQkFDakUsQ0FBQTtnQkFDRCxNQUFNLE9BQU8sQ0FBQyxjQUFjLENBQzNCO29CQUNDO3dCQUNDLE1BQU0sRUFBRSxXQUFXO3dCQUNuQixXQUFXLEVBQUUsd0JBQXdCO3FCQUNyQztpQkFDRCxFQUNELFNBQVMsQ0FDVCxDQUFBO2dCQUVELFdBQVcsR0FBRyxTQUFTLENBQUMsWUFBYSxDQUFBO2dCQUVyQyxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsWUFBWSxtQkFBbUIsQ0FBQyxDQUFBO2dCQUNyRCxNQUFNLENBQUMsV0FBVyxDQUNqQixXQUFXLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUNqQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQzVDLENBQUE7Z0JBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFFOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSx3QkFBd0IsQ0FBQyxDQUFBO2dCQUNyRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLE1BQU0sY0FBYyxFQUFFLENBQUE7WUFDdkIsQ0FBQztZQUVELDZEQUE2RDtZQUM3RCxDQUFDO2dCQUNBLE1BQU0sYUFBYSxHQUF5QjtvQkFDM0MsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUM7b0JBQ3hELE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSwwQkFBMEIsQ0FBQyxFQUFFLEVBQUU7aUJBQ3BELENBQUE7Z0JBQ0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBQzVDLE1BQU0sV0FBVyxHQUFHLElBQUksRUFBRSxLQUFLLENBQUE7Z0JBRS9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLFlBQVksZUFBZSxDQUFDLENBQUE7Z0JBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBRXRGLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLDRDQUE0QztnQkFDNUMscUJBQXFCO2dCQUNyQixNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFFekQsTUFBTSxjQUFjLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1lBRUQsZ0dBQWdHO1lBQ2hHLENBQUM7Z0JBQ0EsTUFBTSxhQUFhLEdBQXlCO29CQUMzQyxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQztvQkFDeEQsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSwwQkFBMEIsQ0FBQyxFQUFFLEVBQUU7aUJBQ3ZGLENBQUE7Z0JBQ0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBRTVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxZQUFZLGVBQWUsQ0FBQyxDQUFBO2dCQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFDckYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBRXpELE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLE1BQU0sY0FBYyxFQUFFLENBQUE7Z0JBQ3RCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9DLENBQUM7WUFFRCxnRUFBZ0U7WUFDaEUsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBeUI7b0JBQzNDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDO29CQUN4RCxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsMEJBQTBCLENBQUMsRUFBRSxFQUFFO2lCQUNwRCxDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUU1QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBWSxlQUFlLENBQUMsQ0FBQTtnQkFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBRXJGLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLE1BQU0sY0FBYyxFQUFFLENBQUE7WUFDdkIsQ0FBQztZQUVELDhFQUE4RTtZQUM5RSxDQUFDO2dCQUNBLE1BQU0sYUFBYSxHQUF5QjtvQkFDM0MsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUM7b0JBQ3hELE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRTtpQkFDM0MsQ0FBQTtnQkFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFFNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBRXJGLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsYUFBYSxDQUFDLENBQUE7Z0JBQzFELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFFdkMsTUFBTSxjQUFjLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1lBRUQsaUZBQWlGO1lBQ2pGLENBQUM7Z0JBQ0EsTUFBTSxhQUFhLEdBQXlCO29CQUMzQyxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQztvQkFDeEQsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFO2lCQUM5QyxDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUU1QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFBO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFDckYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBRXpELE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQ2hCLHVCQUFnRCxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDckUsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FDakMsQ0FBQTtnQkFDRCxNQUFNLENBQUMsV0FBVyxDQUNoQix1QkFBZ0QsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUN4RSxJQUFJLENBQ0osQ0FBQTtnQkFDRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLE1BQU0sY0FBYyxFQUFFLENBQUE7Z0JBQ3RCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9DLENBQUM7WUFFRCxpSEFBaUg7WUFDakgsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBeUI7b0JBQzNDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDO29CQUN4RCxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFO2lCQUM5RSxDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUU1QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFBO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFDckYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBRXpELE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQ2hCLHVCQUFnRCxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDckUsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FDakMsQ0FBQTtnQkFDRCxNQUFNLENBQUMsV0FBVyxDQUNoQix1QkFBZ0QsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUN4RSxJQUFJLENBQ0osQ0FBQTtnQkFDRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLE1BQU0sY0FBYyxFQUFFLENBQUE7Z0JBQ3RCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9DLENBQUM7WUFFRCxrREFBa0Q7WUFDbEQsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBeUI7b0JBQzNDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDO2lCQUN4RCxDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFFeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDaEUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUM3QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBRXRGLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsYUFBYSxDQUFDLENBQUE7Z0JBQzFELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFFdkMsTUFBTSxjQUFjLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1lBRUQsK0RBQStEO1lBQy9ELENBQUM7Z0JBQ0EsTUFBTSxhQUFhLEdBQXlCO29CQUMzQyxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQztvQkFDeEQsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLDBCQUEwQixDQUFDLEVBQUUsRUFBRTtpQkFDcEQsQ0FBQTtnQkFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBRXhELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2hFLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDN0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxZQUFZLGVBQWUsQ0FBQyxDQUFBO2dCQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFFckYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFFOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUE7Z0JBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFFdkMsTUFBTSxjQUFjLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQztRQUVELFFBQVE7UUFDUixDQUFDO1lBQ0EscUNBQXFDO1lBQ3JDLENBQUM7Z0JBQ0EsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsRUFDOUMsb0JBQW9CLENBQ3BCLENBQUE7Z0JBQ0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQTtnQkFDdEQsSUFBSSxVQUFVLEdBQUcsSUFBSSxFQUFFLEtBQUssQ0FBQTtnQkFFNUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsWUFBWSxtQkFBbUIsQ0FBQyxDQUFBO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO2dCQUVuRix3RUFBd0U7Z0JBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLDRDQUE0QztnQkFDNUMscUJBQXFCO2dCQUNyQixNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFFeEQsaUNBQWlDO2dCQUNqQyxNQUFNLHNCQUFzQixHQUFHLHlCQUF5QixDQUN2RCxHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLEVBQ3ZELG9CQUFvQixDQUNwQixDQUFBO2dCQUNELE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FDM0I7b0JBQ0M7d0JBQ0MsTUFBTSxFQUFFLFdBQVc7d0JBQ25CLFdBQVcsRUFBRSxzQkFBc0I7cUJBQ25DO2lCQUNELEVBQ0QsU0FBUyxDQUNULENBQUE7Z0JBRUQsVUFBVSxHQUFHLFNBQVMsQ0FBQyxZQUFhLENBQUE7Z0JBRXBDLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxZQUFZLG1CQUFtQixDQUFDLENBQUE7Z0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQzlCLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FDMUMsQ0FBQTtnQkFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLE1BQU0sY0FBYyxFQUFFLENBQUE7WUFDdkIsQ0FBQztZQUVELHFDQUFxQztZQUNyQyxDQUFDO2dCQUNBLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUM1QyxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEVBQzlDLG9CQUFvQixDQUNwQixDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUE7Z0JBQ3RELE1BQU0sVUFBVSxHQUFHLElBQUksRUFBRSxLQUFLLENBQUE7Z0JBRTlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFFbkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFFOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUE7Z0JBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFFdkMsNENBQTRDO2dCQUM1QyxxQkFBcUI7Z0JBQ3JCLE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUV6RCxNQUFNLGNBQWMsRUFBRSxDQUFBO1lBQ3ZCLENBQUM7WUFFRCxtRkFBbUY7WUFDbkYsQ0FBQztnQkFDQSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FDNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUM5QyxvQkFBb0IsQ0FDcEIsQ0FBQTtnQkFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQztvQkFDN0IsTUFBTSxFQUFFLFdBQVc7b0JBQ25CLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRTtpQkFDOUMsQ0FBQyxDQUFBO2dCQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUE7Z0JBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO2dCQUNuRixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFFekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFFOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUE7Z0JBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFFdkMsTUFBTSxjQUFjLEVBQUUsQ0FBQTtnQkFDdEIsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDL0MsQ0FBQztZQUVELHFEQUFxRDtZQUNyRCxDQUFDO2dCQUNBLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUM1QyxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEVBQzlDLG9CQUFvQixDQUNwQixDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDO29CQUM3QixNQUFNLEVBQUUsV0FBVztvQkFDbkIsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLDBCQUEwQixDQUFDLEVBQUUsRUFBRTtpQkFDcEQsQ0FBQyxDQUFBO2dCQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDMUMscUdBQXFHO2dCQUNyRyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBRW5GLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLE1BQU0sY0FBYyxFQUFFLENBQUE7WUFDdkIsQ0FBQztZQUVELG1FQUFtRTtZQUNuRSxDQUFDO2dCQUNBLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUM1QyxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEVBQzlDLG9CQUFvQixDQUNwQixDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDO29CQUM3QixNQUFNLEVBQUUsV0FBVztvQkFDbkIsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFO2lCQUMzQyxDQUFDLENBQUE7Z0JBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBRW5GLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLE1BQU0sY0FBYyxFQUFFLENBQUE7WUFDdkIsQ0FBQztZQUVELHNFQUFzRTtZQUN0RSxDQUFDO2dCQUNBLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUM1QyxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEVBQzlDLG9CQUFvQixDQUNwQixDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDO29CQUM3QixNQUFNLEVBQUUsV0FBVztvQkFDbkIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFO2lCQUM5QyxDQUFDLENBQUE7Z0JBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBQ25GLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUV6RCxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDbkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUE7Z0JBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2dCQUV2QyxNQUFNLGNBQWMsRUFBRSxDQUFBO2dCQUN0QixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvQyxDQUFDO1lBRUQsc0dBQXNHO1lBQ3RHLENBQUM7Z0JBQ0EsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsRUFDOUMsb0JBQW9CLENBQ3BCLENBQUE7Z0JBQ0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUM7b0JBQzdCLE1BQU0sRUFBRSxXQUFXO29CQUNuQixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFO2lCQUM5RSxDQUFDLENBQUE7Z0JBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBQ25GLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUV6RCxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDbkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUE7Z0JBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2dCQUV2QyxNQUFNLGNBQWMsRUFBRSxDQUFBO2dCQUN0QixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvQyxDQUFDO1lBRUQsdUNBQXVDO1lBQ3ZDLENBQUM7Z0JBQ0EsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsRUFDOUMsb0JBQW9CLENBQ3BCLENBQUE7Z0JBQ0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBRWxFLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2hFLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDN0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUE7Z0JBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO2dCQUVwRixNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDbkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUE7Z0JBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2dCQUV2QyxNQUFNLGNBQWMsRUFBRSxDQUFBO1lBQ3ZCLENBQUM7WUFFRCxrREFBa0Q7WUFDbEQsQ0FBQztnQkFDQSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FDNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUM5QyxvQkFBb0IsQ0FDcEIsQ0FBQTtnQkFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFFbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDaEUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUM3QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBRW5GLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLE1BQU0sY0FBYyxFQUFFLENBQUE7WUFDdkIsQ0FBQztRQUNGLENBQUM7UUFFRCxtQkFBbUI7UUFDbkIsQ0FBQztZQUNBLGdEQUFnRDtZQUNoRCxDQUFDO2dCQUNBLE1BQU0sYUFBYSxHQUFxQztvQkFDdkQsUUFBUSxFQUFFLFNBQVM7b0JBQ25CLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRTtpQkFDM0MsQ0FBQTtnQkFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFFNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBRTFELE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLCtCQUErQixFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUNsRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFFdkMsTUFBTSxjQUFjLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1lBRUQsa0RBQWtEO1lBQ2xELENBQUM7Z0JBQ0EsTUFBTSxhQUFhLEdBQXFDO29CQUN2RCxRQUFRLEVBQUUsU0FBUztvQkFDbkIsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFO2lCQUMzQyxDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFFeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDaEUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUM3QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBRTNELE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLCtCQUErQixFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUNsRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFFdkMsTUFBTSxjQUFjLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1lBRUQseUVBQXlFO1lBQ3pFLENBQUM7Z0JBQ0EsTUFBTSxhQUFhLEdBQXFDO29CQUN2RCxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDLElBQUksQ0FBQzt3QkFDdEUsTUFBTSxFQUFFLFVBQVU7cUJBQ2xCLENBQUM7aUJBQ0YsQ0FBQTtnQkFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDNUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxFQUFFLEtBQUssQ0FBQTtnQkFFL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsWUFBWSxtQkFBbUIsQ0FBQyxDQUFBO2dCQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO2dCQUUzRCxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsRUFBRSxhQUFhLENBQUMsQ0FBQTtnQkFDbEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLDRDQUE0QztnQkFDNUMscUJBQXFCO2dCQUNyQixNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFFekQsTUFBTSxjQUFjLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1lBRUQsaUZBQWlGO1lBQ2pGLENBQUM7Z0JBQ0EsTUFBTSxhQUFhLEdBQXFDO29CQUN2RCxRQUFRLEVBQUUsU0FBUztvQkFDbkIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRTtpQkFDOUUsQ0FBQTtnQkFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFFNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUV6RCxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsRUFBRSxhQUFhLENBQUMsQ0FBQTtnQkFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsK0JBQW9FLENBQUMsT0FBTztvQkFDNUUsRUFBRSxhQUFhLEVBQ2hCLElBQUksQ0FDSixDQUFBO2dCQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLCtCQUFvRSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQ3JGLElBQUksQ0FDSixDQUFBO2dCQUNELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2dCQUV2QyxNQUFNLGNBQWMsRUFBRSxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDO1FBRUQsZUFBZTtRQUNmLENBQUM7WUFDQSw0Q0FBNEM7WUFDNUMsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBNkI7b0JBQy9DLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLEVBQUU7b0JBQy9FLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLEVBQUU7b0JBQy9FLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRTtpQkFDM0MsQ0FBQTtnQkFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDNUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxFQUFFLEtBQUssQ0FBQTtnQkFFL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsWUFBWSxtQkFBbUIsQ0FBQyxDQUFBO2dCQUVyRCxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDbkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUE7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsYUFBYSxDQUFDLENBQUE7Z0JBRTlELE1BQU0sY0FBYyxFQUFFLENBQUE7WUFDdkIsQ0FBQztZQUVELDhDQUE4QztZQUM5QyxDQUFDO2dCQUNBLE1BQU0sYUFBYSxHQUE2QjtvQkFDL0MsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkNBQTZDLENBQUMsRUFBRTtvQkFDL0UsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkNBQTZDLENBQUMsRUFBRTtvQkFDL0UsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFO2lCQUMzQyxDQUFBO2dCQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFFeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDaEUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUM3QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFFckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFFOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUE7Z0JBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUU5RCxNQUFNLGNBQWMsRUFBRSxDQUFBO1lBQ3ZCLENBQUM7WUFFRCw2RUFBNkU7WUFDN0UsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBNkI7b0JBQy9DLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLEVBQUU7b0JBQy9FLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLEVBQUU7b0JBQy9FLE9BQU8sRUFBRTt3QkFDUixRQUFRLEVBQUUsb0JBQW9CO3dCQUM5QixNQUFNLEVBQUUsSUFBSTt3QkFDWixhQUFhLEVBQUUsSUFBSTtxQkFDbkI7aUJBQ0QsQ0FBQTtnQkFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFFNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxhQUFhLENBQUMsQ0FBQTtnQkFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsMkJBQWdFLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFDeEYsSUFBSSxDQUNKLENBQUE7Z0JBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsMkJBQWdFLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFDakYsSUFBSSxDQUNKLENBQUE7Z0JBRUQsTUFBTSxjQUFjLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQztRQUVELCtCQUErQjtRQUMvQixDQUFDO1lBQ0EsdUJBQXVCO1lBQ3ZCLENBQUM7Z0JBQ0EsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFDMUIsb0JBQW9CLENBQ3BCLENBQUE7Z0JBQ0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQTtnQkFFdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUUzQyxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDbkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUE7Z0JBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2dCQUV2QyxNQUFNLGNBQWMsRUFBRSxDQUFBO1lBQ3ZCLENBQUM7WUFFRCx5QkFBeUI7WUFDekIsQ0FBQztnQkFDQSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FDNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUMxQixvQkFBb0IsQ0FDcEIsQ0FBQTtnQkFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFFbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDaEUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUM3QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtnQkFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUU1QyxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDbkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUE7Z0JBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2dCQUV2QyxNQUFNLGNBQWMsRUFBRSxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDO1FBRUQsMkNBQTJDO1FBQzNDLENBQUM7WUFDQSx1QkFBdUI7WUFDdkIsQ0FBQztnQkFDQSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FDNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUMxQixvQkFBb0IsQ0FDcEIsQ0FBQTtnQkFDRCxXQUFXLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFBO2dCQUNuQyxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFBO2dCQUV0RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFBO2dCQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUE7Z0JBRTNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLE1BQU0sY0FBYyxFQUFFLENBQUE7WUFDdkIsQ0FBQztZQUVELHlCQUF5QjtZQUN6QixDQUFDO2dCQUNBLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUM1QyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQzFCLG9CQUFvQixDQUNwQixDQUFBO2dCQUNELFdBQVcsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUE7Z0JBQ25DLE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO2dCQUVsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNoRSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQzdDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFBO2dCQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUE7Z0JBRTVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBRXZDLE1BQU0sY0FBYyxFQUFFLENBQUE7WUFDdkIsQ0FBQztRQUNGLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixtQ0FBbUM7WUFDbkMsQ0FBQztnQkFDQSxNQUFNLGNBQWMsR0FBeUI7b0JBQzVDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxDQUFDO2lCQUN6RCxDQUFBO2dCQUNELE1BQU0sY0FBYyxHQUF5QjtvQkFDNUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUM7aUJBQ3pELENBQUE7Z0JBQ0QsTUFBTSxjQUFjLEdBQTJCO29CQUM5QyxNQUFNLEVBQUUseUJBQXlCLENBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUMsRUFDL0Msb0JBQW9CLENBQ3BCO2lCQUNELENBQUE7Z0JBQ0QsTUFBTSxjQUFjLEdBQTJCO29CQUM5QyxNQUFNLEVBQUUseUJBQXlCLENBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUMsRUFDL0Msb0JBQW9CLENBQ3BCO2lCQUNELENBQUE7Z0JBQ0QsTUFBTSxjQUFjLEdBQXlCO29CQUM1QyxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQztpQkFDekQsQ0FBQTtnQkFDRCxNQUFNLElBQUksR0FBRyxDQUNaLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FBQztvQkFDekIsY0FBYztvQkFDZCxjQUFjO29CQUNkLGNBQWM7b0JBQ2QsY0FBYztvQkFDZCxjQUFjO2lCQUNkLENBQUMsQ0FDRixDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUVKLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFFeEMsZ0ZBQWdGO2dCQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDLENBQUE7Z0JBQ2xDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFFdkMsTUFBTSxjQUFjLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQztRQUVELHlCQUF5QjtRQUN6QixDQUFDO1lBQ0EsbURBQW1EO1lBQ25ELENBQUM7Z0JBQ0EsTUFBTSxjQUFjLEdBQXlCO29CQUM1QyxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7b0JBQzVCLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtpQkFDaEQsQ0FBQTtnQkFDRCxNQUFNLGNBQWMsR0FBeUI7b0JBQzVDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztvQkFDNUIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtpQkFDekIsQ0FBQTtnQkFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDakQsTUFBTSxRQUFRLEdBQUcsTUFBTSxVQUFVLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFBO2dCQUU3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU1QyxRQUFRLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFFekQsTUFBTSxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBRWhDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTVDLE1BQU0sY0FBYyxFQUFFLENBQUE7WUFDdkIsQ0FBQztZQUVELGtEQUFrRDtZQUNsRCxDQUFDO2dCQUNBLE1BQU0sY0FBYyxHQUF5QjtvQkFDNUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO29CQUM1QixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7aUJBQy9DLENBQUE7Z0JBQ0QsTUFBTSxjQUFjLEdBQXlCO29CQUM1QyxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7b0JBQzVCLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7aUJBQ3pCLENBQUE7Z0JBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBQ2pELE1BQU0sVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUNoQyxNQUFNLENBQUMsV0FBVyxDQUNqQixRQUFRLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQ2xELGNBQWMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ2xDLENBQUE7Z0JBQ0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxVQUFVLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFBO2dCQUU3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUU1QyxRQUFRLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFFekQsTUFBTSxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBRWhDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTVDLE1BQU0sY0FBYyxFQUFFLENBQUE7WUFDdkIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hFLFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsR0FBRyxNQUFNLG1CQUFtQixFQUFFLENBQUE7UUFFekQsV0FBVyxDQUFDLEdBQUcsQ0FDZCxRQUFRLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUM1QyxpQ0FBaUMsRUFDakMsRUFBRSxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsd0JBQXdCLENBQUMsU0FBUyxFQUFFLEVBQzFGLEVBQUUsRUFDRjtZQUNDLGlCQUFpQixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMvQixNQUFNLEVBQUUseUJBQXlCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxvQkFBb0IsQ0FBQzthQUN4RSxDQUFDO1NBQ0YsQ0FDRCxDQUNELENBQUE7UUFFRCxlQUFlO1FBQ2YsSUFBSSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUNsQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FDdkYsQ0FBQTtRQUNELElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQzlCLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxFQUN2RixFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUNyQyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXRELE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUVsQyw2Q0FBNkM7UUFDN0MsSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQy9FLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUM7WUFDL0IsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUM7WUFDMUMsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFO1NBQzlDLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxZQUFZLGtCQUFrQixDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXRELDBDQUEwQztRQUMxQyxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDN0YsSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQztZQUMvQixRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQztZQUN4RCxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUU7U0FDOUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3ZELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BELE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFBO1FBRW5ELE1BQU0sS0FBSyxHQUFHLHlCQUF5QixDQUN0QyxHQUFHLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLEVBQ3RDLG9CQUFvQixDQUNwQixDQUFBO1FBQ0QsTUFBTSxVQUFVLEdBQUcseUJBQXlCLENBQzNDLEdBQUcsQ0FBQyxLQUFLLENBQUMsNEJBQTRCLENBQUMsRUFDdkMsb0JBQW9CLENBQ3BCLENBQUE7UUFDRCxNQUFNLGVBQWUsR0FBRyxJQUFJLHFCQUFxQixDQUFDLFlBQVksRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUUvRixNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxRQUFRLENBQUM7WUFDaEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7U0FDeEIsQ0FBQyxFQUNGLEtBQUssQ0FDTCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsT0FBTyxDQUFDLFFBQVEsQ0FBQztZQUNoQixRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7WUFDN0IsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNO1lBQ3pCLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUTtTQUM3QixDQUFDLEVBQ0YsSUFBSSxDQUNKLENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxRQUFRLENBQUM7WUFDaEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7U0FDeEIsQ0FBQyxFQUNGLElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsT0FBTyxDQUFDLFFBQVEsQ0FBQztZQUNoQixRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7WUFDN0IsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNO1lBQ3pCLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUTtTQUM3QixDQUFDLEVBQ0YsSUFBSSxDQUNKLENBQUE7UUFFRCxNQUFNLE9BQU8sRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUNqQixPQUFPLENBQUMsUUFBUSxDQUFDO1lBQ2hCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtZQUN4QixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07WUFDcEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1NBQ3hCLENBQUMsRUFDRixLQUFLLENBQ0wsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxRQUFRLENBQUM7WUFDaEIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRO1lBQzdCLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTTtZQUN6QixRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7U0FDN0IsQ0FBQyxFQUNGLElBQUksQ0FDSixDQUFBO1FBRUQsTUFBTSxPQUFPLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUVqRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxRQUFRLENBQUM7WUFDaEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7U0FDeEIsQ0FBQyxFQUNGLEtBQUssQ0FDTCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsT0FBTyxDQUFDLFFBQVEsQ0FBQztZQUNoQixRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7WUFDN0IsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNO1lBQ3pCLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUTtTQUM3QixDQUFDLEVBQ0YsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRCxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQTtRQUVuRCxNQUFNLEtBQUssR0FBRyx5QkFBeUIsQ0FDdEMsR0FBRyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxFQUN0QyxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sVUFBVSxHQUFHLHlCQUF5QixDQUMzQyxHQUFHLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLEVBQ3ZDLG9CQUFvQixDQUNwQixDQUFBO1FBQ0QsTUFBTSxZQUFZLEdBQUcseUJBQXlCLENBQzdDLEdBQUcsQ0FBQyxLQUFLLENBQUMsNEJBQTRCLENBQUMsRUFDdkMsb0JBQW9CLENBQ3BCLENBQUE7UUFFRCxlQUFlO1FBQ2YsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFN0Msa0JBQWtCO1FBQ2xCLE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDOUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDdkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdURBQXVELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEUsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFBO1FBRTdELE1BQU0sTUFBTSxHQUFHLHlCQUF5QixDQUN2QyxHQUFHLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLEVBQ3ZDLG9CQUFvQixDQUNwQixDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMsNEJBQTRCLENBQUMsRUFDdkMsb0JBQW9CLENBQ3BCLENBQUE7UUFFRCxNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxFQUN2QyxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHlCQUF5QixDQUN2QyxHQUFHLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLEVBQ3ZDLG9CQUFvQixDQUNwQixDQUFBO1FBQ0QsTUFBTSxlQUFlLEdBQUcsSUFBSSxxQkFBcUIsQ0FDaEQsY0FBYyxFQUNkLFNBQVMsRUFDVCxNQUFNLEVBQ04sTUFBTSxFQUNOLE9BQU8sQ0FDUCxDQUFBO1FBRUQsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLDRCQUE0QixDQUFDLHNCQUFzQixDQUFBO1FBRS9FLElBQUksQ0FBQztZQUNKLGdCQUFnQjtZQUNoQixJQUFJLGVBQWUsR0FBVSxFQUFFLENBQUE7WUFDL0IsUUFBUSxDQUFDLDRCQUE0QixDQUFDLHNCQUFzQixHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDN0UsZUFBZSxHQUFHLElBQUksQ0FBQTtnQkFDdEIsZ0RBQXVDO1lBQ3hDLENBQUMsQ0FBQTtZQUVELE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FDeEIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUNyRSxTQUFTLEVBQ1QsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQ3ZCLENBQUE7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM3QyxNQUFNLENBQUMsV0FBVyxDQUNqQixlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUM1RSxJQUFJLENBQ0osQ0FBQTtZQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQzVFLElBQUksQ0FDSixDQUFBO1lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsRUFDNUUsSUFBSSxDQUNKLENBQUE7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUM1RSxJQUFJLENBQ0osQ0FBQTtZQUVELDRCQUE0QjtZQUM1QixRQUFRLENBQUMsNEJBQTRCLENBQUMsc0JBQXNCLEdBQUcsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLGtEQUNwQyxDQUFBO1lBRTFDLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FDeEIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUNyRSxTQUFTLEVBQ1QsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQ3ZCLENBQUE7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTdDLGVBQWU7WUFDZixRQUFRLENBQUMsNEJBQTRCLENBQUMsc0JBQXNCLEdBQUcsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLHVDQUMvQyxDQUFBO1lBRS9CLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FDeEIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUNyRSxTQUFTLEVBQ1QsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQ3ZCLENBQUE7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlDLENBQUM7Z0JBQVMsQ0FBQztZQUNWLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBQyxzQkFBc0IsR0FBRyxVQUFVLENBQUE7UUFDMUUsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQTtRQUU3RCxNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxFQUN2QyxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHlCQUF5QixDQUN2QyxHQUFHLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLEVBQ3ZDLG9CQUFvQixDQUNwQixDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMsNEJBQTRCLENBQUMsRUFDdkMsb0JBQW9CLENBQ3BCLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxFQUN2QyxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sZUFBZSxHQUFHLElBQUkscUJBQXFCLENBQ2hELGNBQWMsRUFDZCxTQUFTLEVBQ1QsTUFBTSxFQUNOLE1BQU0sRUFDTixPQUFPLENBQ1AsQ0FBQTtRQUVELE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBQyxzQkFBc0IsQ0FBQTtRQUUvRSxJQUFJLENBQUM7WUFDSixnQkFBZ0I7WUFDaEIsUUFBUSxDQUFDLDRCQUE0QixDQUFDLHNCQUFzQixHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSx5Q0FDN0MsQ0FBQTtZQUVqQyxNQUFNLE9BQU8sQ0FBQyxXQUFXLENBQUM7Z0JBQ3pCLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRTtnQkFDbEIsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFO2dCQUNsQixFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUU7YUFDM0IsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM5QyxDQUFDO2dCQUFTLENBQUM7WUFDVixRQUFRLENBQUMsNEJBQTRCLENBQUMsc0JBQXNCLEdBQUcsVUFBVSxDQUFBO1FBQzFFLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrRkFBa0YsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRyxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFBO1FBRXpELE1BQU0sS0FBSyxHQUFHLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFBO1FBQzVELE1BQU0sVUFBVSxHQUE2QjtZQUM1QyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFO1lBQy9ELFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLEVBQUU7U0FDL0QsQ0FBQTtRQUVELE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBQyxzQkFBc0IsQ0FBQTtRQUUvRSxJQUFJLENBQUM7WUFDSixJQUFJLGVBQWUsR0FBVSxFQUFFLENBQUE7WUFDL0IsUUFBUSxDQUFDLDRCQUE0QixDQUFDLHNCQUFzQixHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDN0UsZUFBZSxHQUFHLElBQUksQ0FBQTtnQkFDdEIsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDeEIsQ0FBQyxDQUFBO1lBRUQsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM3QyxNQUFNLENBQUMsV0FBVyxDQUNqQixlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUMzRSxJQUFJLENBQ0osQ0FBQTtZQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUMxRixJQUFJLENBQ0osQ0FBQTtZQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUMxRixJQUFJLENBQ0osQ0FBQTtRQUNGLENBQUM7Z0JBQVMsQ0FBQztZQUNWLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBQyxzQkFBc0IsR0FBRyxVQUFVLENBQUE7UUFDMUUsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlFQUFpRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xGLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFBO1FBRW5ELE1BQU0sS0FBSyxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBRWhHLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDbEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLCtCQUF1QixDQUFBO1FBRWpFLGFBQWE7UUFDYixNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDakQsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUU3RCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVyQyxjQUFjO1FBQ2QsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTdDLE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM3QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQTtRQUVuRCxNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxFQUNwQyxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHlCQUF5QixDQUN2QyxHQUFHLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLEVBQ3BDLG9CQUFvQixDQUNwQixDQUFBO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUVsQyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzdELElBQUksTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUVoRyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVsRCx3REFBd0Q7UUFDeEQsTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUM1RixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNuRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMxQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQTtRQUVuRCxNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxFQUNwQyxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHlCQUF5QixDQUN2QyxHQUFHLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLEVBQ3BDLG9CQUFvQixDQUNwQixDQUFBO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUVsQyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzdELElBQUksTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FDcEMsTUFBTSxFQUNOLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsRUFDNUUsVUFBVSxDQUNWLENBQUE7UUFDRCxNQUFNLFNBQVMsR0FBRyxNQUFNLEVBQUUsS0FBSyxDQUFBO1FBRS9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUUvQyxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUNoQyxNQUFNLEVBQ04sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxFQUM1RSxTQUFTLENBQ1QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUUvQyxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUNoQyxNQUFNLEVBQ04sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxFQUM1RSxTQUFTLENBQ1QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUUvQyxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUNoQyxNQUFNLEVBQ04sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsRUFDdkQsU0FBUyxDQUNULENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFL0MsTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FDaEMsTUFBTSxFQUNOLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEVBQ3ZELFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRS9DLElBQUksQ0FBQyxhQUFhLGtDQUEwQixDQUFBO1FBQzVDLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQ2hDLE1BQU0sRUFDTixFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEVBQzNFLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ2hELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVFQUF1RSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hGLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFBO1FBRW5ELE1BQU0sTUFBTSxHQUFHLHlCQUF5QixDQUN2QyxHQUFHLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLEVBQ3BDLG9CQUFvQixDQUNwQixDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUMsRUFDcEMsb0JBQW9CLENBQ3BCLENBQUE7UUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBRWxDLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDN0QsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUU3RCxNQUFNLFNBQVMsR0FBRyxDQUFDLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUE7UUFDekYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRTNDLElBQUksQ0FBQyxhQUFhLG1DQUEyQixJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFOUQsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUUvQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscURBQXFELEVBQUUsS0FBSztRQUNoRSxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQTtRQUVuRCxJQUFJLEtBQUssR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUM5RixJQUFJLFVBQVUsR0FBRyx5QkFBeUIsQ0FDekMsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUNsQyxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUVELElBQUksNEJBQTRCLEdBQUcsS0FBSyxDQUFBO1FBQ3hDLE1BQU0sMEJBQTBCLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUN2RSw0QkFBNEIsR0FBRyxJQUFJLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLDZCQUE2QixHQUFHLEtBQUssQ0FBQTtRQUN6QyxNQUFNLDJCQUEyQixHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUU7WUFDMUUsNkJBQTZCLEdBQUcsSUFBSSxDQUFBO1FBQ3JDLENBQUMsQ0FBQyxDQUFBO1FBRUYsU0FBUyw4QkFBOEIsQ0FBQyxRQUFpQjtZQUN4RCxNQUFNLENBQUMsV0FBVyxDQUNqQiw0QkFBNEIsRUFDNUIsUUFBUSxFQUNSLDhDQUE4Qyw0QkFBNEIsY0FBYyxRQUFRLEdBQUcsQ0FDbkcsQ0FBQTtZQUNELDRCQUE0QixHQUFHLEtBQUssQ0FBQTtRQUNyQyxDQUFDO1FBRUQsU0FBUyxnQ0FBZ0MsQ0FBQyxRQUFpQjtZQUMxRCxNQUFNLENBQUMsV0FBVyxDQUNqQiw2QkFBNkIsRUFDN0IsUUFBUSxFQUNSLGdEQUFnRCw2QkFBNkIsY0FBYyxRQUFRLEdBQUcsQ0FDdEcsQ0FBQTtZQUNELDZCQUE2QixHQUFHLEtBQUssQ0FBQTtRQUN0QyxDQUFDO1FBRUQsS0FBSyxVQUFVLCtCQUErQixDQUM3QyxLQUFtQixFQUNuQixLQUFrQjtZQUVsQixNQUFNLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDOUIsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQywrRUFBK0U7UUFDakcsQ0FBQztRQUVELHlDQUF5QztRQUN6QyxJQUFJLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDOUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLEtBQU0sQ0FBQTtRQUM1Qiw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV0QyxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3hDLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXZDLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0MsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdEMsTUFBTSwrQkFBK0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDeEQsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdEMsTUFBTSwrQkFBK0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkQsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdEMsd0VBQXdFO1FBQ3hFLEtBQUssR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUMxRixVQUFVLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDaEcsTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN4Qyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV0QyxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQy9ELDhCQUE4QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXZDLE1BQU0sK0JBQStCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRW5ELHFFQUFxRTtRQUNyRSxLQUFLLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDMUYsVUFBVSxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDMUQsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdEMsTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNqRSw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNyQyxnQ0FBZ0MsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV2QyxNQUFNLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUM3Qiw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV0Qyw4RUFBOEU7UUFDOUUsS0FBSyxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFGLFVBQVUsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUNoRyxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzFELDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXRDLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDakUsOEJBQThCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDckMsZ0NBQWdDLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFdkMsTUFBTSwrQkFBK0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDeEQsOEJBQThCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDckMsZ0NBQWdDLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFdkMsTUFBTSxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDN0IsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdEMsa0VBQWtFO1FBQ2xFLEtBQUssR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUMxRixVQUFVLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDaEcsTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMxRCw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV0QyxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLCtCQUF1QixDQUFBO1FBQ3RFLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXZDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNsQiw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxnQ0FBZ0MsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV2QyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzVCLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXZDLE1BQU0sS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzdCLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXRDLHdFQUF3RTtRQUN4RSxLQUFLLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDMUYsVUFBVSxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDMUQsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdEMsVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsK0JBQXVCLENBQUE7UUFDbEUsOEJBQThCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDckMsZ0NBQWdDLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFdkMsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3ZDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXRDLE1BQU0sK0JBQStCLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzdELDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXRDLE1BQU0sS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzdCLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXRDLHlEQUF5RDtRQUN6RCxLQUFLLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDMUYsVUFBVSxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDMUQsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdEMsVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsK0JBQXVCLENBQUE7UUFDbEUsOEJBQThCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDckMsZ0NBQWdDLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFdkMsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3ZDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXRDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNiLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXZDLE1BQU0sK0JBQStCLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzdELDhCQUE4QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXRDLE1BQU0sS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzdCLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXRDLHNEQUFzRDtRQUN0RCxLQUFLLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDMUYsVUFBVSxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDMUQsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdEMsTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMvRCw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV0QyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNqRCw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNyQyxnQ0FBZ0MsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV2QyxNQUFNLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUM3Qiw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV0Qyx5RUFBeUU7UUFDekUsS0FBSyxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFGLFVBQVUsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUNoRyxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzFELDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXRDLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLCtCQUF1QixDQUFBO1FBQ2xFLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXZDLE1BQU0sVUFBVSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN2Qyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV0QyxNQUFNLCtCQUErQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNuRCw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNyQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV0QyxVQUFVO1FBQ1YsMEJBQTBCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDcEMsMkJBQTJCLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSztRQUNqQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQTtRQUNuRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBRWxDLElBQUksS0FBSyxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQzlGLElBQUksVUFBVSxHQUFHLHlCQUF5QixDQUN6QyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQ2xDLG9CQUFvQixDQUNwQixDQUFBO1FBRUQsSUFBSSx5QkFBeUIsR0FBRyxDQUFDLENBQUE7UUFDakMsS0FBSyxVQUFVLHdCQUF3QixDQUFDLEVBQTBCLEVBQUUsUUFBZ0I7WUFDbkYsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUNyRCxNQUFNLEVBQUUsRUFBRSxDQUFBO1lBQ1YsTUFBTSxDQUFDLENBQUE7WUFDUCx5QkFBeUIsRUFBRSxDQUFBO1lBRTNCLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDeEQsQ0FBQztRQUVELE9BQU87UUFDUCxNQUFNLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFcEYsZUFBZTtRQUNmLE1BQU0sd0JBQXdCLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV6RixtQkFBbUI7UUFDbkIsTUFBTSx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJFLGlCQUFpQjtRQUNqQixNQUFNLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUUsS0FBSyxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFGLFVBQVUsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUVoRyxlQUFlO1FBQ2YsTUFBTSx3QkFBd0IsQ0FDN0IsR0FBRyxFQUFFLENBQ0osT0FBTyxDQUFDLFdBQVcsQ0FBQztZQUNuQixFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQzVDLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7U0FDakQsQ0FBQyxFQUNILENBQUMsQ0FDRCxDQUFBO1FBRUQsdUJBQXVCO1FBQ3ZCLE1BQU0sd0JBQXdCLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV2RSx5QkFBeUI7UUFDekIsTUFBTSx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFOUYsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVywrQkFBdUIsQ0FBQTtRQUN4RSxNQUFNLHdCQUF3QixDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdEYsYUFBYTtRQUNiLE1BQU0sd0JBQXdCLENBQzdCLEtBQUssSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsU0FBUyw4QkFBc0IsRUFDdEUsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpRUFBaUUsRUFBRSxLQUFLO1FBQzVFLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQTtRQUUvQyxNQUFNLEtBQUssR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUVoRyxJQUFJLHdCQUF3QixHQUFHLENBQUMsQ0FBQTtRQUNoQyxNQUFNLDBCQUEwQixHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7WUFDdkUsd0JBQXdCLEVBQUUsQ0FBQTtRQUMzQixDQUFDLENBQUMsQ0FBQTtRQUVGLFNBQVMsOEJBQThCLENBQUMsUUFBZ0I7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsd0JBQXdCLEVBQ3hCLFFBQVEsRUFDUiw4Q0FBOEMsd0JBQXdCLGNBQWMsUUFBUSxHQUFHLENBQy9GLENBQUE7WUFDRCx3QkFBd0IsR0FBRyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNqRCw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVqQyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRTdELHFFQUFxRTtRQUNyRSxtRUFBbUU7UUFDbkUsb0VBQW9FO1FBQ3BFLG9FQUFvRTtRQUNwRSxxRUFBcUU7UUFDckUsdUVBQXVFO1FBQ3ZFLHNDQUFzQztRQUN0Qyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVqQyxVQUFVO1FBQ1YsMEJBQTBCLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDckMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0RBQWdELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakUsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFBO1FBRS9DLHNCQUFzQjtRQUN0QixNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUVoRSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUN6RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO0lBQzlFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEtBQUs7UUFDdkQsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFBO1FBRS9DLE1BQU0sS0FBSyxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sVUFBVSxHQUFHLHlCQUF5QixDQUMzQyxHQUFHLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLEVBQ3BDLG9CQUFvQixDQUNwQixDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFakIsTUFBTSxXQUFXLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUN4QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpREFBaUQsRUFBRSxLQUFLO1FBQzVELE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQTtRQUUvQyxNQUFNLFlBQVksR0FBRyx5QkFBeUIsQ0FDN0MsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUNsQyxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUNELFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUU1QixNQUFNLGFBQWEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLFlBQVksc0JBQXNCLENBQUMsQ0FBQTtJQUMzRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtREFBbUQsRUFBRSxLQUFLO1FBQzlELE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQTtRQUUvQyxNQUFNLEtBQUssR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUNoRyxNQUFNLFlBQVksR0FBRyx5QkFBeUIsQ0FDN0MsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUNsQyxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUVELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNqRCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFMUQsWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQzVCLE1BQU0sYUFBYSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsRUFBRSxDQUFDLGFBQWEsWUFBWSxzQkFBc0IsQ0FBQyxDQUFBO0lBQzNELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEtBQUs7UUFDckMsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxNQUFNLG1CQUFtQixFQUFFLENBQUE7UUFFbkQsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDM0YsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDbkIsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDM0YsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDbkIsTUFBTSxVQUFVLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDL0YsVUFBVSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFFdkIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUVsQyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDbEQsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFbEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUE7UUFDdkIsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUE7UUFDekIsTUFBTSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFFMUIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDbkIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDbkIsVUFBVSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFFdkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDNUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFM0MsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUE7UUFDdkIsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUE7UUFDekIsTUFBTSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFFMUIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDbkIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDbkIsVUFBVSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFFdkIsTUFBTSxTQUFTLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTVDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFBO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBRTFCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ25CLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ25CLFVBQVUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBRXZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUE7UUFDdkIsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUE7UUFDekIsTUFBTSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFDMUIsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUE7UUFDdkIsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUE7UUFDekIsTUFBTSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFFMUIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDbkIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDbkIsVUFBVSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFFdkIsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUUzQyx3Q0FBd0M7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxXQUFX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QUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFN0MsZUFBZTtRQUNmLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTdDLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTdDLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMvRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTdDLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0IsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxNQUFNLG1CQUFt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QU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3BELENBQUM7UUFDRCxDQUFDO1lBQ0EsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRW5ELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3BELENBQUM7UUFFRCw2Q0FBNkM7UUFDN0MsQ0FBQztZQUNBLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FB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
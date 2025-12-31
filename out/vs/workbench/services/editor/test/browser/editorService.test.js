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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci90ZXN0L2Jyb3dzZXIvZWRpdG9yU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLGtCQUFrQixFQU1sQix3QkFBd0IsRUFHeEIsZ0JBQWdCLEVBQ2hCLGFBQWEsR0FFYixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLGtCQUFrQixFQUNsQixtQkFBbUIsRUFFbkIsMEJBQTBCLEVBQzFCLDRCQUE0QixFQUM1QixnQkFBZ0IsRUFDaEIsc0JBQXNCLEVBQ3RCLGtCQUFrQixFQUNsQiw0QkFBNEIsRUFDNUIsaUJBQWlCLEdBQ2pCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzlELE9BQU8sRUFFTixvQkFBb0IsR0FHcEIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1QyxPQUFPLEVBQ04sWUFBWSxFQUVaLGNBQWMsRUFFZCxVQUFVLEdBQ1YsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQzlGLE9B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dEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXpDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFBO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFBO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBRTFCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ25CLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ25CLFVBQVUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBRXZCLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRXZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFM0Msd0NBQXdDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lB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LENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sVUFBVSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFaEYsNENBQTRDO1FBQzVDLENBQUM7WUFDQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRW5ELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNwRCxDQUFDO1FBQ0QsQ0FBQztZQUNBLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUVuRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNwRCxDQUFDO1FBRUQsNkNBQTZDO1FBQzdDLENBQUM7WUFDQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxL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
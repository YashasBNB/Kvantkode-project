/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DeferredPromise } from '../../../base/common/async.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { isCI } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { WorkbenchContributionsRegistry } from '../../common/contributions.js';
import { EditorService } from '../../services/editor/browser/editorService.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService, SIDE_GROUP } from '../../services/editor/common/editorService.js';
import { TestFileEditorInput, TestServiceAccessor, TestSingletonFileEditorInput, createEditorPart, registerTestEditor, workbenchInstantiationService, } from './workbenchTestServices.js';
suite('Contributions', () => {
    const disposables = new DisposableStore();
    let aCreated;
    let aCreatedPromise;
    let bCreated;
    let bCreatedPromise;
    const TEST_EDITOR_ID = 'MyTestEditorForContributions';
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForContributions';
    async function createEditorService(instantiationService = workbenchInstantiationService(undefined, disposables)) {
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        return [part, editorService];
    }
    setup(() => {
        aCreated = false;
        aCreatedPromise = new DeferredPromise();
        bCreated = false;
        bCreatedPromise = new DeferredPromise();
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput), new SyncDescriptor(TestSingletonFileEditorInput)], TEST_EDITOR_INPUT_ID));
    });
    teardown(async () => {
        disposables.clear();
    });
    class TestContributionA {
        constructor() {
            aCreated = true;
            aCreatedPromise.complete();
        }
    }
    class TestContributionB {
        constructor() {
            bCreated = true;
            bCreatedPromise.complete();
        }
    }
    class TestContributionError {
        constructor() {
            throw new Error();
        }
    }
    test('getWorkbenchContribution() - with lazy contributions', () => {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        assert.throws(() => registry.getWorkbenchContribution('a'));
        registry.registerWorkbenchContribution2('a', TestContributionA, { lazy: true });
        assert.throws(() => registry.getWorkbenchContribution('a'));
        registry.registerWorkbenchContribution2('b', TestContributionB, { lazy: true });
        registry.registerWorkbenchContribution2('c', TestContributionError, { lazy: true });
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        registry.start(instantiationService);
        const instanceA = registry.getWorkbenchContribution('a');
        assert.ok(instanceA instanceof TestContributionA);
        assert.ok(aCreated);
        assert.strictEqual(instanceA, registry.getWorkbenchContribution('a'));
        const instanceB = registry.getWorkbenchContribution('b');
        assert.ok(instanceB instanceof TestContributionB);
        assert.throws(() => registry.getWorkbenchContribution('c'));
    });
    test('getWorkbenchContribution() - with non-lazy contributions', async () => {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.lifecycleService.usePhases = true;
        registry.start(instantiationService);
        assert.throws(() => registry.getWorkbenchContribution('a'));
        registry.registerWorkbenchContribution2('a', TestContributionA, 2 /* WorkbenchPhase.BlockRestore */);
        const instanceA = registry.getWorkbenchContribution('a');
        assert.ok(instanceA instanceof TestContributionA);
        assert.ok(aCreated);
        accessor.lifecycleService.phase = 2 /* LifecyclePhase.Ready */;
        await aCreatedPromise.p;
        assert.strictEqual(instanceA, registry.getWorkbenchContribution('a'));
    });
    test('lifecycle phase instantiation works when phase changes', async () => {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        registry.start(instantiationService);
        registry.registerWorkbenchContribution2('a', TestContributionA, 2 /* WorkbenchPhase.BlockRestore */);
        assert.ok(!aCreated);
        accessor.lifecycleService.phase = 2 /* LifecyclePhase.Ready */;
        await aCreatedPromise.p;
        assert.ok(aCreated);
    });
    test('lifecycle phase instantiation works when phase was already met', async () => {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.lifecycleService.usePhases = true;
        accessor.lifecycleService.phase = 3 /* LifecyclePhase.Restored */;
        registry.registerWorkbenchContribution2('a', TestContributionA, 2 /* WorkbenchPhase.BlockRestore */);
        registry.start(instantiationService);
        await aCreatedPromise.p;
        assert.ok(aCreated);
    });
    (isCI ? test.skip /* runWhenIdle seems flaky in CI on Windows */ : test)('lifecycle phase instantiation works for late phases', async () => {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.lifecycleService.usePhases = true;
        registry.start(instantiationService);
        registry.registerWorkbenchContribution2('a', TestContributionA, 3 /* WorkbenchPhase.AfterRestored */);
        registry.registerWorkbenchContribution2('b', TestContributionB, 4 /* WorkbenchPhase.Eventually */);
        assert.ok(!aCreated);
        assert.ok(!bCreated);
        accessor.lifecycleService.phase = 1 /* LifecyclePhase.Starting */;
        accessor.lifecycleService.phase = 2 /* LifecyclePhase.Ready */;
        accessor.lifecycleService.phase = 3 /* LifecyclePhase.Restored */;
        await aCreatedPromise.p;
        assert.ok(aCreated);
        accessor.lifecycleService.phase = 4 /* LifecyclePhase.Eventually */;
        await bCreatedPromise.p;
        assert.ok(bCreated);
    });
    test('contribution on editor - editor exists before start', async function () {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const [, editorService] = await createEditorService(instantiationService);
        const input = disposables.add(new TestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID));
        await editorService.openEditor(input, { pinned: true });
        registry.registerWorkbenchContribution2('a', TestContributionA, {
            editorTypeId: TEST_EDITOR_ID,
        });
        registry.start(instantiationService.createChild(new ServiceCollection([IEditorService, editorService])));
        await aCreatedPromise.p;
        assert.ok(aCreated);
        registry.registerWorkbenchContribution2('b', TestContributionB, {
            editorTypeId: TEST_EDITOR_ID,
        });
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('my://resource-basics2'), TEST_EDITOR_INPUT_ID));
        await editorService.openEditor(input2, { pinned: true }, SIDE_GROUP);
        await bCreatedPromise.p;
        assert.ok(bCreated);
    });
    test('contribution on editor - editor does not exist before start', async function () {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const [, editorService] = await createEditorService(instantiationService);
        const input = disposables.add(new TestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID));
        registry.registerWorkbenchContribution2('a', TestContributionA, {
            editorTypeId: TEST_EDITOR_ID,
        });
        registry.start(instantiationService.createChild(new ServiceCollection([IEditorService, editorService])));
        await editorService.openEditor(input, { pinned: true });
        await aCreatedPromise.p;
        assert.ok(aCreated);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL2NvbnRyaWJ1dGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUUvRixPQUFPLEVBQWtCLDhCQUE4QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFMUYsT0FBTyxFQUVOLG1CQUFtQixFQUNuQixtQkFBbUIsRUFDbkIsNEJBQTRCLEVBQzVCLGdCQUFnQixFQUNoQixrQkFBa0IsRUFDbEIsNkJBQTZCLEdBQzdCLE1BQU0sNEJBQTRCLENBQUE7QUFFbkMsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFD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
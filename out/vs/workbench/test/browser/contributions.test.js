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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9jb250cmlidXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFFL0YsT0FBTyxFQUFrQiw4QkFBOEIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRTFGLE9BQU8sRUFFTixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBQ25CLDRCQUE0QixFQUM1QixnQkFBZ0IsRUFDaEIsa0JBQWtCLEVBQ2xCLDZCQUE2QixHQUM3QixNQUFNLDRCQUE0QixDQUFBO0FBRW5DLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsSUFBSSxRQUFpQixDQUFBO0lBQ3JCLElBQUksZUFBc0MsQ0FBQTtJQUUxQyxJQUFJLFFBQWlCLENBQUE7SUFDckIsSUFBSSxlQUFzQyxDQUFBO0lBRTFDLE1BQU0sY0FBYyxHQUFHLDhCQUE4QixDQUFBO0lBQ3JELE1BQU0sb0JBQW9CLEdBQUcsaUNBQWlDLENBQUE7SUFFOUQsS0FBSyxVQUFVLG1CQUFtQixDQUNqQyx1QkFBa0QsNkJBQTZCLENBQzlFLFNBQVMsRUFDVCxXQUFXLENBQ1g7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLGdCQUFnQixDQUFDLG9CQUFvQixFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3RFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVyRCxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNwQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUM3RCxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUV4RCxPQUFPLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsUUFBUSxHQUFHLEtBQUssQ0FBQTtRQUNoQixlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQVEsQ0FBQTtRQUU3QyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ2hCLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFBO1FBRTdDLFdBQVcsQ0FBQyxHQUFHLENBQ2Qsa0JBQWtCLENBQ2pCLGNBQWMsRUFDZCxDQUFDLElBQUksY0FBYyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxFQUMzRixvQkFBb0IsQ0FDcEIsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDbkIsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxpQkFBaUI7UUFDdEI7WUFDQyxRQUFRLEdBQUcsSUFBSSxDQUFBO1lBQ2YsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzNCLENBQUM7S0FDRDtJQUNELE1BQU0saUJBQWlCO1FBQ3RCO1lBQ0MsUUFBUSxHQUFHLElBQUksQ0FBQTtZQUNmLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMzQixDQUFDO0tBQ0Q7SUFDRCxNQUFNLHFCQUFxQjtRQUMxQjtZQUNDLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQTtRQUNsQixDQUFDO0tBQ0Q7SUFFRCxJQUFJLENBQUMsc0RBQXNELEVBQUUsR0FBRyxFQUFFO1FBQ2pFLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSw4QkFBOEIsRUFBRSxDQUFDLENBQUE7UUFFdEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUUzRCxRQUFRLENBQUMsOEJBQThCLENBQUMsR0FBRyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUUzRCxRQUFRLENBQUMsOEJBQThCLENBQUMsR0FBRyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDL0UsUUFBUSxDQUFDLDhCQUE4QixDQUFDLEdBQUcsRUFBRSxxQkFBcUIsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRW5GLE1BQU0sb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ2xGLFFBQVEsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUVwQyxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLFlBQVksaUJBQWlCLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRXJFLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsWUFBWSxpQkFBaUIsQ0FBQyxDQUFBO1FBRWpELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDNUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMERBQTBELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0UsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDhCQUE4QixFQUFFLENBQUMsQ0FBQTtRQUV0RSxNQUFNLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNsRixNQUFNLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUN6RSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtRQUMxQyxRQUFRLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFFcEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUUzRCxRQUFRLENBQUMsOEJBQThCLENBQUMsR0FBRyxFQUFFLGlCQUFpQixzQ0FBOEIsQ0FBQTtRQUU1RixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLFlBQVksaUJBQWlCLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRW5CLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLCtCQUF1QixDQUFBO1FBQ3RELE1BQU0sZUFBZSxDQUFDLENBQUMsQ0FBQTtRQUV2QixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUN0RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3REFBd0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksOEJBQThCLEVBQUUsQ0FBQyxDQUFBO1FBRXRFLE1BQU0sb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3pFLFFBQVEsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUVwQyxRQUFRLENBQUMsOEJBQThCLENBQUMsR0FBRyxFQUFFLGlCQUFpQixzQ0FBOEIsQ0FBQTtRQUM1RixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFcEIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssK0JBQXVCLENBQUE7UUFDdEQsTUFBTSxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0VBQWdFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakYsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDhCQUE4QixFQUFFLENBQUMsQ0FBQTtRQUV0RSxNQUFNLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNsRixNQUFNLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUN6RSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtRQUMxQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxrQ0FBMEIsQ0FBQTtRQUV6RCxRQUFRLENBQUMsOEJBQThCLENBQUMsR0FBRyxFQUFFLGlCQUFpQixzQ0FBOEIsQ0FBQTtRQUM1RixRQUFRLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFFcEMsTUFBTSxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBRUQ7SUFBQSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ3hFLHFEQUFxRCxFQUNyRCxLQUFLLElBQUksRUFBRTtRQUNWLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSw4QkFBOEIsRUFBRSxDQUFDLENBQUE7UUFFdEUsTUFBTSxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDbEYsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDekUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7UUFDMUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBRXBDLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLHVDQUErQixDQUFBO1FBQzdGLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLG9DQUE0QixDQUFBO1FBQzFGLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNwQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFcEIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssa0NBQTBCLENBQUE7UUFDekQsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssK0JBQXVCLENBQUE7UUFDdEQsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssa0NBQTBCLENBQUE7UUFDekQsTUFBTSxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFbkIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssb0NBQTRCLENBQUE7UUFDM0QsTUFBTSxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDcEIsQ0FBQyxDQUNELENBQUE7SUFFRCxJQUFJLENBQUMscURBQXFELEVBQUUsS0FBSztRQUNoRSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksOEJBQThCLEVBQUUsQ0FBQyxDQUFBO1FBRXRFLE1BQU0sb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRWxGLE1BQU0sQ0FBQyxFQUFFLGFBQWEsQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUV6RSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QixJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUNoRixDQUFBO1FBQ0QsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRXZELFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLEVBQUU7WUFDL0QsWUFBWSxFQUFFLGNBQWM7U0FDNUIsQ0FBQyxDQUFBO1FBQ0YsUUFBUSxDQUFDLEtBQUssQ0FDYixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQ3hGLENBQUE7UUFFRCxNQUFNLGVBQWUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVuQixRQUFRLENBQUMsOEJBQThCLENBQUMsR0FBRyxFQUFFLGlCQUFpQixFQUFFO1lBQy9ELFlBQVksRUFBRSxjQUFjO1NBQzVCLENBQUMsQ0FBQTtRQUVGLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzdCLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQ2pGLENBQUE7UUFDRCxNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRXBFLE1BQU0sZUFBZSxDQUFDLENBQUMsQ0FBQTtRQUN2QixNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZEQUE2RCxFQUFFLEtBQUs7UUFDeEUsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDhCQUE4QixFQUFFLENBQUMsQ0FBQTtRQUV0RSxNQUFNLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUVsRixNQUFNLENBQUMsRUFBRSxhQUFhLENBQUMsR0FBRyxNQUFNLG1CQUFtQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFFekUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUIsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FDaEYsQ0FBQTtRQUVELFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLEVBQUU7WUFDL0QsWUFBWSxFQUFFLGNBQWM7U0FDNUIsQ0FBQyxDQUFBO1FBQ0YsUUFBUSxDQUFDLEtBQUssQ0FDYixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQ3hGLENBQUE7UUFFRCxNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFdkQsTUFBTSxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=
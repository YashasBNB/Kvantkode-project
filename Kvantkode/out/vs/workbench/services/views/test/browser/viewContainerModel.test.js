/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../../nls.js';
import assert from 'assert';
import * as sinon from 'sinon';
import { Extensions as ViewContainerExtensions, } from '../../../../common/views.js';
import { dispose } from '../../../../../base/common/lifecycle.js';
import { move } from '../../../../../base/common/arrays.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { ContextKeyService } from '../../../../../platform/contextkey/browser/contextKeyService.js';
import { ViewDescriptorService } from '../../browser/viewDescriptorService.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { Event } from '../../../../../base/common/event.js';
import { getViewsStateStorageId } from '../../common/viewContainerModel.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const ViewContainerRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
const ViewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
class ViewDescriptorSequence {
    constructor(model) {
        this.disposables = [];
        this.elements = [...model.visibleViewDescriptors];
        model.onDidAddVisibleViewDescriptors((added) => added.forEach(({ viewDescriptor, index }) => this.elements.splice(index, 0, viewDescriptor)), null, this.disposables);
        model.onDidRemoveVisibleViewDescriptors((removed) => removed
            .sort((a, b) => b.index - a.index)
            .forEach(({ index }) => this.elements.splice(index, 1)), null, this.disposables);
        model.onDidMoveVisibleViewDescriptors(({ from, to }) => move(this.elements, from.index, to.index), null, this.disposables);
    }
    dispose() {
        this.disposables = dispose(this.disposables);
    }
}
suite('ViewContainerModel', () => {
    let container;
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    let contextKeyService;
    let viewDescriptorService;
    let storageService;
    setup(() => {
        const instantiationService = workbenchInstantiationService(undefined, disposableStore);
        contextKeyService = disposableStore.add(instantiationService.createInstance(ContextKeyService));
        instantiationService.stub(IContextKeyService, contextKeyService);
        storageService = instantiationService.get(IStorageService);
        viewDescriptorService = disposableStore.add(instantiationService.createInstance(ViewDescriptorService));
    });
    teardown(() => {
        ViewsRegistry.deregisterViews(ViewsRegistry.getViews(container), container);
        ViewContainerRegistry.deregisterViewContainer(container);
    });
    test('empty model', function () {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
    });
    test('register/unregister', () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
        };
        ViewsRegistry.registerViews([viewDescriptor], container);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 1);
        assert.strictEqual(target.elements.length, 1);
        assert.deepStrictEqual(testObject.visibleViewDescriptors[0], viewDescriptor);
        assert.deepStrictEqual(target.elements[0], viewDescriptor);
        ViewsRegistry.deregisterViews([viewDescriptor], container);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
    });
    test('when contexts', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            when: ContextKeyExpr.equals('showview1', true),
        };
        ViewsRegistry.registerViews([viewDescriptor], container);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0, 'view should not appear since context isnt in');
        assert.strictEqual(target.elements.length, 0);
        const key = contextKeyService.createKey('showview1', false);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0, 'view should still not appear since showview1 isnt true');
        assert.strictEqual(target.elements.length, 0);
        key.set(true);
        await new Promise((c) => setTimeout(c, 30));
        assert.strictEqual(testObject.visibleViewDescriptors.length, 1, 'view should appear');
        assert.strictEqual(target.elements.length, 1);
        assert.deepStrictEqual(testObject.visibleViewDescriptors[0], viewDescriptor);
        assert.strictEqual(target.elements[0], viewDescriptor);
        key.set(false);
        await new Promise((c) => setTimeout(c, 30));
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0, 'view should disappear');
        assert.strictEqual(target.elements.length, 0);
        ViewsRegistry.deregisterViews([viewDescriptor], container);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0, 'view should not be there anymore');
        assert.strictEqual(target.elements.length, 0);
        key.set(true);
        await new Promise((c) => setTimeout(c, 30));
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0, 'view should not be there anymore');
        assert.strictEqual(target.elements.length, 0);
    }));
    test('when contexts - multiple', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const view1 = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
        };
        const view2 = {
            id: 'view2',
            ctorDescriptor: null,
            name: nls.localize2('Test View 2', 'Test View 2'),
            when: ContextKeyExpr.equals('showview2', true),
        };
        ViewsRegistry.registerViews([view1, view2], container);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1], 'only view1 should be visible');
        assert.deepStrictEqual(target.elements, [view1], 'only view1 should be visible');
        const key = contextKeyService.createKey('showview2', false);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1], 'still only view1 should be visible');
        assert.deepStrictEqual(target.elements, [view1], 'still only view1 should be visible');
        key.set(true);
        await new Promise((c) => setTimeout(c, 30));
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1, view2], 'both views should be visible');
        assert.deepStrictEqual(target.elements, [view1, view2], 'both views should be visible');
        ViewsRegistry.deregisterViews([view1, view2], container);
    }));
    test('when contexts - multiple 2', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const view1 = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            when: ContextKeyExpr.equals('showview1', true),
        };
        const view2 = {
            id: 'view2',
            ctorDescriptor: null,
            name: nls.localize2('Test View 2', 'Test View 2'),
        };
        ViewsRegistry.registerViews([view1, view2], container);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view2], 'only view2 should be visible');
        assert.deepStrictEqual(target.elements, [view2], 'only view2 should be visible');
        const key = contextKeyService.createKey('showview1', false);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view2], 'still only view2 should be visible');
        assert.deepStrictEqual(target.elements, [view2], 'still only view2 should be visible');
        key.set(true);
        await new Promise((c) => setTimeout(c, 30));
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1, view2], 'both views should be visible');
        assert.deepStrictEqual(target.elements, [view1, view2], 'both views should be visible');
        ViewsRegistry.deregisterViews([view1, view2], container);
    }));
    test('setVisible', () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const view1 = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            canToggleVisibility: true,
        };
        const view2 = {
            id: 'view2',
            ctorDescriptor: null,
            name: nls.localize2('Test View 2', 'Test View 2'),
            canToggleVisibility: true,
        };
        const view3 = {
            id: 'view3',
            ctorDescriptor: null,
            name: nls.localize2('Test View 3', 'Test View 3'),
            canToggleVisibility: true,
        };
        ViewsRegistry.registerViews([view1, view2, view3], container);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1, view2, view3]);
        assert.deepStrictEqual(target.elements, [view1, view2, view3]);
        testObject.setVisible('view2', true);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1, view2, view3], 'nothing should happen');
        assert.deepStrictEqual(target.elements, [view1, view2, view3]);
        testObject.setVisible('view2', false);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1, view3], 'view2 should hide');
        assert.deepStrictEqual(target.elements, [view1, view3]);
        testObject.setVisible('view1', false);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view3], 'view1 should hide');
        assert.deepStrictEqual(target.elements, [view3]);
        testObject.setVisible('view3', false);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [], 'view3 shoud hide');
        assert.deepStrictEqual(target.elements, []);
        testObject.setVisible('view1', true);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1], 'view1 should show');
        assert.deepStrictEqual(target.elements, [view1]);
        testObject.setVisible('view3', true);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1, view3], 'view3 should show');
        assert.deepStrictEqual(target.elements, [view1, view3]);
        testObject.setVisible('view2', true);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1, view2, view3], 'view2 should show');
        assert.deepStrictEqual(target.elements, [view1, view2, view3]);
        ViewsRegistry.deregisterViews([view1, view2, view3], container);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, []);
        assert.deepStrictEqual(target.elements, []);
    });
    test('move', () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const view1 = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
        };
        const view2 = {
            id: 'view2',
            ctorDescriptor: null,
            name: nls.localize2('Test View 2', 'Test View 2'),
        };
        const view3 = {
            id: 'view3',
            ctorDescriptor: null,
            name: nls.localize2('Test View 3', 'Test View 3'),
        };
        ViewsRegistry.registerViews([view1, view2, view3], container);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1, view2, view3], 'model views should be OK');
        assert.deepStrictEqual(target.elements, [view1, view2, view3], 'sql views should be OK');
        testObject.move('view3', 'view1');
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view3, view1, view2], 'view3 should go to the front');
        assert.deepStrictEqual(target.elements, [view3, view1, view2]);
        testObject.move('view1', 'view2');
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view3, view2, view1], 'view1 should go to the end');
        assert.deepStrictEqual(target.elements, [view3, view2, view1]);
        testObject.move('view1', 'view3');
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1, view3, view2], 'view1 should go to the front');
        assert.deepStrictEqual(target.elements, [view1, view3, view2]);
        testObject.move('view2', 'view3');
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view1, view2, view3], 'view2 should go to the middle');
        assert.deepStrictEqual(target.elements, [view1, view2, view3]);
    });
    test('view states', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        storageService.store(`${container.id}.state.hidden`, JSON.stringify([{ id: 'view1', isHidden: true }]), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
        };
        ViewsRegistry.registerViews([viewDescriptor], container);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0, 'view should not appear since it was set not visible in view state');
        assert.strictEqual(target.elements.length, 0);
    }));
    test('view states and when contexts', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        storageService.store(`${container.id}.state.hidden`, JSON.stringify([{ id: 'view1', isHidden: true }]), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            when: ContextKeyExpr.equals('showview1', true),
        };
        ViewsRegistry.registerViews([viewDescriptor], container);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0, 'view should not appear since context isnt in');
        assert.strictEqual(target.elements.length, 0);
        const key = contextKeyService.createKey('showview1', false);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0, 'view should still not appear since showview1 isnt true');
        assert.strictEqual(target.elements.length, 0);
        key.set(true);
        await new Promise((c) => setTimeout(c, 30));
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0, 'view should still not appear since it was set not visible in view state');
        assert.strictEqual(target.elements.length, 0);
    }));
    test('view states and when contexts multiple views', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        storageService.store(`${container.id}.state.hidden`, JSON.stringify([{ id: 'view1', isHidden: true }]), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
        const view1 = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            when: ContextKeyExpr.equals('showview', true),
        };
        const view2 = {
            id: 'view2',
            ctorDescriptor: null,
            name: nls.localize2('Test View 2', 'Test View 2'),
        };
        const view3 = {
            id: 'view3',
            ctorDescriptor: null,
            name: nls.localize2('Test View 3', 'Test View 3'),
            when: ContextKeyExpr.equals('showview', true),
        };
        ViewsRegistry.registerViews([view1, view2, view3], container);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view2], 'Only view2 should be visible');
        assert.deepStrictEqual(target.elements, [view2]);
        const key = contextKeyService.createKey('showview', false);
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view2], 'Only view2 should be visible');
        assert.deepStrictEqual(target.elements, [view2]);
        key.set(true);
        await new Promise((c) => setTimeout(c, 30));
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view2, view3], 'view3 should be visible');
        assert.deepStrictEqual(target.elements, [view2, view3]);
        key.set(false);
        await new Promise((c) => setTimeout(c, 30));
        assert.deepStrictEqual(testObject.visibleViewDescriptors, [view2], 'Only view2 should be visible');
        assert.deepStrictEqual(target.elements, [view2]);
    }));
    test('remove event is not triggered if view was hidden and removed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            when: ContextKeyExpr.equals('showview1', true),
            canToggleVisibility: true,
        };
        ViewsRegistry.registerViews([viewDescriptor], container);
        const key = contextKeyService.createKey('showview1', true);
        await new Promise((c) => setTimeout(c, 30));
        assert.strictEqual(testObject.visibleViewDescriptors.length, 1, 'view should appear after context is set');
        assert.strictEqual(target.elements.length, 1);
        testObject.setVisible('view1', false);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0, 'view should disappear after setting visibility to false');
        assert.strictEqual(target.elements.length, 0);
        const targetEvent = sinon.spy();
        disposableStore.add(testObject.onDidRemoveVisibleViewDescriptors(targetEvent));
        key.set(false);
        await new Promise((c) => setTimeout(c, 30));
        assert.ok(!targetEvent.called, 'remove event should not be called since it is already hidden');
    }));
    test('add event is not triggered if view was set visible (when visible) and not active', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            when: ContextKeyExpr.equals('showview1', true),
            canToggleVisibility: true,
        };
        const key = contextKeyService.createKey('showview1', true);
        key.set(false);
        ViewsRegistry.registerViews([viewDescriptor], container);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
        const targetEvent = sinon.spy();
        disposableStore.add(testObject.onDidAddVisibleViewDescriptors(targetEvent));
        testObject.setVisible('view1', true);
        assert.ok(!targetEvent.called, 'add event should not be called since it is already visible');
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
    }));
    test('remove event is not triggered if view was hidden and not active', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            when: ContextKeyExpr.equals('showview1', true),
            canToggleVisibility: true,
        };
        const key = contextKeyService.createKey('showview1', true);
        key.set(false);
        ViewsRegistry.registerViews([viewDescriptor], container);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
        const targetEvent = sinon.spy();
        disposableStore.add(testObject.onDidAddVisibleViewDescriptors(targetEvent));
        testObject.setVisible('view1', false);
        assert.ok(!targetEvent.called, 'add event should not be called since it is disabled');
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
    }));
    test('add event is not triggered if view was set visible (when not visible) and not active', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            when: ContextKeyExpr.equals('showview1', true),
            canToggleVisibility: true,
        };
        const key = contextKeyService.createKey('showview1', true);
        key.set(false);
        ViewsRegistry.registerViews([viewDescriptor], container);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
        testObject.setVisible('view1', false);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
        const targetEvent = sinon.spy();
        disposableStore.add(testObject.onDidAddVisibleViewDescriptors(targetEvent));
        testObject.setVisible('view1', true);
        assert.ok(!targetEvent.called, 'add event should not be called since it is disabled');
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
    }));
    test('added view descriptors are in ascending order in the event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        ViewsRegistry.registerViews([
            {
                id: 'view5',
                ctorDescriptor: null,
                name: nls.localize2('Test View 5', 'Test View 5'),
                canToggleVisibility: true,
                order: 5,
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canToggleVisibility: true,
                order: 2,
            },
        ], container);
        assert.strictEqual(target.elements.length, 2);
        assert.strictEqual(target.elements[0].id, 'view2');
        assert.strictEqual(target.elements[1].id, 'view5');
        ViewsRegistry.registerViews([
            {
                id: 'view4',
                ctorDescriptor: null,
                name: nls.localize2('Test View 4', 'Test View 4'),
                canToggleVisibility: true,
                order: 4,
            },
            {
                id: 'view3',
                ctorDescriptor: null,
                name: nls.localize2('Test View 3', 'Test View 3'),
                canToggleVisibility: true,
                order: 3,
            },
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canToggleVisibility: true,
                order: 1,
            },
        ], container);
        assert.strictEqual(target.elements.length, 5);
        assert.strictEqual(target.elements[0].id, 'view1');
        assert.strictEqual(target.elements[1].id, 'view2');
        assert.strictEqual(target.elements[2].id, 'view3');
        assert.strictEqual(target.elements[3].id, 'view4');
        assert.strictEqual(target.elements[4].id, 'view5');
    }));
    test('add event is triggered only once when view is set visible while it is set active', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            when: ContextKeyExpr.equals('showview1', true),
            canToggleVisibility: true,
        };
        const key = contextKeyService.createKey('showview1', true);
        key.set(false);
        ViewsRegistry.registerViews([viewDescriptor], container);
        testObject.setVisible('view1', false);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
        const targetEvent = sinon.spy();
        disposableStore.add(testObject.onDidAddVisibleViewDescriptors(targetEvent));
        disposableStore.add(Event.once(testObject.onDidChangeActiveViewDescriptors)(() => testObject.setVisible('view1', true)));
        key.set(true);
        await new Promise((c) => setTimeout(c, 30));
        assert.strictEqual(targetEvent.callCount, 1);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 1);
        assert.strictEqual(target.elements.length, 1);
        assert.strictEqual(target.elements[0].id, 'view1');
    }));
    test('add event is not triggered only when view is set hidden while it is set active', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            when: ContextKeyExpr.equals('showview1', true),
            canToggleVisibility: true,
        };
        const key = contextKeyService.createKey('showview1', true);
        key.set(false);
        ViewsRegistry.registerViews([viewDescriptor], container);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
        const targetEvent = sinon.spy();
        disposableStore.add(testObject.onDidAddVisibleViewDescriptors(targetEvent));
        disposableStore.add(Event.once(testObject.onDidChangeActiveViewDescriptors)(() => testObject.setVisible('view1', false)));
        key.set(true);
        await new Promise((c) => setTimeout(c, 30));
        assert.strictEqual(targetEvent.callCount, 0);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
        assert.strictEqual(target.elements.length, 0);
    }));
    test('#142087: view descriptor visibility is not reset', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            canToggleVisibility: true,
        };
        storageService.store(getViewsStateStorageId('test.state'), JSON.stringify([
            {
                id: viewDescriptor.id,
                isHidden: true,
                order: undefined,
            },
        ]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        ViewsRegistry.registerViews([viewDescriptor], container);
        assert.strictEqual(testObject.isVisible(viewDescriptor.id), false);
        assert.strictEqual(testObject.activeViewDescriptors[0].id, viewDescriptor.id);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
    }));
    test('remove event is triggered properly if multiple views are hidden at the same time', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const viewDescriptor1 = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            canToggleVisibility: true,
        };
        const viewDescriptor2 = {
            id: 'view2',
            ctorDescriptor: null,
            name: nls.localize2('Test View 2', 'Test View 2'),
            canToggleVisibility: true,
        };
        const viewDescriptor3 = {
            id: 'view3',
            ctorDescriptor: null,
            name: nls.localize2('Test View 3', 'Test View 3'),
            canToggleVisibility: true,
        };
        ViewsRegistry.registerViews([viewDescriptor1, viewDescriptor2, viewDescriptor3], container);
        const remomveEvent = sinon.spy();
        disposableStore.add(testObject.onDidRemoveVisibleViewDescriptors(remomveEvent));
        const addEvent = sinon.spy();
        disposableStore.add(testObject.onDidAddVisibleViewDescriptors(addEvent));
        storageService.store(getViewsStateStorageId('test.state'), JSON.stringify([
            {
                id: viewDescriptor1.id,
                isHidden: false,
                order: undefined,
            },
            {
                id: viewDescriptor2.id,
                isHidden: true,
                order: undefined,
            },
            {
                id: viewDescriptor3.id,
                isHidden: true,
                order: undefined,
            },
        ]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        assert.ok(!addEvent.called, 'add event should not be called');
        assert.ok(remomveEvent.calledOnce, 'remove event should be called');
        assert.deepStrictEqual(remomveEvent.args[0][0], [
            {
                viewDescriptor: viewDescriptor3,
                index: 2,
            },
            {
                viewDescriptor: viewDescriptor2,
                index: 1,
            },
        ]);
        assert.strictEqual(target.elements.length, 1);
        assert.strictEqual(target.elements[0].id, viewDescriptor1.id);
    }));
    test('add event is triggered properly if multiple views are hidden at the same time', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const viewDescriptor1 = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            canToggleVisibility: true,
        };
        const viewDescriptor2 = {
            id: 'view2',
            ctorDescriptor: null,
            name: nls.localize2('Test View 2', 'Test View 2'),
            canToggleVisibility: true,
        };
        const viewDescriptor3 = {
            id: 'view3',
            ctorDescriptor: null,
            name: nls.localize2('Test View 3', 'Test View 3'),
            canToggleVisibility: true,
        };
        ViewsRegistry.registerViews([viewDescriptor1, viewDescriptor2, viewDescriptor3], container);
        testObject.setVisible(viewDescriptor1.id, false);
        testObject.setVisible(viewDescriptor3.id, false);
        const removeEvent = sinon.spy();
        disposableStore.add(testObject.onDidRemoveVisibleViewDescriptors(removeEvent));
        const addEvent = sinon.spy();
        disposableStore.add(testObject.onDidAddVisibleViewDescriptors(addEvent));
        storageService.store(getViewsStateStorageId('test.state'), JSON.stringify([
            {
                id: viewDescriptor1.id,
                isHidden: false,
                order: undefined,
            },
            {
                id: viewDescriptor2.id,
                isHidden: false,
                order: undefined,
            },
            {
                id: viewDescriptor3.id,
                isHidden: false,
                order: undefined,
            },
        ]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        assert.ok(!removeEvent.called, 'remove event should not be called');
        assert.ok(addEvent.calledOnce, 'add event should be called once');
        assert.deepStrictEqual(addEvent.args[0][0], [
            {
                viewDescriptor: viewDescriptor1,
                index: 0,
                collapsed: false,
                size: undefined,
            },
            {
                viewDescriptor: viewDescriptor3,
                index: 2,
                collapsed: false,
                size: undefined,
            },
        ]);
        assert.strictEqual(target.elements.length, 3);
        assert.strictEqual(target.elements[0].id, viewDescriptor1.id);
        assert.strictEqual(target.elements[1].id, viewDescriptor2.id);
        assert.strictEqual(target.elements[2].id, viewDescriptor3.id);
    }));
    test('add and remove events are triggered properly if multiple views are hidden and added at the same time', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        const target = disposableStore.add(new ViewDescriptorSequence(testObject));
        const viewDescriptor1 = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            canToggleVisibility: true,
        };
        const viewDescriptor2 = {
            id: 'view2',
            ctorDescriptor: null,
            name: nls.localize2('Test View 2', 'Test View 2'),
            canToggleVisibility: true,
        };
        const viewDescriptor3 = {
            id: 'view3',
            ctorDescriptor: null,
            name: nls.localize2('Test View 3', 'Test View 3'),
            canToggleVisibility: true,
        };
        const viewDescriptor4 = {
            id: 'view4',
            ctorDescriptor: null,
            name: nls.localize2('Test View 4', 'Test View 4'),
            canToggleVisibility: true,
        };
        ViewsRegistry.registerViews([viewDescriptor1, viewDescriptor2, viewDescriptor3, viewDescriptor4], container);
        testObject.setVisible(viewDescriptor1.id, false);
        const removeEvent = sinon.spy();
        disposableStore.add(testObject.onDidRemoveVisibleViewDescriptors(removeEvent));
        const addEvent = sinon.spy();
        disposableStore.add(testObject.onDidAddVisibleViewDescriptors(addEvent));
        storageService.store(getViewsStateStorageId('test.state'), JSON.stringify([
            {
                id: viewDescriptor1.id,
                isHidden: false,
                order: undefined,
            },
            {
                id: viewDescriptor2.id,
                isHidden: true,
                order: undefined,
            },
            {
                id: viewDescriptor3.id,
                isHidden: false,
                order: undefined,
            },
            {
                id: viewDescriptor4.id,
                isHidden: true,
                order: undefined,
            },
        ]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        assert.ok(removeEvent.calledOnce, 'remove event should be called once');
        assert.deepStrictEqual(removeEvent.args[0][0], [
            {
                viewDescriptor: viewDescriptor4,
                index: 2,
            },
            {
                viewDescriptor: viewDescriptor2,
                index: 0,
            },
        ]);
        assert.ok(addEvent.calledOnce, 'add event should be called once');
        assert.deepStrictEqual(addEvent.args[0][0], [
            {
                viewDescriptor: viewDescriptor1,
                index: 0,
                collapsed: false,
                size: undefined,
            },
        ]);
        assert.strictEqual(target.elements.length, 2);
        assert.strictEqual(target.elements[0].id, viewDescriptor1.id);
        assert.strictEqual(target.elements[1].id, viewDescriptor3.id);
    }));
    test('newly added view descriptor is hidden if it was toggled hidden in storage before adding', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        container = ViewContainerRegistry.registerViewContainer({
            id: 'test',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const viewDescriptor = {
            id: 'view1',
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            canToggleVisibility: true,
        };
        storageService.store(getViewsStateStorageId('test.state'), JSON.stringify([
            {
                id: viewDescriptor.id,
                isHidden: false,
                order: undefined,
            },
        ]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const testObject = viewDescriptorService.getViewContainerModel(container);
        storageService.store(getViewsStateStorageId('test.state'), JSON.stringify([
            {
                id: viewDescriptor.id,
                isHidden: true,
                order: undefined,
            },
        ]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        ViewsRegistry.registerViews([viewDescriptor], container);
        assert.strictEqual(testObject.isVisible(viewDescriptor.id), false);
        assert.strictEqual(testObject.activeViewDescriptors[0].id, viewDescriptor.id);
        assert.strictEqual(testObject.visibleViewDescriptors.length, 0);
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0NvbnRhaW5lck1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy92aWV3cy90ZXN0L2Jyb3dzZXIvdmlld0NvbnRhaW5lck1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUlOLFVBQVUsSUFBSSx1QkFBdUIsR0FLckMsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBQ2xCLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8s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
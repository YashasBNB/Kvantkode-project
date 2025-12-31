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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0NvbnRhaW5lck1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdmlld3MvdGVzdC9icm93c2VyL3ZpZXdDb250YWluZXJNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUE7QUFDNUMsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFJTixVQUFVLElBQUksdUJBQXVCLEdBS3JDLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixHQUNsQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDNUYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUs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QyxDQUFDLEVBQ0Qsd0RBQXdELENBQ3hELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTdDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDYixNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRXRELEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDZCxNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFN0MsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0s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
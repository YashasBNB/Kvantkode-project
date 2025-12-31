/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, ok, strictEqual } from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { InMemoryStorageService, } from '../../common/storage.js';
export function createSuite(params) {
    let storageService;
    const disposables = new DisposableStore();
    setup(async () => {
        storageService = await params.setup();
    });
    teardown(() => {
        disposables.clear();
        return params.teardown(storageService);
    });
    test('Get Data, Integer, Boolean (application)', () => {
        storeData(-1 /* StorageScope.APPLICATION */);
    });
    test('Get Data, Integer, Boolean (profile)', () => {
        storeData(0 /* StorageScope.PROFILE */);
    });
    test('Get Data, Integer, Boolean, Object (workspace)', () => {
        storeData(1 /* StorageScope.WORKSPACE */);
    });
    test('Storage change source', () => {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, undefined, disposables)((e) => storageValueChangeEvents.push(e), undefined, disposables);
        // Explicit external source
        storageService.storeAll([
            {
                key: 'testExternalChange',
                value: 'foobar',
                scope: 1 /* StorageScope.WORKSPACE */,
                target: 1 /* StorageTarget.MACHINE */,
            },
        ], true);
        let storageValueChangeEvent = storageValueChangeEvents.find((e) => e.key === 'testExternalChange');
        strictEqual(storageValueChangeEvent?.external, true);
        // Default source
        storageService.storeAll([
            {
                key: 'testChange',
                value: 'barfoo',
                scope: 1 /* StorageScope.WORKSPACE */,
                target: 1 /* StorageTarget.MACHINE */,
            },
        ], false);
        storageValueChangeEvent = storageValueChangeEvents.find((e) => e.key === 'testChange');
        strictEqual(storageValueChangeEvent?.external, false);
        storageService.store('testChange', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageValueChangeEvent = storageValueChangeEvents.find((e) => e.key === 'testChange');
        strictEqual(storageValueChangeEvent?.external, false);
    });
    test('Storage change event scope (all keys)', () => {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, undefined, disposables)((e) => storageValueChangeEvents.push(e), undefined, disposables);
        storageService.store('testChange', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange2', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange', 'foobar', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange', 'foobar', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange2', 'foobar', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageValueChangeEvents.length, 2);
    });
    test('Storage change event scope (specific key)', () => {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, 'testChange', disposables)((e) => storageValueChangeEvents.push(e), undefined, disposables);
        storageService.store('testChange', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange', 'foobar', 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        storageService.store('testChange', 'foobar', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange2', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        const storageValueChangeEvent = storageValueChangeEvents.find((e) => e.key === 'testChange');
        ok(storageValueChangeEvent);
        strictEqual(storageValueChangeEvents.length, 1);
    });
    function storeData(scope) {
        let storageValueChangeEvents = [];
        storageService.onDidChangeValue(scope, undefined, disposables)((e) => storageValueChangeEvents.push(e), undefined, disposables);
        strictEqual(storageService.get('test.get', scope, 'foobar'), 'foobar');
        strictEqual(storageService.get('test.get', scope, ''), '');
        strictEqual(storageService.getNumber('test.getNumber', scope, 5), 5);
        strictEqual(storageService.getNumber('test.getNumber', scope, 0), 0);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, true), true);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, false), false);
        deepStrictEqual(storageService.getObject('test.getObject', scope, { foo: 'bar' }), {
            foo: 'bar',
        });
        deepStrictEqual(storageService.getObject('test.getObject', scope, {}), {});
        deepStrictEqual(storageService.getObject('test.getObject', scope, []), []);
        storageService.store('test.get', 'foobar', scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.get('test.get', scope, undefined), 'foobar');
        let storageValueChangeEvent = storageValueChangeEvents.find((e) => e.key === 'test.get');
        strictEqual(storageValueChangeEvent?.scope, scope);
        strictEqual(storageValueChangeEvent?.key, 'test.get');
        storageValueChangeEvents = [];
        storageService.store('test.get', '', scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.get('test.get', scope, undefined), '');
        storageValueChangeEvent = storageValueChangeEvents.find((e) => e.key === 'test.get');
        strictEqual(storageValueChangeEvent.scope, scope);
        strictEqual(storageValueChangeEvent.key, 'test.get');
        storageService.store('test.getNumber', 5, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getNumber('test.getNumber', scope, undefined), 5);
        storageService.store('test.getNumber', 0, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getNumber('test.getNumber', scope, undefined), 0);
        storageService.store('test.getBoolean', true, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, undefined), true);
        storageService.store('test.getBoolean', false, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, undefined), false);
        storageService.store('test.getObject', {}, scope, 1 /* StorageTarget.MACHINE */);
        deepStrictEqual(storageService.getObject('test.getObject', scope, undefined), {});
        storageService.store('test.getObject', [42], scope, 1 /* StorageTarget.MACHINE */);
        deepStrictEqual(storageService.getObject('test.getObject', scope, undefined), [42]);
        storageService.store('test.getObject', { foo: {} }, scope, 1 /* StorageTarget.MACHINE */);
        deepStrictEqual(storageService.getObject('test.getObject', scope, undefined), { foo: {} });
        strictEqual(storageService.get('test.getDefault', scope, 'getDefault'), 'getDefault');
        strictEqual(storageService.getNumber('test.getNumberDefault', scope, 5), 5);
        strictEqual(storageService.getBoolean('test.getBooleanDefault', scope, true), true);
        deepStrictEqual(storageService.getObject('test.getObjectDefault', scope, { foo: 42 }), {
            foo: 42,
        });
        storageService.storeAll([
            { key: 'test.storeAll1', value: 'foobar', scope, target: 1 /* StorageTarget.MACHINE */ },
            { key: 'test.storeAll2', value: 4, scope, target: 1 /* StorageTarget.MACHINE */ },
            { key: 'test.storeAll3', value: null, scope, target: 1 /* StorageTarget.MACHINE */ },
        ], false);
        strictEqual(storageService.get('test.storeAll1', scope, 'foobar'), 'foobar');
        strictEqual(storageService.get('test.storeAll2', scope, '4'), '4');
        strictEqual(storageService.get('test.storeAll3', scope, 'null'), 'null');
    }
    test('Remove Data (application)', () => {
        removeData(-1 /* StorageScope.APPLICATION */);
    });
    test('Remove Data (profile)', () => {
        removeData(0 /* StorageScope.PROFILE */);
    });
    test('Remove Data (workspace)', () => {
        removeData(1 /* StorageScope.WORKSPACE */);
    });
    function removeData(scope) {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(scope, undefined, disposables)((e) => storageValueChangeEvents.push(e), undefined, disposables);
        storageService.store('test.remove', 'foobar', scope, 1 /* StorageTarget.MACHINE */);
        strictEqual('foobar', storageService.get('test.remove', scope, undefined));
        storageService.remove('test.remove', scope);
        ok(!storageService.get('test.remove', scope, undefined));
        const storageValueChangeEvent = storageValueChangeEvents.find((e) => e.key === 'test.remove');
        strictEqual(storageValueChangeEvent?.scope, scope);
        strictEqual(storageValueChangeEvent?.key, 'test.remove');
    }
    test('Keys (in-memory)', () => {
        let storageTargetEvent = undefined;
        storageService.onDidChangeTarget((e) => (storageTargetEvent = e), undefined, disposables);
        // Empty
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                strictEqual(storageService.keys(scope, target).length, 0);
            }
        }
        let storageValueChangeEvent = undefined;
        // Add values
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            storageService.onDidChangeValue(scope, undefined, disposables)((e) => (storageValueChangeEvent = e), undefined, disposables);
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                storageTargetEvent = Object.create(null);
                storageValueChangeEvent = Object.create(null);
                storageService.store('test.target1', 'value1', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                strictEqual(storageTargetEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.key, 'test.target1');
                strictEqual(storageValueChangeEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.target, target);
                storageTargetEvent = undefined;
                storageValueChangeEvent = Object.create(null);
                storageService.store('test.target1', 'otherValue1', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                strictEqual(storageTargetEvent, undefined);
                strictEqual(storageValueChangeEvent?.key, 'test.target1');
                strictEqual(storageValueChangeEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.target, target);
                storageService.store('test.target2', 'value2', scope, target);
                storageService.store('test.target3', 'value3', scope, target);
                strictEqual(storageService.keys(scope, target).length, 3);
            }
        }
        // Remove values
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                const keysLength = storageService.keys(scope, target).length;
                storageService.store('test.target4', 'value1', scope, target);
                strictEqual(storageService.keys(scope, target).length, keysLength + 1);
                storageTargetEvent = Object.create(null);
                storageValueChangeEvent = Object.create(null);
                storageService.remove('test.target4', scope);
                strictEqual(storageService.keys(scope, target).length, keysLength);
                strictEqual(storageTargetEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.key, 'test.target4');
                strictEqual(storageValueChangeEvent?.scope, scope);
            }
        }
        // Remove all
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                const keys = storageService.keys(scope, target);
                for (const key of keys) {
                    storageService.remove(key, scope);
                }
                strictEqual(storageService.keys(scope, target).length, 0);
            }
        }
        // Adding undefined or null removes value
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                storageService.store('test.target1', 'value1', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                storageTargetEvent = Object.create(null);
                storageService.store('test.target1', undefined, scope, target);
                strictEqual(storageService.keys(scope, target).length, 0);
                strictEqual(storageTargetEvent?.scope, scope);
                storageService.store('test.target1', '', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                storageService.store('test.target1', null, scope, target);
                strictEqual(storageService.keys(scope, target).length, 0);
            }
        }
        // Target change
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 1 /* StorageTarget.MACHINE */);
            ok(storageTargetEvent);
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 0 /* StorageTarget.USER */);
            ok(storageTargetEvent);
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 1 /* StorageTarget.MACHINE */);
            ok(storageTargetEvent);
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 1 /* StorageTarget.MACHINE */);
            ok(!storageTargetEvent); // no change in target
        }
    });
}
suite('StorageService (in-memory)', function () {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    createSuite({
        setup: async () => disposables.add(new InMemoryStorageService()),
        teardown: async () => { },
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0b3JhZ2UvdGVzdC9jb21tb24vc3RvcmFnZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFDTixzQkFBc0IsR0FNdEIsTUFBTSx5QkFBeUIsQ0FBQTtBQUVoQyxNQUFNLFVBQVUsV0FBVyxDQUE0QixNQUd0RDtJQUNBLElBQUksY0FBaUIsQ0FBQTtJQUVyQixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixjQUFjLEdBQUcsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdEMsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ25CLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUN2QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7UUFDckQsU0FBUyxtQ0FBMEIsQ0FBQTtJQUNwQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7UUFDakQsU0FBUyw4QkFBc0IsQ0FBQTtJQUNoQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxn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LFVBQVUsQ0FBQyxDQUFBO1FBQ3hGLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEQsV0FBVyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNyRCx3QkFBd0IsR0FBRyxFQUFFLENBQUE7UUFFN0IsY0FBYyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEtBQUssZ0NBQXdCLENBQUE7UUFDbEUsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxTQUFVLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNsRSx1QkFBdUIsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssVUFBVSxDQUFDLENBQUE7UUFDcEYsV0FBVyxDQUFDLHVCQUF3QixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxXQUFXLENBQUMsdUJBQXdCLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRXJELGNBQWMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLEtBQUssZ0NBQXdCLENBQUE7UUFDdkUsV0FBVyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLFNBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTdFLGNBQWMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLEtBQUssZ0NBQXdCLENBQUE7UUFDdkUsV0FBVyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLFNBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTdFLGNBQWMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLEtBQUssZ0NBQXdCLENBQUE7UUFDM0UsV0FBVyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLFNBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWxGLGNBQWMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLEtBQUssZ0NBQXdCLENBQUE7UUFDNUUsV0FBVyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLFNBQVUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRW5GLGNBQWMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLEtBQUssZ0NBQXdCLENBQUE7UUFDeEUsZUFBZSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLFNBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWxGLGNBQWMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLGdDQUF3QixDQUFBO1FBQzFFLGVBQWUsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLEtBQUssRUFBRSxTQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFcEYsY0FBYyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLGdDQUF3QixDQUFBO1FBQ2pGLGVBQWUsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLEtBQUssRUFBRSxTQUFVLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRTNGLFdBQVcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUNyRixXQUFXLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsV0FBVyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25GLGVBQWUsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLHVCQUF1QixFQUFFLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ3RGLEdBQUcsRUFBRSxFQUFFO1NBQ1AsQ0FBQyxDQUFBO1FBRUYsY0FBYyxDQUFDLFFBQVEsQ0FDdEI7WUFDQyxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUF1QixFQUFFO1lBQ2hGLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQXVCLEVBQUU7WUFDekUsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBdUIsRUFBRTtTQUM1RSxFQUNELEtBQUssQ0FDTCxDQUFBO1FBRUQsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzVFLFdBQVcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNsRSxXQUFXLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVELElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsVUFBVSxtQ0FBMEIsQ0FBQTtJQUNyQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsVUFBVSw4QkFBc0IsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsVUFBVSxnQ0FBd0IsQ0FBQTtJQUNuQyxDQUFDLENBQUMsQ0FBQTtJQUVGLFNBQVMsVUFBVSxDQUFDLEtBQW1CO1FBQ3RDLE1BQU0sd0JBQXdCLEdBQStCLEVBQUUsQ0FBQTtRQUMvRCxjQUFjLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FDN0QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDdkMsU0FBUyxFQUNULFdBQVcsQ0FDWCxDQUFBO1FBRUQsY0FBYyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLEtBQUssZ0NBQXdCLENBQUE7UUFDM0UsV0FBVyxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsU0FBVSxDQUFDLENBQUMsQ0FBQTtRQUUzRSxjQUFjLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsU0FBVSxDQUFDLENBQUMsQ0FBQTtRQUN6RCxNQUFNLHVCQUF1QixHQUFHLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxhQUFhLENBQUMsQ0FBQTtRQUM3RixXQUFXLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2xELFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsSUFBSSxrQkFBa0IsR0FBMEMsU0FBUyxDQUFBO1FBQ3pFLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFekYsUUFBUTtRQUNSLEtBQUssTUFBTSxLQUFLLElBQUksaUdBQXdFLEVBQUUsQ0FBQztZQUM5RixLQUFLLE1BQU0sTUFBTSxJQUFJLDJEQUEyQyxFQUFFLENBQUM7Z0JBQ2xFLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDMUQsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLHVCQUF1QixHQUF5QyxTQUFTLENBQUE7UUFFN0UsYUFBYTtRQUNiLEtBQUssTUFBTSxLQUFLLElBQUksaUdBQXdFLEVBQUUsQ0FBQztZQUM5RixjQUFjLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FDN0QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsdUJBQXVCLEdBQUcsQ0FBQyxDQUFDLEVBQ3BDLFNBQVMsRUFDVCxXQUFXLENBQ1gsQ0FBQTtZQUVELEtBQUssTUFBTSxNQUFNLElBQUksMkRBQTJDLEVBQUUsQ0FBQztnQkFDbEUsa0JBQWtCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDeEMsdUJBQXVCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFFN0MsY0FBYyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDN0QsV0FBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDekQsV0FBVyxDQUFDLGtCQUFrQixFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDN0MsV0FBVyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQTtnQkFDekQsV0FBVyxDQUFDLHVCQUF1QixFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDbEQsV0FBVyxDQUFDLHVCQUF1QixFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFFcEQsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO2dCQUM5Qix1QkFBdUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUU3QyxjQUFjLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUNsRSxXQUFXLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUN6RCxXQUFXLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQzFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUE7Z0JBQ3pELFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ2xELFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBRXBELGNBQWMsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQzdELGNBQWMsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBRTdELFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDMUQsQ0FBQztRQUNGLENBQUM7UUFFRCxnQkFBZ0I7UUFDaEIsS0FBSyxNQUFNLEtBQUssSUFBSSxpR0FBd0UsRUFBRSxDQUFDO1lBQzlGLEtBQUssTUFBTSxNQUFNLElBQUksMkRBQTJDLEVBQUUsQ0FBQztnQkFDbEUsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFBO2dCQUU1RCxjQUFjLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUM3RCxXQUFXLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFFdEUsa0JBQWtCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDeEMsdUJBQXVCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFFN0MsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQzVDLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBQ2xFLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQzdDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUE7Z0JBQ3pELFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbkQsQ0FBQztRQUNGLENBQUM7UUFFRCxhQUFhO1FBQ2IsS0FBSyxNQUFNLEtBQUssSUFBSSxpR0FBd0UsRUFBRSxDQUFDO1lBQzlGLEtBQUssTUFBTSxNQUFNLElBQUksMkRBQTJDLEVBQUUsQ0FBQztnQkFDbEUsTUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBRS9DLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ3hCLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUNsQyxDQUFDO2dCQUVELFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDMUQsQ0FBQztRQUNGLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsS0FBSyxNQUFNLEtBQUssSUFBSSxpR0FBd0UsRUFBRSxDQUFDO1lBQzlGLEtBQUssTUFBTSxNQUFNLElBQUksMkRBQTJDLEVBQUUsQ0FBQztnQkFDbEUsY0FBYyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDN0QsV0FBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFFekQsa0JBQWtCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFFeEMsY0FBYyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDOUQsV0FBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDekQsV0FBVyxDQUFDLGtCQUFrQixFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFFN0MsY0FBYyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDdkQsV0FBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFFekQsY0FBYyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDekQsV0FBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMxRCxDQUFDO1FBQ0YsQ0FBQztRQUVELGdCQUFnQjtRQUNoQixLQUFLLE1BQU0sS0FBSyxJQUFJLGlHQUF3RSxFQUFFLENBQUM7WUFDOUYsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO1lBQzlCLGNBQWMsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxLQUFLLGdDQUF3QixDQUFBO1lBQzVFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQ3RCLGtCQUFrQixHQUFHLFNBQVMsQ0FBQTtZQUM5QixjQUFjLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxRQUFRLEVBQUUsS0FBSyw2QkFBcUIsQ0FBQTtZQUN6RSxFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUN0QixrQkFBa0IsR0FBRyxTQUFTLENBQUE7WUFDOUIsY0FBYyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsUUFBUSxFQUFFLEtBQUssZ0NBQXdCLENBQUE7WUFDNUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLENBQUE7WUFDdEIsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO1lBQzlCLGNBQWMsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxLQUFLLGdDQUF3QixDQUFBO1lBQzVFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUEsQ0FBQyxzQkFBc0I7UUFDL0MsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELEtBQUssQ0FBQyw0QkFBNEIsRUFBRTtJQUNuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRXpDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixXQUFXLENBQXlCO1FBQ25DLEtBQUssRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1FBQ2hFLFFBQVEsRUFBRSxLQUFLLElBQUksRUFBRSxHQUFFLENBQUM7S0FDeEIsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9
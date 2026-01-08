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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc3RvcmFnZS90ZXN0L2NvbW1vbi9zdG9yYWdlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUNOLHNCQUFzQixHQU10QixNQUFNLHlCQUF5QixDQUFBO0FBRWhDLE1BQU0sVUFBVSxXQUFXLENBQTRCLE1BR3REO0lBQ0EsSUFBSSxjQUFpQixDQUFBO0lBRXJCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLGNBQWMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUN0QyxDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbkIsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ3ZDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtRQUNyRCxTQUFTLG1DQUEwQixDQUFBO0lBQ3BDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxTQUFTLDhCQUFzQixDQUFBO0lBQ2hDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxD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
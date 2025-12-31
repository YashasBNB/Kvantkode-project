/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter, Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { InMemoryStorageDatabase, Storage, } from '../../../../base/parts/storage/common/storage.js';
import { AbstractUserDataProfileStorageService, } from '../../common/userDataProfileStorageService.js';
import { InMemoryStorageService, loadKeyTargets, TARGET_KEY, } from '../../../storage/common/storage.js';
import { toUserDataProfile } from '../../common/userDataProfile.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
class TestStorageDatabase extends InMemoryStorageDatabase {
    constructor() {
        super(...arguments);
        this._onDidChangeItemsExternal = new Emitter();
        this.onDidChangeItemsExternal = this._onDidChangeItemsExternal.event;
    }
    async updateItems(request) {
        await super.updateItems(request);
        if (request.insert || request.delete) {
            this._onDidChangeItemsExternal.fire({ changed: request.insert, deleted: request.delete });
        }
    }
}
export class TestUserDataProfileStorageService extends AbstractUserDataProfileStorageService {
    constructor() {
        super(...arguments);
        this.onDidChange = Event.None;
        this.databases = new Map();
    }
    async createStorageDatabase(profile) {
        let database = this.databases.get(profile.id);
        if (!database) {
            this.databases.set(profile.id, (database = new TestStorageDatabase()));
        }
        return database;
    }
    setupStorageDatabase(profile) {
        return this.createStorageDatabase(profile);
    }
}
suite('ProfileStorageService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const profile = toUserDataProfile('test', 'test', URI.file('foo'), URI.file('cache'));
    let testObject;
    let storage;
    setup(async () => {
        testObject = disposables.add(new TestUserDataProfileStorageService(false, disposables.add(new InMemoryStorageService())));
        storage = disposables.add(new Storage(await testObject.setupStorageDatabase(profile)));
        await storage.init();
    });
    test('read empty storage', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const actual = await testObject.readStorageData(profile);
        assert.strictEqual(actual.size, 0);
    }));
    test('read storage with data', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        storage.set('foo', 'bar');
        storage.set(TARGET_KEY, JSON.stringify({ foo: 0 /* StorageTarget.USER */ }));
        await storage.flush();
        const actual = await testObject.readStorageData(profile);
        assert.strictEqual(actual.size, 1);
        assert.deepStrictEqual(actual.get('foo'), { value: 'bar', target: 0 /* StorageTarget.USER */ });
    }));
    test('write in empty storage', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const data = new Map();
        data.set('foo', 'bar');
        await testObject.updateStorageData(profile, data, 0 /* StorageTarget.USER */);
        assert.strictEqual(storage.items.size, 2);
        assert.deepStrictEqual(loadKeyTargets(storage), { foo: 0 /* StorageTarget.USER */ });
        assert.strictEqual(storage.get('foo'), 'bar');
    }));
    test('write in storage with data', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        storage.set('foo', 'bar');
        storage.set(TARGET_KEY, JSON.stringify({ foo: 0 /* StorageTarget.USER */ }));
        await storage.flush();
        const data = new Map();
        data.set('abc', 'xyz');
        await testObject.updateStorageData(profile, data, 1 /* StorageTarget.MACHINE */);
        assert.strictEqual(storage.items.size, 3);
        assert.deepStrictEqual(loadKeyTargets(storage), {
            foo: 0 /* StorageTarget.USER */,
            abc: 1 /* StorageTarget.MACHINE */,
        });
        assert.strictEqual(storage.get('foo'), 'bar');
        assert.strictEqual(storage.get('abc'), 'xyz');
    }));
    test('write in storage with data (insert, update, remove)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        storage.set('foo', 'bar');
        storage.set('abc', 'xyz');
        storage.set(TARGET_KEY, JSON.stringify({ foo: 0 /* StorageTarget.USER */, abc: 1 /* StorageTarget.MACHINE */ }));
        await storage.flush();
        const data = new Map();
        data.set('foo', undefined);
        data.set('abc', 'def');
        data.set('var', 'const');
        await testObject.updateStorageData(profile, data, 0 /* StorageTarget.USER */);
        assert.strictEqual(storage.items.size, 3);
        assert.deepStrictEqual(loadKeyTargets(storage), {
            abc: 0 /* StorageTarget.USER */,
            var: 0 /* StorageTarget.USER */,
        });
        assert.strictEqual(storage.get('abc'), 'def');
        assert.strictEqual(storage.get('var'), 'const');
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhUHJvZmlsZS90ZXN0L2NvbW1vbi91c2VyRGF0YVByb2ZpbGVTdG9yYWdlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQ04sdUJBQXVCLEVBR3ZCLE9BQU8sR0FDUCxNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFDTixxQ0FBcUMsR0FFckMsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGNBQWMsRUFFZCxVQUFVLEdBQ1YsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQW9CLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsTUFBTSxtQkFBb0IsU0FBUSx1QkFBdUI7SUFBekQ7O1FBQ2tCLDhCQUF5QixHQUFHLElBQUksT0FBTyxFQUE0QixDQUFBO1FBQ2xFLDZCQUF3QixHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUE7SUFRbEYsQ0FBQztJQU5TLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBdUI7UUFDakQsTUFBTSxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2hD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
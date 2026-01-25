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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFQcm9maWxlL3Rlc3QvY29tbW9uL3VzZXJEYXRhUHJvZmlsZVN0b3JhZ2VTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFDTix1QkFBdUIsRUFHdkIsT0FBTyxHQUNQLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUNOLHFDQUFxQyxHQUVyQyxNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsY0FBYyxFQUVkLFVBQVUsR0FDVixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBb0IsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixNQUFNLG1CQUFvQixTQUFRLHVCQUF1QjtJQUF6RDs7UUFDa0IsOEJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBQTRCLENBQUE7UUFDbEUsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQTtJQVFsRixDQUFDO0lBTlMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUF1QjtRQUNqRCxNQUFNLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7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
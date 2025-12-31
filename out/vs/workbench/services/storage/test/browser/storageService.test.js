/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { Storage } from '../../../../../base/parts/storage/common/storage.js';
import { flakySuite } from '../../../../../base/test/common/testUtils.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { createSuite } from '../../../../../platform/storage/test/common/storageService.test.js';
import { BrowserStorageService, IndexedDBStorageDatabase } from '../../browser/storageService.js';
import { UserDataProfileService } from '../../../userDataProfile/common/userDataProfileService.js';
async function createStorageService() {
    const disposables = new DisposableStore();
    const logService = new NullLogService();
    const fileService = disposables.add(new FileService(logService));
    const userDataProvider = disposables.add(new InMemoryFileSystemProvider());
    disposables.add(fileService.registerProvider(Schemas.vscodeUserData, userDataProvider));
    const profilesRoot = URI.file('/profiles').with({ scheme: Schemas.inMemory });
    const inMemoryExtraProfileRoot = joinPath(profilesRoot, 'extra');
    const inMemoryExtraProfile = {
        id: 'id',
        name: 'inMemory',
        isDefault: false,
        location: inMemoryExtraProfileRoot,
        globalStorageHome: joinPath(inMemoryExtraProfileRoot, 'globalStorageHome'),
        settingsResource: joinPath(inMemoryExtraProfileRoot, 'settingsResource'),
        keybindingsResource: joinPath(inMemoryExtraProfileRoot, 'keybindingsResource'),
        tasksResource: joinPath(inMemoryExtraProfileRoot, 'tasksResource'),
        snippetsHome: joinPath(inMemoryExtraProfileRoot, 'snippetsHome'),
        promptsHome: joinPath(inMemoryExtraProfileRoot, 'promptsHome'),
        extensionsResource: joinPath(inMemoryExtraProfileRoot, 'extensionsResource'),
        cacheHome: joinPath(inMemoryExtraProfileRoot, 'cache'),
    };
    const storageService = disposables.add(new BrowserStorageService({ id: 'workspace-storage-test' }, disposables.add(new UserDataProfileService(inMemoryExtraProfile)), logService));
    await storageService.initialize();
    return [disposables, storageService];
}
flakySuite('StorageService (browser)', function () {
    const disposables = new DisposableStore();
    let storageService;
    createSuite({
        setup: async () => {
            const res = await createStorageService();
            disposables.add(res[0]);
            storageService = res[1];
            return storageService;
        },
        teardown: async () => {
            await storageService.clear();
            disposables.clear();
        },
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
flakySuite('StorageService (browser specific)', () => {
    const disposables = new DisposableStore();
    let storageService;
    setup(async () => {
        const res = await createStorageService();
        disposables.add(res[0]);
        storageService = res[1];
    });
    teardown(async () => {
        await storageService.clear();
        disposables.clear();
    });
    test.skip('clear', () => {
        // slow test and also only ever being used as a developer action
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            storageService.store('bar', 'foo', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            storageService.store('bar', 3, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            storageService.store('bar', 'foo', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            storageService.store('bar', 3, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            storageService.store('bar', 'foo', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            storageService.store('bar', 3, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
            await storageService.clear();
            for (const scope of [
                -1 /* StorageScope.APPLICATION */,
                0 /* StorageScope.PROFILE */,
                1 /* StorageScope.WORKSPACE */,
            ]) {
                for (const target of [0 /* StorageTarget.USER */, 1 /* StorageTarget.MACHINE */]) {
                    strictEqual(storageService.get('bar', scope), undefined);
                    strictEqual(storageService.keys(scope, target).length, 0);
                }
            }
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
flakySuite('IndexDBStorageDatabase (browser)', () => {
    const id = 'workspace-storage-db-test';
    const logService = new NullLogService();
    const disposables = new DisposableStore();
    teardown(async () => {
        const storage = disposables.add(await IndexedDBStorageDatabase.create({ id }, logService));
        await storage.clear();
        disposables.clear();
    });
    test('Basics', async () => {
        let storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        // Insert initial data
        storage.set('bar', 'foo');
        storage.set('barNumber', 55);
        storage.set('barBoolean', true);
        storage.set('barUndefined', undefined);
        storage.set('barNull', null);
        strictEqual(storage.get('bar'), 'foo');
        strictEqual(storage.get('barNumber'), '55');
        strictEqual(storage.get('barBoolean'), 'true');
        strictEqual(storage.get('barUndefined'), undefined);
        strictEqual(storage.get('barNull'), undefined);
        strictEqual(storage.size, 3);
        strictEqual(storage.items.size, 3);
        await storage.close();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        // Check initial data still there
        strictEqual(storage.get('bar'), 'foo');
        strictEqual(storage.get('barNumber'), '55');
        strictEqual(storage.get('barBoolean'), 'true');
        strictEqual(storage.get('barUndefined'), undefined);
        strictEqual(storage.get('barNull'), undefined);
        strictEqual(storage.size, 3);
        strictEqual(storage.items.size, 3);
        // Update data
        storage.set('bar', 'foo2');
        storage.set('barNumber', 552);
        strictEqual(storage.get('bar'), 'foo2');
        strictEqual(storage.get('barNumber'), '552');
        await storage.close();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        // Check initial data still there
        strictEqual(storage.get('bar'), 'foo2');
        strictEqual(storage.get('barNumber'), '552');
        strictEqual(storage.get('barBoolean'), 'true');
        strictEqual(storage.get('barUndefined'), undefined);
        strictEqual(storage.get('barNull'), undefined);
        strictEqual(storage.size, 3);
        strictEqual(storage.items.size, 3);
        // Delete data
        storage.delete('bar');
        storage.delete('barNumber');
        storage.delete('barBoolean');
        strictEqual(storage.get('bar', 'undefined'), 'undefined');
        strictEqual(storage.get('barNumber', 'undefinedNumber'), 'undefinedNumber');
        strictEqual(storage.get('barBoolean', 'undefinedBoolean'), 'undefinedBoolean');
        strictEqual(storage.size, 0);
        strictEqual(storage.items.size, 0);
        await storage.close();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        strictEqual(storage.get('bar', 'undefined'), 'undefined');
        strictEqual(storage.get('barNumber', 'undefinedNumber'), 'undefinedNumber');
        strictEqual(storage.get('barBoolean', 'undefinedBoolean'), 'undefinedBoolean');
        strictEqual(storage.size, 0);
        strictEqual(storage.items.size, 0);
    });
    test('Clear', async () => {
        let storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        storage.set('bar', 'foo');
        storage.set('barNumber', 55);
        storage.set('barBoolean', true);
        await storage.close();
        const db = disposables.add(await IndexedDBStorageDatabase.create({ id }, logService));
        storage = disposables.add(new Storage(db));
        await storage.init();
        await db.clear();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        strictEqual(storage.get('bar'), undefined);
        strictEqual(storage.get('barNumber'), undefined);
        strictEqual(storage.get('barBoolean'), undefined);
        strictEqual(storage.size, 0);
        strictEqual(storage.items.size, 0);
    });
    test('Inserts and Deletes at the same time', async () => {
        let storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        storage.set('bar', 'foo');
        storage.set('barNumber', 55);
        storage.set('barBoolean', true);
        await storage.close();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        storage.set('bar', 'foobar');
        const largeItem = JSON.stringify({ largeItem: 'Hello World'.repeat(1000) });
        storage.set('largeItem', largeItem);
        storage.delete('barNumber');
        storage.delete('barBoolean');
        await storage.close();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        strictEqual(storage.get('bar'), 'foobar');
        strictEqual(storage.get('largeItem'), largeItem);
        strictEqual(storage.get('barNumber'), undefined);
        strictEqual(storage.get('barBoolean'), undefined);
    });
    test('Storage change event', async () => {
        const storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        let storageChangeEvents = [];
        disposables.add(storage.onDidChangeStorage((e) => storageChangeEvents.push(e)));
        await storage.init();
        storage.set('notExternal', 42);
        let storageValueChangeEvent = storageChangeEvents.find((e) => e.key === 'notExternal');
        strictEqual(storageValueChangeEvent?.external, false);
        storageChangeEvents = [];
        storage.set('isExternal', 42, true);
        storageValueChangeEvent = storageChangeEvents.find((e) => e.key === 'isExternal');
        strictEqual(storageValueChangeEvent?.external, true);
        storage.delete('notExternal');
        storageValueChangeEvent = storageChangeEvents.find((e) => e.key === 'notExternal');
        strictEqual(storageValueChangeEvent?.external, false);
        storage.delete('isExternal', true);
        storageValueChangeEvent = storageChangeEvents.find((e) => e.key === 'isExternal');
        strictEqual(storageValueChangeEvent?.external, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zdG9yYWdlL3Rlc3QvYnJvd3Nlci9zdG9yYWdlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDcEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBdUIsT0FBTyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRWxHLEtBQUss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
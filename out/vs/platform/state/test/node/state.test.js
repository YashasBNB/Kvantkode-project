/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { readFileSync, promises } from 'fs';
import { tmpdir } from 'os';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { join } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { Promises, writeFileSync } from '../../../../base/node/pfs.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { flakySuite, getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { FileService } from '../../../files/common/fileService.js';
import { DiskFileSystemProvider } from '../../../files/node/diskFileSystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
import { FileStorage } from '../../node/stateService.js';
flakySuite('StateService', () => {
    let testDir;
    let fileService;
    let logService;
    let diskFileSystemProvider;
    const disposables = new DisposableStore();
    setup(() => {
        testDir = getRandomTestPath(tmpdir(), 'vsctests', 'statemainservice');
        logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        diskFileSystemProvider = disposables.add(new DiskFileSystemProvider(logService));
        disposables.add(fileService.registerProvider(Schemas.file, diskFileSystemProvider));
        return promises.mkdir(testDir, { recursive: true });
    });
    teardown(() => {
        disposables.clear();
        return Promises.rm(testDir);
    });
    test('Basics (delayed strategy)', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        let service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        await service.init();
        service.setItem('some.key', 'some.value');
        assert.strictEqual(service.getItem('some.key'), 'some.value');
        service.removeItem('some.key');
        assert.strictEqual(service.getItem('some.key', 'some.default'), 'some.default');
        assert.ok(!service.getItem('some.unknonw.key'));
        service.setItem('some.other.key', 'some.other.value');
        await service.close();
        service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        await service.init();
        assert.strictEqual(service.getItem('some.other.key'), 'some.other.value');
        service.setItem('some.other.key', 'some.other.value');
        assert.strictEqual(service.getItem('some.other.key'), 'some.other.value');
        service.setItem('some.undefined.key', undefined);
        assert.strictEqual(service.getItem('some.undefined.key', 'some.default'), 'some.default');
        service.setItem('some.null.key', null);
        assert.strictEqual(service.getItem('some.null.key', 'some.default'), 'some.default');
        service.setItems([
            { key: 'some.setItems.key1', data: 'some.value' },
            { key: 'some.setItems.key2', data: 0 },
            { key: 'some.setItems.key3', data: true },
            { key: 'some.setItems.key4', data: null },
            { key: 'some.setItems.key5', data: undefined },
        ]);
        assert.strictEqual(service.getItem('some.setItems.key1'), 'some.value');
        assert.strictEqual(service.getItem('some.setItems.key2'), 0);
        assert.strictEqual(service.getItem('some.setItems.key3'), true);
        assert.strictEqual(service.getItem('some.setItems.key4'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key5'), undefined);
        service.setItems([
            { key: 'some.setItems.key1', data: undefined },
            { key: 'some.setItems.key2', data: undefined },
            { key: 'some.setItems.key3', data: undefined },
            { key: 'some.setItems.key4', data: null },
            { key: 'some.setItems.key5', data: undefined },
        ]);
        assert.strictEqual(service.getItem('some.setItems.key1'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key2'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key3'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key4'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key5'), undefined);
        return service.close();
    });
    test('Basics (immediate strategy)', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        let service = disposables.add(new FileStorage(URI.file(storageFile), 0 /* SaveStrategy.IMMEDIATE */, logService, fileService));
        await service.init();
        service.setItem('some.key', 'some.value');
        assert.strictEqual(service.getItem('some.key'), 'some.value');
        service.removeItem('some.key');
        assert.strictEqual(service.getItem('some.key', 'some.default'), 'some.default');
        assert.ok(!service.getItem('some.unknonw.key'));
        service.setItem('some.other.key', 'some.other.value');
        await service.close();
        service = disposables.add(new FileStorage(URI.file(storageFile), 0 /* SaveStrategy.IMMEDIATE */, logService, fileService));
        await service.init();
        assert.strictEqual(service.getItem('some.other.key'), 'some.other.value');
        service.setItem('some.other.key', 'some.other.value');
        assert.strictEqual(service.getItem('some.other.key'), 'some.other.value');
        service.setItem('some.undefined.key', undefined);
        assert.strictEqual(service.getItem('some.undefined.key', 'some.default'), 'some.default');
        service.setItem('some.null.key', null);
        assert.strictEqual(service.getItem('some.null.key', 'some.default'), 'some.default');
        service.setItems([
            { key: 'some.setItems.key1', data: 'some.value' },
            { key: 'some.setItems.key2', data: 0 },
            { key: 'some.setItems.key3', data: true },
            { key: 'some.setItems.key4', data: null },
            { key: 'some.setItems.key5', data: undefined },
        ]);
        assert.strictEqual(service.getItem('some.setItems.key1'), 'some.value');
        assert.strictEqual(service.getItem('some.setItems.key2'), 0);
        assert.strictEqual(service.getItem('some.setItems.key3'), true);
        assert.strictEqual(service.getItem('some.setItems.key4'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key5'), undefined);
        service.setItems([
            { key: 'some.setItems.key1', data: undefined },
            { key: 'some.setItems.key2', data: undefined },
            { key: 'some.setItems.key3', data: undefined },
            { key: 'some.setItems.key4', data: null },
            { key: 'some.setItems.key5', data: undefined },
        ]);
        assert.strictEqual(service.getItem('some.setItems.key1'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key2'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key3'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key4'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key5'), undefined);
        return service.close();
    });
    test('Multiple ops are buffered and applied', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        let service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        await service.init();
        service.setItem('some.key1', 'some.value1');
        service.setItem('some.key2', 'some.value2');
        service.setItem('some.key3', 'some.value3');
        service.setItem('some.key4', 'some.value4');
        service.removeItem('some.key4');
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        await service.close();
        service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        await service.init();
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        return service.close();
    });
    test('Multiple ops (Immediate Strategy)', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        let service = disposables.add(new FileStorage(URI.file(storageFile), 0 /* SaveStrategy.IMMEDIATE */, logService, fileService));
        await service.init();
        service.setItem('some.key1', 'some.value1');
        service.setItem('some.key2', 'some.value2');
        service.setItem('some.key3', 'some.value3');
        service.setItem('some.key4', 'some.value4');
        service.removeItem('some.key4');
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        await service.close();
        service = disposables.add(new FileStorage(URI.file(storageFile), 0 /* SaveStrategy.IMMEDIATE */, logService, fileService));
        await service.init();
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        return service.close();
    });
    test('Used before init', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        const service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        service.setItem('some.key1', 'some.value1');
        service.setItem('some.key2', 'some.value2');
        service.setItem('some.key3', 'some.value3');
        service.setItem('some.key4', 'some.value4');
        service.removeItem('some.key4');
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        await service.init();
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        return service.close();
    });
    test('Used after close', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        const service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        await service.init();
        service.setItem('some.key1', 'some.value1');
        service.setItem('some.key2', 'some.value2');
        service.setItem('some.key3', 'some.value3');
        service.setItem('some.key4', 'some.value4');
        await service.close();
        service.setItem('some.key5', 'some.marker');
        const contents = readFileSync(storageFile).toString();
        assert.ok(contents.includes('some.value1'));
        assert.ok(!contents.includes('some.marker'));
        return service.close();
    });
    test('Closed before init', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        const service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        service.setItem('some.key1', 'some.value1');
        service.setItem('some.key2', 'some.value2');
        service.setItem('some.key3', 'some.value3');
        service.setItem('some.key4', 'some.value4');
        await service.close();
        const contents = readFileSync(storageFile).toString();
        assert.strictEqual(contents.length, 0);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0YXRlL3Rlc3Qvbm9kZS9zdGF0ZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUV2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDdEYsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3hFLE9BQU8sRUFBRSxXQUFXLEVBQWdCLE1BQU0sNEJBQTRCLENBQUE7QUFFdEUsVUFBVSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDL0IsSUFBSSxPQUFlLENBQUE7SUFDbkIsSUFBSSxXQUF5QixDQUFBO0lBQzdCLElB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
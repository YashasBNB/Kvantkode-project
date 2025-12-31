/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { BaseSecretStorageService } from '../../common/secrets.js';
import { InMemoryStorageService } from '../../../storage/common/storage.js';
class TestEncryptionService {
    constructor() {
        this.encryptedPrefix = 'encrypted+'; // prefix to simulate encryption
    }
    setUsePlainTextEncryption() {
        return Promise.resolve();
    }
    getKeyStorageProvider() {
        return Promise.resolve("basic_text" /* KnownStorageProvider.basicText */);
    }
    encrypt(value) {
        return Promise.resolve(this.encryptedPrefix + value);
    }
    decrypt(value) {
        return Promise.resolve(value.substring(this.encryptedPrefix.length));
    }
    isEncryptionAvailable() {
        return Promise.resolve(true);
    }
}
class TestNoEncryptionService {
    setUsePlainTextEncryption() {
        throw new Error('Method not implemented.');
    }
    getKeyStorageProvider() {
        throw new Error('Method not implemented.');
    }
    encrypt(value) {
        throw new Error('Method not implemented.');
    }
    decrypt(value) {
        throw new Error('Method not implemented.');
    }
    isEncryptionAvailable() {
        return Promise.resolve(false);
    }
}
suite('secrets', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('BaseSecretStorageService useInMemoryStorage=true', () => {
        let service;
        let spyEncryptionService;
        let sandbox;
        setup(() => {
            sandbox = sinon.createSandbox();
            spyEncryptionService = sandbox.spy(new TestEncryptionService());
            service = store.add(new BaseSecretStorageService(true, store.add(new InMemoryStorageService()), spyEncryptionService, store.add(new NullLogService())));
        });
        teardown(() => {
            sandbox.restore();
        });
        test('type', async () => {
            assert.strictEqual(service.type, 'unknown');
            // trigger lazy initialization
            await service.set('my-secret', 'my-secret-value');
            assert.strictEqual(service.type, 'in-memory');
        });
        test('set and get', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            await service.set(key, value);
            const result = await service.get(key);
            assert.strictEqual(result, value);
            // Additionally ensure the encryptionservice was not used
            assert.strictEqual(spyEncryptionService.encrypt.callCount, 0);
            assert.strictEqual(spyEncryptionService.decrypt.callCount, 0);
        });
        test('delete', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            await service.set(key, value);
            await service.delete(key);
            const result = await service.get(key);
            assert.strictEqual(result, undefined);
        });
        test('onDidChangeSecret', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            let eventFired = false;
            store.add(service.onDidChangeSecret((changedKey) => {
                assert.strictEqual(changedKey, key);
                eventFired = true;
            }));
            await service.set(key, value);
            assert.strictEqual(eventFired, true);
        });
    });
    suite('BaseSecretStorageService useInMemoryStorage=false', () => {
        let service;
        let spyEncryptionService;
        let sandbox;
        setup(() => {
            sandbox = sinon.createSandbox();
            spyEncryptionService = sandbox.spy(new TestEncryptionService());
            service = store.add(new BaseSecretStorageService(false, store.add(new InMemoryStorageService()), spyEncryptionService, store.add(new NullLogService())));
        });
        teardown(() => {
            sandbox.restore();
        });
        test('type', async () => {
            assert.strictEqual(service.type, 'unknown');
            // trigger lazy initialization
            await service.set('my-secret', 'my-secret-value');
            assert.strictEqual(service.type, 'persisted');
        });
        test('set and get', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            await service.set(key, value);
            const result = await service.get(key);
            assert.strictEqual(result, value);
            // Additionally ensure the encryptionservice was not used
            assert.strictEqual(spyEncryptionService.encrypt.callCount, 1);
            assert.strictEqual(spyEncryptionService.decrypt.callCount, 1);
        });
        test('delete', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            await service.set(key, value);
            await service.delete(key);
            const result = await service.get(key);
            assert.strictEqual(result, undefined);
        });
        test('onDidChangeSecret', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            let eventFired = false;
            store.add(service.onDidChangeSecret((changedKey) => {
                assert.strictEqual(changedKey, key);
                eventFired = true;
            }));
            await service.set(key, value);
            assert.strictEqual(eventFired, true);
        });
    });
    suite('BaseSecretStorageService useInMemoryStorage=false, encryption not available', () => {
        let service;
        let spyNoEncryptionService;
        let sandbox;
        setup(() => {
            sandbox = sinon.createSandbox();
            spyNoEncryptionService = sandbox.spy(new TestNoEncryptionService());
            service = store.add(new BaseSecretStorageService(false, store.add(new InMemoryStorageService()), spyNoEncryptionService, store.add(new NullLogService())));
        });
        teardown(() => {
            sandbox.restore();
        });
        test('type', async () => {
            assert.strictEqual(service.type, 'unknown');
            // trigger lazy initialization
            await service.set('my-secret', 'my-secret-value');
            assert.strictEqual(service.type, 'in-memory');
        });
        test('set and get', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            await service.set(key, value);
            const result = await service.get(key);
            assert.strictEqual(result, value);
            // Additionally ensure the encryptionservice was not used
            assert.strictEqual(spyNoEncryptionService.encrypt.callCount, 0);
            assert.strictEqual(spyNoEncryptionService.decrypt.callCount, 0);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc2VjcmV0cy90ZXN0L2NvbW1vbi9zZWNyZXRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBSy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRSxNQUFNLHFCQUFxQjtJQUEzQjtRQUVTLG9CQUFlLEdBQUcsWUFBWSxDQUFBLENBQUMsZ0NBQWdDO0lBZ0J4RSxDQUFDO0lBZkEseUJBQXlCO1FBQ3hCLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFDRCxxQkFBcUI7UUFDcEIsT0FBTyxPQUFPLENBQUMsT0FBTyxtREFBZ0MsQ0FBQTtJQUN2RCxDQUFDO0lBQ0QsT0FBTyxDQUFDLEtBQWE7UUFDcEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUNELE9BQU8sQ0FBQyxLQUFhO1FBQ3BCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBQ0QscUJBQXFCO1FBQ3BCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJ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
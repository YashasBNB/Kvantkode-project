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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zZWNyZXRzL3Rlc3QvY29tbW9uL3NlY3JldHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFLL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTNFLE1BQU0scUJBQXFCO0lBQTNCO1FBRVMsb0JBQWUsR0FBRyxZQUFZLENBQUEsQ0FBQyxnQ0FBZ0M7SUFnQnhFLENBQUM7SUFmQSx5QkFBeUI7UUFDeEIsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDekIsQ0FBQztJQUNELHFCQUFxQjtRQUNwQixPQUFPLE9BQU8sQ0FBQyxPQUFPLG1EQUFnQyxDQUFBO0lBQ3ZELENBQUM7SUFDRCxPQUFPLENBQUMsS0FBYTtRQUNwQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBQ0QsT0FBTyxDQUFDLEtBQWE7UUFDcEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFDRCxxQkFBcUI7UUFDcEIsT0FB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
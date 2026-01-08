/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { TestSecretStorageService } from '../../../../../platform/secrets/test/common/testSecretStorageService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { McpRegistryInputStorage } from '../../common/mcpRegistryInputStorage.js';
suite('Workbench - MCP - RegistryInputStorage', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let testStorageService;
    let testSecretStorageService;
    let testLogService;
    let mcpInputStorage;
    setup(() => {
        testStorageService = store.add(new TestStorageService());
        testSecretStorageService = new TestSecretStorageService();
        testLogService = store.add(new NullLogService());
        // Create the input storage with APPLICATION scope
        mcpInputStorage = store.add(new McpRegistryInputStorage(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */, testStorageService, testSecretStorageService, testLogService));
    });
    test('setPlainText stores values that can be retrieved with getMap', async () => {
        const values = {
            key1: { value: 'value1' },
            key2: { value: 'value2' },
        };
        await mcpInputStorage.setPlainText(values);
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.key1.value, 'value1');
        assert.strictEqual(result.key2.value, 'value2');
    });
    test('setSecrets stores encrypted values that can be retrieved with getMap', async () => {
        const secrets = {
            secretKey1: { value: 'secretValue1' },
            secretKey2: { value: 'secretValue2' },
        };
        await mcpInputStorage.setSecrets(secrets);
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.secretKey1.value, 'secretValue1');
        assert.strictEqual(result.secretKey2.value, 'secretValue2');
    });
    test('getMap returns combined plain text and secret values', async () => {
        await mcpInputStorage.setPlainText({
            plainKey: { value: 'plainValue' },
        });
        await mcpInputStorage.setSecrets({
            secretKey: { value: 'secretValue' },
        });
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.plainKey.value, 'plainValue');
        assert.strictEqual(result.secretKey.value, 'secretValue');
    });
    test('clear removes specific values', async () => {
        await mcpInputStorage.setPlainText({
            key1: { value: 'value1' },
            key2: { value: 'value2' },
        });
        await mcpInputStorage.setSecrets({
            secretKey1: { value: 'secretValue1' },
            secretKey2: { value: 'secretValue2' },
        });
        // Clear one plain and one secret value
        await mcpInputStorage.clear('key1');
        await mcpInputStorage.clear('secretKey1');
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.key1, undefined);
        assert.strictEqual(result.key2.value, 'value2');
        assert.strictEqual(result.secretKey1, undefined);
        assert.strictEqual(result.secretKey2.value, 'secretValue2');
    });
    test('clearAll removes all values', async () => {
        await mcpInputStorage.setPlainText({
            key1: { value: 'value1' },
        });
        await mcpInputStorage.setSecrets({
            secretKey1: { value: 'secretValue1' },
        });
        mcpInputStorage.clearAll();
        const result = await mcpInputStorage.getMap();
        assert.deepStrictEqual(result, {});
    });
    test('updates to plain text values overwrite existing values', async () => {
        await mcpInputStorage.setPlainText({
            key1: { value: 'value1' },
            key2: { value: 'value2' },
        });
        await mcpInputStorage.setPlainText({
            key1: { value: 'updatedValue1' },
        });
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.key1.value, 'updatedValue1');
        assert.strictEqual(result.key2.value, 'value2');
    });
    test('updates to secret values overwrite existing values', async () => {
        await mcpInputStorage.setSecrets({
            secretKey1: { value: 'secretValue1' },
            secretKey2: { value: 'secretValue2' },
        });
        await mcpInputStorage.setSecrets({
            secretKey1: { value: 'updatedSecretValue1' },
        });
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.secretKey1.value, 'updatedSecretValue1');
        assert.strictEqual(result.secretKey2.value, 'secretValue2');
    });
    test('storage persists values across instances', async () => {
        // Set values on first instance
        await mcpInputStorage.setPlainText({
            key1: { value: 'value1' },
        });
        await mcpInputStorage.setSecrets({
            secretKey1: { value: 'secretValue1' },
        });
        await testStorageService.flush();
        // Create a second instance that should have access to the same storage
        const secondInstance = store.add(new McpRegistryInputStorage(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */, testStorageService, testSecretStorageService, testLogService));
        const result = await secondInstance.getMap();
        assert.strictEqual(result.key1.value, 'value1');
        assert.strictEqual(result.secretKey1.value, 'secretValue1');
        assert.ok(!testStorageService.get('mcpInputs', -1 /* StorageScope.APPLICATION */)?.includes('secretValue1'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnlJbnB1dFN0b3JhZ2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL3Rlc3QvY29tbW9uL21jcFJlZ2lzdHJ5SW5wdXRTdG9yYWdlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBRWxILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWpGLEtBQUssQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7SUFDcEQsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLGtCQUFzQyxDQUFBO0lBQzFDLElBQUksd0JBQWtELENBQUE7SUFDdEQsSUFBSSxjQUEyQixDQUFBO0lBQy9CLElBQUksZUFBd0MsQ0FBQTtJQUU1QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysa0JBQWtCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtRQUN4RCx3QkFBd0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUE7UUFDekQsY0FBYyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFBO1FBRWhELGtEQUFrRDtRQUNsRCxlQUFlLEdBQUcsS0FBSyxDQUFDLEdBQUcs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
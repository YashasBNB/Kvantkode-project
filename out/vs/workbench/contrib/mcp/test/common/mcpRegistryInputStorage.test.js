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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnlJbnB1dFN0b3JhZ2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC90ZXN0L2NvbW1vbi9tY3BSZWdpc3RyeUlucHV0U3RvcmFnZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQ2hDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUVsSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVqRixLQUFLLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO0lBQ3BELE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxrQkFBc0MsQ0FBQTtJQUMxQyxJQUFJLHdCQUFrRCxDQUFBO0lBQ3RELElBQUksY0FBMkIsQ0FBQTtJQUMvQixJQUFJLGVBQXdDLENBQUE7SUFFNUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDLENBQUE7UUFDeEQsd0JBQXdCLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFBO1FBQ3pELGNBQWMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQTtRQUVoRCxrREFBa0Q7UUFDbEQsZUFBZSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQzFC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
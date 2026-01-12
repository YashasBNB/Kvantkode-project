/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { IndexedDB } from '../../browser/indexedDB.js';
import { flakySuite } from '../common/testUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
flakySuite('IndexedDB', () => {
    let indexedDB;
    setup(async () => {
        indexedDB = await IndexedDB.create('vscode-indexeddb-test', 1, ['test-store']);
        await indexedDB.runInTransaction('test-store', 'readwrite', (store) => store.clear());
    });
    teardown(() => {
        indexedDB?.close();
    });
    test('runInTransaction', async () => {
        await indexedDB.runInTransaction('test-store', 'readwrite', (store) => store.add('hello1', 'key1'));
        const value = await indexedDB.runInTransaction('test-store', 'readonly', (store) => store.get('key1'));
        assert.deepStrictEqual(value, 'hello1');
    });
    test('getKeyValues', async () => {
        await indexedDB.runInTransaction('test-store', 'readwrite', (store) => {
            const requests = [];
            requests.push(store.add('hello1', 'key1'));
            requests.push(store.add('hello2', 'key2'));
            requests.push(store.add(true, 'key3'));
            return requests;
        });
        function isValid(value) {
            return typeof value === 'string';
        }
        const keyValues = await indexedDB.getKeyValues('test-store', isValid);
        assert.strictEqual(keyValues.size, 2);
        assert.strictEqual(keyValues.get('key1'), 'hello1');
        assert.strictEqual(keyValues.get('key2'), 'hello2');
    });
    test('hasPendingTransactions', async () => {
        const promise = indexedDB.runInTransaction('test-store', 'readwrite', (store) => store.add('hello2', 'key2'));
        assert.deepStrictEqual(indexedDB.hasPendingTransactions(), true);
        await promise;
        assert.deepStrictEqual(indexedDB.hasPendingTransactions(), false);
    });
    test('close', async () => {
        const promise = indexedDB.runInTransaction('test-store', 'readwrite', (store) => store.add('hello3', 'key3'));
        indexedDB.close();
        assert.deepStrictEqual(indexedDB.hasPendingTransactions(), false);
        try {
            await promise;
            assert.fail('Transaction should be aborted');
        }
        catch (error) { }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL2luZGV4ZWREQi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ25ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTVFLFVBQVUsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQzVCLElBQUksU0FBb0IsQ0FBQTtJQUV4QixLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsU0FBUyxHQUFHLE1BQU0sU0FBUyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sU0FBUyxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUNuQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuQyxNQUFNLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsV0FBVyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDckUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFD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
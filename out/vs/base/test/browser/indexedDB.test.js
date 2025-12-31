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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci9pbmRleGVkREIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU1RSxVQUFVLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtJQUM1QixJQUFJLFNBQW9CLENBQUE7SUFFeEIsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLFNBQVMsR0FBRyxNQUFNLFNBQVMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUM5RSxNQUFNLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsV0FBVyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUN0RixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUE7SUFDbkIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkMsTUFBTSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFdBQVcsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ3JFLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUMzQixDQUFBO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ2xGLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQ2pCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN4QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0IsTUFBTSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFdBQVcsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3JFLE1BQU0sUUFBUSxHQUFpQixFQUFFLENBQUE7WUFDakMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQzFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUMxQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFFdEMsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQyxDQUFDLENBQUE7UUFDRixTQUFTLE9BQU8sQ0FBQyxLQUFjO1lBQzlCLE9BQU8sT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFBO1FBQ2pDLENBQUM7UUFDRCxNQUFNLFNBQVMsR0FBRyxNQUFNLFNBQVMsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3BELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsV0FBVyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDL0UsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQzNCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sT0FBTyxDQUFBO1FBQ2IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNsRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEIsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUMvRSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FDM0IsQ0FBQTtRQUNELFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNqQixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pFLElBQUksQ0FBQztZQUNKLE1BQU0sT0FBTyxDQUFBO1lBQ2IsTUFBTSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQzdDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDLENBQUEsQ0FBQztJQUNuQixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==
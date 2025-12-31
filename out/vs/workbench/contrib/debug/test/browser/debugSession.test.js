/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ThreadStatusScheduler } from '../../browser/debugSession.js';
suite('DebugSession - ThreadStatusScheduler', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('cancel base case', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        await scheduler.run(Promise.resolve([1]), async (threadId, token) => {
            assert.strictEqual(threadId, 1);
            assert.strictEqual(token.isCancellationRequested, false);
            scheduler.cancel([1]);
            assert.strictEqual(token.isCancellationRequested, true);
        });
    });
    test('cancel global', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        await scheduler.run(Promise.resolve([1]), async (threadId, token) => {
            assert.strictEqual(threadId, 1);
            assert.strictEqual(token.isCancellationRequested, false);
            scheduler.cancel(undefined);
            assert.strictEqual(token.isCancellationRequested, true);
        });
    });
    test('cancels when new work comes in', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        let innerCalled = false;
        await scheduler.run(Promise.resolve([1]), async (threadId, token1) => {
            assert.strictEqual(threadId, 1);
            assert.strictEqual(token1.isCancellationRequested, false);
            await scheduler.run(Promise.resolve([1]), async (_threadId, token2) => {
                innerCalled = true;
                assert.strictEqual(token1.isCancellationRequested, true);
                assert.strictEqual(token2.isCancellationRequested, false);
            });
        });
        assert.strictEqual(innerCalled, true);
    });
    test('cancels slower lookups when new lookup is made', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        const innerCalled1 = [];
        const innerCalled2 = [];
        await Promise.all([
            scheduler.run(Promise.resolve()
                .then(() => { })
                .then(() => [1, 3]), async (threadId) => {
                innerCalled1.push(threadId);
            }),
            scheduler.run(Promise.resolve([1, 2]), async (threadId) => {
                innerCalled2.push(threadId);
            }),
        ]);
        assert.deepEqual(innerCalled1, [3]);
        assert.deepEqual(innerCalled2, [1, 2]);
    });
    test('allows work with other IDs', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        let innerCalled = false;
        await scheduler.run(Promise.resolve([1]), async (threadId, token1) => {
            assert.strictEqual(threadId, 1);
            assert.strictEqual(token1.isCancellationRequested, false);
            await scheduler.run(Promise.resolve([2]), async (_threadId, token2) => {
                innerCalled = true;
                assert.strictEqual(token1.isCancellationRequested, false);
                assert.strictEqual(token2.isCancellationRequested, false);
            });
        });
        assert.strictEqual(innerCalled, true);
    });
    test('cancels when called during reslution', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        let innerCalled = false;
        await scheduler.run(Promise.resolve()
            .then(() => scheduler.cancel([1]))
            .then(() => [1]), async () => {
            innerCalled = true;
        });
        assert.strictEqual(innerCalled, false);
    });
    test('global cancels when called during reslution', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        let innerCalled = false;
        await scheduler.run(Promise.resolve()
            .then(() => scheduler.cancel(undefined))
            .then(() => [1]), async () => {
            innerCalled = true;
        });
        assert.strictEqual(innerCalled, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXNzaW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2Jyb3dzZXIvZGVidWdTZXNzaW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJFLEtBQUssQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7SUFDbEQsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUVwRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkMsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLHFCQUFxQixFQUFFLENBQUMsQ0FBQTtRQUVyRCxNQUFNLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN4RCxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4RCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxD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
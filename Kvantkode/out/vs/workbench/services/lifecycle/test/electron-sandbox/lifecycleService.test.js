/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { WillShutdownJoinerOrder } from '../../common/lifecycle.js';
import { NativeLifecycleService } from '../../electron-sandbox/lifecycleService.js';
import { workbenchInstantiationService } from '../../../../test/electron-sandbox/workbenchTestServices.js';
suite('Lifecycleservice', function () {
    let lifecycleService;
    const disposables = new DisposableStore();
    class TestLifecycleService extends NativeLifecycleService {
        testHandleBeforeShutdown(reason) {
            return super.handleBeforeShutdown(reason);
        }
        testHandleWillShutdown(reason) {
            return super.handleWillShutdown(reason);
        }
    }
    setup(async () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        lifecycleService = disposables.add(instantiationService.createInstance(TestLifecycleService));
    });
    teardown(async () => {
        disposables.clear();
    });
    test('onBeforeShutdown - final veto called after other vetos', async function () {
        let vetoCalled = false;
        let finalVetoCalled = false;
        const order = [];
        disposables.add(lifecycleService.onBeforeShutdown((e) => {
            e.veto(new Promise((resolve) => {
                vetoCalled = true;
                order.push(1);
                resolve(false);
            }), 'test');
        }));
        disposables.add(lifecycleService.onBeforeShutdown((e) => {
            e.finalVeto(() => {
                return new Promise((resolve) => {
                    finalVetoCalled = true;
                    order.push(2);
                    resolve(true);
                });
            }, 'test');
        }));
        const veto = await lifecycleService.testHandleBeforeShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(veto, true);
        assert.strictEqual(vetoCalled, true);
        assert.strictEqual(finalVetoCalled, true);
        assert.strictEqual(order[0], 1);
        assert.strictEqual(order[1], 2);
    });
    test('onBeforeShutdown - final veto not called when veto happened before', async function () {
        let vetoCalled = false;
        let finalVetoCalled = false;
        disposables.add(lifecycleService.onBeforeShutdown((e) => {
            e.veto(new Promise((resolve) => {
                vetoCalled = true;
                resolve(true);
            }), 'test');
        }));
        disposables.add(lifecycleService.onBeforeShutdown((e) => {
            e.finalVeto(() => {
                return new Promise((resolve) => {
                    finalVetoCalled = true;
                    resolve(true);
                });
            }, 'test');
        }));
        const veto = await lifecycleService.testHandleBeforeShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(veto, true);
        assert.strictEqual(vetoCalled, true);
        assert.strictEqual(finalVetoCalled, false);
    });
    test('onBeforeShutdown - veto with error is treated as veto', async function () {
        disposables.add(lifecycleService.onBeforeShutdown((e) => {
            e.veto(new Promise((resolve, reject) => {
                reject(new Error('Fail'));
            }), 'test');
        }));
        const veto = await lifecycleService.testHandleBeforeShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(veto, true);
    });
    test('onBeforeShutdown - final veto with error is treated as veto', async function () {
        disposables.add(lifecycleService.onBeforeShutdown((e) => {
            e.finalVeto(() => new Promise((resolve, reject) => {
                reject(new Error('Fail'));
            }), 'test');
        }));
        const veto = await lifecycleService.testHandleBeforeShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(veto, true);
    });
    test('onWillShutdown - join', async function () {
        let joinCalled = false;
        disposables.add(lifecycleService.onWillShutdown((e) => {
            e.join(new Promise((resolve) => {
                joinCalled = true;
                resolve();
            }), { id: 'test', label: 'test' });
        }));
        await lifecycleService.testHandleWillShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(joinCalled, true);
    });
    test('onWillShutdown - join with error is handled', async function () {
        let joinCalled = false;
        disposables.add(lifecycleService.onWillShutdown((e) => {
            e.join(new Promise((resolve, reject) => {
                joinCalled = true;
                reject(new Error('Fail'));
            }), { id: 'test', label: 'test' });
        }));
        await lifecycleService.testHandleWillShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(joinCalled, true);
    });
    test('onWillShutdown - join order', async function () {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const order = [];
            disposables.add(lifecycleService.onWillShutdown((e) => {
                e.join(async () => {
                    order.push('disconnect start');
                    await timeout(1);
                    order.push('disconnect end');
                }, { id: 'test', label: 'test', order: WillShutdownJoinerOrder.Last });
                e.join((async () => {
                    order.push('default start');
                    await timeout(1);
                    order.push('default end');
                })(), { id: 'test', label: 'test', order: WillShutdownJoinerOrder.Default });
            }));
            await lifecycleService.testHandleWillShutdown(2 /* ShutdownReason.QUIT */);
            assert.deepStrictEqual(order, [
                'default start',
                'default end',
                'disconnect start',
                'disconnect end',
            ]);
        });
    });
    test('willShutdown is set when shutting down', async function () {
        let willShutdownSet = false;
        disposables.add(lifecycleService.onWillShutdown((e) => {
            e.join(new Promise((resolve) => {
                if (lifecycleService.willShutdown) {
                    willShutdownSet = true;
                    resolve();
                }
            }), { id: 'test', label: 'test' });
        }));
        await lifecycleService.testHandleWillShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(willShutdownSet, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbGlmZWN5Y2xlL3Rlc3QvZWxlY3Ryb24tc2FuZGJveC9saWZlY3ljbGVTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDM0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFrQix1QkFBdUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTFHLEtBQUssQ0FBQyxrQkFBa0IsRUFBRTtJQUN6QixJQUFJLGdCQUFzQyxDQUFBO0lBQzFDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsTUFBTSxvQkFBcUIsU0FBUSxzQkFBc0I7UUFDeEQsd0JBQXdCLENBQUMsTUFBc0I7WUFDOUMsT0FBTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUMsQ0FBQztRQUVELHNCQUFzQixDQUFDLE1BQXNCO1lBQzVDLE9BQU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3hDLENBQUM7S0FDRDtJQUVE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
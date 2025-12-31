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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xpZmVjeWNsZS90ZXN0L2VsZWN0cm9uLXNhbmRib3gvbGlmZWN5Y2xlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBa0IsdUJBQXVCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNuRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUUxRyxLQUFLLENBQUMsa0JBQWtCLEVBQUU7SUFDekIsSUFBSSxnQkFBc0MsQ0FBQTtJQUMxQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRXpDLE1BQU0sb0JBQXFCLFNBQVEsc0JBQXNCO1FBQ3hELHdCQUF3QixDQUFDLE1BQXNCO1lBQzlDLE9BQU8sS0FBSyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzFDLENBQUM7UUFFRCxzQkFBc0IsQ0FBQyxNQUFzQjtZQUM1QyxPQUFPLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN4QyxDQUFDO0tBQ0Q7SUFFRCxLQUFLLENBQUMsS0FBSyxJQUFJLEVB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
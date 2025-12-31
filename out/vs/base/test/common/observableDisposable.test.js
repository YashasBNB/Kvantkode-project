/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { spy } from 'sinon';
import { wait, waitRandom } from './testUtils.js';
import { Disposable } from '../../common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { assertNotDisposed, ObservableDisposable } from '../../common/observableDisposable.js';
suite('ObservableDisposable', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('tracks `disposed` state', () => {
        // this is an abstract class, so we have to create
        // an anonymous class that extends it
        const object = new (class extends ObservableDisposable {
        })();
        disposables.add(object);
        assert(object instanceof ObservableDisposable, 'Object must be instance of ObservableDisposable.');
        assert(object instanceof Disposable, 'Object must be instance of Disposable.');
        assert(!object.disposed, 'Object must not be disposed yet.');
        object.dispose();
        assert(object.disposed, 'Object must be disposed.');
    });
    suite('onDispose', () => {
        test('fires the event on dispose', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new (class extends ObservableDisposable {
            })();
            disposables.add(object);
            assert(!object.disposed, 'Object must not be disposed yet.');
            const onDisposeSpy = spy(() => { });
            object.onDispose(onDisposeSpy);
            assert(onDisposeSpy.notCalled, '`onDispose` callback must not be called yet.');
            await waitRandom(10);
            assert(onDisposeSpy.notCalled, '`onDispose` callback must not be called yet.');
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await wait(1);
            /**
             * Validate that the callback was called.
             */
            assert(object.disposed, 'Object must be disposed.');
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must be called.');
            /**
             * Validate that the callback is not called again.
             */
            object.dispose();
            object.dispose();
            await waitRandom(10);
            object.dispose();
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must not be called again.');
            assert(object.disposed, 'Object must be disposed.');
        });
        test('executes callback immediately if already disposed', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new (class extends ObservableDisposable {
            })();
            disposables.add(object);
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await wait(1);
            const onDisposeSpy = spy(() => { });
            object.onDispose(onDisposeSpy);
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must be called immediately.');
            await waitRandom(10);
            object.onDispose(onDisposeSpy);
            assert(onDisposeSpy.calledTwice, '`onDispose` callback must be called immediately the second time.');
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await wait(1);
            assert(onDisposeSpy.calledTwice, '`onDispose` callback must not be called again on dispose.');
        });
    });
    suite('asserts', () => {
        test('not disposed (method)', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new (class extends ObservableDisposable {
            })();
            disposables.add(object);
            assert.doesNotThrow(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            await waitRandom(10);
            assert.doesNotThrow(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await wait(1);
            assert.throws(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            await waitRandom(10);
            assert.throws(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
        });
        test('not disposed (function)', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new (class extends ObservableDisposable {
            })();
            disposables.add(object);
            assert.doesNotThrow(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            await waitRandom(10);
            assert.doesNotThrow(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await wait(1);
            assert.throws(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            await waitRandom(10);
            assert.throws(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZURpc3Bvc2FibGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vb2JzZXJ2YWJsZURpc3Bvc2FibGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLE9BQU8sQ0FBQTtBQUMzQixPQUFPLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFOUYsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNsQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRTdELElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsa0RBQWtEO1FBQ2xELHFDQUFxQztRQUNyQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLG9CQUFvQjtTQUFHLENBQUMsRUFBRSxDQUFBO1FBQzVELFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFdkIsTUFBTSxDQUNMLE1BQU0sWUFBWSxvQkFBb0IsRUFDdEMsa0RBQWtELENBQ2xELENBQUE7UUFFRCxNQUFNLENBQUMsTUFBTSxZQUFZLFVBQVUsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsa0NBQWtDLENBQUMsQ0FBQTtRQUU1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
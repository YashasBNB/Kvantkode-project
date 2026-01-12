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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZURpc3Bvc2FibGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9vYnNlcnZhYmxlRGlzcG9zYWJsZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sT0FBTyxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDakQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3RELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU5RixLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUNwQyxrREFBa0Q7UUFDbEQscUNBQXFDO1FBQ3JDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsb0JBQW9CO1NBQUcsQ0FBQyxFQUFFLENBQUE7UUFDNUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUV2QixNQUFNLENBQ0wsTUFBTSxZQUFZLG9CQUFvQixFQUN0QyxrREFBa0QsQ0FDbEQsQ0FBQTtRQUVELE1BQU0sQ0FBQyxNQUFNLFlBQVksVUFBVSxFQUFFLHdDQUF3QyxDQUFDLENBQUE7UUFFOUUsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFB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
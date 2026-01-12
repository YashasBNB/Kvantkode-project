/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import assert from 'assert';
import { Disposable } from '../../common/lifecycle.js';
import { CancellationToken } from '../../common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { cancelPreviousCalls } from '../../common/decorators/cancelPreviousCalls.js';
suite('cancelPreviousCalls decorator', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    class MockDisposable extends Disposable {
        constructor() {
            super(...arguments);
            /**
             * Arguments that the {@linkcode doSomethingAsync} method was called with.
             */
            this.callArgs1 = [];
            /**
             * Arguments that the {@linkcode doSomethingElseAsync} method was called with.
             */
            this.callArgs2 = [];
        }
        /**
         * Returns the arguments that the {@linkcode doSomethingAsync} method was called with.
         */
        get callArguments1() {
            return this.callArgs1;
        }
        /**
         * Returns the arguments that the {@linkcode doSomethingElseAsync} method was called with.
         */
        get callArguments2() {
            return this.callArgs2;
        }
        async doSomethingAsync(arg1, arg2, cancellationToken) {
            this.callArgs1.push([arg1, arg2, cancellationToken]);
            await new Promise((resolve) => setTimeout(resolve, 25));
        }
        async doSomethingElseAsync(arg1, arg2, cancellationToken) {
            this.callArgs2.push([arg1, arg2, cancellationToken]);
            await new Promise((resolve) => setTimeout(resolve, 25));
        }
    }
    __decorate([
        cancelPreviousCalls
    ], MockDisposable.prototype, "doSomethingAsync", null);
    __decorate([
        cancelPreviousCalls
    ], MockDisposable.prototype, "doSomethingElseAsync", null);
    test('should call method with CancellationToken', async () => {
        const instance = disposables.add(new MockDisposable());
        await instance.doSomethingAsync(1, 'foo');
        const callArguments = instance.callArguments1;
        assert.strictEqual(callArguments.length, 1, `The 'doSomethingAsync' method must be called just once.`);
        const args = callArguments[0];
        assert(args.length === 3, `The 'doSomethingAsync' method must be called with '3' arguments, got '${args.length}'.`);
        const arg1 = args[0];
        const arg2 = args[1];
        const arg3 = args[2];
        assert.strictEqual(arg1, 1, `The 'doSomethingAsync' method call must have the correct 1st argument.`);
        assert.strictEqual(arg2, 'foo', `The 'doSomethingAsync' method call must have the correct 2nd argument.`);
        assert(CancellationToken.isCancellationToken(arg3), `The last argument of the 'doSomethingAsync' method must be a 'CancellationToken', got '${arg3}'.`);
        assert(arg3.isCancellationRequested === false, `The 'CancellationToken' argument must not yet be cancelled.`);
        assert(instance.callArguments2.length === 0, `The 'doSomethingElseAsync' method must not be called.`);
    });
    test('cancel token of the previous call when method is called again', async () => {
        const instance = disposables.add(new MockDisposable());
        instance.doSomethingAsync(1, 'foo');
        await new Promise((resolve) => setTimeout(resolve, 10));
        instance.doSomethingAsync(2, 'bar');
        const callArguments = instance.callArguments1;
        assert.strictEqual(callArguments.length, 2, `The 'doSomethingAsync' method must be called twice.`);
        const call1Args = callArguments[0];
        assert(call1Args.length === 3, `The first call of the 'doSomethingAsync' method must have '3' arguments, got '${call1Args.length}'.`);
        assert.strictEqual(call1Args[0], 1, `The first call of the 'doSomethingAsync' method must have the correct 1st argument.`);
        assert.strictEqual(call1Args[1], 'foo', `The first call of the 'doSomethingAsync' method must have the correct 2nd argument.`);
        assert(CancellationToken.isCancellationToken(call1Args[2]), `The first call of the 'doSomethingAsync' method must have the 'CancellationToken' as the 3rd argument.`);
        assert(call1Args[2].isCancellationRequested === true, `The 'CancellationToken' of the first call must be cancelled.`);
        const call2Args = callArguments[1];
        assert(call2Args.length === 3, `The second call of the 'doSomethingAsync' method must have '3' arguments, got '${call1Args.length}'.`);
        assert.strictEqual(call2Args[0], 2, `The second call of the 'doSomethingAsync' method must have the correct 1st argument.`);
        assert.strictEqual(call2Args[1], 'bar', `The second call of the 'doSomethingAsync' method must have the correct 2nd argument.`);
        assert(CancellationToken.isCancellationToken(call2Args[2]), `The second call of the 'doSomethingAsync' method must have the 'CancellationToken' as the 3rd argument.`);
        assert(call2Args[2].isCancellationRequested === false, `The 'CancellationToken' of the second call must be cancelled.`);
        assert(instance.callArguments2.length === 0, `The 'doSomethingElseAsync' method must not be called.`);
    });
    test('different method calls must not interfere with each other', async () => {
        const instance = disposables.add(new MockDisposable());
        instance.doSomethingAsync(10, 'baz');
        await new Promise((resolve) => setTimeout(resolve, 10));
        instance.doSomethingElseAsync(25, 'qux');
        assert.strictEqual(instance.callArguments1.length, 1, `The 'doSomethingAsync' method must be called once.`);
        const call1Args = instance.callArguments1[0];
        assert(call1Args.length === 3, `The first call of the 'doSomethingAsync' method must have '3' arguments, got '${call1Args.length}'.`);
        assert.strictEqual(call1Args[0], 10, `The first call of the 'doSomethingAsync' method must have the correct 1st argument.`);
        assert.strictEqual(call1Args[1], 'baz', `The first call of the 'doSomethingAsync' method must have the correct 2nd argument.`);
        assert(CancellationToken.isCancellationToken(call1Args[2]), `The first call of the 'doSomethingAsync' method must have the 'CancellationToken' as the 3rd argument.`);
        assert(call1Args[2].isCancellationRequested === false, `The 'CancellationToken' of the first call must not be cancelled.`);
        assert.strictEqual(instance.callArguments2.length, 1, `The 'doSomethingElseAsync' method must be called once.`);
        const call2Args = instance.callArguments2[0];
        assert(call2Args.length === 3, `The first call of the 'doSomethingElseAsync' method must have '3' arguments, got '${call1Args.length}'.`);
        assert.strictEqual(call2Args[0], 25, `The first call of the 'doSomethingElseAsync' method must have the correct 1st argument.`);
        assert.strictEqual(call2Args[1], 'qux', `The first call of the 'doSomethingElseAsync' method must have the correct 2nd argument.`);
        assert(CancellationToken.isCancellationToken(call2Args[2]), `The first call of the 'doSomethingElseAsync' method must have the 'CancellationToken' as the 3rd argument.`);
        assert(call2Args[2].isCancellationRequested === false, `The 'CancellationToken' of the second call must be cancelled.`);
        instance.doSomethingElseAsync(105, 'uxi');
        assert.strictEqual(instance.callArguments1.length, 1, `The 'doSomethingAsync' method must be called once.`);
        assert.strictEqual(instance.callArguments2.length, 2, `The 'doSomethingElseAsync' method must be called twice.`);
        assert(call1Args[2].isCancellationRequested === false, `The 'CancellationToken' of the first call must not be cancelled.`);
        const call3Args = instance.callArguments2[1];
        assert(CancellationToken.isCancellationToken(call3Args[2]), `The last argument of the second call of the 'doSomethingElseAsync' method must be a 'CancellationToken'.`);
        assert(call2Args[2].isCancellationRequested, `The 'CancellationToken' of the first call must be cancelled.`);
        assert(call3Args[2].isCancellationRequested === false, `The 'CancellationToken' of the second call must not be cancelled.`);
        assert.strictEqual(call3Args[0], 105, `The second call of the 'doSomethingElseAsync' method must have the correct 1st argument.`);
        assert.strictEqual(call3Args[1], 'uxi', `The second call of the 'doSomethingElseAsync' method must have the correct 2nd argument.`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuY2VsUHJldmlvdXNDYWxscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2NhbmNlbFByZXZpb3VzQ2FsbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNwRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVwRixLQUFLLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO0lBQzNDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsTUFBTSxjQUFlLFNBQVEsVUFBVTtRQUF2Qzs7WUFDQzs7ZUFFRztZQUNjLGNBQVMsR0FBc0QsRUFBRSxDQUFBO1lBRWxGOztlQUVHO1lBQ2MsY0FBUyxHQUFzRCxFQUFFLENBQUE7UUFxQ25GLENBQUM7UUFuQ0E7O1dBRUc7UUFDSCxJQUFXLGNBQWM7WUFDeEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO1FBQ3RCLENBQUM7UUFFRDs7V0FFRztRQUNILElBQVcsY0FBYztZQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7UUFDdEIsQ0FBQztRQUdLLEFBQU4sS0FBSyxDQUFDLGdCQUFnQixDQUNyQixJQUFZLEVBQ1osSUFBWSxFQUNaLGlCQUFxQztZQUVyQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxD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
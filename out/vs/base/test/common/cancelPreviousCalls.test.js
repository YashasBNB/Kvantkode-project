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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuY2VsUHJldmlvdXNDYWxscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9jYW5jZWxQcmV2aW91c0NhbGxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDcEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFcEYsS0FBSyxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtJQUMzQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRTdELE1BQU0sY0FBZSxTQUFRLFVBQVU7UUFBdkM7O1lBQ0M7O2VBRUc7WUFDYyxjQUFTLEdBQXNELEVBQUUsQ0FBQTtZQUVsRjs7ZUFFRztZQUNjLGNBQVMsR0FBc0QsRUFBRSxDQUFBO1FBcUNuRixDQUFDO1FBbkNBOztXQUVHO1FBQ0gsSUFBVyxjQUFjO1lBQ3hCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtRQUN0QixDQUFDO1FBRUQ7O1dBRUc7UUFDSCxJQUFXLGNBQWM7WUFDeEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO1FBQ3RCLENBQUM7UUFHSyxBQUFOLEtBQUssQ0FBQyxnQkFBZ0IsQ0FDckIsSUFBWSxFQUNaLElBQVksRUFDWixpQkFBcUM7WUFFckMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtZ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
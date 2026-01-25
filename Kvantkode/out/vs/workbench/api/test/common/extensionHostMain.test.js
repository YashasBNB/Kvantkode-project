/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { errorHandler, onUnexpectedError } from '../../../../base/common/errors.js';
import { isFirefox, isSafari } from '../../../../base/common/platform.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { InstantiationService } from '../../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILogService, NullLogService } from '../../../../platform/log/common/log.js';
import { ExtensionPaths, IExtHostExtensionService } from '../../common/extHostExtensionService.js';
import { IExtHostRpcService } from '../../common/extHostRpcService.js';
import { IExtHostTelemetry } from '../../common/extHostTelemetry.js';
import { ErrorHandler } from '../../common/extensionHostMain.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
suite('ExtensionHostMain#ErrorHandler - Wrapping prepareStackTrace can cause slowdown and eventual stack overflow #184926 ', function () {
    if (isFirefox || isSafari) {
        return;
    }
    const extensionsIndex = TernarySearchTree.forUris();
    const mainThreadExtensionsService = new (class extends mock() {
        $onExtensionRuntimeError(extensionId, data) { }
        $onUnexpectedError(err) { }
    })();
    const collection = new ServiceCollection([ILogService, new NullLogService()], [
        IExtHostTelemetry,
        new (class extends mock() {
            onExtensionError(extension, error) {
                return true;
            }
        })(),
    ], [
        IExtHostExtensionService,
        new (class extends mock() {
            getExtensionPathIndex() {
                return new (class extends ExtensionPaths {
                    findSubstr(key) {
                        findSubstrCount++;
                        return nullExtensionDescription;
                    }
                })(extensionsIndex);
            }
        })(),
    ], [
        IExtHostRpcService,
        new (class extends mock() {
            getProxy(identifier) {
                return mainThreadExtensionsService;
            }
        })(),
    ]);
    const originalPrepareStackTrace = Error.prepareStackTrace;
    const insta = new InstantiationService(collection, false);
    let existingErrorHandler;
    let findSubstrCount = 0;
    ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(async function () {
        existingErrorHandler = errorHandler.getUnexpectedErrorHandler();
        await insta.invokeFunction(ErrorHandler.installFullHandler);
    });
    suiteTeardown(function () {
        errorHandler.setUnexpectedErrorHandler(existingErrorHandler);
    });
    setup(async function () {
        findSubstrCount = 0;
    });
    teardown(() => {
        Error.prepareStackTrace = originalPrepareStackTrace;
    });
    test('basics', function () {
        const err = new Error('test1');
        onUnexpectedError(err);
        assert.strictEqual(findSubstrCount, 1);
    });
    test('set/reset prepareStackTrace-callback', function () {
        const original = Error.prepareStackTrace;
        Error.prepareStackTrace = (_error, _stack) => 'stack';
        const probeErr = new Error();
        const stack = probeErr.stack;
        assert.ok(stack);
        Error.prepareStackTrace = original;
        assert.strictEqual(findSubstrCount, 1);
        // already checked
        onUnexpectedError(probeErr);
        assert.strictEqual(findSubstrCount, 1);
        // one more error
        const err = new Error('test2');
        onUnexpectedError(err);
        assert.strictEqual(findSubstrCount, 2);
    });
    test('wrap prepareStackTrace-callback', function () {
        function do_something_else(params) {
            return params;
        }
        const original = Error.prepareStackTrace;
        Error.prepareStackTrace = (...args) => {
            return do_something_else(original?.(...args));
        };
        const probeErr = new Error();
        const stack = probeErr.stack;
        assert.ok(stack);
        onUnexpectedError(probeErr);
        assert.strictEqual(findSubstrCount, 1);
    });
    test('prevent rewrapping', function () {
        let do_something_count = 0;
        function do_something(params) {
            do_something_count++;
        }
        Error.prepareStackTrace = (result, stack) => {
            do_something(stack);
            return 'fakestack';
        };
        for (let i = 0; i < 2_500; ++i) {
            Error.prepareStackTrace = Error.prepareStackTrace;
        }
        const probeErr = new Error();
        const stack = probeErr.stack;
        assert.strictEqual(stack, 'fakestack');
        onUnexpectedError(probeErr);
        assert.strictEqual(findSubstrCount, 1);
        const probeErr2 = new Error();
        onUnexpectedError(probeErr2);
        assert.strictEqual(findSubstrCount, 2);
        assert.strictEqual(do_something_count, 2);
    });
    suite('https://gist.github.com/thecrypticace/f0f2e182082072efdaf0f8e1537d2cce', function () {
        test('Restored, separate operations', () => {
            // Actual Test
            let original;
            // Operation 1
            original = Error.prepareStackTrace;
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            const err1 = new Error();
            assert.ok(err1.stack);
            assert.strictEqual(findSubstrCount, 1);
            Error.prepareStackTrace = original;
            // Operation 2
            original = Error.prepareStackTrace;
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            assert.strictEqual(findSubstrCount, 2);
            Error.prepareStackTrace = original;
            // Operation 3
            original = Error.prepareStackTrace;
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            assert.strictEqual(findSubstrCount, 3);
            Error.prepareStackTrace = original;
            // Operation 4
            original = Error.prepareStackTrace;
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            assert.strictEqual(findSubstrCount, 4);
            Error.prepareStackTrace = original;
            // Back to Operation 1
            assert.ok(err1.stack);
            assert.strictEqual(findSubstrCount, 4);
        });
        test('Never restored, separate operations', () => {
            // Operation 1
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            // Operation 2
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            // Operation 3
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            // Operation 4
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
        });
        test('Restored, too many uses before restoration', async () => {
            const original = Error.prepareStackTrace;
            Error.prepareStackTrace = (_, stack) => stack;
            // Operation 1 — more uses of `prepareStackTrace`
            for (let i = 0; i < 10_000; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            Error.prepareStackTrace = original;
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdE1haW4udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2NvbW1vbi9leHRlbnNpb25Ib3N0TWFpbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQW1CLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFaEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBSy9GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFLcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUc1RixLQUFLLENBQ0oscUhBQXFILEVBQ3JIO0lB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
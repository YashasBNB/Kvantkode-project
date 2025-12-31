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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdE1haW4udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9jb21tb24vZXh0ZW5zaW9uSG9zdE1haW4udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFtQixZQUFZLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRWhGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUsvRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBS3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHNUYsS0FBSyxDQUNKLHFIQUFxSCxFQUNySDtJQUNDLElB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
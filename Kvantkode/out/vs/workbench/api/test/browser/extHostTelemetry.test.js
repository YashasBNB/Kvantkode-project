/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExtensionIdentifier, } from '../../../../platform/extensions/common/extensions.js';
import { DEFAULT_LOG_LEVEL, LogLevel } from '../../../../platform/log/common/log.js';
import { TestTelemetryLoggerService } from '../../../../platform/telemetry/test/common/telemetryLogAppender.test.js';
import { ExtHostTelemetry, ExtHostTelemetryLogger } from '../../common/extHostTelemetry.js';
import { mock } from '../../../test/common/workbenchTestServices.js';
suite('ExtHostTelemetry', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    const mockEnvironment = {
        isExtensionDevelopmentDebug: false,
        extensionDevelopmentLocationURI: undefined,
        extensionTestsLocationURI: undefined,
        appRoot: undefined,
        appName: 'test',
        isExtensionTelemetryLoggingOnly: false,
        appHost: 'test',
        appLanguage: 'en',
        globalStorageHome: URI.parse('fake'),
        workspaceStorageHome: URI.parse('fake'),
        appUriScheme: 'test',
    };
    const mockTelemetryInfo = {
        firstSessionDate: '2020-01-01T00:00:00.000Z',
        sessionId: 'test',
        machineId: 'test',
        sqmId: 'test',
        devDeviceId: 'test',
    };
    const mockRemote = {
        authority: 'test',
        isRemote: false,
        connectionData: null,
    };
    const mockExtensionIdentifier = {
        identifier: new ExtensionIdentifier('test-extension'),
        targetPlatform: "universal" /* TargetPlatform.UNIVERSAL */,
        isBuiltin: true,
        isUserBuiltin: true,
        isUnderDevelopment: true,
        name: 'test-extension',
        publisher: 'vscode',
        version: '1.0.0',
        engines: { vscode: '*' },
        extensionLocation: URI.parse('fake'),
        enabledApiProposals: undefined,
        preRelease: false,
    };
    const createExtHostTelemetry = () => {
        const extensionTelemetry = new ExtHostTelemetry(false, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.environment = mockEnvironment;
                this.telemetryInfo = mockTelemetryInfo;
                this.remote = mockRemote;
            }
        })(), new TestTelemetryLoggerService(DEFAULT_LOG_LEVEL));
        store.add(extensionTelemetry);
        extensionTelemetry.$initializeTelemetryLevel(3 /* TelemetryLevel.USAGE */, true, {
            usage: true,
            error: true,
        });
        return extensionTelemetry;
    };
    const createLogger = (functionSpy, extHostTelemetry, options) => {
        const extensionTelemetry = extHostTelemetry ?? createExtHostTelemetry();
        // This is the appender which the extension would contribute
        const appender = {
            sendEventData: (eventName, data) => {
                functionSpy.dataArr.push({ eventName, data });
            },
            sendErrorData: (exception, data) => {
                functionSpy.exceptionArr.push({ exception, data });
            },
            flush: () => {
                functionSpy.flushCalled = true;
            },
        };
        if (extHostTelemetry) {
            store.add(extHostTelemetry);
        }
        const logger = extensionTelemetry.instantiateLogger(mockExtensionIdentifier, appender, options);
        store.add(logger);
        return logger;
    };
    test('Validate sender instances', function () {
        assert.throws(() => ExtHostTelemetryLogger.validateSender(null));
        assert.throws(() => ExtHostTelemetryLogger.validateSender(1));
        assert.throws(() => ExtHostTelemetryLogger.validateSender({}));
        assert.throws(() => {
            ExtHostTelemetryLogger.validateSender({
                sendErrorData: () => { },
                sendEventData: true,
            });
        });
        assert.throws(() => {
            ExtHostTelemetryLogger.validateSender({
                sendErrorData: 123,
                sendEventData: () => { },
            });
        });
        assert.throws(() => {
            ExtHostTelemetryLogger.validateSender({
                sendErrorData: () => { },
                sendEventData: () => { },
                flush: true,
            });
        });
    });
    test('Ensure logger gets proper telemetry level during initialization', function () {
        const extensionTelemetry = createExtHostTelemetry();
        let config = extensionTelemetry.getTelemetryDetails();
        assert.strictEqual(config.isCrashEnabled, true);
        assert.strictEqual(config.isUsageEnabled, true);
        assert.strictEqual(config.isErrorsEnabled, true);
        // Initialize would never be called twice, but this is just for testing
        extensionTelemetry.$initializeTelemetryLevel(2 /* TelemetryLevel.ERROR */, true, {
            usage: true,
            error: true,
        });
        config = extensionTelemetry.getTelemetryDetails();
        assert.strictEqual(config.isCrashEnabled, true);
        assert.strictEqual(config.isUsageEnabled, false);
        assert.strictEqual(config.isErrorsEnabled, true);
        extensionTelemetry.$initializeTelemetryLevel(1 /* TelemetryLevel.CRASH */, true, {
            usage: true,
            error: true,
        });
        config = extensionTelemetry.getTelemetryDetails();
        assert.strictEqual(config.isCrashEnabled, true);
        assert.strictEqual(config.isUsageEnabled, false);
        assert.strictEqual(config.isErrorsEnabled, false);
        extensionTelemetry.$initializeTelemetryLevel(3 /* TelemetryLevel.USAGE */, true, {
            usage: false,
            error: true,
        });
        config = extensionTelemetry.getTelemetryDetails();
        assert.strictEqual(config.isCrashEnabled, true);
        assert.strictEqual(config.isUsageEnabled, false);
        assert.strictEqual(config.isErrorsEnabled, true);
        extensionTelemetry.dispose();
    });
    test('Simple log event to TelemetryLogger', function () {
        const functionSpy = { dataArr: [], exceptionArr: [], flushCalled: false };
        const logger = createLogger(functionSpy);
        logger.logUsage('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 1);
        assert.strictEqual(functionSpy.dataArr[0].eventName, `${mockExtensionIdentifier.name}/test-event`);
        assert.strictEqual(functionSpy.dataArr[0].data['test-data'], 'test-data');
        logger.logUsage('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 2);
        logger.logError('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 3);
        logger.logError(new Error('test-error'), { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 3);
        assert.strictEqual(functionSpy.exceptionArr.length, 1);
        // Assert not flushed
        assert.strictEqual(functionSpy.flushCalled, false);
        // Call flush and assert that flush occurs
        logger.dispose();
        assert.strictEqual(functionSpy.flushCalled, true);
    });
    test('Simple log event to TelemetryLogger with options', function () {
        const functionSpy = { dataArr: [], exceptionArr: [], flushCalled: false };
        const logger = createLogger(functionSpy, undefined, {
            additionalCommonProperties: { 'common.foo': 'bar' },
        });
        logger.logUsage('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 1);
        assert.strictEqual(functionSpy.dataArr[0].eventName, `${mockExtensionIdentifier.name}/test-event`);
        assert.strictEqual(functionSpy.dataArr[0].data['test-data'], 'test-data');
        assert.strictEqual(functionSpy.dataArr[0].data['common.foo'], 'bar');
        logger.logUsage('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 2);
        logger.logError('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 3);
        logger.logError(new Error('test-error'), { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 3);
        assert.strictEqual(functionSpy.exceptionArr.length, 1);
        // Assert not flushed
        assert.strictEqual(functionSpy.flushCalled, false);
        // Call flush and assert that flush occurs
        logger.dispose();
        assert.strictEqual(functionSpy.flushCalled, true);
    });
    test('Log error should get common properties #193205', function () {
        const functionSpy = { dataArr: [], exceptionArr: [], flushCalled: false };
        const logger = createLogger(functionSpy, undefined, {
            additionalCommonProperties: { 'common.foo': 'bar' },
        });
        logger.logError(new Error('Test error'));
        assert.strictEqual(functionSpy.exceptionArr.length, 1);
        assert.strictEqual(functionSpy.exceptionArr[0].data['common.foo'], 'bar');
        assert.strictEqual(functionSpy.exceptionArr[0].data['common.product'], 'test');
        logger.logError('test-error-event');
        assert.strictEqual(functionSpy.dataArr.length, 1);
        assert.strictEqual(functionSpy.dataArr[0].data['common.foo'], 'bar');
        assert.strictEqual(functionSpy.dataArr[0].data['common.product'], 'test');
        logger.logError('test-error-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 2);
        assert.strictEqual(functionSpy.dataArr[1].data['common.foo'], 'bar');
        assert.strictEqual(functionSpy.dataArr[1].data['common.product'], 'test');
        logger.logError('test-error-event', { properties: { 'test-data': 'test-data' } });
        assert.strictEqual(functionSpy.dataArr.length, 3);
        assert.strictEqual(functionSpy.dataArr[2].data.properties['common.foo'], 'bar');
        assert.strictEqual(functionSpy.dataArr[2].data.properties['common.product'], 'test');
        logger.dispose();
        assert.strictEqual(functionSpy.flushCalled, true);
    });
    test('Ensure logger properly cleans PII', function () {
        const functionSpy = { dataArr: [], exceptionArr: [], flushCalled: false };
        const logger = createLogger(functionSpy);
        // Log an event with a bunch of PII, this should all get cleaned out
        logger.logUsage('test-event', {
            'fake-password': 'pwd=123',
            'fake-email': 'no-reply@example.com',
            'fake-token': 'token=123',
            'fake-slack-token': 'xoxp-123',
            'fake-path': '/Users/username/.vscode/extensions',
        });
        assert.strictEqual(functionSpy.dataArr.length, 1);
        assert.strictEqual(functionSpy.dataArr[0].eventName, `${mockExtensionIdentifier.name}/test-event`);
        assert.strictEqual(functionSpy.dataArr[0].data['fake-password'], '<REDACTED: Generic Secret>');
        assert.strictEqual(functionSpy.dataArr[0].data['fake-email'], '<REDACTED: Email>');
        assert.strictEqual(functionSpy.dataArr[0].data['fake-token'], '<REDACTED: Generic Secret>');
        assert.strictEqual(functionSpy.dataArr[0].data['fake-slack-token'], '<REDACTED: Slack Token>');
        assert.strictEqual(functionSpy.dataArr[0].data['fake-path'], '<REDACTED: user-file-path>');
    });
    test('Ensure output channel is logged to', function () {
        // Have to re-duplicate code here because I the logger service isn't exposed in the simple setup functions
        const loggerService = new TestTelemetryLoggerService(LogLevel.Trace);
        const extensionTelemetry = new ExtHostTelemetry(false, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.environment = mockEnvironment;
                this.telemetryInfo = mockTelemetryInfo;
                this.remote = mockRemote;
            }
        })(), loggerService);
        extensionTelemetry.$initializeTelemetryLevel(3 /* TelemetryLevel.USAGE */, true, {
            usage: true,
            error: true,
        });
        const functionSpy = { dataArr: [], exceptionArr: [], flushCalled: false };
        const logger = createLogger(functionSpy, extensionTelemetry);
        // Ensure headers are logged on instantiation
        assert.strictEqual(loggerService.createLogger().logs.length, 0);
        logger.logUsage('test-event', { 'test-data': 'test-data' });
        // Initial header is logged then the event
        assert.strictEqual(loggerService.createLogger().logs.length, 1);
        assert.ok(loggerService.createLogger().logs[0].startsWith('test-extension/test-event'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlbGVtZXRyeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0VGVsZW1ldHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQ04sbUJBQW1CLEdBR25CLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBRXBILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTNGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQVNwRSxLQUFLLENBQUMsa0JBQWtCLEVBQUU7SUFDekIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxNQUFNLGVBQWUsR0FBaUI7UUFDckMsMkJBQTJCLEVBQUUsS0FBSztRQUNsQywrQkFBK0IsRUFBRSxTQUFTO1FBQzFDLHlCQUF5QixFQUFFLFNBQVM7UUFDcEMsT0FBTyxFQUFFLFNBQVM7UUFDbEIsT0FBTyxFQUFFLE1BQU07UUFDZiwrQkFBK0IsRUFBRSxLQUFLO1FBQ3RDLE9BQU8sRUFBRSxNQUFNO1FBQ2YsV0FBVyxFQUFFLElBQUk7UUFDakIsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDcEMs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
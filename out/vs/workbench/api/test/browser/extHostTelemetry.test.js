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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlbGVtZXRyeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdFRlbGVtZXRyeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUNOLG1CQUFtQixHQUduQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVwRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUVwSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUzRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFTcEUsS0FBSyxDQUFDLGtCQUFrQixFQUFFO0lBQ3pCLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsTUFBTSxlQUFlLEdBQWlCO1FBQ3JDLDJCQUEyQixFQUFFLEtBQUs7UUFDbEMsK0JBQStCLEVBQUUsU0FBUztRQUMxQyx5QkFBeUIsRUFBRSxTQUFTO1FBQ3BDLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLE9BQU8sRUFBRSxNQUFNO1FBQ2YsK0JBQStCLEVBQUUsS0FBSztRQUN0QyxPQUFPLEVBQUUsTUFBTTtRQUNmLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQ3BDLG9CQUFv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
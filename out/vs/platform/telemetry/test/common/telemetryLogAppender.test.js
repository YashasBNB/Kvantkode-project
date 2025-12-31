/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { AbstractLogger, DEFAULT_LOG_LEVEL, LogLevel, } from '../../../log/common/log.js';
import { IProductService } from '../../../product/common/productService.js';
import { TelemetryLogAppender } from '../../common/telemetryLogAppender.js';
class TestTelemetryLogger extends AbstractLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.logs = [];
        this.setLevel(logLevel);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            this.logs.push(message + JSON.stringify(args));
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            this.logs.push(message);
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            this.logs.push(message);
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            this.logs.push(message.toString());
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            this.logs.push(message);
        }
    }
    flush() { }
}
export class TestTelemetryLoggerService {
    constructor(logLevel) {
        this.logLevel = logLevel;
        this.onDidChangeVisibility = Event.None;
        this.onDidChangeLogLevel = Event.None;
        this.onDidChangeLoggers = Event.None;
    }
    getLogger() {
        return this.logger;
    }
    createLogger() {
        if (!this.logger) {
            this.logger = new TestTelemetryLogger(this.logLevel);
        }
        return this.logger;
    }
    setLogLevel() { }
    getLogLevel() {
        return LogLevel.Info;
    }
    setVisibility() { }
    getDefaultLogLevel() {
        return this.logLevel;
    }
    registerLogger() { }
    deregisterLogger() { }
    getRegisteredLoggers() {
        return [];
    }
    getRegisteredLogger() {
        return undefined;
    }
}
suite('TelemetryLogAdapter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Do not Log Telemetry if log level is not trace', async () => {
        const testLoggerService = new TestTelemetryLoggerService(DEFAULT_LOG_LEVEL);
        const testInstantiationService = new TestInstantiationService();
        const testObject = new TelemetryLogAppender('', false, testLoggerService, testInstantiationService.stub(IEnvironmentService, {}), testInstantiationService.stub(IProductService, {}));
        testObject.log('testEvent', { hello: 'world', isTrue: true, numberBetween1And3: 2 });
        assert.strictEqual(testLoggerService.createLogger().logs.length, 0);
        testObject.dispose();
        testInstantiationService.dispose();
    });
    test('Log Telemetry if log level is trace', async () => {
        const testLoggerService = new TestTelemetryLoggerService(LogLevel.Trace);
        const testInstantiationService = new TestInstantiationService();
        const testObject = new TelemetryLogAppender('', false, testLoggerService, testInstantiationService.stub(IEnvironmentService, {}), testInstantiationService.stub(IProductService, {}));
        testObject.log('testEvent', { hello: 'world', isTrue: true, numberBetween1And3: 2 });
        assert.strictEqual(testLoggerService.createLogger().logs[0], 'telemetry/testEvent' +
            JSON.stringify([
                {
                    properties: {
                        hello: 'world',
                    },
                    measurements: {
                        isTrue: 1,
                        numberBetween1And3: 2,
                    },
                },
            ]));
        testObject.dispose();
        testInstantiationService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5TG9nQXBwZW5kZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS90ZXN0L2NvbW1vbi90ZWxlbWV0cnlMb2dBcHBlbmRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUNOLGNBQWMsRUFDZCxpQkFBaUIsRUFHakIsUUFBUSxHQUNSLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTNFLE1BQU0sbUJBQW9CLFNBQVEsY0FBYztJQUcvQyxZQUFZLFdBQXFCLGlCQUFpQjtRQUNqRCxLQUFLLEVBQUUsQ0FBQTtRQUhELFNBQUksR0FBYSxFQUFFLENBQUE7UUFJekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUN4QixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDcEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFD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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5TG9nQXBwZW5kZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L3Rlc3QvY29tbW9uL3RlbGVtZXRyeUxvZ0FwcGVuZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN6RyxPQUFPLEVBQ04sY0FBYyxFQUNkLGlCQUFpQixFQUdqQixRQUFRLEdBQ1IsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFM0UsTUFBTSxtQkFBb0IsU0FBUSxjQUFjO0lBRy9DLFlBQVksV0FBcUIsaUJBQWlCO1FBQ2pELEtBQUssRUFBRSxDQUFBO1FBSEQsU0FBSSxHQUFhLEVBQUUsQ0FBQTtRQUl6QixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ25DLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUF1QixFQUFFLEdBQUcsSUFBVztRQUMzQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDeEIsQ0FBQztJQUNGLENBQUM7SUFDRCxLQUFLLEtBQVUsQ0FBQztDQUNoQjtBQUVELE1BQU0sT0FBTywwQkFBMEI7SUFLdEMsWUFBNkIsUUFBa0I7UUFBbEIsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQWMvQywwQkFBcUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ2xDLHdCQUFtQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDaEMsdUJBQWtCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtJQWhCbUIsQ0FBQztJQUVuRCxTQUFTO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFRCxZQUFZO1FBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3JELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUtELFdBQVcsS0FBVSxDQUFDO0lBQ3RCLFdBQVc7UUFDVixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUE7SUFDckIsQ0FBQztJQUNELGFBQWEsS0FBVSxDQUFDO0lBQ3hCLGtCQUFrQjtRQUNqQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUNELGNBQWMsS0FBSSxDQUFDO0lBQ25CLGdCQUFnQixLQUFVLENBQUM7SUFDM0Isb0JBQW9CO1FBQ25CLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELG1CQUFtQjtRQUNsQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2pFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSwwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFBO1FBQy9ELE1BQU0sVUFBVSxHQUFHLElBQUksb0JBQW9CLENBQzFDLEVBQUUsRUFDRixLQUFLLEVBQ0wsaUJBQWlCLEVBQ2pCLHdCQUF3QixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsRUFDdEQsd0JBQXdCLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FDbEQsQ0FBQTtRQUNELFVBQVUsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDcEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25FLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNwQix3QkFBd0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNuQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0RCxNQUFNLGlCQUFpQixHQUFHLElBQUksMEJBQTBCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFBO1FBQy9ELE1BQU0sVUFBVSxHQUFHLElBQUksb0JBQW9CLENBQzFDLEVBQUUsRUFDRixLQUFLLEVBQ0wsaUJBQWlCLEVBQ2pCLHdCQUF3QixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsRUFDdEQsd0JBQXdCLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FDbEQsQ0FBQTtRQUNELFVBQVUsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDcEYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsaUJBQWlCLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUN4QyxxQkFBcUI7WUFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDZDtvQkFDQyxVQUFVLEVBQUU7d0JBQ1gsS0FBSyxFQUFFLE9BQU87cUJBQ2Q7b0JBQ0QsWUFBWSxFQUFFO3dCQUNiLE1BQU0sRUFBRSxDQUFDO3dCQUNULGtCQUFrQixFQUFFLENBQUM7cUJBQ3JCO2lCQUNEO2FBQ0QsQ0FBQyxDQUNILENBQUE7UUFDRCxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDcEIsd0JBQXdCLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbkMsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9
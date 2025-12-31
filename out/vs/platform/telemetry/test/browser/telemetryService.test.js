/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import sinonTest from 'sinon-test';
import { mainWindow } from '../../../../base/browser/window.js';
import * as Errors from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import product from '../../../product/common/product.js';
import ErrorTelemetry from '../../browser/errorTelemetry.js';
import { TelemetryService } from '../../common/telemetryService.js';
import { NullAppender } from '../../common/telemetryUtils.js';
const sinonTestFn = sinonTest(sinon);
class TestTelemetryAppender {
    constructor() {
        this.events = [];
        this.isDisposed = false;
    }
    log(eventName, data) {
        this.events.push({ eventName, data });
    }
    getEventsCount() {
        return this.events.length;
    }
    flush() {
        this.isDisposed = true;
        return Promise.resolve(null);
    }
}
class ErrorTestingSettings {
    constructor() {
        this.randomUserFile = 'a/path/that/doe_snt/con-tain/code/names.js';
        this.anonymizedRandomUserFile = '<REDACTED: user-file-path>';
        this.nodeModulePathToRetain = 'node_modules/path/that/shouldbe/retained/names.js:14:15854';
        this.nodeModuleAsarPathToRetain = 'node_modules.asar/path/that/shouldbe/retained/names.js:14:12354';
        this.personalInfo = 'DANGEROUS/PATH';
        this.importantInfo = 'important/information';
        this.filePrefix = 'file:///';
        this.dangerousPathWithImportantInfo =
            this.filePrefix + this.personalInfo + '/resources/app/' + this.importantInfo;
        this.dangerousPathWithoutImportantInfo = this.filePrefix + this.personalInfo;
        this.missingModelPrefix = 'Received model events for missing model ';
        this.missingModelMessage =
            this.missingModelPrefix + ' ' + this.dangerousPathWithoutImportantInfo;
        this.noSuchFilePrefix = 'ENOENT: no such file or directory';
        this.noSuchFileMessage = this.noSuchFilePrefix + " '" + this.personalInfo + "'";
        this.stack = [
            `at e._modelEvents (${this.randomUserFile}:11:7309)`,
            `    at t.AllWorkers (${this.randomUserFile}:6:8844)`,
            `    at e.(anonymous function) [as _modelEvents] (${this.randomUserFile}:5:29552)`,
            `    at Function.<anonymous> (${this.randomUserFile}:6:8272)`,
            `    at e.dispatch (${this.randomUserFile}:5:26931)`,
            `    at e.request (/${this.nodeModuleAsarPathToRetain})`,
            `    at t._handleMessage (${this.nodeModuleAsarPathToRetain})`,
            `    at t._onmessage (/${this.nodeModulePathToRetain})`,
            `    at t.onmessage (${this.nodeModulePathToRetain})`,
            `    at DedicatedWorkerGlobalScope.self.onmessage`,
            this.dangerousPathWithImportantInfo,
            this.dangerousPathWithoutImportantInfo,
            this.missingModelMessage,
            this.noSuchFileMessage,
        ];
    }
}
suite('TelemetryService', () => {
    const TestProductService = { _serviceBrand: undefined, ...product };
    test('Disposing', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testPrivateEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        service.dispose();
        assert.strictEqual(!testAppender.isDisposed, true);
    }));
    // event reporting
    test('Simple event', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'testEvent');
        assert.notStrictEqual(testAppender.events[0].data, null);
        service.dispose();
    }));
    test('Event with data', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent', {
            stringProp: 'property',
            numberProp: 1,
            booleanProp: true,
            complexProp: {
                value: 0,
            },
        });
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'testEvent');
        assert.notStrictEqual(testAppender.events[0].data, null);
        assert.strictEqual(testAppender.events[0].data['stringProp'], 'property');
        assert.strictEqual(testAppender.events[0].data['numberProp'], 1);
        assert.strictEqual(testAppender.events[0].data['booleanProp'], true);
        assert.strictEqual(testAppender.events[0].data['complexProp'].value, 0);
        service.dispose();
    }));
    test('common properties added to *all* events, simple event', function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({
            appenders: [testAppender],
            commonProperties: {
                foo: 'JA!',
                get bar() {
                    return Math.random() % 2 === 0;
                },
            },
        }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        const [first] = testAppender.events;
        assert.strictEqual(Object.keys(first.data).length, 2);
        assert.strictEqual(typeof first.data['foo'], 'string');
        assert.strictEqual(typeof first.data['bar'], 'boolean');
        service.dispose();
    });
    test('common properties added to *all* events, event with data', function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({
            appenders: [testAppender],
            commonProperties: {
                foo: 'JA!',
                get bar() {
                    return Math.random() % 2 === 0;
                },
            },
        }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent', { hightower: 'xl', price: 8000 });
        const [first] = testAppender.events;
        assert.strictEqual(Object.keys(first.data).length, 4);
        assert.strictEqual(typeof first.data['foo'], 'string');
        assert.strictEqual(typeof first.data['bar'], 'boolean');
        assert.strictEqual(typeof first.data['hightower'], 'string');
        assert.strictEqual(typeof first.data['price'], 'number');
        service.dispose();
    });
    test('TelemetryInfo comes from properties', function () {
        const service = new TelemetryService({
            appenders: [NullAppender],
            commonProperties: {
                sessionID: 'one',
                ['common.machineId']: 'three',
            },
        }, new TestConfigurationService(), TestProductService);
        assert.strictEqual(service.sessionId, 'one');
        assert.strictEqual(service.machineId, 'three');
        service.dispose();
    });
    test('telemetry on by default', function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'testEvent');
        service.dispose();
    });
    class TestErrorTelemetryService extends TelemetryService {
        constructor(config) {
            super({ ...config, sendErrorTelemetry: true }, new TestConfigurationService(), TestProductService);
        }
    }
    test('Error events', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const e = new Error('This is a test.');
            // for Phantom
            if (!e.stack) {
                e.stack = 'blah';
            }
            Errors.onUnexpectedError(e);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.getEventsCount(), 1);
            assert.strictEqual(testAppender.events[0].eventName, 'UnhandledError');
            assert.strictEqual(testAppender.events[0].data.msg, 'This is a test.');
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    // 	test('Unhandled Promise Error events', sinonTestFn(function() {
    //
    // 		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
    // 		Errors.setUnexpectedErrorHandler(() => {});
    //
    // 		try {
    // 			let service = new MainTelemetryService();
    // 			let testAppender = new TestTelemetryAppender();
    // 			service.addTelemetryAppender(testAppender);
    //
    // 			winjs.Promise.wrapError(new Error('This should not get logged'));
    // 			winjs.TPromise.as(true).then(() => {
    // 				throw new Error('This should get logged');
    // 			});
    // 			// prevent console output from failing the test
    // 			this.stub(console, 'log');
    // 			// allow for the promise to finish
    // 			this.clock.tick(MainErrorTelemetry.ERROR_FLUSH_TIMEOUT);
    //
    // 			assert.strictEqual(testAppender.getEventsCount(), 1);
    // 			assert.strictEqual(testAppender.events[0].eventName, 'UnhandledError');
    // 			assert.strictEqual(testAppender.events[0].data.msg,  'This should get logged');
    //
    // 			service.dispose();
    // 		} finally {
    // 			Errors.setUnexpectedErrorHandler(origErrorHandler);
    // 		}
    // 	}));
    test('Handle global errors', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const testError = new Error('test');
        mainWindow.onerror('Error Message', 'file.js', 2, 42, testError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.alwaysCalledWithExactly('Error Message', 'file.js', 2, 42, testError), true);
        assert.strictEqual(errorStub.callCount, 1);
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'UnhandledError');
        assert.strictEqual(testAppender.events[0].data.msg, 'Error Message');
        assert.strictEqual(testAppender.events[0].data.file, 'file.js');
        assert.strictEqual(testAppender.events[0].data.line, 2);
        assert.strictEqual(testAppender.events[0].data.column, 42);
        assert.strictEqual(testAppender.events[0].data.uncaught_error_msg, 'test');
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Error Telemetry removes PII from filename with spaces', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const personInfoWithSpaces = settings.personalInfo.slice(0, 2) + ' ' + settings.personalInfo.slice(2);
        const dangerousFilenameError = new Error('dangerousFilename');
        dangerousFilenameError.stack = settings.stack;
        mainWindow.onerror('dangerousFilename', settings.dangerousPathWithImportantInfo.replace(settings.personalInfo, personInfoWithSpaces) + '/test.js', 2, 42, dangerousFilenameError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        assert.strictEqual(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo.replace(settings.personalInfo, personInfoWithSpaces)), -1);
        assert.strictEqual(testAppender.events[0].data.file, settings.importantInfo + '/test.js');
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Uncaught Error Telemetry removes PII from filename', sinonTestFn(function () {
        const clock = this.clock;
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        let dangerousFilenameError = new Error('dangerousFilename');
        dangerousFilenameError.stack = settings.stack;
        mainWindow.onerror('dangerousFilename', settings.dangerousPathWithImportantInfo + '/test.js', 2, 42, dangerousFilenameError);
        clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        assert.strictEqual(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo), -1);
        dangerousFilenameError = new Error('dangerousFilename');
        dangerousFilenameError.stack = settings.stack;
        mainWindow.onerror('dangerousFilename', settings.dangerousPathWithImportantInfo + '/test.js', 2, 42, dangerousFilenameError);
        clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 2);
        assert.strictEqual(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.file, settings.importantInfo + '/test.js');
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithoutImportantInfoError = new Error(settings.dangerousPathWithoutImportantInfo);
            dangerousPathWithoutImportantInfoError.stack = settings.stack;
            Errors.onUnexpectedError(dangerousPathWithoutImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const dangerousPathWithoutImportantInfoError = new Error('dangerousPathWithoutImportantInfo');
        dangerousPathWithoutImportantInfoError.stack = settings.stack;
        mainWindow.onerror(settings.dangerousPathWithoutImportantInfo, 'test.js', 2, 42, dangerousPathWithoutImportantInfoError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that no file information remains, esp. personal info
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves Code file path', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithImportantInfoError = new Error(settings.dangerousPathWithImportantInfo);
            dangerousPathWithImportantInfoError.stack = settings.stack;
            // Test that important information remains but personal info does not
            Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves Code file path', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const dangerousPathWithImportantInfoError = new Error('dangerousPathWithImportantInfo');
        dangerousPathWithImportantInfoError.stack = settings.stack;
        mainWindow.onerror(settings.dangerousPathWithImportantInfo, 'test.js', 2, 42, dangerousPathWithImportantInfoError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that important information remains but personal info does not
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModuleAsarPathToRetain), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModulePathToRetain), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModuleAsarPathToRetain), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModulePathToRetain), -1);
        assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves Code file path with node modules', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithImportantInfoError = new Error(settings.dangerousPathWithImportantInfo);
            dangerousPathWithImportantInfoError.stack = settings.stack;
            Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModuleAsarPathToRetain), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModulePathToRetain), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModuleAsarPathToRetain), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModulePathToRetain), -1);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Unexpected Error Telemetry removes PII but preserves Code file path when PIIPath is configured', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({
                appenders: [testAppender],
                piiPaths: [settings.personalInfo + '/resources/app/'],
            });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithImportantInfoError = new Error(settings.dangerousPathWithImportantInfo);
            dangerousPathWithImportantInfoError.stack = settings.stack;
            // Test that important information remains but personal info does not
            Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves Code file path when PIIPath is configured', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({
            appenders: [testAppender],
            piiPaths: [settings.personalInfo + '/resources/app/'],
        });
        const errorTelemetry = new ErrorTelemetry(service);
        const dangerousPathWithImportantInfoError = new Error('dangerousPathWithImportantInfo');
        dangerousPathWithImportantInfoError.stack = settings.stack;
        mainWindow.onerror(settings.dangerousPathWithImportantInfo, 'test.js', 2, 42, dangerousPathWithImportantInfoError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that important information remains but personal info does not
        assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves Missing Model error message', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const missingModelError = new Error(settings.missingModelMessage);
            missingModelError.stack = settings.stack;
            // Test that no file information remains, but this particular
            // error message does (Received model events for missing model)
            Errors.onUnexpectedError(missingModelError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.missingModelPrefix), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.missingModelPrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves Missing Model error message', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const missingModelError = new Error('missingModelMessage');
        missingModelError.stack = settings.stack;
        mainWindow.onerror(settings.missingModelMessage, 'test.js', 2, 42, missingModelError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that no file information remains, but this particular
        // error message does (Received model events for missing model)
        assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.missingModelPrefix), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.missingModelPrefix), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves No Such File error message', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const noSuchFileError = new Error(settings.noSuchFileMessage);
            noSuchFileError.stack = settings.stack;
            // Test that no file information remains, but this particular
            // error message does (ENOENT: no such file or directory)
            Errors.onUnexpectedError(noSuchFileError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves No Such File error message', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const errorStub = sinon.stub();
            mainWindow.onerror = errorStub;
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const noSuchFileError = new Error('noSuchFileMessage');
            noSuchFileError.stack = settings.stack;
            mainWindow.onerror(settings.noSuchFileMessage, 'test.js', 2, 42, noSuchFileError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(errorStub.callCount, 1);
            // Test that no file information remains, but this particular
            // error message does (ENOENT: no such file or directory)
            Errors.onUnexpectedError(noSuchFileError);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
            sinon.restore();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Telemetry Service sends events when telemetry is on', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        service.dispose();
    }));
    test('Telemetry Service checks with config service', function () {
        let telemetryLevel = "off" /* TelemetryConfiguration.OFF */;
        const emitter = new Emitter();
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({
            appenders: [testAppender],
        }, new (class extends TestConfigurationService {
            constructor() {
                super(...arguments);
                this.onDidChangeConfiguration = emitter.event;
            }
            getValue() {
                return telemetryLevel;
            }
        })(), TestProductService);
        assert.strictEqual(service.telemetryLevel, 0 /* TelemetryLevel.NONE */);
        telemetryLevel = "all" /* TelemetryConfiguration.ON */;
        emitter.fire({ affectsConfiguration: () => true });
        assert.strictEqual(service.telemetryLevel, 3 /* TelemetryLevel.USAGE */);
        telemetryLevel = "error" /* TelemetryConfiguration.ERROR */;
        emitter.fire({ affectsConfiguration: () => true });
        assert.strictEqual(service.telemetryLevel, 2 /* TelemetryLevel.ERROR */);
        service.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L3Rlc3QvYnJvd3Nlci90ZWxlbWV0cnlTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sU0FBUyxNQUFNLFlBQVksQ0FBQTtBQUNsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFeEQsT0FBTyxjQUFjLE1BQU0saUNBQWlDLENBQUE7QUFFNUQsT0FBTyxFQUEyQixnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVGLE9BQU8sRUFBc0IsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFakYsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBRXBDLE1BQU0scUJBQXFCO0lBSTFCO1FBQ0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDaEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUE7SUFDeEIsQ0FBQztJQUVNLEdBQUcsQ0FBQyxTQUFpQixFQUFFLElBQVU7UUFDdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJ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LEVBQ3BFLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxjQUFjLENBQ3BCLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEVBQzFFLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFGLE1BQU0sQ0FBQyxjQUFjLENBQ3BCLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQzVDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixDQUFDLENBQ3JGLEVBQ0Qs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
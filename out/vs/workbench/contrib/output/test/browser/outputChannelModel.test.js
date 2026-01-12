/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { parseLogEntryAt } from '../../common/outputChannelModel.js';
import { TextModel } from '../../../../../editor/common/model/textModel.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { LogLevel } from '../../../../../platform/log/common/log.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('Logs Parsing', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(() => {
        instantiationService = disposables.add(workbenchInstantiationService({}, disposables));
    });
    test('should parse log entry with all components', () => {
        const text = '2023-10-15 14:30:45.123 [info] [Git] Initializing repository';
        const model = createModel(text);
        const entry = parseLogEntryAt(model, 1);
        assert.strictEqual(entry?.timestamp, new Date('2023-10-15 14:30:45.123').getTime());
        assert.strictEqual(entry?.logLevel, LogLevel.Info);
        assert.strictEqual(entry?.category, 'Git');
        assert.strictEqual(model.getValueInRange(entry?.range), text);
    });
    test('should parse multi-line log entry', () => {
        const text = [
            '2023-10-15 14:30:45.123 [error] [Extension] Failed with error:',
            'Error: Could not load extension',
            '    at Object.load (/path/to/file:10:5)',
        ].join('\n');
        const model = createModel(text);
        const entry = parseLogEntryAt(model, 1);
        assert.strictEqual(entry?.timestamp, new Date('2023-10-15 14:30:45.123').getTime());
        assert.strictEqual(entry?.logLevel, LogLevel.Error);
        assert.strictEqual(entry?.category, 'Extension');
        assert.strictEqual(model.getValueInRange(entry?.range), text);
    });
    test('should parse log entry without category', () => {
        const text = '2023-10-15 14:30:45.123 [warning] System is running low on memory';
        const model = createModel(text);
        const entry = parseLogEntryAt(model, 1);
        assert.strictEqual(entry?.timestamp, new Date('2023-10-15 14:30:45.123').getTime());
        assert.strictEqual(entry?.logLevel, LogLevel.Warning);
        assert.strictEqual(entry?.category, undefined);
        assert.strictEqual(model.getValueInRange(entry?.range), text);
    });
    test('should return null for invalid log entry', () => {
        const model = createModel('Not a valid log entry');
        const entry = parseLogEntryAt(model, 1);
        assert.strictEqual(entry, null);
    });
    test('should parse all supported log levels', () => {
        const levels = {
            info: LogLevel.Info,
            trace: LogLevel.Trace,
            debug: LogLevel.Debug,
            warning: LogLevel.Warning,
            error: LogLevel.Error,
        };
        for (const [levelText, expectedLevel] of Object.entries(levels)) {
            const model = createModel(`2023-10-15 14:30:45.123 [${levelText}] Test message`);
            const entry = parseLogEntryAt(model, 1);
            assert.strictEqual(entry?.logLevel, expectedLevel, `Failed for log level: ${levelText}`);
        }
    });
    test('should parse timestamp correctly', () => {
        const timestamps = [
            '2023-01-01 00:00:00.000',
            '2023-12-31 23:59:59.999',
            '2023-06-15 12:30:45.500',
        ];
        for (const timestamp of timestamps) {
            const model = createModel(`${timestamp} [info] Test message`);
            const entry = parseLogEntryAt(model, 1);
            assert.strictEqual(entry?.timestamp, new Date(timestamp).getTime(), `Failed for timestamp: ${timestamp}`);
        }
    });
    test('should handle last line of file', () => {
        const model = createModel([
            '2023-10-15 14:30:45.123 [info] First message',
            '2023-10-15 14:30:45.124 [info] Last message',
            '',
        ].join('\n'));
        let actual = parseLogEntryAt(model, 1);
        assert.strictEqual(actual?.timestamp, new Date('2023-10-15 14:30:45.123').getTime());
        assert.strictEqual(actual?.logLevel, LogLevel.Info);
        assert.strictEqual(actual?.category, undefined);
        assert.strictEqual(model.getValueInRange(actual?.range), '2023-10-15 14:30:45.123 [info] First message');
        actual = parseLogEntryAt(model, 2);
        assert.strictEqual(actual?.timestamp, new Date('2023-10-15 14:30:45.124').getTime());
        assert.strictEqual(actual?.logLevel, LogLevel.Info);
        assert.strictEqual(actual?.category, undefined);
        assert.strictEqual(model.getValueInRange(actual?.range), '2023-10-15 14:30:45.124 [info] Last message');
        actual = parseLogEntryAt(model, 3);
        assert.strictEqual(actual, null);
    });
    test('should parse multi-line log entry with empty lines', () => {
        const text = [
            '2025-01-27 09:53:00.450 [info] Found with version <20.18.1>',
            'Now using node v20.18.1 (npm v10.8.2)',
            '',
            '> husky - npm run -s precommit',
            '> husky - node v20.18.1',
            '',
            'Reading git index versions...',
        ].join('\n');
        const model = createModel(text);
        const entry = parseLogEntryAt(model, 1);
        assert.strictEqual(entry?.timestamp, new Date('2025-01-27 09:53:00.450').getTime());
        assert.strictEqual(entry?.logLevel, LogLevel.Info);
        assert.strictEqual(entry?.category, undefined);
        assert.strictEqual(model.getValueInRange(entry?.range), text);
    });
    function createModel(content) {
        return disposables.add(instantiationService.createInstance(TextModel, content, 'log', TextModel.DEFAULT_CREATION_OPTIONS, null));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Q2hhbm5lbE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL291dHB1dC90ZXN0L2Jyb3dzZXIvb3V0cHV0Q2hhbm5lbE1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDcEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHakcsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxJQUFJLG9CQUE4QyxDQUFBO0lBRWxELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO0lBQ3ZGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtRQUN2RCxNQUFNLElBQUksR0FBRyw4REFBOEQsQ0FBQTtRQUMzRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0IsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV2QyxNQUFNLENBQUMs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
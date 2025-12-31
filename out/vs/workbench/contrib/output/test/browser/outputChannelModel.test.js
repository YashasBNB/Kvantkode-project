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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Q2hhbm5lbE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRwdXQvdGVzdC9icm93c2VyL291dHB1dENoYW5uZWxNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQ2hDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDM0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBR2pHLEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzFCLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsSUFBSSxvQkFBOEMsQ0FBQTtJQUVsRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUN2RixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQsTUFBTSxJQUFJLEdBQUcsOERBQThELENBQUE7UUFDM0UsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9CLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdkMsTUFBTSxDQUFDLFdBQVcs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
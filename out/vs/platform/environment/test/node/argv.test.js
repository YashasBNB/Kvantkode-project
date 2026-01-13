/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { formatOptions, parseArgs, } from '../../node/argv.js';
import { addArg } from '../../node/argvHelper.js';
function o(description, type = 'string') {
    return {
        description,
        type,
    };
}
function c(description, options) {
    return {
        description,
        type: 'subcommand',
        options,
    };
}
suite('formatOptions', () => {
    test('Text should display small columns correctly', () => {
        assert.deepStrictEqual(formatOptions({
            add: o('bar'),
        }, 80), ['  --add        bar']);
        assert.deepStrictEqual(formatOptions({
            add: o('bar'),
            wait: o('ba'),
            trace: o('b'),
        }, 80), ['  --add        bar', '  --wait       ba', '  --trace      b']);
    });
    test('Text should wrap', () => {
        assert.deepStrictEqual(formatOptions({
            add: o('bar '.repeat(9)),
        }, 40), ['  --add        bar bar bar bar bar bar', '               bar bar bar']);
    });
    test('Text should revert to the condensed view when the terminal is too narrow', () => {
        assert.deepStrictEqual(formatOptions({
            add: o('bar '.repeat(9)),
        }, 30), ['  --add', '      bar bar bar bar bar bar bar bar bar ']);
    });
    test('addArg', () => {
        assert.deepStrictEqual(addArg([], 'foo'), ['foo']);
        assert.deepStrictEqual(addArg([], 'foo', 'bar'), ['foo', 'bar']);
        assert.deepStrictEqual(addArg(['foo'], 'bar'), ['foo', 'bar']);
        assert.deepStrictEqual(addArg(['--wait'], 'bar'), ['--wait', 'bar']);
        assert.deepStrictEqual(addArg(['--wait', '--', '--foo'], 'bar'), [
            '--wait',
            'bar',
            '--',
            '--foo',
        ]);
        assert.deepStrictEqual(addArg(['--', '--foo'], 'bar'), ['bar', '--', '--foo']);
    });
    test('subcommands', () => {
        assert.deepStrictEqual(formatOptions({
            testcmd: c('A test command', { add: o('A test command option') }),
        }, 30), ['  --testcmd', '      A test command']);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('parseArgs', () => {
    function newErrorReporter(result = [], command = '') {
        const commandPrefix = command ? command + '-' : '';
        return {
            onDeprecatedOption: (deprecatedId) => result.push(`${commandPrefix}onDeprecatedOption ${deprecatedId}`),
            onUnknownOption: (id) => result.push(`${commandPrefix}onUnknownOption ${id}`),
            onEmptyValue: (id) => result.push(`${commandPrefix}onEmptyValue ${id}`),
            onMultipleValues: (id, usedValue) => result.push(`${commandPrefix}onMultipleValues ${id} ${usedValue}`),
            getSubcommandReporter: (c) => newErrorReporter(result, commandPrefix + c),
            result,
        };
    }
    function assertParse(options, input, expected, expectedErrors) {
        const errorReporter = newErrorReporter();
        assert.deepStrictEqual(parseArgs(input, options, errorReporter), expected);
        assert.deepStrictEqual(errorReporter.result, expectedErrors);
    }
    test('subcommands', () => {
        const options1 = {
            testcmd: c('A test command', {
                testArg: o('A test command option'),
                _: { type: 'string[]' },
            }),
            _: { type: 'string[]' },
        };
        assertParse(options1, ['testcmd', '--testArg=foo'], { testcmd: { testArg: 'foo', _: [] }, _: [] }, []);
        assertParse(options1, ['testcmd', '--testArg=foo', '--testX'], { testcmd: { testArg: 'foo', _: [] }, _: [] }, ['testcmd-onUnknownOption testX']);
        const options2 = {
            testcmd: c('A test command', {
                testArg: o('A test command option'),
            }),
            testX: { type: 'boolean', global: true, description: '' },
            _: { type: 'string[]' },
        };
        assertParse(options2, ['testcmd', '--testArg=foo', '--testX'], { testcmd: { testArg: 'foo', testX: true, _: [] }, _: [] }, []);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbnZpcm9ubWVudC90ZXN0L25vZGUvYXJndi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQ04sYUFBYSxFQUliLFNBQVMsR0FFVCxNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVqRCxTQUFTLENBQUMsQ0FBQyxXQUFtQixFQUFFLE9BQTBDLFFBQVE7SUFDakYsT0FBTztRQUNOLFdBQVc7UUFDWCxJQUFJO0tBQ0osQ0FBQTtBQUNGLENBQUM7QUFDRCxTQUFTLENBQUMsQ0FBQyxXQUFtQixFQUFFLE9BQWdDO0lBQy9ELE9BQU87UUFDTixXQUFXO1FBQ1gsSUFBSSxFQUFFLFlBQVk7UUFDbEIsT0FBTztLQUNQLENBQUE7QUFDRixDQUFDO0FBRUQsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDM0IsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUNyQixhQUFhLENBQ1o7WUFDQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztTQUNiLEVBQ0QsRUFBRSxDQUNGLEVBQ0QsQ0FBQyxvQkFBb0IsQ0FBQyxDQUN0QixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsYUFBYSxDQUNaO1lBQ0MsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDYixJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNi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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZW52aXJvbm1lbnQvdGVzdC9ub2RlL2FyZ3YudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUNOLGFBQWEsRUFJYixTQUFTLEdBRVQsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFakQsU0FBUyxDQUFDLENBQUMsV0FBbUIsRUFBRSxPQUEwQyxRQUFRO0lBQ2pGLE9BQU87UUFDTixXQUFXO1FBQ1gsSUFBSTtLQUNKLENBQUE7QUFDRixDQUFDO0FBQ0QsU0FBUyxDQUFDLENBQUMsV0FBbUIsRUFBRSxPQUFnQztJQUMvRCxPQUFPO1FBQ04sV0FBVztRQUNYLElBQUksRUFBRSxZQUFZO1FBQ2xCLE9BQU87S0FDUCxDQUFBO0FBQ0YsQ0FBQztBQUVELEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FDckIsYUFBYSxDQUNaO1lBQ0MsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7U0FDYixFQUNELEVBQUUsQ0FDRixFQUNELENBQUMsb0JBQW9CLENBQUMsQ0FDdEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGFBQWEsQ0FDWjtZQUNDLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ2IsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDYixLQUFLLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQztTQUNiLEVBQ0QsRUFBRSxDQUNGLEVBQ0QsQ0FBQyxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUMvRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGFBQWEsQ0FDWjtZQUNDLEdBQUcsRUFBRSxDQUFDLENBQU8sTUFBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMvQixFQUNELEVBQUUsQ0FDRixFQUNELENBQUMsd0NBQXdDLEVBQUUsNEJBQTRCLENBQUMsQ0FDeEUsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBFQUEwRSxFQUFFLEdBQUcsRUFBRTtRQUNyRixNQUFNLENBQUMsZUFBZSxDQUNyQixhQUFhLENBQ1o7WUFDQyxHQUFHLEVBQUUsQ0FBQyxDQUFPLE1BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDL0IsRUFDRCxFQUFFLENBQ0YsRUFDRCxDQUFDLFNBQVMsRUFBRSw0Q0FBNEMsQ0FBQyxDQUN6RCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUNuQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtZQUNoRSxRQUFRO1lBQ1IsS0FBSztZQUNMLElBQUk7WUFDSixPQUFPO1NBQ1AsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDL0UsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN4QixNQUFNLENBQUMsZUFBZSxDQUNyQixhQUFhLENBQ1o7WUFDQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7U0FDakUsRUFDRCxFQUFFLENBQ0YsRUFDRCxDQUFDLGFBQWEsRUFBRSxzQkFBc0IsQ0FBQyxDQUN2QyxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBO0FBRUYsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDdkIsU0FBUyxnQkFBZ0IsQ0FDeEIsU0FBbUIsRUFBRSxFQUNyQixPQUFPLEdBQUcsRUFBRTtRQUVaLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ2xELE9BQU87WUFDTixrQkFBa0IsRUFBRSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQ3BDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLHNCQUFzQixZQUFZLEVBQUUsQ0FBQztZQUNsRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLG1CQUFtQixFQUFFLEVBQUUsQ0FBQztZQUM3RSxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLGdCQUFnQixFQUFFLEVBQUUsQ0FBQztZQUN2RSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsYUFBYSxvQkFBb0IsRUFBRSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ25FLHFCQUFxQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsYUFBYSxHQUFHLENBQUMsQ0FBQztZQUN6RSxNQUFNO1NBQ04sQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLFdBQVcsQ0FDbkIsT0FBOEIsRUFDOUIsS0FBZSxFQUNmLFFBQVcsRUFDWCxjQUF3QjtRQUV4QixNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsYUFBYSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQVN4QixNQUFNLFFBQVEsR0FBRztZQUNoQixPQUFPLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixFQUFFO2dCQUM1QixPQUFPLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDO2dCQUNuQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFO2FBQ3ZCLENBQUM7WUFDRixDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFO1NBQ1UsQ0FBQTtRQUNsQyxXQUFXLENBQ1YsUUFBUSxFQUNSLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUM1QixFQUFFLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFDN0MsRUFBRSxDQUNGLENBQUE7UUFDRCxXQUFXLENBQ1YsUUFBUSxFQUNSLENBQUMsU0FBUyxFQUFFLGVBQWUsRUFBRSxTQUFTLENBQUMsRUFDdkMsRUFBRSxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQzdDLENBQUMsK0JBQStCLENBQUMsQ0FDakMsQ0FBQTtRQVlELE1BQU0sUUFBUSxHQUFHO1lBQ2hCLE9BQU8sRUFBRSxDQUFDLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQzVCLE9BQU8sRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUM7YUFDbkMsQ0FBQztZQUNGLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFO1lBQ3pELENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUU7U0FDVSxDQUFBO1FBQ2xDLFdBQVcsQ0FDVixRQUFRLEVBQ1IsQ0FBQyxTQUFTLEVBQUUsZUFBZSxFQUFFLFNBQVMsQ0FBQyxFQUN2QyxFQUFFLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUMxRCxFQUFFLENBQ0YsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9
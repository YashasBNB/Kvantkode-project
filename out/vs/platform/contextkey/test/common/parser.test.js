/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Parser } from '../../common/contextkey.js';
function parseToStr(input) {
    const parser = new Parser();
    const prints = [];
    const print = (...ss) => {
        ss.forEach((s) => prints.push(s));
    };
    const expr = parser.parse(input);
    if (expr === undefined) {
        if (parser.lexingErrors.length > 0) {
            print('Lexing errors:', '\n\n');
            parser.lexingErrors.forEach((lexingError) => print(`Unexpected token '${lexingError.lexeme}' at offset ${lexingError.offset}. ${lexingError.additionalInfo}`, '\n'));
        }
        if (parser.parsingErrors.length > 0) {
            if (parser.lexingErrors.length > 0) {
                print('\n --- \n');
            }
            print('Parsing errors:', '\n\n');
            parser.parsingErrors.forEach((parsingError) => print(`Unexpected '${parsingError.lexeme}' at offset ${parsingError.offset}.`, '\n'));
        }
    }
    else {
        print(expr.serialize());
    }
    return prints.join('');
}
suite('Context Key Parser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test(' foo', () => {
        const input = ' foo';
        assert.deepStrictEqual(parseToStr(input), 'foo');
    });
    test('!foo', () => {
        const input = '!foo';
        assert.deepStrictEqual(parseToStr(input), '!foo');
    });
    test('foo =~ /bar/', () => {
        const input = 'foo =~ /bar/';
        assert.deepStrictEqual(parseToStr(input), 'foo =~ /bar/');
    });
    test(`foo || (foo =~ /bar/ && baz)`, () => {
        const input = `foo || (foo =~ /bar/ && baz)`;
        assert.deepStrictEqual(parseToStr(input), 'foo || baz && foo =~ /bar/');
    });
    test('foo || (foo =~ /bar/ || baz)', () => {
        const input = 'foo || (foo =~ /bar/ || baz)';
        assert.deepStrictEqual(parseToStr(input), 'baz || foo || foo =~ /bar/');
    });
    test(`(foo || bar) && (jee || jar)`, () => {
        const input = `(foo || bar) && (jee || jar)`;
        assert.deepStrictEqual(parseToStr(input), 'bar && jar || bar && jee || foo && jar || foo && jee');
    });
    test('foo && foo =~ /zee/i', () => {
        const input = 'foo && foo =~ /zee/i';
        assert.deepStrictEqual(parseToStr(input), 'foo && foo =~ /zee/i');
    });
    test('foo.bar==enabled', () => {
        const input = 'foo.bar==enabled';
        assert.deepStrictEqual(parseToStr(input), "foo.bar == 'enabled'");
    });
    test(`foo.bar == 'enabled'`, () => {
        const input = `foo.bar == 'enabled'`;
        assert.deepStrictEqual(parseToStr(input), `foo.bar == 'enabled'`);
    });
    test('foo.bar:zed==completed - equality with no space', () => {
        const input = 'foo.bar:zed==completed';
        assert.deepStrictEqual(parseToStr(input), "foo.bar:zed == 'completed'");
    });
    test('a && b || c', () => {
        const input = 'a && b || c';
        assert.deepStrictEqual(parseToStr(input), 'c || a && b');
    });
    test('fooBar && baz.jar && fee.bee<K-loo+1>', () => {
        const input = 'fooBar && baz.jar && fee.bee<K-loo+1>';
        assert.deepStrictEqual(parseToStr(input), 'baz.jar && fee.bee<K-loo+1> && fooBar');
    });
    test('foo.barBaz<C-r> < 2', () => {
        const input = 'foo.barBaz<C-r> < 2';
        assert.deepStrictEqual(parseToStr(input), `foo.barBaz<C-r> < 2`);
    });
    test('foo.bar >= -1', () => {
        const input = 'foo.bar >= -1';
        assert.deepStrictEqual(parseToStr(input), 'foo.bar >= -1');
    });
    test(`key contains &nbsp: view == vsc-packages-activitybar-folders && vsc-packages-folders-loaded`, () => {
        const input = `view == vsc-packages-activitybar-folders && vsc-packages-folders-loaded`;
        assert.deepStrictEqual(parseToStr(input), "vsc-packages-folders-loaded && view == 'vsc-packages-activitybar-folders'");
    });
    test('foo.bar <= -1', () => {
        const input = 'foo.bar <= -1';
        assert.deepStrictEqual(parseToStr(input), `foo.bar <= -1`);
    });
    test('!cmake:hideBuildCommand \u0026\u0026 cmake:enableFullFeatureSet', () => {
        const input = '!cmake:hideBuildCommand \u0026\u0026 cmake:enableFullFeatureSet';
        assert.deepStrictEqual(parseToStr(input), 'cmake:enableFullFeatureSet && !cmake:hideBuildCommand');
    });
    test('!(foo && bar)', () => {
        const input = '!(foo && bar)';
        assert.deepStrictEqual(parseToStr(input), '!bar || !foo');
    });
    test('!(foo && bar || boar) || deer', () => {
        const input = '!(foo && bar || boar) || deer';
        assert.deepStrictEqual(parseToStr(input), 'deer || !bar && !boar || !boar && !foo');
    });
    test(`!(!foo)`, () => {
        const input = `!(!foo)`;
        assert.deepStrictEqual(parseToStr(input), 'foo');
    });
    suite('controversial', () => {
        /*
            new parser KEEPS old one's behavior:

            old parser output: { key: 'debugState', op: '==', value: '"stopped"' }
            new parser output: { key: 'debugState', op: '==', value: '"stopped"' }

            TODO@ulugbekna: we should consider breaking old parser's behavior, and not take double quotes as part of the `value` because that's not what user expects.
        */
        test(`debugState == "stopped"`, () => {
            const input = `debugState == "stopped"`;
            assert.deepStrictEqual(parseToStr(input), 'debugState == \'"stopped"\'');
        });
        /*
            new parser BREAKS old one's behavior:

            old parser output: { key: 'viewItem', op: '==', value: 'VSCode WorkSpace' }
            new parser output: { key: 'viewItem', op: '==', value: 'VSCode' }

            TODO@ulugbekna: since this's breaking, we can have hacky code that tries detecting such cases and replicate old parser's behavior.
        */
        test(` viewItem == VSCode WorkSpace`, () => {
            const input = ` viewItem == VSCode WorkSpace`;
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected 'WorkSpace' at offset 20.\n");
        });
    });
    suite('regex', () => {
        test(`resource =~ //foo/(barr|door/(Foo-Bar%20Templates|Soo%20Looo)|Web%20Site%Jjj%20Llll)(/.*)*$/`, () => {
            const input = `resource =~ //foo/(barr|door/(Foo-Bar%20Templates|Soo%20Looo)|Web%20Site%Jjj%20Llll)(/.*)*$/`;
            assert.deepStrictEqual(parseToStr(input), 'resource =~ /\\/foo\\/(barr|door\\/(Foo-Bar%20Templates|Soo%20Looo)|Web%20Site%Jjj%20Llll)(\\/.*)*$/');
        });
        test(`resource =~ /((/scratch/(?!update)(.*)/)|((/src/).*/)).*$/`, () => {
            const input = `resource =~ /((/scratch/(?!update)(.*)/)|((/src/).*/)).*$/`;
            assert.deepStrictEqual(parseToStr(input), 'resource =~ /((\\/scratch\\/(?!update)(.*)\\/)|((\\/src\\/).*\\/)).*$/');
        });
        test(`resourcePath =~ /\.md(\.yml|\.txt)*$/giym`, () => {
            const input = `resourcePath =~ /\.md(\.yml|\.txt)*$/giym`;
            assert.deepStrictEqual(parseToStr(input), 'resourcePath =~ /.md(.yml|.txt)*$/im');
        });
    });
    suite('error handling', () => {
        test(`/foo`, () => {
            const input = `/foo`;
            assert.deepStrictEqual(parseToStr(input), "Lexing errors:\n\nUnexpected token '/foo' at offset 0. Did you forget to escape the '/' (slash) character? Put two backslashes before it to escape, e.g., '\\\\/'.\n\n --- \nParsing errors:\n\nUnexpected '/foo' at offset 0.\n");
        });
        test(`!b == 'true'`, () => {
            const input = `!b == 'true'`;
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected '==' at offset 3.\n");
        });
        test('!foo &&  in bar', () => {
            const input = '!foo &&  in bar';
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected 'in' at offset 9.\n");
        });
        test('vim<c-r> == 1 && vim<2<=3', () => {
            const input = 'vim<c-r> == 1 && vim<2<=3';
            assert.deepStrictEqual(parseToStr(input), "Lexing errors:\n\nUnexpected token '=' at offset 23. Did you mean == or =~?\n\n --- \nParsing errors:\n\nUnexpected '=' at offset 23.\n"); // FIXME
        });
        test(`foo && 'bar`, () => {
            const input = `foo && 'bar`;
            assert.deepStrictEqual(parseToStr(input), "Lexing errors:\n\nUnexpected token ''bar' at offset 7. Did you forget to open or close the quote?\n\n --- \nParsing errors:\n\nUnexpected ''bar' at offset 7.\n");
        });
        test(`config.foo &&  &&bar =~ /^foo$|^bar-foo$|^joo$|^jar$/ && !foo`, () => {
            const input = `config.foo &&  &&bar =~ /^foo$|^bar-foo$|^joo$|^jar$/ && !foo`;
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected '&&' at offset 15.\n");
        });
        test(`!foo == 'test'`, () => {
            const input = `!foo == 'test'`;
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected '==' at offset 5.\n");
        });
        test(`!!foo`, function () {
            const input = `!!foo`;
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected '!' at offset 1.\n");
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb250ZXh0a2V5L3Rlc3QvY29tbW9uL3BhcnNlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFbkQsU0FBUyxVQUFVLENBQUMsS0FBYTtJQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFBO0lBRTNCLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtJQUUzQixNQUFNLEtBQUssR0FBRyxDQUFDLEdBQUcsRUFBWSxFQUFFLEVBQUU7UUFDakMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xDLENBQUMsQ0FBQTtJQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDaEMsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDeEIsSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUMzQyxLQUFLLENBQ0oscUJBQXFCLFdBQVcsQ0FBQyxNQUFNLGVBQWUsV0FBVyxDQUFDLE1BQU0sS0FBSyxXQUFXLENBQUMsY0FBYyxFQUFFLEVB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
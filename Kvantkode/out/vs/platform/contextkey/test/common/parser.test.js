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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbnRleHRrZXkvdGVzdC9jb21tb24vcGFyc2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUVuRCxTQUFTLFVBQVUsQ0FBQyxLQUFhO0lBQ2hDLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUE7SUFFM0IsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO0lBRTNCLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxFQUFZLEVBQUUsRUFBRTtRQUNqQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQyxDQUFBO0lBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNoQyxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUN4QixJQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3BDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMvQixNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQzNDLEtBQUssQ0FDSixxQkFBcUIsV0FBVyxDQUFDLE1BQU0sZUFBZSxXQUFXLENBQUMsTUFBTSxLQUFL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
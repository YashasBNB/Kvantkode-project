/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Scanner } from '../../common/scanner.js';
suite('Context Key Scanner', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function tokenTypeToStr(token) {
        switch (token.type) {
            case 0 /* TokenType.LParen */:
                return '(';
            case 1 /* TokenType.RParen */:
                return ')';
            case 2 /* TokenType.Neg */:
                return '!';
            case 3 /* TokenType.Eq */:
                return token.isTripleEq ? '===' : '==';
            case 4 /* TokenType.NotEq */:
                return token.isTripleEq ? '!==' : '!=';
            case 5 /* TokenType.Lt */:
                return '<';
            case 6 /* TokenType.LtEq */:
                return '<=';
            case 7 /* TokenType.Gt */:
                return '>';
            case 8 /* TokenType.GtEq */:
                return '>=';
            case 9 /* TokenType.RegexOp */:
                return '=~';
            case 10 /* TokenType.RegexStr */:
                return 'RegexStr';
            case 11 /* TokenType.True */:
                return 'true';
            case 12 /* TokenType.False */:
                return 'false';
            case 13 /* TokenType.In */:
                return 'in';
            case 14 /* TokenType.Not */:
                return 'not';
            case 15 /* TokenType.And */:
                return '&&';
            case 16 /* TokenType.Or */:
                return '||';
            case 17 /* TokenType.Str */:
                return 'Str';
            case 18 /* TokenType.QuotedStr */:
                return 'QuotedStr';
            case 19 /* TokenType.Error */:
                return 'ErrorToken';
            case 20 /* TokenType.EOF */:
                return 'EOF';
        }
    }
    function scan(input) {
        return new Scanner()
            .reset(input)
            .scan()
            .map((token) => {
            return 'lexeme' in token
                ? {
                    type: tokenTypeToStr(token),
                    offset: token.offset,
                    lexeme: token.lexeme,
                }
                : {
                    type: tokenTypeToStr(token),
                    offset: token.offset,
                };
        });
    }
    suite('scanning various cases of context keys', () => {
        test('foo.bar<C-shift+2>', () => {
            const input = 'foo.bar<C-shift+2>';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'foo.bar<C-shift+2>', offset: 0 },
                { type: 'EOF', offset: 18 },
            ]);
        });
        test('!foo', () => {
            const input = '!foo';
            assert.deepStrictEqual(scan(input), [
                { type: '!', offset: 0 },
                { type: 'Str', lexeme: 'foo', offset: 1 },
                { type: 'EOF', offset: 4 },
            ]);
        });
        test('foo === bar', () => {
            const input = 'foo === bar';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', offset: 0, lexeme: 'foo' },
                { type: '===', offset: 4 },
                { type: 'Str', offset: 8, lexeme: 'bar' },
                { type: 'EOF', offset: 11 },
            ]);
        });
        test('foo  !== bar', () => {
            const input = 'foo  !== bar';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', offset: 0, lexeme: 'foo' },
                { type: '!==', offset: 5 },
                { type: 'Str', offset: 9, lexeme: 'bar' },
                { type: 'EOF', offset: 12 },
            ]);
        });
        test('!(foo && bar)', () => {
            const input = '!(foo && bar)';
            assert.deepStrictEqual(scan(input), [
                { type: '!', offset: 0 },
                { type: '(', offset: 1 },
                { type: 'Str', lexeme: 'foo', offset: 2 },
                { type: '&&', offset: 6 },
                { type: 'Str', lexeme: 'bar', offset: 9 },
                { type: ')', offset: 12 },
                { type: 'EOF', offset: 13 },
            ]);
        });
        test('=~ ', () => {
            const input = '=~ ';
            assert.deepStrictEqual(scan(input), [
                { type: '=~', offset: 0 },
                { type: 'EOF', offset: 3 },
            ]);
        });
        test('foo =~ /bar/', () => {
            const input = 'foo =~ /bar/';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'foo', offset: 0 },
                { type: '=~', offset: 4 },
                { type: 'RegexStr', lexeme: '/bar/', offset: 7 },
                { type: 'EOF', offset: 12 },
            ]);
        });
        test('foo =~ /zee/i', () => {
            const input = 'foo =~ /zee/i';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'foo', offset: 0 },
                { type: '=~', offset: 4 },
                { type: 'RegexStr', lexeme: '/zee/i', offset: 7 },
                { type: 'EOF', offset: 13 },
            ]);
        });
        test('foo =~ /zee/gm', () => {
            const input = 'foo =~ /zee/gm';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'foo', offset: 0 },
                { type: '=~', offset: 4 },
                { type: 'RegexStr', lexeme: '/zee/gm', offset: 7 },
                { type: 'EOF', offset: 14 },
            ]);
        });
        test('foo in barrr  ', () => {
            const input = 'foo in barrr  ';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'foo', offset: 0 },
                { type: 'in', offset: 4 },
                { type: 'Str', lexeme: 'barrr', offset: 7 },
                { type: 'EOF', offset: 14 },
            ]);
        });
        test(`resource =~ //FileCabinet/(SuiteScripts|Templates/(E-mail%20Templates|Marketing%20Templates)|Web%20Site%20Hosting%20Files)(/.*)*$/`, () => {
            const input = `resource =~ //FileCabinet/(SuiteScripts|Templates/(E-mail%20Templates|Marketing%20Templates)|Web%20Site%20Hosting%20Files)(/.*)*$/`;
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', offset: 0, lexeme: 'resource' },
                { type: '=~', offset: 9 },
                { type: 'RegexStr', offset: 12, lexeme: '//' },
                { type: 'Str', offset: 14, lexeme: 'FileCabinet/' },
                { type: '(', offset: 26 },
                { type: 'Str', offset: 27, lexeme: 'SuiteScripts' },
                { type: 'ErrorToken', offset: 39, lexeme: '|' },
                { type: 'Str', offset: 40, lexeme: 'Templates/' },
                { type: '(', offset: 50 },
                { type: 'Str', offset: 51, lexeme: 'E-mail%20Templates' },
                { type: 'ErrorToken', offset: 69, lexeme: '|' },
                { type: 'Str', offset: 70, lexeme: 'Marketing%20Templates' },
                { type: ')', offset: 91 },
                { type: 'ErrorToken', offset: 92, lexeme: '|' },
                { type: 'Str', offset: 93, lexeme: 'Web%20Site%20Hosting%20Files' },
                { type: ')', offset: 121 },
                { type: '(', offset: 122 },
                { type: 'RegexStr', offset: 123, lexeme: '/.*)*$/' },
                { type: 'EOF', offset: 130 },
            ]);
        });
        test('editorLangId in testely.supportedLangIds && resourceFilename =~ /^.+(.test.(\w+))$/gm', () => {
            const input = 'editorLangId in testely.supportedLangIds && resourceFilename =~ /^.+(.test.(\w+))$/gm';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'editorLangId', offset: 0 },
                { type: 'in', offset: 13 },
                { type: 'Str', lexeme: 'testely.supportedLangIds', offset: 16 },
                { type: '&&', offset: 41 },
                { type: 'Str', lexeme: 'resourceFilename', offset: 44 },
                { type: '=~', offset: 61 },
                { type: 'RegexStr', lexeme: '/^.+(.test.(w+))$/gm', offset: 64 },
                { type: 'EOF', offset: 84 },
            ]);
        });
        test('!(foo && bar) && baz', () => {
            const input = '!(foo && bar) && baz';
            assert.deepStrictEqual(scan(input), [
                { type: '!', offset: 0 },
                { type: '(', offset: 1 },
                { type: 'Str', lexeme: 'foo', offset: 2 },
                { type: '&&', offset: 6 },
                { type: 'Str', lexeme: 'bar', offset: 9 },
                { type: ')', offset: 12 },
                { type: '&&', offset: 14 },
                { type: 'Str', lexeme: 'baz', offset: 17 },
                { type: 'EOF', offset: 20 },
            ]);
        });
        test('foo.bar:zed==completed - equality with no space', () => {
            const input = 'foo.bar:zed==completed';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'foo.bar:zed', offset: 0 },
                { type: '==', offset: 11 },
                { type: 'Str', lexeme: 'completed', offset: 13 },
                { type: 'EOF', offset: 22 },
            ]);
        });
        test('a && b || c', () => {
            const input = 'a && b || c';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'a', offset: 0 },
                { type: '&&', offset: 2 },
                { type: 'Str', lexeme: 'b', offset: 5 },
                { type: '||', offset: 7 },
                { type: 'Str', lexeme: 'c', offset: 10 },
                { type: 'EOF', offset: 11 },
            ]);
        });
        test('fooBar && baz.jar && fee.bee<K-loo+1>', () => {
            const input = 'fooBar && baz.jar && fee.bee<K-loo+1>';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'fooBar', offset: 0 },
                { type: '&&', offset: 7 },
                { type: 'Str', lexeme: 'baz.jar', offset: 10 },
                { type: '&&', offset: 18 },
                { type: 'Str', lexeme: 'fee.bee<K-loo+1>', offset: 21 },
                { type: 'EOF', offset: 37 },
            ]);
        });
        test('foo.barBaz<C-r> < 2', () => {
            const input = 'foo.barBaz<C-r> < 2';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'foo.barBaz<C-r>', offset: 0 },
                { type: '<', offset: 16 },
                { type: 'Str', lexeme: '2', offset: 18 },
                { type: 'EOF', offset: 19 },
            ]);
        });
        test('foo.bar >= -1', () => {
            const input = 'foo.bar >= -1';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'foo.bar', offset: 0 },
                { type: '>=', offset: 8 },
                { type: 'Str', lexeme: '-1', offset: 11 },
                { type: 'EOF', offset: 13 },
            ]);
        });
        test('foo.bar <= -1', () => {
            const input = 'foo.bar <= -1';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'foo.bar', offset: 0 },
                { type: '<=', offset: 8 },
                { type: 'Str', lexeme: '-1', offset: 11 },
                { type: 'EOF', offset: 13 },
            ]);
        });
        test(`resource =~ /\\/Objects\\/.+\\.xml$/`, () => {
            const input = `resource =~ /\\/Objects\\/.+\\.xml$/`;
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'resource', offset: 0 },
                { type: '=~', offset: 9 },
                { type: 'RegexStr', lexeme: '/\\/Objects\\/.+\\.xml$/', offset: 12 },
                { type: 'EOF', offset: 33 },
            ]);
        });
        test('view == vsc-packages-activitybar-folders && vsc-packages-folders-loaded', () => {
            const input = `view == vsc-packages-activitybar-folders && vsc-packages-folders-loaded`;
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'view', offset: 0 },
                { type: '==', offset: 5 },
                { type: 'Str', lexeme: 'vsc-packages-activitybar-folders', offset: 8 },
                { type: '&&', offset: 41 },
                { type: 'Str', lexeme: 'vsc-packages-folders-loaded', offset: 44 },
                { type: 'EOF', offset: 71 },
            ]);
        });
        test(`sfdx:project_opened && resource =~ /.*\\/functions\\/.*\\/[^\\/]+(\\/[^\\/]+\.(ts|js|java|json|toml))?$/ && resourceFilename != package.json && resourceFilename != package-lock.json && resourceFilename != tsconfig.json`, () => {
            const input = `sfdx:project_opened && resource =~ /.*\\/functions\\/.*\\/[^\\/]+(\\/[^\\/]+\.(ts|js|java|json|toml))?$/ && resourceFilename != package.json && resourceFilename != package-lock.json && resourceFilename != tsconfig.json`;
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'sfdx:project_opened', offset: 0 },
                { type: '&&', offset: 20 },
                { type: 'Str', lexeme: 'resource', offset: 23 },
                { type: '=~', offset: 32 },
                {
                    type: 'RegexStr',
                    lexeme: '/.*\\/functions\\/.*\\/[^\\/]+(\\/[^\\/]+.(ts|js|java|json|toml))?$/',
                    offset: 35,
                },
                { type: '&&', offset: 98 },
                { type: 'Str', lexeme: 'resourceFilename', offset: 101 },
                { type: '!=', offset: 118 },
                { type: 'Str', lexeme: 'package.json', offset: 121 },
                { type: '&&', offset: 134 },
                { type: 'Str', lexeme: 'resourceFilename', offset: 137 },
                { type: '!=', offset: 154 },
                { type: 'Str', lexeme: 'package-lock.json', offset: 157 },
                { type: '&&', offset: 175 },
                { type: 'Str', lexeme: 'resourceFilename', offset: 178 },
                { type: '!=', offset: 195 },
                { type: 'Str', lexeme: 'tsconfig.json', offset: 198 },
                { type: 'EOF', offset: 211 },
            ]);
        });
        test(`view =~ '/(servers)/' && viewItem =~ '/^(Starting|Started|Debugging|Stopping|Stopped)/'`, () => {
            const input = `view =~ '/(servers)/' && viewItem =~ '/^(Starting|Started|Debugging|Stopping|Stopped)/'`;
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'view', offset: 0 },
                { type: '=~', offset: 5 },
                { type: 'QuotedStr', lexeme: '/(servers)/', offset: 9 },
                { type: '&&', offset: 22 },
                { type: 'Str', lexeme: 'viewItem', offset: 25 },
                { type: '=~', offset: 34 },
                {
                    type: 'QuotedStr',
                    lexeme: '/^(Starting|Started|Debugging|Stopping|Stopped)/',
                    offset: 38,
                },
                { type: 'EOF', offset: 87 },
            ]);
        });
        test(`resourcePath =~ /\.md(\.yml|\.txt)*$/gim`, () => {
            const input = `resourcePath =~ /\.md(\.yml|\.txt)*$/gim`;
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', offset: 0, lexeme: 'resourcePath' },
                { type: '=~', offset: 13 },
                { type: 'RegexStr', offset: 16, lexeme: '/.md(.yml|.txt)*$/gim' },
                { type: 'EOF', offset: 37 },
            ]);
        });
    });
    test(`foo === bar'`, () => {
        const input = `foo === bar'`;
        assert.deepStrictEqual(scan(input), [
            { type: 'Str', offset: 0, lexeme: 'foo' },
            { type: '===', offset: 4 },
            { type: 'Str', offset: 8, lexeme: 'bar' },
            { type: 'ErrorToken', offset: 11, lexeme: "'" },
            { type: 'EOF', offset: 12 },
        ]);
    });
    suite('handling lexical errors', () => {
        test(`foo === '`, () => {
            const input = `foo === '`;
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', offset: 0, lexeme: 'foo' },
                { type: '===', offset: 4 },
                { type: 'ErrorToken', offset: 8, lexeme: "'" },
                { type: 'EOF', offset: 9 },
            ]);
        });
        test(`foo && 'bar - unterminated single quote`, () => {
            const input = `foo && 'bar`;
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'foo', offset: 0 },
                { type: '&&', offset: 4 },
                { type: 'ErrorToken', offset: 7, lexeme: "'bar" },
                { type: 'EOF', offset: 11 },
            ]);
        });
        test('vim<c-r> == 1 && vim<2 <= 3', () => {
            const input = 'vim<c-r> == 1 && vim<2 <= 3';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', lexeme: 'vim<c-r>', offset: 0 },
                { type: '==', offset: 9 },
                { type: 'Str', lexeme: '1', offset: 12 },
                { type: '&&', offset: 14 },
                { type: 'Str', lexeme: 'vim<2', offset: 17 },
                { type: '<=', offset: 23 },
                { type: 'Str', lexeme: '3', offset: 26 },
                { type: 'EOF', offset: 27 },
            ]);
        });
        test('vim<c-r>==1 && vim<2<=3', () => {
            const input = 'vim<c-r>==1 && vim<2<=3';
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', offset: 0, lexeme: 'vim<c-r>' },
                { type: '==', offset: 8 },
                { type: 'Str', offset: 10, lexeme: '1' },
                { type: '&&', offset: 12 },
                { type: 'Str', offset: 15, lexeme: 'vim<2<' },
                { type: 'ErrorToken', offset: 21, lexeme: '=' },
                { type: 'Str', offset: 22, lexeme: '3' },
                { type: 'EOF', offset: 23 },
            ]);
        });
        test(`foo|bar`, () => {
            const input = `foo|bar`;
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', offset: 0, lexeme: 'foo' },
                { type: 'ErrorToken', offset: 3, lexeme: '|' },
                { type: 'Str', offset: 4, lexeme: 'bar' },
                { type: 'EOF', offset: 7 },
            ]);
        });
        test(`resource =~ //foo/(barr|door/(Foo-Bar%20Templates|Soo%20Looo)|Web%20Site%Jjj%20Llll)(/.*)*$/`, () => {
            const input = `resource =~ //foo/(barr|door/(Foo-Bar%20Templates|Soo%20Looo)|Web%20Site%Jjj%20Llll)(/.*)*$/`;
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', offset: 0, lexeme: 'resource' },
                { type: '=~', offset: 9 },
                { type: 'RegexStr', offset: 12, lexeme: '//' },
                { type: 'Str', offset: 14, lexeme: 'foo/' },
                { type: '(', offset: 18 },
                { type: 'Str', offset: 19, lexeme: 'barr' },
                { type: 'ErrorToken', offset: 23, lexeme: '|' },
                { type: 'Str', offset: 24, lexeme: 'door/' },
                { type: '(', offset: 29 },
                { type: 'Str', offset: 30, lexeme: 'Foo-Bar%20Templates' },
                { type: 'ErrorToken', offset: 49, lexeme: '|' },
                { type: 'Str', offset: 50, lexeme: 'Soo%20Looo' },
                { type: ')', offset: 60 },
                { type: 'ErrorToken', offset: 61, lexeme: '|' },
                { type: 'Str', offset: 62, lexeme: 'Web%20Site%Jjj%20Llll' },
                { type: ')', offset: 83 },
                { type: '(', offset: 84 },
                { type: 'RegexStr', offset: 85, lexeme: '/.*)*$/' },
                { type: 'EOF', offset: 92 },
            ]);
        });
        test(`/((/foo/(?!bar)(.*)/)|((/src/).*/)).*$/`, () => {
            const input = `/((/foo/(?!bar)(.*)/)|((/src/).*/)).*$/`;
            assert.deepStrictEqual(scan(input), [
                { type: 'RegexStr', offset: 0, lexeme: '/((/' },
                { type: 'Str', offset: 4, lexeme: 'foo/' },
                { type: '(', offset: 8 },
                { type: 'Str', offset: 9, lexeme: '?' },
                { type: '!', offset: 10 },
                { type: 'Str', offset: 11, lexeme: 'bar' },
                { type: ')', offset: 14 },
                { type: '(', offset: 15 },
                { type: 'Str', offset: 16, lexeme: '.*' },
                { type: ')', offset: 18 },
                { type: 'RegexStr', offset: 19, lexeme: '/)|((/s' },
                { type: 'Str', offset: 26, lexeme: 'rc/' },
                { type: ')', offset: 29 },
                { type: 'Str', offset: 30, lexeme: '.*/' },
                { type: ')', offset: 33 },
                { type: ')', offset: 34 },
                { type: 'Str', offset: 35, lexeme: '.*$/' },
                { type: 'EOF', offset: 39 },
            ]);
        });
        test(`resourcePath =~ //foo/barr// || resourcePath =~ //view/(jarrr|doooor|bees)/(web|templates)// && resourceExtname in foo.Bar`, () => {
            const input = `resourcePath =~ //foo/barr// || resourcePath =~ //view/(jarrr|doooor|bees)/(web|templates)// && resourceExtname in foo.Bar`;
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', offset: 0, lexeme: 'resourcePath' },
                { type: '=~', offset: 13 },
                { type: 'RegexStr', offset: 16, lexeme: '//' },
                { type: 'Str', offset: 18, lexeme: 'foo/barr//' },
                { type: '||', offset: 29 },
                { type: 'Str', offset: 32, lexeme: 'resourcePath' },
                { type: '=~', offset: 45 },
                { type: 'RegexStr', offset: 48, lexeme: '//' },
                { type: 'Str', offset: 50, lexeme: 'view/' },
                { type: '(', offset: 55 },
                { type: 'Str', offset: 56, lexeme: 'jarrr' },
                { type: 'ErrorToken', offset: 61, lexeme: '|' },
                { type: 'Str', offset: 62, lexeme: 'doooor' },
                { type: 'ErrorToken', offset: 68, lexeme: '|' },
                { type: 'Str', offset: 69, lexeme: 'bees' },
                { type: ')', offset: 73 },
                { type: 'RegexStr', offset: 74, lexeme: '/(web|templates)/' },
                { type: 'ErrorToken', offset: 91, lexeme: '/ && resourceExtname in foo.Bar' },
                { type: 'EOF', offset: 122 },
            ]);
        });
        test(`foo =~ /file:\// || bar`, () => {
            const input = JSON.parse('"foo =~ /file:\// || bar"');
            assert.deepStrictEqual(scan(input), [
                { type: 'Str', offset: 0, lexeme: 'foo' },
                { type: '=~', offset: 4 },
                { type: 'RegexStr', offset: 7, lexeme: '/file:/' },
                { type: 'ErrorToken', offset: 14, lexeme: '/ || bar' },
                { type: 'EOF', offset: 22 },
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nhbm5lci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29udGV4dGtleS90ZXN0L2NvbW1vbi9zY2FubmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxPQUFPLEVBQW9CLE1BQU0seUJBQXlCLENBQUE7QUFFbkUsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNqQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsY0FBYyxDQUFDLEtBQVk7UUFDbkMsUUFBUSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDcEI7Z0JBQ0MsT0FBTyxHQUFHLENBQUE7WUFDWDtnQkFDQyxPQUFPLEdBQUcsQ0FBQTtZQUNYO2dCQUNDLE9BQU8sR0FBRyxDQUFBO1lBQ1g7Z0JBQ0MsT0FBTyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUN2QztnQkFDQyxPQUFPLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQ3ZDO2dCQUNDLE9BQU8sR0FBRyxDQUFBO1lBQ1g7Z0JBQ0MsT0FBTyxJQUFJLENBQUE7WUFDWjtnQkFDQyxPQUFPLEdBQUcsQ0FBQTtZQUNYO2dCQUNDLE9BQU8sSUFBSSxDQUFBO1lBQ1o7Z0JBQ0MsT0FBTyxJQUFJLENBQUE7WUFDWjtnQkFDQyxPQUFPLFVBQVUsQ0FBQTtZQUNsQjtnQkFDQyxPQUFPLE1BQU0sQ0FBQTtZQUNkO2dCQUNDLE9BQU8sT0FBTyxDQUFBO1lBQ2Y7Z0JBQ0MsT0FB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QUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7Z0JBQ3ZDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUN6QixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO2dCQUMxQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtnQkFDekIsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7Z0JBQ3pCLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7Z0JBQ3pDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUN6QixFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFO2dCQUNuRCxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO2dCQUMxQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtnQkFDekIsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtnQkFDMUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7Z0JBQ3pCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUN6QixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFO2dCQUMzQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFB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
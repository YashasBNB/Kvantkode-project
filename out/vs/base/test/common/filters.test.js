/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { anyScore, createMatches, fuzzyScore, fuzzyScoreGraceful, fuzzyScoreGracefulAggressive, matchesCamelCase, matchesContiguousSubString, matchesPrefix, matchesStrictPrefix, matchesSubString, matchesWords, or, } from '../../common/filters.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
function filterOk(filter, word, wordToMatchAgainst, highlights) {
    const r = filter(word, wordToMatchAgainst);
    assert(r, `${word} didn't match ${wordToMatchAgainst}`);
    if (highlights) {
        assert.deepStrictEqual(r, highlights);
    }
}
function filterNotOk(filter, word, wordToMatchAgainst) {
    assert(!filter(word, wordToMatchAgainst), `${word} matched ${wordToMatchAgainst}`);
}
suite('Filters', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('or', () => {
        let filter;
        let counters;
        const newFilter = function (i, r) {
            return function () {
                counters[i]++;
                return r;
            };
        };
        counters = [0, 0];
        filter = or(newFilter(0, false), newFilter(1, false));
        filterNotOk(filter, 'anything', 'anything');
        assert.deepStrictEqual(counters, [1, 1]);
        counters = [0, 0];
        filter = or(newFilter(0, true), newFilter(1, false));
        filterOk(filter, 'anything', 'anything');
        assert.deepStrictEqual(counters, [1, 0]);
        counters = [0, 0];
        filter = or(newFilter(0, true), newFilter(1, true));
        filterOk(filter, 'anything', 'anything');
        assert.deepStrictEqual(counters, [1, 0]);
        counters = [0, 0];
        filter = or(newFilter(0, false), newFilter(1, true));
        filterOk(filter, 'anything', 'anything');
        assert.deepStrictEqual(counters, [1, 1]);
    });
    test('PrefixFilter - case sensitive', function () {
        filterNotOk(matchesStrictPrefix, '', '');
        filterOk(matchesStrictPrefix, '', 'anything', []);
        filterOk(matchesStrictPrefix, 'alpha', 'alpha', [{ start: 0, end: 5 }]);
        filterOk(matchesStrictPrefix, 'alpha', 'alphasomething', [{ start: 0, end: 5 }]);
        filterNotOk(matchesStrictPrefix, 'alpha', 'alp');
        filterOk(matchesStrictPrefix, 'a', 'alpha', [{ start: 0, end: 1 }]);
        filterNotOk(matchesStrictPrefix, 'x', 'alpha');
        filterNotOk(matchesStrictPrefix, 'A', 'alpha');
        filterNotOk(matchesStrictPrefix, 'AlPh', 'alPHA');
    });
    test('PrefixFilter - ignore case', function () {
        filterOk(matchesPrefix, 'alpha', 'alpha', [{ start: 0, end: 5 }]);
        filterOk(matchesPrefix, 'alpha', 'alphasomething', [{ start: 0, end: 5 }]);
        filterNotOk(matchesPrefix, 'alpha', 'alp');
        filterOk(matchesPrefix, 'a', 'alpha', [{ start: 0, end: 1 }]);
        filterOk(matchesPrefix, 'ä', 'Älpha', [{ start: 0, end: 1 }]);
        filterNotOk(matchesPrefix, 'x', 'alpha');
        filterOk(matchesPrefix, 'A', 'alpha', [{ start: 0, end: 1 }]);
        filterOk(matchesPrefix, 'AlPh', 'alPHA', [{ start: 0, end: 4 }]);
        filterNotOk(matchesPrefix, 'T', '4'); // see https://github.com/microsoft/vscode/issues/22401
    });
    test('CamelCaseFilter', () => {
        filterNotOk(matchesCamelCase, '', '');
        filterOk(matchesCamelCase, '', 'anything', []);
        filterOk(matchesCamelCase, 'alpha', 'alpha', [{ start: 0, end: 5 }]);
        filterOk(matchesCamelCase, 'AlPhA', 'alpha', [{ start: 0, end: 5 }]);
        filterOk(matchesCamelCase, 'alpha', 'alphasomething', [{ start: 0, end: 5 }]);
        filterNotOk(matchesCamelCase, 'alpha', 'alp');
        filterOk(matchesCamelCase, 'c', 'CamelCaseRocks', [{ start: 0, end: 1 }]);
        filterOk(matchesCamelCase, 'cc', 'CamelCaseRocks', [
            { start: 0, end: 1 },
            { start: 5, end: 6 },
        ]);
        filterOk(matchesCamelCase, 'ccr', 'CamelCaseRocks', [
            { start: 0, end: 1 },
            { start: 5, end: 6 },
            { start: 9, end: 10 },
        ]);
        filterOk(matchesCamelCase, 'cacr', 'CamelCaseRocks', [
            { start: 0, end: 2 },
            { start: 5, end: 6 },
            { start: 9, end: 10 },
        ]);
        filterOk(matchesCamelCase, 'cacar', 'CamelCaseRocks', [
            { start: 0, end: 2 },
            { start: 5, end: 7 },
            { start: 9, end: 10 },
        ]);
        filterOk(matchesCamelCase, 'ccarocks', 'CamelCaseRocks', [
            { start: 0, end: 1 },
            { start: 5, end: 7 },
            { start: 9, end: 14 },
        ]);
        filterOk(matchesCamelCase, 'cr', 'CamelCaseRocks', [
            { start: 0, end: 1 },
            { start: 9, end: 10 },
        ]);
        filterOk(matchesCamelCase, 'fba', 'FooBarAbe', [
            { start: 0, end: 1 },
            { start: 3, end: 5 },
        ]);
        filterOk(matchesCamelCase, 'fbar', 'FooBarAbe', [
            { start: 0, end: 1 },
            { start: 3, end: 6 },
        ]);
        filterOk(matchesCamelCase, 'fbara', 'FooBarAbe', [
            { start: 0, end: 1 },
            { start: 3, end: 7 },
        ]);
        filterOk(matchesCamelCase, 'fbaa', 'FooBarAbe', [
            { start: 0, end: 1 },
            { start: 3, end: 5 },
            { start: 6, end: 7 },
        ]);
        filterOk(matchesCamelCase, 'fbaab', 'FooBarAbe', [
            { start: 0, end: 1 },
            { start: 3, end: 5 },
            { start: 6, end: 8 },
        ]);
        filterOk(matchesCamelCase, 'c2d', 'canvasCreation2D', [
            { start: 0, end: 1 },
            { start: 14, end: 16 },
        ]);
        filterOk(matchesCamelCase, 'cce', '_canvasCreationEvent', [
            { start: 1, end: 2 },
            { start: 7, end: 8 },
            { start: 15, end: 16 },
        ]);
    });
    test('CamelCaseFilter - #19256', function () {
        assert(matchesCamelCase('Debug Console', 'Open: Debug Console'));
        assert(matchesCamelCase('Debug console', 'Open: Debug Console'));
        assert(matchesCamelCase('debug console', 'Open: Debug Console'));
    });
    test('matchesContiguousSubString', () => {
        filterOk(matchesContiguousSubString, 'cela', 'cancelAnimationFrame()', [{ start: 3, end: 7 }]);
    });
    test('matchesSubString', () => {
        filterOk(matchesSubString, 'cmm', 'cancelAnimationFrame()', [
            { start: 0, end: 1 },
            { start: 9, end: 10 },
            { start: 18, end: 19 },
        ]);
        filterOk(matchesSubString, 'abc', 'abcabc', [{ start: 0, end: 3 }]);
        filterOk(matchesSubString, 'abc', 'aaabbbccc', [
            { start: 0, end: 1 },
            { start: 3, end: 4 },
            { start: 6, end: 7 },
        ]);
    });
    test('matchesSubString performance (#35346)', function () {
        filterNotOk(matchesSubString, 'aaaaaaaaaaaaaaaaaaaax', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    });
    test('WordFilter', () => {
        filterOk(matchesWords, 'alpha', 'alpha', [{ start: 0, end: 5 }]);
        filterOk(matchesWords, 'alpha', 'alphasomething', [{ start: 0, end: 5 }]);
        filterNotOk(matchesWords, 'alpha', 'alp');
        filterOk(matchesWords, 'a', 'alpha', [{ start: 0, end: 1 }]);
        filterNotOk(matchesWords, 'x', 'alpha');
        filterOk(matchesWords, 'A', 'alpha', [{ start: 0, end: 1 }]);
        filterOk(matchesWords, 'AlPh', 'alPHA', [{ start: 0, end: 4 }]);
        assert(matchesWords('Debug Console', 'Open: Debug Console'));
        filterOk(matchesWords, 'gp', 'Git: Pull', [
            { start: 0, end: 1 },
            { start: 5, end: 6 },
        ]);
        filterOk(matchesWords, 'g p', 'Git: Pull', [
            { start: 0, end: 1 },
            { start: 5, end: 6 },
        ]);
        filterOk(matchesWords, 'gipu', 'Git: Pull', [
            { start: 0, end: 2 },
            { start: 5, end: 7 },
        ]);
        filterOk(matchesWords, 'gp', 'Category: Git: Pull', [
            { start: 10, end: 11 },
            { start: 15, end: 16 },
        ]);
        filterOk(matchesWords, 'g p', 'Category: Git: Pull', [
            { start: 10, end: 11 },
            { start: 15, end: 16 },
        ]);
        filterOk(matchesWords, 'gipu', 'Category: Git: Pull', [
            { start: 10, end: 12 },
            { start: 15, end: 17 },
        ]);
        filterNotOk(matchesWords, 'it', 'Git: Pull');
        filterNotOk(matchesWords, 'll', 'Git: Pull');
        filterOk(matchesWords, 'git: プル', 'git: プル', [{ start: 0, end: 7 }]);
        filterOk(matchesWords, 'git プル', 'git: プル', [
            { start: 0, end: 3 },
            { start: 5, end: 7 },
        ]);
        filterOk(matchesWords, 'öäk', 'Öhm: Älles Klar', [
            { start: 0, end: 1 },
            { start: 5, end: 6 },
            { start: 11, end: 12 },
        ]);
        // Handles issue #123915
        filterOk(matchesWords, 'C++', 'C/C++: command', [{ start: 2, end: 5 }]);
        // Handles issue #154533
        filterOk(matchesWords, '.', ':', []);
        filterOk(matchesWords, '.', '.', [{ start: 0, end: 1 }]);
        // assert.ok(matchesWords('gipu', 'Category: Git: Pull', true) === null);
        // assert.deepStrictEqual(matchesWords('pu', 'Category: Git: Pull', true), [{ start: 15, end: 17 }]);
        filterOk(matchesWords, 'bar', 'foo-bar');
        filterOk(matchesWords, 'bar test', 'foo-bar test');
        filterOk(matchesWords, 'fbt', 'foo-bar test');
        filterOk(matchesWords, 'bar test', 'foo-bar (test)');
        filterOk(matchesWords, 'foo bar', 'foo (bar)');
        filterNotOk(matchesWords, 'bar est', 'foo-bar test');
        filterNotOk(matchesWords, 'fo ar', 'foo-bar test');
        filterNotOk(matchesWords, 'for', 'foo-bar test');
        filterOk(matchesWords, 'foo bar', 'foo-bar');
        filterOk(matchesWords, 'foo bar', '123 foo-bar 456');
        filterOk(matchesWords, 'foo-bar', 'foo bar');
        filterOk(matchesWords, 'foo:bar', 'foo:bar');
    });
    function assertMatches(pattern, word, decoratedWord, filter, opts = {}) {
        const r = filter(pattern, pattern.toLowerCase(), opts.patternPos || 0, word, word.toLowerCase(), opts.wordPos || 0, { firstMatchCanBeWeak: opts.firstMatchCanBeWeak ?? false, boostFullMatch: true });
        assert.ok(!decoratedWord === !r);
        if (r) {
            const matches = createMatches(r);
            let actualWord = '';
            let pos = 0;
            for (const match of matches) {
                actualWord += word.substring(pos, match.start);
                actualWord += '^' + word.substring(match.start, match.end).split('').join('^');
                pos = match.end;
            }
            actualWord += word.substring(pos);
            assert.strictEqual(actualWord, decoratedWord);
        }
    }
    test('fuzzyScore, #23215', function () {
        assertMatches('tit', 'win.tit', 'win.^t^i^t', fuzzyScore);
        assertMatches('title', 'win.title', 'win.^t^i^t^l^e', fuzzyScore);
        assertMatches('WordCla', 'WordCharacterClassifier', '^W^o^r^dCharacter^C^l^assifier', fuzzyScore);
        assertMatches('WordCCla', 'WordCharacterClassifier', '^W^o^r^d^Character^C^l^assifier', fuzzyScore);
    });
    test('fuzzyScore, #23332', function () {
        assertMatches('dete', '"editor.quickSuggestionsDelay"', undefined, fuzzyScore);
    });
    test('fuzzyScore, #23190', function () {
        assertMatches('c:\\do', "& 'C:\\Documents and Settings'", "& '^C^:^\\^D^ocuments and Settings'", fuzzyScore);
        assertMatches('c:\\do', "& 'c:\\Documents and Settings'", "& '^c^:^\\^D^ocuments and Settings'", fuzzyScore);
    });
    test('fuzzyScore, #23581', function () {
        assertMatches('close', 'css.lint.importStatement', '^css.^lint.imp^ort^Stat^ement', fuzzyScore);
        assertMatches('close', 'css.colorDecorators.enable', '^css.co^l^orDecorator^s.^enable', fuzzyScore);
        assertMatches('close', 'workbench.quickOpen.closeOnFocusOut', 'workbench.quickOpen.^c^l^o^s^eOnFocusOut', fuzzyScore);
        assertTopScore(fuzzyScore, 'close', 2, 'css.lint.importStatement', 'css.colorDecorators.enable', 'workbench.quickOpen.closeOnFocusOut');
    });
    test('fuzzyScore, #23458', function () {
        assertMatches('highlight', 'editorHoverHighlight', 'editorHover^H^i^g^h^l^i^g^h^t', fuzzyScore);
        assertMatches('hhighlight', 'editorHoverHighlight', 'editor^Hover^H^i^g^h^l^i^g^h^t', fuzzyScore);
        assertMatches('dhhighlight', 'editorHoverHighlight', undefined, fuzzyScore);
    });
    test('fuzzyScore, #23746', function () {
        assertMatches('-moz', '-moz-foo', '^-^m^o^z-foo', fuzzyScore);
        assertMatches('moz', '-moz-foo', '-^m^o^z-foo', fuzzyScore);
        assertMatches('moz', '-moz-animation', '-^m^o^z-animation', fuzzyScore);
        assertMatches('moza', '-moz-animation', '-^m^o^z-^animation', fuzzyScore);
    });
    test('fuzzyScore', () => {
        assertMatches('ab', 'abA', '^a^bA', fuzzyScore);
        assertMatches('ccm', 'cacmelCase', '^ca^c^melCase', fuzzyScore);
        assertMatches('bti', 'the_black_knight', undefined, fuzzyScore);
        assertMatches('ccm', 'camelCase', undefined, fuzzyScore);
        assertMatches('cmcm', 'camelCase', undefined, fuzzyScore);
        assertMatches('BK', 'the_black_knight', 'the_^black_^knight', fuzzyScore);
        assertMatches('KeyboardLayout=', 'KeyboardLayout', undefined, fuzzyScore);
        assertMatches('LLL', 'SVisualLoggerLogsList', 'SVisual^Logger^Logs^List', fuzzyScore);
        assertMatches('LLLL', 'SVilLoLosLi', undefined, fuzzyScore);
        assertMatches('LLLL', 'SVisualLoggerLogsList', undefined, fuzzyScore);
        assertMatches('TEdit', 'TextEdit', '^Text^E^d^i^t', fuzzyScore);
        assertMatches('TEdit', 'TextEditor', '^Text^E^d^i^tor', fuzzyScore);
        assertMatches('TEdit', 'Textedit', '^Text^e^d^i^t', fuzzyScore);
        assertMatches('TEdit', 'text_edit', '^text_^e^d^i^t', fuzzyScore);
        assertMatches('TEditDit', 'TextEditorDecorationType', '^Text^E^d^i^tor^Decorat^ion^Type', fuzzyScore);
        assertMatches('TEdit', 'TextEditorDecorationType', '^Text^E^d^i^torDecorationType', fuzzyScore);
        assertMatches('Tedit', 'TextEdit', '^Text^E^d^i^t', fuzzyScore);
        assertMatches('ba', '?AB?', undefined, fuzzyScore);
        assertMatches('bkn', 'the_black_knight', 'the_^black_^k^night', fuzzyScore);
        assertMatches('bt', 'the_black_knight', 'the_^black_knigh^t', fuzzyScore);
        assertMatches('ccm', 'camelCasecm', '^camel^Casec^m', fuzzyScore);
        assertMatches('fdm', 'findModel', '^fin^d^Model', fuzzyScore);
        assertMatches('fob', 'foobar', '^f^oo^bar', fuzzyScore);
        assertMatches('fobz', 'foobar', undefined, fuzzyScore);
        assertMatches('foobar', 'foobar', '^f^o^o^b^a^r', fuzzyScore);
        assertMatches('form', 'editor.formatOnSave', 'editor.^f^o^r^matOnSave', fuzzyScore);
        assertMatches('g p', 'Git: Pull', '^Git:^ ^Pull', fuzzyScore);
        assertMatches('g p', 'Git: Pull', '^Git:^ ^Pull', fuzzyScore);
        assertMatches('gip', 'Git: Pull', '^G^it: ^Pull', fuzzyScore);
        assertMatches('gip', 'Git: Pull', '^G^it: ^Pull', fuzzyScore);
        assertMatches('gp', 'Git: Pull', '^Git: ^Pull', fuzzyScore);
        assertMatches('gp', 'Git_Git_Pull', '^Git_Git_^Pull', fuzzyScore);
        assertMatches('is', 'ImportStatement', '^Import^Statement', fuzzyScore);
        assertMatches('is', 'isValid', '^i^sValid', fuzzyScore);
        assertMatches('lowrd', 'lowWord', '^l^o^wWo^r^d', fuzzyScore);
        assertMatches('myvable', 'myvariable', '^m^y^v^aria^b^l^e', fuzzyScore);
        assertMatches('no', '', undefined, fuzzyScore);
        assertMatches('no', 'match', undefined, fuzzyScore);
        assertMatches('ob', 'foobar', undefined, fuzzyScore);
        assertMatches('sl', 'SVisualLoggerLogsList', '^SVisual^LoggerLogsList', fuzzyScore);
        assertMatches('sllll', 'SVisualLoggerLogsList', '^SVisua^l^Logger^Logs^List', fuzzyScore);
        assertMatches('Three', 'HTMLHRElement', undefined, fuzzyScore);
        assertMatches('Three', 'Three', '^T^h^r^e^e', fuzzyScore);
        assertMatches('fo', 'barfoo', undefined, fuzzyScore);
        assertMatches('fo', 'bar_foo', 'bar_^f^oo', fuzzyScore);
        assertMatches('fo', 'bar_Foo', 'bar_^F^oo', fuzzyScore);
        assertMatches('fo', 'bar foo', 'bar ^f^oo', fuzzyScore);
        assertMatches('fo', 'bar.foo', 'bar.^f^oo', fuzzyScore);
        assertMatches('fo', 'bar/foo', 'bar/^f^oo', fuzzyScore);
        assertMatches('fo', 'bar\\foo', 'bar\\^f^oo', fuzzyScore);
    });
    test('fuzzyScore (first match can be weak)', function () {
        assertMatches('Three', 'HTMLHRElement', 'H^TML^H^R^El^ement', fuzzyScore, {
            firstMatchCanBeWeak: true,
        });
        assertMatches('tor', 'constructor', 'construc^t^o^r', fuzzyScore, { firstMatchCanBeWeak: true });
        assertMatches('ur', 'constructor', 'constr^ucto^r', fuzzyScore, { firstMatchCanBeWeak: true });
        assertTopScore(fuzzyScore, 'tor', 2, 'constructor', 'Thor', 'cTor');
    });
    test('fuzzyScore, many matches', function () {
        assertMatches('aaaaaa', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '^a^a^a^a^a^aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', fuzzyScore);
    });
    test('Freeze when fjfj -> jfjf, https://github.com/microsoft/vscode/issues/91807', function () {
        assertMatches('jfjfj', 'fjfjfjfjfjfjfjfjfjfjfj', undefined, fuzzyScore);
        assertMatches('jfjfjfjfjfjfjfjfjfj', 'fjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', undefined, fuzzyScore);
        assertMatches('jfjfjfjfjfjfjfjfjfjjfjfjfjfjfjfjfjfjfjjfjfjfjfjfjfjfjfjfjjfjfjfjfjfjfjfjfjfjjfjfjfjfjfjfjfjfjfjjfjfjfjfjfjfjfjfjfj', 'fjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', undefined, fuzzyScore);
        assertMatches('jfjfjfjfjfjfjfjfjfj', 'fJfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', 'f^J^f^j^f^j^f^j^f^j^f^j^f^j^f^j^f^j^f^jfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', // strong match
        fuzzyScore);
        assertMatches('jfjfjfjfjfjfjfjfjfj', 'fjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', 'f^j^f^j^f^j^f^j^f^j^f^j^f^j^f^j^f^j^f^jfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', // any match
        fuzzyScore, { firstMatchCanBeWeak: true });
    });
    test('fuzzyScore, issue #26423', function () {
        assertMatches('baba', 'abababab', undefined, fuzzyScore);
        assertMatches('fsfsfs', 'dsafdsafdsafdsafdsafdsafdsafasdfdsa', undefined, fuzzyScore);
        assertMatches('fsfsfsfsfsfsfsf', 'dsafdsafdsafdsafdsafdsafdsafasdfdsafdsafdsafdsafdsfdsafdsfdfdfasdnfdsajfndsjnafjndsajlknfdsa', undefined, fuzzyScore);
    });
    test('Fuzzy IntelliSense matching vs Haxe metadata completion, #26995', function () {
        assertMatches('f', ':Foo', ':^Foo', fuzzyScore);
        assertMatches('f', ':foo', ':^foo', fuzzyScore);
    });
    test('Separator only match should not be weak #79558', function () {
        assertMatches('.', 'foo.bar', 'foo^.bar', fuzzyScore);
    });
    test("Cannot set property '1' of undefined, #26511", function () {
        const word = new Array(123).join('a');
        const pattern = new Array(120).join('a');
        fuzzyScore(pattern, pattern.toLowerCase(), 0, word, word.toLowerCase(), 0);
        assert.ok(true); // must not explode
    });
    test("Vscode 1.12 no longer obeys 'sortText' in completion items (from language server), #26096", function () {
        assertMatches('  ', '  group', undefined, fuzzyScore, { patternPos: 2 });
        assertMatches('  g', '  group', '  ^group', fuzzyScore, { patternPos: 2 });
        assertMatches('g', '  group', '  ^group', fuzzyScore);
        assertMatches('g g', '  groupGroup', undefined, fuzzyScore);
        assertMatches('g g', '  group Group', '  ^group^ ^Group', fuzzyScore);
        assertMatches(' g g', '  group Group', '  ^group^ ^Group', fuzzyScore, { patternPos: 1 });
        assertMatches('zz', 'zzGroup', '^z^zGroup', fuzzyScore);
        assertMatches('zzg', 'zzGroup', '^z^z^Group', fuzzyScore);
        assertMatches('g', 'zzGroup', 'zz^Group', fuzzyScore);
    });
    test("patternPos isn't working correctly #79815", function () {
        assertMatches(':p'.substr(1), 'prop', '^prop', fuzzyScore, { patternPos: 0 });
        assertMatches(':p', 'prop', '^prop', fuzzyScore, { patternPos: 1 });
        assertMatches(':p', 'prop', undefined, fuzzyScore, { patternPos: 2 });
        assertMatches(':p', 'proP', 'pro^P', fuzzyScore, { patternPos: 1, wordPos: 1 });
        assertMatches(':p', 'aprop', 'a^prop', fuzzyScore, { patternPos: 1, firstMatchCanBeWeak: true });
        assertMatches(':p', 'aprop', undefined, fuzzyScore, {
            patternPos: 1,
            firstMatchCanBeWeak: false,
        });
    });
    function assertTopScore(filter, pattern, expected, ...words) {
        let topScore = -(100 * 10);
        let topIdx = 0;
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const m = filter(pattern, pattern.toLowerCase(), 0, word, word.toLowerCase(), 0);
            if (m) {
                const [score] = m;
                if (score > topScore) {
                    topScore = score;
                    topIdx = i;
                }
            }
        }
        assert.strictEqual(topIdx, expected, `${pattern} -> actual=${words[topIdx]} <> expected=${words[expected]}`);
    }
    test('topScore - fuzzyScore', function () {
        assertTopScore(fuzzyScore, 'cons', 2, 'ArrayBufferConstructor', 'Console', 'console');
        assertTopScore(fuzzyScore, 'Foo', 1, 'foo', 'Foo', 'foo');
        // #24904
        assertTopScore(fuzzyScore, 'onMess', 1, 'onmessage', 'onMessage', 'onThisMegaEscape');
        assertTopScore(fuzzyScore, 'CC', 1, 'camelCase', 'CamelCase');
        assertTopScore(fuzzyScore, 'cC', 0, 'camelCase', 'CamelCase');
        // assertTopScore(fuzzyScore, 'cC', 1, 'ccfoo', 'camelCase');
        // assertTopScore(fuzzyScore, 'cC', 1, 'ccfoo', 'camelCase', 'foo-cC-bar');
        // issue #17836
        // assertTopScore(fuzzyScore, 'TEdit', 1, 'TextEditorDecorationType', 'TextEdit', 'TextEditor');
        assertTopScore(fuzzyScore, 'p', 4, 'parse', 'posix', 'pafdsa', 'path', 'p');
        assertTopScore(fuzzyScore, 'pa', 0, 'parse', 'pafdsa', 'path');
        // issue #14583
        assertTopScore(fuzzyScore, 'log', 3, 'HTMLOptGroupElement', 'ScrollLogicalPosition', 'SVGFEMorphologyElement', 'log', 'logger');
        assertTopScore(fuzzyScore, 'e', 2, 'AbstractWorker', 'ActiveXObject', 'else');
        // issue #14446
        assertTopScore(fuzzyScore, 'workbench.sideb', 1, 'workbench.editor.defaultSideBySideLayout', 'workbench.sideBar.location');
        // issue #11423
        assertTopScore(fuzzyScore, 'editor.r', 2, 'diffEditor.renderSideBySide', 'editor.overviewRulerlanes', 'editor.renderControlCharacter', 'editor.renderWhitespace');
        // assertTopScore(fuzzyScore, 'editor.R', 1, 'diffEditor.renderSideBySide', 'editor.overviewRulerlanes', 'editor.renderControlCharacter', 'editor.renderWhitespace');
        // assertTopScore(fuzzyScore, 'Editor.r', 0, 'diffEditor.renderSideBySide', 'editor.overviewRulerlanes', 'editor.renderControlCharacter', 'editor.renderWhitespace');
        assertTopScore(fuzzyScore, '-mo', 1, '-ms-ime-mode', '-moz-columns');
        // dupe, issue #14861
        assertTopScore(fuzzyScore, 'convertModelPosition', 0, 'convertModelPositionToViewPosition', 'convertViewToModelPosition');
        // dupe, issue #14942
        assertTopScore(fuzzyScore, 'is', 0, 'isValidViewletId', 'import statement');
        assertTopScore(fuzzyScore, 'title', 1, 'files.trimTrailingWhitespace', 'window.title');
        assertTopScore(fuzzyScore, 'const', 1, 'constructor', 'const', 'cuOnstrul');
    });
    test('Unexpected suggestion scoring, #28791', function () {
        assertTopScore(fuzzyScore, '_lines', 1, '_lineStarts', '_lines');
        assertTopScore(fuzzyScore, '_lines', 1, '_lineS', '_lines');
        assertTopScore(fuzzyScore, '_lineS', 0, '_lineS', '_lines');
    });
    test.skip('Bad completion ranking changes valid variable name to class name when pressing "." #187055', function () {
        assertTopScore(fuzzyScore, 'a', 1, 'A', 'a');
        assertTopScore(fuzzyScore, 'theme', 1, 'Theme', 'theme');
    });
    test('HTML closing tag proposal filtered out #38880', function () {
        assertMatches('\t\t<', '\t\t</body>', '^\t^\t^</body>', fuzzyScore, { patternPos: 0 });
        assertMatches('\t\t<', '\t\t</body>', '\t\t^</body>', fuzzyScore, { patternPos: 2 });
        assertMatches('\t<', '\t</body>', '\t^</body>', fuzzyScore, { patternPos: 1 });
    });
    test('fuzzyScoreGraceful', () => {
        assertMatches('rlut', 'result', undefined, fuzzyScore);
        assertMatches('rlut', 'result', '^res^u^l^t', fuzzyScoreGraceful);
        assertMatches('cno', 'console', '^co^ns^ole', fuzzyScore);
        assertMatches('cno', 'console', '^co^ns^ole', fuzzyScoreGraceful);
        assertMatches('cno', 'console', '^c^o^nsole', fuzzyScoreGracefulAggressive);
        assertMatches('cno', 'co_new', '^c^o_^new', fuzzyScoreGraceful);
        assertMatches('cno', 'co_new', '^c^o_^new', fuzzyScoreGracefulAggressive);
    });
    test('List highlight filter: Not all characters from match are highlighterd #66923', () => {
        assertMatches('foo', 'barbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_foo', 'barbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_^f^o^o', fuzzyScore);
    });
    test('Autocompletion is matched against truncated filterText to 54 characters #74133', () => {
        assertMatches('foo', 'ffffffffffffffffffffffffffffbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_foo', 'ffffffffffffffffffffffffffffbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_^f^o^o', fuzzyScore);
        assertMatches('Aoo', 'Affffffffffffffffffffffffffffbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_foo', '^Affffffffffffffffffffffffffffbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_f^o^o', fuzzyScore);
        assertMatches('foo', 'Gffffffffffffffffffffffffffffbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_foo', undefined, fuzzyScore);
    });
    test('"Go to Symbol" with the exact method name doesn\'t work as expected #84787', function () {
        const match = fuzzyScore(':get', ':get', 1, 'get', 'get', 0, {
            firstMatchCanBeWeak: true,
            boostFullMatch: true,
        });
        assert.ok(Boolean(match));
    });
    test('Wrong highlight after emoji #113404', function () {
        assertMatches('di', '✨div classname=""></div>', '✨^d^iv classname=""></div>', fuzzyScore);
        assertMatches('di', 'adiv classname=""></div>', 'adiv classname=""></^d^iv>', fuzzyScore);
    });
    test('Suggestion is not highlighted #85826', function () {
        assertMatches('SemanticTokens', 'SemanticTokensEdits', '^S^e^m^a^n^t^i^c^T^o^k^e^n^sEdits', fuzzyScore);
        assertMatches('SemanticTokens', 'SemanticTokensEdits', '^S^e^m^a^n^t^i^c^T^o^k^e^n^sEdits', fuzzyScoreGracefulAggressive);
    });
    test('IntelliSense completion not correctly highlighting text in front of cursor #115250', function () {
        assertMatches('lo', 'log', '^l^og', fuzzyScore);
        assertMatches('.lo', 'log', '^l^og', anyScore);
        assertMatches('.', 'log', 'log', anyScore);
    });
    test('anyScore should not require a strong first match', function () {
        assertMatches('bar', 'foobAr', 'foo^b^A^r', anyScore);
        assertMatches('bar', 'foobar', 'foo^b^a^r', anyScore);
    });
    test('configurable full match boost', function () {
        const prefix = 'create';
        const a = 'createModelServices';
        const b = 'create';
        let aBoost = fuzzyScore(prefix, prefix, 0, a, a.toLowerCase(), 0, {
            boostFullMatch: true,
            firstMatchCanBeWeak: true,
        });
        let bBoost = fuzzyScore(prefix, prefix, 0, b, b.toLowerCase(), 0, {
            boostFullMatch: true,
            firstMatchCanBeWeak: true,
        });
        assert.ok(aBoost);
        assert.ok(bBoost);
        assert.ok(aBoost[0] < bBoost[0]);
        // also works with wordStart > 0 (https://github.com/microsoft/vscode/issues/187921)
        const wordPrefix = '$(symbol-function) ';
        aBoost = fuzzyScore(prefix, prefix, 0, `${wordPrefix}${a}`, `${wordPrefix}${a}`.toLowerCase(), wordPrefix.length, { boostFullMatch: true, firstMatchCanBeWeak: true });
        bBoost = fuzzyScore(prefix, prefix, 0, `${wordPrefix}${b}`, `${wordPrefix}${b}`.toLowerCase(), wordPrefix.length, { boostFullMatch: true, firstMatchCanBeWeak: true });
        assert.ok(aBoost);
        assert.ok(bBoost);
        assert.ok(aBoost[0] < bBoost[0]);
        const aScore = fuzzyScore(prefix, prefix, 0, a, a.toLowerCase(), 0, {
            boostFullMatch: false,
            firstMatchCanBeWeak: true,
        });
        const bScore = fuzzyScore(prefix, prefix, 0, b, b.toLowerCase(), 0, {
            boostFullMatch: false,
            firstMatchCanBeWeak: true,
        });
        assert.ok(aScore);
        assert.ok(bScore);
        assert.ok(aScore[0] === bScore[0]);
    });
    test('Unexpected suggest highlighting ignores whole word match in favor of matching first letter#147423', function () {
        assertMatches('i', 'machine/{id}', 'machine/{^id}', fuzzyScore);
        assertMatches('ok', 'obobobf{ok}/user', '^obobobf{o^k}/user', fuzzyScore);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2ZpbHRlcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLFFBQVEsRUFDUixhQUFhLEVBQ2IsVUFBVSxFQUNWLGtCQUFrQixFQUNsQiw0QkFBNEIsRUFJNUIsZ0JBQWdCLEVBQ2hCLDBCQUEwQixFQUMxQixhQUFhLEVBQ2IsbUJBQW1CLEVBQ25CLGdCQUFnQixFQUNoQixZQUFZLEVBQ1osRUFBRSxHQUNGLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFLFNBQVMsUUFBUSxDQUNoQixNQUFlLEVBQ2YsSUFBWSxFQUNaLGtCQUEwQixFQUMxQixVQUE2QztJQUU3QyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUE7SUFDMUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLElBQUksaUJBQWlCLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtJQUN2RCxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsTUFBZSxFQUFFLElBQVksRUFBRSxrQkFBMEI7SUFDN0UsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLEdBQUcsSUFBSSxZQUFZLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtBQUNuRixDQUFDO0FBRUQsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFH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QUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1NBQ3BCLENBQUMsQ0FBQTtRQUNGLFFBQVEsQ0FBQyxZQUFZLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRTtZQUMxQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtZQUNwQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtTQUNwQixDQUFDLENBQUE7UUFDRixRQUFRLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUU7WUFDM0MsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FBQyxDQUFBO1FBRUYsUUFBUSxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDbkQsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7WUFDdEIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7U0FDdEIsQ0FBQyxDQUFBO1FBQ0YsUUFBUSxDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUscUJBQXFCLEVBQUU7WUFDcEQsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7WUFDdEIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7U0FDdEIsQ0FBQyxDQUFBO1FBQ0YsUUFBUSxDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUU7WUFDckQsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7WUFDdEIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7U0FDdEIsQ0FBQyxDQUFBO1FBRUYsV0FB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
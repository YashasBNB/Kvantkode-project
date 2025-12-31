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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9maWx0ZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTixRQUFRLEVBQ1IsYUFBYSxFQUNiLFVBQVUsRUFDVixrQkFBa0IsRUFDbEIsNEJBQTRCLEVBSTVCLGdCQUFnQixFQUNoQiwwQkFBMEIsRUFDMUIsYUFBYSxFQUNiLG1CQUFtQixFQUNuQixnQkFBZ0IsRUFDaEIsWUFBWSxFQUNaLEVBQUUsR0FDRixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxTQUFTLFFBQVEsQ0FDaEIsTUFBZSxFQUNmLElBQVksRUFDWixrQkFBMEIsRUFDMUIsVUFBNkM7SUFFN0MsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO0lBQzFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLGlCQUFpQixrQkFBa0IsRUFBRSxDQUFDLENBQUE7SUFDdkQsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNoQixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLE1BQWUsRUFBRSxJQUFZLEVBQUUsa0JBQTBCO0lBQzdFLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxHQUFHLElBQUksWUFBWSxrQkFBa0IsRUFBRSxDQUFDLENBQUE7QUFDbkYsQ0FBQztBQUVELEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFF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
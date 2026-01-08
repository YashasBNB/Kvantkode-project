/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { getMapForWordSeparators } from '../../../common/core/wordCharacterClassifier.js';
import { USUAL_WORD_SEPARATORS } from '../../../common/core/wordHelper.js';
import { FindMatch, SearchData } from '../../../common/model.js';
import { SearchParams, TextModelSearch, isMultilineRegexSource, } from '../../../common/model/textModelSearch.js';
import { createTextModel } from '../testTextModel.js';
// --------- Find
suite('TextModelSearch', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const usualWordSeparators = getMapForWordSeparators(USUAL_WORD_SEPARATORS, []);
    function assertFindMatch(actual, expectedRange, expectedMatches = null) {
        assert.deepStrictEqual(actual, new FindMatch(expectedRange, expectedMatches));
    }
    function _assertFindMatches(model, searchParams, expectedMatches) {
        const actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), false, 1000);
        assert.deepStrictEqual(actual, expectedMatches, 'findMatches OK');
        // test `findNextMatch`
        let startPos = new Position(1, 1);
        let match = TextModelSearch.findNextMatch(model, searchParams, startPos, false);
        assert.deepStrictEqual(match, expectedMatches[0], `findNextMatch ${startPos}`);
        for (const expectedMatch of expectedMatches) {
            startPos = expectedMatch.range.getStartPosition();
            match = TextModelSearch.findNextMatch(model, searchParams, startPos, false);
            assert.deepStrictEqual(match, expectedMatch, `findNextMatch ${startPos}`);
        }
        // test `findPrevMatch`
        startPos = new Position(model.getLineCount(), model.getLineMaxColumn(model.getLineCount()));
        match = TextModelSearch.findPreviousMatch(model, searchParams, startPos, false);
        assert.deepStrictEqual(match, expectedMatches[expectedMatches.length - 1], `findPrevMatch ${startPos}`);
        for (const expectedMatch of expectedMatches) {
            startPos = expectedMatch.range.getEndPosition();
            match = TextModelSearch.findPreviousMatch(model, searchParams, startPos, false);
            assert.deepStrictEqual(match, expectedMatch, `findPrevMatch ${startPos}`);
        }
    }
    function assertFindMatches(text, searchString, isRegex, matchCase, wordSeparators, _expected) {
        const expectedRanges = _expected.map((entry) => new Range(entry[0], entry[1], entry[2], entry[3]));
        const expectedMatches = expectedRanges.map((entry) => new FindMatch(entry, null));
        const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
        const model = createTextModel(text);
        _assertFindMatches(model, searchParams, expectedMatches);
        model.dispose();
        const model2 = createTextModel(text);
        model2.setEOL(1 /* EndOfLineSequence.CRLF */);
        _assertFindMatches(model2, searchParams, expectedMatches);
        model2.dispose();
    }
    const regularText = [
        'This is some foo - bar text which contains foo and bar - as in Barcelona.',
        "Now it begins a word fooBar and now it is caps Foo-isn't this great?",
        "And here's a dull line with nothing interesting in it",
        "It is also interesting if it's part of a word like amazingFooBar",
        'Again nothing interesting here',
    ];
    test('Simple find', () => {
        assertFindMatches(regularText.join('\n'), 'foo', false, false, null, [
            [1, 14, 1, 17],
            [1, 44, 1, 47],
            [2, 22, 2, 25],
            [2, 48, 2, 51],
            [4, 59, 4, 62],
        ]);
    });
    test('Case sensitive find', () => {
        assertFindMatches(regularText.join('\n'), 'foo', false, true, null, [
            [1, 14, 1, 17],
            [1, 44, 1, 47],
            [2, 22, 2, 25],
        ]);
    });
    test('Whole words find', () => {
        assertFindMatches(regularText.join('\n'), 'foo', false, false, USUAL_WORD_SEPARATORS, [
            [1, 14, 1, 17],
            [1, 44, 1, 47],
            [2, 48, 2, 51],
        ]);
    });
    test('/^/ find', () => {
        assertFindMatches(regularText.join('\n'), '^', true, false, null, [
            [1, 1, 1, 1],
            [2, 1, 2, 1],
            [3, 1, 3, 1],
            [4, 1, 4, 1],
            [5, 1, 5, 1],
        ]);
    });
    test('/$/ find', () => {
        assertFindMatches(regularText.join('\n'), '$', true, false, null, [
            [1, 74, 1, 74],
            [2, 69, 2, 69],
            [3, 54, 3, 54],
            [4, 65, 4, 65],
            [5, 31, 5, 31],
        ]);
    });
    test('/.*/ find', () => {
        assertFindMatches(regularText.join('\n'), '.*', true, false, null, [
            [1, 1, 1, 74],
            [2, 1, 2, 69],
            [3, 1, 3, 54],
            [4, 1, 4, 65],
            [5, 1, 5, 31],
        ]);
    });
    test('/^$/ find', () => {
        assertFindMatches([
            'This is some foo - bar text which contains foo and bar - as in Barcelona.',
            '',
            "And here's a dull line with nothing interesting in it",
            '',
            'Again nothing interesting here',
        ].join('\n'), '^$', true, false, null, [
            [2, 1, 2, 1],
            [4, 1, 4, 1],
        ]);
    });
    test('multiline find 1', () => {
        assertFindMatches(['Just some text text', 'Just some text text', 'some text again', 'again some text'].join('\n'), 'text\\n', true, false, null, [
            [1, 16, 2, 1],
            [2, 16, 3, 1],
        ]);
    });
    test('multiline find 2', () => {
        assertFindMatches(['Just some text text', 'Just some text text', 'some text again', 'again some text'].join('\n'), 'text\\nJust', true, false, null, [[1, 16, 2, 5]]);
    });
    test('multiline find 3', () => {
        assertFindMatches(['Just some text text', 'Just some text text', 'some text again', 'again some text'].join('\n'), '\\nagain', true, false, null, [[3, 16, 4, 6]]);
    });
    test('multiline find 4', () => {
        assertFindMatches(['Just some text text', 'Just some text text', 'some text again', 'again some text'].join('\n'), '.*\\nJust.*\\n', true, false, null, [[1, 1, 3, 1]]);
    });
    test('multiline find with line beginning regex', () => {
        assertFindMatches(['if', 'else', '', 'if', 'else'].join('\n'), '^if\\nelse', true, false, null, [
            [1, 1, 2, 5],
            [4, 1, 5, 5],
        ]);
    });
    test('matching empty lines using boundary expression', () => {
        assertFindMatches(['if', '', 'else', '  ', 'if', ' ', 'else'].join('\n'), '^\\s*$\\n', true, false, null, [
            [2, 1, 3, 1],
            [4, 1, 5, 1],
            [6, 1, 7, 1],
        ]);
    });
    test('matching lines starting with A and ending with B', () => {
        assertFindMatches(['a if b', 'a', 'ab', 'eb'].join('\n'), '^a.*b$', true, false, null, [
            [1, 1, 1, 7],
            [3, 1, 3, 3],
        ]);
    });
    test('multiline find with line ending regex', () => {
        assertFindMatches(['if', 'else', '', 'if', 'elseif', 'else'].join('\n'), 'if\\nelse$', true, false, null, [
            [1, 1, 2, 5],
            [5, 5, 6, 5],
        ]);
    });
    test('issue #4836 - ^.*$', () => {
        assertFindMatches(['Just some text text', '', 'some text again', '', 'again some text'].join('\n'), '^.*$', true, false, null, [
            [1, 1, 1, 20],
            [2, 1, 2, 1],
            [3, 1, 3, 16],
            [4, 1, 4, 1],
            [5, 1, 5, 16],
        ]);
    });
    test('multiline find for non-regex string', () => {
        assertFindMatches([
            'Just some text text',
            'some text text',
            'some text again',
            'again some text',
            'but not some',
        ].join('\n'), 'text\nsome', false, false, null, [
            [1, 16, 2, 5],
            [2, 11, 3, 5],
        ]);
    });
    test('issue #3623: Match whole word does not work for not latin characters', () => {
        assertFindMatches(['я', 'компилятор', 'обфускация', ':я-я'].join('\n'), 'я', false, false, USUAL_WORD_SEPARATORS, [
            [1, 1, 1, 2],
            [4, 2, 4, 3],
            [4, 4, 4, 5],
        ]);
    });
    test('issue #27459: Match whole words regression', () => {
        assertFindMatches([
            'this._register(this._textAreaInput.onKeyDown((e: IKeyboardEvent) => {',
            '	this._viewController.emitKeyDown(e);',
            '}));',
        ].join('\n'), '((e: ', false, false, USUAL_WORD_SEPARATORS, [[1, 45, 1, 50]]);
    });
    test('issue #27594: Search results disappear', () => {
        assertFindMatches(['this.server.listen(0);'].join('\n'), 'listen(', false, false, USUAL_WORD_SEPARATORS, [[1, 13, 1, 20]]);
    });
    test('findNextMatch without regex', () => {
        const model = createTextModel('line line one\nline two\nthree');
        const searchParams = new SearchParams('line', false, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(1, 6, 1, 10));
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 3), false);
        assertFindMatch(actual, new Range(1, 6, 1, 10));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(2, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        model.dispose();
    });
    test('findNextMatch with beginning boundary regex', () => {
        const model = createTextModel('line one\nline two\nthree');
        const searchParams = new SearchParams('^line', true, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(2, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 3), false);
        assertFindMatch(actual, new Range(2, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        model.dispose();
    });
    test('findNextMatch with beginning boundary regex and line has repetitive beginnings', () => {
        const model = createTextModel('line line one\nline two\nthree');
        const searchParams = new SearchParams('^line', true, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(2, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 3), false);
        assertFindMatch(actual, new Range(2, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(1, 1, 1, 5));
        model.dispose();
    });
    test('findNextMatch with beginning boundary multiline regex and line has repetitive beginnings', () => {
        const model = createTextModel('line line one\nline two\nline three\nline four');
        const searchParams = new SearchParams('^line.*\\nline', true, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), false);
        assertFindMatch(actual, new Range(1, 1, 2, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(3, 1, 4, 5));
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(2, 1), false);
        assertFindMatch(actual, new Range(2, 1, 3, 5));
        model.dispose();
    });
    test('findNextMatch with ending boundary regex', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('line$', true, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), false);
        assertFindMatch(actual, new Range(1, 10, 1, 14));
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 4), false);
        assertFindMatch(actual, new Range(1, 10, 1, 14));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(2, 5, 2, 9));
        actual = TextModelSearch.findNextMatch(model, searchParams, actual.range.getEndPosition(), false);
        assertFindMatch(actual, new Range(1, 10, 1, 14));
        model.dispose();
    });
    test('findMatches with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)', true, false, null);
        const actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 100);
        assert.deepStrictEqual(actual, [
            new FindMatch(new Range(1, 5, 1, 9), ['line', 'line', 'in']),
            new FindMatch(new Range(1, 10, 1, 14), ['line', 'line', 'in']),
            new FindMatch(new Range(2, 5, 2, 9), ['line', 'line', 'in']),
        ]);
        model.dispose();
    });
    test('findMatches multiline with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)\\n', true, false, null);
        const actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 100);
        assert.deepStrictEqual(actual, [
            new FindMatch(new Range(1, 10, 2, 1), ['line\n', 'line', 'in']),
            new FindMatch(new Range(2, 5, 3, 1), ['line\n', 'line', 'in']),
        ]);
        model.dispose();
    });
    test('findNextMatch with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)', true, false, null);
        const actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        assertFindMatch(actual, new Range(1, 5, 1, 9), ['line', 'line', 'in']);
        model.dispose();
    });
    test('findNextMatch multiline with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)\\n', true, false, null);
        const actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        assertFindMatch(actual, new Range(1, 10, 2, 1), ['line\n', 'line', 'in']);
        model.dispose();
    });
    test('findPreviousMatch with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)', true, false, null);
        const actual = TextModelSearch.findPreviousMatch(model, searchParams, new Position(1, 1), true);
        assertFindMatch(actual, new Range(2, 5, 2, 9), ['line', 'line', 'in']);
        model.dispose();
    });
    test('findPreviousMatch multiline with capturing matches', () => {
        const model = createTextModel('one line line\ntwo line\nthree');
        const searchParams = new SearchParams('(l(in)e)\\n', true, false, null);
        const actual = TextModelSearch.findPreviousMatch(model, searchParams, new Position(1, 1), true);
        assertFindMatch(actual, new Range(2, 5, 3, 1), ['line\n', 'line', 'in']);
        model.dispose();
    });
    test('\\n matches \\r\\n', () => {
        const model = createTextModel('a\r\nb\r\nc\r\nd\r\ne\r\nf\r\ng\r\nh\r\ni');
        assert.strictEqual(model.getEOL(), '\r\n');
        let searchParams = new SearchParams('h\\n', true, false, null);
        let actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 1000)[0];
        assertFindMatch(actual, new Range(8, 1, 9, 1), ['h\n']);
        searchParams = new SearchParams('g\\nh\\n', true, false, null);
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 1000)[0];
        assertFindMatch(actual, new Range(7, 1, 9, 1), ['g\nh\n']);
        searchParams = new SearchParams('\\ni', true, false, null);
        actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 1000)[0];
        assertFindMatch(actual, new Range(8, 2, 9, 2), ['\ni']);
        model.dispose();
    });
    test('\\r can never be found', () => {
        const model = createTextModel('a\r\nb\r\nc\r\nd\r\ne\r\nf\r\ng\r\nh\r\ni');
        assert.strictEqual(model.getEOL(), '\r\n');
        const searchParams = new SearchParams('\\r\\n', true, false, null);
        const actual = TextModelSearch.findNextMatch(model, searchParams, new Position(1, 1), true);
        assert.strictEqual(actual, null);
        assert.deepStrictEqual(TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 1000), []);
        model.dispose();
    });
    function assertParseSearchResult(searchString, isRegex, matchCase, wordSeparators, expected) {
        const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
        const actual = searchParams.parseSearchRequest();
        if (expected === null) {
            assert.ok(actual === null);
        }
        else {
            assert.deepStrictEqual(actual.regex, expected.regex);
            assert.deepStrictEqual(actual.simpleSearch, expected.simpleSearch);
            if (wordSeparators) {
                assert.ok(actual.wordSeparators !== null);
            }
            else {
                assert.ok(actual.wordSeparators === null);
            }
        }
    }
    test('parseSearchRequest invalid', () => {
        assertParseSearchResult('', true, true, USUAL_WORD_SEPARATORS, null);
        assertParseSearchResult('(', true, false, null, null);
    });
    test('parseSearchRequest non regex', () => {
        assertParseSearchResult('foo', false, false, null, new SearchData(/foo/giu, null, null));
        assertParseSearchResult('foo', false, false, USUAL_WORD_SEPARATORS, new SearchData(/foo/giu, usualWordSeparators, null));
        assertParseSearchResult('foo', false, true, null, new SearchData(/foo/gu, null, 'foo'));
        assertParseSearchResult('foo', false, true, USUAL_WORD_SEPARATORS, new SearchData(/foo/gu, usualWordSeparators, 'foo'));
        assertParseSearchResult('foo\\n', false, false, null, new SearchData(/foo\\n/giu, null, null));
        assertParseSearchResult('foo\\\\n', false, false, null, new SearchData(/foo\\\\n/giu, null, null));
        assertParseSearchResult('foo\\r', false, false, null, new SearchData(/foo\\r/giu, null, null));
        assertParseSearchResult('foo\\\\r', false, false, null, new SearchData(/foo\\\\r/giu, null, null));
    });
    test('parseSearchRequest regex', () => {
        assertParseSearchResult('foo', true, false, null, new SearchData(/foo/giu, null, null));
        assertParseSearchResult('foo', true, false, USUAL_WORD_SEPARATORS, new SearchData(/foo/giu, usualWordSeparators, null));
        assertParseSearchResult('foo', true, true, null, new SearchData(/foo/gu, null, null));
        assertParseSearchResult('foo', true, true, USUAL_WORD_SEPARATORS, new SearchData(/foo/gu, usualWordSeparators, null));
        assertParseSearchResult('foo\\n', true, false, null, new SearchData(/foo\n/gimu, null, null));
        assertParseSearchResult('foo\\\\n', true, false, null, new SearchData(/foo\\n/giu, null, null));
        assertParseSearchResult('foo\\r', true, false, null, new SearchData(/foo\r/gimu, null, null));
        assertParseSearchResult('foo\\\\r', true, false, null, new SearchData(/foo\\r/giu, null, null));
    });
    test('issue #53415. \W should match line break.', () => {
        assertFindMatches(['text', '180702-', '180703-180704'].join('\n'), '\\d{6}-\\W', true, false, null, [[2, 1, 3, 1]]);
        assertFindMatches(['Just some text', '', 'Just'].join('\n'), '\\W', true, false, null, [
            [1, 5, 1, 6],
            [1, 10, 1, 11],
            [1, 15, 2, 1],
            [2, 1, 3, 1],
        ]);
        // Line break doesn't affect the result as we always use \n as line break when doing search
        assertFindMatches(['Just some text', '', 'Just'].join('\r\n'), '\\W', true, false, null, [
            [1, 5, 1, 6],
            [1, 10, 1, 11],
            [1, 15, 2, 1],
            [2, 1, 3, 1],
        ]);
        assertFindMatches(['Just some text', '\tJust', 'Just'].join('\n'), '\\W', true, false, null, [
            [1, 5, 1, 6],
            [1, 10, 1, 11],
            [1, 15, 2, 1],
            [2, 1, 2, 2],
            [2, 6, 3, 1],
        ]);
        // line break is seen as one non-word character
        assertFindMatches(['Just  some text', '', 'Just'].join('\n'), '\\W{2}', true, false, null, [
            [1, 5, 1, 7],
            [1, 16, 3, 1],
        ]);
        // even if it's \r\n
        assertFindMatches(['Just  some text', '', 'Just'].join('\r\n'), '\\W{2}', true, false, null, [
            [1, 5, 1, 7],
            [1, 16, 3, 1],
        ]);
    });
    test('Simple find using unicode escape sequences', () => {
        assertFindMatches(regularText.join('\n'), '\\u{0066}\\u006f\\u006F', true, false, null, [
            [1, 14, 1, 17],
            [1, 44, 1, 47],
            [2, 22, 2, 25],
            [2, 48, 2, 51],
            [4, 59, 4, 62],
        ]);
    });
    test('isMultilineRegexSource', () => {
        assert(!isMultilineRegexSource('foo'));
        assert(!isMultilineRegexSource(''));
        assert(!isMultilineRegexSource('foo\\sbar'));
        assert(!isMultilineRegexSource('\\\\notnewline'));
        assert(isMultilineRegexSource('foo\\nbar'));
        assert(isMultilineRegexSource('foo\\nbar\\s'));
        assert(isMultilineRegexSource('foo\\r\\n'));
        assert(isMultilineRegexSource('\\n'));
        assert(isMultilineRegexSource('foo\\W'));
        assert(isMultilineRegexSource('foo\n'));
        assert(isMultilineRegexSource('foo\r\n'));
    });
    test('isMultilineRegexSource correctly identifies multiline patterns', () => {
        const singleLinePatterns = ['MARK:\\s*(?<label>.*)$', '^// Header$', '\\s*[-=]+\\s*'];
        const multiLinePatterns = [
            '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$',
            'header\\r\\nfooter',
            'start\\r|\\nend',
            'top\nmiddle\r\nbottom',
        ];
        for (const pattern of singleLinePatterns) {
            assert.strictEqual(isMultilineRegexSource(pattern), false, `Pattern should not be multiline: ${pattern}`);
        }
        for (const pattern of multiLinePatterns) {
            assert.strictEqual(isMultilineRegexSource(pattern), true, `Pattern should be multiline: ${pattern}`);
        }
    });
    test('issue #74715. \\d* finds empty string and stops searching.', () => {
        const model = createTextModel('10.243.30.10');
        const searchParams = new SearchParams('\\d*', true, false, null);
        const actual = TextModelSearch.findMatches(model, searchParams, model.getFullModelRange(), true, 100);
        assert.deepStrictEqual(actual, [
            new FindMatch(new Range(1, 1, 1, 3), ['10']),
            new FindMatch(new Range(1, 3, 1, 3), ['']),
            new FindMatch(new Range(1, 4, 1, 7), ['243']),
            new FindMatch(new Range(1, 7, 1, 7), ['']),
            new FindMatch(new Range(1, 8, 1, 10), ['30']),
            new FindMatch(new Range(1, 10, 1, 10), ['']),
            new FindMatch(new Range(1, 11, 1, 13), ['10']),
        ]);
        model.dispose();
    });
    test('issue #100134. Zero-length matches should properly step over surrogate pairs', () => {
        // 1[Laptop]1 - there shoud be no matches inside of [Laptop] emoji
        assertFindMatches('1\uD83D\uDCBB1', '()', true, false, null, [
            [1, 1, 1, 1],
            [1, 2, 1, 2],
            [1, 4, 1, 4],
            [1, 5, 1, 5],
        ]);
        // 1[Hacker Cat]1 = 1[Cat Face][ZWJ][Laptop]1 - there shoud be matches between emoji and ZWJ
        // there shoud be no matches inside of [Cat Face] and [Laptop] emoji
        assertFindMatches('1\uD83D\uDC31\u200D\uD83D\uDCBB1', '()', true, false, null, [
            [1, 1, 1, 1],
            [1, 2, 1, 2],
            [1, 4, 1, 4],
            [1, 5, 1, 5],
            [1, 7, 1, 7],
            [1, 8, 1, 8],
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsU2VhcmNoLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC90ZXh0TW9kZWxTZWFyY2gudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRSxPQUFPLEVBQXFCLFNBQVMsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVuRixPQUFPLEVBQ04sWUFBWSxFQUNaLGVBQWUsRUFDZixzQkFBc0IsR0FDdEIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFckQsaUJBQWlCO0FBQ2pCLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDN0IsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLG1CQUFtQixHQUFHLHVCQUF1QixDQUFDLHFCQUFxQixFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBRTlFLFNBQVMsZUFBZSxDQUN2QixNQUF3QixFQUN4QixhQUFvQixFQUNwQixrQkFBbUMsSUFBSTtRQUV2QyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUMs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QUU7WUFDdEYsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDWixDQUFDLENBQUE7UUFFRiwyRkFBMkY7UUFDM0YsaUJBQWlCLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtZQUN4RixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNaLENBQUMsQ0FBQTtRQUVGLGlCQUFpQixDQUFDLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7WUFDNUYsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFD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
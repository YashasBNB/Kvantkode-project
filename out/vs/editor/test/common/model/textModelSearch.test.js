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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsU2VhcmNoLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvdGV4dE1vZGVsU2VhcmNoLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUUsT0FBTyxFQUFxQixTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFbkYsT0FBTyxFQUNOLFlBQVksRUFDWixlQUFlLEVBQ2Ysc0JBQXNCLEdBQ3RCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXJELGlCQUFpQjtBQUNqQixLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxtQkFBbUIsR0FBRyx1QkFBdUIsQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUU5RSxTQUFTLGVBQWUsQ0FDdkIsTUFBd0IsRUFDeEIsYUFBb0IsRUFDcEIsa0JBQW1DLElBQUk7UUFFdkMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsYUFBYSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUE7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RSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNaLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDckIsaUJBQWlCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7WUFDakUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7UUFDdEIsaUJBQWlCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7WUFDbEUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNiLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYs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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostDocumentData } from '../../common/extHostDocumentData.js';
import { Position } from '../../common/extHostTypes.js';
import { Range } from '../../../../editor/common/core/range.js';
import { mock } from '../../../../base/test/common/mock.js';
import * as perfData from './extHostDocumentData.test.perf-data.js';
import { setDefaultGetWordAtTextConfig } from '../../../../editor/common/core/wordHelper.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostDocumentData', () => {
    let data;
    function assertPositionAt(offset, line, character) {
        const position = data.document.positionAt(offset);
        assert.strictEqual(position.line, line);
        assert.strictEqual(position.character, character);
    }
    function assertOffsetAt(line, character, offset) {
        const pos = new Position(line, character);
        const actual = data.document.offsetAt(pos);
        assert.strictEqual(actual, offset);
    }
    setup(function () {
        data = new ExtHostDocumentData(undefined, URI.file(''), [
            'This is line one', //16
            'and this is line number two', //27
            'it is followed by #3', //20
            'and finished with the fourth.', //29
        ], '\n', 1, 'text', false, 'utf8');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('readonly-ness', () => {
        assert.throws(() => (data.document.uri = null));
        assert.throws(() => (data.document.fileName = 'foofile'));
        assert.throws(() => (data.document.isDirty = false));
        assert.throws(() => (data.document.isUntitled = false));
        assert.throws(() => (data.document.languageId = 'dddd'));
        assert.throws(() => (data.document.lineCount = 9));
    });
    test('save, when disposed', function () {
        let saved;
        const data = new ExtHostDocumentData(new (class extends mock() {
            $trySaveDocument(uri) {
                assert.ok(!saved);
                saved = uri;
                return Promise.resolve(true);
            }
        })(), URI.parse('foo:bar'), [], '\n', 1, 'text', true, 'utf8');
        return data.document.save().then(() => {
            assert.strictEqual(saved.toString(), 'foo:bar');
            data.dispose();
            return data.document.save().then(() => {
                assert.ok(false, 'expected failure');
            }, (err) => {
                assert.ok(err);
            });
        });
    });
    test('read, when disposed', function () {
        data.dispose();
        const { document } = data;
        assert.strictEqual(document.lineCount, 4);
        assert.strictEqual(document.lineAt(0).text, 'This is line one');
    });
    test('lines', () => {
        assert.strictEqual(data.document.lineCount, 4);
        assert.throws(() => data.document.lineAt(-1));
        assert.throws(() => data.document.lineAt(data.document.lineCount));
        assert.throws(() => data.document.lineAt(Number.MAX_VALUE));
        assert.throws(() => data.document.lineAt(Number.MIN_VALUE));
        assert.throws(() => data.document.lineAt(0.8));
        let line = data.document.lineAt(0);
        assert.strictEqual(line.lineNumber, 0);
        assert.strictEqual(line.text.length, 16);
        assert.strictEqual(line.text, 'This is line one');
        assert.strictEqual(line.isEmptyOrWhitespace, false);
        assert.strictEqual(line.firstNonWhitespaceCharacterIndex, 0);
        data.onEvents({
            changes: [
                {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: '\t ',
                },
            ],
            eol: undefined,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        });
        // line didn't change
        assert.strictEqual(line.text, 'This is line one');
        assert.strictEqual(line.firstNonWhitespaceCharacterIndex, 0);
        // fetch line again
        line = data.document.lineAt(0);
        assert.strictEqual(line.text, '\t This is line one');
        assert.strictEqual(line.firstNonWhitespaceCharacterIndex, 2);
    });
    test('line, issue #5704', function () {
        let line = data.document.lineAt(0);
        let { range, rangeIncludingLineBreak } = line;
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.end.character, 16);
        assert.strictEqual(rangeIncludingLineBreak.end.line, 1);
        assert.strictEqual(rangeIncludingLineBreak.end.character, 0);
        line = data.document.lineAt(data.document.lineCount - 1);
        range = line.range;
        rangeIncludingLineBreak = line.rangeIncludingLineBreak;
        assert.strictEqual(range.end.line, 3);
        assert.strictEqual(range.end.character, 29);
        assert.strictEqual(rangeIncludingLineBreak.end.line, 3);
        assert.strictEqual(rangeIncludingLineBreak.end.character, 29);
    });
    test('offsetAt', () => {
        assertOffsetAt(0, 0, 0);
        assertOffsetAt(0, 1, 1);
        assertOffsetAt(0, 16, 16);
        assertOffsetAt(1, 0, 17);
        assertOffsetAt(1, 3, 20);
        assertOffsetAt(2, 0, 45);
        assertOffsetAt(4, 29, 95);
        assertOffsetAt(4, 30, 95);
        assertOffsetAt(4, Number.MAX_VALUE, 95);
        assertOffsetAt(5, 29, 95);
        assertOffsetAt(Number.MAX_VALUE, 29, 95);
        assertOffsetAt(Number.MAX_VALUE, Number.MAX_VALUE, 95);
    });
    test('offsetAt, after remove', function () {
        data.onEvents({
            changes: [
                {
                    range: { startLineNumber: 1, startColumn: 3, endLineNumber: 1, endColumn: 6 },
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: '',
                },
            ],
            eol: undefined,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        });
        assertOffsetAt(0, 1, 1);
        assertOffsetAt(0, 13, 13);
        assertOffsetAt(1, 0, 14);
    });
    test('offsetAt, after replace', function () {
        data.onEvents({
            changes: [
                {
                    range: { startLineNumber: 1, startColumn: 3, endLineNumber: 1, endColumn: 6 },
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: 'is could be',
                },
            ],
            eol: undefined,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        });
        assertOffsetAt(0, 1, 1);
        assertOffsetAt(0, 24, 24);
        assertOffsetAt(1, 0, 25);
    });
    test('offsetAt, after insert line', function () {
        data.onEvents({
            changes: [
                {
                    range: { startLineNumber: 1, startColumn: 3, endLineNumber: 1, endColumn: 6 },
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: 'is could be\na line with number',
                },
            ],
            eol: undefined,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        });
        assertOffsetAt(0, 1, 1);
        assertOffsetAt(0, 13, 13);
        assertOffsetAt(1, 0, 14);
        assertOffsetAt(1, 18, 13 + 1 + 18);
        assertOffsetAt(1, 29, 13 + 1 + 29);
        assertOffsetAt(2, 0, 13 + 1 + 29 + 1);
    });
    test('offsetAt, after remove line', function () {
        data.onEvents({
            changes: [
                {
                    range: { startLineNumber: 1, startColumn: 3, endLineNumber: 2, endColumn: 6 },
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: '',
                },
            ],
            eol: undefined,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        });
        assertOffsetAt(0, 1, 1);
        assertOffsetAt(0, 2, 2);
        assertOffsetAt(1, 0, 25);
    });
    test('positionAt', () => {
        assertPositionAt(0, 0, 0);
        assertPositionAt(Number.MIN_VALUE, 0, 0);
        assertPositionAt(1, 0, 1);
        assertPositionAt(16, 0, 16);
        assertPositionAt(17, 1, 0);
        assertPositionAt(20, 1, 3);
        assertPositionAt(45, 2, 0);
        assertPositionAt(95, 3, 29);
        assertPositionAt(96, 3, 29);
        assertPositionAt(99, 3, 29);
        assertPositionAt(Number.MAX_VALUE, 3, 29);
    });
    test('getWordRangeAtPosition', () => {
        data = new ExtHostDocumentData(undefined, URI.file(''), ['aaaa bbbb+cccc abc'], '\n', 1, 'text', false, 'utf8');
        let range = data.document.getWordRangeAtPosition(new Position(0, 2));
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.start.character, 0);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.end.character, 4);
        // ignore bad regular expresson /.*/
        assert.throws(() => data.document.getWordRangeAtPosition(new Position(0, 2), /.*/));
        range = data.document.getWordRangeAtPosition(new Position(0, 5), /[a-z+]+/);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.start.character, 5);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.end.character, 14);
        range = data.document.getWordRangeAtPosition(new Position(0, 17), /[a-z+]+/);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.start.character, 15);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.end.character, 18);
        range = data.document.getWordRangeAtPosition(new Position(0, 11), /yy/);
        assert.strictEqual(range, undefined);
    });
    test("getWordRangeAtPosition doesn't quite use the regex as expected, #29102", function () {
        data = new ExtHostDocumentData(undefined, URI.file(''), ['some text here', '/** foo bar */', 'function() {', '	"far boo"', '}'], '\n', 1, 'text', false, 'utf8');
        let range = data.document.getWordRangeAtPosition(new Position(0, 0), /\/\*.+\*\//);
        assert.strictEqual(range, undefined);
        range = data.document.getWordRangeAtPosition(new Position(1, 0), /\/\*.+\*\//);
        assert.strictEqual(range.start.line, 1);
        assert.strictEqual(range.start.character, 0);
        assert.strictEqual(range.end.line, 1);
        assert.strictEqual(range.end.character, 14);
        range = data.document.getWordRangeAtPosition(new Position(3, 0), /("|').*\1/);
        assert.strictEqual(range, undefined);
        range = data.document.getWordRangeAtPosition(new Position(3, 1), /("|').*\1/);
        assert.strictEqual(range.start.line, 3);
        assert.strictEqual(range.start.character, 1);
        assert.strictEqual(range.end.line, 3);
        assert.strictEqual(range.end.character, 10);
    });
    test('getWordRangeAtPosition can freeze the extension host #95319', function () {
        const regex = /(https?:\/\/github\.com\/(([^\s]+)\/([^\s]+))\/([^\s]+\/)?(issues|pull)\/([0-9]+))|(([^\s]+)\/([^\s]+))?#([1-9][0-9]*)($|[\s\:\;\-\(\=])/;
        data = new ExtHostDocumentData(undefined, URI.file(''), [perfData._$_$_expensive], '\n', 1, 'text', false, 'utf8');
        // this test only ensures that we eventually give and timeout (when searching "funny" words and long lines)
        // for the sake of speedy tests we lower the timeBudget here
        const config = setDefaultGetWordAtTextConfig({ maxLen: 1000, windowSize: 15, timeBudget: 30 });
        try {
            let range = data.document.getWordRangeAtPosition(new Position(0, 1_177_170), regex);
            assert.strictEqual(range, undefined);
            const pos = new Position(0, 1177170);
            range = data.document.getWordRangeAtPosition(pos);
            assert.ok(range);
            assert.ok(range.contains(pos));
            assert.strictEqual(data.document.getText(range), 'TaskDefinition');
        }
        finally {
            config.dispose();
        }
    });
    test('Rename popup sometimes populates with text on the left side omitted #96013', function () {
        const regex = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;
        const line = 'int abcdefhijklmnopqwvrstxyz;';
        data = new ExtHostDocumentData(undefined, URI.file(''), [line], '\n', 1, 'text', false, 'utf8');
        const range = data.document.getWordRangeAtPosition(new Position(0, 27), regex);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.start.character, 4);
        assert.strictEqual(range.end.character, 28);
    });
    test('Custom snippet $TM_SELECTED_TEXT not show suggestion #108892', function () {
        data = new ExtHostDocumentData(undefined, URI.file(''), [
            `        <p><span xml:lang="en">Sheldon</span>, soprannominato "<span xml:lang="en">Shelly</span> dalla madre e dalla sorella, è nato a <span xml:lang="en">Galveston</span>, in <span xml:lang="en">Texas</span>, il 26 febbraio 1980 in un supermercato. È stato un bambino prodigio, come testimoniato dal suo quoziente d'intelligenza (187, di molto superiore alla norma) e dalla sua rapida carriera scolastica: si è diplomato all'eta di 11 anni approdando alla stessa età alla formazione universitaria e all'età di 16 anni ha ottenuto il suo primo dottorato di ricerca. All'inizio della serie e per gran parte di essa vive con il coinquilino Leonard nell'appartamento 4A al 2311 <span xml:lang="en">North Los Robles Avenue</span> di <span xml:lang="en">Pasadena</span>, per poi trasferirsi nell'appartamento di <span xml:lang="en">Penny</span> con <span xml:lang="en">Amy</span> nella decima stagione. Come più volte afferma lui stesso possiede una memoria eidetica e un orecchio assoluto. È stato educato da una madre estremamente religiosa e, in più occasioni, questo aspetto contrasta con il rigore scientifico di <span xml:lang="en">Sheldon</span>; tuttavia la donna sembra essere l'unica persona in grado di comandarlo a bacchetta.</p>`,
        ], '\n', 1, 'text', false, 'utf8');
        const pos = new Position(0, 55);
        const range = data.document.getWordRangeAtPosition(pos);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.start.character, 47);
        assert.strictEqual(range.end.character, 61);
        assert.strictEqual(data.document.getText(range), 'soprannominato');
    });
});
var AssertDocumentLineMappingDirection;
(function (AssertDocumentLineMappingDirection) {
    AssertDocumentLineMappingDirection[AssertDocumentLineMappingDirection["OffsetToPosition"] = 0] = "OffsetToPosition";
    AssertDocumentLineMappingDirection[AssertDocumentLineMappingDirection["PositionToOffset"] = 1] = "PositionToOffset";
})(AssertDocumentLineMappingDirection || (AssertDocumentLineMappingDirection = {}));
suite('ExtHostDocumentData updates line mapping', () => {
    function positionToStr(position) {
        return '(' + position.line + ',' + position.character + ')';
    }
    function assertDocumentLineMapping(doc, direction) {
        const allText = doc.getText();
        let line = 0, character = 0, previousIsCarriageReturn = false;
        for (let offset = 0; offset <= allText.length; offset++) {
            // The position coordinate system cannot express the position between \r and \n
            const position = new Position(line, character + (previousIsCarriageReturn ? -1 : 0));
            if (direction === AssertDocumentLineMappingDirection.OffsetToPosition) {
                const actualPosition = doc.document.positionAt(offset);
                assert.strictEqual(positionToStr(actualPosition), positionToStr(position), 'positionAt mismatch for offset ' + offset);
            }
            else {
                // The position coordinate system cannot express the position between \r and \n
                const expectedOffset = offset + (previousIsCarriageReturn ? -1 : 0);
                const actualOffset = doc.document.offsetAt(position);
                assert.strictEqual(actualOffset, expectedOffset, 'offsetAt mismatch for position ' + positionToStr(position));
            }
            if (allText.charAt(offset) === '\n') {
                line++;
                character = 0;
            }
            else {
                character++;
            }
            previousIsCarriageReturn = allText.charAt(offset) === '\r';
        }
    }
    function createChangeEvent(range, text, eol) {
        return {
            changes: [
                {
                    range: range,
                    rangeOffset: undefined,
                    rangeLength: undefined,
                    text: text,
                },
            ],
            eol: eol,
            versionId: undefined,
            isRedoing: false,
            isUndoing: false,
        };
    }
    function testLineMappingDirectionAfterEvents(lines, eol, direction, e) {
        const myDocument = new ExtHostDocumentData(undefined, URI.file(''), lines.slice(0), eol, 1, 'text', false, 'utf8');
        assertDocumentLineMapping(myDocument, direction);
        myDocument.onEvents(e);
        assertDocumentLineMapping(myDocument, direction);
    }
    function testLineMappingAfterEvents(lines, e) {
        testLineMappingDirectionAfterEvents(lines, '\n', AssertDocumentLineMappingDirection.PositionToOffset, e);
        testLineMappingDirectionAfterEvents(lines, '\n', AssertDocumentLineMappingDirection.OffsetToPosition, e);
        testLineMappingDirectionAfterEvents(lines, '\r\n', AssertDocumentLineMappingDirection.PositionToOffset, e);
        testLineMappingDirectionAfterEvents(lines, '\r\n', AssertDocumentLineMappingDirection.OffsetToPosition, e);
    }
    ensureNoDisposablesAreLeakedInTestSuite();
    test('line mapping', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], { changes: [], eol: undefined, versionId: 7, isRedoing: false, isUndoing: false });
    });
    test('after remove', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 1, 6), ''));
    });
    test('after replace', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 1, 6), 'is could be'));
    });
    test('after insert line', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 1, 6), 'is could be\na line with number'));
    });
    test('after insert two lines', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 1, 6), 'is could be\na line with number\nyet another line'));
    });
    test('after remove line', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 2, 6), ''));
    });
    test('after remove two lines', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 3, 6), ''));
    });
    test('after deleting entire content', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 4, 30), ''));
    });
    test('after replacing entire content', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 3, 4, 30), 'some new text\nthat\nspans multiple lines'));
    });
    test('after changing EOL to CRLF', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 1, 1, 1), '', '\r\n'));
    });
    test('after changing EOL to LF', () => {
        testLineMappingAfterEvents([
            'This is line one',
            'and this is line number two',
            'it is followed by #3',
            'and finished with the fourth.',
        ], createChangeEvent(new Range(1, 1, 1, 1), '', '\n'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50RGF0YS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdERvY3VtZW50RGF0YS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUcvRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxLQUFLLFFBQVEsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLElBQUksSUFBeUIsQ0FBQTtJQUU3QixTQUFTLGdCQUFnQixDQUFDLE1BQWMsRUFBRSxJQUFZLEVBQUUsU0FBaUI7UUFDeEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNsRCxD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LENBQUMsdUJBQXVCLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDOUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUNyQixjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6QixjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN4QixjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN4QixjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN4QixjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6QixjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6QixjQUFjLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdkMsY0FBYyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDekIsY0FBYyxDQUFDLE1B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RSxDQUFDLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFDLG9DQUFvQztRQUNwQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBRSxDQUFDLENBQUE7UUFFcEYsS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBRSxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFM0MsS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBRSxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FB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
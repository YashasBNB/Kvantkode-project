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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50RGF0YS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0RG9jdW1lbnREYXRhLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRy9ELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEtBQUssUUFBUSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzVGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFDakMsSUFBSSxJQUF5QixDQUFBO0lBRTdCLFNBQVMsZ0JBQWdCLENBQUMsTUFBYyxFQUFFLElBQVksRUFBRSxTQUFpQjtRQUN4RSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFF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Q0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUMsb0NBQW9DO1FBQ3BDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFFLENBQUMsQ0FBQTtRQUVwRixLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFFLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUUzQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFFLENBQUE7UUFDN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzdDLE1BQU0s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
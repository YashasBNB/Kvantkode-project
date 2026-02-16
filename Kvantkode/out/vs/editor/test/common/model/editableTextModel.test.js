/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { MirrorTextModel } from '../../../common/model/mirrorTextModel.js';
import { assertSyncedModels, testApplyEditsWithSyncedModels } from './editableTextModelTestUtils.js';
import { createTextModel } from '../testTextModel.js';
suite('EditorModel - EditableTextModel.applyEdits updates mightContainRTL', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testApplyEdits(original, edits, before, after) {
        const model = createTextModel(original.join('\n'));
        model.setEOL(0 /* EndOfLineSequence.LF */);
        assert.strictEqual(model.mightContainRTL(), before);
        model.applyEdits(edits);
        assert.strictEqual(model.mightContainRTL(), after);
        model.dispose();
    }
    function editOp(startLineNumber, startColumn, endLineNumber, endColumn, text) {
        return {
            range: new Range(startLineNumber, startColumn, endLineNumber, endColumn),
            text: text.join('\n'),
        };
    }
    test('start with RTL, insert LTR', () => {
        testApplyEdits(['Hello,\nזוהי עובדה מבוססת שדעתו'], [editOp(1, 1, 1, 1, ['hello'])], true, true);
    });
    test('start with RTL, delete RTL', () => {
        testApplyEdits(['Hello,\nזוהי עובדה מבוססת שדעתו'], [editOp(1, 1, 10, 10, [''])], true, true);
    });
    test('start with RTL, insert RTL', () => {
        testApplyEdits(['Hello,\nזוהי עובדה מבוססת שדעתו'], [editOp(1, 1, 1, 1, ['هناك حقيقة مثبتة منذ زمن طويل'])], true, true);
    });
    test('start with LTR, insert LTR', () => {
        testApplyEdits(['Hello,\nworld!'], [editOp(1, 1, 1, 1, ['hello'])], false, false);
    });
    test('start with LTR, insert RTL 1', () => {
        testApplyEdits(['Hello,\nworld!'], [editOp(1, 1, 1, 1, ['هناك حقيقة مثبتة منذ زمن طويل'])], false, true);
    });
    test('start with LTR, insert RTL 2', () => {
        testApplyEdits(['Hello,\nworld!'], [editOp(1, 1, 1, 1, ['זוהי עובדה מבוססת שדעתו'])], false, true);
    });
});
suite('EditorModel - EditableTextModel.applyEdits updates mightContainNonBasicASCII', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testApplyEdits(original, edits, before, after) {
        const model = createTextModel(original.join('\n'));
        model.setEOL(0 /* EndOfLineSequence.LF */);
        assert.strictEqual(model.mightContainNonBasicASCII(), before);
        model.applyEdits(edits);
        assert.strictEqual(model.mightContainNonBasicASCII(), after);
        model.dispose();
    }
    function editOp(startLineNumber, startColumn, endLineNumber, endColumn, text) {
        return {
            range: new Range(startLineNumber, startColumn, endLineNumber, endColumn),
            text: text.join('\n'),
        };
    }
    test('start with NON-ASCII, insert ASCII', () => {
        testApplyEdits(['Hello,\nZürich'], [editOp(1, 1, 1, 1, ['hello', 'second line'])], true, true);
    });
    test('start with NON-ASCII, delete NON-ASCII', () => {
        testApplyEdits(['Hello,\nZürich'], [editOp(1, 1, 10, 10, [''])], true, true);
    });
    test('start with NON-ASCII, insert NON-ASCII', () => {
        testApplyEdits(['Hello,\nZürich'], [editOp(1, 1, 1, 1, ['Zürich'])], true, true);
    });
    test('start with ASCII, insert ASCII', () => {
        testApplyEdits(['Hello,\nworld!'], [editOp(1, 1, 1, 1, ['hello', 'second line'])], false, false);
    });
    test('start with ASCII, insert NON-ASCII', () => {
        testApplyEdits(['Hello,\nworld!'], [editOp(1, 1, 1, 1, ['Zürich', 'Zürich'])], false, true);
    });
});
suite('EditorModel - EditableTextModel.applyEdits', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function editOp(startLineNumber, startColumn, endLineNumber, endColumn, text) {
        return {
            range: new Range(startLineNumber, startColumn, endLineNumber, endColumn),
            text: text.join('\n'),
            forceMoveMarkers: false,
        };
    }
    test('high-low surrogates 1', () => {
        testApplyEditsWithSyncedModels(['📚some', 'very nice', 'text'], [editOp(1, 2, 1, 2, ['a'])], ['a📚some', 'very nice', 'text'], 
        /*inputEditsAreInvalid*/ true);
    });
    test('high-low surrogates 2', () => {
        testApplyEditsWithSyncedModels(['📚some', 'very nice', 'text'], [editOp(1, 2, 1, 3, ['a'])], ['asome', 'very nice', 'text'], 
        /*inputEditsAreInvalid*/ true);
    });
    test('high-low surrogates 3', () => {
        testApplyEditsWithSyncedModels(['📚some', 'very nice', 'text'], [editOp(1, 1, 1, 2, ['a'])], ['asome', 'very nice', 'text'], 
        /*inputEditsAreInvalid*/ true);
    });
    test('high-low surrogates 4', () => {
        testApplyEditsWithSyncedModels(['📚some', 'very nice', 'text'], [editOp(1, 1, 1, 3, ['a'])], ['asome', 'very nice', 'text'], 
        /*inputEditsAreInvalid*/ true);
    });
    test('Bug 19872: Undo is funky', () => {
        testApplyEditsWithSyncedModels(['something', ' A', '', ' B', 'something else'], [editOp(2, 1, 2, 2, ['']), editOp(3, 1, 4, 2, [''])], ['something', 'A', 'B', 'something else']);
    });
    test('Bug 19872: Undo is funky (2)', () => {
        testApplyEditsWithSyncedModels(['something', 'A', 'B', 'something else'], [editOp(2, 1, 2, 1, [' ']), editOp(3, 1, 3, 1, ['', ' '])], ['something', ' A', '', ' B', 'something else']);
    });
    test('insert empty text', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 1, 1, 1, [''])], ['My First Line', '\t\tMy Second Line', '    Third Line', '', '1']);
    });
    test('last op is no-op', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 1, 1, 2, ['']), editOp(4, 1, 4, 1, [''])], ['y First Line', '\t\tMy Second Line', '    Third Line', '', '1']);
    });
    test('insert text without newline 1', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 1, 1, 1, ['foo '])], ['foo My First Line', '\t\tMy Second Line', '    Third Line', '', '1']);
    });
    test('insert text without newline 2', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 3, 1, 3, [' foo'])], ['My foo First Line', '\t\tMy Second Line', '    Third Line', '', '1']);
    });
    test('insert one newline', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 4, 1, 4, ['', ''])], ['My ', 'First Line', '\t\tMy Second Line', '    Third Line', '', '1']);
    });
    test('insert text with one newline', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 3, 1, 3, [' new line', 'No longer'])], ['My new line', 'No longer First Line', '\t\tMy Second Line', '    Third Line', '', '1']);
    });
    test('insert text with two newlines', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 3, 1, 3, [' new line', 'One more line in the middle', 'No longer'])], [
            'My new line',
            'One more line in the middle',
            'No longer First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1',
        ]);
    });
    test('insert text with many newlines', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 3, 1, 3, ['', '', '', '', ''])], ['My', '', '', '', ' First Line', '\t\tMy Second Line', '    Third Line', '', '1']);
    });
    test('insert multiple newlines', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 3, 1, 3, ['', '', '', '', '']), editOp(3, 15, 3, 15, ['a', 'b'])], ['My', '', '', '', ' First Line', '\t\tMy Second Line', '    Third Linea', 'b', '', '1']);
    });
    test('delete empty text', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 1, 1, 1, [''])], ['My First Line', '\t\tMy Second Line', '    Third Line', '', '1']);
    });
    test('delete text from one line', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 1, 1, 2, [''])], ['y First Line', '\t\tMy Second Line', '    Third Line', '', '1']);
    });
    test('delete text from one line 2', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 1, 1, 3, ['a'])], ['a First Line', '\t\tMy Second Line', '    Third Line', '', '1']);
    });
    test('delete all text from a line', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 1, 1, 14, [''])], ['', '\t\tMy Second Line', '    Third Line', '', '1']);
    });
    test('delete text from two lines', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 4, 2, 6, [''])], ['My Second Line', '    Third Line', '', '1']);
    });
    test('delete text from many lines', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 4, 3, 5, [''])], ['My Third Line', '', '1']);
    });
    test('delete everything', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '1'], [editOp(1, 1, 5, 2, [''])], ['']);
    });
    test('two unrelated edits', () => {
        testApplyEditsWithSyncedModels(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], [editOp(2, 1, 2, 3, ['\t']), editOp(3, 1, 3, 5, [''])], ['My First Line', '\tMy Second Line', 'Third Line', '', '123']);
    });
    test('two edits on one line', () => {
        testApplyEditsWithSyncedModels([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], [editOp(5, 3, 5, 7, ['']), editOp(5, 12, 5, 16, [''])], ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t']);
    });
    test('many edits', () => {
        testApplyEditsWithSyncedModels(['{"x" : 1}'], [editOp(1, 2, 1, 2, ['\n  ']), editOp(1, 5, 1, 6, ['']), editOp(1, 9, 1, 9, ['\n'])], ['{', '  "x": 1', '}']);
    });
    test('many edits reversed', () => {
        testApplyEditsWithSyncedModels(['{', '  "x": 1', '}'], [editOp(1, 2, 2, 3, ['']), editOp(2, 6, 2, 6, [' ']), editOp(2, 9, 3, 1, [''])], ['{"x" : 1}']);
    });
    test('replacing newlines 1', () => {
        testApplyEditsWithSyncedModels(['{', '"a": true,', '', '"b": true', '}'], [editOp(1, 2, 2, 1, ['', '\t']), editOp(2, 11, 4, 1, ['', '\t'])], ['{', '\t"a": true,', '\t"b": true', '}']);
    });
    test('replacing newlines 2', () => {
        testApplyEditsWithSyncedModels([
            'some text',
            'some more text',
            'now comes an empty line',
            '',
            'after empty line',
            'and the last line',
        ], [
            editOp(1, 5, 3, 1, [' text', 'some more text', 'some more text']),
            editOp(3, 2, 4, 1, ['o more lines', 'asd', 'asd', 'asd']),
            editOp(5, 1, 5, 6, ['zzzzzzzz']),
            editOp(5, 11, 6, 16, ['1', '2', '3', '4']),
        ], [
            'some text',
            'some more text',
            'some more textno more lines',
            'asd',
            'asd',
            'asd',
            'zzzzzzzz empt1',
            '2',
            '3',
            '4ne',
        ]);
    });
    test('advanced 1', () => {
        testApplyEditsWithSyncedModels([
            ' {       "d": [',
            '             null',
            '        ] /*comment*/',
            '        ,"e": /*comment*/ [null] }',
        ], [
            editOp(1, 1, 1, 2, ['']),
            editOp(1, 3, 1, 10, ['', '  ']),
            editOp(1, 16, 2, 14, ['', '    ']),
            editOp(2, 18, 3, 9, ['', '  ']),
            editOp(3, 22, 4, 9, ['']),
            editOp(4, 10, 4, 10, ['', '  ']),
            editOp(4, 28, 4, 28, ['', '    ']),
            editOp(4, 32, 4, 32, ['', '  ']),
            editOp(4, 33, 4, 34, ['', '']),
        ], [
            '{',
            '  "d": [',
            '    null',
            '  ] /*comment*/,',
            '  "e": /*comment*/ [',
            '    null',
            '  ]',
            '}',
        ]);
    });
    test('advanced simplified', () => {
        testApplyEditsWithSyncedModels(['   abc', ' ,def'], [editOp(1, 1, 1, 4, ['']), editOp(1, 7, 2, 2, ['']), editOp(2, 3, 2, 3, ['', ''])], ['abc,', 'def']);
    });
    test('issue #144', () => {
        testApplyEditsWithSyncedModels(['package caddy', '', 'func main() {', '\tfmt.Println("Hello World! :)")', '}', ''], [
            editOp(1, 1, 6, 1, [
                'package caddy',
                '',
                'import "fmt"',
                '',
                'func main() {',
                '\tfmt.Println("Hello World! :)")',
                '}',
                '',
            ]),
        ], [
            'package caddy',
            '',
            'import "fmt"',
            '',
            'func main() {',
            '\tfmt.Println("Hello World! :)")',
            '}',
            '',
        ]);
    });
    test('issue #2586 Replacing selected end-of-line with newline locks up the document', () => {
        testApplyEditsWithSyncedModels(['something', 'interesting'], [editOp(1, 10, 2, 1, ['', ''])], ['something', 'interesting']);
    });
    test('issue #3980', () => {
        testApplyEditsWithSyncedModels([
            'class A {',
            '    someProperty = false;',
            '    someMethod() {',
            '    this.someMethod();',
            '    }',
            '}',
        ], [
            editOp(1, 8, 1, 9, ['', '']),
            editOp(3, 17, 3, 18, ['', '']),
            editOp(3, 18, 3, 18, ['    ']),
            editOp(4, 5, 4, 5, ['    ']),
        ], [
            'class A',
            '{',
            '    someProperty = false;',
            '    someMethod()',
            '    {',
            '        this.someMethod();',
            '    }',
            '}',
        ]);
    });
    function testApplyEditsFails(original, edits) {
        const model = createTextModel(original.join('\n'));
        let hasThrown = false;
        try {
            model.applyEdits(edits);
        }
        catch (err) {
            hasThrown = true;
        }
        assert.ok(hasThrown, 'expected model.applyEdits to fail.');
        model.dispose();
    }
    test('touching edits: two inserts at the same position', () => {
        testApplyEditsWithSyncedModels(['hello world'], [editOp(1, 1, 1, 1, ['a']), editOp(1, 1, 1, 1, ['b'])], ['abhello world']);
    });
    test('touching edits: insert and replace touching', () => {
        testApplyEditsWithSyncedModels(['hello world'], [editOp(1, 1, 1, 1, ['b']), editOp(1, 1, 1, 3, ['ab'])], ['babllo world']);
    });
    test('overlapping edits: two overlapping replaces', () => {
        testApplyEditsFails(['hello world'], [editOp(1, 1, 1, 2, ['b']), editOp(1, 1, 1, 3, ['ab'])]);
    });
    test('overlapping edits: two overlapping deletes', () => {
        testApplyEditsFails(['hello world'], [editOp(1, 1, 1, 2, ['']), editOp(1, 1, 1, 3, [''])]);
    });
    test('touching edits: two touching replaces', () => {
        testApplyEditsWithSyncedModels(['hello world'], [editOp(1, 1, 1, 2, ['H']), editOp(1, 2, 1, 3, ['E'])], ['HEllo world']);
    });
    test('touching edits: two touching deletes', () => {
        testApplyEditsWithSyncedModels(['hello world'], [editOp(1, 1, 1, 2, ['']), editOp(1, 2, 1, 3, [''])], ['llo world']);
    });
    test('touching edits: insert and replace', () => {
        testApplyEditsWithSyncedModels(['hello world'], [editOp(1, 1, 1, 1, ['H']), editOp(1, 1, 1, 3, ['e'])], ['Hello world']);
    });
    test('touching edits: replace and insert', () => {
        testApplyEditsWithSyncedModels(['hello world'], [editOp(1, 1, 1, 3, ['H']), editOp(1, 3, 1, 3, ['e'])], ['Hello world']);
    });
    test('change while emitting events 1', () => {
        let disposable;
        assertSyncedModels('Hello', (model, assertMirrorModels) => {
            model.applyEdits([
                {
                    range: new Range(1, 6, 1, 6),
                    text: ' world!',
                    // forceMoveMarkers: false
                },
            ]);
            assertMirrorModels();
        }, (model) => {
            let isFirstTime = true;
            disposable = model.onDidChangeContent(() => {
                if (!isFirstTime) {
                    return;
                }
                isFirstTime = false;
                model.applyEdits([
                    {
                        range: new Range(1, 13, 1, 13),
                        text: ' How are you?',
                        // forceMoveMarkers: false
                    },
                ]);
            });
        });
        disposable.dispose();
    });
    test('change while emitting events 2', () => {
        let disposable;
        assertSyncedModels('Hello', (model, assertMirrorModels) => {
            model.applyEdits([
                {
                    range: new Range(1, 6, 1, 6),
                    text: ' world!',
                    // forceMoveMarkers: false
                },
            ]);
            assertMirrorModels();
        }, (model) => {
            let isFirstTime = true;
            disposable = model.onDidChangeContent((e) => {
                if (!isFirstTime) {
                    return;
                }
                isFirstTime = false;
                model.applyEdits([
                    {
                        range: new Range(1, 13, 1, 13),
                        text: ' How are you?',
                        // forceMoveMarkers: false
                    },
                ]);
            });
        });
        disposable.dispose();
    });
    test('issue #1580: Changes in line endings are not correctly reflected in the extension host, leading to invalid offsets sent to external refactoring tools', () => {
        const model = createTextModel('Hello\nWorld!');
        assert.strictEqual(model.getEOL(), '\n');
        const mirrorModel2 = new MirrorTextModel(null, model.getLinesContent(), model.getEOL(), model.getVersionId());
        let mirrorModel2PrevVersionId = model.getVersionId();
        const disposable = model.onDidChangeContent((e) => {
            const versionId = e.versionId;
            if (versionId < mirrorModel2PrevVersionId) {
                console.warn('Model version id did not advance between edits (2)');
            }
            mirrorModel2PrevVersionId = versionId;
            mirrorModel2.onEvents(e);
        });
        const assertMirrorModels = () => {
            assert.strictEqual(mirrorModel2.getText(), model.getValue(), 'mirror model 2 text OK');
            assert.strictEqual(mirrorModel2.version, model.getVersionId(), 'mirror model 2 version OK');
        };
        model.setEOL(1 /* EndOfLineSequence.CRLF */);
        assertMirrorModels();
        disposable.dispose();
        model.dispose();
        mirrorModel2.dispose();
    });
    test('issue #47733: Undo mangles unicode characters', () => {
        const model = createTextModel("'👁'");
        model.applyEdits([
            { range: new Range(1, 1, 1, 1), text: '"' },
            { range: new Range(1, 2, 1, 2), text: '"' },
        ]);
        assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '"\'"👁\'');
        assert.deepStrictEqual(model.validateRange(new Range(1, 3, 1, 4)), new Range(1, 3, 1, 4));
        model.applyEdits([
            { range: new Range(1, 1, 1, 2), text: null },
            { range: new Range(1, 3, 1, 4), text: null },
        ]);
        assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), "'👁'");
        model.dispose();
    });
    test('issue #48741: Broken undo stack with move lines up with multiple cursors', () => {
        const model = createTextModel(['line1', 'line2', 'line3', ''].join('\n'));
        const undoEdits = model.applyEdits([
            { range: new Range(4, 1, 4, 1), text: 'line3' },
            { range: new Range(3, 1, 3, 6), text: null },
            { range: new Range(2, 1, 3, 1), text: null },
            { range: new Range(3, 6, 3, 6), text: '\nline2' },
        ], true);
        model.applyEdits(undoEdits);
        assert.deepStrictEqual(model.getValue(), 'line1\nline2\nline3\n');
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGFibGVUZXh0TW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2VkaXRhYmxlVGV4dE1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLDhCQUE4QixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXJELEtBQUssQ0FBQyxvRUFBb0UsRUFBRSxHQUFHLEVBQUU7SUFDaEYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLGNBQWMsQ0FDdEIsUUFBa0IsRUFDbEIsS0FBNkIsRUFDN0IsTUFBZSxFQUNmLEtBQWM7UUFFZCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2xELEtBQUssQ0FBQyxNQUFNLDhCQUFzQixDQUFBO1FBRWxDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRW5ELEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFD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
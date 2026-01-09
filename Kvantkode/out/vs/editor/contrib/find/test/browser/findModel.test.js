/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CoreNavigationCommands } from '../../../../browser/coreCommands.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { PieceTreeTextBufferBuilder } from '../../../../common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder.js';
import { FindModelBoundToEditorModel } from '../../browser/findModel.js';
import { FindReplaceState } from '../../browser/findState.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
suite('FindModel', () => {
    let disposables;
    setup(() => {
        disposables = new DisposableStore();
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function findTest(testName, callback) {
        test(testName, () => {
            const textArr = [
                '// my cool header',
                '#include "cool.h"',
                '#include <iostream>',
                '',
                'int main() {',
                '    cout << "hello world, Hello!" << endl;',
                '    cout << "hello world again" << endl;',
                '    cout << "Hello world again" << endl;',
                '    cout << "helloworld again" << endl;',
                '}',
                '// blablablaciao',
                '',
            ];
            withTestCodeEditor(textArr, {}, (editor) => callback(editor));
            const text = textArr.join('\n');
            const ptBuilder = new PieceTreeTextBufferBuilder();
            ptBuilder.acceptChunk(text.substr(0, 94));
            ptBuilder.acceptChunk(text.substr(94, 101));
            ptBuilder.acceptChunk(text.substr(195, 59));
            const factory = ptBuilder.finish();
            withTestCodeEditor(factory, {}, (editor) => callback(editor));
        });
    }
    function fromRange(rng) {
        return [rng.startLineNumber, rng.startColumn, rng.endLineNumber, rng.endColumn];
    }
    function _getFindState(editor) {
        const model = editor.getModel();
        const currentFindMatches = [];
        const allFindMatches = [];
        for (const dec of model.getAllDecorations()) {
            if (dec.options.className === 'currentFindMatch') {
                currentFindMatches.push(dec.range);
                allFindMatches.push(dec.range);
            }
            else if (dec.options.className === 'findMatch') {
                allFindMatches.push(dec.range);
            }
        }
        currentFindMatches.sort(Range.compareRangesUsingStarts);
        allFindMatches.sort(Range.compareRangesUsingStarts);
        return {
            highlighted: currentFindMatches.map(fromRange),
            findDecorations: allFindMatches.map(fromRange),
        };
    }
    function assertFindState(editor, cursor, highlighted, findDecorations) {
        assert.deepStrictEqual(fromRange(editor.getSelection()), cursor, 'cursor');
        const expectedState = {
            highlighted: highlighted ? [highlighted] : [],
            findDecorations: findDecorations,
        };
        assert.deepStrictEqual(_getFindState(editor), expectedState, 'state');
    }
    findTest('incremental find from beginning of file', (editor) => {
        editor.setPosition({ lineNumber: 1, column: 1 });
        const findState = disposables.add(new FindReplaceState());
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        // simulate typing the search string
        findState.change({ searchString: 'H' }, true);
        assertFindState(editor, [1, 12, 1, 13], [1, 12, 1, 13], [
            [1, 12, 1, 13],
            [2, 16, 2, 17],
            [6, 14, 6, 15],
            [6, 27, 6, 28],
            [7, 14, 7, 15],
            [8, 14, 8, 15],
            [9, 14, 9, 15],
        ]);
        // simulate typing the search string
        findState.change({ searchString: 'He' }, true);
        assertFindState(editor, [1, 12, 1, 14], [1, 12, 1, 14], [
            [1, 12, 1, 14],
            [6, 14, 6, 16],
            [6, 27, 6, 29],
            [7, 14, 7, 16],
            [8, 14, 8, 16],
            [9, 14, 9, 16],
        ]);
        // simulate typing the search string
        findState.change({ searchString: 'Hello' }, true);
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
            [9, 14, 9, 19],
        ]);
        // simulate toggling on `matchCase`
        findState.change({ matchCase: true }, true);
        assertFindState(editor, [6, 27, 6, 32], [6, 27, 6, 32], [
            [6, 27, 6, 32],
            [8, 14, 8, 19],
        ]);
        // simulate typing the search string
        findState.change({ searchString: 'hello' }, true);
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [9, 14, 9, 19],
        ]);
        // simulate toggling on `wholeWord`
        findState.change({ wholeWord: true }, true);
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
        ]);
        // simulate toggling off `matchCase`
        findState.change({ matchCase: false }, true);
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        // simulate toggling off `wholeWord`
        findState.change({ wholeWord: false }, true);
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
            [9, 14, 9, 19],
        ]);
        // simulate adding a search scope
        findState.change({ searchScope: [new Range(8, 1, 10, 1)] }, true);
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [
            [8, 14, 8, 19],
            [9, 14, 9, 19],
        ]);
        // simulate removing the search scope
        findState.change({ searchScope: null }, true);
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
            [9, 14, 9, 19],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find model removes its decorations', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello' }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assert.strictEqual(findState.matchesCount, 5);
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
            [9, 14, 9, 19],
        ]);
        findModel.dispose();
        findState.dispose();
        assertFindState(editor, [1, 1, 1, 1], null, []);
    });
    findTest('find model updates state matchesCount', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello' }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assert.strictEqual(findState.matchesCount, 5);
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
            [9, 14, 9, 19],
        ]);
        findState.change({ searchString: 'helloo' }, false);
        assert.strictEqual(findState.matchesCount, 0);
        assertFindState(editor, [1, 1, 1, 1], null, []);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find model reacts to position change', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello' }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
            [9, 14, 9, 19],
        ]);
        editor.trigger('mouse', CoreNavigationCommands.MoveTo.id, {
            position: new Position(6, 20),
        });
        assertFindState(editor, [6, 20, 6, 20], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
            [9, 14, 9, 19],
        ]);
        findState.change({ searchString: 'Hello' }, true);
        assertFindState(editor, [6, 27, 6, 32], [6, 27, 6, 32], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
            [9, 14, 9, 19],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find model next', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', wholeWord: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [6, 27, 6, 32], [6, 27, 6, 32], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find model next stays in scope', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', wholeWord: true, searchScope: [new Range(7, 1, 9, 1)] }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('multi-selection find model next stays in scope (overlap)', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({
            searchString: 'hello',
            wholeWord: true,
            searchScope: [new Range(7, 1, 8, 2), new Range(8, 1, 9, 1)],
        }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('multi-selection find model next stays in scope', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({
            searchString: 'hello',
            matchCase: true,
            wholeWord: false,
            searchScope: [new Range(6, 1, 7, 38), new Range(9, 3, 9, 38)],
        }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            // `matchCase: false` would
            // find this match as well:
            // [6, 27, 6, 32],
            [7, 14, 7, 19],
            // `wholeWord: true` would
            // exclude this match:
            [9, 14, 9, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [9, 14, 9, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [9, 14, 9, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [9, 14, 9, 19], [9, 14, 9, 19], [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [9, 14, 9, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [9, 14, 9, 19],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find model prev', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', wholeWord: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [6, 27, 6, 32], [6, 27, 6, 32], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find model prev stays in scope', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', wholeWord: true, searchScope: [new Range(7, 1, 9, 1)] }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find model next/prev with no matches', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'helloo', wholeWord: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, []);
        findModel.moveToNextMatch();
        assertFindState(editor, [1, 1, 1, 1], null, []);
        findModel.moveToPrevMatch();
        assertFindState(editor, [1, 1, 1, 1], null, []);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find model next/prev respects cursor position', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', wholeWord: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        editor.trigger('mouse', CoreNavigationCommands.MoveTo.id, {
            position: new Position(6, 20),
        });
        assertFindState(editor, [6, 20, 6, 20], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [6, 27, 6, 32], [6, 27, 6, 32], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find ^', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: '^', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [1, 1, 1, 1],
            [2, 1, 2, 1],
            [3, 1, 3, 1],
            [4, 1, 4, 1],
            [5, 1, 5, 1],
            [6, 1, 6, 1],
            [7, 1, 7, 1],
            [8, 1, 8, 1],
            [9, 1, 9, 1],
            [10, 1, 10, 1],
            [11, 1, 11, 1],
            [12, 1, 12, 1],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [2, 1, 2, 1], [2, 1, 2, 1], [
            [1, 1, 1, 1],
            [2, 1, 2, 1],
            [3, 1, 3, 1],
            [4, 1, 4, 1],
            [5, 1, 5, 1],
            [6, 1, 6, 1],
            [7, 1, 7, 1],
            [8, 1, 8, 1],
            [9, 1, 9, 1],
            [10, 1, 10, 1],
            [11, 1, 11, 1],
            [12, 1, 12, 1],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [3, 1, 3, 1], [3, 1, 3, 1], [
            [1, 1, 1, 1],
            [2, 1, 2, 1],
            [3, 1, 3, 1],
            [4, 1, 4, 1],
            [5, 1, 5, 1],
            [6, 1, 6, 1],
            [7, 1, 7, 1],
            [8, 1, 8, 1],
            [9, 1, 9, 1],
            [10, 1, 10, 1],
            [11, 1, 11, 1],
            [12, 1, 12, 1],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find $', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: '$', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [1, 18, 1, 18],
            [2, 18, 2, 18],
            [3, 20, 3, 20],
            [4, 1, 4, 1],
            [5, 13, 5, 13],
            [6, 43, 6, 43],
            [7, 41, 7, 41],
            [8, 41, 8, 41],
            [9, 40, 9, 40],
            [10, 2, 10, 2],
            [11, 17, 11, 17],
            [12, 1, 12, 1],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [1, 18, 1, 18], [1, 18, 1, 18], [
            [1, 18, 1, 18],
            [2, 18, 2, 18],
            [3, 20, 3, 20],
            [4, 1, 4, 1],
            [5, 13, 5, 13],
            [6, 43, 6, 43],
            [7, 41, 7, 41],
            [8, 41, 8, 41],
            [9, 40, 9, 40],
            [10, 2, 10, 2],
            [11, 17, 11, 17],
            [12, 1, 12, 1],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [2, 18, 2, 18], [2, 18, 2, 18], [
            [1, 18, 1, 18],
            [2, 18, 2, 18],
            [3, 20, 3, 20],
            [4, 1, 4, 1],
            [5, 13, 5, 13],
            [6, 43, 6, 43],
            [7, 41, 7, 41],
            [8, 41, 8, 41],
            [9, 40, 9, 40],
            [10, 2, 10, 2],
            [11, 17, 11, 17],
            [12, 1, 12, 1],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [3, 20, 3, 20], [3, 20, 3, 20], [
            [1, 18, 1, 18],
            [2, 18, 2, 18],
            [3, 20, 3, 20],
            [4, 1, 4, 1],
            [5, 13, 5, 13],
            [6, 43, 6, 43],
            [7, 41, 7, 41],
            [8, 41, 8, 41],
            [9, 40, 9, 40],
            [10, 2, 10, 2],
            [11, 17, 11, 17],
            [12, 1, 12, 1],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find next ^$', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: '^$', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [4, 1, 4, 1],
            [12, 1, 12, 1],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [4, 1, 4, 1], [4, 1, 4, 1], [
            [4, 1, 4, 1],
            [12, 1, 12, 1],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [12, 1, 12, 1], [12, 1, 12, 1], [
            [4, 1, 4, 1],
            [12, 1, 12, 1],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [4, 1, 4, 1], [4, 1, 4, 1], [
            [4, 1, 4, 1],
            [12, 1, 12, 1],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find .*', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: '.*', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [1, 1, 1, 18],
            [2, 1, 2, 18],
            [3, 1, 3, 20],
            [4, 1, 4, 1],
            [5, 1, 5, 13],
            [6, 1, 6, 43],
            [7, 1, 7, 41],
            [8, 1, 8, 41],
            [9, 1, 9, 40],
            [10, 1, 10, 2],
            [11, 1, 11, 17],
            [12, 1, 12, 1],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find next ^.*$', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: '^.*$', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [1, 1, 1, 18],
            [2, 1, 2, 18],
            [3, 1, 3, 20],
            [4, 1, 4, 1],
            [5, 1, 5, 13],
            [6, 1, 6, 43],
            [7, 1, 7, 41],
            [8, 1, 8, 41],
            [9, 1, 9, 40],
            [10, 1, 10, 2],
            [11, 1, 11, 17],
            [12, 1, 12, 1],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [1, 1, 1, 18], [1, 1, 1, 18], [
            [1, 1, 1, 18],
            [2, 1, 2, 18],
            [3, 1, 3, 20],
            [4, 1, 4, 1],
            [5, 1, 5, 13],
            [6, 1, 6, 43],
            [7, 1, 7, 41],
            [8, 1, 8, 41],
            [9, 1, 9, 40],
            [10, 1, 10, 2],
            [11, 1, 11, 17],
            [12, 1, 12, 1],
        ]);
        findModel.moveToNextMatch();
        assertFindState(editor, [2, 1, 2, 18], [2, 1, 2, 18], [
            [1, 1, 1, 18],
            [2, 1, 2, 18],
            [3, 1, 3, 20],
            [4, 1, 4, 1],
            [5, 1, 5, 13],
            [6, 1, 6, 43],
            [7, 1, 7, 41],
            [8, 1, 8, 41],
            [9, 1, 9, 40],
            [10, 1, 10, 2],
            [11, 1, 11, 17],
            [12, 1, 12, 1],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find prev ^.*$', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: '^.*$', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [1, 1, 1, 18],
            [2, 1, 2, 18],
            [3, 1, 3, 20],
            [4, 1, 4, 1],
            [5, 1, 5, 13],
            [6, 1, 6, 43],
            [7, 1, 7, 41],
            [8, 1, 8, 41],
            [9, 1, 9, 40],
            [10, 1, 10, 2],
            [11, 1, 11, 17],
            [12, 1, 12, 1],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [12, 1, 12, 1], [12, 1, 12, 1], [
            [1, 1, 1, 18],
            [2, 1, 2, 18],
            [3, 1, 3, 20],
            [4, 1, 4, 1],
            [5, 1, 5, 13],
            [6, 1, 6, 43],
            [7, 1, 7, 41],
            [8, 1, 8, 41],
            [9, 1, 9, 40],
            [10, 1, 10, 2],
            [11, 1, 11, 17],
            [12, 1, 12, 1],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [11, 1, 11, 17], [11, 1, 11, 17], [
            [1, 1, 1, 18],
            [2, 1, 2, 18],
            [3, 1, 3, 20],
            [4, 1, 4, 1],
            [5, 1, 5, 13],
            [6, 1, 6, 43],
            [7, 1, 7, 41],
            [8, 1, 8, 41],
            [9, 1, 9, 40],
            [10, 1, 10, 2],
            [11, 1, 11, 17],
            [12, 1, 12, 1],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('find prev ^$', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: '^$', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [4, 1, 4, 1],
            [12, 1, 12, 1],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [12, 1, 12, 1], [12, 1, 12, 1], [
            [4, 1, 4, 1],
            [12, 1, 12, 1],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [4, 1, 4, 1], [4, 1, 4, 1], [
            [4, 1, 4, 1],
            [12, 1, 12, 1],
        ]);
        findModel.moveToPrevMatch();
        assertFindState(editor, [12, 1, 12, 1], [12, 1, 12, 1], [
            [4, 1, 4, 1],
            [12, 1, 12, 1],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('replace hello', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', replaceString: 'hi', wholeWord: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        editor.trigger('mouse', CoreNavigationCommands.MoveTo.id, {
            position: new Position(6, 20),
        });
        assertFindState(editor, [6, 20, 6, 20], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hello world, Hello!" << endl;');
        findModel.replace();
        assertFindState(editor, [6, 27, 6, 32], [6, 27, 6, 32], [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hello world, Hello!" << endl;');
        findModel.replace();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hello world, hi!" << endl;');
        findModel.replace();
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [
            [6, 14, 6, 19],
            [8, 14, 8, 19],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(7), '    cout << "hi world again" << endl;');
        findModel.replace();
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [[6, 14, 6, 19]]);
        assert.strictEqual(editor.getModel().getLineContent(8), '    cout << "hi world again" << endl;');
        findModel.replace();
        assertFindState(editor, [6, 16, 6, 16], null, []);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hi world, hi!" << endl;');
        findModel.dispose();
        findState.dispose();
    });
    findTest('replace bla', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'bla', replaceString: 'ciao' }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [11, 4, 11, 7],
            [11, 7, 11, 10],
            [11, 10, 11, 13],
        ]);
        findModel.replace();
        assertFindState(editor, [11, 4, 11, 7], [11, 4, 11, 7], [
            [11, 4, 11, 7],
            [11, 7, 11, 10],
            [11, 10, 11, 13],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(11), '// blablablaciao');
        findModel.replace();
        assertFindState(editor, [11, 8, 11, 11], [11, 8, 11, 11], [
            [11, 8, 11, 11],
            [11, 11, 11, 14],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(11), '// ciaoblablaciao');
        findModel.replace();
        assertFindState(editor, [11, 12, 11, 15], [11, 12, 11, 15], [[11, 12, 11, 15]]);
        assert.strictEqual(editor.getModel().getLineContent(11), '// ciaociaoblaciao');
        findModel.replace();
        assertFindState(editor, [11, 16, 11, 16], null, []);
        assert.strictEqual(editor.getModel().getLineContent(11), '// ciaociaociaociao');
        findModel.dispose();
        findState.dispose();
    });
    findTest('replaceAll hello', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', replaceString: 'hi', wholeWord: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        editor.trigger('mouse', CoreNavigationCommands.MoveTo.id, {
            position: new Position(6, 20),
        });
        assertFindState(editor, [6, 20, 6, 20], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hello world, Hello!" << endl;');
        findModel.replaceAll();
        assertFindState(editor, [6, 17, 6, 17], null, []);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hi world, hi!" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(7), '    cout << "hi world again" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(8), '    cout << "hi world again" << endl;');
        findModel.dispose();
        findState.dispose();
    });
    findTest('replaceAll two spaces with one space', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: '  ', replaceString: ' ' }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 1, 6, 3],
            [6, 3, 6, 5],
            [7, 1, 7, 3],
            [7, 3, 7, 5],
            [8, 1, 8, 3],
            [8, 3, 8, 5],
            [9, 1, 9, 3],
            [9, 3, 9, 5],
        ]);
        findModel.replaceAll();
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 1, 6, 3],
            [7, 1, 7, 3],
            [8, 1, 8, 3],
            [9, 1, 9, 3],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(6), '  cout << "hello world, Hello!" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(7), '  cout << "hello world again" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(8), '  cout << "Hello world again" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(9), '  cout << "helloworld again" << endl;');
        findModel.dispose();
        findState.dispose();
    });
    findTest('replaceAll bla', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'bla', replaceString: 'ciao' }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [11, 4, 11, 7],
            [11, 7, 11, 10],
            [11, 10, 11, 13],
        ]);
        findModel.replaceAll();
        assertFindState(editor, [1, 1, 1, 1], null, []);
        assert.strictEqual(editor.getModel().getLineContent(11), '// ciaociaociaociao');
        findModel.dispose();
        findState.dispose();
    });
    findTest('replaceAll bla with \\t\\n', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'bla', replaceString: '<\\n\\t>', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [11, 4, 11, 7],
            [11, 7, 11, 10],
            [11, 10, 11, 13],
        ]);
        findModel.replaceAll();
        assertFindState(editor, [1, 1, 1, 1], null, []);
        assert.strictEqual(editor.getModel().getLineContent(11), '// <');
        assert.strictEqual(editor.getModel().getLineContent(12), '\t><');
        assert.strictEqual(editor.getModel().getLineContent(13), '\t><');
        assert.strictEqual(editor.getModel().getLineContent(14), '\t>ciao');
        findModel.dispose();
        findState.dispose();
    });
    findTest('issue #3516: "replace all" moves page/cursor/focus/scroll to the place of the last replacement', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'include', replaceString: 'bar' }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [2, 2, 2, 9],
            [3, 2, 3, 9],
        ]);
        findModel.replaceAll();
        assertFindState(editor, [1, 1, 1, 1], null, []);
        assert.strictEqual(editor.getModel().getLineContent(2), '#bar "cool.h"');
        assert.strictEqual(editor.getModel().getLineContent(3), '#bar <iostream>');
        findModel.dispose();
        findState.dispose();
    });
    findTest('listens to model content changes', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', replaceString: 'hi', wholeWord: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        editor.getModel().setValue('hello\nhi');
        assertFindState(editor, [1, 1, 1, 1], null, []);
        findModel.dispose();
        findState.dispose();
    });
    findTest('selectAllMatches', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', replaceString: 'hi', wholeWord: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.selectAllMatches();
        assert.deepStrictEqual(editor.getSelections().map((s) => s.toString()), [
            new Selection(6, 14, 6, 19),
            new Selection(6, 27, 6, 32),
            new Selection(7, 14, 7, 19),
            new Selection(8, 14, 8, 19),
        ].map((s) => s.toString()));
        assertFindState(editor, [6, 14, 6, 19], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('issue #14143 selectAllMatches should maintain primary cursor if feasible', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', replaceString: 'hi', wholeWord: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        editor.setSelection(new Range(7, 14, 7, 19));
        findModel.selectAllMatches();
        assert.deepStrictEqual(editor.getSelections().map((s) => s.toString()), [
            new Selection(7, 14, 7, 19),
            new Selection(6, 14, 6, 19),
            new Selection(6, 27, 6, 32),
            new Selection(8, 14, 8, 19),
        ].map((s) => s.toString()));
        assert.deepStrictEqual(editor.getSelection().toString(), new Selection(7, 14, 7, 19).toString());
        assertFindState(editor, [7, 14, 7, 19], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('issue #1914: NPE when there is only one find match', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'cool.h' }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [[2, 11, 2, 17]]);
        findModel.moveToNextMatch();
        assertFindState(editor, [2, 11, 2, 17], [2, 11, 2, 17], [[2, 11, 2, 17]]);
        findModel.moveToNextMatch();
        assertFindState(editor, [2, 11, 2, 17], [2, 11, 2, 17], [[2, 11, 2, 17]]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('replace when search string has look ahed regex', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello(?=\\sworld)', replaceString: 'hi', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.replace();
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hello world, Hello!" << endl;');
        findModel.replace();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hi world, Hello!" << endl;');
        findModel.replace();
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [[8, 14, 8, 19]]);
        assert.strictEqual(editor.getModel().getLineContent(7), '    cout << "hi world again" << endl;');
        findModel.replace();
        assertFindState(editor, [8, 16, 8, 16], null, []);
        assert.strictEqual(editor.getModel().getLineContent(8), '    cout << "hi world again" << endl;');
        findModel.dispose();
        findState.dispose();
    });
    findTest('replace when search string has look ahed regex and cursor is at the last find match', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello(?=\\sworld)', replaceString: 'hi', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        editor.trigger('mouse', CoreNavigationCommands.MoveTo.id, {
            position: new Position(8, 14),
        });
        assertFindState(editor, [8, 14, 8, 14], null, [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.replace();
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(8), '    cout << "Hello world again" << endl;');
        findModel.replace();
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(8), '    cout << "hi world again" << endl;');
        findModel.replace();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [[7, 14, 7, 19]]);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hi world, Hello!" << endl;');
        findModel.replace();
        assertFindState(editor, [7, 16, 7, 16], null, []);
        assert.strictEqual(editor.getModel().getLineContent(7), '    cout << "hi world again" << endl;');
        findModel.dispose();
        findState.dispose();
    });
    findTest('replaceAll when search string has look ahed regex', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello(?=\\sworld)', replaceString: 'hi', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.replaceAll();
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hi world, Hello!" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(7), '    cout << "hi world again" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(8), '    cout << "hi world again" << endl;');
        assertFindState(editor, [1, 1, 1, 1], null, []);
        findModel.dispose();
        findState.dispose();
    });
    findTest('replace when search string has look ahed regex and replace string has capturing groups', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hel(lo)(?=\\sworld)', replaceString: 'hi$1', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.replace();
        assertFindState(editor, [6, 14, 6, 19], [6, 14, 6, 19], [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hello world, Hello!" << endl;');
        findModel.replace();
        assertFindState(editor, [7, 14, 7, 19], [7, 14, 7, 19], [
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hilo world, Hello!" << endl;');
        findModel.replace();
        assertFindState(editor, [8, 14, 8, 19], [8, 14, 8, 19], [[8, 14, 8, 19]]);
        assert.strictEqual(editor.getModel().getLineContent(7), '    cout << "hilo world again" << endl;');
        findModel.replace();
        assertFindState(editor, [8, 18, 8, 18], null, []);
        assert.strictEqual(editor.getModel().getLineContent(8), '    cout << "hilo world again" << endl;');
        findModel.dispose();
        findState.dispose();
    });
    findTest('replaceAll when search string has look ahed regex and replace string has capturing groups', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'wo(rl)d(?=.*;$)', replaceString: 'gi$1', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 20, 6, 25],
            [7, 20, 7, 25],
            [8, 20, 8, 25],
            [9, 19, 9, 24],
        ]);
        findModel.replaceAll();
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hello girl, Hello!" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(7), '    cout << "hello girl again" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(8), '    cout << "Hello girl again" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(9), '    cout << "hellogirl again" << endl;');
        assertFindState(editor, [1, 1, 1, 1], null, []);
        findModel.dispose();
        findState.dispose();
    });
    findTest('replaceAll when search string is multiline and has look ahed regex and replace string has capturing groups', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({
            searchString: 'wo(rl)d(.*;\\n)(?=.*hello)',
            replaceString: 'gi$1$2',
            isRegex: true,
            matchCase: true,
        }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 20, 7, 1],
            [8, 20, 9, 1],
        ]);
        findModel.replaceAll();
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hello girl, Hello!" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(8), '    cout << "Hello girl again" << endl;');
        assertFindState(editor, [1, 1, 1, 1], null, []);
        findModel.dispose();
        findState.dispose();
    });
    findTest('replaceAll preserving case', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({
            searchString: 'hello',
            replaceString: 'goodbye',
            isRegex: false,
            matchCase: false,
            preserveCase: true,
        }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
            [9, 14, 9, 19],
        ]);
        findModel.replaceAll();
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "goodbye world, Goodbye!" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(7), '    cout << "goodbye world again" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(8), '    cout << "Goodbye world again" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(9), '    cout << "goodbyeworld again" << endl;');
        assertFindState(editor, [1, 1, 1, 1], null, []);
        findModel.dispose();
        findState.dispose();
    });
    findTest('issue #18711 replaceAll with empty string', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', replaceString: '', wholeWord: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [6, 27, 6, 32],
            [7, 14, 7, 19],
            [8, 14, 8, 19],
        ]);
        findModel.replaceAll();
        assertFindState(editor, [1, 1, 1, 1], null, []);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << " world, !" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(7), '    cout << " world again" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(8), '    cout << " world again" << endl;');
        findModel.dispose();
        findState.dispose();
    });
    findTest('issue #32522 replaceAll with ^ on more than 1000 matches', (editor) => {
        let initialText = '';
        for (let i = 0; i < 1100; i++) {
            initialText += 'line' + i + '\n';
        }
        editor.getModel().setValue(initialText);
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: '^', replaceString: 'a ', isRegex: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        findModel.replaceAll();
        let expectedText = '';
        for (let i = 0; i < 1100; i++) {
            expectedText += 'a line' + i + '\n';
        }
        expectedText += 'a ';
        assert.strictEqual(editor.getModel().getValue(), expectedText);
        findModel.dispose();
        findState.dispose();
    });
    findTest('issue #19740 Find and replace capture group/backreference inserts `undefined` instead of empty string', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello(z)?', replaceString: 'hi$1', isRegex: true, matchCase: true }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [
            [6, 14, 6, 19],
            [7, 14, 7, 19],
            [9, 14, 9, 19],
        ]);
        findModel.replaceAll();
        assertFindState(editor, [1, 1, 1, 1], null, []);
        assert.strictEqual(editor.getModel().getLineContent(6), '    cout << "hi world, Hello!" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(7), '    cout << "hi world again" << endl;');
        assert.strictEqual(editor.getModel().getLineContent(9), '    cout << "hiworld again" << endl;');
        findModel.dispose();
        findState.dispose();
    });
    findTest('issue #27083. search scope works even if it is a single line', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', wholeWord: true, searchScope: [new Range(7, 1, 8, 1)] }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assertFindState(editor, [1, 1, 1, 1], null, [[7, 14, 7, 19]]);
        findModel.dispose();
        findState.dispose();
    });
    findTest('issue #3516: Control behavior of "Next" operations (not looping back to beginning)', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello', loop: false }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assert.strictEqual(findState.matchesCount, 5);
        // Test next operations
        assert.strictEqual(findState.matchesPosition, 0);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 1);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), false);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 2);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 3);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 4);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 5);
        assert.strictEqual(findState.canNavigateForward(), false);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 5);
        assert.strictEqual(findState.canNavigateForward(), false);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 5);
        assert.strictEqual(findState.canNavigateForward(), false);
        assert.strictEqual(findState.canNavigateBack(), true);
        // Test previous operations
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 4);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 3);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 2);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 1);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), false);
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 1);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), false);
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 1);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), false);
    });
    findTest('issue #3516: Control behavior of "Next" operations (looping back to beginning)', (editor) => {
        const findState = disposables.add(new FindReplaceState());
        findState.change({ searchString: 'hello' }, false);
        const findModel = disposables.add(new FindModelBoundToEditorModel(editor, findState));
        assert.strictEqual(findState.matchesCount, 5);
        // Test next operations
        assert.strictEqual(findState.matchesPosition, 0);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 1);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 2);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 3);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 4);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 5);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 1);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToNextMatch();
        assert.strictEqual(findState.matchesPosition, 2);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        // Test previous operations
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 1);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 5);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 4);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 3);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 2);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
        findModel.moveToPrevMatch();
        assert.strictEqual(findState.matchesPosition, 1);
        assert.strictEqual(findState.canNavigateForward(), true);
        assert.strictEqual(findState.canNavigateBack(), true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZpbmQvdGVzdC9icm93c2VyL2ZpbmRNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDdkgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFL0UsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDdkIsSUFBSSxXQUE0QixDQUFBO0lBRWhDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUNwQyxDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7SUFD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QyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDZCxDQUNELENBQUE7UUFFRCxvQ0FBb0M7UUFDcEMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5QyxlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZDtZQUNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELG9DQUFvQztRQUNwQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pELGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELG1DQUFtQztRQUNuQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELG9DQUFvQztRQUNwQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pELGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsbUNBQW1DO1FBQ25DLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0MsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsb0NBQW9DO1FBQ3BDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELG9DQUFvQztRQUNwQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVDLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELGlDQUFpQztRQUNqQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pFLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELHFDQUFxQztRQUNy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QyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUU7WUFDM0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7WUFDekQsUUFBUSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDN0IsQ0FBQyxDQUFBO1FBRUYsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRTtZQUM3QyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FBQyxDQUFBO1FBRUYsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNqRCxlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZDtZQUNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDZCxDQUNELENBQUE7UUFFRCxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbkIsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDdEMsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtRQUN6RCxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkUsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRXJGLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUU7WUFDM0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDZCxDQUFDLENBQUE7UUFFRixTQUFTLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDM0IsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUMzQixlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZDtZQUNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNCLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDZCxDQUNELENBQUE7UUFFRCxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDM0IsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUMzQixlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZDtZQUNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ25CLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ3JELE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7UUFDekQsU0FBUyxDQUFDLE1BQU0sQ0FDZixFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQ2hGLEtBQUssQ0FDTCxDQUFBO1FBQ0QsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRXJGLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUU7WUFDM0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQUMsQ0FBQTtRQUVGLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUMzQixlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZDtZQUNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDZCxDQUNELENBQUE7UUFFRCxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDM0IsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNCLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNuQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsMERBQTBELEVBQUUsQ0FB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ZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNCLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNCLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ25CLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ3RDLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7UUFDekQsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25FLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSwyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUVyRixlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFO1lBQzNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FBQyxDQUFBO1FBRUYsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNCLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDZCxDQUNELENBQUE7UUFFRCxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDM0IsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUMzQixlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZDtZQUNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNCLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDZCxDQUNELENBQUE7UUFFRCxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDM0IsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNuQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNyRCxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLEVBQUUsQ0FBQyxDQUFBO1FBQ3pELFNBQVMsQ0FBQyxNQUFNLENBQ2YsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUNoRixLQUFLLENBQ0wsQ0FBQTtRQUNELE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSwyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUVyRixlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFO1lBQzNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDZCxDQUFDLENBQUE7UUFFRixTQUFTLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDM0IsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNCLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFB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LE1BQU0sRUFBRSxFQUFFO1FBQzdCLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7UUFDekQsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdELE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSwyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUVyRixlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFO1lBQzNDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNkLENBQUMsQ0FBQTtRQUVGLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUMzQixlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDWjtZQUNDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUMzQixlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDWjtZQUNDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNuQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDN0IsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtRQUN6RCxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0QsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRXJGLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUU7WUFDM0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNoQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNkLENBQUMsQ0FBQTtRQUVGLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUMzQixlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZDtZQUNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDaEIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDZCxDQUNELENBQUE7UUFFRCxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDM0IsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ2hCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNCLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNoQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNuQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDbkMsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtRQUN6RCxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUQsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRXJGLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUU7WUFDM0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNkLENBQUMsQ0FBQTtRQUVGLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUMzQixlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDWjtZQUNDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDZCxDQUNELENBQUE7UUFFRCxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDM0IsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUNkLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBRUQsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNCLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNaO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxF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QUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDZixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNkLENBQUMsQ0FBQTtRQUVGLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUMzQixlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDYjtZQUNDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDZixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUMzQixlQUFlLENBQ2QsTUFBTSxFQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDYjtZQUNDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDZixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNkLENBQ0QsQ0FBQTtRQUVELFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNuQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNyQyxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLEVBQUUsQ0FBQyxDQUFBO1FBQ3pELFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRSxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksMkJBQTJCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFFckYsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRTtZQUMzQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ2YsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDZCxDQUFDLENBQUE7UUFFRixTQUFTLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDM0IsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUNkLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ2YsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDZCxDQUNELENBQUE7UUFFRCxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDM0IsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUNmLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQ2Y7WUFDQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNaLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDYixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMs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QUMsQ0FBQTtRQUVyRixlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFO1lBQzNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBRTVCLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE1BQU0sQ0FBQyxhQUFhLEVBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUNoRDtZQUNDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUMzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQzFCLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUNy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RUFBRSxDQUFBO1FBRW5CLGVBQWUsQ0FDZCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkO1lBQ0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFDcEMsNENBQTRDLENBQzVDLENBQUE7UUFFRCxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbkIsZUFBZSxDQUNkLE1BQU0sRUFDTixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ2Q7WUFDQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2QsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFDcEMsMkNBQTJDLENBQzNDLENBQUE7UUFFRCxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbkIsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVB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
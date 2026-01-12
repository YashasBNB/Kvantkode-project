/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { DiffComputer, } from '../../../common/diff/legacyLinesDiffComputer.js';
import { createTextModel } from '../testTextModel.js';
function assertDiff(originalLines, modifiedLines, expectedChanges, shouldComputeCharChanges = true, shouldPostProcessCharChanges = false, shouldIgnoreTrimWhitespace = false) {
    const diffComputer = new DiffComputer(originalLines, modifiedLines, {
        shouldComputeCharChanges,
        shouldPostProcessCharChanges,
        shouldIgnoreTrimWhitespace,
        shouldMakePrettyDiff: true,
        maxComputationTime: 0,
    });
    const changes = diffComputer.computeDiff().changes;
    const mapCharChange = (charChange) => {
        return {
            originalStartLineNumber: charChange.originalStartLineNumber,
            originalStartColumn: charChange.originalStartColumn,
            originalEndLineNumber: charChange.originalEndLineNumber,
            originalEndColumn: charChange.originalEndColumn,
            modifiedStartLineNumber: charChange.modifiedStartLineNumber,
            modifiedStartColumn: charChange.modifiedStartColumn,
            modifiedEndLineNumber: charChange.modifiedEndLineNumber,
            modifiedEndColumn: charChange.modifiedEndColumn,
        };
    };
    const actual = changes.map((lineChange) => {
        return {
            originalStartLineNumber: lineChange.originalStartLineNumber,
            originalEndLineNumber: lineChange.originalEndLineNumber,
            modifiedStartLineNumber: lineChange.modifiedStartLineNumber,
            modifiedEndLineNumber: lineChange.modifiedEndLineNumber,
            charChanges: lineChange.charChanges ? lineChange.charChanges.map(mapCharChange) : undefined,
        };
    });
    assert.deepStrictEqual(actual, expectedChanges);
    if (!shouldIgnoreTrimWhitespace) {
        // The diffs should describe how to apply edits to the original text model to get to the modified text model.
        const modifiedTextModel = createTextModel(modifiedLines.join('\n'));
        const expectedValue = modifiedTextModel.getValue();
        {
            // Line changes:
            const originalTextModel = createTextModel(originalLines.join('\n'));
            originalTextModel.applyEdits(changes.map((c) => getLineEdit(c, modifiedTextModel)));
            assert.deepStrictEqual(originalTextModel.getValue(), expectedValue);
            originalTextModel.dispose();
        }
        if (shouldComputeCharChanges) {
            // Char changes:
            const originalTextModel = createTextModel(originalLines.join('\n'));
            originalTextModel.applyEdits(changes.flatMap((c) => getCharEdits(c, modifiedTextModel)));
            assert.deepStrictEqual(originalTextModel.getValue(), expectedValue);
            originalTextModel.dispose();
        }
        modifiedTextModel.dispose();
    }
}
function getCharEdits(lineChange, modifiedTextModel) {
    if (!lineChange.charChanges) {
        return [getLineEdit(lineChange, modifiedTextModel)];
    }
    return lineChange.charChanges.map((c) => {
        const originalRange = new Range(c.originalStartLineNumber, c.originalStartColumn, c.originalEndLineNumber, c.originalEndColumn);
        const modifiedRange = new Range(c.modifiedStartLineNumber, c.modifiedStartColumn, c.modifiedEndLineNumber, c.modifiedEndColumn);
        return {
            range: originalRange,
            text: modifiedTextModel.getValueInRange(modifiedRange),
        };
    });
}
function getLineEdit(lineChange, modifiedTextModel) {
    let originalRange;
    if (lineChange.originalEndLineNumber === 0) {
        // Insertion
        originalRange = new LineRange(lineChange.originalStartLineNumber + 1, 0);
    }
    else {
        originalRange = new LineRange(lineChange.originalStartLineNumber, lineChange.originalEndLineNumber - lineChange.originalStartLineNumber + 1);
    }
    let modifiedRange;
    if (lineChange.modifiedEndLineNumber === 0) {
        // Deletion
        modifiedRange = new LineRange(lineChange.modifiedStartLineNumber + 1, 0);
    }
    else {
        modifiedRange = new LineRange(lineChange.modifiedStartLineNumber, lineChange.modifiedEndLineNumber - lineChange.modifiedStartLineNumber + 1);
    }
    const [r1, r2] = diffFromLineRanges(originalRange, modifiedRange);
    return {
        range: r1,
        text: modifiedTextModel.getValueInRange(r2),
    };
}
function diffFromLineRanges(originalRange, modifiedRange) {
    if (originalRange.startLineNumber === 1 || modifiedRange.startLineNumber === 1) {
        if (!originalRange.isEmpty && !modifiedRange.isEmpty) {
            return [
                new Range(originalRange.startLineNumber, 1, originalRange.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
                new Range(modifiedRange.startLineNumber, 1, modifiedRange.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
            ];
        }
        // When one of them is one and one of them is empty, the other cannot be the last line of the document
        return [
            new Range(originalRange.startLineNumber, 1, originalRange.endLineNumberExclusive, 1),
            new Range(modifiedRange.startLineNumber, 1, modifiedRange.endLineNumberExclusive, 1),
        ];
    }
    return [
        new Range(originalRange.startLineNumber - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, originalRange.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
        new Range(modifiedRange.startLineNumber - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, modifiedRange.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
    ];
}
class LineRange {
    constructor(startLineNumber, lineCount) {
        this.startLineNumber = startLineNumber;
        this.lineCount = lineCount;
    }
    get isEmpty() {
        return this.lineCount === 0;
    }
    get endLineNumberExclusive() {
        return this.startLineNumber + this.lineCount;
    }
}
function createLineDeletion(startLineNumber, endLineNumber, modifiedLineNumber) {
    return {
        originalStartLineNumber: startLineNumber,
        originalEndLineNumber: endLineNumber,
        modifiedStartLineNumber: modifiedLineNumber,
        modifiedEndLineNumber: 0,
        charChanges: undefined,
    };
}
function createLineInsertion(startLineNumber, endLineNumber, originalLineNumber) {
    return {
        originalStartLineNumber: originalLineNumber,
        originalEndLineNumber: 0,
        modifiedStartLineNumber: startLineNumber,
        modifiedEndLineNumber: endLineNumber,
        charChanges: undefined,
    };
}
function createLineChange(originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber, charChanges) {
    return {
        originalStartLineNumber: originalStartLineNumber,
        originalEndLineNumber: originalEndLineNumber,
        modifiedStartLineNumber: modifiedStartLineNumber,
        modifiedEndLineNumber: modifiedEndLineNumber,
        charChanges: charChanges,
    };
}
function createCharChange(originalStartLineNumber, originalStartColumn, originalEndLineNumber, originalEndColumn, modifiedStartLineNumber, modifiedStartColumn, modifiedEndLineNumber, modifiedEndColumn) {
    return {
        originalStartLineNumber: originalStartLineNumber,
        originalStartColumn: originalStartColumn,
        originalEndLineNumber: originalEndLineNumber,
        originalEndColumn: originalEndColumn,
        modifiedStartLineNumber: modifiedStartLineNumber,
        modifiedStartColumn: modifiedStartColumn,
        modifiedEndLineNumber: modifiedEndLineNumber,
        modifiedEndColumn: modifiedEndColumn,
    };
}
suite('Editor Diff - DiffComputer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    // ---- insertions
    test('one inserted line below', () => {
        const original = ['line'];
        const modified = ['line', 'new line'];
        const expected = [createLineInsertion(2, 2, 1)];
        assertDiff(original, modified, expected);
    });
    test('two inserted lines below', () => {
        const original = ['line'];
        const modified = ['line', 'new line', 'another new line'];
        const expected = [createLineInsertion(2, 3, 1)];
        assertDiff(original, modified, expected);
    });
    test('one inserted line above', () => {
        const original = ['line'];
        const modified = ['new line', 'line'];
        const expected = [createLineInsertion(1, 1, 0)];
        assertDiff(original, modified, expected);
    });
    test('two inserted lines above', () => {
        const original = ['line'];
        const modified = ['new line', 'another new line', 'line'];
        const expected = [createLineInsertion(1, 2, 0)];
        assertDiff(original, modified, expected);
    });
    test('one inserted line in middle', () => {
        const original = ['line1', 'line2', 'line3', 'line4'];
        const modified = ['line1', 'line2', 'new line', 'line3', 'line4'];
        const expected = [createLineInsertion(3, 3, 2)];
        assertDiff(original, modified, expected);
    });
    test('two inserted lines in middle', () => {
        const original = ['line1', 'line2', 'line3', 'line4'];
        const modified = ['line1', 'line2', 'new line', 'another new line', 'line3', 'line4'];
        const expected = [createLineInsertion(3, 4, 2)];
        assertDiff(original, modified, expected);
    });
    test('two inserted lines in middle interrupted', () => {
        const original = ['line1', 'line2', 'line3', 'line4'];
        const modified = ['line1', 'line2', 'new line', 'line3', 'another new line', 'line4'];
        const expected = [createLineInsertion(3, 3, 2), createLineInsertion(5, 5, 3)];
        assertDiff(original, modified, expected);
    });
    // ---- deletions
    test('one deleted line below', () => {
        const original = ['line', 'new line'];
        const modified = ['line'];
        const expected = [createLineDeletion(2, 2, 1)];
        assertDiff(original, modified, expected);
    });
    test('two deleted lines below', () => {
        const original = ['line', 'new line', 'another new line'];
        const modified = ['line'];
        const expected = [createLineDeletion(2, 3, 1)];
        assertDiff(original, modified, expected);
    });
    test('one deleted lines above', () => {
        const original = ['new line', 'line'];
        const modified = ['line'];
        const expected = [createLineDeletion(1, 1, 0)];
        assertDiff(original, modified, expected);
    });
    test('two deleted lines above', () => {
        const original = ['new line', 'another new line', 'line'];
        const modified = ['line'];
        const expected = [createLineDeletion(1, 2, 0)];
        assertDiff(original, modified, expected);
    });
    test('one deleted line in middle', () => {
        const original = ['line1', 'line2', 'new line', 'line3', 'line4'];
        const modified = ['line1', 'line2', 'line3', 'line4'];
        const expected = [createLineDeletion(3, 3, 2)];
        assertDiff(original, modified, expected);
    });
    test('two deleted lines in middle', () => {
        const original = ['line1', 'line2', 'new line', 'another new line', 'line3', 'line4'];
        const modified = ['line1', 'line2', 'line3', 'line4'];
        const expected = [createLineDeletion(3, 4, 2)];
        assertDiff(original, modified, expected);
    });
    test('two deleted lines in middle interrupted', () => {
        const original = ['line1', 'line2', 'new line', 'line3', 'another new line', 'line4'];
        const modified = ['line1', 'line2', 'line3', 'line4'];
        const expected = [createLineDeletion(3, 3, 2), createLineDeletion(5, 5, 3)];
        assertDiff(original, modified, expected);
    });
    // ---- changes
    test('one line changed: chars inserted at the end', () => {
        const original = ['line'];
        const modified = ['line changed'];
        const expected = [createLineChange(1, 1, 1, 1, [createCharChange(1, 5, 1, 5, 1, 5, 1, 13)])];
        assertDiff(original, modified, expected);
    });
    test('one line changed: chars inserted at the beginning', () => {
        const original = ['line'];
        const modified = ['my line'];
        const expected = [createLineChange(1, 1, 1, 1, [createCharChange(1, 1, 1, 1, 1, 1, 1, 4)])];
        assertDiff(original, modified, expected);
    });
    test('one line changed: chars inserted in the middle', () => {
        const original = ['abba'];
        const modified = ['abzzba'];
        const expected = [createLineChange(1, 1, 1, 1, [createCharChange(1, 3, 1, 3, 1, 3, 1, 5)])];
        assertDiff(original, modified, expected);
    });
    test('one line changed: chars inserted in the middle (two spots)', () => {
        const original = ['abba'];
        const modified = ['abzzbzza'];
        const expected = [
            createLineChange(1, 1, 1, 1, [
                createCharChange(1, 3, 1, 3, 1, 3, 1, 5),
                createCharChange(1, 4, 1, 4, 1, 6, 1, 8),
            ]),
        ];
        assertDiff(original, modified, expected);
    });
    test('one line changed: chars deleted 1', () => {
        const original = ['abcdefg'];
        const modified = ['abcfg'];
        const expected = [createLineChange(1, 1, 1, 1, [createCharChange(1, 4, 1, 6, 1, 4, 1, 4)])];
        assertDiff(original, modified, expected);
    });
    test('one line changed: chars deleted 2', () => {
        const original = ['abcdefg'];
        const modified = ['acfg'];
        const expected = [
            createLineChange(1, 1, 1, 1, [
                createCharChange(1, 2, 1, 3, 1, 2, 1, 2),
                createCharChange(1, 4, 1, 6, 1, 3, 1, 3),
            ]),
        ];
        assertDiff(original, modified, expected);
    });
    test('two lines changed 1', () => {
        const original = ['abcd', 'efgh'];
        const modified = ['abcz'];
        const expected = [createLineChange(1, 2, 1, 1, [createCharChange(1, 4, 2, 5, 1, 4, 1, 5)])];
        assertDiff(original, modified, expected);
    });
    test('two lines changed 2', () => {
        const original = ['foo', 'abcd', 'efgh', 'BAR'];
        const modified = ['foo', 'abcz', 'BAR'];
        const expected = [createLineChange(2, 3, 2, 2, [createCharChange(2, 4, 3, 5, 2, 4, 2, 5)])];
        assertDiff(original, modified, expected);
    });
    test('two lines changed 3', () => {
        const original = ['foo', 'abcd', 'efgh', 'BAR'];
        const modified = ['foo', 'abcz', 'zzzzefgh', 'BAR'];
        const expected = [
            createLineChange(2, 3, 2, 3, [
                createCharChange(2, 4, 2, 5, 2, 4, 2, 5),
                createCharChange(3, 1, 3, 1, 3, 1, 3, 5),
            ]),
        ];
        assertDiff(original, modified, expected);
    });
    test('two lines changed 4', () => {
        const original = ['abc'];
        const modified = ['', '', 'axc', ''];
        const expected = [
            createLineChange(1, 1, 1, 4, [
                createCharChange(1, 1, 1, 1, 1, 1, 3, 1),
                createCharChange(1, 2, 1, 3, 3, 2, 3, 3),
                createCharChange(1, 4, 1, 4, 3, 4, 4, 1),
            ]),
        ];
        assertDiff(original, modified, expected);
    });
    test('empty original sequence in char diff', () => {
        const original = ['abc', '', 'xyz'];
        const modified = ['abc', 'qwe', 'rty', 'xyz'];
        const expected = [createLineChange(2, 2, 2, 3)];
        assertDiff(original, modified, expected);
    });
    test('three lines changed', () => {
        const original = ['foo', 'abcd', 'efgh', 'BAR'];
        const modified = ['foo', 'zzzefgh', 'xxx', 'BAR'];
        const expected = [
            createLineChange(2, 3, 2, 3, [
                createCharChange(2, 1, 3, 1, 2, 1, 2, 4),
                createCharChange(3, 5, 3, 5, 2, 8, 3, 4),
            ]),
        ];
        assertDiff(original, modified, expected);
    });
    test('big change part 1', () => {
        const original = ['foo', 'abcd', 'efgh', 'BAR'];
        const modified = ['hello', 'foo', 'zzzefgh', 'xxx', 'BAR'];
        const expected = [
            createLineInsertion(1, 1, 0),
            createLineChange(2, 3, 3, 4, [
                createCharChange(2, 1, 3, 1, 3, 1, 3, 4),
                createCharChange(3, 5, 3, 5, 3, 8, 4, 4),
            ]),
        ];
        assertDiff(original, modified, expected);
    });
    test('big change part 2', () => {
        const original = ['foo', 'abcd', 'efgh', 'BAR', 'RAB'];
        const modified = ['hello', 'foo', 'zzzefgh', 'xxx', 'BAR'];
        const expected = [
            createLineInsertion(1, 1, 0),
            createLineChange(2, 3, 3, 4, [
                createCharChange(2, 1, 3, 1, 3, 1, 3, 4),
                createCharChange(3, 5, 3, 5, 3, 8, 4, 4),
            ]),
            createLineDeletion(5, 5, 5),
        ];
        assertDiff(original, modified, expected);
    });
    test('char change postprocessing merges', () => {
        const original = ['abba'];
        const modified = ['azzzbzzzbzzza'];
        const expected = [createLineChange(1, 1, 1, 1, [createCharChange(1, 2, 1, 4, 1, 2, 1, 13)])];
        assertDiff(original, modified, expected, true, true);
    });
    test('ignore trim whitespace', () => {
        const original = ['\t\t foo ', 'abcd', 'efgh', '\t\t BAR\t\t'];
        const modified = ['  hello\t', '\t foo   \t', 'zzzefgh', 'xxx', '   BAR   \t'];
        const expected = [
            createLineInsertion(1, 1, 0),
            createLineChange(2, 3, 3, 4, [
                createCharChange(2, 1, 2, 5, 3, 1, 3, 4),
                createCharChange(3, 5, 3, 5, 4, 1, 4, 4),
            ]),
        ];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('issue #12122 r.hasOwnProperty is not a function', () => {
        const original = ['hasOwnProperty'];
        const modified = ['hasOwnProperty', 'and another line'];
        const expected = [createLineInsertion(2, 2, 1)];
        assertDiff(original, modified, expected);
    });
    test('empty diff 1', () => {
        const original = [''];
        const modified = ['something'];
        const expected = [createLineChange(1, 1, 1, 1, undefined)];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('empty diff 2', () => {
        const original = [''];
        const modified = ['something', 'something else'];
        const expected = [createLineChange(1, 1, 1, 2, undefined)];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('empty diff 3', () => {
        const original = ['something', 'something else'];
        const modified = [''];
        const expected = [createLineChange(1, 2, 1, 1, undefined)];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('empty diff 4', () => {
        const original = ['something'];
        const modified = [''];
        const expected = [createLineChange(1, 1, 1, 1, undefined)];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('empty diff 5', () => {
        const original = [''];
        const modified = [''];
        const expected = [];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('pretty diff 1', () => {
        const original = [
            'suite(function () {',
            '	test1() {',
            '		assert.ok(true);',
            '	}',
            '',
            '	test2() {',
            '		assert.ok(true);',
            '	}',
            '});',
            '',
        ];
        const modified = [
            '// An insertion',
            'suite(function () {',
            '	test1() {',
            '		assert.ok(true);',
            '	}',
            '',
            '	test2() {',
            '		assert.ok(true);',
            '	}',
            '',
            '	test3() {',
            '		assert.ok(true);',
            '	}',
            '});',
            '',
        ];
        const expected = [createLineInsertion(1, 1, 0), createLineInsertion(10, 13, 8)];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('pretty diff 2', () => {
        const original = [
            '// Just a comment',
            '',
            'function compute(a, b, c, d) {',
            '	if (a) {',
            '		if (b) {',
            '			if (c) {',
            '				return 5;',
            '			}',
            '		}',
            '		// These next lines will be deleted',
            '		if (d) {',
            '			return -1;',
            '		}',
            '		return 0;',
            '	}',
            '}',
        ];
        const modified = [
            '// Here is an inserted line',
            '// and another inserted line',
            '// and another one',
            '// Just a comment',
            '',
            'function compute(a, b, c, d) {',
            '	if (a) {',
            '		if (b) {',
            '			if (c) {',
            '				return 5;',
            '			}',
            '		}',
            '		return 0;',
            '	}',
            '}',
        ];
        const expected = [createLineInsertion(1, 3, 0), createLineDeletion(10, 13, 12)];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('pretty diff 3', () => {
        const original = [
            'class A {',
            '	/**',
            '	 * m1',
            '	 */',
            '	method1() {}',
            '',
            '	/**',
            '	 * m3',
            '	 */',
            '	method3() {}',
            '}',
        ];
        const modified = [
            'class A {',
            '	/**',
            '	 * m1',
            '	 */',
            '	method1() {}',
            '',
            '	/**',
            '	 * m2',
            '	 */',
            '	method2() {}',
            '',
            '	/**',
            '	 * m3',
            '	 */',
            '	method3() {}',
            '}',
        ];
        const expected = [createLineInsertion(7, 11, 6)];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('issue #23636', () => {
        const original = [
            'if(!TextDrawLoad[playerid])',
            '{',
            '',
            '	TextDrawHideForPlayer(playerid,TD_AppleJob[3]);',
            '	TextDrawHideForPlayer(playerid,TD_AppleJob[4]);',
            '	if(!AppleJobTreesType[AppleJobTreesPlayerNum[playerid]])',
            '	{',
            '		for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[5+i]);',
            '	}',
            '	else',
            '	{',
            '		for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[15+i]);',
            '	}',
            '}',
            'else',
            '{',
            '	TextDrawHideForPlayer(playerid,TD_AppleJob[3]);',
            '	TextDrawHideForPlayer(playerid,TD_AppleJob[27]);',
            '	if(!AppleJobTreesType[AppleJobTreesPlayerNum[playerid]])',
            '	{',
            '		for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[28+i]);',
            '	}',
            '	else',
            '	{',
            '		for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[38+i]);',
            '	}',
            '}',
        ];
        const modified = [
            '	if(!TextDrawLoad[playerid])',
            '	{',
            '	',
            '		TextDrawHideForPlayer(playerid,TD_AppleJob[3]);',
            '		TextDrawHideForPlayer(playerid,TD_AppleJob[4]);',
            '		if(!AppleJobTreesType[AppleJobTreesPlayerNum[playerid]])',
            '		{',
            '			for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[5+i]);',
            '		}',
            '		else',
            '		{',
            '			for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[15+i]);',
            '		}',
            '	}',
            '	else',
            '	{',
            '		TextDrawHideForPlayer(playerid,TD_AppleJob[3]);',
            '		TextDrawHideForPlayer(playerid,TD_AppleJob[27]);',
            '		if(!AppleJobTreesType[AppleJobTreesPlayerNum[playerid]])',
            '		{',
            '			for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[28+i]);',
            '		}',
            '		else',
            '		{',
            '			for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[38+i]);',
            '		}',
            '	}',
        ];
        const expected = [
            createLineChange(1, 27, 1, 27, [
                createCharChange(1, 1, 1, 1, 1, 1, 1, 2),
                createCharChange(2, 1, 2, 1, 2, 1, 2, 2),
                createCharChange(3, 1, 3, 1, 3, 1, 3, 2),
                createCharChange(4, 1, 4, 1, 4, 1, 4, 2),
                createCharChange(5, 1, 5, 1, 5, 1, 5, 2),
                createCharChange(6, 1, 6, 1, 6, 1, 6, 2),
                createCharChange(7, 1, 7, 1, 7, 1, 7, 2),
                createCharChange(8, 1, 8, 1, 8, 1, 8, 2),
                createCharChange(9, 1, 9, 1, 9, 1, 9, 2),
                createCharChange(10, 1, 10, 1, 10, 1, 10, 2),
                createCharChange(11, 1, 11, 1, 11, 1, 11, 2),
                createCharChange(12, 1, 12, 1, 12, 1, 12, 2),
                createCharChange(13, 1, 13, 1, 13, 1, 13, 2),
                createCharChange(14, 1, 14, 1, 14, 1, 14, 2),
                createCharChange(15, 1, 15, 1, 15, 1, 15, 2),
                createCharChange(16, 1, 16, 1, 16, 1, 16, 2),
                createCharChange(17, 1, 17, 1, 17, 1, 17, 2),
                createCharChange(18, 1, 18, 1, 18, 1, 18, 2),
                createCharChange(19, 1, 19, 1, 19, 1, 19, 2),
                createCharChange(20, 1, 20, 1, 20, 1, 20, 2),
                createCharChange(21, 1, 21, 1, 21, 1, 21, 2),
                createCharChange(22, 1, 22, 1, 22, 1, 22, 2),
                createCharChange(23, 1, 23, 1, 23, 1, 23, 2),
                createCharChange(24, 1, 24, 1, 24, 1, 24, 2),
                createCharChange(25, 1, 25, 1, 25, 1, 25, 2),
                createCharChange(26, 1, 26, 1, 26, 1, 26, 2),
                createCharChange(27, 1, 27, 1, 27, 1, 27, 2),
            ]),
            // createLineInsertion(7, 11, 6)
        ];
        assertDiff(original, modified, expected, true, true, false);
    });
    test('issue #43922', () => {
        const original = [
            ' * `yarn [install]` -- Install project NPM dependencies. This is automatically done when you first create the project. You should only need to run this if you add dependencies in `package.json`.',
        ];
        const modified = [
            ' * `yarn` -- Install project NPM dependencies. You should only need to run this if you add dependencies in `package.json`.',
        ];
        const expected = [
            createLineChange(1, 1, 1, 1, [
                createCharChange(1, 9, 1, 19, 1, 9, 1, 9),
                createCharChange(1, 58, 1, 120, 1, 48, 1, 48),
            ]),
        ];
        assertDiff(original, modified, expected, true, true, false);
    });
    test('issue #42751', () => {
        const original = ['    1', '  2'];
        const modified = ['    1', '   3'];
        const expected = [createLineChange(2, 2, 2, 2, [createCharChange(2, 3, 2, 4, 2, 3, 2, 5)])];
        assertDiff(original, modified, expected, true, true, false);
    });
    test('does not give character changes', () => {
        const original = ['    1', '  2', 'A'];
        const modified = ['    1', '   3', ' A'];
        const expected = [createLineChange(2, 3, 2, 3)];
        assertDiff(original, modified, expected, false, false, false);
    });
    test('issue #44422: Less than ideal diff results', () => {
        const original = [
            'export class C {',
            '',
            '	public m1(): void {',
            '		{',
            '		//2',
            '		//3',
            '		//4',
            '		//5',
            '		//6',
            '		//7',
            '		//8',
            '		//9',
            '		//10',
            '		//11',
            '		//12',
            '		//13',
            '		//14',
            '		//15',
            '		//16',
            '		//17',
            '		//18',
            '		}',
            '	}',
            '',
            '	public m2(): void {',
            '		if (a) {',
            '			if (b) {',
            '				//A1',
            '				//A2',
            '				//A3',
            '				//A4',
            '				//A5',
            '				//A6',
            '				//A7',
            '				//A8',
            '			}',
            '		}',
            '',
            '		//A9',
            '		//A10',
            '		//A11',
            '		//A12',
            '		//A13',
            '		//A14',
            '		//A15',
            '	}',
            '',
            '	public m3(): void {',
            '		if (a) {',
            '			//B1',
            '		}',
            '		//B2',
            '		//B3',
            '	}',
            '',
            '	public m4(): boolean {',
            '		//1',
            '		//2',
            '		//3',
            '		//4',
            '	}',
            '',
            '}',
        ];
        const modified = [
            'export class C {',
            '',
            '	constructor() {',
            '',
            '',
            '',
            '',
            '	}',
            '',
            '	public m1(): void {',
            '		{',
            '		//2',
            '		//3',
            '		//4',
            '		//5',
            '		//6',
            '		//7',
            '		//8',
            '		//9',
            '		//10',
            '		//11',
            '		//12',
            '		//13',
            '		//14',
            '		//15',
            '		//16',
            '		//17',
            '		//18',
            '		}',
            '	}',
            '',
            '	public m4(): boolean {',
            '		//1',
            '		//2',
            '		//3',
            '		//4',
            '	}',
            '',
            '}',
        ];
        const expected = [createLineChange(2, 0, 3, 9), createLineChange(25, 55, 31, 0)];
        assertDiff(original, modified, expected, false, false, false);
    });
    test('gives preference to matching longer lines', () => {
        const original = ['A', 'A', 'BB', 'C'];
        const modified = ['A', 'BB', 'A', 'D', 'E', 'A', 'C'];
        const expected = [createLineChange(2, 2, 1, 0), createLineChange(3, 0, 3, 6)];
        assertDiff(original, modified, expected, false, false, false);
    });
    test('issue #119051: gives preference to fewer diff hunks', () => {
        const original = ['1', '', '', '2', ''];
        const modified = ['1', '', '1.5', '', '', '2', '', '3', ''];
        const expected = [createLineChange(2, 0, 3, 4), createLineChange(5, 0, 8, 9)];
        assertDiff(original, modified, expected, false, false, false);
    });
    test('issue #121436: Diff chunk contains an unchanged line part 1', () => {
        const original = ['if (cond) {', '    cmd', '}'];
        const modified = ['if (cond) {', '    if (other_cond) {', '        cmd', '    }', '}'];
        const expected = [createLineChange(1, 0, 2, 2), createLineChange(2, 0, 4, 4)];
        assertDiff(original, modified, expected, false, false, true);
    });
    test('issue #121436: Diff chunk contains an unchanged line part 2', () => {
        const original = ['if (cond) {', '    cmd', '}'];
        const modified = ['if (cond) {', '    if (other_cond) {', '        cmd', '    }', '}'];
        const expected = [
            createLineChange(1, 0, 2, 2),
            createLineChange(2, 2, 3, 3),
            createLineChange(2, 0, 4, 4),
        ];
        assertDiff(original, modified, expected, false, false, false);
    });
    test('issue #169552: Assertion error when having both leading and trailing whitespace diffs', () => {
        const original = ['if True:', '    print(2)'];
        const modified = ['if True:', '\tprint(2) '];
        const expected = [
            createLineChange(2, 2, 2, 2, [
                createCharChange(2, 1, 2, 5, 2, 1, 2, 2),
                createCharChange(2, 13, 2, 13, 2, 10, 2, 11),
            ]),
        ];
        assertDiff(original, modified, expected, true, false, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9kaWZmL2RpZmZDb21wdXRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUNOLFlBQVksR0FHWixNQUFNLGlEQUFpRCxDQUFBO0FBRXhELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVyRCxTQUFTLFVBQVUsQ0FDbEIsYUFBdUIsRUFDdkIsYUFBdUIsRUFDdkIsZUFBOEIsRUFDOUIsMkJBQW9DLElBQUksRUFDeEMsK0JBQXdDLEtBQUssRUFDN0MsNkJBQXNDLEtBQUs7SUFFM0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsYUFBYSxFQUFFLGFBQWEsRUFBRTtRQUNuRSx3QkFBd0I7UUFDeEIsNEJBQTRCO1FBQzVCLDBCQUEwQjtRQUMxQixvQkFBb0IsRUFBRSxJQUFJO1FBQzFCLGtCQUFrQixFQUFFLENBQUM7S0FDckIsQ0FBQyxDQUFBO0lBQ0YsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQTtJQUVsRCxNQUFNLGFBQWEsR0FBRyxDQUFDLFVBQXVCLEVBQUUsRUFBRTtRQUNqRCxPQUFPO1lBQ04sdUJBQXVCLEVBQUUsVUFBVSxDQUFDLHVCQUF1QjtZQUMzRCxtQkFBbUIsRUFBRSxVQUFVLENBQUMsbUJBQW1CO1lBQ25ELHFCQUFxQixFQUFFLFVBQVUsQ0FBQyxxQkFBcUI7WUFDdkQsaUJBQWlC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RSxFQUFFO2dCQUM5QixnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQzVDLENBQUM7WUFDRixnQ0FB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LENBQUMsQ0FBQTtRQUNoRixVQUFVLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM5RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7UUFDdEQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN0QyxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sUUFBUSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3RSxVQUFVLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM5RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDaEUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdkMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNELE1BQU0sUUFBUSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENB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
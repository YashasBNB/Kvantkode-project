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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vZGlmZi9kaWZmQ29tcHV0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFDTixZQUFZLEdBR1osTUFBTSxpREFBaUQsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFckQsU0FBUyxVQUFVLENBQ2xCLGFBQXVCLEVBQ3ZCLGFBQXVCLEVBQ3ZCLGVBQThCLEVBQzlCLDJCQUFvQyxJQUFJLEVBQ3hDLCtCQUF3QyxLQUFLLEVBQzdDLDZCQUFzQyxLQUFLO0lBRTNDLE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUU7UUFDbkUsd0JBQXdCO1FBQ3hCLDRCQUE0QjtRQUM1QiwwQkFBMEI7UUFDMUIsb0JBQW9CLEVBQUUsSUFBSTtRQUMxQixrQkFBa0IsRUFBRSxDQUFDO0tBQ3JCLENBQUMsQ0FBQTtJQUNGLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUE7SUFFbEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxVQUF1QixFQUFFLEVBQUU7UUFDakQsT0FBTztZQUNOLHVCQUF1QixFQUFFLFVBQVUsQ0FBQyx1QkFBdUI7WUFDM0QsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLG1CQUFtQjtZQUNuRCxxQkFBcUIsRUFBRSxVQUFVLENBQUMscUJBQXFCO1lBQ3ZELGlCQUFpQixFQUFF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RTtnQkFDOUIsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUM1QyxDQUFDO1lBQ0YsZ0NBQWdDO1NBQ2hDLENBQUE7UUFDRCxVQUFVLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM1RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLE1BQU0sUUFBUSxHQUFHO1lBQ2hCLG9NQUFvTTtTQUNwTSxDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQUc7WUFDaEIsNEhBQTRIO1NBQzVILENBQUE7UUFDRCxNQUFNLFFBQVEsR0FBRztZQUNoQixnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQzVCLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7YUFDN0MsQ0FBQztTQUNGLENBQUE7UUFDRCxVQUFVLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM1RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLE1BQU0sUUFBUSxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sUUFBUSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNGLFVBQVUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzVELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sUUFBUSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQyxVQUFVLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM5RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQsTUFBTSxRQUFRLEdBQUc7WUFDaEIsa0JBQWtCO1lBQ2xCLEVBQUU7WUFDRixzQkFBc0I7WUFDdEIsS0FBSztZQUNMLE9BQU87WUFDUCxPQUFPO1lBQ1AsT0FBTztZQUNQLE9BQU87WUFDUCxPQUFPO1lBQ1AsT0FBTztZQUNQLE9BQU87WUFDUCxPQUFPO1lBQ1AsUUFBUTtZQUNSLFFBQVE7WUFDUixRQUFRO1lBQ1IsUUFBUTtZQUNSLFFBQVE7WUFDUixRQUFRO1lBQ1IsUUFBUTtZQUNSLFFBQVE7WUFDUixRQUFRO1lBQ1IsS0FBSztZQUNMLElBQUk7WUFDSixFQUFFO1lBQ0Ysc0JBQXNCO1lBQ3RCLFlBQVk7WUFDWixhQUFhO1lBQ2IsVUFBVTtZQUNWLFVBQVU7WUFDVixVQUFVO1lBQ1YsVUFBVTtZQUNWLFVBQVU7WUFDVixVQUFVO1lBQ1YsVUFBVTtZQUNWLFVBQVU7WUFDVixNQUFNO1lBQ04sS0FBSztZQUNMLEVBQUU7WUFDRixRQUFRO1lBQ1IsU0FBUztZQUNULFNBQVM7WUFDVCxTQUFTO1lBQ1QsU0FBUztZQUNULFNBQVM7WUFDVCxTQUFTO1lBQ1QsSUFBSTtZQUNKLEVBQUU7WUFDRixzQkFBc0I7WUFDdEIsWUFBWTtZQUNaLFNBQVM7WUFDVCxLQUFLO1lBQ0wsUUFBUTtZQUNSLFFBQVE7WUFDUixJQUFJO1lBQ0osRUFBRTtZQUNGLHlCQUF5QjtZQUN6QixPQUFPO1lBQ1AsT0FBTztZQUNQLE9BQU87WUFDUCxPQUFPO1lBQ1AsSUFBSTtZQUNKLEVBQUU7WUFDRixHQUFHO1NBQ0gsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFHO1lBQ2hCLGtCQUFrQjtZQUNsQixFQUFFO1lBQ0Ysa0JBQWtCO1lBQ2xCLEVBQUU7WUFDRixFQUFFO1lBQ0YsRUFBRTtZQUNGLEVBQUU7WUFDRixJQUFJO1lBQ0osRUFBRTtZQUNGLHNCQUFzQjtZQUN0QixLQUFLO1lBQ0wsT0FBTztZQUNQLE9BQU87WUFDUCxPQUFPO1lBQ1AsT0FBTztZQUNQLE9BQU87WUFDUCxPQUFPO1lBQ1AsT0FBTztZQUNQLE9BQU87WUFDUCxRQUFRO1lBQ1IsUUFBUTtZQUNSLFFBQVE7WUFDUixRQUFRO1lBQ1IsUUFBUTtZQUNSLFFBQVE7WUFDUixRQUFRO1lBQ1IsUUFBUTtZQUNSLFFBQVE7WUFDUixLQUFLO1lBQ0wsSUFBSTtZQUNKLEVBQUU7WUFDRix5QkFBeUI7WUFDekIsT0FBTztZQUNQLE9BQU87WUFDUCxPQUFPO1lBQ1AsT0FBTztZQUNQLElBQUk7WUFDSixFQUFFO1lBQ0YsR0FBRztTQUNILENBQUE7UUFDRCxNQUFNLFFBQVEsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEYsVUFBVSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDOUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO1FBQ3RELE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNyRCxNQUFNLFFBQVEsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0UsVUFBVSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDOUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFO1FBQ2hFLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzRCxNQUFNLFFBQVEsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENB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
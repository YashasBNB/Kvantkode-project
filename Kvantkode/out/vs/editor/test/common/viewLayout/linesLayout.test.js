/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EditorWhitespace, LinesLayout } from '../../../common/viewLayout/linesLayout.js';
suite('Editor ViewLayout - LinesLayout', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function insertWhitespace(linesLayout, afterLineNumber, ordinal, heightInPx, minWidth) {
        let id;
        linesLayout.changeWhitespace((accessor) => {
            id = accessor.insertWhitespace(afterLineNumber, ordinal, heightInPx, minWidth);
        });
        return id;
    }
    function changeOneWhitespace(linesLayout, id, newAfterLineNumber, newHeight) {
        linesLayout.changeWhitespace((accessor) => {
            accessor.changeOneWhitespace(id, newAfterLineNumber, newHeight);
        });
    }
    function removeWhitespace(linesLayout, id) {
        linesLayout.changeWhitespace((accessor) => {
            accessor.removeWhitespace(id);
        });
    }
    test('LinesLayout 1', () => {
        // Start off with 10 lines
        const linesLayout = new LinesLayout(10, 10, 0, 0);
        // lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        // whitespace: -
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 100);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 10);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 20);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 30);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 40);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 50);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 60);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 70);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(9), 80);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(10), 90);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(0), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(1), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(5), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(9), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(10), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(11), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(15), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(19), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(20), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(21), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(29), 3);
        // Add whitespace of height 5px after 2nd line
        insertWhitespace(linesLayout, 2, 0, 5, 0);
        // lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        // whitespace: a(2,5)
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 105);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 10);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 25);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 35);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 45);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(0), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(1), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(9), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(10), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(20), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(21), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(24), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(25), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(35), 4);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(45), 5);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(104), 10);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(105), 10);
        // Add two more whitespaces of height 5px
        insertWhitespace(linesLayout, 3, 0, 5, 0);
        insertWhitespace(linesLayout, 4, 0, 5, 0);
        // lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        // whitespace: a(2,5), b(3, 5), c(4, 5)
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 115);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 10);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 25);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 40);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 55);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 65);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(0), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(1), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(9), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(10), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(19), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(20), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(34), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(35), 4);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(49), 4);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(50), 5);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(64), 5);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(65), 6);
        assert.strictEqual(linesLayout.getVerticalOffsetForWhitespaceIndex(0), 20); // 20 -> 25
        assert.strictEqual(linesLayout.getVerticalOffsetForWhitespaceIndex(1), 35); // 35 -> 40
        assert.strictEqual(linesLayout.getVerticalOffsetForWhitespaceIndex(2), 50);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(0), 0);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(19), 0);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(20), 0);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(21), 0);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(22), 0);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(23), 0);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(24), 0);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(25), 1);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(26), 1);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(34), 1);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(35), 1);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(36), 1);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(39), 1);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(40), 2);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(41), 2);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(49), 2);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(50), 2);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(51), 2);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(54), 2);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(55), -1);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(1000), -1);
    });
    test('LinesLayout 2', () => {
        // Start off with 10 lines and one whitespace after line 2, of height 5
        const linesLayout = new LinesLayout(10, 1, 0, 0);
        const a = insertWhitespace(linesLayout, 2, 0, 5, 0);
        // 10 lines
        // whitespace: - a(2,5)
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 15);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 1);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 7);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 8);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 9);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 10);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 11);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 12);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(9), 13);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(10), 14);
        // Change whitespace height
        // 10 lines
        // whitespace: - a(2,10)
        changeOneWhitespace(linesLayout, a, 2, 10);
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 20);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 1);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 12);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 13);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 14);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 15);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 16);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 17);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(9), 18);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(10), 19);
        // Change whitespace position
        // 10 lines
        // whitespace: - a(5,10)
        changeOneWhitespace(linesLayout, a, 5, 10);
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 20);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 1);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 2);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 3);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 4);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 15);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 16);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 17);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(9), 18);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(10), 19);
        // Pretend that lines 5 and 6 were deleted
        // 8 lines
        // whitespace: - a(4,10)
        linesLayout.onLinesDeleted(5, 6);
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 18);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 1);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 2);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 3);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 14);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 15);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 16);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 17);
        // Insert two lines at the beginning
        // 10 lines
        // whitespace: - a(6,10)
        linesLayout.onLinesInserted(1, 2);
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 20);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 1);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 2);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 3);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 4);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 5);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 16);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 17);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(9), 18);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(10), 19);
        // Remove whitespace
        // 10 lines
        removeWhitespace(linesLayout, a);
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 10);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 1);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 2);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 3);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 4);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 5);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 6);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 7);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(9), 8);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(10), 9);
    });
    test('LinesLayout Padding', () => {
        // Start off with 10 lines
        const linesLayout = new LinesLayout(10, 10, 15, 20);
        // lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        // whitespace: -
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 135);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 15);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 25);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 35);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 45);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 55);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 65);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 75);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 85);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(9), 95);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(10), 105);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(0), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(10), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(15), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(24), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(25), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(34), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(35), 3);
        // Add whitespace of height 5px after 2nd line
        insertWhitespace(linesLayout, 2, 0, 5, 0);
        // lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        // whitespace: a(2,5)
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 140);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 15);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 25);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 40);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 50);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(0), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(10), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(25), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(34), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(35), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(39), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(40), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(41), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(49), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(50), 4);
        // Add two more whitespaces of height 5px
        insertWhitespace(linesLayout, 3, 0, 5, 0);
        insertWhitespace(linesLayout, 4, 0, 5, 0);
        // lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        // whitespace: a(2,5), b(3, 5), c(4, 5)
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 150);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 15);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 25);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 40);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 55);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 70);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 80);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(0), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(15), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(24), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(30), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(35), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(39), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(40), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(49), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(50), 4);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(54), 4);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(55), 4);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(64), 4);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(65), 5);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(69), 5);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(70), 5);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(80), 6);
        assert.strictEqual(linesLayout.getVerticalOffsetForWhitespaceIndex(0), 35); // 35 -> 40
        assert.strictEqual(linesLayout.getVerticalOffsetForWhitespaceIndex(1), 50); // 50 -> 55
        assert.strictEqual(linesLayout.getVerticalOffsetForWhitespaceIndex(2), 65);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(0), 0);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(34), 0);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(35), 0);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(39), 0);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(40), 1);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(49), 1);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(50), 1);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(54), 1);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(55), 2);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(64), 2);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(65), 2);
        assert.strictEqual(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(70), -1);
    });
    test('LinesLayout getLineNumberAtOrAfterVerticalOffset', () => {
        const linesLayout = new LinesLayout(10, 1, 0, 0);
        insertWhitespace(linesLayout, 6, 0, 10, 0);
        // 10 lines
        // whitespace: - a(6,10)
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 20);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 1);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 2);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 3);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 4);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 5);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 16);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 17);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(9), 18);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(10), 19);
        // Do some hit testing
        // line      [1, 2, 3, 4, 5, 6,  7,  8,  9, 10]
        // vertical: [0, 1, 2, 3, 4, 5, 16, 17, 18, 19]
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(-100), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(-1), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(0), 1);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(1), 2);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(2), 3);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(3), 4);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(4), 5);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(5), 6);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(6), 7);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(7), 7);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(8), 7);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(9), 7);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(10), 7);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(11), 7);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(12), 7);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(13), 7);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(14), 7);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(15), 7);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(16), 7);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(17), 8);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(18), 9);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(19), 10);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(20), 10);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(21), 10);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(22), 10);
        assert.strictEqual(linesLayout.getLineNumberAtOrAfterVerticalOffset(23), 10);
    });
    test('LinesLayout getCenteredLineInViewport', () => {
        const linesLayout = new LinesLayout(10, 1, 0, 0);
        insertWhitespace(linesLayout, 6, 0, 10, 0);
        // 10 lines
        // whitespace: - a(6,10)
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 20);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 1);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 2);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 3);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 4);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 5);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 16);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 17);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(9), 18);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(10), 19);
        // Find centered line in viewport 1
        // line      [1, 2, 3, 4, 5, 6,  7,  8,  9, 10]
        // vertical: [0, 1, 2, 3, 4, 5, 16, 17, 18, 19]
        assert.strictEqual(linesLayout.getLinesViewportData(0, 1).centeredLineNumber, 1);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 2).centeredLineNumber, 2);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 3).centeredLineNumber, 2);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 4).centeredLineNumber, 3);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 5).centeredLineNumber, 3);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 6).centeredLineNumber, 4);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 7).centeredLineNumber, 4);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 8).centeredLineNumber, 5);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 9).centeredLineNumber, 5);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 10).centeredLineNumber, 6);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 11).centeredLineNumber, 6);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 12).centeredLineNumber, 6);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 13).centeredLineNumber, 6);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 14).centeredLineNumber, 6);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 15).centeredLineNumber, 6);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 16).centeredLineNumber, 6);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 17).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 18).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 19).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 21).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 22).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 23).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 24).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 25).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 26).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 27).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 28).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 29).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 30).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 31).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 32).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(0, 33).centeredLineNumber, 7);
        // Find centered line in viewport 2
        // line      [1, 2, 3, 4, 5, 6,  7,  8,  9, 10]
        // vertical: [0, 1, 2, 3, 4, 5, 16, 17, 18, 19]
        assert.strictEqual(linesLayout.getLinesViewportData(0, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(1, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(2, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(3, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(4, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(5, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(6, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(7, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(8, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(9, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(10, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(11, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(12, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(13, 20).centeredLineNumber, 7);
        assert.strictEqual(linesLayout.getLinesViewportData(14, 20).centeredLineNumber, 8);
        assert.strictEqual(linesLayout.getLinesViewportData(15, 20).centeredLineNumber, 8);
        assert.strictEqual(linesLayout.getLinesViewportData(16, 20).centeredLineNumber, 9);
        assert.strictEqual(linesLayout.getLinesViewportData(17, 20).centeredLineNumber, 9);
        assert.strictEqual(linesLayout.getLinesViewportData(18, 20).centeredLineNumber, 10);
        assert.strictEqual(linesLayout.getLinesViewportData(19, 20).centeredLineNumber, 10);
        assert.strictEqual(linesLayout.getLinesViewportData(20, 23).centeredLineNumber, 10);
        assert.strictEqual(linesLayout.getLinesViewportData(21, 23).centeredLineNumber, 10);
        assert.strictEqual(linesLayout.getLinesViewportData(22, 23).centeredLineNumber, 10);
    });
    test('LinesLayout getLinesViewportData 1', () => {
        const linesLayout = new LinesLayout(10, 10, 0, 0);
        insertWhitespace(linesLayout, 6, 0, 100, 0);
        // 10 lines
        // whitespace: - a(6,100)
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 200);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 10);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 20);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 30);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 40);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 50);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 160);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 170);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(9), 180);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(10), 190);
        // viewport 0->50
        let viewportData = linesLayout.getLinesViewportData(0, 50);
        assert.strictEqual(viewportData.startLineNumber, 1);
        assert.strictEqual(viewportData.endLineNumber, 5);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 1);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 5);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [0, 10, 20, 30, 40]);
        // viewport 1->51
        viewportData = linesLayout.getLinesViewportData(1, 51);
        assert.strictEqual(viewportData.startLineNumber, 1);
        assert.strictEqual(viewportData.endLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 2);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 5);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [0, 10, 20, 30, 40, 50]);
        // viewport 5->55
        viewportData = linesLayout.getLinesViewportData(5, 55);
        assert.strictEqual(viewportData.startLineNumber, 1);
        assert.strictEqual(viewportData.endLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 2);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 5);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [0, 10, 20, 30, 40, 50]);
        // viewport 10->60
        viewportData = linesLayout.getLinesViewportData(10, 60);
        assert.strictEqual(viewportData.startLineNumber, 2);
        assert.strictEqual(viewportData.endLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 2);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 6);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [10, 20, 30, 40, 50]);
        // viewport 50->100
        viewportData = linesLayout.getLinesViewportData(50, 100);
        assert.strictEqual(viewportData.startLineNumber, 6);
        assert.strictEqual(viewportData.endLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 6);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [50]);
        // viewport 60->110
        viewportData = linesLayout.getLinesViewportData(60, 110);
        assert.strictEqual(viewportData.startLineNumber, 7);
        assert.strictEqual(viewportData.endLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 7);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [160]);
        // viewport 65->115
        viewportData = linesLayout.getLinesViewportData(65, 115);
        assert.strictEqual(viewportData.startLineNumber, 7);
        assert.strictEqual(viewportData.endLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 7);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [160]);
        // viewport 50->159
        viewportData = linesLayout.getLinesViewportData(50, 159);
        assert.strictEqual(viewportData.startLineNumber, 6);
        assert.strictEqual(viewportData.endLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 6);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [50]);
        // viewport 50->160
        viewportData = linesLayout.getLinesViewportData(50, 160);
        assert.strictEqual(viewportData.startLineNumber, 6);
        assert.strictEqual(viewportData.endLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 6);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [50]);
        // viewport 51->161
        viewportData = linesLayout.getLinesViewportData(51, 161);
        assert.strictEqual(viewportData.startLineNumber, 6);
        assert.strictEqual(viewportData.endLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 7);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [50, 160]);
        // viewport 150->169
        viewportData = linesLayout.getLinesViewportData(150, 169);
        assert.strictEqual(viewportData.startLineNumber, 7);
        assert.strictEqual(viewportData.endLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 7);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [160]);
        // viewport 159->169
        viewportData = linesLayout.getLinesViewportData(159, 169);
        assert.strictEqual(viewportData.startLineNumber, 7);
        assert.strictEqual(viewportData.endLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 7);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [160]);
        // viewport 160->169
        viewportData = linesLayout.getLinesViewportData(160, 169);
        assert.strictEqual(viewportData.startLineNumber, 7);
        assert.strictEqual(viewportData.endLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 7);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [160]);
        // viewport 160->1000
        viewportData = linesLayout.getLinesViewportData(160, 1000);
        assert.strictEqual(viewportData.startLineNumber, 7);
        assert.strictEqual(viewportData.endLineNumber, 10);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 10);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [160, 170, 180, 190]);
    });
    test('LinesLayout getLinesViewportData 2 & getWhitespaceViewportData', () => {
        const linesLayout = new LinesLayout(10, 10, 0, 0);
        const a = insertWhitespace(linesLayout, 6, 0, 100, 0);
        const b = insertWhitespace(linesLayout, 7, 0, 50, 0);
        // 10 lines
        // whitespace: - a(6,100), b(7, 50)
        assert.strictEqual(linesLayout.getLinesTotalHeight(), 250);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(1), 0);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(2), 10);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(3), 20);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(4), 30);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(5), 40);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(6), 50);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(7), 160);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(8), 220);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(9), 230);
        assert.strictEqual(linesLayout.getVerticalOffsetForLineNumber(10), 240);
        // viewport 50->160
        let viewportData = linesLayout.getLinesViewportData(50, 160);
        assert.strictEqual(viewportData.startLineNumber, 6);
        assert.strictEqual(viewportData.endLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 6);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [50]);
        let whitespaceData = linesLayout.getWhitespaceViewportData(50, 160);
        assert.deepStrictEqual(whitespaceData, [
            {
                id: a,
                afterLineNumber: 6,
                verticalOffset: 60,
                height: 100,
            },
        ]);
        // viewport 50->219
        viewportData = linesLayout.getLinesViewportData(50, 219);
        assert.strictEqual(viewportData.startLineNumber, 6);
        assert.strictEqual(viewportData.endLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 7);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [50, 160]);
        whitespaceData = linesLayout.getWhitespaceViewportData(50, 219);
        assert.deepStrictEqual(whitespaceData, [
            {
                id: a,
                afterLineNumber: 6,
                verticalOffset: 60,
                height: 100,
            },
            {
                id: b,
                afterLineNumber: 7,
                verticalOffset: 170,
                height: 50,
            },
        ]);
        // viewport 50->220
        viewportData = linesLayout.getLinesViewportData(50, 220);
        assert.strictEqual(viewportData.startLineNumber, 6);
        assert.strictEqual(viewportData.endLineNumber, 7);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 7);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [50, 160]);
        // viewport 50->250
        viewportData = linesLayout.getLinesViewportData(50, 250);
        assert.strictEqual(viewportData.startLineNumber, 6);
        assert.strictEqual(viewportData.endLineNumber, 10);
        assert.strictEqual(viewportData.completelyVisibleStartLineNumber, 6);
        assert.strictEqual(viewportData.completelyVisibleEndLineNumber, 10);
        assert.deepStrictEqual(viewportData.relativeVerticalOffset, [50, 160, 220, 230, 240]);
    });
    test('LinesLayout getWhitespaceAtVerticalOffset', () => {
        const linesLayout = new LinesLayout(10, 10, 0, 0);
        const a = insertWhitespace(linesLayout, 6, 0, 100, 0);
        const b = insertWhitespace(linesLayout, 7, 0, 50, 0);
        let whitespace = linesLayout.getWhitespaceAtVerticalOffset(0);
        assert.strictEqual(whitespace, null);
        whitespace = linesLayout.getWhitespaceAtVerticalOffset(59);
        assert.strictEqual(whitespace, null);
        whitespace = linesLayout.getWhitespaceAtVerticalOffset(60);
        assert.strictEqual(whitespace.id, a);
        whitespace = linesLayout.getWhitespaceAtVerticalOffset(61);
        assert.strictEqual(whitespace.id, a);
        whitespace = linesLayout.getWhitespaceAtVerticalOffset(159);
        assert.strictEqual(whitespace.id, a);
        whitespace = linesLayout.getWhitespaceAtVerticalOffset(160);
        assert.strictEqual(whitespace, null);
        whitespace = linesLayout.getWhitespaceAtVerticalOffset(161);
        assert.strictEqual(whitespace, null);
        whitespace = linesLayout.getWhitespaceAtVerticalOffset(169);
        assert.strictEqual(whitespace, null);
        whitespace = linesLayout.getWhitespaceAtVerticalOffset(170);
        assert.strictEqual(whitespace.id, b);
        whitespace = linesLayout.getWhitespaceAtVerticalOffset(171);
        assert.strictEqual(whitespace.id, b);
        whitespace = linesLayout.getWhitespaceAtVerticalOffset(219);
        assert.strictEqual(whitespace.id, b);
        whitespace = linesLayout.getWhitespaceAtVerticalOffset(220);
        assert.strictEqual(whitespace, null);
    });
    test('LinesLayout', () => {
        const linesLayout = new LinesLayout(100, 20, 0, 0);
        // Insert a whitespace after line number 2, of height 10
        const a = insertWhitespace(linesLayout, 2, 0, 10, 0);
        // whitespaces: a(2, 10)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 1);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 2);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 10);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 10);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 10);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 10);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 10);
        // Insert a whitespace again after line number 2, of height 20
        let b = insertWhitespace(linesLayout, 2, 0, 20, 0);
        // whitespaces: a(2, 10), b(2, 20)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 2);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 2);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 10);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 2);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(1), 20);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 10);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(1), 30);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 30);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 30);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 30);
        // Change last inserted whitespace height to 30
        changeOneWhitespace(linesLayout, b, 2, 30);
        // whitespaces: a(2, 10), b(2, 30)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 2);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 2);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 10);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 2);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(1), 30);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 10);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(1), 40);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 40);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 40);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 40);
        // Remove last inserted whitespace
        removeWhitespace(linesLayout, b);
        // whitespaces: a(2, 10)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 1);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 2);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 10);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 10);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 10);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 10);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 10);
        // Add a whitespace before the first line of height 50
        b = insertWhitespace(linesLayout, 0, 0, 50, 0);
        // whitespaces: b(0, 50), a(2, 10)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 2);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 0);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 50);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 2);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(1), 10);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 50);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(1), 60);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 60);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 60);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 60);
        // Add a whitespace after line 4 of height 20
        insertWhitespace(linesLayout, 4, 0, 20, 0);
        // whitespaces: b(0, 50), a(2, 10), c(4, 20)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 3);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 0);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 50);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 2);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(1), 10);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(2), 4);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(2), 20);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 50);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(1), 60);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(2), 80);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 80);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 60);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 60);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(5), 80);
        // Add a whitespace after line 3 of height 30
        insertWhitespace(linesLayout, 3, 0, 30, 0);
        // whitespaces: b(0, 50), a(2, 10), d(3, 30), c(4, 20)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 4);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 0);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 50);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 2);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(1), 10);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(2), 3);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(2), 30);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(3), 4);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(3), 20);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 50);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(1), 60);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(2), 90);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(3), 110);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 110);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 60);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 90);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(5), 110);
        // Change whitespace after line 2 to height of 100
        changeOneWhitespace(linesLayout, a, 2, 100);
        // whitespaces: b(0, 50), a(2, 100), d(3, 30), c(4, 20)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 4);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 0);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 50);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 2);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(1), 100);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(2), 3);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(2), 30);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(3), 4);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(3), 20);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 50);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(1), 150);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(2), 180);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(3), 200);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 200);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 150);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 180);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(5), 200);
        // Remove whitespace after line 2
        removeWhitespace(linesLayout, a);
        // whitespaces: b(0, 50), d(3, 30), c(4, 20)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 3);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 0);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 50);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 3);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(1), 30);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(2), 4);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(2), 20);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 50);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(1), 80);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(2), 100);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 100);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 80);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(5), 100);
        // Remove whitespace before line 1
        removeWhitespace(linesLayout, b);
        // whitespaces: d(3, 30), c(4, 20)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 2);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 3);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 30);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 4);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(1), 20);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 30);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(1), 50);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 30);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(5), 50);
        // Delete line 1
        linesLayout.onLinesDeleted(1, 1);
        // whitespaces: d(2, 30), c(3, 20)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 2);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 2);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 30);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 3);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(1), 20);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 30);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(1), 50);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 30);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(5), 50);
        // Insert a line before line 1
        linesLayout.onLinesInserted(1, 1);
        // whitespaces: d(3, 30), c(4, 20)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 2);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 3);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 30);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 4);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(1), 20);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 30);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(1), 50);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 30);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(5), 50);
        // Delete line 4
        linesLayout.onLinesDeleted(4, 4);
        // whitespaces: d(3, 30), c(3, 20)
        assert.strictEqual(linesLayout.getWhitespacesCount(), 2);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 3);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(0), 30);
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 3);
        assert.strictEqual(linesLayout.getHeightForWhitespaceIndex(1), 20);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(0), 30);
        assert.strictEqual(linesLayout.getWhitespacesAccumulatedHeight(1), 50);
        assert.strictEqual(linesLayout.getWhitespacesTotalHeight(), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(1), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(2), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(3), 0);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(4), 50);
        assert.strictEqual(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(5), 50);
    });
    test('LinesLayout findInsertionIndex', () => {
        const makeInternalWhitespace = (afterLineNumbers, ordinal = 0) => {
            return afterLineNumbers.map((afterLineNumber) => new EditorWhitespace('', afterLineNumber, ordinal, 0, 0));
        };
        let arr;
        arr = makeInternalWhitespace([]);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 1, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 2, 0), 0);
        arr = makeInternalWhitespace([1]);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
        arr = makeInternalWhitespace([1, 3]);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
        arr = makeInternalWhitespace([1, 3, 5]);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
        arr = makeInternalWhitespace([1, 3, 5], 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 1, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 3, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 5, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
        arr = makeInternalWhitespace([1, 3, 5, 7]);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 7, 0), 4);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 8, 0), 4);
        arr = makeInternalWhitespace([1, 3, 5, 7, 9]);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 7, 0), 4);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 8, 0), 4);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 9, 0), 5);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 10, 0), 5);
        arr = makeInternalWhitespace([1, 3, 5, 7, 9, 11]);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 7, 0), 4);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 8, 0), 4);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 9, 0), 5);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 10, 0), 5);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 11, 0), 6);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 12, 0), 6);
        arr = makeInternalWhitespace([1, 3, 5, 7, 9, 11, 13]);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 7, 0), 4);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 8, 0), 4);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 9, 0), 5);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 10, 0), 5);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 11, 0), 6);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 12, 0), 6);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 13, 0), 7);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 14, 0), 7);
        arr = makeInternalWhitespace([1, 3, 5, 7, 9, 11, 13, 15]);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 7, 0), 4);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 8, 0), 4);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 9, 0), 5);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 10, 0), 5);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 11, 0), 6);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 12, 0), 6);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 13, 0), 7);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 14, 0), 7);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 15, 0), 8);
        assert.strictEqual(LinesLayout.findInsertionIndex(arr, 16, 0), 8);
    });
    test('LinesLayout changeWhitespaceAfterLineNumber & getFirstWhitespaceIndexAfterLineNumber', () => {
        const linesLayout = new LinesLayout(100, 20, 0, 0);
        const a = insertWhitespace(linesLayout, 0, 0, 1, 0);
        const b = insertWhitespace(linesLayout, 7, 0, 1, 0);
        const c = insertWhitespace(linesLayout, 3, 0, 1, 0);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), a); // 0
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 0);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), c); // 3
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 3);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), b); // 7
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(2), 7);
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(1), 1); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(2), 1); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(3), 1); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(4), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(5), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(6), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(7), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(8), -1); // --
        // Do not really move a
        changeOneWhitespace(linesLayout, a, 1, 1);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), a); // 1
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 1);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), c); // 3
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 3);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), b); // 7
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(2), 7);
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(1), 0); // a
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(2), 1); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(3), 1); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(4), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(5), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(6), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(7), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(8), -1); // --
        // Do not really move a
        changeOneWhitespace(linesLayout, a, 2, 1);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), a); // 2
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 2);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), c); // 3
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 3);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), b); // 7
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(2), 7);
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(1), 0); // a
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(2), 0); // a
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(3), 1); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(4), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(5), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(6), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(7), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(8), -1); // --
        // Change a to conflict with c => a gets placed after c
        changeOneWhitespace(linesLayout, a, 3, 1);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), c); // 3
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 3);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), a); // 3
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 3);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), b); // 7
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(2), 7);
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(1), 0); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(2), 0); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(3), 0); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(4), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(5), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(6), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(7), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(8), -1); // --
        // Make a no-op
        changeOneWhitespace(linesLayout, c, 3, 1);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), c); // 3
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 3);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), a); // 3
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 3);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), b); // 7
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(2), 7);
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(1), 0); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(2), 0); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(3), 0); // c
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(4), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(5), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(6), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(7), 2); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(8), -1); // --
        // Conflict c with b => c gets placed after b
        changeOneWhitespace(linesLayout, c, 7, 1);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), a); // 3
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(0), 3);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), b); // 7
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(1), 7);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), c); // 7
        assert.strictEqual(linesLayout.getAfterLineNumberForWhitespaceIndex(2), 7);
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(1), 0); // a
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(2), 0); // a
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(3), 0); // a
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(4), 1); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(5), 1); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(6), 1); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(7), 1); // b
        assert.strictEqual(linesLayout.getFirstWhitespaceIndexAfterLineNumber(8), -1); // --
    });
    test('LinesLayout Bug', () => {
        const linesLayout = new LinesLayout(100, 20, 0, 0);
        const a = insertWhitespace(linesLayout, 0, 0, 1, 0);
        const b = insertWhitespace(linesLayout, 7, 0, 1, 0);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), a); // 0
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), b); // 7
        const c = insertWhitespace(linesLayout, 3, 0, 1, 0);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), a); // 0
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), c); // 3
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), b); // 7
        const d = insertWhitespace(linesLayout, 2, 0, 1, 0);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), a); // 0
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), d); // 2
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), c); // 3
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(3), b); // 7
        const e = insertWhitespace(linesLayout, 8, 0, 1, 0);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), a); // 0
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), d); // 2
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), c); // 3
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(3), b); // 7
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(4), e); // 8
        const f = insertWhitespace(linesLayout, 11, 0, 1, 0);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), a); // 0
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), d); // 2
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), c); // 3
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(3), b); // 7
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(4), e); // 8
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(5), f); // 11
        const g = insertWhitespace(linesLayout, 10, 0, 1, 0);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), a); // 0
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), d); // 2
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), c); // 3
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(3), b); // 7
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(4), e); // 8
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(5), g); // 10
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(6), f); // 11
        const h = insertWhitespace(linesLayout, 0, 0, 1, 0);
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(0), a); // 0
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(1), h); // 0
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(2), d); // 2
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(3), c); // 3
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(4), b); // 7
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(5), e); // 8
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(6), g); // 10
        assert.strictEqual(linesLayout.getIdForWhitespaceIndex(7), f); // 11
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNMYXlvdXQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3ZpZXdMYXlvdXQvbGluZXNMYXlvdXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXpGLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7SUFDN0MsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLGdCQUFnQixDQUN4QixXQUF3QixFQUN4QixlQUF1QixFQUN2QixPQUFlLEVBQ2YsVUFBa0IsRUFDbEIsUUFBZ0I7UUFFaEIsSUFBSSxFQUFVLENBQUE7UUFDZCxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUN6QyxFQUFFLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQy9FLENBQUMsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxFQUFHLENBQUE7SUFDWCxDQUFDO0lBRUQsU0FBUyxtQkFBbUIsQ0FDM0IsV0FBd0IsRUFDeEIsRUFBVSxFQUNWLGtCQUEwQixFQUMxQixTQUFpQjtRQUVqQixXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUN6QyxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFBRSxFQUFFLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2hFLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFNBQVMsZ0JBQWdCLENBQUMsV0FBd0IsRUFBRSxFQUFVO1FBQzdELFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ3pDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM5QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQiwwQkFBMEI7UUFDMUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakQsMkNBQTJDO1FBQzNDLGdCQUFnQjtRQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXRFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTNFLDhDQUE4QztRQUM5QyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekMsMkNBQTJDO1FBQzNDLHFCQUFxQjtRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXJFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRTdFLHlDQUF5QztRQUN6QyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLDJDQUEyQztRQUMzQyx1Q0FBdUM7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQSxDQUFDLFdBQVc7UUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQ0FBQyxXQUFXO1FBQ3RGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRTFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLHVFQUF1RTtRQUN2RSxNQUFNLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbkQsV0FBVztRQUNYLHVCQUF1QjtRQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXRFLDJCQUEyQjtRQUMzQixXQUFXO1FBQ1gsd0JBQXdCO1FBQ3hCLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFdEUsNkJBQTZCO1FBQzdCLFdBQVc7UUFDWCx3QkFBd0I7UUFDeEIsbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4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QUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFdEUsb0JBQW9CO1FBQ3BCLFdBQVc7UUFDWCxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN0RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDaEMsMEJBQTBCO1FBQzFCLE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRW5ELDJDQUEyQztRQUMzQyxnQkFBZ0I7UUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUV2RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUzRSw4Q0FBOEM7UUFDOUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLDJDQUEyQztRQUMzQyxxQkFBcUI7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUzRSx5Q0FBeUM7UUFDekMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QywyQ0FBMkM7UUFDM0MsdUNBQXVDO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQ0FBQyxXQUFXO1FBQ3RGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLENBQUMsV0FBVztRQUN0RixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUUxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25GLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtEQUFrRCxFQUFFLEdBQUcsRUFBRTtRQUM3RCxNQUFNLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUMsV0FBVztRQUNYLHdCQUF3QjtRQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXRFLHNCQUFzQjtRQUN0QiwrQ0FBK0M7UUFDL0MsK0NBQStDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM1RSxNQUFNLENBQUMsV0FB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Q0FBQyxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqRixtQ0FBbUM7UUFDbkMsK0NBQStDO1FBQy9DLCtDQUErQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FB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QUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBRXZFLG1CQUFtQjtRQUNuQixJQUFJLFlBQVksR0FBRyxXQUFXLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxD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LFVBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFckMsVUFBVSxHQUFHLFdBQVcsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFckMsVUFBVSxHQUFHLFdBQVcsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVwQyxVQUFVLEdBQUcsV0FBVyxDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXBDLFVBQVUsR0FBRyxXQUFXLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFcEMsVUFBVSxHQUFHLFdBQVcsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFckMsVUFBVSxHQUFHLFdBQVcsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFckMsVUFBVSxHQUFHLFdBQVcsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFckMsVUFBVSxHQUFHLFdBQVcsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxJQUFJLENB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QUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUV0RixrREFBa0Q7UUFDbEQsbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDM0MsdURBQXVEO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMs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RCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FB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RUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWhFLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFaEUsR0FBRyxHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JB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QUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakUsR0FBRyxHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxD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QyxDQUFBO1FBRW5ELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBRWxFLE1BQU0sQ0FBQyxHQUFHLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFFbEUsTUFBTSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFFbEUsTUFBTSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxLQUFLO1FBRW5FLE1BQU0sQ0FBQyxHQUFHLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsS0FBSztRQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLEtBQUs7UUFFbkUsTUFBTSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsS0FBSztRQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLEtBQUs7SUFDcEUsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9
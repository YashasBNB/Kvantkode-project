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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNMYXlvdXQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi92aWV3TGF5b3V0L2xpbmVzTGF5b3V0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUV6RixLQUFLLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBQzdDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsU0FBUyxnQkFBZ0IsQ0FDeEIsV0FBd0IsRUFDeEIsZUFBdUIsRUFDdkIsT0FBZSxFQUNmLFVBQWtCLEVBQ2xCLFFBQWdCO1FBRWhCLElBQUksRUFBVSxDQUFBO1FBQ2QsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDekMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMvRSxDQUFDLENBQUMsQ0FBQTtRQUNGLE9BQU8sRUFBRyxDQUFBO0lBQ1gsQ0FBQztJQUVELFNBQVMsbUJBQW1CLENBQzNCLFdBQXdCLEVBQ3hCLEVBQVUsRUFDVixrQkFBMEIsRUFDMUIsU0FBaUI7UUFFakIsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDekMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNoRSxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxTQUFTLGdCQUFnQixDQUFDLFdBQXdCLEVBQUUsRUFBVTtRQUM3RCxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUN6QyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsMEJBQTBCO1FBQzFCLE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpELDJDQUEyQztRQUMzQyxnQkFBZ0I7UUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUV0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUzRSw4Q0FBOEM7UUFDOUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLDJDQUEyQztRQUMzQyxxQkFBcUI7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUU3RSx5Q0FBeUM7UUFDekMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QywyQ0FBMkM7UUFDM0MsdUNBQXVDO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQ0FBQyxXQUFXO1FBQ3RGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLENBQUMsV0FBVztRQUN0RixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUUxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQix1RUFBdUU7UUFDdkUsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRW5ELFdBQVc7UUFDWCx1QkFBdUI7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUV0RSwyQkFBMkI7UUFDM0IsV0FBVztRQUNYLHdCQUF3QjtRQUN4QixtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXRFLDZCQUE2QjtRQUM3QixXQUFXO1FBQ1gsd0JBQXdCO1FBQ3hCLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVB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QUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDdEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLDBCQUEwQjtRQUMxQixNQUFNLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVuRCwyQ0FBMkM7UUFDM0MsZ0JBQWdCO1FBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0UsOENBQThDO1FBQzlDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QywyQ0FBMkM7UUFDM0MscUJBQXFCO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0UseUNBQXlDO1FBQ3pDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekMsMkNBQTJDO1FBQzNDLHVDQUF1QztRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXJFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLENBQUMsV0FBVztRQUN0RixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQSxDQUFDLFdBQVc7UUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7UUFDN0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFDLFdBQVc7UUFDWCx3QkFBd0I7UUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUV0RSxzQkFBc0I7UUFDdEIsK0NBQStDO1FBQy9DLCtDQUErQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDN0UsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO1FBQ2xELE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUxQyxXQUFXO1FBQ1gsd0JBQXdCO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFdEUsbUNBQW1DO1FBQ25DLCtDQUErQztRQUMvQywrQ0FBK0M7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakYsbUNBQW1DO1FBQ25DLCtDQUErQztRQUMvQywrQ0FBK0M7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNuRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNwRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDL0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTNDLFdBQVc7UUFDWCx5QkFBeUI7UUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUMsRUFBRSxH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VyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUV2RSxtQkFBbUI7UUFDbkIsSUFBSSxZQUFZLEdBQUcsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGdDQUFnQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLDhCQUE4QixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLHNCQUFzQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRSxJQUFJLGNBQWMsR0FBRyxXQUFXLENBQUMseUJBQXlCLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFO1lBQ3RDO2dCQUNDLEVBQUUsRUFBRSxDQUFDO2dCQUNMLGVBQWUsRUFBRSxDQUFDO2dCQUNsQixjQUFjLEVBQUUsRUFBRTtnQkFDbEIsTUFBTSxFQUFFLEdBQUc7YUFDWDtTQUNELENBQUMsQ0FBQTtRQUVGLG1CQUFtQjtRQUNuQixZQUFZLEdBQUcsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGdDQUFnQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLDhCQUE4QixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLHNCQUFzQixFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdEUsY0FBYyxHQUFHLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUU7WUFDdEM7Z0JBQ0MsRUFBRSxFQUFFLENBQUM7Z0JBQ0wsZUFBZSxFQUFFLENBQUM7Z0JBQ2xCLGNBQWMsRUFBRSxFQUFFO2dCQUNsQixNQUFNLEVBQUUsR0FBRzthQUNYO1lBQ0Q7Z0JBQ0MsRUFBRSxFQUFFLENBQUM7Z0JBQ0wsZUFBZSxFQUFFLENBQUM7Z0JBQ2xCLGNBQWMsRUFBRSxHQUFHO2dCQUNuQixNQUFNLEVBQUUsRUFBRTthQUNWO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsbUJBQW1CO1FBQ25CLFlBQVksR0FBRyxXQUFXLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsOEJBQThCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUV0RSxtQkFBbUI7UUFDbkIsWUFBWSxHQUFHLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyw4QkFBOEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtRQUN0RCxNQUFNLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXBELElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVwQyxVQUFVLEdBQUcsV0FBVyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXBDLFVBQVUsR0FBRyxXQUFXLENBQUMsNkJBQTZCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJDLFVBQVUsR0FBRyxXQUFXLENBQUMsNkJBQTZCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJDLFVBQVUsR0FBRyxXQUFXLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJDLFVBQVUsR0FBRyxXQUFXLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFcEMsVUFBVSxHQUFHLFdBQVcsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVwQyxVQUFVLEdBQUcsV0FBVyxDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXBDLFVBQVUsR0FBRyxXQUFXLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJDLFVBQVUsR0FBRyxXQUFXLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJDLFVBQVUsR0FBRyxXQUFXLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJDLFVBQVUsR0FBRyxXQUFXLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDckMsQ0FBQyxDQUFD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O1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHlCQUF5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QUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtR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QVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWhFLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFaEUsR0FBRyxHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWhFLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWhFLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVoRSxHQUFHLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWhFLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqRSxHQUFHLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqRSxHQUFHLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpFLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakUsTUFB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V0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUVsRSxNQUFNLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBRWxFLE1BQU0sQ0FBQyxHQUFHLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBRWxFLE1BQU0sQ0FBQyxHQUFHLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsS0FBSztRQUVuRSxNQUFNLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLEtBQUs7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxLQUFLO1FBRW5FLE1BQU0sQ0FBQyxHQUFHLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLElBQUk7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxJQUFJO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsSUFBSTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLEtBQUs7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxLQUFLO0lBQ3BFLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==
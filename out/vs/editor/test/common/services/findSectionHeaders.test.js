/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { findSectionHeaders, } from '../../../common/services/findSectionHeaders.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
class TestSectionHeaderFinderTarget {
    constructor(lines) {
        this.lines = lines;
    }
    getLineCount() {
        return this.lines.length;
    }
    getLineContent(lineNumber) {
        return this.lines[lineNumber - 1];
    }
}
suite('FindSectionHeaders', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('finds simple section headers', () => {
        const model = new TestSectionHeaderFinderTarget([
            'regular line',
            'MARK: My Section',
            'another line',
            'MARK: Another Section',
            'last line',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: 'MARK:\\s*(?<label>.*)$',
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'My Section');
        assert.strictEqual(headers[0].range.startLineNumber, 2);
        assert.strictEqual(headers[0].range.endLineNumber, 2);
        assert.strictEqual(headers[1].text, 'Another Section');
        assert.strictEqual(headers[1].range.startLineNumber, 4);
        assert.strictEqual(headers[1].range.endLineNumber, 4);
    });
    test('finds section headers with separators', () => {
        const model = new TestSectionHeaderFinderTarget([
            'regular line',
            'MARK: -My Section',
            'another line',
            'MARK: - Another Section',
            'last line',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: 'MARK:\\s*(?<separator>-?)\\s*(?<label>.*)$',
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'My Section');
        assert.strictEqual(headers[0].hasSeparatorLine, true);
        assert.strictEqual(headers[1].text, 'Another Section');
        assert.strictEqual(headers[1].hasSeparatorLine, true);
    });
    test('finds multi-line section headers with separators', () => {
        const model = new TestSectionHeaderFinderTarget([
            'regular line',
            '// ==========',
            '// My Section',
            '// ==========',
            'code...',
            '// ==========',
            '// Another Section',
            '// ==========',
            'more code...',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$',
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'My Section');
        assert.strictEqual(headers[0].range.startLineNumber, 2);
        assert.strictEqual(headers[0].range.endLineNumber, 4);
        assert.strictEqual(headers[1].text, 'Another Section');
        assert.strictEqual(headers[1].range.startLineNumber, 6);
        assert.strictEqual(headers[1].range.endLineNumber, 8);
    });
    test('handles overlapping multi-line section headers correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1',
            '// ==========',
            '// ==========', // This line starts another header
            '// Section 2',
            '// ==========',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$',
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 1);
        assert.strictEqual(headers[0].range.endLineNumber, 3);
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[1].range.startLineNumber, 4);
        assert.strictEqual(headers[1].range.endLineNumber, 6);
    });
    test('section headers must be in comments when specified', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1', // This one is in a comment
            '// ==========',
            '==========', // This one isn't
            'Section 2',
            '==========',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^(?:\/\/ )?=+\\n^(?:\/\/ )?(?<label>[^\\n]+?)\\n^(?:\/\/ )?=+$',
        };
        // Both patterns match, but the second one should be filtered out by the token check
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers[0].shouldBeInComments, true);
    });
    test('handles section headers at chunk boundaries', () => {
        // Create enough lines to ensure we cross chunk boundaries
        const lines = [];
        for (let i = 0; i < 150; i++) {
            lines.push('line ' + i);
        }
        // Add headers near the chunk boundary (chunk size is 100)
        lines[97] = '// ==========';
        lines[98] = '// Section 1';
        lines[99] = '// ==========';
        lines[100] = '// ==========';
        lines[101] = '// Section 2';
        lines[102] = '// ==========';
        const model = new TestSectionHeaderFinderTarget(lines);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$',
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 98);
        assert.strictEqual(headers[0].range.endLineNumber, 100);
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[1].range.startLineNumber, 101);
        assert.strictEqual(headers[1].range.endLineNumber, 103);
    });
    test('correctly advances past matches without infinite loop', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1',
            '// ==========',
            'some code',
            '// ==========',
            '// Section 2',
            '// ==========',
            'more code',
            '// ==========',
            '// Section 3',
            '// ==========',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$',
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 3, 'Should find all three section headers');
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[2].text, 'Section 3');
    });
    test('handles consecutive section headers correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1',
            '// ==========',
            '// ==========', // This line is both the end of Section 1 and start of Section 2
            '// Section 2',
            '// ==========',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$',
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2, 'Should find both section headers');
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[1].text, 'Section 2');
    });
    test('handles nested separators correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==============',
            '// Major Section',
            '// ==============',
            '',
            '// ----------',
            '// Subsection',
            '// ----------',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ [-=]+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ [-=]+$',
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2, 'Should find both section headers');
        assert.strictEqual(headers[0].text, 'Major Section');
        assert.strictEqual(headers[1].text, 'Subsection');
    });
    test('handles section headers at chunk boundaries correctly', () => {
        const lines = [];
        // Fill up to near the chunk boundary (chunk size is 100)
        for (let i = 0; i < 97; i++) {
            lines.push(`line ${i}`);
        }
        // Add a section header that would cross the chunk boundary
        lines.push('// =========='); // line 97
        lines.push('// Section 1'); // line 98
        lines.push('// =========='); // line 99
        lines.push('// =========='); // line 100 (chunk boundary)
        lines.push('// Section 2'); // line 101
        lines.push('// =========='); // line 102
        // Add more content after
        for (let i = 103; i < 150; i++) {
            lines.push(`line ${i}`);
        }
        const model = new TestSectionHeaderFinderTarget(lines);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$',
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2, 'Should find both section headers across chunk boundary');
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 98);
        assert.strictEqual(headers[0].range.endLineNumber, 100);
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[1].range.startLineNumber, 101);
        assert.strictEqual(headers[1].range.endLineNumber, 103);
    });
    test('handles overlapping section headers without duplicates', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========', // Line 1
            '// Section 1', // Line 2 - This is part of first header
            '// ==========', // Line 3 - This is the end of first
            '// Section 2', // Line 4 - This is not a header
            '// ==========', // Line 5
            '// ==========', // Line 6 - Start of second header
            '// Section 3', // Line 7
            '// ===========', // Line 8
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$',
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 1);
        assert.strictEqual(headers[0].range.endLineNumber, 3);
        // assert.strictEqual(headers[1].text, 'Section 2');
        // assert.strictEqual(headers[1].range.startLineNumber, 3);
        // assert.strictEqual(headers[1].range.endLineNumber, 5);
        assert.strictEqual(headers[1].text, 'Section 3');
        assert.strictEqual(headers[1].range.startLineNumber, 6);
        assert.strictEqual(headers[1].range.endLineNumber, 8);
    });
    test('handles partially overlapping multiline section headers correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ================', // Line 1
            '// Major Section 1', // Line 2
            '// ================', // Line 3
            '// --------', // Line 4 - Start of subsection that overlaps with end of major section
            '// Subsection 1.1', // Line 5
            '// --------', // Line 6
            '// ================', // Line 7
            '// Major Section 2', // Line 8
            '// ================', // Line 9
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ [-=]+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ [-=]+$',
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 3);
        assert.strictEqual(headers[0].text, 'Major Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 1);
        assert.strictEqual(headers[0].range.endLineNumber, 3);
        assert.strictEqual(headers[1].text, 'Subsection 1.1');
        assert.strictEqual(headers[1].range.startLineNumber, 4);
        assert.strictEqual(headers[1].range.endLineNumber, 6);
        assert.strictEqual(headers[2].text, 'Major Section 2');
        assert.strictEqual(headers[2].range.startLineNumber, 7);
        assert.strictEqual(headers[2].range.endLineNumber, 9);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFNlY3Rpb25IZWFkZXJzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvZmluZFNlY3Rpb25IZWFkZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxFQUdOLGtCQUFrQixHQUNsQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE1BQU0sNkJBQTZCO0lBQ2xDLFlBQTZCLEtBQWU7UUFBZixVQUFLLEdBQUwsS0FBSyxDQUFVO0lBQUcsQ0FBQztJQUVoRCxZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQTtJQUN6QixDQUFDO0lBRUQsY0FBYyxDQUFDLFVBQWtCO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDekMsTUFBTSxLQUFLLEdBQUcsSUFBSSw2QkFBNkIsQ0FBQztZQUMvQyxjQUFjO1lBQ2Qsa0JBQWtCO1lBQ2xCLGNBQWM7WUFDZCx1QkFBdUI7WUFDdkIsV0FBVztTQUNYLENBQUMsQ0FBQTtRQUVGLE1BQU0sT0FBTyxHQUE2QjtZQUN6Qyx3QkFBd0IsRUFBRSxLQUFLO1lBQy9CLHNCQUFzQixFQUFFLElBQUk7WUFDNUIsc0JBQXNCLEVBQUUsd0JBQXdCO1NBQ2hELENBQUE7UUFFRCxNQUFNLE9BQU8sR0FB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
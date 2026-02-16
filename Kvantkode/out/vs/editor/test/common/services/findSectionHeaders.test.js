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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFNlY3Rpb25IZWFkZXJzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy9maW5kU2VjdGlvbkhlYWRlcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUNoQyxPQUFPLEVBR04sa0JBQWtCLEdBQ2xCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsTUFBTSw2QkFBNkI7SUFDbEMsWUFBNkIsS0FBZTtRQUFmLFVBQUssR0FBTCxLQUFLLENBQVU7SUFBRyxDQUFDO0lBRWhELFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFBO0lBQ3pCLENBQUM7SUFFRCxjQUFjLENBQUMsVUFBa0I7UUFDaEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN6QyxNQUFNLEtBQUssR0FBRyxJQUFJLDZCQUE2QixDQUFDO1lBQy9DLGNBQWM7WUFDZCxrQkFBa0I7WUFDbEIsY0FBYztZQUNkLHVCQUF1QjtZQUN2QixXQUFXO1NBQ1gsQ0FBQyxDQUFBO1FBRUYsTUFBTSxPQUFPLEdBQTZCO1lBQ3pDLHdCQUF3QixFQUFFLEtBQUs7WUFDL0Isc0JBQXNCLEVBQUUsSUFBSTtZQUM1QixzQkFBc0IsRUFBRSx3QkFBd0I7U0FDaEQs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
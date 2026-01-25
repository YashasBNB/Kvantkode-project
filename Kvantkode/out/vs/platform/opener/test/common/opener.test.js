/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { extractSelection, withSelection } from '../../common/opener.js';
suite('extractSelection', () => {
    test('extractSelection with only startLineNumber', async () => {
        const uri = URI.parse('file:///some/file.js#73');
        assert.deepStrictEqual(extractSelection(uri).selection, {
            startLineNumber: 73,
            startColumn: 1,
            endLineNumber: undefined,
            endColumn: undefined,
        });
    });
    test('extractSelection with only startLineNumber in L format', async () => {
        const uri = URI.parse('file:///some/file.js#L73');
        assert.deepStrictEqual(extractSelection(uri).selection, {
            startLineNumber: 73,
            startColumn: 1,
            endLineNumber: undefined,
            endColumn: undefined,
        });
    });
    test('extractSelection with startLineNumber and startColumn', async () => {
        const uri = URI.parse('file:///some/file.js#73,84');
        assert.deepStrictEqual(extractSelection(uri).selection, {
            startLineNumber: 73,
            startColumn: 84,
            endLineNumber: undefined,
            endColumn: undefined,
        });
    });
    test('extractSelection with startLineNumber and startColumn in L format', async () => {
        const uri = URI.parse('file:///some/file.js#L73,84');
        assert.deepStrictEqual(extractSelection(uri).selection, {
            startLineNumber: 73,
            startColumn: 84,
            endLineNumber: undefined,
            endColumn: undefined,
        });
    });
    test('extractSelection with range and no column number', async () => {
        const uri = URI.parse('file:///some/file.js#73-83');
        assert.deepStrictEqual(extractSelection(uri).selection, {
            startLineNumber: 73,
            startColumn: 1,
            endLineNumber: 83,
            endColumn: 1,
        });
    });
    test('extractSelection with range and no column number in L format', async () => {
        const uri = URI.parse('file:///some/file.js#L73-L83');
        assert.deepStrictEqual(extractSelection(uri).selection, {
            startLineNumber: 73,
            startColumn: 1,
            endLineNumber: 83,
            endColumn: 1,
        });
    });
    test('extractSelection with range and no column number in L format only for start', async () => {
        const uri = URI.parse('file:///some/file.js#L73-83');
        assert.deepStrictEqual(extractSelection(uri).selection, {
            startLineNumber: 73,
            startColumn: 1,
            endLineNumber: 83,
            endColumn: 1,
        });
    });
    test('extractSelection with range and no column number in L format only for end', async () => {
        const uri = URI.parse('file:///some/file.js#73-L83');
        assert.deepStrictEqual(extractSelection(uri).selection, {
            startLineNumber: 73,
            startColumn: 1,
            endLineNumber: 83,
            endColumn: 1,
        });
    });
    test('extractSelection with complete range', async () => {
        const uri = URI.parse('file:///some/file.js#73,84-83,52');
        assert.deepStrictEqual(extractSelection(uri).selection, {
            startLineNumber: 73,
            startColumn: 84,
            endLineNumber: 83,
            endColumn: 52,
        });
    });
    test('extractSelection with complete range in L format', async () => {
        const uri = URI.parse('file:///some/file.js#L73,84-L83,52');
        assert.deepStrictEqual(extractSelection(uri).selection, {
            startLineNumber: 73,
            startColumn: 84,
            endLineNumber: 83,
            endColumn: 52,
        });
    });
    test('withSelection with startLineNumber and startColumn', async () => {
        assert.deepStrictEqual(withSelection(URI.parse('file:///some/file.js'), {
            startLineNumber: 73,
            startColumn: 84,
        }).toString(), 'file:///some/file.js#73%2C84');
    });
    test('withSelection with startLineNumber, startColumn and endLineNumber', async () => {
        assert.deepStrictEqual(withSelection(URI.parse('file:///some/file.js'), {
            startLineNumber: 73,
            startColumn: 84,
            endLineNumber: 83,
        }).toString(), 'file:///some/file.js#73%2C84-83');
    });
    test('withSelection with startLineNumber, startColumn and endLineNumber, endColumn', async () => {
        assert.deepStrictEqual(withSelection(URI.parse('file:///some/file.js'), {
            startLineNumber: 73,
            startColumn: 84,
            endLineNumber: 83,
            endColumn: 52,
        }).toString(), 'file:///some/file.js#73%2C84-83%2C52');
    });
    test('extractSelection returns original withSelection URI', async () => {
        let uri = URI.parse('file:///some/file.js');
        const uriWithSelection = withSelection(URI.parse('file:///some/file.js'), {
            startLineNumber: 73,
            startColumn: 84,
            endLineNumber: 83,
            endColumn: 52,
        });
        assert.strictEqual(uri.toString(), extractSelection(uriWithSelection).uri.toString());
        uri = URI.parse('file:///some/file.js');
        assert.strictEqual(uri.toString(), extractSelection(uri).uri.toString());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL29wZW5lci90ZXN0L2NvbW1vbi9vcGVuZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUV4RSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3RCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUU7WUFDdkQsZUFBZSxFQUFFLEVBQUU7WUFDbkIsV0FBVyxFQUFFLENBQUM7WUFDZCxhQUFhLEVBQUUsU0FBUztZQUN4QixTQUFTLEVBQUUsU0FBUztTQUNwQixDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3REFBd0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RSxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUU7WUFDdkQsZUFBZSxFQUFFLEVBQUU7WUFDbkIsV0FBVyxFQUFFLENBQUM7WUFDZCxhQUFhLEVBQUUsU0FBUztZQUN4QixTQUFTLEVBQUUsU0FBUztTQUNw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
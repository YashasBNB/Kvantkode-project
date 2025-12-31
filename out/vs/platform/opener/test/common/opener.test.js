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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9vcGVuZXIvdGVzdC9jb21tb24vb3BlbmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFeEUsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5QixJQUFJLENBQUMsNENBQTRDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0QsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFO1lBQ3ZELGVBQWUsRUFBRSxFQUFFO1lBQ25CLFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLFNBQVM7WUFDeEIsU0FBUyxFQUFFLFNBQVM7U0FDcEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0RBQXdELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekUsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFO1lBQ3ZELGVBQWUsRUFBRSxFQUFFO1lBQ25CLFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLFNBQVM7WUFDeEIsU0FBUyxFQUFFLFNBQVM7U0FDcEIsQ0FB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
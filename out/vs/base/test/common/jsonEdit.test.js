/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { removeProperty, setProperty } from '../../common/jsonEdit.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('JSON - edits', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertEdit(content, edits, expected) {
        assert(edits);
        let lastEditOffset = content.length;
        for (let i = edits.length - 1; i >= 0; i--) {
            const edit = edits[i];
            assert(edit.offset >= 0 && edit.length >= 0 && edit.offset + edit.length <= content.length);
            assert(typeof edit.content === 'string');
            assert(lastEditOffset >= edit.offset + edit.length); // make sure all edits are ordered
            lastEditOffset = edit.offset;
            content =
                content.substring(0, edit.offset) +
                    edit.content +
                    content.substring(edit.offset + edit.length);
        }
        assert.strictEqual(content, expected);
    }
    const formatterOptions = {
        insertSpaces: true,
        tabSize: 2,
        eol: '\n',
    };
    test('set property', () => {
        let content = '{\n  "x": "y"\n}';
        let edits = setProperty(content, ['x'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": "bar"\n}');
        content = 'true';
        edits = setProperty(content, [], 'bar', formatterOptions);
        assertEdit(content, edits, '"bar"');
        content = '{\n  "x": "y"\n}';
        edits = setProperty(content, ['x'], { key: true }, formatterOptions);
        assertEdit(content, edits, '{\n  "x": {\n    "key": true\n  }\n}');
        content = '{\n  "a": "b",  "x": "y"\n}';
        edits = setProperty(content, ['a'], null, formatterOptions);
        assertEdit(content, edits, '{\n  "a": null,  "x": "y"\n}');
    });
    test('insert property', () => {
        let content = '{}';
        let edits = setProperty(content, ['foo'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "foo": "bar"\n}');
        edits = setProperty(content, ['foo', 'foo2'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "foo": {\n    "foo2": "bar"\n  }\n}');
        content = '{\n}';
        edits = setProperty(content, ['foo'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "foo": "bar"\n}');
        content = '  {\n  }';
        edits = setProperty(content, ['foo'], 'bar', formatterOptions);
        assertEdit(content, edits, '  {\n    "foo": "bar"\n  }');
        content = '{\n  "x": "y"\n}';
        edits = setProperty(content, ['foo'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": "y",\n  "foo": "bar"\n}');
        content = '{\n  "x": "y"\n}';
        edits = setProperty(content, ['e'], 'null', formatterOptions);
        assertEdit(content, edits, '{\n  "x": "y",\n  "e": "null"\n}');
        edits = setProperty(content, ['x'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": "bar"\n}');
        content = '{\n  "x": {\n    "a": 1,\n    "b": true\n  }\n}\n';
        edits = setProperty(content, ['x'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": "bar"\n}\n');
        edits = setProperty(content, ['x', 'b'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "b": "bar"\n  }\n}\n');
        edits = setProperty(content, ['x', 'c'], 'bar', formatterOptions, () => 0);
        assertEdit(content, edits, '{\n  "x": {\n    "c": "bar",\n    "a": 1,\n    "b": true\n  }\n}\n');
        edits = setProperty(content, ['x', 'c'], 'bar', formatterOptions, () => 1);
        assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "c": "bar",\n    "b": true\n  }\n}\n');
        edits = setProperty(content, ['x', 'c'], 'bar', formatterOptions, () => 2);
        assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "b": true,\n    "c": "bar"\n  }\n}\n');
        edits = setProperty(content, ['c'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "b": true\n  },\n  "c": "bar"\n}\n');
        content = '{\n  "a": [\n    {\n    } \n  ]  \n}';
        edits = setProperty(content, ['foo'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "a": [\n    {\n    } \n  ],\n  "foo": "bar"\n}');
        content = '';
        edits = setProperty(content, ['foo', 0], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "foo": [\n    "bar"\n  ]\n}');
        content = '//comment';
        edits = setProperty(content, ['foo', 0], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "foo": [\n    "bar"\n  ]\n} //comment');
    });
    test('remove property', () => {
        let content = '{\n  "x": "y"\n}';
        let edits = removeProperty(content, ['x'], formatterOptions);
        assertEdit(content, edits, '{\n}');
        content = '{\n  "x": "y", "a": []\n}';
        edits = removeProperty(content, ['x'], formatterOptions);
        assertEdit(content, edits, '{\n  "a": []\n}');
        content = '{\n  "x": "y", "a": []\n}';
        edits = removeProperty(content, ['a'], formatterOptions);
        assertEdit(content, edits, '{\n  "x": "y"\n}');
    });
    test('insert item at 0', () => {
        const content = '[\n  2,\n  3\n]';
        const edits = setProperty(content, [0], 1, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  2,\n  3\n]');
    });
    test('insert item at 0 in empty array', () => {
        const content = '[\n]';
        const edits = setProperty(content, [0], 1, formatterOptions);
        assertEdit(content, edits, '[\n  1\n]');
    });
    test('insert item at an index', () => {
        const content = '[\n  1,\n  3\n]';
        const edits = setProperty(content, [1], 2, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  2,\n  3\n]');
    });
    test('insert item at an index im empty array', () => {
        const content = '[\n]';
        const edits = setProperty(content, [1], 1, formatterOptions);
        assertEdit(content, edits, '[\n  1\n]');
    });
    test('insert item at end index', () => {
        const content = '[\n  1,\n  2\n]';
        const edits = setProperty(content, [2], 3, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  2,\n  3\n]');
    });
    test('insert item at end to empty array', () => {
        const content = '[\n]';
        const edits = setProperty(content, [-1], 'bar', formatterOptions);
        assertEdit(content, edits, '[\n  "bar"\n]');
    });
    test('insert item at end', () => {
        const content = '[\n  1,\n  2\n]';
        const edits = setProperty(content, [-1], 'bar', formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  2,\n  "bar"\n]');
    });
    test('remove item in array with one item', () => {
        const content = '[\n  1\n]';
        const edits = setProperty(content, [0], undefined, formatterOptions);
        assertEdit(content, edits, '[]');
    });
    test('remove item in the middle of the array', () => {
        const content = '[\n  1,\n  2,\n  3\n]';
        const edits = setProperty(content, [1], undefined, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  3\n]');
    });
    test('remove last item in the array', () => {
        const content = '[\n  1,\n  2,\n  "bar"\n]';
        const edits = setProperty(content, [2], undefined, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  2\n]');
    });
    test('remove last item in the array if ends with comma', () => {
        const content = '[\n  1,\n  "foo",\n  "bar",\n]';
        const edits = setProperty(content, [2], undefined, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  "foo"\n]');
    });
    test('remove last item in the array if there is a comment in the beginning', () => {
        const content = '// This is a comment\n[\n  1,\n  "foo",\n  "bar"\n]';
        const edits = setProperty(content, [2], undefined, formatterOptions);
        assertEdit(content, edits, '// This is a comment\n[\n  1,\n  "foo"\n]');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVkaXQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9qc29uRWRpdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXRFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsVUFBVSxDQUFDLE9BQWUsRUFBRSxLQUFhLEVBQUUsUUFBZ0I7UUFDbkUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2IsSUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQTtRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM1QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckIsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDM0YsTUFBTSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUMsQ0FBQTtZQUN4QyxNQUFNLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcs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
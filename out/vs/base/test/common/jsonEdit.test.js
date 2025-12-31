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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVkaXQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vanNvbkVkaXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEUsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLFVBQVUsQ0FBQyxPQUFlLEVBQUUsS0FBYSxFQUFFLFFBQWdCO1FBQ25FLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNiLElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7UUFDbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3JCLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzNGLE1BQU0sQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssUUFBUSxDQUFDLENBQUE7WUFDeEMsTUFBTSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { EditorWorker } from '../../../common/services/editorWebWorker.js';
suite('EditorWebWorker', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class WorkerWithModels extends EditorWorker {
        getModel(uri) {
            return this._getModel(uri);
        }
        addModel(lines, eol = '\n') {
            const uri = 'test:file#' + Date.now();
            this.$acceptNewModel({
                url: uri,
                versionId: 1,
                lines: lines,
                EOL: eol,
            });
            return this._getModel(uri);
        }
    }
    let worker;
    let model;
    setup(() => {
        worker = new WorkerWithModels();
        model = worker.addModel([
            'This is line one', //16
            'and this is line number two', //27
            'it is followed by #3', //20
            'and finished with the fourth.', //29
        ]);
    });
    function assertPositionAt(offset, line, column) {
        const position = model.positionAt(offset);
        assert.strictEqual(position.lineNumber, line);
        assert.strictEqual(position.column, column);
    }
    function assertOffsetAt(lineNumber, column, offset) {
        const actual = model.offsetAt({ lineNumber, column });
        assert.strictEqual(actual, offset);
    }
    test('ICommonModel#offsetAt', () => {
        assertOffsetAt(1, 1, 0);
        assertOffsetAt(1, 2, 1);
        assertOffsetAt(1, 17, 16);
        assertOffsetAt(2, 1, 17);
        assertOffsetAt(2, 4, 20);
        assertOffsetAt(3, 1, 45);
        assertOffsetAt(5, 30, 95);
        assertOffsetAt(5, 31, 95);
        assertOffsetAt(5, Number.MAX_VALUE, 95);
        assertOffsetAt(6, 30, 95);
        assertOffsetAt(Number.MAX_VALUE, 30, 95);
        assertOffsetAt(Number.MAX_VALUE, Number.MAX_VALUE, 95);
    });
    test('ICommonModel#positionAt', () => {
        assertPositionAt(0, 1, 1);
        assertPositionAt(Number.MIN_VALUE, 1, 1);
        assertPositionAt(1, 1, 2);
        assertPositionAt(16, 1, 17);
        assertPositionAt(17, 2, 1);
        assertPositionAt(20, 2, 4);
        assertPositionAt(45, 3, 1);
        assertPositionAt(95, 4, 30);
        assertPositionAt(96, 4, 30);
        assertPositionAt(99, 4, 30);
        assertPositionAt(Number.MAX_VALUE, 4, 30);
    });
    test('ICommonModel#validatePosition, issue #15882', function () {
        const model = worker.addModel([
            '{"id": "0001","type": "donut","name": "Cake","image":{"url": "images/0001.jpg","width": 200,"height": 200},"thumbnail":{"url": "images/thumbnails/0001.jpg","width": 32,"height": 32}}',
        ]);
        assert.strictEqual(model.offsetAt({ lineNumber: 1, column: 2 }), 1);
    });
    test('MoreMinimal', () => {
        return worker
            .$computeMoreMinimalEdits(model.uri.toString(), [{ text: 'This is line One', range: new Range(1, 1, 1, 17) }], false)
            .then((edits) => {
            assert.strictEqual(edits.length, 1);
            const [first] = edits;
            assert.strictEqual(first.text, 'O');
            assert.deepStrictEqual(first.range, {
                startLineNumber: 1,
                startColumn: 14,
                endLineNumber: 1,
                endColumn: 15,
            });
        });
    });
    test('MoreMinimal, merge adjacent edits', async function () {
        const model = worker.addModel(['one', 'two', 'three', 'four', 'five'], '\n');
        const newEdits = await worker.$computeMoreMinimalEdits(model.uri.toString(), [
            {
                range: new Range(1, 1, 2, 1),
                text: 'one\ntwo\nthree\n',
            },
            {
                range: new Range(2, 1, 3, 1),
                text: '',
            },
            {
                range: new Range(3, 1, 4, 1),
                text: '',
            },
            {
                range: new Range(4, 2, 4, 3),
                text: '4',
            },
            {
                range: new Range(5, 3, 5, 5),
                text: '5',
            },
        ], false);
        assert.strictEqual(newEdits.length, 2);
        assert.strictEqual(newEdits[0].text, '4');
        assert.strictEqual(newEdits[1].text, '5');
    });
    test('MoreMinimal, issue #15385 newline changes only', function () {
        const model = worker.addModel(['{', '\t"a":1', '}'], '\n');
        return worker
            .$computeMoreMinimalEdits(model.uri.toString(), [{ text: '{\r\n\t"a":1\r\n}', range: new Range(1, 1, 3, 2) }], false)
            .then((edits) => {
            assert.strictEqual(edits.length, 0);
        });
    });
    test('MoreMinimal, issue #15385 newline changes and other', function () {
        const model = worker.addModel(['{', '\t"a":1', '}'], '\n');
        return worker
            .$computeMoreMinimalEdits(model.uri.toString(), [{ text: '{\r\n\t"b":1\r\n}', range: new Range(1, 1, 3, 2) }], false)
            .then((edits) => {
            assert.strictEqual(edits.length, 1);
            const [first] = edits;
            assert.strictEqual(first.text, 'b');
            assert.deepStrictEqual(first.range, {
                startLineNumber: 2,
                startColumn: 3,
                endLineNumber: 2,
                endColumn: 4,
            });
        });
    });
    test('MoreMinimal, issue #15385 newline changes and other 2/2', function () {
        const model = worker.addModel([
            'package main', // 1
            'func foo() {', // 2
            '}', // 3
        ]);
        return worker
            .$computeMoreMinimalEdits(model.uri.toString(), [{ text: '\n', range: new Range(3, 2, 4, 1000) }], false)
            .then((edits) => {
            assert.strictEqual(edits.length, 1);
            const [first] = edits;
            assert.strictEqual(first.text, '\n');
            assert.deepStrictEqual(first.range, {
                startLineNumber: 3,
                startColumn: 2,
                endLineNumber: 3,
                endColumn: 2,
            });
        });
    });
    async function testEdits(lines, edits) {
        const model = worker.addModel(lines);
        const smallerEdits = await worker.$computeHumanReadableDiff(model.uri.toString(), edits, {
            ignoreTrimWhitespace: false,
            maxComputationTimeMs: 0,
            computeMoves: false,
        });
        const t1 = applyEdits(model.getValue(), edits);
        const t2 = applyEdits(model.getValue(), smallerEdits);
        assert.deepStrictEqual(t1, t2);
        return smallerEdits.map((e) => ({ range: Range.lift(e.range).toString(), text: e.text }));
    }
    test('computeHumanReadableDiff 1', async () => {
        assert.deepStrictEqual(await testEdits(['function test() {}'], [
            {
                text: '\n/** Some Comment */\n',
                range: new Range(1, 1, 1, 1),
            },
        ]), [{ range: '[1,1 -> 1,1]', text: '\n/** Some Comment */\n' }]);
    });
    test('computeHumanReadableDiff 2', async () => {
        assert.deepStrictEqual(await testEdits(['function test() {}'], [
            {
                text: 'function test(myParam: number) { console.log(myParam); }',
                range: new Range(1, 1, 1, Number.MAX_SAFE_INTEGER),
            },
        ]), [
            { range: '[1,15 -> 1,15]', text: 'myParam: number' },
            { range: '[1,18 -> 1,18]', text: ' console.log(myParam); ' },
        ]);
    });
    test('computeHumanReadableDiff 3', async () => {
        assert.deepStrictEqual(await testEdits(['', '', '', ''], [
            {
                text: 'function test(myParam: number) { console.log(myParam); }\n\n',
                range: new Range(2, 1, 3, 20),
            },
        ]), [
            {
                range: '[2,1 -> 2,1]',
                text: 'function test(myParam: number) { console.log(myParam); }\n',
            },
        ]);
    });
    test('computeHumanReadableDiff 4', async () => {
        assert.deepStrictEqual(await testEdits(['function algorithm() {}'], [
            {
                text: 'function alm() {}',
                range: new Range(1, 1, 1, Number.MAX_SAFE_INTEGER),
            },
        ]), [{ range: '[1,10 -> 1,19]', text: 'alm' }]);
    });
    test('[Bug] Getting Message "Overlapping ranges are not allowed" and nothing happens with Inline-Chat ', async function () {
        await testEdits("const API = require('../src/api');\n\ndescribe('API', () => {\n  let api;\n  let database;\n\n  beforeAll(() => {\n    database = {\n      getAllBooks: jest.fn(),\n      getBooksByAuthor: jest.fn(),\n      getBooksByTitle: jest.fn(),\n    };\n    api = new API(database);\n  });\n\n  describe('GET /books', () => {\n    it('should return all books', async () => {\n      const mockBooks = [{ title: 'Book 1' }, { title: 'Book 2' }];\n      database.getAllBooks.mockResolvedValue(mockBooks);\n\n      const req = {};\n      const res = {\n        json: jest.fn(),\n      };\n\n      await api.register({\n        get: (path, handler) => {\n          if (path === '/books') {\n            handler(req, res);\n          }\n        },\n      });\n\n      expect(database.getAllBooks).toHaveBeenCalled();\n      expect(res.json).toHaveBeenCalledWith(mockBooks);\n    });\n  });\n\n  describe('GET /books/author/:author', () => {\n    it('should return books by author', async () => {\n      const mockAuthor = 'John Doe';\n      const mockBooks = [{ title: 'Book 1', author: mockAuthor }, { title: 'Book 2', author: mockAuthor }];\n      database.getBooksByAuthor.mockResolvedValue(mockBooks);\n\n      const req = {\n        params: {\n          author: mockAuthor,\n        },\n      };\n      const res = {\n        json: jest.fn(),\n      };\n\n      await api.register({\n        get: (path, handler) => {\n          if (path === `/books/author/${mockAuthor}`) {\n            handler(req, res);\n          }\n        },\n      });\n\n      expect(database.getBooksByAuthor).toHaveBeenCalledWith(mockAuthor);\n      expect(res.json).toHaveBeenCalledWith(mockBooks);\n    });\n  });\n\n  describe('GET /books/title/:title', () => {\n    it('should return books by title', async () => {\n      const mockTitle = 'Book 1';\n      const mockBooks = [{ title: mockTitle, author: 'John Doe' }];\n      database.getBooksByTitle.mockResolvedValue(mockBooks);\n\n      const req = {\n        params: {\n          title: mockTitle,\n        },\n      };\n      const res = {\n        json: jest.fn(),\n      };\n\n      await api.register({\n        get: (path, handler) => {\n          if (path === `/books/title/${mockTitle}`) {\n            handler(req, res);\n          }\n        },\n      });\n\n      expect(database.getBooksByTitle).toHaveBeenCalledWith(mockTitle);\n      expect(res.json).toHaveBeenCalledWith(mockBooks);\n    });\n  });\n});\n".split('\n'), [
            {
                range: { startLineNumber: 1, startColumn: 1, endLineNumber: 96, endColumn: 1 },
                text: `const request = require('supertest');\nconst API = require('../src/api');\n\ndescribe('API', () => {\n  let api;\n  let database;\n\n  beforeAll(() => {\n    database = {\n      getAllBooks: jest.fn(),\n      getBooksByAuthor: jest.fn(),\n      getBooksByTitle: jest.fn(),\n    };\n    api = new API(database);\n  });\n\n  describe('GET /books', () => {\n    it('should return all books', async () => {\n      const mockBooks = [{ title: 'Book 1' }, { title: 'Book 2' }];\n      database.getAllBooks.mockResolvedValue(mockBooks);\n\n      const response = await request(api.app).get('/books');\n\n      expect(database.getAllBooks).toHaveBeenCalled();\n      expect(response.status).toBe(200);\n      expect(response.body).toEqual(mockBooks);\n    });\n  });\n\n  describe('GET /books/author/:author', () => {\n    it('should return books by author', async () => {\n      const mockAuthor = 'John Doe';\n      const mockBooks = [{ title: 'Book 1', author: mockAuthor }, { title: 'Book 2', author: mockAuthor }];\n      database.getBooksByAuthor.mockResolvedValue(mockBooks);\n\n      const response = await request(api.app).get(\`/books/author/\${mockAuthor}\`);\n\n      expect(database.getBooksByAuthor).toHaveBeenCalledWith(mockAuthor);\n      expect(response.status).toBe(200);\n      expect(response.body).toEqual(mockBooks);\n    });\n  });\n\n  describe('GET /books/title/:title', () => {\n    it('should return books by title', async () => {\n      const mockTitle = 'Book 1';\n      const mockBooks = [{ title: mockTitle, author: 'John Doe' }];\n      database.getBooksByTitle.mockResolvedValue(mockBooks);\n\n      const response = await request(api.app).get(\`/books/title/\${mockTitle}\`);\n\n      expect(database.getBooksByTitle).toHaveBeenCalledWith(mockTitle);\n      expect(response.status).toBe(200);\n      expect(response.body).toEqual(mockBooks);\n    });\n  });\n});\n`,
            },
        ]);
    });
    test('ICommonModel#getValueInRange, issue #17424', function () {
        const model = worker.addModel([
            'package main', // 1
            'func foo() {', // 2
            '}', // 3
        ]);
        const value = model.getValueInRange({
            startLineNumber: 3,
            startColumn: 1,
            endLineNumber: 4,
            endColumn: 1,
        });
        assert.strictEqual(value, '}');
    });
    test('textualSuggest, issue #17785', function () {
        const model = worker.addModel([
            'foobar', // 1
            'f f', // 2
        ]);
        return worker.$textualSuggest([model.uri.toString()], 'f', '[a-z]+', 'img').then((result) => {
            if (!result) {
                assert.ok(false);
            }
            assert.strictEqual(result.words.length, 1);
            assert.strictEqual(typeof result.duration, 'number');
            assert.strictEqual(result.words[0], 'foobar');
        });
    });
    test('get words via iterator, issue #46930', function () {
        const model = worker.addModel([
            'one line', // 1
            'two line', // 2
            '',
            'past empty',
            'single',
            '',
            'and now we are done',
        ]);
        const words = [...model.words(/[a-z]+/gim)];
        assert.deepStrictEqual(words, [
            'one',
            'line',
            'two',
            'line',
            'past',
            'empty',
            'single',
            'and',
            'now',
            'we',
            'are',
            'done',
        ]);
    });
});
function applyEdits(text, edits) {
    const transformer = new PositionOffsetTransformer(text);
    const offsetEdits = edits.map((e) => {
        const range = Range.lift(e.range);
        return {
            startOffset: transformer.getOffset(range.getStartPosition()),
            endOffset: transformer.getOffset(range.getEndPosition()),
            text: e.text,
        };
    });
    offsetEdits.sort((a, b) => b.startOffset - a.startOffset);
    for (const edit of offsetEdits) {
        text = text.substring(0, edit.startOffset) + edit.text + text.substring(edit.endOffset);
    }
    return text;
}
class PositionOffsetTransformer {
    constructor(text) {
        this.text = text;
        this.lineStartOffsetByLineIdx = [];
        this.lineStartOffsetByLineIdx.push(0);
        for (let i = 0; i < text.length; i++) {
            if (text.charAt(i) === '\n') {
                this.lineStartOffsetByLineIdx.push(i + 1);
            }
        }
        this.lineStartOffsetByLineIdx.push(text.length + 1);
    }
    getOffset(position) {
        const maxLineOffset = position.lineNumber >= this.lineStartOffsetByLineIdx.length
            ? this.text.length
            : this.lineStartOffsetByLineIdx[position.lineNumber] - 1;
        return Math.min(this.lineStartOffsetByLineIdx[position.lineNumber - 1] + position.column - 1, maxLineOffset);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV2ViV29ya2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvZWRpdG9yV2ViV29ya2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHMUUsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sZ0JBQWlCLFNBQVEsWUFBWTtRQUMxQyxRQUFRLENBQUMsR0FBVztZQUNuQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0IsQ0FBQztRQUVELFFBQVEsQ0FBQyxLQUFlLEVBQUUsTUFBYyxJQUFJO1lBQzNDLE1BQU0sR0FBRyxHQUFHLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDckMsSUFBSSxDQUFDLGVBQWUsQ0FBQztnQkFDcEIsR0FBRyxFQUFFLEdBQUc7Z0JBQ1IsU0FBUyxFQUFFLENBQUM7Z0JBQ1osS0FBSyxFQUFFLEtBQUs7Z0JBQ1osR0FBRyxFQUFFLEdBQUc7YUFDUixDQUFDLENBQUE7WUFDRixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFFLENBQUE7UUFDNUIsQ0FBQztLQUNEO0lBRUQsSUFBSSxNQUF3QixDQUFBO0lBQzVCLElBQUksS0FBbUIsQ0FBQTtJQUV2QixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxH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
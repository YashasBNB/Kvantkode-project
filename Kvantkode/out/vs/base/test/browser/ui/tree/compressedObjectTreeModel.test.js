/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { compress, CompressedObjectTreeModel, decompress, } from '../../../../browser/ui/tree/compressedObjectTreeModel.js';
import { Iterable } from '../../../../common/iterator.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
function resolve(treeElement) {
    const result = { element: treeElement.element };
    const children = Array.from(Iterable.from(treeElement.children), resolve);
    if (treeElement.incompressible) {
        result.incompressible = true;
    }
    if (children.length > 0) {
        result.children = children;
    }
    return result;
}
suite('CompressedObjectTree', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('compress & decompress', function () {
        test('small', function () {
            const decompressed = { element: 1 };
            const compressed = {
                element: { elements: [1], incompressible: false },
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('no compression', function () {
            const decompressed = {
                element: 1,
                children: [{ element: 11 }, { element: 12 }, { element: 13 }],
            };
            const compressed = {
                element: { elements: [1], incompressible: false },
                children: [
                    { element: { elements: [11], incompressible: false } },
                    { element: { elements: [12], incompressible: false } },
                    { element: { elements: [13], incompressible: false } },
                ],
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('single hierarchy', function () {
            const decompressed = {
                element: 1,
                children: [
                    {
                        element: 11,
                        children: [
                            {
                                element: 111,
                                children: [{ element: 1111 }],
                            },
                        ],
                    },
                ],
            };
            const compressed = {
                element: { elements: [1, 11, 111, 1111], incompressible: false },
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('deep compression', function () {
            const decompressed = {
                element: 1,
                children: [
                    {
                        element: 11,
                        children: [
                            {
                                element: 111,
                                children: [
                                    { element: 1111 },
                                    { element: 1112 },
                                    { element: 1113 },
                                    { element: 1114 },
                                ],
                            },
                        ],
                    },
                ],
            };
            const compressed = {
                element: { elements: [1, 11, 111], incompressible: false },
                children: [
                    { element: { elements: [1111], incompressible: false } },
                    { element: { elements: [1112], incompressible: false } },
                    { element: { elements: [1113], incompressible: false } },
                    { element: { elements: [1114], incompressible: false } },
                ],
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('double deep compression', function () {
            const decompressed = {
                element: 1,
                children: [
                    {
                        element: 11,
                        children: [
                            {
                                element: 111,
                                children: [{ element: 1112 }, { element: 1113 }],
                            },
                        ],
                    },
                    {
                        element: 12,
                        children: [
                            {
                                element: 121,
                                children: [{ element: 1212 }, { element: 1213 }],
                            },
                        ],
                    },
                ],
            };
            const compressed = {
                element: { elements: [1], incompressible: false },
                children: [
                    {
                        element: { elements: [11, 111], incompressible: false },
                        children: [
                            { element: { elements: [1112], incompressible: false } },
                            { element: { elements: [1113], incompressible: false } },
                        ],
                    },
                    {
                        element: { elements: [12, 121], incompressible: false },
                        children: [
                            { element: { elements: [1212], incompressible: false } },
                            { element: { elements: [1213], incompressible: false } },
                        ],
                    },
                ],
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('incompressible leaf', function () {
            const decompressed = {
                element: 1,
                children: [
                    {
                        element: 11,
                        children: [
                            {
                                element: 111,
                                children: [{ element: 1111, incompressible: true }],
                            },
                        ],
                    },
                ],
            };
            const compressed = {
                element: { elements: [1, 11, 111], incompressible: false },
                children: [{ element: { elements: [1111], incompressible: true } }],
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('incompressible branch', function () {
            const decompressed = {
                element: 1,
                children: [
                    {
                        element: 11,
                        children: [
                            {
                                element: 111,
                                incompressible: true,
                                children: [{ element: 1111 }],
                            },
                        ],
                    },
                ],
            };
            const compressed = {
                element: { elements: [1, 11], incompressible: false },
                children: [{ element: { elements: [111, 1111], incompressible: true } }],
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('incompressible chain', function () {
            const decompressed = {
                element: 1,
                children: [
                    {
                        element: 11,
                        children: [
                            {
                                element: 111,
                                incompressible: true,
                                children: [{ element: 1111, incompressible: true }],
                            },
                        ],
                    },
                ],
            };
            const compressed = {
                element: { elements: [1, 11], incompressible: false },
                children: [
                    {
                        element: { elements: [111], incompressible: true },
                        children: [{ element: { elements: [1111], incompressible: true } }],
                    },
                ],
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('incompressible tree', function () {
            const decompressed = {
                element: 1,
                children: [
                    {
                        element: 11,
                        incompressible: true,
                        children: [
                            {
                                element: 111,
                                incompressible: true,
                                children: [{ element: 1111, incompressible: true }],
                            },
                        ],
                    },
                ],
            };
            const compressed = {
                element: { elements: [1], incompressible: false },
                children: [
                    {
                        element: { elements: [11], incompressible: true },
                        children: [
                            {
                                element: { elements: [111], incompressible: true },
                                children: [{ element: { elements: [1111], incompressible: true } }],
                            },
                        ],
                    },
                ],
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
    });
    function bindListToModel(list, model) {
        return model.onDidSpliceRenderedNodes(({ start, deleteCount, elements }) => {
            list.splice(start, deleteCount, ...elements);
        });
    }
    function toArray(list) {
        return list.map((i) => i.element.elements);
    }
    suite('CompressedObjectTreeModel', function () {
        /**
         * Calls that test function twice, once with an empty options and
         * once with `diffIdentityProvider`.
         */
        function withSmartSplice(fn) {
            fn({});
            fn({ diffIdentityProvider: { getId: (n) => String(n) } });
        }
        test('ctor', () => {
            const model = new CompressedObjectTreeModel('test');
            assert(model);
            assert.strictEqual(model.size, 0);
        });
        test('flat', () => withSmartSplice((options) => {
            const list = [];
            const model = new CompressedObjectTreeModel('test');
            const disposable = bindListToModel(list, model);
            model.setChildren(null, [{ element: 0 }, { element: 1 }, { element: 2 }], options);
            assert.deepStrictEqual(toArray(list), [[0], [1], [2]]);
            assert.strictEqual(model.size, 3);
            model.setChildren(null, [{ element: 3 }, { element: 4 }, { element: 5 }], options);
            assert.deepStrictEqual(toArray(list), [[3], [4], [5]]);
            assert.strictEqual(model.size, 3);
            model.setChildren(null, [], options);
            assert.deepStrictEqual(toArray(list), []);
            assert.strictEqual(model.size, 0);
            disposable.dispose();
        }));
        test('nested', () => withSmartSplice((options) => {
            const list = [];
            const model = new CompressedObjectTreeModel('test');
            const disposable = bindListToModel(list, model);
            model.setChildren(null, [
                {
                    element: 0,
                    children: [{ element: 10 }, { element: 11 }, { element: 12 }],
                },
                { element: 1 },
                { element: 2 },
            ], options);
            assert.deepStrictEqual(toArray(list), [[0], [10], [11], [12], [1], [2]]);
            assert.strictEqual(model.size, 6);
            model.setChildren(12, [{ element: 120 }, { element: 121 }], options);
            assert.deepStrictEqual(toArray(list), [[0], [10], [11], [12], [120], [121], [1], [2]]);
            assert.strictEqual(model.size, 8);
            model.setChildren(0, [], options);
            assert.deepStrictEqual(toArray(list), [[0], [1], [2]]);
            assert.strictEqual(model.size, 3);
            model.setChildren(null, [], options);
            assert.deepStrictEqual(toArray(list), []);
            assert.strictEqual(model.size, 0);
            disposable.dispose();
        }));
        test('compressed', () => withSmartSplice((options) => {
            const list = [];
            const model = new CompressedObjectTreeModel('test');
            const disposable = bindListToModel(list, model);
            model.setChildren(null, [
                {
                    element: 1,
                    children: [
                        {
                            element: 11,
                            children: [
                                {
                                    element: 111,
                                    children: [{ element: 1111 }, { element: 1112 }, { element: 1113 }],
                                },
                            ],
                        },
                    ],
                },
            ], options);
            assert.deepStrictEqual(toArray(list), [[1, 11, 111], [1111], [1112], [1113]]);
            assert.strictEqual(model.size, 6);
            model.setChildren(11, [{ element: 111 }, { element: 112 }, { element: 113 }], options);
            assert.deepStrictEqual(toArray(list), [[1, 11], [111], [112], [113]]);
            assert.strictEqual(model.size, 5);
            model.setChildren(113, [{ element: 1131 }], options);
            assert.deepStrictEqual(toArray(list), [[1, 11], [111], [112], [113, 1131]]);
            assert.strictEqual(model.size, 6);
            model.setChildren(1131, [{ element: 1132 }], options);
            assert.deepStrictEqual(toArray(list), [[1, 11], [111], [112], [113, 1131, 1132]]);
            assert.strictEqual(model.size, 7);
            model.setChildren(1131, [{ element: 1132 }, { element: 1133 }], options);
            assert.deepStrictEqual(toArray(list), [[1, 11], [111], [112], [113, 1131], [1132], [1133]]);
            assert.strictEqual(model.size, 8);
            disposable.dispose();
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHJlc3NlZE9iamVjdFRyZWVNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci91aS90cmVlL2NvbXByZXNzZWRPYmplY3RUcmVlTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLFFBQVEsRUFDUix5QkFBeUIsRUFDekIsVUFBVSxHQUdWLE1BQU0sMERBQTBELENBQUE7QUFHakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBUWxGLFNBQVMsT0FBTyxDQUFJLFdBQXNDO0lBQ3pELE1BQU0sTUFBTSxHQUFRLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNwRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBRXpFLElBQUksV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFBO0lBQzdCLENBQUM7SUFFRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDekIsTUFBTSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7SUFDM0IsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQUVELEtBQUssQ0FBQyxzQkFBc0IsRUFBRTtJQUM3Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyx1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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHJlc3NlZE9iamVjdFRyZWVNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvdWkvdHJlZS9jb21wcmVzc2VkT2JqZWN0VHJlZU1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTixRQUFRLEVBQ1IseUJBQXlCLEVBQ3pCLFVBQVUsR0FHVixNQUFNLDBEQUEwRCxDQUFBO0FBR2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQVFsRixTQUFTLE9BQU8sQ0FBSSxXQUFzQztJQUN6RCxNQUFNLE1BQU0sR0FBUSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDcEQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUV6RSxJQUFJLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNoQyxNQUFNLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQTtJQUM3QixDQUFDO0lBRUQsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO0lBQzNCLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxLQUFLLENBQUMsc0JBQXNCLEVBQUU7SUFDN0IsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsdUJBQXVCLEVBQUU7UUFDOUIsSUFBSSxD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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { IndexTreeModel, } from '../../../../browser/ui/tree/indexTreeModel.js';
import { timeout } from '../../../../common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
import { DisposableStore } from '../../../../common/lifecycle.js';
function bindListToModel(list, model) {
    return model.onDidSpliceRenderedNodes(({ start, deleteCount, elements }) => {
        list.splice(start, deleteCount, ...elements);
    });
}
function toArray(list) {
    return list.map((i) => i.element);
}
function toElements(node) {
    return node.children?.length
        ? { e: node.element, children: node.children.map(toElements) }
        : node.element;
}
const diffIdentityProvider = { getId: (n) => String(n) };
/**
 * Calls that test function twice, once with an empty options and
 * once with `diffIdentityProvider`.
 */
function withSmartSplice(fn) {
    fn({});
    fn({ diffIdentityProvider });
}
suite('IndexTreeModel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('ctor', () => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        assert(model);
        assert.strictEqual(list.length, 0);
    });
    test('insert', () => withSmartSplice((options) => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [{ element: 0 }, { element: 1 }, { element: 2 }], options);
        assert.deepStrictEqual(list.length, 3);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 1);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 1);
        assert.deepStrictEqual(list[2].element, 2);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 1);
        disposable.dispose();
    }));
    test('deep insert', () => withSmartSplice((options) => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0,
                children: [{ element: 10 }, { element: 11 }, { element: 12 }],
            },
            { element: 1 },
            { element: 2 },
        ]);
        assert.deepStrictEqual(list.length, 6);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 2);
        assert.deepStrictEqual(list[2].element, 11);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 2);
        assert.deepStrictEqual(list[3].element, 12);
        assert.deepStrictEqual(list[3].collapsed, false);
        assert.deepStrictEqual(list[3].depth, 2);
        assert.deepStrictEqual(list[4].element, 1);
        assert.deepStrictEqual(list[4].collapsed, false);
        assert.deepStrictEqual(list[4].depth, 1);
        assert.deepStrictEqual(list[5].element, 2);
        assert.deepStrictEqual(list[5].collapsed, false);
        assert.deepStrictEqual(list[5].depth, 1);
        disposable.dispose();
    }));
    test('deep insert collapsed', () => withSmartSplice((options) => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0,
                collapsed: true,
                children: [{ element: 10 }, { element: 11 }, { element: 12 }],
            },
            { element: 1 },
            { element: 2 },
        ], options);
        assert.deepStrictEqual(list.length, 3);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, true);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 1);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 1);
        assert.deepStrictEqual(list[2].element, 2);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 1);
        disposable.dispose();
    }));
    test('delete', () => withSmartSplice((options) => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [{ element: 0 }, { element: 1 }, { element: 2 }], options);
        assert.deepStrictEqual(list.length, 3);
        model.splice([1], 1, undefined, options);
        assert.deepStrictEqual(list.length, 2);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 2);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 1);
        model.splice([0], 2, undefined, options);
        assert.deepStrictEqual(list.length, 0);
        disposable.dispose();
    }));
    test('nested delete', () => withSmartSplice((options) => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0,
                children: [{ element: 10 }, { element: 11 }, { element: 12 }],
            },
            { element: 1 },
            { element: 2 },
        ], options);
        assert.deepStrictEqual(list.length, 6);
        model.splice([1], 2, undefined, options);
        assert.deepStrictEqual(list.length, 4);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 2);
        assert.deepStrictEqual(list[2].element, 11);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 2);
        assert.deepStrictEqual(list[3].element, 12);
        assert.deepStrictEqual(list[3].collapsed, false);
        assert.deepStrictEqual(list[3].depth, 2);
        disposable.dispose();
    }));
    test('deep delete', () => withSmartSplice((options) => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0,
                children: [{ element: 10 }, { element: 11 }, { element: 12 }],
            },
            { element: 1 },
            { element: 2 },
        ], options);
        assert.deepStrictEqual(list.length, 6);
        model.splice([0], 1, undefined, options);
        assert.deepStrictEqual(list.length, 2);
        assert.deepStrictEqual(list[0].element, 1);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 2);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 1);
        disposable.dispose();
    }));
    test('smart splice deep', () => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [{ element: 0 }, { element: 1 }, { element: 2 }, { element: 3 }], {
            diffIdentityProvider,
        });
        assert.deepStrictEqual(list.filter((l) => l.depth === 1).map(toElements), [0, 1, 2, 3]);
        model.splice([0], 3, [
            { element: -0.5 },
            { element: 0, children: [{ element: 0.1 }] },
            { element: 1 },
            {
                element: 2,
                children: [{ element: 2.1 }, { element: 2.2, children: [{ element: 2.21 }] }],
            },
        ], { diffIdentityProvider, diffDepth: Infinity });
        assert.deepStrictEqual(list.filter((l) => l.depth === 1).map(toElements), [
            -0.5,
            { e: 0, children: [0.1] },
            1,
            { e: 2, children: [2.1, { e: 2.2, children: [2.21] }] },
            3,
        ]);
        disposable.dispose();
    });
    test('hidden delete', () => withSmartSplice((options) => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0,
                collapsed: true,
                children: [{ element: 10 }, { element: 11 }, { element: 12 }],
            },
            { element: 1 },
            { element: 2 },
        ], options);
        assert.deepStrictEqual(list.length, 3);
        model.splice([0, 1], 1, undefined, options);
        assert.deepStrictEqual(list.length, 3);
        model.splice([0, 0], 2, undefined, options);
        assert.deepStrictEqual(list.length, 3);
        disposable.dispose();
    }));
    test('collapse', () => withSmartSplice((options) => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0,
                children: [{ element: 10 }, { element: 11 }, { element: 12 }],
            },
            { element: 1 },
            { element: 2 },
        ], options);
        assert.deepStrictEqual(list.length, 6);
        model.setCollapsed([0], true);
        assert.deepStrictEqual(list.length, 3);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, true);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 1);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 1);
        assert.deepStrictEqual(list[2].element, 2);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 1);
        disposable.dispose();
    }));
    test('expand', () => withSmartSplice((options) => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0,
                collapsed: true,
                children: [{ element: 10 }, { element: 11 }, { element: 12 }],
            },
            { element: 1 },
            { element: 2 },
        ], options);
        assert.deepStrictEqual(list.length, 3);
        model.expandTo([0, 1]);
        assert.deepStrictEqual(list.length, 6);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 2);
        assert.deepStrictEqual(list[2].element, 11);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 2);
        assert.deepStrictEqual(list[3].element, 12);
        assert.deepStrictEqual(list[3].collapsed, false);
        assert.deepStrictEqual(list[3].depth, 2);
        assert.deepStrictEqual(list[4].element, 1);
        assert.deepStrictEqual(list[4].collapsed, false);
        assert.deepStrictEqual(list[4].depth, 1);
        assert.deepStrictEqual(list[5].element, 2);
        assert.deepStrictEqual(list[5].collapsed, false);
        assert.deepStrictEqual(list[5].depth, 1);
        disposable.dispose();
    }));
    test('smart diff consistency', () => {
        const times = 500;
        const minEdits = 1;
        const maxEdits = 10;
        const maxInserts = 5;
        for (let i = 0; i < times; i++) {
            const list = [];
            const options = { diffIdentityProvider: { getId: (n) => String(n) } };
            const model = new IndexTreeModel('test', -1);
            const disposable = bindListToModel(list, model);
            const changes = [];
            const expected = [];
            let elementCounter = 0;
            for (let edits = Math.random() * (maxEdits - minEdits) + minEdits; edits > 0; edits--) {
                const spliceIndex = Math.floor(Math.random() * list.length);
                const deleteCount = Math.ceil(Math.random() * (list.length - spliceIndex));
                const insertCount = Math.floor(Math.random() * maxInserts + 1);
                const inserts = [];
                for (let i = 0; i < insertCount; i++) {
                    const element = elementCounter++;
                    inserts.push({ element, children: [] });
                }
                // move existing items
                if (Math.random() < 0.5) {
                    const elements = list.slice(spliceIndex, spliceIndex + Math.floor(deleteCount / 2));
                    inserts.push(...elements.map(({ element }) => ({ element, children: [] })));
                }
                model.splice([spliceIndex], deleteCount, inserts, options);
                expected.splice(spliceIndex, deleteCount, ...inserts.map((i) => i.element));
                const listElements = list.map((l) => l.element);
                changes.push(`splice(${spliceIndex}, ${deleteCount}, [${inserts.map((e) => e.element).join(', ')}]) -> ${listElements.join(', ')}`);
                assert.deepStrictEqual(expected, listElements, `Expected ${listElements.join(', ')} to equal ${expected.join(', ')}. Steps:\n\n${changes.join('\n')}`);
            }
            disposable.dispose();
        }
    });
    test('collapse should recursively adjust visible count', () => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 1,
                children: [
                    {
                        element: 11,
                        children: [{ element: 111 }],
                    },
                ],
            },
            {
                element: 2,
                children: [{ element: 21 }],
            },
        ]);
        assert.deepStrictEqual(list.length, 5);
        assert.deepStrictEqual(toArray(list), [1, 11, 111, 2, 21]);
        model.setCollapsed([0, 0], true);
        assert.deepStrictEqual(list.length, 4);
        assert.deepStrictEqual(toArray(list), [1, 11, 2, 21]);
        model.setCollapsed([1], true);
        assert.deepStrictEqual(list.length, 3);
        assert.deepStrictEqual(toArray(list), [1, 11, 2]);
        disposable.dispose();
    });
    test('setCollapsible', () => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0,
                children: [{ element: 10 }],
            },
        ]);
        assert.deepStrictEqual(list.length, 2);
        model.setCollapsible([0], false);
        assert.deepStrictEqual(list.length, 2);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, false);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsible, false);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(model.setCollapsed([0], true), false);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, false);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsible, false);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(model.setCollapsed([0], false), false);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, false);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsible, false);
        assert.deepStrictEqual(list[1].collapsed, false);
        model.setCollapsible([0], true);
        assert.deepStrictEqual(list.length, 2);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, true);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsible, false);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(model.setCollapsed([0], true), true);
        assert.deepStrictEqual(list.length, 1);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, true);
        assert.deepStrictEqual(list[0].collapsed, true);
        assert.deepStrictEqual(model.setCollapsed([0], false), true);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, true);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsible, false);
        assert.deepStrictEqual(list[1].collapsed, false);
        disposable.dispose();
    });
    test('simple filter', () => {
        const list = [];
        const filter = new (class {
            filter(element) {
                return element % 2 === 0 ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
            }
        })();
        const model = new IndexTreeModel('test', -1, { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0,
                children: [
                    { element: 1 },
                    { element: 2 },
                    { element: 3 },
                    { element: 4 },
                    { element: 5 },
                    { element: 6 },
                    { element: 7 },
                ],
            },
        ]);
        assert.deepStrictEqual(list.length, 4);
        assert.deepStrictEqual(toArray(list), [0, 2, 4, 6]);
        model.setCollapsed([0], true);
        assert.deepStrictEqual(toArray(list), [0]);
        model.setCollapsed([0], false);
        assert.deepStrictEqual(toArray(list), [0, 2, 4, 6]);
        disposable.dispose();
    });
    test('recursive filter on initial model', () => {
        const list = [];
        const filter = new (class {
            filter(element) {
                return element === 0 ? 2 /* TreeVisibility.Recurse */ : 0 /* TreeVisibility.Hidden */;
            }
        })();
        const model = new IndexTreeModel('test', -1, { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0,
                children: [{ element: 1 }, { element: 2 }],
            },
        ]);
        assert.deepStrictEqual(toArray(list), []);
        disposable.dispose();
    });
    test('refilter', () => {
        const list = [];
        let shouldFilter = false;
        const filter = new (class {
            filter(element) {
                return !shouldFilter || element % 2 === 0 ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
            }
        })();
        const model = new IndexTreeModel('test', -1, { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0,
                children: [
                    { element: 1 },
                    { element: 2 },
                    { element: 3 },
                    { element: 4 },
                    { element: 5 },
                    { element: 6 },
                    { element: 7 },
                ],
            },
        ]);
        assert.deepStrictEqual(toArray(list), [0, 1, 2, 3, 4, 5, 6, 7]);
        model.refilter();
        assert.deepStrictEqual(toArray(list), [0, 1, 2, 3, 4, 5, 6, 7]);
        shouldFilter = true;
        model.refilter();
        assert.deepStrictEqual(toArray(list), [0, 2, 4, 6]);
        shouldFilter = false;
        model.refilter();
        assert.deepStrictEqual(toArray(list), [0, 1, 2, 3, 4, 5, 6, 7]);
        disposable.dispose();
    });
    test('recursive filter', () => {
        const list = [];
        let query = new RegExp('');
        const filter = new (class {
            filter(element) {
                return query.test(element) ? 1 /* TreeVisibility.Visible */ : 2 /* TreeVisibility.Recurse */;
            }
        })();
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 'vscode',
                children: [
                    { element: '.build' },
                    { element: 'git' },
                    {
                        element: 'github',
                        children: [
                            { element: 'calendar.yml' },
                            { element: 'endgame' },
                            { element: 'build.js' },
                        ],
                    },
                    {
                        element: 'build',
                        children: [{ element: 'lib' }, { element: 'gulpfile.js' }],
                    },
                ],
            },
        ]);
        assert.deepStrictEqual(list.length, 10);
        query = /build/;
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['vscode', '.build', 'github', 'build.js', 'build']);
        model.setCollapsed([0], true);
        assert.deepStrictEqual(toArray(list), ['vscode']);
        model.setCollapsed([0], false);
        assert.deepStrictEqual(toArray(list), ['vscode', '.build', 'github', 'build.js', 'build']);
        disposable.dispose();
    });
    test('recursive filter updates when children change (#133272)', async () => {
        const list = [];
        let query = '';
        const filter = new (class {
            filter(element) {
                return element.includes(query) ? 1 /* TreeVisibility.Visible */ : 2 /* TreeVisibility.Recurse */;
            }
        })();
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 'a',
                children: [{ element: 'b' }],
            },
        ]);
        assert.deepStrictEqual(toArray(list), ['a', 'b']);
        query = 'visible';
        model.refilter();
        assert.deepStrictEqual(toArray(list), []);
        model.splice([0, 0, 0], 0, [
            {
                element: 'visible',
                children: [],
            },
        ]);
        await timeout(0); // wait for refilter microtask
        assert.deepStrictEqual(toArray(list), ['a', 'b', 'visible']);
        disposable.dispose();
    });
    test('recursive filter with collapse', () => {
        const list = [];
        let query = new RegExp('');
        const filter = new (class {
            filter(element) {
                return query.test(element) ? 1 /* TreeVisibility.Visible */ : 2 /* TreeVisibility.Recurse */;
            }
        })();
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 'vscode',
                children: [
                    { element: '.build' },
                    { element: 'git' },
                    {
                        element: 'github',
                        children: [
                            { element: 'calendar.yml' },
                            { element: 'endgame' },
                            { element: 'build.js' },
                        ],
                    },
                    {
                        element: 'build',
                        children: [{ element: 'lib' }, { element: 'gulpfile.js' }],
                    },
                ],
            },
        ]);
        assert.deepStrictEqual(list.length, 10);
        query = /gulp/;
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['vscode', 'build', 'gulpfile.js']);
        model.setCollapsed([0, 3], true);
        assert.deepStrictEqual(toArray(list), ['vscode', 'build']);
        model.setCollapsed([0], true);
        assert.deepStrictEqual(toArray(list), ['vscode']);
        disposable.dispose();
    });
    test('recursive filter while collapsed', () => {
        const list = [];
        let query = new RegExp('');
        const filter = new (class {
            filter(element) {
                return query.test(element) ? 1 /* TreeVisibility.Visible */ : 2 /* TreeVisibility.Recurse */;
            }
        })();
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 'vscode',
                collapsed: true,
                children: [
                    { element: '.build' },
                    { element: 'git' },
                    {
                        element: 'github',
                        children: [
                            { element: 'calendar.yml' },
                            { element: 'endgame' },
                            { element: 'build.js' },
                        ],
                    },
                    {
                        element: 'build',
                        children: [{ element: 'lib' }, { element: 'gulpfile.js' }],
                    },
                ],
            },
        ]);
        assert.deepStrictEqual(toArray(list), ['vscode']);
        query = /gulp/;
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['vscode']);
        model.setCollapsed([0], false);
        assert.deepStrictEqual(toArray(list), ['vscode', 'build', 'gulpfile.js']);
        model.setCollapsed([0], true);
        assert.deepStrictEqual(toArray(list), ['vscode']);
        query = new RegExp('');
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['vscode']);
        model.setCollapsed([0], false);
        assert.deepStrictEqual(list.length, 10);
        disposable.dispose();
    });
    suite('getNodeLocation', () => {
        test('simple', () => {
            const list = [];
            const model = new IndexTreeModel('test', -1);
            const disposable = bindListToModel(list, model);
            model.splice([0], 0, [
                {
                    element: 0,
                    children: [{ element: 10 }, { element: 11 }, { element: 12 }],
                },
                { element: 1 },
                { element: 2 },
            ]);
            assert.deepStrictEqual(model.getNodeLocation(list[0]), [0]);
            assert.deepStrictEqual(model.getNodeLocation(list[1]), [0, 0]);
            assert.deepStrictEqual(model.getNodeLocation(list[2]), [0, 1]);
            assert.deepStrictEqual(model.getNodeLocation(list[3]), [0, 2]);
            assert.deepStrictEqual(model.getNodeLocation(list[4]), [1]);
            assert.deepStrictEqual(model.getNodeLocation(list[5]), [2]);
            disposable.dispose();
        });
        test('with filter', () => {
            const list = [];
            const filter = new (class {
                filter(element) {
                    return element % 2 === 0 ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
                }
            })();
            const model = new IndexTreeModel('test', -1, { filter });
            const disposable = bindListToModel(list, model);
            model.splice([0], 0, [
                {
                    element: 0,
                    children: [
                        { element: 1 },
                        { element: 2 },
                        { element: 3 },
                        { element: 4 },
                        { element: 5 },
                        { element: 6 },
                        { element: 7 },
                    ],
                },
            ]);
            assert.deepStrictEqual(model.getNodeLocation(list[0]), [0]);
            assert.deepStrictEqual(model.getNodeLocation(list[1]), [0, 1]);
            assert.deepStrictEqual(model.getNodeLocation(list[2]), [0, 3]);
            assert.deepStrictEqual(model.getNodeLocation(list[3]), [0, 5]);
            disposable.dispose();
        });
    });
    test('refilter with filtered out nodes', () => {
        const list = [];
        let query = new RegExp('');
        const filter = new (class {
            filter(element) {
                return query.test(element);
            }
        })();
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [{ element: 'silver' }, { element: 'gold' }, { element: 'platinum' }]);
        assert.deepStrictEqual(toArray(list), ['silver', 'gold', 'platinum']);
        query = /platinum/;
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['platinum']);
        model.splice([0], Number.POSITIVE_INFINITY, [
            { element: 'silver' },
            { element: 'gold' },
            { element: 'platinum' },
        ]);
        assert.deepStrictEqual(toArray(list), ['platinum']);
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['platinum']);
        disposable.dispose();
    });
    test('explicit hidden nodes should have renderNodeCount == 0, issue #83211', () => {
        const list = [];
        let query = new RegExp('');
        const filter = new (class {
            filter(element) {
                return query.test(element);
            }
        })();
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            { element: 'a', children: [{ element: 'aa' }] },
            { element: 'b', children: [{ element: 'bb' }] },
        ]);
        assert.deepStrictEqual(toArray(list), ['a', 'aa', 'b', 'bb']);
        assert.deepStrictEqual(model.getListIndex([0]), 0);
        assert.deepStrictEqual(model.getListIndex([0, 0]), 1);
        assert.deepStrictEqual(model.getListIndex([1]), 2);
        assert.deepStrictEqual(model.getListIndex([1, 0]), 3);
        query = /b/;
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['b', 'bb']);
        assert.deepStrictEqual(model.getListIndex([0]), -1);
        assert.deepStrictEqual(model.getListIndex([0, 0]), -1);
        assert.deepStrictEqual(model.getListIndex([1]), 0);
        assert.deepStrictEqual(model.getListIndex([1, 0]), 1);
        disposable.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhUcmVlTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvdWkvdHJlZS9pbmRleFRyZWVNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBR04sY0FBYyxHQUNkLE1BQU0sK0NBQStDLENBQUE7QUFPdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUU5RSxTQUFTLGVBQWUsQ0FBSSxJQUFvQixFQUFFLEtBQXdCO0lBQ3pFLE9BQU8sS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUU7UUFDMUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUE7SUFDN0MsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsU0FBUyxPQUFPLENBQUksSUFBb0I7SUFDdkMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDbEMsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFJLElBQWtCO0lBQ3hDLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNO1FBQzNCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUM5RCxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQTtBQUNoQixDQUFDO0FBRUQsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7QUFFaEU7OztHQUdHO0FBQ0gsU0FBUyxlQUFlLENBQUMsRUFBZ0U7SUFDeEYsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ04sRUFBRSxDQUFDLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO0FBQzdCLENBQUM7QUFFRCxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBQzVCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDakIsTUFBTSxJQUFJLEdBQXdCLEVBQUUsQ0FBQTtRQUNwQyxNQUFNLEtBQUssR0FBRyxJQUFJLGNBQWMsQ0FBUyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDYixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUNuQixlQUFlLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUMzQixNQUFNLElBQUksR0FBd0IsRUFBRSxDQUFBO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUFTLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFL0MsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFL0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUUsQ0FDeEIsZUFBZSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDM0IsTUFBTSxJQUFJLEdBQXdCLEVBQUUsQ0FBQTtRQUNwQyxNQUFNLEtBQUssR0FBRyxJQUFJLGNBQWMsQ0FBUyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRS9DLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDcEI7Z0JBQ0MsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsUUFBUSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUM7YUFDN0Q7WUFDRCxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7WUFDZCxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7U0FDZCxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFD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QUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRS9DLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRS9FLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV0QyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFeEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXRDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUUsQ0FDMUIsZUFBZSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDM0IsTUFBTSxJQUFJLEdBQXdCLEVBQUUsQ0FBQTtRQUNwQyxNQUFNLEtBQUssR0FBRyxJQUFJLGNBQWMsQ0FBUyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRS9DLEtBQUssQ0FBQyxNQUFNLENBQ1gsQ0FBQyxDQUFDLENBQUMsRUFDSCxDQUFDLEVBQ0Q7WUFDQztnQkFDQyxPQUFPLEVBQUUsQ0FBQztnQkFDVixRQUFRLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQzthQUM3RDtZQUNELEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtZQUNkLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtTQUNkLEVBQ0QsT0FBTyxDQUNQLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUUsQ0FDeEIsZUFBZSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDM0IsTUFBTSxJQUFJLEdBQXdCLEVBQUUsQ0FBQTtRQUNwQyxNQUFNLEtBQUssR0FBRyxJQUFJLGNBQWMsQ0FBUyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRS9DLEtBQUssQ0FBQyxNQUFNLENBQ1gsQ0FBQyxDQUFDLENBQUMsRUFDSCxDQUFDLEVBQ0Q7WUFDQztnQkFDQyxPQUFPLEVBQUUsQ0FBQztnQkFDVixRQUFRLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQzthQUM3RDtZQUNELEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtZQUNkLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtTQUNkLEVBQ0QsT0FBTyxDQUNQLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLElBQUksR0FBd0IsRUFBRSxDQUFBO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUFTLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFL0MsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdEYsb0JBQW9CO1NBQ3BCLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXZGLEtBQUssQ0FBQyxNQUFNLENBQ1gsQ0FBQyxDQUFDLENBQUMsRUFDSCxDQUFDLEVBQ0Q7WUFDQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRTtZQUNqQixFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtZQUM1QyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7WUFDZDtnQkFDQyxPQUFPLEVBQUUsQ0FBQztnQkFDVixRQUFRLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO2FBQzdFO1NBQ0QsRUFDRCxFQUFFLG9CQUFvQixFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FDN0MsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDekUsQ0FBQyxHQUFHO1lBQ0osRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3pCLENBQUM7WUFDRCxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdkQsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNyQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFLENBQzFCLGVBQWUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQzNCLE1BQU0sSUFBSSxHQUF3QixFQUFFLENBQUE7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQVMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUvQyxLQUFLLENBQUMsTUFBTSxDQUNYLENBQUMsQ0FBQyxDQUFDLEVBQ0gsQ0FBQyxFQUNEO1lBQ0M7Z0JBQ0MsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsUUFBUSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUM7YUFDN0Q7WUFDRCxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7WUFDZCxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7U0FDZCxFQUNELE9BQU8sQ0FDUCxDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXRDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV0QyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQ3JCLGVBQWUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQzNCLE1BQU0sSUFBSSxHQUF3QixFQUFFLENBQUE7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQVMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUvQyxLQUFLLENBQUMsTUFBTSxDQUNYLENBQUMsQ0FBQyxDQUFDLEVBQ0gsQ0FBQyxFQUNEO1lBQ0M7Z0JBQ0MsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsUUFBUSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUM7YUFDN0Q7WUFDRCxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7WUFDZCxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7U0FDZCxFQUNELE9BQU8sQ0FDUCxDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXRDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFeEMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUNuQixlQUFlLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUMzQixNQUFNLElBQUksR0FBd0IsRUFBRSxDQUFBO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUFTLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFL0MsS0FBSyxDQUFDLE1BQU0sQ0FDWCxDQUFDLENBQUMsQ0FBQyxFQUNILENBQUMsRUFDRDtZQUNDO2dCQUNDLE9BQU8sRUFBRSxDQUFDO2dCQUNWLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFFBQVEsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDO2FBQzdEO1lBQ0QsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO1lBQ2QsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO1NBQ2QsRUFDRCxPQUFPLENBQ1AsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV0QyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhDLFVBQVUsQ0FBQyxPQUFPLEVBQUUs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LENBQUE7UUFFaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFaEQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVoRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFaEQsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3JCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGVBQWUsRUFB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Q0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVyRCxLQUFLLEdBQUcsR0FBRyxDQUFBO1FBQ1gsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ2hCLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVyRCxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDckIsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9
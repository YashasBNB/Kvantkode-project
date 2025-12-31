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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhUcmVlTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL3VpL3RyZWUvaW5kZXhUcmVlTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUdOLGNBQWMsR0FDZCxNQUFNLCtDQUErQyxDQUFBO0FBT3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0saUNBQWlDLENBQUE7QUFFOUUsU0FBUyxlQUFlLENBQUksSUFBb0IsRUFBRSxLQUF3QjtJQUN6RSxPQUFPLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFO1FBQzFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxDQUFBO0lBQzdDLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFJLElBQW9CO0lBQ3ZDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBQ2xDLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBSSxJQUFrQjtJQUN4QyxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTTtRQUMzQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDOUQsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUE7QUFDaEIsQ0FBQztBQUVELE1BQU0sb0JBQW9CLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO0FBRWhFOzs7R0FHRztBQUNILFNBQVMsZUFBZSxDQUFDLEVBQWdFO0lBQ3hGLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNOLEVBQUUsQ0FBQyxFQUFFLG9CQUFvQixFQUFFLENBQUMsQ0FBQTtBQUM3QixDQUFDO0FBRUQsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM1Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFDekMsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQ2pCLE1BQU0sSUFBSSxHQUF3QixFQUFFLENBQUE7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQVMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FDbkIsZUFBZSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDM0IsTUFBTSxJQUFJLEdBQXdCLEVBQUUsQ0FBQTtRQUNwQyxNQUFNLEtBQUssR0FBRyxJQUFJLGNBQWMsQ0FBUyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRS9DLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRS9FLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV4QyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFLENBQ3hCLGVBQWUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQzNCLE1BQU0sSUFBSSxHQUF3QixFQUFFLENBQUE7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQVMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUvQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCO2dCQUNDLE9BQU8sRUFBRSxDQUFDO2dCQUNWLFFBQVEsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDO2FBQzdEO1lBQ0QsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO1lBQ2QsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO1NBQ2QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFB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QUFVLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUvQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUUvRSxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV0QyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFLENBQzFCLGVBQWUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQzNCLE1BQU0sSUFBSSxHQUF3QixFQUFFLENBQUE7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQVMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUvQyxLQUFLLENBQUMsTUFBTSxDQUNYLENBQUMsQ0FBQyxDQUFDLEVBQ0gsQ0FBQyxFQUNEO1lBQ0M7Z0JBQ0MsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsUUFBUSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUM7YUFDN0Q7WUFDRCxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7WUFDZCxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7U0FDZCxFQUNELE9BQU8sQ0FDUCxDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXRDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV4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VixTQUFTLEVBQUUsSUFBSTtnQkFDZixRQUFRLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQzthQUM3RDtZQUNELEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtZQUNkLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtTQUNkLEVBQ0QsT0FBTyxDQUNQLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RCLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV4QyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7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O1FBRWhELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWhELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWhELEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRS9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWhELFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNyQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FB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
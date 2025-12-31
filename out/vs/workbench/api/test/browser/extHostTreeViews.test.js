/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { Emitter } from '../../../../base/common/event.js';
import { ExtHostTreeViews } from '../../common/extHostTreeViews.js';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { MainContext, } from '../../common/extHost.protocol.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { nullExtensionDescription as extensionsDescription } from '../../../services/extensions/common/extensions.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
function unBatchChildren(result) {
    if (!result || result.length === 0) {
        return undefined;
    }
    if (result.length > 1) {
        throw new Error('Unexpected result length, all tests are unbatched.');
    }
    return result[0].slice(1);
}
suite('ExtHostTreeView', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    class RecordingShape extends mock() {
        constructor() {
            super(...arguments);
            this.onRefresh = new Emitter();
        }
        async $registerTreeViewDataProvider(treeViewId) { }
        $refresh(viewId, itemsToRefresh) {
            return Promise.resolve(null).then(() => {
                this.onRefresh.fire(itemsToRefresh);
            });
        }
        $reveal(treeViewId, itemInfo, options) {
            return Promise.resolve();
        }
        $disposeTree(treeViewId) {
            return Promise.resolve();
        }
    }
    let testObject;
    let target;
    let onDidChangeTreeNode;
    let onDidChangeTreeNodeWithId;
    let tree;
    let labels;
    let nodes;
    setup(() => {
        tree = {
            a: {
                aa: {},
                ab: {},
            },
            b: {
                ba: {},
                bb: {},
            },
        };
        labels = {};
        nodes = {};
        const rpcProtocol = new TestRPCProtocol();
        rpcProtocol.set(MainContext.MainThreadCommands, new (class extends mock() {
            $registerCommand() { }
        })());
        target = new RecordingShape();
        testObject = store.add(new ExtHostTreeViews(target, new ExtHostCommands(rpcProtocol, new NullLogService(), new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })()), new NullLogService()));
        onDidChangeTreeNode = new Emitter();
        onDidChangeTreeNodeWithId = new Emitter();
        testObject.createTreeView('testNodeTreeProvider', { treeDataProvider: aNodeTreeDataProvider() }, extensionsDescription);
        testObject.createTreeView('testNodeWithIdTreeProvider', { treeDataProvider: aNodeWithIdTreeDataProvider() }, extensionsDescription);
        testObject.createTreeView('testNodeWithHighlightsTreeProvider', { treeDataProvider: aNodeWithHighlightedLabelTreeDataProvider() }, extensionsDescription);
        return loadCompleteTree('testNodeTreeProvider');
    });
    test('construct node tree', () => {
        return testObject.$getChildren('testNodeTreeProvider').then((elements) => {
            const actuals = unBatchChildren(elements)?.map((e) => e.handle);
            assert.deepStrictEqual(actuals, ['0/0:a', '0/0:b']);
            return Promise.all([
                testObject.$getChildren('testNodeTreeProvider', ['0/0:a']).then((children) => {
                    const actuals = unBatchChildren(children)?.map((e) => e.handle);
                    assert.deepStrictEqual(actuals, ['0/0:a/0:aa', '0/0:a/0:ab']);
                    return Promise.all([
                        testObject
                            .$getChildren('testNodeTreeProvider', ['0/0:a/0:aa'])
                            .then((children) => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                        testObject
                            .$getChildren('testNodeTreeProvider', ['0/0:a/0:ab'])
                            .then((children) => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                    ]);
                }),
                testObject.$getChildren('testNodeTreeProvider', ['0/0:b']).then((children) => {
                    const actuals = unBatchChildren(children)?.map((e) => e.handle);
                    assert.deepStrictEqual(actuals, ['0/0:b/0:ba', '0/0:b/0:bb']);
                    return Promise.all([
                        testObject
                            .$getChildren('testNodeTreeProvider', ['0/0:b/0:ba'])
                            .then((children) => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                        testObject
                            .$getChildren('testNodeTreeProvider', ['0/0:b/0:bb'])
                            .then((children) => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                    ]);
                }),
            ]);
        });
    });
    test('construct id tree', () => {
        return testObject.$getChildren('testNodeWithIdTreeProvider').then((elements) => {
            const actuals = unBatchChildren(elements)?.map((e) => e.handle);
            assert.deepStrictEqual(actuals, ['1/a', '1/b']);
            return Promise.all([
                testObject.$getChildren('testNodeWithIdTreeProvider', ['1/a']).then((children) => {
                    const actuals = unBatchChildren(children)?.map((e) => e.handle);
                    assert.deepStrictEqual(actuals, ['1/aa', '1/ab']);
                    return Promise.all([
                        testObject
                            .$getChildren('testNodeWithIdTreeProvider', ['1/aa'])
                            .then((children) => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                        testObject
                            .$getChildren('testNodeWithIdTreeProvider', ['1/ab'])
                            .then((children) => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                    ]);
                }),
                testObject.$getChildren('testNodeWithIdTreeProvider', ['1/b']).then((children) => {
                    const actuals = unBatchChildren(children)?.map((e) => e.handle);
                    assert.deepStrictEqual(actuals, ['1/ba', '1/bb']);
                    return Promise.all([
                        testObject
                            .$getChildren('testNodeWithIdTreeProvider', ['1/ba'])
                            .then((children) => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                        testObject
                            .$getChildren('testNodeWithIdTreeProvider', ['1/bb'])
                            .then((children) => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                    ]);
                }),
            ]);
        });
    });
    test('construct highlights tree', () => {
        return testObject.$getChildren('testNodeWithHighlightsTreeProvider').then((elements) => {
            assert.deepStrictEqual(removeUnsetKeys(unBatchChildren(elements)), [
                {
                    handle: '1/a',
                    label: {
                        label: 'a',
                        highlights: [
                            [0, 2],
                            [3, 5],
                        ],
                    },
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                },
                {
                    handle: '1/b',
                    label: {
                        label: 'b',
                        highlights: [
                            [0, 2],
                            [3, 5],
                        ],
                    },
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                },
            ]);
            return Promise.all([
                testObject.$getChildren('testNodeWithHighlightsTreeProvider', ['1/a']).then((children) => {
                    assert.deepStrictEqual(removeUnsetKeys(unBatchChildren(children)), [
                        {
                            handle: '1/aa',
                            parentHandle: '1/a',
                            label: {
                                label: 'aa',
                                highlights: [
                                    [0, 2],
                                    [3, 5],
                                ],
                            },
                            collapsibleState: TreeItemCollapsibleState.None,
                        },
                        {
                            handle: '1/ab',
                            parentHandle: '1/a',
                            label: {
                                label: 'ab',
                                highlights: [
                                    [0, 2],
                                    [3, 5],
                                ],
                            },
                            collapsibleState: TreeItemCollapsibleState.None,
                        },
                    ]);
                }),
                testObject.$getChildren('testNodeWithHighlightsTreeProvider', ['1/b']).then((children) => {
                    assert.deepStrictEqual(removeUnsetKeys(unBatchChildren(children)), [
                        {
                            handle: '1/ba',
                            parentHandle: '1/b',
                            label: {
                                label: 'ba',
                                highlights: [
                                    [0, 2],
                                    [3, 5],
                                ],
                            },
                            collapsibleState: TreeItemCollapsibleState.None,
                        },
                        {
                            handle: '1/bb',
                            parentHandle: '1/b',
                            label: {
                                label: 'bb',
                                highlights: [
                                    [0, 2],
                                    [3, 5],
                                ],
                            },
                            collapsibleState: TreeItemCollapsibleState.None,
                        },
                    ]);
                }),
            ]);
        });
    });
    test('error is thrown if id is not unique', (done) => {
        tree['a'] = {
            aa: {},
        };
        tree['b'] = {
            aa: {},
            ba: {},
        };
        let caughtExpectedError = false;
        store.add(target.onRefresh.event(() => {
            testObject.$getChildren('testNodeWithIdTreeProvider').then((elements) => {
                const actuals = unBatchChildren(elements)?.map((e) => e.handle);
                assert.deepStrictEqual(actuals, ['1/a', '1/b']);
                return testObject
                    .$getChildren('testNodeWithIdTreeProvider', ['1/a'])
                    .then(() => testObject.$getChildren('testNodeWithIdTreeProvider', ['1/b']))
                    .then(() => assert.fail('Should fail with duplicate id'))
                    .catch(() => (caughtExpectedError = true))
                    .finally(() => caughtExpectedError ? done() : assert.fail('Expected duplicate id error not thrown.'));
            });
        }));
        onDidChangeTreeNode.fire(undefined);
    });
    test('refresh root', function (done) {
        store.add(target.onRefresh.event((actuals) => {
            assert.strictEqual(undefined, actuals);
            done();
        }));
        onDidChangeTreeNode.fire(undefined);
    });
    test('refresh a parent node', () => {
        return new Promise((c, e) => {
            store.add(target.onRefresh.event((actuals) => {
                assert.deepStrictEqual(['0/0:b'], Object.keys(actuals));
                assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:b']), {
                    handle: '0/0:b',
                    label: { label: 'b' },
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                });
                c(undefined);
            }));
            onDidChangeTreeNode.fire(getNode('b'));
        });
    });
    test('refresh a leaf node', function (done) {
        store.add(target.onRefresh.event((actuals) => {
            assert.deepStrictEqual(['0/0:b/0:bb'], Object.keys(actuals));
            assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:b/0:bb']), {
                handle: '0/0:b/0:bb',
                parentHandle: '0/0:b',
                label: { label: 'bb' },
                collapsibleState: TreeItemCollapsibleState.None,
            });
            done();
        }));
        onDidChangeTreeNode.fire(getNode('bb'));
    });
    async function runWithEventMerging(action) {
        await runWithFakedTimers({}, async () => {
            await new Promise((resolve) => {
                let subscription = undefined;
                subscription = target.onRefresh.event(() => {
                    subscription.dispose();
                    resolve();
                });
                onDidChangeTreeNode.fire(getNode('b'));
            });
            await new Promise(action);
        });
    }
    test('refresh parent and child node trigger refresh only on parent - scenario 1', async () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event((actuals) => {
                assert.deepStrictEqual(['0/0:b', '0/0:a/0:aa'], Object.keys(actuals));
                assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:b']), {
                    handle: '0/0:b',
                    label: { label: 'b' },
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                });
                assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:a/0:aa']), {
                    handle: '0/0:a/0:aa',
                    parentHandle: '0/0:a',
                    label: { label: 'aa' },
                    collapsibleState: TreeItemCollapsibleState.None,
                });
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(getNode('aa'));
            onDidChangeTreeNode.fire(getNode('bb'));
        });
    });
    test('refresh parent and child node trigger refresh only on parent - scenario 2', async () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event((actuals) => {
                assert.deepStrictEqual(['0/0:a/0:aa', '0/0:b'], Object.keys(actuals));
                assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:b']), {
                    handle: '0/0:b',
                    label: { label: 'b' },
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                });
                assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:a/0:aa']), {
                    handle: '0/0:a/0:aa',
                    parentHandle: '0/0:a',
                    label: { label: 'aa' },
                    collapsibleState: TreeItemCollapsibleState.None,
                });
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('bb'));
            onDidChangeTreeNode.fire(getNode('aa'));
            onDidChangeTreeNode.fire(getNode('b'));
        });
    });
    test('refresh an element for label change', function (done) {
        labels['a'] = 'aa';
        store.add(target.onRefresh.event((actuals) => {
            assert.deepStrictEqual(['0/0:a'], Object.keys(actuals));
            assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:a']), {
                handle: '0/0:aa',
                label: { label: 'aa' },
                collapsibleState: TreeItemCollapsibleState.Collapsed,
            });
            done();
        }));
        onDidChangeTreeNode.fire(getNode('a'));
    });
    test('refresh calls are throttled on roots', () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event((actuals) => {
                assert.strictEqual(undefined, actuals);
                resolve();
            }));
            onDidChangeTreeNode.fire(undefined);
            onDidChangeTreeNode.fire(undefined);
            onDidChangeTreeNode.fire(undefined);
            onDidChangeTreeNode.fire(undefined);
        });
    });
    test('refresh calls are throttled on elements', () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event((actuals) => {
                assert.deepStrictEqual(['0/0:a', '0/0:b'], Object.keys(actuals));
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('a'));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(getNode('a'));
        });
    });
    test('refresh calls are throttled on unknown elements', () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event((actuals) => {
                assert.deepStrictEqual(['0/0:a', '0/0:b'], Object.keys(actuals));
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('a'));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(getNode('g'));
            onDidChangeTreeNode.fire(getNode('a'));
        });
    });
    test('refresh calls are throttled on unknown elements and root', () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event((actuals) => {
                assert.strictEqual(undefined, actuals);
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('a'));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(getNode('g'));
            onDidChangeTreeNode.fire(undefined);
        });
    });
    test('refresh calls are throttled on elements and root', () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event((actuals) => {
                assert.strictEqual(undefined, actuals);
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('a'));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(undefined);
            onDidChangeTreeNode.fire(getNode('a'));
        });
    });
    test('generate unique handles from labels by escaping them', (done) => {
        tree = {
            'a/0:b': {},
        };
        store.add(target.onRefresh.event(() => {
            testObject.$getChildren('testNodeTreeProvider').then((elements) => {
                assert.deepStrictEqual(unBatchChildren(elements)?.map((e) => e.handle), ['0/0:a//0:b']);
                done();
            });
        }));
        onDidChangeTreeNode.fire(undefined);
    });
    test('tree with duplicate labels', (done) => {
        const dupItems = {
            adup1: 'c',
            adup2: 'g',
            bdup1: 'e',
            hdup1: 'i',
            hdup2: 'l',
            jdup1: 'k',
        };
        labels['c'] = 'a';
        labels['e'] = 'b';
        labels['g'] = 'a';
        labels['i'] = 'h';
        labels['l'] = 'h';
        labels['k'] = 'j';
        tree[dupItems['adup1']] = {};
        tree['d'] = {};
        const bdup1Tree = {};
        bdup1Tree['h'] = {};
        bdup1Tree[dupItems['hdup1']] = {};
        bdup1Tree['j'] = {};
        bdup1Tree[dupItems['jdup1']] = {};
        bdup1Tree[dupItems['hdup2']] = {};
        tree[dupItems['bdup1']] = bdup1Tree;
        tree['f'] = {};
        tree[dupItems['adup2']] = {};
        store.add(target.onRefresh.event(() => {
            testObject.$getChildren('testNodeTreeProvider').then((elements) => {
                const actuals = unBatchChildren(elements)?.map((e) => e.handle);
                assert.deepStrictEqual(actuals, [
                    '0/0:a',
                    '0/0:b',
                    '0/1:a',
                    '0/0:d',
                    '0/1:b',
                    '0/0:f',
                    '0/2:a',
                ]);
                return testObject.$getChildren('testNodeTreeProvider', ['0/1:b']).then((elements) => {
                    const actuals = unBatchChildren(elements)?.map((e) => e.handle);
                    assert.deepStrictEqual(actuals, [
                        '0/1:b/0:h',
                        '0/1:b/1:h',
                        '0/1:b/0:j',
                        '0/1:b/1:j',
                        '0/1:b/2:h',
                    ]);
                    done();
                });
            });
        }));
        onDidChangeTreeNode.fire(undefined);
    });
    test('getChildren is not returned from cache if refreshed', (done) => {
        tree = {
            c: {},
        };
        store.add(target.onRefresh.event(() => {
            testObject.$getChildren('testNodeTreeProvider').then((elements) => {
                assert.deepStrictEqual(unBatchChildren(elements)?.map((e) => e.handle), ['0/0:c']);
                done();
            });
        }));
        onDidChangeTreeNode.fire(undefined);
    });
    test('getChildren is returned from cache if not refreshed', () => {
        tree = {
            c: {},
        };
        return testObject.$getChildren('testNodeTreeProvider').then((elements) => {
            assert.deepStrictEqual(unBatchChildren(elements)?.map((e) => e.handle), ['0/0:a', '0/0:b']);
        });
    });
    test('reveal will throw an error if getParent is not implemented', () => {
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aNodeTreeDataProvider() }, extensionsDescription);
        return treeView.reveal({ key: 'a' }).then(() => assert.fail('Reveal should throw an error as getParent is not implemented'), () => null);
    });
    test('reveal will return empty array for root element', () => {
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        const expected = {
            item: {
                handle: '0/0:a',
                label: { label: 'a' },
                collapsibleState: TreeItemCollapsibleState.Collapsed,
            },
            parentChain: [],
        };
        return treeView.reveal({ key: 'a' }).then(() => {
            assert.ok(revealTarget.calledOnce);
            assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
            assert.deepStrictEqual(expected, removeUnsetKeys(revealTarget.args[0][1]));
            assert.deepStrictEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][2]);
        });
    });
    test('reveal will return parents array for an element when hierarchy is not loaded', () => {
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        const expected = {
            item: {
                handle: '0/0:a/0:aa',
                label: { label: 'aa' },
                collapsibleState: TreeItemCollapsibleState.None,
                parentHandle: '0/0:a',
            },
            parentChain: [
                {
                    handle: '0/0:a',
                    label: { label: 'a' },
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                },
            ],
        };
        return treeView.reveal({ key: 'aa' }).then(() => {
            assert.ok(revealTarget.calledOnce);
            assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
            assert.deepStrictEqual(expected.item, removeUnsetKeys(revealTarget.args[0][1].item));
            assert.deepStrictEqual(expected.parentChain, revealTarget.args[0][1].parentChain.map((arg) => removeUnsetKeys(arg)));
            assert.deepStrictEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][2]);
        });
    });
    test('reveal will return parents array for an element when hierarchy is loaded', () => {
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        const expected = {
            item: {
                handle: '0/0:a/0:aa',
                label: { label: 'aa' },
                collapsibleState: TreeItemCollapsibleState.None,
                parentHandle: '0/0:a',
            },
            parentChain: [
                {
                    handle: '0/0:a',
                    label: { label: 'a' },
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                },
            ],
        };
        return testObject
            .$getChildren('treeDataProvider')
            .then(() => testObject.$getChildren('treeDataProvider', ['0/0:a']))
            .then(() => treeView.reveal({ key: 'aa' }).then(() => {
            assert.ok(revealTarget.calledOnce);
            assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
            assert.deepStrictEqual(expected.item, removeUnsetKeys(revealTarget.args[0][1].item));
            assert.deepStrictEqual(expected.parentChain, revealTarget.args[0][1].parentChain.map((arg) => removeUnsetKeys(arg)));
            assert.deepStrictEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][2]);
        }));
    });
    test('reveal will return parents array for deeper element with no selection', () => {
        tree = {
            b: {
                ba: {
                    bac: {},
                },
            },
        };
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        const expected = {
            item: {
                handle: '0/0:b/0:ba/0:bac',
                label: { label: 'bac' },
                collapsibleState: TreeItemCollapsibleState.None,
                parentHandle: '0/0:b/0:ba',
            },
            parentChain: [
                {
                    handle: '0/0:b',
                    label: { label: 'b' },
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                },
                {
                    handle: '0/0:b/0:ba',
                    label: { label: 'ba' },
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                    parentHandle: '0/0:b',
                },
            ],
        };
        return treeView
            .reveal({ key: 'bac' }, { select: false, focus: false, expand: false })
            .then(() => {
            assert.ok(revealTarget.calledOnce);
            assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
            assert.deepStrictEqual(expected.item, removeUnsetKeys(revealTarget.args[0][1].item));
            assert.deepStrictEqual(expected.parentChain, revealTarget.args[0][1].parentChain.map((arg) => removeUnsetKeys(arg)));
            assert.deepStrictEqual({ select: false, focus: false, expand: false }, revealTarget.args[0][2]);
        });
    });
    test('reveal after first udpate', () => {
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        const expected = {
            item: {
                handle: '0/0:a/0:ac',
                label: { label: 'ac' },
                collapsibleState: TreeItemCollapsibleState.None,
                parentHandle: '0/0:a',
            },
            parentChain: [
                {
                    handle: '0/0:a',
                    label: { label: 'a' },
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                },
            ],
        };
        return loadCompleteTree('treeDataProvider').then(() => {
            tree = {
                a: {
                    aa: {},
                    ac: {},
                },
                b: {
                    ba: {},
                    bb: {},
                },
            };
            onDidChangeTreeNode.fire(getNode('a'));
            return treeView.reveal({ key: 'ac' }).then(() => {
                assert.ok(revealTarget.calledOnce);
                assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
                assert.deepStrictEqual(expected.item, removeUnsetKeys(revealTarget.args[0][1].item));
                assert.deepStrictEqual(expected.parentChain, revealTarget.args[0][1].parentChain.map((arg) => removeUnsetKeys(arg)));
                assert.deepStrictEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][2]);
            });
        });
    });
    test('reveal after second udpate', () => {
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        return loadCompleteTree('treeDataProvider').then(() => {
            return runWithEventMerging((resolve) => {
                tree = {
                    a: {
                        aa: {},
                        ac: {},
                    },
                    b: {
                        ba: {},
                        bb: {},
                    },
                };
                onDidChangeTreeNode.fire(getNode('a'));
                tree = {
                    a: {
                        aa: {},
                        ac: {},
                    },
                    b: {
                        ba: {},
                        bc: {},
                    },
                };
                onDidChangeTreeNode.fire(getNode('b'));
                resolve();
            }).then(() => {
                return treeView.reveal({ key: 'bc' }).then(() => {
                    assert.ok(revealTarget.calledOnce);
                    assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
                    assert.deepStrictEqual({
                        handle: '0/0:b/0:bc',
                        label: { label: 'bc' },
                        collapsibleState: TreeItemCollapsibleState.None,
                        parentHandle: '0/0:b',
                    }, removeUnsetKeys(revealTarget.args[0][1].item));
                    assert.deepStrictEqual([
                        {
                            handle: '0/0:b',
                            label: { label: 'b' },
                            collapsibleState: TreeItemCollapsibleState.Collapsed,
                        },
                    ], revealTarget.args[0][1].parentChain.map((arg) => removeUnsetKeys(arg)));
                    assert.deepStrictEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][2]);
                });
            });
        });
    });
    function loadCompleteTree(treeId, element) {
        return testObject
            .$getChildren(treeId, element ? [element] : undefined)
            .then((elements) => {
            if (!elements || elements?.length === 0) {
                return null;
            }
            return elements[0].slice(1).map((e) => loadCompleteTree(treeId, e.handle));
        })
            .then(() => null);
    }
    function removeUnsetKeys(obj) {
        if (Array.isArray(obj)) {
            return obj.map((o) => removeUnsetKeys(o));
        }
        if (typeof obj === 'object') {
            const result = {};
            for (const key of Object.keys(obj)) {
                if (obj[key] !== undefined) {
                    result[key] = removeUnsetKeys(obj[key]);
                }
            }
            return result;
        }
        return obj;
    }
    function aNodeTreeDataProvider() {
        return {
            getChildren: (element) => {
                return getChildren(element ? element.key : undefined).map((key) => getNode(key));
            },
            getTreeItem: (element) => {
                return getTreeItem(element.key);
            },
            onDidChangeTreeData: onDidChangeTreeNode.event,
        };
    }
    function aCompleteNodeTreeDataProvider() {
        return {
            getChildren: (element) => {
                return getChildren(element ? element.key : undefined).map((key) => getNode(key));
            },
            getTreeItem: (element) => {
                return getTreeItem(element.key);
            },
            getParent: ({ key }) => {
                const parentKey = key.substring(0, key.length - 1);
                return parentKey ? new Key(parentKey) : undefined;
            },
            onDidChangeTreeData: onDidChangeTreeNode.event,
        };
    }
    function aNodeWithIdTreeDataProvider() {
        return {
            getChildren: (element) => {
                return getChildren(element ? element.key : undefined).map((key) => getNode(key));
            },
            getTreeItem: (element) => {
                const treeItem = getTreeItem(element.key);
                treeItem.id = element.key;
                return treeItem;
            },
            onDidChangeTreeData: onDidChangeTreeNodeWithId.event,
        };
    }
    function aNodeWithHighlightedLabelTreeDataProvider() {
        return {
            getChildren: (element) => {
                return getChildren(element ? element.key : undefined).map((key) => getNode(key));
            },
            getTreeItem: (element) => {
                const treeItem = getTreeItem(element.key, [
                    [0, 2],
                    [3, 5],
                ]);
                treeItem.id = element.key;
                return treeItem;
            },
            onDidChangeTreeData: onDidChangeTreeNodeWithId.event,
        };
    }
    function getTreeElement(element) {
        let parent = tree;
        for (let i = 0; i < element.length; i++) {
            parent = parent[element.substring(0, i + 1)];
            if (!parent) {
                return null;
            }
        }
        return parent;
    }
    function getChildren(key) {
        if (!key) {
            return Object.keys(tree);
        }
        const treeElement = getTreeElement(key);
        if (treeElement) {
            return Object.keys(treeElement);
        }
        return [];
    }
    function getTreeItem(key, highlights) {
        const treeElement = getTreeElement(key);
        return {
            label: { label: labels[key] || key, highlights },
            collapsibleState: treeElement && Object.keys(treeElement).length
                ? TreeItemCollapsibleState.Collapsed
                : TreeItemCollapsibleState.None,
        };
    }
    function getNode(key) {
        if (!nodes[key]) {
            nodes[key] = new Key(key);
        }
        return nodes[key];
    }
    class Key {
        constructor(key) {
            this.key = key;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRyZWVWaWV3cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdFRyZWVWaWV3cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUM5QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixXQUFXLEdBRVgsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx3QkFBd0IsRUFBNkIsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsT0FBTyxFQUFFLHdCQUF3QixJQUFJLHFCQUFxQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFFeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsU0FBUyxlQUFlLENBQUMsTUFBNEM7SUFDcEUsSUFBSSxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3BDLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFD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
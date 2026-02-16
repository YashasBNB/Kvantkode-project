/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { AsyncDataTree, CompressibleAsyncDataTree, } from '../../../../browser/ui/tree/asyncDataTree.js';
import { timeout } from '../../../../common/async.js';
import { Iterable } from '../../../../common/iterator.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
import { runWithFakedTimers } from '../../../common/timeTravelScheduler.js';
function find(element, id) {
    if (element.id === id) {
        return element;
    }
    if (!element.children) {
        return undefined;
    }
    for (const child of element.children) {
        const result = find(child, id);
        if (result) {
            return result;
        }
    }
    return undefined;
}
class Renderer {
    constructor() {
        this.templateId = 'default';
    }
    renderTemplate(container) {
        return container;
    }
    renderElement(element, index, templateData) {
        templateData.textContent = element.element.id + (element.element.suffix || '');
    }
    disposeTemplate(templateData) {
        // noop
    }
    renderCompressedElements(node, index, templateData, height) {
        const result = [];
        for (const element of node.element.elements) {
            result.push(element.id + (element.suffix || ''));
        }
        templateData.textContent = result.join('/');
    }
}
class IdentityProvider {
    getId(element) {
        return element.id;
    }
}
class VirtualDelegate {
    getHeight() {
        return 20;
    }
    getTemplateId(element) {
        return 'default';
    }
}
class DataSource {
    hasChildren(element) {
        return !!element.children && element.children.length > 0;
    }
    getChildren(element) {
        return Promise.resolve(element.children || []);
    }
}
class Model {
    constructor(root) {
        this.root = root;
    }
    get(id) {
        const result = find(this.root, id);
        if (!result) {
            throw new Error('element not found');
        }
        return result;
    }
}
suite('AsyncDataTree', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('Collapse state should be preserved across refresh calls', async () => {
        const container = document.createElement('div');
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 0);
        await tree.setInput(model.root);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
        const twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        model.get('a').children = [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }];
        await tree.updateChildren(model.root);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
        await tree.expand(model.get('a'));
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 4);
        model.get('a').children = [];
        await tree.updateChildren(model.root);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
    });
    test('issue #68648', async () => {
        const container = document.createElement('div');
        const getChildrenCalls = [];
        const dataSource = new (class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            getChildren(element) {
                getChildrenCalls.push(element.id);
                return Promise.resolve(element.children || []);
            }
        })();
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.deepStrictEqual(getChildrenCalls, ['root']);
        let twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        assert(tree.getNode().children[0].collapsed);
        model.get('a').children = [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }];
        await tree.updateChildren(model.root);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'root']);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(twistie.classList.contains('collapsible'));
        assert(twistie.classList.contains('collapsed'));
        assert(tree.getNode().children[0].collapsed);
        model.get('a').children = [];
        await tree.updateChildren(model.root);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'root', 'root']);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        assert(tree.getNode().children[0].collapsed);
        model.get('a').children = [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }];
        await tree.updateChildren(model.root);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'root', 'root', 'root']);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(twistie.classList.contains('collapsible'));
        assert(twistie.classList.contains('collapsed'));
        assert(tree.getNode().children[0].collapsed);
    });
    test('issue #67722 - once resolved, refreshed collapsed nodes should only get children when expanded', async () => {
        const container = document.createElement('div');
        const getChildrenCalls = [];
        const dataSource = new (class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            getChildren(element) {
                getChildrenCalls.push(element.id);
                return Promise.resolve(element.children || []);
            }
        })();
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }],
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert(tree.getNode(model.get('a')).collapsed);
        assert.deepStrictEqual(getChildrenCalls, ['root']);
        await tree.expand(model.get('a'));
        assert(!tree.getNode(model.get('a')).collapsed);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'a']);
        tree.collapse(model.get('a'));
        assert(tree.getNode(model.get('a')).collapsed);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'a']);
        await tree.updateChildren();
        assert(tree.getNode(model.get('a')).collapsed);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'a', 'root'], "a should not be refreshed, since it' collapsed");
    });
    test('resolved collapsed nodes which lose children should lose twistie as well', async () => {
        const container = document.createElement('div');
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }],
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        await tree.expand(model.get('a'));
        let twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        assert(!tree.getNode(model.get('a')).collapsed);
        tree.collapse(model.get('a'));
        model.get('a').children = [];
        await tree.updateChildren(model.root);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        assert(tree.getNode(model.get('a')).collapsed);
    });
    test("issue #192422 - resolved collapsed nodes with changed children don't show old children", async () => {
        const container = document.createElement('div');
        let hasGottenAChildren = false;
        const dataSource = new (class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            async getChildren(element) {
                if (element.id === 'a') {
                    if (!hasGottenAChildren) {
                        hasGottenAChildren = true;
                    }
                    else {
                        return [{ id: 'c' }];
                    }
                }
                return element.children || [];
            }
        })();
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [{ id: 'b' }],
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        const a = model.get('a');
        const aNode = tree.getNode(a);
        assert(aNode.collapsed);
        await tree.expand(a);
        assert(!aNode.collapsed);
        assert.equal(aNode.children.length, 1);
        assert.equal(aNode.children[0].element.id, 'b');
        const bChild = container.querySelector('.monaco-list-row:nth-child(2)');
        assert.equal(bChild?.textContent, 'b');
        tree.collapse(a);
        assert(aNode.collapsed);
        await tree.updateChildren(a);
        const aUpdated1 = model.get('a');
        const aNodeUpdated1 = tree.getNode(a);
        assert(aNodeUpdated1.collapsed);
        assert.equal(aNodeUpdated1.children.length, 0);
        let didCheckNoChildren = false;
        const event = tree.onDidChangeCollapseState((e) => {
            const child = container.querySelector('.monaco-list-row:nth-child(2)');
            assert.equal(child, undefined);
            didCheckNoChildren = true;
        });
        await tree.expand(aUpdated1);
        event.dispose();
        assert(didCheckNoChildren);
        const aNodeUpdated2 = tree.getNode(a);
        assert(!aNodeUpdated2.collapsed);
        assert.equal(aNodeUpdated2.children.length, 1);
        assert.equal(aNodeUpdated2.children[0].element.id, 'c');
        const child = container.querySelector('.monaco-list-row:nth-child(2)');
        assert.equal(child?.textContent, 'c');
    });
    test('issue #192422 - resolved collapsed nodes with unchanged children immediately show children', async () => {
        const container = document.createElement('div');
        const dataSource = new (class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            async getChildren(element) {
                return element.children || [];
            }
        })();
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [{ id: 'b' }],
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        const a = model.get('a');
        const aNode = tree.getNode(a);
        assert(aNode.collapsed);
        await tree.expand(a);
        assert(!aNode.collapsed);
        assert.equal(aNode.children.length, 1);
        assert.equal(aNode.children[0].element.id, 'b');
        const bChild = container.querySelector('.monaco-list-row:nth-child(2)');
        assert.equal(bChild?.textContent, 'b');
        tree.collapse(a);
        assert(aNode.collapsed);
        const aUpdated1 = model.get('a');
        const aNodeUpdated1 = tree.getNode(a);
        assert(aNodeUpdated1.collapsed);
        assert.equal(aNodeUpdated1.children.length, 1);
        let didCheckSameChildren = false;
        const event = tree.onDidChangeCollapseState((e) => {
            const child = container.querySelector('.monaco-list-row:nth-child(2)');
            assert.equal(child?.textContent, 'b');
            didCheckSameChildren = true;
        });
        await tree.expand(aUpdated1);
        event.dispose();
        assert(didCheckSameChildren);
        const aNodeUpdated2 = tree.getNode(a);
        assert(!aNodeUpdated2.collapsed);
        assert.equal(aNodeUpdated2.children.length, 1);
        assert.equal(aNodeUpdated2.children[0].element.id, 'b');
        const child = container.querySelector('.monaco-list-row:nth-child(2)');
        assert.equal(child?.textContent, 'b');
    });
    test('support default collapse state per element', async () => {
        const container = document.createElement('div');
        const getChildrenCalls = [];
        const dataSource = new (class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            getChildren(element) {
                getChildrenCalls.push(element.id);
                return Promise.resolve(element.children || []);
            }
        })();
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }],
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, {
            collapseByDefault: (el) => el.id !== 'a',
        }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert(!tree.getNode(model.get('a')).collapsed);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'a']);
    });
    test('issue #80098 - concurrent refresh and expand', async () => {
        const container = document.createElement('div');
        const calls = [];
        const dataSource = new (class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            getChildren(element) {
                return new Promise((c) => calls.push(() => c(element.children || [])));
            }
        })();
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [
                        {
                            id: 'aa',
                        },
                    ],
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        const pSetInput = tree.setInput(model.root);
        calls.pop()(); // resolve getChildren(root)
        await pSetInput;
        const pUpdateChildrenA = tree.updateChildren(model.get('a'));
        const pExpandA = tree.expand(model.get('a'));
        assert.strictEqual(calls.length, 1, "expand(a) still hasn't called getChildren(a)");
        calls.pop()();
        assert.strictEqual(calls.length, 0, 'no pending getChildren calls');
        await pUpdateChildrenA;
        assert.strictEqual(calls.length, 0, 'expand(a) should not have forced a second refresh');
        const result = await pExpandA;
        assert.strictEqual(result, true, 'expand(a) should be done');
    });
    test('issue #80098 - first expand should call getChildren', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const container = document.createElement('div');
            const calls = [];
            const dataSource = new (class {
                hasChildren(element) {
                    return !!element.children && element.children.length > 0;
                }
                getChildren(element) {
                    return new Promise((c) => calls.push(() => c(element.children || [])));
                }
            })();
            const model = new Model({
                id: 'root',
                children: [
                    {
                        id: 'a',
                        children: [
                            {
                                id: 'aa',
                            },
                        ],
                    },
                ],
            });
            const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
            tree.layout(200);
            const pSetInput = tree.setInput(model.root);
            calls.pop()(); // resolve getChildren(root)
            await pSetInput;
            const pExpandA = tree.expand(model.get('a'));
            assert.strictEqual(calls.length, 1, "expand(a) should've called getChildren(a)");
            let race = await Promise.race([
                pExpandA.then(() => 'expand'),
                timeout(1).then(() => 'timeout'),
            ]);
            assert.strictEqual(race, 'timeout', 'expand(a) should not be yet done');
            calls.pop()();
            assert.strictEqual(calls.length, 0, 'no pending getChildren calls');
            race = await Promise.race([pExpandA.then(() => 'expand'), timeout(1).then(() => 'timeout')]);
            assert.strictEqual(race, 'expand', 'expand(a) should now be done');
        });
    });
    test('issue #78388 - tree should react to hasChildren toggles', async () => {
        const container = document.createElement('div');
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
        let twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        model.get('a').children = [{ id: 'aa' }];
        await tree.updateChildren(model.get('a'), false);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(twistie.classList.contains('collapsible'));
        assert(twistie.classList.contains('collapsed'));
        model.get('a').children = [];
        await tree.updateChildren(model.get('a'), false);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
    });
    test('issues #84569, #82629 - rerender', async () => {
        const container = document.createElement('div');
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [
                        {
                            id: 'b',
                            suffix: '1',
                        },
                    ],
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        await tree.expand(model.get('a'));
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map((e) => e.textContent), ['a', 'b1']);
        const a = model.get('a');
        const b = model.get('b');
        a.children?.splice(0, 1, { id: 'b', suffix: '2' });
        await Promise.all([tree.updateChildren(a, true, true), tree.updateChildren(b, true, true)]);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map((e) => e.textContent), ['a', 'b2']);
    });
    test('issue #199264 - dispose during render', async () => {
        const container = document.createElement('div');
        const model1 = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }],
                },
            ],
        });
        const model2 = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }],
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model1.root);
        const input = tree.setInput(model2.root);
        tree.dispose();
        await input;
        assert.strictEqual(container.innerHTML, '');
    });
    test('issue #121567', async () => {
        const container = document.createElement('div');
        const calls = [];
        const dataSource = new (class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            async getChildren(element) {
                calls.push(element);
                return element.children ?? Iterable.empty();
            }
        })();
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [
                        {
                            id: 'aa',
                        },
                    ],
                },
            ],
        });
        const a = model.get('a');
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.strictEqual(calls.length, 1, 'There should be a single getChildren call for the root');
        assert(tree.isCollapsible(a), 'a is collapsible');
        assert(tree.isCollapsed(a), 'a is collapsed');
        await tree.updateChildren(a, false);
        assert.strictEqual(calls.length, 1, 'There should be no changes to the calls list, since a was collapsed');
        assert(tree.isCollapsible(a), 'a is collapsible');
        assert(tree.isCollapsed(a), 'a is collapsed');
        const children = a.children;
        a.children = [];
        await tree.updateChildren(a, false);
        assert.strictEqual(calls.length, 1, 'There should still be no changes to the calls list, since a was collapsed');
        assert(!tree.isCollapsible(a), 'a is no longer collapsible');
        assert(tree.isCollapsed(a), 'a is collapsed');
        a.children = children;
        await tree.updateChildren(a, false);
        assert.strictEqual(calls.length, 1, 'There should still be no changes to the calls list, since a was collapsed');
        assert(tree.isCollapsible(a), 'a is collapsible again');
        assert(tree.isCollapsed(a), 'a is collapsed');
        await tree.expand(a);
        assert.strictEqual(calls.length, 2, 'Finally, there should be a getChildren call for a');
        assert(tree.isCollapsible(a), 'a is still collapsible');
        assert(!tree.isCollapsed(a), 'a is expanded');
    });
    test('issue #199441', async () => {
        const container = document.createElement('div');
        const dataSource = new (class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            async getChildren(element) {
                return element.children ?? Iterable.empty();
            }
        })();
        const compressionDelegate = new (class {
            isIncompressible(element) {
                return !dataSource.hasChildren(element);
            }
        })();
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [
                        {
                            id: 'b',
                            children: [{ id: 'b.txt' }],
                        },
                    ],
                },
            ],
        });
        const collapseByDefault = (element) => false;
        const tree = store.add(new CompressibleAsyncDataTree('test', container, new VirtualDelegate(), compressionDelegate, [new Renderer()], dataSource, { identityProvider: new IdentityProvider(), collapseByDefault }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map((e) => e.textContent), ['a/b', 'b.txt']);
        model.get('a').children.push({
            id: 'c',
            children: [{ id: 'c.txt' }],
        });
        await tree.updateChildren(model.root, true);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map((e) => e.textContent), ['a', 'b', 'b.txt', 'c', 'c.txt']);
    });
    test('Tree Navigation: AsyncDataTree', async () => {
        const container = document.createElement('div');
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [
                        {
                            id: 'aa',
                            children: [{ id: 'aa.txt' }],
                        },
                        {
                            id: 'ab',
                            children: [{ id: 'ab.txt' }],
                        },
                    ],
                },
                {
                    id: 'b',
                    children: [
                        {
                            id: 'ba',
                            children: [{ id: 'ba.txt' }],
                        },
                        {
                            id: 'bb',
                            children: [{ id: 'bb.txt' }],
                        },
                    ],
                },
                {
                    id: 'c',
                    children: [
                        {
                            id: 'ca',
                            children: [{ id: 'ca.txt' }],
                        },
                        {
                            id: 'cb',
                            children: [{ id: 'cb.txt' }],
                        },
                    ],
                },
            ],
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map((e) => e.textContent), ['a', 'b', 'c']);
        assert.strictEqual(tree.navigate().current(), null);
        assert.strictEqual(tree.navigate().first()?.id, 'a');
        assert.strictEqual(tree.navigate().last()?.id, 'c');
        assert.strictEqual(tree.navigate(model.get('b')).previous()?.id, 'a');
        assert.strictEqual(tree.navigate(model.get('b')).next()?.id, 'c');
        await tree.expand(model.get('a'));
        await tree.expand(model.get('aa'));
        await tree.expand(model.get('ab'));
        await tree.expand(model.get('b'));
        await tree.expand(model.get('ba'));
        await tree.expand(model.get('bb'));
        await tree.expand(model.get('c'));
        await tree.expand(model.get('ca'));
        await tree.expand(model.get('cb'));
        // Only the first 10 elements are rendered (total height is 200px, each element is 20px)
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map((e) => e.textContent), ['a', 'aa', 'aa.txt', 'ab', 'ab.txt', 'b', 'ba', 'ba.txt', 'bb', 'bb.txt']);
        assert.strictEqual(tree.navigate().first()?.id, 'a');
        assert.strictEqual(tree.navigate().last()?.id, 'cb.txt');
        assert.strictEqual(tree.navigate(model.get('b')).previous()?.id, 'ab.txt');
        assert.strictEqual(tree.navigate(model.get('b')).next()?.id, 'ba');
        assert.strictEqual(tree.navigate(model.get('ab.txt')).previous()?.id, 'ab');
        assert.strictEqual(tree.navigate(model.get('ab.txt')).next()?.id, 'b');
        assert.strictEqual(tree.navigate(model.get('bb.txt')).next()?.id, 'c');
        tree.collapse(model.get('b'), false);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map((e) => e.textContent), ['a', 'aa', 'aa.txt', 'ab', 'ab.txt', 'b', 'c', 'ca', 'ca.txt', 'cb']);
        assert.strictEqual(tree.navigate(model.get('b')).next()?.id, 'c');
    });
    test('Test Navigation: CompressibleAsyncDataTree', async () => {
        const container = document.createElement('div');
        const dataSource = new (class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            async getChildren(element) {
                return element.children ?? Iterable.empty();
            }
        })();
        const compressionDelegate = new (class {
            isIncompressible(element) {
                return !dataSource.hasChildren(element);
            }
        })();
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a',
                    children: [{ id: 'aa', children: [{ id: 'aa.txt' }] }],
                },
                {
                    id: 'b',
                    children: [{ id: 'ba', children: [{ id: 'ba.txt' }] }],
                },
                {
                    id: 'c',
                    children: [
                        {
                            id: 'ca',
                            children: [{ id: 'ca.txt' }],
                        },
                        {
                            id: 'cb',
                            children: [{ id: 'cb.txt' }],
                        },
                    ],
                },
            ],
        });
        const tree = store.add(new CompressibleAsyncDataTree('test', container, new VirtualDelegate(), compressionDelegate, [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map((e) => e.textContent), ['a', 'b', 'c']);
        assert.strictEqual(tree.navigate().current(), null);
        assert.strictEqual(tree.navigate().first()?.id, 'a');
        assert.strictEqual(tree.navigate().last()?.id, 'c');
        assert.strictEqual(tree.navigate(model.get('b')).previous()?.id, 'a');
        assert.strictEqual(tree.navigate(model.get('b')).next()?.id, 'c');
        await tree.expand(model.get('a'));
        await tree.expand(model.get('aa'));
        await tree.expand(model.get('b'));
        await tree.expand(model.get('ba'));
        await tree.expand(model.get('c'));
        await tree.expand(model.get('ca'));
        await tree.expand(model.get('cb'));
        // Only the first 10 elements are rendered (total height is 200px, each element is 20px)
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map((e) => e.textContent), ['a/aa', 'aa.txt', 'b/ba', 'ba.txt', 'c', 'ca', 'ca.txt', 'cb', 'cb.txt']);
        assert.strictEqual(tree.navigate().first()?.id, 'aa');
        assert.strictEqual(tree.navigate().last()?.id, 'cb.txt');
        assert.strictEqual(tree.navigate(model.get('b')).previous()?.id, 'aa.txt');
        assert.strictEqual(tree.navigate(model.get('ba')).previous()?.id, 'aa.txt');
        assert.strictEqual(tree.navigate(model.get('b')).next()?.id, 'ba.txt');
        assert.strictEqual(tree.navigate(model.get('ba')).next()?.id, 'ba.txt');
        assert.strictEqual(tree.navigate(model.get('aa.txt')).previous()?.id, 'aa');
        assert.strictEqual(tree.navigate(model.get('aa.txt')).next()?.id, 'ba');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmNEYXRhVHJlZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci91aS90cmVlL2FzeW5jRGF0YVRyZWUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUNOLGFBQWEsRUFDYix5QkFBeUIsR0FFekIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUlyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2xGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBUTNFLFNBQVMsSUFBSSxDQUFDLE9BQWdCLEVBQUUsRUFBVTtJQUN6QyxJQUFJLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7UUFDdkIsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN2QixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUU5QixJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUM7QUFFRCxNQUFNLFFBQVE7SUFB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RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFakUsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFbEMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFbEMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFbEMsd0ZBQXdGO1FBQ3hGLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFDcEYsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FDMUUsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFdEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFDcEYsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FDckUsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ2xFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFL0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLFdBQVcs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LElBQUksRUFBRSxRQUFRLENBQUMsQ0FDekUsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDeEUsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmNEYXRhVHJlZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvdWkvdHJlZS9hc3luY0RhdGFUcmVlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFDTixhQUFhLEVBQ2IseUJBQXlCLEdBRXpCLE1BQU0sOENBQThDLENBQUE7QUFJckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQVEzRSxTQUFTLElBQUksQ0FBQyxPQUFnQixFQUFFLEVBQVU7SUFDekMsSUFBSSxPQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdkIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFOUIsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsTUFBTSxRQUFRO0lBQWQ7UUFDVSxlQUFVLEdBQUcsU0FBUyxD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QUFJLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBRW5ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBRWpFLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLElBQUks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Q3pFLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRXhELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRTNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRXZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3hFLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==
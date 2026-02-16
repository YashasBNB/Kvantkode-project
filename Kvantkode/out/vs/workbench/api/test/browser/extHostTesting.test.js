/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { timeout } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { URI } from '../../../../base/common/uri.js';
import { mock, mockObject } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import * as editorRange from '../../../../editor/common/core/range.js';
import { ExtensionIdentifier, } from '../../../../platform/extensions/common/extensions.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { ExtHostTesting, TestRunCoordinator, TestRunDto, TestRunProfileImpl, } from '../../common/extHostTesting.js';
import { ExtHostTestItemCollection, TestItemImpl } from '../../common/extHostTestItem.js';
import * as convert from '../../common/extHostTypeConverters.js';
import { Location, Position, Range, TestMessage, TestRunProfileKind, TestRunRequest as TestRunRequestImpl, TestTag, } from '../../common/extHostTypes.js';
import { AnyCallRPCProtocol } from '../common/testRPCProtocol.js';
import { TestId } from '../../../contrib/testing/common/testId.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
const simplify = (item) => ({
    id: item.id,
    label: item.label,
    uri: item.uri,
    range: item.range,
});
const assertTreesEqual = (a, b) => {
    if (!a) {
        throw new assert.AssertionError({ message: 'Expected a to be defined', actual: a });
    }
    if (!b) {
        throw new assert.AssertionError({ message: 'Expected b to be defined', actual: b });
    }
    assert.deepStrictEqual(simplify(a), simplify(b));
    const aChildren = [...a.children].map(([_, c]) => c.id).sort();
    const bChildren = [...b.children].map(([_, c]) => c.id).sort();
    assert.strictEqual(aChildren.length, bChildren.length, `expected ${a.label}.children.length == ${b.label}.children.length`);
    aChildren.forEach((key) => assertTreesEqual(a.children.get(key), b.children.get(key)));
};
// const assertTreeListEqual = (a: ReadonlyArray<TestItem>, b: ReadonlyArray<TestItem>) => {
// 	assert.strictEqual(a.length, b.length, `expected a.length == n.length`);
// 	a.forEach((_, i) => assertTreesEqual(a[i], b[i]));
// };
// class TestMirroredCollection extends MirroredTestCollection {
// 	public changeEvent!: TestChangeEvent;
// 	constructor() {
// 		super();
// 		this.onDidChangeTests(evt => this.changeEvent = evt);
// 	}
// 	public get length() {
// 		return this.items.size;
// 	}
// }
suite('ExtHost Testing', () => {
    class TestExtHostTestItemCollection extends ExtHostTestItemCollection {
        setDiff(diff) {
            this.diff = diff;
        }
    }
    teardown(() => {
        sinon.restore();
    });
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let single;
    let resolveCalls = [];
    setup(() => {
        resolveCalls = [];
        single = ds.add(new TestExtHostTestItemCollection('ctrlId', 'root', {
            getDocument: () => undefined,
        }));
        single.resolveHandler = (item) => {
            resolveCalls.push(item?.id);
            if (item === undefined) {
                const a = new TestItemImpl('ctrlId', 'id-a', 'a', URI.file('/'));
                a.canResolveChildren = true;
                const b = new TestItemImpl('ctrlId', 'id-b', 'b', URI.file('/'));
                single.root.children.add(a);
                single.root.children.add(b);
            }
            else if (item.id === 'id-a') {
                item.children.add(new TestItemImpl('ctrlId', 'id-aa', 'aa', URI.file('/')));
                item.children.add(new TestItemImpl('ctrlId', 'id-ab', 'ab', URI.file('/')));
            }
        };
        ds.add(single.onDidGenerateDiff((d) => single.setDiff(d /* don't clear during testing */)));
    });
    suite('OwnedTestCollection', () => {
        test('adds a root recursively', async () => {
            await single.expand(single.root.id, Infinity);
            const a = single.root.children.get('id-a');
            const b = single.root.children.get('id-b');
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 2 /* TestItemExpandState.BusyExpanding */,
                        item: { ...convert.TestItem.from(single.root) },
                    },
                },
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 2 /* TestItemExpandState.BusyExpanding */,
                        item: { ...convert.TestItem.from(a) },
                    },
                },
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 0 /* TestItemExpandState.NotExpandable */,
                        item: convert.TestItem.from(a.children.get('id-aa')),
                    },
                },
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 0 /* TestItemExpandState.NotExpandable */,
                        item: convert.TestItem.from(a.children.get('id-ab')),
                    },
                },
                {
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: new TestId(['ctrlId', 'id-a']).toString(),
                        expand: 3 /* TestItemExpandState.Expanded */,
                    },
                },
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 0 /* TestItemExpandState.NotExpandable */,
                        item: convert.TestItem.from(b),
                    },
                },
                {
                    op: 1 /* TestDiffOpType.Update */,
                    item: { extId: single.root.id, expand: 3 /* TestItemExpandState.Expanded */ },
                },
            ]);
        });
        test('parents are set correctly', () => {
            single.expand(single.root.id, Infinity);
            single.collectDiff();
            const a = single.root.children.get('id-a');
            const ab = a.children.get('id-ab');
            assert.strictEqual(a.parent, undefined);
            assert.strictEqual(ab.parent, a);
        });
        test('can add an item with same ID as root', () => {
            single.collectDiff();
            const child = new TestItemImpl('ctrlId', 'ctrlId', 'c', undefined);
            single.root.children.add(child);
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 0 /* TestItemExpandState.NotExpandable */,
                        item: convert.TestItem.from(child),
                    },
                },
            ]);
        });
        test('no-ops if items not changed', () => {
            single.collectDiff();
            assert.deepStrictEqual(single.collectDiff(), []);
        });
        test('watches property mutations', () => {
            single.expand(single.root.id, Infinity);
            single.collectDiff();
            single.root.children.get('id-a').description = 'Hello world'; /* item a */
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: new TestId(['ctrlId', 'id-a']).toString(),
                        item: { description: 'Hello world' },
                    },
                },
            ]);
        });
        test('removes children', () => {
            single.expand(single.root.id, Infinity);
            single.collectDiff();
            single.root.children.delete('id-a');
            assert.deepStrictEqual(single.collectDiff(), [
                { op: 3 /* TestDiffOpType.Remove */, itemId: new TestId(['ctrlId', 'id-a']).toString() },
            ]);
            assert.deepStrictEqual([...single.tree.keys()].sort(), [
                single.root.id,
                new TestId(['ctrlId', 'id-b']).toString(),
            ]);
            assert.strictEqual(single.tree.size, 2);
        });
        test('adds new children', () => {
            single.expand(single.root.id, Infinity);
            single.collectDiff();
            const child = new TestItemImpl('ctrlId', 'id-ac', 'c', undefined);
            single.root.children.get('id-a').children.add(child);
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 0 /* TestItemExpandState.NotExpandable */,
                        item: convert.TestItem.from(child),
                    },
                },
            ]);
            assert.deepStrictEqual([...single.tree.values()].map((n) => n.actual.id).sort(), [
                single.root.id,
                'id-a',
                'id-aa',
                'id-ab',
                'id-ac',
                'id-b',
            ]);
            assert.strictEqual(single.tree.size, 6);
        });
        test('manages tags correctly', () => {
            single.expand(single.root.id, Infinity);
            single.collectDiff();
            const tag1 = new TestTag('tag1');
            const tag2 = new TestTag('tag2');
            const tag3 = new TestTag('tag3');
            const child = new TestItemImpl('ctrlId', 'id-ac', 'c', undefined);
            child.tags = [tag1, tag2];
            single.root.children.get('id-a').children.add(child);
            assert.deepStrictEqual(single.collectDiff(), [
                { op: 6 /* TestDiffOpType.AddTag */, tag: { id: 'ctrlId\0tag1' } },
                { op: 6 /* TestDiffOpType.AddTag */, tag: { id: 'ctrlId\0tag2' } },
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 0 /* TestItemExpandState.NotExpandable */,
                        item: convert.TestItem.from(child),
                    },
                },
            ]);
            child.tags = [tag2, tag3];
            assert.deepStrictEqual(single.collectDiff(), [
                { op: 6 /* TestDiffOpType.AddTag */, tag: { id: 'ctrlId\0tag3' } },
                {
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: new TestId(['ctrlId', 'id-a', 'id-ac']).toString(),
                        item: { tags: ['ctrlId\0tag2', 'ctrlId\0tag3'] },
                    },
                },
                { op: 7 /* TestDiffOpType.RemoveTag */, id: 'ctrlId\0tag1' },
            ]);
            const a = single.root.children.get('id-a');
            a.tags = [tag2];
            a.children.replace([]);
            assert.deepStrictEqual(single.collectDiff().filter((t) => t.op === 7 /* TestDiffOpType.RemoveTag */), [{ op: 7 /* TestDiffOpType.RemoveTag */, id: 'ctrlId\0tag3' }]);
        });
        test('replaces on uri change', () => {
            single.expand(single.root.id, Infinity);
            single.collectDiff();
            const oldA = single.root.children.get('id-a');
            const uri = single.root.children.get('id-a').uri?.with({ path: '/different' });
            const newA = new TestItemImpl('ctrlId', 'id-a', 'Hello world', uri);
            newA.children.replace([...oldA.children].map(([_, item]) => item));
            single.root.children.replace([...single.root.children].map(([id, i]) => (id === 'id-a' ? newA : i)));
            assert.deepStrictEqual(single.collectDiff(), [
                { op: 3 /* TestDiffOpType.Remove */, itemId: new TestId(['ctrlId', 'id-a']).toString() },
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 0 /* TestItemExpandState.NotExpandable */,
                        item: { ...convert.TestItem.from(newA) },
                    },
                },
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 0 /* TestItemExpandState.NotExpandable */,
                        item: convert.TestItem.from(newA.children.get('id-aa')),
                    },
                },
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 0 /* TestItemExpandState.NotExpandable */,
                        item: convert.TestItem.from(newA.children.get('id-ab')),
                    },
                },
            ]);
        });
        test('treats in-place replacement as mutation', () => {
            single.expand(single.root.id, Infinity);
            single.collectDiff();
            const oldA = single.root.children.get('id-a');
            const uri = single.root.children.get('id-a').uri;
            const newA = new TestItemImpl('ctrlId', 'id-a', 'Hello world', uri);
            newA.children.replace([...oldA.children].map(([_, item]) => item));
            single.root.children.replace([
                newA,
                new TestItemImpl('ctrlId', 'id-b', single.root.children.get('id-b').label, uri),
            ]);
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: new TestId(['ctrlId', 'id-a']).toString(),
                        item: { label: 'Hello world' },
                    },
                },
                {
                    op: 2 /* TestDiffOpType.DocumentSynced */,
                    docv: undefined,
                    uri: uri,
                },
            ]);
            newA.label = 'still connected';
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: new TestId(['ctrlId', 'id-a']).toString(),
                        item: { label: 'still connected' },
                    },
                },
            ]);
            oldA.label = 'no longer connected';
            assert.deepStrictEqual(single.collectDiff(), []);
        });
        suite('expandibility restoration', () => {
            const doReplace = async (canResolveChildren = true) => {
                const uri = single.root.children.get('id-a').uri;
                const newA = new TestItemImpl('ctrlId', 'id-a', 'Hello world', uri);
                newA.canResolveChildren = canResolveChildren;
                single.root.children.replace([
                    newA,
                    new TestItemImpl('ctrlId', 'id-b', single.root.children.get('id-b').label, uri),
                ]);
                await timeout(0); // drain microtasks
            };
            test('does not restore an unexpanded state', async () => {
                await single.expand(single.root.id, 0);
                assert.deepStrictEqual(resolveCalls, [undefined]);
                await doReplace();
                assert.deepStrictEqual(resolveCalls, [undefined]);
            });
            test('restores resolve state on replacement', async () => {
                await single.expand(single.root.id, Infinity);
                assert.deepStrictEqual(resolveCalls, [undefined, 'id-a']);
                await doReplace();
                assert.deepStrictEqual(resolveCalls, [undefined, 'id-a', 'id-a']);
            });
            test('does not expand if new child is not expandable', async () => {
                await single.expand(single.root.id, Infinity);
                assert.deepStrictEqual(resolveCalls, [undefined, 'id-a']);
                await doReplace(false);
                assert.deepStrictEqual(resolveCalls, [undefined, 'id-a']);
            });
        });
        test('treats in-place replacement as mutation deeply', () => {
            single.expand(single.root.id, Infinity);
            single.collectDiff();
            const oldA = single.root.children.get('id-a');
            const uri = oldA.uri;
            const newA = new TestItemImpl('ctrlId', 'id-a', single.root.children.get('id-a').label, uri);
            const oldAA = oldA.children.get('id-aa');
            const oldAB = oldA.children.get('id-ab');
            const newAB = new TestItemImpl('ctrlId', 'id-ab', 'Hello world', uri);
            newA.children.replace([oldAA, newAB]);
            single.root.children.replace([newA, single.root.children.get('id-b')]);
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: TestId.fromExtHostTestItem(oldAB, 'ctrlId').toString(),
                        item: { label: 'Hello world' },
                    },
                },
                {
                    op: 2 /* TestDiffOpType.DocumentSynced */,
                    docv: undefined,
                    uri: uri,
                },
            ]);
            oldAA.label = 'still connected1';
            newAB.label = 'still connected2';
            oldAB.label = 'not connected3';
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: new TestId(['ctrlId', 'id-a', 'id-aa']).toString(),
                        item: { label: 'still connected1' },
                    },
                },
                {
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: new TestId(['ctrlId', 'id-a', 'id-ab']).toString(),
                        item: { label: 'still connected2' },
                    },
                },
            ]);
            assert.strictEqual(newAB.parent, newA);
            assert.strictEqual(oldAA.parent, newA);
            assert.deepStrictEqual(newA.parent, undefined);
        });
        test('moves an item to be a new child', async () => {
            await single.expand(single.root.id, 0);
            single.collectDiff();
            const b = single.root.children.get('id-b');
            const a = single.root.children.get('id-a');
            a.children.add(b);
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 3 /* TestDiffOpType.Remove */,
                    itemId: new TestId(['ctrlId', 'id-b']).toString(),
                },
                {
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: 'ctrlId',
                        expand: 0 /* TestItemExpandState.NotExpandable */,
                        item: convert.TestItem.from(b),
                    },
                },
            ]);
            b.label = 'still connected';
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: new TestId(['ctrlId', 'id-a', 'id-b']).toString(),
                        item: { label: 'still connected' },
                    },
                },
            ]);
            assert.deepStrictEqual([...single.root.children].map(([_, item]) => item), [single.root.children.get('id-a')]);
            assert.deepStrictEqual(b.parent, a);
        });
        test('sends document sync events', async () => {
            await single.expand(single.root.id, 0);
            single.collectDiff();
            const a = single.root.children.get('id-a');
            a.range = new Range(new Position(0, 0), new Position(1, 0));
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 2 /* TestDiffOpType.DocumentSynced */,
                    docv: undefined,
                    uri: URI.file('/'),
                },
                {
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: new TestId(['ctrlId', 'id-a']).toString(),
                        item: {
                            range: editorRange.Range.lift({
                                endColumn: 1,
                                endLineNumber: 2,
                                startColumn: 1,
                                startLineNumber: 1,
                            }),
                        },
                    },
                },
            ]);
            // sends on replace even if it's a no-op
            a.range = a.range;
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 2 /* TestDiffOpType.DocumentSynced */,
                    docv: undefined,
                    uri: URI.file('/'),
                },
            ]);
            // sends on a child replacement
            const uri = URI.file('/');
            const a2 = new TestItemImpl('ctrlId', 'id-a', 'a', uri);
            a2.range = a.range;
            single.root.children.replace([a2, single.root.children.get('id-b')]);
            assert.deepStrictEqual(single.collectDiff(), [
                {
                    op: 2 /* TestDiffOpType.DocumentSynced */,
                    docv: undefined,
                    uri,
                },
            ]);
        });
    });
    suite('MirroredTestCollection', () => {
        // todo@connor4312: re-renable when we figure out what observing looks like we async children
        // 	let m: TestMirroredCollection;
        // 	setup(() => m = new TestMirroredCollection());
        // 	test('mirrors creation of the root', () => {
        // 		const tests = testStubs.nested();
        // 		single.addRoot(tests, 'pid');
        // 		single.expand(single.root.id, Infinity);
        // 		m.apply(single.collectDiff());
        // 		assertTreesEqual(m.rootTestItems[0], owned.getTestById(single.root.id)![1].actual);
        // 		assert.strictEqual(m.length, single.itemToInternal.size);
        // 	});
        // 	test('mirrors node deletion', () => {
        // 		const tests = testStubs.nested();
        // 		single.addRoot(tests, 'pid');
        // 		m.apply(single.collectDiff());
        // 		single.expand(single.root.id, Infinity);
        // 		tests.children!.splice(0, 1);
        // 		single.onItemChange(tests, 'pid');
        // 		single.expand(single.root.id, Infinity);
        // 		m.apply(single.collectDiff());
        // 		assertTreesEqual(m.rootTestItems[0], owned.getTestById(single.root.id)![1].actual);
        // 		assert.strictEqual(m.length, single.itemToInternal.size);
        // 	});
        // 	test('mirrors node addition', () => {
        // 		const tests = testStubs.nested();
        // 		single.addRoot(tests, 'pid');
        // 		m.apply(single.collectDiff());
        // 		tests.children![0].children!.push(stubTest('ac'));
        // 		single.onItemChange(tests, 'pid');
        // 		m.apply(single.collectDiff());
        // 		assertTreesEqual(m.rootTestItems[0], owned.getTestById(single.root.id)![1].actual);
        // 		assert.strictEqual(m.length, single.itemToInternal.size);
        // 	});
        // 	test('mirrors node update', () => {
        // 		const tests = testStubs.nested();
        // 		single.addRoot(tests, 'pid');
        // 		m.apply(single.collectDiff());
        // 		tests.children![0].description = 'Hello world'; /* item a */
        // 		single.onItemChange(tests, 'pid');
        // 		m.apply(single.collectDiff());
        // 		assertTreesEqual(m.rootTestItems[0], owned.getTestById(single.root.id)![1].actual);
        // 	});
        // 	suite('MirroredChangeCollector', () => {
        // 		let tests = testStubs.nested();
        // 		setup(() => {
        // 			tests = testStubs.nested();
        // 			single.addRoot(tests, 'pid');
        // 			m.apply(single.collectDiff());
        // 		});
        // 		test('creates change for root', () => {
        // 			assertTreeListEqual(m.changeEvent.added, [
        // 				tests,
        // 				tests.children[0],
        // 				tests.children![0].children![0],
        // 				tests.children![0].children![1],
        // 				tests.children[1],
        // 			]);
        // 			assertTreeListEqual(m.changeEvent.removed, []);
        // 			assertTreeListEqual(m.changeEvent.updated, []);
        // 		});
        // 		test('creates change for delete', () => {
        // 			const rm = tests.children.shift()!;
        // 			single.onItemChange(tests, 'pid');
        // 			m.apply(single.collectDiff());
        // 			assertTreeListEqual(m.changeEvent.added, []);
        // 			assertTreeListEqual(m.changeEvent.removed, [
        // 				{ ...rm },
        // 				{ ...rm.children![0] },
        // 				{ ...rm.children![1] },
        // 			]);
        // 			assertTreeListEqual(m.changeEvent.updated, []);
        // 		});
        // 		test('creates change for update', () => {
        // 			tests.children[0].label = 'updated!';
        // 			single.onItemChange(tests, 'pid');
        // 			m.apply(single.collectDiff());
        // 			assertTreeListEqual(m.changeEvent.added, []);
        // 			assertTreeListEqual(m.changeEvent.removed, []);
        // 			assertTreeListEqual(m.changeEvent.updated, [tests.children[0]]);
        // 		});
        // 		test('is a no-op if a node is added and removed', () => {
        // 			const nested = testStubs.nested('id2-');
        // 			tests.children.push(nested);
        // 			single.onItemChange(tests, 'pid');
        // 			tests.children.pop();
        // 			single.onItemChange(tests, 'pid');
        // 			const previousEvent = m.changeEvent;
        // 			m.apply(single.collectDiff());
        // 			assert.strictEqual(m.changeEvent, previousEvent);
        // 		});
        // 		test('is a single-op if a node is added and changed', () => {
        // 			const child = stubTest('c');
        // 			tests.children.push(child);
        // 			single.onItemChange(tests, 'pid');
        // 			child.label = 'd';
        // 			single.onItemChange(tests, 'pid');
        // 			m.apply(single.collectDiff());
        // 			assertTreeListEqual(m.changeEvent.added, [child]);
        // 			assertTreeListEqual(m.changeEvent.removed, []);
        // 			assertTreeListEqual(m.changeEvent.updated, []);
        // 		});
        // 		test('gets the common ancestor (1)', () => {
        // 			tests.children![0].children![0].label = 'za';
        // 			tests.children![0].children![1].label = 'zb';
        // 			single.onItemChange(tests, 'pid');
        // 			m.apply(single.collectDiff());
        // 		});
        // 		test('gets the common ancestor (2)', () => {
        // 			tests.children![0].children![0].label = 'za';
        // 			tests.children![1].label = 'ab';
        // 			single.onItemChange(tests, 'pid');
        // 			m.apply(single.collectDiff());
        // 		});
        // 	});
    });
    suite('TestRunTracker', () => {
        let proxy;
        let c;
        let cts;
        let configuration;
        let req;
        let dto;
        const ext = {};
        teardown(() => {
            for (const { id } of c.trackers) {
                c.disposeTestRun(id);
            }
        });
        setup(async () => {
            proxy = mockObject()();
            cts = new CancellationTokenSource();
            c = new TestRunCoordinator(proxy, new NullLogService());
            configuration = new TestRunProfileImpl(mockObject()(), new Map(), new Set(), Event.None, 'ctrlId', 42, 'Do Run', TestRunProfileKind.Run, () => { }, false);
            await single.expand(single.root.id, Infinity);
            single.collectDiff();
            req = {
                include: undefined,
                exclude: [single.root.children.get('id-b')],
                profile: configuration,
                preserveFocus: false,
            };
            dto = TestRunDto.fromInternal({
                controllerId: 'ctrl',
                profileId: configuration.profileId,
                excludeExtIds: ['id-b'],
                runId: 'run-id',
                testIds: [single.root.id],
            }, single);
        });
        test('tracks a run started from a main thread request', () => {
            const tracker = ds.add(c.prepareForMainThreadTestRun(ext, req, dto, configuration, cts.token));
            assert.strictEqual(tracker.hasRunningTasks, false);
            const task1 = c.createTestRun(ext, 'ctrl', single, req, 'run1', true);
            const task2 = c.createTestRun(ext, 'ctrl', single, req, 'run2', true);
            assert.strictEqual(proxy.$startedExtensionTestRun.called, false);
            assert.strictEqual(tracker.hasRunningTasks, true);
            task1.appendOutput('hello');
            const taskId = proxy.$appendOutputToRun.args[0]?.[1];
            assert.deepStrictEqual([['run-id', taskId, VSBuffer.fromString('hello'), undefined, undefined]], proxy.$appendOutputToRun.args);
            task1.end();
            assert.strictEqual(proxy.$finishedExtensionTestRun.called, false);
            assert.strictEqual(tracker.hasRunningTasks, true);
            task2.end();
            assert.strictEqual(proxy.$finishedExtensionTestRun.called, false);
            assert.strictEqual(tracker.hasRunningTasks, false);
        });
        test('run cancel force ends after a timeout', () => {
            const clock = sinon.useFakeTimers();
            try {
                const tracker = ds.add(c.prepareForMainThreadTestRun(ext, req, dto, configuration, cts.token));
                const task = c.createTestRun(ext, 'ctrl', single, req, 'run1', true);
                const onEnded = sinon.stub();
                ds.add(tracker.onEnd(onEnded));
                assert.strictEqual(task.token.isCancellationRequested, false);
                assert.strictEqual(tracker.hasRunningTasks, true);
                tracker.cancel();
                assert.strictEqual(task.token.isCancellationRequested, true);
                assert.strictEqual(tracker.hasRunningTasks, true);
                clock.tick(9999);
                assert.strictEqual(tracker.hasRunningTasks, true);
                assert.strictEqual(onEnded.called, false);
                clock.tick(1);
                assert.strictEqual(onEnded.called, true);
                assert.strictEqual(tracker.hasRunningTasks, false);
            }
            finally {
                clock.restore();
            }
        });
        test('run cancel force ends on second cancellation request', () => {
            const tracker = ds.add(c.prepareForMainThreadTestRun(ext, req, dto, configuration, cts.token));
            const task = c.createTestRun(ext, 'ctrl', single, req, 'run1', true);
            const onEnded = sinon.stub();
            ds.add(tracker.onEnd(onEnded));
            assert.strictEqual(task.token.isCancellationRequested, false);
            assert.strictEqual(tracker.hasRunningTasks, true);
            tracker.cancel();
            assert.strictEqual(task.token.isCancellationRequested, true);
            assert.strictEqual(tracker.hasRunningTasks, true);
            assert.strictEqual(onEnded.called, false);
            tracker.cancel();
            assert.strictEqual(tracker.hasRunningTasks, false);
            assert.strictEqual(onEnded.called, true);
        });
        test('tracks a run started from an extension request', () => {
            const task1 = c.createTestRun(ext, 'ctrl', single, req, 'hello world', false);
            const tracker = Iterable.first(c.trackers);
            assert.strictEqual(tracker.hasRunningTasks, true);
            assert.deepStrictEqual(proxy.$startedExtensionTestRun.args, [
                [
                    {
                        profile: { group: 2, id: 42 },
                        controllerId: 'ctrl',
                        id: tracker.id,
                        include: [single.root.id],
                        exclude: [new TestId(['ctrlId', 'id-b']).toString()],
                        persist: false,
                        continuous: false,
                        preserveFocus: false,
                    },
                ],
            ]);
            const task2 = c.createTestRun(ext, 'ctrl', single, req, 'run2', true);
            const task3Detached = c.createTestRun(ext, 'ctrl', single, { ...req }, 'task3Detached', true);
            task1.end();
            assert.strictEqual(proxy.$finishedExtensionTestRun.called, false);
            assert.strictEqual(tracker.hasRunningTasks, true);
            task2.end();
            assert.deepStrictEqual(proxy.$finishedExtensionTestRun.args, [[tracker.id]]);
            assert.strictEqual(tracker.hasRunningTasks, false);
            task3Detached.end();
        });
        test('adds tests to run smartly', () => {
            const task1 = c.createTestRun(ext, 'ctrlId', single, req, 'hello world', false);
            const tracker = Iterable.first(c.trackers);
            const expectedArgs = [];
            assert.deepStrictEqual(proxy.$addTestsToRun.args, expectedArgs);
            task1.passed(single.root.children.get('id-a').children.get('id-aa'));
            expectedArgs.push([
                'ctrlId',
                tracker.id,
                [
                    convert.TestItem.from(single.root),
                    convert.TestItem.from(single.root.children.get('id-a')),
                    convert.TestItem.from(single.root.children.get('id-a').children.get('id-aa')),
                ],
            ]);
            assert.deepStrictEqual(proxy.$addTestsToRun.args, expectedArgs);
            task1.enqueued(single.root.children.get('id-a').children.get('id-ab'));
            expectedArgs.push([
                'ctrlId',
                tracker.id,
                [
                    convert.TestItem.from(single.root.children.get('id-a')),
                    convert.TestItem.from(single.root.children.get('id-a').children.get('id-ab')),
                ],
            ]);
            assert.deepStrictEqual(proxy.$addTestsToRun.args, expectedArgs);
            task1.passed(single.root.children.get('id-a').children.get('id-ab'));
            assert.deepStrictEqual(proxy.$addTestsToRun.args, expectedArgs);
            task1.end();
        });
        test('adds test messages to run', () => {
            const test1 = new TestItemImpl('ctrlId', 'id-c', 'test c', URI.file('/testc.txt'));
            const test2 = new TestItemImpl('ctrlId', 'id-d', 'test d', URI.file('/testd.txt'));
            test1.range = test2.range = new Range(new Position(0, 0), new Position(1, 0));
            single.root.children.replace([test1, test2]);
            const task = c.createTestRun(ext, 'ctrlId', single, req, 'hello world', false);
            const message1 = new TestMessage('some message');
            message1.location = new Location(URI.file('/a.txt'), new Position(0, 0));
            task.failed(test1, message1);
            const args = proxy.$appendTestMessagesInRun.args[0];
            assert.deepStrictEqual(proxy.$appendTestMessagesInRun.args[0], [
                args[0],
                args[1],
                new TestId(['ctrlId', 'id-c']).toString(),
                [
                    {
                        message: 'some message',
                        type: 0 /* TestMessageType.Error */,
                        expected: undefined,
                        contextValue: undefined,
                        actual: undefined,
                        location: convert.location.from(message1.location),
                        stackTrace: undefined,
                    },
                ],
            ]);
            // should use test location as default
            task.failed(test2, new TestMessage('some message'));
            assert.deepStrictEqual(proxy.$appendTestMessagesInRun.args[1], [
                args[0],
                args[1],
                new TestId(['ctrlId', 'id-d']).toString(),
                [
                    {
                        message: 'some message',
                        type: 0 /* TestMessageType.Error */,
                        contextValue: undefined,
                        expected: undefined,
                        actual: undefined,
                        location: convert.location.from({ uri: test2.uri, range: test2.range }),
                        stackTrace: undefined,
                    },
                ],
            ]);
            task.end();
        });
        test('guards calls after runs are ended', () => {
            const task = c.createTestRun(ext, 'ctrl', single, req, 'hello world', false);
            task.end();
            task.failed(single.root, new TestMessage('some message'));
            task.appendOutput('output');
            assert.strictEqual(proxy.$addTestsToRun.called, false);
            assert.strictEqual(proxy.$appendOutputToRun.called, false);
            assert.strictEqual(proxy.$appendTestMessagesInRun.called, false);
        });
        test('sets state of test with identical local IDs (#131827)', () => {
            const testA = single.root.children.get('id-a');
            const testB = single.root.children.get('id-b');
            const childA = new TestItemImpl('ctrlId', 'id-child', 'child', undefined);
            testA.children.replace([childA]);
            const childB = new TestItemImpl('ctrlId', 'id-child', 'child', undefined);
            testB.children.replace([childB]);
            const task1 = c.createTestRun(ext, 'ctrl', single, new TestRunRequestImpl(), 'hello world', false);
            const tracker = Iterable.first(c.trackers);
            task1.passed(childA);
            task1.passed(childB);
            assert.deepStrictEqual(proxy.$addTestsToRun.args, [
                [
                    'ctrl',
                    tracker.id,
                    [single.root, testA, childA].map((t) => convert.TestItem.from(t)),
                ],
                [
                    'ctrl',
                    tracker.id,
                    [single.root, testB, childB].map((t) => convert.TestItem.from(t)),
                ],
            ]);
            task1.end();
        });
    });
    suite('service', () => {
        let ctrl;
        class TestExtHostTesting extends ExtHostTesting {
            getProfileInternalId(ctrl, profile) {
                for (const [id, p] of this.controllers.get(ctrl.id).profiles) {
                    if (profile === p) {
                        return id;
                    }
                }
                throw new Error('profile not found');
            }
        }
        setup(() => {
            const rpcProtocol = AnyCallRPCProtocol();
            ctrl = ds.add(new TestExtHostTesting(rpcProtocol, new NullLogService(), new ExtHostCommands(rpcProtocol, new NullLogService(), new (class extends mock() {
                onExtensionError() {
                    return true;
                }
            })()), new ExtHostDocumentsAndEditors(rpcProtocol, new NullLogService())));
        });
        test('exposes active profiles correctly', async () => {
            const extA = {
                ...nullExtensionDescription,
                identifier: new ExtensionIdentifier('ext.a'),
                enabledApiProposals: ['testingActiveProfile'],
            };
            const extB = {
                ...nullExtensionDescription,
                identifier: new ExtensionIdentifier('ext.b'),
                enabledApiProposals: ['testingActiveProfile'],
            };
            const ctrlA = ds.add(ctrl.createTestController(extA, 'a', 'ctrla'));
            const profAA = ds.add(ctrlA.createRunProfile('aa', TestRunProfileKind.Run, () => { }));
            const profAB = ds.add(ctrlA.createRunProfile('ab', TestRunProfileKind.Run, () => { }));
            const ctrlB = ds.add(ctrl.createTestController(extB, 'b', 'ctrlb'));
            const profBA = ds.add(ctrlB.createRunProfile('ba', TestRunProfileKind.Run, () => { }));
            const profBB = ds.add(ctrlB.createRunProfile('bb', TestRunProfileKind.Run, () => { }));
            const neverCalled = sinon.stub();
            // empty default state:
            assert.deepStrictEqual(profAA.isDefault, false);
            assert.deepStrictEqual(profBA.isDefault, false);
            assert.deepStrictEqual(profBB.isDefault, false);
            // fires a change event:
            const changeA = Event.toPromise(profAA.onDidChangeDefault);
            const changeBA = Event.toPromise(profBA.onDidChangeDefault);
            const changeBB = Event.toPromise(profBB.onDidChangeDefault);
            ds.add(profAB.onDidChangeDefault(neverCalled));
            assert.strictEqual(neverCalled.called, false);
            ctrl.$setDefaultRunProfiles({
                a: [ctrl.getProfileInternalId(ctrlA, profAA)],
                b: [ctrl.getProfileInternalId(ctrlB, profBA), ctrl.getProfileInternalId(ctrlB, profBB)],
            });
            assert.deepStrictEqual(await changeA, true);
            assert.deepStrictEqual(await changeBA, true);
            assert.deepStrictEqual(await changeBB, true);
            // updates internal state:
            assert.deepStrictEqual(profAA.isDefault, true);
            assert.deepStrictEqual(profBA.isDefault, true);
            assert.deepStrictEqual(profBB.isDefault, true);
            assert.deepStrictEqual(profAB.isDefault, false);
            // no-ops if equal
            ds.add(profAA.onDidChangeDefault(neverCalled));
            ctrl.$setDefaultRunProfiles({
                a: [ctrl.getProfileInternalId(ctrlA, profAA)],
            });
            assert.strictEqual(neverCalled.called, false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlc3RpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdFRlc3RpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBYyxNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sS0FBSyxXQUFXLE1BQU0seUNBQXlDLENBQUE7QUFDdEUsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFdkYsT0FBTyxFQUNOLGNBQWMsRUFDZCxr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
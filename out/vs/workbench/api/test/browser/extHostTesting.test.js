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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlc3RpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RUZXN0aW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQWMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEtBQUssV0FBVyxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RFLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXZGLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixr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
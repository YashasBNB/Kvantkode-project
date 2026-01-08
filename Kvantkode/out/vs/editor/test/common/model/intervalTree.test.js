/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IntervalNode, IntervalTree, SENTINEL, getNodeColor, intervalCompare, nodeAcceptEdit, setNodeStickiness, } from '../../../common/model/intervalTree.js';
const GENERATE_TESTS = false;
const TEST_COUNT = GENERATE_TESTS ? 10000 : 0;
const PRINT_TREE = false;
const MIN_INTERVAL_START = 1;
const MAX_INTERVAL_END = 100;
const MIN_INSERTS = 1;
const MAX_INSERTS = 30;
const MIN_CHANGE_CNT = 10;
const MAX_CHANGE_CNT = 20;
suite('IntervalTree 1', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class Interval {
        constructor(start, end) {
            this._intervalBrand = undefined;
            this.start = start;
            this.end = end;
        }
    }
    class Oracle {
        constructor() {
            this.intervals = [];
        }
        insert(interval) {
            this.intervals.push(interval);
            this.intervals.sort((a, b) => {
                if (a.start === b.start) {
                    return a.end - b.end;
                }
                return a.start - b.start;
            });
            return interval;
        }
        delete(interval) {
            for (let i = 0, len = this.intervals.length; i < len; i++) {
                if (this.intervals[i] === interval) {
                    this.intervals.splice(i, 1);
                    return;
                }
            }
        }
        search(interval) {
            const result = [];
            for (let i = 0, len = this.intervals.length; i < len; i++) {
                const int = this.intervals[i];
                if (int.start <= interval.end && int.end >= interval.start) {
                    result.push(int);
                }
            }
            return result;
        }
    }
    class TestState {
        constructor() {
            this._oracle = new Oracle();
            this._tree = new IntervalTree();
            this._lastNodeId = -1;
            this._treeNodes = [];
            this._oracleNodes = [];
        }
        acceptOp(op) {
            if (op.type === 'insert') {
                if (PRINT_TREE) {
                    console.log(`insert: {${JSON.stringify(new Interval(op.begin, op.end))}}`);
                }
                const nodeId = ++this._lastNodeId;
                this._treeNodes[nodeId] = new IntervalNode(null, op.begin, op.end);
                this._tree.insert(this._treeNodes[nodeId]);
                this._oracleNodes[nodeId] = this._oracle.insert(new Interval(op.begin, op.end));
            }
            else if (op.type === 'delete') {
                if (PRINT_TREE) {
                    console.log(`delete: {${JSON.stringify(this._oracleNodes[op.id])}}`);
                }
                this._tree.delete(this._treeNodes[op.id]);
                this._oracle.delete(this._oracleNodes[op.id]);
                this._treeNodes[op.id] = null;
                this._oracleNodes[op.id] = null;
            }
            else if (op.type === 'change') {
                this._tree.delete(this._treeNodes[op.id]);
                this._treeNodes[op.id].reset(0, op.begin, op.end, null);
                this._tree.insert(this._treeNodes[op.id]);
                this._oracle.delete(this._oracleNodes[op.id]);
                this._oracleNodes[op.id].start = op.begin;
                this._oracleNodes[op.id].end = op.end;
                this._oracle.insert(this._oracleNodes[op.id]);
            }
            else {
                const actualNodes = this._tree.intervalSearch(op.begin, op.end, 0, false, 0, false);
                const actual = actualNodes.map((n) => new Interval(n.cachedAbsoluteStart, n.cachedAbsoluteEnd));
                const expected = this._oracle.search(new Interval(op.begin, op.end));
                assert.deepStrictEqual(actual, expected);
                return;
            }
            if (PRINT_TREE) {
                printTree(this._tree);
            }
            assertTreeInvariants(this._tree);
            const actual = this._tree
                .getAllInOrder()
                .map((n) => new Interval(n.cachedAbsoluteStart, n.cachedAbsoluteEnd));
            const expected = this._oracle.intervals;
            assert.deepStrictEqual(actual, expected);
        }
        getExistingNodeId(index) {
            let currIndex = -1;
            for (let i = 0; i < this._treeNodes.length; i++) {
                if (this._treeNodes[i] === null) {
                    continue;
                }
                currIndex++;
                if (currIndex === index) {
                    return i;
                }
            }
            throw new Error('unexpected');
        }
    }
    function testIntervalTree(ops) {
        const state = new TestState();
        for (let i = 0; i < ops.length; i++) {
            state.acceptOp(ops[i]);
        }
    }
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function getRandomRange(min, max) {
        const begin = getRandomInt(min, max);
        let length;
        if (getRandomInt(1, 10) <= 2) {
            // large range
            length = getRandomInt(0, max - begin);
        }
        else {
            // small range
            length = getRandomInt(0, Math.min(max - begin, 10));
        }
        return [begin, begin + length];
    }
    class AutoTest {
        constructor() {
            this._ops = [];
            this._state = new TestState();
            this._insertCnt = getRandomInt(MIN_INSERTS, MAX_INSERTS);
            this._changeCnt = getRandomInt(MIN_CHANGE_CNT, MAX_CHANGE_CNT);
            this._deleteCnt = 0;
        }
        _doRandomInsert() {
            const range = getRandomRange(MIN_INTERVAL_START, MAX_INTERVAL_END);
            this._run({
                type: 'insert',
                begin: range[0],
                end: range[1],
            });
        }
        _doRandomDelete() {
            const idx = getRandomInt(Math.floor(this._deleteCnt / 2), this._deleteCnt - 1);
            this._run({
                type: 'delete',
                id: this._state.getExistingNodeId(idx),
            });
        }
        _doRandomChange() {
            const idx = getRandomInt(0, this._deleteCnt - 1);
            const range = getRandomRange(MIN_INTERVAL_START, MAX_INTERVAL_END);
            this._run({
                type: 'change',
                id: this._state.getExistingNodeId(idx),
                begin: range[0],
                end: range[1],
            });
        }
        run() {
            while (this._insertCnt > 0 || this._deleteCnt > 0 || this._changeCnt > 0) {
                if (this._insertCnt > 0) {
                    this._doRandomInsert();
                    this._insertCnt--;
                    this._deleteCnt++;
                }
                else if (this._changeCnt > 0) {
                    this._doRandomChange();
                    this._changeCnt--;
                }
                else {
                    this._doRandomDelete();
                    this._deleteCnt--;
                }
                // Let's also search for something...
                const searchRange = getRandomRange(MIN_INTERVAL_START, MAX_INTERVAL_END);
                this._run({
                    type: 'search',
                    begin: searchRange[0],
                    end: searchRange[1],
                });
            }
        }
        _run(op) {
            this._ops.push(op);
            this._state.acceptOp(op);
        }
        print() {
            console.log(`testIntervalTree(${JSON.stringify(this._ops)})`);
        }
    }
    suite('generated', () => {
        test('gen01', () => {
            testIntervalTree([
                { type: 'insert', begin: 28, end: 35 },
                { type: 'insert', begin: 52, end: 54 },
                { type: 'insert', begin: 63, end: 69 },
            ]);
        });
        test('gen02', () => {
            testIntervalTree([
                { type: 'insert', begin: 80, end: 89 },
                { type: 'insert', begin: 92, end: 100 },
                { type: 'insert', begin: 99, end: 99 },
            ]);
        });
        test('gen03', () => {
            testIntervalTree([
                { type: 'insert', begin: 89, end: 96 },
                { type: 'insert', begin: 71, end: 74 },
                { type: 'delete', id: 1 },
            ]);
        });
        test('gen04', () => {
            testIntervalTree([
                { type: 'insert', begin: 44, end: 46 },
                { type: 'insert', begin: 85, end: 88 },
                { type: 'delete', id: 0 },
            ]);
        });
        test('gen05', () => {
            testIntervalTree([
                { type: 'insert', begin: 82, end: 90 },
                { type: 'insert', begin: 69, end: 73 },
                { type: 'delete', id: 0 },
                { type: 'delete', id: 1 },
            ]);
        });
        test('gen06', () => {
            testIntervalTree([
                { type: 'insert', begin: 41, end: 63 },
                { type: 'insert', begin: 98, end: 98 },
                { type: 'insert', begin: 47, end: 51 },
                { type: 'delete', id: 2 },
            ]);
        });
        test('gen07', () => {
            testIntervalTree([
                { type: 'insert', begin: 24, end: 26 },
                { type: 'insert', begin: 11, end: 28 },
                { type: 'insert', begin: 27, end: 30 },
                { type: 'insert', begin: 80, end: 85 },
                { type: 'delete', id: 1 },
            ]);
        });
        test('gen08', () => {
            testIntervalTree([
                { type: 'insert', begin: 100, end: 100 },
                { type: 'insert', begin: 100, end: 100 },
            ]);
        });
        test('gen09', () => {
            testIntervalTree([
                { type: 'insert', begin: 58, end: 65 },
                { type: 'insert', begin: 82, end: 96 },
                { type: 'insert', begin: 58, end: 65 },
            ]);
        });
        test('gen10', () => {
            testIntervalTree([
                { type: 'insert', begin: 32, end: 40 },
                { type: 'insert', begin: 25, end: 29 },
                { type: 'insert', begin: 24, end: 32 },
            ]);
        });
        test('gen11', () => {
            testIntervalTree([
                { type: 'insert', begin: 25, end: 70 },
                { type: 'insert', begin: 99, end: 100 },
                { type: 'insert', begin: 46, end: 51 },
                { type: 'insert', begin: 57, end: 57 },
                { type: 'delete', id: 2 },
            ]);
        });
        test('gen12', () => {
            testIntervalTree([
                { type: 'insert', begin: 20, end: 26 },
                { type: 'insert', begin: 10, end: 18 },
                { type: 'insert', begin: 99, end: 99 },
                { type: 'insert', begin: 37, end: 59 },
                { type: 'delete', id: 2 },
            ]);
        });
        test('gen13', () => {
            testIntervalTree([
                { type: 'insert', begin: 3, end: 91 },
                { type: 'insert', begin: 57, end: 57 },
                { type: 'insert', begin: 35, end: 44 },
                { type: 'insert', begin: 72, end: 81 },
                { type: 'delete', id: 2 },
            ]);
        });
        test('gen14', () => {
            testIntervalTree([
                { type: 'insert', begin: 58, end: 61 },
                { type: 'insert', begin: 34, end: 35 },
                { type: 'insert', begin: 56, end: 62 },
                { type: 'insert', begin: 69, end: 78 },
                { type: 'delete', id: 0 },
            ]);
        });
        test('gen15', () => {
            testIntervalTree([
                { type: 'insert', begin: 63, end: 69 },
                { type: 'insert', begin: 17, end: 24 },
                { type: 'insert', begin: 3, end: 13 },
                { type: 'insert', begin: 84, end: 94 },
                { type: 'insert', begin: 18, end: 23 },
                { type: 'insert', begin: 96, end: 98 },
                { type: 'delete', id: 1 },
            ]);
        });
        test('gen16', () => {
            testIntervalTree([
                { type: 'insert', begin: 27, end: 27 },
                { type: 'insert', begin: 42, end: 87 },
                { type: 'insert', begin: 42, end: 49 },
                { type: 'insert', begin: 69, end: 71 },
                { type: 'insert', begin: 20, end: 27 },
                { type: 'insert', begin: 8, end: 9 },
                { type: 'insert', begin: 42, end: 49 },
                { type: 'delete', id: 1 },
            ]);
        });
        test('gen17', () => {
            testIntervalTree([
                { type: 'insert', begin: 21, end: 23 },
                { type: 'insert', begin: 83, end: 87 },
                { type: 'insert', begin: 56, end: 58 },
                { type: 'insert', begin: 1, end: 55 },
                { type: 'insert', begin: 56, end: 59 },
                { type: 'insert', begin: 58, end: 60 },
                { type: 'insert', begin: 56, end: 65 },
                { type: 'delete', id: 1 },
                { type: 'delete', id: 0 },
                { type: 'delete', id: 6 },
            ]);
        });
        test('gen18', () => {
            testIntervalTree([
                { type: 'insert', begin: 25, end: 25 },
                { type: 'insert', begin: 67, end: 79 },
                { type: 'delete', id: 0 },
                { type: 'search', begin: 65, end: 75 },
            ]);
        });
        test('force delta overflow', () => {
            // Search the IntervalNode ctor for FORCE_OVERFLOWING_TEST
            // to force that this test leads to a delta normalization
            testIntervalTree([
                { type: 'insert', begin: 686081138593427, end: 733009856502260 },
                { type: 'insert', begin: 591031326181669, end: 591031326181672 },
                { type: 'insert', begin: 940037682731896, end: 940037682731903 },
                { type: 'insert', begin: 598413641151120, end: 598413641151128 },
                { type: 'insert', begin: 800564156553344, end: 800564156553351 },
                { type: 'insert', begin: 894198957565481, end: 894198957565491 },
            ]);
        });
    });
    // TEST_COUNT = 0;
    // PRINT_TREE = true;
    for (let i = 0; i < TEST_COUNT; i++) {
        if (i % 100 === 0) {
            console.log(`TEST ${i + 1}/${TEST_COUNT}`);
        }
        const test = new AutoTest();
        try {
            test.run();
        }
        catch (err) {
            console.log(err);
            test.print();
            return;
        }
    }
    suite('searching', () => {
        function createCormenTree() {
            const r = new IntervalTree();
            const data = [
                [16, 21],
                [8, 9],
                [25, 30],
                [5, 8],
                [15, 23],
                [17, 19],
                [26, 26],
                [0, 3],
                [6, 10],
                [19, 20],
            ];
            data.forEach((int) => {
                const node = new IntervalNode(null, int[0], int[1]);
                r.insert(node);
            });
            return r;
        }
        const T = createCormenTree();
        function assertIntervalSearch(start, end, expected) {
            const actualNodes = T.intervalSearch(start, end, 0, false, 0, false);
            const actual = actualNodes.map((n) => [n.cachedAbsoluteStart, n.cachedAbsoluteEnd]);
            assert.deepStrictEqual(actual, expected);
        }
        test('cormen 1->2', () => {
            assertIntervalSearch(1, 2, [[0, 3]]);
        });
        test('cormen 4->8', () => {
            assertIntervalSearch(4, 8, [
                [5, 8],
                [6, 10],
                [8, 9],
            ]);
        });
        test('cormen 10->15', () => {
            assertIntervalSearch(10, 15, [
                [6, 10],
                [15, 23],
            ]);
        });
        test('cormen 21->25', () => {
            assertIntervalSearch(21, 25, [
                [15, 23],
                [16, 21],
                [25, 30],
            ]);
        });
        test('cormen 24->24', () => {
            assertIntervalSearch(24, 24, []);
        });
    });
});
suite('IntervalTree 2', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertNodeAcceptEdit(msg, nodeStart, nodeEnd, nodeStickiness, start, end, textLength, forceMoveMarkers, expectedNodeStart, expectedNodeEnd) {
        const node = new IntervalNode('', nodeStart, nodeEnd);
        setNodeStickiness(node, nodeStickiness);
        nodeAcceptEdit(node, start, end, textLength, forceMoveMarkers);
        assert.deepStrictEqual([node.start, node.end], [expectedNodeStart, expectedNodeEnd], msg);
    }
    test('nodeAcceptEdit', () => {
        // A. collapsed decoration
        {
            // no-op
            assertNodeAcceptEdit('A.000', 0, 0, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 0, false, 0, 0);
            assertNodeAcceptEdit('A.001', 0, 0, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 0, false, 0, 0);
            assertNodeAcceptEdit('A.002', 0, 0, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 0, false, 0, 0);
            assertNodeAcceptEdit('A.003', 0, 0, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 0, false, 0, 0);
            assertNodeAcceptEdit('A.004', 0, 0, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 0, true, 0, 0);
            assertNodeAcceptEdit('A.005', 0, 0, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 0, true, 0, 0);
            assertNodeAcceptEdit('A.006', 0, 0, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 0, true, 0, 0);
            assertNodeAcceptEdit('A.007', 0, 0, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 0, true, 0, 0);
            // insertion
            assertNodeAcceptEdit('A.008', 0, 0, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 1, false, 0, 1);
            assertNodeAcceptEdit('A.009', 0, 0, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 1, false, 1, 1);
            assertNodeAcceptEdit('A.010', 0, 0, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 1, false, 0, 0);
            assertNodeAcceptEdit('A.011', 0, 0, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 1, false, 1, 1);
            assertNodeAcceptEdit('A.012', 0, 0, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 1, true, 1, 1);
            assertNodeAcceptEdit('A.013', 0, 0, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 1, true, 1, 1);
            assertNodeAcceptEdit('A.014', 0, 0, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 1, true, 1, 1);
            assertNodeAcceptEdit('A.015', 0, 0, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 1, true, 1, 1);
        }
        // B. non collapsed decoration
        {
            // no-op
            assertNodeAcceptEdit('B.000', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 0, false, 0, 5);
            assertNodeAcceptEdit('B.001', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 0, false, 0, 5);
            assertNodeAcceptEdit('B.002', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 0, false, 0, 5);
            assertNodeAcceptEdit('B.003', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 0, false, 0, 5);
            assertNodeAcceptEdit('B.004', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 0, true, 0, 5);
            assertNodeAcceptEdit('B.005', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 0, true, 0, 5);
            assertNodeAcceptEdit('B.006', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 0, true, 0, 5);
            assertNodeAcceptEdit('B.007', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 0, true, 0, 5);
            // insertion at start
            assertNodeAcceptEdit('B.008', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 1, false, 0, 6);
            assertNodeAcceptEdit('B.009', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 1, false, 1, 6);
            assertNodeAcceptEdit('B.010', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 1, false, 0, 6);
            assertNodeAcceptEdit('B.011', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 1, false, 1, 6);
            assertNodeAcceptEdit('B.012', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 1, true, 1, 6);
            assertNodeAcceptEdit('B.013', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 1, true, 1, 6);
            assertNodeAcceptEdit('B.014', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 1, true, 1, 6);
            assertNodeAcceptEdit('B.015', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 1, true, 1, 6);
            // insertion in middle
            assertNodeAcceptEdit('B.016', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 2, 2, 1, false, 0, 6);
            assertNodeAcceptEdit('B.017', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 2, 2, 1, false, 0, 6);
            assertNodeAcceptEdit('B.018', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 2, 2, 1, false, 0, 6);
            assertNodeAcceptEdit('B.019', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 2, 2, 1, false, 0, 6);
            assertNodeAcceptEdit('B.020', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 2, 2, 1, true, 0, 6);
            assertNodeAcceptEdit('B.021', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 2, 2, 1, true, 0, 6);
            assertNodeAcceptEdit('B.022', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 2, 2, 1, true, 0, 6);
            assertNodeAcceptEdit('B.023', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 2, 2, 1, true, 0, 6);
            // insertion at end
            assertNodeAcceptEdit('B.024', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 5, 1, false, 0, 6);
            assertNodeAcceptEdit('B.025', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 5, 1, false, 0, 5);
            assertNodeAcceptEdit('B.026', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 5, 1, false, 0, 5);
            assertNodeAcceptEdit('B.027', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 5, 1, false, 0, 6);
            assertNodeAcceptEdit('B.028', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 5, 1, true, 0, 6);
            assertNodeAcceptEdit('B.029', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 5, 1, true, 0, 6);
            assertNodeAcceptEdit('B.030', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 5, 1, true, 0, 6);
            assertNodeAcceptEdit('B.031', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 5, 1, true, 0, 6);
            // replace with larger text until start
            assertNodeAcceptEdit('B.032', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 5, 2, false, 5, 11);
            assertNodeAcceptEdit('B.033', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 5, 2, false, 6, 11);
            assertNodeAcceptEdit('B.034', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 5, 2, false, 5, 11);
            assertNodeAcceptEdit('B.035', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 5, 2, false, 6, 11);
            assertNodeAcceptEdit('B.036', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 5, 2, true, 6, 11);
            assertNodeAcceptEdit('B.037', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 5, 2, true, 6, 11);
            assertNodeAcceptEdit('B.038', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 5, 2, true, 6, 11);
            assertNodeAcceptEdit('B.039', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 5, 2, true, 6, 11);
            // replace with smaller text until start
            assertNodeAcceptEdit('B.040', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 3, 5, 1, false, 4, 9);
            assertNodeAcceptEdit('B.041', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 3, 5, 1, false, 4, 9);
            assertNodeAcceptEdit('B.042', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 3, 5, 1, false, 4, 9);
            assertNodeAcceptEdit('B.043', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 3, 5, 1, false, 4, 9);
            assertNodeAcceptEdit('B.044', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 3, 5, 1, true, 4, 9);
            assertNodeAcceptEdit('B.045', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 3, 5, 1, true, 4, 9);
            assertNodeAcceptEdit('B.046', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 3, 5, 1, true, 4, 9);
            assertNodeAcceptEdit('B.047', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 3, 5, 1, true, 4, 9);
            // replace with larger text select start
            assertNodeAcceptEdit('B.048', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 3, false, 5, 11);
            assertNodeAcceptEdit('B.049', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 3, false, 5, 11);
            assertNodeAcceptEdit('B.050', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 3, false, 5, 11);
            assertNodeAcceptEdit('B.051', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 3, false, 5, 11);
            assertNodeAcceptEdit('B.052', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 3, true, 7, 11);
            assertNodeAcceptEdit('B.053', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 3, true, 7, 11);
            assertNodeAcceptEdit('B.054', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 3, true, 7, 11);
            assertNodeAcceptEdit('B.055', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 3, true, 7, 11);
            // replace with smaller text select start
            assertNodeAcceptEdit('B.056', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 1, false, 5, 9);
            assertNodeAcceptEdit('B.057', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 1, false, 5, 9);
            assertNodeAcceptEdit('B.058', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 1, false, 5, 9);
            assertNodeAcceptEdit('B.059', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 1, false, 5, 9);
            assertNodeAcceptEdit('B.060', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 1, true, 5, 9);
            assertNodeAcceptEdit('B.061', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 1, true, 5, 9);
            assertNodeAcceptEdit('B.062', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 1, true, 5, 9);
            assertNodeAcceptEdit('B.063', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 1, true, 5, 9);
            // replace with larger text from start
            assertNodeAcceptEdit('B.064', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 6, 2, false, 5, 11);
            assertNodeAcceptEdit('B.065', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 6, 2, false, 5, 11);
            assertNodeAcceptEdit('B.066', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 6, 2, false, 5, 11);
            assertNodeAcceptEdit('B.067', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 6, 2, false, 5, 11);
            assertNodeAcceptEdit('B.068', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 6, 2, true, 7, 11);
            assertNodeAcceptEdit('B.069', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 6, 2, true, 7, 11);
            assertNodeAcceptEdit('B.070', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 6, 2, true, 7, 11);
            assertNodeAcceptEdit('B.071', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 6, 2, true, 7, 11);
            // replace with smaller text from start
            assertNodeAcceptEdit('B.072', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 7, 1, false, 5, 9);
            assertNodeAcceptEdit('B.073', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 7, 1, false, 5, 9);
            assertNodeAcceptEdit('B.074', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 7, 1, false, 5, 9);
            assertNodeAcceptEdit('B.075', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 7, 1, false, 5, 9);
            assertNodeAcceptEdit('B.076', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 7, 1, true, 6, 9);
            assertNodeAcceptEdit('B.077', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 7, 1, true, 6, 9);
            assertNodeAcceptEdit('B.078', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 7, 1, true, 6, 9);
            assertNodeAcceptEdit('B.079', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 7, 1, true, 6, 9);
            // replace with larger text to end
            assertNodeAcceptEdit('B.080', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 10, 2, false, 5, 11);
            assertNodeAcceptEdit('B.081', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 10, 2, false, 5, 10);
            assertNodeAcceptEdit('B.082', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 10, 2, false, 5, 10);
            assertNodeAcceptEdit('B.083', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 10, 2, false, 5, 11);
            assertNodeAcceptEdit('B.084', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 10, 2, true, 5, 11);
            assertNodeAcceptEdit('B.085', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 10, 2, true, 5, 11);
            assertNodeAcceptEdit('B.086', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 10, 2, true, 5, 11);
            assertNodeAcceptEdit('B.087', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 10, 2, true, 5, 11);
            // replace with smaller text to end
            assertNodeAcceptEdit('B.088', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 8, 10, 1, false, 5, 9);
            assertNodeAcceptEdit('B.089', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 8, 10, 1, false, 5, 9);
            assertNodeAcceptEdit('B.090', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 8, 10, 1, false, 5, 9);
            assertNodeAcceptEdit('B.091', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 8, 10, 1, false, 5, 9);
            assertNodeAcceptEdit('B.092', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 8, 10, 1, true, 5, 9);
            assertNodeAcceptEdit('B.093', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 8, 10, 1, true, 5, 9);
            assertNodeAcceptEdit('B.094', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 8, 10, 1, true, 5, 9);
            assertNodeAcceptEdit('B.095', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 8, 10, 1, true, 5, 9);
            // replace with larger text select end
            assertNodeAcceptEdit('B.096', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.097', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.098', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.099', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.100', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 3, true, 5, 12);
            assertNodeAcceptEdit('B.101', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 3, true, 5, 12);
            assertNodeAcceptEdit('B.102', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 3, true, 5, 12);
            assertNodeAcceptEdit('B.103', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 3, true, 5, 12);
            // replace with smaller text select end
            assertNodeAcceptEdit('B.104', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 1, false, 5, 10);
            assertNodeAcceptEdit('B.105', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 1, false, 5, 10);
            assertNodeAcceptEdit('B.106', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 1, false, 5, 10);
            assertNodeAcceptEdit('B.107', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 1, false, 5, 10);
            assertNodeAcceptEdit('B.108', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 1, true, 5, 10);
            assertNodeAcceptEdit('B.109', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 1, true, 5, 10);
            assertNodeAcceptEdit('B.110', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 1, true, 5, 10);
            assertNodeAcceptEdit('B.111', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 1, true, 5, 10);
            // replace with larger text from end
            assertNodeAcceptEdit('B.112', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.113', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.114', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.115', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.116', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 11, 3, true, 5, 13);
            assertNodeAcceptEdit('B.117', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 11, 3, true, 5, 13);
            assertNodeAcceptEdit('B.118', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 11, 3, true, 5, 13);
            assertNodeAcceptEdit('B.119', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 11, 3, true, 5, 13);
            // replace with smaller text from end
            assertNodeAcceptEdit('B.120', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 12, 1, false, 5, 10);
            assertNodeAcceptEdit('B.121', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 12, 1, false, 5, 10);
            assertNodeAcceptEdit('B.122', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 12, 1, false, 5, 10);
            assertNodeAcceptEdit('B.123', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 12, 1, false, 5, 10);
            assertNodeAcceptEdit('B.124', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 12, 1, true, 5, 11);
            assertNodeAcceptEdit('B.125', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 12, 1, true, 5, 11);
            assertNodeAcceptEdit('B.126', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 12, 1, true, 5, 11);
            assertNodeAcceptEdit('B.127', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 12, 1, true, 5, 11);
            // delete until start
            assertNodeAcceptEdit('B.128', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 5, 0, false, 4, 9);
            assertNodeAcceptEdit('B.129', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 5, 0, false, 4, 9);
            assertNodeAcceptEdit('B.130', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 5, 0, false, 4, 9);
            assertNodeAcceptEdit('B.131', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 5, 0, false, 4, 9);
            assertNodeAcceptEdit('B.132', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 5, 0, true, 4, 9);
            assertNodeAcceptEdit('B.133', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 5, 0, true, 4, 9);
            assertNodeAcceptEdit('B.134', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 5, 0, true, 4, 9);
            assertNodeAcceptEdit('B.135', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 5, 0, true, 4, 9);
            // delete select start
            assertNodeAcceptEdit('B.136', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 0, false, 4, 8);
            assertNodeAcceptEdit('B.137', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 0, false, 4, 8);
            assertNodeAcceptEdit('B.138', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 0, false, 4, 8);
            assertNodeAcceptEdit('B.139', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 0, false, 4, 8);
            assertNodeAcceptEdit('B.140', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 0, true, 4, 8);
            assertNodeAcceptEdit('B.141', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 0, true, 4, 8);
            assertNodeAcceptEdit('B.142', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 0, true, 4, 8);
            assertNodeAcceptEdit('B.143', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 0, true, 4, 8);
            // delete from start
            assertNodeAcceptEdit('B.144', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 6, 0, false, 5, 9);
            assertNodeAcceptEdit('B.145', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 6, 0, false, 5, 9);
            assertNodeAcceptEdit('B.146', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 6, 0, false, 5, 9);
            assertNodeAcceptEdit('B.147', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 6, 0, false, 5, 9);
            assertNodeAcceptEdit('B.148', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 6, 0, true, 5, 9);
            assertNodeAcceptEdit('B.149', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 6, 0, true, 5, 9);
            assertNodeAcceptEdit('B.150', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 6, 0, true, 5, 9);
            assertNodeAcceptEdit('B.151', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 6, 0, true, 5, 9);
            // delete to end
            assertNodeAcceptEdit('B.152', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 10, 0, false, 5, 9);
            assertNodeAcceptEdit('B.153', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 10, 0, false, 5, 9);
            assertNodeAcceptEdit('B.154', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 10, 0, false, 5, 9);
            assertNodeAcceptEdit('B.155', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 10, 0, false, 5, 9);
            assertNodeAcceptEdit('B.156', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 10, 0, true, 5, 9);
            assertNodeAcceptEdit('B.157', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 10, 0, true, 5, 9);
            assertNodeAcceptEdit('B.158', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 10, 0, true, 5, 9);
            assertNodeAcceptEdit('B.159', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 10, 0, true, 5, 9);
            // delete select end
            assertNodeAcceptEdit('B.160', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 0, false, 5, 9);
            assertNodeAcceptEdit('B.161', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 0, false, 5, 9);
            assertNodeAcceptEdit('B.162', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 0, false, 5, 9);
            assertNodeAcceptEdit('B.163', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 0, false, 5, 9);
            assertNodeAcceptEdit('B.164', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 0, true, 5, 9);
            assertNodeAcceptEdit('B.165', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 0, true, 5, 9);
            assertNodeAcceptEdit('B.166', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 0, true, 5, 9);
            assertNodeAcceptEdit('B.167', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 0, true, 5, 9);
            // delete from end
            assertNodeAcceptEdit('B.168', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 11, 0, false, 5, 10);
            assertNodeAcceptEdit('B.169', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 11, 0, false, 5, 10);
            assertNodeAcceptEdit('B.170', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 11, 0, false, 5, 10);
            assertNodeAcceptEdit('B.171', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 11, 0, false, 5, 10);
            assertNodeAcceptEdit('B.172', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 11, 0, true, 5, 10);
            assertNodeAcceptEdit('B.173', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 11, 0, true, 5, 10);
            assertNodeAcceptEdit('B.174', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 11, 0, true, 5, 10);
            assertNodeAcceptEdit('B.175', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 11, 0, true, 5, 10);
            // replace with larger text entire
            assertNodeAcceptEdit('B.176', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 10, 3, false, 5, 8);
            assertNodeAcceptEdit('B.177', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 10, 3, false, 5, 8);
            assertNodeAcceptEdit('B.178', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 10, 3, false, 5, 8);
            assertNodeAcceptEdit('B.179', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 10, 3, false, 5, 8);
            assertNodeAcceptEdit('B.180', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 10, 3, true, 8, 8);
            assertNodeAcceptEdit('B.181', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 10, 3, true, 8, 8);
            assertNodeAcceptEdit('B.182', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 10, 3, true, 8, 8);
            assertNodeAcceptEdit('B.183', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 10, 3, true, 8, 8);
            // replace with smaller text entire
            assertNodeAcceptEdit('B.184', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 10, 7, false, 5, 12);
            assertNodeAcceptEdit('B.185', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 10, 7, false, 5, 10);
            assertNodeAcceptEdit('B.186', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 10, 7, false, 5, 10);
            assertNodeAcceptEdit('B.187', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 10, 7, false, 5, 12);
            assertNodeAcceptEdit('B.188', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 10, 7, true, 12, 12);
            assertNodeAcceptEdit('B.189', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 10, 7, true, 12, 12);
            assertNodeAcceptEdit('B.190', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 10, 7, true, 12, 12);
            assertNodeAcceptEdit('B.191', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 10, 7, true, 12, 12);
        }
    });
});
function printTree(T) {
    if (T.root === SENTINEL) {
        console.log(`~~ empty`);
        return;
    }
    const out = [];
    _printTree(T, T.root, '', 0, out);
    console.log(out.join(''));
}
function _printTree(T, n, indent, delta, out) {
    out.push(`${indent}[${getNodeColor(n) === 1 /* NodeColor.Red */ ? 'R' : 'B'},${n.delta}, ${n.start}->${n.end}, ${n.maxEnd}] : {${delta + n.start}->${delta + n.end}}, maxEnd: ${n.maxEnd + delta}\n`);
    if (n.left !== SENTINEL) {
        _printTree(T, n.left, indent + '    ', delta, out);
    }
    else {
        out.push(`${indent}    NIL\n`);
    }
    if (n.right !== SENTINEL) {
        _printTree(T, n.right, indent + '    ', delta + n.delta, out);
    }
    else {
        out.push(`${indent}    NIL\n`);
    }
}
//#region Assertion
function assertTreeInvariants(T) {
    assert(getNodeColor(SENTINEL) === 0 /* NodeColor.Black */);
    assert(SENTINEL.parent === SENTINEL);
    assert(SENTINEL.left === SENTINEL);
    assert(SENTINEL.right === SENTINEL);
    assert(SENTINEL.start === 0);
    assert(SENTINEL.end === 0);
    assert(SENTINEL.delta === 0);
    assert(T.root.parent === SENTINEL);
    assertValidTree(T);
}
function depth(n) {
    if (n === SENTINEL) {
        // The leafs are black
        return 1;
    }
    assert(depth(n.left) === depth(n.right));
    return (getNodeColor(n) === 0 /* NodeColor.Black */ ? 1 : 0) + depth(n.left);
}
function assertValidNode(n, delta) {
    if (n === SENTINEL) {
        return;
    }
    const l = n.left;
    const r = n.right;
    if (getNodeColor(n) === 1 /* NodeColor.Red */) {
        assert(getNodeColor(l) === 0 /* NodeColor.Black */);
        assert(getNodeColor(r) === 0 /* NodeColor.Black */);
    }
    let expectedMaxEnd = n.end;
    if (l !== SENTINEL) {
        assert(intervalCompare(l.start + delta, l.end + delta, n.start + delta, n.end + delta) <= 0);
        expectedMaxEnd = Math.max(expectedMaxEnd, l.maxEnd);
    }
    if (r !== SENTINEL) {
        assert(intervalCompare(n.start + delta, n.end + delta, r.start + delta + n.delta, r.end + delta + n.delta) <= 0);
        expectedMaxEnd = Math.max(expectedMaxEnd, r.maxEnd + n.delta);
    }
    assert(n.maxEnd === expectedMaxEnd);
    assertValidNode(l, delta);
    assertValidNode(r, delta + n.delta);
}
function assertValidTree(T) {
    if (T.root === SENTINEL) {
        return;
    }
    assert(getNodeColor(T.root) === 0 /* NodeColor.Black */);
    assert(depth(T.root.left) === depth(T.root.right));
    assertValidNode(T.root, 0);
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJ2YWxUcmVlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9pbnRlcnZhbFRyZWUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUNOLFlBQVksRUFDWixZQUFZLEVBRVosUUFBUSxFQUNSLFlBQVksRUFDWixlQUFlLEVBQ2YsY0FBYyxFQUNkLGlCQUFpQixHQUNqQixNQUFNLHVDQUF1QyxDQUFBO0FBRTlDLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQTtBQUM1QixNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQzdDLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQTtBQUN4QixNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtBQUM1QixNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQTtBQUM1QixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO0FBQ3RCLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQTtBQUN6QixNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUE7QUFFekIsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM1Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sUUFBUTtRQU1iLFlBQVksS0FBYSxFQUFFLEdBQVc7WUFMdEMsbUJBQWMsR0FBUyxTQUFTLENBQUE7WUFNL0IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7WUFDbEIsSUFBSSxDQUFDLEdBQUcs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QUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDckMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDckMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtnQkFDcEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDckMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7Z0JBQ3pCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2dCQUN6QixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTthQUN6QixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ2xCLGdCQUFnQixDQUFDO2dCQUNoQixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUN0QyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUN0QyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtnQkFDekIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTthQUN0QyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7WUFDakMsMERBQTBEO1lBQzFELHlEQUF5RDtZQUN6RCxnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRTtnQkFDaEUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRTtnQkFDaEUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRTtnQkFDaEUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRTtnQkFDaEUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRTtnQkFDaEUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRTthQUNoRSxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsa0JBQWtCO0lBQ2xCLHFCQUFxQjtJQUVyQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUE7UUFFM0IsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ1gsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2hCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUNaLE9BQU07UUFDUCxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLFNBQVMsZ0JBQWdCO1lBQ3hCLE1BQU0sQ0FBQyxHQUFHLElBQUksWUFBWSxFQUFFLENBQUE7WUFDNUIsTUFBTSxJQUFJLEdBQXVCO2dCQUNoQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7Z0JBQ1IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNOLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDUixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ04sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUNSLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDUixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7Z0JBQ1IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNOLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDUCxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7YUFDUixDQUFBO1lBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUNwQixNQUFNLElBQUksR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNwRCxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2YsQ0FBQyxDQUFDLENBQUE7WUFDRixPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFBO1FBRTVCLFNBQVMsb0JBQW9CLENBQUMsS0FBYSxFQUFFLEdBQVcsRUFBRSxRQUE0QjtZQUNyRixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDcEUsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDN0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFtQixDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FDckUsQ0FBQTtZQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtZQUN4QixvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7WUFDeEIsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDMUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNOLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDUCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDTixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1lBQzFCLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQzVCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDUCxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7YUFDUixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1lBQzFCLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQzVCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDUixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7Z0JBQ1IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO2FBQ1IsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtZQUMxQixvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLG9CQUFvQixDQUM1QixHQUFXLEVBQ1gsU0FBaUIsRUFDakIsT0FBZSxFQUNmLGNBQXNDLEVBQ3RDLEtBQWEsRUFDYixHQUFXLEVBQ1gsVUFBa0IsRUFDbEIsZ0JBQXlCLEVBQ3pCLGlCQUF5QixFQUN6QixlQUF1QjtRQUV2QixNQUFNLElBQUksR0FBRyxJQUFJLFlBQVksQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3JELGlCQUFpQixDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUN2QyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDMUYsQ0FBQztJQUVELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0IsMEJBQTBCO1FBQzFCLENBQUM7WUFDQSxRQUFRO1lBQ1Isb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywrREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw4REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw0REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywyREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywrREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw4REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw0REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywyREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0QsWUFBWTtZQUNaLG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsK0RBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsOERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsNERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsMkRBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsK0RBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsOERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsNERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsMkRBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCw4QkFBOEI7UUFDOUIsQ0FBQztZQUNBLFFBQVE7WUFDUixvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLCtEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDhEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDREQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDJEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLCtEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDhEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDREQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDJEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxxQkFBcUI7WUFDckIsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywrREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw4REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw0REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywyREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywrREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw4REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw0REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywyREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsc0JBQXNCO1lBQ3RCLG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsK0RBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsOERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsNERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsMkRBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsK0RBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsOERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsNERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsMkRBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG1CQUFtQjtZQUNuQixvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLCtEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDhEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDREQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDJEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLCtEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDhEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDREQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDJEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFFRCx1Q0FBdUM7WUFDdkMsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSwrREFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELEVBQUUsQ0FDRixDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSw4REFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELEVBQUUsQ0FDRixDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSw0REFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELEVBQUUsQ0FDRixDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSwyREFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELEVBQUUsQ0FDRixDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSwrREFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELEVBQUUsQ0FDRixDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSw4REFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVB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QUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDhEQUVGLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDREQUVGLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDJEQUVGLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFFRCxrQ0FBa0M7WUFDbEMsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSwrREFFRixDQUFDLEVBQ0QsRUFBRSxFQUNGLENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELEVBQUUsQ0FDRixDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSw4REFFRixDQUFDLEVBQ0QsRUFBRSxFQUNGLENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELEVBQUUsQ0FDRixDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSw0REFFRixDQUFDLEVBQ0QsRUFBRSxFQUNGLENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELEVBQUUsQ0FDRixDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSwyREFFRixDQUFDLEVBQ0QsRUFBRSxFQUNGLENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELEVBQUUsQ0FDRixDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSwrREFFRixD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RUFDRixDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsK0RBRUYsRUFBRSxFQUNGLEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsOERBRUYsRUFBRSxFQUNGLEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsNERBRUYsRUFBRSxFQUNGLEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsMkRBRUYsRUFBRSxFQUNGLEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELHFDQUFxQztZQUNyQyxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLCtEQUVGLEVBQUUsRUFDRixFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsRUFBRSxDQUNGLENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDhEQUVGLEVBQUUsRUFDRixFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsRUFBRSxDQUNGLENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDREQUVGLEVBQUUsRUFDRixFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsRUFBRSxDQUNGLENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxF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LENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsMkRBRUYsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsK0RBRUYsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsOERBRUYsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsNERBRUYsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsMkRBRUYsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUVELG9CQUFvQjtZQUNwQixvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLCtEQUVGLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDhEQUVGLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDREQUVGLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNE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Q0FBQyxFQUNELEVBQUUsNERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsMkRBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsK0RBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsOERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsNERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsMkRBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUVELGtCQUFrQjtZQUNsQixvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLCtEQUVGLEVBQUUsRUFDRixFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsRUFBRSxDQUNGLENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDhEQUVGLEVBQUUsRUFDRixFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsRUFBRSxDQUNGLENBQUE7WUFD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
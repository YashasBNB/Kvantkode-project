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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJ2YWxUcmVlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvaW50ZXJ2YWxUcmVlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFDTixZQUFZLEVBQ1osWUFBWSxFQUVaLFFBQVEsRUFDUixZQUFZLEVBQ1osZUFBZSxFQUNmLGNBQWMsRUFDZCxpQkFBaUIsR0FDakIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUE7QUFDNUIsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUM3QyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUE7QUFDeEIsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLENBQUE7QUFDNUIsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUE7QUFDNUIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFBO0FBQ3JCLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQTtBQUN0QixNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUE7QUFDekIsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFBO0FBRXpCLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLFFBQVE7UUFNYixZQUFZLEtBQWEsRUFBRSxHQUFXO1lBTHRDLG1CQUFjLEdBQVMsU0FBUyxDQUFBO1lBTS9CLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1lBQ2xCLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFBO1FBQ2YsQ0FBQztLQUNEO0lBRUQsTUFBTSxNQUFNO1FBR1g7WUFDQyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtRQUNwQixDQUFDO1FBRU0sTUFBTSxDQUFDLFFBQWtCO1lBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUM1QixJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUN6QixPQUFPLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQTtnQkFDckIsQ0FBQztnQkFDRCxPQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQTtZQUN6QixDQUFDLENBQUMsQ0FBQTtZQUNGLE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFFTSxNQUFNLENBQUMsUUFBa0I7WUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0QsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7b0JBQzNCLE9BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRU0sTUFBTSxDQUFDLFFBQWtCO1lBQy9CLE1BQU0sTUFBTSxHQUFlLEVBQUUsQ0FBQTtZQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUM3QixJQUFJLEdBQUcsQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDNUQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDakIsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7S0FDRDtJQUVELE1BQU0sU0FBUztRQUFmO1lBQ1MsWUFBTyxHQUFXLElBQUksTUFBTSxFQUFFLENBQUE7WUFDOUIsVUFBSyxHQUFpQixJQUFJLFlBQVksRUFBRSxDQUFBO1lBQ3hDLGdCQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDaEIsZUFBVSxHQUErQixFQUFFLENBQUE7WUFDM0MsaUJBQVksR0FBMkIsRUFBRSxDQUFBO1FBaUVsRCxDQUFDO1FBL0RPLFFBQVEsQ0FBQyxFQUFjO1lBQzdCLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQzNFLENBQUM7Z0JBQ0QsTUFBTSxNQUFNLEdBQUcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFBO2dCQUNqQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksWUFBWSxDQUFDLElBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDbkUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUUsQ0FBQyxDQUFBO2dCQUMzQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDaEYsQ0FBQztpQkFBTSxJQUFJLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ2pDLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNyRSxDQUFDO2dCQUNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBRSxDQUFDLENBQUE7Z0JBQzFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBRSxDQUFDLENBQUE7Z0JBRTlDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQTtnQkFDN0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFBO1lBQ2hDLENBQUM7aUJBQU0sSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUUsQ0FBQyxDQUFBO2dCQUMxQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFLLENBQUMsQ0FBQTtnQkFDekQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFFLENBQUMsQ0FBQTtnQkFFMUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFFLENBQUMsQ0FBQTtnQkFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFFLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUE7Z0JBQzFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFBO2dCQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUUsQ0FBQyxDQUFBO1lBQy9DLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ25GLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzdCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQy9ELENBQUE7Z0JBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQ3hDLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN0QixDQUFDO1lBRUQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBRWhDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLO2lCQUN2QixhQUFhLEVBQUU7aUJBQ2YsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtZQUN0RSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN6QyxDQUFDO1FBRU0saUJBQWlCLENBQUMsS0FBYTtZQUNyQyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNsQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDakQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUNqQyxTQUFRO2dCQUNULENBQUM7Z0JBQ0QsU0FBUyxFQUFFLENBQUE7Z0JBQ1gsSUFBSSxTQUFTLEtBQUssS0FBSyxFQUFFLENBQUM7b0JBQ3pCLE9BQU8sQ0FBQyxDQUFBO2dCQUNULENBQUM7WUFDRixDQUFDO1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QixDQUFDO0tBQ0Q7SUE0QkQsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFpQjtRQUMxQyxNQUFNLEtBQUssR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFBO1FBQzdCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDckMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsWUFBWSxDQUFDLEdBQVcsRUFBRSxHQUFXO1FBQzdDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO0lBQ3pELENBQUM7SUFFRCxTQUFTLGNBQWMsQ0FBQyxHQUFXLEVBQUUsR0FBVztRQUMvQyxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLElBQUksTUFBYyxDQUFBO1FBQ2xCLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM5QixjQUFjO1lBQ2QsTUFBTSxHQUFHLFlBQVksQ0FBQyxDQUFDLEVBQUUsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFBO1FBQ3RDLENBQUM7YUFBTSxDQUFDO1lBQ1AsY0FBYztZQUNkLE1BQU0sR0FBRyxZQUFZLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BELENBQUM7UUFDRCxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRUQsTUFBTSxRQUFRO1FBT2I7WUFOUSxTQUFJLEdBQWlCLEVBQUUsQ0FBQTtZQUN2QixXQUFNLEdBQWMsSUFBSSxTQUFTLEVBQUUsQ0FBQTtZQU0xQyxJQUFJLENBQUMsVUFBVSxHQUFHLFlBQVksQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDeEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQzlELElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFBO1FBQ3BCLENBQUM7UUFFTyxlQUFlO1lBQ3RCLE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ2xFLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ1QsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ2YsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDYixDQUFDLENBQUE7UUFDSCxDQUFDO1FBRU8sZUFBZTtZQUN0QixNQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDOUUsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDVCxJQUFJLEVBQUUsUUFBUTtnQkFDZCxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUM7YUFDdEMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVPLGVBQWU7WUFDdEIsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ2hELE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ2xFLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ1QsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDO2dCQUN0QyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDZixHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUNiLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFTSxHQUFHO1lBQ1QsT0FBTyxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMxRSxJQUFJLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtvQkFDdEIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO29CQUNqQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7Z0JBQ2xCLENBQUM7cUJBQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNoQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7b0JBQ3RCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtnQkFDbEIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtvQkFDdEIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO2dCQUNsQixDQUFDO2dCQUVELHFDQUFxQztnQkFDckMsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLGtCQUFrQixFQUFFLGdCQUFnQixDQUFDLENBQUE7Z0JBQ3hFLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQ3JCLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO2lCQUNuQixDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUVPLElBQUksQ0FBQyxFQUFjO1lBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3pCLENBQUM7UUFFTSxLQUFLO1lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzlELENBQUM7S0FDRDtJQUVELEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ2xCLGdCQUFnQixDQUFDO2dCQUNoQixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUN0QyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUN0QyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2FBQ3RDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7Z0JBQ3ZDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7YUFDdEMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7Z0JBQ3pCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2FBQ3pCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2FBQ3pCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2FBQ3pCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7Z0JBQ3hDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7YUFDeEMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTthQUN0QyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ2xCLGdCQUFnQixDQUFDO2dCQUNoQixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUN0QyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUN0QyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2FBQ3RDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7Z0JBQ3ZDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2FBQ3pCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2FBQ3pCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3JDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2FBQ3pCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2FBQ3pCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3JDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2FBQ3pCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7Z0JBQ3BDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2FBQ3pCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3JDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2dCQUN6QixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtnQkFDekIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUs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LENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQzNCLDBCQUEwQjtRQUMxQixDQUFDO1lBQ0EsUUFBUTtZQUNSLG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsK0RBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsOERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsNERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsMkRBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsK0RBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsOERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsNERBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELENBQUMsMkRBRUQsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELFlBQVk7WUFDWixvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLCtEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDhEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDREQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDJEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLCtEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDhEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDREQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDJEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsOEJBQThCO1FBQzlCLENBQUM7WUFDQSxRQUFRO1lBQ1Isb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywrREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw4REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw0REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywyREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywrREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw4REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw0REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFD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LENBQUMsRUFDRCxDQUFDLDREQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxDQUFDLDJEQUVELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxtQkFBbUI7WUFDbkIsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywrREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw4REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw0REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywyREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQywrREFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyw4REFFRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lB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QUNGLENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDhEQUVGLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsRUFBRSxDQUNGLENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDREQUVGLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsRUFBRSxDQUNGLENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDJEQUVGLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELElBQUksRUFDSixDQUFDLEVBQ0QsRUFBRSxDQUNGLENBQUE7WUFDRCx1Q0FBdUM7WUFDdkMsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSwrREFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSw4REFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSw0REFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSwyREFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSwrREFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSw4REFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSw0REFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBQ0Qsb0JBQW9CLENBQ25CLE9BQU8sRUFDUCxDQUFDLEVBQ0QsRUFBRSwyREFFRixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUFBO1lBRUQsa0NBQWtDO1lBQ2xDLG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsK0RBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsOERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsNERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsMkRBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsK0RBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsOERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsNERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsMkRBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxFQUFFLENBQ0YsQ0FBQTtZQUNELG1DQUFtQztZQUNuQyxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLCtEQUVGLENBQUMsRUFDRCxFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDhEQUVGLENBQUMsRUFDRCxFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDREQUVGLENBQUMsRUFDRCxFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDJEQUVGLENBQUMsRUFDRCxFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENB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LEVBQUUsRUFDRixDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsMkRBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsK0RBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsOERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsNERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsMkRBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUVELG9CQUFvQjtZQUNwQixvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLCtEQUVGLENBQUMsRUFDRCxFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDhEQUVGLENBQUMsRUFDRCxFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMs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RCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsNERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsMkRBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsK0RBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsOERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsNERBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG9CQUFvQixDQUNuQixPQUFPLEVBQ1AsQ0FBQyxFQUNELEVBQUUsMkRBRUYsQ0FBQyxFQUNELEVBQUUsRUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtZQUNELG1DQUFtQztZQUNuQyxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLCtEQUVGLENBQUMsRUFDRCxFQUFFLEVBQ0YsQ0FBQyxFQUNELEtBQUssRUFDTCxDQUFDLEVBQ0QsRUFBRSxDQUNGLENBQUE7WUFDRCxvQkFBb0IsQ0FDbkIsT0FBTyxFQUNQLENBQUMsRUFDRCxFQUFFLDhEQUVGLENBQUMsRUFDRCxFQUFFLEVBQ0YsQ0FB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
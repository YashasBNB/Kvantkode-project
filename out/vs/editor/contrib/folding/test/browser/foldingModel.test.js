/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { escapeRegExpCharacters } from '../../../../../base/common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EditOperation } from '../../../../common/core/editOperation.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { ModelDecorationOptions } from '../../../../common/model/textModel.js';
import { toSelectedLines } from '../../browser/folding.js';
import { FoldingModel, getNextFoldLine, getParentFoldLine, getPreviousFoldLine, setCollapseStateAtLevel, setCollapseStateForMatchingLines, setCollapseStateForRest, setCollapseStateLevelsDown, setCollapseStateLevelsUp, setCollapseStateUp, } from '../../browser/foldingModel.js';
import { computeRanges } from '../../browser/indentRangeProvider.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
export class TestDecorationProvider {
    static { this.collapsedDecoration = ModelDecorationOptions.register({
        description: 'test',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        linesDecorationsClassName: 'folding',
    }); }
    static { this.expandedDecoration = ModelDecorationOptions.register({
        description: 'test',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        linesDecorationsClassName: 'folding',
    }); }
    static { this.hiddenDecoration = ModelDecorationOptions.register({
        description: 'test',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        linesDecorationsClassName: 'folding',
    }); }
    constructor(model) {
        this.model = model;
    }
    getDecorationOption(isCollapsed, isHidden) {
        if (isHidden) {
            return TestDecorationProvider.hiddenDecoration;
        }
        if (isCollapsed) {
            return TestDecorationProvider.collapsedDecoration;
        }
        return TestDecorationProvider.expandedDecoration;
    }
    changeDecorations(callback) {
        return this.model.changeDecorations(callback);
    }
    removeDecorations(decorationIds) {
        this.model.changeDecorations((changeAccessor) => {
            changeAccessor.deltaDecorations(decorationIds, []);
        });
    }
    getDecorations() {
        const decorations = this.model.getAllDecorations();
        const res = [];
        for (const decoration of decorations) {
            if (decoration.options === TestDecorationProvider.hiddenDecoration) {
                res.push({ line: decoration.range.startLineNumber, type: 'hidden' });
            }
            else if (decoration.options === TestDecorationProvider.collapsedDecoration) {
                res.push({ line: decoration.range.startLineNumber, type: 'collapsed' });
            }
            else if (decoration.options === TestDecorationProvider.expandedDecoration) {
                res.push({ line: decoration.range.startLineNumber, type: 'expanded' });
            }
        }
        return res;
    }
}
suite('Folding Model', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function r(startLineNumber, endLineNumber, isCollapsed = false) {
        return { startLineNumber, endLineNumber, isCollapsed };
    }
    function d(line, type) {
        return { line, type };
    }
    function assertRegion(actual, expected, message) {
        assert.strictEqual(!!actual, !!expected, message);
        if (actual && expected) {
            assert.strictEqual(actual.startLineNumber, expected.startLineNumber, message);
            assert.strictEqual(actual.endLineNumber, expected.endLineNumber, message);
            assert.strictEqual(actual.isCollapsed, expected.isCollapsed, message);
        }
    }
    function assertFoldedRanges(foldingModel, expectedRegions, message) {
        const actualRanges = [];
        const actual = foldingModel.regions;
        for (let i = 0; i < actual.length; i++) {
            if (actual.isCollapsed(i)) {
                actualRanges.push(r(actual.getStartLineNumber(i), actual.getEndLineNumber(i)));
            }
        }
        assert.deepStrictEqual(actualRanges, expectedRegions, message);
    }
    function assertRanges(foldingModel, expectedRegions, message) {
        const actualRanges = [];
        const actual = foldingModel.regions;
        for (let i = 0; i < actual.length; i++) {
            actualRanges.push(r(actual.getStartLineNumber(i), actual.getEndLineNumber(i), actual.isCollapsed(i)));
        }
        assert.deepStrictEqual(actualRanges, expectedRegions, message);
    }
    function assertDecorations(foldingModel, expectedDecoration, message) {
        const decorationProvider = foldingModel.decorationProvider;
        assert.deepStrictEqual(decorationProvider.getDecorations(), expectedDecoration, message);
    }
    function assertRegions(actual, expectedRegions, message) {
        assert.deepStrictEqual(actual.map((r) => ({
            startLineNumber: r.startLineNumber,
            endLineNumber: r.endLineNumber,
            isCollapsed: r.isCollapsed,
        })), expectedRegions, message);
    }
    test('getRegionAtLine', () => {
        const lines = [
            /* 1*/ '/**',
            /* 2*/ ' * Comment',
            /* 3*/ ' */',
            /* 4*/ 'class A {',
            /* 5*/ '  void foo() {',
            /* 6*/ '    // comment {',
            /* 7*/ '  }',
            /* 8*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 3, false);
            const r2 = r(4, 7, false);
            const r3 = r(5, 6, false);
            assertRanges(foldingModel, [r1, r2, r3]);
            assertRegion(foldingModel.getRegionAtLine(1), r1, '1');
            assertRegion(foldingModel.getRegionAtLine(2), r1, '2');
            assertRegion(foldingModel.getRegionAtLine(3), r1, '3');
            assertRegion(foldingModel.getRegionAtLine(4), r2, '4');
            assertRegion(foldingModel.getRegionAtLine(5), r3, '5');
            assertRegion(foldingModel.getRegionAtLine(6), r3, '5');
            assertRegion(foldingModel.getRegionAtLine(7), r2, '6');
            assertRegion(foldingModel.getRegionAtLine(8), null, '7');
        }
        finally {
            textModel.dispose();
        }
    });
    test('collapse', () => {
        const lines = [
            /* 1*/ '/**',
            /* 2*/ ' * Comment',
            /* 3*/ ' */',
            /* 4*/ 'class A {',
            /* 5*/ '  void foo() {',
            /* 6*/ '    // comment {',
            /* 7*/ '  }',
            /* 8*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 3, false);
            const r2 = r(4, 7, false);
            const r3 = r(5, 6, false);
            assertRanges(foldingModel, [r1, r2, r3]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(1)]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r(1, 3, true), r2, r3]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(5)]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r(1, 3, true), r2, r(5, 6, true)]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(7)]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r(1, 3, true), r(4, 7, true), r(5, 6, true)]);
            textModel.dispose();
        }
        finally {
            textModel.dispose();
        }
    });
    test('update', () => {
        const lines = [
            /* 1*/ '/**',
            /* 2*/ ' * Comment',
            /* 3*/ ' */',
            /* 4*/ 'class A {',
            /* 5*/ '  void foo() {',
            /* 6*/ '    // comment {',
            /* 7*/ '  }',
            /* 8*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 3, false);
            const r2 = r(4, 7, false);
            const r3 = r(5, 6, false);
            assertRanges(foldingModel, [r1, r2, r3]);
            foldingModel.toggleCollapseState([
                foldingModel.getRegionAtLine(2),
                foldingModel.getRegionAtLine(5),
            ]);
            textModel.applyEdits([EditOperation.insert(new Position(4, 1), '//hello\n')]);
            foldingModel.update(computeRanges(textModel, false, undefined));
            assertRanges(foldingModel, [r(1, 3, true), r(5, 8, false), r(6, 7, true)]);
        }
        finally {
            textModel.dispose();
        }
    });
    test('delete', () => {
        const lines = [
            /* 1*/ 'function foo() {',
            /* 2*/ '  switch (x) {',
            /* 3*/ '    case 1:',
            /* 4*/ '      //hello1',
            /* 5*/ '      break;',
            /* 6*/ '    case 2:',
            /* 7*/ '      //hello2',
            /* 8*/ '      break;',
            /* 9*/ '    case 3:',
            /* 10*/ '      //hello3',
            /* 11*/ '      break;',
            /* 12*/ '  }',
            /* 13*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 12, false);
            const r2 = r(2, 11, false);
            const r3 = r(3, 5, false);
            const r4 = r(6, 8, false);
            const r5 = r(9, 11, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(6)]);
            textModel.applyEdits([EditOperation.delete(new Range(6, 11, 9, 0))]);
            foldingModel.update(computeRanges(textModel, true, undefined), toSelectedLines([new Selection(7, 1, 7, 1)]));
            assertRanges(foldingModel, [r(1, 9, false), r(2, 8, false), r(3, 5, false), r(6, 8, false)]);
        }
        finally {
            textModel.dispose();
        }
    });
    test('getRegionsInside', () => {
        const lines = [
            /* 1*/ '/**',
            /* 2*/ ' * Comment',
            /* 3*/ ' */',
            /* 4*/ 'class A {',
            /* 5*/ '  void foo() {',
            /* 6*/ '    // comment {',
            /* 7*/ '  }',
            /* 8*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 3, false);
            const r2 = r(4, 7, false);
            const r3 = r(5, 6, false);
            assertRanges(foldingModel, [r1, r2, r3]);
            const region1 = foldingModel.getRegionAtLine(r1.startLineNumber);
            const region2 = foldingModel.getRegionAtLine(r2.startLineNumber);
            const region3 = foldingModel.getRegionAtLine(r3.startLineNumber);
            assertRegions(foldingModel.getRegionsInside(null), [r1, r2, r3], '1');
            assertRegions(foldingModel.getRegionsInside(region1), [], '2');
            assertRegions(foldingModel.getRegionsInside(region2), [r3], '3');
            assertRegions(foldingModel.getRegionsInside(region3), [], '4');
        }
        finally {
            textModel.dispose();
        }
    });
    test('getRegionsInsideWithLevel', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '    if (true) {',
            /* 9*/ '      return;',
            /* 10*/ '    }',
            /* 11*/ '  }',
            /* 12*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, {
                start: /^\/\/#region$/,
                end: /^\/\/#endregion$/,
            });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 11, false);
            const r3 = r(4, 10, false);
            const r4 = r(5, 6, false);
            const r5 = r(8, 9, false);
            const region1 = foldingModel.getRegionAtLine(r1.startLineNumber);
            const region2 = foldingModel.getRegionAtLine(r2.startLineNumber);
            const region3 = foldingModel.getRegionAtLine(r3.startLineNumber);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            assertRegions(foldingModel.getRegionsInside(null, (r, level) => level === 1), [r1, r2], '1');
            assertRegions(foldingModel.getRegionsInside(null, (r, level) => level === 2), [r3], '2');
            assertRegions(foldingModel.getRegionsInside(null, (r, level) => level === 3), [r4, r5], '3');
            assertRegions(foldingModel.getRegionsInside(region2, (r, level) => level === 1), [r3], '4');
            assertRegions(foldingModel.getRegionsInside(region2, (r, level) => level === 2), [r4, r5], '5');
            assertRegions(foldingModel.getRegionsInside(region3, (r, level) => level === 1), [r4, r5], '6');
            assertRegions(foldingModel.getRegionsInside(region2, (r, level) => r.hidesLine(9)), [r3, r5], '7');
            assertRegions(foldingModel.getRegionsInside(region1, (r, level) => level === 1), [], '8');
        }
        finally {
            textModel.dispose();
        }
    });
    test('getRegionAtLine2', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ 'class A {',
            /* 3*/ '  void foo() {',
            /* 4*/ '    if (true) {',
            /* 5*/ '      //hello',
            /* 6*/ '    }',
            /* 7*/ '',
            /* 8*/ '  }',
            /* 9*/ '}',
            /* 10*/ '//#endregion',
            /* 11*/ '',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, {
                start: /^\/\/#region$/,
                end: /^\/\/#endregion$/,
            });
            foldingModel.update(ranges);
            const r1 = r(1, 10, false);
            const r2 = r(2, 8, false);
            const r3 = r(3, 7, false);
            const r4 = r(4, 5, false);
            assertRanges(foldingModel, [r1, r2, r3, r4]);
            assertRegions(foldingModel.getAllRegionsAtLine(1), [r1], '1');
            assertRegions(foldingModel.getAllRegionsAtLine(2), [r1, r2].reverse(), '2');
            assertRegions(foldingModel.getAllRegionsAtLine(3), [r1, r2, r3].reverse(), '3');
            assertRegions(foldingModel.getAllRegionsAtLine(4), [r1, r2, r3, r4].reverse(), '4');
            assertRegions(foldingModel.getAllRegionsAtLine(5), [r1, r2, r3, r4].reverse(), '5');
            assertRegions(foldingModel.getAllRegionsAtLine(6), [r1, r2, r3].reverse(), '6');
            assertRegions(foldingModel.getAllRegionsAtLine(7), [r1, r2, r3].reverse(), '7');
            assertRegions(foldingModel.getAllRegionsAtLine(8), [r1, r2].reverse(), '8');
            assertRegions(foldingModel.getAllRegionsAtLine(9), [r1], '9');
            assertRegions(foldingModel.getAllRegionsAtLine(10), [r1], '10');
            assertRegions(foldingModel.getAllRegionsAtLine(11), [], '10');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateRecursivly', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, {
                start: /^\/\/#region$/,
                end: /^\/\/#endregion$/,
            });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 12, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            setCollapseStateLevelsDown(foldingModel, true, Number.MAX_VALUE, [4]);
            assertFoldedRanges(foldingModel, [r3, r4, r5], '1');
            setCollapseStateLevelsDown(foldingModel, false, Number.MAX_VALUE, [8]);
            assertFoldedRanges(foldingModel, [], '2');
            setCollapseStateLevelsDown(foldingModel, true, Number.MAX_VALUE, [12]);
            assertFoldedRanges(foldingModel, [r2, r3, r4, r5], '1');
            setCollapseStateLevelsDown(foldingModel, false, Number.MAX_VALUE, [7]);
            assertFoldedRanges(foldingModel, [r2], '1');
            setCollapseStateLevelsDown(foldingModel, false);
            assertFoldedRanges(foldingModel, [], '1');
            setCollapseStateLevelsDown(foldingModel, true);
            assertFoldedRanges(foldingModel, [r1, r2, r3, r4, r5], '1');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateAtLevel', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '  //#region',
            /* 14*/ '  const bar = 9;',
            /* 15*/ '  //#endregion',
            /* 16*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, {
                start: /^\s*\/\/#region$/,
                end: /^\s*\/\/#endregion$/,
            });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 15, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            const r6 = r(13, 15, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5, r6]);
            setCollapseStateAtLevel(foldingModel, 1, true, []);
            assertFoldedRanges(foldingModel, [r1, r2], '1');
            setCollapseStateAtLevel(foldingModel, 1, false, [5]);
            assertFoldedRanges(foldingModel, [r2], '2');
            setCollapseStateAtLevel(foldingModel, 1, false, [1]);
            assertFoldedRanges(foldingModel, [], '3');
            setCollapseStateAtLevel(foldingModel, 2, true, []);
            assertFoldedRanges(foldingModel, [r3, r6], '4');
            setCollapseStateAtLevel(foldingModel, 2, false, [5, 6]);
            assertFoldedRanges(foldingModel, [r3], '5');
            setCollapseStateAtLevel(foldingModel, 3, true, [4, 9]);
            assertFoldedRanges(foldingModel, [r3, r4], '6');
            setCollapseStateAtLevel(foldingModel, 3, false, [4, 9]);
            assertFoldedRanges(foldingModel, [r3], '7');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateLevelsDown', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, {
                start: /^\/\/#region$/,
                end: /^\/\/#endregion$/,
            });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 12, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            setCollapseStateLevelsDown(foldingModel, true, 1, [4]);
            assertFoldedRanges(foldingModel, [r3], '1');
            setCollapseStateLevelsDown(foldingModel, true, 2, [4]);
            assertFoldedRanges(foldingModel, [r3, r4, r5], '2');
            setCollapseStateLevelsDown(foldingModel, false, 2, [3]);
            assertFoldedRanges(foldingModel, [r4, r5], '3');
            setCollapseStateLevelsDown(foldingModel, false, 2, [2]);
            assertFoldedRanges(foldingModel, [r4, r5], '4');
            setCollapseStateLevelsDown(foldingModel, true, 4, [2]);
            assertFoldedRanges(foldingModel, [r1, r4, r5], '5');
            setCollapseStateLevelsDown(foldingModel, false, 4, [2, 3]);
            assertFoldedRanges(foldingModel, [], '6');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateLevelsUp', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, {
                start: /^\/\/#region$/,
                end: /^\/\/#endregion$/,
            });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 12, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            setCollapseStateLevelsUp(foldingModel, true, 1, [4]);
            assertFoldedRanges(foldingModel, [r3], '1');
            setCollapseStateLevelsUp(foldingModel, true, 2, [4]);
            assertFoldedRanges(foldingModel, [r2, r3], '2');
            setCollapseStateLevelsUp(foldingModel, false, 4, [1, 3, 4]);
            assertFoldedRanges(foldingModel, [], '3');
            setCollapseStateLevelsUp(foldingModel, true, 2, [10]);
            assertFoldedRanges(foldingModel, [r3, r5], '4');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateUp', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, {
                start: /^\/\/#region$/,
                end: /^\/\/#endregion$/,
            });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 12, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            setCollapseStateUp(foldingModel, true, [5]);
            assertFoldedRanges(foldingModel, [r4], '1');
            setCollapseStateUp(foldingModel, true, [5]);
            assertFoldedRanges(foldingModel, [r3, r4], '2');
            setCollapseStateUp(foldingModel, true, [4]);
            assertFoldedRanges(foldingModel, [r2, r3, r4], '2');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateForMatchingLines', () => {
        const lines = [
            /* 1*/ '/**',
            /* 2*/ ' * the class',
            /* 3*/ ' */',
            /* 4*/ 'class A {',
            /* 5*/ '  /**',
            /* 6*/ '   * the foo',
            /* 7*/ '   */',
            /* 8*/ '  void foo() {',
            /* 9*/ '    /*',
            /* 10*/ '     * the comment',
            /* 11*/ '     */',
            /* 12*/ '  }',
            /* 13*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, {
                start: /^\/\/#region$/,
                end: /^\/\/#endregion$/,
            });
            foldingModel.update(ranges);
            const r1 = r(1, 3, false);
            const r2 = r(4, 12, false);
            const r3 = r(5, 7, false);
            const r4 = r(8, 11, false);
            const r5 = r(9, 11, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            const regExp = new RegExp('^\\s*' + escapeRegExpCharacters('/*'));
            setCollapseStateForMatchingLines(foldingModel, regExp, true);
            assertFoldedRanges(foldingModel, [r1, r3, r5], '1');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateForRest', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, {
                start: /^\/\/#region$/,
                end: /^\/\/#endregion$/,
            });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 12, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            setCollapseStateForRest(foldingModel, true, [5]);
            assertFoldedRanges(foldingModel, [r1, r5], '1');
            setCollapseStateForRest(foldingModel, false, [5]);
            assertFoldedRanges(foldingModel, [], '2');
            setCollapseStateForRest(foldingModel, true, [1]);
            assertFoldedRanges(foldingModel, [r2, r3, r4, r5], '3');
            setCollapseStateForRest(foldingModel, true, [3]);
            assertFoldedRanges(foldingModel, [r1, r2, r3, r4, r5], '3');
        }
        finally {
            textModel.dispose();
        }
    });
    test('folding decoration', () => {
        const lines = [
            /* 1*/ 'class A {',
            /* 2*/ '  void foo() {',
            /* 3*/ '    if (true) {',
            /* 4*/ '      hoo();',
            /* 5*/ '    }',
            /* 6*/ '  }',
            /* 7*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 6, false);
            const r2 = r(2, 5, false);
            const r3 = r(3, 4, false);
            assertRanges(foldingModel, [r1, r2, r3]);
            assertDecorations(foldingModel, [d(1, 'expanded'), d(2, 'expanded'), d(3, 'expanded')]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(2)]);
            assertRanges(foldingModel, [r1, r(2, 5, true), r3]);
            assertDecorations(foldingModel, [d(1, 'expanded'), d(2, 'collapsed'), d(3, 'hidden')]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r1, r(2, 5, true), r3]);
            assertDecorations(foldingModel, [d(1, 'expanded'), d(2, 'collapsed'), d(3, 'hidden')]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(1)]);
            assertRanges(foldingModel, [r(1, 6, true), r(2, 5, true), r3]);
            assertDecorations(foldingModel, [d(1, 'collapsed'), d(2, 'hidden'), d(3, 'hidden')]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r(1, 6, true), r(2, 5, true), r3]);
            assertDecorations(foldingModel, [d(1, 'collapsed'), d(2, 'hidden'), d(3, 'hidden')]);
            foldingModel.toggleCollapseState([
                foldingModel.getRegionAtLine(1),
                foldingModel.getRegionAtLine(3),
            ]);
            assertRanges(foldingModel, [r1, r(2, 5, true), r(3, 4, true)]);
            assertDecorations(foldingModel, [d(1, 'expanded'), d(2, 'collapsed'), d(3, 'hidden')]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r1, r(2, 5, true), r(3, 4, true)]);
            assertDecorations(foldingModel, [d(1, 'expanded'), d(2, 'collapsed'), d(3, 'hidden')]);
            textModel.dispose();
        }
        finally {
            textModel.dispose();
        }
    });
    test('fold jumping', () => {
        const lines = [
            /* 1*/ 'class A {',
            /* 2*/ '  void foo() {',
            /* 3*/ '    if (1) {',
            /* 4*/ '      a();',
            /* 5*/ '    } else if (2) {',
            /* 6*/ '      if (true) {',
            /* 7*/ '        b();',
            /* 8*/ '      }',
            /* 9*/ '    } else {',
            /* 10*/ '      c();',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 12, false);
            const r2 = r(2, 11, false);
            const r3 = r(3, 4, false);
            const r4 = r(5, 8, false);
            const r5 = r(6, 7, false);
            const r6 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5, r6]);
            // Test jump to parent.
            assert.strictEqual(getParentFoldLine(7, foldingModel), 6);
            assert.strictEqual(getParentFoldLine(6, foldingModel), 5);
            assert.strictEqual(getParentFoldLine(5, foldingModel), 2);
            assert.strictEqual(getParentFoldLine(2, foldingModel), 1);
            assert.strictEqual(getParentFoldLine(1, foldingModel), null);
            // Test jump to previous.
            assert.strictEqual(getPreviousFoldLine(10, foldingModel), 9);
            assert.strictEqual(getPreviousFoldLine(9, foldingModel), 5);
            assert.strictEqual(getPreviousFoldLine(5, foldingModel), 3);
            assert.strictEqual(getPreviousFoldLine(3, foldingModel), null);
            // Test when not on a folding region start line.
            assert.strictEqual(getPreviousFoldLine(4, foldingModel), 3);
            assert.strictEqual(getPreviousFoldLine(7, foldingModel), 6);
            assert.strictEqual(getPreviousFoldLine(8, foldingModel), 6);
            // Test jump to next.
            assert.strictEqual(getNextFoldLine(3, foldingModel), 5);
            assert.strictEqual(getNextFoldLine(5, foldingModel), 9);
            assert.strictEqual(getNextFoldLine(9, foldingModel), null);
            // Test when not on a folding region start line.
            assert.strictEqual(getNextFoldLine(4, foldingModel), 5);
            assert.strictEqual(getNextFoldLine(7, foldingModel), 9);
            assert.strictEqual(getNextFoldLine(8, foldingModel), 9);
        }
        finally {
            textModel.dispose();
        }
    });
    test('fold jumping issue #129503', () => {
        const lines = [
            /* 1*/ '',
            /* 2*/ 'if True:',
            /* 3*/ '  print(1)',
            /* 4*/ 'if True:',
            /* 5*/ '  print(1)',
            /* 6*/ '',
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(2, 3, false);
            const r2 = r(4, 6, false);
            assertRanges(foldingModel, [r1, r2]);
            // Test jump to next.
            assert.strictEqual(getNextFoldLine(1, foldingModel), 2);
            assert.strictEqual(getNextFoldLine(2, foldingModel), 4);
            assert.strictEqual(getNextFoldLine(3, foldingModel), 4);
            assert.strictEqual(getNextFoldLine(4, foldingModel), null);
            assert.strictEqual(getNextFoldLine(5, foldingModel), null);
            assert.strictEqual(getNextFoldLine(6, foldingModel), null);
            // Test jump to previous.
            assert.strictEqual(getPreviousFoldLine(1, foldingModel), null);
            assert.strictEqual(getPreviousFoldLine(2, foldingModel), null);
            assert.strictEqual(getPreviousFoldLine(3, foldingModel), 2);
            assert.strictEqual(getPreviousFoldLine(4, foldingModel), 2);
            assert.strictEqual(getPreviousFoldLine(5, foldingModel), 4);
            assert.strictEqual(getPreviousFoldLine(6, foldingModel), 4);
        }
        finally {
            textModel.dispose();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ01vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb2xkaW5nL3Rlc3QvYnJvd3Nlci9mb2xkaW5nTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBTWhFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sWUFBWSxFQUNaLGVBQWUsRUFDZixpQkFBaUIsRUFDakIsbUJBQW1CLEVBQ25CLHVCQUF1QixFQUN2QixnQ0FBZ0MsRUFDaEMsdUJBQXVCLEVBQ3ZCLDBCQUEwQixFQUMxQix3QkFBd0IsRUFDeEIsa0JBQWtCLEdBQ2xCLE1BQU0sK0JBQStCLENBQUE7QUFFdEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQWExRSxNQUFNLE9BQU8sc0JBQXNCO2FBQ1Ysd0JBQW1CLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFD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TUFBTSxDQUFDLENBQUE7WUFFM0IsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDekIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDekIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFekIsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQzdELGFBQWEsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDM0UsYUFBYSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDL0UsYUFBYSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ25GLGFBQWEsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUs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Q0FBQyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXZGLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXBFLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNuRCxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdEYsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUUzQixZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDbkQsaUJBQWlCLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXRGLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXBFLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFF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
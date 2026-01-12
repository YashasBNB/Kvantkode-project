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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ01vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZvbGRpbmcvdGVzdC9icm93c2VyL2ZvbGRpbmdNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFNaEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzFELE9BQU8sRUFDTixZQUFZLEVBQ1osZUFBZSxFQUNmLGlCQUFpQixFQUNqQixtQkFBbUIsRUFDbkIsdUJBQXVCLEVBQ3ZCLGdDQUFnQyxFQUNoQyx1QkFBdUIsRUFDdkIsMEJBQTBCLEVBQzFCLHdCQUF3QixFQUN4QixrQkFBa0IsR0FDbEIsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBYTFFLE1BQU0sT0FBTyxzQkFBc0I7YUFDVix3QkFBbUIsR0FBRyxzQkFBc0IsQ0FBQyxRQUFR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Q0FBQyxNQUFNLENBQUMsQ0FBQTtZQUUzQixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMxQixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN6QixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN6QixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUV6QixZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUU1QyxhQUFhLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0QsYUFBYSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUMzRSxhQUFhLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUMvRSxhQUFhLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDbkYsYUFBYSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUs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Q0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdkYsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUE7WUFFcEUsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ25ELGlCQUFpQixDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV0RixZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRTNCLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNuRCxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdEYsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUE7WUFFcEUsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDOUQsaUJBQWlCLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXBGLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFM0IsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDOUQsaUJBQWlCLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXBGLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQztnQkFDaEMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUU7Z0JBQ2hDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFFO2FBQ2hDLENBQUMsQ0FBQTtZQUVGLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlELGlCQUFpQixDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV0RixZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRTNCLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlELGlCQUFpQixDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV0RixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDcEIsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLE1BQU0sS0FBSyxHQUFHO1lBQ2IsTUFBTSxDQUFDLFdBQVc7WUFDbEIsTUFBTSxDQUFDLGdCQUFnQjtZQUN2QixNQUFNLENBQUMsY0FBYztZQUNyQixNQUFNLENBQUMsWUFBWTtZQUNuQixNQUFNLENBQUMscUJBQXFCO1lBQzVCLE1BQU0sQ0FBQyxtQkFBbUI7WUFDMUIsTUFBTSxDQUFDLGNBQWM7WUFDckIsTUFBTSxDQUFDLFNBQVM7WUFDaEIsTUFBTSxDQUFDLGNBQWM7WUFDckIsT0FBTyxDQUFDLFlBQVk7WUFDcEIsT0FBTyxDQUFDLE9BQU87WUFDZixPQUFPLENBQUMsS0FBSztZQUNiLE9BQU8sQ0FBQyxHQUFHO1NBQ1gsQ0FBQTtRQUVELE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDO1lBQ0osTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtZQUV2RixNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN6RCxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRTNCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzFCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzFCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzFCLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFcEQsdUJBQXVCO1lBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMs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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { transaction } from '../../../../../base/common/observable.js';
import { isDefined } from '../../../../../base/common/types.js';
import { linesDiffComputers } from '../../../../../editor/common/diff/linesDiffComputers.js';
import { createModelServices, createTextModel, } from '../../../../../editor/test/common/testTextModel.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { toLineRange, toRangeMapping, } from '../../browser/model/diffComputer.js';
import { DetailedLineRangeMapping } from '../../browser/model/mapping.js';
import { MergeEditorModel } from '../../browser/model/mergeEditorModel.js';
import { MergeEditorTelemetry } from '../../browser/telemetry.js';
suite('merge editor model', () => {
    // todo: renable when failing case is found https://github.com/microsoft/vscode/pull/190444#issuecomment-1678151428
    // ensureNoDisposablesAreLeakedInTestSuite();
    test('prepend line', async () => {
        await testMergeModel({
            languageId: 'plaintext',
            base: 'line1\nline2',
            input1: '0\nline1\nline2',
            input2: '0\nline1\nline2',
            result: '',
        }, (model) => {
            assert.deepStrictEqual(model.getProjections(), {
                base: ['⟦⟧₀line1', 'line2'],
                input1: ['⟦0', '⟧₀line1', 'line2'],
                input2: ['⟦0', '⟧₀line1', 'line2'],
                result: ['⟦⟧{unrecognized}₀'],
            });
            model.toggleConflict(0, 1);
            assert.deepStrictEqual({ result: model.getResult() }, { result: '0\nline1\nline2' });
            model.toggleConflict(0, 2);
            assert.deepStrictEqual({ result: model.getResult() }, { result: '0\n0\nline1\nline2' });
        });
    });
    test('empty base', async () => {
        await testMergeModel({
            languageId: 'plaintext',
            base: '',
            input1: 'input1',
            input2: 'input2',
            result: '',
        }, (model) => {
            assert.deepStrictEqual(model.getProjections(), {
                base: ['⟦⟧₀'],
                input1: ['⟦input1⟧₀'],
                input2: ['⟦input2⟧₀'],
                result: ['⟦⟧{base}₀'],
            });
            model.toggleConflict(0, 1);
            assert.deepStrictEqual({ result: model.getResult() }, { result: 'input1' });
            model.toggleConflict(0, 2);
            assert.deepStrictEqual({ result: model.getResult() }, { result: 'input2' });
        });
    });
    test('can merge word changes', async () => {
        await testMergeModel({
            languageId: 'plaintext',
            base: 'hello',
            input1: 'hallo',
            input2: 'helloworld',
            result: '',
        }, (model) => {
            assert.deepStrictEqual(model.getProjections(), {
                base: ['⟦hello⟧₀'],
                input1: ['⟦hallo⟧₀'],
                input2: ['⟦helloworld⟧₀'],
                result: ['⟦⟧{unrecognized}₀'],
            });
            model.toggleConflict(0, 1);
            model.toggleConflict(0, 2);
            assert.deepStrictEqual({ result: model.getResult() }, { result: 'halloworld' });
        });
    });
    test('can combine insertions at end of document', async () => {
        await testMergeModel({
            languageId: 'plaintext',
            base: 'Zürich\nBern\nBasel\nChur\nGenf\nThun',
            input1: 'Zürich\nBern\nChur\nDavos\nGenf\nThun\nfunction f(b:boolean) {}',
            input2: 'Zürich\nBern\nBasel (FCB)\nChur\nGenf\nThun\nfunction f(a:number) {}',
            result: 'Zürich\nBern\nBasel\nChur\nDavos\nGenf\nThun',
        }, (model) => {
            assert.deepStrictEqual(model.getProjections(), {
                base: ['Zürich', 'Bern', '⟦Basel', '⟧₀Chur', '⟦⟧₁Genf', 'Thun⟦⟧₂'],
                input1: [
                    'Zürich',
                    'Bern',
                    '⟦⟧₀Chur',
                    '⟦Davos',
                    '⟧₁Genf',
                    'Thun',
                    '⟦function f(b:boolean) {}⟧₂',
                ],
                input2: [
                    'Zürich',
                    'Bern',
                    '⟦Basel (FCB)',
                    '⟧₀Chur',
                    '⟦⟧₁Genf',
                    'Thun',
                    '⟦function f(a:number) {}⟧₂',
                ],
                result: [
                    'Zürich',
                    'Bern',
                    '⟦Basel',
                    '⟧{base}₀Chur',
                    '⟦Davos',
                    '⟧{1✓}₁Genf',
                    'Thun⟦⟧{base}₂',
                ],
            });
            model.toggleConflict(2, 1);
            model.toggleConflict(2, 2);
            assert.deepStrictEqual({ result: model.getResult() }, {
                result: 'Zürich\nBern\nBasel\nChur\nDavos\nGenf\nThun\nfunction f(b:boolean) {}\nfunction f(a:number) {}',
            });
        });
    });
    test('conflicts are reset', async () => {
        await testMergeModel({
            languageId: 'typescript',
            base: "import { h } from 'vs/base/browser/dom';\nimport { Disposable, IDisposable } from 'vs/base/common/lifecycle';\nimport { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';\nimport { EditorOption } from 'vs/editor/common/config/editorOptions';\nimport { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';\nimport { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';\n",
            input1: "import { h } from 'vs/base/browser/dom';\nimport { Disposable, IDisposable } from 'vs/base/common/lifecycle';\nimport { observableSignalFromEvent } from 'vs/base/common/observable';\nimport { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';\nimport { autorun, IReader, observableFromEvent } from 'vs/workbench/contrib/audioCues/browser/observable';\nimport { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';\n",
            input2: "import { h } from 'vs/base/browser/dom';\nimport { Disposable, IDisposable } from 'vs/base/common/lifecycle';\nimport { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';\nimport { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';\nimport { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';\n",
            result: "import { h } from 'vs/base/browser/dom';\r\nimport { Disposable, IDisposable } from 'vs/base/common/lifecycle';\r\nimport { observableSignalFromEvent } from 'vs/base/common/observable';\r\nimport { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';\r\n<<<<<<< Updated upstream\r\nimport { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';\r\n=======\r\nimport { autorun, IReader, observableFromEvent } from 'vs/workbench/contrib/audioCues/browser/observable';\r\n>>>>>>> Stashed changes\r\nimport { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';\r\n",
        }, (model) => {
            assert.deepStrictEqual(model.getProjections(), {
                base: [
                    "import { h } from 'vs/base/browser/dom';",
                    "import { Disposable, IDisposable } from 'vs/base/common/lifecycle';",
                    "⟦⟧₀import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';",
                    "⟦import { EditorOption } from 'vs/editor/common/config/editorOptions';",
                    "import { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';",
                    "⟧₁import { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';",
                    '',
                ],
                input1: [
                    "import { h } from 'vs/base/browser/dom';",
                    "import { Disposable, IDisposable } from 'vs/base/common/lifecycle';",
                    "⟦import { observableSignalFromEvent } from 'vs/base/common/observable';",
                    "⟧₀import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';",
                    "⟦import { autorun, IReader, observableFromEvent } from 'vs/workbench/contrib/audioCues/browser/observable';",
                    "⟧₁import { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';",
                    '',
                ],
                input2: [
                    "import { h } from 'vs/base/browser/dom';",
                    "import { Disposable, IDisposable } from 'vs/base/common/lifecycle';",
                    "⟦⟧₀import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';",
                    "⟦import { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';",
                    "⟧₁import { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';",
                    '',
                ],
                result: [
                    "import { h } from 'vs/base/browser/dom';",
                    "import { Disposable, IDisposable } from 'vs/base/common/lifecycle';",
                    "⟦import { observableSignalFromEvent } from 'vs/base/common/observable';",
                    "⟧{1✓}₀import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';",
                    '⟦<<<<<<< Updated upstream',
                    "import { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';",
                    '=======',
                    "import { autorun, IReader, observableFromEvent } from 'vs/workbench/contrib/audioCues/browser/observable';",
                    '>>>>>>> Stashed changes',
                    "⟧{unrecognized}₁import { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';",
                    '',
                ],
            });
        });
    });
    test('auto-solve equal edits', async () => {
        await testMergeModel({
            languageId: 'javascript',
            base: "const { readFileSync } = require('fs');\n\nlet paths = process.argv.slice(2);\nmain(paths);\n\nfunction main(paths) {\n    // print the welcome message\n    printMessage();\n\n    let data = getLineCountInfo(paths);\n    console.log(\"Lines: \" + data.totalLineCount);\n}\n\n/**\n * Prints the welcome message\n*/\nfunction printMessage() {\n    console.log(\"Welcome To Line Counter\");\n}\n\n/**\n * @param {string[]} paths\n*/\nfunction getLineCountInfo(paths) {\n    let lineCounts = paths.map(path => ({ path, count: getLinesLength(readFileSync(path, 'utf8')) }));\n    return {\n        totalLineCount: lineCounts.reduce((acc, { count }) => acc + count, 0),\n        lineCounts,\n    };\n}\n\n/**\n * @param {string} str\n */\nfunction getLinesLength(str) {\n    return str.split('\\n').length;\n}\n",
            input1: "const { readFileSync } = require('fs');\n\nlet paths = process.argv.slice(2);\nmain(paths);\n\nfunction main(paths) {\n    // print the welcome message\n    printMessage();\n\n    const data = getLineCountInfo(paths);\n    console.log(\"Lines: \" + data.totalLineCount);\n}\n\nfunction printMessage() {\n    console.log(\"Welcome To Line Counter\");\n}\n\n/**\n * @param {string[]} paths\n*/\nfunction getLineCountInfo(paths) {\n    let lineCounts = paths.map(path => ({ path, count: getLinesLength(readFileSync(path, 'utf8')) }));\n    return {\n        totalLineCount: lineCounts.reduce((acc, { count }) => acc + count, 0),\n        lineCounts,\n    };\n}\n\n/**\n * @param {string} str\n */\nfunction getLinesLength(str) {\n    return str.split('\\n').length;\n}\n",
            input2: "const { readFileSync } = require('fs');\n\nlet paths = process.argv.slice(2);\nrun(paths);\n\nfunction run(paths) {\n    // print the welcome message\n    printMessage();\n\n    const data = getLineCountInfo(paths);\n    console.log(\"Lines: \" + data.totalLineCount);\n}\n\nfunction printMessage() {\n    console.log(\"Welcome To Line Counter\");\n}\n\n/**\n * @param {string[]} paths\n*/\nfunction getLineCountInfo(paths) {\n    let lineCounts = paths.map(path => ({ path, count: getLinesLength(readFileSync(path, 'utf8')) }));\n    return {\n        totalLineCount: lineCounts.reduce((acc, { count }) => acc + count, 0),\n        lineCounts,\n    };\n}\n\n/**\n * @param {string} str\n */\nfunction getLinesLength(str) {\n    return str.split('\\n').length;\n}\n",
            result: '<<<<<<< uiae\n>>>>>>> Stashed changes',
            resetResult: true,
        }, async (model) => {
            await model.mergeModel.reset();
            assert.deepStrictEqual(model.getResult(), `const { readFileSync } = require('fs');\n\nlet paths = process.argv.slice(2);\nrun(paths);\n\nfunction run(paths) {\n    // print the welcome message\n    printMessage();\n\n    const data = getLineCountInfo(paths);\n    console.log("Lines: " + data.totalLineCount);\n}\n\nfunction printMessage() {\n    console.log("Welcome To Line Counter");\n}\n\n/**\n * @param {string[]} paths\n*/\nfunction getLineCountInfo(paths) {\n    let lineCounts = paths.map(path => ({ path, count: getLinesLength(readFileSync(path, 'utf8')) }));\n    return {\n        totalLineCount: lineCounts.reduce((acc, { count }) => acc + count, 0),\n        lineCounts,\n    };\n}\n\n/**\n * @param {string} str\n */\nfunction getLinesLength(str) {\n    return str.split('\\n').length;\n}\n`);
        });
    });
});
async function testMergeModel(options, fn) {
    const disposables = new DisposableStore();
    const modelInterface = disposables.add(new MergeModelInterface(options, createModelServices(disposables)));
    await modelInterface.mergeModel.onInitialized;
    await fn(modelInterface);
    disposables.dispose();
}
function toSmallNumbersDec(value) {
    const smallNumbers = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return value
        .toString()
        .split('')
        .map((c) => smallNumbers[parseInt(c)])
        .join('');
}
class MergeModelInterface extends Disposable {
    constructor(options, instantiationService) {
        super();
        const input1TextModel = this._register(createTextModel(options.input1, options.languageId));
        const input2TextModel = this._register(createTextModel(options.input2, options.languageId));
        const baseTextModel = this._register(createTextModel(options.base, options.languageId));
        const resultTextModel = this._register(createTextModel(options.result, options.languageId));
        const diffComputer = {
            async computeDiff(textModel1, textModel2, reader) {
                const result = await linesDiffComputers
                    .getLegacy()
                    .computeDiff(textModel1.getLinesContent(), textModel2.getLinesContent(), {
                    ignoreTrimWhitespace: false,
                    maxComputationTimeMs: 10000,
                    computeMoves: false,
                });
                const changes = result.changes.map((c) => new DetailedLineRangeMapping(toLineRange(c.original), textModel1, toLineRange(c.modified), textModel2, c.innerChanges?.map((ic) => toRangeMapping(ic)).filter(isDefined)));
                return {
                    diffs: changes,
                };
            },
        };
        this.mergeModel = this._register(instantiationService.createInstance(MergeEditorModel, baseTextModel, {
            textModel: input1TextModel,
            description: '',
            detail: '',
            title: '',
        }, {
            textModel: input2TextModel,
            description: '',
            detail: '',
            title: '',
        }, resultTextModel, diffComputer, {
            resetResult: options.resetResult || false,
        }, new MergeEditorTelemetry(NullTelemetryService)));
    }
    getProjections() {
        function applyRanges(textModel, ranges) {
            textModel.applyEdits(ranges.map(({ range, label }) => ({
                range: range,
                text: `⟦${textModel.getValueInRange(range)}⟧${label}`,
            })));
        }
        const baseRanges = this.mergeModel.modifiedBaseRanges.get();
        const baseTextModel = createTextModel(this.mergeModel.base.getValue());
        applyRanges(baseTextModel, baseRanges.map((r, idx) => ({
            range: r.baseRange.toRange(),
            label: toSmallNumbersDec(idx),
        })));
        const input1TextModel = createTextModel(this.mergeModel.input1.textModel.getValue());
        applyRanges(input1TextModel, baseRanges.map((r, idx) => ({
            range: r.input1Range.toRange(),
            label: toSmallNumbersDec(idx),
        })));
        const input2TextModel = createTextModel(this.mergeModel.input2.textModel.getValue());
        applyRanges(input2TextModel, baseRanges.map((r, idx) => ({
            range: r.input2Range.toRange(),
            label: toSmallNumbersDec(idx),
        })));
        const resultTextModel = createTextModel(this.mergeModel.resultTextModel.getValue());
        applyRanges(resultTextModel, baseRanges.map((r, idx) => ({
            range: this.mergeModel.getLineRangeInResult(r.baseRange).toRange(),
            label: `{${this.mergeModel.getState(r).get()}}${toSmallNumbersDec(idx)}`,
        })));
        const result = {
            base: baseTextModel.getValue(1 /* EndOfLinePreference.LF */).split('\n'),
            input1: input1TextModel.getValue(1 /* EndOfLinePreference.LF */).split('\n'),
            input2: input2TextModel.getValue(1 /* EndOfLinePreference.LF */).split('\n'),
            result: resultTextModel.getValue(1 /* EndOfLinePreference.LF */).split('\n'),
        };
        baseTextModel.dispose();
        input1TextModel.dispose();
        input2TextModel.dispose();
        resultTextModel.dispose();
        return result;
    }
    toggleConflict(conflictIdx, inputNumber) {
        const baseRange = this.mergeModel.modifiedBaseRanges.get()[conflictIdx];
        if (!baseRange) {
            throw new Error();
        }
        const state = this.mergeModel.getState(baseRange).get();
        transaction((tx) => {
            this.mergeModel.setState(baseRange, state.toggle(inputNumber), true, tx);
        });
    }
    getResult() {
        return this.mergeModel.resultTextModel.getValue();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL3Rlc3QvYnJvd3Nlci9tb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBVyxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFNUYsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixlQUFlLEdBQ2YsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNqRyxPQUFPLEVBR04sV0FBVyxFQUNYLGNBQWMsR0FDZCxNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRWpFLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsbUhBQW1IO0lBQ25ILDZDQUE2QztJQUU3QyxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9CLE1BQU0sY0FBYyxDQUNuQjtZQUNDLFVBQVUsRUFBRSxXQUFXO1lBQ3ZCLElBQUksRUFBRSxjQUFjO1lBQ3BCLE1BQU0sRUFBRSxpQkFB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
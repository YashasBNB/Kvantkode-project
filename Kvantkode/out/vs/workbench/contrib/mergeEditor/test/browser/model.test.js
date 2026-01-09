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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvdGVzdC9icm93c2VyL21vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDckYsT0FBTyxFQUFXLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU1RixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGVBQWUsR0FDZixNQUFNLG9EQUFvRCxDQUFBO0FBRTNELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2pHLE9BQU8sRUFHTixXQUFXLEVBQ1gsY0FBYyxHQUNkLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDMUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFakUsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxtSEFBbUg7SUFDbkgsNkNBQTZDO0lBRTdDLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0IsTUFBTSxjQUFjLENBQ25CO1lBQ0MsVUFBVSxFQUFFLFdBQVc7WUFDdkIsSUFBSSxFQUFFLGNB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
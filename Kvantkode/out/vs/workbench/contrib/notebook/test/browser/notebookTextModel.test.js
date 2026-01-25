/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { NotebookTextModel } from '../../common/model/notebookTextModel.js';
import { CellKind, MOVE_CURSOR_1_LINE_COMMAND, SelectionStateType, } from '../../common/notebookCommon.js';
import { setupInstantiationService, TestCell, valueBytesFromString, withTestNotebook, } from './testNotebookEditor.js';
suite('NotebookTextModel', () => {
    let disposables;
    let instantiationService;
    let languageService;
    ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        languageService = instantiationService.get(ILanguageService);
        instantiationService.spy(IUndoRedoService, 'pushElement');
    });
    suiteTeardown(() => disposables.dispose());
    test('insert', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
        ], (editor, _viewModel, ds) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 0,
                    cells: [
                        ds.add(new TestCell(textModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], languageService)),
                    ],
                },
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 3,
                    count: 0,
                    cells: [
                        ds.add(new TestCell(textModel.viewType, 6, 'var f = 6;', 'javascript', CellKind.Code, [], languageService)),
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 6);
            assert.strictEqual(textModel.cells[1].getValue(), 'var e = 5;');
            assert.strictEqual(textModel.cells[4].getValue(), 'var f = 6;');
        });
    });
    test('multiple inserts at same position', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
        ], (editor, _viewModel, ds) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 0,
                    cells: [
                        ds.add(new TestCell(textModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], languageService)),
                    ],
                },
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 0,
                    cells: [
                        ds.add(new TestCell(textModel.viewType, 6, 'var f = 6;', 'javascript', CellKind.Code, [], languageService)),
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 6);
            assert.strictEqual(textModel.cells[1].getValue(), 'var e = 5;');
            assert.strictEqual(textModel.cells[2].getValue(), 'var f = 6;');
        });
    });
    test('delete', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                { editType: 1 /* CellEditType.Replace */, index: 1, count: 1, cells: [] },
                { editType: 1 /* CellEditType.Replace */, index: 3, count: 1, cells: [] },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells[0].getValue(), 'var a = 1;');
            assert.strictEqual(textModel.cells[1].getValue(), 'var c = 3;');
        });
    });
    test('delete + insert', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
        ], (editor, _viewModel, ds) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                { editType: 1 /* CellEditType.Replace */, index: 1, count: 1, cells: [] },
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 3,
                    count: 0,
                    cells: [
                        ds.add(new TestCell(textModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], languageService)),
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 4);
            assert.strictEqual(textModel.cells[0].getValue(), 'var a = 1;');
            assert.strictEqual(textModel.cells[2].getValue(), 'var e = 5;');
        });
    });
    test('delete + insert at same position', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
        ], (editor, _viewModel, ds) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                { editType: 1 /* CellEditType.Replace */, index: 1, count: 1, cells: [] },
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 0,
                    cells: [
                        ds.add(new TestCell(textModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], languageService)),
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 4);
            assert.strictEqual(textModel.cells[0].getValue(), 'var a = 1;');
            assert.strictEqual(textModel.cells[1].getValue(), 'var e = 5;');
            assert.strictEqual(textModel.cells[2].getValue(), 'var c = 3;');
        });
    });
    test('(replace) delete + insert at same position', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
        ], (editor, _viewModel, ds) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 1,
                    cells: [
                        ds.add(new TestCell(textModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], languageService)),
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 4);
            assert.strictEqual(textModel.cells[0].getValue(), 'var a = 1;');
            assert.strictEqual(textModel.cells[1].getValue(), 'var e = 5;');
            assert.strictEqual(textModel.cells[2].getValue(), 'var c = 3;');
        });
    });
    test('output', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const textModel = editor.textModel;
            // invalid index 1
            assert.throws(() => {
                textModel.applyEdits([
                    {
                        index: Number.MAX_VALUE,
                        editType: 2 /* CellEditType.Output */,
                        outputs: [],
                    },
                ], true, undefined, () => undefined, undefined, true);
            });
            // invalid index 2
            assert.throws(() => {
                textModel.applyEdits([
                    {
                        index: -1,
                        editType: 2 /* CellEditType.Output */,
                        outputs: [],
                    },
                ], true, undefined, () => undefined, undefined, true);
            });
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 2 /* CellEditType.Output */,
                    outputs: [
                        {
                            outputId: 'someId',
                            outputs: [{ mime: Mimes.markdown, data: valueBytesFromString('_Hello_') }],
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 1);
            assert.strictEqual(textModel.cells[0].outputs.length, 1);
            // append
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 2 /* CellEditType.Output */,
                    append: true,
                    outputs: [
                        {
                            outputId: 'someId2',
                            outputs: [{ mime: Mimes.markdown, data: valueBytesFromString('_Hello2_') }],
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 1);
            assert.strictEqual(textModel.cells[0].outputs.length, 2);
            let [first, second] = textModel.cells[0].outputs;
            assert.strictEqual(first.outputId, 'someId');
            assert.strictEqual(second.outputId, 'someId2');
            // replace all
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 2 /* CellEditType.Output */,
                    outputs: [
                        {
                            outputId: 'someId3',
                            outputs: [
                                { mime: Mimes.text, data: valueBytesFromString('Last, replaced output') },
                            ],
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 1);
            assert.strictEqual(textModel.cells[0].outputs.length, 1);
            [first] = textModel.cells[0].outputs;
            assert.strictEqual(first.outputId, 'someId3');
        });
    });
    test('multiple append output in one position', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const textModel = editor.textModel;
            // append
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 2 /* CellEditType.Output */,
                    append: true,
                    outputs: [
                        {
                            outputId: 'append1',
                            outputs: [{ mime: Mimes.markdown, data: valueBytesFromString('append 1') }],
                        },
                    ],
                },
                {
                    index: 0,
                    editType: 2 /* CellEditType.Output */,
                    append: true,
                    outputs: [
                        {
                            outputId: 'append2',
                            outputs: [{ mime: Mimes.markdown, data: valueBytesFromString('append 2') }],
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 1);
            assert.strictEqual(textModel.cells[0].outputs.length, 2);
            const [first, second] = textModel.cells[0].outputs;
            assert.strictEqual(first.outputId, 'append1');
            assert.strictEqual(second.outputId, 'append2');
        });
    });
    test('append to output created in same batch', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 2 /* CellEditType.Output */,
                    append: true,
                    outputs: [
                        {
                            outputId: 'append1',
                            outputs: [{ mime: Mimes.markdown, data: valueBytesFromString('append 1') }],
                        },
                    ],
                },
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    append: true,
                    outputId: 'append1',
                    items: [
                        {
                            mime: Mimes.markdown,
                            data: valueBytesFromString('append 2'),
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 1);
            assert.strictEqual(textModel.cells[0].outputs.length, 1, 'has 1 output');
            const [first] = textModel.cells[0].outputs;
            assert.strictEqual(first.outputId, 'append1');
            assert.strictEqual(first.outputs.length, 2, 'has 2 items');
        });
    });
    const stdOutMime = 'application/vnd.code.notebook.stdout';
    const stdErrMime = 'application/vnd.code.notebook.stderr';
    test('appending streaming outputs', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 2 /* CellEditType.Output */,
                    append: true,
                    outputs: [
                        {
                            outputId: 'append1',
                            outputs: [{ mime: stdOutMime, data: valueBytesFromString('append 1') }],
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            const [output] = textModel.cells[0].outputs;
            assert.strictEqual(output.versionId, 0, 'initial output version should be 0');
            textModel.applyEdits([
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    append: true,
                    outputId: 'append1',
                    items: [
                        { mime: stdOutMime, data: valueBytesFromString('append 2') },
                        { mime: stdOutMime, data: valueBytesFromString('append 3') },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(output.versionId, 1, 'version should bump per append');
            textModel.applyEdits([
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    append: true,
                    outputId: 'append1',
                    items: [
                        { mime: stdOutMime, data: valueBytesFromString('append 4') },
                        { mime: stdOutMime, data: valueBytesFromString('append 5') },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(output.versionId, 2, 'version should bump per append');
            assert.strictEqual(textModel.cells.length, 1);
            assert.strictEqual(textModel.cells[0].outputs.length, 1, 'has 1 output');
            assert.strictEqual(output.outputId, 'append1');
            assert.strictEqual(output.outputs.length, 1, 'outputs are compressed');
            assert.strictEqual(output.outputs[0].data.toString(), 'append 1append 2append 3append 4append 5');
            assert.strictEqual(output.appendedSinceVersion(0, stdOutMime)?.toString(), 'append 2append 3append 4append 5');
            assert.strictEqual(output.appendedSinceVersion(1, stdOutMime)?.toString(), 'append 4append 5');
            assert.strictEqual(output.appendedSinceVersion(2, stdOutMime), undefined);
            assert.strictEqual(output.appendedSinceVersion(2, stdErrMime), undefined);
        });
    });
    test('replacing streaming outputs', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 2 /* CellEditType.Output */,
                    append: true,
                    outputs: [
                        {
                            outputId: 'append1',
                            outputs: [{ mime: stdOutMime, data: valueBytesFromString('append 1') }],
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            const [output] = textModel.cells[0].outputs;
            assert.strictEqual(output.versionId, 0, 'initial output version should be 0');
            textModel.applyEdits([
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    append: true,
                    outputId: 'append1',
                    items: [
                        {
                            mime: stdOutMime,
                            data: valueBytesFromString('append 2'),
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(output.versionId, 1, 'version should bump per append');
            textModel.applyEdits([
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    append: false,
                    outputId: 'append1',
                    items: [
                        {
                            mime: stdOutMime,
                            data: valueBytesFromString('replace 3'),
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(output.versionId, 2, 'version should bump per replace');
            textModel.applyEdits([
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    append: true,
                    outputId: 'append1',
                    items: [
                        {
                            mime: stdOutMime,
                            data: valueBytesFromString('append 4'),
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(output.versionId, 3, 'version should bump per append');
            assert.strictEqual(output.outputs[0].data.toString(), 'replace 3append 4');
            assert.strictEqual(output.appendedSinceVersion(0, stdOutMime), undefined, 'replacing output should clear out previous versioned output buffers');
            assert.strictEqual(output.appendedSinceVersion(1, stdOutMime), undefined, 'replacing output should clear out previous versioned output buffers');
            assert.strictEqual(output.appendedSinceVersion(2, stdOutMime)?.toString(), 'append 4');
        });
    });
    test('appending streaming outputs with move cursor compression', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 2 /* CellEditType.Output */,
                    append: true,
                    outputs: [
                        {
                            outputId: 'append1',
                            outputs: [
                                { mime: stdOutMime, data: valueBytesFromString('append 1') },
                                { mime: stdOutMime, data: valueBytesFromString('\nappend 1') },
                            ],
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            const [output] = textModel.cells[0].outputs;
            assert.strictEqual(output.versionId, 0, 'initial output version should be 0');
            textModel.applyEdits([
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    append: true,
                    outputId: 'append1',
                    items: [
                        {
                            mime: stdOutMime,
                            data: valueBytesFromString(MOVE_CURSOR_1_LINE_COMMAND + '\nappend 2'),
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(output.versionId, 1, 'version should bump per append');
            assert.strictEqual(output.outputs[0].data.toString(), 'append 1\nappend 2');
            assert.strictEqual(output.appendedSinceVersion(0, stdOutMime), undefined, 'compressing outputs should clear out previous versioned output buffers');
        });
    });
    test('appending streaming outputs with carraige return compression', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 2 /* CellEditType.Output */,
                    append: true,
                    outputs: [
                        {
                            outputId: 'append1',
                            outputs: [
                                { mime: stdOutMime, data: valueBytesFromString('append 1') },
                                { mime: stdOutMime, data: valueBytesFromString('\nappend 1') },
                            ],
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            const [output] = textModel.cells[0].outputs;
            assert.strictEqual(output.versionId, 0, 'initial output version should be 0');
            textModel.applyEdits([
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    append: true,
                    outputId: 'append1',
                    items: [
                        {
                            mime: stdOutMime,
                            data: valueBytesFromString('\rappend 2'),
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(output.versionId, 1, 'version should bump per append');
            assert.strictEqual(output.outputs[0].data.toString(), 'append 1\nappend 2');
            assert.strictEqual(output.appendedSinceVersion(0, stdOutMime), undefined, 'compressing outputs should clear out previous versioned output buffers');
        });
    });
    test('appending multiple different mime streaming outputs', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 2 /* CellEditType.Output */,
                    append: true,
                    outputs: [
                        {
                            outputId: 'append1',
                            outputs: [
                                { mime: stdOutMime, data: valueBytesFromString('stdout 1') },
                                { mime: stdErrMime, data: valueBytesFromString('stderr 1') },
                            ],
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            const [output] = textModel.cells[0].outputs;
            assert.strictEqual(output.versionId, 0, 'initial output version should be 0');
            textModel.applyEdits([
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    append: true,
                    outputId: 'append1',
                    items: [
                        { mime: stdOutMime, data: valueBytesFromString('stdout 2') },
                        { mime: stdErrMime, data: valueBytesFromString('stderr 2') },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(output.versionId, 1, 'version should bump per replace');
            assert.strictEqual(output.appendedSinceVersion(0, stdErrMime)?.toString(), 'stderr 2');
            assert.strictEqual(output.appendedSinceVersion(0, stdOutMime)?.toString(), 'stdout 2');
        });
    });
    test('metadata', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const textModel = editor.textModel;
            // invalid index 1
            assert.throws(() => {
                textModel.applyEdits([
                    {
                        index: Number.MAX_VALUE,
                        editType: 3 /* CellEditType.Metadata */,
                        metadata: {},
                    },
                ], true, undefined, () => undefined, undefined, true);
            });
            // invalid index 2
            assert.throws(() => {
                textModel.applyEdits([
                    {
                        index: -1,
                        editType: 3 /* CellEditType.Metadata */,
                        metadata: {},
                    },
                ], true, undefined, () => undefined, undefined, true);
            });
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 3 /* CellEditType.Metadata */,
                    metadata: { customProperty: 15 },
                },
            ], true, undefined, () => undefined, undefined, true);
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 3 /* CellEditType.Metadata */,
                    metadata: {},
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 1);
            assert.strictEqual(textModel.cells[0].metadata.customProperty, undefined);
        });
    });
    test('partial metadata', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const textModel = editor.textModel;
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 8 /* CellEditType.PartialMetadata */,
                    metadata: { customProperty: 15 },
                },
            ], true, undefined, () => undefined, undefined, true);
            textModel.applyEdits([
                {
                    index: 0,
                    editType: 8 /* CellEditType.PartialMetadata */,
                    metadata: {},
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 1);
            assert.strictEqual(textModel.cells[0].metadata.customProperty, 15);
        });
    });
    test('multiple inserts in one edit', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
        ], (editor, _viewModel, ds) => {
            const textModel = editor.textModel;
            let changeEvent = undefined;
            const eventListener = textModel.onDidChangeContent((e) => {
                changeEvent = e;
            });
            const willChangeEvents = [];
            const willChangeListener = textModel.onWillAddRemoveCells((e) => {
                willChangeEvents.push(e);
            });
            const version = textModel.versionId;
            textModel.applyEdits([
                { editType: 1 /* CellEditType.Replace */, index: 1, count: 1, cells: [] },
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 0,
                    cells: [
                        ds.add(new TestCell(textModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], languageService)),
                    ],
                },
            ], true, undefined, () => ({
                kind: SelectionStateType.Index,
                focus: { start: 0, end: 1 },
                selections: [{ start: 0, end: 1 }],
            }), undefined, true);
            assert.strictEqual(textModel.cells.length, 4);
            assert.strictEqual(textModel.cells[0].getValue(), 'var a = 1;');
            assert.strictEqual(textModel.cells[1].getValue(), 'var e = 5;');
            assert.strictEqual(textModel.cells[2].getValue(), 'var c = 3;');
            assert.notStrictEqual(changeEvent, undefined);
            assert.strictEqual(changeEvent.rawEvents.length, 2);
            assert.deepStrictEqual(changeEvent.endSelectionState?.selections, [{ start: 0, end: 1 }]);
            assert.strictEqual(willChangeEvents.length, 2);
            assert.strictEqual(textModel.versionId, version + 1);
            eventListener.dispose();
            willChangeListener.dispose();
        });
    });
    test('insert and metadata change in one edit', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const textModel = editor.textModel;
            let changeEvent = undefined;
            const eventListener = textModel.onDidChangeContent((e) => {
                changeEvent = e;
            });
            const willChangeEvents = [];
            const willChangeListener = textModel.onWillAddRemoveCells((e) => {
                willChangeEvents.push(e);
            });
            const version = textModel.versionId;
            textModel.applyEdits([
                { editType: 1 /* CellEditType.Replace */, index: 1, count: 1, cells: [] },
                {
                    index: 0,
                    editType: 3 /* CellEditType.Metadata */,
                    metadata: {},
                },
            ], true, undefined, () => ({
                kind: SelectionStateType.Index,
                focus: { start: 0, end: 1 },
                selections: [{ start: 0, end: 1 }],
            }), undefined, true);
            assert.notStrictEqual(changeEvent, undefined);
            assert.strictEqual(changeEvent.rawEvents.length, 2);
            assert.deepStrictEqual(changeEvent.endSelectionState?.selections, [{ start: 0, end: 1 }]);
            assert.strictEqual(willChangeEvents.length, 1);
            assert.strictEqual(textModel.versionId, version + 1);
            eventListener.dispose();
            willChangeListener.dispose();
        });
    });
    test('Updating appending/updating output in Notebooks does not work as expected #117273', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const model = editor.textModel;
            assert.strictEqual(model.cells.length, 1);
            assert.strictEqual(model.cells[0].outputs.length, 0);
            const success1 = model.applyEdits([
                {
                    editType: 2 /* CellEditType.Output */,
                    index: 0,
                    outputs: [
                        {
                            outputId: 'out1',
                            outputs: [
                                {
                                    mime: 'application/x.notebook.stream',
                                    data: VSBuffer.wrap(new Uint8Array([1])),
                                },
                            ],
                        },
                    ],
                    append: false,
                },
            ], true, undefined, () => undefined, undefined, false);
            assert.ok(success1);
            assert.strictEqual(model.cells[0].outputs.length, 1);
            const success2 = model.applyEdits([
                {
                    editType: 2 /* CellEditType.Output */,
                    index: 0,
                    outputs: [
                        {
                            outputId: 'out2',
                            outputs: [
                                {
                                    mime: 'application/x.notebook.stream',
                                    data: VSBuffer.wrap(new Uint8Array([1])),
                                },
                            ],
                        },
                    ],
                    append: true,
                },
            ], true, undefined, () => undefined, undefined, false);
            assert.ok(success2);
            assert.strictEqual(model.cells[0].outputs.length, 2);
        });
    });
    test('Clearing output of an empty notebook makes it dirty #119608', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
        ], (editor, _, ds) => {
            const model = editor.textModel;
            let event;
            ds.add(model.onDidChangeContent((e) => {
                event = e;
            }));
            {
                // 1: add ouput -> event
                const success = model.applyEdits([
                    {
                        editType: 2 /* CellEditType.Output */,
                        index: 0,
                        outputs: [
                            {
                                outputId: 'out1',
                                outputs: [
                                    {
                                        mime: 'application/x.notebook.stream',
                                        data: VSBuffer.wrap(new Uint8Array([1])),
                                    },
                                ],
                            },
                        ],
                        append: false,
                    },
                ], true, undefined, () => undefined, undefined, false);
                assert.ok(success);
                assert.strictEqual(model.cells[0].outputs.length, 1);
                assert.ok(event);
            }
            {
                // 2: clear all output w/ output -> event
                event = undefined;
                const success = model.applyEdits([
                    {
                        editType: 2 /* CellEditType.Output */,
                        index: 0,
                        outputs: [],
                        append: false,
                    },
                    {
                        editType: 2 /* CellEditType.Output */,
                        index: 1,
                        outputs: [],
                        append: false,
                    },
                ], true, undefined, () => undefined, undefined, false);
                assert.ok(success);
                assert.ok(event);
            }
            {
                // 2: clear all output wo/ output -> NO event
                event = undefined;
                const success = model.applyEdits([
                    {
                        editType: 2 /* CellEditType.Output */,
                        index: 0,
                        outputs: [],
                        append: false,
                    },
                    {
                        editType: 2 /* CellEditType.Output */,
                        index: 1,
                        outputs: [],
                        append: false,
                    },
                ], true, undefined, () => undefined, undefined, false);
                assert.ok(success);
                assert.ok(event === undefined);
            }
        });
    });
    test('Cell metadata/output change should update version id and alternative id #121807', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
        ], async (editor, viewModel) => {
            assert.strictEqual(editor.textModel.versionId, 0);
            const firstAltVersion = '0_0,1;1,1';
            assert.strictEqual(editor.textModel.alternativeVersionId, firstAltVersion);
            editor.textModel.applyEdits([
                {
                    index: 0,
                    editType: 3 /* CellEditType.Metadata */,
                    metadata: {
                        inputCollapsed: true,
                    },
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(editor.textModel.versionId, 1);
            assert.notStrictEqual(editor.textModel.alternativeVersionId, firstAltVersion);
            const secondAltVersion = '1_0,1;1,1';
            assert.strictEqual(editor.textModel.alternativeVersionId, secondAltVersion);
            await viewModel.undo();
            assert.strictEqual(editor.textModel.versionId, 2);
            assert.strictEqual(editor.textModel.alternativeVersionId, firstAltVersion);
            await viewModel.redo();
            assert.strictEqual(editor.textModel.versionId, 3);
            assert.notStrictEqual(editor.textModel.alternativeVersionId, firstAltVersion);
            assert.strictEqual(editor.textModel.alternativeVersionId, secondAltVersion);
            editor.textModel.applyEdits([
                {
                    index: 1,
                    editType: 3 /* CellEditType.Metadata */,
                    metadata: {
                        inputCollapsed: true,
                    },
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(editor.textModel.versionId, 4);
            assert.strictEqual(editor.textModel.alternativeVersionId, '4_0,1;1,1');
            await viewModel.undo();
            assert.strictEqual(editor.textModel.versionId, 5);
            assert.strictEqual(editor.textModel.alternativeVersionId, secondAltVersion);
        });
    });
    test('metadata changes on newly added cells should combine their undo operations', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], async (editor, viewModel, ds) => {
            const textModel = editor.textModel;
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 0,
                    cells: [
                        ds.add(new TestCell(textModel.viewType, 1, 'var e = 5;', 'javascript', CellKind.Code, [], languageService)),
                        ds.add(new TestCell(textModel.viewType, 2, 'var f = 6;', 'javascript', CellKind.Code, [], languageService)),
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 3);
            editor.textModel.applyEdits([{ editType: 3 /* CellEditType.Metadata */, index: 1, metadata: { id: '123' } }], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells[1].metadata.id, '123');
            await viewModel.undo();
            assert.strictEqual(textModel.cells.length, 1);
            await viewModel.redo();
            assert.strictEqual(textModel.cells.length, 3);
        });
    });
    test('changes with non-metadata edit should not combine their undo operations', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], async (editor, viewModel, ds) => {
            const textModel = editor.textModel;
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 0,
                    cells: [
                        ds.add(new TestCell(textModel.viewType, 1, 'var e = 5;', 'javascript', CellKind.Code, [], languageService)),
                        ds.add(new TestCell(textModel.viewType, 2, 'var f = 6;', 'javascript', CellKind.Code, [], languageService)),
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells.length, 3);
            editor.textModel.applyEdits([
                { editType: 3 /* CellEditType.Metadata */, index: 1, metadata: { id: '123' } },
                {
                    editType: 2 /* CellEditType.Output */,
                    handle: 0,
                    append: true,
                    outputs: [
                        {
                            outputId: 'newOutput',
                            outputs: [
                                { mime: Mimes.text, data: valueBytesFromString('cba') },
                                { mime: 'application/foo', data: valueBytesFromString('cba') },
                            ],
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(textModel.cells[1].metadata.id, '123');
            await viewModel.undo();
            assert.strictEqual(textModel.cells.length, 3);
            await viewModel.undo();
            assert.strictEqual(textModel.cells.length, 1);
        });
    });
    test('Destructive sorting in _doApplyEdits #121994', async function () {
        await withTestNotebook([
            [
                'var a = 1;',
                'javascript',
                CellKind.Code,
                [{ outputId: 'i42', outputs: [{ mime: 'm/ime', data: valueBytesFromString('test') }] }],
                {},
            ],
        ], async (editor) => {
            const notebook = editor.textModel;
            assert.strictEqual(notebook.cells[0].outputs.length, 1);
            assert.strictEqual(notebook.cells[0].outputs[0].outputs.length, 1);
            assert.deepStrictEqual(notebook.cells[0].outputs[0].outputs[0].data, valueBytesFromString('test'));
            const edits = [
                {
                    editType: 2 /* CellEditType.Output */,
                    handle: 0,
                    outputs: [],
                },
                {
                    editType: 2 /* CellEditType.Output */,
                    handle: 0,
                    append: true,
                    outputs: [
                        {
                            outputId: 'newOutput',
                            outputs: [
                                { mime: Mimes.text, data: valueBytesFromString('cba') },
                                { mime: 'application/foo', data: valueBytesFromString('cba') },
                            ],
                        },
                    ],
                },
            ];
            editor.textModel.applyEdits(edits, true, undefined, () => undefined, undefined, true);
            assert.strictEqual(notebook.cells[0].outputs.length, 1);
            assert.strictEqual(notebook.cells[0].outputs[0].outputs.length, 2);
        });
    });
    test('Destructive sorting in _doApplyEdits #121994. cell splice between output changes', async function () {
        await withTestNotebook([
            [
                'var a = 1;',
                'javascript',
                CellKind.Code,
                [{ outputId: 'i42', outputs: [{ mime: 'm/ime', data: valueBytesFromString('test') }] }],
                {},
            ],
            [
                'var b = 2;',
                'javascript',
                CellKind.Code,
                [{ outputId: 'i43', outputs: [{ mime: 'm/ime', data: valueBytesFromString('test') }] }],
                {},
            ],
            [
                'var c = 3;',
                'javascript',
                CellKind.Code,
                [{ outputId: 'i44', outputs: [{ mime: 'm/ime', data: valueBytesFromString('test') }] }],
                {},
            ],
        ], async (editor) => {
            const notebook = editor.textModel;
            const edits = [
                {
                    editType: 2 /* CellEditType.Output */,
                    index: 0,
                    outputs: [],
                },
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 1,
                    cells: [],
                },
                {
                    editType: 2 /* CellEditType.Output */,
                    index: 2,
                    append: true,
                    outputs: [
                        {
                            outputId: 'newOutput',
                            outputs: [
                                { mime: Mimes.text, data: valueBytesFromString('cba') },
                                { mime: 'application/foo', data: valueBytesFromString('cba') },
                            ],
                        },
                    ],
                },
            ];
            editor.textModel.applyEdits(edits, true, undefined, () => undefined, undefined, true);
            assert.strictEqual(notebook.cells.length, 2);
            assert.strictEqual(notebook.cells[0].outputs.length, 0);
            assert.strictEqual(notebook.cells[1].outputs.length, 2);
            assert.strictEqual(notebook.cells[1].outputs[0].outputId, 'i44');
            assert.strictEqual(notebook.cells[1].outputs[1].outputId, 'newOutput');
        });
    });
    test('Destructive sorting in _doApplyEdits #121994. cell splice between output changes 2', async function () {
        await withTestNotebook([
            [
                'var a = 1;',
                'javascript',
                CellKind.Code,
                [{ outputId: 'i42', outputs: [{ mime: 'm/ime', data: valueBytesFromString('test') }] }],
                {},
            ],
            [
                'var b = 2;',
                'javascript',
                CellKind.Code,
                [{ outputId: 'i43', outputs: [{ mime: 'm/ime', data: valueBytesFromString('test') }] }],
                {},
            ],
            [
                'var c = 3;',
                'javascript',
                CellKind.Code,
                [{ outputId: 'i44', outputs: [{ mime: 'm/ime', data: valueBytesFromString('test') }] }],
                {},
            ],
        ], async (editor) => {
            const notebook = editor.textModel;
            const edits = [
                {
                    editType: 2 /* CellEditType.Output */,
                    index: 1,
                    append: true,
                    outputs: [
                        {
                            outputId: 'newOutput',
                            outputs: [
                                { mime: Mimes.text, data: valueBytesFromString('cba') },
                                { mime: 'application/foo', data: valueBytesFromString('cba') },
                            ],
                        },
                    ],
                },
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 1,
                    cells: [],
                },
                {
                    editType: 2 /* CellEditType.Output */,
                    index: 1,
                    append: true,
                    outputs: [
                        {
                            outputId: 'newOutput2',
                            outputs: [
                                { mime: Mimes.text, data: valueBytesFromString('cba') },
                                { mime: 'application/foo', data: valueBytesFromString('cba') },
                            ],
                        },
                    ],
                },
            ];
            editor.textModel.applyEdits(edits, true, undefined, () => undefined, undefined, true);
            assert.strictEqual(notebook.cells.length, 2);
            assert.strictEqual(notebook.cells[0].outputs.length, 1);
            assert.strictEqual(notebook.cells[1].outputs.length, 1);
            assert.strictEqual(notebook.cells[1].outputs[0].outputId, 'i44');
        });
    });
    test('Output edits splice', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const model = editor.textModel;
            assert.strictEqual(model.cells.length, 1);
            assert.strictEqual(model.cells[0].outputs.length, 0);
            const success1 = model.applyEdits([
                {
                    editType: 2 /* CellEditType.Output */,
                    index: 0,
                    outputs: [
                        {
                            outputId: 'out1',
                            outputs: [
                                { mime: 'application/x.notebook.stream', data: valueBytesFromString('1') },
                            ],
                        },
                        {
                            outputId: 'out2',
                            outputs: [
                                { mime: 'application/x.notebook.stream', data: valueBytesFromString('2') },
                            ],
                        },
                        {
                            outputId: 'out3',
                            outputs: [
                                { mime: 'application/x.notebook.stream', data: valueBytesFromString('3') },
                            ],
                        },
                        {
                            outputId: 'out4',
                            outputs: [
                                { mime: 'application/x.notebook.stream', data: valueBytesFromString('4') },
                            ],
                        },
                    ],
                    append: false,
                },
            ], true, undefined, () => undefined, undefined, false);
            assert.ok(success1);
            assert.strictEqual(model.cells[0].outputs.length, 4);
            const success2 = model.applyEdits([
                {
                    editType: 2 /* CellEditType.Output */,
                    index: 0,
                    outputs: [
                        {
                            outputId: 'out1',
                            outputs: [
                                { mime: 'application/x.notebook.stream', data: valueBytesFromString('1') },
                            ],
                        },
                        {
                            outputId: 'out5',
                            outputs: [
                                { mime: 'application/x.notebook.stream', data: valueBytesFromString('5') },
                            ],
                        },
                        {
                            outputId: 'out3',
                            outputs: [
                                { mime: 'application/x.notebook.stream', data: valueBytesFromString('3') },
                            ],
                        },
                        {
                            outputId: 'out6',
                            outputs: [
                                { mime: 'application/x.notebook.stream', data: valueBytesFromString('6') },
                            ],
                        },
                    ],
                    append: false,
                },
            ], true, undefined, () => undefined, undefined, false);
            assert.ok(success2);
            assert.strictEqual(model.cells[0].outputs.length, 4);
            assert.strictEqual(model.cells[0].outputs[0].outputId, 'out1');
            assert.strictEqual(model.cells[0].outputs[1].outputId, 'out5');
            assert.strictEqual(model.cells[0].outputs[2].outputId, 'out3');
            assert.strictEqual(model.cells[0].outputs[3].outputId, 'out6');
        });
    });
    test('computeEdits no insert', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const model = editor.textModel;
            const edits = NotebookTextModel.computeEdits(model, [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
            ]);
            assert.deepStrictEqual(edits, [{ editType: 3 /* CellEditType.Metadata */, index: 0, metadata: {} }]);
        });
    });
    test('computeEdits cell content changed', async function () {
        await withTestNotebook([['var a = 1;', 'javascript', CellKind.Code, [], {}]], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 2;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [{ editType: 1 /* CellEditType.Replace */, index: 0, count: 1, cells }]);
        });
    });
    test('computeEdits last cell content changed', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
                {
                    source: 'var b = 2;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [
                { editType: 3 /* CellEditType.Metadata */, index: 0, metadata: {} },
                { editType: 1 /* CellEditType.Replace */, index: 1, count: 1, cells: cells.slice(1) },
            ]);
        });
    });
    test('computeEdits first cell content changed', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 2;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
                {
                    source: 'var b = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [
                { editType: 1 /* CellEditType.Replace */, index: 0, count: 1, cells: cells.slice(0, 1) },
                { editType: 3 /* CellEditType.Metadata */, index: 1, metadata: {} },
            ]);
        });
    });
    test('computeEdits middle cell content changed', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var c = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
                {
                    source: 'var b = 2;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
                {
                    source: 'var c = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [
                { editType: 3 /* CellEditType.Metadata */, index: 0, metadata: {} },
                { editType: 1 /* CellEditType.Replace */, index: 1, count: 1, cells: cells.slice(1, 2) },
                { editType: 3 /* CellEditType.Metadata */, index: 2, metadata: {} },
            ]);
        });
    });
    test('computeEdits cell metadata changed', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: { name: 'foo' },
                },
                {
                    source: 'var b = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [
                { editType: 3 /* CellEditType.Metadata */, index: 0, metadata: { name: 'foo' } },
                { editType: 3 /* CellEditType.Metadata */, index: 1, metadata: {} },
            ]);
        });
    });
    test('computeEdits cell language changed', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'typescript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
                {
                    source: 'var b = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [
                { editType: 1 /* CellEditType.Replace */, index: 0, count: 1, cells: cells.slice(0, 1) },
                { editType: 3 /* CellEditType.Metadata */, index: 1, metadata: {} },
            ]);
        });
    });
    test('computeEdits cell kind changed', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
                {
                    source: 'var b = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Markup,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [
                { editType: 3 /* CellEditType.Metadata */, index: 0, metadata: {} },
                { editType: 1 /* CellEditType.Replace */, index: 1, count: 1, cells: cells.slice(1) },
            ]);
        });
    });
    test('computeEdits cell metadata & content changed', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: { name: 'foo' },
                },
                {
                    source: 'var b = 2;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: { name: 'bar' },
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [
                { editType: 3 /* CellEditType.Metadata */, index: 0, metadata: { name: 'foo' } },
                { editType: 1 /* CellEditType.Replace */, index: 1, count: 1, cells: cells.slice(1) },
            ]);
        });
    });
    test('computeEdits cell content changed while executing', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: {},
                },
                {
                    source: 'var b = 2;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: {},
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells, [model.cells[1].handle]);
            assert.deepStrictEqual(edits, [
                { editType: 3 /* CellEditType.Metadata */, index: 0, metadata: {} },
                { editType: 1 /* CellEditType.Replace */, index: 1, count: 1, cells: cells.slice(1) },
            ]);
        });
    });
    test('computeEdits cell internal metadata changed', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                    internalMetadata: { executionOrder: 1 },
                },
                {
                    source: 'var b = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [
                { editType: 1 /* CellEditType.Replace */, index: 0, count: 1, cells: cells.slice(0, 1) },
                { editType: 3 /* CellEditType.Metadata */, index: 1, metadata: {} },
            ]);
        });
    });
    test('computeEdits cell internal metadata changed while executing', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: {},
                },
                {
                    source: 'var b = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: {},
                    internalMetadata: { executionOrder: 1 },
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells, [model.cells[1].handle]);
            assert.deepStrictEqual(edits, [
                { editType: 3 /* CellEditType.Metadata */, index: 0, metadata: {} },
                { editType: 3 /* CellEditType.Metadata */, index: 1, metadata: {} },
            ]);
        });
    });
    test('computeEdits cell insertion', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
                {
                    source: 'var c = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: undefined,
                },
                {
                    source: 'var b = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: { foo: 'bar' },
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [
                { editType: 3 /* CellEditType.Metadata */, index: 0, metadata: {} },
                { editType: 1 /* CellEditType.Replace */, index: 1, count: 0, cells: cells.slice(1, 2) },
                { editType: 3 /* CellEditType.Metadata */, index: 1, metadata: { foo: 'bar' } },
            ]);
            model.applyEdits(edits, true, undefined, () => undefined, undefined, true);
            assert.equal(model.cells.length, 3);
            assert.equal(model.cells[1].getValue(), 'var c = 1;');
            assert.equal(model.cells[2].getValue(), 'var b = 1;');
            assert.deepStrictEqual(model.cells[2].metadata, { foo: 'bar' });
        });
    });
    test('computeEdits output changed', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [
                        {
                            outputId: 'someId',
                            outputs: [{ mime: Mimes.markdown, data: valueBytesFromString('_World_') }],
                        },
                    ],
                    metadata: undefined,
                },
                {
                    source: 'var b = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: { foo: 'bar' },
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [
                { editType: 3 /* CellEditType.Metadata */, index: 0, metadata: {} },
                {
                    editType: 2 /* CellEditType.Output */,
                    index: 0,
                    outputs: [
                        {
                            outputId: 'someId',
                            outputs: [{ mime: Mimes.markdown, data: valueBytesFromString('_World_') }],
                        },
                    ],
                    append: false,
                },
                { editType: 3 /* CellEditType.Metadata */, index: 1, metadata: { foo: 'bar' } },
            ]);
            model.applyEdits(edits, true, undefined, () => undefined, undefined, true);
            assert.equal(model.cells.length, 2);
            assert.strictEqual(model.cells[0].outputs.length, 1);
            assert.equal(model.cells[0].outputs[0].outputId, 'someId');
            assert.equal(model.cells[0].outputs[0].outputs[0].data.toString(), '_World_');
        });
    });
    test('computeEdits output items changed', async function () {
        await withTestNotebook([
            [
                'var a = 1;',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.markdown, data: valueBytesFromString('_Hello_') }],
                    },
                ],
                {},
            ],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
        ], (editor) => {
            const model = editor.textModel;
            const cells = [
                {
                    source: 'var a = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [
                        {
                            outputId: 'someId',
                            outputs: [{ mime: Mimes.markdown, data: valueBytesFromString('_World_') }],
                        },
                    ],
                    metadata: undefined,
                },
                {
                    source: 'var b = 1;',
                    language: 'javascript',
                    cellKind: CellKind.Code,
                    mime: undefined,
                    outputs: [],
                    metadata: { foo: 'bar' },
                },
            ];
            const edits = NotebookTextModel.computeEdits(model, cells);
            assert.deepStrictEqual(edits, [
                { editType: 3 /* CellEditType.Metadata */, index: 0, metadata: {} },
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    outputId: 'someId',
                    items: [{ mime: Mimes.markdown, data: valueBytesFromString('_World_') }],
                    append: false,
                },
                { editType: 3 /* CellEditType.Metadata */, index: 1, metadata: { foo: 'bar' } },
            ]);
            model.applyEdits(edits, true, undefined, () => undefined, undefined, true);
            assert.equal(model.cells.length, 2);
            assert.strictEqual(model.cells[0].outputs.length, 1);
            assert.equal(model.cells[0].outputs[0].outputId, 'someId');
            assert.equal(model.cells[0].outputs[0].outputs[0].data.toString(), '_World_');
        });
    });
    test('Append multiple text/plain output items', async function () {
        await withTestNotebook([
            [
                'var a = 1;',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: '1',
                        outputs: [{ mime: 'text/plain', data: valueBytesFromString('foo') }],
                    },
                ],
                {},
            ],
        ], (editor) => {
            const model = editor.textModel;
            const edits = [
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    outputId: '1',
                    append: true,
                    items: [
                        { mime: 'text/plain', data: VSBuffer.fromString('bar') },
                        { mime: 'text/plain', data: VSBuffer.fromString('baz') },
                    ],
                },
            ];
            model.applyEdits(edits, true, undefined, () => undefined, undefined, true);
            assert.equal(model.cells.length, 1);
            assert.equal(model.cells[0].outputs.length, 1);
            assert.equal(model.cells[0].outputs[0].outputs.length, 3);
            assert.equal(model.cells[0].outputs[0].outputs[0].mime, 'text/plain');
            assert.equal(model.cells[0].outputs[0].outputs[0].data.toString(), 'foo');
            assert.equal(model.cells[0].outputs[0].outputs[1].mime, 'text/plain');
            assert.equal(model.cells[0].outputs[0].outputs[1].data.toString(), 'bar');
            assert.equal(model.cells[0].outputs[0].outputs[2].mime, 'text/plain');
            assert.equal(model.cells[0].outputs[0].outputs[2].data.toString(), 'baz');
        });
    });
    test('Append multiple stdout stream output items to an output with another mime', async function () {
        await withTestNotebook([
            [
                'var a = 1;',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: '1',
                        outputs: [{ mime: 'text/plain', data: valueBytesFromString('foo') }],
                    },
                ],
                {},
            ],
        ], (editor) => {
            const model = editor.textModel;
            const edits = [
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    outputId: '1',
                    append: true,
                    items: [
                        { mime: 'application/vnd.code.notebook.stdout', data: VSBuffer.fromString('bar') },
                        { mime: 'application/vnd.code.notebook.stdout', data: VSBuffer.fromString('baz') },
                    ],
                },
            ];
            model.applyEdits(edits, true, undefined, () => undefined, undefined, true);
            assert.equal(model.cells.length, 1);
            assert.equal(model.cells[0].outputs.length, 1);
            assert.equal(model.cells[0].outputs[0].outputs.length, 3);
            assert.equal(model.cells[0].outputs[0].outputs[0].mime, 'text/plain');
            assert.equal(model.cells[0].outputs[0].outputs[0].data.toString(), 'foo');
            assert.equal(model.cells[0].outputs[0].outputs[1].mime, 'application/vnd.code.notebook.stdout');
            assert.equal(model.cells[0].outputs[0].outputs[1].data.toString(), 'bar');
            assert.equal(model.cells[0].outputs[0].outputs[2].mime, 'application/vnd.code.notebook.stdout');
            assert.equal(model.cells[0].outputs[0].outputs[2].data.toString(), 'baz');
        });
    });
    test('Compress multiple stdout stream output items', async function () {
        await withTestNotebook([
            [
                'var a = 1;',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: '1',
                        outputs: [
                            { mime: 'application/vnd.code.notebook.stdout', data: valueBytesFromString('foo') },
                        ],
                    },
                ],
                {},
            ],
        ], (editor) => {
            const model = editor.textModel;
            const edits = [
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    outputId: '1',
                    append: true,
                    items: [
                        { mime: 'application/vnd.code.notebook.stdout', data: VSBuffer.fromString('bar') },
                        { mime: 'application/vnd.code.notebook.stdout', data: VSBuffer.fromString('baz') },
                    ],
                },
            ];
            model.applyEdits(edits, true, undefined, () => undefined, undefined, true);
            assert.equal(model.cells.length, 1);
            assert.equal(model.cells[0].outputs.length, 1);
            assert.equal(model.cells[0].outputs[0].outputs.length, 1);
            assert.equal(model.cells[0].outputs[0].outputs[0].mime, 'application/vnd.code.notebook.stdout');
            assert.equal(model.cells[0].outputs[0].outputs[0].data.toString(), 'foobarbaz');
        });
    });
    test('Compress multiple stderr stream output items', async function () {
        await withTestNotebook([
            [
                'var a = 1;',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: '1',
                        outputs: [
                            { mime: 'application/vnd.code.notebook.stderr', data: valueBytesFromString('foo') },
                        ],
                    },
                ],
                {},
            ],
        ], (editor) => {
            const model = editor.textModel;
            const edits = [
                {
                    editType: 7 /* CellEditType.OutputItems */,
                    outputId: '1',
                    append: true,
                    items: [
                        { mime: 'application/vnd.code.notebook.stderr', data: VSBuffer.fromString('bar') },
                        { mime: 'application/vnd.code.notebook.stderr', data: VSBuffer.fromString('baz') },
                    ],
                },
            ];
            model.applyEdits(edits, true, undefined, () => undefined, undefined, true);
            assert.equal(model.cells.length, 1);
            assert.equal(model.cells[0].outputs.length, 1);
            assert.equal(model.cells[0].outputs[0].outputs.length, 1);
            assert.equal(model.cells[0].outputs[0].outputs[0].mime, 'application/vnd.code.notebook.stderr');
            assert.equal(model.cells[0].outputs[0].outputs[0].data.toString(), 'foobarbaz');
        });
    });
    test('findNextMatch', async function () {
        await withTestNotebook([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
        ], (editor, viewModel) => {
            const notebookModel = viewModel.notebookDocument;
            // Test case 1: Find 'var' starting from the first cell
            let findMatch = notebookModel.findNextMatch('var', { cellIndex: 0, position: new Position(1, 1) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 1);
            // Test case 2: Find 'b' starting from the second cell
            findMatch = notebookModel.findNextMatch('b', { cellIndex: 1, position: new Position(1, 1) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 5);
            // Test case 3: Find 'c' starting from the third cell
            findMatch = notebookModel.findNextMatch('c', { cellIndex: 2, position: new Position(1, 1) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 5);
            // Test case 4: Find 'd' starting from the fourth cell
            findMatch = notebookModel.findNextMatch('d', { cellIndex: 3, position: new Position(1, 1) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 5);
            // Test case 5: No match found
            findMatch = notebookModel.findNextMatch('e', { cellIndex: 0, position: new Position(1, 1) }, false, false, null);
            assert.strictEqual(findMatch, null);
        });
    });
    test('findNextMatch 2', async function () {
        await withTestNotebook([
            ['var a = 1; var a = 2;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
        ], (editor, viewModel) => {
            const notebookModel = viewModel.notebookDocument;
            // Test case 1: Find 'var' starting from the first cell
            let findMatch = notebookModel.findNextMatch('var', { cellIndex: 0, position: new Position(1, 1) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 1);
            // Test case 2: Find 'b' starting from the second cell
            findMatch = notebookModel.findNextMatch('b', { cellIndex: 1, position: new Position(1, 1) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 5);
            // Test case 3: Find 'c' starting from the third cell
            findMatch = notebookModel.findNextMatch('c', { cellIndex: 2, position: new Position(1, 1) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 5);
            // Test case 4: Find 'd' starting from the fourth cell
            findMatch = notebookModel.findNextMatch('d', { cellIndex: 3, position: new Position(1, 1) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 5);
            // Test case 5: No match found
            findMatch = notebookModel.findNextMatch('e', { cellIndex: 0, position: new Position(1, 1) }, false, false, null);
            assert.strictEqual(findMatch, null);
            // Test case 6: Same keywords in the same cell
            findMatch = notebookModel.findNextMatch('var', { cellIndex: 0, position: new Position(1, 1) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 1);
            findMatch = notebookModel.findNextMatch('var', { cellIndex: 0, position: new Position(1, 5) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 12);
            // Test case 7: Search from the middle of a cell with keyword before and after
            findMatch = notebookModel.findNextMatch('a', { cellIndex: 0, position: new Position(1, 10) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 13);
            // Test case 8: Search from a cell and next match is in another cell below
            findMatch = notebookModel.findNextMatch('var', { cellIndex: 0, position: new Position(1, 20) }, false, false, null);
            assert.ok(findMatch);
            assert.strictEqual(findMatch.match.range.startLineNumber, 1);
            assert.strictEqual(findMatch.match.range.startColumn, 1);
            // assert.strictEqual(match!.cellIndex, 1);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tUZXh0TW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rVGV4dE1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sUUFBUSxFQUVSLDBCQUEwQixFQUcxQixrQkFBa0IsR0FDbEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLFFBQVEsRUFDUixvQkFBb0IsRUFDcEIsZ0JBQWdCLEdBQ2hCLE1BQU0seUJBQXlCLENBQUE7QUFFaEMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUMvQixJQUFJLFdBQTRCLENBQUE7SUFDaEMsSUFBSSxvQkFBOEMsQ0FBQTtJQUNsRCxJQUFJLGVBQWlDLENBQUE7SUFFckMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6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LFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDbkMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDOUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pELE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUNyRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDekUsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3JFLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENB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LENBQUMsQ0FBQyxFQUFFLEVBQzlDLEtBQUssRUFDTCxLQUFLLEVBQ0wsSUFBSSxDQUNKLENBQUE7WUFDRCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3BCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXpELHFEQUFxRDtZQUNyRCxTQUFTLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FDdEMsR0FBRyxFQUNILEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQzlDLEtBQUssRUFDTCxLQUFLLEVBQ0wsSUFBSSxDQUNKLENBQUE7WUFDRCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3BCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXpELHNEQUFzRDtZQUN0RCxTQUFTLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FDdEMsR0FBRyxFQUNILEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQzlDLEtBQUssRUFDTCxLQUFLLEVBQ0wsSUFBSSxDQUNKLENBQUE7WUFDRCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3BCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxL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
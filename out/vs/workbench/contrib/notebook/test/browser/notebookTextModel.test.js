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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tUZXh0TW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va1RleHRNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFckYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUVOLFFBQVEsRUFFUiwwQkFBMEIsRUFHMUIsa0JBQWtCLEdBQ2xCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixRQUFRLEVBQ1Isb0JBQW9CLEVBQ3BCLGdCQUFnQixHQUNoQixNQUFNLHlCQUF5QixDQUFBO0FBRWhDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsSUFBSSxXQUE0QixDQUFBO0lBQ2hDLElBQUksb0JBQThDLENBQUE7SUFDbEQsSUFBSSxlQUFpQyxDQUFBO0lBRXJDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsVUFB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LENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMxRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ25DLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzlDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6RCxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDckUsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3pFLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUNyRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENB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dkQsSUFBSSxTQUFTLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FDMUMsS0FBSyxFQUNMLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQzlDLEtBQUssRUFDTCxLQUFLLEVBQ0wsSUFBSSxDQUNKLENBQUE7WUFDRCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3BCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXpELHNEQUFzRDtZQUN0RCxTQUFTLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FDdEMsR0FBRyxFQUNILEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQzlDLEtBQUssRUFDTCxLQUFLLEVBQ0wsSUFBSSxDQUNKLENBQUE7WUFDRCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3BCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXpELHFEQUFxRDtZQUNyRCxTQUFTLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FDdEMsR0FBRyxFQUNILEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQzlDLEtBQUssRUFDTCxLQUFL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LENBQUMsRUFBRSxFQUM5QyxLQUFLLEVBQ0wsS0FBSyxFQUNMLElBQUksQ0FDSixDQUFBO1lBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNwQixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUV6RCxxREFBcUQ7WUFDckQsU0FBUyxHQUFHLGFBQWEsQ0FBQyxhQUFhLENBQ3RDLEdBQUcsRUFDSCxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUM5QyxLQUFLLEVBQ0wsS0FBSyxFQUNMLElBQUksQ0FDSixDQUFBO1lBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNwQixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUV6RCxzREFBc0Q7WUFDdEQsU0FBUyxHQUFHLGFBQWEsQ0FBQyxhQUFhLENBQ3RDLEdBQUcsRUFDSCxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUM5QyxLQUFLLEVBQ0wsS0FBSyxFQUNMLElBQUksQ0FDSixDQUFBO1lBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNwQixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxD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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { CancellationTokenSource, } from '../../../../../../base/common/cancellation.js';
import { LcsDiff } from '../../../../../../base/common/diff/diff.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../../../base/common/mime.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NotebookDiffEditorEventDispatcher } from '../../../browser/diff/eventDispatcher.js';
import { NotebookDiffViewModel, prettyChanges, } from '../../../browser/diff/notebookDiffViewModel.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { INotebookService } from '../../../common/notebookService.js';
import { withTestNotebookDiffModel } from '../testNotebookEditor.js';
class CellSequence {
    constructor(textModel) {
        this.textModel = textModel;
    }
    getElements() {
        const hashValue = new Int32Array(this.textModel.cells.length);
        for (let i = 0; i < this.textModel.cells.length; i++) {
            hashValue[i] = this.textModel.cells[i].getHashValue();
        }
        return hashValue;
    }
}
suite('NotebookDiff', () => {
    let disposables;
    let token;
    let eventDispatcher;
    let diffViewModel;
    let diffResult;
    let notebookEditorWorkerService;
    let heightCalculator;
    teardown(() => disposables.dispose());
    const configurationService = new TestConfigurationService({
        notebook: { diff: { ignoreMetadata: true } },
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        disposables = new DisposableStore();
        const cancellation = disposables.add(new CancellationTokenSource());
        eventDispatcher = disposables.add(new NotebookDiffEditorEventDispatcher());
        token = cancellation.token;
        notebookEditorWorkerService = new (class extends mock() {
            computeDiff() {
                return Promise.resolve({ cellsDiff: diffResult, metadataChanged: false });
            }
        })();
        heightCalculator = new (class extends mock() {
            diffAndComputeHeight() {
                return Promise.resolve(0);
            }
            computeHeightFromLines(_lineCount) {
                return 0;
            }
        })();
    });
    async function verifyChangeEventIsNotFired(diffViewModel) {
        let eventArgs = undefined;
        disposables.add(diffViewModel.onDidChangeItems((e) => (eventArgs = e)));
        await diffViewModel.computeDiff(token);
        assert.strictEqual(eventArgs, undefined);
    }
    test('diff different source', async () => {
        await withTestNotebookDiffModel([
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
        ], [
            [
                'y',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            assert.strictEqual(diffResult.changes.length, 1);
            assert.deepStrictEqual(diffResult.changes.map((change) => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength,
            })), [
                {
                    originalStart: 0,
                    originalLength: 1,
                    modifiedStart: 0,
                    modifiedLength: 1,
                },
            ]);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 1);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
        });
    });
    test('No changes when re-computing diff with the same source', async () => {
        await withTestNotebookDiffModel([
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
        ], [
            [
                'y',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            assert.strictEqual(diffResult.changes.length, 1);
            assert.deepStrictEqual(diffResult.changes.map((change) => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength,
            })), [
                {
                    originalStart: 0,
                    originalLength: 1,
                    modifiedStart: 0,
                    modifiedLength: 1,
                },
            ]);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff different output', async () => {
        await withTestNotebookDiffModel([
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([5])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 5 },
            ],
            ['', 'javascript', CellKind.Code, [], {}],
        ], [
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
            ['', 'javascript', CellKind.Code, [], {}],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            assert.strictEqual(diffResult.changes.length, 1);
            assert.deepStrictEqual(diffResult.changes.map((change) => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength,
            })), [
                {
                    originalStart: 0,
                    originalLength: 1,
                    modifiedStart: 0,
                    modifiedLength: 1,
                },
            ]);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs = undefined;
            disposables.add(diffViewModel.onDidChangeItems((e) => (eventArgs = e)));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            diffViewModel.items[1].showHiddenCells();
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, {
                start: 1,
                deleteCount: 1,
                elements: [diffViewModel.items[1]],
            });
            diffViewModel.items[1].hideUnchangedCells();
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            assert.deepStrictEqual(eventArgs, {
                start: 1,
                deleteCount: 1,
                elements: [diffViewModel.items[1]],
            });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff test small source', async () => {
        await withTestNotebookDiffModel([['123456789', 'javascript', CellKind.Code, [], {}]], [['987654321', 'javascript', CellKind.Code, [], {}]], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            assert.strictEqual(diffResult.changes.length, 1);
            assert.deepStrictEqual(diffResult.changes.map((change) => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength,
            })), [
                {
                    originalStart: 0,
                    originalLength: 1,
                    modifiedStart: 0,
                    modifiedLength: 1,
                },
            ]);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 1);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff test data single cell', async () => {
        await withTestNotebookDiffModel([
            [
                ['# This version has a bug\n', 'def mult(a, b):\n', '    return a / b'].join(''),
                'javascript',
                CellKind.Code,
                [],
                {},
            ],
        ], [
            [
                ['def mult(a, b):\n', "    'This version is debugged.'\n", '    return a * b'].join(''),
                'javascript',
                CellKind.Code,
                [],
                {},
            ],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            assert.strictEqual(diffResult.changes.length, 1);
            assert.deepStrictEqual(diffResult.changes.map((change) => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength,
            })), [
                {
                    originalStart: 0,
                    originalLength: 1,
                    modifiedStart: 0,
                    modifiedLength: 1,
                },
            ]);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 1);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff foo/foe', async () => {
        await withTestNotebookDiffModel([
            [
                ['def foe(x, y):\n', '    return x + y\n', 'foe(3, 2)'].join(''),
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([6])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 5 },
            ],
            [
                ['def foo(x, y):\n', '    return x * y\n', 'foo(1, 2)'].join(''),
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([2])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 6 },
            ],
            ['', 'javascript', CellKind.Code, [], {}],
        ], [
            [
                ['def foo(x, y):\n', '    return x * y\n', 'foo(1, 2)'].join(''),
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([6])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 5 },
            ],
            [
                ['def foe(x, y):\n', '    return x + y\n', 'foe(3, 2)'].join(''),
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([2])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 6 },
            ],
            ['', 'javascript', CellKind.Code, [], {}],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs = undefined;
            disposables.add(diffViewModel.onDidChangeItems((e) => (eventArgs = e)));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 3);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            assert.strictEqual(diffViewModel.items[1].type, 'modified');
            assert.strictEqual(diffViewModel.items[2].type, 'placeholder');
            diffViewModel.items[2].showHiddenCells();
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, {
                start: 2,
                deleteCount: 1,
                elements: [diffViewModel.items[2]],
            });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff markdown', async () => {
        await withTestNotebookDiffModel([
            ['This is a test notebook with only markdown cells', 'markdown', CellKind.Markup, [], {}],
            ['Lorem ipsum dolor sit amet', 'markdown', CellKind.Markup, [], {}],
            ['In other news', 'markdown', CellKind.Markup, [], {}],
        ], [
            ['This is a test notebook with markdown cells only', 'markdown', CellKind.Markup, [], {}],
            ['Lorem ipsum dolor sit amet', 'markdown', CellKind.Markup, [], {}],
            ['In the news', 'markdown', CellKind.Markup, [], {}],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs = undefined;
            disposables.add(diffViewModel.onDidChangeItems((e) => (eventArgs = e)));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 3);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            assert.strictEqual(diffViewModel.items[2].type, 'modified');
            diffViewModel.items[1].showHiddenCells();
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, {
                start: 1,
                deleteCount: 1,
                elements: [diffViewModel.items[1]],
            });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff insert', async () => {
        await withTestNotebookDiffModel([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
        ], [
            ['var h = 8;', 'javascript', CellKind.Code, [], {}],
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
        ], async (model, disposables, accessor) => {
            diffResult = {
                changes: [
                    {
                        originalStart: 0,
                        originalLength: 0,
                        modifiedStart: 0,
                        modifiedLength: 1,
                    },
                ],
                quitEarly: false,
            };
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs;
            disposables.add(diffViewModel.onDidChangeItems((e) => (eventArgs = e)));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(eventArgs?.firstChangeIndex, 0);
            assert.strictEqual(diffViewModel.items[0].type, 'insert');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            diffViewModel.items[1].showHiddenCells();
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, {
                start: 1,
                deleteCount: 1,
                elements: [diffViewModel.items[1], diffViewModel.items[2]],
            });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff insert 2', async () => {
        await withTestNotebookDiffModel([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], [
            ['var h = 8;', 'javascript', CellKind.Code, [], {}],
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], async (model, disposables, accessor) => {
            const eventDispatcher = disposables.add(new NotebookDiffEditorEventDispatcher());
            diffResult = {
                changes: [
                    {
                        originalStart: 0,
                        originalLength: 0,
                        modifiedStart: 0,
                        modifiedLength: 1,
                    },
                    {
                        originalStart: 0,
                        originalLength: 6,
                        modifiedStart: 1,
                        modifiedLength: 6,
                    },
                ],
                quitEarly: false,
            };
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs;
            disposables.add(diffViewModel.onDidChangeItems((e) => (eventArgs = e)));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(eventArgs?.firstChangeIndex, 0);
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'insert');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            diffViewModel.items[1].showHiddenCells();
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[3].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[4].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[5].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[6].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[7].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, {
                start: 1,
                deleteCount: 1,
                elements: diffViewModel.items.slice(1),
            });
            diffViewModel.items[1].hideUnchangedCells();
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'insert');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            assert.deepStrictEqual(eventArgs, {
                start: 1,
                deleteCount: 7,
                elements: [diffViewModel.items[1]],
            });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff insert 3', async () => {
        await withTestNotebookDiffModel([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], [
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var h = 8;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], async (model, disposables, accessor) => {
            diffResult = {
                changes: [
                    {
                        originalStart: 4,
                        originalLength: 0,
                        modifiedStart: 4,
                        modifiedLength: 1,
                    },
                ],
                quitEarly: false,
            };
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs = undefined;
            disposables.add(diffViewModel.onDidChangeItems((e) => (eventArgs = e)));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items[0].type, 'placeholder');
            assert.strictEqual(diffViewModel.items[1].type, 'insert');
            assert.strictEqual(diffViewModel.items[2].type, 'placeholder');
            diffViewModel.items[0].showHiddenCells();
            assert.strictEqual(diffViewModel.items[0].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[3].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[4].type, 'insert');
            assert.strictEqual(diffViewModel.items[5].type, 'placeholder');
            assert.deepStrictEqual(eventArgs, {
                start: 0,
                deleteCount: 1,
                elements: diffViewModel.items.slice(0, 4),
            });
            diffViewModel.items[5].showHiddenCells();
            assert.strictEqual(diffViewModel.items[0].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[3].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[4].type, 'insert');
            assert.strictEqual(diffViewModel.items[5].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, {
                start: 5,
                deleteCount: 1,
                elements: diffViewModel.items.slice(5),
            });
            diffViewModel.items[0].hideUnchangedCells();
            assert.strictEqual(diffViewModel.items[0].type, 'placeholder');
            assert.strictEqual(diffViewModel.items[1].type, 'insert');
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, {
                start: 0,
                deleteCount: 4,
                elements: diffViewModel.items.slice(0, 1),
            });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('LCS', async () => {
        await withTestNotebookDiffModel([
            ['# Description', 'markdown', CellKind.Markup, [], { metadata: {} }],
            [
                'x = 3',
                'javascript',
                CellKind.Code,
                [],
                { metadata: { collapsed: true }, executionOrder: 1 },
            ],
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 1 },
            ],
            ['x', 'javascript', CellKind.Code, [], { metadata: { collapsed: false } }],
        ], [
            ['# Description', 'markdown', CellKind.Markup, [], { metadata: {} }],
            [
                'x = 3',
                'javascript',
                CellKind.Code,
                [],
                { metadata: { collapsed: true }, executionOrder: 1 },
            ],
            ['x', 'javascript', CellKind.Code, [], { metadata: { collapsed: false } }],
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 1 },
            ],
        ], async (model) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            const diffResult = diff.ComputeDiff(false);
            assert.deepStrictEqual(diffResult.changes.map((change) => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength,
            })), [
                {
                    originalStart: 2,
                    originalLength: 0,
                    modifiedStart: 2,
                    modifiedLength: 1,
                },
                {
                    originalStart: 3,
                    originalLength: 1,
                    modifiedStart: 4,
                    modifiedLength: 0,
                },
            ]);
        });
    });
    test('LCS 2', async () => {
        await withTestNotebookDiffModel([
            ['# Description', 'markdown', CellKind.Markup, [], { metadata: {} }],
            [
                'x = 3',
                'javascript',
                CellKind.Code,
                [],
                { metadata: { collapsed: true }, executionOrder: 1 },
            ],
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 1 },
            ],
            ['x', 'javascript', CellKind.Code, [], { metadata: { collapsed: false } }],
            ['x = 5', 'javascript', CellKind.Code, [], {}],
            ['x', 'javascript', CellKind.Code, [], {}],
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([5])) }],
                    },
                ],
                {},
            ],
        ], [
            ['# Description', 'markdown', CellKind.Markup, [], { metadata: {} }],
            [
                'x = 3',
                'javascript',
                CellKind.Code,
                [],
                { metadata: { collapsed: true }, executionOrder: 1 },
            ],
            ['x', 'javascript', CellKind.Code, [], { metadata: { collapsed: false } }],
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 1 },
            ],
            ['x = 5', 'javascript', CellKind.Code, [], {}],
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([5])) }],
                    },
                ],
                {},
            ],
            ['x', 'javascript', CellKind.Code, [], {}],
        ], async (model) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            const diffResult = diff.ComputeDiff(false);
            prettyChanges(model.original.notebook, model.modified.notebook, diffResult);
            assert.deepStrictEqual(diffResult.changes.map((change) => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength,
            })), [
                {
                    originalStart: 2,
                    originalLength: 0,
                    modifiedStart: 2,
                    modifiedLength: 1,
                },
                {
                    originalStart: 3,
                    originalLength: 1,
                    modifiedStart: 4,
                    modifiedLength: 0,
                },
                {
                    originalStart: 5,
                    originalLength: 0,
                    modifiedStart: 5,
                    modifiedLength: 1,
                },
                {
                    originalStart: 6,
                    originalLength: 1,
                    modifiedStart: 7,
                    modifiedLength: 0,
                },
            ]);
        });
    });
    test('LCS 3', async () => {
        await withTestNotebookDiffModel([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], [
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var h = 8;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], async (model) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            const diffResult = diff.ComputeDiff(false);
            prettyChanges(model.original.notebook, model.modified.notebook, diffResult);
            assert.deepStrictEqual(diffResult.changes.map((change) => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength,
            })), [
                {
                    originalStart: 4,
                    originalLength: 0,
                    modifiedStart: 4,
                    modifiedLength: 1,
                },
            ]);
        });
    });
    test('diff output', async () => {
        await withTestNotebookDiffModel([
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
            [
                'y',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([4])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
        ], [
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
            [
                'y',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([5])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'placeholder');
            diffViewModel.items[0].showHiddenCells();
            assert.strictEqual(diffViewModel.items[0].checkIfOutputsModified(), false);
            assert.strictEqual(diffViewModel.items[1].type, 'modified');
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff output fast check', async () => {
        await withTestNotebookDiffModel([
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
            [
                'y',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([4])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
        ], [
            [
                'x',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
            [
                'y',
                'javascript',
                CellKind.Code,
                [
                    {
                        outputId: 'someOtherId',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([5])) }],
                    },
                ],
                { metadata: { collapsed: false }, executionOrder: 3 },
            ],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'placeholder');
            diffViewModel.items[0].showHiddenCells();
            assert.strictEqual(diffViewModel.items[0].original.textModel.equal(diffViewModel.items[0].modified.textModel), true);
            assert.strictEqual(diffViewModel.items[1].original.textModel.equal(diffViewModel.items[1].modified.textModel), false);
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvZGlmZi9ub3RlYm9va0RpZmYudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQTBCLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBSzNILE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBSzVGLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsYUFBYSxHQUNiLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBc0IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVyRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUdwRSxNQUFNLFlBQVk7SUFDakIsWUFBcUIsU0FBNkI7UUFBN0IsY0FBUyxHQUFULFNBQVMsQ0FB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Q0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDNUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUU7Z0JBQ2pDLEtBQUssRUFBRSxDQUFDO2dCQUNSLFdBQVcsRUFBRSxDQUFDO2dCQUNkLFFBQVEsRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDdEMsQ0FBQyxDQUVEO1lBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQStDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtZQUUzRixNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFB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Q25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDbkQsRUFDRDtZQUNDLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUNuRCxFQUNELEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNm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
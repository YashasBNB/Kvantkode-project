/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { adjustCellDiffAndOriginalModelBasedOnCellAddDelete, adjustCellDiffAndOriginalModelBasedOnCellMovements, adjustCellDiffForKeepingADeletedCell, adjustCellDiffForKeepingAnInsertedCell, adjustCellDiffForRevertingADeletedCell, adjustCellDiffForRevertingAnInsertedCell, } from '../../browser/chatEditing/notebook/helpers.js';
import { nullDocumentDiff } from '../../../../../editor/common/diff/documentDiffProvider.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { CellKind, NotebookCellsChangeType, } from '../../../notebook/common/notebookCommon.js';
import { URI } from '../../../../../base/common/uri.js';
import { hash } from '../../../../../base/common/hash.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
suite('ChatEditingModifiedNotebookEntry', function () {
    suite('Keep Inserted Cell', function () {
        const keep = () => Promise.resolve(true);
        const undo = () => Promise.resolve(true);
        const diff = observableValue('cell1', nullDocumentDiff);
        const appliedEdits = [];
        setup(() => {
            appliedEdits.length = 0;
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        function createModifiedModel(id) {
            return `Modified:${id}`;
        }
        function createOriginalModel(id) {
            return `Original:${id}`;
        }
        function applyEdits(edits) {
            appliedEdits.push(...edits);
            return true;
        }
        function createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex) {
            return {
                diff,
                keep,
                undo,
                type: 'unchanged',
                originalModel: createOriginalModel(`InsertedOriginal:${originalCellIndex}`),
                originalCellIndex,
                modifiedCellIndex,
                modifiedModel: createModifiedModel(`InsertedModified:${modifiedCellIndex}`),
            };
        }
        test('Keep first inserted', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
            ];
            const result = adjustCellDiffForKeepingAnInsertedCell(0, cellsDiffInfo, {}, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 0, cells: [{}], count: 0 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel(`InsertedOriginal:0`),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel(`InsertedModified:0`),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
            ]);
        });
        test('Keep first inserted with multiple cells', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('2'),
                },
            ];
            const result = adjustCellDiffForKeepingAnInsertedCell(0, cellsDiffInfo, {}, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 0, cells: [{}], count: 0 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('InsertedOriginal:0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('InsertedModified:0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 3,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('2'),
                },
            ]);
        });
        test('Keep second inserted with multiple cells', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('2'),
                },
            ];
            const result = adjustCellDiffForKeepingAnInsertedCell(2, cellsDiffInfo, {}, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 2, cells: [{}], count: 0 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('InsertedOriginal:2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('InsertedModified:2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 3,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('2'),
                },
            ]);
        });
    });
    suite('Revert Inserted Cell', function () {
        const keep = () => Promise.resolve(true);
        const undo = () => Promise.resolve(true);
        const diff = observableValue('cell1', nullDocumentDiff);
        const appliedEdits = [];
        setup(() => {
            appliedEdits.length = 0;
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        function createModifiedModel(id) {
            return `Modified:${id}`;
        }
        function createOriginalModel(id) {
            return `Original:${id}`;
        }
        function applyEdits(edits) {
            appliedEdits.push(...edits);
            return true;
        }
        test('Delete first inserted', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
            ];
            const result = adjustCellDiffForRevertingAnInsertedCell(0, cellsDiffInfo, applyEdits);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 0, cells: [], count: 1 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
            ]);
        });
        test('Delete first inserted with multiple cells', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('2'),
                },
            ];
            const result = adjustCellDiffForRevertingAnInsertedCell(0, cellsDiffInfo, applyEdits);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 0, cells: [], count: 1 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('2'),
                },
            ]);
        });
        test('Delete second inserted with multiple cells', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('2'),
                },
            ];
            const result = adjustCellDiffForRevertingAnInsertedCell(2, cellsDiffInfo, applyEdits);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 2, cells: [], count: 1 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('2'),
                },
            ]);
        });
        test('Delete second inserted with multiple cells (subsequent inserts)', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('3'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 4,
                    modifiedModel: createModifiedModel('4'),
                },
            ];
            const result = adjustCellDiffForRevertingAnInsertedCell(2, cellsDiffInfo, applyEdits);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 2, cells: [], count: 1 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('3'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('4'),
                },
            ]);
        });
    });
    suite('Keep Deleted Cell', function () {
        const keep = () => Promise.resolve(true);
        const undo = () => Promise.resolve(true);
        const diff = observableValue('cell1', nullDocumentDiff);
        const appliedEdits = [];
        setup(() => {
            appliedEdits.length = 0;
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        function createModifiedModel(id) {
            return `Modified:${id}`;
        }
        function createOriginalModel(id) {
            return `Original:${id}`;
        }
        function applyEdits(edits) {
            appliedEdits.push(...edits);
            return true;
        }
        test('Keep first deleted cell', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
            ];
            const result = adjustCellDiffForKeepingADeletedCell(0, cellsDiffInfo, applyEdits);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 0, cells: [], count: 1 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 0,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
            ]);
        });
        test('Keep second deleted cell', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
            ];
            const result = adjustCellDiffForKeepingADeletedCell(1, cellsDiffInfo, applyEdits);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 1, cells: [], count: 1 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
            ]);
        });
        test('Keep first deleted with multiple cells', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('2'),
                },
            ];
            const result = adjustCellDiffForKeepingADeletedCell(1, cellsDiffInfo, applyEdits);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 1, cells: [], count: 1 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('2'),
                },
            ]);
        });
    });
    suite('Revert Deleted Cell', function () {
        const keep = () => Promise.resolve(true);
        const undo = () => Promise.resolve(true);
        const diff = observableValue('cell1', nullDocumentDiff);
        const appliedEdits = [];
        setup(() => {
            appliedEdits.length = 0;
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        function createModifiedModel(id) {
            return `Modified:${id}`;
        }
        function createOriginalModel(id) {
            return `Original:${id}`;
        }
        function applyEdits(edits) {
            appliedEdits.push(...edits);
            return true;
        }
        function createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex) {
            return {
                diff,
                keep,
                undo,
                type: 'unchanged',
                originalModel: createOriginalModel(`InsertedOriginal:${originalCellIndex}`),
                originalCellIndex,
                modifiedCellIndex,
                modifiedModel: createModifiedModel(`InsertedModified:${modifiedCellIndex}`),
            };
        }
        test('Revert first deleted cell', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
            ];
            const result = adjustCellDiffForRevertingADeletedCell(0, cellsDiffInfo, {}, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 0, cells: [{}], count: 0 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('InsertedOriginal:0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('InsertedModified:0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('0'),
                },
            ]);
        });
        test('Revert second deleted cell', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
            ];
            const result = adjustCellDiffForRevertingADeletedCell(1, cellsDiffInfo, {}, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 0, cells: [{}], count: 0 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('InsertedOriginal:1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('InsertedModified:0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('0'),
                },
            ]);
        });
        test('Revert first deleted with multiple cells', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 4,
                    modifiedModel: createModifiedModel('2'),
                },
            ];
            const result = adjustCellDiffForRevertingADeletedCell(1, cellsDiffInfo, {}, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                { editType: 1 /* CellEditType.Replace */, index: 3, cells: [{}], count: 0 },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('New0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('InsertedOriginal:1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('InsertedModified:3'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 4,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 5,
                    modifiedModel: createModifiedModel('2'),
                },
            ]);
        });
    });
    suite('Cell Addition', function () {
        const keep = () => Promise.resolve(true);
        const undo = () => Promise.resolve(true);
        const diff = observableValue('cell1', nullDocumentDiff);
        const appliedEdits = [];
        setup(() => {
            appliedEdits.length = 0;
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        function createModifiedModel(id) {
            return `Modified:${id}`;
        }
        function createOriginalModel(id) {
            return `Original:${id}`;
        }
        function applyEdits(edits) {
            appliedEdits.push(...edits);
            return true;
        }
        function createICell(cellKind, source) {
            const handle = hash(generateUuid());
            return {
                uri: URI.parse(`file:///path/${handle}`),
                handle,
                cellKind,
                language: cellKind === CellKind.Markup ? 'markdown' : 'python',
                outputs: [],
                metadata: {},
                getHashValue: () => {
                    return hash(`${handle}=>${cellKind}=>${source}`);
                },
                getValue: () => {
                    return source;
                },
                internalMetadata: {},
            };
        }
        function createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex) {
            return {
                diff,
                keep,
                undo,
                type: 'unchanged',
                originalModel: createOriginalModel(`InsertedOriginal:${originalCellIndex}`),
                originalCellIndex,
                modifiedCellIndex,
                modifiedModel: createModifiedModel(`InsertedModified:${modifiedCellIndex}`),
            };
        }
        test('Insert a new cell into an unchanged notebook', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
            ];
            const cell = createICell(CellKind.Code, 'print("Hello World")');
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([0, 0, [cell]], cellsDiffInfo, 3, 2, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 0,
                    cells: [
                        {
                            cellKind: CellKind.Code,
                            language: 'python',
                            outputs: [],
                            mime: undefined,
                            metadata: {},
                            internalMetadata: {},
                            source: cell.getValue(),
                        },
                    ],
                    count: 0,
                },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel(`InsertedOriginal:0`),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel(`InsertedModified:0`),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
            ]);
        });
        test('Insert a new cell into a notebook with 3 cells deleted', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 4,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('4'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('5'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'modified',
                    originalModel: createOriginalModel('6'),
                    originalCellIndex: 6,
                    modifiedCellIndex: 4,
                    modifiedModel: createModifiedModel('6'),
                },
            ];
            const cell = createICell(CellKind.Code, 'print("Hello World")');
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([2, 0, [cell]], cellsDiffInfo, 6, 7, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 4,
                    cells: [
                        {
                            cellKind: CellKind.Code,
                            language: 'python',
                            outputs: [],
                            mime: undefined,
                            metadata: {},
                            internalMetadata: {},
                            source: cell.getValue(),
                        },
                    ],
                    count: 0,
                },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('InsertedOriginal:4'),
                    originalCellIndex: 4,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('InsertedModified:2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('4'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 6,
                    modifiedCellIndex: 4,
                    modifiedModel: createModifiedModel('5'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'modified',
                    originalModel: createOriginalModel('6'),
                    originalCellIndex: 7,
                    modifiedCellIndex: 5,
                    modifiedModel: createModifiedModel('6'),
                },
            ]);
        });
        test('Insert 2 new cells into an notebook with 3 cells deleted', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 4,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('5'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('1'),
                },
            ];
            const cell1 = createICell(CellKind.Code, 'print("Hello World")');
            const cell2 = createICell(CellKind.Code, 'print("Foo Bar")');
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([2, 0, [cell1, cell2]], cellsDiffInfo, 4, 6, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 4,
                    cells: [
                        {
                            cellKind: CellKind.Code,
                            language: 'python',
                            outputs: [],
                            mime: undefined,
                            metadata: {},
                            internalMetadata: {},
                            source: cell1.getValue(),
                        },
                        {
                            cellKind: CellKind.Code,
                            language: 'python',
                            outputs: [],
                            mime: undefined,
                            metadata: {},
                            internalMetadata: {},
                            source: cell2.getValue(),
                        },
                    ],
                    count: 0,
                },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel(`InsertedOriginal:4`),
                    originalCellIndex: 4,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel(`InsertedModified:2`),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel(`InsertedOriginal:5`),
                    originalCellIndex: 5,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel(`InsertedModified:3`),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 6,
                    modifiedCellIndex: 4,
                    modifiedModel: createModifiedModel('5'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 7,
                    modifiedCellIndex: 5,
                    modifiedModel: createModifiedModel('1'),
                },
            ]);
        });
        test('Delete a cell from an unchanged notebook', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([0, 1, []], cellsDiffInfo, 2, 2, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 0,
                    cells: [],
                    count: 1,
                },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('1'),
                },
            ]);
        });
        test('Delete last cell from an unchanged notebook', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([1, 1, []], cellsDiffInfo, 2, 2, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    cells: [],
                    count: 1,
                },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
            ]);
        });
        test('Delete the first cell, then insert a new cell at the top', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('1'),
                },
            ];
            const cell1 = createICell(CellKind.Code, 'print("Hello World")');
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([0, 0, [cell1]], cellsDiffInfo, 2, 2, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    cells: [
                        {
                            cellKind: CellKind.Code,
                            language: 'python',
                            outputs: [],
                            mime: undefined,
                            metadata: {},
                            internalMetadata: {},
                            source: cell1.getValue(),
                        },
                    ],
                    count: 0,
                },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('InsertedOriginal:1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('InsertedModified:0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
            ]);
        });
        test('Delete a new cell from a notebook with 3 cells deleted', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 4,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('5'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('1'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([
                1,
                1,
                [
                // createICell(CellKind.Code, 'print("Hello World")')
                ],
            ], cellsDiffInfo, 4, 6, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, []);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 4,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('5'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
            ]);
        });
        test('Delete 2 cells from a notebook with 3 cells deleted', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 4,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('5'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('1'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([1, 2, []], cellsDiffInfo, 4, 6, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 4,
                    cells: [],
                    count: 1,
                },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 4,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
            ]);
        });
        test('Delete 3 cells from a notebook with 3 cells deleted', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'modified',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 4,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('5'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('6'),
                    originalCellIndex: 6,
                    modifiedCellIndex: 4,
                    modifiedModel: createModifiedModel('6'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([1, 3, []], cellsDiffInfo, 5, 7, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    cells: [],
                    count: 1,
                },
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 5,
                    cells: [],
                    count: 1,
                },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('6'),
                    originalCellIndex: 4,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('6'),
                },
            ]);
        });
        test('Insert 1 cell at the bottom via chat, then user creats a new cell just below that', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New1'),
                },
            ];
            const cell1 = createICell(CellKind.Code, 'print("Hello World")');
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([2, 0, [cell1]], cellsDiffInfo, 3, 1, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    cells: [
                        {
                            cellKind: CellKind.Code,
                            language: 'python',
                            outputs: [],
                            mime: undefined,
                            metadata: {},
                            internalMetadata: {},
                            source: cell1.getValue(),
                        },
                    ],
                    count: 0,
                },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('InsertedOriginal:1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('InsertedModified:2'),
                },
            ]);
        });
        test('Insert 1 cell at the bottom via chat, then user creats anew cells above the previous new cell', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('New1'),
                },
            ];
            const cell1 = createICell(CellKind.Code, 'print("Hello World")');
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([2, 0, [cell1]], cellsDiffInfo, 3, 2, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 2,
                    cells: [
                        {
                            cellKind: CellKind.Code,
                            language: 'python',
                            outputs: [],
                            mime: undefined,
                            metadata: {},
                            internalMetadata: {},
                            source: cell1.getValue(),
                        },
                    ],
                    count: 0,
                },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('InsertedOriginal:2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('InsertedModified:2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('New1'),
                },
            ]);
        });
        test('Insert 1 cell at the bottom via chat, then user inserts a new cells below the  previous new cell', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('New1'),
                },
            ];
            const cell1 = createICell(CellKind.Code, 'print("Hello World")');
            const result = adjustCellDiffAndOriginalModelBasedOnCellAddDelete([3, 0, [cell1]], cellsDiffInfo, 3, 2, applyEdits, createModifiedCellDiffInfo);
            assert.deepStrictEqual(appliedEdits, [
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 2,
                    cells: [
                        {
                            cellKind: CellKind.Code,
                            language: 'python',
                            outputs: [],
                            mime: undefined,
                            metadata: {},
                            internalMetadata: {},
                            source: cell1.getValue(),
                        },
                    ],
                    count: 0,
                },
            ]);
            assert.deepStrictEqual(result, [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('InsertedOriginal:2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('InsertedModified:3'),
                },
            ]);
        });
    });
    suite('Cell Movements', function () {
        const keep = () => Promise.resolve(true);
        const undo = () => Promise.resolve(true);
        const diff = observableValue('cell1', nullDocumentDiff);
        ensureNoDisposablesAreLeakedInTestSuite();
        function createModifiedModel(id) {
            return `Modified:${id}`;
        }
        function createOriginalModel(id) {
            return `Original:${id}`;
        }
        test('Swap first two inserted cells in a previously empty notebook', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellMovements({
                cells: [],
                kind: NotebookCellsChangeType.Move,
                index: 0,
                length: 1,
                newIdx: 1,
            }, cellsDiffInfo);
            assert.ok(result);
            assert.strictEqual(result[1].length, 0);
            assert.deepStrictEqual(result[0], [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
            ]);
        });
        test('Swap first two inserted cells in a notebook that had 2 cells', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('3'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellMovements({
                cells: [],
                kind: NotebookCellsChangeType.Move,
                index: 0,
                length: 1,
                newIdx: 1,
            }, cellsDiffInfo);
            assert.ok(result);
            assert.strictEqual(result[1].length, 0);
            assert.deepStrictEqual(result[0], [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('3'),
                },
            ]);
        });
        test('Move first inserted cell to the very bottom of notebook that had 2 cells', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('3'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellMovements({
                cells: [],
                kind: NotebookCellsChangeType.Move,
                index: 0,
                length: 1,
                newIdx: 3,
            }, cellsDiffInfo);
            assert.ok(result);
            assert.strictEqual(result[1].length, 0);
            assert.deepStrictEqual(result[0], [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('3'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('0'),
                },
            ]);
        });
        test('Move last cell to top of notebook after 2 cells were inserted', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('3'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellMovements({
                cells: [],
                kind: NotebookCellsChangeType.Move,
                index: 3,
                length: 1,
                newIdx: 0,
            }, cellsDiffInfo);
            assert.ok(result);
            assert.deepStrictEqual(result[1], [
                {
                    editType: 6 /* CellEditType.Move */,
                    index: 1,
                    length: 1,
                    newIdx: 0,
                },
            ]);
            assert.deepStrictEqual(result[0], [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('3'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('2'),
                },
            ]);
        });
        test('Move second inserted cell to the very bottom of notebook that had 2 cells', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('3'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellMovements({
                cells: [],
                kind: NotebookCellsChangeType.Move,
                index: 1,
                length: 1,
                newIdx: 3,
            }, cellsDiffInfo);
            assert.ok(result);
            assert.strictEqual(result[1].length, 0);
            assert.deepStrictEqual(result[0], [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('3'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('1'),
                },
            ]);
        });
        test('Move second inserted cell to the second last position of notebook that had 2 cells', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('3'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellMovements({
                cells: [],
                kind: NotebookCellsChangeType.Move,
                index: 1,
                length: 1,
                newIdx: 2,
            }, cellsDiffInfo);
            assert.ok(result);
            assert.strictEqual(result[1].length, 0);
            assert.deepStrictEqual(result[0], [
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('3'),
                },
            ]);
        });
        test('Move first cell to the last position of notebook that had 3 cells deleted from the middle', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 4,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('2'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellMovements({
                cells: [],
                kind: NotebookCellsChangeType.Move,
                index: 0,
                length: 1,
                newIdx: 2,
            }, cellsDiffInfo);
            assert.ok(result);
            assert.deepStrictEqual(result[1], [
                {
                    editType: 6 /* CellEditType.Move */,
                    index: 0,
                    length: 1,
                    newIdx: 5,
                },
            ]);
            assert.deepStrictEqual(result[0], [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 4,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('0'),
                },
            ]);
        });
        test('Move second cell to the last position of notebook that had 3 cells deleted from the middle', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 4,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('2'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellMovements({
                cells: [],
                kind: NotebookCellsChangeType.Move,
                index: 1,
                length: 1,
                newIdx: 2,
            }, cellsDiffInfo);
            assert.ok(result);
            assert.deepStrictEqual(result[1], [
                {
                    editType: 6 /* CellEditType.Move */,
                    index: 1,
                    length: 1,
                    newIdx: 5,
                },
            ]);
            assert.deepStrictEqual(result[0], [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 4,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('2'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
            ]);
        });
        test('Move second cell to the last position of notebook that had 3 cells deleted from middle and 1 inserted in the middle', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 4,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('5'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellMovements({
                cells: [],
                kind: NotebookCellsChangeType.Move,
                index: 1,
                length: 1,
                newIdx: 3,
            }, cellsDiffInfo);
            assert.ok(result);
            assert.deepStrictEqual(result[1], [
                {
                    editType: 6 /* CellEditType.Move */,
                    index: 1,
                    length: 1,
                    newIdx: 5,
                },
            ]);
            assert.deepStrictEqual(result[0], [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 1,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 4,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('5'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('1'),
                },
            ]);
        });
        test('Move last cell to the second position of notebook that had 3 cells deleted from middle and 1 inserted in the middle', async function () {
            const cellsDiffInfo = [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 2,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 4,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('New1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 5,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('5'),
                },
            ];
            const result = adjustCellDiffAndOriginalModelBasedOnCellMovements({
                cells: [],
                kind: NotebookCellsChangeType.Move,
                index: 3,
                length: 1,
                newIdx: 1,
            }, cellsDiffInfo);
            assert.ok(result);
            assert.deepStrictEqual(result[1], [
                {
                    editType: 6 /* CellEditType.Move */,
                    index: 5,
                    length: 1,
                    newIdx: 1,
                },
            ]);
            assert.deepStrictEqual(result[0], [
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('0'),
                    originalCellIndex: 0,
                    modifiedCellIndex: 0,
                    modifiedModel: createModifiedModel('0'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('5'),
                    originalCellIndex: 1,
                    modifiedCellIndex: 1,
                    modifiedModel: createModifiedModel('5'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'unchanged',
                    originalModel: createOriginalModel('1'),
                    originalCellIndex: 2,
                    modifiedCellIndex: 2,
                    modifiedModel: createModifiedModel('1'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('2'),
                    originalCellIndex: 3,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('3'),
                    originalCellIndex: 4,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'delete',
                    originalModel: createOriginalModel('4'),
                    originalCellIndex: 5,
                    modifiedCellIndex: undefined,
                    modifiedModel: createModifiedModel('null'),
                },
                {
                    diff,
                    keep,
                    undo,
                    type: 'insert',
                    originalModel: createOriginalModel('null'),
                    originalCellIndex: undefined,
                    modifiedCellIndex: 3,
                    modifiedModel: createModifiedModel('New1'),
                },
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRW50cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9icm93c2VyL2NoYXRFZGl0aW5nTW9kaWZpZWROb3RlYm9va0VudHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFDTixrREFBa0QsRUFDbEQsa0RBQWtELEVBQ2xELG9DQUFvQyxFQUNwQyxzQ0FBc0MsRUFDdEMsc0NBQXNDLEVBQ3RDLHdDQUF3QyxHQUN4QyxNQUFNLCtDQUErQyxDQUFBO0FBRXRELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzVGLE9BQU8sRUFBcUIsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDN0YsT0FBTyxFQUVOLFFBQVEsRUFHUix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVuRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVqRSxLQUFLLENBQUMsa0NBQWtDLEVBQUU7SUFDekMsS0FBSyxDQUFDLG9CQUFvQixFQUFFO1FBQzNCLE1BQU0sSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJ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
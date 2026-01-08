/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Barrier } from '../../../../base/common/async.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { MainContext, } from '../../common/extHost.protocol.js';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { ExtHostDocuments } from '../../common/extHostDocuments.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { ExtHostNotebookController } from '../../common/extHostNotebook.js';
import { ExtHostNotebookDocuments } from '../../common/extHostNotebookDocuments.js';
import { ExtHostNotebookKernels } from '../../common/extHostNotebookKernels.js';
import { NotebookCellOutput, NotebookCellOutputItem } from '../../common/extHostTypes.js';
import { CellKind, CellUri, NotebookCellsChangeType, } from '../../../contrib/notebook/common/notebookCommon.js';
import { CellExecutionUpdateType } from '../../../contrib/notebook/common/notebookExecutionService.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { SerializableObjectWithBuffers } from '../../../services/extensions/common/proxyIdentifier.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { mock } from '../../../test/common/workbenchTestServices.js';
import { ExtHostConsumerFileSystem } from '../../common/extHostFileSystemConsumer.js';
import { ExtHostFileSystemInfo } from '../../common/extHostFileSystemInfo.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExtHostSearch } from '../../common/extHostSearch.js';
import { URITransformerService } from '../../common/extHostUriTransformerService.js';
suite('NotebookKernel', function () {
    let rpcProtocol;
    let extHostNotebookKernels;
    let notebook;
    let extHostDocumentsAndEditors;
    let extHostDocuments;
    let extHostNotebooks;
    let extHostNotebookDocuments;
    let extHostCommands;
    let extHostConsumerFileSystem;
    let extHostSearch;
    const notebookUri = URI.parse('test:///notebook.file');
    const kernelData = new Map();
    const disposables = new DisposableStore();
    const cellExecuteCreate = [];
    const cellExecuteUpdates = [];
    const cellExecuteComplete = [];
    teardown(function () {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(async function () {
        cellExecuteCreate.length = 0;
        cellExecuteUpdates.length = 0;
        cellExecuteComplete.length = 0;
        kernelData.clear();
        rpcProtocol = new TestRPCProtocol();
        rpcProtocol.set(MainContext.MainThreadCommands, new (class extends mock() {
            $registerCommand() { }
        })());
        rpcProtocol.set(MainContext.MainThreadNotebookKernels, new (class extends mock() {
            async $addKernel(handle, data) {
                kernelData.set(handle, data);
            }
            $removeKernel(handle) {
                kernelData.delete(handle);
            }
            $updateKernel(handle, data) {
                assert.strictEqual(kernelData.has(handle), true);
                kernelData.set(handle, { ...kernelData.get(handle), ...data });
            }
            $createExecution(handle, controllerId, uri, cellHandle) {
                cellExecuteCreate.push({ notebook: uri, cell: cellHandle });
            }
            $updateExecution(handle, data) {
                cellExecuteUpdates.push(...data.value);
            }
            $completeExecution(handle, data) {
                cellExecuteComplete.push(data.value);
            }
        })());
        rpcProtocol.set(MainContext.MainThreadNotebookDocuments, new (class extends mock() {
        })());
        rpcProtocol.set(MainContext.MainThreadNotebook, new (class extends mock() {
            async $registerNotebookSerializer() { }
            async $unregisterNotebookSerializer() { }
        })());
        extHostDocumentsAndEditors = new ExtHostDocumentsAndEditors(rpcProtocol, new NullLogService());
        extHostDocuments = disposables.add(new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors));
        extHostCommands = new ExtHostCommands(rpcProtocol, new NullLogService(), new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })());
        extHostConsumerFileSystem = new ExtHostConsumerFileSystem(rpcProtocol, new ExtHostFileSystemInfo());
        extHostSearch = new ExtHostSearch(rpcProtocol, new URITransformerService(null), new NullLogService());
        extHostNotebooks = new ExtHostNotebookController(rpcProtocol, extHostCommands, extHostDocumentsAndEditors, extHostDocuments, extHostConsumerFileSystem, extHostSearch, new NullLogService());
        extHostNotebookDocuments = new ExtHostNotebookDocuments(extHostNotebooks);
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({
            addedDocuments: [
                {
                    uri: notebookUri,
                    viewType: 'test',
                    versionId: 0,
                    cells: [
                        {
                            handle: 0,
                            uri: CellUri.generate(notebookUri, 0),
                            source: ['### Heading'],
                            eol: '\n',
                            language: 'markdown',
                            cellKind: CellKind.Markup,
                            outputs: [],
                        },
                        {
                            handle: 1,
                            uri: CellUri.generate(notebookUri, 1),
                            source: ['console.log("aaa")', 'console.log("bbb")'],
                            eol: '\n',
                            language: 'javascript',
                            cellKind: CellKind.Code,
                            outputs: [],
                        },
                    ],
                },
            ],
            addedEditors: [
                {
                    documentUri: notebookUri,
                    id: '_notebook_editor_0',
                    selections: [{ start: 0, end: 1 }],
                    visibleRanges: [],
                    viewType: 'test',
                },
            ],
        }));
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({ newActiveEditor: '_notebook_editor_0' }));
        notebook = extHostNotebooks.notebookDocuments[0];
        disposables.add(notebook);
        disposables.add(extHostDocuments);
        extHostNotebookKernels = new ExtHostNotebookKernels(rpcProtocol, new (class extends mock() {
        })(), extHostNotebooks, extHostCommands, new NullLogService());
    });
    test('create/dispose kernel', async function () {
        const kernel = extHostNotebookKernels.createNotebookController(nullExtensionDescription, 'foo', '*', 'Foo');
        assert.throws(() => (kernel.id = 'dd'));
        assert.throws(() => (kernel.notebookType = 'dd'));
        assert.ok(kernel);
        assert.strictEqual(kernel.id, 'foo');
        assert.strictEqual(kernel.label, 'Foo');
        assert.strictEqual(kernel.notebookType, '*');
        await rpcProtocol.sync();
        assert.strictEqual(kernelData.size, 1);
        const [first] = kernelData.values();
        assert.strictEqual(first.id, 'nullExtensionDescription/foo');
        assert.strictEqual(ExtensionIdentifier.equals(first.extensionId, nullExtensionDescription.identifier), true);
        assert.strictEqual(first.label, 'Foo');
        assert.strictEqual(first.notebookType, '*');
        kernel.dispose();
        await rpcProtocol.sync();
        assert.strictEqual(kernelData.size, 0);
    });
    test('update kernel', async function () {
        const kernel = disposables.add(extHostNotebookKernels.createNotebookController(nullExtensionDescription, 'foo', '*', 'Foo'));
        await rpcProtocol.sync();
        assert.ok(kernel);
        let [first] = kernelData.values();
        assert.strictEqual(first.id, 'nullExtensionDescription/foo');
        assert.strictEqual(first.label, 'Foo');
        kernel.label = 'Far';
        assert.strictEqual(kernel.label, 'Far');
        await rpcProtocol.sync();
        [first] = kernelData.values();
        assert.strictEqual(first.id, 'nullExtensionDescription/foo');
        assert.strictEqual(first.label, 'Far');
    });
    test('execute - simple createNotebookCellExecution', function () {
        const kernel = disposables.add(extHostNotebookKernels.createNotebookController(nullExtensionDescription, 'foo', '*', 'Foo'));
        extHostNotebookKernels.$acceptNotebookAssociation(0, notebook.uri, true);
        const cell1 = notebook.apiNotebook.cellAt(0);
        const task = kernel.createNotebookCellExecution(cell1);
        task.start();
        task.end(undefined);
    });
    test('createNotebookCellExecution, must be selected/associated', function () {
        const kernel = disposables.add(extHostNotebookKernels.createNotebookController(nullExtensionDescription, 'foo', '*', 'Foo'));
        assert.throws(() => {
            kernel.createNotebookCellExecution(notebook.apiNotebook.cellAt(0));
        });
        extHostNotebookKernels.$acceptNotebookAssociation(0, notebook.uri, true);
        const execution = kernel.createNotebookCellExecution(notebook.apiNotebook.cellAt(0));
        execution.end(true);
    });
    test('createNotebookCellExecution, cell must be alive', function () {
        const kernel = disposables.add(extHostNotebookKernels.createNotebookController(nullExtensionDescription, 'foo', '*', 'Foo'));
        const cell1 = notebook.apiNotebook.cellAt(0);
        extHostNotebookKernels.$acceptNotebookAssociation(0, notebook.uri, true);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 12,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ModelChange,
                    changes: [[0, notebook.apiNotebook.cellCount, []]],
                },
            ],
        }), true);
        assert.strictEqual(cell1.index, -1);
        assert.throws(() => {
            kernel.createNotebookCellExecution(cell1);
        });
    });
    test('interrupt handler, cancellation', async function () {
        let interruptCallCount = 0;
        let tokenCancelCount = 0;
        const kernel = disposables.add(extHostNotebookKernels.createNotebookController(nullExtensionDescription, 'foo', '*', 'Foo'));
        kernel.interruptHandler = () => {
            interruptCallCount += 1;
        };
        extHostNotebookKernels.$acceptNotebookAssociation(0, notebook.uri, true);
        const cell1 = notebook.apiNotebook.cellAt(0);
        const task = kernel.createNotebookCellExecution(cell1);
        disposables.add(task.token.onCancellationRequested(() => (tokenCancelCount += 1)));
        await extHostNotebookKernels.$cancelCells(0, notebook.uri, [0]);
        assert.strictEqual(interruptCallCount, 1);
        assert.strictEqual(tokenCancelCount, 0);
        await extHostNotebookKernels.$cancelCells(0, notebook.uri, [0]);
        assert.strictEqual(interruptCallCount, 2);
        assert.strictEqual(tokenCancelCount, 0);
        // should cancelling the cells end the execution task?
        task.end(false);
    });
    test('set outputs on cancel', async function () {
        const kernel = disposables.add(extHostNotebookKernels.createNotebookController(nullExtensionDescription, 'foo', '*', 'Foo'));
        extHostNotebookKernels.$acceptNotebookAssociation(0, notebook.uri, true);
        const cell1 = notebook.apiNotebook.cellAt(0);
        const task = kernel.createNotebookCellExecution(cell1);
        task.start();
        const b = new Barrier();
        disposables.add(task.token.onCancellationRequested(async () => {
            await task.replaceOutput(new NotebookCellOutput([NotebookCellOutputItem.text('canceled')]));
            task.end(true);
            b.open(); // use barrier to signal that cancellation has happened
        }));
        cellExecuteUpdates.length = 0;
        await extHostNotebookKernels.$cancelCells(0, notebook.uri, [0]);
        await b.wait();
        assert.strictEqual(cellExecuteUpdates.length > 0, true);
        let found = false;
        for (const edit of cellExecuteUpdates) {
            if (edit.editType === CellExecutionUpdateType.Output) {
                assert.strictEqual(edit.append, false);
                assert.strictEqual(edit.outputs.length, 1);
                assert.strictEqual(edit.outputs[0].items.length, 1);
                assert.deepStrictEqual(Array.from(edit.outputs[0].items[0].valueBytes.buffer), Array.from(new TextEncoder().encode('canceled')));
                found = true;
            }
        }
        assert.ok(found);
    });
    test('set outputs on interrupt', async function () {
        const kernel = extHostNotebookKernels.createNotebookController(nullExtensionDescription, 'foo', '*', 'Foo');
        extHostNotebookKernels.$acceptNotebookAssociation(0, notebook.uri, true);
        const cell1 = notebook.apiNotebook.cellAt(0);
        const task = kernel.createNotebookCellExecution(cell1);
        task.start();
        kernel.interruptHandler = async (_notebook) => {
            assert.ok(notebook.apiNotebook === _notebook);
            await task.replaceOutput(new NotebookCellOutput([NotebookCellOutputItem.text('interrupted')]));
            task.end(true);
        };
        cellExecuteUpdates.length = 0;
        await extHostNotebookKernels.$cancelCells(0, notebook.uri, [0]);
        assert.strictEqual(cellExecuteUpdates.length > 0, true);
        let found = false;
        for (const edit of cellExecuteUpdates) {
            if (edit.editType === CellExecutionUpdateType.Output) {
                assert.strictEqual(edit.append, false);
                assert.strictEqual(edit.outputs.length, 1);
                assert.strictEqual(edit.outputs[0].items.length, 1);
                assert.deepStrictEqual(Array.from(edit.outputs[0].items[0].valueBytes.buffer), Array.from(new TextEncoder().encode('interrupted')));
                found = true;
            }
        }
        assert.ok(found);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rS2VybmVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3ROb3RlYm9va0tlcm5lbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFJTixXQUFXLEdBS1gsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFdkYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFM0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDekYsT0FBTyxFQUNOLFFBQVEsRUFDUixPQUFPLEVBQ1AsdUJBQXVCLEdBQ3ZCLE1BQU0s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
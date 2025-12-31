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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rS2VybmVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0Tm90ZWJvb2tLZXJuZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBSU4sV0FBVyxHQUtYLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXZGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTNFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3pGLE9BQU8sRUFDTixRQUFRLEVBQ1IsT0FBTyxFQUNQLHVCQUF1QixHQUN2QixNQUFNLG9EQUFv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TUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzdCLHNCQUFzQixDQUFDLHdCQUF3QixDQUFDLHdCQUF3QixFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQzVGLENBQUE7UUFFRCxzQkFBc0IsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUV4RSxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsMkJBQTJCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ1osSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwREFBMEQsRUFBRTtRQUNoRSxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM3QixzQkFBc0IsQ0FBQyx3QkFBd0IsQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUM1RixDQUFBO1FBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDbEIsTUFBTSxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkUsQ0FBQyxDQUFDLENBQUE7UUFFRixzQkFBc0IsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4RSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRixTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3BCLENBQUMsQ0FB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { mock } from '../../../../base/test/common/mock.js';
import { MainContext, } from '../../common/extHost.protocol.js';
import { ExtHostNotebookController } from '../../common/extHostNotebook.js';
import { CellKind, CellUri, NotebookCellsChangeType, } from '../../../contrib/notebook/common/notebookCommon.js';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostDocuments } from '../../common/extHostDocuments.js';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { isEqual } from '../../../../base/common/resources.js';
import { Event } from '../../../../base/common/event.js';
import { ExtHostNotebookDocuments } from '../../common/extHostNotebookDocuments.js';
import { SerializableObjectWithBuffers } from '../../../services/extensions/common/proxyIdentifier.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ExtHostConsumerFileSystem } from '../../common/extHostFileSystemConsumer.js';
import { ExtHostFileSystemInfo } from '../../common/extHostFileSystemInfo.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExtHostSearch } from '../../common/extHostSearch.js';
import { URITransformerService } from '../../common/extHostUriTransformerService.js';
suite('NotebookCell#Document', function () {
    let rpcProtocol;
    let notebook;
    let extHostDocumentsAndEditors;
    let extHostDocuments;
    let extHostNotebooks;
    let extHostNotebookDocuments;
    let extHostConsumerFileSystem;
    let extHostSearch;
    const notebookUri = URI.parse('test:///notebook.file');
    const disposables = new DisposableStore();
    teardown(function () {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(async function () {
        rpcProtocol = new TestRPCProtocol();
        rpcProtocol.set(MainContext.MainThreadCommands, new (class extends mock() {
            $registerCommand() { }
        })());
        rpcProtocol.set(MainContext.MainThreadNotebook, new (class extends mock() {
            async $registerNotebookSerializer() { }
            async $unregisterNotebookSerializer() { }
        })());
        extHostDocumentsAndEditors = new ExtHostDocumentsAndEditors(rpcProtocol, new NullLogService());
        extHostDocuments = new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors);
        extHostConsumerFileSystem = new ExtHostConsumerFileSystem(rpcProtocol, new ExtHostFileSystemInfo());
        extHostSearch = new ExtHostSearch(rpcProtocol, new URITransformerService(null), new NullLogService());
        extHostNotebooks = new ExtHostNotebookController(rpcProtocol, new ExtHostCommands(rpcProtocol, new NullLogService(), new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })()), extHostDocumentsAndEditors, extHostDocuments, extHostConsumerFileSystem, extHostSearch, new NullLogService());
        extHostNotebookDocuments = new ExtHostNotebookDocuments(extHostNotebooks);
        const reg = extHostNotebooks.registerNotebookSerializer(nullExtensionDescription, 'test', new (class extends mock() {
        })());
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
        disposables.add(reg);
        disposables.add(notebook);
        disposables.add(extHostDocuments);
    });
    test('cell document is vscode.TextDocument', async function () {
        assert.strictEqual(notebook.apiNotebook.cellCount, 2);
        const [c1, c2] = notebook.apiNotebook.getCells();
        const d1 = extHostDocuments.getDocument(c1.document.uri);
        assert.ok(d1);
        assert.strictEqual(d1.languageId, c1.document.languageId);
        assert.strictEqual(d1.version, 1);
        const d2 = extHostDocuments.getDocument(c2.document.uri);
        assert.ok(d2);
        assert.strictEqual(d2.languageId, c2.document.languageId);
        assert.strictEqual(d2.version, 1);
    });
    test('cell document goes when notebook closes', async function () {
        const cellUris = [];
        for (const cell of notebook.apiNotebook.getCells()) {
            assert.ok(extHostDocuments.getDocument(cell.document.uri));
            cellUris.push(cell.document.uri.toString());
        }
        const removedCellUris = [];
        const reg = extHostDocuments.onDidRemoveDocument((doc) => {
            removedCellUris.push(doc.uri.toString());
        });
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({ removedDocuments: [notebook.uri] }));
        reg.dispose();
        assert.strictEqual(removedCellUris.length, 2);
        assert.deepStrictEqual(removedCellUris.sort(), cellUris.sort());
    });
    test('cell document is vscode.TextDocument after changing it', async function () {
        const p = new Promise((resolve, reject) => {
            disposables.add(extHostNotebookDocuments.onDidChangeNotebookDocument((e) => {
                try {
                    assert.strictEqual(e.contentChanges.length, 1);
                    assert.strictEqual(e.contentChanges[0].addedCells.length, 2);
                    const [first, second] = e.contentChanges[0].addedCells;
                    const doc1 = extHostDocuments
                        .getAllDocumentData()
                        .find((data) => isEqual(data.document.uri, first.document.uri));
                    assert.ok(doc1);
                    assert.strictEqual(doc1?.document === first.document, true);
                    const doc2 = extHostDocuments
                        .getAllDocumentData()
                        .find((data) => isEqual(data.document.uri, second.document.uri));
                    assert.ok(doc2);
                    assert.strictEqual(doc2?.document === second.document, true);
                    resolve();
                }
                catch (err) {
                    reject(err);
                }
            }));
        });
        extHostNotebookDocuments.$acceptModelChanged(notebookUri, new SerializableObjectWithBuffers({
            versionId: notebook.apiNotebook.version + 1,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ModelChange,
                    changes: [
                        [
                            0,
                            0,
                            [
                                {
                                    handle: 2,
                                    uri: CellUri.generate(notebookUri, 2),
                                    source: ['Hello', 'World', 'Hello World!'],
                                    eol: '\n',
                                    language: 'test',
                                    cellKind: CellKind.Code,
                                    outputs: [],
                                },
                                {
                                    handle: 3,
                                    uri: CellUri.generate(notebookUri, 3),
                                    source: ['Hallo', 'Welt', 'Hallo Welt!'],
                                    eol: '\n',
                                    language: 'test',
                                    cellKind: CellKind.Code,
                                    outputs: [],
                                },
                            ],
                        ],
                    ],
                },
            ],
        }), false);
        await p;
    });
    test('cell document stays open when notebook is still open', async function () {
        const docs = [];
        const addData = [];
        for (const cell of notebook.apiNotebook.getCells()) {
            const doc = extHostDocuments.getDocument(cell.document.uri);
            assert.ok(doc);
            assert.strictEqual(extHostDocuments.getDocument(cell.document.uri).isClosed, false);
            docs.push(doc);
            addData.push({
                EOL: '\n',
                isDirty: doc.isDirty,
                lines: doc.getText().split('\n'),
                languageId: doc.languageId,
                uri: doc.uri,
                versionId: doc.version,
                encoding: 'utf8',
            });
        }
        // this call happens when opening a document on the main side
        extHostDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({ addedDocuments: addData });
        // this call happens when closing a document from the main side
        extHostDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({
            removedDocuments: docs.map((d) => d.uri),
        });
        // notebook is still open -> cell documents stay open
        for (const cell of notebook.apiNotebook.getCells()) {
            assert.ok(extHostDocuments.getDocument(cell.document.uri));
            assert.strictEqual(extHostDocuments.getDocument(cell.document.uri).isClosed, false);
        }
        // close notebook -> docs are closed
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({ removedDocuments: [notebook.uri] }));
        for (const cell of notebook.apiNotebook.getCells()) {
            assert.throws(() => extHostDocuments.getDocument(cell.document.uri));
        }
        for (const doc of docs) {
            assert.strictEqual(doc.isClosed, true);
        }
    });
    test('cell document goes when cell is removed', async function () {
        assert.strictEqual(notebook.apiNotebook.cellCount, 2);
        const [cell1, cell2] = notebook.apiNotebook.getCells();
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 2,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ModelChange,
                    changes: [[0, 1, []]],
                },
            ],
        }), false);
        assert.strictEqual(notebook.apiNotebook.cellCount, 1);
        assert.strictEqual(cell1.document.isClosed, true); // ref still alive!
        assert.strictEqual(cell2.document.isClosed, false);
        assert.throws(() => extHostDocuments.getDocument(cell1.document.uri));
    });
    test('cell#index', function () {
        assert.strictEqual(notebook.apiNotebook.cellCount, 2);
        const [first, second] = notebook.apiNotebook.getCells();
        assert.strictEqual(first.index, 0);
        assert.strictEqual(second.index, 1);
        // remove first cell
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: notebook.apiNotebook.version + 1,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ModelChange,
                    changes: [[0, 1, []]],
                },
            ],
        }), false);
        assert.strictEqual(notebook.apiNotebook.cellCount, 1);
        assert.strictEqual(second.index, 0);
        extHostNotebookDocuments.$acceptModelChanged(notebookUri, new SerializableObjectWithBuffers({
            versionId: notebook.apiNotebook.version + 1,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ModelChange,
                    changes: [
                        [
                            0,
                            0,
                            [
                                {
                                    handle: 2,
                                    uri: CellUri.generate(notebookUri, 2),
                                    source: ['Hello', 'World', 'Hello World!'],
                                    eol: '\n',
                                    language: 'test',
                                    cellKind: CellKind.Code,
                                    outputs: [],
                                },
                                {
                                    handle: 3,
                                    uri: CellUri.generate(notebookUri, 3),
                                    source: ['Hallo', 'Welt', 'Hallo Welt!'],
                                    eol: '\n',
                                    language: 'test',
                                    cellKind: CellKind.Code,
                                    outputs: [],
                                },
                            ],
                        ],
                    ],
                },
            ],
        }), false);
        assert.strictEqual(notebook.apiNotebook.cellCount, 3);
        assert.strictEqual(second.index, 2);
    });
    test('ERR MISSING extHostDocument for notebook cell: #116711', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        // DON'T call this, make sure the cell-documents have not been created yet
        // assert.strictEqual(notebook.notebookDocument.cellCount, 2);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 100,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ModelChange,
                    changes: [
                        [
                            0,
                            2,
                            [
                                {
                                    handle: 3,
                                    uri: CellUri.generate(notebookUri, 3),
                                    source: ['### Heading'],
                                    eol: '\n',
                                    language: 'markdown',
                                    cellKind: CellKind.Markup,
                                    outputs: [],
                                },
                                {
                                    handle: 4,
                                    uri: CellUri.generate(notebookUri, 4),
                                    source: ['console.log("aaa")', 'console.log("bbb")'],
                                    eol: '\n',
                                    language: 'javascript',
                                    cellKind: CellKind.Code,
                                    outputs: [],
                                },
                            ],
                        ],
                    ],
                },
            ],
        }), false);
        assert.strictEqual(notebook.apiNotebook.cellCount, 2);
        const event = await p;
        assert.strictEqual(event.notebook === notebook.apiNotebook, true);
        assert.strictEqual(event.contentChanges.length, 1);
        assert.strictEqual(event.contentChanges[0].range.end - event.contentChanges[0].range.start, 2);
        assert.strictEqual(event.contentChanges[0].removedCells[0].document.isClosed, true);
        assert.strictEqual(event.contentChanges[0].removedCells[1].document.isClosed, true);
        assert.strictEqual(event.contentChanges[0].addedCells.length, 2);
        assert.strictEqual(event.contentChanges[0].addedCells[0].document.isClosed, false);
        assert.strictEqual(event.contentChanges[0].addedCells[1].document.isClosed, false);
    });
    test('Opening a notebook results in VS Code firing the event onDidChangeActiveNotebookEditor twice #118470', function () {
        let count = 0;
        disposables.add(extHostNotebooks.onDidChangeActiveNotebookEditor(() => (count += 1)));
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({
            addedEditors: [
                {
                    documentUri: notebookUri,
                    id: '_notebook_editor_2',
                    selections: [{ start: 0, end: 1 }],
                    visibleRanges: [],
                    viewType: 'test',
                },
            ],
        }));
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({
            newActiveEditor: '_notebook_editor_2',
        }));
        assert.strictEqual(count, 1);
    });
    test('unset active notebook editor', function () {
        const editor = extHostNotebooks.activeNotebookEditor;
        assert.ok(editor !== undefined);
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({ newActiveEditor: undefined }));
        assert.ok(extHostNotebooks.activeNotebookEditor === editor);
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({}));
        assert.ok(extHostNotebooks.activeNotebookEditor === editor);
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({ newActiveEditor: null }));
        assert.ok(extHostNotebooks.activeNotebookEditor === undefined);
    });
    test('change cell language triggers onDidChange events', async function () {
        const first = notebook.apiNotebook.cellAt(0);
        assert.strictEqual(first.document.languageId, 'markdown');
        const removed = Event.toPromise(extHostDocuments.onDidRemoveDocument);
        const added = Event.toPromise(extHostDocuments.onDidAddDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 12,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ChangeCellLanguage,
                    index: 0,
                    language: 'fooLang',
                },
            ],
        }), false);
        const removedDoc = await removed;
        const addedDoc = await added;
        assert.strictEqual(first.document.languageId, 'fooLang');
        assert.ok(removedDoc === addedDoc);
    });
    test('onDidChangeNotebook-event, cell changes', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 12,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ChangeCellMetadata,
                    index: 0,
                    metadata: { foo: 1 },
                },
                {
                    kind: NotebookCellsChangeType.ChangeCellMetadata,
                    index: 1,
                    metadata: { foo: 2 },
                },
                {
                    kind: NotebookCellsChangeType.Output,
                    index: 1,
                    outputs: [
                        {
                            items: [
                                {
                                    valueBytes: VSBuffer.fromByteArray([0, 2, 3]),
                                    mime: 'text/plain',
                                },
                            ],
                            outputId: '1',
                        },
                    ],
                },
            ],
        }), false, undefined);
        const event = await p;
        assert.strictEqual(event.notebook === notebook.apiNotebook, true);
        assert.strictEqual(event.contentChanges.length, 0);
        assert.strictEqual(event.cellChanges.length, 2);
        const [first, second] = event.cellChanges;
        assert.deepStrictEqual(first.metadata, first.cell.metadata);
        assert.deepStrictEqual(first.executionSummary, undefined);
        assert.deepStrictEqual(first.outputs, undefined);
        assert.deepStrictEqual(first.document, undefined);
        assert.deepStrictEqual(second.outputs, second.cell.outputs);
        assert.deepStrictEqual(second.metadata, second.cell.metadata);
        assert.deepStrictEqual(second.executionSummary, undefined);
        assert.deepStrictEqual(second.document, undefined);
    });
    test('onDidChangeNotebook-event, notebook metadata', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({ versionId: 12, rawEvents: [] }), false, { foo: 2 });
        const event = await p;
        assert.strictEqual(event.notebook === notebook.apiNotebook, true);
        assert.strictEqual(event.contentChanges.length, 0);
        assert.strictEqual(event.cellChanges.length, 0);
        assert.deepStrictEqual(event.metadata, { foo: 2 });
    });
    test('onDidChangeNotebook-event, froozen data', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({ versionId: 12, rawEvents: [] }), false, { foo: 2 });
        const event = await p;
        assert.ok(Object.isFrozen(event));
        assert.ok(Object.isFrozen(event.cellChanges));
        assert.ok(Object.isFrozen(event.contentChanges));
        assert.ok(Object.isFrozen(event.notebook));
        assert.ok(!Object.isFrozen(event.metadata));
    });
    test('change cell language and onDidChangeNotebookDocument', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        const first = notebook.apiNotebook.cellAt(0);
        assert.strictEqual(first.document.languageId, 'markdown');
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 12,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ChangeCellLanguage,
                    index: 0,
                    language: 'fooLang',
                },
            ],
        }), false);
        const event = await p;
        assert.strictEqual(event.notebook === notebook.apiNotebook, true);
        assert.strictEqual(event.contentChanges.length, 0);
        assert.strictEqual(event.cellChanges.length, 1);
        const [cellChange] = event.cellChanges;
        assert.strictEqual(cellChange.cell === first, true);
        assert.ok(cellChange.document === first.document);
        assert.ok(cellChange.executionSummary === undefined);
        assert.ok(cellChange.metadata === undefined);
        assert.ok(cellChange.outputs === undefined);
    });
    test('change notebook cell document and onDidChangeNotebookDocument', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        const first = notebook.apiNotebook.cellAt(0);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 12,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ChangeCellContent,
                    index: 0,
                },
            ],
        }), false);
        const event = await p;
        assert.strictEqual(event.notebook === notebook.apiNotebook, true);
        assert.strictEqual(event.contentChanges.length, 0);
        assert.strictEqual(event.cellChanges.length, 1);
        const [cellChange] = event.cellChanges;
        assert.strictEqual(cellChange.cell === first, true);
        assert.ok(cellChange.document === first.document);
        assert.ok(cellChange.executionSummary === undefined);
        assert.ok(cellChange.metadata === undefined);
        assert.ok(cellChange.outputs === undefined);
    });
    async function replaceOutputs(cellIndex, outputId, outputItems) {
        const changeEvent = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: notebook.apiNotebook.version + 1,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.Output,
                    index: cellIndex,
                    outputs: [{ outputId, items: outputItems }],
                },
            ],
        }), false);
        await changeEvent;
    }
    async function appendOutputItem(cellIndex, outputId, outputItems) {
        const changeEvent = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: notebook.apiNotebook.version + 1,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.OutputItem,
                    index: cellIndex,
                    append: true,
                    outputId,
                    outputItems,
                },
            ],
        }), false);
        await changeEvent;
    }
    test('Append multiple text/plain output items', async function () {
        await replaceOutputs(1, '1', [{ mime: 'text/plain', valueBytes: VSBuffer.fromString('foo') }]);
        await appendOutputItem(1, '1', [{ mime: 'text/plain', valueBytes: VSBuffer.fromString('bar') }]);
        await appendOutputItem(1, '1', [{ mime: 'text/plain', valueBytes: VSBuffer.fromString('baz') }]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 3);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'text/plain');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[0].data).toString(), 'foo');
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[1].mime, 'text/plain');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[1].data).toString(), 'bar');
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[2].mime, 'text/plain');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[2].data).toString(), 'baz');
    });
    test('Append multiple stdout stream output items to an output with another mime', async function () {
        await replaceOutputs(1, '1', [{ mime: 'text/plain', valueBytes: VSBuffer.fromString('foo') }]);
        await appendOutputItem(1, '1', [
            { mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('bar') },
        ]);
        await appendOutputItem(1, '1', [
            { mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('baz') },
        ]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 3);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'text/plain');
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[1].mime, 'application/vnd.code.notebook.stdout');
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[2].mime, 'application/vnd.code.notebook.stdout');
    });
    test('Compress multiple stdout stream output items', async function () {
        await replaceOutputs(1, '1', [
            { mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('foo') },
        ]);
        await appendOutputItem(1, '1', [
            { mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('bar') },
        ]);
        await appendOutputItem(1, '1', [
            { mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('baz') },
        ]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'application/vnd.code.notebook.stdout');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[0].data).toString(), 'foobarbaz');
    });
    test('Compress multiple stdout stream output items (with support for terminal escape code -> \u001b[A)', async function () {
        await replaceOutputs(1, '1', [
            { mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('\nfoo') },
        ]);
        await appendOutputItem(1, '1', [
            {
                mime: 'application/vnd.code.notebook.stdout',
                valueBytes: VSBuffer.fromString(`${String.fromCharCode(27)}[Abar`),
            },
        ]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'application/vnd.code.notebook.stdout');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[0].data).toString(), 'bar');
    });
    test('Compress multiple stdout stream output items (with support for terminal escape code -> \r character)', async function () {
        await replaceOutputs(1, '1', [
            { mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('foo') },
        ]);
        await appendOutputItem(1, '1', [
            { mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString(`\rbar`) },
        ]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'application/vnd.code.notebook.stdout');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[0].data).toString(), 'bar');
    });
    test('Compress multiple stderr stream output items', async function () {
        await replaceOutputs(1, '1', [
            { mime: 'application/vnd.code.notebook.stderr', valueBytes: VSBuffer.fromString('foo') },
        ]);
        await appendOutputItem(1, '1', [
            { mime: 'application/vnd.code.notebook.stderr', valueBytes: VSBuffer.fromString('bar') },
        ]);
        await appendOutputItem(1, '1', [
            { mime: 'application/vnd.code.notebook.stderr', valueBytes: VSBuffer.fromString('baz') },
        ]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'application/vnd.code.notebook.stderr');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[0].data).toString(), 'foobarbaz');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3ROb3RlYm9vay50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUVOLFdBQVcsR0FLWCxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTNFLE9BQU8sRUFDTixRQUFRLEVBQ1IsT0FBTyxFQUNQLHVCQUF1QixHQUN2QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsd0JB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UUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDekYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUNqRixLQUFLLENBQ0wsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDekYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUNqRixLQUFLLENBQ0wsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENB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
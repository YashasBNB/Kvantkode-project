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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0Tm90ZWJvb2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFFTixXQUFXLEdBS1gsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUUzRSxPQUFPLEVBQ04sUUFBUSxFQUNSLE9BQU8sRUFDUCx1QkFBdUIsR0FDdkIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLHdCQUF3QixF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Q0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ3pGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFDakYsS0FBSyxDQUNMLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ3pGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFDakYsS0FBSyxDQUNMLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFB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
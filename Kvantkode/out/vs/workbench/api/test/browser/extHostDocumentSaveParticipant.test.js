/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostDocuments } from '../../common/extHostDocuments.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { TextDocumentSaveReason, TextEdit, Position, EndOfLine } from '../../common/extHostTypes.js';
import { ExtHostDocumentSaveParticipant } from '../../common/extHostDocumentSaveParticipant.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { mock } from '../../../../base/test/common/mock.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
function timeout(n) {
    return new Promise((resolve) => setTimeout(resolve, n));
}
suite('ExtHostDocumentSaveParticipant', () => {
    const resource = URI.parse('foo:bar');
    const mainThreadBulkEdits = new (class extends mock() {
    })();
    let documents;
    const nullLogService = new NullLogService();
    setup(() => {
        const documentsAndEditors = new ExtHostDocumentsAndEditors(SingleProxyRPCProtocol(null), new NullLogService());
        documentsAndEditors.$acceptDocumentsAndEditorsDelta({
            addedDocuments: [
                {
                    isDirty: false,
                    languageId: 'foo',
                    uri: resource,
                    versionId: 1,
                    lines: ['foo'],
                    EOL: '\n',
                    encoding: 'utf8',
                },
            ],
        });
        documents = new ExtHostDocuments(SingleProxyRPCProtocol(null), documentsAndEditors);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('no listeners, no problem', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => assert.ok(true));
    });
    test('event delivery', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        let event;
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            event = e;
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
            assert.ok(event);
            assert.strictEqual(event.reason, TextDocumentSaveReason.Manual);
            assert.strictEqual(typeof event.waitUntil, 'function');
        });
    });
    test('event delivery, immutable', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        let event;
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            event = e;
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
            assert.ok(event);
            assert.throws(() => {
                ;
                event.document = null;
            });
        });
    });
    test('event delivery, bad listener', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            throw new Error('💀');
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then((values) => {
            sub.dispose();
            const [first] = values;
            assert.strictEqual(first, false);
        });
    });
    test("event delivery, bad listener doesn't prevent more events", () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        const sub1 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            throw new Error('💀');
        });
        let event;
        const sub2 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            event = e;
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub1.dispose();
            sub2.dispose();
            assert.ok(event);
        });
    });
    test('event delivery, in subscriber order', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        let counter = 0;
        const sub1 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            assert.strictEqual(counter++, 0);
        });
        const sub2 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            assert.strictEqual(counter++, 1);
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub1.dispose();
            sub2.dispose();
        });
    });
    test('event delivery, ignore bad listeners', async () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits, { timeout: 5, errors: 1 });
        let callCount = 0;
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            callCount += 1;
            throw new Error('boom');
        });
        await participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */);
        await participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */);
        await participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */);
        await participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */);
        sub.dispose();
        assert.strictEqual(callCount, 2);
    });
    test('event delivery, overall timeout', async function () {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits, { timeout: 20, errors: 5 });
        // let callCount = 0;
        const calls = [];
        const sub1 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            calls.push(1);
        });
        const sub2 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            calls.push(2);
            event.waitUntil(timeout(100));
        });
        const sub3 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            calls.push(3);
        });
        const values = await participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */);
        sub1.dispose();
        sub2.dispose();
        sub3.dispose();
        assert.deepStrictEqual(calls, [1, 2]);
        assert.strictEqual(values.length, 2);
    });
    test('event delivery, waitUntil', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            event.waitUntil(timeout(10));
            event.waitUntil(timeout(10));
            event.waitUntil(timeout(10));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
        });
    });
    test('event delivery, waitUntil must be called sync', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            event.waitUntil(new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        assert.throws(() => event.waitUntil(timeout(10)));
                        resolve(undefined);
                    }
                    catch (e) {
                        reject(e);
                    }
                }, 10);
            }));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
        });
    });
    test('event delivery, waitUntil will timeout', function () {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits, { timeout: 5, errors: 3 });
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            event.waitUntil(timeout(100));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then((values) => {
            sub.dispose();
            const [first] = values;
            assert.strictEqual(first, false);
        });
    });
    test('event delivery, waitUntil failure handling', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        const sub1 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            e.waitUntil(Promise.reject(new Error('dddd')));
        });
        let event;
        const sub2 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            event = e;
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            assert.ok(event);
            sub1.dispose();
            sub2.dispose();
        });
    });
    test('event delivery, pushEdits sync', () => {
        let dto;
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, new (class extends mock() {
            $tryApplyWorkspaceEdit(_edits) {
                dto = _edits.value;
                return Promise.resolve(true);
            }
        })());
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            e.waitUntil(Promise.resolve([TextEdit.insert(new Position(0, 0), 'bar')]));
            e.waitUntil(Promise.resolve([TextEdit.setEndOfLine(EndOfLine.CRLF)]));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
            assert.strictEqual(dto.edits.length, 2);
            assert.ok(dto.edits[0].textEdit);
            assert.ok(dto.edits[1].textEdit);
        });
    });
    test('event delivery, concurrent change', () => {
        let edits;
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, new (class extends mock() {
            $tryApplyWorkspaceEdit(_edits) {
                edits = _edits.value;
                return Promise.resolve(true);
            }
        })());
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            // concurrent change from somewhere
            documents.$acceptModelChanged(resource, {
                changes: [
                    {
                        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                        rangeOffset: undefined,
                        rangeLength: undefined,
                        text: 'bar',
                    },
                ],
                eol: undefined,
                versionId: 2,
                isRedoing: false,
                isUndoing: false,
            }, true);
            e.waitUntil(Promise.resolve([TextEdit.insert(new Position(0, 0), 'bar')]));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then((values) => {
            sub.dispose();
            assert.strictEqual(edits, undefined);
            assert.strictEqual(values[0], false);
        });
    });
    test('event delivery, two listeners -> two document states', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, new (class extends mock() {
            $tryApplyWorkspaceEdit(dto) {
                for (const edit of dto.value.edits) {
                    const uri = URI.revive(edit.resource);
                    const { text, range } = edit.textEdit;
                    documents.$acceptModelChanged(uri, {
                        changes: [
                            {
                                range,
                                text,
                                rangeOffset: undefined,
                                rangeLength: undefined,
                            },
                        ],
                        eol: undefined,
                        versionId: documents.getDocumentData(uri).version + 1,
                        isRedoing: false,
                        isUndoing: false,
                    }, true);
                    // }
                }
                return Promise.resolve(true);
            }
        })());
        const document = documents.getDocument(resource);
        const sub1 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            // the document state we started with
            assert.strictEqual(document.version, 1);
            assert.strictEqual(document.getText(), 'foo');
            e.waitUntil(Promise.resolve([TextEdit.insert(new Position(0, 0), 'bar')]));
        });
        const sub2 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            // the document state AFTER the first listener kicked in
            assert.strictEqual(document.version, 2);
            assert.strictEqual(document.getText(), 'barfoo');
            e.waitUntil(Promise.resolve([TextEdit.insert(new Position(0, 0), 'bar')]));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then((values) => {
            sub1.dispose();
            sub2.dispose();
            // the document state AFTER eventing is done
            assert.strictEqual(document.version, 3);
            assert.strictEqual(document.getText(), 'barbarfoo');
        });
    });
    test('Log failing listener', function () {
        let didLogSomething = false;
        const participant = new ExtHostDocumentSaveParticipant(new (class extends NullLogService {
            error(message, ...args) {
                didLogSomething = true;
            }
        })(), documents, mainThreadBulkEdits);
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            throw new Error('boom');
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
            assert.strictEqual(didLogSomething, true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50U2F2ZVBhcnRpY2lwYW50LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3REb2N1bWVudFNhdmVQYXJ0aWNpcGFudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFPcEcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFHckUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUcvRixTQUFTLE9BQU8sQ0FBQyxDQUFTO0lBQ3pCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN4RCxDQUFDO0FBRUQsS0FBSyxDQUFDLGdDQUFn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
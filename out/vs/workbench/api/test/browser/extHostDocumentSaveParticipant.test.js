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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50U2F2ZVBhcnRpY2lwYW50LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0RG9jdW1lbnRTYXZlUGFydGljaXBhbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBT3BHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBR3JFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFHL0YsU0FBUyxPQUFPLENBQUMsQ0FBUztJQUN6QixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDeEQsQ0FBQztBQUVELEtBQUssQ0FBQyxnQ0FBZ0MsRUFB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
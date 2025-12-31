/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { mock } from '../../../../test/common/workbenchTestServices.js';
import { InstantiationService } from '../../../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { URI } from '../../../../../base/common/uri.js';
import { BulkFileOperations } from '../../browser/preview/bulkEditPreview.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ResourceFileEdit, ResourceTextEdit, } from '../../../../../editor/browser/services/bulkEditService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('BulkEditPreview', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instaService;
    setup(function () {
        const fileService = new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidFilesChange = Event.None;
            }
            async exists() {
                return true;
            }
        })();
        const modelService = new (class extends mock() {
            getModel() {
                return null;
            }
            getModels() {
                return [];
            }
        })();
        instaService = new InstantiationService(new ServiceCollection([IFileService, fileService], [IModelService, modelService]));
    });
    test('one needsConfirmation unchecks all of file', async function () {
        const edits = [
            new ResourceFileEdit(undefined, URI.parse('some:///uri1'), undefined, {
                label: 'cat1',
                needsConfirmation: true,
            }),
            new ResourceFileEdit(URI.parse('some:///uri1'), URI.parse('some:///uri2'), undefined, {
                label: 'cat2',
                needsConfirmation: false,
            }),
        ];
        const ops = await instaService.invokeFunction(BulkFileOperations.create, edits);
        store.add(ops);
        assert.strictEqual(ops.fileOperations.length, 1);
        assert.strictEqual(ops.checked.isChecked(edits[0]), false);
    });
    test('has categories', async function () {
        const edits = [
            new ResourceFileEdit(undefined, URI.parse('some:///uri1'), undefined, {
                label: 'uri1',
                needsConfirmation: true,
            }),
            new ResourceFileEdit(undefined, URI.parse('some:///uri2'), undefined, {
                label: 'uri2',
                needsConfirmation: false,
            }),
        ];
        const ops = await instaService.invokeFunction(BulkFileOperations.create, edits);
        store.add(ops);
        assert.strictEqual(ops.categories.length, 2);
        assert.strictEqual(ops.categories[0].metadata.label, 'uri1'); // unconfirmed!
        assert.strictEqual(ops.categories[1].metadata.label, 'uri2');
    });
    test('has not categories', async function () {
        const edits = [
            new ResourceFileEdit(undefined, URI.parse('some:///uri1'), undefined, {
                label: 'uri1',
                needsConfirmation: true,
            }),
            new ResourceFileEdit(undefined, URI.parse('some:///uri2'), undefined, {
                label: 'uri1',
                needsConfirmation: false,
            }),
        ];
        const ops = await instaService.invokeFunction(BulkFileOperations.create, edits);
        store.add(ops);
        assert.strictEqual(ops.categories.length, 1);
        assert.strictEqual(ops.categories[0].metadata.label, 'uri1'); // unconfirmed!
        assert.strictEqual(ops.categories[0].metadata.label, 'uri1');
    });
    test('category selection', async function () {
        const edits = [
            new ResourceFileEdit(undefined, URI.parse('some:///uri1'), undefined, {
                label: 'C1',
                needsConfirmation: false,
            }),
            new ResourceTextEdit(URI.parse('some:///uri2'), { text: 'foo', range: new Range(1, 1, 1, 1) }, undefined, { label: 'C2', needsConfirmation: false }),
        ];
        const ops = await instaService.invokeFunction(BulkFileOperations.create, edits);
        store.add(ops);
        assert.strictEqual(ops.checked.isChecked(edits[0]), true);
        assert.strictEqual(ops.checked.isChecked(edits[1]), true);
        assert.ok(edits === ops.getWorkspaceEdit());
        // NOT taking to create, but the invalid text edit will
        // go through
        ops.checked.updateChecked(edits[0], false);
        const newEdits = ops.getWorkspaceEdit();
        assert.ok(edits !== newEdits);
        assert.strictEqual(edits.length, 2);
        assert.strictEqual(newEdits.length, 1);
    });
    test('fix bad metadata', async function () {
        // bogous edit that wants creation to be confirmed, but not it's textedit-child...
        const edits = [
            new ResourceFileEdit(undefined, URI.parse('some:///uri1'), undefined, {
                label: 'C1',
                needsConfirmation: true,
            }),
            new ResourceTextEdit(URI.parse('some:///uri1'), { text: 'foo', range: new Range(1, 1, 1, 1) }, undefined, { label: 'C2', needsConfirmation: false }),
        ];
        const ops = await instaService.invokeFunction(BulkFileOperations.create, edits);
        store.add(ops);
        assert.strictEqual(ops.checked.isChecked(edits[0]), false);
        assert.strictEqual(ops.checked.isChecked(edits[1]), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRQcmV2aWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9idWxrRWRpdC90ZXN0L2Jyb3dzZXIvYnVsa0VkaXRQcmV2aWV3LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQzNHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBRXJHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDN0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEdBQ2hCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLGlCQUFpQixFQUFFO0lBQ3hCLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxZQUFtQyxDQUFBO0lBRXZDLEtBQUssQ0FBQztRQUNMLE1BQU0sV0FBVyxHQUFpQixJQUFJLENBQUMsS0FBTSxTQUFRLElB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
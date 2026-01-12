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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRQcmV2aWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2J1bGtFZGl0L3Rlc3QvYnJvd3Nlci9idWxrRWRpdFByZXZpZXcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDM0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFFckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsR0FDaEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsaUJBQWlCLEVBQUU7SUFDeEIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLFlBQW1DLENBQUE7SUFFdkMsS0FBSyxDQUFDO1FBQ0wsTUFBTSxXQUFXLEdBQWlCLElBQUksQ0FBQyxLQUFNLFNB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
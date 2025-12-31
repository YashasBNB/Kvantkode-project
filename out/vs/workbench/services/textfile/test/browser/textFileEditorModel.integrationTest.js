/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TextFileEditorModel } from '../../common/textFileEditorModel.js';
import { workbenchInstantiationService, TestServiceAccessor, } from '../../../../test/browser/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { createTextBufferFactoryFromStream } from '../../../../../editor/common/model/textModel.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { bufferToStream, VSBuffer } from '../../../../../base/common/buffer.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
suite('Files - TextFileEditorModel (integration)', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let content;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        content = accessor.fileService.getContent();
        disposables.add(toDisposable(() => accessor.fileService.setContent(content)));
        disposables.add(accessor.textFileService.files);
    });
    teardown(() => {
        disposables.clear();
    });
    test('backup and restore (simple)', async function () {
        return testBackupAndRestore(toResource.call(this, '/path/index_async.txt'), toResource.call(this, '/path/index_async2.txt'), 'Some very small file text content.');
    });
    test('backup and restore (large, #121347)', async function () {
        const largeContent = '국어한\n'.repeat(100000);
        return testBackupAndRestore(toResource.call(this, '/path/index_async.txt'), toResource.call(this, '/path/index_async2.txt'), largeContent);
    });
    async function testBackupAndRestore(resourceA, resourceB, contents) {
        const originalModel = disposables.add(instantiationService.createInstance(TextFileEditorModel, resourceA, 'utf8', undefined));
        await originalModel.resolve({
            contents: await createTextBufferFactoryFromStream(await accessor.textFileService.getDecodedStream(resourceA, bufferToStream(VSBuffer.fromString(contents)))),
        });
        assert.strictEqual(originalModel.textEditorModel?.getValue(), contents);
        const backup = await originalModel.backup(CancellationToken.None);
        const modelRestoredIdentifier = { typeId: originalModel.typeId, resource: resourceB };
        await accessor.workingCopyBackupService.backup(modelRestoredIdentifier, backup.content);
        const modelRestored = disposables.add(instantiationService.createInstance(TextFileEditorModel, modelRestoredIdentifier.resource, 'utf8', undefined));
        await modelRestored.resolve();
        assert.strictEqual(modelRestored.textEditorModel?.getValue(), contents);
        assert.strictEqual(modelRestored.isDirty(), true);
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JNb2RlbC5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvdGVzdC9icm93c2VyL3RleHRGaWxlRWRpdG9yTW9kZWwuaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixHQUNuQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFFakQsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXZGLEtBQUssQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7SUFDdkQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLG9CQUEyQyxDQUFBO0lBQy9DLElBQUksUUFBNkIsQ0FBQTtJQUNqQyxJQUFJLE9BQWUsQ0FBQTtJQUVuQixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzVFLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxjQUFj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
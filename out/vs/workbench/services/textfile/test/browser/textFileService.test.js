/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService, TestServiceAccessor, } from '../../../../test/browser/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { TextFileEditorModel } from '../../common/textFileEditorModel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('Files - TextFileService', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
    });
    teardown(() => {
        disposables.clear();
    });
    test('isDirty/getDirty - files and untitled', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        assert.ok(!accessor.textFileService.isDirty(model.resource));
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        const untitled = disposables.add(await accessor.textFileService.untitled.resolve());
        assert.ok(!accessor.textFileService.isDirty(untitled.resource));
        untitled.textEditorModel?.setValue('changed');
        assert.ok(accessor.textFileService.isDirty(untitled.resource));
    });
    test('save - file', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        const res = await accessor.textFileService.save(model.resource);
        assert.strictEqual(res?.toString(), model.resource.toString());
        assert.ok(!accessor.textFileService.isDirty(model.resource));
    });
    test('saveAll - file', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        const res = await accessor.textFileService.save(model.resource);
        assert.strictEqual(res?.toString(), model.resource.toString());
        assert.ok(!accessor.textFileService.isDirty(model.resource));
    });
    test('saveAs - file', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        accessor.fileDialogService.setPickFileToSave(model.resource);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        const res = await accessor.textFileService.saveAs(model.resource);
        assert.strictEqual(res.toString(), model.resource.toString());
        assert.ok(!accessor.textFileService.isDirty(model.resource));
    });
    test('revert - file', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        accessor.fileDialogService.setPickFileToSave(model.resource);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        await accessor.textFileService.revert(model.resource);
        assert.ok(!accessor.textFileService.isDirty(model.resource));
    });
    test('create does not overwrite existing model', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        let eventCounter = 0;
        disposables.add(accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files) => {
                assert.strictEqual(files[0].target.toString(), model.resource.toString());
                eventCounter++;
            },
        }));
        disposables.add(accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation((e) => {
            assert.strictEqual(e.operation, 0 /* FileOperation.CREATE */);
            assert.strictEqual(e.files[0].target.toString(), model.resource.toString());
            eventCounter++;
        }));
        await accessor.textFileService.create([{ resource: model.resource, value: 'Foo' }]);
        assert.ok(!accessor.textFileService.isDirty(model.resource));
        assert.strictEqual(eventCounter, 2);
    });
    test('Filename Suggestion - Suggest prefix only when there are no relevant extensions', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus0',
            extensions: ['.one', '.two'],
        }));
        const suggested = accessor.textFileService.suggestFilename('shleem', 'Untitled-1');
        assert.strictEqual(suggested, 'Untitled-1');
    });
    test('Filename Suggestion - Suggest prefix with first extension', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus1',
            extensions: ['.shleem', '.gazorpazorp'],
            filenames: ['plumbus'],
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus1', 'Untitled-1');
        assert.strictEqual(suggested, 'Untitled-1.shleem');
    });
    test('Filename Suggestion - Preserve extension if it matchers', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus2',
            extensions: ['.shleem', '.gazorpazorp'],
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus2', 'Untitled-1.gazorpazorp');
        assert.strictEqual(suggested, 'Untitled-1.gazorpazorp');
    });
    test('Filename Suggestion - Rewrite extension according to language', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus2',
            extensions: ['.shleem', '.gazorpazorp'],
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus2', 'Untitled-1.foobar');
        assert.strictEqual(suggested, 'Untitled-1.shleem');
    });
    test('Filename Suggestion - Suggest filename if there are no extensions', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus2',
            filenames: ['plumbus', 'shleem', 'gazorpazorp'],
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus2', 'Untitled-1');
        assert.strictEqual(suggested, 'plumbus');
    });
    test('Filename Suggestion - Preserve filename if it matches', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus2',
            filenames: ['plumbus', 'shleem', 'gazorpazorp'],
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus2', 'gazorpazorp');
        assert.strictEqual(suggested, 'gazorpazorp');
    });
    test('Filename Suggestion - Rewrites filename according to language', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus2',
            filenames: ['plumbus', 'shleem', 'gazorpazorp'],
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus2', 'foobar');
        assert.strictEqual(suggested, 'plumbus');
    });
    test('getEncoding() - files and untitled', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        assert.strictEqual(accessor.textFileService.getEncoding(model.resource), 'utf8');
        await model.setEncoding('utf16', 0 /* EncodingMode.Encode */);
        assert.strictEqual(accessor.textFileService.getEncoding(model.resource), 'utf16');
        const untitled = disposables.add(await accessor.textFileService.untitled.resolve());
        assert.strictEqual(accessor.textFileService.getEncoding(untitled.resource), 'utf8');
        await untitled.setEncoding('utf16');
        assert.strictEqual(accessor.textFileService.getEncoding(untitled.resource), 'utf16');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvdGVzdC9icm93c2VyL3RleHRGaWxlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixHQUVuQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFFakQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR3pFLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxJQUFJLG9CQUEyQyxDQUFBO0lBQy9DLElBQUksUUFBNkIsQ0FBQTtJQUVqQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzVFLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUNuRSxXQUFXLENBQUMsR0FBRyxDQUFrQyxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pGLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1Q0FBdUMs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
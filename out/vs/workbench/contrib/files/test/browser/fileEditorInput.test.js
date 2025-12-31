/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { FileEditorInput } from '../../browser/editors/fileEditorInput.js';
import { workbenchInstantiationService, TestServiceAccessor, getLastResolvedFileStat, } from '../../../../test/browser/workbenchTestServices.js';
import { EditorExtensions, } from '../../../../common/editor.js';
import { TextFileOperationError, } from '../../../../services/textfile/common/textfiles.js';
import { NotModifiedSinceFileOperationError, TooLargeFileOperationError, } from '../../../../../platform/files/common/files.js';
import { TextFileEditorModel } from '../../../../services/textfile/common/textFileEditorModel.js';
import { timeout } from '../../../../../base/common/async.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { BinaryEditorModel } from '../../../../common/editor/binaryEditorModel.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { FileEditorInputSerializer } from '../../browser/editors/fileEditorHandler.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TextEditorService } from '../../../../services/textfile/common/textEditorService.js';
suite('Files - FileEditorInput', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    function createFileInput(resource, preferredResource, preferredLanguageId, preferredName, preferredDescription, preferredContents) {
        return disposables.add(instantiationService.createInstance(FileEditorInput, resource, preferredResource, preferredName, preferredDescription, undefined, preferredLanguageId, preferredContents));
    }
    class TestTextEditorService extends TextEditorService {
        createTextEditor(input) {
            return createFileInput(input.resource);
        }
        async resolveTextEditor(input) {
            return createFileInput(input.resource);
        }
    }
    setup(() => {
        instantiationService = workbenchInstantiationService({
            textEditorService: (instantiationService) => instantiationService.createInstance(TestTextEditorService),
        }, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
    });
    teardown(() => {
        disposables.clear();
    });
    test('Basics', async function () {
        let input = createFileInput(toResource.call(this, '/foo/bar/file.js'));
        const otherInput = createFileInput(toResource.call(this, 'foo/bar/otherfile.js'));
        const otherInputSame = createFileInput(toResource.call(this, 'foo/bar/file.js'));
        assert(input.matches(input));
        assert(input.matches(otherInputSame));
        assert(!input.matches(otherInput));
        assert.ok(input.getName());
        assert.ok(input.getDescription());
        assert.ok(input.getTitle(0 /* Verbosity.SHORT */));
        assert.ok(!input.hasCapability(4 /* EditorInputCapabilities.Untitled */));
        assert.ok(!input.hasCapability(2 /* EditorInputCapabilities.Readonly */));
        assert.ok(!input.isReadonly());
        assert.ok(!input.hasCapability(8 /* EditorInputCapabilities.Singleton */));
        assert.ok(!input.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */));
        const untypedInput = input.toUntyped({ preserveViewState: 0 });
        assert.strictEqual(untypedInput.resource.toString(), input.resource.toString());
        assert.strictEqual('file.js', input.getName());
        assert.strictEqual(toResource.call(this, '/foo/bar/file.js').fsPath, input.resource.fsPath);
        assert(input.resource instanceof URI);
        input = createFileInput(toResource.call(this, '/foo/bar.html'));
        const inputToResolve = createFileInput(toResource.call(this, '/foo/bar/file.js'));
        const sameOtherInput = createFileInput(toResource.call(this, '/foo/bar/file.js'));
        let resolved = await inputToResolve.resolve();
        assert.ok(inputToResolve.isResolved());
        const resolvedModelA = resolved;
        resolved = await inputToResolve.resolve();
        assert(resolvedModelA === resolved); // OK: Resolved Model cached globally per input
        try {
            DisposableStore.DISABLE_DISPOSED_WARNING = true; // prevent unwanted warning output from occurring
            const otherResolved = await sameOtherInput.resolve();
            assert(otherResolved === resolvedModelA); // OK: Resolved Model cached globally per input
            inputToResolve.dispose();
            resolved = await inputToResolve.resolve();
            assert(resolvedModelA === resolved); // Model is still the same because we had 2 clients
            inputToResolve.dispose();
            sameOtherInput.dispose();
            resolvedModelA.dispose();
            resolved = await inputToResolve.resolve();
            assert(resolvedModelA !== resolved); // Different instance, because input got disposed
            const stat = getLastResolvedFileStat(resolved);
            resolved = await inputToResolve.resolve();
            await timeout(0);
            assert(stat !== getLastResolvedFileStat(resolved)); // Different stat, because resolve always goes to the server for refresh
        }
        finally {
            DisposableStore.DISABLE_DISPOSED_WARNING = false;
        }
    });
    test('reports as untitled without supported file scheme', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/file.js').with({ scheme: 'someTestingScheme' }));
        assert.ok(input.hasCapability(4 /* EditorInputCapabilities.Untitled */));
        assert.ok(!input.hasCapability(2 /* EditorInputCapabilities.Readonly */));
        assert.ok(!input.isReadonly());
    });
    test('reports as readonly with readonly file scheme', async function () {
        const inMemoryFilesystemProvider = disposables.add(new InMemoryFileSystemProvider());
        inMemoryFilesystemProvider.setReadOnly(true);
        disposables.add(accessor.fileService.registerProvider('someTestingReadonlyScheme', inMemoryFilesystemProvider));
        const input = createFileInput(toResource.call(this, '/foo/bar/file.js').with({ scheme: 'someTestingReadonlyScheme' }));
        assert.ok(!input.hasCapability(4 /* EditorInputCapabilities.Untitled */));
        assert.ok(input.hasCapability(2 /* EditorInputCapabilities.Readonly */));
        assert.ok(input.isReadonly());
    });
    test('preferred resource', function () {
        const resource = toResource.call(this, '/foo/bar/updatefile.js');
        const preferredResource = toResource.call(this, '/foo/bar/UPDATEFILE.js');
        const inputWithoutPreferredResource = createFileInput(resource);
        assert.strictEqual(inputWithoutPreferredResource.resource.toString(), resource.toString());
        assert.strictEqual(inputWithoutPreferredResource.preferredResource.toString(), resource.toString());
        const inputWithPreferredResource = createFileInput(resource, preferredResource);
        assert.strictEqual(inputWithPreferredResource.resource.toString(), resource.toString());
        assert.strictEqual(inputWithPreferredResource.preferredResource.toString(), preferredResource.toString());
        let didChangeLabel = false;
        disposables.add(inputWithPreferredResource.onDidChangeLabel((e) => {
            didChangeLabel = true;
        }));
        assert.strictEqual(inputWithPreferredResource.getName(), 'UPDATEFILE.js');
        const otherPreferredResource = toResource.call(this, '/FOO/BAR/updateFILE.js');
        inputWithPreferredResource.setPreferredResource(otherPreferredResource);
        assert.strictEqual(inputWithPreferredResource.resource.toString(), resource.toString());
        assert.strictEqual(inputWithPreferredResource.preferredResource.toString(), otherPreferredResource.toString());
        assert.strictEqual(inputWithPreferredResource.getName(), 'updateFILE.js');
        assert.strictEqual(didChangeLabel, true);
    });
    test('preferred language', async function () {
        const languageId = 'file-input-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: languageId,
        }));
        const input = createFileInput(toResource.call(this, '/foo/bar/file.js'), undefined, languageId);
        assert.strictEqual(input.getPreferredLanguageId(), languageId);
        const model = disposables.add((await input.resolve()));
        assert.strictEqual(model.textEditorModel.getLanguageId(), languageId);
        input.setLanguageId('text');
        assert.strictEqual(input.getPreferredLanguageId(), 'text');
        assert.strictEqual(model.textEditorModel.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
        const input2 = createFileInput(toResource.call(this, '/foo/bar/file.js'));
        input2.setPreferredLanguageId(languageId);
        const model2 = disposables.add((await input2.resolve()));
        assert.strictEqual(model2.textEditorModel.getLanguageId(), languageId);
    });
    test('preferred contents', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/file.js'), undefined, undefined, undefined, undefined, 'My contents');
        const model = disposables.add((await input.resolve()));
        assert.strictEqual(model.textEditorModel.getValue(), 'My contents');
        assert.strictEqual(input.isDirty(), true);
        const untypedInput = input.toUntyped({ preserveViewState: 0 });
        assert.strictEqual(untypedInput.contents, 'My contents');
        const untypedInputWithoutContents = input.toUntyped();
        assert.strictEqual(untypedInputWithoutContents.contents, undefined);
        input.setPreferredContents('Other contents');
        await input.resolve();
        assert.strictEqual(model.textEditorModel.getValue(), 'Other contents');
        model.textEditorModel?.setValue('Changed contents');
        await input.resolve();
        assert.strictEqual(model.textEditorModel.getValue(), 'Changed contents'); // preferred contents only used once
        const input2 = createFileInput(toResource.call(this, '/foo/bar/file.js'));
        input2.setPreferredContents('My contents');
        const model2 = (await input2.resolve());
        assert.strictEqual(model2.textEditorModel.getValue(), 'My contents');
        assert.strictEqual(input2.isDirty(), true);
    });
    test('matches', function () {
        const input1 = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        const input2 = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        const input3 = createFileInput(toResource.call(this, '/foo/bar/other.js'));
        const input2Upper = createFileInput(toResource.call(this, '/foo/bar/UPDATEFILE.js'));
        assert.strictEqual(input1.matches(input1), true);
        assert.strictEqual(input1.matches(input2), true);
        assert.strictEqual(input1.matches(input3), false);
        assert.strictEqual(input1.matches(input2Upper), false);
    });
    test('getEncoding/setEncoding', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        await input.setEncoding('utf16', 0 /* EncodingMode.Encode */);
        assert.strictEqual(input.getEncoding(), 'utf16');
        const resolved = disposables.add((await input.resolve()));
        assert.strictEqual(input.getEncoding(), resolved.getEncoding());
    });
    test('save', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        const resolved = disposables.add((await input.resolve()));
        resolved.textEditorModel.setValue('changed');
        assert.ok(input.isDirty());
        assert.ok(input.isModified());
        await input.save(0);
        assert.ok(!input.isDirty());
        assert.ok(!input.isModified());
    });
    test('revert', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        const resolved = disposables.add((await input.resolve()));
        resolved.textEditorModel.setValue('changed');
        assert.ok(input.isDirty());
        assert.ok(input.isModified());
        await input.revert(0);
        assert.ok(!input.isDirty());
        assert.ok(!input.isModified());
        input.dispose();
        assert.ok(input.isDisposed());
    });
    test('resolve handles binary files', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        accessor.textFileService.setReadStreamErrorOnce(new TextFileOperationError('error', 0 /* TextFileOperationResult.FILE_IS_BINARY */));
        const resolved = disposables.add(await input.resolve());
        assert.ok(resolved);
    });
    test('resolve throws for too large files', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        let e = undefined;
        accessor.textFileService.setReadStreamErrorOnce(new TooLargeFileOperationError('error', 7 /* FileOperationResult.FILE_TOO_LARGE */, 1000));
        try {
            await input.resolve();
        }
        catch (error) {
            e = error;
        }
        assert.ok(e);
    });
    test('attaches to model when created and reports dirty', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        let listenerCount = 0;
        disposables.add(input.onDidChangeDirty(() => {
            listenerCount++;
        }));
        // instead of going through file input resolve method
        // we resolve the model directly through the service
        const model = disposables.add(await accessor.textFileService.files.resolve(input.resource));
        model.textEditorModel?.setValue('hello world');
        assert.strictEqual(listenerCount, 1);
        assert.ok(input.isDirty());
    });
    test('force open text/binary', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        input.setForceOpenAsBinary();
        let resolved = disposables.add(await input.resolve());
        assert.ok(resolved instanceof BinaryEditorModel);
        input.setForceOpenAsText();
        resolved = disposables.add(await input.resolve());
        assert.ok(resolved instanceof TextFileEditorModel);
    });
    test('file editor serializer', async function () {
        instantiationService.invokeFunction((accessor) => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        disposables.add(Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer('workbench.editors.files.fileEditorInput', FileEditorInputSerializer));
        const editorSerializer = Registry.as(EditorExtensions.EditorFactory).getEditorSerializer(input.typeId);
        if (!editorSerializer) {
            assert.fail('File Editor Input Serializer missing');
        }
        assert.strictEqual(editorSerializer.canSerialize(input), true);
        const inputSerialized = editorSerializer.serialize(input);
        if (!inputSerialized) {
            assert.fail('Unexpected serialized file input');
        }
        const inputDeserialized = editorSerializer.deserialize(instantiationService, inputSerialized);
        assert.strictEqual(inputDeserialized ? input.matches(inputDeserialized) : false, true);
        const preferredResource = toResource.call(this, '/foo/bar/UPDATEfile.js');
        const inputWithPreferredResource = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'), preferredResource);
        const inputWithPreferredResourceSerialized = editorSerializer.serialize(inputWithPreferredResource);
        if (!inputWithPreferredResourceSerialized) {
            assert.fail('Unexpected serialized file input');
        }
        const inputWithPreferredResourceDeserialized = editorSerializer.deserialize(instantiationService, inputWithPreferredResourceSerialized);
        assert.strictEqual(inputWithPreferredResource.resource.toString(), inputWithPreferredResourceDeserialized.resource.toString());
        assert.strictEqual(inputWithPreferredResource.preferredResource.toString(), inputWithPreferredResourceDeserialized.preferredResource.toString());
    });
    test('preferred name/description', async function () {
        // Works with custom file input
        const customFileInput = createFileInput(toResource.call(this, '/foo/bar/updatefile.js').with({ scheme: 'test-custom' }), undefined, undefined, 'My Name', 'My Description');
        let didChangeLabelCounter = 0;
        disposables.add(customFileInput.onDidChangeLabel(() => {
            didChangeLabelCounter++;
        }));
        assert.strictEqual(customFileInput.getName(), 'My Name');
        assert.strictEqual(customFileInput.getDescription(), 'My Description');
        customFileInput.setPreferredName('My Name 2');
        customFileInput.setPreferredDescription('My Description 2');
        assert.strictEqual(customFileInput.getName(), 'My Name 2');
        assert.strictEqual(customFileInput.getDescription(), 'My Description 2');
        assert.strictEqual(didChangeLabelCounter, 2);
        customFileInput.dispose();
        // Disallowed with local file input
        const fileInput = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'), undefined, undefined, 'My Name', 'My Description');
        didChangeLabelCounter = 0;
        disposables.add(fileInput.onDidChangeLabel(() => {
            didChangeLabelCounter++;
        }));
        assert.notStrictEqual(fileInput.getName(), 'My Name');
        assert.notStrictEqual(fileInput.getDescription(), 'My Description');
        fileInput.setPreferredName('My Name 2');
        fileInput.setPreferredDescription('My Description 2');
        assert.notStrictEqual(fileInput.getName(), 'My Name 2');
        assert.notStrictEqual(fileInput.getDescription(), 'My Description 2');
        assert.strictEqual(didChangeLabelCounter, 0);
    });
    test('reports readonly changes', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        let listenerCount = 0;
        disposables.add(input.onDidChangeCapabilities(() => {
            listenerCount++;
        }));
        const model = disposables.add(await accessor.textFileService.files.resolve(input.resource));
        assert.strictEqual(model.isReadonly(), false);
        assert.strictEqual(input.hasCapability(2 /* EditorInputCapabilities.Readonly */), false);
        assert.strictEqual(input.isReadonly(), false);
        const stat = await accessor.fileService.resolve(input.resource, { resolveMetadata: true });
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('file not modified since', { ...stat, readonly: true });
            await input.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(!!model.isReadonly(), true);
        assert.strictEqual(input.hasCapability(2 /* EditorInputCapabilities.Readonly */), true);
        assert.strictEqual(!!input.isReadonly(), true);
        assert.strictEqual(listenerCount, 1);
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('file not modified since', { ...stat, readonly: false });
            await input.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(model.isReadonly(), false);
        assert.strictEqual(input.hasCapability(2 /* EditorInputCapabilities.Readonly */), false);
        assert.strictEqual(input.isReadonly(), false);
        assert.strictEqual(listenerCount, 2);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUVkaXRvcklucHV0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy90ZXN0L2Jyb3dzZXIvZmlsZUVkaXRvcklucHV0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sdUNBQXVDLEVBQ3ZDLFVBQVUsR0FDVixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixFQUNuQix1QkFBdUIsR0FDdkIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxPQUFPLEVBR04sZ0JBQWdCLEdBRWhCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUVOLHNCQUFzQixHQUV0QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFFTixrQ0FBa0MsRUFDbEMsMEJBQTBCLEdBQzFCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDL0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFFN0YsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLElBQUksb0JBQTJDLENBQUE7SUFDL0MsSUFBSSxRQUE2QixDQUFBO0lBRWpDLFNBQVMsZUFBZSxDQUN2QixRQUFhLEVBQ2IsaUJBQXVCLEVBQ3ZCLG1CQUE0QixFQUM1QixhQUFzQixFQUN0QixvQkFBNkIsRUFDN0IsaUJBQTBCO1FBRTFCLE9BQU8sV0FBVyxDQUFDLEdBQUcsQ0FDckIsb0JBQW9CLENBQUMsY0FBYyxDQUNsQyxlQUFlLEVBQ2YsUUFBUSxFQUNSLGlCQUFpQixFQUNqQixhQUFhLEVBQ2Isb0JBQW9CLEVBQ3BCLFNBQVMsRUFDVCxtQkFBbUIsRUFDbkIsaUJBQWlCLENBQ2pCLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxNQUFNLHFCQUFzQixTQUFRLGlCQUFpQjtRQUMzQyxnQkFBZ0IsQ0FBQyxLQUEyQjtZQUNwRCxPQUFPLGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVRLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxLQUEyQjtZQUMzRCxPQUFPLGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdkMsQ0FBQztLQUNEO0lBRUQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLDZCQUE2QixDQUNuRDtZQUNDLGlCQUFpQixFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUMzQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUM7U0FDM0QsRUFDRCxXQUFXLENBQ1gsQ0FBQTtRQUVELFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUNwRSxDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUs7UUFDbkIsSUFBSSxLQUFLLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUN0RSxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7UUFFaEYsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUM1QixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSx5QkFBaUIsQ0FBQyxDQUFBO1FBRTFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSwwQ0FBa0MsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSwwQ0FBa0MsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUM5QixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsMkNBQW1DLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsZ0RBQXVDLENBQUMsQ0FBQTtRQUV0RSxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBRS9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzRixNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsWUFBWSxHQUFHLENBQUMsQ0FBQTtRQUVyQyxLQUFLLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUE7UUFFL0QsTUFBTSxjQUFjLEdBQW9CLGVBQWUsQ0FDdEQsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FDekMsQ0FBQTtRQUNELE1BQU0sY0FBYyxHQUFvQixlQUFlLENBQ3RELFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQ3pDLENBQUE7UUFFRCxJQUFJLFFBQVEsR0FBRyxNQUFNLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUM3QyxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBRXRDLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQTtRQUMvQixRQUFRLEdBQUcsTUFBTSxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDekMsTUFBTSxDQUFDLGNBQWMsS0FBSyxRQUFRLENBQUMsQ0FBQSxDQUFDLCtDQUErQztRQUVuRixJQUFJLENBQUM7WUFDSixlQUFlLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFBLENBQUMsaURBQWlEO1lBRWpHLE1BQU0sYUFBYSxHQUFHLE1BQU0sY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3BELE1BQU0sQ0FBQyxhQUFhLEtBQUssY0FBYyxDQUFDLENBQUEsQ0FBQywrQ0FBK0M7WUFDeEYsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBRXhCLFFBQVEsR0FBRyxNQUFNLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN6QyxNQUFNLENBQUMsY0FBYyxLQUFLLFFBQVEsQ0FBQyxDQUFBLENBQUMsbURBQW1EO1lBQ3ZGLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN4QixjQUFjLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDeEIsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBRXhCLFFBQVEsR0FBRyxNQUFNLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN6QyxNQUFNLENBQUMsY0FBYyxLQUFLLFFBQVEsQ0FBQyxDQUFBLENBQUMsaURBQWlEO1lBRXJGLE1BQU0sSUFBSSxHQUFHLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzlDLFFBQVEsR0FBRyxNQUFNLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN6QyxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQixNQUFNLENBQUMsSUFBSSxLQUFLLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUEsQ0FBQyx3RUFBd0U7UUFDNUgsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsZUFBZSxDQUFDLHdCQUF3QixHQUFHLEtBQUssQ0FBQTtRQUNqRCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbURBQW1ELEVBQUUsS0FBSztRQUM5RCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQzVCLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixFQUFFLENBQUMsQ0FDL0UsQ0FBQTtRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGFBQWEsMENBQWtDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsMENBQWtDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7SUFDL0IsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSztRQUMxRCxNQUFNLDBCQUEwQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSwwQkFBMEIsRUFBRSxDQUFDLENBQUE7UUFDcEYsMEJBQTBCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRTVDLFdBQVcsQ0FBQyxHQUFHLENBQ2QsUUFBUSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FDcEMsMkJBQTJCLEVBQzNCLDBCQUEwQixDQUMxQixDQUNELENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQzVCLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLDJCQUEyQixFQUFFLENBQUMsQ0FDdkYsQ0FBQTtRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSwwQ0FBa0MsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGFBQWEsMENBQWtDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO0lBQzlCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1FBQzFCLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLENBQUE7UUFDaEUsTUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQyxDQUFBO1FBRXpFLE1BQU0sNkJBQTZCLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsNkJBQTZCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQzFGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLDZCQUE2QixDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxFQUMxRCxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ25CLENBQUE7UUFFRCxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUUvRSxNQUFNLENBQUMsV0FBVyxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUN2RixNQUFNLENBQUMsV0FBVyxDQUNqQiwwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsRUFDdkQsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQzVCLENBQUE7UUFFRCxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FDZCwwQkFBMEIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2pELGNBQWMsR0FBRyxJQUFJLENBQUE7UUFDdEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUMsT0FBTyxFQUFFLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFFekUsTUFBTSxzQkFBc0IsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQyxDQUFBO1FBQzlFLDBCQUEwQixDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFFdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsMEJBQTBCLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLEVBQ3ZELHNCQUFzQixDQUFDLFFBQVEsRUFBRSxDQUNqQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN6RSxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxLQUFLO1FBQy9CLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFBO1FBQ3BDLFdBQVcsQ0FBQyxHQUFHLENBQ2QsUUFBUSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQztZQUN6QyxFQUFFLEVBQUUsVUFBVTtTQUNkLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQy9GLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFOUQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUF3QixDQUFDLENBQUE7UUFDN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZ0IsQ0FBQyxhQUFhLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUV0RSxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZ0IsQ0FBQyxhQUFhLEVBQUUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBRWpGLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFDekUsTUFBTSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBd0IsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGVBQWdCLENBQUMsYUFBYSxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDeEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsS0FBSztRQUMvQixNQUFNLEtBQUssR0FBRyxlQUFlLENBQzVCLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLEVBQ3pDLFNBQVMsRUFDVCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxhQUFhLENBQ2IsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBd0IsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWdCLENBQUMsUUFBUSxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFekMsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRXhELE1BQU0sMkJBQTJCLEdBQUcsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRW5FLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWdCLENBQUMsUUFBUSxFQUFFLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUV2RSxLQUFLLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWdCLENBQUMsUUFBUSxFQUFFLEVBQUUsa0JBQWtCLENBQUMsQ0FBQSxDQUFDLG9DQUFvQztRQUU5RyxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUUxQyxNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQU0sTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUF3QixDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGVBQWdCLENBQUMsUUFBUSxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsU0FBUyxFQUFFO1FBQ2YsTUFBTSxNQUFNLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtRQUMvRSxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtRQUVwRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVqRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdkQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSztRQUNwQyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLDhCQUFzQixDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRWhELE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBd0IsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO0lBQ2hFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLO1FBQ2pCLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7UUFFOUUsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUF3QixDQUFDLENBQUE7UUFDaEYsUUFBUSxDQUFDLGVBQWdCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDMUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUU3QixNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQzNCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtJQUMvQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSztRQUNuQixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBd0IsQ0FBQyxDQUFBO1FBQ2hGLFFBQVEsQ0FBQyxlQUFnQixDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFFN0IsTUFBTSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUMzQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFFOUIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtJQUM5QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxLQUFLO1FBQ3pDLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7UUFFOUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FDOUMsSUFBSSxzQkFBc0IsQ0FBQyxPQUFPLGlEQUF5QyxDQUMzRSxDQUFBO1FBRUQsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0NBQW9DLEVBQUUsS0FBSztRQUMvQyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFBO1FBRTlFLElBQUksQ0FBQyxHQUFzQixTQUFTLENBQUE7UUFDcEMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FDOUMsSUFBSSwwQkFBMEIsQ0FBQyxPQUFPLDhDQUFzQyxJQUFJLENBQUMsQ0FDakYsQ0FBQTtRQUNELElBQUksQ0FBQztZQUNKLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3RCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLENBQUMsR0FBRyxLQUFLLENBQUE7UUFDVixDQUFDO1FBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNiLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtEQUFrRCxFQUFFLEtBQUs7UUFDN0QsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtRQUU5RSxJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUE7UUFDckIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQzNCLGFBQWEsRUFBRSxDQUFBO1FBQ2hCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxxREFBcUQ7UUFDckQsb0RBQW9EO1FBQ3BELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDM0YsS0FBSyxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUMzQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxLQUFLO1FBQ25DLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7UUFDOUUsS0FBSyxDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFFNUIsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxZQUFZLGlCQUFpQixDQUFDLENBQUE7UUFFaEQsS0FBSyxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFFMUIsUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsWUFBWSxtQkFBbUIsQ0FBQyxDQUFBO0lBQ25ELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEtBQUs7UUFDbkMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDaEQsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUNuRixDQUFBO1FBRUQsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtRQUU5RSxXQUFXLENBQUMsR0FBRyxDQUNkLFFBQVEsQ0FBQyxFQUFFLENBQXlCLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDLHdCQUF3QixDQUMzRix5Q0FBeUMsRUFDekMseUJBQXlCLENBQ3pCLENBQ0QsQ0FBQTtRQUVELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDbkMsZ0JBQWdCLENBQUMsYUFBYSxDQUM5QixDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN2QixNQUFNLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLENBQUE7UUFDcEQsQ0FBQztRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTlELE1BQU0sZUFBZSxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN6RCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsTUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFBO1FBQ2hELENBQUM7UUFFRCxNQUFNLGlCQUFpQixHQUFHLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUM3RixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUV0RixNQUFNLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLENBQUE7UUFDekUsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQ2pELFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLEVBQy9DLGlCQUFpQixDQUNqQixDQUFBO1FBRUQsTUFBTSxvQ0FBb0MsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQ3RFLDBCQUEwQixDQUMxQixDQUFBO1FBQ0QsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLENBQUM7WUFDM0MsTUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFBO1FBQ2hELENBQUM7UUFFRCxNQUFNLHNDQUFzQyxHQUFHLGdCQUFnQixDQUFDLFdBQVcsQ0FDMUUsb0JBQW9CLEVBQ3BCLG9DQUFvQyxDQUNqQixDQUFBO1FBQ3BCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDOUMsc0NBQXNDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUMxRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsMEJBQTBCLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLEVBQ3ZELHNDQUFzQyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUNuRSxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSztRQUN2QywrQkFBK0I7UUFDL0IsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUN0QyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsQ0FBQyxFQUMvRSxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxnQkFBZ0IsQ0FDaEIsQ0FBQTtRQUVELElBQUkscUJBQXFCLEdBQUcsQ0FBQyxDQUFBO1FBQzdCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtZQUNyQyxxQkFBcUIsRUFBRSxDQUFBO1FBQ3hCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBRXRFLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM3QyxlQUFlLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUUzRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRXhFLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRXpCLG1DQUFtQztRQUNuQyxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQ2hDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLEVBQy9DLFNBQVMsRUFDVCxTQUFTLEVBQ1QsU0FBUyxFQUNULGdCQUFnQixDQUNoQixDQUFBO1FBRUQscUJBQXFCLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtZQUMvQixxQkFBcUIsRUFBRSxDQUFBO1FBQ3hCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBRW5FLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUN2QyxTQUFTLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUVyRCxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRXJFLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMEJBQTBCLEVBQUUsS0FBSztRQUNyQyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFBO1FBRTlFLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUNyQixXQUFXLENBQUMsR0FBRyxDQUNkLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7WUFDbEMsYUFBYSxFQUFFLENBQUE7UUFDaEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFM0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSwwQ0FBa0MsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUU3QyxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUUxRixJQUFJLENBQUM7WUFDSixRQUFRLENBQUMsV0FBVyxDQUFDLG9CQUFvQixHQUFHLElBQUksa0NBQWtDLENBQ2pGLHlCQUF5QixFQUN6QixFQUFFLEdBQUcsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FDM0IsQ0FBQTtZQUNELE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3RCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLFFBQVEsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEdBQUcsU0FBUyxDQUFBO1FBQ3RELENBQUM7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSwwQ0FBa0MsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFcEMsSUFBSSxDQUFDO1lBQ0osUUFBUSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLGtDQUFrQyxDQUNqRix5QkFBeUIsRUFDekIsRUFBRSxHQUFHLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQzVCLENBQUE7WUFDRCxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN0QixDQUFDO2dCQUFTLENBQUM7WUFDVixRQUFRLENBQUMsV0FBVyxDQUFDLG9CQUFvQixHQUFHLFNBQVMsQ0FBQTtRQUN0RCxDQUFDO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSwwQ0FBa0MsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNyQyxDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==
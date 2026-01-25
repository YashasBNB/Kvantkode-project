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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUVkaXRvcklucHV0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL3Rlc3QvYnJvd3Nlci9maWxlRWRpdG9ySW5wdXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLHVCQUF1QixHQUN2QixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELE9BQU8sRUFHTixnQkFBZ0IsR0FFaEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBRU4sc0JBQXNCLEdBRXRCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUVOLGtDQUFrQyxFQUNsQywwQkFBMEIsR0FDMUIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM5RSxPQUFPLEVB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
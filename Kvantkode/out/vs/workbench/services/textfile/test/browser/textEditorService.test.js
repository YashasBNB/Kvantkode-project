/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { isResourceDiffEditorInput, isResourceSideBySideEditorInput, isUntitledResourceEditorInput, } from '../../../../common/editor.js';
import { workbenchInstantiationService, registerTestEditor, TestFileEditorInput, registerTestResourceEditor, registerTestSideBySideEditor, } from '../../../../test/browser/workbenchTestServices.js';
import { TextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { FileEditorInput } from '../../../../contrib/files/browser/editors/fileEditorInput.js';
import { UntitledTextEditorInput } from '../../../untitled/common/untitledTextEditorInput.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { NullFileSystemProvider } from '../../../../../platform/files/test/common/nullFileSystemProvider.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { isLinux } from '../../../../../base/common/platform.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { TextEditorService } from '../../common/textEditorService.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
suite('TextEditorService', () => {
    const TEST_EDITOR_ID = 'MyTestEditorForEditorService';
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForEditorService';
    let FileServiceProvider = class FileServiceProvider extends Disposable {
        constructor(scheme, fileService) {
            super();
            this._register(fileService.registerProvider(scheme, new NullFileSystemProvider()));
        }
    };
    FileServiceProvider = __decorate([
        __param(1, IFileService)
    ], FileServiceProvider);
    const disposables = new DisposableStore();
    setup(() => {
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput)], TEST_EDITOR_INPUT_ID));
        disposables.add(registerTestResourceEditor());
        disposables.add(registerTestSideBySideEditor());
    });
    teardown(() => {
        disposables.clear();
    });
    test('createTextEditor - basics', async function () {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const languageService = instantiationService.get(ILanguageService);
        const service = disposables.add(instantiationService.createInstance(TextEditorService));
        const languageId = 'create-input-test';
        disposables.add(languageService.registerLanguage({
            id: languageId,
        }));
        // Untyped Input (file)
        let input = disposables.add(service.createTextEditor({
            resource: toResource.call(this, '/index.html'),
            options: { selection: { startLineNumber: 1, startColumn: 1 } },
        }));
        assert(input instanceof FileEditorInput);
        let contentInput = input;
        assert.strictEqual(contentInput.resource.fsPath, toResource.call(this, '/index.html').fsPath);
        // Untyped Input (file casing)
        input = disposables.add(service.createTextEditor({ resource: toResource.call(this, '/index.html') }));
        const inputDifferentCase = disposables.add(service.createTextEditor({ resource: toResource.call(this, '/INDEX.html') }));
        if (!isLinux) {
            assert.strictEqual(input, inputDifferentCase);
            assert.strictEqual(input.resource?.toString(), inputDifferentCase.resource?.toString());
        }
        else {
            assert.notStrictEqual(input, inputDifferentCase);
            assert.notStrictEqual(input.resource?.toString(), inputDifferentCase.resource?.toString());
        }
        // Typed Input
        assert.strictEqual(disposables.add(service.createTextEditor(input)), input);
        // Untyped Input (file, encoding)
        input = disposables.add(service.createTextEditor({
            resource: toResource.call(this, '/index.html'),
            encoding: 'utf16le',
            options: { selection: { startLineNumber: 1, startColumn: 1 } },
        }));
        assert(input instanceof FileEditorInput);
        contentInput = input;
        assert.strictEqual(contentInput.getPreferredEncoding(), 'utf16le');
        // Untyped Input (file, language)
        input = disposables.add(service.createTextEditor({
            resource: toResource.call(this, '/index.html'),
            languageId: languageId,
        }));
        assert(input instanceof FileEditorInput);
        contentInput = input;
        assert.strictEqual(contentInput.getPreferredLanguageId(), languageId);
        let fileModel = disposables.add((await contentInput.resolve()));
        assert.strictEqual(fileModel.textEditorModel?.getLanguageId(), languageId);
        // Untyped Input (file, contents)
        input = disposables.add(service.createTextEditor({
            resource: toResource.call(this, '/index.html'),
            contents: 'My contents',
        }));
        assert(input instanceof FileEditorInput);
        contentInput = input;
        fileModel = disposables.add((await contentInput.resolve()));
        assert.strictEqual(fileModel.textEditorModel?.getValue(), 'My contents');
        assert.strictEqual(fileModel.isDirty(), true);
        // Untyped Input (file, different language)
        input = disposables.add(service.createTextEditor({
            resource: toResource.call(this, '/index.html'),
            languageId: 'text',
        }));
        assert(input instanceof FileEditorInput);
        contentInput = input;
        assert.strictEqual(contentInput.getPreferredLanguageId(), 'text');
        // Untyped Input (untitled)
        input = disposables.add(service.createTextEditor({
            resource: undefined,
            options: { selection: { startLineNumber: 1, startColumn: 1 } },
        }));
        assert(input instanceof UntitledTextEditorInput);
        // Untyped Input (untitled with contents)
        let untypedInput = {
            contents: 'Hello Untitled',
            options: { selection: { startLineNumber: 1, startColumn: 1 } },
        };
        input = disposables.add(service.createTextEditor(untypedInput));
        assert.ok(isUntitledResourceEditorInput(untypedInput));
        assert(input instanceof UntitledTextEditorInput);
        let model = disposables.add((await input.resolve()));
        assert.strictEqual(model.textEditorModel?.getValue(), 'Hello Untitled');
        // Untyped Input (untitled with language id)
        input = disposables.add(service.createTextEditor({
            resource: undefined,
            languageId: languageId,
            options: { selection: { startLineNumber: 1, startColumn: 1 } },
        }));
        assert(input instanceof UntitledTextEditorInput);
        model = disposables.add((await input.resolve()));
        assert.strictEqual(model.getLanguageId(), languageId);
        // Untyped Input (untitled with file path)
        input = disposables.add(service.createTextEditor({
            resource: URI.file('/some/path.txt'),
            forceUntitled: true,
            options: { selection: { startLineNumber: 1, startColumn: 1 } },
        }));
        assert(input instanceof UntitledTextEditorInput);
        assert.ok(input.hasAssociatedFilePath);
        // Untyped Input (untitled with untitled resource)
        untypedInput = {
            resource: URI.parse('untitled://Untitled-1'),
            forceUntitled: true,
            options: { selection: { startLineNumber: 1, startColumn: 1 } },
        };
        assert.ok(isUntitledResourceEditorInput(untypedInput));
        input = disposables.add(service.createTextEditor(untypedInput));
        assert(input instanceof UntitledTextEditorInput);
        assert.ok(!input.hasAssociatedFilePath);
        // Untyped input (untitled with custom resource, but forceUntitled)
        untypedInput = { resource: URI.file('/fake'), forceUntitled: true };
        assert.ok(isUntitledResourceEditorInput(untypedInput));
        input = disposables.add(service.createTextEditor(untypedInput));
        assert(input instanceof UntitledTextEditorInput);
        // Untyped Input (untitled with custom resource)
        const provider = disposables.add(instantiationService.createInstance(FileServiceProvider, 'untitled-custom'));
        input = disposables.add(service.createTextEditor({
            resource: URI.parse('untitled-custom://some/path'),
            forceUntitled: true,
            options: { selection: { startLineNumber: 1, startColumn: 1 } },
        }));
        assert(input instanceof UntitledTextEditorInput);
        assert.ok(input.hasAssociatedFilePath);
        provider.dispose();
        // Untyped Input (resource)
        input = disposables.add(service.createTextEditor({ resource: URI.parse('custom:resource') }));
        assert(input instanceof TextResourceEditorInput);
        // Untyped Input (diff)
        const resourceDiffInput = {
            modified: { resource: toResource.call(this, '/modified.html') },
            original: { resource: toResource.call(this, '/original.html') },
        };
        assert.strictEqual(isResourceDiffEditorInput(resourceDiffInput), true);
        input = disposables.add(service.createTextEditor(resourceDiffInput));
        assert(input instanceof DiffEditorInput);
        disposables.add(input.modified);
        disposables.add(input.original);
        assert.strictEqual(input.original.resource?.toString(), resourceDiffInput.original.resource.toString());
        assert.strictEqual(input.modified.resource?.toString(), resourceDiffInput.modified.resource.toString());
        const untypedDiffInput = input.toUntyped();
        assert.strictEqual(untypedDiffInput.original.resource?.toString(), resourceDiffInput.original.resource.toString());
        assert.strictEqual(untypedDiffInput.modified.resource?.toString(), resourceDiffInput.modified.resource.toString());
        // Untyped Input (side by side)
        const sideBySideResourceInput = {
            primary: { resource: toResource.call(this, '/primary.html') },
            secondary: { resource: toResource.call(this, '/secondary.html') },
        };
        assert.strictEqual(isResourceSideBySideEditorInput(sideBySideResourceInput), true);
        input = disposables.add(service.createTextEditor(sideBySideResourceInput));
        assert(input instanceof SideBySideEditorInput);
        disposables.add(input.primary);
        disposables.add(input.secondary);
        assert.strictEqual(input.primary.resource?.toString(), sideBySideResourceInput.primary.resource.toString());
        assert.strictEqual(input.secondary.resource?.toString(), sideBySideResourceInput.secondary.resource.toString());
        const untypedSideBySideInput = input.toUntyped();
        assert.strictEqual(untypedSideBySideInput.primary.resource?.toString(), sideBySideResourceInput.primary.resource.toString());
        assert.strictEqual(untypedSideBySideInput.secondary.resource?.toString(), sideBySideResourceInput.secondary.resource.toString());
    });
    test('createTextEditor- caching', function () {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const service = disposables.add(instantiationService.createInstance(TextEditorService));
        // Cached Input (Files)
        const fileResource1 = toResource.call(this, '/foo/bar/cache1.js');
        const fileEditorInput1 = disposables.add(service.createTextEditor({ resource: fileResource1 }));
        assert.ok(fileEditorInput1);
        const fileResource2 = toResource.call(this, '/foo/bar/cache2.js');
        const fileEditorInput2 = disposables.add(service.createTextEditor({ resource: fileResource2 }));
        assert.ok(fileEditorInput2);
        assert.notStrictEqual(fileEditorInput1, fileEditorInput2);
        const fileEditorInput1Again = disposables.add(service.createTextEditor({ resource: fileResource1 }));
        assert.strictEqual(fileEditorInput1Again, fileEditorInput1);
        fileEditorInput1Again.dispose();
        assert.ok(fileEditorInput1.isDisposed());
        const fileEditorInput1AgainAndAgain = disposables.add(service.createTextEditor({ resource: fileResource1 }));
        assert.notStrictEqual(fileEditorInput1AgainAndAgain, fileEditorInput1);
        assert.ok(!fileEditorInput1AgainAndAgain.isDisposed());
        // Cached Input (Resource)
        const resource1 = URI.from({ scheme: 'custom', path: '/foo/bar/cache1.js' });
        const input1 = disposables.add(service.createTextEditor({ resource: resource1 }));
        assert.ok(input1);
        const resource2 = URI.from({ scheme: 'custom', path: '/foo/bar/cache2.js' });
        const input2 = disposables.add(service.createTextEditor({ resource: resource2 }));
        assert.ok(input2);
        assert.notStrictEqual(input1, input2);
        const input1Again = disposables.add(service.createTextEditor({ resource: resource1 }));
        assert.strictEqual(input1Again, input1);
        input1Again.dispose();
        assert.ok(input1.isDisposed());
        const input1AgainAndAgain = disposables.add(service.createTextEditor({ resource: resource1 }));
        assert.notStrictEqual(input1AgainAndAgain, input1);
        assert.ok(!input1AgainAndAgain.isDisposed());
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvclNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL3Rlc3QvYnJvd3Nlci90ZXh0RWRpdG9yU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUdOLHlCQUF5QixFQUN6QiwrQkFBK0IsRUFDL0IsNkJBQTZCLEdBQzdCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixrQkFBa0IsRUFDbEIsbUJBQW1CLEVBQ25CLDBCQUEwQixFQUMxQiw0QkFBNEIsR0FDNUIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQzlGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzdGLE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFckYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDNUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxD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
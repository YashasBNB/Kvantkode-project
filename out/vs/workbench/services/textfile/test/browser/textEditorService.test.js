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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvclNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS90ZXN0L2Jyb3dzZXIvdGV4dEVkaXRvclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFHTix5QkFBeUIsRUFDekIsK0JBQStCLEVBQy9CLDZCQUE2QixHQUM3QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0Isa0JBQWtCLEVBQ2xCLG1CQUFtQixFQUNuQiwwQkFBMEIsRUFDMUIsNEJBQTRCLEdBQzVCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM3RixPQUFPLEVBQ04sdUNBQXVDLEVBQ3ZDLFVBQVUsR0FDVixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXJGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzVHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtB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QUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRXZDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVyQixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBRTlCLE1BQU0sbUJBQW1CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlGLE1BQU0sQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7SUFDN0MsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=
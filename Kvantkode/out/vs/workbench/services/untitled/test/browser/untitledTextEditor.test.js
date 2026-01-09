/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { join } from '../../../../../base/common/path.js';
import { workbenchInstantiationService, TestServiceAccessor, } from '../../../../test/browser/workbenchTestServices.js';
import { snapshotToString } from '../../../textfile/common/textfiles.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { UntitledTextEditorInput } from '../../common/untitledTextEditorInput.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isReadable, isReadableStream } from '../../../../../base/common/stream.js';
import { readableToBuffer, streamToBuffer, } from '../../../../../base/common/buffer.js';
import { LanguageDetectionLanguageEventSource } from '../../../languageDetection/common/languageDetectionWorkerService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { timeout } from '../../../../../base/common/async.js';
suite('Untitled text editors', () => {
    class TestUntitledTextEditorInput extends UntitledTextEditorInput {
        getModel() {
            return this.model;
        }
    }
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.untitledTextEditorService);
    });
    teardown(() => {
        disposables.clear();
    });
    test('basics', async () => {
        const service = accessor.untitledTextEditorService;
        const workingCopyService = accessor.workingCopyService;
        const events = [];
        disposables.add(service.onDidCreate((model) => {
            events.push(model);
        }));
        const input1 = instantiationService.createInstance(TestUntitledTextEditorInput, service.create());
        await input1.resolve();
        assert.strictEqual(service.get(input1.resource), input1.getModel());
        assert.ok(!accessor.untitledTextEditorService.isUntitledWithAssociatedResource(input1.resource));
        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0].resource.toString(), input1.getModel().resource.toString());
        assert.ok(service.get(input1.resource));
        assert.ok(!service.get(URI.file('testing')));
        assert.ok(input1.hasCapability(4 /* EditorInputCapabilities.Untitled */));
        assert.ok(!input1.hasCapability(2 /* EditorInputCapabilities.Readonly */));
        assert.ok(!input1.isReadonly());
        assert.ok(!input1.hasCapability(8 /* EditorInputCapabilities.Singleton */));
        assert.ok(!input1.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */));
        assert.ok(!input1.hasCapability(512 /* EditorInputCapabilities.Scratchpad */));
        const input2 = instantiationService.createInstance(TestUntitledTextEditorInput, service.create());
        assert.strictEqual(service.get(input2.resource), input2.getModel());
        // toUntyped()
        const untypedInput = input1.toUntyped({ preserveViewState: 0 });
        assert.strictEqual(untypedInput.forceUntitled, true);
        // get()
        assert.strictEqual(service.get(input1.resource), input1.getModel());
        assert.strictEqual(service.get(input2.resource), input2.getModel());
        // revert()
        await input1.revert(0);
        assert.ok(input1.isDisposed());
        assert.ok(!service.get(input1.resource));
        // dirty
        const model = await input2.resolve();
        assert.strictEqual(await service.resolve({ untitledResource: input2.resource }), model);
        assert.ok(service.get(model.resource));
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[1].resource.toString(), input2.resource.toString());
        assert.ok(!input2.isDirty());
        const resourcePromise = awaitDidChangeDirty(accessor.untitledTextEditorService);
        model.textEditorModel?.setValue('foo bar');
        const resource = await resourcePromise;
        assert.strictEqual(resource.toString(), input2.resource.toString());
        assert.ok(input2.isDirty());
        const dirtyUntypedInput = input2.toUntyped({ preserveViewState: 0 });
        assert.strictEqual(dirtyUntypedInput.contents, 'foo bar');
        assert.strictEqual(dirtyUntypedInput.resource, undefined);
        const dirtyUntypedInputWithResource = input2.toUntyped({
            preserveViewState: 0,
            preserveResource: true,
        });
        assert.strictEqual(dirtyUntypedInputWithResource.contents, 'foo bar');
        assert.strictEqual(dirtyUntypedInputWithResource?.resource?.toString(), input2.resource.toString());
        const dirtyUntypedInputWithoutContent = input2.toUntyped();
        assert.strictEqual(dirtyUntypedInputWithoutContent.resource?.toString(), input2.resource.toString());
        assert.strictEqual(dirtyUntypedInputWithoutContent.contents, undefined);
        assert.ok(workingCopyService.isDirty(input2.resource));
        assert.strictEqual(workingCopyService.dirtyCount, 1);
        await input1.revert(0);
        await input2.revert(0);
        assert.ok(!service.get(input1.resource));
        assert.ok(!service.get(input2.resource));
        assert.ok(!input2.isDirty());
        assert.ok(!model.isDirty());
        assert.ok(!workingCopyService.isDirty(input2.resource));
        assert.strictEqual(workingCopyService.dirtyCount, 0);
        await input1.revert(0);
        assert.ok(input1.isDisposed());
        assert.ok(!service.get(input1.resource));
        input2.dispose();
        assert.ok(!service.get(input2.resource));
    });
    function awaitDidChangeDirty(service) {
        return new Promise((resolve) => {
            const listener = service.onDidChangeDirty(async (model) => {
                listener.dispose();
                resolve(model.resource);
            });
        });
    }
    test('associated resource is dirty', async () => {
        const service = accessor.untitledTextEditorService;
        const file = URI.file(join('C:\\', '/foo/file.txt'));
        let onDidChangeDirtyModel = undefined;
        disposables.add(service.onDidChangeDirty((model) => {
            onDidChangeDirtyModel = model;
        }));
        const model = disposables.add(service.create({ associatedResource: file }));
        assert.ok(accessor.untitledTextEditorService.isUntitledWithAssociatedResource(model.resource));
        const untitled = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, model));
        assert.ok(untitled.isDirty());
        assert.strictEqual(model, onDidChangeDirtyModel);
        const resolvedModel = await untitled.resolve();
        assert.ok(resolvedModel.hasAssociatedFilePath);
        assert.strictEqual(untitled.isDirty(), true);
    });
    test('no longer dirty when content gets empty (not with associated resource)', async () => {
        const service = accessor.untitledTextEditorService;
        const workingCopyService = accessor.workingCopyService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        // dirty
        const model = disposables.add(await input.resolve());
        model.textEditorModel?.setValue('foo bar');
        assert.ok(model.isDirty());
        assert.ok(workingCopyService.isDirty(model.resource, model.typeId));
        model.textEditorModel?.setValue('');
        assert.ok(!model.isDirty());
        assert.ok(!workingCopyService.isDirty(model.resource, model.typeId));
    });
    test('via create options', async () => {
        const service = accessor.untitledTextEditorService;
        const input1 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        const model1 = disposables.add(await input1.resolve());
        model1.textEditorModel.setValue('foo bar');
        assert.ok(model1.isDirty());
        model1.textEditorModel.setValue('');
        assert.ok(!model1.isDirty());
        const input2 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ initialValue: 'Hello World' })));
        const model2 = disposables.add(await input2.resolve());
        assert.strictEqual(snapshotToString(model2.createSnapshot()), 'Hello World');
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, disposables.add(service.create())));
        const input3 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ untitledResource: input.resource })));
        const model3 = disposables.add(await input3.resolve());
        assert.strictEqual(model3.resource.toString(), input.resource.toString());
        const file = URI.file(join('C:\\', '/foo/file44.txt'));
        const input4 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ associatedResource: file })));
        const model4 = disposables.add(await input4.resolve());
        assert.ok(model4.hasAssociatedFilePath);
        assert.ok(model4.isDirty());
    });
    test('associated path remains dirty when content gets empty', async () => {
        const service = accessor.untitledTextEditorService;
        const file = URI.file(join('C:\\', '/foo/file.txt'));
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ associatedResource: file })));
        // dirty
        const model = disposables.add(await input.resolve());
        model.textEditorModel?.setValue('foo bar');
        assert.ok(model.isDirty());
        model.textEditorModel?.setValue('');
        assert.ok(model.isDirty());
    });
    test('initial content is dirty', async () => {
        const service = accessor.untitledTextEditorService;
        const workingCopyService = accessor.workingCopyService;
        const untitled = disposables.add(instantiationService.createInstance(TestUntitledTextEditorInput, service.create({ initialValue: 'Hello World' })));
        assert.ok(untitled.isDirty());
        const backup = (await untitled.getModel().backup(CancellationToken.None)).content;
        if (isReadableStream(backup)) {
            const value = await streamToBuffer(backup);
            assert.strictEqual(value.toString(), 'Hello World');
        }
        else if (isReadable(backup)) {
            const value = readableToBuffer(backup);
            assert.strictEqual(value.toString(), 'Hello World');
        }
        else {
            assert.fail('Missing untitled backup');
        }
        // dirty
        const model = disposables.add(await untitled.resolve());
        assert.ok(model.isDirty());
        assert.strictEqual(workingCopyService.dirtyCount, 1);
    });
    test('created with files.defaultLanguage setting', () => {
        const defaultLanguage = 'javascript';
        const config = accessor.testConfigurationService;
        config.setUserConfiguration('files', { defaultLanguage: defaultLanguage });
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(service.create());
        assert.strictEqual(input.getLanguageId(), defaultLanguage);
        config.setUserConfiguration('files', { defaultLanguage: undefined });
    });
    test('created with files.defaultLanguage setting (${activeEditorLanguage})', async () => {
        const config = accessor.testConfigurationService;
        config.setUserConfiguration('files', { defaultLanguage: '${activeEditorLanguage}' });
        accessor.editorService.activeTextEditorLanguageId = 'typescript';
        const service = accessor.untitledTextEditorService;
        const model = disposables.add(service.create());
        assert.strictEqual(model.getLanguageId(), 'typescript');
        config.setUserConfiguration('files', { defaultLanguage: undefined });
        accessor.editorService.activeTextEditorLanguageId = undefined;
    });
    test('created with language overrides files.defaultLanguage setting', () => {
        const language = 'typescript';
        const defaultLanguage = 'javascript';
        const config = accessor.testConfigurationService;
        config.setUserConfiguration('files', { defaultLanguage: defaultLanguage });
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(service.create({ languageId: language }));
        assert.strictEqual(input.getLanguageId(), language);
        config.setUserConfiguration('files', { defaultLanguage: undefined });
    });
    test('can change language afterwards', async () => {
        const languageId = 'untitled-input-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: languageId,
        }));
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ languageId: languageId })));
        assert.strictEqual(input.getLanguageId(), languageId);
        const model = disposables.add(await input.resolve());
        assert.strictEqual(model.getLanguageId(), languageId);
        input.setLanguageId(PLAINTEXT_LANGUAGE_ID);
        assert.strictEqual(input.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
    });
    test('remembers that language was set explicitly', async () => {
        const language = 'untitled-input-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: language,
        }));
        const service = accessor.untitledTextEditorService;
        const model = disposables.add(service.create());
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, model));
        assert.ok(!input.hasLanguageSetExplicitly);
        input.setLanguageId(PLAINTEXT_LANGUAGE_ID);
        assert.ok(input.hasLanguageSetExplicitly);
        assert.strictEqual(input.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
    });
    // Issue #159202
    test('remembers that language was set explicitly if set by another source (i.e. ModelService)', async () => {
        const language = 'untitled-input-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: language,
        }));
        const service = accessor.untitledTextEditorService;
        const model = disposables.add(service.create());
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, model));
        disposables.add(await input.resolve());
        assert.ok(!input.hasLanguageSetExplicitly);
        model.textEditorModel.setLanguage(accessor.languageService.createById(language));
        assert.ok(input.hasLanguageSetExplicitly);
        assert.strictEqual(model.getLanguageId(), language);
    });
    test('Language is not set explicitly if set by language detection source', async () => {
        const language = 'untitled-input-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: language,
        }));
        const service = accessor.untitledTextEditorService;
        const model = disposables.add(service.create());
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, model));
        await input.resolve();
        assert.ok(!input.hasLanguageSetExplicitly);
        model.textEditorModel.setLanguage(accessor.languageService.createById(language), 
        // This is really what this is testing
        LanguageDetectionLanguageEventSource);
        assert.ok(!input.hasLanguageSetExplicitly);
        assert.strictEqual(model.getLanguageId(), language);
    });
    test('service#onDidChangeEncoding', async () => {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        disposables.add(service.onDidChangeEncoding((model) => {
            counter++;
            assert.strictEqual(model.resource.toString(), input.resource.toString());
        }));
        // encoding
        const model = disposables.add(await input.resolve());
        await model.setEncoding('utf16');
        assert.strictEqual(counter, 1);
    });
    test('service#onDidChangeLabel', async () => {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        disposables.add(service.onDidChangeLabel((model) => {
            counter++;
            assert.strictEqual(model.resource.toString(), input.resource.toString());
        }));
        // label
        const model = disposables.add(await input.resolve());
        model.textEditorModel?.setValue('Foo Bar');
        assert.strictEqual(counter, 1);
    });
    test('service#onWillDispose', async () => {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        disposables.add(service.onWillDispose((model) => {
            counter++;
            assert.strictEqual(model.resource.toString(), input.resource.toString());
        }));
        const model = disposables.add(await input.resolve());
        assert.strictEqual(counter, 0);
        model.dispose();
        assert.strictEqual(counter, 1);
    });
    test('service#getValue', async () => {
        const service = accessor.untitledTextEditorService;
        const input1 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        const model1 = disposables.add(await input1.resolve());
        model1.textEditorModel.setValue('foo bar');
        assert.strictEqual(service.getValue(model1.resource), 'foo bar');
        model1.dispose();
        // When a model doesn't exist, it should return undefined
        assert.strictEqual(service.getValue(URI.parse('https://www.microsoft.com')), undefined);
    });
    test('model#onDidChangeContent', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        const model = disposables.add(await input.resolve());
        disposables.add(model.onDidChangeContent(() => counter++));
        model.textEditorModel?.setValue('foo');
        assert.strictEqual(counter, 1, 'Dirty model should trigger event');
        model.textEditorModel?.setValue('bar');
        assert.strictEqual(counter, 2, 'Content change when dirty should trigger event');
        model.textEditorModel?.setValue('');
        assert.strictEqual(counter, 3, 'Manual revert should trigger event');
        model.textEditorModel?.setValue('foo');
        assert.strictEqual(counter, 4, 'Dirty model should trigger event');
    });
    test('model#onDidRevert and input disposed when reverted', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        const model = disposables.add(await input.resolve());
        disposables.add(model.onDidRevert(() => counter++));
        model.textEditorModel?.setValue('foo');
        await model.revert();
        assert.ok(input.isDisposed());
        assert.ok(counter === 1);
    });
    test('model#onDidChangeName and input name', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        let model = disposables.add(await input.resolve());
        disposables.add(model.onDidChangeName(() => counter++));
        model.textEditorModel?.setValue('foo');
        assert.strictEqual(input.getName(), 'foo');
        assert.strictEqual(model.name, 'foo');
        assert.strictEqual(counter, 1);
        model.textEditorModel?.setValue('bar');
        assert.strictEqual(input.getName(), 'bar');
        assert.strictEqual(model.name, 'bar');
        assert.strictEqual(counter, 2);
        model.textEditorModel?.setValue('');
        assert.strictEqual(input.getName(), 'Untitled-1');
        assert.strictEqual(model.name, 'Untitled-1');
        model.textEditorModel?.setValue('        ');
        assert.strictEqual(input.getName(), 'Untitled-1');
        assert.strictEqual(model.name, 'Untitled-1');
        model.textEditorModel?.setValue('([]}'); // require actual words
        assert.strictEqual(input.getName(), 'Untitled-1');
        assert.strictEqual(model.name, 'Untitled-1');
        model.textEditorModel?.setValue('([]}hello   '); // require actual words
        assert.strictEqual(input.getName(), '([]}hello');
        assert.strictEqual(model.name, '([]}hello');
        model.textEditorModel?.setValue('12345678901234567890123456789012345678901234567890'); // trimmed at 40chars max
        assert.strictEqual(input.getName(), '1234567890123456789012345678901234567890');
        assert.strictEqual(model.name, '1234567890123456789012345678901234567890');
        model.textEditorModel?.setValue('123456789012345678901234567890123456789🌞'); // do not break grapehems (#111235)
        assert.strictEqual(input.getName(), '123456789012345678901234567890123456789');
        assert.strictEqual(model.name, '123456789012345678901234567890123456789');
        model.textEditorModel?.setValue('hello\u202Eworld'); // do not allow RTL in names (#190133)
        assert.strictEqual(input.getName(), 'helloworld');
        assert.strictEqual(model.name, 'helloworld');
        assert.strictEqual(counter, 7);
        model.textEditorModel?.setValue('Hello\nWorld');
        assert.strictEqual(counter, 8);
        function createSingleEditOp(text, positionLineNumber, positionColumn, selectionLineNumber = positionLineNumber, selectionColumn = positionColumn) {
            const range = new Range(selectionLineNumber, selectionColumn, positionLineNumber, positionColumn);
            return {
                range,
                text,
                forceMoveMarkers: false,
            };
        }
        model.textEditorModel?.applyEdits([createSingleEditOp('hello', 2, 2)]);
        assert.strictEqual(counter, 8); // change was not on first line
        input.dispose();
        model.dispose();
        const inputWithContents = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ initialValue: 'Foo' })));
        model = disposables.add(await inputWithContents.resolve());
        assert.strictEqual(inputWithContents.getName(), 'Foo');
    });
    test('model#onDidChangeDirty', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        const model = disposables.add(await input.resolve());
        disposables.add(model.onDidChangeDirty(() => counter++));
        model.textEditorModel?.setValue('foo');
        assert.strictEqual(counter, 1, 'Dirty model should trigger event');
        model.textEditorModel?.setValue('bar');
        assert.strictEqual(counter, 1, 'Another change does not fire event');
    });
    test('model#onDidChangeEncoding', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        const model = disposables.add(await input.resolve());
        disposables.add(model.onDidChangeEncoding(() => counter++));
        await model.setEncoding('utf16');
        assert.strictEqual(counter, 1, 'Dirty model should trigger event');
        await model.setEncoding('utf16');
        assert.strictEqual(counter, 1, 'Another change to same encoding does not fire event');
    });
    test('canDispose with dirty model', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        const model = disposables.add(await input.resolve());
        model.textEditorModel?.setValue('foo');
        const canDisposePromise = service.canDispose(model);
        assert.ok(canDisposePromise instanceof Promise);
        let canDispose = false;
        (async () => {
            canDispose = await canDisposePromise;
        })();
        assert.strictEqual(canDispose, false);
        model.revert({ soft: true });
        await timeout(0);
        assert.strictEqual(canDispose, true);
        const canDispose2 = service.canDispose(model);
        assert.strictEqual(canDispose2, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91bnRpdGxlZC90ZXN0L2Jyb3dzZXIvdW50aXRsZWRUZXh0RWRpdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFNekQsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixtQkFBbUIsR0FDbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUUvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFLakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRixPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGNBQWMsR0FHZCxNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzFILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FB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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdW50aXRsZWQvdGVzdC9icm93c2VyL3VudGl0bGVkVGV4dEVkaXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBTXpELE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsbUJBQW1CLEdBQ25CLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBS2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixjQUFjLEdBR2QsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUMxSCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFF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
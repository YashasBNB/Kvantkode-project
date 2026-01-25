/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TextFileEditorModel } from '../../common/textFileEditorModel.js';
import { snapshotToString, isTextFileEditorModel, } from '../../common/textfiles.js';
import { createFileEditorInput, workbenchInstantiationService, TestServiceAccessor, TestReadonlyTextFileEditorModel, getLastResolvedFileStat, } from '../../../../test/browser/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { FileOperationError, NotModifiedSinceFileOperationError, } from '../../../../../platform/files/common/files.js';
import { DeferredPromise, timeout } from '../../../../../base/common/async.js';
import { assertIsDefined } from '../../../../../base/common/types.js';
import { createTextBufferFactory } from '../../../../../editor/common/model/textModel.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { SaveSourceRegistry } from '../../../../common/editor.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { UTF16be } from '../../common/encoding.js';
import { isWeb } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
suite('Files - TextFileEditorModel', () => {
    function getLastModifiedTime(model) {
        const stat = getLastResolvedFileStat(model);
        return stat ? stat.mtime : -1;
    }
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let content;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        content = accessor.fileService.getContent();
        disposables.add(accessor.textFileService.files);
        disposables.add(toDisposable(() => accessor.fileService.setContent(content)));
    });
    teardown(async () => {
        for (const textFileEditorModel of accessor.textFileService.files.models) {
            textFileEditorModel.dispose();
        }
        disposables.clear();
    });
    test('basic events', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        accessor.workingCopyService.testUnregisterWorkingCopy(model); // causes issues with subsequent resolves otherwise
        let onDidResolveCounter = 0;
        disposables.add(model.onDidResolve(() => onDidResolveCounter++));
        await model.resolve();
        assert.strictEqual(onDidResolveCounter, 1);
        let onDidChangeContentCounter = 0;
        disposables.add(model.onDidChangeContent(() => onDidChangeContentCounter++));
        let onDidChangeDirtyCounter = 0;
        disposables.add(model.onDidChangeDirty(() => onDidChangeDirtyCounter++));
        model.updateTextEditorModel(createTextBufferFactory('bar'));
        assert.strictEqual(onDidChangeContentCounter, 1);
        assert.strictEqual(onDidChangeDirtyCounter, 1);
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.strictEqual(onDidChangeContentCounter, 2);
        assert.strictEqual(onDidChangeDirtyCounter, 1);
        await model.revert();
        assert.strictEqual(onDidChangeDirtyCounter, 2);
    });
    test('isTextFileEditorModel', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        assert.strictEqual(isTextFileEditorModel(model), true);
        model.dispose();
    });
    test('save', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 0);
        let savedEvent = undefined;
        disposables.add(model.onDidSave((e) => (savedEvent = e)));
        await model.save();
        assert.ok(!savedEvent);
        model.updateTextEditorModel(createTextBufferFactory('bar'));
        assert.ok(getLastModifiedTime(model) <= Date.now());
        assert.ok(model.hasState(1 /* TextFileEditorModelState.DIRTY */));
        assert.ok(model.isModified());
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty((e) => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        const source = SaveSourceRegistry.registerSource('testSource', 'Hello Save');
        const pendingSave = model.save({ reason: 2 /* SaveReason.AUTO */, source });
        assert.ok(model.hasState(2 /* TextFileEditorModelState.PENDING_SAVE */));
        await Promise.all([pendingSave, model.joinState(2 /* TextFileEditorModelState.PENDING_SAVE */)]);
        assert.ok(model.hasState(0 /* TextFileEditorModelState.SAVED */));
        assert.ok(!model.isDirty());
        assert.ok(!model.isModified());
        assert.ok(savedEvent);
        assert.ok(savedEvent.stat);
        assert.strictEqual(savedEvent.reason, 2 /* SaveReason.AUTO */);
        assert.strictEqual(savedEvent.source, source);
        assert.ok(workingCopyEvent);
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 0);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), false);
        savedEvent = undefined;
        await model.save({ force: true });
        assert.ok(savedEvent);
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('save - touching also emits saved event', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        let savedEvent = false;
        disposables.add(model.onDidSave(() => (savedEvent = true)));
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty((e) => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        await model.save({ force: true });
        assert.ok(savedEvent);
        assert.ok(!workingCopyEvent);
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('save - touching with error turns model dirty', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        let saveErrorEvent = false;
        disposables.add(model.onDidSaveError(() => (saveErrorEvent = true)));
        let savedEvent = false;
        disposables.add(model.onDidSave(() => (savedEvent = true)));
        accessor.fileService.writeShouldThrowError = new Error('failed to write');
        try {
            await model.save({ force: true });
            assert.ok(model.hasState(5 /* TextFileEditorModelState.ERROR */));
            assert.ok(model.isDirty());
            assert.ok(model.isModified());
            assert.ok(saveErrorEvent);
            assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
            assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        await model.save({ force: true });
        assert.ok(savedEvent);
        assert.strictEqual(model.isDirty(), false);
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('save - returns false when save fails', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        accessor.fileService.writeShouldThrowError = new Error('failed to write');
        try {
            const res = await model.save({ force: true });
            assert.strictEqual(res, false);
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        const res = await model.save({ force: true });
        assert.strictEqual(res, true);
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('save error (generic)', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('bar'));
        let saveErrorEvent = false;
        disposables.add(model.onDidSaveError(() => (saveErrorEvent = true)));
        accessor.fileService.writeShouldThrowError = new Error('failed to write');
        try {
            const pendingSave = model.save();
            assert.ok(model.hasState(2 /* TextFileEditorModelState.PENDING_SAVE */));
            await pendingSave;
            assert.ok(model.hasState(5 /* TextFileEditorModelState.ERROR */));
            assert.ok(model.isDirty());
            assert.ok(model.isModified());
            assert.ok(saveErrorEvent);
            assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
            assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
            model.dispose();
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
    });
    test('save error (conflict)', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('bar'));
        let saveErrorEvent = false;
        disposables.add(model.onDidSaveError(() => (saveErrorEvent = true)));
        accessor.fileService.writeShouldThrowError = new FileOperationError('save conflict', 3 /* FileOperationResult.FILE_MODIFIED_SINCE */);
        try {
            const pendingSave = model.save();
            assert.ok(model.hasState(2 /* TextFileEditorModelState.PENDING_SAVE */));
            await pendingSave;
            assert.ok(model.hasState(3 /* TextFileEditorModelState.CONFLICT */));
            assert.ok(model.isDirty());
            assert.ok(model.isModified());
            assert.ok(saveErrorEvent);
            assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
            assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
            model.dispose();
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
    });
    test('setEncoding - encode', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        let encodingEvent = false;
        disposables.add(model.onDidChangeEncoding(() => (encodingEvent = true)));
        await model.setEncoding('utf8', 0 /* EncodingMode.Encode */); // no-op
        assert.strictEqual(getLastModifiedTime(model), -1);
        assert.ok(!encodingEvent);
        await model.setEncoding('utf16', 0 /* EncodingMode.Encode */);
        assert.ok(encodingEvent);
        assert.ok(getLastModifiedTime(model) <= Date.now()); // indicates model was saved due to encoding change
    });
    test('setEncoding - decode', async function () {
        let model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        accessor.workingCopyService.testUnregisterWorkingCopy(model); // causes issues with subsequent resolves otherwise
        await model.setEncoding('utf16', 1 /* EncodingMode.Decode */);
        // we have to get the model again from working copy service
        // because `setEncoding` will resolve it again through the
        // text file service which is outside our scope
        model = accessor.workingCopyService.get(model);
        assert.ok(model.isResolved()); // model got resolved due to decoding
    });
    test('setEncoding - decode dirty file saves first', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        accessor.workingCopyService.testUnregisterWorkingCopy(model); // causes issues with subsequent resolves otherwise
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('bar'));
        assert.strictEqual(model.isDirty(), true);
        await model.setEncoding('utf16', 1 /* EncodingMode.Decode */);
        assert.strictEqual(model.isDirty(), false);
    });
    test('encoding updates with language based configuration', async function () {
        const languageId = 'text-file-model-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: languageId,
        }));
        accessor.testConfigurationService.setOverrideIdentifiers('files.encoding', [languageId]);
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        accessor.workingCopyService.testUnregisterWorkingCopy(model); // causes issues with subsequent resolves otherwise
        await model.resolve();
        const deferredPromise = new DeferredPromise();
        // We use this listener as a way to figure out that the working
        // copy was resolved again as part of the language change
        disposables.add(accessor.workingCopyService.onDidRegister((e) => {
            if (isEqual(e.resource, model.resource)) {
                deferredPromise.complete(model);
            }
        }));
        accessor.testConfigurationService.setUserConfiguration('files.encoding', UTF16be);
        model.setLanguageId(languageId);
        await deferredPromise.p; // this asserts that the model was reloaded due to the language change
    });
    test('create with language', async function () {
        const languageId = 'text-file-model-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: languageId,
        }));
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', languageId);
        await model.resolve();
        assert.strictEqual(model.textEditorModel.getLanguageId(), languageId);
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('disposes when underlying model is destroyed', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        model.textEditorModel.dispose();
        assert.ok(model.isDisposed());
    });
    test('Resolve does not trigger save', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index.txt'), 'utf8', undefined);
        assert.ok(model.hasState(0 /* TextFileEditorModelState.SAVED */));
        disposables.add(model.onDidSave(() => assert.fail()));
        disposables.add(model.onDidChangeDirty(() => assert.fail()));
        await model.resolve();
        assert.ok(model.isResolved());
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('Resolve returns dirty model as long as model is dirty', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(model.isDirty());
        assert.ok(model.hasState(1 /* TextFileEditorModelState.DIRTY */));
        await model.resolve();
        assert.ok(model.isDirty());
    });
    test('Resolve with contents', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve({ contents: createTextBufferFactory('Hello World') });
        assert.strictEqual(model.textEditorModel?.getValue(), 'Hello World');
        assert.strictEqual(model.isDirty(), true);
        await model.resolve({ contents: createTextBufferFactory('Hello Changes') });
        assert.strictEqual(model.textEditorModel?.getValue(), 'Hello Changes');
        assert.strictEqual(model.isDirty(), true);
        // verify that we do not mark the model as saved when undoing once because
        // we never really had a saved state
        await model.textEditorModel.undo();
        assert.ok(model.isDirty());
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('Revert', async function () {
        let eventCounter = 0;
        let model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(model.onDidRevert(() => eventCounter++));
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty((e) => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(model.isDirty());
        assert.ok(model.isModified());
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
        accessor.workingCopyService.testUnregisterWorkingCopy(model); // causes issues with subsequent resolves otherwise
        await model.revert();
        // we have to get the model again from working copy service
        // because `setEncoding` will resolve it again through the
        // text file service which is outside our scope
        model = accessor.workingCopyService.get(model);
        assert.strictEqual(model.isDirty(), false);
        assert.strictEqual(model.isModified(), false);
        assert.strictEqual(eventCounter, 1);
        assert.ok(workingCopyEvent);
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 0);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), false);
    });
    test('Revert (soft)', async function () {
        let eventCounter = 0;
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(model.onDidRevert(() => eventCounter++));
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty((e) => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(model.isDirty());
        assert.ok(model.isModified());
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
        await model.revert({ soft: true });
        assert.strictEqual(model.isDirty(), false);
        assert.strictEqual(model.isModified(), false);
        assert.strictEqual(model.textEditorModel.getValue(), 'foo');
        assert.strictEqual(eventCounter, 1);
        assert.ok(workingCopyEvent);
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 0);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), false);
    });
    test('Undo to saved state turns model non-dirty', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('Hello Text'));
        assert.ok(model.isDirty());
        await model.textEditorModel.undo();
        assert.ok(!model.isDirty());
    });
    test('Resolve and undo turns model dirty', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        accessor.fileService.setContent('Hello Change');
        await model.resolve();
        await model.textEditorModel.undo();
        assert.ok(model.isDirty());
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
    });
    test('Update Dirty', async function () {
        let eventCounter = 0;
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        model.setDirty(true);
        assert.ok(!model.isDirty()); // needs to be resolved
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(model.isDirty());
        await model.revert({ soft: true });
        assert.strictEqual(model.isDirty(), false);
        disposables.add(model.onDidChangeDirty(() => eventCounter++));
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty((e) => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        model.setDirty(true);
        assert.ok(model.isDirty());
        assert.strictEqual(eventCounter, 1);
        assert.ok(workingCopyEvent);
        model.setDirty(false);
        assert.strictEqual(model.isDirty(), false);
        assert.strictEqual(eventCounter, 2);
    });
    test('No Dirty or saving for readonly models', async function () {
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty((e) => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        const model = disposables.add(instantiationService.createInstance(TestReadonlyTextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        let saveEvent = false;
        disposables.add(model.onDidSave(() => {
            saveEvent = true;
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(!model.isDirty());
        await model.save({ force: true });
        assert.strictEqual(saveEvent, false);
        await model.revert({ soft: true });
        assert.ok(!model.isDirty());
        assert.ok(!workingCopyEvent);
    });
    test('File not modified error is handled gracefully', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        const mtime = getLastModifiedTime(model);
        accessor.textFileService.setReadStreamErrorOnce(new FileOperationError('error', 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */));
        await model.resolve();
        assert.ok(model);
        assert.strictEqual(getLastModifiedTime(model), mtime);
    });
    test('stat.readonly and stat.locked can change when decreased mtime is ignored', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        const stat = assertIsDefined(getLastResolvedFileStat(model));
        accessor.textFileService.setReadStreamErrorOnce(new NotModifiedSinceFileOperationError('error', {
            ...stat,
            mtime: stat.mtime - 1,
            readonly: !stat.readonly,
            locked: !stat.locked,
        }));
        await model.resolve();
        assert.ok(model);
        assert.strictEqual(getLastModifiedTime(model), stat.mtime, 'mtime should not decrease');
        assert.notStrictEqual(getLastResolvedFileStat(model)?.readonly, stat.readonly, 'readonly should have changed despite simultaneous attempt to decrease mtime');
        assert.notStrictEqual(getLastResolvedFileStat(model)?.locked, stat.locked, 'locked should have changed despite simultaneous attempt to decrease mtime');
    });
    test('Resolve error is handled gracefully if model already exists', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        accessor.textFileService.setReadStreamErrorOnce(new FileOperationError('error', 1 /* FileOperationResult.FILE_NOT_FOUND */));
        await model.resolve();
        assert.ok(model);
    });
    test('save() and isDirty() - proper with check for mtimes', async function () {
        const input1 = disposables.add(createFileEditorInput(instantiationService, toResource.call(this, '/path/index_async2.txt')));
        const input2 = disposables.add(createFileEditorInput(instantiationService, toResource.call(this, '/path/index_async.txt')));
        const model1 = disposables.add((await input1.resolve()));
        const model2 = disposables.add((await input2.resolve()));
        model1.updateTextEditorModel(createTextBufferFactory('foo'));
        const m1Mtime = assertIsDefined(getLastResolvedFileStat(model1)).mtime;
        const m2Mtime = assertIsDefined(getLastResolvedFileStat(model2)).mtime;
        assert.ok(m1Mtime > 0);
        assert.ok(m2Mtime > 0);
        assert.ok(accessor.textFileService.isDirty(toResource.call(this, '/path/index_async2.txt')));
        assert.ok(!accessor.textFileService.isDirty(toResource.call(this, '/path/index_async.txt')));
        model2.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(accessor.textFileService.isDirty(toResource.call(this, '/path/index_async.txt')));
        await timeout(10);
        await accessor.textFileService.save(toResource.call(this, '/path/index_async.txt'));
        await accessor.textFileService.save(toResource.call(this, '/path/index_async2.txt'));
        assert.ok(!accessor.textFileService.isDirty(toResource.call(this, '/path/index_async.txt')));
        assert.ok(!accessor.textFileService.isDirty(toResource.call(this, '/path/index_async2.txt')));
        if (isWeb) {
            // web tests does not ensure timeouts are respected at all, so we cannot
            // really assert the mtime to be different, only that it is equal or greater.
            // https://github.com/microsoft/vscode/issues/161886
            assert.ok(assertIsDefined(getLastResolvedFileStat(model1)).mtime >= m1Mtime);
            assert.ok(assertIsDefined(getLastResolvedFileStat(model2)).mtime >= m2Mtime);
        }
        else {
            // on desktop we want to assert this condition more strictly though
            assert.ok(assertIsDefined(getLastResolvedFileStat(model1)).mtime > m1Mtime);
            assert.ok(assertIsDefined(getLastResolvedFileStat(model2)).mtime > m2Mtime);
        }
    });
    test('Save Participant', async function () {
        let eventCounter = 0;
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(model.onDidSave(() => {
            assert.strictEqual(snapshotToString(model.createSnapshot()), eventCounter === 1 ? 'bar' : 'foobar');
            assert.ok(!model.isDirty());
            eventCounter++;
        }));
        const participant = accessor.textFileService.files.addSaveParticipant({
            participate: async (model) => {
                assert.ok(model.isDirty());
                model.updateTextEditorModel(createTextBufferFactory('bar'));
                assert.ok(model.isDirty());
                eventCounter++;
            },
        });
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(model.isDirty());
        await model.save();
        assert.strictEqual(eventCounter, 2);
        participant.dispose();
        model.updateTextEditorModel(createTextBufferFactory('foobar'));
        assert.ok(model.isDirty());
        await model.save();
        assert.strictEqual(eventCounter, 3);
    });
    test('Save Participant - skip', async function () {
        let eventCounter = 0;
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: async () => {
                eventCounter++;
            },
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        await model.save({ skipSaveParticipants: true });
        assert.strictEqual(eventCounter, 0);
    });
    test('Save Participant, async participant', async function () {
        let eventCounter = 0;
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(model.onDidSave(() => {
            assert.ok(!model.isDirty());
            eventCounter++;
        }));
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: (model) => {
                assert.ok(model.isDirty());
                model.updateTextEditorModel(createTextBufferFactory('bar'));
                assert.ok(model.isDirty());
                eventCounter++;
                return timeout(10);
            },
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        const now = Date.now();
        await model.save();
        assert.strictEqual(eventCounter, 2);
        assert.ok(Date.now() - now >= 10);
    });
    test('Save Participant, bad participant', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: async () => {
                new Error('boom');
            },
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        await model.save();
    });
    test('Save Participant, participant cancelled when saved again', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        const participations = [];
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: async (model, context, progress, token) => {
                await timeout(10);
                if (!token.isCancellationRequested) {
                    participations.push(true);
                }
            },
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        const p1 = model.save();
        model.updateTextEditorModel(createTextBufferFactory('foo 1'));
        const p2 = model.save();
        model.updateTextEditorModel(createTextBufferFactory('foo 2'));
        const p3 = model.save();
        model.updateTextEditorModel(createTextBufferFactory('foo 3'));
        const p4 = model.save();
        await Promise.all([p1, p2, p3, p4]);
        assert.strictEqual(participations.length, 1);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (sync save, no model change)', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await testSaveFromSaveParticipant(model, false, false, false);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (async save, no model change)', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await testSaveFromSaveParticipant(model, true, false, false);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (sync save, model change)', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await testSaveFromSaveParticipant(model, false, true, false);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (async save, model change)', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await testSaveFromSaveParticipant(model, true, true, false);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (force)', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await testSaveFromSaveParticipant(model, false, false, true);
    });
    async function testSaveFromSaveParticipant(model, async, modelChange, force) {
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: async () => {
                if (async) {
                    await timeout(10);
                }
                if (modelChange) {
                    model.updateTextEditorModel(createTextBufferFactory('bar'));
                    const newSavePromise = model.save(force ? { force } : undefined);
                    // assert that this is not the same promise as the outer one
                    assert.notStrictEqual(savePromise, newSavePromise);
                    await newSavePromise;
                }
                else {
                    const newSavePromise = model.save(force ? { force } : undefined);
                    // assert that this is the same promise as the outer one
                    assert.strictEqual(savePromise, newSavePromise);
                    await savePromise;
                }
            },
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        const savePromise = model.save(force ? { force } : undefined);
        await savePromise;
    }
    test('Save Participant carries context', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        const from = URI.file('testFrom');
        let e = undefined;
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: async (wc, context) => {
                try {
                    assert.strictEqual(context.reason, 1 /* SaveReason.EXPLICIT */);
                    assert.strictEqual(context.savedFrom?.toString(), from.toString());
                }
                catch (error) {
                    e = error;
                }
            },
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        await model.save({ force: true, from });
        if (e) {
            throw e;
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvdGVzdC9icm93c2VyL3RleHRGaWxlRWRpdG9yTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUdOLGdCQUFnQixFQUNoQixxQkFBcUIsR0FFckIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLDZCQUE2QixFQUM3QixtQkFBbUIsRUFDbkIsK0JBQStCLEVBQy9CLHVCQUF1QixHQUN2QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFFakQsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixrQ0FBa0MsR0FDbEMsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBYyxrQkFBa0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0s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
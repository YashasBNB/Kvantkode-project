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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL3Rlc3QvYnJvd3Nlci90ZXh0RmlsZUVkaXRvck1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3pFLE9BQU8sRUFHTixnQkFBZ0IsRUFDaEIscUJBQXFCLEdBRXJCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUNOLHFCQUFxQixFQUNyQiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLCtCQUErQixFQUMvQix1QkFBdUIsR0FDdkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sdUNBQXVDLEVBQ3ZDLFVBQVUsR0FDVixNQUFNLDBDQUEwQyxDQUFBO0FBRWpELE9BQU8sRUFFTixrQkFBa0IsRUFDbEIsa0NBQWtDLEdBQ2xDLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDckUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RixPQUFPLEVBQWMsa0JBQWtCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEw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
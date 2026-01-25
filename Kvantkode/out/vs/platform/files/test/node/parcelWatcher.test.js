/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { realpathSync, promises } from 'fs';
import { tmpdir } from 'os';
import { timeout } from '../../../../base/common/async.js';
import { dirname, join } from '../../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { Promises, RimRafMode } from '../../../../base/node/pfs.js';
import { getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { ParcelWatcher } from '../../node/watcher/parcel/parcelWatcher.js';
import { getDriveLetter } from '../../../../base/common/extpath.js';
import { ltrim } from '../../../../base/common/strings.js';
import { FileAccess } from '../../../../base/common/network.js';
import { extUriBiasedIgnorePathCase } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { addUNCHostToAllowlist } from '../../../../base/node/unc.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export class TestParcelWatcher extends ParcelWatcher {
    constructor() {
        super(...arguments);
        this.suspendedWatchRequestPollingInterval = 100;
        this._onDidWatch = this._register(new Emitter());
        this.onDidWatch = this._onDidWatch.event;
        this.onWatchFail = this._onDidWatchFail.event;
    }
    async testRemoveDuplicateRequests(paths, excludes = []) {
        // Work with strings as paths to simplify testing
        const requests = paths.map((path) => {
            return { path, excludes, recursive: true };
        });
        return (await this.removeDuplicateRequests(requests, false /* validate paths skipped for tests */)).map((request) => request.path);
    }
    getUpdateWatchersDelay() {
        return 0;
    }
    async doWatch(requests) {
        await super.doWatch(requests);
        await this.whenReady();
        this._onDidWatch.fire();
    }
    async whenReady() {
        for (const watcher of this.watchers) {
            await watcher.ready;
        }
    }
}
// this suite has shown flaky runs in Azure pipelines where
// tasks would just hang and timeout after a while (not in
// mocha but generally). as such they will run only on demand
// whenever we update the watcher library.
suite.skip('File Watcher (parcel)', function () {
    this.timeout(10000);
    let testDir;
    let watcher;
    let loggingEnabled = false;
    function enableLogging(enable) {
        loggingEnabled = enable;
        watcher?.setVerboseLogging(enable);
    }
    enableLogging(loggingEnabled);
    setup(async () => {
        watcher = new TestParcelWatcher();
        watcher.setVerboseLogging(loggingEnabled);
        watcher.onDidLogMessage((e) => {
            if (loggingEnabled) {
                console.log(`[recursive watcher test message] ${e.message}`);
            }
        });
        watcher.onDidError((e) => {
            if (loggingEnabled) {
                console.log(`[recursive watcher test error] ${e.error}`);
            }
        });
        // Rule out strange testing conditions by using the realpath
        // here. for example, on macOS the tmp dir is potentially a
        // symlink in some of the root folders, which is a rather
        // unrealisic case for the file watcher.
        testDir = URI.file(getRandomTestPath(realpathSync(tmpdir()), 'vsctests', 'filewatcher')).fsPath;
        const sourceDir = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/service').fsPath;
        await Promises.copy(sourceDir, testDir, { preserveSymlinks: false });
    });
    teardown(async () => {
        const watchers = Array.from(watcher.watchers).length;
        let stoppedInstances = 0;
        for (const instance of watcher.watchers) {
            Event.once(instance.onDidStop)(() => {
                if (instance.stopped) {
                    stoppedInstances++;
                }
            });
        }
        await watcher.stop();
        assert.strictEqual(stoppedInstances, watchers, 'All watchers must be stopped before the test ends');
        watcher.dispose();
        // Possible that the file watcher is still holding
        // onto the folders on Windows specifically and the
        // unlink would fail. In that case, do not fail the
        // test suite.
        return Promises.rm(testDir).catch((error) => console.error(error));
    });
    function toMsg(type) {
        switch (type) {
            case 1 /* FileChangeType.ADDED */:
                return 'added';
            case 2 /* FileChangeType.DELETED */:
                return 'deleted';
            default:
                return 'changed';
        }
    }
    async function awaitEvent(watcher, path, type, failOnEventReason, correlationId, expectedCount) {
        if (loggingEnabled) {
            console.log(`Awaiting change type '${toMsg(type)}' on file '${path}'`);
        }
        // Await the event
        const res = await new Promise((resolve, reject) => {
            let counter = 0;
            const disposable = watcher.onDidChangeFile((events) => {
                for (const event of events) {
                    if (extUriBiasedIgnorePathCase.isEqual(event.resource, URI.file(path)) &&
                        event.type === type &&
                        (correlationId === null || event.cId === correlationId)) {
                        counter++;
                        if (typeof expectedCount === 'number' && counter < expectedCount) {
                            continue; // not yet
                        }
                        disposable.dispose();
                        if (failOnEventReason) {
                            reject(new Error(`Unexpected file event: ${failOnEventReason}`));
                        }
                        else {
                            setImmediate(() => resolve(events)); // copied from parcel watcher tests, seems to drop unrelated events on macOS
                        }
                        break;
                    }
                }
            });
        });
        // Unwind from the event call stack: we have seen crashes in Parcel
        // when e.g. calling `unsubscribe` directly from the stack of a file
        // change event
        // Refs: https://github.com/microsoft/vscode/issues/137430
        await timeout(1);
        return res;
    }
    function awaitMessage(watcher, type) {
        if (loggingEnabled) {
            console.log(`Awaiting message of type ${type}`);
        }
        // Await the message
        return new Promise((resolve) => {
            const disposable = watcher.onDidLogMessage((msg) => {
                if (msg.type === type) {
                    disposable.dispose();
                    resolve();
                }
            });
        });
    }
    test('basics', async function () {
        const request = { path: testDir, excludes: [], recursive: true };
        await watcher.watch([request]);
        const instance = Array.from(watcher.watchers)[0];
        assert.strictEqual(request, instance.request);
        assert.strictEqual(instance.failed, false);
        assert.strictEqual(instance.stopped, false);
        const disposables = new DisposableStore();
        const subscriptions1 = new Map();
        const subscriptions2 = new Map();
        // New file
        const newFilePath = join(testDir, 'deep', 'newFile.txt');
        disposables.add(instance.subscribe(newFilePath, (change) => subscriptions1.set(change.resource.fsPath, change.type)));
        disposables.add(instance.subscribe(newFilePath, (change) => subscriptions2.set(change.resource.fsPath, change.type))); // can subscribe multiple times
        assert.strictEqual(instance.include(newFilePath), true);
        assert.strictEqual(instance.exclude(newFilePath), false);
        let changeFuture = awaitEvent(watcher, newFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newFilePath, 'Hello World');
        await changeFuture;
        assert.strictEqual(subscriptions1.get(newFilePath), 1 /* FileChangeType.ADDED */);
        assert.strictEqual(subscriptions2.get(newFilePath), 1 /* FileChangeType.ADDED */);
        // New folder
        const newFolderPath = join(testDir, 'deep', 'New Folder');
        disposables.add(instance.subscribe(newFolderPath, (change) => subscriptions1.set(change.resource.fsPath, change.type)));
        const disposable = instance.subscribe(newFolderPath, (change) => subscriptions2.set(change.resource.fsPath, change.type));
        disposable.dispose();
        assert.strictEqual(instance.include(newFolderPath), true);
        assert.strictEqual(instance.exclude(newFolderPath), false);
        changeFuture = awaitEvent(watcher, newFolderPath, 1 /* FileChangeType.ADDED */);
        await promises.mkdir(newFolderPath);
        await changeFuture;
        assert.strictEqual(subscriptions1.get(newFolderPath), 1 /* FileChangeType.ADDED */);
        assert.strictEqual(subscriptions2.has(newFolderPath), false /* subscription was disposed before the event */);
        // Rename file
        let renamedFilePath = join(testDir, 'deep', 'renamedFile.txt');
        disposables.add(instance.subscribe(renamedFilePath, (change) => subscriptions1.set(change.resource.fsPath, change.type)));
        changeFuture = Promise.all([
            awaitEvent(watcher, newFilePath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, renamedFilePath, 1 /* FileChangeType.ADDED */),
        ]);
        await Promises.rename(newFilePath, renamedFilePath);
        await changeFuture;
        assert.strictEqual(subscriptions1.get(newFilePath), 2 /* FileChangeType.DELETED */);
        assert.strictEqual(subscriptions1.get(renamedFilePath), 1 /* FileChangeType.ADDED */);
        // Rename folder
        let renamedFolderPath = join(testDir, 'deep', 'Renamed Folder');
        disposables.add(instance.subscribe(renamedFolderPath, (change) => subscriptions1.set(change.resource.fsPath, change.type)));
        changeFuture = Promise.all([
            awaitEvent(watcher, newFolderPath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, renamedFolderPath, 1 /* FileChangeType.ADDED */),
        ]);
        await Promises.rename(newFolderPath, renamedFolderPath);
        await changeFuture;
        assert.strictEqual(subscriptions1.get(newFolderPath), 2 /* FileChangeType.DELETED */);
        assert.strictEqual(subscriptions1.get(renamedFolderPath), 1 /* FileChangeType.ADDED */);
        // Rename file (same name, different case)
        const caseRenamedFilePath = join(testDir, 'deep', 'RenamedFile.txt');
        changeFuture = Promise.all([
            awaitEvent(watcher, renamedFilePath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, caseRenamedFilePath, 1 /* FileChangeType.ADDED */),
        ]);
        await Promises.rename(renamedFilePath, caseRenamedFilePath);
        await changeFuture;
        renamedFilePath = caseRenamedFilePath;
        // Rename folder (same name, different case)
        const caseRenamedFolderPath = join(testDir, 'deep', 'REnamed Folder');
        changeFuture = Promise.all([
            awaitEvent(watcher, renamedFolderPath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, caseRenamedFolderPath, 1 /* FileChangeType.ADDED */),
        ]);
        await Promises.rename(renamedFolderPath, caseRenamedFolderPath);
        await changeFuture;
        renamedFolderPath = caseRenamedFolderPath;
        // Move file
        const movedFilepath = join(testDir, 'movedFile.txt');
        changeFuture = Promise.all([
            awaitEvent(watcher, renamedFilePath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, movedFilepath, 1 /* FileChangeType.ADDED */),
        ]);
        await Promises.rename(renamedFilePath, movedFilepath);
        await changeFuture;
        // Move folder
        const movedFolderpath = join(testDir, 'Moved Folder');
        changeFuture = Promise.all([
            awaitEvent(watcher, renamedFolderPath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, movedFolderpath, 1 /* FileChangeType.ADDED */),
        ]);
        await Promises.rename(renamedFolderPath, movedFolderpath);
        await changeFuture;
        // Copy file
        const copiedFilepath = join(testDir, 'deep', 'copiedFile.txt');
        changeFuture = awaitEvent(watcher, copiedFilepath, 1 /* FileChangeType.ADDED */);
        await promises.copyFile(movedFilepath, copiedFilepath);
        await changeFuture;
        // Copy folder
        const copiedFolderpath = join(testDir, 'deep', 'Copied Folder');
        changeFuture = awaitEvent(watcher, copiedFolderpath, 1 /* FileChangeType.ADDED */);
        await Promises.copy(movedFolderpath, copiedFolderpath, { preserveSymlinks: false });
        await changeFuture;
        // Change file
        changeFuture = awaitEvent(watcher, copiedFilepath, 0 /* FileChangeType.UPDATED */);
        await Promises.writeFile(copiedFilepath, 'Hello Change');
        await changeFuture;
        // Create new file
        const anotherNewFilePath = join(testDir, 'deep', 'anotherNewFile.txt');
        changeFuture = awaitEvent(watcher, anotherNewFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(anotherNewFilePath, 'Hello Another World');
        await changeFuture;
        // Read file does not emit event
        changeFuture = awaitEvent(watcher, anotherNewFilePath, 0 /* FileChangeType.UPDATED */, 'unexpected-event-from-read-file');
        await promises.readFile(anotherNewFilePath);
        await Promise.race([timeout(100), changeFuture]);
        // Stat file does not emit event
        changeFuture = awaitEvent(watcher, anotherNewFilePath, 0 /* FileChangeType.UPDATED */, 'unexpected-event-from-stat');
        await promises.stat(anotherNewFilePath);
        await Promise.race([timeout(100), changeFuture]);
        // Stat folder does not emit event
        changeFuture = awaitEvent(watcher, copiedFolderpath, 0 /* FileChangeType.UPDATED */, 'unexpected-event-from-stat');
        await promises.stat(copiedFolderpath);
        await Promise.race([timeout(100), changeFuture]);
        // Delete file
        changeFuture = awaitEvent(watcher, copiedFilepath, 2 /* FileChangeType.DELETED */);
        disposables.add(instance.subscribe(copiedFilepath, (change) => subscriptions1.set(change.resource.fsPath, change.type)));
        await promises.unlink(copiedFilepath);
        await changeFuture;
        assert.strictEqual(subscriptions1.get(copiedFilepath), 2 /* FileChangeType.DELETED */);
        // Delete folder
        changeFuture = awaitEvent(watcher, copiedFolderpath, 2 /* FileChangeType.DELETED */);
        disposables.add(instance.subscribe(copiedFolderpath, (change) => subscriptions1.set(change.resource.fsPath, change.type)));
        await promises.rmdir(copiedFolderpath);
        await changeFuture;
        assert.strictEqual(subscriptions1.get(copiedFolderpath), 2 /* FileChangeType.DELETED */);
        disposables.dispose();
    });
    (isMacintosh /* this test seems not possible with fsevents backend */ ? test.skip : test)('basics (atomic writes)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], recursive: true }]);
        // Delete + Recreate file
        const newFilePath = join(testDir, 'deep', 'conway.js');
        const changeFuture = awaitEvent(watcher, newFilePath, 0 /* FileChangeType.UPDATED */);
        await promises.unlink(newFilePath);
        Promises.writeFile(newFilePath, 'Hello Atomic World');
        await changeFuture;
    });
    (!isLinux /* polling is only used in linux environments (WSL) */ ? test.skip : test)('basics (polling)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], pollingInterval: 100, recursive: true }]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    async function basicCrudTest(filePath, correlationId, expectedCount) {
        // New file
        let changeFuture = awaitEvent(watcher, filePath, 1 /* FileChangeType.ADDED */, undefined, correlationId, expectedCount);
        await Promises.writeFile(filePath, 'Hello World');
        await changeFuture;
        // Change file
        changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */, undefined, correlationId, expectedCount);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, undefined, correlationId, expectedCount);
        await promises.unlink(filePath);
        await changeFuture;
    }
    test('multiple events', async function () {
        await watcher.watch([{ path: testDir, excludes: [], recursive: true }]);
        await promises.mkdir(join(testDir, 'deep-multiple'));
        // multiple add
        const newFilePath1 = join(testDir, 'newFile-1.txt');
        const newFilePath2 = join(testDir, 'newFile-2.txt');
        const newFilePath3 = join(testDir, 'newFile-3.txt');
        const newFilePath4 = join(testDir, 'deep-multiple', 'newFile-1.txt');
        const newFilePath5 = join(testDir, 'deep-multiple', 'newFile-2.txt');
        const newFilePath6 = join(testDir, 'deep-multiple', 'newFile-3.txt');
        const addedFuture1 = awaitEvent(watcher, newFilePath1, 1 /* FileChangeType.ADDED */);
        const addedFuture2 = awaitEvent(watcher, newFilePath2, 1 /* FileChangeType.ADDED */);
        const addedFuture3 = awaitEvent(watcher, newFilePath3, 1 /* FileChangeType.ADDED */);
        const addedFuture4 = awaitEvent(watcher, newFilePath4, 1 /* FileChangeType.ADDED */);
        const addedFuture5 = awaitEvent(watcher, newFilePath5, 1 /* FileChangeType.ADDED */);
        const addedFuture6 = awaitEvent(watcher, newFilePath6, 1 /* FileChangeType.ADDED */);
        await Promise.all([
            await Promises.writeFile(newFilePath1, 'Hello World 1'),
            await Promises.writeFile(newFilePath2, 'Hello World 2'),
            await Promises.writeFile(newFilePath3, 'Hello World 3'),
            await Promises.writeFile(newFilePath4, 'Hello World 4'),
            await Promises.writeFile(newFilePath5, 'Hello World 5'),
            await Promises.writeFile(newFilePath6, 'Hello World 6'),
        ]);
        await Promise.all([
            addedFuture1,
            addedFuture2,
            addedFuture3,
            addedFuture4,
            addedFuture5,
            addedFuture6,
        ]);
        // multiple change
        const changeFuture1 = awaitEvent(watcher, newFilePath1, 0 /* FileChangeType.UPDATED */);
        const changeFuture2 = awaitEvent(watcher, newFilePath2, 0 /* FileChangeType.UPDATED */);
        const changeFuture3 = awaitEvent(watcher, newFilePath3, 0 /* FileChangeType.UPDATED */);
        const changeFuture4 = awaitEvent(watcher, newFilePath4, 0 /* FileChangeType.UPDATED */);
        const changeFuture5 = awaitEvent(watcher, newFilePath5, 0 /* FileChangeType.UPDATED */);
        const changeFuture6 = awaitEvent(watcher, newFilePath6, 0 /* FileChangeType.UPDATED */);
        await Promise.all([
            await Promises.writeFile(newFilePath1, 'Hello Update 1'),
            await Promises.writeFile(newFilePath2, 'Hello Update 2'),
            await Promises.writeFile(newFilePath3, 'Hello Update 3'),
            await Promises.writeFile(newFilePath4, 'Hello Update 4'),
            await Promises.writeFile(newFilePath5, 'Hello Update 5'),
            await Promises.writeFile(newFilePath6, 'Hello Update 6'),
        ]);
        await Promise.all([
            changeFuture1,
            changeFuture2,
            changeFuture3,
            changeFuture4,
            changeFuture5,
            changeFuture6,
        ]);
        // copy with multiple files
        const copyFuture1 = awaitEvent(watcher, join(testDir, 'deep-multiple-copy', 'newFile-1.txt'), 1 /* FileChangeType.ADDED */);
        const copyFuture2 = awaitEvent(watcher, join(testDir, 'deep-multiple-copy', 'newFile-2.txt'), 1 /* FileChangeType.ADDED */);
        const copyFuture3 = awaitEvent(watcher, join(testDir, 'deep-multiple-copy', 'newFile-3.txt'), 1 /* FileChangeType.ADDED */);
        const copyFuture4 = awaitEvent(watcher, join(testDir, 'deep-multiple-copy'), 1 /* FileChangeType.ADDED */);
        await Promises.copy(join(testDir, 'deep-multiple'), join(testDir, 'deep-multiple-copy'), {
            preserveSymlinks: false,
        });
        await Promise.all([copyFuture1, copyFuture2, copyFuture3, copyFuture4]);
        // multiple delete (single files)
        const deleteFuture1 = awaitEvent(watcher, newFilePath1, 2 /* FileChangeType.DELETED */);
        const deleteFuture2 = awaitEvent(watcher, newFilePath2, 2 /* FileChangeType.DELETED */);
        const deleteFuture3 = awaitEvent(watcher, newFilePath3, 2 /* FileChangeType.DELETED */);
        const deleteFuture4 = awaitEvent(watcher, newFilePath4, 2 /* FileChangeType.DELETED */);
        const deleteFuture5 = awaitEvent(watcher, newFilePath5, 2 /* FileChangeType.DELETED */);
        const deleteFuture6 = awaitEvent(watcher, newFilePath6, 2 /* FileChangeType.DELETED */);
        await Promise.all([
            await promises.unlink(newFilePath1),
            await promises.unlink(newFilePath2),
            await promises.unlink(newFilePath3),
            await promises.unlink(newFilePath4),
            await promises.unlink(newFilePath5),
            await promises.unlink(newFilePath6),
        ]);
        await Promise.all([
            deleteFuture1,
            deleteFuture2,
            deleteFuture3,
            deleteFuture4,
            deleteFuture5,
            deleteFuture6,
        ]);
        // multiple delete (folder)
        const deleteFolderFuture1 = awaitEvent(watcher, join(testDir, 'deep-multiple'), 2 /* FileChangeType.DELETED */);
        const deleteFolderFuture2 = awaitEvent(watcher, join(testDir, 'deep-multiple-copy'), 2 /* FileChangeType.DELETED */);
        await Promise.all([
            Promises.rm(join(testDir, 'deep-multiple'), RimRafMode.UNLINK),
            Promises.rm(join(testDir, 'deep-multiple-copy'), RimRafMode.UNLINK),
        ]);
        await Promise.all([deleteFolderFuture1, deleteFolderFuture2]);
    });
    test('subsequent watch updates watchers (path)', async function () {
        await watcher.watch([
            { path: testDir, excludes: [join(realpathSync(testDir), 'unrelated')], recursive: true },
        ]);
        // New file (*.txt)
        let newTextFilePath = join(testDir, 'deep', 'newFile.txt');
        let changeFuture = awaitEvent(watcher, newTextFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newTextFilePath, 'Hello World');
        await changeFuture;
        await watcher.watch([
            {
                path: join(testDir, 'deep'),
                excludes: [join(realpathSync(testDir), 'unrelated')],
                recursive: true,
            },
        ]);
        newTextFilePath = join(testDir, 'deep', 'newFile2.txt');
        changeFuture = awaitEvent(watcher, newTextFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newTextFilePath, 'Hello World');
        await changeFuture;
        await watcher.watch([
            { path: join(testDir, 'deep'), excludes: [realpathSync(testDir)], recursive: true },
        ]);
        await watcher.watch([{ path: join(testDir, 'deep'), excludes: [], recursive: true }]);
        newTextFilePath = join(testDir, 'deep', 'newFile3.txt');
        changeFuture = awaitEvent(watcher, newTextFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newTextFilePath, 'Hello World');
        await changeFuture;
    });
    test('invalid path does not crash watcher', async function () {
        await watcher.watch([
            { path: testDir, excludes: [], recursive: true },
            { path: join(testDir, 'invalid-folder'), excludes: [], recursive: true },
            { path: FileAccess.asFileUri('').fsPath, excludes: [], recursive: true },
        ]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('subsequent watch updates watchers (excludes)', async function () {
        await watcher.watch([{ path: testDir, excludes: [realpathSync(testDir)], recursive: true }]);
        await watcher.watch([{ path: testDir, excludes: [], recursive: true }]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('subsequent watch updates watchers (includes)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], includes: ['nothing'], recursive: true }]);
        await watcher.watch([{ path: testDir, excludes: [], recursive: true }]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('includes are supported', async function () {
        await watcher.watch([
            { path: testDir, excludes: [], includes: ['**/deep/**'], recursive: true },
        ]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('includes are supported (relative pattern explicit)', async function () {
        await watcher.watch([
            {
                path: testDir,
                excludes: [],
                includes: [{ base: testDir, pattern: 'deep/newFile.txt' }],
                recursive: true,
            },
        ]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('includes are supported (relative pattern implicit)', async function () {
        await watcher.watch([
            { path: testDir, excludes: [], includes: ['deep/newFile.txt'], recursive: true },
        ]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('excludes are supported (path)', async function () {
        return testExcludes([join(realpathSync(testDir), 'deep')]);
    });
    test('excludes are supported (glob)', function () {
        return testExcludes(['deep/**']);
    });
    async function testExcludes(excludes) {
        await watcher.watch([{ path: testDir, excludes, recursive: true }]);
        // New file (*.txt)
        const newTextFilePath = join(testDir, 'deep', 'newFile.txt');
        const changeFuture = awaitEvent(watcher, newTextFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newTextFilePath, 'Hello World');
        const res = await Promise.any([timeout(500).then(() => true), changeFuture.then(() => false)]);
        if (!res) {
            assert.fail('Unexpected change event');
        }
    }
    ;
    (isWindows /* windows: cannot create file symbolic link without elevated context */
        ? test.skip
        : test)('symlink support (root)', async function () {
        const link = join(testDir, 'deep-linked');
        const linkTarget = join(testDir, 'deep');
        await promises.symlink(linkTarget, link);
        await watcher.watch([{ path: link, excludes: [], recursive: true }]);
        return basicCrudTest(join(link, 'newFile.txt'));
    });
    (isWindows /* windows: cannot create file symbolic link without elevated context */
        ? test.skip
        : test)('symlink support (via extra watch)', async function () {
        const link = join(testDir, 'deep-linked');
        const linkTarget = join(testDir, 'deep');
        await promises.symlink(linkTarget, link);
        await watcher.watch([
            { path: testDir, excludes: [], recursive: true },
            { path: link, excludes: [], recursive: true },
        ]);
        return basicCrudTest(join(link, 'newFile.txt'));
    });
    (!isWindows /* UNC is windows only */ ? test.skip : test)('unc support', async function () {
        addUNCHostToAllowlist('localhost');
        // Local UNC paths are in the form of: \\localhost\c$\my_dir
        const uncPath = `\\\\localhost\\${getDriveLetter(testDir)?.toLowerCase()}$\\${ltrim(testDir.substr(testDir.indexOf(':') + 1), '\\')}`;
        await watcher.watch([{ path: uncPath, excludes: [], recursive: true }]);
        return basicCrudTest(join(uncPath, 'deep', 'newFile.txt'));
    });
    (isLinux /* linux: is case sensitive */ ? test.skip : test)('wrong casing', async function () {
        const deepWrongCasedPath = join(testDir, 'DEEP');
        await watcher.watch([{ path: deepWrongCasedPath, excludes: [], recursive: true }]);
        return basicCrudTest(join(deepWrongCasedPath, 'newFile.txt'));
    });
    test('invalid folder does not explode', async function () {
        const invalidPath = join(testDir, 'invalid');
        await watcher.watch([{ path: invalidPath, excludes: [], recursive: true }]);
    });
    (isWindows /* flaky on windows */ ? test.skip : test)('deleting watched path without correlation restarts watching', async function () {
        const watchedPath = join(testDir, 'deep');
        await watcher.watch([{ path: watchedPath, excludes: [], recursive: true }]);
        // Delete watched path and await
        const warnFuture = awaitMessage(watcher, 'warn');
        await Promises.rm(watchedPath, RimRafMode.UNLINK);
        await warnFuture;
        // Restore watched path
        await timeout(1500); // node.js watcher used for monitoring folder restore is async
        await promises.mkdir(watchedPath);
        await timeout(1500); // restart is delayed
        await watcher.whenReady();
        // Verify events come in again
        const newFilePath = join(watchedPath, 'newFile.txt');
        const changeFuture = awaitEvent(watcher, newFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newFilePath, 'Hello World');
        await changeFuture;
    });
    test('correlationId is supported', async function () {
        const correlationId = Math.random();
        await watcher.watch([{ correlationId, path: testDir, excludes: [], recursive: true }]);
        return basicCrudTest(join(testDir, 'newFile.txt'), correlationId);
    });
    test('should not exclude roots that do not overlap', async () => {
        if (isWindows) {
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a']), ['C:\\a']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a', 'C:\\b']), [
                'C:\\a',
                'C:\\b',
            ]);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a', 'C:\\b', 'C:\\c\\d\\e']), ['C:\\a', 'C:\\b', 'C:\\c\\d\\e']);
        }
        else {
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a']), ['/a']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a', '/b']), ['/a', '/b']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a', '/b', '/c/d/e']), [
                '/a',
                '/b',
                '/c/d/e',
            ]);
        }
    });
    test('should remove sub-folders of other paths', async () => {
        if (isWindows) {
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a', 'C:\\a\\b']), [
                'C:\\a',
            ]);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a', 'C:\\b', 'C:\\a\\b']), ['C:\\a', 'C:\\b']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\b\\a', 'C:\\a', 'C:\\b', 'C:\\a\\b']), ['C:\\a', 'C:\\b']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a', 'C:\\a\\b', 'C:\\a\\c\\d']), ['C:\\a']);
        }
        else {
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a', '/a/b']), ['/a']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a', '/b', '/a/b']), [
                '/a',
                '/b',
            ]);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/b/a', '/a', '/b', '/a/b']), ['/a', '/b']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a', '/a/b', '/a/c/d']), [
                '/a',
            ]);
        }
    });
    test('should ignore when everything excluded', async () => {
        assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/foo/bar', '/bar'], ['**', 'something']), []);
    });
    test('watching same or overlapping paths supported when correlation is applied', async () => {
        await watcher.watch([{ path: testDir, excludes: [], recursive: true, correlationId: 1 }]);
        await basicCrudTest(join(testDir, 'newFile.txt'), null, 1);
        // same path, same options
        await watcher.watch([
            { path: testDir, excludes: [], recursive: true, correlationId: 1 },
            { path: testDir, excludes: [], recursive: true, correlationId: 2 },
            { path: testDir, excludes: [], recursive: true, correlationId: undefined },
        ]);
        await basicCrudTest(join(testDir, 'newFile.txt'), null, 3);
        await basicCrudTest(join(testDir, 'otherNewFile.txt'), null, 3);
        // same path, different options
        await watcher.watch([
            { path: testDir, excludes: [], recursive: true, correlationId: 1 },
            { path: testDir, excludes: [], recursive: true, correlationId: 2 },
            { path: testDir, excludes: [], recursive: true, correlationId: undefined },
            {
                path: testDir,
                excludes: [join(realpathSync(testDir), 'deep')],
                recursive: true,
                correlationId: 3,
            },
            {
                path: testDir,
                excludes: [join(realpathSync(testDir), 'other')],
                recursive: true,
                correlationId: 4,
            },
        ]);
        await basicCrudTest(join(testDir, 'newFile.txt'), null, 5);
        await basicCrudTest(join(testDir, 'otherNewFile.txt'), null, 5);
        // overlapping paths (same options)
        await watcher.watch([
            { path: dirname(testDir), excludes: [], recursive: true, correlationId: 1 },
            { path: testDir, excludes: [], recursive: true, correlationId: 2 },
            { path: join(testDir, 'deep'), excludes: [], recursive: true, correlationId: 3 },
        ]);
        await basicCrudTest(join(testDir, 'deep', 'newFile.txt'), null, 3);
        await basicCrudTest(join(testDir, 'deep', 'otherNewFile.txt'), null, 3);
        // overlapping paths (different options)
        await watcher.watch([
            { path: dirname(testDir), excludes: [], recursive: true, correlationId: 1 },
            {
                path: testDir,
                excludes: [join(realpathSync(testDir), 'some')],
                recursive: true,
                correlationId: 2,
            },
            {
                path: join(testDir, 'deep'),
                excludes: [join(realpathSync(testDir), 'other')],
                recursive: true,
                correlationId: 3,
            },
        ]);
        await basicCrudTest(join(testDir, 'deep', 'newFile.txt'), null, 3);
        await basicCrudTest(join(testDir, 'deep', 'otherNewFile.txt'), null, 3);
    });
    test('watching missing path emits watcher fail event', async function () {
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const folderPath = join(testDir, 'missing');
        watcher.watch([{ path: folderPath, excludes: [], recursive: true }]);
        await onDidWatchFail;
    });
    test('deleting watched path emits watcher fail and delete event if correlated', async function () {
        const folderPath = join(testDir, 'deep');
        await watcher.watch([{ path: folderPath, excludes: [], recursive: true, correlationId: 1 }]);
        let failed = false;
        const instance = Array.from(watcher.watchers)[0];
        assert.strictEqual(instance.include(folderPath), true);
        instance.onDidFail(() => (failed = true));
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const changeFuture = awaitEvent(watcher, folderPath, 2 /* FileChangeType.DELETED */, undefined, 1);
        Promises.rm(folderPath, RimRafMode.UNLINK);
        await onDidWatchFail;
        await changeFuture;
        assert.strictEqual(failed, true);
        assert.strictEqual(instance.failed, true);
    });
    (!isMacintosh /* Linux/Windows: times out for some reason */ ? test.skip : test)('watch requests support suspend/resume (folder, does not exist in beginning, not reusing watcher)', async () => {
        await testWatchFolderDoesNotExist(false);
    });
    test('watch requests support suspend/resume (folder, does not exist in beginning, reusing watcher)', async () => {
        await testWatchFolderDoesNotExist(true);
    });
    async function testWatchFolderDoesNotExist(reuseExistingWatcher) {
        let onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const folderPath = join(testDir, 'not-found');
        const requests = [];
        if (reuseExistingWatcher) {
            requests.push({ path: testDir, excludes: [], recursive: true });
            await watcher.watch(requests);
        }
        const request = { path: folderPath, excludes: [], recursive: true };
        requests.push(request);
        await watcher.watch(requests);
        await onDidWatchFail;
        if (reuseExistingWatcher) {
            assert.strictEqual(watcher.isSuspended(request), true);
        }
        else {
            assert.strictEqual(watcher.isSuspended(request), 'polling');
        }
        let changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
        let onDidWatch = Event.toPromise(watcher.onDidWatch);
        await promises.mkdir(folderPath);
        await changeFuture;
        await onDidWatch;
        assert.strictEqual(watcher.isSuspended(request), false);
        const filePath = join(folderPath, 'newFile.txt');
        await basicCrudTest(filePath);
        if (!reuseExistingWatcher) {
            onDidWatchFail = Event.toPromise(watcher.onWatchFail);
            await Promises.rm(folderPath);
            await onDidWatchFail;
            changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
            onDidWatch = Event.toPromise(watcher.onDidWatch);
            await promises.mkdir(folderPath);
            await changeFuture;
            await onDidWatch;
            await basicCrudTest(filePath);
        }
    }
    ;
    (!isMacintosh /* Linux/Windows: times out for some reason */ ? test.skip : test)('watch requests support suspend/resume (folder, exist in beginning, not reusing watcher)', async () => {
        await testWatchFolderExists(false);
    });
    test('watch requests support suspend/resume (folder, exist in beginning, reusing watcher)', async () => {
        await testWatchFolderExists(true);
    });
    async function testWatchFolderExists(reuseExistingWatcher) {
        const folderPath = join(testDir, 'deep');
        const requests = [{ path: folderPath, excludes: [], recursive: true }];
        if (reuseExistingWatcher) {
            requests.push({ path: testDir, excludes: [], recursive: true });
        }
        await watcher.watch(requests);
        const filePath = join(folderPath, 'newFile.txt');
        await basicCrudTest(filePath);
        if (!reuseExistingWatcher) {
            const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
            await Promises.rm(folderPath);
            await onDidWatchFail;
            const changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
            const onDidWatch = Event.toPromise(watcher.onDidWatch);
            await promises.mkdir(folderPath);
            await changeFuture;
            await onDidWatch;
            await basicCrudTest(filePath);
        }
    }
    test('watch request reuses another recursive watcher even when requests are coming in at the same time', async function () {
        const folderPath1 = join(testDir, 'deep', 'not-existing1');
        const folderPath2 = join(testDir, 'deep', 'not-existing2');
        const folderPath3 = join(testDir, 'not-existing3');
        const requests = [
            { path: folderPath1, excludes: [], recursive: true, correlationId: 1 },
            { path: folderPath2, excludes: [], recursive: true, correlationId: 2 },
            { path: folderPath3, excludes: [], recursive: true, correlationId: 3 },
            { path: join(testDir, 'deep'), excludes: [], recursive: true },
        ];
        await watcher.watch(requests);
        assert.strictEqual(watcher.isSuspended(requests[0]), true);
        assert.strictEqual(watcher.isSuspended(requests[1]), true);
        assert.strictEqual(watcher.isSuspended(requests[2]), 'polling');
        assert.strictEqual(watcher.isSuspended(requests[3]), false);
    });
    test('event type filter', async function () {
        const request = {
            path: testDir,
            excludes: [],
            recursive: true,
            filter: 4 /* FileChangeFilter.ADDED */ | 8 /* FileChangeFilter.DELETED */,
            correlationId: 1,
        };
        await watcher.watch([request]);
        // Change file
        const filePath = join(testDir, 'lorem-newfile.txt');
        let changeFuture = awaitEvent(watcher, filePath, 1 /* FileChangeType.ADDED */, undefined, 1);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, undefined, 1);
        await promises.unlink(filePath);
        await changeFuture;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyY2VsV2F0Y2hlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy90ZXN0L25vZGUvcGFyY2VsV2F0Y2hlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNw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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyY2VsV2F0Y2hlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvdGVzdC9ub2RlL3BhcmNlbFdhdGNoZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDM0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRTNFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDcEUsT0FB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
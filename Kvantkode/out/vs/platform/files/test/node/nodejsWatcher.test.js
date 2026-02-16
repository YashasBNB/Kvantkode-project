/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import assert from 'assert';
import { tmpdir } from 'os';
import { basename, dirname, join } from '../../../../base/common/path.js';
import { Promises, RimRafMode } from '../../../../base/node/pfs.js';
import { getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { watchFileContents } from '../../node/watcher/nodejs/nodejsWatcherLib.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { getDriveLetter } from '../../../../base/common/extpath.js';
import { ltrim } from '../../../../base/common/strings.js';
import { DeferredPromise, timeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { NodeJSWatcher } from '../../node/watcher/nodejs/nodejsWatcher.js';
import { FileAccess } from '../../../../base/common/network.js';
import { extUriBiasedIgnorePathCase } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { addUNCHostToAllowlist } from '../../../../base/node/unc.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { TestParcelWatcher } from './parcelWatcher.test.js';
// this suite has shown flaky runs in Azure pipelines where
// tasks would just hang and timeout after a while (not in
// mocha but generally). as such they will run only on demand
// whenever we update the watcher library.
suite.skip('File Watcher (node.js)', function () {
    this.timeout(10000);
    class TestNodeJSWatcher extends NodeJSWatcher {
        constructor() {
            super(...arguments);
            this.suspendedWatchRequestPollingInterval = 100;
            this._onDidWatch = this._register(new Emitter());
            this.onDidWatch = this._onDidWatch.event;
            this.onWatchFail = this._onDidWatchFail.event;
        }
        getUpdateWatchersDelay() {
            return 0;
        }
        async doWatch(requests) {
            await super.doWatch(requests);
            for (const watcher of this.watchers) {
                await watcher.instance.ready;
            }
            this._onDidWatch.fire();
        }
    }
    let testDir;
    let watcher;
    let loggingEnabled = false;
    function enableLogging(enable) {
        loggingEnabled = enable;
        watcher?.setVerboseLogging(enable);
    }
    enableLogging(loggingEnabled);
    setup(async () => {
        await createWatcher(undefined);
        // Rule out strange testing conditions by using the realpath
        // here. for example, on macOS the tmp dir is potentially a
        // symlink in some of the root folders, which is a rather
        // unrealisic case for the file watcher.
        testDir = URI.file(getRandomTestPath(fs.realpathSync(tmpdir()), 'vsctests', 'filewatcher')).fsPath;
        const sourceDir = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/service').fsPath;
        await Promises.copy(sourceDir, testDir, { preserveSymlinks: false });
    });
    async function createWatcher(accessor) {
        await watcher?.stop();
        watcher?.dispose();
        watcher = new TestNodeJSWatcher(accessor);
        watcher?.setVerboseLogging(loggingEnabled);
        watcher.onDidLogMessage((e) => {
            if (loggingEnabled) {
                console.log(`[non-recursive watcher test message] ${e.message}`);
            }
        });
        watcher.onDidError((e) => {
            if (loggingEnabled) {
                console.log(`[non-recursive watcher test error] ${e}`);
            }
        });
    }
    teardown(async () => {
        await watcher.stop();
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
    async function awaitEvent(service, path, type, correlationId, expectedCount) {
        if (loggingEnabled) {
            console.log(`Awaiting change type '${toMsg(type)}' on file '${path}'`);
        }
        // Await the event
        await new Promise((resolve) => {
            let counter = 0;
            const disposable = service.onDidChangeFile((events) => {
                for (const event of events) {
                    if (extUriBiasedIgnorePathCase.isEqual(event.resource, URI.file(path)) &&
                        event.type === type &&
                        (correlationId === null || event.cId === correlationId)) {
                        counter++;
                        if (typeof expectedCount === 'number' && counter < expectedCount) {
                            continue; // not yet
                        }
                        disposable.dispose();
                        resolve();
                        break;
                    }
                }
            });
        });
    }
    test('basics (folder watch)', async function () {
        const request = { path: testDir, excludes: [], recursive: false };
        await watcher.watch([request]);
        assert.strictEqual(watcher.isSuspended(request), false);
        const instance = Array.from(watcher.watchers)[0].instance;
        assert.strictEqual(instance.isReusingRecursiveWatcher, false);
        assert.strictEqual(instance.failed, false);
        // New file
        const newFilePath = join(testDir, 'newFile.txt');
        let changeFuture = awaitEvent(watcher, newFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newFilePath, 'Hello World');
        await changeFuture;
        // New folder
        const newFolderPath = join(testDir, 'New Folder');
        changeFuture = awaitEvent(watcher, newFolderPath, 1 /* FileChangeType.ADDED */);
        await fs.promises.mkdir(newFolderPath);
        await changeFuture;
        // Rename file
        let renamedFilePath = join(testDir, 'renamedFile.txt');
        changeFuture = Promise.all([
            awaitEvent(watcher, newFilePath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, renamedFilePath, 1 /* FileChangeType.ADDED */),
        ]);
        await Promises.rename(newFilePath, renamedFilePath);
        await changeFuture;
        // Rename folder
        let renamedFolderPath = join(testDir, 'Renamed Folder');
        changeFuture = Promise.all([
            awaitEvent(watcher, newFolderPath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, renamedFolderPath, 1 /* FileChangeType.ADDED */),
        ]);
        await Promises.rename(newFolderPath, renamedFolderPath);
        await changeFuture;
        // Rename file (same name, different case)
        const caseRenamedFilePath = join(testDir, 'RenamedFile.txt');
        changeFuture = Promise.all([
            awaitEvent(watcher, renamedFilePath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, caseRenamedFilePath, 1 /* FileChangeType.ADDED */),
        ]);
        await Promises.rename(renamedFilePath, caseRenamedFilePath);
        await changeFuture;
        renamedFilePath = caseRenamedFilePath;
        // Rename folder (same name, different case)
        const caseRenamedFolderPath = join(testDir, 'REnamed Folder');
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
        const copiedFilepath = join(testDir, 'copiedFile.txt');
        changeFuture = awaitEvent(watcher, copiedFilepath, 1 /* FileChangeType.ADDED */);
        await fs.promises.copyFile(movedFilepath, copiedFilepath);
        await changeFuture;
        // Copy folder
        const copiedFolderpath = join(testDir, 'Copied Folder');
        changeFuture = awaitEvent(watcher, copiedFolderpath, 1 /* FileChangeType.ADDED */);
        await Promises.copy(movedFolderpath, copiedFolderpath, { preserveSymlinks: false });
        await changeFuture;
        // Change file
        changeFuture = awaitEvent(watcher, copiedFilepath, 0 /* FileChangeType.UPDATED */);
        await Promises.writeFile(copiedFilepath, 'Hello Change');
        await changeFuture;
        // Create new file
        const anotherNewFilePath = join(testDir, 'anotherNewFile.txt');
        changeFuture = awaitEvent(watcher, anotherNewFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(anotherNewFilePath, 'Hello Another World');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, copiedFilepath, 2 /* FileChangeType.DELETED */);
        await fs.promises.unlink(copiedFilepath);
        await changeFuture;
        // Delete folder
        changeFuture = awaitEvent(watcher, copiedFolderpath, 2 /* FileChangeType.DELETED */);
        await fs.promises.rmdir(copiedFolderpath);
        await changeFuture;
        watcher.dispose();
    });
    test('basics (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        const request = { path: filePath, excludes: [], recursive: false };
        await watcher.watch([request]);
        assert.strictEqual(watcher.isSuspended(request), false);
        const instance = Array.from(watcher.watchers)[0].instance;
        assert.strictEqual(instance.isReusingRecursiveWatcher, false);
        assert.strictEqual(instance.failed, false);
        // Change file
        let changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */);
        await fs.promises.unlink(filePath);
        await changeFuture;
        // Recreate watcher
        await Promises.writeFile(filePath, 'Hello Change');
        await watcher.watch([]);
        await watcher.watch([{ path: filePath, excludes: [], recursive: false }]);
        // Move file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */);
        await Promises.rename(filePath, `${filePath}-moved`);
        await changeFuture;
    });
    test('atomic writes (folder watch)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], recursive: false }]);
        // Delete + Recreate file
        const newFilePath = join(testDir, 'lorem.txt');
        const changeFuture = awaitEvent(watcher, newFilePath, 0 /* FileChangeType.UPDATED */);
        await fs.promises.unlink(newFilePath);
        Promises.writeFile(newFilePath, 'Hello Atomic World');
        await changeFuture;
    });
    test('atomic writes (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        await watcher.watch([{ path: filePath, excludes: [], recursive: false }]);
        // Delete + Recreate file
        const newFilePath = join(filePath);
        const changeFuture = awaitEvent(watcher, newFilePath, 0 /* FileChangeType.UPDATED */);
        await fs.promises.unlink(newFilePath);
        Promises.writeFile(newFilePath, 'Hello Atomic World');
        await changeFuture;
    });
    test('multiple events (folder watch)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], recursive: false }]);
        // multiple add
        const newFilePath1 = join(testDir, 'newFile-1.txt');
        const newFilePath2 = join(testDir, 'newFile-2.txt');
        const newFilePath3 = join(testDir, 'newFile-3.txt');
        const addedFuture1 = awaitEvent(watcher, newFilePath1, 1 /* FileChangeType.ADDED */);
        const addedFuture2 = awaitEvent(watcher, newFilePath2, 1 /* FileChangeType.ADDED */);
        const addedFuture3 = awaitEvent(watcher, newFilePath3, 1 /* FileChangeType.ADDED */);
        await Promise.all([
            await Promises.writeFile(newFilePath1, 'Hello World 1'),
            await Promises.writeFile(newFilePath2, 'Hello World 2'),
            await Promises.writeFile(newFilePath3, 'Hello World 3'),
        ]);
        await Promise.all([addedFuture1, addedFuture2, addedFuture3]);
        // multiple change
        const changeFuture1 = awaitEvent(watcher, newFilePath1, 0 /* FileChangeType.UPDATED */);
        const changeFuture2 = awaitEvent(watcher, newFilePath2, 0 /* FileChangeType.UPDATED */);
        const changeFuture3 = awaitEvent(watcher, newFilePath3, 0 /* FileChangeType.UPDATED */);
        await Promise.all([
            await Promises.writeFile(newFilePath1, 'Hello Update 1'),
            await Promises.writeFile(newFilePath2, 'Hello Update 2'),
            await Promises.writeFile(newFilePath3, 'Hello Update 3'),
        ]);
        await Promise.all([changeFuture1, changeFuture2, changeFuture3]);
        // copy with multiple files
        const copyFuture1 = awaitEvent(watcher, join(testDir, 'newFile-1-copy.txt'), 1 /* FileChangeType.ADDED */);
        const copyFuture2 = awaitEvent(watcher, join(testDir, 'newFile-2-copy.txt'), 1 /* FileChangeType.ADDED */);
        const copyFuture3 = awaitEvent(watcher, join(testDir, 'newFile-3-copy.txt'), 1 /* FileChangeType.ADDED */);
        await Promise.all([
            Promises.copy(join(testDir, 'newFile-1.txt'), join(testDir, 'newFile-1-copy.txt'), {
                preserveSymlinks: false,
            }),
            Promises.copy(join(testDir, 'newFile-2.txt'), join(testDir, 'newFile-2-copy.txt'), {
                preserveSymlinks: false,
            }),
            Promises.copy(join(testDir, 'newFile-3.txt'), join(testDir, 'newFile-3-copy.txt'), {
                preserveSymlinks: false,
            }),
        ]);
        await Promise.all([copyFuture1, copyFuture2, copyFuture3]);
        // multiple delete
        const deleteFuture1 = awaitEvent(watcher, newFilePath1, 2 /* FileChangeType.DELETED */);
        const deleteFuture2 = awaitEvent(watcher, newFilePath2, 2 /* FileChangeType.DELETED */);
        const deleteFuture3 = awaitEvent(watcher, newFilePath3, 2 /* FileChangeType.DELETED */);
        await Promise.all([
            await fs.promises.unlink(newFilePath1),
            await fs.promises.unlink(newFilePath2),
            await fs.promises.unlink(newFilePath3),
        ]);
        await Promise.all([deleteFuture1, deleteFuture2, deleteFuture3]);
    });
    test('multiple events (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        await watcher.watch([{ path: filePath, excludes: [], recursive: false }]);
        // multiple change
        const changeFuture1 = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */);
        await Promise.all([
            await Promises.writeFile(filePath, 'Hello Update 1'),
            await Promises.writeFile(filePath, 'Hello Update 2'),
            await Promises.writeFile(filePath, 'Hello Update 3'),
        ]);
        await Promise.all([changeFuture1]);
    });
    test('excludes can be updated (folder watch)', async function () {
        await watcher.watch([{ path: testDir, excludes: ['**'], recursive: false }]);
        await watcher.watch([{ path: testDir, excludes: [], recursive: false }]);
        return basicCrudTest(join(testDir, 'files-excludes.txt'));
    });
    test('excludes are ignored (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        await watcher.watch([{ path: filePath, excludes: ['**'], recursive: false }]);
        return basicCrudTest(filePath, true);
    });
    test('includes can be updated (folder watch)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], includes: ['nothing'], recursive: false }]);
        await watcher.watch([{ path: testDir, excludes: [], recursive: false }]);
        return basicCrudTest(join(testDir, 'files-includes.txt'));
    });
    test('non-includes are ignored (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        await watcher.watch([{ path: filePath, excludes: [], includes: ['nothing'], recursive: false }]);
        return basicCrudTest(filePath, true);
    });
    test('includes are supported (folder watch)', async function () {
        await watcher.watch([
            { path: testDir, excludes: [], includes: ['**/files-includes.txt'], recursive: false },
        ]);
        return basicCrudTest(join(testDir, 'files-includes.txt'));
    });
    test('includes are supported (folder watch, relative pattern explicit)', async function () {
        await watcher.watch([
            {
                path: testDir,
                excludes: [],
                includes: [{ base: testDir, pattern: 'files-includes.txt' }],
                recursive: false,
            },
        ]);
        return basicCrudTest(join(testDir, 'files-includes.txt'));
    });
    test('includes are supported (folder watch, relative pattern implicit)', async function () {
        await watcher.watch([
            { path: testDir, excludes: [], includes: ['files-includes.txt'], recursive: false },
        ]);
        return basicCrudTest(join(testDir, 'files-includes.txt'));
    });
    test('correlationId is supported', async function () {
        const correlationId = Math.random();
        await watcher.watch([{ correlationId, path: testDir, excludes: [], recursive: false }]);
        return basicCrudTest(join(testDir, 'newFile.txt'), undefined, correlationId);
    });
    (isWindows /* windows: cannot create file symbolic link without elevated context */
        ? test.skip
        : test)('symlink support (folder watch)', async function () {
        const link = join(testDir, 'deep-linked');
        const linkTarget = join(testDir, 'deep');
        await fs.promises.symlink(linkTarget, link);
        await watcher.watch([{ path: link, excludes: [], recursive: false }]);
        return basicCrudTest(join(link, 'newFile.txt'));
    });
    async function basicCrudTest(filePath, skipAdd, correlationId, expectedCount, awaitWatchAfterAdd) {
        let changeFuture;
        // New file
        if (!skipAdd) {
            changeFuture = awaitEvent(watcher, filePath, 1 /* FileChangeType.ADDED */, correlationId, expectedCount);
            await Promises.writeFile(filePath, 'Hello World');
            await changeFuture;
            if (awaitWatchAfterAdd) {
                await Event.toPromise(watcher.onDidWatch);
            }
        }
        // Change file
        changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */, correlationId, expectedCount);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, correlationId, expectedCount);
        await fs.promises.unlink(await Promises.realpath(filePath)); // support symlinks
        await changeFuture;
    }
    ;
    (isWindows /* windows: cannot create file symbolic link without elevated context */
        ? test.skip
        : test)('symlink support (file watch)', async function () {
        const link = join(testDir, 'lorem.txt-linked');
        const linkTarget = join(testDir, 'lorem.txt');
        await fs.promises.symlink(linkTarget, link);
        await watcher.watch([{ path: link, excludes: [], recursive: false }]);
        return basicCrudTest(link, true);
    });
    (!isWindows /* UNC is windows only */ ? test.skip : test)('unc support (folder watch)', async function () {
        addUNCHostToAllowlist('localhost');
        // Local UNC paths are in the form of: \\localhost\c$\my_dir
        const uncPath = `\\\\localhost\\${getDriveLetter(testDir)?.toLowerCase()}$\\${ltrim(testDir.substr(testDir.indexOf(':') + 1), '\\')}`;
        await watcher.watch([{ path: uncPath, excludes: [], recursive: false }]);
        return basicCrudTest(join(uncPath, 'newFile.txt'));
    });
    (!isWindows /* UNC is windows only */ ? test.skip : test)('unc support (file watch)', async function () {
        addUNCHostToAllowlist('localhost');
        // Local UNC paths are in the form of: \\localhost\c$\my_dir
        const uncPath = `\\\\localhost\\${getDriveLetter(testDir)?.toLowerCase()}$\\${ltrim(testDir.substr(testDir.indexOf(':') + 1), '\\')}\\lorem.txt`;
        await watcher.watch([{ path: uncPath, excludes: [], recursive: false }]);
        return basicCrudTest(uncPath, true);
    });
    (isLinux /* linux: is case sensitive */ ? test.skip : test)('wrong casing (folder watch)', async function () {
        const wrongCase = join(dirname(testDir), basename(testDir).toUpperCase());
        await watcher.watch([{ path: wrongCase, excludes: [], recursive: false }]);
        return basicCrudTest(join(wrongCase, 'newFile.txt'));
    });
    (isLinux /* linux: is case sensitive */ ? test.skip : test)('wrong casing (file watch)', async function () {
        const filePath = join(testDir, 'LOREM.txt');
        await watcher.watch([{ path: filePath, excludes: [], recursive: false }]);
        return basicCrudTest(filePath, true);
    });
    test('invalid path does not explode', async function () {
        const invalidPath = join(testDir, 'invalid');
        await watcher.watch([{ path: invalidPath, excludes: [], recursive: false }]);
    });
    test('watchFileContents', async function () {
        const watchedPath = join(testDir, 'lorem.txt');
        const cts = new CancellationTokenSource();
        const readyPromise = new DeferredPromise();
        const chunkPromise = new DeferredPromise();
        const watchPromise = watchFileContents(watchedPath, () => chunkPromise.complete(), () => readyPromise.complete(), cts.token);
        await readyPromise.p;
        Promises.writeFile(watchedPath, 'Hello World');
        await chunkPromise.p;
        cts.cancel(); // this will resolve `watchPromise`
        return watchPromise;
    });
    test('watching same or overlapping paths supported when correlation is applied', async function () {
        await watcher.watch([{ path: testDir, excludes: [], recursive: false, correlationId: 1 }]);
        await basicCrudTest(join(testDir, 'newFile_1.txt'), undefined, null, 1);
        await watcher.watch([
            { path: testDir, excludes: [], recursive: false, correlationId: 1 },
            { path: testDir, excludes: [], recursive: false, correlationId: 2 },
            { path: testDir, excludes: [], recursive: false, correlationId: undefined },
        ]);
        await basicCrudTest(join(testDir, 'newFile_2.txt'), undefined, null, 3);
        await basicCrudTest(join(testDir, 'otherNewFile.txt'), undefined, null, 3);
    });
    test('watching missing path emits watcher fail event', async function () {
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const folderPath = join(testDir, 'missing');
        watcher.watch([{ path: folderPath, excludes: [], recursive: true }]);
        await onDidWatchFail;
    });
    test('deleting watched path emits watcher fail and delete event when correlated (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        await watcher.watch([{ path: filePath, excludes: [], recursive: false, correlationId: 1 }]);
        const instance = Array.from(watcher.watchers)[0].instance;
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, 1);
        fs.promises.unlink(filePath);
        await onDidWatchFail;
        await changeFuture;
        assert.strictEqual(instance.failed, true);
    });
    (isMacintosh ||
        isWindows /* macOS: does not seem to report deletes on folders | Windows: reports on('error') event only */
        ? test.skip
        : test)('deleting watched path emits watcher fail and delete event when correlated (folder watch)', async function () {
        const folderPath = join(testDir, 'deep');
        await watcher.watch([{ path: folderPath, excludes: [], recursive: false, correlationId: 1 }]);
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const changeFuture = awaitEvent(watcher, folderPath, 2 /* FileChangeType.DELETED */, 1);
        Promises.rm(folderPath, RimRafMode.UNLINK);
        await onDidWatchFail;
        await changeFuture;
    });
    test('watch requests support suspend/resume (file, does not exist in beginning)', async function () {
        const filePath = join(testDir, 'not-found.txt');
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const request = { path: filePath, excludes: [], recursive: false };
        await watcher.watch([request]);
        await onDidWatchFail;
        assert.strictEqual(watcher.isSuspended(request), 'polling');
        await basicCrudTest(filePath, undefined, null, undefined, true);
        await basicCrudTest(filePath, undefined, null, undefined, true);
    });
    test('watch requests support suspend/resume (file, exists in beginning)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        const request = { path: filePath, excludes: [], recursive: false };
        await watcher.watch([request]);
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        await basicCrudTest(filePath, true);
        await onDidWatchFail;
        assert.strictEqual(watcher.isSuspended(request), 'polling');
        await basicCrudTest(filePath, undefined, null, undefined, true);
    });
    (isWindows /* Windows: does not seem to report this */ ? test.skip : test)('watch requests support suspend/resume (folder, does not exist in beginning)', async function () {
        let onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const folderPath = join(testDir, 'not-found');
        const request = { path: folderPath, excludes: [], recursive: false };
        await watcher.watch([request]);
        await onDidWatchFail;
        assert.strictEqual(watcher.isSuspended(request), 'polling');
        let changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
        let onDidWatch = Event.toPromise(watcher.onDidWatch);
        await fs.promises.mkdir(folderPath);
        await changeFuture;
        await onDidWatch;
        assert.strictEqual(watcher.isSuspended(request), false);
        if (isWindows) {
            // somehow failing on macOS/Linux
            const filePath = join(folderPath, 'newFile.txt');
            await basicCrudTest(filePath);
            onDidWatchFail = Event.toPromise(watcher.onWatchFail);
            await fs.promises.rmdir(folderPath);
            await onDidWatchFail;
            changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
            onDidWatch = Event.toPromise(watcher.onDidWatch);
            await fs.promises.mkdir(folderPath);
            await changeFuture;
            await onDidWatch;
            await timeout(500); // somehow needed on Linux
            await basicCrudTest(filePath);
        }
    });
    (isMacintosh /* macOS: does not seem to report this */ ? test.skip : test)('watch requests support suspend/resume (folder, exists in beginning)', async function () {
        const folderPath = join(testDir, 'deep');
        await watcher.watch([{ path: folderPath, excludes: [], recursive: false }]);
        const filePath = join(folderPath, 'newFile.txt');
        await basicCrudTest(filePath);
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        await Promises.rm(folderPath);
        await onDidWatchFail;
        const changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
        const onDidWatch = Event.toPromise(watcher.onDidWatch);
        await fs.promises.mkdir(folderPath);
        await changeFuture;
        await onDidWatch;
        await timeout(500); // somehow needed on Linux
        await basicCrudTest(filePath);
    });
    test('parcel watcher reused when present for non-recursive file watching (uncorrelated)', function () {
        return testParcelWatcherReused(undefined);
    });
    test('parcel watcher reused when present for non-recursive file watching (correlated)', function () {
        return testParcelWatcherReused(2);
    });
    function createParcelWatcher() {
        const recursiveWatcher = new TestParcelWatcher();
        recursiveWatcher.setVerboseLogging(loggingEnabled);
        recursiveWatcher.onDidLogMessage((e) => {
            if (loggingEnabled) {
                console.log(`[recursive watcher test message] ${e.message}`);
            }
        });
        recursiveWatcher.onDidError((e) => {
            if (loggingEnabled) {
                console.log(`[recursive watcher test error] ${e.error}`);
            }
        });
        return recursiveWatcher;
    }
    async function testParcelWatcherReused(correlationId) {
        const recursiveWatcher = createParcelWatcher();
        await recursiveWatcher.watch([
            { path: testDir, excludes: [], recursive: true, correlationId: 1 },
        ]);
        const recursiveInstance = Array.from(recursiveWatcher.watchers)[0];
        assert.strictEqual(recursiveInstance.subscriptionsCount, 0);
        await createWatcher(recursiveWatcher);
        const filePath = join(testDir, 'deep', 'conway.js');
        await watcher.watch([{ path: filePath, excludes: [], recursive: false, correlationId }]);
        const { instance } = Array.from(watcher.watchers)[0];
        assert.strictEqual(instance.isReusingRecursiveWatcher, true);
        assert.strictEqual(recursiveInstance.subscriptionsCount, 1);
        let changeFuture = awaitEvent(watcher, filePath, isMacintosh /* somehow fsevents seems to report still on the initial create from test setup */
            ? 1 /* FileChangeType.ADDED */
            : 0 /* FileChangeType.UPDATED */, correlationId);
        await Promises.writeFile(filePath, 'Hello World');
        await changeFuture;
        await recursiveWatcher.stop();
        recursiveWatcher.dispose();
        await timeout(500); // give the watcher some time to restart
        changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */, correlationId);
        await Promises.writeFile(filePath, 'Hello World');
        await changeFuture;
        assert.strictEqual(instance.isReusingRecursiveWatcher, false);
    }
    test('watch requests support suspend/resume (file, does not exist in beginning, parcel watcher reused)', async function () {
        const recursiveWatcher = createParcelWatcher();
        await recursiveWatcher.watch([{ path: testDir, excludes: [], recursive: true }]);
        await createWatcher(recursiveWatcher);
        const filePath = join(testDir, 'not-found-2.txt');
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const request = { path: filePath, excludes: [], recursive: false };
        await watcher.watch([request]);
        await onDidWatchFail;
        assert.strictEqual(watcher.isSuspended(request), true);
        const changeFuture = awaitEvent(watcher, filePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(filePath, 'Hello World');
        await changeFuture;
        assert.strictEqual(watcher.isSuspended(request), false);
    });
    test('event type filter (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        const request = {
            path: filePath,
            excludes: [],
            recursive: false,
            filter: 2 /* FileChangeFilter.UPDATED */ | 8 /* FileChangeFilter.DELETED */,
            correlationId: 1,
        };
        await watcher.watch([request]);
        // Change file
        let changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */, 1);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, 1);
        await fs.promises.unlink(filePath);
        await changeFuture;
    });
    test('event type filter (folder watch)', async function () {
        const request = {
            path: testDir,
            excludes: [],
            recursive: false,
            filter: 2 /* FileChangeFilter.UPDATED */ | 8 /* FileChangeFilter.DELETED */,
            correlationId: 1,
        };
        await watcher.watch([request]);
        // Change file
        const filePath = join(testDir, 'lorem.txt');
        let changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */, 1);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, 1);
        await fs.promises.unlink(filePath);
        await changeFuture;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZWpzV2F0Y2hlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy90ZXN0L25vZGUvbm9kZWpzV2F0Y2hlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLDBCQUEwQixF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
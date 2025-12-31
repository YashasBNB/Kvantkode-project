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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZWpzV2F0Y2hlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvdGVzdC9ub2RlL25vZGVqc1dhdGNoZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as path from '../../../base/common/path.js';
import { URI } from '../../../base/common/uri.js';
import { ExtensionStoragePaths as CommonExtensionStoragePaths } from '../common/extHostStoragePaths.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { IntervalTimer, timeout } from '../../../base/common/async.js';
import { Promises } from '../../../base/node/pfs.js';
export class ExtensionStoragePaths extends CommonExtensionStoragePaths {
    constructor() {
        super(...arguments);
        this._workspaceStorageLock = null;
    }
    async _getWorkspaceStorageURI(storageName) {
        const workspaceStorageURI = await super._getWorkspaceStorageURI(storageName);
        if (workspaceStorageURI.scheme !== Schemas.file) {
            return workspaceStorageURI;
        }
        if (this._environment.skipWorkspaceStorageLock) {
            this._logService.info(`Skipping acquiring lock for ${workspaceStorageURI.fsPath}.`);
            return workspaceStorageURI;
        }
        const workspaceStorageBase = workspaceStorageURI.fsPath;
        let attempt = 0;
        do {
            let workspaceStoragePath;
            if (attempt === 0) {
                workspaceStoragePath = workspaceStorageBase;
            }
            else {
                workspaceStoragePath = /[/\\]$/.test(workspaceStorageBase)
                    ? `${workspaceStorageBase.substr(0, workspaceStorageBase.length - 1)}-${attempt}`
                    : `${workspaceStorageBase}-${attempt}`;
            }
            await mkdir(workspaceStoragePath);
            const lockfile = path.join(workspaceStoragePath, 'vscode.lock');
            const lock = await tryAcquireLock(this._logService, lockfile, false);
            if (lock) {
                this._workspaceStorageLock = lock;
                process.on('exit', () => {
                    lock.dispose();
                });
                return URI.file(workspaceStoragePath);
            }
            attempt++;
        } while (attempt < 10);
        // just give up
        return workspaceStorageURI;
    }
    onWillDeactivateAll() {
        // the lock will be released soon
        this._workspaceStorageLock?.setWillRelease(6000);
    }
}
async function mkdir(dir) {
    try {
        await fs.promises.stat(dir);
        return;
    }
    catch {
        // doesn't exist, that's OK
    }
    try {
        await fs.promises.mkdir(dir, { recursive: true });
    }
    catch { }
}
const MTIME_UPDATE_TIME = 1000; // 1s
const STALE_LOCK_TIME = 10 * 60 * 1000; // 10 minutes
class Lock extends Disposable {
    constructor(logService, filename) {
        super();
        this.logService = logService;
        this.filename = filename;
        this._timer = this._register(new IntervalTimer());
        this._timer.cancelAndSet(async () => {
            const contents = await readLockfileContents(logService, filename);
            if (!contents || contents.pid !== process.pid) {
                // we don't hold the lock anymore ...
                logService.info(`Lock '${filename}': The lock was lost unexpectedly.`);
                this._timer.cancel();
            }
            try {
                await fs.promises.utimes(filename, new Date(), new Date());
            }
            catch (err) {
                logService.error(err);
                logService.info(`Lock '${filename}': Could not update mtime.`);
            }
        }, MTIME_UPDATE_TIME);
    }
    dispose() {
        super.dispose();
        try {
            fs.unlinkSync(this.filename);
        }
        catch (err) { }
    }
    async setWillRelease(timeUntilReleaseMs) {
        this.logService.info(`Lock '${this.filename}': Marking the lockfile as scheduled to be released in ${timeUntilReleaseMs} ms.`);
        try {
            const contents = {
                pid: process.pid,
                willReleaseAt: Date.now() + timeUntilReleaseMs,
            };
            await Promises.writeFile(this.filename, JSON.stringify(contents), { flag: 'w' });
        }
        catch (err) {
            this.logService.error(err);
        }
    }
}
/**
 * Attempt to acquire a lock on a directory.
 * This does not use the real `flock`, but uses a file.
 * @returns a disposable if the lock could be acquired or null if it could not.
 */
async function tryAcquireLock(logService, filename, isSecondAttempt) {
    try {
        const contents = {
            pid: process.pid,
            willReleaseAt: 0,
        };
        await Promises.writeFile(filename, JSON.stringify(contents), { flag: 'wx' });
    }
    catch (err) {
        logService.error(err);
    }
    // let's see if we got the lock
    const contents = await readLockfileContents(logService, filename);
    if (!contents || contents.pid !== process.pid) {
        // we didn't get the lock
        if (isSecondAttempt) {
            logService.info(`Lock '${filename}': Could not acquire lock, giving up.`);
            return null;
        }
        logService.info(`Lock '${filename}': Could not acquire lock, checking if the file is stale.`);
        return checkStaleAndTryAcquireLock(logService, filename);
    }
    // we got the lock
    logService.info(`Lock '${filename}': Lock acquired.`);
    return new Lock(logService, filename);
}
/**
 * @returns 0 if the pid cannot be read
 */
async function readLockfileContents(logService, filename) {
    let contents;
    try {
        contents = await fs.promises.readFile(filename);
    }
    catch (err) {
        // cannot read the file
        logService.error(err);
        return null;
    }
    try {
        return JSON.parse(String(contents));
    }
    catch (err) {
        // cannot parse the file
        logService.error(err);
        return null;
    }
}
/**
 * @returns 0 if the mtime cannot be read
 */
async function readmtime(logService, filename) {
    let stats;
    try {
        stats = await fs.promises.stat(filename);
    }
    catch (err) {
        // cannot read the file stats to check if it is stale or not
        logService.error(err);
        return 0;
    }
    return stats.mtime.getTime();
}
function processExists(pid) {
    try {
        process.kill(pid, 0); // throws an exception if the process doesn't exist anymore.
        return true;
    }
    catch (e) {
        return false;
    }
}
async function checkStaleAndTryAcquireLock(logService, filename) {
    const contents = await readLockfileContents(logService, filename);
    if (!contents) {
        logService.info(`Lock '${filename}': Could not read pid of lock holder.`);
        return tryDeleteAndAcquireLock(logService, filename);
    }
    if (contents.willReleaseAt) {
        let timeUntilRelease = contents.willReleaseAt - Date.now();
        if (timeUntilRelease < 5000) {
            if (timeUntilRelease > 0) {
                logService.info(`Lock '${filename}': The lockfile is scheduled to be released in ${timeUntilRelease} ms.`);
            }
            else {
                logService.info(`Lock '${filename}': The lockfile is scheduled to have been released.`);
            }
            while (timeUntilRelease > 0) {
                await timeout(Math.min(100, timeUntilRelease));
                const mtime = await readmtime(logService, filename);
                if (mtime === 0) {
                    // looks like the lock was released
                    return tryDeleteAndAcquireLock(logService, filename);
                }
                timeUntilRelease = contents.willReleaseAt - Date.now();
            }
            return tryDeleteAndAcquireLock(logService, filename);
        }
    }
    if (!processExists(contents.pid)) {
        logService.info(`Lock '${filename}': The pid ${contents.pid} appears to be gone.`);
        return tryDeleteAndAcquireLock(logService, filename);
    }
    const mtime1 = await readmtime(logService, filename);
    const elapsed1 = Date.now() - mtime1;
    if (elapsed1 <= STALE_LOCK_TIME) {
        // the lock does not look stale
        logService.info(`Lock '${filename}': The lock does not look stale, elapsed: ${elapsed1} ms, giving up.`);
        return null;
    }
    // the lock holder updates the mtime every 1s.
    // let's give it a chance to update the mtime
    // in case of a wake from sleep or something similar
    logService.info(`Lock '${filename}': The lock looks stale, waiting for 2s.`);
    await timeout(2000);
    const mtime2 = await readmtime(logService, filename);
    const elapsed2 = Date.now() - mtime2;
    if (elapsed2 <= STALE_LOCK_TIME) {
        // the lock does not look stale
        logService.info(`Lock '${filename}': The lock does not look stale, elapsed: ${elapsed2} ms, giving up.`);
        return null;
    }
    // the lock looks stale
    logService.info(`Lock '${filename}': The lock looks stale even after waiting for 2s.`);
    return tryDeleteAndAcquireLock(logService, filename);
}
async function tryDeleteAndAcquireLock(logService, filename) {
    logService.info(`Lock '${filename}': Deleting a stale lock.`);
    try {
        await fs.promises.unlink(filename);
    }
    catch (err) {
        // cannot delete the file
        // maybe the file is already deleted
    }
    return tryAcquireLock(logService, filename, true);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0b3JhZ2VQYXRocy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dEhvc3RTdG9yYWdlUGF0aHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixJQUFJLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXRFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUVwRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsMkJBQTJCO0lBQXRFOztRQUNTLDBCQUFxQixHQUFnQixJQUFJLENBQUE7SUFnRGxELENBQUM7SUE5Q21CLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxXQUFtQjtRQUNuRSxNQUFNLG1CQUFtQixHQUFHLE1BQU0sS0FBSyxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzVFLElBQUksbUJBQW1CLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqRCxPQUFPLG1CQUFtQixDQUFBO1FBQzNCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNoRCxJQUFJLENBQUMs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
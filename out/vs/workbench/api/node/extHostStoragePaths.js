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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0b3JhZ2VQYXRocy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0U3RvcmFnZVBhdGhzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsSUFBSSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFcEQsTUFBTSxPQUFPLHFCQUFzQixTQUFRLDJCQUEyQjtJQUF0RTs7UUFDUywwQkFBcUIsR0FBZ0IsSUFBSSxDQUFBO0lBZ0RsRCxDQUFDO0lBOUNtQixLQUFLLENBQUMsdUJBQXVCLENBQUMsV0FBbUI7UUFDbkUsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM1RSxJQUFJLG1CQUFtQixDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakQsT0FBTyxtQkFBbUIsQ0FBQTtRQUMzQixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLFdBQVcs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
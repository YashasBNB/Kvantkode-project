/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { promises } from 'fs';
import { getCaseInsensitive } from '../common/objects.js';
import * as path from '../common/path.js';
import * as Platform from '../common/platform.js';
import * as process from '../common/process.js';
import { Source, TerminateResponseCode, } from '../common/processes.js';
import * as Types from '../common/types.js';
import * as pfs from './pfs.js';
export { Source, TerminateResponseCode, };
export function getWindowsShell(env = process.env) {
    return env['comspec'] || 'cmd.exe';
}
// Wrapper around process.send() that will queue any messages if the internal node.js
// queue is filled with messages and only continue sending messages when the internal
// queue is free again to consume messages.
// On Windows we always wait for the send() method to return before sending the next message
// to workaround https://github.com/nodejs/node/issues/7657 (IPC can freeze process)
export function createQueuedSender(childProcess) {
    let msgQueue = [];
    let useQueue = false;
    const send = function (msg) {
        if (useQueue) {
            msgQueue.push(msg); // add to the queue if the process cannot handle more messages
            return;
        }
        const result = childProcess.send(msg, (error) => {
            if (error) {
                console.error(error); // unlikely to happen, best we can do is log this error
            }
            useQueue = false; // we are good again to send directly without queue
            // now send all the messages that we have in our queue and did not send yet
            if (msgQueue.length > 0) {
                const msgQueueCopy = msgQueue.slice(0);
                msgQueue = [];
                msgQueueCopy.forEach((entry) => send(entry));
            }
        });
        if (!result || Platform.isWindows /* workaround https://github.com/nodejs/node/issues/7657 */) {
            useQueue = true;
        }
    };
    return { send };
}
async function fileExistsDefault(path) {
    if (await pfs.Promises.exists(path)) {
        let statValue;
        try {
            statValue = await promises.stat(path);
        }
        catch (e) {
            if (e.message.startsWith('EACCES')) {
                // it might be symlink
                statValue = await promises.lstat(path);
            }
        }
        return statValue ? !statValue.isDirectory() : false;
    }
    return false;
}
export async function findExecutable(command, cwd, paths, env = process.env, fileExists = fileExistsDefault) {
    // If we have an absolute path then we take it.
    if (path.isAbsolute(command)) {
        return (await fileExists(command)) ? command : undefined;
    }
    if (cwd === undefined) {
        cwd = process.cwd();
    }
    const dir = path.dirname(command);
    if (dir !== '.') {
        // We have a directory and the directory is relative (see above). Make the path absolute
        // to the current working directory.
        const fullPath = path.join(cwd, command);
        return (await fileExists(fullPath)) ? fullPath : undefined;
    }
    const envPath = getCaseInsensitive(env, 'PATH');
    if (paths === undefined && Types.isString(envPath)) {
        paths = envPath.split(path.delimiter);
    }
    // No PATH environment. Make path absolute to the cwd.
    if (paths === undefined || paths.length === 0) {
        const fullPath = path.join(cwd, command);
        return (await fileExists(fullPath)) ? fullPath : undefined;
    }
    // We have a simple file name. We get the path variable from the env
    // and try to find the executable on the path.
    for (const pathEntry of paths) {
        // The path entry is absolute.
        let fullPath;
        if (path.isAbsolute(pathEntry)) {
            fullPath = path.join(pathEntry, command);
        }
        else {
            fullPath = path.join(cwd, pathEntry, command);
        }
        if (Platform.isWindows) {
            const pathExt = getCaseInsensitive(env, 'PATHEXT') || '.COM;.EXE;.BAT;.CMD';
            const pathExtsFound = pathExt.split(';').map(async (ext) => {
                const withExtension = fullPath + ext;
                return (await fileExists(withExtension)) ? withExtension : undefined;
            });
            for (const foundPromise of pathExtsFound) {
                const found = await foundPromise;
                if (found) {
                    return found;
                }
            }
        }
        if (await fileExists(fullPath)) {
            return fullPath;
        }
    }
    const fullPath = path.join(cwd, command);
    return (await fileExists(fullPath)) ? fullPath : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL3Byb2Nlc3Nlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQVMsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3pELE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLFFBQVEsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEtBQUssT0FBTyxNQUFNLHNCQUFzQixDQUFBO0FBQy9DLE9BQU8sRUFHTixNQUFNLEVBR04scUJBQXFCLEdBQ3JCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUMvQixPQUFPLEVBQ04sTUFBTSxFQUNOLHFCQUFxQixHQUtyQixDQUFBO0FBTUQsTUFBTSxVQUFVLGVBQWUsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxHQUFtQztJQUNoRixPQUFPLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLENBQUE7QUFDbkMsQ0FBQztBQU1ELHFGQUFxRjtBQUNyRixxRkFBcUY7QUFDckYsMkNBQTJDO0FBQzNDLDRGQUE0RjtBQUM1RixvRkFBb0Y7QUFDcEYsTUFBTSxVQUFVLGtCQUFrQixDQUFDLFlBQTZCO0lBQy9ELElBQUksUUFBUSxHQUFhLEVBQUUsQ0FBQTtJQUMzQixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUE7SUFFcEIsTUFBTSxJQUFJLEdBQUcsVUFBVSxHQUFRO1FBQzlCLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FB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
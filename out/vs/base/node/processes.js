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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvcHJvY2Vzc2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBUyxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDcEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDekQsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssUUFBUSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sS0FBSyxPQUFPLE1BQU0sc0JBQXNCLENBQUE7QUFDL0MsT0FBTyxFQUdOLE1BQU0sRUFHTixxQkFBcUIsR0FDckIsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEtBQUssS0FBSyxNQUFNLG9CQUFvQixDQUFBO0FBQzNDLE9BQU8sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFBO0FBQy9CLE9BQU8sRUFDTixNQUFNLEVBQ04scUJBQXFCLEdBS3JCLENBQUE7QUFNRCxNQUFNLFVBQVUsZUFBZSxDQUFDLE1BQU0sT0FBTyxDQUFDLEdBQW1DO0lBQ2hGLE9BQU8sR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLFNBQVMsQ0FBQTtBQUNuQyxDQUFDO0FBTUQscUZBQXFGO0FBQ3JGLHFGQUFxRjtBQUNyRiwyQ0FBMkM7QUFDM0MsNEZBQTRGO0FBQzVGLG9GQUFvRjtBQUNwRixNQUFNLFVBQVUsa0JBQWtCLENBQUMsWUFBNkI7SUFDL0QsSUFBSSxRQUFRLEdBQWEsRUFBRSxDQUFBO0lBQzNCLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQTtJQUVwQixNQUFNLElBQUksR0FBRyxVQUFVLEdBQVE7UUFDOUIsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBQyw4REFBOEQ7WUFDakYsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQW1CLEVBQUUsRUFBRTtZQUM3RCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQyx1REFBdUQ7WUFDN0UsQ0FBQztZQUVELFFBQVEsR0FBRyxLQUFLLENBQUEsQ0FBQyxtREFBbUQ7WUFFcEUsMkVBQTJFO1lBQzNFLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdEMsUUFBUSxHQUFHLEVBQUUsQ0FBQTtnQkFDYixZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUM3QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxTQUFTLENBQUMsMkRBQTJELEVBQUUsQ0FBQztZQUMvRixRQUFRLEdBQUcsSUFBSSxDQUFBO1FBQ2hCLENBQUM7SUFDRixDQUFDLENBQUE7SUFFRCxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUE7QUFDaEIsQ0FBQztBQUVELEtBQUssVUFBVSxpQkFBaUIsQ0FBQyxJQUFZO0lBQzVDLElBQUksTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3JDLElBQUksU0FBNEIsQ0FBQTtRQUNoQyxJQUFJLENBQUM7WUFDSixTQUFTLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUNwQyxzQkFBc0I7Z0JBQ3RCLFNBQVMsR0FBRyxNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDdkMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtJQUNwRCxDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxjQUFjLENBQ25DLE9BQWUsRUFDZixHQUFZLEVBQ1osS0FBZ0IsRUFDaEIsTUFBb0MsT0FBTyxDQUFDLEdBQW1DLEVBQy9FLGFBQWlELGlCQUFpQjtJQUVsRSwrQ0FBK0M7SUFDL0MsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDOUIsT0FBTyxDQUFDLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ3pELENBQUM7SUFDRCxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUN2QixHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ3BCLENBQUM7SUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ2pDLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLHdGQUF3RjtRQUN4RixvQ0FBb0M7UUFDcEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEMsT0FBTyxDQUFDLE1BQU0sVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQzNELENBQUM7SUFDRCxNQUFNLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDL0MsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNwRCxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUNELHNEQUFzRDtJQUN0RCxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMvQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN4QyxPQUFPLENBQUMsTUFBTSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDM0QsQ0FBQztJQUVELG9FQUFvRTtJQUNwRSw4Q0FBOEM7SUFDOUMsS0FBSyxNQUFNLFNBQVMsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUMvQiw4QkFBOEI7UUFDOUIsSUFBSSxRQUFnQixDQUFBO1FBQ3BCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ2hDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN6QyxDQUFDO2FBQU0sQ0FBQztZQUNQLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUNELElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sT0FBTyxHQUFJLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxTQUFTLENBQVksSUFBSSxxQkFBcUIsQ0FBQTtZQUN2RixNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQzFELE1BQU0sYUFBYSxHQUFHLFFBQVEsR0FBRyxHQUFHLENBQUE7Z0JBQ3BDLE9BQU8sQ0FBQyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUNyRSxDQUFDLENBQUMsQ0FBQTtZQUNGLEtBQUssTUFBTSxZQUFZLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sS0FBSyxHQUFHLE1BQU0sWUFBWSxDQUFBO2dCQUNoQyxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNYLE9BQU8sS0FBSyxDQUFBO2dCQUNiLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksTUFBTSxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQztJQUNELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3hDLE9BQU8sQ0FBQyxNQUFNLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtBQUMzRCxDQUFDIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { tmpdir } from 'os';
import { Queue } from '../../../base/common/async.js';
import { randomPath } from '../../../base/common/extpath.js';
import { resolveTerminalEncoding } from '../../../base/node/terminalEncoding.js';
export function hasStdinWithoutTty() {
    try {
        return !process.stdin.isTTY; // Via https://twitter.com/MylesBorins/status/782009479382626304
    }
    catch (error) {
        // Windows workaround for https://github.com/nodejs/node/issues/11656
    }
    return false;
}
export function stdinDataListener(durationinMs) {
    return new Promise((resolve) => {
        const dataListener = () => resolve(true);
        // wait for 1s maximum...
        setTimeout(() => {
            process.stdin.removeListener('data', dataListener);
            resolve(false);
        }, durationinMs);
        // ...but finish early if we detect data
        process.stdin.once('data', dataListener);
    });
}
export function getStdinFilePath() {
    return randomPath(tmpdir(), 'code-stdin', 3);
}
async function createStdInFile(targetPath) {
    await fs.promises.appendFile(targetPath, '');
    await fs.promises.chmod(targetPath, 0o600); // Ensure the file is only read/writable by the user: https://github.com/microsoft/vscode-remote-release/issues/9048
}
export async function readFromStdin(targetPath, verbose, onEnd) {
    let [encoding, iconv] = await Promise.all([
        resolveTerminalEncoding(verbose), // respect terminal encoding when piping into file
        import('@vscode/iconv-lite-umd'), // lazy load encoding module for usage
        createStdInFile(targetPath), // make sure file exists right away (https://github.com/microsoft/vscode/issues/155341)
    ]);
    if (!iconv.default.encodingExists(encoding)) {
        console.log(`Unsupported terminal encoding: ${encoding}, falling back to UTF-8.`);
        encoding = 'utf8';
    }
    // Use a `Queue` to be able to use `appendFile`
    // which helps file watchers to be aware of the
    // changes because each append closes the underlying
    // file descriptor.
    // (https://github.com/microsoft/vscode/issues/148952)
    const appendFileQueue = new Queue();
    const decoder = iconv.default.getDecoder(encoding);
    process.stdin.on('data', (chunk) => {
        const chunkStr = decoder.write(chunk);
        appendFileQueue.queue(() => fs.promises.appendFile(targetPath, chunkStr));
    });
    process.stdin.on('end', () => {
        const end = decoder.end();
        appendFileQueue.queue(async () => {
            try {
                if (typeof end === 'string') {
                    await fs.promises.appendFile(targetPath, end);
                }
            }
            finally {
                onEnd?.();
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RkaW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L25vZGUvc3RkaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRWhGLE1BQU0sVUFBVSxrQkFBa0I7SUFDakMsSUFBSSxDQUFDO1FBQ0osT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFBLENBQUMsZ0VBQWdFO0lBQzdGLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLHFFQUFxRTtJQUN0RSxDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLFlBQW9CO0lBQ3JELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUM5QixNQUFNLFlBQVksR0FBRyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFeEMseUJBQXlCO1FBQ3pCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFFbEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2YsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FB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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RkaW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbnZpcm9ubWVudC9ub2RlL3N0ZGluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVoRixNQUFNLFVBQVUsa0JBQWtCO0lBQ2pDLElBQUksQ0FBQztRQUNKLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQSxDQUFDLGdFQUFnRTtJQUM3RixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixxRUFBcUU7SUFDdEUsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxZQUFvQjtJQUNyRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDOUIsTUFBTSxZQUFZLEdBQUcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXhDLHlCQUF5QjtRQUN6QixVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBRWxELE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNmLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUVoQix3Q0FBd0M7UUFDeEMsT0FBTyxD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
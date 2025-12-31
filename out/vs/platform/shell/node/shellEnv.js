/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { spawn } from 'child_process';
import { basename } from '../../../base/common/path.js';
import { localize } from '../../../nls.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { CancellationError, isCancellationError } from '../../../base/common/errors.js';
import { isWindows, OS } from '../../../base/common/platform.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { getSystemShell } from '../../../base/node/shell.js';
import { isLaunchedFromCli } from '../../environment/node/argvHelper.js';
import { Promises } from '../../../base/common/async.js';
import { clamp } from '../../../base/common/numbers.js';
let unixShellEnvPromise = undefined;
/**
 * Resolves the shell environment by spawning a shell. This call will cache
 * the shell spawning so that subsequent invocations use that cached result.
 *
 * Will throw an error if:
 * - we hit a timeout of `MAX_SHELL_RESOLVE_TIME`
 * - any other error from spawning a shell to figure out the environment
 */
export async function getResolvedShellEnv(configurationService, logService, args, env) {
    // Skip if --force-disable-user-env
    if (args['force-disable-user-env']) {
        logService.trace('resolveShellEnv(): skipped (--force-disable-user-env)');
        return {};
    }
    // Skip on windows
    else if (isWindows) {
        logService.trace('resolveShellEnv(): skipped (Windows)');
        return {};
    }
    // Skip if running from CLI already
    else if (isLaunchedFromCli(env) && !args['force-user-env']) {
        logService.trace('resolveShellEnv(): skipped (VSCODE_CLI is set)');
        return {};
    }
    // Otherwise resolve (macOS, Linux)
    else {
        if (isLaunchedFromCli(env)) {
            logService.trace('resolveShellEnv(): running (--force-user-env)');
        }
        else {
            logService.trace('resolveShellEnv(): running (macOS/Linux)');
        }
        // Call this only once and cache the promise for
        // subsequent calls since this operation can be
        // expensive (spawns a process).
        if (!unixShellEnvPromise) {
            unixShellEnvPromise = Promises.withAsyncBody(async (resolve, reject) => {
                const cts = new CancellationTokenSource();
                let timeoutValue = 10000; // default to 10 seconds
                const configuredTimeoutValue = configurationService.getValue('application.shellEnvironmentResolutionTimeout');
                if (typeof configuredTimeoutValue === 'number') {
                    timeoutValue = clamp(configuredTimeoutValue, 1, 120) * 1000; /* convert from seconds */
                }
                // Give up resolving shell env after some time
                const timeout = setTimeout(() => {
                    cts.dispose(true);
                    reject(new Error(localize('resolveShellEnvTimeout', 'Unable to resolve your shell environment in a reasonable time. Please review your shell configuration and restart.')));
                }, timeoutValue);
                // Resolve shell env and handle errors
                try {
                    resolve(await doResolveUnixShellEnv(logService, cts.token));
                }
                catch (error) {
                    if (!isCancellationError(error) && !cts.token.isCancellationRequested) {
                        reject(new Error(localize('resolveShellEnvError', 'Unable to resolve your shell environment: {0}', toErrorMessage(error))));
                    }
                    else {
                        resolve({});
                    }
                }
                finally {
                    clearTimeout(timeout);
                    cts.dispose();
                }
            });
        }
        return unixShellEnvPromise;
    }
}
async function doResolveUnixShellEnv(logService, token) {
    const runAsNode = process.env['ELECTRON_RUN_AS_NODE'];
    logService.trace('getUnixShellEnvironment#runAsNode', runAsNode);
    const noAttach = process.env['ELECTRON_NO_ATTACH_CONSOLE'];
    logService.trace('getUnixShellEnvironment#noAttach', noAttach);
    const mark = generateUuid().replace(/-/g, '').substr(0, 12);
    const regex = new RegExp(mark + '({.*})' + mark);
    const env = {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        ELECTRON_NO_ATTACH_CONSOLE: '1',
        VSCODE_RESOLVING_ENVIRONMENT: '1',
    };
    logService.trace('getUnixShellEnvironment#env', env);
    const systemShellUnix = await getSystemShell(OS, env);
    logService.trace('getUnixShellEnvironment#shell', systemShellUnix);
    return new Promise((resolve, reject) => {
        if (token.isCancellationRequested) {
            return reject(new CancellationError());
        }
        // handle popular non-POSIX shells
        const name = basename(systemShellUnix);
        let command, shellArgs;
        const extraArgs = '';
        if (/^(?:pwsh|powershell)(?:-preview)?$/.test(name)) {
            // Older versions of PowerShell removes double quotes sometimes so we use "double single quotes" which is how
            // you escape single quotes inside of a single quoted string.
            command = `& '${process.execPath}' ${extraArgs} -p '''${mark}'' + JSON.stringify(process.env) + ''${mark}'''`;
            shellArgs = ['-Login', '-Command'];
        }
        else if (name === 'nu') {
            // nushell requires ^ before quoted path to treat it as a command
            command = `^'${process.execPath}' ${extraArgs} -p '"${mark}" + JSON.stringify(process.env) + "${mark}"'`;
            shellArgs = ['-i', '-l', '-c'];
        }
        else if (name === 'xonsh') {
            // #200374: native implementation is shorter
            command = `import os, json; print("${mark}", json.dumps(dict(os.environ)), "${mark}")`;
            shellArgs = ['-i', '-l', '-c'];
        }
        else {
            command = `'${process.execPath}' ${extraArgs} -p '"${mark}" + JSON.stringify(process.env) + "${mark}"'`;
            if (name === 'tcsh' || name === 'csh') {
                shellArgs = ['-ic'];
            }
            else {
                shellArgs = ['-i', '-l', '-c'];
            }
        }
        logService.trace('getUnixShellEnvironment#spawn', JSON.stringify(shellArgs), command);
        const child = spawn(systemShellUnix, [...shellArgs, command], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env,
        });
        token.onCancellationRequested(() => {
            child.kill();
            return reject(new CancellationError());
        });
        child.on('error', (err) => {
            logService.error('getUnixShellEnvironment#errorChildProcess', toErrorMessage(err));
            reject(err);
        });
        const buffers = [];
        child.stdout.on('data', (b) => buffers.push(b));
        const stderr = [];
        child.stderr.on('data', (b) => stderr.push(b));
        child.on('close', (code, signal) => {
            const raw = Buffer.concat(buffers).toString('utf8');
            logService.trace('getUnixShellEnvironment#raw', raw);
            const stderrStr = Buffer.concat(stderr).toString('utf8');
            if (stderrStr.trim()) {
                logService.trace('getUnixShellEnvironment#stderr', stderrStr);
            }
            if (code || signal) {
                return reject(new Error(localize('resolveShellEnvExitError', 'Unexpected exit code from spawned shell (code {0}, signal {1})', code, signal)));
            }
            const match = regex.exec(raw);
            const rawStripped = match ? match[1] : '{}';
            try {
                const env = JSON.parse(rawStripped);
                if (runAsNode) {
                    env['ELECTRON_RUN_AS_NODE'] = runAsNode;
                }
                else {
                    delete env['ELECTRON_RUN_AS_NODE'];
                }
                if (noAttach) {
                    env['ELECTRON_NO_ATTACH_CONSOLE'] = noAttach;
                }
                else {
                    delete env['ELECTRON_NO_ATTACH_CONSOLE'];
                }
                delete env['VSCODE_RESOLVING_ENVIRONMENT'];
                // https://github.com/microsoft/vscode/issues/22593#issuecomment-336050758
                delete env['XDG_RUNTIME_DIR'];
                logService.trace('getUnixShellEnvironment#result', env);
                resolve(env);
            }
            catch (err) {
                logService.error('getUnixShellEnvironment#errorCaught', toErrorMessage(err));
                reject(err);
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxFbnYuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zaGVsbC9ub2RlL3NoZWxsRW52LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDckMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBdUIsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXhELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV2RCxJQUFJLG1CQUFtQixHQUE0QyxTQUFTLENBQUE7QUFFNUU7Ozs7Ozs7R0FPRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsbUJBQW1CLENBQ3hDLG9CQUEyQyxFQUMzQyxVQUF1QixFQUN2QixJQUFzQixFQUN0QixHQUF3QjtJQUV4QixtQ0FBbUM7SUFDbkMsSUFBSSxJQUFJLENBQUMsd0JBQXdCLENB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
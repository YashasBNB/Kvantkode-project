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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxFbnYuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3NoZWxsL25vZGUvc2hlbGxFbnYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkYsT0FBTyxFQUF1QixTQUFTLEVBQUUsRUFBRSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXZELElBQUksbUJBQW1CLEdBQTRDLFNBQVMsQ0FBQTtBQUU1RTs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxtQkFBbUIsQ0FDeEMsb0JBQTJDLEVBQzNDLFVBQXVCLEVBQ3ZCLElBQXNCLEVBQ3RCLEdBQXdCO0lBRXhCLG1DQUFtQztJQUNuQyxJ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
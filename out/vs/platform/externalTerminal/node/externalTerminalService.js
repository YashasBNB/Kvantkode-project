/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import * as cp from 'child_process';
import { memoize } from '../../../base/common/decorators.js';
import { FileAccess } from '../../../base/common/network.js';
import * as path from '../../../base/common/path.js';
import * as env from '../../../base/common/platform.js';
import { sanitizeProcessEnvironment } from '../../../base/common/processes.js';
import * as pfs from '../../../base/node/pfs.js';
import * as processes from '../../../base/node/processes.js';
import * as nls from '../../../nls.js';
import { DEFAULT_TERMINAL_OSX, } from '../common/externalTerminal.js';
const TERMINAL_TITLE = nls.localize('console.title', 'VS Code Console');
class ExternalTerminalService {
    async getDefaultTerminalForPlatforms() {
        return {
            windows: WindowsExternalTerminalService.getDefaultTerminalWindows(),
            linux: await LinuxExternalTerminalService.getDefaultTerminalLinuxReady(),
            osx: 'xterm',
        };
    }
}
export class WindowsExternalTerminalService extends ExternalTerminalService {
    static { this.CMD = 'cmd.exe'; }
    openTerminal(configuration, cwd) {
        return this.spawnTerminal(cp, configuration, processes.getWindowsShell(), cwd);
    }
    spawnTerminal(spawner, configuration, command, cwd) {
        const exec = configuration.windowsExec || WindowsExternalTerminalService.getDefaultTerminalWindows();
        // Make the drive letter uppercase on Windows (see #9448)
        if (cwd && cwd[1] === ':') {
            cwd = cwd[0].toUpperCase() + cwd.substr(1);
        }
        // cmder ignores the environment cwd and instead opts to always open in %USERPROFILE%
        // unless otherwise specified
        const basename = path.basename(exec, '.exe').toLowerCase();
        if (basename === 'cmder') {
            spawner.spawn(exec, cwd ? [cwd] : undefined);
            return Promise.resolve(undefined);
        }
        const cmdArgs = ['/c', 'start', '/wait'];
        if (exec.indexOf(' ') >= 0) {
            // The "" argument is the window title. Without this, exec doesn't work when the path
            // contains spaces. #6590
            // Title is Execution Path. #220129
            cmdArgs.push(exec);
        }
        cmdArgs.push(exec);
        // Add starting directory parameter for Windows Terminal (see #90734)
        if (basename === 'wt') {
            cmdArgs.push('-d .');
        }
        return new Promise((c, e) => {
            const env = getSanitizedEnvironment(process);
            const child = spawner.spawn(command, cmdArgs, { cwd, env, detached: true });
            child.on('error', e);
            child.on('exit', () => c());
        });
    }
    async runInTerminal(title, dir, args, envVars, settings) {
        const exec = 'windowsExec' in settings && settings.windowsExec
            ? settings.windowsExec
            : WindowsExternalTerminalService.getDefaultTerminalWindows();
        const wt = await WindowsExternalTerminalService.getWtExePath();
        return new Promise((resolve, reject) => {
            const title = `"${dir} - ${TERMINAL_TITLE}"`;
            const command = `"${args.join('" "')}" & pause`; // use '|' to only pause on non-zero exit code
            // merge environment variables into a copy of the process.env
            const env = Object.assign({}, getSanitizedEnvironment(process), envVars);
            // delete environment variables that have a null value
            Object.keys(env)
                .filter((v) => env[v] === null)
                .forEach((key) => delete env[key]);
            const options = {
                cwd: dir,
                env: env,
                windowsVerbatimArguments: true,
            };
            let spawnExec;
            let cmdArgs;
            if (path.basename(exec, '.exe') === 'wt') {
                // Handle Windows Terminal specially; -d to set the cwd and run a cmd.exe instance
                // inside it
                spawnExec = exec;
                cmdArgs = ['-d', '.', WindowsExternalTerminalService.CMD, '/c', command];
            }
            else if (wt) {
                // prefer to use the window terminal to spawn if it's available instead
                // of start, since that allows ctrl+c handling (#81322)
                spawnExec = wt;
                cmdArgs = ['-d', '.', exec, '/c', command];
            }
            else {
                spawnExec = WindowsExternalTerminalService.CMD;
                cmdArgs = ['/c', 'start', title, '/wait', exec, '/c', `"${command}"`];
            }
            const cmd = cp.spawn(spawnExec, cmdArgs, options);
            cmd.on('error', (err) => {
                reject(improveError(err));
            });
            resolve(undefined);
        });
    }
    static getDefaultTerminalWindows() {
        if (!WindowsExternalTerminalService._DEFAULT_TERMINAL_WINDOWS) {
            const isWoW64 = !!process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
            WindowsExternalTerminalService._DEFAULT_TERMINAL_WINDOWS = `${process.env.windir ? process.env.windir : 'C:\\Windows'}\\${isWoW64 ? 'Sysnative' : 'System32'}\\cmd.exe`;
        }
        return WindowsExternalTerminalService._DEFAULT_TERMINAL_WINDOWS;
    }
    static async getWtExePath() {
        try {
            return await processes.findExecutable('wt');
        }
        catch {
            return undefined;
        }
    }
}
__decorate([
    memoize
], WindowsExternalTerminalService, "getWtExePath", null);
export class MacExternalTerminalService extends ExternalTerminalService {
    static { this.OSASCRIPT = '/usr/bin/osascript'; } // osascript is the AppleScript interpreter on OS X
    openTerminal(configuration, cwd) {
        return this.spawnTerminal(cp, configuration, cwd);
    }
    runInTerminal(title, dir, args, envVars, settings) {
        const terminalApp = settings.osxExec || DEFAULT_TERMINAL_OSX;
        return new Promise((resolve, reject) => {
            if (terminalApp === DEFAULT_TERMINAL_OSX || terminalApp === 'iTerm.app') {
                // On OS X we launch an AppleScript that creates (or reuses) a Terminal window
                // and then launches the program inside that window.
                const script = terminalApp === DEFAULT_TERMINAL_OSX ? 'TerminalHelper' : 'iTermHelper';
                const scriptpath = FileAccess.asFileUri(`vs/workbench/contrib/externalTerminal/node/${script}.scpt`).fsPath;
                const osaArgs = [scriptpath, '-t', title || TERMINAL_TITLE, '-w', dir];
                for (const a of args) {
                    osaArgs.push('-a');
                    osaArgs.push(a);
                }
                if (envVars) {
                    // merge environment variables into a copy of the process.env
                    const env = Object.assign({}, getSanitizedEnvironment(process), envVars);
                    for (const key in env) {
                        const value = env[key];
                        if (value === null) {
                            osaArgs.push('-u');
                            osaArgs.push(key);
                        }
                        else {
                            osaArgs.push('-e');
                            osaArgs.push(`${key}=${value}`);
                        }
                    }
                }
                let stderr = '';
                const osa = cp.spawn(MacExternalTerminalService.OSASCRIPT, osaArgs);
                osa.on('error', (err) => {
                    reject(improveError(err));
                });
                osa.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                osa.on('exit', (code) => {
                    if (code === 0) {
                        // OK
                        resolve(undefined);
                    }
                    else {
                        if (stderr) {
                            const lines = stderr.split('\n', 1);
                            reject(new Error(lines[0]));
                        }
                        else {
                            reject(new Error(nls.localize('mac.terminal.script.failed', "Script '{0}' failed with exit code {1}", script, code)));
                        }
                    }
                });
            }
            else {
                reject(new Error(nls.localize('mac.terminal.type.not.supported', "'{0}' not supported", terminalApp)));
            }
        });
    }
    spawnTerminal(spawner, configuration, cwd) {
        const terminalApp = configuration.osxExec || DEFAULT_TERMINAL_OSX;
        return new Promise((c, e) => {
            const args = ['-a', terminalApp];
            if (cwd) {
                args.push(cwd);
            }
            const env = getSanitizedEnvironment(process);
            const child = spawner.spawn('/usr/bin/open', args, { cwd, env });
            child.on('error', e);
            child.on('exit', () => c());
        });
    }
}
export class LinuxExternalTerminalService extends ExternalTerminalService {
    static { this.WAIT_MESSAGE = nls.localize('press.any.key', 'Press any key to continue...'); }
    openTerminal(configuration, cwd) {
        return this.spawnTerminal(cp, configuration, cwd);
    }
    runInTerminal(title, dir, args, envVars, settings) {
        const execPromise = settings.linuxExec
            ? Promise.resolve(settings.linuxExec)
            : LinuxExternalTerminalService.getDefaultTerminalLinuxReady();
        return new Promise((resolve, reject) => {
            const termArgs = [];
            //termArgs.push('--title');
            //termArgs.push(`"${TERMINAL_TITLE}"`);
            execPromise.then((exec) => {
                if (exec.indexOf('gnome-terminal') >= 0) {
                    termArgs.push('-x');
                }
                else {
                    termArgs.push('-e');
                }
                termArgs.push('bash');
                termArgs.push('-c');
                const bashCommand = `${quote(args)}; echo; read -p "${LinuxExternalTerminalService.WAIT_MESSAGE}" -n1;`;
                termArgs.push(`''${bashCommand}''`); // wrapping argument in two sets of ' because node is so "friendly" that it removes one set...
                // merge environment variables into a copy of the process.env
                const env = Object.assign({}, getSanitizedEnvironment(process), envVars);
                // delete environment variables that have a null value
                Object.keys(env)
                    .filter((v) => env[v] === null)
                    .forEach((key) => delete env[key]);
                const options = {
                    cwd: dir,
                    env: env,
                };
                let stderr = '';
                const cmd = cp.spawn(exec, termArgs, options);
                cmd.on('error', (err) => {
                    reject(improveError(err));
                });
                cmd.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                cmd.on('exit', (code) => {
                    if (code === 0) {
                        // OK
                        resolve(undefined);
                    }
                    else {
                        if (stderr) {
                            const lines = stderr.split('\n', 1);
                            reject(new Error(lines[0]));
                        }
                        else {
                            reject(new Error(nls.localize('linux.term.failed', "'{0}' failed with exit code {1}", exec, code)));
                        }
                    }
                });
            });
        });
    }
    static async getDefaultTerminalLinuxReady() {
        if (!LinuxExternalTerminalService._DEFAULT_TERMINAL_LINUX_READY) {
            if (!env.isLinux) {
                LinuxExternalTerminalService._DEFAULT_TERMINAL_LINUX_READY = Promise.resolve('xterm');
            }
            else {
                const isDebian = await pfs.Promises.exists('/etc/debian_version');
                LinuxExternalTerminalService._DEFAULT_TERMINAL_LINUX_READY = new Promise((r) => {
                    if (isDebian) {
                        r('x-terminal-emulator');
                    }
                    else if (process.env.DESKTOP_SESSION === 'gnome' ||
                        process.env.DESKTOP_SESSION === 'gnome-classic') {
                        r('gnome-terminal');
                    }
                    else if (process.env.DESKTOP_SESSION === 'kde-plasma') {
                        r('konsole');
                    }
                    else if (process.env.COLORTERM) {
                        r(process.env.COLORTERM);
                    }
                    else if (process.env.TERM) {
                        r(process.env.TERM);
                    }
                    else {
                        r('xterm');
                    }
                });
            }
        }
        return LinuxExternalTerminalService._DEFAULT_TERMINAL_LINUX_READY;
    }
    spawnTerminal(spawner, configuration, cwd) {
        const execPromise = configuration.linuxExec
            ? Promise.resolve(configuration.linuxExec)
            : LinuxExternalTerminalService.getDefaultTerminalLinuxReady();
        return new Promise((c, e) => {
            execPromise.then((exec) => {
                const env = getSanitizedEnvironment(process);
                const child = spawner.spawn(exec, [], { cwd, env });
                child.on('error', e);
                child.on('exit', () => c());
            });
        });
    }
}
function getSanitizedEnvironment(process) {
    const env = { ...process.env };
    sanitizeProcessEnvironment(env);
    return env;
}
/**
 * tries to turn OS errors into more meaningful error messages
 */
function improveError(err) {
    if ('errno' in err &&
        err['errno'] === 'ENOENT' &&
        'path' in err &&
        typeof err['path'] === 'string') {
        return new Error(nls.localize('ext.term.app.not.found', "can't find terminal application '{0}'", err['path']));
    }
    return err;
}
/**
 * Quote args if necessary and combine into a space separated string.
 */
function quote(args) {
    let r = '';
    for (const a of args) {
        if (a.indexOf(' ') >= 0) {
            r += '"' + a + '"';
        }
        else {
            r += a;
        }
        r += ' ';
    }
    return r;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlcm5hbFRlcm1pbmFsL25vZGUvZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDbkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sS0FBSyxHQUFHLE1BQU0sa0NBQWtDLENBQUE7QUFDdkQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUUsT0FBTyxLQUFLLEdBQUcsTUFBTSwyQkFBMkIsQ0FBQTtBQUNoRCxPQUFPLEtBQUssU0FBUyxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUE7QUFDdEMsT0FBTyxFQUNOLG9CQUFvQixHQUlwQixNQUFNLCtCQUErQixDQUFBO0FBR3RDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDLENBQUE7QUFFdkUsTUFBZSx1QkFBdUI7SUFHckMsS0FBSyxDQUFDLDhCQUE4QjtRQUNuQyxPQUFPO1lBQ04sT0FBTyxFQUFFLDhCQUE4QixDQUFDLHlCQUF5QixFQUFFO1lBQ25FLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFDLDRCQUE0QixFQUFFO1lBQ3hFLEdBQUcsRUFBRSxPQUFPO1NBQ1osQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyw4QkFD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
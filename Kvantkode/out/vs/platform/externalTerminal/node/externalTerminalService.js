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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVybmFsVGVybWluYWwvbm9kZS9leHRlcm5hbFRlcm1pbmFsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RSxPQUFPLEtBQUssR0FBRyxNQUFNLDJCQUEyQixDQUFBO0FBQ2hELE9BQU8sS0FBSyxTQUFTLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sb0JBQW9CLEdBSXBCLE1BQU0sK0JBQStCLENBQUE7QUFHdEMsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtBQUV2RSxNQUFlLHVCQUF1QjtJQUdyQyxLQUFLLENBQUMsOEJBQThCO1FBQ25DLE9BQU87WUFDTixPQUFPLEVBQUUsOEJBQThCLENBQUMseUJBQXlCLEVBQUU7WUFDbkUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUMsNEJBQTRCLEVBQUU7WUFDeEUsR0FBRyxFQUFFLE9BQU87U0FDWixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFP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
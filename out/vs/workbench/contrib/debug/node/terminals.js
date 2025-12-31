/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from 'child_process';
import { getDriveLetter } from '../../../../base/common/extpath.js';
import * as platform from '../../../../base/common/platform.js';
function spawnAsPromised(command, args) {
    return new Promise((resolve, reject) => {
        let stdout = '';
        const child = cp.spawn(command, args);
        if (child.pid) {
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
        }
        child.on('error', (err) => {
            reject(err);
        });
        child.on('close', (code) => {
            resolve(stdout);
        });
    });
}
export async function hasChildProcesses(processId) {
    if (processId) {
        // if shell has at least one child process, assume that shell is busy
        if (platform.isWindows) {
            const windowsProcessTree = await import('@vscode/windows-process-tree');
            return new Promise((resolve) => {
                windowsProcessTree.getProcessTree(processId, (processTree) => {
                    resolve(!!processTree && processTree.children.length > 0);
                });
            });
        }
        else {
            return spawnAsPromised('/usr/bin/pgrep', ['-lP', String(processId)]).then((stdout) => {
                const r = stdout.trim();
                if (r.length === 0 || r.indexOf(' tmux') >= 0) {
                    // ignore 'tmux'; see #43683
                    return false;
                }
                else {
                    return true;
                }
            }, (error) => {
                return true;
            });
        }
    }
    // fall back to safe side
    return Promise.resolve(true);
}
var ShellType;
(function (ShellType) {
    ShellType[ShellType["cmd"] = 0] = "cmd";
    ShellType[ShellType["powershell"] = 1] = "powershell";
    ShellType[ShellType["bash"] = 2] = "bash";
})(ShellType || (ShellType = {}));
export function prepareCommand(shell, args, argsCanBeInterpretedByShell, cwd, env) {
    shell = shell.trim().toLowerCase();
    // try to determine the shell type
    let shellType;
    if (shell.indexOf('powershell') >= 0 || shell.indexOf('pwsh') >= 0) {
        shellType = 1 /* ShellType.powershell */;
    }
    else if (shell.indexOf('cmd.exe') >= 0) {
        shellType = 0 /* ShellType.cmd */;
    }
    else if (shell.indexOf('bash') >= 0) {
        shellType = 2 /* ShellType.bash */;
    }
    else if (platform.isWindows) {
        shellType = 0 /* ShellType.cmd */; // pick a good default for Windows
    }
    else {
        shellType = 2 /* ShellType.bash */; // pick a good default for anything else
    }
    let quote;
    // begin command with a space to avoid polluting shell history
    let command = ' ';
    switch (shellType) {
        case 1 /* ShellType.powershell */:
            quote = (s) => {
                s = s.replace(/\'/g, "''");
                if (s.length > 0 && s.charAt(s.length - 1) === '\\') {
                    return `'${s}\\'`;
                }
                return `'${s}'`;
            };
            if (cwd) {
                const driveLetter = getDriveLetter(cwd);
                if (driveLetter) {
                    command += `${driveLetter}:; `;
                }
                command += `cd ${quote(cwd)}; `;
            }
            if (env) {
                for (const key in env) {
                    const value = env[key];
                    if (value === null) {
                        command += `Remove-Item env:${key}; `;
                    }
                    else {
                        command += `\${env:${key}}='${value}'; `;
                    }
                }
            }
            if (args.length > 0) {
                const arg = args.shift();
                const cmd = argsCanBeInterpretedByShell ? arg : quote(arg);
                command += cmd[0] === "'" ? `& ${cmd} ` : `${cmd} `;
                for (const a of args) {
                    command += a === '<' || a === '>' || argsCanBeInterpretedByShell ? a : quote(a);
                    command += ' ';
                }
            }
            break;
        case 0 /* ShellType.cmd */:
            quote = (s) => {
                // Note: Wrapping in cmd /C "..." complicates the escaping.
                // cmd /C "node -e "console.log(process.argv)" """A^>0"""" # prints "A>0"
                // cmd /C "node -e "console.log(process.argv)" "foo^> bar"" # prints foo> bar
                // Outside of the cmd /C, it could be a simple quoting, but here, the ^ is needed too
                s = s.replace(/\"/g, '""');
                s = s.replace(/([><!^&|])/g, '^$1');
                return ' "'.split('').some((char) => s.includes(char)) || s.length === 0 ? `"${s}"` : s;
            };
            if (cwd) {
                const driveLetter = getDriveLetter(cwd);
                if (driveLetter) {
                    command += `${driveLetter}: && `;
                }
                command += `cd ${quote(cwd)} && `;
            }
            if (env) {
                command += 'cmd /C "';
                for (const key in env) {
                    let value = env[key];
                    if (value === null) {
                        command += `set "${key}=" && `;
                    }
                    else {
                        value = value.replace(/[&^|<>]/g, (s) => `^${s}`);
                        command += `set "${key}=${value}" && `;
                    }
                }
            }
            for (const a of args) {
                command += a === '<' || a === '>' || argsCanBeInterpretedByShell ? a : quote(a);
                command += ' ';
            }
            if (env) {
                command += '"';
            }
            break;
        case 2 /* ShellType.bash */: {
            quote = (s) => {
                s = s.replace(/(["'\\\$!><#()\[\]*&^| ;{}?`])/g, '\\$1');
                return s.length === 0 ? `""` : s;
            };
            const hardQuote = (s) => {
                return /[^\w@%\/+=,.:^-]/.test(s) ? `'${s.replace(/'/g, "'\\''")}'` : s;
            };
            if (cwd) {
                command += `cd ${quote(cwd)} ; `;
            }
            if (env) {
                command += '/usr/bin/env';
                for (const key in env) {
                    const value = env[key];
                    if (value === null) {
                        command += ` -u ${hardQuote(key)}`;
                    }
                    else {
                        command += ` ${hardQuote(`${key}=${value}`)}`;
                    }
                }
                command += ' ';
            }
            for (const a of args) {
                command += a === '<' || a === '>' || argsCanBeInterpretedByShell ? a : quote(a);
                command += ' ';
            }
            break;
        }
    }
    return command;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvbm9kZS90ZXJtaW5hbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDbkMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ25FLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFFL0QsU0FBUyxlQUFlLENBQUMsT0FBZSxFQUFFLElBQWM7SUFDdkQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN0QyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDZixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyQyxJQUFJLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNmLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFO2dCQUN4QyxNQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQzFCLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDekIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1osQ0FBQyxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzFCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoQixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxD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
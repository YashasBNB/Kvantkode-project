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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9ub2RlL3Rlcm1pbmFscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbkUsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRCxTQUFTLGVBQWUsQ0FBQyxPQUFlLEVBQUUsSUFBYztJQUN2RCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3RDLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUNmLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JDLElBQUksS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2YsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUU7Z0JBQ3hDLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDMUIsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUN6QixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDWixDQUFDLENBQUMsQ0FBQTtRQUNGLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDMUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2hCLENBQUMsQ0FB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { exec } from 'child_process';
import { FileAccess } from '../common/network.js';
export function listProcesses(rootPid) {
    return new Promise((resolve, reject) => {
        let rootItem;
        const map = new Map();
        function addToTree(pid, ppid, cmd, load, mem) {
            const parent = map.get(ppid);
            if (pid === rootPid || parent) {
                const item = {
                    name: findName(cmd),
                    cmd,
                    pid,
                    ppid,
                    load,
                    mem,
                };
                map.set(pid, item);
                if (pid === rootPid) {
                    rootItem = item;
                }
                if (parent) {
                    if (!parent.children) {
                        parent.children = [];
                    }
                    parent.children.push(item);
                    if (parent.children.length > 1) {
                        parent.children = parent.children.sort((a, b) => a.pid - b.pid);
                    }
                }
            }
        }
        function findName(cmd) {
            const UTILITY_NETWORK_HINT = /--utility-sub-type=network/i;
            const WINDOWS_CRASH_REPORTER = /--crashes-directory/i;
            const WINPTY = /\\pipe\\winpty-control/i;
            const CONPTY = /conhost\.exe.+--headless/i;
            const TYPE = /--type=([a-zA-Z-]+)/;
            // find windows crash reporter
            if (WINDOWS_CRASH_REPORTER.exec(cmd)) {
                return 'electron-crash-reporter';
            }
            // find winpty process
            if (WINPTY.exec(cmd)) {
                return 'winpty-agent';
            }
            // find conpty process
            if (CONPTY.exec(cmd)) {
                return 'conpty-agent';
            }
            // find "--type=xxxx"
            let matches = TYPE.exec(cmd);
            if (matches && matches.length === 2) {
                if (matches[1] === 'renderer') {
                    return `window`;
                }
                else if (matches[1] === 'utility') {
                    if (UTILITY_NETWORK_HINT.exec(cmd)) {
                        return 'utility-network-service';
                    }
                    return 'utility-process';
                }
                else if (matches[1] === 'extensionHost') {
                    return 'extension-host'; // normalize remote extension host type
                }
                return matches[1];
            }
            // find all xxxx.js
            const JS = /[a-zA-Z-]+\.js/g;
            let result = '';
            do {
                matches = JS.exec(cmd);
                if (matches) {
                    result += matches + ' ';
                }
            } while (matches);
            if (result) {
                if (cmd.indexOf('node ') < 0 && cmd.indexOf('node.exe') < 0) {
                    return `electron-nodejs (${result})`;
                }
            }
            return cmd;
        }
        if (process.platform === 'win32') {
            const cleanUNCPrefix = (value) => {
                if (value.indexOf('\\\\?\\') === 0) {
                    return value.substring(4);
                }
                else if (value.indexOf('\\??\\') === 0) {
                    return value.substring(4);
                }
                else if (value.indexOf('"\\\\?\\') === 0) {
                    return '"' + value.substring(5);
                }
                else if (value.indexOf('"\\??\\') === 0) {
                    return '"' + value.substring(5);
                }
                else {
                    return value;
                }
            };
            import('@vscode/windows-process-tree').then((windowsProcessTree) => {
                windowsProcessTree.getProcessList(rootPid, (processList) => {
                    if (!processList) {
                        reject(new Error(`Root process ${rootPid} not found`));
                        return;
                    }
                    windowsProcessTree.getProcessCpuUsage(processList, (completeProcessList) => {
                        const processItems = new Map();
                        completeProcessList.forEach((process) => {
                            const commandLine = cleanUNCPrefix(process.commandLine || '');
                            processItems.set(process.pid, {
                                name: findName(commandLine),
                                cmd: commandLine,
                                pid: process.pid,
                                ppid: process.ppid,
                                load: process.cpu || 0,
                                mem: process.memory || 0,
                            });
                        });
                        rootItem = processItems.get(rootPid);
                        if (rootItem) {
                            processItems.forEach((item) => {
                                const parent = processItems.get(item.ppid);
                                if (parent) {
                                    if (!parent.children) {
                                        parent.children = [];
                                    }
                                    parent.children.push(item);
                                }
                            });
                            processItems.forEach((item) => {
                                if (item.children) {
                                    item.children = item.children.sort((a, b) => a.pid - b.pid);
                                }
                            });
                            resolve(rootItem);
                        }
                        else {
                            reject(new Error(`Root process ${rootPid} not found`));
                        }
                    });
                }, windowsProcessTree.ProcessDataFlag.CommandLine |
                    windowsProcessTree.ProcessDataFlag.Memory);
            });
        }
        else {
            // OS X & Linux
            function calculateLinuxCpuUsage() {
                // Flatten rootItem to get a list of all VSCode processes
                let processes = [rootItem];
                const pids = [];
                while (processes.length) {
                    const process = processes.shift();
                    if (process) {
                        pids.push(process.pid);
                        if (process.children) {
                            processes = processes.concat(process.children);
                        }
                    }
                }
                // The cpu usage value reported on Linux is the average over the process lifetime,
                // recalculate the usage over a one second interval
                // JSON.stringify is needed to escape spaces, https://github.com/nodejs/node/issues/6803
                let cmd = JSON.stringify(FileAccess.asFileUri('vs/base/node/cpuUsage.sh').fsPath);
                cmd += ' ' + pids.join(' ');
                exec(cmd, {}, (err, stdout, stderr) => {
                    if (err || stderr) {
                        reject(err || new Error(stderr.toString()));
                    }
                    else {
                        const cpuUsage = stdout.toString().split('\n');
                        for (let i = 0; i < pids.length; i++) {
                            const processInfo = map.get(pids[i]);
                            processInfo.load = parseFloat(cpuUsage[i]);
                        }
                        if (!rootItem) {
                            reject(new Error(`Root process ${rootPid} not found`));
                            return;
                        }
                        resolve(rootItem);
                    }
                });
            }
            exec('which ps', {}, (err, stdout, stderr) => {
                if (err || stderr) {
                    if (process.platform !== 'linux') {
                        reject(err || new Error(stderr.toString()));
                    }
                    else {
                        const cmd = JSON.stringify(FileAccess.asFileUri('vs/base/node/ps.sh').fsPath);
                        exec(cmd, {}, (err, stdout, stderr) => {
                            if (err || stderr) {
                                reject(err || new Error(stderr.toString()));
                            }
                            else {
                                parsePsOutput(stdout, addToTree);
                                calculateLinuxCpuUsage();
                            }
                        });
                    }
                }
                else {
                    const ps = stdout.toString().trim();
                    const args = '-ax -o pid=,ppid=,pcpu=,pmem=,command=';
                    // Set numeric locale to ensure '.' is used as the decimal separator
                    exec(`${ps} ${args}`, { maxBuffer: 1000 * 1024, env: { LC_NUMERIC: 'en_US.UTF-8' } }, (err, stdout, stderr) => {
                        // Silently ignoring the screen size is bogus error. See https://github.com/microsoft/vscode/issues/98590
                        if (err || (stderr && !stderr.includes('screen size is bogus'))) {
                            reject(err || new Error(stderr.toString()));
                        }
                        else {
                            parsePsOutput(stdout, addToTree);
                            if (process.platform === 'linux') {
                                calculateLinuxCpuUsage();
                            }
                            else {
                                if (!rootItem) {
                                    reject(new Error(`Root process ${rootPid} not found`));
                                }
                                else {
                                    resolve(rootItem);
                                }
                            }
                        }
                    });
                }
            });
        }
    });
}
function parsePsOutput(stdout, addToTree) {
    const PID_CMD = /^\s*([0-9]+)\s+([0-9]+)\s+([0-9]+\.[0-9]+)\s+([0-9]+\.[0-9]+)\s+(.+)$/;
    const lines = stdout.toString().split('\n');
    for (const line of lines) {
        const matches = PID_CMD.exec(line.trim());
        if (matches && matches.length === 6) {
            addToTree(parseInt(matches[1]), parseInt(matches[2]), matches[5], parseFloat(matches[3]), parseFloat(matches[4]));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvcHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFHakQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxPQUFlO0lBQzVDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDdEMsSUFBSSxRQUFpQyxDQUFBO1FBQ3JDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFBO1FBRTFDLFNBQVMsU0FBUyxDQUFDLEdBQVcsRUFBRSxJQUFZLEVBQUUsR0FBVyxFQUFFLElBQVksRUFBRSxHQUFXO1lBQ25GLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDNUIsSUFBSSxHQUFHLEtBQUssT0FBTyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUMvQixNQUFNLElBQUksR0FBZ0I7b0JBQ3pCLElBQUksRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDO29CQUNuQixHQUFHO29CQUNILEdBQUc7b0JBQ0gsSUFBSTtvQkFDSixJQUFJO29CQUNKLEdBQUc7aUJBQ0gsQ0FBQTtnQkFDRCxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFFbEIsSUFBSSxHQUFHLEtBQUssT0FBTyxFQUFFLENBQUM7b0JBQ3JCLFFBQVEsR0FBRyxJQUFJLENBQUE7Z0JBQ2hCLENBQUM7Z0JBRUQsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDWixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUN0QixNQUFNLENBQUMs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
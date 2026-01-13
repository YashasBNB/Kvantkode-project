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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as fs from 'fs';
import * as osLib from 'os';
import { Promises } from '../../../base/common/async.js';
import { getNodeType, parse } from '../../../base/common/json.js';
import { Schemas } from '../../../base/common/network.js';
import { basename, join } from '../../../base/common/path.js';
import { isLinux, isWindows } from '../../../base/common/platform.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { URI } from '../../../base/common/uri.js';
import { virtualMachineHint } from '../../../base/node/id.js';
import { Promises as pfs } from '../../../base/node/pfs.js';
import { listProcesses } from '../../../base/node/ps.js';
import { isRemoteDiagnosticError, } from '../common/diagnostics.js';
import { ByteSize } from '../../files/common/files.js';
import { IProductService } from '../../product/common/productService.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
const workspaceStatsCache = new Map();
export async function collectWorkspaceStats(folder, filter) {
    const cacheKey = `${folder}::${filter.join(':')}`;
    const cached = workspaceStatsCache.get(cacheKey);
    if (cached) {
        return cached;
    }
    const configFilePatterns = [
        { tag: 'grunt.js', filePattern: /^gruntfile\.js$/i },
        { tag: 'gulp.js', filePattern: /^gulpfile\.js$/i },
        { tag: 'tsconfig.json', filePattern: /^tsconfig\.json$/i },
        { tag: 'package.json', filePattern: /^package\.json$/i },
        { tag: 'jsconfig.json', filePattern: /^jsconfig\.json$/i },
        { tag: 'tslint.json', filePattern: /^tslint\.json$/i },
        { tag: 'eslint.json', filePattern: /^eslint\.json$/i },
        { tag: 'tasks.json', filePattern: /^tasks\.json$/i },
        { tag: 'launch.json', filePattern: /^launch\.json$/i },
        { tag: 'mcp.json', filePattern: /^mcp\.json$/i },
        { tag: 'settings.json', filePattern: /^settings\.json$/i },
        { tag: 'webpack.config.js', filePattern: /^webpack\.config\.js$/i },
        { tag: 'project.json', filePattern: /^project\.json$/i },
        { tag: 'makefile', filePattern: /^makefile$/i },
        { tag: 'sln', filePattern: /^.+\.sln$/i },
        { tag: 'csproj', filePattern: /^.+\.csproj$/i },
        { tag: 'cmake', filePattern: /^.+\.cmake$/i },
        {
            tag: 'github-actions',
            filePattern: /^.+\.ya?ml$/i,
            relativePathPattern: /^\.github(?:\/|\\)workflows$/i,
        },
        { tag: 'devcontainer.json', filePattern: /^devcontainer\.json$/i },
        { tag: 'dockerfile', filePattern: /^(dockerfile|docker\-compose\.ya?ml)$/i },
        { tag: 'cursorrules', filePattern: /^\.cursorrules$/i },
    ];
    const fileTypes = new Map();
    const configFiles = new Map();
    const MAX_FILES = 20000;
    function collect(root, dir, filter, token) {
        const relativePath = dir.substring(root.length + 1);
        return Promises.withAsyncBody(async (resolve) => {
            let files;
            token.readdirCount++;
            try {
                files = await pfs.readdir(dir, { withFileTypes: true });
            }
            catch (error) {
                // Ignore folders that can't be read
                resolve();
                return;
            }
            if (token.count >= MAX_FILES) {
                token.count += files.length;
                token.maxReached = true;
                resolve();
                return;
            }
            let pending = files.length;
            if (pending === 0) {
                resolve();
                return;
            }
            let filesToRead = files;
            if (token.count + files.length > MAX_FILES) {
                token.maxReached = true;
                pending = MAX_FILES - token.count;
                filesToRead = files.slice(0, pending);
            }
            token.count += files.length;
            for (const file of filesToRead) {
                if (file.isDirectory()) {
                    if (!filter.includes(file.name)) {
                        await collect(root, join(dir, file.name), filter, token);
                    }
                    if (--pending === 0) {
                        resolve();
                        return;
                    }
                }
                else {
                    const index = file.name.lastIndexOf('.');
                    if (index >= 0) {
                        const fileType = file.name.substring(index + 1);
                        if (fileType) {
                            fileTypes.set(fileType, (fileTypes.get(fileType) ?? 0) + 1);
                        }
                    }
                    for (const configFile of configFilePatterns) {
                        if (configFile.relativePathPattern?.test(relativePath) !== false &&
                            configFile.filePattern.test(file.name)) {
                            configFiles.set(configFile.tag, (configFiles.get(configFile.tag) ?? 0) + 1);
                        }
                    }
                    if (--pending === 0) {
                        resolve();
                        return;
                    }
                }
            }
        });
    }
    const statsPromise = Promises.withAsyncBody(async (resolve) => {
        const token = {
            count: 0,
            maxReached: false,
            readdirCount: 0,
        };
        const sw = new StopWatch(true);
        await collect(folder, folder, filter, token);
        const launchConfigs = await collectLaunchConfigs(folder);
        resolve({
            configFiles: asSortedItems(configFiles),
            fileTypes: asSortedItems(fileTypes),
            fileCount: token.count,
            maxFilesReached: token.maxReached,
            launchConfigFiles: launchConfigs,
            totalScanTime: sw.elapsed(),
            totalReaddirCount: token.readdirCount,
        });
    });
    workspaceStatsCache.set(cacheKey, statsPromise);
    return statsPromise;
}
function asSortedItems(items) {
    return Array.from(items.entries(), ([name, count]) => ({ name: name, count: count })).sort((a, b) => b.count - a.count);
}
export function getMachineInfo() {
    const machineInfo = {
        os: `${osLib.type()} ${osLib.arch()} ${osLib.release()}`,
        memory: `${(osLib.totalmem() / ByteSize.GB).toFixed(2)}GB (${(osLib.freemem() / ByteSize.GB).toFixed(2)}GB free)`,
        vmHint: `${Math.round(virtualMachineHint.value() * 100)}%`,
    };
    const cpus = osLib.cpus();
    if (cpus && cpus.length > 0) {
        machineInfo.cpus = `${cpus[0].model} (${cpus.length} x ${cpus[0].speed})`;
    }
    return machineInfo;
}
export async function collectLaunchConfigs(folder) {
    try {
        const launchConfigs = new Map();
        const launchConfig = join(folder, '.vscode', 'launch.json');
        const contents = await fs.promises.readFile(launchConfig);
        const errors = [];
        const json = parse(contents.toString(), errors);
        if (errors.length) {
            console.log(`Unable to parse ${launchConfig}`);
            return [];
        }
        if (getNodeType(json) === 'object' && json['configurations']) {
            for (const each of json['configurations']) {
                const type = each['type'];
                if (type) {
                    if (launchConfigs.has(type)) {
                        launchConfigs.set(type, launchConfigs.get(type) + 1);
                    }
                    else {
                        launchConfigs.set(type, 1);
                    }
                }
            }
        }
        return asSortedItems(launchConfigs);
    }
    catch (error) {
        return [];
    }
}
let DiagnosticsService = class DiagnosticsService {
    constructor(telemetryService, productService) {
        this.telemetryService = telemetryService;
        this.productService = productService;
    }
    formatMachineInfo(info) {
        const output = [];
        output.push(`OS Version:       ${info.os}`);
        output.push(`CPUs:             ${info.cpus}`);
        output.push(`Memory (System):  ${info.memory}`);
        output.push(`VM:               ${info.vmHint}`);
        return output.join('\n');
    }
    formatEnvironment(info) {
        const output = [];
        output.push(`Version:          ${this.productService.nameShort} ${this.productService.version} (${this.productService.commit || 'Commit unknown'}, ${this.productService.date || 'Date unknown'})`);
        output.push(`OS Version:       ${osLib.type()} ${osLib.arch()} ${osLib.release()}`);
        const cpus = osLib.cpus();
        if (cpus && cpus.length > 0) {
            output.push(`CPUs:             ${cpus[0].model} (${cpus.length} x ${cpus[0].speed})`);
        }
        output.push(`Memory (System):  ${(osLib.totalmem() / ByteSize.GB).toFixed(2)}GB (${(osLib.freemem() / ByteSize.GB).toFixed(2)}GB free)`);
        if (!isWindows) {
            output.push(`Load (avg):       ${osLib
                .loadavg()
                .map((l) => Math.round(l))
                .join(', ')}`); // only provided on Linux/macOS
        }
        output.push(`VM:               ${Math.round(virtualMachineHint.value() * 100)}%`);
        output.push(`Screen Reader:    ${info.screenReader ? 'yes' : 'no'}`);
        output.push(`Process Argv:     ${info.mainArguments.join(' ')}`);
        output.push(`GPU Status:       ${this.expandGPUFeatures(info.gpuFeatureStatus)}`);
        return output.join('\n');
    }
    async getPerformanceInfo(info, remoteData) {
        return Promise.all([listProcesses(info.mainPID), this.formatWorkspaceMetadata(info)]).then(async (result) => {
            let [rootProcess, workspaceInfo] = result;
            let processInfo = this.formatProcessList(info, rootProcess);
            remoteData.forEach((diagnostics) => {
                if (isRemoteDiagnosticError(diagnostics)) {
                    processInfo += `\n${diagnostics.errorMessage}`;
                    workspaceInfo += `\n${diagnostics.errorMessage}`;
                }
                else {
                    processInfo += `\n\nRemote: ${diagnostics.hostName}`;
                    if (diagnostics.processes) {
                        processInfo += `\n${this.formatProcessList(info, diagnostics.processes)}`;
                    }
                    if (diagnostics.workspaceMetadata) {
                        workspaceInfo += `\n|  Remote: ${diagnostics.hostName}`;
                        for (const folder of Object.keys(diagnostics.workspaceMetadata)) {
                            const metadata = diagnostics.workspaceMetadata[folder];
                            let countMessage = `${metadata.fileCount} files`;
                            if (metadata.maxFilesReached) {
                                countMessage = `more than ${countMessage}`;
                            }
                            workspaceInfo += `|    Folder (${folder}): ${countMessage}`;
                            workspaceInfo += this.formatWorkspaceStats(metadata);
                        }
                    }
                }
            });
            return {
                processInfo,
                workspaceInfo,
            };
        });
    }
    async getSystemInfo(info, remoteData) {
        const { memory, vmHint, os, cpus } = getMachineInfo();
        const systemInfo = {
            os,
            memory,
            cpus,
            vmHint,
            processArgs: `${info.mainArguments.join(' ')}`,
            gpuStatus: info.gpuFeatureStatus,
            screenReader: `${info.screenReader ? 'yes' : 'no'}`,
            remoteData,
        };
        if (!isWindows) {
            systemInfo.load = `${osLib
                .loadavg()
                .map((l) => Math.round(l))
                .join(', ')}`;
        }
        if (isLinux) {
            systemInfo.linuxEnv = {
                desktopSession: process.env['DESKTOP_SESSION'],
                xdgSessionDesktop: process.env['XDG_SESSION_DESKTOP'],
                xdgCurrentDesktop: process.env['XDG_CURRENT_DESKTOP'],
                xdgSessionType: process.env['XDG_SESSION_TYPE'],
            };
        }
        return Promise.resolve(systemInfo);
    }
    async getDiagnostics(info, remoteDiagnostics) {
        const output = [];
        return listProcesses(info.mainPID).then(async (rootProcess) => {
            // Environment Info
            output.push('');
            output.push(this.formatEnvironment(info));
            // Process List
            output.push('');
            output.push(this.formatProcessList(info, rootProcess));
            // Workspace Stats
            if (info.windows.some((window) => window.folderURIs && window.folderURIs.length > 0 && !window.remoteAuthority)) {
                output.push('');
                output.push('Workspace Stats: ');
                output.push(await this.formatWorkspaceMetadata(info));
            }
            remoteDiagnostics.forEach((diagnostics) => {
                if (isRemoteDiagnosticError(diagnostics)) {
                    output.push(`\n${diagnostics.errorMessage}`);
                }
                else {
                    output.push('\n\n');
                    output.push(`Remote:           ${diagnostics.hostName}`);
                    output.push(this.formatMachineInfo(diagnostics.machineInfo));
                    if (diagnostics.processes) {
                        output.push(this.formatProcessList(info, diagnostics.processes));
                    }
                    if (diagnostics.workspaceMetadata) {
                        for (const folder of Object.keys(diagnostics.workspaceMetadata)) {
                            const metadata = diagnostics.workspaceMetadata[folder];
                            let countMessage = `${metadata.fileCount} files`;
                            if (metadata.maxFilesReached) {
                                countMessage = `more than ${countMessage}`;
                            }
                            output.push(`Folder (${folder}): ${countMessage}`);
                            output.push(this.formatWorkspaceStats(metadata));
                        }
                    }
                }
            });
            output.push('');
            output.push('');
            return output.join('\n');
        });
    }
    formatWorkspaceStats(workspaceStats) {
        const output = [];
        const lineLength = 60;
        let col = 0;
        const appendAndWrap = (name, count) => {
            const item = ` ${name}(${count})`;
            if (col + item.length > lineLength) {
                output.push(line);
                line = '|                 ';
                col = line.length;
            }
            else {
                col += item.length;
            }
            line += item;
        };
        // File Types
        let line = '|      File types:';
        const maxShown = 10;
        const max = workspaceStats.fileTypes.length > maxShown ? maxShown : workspaceStats.fileTypes.length;
        for (let i = 0; i < max; i++) {
            const item = workspaceStats.fileTypes[i];
            appendAndWrap(item.name, item.count);
        }
        output.push(line);
        // Conf Files
        if (workspaceStats.configFiles.length >= 0) {
            line = '|      Conf files:';
            col = 0;
            workspaceStats.configFiles.forEach((item) => {
                appendAndWrap(item.name, item.count);
            });
            output.push(line);
        }
        if (workspaceStats.launchConfigFiles.length > 0) {
            let line = '|      Launch Configs:';
            workspaceStats.launchConfigFiles.forEach((each) => {
                const item = each.count > 1 ? ` ${each.name}(${each.count})` : ` ${each.name}`;
                line += item;
            });
            output.push(line);
        }
        return output.join('\n');
    }
    expandGPUFeatures(gpuFeatures) {
        const longestFeatureName = Math.max(...Object.keys(gpuFeatures).map((feature) => feature.length));
        // Make columns aligned by adding spaces after feature name
        return Object.keys(gpuFeatures)
            .map((feature) => `${feature}:  ${' '.repeat(longestFeatureName - feature.length)}  ${gpuFeatures[feature]}`)
            .join('\n                  ');
    }
    formatWorkspaceMetadata(info) {
        const output = [];
        const workspaceStatPromises = [];
        info.windows.forEach((window) => {
            if (window.folderURIs.length === 0 || !!window.remoteAuthority) {
                return;
            }
            output.push(`|  Window (${window.title})`);
            window.folderURIs.forEach((uriComponents) => {
                const folderUri = URI.revive(uriComponents);
                if (folderUri.scheme === Schemas.file) {
                    const folder = folderUri.fsPath;
                    workspaceStatPromises.push(collectWorkspaceStats(folder, ['node_modules', '.git'])
                        .then((stats) => {
                        let countMessage = `${stats.fileCount} files`;
                        if (stats.maxFilesReached) {
                            countMessage = `more than ${countMessage}`;
                        }
                        output.push(`|    Folder (${basename(folder)}): ${countMessage}`);
                        output.push(this.formatWorkspaceStats(stats));
                    })
                        .catch((error) => {
                        output.push(`|      Error: Unable to collect workspace stats for folder ${folder} (${error.toString()})`);
                    }));
                }
                else {
                    output.push(`|    Folder (${folderUri.toString()}): Workspace stats not available.`);
                }
            });
        });
        return Promise.all(workspaceStatPromises)
            .then((_) => output.join('\n'))
            .catch((e) => `Unable to collect workspace stats: ${e}`);
    }
    formatProcessList(info, rootProcess) {
        const mapProcessToName = new Map();
        info.windows.forEach((window) => mapProcessToName.set(window.pid, `window [${window.id}] (${window.title})`));
        info.pidToNames.forEach(({ pid, name }) => mapProcessToName.set(pid, name));
        const output = [];
        output.push('CPU %\tMem MB\t   PID\tProcess');
        if (rootProcess) {
            this.formatProcessItem(info.mainPID, mapProcessToName, output, rootProcess, 0);
        }
        return output.join('\n');
    }
    formatProcessItem(mainPid, mapProcessToName, output, item, indent) {
        const isRoot = indent === 0;
        // Format name with indent
        let name;
        if (isRoot) {
            name = item.pid === mainPid ? `${this.productService.applicationName} main` : 'remote agent';
        }
        else {
            if (mapProcessToName.has(item.pid)) {
                name = mapProcessToName.get(item.pid);
            }
            else {
                name = `${'  '.repeat(indent)} ${item.name}`;
            }
        }
        const memory = process.platform === 'win32' ? item.mem : osLib.totalmem() * (item.mem / 100);
        output.push(`${item.load.toFixed(0).padStart(5, ' ')}\t${(memory / ByteSize.MB).toFixed(0).padStart(6, ' ')}\t${item.pid.toFixed(0).padStart(6, ' ')}\t${name}`);
        // Recurse into children if any
        if (Array.isArray(item.children)) {
            item.children.forEach((child) => this.formatProcessItem(mainPid, mapProcessToName, output, child, indent + 1));
        }
    }
    async getWorkspaceFileExtensions(workspace) {
        const items = new Set();
        for (const { uri } of workspace.folders) {
            const folderUri = URI.revive(uri);
            if (folderUri.scheme !== Schemas.file) {
                continue;
            }
            const folder = folderUri.fsPath;
            try {
                const stats = await collectWorkspaceStats(folder, ['node_modules', '.git']);
                stats.fileTypes.forEach((item) => items.add(item.name));
            }
            catch { }
        }
        return { extensions: [...items] };
    }
    async reportWorkspaceStats(workspace) {
        for (const { uri } of workspace.folders) {
            const folderUri = URI.revive(uri);
            if (folderUri.scheme !== Schemas.file) {
                continue;
            }
            const folder = folderUri.fsPath;
            try {
                const stats = await collectWorkspaceStats(folder, ['node_modules', '.git']);
                this.telemetryService.publicLog2('workspace.stats', {
                    'workspace.id': workspace.telemetryId,
                    rendererSessionId: workspace.rendererSessionId,
                });
                stats.fileTypes.forEach((e) => {
                    this.telemetryService.publicLog2('workspace.stats.file', {
                        rendererSessionId: workspace.rendererSessionId,
                        type: e.name,
                        count: e.count,
                    });
                });
                stats.launchConfigFiles.forEach((e) => {
                    this.telemetryService.publicLog2('workspace.stats.launchConfigFile', {
                        rendererSessionId: workspace.rendererSessionId,
                        type: e.name,
                        count: e.count,
                    });
                });
                stats.configFiles.forEach((e) => {
                    this.telemetryService.publicLog2('workspace.stats.configFiles', {
                        rendererSessionId: workspace.rendererSessionId,
                        type: e.name,
                        count: e.count,
                    });
                });
                this.telemetryService.publicLog2('workspace.stats.metadata', {
                    duration: stats.totalScanTime,
                    reachedLimit: stats.maxFilesReached,
                    fileCount: stats.fileCount,
                    readdirCount: stats.totalReaddirCount,
                });
            }
            catch {
                // Report nothing if collecting metadata fails.
            }
        }
    }
};
DiagnosticsService = __decorate([
    __param(0, ITelemetryService),
    __param(1, IProductService)
], DiagnosticsService);
export { DiagnosticsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kaWFnbm9zdGljcy9ub2RlL2RpYWdub3N0aWNzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssS0FBSyxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQWMsTUFBTSw4QkFBOEIsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDN0QsT0FBTyxFQUFXLFFBQVEsSUFBSSxHQUFHLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEQsT0FBTyxFQU1OLHVCQUF1QixHQU12QixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1B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
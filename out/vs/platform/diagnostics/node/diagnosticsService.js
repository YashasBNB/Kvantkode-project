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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGlhZ25vc3RpY3Mvbm9kZS9kaWFnbm9zdGljc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxLQUFLLEtBQUssTUFBTSxJQUFJLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFjLE1BQU0sOEJBQThCLENBQUE7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzdELE9BQU8sRUFBVyxRQUFRLElBQUksR0FBRyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3hELE9BQU8sRUFNTix1QkFBdUIsR0FNdkIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9B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
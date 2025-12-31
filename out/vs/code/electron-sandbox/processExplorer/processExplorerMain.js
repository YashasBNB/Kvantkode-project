/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/processExplorer.css';
import '../../../base/browser/ui/codicons/codiconStyles.js'; // make sure codicon css is loaded
import { localize } from '../../../nls.js';
import { $, append } from '../../../base/browser/dom.js';
import { createStyleSheet } from '../../../base/browser/domStylesheets.js';
import { DataTree } from '../../../base/browser/ui/tree/dataTree.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { popup } from '../../../base/parts/contextmenu/electron-sandbox/contextmenu.js';
import { ipcRenderer } from '../../../base/parts/sandbox/electron-sandbox/globals.js';
import { isRemoteDiagnosticError, } from '../../../platform/diagnostics/common/diagnostics.js';
import { ByteSize } from '../../../platform/files/common/files.js';
import { ElectronIPCMainProcessService } from '../../../platform/ipc/electron-sandbox/mainProcessService.js';
import { NativeHostService } from '../../../platform/native/common/nativeHostService.js';
import { getIconsStyleSheet } from '../../../platform/theme/browser/iconsStyleSheet.js';
import { applyZoom, zoomIn, zoomOut } from '../../../platform/window/electron-sandbox/window.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { mainWindow } from '../../../base/browser/window.js';
const DEBUG_FLAGS_PATTERN = /\s--inspect(?:-brk|port)?=(?<port>\d+)?/;
const DEBUG_PORT_PATTERN = /\s--inspect-port=(?<port>\d+)/;
class ProcessListDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        if (isProcessItem(element)) {
            return 'process';
        }
        if (isMachineProcessInformation(element)) {
            return 'machine';
        }
        if (isRemoteDiagnosticError(element)) {
            return 'error';
        }
        if (isProcessInformation(element)) {
            return 'header';
        }
        return '';
    }
}
class ProcessTreeDataSource {
    hasChildren(element) {
        if (isRemoteDiagnosticError(element)) {
            return false;
        }
        if (isProcessItem(element)) {
            return !!element.children?.length;
        }
        else {
            return true;
        }
    }
    getChildren(element) {
        if (isProcessItem(element)) {
            return element.children ? element.children : [];
        }
        if (isRemoteDiagnosticError(element)) {
            return [];
        }
        if (isProcessInformation(element)) {
            // If there are multiple process roots, return these, otherwise go directly to the root process
            if (element.processRoots.length > 1) {
                return element.processRoots;
            }
            else {
                return [element.processRoots[0].rootProcess];
            }
        }
        if (isMachineProcessInformation(element)) {
            return [element.rootProcess];
        }
        return [element.processes];
    }
}
class ProcessHeaderTreeRenderer {
    constructor() {
        this.templateId = 'header';
    }
    renderTemplate(container) {
        const row = append(container, $('.row'));
        const name = append(row, $('.nameLabel'));
        const CPU = append(row, $('.cpu'));
        const memory = append(row, $('.memory'));
        const PID = append(row, $('.pid'));
        return { name, CPU, memory, PID };
    }
    renderElement(node, index, templateData, height) {
        templateData.name.textContent = localize('name', 'Process Name');
        templateData.CPU.textContent = localize('cpu', 'CPU (%)');
        templateData.PID.textContent = localize('pid', 'PID');
        templateData.memory.textContent = localize('memory', 'Memory (MB)');
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
class MachineRenderer {
    constructor() {
        this.templateId = 'machine';
    }
    renderTemplate(container) {
        const data = Object.create(null);
        const row = append(container, $('.row'));
        data.name = append(row, $('.nameLabel'));
        return data;
    }
    renderElement(node, index, templateData, height) {
        templateData.name.textContent = node.element.name;
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
class ErrorRenderer {
    constructor() {
        this.templateId = 'error';
    }
    renderTemplate(container) {
        const data = Object.create(null);
        const row = append(container, $('.row'));
        data.name = append(row, $('.nameLabel'));
        return data;
    }
    renderElement(node, index, templateData, height) {
        templateData.name.textContent = node.element.errorMessage;
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
class ProcessRenderer {
    constructor(platform, totalMem, mapPidToName) {
        this.platform = platform;
        this.totalMem = totalMem;
        this.mapPidToName = mapPidToName;
        this.templateId = 'process';
    }
    renderTemplate(container) {
        const row = append(container, $('.row'));
        const name = append(row, $('.nameLabel'));
        const CPU = append(row, $('.cpu'));
        const memory = append(row, $('.memory'));
        const PID = append(row, $('.pid'));
        return { name, CPU, PID, memory };
    }
    renderElement(node, index, templateData, height) {
        const { element } = node;
        const pid = element.pid.toFixed(0);
        let name = element.name;
        if (this.mapPidToName.has(element.pid)) {
            name = this.mapPidToName.get(element.pid);
        }
        templateData.name.textContent = name;
        templateData.name.title = element.cmd;
        templateData.CPU.textContent = element.load.toFixed(0);
        templateData.PID.textContent = pid;
        templateData.PID.parentElement.id = `pid-${pid}`;
        const memory = this.platform === 'win32' ? element.mem : this.totalMem * (element.mem / 100);
        templateData.memory.textContent = (memory / ByteSize.MB).toFixed(0);
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
function isMachineProcessInformation(item) {
    return !!item.name && !!item.rootProcess;
}
function isProcessInformation(item) {
    return !!item.processRoots;
}
function isProcessItem(item) {
    return !!item.pid;
}
class ProcessExplorer {
    constructor(windowId, data) {
        this.data = data;
        this.mapPidToName = new Map();
        const mainProcessService = new ElectronIPCMainProcessService(windowId);
        this.nativeHostService = new NativeHostService(windowId, mainProcessService);
        this.applyStyles(data.styles);
        this.setEventHandlers(data);
        ipcRenderer.on('vscode:pidToNameResponse', (event, pidToNames) => {
            this.mapPidToName.clear();
            for (const [pid, name] of pidToNames) {
                this.mapPidToName.set(pid, name);
            }
        });
        ipcRenderer.on('vscode:listProcessesResponse', async (event, processRoots) => {
            processRoots.forEach((info, index) => {
                if (isProcessItem(info.rootProcess)) {
                    info.rootProcess.name =
                        index === 0 ? `${this.data.applicationName} main` : 'remote agent';
                }
            });
            if (!this.tree) {
                await this.createProcessTree(processRoots);
            }
            else {
                this.tree.setInput({ processes: { processRoots } });
                this.tree.layout(mainWindow.innerHeight, mainWindow.innerWidth);
            }
            this.requestProcessList(0);
        });
        this.lastRequestTime = Date.now();
        ipcRenderer.send('vscode:pidToNameRequest');
        ipcRenderer.send('vscode:listProcesses');
    }
    setEventHandlers(data) {
        mainWindow.document.onkeydown = (e) => {
            const cmdOrCtrlKey = data.platform === 'darwin' ? e.metaKey : e.ctrlKey;
            // Cmd/Ctrl + w closes issue window
            if (cmdOrCtrlKey && e.keyCode === 87) {
                e.stopPropagation();
                e.preventDefault();
                ipcRenderer.send('vscode:closeProcessExplorer');
            }
            // Cmd/Ctrl + zooms in
            if (cmdOrCtrlKey && e.keyCode === 187) {
                zoomIn(mainWindow);
            }
            // Cmd/Ctrl - zooms out
            if (cmdOrCtrlKey && e.keyCode === 189) {
                zoomOut(mainWindow);
            }
        };
    }
    async createProcessTree(processRoots) {
        const container = mainWindow.document.getElementById('process-list');
        if (!container) {
            return;
        }
        const { totalmem } = await this.nativeHostService.getOSStatistics();
        const renderers = [
            new ProcessRenderer(this.data.platform, totalmem, this.mapPidToName),
            new ProcessHeaderTreeRenderer(),
            new MachineRenderer(),
            new ErrorRenderer(),
        ];
        this.tree = new DataTree('processExplorer', container, new ProcessListDelegate(), renderers, new ProcessTreeDataSource(), {
            identityProvider: {
                getId: (element) => {
                    if (isProcessItem(element)) {
                        return element.pid.toString();
                    }
                    if (isRemoteDiagnosticError(element)) {
                        return element.hostName;
                    }
                    if (isProcessInformation(element)) {
                        return 'processes';
                    }
                    if (isMachineProcessInformation(element)) {
                        return element.name;
                    }
                    return 'header';
                },
            },
        });
        this.tree.setInput({ processes: { processRoots } });
        this.tree.layout(mainWindow.innerHeight, mainWindow.innerWidth);
        this.tree.onKeyDown((e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.keyCode === 35 /* KeyCode.KeyE */ && event.altKey) {
                const selectionPids = this.getSelectedPids();
                void Promise.all(selectionPids.map((pid) => this.nativeHostService.killProcess(pid, 'SIGTERM'))).then(() => this.tree?.refresh());
            }
        });
        this.tree.onContextMenu((e) => {
            if (isProcessItem(e.element)) {
                this.showContextMenu(e.element, true);
            }
        });
        container.style.height = `${mainWindow.innerHeight}px`;
        mainWindow.addEventListener('resize', () => {
            container.style.height = `${mainWindow.innerHeight}px`;
            this.tree?.layout(mainWindow.innerHeight, mainWindow.innerWidth);
        });
    }
    isDebuggable(cmd) {
        const matches = DEBUG_FLAGS_PATTERN.exec(cmd);
        return ((matches && matches.groups.port !== '0') ||
            cmd.indexOf('node ') >= 0 ||
            cmd.indexOf('node.exe') >= 0);
    }
    attachTo(item) {
        const config = {
            type: 'node',
            request: 'attach',
            name: `process ${item.pid}`,
        };
        let matches = DEBUG_FLAGS_PATTERN.exec(item.cmd);
        if (matches) {
            config.port = Number(matches.groups.port);
        }
        else {
            // no port -> try to attach via pid (send SIGUSR1)
            config.processId = String(item.pid);
        }
        // a debug-port=n or inspect-port=n overrides the port
        matches = DEBUG_PORT_PATTERN.exec(item.cmd);
        if (matches) {
            // override port
            config.port = Number(matches.groups.port);
        }
        ipcRenderer.send('vscode:workbenchCommand', {
            id: 'debug.startFromConfig',
            from: 'processExplorer',
            args: [config],
        });
    }
    applyStyles(styles) {
        const styleElement = createStyleSheet();
        const content = [];
        if (styles.listFocusBackground) {
            content.push(`.monaco-list:focus .monaco-list-row.focused { background-color: ${styles.listFocusBackground}; }`);
            content.push(`.monaco-list:focus .monaco-list-row.focused:hover { background-color: ${styles.listFocusBackground}; }`);
        }
        if (styles.listFocusForeground) {
            content.push(`.monaco-list:focus .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
        }
        if (styles.listActiveSelectionBackground) {
            content.push(`.monaco-list:focus .monaco-list-row.selected { background-color: ${styles.listActiveSelectionBackground}; }`);
            content.push(`.monaco-list:focus .monaco-list-row.selected:hover { background-color: ${styles.listActiveSelectionBackground}; }`);
        }
        if (styles.listActiveSelectionForeground) {
            content.push(`.monaco-list:focus .monaco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
        }
        if (styles.listHoverBackground) {
            content.push(`.monaco-list-row:hover:not(.selected):not(.focused) { background-color: ${styles.listHoverBackground}; }`);
        }
        if (styles.listHoverForeground) {
            content.push(`.monaco-list-row:hover:not(.selected):not(.focused) { color: ${styles.listHoverForeground}; }`);
        }
        if (styles.listFocusOutline) {
            content.push(`.monaco-list:focus .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }`);
        }
        if (styles.listHoverOutline) {
            content.push(`.monaco-list-row:hover { outline: 1px dashed ${styles.listHoverOutline}; outline-offset: -1px; }`);
        }
        // Scrollbars
        if (styles.scrollbarShadowColor) {
            content.push(`
				.monaco-scrollable-element > .shadow.top {
					box-shadow: ${styles.scrollbarShadowColor} 0 6px 6px -6px inset;
				}

				.monaco-scrollable-element > .shadow.left {
					box-shadow: ${styles.scrollbarShadowColor} 6px 0 6px -6px inset;
				}

				.monaco-scrollable-element > .shadow.top.left {
					box-shadow: ${styles.scrollbarShadowColor} 6px 6px 6px -6px inset;
				}
			`);
        }
        if (styles.scrollbarSliderBackgroundColor) {
            content.push(`
				.monaco-scrollable-element > .scrollbar > .slider {
					background: ${styles.scrollbarSliderBackgroundColor};
				}
			`);
        }
        if (styles.scrollbarSliderHoverBackgroundColor) {
            content.push(`
				.monaco-scrollable-element > .scrollbar > .slider:hover {
					background: ${styles.scrollbarSliderHoverBackgroundColor};
				}
			`);
        }
        if (styles.scrollbarSliderActiveBackgroundColor) {
            content.push(`
				.monaco-scrollable-element > .scrollbar > .slider.active {
					background: ${styles.scrollbarSliderActiveBackgroundColor};
				}
			`);
        }
        styleElement.textContent = content.join('\n');
        if (styles.color) {
            mainWindow.document.body.style.color = styles.color;
        }
    }
    showContextMenu(item, isLocal) {
        const items = [];
        const pid = Number(item.pid);
        if (isLocal) {
            items.push({
                accelerator: 'Alt+E',
                label: localize('killProcess', 'Kill Process'),
                click: () => {
                    this.nativeHostService.killProcess(pid, 'SIGTERM');
                },
            });
            items.push({
                label: localize('forceKillProcess', 'Force Kill Process'),
                click: () => {
                    this.nativeHostService.killProcess(pid, 'SIGKILL');
                },
            });
            items.push({
                type: 'separator',
            });
        }
        items.push({
            label: localize('copy', 'Copy'),
            click: () => {
                // Collect the selected pids
                const selectionPids = this.getSelectedPids();
                // If the selection does not contain the right clicked item, copy the right clicked
                // item only.
                if (!selectionPids?.includes(pid)) {
                    selectionPids.length = 0;
                    selectionPids.push(pid);
                }
                const rows = selectionPids
                    ?.map((e) => mainWindow.document.getElementById(`pid-${e}`))
                    .filter((e) => !!e);
                if (rows) {
                    const text = rows.map((e) => e.innerText).filter((e) => !!e);
                    this.nativeHostService.writeClipboardText(text.join('\n'));
                }
            },
        });
        items.push({
            label: localize('copyAll', 'Copy All'),
            click: () => {
                const processList = mainWindow.document.getElementById('process-list');
                if (processList) {
                    this.nativeHostService.writeClipboardText(processList.innerText);
                }
            },
        });
        if (item && isLocal && this.isDebuggable(item.cmd)) {
            items.push({
                type: 'separator',
            });
            items.push({
                label: localize('debug', 'Debug'),
                click: () => {
                    this.attachTo(item);
                },
            });
        }
        popup(items);
    }
    requestProcessList(totalWaitTime) {
        setTimeout(() => {
            const nextRequestTime = Date.now();
            const waited = totalWaitTime + nextRequestTime - this.lastRequestTime;
            this.lastRequestTime = nextRequestTime;
            // Wait at least a second between requests.
            if (waited > 1000) {
                ipcRenderer.send('vscode:pidToNameRequest');
                ipcRenderer.send('vscode:listProcesses');
            }
            else {
                this.requestProcessList(waited);
            }
        }, 200);
    }
    getSelectedPids() {
        return this.tree
            ?.getSelection()
            ?.map((e) => {
            if (!e || !('pid' in e)) {
                return undefined;
            }
            return e.pid;
        })
            .filter((e) => !!e);
    }
}
function createCodiconStyleSheet() {
    const codiconStyleSheet = createStyleSheet();
    codiconStyleSheet.id = 'codiconStyles';
    const iconsStyleSheet = getIconsStyleSheet(undefined);
    function updateAll() {
        codiconStyleSheet.textContent = iconsStyleSheet.getCSS();
    }
    const delayer = new RunOnceScheduler(updateAll, 0);
    iconsStyleSheet.onDidChange(() => delayer.schedule());
    delayer.schedule();
}
export function startup(configuration) {
    const platformClass = configuration.data.platform === 'win32'
        ? 'windows'
        : configuration.data.platform === 'linux'
            ? 'linux'
            : 'mac';
    mainWindow.document.body.classList.add(platformClass); // used by our fonts
    createCodiconStyleSheet();
    applyZoom(configuration.data.zoomLevel, mainWindow);
    new ProcessExplorer(configuration.windowId, configuration.data);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyTWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tc2FuZGJveC9wcm9jZXNzRXhwbG9yZXIvcHJvY2Vzc0V4cGxvcmVyTWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sb0RBQW9ELENBQUEsQ0FBQyxrQ0FBa0M7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBR2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDckYsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQU81RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN2RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUscUJB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
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
import electron from 'electron';
import { Queue } from '../../../base/common/async.js';
import { hash } from '../../../base/common/hash.js';
import { mnemonicButtonLabel } from '../../../base/common/labels.js';
import { Disposable, dispose, toDisposable } from '../../../base/common/lifecycle.js';
import { normalizeNFC } from '../../../base/common/normalization.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { Promises } from '../../../base/node/pfs.js';
import { localize } from '../../../nls.js';
import { massageMessageBoxOptions } from '../common/dialogs.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { WORKSPACE_FILTER } from '../../workspace/common/workspace.js';
export const IDialogMainService = createDecorator('dialogMainService');
let DialogMainService = class DialogMainService {
    constructor(logService, productService) {
        this.logService = logService;
        this.productService = productService;
        this.windowFileDialogLocks = new Map();
        this.windowDialogQueues = new Map();
        this.noWindowDialogueQueue = new Queue();
    }
    pickFileFolder(options, window) {
        return this.doPick({ ...options, pickFolders: true, pickFiles: true, title: localize('open', 'Open') }, window);
    }
    pickFolder(options, window) {
        return this.doPick({ ...options, pickFolders: true, title: localize('openFolder', 'Open Folder') }, window);
    }
    pickFile(options, window) {
        return this.doPick({ ...options, pickFiles: true, title: localize('openFile', 'Open File') }, window);
    }
    pickWorkspace(options, window) {
        const title = localize('openWorkspaceTitle', 'Open Workspace from File');
        const buttonLabel = mnemonicButtonLabel(localize({ key: 'openWorkspace', comment: ['&& denotes a mnemonic'] }, '&&Open')).withMnemonic;
        const filters = WORKSPACE_FILTER;
        return this.doPick({ ...options, pickFiles: true, title, filters, buttonLabel }, window);
    }
    async doPick(options, window) {
        // Ensure dialog options
        const dialogOptions = {
            title: options.title,
            buttonLabel: options.buttonLabel,
            filters: options.filters,
            defaultPath: options.defaultPath,
        };
        // Ensure properties
        if (typeof options.pickFiles === 'boolean' || typeof options.pickFolders === 'boolean') {
            dialogOptions.properties = undefined; // let it override based on the booleans
            if (options.pickFiles && options.pickFolders) {
                dialogOptions.properties = [
                    'multiSelections',
                    'openDirectory',
                    'openFile',
                    'createDirectory',
                ];
            }
        }
        if (!dialogOptions.properties) {
            dialogOptions.properties = [
                'multiSelections',
                options.pickFolders ? 'openDirectory' : 'openFile',
                'createDirectory',
            ];
        }
        if (isMacintosh) {
            dialogOptions.properties.push('treatPackageAsDirectory'); // always drill into .app files
        }
        // Show Dialog
        const result = await this.showOpenDialog(dialogOptions, (window || electron.BrowserWindow.getFocusedWindow()) ?? undefined);
        if (result && result.filePaths && result.filePaths.length > 0) {
            return result.filePaths;
        }
        return undefined;
    }
    getWindowDialogQueue(window) {
        // Queue message box requests per window so that one can show
        // after the other.
        if (window) {
            let windowDialogQueue = this.windowDialogQueues.get(window.id);
            if (!windowDialogQueue) {
                windowDialogQueue = new Queue();
                this.windowDialogQueues.set(window.id, windowDialogQueue);
            }
            return windowDialogQueue;
        }
        else {
            return this.noWindowDialogueQueue;
        }
    }
    showMessageBox(rawOptions, window) {
        return this.getWindowDialogQueue(window).queue(async () => {
            const { options, buttonIndeces } = massageMessageBoxOptions(rawOptions, this.productService);
            let result = undefined;
            if (window) {
                result = await electron.dialog.showMessageBox(window, options);
            }
            else {
                result = await electron.dialog.showMessageBox(options);
            }
            return {
                response: buttonIndeces[result.response],
                checkboxChecked: result.checkboxChecked,
            };
        });
    }
    async showSaveDialog(options, window) {
        // Prevent duplicates of the same dialog queueing at the same time
        const fileDialogLock = this.acquireFileDialogLock(options, window);
        if (!fileDialogLock) {
            this.logService.error('[DialogMainService]: file save dialog is already or will be showing for the window with the same configuration');
            return { canceled: true, filePath: '' };
        }
        try {
            return await this.getWindowDialogQueue(window).queue(async () => {
                let result;
                if (window) {
                    result = await electron.dialog.showSaveDialog(window, options);
                }
                else {
                    result = await electron.dialog.showSaveDialog(options);
                }
                result.filePath = this.normalizePath(result.filePath);
                return result;
            });
        }
        finally {
            dispose(fileDialogLock);
        }
    }
    normalizePath(path) {
        if (path && isMacintosh) {
            path = normalizeNFC(path); // macOS only: normalize paths to NFC form
        }
        return path;
    }
    normalizePaths(paths) {
        return paths.map((path) => this.normalizePath(path));
    }
    async showOpenDialog(options, window) {
        // Ensure the path exists (if provided)
        if (options.defaultPath) {
            const pathExists = await Promises.exists(options.defaultPath);
            if (!pathExists) {
                options.defaultPath = undefined;
            }
        }
        // Prevent duplicates of the same dialog queueing at the same time
        const fileDialogLock = this.acquireFileDialogLock(options, window);
        if (!fileDialogLock) {
            this.logService.error('[DialogMainService]: file open dialog is already or will be showing for the window with the same configuration');
            return { canceled: true, filePaths: [] };
        }
        try {
            return await this.getWindowDialogQueue(window).queue(async () => {
                let result;
                if (window) {
                    result = await electron.dialog.showOpenDialog(window, options);
                }
                else {
                    result = await electron.dialog.showOpenDialog(options);
                }
                result.filePaths = this.normalizePaths(result.filePaths);
                return result;
            });
        }
        finally {
            dispose(fileDialogLock);
        }
    }
    acquireFileDialogLock(options, window) {
        // If no window is provided, allow as many dialogs as
        // needed since we consider them not modal per window
        if (!window) {
            return Disposable.None;
        }
        // If a window is provided, only allow a single dialog
        // at the same time because dialogs are modal and we
        // do not want to open one dialog after the other
        // (https://github.com/microsoft/vscode/issues/114432)
        // we figure this out by `hashing` the configuration
        // options for the dialog to prevent duplicates
        this.logService.trace('[DialogMainService]: request to acquire file dialog lock', options);
        let windowFileDialogLocks = this.windowFileDialogLocks.get(window.id);
        if (!windowFileDialogLocks) {
            windowFileDialogLocks = new Set();
            this.windowFileDialogLocks.set(window.id, windowFileDialogLocks);
        }
        const optionsHash = hash(options);
        if (windowFileDialogLocks.has(optionsHash)) {
            return undefined; // prevent duplicates, return
        }
        this.logService.trace('[DialogMainService]: new file dialog lock created', options);
        windowFileDialogLocks.add(optionsHash);
        return toDisposable(() => {
            this.logService.trace('[DialogMainService]: file dialog lock disposed', options);
            windowFileDialogLocks?.delete(optionsHash);
            // If the window has no more dialog locks, delete it from the set of locks
            if (windowFileDialogLocks?.size === 0) {
                this.windowFileDialogLocks.delete(window.id);
            }
        });
    }
};
DialogMainService = __decorate([
    __param(0, ILogService),
    __param(1, IProductService)
], DialogMainService);
export { DialogMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nTWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kaWFsb2dzL2VsZWN0cm9uLW1haW4vZGlhbG9nTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFBO0FBQy9CLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBNEIsd0JBQXdCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUV0RSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG1CQUFtQixDQUFDLENBQUE7QUE2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
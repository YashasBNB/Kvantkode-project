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
import { timeout } from '../../../base/common/async.js';
import { debounce } from '../../../base/common/decorators.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isWindows, platform } from '../../../base/common/platform.js';
const SHELL_EXECUTABLES = [
    'cmd.exe',
    'powershell.exe',
    'pwsh.exe',
    'bash.exe',
    'git-cmd.exe',
    'wsl.exe',
    'ubuntu.exe',
    'ubuntu1804.exe',
    'kali.exe',
    'debian.exe',
    'opensuse-42.exe',
    'sles-12.exe',
    'julia.exe',
    'nu.exe',
    'node.exe',
];
const SHELL_EXECUTABLE_REGEXES = [/^python(\d(\.\d{0,2})?)?\.exe$/];
let windowsProcessTree;
export class WindowsShellHelper extends Disposable {
    get shellType() {
        return this._shellType;
    }
    get shellTitle() {
        return this._shellTitle;
    }
    get onShellNameChanged() {
        return this._onShellNameChanged.event;
    }
    get onShellTypeChanged() {
        return this._onShellTypeChanged.event;
    }
    constructor(_rootProcessId) {
        super();
        this._rootProcessId = _rootProcessId;
        this._shellTitle = '';
        this._onShellNameChanged = new Emitter();
        this._onShellTypeChanged = new Emitter();
        if (!isWindows) {
            throw new Error(`WindowsShellHelper cannot be instantiated on ${platform}`);
        }
        this._startMonitoringShell();
    }
    async _startMonitoringShell() {
        if (this._store.isDisposed) {
            return;
        }
        this.checkShell();
    }
    async checkShell() {
        if (isWindows) {
            // Wait to give the shell some time to actually launch a process, this
            // could lead to a race condition but it would be recovered from when
            // data stops and should cover the majority of cases
            await timeout(300);
            this.getShellName().then((title) => {
                const type = this.getShellType(title);
                if (type !== this._shellType) {
                    this._onShellTypeChanged.fire(type);
                    this._onShellNameChanged.fire(title);
                    this._shellType = type;
                    this._shellTitle = title;
                }
            });
        }
    }
    traverseTree(tree) {
        if (!tree) {
            return '';
        }
        if (SHELL_EXECUTABLES.indexOf(tree.name) === -1) {
            return tree.name;
        }
        for (const regex of SHELL_EXECUTABLE_REGEXES) {
            if (tree.name.match(regex)) {
                return tree.name;
            }
        }
        if (!tree.children || tree.children.length === 0) {
            return tree.name;
        }
        let favouriteChild = 0;
        for (; favouriteChild < tree.children.length; favouriteChild++) {
            const child = tree.children[favouriteChild];
            if (!child.children || child.children.length === 0) {
                break;
            }
            if (child.children[0].name !== 'conhost.exe') {
                break;
            }
        }
        if (favouriteChild >= tree.children.length) {
            return tree.name;
        }
        return this.traverseTree(tree.children[favouriteChild]);
    }
    /**
     * Returns the innermost shell executable running in the terminal
     */
    async getShellName() {
        if (this._store.isDisposed) {
            return Promise.resolve('');
        }
        // Prevent multiple requests at once, instead return current request
        if (this._currentRequest) {
            return this._currentRequest;
        }
        if (!windowsProcessTree) {
            windowsProcessTree = await import('@vscode/windows-process-tree');
        }
        this._currentRequest = new Promise((resolve) => {
            windowsProcessTree.getProcessTree(this._rootProcessId, (tree) => {
                const name = this.traverseTree(tree);
                this._currentRequest = undefined;
                resolve(name);
            });
        });
        return this._currentRequest;
    }
    getShellType(executable) {
        switch (executable.toLowerCase()) {
            case 'cmd.exe':
                return "cmd" /* WindowsShellType.CommandPrompt */;
            case 'powershell.exe':
            case 'pwsh.exe':
                return "pwsh" /* GeneralShellType.PowerShell */;
            case 'bash.exe':
            case 'git-cmd.exe':
                return "gitbash" /* WindowsShellType.GitBash */;
            case 'julia.exe':
                return "julia" /* GeneralShellType.Julia */;
            case 'node.exe':
                return "node" /* GeneralShellType.Node */;
            case 'nu.exe':
                return "nu" /* GeneralShellType.NuShell */;
            case 'wsl.exe':
            case 'ubuntu.exe':
            case 'ubuntu1804.exe':
            case 'kali.exe':
            case 'debian.exe':
            case 'opensuse-42.exe':
            case 'sles-12.exe':
                return "wsl" /* WindowsShellType.Wsl */;
            default:
                if (executable.match(/python(\d(\.\d{0,2})?)?\.exe/)) {
                    return "python" /* GeneralShellType.Python */;
                }
                return undefined;
        }
    }
}
__decorate([
    debounce(500)
], WindowsShellHelper.prototype, "checkShell", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c1NoZWxsSGVscGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvbm9kZS93aW5kb3dzU2hlbGxIZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFXdEUsTUFBTSxpQkFBaUIsR0FBRztJQUN6QixTQUFTO0lBQ1QsZ0JBQWdCO0lBQ2hCLFVBQVU7SUFDVixVQUFVO0lBQ1YsYUFBYTtJQUNiLFNBQVM7SUFDVCxZQUFZO0lBQ1osZ0JBQWdCO0lBQ2hCLFVBQVU7SUFDVixZQUFZO0lBQ1osaUJBQWlCO0lBQ2pCLGFBQWE7SUFDYixXQUFXO0lBQ1gsUUFBUTtJQUNSLFVBQVU7Q0FDVixDQUFBO0FBRUQsTUFBTSx3QkFBd0IsR0FBRyxDQUFDLGdDQUFnQyxDQUFDLENBQUE7QUFFbkUsSUFBSSxrQkFBaUQsQ0FBQTtBQUVyRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsVUFBVTtJQUdqRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0lBRUQsSUFBSSxrQkFBa0I7UUFDckIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFB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
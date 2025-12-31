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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { join } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { env } from '../../../../../base/common/process.js';
import { URI } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { FileOperationError, IFileService, } from '../../../../../platform/files/common/files.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
var Constants;
(function (Constants) {
    Constants[Constants["DefaultHistoryLimit"] = 100] = "DefaultHistoryLimit";
})(Constants || (Constants = {}));
var StorageKeys;
(function (StorageKeys) {
    StorageKeys["Entries"] = "terminal.history.entries";
    StorageKeys["Timestamp"] = "terminal.history.timestamp";
})(StorageKeys || (StorageKeys = {}));
let directoryHistory = undefined;
export function getDirectoryHistory(accessor) {
    if (!directoryHistory) {
        directoryHistory = accessor
            .get(IInstantiationService)
            .createInstance(TerminalPersistedHistory, 'dirs');
    }
    return directoryHistory;
}
let commandHistory = undefined;
export function getCommandHistory(accessor) {
    if (!commandHistory) {
        commandHistory = accessor
            .get(IInstantiationService)
            .createInstance(TerminalPersistedHistory, 'commands');
    }
    return commandHistory;
}
let TerminalPersistedHistory = class TerminalPersistedHistory extends Disposable {
    get entries() {
        this._ensureUpToDate();
        return this._entries.entries();
    }
    constructor(_storageDataKey, _configurationService, _storageService) {
        super();
        this._storageDataKey = _storageDataKey;
        this._configurationService = _configurationService;
        this._storageService = _storageService;
        this._timestamp = 0;
        this._isReady = false;
        this._isStale = true;
        // Init cache
        this._entries = new LRUCache(this._getHistoryLimit());
        // Listen for config changes to set history limit
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.shellIntegration.history" /* TerminalHistorySettingId.ShellIntegrationCommandHistory */)) {
                this._entries.limit = this._getHistoryLimit();
            }
        }));
        // Listen to cache changes from other windows
        this._register(this._storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, this._getTimestampStorageKey(), this._store)(() => {
            if (!this._isStale) {
                this._isStale =
                    this._storageService.getNumber(this._getTimestampStorageKey(), -1 /* StorageScope.APPLICATION */, 0) !== this._timestamp;
            }
        }));
    }
    add(key, value) {
        this._ensureUpToDate();
        this._entries.set(key, value);
        this._saveState();
    }
    remove(key) {
        this._ensureUpToDate();
        this._entries.delete(key);
        this._saveState();
    }
    clear() {
        this._ensureUpToDate();
        this._entries.clear();
        this._saveState();
    }
    _ensureUpToDate() {
        // Initial load
        if (!this._isReady) {
            this._loadState();
            this._isReady = true;
        }
        // React to stale cache caused by another window
        if (this._isStale) {
            // Since state is saved whenever the entries change, it's a safe assumption that no
            // merging of entries needs to happen, just loading the new state.
            this._entries.clear();
            this._loadState();
            this._isStale = false;
        }
    }
    _loadState() {
        this._timestamp = this._storageService.getNumber(this._getTimestampStorageKey(), -1 /* StorageScope.APPLICATION */, 0);
        // Load global entries plus
        const serialized = this._loadPersistedState();
        if (serialized) {
            for (const entry of serialized.entries) {
                this._entries.set(entry.key, entry.value);
            }
        }
    }
    _loadPersistedState() {
        const raw = this._storageService.get(this._getEntriesStorageKey(), -1 /* StorageScope.APPLICATION */);
        if (raw === undefined || raw.length === 0) {
            return undefined;
        }
        let serialized = undefined;
        try {
            serialized = JSON.parse(raw);
        }
        catch {
            // Invalid data
            return undefined;
        }
        return serialized;
    }
    _saveState() {
        const serialized = { entries: [] };
        this._entries.forEach((value, key) => serialized.entries.push({ key, value }));
        this._storageService.store(this._getEntriesStorageKey(), JSON.stringify(serialized), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this._timestamp = Date.now();
        this._storageService.store(this._getTimestampStorageKey(), this._timestamp, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    _getHistoryLimit() {
        const historyLimit = this._configurationService.getValue("terminal.integrated.shellIntegration.history" /* TerminalHistorySettingId.ShellIntegrationCommandHistory */);
        return typeof historyLimit === 'number' ? historyLimit : 100 /* Constants.DefaultHistoryLimit */;
    }
    _getTimestampStorageKey() {
        return `${"terminal.history.timestamp" /* StorageKeys.Timestamp */}.${this._storageDataKey}`;
    }
    _getEntriesStorageKey() {
        return `${"terminal.history.entries" /* StorageKeys.Entries */}.${this._storageDataKey}`;
    }
};
TerminalPersistedHistory = __decorate([
    __param(1, IConfigurationService),
    __param(2, IStorageService)
], TerminalPersistedHistory);
export { TerminalPersistedHistory };
const shellFileHistory = new Map();
export async function getShellFileHistory(accessor, shellType) {
    const cached = shellFileHistory.get(shellType);
    if (cached === null) {
        return undefined;
    }
    if (cached !== undefined) {
        return cached;
    }
    let result;
    switch (shellType) {
        case "bash" /* PosixShellType.Bash */:
            result = await fetchBashHistory(accessor);
            break;
        case "pwsh" /* GeneralShellType.PowerShell */:
            result = await fetchPwshHistory(accessor);
            break;
        case "zsh" /* PosixShellType.Zsh */:
            result = await fetchZshHistory(accessor);
            break;
        case "fish" /* PosixShellType.Fish */:
            result = await fetchFishHistory(accessor);
            break;
        case "python" /* GeneralShellType.Python */:
            result = await fetchPythonHistory(accessor);
            break;
        default:
            return undefined;
    }
    if (result === undefined) {
        shellFileHistory.set(shellType, null);
        return undefined;
    }
    shellFileHistory.set(shellType, result);
    return result;
}
export function clearShellFileHistory() {
    shellFileHistory.clear();
}
export async function fetchBashHistory(accessor) {
    const fileService = accessor.get(IFileService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const remoteEnvironment = await remoteAgentService.getEnvironment();
    if (remoteEnvironment?.os === 1 /* OperatingSystem.Windows */ || (!remoteEnvironment && isWindows)) {
        return undefined;
    }
    const sourceLabel = '~/.bash_history';
    const resolvedFile = await fetchFileContents(env['HOME'], '.bash_history', false, fileService, remoteAgentService);
    if (resolvedFile === undefined) {
        return undefined;
    }
    // .bash_history does not differentiate wrapped commands from multiple commands. Parse
    // the output to get the
    const fileLines = resolvedFile.content.split('\n');
    const result = new Set();
    let currentLine;
    let currentCommand = undefined;
    let wrapChar = undefined;
    for (let i = 0; i < fileLines.length; i++) {
        currentLine = fileLines[i];
        if (currentCommand === undefined) {
            currentCommand = currentLine;
        }
        else {
            currentCommand += `\n${currentLine}`;
        }
        for (let c = 0; c < currentLine.length; c++) {
            if (wrapChar) {
                if (currentLine[c] === wrapChar) {
                    wrapChar = undefined;
                }
            }
            else {
                if (currentLine[c].match(/['"]/)) {
                    wrapChar = currentLine[c];
                }
            }
        }
        if (wrapChar === undefined) {
            if (currentCommand.length > 0) {
                result.add(currentCommand.trim());
            }
            currentCommand = undefined;
        }
    }
    return {
        sourceLabel,
        sourceResource: resolvedFile.resource,
        commands: Array.from(result.values()),
    };
}
export async function fetchZshHistory(accessor) {
    const fileService = accessor.get(IFileService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const remoteEnvironment = await remoteAgentService.getEnvironment();
    if (remoteEnvironment?.os === 1 /* OperatingSystem.Windows */ || (!remoteEnvironment && isWindows)) {
        return undefined;
    }
    const sourceLabel = '~/.zsh_history';
    const resolvedFile = await fetchFileContents(env['HOME'], '.zsh_history', false, fileService, remoteAgentService);
    if (resolvedFile === undefined) {
        return undefined;
    }
    const fileLines = resolvedFile.content.split(/\:\s\d+\:\d+;/);
    const result = new Set();
    for (let i = 0; i < fileLines.length; i++) {
        const sanitized = fileLines[i].replace(/\\\n/g, '\n').trim();
        if (sanitized.length > 0) {
            result.add(sanitized);
        }
    }
    return {
        sourceLabel,
        sourceResource: resolvedFile.resource,
        commands: Array.from(result.values()),
    };
}
export async function fetchPythonHistory(accessor) {
    const fileService = accessor.get(IFileService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const sourceLabel = '~/.python_history';
    const resolvedFile = await fetchFileContents(env['HOME'], '.python_history', false, fileService, remoteAgentService);
    if (resolvedFile === undefined) {
        return undefined;
    }
    // Python history file is a simple text file with one command per line
    const fileLines = resolvedFile.content.split('\n');
    const result = new Set();
    fileLines.forEach((line) => {
        if (line.trim().length > 0) {
            result.add(line.trim());
        }
    });
    return {
        sourceLabel,
        sourceResource: resolvedFile.resource,
        commands: Array.from(result.values()),
    };
}
export async function fetchPwshHistory(accessor) {
    const fileService = accessor.get(IFileService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    let folderPrefix;
    let filePath;
    const remoteEnvironment = await remoteAgentService.getEnvironment();
    const isFileWindows = remoteEnvironment?.os === 1 /* OperatingSystem.Windows */ || (!remoteEnvironment && isWindows);
    let sourceLabel;
    if (isFileWindows) {
        folderPrefix = env['APPDATA'];
        filePath = 'Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt';
        sourceLabel = `$APPDATA\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt`;
    }
    else {
        folderPrefix = env['HOME'];
        filePath = '.local/share/powershell/PSReadline/ConsoleHost_history.txt';
        sourceLabel = `~/${filePath}`;
    }
    const resolvedFile = await fetchFileContents(folderPrefix, filePath, isFileWindows, fileService, remoteAgentService);
    if (resolvedFile === undefined) {
        return undefined;
    }
    const fileLines = resolvedFile.content.split('\n');
    const result = new Set();
    let currentLine;
    let currentCommand = undefined;
    let wrapChar = undefined;
    for (let i = 0; i < fileLines.length; i++) {
        currentLine = fileLines[i];
        if (currentCommand === undefined) {
            currentCommand = currentLine;
        }
        else {
            currentCommand += `\n${currentLine}`;
        }
        if (!currentLine.endsWith('`')) {
            const sanitized = currentCommand.trim();
            if (sanitized.length > 0) {
                result.add(sanitized);
            }
            currentCommand = undefined;
            continue;
        }
        // If the line ends with `, the line may be wrapped. Need to also test the case where ` is
        // the last character in the line
        for (let c = 0; c < currentLine.length; c++) {
            if (wrapChar) {
                if (currentLine[c] === wrapChar) {
                    wrapChar = undefined;
                }
            }
            else {
                if (currentLine[c].match(/`/)) {
                    wrapChar = currentLine[c];
                }
            }
        }
        // Having an even number of backticks means the line is terminated
        // TODO: This doesn't cover more complicated cases where ` is within quotes
        if (!wrapChar) {
            const sanitized = currentCommand.trim();
            if (sanitized.length > 0) {
                result.add(sanitized);
            }
            currentCommand = undefined;
        }
        else {
            // Remove trailing backtick
            currentCommand = currentCommand.replace(/`$/, '');
            wrapChar = undefined;
        }
    }
    return {
        sourceLabel,
        sourceResource: resolvedFile.resource,
        commands: Array.from(result.values()),
    };
}
export async function fetchFishHistory(accessor) {
    const fileService = accessor.get(IFileService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const remoteEnvironment = await remoteAgentService.getEnvironment();
    if (remoteEnvironment?.os === 1 /* OperatingSystem.Windows */ || (!remoteEnvironment && isWindows)) {
        return undefined;
    }
    /**
     * From `fish` docs:
     * > The command history is stored in the file ~/.local/share/fish/fish_history
     *   (or $XDG_DATA_HOME/fish/fish_history if that variable is set) by default.
     *
     * (https://fishshell.com/docs/current/interactive.html#history-search)
     */
    const overridenDataHome = env['XDG_DATA_HOME'];
    // TODO: Unchecked fish behavior:
    // What if XDG_DATA_HOME was defined but somehow $XDG_DATA_HOME/fish/fish_history
    // was not exist. Does fish fall back to ~/.local/share/fish/fish_history?
    let folderPrefix;
    let filePath;
    let sourceLabel;
    if (overridenDataHome) {
        sourceLabel = '$XDG_DATA_HOME/fish/fish_history';
        folderPrefix = env['XDG_DATA_HOME'];
        filePath = 'fish/fish_history';
    }
    else {
        sourceLabel = '~/.local/share/fish/fish_history';
        folderPrefix = env['HOME'];
        filePath = '.local/share/fish/fish_history';
    }
    const resolvedFile = await fetchFileContents(folderPrefix, filePath, false, fileService, remoteAgentService);
    if (resolvedFile === undefined) {
        return undefined;
    }
    /**
     * These apply to `fish` v3.5.1:
     * - It looks like YAML but it's not. It's, quoting, *"a broken psuedo-YAML"*.
     *   See these discussions for more details:
     *   - https://github.com/fish-shell/fish-shell/pull/6493
     *   - https://github.com/fish-shell/fish-shell/issues/3341
     * - Every record should exactly start with `- cmd:` (the whitespace between `-` and `cmd` cannot be replaced with tab)
     * - Both `- cmd: echo 1` and `- cmd:echo 1` are valid entries.
     * - Backslashes are esacped as `\\`.
     * - Multiline commands are joined with a `\n` sequence, hence they're read as single line commands.
     * - Property `when` is optional.
     * - History navigation respects the records order and ignore the actual `when` property values (chronological order).
     * - If `cmd` value is multiline , it just takes the first line. Also YAML operators like `>-` or `|-` are not supported.
     */
    const result = new Set();
    const cmds = resolvedFile.content
        .split('\n')
        .filter((x) => x.startsWith('- cmd:'))
        .map((x) => x.substring(6).trimStart());
    for (let i = 0; i < cmds.length; i++) {
        const sanitized = sanitizeFishHistoryCmd(cmds[i]).trim();
        if (sanitized.length > 0) {
            result.add(sanitized);
        }
    }
    return {
        sourceLabel,
        sourceResource: resolvedFile.resource,
        commands: Array.from(result.values()),
    };
}
export function sanitizeFishHistoryCmd(cmd) {
    /**
     * NOTE
     * This repeatedReplace() call can be eliminated by using look-ahead
     * caluses in the original RegExp pattern:
     *
     * >>> ```ts
     * >>> cmds[i].replace(/(?<=^|[^\\])((?:\\\\)*)(\\n)/g, '$1\n')
     * >>> ```
     *
     * But since not all browsers support look aheads we opted to a simple
     * pattern and repeatedly calling replace method.
     */
    return repeatedReplace(/(^|[^\\])((?:\\\\)*)(\\n)/g, cmd, '$1$2\n');
}
function repeatedReplace(pattern, value, replaceValue) {
    let last;
    let current = value;
    while (true) {
        last = current;
        current = current.replace(pattern, replaceValue);
        if (current === last) {
            return current;
        }
    }
}
async function fetchFileContents(folderPrefix, filePath, isFileWindows, fileService, remoteAgentService) {
    if (!folderPrefix) {
        return undefined;
    }
    const connection = remoteAgentService.getConnection();
    const isRemote = !!connection?.remoteAuthority;
    const resource = URI.from({
        scheme: isRemote ? Schemas.vscodeRemote : Schemas.file,
        authority: isRemote ? connection.remoteAuthority : undefined,
        path: URI.file(join(folderPrefix, filePath)).path,
    });
    let content;
    try {
        content = await fileService.readFile(resource);
    }
    catch (e) {
        // Handle file not found only
        if (e instanceof FileOperationError &&
            e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
            return undefined;
        }
        throw e;
    }
    if (content === undefined) {
        return undefined;
    }
    return {
        resource,
        content: content.value.toString(),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9oaXN0b3J5L2NvbW1vbi9oaXN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFtQixNQUFNLHdDQUF3QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUNOLGtCQUFrQixFQUdsQixZQUFZLEdBQ1osTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLG1EQUFtRCxDQUFBO0FBTTFELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBNkI5RixJQUFXLFNBRVY7QUFGRCxXQUFXLFNBQVM7SUFDbkIseUVBQXlCLENBQUE7QUFDMUIsQ0FBQyxFQUZVLFNBQVMsS0FBVCxTQUFTLFFBRW5CO0FBRUQsSUFBVyxXQUdWO0FBSEQsV0FBVyxXQUFXO0lBQ3JCLG1EQUFvQyxDQUFBO0lBQ3BDLHVEQUF3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
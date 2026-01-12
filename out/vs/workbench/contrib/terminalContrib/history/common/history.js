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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2hpc3RvcnkvY29tbW9uL2hpc3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxTQUFTLEVBQW1CLE1BQU0sd0NBQXdDLENBQUE7QUFDbkYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sa0JBQWtCLEVBR2xCLFlBQVksR0FDWixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sbURBQW1ELENBQUE7QUFNMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUE2QjlGLElBQVcsU0FFVjtBQUZELFdBQVcsU0FBUztJQUNuQix5RUFBeUIsQ0FBQTtBQUMxQixDQUFDLEVBRlUsU0FBUyxLQUFULFNBQVMsUUFFbkI7QUFFRCxJQUFXLFdBR1Y7QUFIRCxXQUFXLFdBQVc7SUFDckIsbURBQW9DLENBQUE7SUFDcEMs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
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
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalCompletionItemKind } from './terminalCompletionItem.js';
import { env as processEnv } from '../../../../../base/common/process.js';
import { timeout } from '../../../../../base/common/async.js';
export const ITerminalCompletionService = createDecorator('terminalCompletionService');
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the terminal.
 */
export class TerminalCompletionList {
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    constructor(items, resourceRequestConfig) {
        this.items = items;
        this.resourceRequestConfig = resourceRequestConfig;
    }
}
let TerminalCompletionService = class TerminalCompletionService extends Disposable {
    get providers() {
        return this._providersGenerator();
    }
    *_providersGenerator() {
        for (const providerMap of this._providers.values()) {
            for (const provider of providerMap.values()) {
                yield provider;
            }
        }
    }
    /** Overrides the environment for testing purposes. */
    set processEnv(env) {
        this._processEnv = env;
    }
    constructor(_configurationService, _fileService) {
        super();
        this._configurationService = _configurationService;
        this._fileService = _fileService;
        this._providers = new Map();
        this._processEnv = processEnv;
    }
    registerTerminalCompletionProvider(extensionIdentifier, id, provider, ...triggerCharacters) {
        let extMap = this._providers.get(extensionIdentifier);
        if (!extMap) {
            extMap = new Map();
            this._providers.set(extensionIdentifier, extMap);
        }
        provider.triggerCharacters = triggerCharacters;
        provider.id = id;
        extMap.set(id, provider);
        return toDisposable(() => {
            const extMap = this._providers.get(extensionIdentifier);
            if (extMap) {
                extMap.delete(id);
                if (extMap.size === 0) {
                    this._providers.delete(extensionIdentifier);
                }
            }
        });
    }
    async provideCompletions(promptValue, cursorPosition, allowFallbackCompletions, shellType, capabilities, token, triggerCharacter, skipExtensionCompletions) {
        if (!this._providers || !this._providers.values || cursorPosition < 0) {
            return undefined;
        }
        let providers;
        if (triggerCharacter) {
            const providersToRequest = [];
            for (const provider of this.providers) {
                if (!provider.triggerCharacters) {
                    continue;
                }
                for (const char of provider.triggerCharacters) {
                    if (promptValue.substring(0, cursorPosition)?.endsWith(char)) {
                        providersToRequest.push(provider);
                        break;
                    }
                }
            }
            providers = providersToRequest;
        }
        else {
            providers = [...this._providers.values()].flatMap((providerMap) => [...providerMap.values()]);
        }
        if (skipExtensionCompletions) {
            providers = providers.filter((p) => p.isBuiltin);
            return this._collectCompletions(providers, shellType, promptValue, cursorPosition, allowFallbackCompletions, capabilities, token);
        }
        const providerConfig = this._configurationService.getValue("terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */);
        providers = providers.filter((p) => {
            const providerId = p.id;
            return providerId && providerId in providerConfig && providerConfig[providerId] !== false;
        });
        if (!providers.length) {
            return;
        }
        return this._collectCompletions(providers, shellType, promptValue, cursorPosition, allowFallbackCompletions, capabilities, token);
    }
    async _collectCompletions(providers, shellType, promptValue, cursorPosition, allowFallbackCompletions, capabilities, token) {
        const completionPromises = providers.map(async (provider) => {
            if (provider.shellTypes && !provider.shellTypes.includes(shellType)) {
                return undefined;
            }
            const completions = await Promise.race([
                provider.provideCompletions(promptValue, cursorPosition, allowFallbackCompletions, token),
                timeout(5000),
            ]);
            if (!completions) {
                return undefined;
            }
            const completionItems = Array.isArray(completions) ? completions : (completions.items ?? []);
            if (shellType === "pwsh" /* GeneralShellType.PowerShell */) {
                for (const completion of completionItems) {
                    completion.isFileOverride ??=
                        completion.kind === TerminalCompletionItemKind.Method &&
                            completion.replacementIndex === 0;
                }
            }
            if (provider.isBuiltin) {
                //TODO: why is this needed?
                for (const item of completionItems) {
                    item.provider = provider.id;
                }
            }
            if (Array.isArray(completions)) {
                return completionItems;
            }
            if (completions.resourceRequestConfig) {
                const resourceCompletions = await this.resolveResources(completions.resourceRequestConfig, promptValue, cursorPosition, provider.id, capabilities);
                if (resourceCompletions) {
                    completionItems.push(...resourceCompletions);
                }
            }
            return completionItems;
        });
        const results = await Promise.all(completionPromises);
        return results.filter((result) => !!result).flat();
    }
    async resolveResources(resourceRequestConfig, promptValue, cursorPosition, provider, capabilities) {
        const useWindowsStylePath = resourceRequestConfig.pathSeparator === '\\';
        if (useWindowsStylePath) {
            // for tests, make sure the right path separator is used
            promptValue = promptValue.replaceAll(/[\\/]/g, resourceRequestConfig.pathSeparator);
        }
        // Files requested implies folders requested since the file could be in any folder. We could
        // provide diagnostics when a folder is provided where a file is expected.
        const foldersRequested = (resourceRequestConfig.foldersRequested || resourceRequestConfig.filesRequested) ?? false;
        const filesRequested = resourceRequestConfig.filesRequested ?? false;
        const fileExtensions = resourceRequestConfig.fileExtensions ?? undefined;
        const cwd = URI.revive(resourceRequestConfig.cwd);
        if (!cwd || (!foldersRequested && !filesRequested)) {
            return;
        }
        const resourceCompletions = [];
        const cursorPrefix = promptValue.substring(0, cursorPosition);
        // TODO: Leverage Fig's tokens array here?
        // The last word (or argument). When the cursor is following a space it will be the empty
        // string
        const lastWord = cursorPrefix.endsWith(' ') ? '' : (cursorPrefix.split(/(?<!\\) /).at(-1) ?? '');
        // Get the nearest folder path from the prefix. This ignores everything after the `/` as
        // they are what triggers changes in the directory.
        let lastSlashIndex;
        if (useWindowsStylePath) {
            // TODO: Flesh out escaped path logic, it currently only partially works
            let lastBackslashIndex = -1;
            for (let i = lastWord.length - 1; i >= 0; i--) {
                if (lastWord[i] === '\\') {
                    if (i === lastWord.length - 1 || lastWord[i + 1] !== ' ') {
                        lastBackslashIndex = i;
                        break;
                    }
                }
            }
            lastSlashIndex = Math.max(lastBackslashIndex, lastWord.lastIndexOf('/'));
        }
        else {
            lastSlashIndex = lastWord.lastIndexOf(resourceRequestConfig.pathSeparator);
        }
        // The _complete_ folder of the last word. For example if the last word is `./src/file`,
        // this will be `./src/`. This also always ends in the path separator if it is not the empty
        // string and path separators are normalized on Windows.
        let lastWordFolder = lastSlashIndex === -1 ? '' : lastWord.slice(0, lastSlashIndex + 1);
        if (useWindowsStylePath) {
            lastWordFolder = lastWordFolder.replaceAll('/', '\\');
        }
        // Determine the current folder being shown
        let lastWordFolderResource;
        const lastWordFolderHasDotPrefix = !!lastWordFolder.match(/^\.\.?[\\\/]/);
        const lastWordFolderHasTildePrefix = !!lastWordFolder.match(/^~[\\\/]?/);
        const isAbsolutePath = useWindowsStylePath
            ? /^[a-zA-Z]:[\\\/]/.test(lastWord)
            : lastWord.startsWith(resourceRequestConfig.pathSeparator);
        const type = lastWordFolderHasTildePrefix ? 'tilde' : isAbsolutePath ? 'absolute' : 'relative';
        switch (type) {
            case 'tilde': {
                const home = this._getHomeDir(useWindowsStylePath, capabilities);
                if (home) {
                    lastWordFolderResource = URI.joinPath(URI.file(home), lastWordFolder.slice(1).replaceAll('\\ ', ' '));
                }
                if (!lastWordFolderResource) {
                    // Use less strong wording here as it's not as strong of a concept on Windows
                    // and could be misleading
                    if (lastWord.match(/^~[\\\/]$/)) {
                        lastWordFolderResource = useWindowsStylePath ? 'Home directory' : '$HOME';
                    }
                }
                break;
            }
            case 'absolute': {
                lastWordFolderResource = URI.file(lastWordFolder.replaceAll('\\ ', ' '));
                break;
            }
            case 'relative': {
                lastWordFolderResource = cwd;
                break;
            }
        }
        // Assemble completions based on the resource of lastWordFolder. Note that on Windows the
        // path seprators are normalized to `\`.
        if (!lastWordFolderResource) {
            return undefined;
        }
        // Early exit with basic completion if we don't know the resource
        if (typeof lastWordFolderResource === 'string') {
            resourceCompletions.push({
                label: lastWordFolder,
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: lastWordFolderResource,
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length,
            });
            return resourceCompletions;
        }
        const stat = await this._fileService.resolve(lastWordFolderResource, {
            resolveSingleChildDescendants: true,
        });
        if (!stat?.children) {
            return;
        }
        // Add current directory. This should be shown at the top because it will be an exact
        // match and therefore highlight the detail, plus it improves the experience when
        // runOnEnter is used.
        //
        // - (relative) `|`       -> `.`
        //   this does not have the trailing `/` intentionally as it's common to complete the
        //   current working directory and we do not want to complete `./` when `runOnEnter` is
        //   used.
        // - (relative) `./src/|` -> `./src/`
        // - (absolute) `/src/|`  -> `/src/`
        // - (tilde)    `~/|`     -> `~/`
        // - (tilde)    `~/src/|` -> `~/src/`
        if (foldersRequested) {
            let label;
            switch (type) {
                case 'tilde': {
                    label = lastWordFolder;
                    break;
                }
                case 'absolute': {
                    label = lastWordFolder;
                    break;
                }
                case 'relative': {
                    label = '.';
                    if (lastWordFolder.length > 0) {
                        label = addPathRelativePrefix(lastWordFolder, resourceRequestConfig, lastWordFolderHasDotPrefix);
                    }
                    break;
                }
            }
            resourceCompletions.push({
                label,
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: getFriendlyPath(lastWordFolderResource, resourceRequestConfig.pathSeparator, TerminalCompletionItemKind.Folder),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length,
            });
        }
        // Add all direct children files or folders
        //
        // - (relative) `cd ./src/`  -> `cd ./src/folder1/`, ...
        // - (absolute) `cd c:/src/` -> `cd c:/src/folder1/`, ...
        // - (tilde)    `cd ~/src/`  -> `cd ~/src/folder1/`, ...
        for (const child of stat.children) {
            let kind;
            if (foldersRequested && child.isDirectory) {
                kind = TerminalCompletionItemKind.Folder;
            }
            else if (filesRequested && child.isFile) {
                kind = TerminalCompletionItemKind.File;
            }
            if (kind === undefined) {
                continue;
            }
            let label = lastWordFolder;
            if (label.length > 0 && !label.endsWith(resourceRequestConfig.pathSeparator)) {
                label += resourceRequestConfig.pathSeparator;
            }
            label += child.name;
            if (type === 'relative') {
                label = addPathRelativePrefix(label, resourceRequestConfig, lastWordFolderHasDotPrefix);
            }
            if (child.isDirectory && !label.endsWith(resourceRequestConfig.pathSeparator)) {
                label += resourceRequestConfig.pathSeparator;
            }
            if (child.isFile && fileExtensions) {
                const extension = child.name.split('.').length > 1 ? child.name.split('.').at(-1) : undefined;
                if (extension && !fileExtensions.includes(extension)) {
                    continue;
                }
            }
            resourceCompletions.push({
                label,
                provider,
                kind,
                detail: getFriendlyPath(child.resource, resourceRequestConfig.pathSeparator, kind),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length,
            });
        }
        // Support $CDPATH specially for the `cd` command only
        //
        // - (relative) `|` -> `/foo/vscode` (CDPATH has /foo which contains vscode folder)
        if (type === 'relative' && foldersRequested) {
            if (promptValue.startsWith('cd ')) {
                const config = this._configurationService.getValue("terminal.integrated.suggest.cdPath" /* TerminalSuggestSettingId.CdPath */);
                if (config === 'absolute' || config === 'relative') {
                    const cdPath = this._getEnvVar('CDPATH', capabilities);
                    if (cdPath) {
                        const cdPathEntries = cdPath.split(useWindowsStylePath ? ';' : ':');
                        for (const cdPathEntry of cdPathEntries) {
                            try {
                                const fileStat = await this._fileService.resolve(URI.file(cdPathEntry), {
                                    resolveSingleChildDescendants: true,
                                });
                                if (fileStat?.children) {
                                    for (const child of fileStat.children) {
                                        if (!child.isDirectory) {
                                            continue;
                                        }
                                        const useRelative = config === 'relative';
                                        const kind = TerminalCompletionItemKind.Folder;
                                        const label = useRelative
                                            ? basename(child.resource.fsPath)
                                            : getFriendlyPath(child.resource, resourceRequestConfig.pathSeparator, kind);
                                        const detail = useRelative
                                            ? `CDPATH ${getFriendlyPath(child.resource, resourceRequestConfig.pathSeparator, kind)}`
                                            : `CDPATH`;
                                        resourceCompletions.push({
                                            label,
                                            provider,
                                            kind,
                                            detail,
                                            replacementIndex: cursorPosition - lastWord.length,
                                            replacementLength: lastWord.length,
                                        });
                                    }
                                }
                            }
                            catch {
                                /* ignore */
                            }
                        }
                    }
                }
            }
        }
        // Add parent directory to the bottom of the list because it's not as useful as other suggestions
        //
        // - (relative) `|` -> `../`
        // - (relative) `./src/|` -> `./src/../`
        if (type === 'relative' && foldersRequested) {
            let label = `..${resourceRequestConfig.pathSeparator}`;
            if (lastWordFolder.length > 0) {
                label = addPathRelativePrefix(lastWordFolder + label, resourceRequestConfig, lastWordFolderHasDotPrefix);
            }
            const parentDir = URI.joinPath(cwd, '..' + resourceRequestConfig.pathSeparator);
            resourceCompletions.push({
                label,
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: getFriendlyPath(parentDir, resourceRequestConfig.pathSeparator, TerminalCompletionItemKind.Folder),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length,
            });
        }
        // Add tilde for home directory for relative paths when there is no path separator in the
        // input.
        //
        // - (relative) `|` -> `~`
        if (type === 'relative' && !lastWordFolder.match(/[\\\/]/)) {
            let homeResource;
            const home = this._getHomeDir(useWindowsStylePath, capabilities);
            if (home) {
                homeResource = URI.joinPath(URI.file(home), lastWordFolder.slice(1).replaceAll('\\ ', ' '));
            }
            if (!homeResource) {
                // Use less strong wording here as it's not as strong of a concept on Windows
                // and could be misleading
                homeResource = useWindowsStylePath ? 'Home directory' : '$HOME';
            }
            resourceCompletions.push({
                label: '~',
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: typeof homeResource === 'string'
                    ? homeResource
                    : getFriendlyPath(homeResource, resourceRequestConfig.pathSeparator, TerminalCompletionItemKind.Folder),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length,
            });
        }
        return resourceCompletions;
    }
    _getEnvVar(key, capabilities) {
        const env = capabilities.get(5 /* TerminalCapability.ShellEnvDetection */)?.env?.value;
        if (env) {
            return env[key];
        }
        return this._processEnv[key];
    }
    _getHomeDir(useWindowsStylePath, capabilities) {
        return useWindowsStylePath
            ? this._getEnvVar('USERPROFILE', capabilities)
            : this._getEnvVar('HOME', capabilities);
    }
};
TerminalCompletionService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IFileService)
], TerminalCompletionService);
export { TerminalCompletionService };
function getFriendlyPath(uri, pathSeparator, kind) {
    let path = uri.fsPath;
    // Ensure folders end with the path separator to differentiate presentation from files
    if (kind === TerminalCompletionItemKind.Folder && !path.endsWith(pathSeparator)) {
        path += pathSeparator;
    }
    // Ensure drive is capitalized on Windows
    if (pathSeparator === '\\' && path.match(/^[a-zA-Z]:\\/)) {
        path = `${path[0].toUpperCase()}:${path.slice(2)}`;
    }
    return path;
}
/**
 * Normalize suggestion to add a ./ prefix to the start of the path if there isn't one already. We
 * may want to change this behavior in the future to go with whatever format the user has.
 */
function addPathRelativePrefix(text, resourceRequestConfig, lastWordFolderHasDotPrefix) {
    if (!lastWordFolderHasDotPrefix) {
        return `.${resourceRequestConfig.pathSeparator}${text}`;
    }
    return text;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvYnJvd3Nlci90ZXJtaW5hbENvbXBsZXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQVUvRixPQUFPLEVBQUUsMEJBQTBCLEVBQTRCLE1BQU0sNkJBQTZCLENBQUE7QUFDbEcsT0FBTyxFQUFFLEdBQUcsSUFBSSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsZUFBZSxDQUN4RCwyQkFBMkIsQ0FDM0IsQ0FBQTtBQUVEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxzQkFBc0I7SUFXbEM7Ozs7O09BS0c7SUFDSCxZQUNDLEtBQTZCLEVBQzdCLHFCQUFxRDtRQUVyRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNsQixJQUFJLENBQUMscUJBQXFCLEdBQUcscUJBQXFC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
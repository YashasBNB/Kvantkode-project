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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvdGVybWluYWxDb21wbGV0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFVL0YsT0FBTyxFQUFFLDBCQUEwQixFQUE0QixNQUFNLDZCQUE2QixDQUFBO0FBQ2xHLE9BQU8sRUFBRSxHQUFHLElBQUksVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FDeEQsMkJBQTJCLENBQzNCLENBQUE7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sc0JBQXNCO0lBV2xDOzs7OztPQUtHO0lBQ0gsWUFDQyxLQUE2QixFQUM3QixxQkFBcUQ7UUFFckQsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDbEIsSUFBSSxDQUFDLHFCQUFxQixHQUFHLHFCQUFxQixDQUFBO0lBQ25ELENBQUM7Q0FDRDtBQTZDTSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7SUFPeEQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRU8sQ0FBQyxtQkFBbUI7UUFDM0IsS0FBSyxNQUFNLFdBQVcsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDcEQsS0FBSyxNQUFNLFFBQVEsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztnQkFDN0MsTUFBTSxRQUFRLENBQUE7WUFDZixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxzREFBc0Q7SUFDdEQsSUFBSSxVQUFVLENBQUMsR0FBd0I7UUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUE7SUFDdkIsQ0FBQztJQUdELFlBQ3dCLHFCQUE2RCxFQUN0RSxZQUEyQztRQUV6RCxLQUFLLEVBQUUsQ0FBQTtRQUhpQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ3JELGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBekJ6QyxlQUFVLEdBR3ZCLElBQUksR0FBRyxFQUFFLENBQUE7UUFrQkwsZ0JBQVcsR0FBRyxVQUFVLENBQUE7SUFPaEMsQ0FBQztJQUVELGtDQUFrQyxDQUNqQyxtQkFBMkIsRUFDM0IsRUFBVSxFQUNWLFFBQXFDLEVBQ3JDLEdBQUcsaUJBQTJCO1FBRTlCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDckQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7WUFDbEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDakQsQ0FBQztRQUNELFFBQVEsQ0FBQyxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQTtRQUM5QyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQTtRQUNoQixNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN4QixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUN2RCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ2pCLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDdkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtnQkFDNUMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQ3ZCLFdBQW1CLEVBQ25CLGNBQXNCLEVBQ3RCLHdCQUFpQyxFQUNqQyxTQUE0QixFQUM1QixZQUFzQyxFQUN0QyxLQUF3QixFQUN4QixnQkFBMEIsRUFDMUIsd0JBQWtDO1FBRWxDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLElBQUksY0FBYyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3ZFLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUFJLFNBQVMsQ0FBQTtRQUNiLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixNQUFNLGtCQUFrQixHQUFrQyxFQUFFLENBQUE7WUFDNUQsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDakMsU0FBUTtnQkFDVCxDQUFDO2dCQUNELEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQy9DLElBQUksV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQzlELGtCQUFrQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTt3QkFDakMsTUFBSztvQkFDTixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsU0FBUyxHQUFHLGtCQUFrQixDQUFBO1FBQy9CLENBQUM7YUFBTSxDQUFDO1lBQ1AsU0FBUyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM5RixDQUFDO1FBRUQsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1lBQzlCLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDaEQsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQzlCLFNBQVMsRUFDVCxTQUFTLEVBQ1QsV0FBVyxFQUNYLGNBQWMsRUFDZCx3QkFBd0IsRUFDeEIsWUFBWSxFQUNaLEtBQUssQ0FDTCxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUErQixJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxrRkFFckYsQ0FBQTtRQUNELFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDbEMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtZQUN2QixPQUFPLFVBQVUsSUFBSSxVQUFVLElBQUksY0FBYyxJQUFJLGNBQWMsQ0FBQyxVQUFVLENBQUMsS0FBSyxLQUFLLENBQUE7UUFDMUYsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLE9BQU07UUFDUCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQzlCLFNBQVMsRUFDVCxTQUFTLEVBQ1QsV0FBVyxFQUNYLGNBQWMsRUFDZCx3QkFBd0IsRUFDeEIsWUFBWSxFQUNaLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxtQkFBbUIsQ0FDaEMsU0FBd0MsRUFDeEMsU0FBNEIsRUFDNUIsV0FBbUIsRUFDbkIsY0FBc0IsRUFDdEIsd0JBQWlDLEVBQ2pDLFlBQXNDLEVBQ3RDLEtBQXdCO1FBRXhCLE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDM0QsSUFBSSxRQUFRLENBQUMsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDckUsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUNELE1BQU0sV0FBVyxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDdEMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsS0FBSyxDQUFDO2dCQUN6RixPQUFPLENBQUMsSUFBSSxDQUFDO2FBQ2IsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNsQixPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1lBQ0QsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLENBQUE7WUFDNUYsSUFBSSxTQUFTLDZDQUFnQyxFQUFFLENBQUM7Z0JBQy9DLEtBQUssTUFBTSxVQUFVLElBQUksZUFBZSxFQUFFLENBQUM7b0JBQzFDLFVBQVUsQ0FBQyxjQUFjO3dCQUN4QixVQUFVLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLE1BQU07NEJBQ3JELFVBQVUsQ0FBQyxnQkFBZ0IsS0FBSyxDQUFDLENBQUE7Z0JBQ25DLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3hCLDJCQUEyQjtnQkFDM0IsS0FBSyxNQUFNLElBQUksSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDcEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFBO2dCQUM1QixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLGVBQWUsQ0FBQTtZQUN2QixDQUFDO1lBQ0QsSUFBSSxXQUFXLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FDdEQsV0FBVyxDQUFDLHFCQUFxQixFQUNqQyxXQUFXLEVBQ1gsY0FBYyxFQUNkLFFBQVEsQ0FBQyxFQUFFLEVBQ1gsWUFBWSxDQUNaLENBQUE7Z0JBQ0QsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO29CQUN6QixlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsbUJBQW1CLENBQUMsQ0FBQTtnQkFDN0MsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLGVBQWUsQ0FBQTtRQUN2QixDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ3JELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ25ELENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCLENBQ3JCLHFCQUFvRCxFQUNwRCxXQUFtQixFQUNuQixjQUFzQixFQUN0QixRQUFnQixFQUNoQixZQUFzQztRQUV0QyxNQUFNLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDLGFBQWEsS0FBSyxJQUFJLENBQUE7UUFDeEUsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLHdEQUF3RDtZQUN4RCxXQUFXLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDcEYsQ0FBQztRQUVELDRGQUE0RjtRQUM1RiwwRUFBMEU7UUFDMUUsTUFBTSxnQkFBZ0IsR0FDckIsQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsSUFBSSxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsSUFBSSxLQUFLLENBQUE7UUFDMUYsTUFBTSxjQUFjLEdBQUcscUJBQXFCLENBQUMsY0FBYyxJQUFJLEtBQUssQ0FBQTtRQUNwRSxNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQyxjQUFjLElBQUksU0FBUyxDQUFBO1FBRXhFLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDakQsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ3BELE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxtQkFBbUIsR0FBMEIsRUFBRSxDQUFBO1FBQ3JELE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRTdELDBDQUEwQztRQUMxQyx5RkFBeUY7UUFDekYsU0FBUztRQUNULE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRWhHLHdGQUF3RjtRQUN4RixtREFBbUQ7UUFDbkQsSUFBSSxjQUFzQixDQUFBO1FBQzFCLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6Qix3RUFBd0U7WUFDeEUsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMzQixLQUFLLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDL0MsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQzFCLElBQUksQ0FBQyxLQUFLLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQzFELGtCQUFrQixHQUFHLENBQUMsQ0FBQTt3QkFDdEIsTUFBSztvQkFDTixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsY0FBYyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3pFLENBQUM7YUFBTSxDQUFDO1lBQ1AsY0FBYyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDM0UsQ0FBQztRQUVELHdGQUF3RjtRQUN4Riw0RkFBNEY7UUFDNUYsd0RBQXdEO1FBQ3hELElBQUksY0FBYyxHQUFHLGNBQWMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdkYsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLGNBQWMsR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN0RCxDQUFDO1FBRUQsMkNBQTJDO1FBQzNDLElBQUksc0JBQWdELENBQUE7UUFDcEQsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUN6RSxNQUFNLDRCQUE0QixHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sY0FBYyxHQUFHLG1CQUFtQjtZQUN6QyxDQUFDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNuQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUMzRCxNQUFNLElBQUksR0FBRyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFBO1FBQzlGLFFBQVEsSUFBSSxFQUFFLENBQUM7WUFDZCxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ2QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLENBQUMsQ0FBQTtnQkFDaEUsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixzQkFBc0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNwQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUNkLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FDOUMsQ0FBQTtnQkFDRixDQUFDO2dCQUNELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO29CQUM3Qiw2RUFBNkU7b0JBQzdFLDBCQUEwQjtvQkFDMUIsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7d0JBQ2pDLHNCQUFzQixHQUFHLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO29CQUMxRSxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsTUFBSztZQUNOLENBQUM7WUFDRCxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLHNCQUFzQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDeEUsTUFBSztZQUNOLENBQUM7WUFDRCxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLHNCQUFzQixHQUFHLEdBQUcsQ0FBQTtnQkFDNUIsTUFBSztZQUNOLENBQUM7UUFDRixDQUFDO1FBRUQseUZBQXlGO1FBQ3pGLHdDQUF3QztRQUN4QyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUM3QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsaUVBQWlFO1FBQ2pFLElBQUksT0FBTyxzQkFBc0IsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRCxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3hCLEtBQUssRUFBRSxjQUFjO2dCQUNyQixRQUFRO2dCQUNSLElBQUksRUFBRSwwQkFBMEIsQ0FBQyxNQUFNO2dCQUN2QyxNQUFNLEVBQUUsc0JBQXNCO2dCQUM5QixnQkFBZ0IsRUFBRSxjQUFjLEdBQUcsUUFBUSxDQUFDLE1BQU07Z0JBQ2xELGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxNQUFNO2FBQ2xDLENBQUMsQ0FBQTtZQUNGLE9BQU8sbUJBQW1CLENBQUE7UUFDM0IsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEVBQUU7WUFDcEUsNkJBQTZCLEVBQUUsSUFBSTtTQUNuQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ3JCLE9BQU07UUFDUCxDQUFDO1FBRUQscUZBQXFGO1FBQ3JGLGlGQUFpRjtRQUNqRixzQkFBc0I7UUFDdEIsRUFBRTtRQUNGLGdDQUFnQztRQUNoQyxxRkFBcUY7UUFDckYsdUZBQXVGO1FBQ3ZGLFVBQVU7UUFDVixxQ0FBcUM7UUFDckMsb0NBQW9DO1FBQ3BDLGlDQUFpQztRQUNqQyxxQ0FBcUM7UUFDckMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLElBQUksS0FBYSxDQUFBO1lBQ2pCLFFBQVEsSUFBSSxFQUFFLENBQUM7Z0JBQ2QsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUNkLEtBQUssR0FBRyxjQUFjLENBQUE7b0JBQ3RCLE1BQUs7Z0JBQ04sQ0FBQztnQkFDRCxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQ2pCLEtBQUssR0FBRyxjQUFjLENBQUE7b0JBQ3RCLE1BQUs7Z0JBQ04sQ0FBQztnQkFDRCxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQ2pCLEtBQUssR0FBRyxHQUFHLENBQUE7b0JBQ1gsSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUMvQixLQUFLLEdBQUcscUJBQXFCLENBQzVCLGNBQWMsRUFDZCxxQkFBcUIsRUFDckIsMEJBQTBCLENBQzFCLENBQUE7b0JBQ0YsQ0FBQztvQkFDRCxNQUFLO2dCQUNOLENBQUM7WUFDRixDQUFDO1lBRUQsbUJBQW1CLENBQUMsSUFBSSxDQUFDO2dCQUN4QixLQUFLO2dCQUNMLFFBQVE7Z0JBQ1IsSUFBSSxFQUFFLDBCQUEwQixDQUFDLE1BQU07Z0JBQ3ZDLE1BQU0sRUFBRSxlQUFlLENBQ3RCLHNCQUFzQixFQUN0QixxQkFBcUIsQ0FBQyxhQUFhLEVBQ25DLDBCQUEwQixDQUFDLE1BQU0sQ0FDakM7Z0JBQ0QsZ0JBQWdCLEVBQUUsY0FBYyxHQUFHLFFBQVEsQ0FBQyxNQUFNO2dCQUNsRCxpQkFBaUIsRUFBRSxRQUFRLENBQUMsTUFBTTthQUNsQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsMkNBQTJDO1FBQzNDLEVBQUU7UUFDRix3REFBd0Q7UUFDeEQseURBQXlEO1FBQ3pELHdEQUF3RDtRQUN4RCxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxJQUFJLElBQTRDLENBQUE7WUFDaEQsSUFBSSxnQkFBZ0IsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzNDLElBQUksR0FBRywwQkFBMEIsQ0FBQyxNQUFNLENBQUE7WUFDekMsQ0FBQztpQkFBTSxJQUFJLGNBQWMsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzNDLElBQUksR0FBRywwQkFBMEIsQ0FBQyxJQUFJLENBQUE7WUFDdkMsQ0FBQztZQUNELElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN4QixTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksS0FBSyxHQUFHLGNBQWMsQ0FBQTtZQUMxQixJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUM5RSxLQUFLLElBQUkscUJBQXFCLENBQUMsYUFBYSxDQUFBO1lBQzdDLENBQUM7WUFDRCxLQUFLLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQTtZQUNuQixJQUFJLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDekIsS0FBSyxHQUFHLHFCQUFxQixDQUFDLEtBQUssRUFBRSxxQkFBcUIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1lBQ3hGLENBQUM7WUFDRCxJQUFJLEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7Z0JBQy9FLEtBQUssSUFBSSxxQkFBcUIsQ0FBQyxhQUFhLENBQUE7WUFDN0MsQ0FBQztZQUVELElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxTQUFTLEdBQ2QsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtnQkFDNUUsSUFBSSxTQUFTLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7b0JBQ3RELFNBQVE7Z0JBQ1QsQ0FBQztZQUNGLENBQUM7WUFFRCxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3hCLEtBQUs7Z0JBQ0wsUUFBUTtnQkFDUixJQUFJO2dCQUNKLE1BQU0sRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDO2dCQUNsRixnQkFBZ0IsRUFBRSxjQUFjLEdBQUcsUUFBUSxDQUFDLE1BQU07Z0JBQ2xELGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxNQUFNO2FBQ2xDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxzREFBc0Q7UUFDdEQsRUFBRTtRQUNGLG1GQUFtRjtRQUNuRixJQUFJLElBQUksS0FBSyxVQUFVLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUM3QyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsNEVBQWlDLENBQUE7Z0JBQ25GLElBQUksTUFBTSxLQUFLLFVBQVUsSUFBSSxNQUFNLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQ3BELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFBO29CQUN0RCxJQUFJLE1BQU0sRUFBRSxDQUFDO3dCQUNaLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7d0JBQ25FLEtBQUssTUFBTSxXQUFXLElBQUksYUFBYSxFQUFFLENBQUM7NEJBQ3pDLElBQUksQ0FBQztnQ0FDSixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUU7b0NBQ3ZFLDZCQUE2QixFQUFFLElBQUk7aUNBQ25DLENBQUMsQ0FBQTtnQ0FDRixJQUFJLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQztvQ0FDeEIsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7d0NBQ3ZDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7NENBQ3hCLFNBQVE7d0NBQ1QsQ0FBQzt3Q0FDRCxNQUFNLFdBQVcsR0FBRyxNQUFNLEtBQUssVUFBVSxDQUFBO3dDQUN6QyxNQUFNLElBQUksR0FBRywwQkFBMEIsQ0FBQyxNQUFNLENBQUE7d0NBQzlDLE1BQU0sS0FBSyxHQUFHLFdBQVc7NENBQ3hCLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7NENBQ2pDLENBQUMsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUE7d0NBQzdFLE1BQU0sTUFBTSxHQUFHLFdBQVc7NENBQ3pCLENBQUMsQ0FBQyxVQUFVLGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsRUFBRTs0Q0FDeEYsQ0FBQyxDQUFDLFFBQVEsQ0FBQTt3Q0FDWCxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7NENBQ3hCLEtBQUs7NENBQ0wsUUFBUTs0Q0FDUixJQUFJOzRDQUNKLE1BQU07NENBQ04sZ0JBQWdCLEVBQUUsY0FBYyxHQUFHLFFBQVEsQ0FBQyxNQUFNOzRDQUNsRCxpQkFBaUIsRUFBRSxRQUFRLENBQUMsTUFBTTt5Q0FDbEMsQ0FBQyxDQUFBO29DQUNILENBQUM7Z0NBQ0YsQ0FBQzs0QkFDRixDQUFDOzRCQUFDLE1BQU0sQ0FBQztnQ0FDUixZQUFZOzRCQUNiLENBQUM7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELGlHQUFpRztRQUNqRyxFQUFFO1FBQ0YsNEJBQTRCO1FBQzVCLHdDQUF3QztRQUN4QyxJQUFJLElBQUksS0FBSyxVQUFVLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUM3QyxJQUFJLEtBQUssR0FBRyxLQUFLLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQ3RELElBQUksY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsS0FBSyxHQUFHLHFCQUFxQixDQUM1QixjQUFjLEdBQUcsS0FBSyxFQUN0QixxQkFBcUIsRUFDckIsMEJBQTBCLENBQzFCLENBQUE7WUFDRixDQUFDO1lBQ0QsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxHQUFHLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQy9FLG1CQUFtQixDQUFDLElBQUksQ0FBQztnQkFDeEIsS0FBSztnQkFDTCxRQUFRO2dCQUNSLElBQUksRUFBRSwwQkFBMEIsQ0FBQyxNQUFNO2dCQUN2QyxNQUFNLEVBQUUsZUFBZSxDQUN0QixTQUFTLEVBQ1QscUJBQXFCLENBQUMsYUFBYSxFQUNuQywwQkFBMEIsQ0FBQyxNQUFNLENBQ2pDO2dCQUNELGdCQUFnQixFQUFFLGNBQWMsR0FBRyxRQUFRLENBQUMsTUFBTTtnQkFDbEQsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLE1BQU07YUFDbEMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELHlGQUF5RjtRQUN6RixTQUFTO1FBQ1QsRUFBRTtRQUNGLDBCQUEwQjtRQUMxQixJQUFJLElBQUksS0FBSyxVQUFVLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDNUQsSUFBSSxZQUFzQyxDQUFBO1lBQzFDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDaEUsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixZQUFZLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzVGLENBQUM7WUFDRCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25CLDZFQUE2RTtnQkFDN0UsMEJBQTBCO2dCQUMxQixZQUFZLEdBQUcsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7WUFDaEUsQ0FBQztZQUNELG1CQUFtQixDQUFDLElBQUksQ0FBQztnQkFDeEIsS0FBSyxFQUFFLEdBQUc7Z0JBQ1YsUUFBUTtnQkFDUixJQUFJLEVBQUUsMEJBQTBCLENBQUMsTUFBTTtnQkFDdkMsTUFBTSxFQUNMLE9BQU8sWUFBWSxLQUFLLFFBQVE7b0JBQy9CLENBQUMsQ0FBQyxZQUFZO29CQUNkLENBQUMsQ0FBQyxlQUFlLENBQ2YsWUFBWSxFQUNaLHFCQUFxQixDQUFDLGFBQWEsRUFDbkMsMEJBQTBCLENBQUMsTUFBTSxDQUNqQztnQkFDSixnQkFBZ0IsRUFBRSxjQUFjLEdBQUcsUUFBUSxDQUFDLE1BQU07Z0JBQ2xELGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxNQUFNO2FBQ2xDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLG1CQUFtQixDQUFBO0lBQzNCLENBQUM7SUFFTyxVQUFVLENBQUMsR0FBVyxFQUFFLFlBQXNDO1FBQ3JFLE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLDhDQUFzQyxFQUFFLEdBQUcsRUFBRSxLQUV4RSxDQUFBO1FBQ0QsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVPLFdBQVcsQ0FDbEIsbUJBQTRCLEVBQzVCLFlBQXNDO1FBRXRDLE9BQU8sbUJBQW1CO1lBQ3pCLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUM7WUFDOUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQ3pDLENBQUM7Q0FDRCxDQUFBO0FBaGhCWSx5QkFBeUI7SUEwQm5DLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxZQUFZLENBQUE7R0EzQkYseUJBQXlCLENBZ2hCckM7O0FBRUQsU0FBUyxlQUFlLENBQ3ZCLEdBQVEsRUFDUixhQUFxQixFQUNyQixJQUFnQztJQUVoQyxJQUFJLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO0lBQ3JCLHNGQUFzRjtJQUN0RixJQUFJLElBQUksS0FBSywwQkFBMEIsQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7UUFDakYsSUFBSSxJQUFJLGFBQWEsQ0FBQTtJQUN0QixDQUFDO0lBQ0QseUNBQXlDO0lBQ3pDLElBQUksYUFBYSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7UUFDMUQsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNuRCxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBUyxxQkFBcUIsQ0FDN0IsSUFBWSxFQUNaLHFCQUEyRSxFQUMzRSwwQkFBbUM7SUFFbkMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7UUFDakMsT0FBTyxJQUFJLHFCQUFxQixDQUFDLGFBQWEsR0FBRyxJQUFJLEVBQUUsQ0FBQTtJQUN4RCxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDIn0=
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
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { osPathModule, updateLinkWithRelativeCwd } from './terminalLinkHelpers.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { QueryBuilder } from '../../../../services/search/common/queryBuilder.js';
import { ISearchService } from '../../../../services/search/common/search.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { detectLinks, getLinkSuffix } from './terminalLinkParsing.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
let TerminalLocalFileLinkOpener = class TerminalLocalFileLinkOpener {
    constructor(_editorService) {
        this._editorService = _editorService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open file link without a resolved URI');
        }
        const linkSuffix = link.parsedLink ? link.parsedLink.suffix : getLinkSuffix(link.text);
        let selection = link.selection;
        if (!selection) {
            selection =
                linkSuffix?.row === undefined
                    ? undefined
                    : {
                        startLineNumber: linkSuffix.row ?? 1,
                        startColumn: linkSuffix.col ?? 1,
                        endLineNumber: linkSuffix.rowEnd,
                        endColumn: linkSuffix.colEnd,
                    };
        }
        await this._editorService.openEditor({
            resource: link.uri,
            options: { pinned: true, selection, revealIfOpened: true },
        });
    }
};
TerminalLocalFileLinkOpener = __decorate([
    __param(0, IEditorService)
], TerminalLocalFileLinkOpener);
export { TerminalLocalFileLinkOpener };
let TerminalLocalFolderInWorkspaceLinkOpener = class TerminalLocalFolderInWorkspaceLinkOpener {
    constructor(_commandService) {
        this._commandService = _commandService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open folder in workspace link without a resolved URI');
        }
        await this._commandService.executeCommand('revealInExplorer', link.uri);
    }
};
TerminalLocalFolderInWorkspaceLinkOpener = __decorate([
    __param(0, ICommandService)
], TerminalLocalFolderInWorkspaceLinkOpener);
export { TerminalLocalFolderInWorkspaceLinkOpener };
let TerminalLocalFolderOutsideWorkspaceLinkOpener = class TerminalLocalFolderOutsideWorkspaceLinkOpener {
    constructor(_hostService) {
        this._hostService = _hostService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open folder in workspace link without a resolved URI');
        }
        this._hostService.openWindow([{ folderUri: link.uri }], { forceNewWindow: true });
    }
};
TerminalLocalFolderOutsideWorkspaceLinkOpener = __decorate([
    __param(0, IHostService)
], TerminalLocalFolderOutsideWorkspaceLinkOpener);
export { TerminalLocalFolderOutsideWorkspaceLinkOpener };
let TerminalSearchLinkOpener = class TerminalSearchLinkOpener {
    constructor(_capabilities, _initialCwd, _localFileOpener, _localFolderInWorkspaceOpener, _getOS, _fileService, instantiationService, _quickInputService, _searchService, _logService, _workbenchEnvironmentService, _workspaceContextService) {
        this._capabilities = _capabilities;
        this._initialCwd = _initialCwd;
        this._localFileOpener = _localFileOpener;
        this._localFolderInWorkspaceOpener = _localFolderInWorkspaceOpener;
        this._getOS = _getOS;
        this._fileService = _fileService;
        this._quickInputService = _quickInputService;
        this._searchService = _searchService;
        this._logService = _logService;
        this._workbenchEnvironmentService = _workbenchEnvironmentService;
        this._workspaceContextService = _workspaceContextService;
        this._fileQueryBuilder = instantiationService.createInstance(QueryBuilder);
    }
    async open(link) {
        const osPath = osPathModule(this._getOS());
        const pathSeparator = osPath.sep;
        // Remove file:/// and any leading ./ or ../ since quick access doesn't understand that format
        let text = link.text.replace(/^file:\/\/\/?/, '');
        text = osPath.normalize(text).replace(/^(\.+[\\/])+/, '');
        // Try extract any trailing line and column numbers by matching the text against parsed
        // links. This will give a search link `foo` on a line like `"foo", line 10` to open the
        // quick pick with `foo:10` as the contents.
        //
        // This also normalizes the path to remove suffixes like :10 or :5.0-4
        if (link.contextLine) {
            const parsedLinks = detectLinks(link.contextLine, this._getOS());
            // Optimistically check that the link _starts with_ the parsed link text. If so,
            // continue to use the parsed link
            const matchingParsedLink = parsedLinks.find((parsedLink) => parsedLink.suffix && link.text.startsWith(parsedLink.path.text));
            if (matchingParsedLink) {
                if (matchingParsedLink.suffix?.row !== undefined) {
                    // Normalize the path based on the parsed link
                    text = matchingParsedLink.path.text;
                    text += `:${matchingParsedLink.suffix.row}`;
                    if (matchingParsedLink.suffix?.col !== undefined) {
                        text += `:${matchingParsedLink.suffix.col}`;
                    }
                }
            }
        }
        // Remove `:<one or more non number characters>` from the end of the link.
        // Examples:
        // - Ruby stack traces: <link>:in ...
        // - Grep output: <link>:<result line>
        // This only happens when the colon is _not_ followed by a forward- or back-slash as that
        // would break absolute Windows paths (eg. `C:/Users/...`).
        text = text.replace(/:[^\\/\d][^\d]*$/, '');
        // Remove any trailing periods after the line/column numbers, to prevent breaking the search feature, #200257
        // Examples:
        // "Check your code Test.tsx:12:45." -> Test.tsx:12:45
        // "Check your code Test.tsx:12." -> Test.tsx:12
        text = text.replace(/\.$/, '');
        // If any of the names of the folders in the workspace matches
        // a prefix of the link, remove that prefix and continue
        this._workspaceContextService.getWorkspace().folders.forEach((folder) => {
            if (text.substring(0, folder.name.length + 1) === folder.name + pathSeparator) {
                text = text.substring(folder.name.length + 1);
                return;
            }
        });
        let cwdResolvedText = text;
        if (this._capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            cwdResolvedText =
                updateLinkWithRelativeCwd(this._capabilities, link.bufferRange.start.y, text, osPath, this._logService)?.[0] || text;
        }
        // Try open the cwd resolved link first
        if (await this._tryOpenExactLink(cwdResolvedText, link)) {
            return;
        }
        // If the cwd resolved text didn't match, try find the link without the cwd resolved, for
        // example when a command prints paths in a sub-directory of the current cwd
        if (text !== cwdResolvedText) {
            if (await this._tryOpenExactLink(text, link)) {
                return;
            }
        }
        // Fallback to searching quick access
        return this._quickInputService.quickAccess.show(text);
    }
    async _getExactMatch(sanitizedLink) {
        // Make the link relative to the cwd if it isn't absolute
        const os = this._getOS();
        const pathModule = osPathModule(os);
        const isAbsolute = pathModule.isAbsolute(sanitizedLink);
        let absolutePath = isAbsolute ? sanitizedLink : undefined;
        if (!isAbsolute && this._initialCwd.length > 0) {
            absolutePath = pathModule.join(this._initialCwd, sanitizedLink);
        }
        // Try open as an absolute link
        let resourceMatch;
        if (absolutePath) {
            let normalizedAbsolutePath = absolutePath;
            if (os === 1 /* OperatingSystem.Windows */) {
                normalizedAbsolutePath = absolutePath.replace(/\\/g, '/');
                if (normalizedAbsolutePath.match(/[a-z]:/i)) {
                    normalizedAbsolutePath = `/${normalizedAbsolutePath}`;
                }
            }
            let uri;
            if (this._workbenchEnvironmentService.remoteAuthority) {
                uri = URI.from({
                    scheme: Schemas.vscodeRemote,
                    authority: this._workbenchEnvironmentService.remoteAuthority,
                    path: normalizedAbsolutePath,
                });
            }
            else {
                uri = URI.file(normalizedAbsolutePath);
            }
            try {
                const fileStat = await this._fileService.stat(uri);
                resourceMatch = { uri, isDirectory: fileStat.isDirectory };
            }
            catch {
                // File or dir doesn't exist, continue on
            }
        }
        // Search the workspace if an exact match based on the absolute path was not found
        if (!resourceMatch) {
            const results = await this._searchService.fileSearch(this._fileQueryBuilder.file(this._workspaceContextService.getWorkspace().folders, {
                filePattern: sanitizedLink,
                maxResults: 2,
            }));
            if (results.results.length > 0) {
                if (results.results.length === 1) {
                    // If there's exactly 1 search result, return it regardless of whether it's
                    // exact or partial.
                    resourceMatch = { uri: results.results[0].resource };
                }
                else if (!isAbsolute) {
                    // For non-absolute links, exact link matching is allowed only if there is a single an exact
                    // file match. For example searching for `foo.txt` when there is no cwd information
                    // available (ie. only the initial cwd) should open the file directly only if there is a
                    // single file names `foo.txt` anywhere within the folder. These same rules apply to
                    // relative paths with folders such as `src/foo.txt`.
                    const results = await this._searchService.fileSearch(this._fileQueryBuilder.file(this._workspaceContextService.getWorkspace().folders, {
                        filePattern: `**/${sanitizedLink}`,
                    }));
                    // Find an exact match if it exists
                    const exactMatches = results.results.filter((e) => e.resource.toString().endsWith(sanitizedLink));
                    if (exactMatches.length === 1) {
                        resourceMatch = { uri: exactMatches[0].resource };
                    }
                }
            }
        }
        return resourceMatch;
    }
    async _tryOpenExactLink(text, link) {
        const sanitizedLink = text.replace(/:\d+(:\d+)?$/, '');
        try {
            const result = await this._getExactMatch(sanitizedLink);
            if (result) {
                const { uri, isDirectory } = result;
                const linkToOpen = {
                    // Use the absolute URI's path here so the optional line/col get detected
                    text: result.uri.path + (text.match(/:\d+(:\d+)?$/)?.[0] || ''),
                    uri,
                    bufferRange: link.bufferRange,
                    type: link.type,
                };
                if (uri) {
                    await (isDirectory
                        ? this._localFolderInWorkspaceOpener.open(linkToOpen)
                        : this._localFileOpener.open(linkToOpen));
                    return true;
                }
            }
        }
        catch {
            return false;
        }
        return false;
    }
};
TerminalSearchLinkOpener = __decorate([
    __param(5, IFileService),
    __param(6, IInstantiationService),
    __param(7, IQuickInputService),
    __param(8, ISearchService),
    __param(9, ITerminalLogService),
    __param(10, IWorkbenchEnvironmentService),
    __param(11, IWorkspaceContextService)
], TerminalSearchLinkOpener);
export { TerminalSearchLinkOpener };
let TerminalUrlLinkOpener = class TerminalUrlLinkOpener {
    constructor(_isRemote, _openerService, _configurationService) {
        this._isRemote = _isRemote;
        this._openerService = _openerService;
        this._configurationService = _configurationService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open a url without a resolved URI');
        }
        // It's important to use the raw string value here to avoid converting pre-encoded values
        // from the URL like `%2B` -> `+`.
        this._openerService.open(link.text, {
            allowTunneling: this._isRemote && this._configurationService.getValue('remote.forwardOnOpen'),
            allowContributedOpeners: true,
            openExternal: true,
        });
    }
};
TerminalUrlLinkOpener = __decorate([
    __param(1, IOpenerService),
    __param(2, IConfigurationService)
], TerminalUrlLinkOpener);
export { TerminalUrlLinkOpener };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rT3BlbmVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsTGlua09wZW5lcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFLbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQzVHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUEr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
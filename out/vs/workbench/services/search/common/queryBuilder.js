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
import * as arrays from '../../../../base/common/arrays.js';
import * as collections from '../../../../base/common/collections.js';
import * as glob from '../../../../base/common/glob.js';
import { untildify } from '../../../../base/common/labels.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import * as path from '../../../../base/common/path.js';
import { isEqual, basename, relativePath, isAbsolutePath, } from '../../../../base/common/resources.js';
import * as strings from '../../../../base/common/strings.js';
import { assertIsDefined, isDefined } from '../../../../base/common/types.js';
import { URI, URI as uri } from '../../../../base/common/uri.js';
import { isMultilineRegexSource } from '../../../../editor/common/model/textModelSearch.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService, toWorkspaceFolder, } from '../../../../platform/workspace/common/workspace.js';
import { IEditorGroupsService } from '../../editor/common/editorGroupsService.js';
import { IPathService } from '../../path/common/pathService.js';
import { getExcludes, pathIncludedInQuery, } from './search.js';
export function isISearchPatternBuilder(object) {
    return typeof object === 'object' && 'uri' in object && 'pattern' in object;
}
export function globPatternToISearchPatternBuilder(globPattern) {
    if (typeof globPattern === 'string') {
        return {
            pattern: globPattern,
        };
    }
    return {
        pattern: globPattern.pattern,
        uri: globPattern.baseUri,
    };
}
let QueryBuilder = class QueryBuilder {
    constructor(configurationService, workspaceContextService, editorGroupsService, logService, pathService, uriIdentityService) {
        this.configurationService = configurationService;
        this.workspaceContextService = workspaceContextService;
        this.editorGroupsService = editorGroupsService;
        this.logService = logService;
        this.pathService = pathService;
        this.uriIdentityService = uriIdentityService;
    }
    aiText(contentPattern, folderResources, options = {}) {
        const commonQuery = this.commonQuery(folderResources?.map(toWorkspaceFolder), options);
        return {
            ...commonQuery,
            type: 3 /* QueryType.aiText */,
            contentPattern,
        };
    }
    text(contentPattern, folderResources, options = {}) {
        contentPattern = this.getContentPattern(contentPattern, options);
        const searchConfig = this.configurationService.getValue();
        const fallbackToPCRE = folderResources &&
            folderResources.some((folder) => {
                const folderConfig = this.configurationService.getValue({
                    resource: folder,
                });
                return !folderConfig.search.useRipgrep;
            });
        const commonQuery = this.commonQuery(folderResources?.map(toWorkspaceFolder), options);
        return {
            ...commonQuery,
            type: 2 /* QueryType.Text */,
            contentPattern,
            previewOptions: options.previewOptions,
            maxFileSize: options.maxFileSize,
            usePCRE2: searchConfig.search.usePCRE2 || fallbackToPCRE || false,
            surroundingContext: options.surroundingContext,
            userDisabledExcludesAndIgnoreFiles: options.disregardExcludeSettings && options.disregardIgnoreFiles,
        };
    }
    /**
     * Adjusts input pattern for config
     */
    getContentPattern(inputPattern, options) {
        const searchConfig = this.configurationService.getValue();
        if (inputPattern.isRegExp) {
            inputPattern.pattern = inputPattern.pattern.replace(/\r?\n/g, '\\n');
        }
        const newPattern = {
            ...inputPattern,
            wordSeparators: searchConfig.editor.wordSeparators,
        };
        if (this.isCaseSensitive(inputPattern, options)) {
            newPattern.isCaseSensitive = true;
        }
        if (this.isMultiline(inputPattern)) {
            newPattern.isMultiline = true;
        }
        if (options.notebookSearchConfig?.includeMarkupInput) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookMarkdownInput =
                options.notebookSearchConfig.includeMarkupInput;
        }
        if (options.notebookSearchConfig?.includeMarkupPreview) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookMarkdownPreview =
                options.notebookSearchConfig.includeMarkupPreview;
        }
        if (options.notebookSearchConfig?.includeCodeInput) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookCellInput = options.notebookSearchConfig.includeCodeInput;
        }
        if (options.notebookSearchConfig?.includeOutput) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookCellOutput = options.notebookSearchConfig.includeOutput;
        }
        return newPattern;
    }
    file(folders, options = {}) {
        const commonQuery = this.commonQuery(folders, options);
        return {
            ...commonQuery,
            type: 1 /* QueryType.File */,
            filePattern: options.filePattern ? options.filePattern.trim() : options.filePattern,
            exists: options.exists,
            sortByScore: options.sortByScore,
            cacheKey: options.cacheKey,
            shouldGlobMatchFilePattern: options.shouldGlobSearch,
        };
    }
    handleIncludeExclude(pattern, expandPatterns) {
        if (!pattern) {
            return {};
        }
        if (Array.isArray(pattern)) {
            pattern = pattern.filter((p) => p.length > 0).map(normalizeSlashes);
            if (!pattern.length) {
                return {};
            }
        }
        else {
            pattern = normalizeSlashes(pattern);
        }
        return expandPatterns
            ? this.parseSearchPaths(pattern)
            : { pattern: patternListToIExpression(...(Array.isArray(pattern) ? pattern : [pattern])) };
    }
    commonQuery(folderResources = [], options = {}) {
        let excludePatterns = Array.isArray(options.excludePattern)
            ? options.excludePattern.map((p) => p.pattern).flat()
            : options.excludePattern;
        excludePatterns = excludePatterns?.length === 1 ? excludePatterns[0] : excludePatterns;
        const includeSearchPathsInfo = this.handleIncludeExclude(options.includePattern, options.expandPatterns);
        const excludeSearchPathsInfo = this.handleIncludeExclude(excludePatterns, options.expandPatterns);
        // Build folderQueries from searchPaths, if given, otherwise folderResources
        const includeFolderName = folderResources.length > 1;
        const folderQueries = (includeSearchPathsInfo.searchPaths && includeSearchPathsInfo.searchPaths.length
            ? includeSearchPathsInfo.searchPaths.map((searchPath) => this.getFolderQueryForSearchPath(searchPath, options, excludeSearchPathsInfo))
            : folderResources.map((folder) => this.getFolderQueryForRoot(folder, options, excludeSearchPathsInfo, includeFolderName))).filter((query) => !!query);
        const queryProps = {
            _reason: options._reason,
            folderQueries,
            usingSearchPaths: !!(includeSearchPathsInfo.searchPaths && includeSearchPathsInfo.searchPaths.length),
            extraFileResources: options.extraFileResources,
            excludePattern: excludeSearchPathsInfo.pattern,
            includePattern: includeSearchPathsInfo.pattern,
            onlyOpenEditors: options.onlyOpenEditors,
            maxResults: options.maxResults,
            onlyFileScheme: options.onlyFileScheme,
        };
        if (options.onlyOpenEditors) {
            const openEditors = arrays.coalesce(this.editorGroupsService.groups.flatMap((group) => group.editors.map((editor) => editor.resource)));
            this.logService.trace('QueryBuilder#commonQuery - openEditor URIs', JSON.stringify(openEditors));
            const openEditorsInQuery = openEditors.filter((editor) => pathIncludedInQuery(queryProps, editor.fsPath));
            const openEditorsQueryProps = this.commonQueryFromFileList(openEditorsInQuery);
            this.logService.trace('QueryBuilder#commonQuery - openEditor Query', JSON.stringify(openEditorsQueryProps));
            return { ...queryProps, ...openEditorsQueryProps };
        }
        // Filter extraFileResources against global include/exclude patterns - they are already expected to not belong to a workspace
        const extraFileResources = options.extraFileResources &&
            options.extraFileResources.filter((extraFile) => pathIncludedInQuery(queryProps, extraFile.fsPath));
        queryProps.extraFileResources =
            extraFileResources && extraFileResources.length ? extraFileResources : undefined;
        return queryProps;
    }
    commonQueryFromFileList(files) {
        const folderQueries = [];
        const foldersToSearch = new ResourceMap();
        const includePattern = {};
        let hasIncludedFile = false;
        files.forEach((file) => {
            if (file.scheme === Schemas.walkThrough) {
                return;
            }
            const providerExists = isAbsolutePath(file);
            // Special case userdata as we don't have a search provider for it, but it can be searched.
            if (providerExists) {
                const searchRoot = this.workspaceContextService.getWorkspaceFolder(file)?.uri ??
                    this.uriIdentityService.extUri.dirname(file);
                let folderQuery = foldersToSearch.get(searchRoot);
                if (!folderQuery) {
                    hasIncludedFile = true;
                    folderQuery = { folder: searchRoot, includePattern: {} };
                    folderQueries.push(folderQuery);
                    foldersToSearch.set(searchRoot, folderQuery);
                }
                const relPath = path.relative(searchRoot.fsPath, file.fsPath);
                assertIsDefined(folderQuery.includePattern)[relPath.replace(/\\/g, '/')] = true;
            }
            else {
                if (file.fsPath) {
                    hasIncludedFile = true;
                    includePattern[file.fsPath] = true;
                }
            }
        });
        return {
            folderQueries,
            includePattern,
            usingSearchPaths: true,
            excludePattern: hasIncludedFile ? undefined : { '**/*': true },
        };
    }
    /**
     * Resolve isCaseSensitive flag based on the query and the isSmartCase flag, for search providers that don't support smart case natively.
     */
    isCaseSensitive(contentPattern, options) {
        if (options.isSmartCase) {
            if (contentPattern.isRegExp) {
                // Consider it case sensitive if it contains an unescaped capital letter
                if (strings.containsUppercaseCharacter(contentPattern.pattern, true)) {
                    return true;
                }
            }
            else if (strings.containsUppercaseCharacter(contentPattern.pattern)) {
                return true;
            }
        }
        return !!contentPattern.isCaseSensitive;
    }
    isMultiline(contentPattern) {
        if (contentPattern.isMultiline) {
            return true;
        }
        if (contentPattern.isRegExp && isMultilineRegexSource(contentPattern.pattern)) {
            return true;
        }
        if (contentPattern.pattern.indexOf('\n') >= 0) {
            return true;
        }
        return !!contentPattern.isMultiline;
    }
    /**
     * Take the includePattern as seen in the search viewlet, and split into components that look like searchPaths, and
     * glob patterns. Glob patterns are expanded from 'foo/bar' to '{foo/bar/**, **\/foo/bar}.
     *
     * Public for test.
     */
    parseSearchPaths(pattern) {
        const isSearchPath = (segment) => {
            // A segment is a search path if it is an absolute path or starts with ./, ../, .\, or ..\
            return path.isAbsolute(segment) || /^\.\.?([\/\\]|$)/.test(segment);
        };
        const patterns = Array.isArray(pattern) ? pattern : splitGlobPattern(pattern);
        const segments = patterns.map((segment) => {
            const userHome = this.pathService.resolvedUserHome;
            if (userHome) {
                return untildify(segment, userHome.scheme === Schemas.file ? userHome.fsPath : userHome.path);
            }
            return segment;
        });
        const groups = collections.groupBy(segments, (segment) => isSearchPath(segment) ? 'searchPaths' : 'exprSegments');
        const expandedExprSegments = (groups.exprSegments || [])
            .map((s) => strings.rtrim(s, '/'))
            .map((s) => strings.rtrim(s, '\\'))
            .map((p) => {
            if (p[0] === '.') {
                p = '*' + p; // convert ".js" to "*.js"
            }
            return expandGlobalGlob(p);
        });
        const result = {};
        const searchPaths = this.expandSearchPathPatterns(groups.searchPaths || []);
        if (searchPaths && searchPaths.length) {
            result.searchPaths = searchPaths;
        }
        const exprSegments = expandedExprSegments.flat();
        const includePattern = patternListToIExpression(...exprSegments);
        if (includePattern) {
            result.pattern = includePattern;
        }
        return result;
    }
    getExcludesForFolder(folderConfig, options) {
        return options.disregardExcludeSettings
            ? undefined
            : getExcludes(folderConfig, !options.disregardSearchExcludeSettings);
    }
    /**
     * Split search paths (./ or ../ or absolute paths in the includePatterns) into absolute paths and globs applied to those paths
     */
    expandSearchPathPatterns(searchPaths) {
        if (!searchPaths || !searchPaths.length) {
            // No workspace => ignore search paths
            return [];
        }
        const expandedSearchPaths = searchPaths.flatMap((searchPath) => {
            // 1 open folder => just resolve the search paths to absolute paths
            let { pathPortion, globPortion } = splitGlobFromPath(searchPath);
            if (globPortion) {
                globPortion = normalizeGlobPattern(globPortion);
            }
            // One pathPortion to multiple expanded search paths (e.g. duplicate matching workspace folders)
            const oneExpanded = this.expandOneSearchPath(pathPortion);
            // Expanded search paths to multiple resolved patterns (with ** and without)
            return oneExpanded.flatMap((oneExpandedResult) => this.resolveOneSearchPathPattern(oneExpandedResult, globPortion));
        });
        const searchPathPatternMap = new Map();
        expandedSearchPaths.forEach((oneSearchPathPattern) => {
            const key = oneSearchPathPattern.searchPath.toString();
            const existing = searchPathPatternMap.get(key);
            if (existing) {
                if (oneSearchPathPattern.pattern) {
                    existing.pattern = existing.pattern || {};
                    existing.pattern[oneSearchPathPattern.pattern] = true;
                }
            }
            else {
                searchPathPatternMap.set(key, {
                    searchPath: oneSearchPathPattern.searchPath,
                    pattern: oneSearchPathPattern.pattern
                        ? patternListToIExpression(oneSearchPathPattern.pattern)
                        : undefined,
                });
            }
        });
        return Array.from(searchPathPatternMap.values());
    }
    /**
     * Takes a searchPath like `./a/foo` or `../a/foo` and expands it to absolute paths for all the workspaces it matches.
     */
    expandOneSearchPath(searchPath) {
        if (path.isAbsolute(searchPath)) {
            const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
            if (workspaceFolders[0] && workspaceFolders[0].uri.scheme !== Schemas.file) {
                return [
                    {
                        searchPath: workspaceFolders[0].uri.with({ path: searchPath }),
                    },
                ];
            }
            // Currently only local resources can be searched for with absolute search paths.
            // TODO convert this to a workspace folder + pattern, so excludes will be resolved properly for an absolute path inside a workspace folder
            return [
                {
                    searchPath: uri.file(path.normalize(searchPath)),
                },
            ];
        }
        if (this.workspaceContextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            const workspaceUri = this.workspaceContextService.getWorkspace().folders[0].uri;
            searchPath = normalizeSlashes(searchPath);
            if (searchPath.startsWith('../') || searchPath === '..') {
                const resolvedPath = path.posix.resolve(workspaceUri.path, searchPath);
                return [
                    {
                        searchPath: workspaceUri.with({ path: resolvedPath }),
                    },
                ];
            }
            const cleanedPattern = normalizeGlobPattern(searchPath);
            return [
                {
                    searchPath: workspaceUri,
                    pattern: cleanedPattern,
                },
            ];
        }
        else if (searchPath === './' || searchPath === '.\\') {
            return []; // ./ or ./**/foo makes sense for single-folder but not multi-folder workspaces
        }
        else {
            const searchPathWithoutDotSlash = searchPath.replace(/^\.[\/\\]/, '');
            const folders = this.workspaceContextService.getWorkspace().folders;
            const folderMatches = folders
                .map((folder) => {
                const match = searchPathWithoutDotSlash.match(new RegExp(`^${strings.escapeRegExpCharacters(folder.name)}(?:/(.*)|$)`));
                return match
                    ? {
                        match,
                        folder,
                    }
                    : null;
            })
                .filter(isDefined);
            if (folderMatches.length) {
                return folderMatches.map((match) => {
                    const patternMatch = match.match[1];
                    return {
                        searchPath: match.folder.uri,
                        pattern: patternMatch && normalizeGlobPattern(patternMatch),
                    };
                });
            }
            else {
                const probableWorkspaceFolderNameMatch = searchPath.match(/\.[\/\\](.+)[\/\\]?/);
                const probableWorkspaceFolderName = probableWorkspaceFolderNameMatch
                    ? probableWorkspaceFolderNameMatch[1]
                    : searchPath;
                // No root folder with name
                const searchPathNotFoundError = nls.localize('search.noWorkspaceWithName', 'Workspace folder does not exist: {0}', probableWorkspaceFolderName);
                throw new Error(searchPathNotFoundError);
            }
        }
    }
    resolveOneSearchPathPattern(oneExpandedResult, globPortion) {
        const pattern = oneExpandedResult.pattern && globPortion
            ? `${oneExpandedResult.pattern}/${globPortion}`
            : oneExpandedResult.pattern || globPortion;
        const results = [
            {
                searchPath: oneExpandedResult.searchPath,
                pattern,
            },
        ];
        if (pattern && !pattern.endsWith('**')) {
            results.push({
                searchPath: oneExpandedResult.searchPath,
                pattern: pattern + '/**',
            });
        }
        return results;
    }
    getFolderQueryForSearchPath(searchPath, options, searchPathExcludes) {
        const rootConfig = this.getFolderQueryForRoot(toWorkspaceFolder(searchPath.searchPath), options, searchPathExcludes, false);
        if (!rootConfig) {
            return null;
        }
        return {
            ...rootConfig,
            ...{
                includePattern: searchPath.pattern,
            },
        };
    }
    getFolderQueryForRoot(folder, options, searchPathExcludes, includeFolderName) {
        let thisFolderExcludeSearchPathPattern;
        const folderUri = URI.isUri(folder) ? folder : folder.uri;
        // only use exclude root if it is different from the folder root
        let excludeFolderRoots = options.excludePattern?.map((excludePattern) => {
            const excludeRoot = options.excludePattern && isISearchPatternBuilder(excludePattern)
                ? excludePattern.uri
                : undefined;
            const shouldUseExcludeRoot = !excludeRoot ||
                !(URI.isUri(folder) && this.uriIdentityService.extUri.isEqual(folder, excludeRoot));
            return shouldUseExcludeRoot ? excludeRoot : undefined;
        });
        if (!excludeFolderRoots?.length) {
            excludeFolderRoots = [undefined];
        }
        if (searchPathExcludes.searchPaths) {
            const thisFolderExcludeSearchPath = searchPathExcludes.searchPaths.filter((sp) => isEqual(sp.searchPath, folderUri))[0];
            if (thisFolderExcludeSearchPath && !thisFolderExcludeSearchPath.pattern) {
                // entire folder is excluded
                return null;
            }
            else if (thisFolderExcludeSearchPath) {
                thisFolderExcludeSearchPathPattern = thisFolderExcludeSearchPath.pattern;
            }
        }
        const folderConfig = this.configurationService.getValue({
            resource: folderUri,
        });
        const settingExcludes = this.getExcludesForFolder(folderConfig, options);
        const excludePattern = {
            ...(settingExcludes || {}),
            ...(thisFolderExcludeSearchPathPattern || {}),
        };
        const folderName = URI.isUri(folder) ? basename(folder) : folder.name;
        const excludePatternRet = excludeFolderRoots
            .map((excludeFolderRoot) => {
            return Object.keys(excludePattern).length > 0
                ? {
                    folder: excludeFolderRoot,
                    pattern: excludePattern,
                }
                : undefined;
        })
            .filter((e) => e);
        return {
            folder: folderUri,
            folderName: includeFolderName ? folderName : undefined,
            excludePattern: excludePatternRet,
            fileEncoding: folderConfig.files && folderConfig.files.encoding,
            disregardIgnoreFiles: typeof options.disregardIgnoreFiles === 'boolean'
                ? options.disregardIgnoreFiles
                : !folderConfig.search.useIgnoreFiles,
            disregardGlobalIgnoreFiles: typeof options.disregardGlobalIgnoreFiles === 'boolean'
                ? options.disregardGlobalIgnoreFiles
                : !folderConfig.search.useGlobalIgnoreFiles,
            disregardParentIgnoreFiles: typeof options.disregardParentIgnoreFiles === 'boolean'
                ? options.disregardParentIgnoreFiles
                : !folderConfig.search.useParentIgnoreFiles,
            ignoreSymlinks: typeof options.ignoreSymlinks === 'boolean'
                ? options.ignoreSymlinks
                : !folderConfig.search.followSymlinks,
        };
    }
};
QueryBuilder = __decorate([
    __param(0, IConfigurationService),
    __param(1, IWorkspaceContextService),
    __param(2, IEditorGroupsService),
    __param(3, ILogService),
    __param(4, IPathService),
    __param(5, IUriIdentityService)
], QueryBuilder);
export { QueryBuilder };
function splitGlobFromPath(searchPath) {
    const globCharMatch = searchPath.match(/[\*\{\}\(\)\[\]\?]/);
    if (globCharMatch) {
        const globCharIdx = globCharMatch.index;
        const lastSlashMatch = searchPath.substr(0, globCharIdx).match(/[/|\\][^/\\]*$/);
        if (lastSlashMatch) {
            let pathPortion = searchPath.substr(0, lastSlashMatch.index);
            if (!pathPortion.match(/[/\\]/)) {
                // If the last slash was the only slash, then we now have '' or 'C:' or '.'. Append a slash.
                pathPortion += '/';
            }
            return {
                pathPortion,
                globPortion: searchPath.substr((lastSlashMatch.index || 0) + 1),
            };
        }
    }
    // No glob char, or malformed
    return {
        pathPortion: searchPath,
    };
}
function patternListToIExpression(...patterns) {
    return patterns.length
        ? patterns.reduce((glob, cur) => {
            glob[cur] = true;
            return glob;
        }, Object.create(null))
        : undefined;
}
function splitGlobPattern(pattern) {
    return glob
        .splitGlobAware(pattern, ',')
        .map((s) => s.trim())
        .filter((s) => !!s.length);
}
/**
 * Note - we used {} here previously but ripgrep can't handle nested {} patterns. See https://github.com/microsoft/vscode/issues/32761
 */
function expandGlobalGlob(pattern) {
    const patterns = [`**/${pattern}/**`, `**/${pattern}`];
    return patterns.map((p) => p.replace(/\*\*\/\*\*/g, '**'));
}
function normalizeSlashes(pattern) {
    return pattern.replace(/\\/g, '/');
}
/**
 * Normalize slashes, remove `./` and trailing slashes
 */
function normalizeGlobPattern(pattern) {
    return normalizeSlashes(pattern).replace(/^\.\//, '').replace(/\/+$/g, '');
}
/**
 * Escapes a path for use as a glob pattern that would match the input precisely.
 * Characters '?', '*', '[', and ']' are escaped into character range glob syntax
 * (for example, '?' becomes '[?]').
 * NOTE: This implementation makes no special cases for UNC paths. For example,
 * given the input "//?/C:/A?.txt", this would produce output '//[?]/C:/A[?].txt',
 * which may not be desirable in some cases. Use with caution if UNC paths could be expected.
 */
function escapeGlobPattern(path) {
    return path.replace(/([?*[\]])/g, '[$1]');
}
/**
 * Construct an include pattern from a list of folders uris to search in.
 */
export function resolveResourcesForSearchIncludes(resources, contextService) {
    resources = arrays.distinct(resources, (resource) => resource.toString());
    const folderPaths = [];
    const workspace = contextService.getWorkspace();
    if (resources) {
        resources.forEach((resource) => {
            let folderPath;
            if (contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                // Show relative path from the root for single-root mode
                folderPath = relativePath(workspace.folders[0].uri, resource); // always uses forward slashes
                if (folderPath && folderPath !== '.') {
                    folderPath = './' + folderPath;
                }
            }
            else {
                const owningFolder = contextService.getWorkspaceFolder(resource);
                if (owningFolder) {
                    const owningRootName = owningFolder.name;
                    // If this root is the only one with its basename, use a relative ./ path. If there is another, use an absolute path
                    const isUniqueFolder = workspace.folders.filter((folder) => folder.name === owningRootName).length === 1;
                    if (isUniqueFolder) {
                        const relPath = relativePath(owningFolder.uri, resource); // always uses forward slashes
                        if (relPath === '') {
                            folderPath = `./${owningFolder.name}`;
                        }
                        else {
                            folderPath = `./${owningFolder.name}/${relPath}`;
                        }
                    }
                    else {
                        folderPath = resource.fsPath; // TODO rob: handle non-file URIs
                    }
                }
            }
            if (folderPath) {
                folderPaths.push(escapeGlobPattern(folderPath));
            }
        });
    }
    return folderPaths;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlCdWlsZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vcXVlcnlCdWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxLQUFLLFdBQVcsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUNOLE9BQU8sRUFDUCxRQUFRLEVBQ1IsWUFBWSxFQUNaLGNBQWMsR0FDZCxNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDL0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDM0YsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FB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
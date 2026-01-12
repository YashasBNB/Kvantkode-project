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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlCdWlsZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9xdWVyeUJ1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEtBQUssV0FBVyxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sT0FBTyxFQUNQLFFBQVEsRUFDUixZQUFZLEVBQ1osY0FBYyxHQUNkLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNw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
/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { MAX_CHILDREN_URIs_PAGE, MAX_DIRSTR_CHARS_TOTAL_BEGINNING, MAX_DIRSTR_CHARS_TOTAL_TOOL, } from './prompt/prompts.js';
const MAX_FILES_TOTAL = 1000;
const START_MAX_DEPTH = Infinity;
const START_MAX_ITEMS_PER_DIR = Infinity; // Add start value as Infinity
const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_ITEMS_PER_DIR = 3;
export const IDirectoryStrService = createDecorator('voidDirectoryStrService');
// Check if it's a known filtered type like .git
const shouldExcludeDirectory = (name) => {
    if (name === '.git' ||
        name === 'node_modules' ||
        name.startsWith('.') ||
        name === 'dist' ||
        name === 'build' ||
        name === 'out' ||
        name === 'bin' ||
        name === 'coverage' ||
        name === '__pycache__' ||
        name === 'env' ||
        name === 'venv' ||
        name === 'tmp' ||
        name === 'temp' ||
        name === 'artifacts' ||
        name === 'target' ||
        name === 'obj' ||
        name === 'vendor' ||
        name === 'logs' ||
        name === 'cache' ||
        name === 'resource' ||
        name === 'resources') {
        return true;
    }
    if (name.match(/\bout\b/))
        return true;
    if (name.match(/\bbuild\b/))
        return true;
    return false;
};
// ---------- ONE LAYER DEEP ----------
export const computeDirectoryTree1Deep = async (fileService, rootURI, pageNumber = 1) => {
    const stat = await fileService.resolve(rootURI, { resolveMetadata: false });
    if (!stat.isDirectory) {
        return { children: null, hasNextPage: false, hasPrevPage: false, itemsRemaining: 0 };
    }
    const nChildren = stat.children?.length ?? 0;
    const fromChildIdx = MAX_CHILDREN_URIs_PAGE * (pageNumber - 1);
    const toChildIdx = MAX_CHILDREN_URIs_PAGE * pageNumber - 1; // INCLUSIVE
    const listChildren = stat.children?.slice(fromChildIdx, toChildIdx + 1);
    const children = listChildren?.map((child) => ({
        name: child.name,
        uri: child.resource,
        isDirectory: child.isDirectory,
        isSymbolicLink: child.isSymbolicLink,
    })) ?? [];
    const hasNextPage = nChildren - 1 > toChildIdx;
    const hasPrevPage = pageNumber > 1;
    const itemsRemaining = Math.max(0, nChildren - (toChildIdx + 1));
    return {
        children,
        hasNextPage,
        hasPrevPage,
        itemsRemaining,
    };
};
export const stringifyDirectoryTree1Deep = (params, result) => {
    if (!result.children) {
        return `Error: ${params.uri} is not a directory`;
    }
    let output = '';
    const entries = result.children;
    if (!result.hasPrevPage) {
        // is first page
        output += `${params.uri.fsPath}\n`;
    }
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const isLast = i === entries.length - 1 && !result.hasNextPage;
        const prefix = isLast ? '└── ' : '├── ';
        output += `${prefix}${entry.name}${entry.isDirectory ? '/' : ''}${entry.isSymbolicLink ? ' (symbolic link)' : ''}\n`;
    }
    if (result.hasNextPage) {
        output += `└── (${result.itemsRemaining} results remaining...)\n`;
    }
    return output;
};
// ---------- IN GENERAL ----------
const resolveChildren = async (children, fileService) => {
    const res = await fileService.resolveAll(children ?? []);
    const stats = res.map((s) => (s.success ? s.stat : null)).filter((s) => !!s);
    return stats;
};
// Remove the old computeDirectoryTree function and replace with a combined version that handles both computation and rendering
const computeAndStringifyDirectoryTree = async (eItem, fileService, MAX_CHARS, fileCount = { count: 0 }, options = {}) => {
    // Set default values for options
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const currentDepth = options.currentDepth ?? 0;
    const maxItemsPerDir = options.maxItemsPerDir ?? DEFAULT_MAX_ITEMS_PER_DIR;
    // Check if we've reached the max depth
    if (currentDepth > maxDepth) {
        return { content: '', wasCutOff: true };
    }
    // Check if we've reached the file limit
    if (fileCount.count >= MAX_FILES_TOTAL) {
        return { content: '', wasCutOff: true };
    }
    // If we're already exceeding the max characters, return immediately
    if (MAX_CHARS <= 0) {
        return { content: '', wasCutOff: true };
    }
    // Increment file count
    fileCount.count++;
    // Add the root node first (without tree characters)
    const nodeLine = `${eItem.name}${eItem.isDirectory ? '/' : ''}${eItem.isSymbolicLink ? ' (symbolic link)' : ''}\n`;
    if (nodeLine.length > MAX_CHARS) {
        return { content: '', wasCutOff: true };
    }
    let content = nodeLine;
    let wasCutOff = false;
    let remainingChars = MAX_CHARS - nodeLine.length;
    // Check if it's a directory we should skip
    const isGitIgnoredDirectory = eItem.isDirectory && shouldExcludeDirectory(eItem.name);
    // Fetch and process children if not a filtered directory
    if (eItem.isDirectory && !isGitIgnoredDirectory) {
        // Fetch children with Modified sort order to show recently modified first
        const eChildren = await resolveChildren(eItem.children, fileService);
        // Then recursively add all children with proper tree formatting
        if (eChildren && eChildren.length > 0) {
            const { childrenContent, childrenCutOff } = await renderChildrenCombined(eChildren, remainingChars, '', fileService, fileCount, { maxDepth, currentDepth, maxItemsPerDir });
            content += childrenContent;
            wasCutOff = childrenCutOff;
        }
    }
    return { content, wasCutOff };
};
// Helper function to render children with proper tree formatting
const renderChildrenCombined = async (children, maxChars, parentPrefix, fileService, fileCount, options) => {
    const { maxDepth, currentDepth } = options; // Remove maxItemsPerDir from destructuring
    // Get maxItemsPerDir separately and make sure we use it
    // For first level (currentDepth = 0), always use Infinity regardless of what was passed
    const maxItemsPerDir = currentDepth === 0 ? Infinity : (options.maxItemsPerDir ?? DEFAULT_MAX_ITEMS_PER_DIR);
    const nextDepth = currentDepth + 1;
    let childrenContent = '';
    let childrenCutOff = false;
    let remainingChars = maxChars;
    // Check if we've reached max depth
    if (nextDepth > maxDepth) {
        return { childrenContent: '', childrenCutOff: true };
    }
    // Apply maxItemsPerDir limit - only process the specified number of items
    const itemsToProcess = maxItemsPerDir === Infinity ? children : children.slice(0, maxItemsPerDir);
    const hasMoreItems = children.length > itemsToProcess.length;
    for (let i = 0; i < itemsToProcess.length; i++) {
        // Check if we've reached the file limit
        if (fileCount.count >= MAX_FILES_TOTAL) {
            childrenCutOff = true;
            break;
        }
        const child = itemsToProcess[i];
        const isLast = i === itemsToProcess.length - 1 && !hasMoreItems;
        // Create the tree branch symbols
        const branchSymbol = isLast ? '└── ' : '├── ';
        const childLine = `${parentPrefix}${branchSymbol}${child.name}${child.isDirectory ? '/' : ''}${child.isSymbolicLink ? ' (symbolic link)' : ''}\n`;
        // Check if adding this line would exceed the limit
        if (childLine.length > remainingChars) {
            childrenCutOff = true;
            break;
        }
        childrenContent += childLine;
        remainingChars -= childLine.length;
        fileCount.count++;
        const nextLevelPrefix = parentPrefix + (isLast ? '    ' : '│   ');
        // Skip processing children for git ignored directories
        const isGitIgnoredDirectory = child.isDirectory && shouldExcludeDirectory(child.name);
        // Create the prefix for the next level (continuation line or space)
        if (child.isDirectory && !isGitIgnoredDirectory) {
            // Fetch children with Modified sort order to show recently modified first
            const eChildren = await resolveChildren(child.children, fileService);
            if (eChildren && eChildren.length > 0) {
                const { childrenContent: grandChildrenContent, childrenCutOff: grandChildrenCutOff } = await renderChildrenCombined(eChildren, remainingChars, nextLevelPrefix, fileService, fileCount, { maxDepth, currentDepth: nextDepth, maxItemsPerDir });
                if (grandChildrenContent.length > 0) {
                    childrenContent += grandChildrenContent;
                    remainingChars -= grandChildrenContent.length;
                }
                if (grandChildrenCutOff) {
                    childrenCutOff = true;
                }
            }
        }
    }
    // Add a message if we truncated the items due to maxItemsPerDir
    if (hasMoreItems) {
        const remainingCount = children.length - itemsToProcess.length;
        const truncatedLine = `${parentPrefix}└── (${remainingCount} more items not shown...)\n`;
        if (truncatedLine.length <= remainingChars) {
            childrenContent += truncatedLine;
            remainingChars -= truncatedLine.length;
        }
        childrenCutOff = true;
    }
    return { childrenContent, childrenCutOff };
};
// ------------------------- FOLDERS -------------------------
export async function getAllUrisInDirectory(directoryUri, maxResults, fileService) {
    const result = [];
    // Helper function to recursively collect URIs
    async function visitAll(folderStat) {
        // Stop if we've reached the limit
        if (result.length >= maxResults) {
            return false;
        }
        try {
            if (!folderStat.isDirectory || !folderStat.children) {
                return true;
            }
            const eChildren = await resolveChildren(folderStat.children, fileService);
            // Process files first (common convention to list files before directories)
            for (const child of eChildren) {
                if (!child.isDirectory) {
                    result.push(child.resource);
                    // Check if we've hit the limit
                    if (result.length >= maxResults) {
                        return false;
                    }
                }
            }
            // Then process directories recursively
            for (const child of eChildren) {
                const isGitIgnored = shouldExcludeDirectory(child.name);
                if (child.isDirectory && !isGitIgnored) {
                    const shouldContinue = await visitAll(child);
                    if (!shouldContinue) {
                        return false;
                    }
                }
            }
            return true;
        }
        catch (error) {
            console.error(`Error processing directory ${folderStat.resource.fsPath}: ${error}`);
            return true; // Continue despite errors in a specific directory
        }
    }
    const rootStat = await fileService.resolve(directoryUri);
    await visitAll(rootStat);
    return result;
}
// --------------------------------------------------
let DirectoryStrService = class DirectoryStrService extends Disposable {
    constructor(workspaceContextService, fileService) {
        super();
        this.workspaceContextService = workspaceContextService;
        this.fileService = fileService;
    }
    async getAllURIsInDirectory(uri, opts) {
        return getAllUrisInDirectory(uri, opts.maxResults, this.fileService);
    }
    async getDirectoryStrTool(uri) {
        const eRoot = await this.fileService.resolve(uri);
        if (!eRoot)
            throw new Error(`The folder ${uri.fsPath} does not exist.`);
        const maxItemsPerDir = START_MAX_ITEMS_PER_DIR; // Use START_MAX_ITEMS_PER_DIR
        // First try with START_MAX_DEPTH
        const { content: initialContent, wasCutOff: initialCutOff } = await computeAndStringifyDirectoryTree(eRoot, this.fileService, MAX_DIRSTR_CHARS_TOTAL_TOOL, { count: 0 }, { maxDepth: START_MAX_DEPTH, currentDepth: 0, maxItemsPerDir });
        // If cut off, try again with DEFAULT_MAX_DEPTH and DEFAULT_MAX_ITEMS_PER_DIR
        let content, wasCutOff;
        if (initialCutOff) {
            const result = await computeAndStringifyDirectoryTree(eRoot, this.fileService, MAX_DIRSTR_CHARS_TOTAL_TOOL, { count: 0 }, { maxDepth: DEFAULT_MAX_DEPTH, currentDepth: 0, maxItemsPerDir: DEFAULT_MAX_ITEMS_PER_DIR });
            content = result.content;
            wasCutOff = result.wasCutOff;
        }
        else {
            content = initialContent;
            wasCutOff = initialCutOff;
        }
        let c = content.substring(0, MAX_DIRSTR_CHARS_TOTAL_TOOL);
        c = `Directory of ${uri.fsPath}:\n${content}`;
        if (wasCutOff)
            c = `${c}\n...Result was truncated...`;
        return c;
    }
    async getAllDirectoriesStr({ cutOffMessage }) {
        let str = '';
        let cutOff = false;
        const folders = this.workspaceContextService.getWorkspace().folders;
        if (folders.length === 0)
            return '(NO WORKSPACE OPEN)';
        // Use START_MAX_ITEMS_PER_DIR if not specified
        const startMaxItemsPerDir = START_MAX_ITEMS_PER_DIR;
        for (let i = 0; i < folders.length; i += 1) {
            if (i > 0)
                str += '\n';
            // this prioritizes filling 1st workspace before any other, etc
            const f = folders[i];
            str += `Directory of ${f.uri.fsPath}:\n`;
            const rootURI = f.uri;
            const eRoot = await this.fileService.resolve(rootURI);
            if (!eRoot)
                continue;
            // First try with START_MAX_DEPTH and startMaxItemsPerDir
            const { content: initialContent, wasCutOff: initialCutOff } = await computeAndStringifyDirectoryTree(eRoot, this.fileService, MAX_DIRSTR_CHARS_TOTAL_BEGINNING - str.length, { count: 0 }, { maxDepth: START_MAX_DEPTH, currentDepth: 0, maxItemsPerDir: startMaxItemsPerDir });
            // If cut off, try again with DEFAULT_MAX_DEPTH and DEFAULT_MAX_ITEMS_PER_DIR
            let content, wasCutOff;
            if (initialCutOff) {
                const result = await computeAndStringifyDirectoryTree(eRoot, this.fileService, MAX_DIRSTR_CHARS_TOTAL_BEGINNING - str.length, { count: 0 }, {
                    maxDepth: DEFAULT_MAX_DEPTH,
                    currentDepth: 0,
                    maxItemsPerDir: DEFAULT_MAX_ITEMS_PER_DIR,
                });
                content = result.content;
                wasCutOff = result.wasCutOff;
            }
            else {
                content = initialContent;
                wasCutOff = initialCutOff;
            }
            str += content;
            if (wasCutOff) {
                cutOff = true;
                break;
            }
        }
        const ans = cutOff ? `${str.trimEnd()}\n${cutOffMessage}` : str;
        return ans;
    }
};
DirectoryStrService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IFileService)
], DirectoryStrService);
registerSingleton(IDirectoryStrService, DirectoryStrService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0b3J5U3RyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vZGlyZWN0b3J5U3RyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUcxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsWUFBWSxFQUFhLE1BQU0sNENBQTRDLENBQUE7QUFDcEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFNN0YsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixnQ0FBZ0MsRUFDaEMsMkJBQTJCLEdBQzNCLE1BQU0scUJBQXFCLENBQUE7QUFFNUIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFBO0FBRTVCLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQTtBQUNoQyxNQUFNLHVCQUF1QixHQUFHLFFBQVEsQ0FBQSxDQUFDLDhCQUE4QjtBQUV2RSxNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQTtBQUMzQixNQUFNLHlCQUF5QixHQUFHLENBQUMsQ0FBQTtBQVVuQyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHlCQUF5QixDQUFDLENBQUE7QUFFcEcsZ0RBQWdEO0FBQ2hELE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUMvQyxJQUNDLElBQUksS0FBSyxNQUFNO1FBQ2YsSUFBSSxLQUFLLGNBQWM7UUFDdkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7UUFDcEIsSUFB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
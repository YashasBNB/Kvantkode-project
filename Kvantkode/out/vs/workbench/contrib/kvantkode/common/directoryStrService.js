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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0b3J5U3RyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIva3ZhbnRrb2RlL2NvbW1vbi9kaXJlY3RvcnlTdHJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQWEsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQU03RixPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGdDQUFnQyxFQUNoQywyQkFBMkIsR0FDM0IsTUFBTSxxQkFBcUIsQ0FBQTtBQUU1QixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUE7QUFFNUIsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFBO0FBQ2hDLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFBLENBQUMsOEJBQThCO0FBRXZFLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFBO0FBQzNCLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxDQUFBO0FBVW5DLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIseUJBQXlCLENBQUMsQ0FBQTtBQUVwRyxnREFBZ0Q7QUFDaEQsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO0lBQy9DLElBQ0MsSUFBSSxLQUFLLE1BQU07UUFDZixJQUFJLEtBQUssY0FBYztRQUN2QixJQUFJLENBQUMsVUFBVSxD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
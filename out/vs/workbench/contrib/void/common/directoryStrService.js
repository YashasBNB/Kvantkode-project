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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0b3J5U3RyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL2RpcmVjdG9yeVN0clNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFHMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBYSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBTTdGLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsZ0NBQWdDLEVBQ2hDLDJCQUEyQixHQUMzQixNQUFNLHFCQUFxQixDQUFBO0FBRTVCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQTtBQUU1QixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUE7QUFDaEMsTUFBTSx1QkFBdUIsR0FBRyxRQUFRLENBQUEsQ0FBQyw4QkFBOEI7QUFFdkUsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUE7QUFDM0IsTUFBTSx5QkFBeUIsR0FBRyxDQUFDLENBQUE7QUFVbkMsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1Qix5QkFBeUIsQ0FBQyxDQUFBO0FBRXBHLGdEQUFnRDtBQUNoRCxNQUFNLHNCQUFzQixHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDL0MsSUFDQyxJQUFJLEtBQUssTUFBTTtRQUNmLElBQUksS0FBSyxjQUFjO1FBQ3ZCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1FBQ3BCLElBQUksS0FB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
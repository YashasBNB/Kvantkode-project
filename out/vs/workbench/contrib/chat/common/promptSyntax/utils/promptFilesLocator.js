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
import { URI } from '../../../../../../base/common/uri.js';
import { match } from '../../../../../../base/common/glob.js';
import { assert } from '../../../../../../base/common/assert.js';
import { isAbsolute } from '../../../../../../base/common/path.js';
import { ResourceSet } from '../../../../../../base/common/map.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { PromptsConfig } from '../../../../../../platform/prompts/common/config.js';
import { basename, dirname, extUri } from '../../../../../../base/common/resources.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { isPromptFile, PROMPT_FILE_EXTENSION, } from '../../../../../../platform/prompts/common/constants.js';
/**
 * Utility class to locate prompt files.
 */
let PromptFilesLocator = class PromptFilesLocator {
    constructor(fileService, configService, workspaceService) {
        this.fileService = fileService;
        this.configService = configService;
        this.workspaceService = workspaceService;
    }
    /**
     * List all prompt files from the filesystem.
     *
     * @returns List of prompt files found in the workspace.
     */
    async listFiles() {
        const configuredLocations = PromptsConfig.promptSourceFolders(this.configService);
        const absoluteLocations = toAbsoluteLocations(configuredLocations, this.workspaceService);
        return await this.listFilesIn(absoluteLocations);
    }
    /**
     * Lists all prompt files in the provided folders.
     *
     * @throws if any of the provided folder paths is not an `absolute path`.
     *
     * @param absoluteLocations List of prompt file source folders to search for prompt files in. Must be absolute paths.
     * @returns List of prompt files found in the provided folders.
     */
    async listFilesIn(folders) {
        return await this.findInstructionFiles(folders);
    }
    /**
     * Get all possible unambiguous prompt file source folders based on
     * the current workspace folder structure.
     *
     * This method is currently primarily used by the `> Create Prompt`
     * command that providers users with the list of destination folders
     * for a newly created prompt file. Because such a list cannot contain
     * paths that include `glob pattern` in them, we need to process config
     * values and try to create a list of clear and unambiguous locations.
     *
     * @returns List of possible unambiguous prompt file folders.
     */
    getConfigBasedSourceFolders() {
        const configuredLocations = PromptsConfig.promptSourceFolders(this.configService);
        const absoluteLocations = toAbsoluteLocations(configuredLocations, this.workspaceService);
        // locations in the settings can contain glob patterns so we need
        // to process them to get "clean" paths; the goal here is to have
        // a list of unambiguous folder paths where prompt files are stored
        const result = new ResourceSet();
        for (const absoluteLocation of absoluteLocations) {
            let { path } = absoluteLocation;
            const baseName = basename(absoluteLocation);
            // if a path ends with a well-known "any file" pattern, remove
            // it so we can get the dirname path of that setting value
            const filePatterns = ['*.md', `*${PROMPT_FILE_EXTENSION}`];
            for (const filePattern of filePatterns) {
                if (baseName === filePattern) {
                    path = URI.joinPath(absoluteLocation, '..').path;
                    continue;
                }
            }
            // likewise, if the pattern ends with single `*` (any file name)
            // remove it to get the dirname path of the setting value
            if (baseName === '*') {
                path = URI.joinPath(absoluteLocation, '..').path;
            }
            // if after replacing the "file name" glob pattern, the path
            // still contains a glob pattern, then ignore the path
            if (isValidGlob(path) === true) {
                continue;
            }
            result.add(URI.file(path));
        }
        return [...result];
    }
    /**
     * Finds all existent prompt files in the provided source folders.
     *
     * @throws if any of the provided folder paths is not an `absolute path`.
     *
     * @param absoluteLocations List of prompt file source folders to search for prompt files in. Must be absolute paths.
     * @returns List of prompt files found in the provided source folders.
     */
    async findInstructionFiles(absoluteLocations) {
        // find all prompt files in the provided locations, then match
        // the found file paths against (possible) glob patterns
        const paths = new ResourceSet();
        for (const absoluteLocation of absoluteLocations) {
            assert(isAbsolute(absoluteLocation.path), `Provided location must be an absolute path, got '${absoluteLocation.path}'.`);
            // normalize the glob pattern to always end with "any prompt file" pattern
            // unless the last part of the path is already a glob pattern itself; this is
            // to handle the case when a user specifies a file glob pattern at the end, e.g.,
            // "my-folder/*.md" or "my-folder/*" already include the prompt files
            const location = isValidGlob(basename(absoluteLocation)) ||
                absoluteLocation.path.endsWith(PROMPT_FILE_EXTENSION)
                ? absoluteLocation
                : extUri.joinPath(absoluteLocation, `*${PROMPT_FILE_EXTENSION}`);
            // find all prompt files in entire file tree, starting from
            // a first parent folder that does not contain a glob pattern
            const promptFiles = await findAllPromptFiles(firstNonGlobParent(location), this.fileService);
            // filter out found prompt files to only include those that match
            // the original glob pattern specified in the settings (if any)
            for (const file of promptFiles) {
                if (match(location.path, file.path)) {
                    paths.add(file);
                }
            }
        }
        return [...paths];
    }
};
PromptFilesLocator = __decorate([
    __param(0, IFileService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceContextService)
], PromptFilesLocator);
export { PromptFilesLocator };
/**
 * Checks if the provided `pattern` could be a valid glob pattern.
 */
export const isValidGlob = (pattern) => {
    let squareBrackets = false;
    let squareBracketsCount = 0;
    let curlyBrackets = false;
    let curlyBracketsCount = 0;
    let previousCharacter;
    for (const char of pattern) {
        // skip all escaped characters
        if (previousCharacter === '\\') {
            previousCharacter = char;
            continue;
        }
        if (char === '*') {
            return true;
        }
        if (char === '?') {
            return true;
        }
        if (char === '[') {
            squareBrackets = true;
            squareBracketsCount++;
            previousCharacter = char;
            continue;
        }
        if (char === ']') {
            squareBrackets = true;
            squareBracketsCount--;
            previousCharacter = char;
            continue;
        }
        if (char === '{') {
            curlyBrackets = true;
            curlyBracketsCount++;
            continue;
        }
        if (char === '}') {
            curlyBrackets = true;
            curlyBracketsCount--;
            previousCharacter = char;
            continue;
        }
        previousCharacter = char;
    }
    // if square brackets exist and are in pairs, this is a `valid glob`
    if (squareBrackets && squareBracketsCount === 0) {
        return true;
    }
    // if curly brackets exist and are in pairs, this is a `valid glob`
    if (curlyBrackets && curlyBracketsCount === 0) {
        return true;
    }
    return false;
};
/**
 * Finds the first parent of the provided location that does not contain a `glob pattern`.
 *
 * @throws if the provided location is not an `absolute path`.
 *
 * ## Examples
 *
 * ```typescript
 * assert.strictEqual(
 *     firstNonGlobParent(URI.file('/home/user/{folder1,folder2}/file.md')).path,
 *     URI.file('/home/user').path,
 *     'Must find correct non-glob parent dirname.',
 * );
 * ```
 */
export const firstNonGlobParent = (location) => {
    // sanity check of the provided location
    assert(isAbsolute(location.path), `Provided location must be an absolute path, got '${location.path}'.`);
    // note! if though the folder name can be `invalid glob` here, it is still OK to
    //       use it as we don't really known if that is a glob pattern, or the folder
    //       name contains characters that can also be used in a glob pattern
    if (isValidGlob(location.path) === false) {
        return location;
    }
    // if location is the root of the filesystem, we are done
    const parent = dirname(location);
    if (extUri.isEqual(parent, location)) {
        return location;
    }
    // otherwise, try again starting with the parent folder
    return firstNonGlobParent(parent);
};
/**
 * Finds all `prompt files` in the provided location and all of its subfolders.
 */
const findAllPromptFiles = async (location, fileService) => {
    const result = [];
    try {
        const info = await fileService.resolve(location);
        if (info.isFile && isPromptFile(info.resource)) {
            result.push(info.resource);
            return result;
        }
        if (info.isDirectory && info.children) {
            for (const child of info.children) {
                if (child.isFile && isPromptFile(child.resource)) {
                    result.push(child.resource);
                    continue;
                }
                if (child.isDirectory) {
                    const promptFiles = await findAllPromptFiles(child.resource, fileService);
                    result.push(...promptFiles);
                    continue;
                }
            }
            return result;
        }
    }
    catch (error) {
        // noop
    }
    return result;
};
/**
 * Converts locations defined in `settings` to absolute filesystem path URIs.
 * This conversion is needed because locations in settings can be relative,
 * hence we need to resolve them based on the current workspace folders.
 */
const toAbsoluteLocations = (configuredLocations, workspaceService) => {
    const result = new ResourceSet();
    const { folders } = workspaceService.getWorkspace();
    for (const configuredLocation of configuredLocations) {
        if (isAbsolute(configuredLocation)) {
            result.add(URI.file(configuredLocation));
            continue;
        }
        for (const workspaceFolder of folders) {
            const absolutePath = extUri.resolvePath(workspaceFolder.uri, configuredLocation);
            // a sanity check on the expected outcome of the `resolvePath()` call
            assert(isAbsolute(absolutePath.path), `Provided location must be an absolute path, got '${absolutePath.path}'.`);
            if (result.has(absolutePath) === false) {
                result.add(absolutePath);
            }
            // if not inside a multi-root workspace, we are done
            if (folders.length <= 1) {
                continue;
            }
            // if inside a multi-root workspace, consider the specified prompts source folder
            // inside the workspace root, to allow users to use some (e.g., `.github/prompts`)
            // folder as a top-level folder in the workspace
            const workspaceRootUri = dirname(workspaceFolder.uri);
            const workspaceFolderUri = extUri.resolvePath(workspaceRootUri, configuredLocation);
            // if we already have this folder in the list, skip it
            if (result.has(workspaceFolderUri) === true) {
                continue;
            }
            // otherwise, if the prompt source folder is inside a top-level workspace folder,
            // add it to the list of paths too; this helps to handle the case when a relative
            // path must be resolved from `root` of the workspace
            if (workspaceFolderUri.fsPath.startsWith(workspaceFolder.uri.fsPath)) {
                result.add(workspaceFolderUri);
            }
        }
    }
    return [...result];
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3V0aWxzL3Byb21wdEZpbGVzTG9jYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUNOLFlBQVksRUFDWixxQkFBcUIsR0FDckIsTUFBTSx3REFBd0QsQ0FBQTtBQUUvRDs7R0FFRztBQUNJLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO0lBQzlCLFlBQ2dDLFdBQXlCLEVBQ2hCLGFBQW9DLEVBQ2pDLGdCQUEwQztRQUZ0RCxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNoQixrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7UUFDakMs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
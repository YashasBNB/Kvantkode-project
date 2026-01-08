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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvdXRpbHMvcHJvbXB0RmlsZXNMb2NhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQ04sWUFBWSxFQUNaLHFCQUFxQixHQUNyQixNQUFNLHdEQUF3RCxDQUFBO0FBRS9EOztHQUVHO0FBQ0ksSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBa0I7SUFDOUIsWUFDZ0MsV0FBeUIsRUFDaEIsYUFBb0MsRUFDakMsZ0JBQTBDO1FBRnRELGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ2hCLGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtR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
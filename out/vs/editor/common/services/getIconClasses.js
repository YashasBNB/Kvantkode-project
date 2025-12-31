/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
import { DataUri } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
import { FileKind } from '../../../platform/files/common/files.js';
import { ThemeIcon } from '../../../base/common/themables.js';
const fileIconDirectoryRegex = /(?:\/|^)(?:([^\/]+)\/)?([^\/]+)$/;
export function getIconClasses(modelService, languageService, resource, fileKind, icon) {
    if (ThemeIcon.isThemeIcon(icon)) {
        return [`codicon-${icon.id}`, 'predefined-file-icon'];
    }
    if (URI.isUri(icon)) {
        return [];
    }
    // we always set these base classes even if we do not have a path
    const classes = fileKind === FileKind.ROOT_FOLDER
        ? ['rootfolder-icon']
        : fileKind === FileKind.FOLDER
            ? ['folder-icon']
            : ['file-icon'];
    if (resource) {
        // Get the path and name of the resource. For data-URIs, we need to parse specially
        let name;
        if (resource.scheme === Schemas.data) {
            const metadata = DataUri.parseMetaData(resource);
            name = metadata.get(DataUri.META_DATA_LABEL);
        }
        else {
            const match = resource.path.match(fileIconDirectoryRegex);
            if (match) {
                name = fileIconSelectorEscape(match[2].toLowerCase());
                if (match[1]) {
                    classes.push(`${fileIconSelectorEscape(match[1].toLowerCase())}-name-dir-icon`); // parent directory
                }
            }
            else {
                name = fileIconSelectorEscape(resource.authority.toLowerCase());
            }
        }
        // Root Folders
        if (fileKind === FileKind.ROOT_FOLDER) {
            classes.push(`${name}-root-name-folder-icon`);
        }
        // Folders
        else if (fileKind === FileKind.FOLDER) {
            classes.push(`${name}-name-folder-icon`);
        }
        // Files
        else {
            // Name & Extension(s)
            if (name) {
                classes.push(`${name}-name-file-icon`);
                classes.push(`name-file-icon`); // extra segment to increase file-name score
                // Avoid doing an explosive combination of extensions for very long filenames
                // (most file systems do not allow files > 255 length) with lots of `.` characters
                // https://github.com/microsoft/vscode/issues/116199
                if (name.length <= 255) {
                    const dotSegments = name.split('.');
                    for (let i = 1; i < dotSegments.length; i++) {
                        classes.push(`${dotSegments.slice(i).join('.')}-ext-file-icon`); // add each combination of all found extensions if more than one
                    }
                }
                classes.push(`ext-file-icon`); // extra segment to increase file-ext score
            }
            // Detected Mode
            const detectedLanguageId = detectLanguageId(modelService, languageService, resource);
            if (detectedLanguageId) {
                classes.push(`${fileIconSelectorEscape(detectedLanguageId)}-lang-file-icon`);
            }
        }
    }
    return classes;
}
export function getIconClassesForLanguageId(languageId) {
    return ['file-icon', `${fileIconSelectorEscape(languageId)}-lang-file-icon`];
}
function detectLanguageId(modelService, languageService, resource) {
    if (!resource) {
        return null; // we need a resource at least
    }
    let languageId = null;
    // Data URI: check for encoded metadata
    if (resource.scheme === Schemas.data) {
        const metadata = DataUri.parseMetaData(resource);
        const mime = metadata.get(DataUri.META_DATA_MIME);
        if (mime) {
            languageId = languageService.getLanguageIdByMimeType(mime);
        }
    }
    // Any other URI: check for model if existing
    else {
        const model = modelService.getModel(resource);
        if (model) {
            languageId = model.getLanguageId();
        }
    }
    // only take if the language id is specific (aka no just plain text)
    if (languageId && languageId !== PLAINTEXT_LANGUAGE_ID) {
        return languageId;
    }
    // otherwise fallback to path based detection
    return languageService.guessLanguageIdByFilepathOrFirstLine(resource);
}
export function fileIconSelectorEscape(str) {
    return str.replace(/[\s]/g, '/'); // HTML class names can not contain certain whitespace characters (https://dom.spec.whatwg.org/#interface-domtokenlist), use / instead, which doesn't exist in file names.
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0SWNvbkNsYXNzZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL2dldEljb25DbGFzc2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBYyxNQUFNLDZCQUE2QixDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBR3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFN0QsTUFBTSxzQkFBc0IsR0FBRyxrQ0FBa0MsQ0FBQTtBQUVqRSxNQUFNLFVBQVUsY0FBYyxDQUM3QixZQUEyQixFQUMzQixlQUFpQyxFQUNqQyxRQUF5QixFQUN6QixRQUFtQixFQUNuQixJQUFzQjtJQUV0QixJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUMsV0FBVyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBRUQsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDckIsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsaUVBQWlFO0lBQ2pFLE1BQU0sT0FBTyxHQUNaLFFBQVEsS0FBSyxRQUFRLENBQUMsV0FBVztRQUNoQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztRQUNyQixDQUFDLENBQUMsUUFBUSxLQUFLLFFBQVEs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
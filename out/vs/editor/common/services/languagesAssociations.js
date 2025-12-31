/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parse } from '../../../base/common/glob.js';
import { Mimes } from '../../../base/common/mime.js';
import { Schemas } from '../../../base/common/network.js';
import { basename, posix } from '../../../base/common/path.js';
import { DataUri } from '../../../base/common/resources.js';
import { startsWithUTF8BOM } from '../../../base/common/strings.js';
import { PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
let registeredAssociations = [];
let nonUserRegisteredAssociations = [];
let userRegisteredAssociations = [];
/**
 * Associate a language to the registry (platform).
 * * **NOTE**: This association will lose over associations registered using `registerConfiguredLanguageAssociation`.
 * * **NOTE**: Use `clearPlatformLanguageAssociations` to remove all associations registered using this function.
 */
export function registerPlatformLanguageAssociation(association, warnOnOverwrite = false) {
    _registerLanguageAssociation(association, false, warnOnOverwrite);
}
/**
 * Associate a language to the registry (configured).
 * * **NOTE**: This association will win over associations registered using `registerPlatformLanguageAssociation`.
 * * **NOTE**: Use `clearConfiguredLanguageAssociations` to remove all associations registered using this function.
 */
export function registerConfiguredLanguageAssociation(association) {
    _registerLanguageAssociation(association, true, false);
}
function _registerLanguageAssociation(association, userConfigured, warnOnOverwrite) {
    // Register
    const associationItem = toLanguageAssociationItem(association, userConfigured);
    registeredAssociations.push(associationItem);
    if (!associationItem.userConfigured) {
        nonUserRegisteredAssociations.push(associationItem);
    }
    else {
        userRegisteredAssociations.push(associationItem);
    }
    // Check for conflicts unless this is a user configured association
    if (warnOnOverwrite && !associationItem.userConfigured) {
        registeredAssociations.forEach((a) => {
            if (a.mime === associationItem.mime || a.userConfigured) {
                return; // same mime or userConfigured is ok
            }
            if (associationItem.extension && a.extension === associationItem.extension) {
                console.warn(`Overwriting extension <<${associationItem.extension}>> to now point to mime <<${associationItem.mime}>>`);
            }
            if (associationItem.filename && a.filename === associationItem.filename) {
                console.warn(`Overwriting filename <<${associationItem.filename}>> to now point to mime <<${associationItem.mime}>>`);
            }
            if (associationItem.filepattern && a.filepattern === associationItem.filepattern) {
                console.warn(`Overwriting filepattern <<${associationItem.filepattern}>> to now point to mime <<${associationItem.mime}>>`);
            }
            if (associationItem.firstline && a.firstline === associationItem.firstline) {
                console.warn(`Overwriting firstline <<${associationItem.firstline}>> to now point to mime <<${associationItem.mime}>>`);
            }
        });
    }
}
function toLanguageAssociationItem(association, userConfigured) {
    return {
        id: association.id,
        mime: association.mime,
        filename: association.filename,
        extension: association.extension,
        filepattern: association.filepattern,
        firstline: association.firstline,
        userConfigured: userConfigured,
        filenameLowercase: association.filename ? association.filename.toLowerCase() : undefined,
        extensionLowercase: association.extension ? association.extension.toLowerCase() : undefined,
        filepatternLowercase: association.filepattern
            ? parse(association.filepattern.toLowerCase())
            : undefined,
        filepatternOnPath: association.filepattern
            ? association.filepattern.indexOf(posix.sep) >= 0
            : false,
    };
}
/**
 * Clear language associations from the registry (platform).
 */
export function clearPlatformLanguageAssociations() {
    registeredAssociations = registeredAssociations.filter((a) => a.userConfigured);
    nonUserRegisteredAssociations = [];
}
/**
 * Clear language associations from the registry (configured).
 */
export function clearConfiguredLanguageAssociations() {
    registeredAssociations = registeredAssociations.filter((a) => !a.userConfigured);
    userRegisteredAssociations = [];
}
/**
 * Given a file, return the best matching mime types for it
 * based on the registered language associations.
 */
export function getMimeTypes(resource, firstLine) {
    return getAssociations(resource, firstLine).map((item) => item.mime);
}
/**
 * @see `getMimeTypes`
 */
export function getLanguageIds(resource, firstLine) {
    return getAssociations(resource, firstLine).map((item) => item.id);
}
function getAssociations(resource, firstLine) {
    let path;
    if (resource) {
        switch (resource.scheme) {
            case Schemas.file:
                path = resource.fsPath;
                break;
            case Schemas.data: {
                const metadata = DataUri.parseMetaData(resource);
                path = metadata.get(DataUri.META_DATA_LABEL);
                break;
            }
            case Schemas.vscodeNotebookCell:
                // File path not relevant for language detection of cell
                path = undefined;
                break;
            default:
                path = resource.path;
        }
    }
    if (!path) {
        return [{ id: 'unknown', mime: Mimes.unknown }];
    }
    path = path.toLowerCase();
    const filename = basename(path);
    // 1.) User configured mappings have highest priority
    const configuredLanguage = getAssociationByPath(path, filename, userRegisteredAssociations);
    if (configuredLanguage) {
        return [configuredLanguage, { id: PLAINTEXT_LANGUAGE_ID, mime: Mimes.text }];
    }
    // 2.) Registered mappings have middle priority
    const registeredLanguage = getAssociationByPath(path, filename, nonUserRegisteredAssociations);
    if (registeredLanguage) {
        return [registeredLanguage, { id: PLAINTEXT_LANGUAGE_ID, mime: Mimes.text }];
    }
    // 3.) Firstline has lowest priority
    if (firstLine) {
        const firstlineLanguage = getAssociationByFirstline(firstLine);
        if (firstlineLanguage) {
            return [firstlineLanguage, { id: PLAINTEXT_LANGUAGE_ID, mime: Mimes.text }];
        }
    }
    return [{ id: 'unknown', mime: Mimes.unknown }];
}
function getAssociationByPath(path, filename, associations) {
    let filenameMatch = undefined;
    let patternMatch = undefined;
    let extensionMatch = undefined;
    // We want to prioritize associations based on the order they are registered so that the last registered
    // association wins over all other. This is for https://github.com/microsoft/vscode/issues/20074
    for (let i = associations.length - 1; i >= 0; i--) {
        const association = associations[i];
        // First exact name match
        if (filename === association.filenameLowercase) {
            filenameMatch = association;
            break; // take it!
        }
        // Longest pattern match
        if (association.filepattern) {
            if (!patternMatch || association.filepattern.length > patternMatch.filepattern.length) {
                const target = association.filepatternOnPath ? path : filename; // match on full path if pattern contains path separator
                if (association.filepatternLowercase?.(target)) {
                    patternMatch = association;
                }
            }
        }
        // Longest extension match
        if (association.extension) {
            if (!extensionMatch || association.extension.length > extensionMatch.extension.length) {
                if (filename.endsWith(association.extensionLowercase)) {
                    extensionMatch = association;
                }
            }
        }
    }
    // 1.) Exact name match has second highest priority
    if (filenameMatch) {
        return filenameMatch;
    }
    // 2.) Match on pattern
    if (patternMatch) {
        return patternMatch;
    }
    // 3.) Match on extension comes next
    if (extensionMatch) {
        return extensionMatch;
    }
    return undefined;
}
function getAssociationByFirstline(firstLine) {
    if (startsWithUTF8BOM(firstLine)) {
        firstLine = firstLine.substr(1);
    }
    if (firstLine.length > 0) {
        // We want to prioritize associations based on the order they are registered so that the last registered
        // association wins over all other. This is for https://github.com/microsoft/vscode/issues/20074
        for (let i = registeredAssociations.length - 1; i >= 0; i--) {
            const association = registeredAssociations[i];
            if (!association.firstline) {
                continue;
            }
            const matches = firstLine.match(association.firstline);
            if (matches && matches.length > 0) {
                return association;
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzQXNzb2NpYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9sYW5ndWFnZXNBc3NvY2lhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFpQixLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBbUJyRSxJQUFJLHNCQUFzQixHQUErQixFQUFFLENBQUE7QUFDM0QsSUFBSSw2QkFBNkIsR0FBK0IsRUFBRSxDQUFBO0FBQ2xFLElBQUksMEJBQTBCLEdBQStCLEVBQUUsQ0FBQTtBQUUvRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLG1DQUFtQyxDQUNsRCxXQUFpQyxFQUNqQyxlQUFlLEdBQUcsS0FBSztJQUV2Qiw0QkFBNEIsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO0FBQ2xFLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLHFDQUFxQyxDQUFDLFdBQWlDO0lBQ3RGLDRCQUE0QixDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDdkQsQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQ3BDLFdBQWlD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
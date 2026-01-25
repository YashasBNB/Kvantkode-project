/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../base/common/codicons.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ThemeIcon } from '../../../base/common/themables.js';
export function createProfileSchemaEnums(detectedProfiles, extensionProfiles) {
    const result = [
        {
            name: null,
            description: localize('terminalAutomaticProfile', 'Automatically detect the default'),
        },
    ];
    result.push(...detectedProfiles.map((e) => {
        return {
            name: e.profileName,
            description: createProfileDescription(e),
        };
    }));
    if (extensionProfiles) {
        result.push(...extensionProfiles.map((extensionProfile) => {
            return {
                name: extensionProfile.title,
                description: createExtensionProfileDescription(extensionProfile),
            };
        }));
    }
    return {
        values: result.map((e) => e.name),
        markdownDescriptions: result.map((e) => e.description),
    };
}
function createProfileDescription(profile) {
    let description = `$(${ThemeIcon.isThemeIcon(profile.icon) ? profile.icon.id : profile.icon ? profile.icon : Codicon.terminal.id}) ${profile.profileName}\n- path: ${profile.path}`;
    if (profile.args) {
        if (typeof profile.args === 'string') {
            description += `\n- args: "${profile.args}"`;
        }
        else {
            description += `\n- args: [${profile.args.length === 0 ? '' : `'${profile.args.join(`','`)}'`}]`;
        }
    }
    if (profile.overrideName !== undefined) {
        description += `\n- overrideName: ${profile.overrideName}`;
    }
    if (profile.color) {
        description += `\n- color: ${profile.color}`;
    }
    if (profile.env) {
        description += `\n- env: ${JSON.stringify(profile.env)}`;
    }
    return description;
}
function createExtensionProfileDescription(profile) {
    const description = `$(${ThemeIcon.isThemeIcon(profile.icon) ? profile.icon.id : profile.icon ? profile.icon : Codicon.terminal.id}) ${profile.title}\n- extensionIdentifier: ${profile.extensionIdentifier}`;
    return description;
}
export function terminalProfileArgsMatch(args1, args2) {
    if (!args1 && !args2) {
        return true;
    }
    else if (typeof args1 === 'string' && typeof args2 === 'string') {
        return args1 === args2;
    }
    else if (Array.isArray(args1) && Array.isArray(args2)) {
        if (args1.length !== args2.length) {
            return false;
        }
        for (let i = 0; i < args1.length; i++) {
            if (args1[i] !== args2[i]) {
                return false;
            }
        }
        return true;
    }
    return false;
}
export function terminalIconsEqual(a, b) {
    if (!a && !b) {
        return true;
    }
    else if (!a || !b) {
        return false;
    }
    if (ThemeIcon.isThemeIcon(a) && ThemeIcon.isThemeIcon(b)) {
        return a.id === b.id && a.color === b.color;
    }
    if (typeof a === 'object' &&
        'light' in a &&
        'dark' in a &&
        typeof b === 'object' &&
        'light' in b &&
        'dark' in b) {
        const castedA = a;
        const castedB = b;
        if ((URI.isUri(castedA.light) || isUriComponents(castedA.light)) &&
            (URI.isUri(castedA.dark) || isUriComponents(castedA.dark)) &&
            (URI.isUri(castedB.light) || isUriComponents(castedB.light)) &&
            (URI.isUri(castedB.dark) || isUriComponents(castedB.dark))) {
            return castedA.light.path === castedB.light.path && castedA.dark.path === castedB.dark.path;
        }
    }
    if ((URI.isUri(a) && URI.isUri(b)) || isUriComponents(a) || isUriComponents(b)) {
        const castedA = a;
        const castedB = b;
        return castedA.path === castedB.path && castedA.scheme === castedB.scheme;
    }
    return false;
}
export function isUriComponents(thing) {
    if (!thing) {
        return false;
    }
    return typeof thing.path === 'string' && typeof thing.scheme === 'string';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsUHJvZmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RCxNQUFNLFVBQVUsd0JBQXdCLENBQ3ZDLGdCQUFvQyxFQUNwQyxpQkFBd0Q7SUFLeEQsTUFBTSxNQUFNLEdBQW1EO1FBQzlEO1lBQ0MsSUFBSSxFQUFFLElBQUk7WUFDVixXQUFXLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGtDQUFrQyxDQUFDO1NBQ3JGO0tBQ0QsQ0FBQTtJQUNELE1BQU0sQ0FBQyxJQUFJLENBQ1YsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUM3QixPQUFPO1lBQ04sSUFBSSxFQUFFLENBQUMsQ0FBQyxXQUFXO1lBQ25CLFdBQVcsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7U0FDeEMsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDdkIsTUFBTSxDQUFDLElBQUksQ0FDVixHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLEVBQUU7WUFDN0MsT0FBTztnQkFDTixJQUFJLEVBQUUsZ0JBQWdCLENBQUMsS0FBSztnQkFDNUIsV0FBVyxFQUFFLGlDQUFpQyxD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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbFByb2ZpbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUUxQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFN0QsTUFBTSxVQUFVLHdCQUF3QixDQUN2QyxnQkFBb0MsRUFDcEMsaUJBQXdEO0lBS3hELE1BQU0sTUFBTSxHQUFtRDtRQUM5RDtZQUNDLElBQUksRUFBRSxJQUFJO1lBQ1YsV0FBVyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxrQ0FBa0MsQ0FBQztTQUNyRjtLQUNELENBQUE7SUFDRCxNQUFNLENBQUMsSUFBSSxDQUNWLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDN0IsT0FBTztZQUNOLElBQUksRUFBRSxDQUFDLENBQUMsV0FBVztZQUNuQixXQUFXLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1NBQ3hDLENBQUE7SUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0QsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQ1YsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFO1lBQzdDLE9BQU87Z0JBQ04sSUFBSSxFQUFFLGdCQUFnQixDQUFDLEtBQUs7Z0JBQzVCLFdBQVcsRUFBRSxpQ0FBaUMsQ0FBQyxn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
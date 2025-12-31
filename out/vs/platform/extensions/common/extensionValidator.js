/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEqualOrParent, joinPath } from '../../../base/common/resources.js';
import Severity from '../../../base/common/severity.js';
import * as nls from '../../../nls.js';
import * as semver from '../../../base/common/semver/semver.js';
import { parseApiProposals } from './extensions.js';
import { allApiProposals } from './extensionsApiProposals.js';
const VERSION_REGEXP = /^(\^|>=)?((\d+)|x)\.((\d+)|x)\.((\d+)|x)(\-.*)?$/;
const NOT_BEFORE_REGEXP = /^-(\d{4})(\d{2})(\d{2})$/;
export function isValidVersionStr(version) {
    version = version.trim();
    return version === '*' || VERSION_REGEXP.test(version);
}
export function parseVersion(version) {
    if (!isValidVersionStr(version)) {
        return null;
    }
    version = version.trim();
    if (version === '*') {
        return {
            hasCaret: false,
            hasGreaterEquals: false,
            majorBase: 0,
            majorMustEqual: false,
            minorBase: 0,
            minorMustEqual: false,
            patchBase: 0,
            patchMustEqual: false,
            preRelease: null,
        };
    }
    const m = version.match(VERSION_REGEXP);
    if (!m) {
        return null;
    }
    return {
        hasCaret: m[1] === '^',
        hasGreaterEquals: m[1] === '>=',
        majorBase: m[2] === 'x' ? 0 : parseInt(m[2], 10),
        majorMustEqual: m[2] === 'x' ? false : true,
        minorBase: m[4] === 'x' ? 0 : parseInt(m[4], 10),
        minorMustEqual: m[4] === 'x' ? false : true,
        patchBase: m[6] === 'x' ? 0 : parseInt(m[6], 10),
        patchMustEqual: m[6] === 'x' ? false : true,
        preRelease: m[8] || null,
    };
}
export function normalizeVersion(version) {
    if (!version) {
        return null;
    }
    const majorBase = version.majorBase;
    const majorMustEqual = version.majorMustEqual;
    const minorBase = version.minorBase;
    let minorMustEqual = version.minorMustEqual;
    const patchBase = version.patchBase;
    let patchMustEqual = version.patchMustEqual;
    if (version.hasCaret) {
        if (majorBase === 0) {
            patchMustEqual = false;
        }
        else {
            minorMustEqual = false;
            patchMustEqual = false;
        }
    }
    let notBefore = 0;
    if (version.preRelease) {
        const match = NOT_BEFORE_REGEXP.exec(version.preRelease);
        if (match) {
            const [, year, month, day] = match;
            notBefore = Date.UTC(Number(year), Number(month) - 1, Number(day));
        }
    }
    return {
        majorBase: majorBase,
        majorMustEqual: majorMustEqual,
        minorBase: minorBase,
        minorMustEqual: minorMustEqual,
        patchBase: patchBase,
        patchMustEqual: patchMustEqual,
        isMinimum: version.hasGreaterEquals,
        notBefore,
    };
}
export function isValidVersion(_inputVersion, _inputDate, _desiredVersion) {
    let version;
    if (typeof _inputVersion === 'string') {
        version = normalizeVersion(parseVersion(_inputVersion));
    }
    else {
        version = _inputVersion;
    }
    let productTs;
    if (_inputDate instanceof Date) {
        productTs = _inputDate.getTime();
    }
    else if (typeof _inputDate === 'string') {
        productTs = new Date(_inputDate).getTime();
    }
    let desiredVersion;
    if (typeof _desiredVersion === 'string') {
        desiredVersion = normalizeVersion(parseVersion(_desiredVersion));
    }
    else {
        desiredVersion = _desiredVersion;
    }
    if (!version || !desiredVersion) {
        return false;
    }
    const majorBase = version.majorBase;
    const minorBase = version.minorBase;
    const patchBase = version.patchBase;
    let desiredMajorBase = desiredVersion.majorBase;
    let desiredMinorBase = desiredVersion.minorBase;
    let desiredPatchBase = desiredVersion.patchBase;
    const desiredNotBefore = desiredVersion.notBefore;
    let majorMustEqual = desiredVersion.majorMustEqual;
    let minorMustEqual = desiredVersion.minorMustEqual;
    let patchMustEqual = desiredVersion.patchMustEqual;
    if (desiredVersion.isMinimum) {
        if (majorBase > desiredMajorBase) {
            return true;
        }
        if (majorBase < desiredMajorBase) {
            return false;
        }
        if (minorBase > desiredMinorBase) {
            return true;
        }
        if (minorBase < desiredMinorBase) {
            return false;
        }
        if (productTs && productTs < desiredNotBefore) {
            return false;
        }
        return patchBase >= desiredPatchBase;
    }
    // Anything < 1.0.0 is compatible with >= 1.0.0, except exact matches
    if (majorBase === 1 &&
        desiredMajorBase === 0 &&
        (!majorMustEqual || !minorMustEqual || !patchMustEqual)) {
        desiredMajorBase = 1;
        desiredMinorBase = 0;
        desiredPatchBase = 0;
        majorMustEqual = true;
        minorMustEqual = false;
        patchMustEqual = false;
    }
    if (majorBase < desiredMajorBase) {
        // smaller major version
        return false;
    }
    if (majorBase > desiredMajorBase) {
        // higher major version
        return !majorMustEqual;
    }
    // at this point, majorBase are equal
    if (minorBase < desiredMinorBase) {
        // smaller minor version
        return false;
    }
    if (minorBase > desiredMinorBase) {
        // higher minor version
        return !minorMustEqual;
    }
    // at this point, minorBase are equal
    if (patchBase < desiredPatchBase) {
        // smaller patch version
        return false;
    }
    if (patchBase > desiredPatchBase) {
        // higher patch version
        return !patchMustEqual;
    }
    // at this point, patchBase are equal
    if (productTs && productTs < desiredNotBefore) {
        return false;
    }
    return true;
}
export function validateExtensionManifest(productVersion, productDate, extensionLocation, extensionManifest, extensionIsBuiltin, validateApiVersion) {
    const validations = [];
    if (typeof extensionManifest.publisher !== 'undefined' &&
        typeof extensionManifest.publisher !== 'string') {
        validations.push([
            Severity.Error,
            nls.localize('extensionDescription.publisher', 'property publisher must be of type `string`.'),
        ]);
        return validations;
    }
    if (typeof extensionManifest.name !== 'string') {
        validations.push([
            Severity.Error,
            nls.localize('extensionDescription.name', 'property `{0}` is mandatory and must be of type `string`', 'name'),
        ]);
        return validations;
    }
    if (typeof extensionManifest.version !== 'string') {
        validations.push([
            Severity.Error,
            nls.localize('extensionDescription.version', 'property `{0}` is mandatory and must be of type `string`', 'version'),
        ]);
        return validations;
    }
    if (!extensionManifest.engines) {
        validations.push([
            Severity.Error,
            nls.localize('extensionDescription.engines', 'property `{0}` is mandatory and must be of type `object`', 'engines'),
        ]);
        return validations;
    }
    if (typeof extensionManifest.engines.vscode !== 'string') {
        validations.push([
            Severity.Error,
            nls.localize('extensionDescription.engines.vscode', 'property `{0}` is mandatory and must be of type `string`', 'engines.vscode'),
        ]);
        return validations;
    }
    if (typeof extensionManifest.extensionDependencies !== 'undefined') {
        if (!isStringArray(extensionManifest.extensionDependencies)) {
            validations.push([
                Severity.Error,
                nls.localize('extensionDescription.extensionDependencies', 'property `{0}` can be omitted or must be of type `string[]`', 'extensionDependencies'),
            ]);
            return validations;
        }
    }
    if (typeof extensionManifest.activationEvents !== 'undefined') {
        if (!isStringArray(extensionManifest.activationEvents)) {
            validations.push([
                Severity.Error,
                nls.localize('extensionDescription.activationEvents1', 'property `{0}` can be omitted or must be of type `string[]`', 'activationEvents'),
            ]);
            return validations;
        }
        if (typeof extensionManifest.main === 'undefined' &&
            typeof extensionManifest.browser === 'undefined') {
            validations.push([
                Severity.Error,
                nls.localize('extensionDescription.activationEvents2', "property `{0}` should be omitted if the extension doesn't have a `{1}` or `{2}` property.", 'activationEvents', 'main', 'browser'),
            ]);
            return validations;
        }
    }
    if (typeof extensionManifest.extensionKind !== 'undefined') {
        if (typeof extensionManifest.main === 'undefined') {
            validations.push([
                Severity.Warning,
                nls.localize('extensionDescription.extensionKind', 'property `{0}` can be defined only if property `main` is also defined.', 'extensionKind'),
            ]);
            // not a failure case
        }
    }
    if (typeof extensionManifest.main !== 'undefined') {
        if (typeof extensionManifest.main !== 'string') {
            validations.push([
                Severity.Error,
                nls.localize('extensionDescription.main1', 'property `{0}` can be omitted or must be of type `string`', 'main'),
            ]);
            return validations;
        }
        else {
            const mainLocation = joinPath(extensionLocation, extensionManifest.main);
            if (!isEqualOrParent(mainLocation, extensionLocation)) {
                validations.push([
                    Severity.Warning,
                    nls.localize('extensionDescription.main2', "Expected `main` ({0}) to be included inside extension's folder ({1}). This might make the extension non-portable.", mainLocation.path, extensionLocation.path),
                ]);
                // not a failure case
            }
        }
    }
    if (typeof extensionManifest.browser !== 'undefined') {
        if (typeof extensionManifest.browser !== 'string') {
            validations.push([
                Severity.Error,
                nls.localize('extensionDescription.browser1', 'property `{0}` can be omitted or must be of type `string`', 'browser'),
            ]);
            return validations;
        }
        else {
            const browserLocation = joinPath(extensionLocation, extensionManifest.browser);
            if (!isEqualOrParent(browserLocation, extensionLocation)) {
                validations.push([
                    Severity.Warning,
                    nls.localize('extensionDescription.browser2', "Expected `browser` ({0}) to be included inside extension's folder ({1}). This might make the extension non-portable.", browserLocation.path, extensionLocation.path),
                ]);
                // not a failure case
            }
        }
    }
    if (!semver.valid(extensionManifest.version)) {
        validations.push([
            Severity.Error,
            nls.localize('notSemver', 'Extension version is not semver compatible.'),
        ]);
        return validations;
    }
    const notices = [];
    const validExtensionVersion = isValidExtensionVersion(productVersion, productDate, extensionManifest, extensionIsBuiltin, notices);
    if (!validExtensionVersion) {
        for (const notice of notices) {
            validations.push([Severity.Error, notice]);
        }
    }
    if (validateApiVersion && extensionManifest.enabledApiProposals?.length) {
        const incompatibleNotices = [];
        if (!areApiProposalsCompatible([...extensionManifest.enabledApiProposals], incompatibleNotices)) {
            for (const notice of incompatibleNotices) {
                validations.push([Severity.Error, notice]);
            }
        }
    }
    return validations;
}
export function isValidExtensionVersion(productVersion, productDate, extensionManifest, extensionIsBuiltin, notices) {
    if (extensionIsBuiltin ||
        (typeof extensionManifest.main === 'undefined' &&
            typeof extensionManifest.browser === 'undefined')) {
        // No version check for builtin or declarative extensions
        return true;
    }
    return isVersionValid(productVersion, productDate, extensionManifest.engines.vscode, notices);
}
export function isEngineValid(engine, version, date) {
    // TODO@joao: discuss with alex '*' doesn't seem to be a valid engine version
    return engine === '*' || isVersionValid(version, date, engine);
}
export function areApiProposalsCompatible(apiProposals, arg1) {
    if (apiProposals.length === 0) {
        return true;
    }
    const notices = Array.isArray(arg1) ? arg1 : undefined;
    const productApiProposals = (notices ? undefined : arg1) ?? allApiProposals;
    const incompatibleProposals = [];
    const parsedProposals = parseApiProposals(apiProposals);
    for (const { proposalName, version } of parsedProposals) {
        if (!version) {
            continue;
        }
        const existingProposal = productApiProposals[proposalName];
        if (existingProposal?.version !== version) {
            incompatibleProposals.push(proposalName);
        }
    }
    if (incompatibleProposals.length) {
        if (notices) {
            if (incompatibleProposals.length === 1) {
                notices.push(nls.localize('apiProposalMismatch1', "This extension is using the API proposal '{0}' that is not compatible with the current version of VS Code.", incompatibleProposals[0]));
            }
            else {
                notices.push(nls.localize('apiProposalMismatch2', "This extension is using the API proposals {0} and '{1}' that are not compatible with the current version of VS Code.", incompatibleProposals
                    .slice(0, incompatibleProposals.length - 1)
                    .map((p) => `'${p}'`)
                    .join(', '), incompatibleProposals[incompatibleProposals.length - 1]));
            }
        }
        return false;
    }
    return true;
}
function isVersionValid(currentVersion, date, requestedVersion, notices = []) {
    const desiredVersion = normalizeVersion(parseVersion(requestedVersion));
    if (!desiredVersion) {
        notices.push(nls.localize('versionSyntax', 'Could not parse `engines.vscode` value {0}. Please use, for example: ^1.22.0, ^1.22.x, etc.', requestedVersion));
        return false;
    }
    // enforce that a breaking API version is specified.
    // for 0.X.Y, that means up to 0.X must be specified
    // otherwise for Z.X.Y, that means Z must be specified
    if (desiredVersion.majorBase === 0) {
        // force that major and minor must be specific
        if (!desiredVersion.majorMustEqual || !desiredVersion.minorMustEqual) {
            notices.push(nls.localize('versionSpecificity1', 'Version specified in `engines.vscode` ({0}) is not specific enough. For vscode versions before 1.0.0, please define at a minimum the major and minor desired version. E.g. ^0.10.0, 0.10.x, 0.11.0, etc.', requestedVersion));
            return false;
        }
    }
    else {
        // force that major must be specific
        if (!desiredVersion.majorMustEqual) {
            notices.push(nls.localize('versionSpecificity2', 'Version specified in `engines.vscode` ({0}) is not specific enough. For vscode versions after 1.0.0, please define at a minimum the major desired version. E.g. ^1.10.0, 1.10.x, 1.x.x, 2.x.x, etc.', requestedVersion));
            return false;
        }
    }
    if (!isValidVersion(currentVersion, date, desiredVersion)) {
        notices.push(nls.localize('versionMismatch', 'Extension is not compatible with Code {0}. Extension requires: {1}.', currentVersion, requestedVersion));
        return false;
    }
    return true;
}
function isStringArray(arr) {
    if (!Array.isArray(arr)) {
        return false;
    }
    for (let i = 0, len = arr.length; i < len; i++) {
        if (typeof arr[i] !== 'string') {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVmFsaWRhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uVmFsaWRhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFFdkQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEtBQUssTUFBTSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBc0IsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUF5QjdELE1BQU0sY0FBYyxHQUFHLGtEQUFrRCxDQUFBO0FBQ3pFLE1BQU0saUJBQWlCLEdBQUcsMEJBQTBCLENBQUE7QUFFcEQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLE9BQWU7SUFDaEQsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN4QixPQUFPLE9BQU8sS0FBSyxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUN2RCxDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxPQUFlO0lBQzNDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ2pDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7SUFFeEIsSUFBSSxPQUFPLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDckIsT0FBTztZQUNOLFFBQVEsRUFBRSxLQUFLO1lBQ2Ys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
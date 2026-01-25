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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVmFsaWRhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25WYWxpZGF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV2RCxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBQ3RDLE9BQU8sS0FBSyxNQUFNLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFzQixpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQXlCN0QsTUFBTSxjQUFjLEdBQUcsa0RBQWtELENBQUE7QUFDekUsTUFBTSxpQkFBaUIsR0FBRywwQkFBMEIsQ0FBQTtBQUVwRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsT0FBZTtJQUNoRCxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3hCLE9BQU8sT0FBTyxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBQ3ZELENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFDLE9BQWU7SUFDM0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDakMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUV4QixJQUFJLE9BQU8sS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNyQixPQUFPO1lBQ04sUUFBUSxFQUFFLEtBQUs7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
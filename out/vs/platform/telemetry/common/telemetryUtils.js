/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { cloneAndChange, safeStringify } from '../../../base/common/objects.js';
import { isObject } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
import { getRemoteName } from '../../remote/common/remoteHosts.js';
import { verifyMicrosoftInternalDomain } from './commonProperties.js';
import { TELEMETRY_CRASH_REPORTER_SETTING_ID, TELEMETRY_OLD_SETTING_ID, TELEMETRY_SETTING_ID, } from './telemetry.js';
/**
 * A special class used to denoting a telemetry value which should not be clean.
 * This is because that value is "Trusted" not to contain identifiable information such as paths.
 * NOTE: This is used as an API type as well, and should not be changed.
 */
export class TelemetryTrustedValue {
    constructor(value) {
        this.value = value;
        // This is merely used as an identifier as the instance will be lost during serialization over the exthost
        this.isTrustedTelemetryValue = true;
    }
}
export class NullTelemetryServiceShape {
    constructor() {
        this.telemetryLevel = 0 /* TelemetryLevel.NONE */;
        this.sessionId = 'someValue.sessionId';
        this.machineId = 'someValue.machineId';
        this.sqmId = 'someValue.sqmId';
        this.devDeviceId = 'someValue.devDeviceId';
        this.firstSessionDate = 'someValue.firstSessionDate';
        this.sendErrorTelemetry = false;
    }
    publicLog() { }
    publicLog2() { }
    publicLogError() { }
    publicLogError2() { }
    setExperimentProperty() { }
}
export const NullTelemetryService = new NullTelemetryServiceShape();
export class NullEndpointTelemetryService {
    async publicLog(_endpoint, _eventName, _data) {
        // noop
    }
    async publicLogError(_endpoint, _errorEventName, _data) {
        // noop
    }
}
export const telemetryLogId = 'telemetry';
export const TelemetryLogGroup = {
    id: telemetryLogId,
    name: localize('telemetryLogName', 'Telemetry'),
};
export const NullAppender = {
    log: () => null,
    flush: () => Promise.resolve(undefined),
};
/**
 * Determines whether or not we support logging telemetry.
 * This checks if the product is capable of collecting telemetry but not whether or not it can send it
 * For checking the user setting and what telemetry you can send please check `getTelemetryLevel`.
 * This returns true if `--disable-telemetry` wasn't used, the product.json allows for telemetry, and we're not testing an extension
 * If false telemetry is disabled throughout the product
 * @param productService
 * @param environmentService
 * @returns false - telemetry is completely disabled, true - telemetry is logged locally, but may not be sent
 */
export function supportsTelemetry(productService, environmentService) {
    // If it's OSS and telemetry isn't disabled via the CLI we will allow it for logging only purposes
    if (!environmentService.isBuilt && !environmentService.disableTelemetry) {
        return true;
    }
    return !(environmentService.disableTelemetry || !productService.enableTelemetry);
}
/**
 * Checks to see if we're in logging only mode to debug telemetry.
 * This is if telemetry is enabled and we're in OSS, but no telemetry key is provided so it's not being sent just logged.
 * @param productService
 * @param environmentService
 * @returns True if telemetry is actually disabled and we're only logging for debug purposes
 */
export function isLoggingOnly(productService, environmentService) {
    // If we're testing an extension, log telemetry for debug purposes
    if (environmentService.extensionTestsLocationURI) {
        return true;
    }
    // Logging only mode is only for OSS
    if (environmentService.isBuilt) {
        return false;
    }
    if (environmentService.disableTelemetry) {
        return false;
    }
    if (productService.enableTelemetry && productService.aiConfig?.ariaKey) {
        return false;
    }
    return true;
}
/**
 * Determines how telemetry is handled based on the user's configuration.
 *
 * @param configurationService
 * @returns OFF, ERROR, ON
 */
export function getTelemetryLevel(configurationService) {
    const newConfig = configurationService.getValue(TELEMETRY_SETTING_ID);
    const crashReporterConfig = configurationService.getValue(TELEMETRY_CRASH_REPORTER_SETTING_ID);
    const oldConfig = configurationService.getValue(TELEMETRY_OLD_SETTING_ID);
    // If `telemetry.enableCrashReporter` is false or `telemetry.enableTelemetry' is false, disable telemetry
    if (oldConfig === false || crashReporterConfig === false) {
        return 0 /* TelemetryLevel.NONE */;
    }
    // Maps new telemetry setting to a telemetry level
    switch (newConfig ?? "all" /* TelemetryConfiguration.ON */) {
        case "all" /* TelemetryConfiguration.ON */:
            return 3 /* TelemetryLevel.USAGE */;
        case "error" /* TelemetryConfiguration.ERROR */:
            return 2 /* TelemetryLevel.ERROR */;
        case "crash" /* TelemetryConfiguration.CRASH */:
            return 1 /* TelemetryLevel.CRASH */;
        case "off" /* TelemetryConfiguration.OFF */:
            return 0 /* TelemetryLevel.NONE */;
    }
}
export function validateTelemetryData(data) {
    const properties = {};
    const measurements = {};
    const flat = {};
    flatten(data, flat);
    for (let prop in flat) {
        // enforce property names less than 150 char, take the last 150 char
        prop = prop.length > 150 ? prop.substr(prop.length - 149) : prop;
        const value = flat[prop];
        if (typeof value === 'number') {
            measurements[prop] = value;
        }
        else if (typeof value === 'boolean') {
            measurements[prop] = value ? 1 : 0;
        }
        else if (typeof value === 'string') {
            if (value.length > 8192) {
                console.warn(`Telemetry property: ${prop} has been trimmed to 8192, the original length is ${value.length}`);
            }
            //enforce property value to be less than 8192 char, take the first 8192 char
            // https://docs.microsoft.com/en-us/azure/azure-monitor/app/api-custom-events-metrics#limits
            properties[prop] = value.substring(0, 8191);
        }
        else if (typeof value !== 'undefined' && value !== null) {
            properties[prop] = value;
        }
    }
    return {
        properties,
        measurements,
    };
}
const telemetryAllowedAuthorities = new Set([
    'ssh-remote',
    'dev-container',
    'attached-container',
    'wsl',
    'tunnel',
    'codespaces',
    'amlext',
]);
export function cleanRemoteAuthority(remoteAuthority) {
    if (!remoteAuthority) {
        return 'none';
    }
    const remoteName = getRemoteName(remoteAuthority);
    return telemetryAllowedAuthorities.has(remoteName) ? remoteName : 'other';
}
function flatten(obj, result, order = 0, prefix) {
    if (!obj) {
        return;
    }
    for (const item of Object.getOwnPropertyNames(obj)) {
        const value = obj[item];
        const index = prefix ? prefix + item : item;
        if (Array.isArray(value)) {
            result[index] = safeStringify(value);
        }
        else if (value instanceof Date) {
            // TODO unsure why this is here and not in _getData
            result[index] = value.toISOString();
        }
        else if (isObject(value)) {
            if (order < 2) {
                flatten(value, result, order + 1, index + '.');
            }
            else {
                result[index] = safeStringify(value);
            }
        }
        else {
            result[index] = value;
        }
    }
}
/**
 * Whether or not this is an internal user
 * @param productService The product service
 * @param configService The config servivce
 * @returns true if internal, false otherwise
 */
export function isInternalTelemetry(productService, configService) {
    const msftInternalDomains = productService.msftInternalDomains || [];
    const internalTesting = configService.getValue('telemetry.internalTesting');
    return verifyMicrosoftInternalDomain(msftInternalDomains) || internalTesting;
}
export function getPiiPathsFromEnvironment(paths) {
    return [
        paths.appRoot,
        paths.extensionsPath,
        paths.userHome.fsPath,
        paths.tmpDir.fsPath,
        paths.userDataPath,
    ];
}
//#region Telemetry Cleaning
/**
 * Cleans a given stack of possible paths
 * @param stack The stack to sanitize
 * @param cleanupPatterns Cleanup patterns to remove from the stack
 * @returns The cleaned stack
 */
function anonymizeFilePaths(stack, cleanupPatterns) {
    // Fast check to see if it is a file path to avoid doing unnecessary heavy regex work
    if (!stack || (!stack.includes('/') && !stack.includes('\\'))) {
        return stack;
    }
    let updatedStack = stack;
    const cleanUpIndexes = [];
    for (const regexp of cleanupPatterns) {
        while (true) {
            const result = regexp.exec(stack);
            if (!result) {
                break;
            }
            cleanUpIndexes.push([result.index, regexp.lastIndex]);
        }
    }
    const nodeModulesRegex = /^[\\\/]?(node_modules|node_modules\.asar)[\\\/]/;
    const fileRegex = /(file:\/\/)?([a-zA-Z]:(\\\\|\\|\/)|(\\\\|\\|\/))?([\w-\._]+(\\\\|\\|\/))+[\w-\._]*/g;
    let lastIndex = 0;
    updatedStack = '';
    while (true) {
        const result = fileRegex.exec(stack);
        if (!result) {
            break;
        }
        // Check to see if the any cleanupIndexes partially overlap with this match
        const overlappingRange = cleanUpIndexes.some(([start, end]) => result.index < end && start < fileRegex.lastIndex);
        // anoynimize user file paths that do not need to be retained or cleaned up.
        if (!nodeModulesRegex.test(result[0]) && !overlappingRange) {
            updatedStack += stack.substring(lastIndex, result.index) + '<REDACTED: user-file-path>';
            lastIndex = fileRegex.lastIndex;
        }
    }
    if (lastIndex < stack.length) {
        updatedStack += stack.substr(lastIndex);
    }
    return updatedStack;
}
/**
 * Attempts to remove commonly leaked PII
 * @param property The property which will be removed if it contains user data
 * @returns The new value for the property
 */
function removePropertiesWithPossibleUserInfo(property) {
    // If for some reason it is undefined we skip it (this shouldn't be possible);
    if (!property) {
        return property;
    }
    const userDataRegexes = [
        { label: 'Google API Key', regex: /AIza[A-Za-z0-9_\\\-]{35}/ },
        { label: 'Slack Token', regex: /xox[pbar]\-[A-Za-z0-9]/ },
        {
            label: 'GitHub Token',
            regex: /(gh[psuro]_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})/,
        },
        {
            label: 'Generic Secret',
            regex: /(key|token|sig|secret|signature|password|passwd|pwd|android:value)[^a-zA-Z0-9]/i,
        },
        {
            label: 'CLI Credentials',
            regex: /((login|psexec|(certutil|psexec)\.exe).{1,50}(\s-u(ser(name)?)?\s+.{3,100})?\s-(admin|user|vm|root)?p(ass(word)?)?\s+["']?[^$\-\/\s]|(^|[\s\r\n\\])net(\.exe)?.{1,5}(user\s+|share\s+\/user:| user -? secrets ? set) \s + [^ $\s \/])/,
        },
        {
            label: 'Microsoft Entra ID',
            regex: /eyJ(?:0eXAiOiJKV1Qi|hbGci|[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.)/,
        },
        { label: 'Email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ },
    ];
    // Check for common user data in the telemetry events
    for (const secretRegex of userDataRegexes) {
        if (secretRegex.regex.test(property)) {
            return `<REDACTED: ${secretRegex.label}>`;
        }
    }
    return property;
}
/**
 * Does a best possible effort to clean a data object from any possible PII.
 * @param data The data object to clean
 * @param paths Any additional patterns that should be removed from the data set
 * @returns A new object with the PII removed
 */
export function cleanData(data, cleanUpPatterns) {
    return cloneAndChange(data, (value) => {
        // If it's a trusted value it means it's okay to skip cleaning so we don't clean it
        if (value instanceof TelemetryTrustedValue ||
            Object.hasOwnProperty.call(value, 'isTrustedTelemetryValue')) {
            return value.value;
        }
        // We only know how to clean strings
        if (typeof value === 'string') {
            let updatedProperty = value.replaceAll('%20', ' ');
            // First we anonymize any possible file paths
            updatedProperty = anonymizeFilePaths(updatedProperty, cleanUpPatterns);
            // Then we do a simple regex replace with the defined patterns
            for (const regexp of cleanUpPatterns) {
                updatedProperty = updatedProperty.replace(regexp, '');
            }
            // Lastly, remove commonly leaked PII
            updatedProperty = removePropertiesWithPossibleUserInfo(updatedProperty);
            return updatedProperty;
        }
        return undefined;
    });
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvY29tbW9uL3RlbGVtZXRyeVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXhELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUsxQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDckUsT0FBTyxFQU9OLG1DQUFtQyxFQUNuQyx3QkFBd0IsRUFDeEIsb0JBQW9CLEdBQ3BCLE1BQU0sZ0JBQWdCLENBQUE7QUFFdkI7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxxQkFBcUI7SUFHakMsWUFBNEIsS0FBUTtRQUFSLFVBQUssR0FBTCxLQUFLLENBQUc7UUFGcEMsMEdBQTBHO1FBQzFGLDRCQUF1QixHQUFHLElBQUksQ0FBQTtJQUNQLENBQUM7Q0FDeEM7QUFFRCxNQUFNLE9BQU8seUJBQXlCO0lBQXRDO1FBRVUsbUJBQWMsK0JBQXNCO1FBQ3BDLGNBQVMsR0FBRyxxQkFBcUIsQ0FBQTtRQUNqQyxjQUFTLEdBQUcscUJBQXFCLENBQUE7UUFDakMsVUFBSyxHQUFHLGlCQUFpQixDQUFBO1FBQ3pCLGdCQUFXLEdBQUcsdUJBQXVCLENBQUE7UUFDckMscUJBQWdCLEdBQUcsNEJBQTRCLENBQUE7UUFDL0MsdUJBQWtCLEdBQUcsS0FBSyxDQUFBO0lBTXBDLENBQUM7SUFMQSxTQUFTLEtBQUksQ0FBQztJQUNkLFVBQVUsS0FBSSxDQUFD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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9jb21tb24vdGVsZW1ldHJ5VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBSzFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNyRSxPQUFPLEVBT04sbUNBQW1DLEVBQ25DLHdCQUF3QixFQUN4QixvQkFBb0IsR0FDcEIsTUFBTSxnQkFBZ0IsQ0FBQTtBQUV2Qjs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLHFCQUFxQjtJQUdqQyxZQUE0QixLQUFRO1FBQVIsVUFBSyxHQUFMLEtBQUssQ0FBRztRQUZwQywwR0FBMEc7UUFDMUYsNEJBQXVCLEdBQUcsSUFBSSxDQUFBO0lBQ1AsQ0FBQztDQUN4QztBQUVELE1BQU0sT0FBTyx5QkFBeUI7SUFBdEM7UUFFVSxtQkFBYywrQkFBc0I7UUFDcEMsY0FBUyxHQUFHLHFCQUFxQixDQUFBO1FBQ2pDLGNBQVMsR0FBRyxxQkFBcUIsQ0FBQTtRQUNqQyxVQUFLLEdBQUcsaUJBQWlCLENBQUE7UUFDekIsZ0JBQVcsR0FBRyx1QkFBdUIsQ0FBQTtRQUNyQyxxQkFBZ0IsR0FBRyw0QkFBNEIsQ0FBQTtRQUMvQyx1QkFBa0IsR0FBRyxLQUFLLENBQUE7SUFNcEMsQ0FBQztJQUxBLFNBQVMsS0FBSSxDQUFDO0lBQ2QsVUFBVSxLQUFJ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
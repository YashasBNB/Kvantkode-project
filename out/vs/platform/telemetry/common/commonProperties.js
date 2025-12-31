/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLinuxSnap, platform, PlatformToString } from '../../../base/common/platform.js';
import { env, platform as nodePlatform } from '../../../base/common/process.js';
import { generateUuid } from '../../../base/common/uuid.js';
function getPlatformDetail(hostname) {
    if (platform === 2 /* Platform.Linux */ && /^penguin(\.|$)/i.test(hostname)) {
        return 'chromebook';
    }
    return undefined;
}
export function resolveCommonProperties(release, hostname, arch, commit, version, machineId, sqmId, devDeviceId, isInternalTelemetry, product) {
    const result = Object.create(null);
    // __GDPR__COMMON__ "common.machineId" : { "endPoint": "MacAddressHash", "classification": "EndUserPseudonymizedInformation", "purpose": "FeatureInsight" }
    result['common.machineId'] = machineId;
    // __GDPR__COMMON__ "common.sqmId" : { "endPoint": "SqmMachineId", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }
    result['common.sqmId'] = sqmId;
    // __GDPR__COMMON__ "common.devDeviceId" : { "endPoint": "SqmMachineId", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }
    result['common.devDeviceId'] = devDeviceId;
    // __GDPR__COMMON__ "sessionID" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['sessionID'] = generateUuid() + Date.now();
    // __GDPR__COMMON__ "commitHash" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['commitHash'] = commit;
    // __GDPR__COMMON__ "version" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['version'] = version;
    // __GDPR__COMMON__ "common.platformVersion" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.platformVersion'] = (release || '').replace(/^(\d+)(\.\d+)?(\.\d+)?(.*)/, '$1$2$3');
    // __GDPR__COMMON__ "common.platform" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.platform'] = PlatformToString(platform);
    // __GDPR__COMMON__ "common.nodePlatform" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.nodePlatform'] = nodePlatform;
    // __GDPR__COMMON__ "common.nodeArch" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.nodeArch'] = arch;
    // __GDPR__COMMON__ "common.product" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.product'] = product || 'desktop';
    if (isInternalTelemetry) {
        // __GDPR__COMMON__ "common.msftInternal" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        result['common.msftInternal'] = isInternalTelemetry;
    }
    // dynamic properties which value differs on each call
    let seq = 0;
    const startTime = Date.now();
    Object.defineProperties(result, {
        // __GDPR__COMMON__ "timestamp" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        timestamp: {
            get: () => new Date(),
            enumerable: true,
        },
        // __GDPR__COMMON__ "common.timesincesessionstart" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        'common.timesincesessionstart': {
            get: () => Date.now() - startTime,
            enumerable: true,
        },
        // __GDPR__COMMON__ "common.sequence" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        'common.sequence': {
            get: () => seq++,
            enumerable: true,
        },
    });
    if (isLinuxSnap) {
        // __GDPR__COMMON__ "common.snap" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        result['common.snap'] = 'true';
    }
    const platformDetail = getPlatformDetail(hostname);
    if (platformDetail) {
        // __GDPR__COMMON__ "common.platformDetail" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        result['common.platformDetail'] = platformDetail;
    }
    return result;
}
export function verifyMicrosoftInternalDomain(domainList) {
    const userDnsDomain = env['USERDNSDOMAIN'];
    if (!userDnsDomain) {
        return false;
    }
    const domain = userDnsDomain.toLowerCase();
    return domainList.some((msftDomain) => domain === msftDomain);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uUHJvcGVydGllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9jb21tb24vY29tbW9uUHJvcGVydGllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBWSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxHQUFHLEVBQUUsUUFBUSxJQUFJLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUczRCxTQUFTLGlCQUFpQixDQUFDLFFBQWdCO0lBQzFDLElBQUksUUFBUSwyQkFBbUIsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUNyRSxPQUFPLFlBQVksQ0FBQTtJQUNwQixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsT0FBZSxFQUNmLFFBQWdCLEVBQ2hCLElBQVksRUFDWixNQUEwQixFQUMxQixPQUEyQixFQUMzQixTQUE2QixFQUM3QixLQUF5QixFQUN6QixXQUErQixFQUMvQixtQkFBNEIsRUFDNUIsT0FBZ0I7SUFFaEIsTUFBTSxNQUFNLEdBQXNCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFckQsMkpBQTJKO0lBQzNKLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLFNBQVMsQ0FBQTtJQUN0QyxzSkFBc0o7SUFDdEosTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEtBQUssQ0FBQTtJQUM5Qiw0SkFBNEo7SUFDNUosTUFBTSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsV0FBVyxDQUFBO0lB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
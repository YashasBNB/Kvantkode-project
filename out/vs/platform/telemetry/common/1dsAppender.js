/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../amdX.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
import { mixin } from '../../../base/common/objects.js';
import { isWeb } from '../../../base/common/platform.js';
import { validateTelemetryData } from './telemetryUtils.js';
const endpointUrl = 'https://mobile.events.data.microsoft.com/OneCollector/1.0';
const endpointHealthUrl = 'https://mobile.events.data.microsoft.com/ping';
async function getClient(instrumentationKey, addInternalFlag, xhrOverride) {
    // eslint-disable-next-line local/code-amd-node-module
    const oneDs = isWeb
        ? await importAMDNodeModule('@microsoft/1ds-core-js', 'bundle/ms.core.min.js')
        : await import('@microsoft/1ds-core-js');
    // eslint-disable-next-line local/code-amd-node-module
    const postPlugin = isWeb
        ? await importAMDNodeModule('@microsoft/1ds-post-js', 'bundle/ms.post.min.js')
        : await import('@microsoft/1ds-post-js');
    const appInsightsCore = new oneDs.AppInsightsCore();
    const collectorChannelPlugin = new postPlugin.PostChannel();
    // Configure the app insights core to send to collector++ and disable logging of debug info
    const coreConfig = {
        instrumentationKey,
        endpointUrl,
        loggingLevelTelemetry: 0,
        loggingLevelConsole: 0,
        disableCookiesUsage: true,
        disableDbgExt: true,
        disableInstrumentationKeyValidation: true,
        channels: [[collectorChannelPlugin]],
    };
    if (xhrOverride) {
        coreConfig.extensionConfig = {};
        // Configure the channel to use a XHR Request override since it's not available in node
        const channelConfig = {
            alwaysUseXhrOverride: true,
            ignoreMc1Ms0CookieProcessing: true,
            httpXHROverride: xhrOverride,
        };
        coreConfig.extensionConfig[collectorChannelPlugin.identifier] = channelConfig;
    }
    appInsightsCore.initialize(coreConfig, []);
    appInsightsCore.addTelemetryInitializer((envelope) => {
        // Opt the user out of 1DS data sharing
        envelope['ext'] = envelope['ext'] ?? {};
        envelope['ext']['web'] = envelope['ext']['web'] ?? {};
        envelope['ext']['web']['consentDetails'] = '{"GPC_DataSharingOptIn":false}';
        if (addInternalFlag) {
            envelope['ext']['utc'] = envelope['ext']['utc'] ?? {};
            // Sets it to be internal only based on Windows UTC flagging
            envelope['ext']['utc']['flags'] = 0x0000811ecd;
        }
    });
    return appInsightsCore;
}
// TODO @lramos15 maybe make more in line with src/vs/platform/telemetry/browser/appInsightsAppender.ts with caching support
export class AbstractOneDataSystemAppender {
    constructor(_isInternalTelemetry, _eventPrefix, _defaultData, iKeyOrClientFactory, // allow factory function for testing
    _xhrOverride) {
        this._isInternalTelemetry = _isInternalTelemetry;
        this._eventPrefix = _eventPrefix;
        this._defaultData = _defaultData;
        this._xhrOverride = _xhrOverride;
        this.endPointUrl = endpointUrl;
        this.endPointHealthUrl = endpointHealthUrl;
        if (!this._defaultData) {
            this._defaultData = {};
        }
        if (typeof iKeyOrClientFactory === 'function') {
            this._aiCoreOrKey = iKeyOrClientFactory();
        }
        else {
            this._aiCoreOrKey = iKeyOrClientFactory;
        }
        this._asyncAiCore = null;
    }
    _withAIClient(callback) {
        if (!this._aiCoreOrKey) {
            return;
        }
        if (typeof this._aiCoreOrKey !== 'string') {
            callback(this._aiCoreOrKey);
            return;
        }
        if (!this._asyncAiCore) {
            this._asyncAiCore = getClient(this._aiCoreOrKey, this._isInternalTelemetry, this._xhrOverride);
        }
        this._asyncAiCore.then((aiClient) => {
            callback(aiClient);
        }, (err) => {
            onUnexpectedError(err);
            console.error(err);
        });
    }
    log(eventName, data) {
        if (!this._aiCoreOrKey) {
            return;
        }
        data = mixin(data, this._defaultData);
        data = validateTelemetryData(data);
        const name = this._eventPrefix + '/' + eventName;
        try {
            this._withAIClient((aiClient) => {
                aiClient.pluginVersionString = data?.properties.version ?? 'Unknown';
                aiClient.track({
                    name,
                    baseData: { name, properties: data?.properties, measurements: data?.measurements },
                });
            });
        }
        catch { }
    }
    flush() {
        if (this._aiCoreOrKey) {
            return new Promise((resolve) => {
                this._withAIClient((aiClient) => {
                    aiClient.unload(true, () => {
                        this._aiCoreOrKey = undefined;
                        resolve(undefined);
                    });
                });
            });
        }
        return Promise.resolve(undefined);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMWRzQXBwZW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvY29tbW9uLzFkc0FwcGVuZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFzQixxQkFBcUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBVS9FLE1BQU0sV0FBVyxHQUFHLDJEQUEyRCxDQUFBO0FBQy9FLE1BQU0saUJBQWlCLEdBQUcsK0NBQStDLENBQUE7QUFFekUsS0FBSyxVQUFVLFNBQVMsQ0FDdkIsa0JBQTBCLEVBQzFCLGVBQXlCLEVBQ3pCLFdBQTBCO0lBRTFCLHNEQUFzRDtJQUN0RCxNQUFNLEtBQUssR0FBRyxLQUFLO1FBQ2xCLENBQUMsQ0FBQyxNQUFNLG1CQUFtQixDQUN6Qix3QkFBd0IsRUFDeEIsdUJBQXVCLENBQ3ZCO1FBQ0YsQ0FBQyxDQUFDLE1BQU0sTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUE7SUFDekMsc0RBQXNEO0lBQ3RELE1BQU0sVUFBVSxHQUFHLEtBQUs7UUFDdkIsQ0FBQyxDQUFDLE1BQU0sbUJBQW1CLENBQ3pCLHdCQUF3QixFQUN4Qix1QkFBdUIsQ0FDdkI7UUFDRixDQUFDLENBQUMsTUFBTSxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUV6QyxNQUFNLGVBQWUsR0FBRyxJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUNuRCxNQUFNLHNCQUFz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
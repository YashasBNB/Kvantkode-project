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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMWRzQXBwZW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9jb21tb24vMWRzQXBwZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQXNCLHFCQUFxQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFVL0UsTUFBTSxXQUFXLEdBQUcsMkRBQTJELENBQUE7QUFDL0UsTUFBTSxpQkFBaUIsR0FBRywrQ0FBK0MsQ0FBQTtBQUV6RSxLQUFLLFVBQVUsU0FBUyxDQUN2QixrQkFBMEIsRUFDMUIsZUFBeUIsRUFDekIsV0FBMEI7SUFFMUIsc0RBQXNEO0lBQ3RELE1BQU0sS0FBSyxHQUFHLEtBQUs7UUFDbEIsQ0FBQyxDQUFDLE1BQU0sbUJBQW1CLENBQ3pCLHdCQUF3QixFQUN4Qix1QkFBdUIsQ0FDdkI7UUFDRixDQUFDLENBQUMsTUFBTSxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUN6QyxzREFBc0Q7SUFDdEQsTUFBTSxVQUFVLEdBQUcsS0FBSztRQUN2QixDQUFDLENBQUMsTUFBTSxtQkFBbUIsQ0FDekIsd0JBQXdCLEVBQ3hCLHVCQUF1QixDQUN2QjtRQUNGLENBQUMsQ0FBQyxNQUFNLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0lBRXpDLE1BQU0sZUFBZSxHQUFHLElBQUksS0FBSyxDQUFDLGVBQWUsRUFB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { mixin } from '../../../base/common/objects.js';
import { isWeb } from '../../../base/common/platform.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { localize } from '../../../nls.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { Extensions, } from '../../configuration/common/configurationRegistry.js';
import product from '../../product/common/product.js';
import { IProductService } from '../../product/common/productService.js';
import { Registry } from '../../registry/common/platform.js';
import { TELEMETRY_CRASH_REPORTER_SETTING_ID, TELEMETRY_OLD_SETTING_ID, TELEMETRY_SECTION_ID, TELEMETRY_SETTING_ID, } from './telemetry.js';
import { cleanData, getTelemetryLevel } from './telemetryUtils.js';
let TelemetryService = class TelemetryService {
    static { this.IDLE_START_EVENT_NAME = 'UserIdleStart'; }
    static { this.IDLE_STOP_EVENT_NAME = 'UserIdleStop'; }
    constructor(config, _configurationService, _productService) {
        this._configurationService = _configurationService;
        this._productService = _productService;
        this._experimentProperties = {};
        this._disposables = new DisposableStore();
        this._cleanupPatterns = [];
        this._appenders = config.appenders;
        this._commonProperties = config.commonProperties ?? Object.create(null);
        this.sessionId = this._commonProperties['sessionID'];
        this.machineId = this._commonProperties['common.machineId'];
        this.sqmId = this._commonProperties['common.sqmId'];
        this.devDeviceId = this._commonProperties['common.devDeviceId'];
        this.firstSessionDate = this._commonProperties['common.firstSessionDate'];
        this.msftInternal = this._commonProperties['common.msftInternal'];
        this._piiPaths = config.piiPaths || [];
        this._telemetryLevel = 3 /* TelemetryLevel.USAGE */;
        this._sendErrorTelemetry = !!config.sendErrorTelemetry;
        // static cleanup pattern for: `vscode-file:///DANGEROUS/PATH/resources/app/Useful/Information`
        this._cleanupPatterns = [/(vscode-)?file:\/\/\/.*?\/resources\/app\//gi];
        for (const piiPath of this._piiPaths) {
            this._cleanupPatterns.push(new RegExp(escapeRegExpCharacters(piiPath), 'gi'));
            if (piiPath.indexOf('\\') >= 0) {
                this._cleanupPatterns.push(new RegExp(escapeRegExpCharacters(piiPath.replace(/\\/g, '/')), 'gi'));
            }
        }
        this._updateTelemetryLevel();
        this._disposables.add(this._configurationService.onDidChangeConfiguration((e) => {
            // Check on the telemetry settings and update the state if changed
            const affectsTelemetryConfig = e.affectsConfiguration(TELEMETRY_SETTING_ID) ||
                e.affectsConfiguration(TELEMETRY_OLD_SETTING_ID) ||
                e.affectsConfiguration(TELEMETRY_CRASH_REPORTER_SETTING_ID);
            if (affectsTelemetryConfig) {
                this._updateTelemetryLevel();
            }
        }));
    }
    setExperimentProperty(name, value) {
        this._experimentProperties[name] = value;
    }
    _updateTelemetryLevel() {
        let level = getTelemetryLevel(this._configurationService);
        const collectableTelemetry = this._productService.enabledTelemetryLevels;
        // Also ensure that error telemetry is respecting the product configuration for collectable telemetry
        if (collectableTelemetry) {
            this._sendErrorTelemetry = this.sendErrorTelemetry ? collectableTelemetry.error : false;
            // Make sure the telemetry level from the service is the minimum of the config and product
            const maxCollectableTelemetryLevel = collectableTelemetry.usage
                ? 3 /* TelemetryLevel.USAGE */
                : collectableTelemetry.error
                    ? 2 /* TelemetryLevel.ERROR */
                    : 0 /* TelemetryLevel.NONE */;
            level = Math.min(level, maxCollectableTelemetryLevel);
        }
        this._telemetryLevel = level;
    }
    get sendErrorTelemetry() {
        return this._sendErrorTelemetry;
    }
    get telemetryLevel() {
        return this._telemetryLevel;
    }
    dispose() {
        this._disposables.dispose();
    }
    _log(eventName, eventLevel, data) {
        // don't send events when the user is optout
        if (this._telemetryLevel < eventLevel) {
            return;
        }
        // add experiment properties
        data = mixin(data, this._experimentProperties);
        // remove all PII from data
        data = cleanData(data, this._cleanupPatterns);
        // add common properties
        data = mixin(data, this._commonProperties);
        // Log to the appenders of sufficient level
        this._appenders.forEach((a) => a.log(eventName, data));
    }
    publicLog(eventName, data) {
        this._log(eventName, 3 /* TelemetryLevel.USAGE */, data);
    }
    publicLog2(eventName, data) {
        this.publicLog(eventName, data);
    }
    publicLogError(errorEventName, data) {
        if (!this._sendErrorTelemetry) {
            return;
        }
        // Send error event and anonymize paths
        this._log(errorEventName, 2 /* TelemetryLevel.ERROR */, data);
    }
    publicLogError2(eventName, data) {
        this.publicLogError(eventName, data);
    }
};
TelemetryService = __decorate([
    __param(1, IConfigurationService),
    __param(2, IProductService)
], TelemetryService);
export { TelemetryService };
function getTelemetryLevelSettingDescription() {
    const telemetryText = localize('telemetry.telemetryLevelMd', 'The default telemetry setting for VS Code (Microsoft). {0} recommends keeping this off.', product.nameLong);
    // const externalLinksStatement = !product.privacyStatementUrl ?
    // 	localize("telemetry.docsStatement", "Read more about the [data we collect]({0}).", 'https://aka.ms/vscode-telemetry') :
    // 	localize("telemetry.docsAndPrivacyStatement", "Read more about the [data we collect]({0}) and our [privacy statement]({1}).", 'https://aka.ms/vscode-telemetry', product.privacyStatementUrl);
    const restartString = !isWeb
        ? localize('telemetry.restart', 'Microsoft says \"Some third party extensions might not respect this setting. Consult the specific extension\'s documentation to be sure. A full restart of the application is necessary for crash reporting changes to take effect.\"')
        : '';
    // Void removed these
    // const crashReportsHeader = localize('telemetry.crashReports', "Crash Reports");
    // const errorsHeader = localize('telemetry.errors', "Error Telemetry");
    // const usageHeader = localize('telemetry.usage', "Usage Data");
    // const telemetryTableDescription = localize('telemetry.telemetryLevel.tableDescription', "The following table outlines the data sent with each setting:");
    // 	const telemetryTable = `
    // |       | ${crashReportsHeader} | ${errorsHeader} | ${usageHeader} |
    // |:------|:-------------:|:---------------:|:----------:|
    // | all   |       ✓       |        ✓        |     ✓      |
    // | error |       ✓       |        ✓        |     -      |
    // | crash |       ✓       |        -        |     -      |
    // | off   |       -       |        -        |     -      |
    // `;
    // const deprecatedSettingNote = localize('telemetry.telemetryLevel.deprecated', "****Note:*** If this setting is 'off', no telemetry will be sent regardless of other telemetry settings. If this setting is set to anything except 'off' and telemetry is disabled with deprecated settings, no telemetry will be sent.*");
    const telemetryDescription = `
${telemetryText}

${restartString}

KvantKode separately records basic usage like the number of messages people are sending. If you'd like to disable KvantKode metrics, you may do so in KvantKode's Settings.
`;
    return telemetryDescription;
}
const configurationRegistry = Registry.as(Extensions.Configuration);
configurationRegistry.registerConfiguration({
    id: TELEMETRY_SECTION_ID,
    order: 1,
    type: 'object',
    title: localize('telemetryConfigurationTitle', 'Telemetry'),
    properties: {
        [TELEMETRY_SETTING_ID]: {
            type: 'string',
            enum: [
                "all" /* TelemetryConfiguration.ON */,
                "error" /* TelemetryConfiguration.ERROR */,
                "crash" /* TelemetryConfiguration.CRASH */,
                "off" /* TelemetryConfiguration.OFF */,
            ],
            enumDescriptions: [
                localize('telemetry.telemetryLevel.default', 'Sends usage data, errors, and crash reports.'),
                localize('telemetry.telemetryLevel.error', 'Sends general error telemetry and crash reports.'),
                localize('telemetry.telemetryLevel.crash', 'Sends OS level crash reports.'),
                localize('telemetry.telemetryLevel.off', 'Disables all product telemetry.'),
            ],
            markdownDescription: getTelemetryLevelSettingDescription(),
            default: "all" /* TelemetryConfiguration.ON */,
            restricted: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['usesOnlineServices', 'telemetry'],
            policy: {
                name: 'TelemetryLevel',
                minimumVersion: '1.99',
                description: localize('telemetry.telemetryLevel.policyDescription', 'Controls the level of telemetry.'),
            },
        },
        'telemetry.feedback.enabled': {
            type: 'boolean',
            default: true,
            description: localize('telemetry.feedback.enabled', 'Enable feedback mechanisms such as the issue reporter, surveys, and feedback options in features like Copilot Chat.'),
            policy: {
                name: 'EnableFeedback',
                minimumVersion: '1.99',
            },
        },
        // Deprecated telemetry setting
        [TELEMETRY_OLD_SETTING_ID]: {
            type: 'boolean',
            markdownDescription: !product.privacyStatementUrl
                ? localize('telemetry.enableTelemetry', 'Enable diagnostic data to be collected. This helps us to better understand how {0} is performing and where improvements need to be made.', product.nameLong)
                : localize('telemetry.enableTelemetryMd', 'Enable diagnostic data to be collected. This helps us to better understand how {0} is performing and where improvements need to be made. [Read more]({1}) about what we collect and our privacy statement.', product.nameLong, product.privacyStatementUrl),
            default: true,
            restricted: true,
            markdownDeprecationMessage: localize('enableTelemetryDeprecated', "If this setting is false, no telemetry will be sent regardless of the new setting's value. Deprecated in favor of the {0} setting.", `\`#${TELEMETRY_SETTING_ID}#\``),
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['usesOnlineServices', 'telemetry'],
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2NvbW1vbi90ZWxlbWV0cnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBRU4sVUFBVSxHQUVWLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RCxPQUFPLEVBS04sbUNBQW1DLEVBQ25DLHdCQUF3QixFQUN4QixvQkFBb0IsRUFDcEIsb0JBQW9CLEdBRXBCLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkIsT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBc0IsTUFBTSxxQkFBcUIsQ0FBQTtBQVMvRSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjthQUNaLDBCQUFxQixHQUFHLGVBQWUsQUFBbEIsQ0FBa0I7YUFDdkMseUJBQW9CLEdBQUcsY0FBYyxBQUFqQixD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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9jb21tb24vdGVsZW1ldHJ5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUVOLFVBQVUsR0FFVixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsT0FBTyxFQUtOLG1DQUFtQyxFQUNuQyx3QkFBd0IsRUFDeEIsb0JBQW9CLEVBQ3BCLG9CQUFvQixHQUVwQixNQUFNLGdCQUFnQixDQUFBO0FBQ3ZCLE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQXNCLE1BQU0scUJBQXFCLENBQUE7QUFTL0UsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBZ0I7YUFDWiwwQkFBcUIsR0FBRyxlQUFlLEFBQWxCLENBQWtCO2FBQ3ZDLHlCQUFvQixHQUFHLGNBQWMsQUFBakIsQ0FBaUI7SUFxQnJELFlBQ0MsTUFBK0Is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
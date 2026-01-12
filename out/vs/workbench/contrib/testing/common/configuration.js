/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { observableFromEvent } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, } from '../../../common/configuration.js';
export var TestingConfigKeys;
(function (TestingConfigKeys) {
    TestingConfigKeys["AutoOpenPeekView"] = "testing.automaticallyOpenPeekView";
    TestingConfigKeys["AutoOpenPeekViewDuringContinuousRun"] = "testing.automaticallyOpenPeekViewDuringAutoRun";
    TestingConfigKeys["OpenResults"] = "testing.automaticallyOpenTestResults";
    TestingConfigKeys["FollowRunningTest"] = "testing.followRunningTest";
    TestingConfigKeys["DefaultGutterClickAction"] = "testing.defaultGutterClickAction";
    TestingConfigKeys["GutterEnabled"] = "testing.gutterEnabled";
    TestingConfigKeys["SaveBeforeTest"] = "testing.saveBeforeTest";
    TestingConfigKeys["AlwaysRevealTestOnStateChange"] = "testing.alwaysRevealTestOnStateChange";
    TestingConfigKeys["CountBadge"] = "testing.countBadge";
    TestingConfigKeys["ShowAllMessages"] = "testing.showAllMessages";
    TestingConfigKeys["CoveragePercent"] = "testing.displayedCoveragePercent";
    TestingConfigKeys["ShowCoverageInExplorer"] = "testing.showCoverageInExplorer";
    TestingConfigKeys["CoverageBarThresholds"] = "testing.coverageBarThresholds";
    TestingConfigKeys["CoverageToolbarEnabled"] = "testing.coverageToolbarEnabled";
})(TestingConfigKeys || (TestingConfigKeys = {}));
export var AutoOpenTesting;
(function (AutoOpenTesting) {
    AutoOpenTesting["NeverOpen"] = "neverOpen";
    AutoOpenTesting["OpenOnTestStart"] = "openOnTestStart";
    AutoOpenTesting["OpenOnTestFailure"] = "openOnTestFailure";
    AutoOpenTesting["OpenExplorerOnTestStart"] = "openExplorerOnTestStart";
})(AutoOpenTesting || (AutoOpenTesting = {}));
export var AutoOpenPeekViewWhen;
(function (AutoOpenPeekViewWhen) {
    AutoOpenPeekViewWhen["FailureVisible"] = "failureInVisibleDocument";
    AutoOpenPeekViewWhen["FailureAnywhere"] = "failureAnywhere";
    AutoOpenPeekViewWhen["Never"] = "never";
})(AutoOpenPeekViewWhen || (AutoOpenPeekViewWhen = {}));
export var DefaultGutterClickAction;
(function (DefaultGutterClickAction) {
    DefaultGutterClickAction["Run"] = "run";
    DefaultGutterClickAction["Debug"] = "debug";
    DefaultGutterClickAction["Coverage"] = "runWithCoverage";
    DefaultGutterClickAction["ContextMenu"] = "contextMenu";
})(DefaultGutterClickAction || (DefaultGutterClickAction = {}));
export var TestingCountBadge;
(function (TestingCountBadge) {
    TestingCountBadge["Failed"] = "failed";
    TestingCountBadge["Off"] = "off";
    TestingCountBadge["Passed"] = "passed";
    TestingCountBadge["Skipped"] = "skipped";
})(TestingCountBadge || (TestingCountBadge = {}));
export var TestingDisplayedCoveragePercent;
(function (TestingDisplayedCoveragePercent) {
    TestingDisplayedCoveragePercent["TotalCoverage"] = "totalCoverage";
    TestingDisplayedCoveragePercent["Statement"] = "statement";
    TestingDisplayedCoveragePercent["Minimum"] = "minimum";
})(TestingDisplayedCoveragePercent || (TestingDisplayedCoveragePercent = {}));
export const testingConfiguration = {
    id: 'testing',
    order: 21,
    title: localize('testConfigurationTitle', 'Testing'),
    type: 'object',
    properties: {
        ["testing.automaticallyOpenPeekView" /* TestingConfigKeys.AutoOpenPeekView */]: {
            description: localize('testing.automaticallyOpenPeekView', 'Configures when the error Peek view is automatically opened.'),
            enum: [
                "failureAnywhere" /* AutoOpenPeekViewWhen.FailureAnywhere */,
                "failureInVisibleDocument" /* AutoOpenPeekViewWhen.FailureVisible */,
                "never" /* AutoOpenPeekViewWhen.Never */,
            ],
            default: "never" /* AutoOpenPeekViewWhen.Never */,
            enumDescriptions: [
                localize('testing.automaticallyOpenPeekView.failureAnywhere', 'Open automatically no matter where the failure is.'),
                localize('testing.automaticallyOpenPeekView.failureInVisibleDocument', 'Open automatically when a test fails in a visible document.'),
                localize('testing.automaticallyOpenPeekView.never', 'Never automatically open.'),
            ],
        },
        ["testing.showAllMessages" /* TestingConfigKeys.ShowAllMessages */]: {
            description: localize('testing.showAllMessages', 'Controls whether to show messages from all test runs.'),
            type: 'boolean',
            default: false,
        },
        ["testing.automaticallyOpenPeekViewDuringAutoRun" /* TestingConfigKeys.AutoOpenPeekViewDuringContinuousRun */]: {
            description: localize('testing.automaticallyOpenPeekViewDuringContinuousRun', 'Controls whether to automatically open the Peek view during continuous run mode.'),
            type: 'boolean',
            default: false,
        },
        ["testing.countBadge" /* TestingConfigKeys.CountBadge */]: {
            description: localize('testing.countBadge', 'Controls the count badge on the Testing icon on the Activity Bar.'),
            enum: [
                "failed" /* TestingCountBadge.Failed */,
                "off" /* TestingCountBadge.Off */,
                "passed" /* TestingCountBadge.Passed */,
                "skipped" /* TestingCountBadge.Skipped */,
            ],
            enumDescriptions: [
                localize('testing.countBadge.failed', 'Show the number of failed tests'),
                localize('testing.countBadge.off', 'Disable the testing count badge'),
                localize('testing.countBadge.passed', 'Show the number of passed tests'),
                localize('testing.countBadge.skipped', 'Show the number of skipped tests'),
            ],
            default: "failed" /* TestingCountBadge.Failed */,
        },
        ["testing.followRunningTest" /* TestingConfigKeys.FollowRunningTest */]: {
            description: localize('testing.followRunningTest', 'Controls whether the running test should be followed in the Test Explorer view.'),
            type: 'boolean',
            default: false,
        },
        ["testing.defaultGutterClickAction" /* TestingConfigKeys.DefaultGutterClickAction */]: {
            description: localize('testing.defaultGutterClickAction', 'Controls the action to take when left-clicking on a test decoration in the gutter.'),
            enum: [
                "run" /* DefaultGutterClickAction.Run */,
                "debug" /* DefaultGutterClickAction.Debug */,
                "runWithCoverage" /* DefaultGutterClickAction.Coverage */,
                "contextMenu" /* DefaultGutterClickAction.ContextMenu */,
            ],
            enumDescriptions: [
                localize('testing.defaultGutterClickAction.run', 'Run the test.'),
                localize('testing.defaultGutterClickAction.debug', 'Debug the test.'),
                localize('testing.defaultGutterClickAction.coverage', 'Run the test with coverage.'),
                localize('testing.defaultGutterClickAction.contextMenu', 'Open the context menu for more options.'),
            ],
            default: "run" /* DefaultGutterClickAction.Run */,
        },
        ["testing.gutterEnabled" /* TestingConfigKeys.GutterEnabled */]: {
            description: localize('testing.gutterEnabled', 'Controls whether test decorations are shown in the editor gutter.'),
            type: 'boolean',
            default: true,
        },
        ["testing.saveBeforeTest" /* TestingConfigKeys.SaveBeforeTest */]: {
            description: localize('testing.saveBeforeTest', 'Control whether save all dirty editors before running a test.'),
            type: 'boolean',
            default: true,
        },
        ["testing.automaticallyOpenTestResults" /* TestingConfigKeys.OpenResults */]: {
            enum: [
                "neverOpen" /* AutoOpenTesting.NeverOpen */,
                "openOnTestStart" /* AutoOpenTesting.OpenOnTestStart */,
                "openOnTestFailure" /* AutoOpenTesting.OpenOnTestFailure */,
                "openExplorerOnTestStart" /* AutoOpenTesting.OpenExplorerOnTestStart */,
            ],
            enumDescriptions: [
                localize('testing.openTesting.neverOpen', 'Never automatically open the testing views'),
                localize('testing.openTesting.openOnTestStart', 'Open the test results view when tests start'),
                localize('testing.openTesting.openOnTestFailure', 'Open the test result view on any test failure'),
                localize('testing.openTesting.openExplorerOnTestStart', 'Open the test explorer when tests start'),
            ],
            default: 'openOnTestStart',
            description: localize('testing.openTesting', 'Controls when the testing view should open.'),
        },
        ["testing.alwaysRevealTestOnStateChange" /* TestingConfigKeys.AlwaysRevealTestOnStateChange */]: {
            markdownDescription: localize('testing.alwaysRevealTestOnStateChange', 'Always reveal the executed test when {0} is on. If this setting is turned off, only failed tests will be revealed.', '`#testing.followRunningTest#`'),
            type: 'boolean',
            default: false,
        },
        ["testing.showCoverageInExplorer" /* TestingConfigKeys.ShowCoverageInExplorer */]: {
            description: localize('testing.ShowCoverageInExplorer', 'Whether test coverage should be down in the File Explorer view.'),
            type: 'boolean',
            default: true,
        },
        ["testing.displayedCoveragePercent" /* TestingConfigKeys.CoveragePercent */]: {
            markdownDescription: localize('testing.displayedCoveragePercent', 'Configures what percentage is displayed by default for test coverage.'),
            default: "totalCoverage" /* TestingDisplayedCoveragePercent.TotalCoverage */,
            enum: [
                "totalCoverage" /* TestingDisplayedCoveragePercent.TotalCoverage */,
                "statement" /* TestingDisplayedCoveragePercent.Statement */,
                "minimum" /* TestingDisplayedCoveragePercent.Minimum */,
            ],
            enumDescriptions: [
                localize('testing.displayedCoveragePercent.totalCoverage', 'A calculation of the combined statement, function, and branch coverage.'),
                localize('testing.displayedCoveragePercent.statement', 'The statement coverage.'),
                localize('testing.displayedCoveragePercent.minimum', 'The minimum of statement, function, and branch coverage.'),
            ],
        },
        ["testing.coverageBarThresholds" /* TestingConfigKeys.CoverageBarThresholds */]: {
            markdownDescription: localize('testing.coverageBarThresholds', 'Configures the colors used for percentages in test coverage bars.'),
            default: { red: 0, yellow: 60, green: 90 },
            properties: {
                red: { type: 'number', minimum: 0, maximum: 100, default: 0 },
                yellow: { type: 'number', minimum: 0, maximum: 100, default: 60 },
                green: { type: 'number', minimum: 0, maximum: 100, default: 90 },
            },
        },
        ["testing.coverageToolbarEnabled" /* TestingConfigKeys.CoverageToolbarEnabled */]: {
            description: localize('testing.coverageToolbarEnabled', 'Controls whether the coverage toolbar is shown in the editor.'),
            type: 'boolean',
            default: false, // todo@connor4312: disabled by default until UI sync
        },
    },
};
Registry.as(Extensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'testing.openTesting',
        migrateFn: (value) => {
            return [["testing.automaticallyOpenTestResults" /* TestingConfigKeys.OpenResults */, { value }]];
        },
    },
    {
        key: 'testing.automaticallyOpenResults', // insiders only during 1.96, remove after 1.97
        migrateFn: (value) => {
            return [["testing.automaticallyOpenTestResults" /* TestingConfigKeys.OpenResults */, { value }]];
        },
    },
]);
export const getTestingConfiguration = (config, key) => config.getValue(key);
export const observeTestingConfiguration = (config, key) => observableFromEvent(config.onDidChangeConfiguration, () => getTestingConfiguration(config, key));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vY29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFHN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFFTixVQUFVLEdBRVYsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxNQUFNLENBQU4sSUFBa0IsaUJBZWpCO0FBZkQsV0FBa0IsaUJBQWlCO0lBQ2xDLDJFQUFzRCxDQUFBO0lBQ3RELDJHQUFzRixDQUFBO0lBQ3RGLHlFQUFvRCxDQUFBO0lBQ3BELG9FQUErQyxDQUFBO0lBQy9DLGtGQUE2RCxDQUFBO0lBQzdELDREQUF1QyxDQUFBO0lBQ3ZDLDhEQUF5QyxDQUFBO0lBQ3pDLDRGQUF1RSxDQUFBO0lBQ3ZFLHNEQUFpQyxDQUFBO0lBQ2pDLGdFQUEyQyxDQUFBO0lBQzNDLHlFQUFvRCxDQUFBO0lBQ3BELDhFQUF5RCxDQUFBO0lBQ3pELDRFQUF1RCxDQUFBO0lBQ3ZELDhFQUF5RCxDQUFBO0FBQzFELENBQUMsRUFmaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQWVsQztBQUVELE1BQU0sQ0FBTixJQUFrQixlQUtqQjtBQUxELFdBQWtCLGVBQWU7SUFDaEMsMENBQXVCLENBQUE7SUFDdkIsc0RBQW1DLENBQUE7SUFDbkMsMERBQXVDLENBQUE7SUFDdkMsc0VBQW1ELENBQUE7QUFDcEQsQ0FBQyxFQUxpQixlQUFlLEtBQWYsZUFBZSxRQUtoQztBQUVELE1BQU0sQ0FBTixJQUFrQixv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
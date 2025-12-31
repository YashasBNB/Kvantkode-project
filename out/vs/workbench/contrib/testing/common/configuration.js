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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL2NvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sVUFBVSxHQUVWLE1BQU0sa0NBQWtDLENBQUE7QUFFekMsTUFBTSxDQUFOLElBQWtCLGlCQWVqQjtBQWZELFdBQWtCLGlCQUFpQjtJQUNsQywyRUFBc0QsQ0FBQTtJQUN0RCwyR0FBc0YsQ0FBQTtJQUN0Rix5RUFBb0QsQ0FBQTtJQUNwRCxvRUFBK0MsQ0FBQTtJQUMvQyxrRkFBNkQsQ0FBQTtJQUM3RCw0REFBdUMsQ0FBQTtJQUN2Qyw4REFBeUMsQ0FBQTtJQUN6Qyw0RkFBdUUsQ0FBQTtJQUN2RSxzREFBaUMsQ0FBQTtJQUNqQyxnRUFBMkMsQ0FBQTtJQUMzQyx5RUFBb0QsQ0FBQTtJQUNwRCw4RUFBeUQsQ0FBQTtJQUN6RCw0RUFBdUQsQ0FBQTtJQUN2RCw4RUFBeUQsQ0FBQTtBQUMxRCxDQUFDLEVBZmlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFlbEM7QUFFRCxNQUFNLENBQU4sSUFBa0IsZUFLakI7QUFMRCxXQUFrQixlQUFlO0lBQ2hDLDBDQUF1QixDQUFBO0lBQ3ZCLHNEQUFtQyxDQUFBO0lBQ25DLDBEQUF1QyxDQUFBO0lBQ3ZDLHNFQUFtRCxDQUFBO0FBQ3BELENBQUMsRUFMaUIsZUFBZSxLQUFmLGVBQWUsUUFLaEM7QUFFRCxNQUFNLENBQU4sSUFBa0Isb0JBSWpC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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var TestingContextKeys;
(function (TestingContextKeys) {
    TestingContextKeys.providerCount = new RawContextKey('testing.providerCount', 0);
    TestingContextKeys.canRefreshTests = new RawContextKey('testing.canRefresh', false, {
        type: 'boolean',
        description: localize('testing.canRefresh', 'Indicates whether any test controller has an attached refresh handler.'),
    });
    TestingContextKeys.isRefreshingTests = new RawContextKey('testing.isRefreshing', false, {
        type: 'boolean',
        description: localize('testing.isRefreshing', 'Indicates whether any test controller is currently refreshing tests.'),
    });
    TestingContextKeys.isContinuousModeOn = new RawContextKey('testing.isContinuousModeOn', false, {
        type: 'boolean',
        description: localize('testing.isContinuousModeOn', 'Indicates whether continuous test mode is on.'),
    });
    TestingContextKeys.hasDebuggableTests = new RawContextKey('testing.hasDebuggableTests', false, {
        type: 'boolean',
        description: localize('testing.hasDebuggableTests', 'Indicates whether any test controller has registered a debug configuration'),
    });
    TestingContextKeys.hasRunnableTests = new RawContextKey('testing.hasRunnableTests', false, {
        type: 'boolean',
        description: localize('testing.hasRunnableTests', 'Indicates whether any test controller has registered a run configuration'),
    });
    TestingContextKeys.hasCoverableTests = new RawContextKey('testing.hasCoverableTests', false, {
        type: 'boolean',
        description: localize('testing.hasCoverableTests', 'Indicates whether any test controller has registered a coverage configuration'),
    });
    TestingContextKeys.hasNonDefaultProfile = new RawContextKey('testing.hasNonDefaultProfile', false, {
        type: 'boolean',
        description: localize('testing.hasNonDefaultConfig', 'Indicates whether any test controller has registered a non-default configuration'),
    });
    TestingContextKeys.hasConfigurableProfile = new RawContextKey('testing.hasConfigurableProfile', false, {
        type: 'boolean',
        description: localize('testing.hasConfigurableConfig', 'Indicates whether any test configuration can be configured'),
    });
    TestingContextKeys.supportsContinuousRun = new RawContextKey('testing.supportsContinuousRun', false, {
        type: 'boolean',
        description: localize('testing.supportsContinuousRun', 'Indicates whether continous test running is supported'),
    });
    TestingContextKeys.isParentRunningContinuously = new RawContextKey('testing.isParentRunningContinuously', false, {
        type: 'boolean',
        description: localize('testing.isParentRunningContinuously', 'Indicates whether the parent of a test is continuously running, set in the menu context of test items'),
    });
    TestingContextKeys.activeEditorHasTests = new RawContextKey('testing.activeEditorHasTests', false, {
        type: 'boolean',
        description: localize('testing.activeEditorHasTests', 'Indicates whether any tests are present in the current editor'),
    });
    TestingContextKeys.cursorInsideTestRange = new RawContextKey('testing.cursorInsideTestRange', false, {
        type: 'boolean',
        description: localize('testing.cursorInsideTestRange', 'Whether the cursor is currently inside a test range'),
    });
    TestingContextKeys.isTestCoverageOpen = new RawContextKey('testing.isTestCoverageOpen', false, {
        type: 'boolean',
        description: localize('testing.isTestCoverageOpen', 'Indicates whether a test coverage report is open'),
    });
    TestingContextKeys.hasPerTestCoverage = new RawContextKey('testing.hasPerTestCoverage', false, {
        type: 'boolean',
        description: localize('testing.hasPerTestCoverage', 'Indicates whether per-test coverage is available'),
    });
    TestingContextKeys.isCoverageFilteredToTest = new RawContextKey('testing.isCoverageFilteredToTest', false, {
        type: 'boolean',
        description: localize('testing.isCoverageFilteredToTest', 'Indicates whether coverage has been filterd to a single test'),
    });
    TestingContextKeys.coverageToolbarEnabled = new RawContextKey('testing.coverageToolbarEnabled', true, {
        type: 'boolean',
        description: localize('testing.coverageToolbarEnabled', 'Indicates whether the coverage toolbar is enabled'),
    });
    TestingContextKeys.inlineCoverageEnabled = new RawContextKey('testing.inlineCoverageEnabled', false, {
        type: 'boolean',
        description: localize('testing.inlineCoverageEnabled', 'Indicates whether inline coverage is shown'),
    });
    TestingContextKeys.canGoToRelatedCode = new RawContextKey('testing.canGoToRelatedCode', false, {
        type: 'boolean',
        description: localize('testing.canGoToRelatedCode', 'Whether a controller implements a capability to find code related to a test'),
    });
    TestingContextKeys.canGoToRelatedTest = new RawContextKey('testing.canGoToRelatedTest', false, {
        type: 'boolean',
        description: localize('testing.canGoToRelatedTest', 'Whether a controller implements a capability to find tests related to code'),
    });
    TestingContextKeys.peekHasStack = new RawContextKey('testing.peekHasStack', false, {
        type: 'boolean',
        description: localize('testing.peekHasStack', 'Whether the message shown in a peek view has a stack trace'),
    });
    TestingContextKeys.capabilityToContextKey = {
        [2 /* TestRunProfileBitset.Run */]: TestingContextKeys.hasRunnableTests,
        [8 /* TestRunProfileBitset.Coverage */]: TestingContextKeys.hasCoverableTests,
        [4 /* TestRunProfileBitset.Debug */]: TestingContextKeys.hasDebuggableTests,
        [16 /* TestRunProfileBitset.HasNonDefaultProfile */]: TestingContextKeys.hasNonDefaultProfile,
        [32 /* TestRunProfileBitset.HasConfigurable */]: TestingContextKeys.hasConfigurableProfile,
        [64 /* TestRunProfileBitset.SupportsContinuousRun */]: TestingContextKeys.supportsContinuousRun,
    };
    TestingContextKeys.hasAnyResults = new RawContextKey('testing.hasAnyResults', false);
    TestingContextKeys.viewMode = new RawContextKey('testing.explorerViewMode', "list" /* TestExplorerViewMode.List */);
    TestingContextKeys.viewSorting = new RawContextKey('testing.explorerViewSorting', "location" /* TestExplorerViewSorting.ByLocation */);
    TestingContextKeys.isRunning = new RawContextKey('testing.isRunning', false);
    TestingContextKeys.isInPeek = new RawContextKey('testing.isInPeek', false);
    TestingContextKeys.isPeekVisible = new RawContextKey('testing.isPeekVisible', false);
    TestingContextKeys.peekItemType = new RawContextKey('peekItemType', undefined, {
        type: 'string',
        description: localize('testing.peekItemType', 'Type of the item in the output peek view. Either a "test", "message", "task", or "result".'),
    });
    TestingContextKeys.controllerId = new RawContextKey('controllerId', undefined, {
        type: 'string',
        description: localize('testing.controllerId', 'Controller ID of the current test item'),
    });
    TestingContextKeys.testItemExtId = new RawContextKey('testId', undefined, {
        type: 'string',
        description: localize('testing.testId', 'ID of the current test item, set when creating or opening menus on test items'),
    });
    TestingContextKeys.testItemHasUri = new RawContextKey('testing.testItemHasUri', false, {
        type: 'boolean',
        description: localize('testing.testItemHasUri', 'Boolean indicating whether the test item has a URI defined'),
    });
    TestingContextKeys.testItemIsHidden = new RawContextKey('testing.testItemIsHidden', false, {
        type: 'boolean',
        description: localize('testing.testItemIsHidden', 'Boolean indicating whether the test item is hidden'),
    });
    TestingContextKeys.testMessageContext = new RawContextKey('testMessage', undefined, {
        type: 'string',
        description: localize('testing.testMessage', 'Value set in `testMessage.contextValue`, available in editor/content and testing/message/context'),
    });
    TestingContextKeys.testResultOutdated = new RawContextKey('testResultOutdated', undefined, {
        type: 'boolean',
        description: localize('testing.testResultOutdated', 'Value available in editor/content and testing/message/context when the result is outdated'),
    });
    TestingContextKeys.testResultState = new RawContextKey('testResultState', undefined, {
        type: 'string',
        description: localize('testing.testResultState', 'Value available testing/item/result indicating the state of the item.'),
    });
    TestingContextKeys.testProfileContextGroup = new RawContextKey('testing.profile.context.group', undefined, {
        type: 'string',
        description: localize('testing.profile.context.group', 'Type of menu where the configure testing profile submenu exists. Either "run", "debug", or "coverage"'),
    });
})(TestingContextKeys || (TestingContextKeys = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbnRleHRLZXlzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdGluZ0NvbnRleHRLZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFJcEYsTUFBTSxLQUFXLGtCQUFrQixDQWlQbEM7QUFqUEQsV0FBaUIsa0JBQWtCO0lBQ3JCLGdDQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0Qsa0NBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLEVBQUU7UUFDN0UsSUFBSSxFQUFFLFNBQVM7UUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQixvQkFBb0IsRUFDcEIsd0VBQXdFLENBQ3hFO0tBQ0QsQ0FBQyxDQUFBO0lBQ1csb0NBQWlCLEdBQUcsSUFBSSxhQUFhLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxFQUFFO1FBQ2pGLElBQUksRUFBRSxTQUFTO1FBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsc0JBQXNCLEVBQ3RCLHNFQUFzRSxDQUN0RTtLQUNELENBQUMsQ0FBQTtJQUNXLHFDQUFrQixHQUFHLElBQUksYUFBYSxDQUNsRCw0QkFBNEIsRUFDNUIsS0FBSyxFQUNMO1FBQ0MsSUFBSSxFQUFFLFNBQVM7UUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQiw0QkFBNEIsRUFDNUIsK0NBQStDLENBQy9DO0tBQ0QsQ0FDRCxDQUFBO0lBQ1kscUNBQWtCLEdBQUcsSUFBSSxhQUFhLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxFQUFFO1FBQ3hGLElBQUks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
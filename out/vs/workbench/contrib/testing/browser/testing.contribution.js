/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { localize, localize2 } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Extensions as ViewContainerExtensions, } from '../../../common/views.js';
import { REVEAL_IN_EXPLORER_COMMAND_ID } from '../../files/browser/fileConstants.js';
import { CodeCoverageDecorations } from './codeCoverageDecorations.js';
import { testingResultsIcon, testingViewIcon } from './icons.js';
import { TestCoverageView } from './testCoverageView.js';
import { TestingDecorationService, TestingDecorations } from './testingDecorations.js';
import { TestingExplorerView } from './testingExplorerView.js';
import { CloseTestPeek, CollapsePeekStack, GoToNextMessageAction, GoToPreviousMessageAction, OpenMessageInEditorAction, TestResultsView, TestingOutputPeekController, TestingPeekOpener, ToggleTestingPeekHistory, } from './testingOutputPeek.js';
import { TestingProgressTrigger } from './testingProgressUiService.js';
import { TestingViewPaneContainer } from './testingViewPaneContainer.js';
import { testingConfiguration } from '../common/configuration.js';
import { ITestCoverageService, TestCoverageService } from '../common/testCoverageService.js';
import { ITestExplorerFilterState, TestExplorerFilterState, } from '../common/testExplorerFilterState.js';
import { TestId } from '../common/testId.js';
import { canUseProfileWithTest, ITestProfileService, TestProfileService, } from '../common/testProfileService.js';
import { ITestResultService, TestResultService } from '../common/testResultService.js';
import { ITestResultStorage, TestResultStorage } from '../common/testResultStorage.js';
import { ITestService } from '../common/testService.js';
import { TestService } from '../common/testServiceImpl.js';
import { TestingContentProvider } from '../common/testingContentProvider.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import { ITestingContinuousRunService, TestingContinuousRunService, } from '../common/testingContinuousRunService.js';
import { ITestingDecorationsService } from '../common/testingDecorations.js';
import { ITestingPeekOpener } from '../common/testingPeekOpener.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { allTestActions, discoverAndRunTests } from './testExplorerActions.js';
import './testingConfigurationUi.js';
registerSingleton(ITestService, TestService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestResultStorage, TestResultStorage, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestProfileService, TestProfileService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestCoverageService, TestCoverageService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestingContinuousRunService, TestingContinuousRunService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestResultService, TestResultService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestExplorerFilterState, TestExplorerFilterState, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestingPeekOpener, TestingPeekOpener, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestingDecorationsService, TestingDecorationService, 1 /* InstantiationType.Delayed */);
const viewContainer = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: "workbench.view.extension.test" /* Testing.ViewletId */,
    title: localize2('test', 'Testing'),
    ctorDescriptor: new SyncDescriptor(TestingViewPaneContainer),
    icon: testingViewIcon,
    alwaysUseContainerInfo: true,
    order: 6,
    openCommandActionDescriptor: {
        id: "workbench.view.extension.test" /* Testing.ViewletId */,
        mnemonicTitle: localize({ key: 'miViewTesting', comment: ['&& denotes a mnemonic'] }, 'T&&esting'),
        // todo: coordinate with joh whether this is available
        // keybindings: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_SEMICOLON },
        order: 4,
    },
    hideIfEmpty: true,
}, 0 /* ViewContainerLocation.Sidebar */);
const testResultsViewContainer = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: "workbench.panel.testResults" /* Testing.ResultsPanelId */,
    title: localize2('testResultsPanelName', 'Test Results'),
    icon: testingResultsIcon,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
        "workbench.panel.testResults" /* Testing.ResultsPanelId */,
        { mergeViewWithContainerWhenSingleView: true },
    ]),
    hideIfEmpty: true,
    order: 3,
}, 1 /* ViewContainerLocation.Panel */, { doNotRegisterOpenCommand: true });
const viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
viewsRegistry.registerViews([
    {
        id: "workbench.panel.testResults.view" /* Testing.ResultsViewId */,
        name: localize2('testResultsPanelName', 'Test Results'),
        containerIcon: testingResultsIcon,
        canToggleVisibility: false,
        canMoveView: true,
        when: TestingContextKeys.hasAnyResults.isEqualTo(true),
        ctorDescriptor: new SyncDescriptor(TestResultsView),
    },
], testResultsViewContainer);
viewsRegistry.registerViewWelcomeContent("workbench.view.testing" /* Testing.ExplorerViewId */, {
    content: localize('noTestProvidersRegistered', 'No tests have been found in this workspace yet.'),
});
viewsRegistry.registerViewWelcomeContent("workbench.view.testing" /* Testing.ExplorerViewId */, {
    content: '[' +
        localize('searchForAdditionalTestExtensions', 'Install Additional Test Extensions...') +
        `](command:${"testing.searchForTestExtension" /* TestCommandId.SearchForTestExtension */})`,
    order: 10,
});
viewsRegistry.registerViews([
    {
        id: "workbench.view.testing" /* Testing.ExplorerViewId */,
        name: localize2('testExplorer', 'Test Explorer'),
        ctorDescriptor: new SyncDescriptor(TestingExplorerView),
        canToggleVisibility: true,
        canMoveView: true,
        weight: 80,
        order: -999,
        containerIcon: testingViewIcon,
        when: ContextKeyExpr.greater(TestingContextKeys.providerCount.key, 0),
    },
    {
        id: "workbench.view.testCoverage" /* Testing.CoverageViewId */,
        name: localize2('testCoverage', 'Test Coverage'),
        ctorDescriptor: new SyncDescriptor(TestCoverageView),
        canToggleVisibility: true,
        canMoveView: true,
        weight: 80,
        order: -998,
        containerIcon: testingViewIcon,
        when: TestingContextKeys.isTestCoverageOpen,
    },
], viewContainer);
allTestActions.forEach(registerAction2);
registerAction2(OpenMessageInEditorAction);
registerAction2(GoToPreviousMessageAction);
registerAction2(GoToNextMessageAction);
registerAction2(CloseTestPeek);
registerAction2(ToggleTestingPeekHistory);
registerAction2(CollapsePeekStack);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(TestingContentProvider, 3 /* LifecyclePhase.Restored */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(TestingPeekOpener, 4 /* LifecyclePhase.Eventually */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(TestingProgressTrigger, 4 /* LifecyclePhase.Eventually */);
registerEditorContribution("editor.contrib.testingOutputPeek" /* Testing.OutputPeekContributionId */, TestingOutputPeekController, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorContribution("editor.contrib.testingDecorations" /* Testing.DecorationsContributionId */, TestingDecorations, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorContribution("editor.contrib.coverageDecorations" /* Testing.CoverageDecorationsContributionId */, CodeCoverageDecorations, 3 /* EditorContributionInstantiation.Eventually */);
CommandsRegistry.registerCommand({
    id: '_revealTestInExplorer',
    handler: async (accessor, testId, focus) => {
        accessor
            .get(ITestExplorerFilterState)
            .reveal.set(typeof testId === 'string' ? testId : testId.extId, undefined);
        accessor.get(IViewsService).openView("workbench.view.testing" /* Testing.ExplorerViewId */, focus);
    },
});
CommandsRegistry.registerCommand({
    id: "testing.startContinuousRunFromExtension" /* TestCommandId.StartContinousRunFromExtension */,
    handler: async (accessor, profileRef, tests) => {
        const profiles = accessor.get(ITestProfileService);
        const collection = accessor.get(ITestService).collection;
        const profile = profiles
            .getControllerProfiles(profileRef.controllerId)
            .find((p) => p.profileId === profileRef.profileId);
        if (!profile?.supportsContinuousRun) {
            return;
        }
        const crService = accessor.get(ITestingContinuousRunService);
        for (const test of tests) {
            const found = collection.getNodeById(test.extId);
            if (found && canUseProfileWithTest(profile, found)) {
                crService.start([profile], found.item.extId);
            }
        }
    },
});
CommandsRegistry.registerCommand({
    id: "testing.stopContinuousRunFromExtension" /* TestCommandId.StopContinousRunFromExtension */,
    handler: async (accessor, tests) => {
        const crService = accessor.get(ITestingContinuousRunService);
        for (const test of tests) {
            crService.stop(test.extId);
        }
    },
});
CommandsRegistry.registerCommand({
    id: 'vscode.peekTestError',
    handler: async (accessor, extId) => {
        const lookup = accessor.get(ITestResultService).getStateById(extId);
        if (!lookup) {
            return false;
        }
        const [result, ownState] = lookup;
        const opener = accessor.get(ITestingPeekOpener);
        if (opener.tryPeekFirstError(result, ownState)) {
            // fast path
            return true;
        }
        for (const test of result.tests) {
            if (TestId.compare(ownState.item.extId, test.item.extId) === 2 /* TestPosition.IsChild */ &&
                opener.tryPeekFirstError(result, test)) {
                return true;
            }
        }
        return false;
    },
});
CommandsRegistry.registerCommand({
    id: 'vscode.revealTest',
    handler: async (accessor, extId, opts) => {
        const test = accessor.get(ITestService).collection.getNodeById(extId);
        if (!test) {
            return;
        }
        const commandService = accessor.get(ICommandService);
        const fileService = accessor.get(IFileService);
        const openerService = accessor.get(IOpenerService);
        const { range, uri } = test.item;
        if (!uri) {
            return;
        }
        // If an editor has the file open, there are decorations. Try to adjust the
        // revealed range to those decorations (#133441).
        const position = accessor.get(ITestingDecorationsService).getDecoratedTestPosition(uri, extId) ||
            range?.getStartPosition();
        accessor.get(ITestExplorerFilterState).reveal.set(extId, undefined);
        accessor.get(ITestingPeekOpener).closeAllPeeks();
        let isFile = true;
        try {
            if (!(await fileService.stat(uri)).isFile) {
                isFile = false;
            }
        }
        catch {
            // ignored
        }
        if (!isFile) {
            await commandService.executeCommand(REVEAL_IN_EXPLORER_COMMAND_ID, uri);
            return;
        }
        await openerService.open(position ? uri.with({ fragment: `L${position.lineNumber}:${position.column}` }) : uri, {
            openToSide: opts?.openToSide,
            editorOptions: {
                preserveFocus: opts?.preserveFocus,
            },
        });
    },
});
CommandsRegistry.registerCommand({
    id: 'vscode.runTestsById',
    handler: async (accessor, group, ...testIds) => {
        const testService = accessor.get(ITestService);
        await discoverAndRunTests(accessor.get(ITestService).collection, accessor.get(IProgressService), testIds, (tests) => testService.runTests({ group, tests }));
    },
});
CommandsRegistry.registerCommand({
    id: 'vscode.testing.getControllersWithTests',
    handler: async (accessor) => {
        const testService = accessor.get(ITestService);
        return [...testService.collection.rootItems]
            .filter((r) => r.children.size > 0)
            .map((r) => r.controllerId);
    },
});
CommandsRegistry.registerCommand({
    id: 'vscode.testing.getTestsInFile',
    handler: async (accessor, uri) => {
        const testService = accessor.get(ITestService);
        return [...testService.collection.getNodeByUrl(uri)].map((t) => TestId.split(t.item.extId));
    },
});
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration(testingConfiguration);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdGluZy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFFTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUdOLFVBQVUs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
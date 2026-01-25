/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isDefined } from '../../../../base/common/types.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { SymbolNavigationAction } from '../../../../editor/contrib/gotoSymbol/browser/goToCommands.js';
import { ReferencesModel } from '../../../../editor/contrib/gotoSymbol/browser/referencesModel.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { PeekContext } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, ContextKeyGreaterExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { widgetClose } from '../../../../platform/theme/common/iconRegistry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { TestItemTreeElement } from './explorerProjections/index.js';
import * as icons from './icons.js';
import { getTestingConfiguration } from '../common/configuration.js';
import { testConfigurationGroupNames, } from '../common/constants.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
import { TestId } from '../common/testId.js';
import { ITestProfileService, canUseProfileWithTest } from '../common/testProfileService.js';
import { ITestResultService } from '../common/testResultService.js';
import { ITestService, expandAndGetTestById, testsInFile, testsUnderUri, } from '../common/testService.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import { ITestingContinuousRunService } from '../common/testingContinuousRunService.js';
import { ITestingPeekOpener } from '../common/testingPeekOpener.js';
import { isFailedState } from '../common/testingStates.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
const category = Categories.Test;
var ActionOrder;
(function (ActionOrder) {
    // Navigation:
    ActionOrder[ActionOrder["Refresh"] = 10] = "Refresh";
    ActionOrder[ActionOrder["Run"] = 11] = "Run";
    ActionOrder[ActionOrder["Debug"] = 12] = "Debug";
    ActionOrder[ActionOrder["Coverage"] = 13] = "Coverage";
    ActionOrder[ActionOrder["RunContinuous"] = 14] = "RunContinuous";
    ActionOrder[ActionOrder["RunUsing"] = 15] = "RunUsing";
    // Submenu:
    ActionOrder[ActionOrder["Collapse"] = 16] = "Collapse";
    ActionOrder[ActionOrder["ClearResults"] = 17] = "ClearResults";
    ActionOrder[ActionOrder["DisplayMode"] = 18] = "DisplayMode";
    ActionOrder[ActionOrder["Sort"] = 19] = "Sort";
    ActionOrder[ActionOrder["GoToTest"] = 20] = "GoToTest";
    ActionOrder[ActionOrder["HideTest"] = 21] = "HideTest";
    ActionOrder[ActionOrder["ContinuousRunTest"] = 2147483647] = "ContinuousRunTest";
})(ActionOrder || (ActionOrder = {}));
const hasAnyTestProvider = ContextKeyGreaterExpr.create(TestingContextKeys.providerCount.key, 0);
const LABEL_RUN_TESTS = localize2('runSelectedTests', 'Run Tests');
const LABEL_DEBUG_TESTS = localize2('debugSelectedTests', 'Debug Tests');
const LABEL_COVERAGE_TESTS = localize2('coverageSelectedTests', 'Run Tests with Coverage');
export class HideTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.hideTest" /* TestCommandId.HideTestAction */,
            title: localize2('hideTest', 'Hide Test'),
            menu: {
                id: MenuId.TestItem,
                group: 'builtin@2',
                when: TestingContextKeys.testItemIsHidden.isEqualTo(false),
            },
        });
    }
    run(accessor, ...elements) {
        const service = accessor.get(ITestService);
        for (const element of elements) {
            service.excluded.toggle(element.test, true);
        }
        return Promise.resolve();
    }
}
export class UnhideTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.unhideTest" /* TestCommandId.UnhideTestAction */,
            title: localize2('unhideTest', 'Unhide Test'),
            menu: {
                id: MenuId.TestItem,
                order: 21 /* ActionOrder.HideTest */,
                when: TestingContextKeys.testItemIsHidden.isEqualTo(true),
            },
        });
    }
    run(accessor, ...elements) {
        const service = accessor.get(ITestService);
        for (const element of elements) {
            if (element instanceof TestItemTreeElement) {
                service.excluded.toggle(element.test, false);
            }
        }
        return Promise.resolve();
    }
}
export class UnhideAllTestsAction extends Action2 {
    constructor() {
        super({
            id: "testing.unhideAllTests" /* TestCommandId.UnhideAllTestsAction */,
            title: localize2('unhideAllTests', 'Unhide All Tests'),
        });
    }
    run(accessor) {
        const service = accessor.get(ITestService);
        service.excluded.clear();
        return Promise.resolve();
    }
}
const testItemInlineAndInContext = (order, when) => [
    {
        id: MenuId.TestItem,
        group: 'inline',
        order,
        when,
    },
    {
        id: MenuId.TestItem,
        group: 'builtin@1',
        order,
        when,
    },
];
class RunVisibleAction extends ViewAction {
    constructor(bitset, desc) {
        super({
            ...desc,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
        });
        this.bitset = bitset;
    }
    /**
     * @override
     */
    runInView(accessor, view, ...elements) {
        const { include, exclude } = view.getTreeIncludeExclude(this.bitset, elements.map((e) => e.test));
        return accessor.get(ITestService).runTests({
            tests: include,
            exclude,
            group: this.bitset,
        });
    }
}
export class DebugAction extends RunVisibleAction {
    constructor() {
        super(4 /* TestRunProfileBitset.Debug */, {
            id: "testing.debug" /* TestCommandId.DebugAction */,
            title: localize2('debug test', 'Debug Test'),
            icon: icons.testingDebugIcon,
            menu: testItemInlineAndInContext(12 /* ActionOrder.Debug */, TestingContextKeys.hasDebuggableTests.isEqualTo(true)),
        });
    }
}
export class CoverageAction extends RunVisibleAction {
    constructor() {
        super(8 /* TestRunProfileBitset.Coverage */, {
            id: "testing.coverage" /* TestCommandId.RunWithCoverageAction */,
            title: localize2('run with cover test', 'Run Test with Coverage'),
            icon: icons.testingCoverageIcon,
            menu: testItemInlineAndInContext(13 /* ActionOrder.Coverage */, TestingContextKeys.hasCoverableTests.isEqualTo(true)),
        });
    }
}
export class RunUsingProfileAction extends Action2 {
    constructor() {
        super({
            id: "testing.runUsing" /* TestCommandId.RunUsingProfileAction */,
            title: localize2('testing.runUsing', 'Execute Using Profile...'),
            icon: icons.testingDebugIcon,
            menu: {
                id: MenuId.TestItem,
                order: 15 /* ActionOrder.RunUsing */,
                group: 'builtin@2',
                when: TestingContextKeys.hasNonDefaultProfile.isEqualTo(true),
            },
        });
    }
    async run(acessor, ...elements) {
        const commandService = acessor.get(ICommandService);
        const testService = acessor.get(ITestService);
        const profile = await commandService.executeCommand('vscode.pickTestProfile', {
            onlyForTest: elements[0].test,
        });
        if (!profile) {
            return;
        }
        testService.runResolvedTests({
            group: profile.group,
            targets: [
                {
                    profileId: profile.profileId,
                    controllerId: profile.controllerId,
                    testIds: elements
                        .filter((t) => canUseProfileWithTest(profile, t.test))
                        .map((t) => t.test.item.extId),
                },
            ],
        });
    }
}
export class RunAction extends RunVisibleAction {
    constructor() {
        super(2 /* TestRunProfileBitset.Run */, {
            id: "testing.run" /* TestCommandId.RunAction */,
            title: localize2('run test', 'Run Test'),
            icon: icons.testingRunIcon,
            menu: testItemInlineAndInContext(11 /* ActionOrder.Run */, TestingContextKeys.hasRunnableTests.isEqualTo(true)),
        });
    }
}
export class SelectDefaultTestProfiles extends Action2 {
    constructor() {
        super({
            id: "testing.selectDefaultTestProfiles" /* TestCommandId.SelectDefaultTestProfiles */,
            title: localize2('testing.selectDefaultTestProfiles', 'Select Default Profile'),
            icon: icons.testingUpdateProfiles,
            category,
        });
    }
    async run(acessor, onlyGroup) {
        const commands = acessor.get(ICommandService);
        const testProfileService = acessor.get(ITestProfileService);
        const profiles = await commands.executeCommand('vscode.pickMultipleTestProfiles', {
            showConfigureButtons: false,
            selected: testProfileService.getGroupDefaultProfiles(onlyGroup),
            onlyGroup,
        });
        if (profiles?.length) {
            testProfileService.setGroupDefaultProfiles(onlyGroup, profiles);
        }
    }
}
export class ContinuousRunTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.toggleContinuousRunForTest" /* TestCommandId.ToggleContinousRunForTest */,
            title: localize2('testing.toggleContinuousRunOn', 'Turn on Continuous Run'),
            icon: icons.testingTurnContinuousRunOn,
            precondition: ContextKeyExpr.or(TestingContextKeys.isContinuousModeOn.isEqualTo(true), TestingContextKeys.isParentRunningContinuously.isEqualTo(false)),
            toggled: {
                condition: TestingContextKeys.isContinuousModeOn.isEqualTo(true),
                icon: icons.testingContinuousIsOn,
                title: localize('testing.toggleContinuousRunOff', 'Turn off Continuous Run'),
            },
            menu: testItemInlineAndInContext(2147483647 /* ActionOrder.ContinuousRunTest */, TestingContextKeys.supportsContinuousRun.isEqualTo(true)),
        });
    }
    async run(accessor, ...elements) {
        const crService = accessor.get(ITestingContinuousRunService);
        for (const element of elements) {
            const id = element.test.item.extId;
            if (crService.isSpecificallyEnabledFor(id)) {
                crService.stop(id);
                continue;
            }
            crService.start(2 /* TestRunProfileBitset.Run */, id);
        }
    }
}
export class ContinuousRunUsingProfileTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.continuousRunUsingForTest" /* TestCommandId.ContinousRunUsingForTest */,
            title: localize2('testing.startContinuousRunUsing', 'Start Continous Run Using...'),
            icon: icons.testingDebugIcon,
            menu: [
                {
                    id: MenuId.TestItem,
                    order: 14 /* ActionOrder.RunContinuous */,
                    group: 'builtin@2',
                    when: ContextKeyExpr.and(TestingContextKeys.supportsContinuousRun.isEqualTo(true), TestingContextKeys.isContinuousModeOn.isEqualTo(false)),
                },
            ],
        });
    }
    async run(accessor, ...elements) {
        const crService = accessor.get(ITestingContinuousRunService);
        const profileService = accessor.get(ITestProfileService);
        const notificationService = accessor.get(INotificationService);
        const quickInputService = accessor.get(IQuickInputService);
        for (const element of elements) {
            const selected = await selectContinuousRunProfiles(crService, notificationService, quickInputService, [{ profiles: profileService.getControllerProfiles(element.test.controllerId) }]);
            if (selected.length) {
                crService.start(selected, element.test.item.extId);
            }
        }
    }
}
export class ConfigureTestProfilesAction extends Action2 {
    constructor() {
        super({
            id: "testing.configureProfile" /* TestCommandId.ConfigureTestProfilesAction */,
            title: localize2('testing.configureProfile', 'Configure Test Profiles'),
            icon: icons.testingUpdateProfiles,
            f1: true,
            category,
            menu: {
                id: MenuId.CommandPalette,
                when: TestingContextKeys.hasConfigurableProfile.isEqualTo(true),
            },
        });
    }
    async run(acessor, onlyGroup) {
        const commands = acessor.get(ICommandService);
        const testProfileService = acessor.get(ITestProfileService);
        const profile = await commands.executeCommand('vscode.pickTestProfile', {
            placeholder: localize('configureProfile', 'Select a profile to update'),
            showConfigureButtons: false,
            onlyConfigurable: true,
            onlyGroup,
        });
        if (profile) {
            testProfileService.configure(profile.controllerId, profile.profileId);
        }
    }
}
const continuousMenus = (whenIsContinuousOn) => [
    {
        id: MenuId.ViewTitle,
        group: 'navigation',
        order: 15 /* ActionOrder.RunUsing */,
        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), TestingContextKeys.supportsContinuousRun.isEqualTo(true), TestingContextKeys.isContinuousModeOn.isEqualTo(whenIsContinuousOn)),
    },
    {
        id: MenuId.CommandPalette,
        when: TestingContextKeys.supportsContinuousRun.isEqualTo(true),
    },
];
class StopContinuousRunAction extends Action2 {
    constructor() {
        super({
            id: "testing.stopContinuousRun" /* TestCommandId.StopContinousRun */,
            title: localize2('testing.stopContinuous', 'Stop Continuous Run'),
            category,
            icon: icons.testingTurnContinuousRunOff,
            menu: continuousMenus(true),
        });
    }
    run(accessor) {
        accessor.get(ITestingContinuousRunService).stop();
    }
}
function selectContinuousRunProfiles(crs, notificationService, quickInputService, profilesToPickFrom) {
    const items = [];
    for (const { controller, profiles } of profilesToPickFrom) {
        for (const profile of profiles) {
            if (profile.supportsContinuousRun) {
                items.push({
                    label: profile.label || controller?.label.get() || '',
                    description: controller?.label.get(),
                    profile,
                });
            }
        }
    }
    if (items.length === 0) {
        notificationService.info(localize('testing.noProfiles', 'No test continuous run-enabled profiles were found'));
        return Promise.resolve([]);
    }
    // special case: don't bother to quick a pickpick if there's only a single profile
    if (items.length === 1) {
        return Promise.resolve([items[0].profile]);
    }
    const qpItems = [];
    const selectedItems = [];
    const lastRun = crs.lastRunProfileIds;
    items.sort((a, b) => a.profile.group - b.profile.group ||
        a.profile.controllerId.localeCompare(b.profile.controllerId) ||
        a.label.localeCompare(b.label));
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (i === 0 || items[i - 1].profile.group !== item.profile.group) {
            qpItems.push({ type: 'separator', label: testConfigurationGroupNames[item.profile.group] });
        }
        qpItems.push(item);
        if (lastRun.has(item.profile.profileId)) {
            selectedItems.push(item);
        }
    }
    const disposables = new DisposableStore();
    const quickpick = disposables.add(quickInputService.createQuickPick({
        useSeparators: true,
    }));
    quickpick.title = localize('testing.selectContinuousProfiles', 'Select profiles to run when files change:');
    quickpick.canSelectMany = true;
    quickpick.items = qpItems;
    quickpick.selectedItems = selectedItems;
    quickpick.show();
    return new Promise((resolve) => {
        disposables.add(quickpick.onDidAccept(() => {
            resolve(quickpick.selectedItems.map((i) => i.profile));
            disposables.dispose();
        }));
        disposables.add(quickpick.onDidHide(() => {
            resolve([]);
            disposables.dispose();
        }));
    });
}
class StartContinuousRunAction extends Action2 {
    constructor() {
        super({
            id: "testing.startContinuousRun" /* TestCommandId.StartContinousRun */,
            title: localize2('testing.startContinuous', 'Start Continuous Run'),
            category,
            icon: icons.testingTurnContinuousRunOn,
            menu: continuousMenus(false),
        });
    }
    async run(accessor) {
        const crs = accessor.get(ITestingContinuousRunService);
        const profileService = accessor.get(ITestProfileService);
        const lastRunProfiles = [...profileService.all()].flatMap((p) => p.profiles.filter((p) => crs.lastRunProfileIds.has(p.profileId)));
        if (lastRunProfiles.length) {
            return crs.start(lastRunProfiles);
        }
        const selected = await selectContinuousRunProfiles(crs, accessor.get(INotificationService), accessor.get(IQuickInputService), accessor.get(ITestProfileService).all());
        if (selected.length) {
            crs.start(selected);
        }
    }
}
class ExecuteSelectedAction extends ViewAction {
    constructor(options, group) {
        super({
            ...options,
            menu: [
                {
                    id: MenuId.ViewTitle,
                    order: group === 2 /* TestRunProfileBitset.Run */
                        ? 11 /* ActionOrder.Run */
                        : group === 4 /* TestRunProfileBitset.Debug */
                            ? 12 /* ActionOrder.Debug */
                            : 13 /* ActionOrder.Coverage */,
                    group: 'navigation',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), TestingContextKeys.isRunning.isEqualTo(false), TestingContextKeys.capabilityToContextKey[group].isEqualTo(true)),
                },
            ],
            category,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
        });
        this.group = group;
    }
    /**
     * @override
     */
    runInView(accessor, view) {
        const { include, exclude } = view.getTreeIncludeExclude(this.group);
        return accessor.get(ITestService).runTests({ tests: include, exclude, group: this.group });
    }
}
export class GetSelectedProfiles extends Action2 {
    constructor() {
        super({
            id: "testing.getSelectedProfiles" /* TestCommandId.GetSelectedProfiles */,
            title: localize2('getSelectedProfiles', 'Get Selected Profiles'),
        });
    }
    /**
     * @override
     */
    run(accessor) {
        const profiles = accessor.get(ITestProfileService);
        return [
            ...profiles.getGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */),
            ...profiles.getGroupDefaultProfiles(4 /* TestRunProfileBitset.Debug */),
            ...profiles.getGroupDefaultProfiles(8 /* TestRunProfileBitset.Coverage */),
        ].map((p) => ({
            controllerId: p.controllerId,
            label: p.label,
            kind: p.group & 8 /* TestRunProfileBitset.Coverage */
                ? 3 /* ExtTestRunProfileKind.Coverage */
                : p.group & 4 /* TestRunProfileBitset.Debug */
                    ? 2 /* ExtTestRunProfileKind.Debug */
                    : 1 /* ExtTestRunProfileKind.Run */,
        }));
    }
}
export class GetExplorerSelection extends ViewAction {
    constructor() {
        super({
            id: "_testing.getExplorerSelection" /* TestCommandId.GetExplorerSelection */,
            title: localize2('getExplorerSelection', 'Get Explorer Selection'),
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        const { include, exclude } = view.getTreeIncludeExclude(2 /* TestRunProfileBitset.Run */, undefined, 'selected');
        const mapper = (i) => i.item.extId;
        return { include: include.map(mapper), exclude: exclude.map(mapper) };
    }
}
export class RunSelectedAction extends ExecuteSelectedAction {
    constructor() {
        super({
            id: "testing.runSelected" /* TestCommandId.RunSelectedAction */,
            title: LABEL_RUN_TESTS,
            icon: icons.testingRunAllIcon,
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
export class DebugSelectedAction extends ExecuteSelectedAction {
    constructor() {
        super({
            id: "testing.debugSelected" /* TestCommandId.DebugSelectedAction */,
            title: LABEL_DEBUG_TESTS,
            icon: icons.testingDebugAllIcon,
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
export class CoverageSelectedAction extends ExecuteSelectedAction {
    constructor() {
        super({
            id: "testing.coverageSelected" /* TestCommandId.CoverageSelectedAction */,
            title: LABEL_COVERAGE_TESTS,
            icon: icons.testingCoverageAllIcon,
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
const showDiscoveringWhile = (progress, task) => {
    return progress.withProgress({
        location: 10 /* ProgressLocation.Window */,
        title: localize('discoveringTests', 'Discovering Tests'),
    }, () => task);
};
class RunOrDebugAllTestsAction extends Action2 {
    constructor(options, group, noTestsFoundError) {
        super({
            ...options,
            category,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.capabilityToContextKey[group].isEqualTo(true),
                },
            ],
        });
        this.group = group;
        this.noTestsFoundError = noTestsFoundError;
    }
    async run(accessor) {
        const testService = accessor.get(ITestService);
        const notifications = accessor.get(INotificationService);
        const roots = [...testService.collection.rootItems].filter((r) => r.children.size ||
            r.expand === 1 /* TestItemExpandState.Expandable */ ||
            r.expand === 2 /* TestItemExpandState.BusyExpanding */);
        if (!roots.length) {
            notifications.info(this.noTestsFoundError);
            return;
        }
        await testService.runTests({ tests: roots, group: this.group });
    }
}
export class RunAllAction extends RunOrDebugAllTestsAction {
    constructor() {
        super({
            id: "testing.runAll" /* TestCommandId.RunAllAction */,
            title: localize2('runAllTests', 'Run All Tests'),
            icon: icons.testingRunAllIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 31 /* KeyCode.KeyA */),
            },
        }, 2 /* TestRunProfileBitset.Run */, localize('noTestProvider', 'No tests found in this workspace. You may need to install a test provider extension'));
    }
}
export class DebugAllAction extends RunOrDebugAllTestsAction {
    constructor() {
        super({
            id: "testing.debugAll" /* TestCommandId.DebugAllAction */,
            title: localize2('debugAllTests', 'Debug All Tests'),
            icon: icons.testingDebugIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */),
            },
        }, 4 /* TestRunProfileBitset.Debug */, localize('noDebugTestProvider', 'No debuggable tests found in this workspace. You may need to install a test provider extension'));
    }
}
export class CoverageAllAction extends RunOrDebugAllTestsAction {
    constructor() {
        super({
            id: "testing.coverageAll" /* TestCommandId.RunAllWithCoverageAction */,
            title: localize2('runAllWithCoverage', 'Run All Tests with Coverage'),
            icon: icons.testingCoverageIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */),
            },
        }, 8 /* TestRunProfileBitset.Coverage */, localize('noCoverageTestProvider', 'No tests with coverage runners found in this workspace. You may need to install a test provider extension'));
    }
}
export class CancelTestRunAction extends Action2 {
    constructor() {
        super({
            id: "testing.cancelRun" /* TestCommandId.CancelTestRunAction */,
            title: localize2('testing.cancelRun', 'Cancel Test Run'),
            icon: icons.testingCancelIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */),
            },
            menu: [
                {
                    id: MenuId.ViewTitle,
                    order: 11 /* ActionOrder.Run */,
                    group: 'navigation',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), ContextKeyExpr.equals(TestingContextKeys.isRunning.serialize(), true)),
                },
            ],
        });
    }
    /**
     * @override
     */
    async run(accessor, resultId, taskId) {
        const resultService = accessor.get(ITestResultService);
        const testService = accessor.get(ITestService);
        if (resultId) {
            testService.cancelTestRun(resultId, taskId);
        }
        else {
            for (const run of resultService.results) {
                if (!run.completedAt) {
                    testService.cancelTestRun(run.id);
                }
            }
        }
    }
}
export class TestingViewAsListAction extends ViewAction {
    constructor() {
        super({
            id: "testing.viewAsList" /* TestCommandId.TestingViewAsListAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.viewAsList', 'View as List'),
            toggled: TestingContextKeys.viewMode.isEqualTo("list" /* TestExplorerViewMode.List */),
            menu: {
                id: MenuId.ViewTitle,
                order: 18 /* ActionOrder.DisplayMode */,
                group: 'viewAs',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */),
            },
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewMode = "list" /* TestExplorerViewMode.List */;
    }
}
export class TestingViewAsTreeAction extends ViewAction {
    constructor() {
        super({
            id: "testing.viewAsTree" /* TestCommandId.TestingViewAsTreeAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.viewAsTree', 'View as Tree'),
            toggled: TestingContextKeys.viewMode.isEqualTo("true" /* TestExplorerViewMode.Tree */),
            menu: {
                id: MenuId.ViewTitle,
                order: 18 /* ActionOrder.DisplayMode */,
                group: 'viewAs',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */),
            },
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewMode = "true" /* TestExplorerViewMode.Tree */;
    }
}
export class TestingSortByStatusAction extends ViewAction {
    constructor() {
        super({
            id: "testing.sortByStatus" /* TestCommandId.TestingSortByStatusAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.sortByStatus', 'Sort by Status'),
            toggled: TestingContextKeys.viewSorting.isEqualTo("status" /* TestExplorerViewSorting.ByStatus */),
            menu: {
                id: MenuId.ViewTitle,
                order: 19 /* ActionOrder.Sort */,
                group: 'sortBy',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */),
            },
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewSorting = "status" /* TestExplorerViewSorting.ByStatus */;
    }
}
export class TestingSortByLocationAction extends ViewAction {
    constructor() {
        super({
            id: "testing.sortByLocation" /* TestCommandId.TestingSortByLocationAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.sortByLocation', 'Sort by Location'),
            toggled: TestingContextKeys.viewSorting.isEqualTo("location" /* TestExplorerViewSorting.ByLocation */),
            menu: {
                id: MenuId.ViewTitle,
                order: 19 /* ActionOrder.Sort */,
                group: 'sortBy',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */),
            },
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewSorting = "location" /* TestExplorerViewSorting.ByLocation */;
    }
}
export class TestingSortByDurationAction extends ViewAction {
    constructor() {
        super({
            id: "testing.sortByDuration" /* TestCommandId.TestingSortByDurationAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.sortByDuration', 'Sort by Duration'),
            toggled: TestingContextKeys.viewSorting.isEqualTo("duration" /* TestExplorerViewSorting.ByDuration */),
            menu: {
                id: MenuId.ViewTitle,
                order: 19 /* ActionOrder.Sort */,
                group: 'sortBy',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */),
            },
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewSorting = "duration" /* TestExplorerViewSorting.ByDuration */;
    }
}
export class ShowMostRecentOutputAction extends Action2 {
    constructor() {
        super({
            id: "testing.showMostRecentOutput" /* TestCommandId.ShowMostRecentOutputAction */,
            title: localize2('testing.showMostRecentOutput', 'Show Output'),
            category,
            icon: Codicon.terminal,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */),
            },
            precondition: TestingContextKeys.hasAnyResults.isEqualTo(true),
            menu: [
                {
                    id: MenuId.ViewTitle,
                    order: 16 /* ActionOrder.Collapse */,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */),
                },
                {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.hasAnyResults.isEqualTo(true),
                },
            ],
        });
    }
    async run(accessor) {
        const viewService = accessor.get(IViewsService);
        const testView = await viewService.openView("workbench.panel.testResults.view" /* Testing.ResultsViewId */, true);
        testView?.showLatestRun();
    }
}
export class CollapseAllAction extends ViewAction {
    constructor() {
        super({
            id: "testing.collapseAll" /* TestCommandId.CollapseAllAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.collapseAll', 'Collapse All Tests'),
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                order: 16 /* ActionOrder.Collapse */,
                group: 'displayAction',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */),
            },
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.collapseAll();
    }
}
export class ClearTestResultsAction extends Action2 {
    constructor() {
        super({
            id: "testing.clearTestResults" /* TestCommandId.ClearTestResultsAction */,
            title: localize2('testing.clearResults', 'Clear All Results'),
            category,
            icon: Codicon.clearAll,
            menu: [
                {
                    id: MenuId.TestPeekTitle,
                },
                {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.hasAnyResults.isEqualTo(true),
                },
                {
                    id: MenuId.ViewTitle,
                    order: 17 /* ActionOrder.ClearResults */,
                    group: 'displayAction',
                    when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */),
                },
                {
                    id: MenuId.ViewTitle,
                    order: 17 /* ActionOrder.ClearResults */,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', "workbench.panel.testResults.view" /* Testing.ResultsViewId */),
                },
            ],
        });
    }
    /**
     * @override
     */
    run(accessor) {
        accessor.get(ITestResultService).clear();
    }
}
export class GoToTest extends Action2 {
    constructor() {
        super({
            id: "testing.editFocusedTest" /* TestCommandId.GoToTest */,
            title: localize2('testing.editFocusedTest', 'Go to Test'),
            icon: Codicon.goToFile,
            menu: {
                id: MenuId.TestItem,
                group: 'builtin@1',
                order: 20 /* ActionOrder.GoToTest */,
                when: TestingContextKeys.testItemHasUri.isEqualTo(true),
            },
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ - 10,
                when: FocusedViewContext.isEqualTo("workbench.view.testing" /* Testing.ExplorerViewId */),
                primary: 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */,
            },
        });
    }
    async run(accessor, element, preserveFocus) {
        if (!element) {
            const view = accessor
                .get(IViewsService)
                .getActiveViewWithId("workbench.view.testing" /* Testing.ExplorerViewId */);
            element = view?.focusedTreeElements[0];
        }
        if (element && element instanceof TestItemTreeElement) {
            accessor
                .get(ICommandService)
                .executeCommand('vscode.revealTest', element.test.item.extId, preserveFocus);
        }
    }
}
async function getTestsAtCursor(testService, uriIdentityService, uri, position, filter) {
    // testsInFile will descend in the test tree. We assume that as we go
    // deeper, ranges get more specific. We'll want to run all tests whose
    // range is equal to the most specific range we find (see #133519)
    //
    // If we don't find any test whose range contains the position, we pick
    // the closest one before the position. Again, if we find several tests
    // whose range is equal to the closest one, we run them all.
    let bestNodes = [];
    let bestRange;
    let bestNodesBefore = [];
    let bestRangeBefore;
    for await (const test of testsInFile(testService, uriIdentityService, uri)) {
        if (!test.item.range || filter?.(test) === false) {
            continue;
        }
        const irange = Range.lift(test.item.range);
        if (irange.containsPosition(position)) {
            if (bestRange && Range.equalsRange(test.item.range, bestRange)) {
                // check that a parent isn't already included (#180760)
                if (!bestNodes.some((b) => TestId.isChild(b.item.extId, test.item.extId))) {
                    bestNodes.push(test);
                }
            }
            else {
                bestRange = irange;
                bestNodes = [test];
            }
        }
        else if (Position.isBefore(irange.getStartPosition(), position)) {
            if (!bestRangeBefore ||
                bestRangeBefore.getStartPosition().isBefore(irange.getStartPosition())) {
                bestRangeBefore = irange;
                bestNodesBefore = [test];
            }
            else if (irange.equalsRange(bestRangeBefore) &&
                !bestNodesBefore.some((b) => TestId.isChild(b.item.extId, test.item.extId))) {
                bestNodesBefore.push(test);
            }
        }
    }
    return bestNodes.length ? bestNodes : bestNodesBefore;
}
var EditorContextOrder;
(function (EditorContextOrder) {
    EditorContextOrder[EditorContextOrder["RunAtCursor"] = 0] = "RunAtCursor";
    EditorContextOrder[EditorContextOrder["DebugAtCursor"] = 1] = "DebugAtCursor";
    EditorContextOrder[EditorContextOrder["RunInFile"] = 2] = "RunInFile";
    EditorContextOrder[EditorContextOrder["DebugInFile"] = 3] = "DebugInFile";
    EditorContextOrder[EditorContextOrder["GoToRelated"] = 4] = "GoToRelated";
    EditorContextOrder[EditorContextOrder["PeekRelated"] = 5] = "PeekRelated";
})(EditorContextOrder || (EditorContextOrder = {}));
class ExecuteTestAtCursor extends Action2 {
    constructor(options, group) {
        super({
            ...options,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: hasAnyTestProvider,
                },
                {
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: group === 2 /* TestRunProfileBitset.Run */
                        ? 0 /* EditorContextOrder.RunAtCursor */
                        : 1 /* EditorContextOrder.DebugAtCursor */,
                    when: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.capabilityToContextKey[group]),
                },
            ],
        });
        this.group = group;
    }
    /**
     * @override
     */
    async run(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        let editor = codeEditorService.getActiveCodeEditor();
        if (!activeEditorPane || !editor) {
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        const position = editor?.getPosition();
        const model = editor?.getModel();
        if (!position || !model || !('uri' in model)) {
            return;
        }
        const testService = accessor.get(ITestService);
        const profileService = accessor.get(ITestProfileService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        const progressService = accessor.get(IProgressService);
        const configurationService = accessor.get(IConfigurationService);
        const saveBeforeTest = getTestingConfiguration(configurationService, "testing.saveBeforeTest" /* TestingConfigKeys.SaveBeforeTest */);
        if (saveBeforeTest) {
            await editorService.save({
                editor: activeEditorPane.input,
                groupId: activeEditorPane.group.id,
            });
            await testService.syncTests();
        }
        // testsInFile will descend in the test tree. We assume that as we go
        // deeper, ranges get more specific. We'll want to run all tests whose
        // range is equal to the most specific range we find (see #133519)
        //
        // If we don't find any test whose range contains the position, we pick
        // the closest one before the position. Again, if we find several tests
        // whose range is equal to the closest one, we run them all.
        const testsToRun = await showDiscoveringWhile(progressService, getTestsAtCursor(testService, uriIdentityService, model.uri, position, (test) => !!(profileService.capabilitiesForTest(test.item) & this.group)));
        if (testsToRun.length) {
            await testService.runTests({ group: this.group, tests: testsToRun });
            return;
        }
        const relatedTests = await testService.getTestsRelatedToCode(model.uri, position);
        if (relatedTests.length) {
            await testService.runTests({ group: this.group, tests: relatedTests });
            return;
        }
        if (editor) {
            MessageController.get(editor)?.showMessage(localize('noTestsAtCursor', 'No tests found here'), position);
        }
    }
}
export class RunAtCursor extends ExecuteTestAtCursor {
    constructor() {
        super({
            id: "testing.runAtCursor" /* TestCommandId.RunAtCursor */,
            title: localize2('testing.runAtCursor', 'Run Test at Cursor'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 33 /* KeyCode.KeyC */),
            },
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
export class DebugAtCursor extends ExecuteTestAtCursor {
    constructor() {
        super({
            id: "testing.debugAtCursor" /* TestCommandId.DebugAtCursor */,
            title: localize2('testing.debugAtCursor', 'Debug Test at Cursor'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */),
            },
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
export class CoverageAtCursor extends ExecuteTestAtCursor {
    constructor() {
        super({
            id: "testing.coverageAtCursor" /* TestCommandId.CoverageAtCursor */,
            title: localize2('testing.coverageAtCursor', 'Run Test at Cursor with Coverage'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */),
            },
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
class ExecuteTestsUnderUriAction extends Action2 {
    constructor(options, group) {
        super({
            ...options,
            menu: [
                {
                    id: MenuId.ExplorerContext,
                    when: TestingContextKeys.capabilityToContextKey[group].isEqualTo(true),
                    group: '6.5_testing',
                    order: (group === 2 /* TestRunProfileBitset.Run */ ? 11 /* ActionOrder.Run */ : 12 /* ActionOrder.Debug */) + 0.1,
                },
            ],
        });
        this.group = group;
    }
    async run(accessor, uri) {
        const testService = accessor.get(ITestService);
        const notificationService = accessor.get(INotificationService);
        const tests = await Iterable.asyncToArray(testsUnderUri(testService, accessor.get(IUriIdentityService), uri));
        if (!tests.length) {
            notificationService.notify({
                message: localize('noTests', 'No tests found in the selected file or folder'),
                severity: Severity.Info,
            });
            return;
        }
        return testService.runTests({ tests, group: this.group });
    }
}
class RunTestsUnderUri extends ExecuteTestsUnderUriAction {
    constructor() {
        super({
            id: "testing.run.uri" /* TestCommandId.RunByUri */,
            title: LABEL_RUN_TESTS,
            category,
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
class DebugTestsUnderUri extends ExecuteTestsUnderUriAction {
    constructor() {
        super({
            id: "testing.debug.uri" /* TestCommandId.DebugByUri */,
            title: LABEL_DEBUG_TESTS,
            category,
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
class CoverageTestsUnderUri extends ExecuteTestsUnderUriAction {
    constructor() {
        super({
            id: "testing.coverage.uri" /* TestCommandId.CoverageByUri */,
            title: LABEL_COVERAGE_TESTS,
            category,
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
class ExecuteTestsInCurrentFile extends Action2 {
    constructor(options, group) {
        super({
            ...options,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.capabilityToContextKey[group].isEqualTo(true),
                },
                {
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: group === 2 /* TestRunProfileBitset.Run */
                        ? 2 /* EditorContextOrder.RunInFile */
                        : 3 /* EditorContextOrder.DebugInFile */,
                    when: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.capabilityToContextKey[group]),
                },
            ],
        });
        this.group = group;
    }
    /**
     * @override
     */
    run(accessor) {
        let editor = accessor.get(ICodeEditorService).getActiveCodeEditor();
        if (!editor) {
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        const position = editor?.getPosition();
        const model = editor?.getModel();
        if (!position || !model || !('uri' in model)) {
            return;
        }
        const testService = accessor.get(ITestService);
        const demandedUri = model.uri.toString();
        // Iterate through the entire collection and run any tests that are in the
        // uri. See #138007.
        const queue = [testService.collection.rootIds];
        const discovered = [];
        while (queue.length) {
            for (const id of queue.pop()) {
                const node = testService.collection.getNodeById(id);
                if (node.item.uri?.toString() === demandedUri) {
                    discovered.push(node);
                }
                else {
                    queue.push(node.children);
                }
            }
        }
        if (discovered.length) {
            return testService.runTests({
                tests: discovered,
                group: this.group,
            });
        }
        if (editor) {
            MessageController.get(editor)?.showMessage(localize('noTestsInFile', 'No tests found in this file'), position);
        }
        return undefined;
    }
}
export class RunCurrentFile extends ExecuteTestsInCurrentFile {
    constructor() {
        super({
            id: "testing.runCurrentFile" /* TestCommandId.RunCurrentFile */,
            title: localize2('testing.runCurrentFile', 'Run Tests in Current File'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 36 /* KeyCode.KeyF */),
            },
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
export class DebugCurrentFile extends ExecuteTestsInCurrentFile {
    constructor() {
        super({
            id: "testing.debugCurrentFile" /* TestCommandId.DebugCurrentFile */,
            title: localize2('testing.debugCurrentFile', 'Debug Tests in Current File'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */),
            },
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
export class CoverageCurrentFile extends ExecuteTestsInCurrentFile {
    constructor() {
        super({
            id: "testing.coverageCurrentFile" /* TestCommandId.CoverageCurrentFile */,
            title: localize2('testing.coverageCurrentFile', 'Run Tests with Coverage in Current File'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 36 /* KeyCode.KeyF */),
            },
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
export const discoverAndRunTests = async (collection, progress, ids, runTests) => {
    const todo = Promise.all(ids.map((p) => expandAndGetTestById(collection, p)));
    const tests = (await showDiscoveringWhile(progress, todo)).filter(isDefined);
    return tests.length ? await runTests(tests) : undefined;
};
class RunOrDebugExtsByPath extends Action2 {
    /**
     * @override
     */
    async run(accessor, ...args) {
        const testService = accessor.get(ITestService);
        await discoverAndRunTests(accessor.get(ITestService).collection, accessor.get(IProgressService), [...this.getTestExtIdsToRun(accessor, ...args)], (tests) => this.runTest(testService, tests));
    }
}
class RunOrDebugFailedTests extends RunOrDebugExtsByPath {
    constructor(options) {
        super({
            ...options,
            menu: {
                id: MenuId.CommandPalette,
                when: hasAnyTestProvider,
            },
        });
    }
    /**
     * @inheritdoc
     */
    getTestExtIdsToRun(accessor) {
        const { results } = accessor.get(ITestResultService);
        const ids = new Set();
        for (let i = results.length - 1; i >= 0; i--) {
            const resultSet = results[i];
            for (const test of resultSet.tests) {
                if (isFailedState(test.ownComputedState)) {
                    ids.add(test.item.extId);
                }
                else {
                    ids.delete(test.item.extId);
                }
            }
        }
        return ids;
    }
}
class RunOrDebugLastRun extends Action2 {
    constructor(options) {
        super({
            ...options,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(hasAnyTestProvider, TestingContextKeys.hasAnyResults.isEqualTo(true)),
            },
        });
    }
    getLastTestRunRequest(accessor, runId) {
        const resultService = accessor.get(ITestResultService);
        const lastResult = runId
            ? resultService.results.find((r) => r.id === runId)
            : resultService.results[0];
        return lastResult?.request;
    }
    /** @inheritdoc */
    async run(accessor, runId) {
        const resultService = accessor.get(ITestResultService);
        const lastResult = runId
            ? resultService.results.find((r) => r.id === runId)
            : resultService.results[0];
        if (!lastResult) {
            return;
        }
        const req = lastResult.request;
        const testService = accessor.get(ITestService);
        const profileService = accessor.get(ITestProfileService);
        const profileExists = (t) => profileService.getControllerProfiles(t.controllerId).some((p) => p.profileId === t.profileId);
        await discoverAndRunTests(testService.collection, accessor.get(IProgressService), req.targets.flatMap((t) => t.testIds), (tests) => {
            // If we're requesting a re-run in the same group and have the same profiles
            // as were used before, then use those exactly. Otherwise guess naively.
            if (this.getGroup() & req.group && req.targets.every(profileExists)) {
                return testService.runResolvedTests({
                    targets: req.targets,
                    group: req.group,
                    exclude: req.exclude,
                });
            }
            else {
                return testService.runTests({ tests, group: this.getGroup() });
            }
        });
    }
}
export class ReRunFailedTests extends RunOrDebugFailedTests {
    constructor() {
        super({
            id: "testing.reRunFailTests" /* TestCommandId.ReRunFailedTests */,
            title: localize2('testing.reRunFailTests', 'Rerun Failed Tests'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 35 /* KeyCode.KeyE */),
            },
        });
    }
    runTest(service, internalTests) {
        return service.runTests({
            group: 2 /* TestRunProfileBitset.Run */,
            tests: internalTests,
        });
    }
}
export class DebugFailedTests extends RunOrDebugFailedTests {
    constructor() {
        super({
            id: "testing.debugFailTests" /* TestCommandId.DebugFailedTests */,
            title: localize2('testing.debugFailTests', 'Debug Failed Tests'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 35 /* KeyCode.KeyE */),
            },
        });
    }
    runTest(service, internalTests) {
        return service.runTests({
            group: 4 /* TestRunProfileBitset.Debug */,
            tests: internalTests,
        });
    }
}
export class ReRunLastRun extends RunOrDebugLastRun {
    constructor() {
        super({
            id: "testing.reRunLastRun" /* TestCommandId.ReRunLastRun */,
            title: localize2('testing.reRunLastRun', 'Rerun Last Run'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 42 /* KeyCode.KeyL */),
            },
        });
    }
    getGroup() {
        return 2 /* TestRunProfileBitset.Run */;
    }
}
export class DebugLastRun extends RunOrDebugLastRun {
    constructor() {
        super({
            id: "testing.debugLastRun" /* TestCommandId.DebugLastRun */,
            title: localize2('testing.debugLastRun', 'Debug Last Run'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */),
            },
        });
    }
    getGroup() {
        return 4 /* TestRunProfileBitset.Debug */;
    }
}
export class CoverageLastRun extends RunOrDebugLastRun {
    constructor() {
        super({
            id: "testing.coverageLastRun" /* TestCommandId.CoverageLastRun */,
            title: localize2('testing.coverageLastRun', 'Rerun Last Run with Coverage'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */),
            },
        });
    }
    getGroup() {
        return 8 /* TestRunProfileBitset.Coverage */;
    }
}
export class SearchForTestExtension extends Action2 {
    constructor() {
        super({
            id: "testing.searchForTestExtension" /* TestCommandId.SearchForTestExtension */,
            title: localize2('testing.searchForTestExtension', 'Search for Test Extension'),
        });
    }
    async run(accessor) {
        accessor.get(IExtensionsWorkbenchService).openSearch('@category:"testing"');
    }
}
export class OpenOutputPeek extends Action2 {
    constructor() {
        super({
            id: "testing.openOutputPeek" /* TestCommandId.OpenOutputPeek */,
            title: localize2('testing.openOutputPeek', 'Peek Output'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 43 /* KeyCode.KeyM */),
            },
            menu: {
                id: MenuId.CommandPalette,
                when: TestingContextKeys.hasAnyResults.isEqualTo(true),
            },
        });
    }
    async run(accessor) {
        accessor.get(ITestingPeekOpener).open();
    }
}
export class ToggleInlineTestOutput extends Action2 {
    constructor() {
        super({
            id: "testing.toggleInlineTestOutput" /* TestCommandId.ToggleInlineTestOutput */,
            title: localize2('testing.toggleInlineTestOutput', 'Toggle Inline Test Output'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
            },
            menu: {
                id: MenuId.CommandPalette,
                when: TestingContextKeys.hasAnyResults.isEqualTo(true),
            },
        });
    }
    async run(accessor) {
        const testService = accessor.get(ITestService);
        testService.showInlineOutput.value = !testService.showInlineOutput.value;
    }
}
const refreshMenus = (whenIsRefreshing) => [
    {
        id: MenuId.TestItem,
        group: 'inline',
        order: 10 /* ActionOrder.Refresh */,
        when: ContextKeyExpr.and(TestingContextKeys.canRefreshTests.isEqualTo(true), TestingContextKeys.isRefreshingTests.isEqualTo(whenIsRefreshing)),
    },
    {
        id: MenuId.ViewTitle,
        group: 'navigation',
        order: 10 /* ActionOrder.Refresh */,
        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), TestingContextKeys.canRefreshTests.isEqualTo(true), TestingContextKeys.isRefreshingTests.isEqualTo(whenIsRefreshing)),
    },
    {
        id: MenuId.CommandPalette,
        when: TestingContextKeys.canRefreshTests.isEqualTo(true),
    },
];
export class RefreshTestsAction extends Action2 {
    constructor() {
        super({
            id: "testing.refreshTests" /* TestCommandId.RefreshTestsAction */,
            title: localize2('testing.refreshTests', 'Refresh Tests'),
            category,
            icon: icons.testingRefreshTests,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */),
                when: TestingContextKeys.canRefreshTests.isEqualTo(true),
            },
            menu: refreshMenus(false),
        });
    }
    async run(accessor, ...elements) {
        const testService = accessor.get(ITestService);
        const progressService = accessor.get(IProgressService);
        const controllerIds = distinct(elements.filter(isDefined).map((e) => e.test.controllerId));
        return progressService.withProgress({ location: "workbench.view.extension.test" /* Testing.ViewletId */ }, async () => {
            if (controllerIds.length) {
                await Promise.all(controllerIds.map((id) => testService.refreshTests(id)));
            }
            else {
                await testService.refreshTests();
            }
        });
    }
}
export class CancelTestRefreshAction extends Action2 {
    constructor() {
        super({
            id: "testing.cancelTestRefresh" /* TestCommandId.CancelTestRefreshAction */,
            title: localize2('testing.cancelTestRefresh', 'Cancel Test Refresh'),
            category,
            icon: icons.testingCancelRefreshTests,
            menu: refreshMenus(true),
        });
    }
    async run(accessor) {
        accessor.get(ITestService).cancelRefreshTests();
    }
}
export class CleareCoverage extends Action2 {
    constructor() {
        super({
            id: "testing.coverage.close" /* TestCommandId.CoverageClear */,
            title: localize2('testing.clearCoverage', 'Clear Coverage'),
            icon: widgetClose,
            category,
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 10 /* ActionOrder.Refresh */,
                    when: ContextKeyExpr.equals('view', "workbench.view.testCoverage" /* Testing.CoverageViewId */),
                },
                {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.isTestCoverageOpen.isEqualTo(true),
                },
            ],
        });
    }
    run(accessor) {
        accessor.get(ITestCoverageService).closeCoverage();
    }
}
export class OpenCoverage extends Action2 {
    constructor() {
        super({
            id: "testing.openCoverage" /* TestCommandId.OpenCoverage */,
            title: localize2('testing.openCoverage', 'Open Coverage'),
            category,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.hasAnyResults.isEqualTo(true),
                },
            ],
        });
    }
    run(accessor) {
        const results = accessor.get(ITestResultService).results;
        const task = results.length && results[0].tasks.find((r) => r.coverage);
        if (!task) {
            const notificationService = accessor.get(INotificationService);
            notificationService.info(localize('testing.noCoverage', 'No coverage information available on the last test run.'));
            return;
        }
        accessor.get(ITestCoverageService).openCoverage(task, true);
    }
}
class TestNavigationAction extends SymbolNavigationAction {
    runEditorCommand(accessor, editor, ...args) {
        this.testService = accessor.get(ITestService);
        this.uriIdentityService = accessor.get(IUriIdentityService);
        return super.runEditorCommand(accessor, editor, ...args);
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeTestsCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleTests || 'peek';
    }
}
class GoToRelatedTestAction extends TestNavigationAction {
    async _getLocationModel(_languageFeaturesService, model, position, token) {
        const tests = await this.testService.getTestsRelatedToCode(model.uri, position, token);
        return new ReferencesModel(tests
            .map((t) => t.item.uri && { uri: t.item.uri, range: t.item.range || new Range(1, 1, 1, 1) })
            .filter(isDefined), localize('relatedTests', 'Related Tests'));
    }
    _getNoResultFoundMessage() {
        return localize('noTestFound', 'No related tests found.');
    }
}
class GoToRelatedTest extends GoToRelatedTestAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false,
        }, {
            id: "testing.goToRelatedTest" /* TestCommandId.GoToRelatedTest */,
            title: localize2('testing.goToRelatedTest', 'Go to Related Test'),
            category,
            precondition: ContextKeyExpr.and(
            // todo@connor4312: make this more explicit based on cursor position
            ContextKeyExpr.not(TestingContextKeys.activeEditorHasTests.key), TestingContextKeys.canGoToRelatedTest),
            menu: [
                {
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 4 /* EditorContextOrder.GoToRelated */,
                },
            ],
        });
    }
}
class PeekRelatedTest extends GoToRelatedTestAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false,
        }, {
            id: "testing.peekRelatedTest" /* TestCommandId.PeekRelatedTest */,
            title: localize2('testing.peekToRelatedTest', 'Peek Related Test'),
            category,
            precondition: ContextKeyExpr.and(TestingContextKeys.canGoToRelatedTest, 
            // todo@connor4312: make this more explicit based on cursor position
            ContextKeyExpr.not(TestingContextKeys.activeEditorHasTests.key), PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: [
                {
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 5 /* EditorContextOrder.PeekRelated */,
                },
            ],
        });
    }
}
class GoToRelatedCodeAction extends TestNavigationAction {
    async _getLocationModel(_languageFeaturesService, model, position, token) {
        const testsAtCursor = await getTestsAtCursor(this.testService, this.uriIdentityService, model.uri, position);
        const code = await Promise.all(testsAtCursor.map((t) => this.testService.getCodeRelatedToTest(t)));
        return new ReferencesModel(code.flat(), localize('relatedCode', 'Related Code'));
    }
    _getNoResultFoundMessage() {
        return localize('noRelatedCode', 'No related code found.');
    }
}
class GoToRelatedCode extends GoToRelatedCodeAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false,
        }, {
            id: "testing.goToRelatedCode" /* TestCommandId.GoToRelatedCode */,
            title: localize2('testing.goToRelatedCode', 'Go to Related Code'),
            category,
            precondition: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.canGoToRelatedCode),
            menu: [
                {
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 4 /* EditorContextOrder.GoToRelated */,
                },
            ],
        });
    }
}
class PeekRelatedCode extends GoToRelatedCodeAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false,
        }, {
            id: "testing.peekRelatedCode" /* TestCommandId.PeekRelatedCode */,
            title: localize2('testing.peekToRelatedCode', 'Peek Related Code'),
            category,
            precondition: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.canGoToRelatedCode, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: [
                {
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 5 /* EditorContextOrder.PeekRelated */,
                },
            ],
        });
    }
}
export const allTestActions = [
    CancelTestRefreshAction,
    CancelTestRunAction,
    CleareCoverage,
    ClearTestResultsAction,
    CollapseAllAction,
    ConfigureTestProfilesAction,
    ContinuousRunTestAction,
    ContinuousRunUsingProfileTestAction,
    CoverageAction,
    CoverageAllAction,
    CoverageAtCursor,
    CoverageCurrentFile,
    CoverageLastRun,
    CoverageSelectedAction,
    CoverageTestsUnderUri,
    DebugAction,
    DebugAllAction,
    DebugAtCursor,
    DebugCurrentFile,
    DebugFailedTests,
    DebugLastRun,
    DebugSelectedAction,
    DebugTestsUnderUri,
    GetExplorerSelection,
    GetSelectedProfiles,
    GoToRelatedCode,
    GoToRelatedTest,
    GoToTest,
    HideTestAction,
    OpenCoverage,
    OpenOutputPeek,
    PeekRelatedCode,
    PeekRelatedTest,
    RefreshTestsAction,
    ReRunFailedTests,
    ReRunLastRun,
    RunAction,
    RunAllAction,
    RunAtCursor,
    RunCurrentFile,
    RunSelectedAction,
    RunTestsUnderUri,
    RunUsingProfileAction,
    SearchForTestExtension,
    SelectDefaultTestProfiles,
    ShowMostRecentOutputAction,
    StartContinuousRunAction,
    StopContinuousRunAction,
    TestingSortByDurationAction,
    TestingSortByLocationAction,
    TestingSortByStatusAction,
    TestingViewAsListAction,
    TestingViewAsTreeAction,
    ToggleInlineTestOutput,
    UnhideAllTestsAction,
    UnhideTestAction,
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEV4cGxvcmVyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RFeHBsb3JlckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRzVELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBRW5ILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFbEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsUUFBUSxF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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEV4cGxvcmVyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0RXhwbG9yZXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUc1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUVuSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxT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
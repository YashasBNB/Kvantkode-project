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
var TestRunElementRenderer_1;
import * as dom from '../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Action, Separator } from '../../../../../base/common/actions.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { count } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isDefined } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { MenuEntryActionViewItem, fillInActionBarActions, } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction, } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchCompressibleObjectTree } from '../../../../../platform/list/browser/listService.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { widgetClose } from '../../../../../platform/theme/common/iconRegistry.js';
import { getTestItemContextOverlay } from '../explorerProjections/testItemContextOverlay.js';
import * as icons from '../icons.js';
import { renderTestMessageAsText } from '../testMessageColorizer.js';
import { MessageSubject, TaskSubject, TestOutputSubject, getMessageArgs, mapFindTestMessage, } from './testResultsSubject.js';
import { ITestCoverageService } from '../../common/testCoverageService.js';
import { ITestExplorerFilterState } from '../../common/testExplorerFilterState.js';
import { ITestProfileService } from '../../common/testProfileService.js';
import { LiveTestResult, maxCountPriority, } from '../../common/testResult.js';
import { ITestResultService } from '../../common/testResultService.js';
import { InternalTestItem, testResultStateToContextValues, } from '../../common/testTypes.js';
import { TestingContextKeys } from '../../common/testingContextKeys.js';
import { cmpPriority } from '../../common/testingStates.js';
import { buildTestUri } from '../../common/testingUri.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
class TestResultElement {
    get icon() {
        return icons.testingStatesToIcons.get(this.value.completedAt === undefined
            ? 2 /* TestResultState.Running */
            : maxCountPriority(this.value.counts));
    }
    constructor(value) {
        this.value = value;
        this.changeEmitter = new Emitter();
        this.onDidChange = this.changeEmitter.event;
        this.type = 'result';
        this.context = this.value.id;
        this.id = this.value.id;
        this.label = this.value.name;
    }
}
const openCoverageLabel = localize('openTestCoverage', 'View Test Coverage');
const closeCoverageLabel = localize('closeTestCoverage', 'Close Test Coverage');
class CoverageElement {
    get label() {
        return this.isOpen ? closeCoverageLabel : openCoverageLabel;
    }
    get icon() {
        return this.isOpen ? widgetClose : icons.testingCoverageReport;
    }
    get isOpen() {
        return this.coverageService.selected.get()?.fromTaskId === this.task.id;
    }
    constructor(results, task, coverageService) {
        this.results = results;
        this.task = task;
        this.coverageService = coverageService;
        this.type = 'coverage';
        this.id = `coverage-${this.results.id}/${this.task.id}`;
        this.onDidChange = Event.fromObservableLight(coverageService.selected);
    }
}
class OlderResultsElement {
    constructor(n) {
        this.n = n;
        this.type = 'older';
        this.id = `older-${this.n}`;
        this.onDidChange = Event.None;
        this.label = localize('nOlderResults', '{0} older results', n);
    }
}
class TestCaseElement {
    get onDidChange() {
        if (!(this.results instanceof LiveTestResult)) {
            return Event.None;
        }
        return Event.filter(this.results.onChange, (e) => e.item.item.extId === this.test.item.extId);
    }
    get state() {
        return this.test.tasks[this.taskIndex].state;
    }
    get label() {
        return this.test.item.label;
    }
    get labelWithIcons() {
        return renderLabelWithIcons(this.label);
    }
    get icon() {
        return icons.testingStatesToIcons.get(this.state);
    }
    get outputSubject() {
        return new TestOutputSubject(this.results, this.taskIndex, this.test);
    }
    constructor(results, test, taskIndex) {
        this.results = results;
        this.test = test;
        this.taskIndex = taskIndex;
        this.type = 'test';
        this.context = {
            $mid: 16 /* MarshalledId.TestItemContext */,
            tests: [InternalTestItem.serialize(this.test)],
        };
        this.id = `${this.results.id}/${this.test.item.extId}`;
    }
}
class TaskElement {
    get icon() {
        return this.results.tasks[this.index].running
            ? icons.testingStatesToIcons.get(2 /* TestResultState.Running */)
            : undefined;
    }
    constructor(results, task, index) {
        this.results = results;
        this.task = task;
        this.index = index;
        this.changeEmitter = new Emitter();
        this.onDidChange = this.changeEmitter.event;
        this.type = 'task';
        this.itemsCache = new CreationCache();
        this.id = `${results.id}/${index}`;
        this.task = results.tasks[index];
        this.context = { resultId: results.id, taskId: this.task.id };
        this.label = this.task.name;
    }
}
class TestMessageElement {
    get onDidChange() {
        if (!(this.result instanceof LiveTestResult)) {
            return Event.None;
        }
        // rerender when the test case changes so it gets retired events
        return Event.filter(this.result.onChange, (e) => e.item.item.extId === this.test.item.extId);
    }
    get context() {
        return getMessageArgs(this.test, this.message);
    }
    get outputSubject() {
        return new TestOutputSubject(this.result, this.taskIndex, this.test);
    }
    constructor(result, test, taskIndex, messageIndex) {
        this.result = result;
        this.test = test;
        this.taskIndex = taskIndex;
        this.messageIndex = messageIndex;
        this.type = 'message';
        const m = (this.message = test.tasks[taskIndex].messages[messageIndex]);
        this.location = m.location;
        this.contextValue = m.type === 0 /* TestMessageType.Error */ ? m.contextValue : undefined;
        this.uri = buildTestUri({
            type: 2 /* TestUriType.ResultMessage */,
            messageIndex,
            resultId: result.id,
            taskIndex,
            testExtId: test.item.extId,
        });
        this.id = this.uri.toString();
        const asPlaintext = renderTestMessageAsText(m.message);
        const lines = count(asPlaintext.trimEnd(), '\n');
        this.label = firstLine(asPlaintext);
        if (lines > 0) {
            this.description =
                lines > 1
                    ? localize('messageMoreLinesN', '+ {0} more lines', lines)
                    : localize('messageMoreLines1', '+ 1 more line');
        }
    }
}
let OutputPeekTree = class OutputPeekTree extends Disposable {
    constructor(container, onDidReveal, options, contextMenuService, results, instantiationService, explorerFilter, coverageService, progressService, telemetryService) {
        super();
        this.contextMenuService = contextMenuService;
        this.disposed = false;
        this.requestReveal = this._register(new Emitter());
        this.onDidRequestReview = this.requestReveal.event;
        this.treeActions = instantiationService.createInstance(TreeActionsProvider, options.showRevealLocationOnMessages, this.requestReveal);
        const diffIdentityProvider = {
            getId(e) {
                return e.id;
            },
        };
        this.tree = this._register(instantiationService.createInstance(WorkbenchCompressibleObjectTree, 'Test Output Peek', container, {
            getHeight: () => 22,
            getTemplateId: () => TestRunElementRenderer.ID,
        }, [instantiationService.createInstance(TestRunElementRenderer, this.treeActions)], {
            compressionEnabled: true,
            hideTwistiesOfChildlessElements: true,
            identityProvider: diffIdentityProvider,
            alwaysConsumeMouseWheel: false,
            sorter: {
                compare(a, b) {
                    if (a instanceof TestCaseElement && b instanceof TestCaseElement) {
                        return cmpPriority(a.state, b.state);
                    }
                    return 0;
                },
            },
            accessibilityProvider: {
                getAriaLabel(element) {
                    return element.ariaLabel || element.label;
                },
                getWidgetAriaLabel() {
                    return localize('testingPeekLabel', 'Test Result Messages');
                },
            },
        }));
        const cc = new CreationCache();
        const getTaskChildren = (taskElem) => {
            const { results, index, itemsCache, task } = taskElem;
            const tests = Iterable.filter(results.tests, (test) => test.tasks[index].state >= 2 /* TestResultState.Running */ ||
                test.tasks[index].messages.length > 0);
            let result = Iterable.map(tests, (test) => ({
                element: itemsCache.getOrCreate(test, () => new TestCaseElement(results, test, index)),
                incompressible: true,
                children: getTestChildren(results, test, index),
            }));
            if (task.coverage.get()) {
                result = Iterable.concat(Iterable.single({
                    element: new CoverageElement(results, task, coverageService),
                    collapsible: true,
                    incompressible: true,
                }), result);
            }
            return result;
        };
        const getTestChildren = (result, test, taskIndex) => {
            return test.tasks[taskIndex].messages
                .map((m, messageIndex) => m.type === 0 /* TestMessageType.Error */
                ? {
                    element: cc.getOrCreate(m, () => new TestMessageElement(result, test, taskIndex, messageIndex)),
                    incompressible: false,
                }
                : undefined)
                .filter(isDefined);
        };
        const getResultChildren = (result) => {
            return result.tasks.map((task, taskIndex) => {
                const taskElem = cc.getOrCreate(task, () => new TaskElement(result, task, taskIndex));
                return {
                    element: taskElem,
                    incompressible: false,
                    collapsible: true,
                    children: getTaskChildren(taskElem),
                };
            });
        };
        const getRootChildren = () => {
            let children = [];
            const older = [];
            for (const result of results.results) {
                if (!children.length && result.tasks.length) {
                    children = getResultChildren(result);
                }
                else if (children) {
                    const element = cc.getOrCreate(result, () => new TestResultElement(result));
                    older.push({
                        element,
                        incompressible: true,
                        collapsible: true,
                        collapsed: this.tree.hasElement(element) ? this.tree.isCollapsed(element) : true,
                        children: getResultChildren(result),
                    });
                }
            }
            if (!children.length) {
                return older;
            }
            if (older.length) {
                children.push({
                    element: new OlderResultsElement(older.length),
                    incompressible: true,
                    collapsible: true,
                    collapsed: true,
                    children: older,
                });
            }
            return children;
        };
        // Queued result updates to prevent spamming CPU when lots of tests are
        // completing and messaging quickly (#142514)
        const taskChildrenToUpdate = new Set();
        const taskChildrenUpdate = this._register(new RunOnceScheduler(() => {
            for (const taskNode of taskChildrenToUpdate) {
                if (this.tree.hasElement(taskNode)) {
                    this.tree.setChildren(taskNode, getTaskChildren(taskNode), { diffIdentityProvider });
                }
            }
            taskChildrenToUpdate.clear();
        }, 300));
        const queueTaskChildrenUpdate = (taskNode) => {
            taskChildrenToUpdate.add(taskNode);
            if (!taskChildrenUpdate.isScheduled()) {
                taskChildrenUpdate.schedule();
            }
        };
        const attachToResults = (result) => {
            const disposable = new DisposableStore();
            disposable.add(result.onNewTask((i) => {
                this.tree.setChildren(null, getRootChildren(), { diffIdentityProvider });
                if (result.tasks.length === 1) {
                    this.requestReveal.fire(new TaskSubject(result, 0)); // reveal the first task in new runs
                }
                // note: tasks are bounded and their lifetime is equivalent to that of
                // the test result, so this doesn't leak indefinitely.
                const task = result.tasks[i];
                disposable.add(autorun((reader) => {
                    task.coverage.read(reader); // add it to the autorun
                    queueTaskChildrenUpdate(cc.get(task));
                }));
            }));
            disposable.add(result.onEndTask((index) => {
                ;
                cc.get(result.tasks[index])?.changeEmitter.fire();
            }));
            disposable.add(result.onChange((e) => {
                // try updating the item in each of its tasks
                for (const [index, task] of result.tasks.entries()) {
                    const taskNode = cc.get(task);
                    if (!this.tree.hasElement(taskNode)) {
                        continue;
                    }
                    const itemNode = taskNode.itemsCache.get(e.item);
                    if (itemNode && this.tree.hasElement(itemNode)) {
                        if (e.reason === 2 /* TestResultItemChangeReason.NewMessage */ &&
                            e.message.type === 0 /* TestMessageType.Error */) {
                            this.tree.setChildren(itemNode, getTestChildren(result, e.item, index), {
                                diffIdentityProvider,
                            });
                        }
                        return;
                    }
                    queueTaskChildrenUpdate(taskNode);
                }
            }));
            disposable.add(result.onComplete(() => {
                ;
                cc.get(result)?.changeEmitter.fire();
                disposable.dispose();
            }));
        };
        this._register(results.onResultsChanged((e) => {
            // little hack here: a result change can cause the peek to be disposed,
            // but this listener will still be queued. Doing stuff with the tree
            // will cause errors.
            if (this.disposed) {
                return;
            }
            if ('completed' in e) {
                ;
                cc.get(e.completed)?.changeEmitter.fire();
            }
            else if ('started' in e) {
                attachToResults(e.started);
            }
            else {
                this.tree.setChildren(null, getRootChildren(), { diffIdentityProvider });
            }
        }));
        const revealItem = (element, preserveFocus) => {
            this.tree.setFocus([element]);
            this.tree.setSelection([element]);
            if (!preserveFocus) {
                this.tree.domFocus();
            }
        };
        this._register(onDidReveal(async ({ subject, preserveFocus = false }) => {
            if (subject instanceof TaskSubject) {
                const resultItem = this.tree.getNode(null).children.find((c) => {
                    if (c.element instanceof TaskElement) {
                        return (c.element.results.id === subject.result.id && c.element.index === subject.taskIndex);
                    }
                    if (c.element instanceof TestResultElement) {
                        return c.element.id === subject.result.id;
                    }
                    return false;
                });
                if (resultItem) {
                    revealItem(resultItem.element, preserveFocus);
                }
                return;
            }
            const revealElement = subject instanceof TestOutputSubject
                ? cc.get(subject.task)?.itemsCache.get(subject.test)
                : cc.get(subject.message);
            if (!revealElement || !this.tree.hasElement(revealElement)) {
                return;
            }
            const parents = [];
            for (let parent = this.tree.getParentElement(revealElement); parent; parent = this.tree.getParentElement(parent)) {
                parents.unshift(parent);
            }
            for (const parent of parents) {
                this.tree.expand(parent);
            }
            if (this.tree.getRelativeTop(revealElement) === null) {
                this.tree.reveal(revealElement, 0.5);
            }
            revealItem(revealElement, preserveFocus);
        }));
        this._register(this.tree.onDidOpen(async (e) => {
            if (e.element instanceof TestMessageElement) {
                this.requestReveal.fire(new MessageSubject(e.element.result, e.element.test, e.element.taskIndex, e.element.messageIndex));
            }
            else if (e.element instanceof TestCaseElement) {
                const t = e.element;
                const message = mapFindTestMessage(e.element.test, (_t, _m, mesasgeIndex, taskIndex) => new MessageSubject(t.results, t.test, taskIndex, mesasgeIndex));
                this.requestReveal.fire(message || new TestOutputSubject(t.results, 0, t.test));
            }
            else if (e.element instanceof CoverageElement) {
                const task = e.element.task;
                if (e.element.isOpen) {
                    return coverageService.closeCoverage();
                }
                progressService.withProgress({ location: options.locationForProgress }, () => coverageService.openCoverage(task, true));
            }
        }));
        this._register(this.tree.onDidChangeSelection((evt) => {
            for (const element of evt.elements) {
                if (element && 'test' in element) {
                    explorerFilter.reveal.set(element.test.item.extId, undefined);
                    break;
                }
            }
        }));
        this._register(explorerFilter.onDidSelectTestInExplorer((testId) => {
            if (this.tree.getSelection().some((e) => e && 'test' in e && e.test.item.extId === testId)) {
                return;
            }
            for (const node of this.tree.getNode(null).children) {
                if (node.element instanceof TaskElement) {
                    for (const testNode of node.children) {
                        if (testNode.element instanceof TestCaseElement &&
                            testNode.element.test.item.extId === testId) {
                            this.tree.setSelection([testNode.element]);
                            if (this.tree.getRelativeTop(testNode.element) === null) {
                                this.tree.reveal(testNode.element, 0.5);
                            }
                            break;
                        }
                    }
                }
            }
        }));
        this._register(this.tree.onContextMenu((e) => this.onContextMenu(e)));
        this._register(this.tree.onDidChangeCollapseState((e) => {
            if (e.node.element instanceof OlderResultsElement && !e.node.collapsed) {
                telemetryService.publicLog2('testing.expandOlderResults');
            }
        }));
        this.tree.setChildren(null, getRootChildren());
        for (const result of results.results) {
            if (!result.completedAt && result instanceof LiveTestResult) {
                attachToResults(result);
            }
        }
    }
    layout(height, width) {
        this.tree.layout(height, width);
    }
    onContextMenu(evt) {
        if (!evt.element) {
            return;
        }
        const actions = this.treeActions.provideActionBar(evt.element);
        this.contextMenuService.showContextMenu({
            getAnchor: () => evt.anchor,
            getActions: () => actions.secondary.length
                ? [...actions.primary, new Separator(), ...actions.secondary]
                : actions.primary,
            getActionsContext: () => evt.element?.context,
        });
    }
    dispose() {
        super.dispose();
        this.disposed = true;
    }
};
OutputPeekTree = __decorate([
    __param(3, IContextMenuService),
    __param(4, ITestResultService),
    __param(5, IInstantiationService),
    __param(6, ITestExplorerFilterState),
    __param(7, ITestCoverageService),
    __param(8, IProgressService),
    __param(9, ITelemetryService)
], OutputPeekTree);
export { OutputPeekTree };
let TestRunElementRenderer = class TestRunElementRenderer {
    static { TestRunElementRenderer_1 = this; }
    static { this.ID = 'testRunElementRenderer'; }
    constructor(treeActions, instantiationService) {
        this.treeActions = treeActions;
        this.instantiationService = instantiationService;
        this.templateId = TestRunElementRenderer_1.ID;
    }
    /** @inheritdoc */
    renderCompressedElements(node, _index, templateData) {
        const chain = node.element.elements;
        const lastElement = chain[chain.length - 1];
        if ((lastElement instanceof TaskElement || lastElement instanceof TestMessageElement) &&
            chain.length >= 2) {
            this.doRender(chain[chain.length - 2], templateData, lastElement);
        }
        else {
            this.doRender(lastElement, templateData);
        }
    }
    /** @inheritdoc */
    renderTemplate(container) {
        const templateDisposable = new DisposableStore();
        container.classList.add('testing-stdtree-container');
        const icon = dom.append(container, dom.$('.state'));
        const label = dom.append(container, dom.$('.label'));
        const actionBar = new ActionBar(container, {
            actionViewItemProvider: (action, options) => action instanceof MenuItemAction
                ? this.instantiationService.createInstance(MenuEntryActionViewItem, action, {
                    hoverDelegate: options.hoverDelegate,
                })
                : undefined,
        });
        const elementDisposable = new DisposableStore();
        templateDisposable.add(elementDisposable);
        templateDisposable.add(actionBar);
        return {
            icon,
            label,
            actionBar,
            elementDisposable,
            templateDisposable,
        };
    }
    /** @inheritdoc */
    renderElement(element, _index, templateData) {
        this.doRender(element.element, templateData);
    }
    /** @inheritdoc */
    disposeTemplate(templateData) {
        templateData.templateDisposable.dispose();
    }
    /** Called to render a new element */
    doRender(element, templateData, subjectElement) {
        templateData.elementDisposable.clear();
        templateData.elementDisposable.add(element.onDidChange(() => this.doRender(element, templateData, subjectElement)));
        this.doRenderInner(element, templateData, subjectElement);
    }
    /** Called, and may be re-called, to render or re-render an element */
    doRenderInner(element, templateData, subjectElement) {
        let { label, labelWithIcons, description } = element;
        if (subjectElement instanceof TestMessageElement) {
            description = subjectElement.label;
        }
        const descriptionElement = description
            ? dom.$('span.test-label-description', {}, description)
            : '';
        if (labelWithIcons) {
            dom.reset(templateData.label, ...labelWithIcons, descriptionElement);
        }
        else {
            dom.reset(templateData.label, label, descriptionElement);
        }
        const icon = element.icon;
        templateData.icon.className = `computed-state ${icon ? ThemeIcon.asClassName(icon) : ''}`;
        const actions = this.treeActions.provideActionBar(element);
        templateData.actionBar.clear();
        templateData.actionBar.context = element.context;
        templateData.actionBar.push(actions.primary, { icon: true, label: false });
    }
};
TestRunElementRenderer = TestRunElementRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], TestRunElementRenderer);
let TreeActionsProvider = class TreeActionsProvider {
    constructor(showRevealLocationOnMessages, requestReveal, contextKeyService, menuService, commandService, testProfileService, editorService) {
        this.showRevealLocationOnMessages = showRevealLocationOnMessages;
        this.requestReveal = requestReveal;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.commandService = commandService;
        this.testProfileService = testProfileService;
        this.editorService = editorService;
    }
    provideActionBar(element) {
        const test = element instanceof TestCaseElement ? element.test : undefined;
        const capabilities = test ? this.testProfileService.capabilitiesForTest(test.item) : 0;
        const contextKeys = [
            ['peek', "editor.contrib.testingOutputPeek" /* Testing.OutputPeekContributionId */],
            [TestingContextKeys.peekItemType.key, element.type],
        ];
        let id = MenuId.TestPeekElement;
        const primary = [];
        const secondary = [];
        if (element instanceof TaskElement) {
            primary.push(new Action('testing.outputPeek.showResultOutput', localize('testing.showResultOutput', 'Show Result Output'), ThemeIcon.asClassName(Codicon.terminal), undefined, () => this.requestReveal.fire(new TaskSubject(element.results, element.index))));
            if (element.task.running) {
                primary.push(new Action('testing.outputPeek.cancel', localize('testing.cancelRun', 'Cancel Test Run'), ThemeIcon.asClassName(icons.testingCancelIcon), undefined, () => this.commandService.executeCommand("testing.cancelRun" /* TestCommandId.CancelTestRunAction */, element.results.id, element.task.id)));
            }
            else {
                primary.push(new Action('testing.outputPeek.rerun', localize('testing.reRunLastRun', 'Rerun Last Run'), ThemeIcon.asClassName(icons.testingRerunIcon), undefined, () => this.commandService.executeCommand("testing.reRunLastRun" /* TestCommandId.ReRunLastRun */, element.results.id)));
                primary.push(new Action('testing.outputPeek.debug', localize('testing.debugLastRun', 'Debug Last Run'), ThemeIcon.asClassName(icons.testingDebugIcon), undefined, () => this.commandService.executeCommand("testing.debugLastRun" /* TestCommandId.DebugLastRun */, element.results.id)));
            }
        }
        if (element instanceof TestResultElement) {
            // only show if there are no collapsed test nodes that have more specific choices
            if (element.value.tasks.length === 1) {
                primary.push(new Action('testing.outputPeek.showResultOutput', localize('testing.showResultOutput', 'Show Result Output'), ThemeIcon.asClassName(Codicon.terminal), undefined, () => this.requestReveal.fire(new TaskSubject(element.value, 0))));
            }
            primary.push(new Action('testing.outputPeek.reRunLastRun', localize('testing.reRunTest', 'Rerun Test'), ThemeIcon.asClassName(icons.testingRunIcon), undefined, () => this.commandService.executeCommand('testing.reRunLastRun', element.value.id)));
            if (capabilities & 4 /* TestRunProfileBitset.Debug */) {
                primary.push(new Action('testing.outputPeek.debugLastRun', localize('testing.debugTest', 'Debug Test'), ThemeIcon.asClassName(icons.testingDebugIcon), undefined, () => this.commandService.executeCommand('testing.debugLastRun', element.value.id)));
            }
        }
        if (element instanceof TestCaseElement || element instanceof TestMessageElement) {
            contextKeys.push([TestingContextKeys.testResultOutdated.key, element.test.retired], [
                TestingContextKeys.testResultState.key,
                testResultStateToContextValues[element.test.ownComputedState],
            ], ...getTestItemContextOverlay(element.test, capabilities));
            const extId = element.test.item.extId;
            if (element.test.tasks[element.taskIndex].messages.some((m) => m.type === 1 /* TestMessageType.Output */)) {
                primary.push(new Action('testing.outputPeek.showResultOutput', localize('testing.showResultOutput', 'Show Result Output'), ThemeIcon.asClassName(Codicon.terminal), undefined, () => this.requestReveal.fire(element.outputSubject)));
            }
            secondary.push(new Action('testing.outputPeek.revealInExplorer', localize('testing.revealInExplorer', 'Reveal in Test Explorer'), ThemeIcon.asClassName(Codicon.listTree), undefined, () => this.commandService.executeCommand('_revealTestInExplorer', extId)));
            if (capabilities & 2 /* TestRunProfileBitset.Run */) {
                primary.push(new Action('testing.outputPeek.runTest', localize('run test', 'Run Test'), ThemeIcon.asClassName(icons.testingRunIcon), undefined, () => this.commandService.executeCommand('vscode.runTestsById', 2 /* TestRunProfileBitset.Run */, extId)));
            }
            if (capabilities & 4 /* TestRunProfileBitset.Debug */) {
                primary.push(new Action('testing.outputPeek.debugTest', localize('debug test', 'Debug Test'), ThemeIcon.asClassName(icons.testingDebugIcon), undefined, () => this.commandService.executeCommand('vscode.runTestsById', 4 /* TestRunProfileBitset.Debug */, extId)));
            }
        }
        if (element instanceof TestMessageElement) {
            id = MenuId.TestMessageContext;
            contextKeys.push([TestingContextKeys.testMessageContext.key, element.contextValue]);
            primary.push(new Action('testing.outputPeek.goToTest', localize('testing.goToTest', 'Go to Test'), ThemeIcon.asClassName(Codicon.goToFile), undefined, () => this.commandService.executeCommand('vscode.revealTest', element.test.item.extId)));
            if (this.showRevealLocationOnMessages && element.location) {
                primary.push(new Action('testing.outputPeek.goToError', localize('testing.goToError', 'Go to Error'), ThemeIcon.asClassName(Codicon.debugStackframe), undefined, () => this.editorService.openEditor({
                    resource: element.location.uri,
                    options: {
                        selection: element.location.range,
                        preserveFocus: true,
                    },
                })));
            }
        }
        const contextOverlay = this.contextKeyService.createOverlay(contextKeys);
        const result = { primary, secondary };
        const menu = this.menuService.getMenuActions(id, contextOverlay, { arg: element.context });
        fillInActionBarActions(menu, result, 'inline');
        return result;
    }
};
TreeActionsProvider = __decorate([
    __param(2, IContextKeyService),
    __param(3, IMenuService),
    __param(4, ICommandService),
    __param(5, ITestProfileService),
    __param(6, IEditorService)
], TreeActionsProvider);
class CreationCache {
    constructor() {
        this.v = new WeakMap();
    }
    get(key) {
        return this.v.get(key);
    }
    getOrCreate(ref, factory) {
        const existing = this.v.get(ref);
        if (existing) {
            return existing;
        }
        const fresh = factory();
        this.v.set(ref, fresh);
        return fresh;
    }
}
const firstLine = (str) => {
    const index = str.indexOf('\n');
    return index === -1 ? str : str.slice(0, index);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RSZXN1bHRzVmlldy90ZXN0UmVzdWx0c1RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBUTdGLE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLHNCQUFz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
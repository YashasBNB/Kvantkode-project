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
var TestResultsViewContent_1;
import * as dom from '../../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../../base/browser/keyboardEvent.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Sizing, SplitView, } from '../../../../../base/browser/ui/splitview/splitview.js';
import { findAsync } from '../../../../../base/common/arrays.js';
import { Limiter } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Emitter, Event, Relay } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { FloatingClickMenu } from '../../../../../platform/actions/browser/floatingMenu.js';
import { createActionViewItem } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { CallStackFrame, CallStackWidget, CustomStackFrame, } from '../../../debug/browser/callStackWidget.js';
import { capabilityContextKeys, ITestProfileService } from '../../common/testProfileService.js';
import { LiveTestResult } from '../../common/testResult.js';
import { ITestService } from '../../common/testService.js';
import { TestingContextKeys } from '../../common/testingContextKeys.js';
import * as icons from '../icons.js';
import { DiffContentProvider, MarkdownTestMessagePeek, PlainTextMessagePeek, TerminalMessagePeek, } from './testResultsOutput.js';
import { equalsSubject, getSubjectTestItem, MessageSubject, TaskSubject, TestOutputSubject, } from './testResultsSubject.js';
import { OutputPeekTree } from './testResultsTree.js';
import './testResultsViewContent.css';
var SubView;
(function (SubView) {
    SubView[SubView["Diff"] = 0] = "Diff";
    SubView[SubView["History"] = 1] = "History";
})(SubView || (SubView = {}));
let MessageStackFrame = class MessageStackFrame extends CustomStackFrame {
    constructor(message, followup, subject, instantiationService, contextKeyService, profileService) {
        super();
        this.message = message;
        this.followup = followup;
        this.subject = subject;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.profileService = profileService;
        this.height = observableValue('MessageStackFrame.height', 100);
        this.icon = icons.testingViewIcon;
        this.label =
            subject instanceof MessageSubject
                ? subject.test.label
                : subject instanceof TestOutputSubject
                    ? subject.test.item.label
                    : subject.result.name;
    }
    render(container) {
        this.message.style.visibility = 'visible';
        container.appendChild(this.message);
        return toDisposable(() => this.message.remove());
    }
    renderActions(container) {
        const store = new DisposableStore();
        container.appendChild(this.followup.domNode);
        store.add(toDisposable(() => this.followup.domNode.remove()));
        const test = getSubjectTestItem(this.subject);
        const capabilities = test && this.profileService.capabilitiesForTest(test);
        let contextKeyService;
        if (capabilities) {
            contextKeyService = this.contextKeyService.createOverlay(capabilityContextKeys(capabilities));
        }
        else {
            const profiles = this.profileService.getControllerProfiles(this.subject.controllerId);
            contextKeyService = this.contextKeyService.createOverlay([
                [
                    TestingContextKeys.hasRunnableTests.key,
                    profiles.some((p) => p.group & 2 /* TestRunProfileBitset.Run */),
                ],
                [
                    TestingContextKeys.hasDebuggableTests.key,
                    profiles.some((p) => p.group & 4 /* TestRunProfileBitset.Debug */),
                ],
            ]);
        }
        const instaService = store.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        const toolbar = store.add(instaService.createInstance(MenuWorkbenchToolBar, container, MenuId.TestCallStack, {
            menuOptions: { shouldForwardArgs: true },
            actionViewItemProvider: (action, options) => createActionViewItem(this.instantiationService, action, options),
        }));
        toolbar.context = this.subject;
        store.add(toolbar);
        return store;
    }
};
MessageStackFrame = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, ITestProfileService)
], MessageStackFrame);
function runInLast(accessor, bitset, subject) {
    // Let the full command do its thing if we want to run the whole set of tests
    if (subject instanceof TaskSubject) {
        return accessor
            .get(ICommandService)
            .executeCommand(bitset === 4 /* TestRunProfileBitset.Debug */
            ? "testing.debugLastRun" /* TestCommandId.DebugLastRun */
            : "testing.reRunLastRun" /* TestCommandId.ReRunLastRun */, subject.result.id);
    }
    const testService = accessor.get(ITestService);
    const plainTest = subject instanceof MessageSubject ? subject.test : subject.test.item;
    const currentTest = testService.collection.getNodeById(plainTest.extId);
    if (!currentTest) {
        return;
    }
    return testService.runTests({
        group: bitset,
        tests: [currentTest],
    });
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'testing.callStack.run',
            title: localize('testing.callStack.run', 'Rerun Test'),
            icon: icons.testingRunIcon,
            menu: {
                id: MenuId.TestCallStack,
                when: TestingContextKeys.hasRunnableTests,
                group: 'navigation',
            },
        });
    }
    run(accessor, subject) {
        runInLast(accessor, 2 /* TestRunProfileBitset.Run */, subject);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'testing.callStack.debug',
            title: localize('testing.callStack.debug', 'Debug Test'),
            icon: icons.testingDebugIcon,
            menu: {
                id: MenuId.TestCallStack,
                when: TestingContextKeys.hasDebuggableTests,
                group: 'navigation',
            },
        });
    }
    run(accessor, subject) {
        runInLast(accessor, 4 /* TestRunProfileBitset.Debug */, subject);
    }
});
let TestResultsViewContent = class TestResultsViewContent extends Disposable {
    static { TestResultsViewContent_1 = this; }
    get uiState() {
        return {
            splitViewWidths: Array.from({ length: this.splitView.length }, (_, i) => this.splitView.getViewSize(i)),
        };
    }
    get onDidChangeContentHeight() {
        return this.callStackWidget.onDidChangeContentHeight;
    }
    get contentHeight() {
        return this.callStackWidget?.contentHeight || 0;
    }
    constructor(editor, options, instantiationService, modelService, contextKeyService, uriIdentityService) {
        super();
        this.editor = editor;
        this.options = options;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.contextKeyService = contextKeyService;
        this.uriIdentityService = uriIdentityService;
        this.didReveal = this._register(new Emitter());
        this.currentSubjectStore = this._register(new DisposableStore());
        this.onCloseEmitter = this._register(new Relay());
        this.contentProvidersUpdateLimiter = this._register(new Limiter(1));
        this.onClose = this.onCloseEmitter.event;
    }
    fillBody(containerElement) {
        const initialSpitWidth = TestResultsViewContent_1.lastSplitWidth;
        this.splitView = new SplitView(containerElement, { orientation: 1 /* Orientation.HORIZONTAL */ });
        const { historyVisible, showRevealLocationOnMessages } = this.options;
        const isInPeekView = this.editor !== undefined;
        const messageContainer = (this.messageContainer = dom.$('.test-output-peek-message-container'));
        this.stackContainer = dom.append(containerElement, dom.$('.test-output-call-stack-container'));
        this.callStackWidget = this._register(this.instantiationService.createInstance(CallStackWidget, this.stackContainer, this.editor));
        this.followupWidget = this._register(this.instantiationService.createInstance(FollowupActionWidget, this.editor));
        this.onCloseEmitter.input = this.followupWidget.onClose;
        this.contentProviders = [
            this._register(this.instantiationService.createInstance(DiffContentProvider, this.editor, messageContainer)),
            this._register(this.instantiationService.createInstance(MarkdownTestMessagePeek, messageContainer)),
            this._register(this.instantiationService.createInstance(TerminalMessagePeek, messageContainer, isInPeekView)),
            this._register(this.instantiationService.createInstance(PlainTextMessagePeek, this.editor, messageContainer)),
        ];
        this.messageContextKeyService = this._register(this.contextKeyService.createScoped(containerElement));
        this.contextKeyTestMessage = TestingContextKeys.testMessageContext.bindTo(this.messageContextKeyService);
        this.contextKeyResultOutdated = TestingContextKeys.testResultOutdated.bindTo(this.messageContextKeyService);
        const treeContainer = dom.append(containerElement, dom.$('.test-output-peek-tree.testing-stdtree'));
        const tree = this._register(this.instantiationService.createInstance(OutputPeekTree, treeContainer, this.didReveal.event, { showRevealLocationOnMessages, locationForProgress: this.options.locationForProgress }));
        this.onDidRequestReveal = tree.onDidRequestReview;
        this.splitView.addView({
            onDidChange: Event.None,
            element: this.stackContainer,
            minimumSize: 200,
            maximumSize: Number.MAX_VALUE,
            layout: (width) => {
                TestResultsViewContent_1.lastSplitWidth = width;
                if (this.dimension) {
                    this.callStackWidget?.layout(this.dimension.height, width);
                    this.layoutContentWidgets(this.dimension, width);
                }
            },
        }, Sizing.Distribute);
        this.splitView.addView({
            onDidChange: Event.None,
            element: treeContainer,
            minimumSize: 100,
            maximumSize: Number.MAX_VALUE,
            layout: (width) => {
                if (this.dimension) {
                    tree.layout(this.dimension.height, width);
                }
            },
        }, Sizing.Distribute);
        this.splitView.setViewVisible(1 /* SubView.History */, historyVisible.value);
        this._register(historyVisible.onDidChange((visible) => {
            this.splitView.setViewVisible(1 /* SubView.History */, visible);
        }));
        if (initialSpitWidth) {
            queueMicrotask(() => this.splitView.resizeView(0, initialSpitWidth));
        }
    }
    /**
     * Shows a message in-place without showing or changing the peek location.
     * This is mostly used if peeking a message without a location.
     */
    reveal(opts) {
        this.didReveal.fire(opts);
        if (this.current && equalsSubject(this.current, opts.subject)) {
            return Promise.resolve();
        }
        this.current = opts.subject;
        return this.contentProvidersUpdateLimiter.queue(async () => {
            this.currentSubjectStore.clear();
            const callFrames = this.getCallFrames(opts.subject) || [];
            const topFrame = await this.prepareTopFrame(opts.subject, callFrames);
            this.setCallStackFrames(topFrame, callFrames);
            this.followupWidget.show(opts.subject);
            this.populateFloatingClick(opts.subject);
        });
    }
    setCallStackFrames(messageFrame, stack) {
        this.callStackWidget.setFrames([
            messageFrame,
            ...stack.map((frame) => new CallStackFrame(frame.label, frame.uri, frame.position?.lineNumber, frame.position?.column)),
        ]);
    }
    /**
     * Collapses all displayed stack frames.
     */
    collapseStack() {
        this.callStackWidget.collapseAll();
    }
    getCallFrames(subject) {
        if (!(subject instanceof MessageSubject)) {
            return undefined;
        }
        const frames = subject.stack;
        if (!frames?.length || !this.editor) {
            return frames;
        }
        // If the test extension just sets the top frame as the same location
        // where the message is displayed, in the case of a peek in an editor,
        // don't show it again because it's just a duplicate
        const topFrame = frames[0];
        const peekLocation = subject.revealLocation;
        const isTopFrameSame = peekLocation &&
            topFrame.position &&
            topFrame.uri &&
            topFrame.position.lineNumber === peekLocation.range.startLineNumber &&
            topFrame.position.column === peekLocation.range.startColumn &&
            this.uriIdentityService.extUri.isEqual(topFrame.uri, peekLocation.uri);
        return isTopFrameSame ? frames.slice(1) : frames;
    }
    async prepareTopFrame(subject, callFrames) {
        // ensure the messageContainer is in the DOM so renderers can calculate the
        // dimensions before it's rendered in the list.
        this.messageContainer.style.visibility = 'hidden';
        this.stackContainer.appendChild(this.messageContainer);
        const topFrame = (this.currentTopFrame = this.instantiationService.createInstance(MessageStackFrame, this.messageContainer, this.followupWidget, subject));
        const hasMultipleFrames = callFrames.length > 0;
        topFrame.showHeader.set(hasMultipleFrames, undefined);
        const provider = await findAsync(this.contentProviders, (p) => p.update(subject));
        if (provider) {
            const width = this.splitView.getViewSize(0 /* SubView.Diff */);
            if (width !== -1 && this.dimension) {
                topFrame.height.set(provider.layout({ width, height: this.dimension?.height }, hasMultipleFrames), undefined);
            }
            if (provider.onScrolled) {
                this.currentSubjectStore.add(this.callStackWidget.onDidScroll((evt) => {
                    provider.onScrolled(evt);
                }));
            }
            if (provider.onDidContentSizeChange) {
                this.currentSubjectStore.add(provider.onDidContentSizeChange(() => {
                    if (this.dimension && !this.isDoingLayoutUpdate) {
                        this.isDoingLayoutUpdate = true;
                        topFrame.height.set(provider.layout(this.dimension, hasMultipleFrames), undefined);
                        this.isDoingLayoutUpdate = false;
                    }
                }));
            }
        }
        return topFrame;
    }
    layoutContentWidgets(dimension, width = this.splitView.getViewSize(0 /* SubView.Diff */)) {
        this.isDoingLayoutUpdate = true;
        for (const provider of this.contentProviders) {
            const frameHeight = provider.layout({ height: dimension.height, width }, !!this.currentTopFrame?.showHeader.get());
            if (frameHeight) {
                this.currentTopFrame?.height.set(frameHeight, undefined);
            }
        }
        this.isDoingLayoutUpdate = false;
    }
    populateFloatingClick(subject) {
        if (!(subject instanceof MessageSubject)) {
            return;
        }
        this.currentSubjectStore.add(toDisposable(() => {
            this.contextKeyResultOutdated.reset();
            this.contextKeyTestMessage.reset();
        }));
        this.contextKeyTestMessage.set(subject.contextValue || '');
        if (subject.result instanceof LiveTestResult) {
            this.contextKeyResultOutdated.set(subject.result.getStateById(subject.test.extId)?.retired ?? false);
            this.currentSubjectStore.add(subject.result.onChange((ev) => {
                if (ev.item.item.extId === subject.test.extId) {
                    this.contextKeyResultOutdated.set(ev.item.retired ?? false);
                }
            }));
        }
        else {
            this.contextKeyResultOutdated.set(true);
        }
        const instaService = this.currentSubjectStore.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.messageContextKeyService])));
        this.currentSubjectStore.add(instaService.createInstance(FloatingClickMenu, {
            container: this.messageContainer,
            menuId: MenuId.TestMessageContent,
            getActionArg: () => subject.context,
        }));
    }
    onLayoutBody(height, width) {
        this.dimension = new dom.Dimension(width, height);
        this.splitView.layout(width);
    }
    onWidth(width) {
        this.splitView.layout(width);
    }
};
TestResultsViewContent = TestResultsViewContent_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, ITextModelService),
    __param(4, IContextKeyService),
    __param(5, IUriIdentityService)
], TestResultsViewContent);
export { TestResultsViewContent };
const FOLLOWUP_ANIMATION_MIN_TIME = 500;
let FollowupActionWidget = class FollowupActionWidget extends Disposable {
    get domNode() {
        return this.el.root;
    }
    constructor(editor, testService, quickInput) {
        super();
        this.editor = editor;
        this.testService = testService;
        this.quickInput = quickInput;
        this.el = dom.h('div.testing-followup-action', []);
        this.visibleStore = this._register(new DisposableStore());
        this.onCloseEmitter = this._register(new Emitter());
        this.onClose = this.onCloseEmitter.event;
    }
    show(subject) {
        this.visibleStore.clear();
        if (subject instanceof MessageSubject) {
            this.showMessage(subject);
        }
    }
    async showMessage(subject) {
        const cts = this.visibleStore.add(new CancellationTokenSource());
        const start = Date.now();
        // Wait for completion otherwise results will not be available to the ext host:
        if (subject.result instanceof LiveTestResult && !subject.result.completedAt) {
            await new Promise((r) => Event.once(subject.result.onComplete)(r));
        }
        const followups = await this.testService.provideTestFollowups({
            extId: subject.test.extId,
            messageIndex: subject.messageIndex,
            resultId: subject.result.id,
            taskIndex: subject.taskIndex,
        }, cts.token);
        if (!followups.followups.length || cts.token.isCancellationRequested) {
            followups.dispose();
            return;
        }
        this.visibleStore.add(followups);
        dom.clearNode(this.el.root);
        this.el.root.classList.toggle('animated', Date.now() - start > FOLLOWUP_ANIMATION_MIN_TIME);
        this.el.root.appendChild(this.makeFollowupLink(followups.followups[0]));
        if (followups.followups.length > 1) {
            this.el.root.appendChild(this.makeMoreLink(followups.followups));
        }
        this.visibleStore.add(toDisposable(() => {
            this.el.root.remove();
        }));
    }
    makeFollowupLink(first) {
        const link = this.makeLink(() => this.actionFollowup(link, first));
        dom.reset(link, ...renderLabelWithIcons(first.message));
        return link;
    }
    makeMoreLink(followups) {
        const link = this.makeLink(() => this.quickInput
            .pick(followups.map((f, i) => ({
            label: f.message,
            index: i,
        })))
            .then((picked) => {
            if (picked?.length) {
                followups[picked[0].index].execute();
            }
        }));
        link.innerText = localize('testFollowup.more', '+{0} More...', followups.length - 1);
        return link;
    }
    makeLink(onClick) {
        const link = document.createElement('a');
        link.tabIndex = 0;
        this.visibleStore.add(dom.addDisposableListener(link, 'click', onClick));
        this.visibleStore.add(dom.addDisposableListener(link, 'keydown', (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */)) {
                onClick();
            }
        }));
        return link;
    }
    actionFollowup(link, fu) {
        if (link.ariaDisabled !== 'true') {
            link.ariaDisabled = 'true';
            fu.execute();
            if (this.editor) {
                this.onCloseEmitter.fire();
            }
        }
    }
};
FollowupActionWidget = __decorate([
    __param(1, ITestService),
    __param(2, IQuickInputService)
], FollowupActionWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNWaWV3Q29udGVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0UmVzdWx0c1ZpZXcvdGVzdFJlc3VsdHNWaWV3Q29udGVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM3RixPQUFPLEVBRU4sTUFBTSxFQUNOLFNBQVMsR0FDVCxNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFM0UsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvRUFB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
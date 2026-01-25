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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNWaWV3Q29udGVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RSZXN1bHRzVmlldy90ZXN0UmVzdWx0c1ZpZXdDb250ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzdGLE9BQU8sRUFFTixNQUFNLEVBQ04sU0FBUyxHQUNULE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFN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
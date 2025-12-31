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
var TestingOutputPeekController_1;
import * as dom from '../../../../base/browser/dom.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Color } from '../../../../base/common/color.js';
import { Event } from '../../../../base/common/event.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, disposableObservableValue, observableValue, } from '../../../../base/common/observable.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { EmbeddedDiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IPeekViewService, PeekViewWidget, peekViewTitleForeground, peekViewTitleInfoForeground, } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { fillInActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { getTestingConfiguration, } from '../common/configuration.js';
import { MutableObservableValue, staticObservableValue } from '../common/observableValue.js';
import { StoredValue } from '../common/storedValue.js';
import { resultItemParents, } from '../common/testResult.js';
import { ITestResultService } from '../common/testResultService.js';
import { ITestService } from '../common/testService.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import { ITestingPeekOpener } from '../common/testingPeekOpener.js';
import { isFailedState } from '../common/testingStates.js';
import { buildTestUri, parseTestUri } from '../common/testingUri.js';
import { renderTestMessageAsText } from './testMessageColorizer.js';
import { MessageSubject, TaskSubject, TestOutputSubject, inspectSubjectHasStack, mapFindTestMessage, } from './testResultsView/testResultsSubject.js';
import { TestResultsViewContent } from './testResultsView/testResultsViewContent.js';
import { testingMessagePeekBorder, testingPeekBorder, testingPeekHeaderBackground, testingPeekMessageHeaderBackground, } from './theme.js';
/** Iterates through every message in every result */
function* allMessages([result]) {
    if (!result) {
        return;
    }
    for (const test of result.tests) {
        for (let taskIndex = 0; taskIndex < test.tasks.length; taskIndex++) {
            const messages = test.tasks[taskIndex].messages;
            for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
                if (messages[messageIndex].type === 0 /* TestMessageType.Error */) {
                    yield { result, test, taskIndex, messageIndex };
                }
            }
        }
    }
}
function messageItReferenceToUri({ result, test, taskIndex, messageIndex, }) {
    return buildTestUri({
        type: 2 /* TestUriType.ResultMessage */,
        resultId: result.id,
        testExtId: test.item.extId,
        taskIndex,
        messageIndex,
    });
}
let TestingPeekOpener = class TestingPeekOpener extends Disposable {
    constructor(configuration, editorService, codeEditorService, testResults, testService, storageService, viewsService, commandService, notificationService) {
        super();
        this.configuration = configuration;
        this.editorService = editorService;
        this.codeEditorService = codeEditorService;
        this.testResults = testResults;
        this.testService = testService;
        this.storageService = storageService;
        this.viewsService = viewsService;
        this.commandService = commandService;
        this.notificationService = notificationService;
        /** @inheritdoc */
        this.historyVisible = this._register(MutableObservableValue.stored(new StoredValue({
            key: 'testHistoryVisibleInPeek',
            scope: 0 /* StorageScope.PROFILE */,
            target: 0 /* StorageTarget.USER */,
        }, this.storageService), false));
        this._register(testResults.onTestChanged(this.openPeekOnFailure, this));
    }
    /** @inheritdoc */
    async open() {
        let uri;
        const active = this.editorService.activeTextEditorControl;
        if (isCodeEditor(active) && active.getModel()?.uri) {
            const modelUri = active.getModel()?.uri;
            if (modelUri) {
                uri = await this.getFileCandidateMessage(modelUri, active.getPosition());
            }
        }
        if (!uri) {
            uri = this.lastUri;
        }
        if (!uri) {
            uri = this.getAnyCandidateMessage();
        }
        if (!uri) {
            return false;
        }
        return this.showPeekFromUri(uri);
    }
    /** @inheritdoc */
    tryPeekFirstError(result, test, options) {
        const candidate = this.getFailedCandidateMessage(test);
        if (!candidate) {
            return false;
        }
        this.showPeekFromUri({
            type: 2 /* TestUriType.ResultMessage */,
            documentUri: candidate.location.uri,
            taskIndex: candidate.taskId,
            messageIndex: candidate.index,
            resultId: result.id,
            testExtId: test.item.extId,
        }, undefined, {
            selection: candidate.location.range,
            selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */,
            ...options,
        });
        return true;
    }
    /** @inheritdoc */
    peekUri(uri, options = {}) {
        const parsed = parseTestUri(uri);
        const result = parsed && this.testResults.getResult(parsed.resultId);
        if (!parsed || !result || !('testExtId' in parsed)) {
            return false;
        }
        if (!('messageIndex' in parsed)) {
            return false;
        }
        const message = result.getStateById(parsed.testExtId)?.tasks[parsed.taskIndex].messages[parsed.messageIndex];
        if (!message?.location) {
            return false;
        }
        this.showPeekFromUri({
            type: 2 /* TestUriType.ResultMessage */,
            documentUri: message.location.uri,
            taskIndex: parsed.taskIndex,
            messageIndex: parsed.messageIndex,
            resultId: result.id,
            testExtId: parsed.testExtId,
        }, options.inEditor, { selection: message.location.range, ...options.options });
        return true;
    }
    /** @inheritdoc */
    closeAllPeeks() {
        for (const editor of this.codeEditorService.listCodeEditors()) {
            TestingOutputPeekController.get(editor)?.removePeek();
        }
    }
    openCurrentInEditor() {
        const current = this.getActiveControl();
        if (!current) {
            return;
        }
        const options = { pinned: false, revealIfOpened: true };
        if (current instanceof TaskSubject || current instanceof TestOutputSubject) {
            this.editorService.openEditor({ resource: current.outputUri, options });
            return;
        }
        if (current instanceof TestOutputSubject) {
            this.editorService.openEditor({ resource: current.outputUri, options });
            return;
        }
        const message = current.message;
        if (current.isDiffable) {
            this.editorService.openEditor({
                original: { resource: current.expectedUri },
                modified: { resource: current.actualUri },
                options,
            });
        }
        else if (typeof message.message === 'string') {
            this.editorService.openEditor({ resource: current.messageUri, options });
        }
        else {
            this.commandService
                .executeCommand('markdown.showPreview', current.messageUri)
                .catch((err) => {
                this.notificationService.error(localize('testing.markdownPeekError', 'Could not open markdown preview: {0}.\n\nPlease make sure the markdown extension is enabled.', err.message));
            });
        }
    }
    getActiveControl() {
        const editor = getPeekedEditorFromFocus(this.codeEditorService);
        const controller = editor && TestingOutputPeekController.get(editor);
        return (controller?.subject.get() ??
            this.viewsService.getActiveViewWithId("workbench.panel.testResults.view" /* Testing.ResultsViewId */)?.subject);
    }
    /** @inheritdoc */
    async showPeekFromUri(uri, editor, options) {
        if (isCodeEditor(editor)) {
            this.lastUri = uri;
            TestingOutputPeekController.get(editor)?.show(buildTestUri(this.lastUri));
            return true;
        }
        const pane = await this.editorService.openEditor({
            resource: uri.documentUri,
            options: { revealIfOpened: true, ...options },
        });
        const control = pane?.getControl();
        if (!isCodeEditor(control)) {
            return false;
        }
        this.lastUri = uri;
        TestingOutputPeekController.get(control)?.show(buildTestUri(this.lastUri));
        return true;
    }
    /**
     * Opens the peek view on a test failure, based on user preferences.
     */
    openPeekOnFailure(evt) {
        if (evt.reason !== 1 /* TestResultItemChangeReason.OwnStateChange */) {
            return;
        }
        const candidate = this.getFailedCandidateMessage(evt.item);
        if (!candidate) {
            return;
        }
        if (evt.result.request.continuous &&
            !getTestingConfiguration(this.configuration, "testing.automaticallyOpenPeekViewDuringAutoRun" /* TestingConfigKeys.AutoOpenPeekViewDuringContinuousRun */)) {
            return;
        }
        const editors = this.codeEditorService.listCodeEditors();
        const cfg = getTestingConfiguration(this.configuration, "testing.automaticallyOpenPeekView" /* TestingConfigKeys.AutoOpenPeekView */);
        // don't show the peek if the user asked to only auto-open peeks for visible tests,
        // and this test is not in any of the editors' models.
        switch (cfg) {
            case "failureInVisibleDocument" /* AutoOpenPeekViewWhen.FailureVisible */: {
                const visibleEditors = this.editorService.visibleTextEditorControls;
                const editorUris = new Set(visibleEditors.filter(isCodeEditor).map((e) => e.getModel()?.uri.toString()));
                if (!Iterable.some(resultItemParents(evt.result, evt.item), (i) => i.item.uri && editorUris.has(i.item.uri.toString()))) {
                    return;
                }
                break; //continue
            }
            case "failureAnywhere" /* AutoOpenPeekViewWhen.FailureAnywhere */:
                break; //continue
            default:
                return; // never show
        }
        const controllers = editors.map(TestingOutputPeekController.get);
        if (controllers.some((c) => c?.subject.get())) {
            return;
        }
        this.tryPeekFirstError(evt.result, evt.item);
    }
    /**
     * Gets the message closest to the given position from a test in the file.
     */
    async getFileCandidateMessage(uri, position) {
        let best;
        let bestDistance = Infinity;
        // Get all tests for the document. In those, find one that has a test
        // message closest to the cursor position.
        const demandedUriStr = uri.toString();
        for (const test of this.testService.collection.all) {
            const result = this.testResults.getStateById(test.item.extId);
            if (!result) {
                continue;
            }
            mapFindTestMessage(result[1], (_task, message, messageIndex, taskIndex) => {
                if (message.type !== 0 /* TestMessageType.Error */ ||
                    !message.location ||
                    message.location.uri.toString() !== demandedUriStr) {
                    return;
                }
                const distance = position
                    ? Math.abs(position.lineNumber - message.location.range.startLineNumber)
                    : 0;
                if (!best || distance <= bestDistance) {
                    bestDistance = distance;
                    best = {
                        type: 2 /* TestUriType.ResultMessage */,
                        testExtId: result[1].item.extId,
                        resultId: result[0].id,
                        taskIndex,
                        messageIndex,
                        documentUri: uri,
                    };
                }
            });
        }
        return best;
    }
    /**
     * Gets any possible still-relevant message from the results.
     */
    getAnyCandidateMessage() {
        const seen = new Set();
        for (const result of this.testResults.results) {
            for (const test of result.tests) {
                if (seen.has(test.item.extId)) {
                    continue;
                }
                seen.add(test.item.extId);
                const found = mapFindTestMessage(test, (task, message, messageIndex, taskIndex) => message.location && {
                    type: 2 /* TestUriType.ResultMessage */,
                    testExtId: test.item.extId,
                    resultId: result.id,
                    taskIndex,
                    messageIndex,
                    documentUri: message.location.uri,
                });
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }
    /**
     * Gets the first failed message that can be displayed from the result.
     */
    getFailedCandidateMessage(test) {
        const fallbackLocation = test.item.uri && test.item.range ? { uri: test.item.uri, range: test.item.range } : undefined;
        let best;
        mapFindTestMessage(test, (task, message, messageIndex, taskId) => {
            const location = message.location || fallbackLocation;
            if (!isFailedState(task.state) || !location) {
                return;
            }
            if (best && message.type !== 0 /* TestMessageType.Error */) {
                return;
            }
            best = { taskId, index: messageIndex, message, location };
        });
        return best;
    }
};
TestingPeekOpener = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorService),
    __param(2, ICodeEditorService),
    __param(3, ITestResultService),
    __param(4, ITestService),
    __param(5, IStorageService),
    __param(6, IViewsService),
    __param(7, ICommandService),
    __param(8, INotificationService)
], TestingPeekOpener);
export { TestingPeekOpener };
/**
 * Adds output/message peek functionality to code editors.
 */
let TestingOutputPeekController = TestingOutputPeekController_1 = class TestingOutputPeekController extends Disposable {
    /**
     * Gets the controller associated with the given code editor.
     */
    static get(editor) {
        return editor.getContribution("editor.contrib.testingOutputPeek" /* Testing.OutputPeekContributionId */);
    }
    constructor(editor, codeEditorService, instantiationService, testResults, contextKeyService) {
        super();
        this.editor = editor;
        this.codeEditorService = codeEditorService;
        this.instantiationService = instantiationService;
        this.testResults = testResults;
        /**
         * Currently-shown peek view.
         */
        this.peek = this._register(disposableObservableValue('TestingOutputPeek', undefined));
        /**
         * Gets the currently display subject. Undefined if the peek is not open.
         */
        this.subject = derived((reader) => this.peek.read(reader)?.current.read(reader));
        this.visible = TestingContextKeys.isPeekVisible.bindTo(contextKeyService);
        this._register(editor.onDidChangeModel(() => this.peek.set(undefined, undefined)));
        this._register(testResults.onResultsChanged(this.closePeekOnCertainResultEvents, this));
        this._register(testResults.onTestChanged(this.closePeekOnTestChange, this));
    }
    /**
     * Shows a peek for the message in the editor.
     */
    async show(uri) {
        const subject = this.retrieveTest(uri);
        if (subject) {
            this.showSubject(subject);
        }
    }
    /**
     * Shows a peek for the existing inspect subject.
     */
    async showSubject(subject) {
        if (!this.peek.get()) {
            const peek = this.instantiationService.createInstance(TestResultsPeek, this.editor);
            this.peek.set(peek, undefined);
            peek.onDidClose(() => {
                this.visible.set(false);
                this.peek.set(undefined, undefined);
            });
            this.visible.set(true);
            peek.create();
        }
        if (subject instanceof MessageSubject) {
            alert(renderTestMessageAsText(subject.message.message));
        }
        this.peek.get().setModel(subject);
    }
    async openAndShow(uri) {
        const subject = this.retrieveTest(uri);
        if (!subject) {
            return;
        }
        if (!subject.revealLocation ||
            subject.revealLocation.uri.toString() === this.editor.getModel()?.uri.toString()) {
            return this.show(uri);
        }
        const otherEditor = await this.codeEditorService.openCodeEditor({
            resource: subject.revealLocation.uri,
            options: { pinned: false, revealIfOpened: true },
        }, this.editor);
        if (otherEditor) {
            TestingOutputPeekController_1.get(otherEditor)?.removePeek();
            return TestingOutputPeekController_1.get(otherEditor)?.show(uri);
        }
    }
    /**
     * Disposes the peek view, if any.
     */
    removePeek() {
        this.peek.set(undefined, undefined);
    }
    /**
     * Collapses all displayed stack frames.
     */
    collapseStack() {
        this.peek.get()?.collapseStack();
    }
    /**
     * Shows the next message in the peek, if possible.
     */
    next() {
        const subject = this.peek.get()?.current.get();
        if (!subject) {
            return;
        }
        let first;
        let found = false;
        for (const m of allMessages(this.testResults.results)) {
            first ??= m;
            if (subject instanceof TaskSubject && m.result.id === subject.result.id) {
                found = true; // open the first message found in the current result
            }
            if (found) {
                this.openAndShow(messageItReferenceToUri(m));
                return;
            }
            if (subject instanceof TestOutputSubject &&
                subject.test.item.extId === m.test.item.extId &&
                subject.taskIndex === m.taskIndex &&
                subject.result.id === m.result.id) {
                found = true;
            }
            if (subject instanceof MessageSubject &&
                subject.test.extId === m.test.item.extId &&
                subject.messageIndex === m.messageIndex &&
                subject.taskIndex === m.taskIndex &&
                subject.result.id === m.result.id) {
                found = true;
            }
        }
        if (first) {
            this.openAndShow(messageItReferenceToUri(first));
        }
    }
    /**
     * Shows the previous message in the peek, if possible.
     */
    previous() {
        const subject = this.subject.get();
        if (!subject) {
            return;
        }
        let previous; // pointer to the last message
        let previousLockedIn = false; // whether the last message was verified as previous to the current subject
        let last; // overall last message
        for (const m of allMessages(this.testResults.results)) {
            last = m;
            if (!previousLockedIn) {
                if (subject instanceof TaskSubject) {
                    if (m.result.id === subject.result.id) {
                        previousLockedIn = true;
                    }
                    continue;
                }
                if (subject instanceof TestOutputSubject) {
                    if (m.test.item.extId === subject.test.item.extId &&
                        m.result.id === subject.result.id &&
                        m.taskIndex === subject.taskIndex) {
                        previousLockedIn = true;
                    }
                    continue;
                }
                if (subject.test.extId === m.test.item.extId &&
                    subject.messageIndex === m.messageIndex &&
                    subject.taskIndex === m.taskIndex &&
                    subject.result.id === m.result.id) {
                    previousLockedIn = true;
                    continue;
                }
                previous = m;
            }
        }
        const target = previous || last;
        if (target) {
            this.openAndShow(messageItReferenceToUri(target));
        }
    }
    /**
     * Removes the peek view if it's being displayed on the given test ID.
     */
    removeIfPeekingForTest(testId) {
        const c = this.subject.get();
        if (c && c instanceof MessageSubject && c.test.extId === testId) {
            this.peek.set(undefined, undefined);
        }
    }
    /**
     * If the test we're currently showing has its state change to something
     * else, then clear the peek.
     */
    closePeekOnTestChange(evt) {
        if (evt.reason !== 1 /* TestResultItemChangeReason.OwnStateChange */ ||
            evt.previousState === evt.item.ownComputedState) {
            return;
        }
        this.removeIfPeekingForTest(evt.item.item.extId);
    }
    closePeekOnCertainResultEvents(evt) {
        if ('started' in evt) {
            this.peek.set(undefined, undefined); // close peek when runs start
        }
        if ('removed' in evt && this.testResults.results.length === 0) {
            this.peek.set(undefined, undefined); // close the peek if results are cleared
        }
    }
    retrieveTest(uri) {
        const parts = parseTestUri(uri);
        if (!parts) {
            return undefined;
        }
        const result = this.testResults.results.find((r) => r.id === parts.resultId);
        if (!result) {
            return;
        }
        if (parts.type === 0 /* TestUriType.TaskOutput */) {
            return new TaskSubject(result, parts.taskIndex);
        }
        if (parts.type === 1 /* TestUriType.TestOutput */) {
            const test = result.getStateById(parts.testExtId);
            if (!test) {
                return;
            }
            return new TestOutputSubject(result, parts.taskIndex, test);
        }
        const { testExtId, taskIndex, messageIndex } = parts;
        const test = result?.getStateById(testExtId);
        if (!test || !test.tasks[parts.taskIndex]) {
            return;
        }
        return new MessageSubject(result, test, taskIndex, messageIndex);
    }
};
TestingOutputPeekController = TestingOutputPeekController_1 = __decorate([
    __param(1, ICodeEditorService),
    __param(2, IInstantiationService),
    __param(3, ITestResultService),
    __param(4, IContextKeyService)
], TestingOutputPeekController);
export { TestingOutputPeekController };
let TestResultsPeek = class TestResultsPeek extends PeekViewWidget {
    constructor(editor, themeService, peekViewService, testingPeek, contextKeyService, menuService, instantiationService, modelService, codeEditorService, uriIdentityService) {
        super(editor, {
            showFrame: true,
            frameWidth: 1,
            showArrow: true,
            isResizeable: true,
            isAccessible: true,
            className: 'test-output-peek',
        }, instantiationService);
        this.themeService = themeService;
        this.testingPeek = testingPeek;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.modelService = modelService;
        this.codeEditorService = codeEditorService;
        this.uriIdentityService = uriIdentityService;
        this.current = observableValue('testPeekCurrent', undefined);
        this.resizeOnNextContentHeightUpdate = false;
        this._disposables.add(themeService.onDidColorThemeChange(this.applyTheme, this));
        peekViewService.addExclusiveWidget(editor, this);
    }
    _getMaximumHeightInLines() {
        const defaultMaxHeight = super._getMaximumHeightInLines();
        const contentHeight = this.content?.contentHeight;
        if (!contentHeight) {
            // undefined or 0
            return defaultMaxHeight;
        }
        if (this.testingPeek.historyVisible.value) {
            // don't cap height with the history split
            return defaultMaxHeight;
        }
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        // 41 is experimentally determined to be the overhead of the peek view itself
        // to avoid showing scrollbars by default in its content.
        const basePeekOverhead = 41;
        return Math.min(defaultMaxHeight || Infinity, (contentHeight + basePeekOverhead) / lineHeight + 1);
    }
    applyTheme() {
        const theme = this.themeService.getColorTheme();
        const current = this.current.get();
        const isError = current instanceof MessageSubject && current.message.type === 0 /* TestMessageType.Error */;
        const borderColor = (isError ? theme.getColor(testingPeekBorder) : theme.getColor(testingMessagePeekBorder)) ||
            Color.transparent;
        const headerBg = (isError
            ? theme.getColor(testingPeekHeaderBackground)
            : theme.getColor(testingPeekMessageHeaderBackground)) || Color.transparent;
        const editorBg = theme.getColor(editorBackground);
        this.style({
            arrowColor: borderColor,
            frameColor: borderColor,
            headerBackgroundColor: editorBg && headerBg ? headerBg.makeOpaque(editorBg) : headerBg,
            primaryHeadingColor: theme.getColor(peekViewTitleForeground),
            secondaryHeadingColor: theme.getColor(peekViewTitleInfoForeground),
        });
    }
    _fillContainer(container) {
        if (!this.scopedContextKeyService) {
            this.scopedContextKeyService = this._disposables.add(this.contextKeyService.createScoped(container));
            TestingContextKeys.isInPeek.bindTo(this.scopedContextKeyService).set(true);
            const instaService = this._disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
            this.content = this._disposables.add(instaService.createInstance(TestResultsViewContent, this.editor, {
                historyVisible: this.testingPeek.historyVisible,
                showRevealLocationOnMessages: false,
                locationForProgress: "workbench.panel.testResults.view" /* Testing.ResultsViewId */,
            }));
            this._disposables.add(this.content.onClose(() => {
                TestingOutputPeekController.get(this.editor)?.removePeek();
            }));
        }
        super._fillContainer(container);
    }
    _fillHead(container) {
        super._fillHead(container);
        const menuContextKeyService = this._disposables.add(this.contextKeyService.createScoped(container));
        this._disposables.add(bindContextKey(TestingContextKeys.peekHasStack, menuContextKeyService, (reader) => inspectSubjectHasStack(this.current.read(reader))));
        const menu = this.menuService.createMenu(MenuId.TestPeekTitle, menuContextKeyService);
        const actionBar = this._actionbarWidget;
        this._disposables.add(menu.onDidChange(() => {
            actions.length = 0;
            fillInActionBarActions(menu.getActions(), actions);
            while (actionBar.getAction(1)) {
                actionBar.pull(0); // remove all but the view's default "close" button
            }
            actionBar.push(actions, { label: false, icon: true, index: 0 });
        }));
        const actions = [];
        fillInActionBarActions(menu.getActions(), actions);
        actionBar.push(actions, { label: false, icon: true, index: 0 });
    }
    _fillBody(containerElement) {
        this.content.fillBody(containerElement);
        // Resize on height updates for a short time to allow any heights made
        // by editor contributions to come into effect before.
        const contentHeightSettleTimer = this._disposables.add(new RunOnceScheduler(() => {
            this.resizeOnNextContentHeightUpdate = false;
        }, 500));
        this._disposables.add(this.content.onDidChangeContentHeight((height) => {
            if (!this.resizeOnNextContentHeightUpdate || !height) {
                return;
            }
            const displayed = this._getMaximumHeightInLines();
            if (displayed) {
                this._relayout(Math.min(displayed, this.getVisibleEditorLines() / 2), true);
                if (!contentHeightSettleTimer.isScheduled()) {
                    contentHeightSettleTimer.schedule();
                }
            }
        }));
        this._disposables.add(this.content.onDidRequestReveal((sub) => {
            TestingOutputPeekController.get(this.editor)?.show(sub instanceof MessageSubject ? sub.messageUri : sub.outputUri);
        }));
    }
    /**
     * Updates the test to be shown.
     */
    setModel(subject) {
        if (subject instanceof TaskSubject || subject instanceof TestOutputSubject) {
            this.current.set(subject, undefined);
            return this.showInPlace(subject);
        }
        const previous = this.current;
        const revealLocation = subject.revealLocation?.range.getStartPosition();
        if (!revealLocation && !previous) {
            return Promise.resolve();
        }
        this.current.set(subject, undefined);
        if (!revealLocation) {
            return this.showInPlace(subject);
        }
        this.resizeOnNextContentHeightUpdate = true;
        this.show(revealLocation, 10); // 10 is just a random number, we resize once content is available
        this.editor.revealRangeNearTopIfOutsideViewport(Range.fromPositions(revealLocation), 0 /* ScrollType.Smooth */);
        return this.showInPlace(subject);
    }
    /**
     * Collapses all displayed stack frames.
     */
    collapseStack() {
        this.content.collapseStack();
    }
    getVisibleEditorLines() {
        // note that we don't use the view ranges because we don't want to get
        // thrown off by large wrapping lines. Being approximate here is okay.
        return Math.round(this.editor.getDomNode().clientHeight / this.editor.getOption(68 /* EditorOption.lineHeight */));
    }
    /**
     * Shows a message in-place without showing or changing the peek location.
     * This is mostly used if peeking a message without a location.
     */
    async showInPlace(subject) {
        if (subject instanceof MessageSubject) {
            const message = subject.message;
            this.setTitle(firstLine(renderTestMessageAsText(message.message)), stripIcons(subject.test.label));
        }
        else {
            this.setTitle(localize('testOutputTitle', 'Test Output'));
        }
        this.applyTheme();
        await this.content.reveal({ subject, preserveFocus: false });
    }
    /** @override */
    _doLayoutBody(height, width) {
        super._doLayoutBody(height, width);
        this.content.onLayoutBody(height, width);
    }
    /** @override */
    _onWidth(width) {
        super._onWidth(width);
        if (this.dimension) {
            this.dimension = new dom.Dimension(width, this.dimension.height);
        }
        this.content.onWidth(width);
    }
};
TestResultsPeek = __decorate([
    __param(1, IThemeService),
    __param(2, IPeekViewService),
    __param(3, ITestingPeekOpener),
    __param(4, IContextKeyService),
    __param(5, IMenuService),
    __param(6, IInstantiationService),
    __param(7, ITextModelService),
    __param(8, ICodeEditorService),
    __param(9, IUriIdentityService)
], TestResultsPeek);
let TestResultsView = class TestResultsView extends ViewPane {
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, resultService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.resultService = resultService;
        this.content = new Lazy(() => this._register(this.instantiationService.createInstance(TestResultsViewContent, undefined, {
            historyVisible: staticObservableValue(true),
            showRevealLocationOnMessages: true,
            locationForProgress: "workbench.view.testing" /* Testing.ExplorerViewId */,
        })));
    }
    get subject() {
        return this.content.rawValue?.current;
    }
    showLatestRun(preserveFocus = false) {
        const result = this.resultService.results.find((r) => r.tasks.length);
        if (!result) {
            return;
        }
        this.content.rawValue?.reveal({ preserveFocus, subject: new TaskSubject(result, 0) });
    }
    renderBody(container) {
        super.renderBody(container);
        // Avoid rendering into the body until it's attached the DOM, as it can
        // result in rendering issues in the terminal (#194156)
        if (this.isBodyVisible()) {
            this.renderContent(container);
        }
        else {
            this._register(Event.once(Event.filter(this.onDidChangeBodyVisibility, Boolean))(() => this.renderContent(container)));
        }
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.content.rawValue?.onLayoutBody(height, width);
    }
    renderContent(container) {
        const content = this.content.value;
        content.fillBody(container);
        this._register(content.onDidRequestReveal((subject) => content.reveal({ preserveFocus: true, subject })));
        const [lastResult] = this.resultService.results;
        if (lastResult && lastResult.tasks.length) {
            content.reveal({ preserveFocus: true, subject: new TaskSubject(lastResult, 0) });
        }
    }
};
TestResultsView = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, ITestResultService)
], TestResultsView);
export { TestResultsView };
const firstLine = (str) => {
    const index = str.indexOf('\n');
    return index === -1 ? str : str.slice(0, index);
};
function getOuterEditorFromDiffEditor(codeEditorService) {
    const diffEditors = codeEditorService.listDiffEditors();
    for (const diffEditor of diffEditors) {
        if (diffEditor.hasTextFocus() && diffEditor instanceof EmbeddedDiffEditorWidget) {
            return diffEditor.getParentEditor();
        }
    }
    return null;
}
export class CloseTestPeek extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.closeTestPeek',
            title: localize2('close', 'Close'),
            icon: Codicon.close,
            precondition: ContextKeyExpr.or(TestingContextKeys.isInPeek, TestingContextKeys.isPeekVisible),
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ - 101,
                primary: 9 /* KeyCode.Escape */,
                when: ContextKeyExpr.not('config.editor.stablePeek'),
            },
        });
    }
    runEditorCommand(accessor, editor) {
        const parent = getPeekedEditorFromFocus(accessor.get(ICodeEditorService));
        TestingOutputPeekController.get(parent ?? editor)?.removePeek();
    }
}
const navWhen = ContextKeyExpr.and(EditorContextKeys.focus, TestingContextKeys.isPeekVisible);
/**
 * Gets the appropriate editor for peeking based on the currently focused editor.
 */
const getPeekedEditorFromFocus = (codeEditorService) => {
    const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
    return editor && getPeekedEditor(codeEditorService, editor);
};
/**
 * Gets the editor where the peek may be shown, bubbling upwards if the given
 * editor is embedded (i.e. inside a peek already).
 */
const getPeekedEditor = (codeEditorService, editor) => {
    if (TestingOutputPeekController.get(editor)?.subject.get()) {
        return editor;
    }
    if (editor instanceof EmbeddedCodeEditorWidget) {
        return editor.getParentEditor();
    }
    const outer = getOuterEditorFromDiffEditor(codeEditorService);
    if (outer) {
        return outer;
    }
    return editor;
};
export class GoToNextMessageAction extends Action2 {
    static { this.ID = 'testing.goToNextMessage'; }
    constructor() {
        super({
            id: GoToNextMessageAction.ID,
            f1: true,
            title: localize2('testing.goToNextMessage', 'Go to Next Test Failure'),
            metadata: {
                description: localize2('testing.goToNextMessage.description', 'Shows the next failure message in your file'),
            },
            icon: Codicon.arrowDown,
            category: Categories.Test,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                when: navWhen,
            },
            menu: [
                {
                    id: MenuId.TestPeekTitle,
                    group: 'navigation',
                    order: 2,
                },
                {
                    id: MenuId.CommandPalette,
                    when: navWhen,
                },
            ],
        });
    }
    run(accessor) {
        const editor = getPeekedEditorFromFocus(accessor.get(ICodeEditorService));
        if (editor) {
            TestingOutputPeekController.get(editor)?.next();
        }
    }
}
export class GoToPreviousMessageAction extends Action2 {
    static { this.ID = 'testing.goToPreviousMessage'; }
    constructor() {
        super({
            id: GoToPreviousMessageAction.ID,
            f1: true,
            title: localize2('testing.goToPreviousMessage', 'Go to Previous Test Failure'),
            metadata: {
                description: localize2('testing.goToPreviousMessage.description', 'Shows the previous failure message in your file'),
            },
            icon: Codicon.arrowUp,
            category: Categories.Test,
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                when: navWhen,
            },
            menu: [
                {
                    id: MenuId.TestPeekTitle,
                    group: 'navigation',
                    order: 1,
                },
                {
                    id: MenuId.CommandPalette,
                    when: navWhen,
                },
            ],
        });
    }
    run(accessor) {
        const editor = getPeekedEditorFromFocus(accessor.get(ICodeEditorService));
        if (editor) {
            TestingOutputPeekController.get(editor)?.previous();
        }
    }
}
export class CollapsePeekStack extends Action2 {
    static { this.ID = 'testing.collapsePeekStack'; }
    constructor() {
        super({
            id: CollapsePeekStack.ID,
            title: localize2('testing.collapsePeekStack', 'Collapse Stack Frames'),
            icon: Codicon.collapseAll,
            category: Categories.Test,
            menu: [
                {
                    id: MenuId.TestPeekTitle,
                    when: TestingContextKeys.peekHasStack,
                    group: 'navigation',
                    order: 4,
                },
            ],
        });
    }
    run(accessor) {
        const editor = getPeekedEditorFromFocus(accessor.get(ICodeEditorService));
        if (editor) {
            TestingOutputPeekController.get(editor)?.collapseStack();
        }
    }
}
export class OpenMessageInEditorAction extends Action2 {
    static { this.ID = 'testing.openMessageInEditor'; }
    constructor() {
        super({
            id: OpenMessageInEditorAction.ID,
            f1: false,
            title: localize2('testing.openMessageInEditor', 'Open in Editor'),
            icon: Codicon.goToFile,
            category: Categories.Test,
            menu: [{ id: MenuId.TestPeekTitle }],
        });
    }
    run(accessor) {
        accessor.get(ITestingPeekOpener).openCurrentInEditor();
    }
}
export class ToggleTestingPeekHistory extends Action2 {
    static { this.ID = 'testing.toggleTestingPeekHistory'; }
    constructor() {
        super({
            id: ToggleTestingPeekHistory.ID,
            f1: true,
            title: localize2('testing.toggleTestingPeekHistory', 'Toggle Test History in Peek'),
            metadata: {
                description: localize2('testing.toggleTestingPeekHistory.description', 'Shows or hides the history of test runs in the peek view'),
            },
            icon: Codicon.history,
            category: Categories.Test,
            menu: [
                {
                    id: MenuId.TestPeekTitle,
                    group: 'navigation',
                    order: 3,
                },
            ],
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 512 /* KeyMod.Alt */ | 38 /* KeyCode.KeyH */,
                when: TestingContextKeys.isPeekVisible.isEqualTo(true),
            },
        });
    }
    run(accessor) {
        const opener = accessor.get(ITestingPeekOpener);
        opener.historyVisible.value = !opener.historyVisible.value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ091dHB1dFBlZWsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdGluZ091dHB1dFBlZWsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFOUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sT0FBTyxFQUNQLHlCQUF5QixFQUN6QixlQUFlLEdBQ2YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBQ25ILE9B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
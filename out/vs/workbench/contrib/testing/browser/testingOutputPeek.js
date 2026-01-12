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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ091dHB1dFBlZWsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0aW5nT3V0cHV0UGVlay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixPQUFPLEVBQ1AseUJBQXlCLEVBQ3pCLGVBQWUsR0FDZixNQUFNLHVDQUF1QyxDQUFBO0FBRTlDLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFD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
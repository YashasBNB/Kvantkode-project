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
var TestingDecorations_1, TestMessageDecoration_1;
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { renderStringAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { Action, Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { equals } from '../../../../base/common/arrays.js';
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { clamp } from '../../../../base/common/numbers.js';
import { autorun } from '../../../../base/common/observable.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { count, truncateMiddle } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { overviewRulerError, overviewRulerInfo, } from '../../../../editor/common/core/editorColorRegistry.js';
import { Position } from '../../../../editor/common/core/position.js';
import { GlyphMarginLane, OverviewRulerLane, } from '../../../../editor/common/model.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { localize } from '../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditorLineNumberContextMenu, GutterActionsRegistry, } from '../../codeEditor/browser/editorLineNumberMenu.js';
import { getTestingConfiguration, } from '../common/configuration.js';
import { labelForTestInState } from '../common/constants.js';
import { TestId } from '../common/testId.js';
import { ITestProfileService } from '../common/testProfileService.js';
import { LiveTestResult } from '../common/testResult.js';
import { ITestResultService } from '../common/testResultService.js';
import { ITestService, getContextForTestItem, simplifyTestsToExecute, testsInFile, } from '../common/testService.js';
import { ITestingDecorationsService, TestDecorations, } from '../common/testingDecorations.js';
import { ITestingPeekOpener } from '../common/testingPeekOpener.js';
import { isFailedState, maxPriority } from '../common/testingStates.js';
import { buildTestUri, parseTestUri } from '../common/testingUri.js';
import { getTestItemContextOverlay } from './explorerProjections/testItemContextOverlay.js';
import { testingDebugAllIcon, testingDebugIcon, testingRunAllIcon, testingRunIcon, testingStatesToIcons, } from './icons.js';
import { renderTestMessageAsText } from './testMessageColorizer.js';
import { MessageSubject } from './testResultsView/testResultsSubject.js';
import { TestingOutputPeekController } from './testingOutputPeek.js';
const MAX_INLINE_MESSAGE_LENGTH = 128;
const MAX_TESTS_IN_SUBMENU = 30;
const GLYPH_MARGIN_LANE = GlyphMarginLane.Center;
function isOriginalInDiffEditor(codeEditorService, codeEditor) {
    const diffEditors = codeEditorService.listDiffEditors();
    for (const diffEditor of diffEditors) {
        if (diffEditor.getOriginalEditor() === codeEditor) {
            return true;
        }
    }
    return false;
}
/** Value for saved decorations, providing fast accessors for the hot 'syncDecorations' path */
class CachedDecorations {
    constructor() {
        this.runByIdKey = new Map();
    }
    get size() {
        return this.runByIdKey.size;
    }
    /** Gets a test run decoration that contains exactly the given test IDs */
    getForExactTests(testIds) {
        const key = testIds.sort().join('\0\0');
        return this.runByIdKey.get(key);
    }
    /** Adds a new test run decroation */
    addTest(d) {
        const key = d.testIds.sort().join('\0\0');
        this.runByIdKey.set(key, d);
    }
    /** Finds an extension by VS Code event ID */
    getById(decorationId) {
        for (const d of this.runByIdKey.values()) {
            if (d.id === decorationId) {
                return d;
            }
        }
        return undefined;
    }
    /** Iterate over all decorations */
    *[Symbol.iterator]() {
        for (const d of this.runByIdKey.values()) {
            yield d;
        }
    }
}
let TestingDecorationService = class TestingDecorationService extends Disposable {
    constructor(codeEditorService, configurationService, testService, results, instantiationService, modelService) {
        super();
        this.configurationService = configurationService;
        this.testService = testService;
        this.results = results;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.generation = 0;
        this.changeEmitter = new Emitter();
        this.decorationCache = new ResourceMap();
        /**
         * List of messages that should be hidden because an editor changed their
         * underlying ranges. I think this is good enough, because:
         *  - Message decorations are never shown across reloads; this does not
         *    need to persist
         *  - Message instances are stable for any completed test results for
         *    the duration of the session.
         */
        this.invalidatedMessages = new WeakSet();
        /** @inheritdoc */
        this.onDidChange = this.changeEmitter.event;
        codeEditorService.registerDecorationType('test-message-decoration', TestMessageDecoration.decorationId, {}, undefined);
        this._register(modelService.onModelRemoved((e) => this.decorationCache.delete(e.uri)));
        const debounceInvalidate = this._register(new RunOnceScheduler(() => this.invalidate(), 100));
        // If ranges were updated in the document, mark that we should explicitly
        // sync decorations to the published lines, since we assume that everything
        // is up to date. This prevents issues, as in #138632, #138835, #138922.
        this._register(this.testService.onWillProcessDiff((diff) => {
            for (const entry of diff) {
                if (entry.op !== 2 /* TestDiffOpType.DocumentSynced */) {
                    continue;
                }
                const rec = this.decorationCache.get(entry.uri);
                if (rec) {
                    rec.rangeUpdateVersionId = entry.docv;
                }
            }
            if (!debounceInvalidate.isScheduled()) {
                debounceInvalidate.schedule();
            }
        }));
        this._register(Event.any(this.results.onResultsChanged, this.results.onTestChanged, this.testService.excluded.onTestExclusionsChanged, Event.filter(configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration("testing.gutterEnabled" /* TestingConfigKeys.GutterEnabled */)))(() => {
            if (!debounceInvalidate.isScheduled()) {
                debounceInvalidate.schedule();
            }
        }));
        this._register(GutterActionsRegistry.registerGutterActionsGenerator((context, result) => {
            const model = context.editor.getModel();
            const testingDecorations = TestingDecorations.get(context.editor);
            if (!model || !testingDecorations?.currentUri) {
                return;
            }
            const currentDecorations = this.syncDecorations(testingDecorations.currentUri);
            if (!currentDecorations.size) {
                return;
            }
            const modelDecorations = model.getLinesDecorations(context.lineNumber, context.lineNumber);
            for (const { id } of modelDecorations) {
                const decoration = currentDecorations.getById(id);
                if (decoration) {
                    const { object: actions } = decoration.getContextMenuActions();
                    for (const action of actions) {
                        result.push(action, '1_testing');
                    }
                }
            }
        }));
    }
    /** @inheritdoc */
    invalidateResultMessage(message) {
        this.invalidatedMessages.add(message);
        this.invalidate();
    }
    /** @inheritdoc */
    syncDecorations(resource) {
        const model = this.modelService.getModel(resource);
        if (!model) {
            return new CachedDecorations();
        }
        const cached = this.decorationCache.get(resource);
        if (cached &&
            cached.generation === this.generation &&
            (cached.rangeUpdateVersionId === undefined ||
                cached.rangeUpdateVersionId !== model.getVersionId())) {
            return cached.value;
        }
        return this.applyDecorations(model);
    }
    /** @inheritdoc */
    getDecoratedTestPosition(resource, testId) {
        const model = this.modelService.getModel(resource);
        if (!model) {
            return undefined;
        }
        const decoration = Iterable.find(this.syncDecorations(resource), (v) => v instanceof RunTestDecoration && v.isForTest(testId));
        if (!decoration) {
            return undefined;
        }
        // decoration is collapsed, so the range is meaningless; only position matters.
        return model.getDecorationRange(decoration.id)?.getStartPosition();
    }
    invalidate() {
        this.generation++;
        this.changeEmitter.fire();
    }
    /**
     * Sets whether alternate actions are shown for the model.
     */
    updateDecorationsAlternateAction(resource, isAlt) {
        const model = this.modelService.getModel(resource);
        const cached = this.decorationCache.get(resource);
        if (!model || !cached || cached.isAlt === isAlt) {
            return;
        }
        cached.isAlt = isAlt;
        model.changeDecorations((accessor) => {
            for (const decoration of cached.value) {
                if (decoration instanceof RunTestDecoration && decoration.editorDecoration.alternate) {
                    accessor.changeDecorationOptions(decoration.id, isAlt ? decoration.editorDecoration.alternate : decoration.editorDecoration.options);
                }
            }
        });
    }
    /**
     * Applies the current set of test decorations to the given text model.
     */
    applyDecorations(model) {
        const gutterEnabled = getTestingConfiguration(this.configurationService, "testing.gutterEnabled" /* TestingConfigKeys.GutterEnabled */);
        const cached = this.decorationCache.get(model.uri);
        const testRangesUpdated = cached?.rangeUpdateVersionId === model.getVersionId();
        const lastDecorations = cached?.value ?? new CachedDecorations();
        const newDecorations = model.changeDecorations((accessor) => {
            const newDecorations = new CachedDecorations();
            const runDecorations = new TestDecorations();
            for (const test of this.testService.collection.getNodeByUrl(model.uri)) {
                if (!test.item.range) {
                    continue;
                }
                const stateLookup = this.results.getStateById(test.item.extId);
                const line = test.item.range.startLineNumber;
                runDecorations.push({ line, id: '', test, resultItem: stateLookup?.[1] });
            }
            for (const [line, tests] of runDecorations.lines()) {
                const multi = tests.length > 1;
                let existing = lastDecorations.getForExactTests(tests.map((t) => t.test.item.extId));
                // see comment in the constructor for what's going on here
                if (existing &&
                    testRangesUpdated &&
                    model.getDecorationRange(existing.id)?.startLineNumber !== line) {
                    existing = undefined;
                }
                if (existing) {
                    if (existing.replaceOptions(tests, gutterEnabled)) {
                        accessor.changeDecorationOptions(existing.id, existing.editorDecoration.options);
                    }
                    newDecorations.addTest(existing);
                }
                else {
                    newDecorations.addTest(multi
                        ? this.instantiationService.createInstance(MultiRunTestDecoration, tests, gutterEnabled, model)
                        : this.instantiationService.createInstance(RunSingleTestDecoration, tests[0].test, tests[0].resultItem, model, gutterEnabled));
                }
            }
            const saveFromRemoval = new Set();
            for (const decoration of newDecorations) {
                if (decoration.id === '') {
                    decoration.id = accessor.addDecoration(decoration.editorDecoration.range, decoration.editorDecoration.options);
                }
                else {
                    saveFromRemoval.add(decoration.id);
                }
            }
            for (const decoration of lastDecorations) {
                if (!saveFromRemoval.has(decoration.id)) {
                    accessor.removeDecoration(decoration.id);
                }
            }
            this.decorationCache.set(model.uri, {
                generation: this.generation,
                rangeUpdateVersionId: cached?.rangeUpdateVersionId,
                value: newDecorations,
            });
            return newDecorations;
        });
        return newDecorations || lastDecorations;
    }
};
TestingDecorationService = __decorate([
    __param(0, ICodeEditorService),
    __param(1, IConfigurationService),
    __param(2, ITestService),
    __param(3, ITestResultService),
    __param(4, IInstantiationService),
    __param(5, IModelService)
], TestingDecorationService);
export { TestingDecorationService };
let TestingDecorations = class TestingDecorations extends Disposable {
    static { TestingDecorations_1 = this; }
    /**
     * Results invalidated by editor changes.
     */
    static { this.invalidatedTests = new WeakSet(); }
    /**
     * Gets the decorations associated with the given code editor.
     */
    static get(editor) {
        return editor.getContribution("editor.contrib.testingDecorations" /* Testing.DecorationsContributionId */);
    }
    get currentUri() {
        return this._currentUri;
    }
    constructor(editor, codeEditorService, testService, decorations, uriIdentityService, results, configurationService, instantiationService) {
        super();
        this.editor = editor;
        this.codeEditorService = codeEditorService;
        this.testService = testService;
        this.decorations = decorations;
        this.uriIdentityService = uriIdentityService;
        this.results = results;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.expectedWidget = this._register(new MutableDisposable());
        this.actualWidget = this._register(new MutableDisposable());
        this.errorContentWidgets = this._register(new DisposableMap());
        this.loggedMessageDecorations = new Map();
        codeEditorService.registerDecorationType('test-message-decoration', TestMessageDecoration.decorationId, {}, undefined, editor);
        this.attachModel(editor.getModel()?.uri);
        this._register(decorations.onDidChange(() => {
            if (this._currentUri) {
                decorations.syncDecorations(this._currentUri);
            }
        }));
        this._register(Event.any(this.results.onResultsChanged, editor.onDidChangeModel, Event.filter(this.results.onTestChanged, (c) => c.reason === 2 /* TestResultItemChangeReason.NewMessage */), this.testService.showInlineOutput.onDidChange)(() => this.applyResults()));
        const win = dom.getWindow(editor.getDomNode());
        this._register(dom.addDisposableListener(win, 'keydown', (e) => {
            if (new StandardKeyboardEvent(e).keyCode === 6 /* KeyCode.Alt */ && this._currentUri) {
                decorations.updateDecorationsAlternateAction(this._currentUri, true);
            }
        }));
        this._register(dom.addDisposableListener(win, 'keyup', (e) => {
            if (new StandardKeyboardEvent(e).keyCode === 6 /* KeyCode.Alt */ && this._currentUri) {
                decorations.updateDecorationsAlternateAction(this._currentUri, false);
            }
        }));
        this._register(dom.addDisposableListener(win, 'blur', () => {
            if (this._currentUri) {
                decorations.updateDecorationsAlternateAction(this._currentUri, false);
            }
        }));
        this._register(this.editor.onKeyUp((e) => {
            if (e.keyCode === 6 /* KeyCode.Alt */ && this._currentUri) {
                decorations.updateDecorationsAlternateAction(this._currentUri, false);
            }
        }));
        this._register(this.editor.onDidChangeModel((e) => this.attachModel(e.newModelUrl || undefined)));
        this._register(this.editor.onMouseDown((e) => {
            if (e.target.position && this.currentUri) {
                const modelDecorations = editor.getModel()?.getLineDecorations(e.target.position.lineNumber) ?? [];
                if (!modelDecorations.length) {
                    return;
                }
                const cache = decorations.syncDecorations(this.currentUri);
                for (const { id } of modelDecorations) {
                    if (cache.getById(id)?.click(e)) {
                        e.event.stopPropagation();
                        return;
                    }
                }
            }
        }));
        this._register(Event.accumulate(this.editor.onDidChangeModelContent, 0, this._store)((evts) => {
            const model = editor.getModel();
            if (!this._currentUri || !model) {
                return;
            }
            let changed = false;
            for (const [message, deco] of this.loggedMessageDecorations) {
                // invalidate decorations if either the line they're on was changed,
                // or if the range of the test was changed. The range of the test is
                // not always present, so check bo.
                const invalidate = evts.some((e) => e.changes.some((c) => (c.range.startLineNumber <= deco.line && c.range.endLineNumber >= deco.line) ||
                    (deco.resultItem?.item.range &&
                        deco.resultItem.item.range.startLineNumber <= c.range.startLineNumber &&
                        deco.resultItem.item.range.endLineNumber >= c.range.endLineNumber)));
                if (invalidate) {
                    changed = true;
                    TestingDecorations_1.invalidatedTests.add(deco.resultItem || message);
                }
            }
            if (changed) {
                this.applyResults();
            }
        }));
        const updateFontFamilyVar = () => {
            this.editor
                .getContainerDomNode()
                .style.setProperty('--testMessageDecorationFontFamily', editor.getOption(51 /* EditorOption.fontFamily */));
            this.editor
                .getContainerDomNode()
                .style.setProperty('--testMessageDecorationFontSize', `${editor.getOption(54 /* EditorOption.fontSize */)}px`);
        };
        this._register(this.editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(51 /* EditorOption.fontFamily */)) {
                updateFontFamilyVar();
            }
        }));
        updateFontFamilyVar();
    }
    attachModel(uri) {
        switch (uri && parseTestUri(uri)?.type) {
            case 4 /* TestUriType.ResultExpectedOutput */:
                this.expectedWidget.value = new ExpectedLensContentWidget(this.editor);
                this.actualWidget.clear();
                break;
            case 3 /* TestUriType.ResultActualOutput */:
                this.expectedWidget.clear();
                this.actualWidget.value = new ActualLensContentWidget(this.editor);
                break;
            default:
                this.expectedWidget.clear();
                this.actualWidget.clear();
        }
        if (isOriginalInDiffEditor(this.codeEditorService, this.editor)) {
            uri = undefined;
        }
        this._currentUri = uri;
        if (!uri) {
            return;
        }
        this.decorations.syncDecorations(uri);
        (async () => {
            for await (const _test of testsInFile(this.testService, this.uriIdentityService, uri, false)) {
                // consume the iterator so that all tests in the file get expanded. Or
                // at least until the URI changes. If new items are requested, changes
                // will be trigged in the `onDidProcessDiff` callback.
                if (this._currentUri !== uri) {
                    break;
                }
            }
        })();
    }
    applyResults() {
        const model = this.editor.getModel();
        if (!model) {
            return this.clearResults();
        }
        const uriStr = model.uri.toString();
        const seenLines = new Set();
        this.applyResultsContentWidgets(uriStr, seenLines);
        this.applyResultsLoggedMessages(uriStr, seenLines);
    }
    clearResults() {
        this.errorContentWidgets.clearAndDisposeAll();
    }
    isMessageInvalidated(message) {
        return TestingDecorations_1.invalidatedTests.has(message);
    }
    applyResultsContentWidgets(uriStr, seenLines) {
        const seen = new Set();
        if (getTestingConfiguration(this.configurationService, "testing.showAllMessages" /* TestingConfigKeys.ShowAllMessages */)) {
            this.results.results.forEach((lastResult) => this.applyContentWidgetsFromResult(lastResult, uriStr, seen, seenLines));
        }
        else if (this.results.results.length) {
            this.applyContentWidgetsFromResult(this.results.results[0], uriStr, seen, seenLines);
        }
        for (const message of this.errorContentWidgets.keys()) {
            if (!seen.has(message)) {
                this.errorContentWidgets.deleteAndDispose(message);
            }
        }
    }
    applyContentWidgetsFromResult(lastResult, uriStr, seen, seenLines) {
        for (const test of lastResult.tests) {
            if (TestingDecorations_1.invalidatedTests.has(test)) {
                continue;
            }
            for (let taskId = 0; taskId < test.tasks.length; taskId++) {
                const state = test.tasks[taskId];
                // push error decorations first so they take precedence over normal output
                for (let i = 0; i < state.messages.length; i++) {
                    const m = state.messages[i];
                    if (m.type !== 0 /* TestMessageType.Error */ || this.isMessageInvalidated(m)) {
                        continue;
                    }
                    const line = m.location?.uri.toString() === uriStr
                        ? m.location.range.startLineNumber
                        : m.stackTrace &&
                            mapFindFirst(m.stackTrace, (f) => f.position && f.uri?.toString() === uriStr ? f.position.lineNumber : undefined);
                    if (line === undefined || seenLines.has(line)) {
                        continue;
                    }
                    seenLines.add(line);
                    let deco = this.errorContentWidgets.get(m);
                    if (!deco) {
                        const lineLength = this.editor.getModel()?.getLineLength(line) ?? 100;
                        deco = this.instantiationService.createInstance(TestErrorContentWidget, this.editor, new Position(line, lineLength + 1), m, test, buildTestUri({
                            type: 3 /* TestUriType.ResultActualOutput */,
                            messageIndex: i,
                            taskIndex: taskId,
                            resultId: lastResult.id,
                            testExtId: test.item.extId,
                        }));
                        this.errorContentWidgets.set(m, deco);
                    }
                    seen.add(m);
                }
            }
        }
    }
    applyResultsLoggedMessages(uriStr, messageLines) {
        this.editor.changeDecorations((accessor) => {
            const seen = new Set();
            if (getTestingConfiguration(this.configurationService, "testing.showAllMessages" /* TestingConfigKeys.ShowAllMessages */)) {
                this.results.results.forEach((r) => this.applyLoggedMessageFromResult(r, uriStr, seen, messageLines, accessor));
            }
            else if (this.results.results.length) {
                this.applyLoggedMessageFromResult(this.results.results[0], uriStr, seen, messageLines, accessor);
            }
            for (const [message, { id }] of this.loggedMessageDecorations) {
                if (!seen.has(message)) {
                    accessor.removeDecoration(id);
                }
            }
        });
    }
    applyLoggedMessageFromResult(lastResult, uriStr, seen, messageLines, accessor) {
        if (!this.testService.showInlineOutput.value || !(lastResult instanceof LiveTestResult)) {
            return;
        }
        const tryAdd = (resultItem, m, uri) => {
            if (this.isMessageInvalidated(m) || m.location?.uri.toString() !== uriStr) {
                return;
            }
            seen.add(m);
            const line = m.location.range.startLineNumber;
            if (messageLines.has(line) || this.loggedMessageDecorations.has(m)) {
                return;
            }
            const deco = this.instantiationService.createInstance(TestMessageDecoration, m, uri, this.editor.getModel());
            messageLines.add(line);
            const id = accessor.addDecoration(deco.editorDecoration.range, deco.editorDecoration.options);
            this.loggedMessageDecorations.set(m, { id, line, resultItem });
        };
        for (const test of lastResult.tests) {
            if (TestingDecorations_1.invalidatedTests.has(test)) {
                continue;
            }
            for (let taskId = 0; taskId < test.tasks.length; taskId++) {
                const state = test.tasks[taskId];
                for (let i = state.messages.length - 1; i >= 0; i--) {
                    const m = state.messages[i];
                    if (m.type === 1 /* TestMessageType.Output */) {
                        tryAdd(test, m, buildTestUri({
                            type: 3 /* TestUriType.ResultActualOutput */,
                            messageIndex: i,
                            taskIndex: taskId,
                            resultId: lastResult.id,
                            testExtId: test.item.extId,
                        }));
                    }
                }
            }
        }
        for (const task of lastResult.tasks) {
            for (const m of task.otherMessages) {
                tryAdd(undefined, m);
            }
        }
    }
};
TestingDecorations = TestingDecorations_1 = __decorate([
    __param(1, ICodeEditorService),
    __param(2, ITestService),
    __param(3, ITestingDecorationsService),
    __param(4, IUriIdentityService),
    __param(5, ITestResultService),
    __param(6, IConfigurationService),
    __param(7, IInstantiationService)
], TestingDecorations);
export { TestingDecorations };
const collapseRange = (originalRange) => ({
    startLineNumber: originalRange.startLineNumber,
    endLineNumber: originalRange.startLineNumber,
    startColumn: originalRange.startColumn,
    endColumn: originalRange.startColumn,
});
const createRunTestDecoration = (tests, states, visible, defaultGutterAction) => {
    const range = tests[0]?.item.range;
    if (!range) {
        throw new Error('Test decorations can only be created for tests with a range');
    }
    if (!visible) {
        return {
            range: collapseRange(range),
            options: { isWholeLine: true, description: 'run-test-decoration' },
        };
    }
    let computedState = 0 /* TestResultState.Unset */;
    const hoverMessageParts = [];
    let testIdWithMessages;
    let retired = false;
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const resultItem = states[i];
        const state = resultItem?.computedState ?? 0 /* TestResultState.Unset */;
        if (hoverMessageParts.length < 10) {
            hoverMessageParts.push(labelForTestInState(test.item.label, state));
        }
        computedState = maxPriority(computedState, state);
        retired = retired || !!resultItem?.retired;
        if (!testIdWithMessages && resultItem?.tasks.some((t) => t.messages.length)) {
            testIdWithMessages = test.item.extId;
        }
    }
    const hasMultipleTests = tests.length > 1 || tests[0].children.size > 0;
    const primaryIcon = computedState === 0 /* TestResultState.Unset */
        ? hasMultipleTests
            ? testingRunAllIcon
            : testingRunIcon
        : testingStatesToIcons.get(computedState);
    const alternateIcon = defaultGutterAction === "debug" /* DefaultGutterClickAction.Debug */
        ? hasMultipleTests
            ? testingRunAllIcon
            : testingRunIcon
        : hasMultipleTests
            ? testingDebugAllIcon
            : testingDebugIcon;
    let hoverMessage;
    let glyphMarginClassName = 'testing-run-glyph';
    if (retired) {
        glyphMarginClassName += ' retired';
    }
    const defaultOptions = {
        description: 'run-test-decoration',
        showIfCollapsed: true,
        get hoverMessage() {
            if (!hoverMessage) {
                const building = (hoverMessage = new MarkdownString('', true).appendText(hoverMessageParts.join(', ') + '.'));
                if (testIdWithMessages) {
                    const args = encodeURIComponent(JSON.stringify([testIdWithMessages]));
                    building.appendMarkdown(` [${localize('peekTestOutout', 'Peek Test Output')}](command:vscode.peekTestError?${args})`);
                }
            }
            return hoverMessage;
        },
        glyphMargin: { position: GLYPH_MARGIN_LANE },
        glyphMarginClassName: `${ThemeIcon.asClassName(primaryIcon)} ${glyphMarginClassName}`,
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        zIndex: 10000,
    };
    const alternateOptions = {
        ...defaultOptions,
        glyphMarginClassName: `${ThemeIcon.asClassName(alternateIcon)} ${glyphMarginClassName}`,
    };
    return {
        range: collapseRange(range),
        options: defaultOptions,
        alternate: alternateOptions,
    };
};
var LensContentWidgetVars;
(function (LensContentWidgetVars) {
    LensContentWidgetVars["FontFamily"] = "testingDiffLensFontFamily";
    LensContentWidgetVars["FontFeatures"] = "testingDiffLensFontFeatures";
})(LensContentWidgetVars || (LensContentWidgetVars = {}));
class TitleLensContentWidget {
    constructor(editor) {
        this.editor = editor;
        /** @inheritdoc */
        this.allowEditorOverflow = false;
        /** @inheritdoc */
        this.suppressMouseDown = true;
        this._domNode = dom.$('span');
        queueMicrotask(() => {
            this.applyStyling();
            this.editor.addContentWidget(this);
        });
    }
    applyStyling() {
        let fontSize = this.editor.getOption(19 /* EditorOption.codeLensFontSize */);
        let height;
        if (!fontSize || fontSize < 5) {
            fontSize = (this.editor.getOption(54 /* EditorOption.fontSize */) * 0.9) | 0;
            height = this.editor.getOption(68 /* EditorOption.lineHeight */);
        }
        else {
            height =
                (fontSize *
                    Math.max(1.3, this.editor.getOption(68 /* EditorOption.lineHeight */) /
                        this.editor.getOption(54 /* EditorOption.fontSize */))) |
                    0;
        }
        const editorFontInfo = this.editor.getOption(52 /* EditorOption.fontInfo */);
        const node = this._domNode;
        node.classList.add('testing-diff-lens-widget');
        node.textContent = this.getText();
        node.style.lineHeight = `${height}px`;
        node.style.fontSize = `${fontSize}px`;
        node.style.fontFamily = `var(--${"testingDiffLensFontFamily" /* LensContentWidgetVars.FontFamily */})`;
        node.style.fontFeatureSettings = `var(--${"testingDiffLensFontFeatures" /* LensContentWidgetVars.FontFeatures */})`;
        const containerStyle = this.editor.getContainerDomNode().style;
        containerStyle.setProperty("testingDiffLensFontFamily" /* LensContentWidgetVars.FontFamily */, this.editor.getOption(18 /* EditorOption.codeLensFontFamily */) ?? 'inherit');
        containerStyle.setProperty("testingDiffLensFontFeatures" /* LensContentWidgetVars.FontFeatures */, editorFontInfo.fontFeatureSettings);
        this.editor.changeViewZones((accessor) => {
            if (this.viewZoneId) {
                accessor.removeZone(this.viewZoneId);
            }
            this.viewZoneId = accessor.addZone({
                afterLineNumber: 0,
                afterColumn: 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */,
                domNode: document.createElement('div'),
                heightInPx: 20,
            });
        });
    }
    /** @inheritdoc */
    getDomNode() {
        return this._domNode;
    }
    /** @inheritdoc */
    dispose() {
        this.editor.changeViewZones((accessor) => {
            if (this.viewZoneId) {
                accessor.removeZone(this.viewZoneId);
            }
        });
        this.editor.removeContentWidget(this);
    }
    /** @inheritdoc */
    getPosition() {
        return {
            position: { column: 0, lineNumber: 0 },
            preference: [1 /* ContentWidgetPositionPreference.ABOVE */],
        };
    }
}
class ExpectedLensContentWidget extends TitleLensContentWidget {
    getId() {
        return 'expectedTestingLens';
    }
    getText() {
        return localize('expected.title', 'Expected');
    }
}
class ActualLensContentWidget extends TitleLensContentWidget {
    getId() {
        return 'actualTestingLens';
    }
    getText() {
        return localize('actual.title', 'Actual');
    }
}
let RunTestDecoration = class RunTestDecoration {
    get line() {
        return this.editorDecoration.range.startLineNumber;
    }
    get testIds() {
        return this.tests.map((t) => t.test.item.extId);
    }
    constructor(tests, visible, model, codeEditorService, testService, contextMenuService, commandService, configurationService, testProfileService, contextKeyService, menuService) {
        this.tests = tests;
        this.visible = visible;
        this.model = model;
        this.codeEditorService = codeEditorService;
        this.testService = testService;
        this.contextMenuService = contextMenuService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.testProfileService = testProfileService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        /** @inheritdoc */
        this.id = '';
        this.displayedStates = tests.map((t) => t.resultItem?.computedState);
        this.editorDecoration = createRunTestDecoration(tests.map((t) => t.test), tests.map((t) => t.resultItem), visible, getTestingConfiguration(this.configurationService, "testing.defaultGutterClickAction" /* TestingConfigKeys.DefaultGutterClickAction */));
        this.editorDecoration.options.glyphMarginHoverMessage = new MarkdownString().appendText(this.getGutterLabel());
    }
    /** @inheritdoc */
    click(e) {
        if (e.target.type !== 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */ ||
            e.target.detail.glyphMarginLane !== GLYPH_MARGIN_LANE ||
            // handled by editor gutter context menu
            e.event.rightButton ||
            (isMacintosh && e.event.leftButton && e.event.ctrlKey)) {
            return false;
        }
        const alternateAction = e.event.altKey;
        switch (getTestingConfiguration(this.configurationService, "testing.defaultGutterClickAction" /* TestingConfigKeys.DefaultGutterClickAction */)) {
            case "contextMenu" /* DefaultGutterClickAction.ContextMenu */:
                this.showContextMenu(e);
                break;
            case "debug" /* DefaultGutterClickAction.Debug */:
                this.runWith(alternateAction ? 2 /* TestRunProfileBitset.Run */ : 4 /* TestRunProfileBitset.Debug */);
                break;
            case "runWithCoverage" /* DefaultGutterClickAction.Coverage */:
                this.runWith(alternateAction ? 4 /* TestRunProfileBitset.Debug */ : 8 /* TestRunProfileBitset.Coverage */);
                break;
            case "run" /* DefaultGutterClickAction.Run */:
            default:
                this.runWith(alternateAction ? 4 /* TestRunProfileBitset.Debug */ : 2 /* TestRunProfileBitset.Run */);
                break;
        }
        return true;
    }
    /**
     * Updates the decoration to match the new set of tests.
     * @returns true if options were changed, false otherwise
     */
    replaceOptions(newTests, visible) {
        const displayedStates = newTests.map((t) => t.resultItem?.computedState);
        if (visible === this.visible && equals(this.displayedStates, displayedStates)) {
            return false;
        }
        this.tests = newTests;
        this.displayedStates = displayedStates;
        this.visible = visible;
        const { options, alternate } = createRunTestDecoration(newTests.map((t) => t.test), newTests.map((t) => t.resultItem), visible, getTestingConfiguration(this.configurationService, "testing.defaultGutterClickAction" /* TestingConfigKeys.DefaultGutterClickAction */));
        this.editorDecoration.options = options;
        this.editorDecoration.alternate = alternate;
        this.editorDecoration.options.glyphMarginHoverMessage = new MarkdownString().appendText(this.getGutterLabel());
        return true;
    }
    /**
     * Gets whether this decoration serves as the run button for the given test ID.
     */
    isForTest(testId) {
        return this.tests.some((t) => t.test.item.extId === testId);
    }
    runWith(profile) {
        return this.testService.runTests({
            tests: simplifyTestsToExecute(this.testService.collection, this.tests.map(({ test }) => test)),
            group: profile,
        });
    }
    showContextMenu(e) {
        const editor = this.codeEditorService.listCodeEditors().find((e) => e.getModel() === this.model);
        editor?.getContribution(EditorLineNumberContextMenu.ID)?.show(e);
    }
    getGutterLabel() {
        switch (getTestingConfiguration(this.configurationService, "testing.defaultGutterClickAction" /* TestingConfigKeys.DefaultGutterClickAction */)) {
            case "contextMenu" /* DefaultGutterClickAction.ContextMenu */:
                return localize('testing.gutterMsg.contextMenu', 'Click for test options');
            case "debug" /* DefaultGutterClickAction.Debug */:
                return localize('testing.gutterMsg.debug', 'Click to debug tests, right click for more options');
            case "runWithCoverage" /* DefaultGutterClickAction.Coverage */:
                return localize('testing.gutterMsg.coverage', 'Click to run tests with coverage, right click for more options');
            case "run" /* DefaultGutterClickAction.Run */:
            default:
                return localize('testing.gutterMsg.run', 'Click to run tests, right click for more options');
        }
    }
    /**
     * Gets context menu actions relevant for a singel test.
     */
    getTestContextMenuActions(test, resultItem) {
        const testActions = [];
        const capabilities = this.testProfileService.capabilitiesForTest(test.item);
        [
            { bitset: 2 /* TestRunProfileBitset.Run */, label: localize('run test', 'Run Test') },
            { bitset: 4 /* TestRunProfileBitset.Debug */, label: localize('debug test', 'Debug Test') },
            {
                bitset: 8 /* TestRunProfileBitset.Coverage */,
                label: localize('coverage test', 'Run with Coverage'),
            },
        ].forEach(({ bitset, label }) => {
            if (capabilities & bitset) {
                testActions.push(new Action(`testing.gutter.${bitset}`, label, undefined, undefined, () => this.testService.runTests({ group: bitset, tests: [test] })));
            }
        });
        if (capabilities & 16 /* TestRunProfileBitset.HasNonDefaultProfile */) {
            testActions.push(new Action('testing.runUsing', localize('testing.runUsing', 'Execute Using Profile...'), undefined, undefined, async () => {
                const profile = await this.commandService.executeCommand('vscode.pickTestProfile', { onlyForTest: test });
                if (!profile) {
                    return;
                }
                this.testService.runResolvedTests({
                    group: profile.group,
                    targets: [
                        {
                            profileId: profile.profileId,
                            controllerId: profile.controllerId,
                            testIds: [test.item.extId],
                        },
                    ],
                });
            }));
        }
        if (resultItem && isFailedState(resultItem.computedState)) {
            testActions.push(new Action('testing.gutter.peekFailure', localize('peek failure', 'Peek Error'), undefined, undefined, () => this.commandService.executeCommand('vscode.peekTestError', test.item.extId)));
        }
        testActions.push(new Action('testing.gutter.reveal', localize('reveal test', 'Reveal in Test Explorer'), undefined, undefined, () => this.commandService.executeCommand('_revealTestInExplorer', test.item.extId)));
        const contributed = this.getContributedTestActions(test, capabilities);
        return {
            object: Separator.join(testActions, contributed),
            dispose() {
                testActions.forEach((a) => a.dispose());
            },
        };
    }
    getContributedTestActions(test, capabilities) {
        const contextOverlay = this.contextKeyService.createOverlay(getTestItemContextOverlay(test, capabilities));
        const arg = getContextForTestItem(this.testService.collection, test.item.extId);
        const menu = this.menuService.getMenuActions(MenuId.TestItemGutter, contextOverlay, {
            shouldForwardArgs: true,
            arg,
        });
        return getFlatContextMenuActions(menu);
    }
};
RunTestDecoration = __decorate([
    __param(3, ICodeEditorService),
    __param(4, ITestService),
    __param(5, IContextMenuService),
    __param(6, ICommandService),
    __param(7, IConfigurationService),
    __param(8, ITestProfileService),
    __param(9, IContextKeyService),
    __param(10, IMenuService)
], RunTestDecoration);
let MultiRunTestDecoration = class MultiRunTestDecoration extends RunTestDecoration {
    constructor(tests, visible, model, codeEditorService, testService, contextMenuService, commandService, configurationService, testProfileService, contextKeyService, menuService, quickInputService) {
        super(tests, visible, model, codeEditorService, testService, contextMenuService, commandService, configurationService, testProfileService, contextKeyService, menuService);
        this.quickInputService = quickInputService;
    }
    getContextMenuActions() {
        const disposable = new DisposableStore();
        const allActions = [];
        [
            { bitset: 2 /* TestRunProfileBitset.Run */, label: localize('run all test', 'Run All Tests') },
            {
                bitset: 8 /* TestRunProfileBitset.Coverage */,
                label: localize('run all test with coverage', 'Run All Tests with Coverage'),
            },
            { bitset: 4 /* TestRunProfileBitset.Debug */, label: localize('debug all test', 'Debug All Tests') },
        ].forEach(({ bitset, label }, i) => {
            const canRun = this.tests.some(({ test }) => this.testProfileService.capabilitiesForTest(test.item) & bitset);
            if (canRun) {
                allActions.push(new Action(`testing.gutter.run${i}`, label, undefined, undefined, () => this.runWith(bitset)));
            }
        });
        disposable.add(toDisposable(() => allActions.forEach((a) => a.dispose())));
        const testItems = this.tests.map((testItem) => ({
            currentLabel: testItem.test.item.label,
            testItem,
            parent: TestId.fromString(testItem.test.item.extId).parentId,
        }));
        const getLabelConflicts = (tests) => {
            const labelCount = new Map();
            for (const test of tests) {
                labelCount.set(test.currentLabel, (labelCount.get(test.currentLabel) || 0) + 1);
            }
            return tests.filter((e) => labelCount.get(e.currentLabel) > 1);
        };
        let conflicts, hasParent = true;
        while ((conflicts = getLabelConflicts(testItems)).length && hasParent) {
            for (const conflict of conflicts) {
                if (conflict.parent) {
                    const parent = this.testService.collection.getNodeById(conflict.parent.toString());
                    conflict.currentLabel = parent?.item.label + ' > ' + conflict.currentLabel;
                    conflict.parent = conflict.parent.parentId;
                }
                else {
                    hasParent = false;
                }
            }
        }
        testItems.sort((a, b) => {
            const ai = a.testItem.test.item;
            const bi = b.testItem.test.item;
            return (ai.sortText || ai.label).localeCompare(bi.sortText || bi.label);
        });
        let testSubmenus = testItems.map(({ currentLabel, testItem }) => {
            const actions = this.getTestContextMenuActions(testItem.test, testItem.resultItem);
            disposable.add(actions);
            let label = stripIcons(currentLabel);
            const lf = label.indexOf('\n');
            if (lf !== -1) {
                label = label.slice(0, lf);
            }
            return new SubmenuAction(testItem.test.item.extId, label, actions.object);
        });
        const overflow = testSubmenus.length - MAX_TESTS_IN_SUBMENU;
        if (overflow > 0) {
            testSubmenus = testSubmenus.slice(0, MAX_TESTS_IN_SUBMENU);
            testSubmenus.push(new Action('testing.gutter.overflow', localize('testOverflowItems', '{0} more tests...', overflow), undefined, undefined, () => this.pickAndRun(testItems)));
        }
        return { object: Separator.join(allActions, testSubmenus), dispose: () => disposable.dispose() };
    }
    async pickAndRun(testItems) {
        const doPick = (items, title) => new Promise((resolve) => {
            const disposables = new DisposableStore();
            const pick = disposables.add(this.quickInputService.createQuickPick());
            pick.placeholder = title;
            pick.items = items;
            disposables.add(pick.onDidHide(() => {
                resolve(undefined);
                disposables.dispose();
            }));
            disposables.add(pick.onDidAccept(() => {
                resolve(pick.selectedItems[0]);
                disposables.dispose();
            }));
            pick.show();
        });
        const item = await doPick(testItems.map(({ currentLabel, testItem }) => ({
            label: currentLabel,
            test: testItem.test,
            result: testItem.resultItem,
        })), localize('selectTestToRun', 'Select a test to run'));
        if (!item) {
            return;
        }
        const actions = this.getTestContextMenuActions(item.test, item.result);
        try {
            ;
            (await doPick(actions.object, item.label))?.run();
        }
        finally {
            actions.dispose();
        }
    }
};
MultiRunTestDecoration = __decorate([
    __param(3, ICodeEditorService),
    __param(4, ITestService),
    __param(5, IContextMenuService),
    __param(6, ICommandService),
    __param(7, IConfigurationService),
    __param(8, ITestProfileService),
    __param(9, IContextKeyService),
    __param(10, IMenuService),
    __param(11, IQuickInputService)
], MultiRunTestDecoration);
let RunSingleTestDecoration = class RunSingleTestDecoration extends RunTestDecoration {
    constructor(test, resultItem, model, visible, codeEditorService, testService, commandService, contextMenuService, configurationService, testProfiles, contextKeyService, menuService) {
        super([{ test, resultItem }], visible, model, codeEditorService, testService, contextMenuService, commandService, configurationService, testProfiles, contextKeyService, menuService);
    }
    getContextMenuActions() {
        return this.getTestContextMenuActions(this.tests[0].test, this.tests[0].resultItem);
    }
};
RunSingleTestDecoration = __decorate([
    __param(4, ICodeEditorService),
    __param(5, ITestService),
    __param(6, ICommandService),
    __param(7, IContextMenuService),
    __param(8, IConfigurationService),
    __param(9, ITestProfileService),
    __param(10, IContextKeyService),
    __param(11, IMenuService)
], RunSingleTestDecoration);
const lineBreakRe = /\r?\n\s*/g;
let TestMessageDecoration = class TestMessageDecoration {
    static { TestMessageDecoration_1 = this; }
    static { this.inlineClassName = 'test-message-inline-content'; }
    static { this.decorationId = `testmessage-${generateUuid()}`; }
    constructor(testMessage, messageUri, textModel, peekOpener, editorService) {
        this.testMessage = testMessage;
        this.messageUri = messageUri;
        this.peekOpener = peekOpener;
        this.id = '';
        this.contentIdClass = `test-message-inline-content-id${generateUuid()}`;
        const location = testMessage.location;
        this.line = clamp(location.range.startLineNumber, 0, textModel.getLineCount());
        const severity = testMessage.type;
        const message = testMessage.message;
        const options = editorService.resolveDecorationOptions(TestMessageDecoration_1.decorationId, true);
        options.hoverMessage =
            typeof message === 'string' ? new MarkdownString().appendText(message) : message;
        options.zIndex = 10; // todo: in spite of the z-index, this appears behind gitlens
        options.className = `testing-inline-message-severity-${severity}`;
        options.isWholeLine = true;
        options.stickiness = 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */;
        options.collapseOnReplaceEdit = true;
        let inlineText = renderTestMessageAsText(message).replace(lineBreakRe, ' ');
        if (inlineText.length > MAX_INLINE_MESSAGE_LENGTH) {
            inlineText = inlineText.slice(0, MAX_INLINE_MESSAGE_LENGTH - 1) + '…';
        }
        options.after = {
            content: inlineText,
            inlineClassName: `test-message-inline-content test-message-inline-content-s${severity} ${this.contentIdClass} ${messageUri ? 'test-message-inline-content-clickable' : ''}`,
        };
        options.showIfCollapsed = true;
        const rulerColor = severity === 0 /* TestMessageType.Error */ ? overviewRulerError : overviewRulerInfo;
        if (rulerColor) {
            options.overviewRuler = {
                color: themeColorFromId(rulerColor),
                position: OverviewRulerLane.Right,
            };
        }
        const lineLength = textModel.getLineLength(this.line);
        const column = lineLength ? lineLength + 1 : location.range.endColumn;
        this.editorDecoration = {
            options,
            range: {
                startLineNumber: this.line,
                startColumn: column,
                endColumn: column,
                endLineNumber: this.line,
            },
        };
    }
    click(e) {
        if (e.event.rightButton) {
            return false;
        }
        if (!this.messageUri) {
            return false;
        }
        if (e.target.element?.className.includes(this.contentIdClass)) {
            this.peekOpener.peekUri(this.messageUri);
        }
        return false;
    }
    getContextMenuActions() {
        return { object: [], dispose: () => { } };
    }
};
TestMessageDecoration = TestMessageDecoration_1 = __decorate([
    __param(3, ITestingPeekOpener),
    __param(4, ICodeEditorService)
], TestMessageDecoration);
const ERROR_CONTENT_WIDGET_HEIGHT = 20;
let TestErrorContentWidget = class TestErrorContentWidget extends Disposable {
    get line() {
        return this.position.lineNumber;
    }
    constructor(editor, position, message, resultItem, uri, peekOpener) {
        super();
        this.editor = editor;
        this.position = position;
        this.message = message;
        this.resultItem = resultItem;
        this.peekOpener = peekOpener;
        this.id = generateUuid();
        /** @inheritdoc */
        this.allowEditorOverflow = false;
        this.node = dom.h('div.test-error-content-widget', [
            dom.h('div.inner@inner', [
                dom.h('div.arrow@arrow'),
                dom.h(`span${ThemeIcon.asCSSSelector(testingStatesToIcons.get(4 /* TestResultState.Failed */))}`),
                dom.h('span.content@name'),
            ]),
        ]);
        const setMarginTop = () => {
            const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
            this.node.root.style.marginTop = (lineHeight - ERROR_CONTENT_WIDGET_HEIGHT) / 2 + 'px';
        };
        setMarginTop();
        this._register(editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(68 /* EditorOption.lineHeight */)) {
                setMarginTop();
            }
        }));
        let text;
        if (message.expected !== undefined && message.actual !== undefined) {
            text = `${truncateMiddle(message.actual.replace(/\s+/g, ' '), 30)} != ${truncateMiddle(message.expected.replace(/\s+/g, ' '), 30)}`;
        }
        else {
            const msg = renderStringAsPlaintext(message.message);
            const lf = msg.indexOf('\n');
            text = lf === -1 ? msg : msg.slice(0, lf);
        }
        this.node.root.addEventListener('click', (e) => {
            this.peekOpener.peekUri(uri);
            e.preventDefault();
        });
        const ctrl = TestingOutputPeekController.get(editor);
        if (ctrl) {
            this._register(autorun((reader) => {
                const subject = ctrl.subject.read(reader);
                const isCurrent = subject instanceof MessageSubject && subject.message === message;
                this.node.root.classList.toggle('is-current', isCurrent);
            }));
        }
        this.node.name.innerText = text || 'Test Failed';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '15');
        svg.setAttribute('height', '10');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('viewBox', '0 0 15 10');
        const leftArrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        leftArrow.setAttribute('d', 'M15 0 L10 0 L0 5 L10 10 L15 10 Z');
        svg.append(leftArrow);
        this.node.arrow.appendChild(svg);
        this._register(editor.onDidChangeModelContent((e) => {
            for (const c of e.changes) {
                if (c.range.startLineNumber > this.line) {
                    continue;
                }
                if ((c.range.startLineNumber <= this.line && c.range.endLineNumber >= this.line) ||
                    (resultItem.item.range &&
                        resultItem.item.range.startLineNumber <= c.range.startLineNumber &&
                        resultItem.item.range.endLineNumber >= c.range.endLineNumber)) {
                    TestingDecorations.invalidatedTests.add(this.resultItem);
                    this.dispose(); // todo
                }
                const adjust = count(c.text, '\n') - (c.range.endLineNumber - c.range.startLineNumber);
                if (adjust !== 0) {
                    this.position = this.position.delta(adjust);
                    this.editor.layoutContentWidget(this);
                }
            }
        }));
        editor.addContentWidget(this);
        this._register(toDisposable(() => editor.removeContentWidget(this)));
    }
    getId() {
        return this.id;
    }
    getDomNode() {
        return this.node.root;
    }
    getPosition() {
        return {
            position: this.position,
            preference: [0 /* ContentWidgetPositionPreference.EXACT */],
        };
    }
    afterRender(_position, coordinate) {
        if (coordinate) {
            const { verticalScrollbarWidth } = this.editor.getLayoutInfo();
            const scrollWidth = this.editor.getScrollWidth();
            this.node.inner.style.maxWidth = `${scrollWidth - verticalScrollbarWidth - coordinate.left - 20}px`;
        }
    }
};
TestErrorContentWidget = __decorate([
    __param(5, ITestingPeekOpener)
], TestErrorContentWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0RlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdGluZ0RlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFOUQsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsZUFBZSxFQUVmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtB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
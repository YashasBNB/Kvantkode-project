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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0RlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RpbmdEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTlELE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR2hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQVU5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUU3RixPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGlCQUFpQixHQUNqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUdyRSxPQUFPLEVBQ04sZUFBZSxFQUtmLGlCQUFpQixHQUVqQixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDM0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IscUJBQXFCLEdBQ3JCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUdOLHVCQUF1QixHQUN2QixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBVyxtQkFBbUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRSxPQUFPLEVBQWUsY0FBYyxFQUE4QixNQUFNLHlCQUF5QixDQUFBO0FBQ2pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFDTixZQUFZLEVBQ1oscUJBQXFCLEVBQ3JCLHNCQUFzQixFQUN0QixXQUFXLEdBQ1gsTUFBTSwwQkFBMEIsQ0FBQTtBQWFqQyxPQUFPLEVBRU4sMEJBQTBCLEVBQzFCLGVBQWUsR0FDZixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdkUsT0FBTyxFQUFlLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNqRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMzRixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGdCQUFnQixFQUNoQixpQkFBaUIsRUFDakIsY0FBYyxFQUNkLG9CQUFvQixHQUNwQixNQUFNLFlBQVksQ0FBQTtBQUNuQixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFcEUsTUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUE7QUFDckMsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLENBQUE7QUFDL0IsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFBO0FBRWhELFNBQVMsc0JBQXNCLENBQzlCLGlCQUFxQyxFQUNyQyxVQUF1QjtJQUV2QixNQUFNLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUV2RCxLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ3RDLElBQUksVUFBVSxDQUFDLGlCQUFpQixFQUFFLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDbkQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQU9ELCtGQUErRjtBQUMvRixNQUFNLGlCQUFpQjtJQUF2QjtRQUNrQixlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUE7SUFpQ25FLENBQUM7SUEvQkEsSUFBVyxJQUFJO1FBQ2QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQTtJQUM1QixDQUFDO0lBRUQsMEVBQTBFO0lBQ25FLGdCQUFnQixDQUFDLE9BQWlCO1FBQ3hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBQ0QscUNBQXFDO0lBQzlCLE9BQU8sQ0FBQyxDQUFvQjtRQUNsQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDNUIsQ0FBQztJQUVELDZDQUE2QztJQUN0QyxPQUFPLENBQUMsWUFBb0I7UUFDbEMsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLFlBQVksRUFBRSxDQUFDO2dCQUMzQixPQUFPLENBQUMsQ0FBQTtZQUNULENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELG1DQUFtQztJQUNuQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNqQixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUMxQyxNQUFNLENBQUMsQ0FBQTtRQUNSLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFTSxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUEyQnZELFlBQ3FCLGlCQUFxQyxFQUNsQyxvQkFBNEQsRUFDckUsV0FBMEMsRUFDcEMsT0FBNEMsRUFDekMsb0JBQTRELEVBQ3BFLFlBQTRDO1FBRTNELEtBQUssRUFBRSxDQUFBO1FBTmlDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDcEQsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDbkIsWUFBTyxHQUFQLE9BQU8sQ0FBb0I7UUFDeEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNuRCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQTlCcEQsZUFBVSxHQUFHLENBQUMsQ0FBQTtRQUNMLGtCQUFhLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUNuQyxvQkFBZSxHQUFHLElBQUksV0FBVyxFQU85QyxDQUFBO1FBRUo7Ozs7Ozs7V0FPRztRQUNjLHdCQUFtQixHQUFHLElBQUksT0FBTyxFQUFnQixDQUFBO1FBRWxFLGtCQUFrQjtRQUNGLGdCQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUE7UUFXckQsaUJBQWlCLENBQUMsc0JBQXNCLENBQ3ZDLHlCQUF5QixFQUN6QixxQkFBcUIsQ0FBQyxZQUFZLEVBQ2xDLEVBQUUsRUFDRixTQUFTLENBQ1QsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV0RixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUU3Rix5RUFBeUU7UUFDekUsMkVBQTJFO1FBQzNFLHdFQUF3RTtRQUN4RSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUMzQyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUMxQixJQUFJLEtBQUssQ0FBQyxFQUFFLDBDQUFrQyxFQUFFLENBQUM7b0JBQ2hELFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQy9DLElBQUksR0FBRyxFQUFFLENBQUM7b0JBQ1QsR0FBRyxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7Z0JBQ3RDLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7Z0JBQ3ZDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsR0FBRyxDQUNSLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQzdCLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUMxQixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFDakQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ2pFLENBQUMsQ0FBQyxvQkFBb0IsK0RBQWlDLENBQ3ZELENBQ0QsQ0FBQyxHQUFHLEVBQUU7WUFDTixJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztnQkFDdkMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLDhCQUE4QixDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3hFLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDdkMsTUFBTSxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2pFLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsQ0FBQztnQkFDL0MsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUM5QixPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzFGLEtBQUssTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3ZDLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDakQsSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDaEIsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxVQUFVLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtvQkFDOUQsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQzt3QkFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUE7b0JBQ2pDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELGtCQUFrQjtJQUNYLHVCQUF1QixDQUFDLE9BQXFCO1FBQ25ELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ2xCLENBQUM7SUFFRCxrQkFBa0I7SUFDWCxlQUFlLENBQUMsUUFBYTtRQUNuQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtRQUMvQixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsSUFDQyxNQUFNO1lBQ04sTUFBTSxDQUFDLFVBQVUsS0FBSyxJQUFJLENBQUMsVUFBVTtZQUNyQyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsS0FBSyxTQUFTO2dCQUN6QyxNQUFNLENBQUMsb0JBQW9CLEtBQUssS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQ3JELENBQUM7WUFDRixPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUE7UUFDcEIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxrQkFBa0I7SUFDWCx3QkFBd0IsQ0FBQyxRQUFhLEVBQUUsTUFBYztRQUM1RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FDL0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFDOUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsWUFBWSxpQkFBaUIsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUM1RCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCwrRUFBK0U7UUFDL0UsT0FBTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLENBQUE7SUFDbkUsQ0FBQztJQUVPLFVBQVU7UUFDakIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksZ0NBQWdDLENBQUMsUUFBYSxFQUFFLEtBQWM7UUFDcEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ2pELE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDcEIsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDcEMsS0FBSyxNQUFNLFVBQVUsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksVUFBVSxZQUFZLGlCQUFpQixJQUFJLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDdEYsUUFBUSxDQUFDLHVCQUF1QixDQUMvQixVQUFVLENBQUMsRUFBRSxFQUNiLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FDbkYsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZ0JBQWdCLENBQUMsS0FBaUI7UUFDekMsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQzVDLElBQUksQ0FBQyxvQkFBb0IsZ0VBRXpCLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbEQsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLEVBQUUsb0JBQW9CLEtBQUssS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQy9FLE1BQU0sZUFBZSxHQUFHLE1BQU0sRUFBRSxLQUFLLElBQUksSUFBSSxpQkFBaUIsRUFBRSxDQUFBO1FBRWhFLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzNELE1BQU0sY0FBYyxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtZQUM5QyxNQUFNLGNBQWMsR0FBRyxJQUFJLGVBQWUsRUFLdEMsQ0FBQTtZQUNKLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN4RSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDdEIsU0FBUTtnQkFDVCxDQUFDO2dCQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQzlELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQTtnQkFDNUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQzFFLENBQUM7WUFFRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQ3BELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUM5QixJQUFJLFFBQVEsR0FBRyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtnQkFFcEYsMERBQTBEO2dCQUMxRCxJQUNDLFFBQVE7b0JBQ1IsaUJBQWlCO29CQUNqQixLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLGVBQWUsS0FBSyxJQUFJLEVBQzlELENBQUM7b0JBQ0YsUUFBUSxHQUFHLFNBQVMsQ0FBQTtnQkFDckIsQ0FBQztnQkFFRCxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNkLElBQUksUUFBUSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLEVBQUUsQ0FBQzt3QkFDbkQsUUFBUSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUNqRixDQUFDO29CQUNELGNBQWMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ2pDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxjQUFjLENBQUMsT0FBTyxDQUNyQixLQUFLO3dCQUNKLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN4QyxzQkFBc0IsRUFDdEIsS0FBSyxFQUNMLGFBQWEsRUFDYixLQUFLLENBQ0w7d0JBQ0YsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3hDLHVCQUF1QixFQUN2QixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUNiLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQ25CLEtBQUssRUFDTCxhQUFhLENBQ2IsQ0FDSCxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtZQUN6QyxLQUFLLE1BQU0sVUFBVSxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUN6QyxJQUFJLFVBQVUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7b0JBQzFCLFVBQVUsQ0FBQyxFQUFFLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FDckMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFDakMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FDbkMsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsZUFBZSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ25DLENBQUM7WUFDRixDQUFDO1lBRUQsS0FBSyxNQUFNLFVBQVUsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7b0JBQ3pDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3pDLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtnQkFDbkMsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO2dCQUMzQixvQkFBb0IsRUFBRSxNQUFNLEVBQUUsb0JBQW9CO2dCQUNsRCxLQUFLLEVBQUUsY0FBYzthQUNyQixDQUFDLENBQUE7WUFFRixPQUFPLGNBQWMsQ0FBQTtRQUN0QixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sY0FBYyxJQUFJLGVBQWUsQ0FBQTtJQUN6QyxDQUFDO0NBQ0QsQ0FBQTtBQXpSWSx3QkFBd0I7SUE0QmxDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGFBQWEsQ0FBQTtHQWpDSCx3QkFBd0IsQ0F5UnBDOztBQUVNLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTs7SUFDakQ7O09BRUc7YUFDVyxxQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBaUMsQUFBL0MsQ0FBK0M7SUFFN0U7O09BRUc7SUFDSSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQW1CO1FBQ3BDLE9BQU8sTUFBTSxDQUFDLGVBQWUsNkVBQXVELENBQUE7SUFDckYsQ0FBQztJQUVELElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztJQW9CRCxZQUNrQixNQUFtQixFQUNoQixpQkFBc0QsRUFDNUQsV0FBMEMsRUFDNUIsV0FBd0QsRUFDL0Qsa0JBQXdELEVBQ3pELE9BQTRDLEVBQ3pDLG9CQUE0RCxFQUM1RCxvQkFBNEQ7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFUVSxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUMzQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNYLGdCQUFXLEdBQVgsV0FBVyxDQUE0QjtRQUM5Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3hDLFlBQU8sR0FBUCxPQUFPLENBQW9CO1FBQ3hCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQXpCbkUsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQyxJQUFJLGlCQUFpQixFQUE2QixDQUNsRCxDQUFBO1FBQ2dCLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUEyQixDQUFDLENBQUE7UUFFL0Usd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDcEQsSUFBSSxhQUFhLEVBQXdDLENBQ3pELENBQUE7UUFDZ0IsNkJBQXdCLEdBQUcsSUFBSSxHQUFHLEVBT2hELENBQUE7UUFjRixpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FDdkMseUJBQXlCLEVBQ3pCLHFCQUFxQixDQUFDLFlBQVksRUFDbEMsRUFBRSxFQUNGLFNBQVMsRUFDVCxNQUFNLENBQ04sQ0FBQTtRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxTQUFTLENBQ2IsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDNUIsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQzlDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsR0FBRyxDQUNSLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQzdCLE1BQU0sQ0FBQyxnQkFBZ0IsRUFDdkIsS0FBSyxDQUFDLE1BQU0sQ0FDWCxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFDMUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLGtEQUEwQyxDQUN6RCxFQUNELElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUM3QyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUM1QixDQUFBO1FBRUQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDL0MsSUFBSSxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sd0JBQWdCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUM5RSxXQUFXLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNyRSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM3QyxJQUFJLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyx3QkFBZ0IsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzlFLFdBQVcsQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3RFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7WUFDM0MsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLFdBQVcsQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3RFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3pCLElBQUksQ0FBQyxDQUFDLE9BQU8sd0JBQWdCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNuRCxXQUFXLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLFdBQVksRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQ2pGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDN0IsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sZ0JBQWdCLEdBQ3JCLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQzFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDOUIsT0FBTTtnQkFDUCxDQUFDO2dCQUVELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUMxRCxLQUFLLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO29CQUN2QyxJQUFLLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFpQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUNsRSxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFBO3dCQUN6QixPQUFNO29CQUNQLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsVUFBVSxDQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQ25DLENBQUMsRUFDRCxJQUFJLENBQUMsTUFBTSxDQUNYLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNWLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNqQyxPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQTtZQUNuQixLQUFLLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7Z0JBQzdELG9FQUFvRTtnQkFDcEUsb0VBQW9FO2dCQUNwRSxtQ0FBbUM7Z0JBQ25DLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNsQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDYixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQzVFLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSzt3QkFDM0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWU7d0JBQ3JFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FDcEUsQ0FDRCxDQUFBO2dCQUVELElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ2hCLE9BQU8sR0FBRyxJQUFJLENBQUE7b0JBQ2Qsb0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksT0FBTyxDQUFDLENBQUE7Z0JBQ3BFLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDcEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLG1CQUFtQixHQUFHLEdBQUcsRUFBRTtZQUNoQyxJQUFJLENBQUMsTUFBTTtpQkFDVCxtQkFBbUIsRUFBRTtpQkFDckIsS0FBSyxDQUFDLFdBQVcsQ0FDakIsbUNBQW1DLEVBQ25DLE1BQU0sQ0FBQyxTQUFTLGtDQUF5QixDQUN6QyxDQUFBO1lBQ0YsSUFBSSxDQUFDLE1BQU07aUJBQ1QsbUJBQW1CLEVBQUU7aUJBQ3JCLEtBQUssQ0FBQyxXQUFXLENBQ2pCLGlDQUFpQyxFQUNqQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLGdDQUF1QixJQUFJLENBQzlDLENBQUE7UUFDSCxDQUFDLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxQyxJQUFJLENBQUMsQ0FBQyxVQUFVLGtDQUF5QixFQUFFLENBQUM7Z0JBQzNDLG1CQUFtQixFQUFFLENBQUE7WUFDdEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxtQkFBbUIsRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFTyxXQUFXLENBQUMsR0FBUztRQUM1QixRQUFRLEdBQUcsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDeEM7Z0JBQ0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEdBQUcsSUFBSSx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3RFLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ3pCLE1BQUs7WUFDTjtnQkFDQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUMzQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDbEUsTUFBSztZQUNOO2dCQUNDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDM0IsQ0FBQztRQUVELElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pFLEdBQUcsR0FBRyxTQUFTLENBQUE7UUFDaEIsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFBO1FBRXRCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBRXBDO1FBQUEsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNaLElBQUksS0FBSyxFQUFFLE1BQU0sS0FBSyxJQUFJLFdBQVcsQ0FDcEMsSUFBSSxDQUFDLFdBQVcsRUFDaEIsSUFBSSxDQUFDLGtCQUFrQixFQUN2QixHQUFHLEVBQ0gsS0FBSyxDQUNMLEVBQUUsQ0FBQztnQkFDSCxzRUFBc0U7Z0JBQ3RFLHNFQUFzRTtnQkFDdEUsc0RBQXNEO2dCQUN0RCxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQzlCLE1BQUs7Z0JBQ04sQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsRUFBRSxDQUFBO0lBQ0wsQ0FBQztJQUVPLFlBQVk7UUFDbkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUMzQixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNuQyxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBQ25DLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRU8sWUFBWTtRQUNuQixJQUFJLENBQUMsbUJBQW1CLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtJQUM5QyxDQUFDO0lBRU8sb0JBQW9CLENBQUMsT0FBcUI7UUFDakQsT0FBTyxvQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVPLDBCQUEwQixDQUFDLE1BQWMsRUFBRSxTQUFzQjtRQUN4RSxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBZ0IsQ0FBQTtRQUNwQyxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxvQkFBb0Isb0VBQW9DLEVBQUUsQ0FBQztZQUMzRixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUMzQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQ3ZFLENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRixDQUFDO1FBRUQsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUN2RCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDbkQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sNkJBQTZCLENBQ3BDLFVBQXVCLEVBQ3ZCLE1BQWMsRUFDZCxJQUF1QixFQUN2QixTQUFzQjtRQUV0QixLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyQyxJQUFJLG9CQUFrQixDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNuRCxTQUFRO1lBQ1QsQ0FBQztZQUNELEtBQUssSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDO2dCQUMzRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUNoQywwRUFBMEU7Z0JBQzFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNoRCxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUMzQixJQUFJLENBQUMsQ0FBQyxJQUFJLGtDQUEwQixJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUN0RSxTQUFRO29CQUNULENBQUM7b0JBRUQsTUFBTSxJQUFJLEdBQ1QsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTTt3QkFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWU7d0JBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTs0QkFDYixZQUFZLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ2hDLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQzlFLENBQUE7b0JBQ0osSUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDL0MsU0FBUTtvQkFDVCxDQUFDO29CQUVELFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ25CLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQzFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDWCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUE7d0JBQ3JFLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUM5QyxzQkFBc0IsRUFDdEIsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUNsQyxDQUFDLEVBQ0QsSUFBSSxFQUNKLFlBQVksQ0FBQzs0QkFDWixJQUFJLHdDQUFnQzs0QkFDcEMsWUFBWSxFQUFFLENBQUM7NEJBQ2YsU0FBUyxFQUFFLE1BQU07NEJBQ2pCLFFBQVEsRUFBRSxVQUFVLENBQUMsRUFBRTs0QkFDdkIsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSzt5QkFDMUIsQ0FBQyxDQUNGLENBQUE7d0JBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBQ3RDLENBQUM7b0JBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDWixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sMEJBQTBCLENBQUMsTUFBYyxFQUFFLFlBQXlCO1FBQzNFLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUMxQyxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBZ0IsQ0FBQTtZQUNwQyxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxvQkFBb0Isb0VBQW9DLEVBQUUsQ0FBQztnQkFDM0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDbEMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FDMUUsQ0FBQTtZQUNGLENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLDRCQUE0QixDQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFDdkIsTUFBTSxFQUNOLElBQUksRUFDSixZQUFZLEVBQ1osUUFBUSxDQUNSLENBQUE7WUFDRixDQUFDO1lBRUQsS0FBSyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztnQkFDL0QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUM5QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLDRCQUE0QixDQUNuQyxVQUF1QixFQUN2QixNQUFjLEVBQ2QsSUFBdUIsRUFDdkIsWUFBeUIsRUFDekIsUUFBeUM7UUFFekMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxVQUFVLFlBQVksY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUN6RixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLENBQUMsVUFBc0MsRUFBRSxDQUFlLEVBQUUsR0FBUyxFQUFFLEVBQUU7WUFDckYsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzNFLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNYLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQTtZQUM3QyxJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3BELHFCQUFxQixFQUNyQixDQUFDLEVBQ0QsR0FBRyxFQUNILElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQ3ZCLENBQUE7WUFFRCxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3RCLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDN0YsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDL0QsQ0FBQyxDQUFBO1FBRUQsS0FBSyxNQUFNLElBQUksSUFBSSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDckMsSUFBSSxvQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDbkQsU0FBUTtZQUNULENBQUM7WUFFRCxLQUFLLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQztnQkFDM0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDaEMsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNyRCxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUMzQixJQUFJLENBQUMsQ0FBQyxJQUFJLG1DQUEyQixFQUFFLENBQUM7d0JBQ3ZDLE1BQU0sQ0FDTCxJQUFJLEVBQ0osQ0FBQyxFQUNELFlBQVksQ0FBQzs0QkFDWixJQUFJLHdDQUFnQzs0QkFDcEMsWUFBWSxFQUFFLENBQUM7NEJBQ2YsU0FBUyxFQUFFLE1BQU07NEJBQ2pCLFFBQVEsRUFBRSxVQUFVLENBQUMsRUFBRTs0QkFDdkIsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSzt5QkFDMUIsQ0FBQyxDQUNGLENBQUE7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7O0FBaGFXLGtCQUFrQjtJQXFDNUIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsMEJBQTBCLENBQUE7SUFDMUIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtHQTNDWCxrQkFBa0IsQ0FpYTlCOztBQUVELE1BQU0sYUFBYSxHQUFHLENBQUMsYUFBcUIsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNqRCxlQUFlLEVBQUUsYUFBYSxDQUFDLGVBQWU7SUFDOUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxlQUFlO0lBQzVDLFdBQVcsRUFBRSxhQUFhLENBQUMsV0FBVztJQUN0QyxTQUFTLEVBQUUsYUFBYSxDQUFDLFdBQVc7Q0FDcEMsQ0FBQyxDQUFBO0FBRUYsTUFBTSx1QkFBdUIsR0FBRyxDQUMvQixLQUErQyxFQUMvQyxNQUErQyxFQUMvQyxPQUFnQixFQUNoQixtQkFBNkMsRUFDcUIsRUFBRTtJQUNwRSxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQTtJQUNsQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixNQUFNLElBQUksS0FBSyxDQUFDLDZEQUE2RCxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNkLE9BQU87WUFDTixLQUFLLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQztZQUMzQixPQUFPLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxxQkFBcUIsRUFBRTtTQUNsRSxDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksYUFBYSxnQ0FBd0IsQ0FBQTtJQUN6QyxNQUFNLGlCQUFpQixHQUFhLEVBQUUsQ0FBQTtJQUN0QyxJQUFJLGtCQUFzQyxDQUFBO0lBQzFDLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQTtJQUNuQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUIsTUFBTSxLQUFLLEdBQUcsVUFBVSxFQUFFLGFBQWEsaUNBQXlCLENBQUE7UUFDaEUsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDbkMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDcEUsQ0FBQztRQUNELGFBQWEsR0FBRyxXQUFXLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pELE9BQU8sR0FBRyxPQUFPLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUE7UUFDMUMsSUFBSSxDQUFDLGtCQUFrQixJQUFJLFVBQVUsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDN0Usa0JBQWtCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUE7UUFDckMsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtJQUV2RSxNQUFNLFdBQVcsR0FDaEIsYUFBYSxrQ0FBMEI7UUFDdEMsQ0FBQyxDQUFDLGdCQUFnQjtZQUNqQixDQUFDLENBQUMsaUJBQWlCO1lBQ25CLENBQUMsQ0FBQyxjQUFjO1FBQ2pCLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFFLENBQUE7SUFFNUMsTUFBTSxhQUFhLEdBQ2xCLG1CQUFtQixpREFBbUM7UUFDckQsQ0FBQyxDQUFDLGdCQUFnQjtZQUNqQixDQUFDLENBQUMsaUJBQWlCO1lBQ25CLENBQUMsQ0FBQyxjQUFjO1FBQ2pCLENBQUMsQ0FBQyxnQkFBZ0I7WUFDakIsQ0FBQyxDQUFDLG1CQUFtQjtZQUNyQixDQUFDLENBQUMsZ0JBQWdCLENBQUE7SUFFckIsSUFBSSxZQUF5QyxDQUFBO0lBRTdDLElBQUksb0JBQW9CLEdBQUcsbUJBQW1CLENBQUE7SUFDOUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNiLG9CQUFvQixJQUFJLFVBQVUsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsTUFBTSxjQUFjLEdBQTRCO1FBQy9DLFdBQVcsRUFBRSxxQkFBcUI7UUFDbEMsZUFBZSxFQUFFLElBQUk7UUFDckIsSUFBSSxZQUFZO1lBQ2YsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNuQixNQUFNLFFBQVEsR0FBRyxDQUFDLFlBQVksR0FBRyxJQUFJLGNBQWMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUN2RSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUNsQyxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO29CQUN4QixNQUFNLElBQUksR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3JFLFFBQVEsQ0FBQyxjQUFjLENBQ3RCLEtBQUssUUFBUSxDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDLGtDQUFrQyxJQUFJLEdBQUcsQ0FDNUYsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU8sWUFBWSxDQUFBO1FBQ3BCLENBQUM7UUFDRCxXQUFXLEVBQUUsRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUU7UUFDNUMsb0JBQW9CLEVBQUUsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLG9CQUFvQixFQUFFO1FBQ3JGLFVBQVUsNERBQW9EO1FBQzlELE1BQU0sRUFBRSxLQUFLO0tBQ2IsQ0FBQTtJQUVELE1BQU0sZ0JBQWdCLEdBQTRCO1FBQ2pELEdBQUcsY0FBYztRQUNqQixvQkFBb0IsRUFBRSxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLElBQUksb0JBQW9CLEVBQUU7S0FDdkYsQ0FBQTtJQUVELE9BQU87UUFDTixLQUFLLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQztRQUMzQixPQUFPLEVBQUUsY0FBYztRQUN2QixTQUFTLEVBQUUsZ0JBQWdCO0tBQzNCLENBQUE7QUFDRixDQUFDLENBQUE7QUFFRCxJQUFXLHFCQUdWO0FBSEQsV0FBVyxxQkFBcUI7SUFDL0IsaUVBQXdDLENBQUE7SUFDeEMscUVBQTRDLENBQUE7QUFDN0MsQ0FBQyxFQUhVLHFCQUFxQixLQUFyQixxQkFBcUIsUUFHL0I7QUFFRCxNQUFlLHNCQUFzQjtJQVNwQyxZQUE2QixNQUFtQjtRQUFuQixXQUFNLEdBQU4sTUFBTSxDQUFhO1FBUmhELGtCQUFrQjtRQUNGLHdCQUFtQixHQUFHLEtBQUssQ0FBQTtRQUMzQyxrQkFBa0I7UUFDRixzQkFBaUIsR0FBRyxJQUFJLENBQUE7UUFFdkIsYUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7UUFJeEMsY0FBYyxDQUFDLEdBQUcsRUFBRTtZQUNuQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDbkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNuQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxZQUFZO1FBQ25CLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyx3Q0FBK0IsQ0FBQTtRQUNuRSxJQUFJLE1BQWMsQ0FBQTtRQUNsQixJQUFJLENBQUMsUUFBUSxJQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMvQixRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsZ0NBQXVCLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ25FLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsa0NBQXlCLENBQUE7UUFDeEQsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNO2dCQUNMLENBQUMsUUFBUTtvQkFDUixJQUFJLENBQUMsR0FBRyxDQUNQLEdBQUcsRUFDSCxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsa0NBQXlCO3dCQUM3QyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsZ0NBQXVCLENBQzdDLENBQUM7b0JBQ0gsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxnQ0FBdUIsQ0FBQTtRQUNuRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFBO1FBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFDOUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQTtRQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxHQUFHLFFBQVEsSUFBSSxDQUFBO1FBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsa0VBQWdDLEdBQUcsQ0FBQTtRQUNwRSxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixHQUFHLFNBQVMsc0VBQWtDLEdBQUcsQ0FBQTtRQUUvRSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLENBQUMsS0FBSyxDQUFBO1FBQzlELGNBQWMsQ0FBQyxXQUFXLHFFQUV6QixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsMENBQWlDLElBQUksU0FBUyxDQUNuRSxDQUFBO1FBQ0QsY0FBYyxDQUFDLFdBQVcseUVBRXpCLGNBQWMsQ0FBQyxtQkFBbUIsQ0FDbEMsQ0FBQTtRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDeEMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3JCLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ3JDLENBQUM7WUFFRCxJQUFJLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7Z0JBQ2xDLGVBQWUsRUFBRSxDQUFDO2dCQUNsQixXQUFXLG1EQUFrQztnQkFDN0MsT0FBTyxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO2dCQUN0QyxVQUFVLEVBQUUsRUFBRTthQUNkLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUtELGtCQUFrQjtJQUNYLFVBQVU7UUFDaEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxrQkFBa0I7SUFDWCxPQUFPO1FBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUN4QyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDckIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsa0JBQWtCO0lBQ1gsV0FBVztRQUNqQixPQUFPO1lBQ04sUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1lBQ3RDLFVBQVUsRUFBRSwrQ0FBdUM7U0FDbkQsQ0FBQTtJQUNGLENBQUM7Q0FHRDtBQUVELE1BQU0seUJBQTBCLFNBQVEsc0JBQXNCO0lBQ3RELEtBQUs7UUFDWCxPQUFPLHFCQUFxQixDQUFBO0lBQzdCLENBQUM7SUFFa0IsT0FBTztRQUN6QixPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLHVCQUF3QixTQUFRLHNCQUFzQjtJQUNwRCxLQUFLO1FBQ1gsT0FBTyxtQkFBbUIsQ0FBQTtJQUMzQixDQUFDO0lBRWtCLE9BQU87UUFDekIsT0FBTyxRQUFRLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzFDLENBQUM7Q0FDRDtBQUVELElBQWUsaUJBQWlCLEdBQWhDLE1BQWUsaUJBQWlCO0lBSS9CLElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUE7SUFDbkQsQ0FBQztJQUVELElBQVcsT0FBTztRQUNqQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBS0QsWUFDVyxLQUdQLEVBQ0ssT0FBZ0IsRUFDTCxLQUFpQixFQUNoQixpQkFBc0QsRUFDNUQsV0FBNEMsRUFDckMsa0JBQTBELEVBQzlELGNBQWtELEVBQzVDLG9CQUE4RCxFQUNoRSxrQkFBMEQsRUFDM0QsaUJBQXdELEVBQzlELFdBQTRDO1FBYmhELFVBQUssR0FBTCxLQUFLLENBR1o7UUFDSyxZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ0wsVUFBSyxHQUFMLEtBQUssQ0FBWTtRQUNDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDekMsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDbEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUMzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDekIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM3Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3hDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDM0MsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUE1QjNELGtCQUFrQjtRQUNYLE9BQUUsR0FBRyxFQUFFLENBQUE7UUE2QmIsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ3BFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FDOUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUN4QixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQzlCLE9BQU8sRUFDUCx1QkFBdUIsQ0FDdEIsSUFBSSxDQUFDLG9CQUFvQixzRkFFekIsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FDdEYsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUNyQixDQUFBO0lBQ0YsQ0FBQztJQUVELGtCQUFrQjtJQUNYLEtBQUssQ0FBQyxDQUFvQjtRQUNoQyxJQUNDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxnREFBd0M7WUFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxLQUFLLGlCQUFpQjtZQUNyRCx3Q0FBd0M7WUFDeEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXO1lBQ25CLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQ3JELENBQUM7WUFDRixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQTtRQUN0QyxRQUNDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxvQkFBb0Isc0ZBQTZDLEVBQzdGLENBQUM7WUFDRjtnQkFDQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN2QixNQUFLO1lBQ047Z0JBQ0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxrQ0FBMEIsQ0FBQyxtQ0FBMkIsQ0FBQyxDQUFBO2dCQUNyRixNQUFLO1lBQ047Z0JBQ0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxvQ0FBNEIsQ0FBQyxzQ0FBOEIsQ0FBQyxDQUFBO2dCQUMxRixNQUFLO1lBQ04sOENBQWtDO1lBQ2xDO2dCQUNDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsb0NBQTRCLENBQUMsaUNBQXlCLENBQUMsQ0FBQTtnQkFDckYsTUFBSztRQUNQLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRDs7O09BR0c7SUFDSSxjQUFjLENBQ3BCLFFBR0csRUFDSCxPQUFnQjtRQUVoQixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ3hFLElBQUksT0FBTyxLQUFLLElBQUksQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUMvRSxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQTtRQUNyQixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtRQUN0QyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtRQUV0QixNQUFNLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxHQUFHLHVCQUF1QixDQUNyRCxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQzNCLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFDakMsT0FBTyxFQUNQLHVCQUF1QixDQUN0QixJQUFJLENBQUMsb0JBQW9CLHNGQUV6QixDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtRQUN2QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUMzQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLHVCQUF1QixHQUFHLElBQUksY0FBYyxFQUFFLENBQUMsVUFBVSxDQUN0RixJQUFJLENBQUMsY0FBYyxFQUFFLENBQ3JCLENBQUE7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRDs7T0FFRztJQUNJLFNBQVMsQ0FBQyxNQUFjO1FBQzlCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBT1MsT0FBTyxDQUFDLE9BQTZCO1FBQzlDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUM7WUFDaEMsS0FBSyxFQUFFLHNCQUFzQixDQUM1QixJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFDM0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FDbEM7WUFDRCxLQUFLLEVBQUUsT0FBTztTQUNkLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxlQUFlLENBQUMsQ0FBb0I7UUFDM0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoRyxNQUFNLEVBQUUsZUFBZSxDQUE4QiwyQkFBMkIsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDOUYsQ0FBQztJQUVPLGNBQWM7UUFDckIsUUFDQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLHNGQUE2QyxFQUM3RixDQUFDO1lBQ0Y7Z0JBQ0MsT0FBTyxRQUFRLENBQUMsK0JBQStCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtZQUMzRTtnQkFDQyxPQUFPLFFBQVEsQ0FDZCx5QkFBeUIsRUFDekIsb0RBQW9ELENBQ3BELENBQUE7WUFDRjtnQkFDQyxPQUFPLFFBQVEsQ0FDZCw0QkFBNEIsRUFDNUIsZ0VBQWdFLENBQ2hFLENBQUE7WUFDRiw4Q0FBa0M7WUFDbEM7Z0JBQ0MsT0FBTyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsa0RBQWtELENBQUMsQ0FBQTtRQUM5RixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ08seUJBQXlCLENBQ2xDLElBQXNCLEVBQ3RCLFVBQTJCO1FBRTNCLE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQTtRQUNoQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUUxRTtRQUFBO1lBQ0EsRUFBRSxNQUFNLGtDQUEwQixFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxFQUFFO1lBQzdFLEVBQUUsTUFBTSxvQ0FBNEIsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsRUFBRTtZQUNuRjtnQkFDQyxNQUFNLHVDQUErQjtnQkFDckMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLENBQUM7YUFDckQ7U0FDRCxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDL0IsSUFBSSxZQUFZLEdBQUcsTUFBTSxFQUFFLENBQUM7Z0JBQzNCLFdBQVcsQ0FBQyxJQUFJLENBQ2YsSUFBSSxNQUFNLENBQUMsa0JBQWtCLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUN4RSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUMzRCxDQUNELENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLFlBQVkscURBQTRDLEVBQUUsQ0FBQztZQUM5RCxXQUFXLENBQUMsSUFBSSxDQUNmLElBQUksTUFBTSxDQUNULGtCQUFrQixFQUNsQixRQUFRLENBQUMsa0JBQWtCLEVBQUUsMEJBQTBCLENBQUMsRUFDeEQsU0FBUyxFQUNULFNBQVMsRUFDVCxLQUFLLElBQUksRUFBRTtnQkFDVixNQUFNLE9BQU8sR0FBZ0MsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FDcEYsd0JBQXdCLEVBQ3hCLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUNyQixDQUFBO2dCQUNELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZCxPQUFNO2dCQUNQLENBQUM7Z0JBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDakMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO29CQUNwQixPQUFPLEVBQUU7d0JBQ1I7NEJBQ0MsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTOzRCQUM1QixZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7NEJBQ2xDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO3lCQUMxQjtxQkFDRDtpQkFDRCxDQUFDLENBQUE7WUFDSCxDQUFDLENBQ0QsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksVUFBVSxJQUFJLGFBQWEsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztZQUMzRCxXQUFXLENBQUMsSUFBSSxDQUNmLElBQUksTUFBTSxDQUNULDRCQUE0QixFQUM1QixRQUFRLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxFQUN0QyxTQUFTLEVBQ1QsU0FBUyxFQUNULEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQ2pGLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxXQUFXLENBQUMsSUFBSSxDQUNmLElBQUksTUFBTSxDQUNULHVCQUF1QixFQUN2QixRQUFRLENBQUMsYUFBYSxFQUFFLHlCQUF5QixDQUFDLEVBQ2xELFNBQVMsRUFDVCxTQUFTLEVBQ1QsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FDbEYsQ0FDRCxDQUFBO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUN0RSxPQUFPO1lBQ04sTUFBTSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQztZQUNoRCxPQUFPO2dCQUNOLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBQ3hDLENBQUM7U0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLHlCQUF5QixDQUFDLElBQXNCLEVBQUUsWUFBb0I7UUFDN0UsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FDMUQseUJBQXlCLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUM3QyxDQUFBO1FBRUQsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMvRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLGNBQWMsRUFBRTtZQUNuRixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLEdBQUc7U0FDSCxDQUFDLENBQUE7UUFDRixPQUFPLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7Q0FDRCxDQUFBO0FBNVFjLGlCQUFpQjtJQXNCN0IsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLFlBQVksQ0FBQTtHQTdCQSxpQkFBaUIsQ0E0US9CO0FBV0QsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxpQkFBaUI7SUFDckQsWUFDQyxLQUdHLEVBQ0gsT0FBZ0IsRUFDaEIsS0FBaUIsRUFDRyxpQkFBcUMsRUFDM0MsV0FBeUIsRUFDbEIsa0JBQXVDLEVBQzNDLGNBQStCLEVBQ3pCLG9CQUEyQyxFQUM3QyxrQkFBdUMsRUFDeEMsaUJBQXFDLEVBQzNDLFdBQXlCLEVBQ0YsaUJBQXFDO1FBRTFFLEtBQUssQ0FDSixLQUFLLEVBQ0wsT0FBTyxFQUNQLEtBQUssRUFDTCxpQkFBaUIsRUFDakIsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixjQUFjLEVBQ2Qsb0JBQW9CLEVBQ3BCLGtCQUFrQixFQUNsQixpQkFBaUIsRUFDakIsV0FBVyxDQUNYLENBQUE7UUFkb0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtJQWUzRSxDQUFDO0lBRWUscUJBQXFCO1FBQ3BDLE1BQU0sVUFBVSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDeEMsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUM5QjtRQUFBO1lBQ0EsRUFBRSxNQUFNLGtDQUEwQixFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxFQUFFO1lBQ3RGO2dCQUNDLE1BQU0sdUNBQStCO2dCQUNyQyxLQUFLLEVBQUUsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDZCQUE2QixDQUFDO2FBQzVFO1lBQ0QsRUFBRSxNQUFNLG9DQUE0QixFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsRUFBRTtTQUM1RixDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUM3QixDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUM3RSxDQUFBO1lBQ0QsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixVQUFVLENBQUMsSUFBSSxDQUNkLElBQUksTUFBTSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FDdEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FDcEIsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTFFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUMvQixDQUFDLFFBQVEsRUFBaUIsRUFBRSxDQUFDLENBQUM7WUFDN0IsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUs7WUFDdEMsUUFBUTtZQUNSLE1BQU0sRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVE7U0FDNUQsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLGlCQUFpQixHQUFHLENBQUMsS0FBdUIsRUFBRSxFQUFFO1lBQ3JELE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO1lBQzVDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQzFCLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ2hGLENBQUM7WUFFRCxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLENBQUMsQ0FBQTtRQUVELElBQUksU0FBUyxFQUNaLFNBQVMsR0FBRyxJQUFJLENBQUE7UUFDakIsT0FBTyxDQUFDLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUN2RSxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDckIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtvQkFDbEYsUUFBUSxDQUFDLFlBQVksR0FBRyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQTtvQkFDMUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQTtnQkFDM0MsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFNBQVMsR0FBRyxLQUFLLENBQUE7Z0JBQ2xCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDdkIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFBO1lBQy9CLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQTtZQUMvQixPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3hFLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxZQUFZLEdBQWMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUU7WUFDMUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ2xGLFVBQVUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdkIsSUFBSSxLQUFLLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3BDLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDOUIsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDZixLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDM0IsQ0FBQztZQUVELE9BQU8sSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUUsQ0FBQyxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsTUFBTSxHQUFHLG9CQUFvQixDQUFBO1FBQzNELElBQUksUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xCLFlBQVksR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1lBQzFELFlBQVksQ0FBQyxJQUFJLENBQ2hCLElBQUksTUFBTSxDQUNULHlCQUF5QixFQUN6QixRQUFRLENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLEVBQzVELFNBQVMsRUFDVCxTQUFTLEVBQ1QsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FDaEMsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFBO0lBQ2pHLENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQTBCO1FBQ2xELE1BQU0sTUFBTSxHQUFHLENBQTJCLEtBQVUsRUFBRSxLQUFhLEVBQUUsRUFBRSxDQUN0RSxJQUFJLE9BQU8sQ0FBZ0IsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUN0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1lBQ3pDLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsRUFBSyxDQUFDLENBQUE7WUFDekUsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7WUFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7WUFDbEIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtnQkFDbkIsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNsQixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDdEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUNELFdBQVcsQ0FBQyxHQUFHLENBQ2QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3JCLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzlCLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN0QixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0QsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ1osQ0FBQyxDQUFDLENBQUE7UUFFSCxNQUFNLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FDeEIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLEtBQUssRUFBRSxZQUFZO1lBQ25CLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSTtZQUNuQixNQUFNLEVBQUUsUUFBUSxDQUFDLFVBQVU7U0FDM0IsQ0FBQyxDQUFDLEVBQ0gsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHNCQUFzQixDQUFDLENBQ25ELENBQUE7UUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN0RSxJQUFJLENBQUM7WUFDSixDQUFDO1lBQUEsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBO1FBQ25ELENBQUM7Z0JBQVMsQ0FBQztZQUNWLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF0S0ssc0JBQXNCO0lBUXpCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsWUFBQSxZQUFZLENBQUE7SUFDWixZQUFBLGtCQUFrQixDQUFBO0dBaEJmLHNCQUFzQixDQXNLM0I7QUFFRCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLGlCQUFpQjtJQUN0RCxZQUNDLElBQW1DLEVBQ25DLFVBQXNDLEVBQ3RDLEtBQWlCLEVBQ2pCLE9BQWdCLEVBQ0ksaUJBQXFDLEVBQzNDLFdBQXlCLEVBQ3RCLGNBQStCLEVBQzNCLGtCQUF1QyxFQUNyQyxvQkFBMkMsRUFDN0MsWUFBaUMsRUFDbEMsaUJBQXFDLEVBQzNDLFdBQXlCO1FBRXZDLEtBQUssQ0FDSixDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQ3RCLE9BQU8sRUFDUCxLQUFLLEVBQ0wsaUJBQWlCLEVBQ2pCLFdBQVcsRUFDWCxrQkFBa0IsRUFDbEIsY0FBYyxFQUNkLG9CQUFvQixFQUNwQixZQUFZLEVBQ1osaUJBQWlCLEVBQ2pCLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQztJQUVRLHFCQUFxQjtRQUM3QixPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7Q0FDRCxDQUFBO0FBakNLLHVCQUF1QjtJQU0xQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixZQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFlBQUEsWUFBWSxDQUFBO0dBYlQsdUJBQXVCLENBaUM1QjtBQUVELE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQTtBQUUvQixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjs7YUFDSCxvQkFBZSxHQUFHLDZCQUE2QixBQUFoQyxDQUFnQzthQUMvQyxpQkFBWSxHQUFHLGVBQWUsWUFBWSxFQUFFLEVBQUUsQUFBbEMsQ0FBa0M7SUFTckUsWUFDaUIsV0FBeUIsRUFDeEIsVUFBMkIsRUFDNUMsU0FBcUIsRUFDRCxVQUErQyxFQUMvQyxhQUFpQztRQUpyQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN4QixlQUFVLEdBQVYsVUFBVSxDQUFpQjtRQUVQLGVBQVUsR0FBVixVQUFVLENBQW9CO1FBWDdELE9BQUUsR0FBRyxFQUFFLENBQUE7UUFLRyxtQkFBYyxHQUFHLGlDQUFpQyxZQUFZLEVBQUUsRUFBRSxDQUFBO1FBU2xGLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxRQUFTLENBQUE7UUFDdEMsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUE7UUFDakMsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQTtRQUVuQyxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsd0JBQXdCLENBQUMsdUJBQXFCLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hHLE9BQU8sQ0FBQyxZQUFZO1lBQ25CLE9BQU8sT0FBTyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtRQUNqRixPQUFPLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQSxDQUFDLDZEQUE2RDtRQUNqRixPQUFPLENBQUMsU0FBUyxHQUFHLG1DQUFtQyxRQUFRLEVBQUUsQ0FBQTtRQUNqRSxPQUFPLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtRQUMxQixPQUFPLENBQUMsVUFBVSw2REFBcUQsQ0FBQTtRQUN2RSxPQUFPLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFBO1FBRXBDLElBQUksVUFBVSxHQUFHLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDM0UsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLHlCQUF5QixFQUFFLENBQUM7WUFDbkQsVUFBVSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLHlCQUF5QixHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtRQUN0RSxDQUFDO1FBRUQsT0FBTyxDQUFDLEtBQUssR0FBRztZQUNmLE9BQU8sRUFBRSxVQUFVO1lBQ25CLGVBQWUsRUFBRSw0REFBNEQsUUFBUSxJQUFJLElBQUksQ0FBQyxjQUFjLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1NBQzNLLENBQUE7UUFDRCxPQUFPLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQTtRQUU5QixNQUFNLFVBQVUsR0FBRyxRQUFRLGtDQUEwQixDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUE7UUFFOUYsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsYUFBYSxHQUFHO2dCQUN2QixLQUFLLEVBQUUsZ0JBQWdCLENBQUMsVUFBVSxDQUFDO2dCQUNuQyxRQUFRLEVBQUUsaUJBQWlCLENBQUMsS0FBSzthQUNqQyxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUE7UUFDckUsSUFBSSxDQUFDLGdCQUFnQixHQUFHO1lBQ3ZCLE9BQU87WUFDUCxLQUFLLEVBQUU7Z0JBQ04sZUFBZSxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUMxQixXQUFXLEVBQUUsTUFBTTtnQkFDbkIsU0FBUyxFQUFFLE1BQU07Z0JBQ2pCLGFBQWEsRUFBRSxJQUFJLENBQUMsSUFBSTthQUN4QjtTQUNELENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLENBQW9CO1FBQ3pCLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN6QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUMvRCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDekMsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELHFCQUFxQjtRQUNwQixPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxFQUFFLENBQUE7SUFDekMsQ0FBQzs7QUFuRkkscUJBQXFCO0lBZXhCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxrQkFBa0IsQ0FBQTtHQWhCZixxQkFBcUIsQ0FvRjFCO0FBRUQsTUFBTSwyQkFBMkIsR0FBRyxFQUFFLENBQUE7QUFFdEMsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVO0lBYzlDLElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUE7SUFDaEMsQ0FBQztJQUVELFlBQ2tCLE1BQW1CLEVBQzVCLFFBQWtCLEVBQ1YsT0FBMEIsRUFDMUIsVUFBMEIsRUFDMUMsR0FBUSxFQUNZLFVBQXVDO1FBRTNELEtBQUssRUFBRSxDQUFBO1FBUFUsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUM1QixhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ1YsWUFBTyxHQUFQLE9BQU8sQ0FBbUI7UUFDMUIsZUFBVSxHQUFWLFVBQVUsQ0FBZ0I7UUFFYixlQUFVLEdBQVYsVUFBVSxDQUFvQjtRQXZCM0MsT0FBRSxHQUFHLFlBQVksRUFBRSxDQUFBO1FBRXBDLGtCQUFrQjtRQUNGLHdCQUFtQixHQUFHLEtBQUssQ0FBQTtRQUUxQixTQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQywrQkFBK0IsRUFBRTtZQUM5RCxHQUFHLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixFQUFFO2dCQUN4QixHQUFHLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO2dCQUN4QixHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sU0FBUyxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLGdDQUF5QixDQUFDLEVBQUUsQ0FBQztnQkFDMUYsR0FBRyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQzthQUMxQixDQUFDO1NBQ0YsQ0FBQyxDQUFBO1FBZ0JELE1BQU0sWUFBWSxHQUFHLEdBQUcsRUFBRTtZQUN6QixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsU0FBUyxrQ0FBeUIsQ0FBQTtZQUM1RCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLENBQUMsVUFBVSxHQUFHLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQTtRQUN2RixDQUFDLENBQUE7UUFFRCxZQUFZLEVBQUUsQ0FBQTtRQUNkLElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDckMsSUFBSSxDQUFDLENBQUMsVUFBVSxrQ0FBeUIsRUFBRSxDQUFDO2dCQUMzQyxZQUFZLEVBQUUsQ0FBQTtZQUNmLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxJQUFZLENBQUE7UUFDaEIsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLFNBQVMsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3BFLElBQUksR0FBRyxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sY0FBYyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFBO1FBQ3BJLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLEdBQUcsdUJBQXVCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3BELE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDNUIsSUFBSSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMxQyxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDOUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDNUIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ25CLENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxJQUFJLEdBQUcsMkJBQTJCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BELElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNsQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDekMsTUFBTSxTQUFTLEdBQUcsT0FBTyxZQUFZLGNBQWMsSUFBSSxPQUFPLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQTtnQkFDbEYsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDekQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxJQUFJLGFBQWEsQ0FBQTtRQUVoRCxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLDRCQUE0QixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3pFLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQy9CLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsQ0FBQyxZQUFZLENBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDL0MsR0FBRyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFeEMsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyw0QkFBNEIsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNoRixTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFBO1FBQy9ELEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFckIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRWhDLElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUN6QyxTQUFRO2dCQUNULENBQUM7Z0JBQ0QsSUFDQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQztvQkFDNUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUs7d0JBQ3JCLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWU7d0JBQ2hFLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUM3RCxDQUFDO29CQUNGLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQ3hELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQSxDQUFDLE9BQU87Z0JBQ3ZCLENBQUM7Z0JBRUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUN0RixJQUFJLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDbEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDdEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUVNLEtBQUs7UUFDWCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUE7SUFDZixDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ3RCLENBQUM7SUFFTSxXQUFXO1FBQ2pCLE9BQU87WUFDTixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsVUFBVSxFQUFFLCtDQUF1QztTQUNuRCxDQUFBO0lBQ0YsQ0FBQztJQUVELFdBQVcsQ0FDVixTQUFpRCxFQUNqRCxVQUFtRDtRQUVuRCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sRUFBRSxzQkFBc0IsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUE7WUFDOUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQTtZQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLEdBQUcsV0FBVyxHQUFHLHNCQUFzQixHQUFHLFVBQVUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxJQUFJLENBQUE7UUFDcEcsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBdklLLHNCQUFzQjtJQXdCekIsV0FBQSxrQkFBa0IsQ0FBQTtHQXhCZixzQkFBc0IsQ0F1STNCIn0=
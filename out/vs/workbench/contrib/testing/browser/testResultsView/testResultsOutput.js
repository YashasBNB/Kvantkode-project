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
import * as dom from '../../../../../base/browser/dom.js';
import { Delayer } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, DisposableStore, MutableDisposable, combinedDisposable, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { CodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EmbeddedCodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { DiffEditorWidget } from '../../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { EmbeddedDiffEditorWidget } from '../../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ITextModelService, } from '../../../../../editor/common/services/resolverService.js';
import { peekViewResultsBackground } from '../../../../../editor/contrib/peekView/browser/peekView.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalCapabilityStore } from '../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { formatMessageForTerminal } from '../../../../../platform/terminal/common/terminalStrings.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { EditorModel } from '../../../../common/editor/editorModel.js';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from '../../../../common/theme.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { DetachedProcessInfo } from '../../../terminal/browser/detachedTerminal.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { getXtermScaledDimensions } from '../../../terminal/browser/xterm/xtermTerminal.js';
import { TERMINAL_BACKGROUND_COLOR } from '../../../terminal/common/terminalColorRegistry.js';
import { colorizeTestMessageInEditor } from '../testMessageColorizer.js';
import { MessageSubject, TaskSubject, TestOutputSubject, } from './testResultsSubject.js';
import { MutableObservableValue } from '../../common/observableValue.js';
import { LiveTestResult, } from '../../common/testResult.js';
import { ITestMessage, getMarkId } from '../../common/testTypes.js';
import { CALL_STACK_WIDGET_HEADER_HEIGHT } from '../../../debug/browser/callStackWidget.js';
class SimpleDiffEditorModel extends EditorModel {
    constructor(_original, _modified) {
        super();
        this._original = _original;
        this._modified = _modified;
        this.original = this._original.object.textEditorModel;
        this.modified = this._modified.object.textEditorModel;
    }
    dispose() {
        super.dispose();
        this._original.dispose();
        this._modified.dispose();
    }
}
const commonEditorOptions = {
    scrollBeyondLastLine: false,
    links: true,
    lineNumbers: 'off',
    glyphMargin: false,
    scrollbar: {
        vertical: 'hidden',
        horizontal: 'auto',
        useShadows: false,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        handleMouseWheel: false,
    },
    overviewRulerLanes: 0,
    fixedOverflowWidgets: true,
    readOnly: true,
    stickyScroll: { enabled: false },
    minimap: { enabled: false },
    automaticLayout: false,
};
const diffEditorOptions = {
    ...commonEditorOptions,
    enableSplitViewResizing: true,
    isInEmbeddedEditor: true,
    renderOverviewRuler: false,
    ignoreTrimWhitespace: false,
    renderSideBySide: true,
    useInlineViewWhenSpaceIsLimited: false,
    originalAriaLabel: localize('testingOutputExpected', 'Expected result'),
    modifiedAriaLabel: localize('testingOutputActual', 'Actual result'),
    diffAlgorithm: 'advanced',
};
let DiffContentProvider = class DiffContentProvider extends Disposable {
    get onDidContentSizeChange() {
        return this.widget.value?.onDidContentSizeChange || Event.None;
    }
    constructor(editor, container, instantiationService, modelService) {
        super();
        this.editor = editor;
        this.container = container;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.widget = this._register(new MutableDisposable());
        this.model = this._register(new MutableDisposable());
    }
    async update(subject) {
        if (!(subject instanceof MessageSubject)) {
            this.clear();
            return false;
        }
        const message = subject.message;
        if (!ITestMessage.isDiffable(message)) {
            this.clear();
            return false;
        }
        const [original, modified] = await Promise.all([
            this.modelService.createModelReference(subject.expectedUri),
            this.modelService.createModelReference(subject.actualUri),
        ]);
        const model = (this.model.value = new SimpleDiffEditorModel(original, modified));
        if (!this.widget.value) {
            this.widget.value = this.editor
                ? this.instantiationService.createInstance(EmbeddedDiffEditorWidget, this.container, diffEditorOptions, {}, this.editor)
                : this.instantiationService.createInstance(DiffEditorWidget, this.container, diffEditorOptions, {});
            if (this.dimension) {
                this.widget.value.layout(this.dimension);
            }
        }
        this.widget.value.setModel(model);
        this.widget.value.updateOptions(this.getOptions(isMultiline(message.expected) || isMultiline(message.actual)));
        return true;
    }
    clear() {
        this.model.clear();
        this.widget.clear();
    }
    layout(dimensions, hasMultipleFrames) {
        this.dimension = dimensions;
        const editor = this.widget.value;
        if (!editor) {
            return;
        }
        editor.layout(dimensions);
        const height = Math.max(editor.getOriginalEditor().getContentHeight(), editor.getModifiedEditor().getContentHeight());
        this.helper = new ScrollHelper(hasMultipleFrames, height, dimensions.height);
        return height;
    }
    onScrolled(evt) {
        this.helper?.onScrolled(evt, this.widget.value?.getDomNode(), this.widget.value?.getOriginalEditor());
    }
    getOptions(isMultiline) {
        return isMultiline
            ? { ...diffEditorOptions, lineNumbers: 'on' }
            : { ...diffEditorOptions, lineNumbers: 'off' };
    }
};
DiffContentProvider = __decorate([
    __param(2, IInstantiationService),
    __param(3, ITextModelService)
], DiffContentProvider);
export { DiffContentProvider };
let MarkdownTestMessagePeek = class MarkdownTestMessagePeek extends Disposable {
    constructor(container, instantiationService) {
        super();
        this.container = container;
        this.instantiationService = instantiationService;
        this.markdown = new Lazy(() => this.instantiationService.createInstance(MarkdownRenderer, {}));
        this.rendered = this._register(new DisposableStore());
        this._register(toDisposable(() => this.clear()));
    }
    async update(subject) {
        this.clear();
        if (!(subject instanceof MessageSubject)) {
            return false;
        }
        const message = subject.message;
        if (ITestMessage.isDiffable(message) || typeof message.message === 'string') {
            return false;
        }
        const rendered = this.rendered.add(this.markdown.value.render(message.message, {}));
        rendered.element.style.userSelect = 'text';
        rendered.element.classList.add('preview-text');
        this.container.appendChild(rendered.element);
        this.element = rendered.element;
        this.rendered.add(toDisposable(() => rendered.element.remove()));
        return true;
    }
    layout(dimension) {
        if (!this.element) {
            return undefined;
        }
        this.element.style.width = `${dimension.width - 32}px`;
        return this.element.clientHeight;
    }
    clear() {
        this.rendered.clear();
        this.element = undefined;
    }
};
MarkdownTestMessagePeek = __decorate([
    __param(1, IInstantiationService)
], MarkdownTestMessagePeek);
export { MarkdownTestMessagePeek };
class ScrollHelper {
    constructor(hasMultipleFrames, contentHeight, viewHeight) {
        this.hasMultipleFrames = hasMultipleFrames;
        this.contentHeight = contentHeight;
        this.viewHeight = viewHeight;
    }
    onScrolled(evt, container, editor) {
        if (!editor || !container) {
            return;
        }
        let delta = Math.max(0, evt.scrollTop - (this.hasMultipleFrames ? CALL_STACK_WIDGET_HEADER_HEIGHT : 0));
        delta = Math.min(Math.max(0, this.contentHeight - this.viewHeight), delta);
        editor.setScrollTop(delta);
        container.style.transform = `translateY(${delta}px)`;
    }
}
let PlainTextMessagePeek = class PlainTextMessagePeek extends Disposable {
    get onDidContentSizeChange() {
        return this.widget.value?.onDidContentSizeChange || Event.None;
    }
    constructor(editor, container, instantiationService, modelService) {
        super();
        this.editor = editor;
        this.container = container;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.widgetDecorations = this._register(new MutableDisposable());
        this.widget = this._register(new MutableDisposable());
        this.model = this._register(new MutableDisposable());
    }
    async update(subject) {
        if (!(subject instanceof MessageSubject)) {
            this.clear();
            return false;
        }
        const message = subject.message;
        if (ITestMessage.isDiffable(message) ||
            message.type === 1 /* TestMessageType.Output */ ||
            typeof message.message !== 'string') {
            this.clear();
            return false;
        }
        const modelRef = (this.model.value = await this.modelService.createModelReference(subject.messageUri));
        if (!this.widget.value) {
            this.widget.value = this.editor
                ? this.instantiationService.createInstance(EmbeddedCodeEditorWidget, this.container, commonEditorOptions, {}, this.editor)
                : this.instantiationService.createInstance(CodeEditorWidget, this.container, commonEditorOptions, { isSimpleWidget: true });
            if (this.dimension) {
                this.widget.value.layout(this.dimension);
            }
        }
        this.widget.value.setModel(modelRef.object.textEditorModel);
        this.widget.value.updateOptions(commonEditorOptions);
        this.widgetDecorations.value = colorizeTestMessageInEditor(message.message, this.widget.value);
        return true;
    }
    clear() {
        this.widgetDecorations.clear();
        this.widget.clear();
        this.model.clear();
    }
    onScrolled(evt) {
        this.helper?.onScrolled(evt, this.widget.value?.getDomNode(), this.widget.value);
    }
    layout(dimensions, hasMultipleFrames) {
        this.dimension = dimensions;
        const editor = this.widget.value;
        if (!editor) {
            return;
        }
        editor.layout(dimensions);
        const height = editor.getContentHeight();
        this.helper = new ScrollHelper(hasMultipleFrames, height, dimensions.height);
        return height;
    }
};
PlainTextMessagePeek = __decorate([
    __param(2, IInstantiationService),
    __param(3, ITextModelService)
], PlainTextMessagePeek);
export { PlainTextMessagePeek };
let TerminalMessagePeek = class TerminalMessagePeek extends Disposable {
    constructor(container, isInPeekView, terminalService, viewDescriptorService, workspaceContext) {
        super();
        this.container = container;
        this.isInPeekView = isInPeekView;
        this.terminalService = terminalService;
        this.viewDescriptorService = viewDescriptorService;
        this.workspaceContext = workspaceContext;
        this.terminalCwd = this._register(new MutableObservableValue(''));
        this.xtermLayoutDelayer = this._register(new Delayer(50));
        /** Active terminal instance. */
        this.terminal = this._register(new MutableDisposable());
        /** Listener for streaming result data */
        this.outputDataListener = this._register(new MutableDisposable());
    }
    async makeTerminal() {
        const prev = this.terminal.value;
        if (prev) {
            prev.xterm.clearBuffer();
            prev.xterm.clearSearchDecorations();
            // clearBuffer tries to retain the prompt. Reset prompt, scrolling state, etc.
            prev.xterm.write(`\x1bc`);
            return prev;
        }
        const capabilities = new TerminalCapabilityStore();
        const cwd = this.terminalCwd;
        capabilities.add(0 /* TerminalCapability.CwdDetection */, {
            type: 0 /* TerminalCapability.CwdDetection */,
            get cwds() {
                return [cwd.value];
            },
            onDidChangeCwd: cwd.onDidChange,
            getCwd: () => cwd.value,
            updateCwd: () => { },
        });
        return (this.terminal.value = await this.terminalService.createDetachedTerminal({
            rows: 10,
            cols: 80,
            readonly: true,
            capabilities,
            processInfo: new DetachedProcessInfo({ initialCwd: cwd.value }),
            colorProvider: {
                getBackgroundColor: (theme) => {
                    const terminalBackground = theme.getColor(TERMINAL_BACKGROUND_COLOR);
                    if (terminalBackground) {
                        return terminalBackground;
                    }
                    if (this.isInPeekView) {
                        return theme.getColor(peekViewResultsBackground);
                    }
                    const location = this.viewDescriptorService.getViewLocationById("workbench.panel.testResults.view" /* Testing.ResultsViewId */);
                    return location === 1 /* ViewContainerLocation.Panel */
                        ? theme.getColor(PANEL_BACKGROUND)
                        : theme.getColor(SIDE_BAR_BACKGROUND);
                },
            },
        }));
    }
    async update(subject) {
        this.outputDataListener.clear();
        if (subject instanceof TaskSubject) {
            await this.updateForTaskSubject(subject);
        }
        else if (subject instanceof TestOutputSubject ||
            (subject instanceof MessageSubject && subject.message.type === 1 /* TestMessageType.Output */)) {
            await this.updateForTestSubject(subject);
        }
        else {
            this.clear();
            return false;
        }
        return true;
    }
    async updateForTestSubject(subject) {
        const that = this;
        const testItem = subject instanceof TestOutputSubject ? subject.test.item : subject.test;
        const terminal = await this.updateGenerically({
            subject,
            noOutputMessage: localize('caseNoOutput', 'The test case did not report any output.'),
            getTarget: (result) => result?.tasks[subject.taskIndex].output,
            *doInitialWrite(output, results) {
                that.updateCwd(testItem.uri);
                const state = subject instanceof TestOutputSubject ? subject.test : results.getStateById(testItem.extId);
                if (!state) {
                    return;
                }
                for (const message of state.tasks[subject.taskIndex].messages) {
                    if (message.type === 1 /* TestMessageType.Output */) {
                        yield* output.getRangeIter(message.offset, message.length);
                    }
                }
            },
            doListenForMoreData: (output, result, write) => result.onChange((e) => {
                if (e.reason === 2 /* TestResultItemChangeReason.NewMessage */ &&
                    e.item.item.extId === testItem.extId &&
                    e.message.type === 1 /* TestMessageType.Output */) {
                    for (const chunk of output.getRangeIter(e.message.offset, e.message.length)) {
                        write(chunk.buffer);
                    }
                }
            }),
        });
        if (subject instanceof MessageSubject &&
            subject.message.type === 1 /* TestMessageType.Output */ &&
            subject.message.marker !== undefined) {
            terminal?.xterm.selectMarkedRange(getMarkId(subject.message.marker, true), getMarkId(subject.message.marker, false), 
            /* scrollIntoView= */ true);
        }
    }
    updateForTaskSubject(subject) {
        return this.updateGenerically({
            subject,
            noOutputMessage: localize('runNoOutput', 'The test run did not record any output.'),
            getTarget: (result) => result?.tasks[subject.taskIndex],
            doInitialWrite: (task, result) => {
                // Update the cwd and use the first test to try to hint at the correct cwd,
                // but often this will fall back to the first workspace folder.
                this.updateCwd(Iterable.find(result.tests, (t) => !!t.item.uri)?.item.uri);
                return task.output.buffers;
            },
            doListenForMoreData: (task, _result, write) => task.output.onDidWriteData((e) => write(e.buffer)),
        });
    }
    async updateGenerically(opts) {
        const result = opts.subject.result;
        const target = opts.getTarget(result);
        if (!target) {
            return this.clear();
        }
        const terminal = await this.makeTerminal();
        let didWriteData = false;
        const pendingWrites = new MutableObservableValue(0);
        if (result instanceof LiveTestResult) {
            for (const chunk of opts.doInitialWrite(target, result)) {
                didWriteData ||= chunk.byteLength > 0;
                pendingWrites.value++;
                terminal.xterm.write(chunk.buffer, () => pendingWrites.value--);
            }
        }
        else {
            didWriteData = true;
            this.writeNotice(terminal, localize('runNoOutputForPast', 'Test output is only available for new test runs.'));
        }
        this.attachTerminalToDom(terminal);
        this.outputDataListener.clear();
        if (result instanceof LiveTestResult && !result.completedAt) {
            const l1 = result.onComplete(() => {
                if (!didWriteData) {
                    this.writeNotice(terminal, opts.noOutputMessage);
                }
            });
            const l2 = opts.doListenForMoreData(target, result, (data) => {
                terminal.xterm.write(data);
                didWriteData ||= data.byteLength > 0;
            });
            this.outputDataListener.value = combinedDisposable(l1, l2);
        }
        if (!this.outputDataListener.value && !didWriteData) {
            this.writeNotice(terminal, opts.noOutputMessage);
        }
        // Ensure pending writes finish, otherwise the selection in `updateForTestSubject`
        // can happen before the markers are processed.
        if (pendingWrites.value > 0) {
            await new Promise((resolve) => {
                const l = pendingWrites.onDidChange(() => {
                    if (pendingWrites.value === 0) {
                        l.dispose();
                        resolve();
                    }
                });
            });
        }
        return terminal;
    }
    updateCwd(testUri) {
        const wf = (testUri && this.workspaceContext.getWorkspaceFolder(testUri)) ||
            this.workspaceContext.getWorkspace().folders[0];
        if (wf) {
            this.terminalCwd.value = wf.uri.fsPath;
        }
    }
    writeNotice(terminal, str) {
        terminal.xterm.write(formatMessageForTerminal(str));
    }
    attachTerminalToDom(terminal) {
        terminal.xterm.write('\x1b[?25l'); // hide cursor
        dom.scheduleAtNextAnimationFrame(dom.getWindow(this.container), () => this.layoutTerminal(terminal));
        terminal.attachToElement(this.container, { enableGpu: false });
    }
    clear() {
        this.outputDataListener.clear();
        this.xtermLayoutDelayer.cancel();
        this.terminal.clear();
    }
    layout(dimensions) {
        this.dimensions = dimensions;
        if (this.terminal.value) {
            this.layoutTerminal(this.terminal.value, dimensions.width, dimensions.height);
            return dimensions.height;
        }
        return undefined;
    }
    layoutTerminal({ xterm }, width = this.dimensions?.width ?? this.container.clientWidth, height = this.dimensions?.height ?? this.container.clientHeight) {
        width -= 10 + 20; // scrollbar width + margin
        this.xtermLayoutDelayer.trigger(() => {
            const scaled = getXtermScaledDimensions(dom.getWindow(this.container), xterm.getFont(), width, height);
            if (scaled) {
                xterm.resize(scaled.cols, scaled.rows);
            }
        });
    }
};
TerminalMessagePeek = __decorate([
    __param(2, ITerminalService),
    __param(3, IViewDescriptorService),
    __param(4, IWorkspaceContextService)
], TerminalMessagePeek);
export { TerminalMessagePeek };
const isMultiline = (str) => !!str && str.includes('\n');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNPdXRwdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdFJlc3VsdHNWaWV3L3Rlc3RSZXN1bHRzT3V0cHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDakUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUdmLGlCQUFpQixFQUNqQixrQkFBa0IsRUFDbEIsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFNaEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDdEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDdEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUZBQW1GLENBQUE7QUFLcEgsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNo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
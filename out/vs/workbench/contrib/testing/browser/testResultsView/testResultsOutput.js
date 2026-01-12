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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNPdXRwdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0UmVzdWx0c1ZpZXcvdGVzdFJlc3VsdHNPdXRwdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBR2YsaUJBQWlCLEVBQ2pCLGtCQUFrQixFQUNsQixZQUFZLEdBQ1osTUFBTSx5Q0FBeUMsQ0FBQTtBQU1oRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUN0SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUN0SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQTtBQUtwSCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDdEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFB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
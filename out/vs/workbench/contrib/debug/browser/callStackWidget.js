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
var FrameCodeRenderer_1, MissingCodeRenderer_1, SkippedRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { assertNever } from '../../../../base/common/assert.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableValue, transaction, } from '../../../../base/common/observable.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ClickLinkGesture, } from '../../../../editor/contrib/gotoSymbol/browser/link/clickLinkGesture.js';
import { localize, localize2 } from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { ResourceLabel } from '../../../browser/labels.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { makeStackFrameColumnDecoration, TOP_STACK_FRAME_DECORATION, } from './callStackEditorContribution.js';
import './media/callStackWidget.css';
export class CallStackFrame {
    constructor(name, source, line = 1, column = 1) {
        this.name = name;
        this.source = source;
        this.line = line;
        this.column = column;
    }
}
export class SkippedCallFrames {
    constructor(label, load) {
        this.label = label;
        this.load = load;
    }
}
export class CustomStackFrame {
    constructor() {
        this.showHeader = observableValue('CustomStackFrame.showHeader', true);
    }
}
class WrappedCallStackFrame extends CallStackFrame {
    constructor(original) {
        super(original.name, original.source, original.line, original.column);
        this.editorHeight = observableValue('WrappedCallStackFrame.height', this.source ? 100 : 0);
        this.collapsed = observableValue('WrappedCallStackFrame.collapsed', false);
        this.height = derived((reader) => {
            return this.collapsed.read(reader)
                ? CALL_STACK_WIDGET_HEADER_HEIGHT
                : CALL_STACK_WIDGET_HEADER_HEIGHT + this.editorHeight.read(reader);
        });
    }
}
class WrappedCustomStackFrame {
    constructor(original) {
        this.original = original;
        this.collapsed = observableValue('WrappedCallStackFrame.collapsed', false);
        this.height = derived((reader) => {
            const headerHeight = this.original.showHeader.read(reader) ? CALL_STACK_WIDGET_HEADER_HEIGHT : 0;
            return this.collapsed.read(reader)
                ? headerHeight
                : headerHeight + this.original.height.read(reader);
        });
    }
}
const isFrameLike = (item) => item instanceof WrappedCallStackFrame || item instanceof WrappedCustomStackFrame;
const WIDGET_CLASS_NAME = 'multiCallStackWidget';
/**
 * A reusable widget that displays a call stack as a series of editors. Note
 * that this both used in debug's exception widget as well as in the testing
 * call stack view.
 */
let CallStackWidget = class CallStackWidget extends Disposable {
    get onDidChangeContentHeight() {
        return this.list.onDidChangeContentHeight;
    }
    get onDidScroll() {
        return this.list.onDidScroll;
    }
    get contentHeight() {
        return this.list.contentHeight;
    }
    constructor(container, containingEditor, instantiationService) {
        super();
        this.layoutEmitter = this._register(new Emitter());
        this.currentFramesDs = this._register(new DisposableStore());
        container.classList.add(WIDGET_CLASS_NAME);
        this._register(toDisposable(() => container.classList.remove(WIDGET_CLASS_NAME)));
        this.list = this._register(instantiationService.createInstance(WorkbenchList, 'TestResultStackWidget', container, new StackDelegate(), [
            instantiationService.createInstance(FrameCodeRenderer, containingEditor, this.layoutEmitter.event),
            instantiationService.createInstance(MissingCodeRenderer),
            instantiationService.createInstance(CustomRenderer),
            instantiationService.createInstance(SkippedRenderer, (i) => this.loadFrame(i)),
        ], {
            multipleSelectionSupport: false,
            mouseSupport: false,
            keyboardSupport: false,
            setRowLineHeight: false,
            alwaysConsumeMouseWheel: false,
            accessibilityProvider: instantiationService.createInstance(StackAccessibilityProvider),
        }));
    }
    /** Replaces the call frames display in the view. */
    setFrames(frames) {
        // cancel any existing load
        this.currentFramesDs.clear();
        this.cts = new CancellationTokenSource();
        this._register(toDisposable(() => this.cts.dispose(true)));
        this.list.splice(0, this.list.length, this.mapFrames(frames));
    }
    layout(height, width) {
        this.list.layout(height, width);
        this.layoutEmitter.fire();
    }
    collapseAll() {
        transaction((tx) => {
            for (let i = 0; i < this.list.length; i++) {
                const frame = this.list.element(i);
                if (isFrameLike(frame)) {
                    frame.collapsed.set(true, tx);
                }
            }
        });
    }
    async loadFrame(replacing) {
        if (!this.cts) {
            return;
        }
        const frames = await replacing.load(this.cts.token);
        if (this.cts.token.isCancellationRequested) {
            return;
        }
        const index = this.list.indexOf(replacing);
        this.list.splice(index, 1, this.mapFrames(frames));
    }
    mapFrames(frames) {
        const result = [];
        for (const frame of frames) {
            if (frame instanceof SkippedCallFrames) {
                result.push(frame);
                continue;
            }
            const wrapped = frame instanceof CustomStackFrame
                ? new WrappedCustomStackFrame(frame)
                : new WrappedCallStackFrame(frame);
            result.push(wrapped);
            this.currentFramesDs.add(autorun((reader) => {
                const height = wrapped.height.read(reader);
                const idx = this.list.indexOf(wrapped);
                if (idx !== -1) {
                    this.list.updateElementHeight(idx, height);
                }
            }));
        }
        return result;
    }
};
CallStackWidget = __decorate([
    __param(2, IInstantiationService)
], CallStackWidget);
export { CallStackWidget };
let StackAccessibilityProvider = class StackAccessibilityProvider {
    constructor(labelService) {
        this.labelService = labelService;
    }
    getAriaLabel(e) {
        if (e instanceof SkippedCallFrames) {
            return e.label;
        }
        if (e instanceof WrappedCustomStackFrame) {
            return e.original.label;
        }
        if (e instanceof CallStackFrame) {
            if (e.source && e.line) {
                return localize({
                    comment: ['{0} is an extension-defined label, then line number and filename'],
                    key: 'stackTraceLabel',
                }, '{0}, line {1} in {2}', e.name, e.line, this.labelService.getUriLabel(e.source, { relative: true }));
            }
            return e.name;
        }
        assertNever(e);
    }
    getWidgetAriaLabel() {
        return localize('stackTrace', 'Stack Trace');
    }
};
StackAccessibilityProvider = __decorate([
    __param(0, ILabelService)
], StackAccessibilityProvider);
class StackDelegate {
    getHeight(element) {
        if (element instanceof CallStackFrame || element instanceof WrappedCustomStackFrame) {
            return element.height.get();
        }
        if (element instanceof SkippedCallFrames) {
            return CALL_STACK_WIDGET_HEADER_HEIGHT;
        }
        assertNever(element);
    }
    getTemplateId(element) {
        if (element instanceof CallStackFrame) {
            return element.source ? FrameCodeRenderer.templateId : MissingCodeRenderer.templateId;
        }
        if (element instanceof SkippedCallFrames) {
            return SkippedRenderer.templateId;
        }
        if (element instanceof WrappedCustomStackFrame) {
            return CustomRenderer.templateId;
        }
        assertNever(element);
    }
}
const editorOptions = {
    scrollBeyondLastLine: false,
    scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
        handleMouseWheel: false,
        useShadows: false,
    },
    overviewRulerLanes: 0,
    fixedOverflowWidgets: true,
    overviewRulerBorder: false,
    stickyScroll: { enabled: false },
    minimap: { enabled: false },
    readOnly: true,
    automaticLayout: false,
};
const makeFrameElements = () => dom.h('div.multiCallStackFrame', [
    dom.h('div.header@header', [
        dom.h('div.collapse-button@collapseButton'),
        dom.h('div.title.show-file-icons@title'),
        dom.h('div.actions@actions'),
    ]),
    dom.h('div.editorParent', [dom.h('div.editorContainer@editor')]),
]);
export const CALL_STACK_WIDGET_HEADER_HEIGHT = 24;
let AbstractFrameRenderer = class AbstractFrameRenderer {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    renderTemplate(container) {
        const elements = makeFrameElements();
        container.appendChild(elements.root);
        const templateStore = new DisposableStore();
        container.classList.add('multiCallStackFrameContainer');
        templateStore.add(toDisposable(() => {
            container.classList.remove('multiCallStackFrameContainer');
            elements.root.remove();
        }));
        const label = templateStore.add(this.instantiationService.createInstance(ResourceLabel, elements.title, {}));
        const collapse = templateStore.add(new Button(elements.collapseButton, {}));
        const contentId = generateUuid();
        elements.editor.id = contentId;
        elements.editor.role = 'region';
        elements.collapseButton.setAttribute('aria-controls', contentId);
        return this.finishRenderTemplate({
            container,
            decorations: [],
            elements,
            label,
            collapse,
            elementStore: templateStore.add(new DisposableStore()),
            templateStore,
        });
    }
    renderElement(element, index, template, height) {
        const { elementStore } = template;
        elementStore.clear();
        const item = element;
        this.setupCollapseButton(item, template);
    }
    setupCollapseButton(item, { elementStore, elements, collapse }) {
        elementStore.add(autorun((reader) => {
            collapse.element.className = '';
            const collapsed = item.collapsed.read(reader);
            collapse.icon = collapsed ? Codicon.chevronRight : Codicon.chevronDown;
            collapse.element.ariaExpanded = String(!collapsed);
            elements.root.classList.toggle('collapsed', collapsed);
        }));
        const toggleCollapse = () => item.collapsed.set(!item.collapsed.get(), undefined);
        elementStore.add(collapse.onDidClick(toggleCollapse));
        elementStore.add(dom.addDisposableListener(elements.title, 'click', toggleCollapse));
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementStore.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateStore.dispose();
    }
};
AbstractFrameRenderer = __decorate([
    __param(0, IInstantiationService)
], AbstractFrameRenderer);
const CONTEXT_LINES = 2;
/** Renderer for a normal stack frame where code is available. */
let FrameCodeRenderer = class FrameCodeRenderer extends AbstractFrameRenderer {
    static { FrameCodeRenderer_1 = this; }
    static { this.templateId = 'f'; }
    constructor(containingEditor, onLayout, modelService, instantiationService) {
        super(instantiationService);
        this.containingEditor = containingEditor;
        this.onLayout = onLayout;
        this.modelService = modelService;
        this.templateId = FrameCodeRenderer_1.templateId;
    }
    finishRenderTemplate(data) {
        // override default e.g. language contributions, only allow users to click
        // on code in the call stack to go to its source location
        const contributions = [
            {
                id: ClickToLocationContribution.ID,
                instantiation: 2 /* EditorContributionInstantiation.BeforeFirstInteraction */,
                ctor: ClickToLocationContribution,
            },
        ];
        const editor = this.containingEditor
            ? this.instantiationService.createInstance(EmbeddedCodeEditorWidget, data.elements.editor, editorOptions, { isSimpleWidget: true, contributions }, this.containingEditor)
            : this.instantiationService.createInstance(CodeEditorWidget, data.elements.editor, editorOptions, { isSimpleWidget: true, contributions });
        data.templateStore.add(editor);
        const toolbar = data.templateStore.add(this.instantiationService.createInstance(MenuWorkbenchToolBar, data.elements.actions, MenuId.DebugCallStackToolbar, {
            menuOptions: { shouldForwardArgs: true },
            actionViewItemProvider: (action, options) => createActionViewItem(this.instantiationService, action, options),
        }));
        return { ...data, editor, toolbar };
    }
    renderElement(element, index, template, height) {
        super.renderElement(element, index, template, height);
        const { elementStore, editor } = template;
        const item = element;
        const uri = item.source;
        template.label.element.setFile(uri);
        const cts = new CancellationTokenSource();
        elementStore.add(toDisposable(() => cts.dispose(true)));
        this.modelService.createModelReference(uri).then((reference) => {
            if (cts.token.isCancellationRequested) {
                return reference.dispose();
            }
            elementStore.add(reference);
            editor.setModel(reference.object.textEditorModel);
            this.setupEditorAfterModel(item, template);
            this.setupEditorLayout(item, template);
        });
    }
    setupEditorLayout(item, { elementStore, container, editor }) {
        const layout = () => {
            const prev = editor.getContentHeight();
            editor.layout({ width: container.clientWidth, height: prev });
            const next = editor.getContentHeight();
            if (next !== prev) {
                editor.layout({ width: container.clientWidth, height: next });
            }
            item.editorHeight.set(next, undefined);
        };
        elementStore.add(editor.onDidChangeModelDecorations(layout));
        elementStore.add(editor.onDidChangeModelContent(layout));
        elementStore.add(editor.onDidChangeModelOptions(layout));
        elementStore.add(this.onLayout(layout));
        layout();
    }
    setupEditorAfterModel(item, template) {
        const range = Range.fromPositions({
            column: item.column ?? 1,
            lineNumber: item.line ?? 1,
        });
        template.toolbar.context = { uri: item.source, range };
        template.editor.setHiddenAreas([
            Range.fromPositions({ column: 1, lineNumber: 1 }, { column: 1, lineNumber: Math.max(1, item.line - CONTEXT_LINES - 1) }),
            Range.fromPositions({ column: 1, lineNumber: item.line + CONTEXT_LINES + 1 }, { column: 1, lineNumber: 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */ }),
        ]);
        template.editor.changeDecorations((accessor) => {
            for (const d of template.decorations) {
                accessor.removeDecoration(d);
            }
            template.decorations.length = 0;
            const beforeRange = range.setStartPosition(range.startLineNumber, 1);
            const hasCharactersBefore = !!template.editor.getModel()?.getValueInRange(beforeRange).trim();
            const decoRange = range.setEndPosition(range.startLineNumber, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
            template.decorations.push(accessor.addDecoration(decoRange, makeStackFrameColumnDecoration(!hasCharactersBefore)));
            template.decorations.push(accessor.addDecoration(decoRange, TOP_STACK_FRAME_DECORATION));
        });
        item.editorHeight.set(template.editor.getContentHeight(), undefined);
    }
};
FrameCodeRenderer = FrameCodeRenderer_1 = __decorate([
    __param(2, ITextModelService),
    __param(3, IInstantiationService)
], FrameCodeRenderer);
/** Renderer for a call frame that's missing a URI */
let MissingCodeRenderer = class MissingCodeRenderer {
    static { MissingCodeRenderer_1 = this; }
    static { this.templateId = 'm'; }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this.templateId = MissingCodeRenderer_1.templateId;
    }
    renderTemplate(container) {
        const elements = makeFrameElements();
        elements.root.classList.add('missing');
        container.appendChild(elements.root);
        const label = this.instantiationService.createInstance(ResourceLabel, elements.title, {});
        return { elements, label };
    }
    renderElement(element, _index, templateData) {
        const cast = element;
        templateData.label.element.setResource({
            name: cast.name,
            description: localize('stackFrameLocation', 'Line {0} column {1}', cast.line, cast.column),
            range: {
                startLineNumber: cast.line,
                startColumn: cast.column,
                endColumn: cast.column,
                endLineNumber: cast.line,
            },
        }, {
            icon: Codicon.fileBinary,
        });
    }
    disposeTemplate(templateData) {
        templateData.label.dispose();
        templateData.elements.root.remove();
    }
};
MissingCodeRenderer = MissingCodeRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], MissingCodeRenderer);
/** Renderer for a call frame that's missing a URI */
class CustomRenderer extends AbstractFrameRenderer {
    constructor() {
        super(...arguments);
        this.templateId = CustomRenderer.templateId;
    }
    static { this.templateId = 'c'; }
    finishRenderTemplate(data) {
        return data;
    }
    renderElement(element, index, template, height) {
        super.renderElement(element, index, template, height);
        const item = element;
        const { elementStore, container, label } = template;
        label.element.setResource({ name: item.original.label }, { icon: item.original.icon });
        elementStore.add(autorun((reader) => {
            template.elements.header.style.display = item.original.showHeader.read(reader) ? '' : 'none';
        }));
        elementStore.add(autorunWithStore((reader, store) => {
            if (!item.collapsed.read(reader)) {
                store.add(item.original.render(container));
            }
        }));
        const actions = item.original.renderActions?.(template.elements.actions);
        if (actions) {
            elementStore.add(actions);
        }
    }
}
/** Renderer for a button to load more call frames */
let SkippedRenderer = class SkippedRenderer {
    static { SkippedRenderer_1 = this; }
    static { this.templateId = 's'; }
    constructor(loadFrames, notificationService) {
        this.loadFrames = loadFrames;
        this.notificationService = notificationService;
        this.templateId = SkippedRenderer_1.templateId;
    }
    renderTemplate(container) {
        const store = new DisposableStore();
        const button = new Button(container, { title: '', ...defaultButtonStyles });
        const data = { button, store };
        store.add(button);
        store.add(button.onDidClick(() => {
            if (!data.current || !button.enabled) {
                return;
            }
            button.enabled = false;
            this.loadFrames(data.current).catch((e) => {
                this.notificationService.error(localize('failedToLoadFrames', 'Failed to load stack frames: {0}', e.message));
            });
        }));
        return data;
    }
    renderElement(element, index, templateData, height) {
        const cast = element;
        templateData.button.enabled = true;
        templateData.button.label = cast.label;
        templateData.current = cast;
    }
    disposeTemplate(templateData) {
        templateData.store.dispose();
    }
};
SkippedRenderer = SkippedRenderer_1 = __decorate([
    __param(1, INotificationService)
], SkippedRenderer);
/** A simple contribution that makes all data in the editor clickable to go to the location */
let ClickToLocationContribution = class ClickToLocationContribution extends Disposable {
    static { this.ID = 'clickToLocation'; }
    constructor(editor, editorService) {
        super();
        this.editor = editor;
        this.linkDecorations = editor.createDecorationsCollection();
        this._register(toDisposable(() => this.linkDecorations.clear()));
        const clickLinkGesture = this._register(new ClickLinkGesture(editor));
        this._register(clickLinkGesture.onMouseMoveOrRelevantKeyDown(([mouseEvent, keyboardEvent]) => {
            this.onMove(mouseEvent);
        }));
        this._register(clickLinkGesture.onExecute((e) => {
            const model = this.editor.getModel();
            if (!this.current || !model) {
                return;
            }
            editorService.openEditor({
                resource: model.uri,
                options: {
                    selection: Range.fromPositions(new Position(this.current.line, this.current.word.startColumn)),
                    selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
                },
            }, e.hasSideBySideModifier ? SIDE_GROUP : undefined);
        }));
    }
    onMove(mouseEvent) {
        if (!mouseEvent.hasTriggerModifier) {
            return this.clear();
        }
        const position = mouseEvent.target.position;
        const word = position && this.editor.getModel()?.getWordAtPosition(position);
        if (!word) {
            return this.clear();
        }
        const prev = this.current?.word;
        if (prev &&
            prev.startColumn === word.startColumn &&
            prev.endColumn === word.endColumn &&
            prev.word === word.word) {
            return;
        }
        this.current = { word, line: position.lineNumber };
        this.linkDecorations.set([
            {
                range: new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                options: {
                    description: 'call-stack-go-to-file-link',
                    inlineClassName: 'call-stack-go-to-file-link',
                },
            },
        ]);
    }
    clear() {
        this.linkDecorations.clear();
        this.current = undefined;
    }
};
ClickToLocationContribution = __decorate([
    __param(1, IEditorService)
], ClickToLocationContribution);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'callStackWidget.goToFile',
            title: localize2('goToFile', 'Open File'),
            icon: Codicon.goToFile,
            menu: {
                id: MenuId.DebugCallStackToolbar,
                order: 22,
                group: 'navigation',
            },
        });
    }
    async run(accessor, { uri, range }) {
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({
            resource: uri,
            options: {
                selection: range,
                selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
            },
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbFN0YWNrV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9jYWxsU3RhY2tXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBR3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEVBR1AsZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLHVDQUF1QyxDQUFBO0FBSTlDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQU85RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUVuSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBTy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFD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
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
import { Sizing, SplitView } from '../../../../../base/browser/ui/splitview/splitview.js';
import { Color } from '../../../../../base/common/color.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore, dispose, } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basenameOrAuthority, dirname } from '../../../../../base/common/resources.js';
import './referencesWidget.css';
import { EmbeddedCodeEditorWidget } from '../../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Range } from '../../../../common/core/range.js';
import { ModelDecorationOptions, TextModel } from '../../../../common/model/textModel.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../common/languages/modesRegistry.js';
import { ITextModelService } from '../../../../common/services/resolverService.js';
import { AccessibilityProvider, DataSource, Delegate, FileReferencesRenderer, IdentityProvider, OneReferenceRenderer, StringRepresentationProvider, } from './referencesTree.js';
import * as peekView from '../../../peekView/browser/peekView.js';
import * as nls from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { WorkbenchAsyncDataTree, } from '../../../../../platform/list/browser/listService.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { FileReferences, OneReference } from '../referencesModel.js';
import { DataTransfers } from '../../../../../base/browser/dnd.js';
import { withSelection } from '../../../../../platform/opener/common/opener.js';
class DecorationsManager {
    static { this.DecorationOptions = ModelDecorationOptions.register({
        description: 'reference-decoration',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'reference-decoration',
    }); }
    constructor(_editor, _model) {
        this._editor = _editor;
        this._model = _model;
        this._decorations = new Map();
        this._decorationIgnoreSet = new Set();
        this._callOnDispose = new DisposableStore();
        this._callOnModelChange = new DisposableStore();
        this._callOnDispose.add(this._editor.onDidChangeModel(() => this._onModelChanged()));
        this._onModelChanged();
    }
    dispose() {
        this._callOnModelChange.dispose();
        this._callOnDispose.dispose();
        this.removeDecorations();
    }
    _onModelChanged() {
        this._callOnModelChange.clear();
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        for (const ref of this._model.references) {
            if (ref.uri.toString() === model.uri.toString()) {
                this._addDecorations(ref.parent);
                return;
            }
        }
    }
    _addDecorations(reference) {
        if (!this._editor.hasModel()) {
            return;
        }
        this._callOnModelChange.add(this._editor.getModel().onDidChangeDecorations(() => this._onDecorationChanged()));
        const newDecorations = [];
        const newDecorationsActualIndex = [];
        for (let i = 0, len = reference.children.length; i < len; i++) {
            const oneReference = reference.children[i];
            if (this._decorationIgnoreSet.has(oneReference.id)) {
                continue;
            }
            if (oneReference.uri.toString() !== this._editor.getModel().uri.toString()) {
                continue;
            }
            newDecorations.push({
                range: oneReference.range,
                options: DecorationsManager.DecorationOptions,
            });
            newDecorationsActualIndex.push(i);
        }
        this._editor.changeDecorations((changeAccessor) => {
            const decorations = changeAccessor.deltaDecorations([], newDecorations);
            for (let i = 0; i < decorations.length; i++) {
                this._decorations.set(decorations[i], reference.children[newDecorationsActualIndex[i]]);
            }
        });
    }
    _onDecorationChanged() {
        const toRemove = [];
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        for (const [decorationId, reference] of this._decorations) {
            const newRange = model.getDecorationRange(decorationId);
            if (!newRange) {
                continue;
            }
            let ignore = false;
            if (Range.equalsRange(newRange, reference.range)) {
                continue;
            }
            if (Range.spansMultipleLines(newRange)) {
                ignore = true;
            }
            else {
                const lineLength = reference.range.endColumn - reference.range.startColumn;
                const newLineLength = newRange.endColumn - newRange.startColumn;
                if (lineLength !== newLineLength) {
                    ignore = true;
                }
            }
            if (ignore) {
                this._decorationIgnoreSet.add(reference.id);
                toRemove.push(decorationId);
            }
            else {
                reference.range = newRange;
            }
        }
        for (let i = 0, len = toRemove.length; i < len; i++) {
            this._decorations.delete(toRemove[i]);
        }
        this._editor.removeDecorations(toRemove);
    }
    removeDecorations() {
        this._editor.removeDecorations([...this._decorations.keys()]);
        this._decorations.clear();
    }
}
export class LayoutData {
    constructor() {
        this.ratio = 0.7;
        this.heightInLines = 18;
    }
    static fromJSON(raw) {
        let ratio;
        let heightInLines;
        try {
            const data = JSON.parse(raw);
            ratio = data.ratio;
            heightInLines = data.heightInLines;
        }
        catch {
            //
        }
        return {
            ratio: ratio || 0.7,
            heightInLines: heightInLines || 18,
        };
    }
}
class ReferencesTree extends WorkbenchAsyncDataTree {
}
let ReferencesDragAndDrop = class ReferencesDragAndDrop {
    constructor(labelService) {
        this.labelService = labelService;
        this.disposables = new DisposableStore();
    }
    getDragURI(element) {
        if (element instanceof FileReferences) {
            return element.uri.toString();
        }
        else if (element instanceof OneReference) {
            return withSelection(element.uri, element.range).toString();
        }
        return null;
    }
    getDragLabel(elements) {
        if (elements.length === 0) {
            return undefined;
        }
        const labels = elements.map((e) => this.labelService.getUriBasenameLabel(e.uri));
        return labels.join(', ');
    }
    onDragStart(data, originalEvent) {
        if (!originalEvent.dataTransfer) {
            return;
        }
        const elements = data.elements;
        const resources = elements.map((e) => this.getDragURI(e)).filter(Boolean);
        if (resources.length) {
            // Apply resources as resource-list
            originalEvent.dataTransfer.setData(DataTransfers.RESOURCES, JSON.stringify(resources));
            // Also add as plain text for outside consumers
            originalEvent.dataTransfer.setData(DataTransfers.TEXT, resources.join('\n'));
        }
    }
    onDragOver() {
        return false;
    }
    drop() { }
    dispose() {
        this.disposables.dispose();
    }
};
ReferencesDragAndDrop = __decorate([
    __param(0, ILabelService)
], ReferencesDragAndDrop);
/**
 * ZoneWidget that is shown inside the editor
 */
let ReferenceWidget = class ReferenceWidget extends peekView.PeekViewWidget {
    constructor(editor, _defaultTreeKeyboardSupport, layoutData, themeService, _textModelResolverService, _instantiationService, _peekViewService, _uriLabel, _keybindingService) {
        super(editor, {
            showFrame: false,
            showArrow: true,
            isResizeable: true,
            isAccessible: true,
            supportOnTitleClick: true,
        }, _instantiationService);
        this._defaultTreeKeyboardSupport = _defaultTreeKeyboardSupport;
        this.layoutData = layoutData;
        this._textModelResolverService = _textModelResolverService;
        this._instantiationService = _instantiationService;
        this._peekViewService = _peekViewService;
        this._uriLabel = _uriLabel;
        this._keybindingService = _keybindingService;
        this._disposeOnNewModel = new DisposableStore();
        this._callOnDispose = new DisposableStore();
        this._onDidSelectReference = new Emitter();
        this.onDidSelectReference = this._onDidSelectReference.event;
        this._dim = new dom.Dimension(0, 0);
        this._isClosing = false; // whether or not a dispose is already in progress
        this._applyTheme(themeService.getColorTheme());
        this._callOnDispose.add(themeService.onDidColorThemeChange(this._applyTheme.bind(this)));
        this._peekViewService.addExclusiveWidget(editor, this);
        this.create();
    }
    get isClosing() {
        return this._isClosing;
    }
    dispose() {
        this._isClosing = true;
        this.setModel(undefined);
        this._callOnDispose.dispose();
        this._disposeOnNewModel.dispose();
        dispose(this._preview);
        dispose(this._previewNotAvailableMessage);
        dispose(this._tree);
        dispose(this._previewModelReference);
        this._splitView.dispose();
        super.dispose();
    }
    _applyTheme(theme) {
        const borderColor = theme.getColor(peekView.peekViewBorder) || Color.transparent;
        this.style({
            arrowColor: borderColor,
            frameColor: borderColor,
            headerBackgroundColor: theme.getColor(peekView.peekViewTitleBackground) || Color.transparent,
            primaryHeadingColor: theme.getColor(peekView.peekViewTitleForeground),
            secondaryHeadingColor: theme.getColor(peekView.peekViewTitleInfoForeground),
        });
    }
    show(where) {
        super.show(where, this.layoutData.heightInLines || 18);
    }
    focusOnReferenceTree() {
        this._tree.domFocus();
    }
    focusOnPreviewEditor() {
        this._preview.focus();
    }
    isPreviewEditorFocused() {
        return this._preview.hasTextFocus();
    }
    _onTitleClick(e) {
        if (this._preview && this._preview.getModel()) {
            this._onDidSelectReference.fire({
                element: this._getFocusedReference(),
                kind: e.ctrlKey || e.metaKey || e.altKey ? 'side' : 'open',
                source: 'title',
            });
        }
    }
    _fillBody(containerElement) {
        this.setCssClass('reference-zone-widget');
        // message pane
        this._messageContainer = dom.append(containerElement, dom.$('div.messages'));
        dom.hide(this._messageContainer);
        this._splitView = new SplitView(containerElement, { orientation: 1 /* Orientation.HORIZONTAL */ });
        // editor
        this._previewContainer = dom.append(containerElement, dom.$('div.preview.inline'));
        const options = {
            scrollBeyondLastLine: false,
            scrollbar: {
                verticalScrollbarSize: 14,
                horizontal: 'auto',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                alwaysConsumeMouseWheel: true,
            },
            overviewRulerLanes: 2,
            fixedOverflowWidgets: true,
            minimap: {
                enabled: false,
            },
        };
        this._preview = this._instantiationService.createInstance(EmbeddedCodeEditorWidget, this._previewContainer, options, {}, this.editor);
        dom.hide(this._previewContainer);
        this._previewNotAvailableMessage = this._instantiationService.createInstance(TextModel, nls.localize('missingPreviewMessage', 'no preview available'), PLAINTEXT_LANGUAGE_ID, TextModel.DEFAULT_CREATION_OPTIONS, null);
        // tree
        this._treeContainer = dom.append(containerElement, dom.$('div.ref-tree.inline'));
        const treeOptions = {
            keyboardSupport: this._defaultTreeKeyboardSupport,
            accessibilityProvider: new AccessibilityProvider(),
            keyboardNavigationLabelProvider: this._instantiationService.createInstance(StringRepresentationProvider),
            identityProvider: new IdentityProvider(),
            openOnSingleClick: true,
            selectionNavigation: true,
            overrideStyles: {
                listBackground: peekView.peekViewResultsBackground,
            },
            dnd: this._instantiationService.createInstance(ReferencesDragAndDrop),
        };
        if (this._defaultTreeKeyboardSupport) {
            // the tree will consume `Escape` and prevent the widget from closing
            this._callOnDispose.add(dom.addStandardDisposableListener(this._treeContainer, 'keydown', (e) => {
                if (e.equals(9 /* KeyCode.Escape */)) {
                    this._keybindingService.dispatchEvent(e, e.target);
                    e.stopPropagation();
                }
            }, true));
        }
        this._tree = this._instantiationService.createInstance(ReferencesTree, 'ReferencesWidget', this._treeContainer, new Delegate(), [
            this._instantiationService.createInstance(FileReferencesRenderer),
            this._instantiationService.createInstance(OneReferenceRenderer),
        ], this._instantiationService.createInstance(DataSource), treeOptions);
        // split stuff
        this._splitView.addView({
            onDidChange: Event.None,
            element: this._previewContainer,
            minimumSize: 200,
            maximumSize: Number.MAX_VALUE,
            layout: (width) => {
                this._preview.layout({ height: this._dim.height, width });
            },
        }, Sizing.Distribute);
        this._splitView.addView({
            onDidChange: Event.None,
            element: this._treeContainer,
            minimumSize: 100,
            maximumSize: Number.MAX_VALUE,
            layout: (width) => {
                this._treeContainer.style.height = `${this._dim.height}px`;
                this._treeContainer.style.width = `${width}px`;
                this._tree.layout(this._dim.height, width);
            },
        }, Sizing.Distribute);
        this._disposables.add(this._splitView.onDidSashChange(() => {
            if (this._dim.width) {
                this.layoutData.ratio = this._splitView.getViewSize(0) / this._dim.width;
            }
        }, undefined));
        // listen on selection and focus
        const onEvent = (element, kind) => {
            if (element instanceof OneReference) {
                if (kind === 'show') {
                    this._revealReference(element, false);
                }
                this._onDidSelectReference.fire({ element, kind, source: 'tree' });
            }
        };
        this._disposables.add(this._tree.onDidOpen((e) => {
            if (e.sideBySide) {
                onEvent(e.element, 'side');
            }
            else if (e.editorOptions.pinned) {
                onEvent(e.element, 'goto');
            }
            else {
                onEvent(e.element, 'show');
            }
        }));
        dom.hide(this._treeContainer);
    }
    _onWidth(width) {
        if (this._dim) {
            this._doLayoutBody(this._dim.height, width);
        }
    }
    _doLayoutBody(heightInPixel, widthInPixel) {
        super._doLayoutBody(heightInPixel, widthInPixel);
        this._dim = new dom.Dimension(widthInPixel, heightInPixel);
        this.layoutData.heightInLines = this._viewZone
            ? this._viewZone.heightInLines
            : this.layoutData.heightInLines;
        this._splitView.layout(widthInPixel);
        this._splitView.resizeView(0, widthInPixel * this.layoutData.ratio);
    }
    setSelection(selection) {
        return this._revealReference(selection, true).then(() => {
            if (!this._model) {
                // disposed
                return;
            }
            // show in tree
            this._tree.setSelection([selection]);
            this._tree.setFocus([selection]);
        });
    }
    setModel(newModel) {
        // clean up
        this._disposeOnNewModel.clear();
        this._model = newModel;
        if (this._model) {
            return this._onNewModel();
        }
        return Promise.resolve();
    }
    _onNewModel() {
        if (!this._model) {
            return Promise.resolve(undefined);
        }
        if (this._model.isEmpty) {
            this.setTitle('');
            this._messageContainer.innerText = nls.localize('noResults', 'No results');
            dom.show(this._messageContainer);
            return Promise.resolve(undefined);
        }
        dom.hide(this._messageContainer);
        this._decorationsManager = new DecorationsManager(this._preview, this._model);
        this._disposeOnNewModel.add(this._decorationsManager);
        // listen on model changes
        this._disposeOnNewModel.add(this._model.onDidChangeReferenceRange((reference) => this._tree.rerender(reference)));
        // listen on editor
        this._disposeOnNewModel.add(this._preview.onMouseDown((e) => {
            const { event, target } = e;
            if (event.detail !== 2) {
                return;
            }
            const element = this._getFocusedReference();
            if (!element) {
                return;
            }
            this._onDidSelectReference.fire({
                element: { uri: element.uri, range: target.range },
                kind: event.ctrlKey || event.metaKey || event.altKey ? 'side' : 'open',
                source: 'editor',
            });
        }));
        // make sure things are rendered
        this.container.classList.add('results-loaded');
        dom.show(this._treeContainer);
        dom.show(this._previewContainer);
        this._splitView.layout(this._dim.width);
        this.focusOnReferenceTree();
        // pick input and a reference to begin with
        return this._tree.setInput(this._model.groups.length === 1 ? this._model.groups[0] : this._model);
    }
    _getFocusedReference() {
        const [element] = this._tree.getFocus();
        if (element instanceof OneReference) {
            return element;
        }
        else if (element instanceof FileReferences) {
            if (element.children.length > 0) {
                return element.children[0];
            }
        }
        return undefined;
    }
    async revealReference(reference) {
        await this._revealReference(reference, false);
        this._onDidSelectReference.fire({ element: reference, kind: 'goto', source: 'tree' });
    }
    async _revealReference(reference, revealParent) {
        // check if there is anything to do...
        if (this._revealedReference === reference) {
            return;
        }
        this._revealedReference = reference;
        // Update widget header
        if (reference.uri.scheme !== Schemas.inMemory) {
            this.setTitle(basenameOrAuthority(reference.uri), this._uriLabel.getUriLabel(dirname(reference.uri)));
        }
        else {
            this.setTitle(nls.localize('peekView.alternateTitle', 'References'));
        }
        const promise = this._textModelResolverService.createModelReference(reference.uri);
        if (this._tree.getInput() === reference.parent) {
            this._tree.reveal(reference);
        }
        else {
            if (revealParent) {
                this._tree.reveal(reference.parent);
            }
            await this._tree.expand(reference.parent);
            this._tree.reveal(reference);
        }
        const ref = await promise;
        if (!this._model) {
            // disposed
            ref.dispose();
            return;
        }
        dispose(this._previewModelReference);
        // show in editor
        const model = ref.object;
        if (model) {
            const scrollType = this._preview.getModel() === model.textEditorModel
                ? 0 /* ScrollType.Smooth */
                : 1 /* ScrollType.Immediate */;
            const sel = Range.lift(reference.range).collapseToStart();
            this._previewModelReference = ref;
            this._preview.setModel(model.textEditorModel);
            this._preview.setSelection(sel);
            this._preview.revealRangeInCenter(sel, scrollType);
        }
        else {
            this._preview.setModel(this._previewNotAvailableMessage);
            ref.dispose();
        }
    }
};
ReferenceWidget = __decorate([
    __param(3, IThemeService),
    __param(4, ITextModelService),
    __param(5, IInstantiationService),
    __param(6, peekView.IPeekViewService),
    __param(7, ILabelService),
    __param(8, IKeybindingService)
], ReferenceWidget);
export { ReferenceWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlc1dpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9TeW1ib2wvYnJvd3Nlci9wZWVrL3JlZmVyZW5jZXNXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUd6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBR3BFLE9BQU8sRUFDTixlQUFlLEVBQ2YsT0FBTyxHQUdQLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RixPQUFPLHdCQUF3QixDQUFBO0FBRS9CLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBRTVHLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDckYsT0FBTyxFQUFvQixpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3BHLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsVUFBVSxFQUNWLFFBQVEsRUFDUixzQkFBc0IsRUFDdEIsZ0JBQWdCLEVBQ2hCLG9CQUFv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
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
var SideBySideEditor_1;
import './media/sidebysideeditor.css';
import { localize } from '../../../../nls.js';
import { Dimension, $, clearNode, multibyteAwareBtoa } from '../../../../base/browser/dom.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorExtensions, SIDE_BY_SIDE_EDITOR_ID, SideBySideEditor as Side, isEditorPaneWithSelection, } from '../../../common/editor.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { SplitView, Sizing } from '../../../../base/browser/ui/splitview/splitview.js';
import { Event, Relay, Emitter } from '../../../../base/common/event.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { DEFAULT_EDITOR_MIN_DIMENSIONS } from './editor.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { SIDE_BY_SIDE_EDITOR_HORIZONTAL_BORDER, SIDE_BY_SIDE_EDITOR_VERTICAL_BORDER, } from '../../../common/theme.js';
import { AbstractEditorWithViewState } from './editorWithViewState.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
function isSideBySideEditorViewState(thing) {
    const candidate = thing;
    return typeof candidate?.primary === 'object' && typeof candidate.secondary === 'object';
}
let SideBySideEditor = class SideBySideEditor extends AbstractEditorWithViewState {
    static { SideBySideEditor_1 = this; }
    static { this.ID = SIDE_BY_SIDE_EDITOR_ID; }
    static { this.SIDE_BY_SIDE_LAYOUT_SETTING = 'workbench.editor.splitInGroupLayout'; }
    static { this.VIEW_STATE_PREFERENCE_KEY = 'sideBySideEditorViewState'; }
    //#region Layout Constraints
    get minimumPrimaryWidth() {
        return this.primaryEditorPane ? this.primaryEditorPane.minimumWidth : 0;
    }
    get maximumPrimaryWidth() {
        return this.primaryEditorPane ? this.primaryEditorPane.maximumWidth : Number.POSITIVE_INFINITY;
    }
    get minimumPrimaryHeight() {
        return this.primaryEditorPane ? this.primaryEditorPane.minimumHeight : 0;
    }
    get maximumPrimaryHeight() {
        return this.primaryEditorPane ? this.primaryEditorPane.maximumHeight : Number.POSITIVE_INFINITY;
    }
    get minimumSecondaryWidth() {
        return this.secondaryEditorPane ? this.secondaryEditorPane.minimumWidth : 0;
    }
    get maximumSecondaryWidth() {
        return this.secondaryEditorPane
            ? this.secondaryEditorPane.maximumWidth
            : Number.POSITIVE_INFINITY;
    }
    get minimumSecondaryHeight() {
        return this.secondaryEditorPane ? this.secondaryEditorPane.minimumHeight : 0;
    }
    get maximumSecondaryHeight() {
        return this.secondaryEditorPane
            ? this.secondaryEditorPane.maximumHeight
            : Number.POSITIVE_INFINITY;
    }
    set minimumWidth(value) {
        /* noop */
    }
    set maximumWidth(value) {
        /* noop */
    }
    set minimumHeight(value) {
        /* noop */
    }
    set maximumHeight(value) {
        /* noop */
    }
    get minimumWidth() {
        return this.minimumPrimaryWidth + this.minimumSecondaryWidth;
    }
    get maximumWidth() {
        return this.maximumPrimaryWidth + this.maximumSecondaryWidth;
    }
    get minimumHeight() {
        return this.minimumPrimaryHeight + this.minimumSecondaryHeight;
    }
    get maximumHeight() {
        return this.maximumPrimaryHeight + this.maximumSecondaryHeight;
    }
    constructor(group, telemetryService, instantiationService, themeService, storageService, configurationService, textResourceConfigurationService, editorService, editorGroupService) {
        super(SideBySideEditor_1.ID, group, SideBySideEditor_1.VIEW_STATE_PREFERENCE_KEY, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService);
        this.configurationService = configurationService;
        //#endregion
        //#region Events
        this.onDidCreateEditors = this._register(new Emitter());
        this._onDidChangeSizeConstraints = this._register(new Relay());
        this.onDidChangeSizeConstraints = Event.any(this.onDidCreateEditors.event, this._onDidChangeSizeConstraints.event);
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        //#endregion
        this.primaryEditorPane = undefined;
        this.secondaryEditorPane = undefined;
        this.splitviewDisposables = this._register(new DisposableStore());
        this.editorDisposables = this._register(new DisposableStore());
        this.dimension = new Dimension(0, 0);
        this.lastFocusedSide = undefined;
        this.orientation =
            this.configurationService.getValue(SideBySideEditor_1.SIDE_BY_SIDE_LAYOUT_SETTING) === 'vertical'
                ? 0 /* Orientation.VERTICAL */
                : 1 /* Orientation.HORIZONTAL */;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationUpdated(e)));
    }
    onConfigurationUpdated(event) {
        if (event.affectsConfiguration(SideBySideEditor_1.SIDE_BY_SIDE_LAYOUT_SETTING)) {
            this.orientation =
                this.configurationService.getValue(SideBySideEditor_1.SIDE_BY_SIDE_LAYOUT_SETTING) === 'vertical'
                    ? 0 /* Orientation.VERTICAL */
                    : 1 /* Orientation.HORIZONTAL */;
            // If config updated from event, re-create the split
            // editor using the new layout orientation if it was
            // already created.
            if (this.splitview) {
                this.recreateSplitview();
            }
        }
    }
    recreateSplitview() {
        const container = assertIsDefined(this.getContainer());
        // Clear old (if any) but remember ratio
        const ratio = this.getSplitViewRatio();
        if (this.splitview) {
            this.splitview.el.remove();
            this.splitviewDisposables.clear();
        }
        // Create new
        this.createSplitView(container, ratio);
        this.layout(this.dimension);
    }
    getSplitViewRatio() {
        let ratio = undefined;
        if (this.splitview) {
            const leftViewSize = this.splitview.getViewSize(0);
            const rightViewSize = this.splitview.getViewSize(1);
            // Only return a ratio when the view size is significantly
            // enough different for left and right view sizes
            if (Math.abs(leftViewSize - rightViewSize) > 1) {
                const totalSize = this.splitview.orientation === 1 /* Orientation.HORIZONTAL */
                    ? this.dimension.width
                    : this.dimension.height;
                ratio = leftViewSize / totalSize;
            }
        }
        return ratio;
    }
    createEditor(parent) {
        parent.classList.add('side-by-side-editor');
        // Editor pane containers
        this.secondaryEditorContainer = $('.side-by-side-editor-container.editor-instance');
        this.primaryEditorContainer = $('.side-by-side-editor-container.editor-instance');
        // Split view
        this.createSplitView(parent);
    }
    createSplitView(parent, ratio) {
        // Splitview widget
        this.splitview = this.splitviewDisposables.add(new SplitView(parent, { orientation: this.orientation }));
        this.splitviewDisposables.add(this.splitview.onDidSashReset(() => this.splitview?.distributeViewSizes()));
        if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            this.splitview.orthogonalEndSash = this._boundarySashes?.bottom;
        }
        else {
            this.splitview.orthogonalStartSash = this._boundarySashes?.left;
            this.splitview.orthogonalEndSash = this._boundarySashes?.right;
        }
        // Figure out sizing
        let leftSizing = Sizing.Distribute;
        let rightSizing = Sizing.Distribute;
        if (ratio) {
            const totalSize = this.splitview.orientation === 1 /* Orientation.HORIZONTAL */
                ? this.dimension.width
                : this.dimension.height;
            leftSizing = Math.round(totalSize * ratio);
            rightSizing = totalSize - leftSizing;
            // We need to call `layout` for the `ratio` to have any effect
            this.splitview.layout(this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.dimension.width : this.dimension.height);
        }
        // Secondary (left)
        const secondaryEditorContainer = assertIsDefined(this.secondaryEditorContainer);
        this.splitview.addView({
            element: secondaryEditorContainer,
            layout: (size) => this.layoutPane(this.secondaryEditorPane, size),
            minimumSize: this.orientation === 1 /* Orientation.HORIZONTAL */
                ? DEFAULT_EDITOR_MIN_DIMENSIONS.width
                : DEFAULT_EDITOR_MIN_DIMENSIONS.height,
            maximumSize: Number.POSITIVE_INFINITY,
            onDidChange: Event.None,
        }, leftSizing);
        // Primary (right)
        const primaryEditorContainer = assertIsDefined(this.primaryEditorContainer);
        this.splitview.addView({
            element: primaryEditorContainer,
            layout: (size) => this.layoutPane(this.primaryEditorPane, size),
            minimumSize: this.orientation === 1 /* Orientation.HORIZONTAL */
                ? DEFAULT_EDITOR_MIN_DIMENSIONS.width
                : DEFAULT_EDITOR_MIN_DIMENSIONS.height,
            maximumSize: Number.POSITIVE_INFINITY,
            onDidChange: Event.None,
        }, rightSizing);
        this.updateStyles();
    }
    getTitle() {
        if (this.input) {
            return this.input.getName();
        }
        return localize('sideBySideEditor', 'Side by Side Editor');
    }
    async setInput(input, options, context, token) {
        const oldInput = this.input;
        await super.setInput(input, options, context, token);
        // Create new side by side editors if either we have not
        // been created before or the input no longer matches.
        if (!oldInput || !input.matches(oldInput)) {
            if (oldInput) {
                this.disposeEditors();
            }
            this.createEditors(input);
        }
        // Restore any previous view state
        const { primary, secondary, viewState } = this.loadViewState(input, options, context);
        this.lastFocusedSide = viewState?.focus;
        if (typeof viewState?.ratio === 'number' && this.splitview) {
            const totalSize = this.splitview.orientation === 1 /* Orientation.HORIZONTAL */
                ? this.dimension.width
                : this.dimension.height;
            this.splitview.resizeView(0, Math.round(totalSize * viewState.ratio));
        }
        else {
            this.splitview?.distributeViewSizes();
        }
        // Set input to both sides
        await Promise.all([
            this.secondaryEditorPane?.setInput(input.secondary, secondary, context, token),
            this.primaryEditorPane?.setInput(input.primary, primary, context, token),
        ]);
        // Update focus if target is provided
        if (typeof options?.target === 'number') {
            this.lastFocusedSide = options.target;
        }
    }
    loadViewState(input, options, context) {
        const viewState = isSideBySideEditorViewState(options?.viewState)
            ? options?.viewState
            : this.loadEditorViewState(input, context);
        let primaryOptions = Object.create(null);
        let secondaryOptions = undefined;
        // Depending on the optional `target` property, we apply
        // the provided options to either the primary or secondary
        // side
        if (options?.target === Side.SECONDARY) {
            secondaryOptions = { ...options };
        }
        else {
            primaryOptions = { ...options };
        }
        primaryOptions.viewState = viewState?.primary;
        if (viewState?.secondary) {
            if (!secondaryOptions) {
                secondaryOptions = { viewState: viewState.secondary };
            }
            else {
                secondaryOptions.viewState = viewState?.secondary;
            }
        }
        return { primary: primaryOptions, secondary: secondaryOptions, viewState };
    }
    createEditors(newInput) {
        // Create editors
        this.secondaryEditorPane = this.doCreateEditor(newInput.secondary, assertIsDefined(this.secondaryEditorContainer));
        this.primaryEditorPane = this.doCreateEditor(newInput.primary, assertIsDefined(this.primaryEditorContainer));
        // Layout
        this.layout(this.dimension);
        // Eventing
        this._onDidChangeSizeConstraints.input = Event.any(Event.map(this.secondaryEditorPane.onDidChangeSizeConstraints, () => undefined), Event.map(this.primaryEditorPane.onDidChangeSizeConstraints, () => undefined));
        this.onDidCreateEditors.fire(undefined);
        // Track focus and signal active control change via event
        this.editorDisposables.add(this.primaryEditorPane.onDidFocus(() => this.onDidFocusChange(Side.PRIMARY)));
        this.editorDisposables.add(this.secondaryEditorPane.onDidFocus(() => this.onDidFocusChange(Side.SECONDARY)));
    }
    doCreateEditor(editorInput, container) {
        const editorPaneDescriptor = Registry.as(EditorExtensions.EditorPane).getEditorPane(editorInput);
        if (!editorPaneDescriptor) {
            throw new Error('No editor pane descriptor for editor found');
        }
        // Create editor pane and make visible
        const editorPane = editorPaneDescriptor.instantiate(this.instantiationService, this.group);
        editorPane.create(container);
        editorPane.setVisible(this.isVisible());
        // Track selections if supported
        if (isEditorPaneWithSelection(editorPane)) {
            this.editorDisposables.add(editorPane.onDidChangeSelection((e) => this._onDidChangeSelection.fire(e)));
        }
        // Track for disposal
        this.editorDisposables.add(editorPane);
        return editorPane;
    }
    onDidFocusChange(side) {
        this.lastFocusedSide = side;
        // Signal to outside that our active control changed
        this._onDidChangeControl.fire();
    }
    getSelection() {
        const lastFocusedEditorPane = this.getLastFocusedEditorPane();
        if (isEditorPaneWithSelection(lastFocusedEditorPane)) {
            const selection = lastFocusedEditorPane.getSelection();
            if (selection) {
                return new SideBySideAwareEditorPaneSelection(selection, lastFocusedEditorPane === this.primaryEditorPane ? Side.PRIMARY : Side.SECONDARY);
            }
        }
        return undefined;
    }
    setOptions(options) {
        super.setOptions(options);
        // Update focus if target is provided
        if (typeof options?.target === 'number') {
            this.lastFocusedSide = options.target;
        }
        // Apply to focused side
        this.getLastFocusedEditorPane()?.setOptions(options);
    }
    setEditorVisible(visible) {
        // Forward to both sides
        this.primaryEditorPane?.setVisible(visible);
        this.secondaryEditorPane?.setVisible(visible);
        super.setEditorVisible(visible);
    }
    clearInput() {
        super.clearInput();
        // Forward to both sides
        this.primaryEditorPane?.clearInput();
        this.secondaryEditorPane?.clearInput();
        // Since we do not keep side editors alive
        // we dispose any editor created for recreation
        this.disposeEditors();
    }
    focus() {
        super.focus();
        this.getLastFocusedEditorPane()?.focus();
    }
    getLastFocusedEditorPane() {
        if (this.lastFocusedSide === Side.SECONDARY) {
            return this.secondaryEditorPane;
        }
        return this.primaryEditorPane;
    }
    layout(dimension) {
        this.dimension = dimension;
        const splitview = assertIsDefined(this.splitview);
        splitview.layout(this.orientation === 1 /* Orientation.HORIZONTAL */ ? dimension.width : dimension.height);
    }
    setBoundarySashes(sashes) {
        this._boundarySashes = sashes;
        if (this.splitview) {
            this.splitview.orthogonalEndSash = sashes.bottom;
        }
    }
    layoutPane(pane, size) {
        pane?.layout(this.orientation === 1 /* Orientation.HORIZONTAL */
            ? new Dimension(size, this.dimension.height)
            : new Dimension(this.dimension.width, size));
    }
    getControl() {
        return this.getLastFocusedEditorPane()?.getControl();
    }
    getPrimaryEditorPane() {
        return this.primaryEditorPane;
    }
    getSecondaryEditorPane() {
        return this.secondaryEditorPane;
    }
    tracksEditorViewState(input) {
        return input instanceof SideBySideEditorInput;
    }
    computeEditorViewState(resource) {
        if (!this.input || !isEqual(resource, this.toEditorViewStateResource(this.input))) {
            return; // unexpected state
        }
        const primarViewState = this.primaryEditorPane?.getViewState();
        const secondaryViewState = this.secondaryEditorPane?.getViewState();
        if (!primarViewState || !secondaryViewState) {
            return; // we actually need view states
        }
        return {
            primary: primarViewState,
            secondary: secondaryViewState,
            focus: this.lastFocusedSide,
            ratio: this.getSplitViewRatio(),
        };
    }
    toEditorViewStateResource(input) {
        let primary;
        let secondary;
        if (input instanceof SideBySideEditorInput) {
            primary = input.primary.resource;
            secondary = input.secondary.resource;
        }
        if (!secondary || !primary) {
            return undefined;
        }
        // create a URI that is the Base64 concatenation of original + modified resource
        return URI.from({
            scheme: 'sideBySide',
            path: `${multibyteAwareBtoa(secondary.toString())}${multibyteAwareBtoa(primary.toString())}`,
        });
    }
    updateStyles() {
        super.updateStyles();
        if (this.primaryEditorContainer) {
            if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
                this.primaryEditorContainer.style.borderLeftWidth = '1px';
                this.primaryEditorContainer.style.borderLeftStyle = 'solid';
                this.primaryEditorContainer.style.borderLeftColor =
                    this.getColor(SIDE_BY_SIDE_EDITOR_VERTICAL_BORDER) ?? '';
                this.primaryEditorContainer.style.borderTopWidth = '0';
            }
            else {
                this.primaryEditorContainer.style.borderTopWidth = '1px';
                this.primaryEditorContainer.style.borderTopStyle = 'solid';
                this.primaryEditorContainer.style.borderTopColor =
                    this.getColor(SIDE_BY_SIDE_EDITOR_HORIZONTAL_BORDER) ?? '';
                this.primaryEditorContainer.style.borderLeftWidth = '0';
            }
        }
    }
    dispose() {
        this.disposeEditors();
        super.dispose();
    }
    disposeEditors() {
        this.editorDisposables.clear();
        this.secondaryEditorPane = undefined;
        this.primaryEditorPane = undefined;
        this.lastFocusedSide = undefined;
        if (this.secondaryEditorContainer) {
            clearNode(this.secondaryEditorContainer);
        }
        if (this.primaryEditorContainer) {
            clearNode(this.primaryEditorContainer);
        }
    }
};
SideBySideEditor = SideBySideEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IThemeService),
    __param(4, IStorageService),
    __param(5, IConfigurationService),
    __param(6, ITextResourceConfigurationService),
    __param(7, IEditorService),
    __param(8, IEditorGroupsService)
], SideBySideEditor);
export { SideBySideEditor };
class SideBySideAwareEditorPaneSelection {
    constructor(selection, side) {
        this.selection = selection;
        this.side = side;
    }
    compare(other) {
        if (!(other instanceof SideBySideAwareEditorPaneSelection)) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        if (this.side !== other.side) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        return this.selection.compare(other.selection);
    }
    restore(options) {
        const sideBySideEditorOptions = {
            ...options,
            target: this.side,
        };
        return this.selection.restore(sideBySideEditorOptions);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZUJ5U2lkZUVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9zaWRlQnlTaWRlRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUlOLGdCQUFnQixFQUNoQixzQkFBc0IsRUFDdEIsZ0JBQWdCLElBQUksSUFBSSxFQUl4Qix5QkFBeUIsR0FFekIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUd2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHakYsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFlLE1BQU0sb0RBQW9ELENBQUE7QUFDbkcsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVsRSxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQ04scUNBQXFDLEVBQ3JDLG1DQUFtQyxHQUNuQyxNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBVXBELFNBQVMsMkJBQTJCLENBQUMsS0FBYztJQUNsRCxNQUFNLFNBQVMsR0FBRyxLQUErQyxDQUFBO0lBRWpFLE9BQU8sT0FBTyxTQUFTLEVBQUUsT0FBTyxLQUFLLFFBQVEsSUFBSSxPQUFPLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFBO0FBQ3pGLENBQUM7QUFjTSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUNaLFNBQVEsMkJBQXVEOzthQUcvQyxPQUFFLEdBQVcsc0JBQXNCLEFBQWpDLENBQWlDO2FBRTVDLGdDQUEyQixHQUFHLHFDQUFxQyxBQUF4QyxDQUF3QzthQUVsRCw4QkFBeUIsR0FBRywyQkFBMkIsQUFBOUIsQ0FBOEI7SUFFL0UsNEJBQTRCO0lBRTVCLElBQVksbUJBQW1CO1FBQzlCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUNELElBQVksbUJBQW1CO1FBQzlCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUE7SUFDL0YsQ0FBQztJQUNELElBQVksb0JBQW9CO1FBQy9CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUNELElBQVksb0JBQW9CO1FBQy9CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUE7SUFDaEcsQ0FBQztJQUVELElBQVkscUJBQXFCO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDNUUsQ0FBQztJQUNELElBQVkscUJBQXFCO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQjtZQUM5QixDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFlBQVk7WUFDdkMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQTtJQUM1QixDQUFDO0lBQ0QsSUFBWSxzQkFBc0I7UUFDakMsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBQ0QsSUFBWSxzQkFBc0I7UUFDakMsT0FBTyxJQUFJLENBQUMsbUJBQW1CO1lBQzlCLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYTtZQUN4QyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFBO0lBQzVCLENBQUM7SUFFRCxJQUFhLFlBQVksQ0FBQyxLQUFhO1FBQ3RDLFVBQVU7SUFDWCxDQUFDO0lBQ0QsSUFBYSxZQUFZLENBQUMsS0FBYTtRQUN0QyxVQUFVO0lBQ1gsQ0FBQztJQUNELElBQWEsYUFBYSxDQUFDLEtBQWE7UUFDdkMsVUFBVTtJQUNYLENBQUM7SUFDRCxJQUFhLGFBQWEsQ0FBQyxLQUFhO1FBQ3ZDLFVBQVU7SUFDWCxDQUFDO0lBRUQsSUFBYSxZQUFZO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQTtJQUM3RCxDQUFDO0lBQ0QsSUFBYSxZQUFZO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQTtJQUM3RCxDQUFDO0lBQ0QsSUFBYSxhQUFhO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQTtJQUMvRCxDQUFDO0lBQ0QsSUFBYSxhQUFhO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQTtJQUMvRCxDQUFDO0lBMkNELFlBQ0MsS0FBbUIsRUFDQSxnQkFBbUMsRUFDL0Isb0JBQTJDLEVBQ25ELFlBQTJCLEVBQ3pCLGNBQStCLEVBQ3pCLG9CQUE0RCxFQUVuRixnQ0FBbUUsRUFDbkQsYUFBNkIsRUFDdkIsa0JBQXdDO1FBRTlELEtBQUssQ0FDSixrQkFBZ0IsQ0FBQyxFQUFFLEVBQ25CLEtBQUssRUFDTCxrQkFBZ0IsQ0FBQyx5QkFBeUIsRUFDMUMsZ0JBQWdCLEVBQ2hCLG9CQUFvQixFQUNwQixjQUFjLEVBQ2QsZ0NBQWdDLEVBQ2hDLFlBQVksRUFDWixhQUFhLEVBQ2Isa0JBQWtCLENBQ2xCLENBQUE7UUFqQnVDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUE3Q3BGLFlBQVk7UUFFWixnQkFBZ0I7UUFFUix1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMxQyxJQUFJLE9BQU8sRUFBaUQsQ0FDNUQsQ0FBQTtRQUVPLGdDQUEyQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ25ELElBQUksS0FBSyxFQUFpRCxDQUMxRCxDQUFBO1FBQ2lCLCtCQUEwQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQ3ZELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQzdCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQ3RDLENBQUE7UUFFZ0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdEQsSUFBSSxPQUFPLEVBQW1DLENBQzlDLENBQUE7UUFDUSx5QkFBb0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFBO1FBRWhFLFlBQVk7UUFFSixzQkFBaUIsR0FBMkIsU0FBUyxDQUFBO1FBQ3JELHdCQUFtQixHQUEyQixTQUFTLENBQUE7UUFPOUMseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFDNUQsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFHbEUsY0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQixvQkFBZSxHQUE4QyxTQUFTLENBQUE7UUEyQjdFLElBQUksQ0FBQyxXQUFXO1lBQ2YsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDakMsa0JBQWdCLENBQUMsMkJBQTJCLENBQzVDLEtBQUssVUFBVTtnQkFDZixDQUFDO2dCQUNELENBQUMsK0JBQXVCLENBQUE7UUFFMUIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ3pGLENBQUE7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsS0FBZ0M7UUFDOUQsSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsa0JBQWdCLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDO1lBQzlFLElBQUksQ0FBQyxXQUFXO2dCQUNmLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQ2pDLGtCQUFnQixDQUFDLDJCQUEyQixDQUM1QyxLQUFLLFVBQVU7b0JBQ2YsQ0FBQztvQkFDRCxDQUFDLCtCQUF1QixDQUFBO1lBRTFCLG9EQUFvRDtZQUNwRCxvREFBb0Q7WUFDcEQsbUJBQW1CO1lBQ25CLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtZQUN6QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO1FBRXRELHdDQUF3QztRQUN4QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN0QyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUMxQixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbEMsQ0FBQztRQUVELGFBQWE7UUFDYixJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV0QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUM1QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksS0FBSyxHQUF1QixTQUFTLENBQUE7UUFFekMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbkQsMERBQTBEO1lBQzFELGlEQUFpRDtZQUNqRCxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNoRCxNQUFNLFNBQVMsR0FDZCxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsbUNBQTJCO29CQUNwRCxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLO29CQUN0QixDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUE7Z0JBQ3pCLEtBQUssR0FBRyxZQUFZLEdBQUcsU0FBUyxDQUFBO1lBQ2pDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRVMsWUFBWSxDQUFDLE1BQW1CO1FBQ3pDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFFM0MseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLENBQUMsZ0RBQWdELENBQUMsQ0FBQTtRQUNuRixJQUFJLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLGdEQUFnRCxDQUFDLENBQUE7UUFFakYsYUFBYTtRQUNiLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVPLGVBQWUsQ0FBQyxNQUFtQixFQUFFLEtBQWM7UUFDMUQsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FDN0MsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUN4RCxDQUFBO1FBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxDQUFDLENBQzFFLENBQUE7UUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLG1DQUEyQixFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQTtRQUNoRSxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUE7WUFDL0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQTtRQUMvRCxDQUFDO1FBRUQsb0JBQW9CO1FBQ3BCLElBQUksVUFBVSxHQUFvQixNQUFNLENBQUMsVUFBVSxDQUFBO1FBQ25ELElBQUksV0FBVyxHQUFvQixNQUFNLENBQUMsVUFBVSxDQUFBO1FBQ3BELElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxNQUFNLFNBQVMsR0FDZCxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsbUNBQTJCO2dCQUNwRCxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLO2dCQUN0QixDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUE7WUFFekIsVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFBO1lBQzFDLFdBQVcsR0FBRyxTQUFTLEdBQUcsVUFBVSxDQUFBO1lBRXBDLDhEQUE4RDtZQUM5RCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDcEIsSUFBSSxDQUFDLFdBQVcsbUNBQTJCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDMUYsQ0FBQTtRQUNGLENBQUM7UUFFRCxtQkFBbUI7UUFDbkIsTUFBTSx3QkFBd0IsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDL0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQ3JCO1lBQ0MsT0FBTyxFQUFFLHdCQUF3QjtZQUNqQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQztZQUNqRSxXQUFXLEVBQ1YsSUFBSSxDQUFDLFdBQVcsbUNBQTJCO2dCQUMxQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsS0FBSztnQkFDckMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLE1BQU07WUFDeEMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7WUFDckMsV0FBVyxFQUFFLEtBQUssQ0FBQyxJQUFJO1NBQ3ZCLEVBQ0QsVUFBVSxDQUNWLENBQUE7UUFFRCxrQkFBa0I7UUFDbEIsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDM0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQ3JCO1lBQ0MsT0FBTyxFQUFFLHNCQUFzQjtZQUMvQixNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQztZQUMvRCxXQUFXLEVBQ1YsSUFBSSxDQUFDLFdBQVcsbUNBQTJCO2dCQUMxQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsS0FBSztnQkFDckMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLE1BQU07WUFDeEMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7WUFDckMsV0FBVyxFQUFFLEtBQUssQ0FBQyxJQUFJO1NBQ3ZCLEVBQ0QsV0FBVyxDQUNYLENBQUE7UUFFRCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7SUFDcEIsQ0FBQztJQUVRLFFBQVE7UUFDaEIsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzVCLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFUSxLQUFLLENBQUMsUUFBUSxDQUN0QixLQUE0QixFQUM1QixPQUE2QyxFQUM3QyxPQUEyQixFQUMzQixLQUF3QjtRQUV4QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFBO1FBQzNCLE1BQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVwRCx3REFBd0Q7UUFDeEQsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDM0MsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDdEIsQ0FBQztZQUVELElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDMUIsQ0FBQztRQUVELGtDQUFrQztRQUNsQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDckYsSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLEVBQUUsS0FBSyxDQUFBO1FBRXZDLElBQUksT0FBTyxTQUFTLEVBQUUsS0FBSyxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDNUQsTUFBTSxTQUFTLEdBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLG1DQUEyQjtnQkFDcEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSztnQkFDdEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFBO1lBRXpCLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN0RSxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxDQUFDO1FBRUQsMEJBQTBCO1FBQzFCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNqQixJQUFJLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUM7WUFDOUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDO1NBQ3hFLENBQUMsQ0FBQTtRQUVGLHFDQUFxQztRQUNyQyxJQUFJLE9BQU8sT0FBTyxFQUFFLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFTyxhQUFhLENBQ3BCLEtBQTRCLEVBQzVCLE9BQTZDLEVBQzdDLE9BQTJCO1FBTTNCLE1BQU0sU0FBUyxHQUFHLDJCQUEyQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUM7WUFDaEUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxTQUFTO1lBQ3BCLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRTNDLElBQUksY0FBYyxHQUFtQixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3hELElBQUksZ0JBQWdCLEdBQStCLFNBQVMsQ0FBQTtRQUU1RCx3REFBd0Q7UUFDeEQsMERBQTBEO1FBQzFELE9BQU87UUFFUCxJQUFJLE9BQU8sRUFBRSxNQUFNLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLGdCQUFnQixHQUFHLEVBQUUsR0FBRyxPQUFPLEVBQUUsQ0FBQTtRQUNsQyxDQUFDO2FBQU0sQ0FBQztZQUNQLGNBQWMsR0FBRyxFQUFFLEdBQUcsT0FBTyxFQUFFLENBQUE7UUFDaEMsQ0FBQztRQUVELGNBQWMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxFQUFFLE9BQU8sQ0FBQTtRQUU3QyxJQUFJLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdkIsZ0JBQWdCLEdBQUcsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFBO1lBQ3RELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxnQkFBZ0IsQ0FBQyxTQUFTLEdBQUcsU0FBUyxFQUFFLFNBQVMsQ0FBQTtZQUNsRCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsQ0FBQTtJQUMzRSxDQUFDO0lBRU8sYUFBYSxDQUFDLFFBQStCO1FBQ3BELGlCQUFpQjtRQUNqQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FDN0MsUUFBUSxDQUFDLFNBQVMsRUFDbEIsZUFBZSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUM5QyxDQUFBO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQzNDLFFBQVEsQ0FBQyxPQUFPLEVBQ2hCLGVBQWUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FDNUMsQ0FBQTtRQUVELFNBQVM7UUFDVCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUUzQixXQUFXO1FBQ1gsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNqRCxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFDL0UsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQzdFLENBQUE7UUFDRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXZDLHlEQUF5RDtRQUN6RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUN6QixJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FDNUUsQ0FBQTtRQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQ3pCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUNoRixDQUFBO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxXQUF3QixFQUFFLFNBQXNCO1FBQ3RFLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDdkMsZ0JBQWdCLENBQUMsVUFBVSxDQUMzQixDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM1QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELHNDQUFzQztRQUN0QyxNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMxRixVQUFVLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzVCLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7UUFFdkMsZ0NBQWdDO1FBQ2hDLElBQUkseUJBQXlCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUMzQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUN6QixVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDMUUsQ0FBQTtRQUNGLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUV0QyxPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO0lBRU8sZ0JBQWdCLENBQUMsSUFBbUM7UUFDM0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUE7UUFFM0Isb0RBQW9EO1FBQ3BELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsWUFBWTtRQUNYLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7UUFDN0QsSUFBSSx5QkFBeUIsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7WUFDdEQsTUFBTSxTQUFTLEdBQUcscUJBQXFCLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDdEQsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixPQUFPLElBQUksa0NBQWtDLENBQzVDLFNBQVMsRUFDVCxxQkFBcUIsS0FBSyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQ2hGLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFUSxVQUFVLENBQUMsT0FBNkM7UUFDaEUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUV6QixxQ0FBcUM7UUFDckMsSUFBSSxPQUFPLE9BQU8sRUFBRSxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO1FBQ3RDLENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFa0IsZ0JBQWdCLENBQUMsT0FBZ0I7UUFDbkQsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDM0MsSUFBSSxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUU3QyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVRLFVBQVU7UUFDbEIsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBRWxCLHdCQUF3QjtRQUN4QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLENBQUE7UUFDcEMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLFVBQVUsRUFBRSxDQUFBO1FBRXRDLDBDQUEwQztRQUMxQywrQ0FBK0M7UUFDL0MsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFUSxLQUFLO1FBQ2IsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRWIsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUE7SUFDekMsQ0FBQztJQUVPLHdCQUF3QjtRQUMvQixJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzdDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFBO1FBQ2hDLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBRUQsTUFBTSxDQUFDLFNBQW9CO1FBQzFCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBRTFCLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakQsU0FBUyxDQUFDLE1BQU0sQ0FDZixJQUFJLENBQUMsV0FBVyxtQ0FBMkIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDaEYsQ0FBQTtJQUNGLENBQUM7SUFFUSxpQkFBaUIsQ0FBQyxNQUF1QjtRQUNqRCxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQTtRQUU3QixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7SUFFTyxVQUFVLENBQUMsSUFBNEIsRUFBRSxJQUFZO1FBQzVELElBQUksRUFBRSxNQUFNLENBQ1gsSUFBSSxDQUFDLFdBQVcsbUNBQTJCO1lBQzFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDNUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUM1QyxDQUFBO0lBQ0YsQ0FBQztJQUVRLFVBQVU7UUFDbEIsT0FBTyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQTtJQUNyRCxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFFRCxzQkFBc0I7UUFDckIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUE7SUFDaEMsQ0FBQztJQUVTLHFCQUFxQixDQUFDLEtBQWtCO1FBQ2pELE9BQU8sS0FBSyxZQUFZLHFCQUFxQixDQUFBO0lBQzlDLENBQUM7SUFFUyxzQkFBc0IsQ0FBQyxRQUFhO1FBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNuRixPQUFNLENBQUMsbUJBQW1CO1FBQzNCLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLENBQUE7UUFDOUQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLENBQUE7UUFFbkUsSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDN0MsT0FBTSxDQUFDLCtCQUErQjtRQUN2QyxDQUFDO1FBRUQsT0FBTztZQUNOLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLFNBQVMsRUFBRSxrQkFBa0I7WUFDN0IsS0FBSyxFQUFFLElBQUksQ0FBQyxlQUFlO1lBQzNCLEtBQUssRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUU7U0FDL0IsQ0FBQTtJQUNGLENBQUM7SUFFUyx5QkFBeUIsQ0FBQyxLQUFrQjtRQUNyRCxJQUFJLE9BQXdCLENBQUE7UUFDNUIsSUFBSSxTQUEwQixDQUFBO1FBRTlCLElBQUksS0FBSyxZQUFZLHFCQUFxQixFQUFFLENBQUM7WUFDNUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFBO1lBQ2hDLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQTtRQUNyQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzVCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxnRkFBZ0Y7UUFDaEYsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2YsTUFBTSxFQUFFLFlBQVk7WUFDcEIsSUFBSSxFQUFFLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUU7U0FDNUYsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLFlBQVk7UUFDcEIsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBRXBCLElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDakMsSUFBSSxJQUFJLENBQUMsV0FBVyxtQ0FBMkIsRUFBRSxDQUFDO2dCQUNqRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUE7Z0JBQ3pELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQTtnQkFDM0QsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxlQUFlO29CQUNoRCxJQUFJLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxDQUFDLElBQUksRUFBRSxDQUFBO2dCQUV6RCxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUE7WUFDdkQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQTtnQkFDeEQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFBO2dCQUMxRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLGNBQWM7b0JBQy9DLElBQUksQ0FBQyxRQUFRLENBQUMscUNBQXFDLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBRTNELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQTtZQUN4RCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBRXJCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRU8sY0FBYztRQUNyQixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFOUIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFBO1FBRWxDLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO1FBRWhDLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDbkMsU0FBUyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ2pDLFNBQVMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUN2QyxDQUFDO0lBQ0YsQ0FBQzs7QUFsbkJXLGdCQUFnQjtJQStHMUIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsaUNBQWlDLENBQUE7SUFFakMsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLG9CQUFvQixDQUFBO0dBdkhWLGdCQUFnQixDQW1uQjVCOztBQUVELE1BQU0sa0NBQWtDO0lBQ3ZDLFlBQ2tCLFNBQStCLEVBQy9CLElBQW1DO1FBRG5DLGNBQVMsR0FBVCxTQUFTLENBQXNCO1FBQy9CLFNBQUksR0FBSixJQUFJLENBQStCO0lBQ2xELENBQUM7SUFFSixPQUFPLENBQUMsS0FBMkI7UUFDbEMsSUFBSSxDQUFDLENBQUMsS0FBSyxZQUFZLGtDQUFrQyxDQUFDLEVBQUUsQ0FBQztZQUM1RCwwREFBaUQ7UUFDbEQsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUIsMERBQWlEO1FBQ2xELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsT0FBTyxDQUFDLE9BQXVCO1FBQzlCLE1BQU0sdUJBQXVCLEdBQTZCO1lBQ3pELEdBQUcsT0FBTztZQUNWLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSTtTQUNqQixDQUFBO1FBRUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7Q0FDRCJ9
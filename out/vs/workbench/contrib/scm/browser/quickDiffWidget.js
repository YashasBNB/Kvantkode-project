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
var QuickDiffEditorController_1;
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import { Action, ActionRunner } from '../../../../base/common/actions.js';
import { Event } from '../../../../base/common/event.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { SelectActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { defaultSelectBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { peekViewBorder, peekViewTitleBackground, peekViewTitleForeground, peekViewTitleInfoForeground, PeekViewWidget, } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IMenuService, MenuId, MenuItemAction, MenuRegistry, } from '../../../../platform/actions/common/actions.js';
import { EditorAction, registerEditorAction } from '../../../../editor/browser/editorExtensions.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { EmbeddedDiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { IQuickDiffModelService } from './quickDiffModel.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { rot } from '../../../../base/common/numbers.js';
import { ChangeType, getChangeHeight, getChangeType, getChangeTypeColor, getModifiedEndLineNumber, lineIntersectsChange, } from '../common/quickDiff.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { TextCompareEditorActiveContext } from '../../../common/contextkeys.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { basename } from '../../../../base/common/resources.js';
import { Position } from '../../../../editor/common/core/position.js';
import { getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { gotoNextLocation, gotoPreviousLocation, } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Color } from '../../../../base/common/color.js';
import { getOuterEditor } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { quickDiffDecorationCount } from './quickDiffDecorator.js';
export const isQuickDiffVisible = new RawContextKey('dirtyDiffVisible', false);
let QuickDiffPickerViewItem = class QuickDiffPickerViewItem extends SelectActionViewItem {
    constructor(action, providers, selected, contextViewService, themeService) {
        const items = providers.map((provider) => ({ provider, text: provider }));
        let startingSelection = providers.indexOf(selected);
        if (startingSelection === -1) {
            startingSelection = 0;
        }
        const styles = { ...defaultSelectBoxStyles };
        const theme = themeService.getColorTheme();
        const editorBackgroundColor = theme.getColor(editorBackground);
        const peekTitleColor = theme.getColor(peekViewTitleBackground);
        const opaqueTitleColor = peekTitleColor?.makeOpaque(editorBackgroundColor) ?? editorBackgroundColor;
        styles.selectBackground = opaqueTitleColor.lighten(0.6).toString();
        super(null, action, items, startingSelection, contextViewService, styles, {
            ariaLabel: nls.localize('remotes', 'Switch quick diff base'),
        });
        this.optionsItems = items;
    }
    setSelection(provider) {
        const index = this.optionsItems.findIndex((item) => item.provider === provider);
        this.select(index);
    }
    getActionContext(_, index) {
        return this.optionsItems[index];
    }
    render(container) {
        super.render(container);
        this.setFocusable(true);
    }
};
QuickDiffPickerViewItem = __decorate([
    __param(3, IContextViewService),
    __param(4, IThemeService)
], QuickDiffPickerViewItem);
export { QuickDiffPickerViewItem };
export class QuickDiffPickerBaseAction extends Action {
    static { this.ID = 'quickDiff.base.switch'; }
    static { this.LABEL = nls.localize('quickDiff.base.switch', 'Switch Quick Diff Base'); }
    constructor(callback) {
        super(QuickDiffPickerBaseAction.ID, QuickDiffPickerBaseAction.LABEL, undefined, undefined);
        this.callback = callback;
    }
    async run(event) {
        return this.callback(event);
    }
}
class QuickDiffWidgetActionRunner extends ActionRunner {
    runAction(action, context) {
        if (action instanceof MenuItemAction) {
            return action.run(...context);
        }
        return super.runAction(action, context);
    }
}
let QuickDiffWidgetEditorAction = class QuickDiffWidgetEditorAction extends Action {
    constructor(editor, action, cssClass, keybindingService, instantiationService) {
        const keybinding = keybindingService.lookupKeybinding(action.id);
        const label = action.label + (keybinding ? ` (${keybinding.getLabel()})` : '');
        super(action.id, label, cssClass);
        this.instantiationService = instantiationService;
        this.action = action;
        this.editor = editor;
    }
    run() {
        return Promise.resolve(this.instantiationService.invokeFunction((accessor) => this.action.run(accessor, this.editor, null)));
    }
};
QuickDiffWidgetEditorAction = __decorate([
    __param(3, IKeybindingService),
    __param(4, IInstantiationService)
], QuickDiffWidgetEditorAction);
let QuickDiffWidget = class QuickDiffWidget extends PeekViewWidget {
    constructor(editor, model, themeService, instantiationService, menuService, contextKeyService) {
        super(editor, { isResizeable: true, frameWidth: 1, keepEditorSelection: true, className: 'dirty-diff' }, instantiationService);
        this.model = model;
        this.themeService = themeService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this._index = 0;
        this._provider = '';
        this.height = undefined;
        this._disposables.add(themeService.onDidColorThemeChange(this._applyTheme, this));
        this._applyTheme(themeService.getColorTheme());
        if (!Iterable.isEmpty(this.model.originalTextModels)) {
            contextKeyService = contextKeyService.createOverlay([
                ['originalResourceScheme', Iterable.first(this.model.originalTextModels)?.uri.scheme],
                [
                    'originalResourceSchemes',
                    Iterable.map(this.model.originalTextModels, (textModel) => textModel.uri.scheme),
                ],
            ]);
        }
        this.create();
        if (editor.hasModel()) {
            this.title = basename(editor.getModel().uri);
        }
        else {
            this.title = '';
        }
        this.setTitle(this.title);
    }
    get provider() {
        return this._provider;
    }
    get index() {
        return this._index;
    }
    get visibleRange() {
        const visibleRanges = this.diffEditor.getModifiedEditor().getVisibleRanges();
        return visibleRanges.length >= 0 ? visibleRanges[0] : undefined;
    }
    showChange(index, usePosition = true) {
        const labeledChange = this.model.changes[index];
        const change = labeledChange.change;
        this._index = index;
        this.contextKeyService.createKey('originalResourceScheme', this.model.changes[index].original.scheme);
        this.updateActions();
        this._provider = labeledChange.label;
        this.change = change;
        if (Iterable.isEmpty(this.model.originalTextModels)) {
            return;
        }
        const onFirstDiffUpdate = Event.once(this.diffEditor.onDidUpdateDiff);
        // TODO@joao TODO@alex need this setTimeout probably because the
        // non-side-by-side diff still hasn't created the view zones
        onFirstDiffUpdate(() => setTimeout(() => this.revealChange(change), 0));
        const diffEditorModel = this.model.getDiffEditorModel(labeledChange.original);
        if (!diffEditorModel) {
            return;
        }
        this.diffEditor.setModel(diffEditorModel);
        this.dropdown?.setSelection(labeledChange.label);
        const position = new Position(getModifiedEndLineNumber(change), 1);
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        const editorHeight = this.editor.getLayoutInfo().height;
        const editorHeightInLines = Math.floor(editorHeight / lineHeight);
        const height = Math.min(getChangeHeight(change) + /* padding */ 8, Math.floor(editorHeightInLines / 3));
        this.renderTitle(labeledChange.label);
        const changeType = getChangeType(change);
        const changeTypeColor = getChangeTypeColor(this.themeService.getColorTheme(), changeType);
        this.style({ frameColor: changeTypeColor, arrowColor: changeTypeColor });
        const providerSpecificChanges = [];
        let contextIndex = index;
        for (const change of this.model.changes) {
            if (change.label === this.model.changes[this._index].label) {
                providerSpecificChanges.push(change.change);
                if (labeledChange === change) {
                    contextIndex = providerSpecificChanges.length - 1;
                }
            }
        }
        this._actionbarWidget.context = [
            diffEditorModel.modified.uri,
            providerSpecificChanges,
            contextIndex,
        ];
        if (usePosition) {
            this.show(position, height);
            this.editor.setPosition(position);
            this.editor.focus();
        }
    }
    renderTitle(label) {
        const providerChanges = this.model.quickDiffChanges.get(label);
        const providerIndex = providerChanges.indexOf(this._index);
        let detail;
        if (!this.shouldUseDropdown()) {
            detail =
                this.model.changes.length > 1
                    ? nls.localize('changes', '{0} - {1} of {2} changes', label, providerIndex + 1, providerChanges.length)
                    : nls.localize('change', '{0} - {1} of {2} change', label, providerIndex + 1, providerChanges.length);
            this.dropdownContainer.style.display = 'none';
        }
        else {
            detail =
                this.model.changes.length > 1
                    ? nls.localize('multiChanges', '{0} of {1} changes', providerIndex + 1, providerChanges.length)
                    : nls.localize('multiChange', '{0} of {1} change', providerIndex + 1, providerChanges.length);
            this.dropdownContainer.style.display = 'inherit';
        }
        this.setTitle(this.title, detail);
    }
    switchQuickDiff(event) {
        const newProvider = event?.provider;
        if (newProvider === this.model.changes[this._index].label) {
            return;
        }
        let closestGreaterIndex = this._index < this.model.changes.length - 1 ? this._index + 1 : 0;
        for (let i = closestGreaterIndex; i !== this._index; i < this.model.changes.length - 1 ? i++ : (i = 0)) {
            if (this.model.changes[i].label === newProvider) {
                closestGreaterIndex = i;
                break;
            }
        }
        let closestLesserIndex = this._index > 0 ? this._index - 1 : this.model.changes.length - 1;
        for (let i = closestLesserIndex; i !== this._index; i >= 0 ? i-- : (i = this.model.changes.length - 1)) {
            if (this.model.changes[i].label === newProvider) {
                closestLesserIndex = i;
                break;
            }
        }
        const closestIndex = Math.abs(this.model.changes[closestGreaterIndex].change.modifiedEndLineNumber -
            this.model.changes[this._index].change.modifiedEndLineNumber) <
            Math.abs(this.model.changes[closestLesserIndex].change.modifiedEndLineNumber -
                this.model.changes[this._index].change.modifiedEndLineNumber)
            ? closestGreaterIndex
            : closestLesserIndex;
        this.showChange(closestIndex, false);
    }
    shouldUseDropdown() {
        const visibleQuickDiffs = this.model.quickDiffs.filter((quickDiff) => quickDiff.visible);
        const visibleQuickDiffResults = this.model
            .getQuickDiffResults()
            .filter((result) => visibleQuickDiffs.some((quickDiff) => quickDiff.label === result.label));
        return visibleQuickDiffResults.filter((quickDiff) => quickDiff.changes.length > 0).length > 1;
    }
    updateActions() {
        if (!this._actionbarWidget) {
            return;
        }
        const previous = this.instantiationService.createInstance(QuickDiffWidgetEditorAction, this.editor, new ShowPreviousChangeAction(this.editor), ThemeIcon.asClassName(gotoPreviousLocation));
        const next = this.instantiationService.createInstance(QuickDiffWidgetEditorAction, this.editor, new ShowNextChangeAction(this.editor), ThemeIcon.asClassName(gotoNextLocation));
        this._disposables.add(previous);
        this._disposables.add(next);
        if (this.menu) {
            this.menu.dispose();
        }
        this.menu = this.menuService.createMenu(MenuId.SCMChangeContext, this.contextKeyService);
        const actions = getFlatActionBarActions(this.menu.getActions({ shouldForwardArgs: true }));
        this._actionbarWidget.clear();
        this._actionbarWidget.push(actions.reverse(), { label: false, icon: true });
        this._actionbarWidget.push([next, previous], { label: false, icon: true });
        this._actionbarWidget.push(this._disposables.add(new Action('peekview.close', nls.localize('label.close', 'Close'), ThemeIcon.asClassName(Codicon.close), true, () => this.dispose())), { label: false, icon: true });
    }
    _fillHead(container) {
        super._fillHead(container, true);
        const visibleQuickDiffs = this.model.quickDiffs.filter((quickDiff) => quickDiff.visible);
        this.dropdownContainer = dom.prepend(this._titleElement, dom.$('.dropdown'));
        this.dropdown = this.instantiationService.createInstance(QuickDiffPickerViewItem, new QuickDiffPickerBaseAction((event) => this.switchQuickDiff(event)), visibleQuickDiffs.map((quickDiff) => quickDiff.label), this.model.changes[this._index].label);
        this.dropdown.render(this.dropdownContainer);
        this.updateActions();
    }
    _getActionBarOptions() {
        const actionRunner = new QuickDiffWidgetActionRunner();
        this._disposables.add(actionRunner);
        // close widget on successful action
        this._disposables.add(actionRunner.onDidRun((e) => {
            if (!(e.action instanceof QuickDiffWidgetEditorAction) && !e.error) {
                this.dispose();
            }
        }));
        return {
            ...super._getActionBarOptions(),
            actionRunner,
        };
    }
    _fillBody(container) {
        const options = {
            scrollBeyondLastLine: true,
            scrollbar: {
                verticalScrollbarSize: 14,
                horizontal: 'auto',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false,
            },
            overviewRulerLanes: 2,
            fixedOverflowWidgets: true,
            minimap: { enabled: false },
            renderSideBySide: false,
            readOnly: false,
            renderIndicators: false,
            diffAlgorithm: 'advanced',
            ignoreTrimWhitespace: false,
            stickyScroll: { enabled: false },
        };
        this.diffEditor = this.instantiationService.createInstance(EmbeddedDiffEditorWidget, container, options, {}, this.editor);
        this._disposables.add(this.diffEditor);
    }
    _onWidth(width) {
        if (typeof this.height === 'undefined') {
            return;
        }
        this.diffEditor.layout({ height: this.height, width });
    }
    _doLayoutBody(height, width) {
        super._doLayoutBody(height, width);
        this.diffEditor.layout({ height, width });
        if (typeof this.height === 'undefined' && this.change) {
            this.revealChange(this.change);
        }
        this.height = height;
    }
    revealChange(change) {
        let start, end;
        if (change.modifiedEndLineNumber === 0) {
            // deletion
            start = change.modifiedStartLineNumber;
            end = change.modifiedStartLineNumber + 1;
        }
        else if (change.originalEndLineNumber > 0) {
            // modification
            start = change.modifiedStartLineNumber - 1;
            end = change.modifiedEndLineNumber + 1;
        }
        else {
            // insertion
            start = change.modifiedStartLineNumber;
            end = change.modifiedEndLineNumber;
        }
        this.diffEditor.revealLinesInCenter(start, end, 1 /* ScrollType.Immediate */);
    }
    _applyTheme(theme) {
        const borderColor = theme.getColor(peekViewBorder) || Color.transparent;
        this.style({
            arrowColor: borderColor,
            frameColor: borderColor,
            headerBackgroundColor: theme.getColor(peekViewTitleBackground) || Color.transparent,
            primaryHeadingColor: theme.getColor(peekViewTitleForeground),
            secondaryHeadingColor: theme.getColor(peekViewTitleInfoForeground),
        });
    }
    revealRange(range) {
        this.editor.revealLineInCenterIfOutsideViewport(range.endLineNumber, 0 /* ScrollType.Smooth */);
    }
    hasFocus() {
        return this.diffEditor.hasTextFocus();
    }
    dispose() {
        super.dispose();
        this.menu?.dispose();
    }
};
QuickDiffWidget = __decorate([
    __param(2, IThemeService),
    __param(3, IInstantiationService),
    __param(4, IMenuService),
    __param(5, IContextKeyService)
], QuickDiffWidget);
let QuickDiffEditorController = class QuickDiffEditorController extends Disposable {
    static { QuickDiffEditorController_1 = this; }
    static { this.ID = 'editor.contrib.quickdiff'; }
    static get(editor) {
        return editor.getContribution(QuickDiffEditorController_1.ID);
    }
    constructor(editor, contextKeyService, configurationService, quickDiffModelService, instantiationService) {
        super();
        this.editor = editor;
        this.configurationService = configurationService;
        this.quickDiffModelService = quickDiffModelService;
        this.instantiationService = instantiationService;
        this.model = null;
        this.widget = null;
        this.session = Disposable.None;
        this.mouseDownInfo = null;
        this.enabled = false;
        this.gutterActionDisposables = new DisposableStore();
        this.enabled = !contextKeyService.getContextKeyValue('isInDiffEditor');
        this.stylesheet = domStylesheetsJs.createStyleSheet(undefined, undefined, this._store);
        if (this.enabled) {
            this.isQuickDiffVisible = isQuickDiffVisible.bindTo(contextKeyService);
            this._register(editor.onDidChangeModel(() => this.close()));
            const onDidChangeGutterAction = Event.filter(configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('scm.diffDecorationsGutterAction'));
            this._register(onDidChangeGutterAction(this.onDidChangeGutterAction, this));
            this.onDidChangeGutterAction();
        }
    }
    onDidChangeGutterAction() {
        const gutterAction = this.configurationService.getValue('scm.diffDecorationsGutterAction');
        this.gutterActionDisposables.clear();
        if (gutterAction === 'diff') {
            this.gutterActionDisposables.add(this.editor.onMouseDown((e) => this.onEditorMouseDown(e)));
            this.gutterActionDisposables.add(this.editor.onMouseUp((e) => this.onEditorMouseUp(e)));
            this.stylesheet.textContent = `
				.monaco-editor .dirty-diff-glyph {
					cursor: pointer;
				}

				.monaco-editor .margin-view-overlays .dirty-diff-glyph:hover::before {
					height: 100%;
					width: 6px;
					left: -6px;
				}

				.monaco-editor .margin-view-overlays .dirty-diff-deleted:hover::after {
					bottom: 0;
					border-top-width: 0;
					border-bottom-width: 0;
				}
			`;
        }
        else {
            this.stylesheet.textContent = ``;
        }
    }
    canNavigate() {
        return (!this.widget || this.widget?.index === -1 || (!!this.model && this.model.changes.length > 1));
    }
    refresh() {
        this.widget?.showChange(this.widget.index, false);
    }
    next(lineNumber) {
        if (!this.assertWidget()) {
            return;
        }
        if (!this.widget || !this.model) {
            return;
        }
        let index;
        if (this.editor.hasModel() && (typeof lineNumber === 'number' || !this.widget.provider)) {
            index = this.model.findNextClosestChange(typeof lineNumber === 'number' ? lineNumber : this.editor.getPosition().lineNumber, true, this.widget.provider);
        }
        else {
            const providerChanges = this.model.quickDiffChanges.get(this.widget.provider) ??
                this.model.quickDiffChanges.values().next().value;
            const mapIndex = providerChanges.findIndex((value) => value === this.widget.index);
            index = providerChanges[rot(mapIndex + 1, providerChanges.length)];
        }
        this.widget.showChange(index);
    }
    previous(lineNumber) {
        if (!this.assertWidget()) {
            return;
        }
        if (!this.widget || !this.model) {
            return;
        }
        let index;
        if (this.editor.hasModel() && typeof lineNumber === 'number') {
            index = this.model.findPreviousClosestChange(typeof lineNumber === 'number' ? lineNumber : this.editor.getPosition().lineNumber, true, this.widget.provider);
        }
        else {
            const providerChanges = this.model.quickDiffChanges.get(this.widget.provider) ??
                this.model.quickDiffChanges.values().next().value;
            const mapIndex = providerChanges.findIndex((value) => value === this.widget.index);
            index = providerChanges[rot(mapIndex - 1, providerChanges.length)];
        }
        this.widget.showChange(index);
    }
    close() {
        this.session.dispose();
        this.session = Disposable.None;
    }
    assertWidget() {
        if (!this.enabled) {
            return false;
        }
        if (this.widget) {
            if (!this.model || this.model.changes.length === 0) {
                this.close();
                return false;
            }
            return true;
        }
        const editorModel = this.editor.getModel();
        if (!editorModel) {
            return false;
        }
        const modelRef = this.quickDiffModelService.createQuickDiffModelReference(editorModel.uri);
        if (!modelRef) {
            return false;
        }
        if (modelRef.object.changes.length === 0) {
            modelRef.dispose();
            return false;
        }
        this.model = modelRef.object;
        this.widget = this.instantiationService.createInstance(QuickDiffWidget, this.editor, this.model);
        this.isQuickDiffVisible.set(true);
        const disposables = new DisposableStore();
        disposables.add(Event.once(this.widget.onDidClose)(this.close, this));
        const onDidModelChange = Event.chain(this.model.onDidChange, ($) => $.filter((e) => e.diff.length > 0).map((e) => e.diff));
        onDidModelChange(this.onDidModelChange, this, disposables);
        disposables.add(modelRef);
        disposables.add(this.widget);
        disposables.add(toDisposable(() => {
            this.model = null;
            this.widget = null;
            this.isQuickDiffVisible.set(false);
            this.editor.focus();
        }));
        this.session = disposables;
        return true;
    }
    onDidModelChange(splices) {
        if (!this.model || !this.widget || this.widget.hasFocus()) {
            return;
        }
        for (const splice of splices) {
            if (splice.start <= this.widget.index) {
                this.next();
                return;
            }
        }
        this.refresh();
    }
    onEditorMouseDown(e) {
        this.mouseDownInfo = null;
        const range = e.target.range;
        if (!range) {
            return;
        }
        if (!e.event.leftButton) {
            return;
        }
        if (e.target.type !== 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
            return;
        }
        if (!e.target.element) {
            return;
        }
        if (e.target.element.className.indexOf('dirty-diff-glyph') < 0) {
            return;
        }
        const data = e.target.detail;
        const offsetLeftInGutter = e.target.element.offsetLeft;
        const gutterOffsetX = data.offsetX - offsetLeftInGutter;
        // TODO@joao TODO@alex TODO@martin this is such that we don't collide with folding
        if (gutterOffsetX < -3 || gutterOffsetX > 3) {
            // dirty diff decoration on hover is 6px wide
            return;
        }
        this.mouseDownInfo = { lineNumber: range.startLineNumber };
    }
    onEditorMouseUp(e) {
        if (!this.mouseDownInfo) {
            return;
        }
        const { lineNumber } = this.mouseDownInfo;
        this.mouseDownInfo = null;
        const range = e.target.range;
        if (!range || range.startLineNumber !== lineNumber) {
            return;
        }
        if (e.target.type !== 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
            return;
        }
        const editorModel = this.editor.getModel();
        if (!editorModel) {
            return;
        }
        const modelRef = this.quickDiffModelService.createQuickDiffModelReference(editorModel.uri);
        if (!modelRef) {
            return;
        }
        try {
            const index = modelRef.object.changes.findIndex((change) => lineIntersectsChange(lineNumber, change.change));
            if (index < 0) {
                return;
            }
            if (index === this.widget?.index) {
                this.close();
            }
            else {
                this.next(lineNumber);
            }
        }
        finally {
            modelRef.dispose();
        }
    }
    dispose() {
        this.gutterActionDisposables.dispose();
        super.dispose();
    }
};
QuickDiffEditorController = QuickDiffEditorController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, IQuickDiffModelService),
    __param(4, IInstantiationService)
], QuickDiffEditorController);
export { QuickDiffEditorController };
export class ShowPreviousChangeAction extends EditorAction {
    constructor(outerEditor) {
        super({
            id: 'editor.action.dirtydiff.previous',
            label: nls.localize2('show previous change', 'Show Previous Change'),
            precondition: TextCompareEditorActiveContext.toNegated(),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 61 /* KeyCode.F3 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
        this.outerEditor = outerEditor;
    }
    run(accessor) {
        const outerEditor = this.outerEditor ?? getOuterEditorFromDiffEditor(accessor);
        if (!outerEditor) {
            return;
        }
        const controller = QuickDiffEditorController.get(outerEditor);
        if (!controller) {
            return;
        }
        if (!controller.canNavigate()) {
            return;
        }
        controller.previous();
    }
}
registerEditorAction(ShowPreviousChangeAction);
export class ShowNextChangeAction extends EditorAction {
    constructor(outerEditor) {
        super({
            id: 'editor.action.dirtydiff.next',
            label: nls.localize2('show next change', 'Show Next Change'),
            precondition: TextCompareEditorActiveContext.toNegated(),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 512 /* KeyMod.Alt */ | 61 /* KeyCode.F3 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
        this.outerEditor = outerEditor;
    }
    run(accessor) {
        const outerEditor = this.outerEditor ?? getOuterEditorFromDiffEditor(accessor);
        if (!outerEditor) {
            return;
        }
        const controller = QuickDiffEditorController.get(outerEditor);
        if (!controller) {
            return;
        }
        if (!controller.canNavigate()) {
            return;
        }
        controller.next();
    }
}
registerEditorAction(ShowNextChangeAction);
export class GotoPreviousChangeAction extends EditorAction {
    constructor() {
        super({
            id: 'workbench.action.editor.previousChange',
            label: nls.localize2('move to previous change', 'Go to Previous Change'),
            precondition: ContextKeyExpr.and(TextCompareEditorActiveContext.toNegated(), quickDiffDecorationCount.notEqualsTo(0)),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 63 /* KeyCode.F5 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    async run(accessor) {
        const outerEditor = getOuterEditorFromDiffEditor(accessor);
        const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
        const accessibilityService = accessor.get(IAccessibilityService);
        const codeEditorService = accessor.get(ICodeEditorService);
        const quickDiffModelService = accessor.get(IQuickDiffModelService);
        if (!outerEditor || !outerEditor.hasModel()) {
            return;
        }
        const modelRef = quickDiffModelService.createQuickDiffModelReference(outerEditor.getModel().uri);
        try {
            if (!modelRef || modelRef.object.changes.length === 0) {
                return;
            }
            const lineNumber = outerEditor.getPosition().lineNumber;
            const index = modelRef.object.findPreviousClosestChange(lineNumber, false);
            const change = modelRef.object.changes[index];
            await playAccessibilitySymbolForChange(change.change, accessibilitySignalService);
            setPositionAndSelection(change.change, outerEditor, accessibilityService, codeEditorService);
        }
        finally {
            modelRef?.dispose();
        }
    }
}
registerEditorAction(GotoPreviousChangeAction);
export class GotoNextChangeAction extends EditorAction {
    constructor() {
        super({
            id: 'workbench.action.editor.nextChange',
            label: nls.localize2('move to next change', 'Go to Next Change'),
            precondition: ContextKeyExpr.and(TextCompareEditorActiveContext.toNegated(), quickDiffDecorationCount.notEqualsTo(0)),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 512 /* KeyMod.Alt */ | 63 /* KeyCode.F5 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    async run(accessor) {
        const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
        const outerEditor = getOuterEditorFromDiffEditor(accessor);
        const accessibilityService = accessor.get(IAccessibilityService);
        const codeEditorService = accessor.get(ICodeEditorService);
        const quickDiffModelService = accessor.get(IQuickDiffModelService);
        if (!outerEditor || !outerEditor.hasModel()) {
            return;
        }
        const modelRef = quickDiffModelService.createQuickDiffModelReference(outerEditor.getModel().uri);
        try {
            if (!modelRef || modelRef.object.changes.length === 0) {
                return;
            }
            const lineNumber = outerEditor.getPosition().lineNumber;
            const index = modelRef.object.findNextClosestChange(lineNumber, false);
            const change = modelRef.object.changes[index].change;
            await playAccessibilitySymbolForChange(change, accessibilitySignalService);
            setPositionAndSelection(change, outerEditor, accessibilityService, codeEditorService);
        }
        finally {
            modelRef?.dispose();
        }
    }
}
registerEditorAction(GotoNextChangeAction);
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '7_change_nav',
    command: {
        id: 'editor.action.dirtydiff.next',
        title: nls.localize({ key: 'miGotoNextChange', comment: ['&& denotes a mnemonic'] }, 'Next &&Change'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '7_change_nav',
    command: {
        id: 'editor.action.dirtydiff.previous',
        title: nls.localize({ key: 'miGotoPreviousChange', comment: ['&& denotes a mnemonic'] }, 'Previous &&Change'),
    },
    order: 2,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'closeQuickDiff',
    weight: 100 /* KeybindingWeight.EditorContrib */ + 50,
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.and(isQuickDiffVisible),
    handler: (accessor) => {
        const outerEditor = getOuterEditorFromDiffEditor(accessor);
        if (!outerEditor) {
            return;
        }
        const controller = QuickDiffEditorController.get(outerEditor);
        if (!controller) {
            return;
        }
        controller.close();
    },
});
function setPositionAndSelection(change, editor, accessibilityService, codeEditorService) {
    const position = new Position(change.modifiedStartLineNumber, 1);
    editor.setPosition(position);
    editor.revealPositionInCenter(position);
    if (accessibilityService.isScreenReaderOptimized()) {
        editor.setSelection({
            startLineNumber: change.modifiedStartLineNumber,
            startColumn: 0,
            endLineNumber: change.modifiedStartLineNumber,
            endColumn: Number.MAX_VALUE,
        });
        codeEditorService.getActiveCodeEditor()?.writeScreenReaderContent('diff-navigation');
    }
}
async function playAccessibilitySymbolForChange(change, accessibilitySignalService) {
    const changeType = getChangeType(change);
    switch (changeType) {
        case ChangeType.Add:
            accessibilitySignalService.playSignal(AccessibilitySignal.diffLineInserted, {
                allowManyInParallel: true,
                source: 'quickDiffDecoration',
            });
            break;
        case ChangeType.Delete:
            accessibilitySignalService.playSignal(AccessibilitySignal.diffLineDeleted, {
                allowManyInParallel: true,
                source: 'quickDiffDecoration',
            });
            break;
        case ChangeType.Modify:
            accessibilitySignalService.playSignal(AccessibilitySignal.diffLineModified, {
                allowManyInParallel: true,
                source: 'quickDiffDecoration',
            });
            break;
    }
}
function getOuterEditorFromDiffEditor(accessor) {
    const diffEditors = accessor.get(ICodeEditorService).listDiffEditors();
    for (const diffEditor of diffEditors) {
        if (diffEditor.hasTextFocus() && diffEditor instanceof EmbeddedDiffEditorWidget) {
            return diffEditor.getParentEditor();
        }
    }
    return getOuterEditor(accessor);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvcXVpY2tEaWZmV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLGdCQUFnQixNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFXLE1BQU0sb0NBQW9DLENBQUE7QUFDbEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzVGLE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM5RixPQUFPLEVBQ04sY0FBYyxFQUNkLHVCQUF1QixFQUN2Qix1QkFBdUIsRUFDdkIsMkJBQTJCLEVBQzNCLGNBQWMsR0FDZCxNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFFTixZQUFZLEVBQ1osTUFBTSxFQUNOLGNBQWMsRUFDZCxZQUFZLEdBQ1osTUFBTSxnREFBZ0QsQ0FBQTtBQU12RCxPQUFPLEVBQUUsWUFBWSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkcsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixN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
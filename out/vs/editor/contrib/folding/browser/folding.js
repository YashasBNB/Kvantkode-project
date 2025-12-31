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
var FoldingController_1;
import { createCancelablePromise, Delayer, RunOnceScheduler, } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { illegalArgument, onUnexpectedError } from '../../../../base/common/errors.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import * as types from '../../../../base/common/types.js';
import './folding.css';
import { StableEditorScrollState } from '../../../browser/stableEditorScroll.js';
import { EditorAction, registerEditorAction, registerEditorContribution, registerInstantiatedEditorAction, } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { FoldingRangeKind } from '../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { FoldingModel, getNextFoldLine, getParentFoldLine as getParentFoldLine, getPreviousFoldLine, setCollapseStateAtLevel, setCollapseStateForMatchingLines, setCollapseStateForRest, setCollapseStateForType, setCollapseStateLevelsDown, setCollapseStateLevelsUp, setCollapseStateUp, toggleCollapseState, } from './foldingModel.js';
import { HiddenRangeModel } from './hiddenRangeModel.js';
import { IndentRangeProvider } from './indentRangeProvider.js';
import * as nls from '../../../../nls.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { FoldingDecorationProvider } from './foldingDecorations.js';
import { FoldingRegions, } from './foldingRanges.js';
import { SyntaxRangeProvider } from './syntaxRangeProvider.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ILanguageFeatureDebounceService, } from '../../../common/services/languageFeatureDebounce.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { Emitter } from '../../../../base/common/event.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { URI } from '../../../../base/common/uri.js';
import { IModelService } from '../../../common/services/model.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const CONTEXT_FOLDING_ENABLED = new RawContextKey('foldingEnabled', false);
let FoldingController = class FoldingController extends Disposable {
    static { FoldingController_1 = this; }
    static { this.ID = 'editor.contrib.folding'; }
    static get(editor) {
        return editor.getContribution(FoldingController_1.ID);
    }
    static getFoldingRangeProviders(languageFeaturesService, model) {
        const foldingRangeProviders = languageFeaturesService.foldingRangeProvider.ordered(model);
        return (FoldingController_1._foldingRangeSelector?.(foldingRangeProviders, model) ??
            foldingRangeProviders);
    }
    static setFoldingRangeProviderSelector(foldingRangeSelector) {
        FoldingController_1._foldingRangeSelector = foldingRangeSelector;
        return {
            dispose: () => {
                FoldingController_1._foldingRangeSelector = undefined;
            },
        };
    }
    constructor(editor, contextKeyService, languageConfigurationService, notificationService, languageFeatureDebounceService, languageFeaturesService) {
        super();
        this.contextKeyService = contextKeyService;
        this.languageConfigurationService = languageConfigurationService;
        this.languageFeaturesService = languageFeaturesService;
        this.localToDispose = this._register(new DisposableStore());
        this.editor = editor;
        this._foldingLimitReporter = new RangesLimitReporter(editor);
        const options = this.editor.getOptions();
        this._isEnabled = options.get(45 /* EditorOption.folding */);
        this._useFoldingProviders = options.get(46 /* EditorOption.foldingStrategy */) !== 'indentation';
        this._unfoldOnClickAfterEndOfLine = options.get(50 /* EditorOption.unfoldOnClickAfterEndOfLine */);
        this._restoringViewState = false;
        this._currentModelHasFoldedImports = false;
        this._foldingImportsByDefault = options.get(48 /* EditorOption.foldingImportsByDefault */);
        this.updateDebounceInfo = languageFeatureDebounceService.for(languageFeaturesService.foldingRangeProvider, 'Folding', { min: 200 });
        this.foldingModel = null;
        this.hiddenRangeModel = null;
        this.rangeProvider = null;
        this.foldingRegionPromise = null;
        this.foldingModelPromise = null;
        this.updateScheduler = null;
        this.cursorChangedScheduler = null;
        this.mouseDownInfo = null;
        this.foldingDecorationProvider = new FoldingDecorationProvider(editor);
        this.foldingDecorationProvider.showFoldingControls = options.get(115 /* EditorOption.showFoldingControls */);
        this.foldingDecorationProvider.showFoldingHighlights = options.get(47 /* EditorOption.foldingHighlight */);
        this.foldingEnabled = CONTEXT_FOLDING_ENABLED.bindTo(this.contextKeyService);
        this.foldingEnabled.set(this._isEnabled);
        this._register(this.editor.onDidChangeModel(() => this.onModelChanged()));
        this._register(this.editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(45 /* EditorOption.folding */)) {
                this._isEnabled = this.editor.getOptions().get(45 /* EditorOption.folding */);
                this.foldingEnabled.set(this._isEnabled);
                this.onModelChanged();
            }
            if (e.hasChanged(49 /* EditorOption.foldingMaximumRegions */)) {
                this.onModelChanged();
            }
            if (e.hasChanged(115 /* EditorOption.showFoldingControls */) ||
                e.hasChanged(47 /* EditorOption.foldingHighlight */)) {
                const options = this.editor.getOptions();
                this.foldingDecorationProvider.showFoldingControls = options.get(115 /* EditorOption.showFoldingControls */);
                this.foldingDecorationProvider.showFoldingHighlights = options.get(47 /* EditorOption.foldingHighlight */);
                this.triggerFoldingModelChanged();
            }
            if (e.hasChanged(46 /* EditorOption.foldingStrategy */)) {
                this._useFoldingProviders =
                    this.editor.getOptions().get(46 /* EditorOption.foldingStrategy */) !== 'indentation';
                this.onFoldingStrategyChanged();
            }
            if (e.hasChanged(50 /* EditorOption.unfoldOnClickAfterEndOfLine */)) {
                this._unfoldOnClickAfterEndOfLine = this.editor
                    .getOptions()
                    .get(50 /* EditorOption.unfoldOnClickAfterEndOfLine */);
            }
            if (e.hasChanged(48 /* EditorOption.foldingImportsByDefault */)) {
                this._foldingImportsByDefault = this.editor
                    .getOptions()
                    .get(48 /* EditorOption.foldingImportsByDefault */);
            }
        }));
        this.onModelChanged();
    }
    get limitReporter() {
        return this._foldingLimitReporter;
    }
    /**
     * Store view state.
     */
    saveViewState() {
        const model = this.editor.getModel();
        if (!model || !this._isEnabled || model.isTooLargeForTokenization()) {
            return {};
        }
        if (this.foldingModel) {
            // disposed ?
            const collapsedRegions = this.foldingModel.getMemento();
            const provider = this.rangeProvider ? this.rangeProvider.id : undefined;
            return {
                collapsedRegions,
                lineCount: model.getLineCount(),
                provider,
                foldedImports: this._currentModelHasFoldedImports,
            };
        }
        return undefined;
    }
    /**
     * Restore view state.
     */
    restoreViewState(state) {
        const model = this.editor.getModel();
        if (!model || !this._isEnabled || model.isTooLargeForTokenization() || !this.hiddenRangeModel) {
            return;
        }
        if (!state) {
            return;
        }
        this._currentModelHasFoldedImports = !!state.foldedImports;
        if (state.collapsedRegions && state.collapsedRegions.length > 0 && this.foldingModel) {
            this._restoringViewState = true;
            try {
                this.foldingModel.applyMemento(state.collapsedRegions);
            }
            finally {
                this._restoringViewState = false;
            }
        }
    }
    onModelChanged() {
        this.localToDispose.clear();
        const model = this.editor.getModel();
        if (!this._isEnabled || !model || model.isTooLargeForTokenization()) {
            // huge files get no view model, so they cannot support hidden areas
            return;
        }
        this._currentModelHasFoldedImports = false;
        this.foldingModel = new FoldingModel(model, this.foldingDecorationProvider);
        this.localToDispose.add(this.foldingModel);
        this.hiddenRangeModel = new HiddenRangeModel(this.foldingModel);
        this.localToDispose.add(this.hiddenRangeModel);
        this.localToDispose.add(this.hiddenRangeModel.onDidChange((hr) => this.onHiddenRangesChanges(hr)));
        this.updateScheduler = new Delayer(this.updateDebounceInfo.get(model));
        this.cursorChangedScheduler = new RunOnceScheduler(() => this.revealCursor(), 200);
        this.localToDispose.add(this.cursorChangedScheduler);
        this.localToDispose.add(this.languageFeaturesService.foldingRangeProvider.onDidChange(() => this.onFoldingStrategyChanged()));
        this.localToDispose.add(this.editor.onDidChangeModelLanguageConfiguration(() => this.onFoldingStrategyChanged())); // covers model language changes as well
        this.localToDispose.add(this.editor.onDidChangeModelContent((e) => this.onDidChangeModelContent(e)));
        this.localToDispose.add(this.editor.onDidChangeCursorPosition(() => this.onCursorPositionChanged()));
        this.localToDispose.add(this.editor.onMouseDown((e) => this.onEditorMouseDown(e)));
        this.localToDispose.add(this.editor.onMouseUp((e) => this.onEditorMouseUp(e)));
        this.localToDispose.add({
            dispose: () => {
                if (this.foldingRegionPromise) {
                    this.foldingRegionPromise.cancel();
                    this.foldingRegionPromise = null;
                }
                this.updateScheduler?.cancel();
                this.updateScheduler = null;
                this.foldingModel = null;
                this.foldingModelPromise = null;
                this.hiddenRangeModel = null;
                this.cursorChangedScheduler = null;
                this.rangeProvider?.dispose();
                this.rangeProvider = null;
            },
        });
        this.triggerFoldingModelChanged();
    }
    onFoldingStrategyChanged() {
        this.rangeProvider?.dispose();
        this.rangeProvider = null;
        this.triggerFoldingModelChanged();
    }
    getRangeProvider(editorModel) {
        if (this.rangeProvider) {
            return this.rangeProvider;
        }
        const indentRangeProvider = new IndentRangeProvider(editorModel, this.languageConfigurationService, this._foldingLimitReporter);
        this.rangeProvider = indentRangeProvider; // fallback
        if (this._useFoldingProviders && this.foldingModel) {
            const selectedProviders = FoldingController_1.getFoldingRangeProviders(this.languageFeaturesService, editorModel);
            if (selectedProviders.length > 0) {
                this.rangeProvider = new SyntaxRangeProvider(editorModel, selectedProviders, () => this.triggerFoldingModelChanged(), this._foldingLimitReporter, indentRangeProvider);
            }
        }
        return this.rangeProvider;
    }
    getFoldingModel() {
        return this.foldingModelPromise;
    }
    onDidChangeModelContent(e) {
        this.hiddenRangeModel?.notifyChangeModelContent(e);
        this.triggerFoldingModelChanged();
    }
    triggerFoldingModelChanged() {
        if (this.updateScheduler) {
            if (this.foldingRegionPromise) {
                this.foldingRegionPromise.cancel();
                this.foldingRegionPromise = null;
            }
            this.foldingModelPromise = this.updateScheduler
                .trigger(() => {
                const foldingModel = this.foldingModel;
                if (!foldingModel) {
                    // null if editor has been disposed, or folding turned off
                    return null;
                }
                const sw = new StopWatch();
                const provider = this.getRangeProvider(foldingModel.textModel);
                const foldingRegionPromise = (this.foldingRegionPromise = createCancelablePromise((token) => provider.compute(token)));
                return foldingRegionPromise.then((foldingRanges) => {
                    if (foldingRanges && foldingRegionPromise === this.foldingRegionPromise) {
                        // new request or cancelled in the meantime?
                        let scrollState;
                        if (this._foldingImportsByDefault && !this._currentModelHasFoldedImports) {
                            const hasChanges = foldingRanges.setCollapsedAllOfType(FoldingRangeKind.Imports.value, true);
                            if (hasChanges) {
                                scrollState = StableEditorScrollState.capture(this.editor);
                                this._currentModelHasFoldedImports = hasChanges;
                            }
                        }
                        // some cursors might have moved into hidden regions, make sure they are in expanded regions
                        const selections = this.editor.getSelections();
                        foldingModel.update(foldingRanges, toSelectedLines(selections));
                        scrollState?.restore(this.editor);
                        // update debounce info
                        const newValue = this.updateDebounceInfo.update(foldingModel.textModel, sw.elapsed());
                        if (this.updateScheduler) {
                            this.updateScheduler.defaultDelay = newValue;
                        }
                    }
                    return foldingModel;
                });
            })
                .then(undefined, (err) => {
                onUnexpectedError(err);
                return null;
            });
        }
    }
    onHiddenRangesChanges(hiddenRanges) {
        if (this.hiddenRangeModel && hiddenRanges.length && !this._restoringViewState) {
            const selections = this.editor.getSelections();
            if (selections) {
                if (this.hiddenRangeModel.adjustSelections(selections)) {
                    this.editor.setSelections(selections);
                }
            }
        }
        this.editor.setHiddenAreas(hiddenRanges, this);
    }
    onCursorPositionChanged() {
        if (this.hiddenRangeModel && this.hiddenRangeModel.hasRanges()) {
            this.cursorChangedScheduler.schedule();
        }
    }
    revealCursor() {
        const foldingModel = this.getFoldingModel();
        if (!foldingModel) {
            return;
        }
        foldingModel
            .then((foldingModel) => {
            // null is returned if folding got disabled in the meantime
            if (foldingModel) {
                const selections = this.editor.getSelections();
                if (selections && selections.length > 0) {
                    const toToggle = [];
                    for (const selection of selections) {
                        const lineNumber = selection.selectionStartLineNumber;
                        if (this.hiddenRangeModel && this.hiddenRangeModel.isHidden(lineNumber)) {
                            toToggle.push(...foldingModel.getAllRegionsAtLine(lineNumber, (r) => r.isCollapsed && lineNumber > r.startLineNumber));
                        }
                    }
                    if (toToggle.length) {
                        foldingModel.toggleCollapseState(toToggle);
                        this.reveal(selections[0].getPosition());
                    }
                }
            }
        })
            .then(undefined, onUnexpectedError);
    }
    onEditorMouseDown(e) {
        this.mouseDownInfo = null;
        if (!this.hiddenRangeModel || !e.target || !e.target.range) {
            return;
        }
        if (!e.event.leftButton && !e.event.middleButton) {
            return;
        }
        const range = e.target.range;
        let iconClicked = false;
        switch (e.target.type) {
            case 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */: {
                const data = e.target.detail;
                const offsetLeftInGutter = e.target.element.offsetLeft;
                const gutterOffsetX = data.offsetX - offsetLeftInGutter;
                // const gutterOffsetX = data.offsetX - data.glyphMarginWidth - data.lineNumbersWidth - data.glyphMarginLeft;
                // TODO@joao TODO@alex TODO@martin this is such that we don't collide with dirty diff
                if (gutterOffsetX < 4) {
                    // the whitespace between the border and the real folding icon border is 4px
                    return;
                }
                iconClicked = true;
                break;
            }
            case 7 /* MouseTargetType.CONTENT_EMPTY */: {
                if (this._unfoldOnClickAfterEndOfLine && this.hiddenRangeModel.hasRanges()) {
                    const data = e.target.detail;
                    if (!data.isAfterLines) {
                        break;
                    }
                }
                return;
            }
            case 6 /* MouseTargetType.CONTENT_TEXT */: {
                if (this.hiddenRangeModel.hasRanges()) {
                    const model = this.editor.getModel();
                    if (model && range.startColumn === model.getLineMaxColumn(range.startLineNumber)) {
                        break;
                    }
                }
                return;
            }
            default:
                return;
        }
        this.mouseDownInfo = { lineNumber: range.startLineNumber, iconClicked };
    }
    onEditorMouseUp(e) {
        const foldingModel = this.foldingModel;
        if (!foldingModel || !this.mouseDownInfo || !e.target) {
            return;
        }
        const lineNumber = this.mouseDownInfo.lineNumber;
        const iconClicked = this.mouseDownInfo.iconClicked;
        const range = e.target.range;
        if (!range || range.startLineNumber !== lineNumber) {
            return;
        }
        if (iconClicked) {
            if (e.target.type !== 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
                return;
            }
        }
        else {
            const model = this.editor.getModel();
            if (!model || range.startColumn !== model.getLineMaxColumn(lineNumber)) {
                return;
            }
        }
        const region = foldingModel.getRegionAtLine(lineNumber);
        if (region && region.startLineNumber === lineNumber) {
            const isCollapsed = region.isCollapsed;
            if (iconClicked || isCollapsed) {
                const surrounding = e.event.altKey;
                let toToggle = [];
                if (surrounding) {
                    const filter = (otherRegion) => !otherRegion.containedBy(region) && !region.containedBy(otherRegion);
                    const toMaybeToggle = foldingModel.getRegionsInside(null, filter);
                    for (const r of toMaybeToggle) {
                        if (r.isCollapsed) {
                            toToggle.push(r);
                        }
                    }
                    // if any surrounding regions are folded, unfold those. Otherwise, fold all surrounding
                    if (toToggle.length === 0) {
                        toToggle = toMaybeToggle;
                    }
                }
                else {
                    const recursive = e.event.middleButton || e.event.shiftKey;
                    if (recursive) {
                        for (const r of foldingModel.getRegionsInside(region)) {
                            if (r.isCollapsed === isCollapsed) {
                                toToggle.push(r);
                            }
                        }
                    }
                    // when recursive, first only collapse all children. If all are already folded or there are no children, also fold parent.
                    if (isCollapsed || !recursive || toToggle.length === 0) {
                        toToggle.push(region);
                    }
                }
                foldingModel.toggleCollapseState(toToggle);
                this.reveal({ lineNumber, column: 1 });
            }
        }
    }
    reveal(position) {
        this.editor.revealPositionInCenterIfOutsideViewport(position, 0 /* ScrollType.Smooth */);
    }
};
FoldingController = FoldingController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, ILanguageConfigurationService),
    __param(3, INotificationService),
    __param(4, ILanguageFeatureDebounceService),
    __param(5, ILanguageFeaturesService)
], FoldingController);
export { FoldingController };
export class RangesLimitReporter {
    constructor(editor) {
        this.editor = editor;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._computed = 0;
        this._limited = false;
    }
    get limit() {
        return this.editor.getOptions().get(49 /* EditorOption.foldingMaximumRegions */);
    }
    get computed() {
        return this._computed;
    }
    get limited() {
        return this._limited;
    }
    update(computed, limited) {
        if (computed !== this._computed || limited !== this._limited) {
            this._computed = computed;
            this._limited = limited;
            this._onDidChange.fire();
        }
    }
}
class FoldingAction extends EditorAction {
    runEditorCommand(accessor, editor, args) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        const foldingController = FoldingController.get(editor);
        if (!foldingController) {
            return;
        }
        const foldingModelPromise = foldingController.getFoldingModel();
        if (foldingModelPromise) {
            this.reportTelemetry(accessor, editor);
            return foldingModelPromise.then((foldingModel) => {
                if (foldingModel) {
                    this.invoke(foldingController, foldingModel, editor, args, languageConfigurationService);
                    const selection = editor.getSelection();
                    if (selection) {
                        foldingController.reveal(selection.getStartPosition());
                    }
                }
            });
        }
    }
    getSelectedLines(editor) {
        const selections = editor.getSelections();
        return selections ? selections.map((s) => s.startLineNumber) : [];
    }
    getLineNumbers(args, editor) {
        if (args && args.selectionLines) {
            return args.selectionLines.map((l) => l + 1); // to 0-bases line numbers
        }
        return this.getSelectedLines(editor);
    }
    run(_accessor, _editor) { }
}
export function toSelectedLines(selections) {
    if (!selections || selections.length === 0) {
        return {
            startsInside: () => false,
        };
    }
    return {
        startsInside(startLine, endLine) {
            for (const s of selections) {
                const line = s.startLineNumber;
                if (line >= startLine && line <= endLine) {
                    return true;
                }
            }
            return false;
        },
    };
}
function foldingArgumentsConstraint(args) {
    if (!types.isUndefined(args)) {
        if (!types.isObject(args)) {
            return false;
        }
        const foldingArgs = args;
        if (!types.isUndefined(foldingArgs.levels) && !types.isNumber(foldingArgs.levels)) {
            return false;
        }
        if (!types.isUndefined(foldingArgs.direction) && !types.isString(foldingArgs.direction)) {
            return false;
        }
        if (!types.isUndefined(foldingArgs.selectionLines) &&
            (!Array.isArray(foldingArgs.selectionLines) ||
                !foldingArgs.selectionLines.every(types.isNumber))) {
            return false;
        }
    }
    return true;
}
class UnfoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.unfold',
            label: nls.localize2('unfoldAction.label', 'Unfold'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 94 /* KeyCode.BracketRight */,
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: 'Unfold the content in the editor',
                args: [
                    {
                        name: 'Unfold editor argument',
                        description: `Property-value pairs that can be passed through this argument:
						* 'levels': Number of levels to unfold. If not set, defaults to 1.
						* 'direction': If 'up', unfold given number of levels up otherwise unfolds down.
						* 'selectionLines': Array of the start lines (0-based) of the editor selections to apply the unfold action to. If not set, the active selection(s) will be used.
						`,
                        constraint: foldingArgumentsConstraint,
                        schema: {
                            type: 'object',
                            properties: {
                                levels: {
                                    type: 'number',
                                    default: 1,
                                },
                                direction: {
                                    type: 'string',
                                    enum: ['up', 'down'],
                                    default: 'down',
                                },
                                selectionLines: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        });
    }
    invoke(_foldingController, foldingModel, editor, args) {
        const levels = (args && args.levels) || 1;
        const lineNumbers = this.getLineNumbers(args, editor);
        if (args && args.direction === 'up') {
            setCollapseStateLevelsUp(foldingModel, false, levels, lineNumbers);
        }
        else {
            setCollapseStateLevelsDown(foldingModel, false, levels, lineNumbers);
        }
    }
}
class UnFoldRecursivelyAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.unfoldRecursively',
            label: nls.localize2('unFoldRecursivelyAction.label', 'Unfold Recursively'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 94 /* KeyCode.BracketRight */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor, _args) {
        setCollapseStateLevelsDown(foldingModel, false, Number.MAX_VALUE, this.getSelectedLines(editor));
    }
}
class FoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.fold',
            label: nls.localize2('foldAction.label', 'Fold'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 92 /* KeyCode.BracketLeft */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 92 /* KeyCode.BracketLeft */,
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: 'Fold the content in the editor',
                args: [
                    {
                        name: 'Fold editor argument',
                        description: `Property-value pairs that can be passed through this argument:
							* 'levels': Number of levels to fold.
							* 'direction': If 'up', folds given number of levels up otherwise folds down.
							* 'selectionLines': Array of the start lines (0-based) of the editor selections to apply the fold action to. If not set, the active selection(s) will be used.
							If no levels or direction is set, folds the region at the locations or if already collapsed, the first uncollapsed parent instead.
						`,
                        constraint: foldingArgumentsConstraint,
                        schema: {
                            type: 'object',
                            properties: {
                                levels: {
                                    type: 'number',
                                },
                                direction: {
                                    type: 'string',
                                    enum: ['up', 'down'],
                                },
                                selectionLines: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        });
    }
    invoke(_foldingController, foldingModel, editor, args) {
        const lineNumbers = this.getLineNumbers(args, editor);
        const levels = args && args.levels;
        const direction = args && args.direction;
        if (typeof levels !== 'number' && typeof direction !== 'string') {
            // fold the region at the location or if already collapsed, the first uncollapsed parent instead.
            setCollapseStateUp(foldingModel, true, lineNumbers);
        }
        else {
            if (direction === 'up') {
                setCollapseStateLevelsUp(foldingModel, true, levels || 1, lineNumbers);
            }
            else {
                setCollapseStateLevelsDown(foldingModel, true, levels || 1, lineNumbers);
            }
        }
    }
}
class ToggleFoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.toggleFold',
            label: nls.localize2('toggleFoldAction.label', 'Toggle Fold'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        toggleCollapseState(foldingModel, 1, selectedLines);
    }
}
class FoldRecursivelyAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.foldRecursively',
            label: nls.localize2('foldRecursivelyAction.label', 'Fold Recursively'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 92 /* KeyCode.BracketLeft */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        setCollapseStateLevelsDown(foldingModel, true, Number.MAX_VALUE, selectedLines);
    }
}
class ToggleFoldRecursivelyAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.toggleFoldRecursively',
            label: nls.localize2('toggleFoldRecursivelyAction.label', 'Toggle Fold Recursively'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        toggleCollapseState(foldingModel, Number.MAX_VALUE, selectedLines);
    }
}
class FoldAllBlockCommentsAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.foldAllBlockComments',
            label: nls.localize2('foldAllBlockComments.label', 'Fold All Block Comments'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor, args, languageConfigurationService) {
        if (foldingModel.regions.hasTypes()) {
            setCollapseStateForType(foldingModel, FoldingRangeKind.Comment.value, true);
        }
        else {
            const editorModel = editor.getModel();
            if (!editorModel) {
                return;
            }
            const comments = languageConfigurationService.getLanguageConfiguration(editorModel.getLanguageId()).comments;
            if (comments && comments.blockCommentStartToken) {
                const regExp = new RegExp('^\\s*' + escapeRegExpCharacters(comments.blockCommentStartToken));
                setCollapseStateForMatchingLines(foldingModel, regExp, true);
            }
        }
    }
}
class FoldAllRegionsAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.foldAllMarkerRegions',
            label: nls.localize2('foldAllMarkerRegions.label', 'Fold All Regions'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 29 /* KeyCode.Digit8 */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor, args, languageConfigurationService) {
        if (foldingModel.regions.hasTypes()) {
            setCollapseStateForType(foldingModel, FoldingRangeKind.Region.value, true);
        }
        else {
            const editorModel = editor.getModel();
            if (!editorModel) {
                return;
            }
            const foldingRules = languageConfigurationService.getLanguageConfiguration(editorModel.getLanguageId()).foldingRules;
            if (foldingRules && foldingRules.markers && foldingRules.markers.start) {
                const regExp = new RegExp(foldingRules.markers.start);
                setCollapseStateForMatchingLines(foldingModel, regExp, true);
            }
        }
    }
}
class UnfoldAllRegionsAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.unfoldAllMarkerRegions',
            label: nls.localize2('unfoldAllMarkerRegions.label', 'Unfold All Regions'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 30 /* KeyCode.Digit9 */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor, args, languageConfigurationService) {
        if (foldingModel.regions.hasTypes()) {
            setCollapseStateForType(foldingModel, FoldingRangeKind.Region.value, false);
        }
        else {
            const editorModel = editor.getModel();
            if (!editorModel) {
                return;
            }
            const foldingRules = languageConfigurationService.getLanguageConfiguration(editorModel.getLanguageId()).foldingRules;
            if (foldingRules && foldingRules.markers && foldingRules.markers.start) {
                const regExp = new RegExp(foldingRules.markers.start);
                setCollapseStateForMatchingLines(foldingModel, regExp, false);
            }
        }
    }
}
class FoldAllExceptAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.foldAllExcept',
            label: nls.localize2('foldAllExcept.label', 'Fold All Except Selected'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 88 /* KeyCode.Minus */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        setCollapseStateForRest(foldingModel, true, selectedLines);
    }
}
class UnfoldAllExceptAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.unfoldAllExcept',
            label: nls.localize2('unfoldAllExcept.label', 'Unfold All Except Selected'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 86 /* KeyCode.Equal */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        setCollapseStateForRest(foldingModel, false, selectedLines);
    }
}
class FoldAllAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.foldAll',
            label: nls.localize2('foldAllAction.label', 'Fold All'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 21 /* KeyCode.Digit0 */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, _editor) {
        setCollapseStateLevelsDown(foldingModel, true);
    }
}
class UnfoldAllAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.unfoldAll',
            label: nls.localize2('unfoldAllAction.label', 'Unfold All'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 40 /* KeyCode.KeyJ */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, _editor) {
        setCollapseStateLevelsDown(foldingModel, false);
    }
}
class FoldLevelAction extends FoldingAction {
    static { this.ID_PREFIX = 'editor.foldLevel'; }
    static { this.ID = (level) => FoldLevelAction.ID_PREFIX + level; }
    getFoldingLevel() {
        return parseInt(this.id.substr(FoldLevelAction.ID_PREFIX.length));
    }
    invoke(_foldingController, foldingModel, editor) {
        setCollapseStateAtLevel(foldingModel, this.getFoldingLevel(), true, this.getSelectedLines(editor));
    }
}
/** Action to go to the parent fold of current line */
class GotoParentFoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.gotoParentFold',
            label: nls.localize2('gotoParentFold.label', 'Go to Parent Fold'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        if (selectedLines.length > 0) {
            const startLineNumber = getParentFoldLine(selectedLines[0], foldingModel);
            if (startLineNumber !== null) {
                editor.setSelection({
                    startLineNumber: startLineNumber,
                    startColumn: 1,
                    endLineNumber: startLineNumber,
                    endColumn: 1,
                });
            }
        }
    }
}
/** Action to go to the previous fold of current line */
class GotoPreviousFoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.gotoPreviousFold',
            label: nls.localize2('gotoPreviousFold.label', 'Go to Previous Folding Range'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        if (selectedLines.length > 0) {
            const startLineNumber = getPreviousFoldLine(selectedLines[0], foldingModel);
            if (startLineNumber !== null) {
                editor.setSelection({
                    startLineNumber: startLineNumber,
                    startColumn: 1,
                    endLineNumber: startLineNumber,
                    endColumn: 1,
                });
            }
        }
    }
}
/** Action to go to the next fold of current line */
class GotoNextFoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.gotoNextFold',
            label: nls.localize2('gotoNextFold.label', 'Go to Next Folding Range'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        if (selectedLines.length > 0) {
            const startLineNumber = getNextFoldLine(selectedLines[0], foldingModel);
            if (startLineNumber !== null) {
                editor.setSelection({
                    startLineNumber: startLineNumber,
                    startColumn: 1,
                    endLineNumber: startLineNumber,
                    endColumn: 1,
                });
            }
        }
    }
}
class FoldRangeFromSelectionAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.createFoldingRangeFromSelection',
            label: nls.localize2('createManualFoldRange.label', 'Create Folding Range from Selection'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 87 /* KeyCode.Comma */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const collapseRanges = [];
        const selections = editor.getSelections();
        if (selections) {
            for (const selection of selections) {
                let endLineNumber = selection.endLineNumber;
                if (selection.endColumn === 1) {
                    --endLineNumber;
                }
                if (endLineNumber > selection.startLineNumber) {
                    collapseRanges.push({
                        startLineNumber: selection.startLineNumber,
                        endLineNumber: endLineNumber,
                        type: undefined,
                        isCollapsed: true,
                        source: 1 /* FoldSource.userDefined */,
                    });
                    editor.setSelection({
                        startLineNumber: selection.startLineNumber,
                        startColumn: 1,
                        endLineNumber: selection.startLineNumber,
                        endColumn: 1,
                    });
                }
            }
            if (collapseRanges.length > 0) {
                collapseRanges.sort((a, b) => {
                    return a.startLineNumber - b.startLineNumber;
                });
                const newRanges = FoldingRegions.sanitizeAndMerge(foldingModel.regions, collapseRanges, editor.getModel()?.getLineCount());
                foldingModel.updatePost(FoldingRegions.fromFoldRanges(newRanges));
            }
        }
    }
}
class RemoveFoldRangeFromSelectionAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.removeManualFoldingRanges',
            label: nls.localize2('removeManualFoldingRanges.label', 'Remove Manual Folding Ranges'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    invoke(foldingController, foldingModel, editor) {
        const selections = editor.getSelections();
        if (selections) {
            const ranges = [];
            for (const selection of selections) {
                const { startLineNumber, endLineNumber } = selection;
                ranges.push(endLineNumber >= startLineNumber
                    ? { startLineNumber, endLineNumber }
                    : { endLineNumber, startLineNumber });
            }
            foldingModel.removeManualRanges(ranges);
            foldingController.triggerFoldingModelChanged();
        }
    }
}
class ToggleImportFoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.toggleImportFold',
            label: nls.localize2('toggleImportFold.label', 'Toggle Import Fold'),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    async invoke(foldingController, foldingModel) {
        const regionsToToggle = [];
        const regions = foldingModel.regions;
        for (let i = regions.length - 1; i >= 0; i--) {
            if (regions.getType(i) === FoldingRangeKind.Imports.value) {
                regionsToToggle.push(regions.toRegion(i));
            }
        }
        foldingModel.toggleCollapseState(regionsToToggle);
        foldingController.triggerFoldingModelChanged();
    }
}
registerEditorContribution(FoldingController.ID, FoldingController, 0 /* EditorContributionInstantiation.Eager */); // eager because it uses `saveViewState`/`restoreViewState`
registerEditorAction(UnfoldAction);
registerEditorAction(UnFoldRecursivelyAction);
registerEditorAction(FoldAction);
registerEditorAction(FoldRecursivelyAction);
registerEditorAction(ToggleFoldRecursivelyAction);
registerEditorAction(FoldAllAction);
registerEditorAction(UnfoldAllAction);
registerEditorAction(FoldAllBlockCommentsAction);
registerEditorAction(FoldAllRegionsAction);
registerEditorAction(UnfoldAllRegionsAction);
registerEditorAction(FoldAllExceptAction);
registerEditorAction(UnfoldAllExceptAction);
registerEditorAction(ToggleFoldAction);
registerEditorAction(GotoParentFoldAction);
registerEditorAction(GotoPreviousFoldAction);
registerEditorAction(GotoNextFoldAction);
registerEditorAction(FoldRangeFromSelectionAction);
registerEditorAction(RemoveFoldRangeFromSelectionAction);
registerEditorAction(ToggleImportFoldAction);
for (let i = 1; i <= 7; i++) {
    registerInstantiatedEditorAction(new FoldLevelAction({
        id: FoldLevelAction.ID(i),
        label: nls.localize2('foldLevelAction.label', 'Fold Level {0}', i),
        precondition: CONTEXT_FOLDING_ENABLED,
        kbOpts: {
            kbExpr: EditorContextKeys.editorTextFocus,
            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | (21 /* KeyCode.Digit0 */ + i)),
            weight: 100 /* KeybindingWeight.EditorContrib */,
        },
    }));
}
CommandsRegistry.registerCommand('_executeFoldingRangeProvider', async function (accessor, ...args) {
    const [resource] = args;
    if (!(resource instanceof URI)) {
        throw illegalArgument();
    }
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const model = accessor.get(IModelService).getModel(resource);
    if (!model) {
        throw illegalArgument();
    }
    const configurationService = accessor.get(IConfigurationService);
    if (!configurationService.getValue('editor.folding', { resource })) {
        return [];
    }
    const languageConfigurationService = accessor.get(ILanguageConfigurationService);
    const strategy = configurationService.getValue('editor.foldingStrategy', { resource });
    const foldingLimitReporter = {
        get limit() {
            return configurationService.getValue('editor.foldingMaximumRegions', { resource });
        },
        update: (computed, limited) => { },
    };
    const indentRangeProvider = new IndentRangeProvider(model, languageConfigurationService, foldingLimitReporter);
    let rangeProvider = indentRangeProvider;
    if (strategy !== 'indentation') {
        const providers = FoldingController.getFoldingRangeProviders(languageFeaturesService, model);
        if (providers.length) {
            rangeProvider = new SyntaxRangeProvider(model, providers, () => { }, foldingLimitReporter, indentRangeProvider);
        }
    }
    const ranges = await rangeProvider.compute(CancellationToken.None);
    const result = [];
    try {
        if (ranges) {
            for (let i = 0; i < ranges.length; i++) {
                const type = ranges.getType(i);
                result.push({
                    start: ranges.getStartLineNumber(i),
                    end: ranges.getEndLineNumber(i),
                    kind: type ? FoldingRangeKind.fromValue(type) : undefined,
                });
            }
        }
        return result;
    }
    finally {
        rangeProvider.dispose();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZvbGRpbmcvYnJvd3Nlci9mb2xkaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLE9BQU8sRUFDUCxnQkFBZ0IsR0FDaEIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUE7QUFDekQsT0FBTyxlQUFlLENBQUE7QUFDdEIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEYsT0FBTyxFQUNOLFlBQVksRUFFWixvQkFBb0IsRUFDcEIsMEJBQTBCLEVBQzFCLGdDQUFnQyxHQUVoQyxNQUFNLHNDQUFzQyxDQUFBO0FBTTdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR3hFLE9BQU8sRUFBZ0IsZ0JBQWdCLEVBQXdCLE1BQU0sOEJBQThCLENBQUE7QUFDbkcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDMUcsT0FBTyxFQUVOLFlBQVksRUFDWixlQUFlLEVBQ2YsaUJBQWlCLElBQUksaUJBQWlCLEVBQ3RDLG1CQUFt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
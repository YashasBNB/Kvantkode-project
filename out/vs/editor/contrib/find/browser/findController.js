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
var CommonFindController_1;
import { Delayer } from '../../../../base/common/async.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { EditorAction, EditorCommand, MultiEditorAction, registerEditorAction, registerEditorCommand, registerEditorContribution, registerMultiEditorAction, } from '../../../browser/editorExtensions.js';
import { overviewRulerRangeHighlight } from '../../../common/core/editorColorRegistry.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { OverviewRulerLane } from '../../../common/model.js';
import { CONTEXT_FIND_INPUT_FOCUSED, CONTEXT_FIND_WIDGET_VISIBLE, CONTEXT_REPLACE_INPUT_FOCUSED, FindModelBoundToEditorModel, FIND_IDS, ToggleCaseSensitiveKeybinding, TogglePreserveCaseKeybinding, ToggleRegexKeybinding, ToggleSearchScopeKeybinding, ToggleWholeWordKeybinding, } from './findModel.js';
import { FindOptionsWidget } from './findOptionsWidget.js';
import { FindReplaceState, } from './findState.js';
import { FindWidget } from './findWidget.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IThemeService, themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { FindWidgetSearchHistory } from './findWidgetSearchHistory.js';
import { ReplaceWidgetHistory } from './replaceWidgetHistory.js';
const SEARCH_STRING_MAX_LENGTH = 524288;
export function getSelectionSearchString(editor, seedSearchStringFromSelection = 'single', seedSearchStringFromNonEmptySelection = false) {
    if (!editor.hasModel()) {
        return null;
    }
    const selection = editor.getSelection();
    // if selection spans multiple lines, default search string to empty
    if ((seedSearchStringFromSelection === 'single' &&
        selection.startLineNumber === selection.endLineNumber) ||
        seedSearchStringFromSelection === 'multiple') {
        if (selection.isEmpty()) {
            const wordAtPosition = editor.getConfiguredWordAtPosition(selection.getStartPosition());
            if (wordAtPosition && false === seedSearchStringFromNonEmptySelection) {
                return wordAtPosition.word;
            }
        }
        else {
            if (editor.getModel().getValueLengthInRange(selection) < SEARCH_STRING_MAX_LENGTH) {
                return editor.getModel().getValueInRange(selection);
            }
        }
    }
    return null;
}
export var FindStartFocusAction;
(function (FindStartFocusAction) {
    FindStartFocusAction[FindStartFocusAction["NoFocusChange"] = 0] = "NoFocusChange";
    FindStartFocusAction[FindStartFocusAction["FocusFindInput"] = 1] = "FocusFindInput";
    FindStartFocusAction[FindStartFocusAction["FocusReplaceInput"] = 2] = "FocusReplaceInput";
})(FindStartFocusAction || (FindStartFocusAction = {}));
let CommonFindController = class CommonFindController extends Disposable {
    static { CommonFindController_1 = this; }
    static { this.ID = 'editor.contrib.findController'; }
    get editor() {
        return this._editor;
    }
    static get(editor) {
        return editor.getContribution(CommonFindController_1.ID);
    }
    constructor(editor, contextKeyService, storageService, clipboardService, notificationService, hoverService) {
        super();
        this._editor = editor;
        this._findWidgetVisible = CONTEXT_FIND_WIDGET_VISIBLE.bindTo(contextKeyService);
        this._contextKeyService = contextKeyService;
        this._storageService = storageService;
        this._clipboardService = clipboardService;
        this._notificationService = notificationService;
        this._hoverService = hoverService;
        this._updateHistoryDelayer = new Delayer(500);
        this._state = this._register(new FindReplaceState());
        this.loadQueryState();
        this._register(this._state.onFindReplaceStateChange((e) => this._onStateChanged(e)));
        this._model = null;
        this._register(this._editor.onDidChangeModel(() => {
            const shouldRestartFind = this._editor.getModel() && this._state.isRevealed;
            this.disposeModel();
            this._state.change({
                searchScope: null,
                matchCase: this._storageService.getBoolean('editor.matchCase', 1 /* StorageScope.WORKSPACE */, false),
                wholeWord: this._storageService.getBoolean('editor.wholeWord', 1 /* StorageScope.WORKSPACE */, false),
                isRegex: this._storageService.getBoolean('editor.isRegex', 1 /* StorageScope.WORKSPACE */, false),
                preserveCase: this._storageService.getBoolean('editor.preserveCase', 1 /* StorageScope.WORKSPACE */, false),
            }, false);
            if (shouldRestartFind) {
                this._start({
                    forceRevealReplace: false,
                    seedSearchStringFromSelection: 'none',
                    seedSearchStringFromNonEmptySelection: false,
                    seedSearchStringFromGlobalClipboard: false,
                    shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                    shouldAnimate: false,
                    updateSearchScope: false,
                    loop: this._editor.getOption(43 /* EditorOption.find */).loop,
                });
            }
        }));
    }
    dispose() {
        this.disposeModel();
        super.dispose();
    }
    disposeModel() {
        if (this._model) {
            this._model.dispose();
            this._model = null;
        }
    }
    _onStateChanged(e) {
        this.saveQueryState(e);
        if (e.isRevealed) {
            if (this._state.isRevealed) {
                this._findWidgetVisible.set(true);
            }
            else {
                this._findWidgetVisible.reset();
                this.disposeModel();
            }
        }
        if (e.searchString) {
            this.setGlobalBufferTerm(this._state.searchString);
        }
    }
    saveQueryState(e) {
        if (e.isRegex) {
            this._storageService.store('editor.isRegex', this._state.actualIsRegex, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        if (e.wholeWord) {
            this._storageService.store('editor.wholeWord', this._state.actualWholeWord, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        if (e.matchCase) {
            this._storageService.store('editor.matchCase', this._state.actualMatchCase, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        if (e.preserveCase) {
            this._storageService.store('editor.preserveCase', this._state.actualPreserveCase, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    loadQueryState() {
        this._state.change({
            matchCase: this._storageService.getBoolean('editor.matchCase', 1 /* StorageScope.WORKSPACE */, this._state.matchCase),
            wholeWord: this._storageService.getBoolean('editor.wholeWord', 1 /* StorageScope.WORKSPACE */, this._state.wholeWord),
            isRegex: this._storageService.getBoolean('editor.isRegex', 1 /* StorageScope.WORKSPACE */, this._state.isRegex),
            preserveCase: this._storageService.getBoolean('editor.preserveCase', 1 /* StorageScope.WORKSPACE */, this._state.preserveCase),
        }, false);
    }
    isFindInputFocused() {
        return !!CONTEXT_FIND_INPUT_FOCUSED.getValue(this._contextKeyService);
    }
    getState() {
        return this._state;
    }
    closeFindWidget() {
        this._state.change({
            isRevealed: false,
            searchScope: null,
        }, false);
        this._editor.focus();
    }
    toggleCaseSensitive() {
        this._state.change({ matchCase: !this._state.matchCase }, false);
        if (!this._state.isRevealed) {
            this.highlightFindOptions();
        }
    }
    toggleWholeWords() {
        this._state.change({ wholeWord: !this._state.wholeWord }, false);
        if (!this._state.isRevealed) {
            this.highlightFindOptions();
        }
    }
    toggleRegex() {
        this._state.change({ isRegex: !this._state.isRegex }, false);
        if (!this._state.isRevealed) {
            this.highlightFindOptions();
        }
    }
    togglePreserveCase() {
        this._state.change({ preserveCase: !this._state.preserveCase }, false);
        if (!this._state.isRevealed) {
            this.highlightFindOptions();
        }
    }
    toggleSearchScope() {
        if (this._state.searchScope) {
            this._state.change({ searchScope: null }, true);
        }
        else {
            if (this._editor.hasModel()) {
                let selections = this._editor.getSelections();
                selections = selections
                    .map((selection) => {
                    if (selection.endColumn === 1 && selection.endLineNumber > selection.startLineNumber) {
                        selection = selection.setEndPosition(selection.endLineNumber - 1, this._editor.getModel().getLineMaxColumn(selection.endLineNumber - 1));
                    }
                    if (!selection.isEmpty()) {
                        return selection;
                    }
                    return null;
                })
                    .filter((element) => !!element);
                if (selections.length) {
                    this._state.change({ searchScope: selections }, true);
                }
            }
        }
    }
    setSearchString(searchString) {
        if (this._state.isRegex) {
            searchString = strings.escapeRegExpCharacters(searchString);
        }
        this._state.change({ searchString: searchString }, false);
    }
    highlightFindOptions(ignoreWhenVisible = false) {
        // overwritten in subclass
    }
    async _start(opts, newState) {
        this.disposeModel();
        if (!this._editor.hasModel()) {
            // cannot do anything with an editor that doesn't have a model...
            return;
        }
        const stateChanges = {
            ...newState,
            isRevealed: true,
        };
        if (opts.seedSearchStringFromSelection === 'single') {
            const selectionSearchString = getSelectionSearchString(this._editor, opts.seedSearchStringFromSelection, opts.seedSearchStringFromNonEmptySelection);
            if (selectionSearchString) {
                if (this._state.isRegex) {
                    stateChanges.searchString = strings.escapeRegExpCharacters(selectionSearchString);
                }
                else {
                    stateChanges.searchString = selectionSearchString;
                }
            }
        }
        else if (opts.seedSearchStringFromSelection === 'multiple' && !opts.updateSearchScope) {
            const selectionSearchString = getSelectionSearchString(this._editor, opts.seedSearchStringFromSelection);
            if (selectionSearchString) {
                stateChanges.searchString = selectionSearchString;
            }
        }
        if (!stateChanges.searchString && opts.seedSearchStringFromGlobalClipboard) {
            const selectionSearchString = await this.getGlobalBufferTerm();
            if (!this._editor.hasModel()) {
                // the editor has lost its model in the meantime
                return;
            }
            if (selectionSearchString) {
                stateChanges.searchString = selectionSearchString;
            }
        }
        // Overwrite isReplaceRevealed
        if (opts.forceRevealReplace || stateChanges.isReplaceRevealed) {
            stateChanges.isReplaceRevealed = true;
        }
        else if (!this._findWidgetVisible.get()) {
            stateChanges.isReplaceRevealed = false;
        }
        if (opts.updateSearchScope) {
            const currentSelections = this._editor.getSelections();
            if (currentSelections.some((selection) => !selection.isEmpty())) {
                stateChanges.searchScope = currentSelections;
            }
        }
        stateChanges.loop = opts.loop;
        this._state.change(stateChanges, false);
        if (!this._model) {
            this._model = new FindModelBoundToEditorModel(this._editor, this._state);
        }
    }
    start(opts, newState) {
        return this._start(opts, newState);
    }
    moveToNextMatch() {
        if (this._model) {
            this._model.moveToNextMatch();
            return true;
        }
        return false;
    }
    moveToPrevMatch() {
        if (this._model) {
            this._model.moveToPrevMatch();
            return true;
        }
        return false;
    }
    goToMatch(index) {
        if (this._model) {
            this._model.moveToMatch(index);
            return true;
        }
        return false;
    }
    replace() {
        if (this._model) {
            this._model.replace();
            return true;
        }
        return false;
    }
    replaceAll() {
        if (this._model) {
            if (this._editor.getModel()?.isTooLargeForHeapOperation()) {
                this._notificationService.warn(nls.localize('too.large.for.replaceall', 'The file is too large to perform a replace all operation.'));
                return false;
            }
            this._model.replaceAll();
            return true;
        }
        return false;
    }
    selectAllMatches() {
        if (this._model) {
            this._model.selectAllMatches();
            this._editor.focus();
            return true;
        }
        return false;
    }
    async getGlobalBufferTerm() {
        if (this._editor.getOption(43 /* EditorOption.find */).globalFindClipboard &&
            this._editor.hasModel() &&
            !this._editor.getModel().isTooLargeForSyncing()) {
            return this._clipboardService.readFindText();
        }
        return '';
    }
    setGlobalBufferTerm(text) {
        if (this._editor.getOption(43 /* EditorOption.find */).globalFindClipboard &&
            this._editor.hasModel() &&
            !this._editor.getModel().isTooLargeForSyncing()) {
            // intentionally not awaited
            this._clipboardService.writeFindText(text);
        }
    }
};
CommonFindController = CommonFindController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IStorageService),
    __param(3, IClipboardService),
    __param(4, INotificationService),
    __param(5, IHoverService)
], CommonFindController);
export { CommonFindController };
let FindController = class FindController extends CommonFindController {
    constructor(editor, _contextViewService, _contextKeyService, _keybindingService, _themeService, notificationService, _storageService, clipboardService, hoverService) {
        super(editor, _contextKeyService, _storageService, clipboardService, notificationService, hoverService);
        this._contextViewService = _contextViewService;
        this._keybindingService = _keybindingService;
        this._themeService = _themeService;
        this._widget = null;
        this._findOptionsWidget = null;
        this._findWidgetSearchHistory = FindWidgetSearchHistory.getOrCreate(_storageService);
        this._replaceWidgetHistory = ReplaceWidgetHistory.getOrCreate(_storageService);
    }
    async _start(opts, newState) {
        if (!this._widget) {
            this._createFindWidget();
        }
        const selection = this._editor.getSelection();
        let updateSearchScope = false;
        switch (this._editor.getOption(43 /* EditorOption.find */).autoFindInSelection) {
            case 'always':
                updateSearchScope = true;
                break;
            case 'never':
                updateSearchScope = false;
                break;
            case 'multiline': {
                const isSelectionMultipleLine = !!selection && selection.startLineNumber !== selection.endLineNumber;
                updateSearchScope = isSelectionMultipleLine;
                break;
            }
            default:
                break;
        }
        opts.updateSearchScope = opts.updateSearchScope || updateSearchScope;
        await super._start(opts, newState);
        if (this._widget) {
            if (opts.shouldFocus === 2 /* FindStartFocusAction.FocusReplaceInput */) {
                this._widget.focusReplaceInput();
            }
            else if (opts.shouldFocus === 1 /* FindStartFocusAction.FocusFindInput */) {
                this._widget.focusFindInput();
            }
        }
    }
    highlightFindOptions(ignoreWhenVisible = false) {
        if (!this._widget) {
            this._createFindWidget();
        }
        if (this._state.isRevealed && !ignoreWhenVisible) {
            this._widget.highlightFindOptions();
        }
        else {
            this._findOptionsWidget.highlightFindOptions();
        }
    }
    _createFindWidget() {
        this._widget = this._register(new FindWidget(this._editor, this, this._state, this._contextViewService, this._keybindingService, this._contextKeyService, this._themeService, this._storageService, this._notificationService, this._hoverService, this._findWidgetSearchHistory, this._replaceWidgetHistory));
        this._findOptionsWidget = this._register(new FindOptionsWidget(this._editor, this._state, this._keybindingService));
    }
    saveViewState() {
        return this._widget?.getViewState();
    }
    restoreViewState(state) {
        this._widget?.setViewState(state);
    }
};
FindController = __decorate([
    __param(1, IContextViewService),
    __param(2, IContextKeyService),
    __param(3, IKeybindingService),
    __param(4, IThemeService),
    __param(5, INotificationService),
    __param(6, IStorageService),
    __param(7, IClipboardService),
    __param(8, IHoverService)
], FindController);
export { FindController };
export const StartFindAction = registerMultiEditorAction(new MultiEditorAction({
    id: FIND_IDS.StartFindAction,
    label: nls.localize2('startFindAction', 'Find'),
    precondition: ContextKeyExpr.or(EditorContextKeys.focus, ContextKeyExpr.has('editorIsOpen')),
    kbOpts: {
        kbExpr: null,
        primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
        weight: 100 /* KeybindingWeight.EditorContrib */,
    },
    menuOpts: {
        menuId: MenuId.MenubarEditMenu,
        group: '3_find',
        title: nls.localize({ key: 'miFind', comment: ['&& denotes a mnemonic'] }, '&&Find'),
        order: 1,
    },
}));
StartFindAction.addImplementation(0, (accessor, editor, args) => {
    const controller = CommonFindController.get(editor);
    if (!controller) {
        return false;
    }
    return controller.start({
        forceRevealReplace: false,
        seedSearchStringFromSelection: editor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection !== 'never'
            ? 'single'
            : 'none',
        seedSearchStringFromNonEmptySelection: editor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
        seedSearchStringFromGlobalClipboard: editor.getOption(43 /* EditorOption.find */).globalFindClipboard,
        shouldFocus: 1 /* FindStartFocusAction.FocusFindInput */,
        shouldAnimate: true,
        updateSearchScope: false,
        loop: editor.getOption(43 /* EditorOption.find */).loop,
    });
});
const findArgDescription = {
    description: 'Open a new In-Editor Find Widget.',
    args: [
        {
            name: 'Open a new In-Editor Find Widget args',
            schema: {
                properties: {
                    searchString: { type: 'string' },
                    replaceString: { type: 'string' },
                    isRegex: { type: 'boolean' },
                    matchWholeWord: { type: 'boolean' },
                    isCaseSensitive: { type: 'boolean' },
                    preserveCase: { type: 'boolean' },
                    findInSelection: { type: 'boolean' },
                },
            },
        },
    ],
};
export class StartFindWithArgsAction extends EditorAction {
    constructor() {
        super({
            id: FIND_IDS.StartFindWithArgs,
            label: nls.localize2('startFindWithArgsAction', 'Find with Arguments'),
            precondition: undefined,
            kbOpts: {
                kbExpr: null,
                primary: 0,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: findArgDescription,
        });
    }
    async run(accessor, editor, args) {
        const controller = CommonFindController.get(editor);
        if (controller) {
            const newState = args
                ? {
                    searchString: args.searchString,
                    replaceString: args.replaceString,
                    isReplaceRevealed: args.replaceString !== undefined,
                    isRegex: args.isRegex,
                    // isRegexOverride: args.regexOverride,
                    wholeWord: args.matchWholeWord,
                    // wholeWordOverride: args.wholeWordOverride,
                    matchCase: args.isCaseSensitive,
                    // matchCaseOverride: args.matchCaseOverride,
                    preserveCase: args.preserveCase,
                    // preserveCaseOverride: args.preserveCaseOverride,
                }
                : {};
            await controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: controller.getState().searchString.length === 0 &&
                    editor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection !== 'never'
                    ? 'single'
                    : 'none',
                seedSearchStringFromNonEmptySelection: editor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
                seedSearchStringFromGlobalClipboard: true,
                shouldFocus: 1 /* FindStartFocusAction.FocusFindInput */,
                shouldAnimate: true,
                updateSearchScope: args?.findInSelection || false,
                loop: editor.getOption(43 /* EditorOption.find */).loop,
            }, newState);
            controller.setGlobalBufferTerm(controller.getState().searchString);
        }
    }
}
export class StartFindWithSelectionAction extends EditorAction {
    constructor() {
        super({
            id: FIND_IDS.StartFindWithSelection,
            label: nls.localize2('startFindWithSelectionAction', 'Find with Selection'),
            precondition: undefined,
            kbOpts: {
                kbExpr: null,
                primary: 0,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 35 /* KeyCode.KeyE */,
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    async run(accessor, editor) {
        const controller = CommonFindController.get(editor);
        if (controller) {
            await controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'multiple',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: true,
                updateSearchScope: false,
                loop: editor.getOption(43 /* EditorOption.find */).loop,
            });
            controller.setGlobalBufferTerm(controller.getState().searchString);
        }
    }
}
export class MatchFindAction extends EditorAction {
    async run(accessor, editor) {
        const controller = CommonFindController.get(editor);
        if (controller && !this._run(controller)) {
            await controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: controller.getState().searchString.length === 0 &&
                    editor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection !== 'never'
                    ? 'single'
                    : 'none',
                seedSearchStringFromNonEmptySelection: editor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
                seedSearchStringFromGlobalClipboard: true,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: true,
                updateSearchScope: false,
                loop: editor.getOption(43 /* EditorOption.find */).loop,
            });
            this._run(controller);
        }
    }
}
export class NextMatchFindAction extends MatchFindAction {
    constructor() {
        super({
            id: FIND_IDS.NextMatchFindAction,
            label: nls.localize2('findNextMatchAction', 'Find Next'),
            precondition: undefined,
            kbOpts: [
                {
                    kbExpr: EditorContextKeys.focus,
                    primary: 61 /* KeyCode.F3 */,
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */, secondary: [61 /* KeyCode.F3 */] },
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                },
                {
                    kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_FIND_INPUT_FOCUSED),
                    primary: 3 /* KeyCode.Enter */,
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                },
            ],
        });
    }
    _run(controller) {
        const result = controller.moveToNextMatch();
        if (result) {
            controller.editor.pushUndoStop();
            return true;
        }
        return false;
    }
}
export class PreviousMatchFindAction extends MatchFindAction {
    constructor() {
        super({
            id: FIND_IDS.PreviousMatchFindAction,
            label: nls.localize2('findPreviousMatchAction', 'Find Previous'),
            precondition: undefined,
            kbOpts: [
                {
                    kbExpr: EditorContextKeys.focus,
                    primary: 1024 /* KeyMod.Shift */ | 61 /* KeyCode.F3 */,
                    mac: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 37 /* KeyCode.KeyG */,
                        secondary: [1024 /* KeyMod.Shift */ | 61 /* KeyCode.F3 */],
                    },
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                },
                {
                    kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_FIND_INPUT_FOCUSED),
                    primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                },
            ],
        });
    }
    _run(controller) {
        return controller.moveToPrevMatch();
    }
}
export class MoveToMatchFindAction extends EditorAction {
    constructor() {
        super({
            id: FIND_IDS.GoToMatchFindAction,
            label: nls.localize2('findMatchAction.goToMatch', 'Go to Match...'),
            precondition: CONTEXT_FIND_WIDGET_VISIBLE,
        });
        this._highlightDecorations = [];
    }
    run(accessor, editor, args) {
        const controller = CommonFindController.get(editor);
        if (!controller) {
            return;
        }
        const matchesCount = controller.getState().matchesCount;
        if (matchesCount < 1) {
            const notificationService = accessor.get(INotificationService);
            notificationService.notify({
                severity: Severity.Warning,
                message: nls.localize('findMatchAction.noResults', 'No matches. Try searching for something else.'),
            });
            return;
        }
        const quickInputService = accessor.get(IQuickInputService);
        const disposables = new DisposableStore();
        const inputBox = disposables.add(quickInputService.createInputBox());
        inputBox.placeholder = nls.localize('findMatchAction.inputPlaceHolder', 'Type a number to go to a specific match (between 1 and {0})', matchesCount);
        const toFindMatchIndex = (value) => {
            const index = parseInt(value);
            if (isNaN(index)) {
                return undefined;
            }
            const matchCount = controller.getState().matchesCount;
            if (index > 0 && index <= matchCount) {
                return index - 1; // zero based
            }
            else if (index < 0 && index >= -matchCount) {
                return matchCount + index;
            }
            return undefined;
        };
        const updatePickerAndEditor = (value) => {
            const index = toFindMatchIndex(value);
            if (typeof index === 'number') {
                // valid
                inputBox.validationMessage = undefined;
                controller.goToMatch(index);
                const currentMatch = controller.getState().currentMatch;
                if (currentMatch) {
                    this.addDecorations(editor, currentMatch);
                }
            }
            else {
                inputBox.validationMessage = nls.localize('findMatchAction.inputValidationMessage', 'Please type a number between 1 and {0}', controller.getState().matchesCount);
                this.clearDecorations(editor);
            }
        };
        disposables.add(inputBox.onDidChangeValue((value) => {
            updatePickerAndEditor(value);
        }));
        disposables.add(inputBox.onDidAccept(() => {
            const index = toFindMatchIndex(inputBox.value);
            if (typeof index === 'number') {
                controller.goToMatch(index);
                inputBox.hide();
            }
            else {
                inputBox.validationMessage = nls.localize('findMatchAction.inputValidationMessage', 'Please type a number between 1 and {0}', controller.getState().matchesCount);
            }
        }));
        disposables.add(inputBox.onDidHide(() => {
            this.clearDecorations(editor);
            disposables.dispose();
        }));
        inputBox.show();
    }
    clearDecorations(editor) {
        editor.changeDecorations((changeAccessor) => {
            this._highlightDecorations = changeAccessor.deltaDecorations(this._highlightDecorations, []);
        });
    }
    addDecorations(editor, range) {
        editor.changeDecorations((changeAccessor) => {
            this._highlightDecorations = changeAccessor.deltaDecorations(this._highlightDecorations, [
                {
                    range,
                    options: {
                        description: 'find-match-quick-access-range-highlight',
                        className: 'rangeHighlight',
                        isWholeLine: true,
                    },
                },
                {
                    range,
                    options: {
                        description: 'find-match-quick-access-range-highlight-overview',
                        overviewRuler: {
                            color: themeColorFromId(overviewRulerRangeHighlight),
                            position: OverviewRulerLane.Full,
                        },
                    },
                },
            ]);
        });
    }
}
export class SelectionMatchFindAction extends EditorAction {
    async run(accessor, editor) {
        const controller = CommonFindController.get(editor);
        if (!controller) {
            return;
        }
        const selectionSearchString = getSelectionSearchString(editor, 'single', false);
        if (selectionSearchString) {
            controller.setSearchString(selectionSearchString);
        }
        if (!this._run(controller)) {
            await controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: true,
                updateSearchScope: false,
                loop: editor.getOption(43 /* EditorOption.find */).loop,
            });
            this._run(controller);
        }
    }
}
export class NextSelectionMatchFindAction extends SelectionMatchFindAction {
    constructor() {
        super({
            id: FIND_IDS.NextSelectionMatchFindAction,
            label: nls.localize2('nextSelectionMatchFindAction', 'Find Next Selection'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 61 /* KeyCode.F3 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    _run(controller) {
        return controller.moveToNextMatch();
    }
}
export class PreviousSelectionMatchFindAction extends SelectionMatchFindAction {
    constructor() {
        super({
            id: FIND_IDS.PreviousSelectionMatchFindAction,
            label: nls.localize2('previousSelectionMatchFindAction', 'Find Previous Selection'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 61 /* KeyCode.F3 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    _run(controller) {
        return controller.moveToPrevMatch();
    }
}
export const StartFindReplaceAction = registerMultiEditorAction(new MultiEditorAction({
    id: FIND_IDS.StartFindReplaceAction,
    label: nls.localize2('startReplace', 'Replace'),
    precondition: ContextKeyExpr.or(EditorContextKeys.focus, ContextKeyExpr.has('editorIsOpen')),
    kbOpts: {
        kbExpr: null,
        primary: 2048 /* KeyMod.CtrlCmd */ | 38 /* KeyCode.KeyH */,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */ },
        weight: 100 /* KeybindingWeight.EditorContrib */,
    },
    menuOpts: {
        menuId: MenuId.MenubarEditMenu,
        group: '3_find',
        title: nls.localize({ key: 'miReplace', comment: ['&& denotes a mnemonic'] }, '&&Replace'),
        order: 2,
    },
}));
StartFindReplaceAction.addImplementation(0, (accessor, editor, args) => {
    if (!editor.hasModel() || editor.getOption(96 /* EditorOption.readOnly */)) {
        return false;
    }
    const controller = CommonFindController.get(editor);
    if (!controller) {
        return false;
    }
    const currentSelection = editor.getSelection();
    const findInputFocused = controller.isFindInputFocused();
    // we only seed search string from selection when the current selection is single line and not empty,
    // + the find input is not focused
    const seedSearchStringFromSelection = !currentSelection.isEmpty() &&
        currentSelection.startLineNumber === currentSelection.endLineNumber &&
        editor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection !== 'never' &&
        !findInputFocused;
    /*
* if the existing search string in find widget is empty and we don't seed search string from selection, it means the Find Input is still empty, so we should focus the Find Input instead of Replace Input.

* findInputFocused true -> seedSearchStringFromSelection false, FocusReplaceInput
* findInputFocused false, seedSearchStringFromSelection true FocusReplaceInput
* findInputFocused false seedSearchStringFromSelection false FocusFindInput
*/
    const shouldFocus = findInputFocused || seedSearchStringFromSelection
        ? 2 /* FindStartFocusAction.FocusReplaceInput */
        : 1 /* FindStartFocusAction.FocusFindInput */;
    return controller.start({
        forceRevealReplace: true,
        seedSearchStringFromSelection: seedSearchStringFromSelection ? 'single' : 'none',
        seedSearchStringFromNonEmptySelection: editor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
        seedSearchStringFromGlobalClipboard: editor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection !== 'never',
        shouldFocus: shouldFocus,
        shouldAnimate: true,
        updateSearchScope: false,
        loop: editor.getOption(43 /* EditorOption.find */).loop,
    });
});
registerEditorContribution(CommonFindController.ID, FindController, 0 /* EditorContributionInstantiation.Eager */); // eager because it uses `saveViewState`/`restoreViewState`
registerEditorAction(StartFindWithArgsAction);
registerEditorAction(StartFindWithSelectionAction);
registerEditorAction(NextMatchFindAction);
registerEditorAction(PreviousMatchFindAction);
registerEditorAction(MoveToMatchFindAction);
registerEditorAction(NextSelectionMatchFindAction);
registerEditorAction(PreviousSelectionMatchFindAction);
const FindCommand = EditorCommand.bindToContribution(CommonFindController.get);
registerEditorCommand(new FindCommand({
    id: FIND_IDS.CloseFindWidgetCommand,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: (x) => x.closeFindWidget(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, ContextKeyExpr.not('isComposing')),
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    },
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleCaseSensitiveCommand,
    precondition: undefined,
    handler: (x) => x.toggleCaseSensitive(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: ToggleCaseSensitiveKeybinding.primary,
        mac: ToggleCaseSensitiveKeybinding.mac,
        win: ToggleCaseSensitiveKeybinding.win,
        linux: ToggleCaseSensitiveKeybinding.linux,
    },
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleWholeWordCommand,
    precondition: undefined,
    handler: (x) => x.toggleWholeWords(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: ToggleWholeWordKeybinding.primary,
        mac: ToggleWholeWordKeybinding.mac,
        win: ToggleWholeWordKeybinding.win,
        linux: ToggleWholeWordKeybinding.linux,
    },
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleRegexCommand,
    precondition: undefined,
    handler: (x) => x.toggleRegex(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: ToggleRegexKeybinding.primary,
        mac: ToggleRegexKeybinding.mac,
        win: ToggleRegexKeybinding.win,
        linux: ToggleRegexKeybinding.linux,
    },
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleSearchScopeCommand,
    precondition: undefined,
    handler: (x) => x.toggleSearchScope(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: ToggleSearchScopeKeybinding.primary,
        mac: ToggleSearchScopeKeybinding.mac,
        win: ToggleSearchScopeKeybinding.win,
        linux: ToggleSearchScopeKeybinding.linux,
    },
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.TogglePreserveCaseCommand,
    precondition: undefined,
    handler: (x) => x.togglePreserveCase(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: TogglePreserveCaseKeybinding.primary,
        mac: TogglePreserveCaseKeybinding.mac,
        win: TogglePreserveCaseKeybinding.win,
        linux: TogglePreserveCaseKeybinding.linux,
    },
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ReplaceOneAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: (x) => x.replace(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 22 /* KeyCode.Digit1 */,
    },
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ReplaceOneAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: (x) => x.replace(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_REPLACE_INPUT_FOCUSED),
        primary: 3 /* KeyCode.Enter */,
    },
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ReplaceAllAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: (x) => x.replaceAll(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
    },
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ReplaceAllAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: (x) => x.replaceAll(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_REPLACE_INPUT_FOCUSED),
        primary: undefined,
        mac: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
        },
    },
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.SelectAllMatchesAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: (x) => x.selectAllMatches(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
    },
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZENvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9maW5kL2Jyb3dzZXIvZmluZENvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFN0QsT0FBTyxFQUNOLFlBQVksRUFDWixhQUFhLEVBRWIsaUJBQWlCLEVBQ2pCLG9CQUFvQixFQUNwQixxQkFBcUIsRUFDckIsMEJBQTBCLEVBQzFCLHlCQUF5QixHQUV6QixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBR3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzVELE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsMkJBQTJCLEVBQzNCLDZCQUE2QixFQUM3QiwyQkFBMkIsRUFDM0IsUUFBUSxFQUNSLDZCQUE2QixFQUM3Qiw0QkFBNEIsRUFDNUIscUJBQXFCLEVBQ3JCLDJCQUEyQixFQUMzQix5QkFBeUIsR0FDekIsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN2QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sZ0JBQWdCLEdBR2hCLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkIsT0FBTyxFQUFFLFVBQVUsRUFBbUIsTUFBTSxpQkFBaUIsQ0FBQTtBQUM3RCxP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
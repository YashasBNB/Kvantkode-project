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
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { SelectBox } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import * as lifecycle from '../../../../base/common/lifecycle.js';
import { URI as uri } from '../../../../base/common/uri.js';
import { EditorCommand, registerEditorCommand, } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { CompletionOptions, provideSuggestionItems, } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { ZoneWidget } from '../../../../editor/contrib/zoneWidget/browser/zoneWidget.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { defaultButtonStyles, defaultSelectBoxStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { getSimpleCodeEditorWidgetOptions, getSimpleEditorOptions, } from '../../codeEditor/browser/simpleEditorOptions.js';
import { BREAKPOINT_EDITOR_CONTRIBUTION_ID, CONTEXT_BREAKPOINT_WIDGET_VISIBLE, CONTEXT_IN_BREAKPOINT_WIDGET, DEBUG_SCHEME, IDebugService, } from '../common/debug.js';
import './media/breakpointWidget.css';
const $ = dom.$;
const IPrivateBreakpointWidgetService = createDecorator('privateBreakpointWidgetService');
const DECORATION_KEY = 'breakpointwidgetdecoration';
function isPositionInCurlyBracketBlock(input) {
    const model = input.getModel();
    const bracketPairs = model.bracketPairs.getBracketPairsInRange(Range.fromPositions(input.getPosition()));
    return bracketPairs.some((p) => p.openingBracketInfo.bracketText === '{');
}
function createDecorations(theme, placeHolder) {
    const transparentForeground = theme.getColor(editorForeground)?.transparent(0.4);
    return [
        {
            range: {
                startLineNumber: 0,
                endLineNumber: 0,
                startColumn: 0,
                endColumn: 1,
            },
            renderOptions: {
                after: {
                    contentText: placeHolder,
                    color: transparentForeground ? transparentForeground.toString() : undefined,
                },
            },
        },
    ];
}
let BreakpointWidget = class BreakpointWidget extends ZoneWidget {
    constructor(editor, lineNumber, column, context, contextViewService, debugService, themeService, instantiationService, modelService, codeEditorService, _configurationService, languageFeaturesService, keybindingService, labelService, textModelService, hoverService) {
        super(editor, { showFrame: true, showArrow: false, frameWidth: 1, isAccessible: true });
        this.lineNumber = lineNumber;
        this.column = column;
        this.contextViewService = contextViewService;
        this.debugService = debugService;
        this.themeService = themeService;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.codeEditorService = codeEditorService;
        this._configurationService = _configurationService;
        this.languageFeaturesService = languageFeaturesService;
        this.keybindingService = keybindingService;
        this.labelService = labelService;
        this.textModelService = textModelService;
        this.hoverService = hoverService;
        this.conditionInput = '';
        this.hitCountInput = '';
        this.logMessageInput = '';
        this.toDispose = [];
        const model = this.editor.getModel();
        if (model) {
            const uri = model.uri;
            const breakpoints = this.debugService
                .getModel()
                .getBreakpoints({ lineNumber: this.lineNumber, column: this.column, uri });
            this.breakpoint = breakpoints.length ? breakpoints[0] : undefined;
        }
        if (context === undefined) {
            if (this.breakpoint &&
                !this.breakpoint.condition &&
                !this.breakpoint.hitCondition &&
                this.breakpoint.logMessage) {
                this.context = 2 /* Context.LOG_MESSAGE */;
            }
            else if (this.breakpoint && !this.breakpoint.condition && this.breakpoint.hitCondition) {
                this.context = 1 /* Context.HIT_COUNT */;
            }
            else if (this.breakpoint && this.breakpoint.triggeredBy) {
                this.context = 3 /* Context.TRIGGER_POINT */;
            }
            else {
                this.context = 0 /* Context.CONDITION */;
            }
        }
        else {
            this.context = context;
        }
        this.toDispose.push(this.debugService.getModel().onDidChangeBreakpoints((e) => {
            if (this.breakpoint && e && e.removed && e.removed.indexOf(this.breakpoint) >= 0) {
                this.dispose();
            }
        }));
        this.codeEditorService.registerDecorationType('breakpoint-widget', DECORATION_KEY, {});
        this.create();
    }
    get placeholder() {
        const acceptString = this.keybindingService.lookupKeybinding(AcceptBreakpointWidgetInputAction.ID)?.getLabel() ||
            'Enter';
        const closeString = this.keybindingService.lookupKeybinding(CloseBreakpointWidgetCommand.ID)?.getLabel() ||
            'Escape';
        switch (this.context) {
            case 2 /* Context.LOG_MESSAGE */:
                return nls.localize('breakpointWidgetLogMessagePlaceholder', "Message to log when breakpoint is hit. Expressions within {} are interpolated. '{0}' to accept, '{1}' to cancel.", acceptString, closeString);
            case 1 /* Context.HIT_COUNT */:
                return nls.localize('breakpointWidgetHitCountPlaceholder', "Break when hit count condition is met. '{0}' to accept, '{1}' to cancel.", acceptString, closeString);
            default:
                return nls.localize('breakpointWidgetExpressionPlaceholder', "Break when expression evaluates to true. '{0}' to accept, '{1}' to cancel.", acceptString, closeString);
        }
    }
    getInputValue(breakpoint) {
        switch (this.context) {
            case 2 /* Context.LOG_MESSAGE */:
                return breakpoint && breakpoint.logMessage ? breakpoint.logMessage : this.logMessageInput;
            case 1 /* Context.HIT_COUNT */:
                return breakpoint && breakpoint.hitCondition ? breakpoint.hitCondition : this.hitCountInput;
            default:
                return breakpoint && breakpoint.condition ? breakpoint.condition : this.conditionInput;
        }
    }
    rememberInput() {
        if (this.context !== 3 /* Context.TRIGGER_POINT */) {
            const value = this.input.getModel().getValue();
            switch (this.context) {
                case 2 /* Context.LOG_MESSAGE */:
                    this.logMessageInput = value;
                    break;
                case 1 /* Context.HIT_COUNT */:
                    this.hitCountInput = value;
                    break;
                default:
                    this.conditionInput = value;
            }
        }
    }
    setInputMode() {
        if (this.editor.hasModel()) {
            // Use plaintext language for log messages, otherwise respect underlying editor language #125619
            const languageId = this.context === 2 /* Context.LOG_MESSAGE */
                ? PLAINTEXT_LANGUAGE_ID
                : this.editor.getModel().getLanguageId();
            this.input.getModel().setLanguage(languageId);
        }
    }
    show(rangeOrPos) {
        const lineNum = this.input.getModel().getLineCount();
        super.show(rangeOrPos, lineNum + 1);
    }
    fitHeightToContent() {
        const lineNum = this.input.getModel().getLineCount();
        this._relayout(lineNum + 1);
    }
    _fillContainer(container) {
        this.setCssClass('breakpoint-widget');
        const selectBox = new SelectBox([
            { text: nls.localize('expression', 'Expression') },
            { text: nls.localize('hitCount', 'Hit Count') },
            { text: nls.localize('logMessage', 'Log Message') },
            { text: nls.localize('triggeredBy', 'Wait for Breakpoint') },
        ], this.context, this.contextViewService, defaultSelectBoxStyles, { ariaLabel: nls.localize('breakpointType', 'Breakpoint Type') });
        this.selectContainer = $('.breakpoint-select-container');
        selectBox.render(dom.append(container, this.selectContainer));
        selectBox.onDidSelect((e) => {
            this.rememberInput();
            this.context = e.index;
            this.updateContextInput();
        });
        this.createModesInput(container);
        this.inputContainer = $('.inputContainer');
        this.toDispose.push(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.inputContainer, this.placeholder));
        this.createBreakpointInput(dom.append(container, this.inputContainer));
        this.input.getModel().setValue(this.getInputValue(this.breakpoint));
        this.toDispose.push(this.input.getModel().onDidChangeContent(() => {
            this.fitHeightToContent();
        }));
        this.input.setPosition({ lineNumber: 1, column: this.input.getModel().getLineMaxColumn(1) });
        this.createTriggerBreakpointInput(container);
        this.updateContextInput();
        // Due to an electron bug we have to do the timeout, otherwise we do not get focus
        setTimeout(() => this.focusInput(), 150);
    }
    createModesInput(container) {
        const modes = this.debugService.getModel().getBreakpointModes('source');
        if (modes.length <= 1) {
            return;
        }
        const sb = (this.selectModeBox = new SelectBox([
            { text: nls.localize('bpMode', 'Mode'), isDisabled: true },
            ...modes.map((mode) => ({ text: mode.label, description: mode.description })),
        ], modes.findIndex((m) => m.mode === this.breakpoint?.mode) + 1, this.contextViewService, defaultSelectBoxStyles));
        this.toDispose.push(sb);
        this.toDispose.push(sb.onDidSelect((e) => {
            this.modeInput = modes[e.index - 1];
        }));
        const modeWrapper = $('.select-mode-container');
        const selectionWrapper = $('.select-box-container');
        dom.append(modeWrapper, selectionWrapper);
        sb.render(selectionWrapper);
        dom.append(container, modeWrapper);
    }
    createTriggerBreakpointInput(container) {
        const breakpoints = this.debugService
            .getModel()
            .getBreakpoints()
            .filter((bp) => bp !== this.breakpoint && !bp.logMessage);
        const breakpointOptions = [
            { text: nls.localize('noTriggerByBreakpoint', 'None'), isDisabled: true },
            ...breakpoints.map((bp) => ({
                text: `${this.labelService.getUriLabel(bp.uri, { relative: true })}: ${bp.lineNumber}`,
                description: nls.localize('triggerByLoading', 'Loading...'),
            })),
        ];
        const index = breakpoints.findIndex((bp) => this.breakpoint?.triggeredBy === bp.getId());
        for (const [i, bp] of breakpoints.entries()) {
            this.textModelService
                .createModelReference(bp.uri)
                .then((ref) => {
                try {
                    breakpointOptions[i + 1].description = ref.object.textEditorModel
                        .getLineContent(bp.lineNumber)
                        .trim();
                }
                finally {
                    ref.dispose();
                }
            })
                .catch(() => {
                breakpointOptions[i + 1].description = nls.localize('noBpSource', 'Could not load source.');
            });
        }
        const selectBreakpointBox = (this.selectBreakpointBox = new SelectBox(breakpointOptions, index + 1, this.contextViewService, defaultSelectBoxStyles, { ariaLabel: nls.localize('selectBreakpoint', 'Select breakpoint') }));
        selectBreakpointBox.onDidSelect((e) => {
            if (e.index === 0) {
                this.triggeredByBreakpointInput = undefined;
            }
            else {
                this.triggeredByBreakpointInput = breakpoints[e.index - 1];
            }
        });
        this.toDispose.push(selectBreakpointBox);
        this.selectBreakpointContainer = $('.select-breakpoint-container');
        this.toDispose.push(dom.addDisposableListener(this.selectBreakpointContainer, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(9 /* KeyCode.Escape */)) {
                this.close(false);
            }
        }));
        const selectionWrapper = $('.select-box-container');
        dom.append(this.selectBreakpointContainer, selectionWrapper);
        selectBreakpointBox.render(selectionWrapper);
        dom.append(container, this.selectBreakpointContainer);
        const closeButton = new Button(this.selectBreakpointContainer, defaultButtonStyles);
        closeButton.label = nls.localize('ok', 'OK');
        this.toDispose.push(closeButton.onDidClick(() => this.close(true)));
        this.toDispose.push(closeButton);
    }
    updateContextInput() {
        if (this.context === 3 /* Context.TRIGGER_POINT */) {
            this.inputContainer.hidden = true;
            this.selectBreakpointContainer.hidden = false;
        }
        else {
            this.inputContainer.hidden = false;
            this.selectBreakpointContainer.hidden = true;
            this.setInputMode();
            const value = this.getInputValue(this.breakpoint);
            this.input.getModel().setValue(value);
            this.focusInput();
        }
    }
    _doLayout(heightInPixel, widthInPixel) {
        this.heightInPx = heightInPixel;
        this.input.layout({ height: heightInPixel, width: widthInPixel - 113 });
        this.centerInputVertically();
    }
    _onWidth(widthInPixel) {
        if (typeof this.heightInPx === 'number') {
            this._doLayout(this.heightInPx, widthInPixel);
        }
    }
    createBreakpointInput(container) {
        const scopedInstatiationService = this.instantiationService.createChild(new ServiceCollection([IPrivateBreakpointWidgetService, this]));
        this.toDispose.push(scopedInstatiationService);
        const options = this.createEditorOptions();
        const codeEditorWidgetOptions = getSimpleCodeEditorWidgetOptions();
        this.input = (scopedInstatiationService.createInstance(CodeEditorWidget, container, options, codeEditorWidgetOptions));
        CONTEXT_IN_BREAKPOINT_WIDGET.bindTo(this.input.contextKeyService).set(true);
        const model = this.modelService.createModel('', null, uri.parse(`${DEBUG_SCHEME}:${this.editor.getId()}:breakpointinput`), true);
        if (this.editor.hasModel()) {
            model.setLanguage(this.editor.getModel().getLanguageId());
        }
        this.input.setModel(model);
        this.setInputMode();
        this.toDispose.push(model);
        const setDecorations = () => {
            const value = this.input.getModel().getValue();
            const decorations = !!value
                ? []
                : createDecorations(this.themeService.getColorTheme(), this.placeholder);
            this.input.setDecorationsByType('breakpoint-widget', DECORATION_KEY, decorations);
        };
        this.input.getModel().onDidChangeContent(() => setDecorations());
        this.themeService.onDidColorThemeChange(() => setDecorations());
        this.toDispose.push(this.languageFeaturesService.completionProvider.register({ scheme: DEBUG_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'breakpointWidget',
            provideCompletionItems: (model, position, _context, token) => {
                let suggestionsPromise;
                const underlyingModel = this.editor.getModel();
                if (underlyingModel &&
                    (this.context === 0 /* Context.CONDITION */ ||
                        (this.context === 2 /* Context.LOG_MESSAGE */ && isPositionInCurlyBracketBlock(this.input)))) {
                    suggestionsPromise = provideSuggestionItems(this.languageFeaturesService.completionProvider, underlyingModel, new Position(this.lineNumber, 1), new CompletionOptions(undefined, new Set().add(27 /* CompletionItemKind.Snippet */)), _context, token).then((suggestions) => {
                        let overwriteBefore = 0;
                        if (this.context === 0 /* Context.CONDITION */) {
                            overwriteBefore = position.column - 1;
                        }
                        else {
                            // Inside the currly brackets, need to count how many useful characters are behind the position so they would all be taken into account
                            const value = this.input.getModel().getValue();
                            while (position.column - 2 - overwriteBefore >= 0 &&
                                value[position.column - 2 - overwriteBefore] !== '{' &&
                                value[position.column - 2 - overwriteBefore] !== ' ') {
                                overwriteBefore++;
                            }
                        }
                        return {
                            suggestions: suggestions.items.map((s) => {
                                s.completion.range = Range.fromPositions(position.delta(0, -overwriteBefore), position);
                                return s.completion;
                            }),
                        };
                    });
                }
                else {
                    suggestionsPromise = Promise.resolve({ suggestions: [] });
                }
                return suggestionsPromise;
            },
        }));
        this.toDispose.push(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.fontSize') ||
                e.affectsConfiguration('editor.lineHeight')) {
                this.input.updateOptions(this.createEditorOptions());
                this.centerInputVertically();
            }
        }));
    }
    createEditorOptions() {
        const editorConfig = this._configurationService.getValue('editor');
        const options = getSimpleEditorOptions(this._configurationService);
        options.fontSize = editorConfig.fontSize;
        options.fontFamily = editorConfig.fontFamily;
        options.lineHeight = editorConfig.lineHeight;
        options.fontLigatures = editorConfig.fontLigatures;
        options.ariaLabel = this.placeholder;
        return options;
    }
    centerInputVertically() {
        if (this.container && typeof this.heightInPx === 'number') {
            const lineHeight = this.input.getOption(68 /* EditorOption.lineHeight */);
            const lineNum = this.input.getModel().getLineCount();
            const newTopMargin = (this.heightInPx - lineNum * lineHeight) / 2;
            this.inputContainer.style.marginTop = newTopMargin + 'px';
        }
    }
    close(success) {
        if (success) {
            // if there is already a breakpoint on this location - remove it.
            let condition = undefined;
            let hitCondition = undefined;
            let logMessage = undefined;
            let triggeredBy = undefined;
            let mode = undefined;
            let modeLabel = undefined;
            this.rememberInput();
            if (this.conditionInput || this.context === 0 /* Context.CONDITION */) {
                condition = this.conditionInput;
            }
            if (this.hitCountInput || this.context === 1 /* Context.HIT_COUNT */) {
                hitCondition = this.hitCountInput;
            }
            if (this.logMessageInput || this.context === 2 /* Context.LOG_MESSAGE */) {
                logMessage = this.logMessageInput;
            }
            if (this.selectModeBox) {
                mode = this.modeInput?.mode;
                modeLabel = this.modeInput?.label;
            }
            if (this.context === 3 /* Context.TRIGGER_POINT */) {
                // currently, trigger points don't support additional conditions:
                condition = undefined;
                hitCondition = undefined;
                logMessage = undefined;
                triggeredBy = this.triggeredByBreakpointInput?.getId();
            }
            if (this.breakpoint) {
                const data = new Map();
                data.set(this.breakpoint.getId(), {
                    condition,
                    hitCondition,
                    logMessage,
                    triggeredBy,
                    mode,
                    modeLabel,
                });
                this.debugService
                    .updateBreakpoints(this.breakpoint.originalUri, data, false)
                    .then(undefined, onUnexpectedError);
            }
            else {
                const model = this.editor.getModel();
                if (model) {
                    this.debugService.addBreakpoints(model.uri, [
                        {
                            lineNumber: this.lineNumber,
                            column: this.column,
                            enabled: true,
                            condition,
                            hitCondition,
                            logMessage,
                            triggeredBy,
                            mode,
                            modeLabel,
                        },
                    ]);
                }
            }
        }
        this.dispose();
    }
    focusInput() {
        if (this.context === 3 /* Context.TRIGGER_POINT */) {
            this.selectBreakpointBox.focus();
        }
        else {
            this.input.focus();
        }
    }
    dispose() {
        super.dispose();
        this.input.dispose();
        lifecycle.dispose(this.toDispose);
        setTimeout(() => this.editor.focus(), 0);
    }
};
BreakpointWidget = __decorate([
    __param(4, IContextViewService),
    __param(5, IDebugService),
    __param(6, IThemeService),
    __param(7, IInstantiationService),
    __param(8, IModelService),
    __param(9, ICodeEditorService),
    __param(10, IConfigurationService),
    __param(11, ILanguageFeaturesService),
    __param(12, IKeybindingService),
    __param(13, ILabelService),
    __param(14, ITextModelService),
    __param(15, IHoverService)
], BreakpointWidget);
export { BreakpointWidget };
class AcceptBreakpointWidgetInputAction extends EditorCommand {
    static { this.ID = 'breakpointWidget.action.acceptInput'; }
    constructor() {
        super({
            id: AcceptBreakpointWidgetInputAction.ID,
            precondition: CONTEXT_BREAKPOINT_WIDGET_VISIBLE,
            kbOpts: {
                kbExpr: CONTEXT_IN_BREAKPOINT_WIDGET,
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    runEditorCommand(accessor, editor) {
        accessor.get(IPrivateBreakpointWidgetService).close(true);
    }
}
class CloseBreakpointWidgetCommand extends EditorCommand {
    static { this.ID = 'closeBreakpointWidget'; }
    constructor() {
        super({
            id: CloseBreakpointWidgetCommand.ID,
            precondition: CONTEXT_BREAKPOINT_WIDGET_VISIBLE,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 9 /* KeyCode.Escape */,
                secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    runEditorCommand(accessor, editor, args) {
        const debugContribution = editor.getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID);
        if (debugContribution) {
            // if focus is in outer editor we need to use the debug contribution to close
            return debugContribution.closeBreakpointWidget();
        }
        accessor.get(IPrivateBreakpointWidgetService).close(false);
    }
}
registerEditorCommand(new AcceptBreakpointWidgetInputAction());
registerEditorCommand(new CloseBreakpointWidgetCommand());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvYnJlYWtwb2ludFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQXFCLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRWpHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXJFLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUUzRCxPQUFPLEVBQ04sYUFBYSxFQUViLHFCQUFxQixHQUNyQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBRW5HLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRixPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFNbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFNUYsT0FB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
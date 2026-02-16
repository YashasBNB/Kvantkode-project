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
import { isSafari } from '../../../../base/browser/browser.js';
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import * as dom from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { Action, Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { distinct } from '../../../../base/common/arrays.js';
import { RunOnceScheduler, timeout } from '../../../../base/common/async.js';
import { memoize } from '../../../../base/common/decorators.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { dispose, disposeIfDisposable } from '../../../../base/common/lifecycle.js';
import * as env from '../../../../base/common/platform.js';
import severity from '../../../../base/common/severity.js';
import { noBreakWhitespace } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { GlyphMarginLane, OverviewRulerLane, } from '../../../../editor/common/model.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant, themeColorFromId, } from '../../../../platform/theme/common/themeService.js';
import { GutterActionsRegistry } from '../../codeEditor/browser/editorLineNumberMenu.js';
import { getBreakpointMessageAndIcon } from './breakpointsView.js';
import { BreakpointWidget } from './breakpointWidget.js';
import * as icons from './debugIcons.js';
import { BREAKPOINT_EDITOR_CONTRIBUTION_ID, CONTEXT_BREAKPOINT_WIDGET_VISIBLE, DebuggerString, IDebugService, } from '../common/debug.js';
const $ = dom.$;
const breakpointHelperDecoration = {
    description: 'breakpoint-helper-decoration',
    glyphMarginClassName: ThemeIcon.asClassName(icons.debugBreakpointHint),
    glyphMargin: { position: GlyphMarginLane.Right },
    glyphMarginHoverMessage: new MarkdownString().appendText(nls.localize('breakpointHelper', 'Click to add a breakpoint')),
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
};
export function createBreakpointDecorations(accessor, model, breakpoints, state, breakpointsActivated, showBreakpointsInOverviewRuler) {
    const result = [];
    breakpoints.forEach((breakpoint) => {
        if (breakpoint.lineNumber > model.getLineCount()) {
            return;
        }
        const hasOtherBreakpointsOnLine = breakpoints.some((bp) => bp !== breakpoint && bp.lineNumber === breakpoint.lineNumber);
        const column = model.getLineFirstNonWhitespaceColumn(breakpoint.lineNumber);
        const range = model.validateRange(breakpoint.column
            ? new Range(breakpoint.lineNumber, breakpoint.column, breakpoint.lineNumber, breakpoint.column + 1)
            : new Range(breakpoint.lineNumber, column, breakpoint.lineNumber, column + 1));
        result.push({
            options: getBreakpointDecorationOptions(accessor, model, breakpoint, state, breakpointsActivated, showBreakpointsInOverviewRuler, hasOtherBreakpointsOnLine),
            range,
        });
    });
    return result;
}
function getBreakpointDecorationOptions(accessor, model, breakpoint, state, breakpointsActivated, showBreakpointsInOverviewRuler, hasOtherBreakpointsOnLine) {
    const debugService = accessor.get(IDebugService);
    const languageService = accessor.get(ILanguageService);
    const labelService = accessor.get(ILabelService);
    const { icon, message, showAdapterUnverifiedMessage } = getBreakpointMessageAndIcon(state, breakpointsActivated, breakpoint, labelService, debugService.getModel());
    let glyphMarginHoverMessage;
    let unverifiedMessage;
    if (showAdapterUnverifiedMessage) {
        let langId;
        unverifiedMessage = debugService
            .getModel()
            .getSessions()
            .map((s) => {
            const dbg = debugService.getAdapterManager().getDebugger(s.configuration.type);
            const message = dbg?.strings?.[DebuggerString.UnverifiedBreakpoints];
            if (message) {
                if (!langId) {
                    // Lazily compute this, only if needed for some debug adapter
                    langId =
                        languageService.guessLanguageIdByFilepathOrFirstLine(breakpoint.uri) ?? undefined;
                }
                return langId && dbg.interestedInLanguage(langId) ? message : undefined;
            }
            return undefined;
        })
            .find((messages) => !!messages);
    }
    if (message) {
        glyphMarginHoverMessage = new MarkdownString(undefined, {
            isTrusted: true,
            supportThemeIcons: true,
        });
        if (breakpoint.condition || breakpoint.hitCondition) {
            const languageId = model.getLanguageId();
            glyphMarginHoverMessage.appendCodeblock(languageId, message);
            if (unverifiedMessage) {
                glyphMarginHoverMessage.appendMarkdown('$(warning) ' + unverifiedMessage);
            }
        }
        else {
            glyphMarginHoverMessage.appendText(message);
            if (unverifiedMessage) {
                glyphMarginHoverMessage.appendMarkdown('\n\n$(warning) ' + unverifiedMessage);
            }
        }
    }
    else if (unverifiedMessage) {
        glyphMarginHoverMessage = new MarkdownString(undefined, {
            isTrusted: true,
            supportThemeIcons: true,
        }).appendMarkdown(unverifiedMessage);
    }
    let overviewRulerDecoration = null;
    if (showBreakpointsInOverviewRuler) {
        overviewRulerDecoration = {
            color: themeColorFromId(debugIconBreakpointForeground),
            position: OverviewRulerLane.Left,
        };
    }
    const renderInline = breakpoint.column &&
        (hasOtherBreakpointsOnLine ||
            breakpoint.column > model.getLineFirstNonWhitespaceColumn(breakpoint.lineNumber));
    return {
        description: 'breakpoint-decoration',
        glyphMargin: { position: GlyphMarginLane.Right },
        glyphMarginClassName: ThemeIcon.asClassName(icon),
        glyphMarginHoverMessage,
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        before: renderInline
            ? {
                content: noBreakWhitespace,
                inlineClassName: `debug-breakpoint-placeholder`,
                inlineClassNameAffectsLetterSpacing: true,
            }
            : undefined,
        overviewRuler: overviewRulerDecoration,
        zIndex: 9999,
    };
}
async function requestBreakpointCandidateLocations(model, lineNumbers, session) {
    if (!session.capabilities.supportsBreakpointLocationsRequest) {
        return [];
    }
    return await Promise.all(distinct(lineNumbers, (l) => l).map(async (lineNumber) => {
        try {
            return { lineNumber, positions: await session.breakpointsLocations(model.uri, lineNumber) };
        }
        catch {
            return { lineNumber, positions: [] };
        }
    }));
}
function createCandidateDecorations(model, breakpointDecorations, lineBreakpoints) {
    const result = [];
    for (const { positions, lineNumber } of lineBreakpoints) {
        if (positions.length === 0) {
            continue;
        }
        // Do not render candidates if there is only one, since it is already covered by the line breakpoint
        const firstColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
        const lastColumn = model.getLineLastNonWhitespaceColumn(lineNumber);
        positions.forEach((p) => {
            const range = new Range(p.lineNumber, p.column, p.lineNumber, p.column + 1);
            if ((p.column <= firstColumn &&
                !breakpointDecorations.some((bp) => bp.range.startColumn > firstColumn && bp.range.startLineNumber === p.lineNumber)) ||
                p.column > lastColumn) {
                // Do not render candidates on the start of the line if there's no other breakpoint on the line.
                return;
            }
            const breakpointAtPosition = breakpointDecorations.find((bpd) => bpd.range.equalsRange(range));
            if (breakpointAtPosition && breakpointAtPosition.inlineWidget) {
                // Space already occupied, do not render candidate.
                return;
            }
            result.push({
                range,
                options: {
                    description: 'breakpoint-placeholder-decoration',
                    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                    before: breakpointAtPosition
                        ? undefined
                        : {
                            content: noBreakWhitespace,
                            inlineClassName: `debug-breakpoint-placeholder`,
                            inlineClassNameAffectsLetterSpacing: true,
                        },
                },
                breakpoint: breakpointAtPosition ? breakpointAtPosition.breakpoint : undefined,
            });
        });
    }
    return result;
}
let BreakpointEditorContribution = class BreakpointEditorContribution {
    constructor(editor, debugService, contextMenuService, instantiationService, contextKeyService, dialogService, configurationService, labelService) {
        this.editor = editor;
        this.debugService = debugService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this.configurationService = configurationService;
        this.labelService = labelService;
        this.breakpointHintDecoration = null;
        this.toDispose = [];
        this.ignoreDecorationsChangedEvent = false;
        this.ignoreBreakpointsChangeEvent = false;
        this.breakpointDecorations = [];
        this.candidateDecorations = [];
        this.breakpointWidgetVisible = CONTEXT_BREAKPOINT_WIDGET_VISIBLE.bindTo(contextKeyService);
        this.setDecorationsScheduler = new RunOnceScheduler(() => this.setDecorations(), 30);
        this.setDecorationsScheduler.schedule();
        this.registerListeners();
    }
    /**
     * Returns context menu actions at the line number if breakpoints can be
     * set. This is used by the {@link TestingDecorations} to allow breakpoint
     * setting on lines where breakpoint "run" actions are present.
     */
    getContextMenuActionsAtPosition(lineNumber, model) {
        if (!this.debugService.getAdapterManager().hasEnabledDebuggers()) {
            return [];
        }
        if (!this.debugService.canSetBreakpointsIn(model)) {
            return [];
        }
        const breakpoints = this.debugService.getModel().getBreakpoints({ lineNumber, uri: model.uri });
        return this.getContextMenuActions(breakpoints, model.uri, lineNumber);
    }
    registerListeners() {
        this.toDispose.push(this.editor.onMouseDown(async (e) => {
            if (!this.debugService.getAdapterManager().hasEnabledDebuggers()) {
                return;
            }
            const model = this.editor.getModel();
            if (!e.target.position ||
                !model ||
                e.target.type !== 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */ ||
                e.target.detail.isAfterLines ||
                (!this.marginFreeFromNonDebugDecorations(e.target.position.lineNumber) &&
                    // don't return early if there's a breakpoint
                    !e.target.element?.className.includes('breakpoint'))) {
                return;
            }
            const canSetBreakpoints = this.debugService.canSetBreakpointsIn(model);
            const lineNumber = e.target.position.lineNumber;
            const uri = model.uri;
            if (e.event.rightButton || (env.isMacintosh && e.event.leftButton && e.event.ctrlKey)) {
                // handled by editor gutter context menu
                return;
            }
            else {
                const breakpoints = this.debugService.getModel().getBreakpoints({ uri, lineNumber });
                if (breakpoints.length) {
                    const isShiftPressed = e.event.shiftKey;
                    const enabled = breakpoints.some((bp) => bp.enabled);
                    if (isShiftPressed) {
                        breakpoints.forEach((bp) => this.debugService.enableOrDisableBreakpoints(!enabled, bp));
                    }
                    else if (!env.isLinux &&
                        breakpoints.some((bp) => !!bp.condition || !!bp.logMessage || !!bp.hitCondition || !!bp.triggeredBy)) {
                        // Show the dialog if there is a potential condition to be accidently lost.
                        // Do not show dialog on linux due to electron issue freezing the mouse #50026
                        const logPoint = breakpoints.every((bp) => !!bp.logMessage);
                        const breakpointType = logPoint
                            ? nls.localize('logPoint', 'Logpoint')
                            : nls.localize('breakpoint', 'Breakpoint');
                        const disabledBreakpointDialogMessage = nls.localize('breakpointHasConditionDisabled', 'This {0} has a {1} that will get lost on remove. Consider enabling the {0} instead.', breakpointType.toLowerCase(), logPoint
                            ? nls.localize('message', 'message')
                            : nls.localize('condition', 'condition'));
                        const enabledBreakpointDialogMessage = nls.localize('breakpointHasConditionEnabled', 'This {0} has a {1} that will get lost on remove. Consider disabling the {0} instead.', breakpointType.toLowerCase(), logPoint
                            ? nls.localize('message', 'message')
                            : nls.localize('condition', 'condition'));
                        await this.dialogService.prompt({
                            type: severity.Info,
                            message: enabled ? enabledBreakpointDialogMessage : disabledBreakpointDialogMessage,
                            buttons: [
                                {
                                    label: nls.localize({ key: 'removeLogPoint', comment: ['&& denotes a mnemonic'] }, '&&Remove {0}', breakpointType),
                                    run: () => breakpoints.forEach((bp) => this.debugService.removeBreakpoints(bp.getId())),
                                },
                                {
                                    label: nls.localize('disableLogPoint', '{0} {1}', enabled
                                        ? nls.localize({ key: 'disable', comment: ['&& denotes a mnemonic'] }, '&&Disable')
                                        : nls.localize({ key: 'enable', comment: ['&& denotes a mnemonic'] }, '&&Enable'), breakpointType),
                                    run: () => breakpoints.forEach((bp) => this.debugService.enableOrDisableBreakpoints(!enabled, bp)),
                                },
                            ],
                            cancelButton: true,
                        });
                    }
                    else {
                        if (!enabled) {
                            breakpoints.forEach((bp) => this.debugService.enableOrDisableBreakpoints(!enabled, bp));
                        }
                        else {
                            breakpoints.forEach((bp) => this.debugService.removeBreakpoints(bp.getId()));
                        }
                    }
                }
                else if (canSetBreakpoints) {
                    if (e.event.middleButton) {
                        const action = this.configurationService.getValue('debug').gutterMiddleClickAction;
                        if (action !== 'none') {
                            let context;
                            switch (action) {
                                case 'logpoint':
                                    context = 2 /* BreakpointWidgetContext.LOG_MESSAGE */;
                                    break;
                                case 'conditionalBreakpoint':
                                    context = 0 /* BreakpointWidgetContext.CONDITION */;
                                    break;
                                case 'triggeredBreakpoint':
                                    context = 3 /* BreakpointWidgetContext.TRIGGER_POINT */;
                            }
                            this.showBreakpointWidget(lineNumber, undefined, context);
                        }
                    }
                    else {
                        this.debugService.addBreakpoints(uri, [{ lineNumber }]);
                    }
                }
            }
        }));
        if (!(BrowserFeatures.pointerEvents && isSafari)) {
            /**
             * We disable the hover feature for Safari on iOS as
             * 1. Browser hover events are handled specially by the system (it treats first click as hover if there is `:hover` css registered). Below hover behavior will confuse users with inconsistent expeirence.
             * 2. When users click on line numbers, the breakpoint hint displays immediately, however it doesn't create the breakpoint unless users click on the left gutter. On a touch screen, it's hard to click on that small area.
             */
            this.toDispose.push(this.editor.onMouseMove((e) => {
                if (!this.debugService.getAdapterManager().hasEnabledDebuggers()) {
                    return;
                }
                let showBreakpointHintAtLineNumber = -1;
                const model = this.editor.getModel();
                if (model &&
                    e.target.position &&
                    (e.target.type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */ ||
                        e.target.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */) &&
                    this.debugService.canSetBreakpointsIn(model) &&
                    this.marginFreeFromNonDebugDecorations(e.target.position.lineNumber)) {
                    const data = e.target.detail;
                    if (!data.isAfterLines) {
                        showBreakpointHintAtLineNumber = e.target.position.lineNumber;
                    }
                }
                this.ensureBreakpointHintDecoration(showBreakpointHintAtLineNumber);
            }));
            this.toDispose.push(this.editor.onMouseLeave(() => {
                this.ensureBreakpointHintDecoration(-1);
            }));
        }
        this.toDispose.push(this.editor.onDidChangeModel(async () => {
            this.closeBreakpointWidget();
            await this.setDecorations();
        }));
        this.toDispose.push(this.debugService.getModel().onDidChangeBreakpoints(() => {
            if (!this.ignoreBreakpointsChangeEvent && !this.setDecorationsScheduler.isScheduled()) {
                this.setDecorationsScheduler.schedule();
            }
        }));
        this.toDispose.push(this.debugService.onDidChangeState(() => {
            // We need to update breakpoint decorations when state changes since the top stack frame and breakpoint decoration might change
            if (!this.setDecorationsScheduler.isScheduled()) {
                this.setDecorationsScheduler.schedule();
            }
        }));
        this.toDispose.push(this.editor.onDidChangeModelDecorations(() => this.onModelDecorationsChanged()));
        this.toDispose.push(this.configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('debug.showBreakpointsInOverviewRuler') ||
                e.affectsConfiguration('debug.showInlineBreakpointCandidates')) {
                await this.setDecorations();
            }
        }));
    }
    getContextMenuActions(breakpoints, uri, lineNumber, column) {
        const actions = [];
        if (breakpoints.length === 1) {
            const breakpointType = breakpoints[0].logMessage
                ? nls.localize('logPoint', 'Logpoint')
                : nls.localize('breakpoint', 'Breakpoint');
            actions.push(new Action('debug.removeBreakpoint', nls.localize('removeBreakpoint', 'Remove {0}', breakpointType), undefined, true, async () => {
                await this.debugService.removeBreakpoints(breakpoints[0].getId());
            }));
            actions.push(new Action('workbench.debug.action.editBreakpointAction', nls.localize('editBreakpoint', 'Edit {0}...', breakpointType), undefined, true, () => Promise.resolve(this.showBreakpointWidget(breakpoints[0].lineNumber, breakpoints[0].column))));
            actions.push(new Action(`workbench.debug.viewlet.action.toggleBreakpoint`, breakpoints[0].enabled
                ? nls.localize('disableBreakpoint', 'Disable {0}', breakpointType)
                : nls.localize('enableBreakpoint', 'Enable {0}', breakpointType), undefined, true, () => this.debugService.enableOrDisableBreakpoints(!breakpoints[0].enabled, breakpoints[0])));
        }
        else if (breakpoints.length > 1) {
            const sorted = breakpoints
                .slice()
                .sort((first, second) => (first.column && second.column ? first.column - second.column : 1));
            actions.push(new SubmenuAction('debug.removeBreakpoints', nls.localize('removeBreakpoints', 'Remove Breakpoints'), sorted.map((bp) => new Action('removeInlineBreakpoint', bp.column
                ? nls.localize('removeInlineBreakpointOnColumn', 'Remove Inline Breakpoint on Column {0}', bp.column)
                : nls.localize('removeLineBreakpoint', 'Remove Line Breakpoint'), undefined, true, () => this.debugService.removeBreakpoints(bp.getId())))));
            actions.push(new SubmenuAction('debug.editBreakpoints', nls.localize('editBreakpoints', 'Edit Breakpoints'), sorted.map((bp) => new Action('editBreakpoint', bp.column
                ? nls.localize('editInlineBreakpointOnColumn', 'Edit Inline Breakpoint on Column {0}', bp.column)
                : nls.localize('editLineBreakpoint', 'Edit Line Breakpoint'), undefined, true, () => Promise.resolve(this.showBreakpointWidget(bp.lineNumber, bp.column))))));
            actions.push(new SubmenuAction('debug.enableDisableBreakpoints', nls.localize('enableDisableBreakpoints', 'Enable/Disable Breakpoints'), sorted.map((bp) => new Action(bp.enabled ? 'disableColumnBreakpoint' : 'enableColumnBreakpoint', bp.enabled
                ? bp.column
                    ? nls.localize('disableInlineColumnBreakpoint', 'Disable Inline Breakpoint on Column {0}', bp.column)
                    : nls.localize('disableBreakpointOnLine', 'Disable Line Breakpoint')
                : bp.column
                    ? nls.localize('enableBreakpoints', 'Enable Inline Breakpoint on Column {0}', bp.column)
                    : nls.localize('enableBreakpointOnLine', 'Enable Line Breakpoint'), undefined, true, () => this.debugService.enableOrDisableBreakpoints(!bp.enabled, bp)))));
        }
        else {
            actions.push(new Action('addBreakpoint', nls.localize('addBreakpoint', 'Add Breakpoint'), undefined, true, () => this.debugService.addBreakpoints(uri, [{ lineNumber, column }])));
            actions.push(new Action('addConditionalBreakpoint', nls.localize('addConditionalBreakpoint', 'Add Conditional Breakpoint...'), undefined, true, () => Promise.resolve(this.showBreakpointWidget(lineNumber, column, 0 /* BreakpointWidgetContext.CONDITION */))));
            actions.push(new Action('addLogPoint', nls.localize('addLogPoint', 'Add Logpoint...'), undefined, true, () => Promise.resolve(this.showBreakpointWidget(lineNumber, column, 2 /* BreakpointWidgetContext.LOG_MESSAGE */))));
            actions.push(new Action('addTriggeredBreakpoint', nls.localize('addTriggeredBreakpoint', 'Add Triggered Breakpoint...'), undefined, true, () => Promise.resolve(this.showBreakpointWidget(lineNumber, column, 3 /* BreakpointWidgetContext.TRIGGER_POINT */))));
        }
        if (this.debugService.state === 2 /* State.Stopped */) {
            actions.push(new Separator());
            actions.push(new Action('runToLine', nls.localize('runToLine', 'Run to Line'), undefined, true, () => this.debugService.runTo(uri, lineNumber).catch(onUnexpectedError)));
        }
        return actions;
    }
    marginFreeFromNonDebugDecorations(line) {
        const decorations = this.editor.getLineDecorations(line);
        if (decorations) {
            for (const { options } of decorations) {
                const clz = options.glyphMarginClassName;
                if (!clz) {
                    continue;
                }
                const hasSomeActionableCodicon = !(clz.includes('codicon-') || clz.startsWith('coverage-deco-')) ||
                    clz.includes('codicon-testing-') ||
                    clz.includes('codicon-merge-') ||
                    clz.includes('codicon-arrow-') ||
                    clz.includes('codicon-loading') ||
                    clz.includes('codicon-fold') ||
                    clz.includes('codicon-gutter-lightbulb') ||
                    clz.includes('codicon-lightbulb-sparkle');
                if (hasSomeActionableCodicon) {
                    return false;
                }
            }
        }
        return true;
    }
    ensureBreakpointHintDecoration(showBreakpointHintAtLineNumber) {
        this.editor.changeDecorations((accessor) => {
            if (this.breakpointHintDecoration) {
                accessor.removeDecoration(this.breakpointHintDecoration);
                this.breakpointHintDecoration = null;
            }
            if (showBreakpointHintAtLineNumber !== -1) {
                this.breakpointHintDecoration = accessor.addDecoration({
                    startLineNumber: showBreakpointHintAtLineNumber,
                    startColumn: 1,
                    endLineNumber: showBreakpointHintAtLineNumber,
                    endColumn: 1,
                }, breakpointHelperDecoration);
            }
        });
    }
    async setDecorations() {
        if (!this.editor.hasModel()) {
            return;
        }
        const setCandidateDecorations = (changeAccessor, desiredCandidatePositions) => {
            const desiredCandidateDecorations = createCandidateDecorations(model, this.breakpointDecorations, desiredCandidatePositions);
            const candidateDecorationIds = changeAccessor.deltaDecorations(this.candidateDecorations.map((c) => c.decorationId), desiredCandidateDecorations);
            this.candidateDecorations.forEach((candidate) => {
                candidate.inlineWidget.dispose();
            });
            this.candidateDecorations = candidateDecorationIds.map((decorationId, index) => {
                const candidate = desiredCandidateDecorations[index];
                // Candidate decoration has a breakpoint attached when a breakpoint is already at that location and we did not yet set a decoration there
                // In practice this happens for the first breakpoint that was set on a line
                // We could have also rendered this first decoration as part of desiredBreakpointDecorations however at that moment we have no location information
                const icon = candidate.breakpoint
                    ? getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), candidate.breakpoint, this.labelService, this.debugService.getModel()).icon
                    : icons.breakpoint.disabled;
                const contextMenuActions = () => this.getContextMenuActions(candidate.breakpoint ? [candidate.breakpoint] : [], activeCodeEditor.getModel().uri, candidate.range.startLineNumber, candidate.range.startColumn);
                const inlineWidget = new InlineBreakpointWidget(activeCodeEditor, decorationId, ThemeIcon.asClassName(icon), candidate.breakpoint, this.debugService, this.contextMenuService, contextMenuActions);
                return {
                    decorationId,
                    inlineWidget,
                };
            });
        };
        const activeCodeEditor = this.editor;
        const model = activeCodeEditor.getModel();
        const breakpoints = this.debugService.getModel().getBreakpoints({ uri: model.uri });
        const debugSettings = this.configurationService.getValue('debug');
        const desiredBreakpointDecorations = this.instantiationService.invokeFunction((accessor) => createBreakpointDecorations(accessor, model, breakpoints, this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), debugSettings.showBreakpointsInOverviewRuler));
        // try to set breakpoint location candidates in the same changeDecorations()
        // call to avoid flickering, if the DA responds reasonably quickly.
        const session = this.debugService.getViewModel().focusedSession;
        const desiredCandidatePositions = debugSettings.showInlineBreakpointCandidates && session
            ? requestBreakpointCandidateLocations(this.editor.getModel(), desiredBreakpointDecorations.map((bp) => bp.range.startLineNumber), session)
            : Promise.resolve([]);
        const desiredCandidatePositionsRaced = await Promise.race([
            desiredCandidatePositions,
            timeout(500).then(() => undefined),
        ]);
        if (desiredCandidatePositionsRaced === undefined) {
            // the timeout resolved first
            desiredCandidatePositions.then((v) => activeCodeEditor.changeDecorations((d) => setCandidateDecorations(d, v)));
        }
        try {
            this.ignoreDecorationsChangedEvent = true;
            // Set breakpoint decorations
            activeCodeEditor.changeDecorations((changeAccessor) => {
                const decorationIds = changeAccessor.deltaDecorations(this.breakpointDecorations.map((bpd) => bpd.decorationId), desiredBreakpointDecorations);
                this.breakpointDecorations.forEach((bpd) => {
                    bpd.inlineWidget?.dispose();
                });
                this.breakpointDecorations = decorationIds.map((decorationId, index) => {
                    let inlineWidget = undefined;
                    const breakpoint = breakpoints[index];
                    if (desiredBreakpointDecorations[index].options.before) {
                        const contextMenuActions = () => this.getContextMenuActions([breakpoint], activeCodeEditor.getModel().uri, breakpoint.lineNumber, breakpoint.column);
                        inlineWidget = new InlineBreakpointWidget(activeCodeEditor, decorationId, desiredBreakpointDecorations[index].options.glyphMarginClassName, breakpoint, this.debugService, this.contextMenuService, contextMenuActions);
                    }
                    return {
                        decorationId,
                        breakpoint,
                        range: desiredBreakpointDecorations[index].range,
                        inlineWidget,
                    };
                });
                if (desiredCandidatePositionsRaced) {
                    setCandidateDecorations(changeAccessor, desiredCandidatePositionsRaced);
                }
            });
        }
        finally {
            this.ignoreDecorationsChangedEvent = false;
        }
        for (const d of this.breakpointDecorations) {
            if (d.inlineWidget) {
                this.editor.layoutContentWidget(d.inlineWidget);
            }
        }
    }
    async onModelDecorationsChanged() {
        if (this.breakpointDecorations.length === 0 ||
            this.ignoreDecorationsChangedEvent ||
            !this.editor.hasModel()) {
            // I have no decorations
            return;
        }
        let somethingChanged = false;
        const model = this.editor.getModel();
        this.breakpointDecorations.forEach((breakpointDecoration) => {
            if (somethingChanged) {
                return;
            }
            const newBreakpointRange = model.getDecorationRange(breakpointDecoration.decorationId);
            if (newBreakpointRange && !breakpointDecoration.range.equalsRange(newBreakpointRange)) {
                somethingChanged = true;
                breakpointDecoration.range = newBreakpointRange;
            }
        });
        if (!somethingChanged) {
            // nothing to do, my decorations did not change.
            return;
        }
        const data = new Map();
        for (let i = 0, len = this.breakpointDecorations.length; i < len; i++) {
            const breakpointDecoration = this.breakpointDecorations[i];
            const decorationRange = model.getDecorationRange(breakpointDecoration.decorationId);
            // check if the line got deleted.
            if (decorationRange) {
                // since we know it is collapsed, it cannot grow to multiple lines
                if (breakpointDecoration.breakpoint) {
                    data.set(breakpointDecoration.breakpoint.getId(), {
                        lineNumber: decorationRange.startLineNumber,
                        column: breakpointDecoration.breakpoint.column
                            ? decorationRange.startColumn
                            : undefined,
                    });
                }
            }
        }
        try {
            this.ignoreBreakpointsChangeEvent = true;
            await this.debugService.updateBreakpoints(model.uri, data, true);
        }
        finally {
            this.ignoreBreakpointsChangeEvent = false;
        }
    }
    // breakpoint widget
    showBreakpointWidget(lineNumber, column, context) {
        this.breakpointWidget?.dispose();
        this.breakpointWidget = this.instantiationService.createInstance(BreakpointWidget, this.editor, lineNumber, column, context);
        this.breakpointWidget.show({ lineNumber, column: 1 });
        this.breakpointWidgetVisible.set(true);
    }
    closeBreakpointWidget() {
        if (this.breakpointWidget) {
            this.breakpointWidget.dispose();
            this.breakpointWidget = undefined;
            this.breakpointWidgetVisible.reset();
            this.editor.focus();
        }
    }
    dispose() {
        this.breakpointWidget?.dispose();
        this.editor.removeDecorations(this.breakpointDecorations.map((bpd) => bpd.decorationId));
        dispose(this.toDispose);
    }
};
BreakpointEditorContribution = __decorate([
    __param(1, IDebugService),
    __param(2, IContextMenuService),
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IDialogService),
    __param(6, IConfigurationService),
    __param(7, ILabelService)
], BreakpointEditorContribution);
export { BreakpointEditorContribution };
GutterActionsRegistry.registerGutterActionsGenerator(({ lineNumber, editor, accessor }, result) => {
    const model = editor.getModel();
    const debugService = accessor.get(IDebugService);
    if (!model ||
        !debugService.getAdapterManager().hasEnabledDebuggers() ||
        !debugService.canSetBreakpointsIn(model)) {
        return;
    }
    const breakpointEditorContribution = editor.getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID);
    if (!breakpointEditorContribution) {
        return;
    }
    const actions = breakpointEditorContribution.getContextMenuActionsAtPosition(lineNumber, model);
    for (const action of actions) {
        result.push(action, '2_debug');
    }
});
class InlineBreakpointWidget {
    constructor(editor, decorationId, cssClass, breakpoint, debugService, contextMenuService, getContextMenuActions) {
        this.editor = editor;
        this.decorationId = decorationId;
        this.breakpoint = breakpoint;
        this.debugService = debugService;
        this.contextMenuService = contextMenuService;
        this.getContextMenuActions = getContextMenuActions;
        // editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = false;
        this.suppressMouseDown = true;
        this.toDispose = [];
        this.range = this.editor.getModel().getDecorationRange(decorationId);
        this.toDispose.push(this.editor.onDidChangeModelDecorations(() => {
            const model = this.editor.getModel();
            const range = model.getDecorationRange(this.decorationId);
            if (this.range && !this.range.equalsRange(range)) {
                this.range = range;
                this.editor.layoutContentWidget(this);
            }
        }));
        this.create(cssClass);
        this.editor.addContentWidget(this);
        this.editor.layoutContentWidget(this);
    }
    create(cssClass) {
        this.domNode = $('.inline-breakpoint-widget');
        if (cssClass) {
            this.domNode.classList.add(...cssClass.split(' '));
        }
        this.toDispose.push(dom.addDisposableListener(this.domNode, dom.EventType.CLICK, async (e) => {
            switch (this.breakpoint?.enabled) {
                case undefined:
                    await this.debugService.addBreakpoints(this.editor.getModel().uri, [
                        { lineNumber: this.range.startLineNumber, column: this.range.startColumn },
                    ]);
                    break;
                case true:
                    await this.debugService.removeBreakpoints(this.breakpoint.getId());
                    break;
                case false:
                    this.debugService.enableOrDisableBreakpoints(true, this.breakpoint);
                    break;
            }
        }));
        this.toDispose.push(dom.addDisposableListener(this.domNode, dom.EventType.CONTEXT_MENU, (e) => {
            const event = new StandardMouseEvent(dom.getWindow(this.domNode), e);
            const actions = this.getContextMenuActions();
            this.contextMenuService.showContextMenu({
                getAnchor: () => event,
                getActions: () => actions,
                getActionsContext: () => this.breakpoint,
                onHide: () => disposeIfDisposable(actions),
            });
        }));
        const updateSize = () => {
            const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
            this.domNode.style.height = `${lineHeight}px`;
            this.domNode.style.width = `${Math.ceil(0.8 * lineHeight)}px`;
            this.domNode.style.marginLeft = `4px`;
        };
        updateSize();
        this.toDispose.push(this.editor.onDidChangeConfiguration((c) => {
            if (c.hasChanged(54 /* EditorOption.fontSize */) || c.hasChanged(68 /* EditorOption.lineHeight */)) {
                updateSize();
            }
        }));
    }
    getId() {
        return generateUuid();
    }
    getDomNode() {
        return this.domNode;
    }
    getPosition() {
        if (!this.range) {
            return null;
        }
        // Workaround: since the content widget can not be placed before the first column we need to force the left position
        this.domNode.classList.toggle('line-start', this.range.startColumn === 1);
        return {
            position: { lineNumber: this.range.startLineNumber, column: this.range.startColumn - 1 },
            preference: [0 /* ContentWidgetPositionPreference.EXACT */],
        };
    }
    dispose() {
        this.editor.removeContentWidget(this);
        dispose(this.toDispose);
    }
}
__decorate([
    memoize
], InlineBreakpointWidget.prototype, "getId", null);
registerThemingParticipant((theme, collector) => {
    const scope = '.monaco-editor .glyph-margin-widgets, .monaco-workbench .debug-breakpoints, .monaco-workbench .disassembly-view, .monaco-editor .contentWidgets';
    const debugIconBreakpointColor = theme.getColor(debugIconBreakpointForeground);
    if (debugIconBreakpointColor) {
        collector.addRule(`${scope} {
			${icons.allBreakpoints.map((b) => `${ThemeIcon.asCSSSelector(b.regular)}`).join(',\n		')},
			${ThemeIcon.asCSSSelector(icons.debugBreakpointUnsupported)},
			${ThemeIcon.asCSSSelector(icons.debugBreakpointHint)}:not([class*='codicon-debug-breakpoint']):not([class*='codicon-debug-stackframe']),
			${ThemeIcon.asCSSSelector(icons.breakpoint.regular)}${ThemeIcon.asCSSSelector(icons.debugStackframeFocused)}::after,
			${ThemeIcon.asCSSSelector(icons.breakpoint.regular)}${ThemeIcon.asCSSSelector(icons.debugStackframe)}::after {
				color: ${debugIconBreakpointColor} !important;
			}
		}`);
        collector.addRule(`${scope} {
			${ThemeIcon.asCSSSelector(icons.breakpoint.pending)} {
				color: ${debugIconBreakpointColor} !important;
				font-size: 12px !important;
			}
		}`);
    }
    const debugIconBreakpointDisabledColor = theme.getColor(debugIconBreakpointDisabledForeground);
    if (debugIconBreakpointDisabledColor) {
        collector.addRule(`${scope} {
			${icons.allBreakpoints.map((b) => ThemeIcon.asCSSSelector(b.disabled)).join(',\n		')} {
				color: ${debugIconBreakpointDisabledColor};
			}
		}`);
    }
    const debugIconBreakpointUnverifiedColor = theme.getColor(debugIconBreakpointUnverifiedForeground);
    if (debugIconBreakpointUnverifiedColor) {
        collector.addRule(`${scope} {
			${icons.allBreakpoints.map((b) => ThemeIcon.asCSSSelector(b.unverified)).join(',\n		')} {
				color: ${debugIconBreakpointUnverifiedColor};
			}
		}`);
    }
    const debugIconBreakpointCurrentStackframeForegroundColor = theme.getColor(debugIconBreakpointCurrentStackframeForeground);
    if (debugIconBreakpointCurrentStackframeForegroundColor) {
        collector.addRule(`
		.monaco-editor .debug-top-stack-frame-column {
			color: ${debugIconBreakpointCurrentStackframeForegroundColor} !important;
		}
		${scope} {
			${ThemeIcon.asCSSSelector(icons.debugStackframe)} {
				color: ${debugIconBreakpointCurrentStackframeForegroundColor} !important;
			}
		}
		`);
    }
    const debugIconBreakpointStackframeFocusedColor = theme.getColor(debugIconBreakpointStackframeForeground);
    if (debugIconBreakpointStackframeFocusedColor) {
        collector.addRule(`${scope} {
			${ThemeIcon.asCSSSelector(icons.debugStackframeFocused)} {
				color: ${debugIconBreakpointStackframeFocusedColor} !important;
			}
		}`);
    }
});
export const debugIconBreakpointForeground = registerColor('debugIcon.breakpointForeground', '#E51400', nls.localize('debugIcon.breakpointForeground', 'Icon color for breakpoints.'));
const debugIconBreakpointDisabledForeground = registerColor('debugIcon.breakpointDisabledForeground', '#848484', nls.localize('debugIcon.breakpointDisabledForeground', 'Icon color for disabled breakpoints.'));
const debugIconBreakpointUnverifiedForeground = registerColor('debugIcon.breakpointUnverifiedForeground', '#848484', nls.localize('debugIcon.breakpointUnverifiedForeground', 'Icon color for unverified breakpoints.'));
const debugIconBreakpointCurrentStackframeForeground = registerColor('debugIcon.breakpointCurrentStackframeForeground', { dark: '#FFCC00', light: '#BE8700', hcDark: '#FFCC00', hcLight: '#BE8700' }, nls.localize('debugIcon.breakpointCurrentStackframeForeground', 'Icon color for the current breakpoint stack frame.'));
const debugIconBreakpointStackframeForeground = registerColor('debugIcon.breakpointStackframeForeground', '#89D185', nls.localize('debugIcon.breakpointStackframeForeground', 'Icon color for all breakpoint stack frames.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludEVkaXRvckNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9icmVha3BvaW50RWRpdG9yQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDckUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFD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
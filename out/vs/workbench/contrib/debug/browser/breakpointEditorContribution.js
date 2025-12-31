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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludEVkaXRvckNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvYnJlYWtwb2ludEVkaXRvckNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3JFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUs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
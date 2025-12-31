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
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Action } from '../../../../base/common/actions.js';
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { assert, assertNever } from '../../../../base/common/assert.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { autorun, derived, observableFromEvent } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isUriComponents, URI } from '../../../../base/common/uri.js';
import { isCodeEditor, } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { InjectedTextCursorStops, } from '../../../../editor/common/model.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { bindContextKey, observableConfigValue, } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
import { TEXT_FILE_EDITOR_ID } from '../../files/common/files.js';
import { getTestingConfiguration } from '../common/configuration.js';
import { FileCoverage } from '../common/testCoverage.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
import { TestId } from '../common/testId.js';
import { ITestService } from '../common/testService.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import * as coverUtils from './codeCoverageDisplayUtils.js';
import { testingCoverageMissingBranch, testingCoverageReport, testingFilterIcon, testingRerunIcon, } from './icons.js';
import { ManagedTestCoverageBars } from './testCoverageBars.js';
const CLASS_HIT = 'coverage-deco-hit';
const CLASS_MISS = 'coverage-deco-miss';
const TOGGLE_INLINE_COMMAND_TEXT = localize('testing.toggleInlineCoverage', 'Toggle Inline');
const TOGGLE_INLINE_COMMAND_ID = 'testing.toggleInlineCoverage';
const BRANCH_MISS_INDICATOR_CHARS = 4;
let CodeCoverageDecorations = class CodeCoverageDecorations extends Disposable {
    constructor(editor, instantiationService, coverage, configurationService, log, contextKeyService) {
        super();
        this.editor = editor;
        this.coverage = coverage;
        this.log = log;
        this.displayedStore = this._register(new DisposableStore());
        this.hoveredStore = this._register(new DisposableStore());
        this.decorationIds = new Map();
        this.summaryWidget = new Lazy(() => this._register(instantiationService.createInstance(CoverageToolbarWidget, this.editor)));
        const modelObs = observableFromEvent(this, editor.onDidChangeModel, () => editor.getModel());
        const configObs = observableFromEvent(this, editor.onDidChangeConfiguration, (i) => i);
        const fileCoverage = derived((reader) => {
            const report = coverage.selected.read(reader);
            if (!report) {
                return;
            }
            const model = modelObs.read(reader);
            if (!model) {
                return;
            }
            const file = report.getUri(model.uri);
            if (!file) {
                return;
            }
            report.didAddCoverage.read(reader); // re-read if changes when there's no report
            return { file, testId: coverage.filterToTest.read(reader) };
        });
        this._register(bindContextKey(TestingContextKeys.hasPerTestCoverage, contextKeyService, (reader) => !!fileCoverage.read(reader)?.file.perTestData?.size));
        this._register(autorun((reader) => {
            const c = fileCoverage.read(reader);
            if (c) {
                this.apply(editor.getModel(), c.file, c.testId, coverage.showInline.read(reader));
            }
            else {
                this.clear();
            }
        }));
        const toolbarEnabled = observableConfigValue("testing.coverageToolbarEnabled" /* TestingConfigKeys.CoverageToolbarEnabled */, true, configurationService);
        this._register(autorun((reader) => {
            const c = fileCoverage.read(reader);
            if (c && toolbarEnabled.read(reader)) {
                this.summaryWidget.value.setCoverage(c.file, c.testId);
            }
            else {
                this.summaryWidget.rawValue?.clearCoverage();
            }
        }));
        this._register(autorun((reader) => {
            const c = fileCoverage.read(reader);
            if (c) {
                const evt = configObs.read(reader);
                if (evt?.hasChanged(68 /* EditorOption.lineHeight */) !== false) {
                    this.updateEditorStyles();
                }
            }
        }));
        this._register(editor.onMouseMove((e) => {
            const model = editor.getModel();
            if (e.target.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */ && model) {
                this.hoverLineNumber(editor.getModel());
            }
            else if (coverage.showInline.get() &&
                e.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ &&
                model) {
                this.hoverInlineDecoration(model, e.target.position);
            }
            else {
                this.hoveredStore.clear();
            }
        }));
        this._register(editor.onWillChangeModel(() => {
            const model = editor.getModel();
            if (!this.details || !model) {
                return;
            }
            // Decorations adjust to local changes made in-editor, keep them synced in case the file is reopened:
            for (const decoration of model.getAllDecorations()) {
                const own = this.decorationIds.get(decoration.id);
                if (own) {
                    own.detail.range = decoration.range;
                }
            }
        }));
    }
    updateEditorStyles() {
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        const { style } = this.editor.getContainerDomNode();
        style.setProperty('--vscode-testing-coverage-lineHeight', `${lineHeight}px`);
    }
    hoverInlineDecoration(model, position) {
        const allDecorations = model.getDecorationsInRange(Range.fromPositions(position));
        const decoration = mapFindFirst(allDecorations, ({ id }) => this.decorationIds.has(id) ? { id, deco: this.decorationIds.get(id) } : undefined);
        if (decoration === this.hoveredSubject) {
            return;
        }
        this.hoveredStore.clear();
        this.hoveredSubject = decoration;
        if (!decoration) {
            return;
        }
        model.changeDecorations((e) => {
            e.changeDecorationOptions(decoration.id, {
                ...decoration.deco.options,
                className: `${decoration.deco.options.className} coverage-deco-hovered`,
            });
        });
        this.hoveredStore.add(toDisposable(() => {
            this.hoveredSubject = undefined;
            model.changeDecorations((e) => {
                e.changeDecorationOptions(decoration.id, decoration.deco.options);
            });
        }));
    }
    hoverLineNumber(model) {
        if (this.hoveredSubject === 'lineNo' || !this.details || this.coverage.showInline.get()) {
            return;
        }
        this.hoveredStore.clear();
        this.hoveredSubject = 'lineNo';
        model.changeDecorations((e) => {
            for (const [id, decoration] of this.decorationIds) {
                const { applyHoverOptions, options } = decoration;
                const dup = { ...options };
                applyHoverOptions(dup);
                e.changeDecorationOptions(id, dup);
            }
        });
        this.hoveredStore.add(this.editor.onMouseLeave(() => {
            this.hoveredStore.clear();
        }));
        this.hoveredStore.add(toDisposable(() => {
            this.hoveredSubject = undefined;
            model.changeDecorations((e) => {
                for (const [id, decoration] of this.decorationIds) {
                    e.changeDecorationOptions(id, decoration.options);
                }
            });
        }));
    }
    async apply(model, coverage, testId, showInlineByDefault) {
        const details = (this.details = await this.loadDetails(coverage, testId, model));
        if (!details) {
            return this.clear();
        }
        this.displayedStore.clear();
        model.changeDecorations((e) => {
            for (const detailRange of details.ranges) {
                const { metadata: { detail, description }, range, primary, } = detailRange;
                if (detail.type === 2 /* DetailType.Branch */) {
                    const hits = detail.detail.branches[detail.branch].count;
                    const cls = hits ? CLASS_HIT : CLASS_MISS;
                    // don't bother showing the miss indicator if the condition wasn't executed at all:
                    const showMissIndicator = !hits && range.isEmpty() && detail.detail.branches.some((b) => b.count);
                    const options = {
                        showIfCollapsed: showMissIndicator, // only avoid collapsing if we want to show the miss indicator
                        description: 'coverage-gutter',
                        lineNumberClassName: `coverage-deco-gutter ${cls}`,
                    };
                    const applyHoverOptions = (target) => {
                        target.hoverMessage = description;
                        if (showMissIndicator) {
                            target.after = {
                                content: '\xa0'.repeat(BRANCH_MISS_INDICATOR_CHARS), // nbsp
                                inlineClassName: `coverage-deco-branch-miss-indicator ${ThemeIcon.asClassName(testingCoverageMissingBranch)}`,
                                inlineClassNameAffectsLetterSpacing: true,
                                cursorStops: InjectedTextCursorStops.None,
                            };
                        }
                        else {
                            target.className = `coverage-deco-inline ${cls}`;
                            if (primary && typeof hits === 'number') {
                                target.before = countBadge(hits);
                            }
                        }
                    };
                    if (showInlineByDefault) {
                        applyHoverOptions(options);
                    }
                    this.decorationIds.set(e.addDecoration(range, options), {
                        options,
                        applyHoverOptions,
                        detail: detailRange,
                    });
                }
                else if (detail.type === 1 /* DetailType.Statement */) {
                    const cls = detail.count ? CLASS_HIT : CLASS_MISS;
                    const options = {
                        showIfCollapsed: false,
                        description: 'coverage-inline',
                        lineNumberClassName: `coverage-deco-gutter ${cls}`,
                    };
                    const applyHoverOptions = (target) => {
                        target.className = `coverage-deco-inline ${cls}`;
                        target.hoverMessage = description;
                        if (primary && typeof detail.count === 'number') {
                            target.before = countBadge(detail.count);
                        }
                    };
                    if (showInlineByDefault) {
                        applyHoverOptions(options);
                    }
                    this.decorationIds.set(e.addDecoration(range, options), {
                        options,
                        applyHoverOptions,
                        detail: detailRange,
                    });
                }
            }
        });
        this.displayedStore.add(toDisposable(() => {
            model.changeDecorations((e) => {
                for (const decoration of this.decorationIds.keys()) {
                    e.removeDecoration(decoration);
                }
                this.decorationIds.clear();
            });
        }));
    }
    clear() {
        this.loadingCancellation?.cancel();
        this.loadingCancellation = undefined;
        this.displayedStore.clear();
        this.hoveredStore.clear();
    }
    async loadDetails(coverage, testId, textModel) {
        const cts = (this.loadingCancellation = new CancellationTokenSource());
        this.displayedStore.add(this.loadingCancellation);
        try {
            const details = testId
                ? await coverage.detailsForTest(testId, this.loadingCancellation.token)
                : await coverage.details(this.loadingCancellation.token);
            if (cts.token.isCancellationRequested) {
                return;
            }
            return new CoverageDetailsModel(details, textModel);
        }
        catch (e) {
            this.log.error('Error loading coverage details', e);
        }
        return undefined;
    }
};
CodeCoverageDecorations = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITestCoverageService),
    __param(3, IConfigurationService),
    __param(4, ILogService),
    __param(5, IContextKeyService)
], CodeCoverageDecorations);
export { CodeCoverageDecorations };
const countBadge = (count) => {
    if (count === 0) {
        return undefined;
    }
    return {
        content: `${count > 99 ? '99+' : count}x`,
        cursorStops: InjectedTextCursorStops.None,
        inlineClassName: `coverage-deco-inline-count`,
        inlineClassNameAffectsLetterSpacing: true,
    };
};
export class CoverageDetailsModel {
    constructor(details, textModel) {
        this.details = details;
        this.ranges = [];
        //#region decoration generation
        // Coverage from a provider can have a range that contains smaller ranges,
        // such as a function declaration that has nested statements. In this we
        // make sequential, non-overlapping ranges for each detail for display in
        // the editor without ugly overlaps.
        const detailRanges = details.map((detail) => ({
            range: tidyLocation(detail.location),
            primary: true,
            metadata: { detail, description: this.describe(detail, textModel) },
        }));
        for (const { range, metadata: { detail }, } of detailRanges) {
            if (detail.type === 1 /* DetailType.Statement */ && detail.branches) {
                for (let i = 0; i < detail.branches.length; i++) {
                    const branch = { type: 2 /* DetailType.Branch */, branch: i, detail };
                    detailRanges.push({
                        range: tidyLocation(detail.branches[i].location || Range.fromPositions(range.getEndPosition())),
                        primary: true,
                        metadata: {
                            detail: branch,
                            description: this.describe(branch, textModel),
                        },
                    });
                }
            }
        }
        // type ordering is done so that function declarations come first on a tie so that
        // single-statement functions (`() => foo()` for example) get inline decorations.
        detailRanges.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range) ||
            a.metadata.detail.type - b.metadata.detail.type);
        const stack = [];
        const result = (this.ranges = []);
        const pop = () => {
            const next = stack.pop();
            const prev = stack[stack.length - 1];
            if (prev) {
                prev.range = prev.range.setStartPosition(next.range.endLineNumber, next.range.endColumn);
            }
            result.push(next);
        };
        for (const item of detailRanges) {
            // 1. Ensure that any ranges in the stack that ended before this are flushed
            const start = item.range.getStartPosition();
            while (stack[stack.length - 1]?.range.containsPosition(start) === false) {
                pop();
            }
            // Empty ranges (usually representing missing branches) can be added
            // without worry about overlay.
            if (item.range.isEmpty()) {
                result.push(item);
                continue;
            }
            // 2. Take the last (overlapping) item in the stack, push range before
            // the `item.range` into the result and modify its stack to push the start
            // until after the `item.range` ends.
            const prev = stack[stack.length - 1];
            if (prev) {
                const primary = prev.primary;
                const si = prev.range.setEndPosition(start.lineNumber, start.column);
                prev.range = prev.range.setStartPosition(item.range.endLineNumber, item.range.endColumn);
                prev.primary = false;
                // discard the previous range if it became empty, e.g. a nested statement
                if (prev.range.isEmpty()) {
                    stack.pop();
                }
                result.push({ range: si, primary, metadata: prev.metadata });
            }
            stack.push(item);
        }
        while (stack.length) {
            pop();
        }
        //#endregion
    }
    /** Gets the markdown description for the given detail */
    describe(detail, model) {
        if (detail.type === 0 /* DetailType.Declaration */) {
            return namedDetailLabel(detail.name, detail);
        }
        else if (detail.type === 1 /* DetailType.Statement */) {
            const text = wrapName(model.getValueInRange(tidyLocation(detail.location)).trim() || `<empty statement>`);
            if (detail.branches?.length) {
                const covered = detail.branches.filter((b) => !!b.count).length;
                return new MarkdownString().appendMarkdown(localize('coverage.branches', '{0} of {1} of branches in {2} were covered.', covered, detail.branches.length, text));
            }
            else {
                return namedDetailLabel(text, detail);
            }
        }
        else if (detail.type === 2 /* DetailType.Branch */) {
            const text = wrapName(model.getValueInRange(tidyLocation(detail.detail.location)).trim() || `<empty statement>`);
            const { count, label } = detail.detail.branches[detail.branch];
            const label2 = label ? wrapInBackticks(label) : `#${detail.branch + 1}`;
            if (!count) {
                return new MarkdownString().appendMarkdown(localize('coverage.branchNotCovered', 'Branch {0} in {1} was not covered.', label2, text));
            }
            else if (count === true) {
                return new MarkdownString().appendMarkdown(localize('coverage.branchCoveredYes', 'Branch {0} in {1} was executed.', label2, text));
            }
            else {
                return new MarkdownString().appendMarkdown(localize('coverage.branchCovered', 'Branch {0} in {1} was executed {2} time(s).', label2, text, count));
            }
        }
        assertNever(detail);
    }
}
function namedDetailLabel(name, detail) {
    return new MarkdownString().appendMarkdown(!detail.count // 0 or false
        ? localize('coverage.declExecutedNo', '`{0}` was not executed.', name)
        : typeof detail.count === 'number'
            ? localize('coverage.declExecutedCount', '`{0}` was executed {1} time(s).', name, detail.count)
            : localize('coverage.declExecutedYes', '`{0}` was executed.', name));
}
// 'tidies' the range by normalizing it into a range and removing leading
// and trailing whitespace.
function tidyLocation(location) {
    if (location instanceof Position) {
        return Range.fromPositions(location, new Position(location.lineNumber, 0x7fffffff));
    }
    return location;
}
function wrapInBackticks(str) {
    return '`' + str.replace(/[\n\r`]/g, '') + '`';
}
function wrapName(functionNameOrCode) {
    if (functionNameOrCode.length > 50) {
        functionNameOrCode = functionNameOrCode.slice(0, 40) + '...';
    }
    return wrapInBackticks(functionNameOrCode);
}
let CoverageToolbarWidget = class CoverageToolbarWidget extends Disposable {
    constructor(editor, configurationService, contextMenuService, testService, keybindingService, commandService, coverage, instaService) {
        super();
        this.editor = editor;
        this.configurationService = configurationService;
        this.contextMenuService = contextMenuService;
        this.testService = testService;
        this.keybindingService = keybindingService;
        this.commandService = commandService;
        this.coverage = coverage;
        this.registered = false;
        this.isRunning = false;
        this.showStore = this._register(new DisposableStore());
        this._domNode = dom.h('div.coverage-summary-widget', [
            dom.h('div', [dom.h('span.bars@bars'), dom.h('span.toolbar@toolbar')]),
        ]);
        this.bars = this._register(instaService.createInstance(ManagedTestCoverageBars, {
            compact: false,
            overall: false,
            container: this._domNode.bars,
        }));
        this.actionBar = this._register(instaService.createInstance(ActionBar, this._domNode.toolbar, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            actionViewItemProvider: (action, options) => {
                const vm = new CodiconActionViewItem(undefined, action, options);
                if (action instanceof ActionWithIcon) {
                    vm.themeIcon = action.icon;
                }
                return vm;
            },
        }));
        this._register(autorun((reader) => {
            coverage.showInline.read(reader);
            this.setActions();
        }));
        this._register(dom.addStandardDisposableListener(this._domNode.root, dom.EventType.CONTEXT_MENU, (e) => {
            this.contextMenuService.showContextMenu({
                menuId: MenuId.StickyScrollContext,
                getAnchor: () => e,
            });
        }));
    }
    /** @inheritdoc */
    getId() {
        return 'coverage-summary-widget';
    }
    /** @inheritdoc */
    getDomNode() {
        return this._domNode.root;
    }
    /** @inheritdoc */
    getPosition() {
        return {
            preference: 2 /* OverlayWidgetPositionPreference.TOP_CENTER */,
            stackOridinal: 9,
        };
    }
    clearCoverage() {
        this.current = undefined;
        this.bars.setCoverageInfo(undefined);
        this.hide();
    }
    setCoverage(coverage, testId) {
        this.current = { coverage, testId };
        this.bars.setCoverageInfo(coverage);
        if (!coverage) {
            this.hide();
        }
        else {
            this.setActions();
            this.show();
        }
    }
    setActions() {
        this.actionBar.clear();
        const current = this.current;
        if (!current) {
            return;
        }
        const toggleAction = new ActionWithIcon('toggleInline', this.coverage.showInline.get()
            ? localize('testing.hideInlineCoverage', 'Hide Inline Coverage')
            : localize('testing.showInlineCoverage', 'Show Inline Coverage'), testingCoverageReport, undefined, () => this.coverage.showInline.set(!this.coverage.showInline.get(), undefined));
        const kb = this.keybindingService.lookupKeybinding(TOGGLE_INLINE_COMMAND_ID);
        if (kb) {
            toggleAction.tooltip = `${TOGGLE_INLINE_COMMAND_TEXT} (${kb.getLabel()})`;
        }
        this.actionBar.push(toggleAction);
        if (current.testId) {
            const testItem = current.coverage.fromResult.getTestById(current.testId.toString());
            assert(!!testItem, 'got coverage for an unreported test');
            this.actionBar.push(new ActionWithIcon('perTestFilter', coverUtils.labels.showingFilterFor(testItem.label), testingFilterIcon, undefined, () => this.commandService.executeCommand("testing.coverageFilterToTestInEditor" /* TestCommandId.CoverageFilterToTestInEditor */, this.current, this.editor)));
        }
        else if (current.coverage.perTestData?.size) {
            this.actionBar.push(new ActionWithIcon('perTestFilter', localize('testing.coverageForTestAvailable', '{0} test(s) ran code in this file', current.coverage.perTestData.size), testingFilterIcon, undefined, () => this.commandService.executeCommand("testing.coverageFilterToTestInEditor" /* TestCommandId.CoverageFilterToTestInEditor */, this.current, this.editor)));
        }
        this.actionBar.push(new ActionWithIcon('rerun', localize('testing.rerun', 'Rerun'), testingRerunIcon, !this.isRunning, () => this.rerunTest()));
    }
    show() {
        if (this.registered) {
            return;
        }
        this.registered = true;
        let viewZoneId;
        const ds = this.showStore;
        this.editor.addOverlayWidget(this);
        this.editor.changeViewZones((accessor) => {
            viewZoneId = accessor.addZone({
                // make space for the widget
                afterLineNumber: 0,
                afterColumn: 0,
                domNode: document.createElement('div'),
                heightInPx: 30,
                ordinal: -1, // show before code lenses
            });
        });
        ds.add(toDisposable(() => {
            this.registered = false;
            this.editor.removeOverlayWidget(this);
            this.editor.changeViewZones((accessor) => {
                accessor.removeZone(viewZoneId);
            });
        }));
        ds.add(this.configurationService.onDidChangeConfiguration((e) => {
            if (this.current &&
                (e.affectsConfiguration("testing.coverageBarThresholds" /* TestingConfigKeys.CoverageBarThresholds */) ||
                    e.affectsConfiguration("testing.displayedCoveragePercent" /* TestingConfigKeys.CoveragePercent */))) {
                this.setCoverage(this.current.coverage, this.current.testId);
            }
        }));
    }
    rerunTest() {
        const current = this.current;
        if (current) {
            this.isRunning = true;
            this.setActions();
            this.testService.runResolvedTests(current.coverage.fromResult.request).finally(() => {
                this.isRunning = false;
                this.setActions();
            });
        }
    }
    hide() {
        this.showStore.clear();
    }
};
CoverageToolbarWidget = __decorate([
    __param(1, IConfigurationService),
    __param(2, IContextMenuService),
    __param(3, ITestService),
    __param(4, IKeybindingService),
    __param(5, ICommandService),
    __param(6, ITestCoverageService),
    __param(7, IInstantiationService)
], CoverageToolbarWidget);
registerAction2(class ToggleInlineCoverage extends Action2 {
    constructor() {
        super({
            id: TOGGLE_INLINE_COMMAND_ID,
            // note: ideally this would be "show inline", but the command palette does
            // not use the 'toggled' titles, so we need to make this generic.
            title: localize2('coverage.toggleInline', 'Toggle Inline Coverage'),
            category: Categories.Test,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */),
            },
            toggled: {
                condition: TestingContextKeys.inlineCoverageEnabled,
                title: localize('coverage.hideInline', 'Hide Inline Coverage'),
            },
            icon: testingCoverageReport,
            menu: [
                { id: MenuId.CommandPalette, when: TestingContextKeys.isTestCoverageOpen },
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(TestingContextKeys.isTestCoverageOpen, TestingContextKeys.coverageToolbarEnabled.notEqualsTo(true)),
                    group: 'navigation',
                },
            ],
        });
    }
    run(accessor) {
        const coverage = accessor.get(ITestCoverageService);
        coverage.showInline.set(!coverage.showInline.get(), undefined);
    }
});
registerAction2(class ToggleCoverageToolbar extends Action2 {
    constructor() {
        super({
            id: "testing.coverageToggleToolbar" /* TestCommandId.CoverageToggleToolbar */,
            title: localize2('testing.toggleToolbarTitle', 'Test Coverage Toolbar'),
            metadata: {
                description: localize2('testing.toggleToolbarDesc', 'Toggle the sticky coverage bar in the editor.'),
            },
            category: Categories.Test,
            toggled: {
                condition: TestingContextKeys.coverageToolbarEnabled,
            },
            menu: [
                { id: MenuId.CommandPalette, when: TestingContextKeys.isTestCoverageOpen },
                { id: MenuId.StickyScrollContext, when: TestingContextKeys.isTestCoverageOpen },
                {
                    id: MenuId.EditorTitle,
                    when: TestingContextKeys.isTestCoverageOpen,
                    group: 'coverage@1',
                },
            ],
        });
    }
    run(accessor) {
        const config = accessor.get(IConfigurationService);
        const value = getTestingConfiguration(config, "testing.coverageToolbarEnabled" /* TestingConfigKeys.CoverageToolbarEnabled */);
        config.updateValue("testing.coverageToolbarEnabled" /* TestingConfigKeys.CoverageToolbarEnabled */, !value);
    }
});
registerAction2(class FilterCoverageToTestInEditor extends Action2 {
    constructor() {
        super({
            id: "testing.coverageFilterToTestInEditor" /* TestCommandId.CoverageFilterToTestInEditor */,
            title: localize2('testing.filterActionLabel', 'Filter Coverage to Test'),
            category: Categories.Test,
            icon: Codicon.filter,
            toggled: {
                icon: Codicon.filterFilled,
                condition: TestingContextKeys.isCoverageFilteredToTest,
            },
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(TestingContextKeys.isTestCoverageOpen, TestingContextKeys.coverageToolbarEnabled.notEqualsTo(true), TestingContextKeys.hasPerTestCoverage, ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID)),
                    group: 'navigation',
                },
            ],
        });
    }
    run(accessor, coverageOrUri, editor) {
        const testCoverageService = accessor.get(ITestCoverageService);
        const quickInputService = accessor.get(IQuickInputService);
        const activeEditor = isCodeEditor(editor)
            ? editor
            : accessor.get(ICodeEditorService).getActiveCodeEditor();
        let coverage;
        if (coverageOrUri instanceof FileCoverage) {
            coverage = coverageOrUri;
        }
        else if (isUriComponents(coverageOrUri)) {
            coverage = testCoverageService.selected.get()?.getUri(URI.from(coverageOrUri));
        }
        else {
            const uri = activeEditor?.getModel()?.uri;
            coverage = uri && testCoverageService.selected.get()?.getUri(uri);
        }
        if (!coverage || !coverage.perTestData?.size) {
            return;
        }
        const tests = [...coverage.perTestData].map(TestId.fromString);
        const commonPrefix = TestId.getLengthOfCommonPrefix(tests.length, (i) => tests[i]);
        const result = coverage.fromResult;
        const previousSelection = testCoverageService.filterToTest.get();
        const items = [
            { label: coverUtils.labels.allTests, testId: undefined },
            { type: 'separator' },
            ...tests.map((id) => ({
                label: coverUtils.getLabelForItem(result, id, commonPrefix),
                testId: id,
            })),
        ];
        // These handle the behavior that reveals the start of coverage when the
        // user picks from the quickpick. Scroll position is restored if the user
        // exits without picking an item, or picks "all tets".
        const scrollTop = activeEditor?.getScrollTop() || 0;
        const revealScrollCts = new MutableDisposable();
        quickInputService
            .pick(items, {
            activeItem: items.find((item) => 'item' in item && item.item === coverage),
            placeHolder: coverUtils.labels.pickShowCoverage,
            onDidFocus: (entry) => {
                if (!entry.testId) {
                    revealScrollCts.clear();
                    activeEditor?.setScrollTop(scrollTop);
                    testCoverageService.filterToTest.set(undefined, undefined);
                }
                else {
                    const cts = (revealScrollCts.value = new CancellationTokenSource());
                    coverage.detailsForTest(entry.testId, cts.token).then((details) => {
                        const first = details.find((d) => d.type === 1 /* DetailType.Statement */);
                        if (!cts.token.isCancellationRequested && first) {
                            activeEditor?.revealLineNearTop(first.location instanceof Position
                                ? first.location.lineNumber
                                : first.location.startLineNumber);
                        }
                    }, () => {
                        /* ignored */
                    });
                    testCoverageService.filterToTest.set(entry.testId, undefined);
                }
            },
        })
            .then((selected) => {
            if (!selected) {
                activeEditor?.setScrollTop(scrollTop);
            }
            revealScrollCts.dispose();
            testCoverageService.filterToTest.set(selected ? selected.testId : previousSelection, undefined);
        });
    }
});
class ActionWithIcon extends Action {
    constructor(id, title, icon, enabled, run) {
        super(id, title, undefined, enabled, run);
        this.icon = icon;
    }
}
class CodiconActionViewItem extends ActionViewItem {
    updateLabel() {
        if (this.options.label && this.label && this.themeIcon) {
            dom.reset(this.label, renderIcon(this.themeIcon), this.action.label);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNvdmVyYWdlRGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvY29kZUNvdmVyYWdlRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLFNBQVMsRUFBc0IsTUFBTSxvREFBb0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDaEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFDL0UsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFB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
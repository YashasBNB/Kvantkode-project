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
var XtermTerminal_1;
import * as dom from '../../../../../base/browser/dom.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { ITerminalLogService, } from '../../../../../platform/terminal/common/terminal.js';
import { ITerminalConfigurationService, } from '../terminal.js';
import { LogLevel } from '../../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { MarkNavigationAddon } from './markNavigationAddon.js';
import { localize } from '../../../../../nls.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { PANEL_BACKGROUND } from '../../../../common/theme.js';
import { TERMINAL_FOREGROUND_COLOR, TERMINAL_BACKGROUND_COLOR, TERMINAL_CURSOR_FOREGROUND_COLOR, TERMINAL_CURSOR_BACKGROUND_COLOR, ansiColorIdentifiers, TERMINAL_SELECTION_BACKGROUND_COLOR, TERMINAL_FIND_MATCH_BACKGROUND_COLOR, TERMINAL_FIND_MATCH_HIGHLIGHT_BACKGROUND_COLOR, TERMINAL_FIND_MATCH_BORDER_COLOR, TERMINAL_OVERVIEW_RULER_FIND_MATCH_FOREGROUND_COLOR, TERMINAL_FIND_MATCH_HIGHLIGHT_BORDER_COLOR, TERMINAL_OVERVIEW_RULER_CURSOR_FOREGROUND_COLOR, TERMINAL_SELECTION_FOREGROUND_COLOR, TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR, TERMINAL_OVERVIEW_RULER_BORDER_COLOR, } from '../../common/terminalColorRegistry.js';
import { ShellIntegrationAddon } from '../../../../../platform/terminal/common/xterm/shellIntegrationAddon.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { DecorationAddon } from './decorationAddon.js';
import { Emitter } from '../../../../../base/common/event.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { TerminalContextKeys } from '../../common/terminalContextKey.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { debounce } from '../../../../../base/common/decorators.js';
import { MouseWheelClassifier } from '../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { StandardWheelEvent } from '../../../../../base/browser/mouseEvent.js';
import { ILayoutService } from '../../../../../platform/layout/browser/layoutService.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { scrollbarSliderActiveBackground, scrollbarSliderBackground, scrollbarSliderHoverBackground, } from '../../../../../platform/theme/common/colorRegistry.js';
import { XtermAddonImporter } from './xtermAddonImporter.js';
import { equals } from '../../../../../base/common/objects.js';
var RenderConstants;
(function (RenderConstants) {
    RenderConstants[RenderConstants["SmoothScrollDuration"] = 125] = "SmoothScrollDuration";
})(RenderConstants || (RenderConstants = {}));
function getFullBufferLineAsString(lineIndex, buffer) {
    let line = buffer.getLine(lineIndex);
    if (!line) {
        return { lineData: undefined, lineIndex };
    }
    let lineData = line.translateToString(true);
    while (lineIndex > 0 && line.isWrapped) {
        line = buffer.getLine(--lineIndex);
        if (!line) {
            break;
        }
        lineData = line.translateToString(false) + lineData;
    }
    return { lineData, lineIndex };
}
/**
 * Wraps the xterm object with additional functionality. Interaction with the backing process is out
 * of the scope of this class.
 */
let XtermTerminal = class XtermTerminal extends Disposable {
    static { XtermTerminal_1 = this; }
    static { this._suggestedRendererType = undefined; }
    get lastInputEvent() {
        return this._lastInputEvent;
    }
    get progressState() {
        return this._progressState;
    }
    get findResult() {
        return this._lastFindResult;
    }
    get isStdinDisabled() {
        return !!this.raw.options.disableStdin;
    }
    get isGpuAccelerated() {
        return !!this._webglAddon;
    }
    get markTracker() {
        return this._markNavigationAddon;
    }
    get shellIntegration() {
        return this._shellIntegrationAddon;
    }
    get decorationAddon() {
        return this._decorationAddon;
    }
    get textureAtlas() {
        const canvas = this._webglAddon?.textureAtlas;
        if (!canvas) {
            return undefined;
        }
        return createImageBitmap(canvas);
    }
    get isFocused() {
        if (!this.raw.element) {
            return false;
        }
        return dom.isAncestorOfActiveElement(this.raw.element);
    }
    /**
     * @param xtermCtor The xterm.js constructor, this is passed in so it can be fetched lazily
     * outside of this class such that {@link raw} is not nullable.
     */
    constructor(xtermCtor, options, _configurationService, _instantiationService, _logService, _notificationService, _themeService, _telemetryService, _terminalConfigurationService, _clipboardService, contextKeyService, _accessibilitySignalService, layoutService) {
        super();
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._notificationService = _notificationService;
        this._themeService = _themeService;
        this._telemetryService = _telemetryService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._clipboardService = _clipboardService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._isPhysicalMouseWheel = MouseWheelClassifier.INSTANCE.isPhysicalMouseWheel();
        this._progressState = { state: 0, value: 0 };
        this._ligaturesAddon = this._register(new MutableDisposable());
        this._attachedDisposables = this._register(new DisposableStore());
        this._onDidRequestRunCommand = this._register(new Emitter());
        this.onDidRequestRunCommand = this._onDidRequestRunCommand.event;
        this._onDidRequestCopyAsHtml = this._register(new Emitter());
        this.onDidRequestCopyAsHtml = this._onDidRequestCopyAsHtml.event;
        this._onDidRequestRefreshDimensions = this._register(new Emitter());
        this.onDidRequestRefreshDimensions = this._onDidRequestRefreshDimensions.event;
        this._onDidChangeFindResults = this._register(new Emitter());
        this.onDidChangeFindResults = this._onDidChangeFindResults.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeFocus = this._register(new Emitter());
        this.onDidChangeFocus = this._onDidChangeFocus.event;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChangeProgress = this._register(new Emitter());
        this.onDidChangeProgress = this._onDidChangeProgress.event;
        this._xtermAddonLoader = options.xtermAddonImporter ?? new XtermAddonImporter();
        this._xtermColorProvider = options.xtermColorProvider;
        this._capabilities = options.capabilities;
        const font = this._terminalConfigurationService.getFont(dom.getActiveWindow(), undefined, true);
        const config = this._terminalConfigurationService.config;
        const editorOptions = this._configurationService.getValue('editor');
        this.raw = this._register(new xtermCtor({
            allowProposedApi: true,
            cols: options.cols,
            rows: options.rows,
            documentOverride: layoutService.mainContainer.ownerDocument,
            altClickMovesCursor: config.altClickMovesCursor && editorOptions.multiCursorModifier === 'alt',
            scrollback: config.scrollback,
            theme: this.getXtermTheme(),
            drawBoldTextInBrightColors: config.drawBoldTextInBrightColors,
            fontFamily: font.fontFamily,
            fontWeight: config.fontWeight,
            fontWeightBold: config.fontWeightBold,
            fontSize: font.fontSize,
            letterSpacing: font.letterSpacing,
            lineHeight: font.lineHeight,
            logLevel: vscodeToXtermLogLevel(this._logService.getLevel()),
            logger: this._logService,
            minimumContrastRatio: config.minimumContrastRatio,
            tabStopWidth: config.tabStopWidth,
            cursorBlink: config.cursorBlinking,
            cursorStyle: vscodeToXtermCursorStyle(config.cursorStyle),
            cursorInactiveStyle: vscodeToXtermCursorStyle(config.cursorStyleInactive),
            cursorWidth: config.cursorWidth,
            macOptionIsMeta: config.macOptionIsMeta,
            macOptionClickForcesSelection: config.macOptionClickForcesSelection,
            rightClickSelectsWord: config.rightClickBehavior === 'selectWord',
            fastScrollModifier: 'alt',
            fastScrollSensitivity: config.fastScrollSensitivity,
            scrollSensitivity: config.mouseWheelScrollSensitivity,
            wordSeparator: config.wordSeparators,
            overviewRuler: {
                width: 14,
                showTopBorder: true,
            },
            ignoreBracketedPasteMode: config.ignoreBracketedPasteMode,
            rescaleOverlappingGlyphs: config.rescaleOverlappingGlyphs,
            windowOptions: {
                getWinSizePixels: true,
                getCellSizePixels: true,
                getWinSizeChars: true,
            },
        }));
        this._updateSmoothScrolling();
        this._core = this.raw._core;
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */)) {
                XtermTerminal_1._suggestedRendererType = undefined;
            }
            if (e.affectsConfiguration('terminal.integrated') ||
                e.affectsConfiguration('editor.fastScrollSensitivity') ||
                e.affectsConfiguration('editor.mouseWheelScrollSensitivity') ||
                e.affectsConfiguration('editor.multiCursorModifier')) {
                this.updateConfig();
            }
            if (e.affectsConfiguration("terminal.integrated.unicodeVersion" /* TerminalSettingId.UnicodeVersion */)) {
                this._updateUnicodeVersion();
            }
            if (e.affectsConfiguration("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */)) {
                this._updateTheme();
            }
        }));
        this._register(this._themeService.onDidColorThemeChange((theme) => this._updateTheme(theme)));
        this._register(this._logService.onDidChangeLogLevel((e) => (this.raw.options.logLevel = vscodeToXtermLogLevel(e))));
        // Refire events
        this._register(this.raw.onSelectionChange(() => {
            this._onDidChangeSelection.fire();
            if (this.isFocused) {
                this._anyFocusedTerminalHasSelection.set(this.raw.hasSelection());
            }
        }));
        this._register(this.raw.onData((e) => (this._lastInputEvent = e)));
        // Load addons
        this._updateUnicodeVersion();
        this._markNavigationAddon = this._instantiationService.createInstance(MarkNavigationAddon, options.capabilities);
        this.raw.loadAddon(this._markNavigationAddon);
        this._decorationAddon = this._instantiationService.createInstance(DecorationAddon, this._capabilities);
        this._register(this._decorationAddon.onDidRequestRunCommand((e) => this._onDidRequestRunCommand.fire(e)));
        this._register(this._decorationAddon.onDidRequestCopyAsHtml((e) => this._onDidRequestCopyAsHtml.fire(e)));
        this.raw.loadAddon(this._decorationAddon);
        this._shellIntegrationAddon = new ShellIntegrationAddon(options.shellIntegrationNonce ?? '', options.disableShellIntegrationReporting, this._telemetryService, this._logService);
        this.raw.loadAddon(this._shellIntegrationAddon);
        this._xtermAddonLoader.importAddon('clipboard').then((ClipboardAddon) => {
            if (this._store.isDisposed) {
                return;
            }
            this._clipboardAddon = this._instantiationService.createInstance(ClipboardAddon, undefined, {
                async readText(type) {
                    return _clipboardService.readText(type === 'p' ? 'selection' : 'clipboard');
                },
                async writeText(type, text) {
                    return _clipboardService.writeText(text, type === 'p' ? 'selection' : 'clipboard');
                },
            });
            this.raw.loadAddon(this._clipboardAddon);
        });
        this._xtermAddonLoader.importAddon('progress').then((ProgressAddon) => {
            if (this._store.isDisposed) {
                return;
            }
            const progressAddon = this._instantiationService.createInstance(ProgressAddon);
            this.raw.loadAddon(progressAddon);
            const updateProgress = () => {
                if (!equals(this._progressState, progressAddon.progress)) {
                    this._progressState = progressAddon.progress;
                    this._onDidChangeProgress.fire(this._progressState);
                }
            };
            this._register(progressAddon.onChange(() => updateProgress()));
            updateProgress();
            const commandDetection = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (commandDetection) {
                this._register(commandDetection.onCommandFinished(() => (progressAddon.progress = { state: 0, value: 0 })));
            }
            else {
                const disposable = this._capabilities.onDidAddCapability((e) => {
                    if (e.id === 2 /* TerminalCapability.CommandDetection */) {
                        this._register(e.capability.onCommandFinished(() => (progressAddon.progress = { state: 0, value: 0 })));
                        this._store.delete(disposable);
                    }
                });
                this._store.add(disposable);
            }
        });
        this._anyTerminalFocusContextKey = TerminalContextKeys.focusInAny.bindTo(contextKeyService);
        this._anyFocusedTerminalHasSelection =
            TerminalContextKeys.textSelectedInFocused.bindTo(contextKeyService);
    }
    *getBufferReverseIterator() {
        for (let i = this.raw.buffer.active.length; i >= 0; i--) {
            const { lineData, lineIndex } = getFullBufferLineAsString(i, this.raw.buffer.active);
            if (lineData) {
                i = lineIndex;
                yield lineData;
            }
        }
    }
    async getContentsAsHtml() {
        if (!this._serializeAddon) {
            const Addon = await this._xtermAddonLoader.importAddon('serialize');
            this._serializeAddon = new Addon();
            this.raw.loadAddon(this._serializeAddon);
        }
        return this._serializeAddon.serializeAsHTML();
    }
    async getSelectionAsHtml(command) {
        if (!this._serializeAddon) {
            const Addon = await this._xtermAddonLoader.importAddon('serialize');
            this._serializeAddon = new Addon();
            this.raw.loadAddon(this._serializeAddon);
        }
        if (command) {
            const length = command.getOutput()?.length;
            const row = command.marker?.line;
            if (!length || !row) {
                throw new Error(`No row ${row} or output length ${length} for command ${command}`);
            }
            this.raw.select(0, row + 1, length - Math.floor(length / this.raw.cols));
        }
        const result = this._serializeAddon.serializeAsHTML({ onlySelection: true });
        if (command) {
            this.raw.clearSelection();
        }
        return result;
    }
    attachToElement(container, partialOptions) {
        const options = { enableGpu: true, ...partialOptions };
        if (!this._attached) {
            this.raw.open(container);
        }
        // TODO: Move before open so the DOM renderer doesn't initialize
        if (options.enableGpu) {
            if (this._shouldLoadWebgl()) {
                this._enableWebglRenderer();
            }
        }
        if (!this.raw.element || !this.raw.textarea) {
            throw new Error('xterm elements not set after open');
        }
        const ad = this._attachedDisposables;
        ad.clear();
        ad.add(dom.addDisposableListener(this.raw.textarea, 'focus', () => this._setFocused(true)));
        ad.add(dom.addDisposableListener(this.raw.textarea, 'blur', () => this._setFocused(false)));
        ad.add(dom.addDisposableListener(this.raw.textarea, 'focusout', () => this._setFocused(false)));
        // Track wheel events in mouse wheel classifier and update smoothScrolling when it changes
        // as it must be disabled when a trackpad is used
        ad.add(dom.addDisposableListener(this.raw.element, dom.EventType.MOUSE_WHEEL, (e) => {
            const classifier = MouseWheelClassifier.INSTANCE;
            classifier.acceptStandardWheelEvent(new StandardWheelEvent(e));
            const value = classifier.isPhysicalMouseWheel();
            if (value !== this._isPhysicalMouseWheel) {
                this._isPhysicalMouseWheel = value;
                this._updateSmoothScrolling();
            }
        }, { passive: true }));
        this._refreshLigaturesAddon();
        this._attached = { container, options };
        // Screen must be created at this point as xterm.open is called
        return this._attached?.container.querySelector('.xterm-screen');
    }
    _setFocused(isFocused) {
        this._onDidChangeFocus.fire(isFocused);
        this._anyTerminalFocusContextKey.set(isFocused);
        this._anyFocusedTerminalHasSelection.set(isFocused && this.raw.hasSelection());
    }
    write(data, callback) {
        this.raw.write(data, callback);
    }
    resize(columns, rows) {
        this.raw.resize(columns, rows);
    }
    updateConfig() {
        const config = this._terminalConfigurationService.config;
        this.raw.options.altClickMovesCursor = config.altClickMovesCursor;
        this._setCursorBlink(config.cursorBlinking);
        this._setCursorStyle(config.cursorStyle);
        this._setCursorStyleInactive(config.cursorStyleInactive);
        this._setCursorWidth(config.cursorWidth);
        this.raw.options.scrollback = config.scrollback;
        this.raw.options.drawBoldTextInBrightColors = config.drawBoldTextInBrightColors;
        this.raw.options.minimumContrastRatio = config.minimumContrastRatio;
        this.raw.options.tabStopWidth = config.tabStopWidth;
        this.raw.options.fastScrollSensitivity = config.fastScrollSensitivity;
        this.raw.options.scrollSensitivity = config.mouseWheelScrollSensitivity;
        this.raw.options.macOptionIsMeta = config.macOptionIsMeta;
        const editorOptions = this._configurationService.getValue('editor');
        this.raw.options.altClickMovesCursor =
            config.altClickMovesCursor && editorOptions.multiCursorModifier === 'alt';
        this.raw.options.macOptionClickForcesSelection = config.macOptionClickForcesSelection;
        this.raw.options.rightClickSelectsWord = config.rightClickBehavior === 'selectWord';
        this.raw.options.wordSeparator = config.wordSeparators;
        this.raw.options.customGlyphs = config.customGlyphs;
        this.raw.options.ignoreBracketedPasteMode = config.ignoreBracketedPasteMode;
        this.raw.options.rescaleOverlappingGlyphs = config.rescaleOverlappingGlyphs;
        this.raw.options.overviewRuler = {
            width: 14,
            showTopBorder: true,
        };
        this._updateSmoothScrolling();
        if (this._attached) {
            if (this._attached.options.enableGpu) {
                if (this._shouldLoadWebgl()) {
                    this._enableWebglRenderer();
                }
                else {
                    this._disposeOfWebglRenderer();
                }
            }
            this._refreshLigaturesAddon();
        }
    }
    _updateSmoothScrolling() {
        this.raw.options.smoothScrollDuration =
            this._terminalConfigurationService.config.smoothScrolling && this._isPhysicalMouseWheel
                ? 125 /* RenderConstants.SmoothScrollDuration */
                : 0;
    }
    _shouldLoadWebgl() {
        return ((this._terminalConfigurationService.config.gpuAcceleration === 'auto' &&
            XtermTerminal_1._suggestedRendererType === undefined) ||
            this._terminalConfigurationService.config.gpuAcceleration === 'on');
    }
    forceRedraw() {
        this.raw.clearTextureAtlas();
    }
    clearDecorations() {
        this._decorationAddon?.clearDecorations();
    }
    forceRefresh() {
        this._core.viewport?._innerRefresh();
    }
    async findNext(term, searchOptions) {
        this._updateFindColors(searchOptions);
        return (await this._getSearchAddon()).findNext(term, searchOptions);
    }
    async findPrevious(term, searchOptions) {
        this._updateFindColors(searchOptions);
        return (await this._getSearchAddon()).findPrevious(term, searchOptions);
    }
    _updateFindColors(searchOptions) {
        const theme = this._themeService.getColorTheme();
        // Theme color names align with monaco/vscode whereas xterm.js has some different naming.
        // The mapping is as follows:
        // - findMatch -> activeMatch
        // - findMatchHighlight -> match
        const terminalBackground = theme.getColor(TERMINAL_BACKGROUND_COLOR) || theme.getColor(PANEL_BACKGROUND);
        const findMatchBackground = theme.getColor(TERMINAL_FIND_MATCH_BACKGROUND_COLOR);
        const findMatchBorder = theme.getColor(TERMINAL_FIND_MATCH_BORDER_COLOR);
        const findMatchOverviewRuler = theme.getColor(TERMINAL_OVERVIEW_RULER_CURSOR_FOREGROUND_COLOR);
        const findMatchHighlightBackground = theme.getColor(TERMINAL_FIND_MATCH_HIGHLIGHT_BACKGROUND_COLOR);
        const findMatchHighlightBorder = theme.getColor(TERMINAL_FIND_MATCH_HIGHLIGHT_BORDER_COLOR);
        const findMatchHighlightOverviewRuler = theme.getColor(TERMINAL_OVERVIEW_RULER_FIND_MATCH_FOREGROUND_COLOR);
        searchOptions.decorations = {
            activeMatchBackground: findMatchBackground?.toString(),
            activeMatchBorder: findMatchBorder?.toString() || 'transparent',
            activeMatchColorOverviewRuler: findMatchOverviewRuler?.toString() || 'transparent',
            // decoration bgs don't support the alpha channel so blend it with the regular bg
            matchBackground: terminalBackground
                ? findMatchHighlightBackground?.blend(terminalBackground).toString()
                : undefined,
            matchBorder: findMatchHighlightBorder?.toString() || 'transparent',
            matchOverviewRuler: findMatchHighlightOverviewRuler?.toString() || 'transparent',
        };
    }
    _getSearchAddon() {
        if (!this._searchAddonPromise) {
            this._searchAddonPromise = this._xtermAddonLoader.importAddon('search').then((AddonCtor) => {
                if (this._store.isDisposed) {
                    return Promise.reject('Could not create search addon, terminal is disposed');
                }
                this._searchAddon = new AddonCtor({
                    highlightLimit: 20000 /* XtermTerminalConstants.SearchHighlightLimit */,
                });
                this.raw.loadAddon(this._searchAddon);
                this._searchAddon.onDidChangeResults((results) => {
                    this._lastFindResult = results;
                    this._onDidChangeFindResults.fire(results);
                });
                return this._searchAddon;
            });
        }
        return this._searchAddonPromise;
    }
    clearSearchDecorations() {
        this._searchAddon?.clearDecorations();
    }
    clearActiveSearchDecoration() {
        this._searchAddon?.clearActiveDecoration();
    }
    getFont() {
        return this._terminalConfigurationService.getFont(dom.getWindow(this.raw.element), this._core);
    }
    getLongestViewportWrappedLineLength() {
        let maxLineLength = 0;
        for (let i = this.raw.buffer.active.length - 1; i >= this.raw.buffer.active.viewportY; i--) {
            const lineInfo = this._getWrappedLineCount(i, this.raw.buffer.active);
            maxLineLength = Math.max(maxLineLength, lineInfo.lineCount * this.raw.cols - lineInfo.endSpaces || 0);
            i = lineInfo.currentIndex;
        }
        return maxLineLength;
    }
    _getWrappedLineCount(index, buffer) {
        let line = buffer.getLine(index);
        if (!line) {
            throw new Error('Could not get line');
        }
        let currentIndex = index;
        let endSpaces = 0;
        // line.length may exceed cols as it doesn't necessarily trim the backing array on resize
        for (let i = Math.min(line.length, this.raw.cols) - 1; i >= 0; i--) {
            if (!line?.getCell(i)?.getChars()) {
                endSpaces++;
            }
            else {
                break;
            }
        }
        while (line?.isWrapped && currentIndex > 0) {
            currentIndex--;
            line = buffer.getLine(currentIndex);
        }
        return { lineCount: index - currentIndex + 1, currentIndex, endSpaces };
    }
    scrollDownLine() {
        this.raw.scrollLines(1);
    }
    scrollDownPage() {
        this.raw.scrollPages(1);
    }
    scrollToBottom() {
        this.raw.scrollToBottom();
    }
    scrollUpLine() {
        this.raw.scrollLines(-1);
    }
    scrollUpPage() {
        this.raw.scrollPages(-1);
    }
    scrollToTop() {
        this.raw.scrollToTop();
    }
    scrollToLine(line, position = 0 /* ScrollPosition.Top */) {
        this.markTracker.scrollToLine(line, position);
    }
    clearBuffer() {
        this.raw.clear();
        // xterm.js does not clear the first prompt, so trigger these to simulate
        // the prompt being written
        this._capabilities.get(2 /* TerminalCapability.CommandDetection */)?.handlePromptStart();
        this._capabilities.get(2 /* TerminalCapability.CommandDetection */)?.handleCommandStart();
        this._accessibilitySignalService.playSignal(AccessibilitySignal.clear);
    }
    hasSelection() {
        return this.raw.hasSelection();
    }
    clearSelection() {
        this.raw.clearSelection();
    }
    selectMarkedRange(fromMarkerId, toMarkerId, scrollIntoView = false) {
        const detectionCapability = this.shellIntegration.capabilities.get(4 /* TerminalCapability.BufferMarkDetection */);
        if (!detectionCapability) {
            return;
        }
        const start = detectionCapability.getMark(fromMarkerId);
        const end = detectionCapability.getMark(toMarkerId);
        if (start === undefined || end === undefined) {
            return;
        }
        this.raw.selectLines(start.line, end.line);
        if (scrollIntoView) {
            this.raw.scrollToLine(start.line);
        }
    }
    selectAll() {
        this.raw.focus();
        this.raw.selectAll();
    }
    focus() {
        this.raw.focus();
    }
    async copySelection(asHtml, command) {
        if (this.hasSelection() || (asHtml && command)) {
            if (asHtml) {
                const textAsHtml = await this.getSelectionAsHtml(command);
                function listener(e) {
                    if (!e.clipboardData.types.includes('text/plain')) {
                        e.clipboardData.setData('text/plain', command?.getOutput() ?? '');
                    }
                    e.clipboardData.setData('text/html', textAsHtml);
                    e.preventDefault();
                }
                const doc = dom.getDocument(this.raw.element);
                doc.addEventListener('copy', listener);
                doc.execCommand('copy');
                doc.removeEventListener('copy', listener);
            }
            else {
                await this._clipboardService.writeText(this.raw.getSelection());
            }
        }
        else {
            this._notificationService.warn(localize('terminal.integrated.copySelection.noSelection', 'The terminal has no selection to copy'));
        }
    }
    _setCursorBlink(blink) {
        if (this.raw.options.cursorBlink !== blink) {
            this.raw.options.cursorBlink = blink;
            this.raw.refresh(0, this.raw.rows - 1);
        }
    }
    _setCursorStyle(style) {
        const mapped = vscodeToXtermCursorStyle(style);
        if (this.raw.options.cursorStyle !== mapped) {
            this.raw.options.cursorStyle = mapped;
        }
    }
    _setCursorStyleInactive(style) {
        const mapped = vscodeToXtermCursorStyle(style);
        if (this.raw.options.cursorInactiveStyle !== mapped) {
            this.raw.options.cursorInactiveStyle = mapped;
        }
    }
    _setCursorWidth(width) {
        if (this.raw.options.cursorWidth !== width) {
            this.raw.options.cursorWidth = width;
        }
    }
    async _enableWebglRenderer() {
        if (!this.raw.element || this._webglAddon) {
            return;
        }
        const Addon = await this._xtermAddonLoader.importAddon('webgl');
        this._webglAddon = new Addon();
        try {
            this.raw.loadAddon(this._webglAddon);
            this._logService.trace('Webgl was loaded');
            this._webglAddon.onContextLoss(() => {
                this._logService.info(`Webgl lost context, disposing of webgl renderer`);
                this._disposeOfWebglRenderer();
            });
            this._refreshImageAddon();
            // WebGL renderer cell dimensions differ from the DOM renderer, make sure the terminal
            // gets resized after the webgl addon is loaded
            this._onDidRequestRefreshDimensions.fire();
            // Uncomment to add the texture atlas to the DOM
            // setTimeout(() => {
            // 	if (this._webglAddon?.textureAtlas) {
            // 		document.body.appendChild(this._webglAddon?.textureAtlas);
            // 	}
            // }, 5000);
        }
        catch (e) {
            this._logService.warn(`Webgl could not be loaded. Falling back to the DOM renderer`, e);
            XtermTerminal_1._suggestedRendererType = 'dom';
            this._disposeOfWebglRenderer();
        }
    }
    async _refreshLigaturesAddon() {
        if (!this.raw.element) {
            return;
        }
        const ligaturesConfig = this._terminalConfigurationService.config.fontLigatures;
        let shouldRecreateWebglRenderer = false;
        if (ligaturesConfig?.enabled) {
            if (this._ligaturesAddon.value && !equals(ligaturesConfig, this._ligaturesAddonConfig)) {
                this._ligaturesAddon.clear();
            }
            if (!this._ligaturesAddon.value) {
                const LigaturesAddon = await this._xtermAddonLoader.importAddon('ligatures');
                if (this._store.isDisposed) {
                    return;
                }
                this._ligaturesAddon.value = this._instantiationService.createInstance(LigaturesAddon, {
                    fontFeatureSettings: ligaturesConfig.featureSettings,
                    fallbackLigatures: ligaturesConfig.fallbackLigatures,
                });
                this.raw.loadAddon(this._ligaturesAddon.value);
                shouldRecreateWebglRenderer = true;
            }
        }
        else {
            if (!this._ligaturesAddon.value) {
                return;
            }
            this._ligaturesAddon.clear();
            shouldRecreateWebglRenderer = true;
        }
        if (shouldRecreateWebglRenderer && this._webglAddon) {
            // Re-create the webgl addon when ligatures state changes to so the texture atlas picks up
            // styles from the DOM.
            this._disposeOfWebglRenderer();
            await this._enableWebglRenderer();
        }
    }
    async _refreshImageAddon() {
        // Only allow the image addon when webgl is being used to avoid possible GPU issues
        if (this._terminalConfigurationService.config.enableImages && this._webglAddon) {
            if (!this._imageAddon) {
                const AddonCtor = await this._xtermAddonLoader.importAddon('image');
                this._imageAddon = new AddonCtor();
                this.raw.loadAddon(this._imageAddon);
            }
        }
        else {
            try {
                this._imageAddon?.dispose();
            }
            catch {
                // ignore
            }
            this._imageAddon = undefined;
        }
    }
    _disposeOfWebglRenderer() {
        try {
            this._webglAddon?.dispose();
        }
        catch {
            // ignore
        }
        this._webglAddon = undefined;
        this._refreshImageAddon();
        // WebGL renderer cell dimensions differ from the DOM renderer, make sure the terminal
        // gets resized after the webgl addon is disposed
        this._onDidRequestRefreshDimensions.fire();
    }
    getXtermTheme(theme) {
        if (!theme) {
            theme = this._themeService.getColorTheme();
        }
        const config = this._terminalConfigurationService.config;
        const hideOverviewRuler = ['never', 'gutter'].includes(config.shellIntegration?.decorationsEnabled ?? '');
        const foregroundColor = theme.getColor(TERMINAL_FOREGROUND_COLOR);
        const backgroundColor = this._xtermColorProvider.getBackgroundColor(theme);
        const cursorColor = theme.getColor(TERMINAL_CURSOR_FOREGROUND_COLOR) || foregroundColor;
        const cursorAccentColor = theme.getColor(TERMINAL_CURSOR_BACKGROUND_COLOR) || backgroundColor;
        const selectionBackgroundColor = theme.getColor(TERMINAL_SELECTION_BACKGROUND_COLOR);
        const selectionInactiveBackgroundColor = theme.getColor(TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR);
        const selectionForegroundColor = theme.getColor(TERMINAL_SELECTION_FOREGROUND_COLOR) || undefined;
        return {
            background: backgroundColor?.toString(),
            foreground: foregroundColor?.toString(),
            cursor: cursorColor?.toString(),
            cursorAccent: cursorAccentColor?.toString(),
            selectionBackground: selectionBackgroundColor?.toString(),
            selectionInactiveBackground: selectionInactiveBackgroundColor?.toString(),
            selectionForeground: selectionForegroundColor?.toString(),
            overviewRulerBorder: hideOverviewRuler
                ? '#0000'
                : theme.getColor(TERMINAL_OVERVIEW_RULER_BORDER_COLOR)?.toString(),
            scrollbarSliderActiveBackground: theme.getColor(scrollbarSliderActiveBackground)?.toString(),
            scrollbarSliderBackground: theme.getColor(scrollbarSliderBackground)?.toString(),
            scrollbarSliderHoverBackground: theme.getColor(scrollbarSliderHoverBackground)?.toString(),
            black: theme.getColor(ansiColorIdentifiers[0])?.toString(),
            red: theme.getColor(ansiColorIdentifiers[1])?.toString(),
            green: theme.getColor(ansiColorIdentifiers[2])?.toString(),
            yellow: theme.getColor(ansiColorIdentifiers[3])?.toString(),
            blue: theme.getColor(ansiColorIdentifiers[4])?.toString(),
            magenta: theme.getColor(ansiColorIdentifiers[5])?.toString(),
            cyan: theme.getColor(ansiColorIdentifiers[6])?.toString(),
            white: theme.getColor(ansiColorIdentifiers[7])?.toString(),
            brightBlack: theme.getColor(ansiColorIdentifiers[8])?.toString(),
            brightRed: theme.getColor(ansiColorIdentifiers[9])?.toString(),
            brightGreen: theme.getColor(ansiColorIdentifiers[10])?.toString(),
            brightYellow: theme.getColor(ansiColorIdentifiers[11])?.toString(),
            brightBlue: theme.getColor(ansiColorIdentifiers[12])?.toString(),
            brightMagenta: theme.getColor(ansiColorIdentifiers[13])?.toString(),
            brightCyan: theme.getColor(ansiColorIdentifiers[14])?.toString(),
            brightWhite: theme.getColor(ansiColorIdentifiers[15])?.toString(),
        };
    }
    _updateTheme(theme) {
        this.raw.options.theme = this.getXtermTheme(theme);
    }
    refresh() {
        this._updateTheme();
        this._decorationAddon.refreshLayouts();
    }
    async _updateUnicodeVersion() {
        if (!this._unicode11Addon &&
            this._terminalConfigurationService.config.unicodeVersion === '11') {
            const Addon = await this._xtermAddonLoader.importAddon('unicode11');
            this._unicode11Addon = new Addon();
            this.raw.loadAddon(this._unicode11Addon);
        }
        if (this.raw.unicode.activeVersion !== this._terminalConfigurationService.config.unicodeVersion) {
            this.raw.unicode.activeVersion = this._terminalConfigurationService.config.unicodeVersion;
        }
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _writeText(data) {
        this.raw.write(data);
    }
    dispose() {
        this._anyTerminalFocusContextKey.reset();
        this._anyFocusedTerminalHasSelection.reset();
        this._onDidDispose.fire();
        super.dispose();
    }
};
__decorate([
    debounce(100)
], XtermTerminal.prototype, "_refreshLigaturesAddon", null);
__decorate([
    debounce(100)
], XtermTerminal.prototype, "_refreshImageAddon", null);
XtermTerminal = XtermTerminal_1 = __decorate([
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, ITerminalLogService),
    __param(5, INotificationService),
    __param(6, IThemeService),
    __param(7, ITelemetryService),
    __param(8, ITerminalConfigurationService),
    __param(9, IClipboardService),
    __param(10, IContextKeyService),
    __param(11, IAccessibilitySignalService),
    __param(12, ILayoutService)
], XtermTerminal);
export { XtermTerminal };
export function getXtermScaledDimensions(w, font, width, height) {
    if (!font.charWidth || !font.charHeight) {
        return null;
    }
    // Because xterm.js converts from CSS pixels to actual pixels through
    // the use of canvas, window.devicePixelRatio needs to be used here in
    // order to be precise. font.charWidth/charHeight alone as insufficient
    // when window.devicePixelRatio changes.
    const scaledWidthAvailable = width * w.devicePixelRatio;
    const scaledCharWidth = font.charWidth * w.devicePixelRatio + font.letterSpacing;
    const cols = Math.max(Math.floor(scaledWidthAvailable / scaledCharWidth), 1);
    const scaledHeightAvailable = height * w.devicePixelRatio;
    const scaledCharHeight = Math.ceil(font.charHeight * w.devicePixelRatio);
    const scaledLineHeight = Math.floor(scaledCharHeight * font.lineHeight);
    const rows = Math.max(Math.floor(scaledHeightAvailable / scaledLineHeight), 1);
    return { rows, cols };
}
function vscodeToXtermLogLevel(logLevel) {
    switch (logLevel) {
        case LogLevel.Trace:
            return 'trace';
        case LogLevel.Debug:
            return 'debug';
        case LogLevel.Info:
            return 'info';
        case LogLevel.Warning:
            return 'warn';
        case LogLevel.Error:
            return 'error';
        default:
            return 'off';
    }
}
function vscodeToXtermCursorStyle(style) {
    // 'line' is used instead of bar in VS Code to be consistent with editor.cursorStyle
    if (style === 'line') {
        return 'bar';
    }
    return style;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHRlcm1UZXJtaW5hbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIveHRlcm0veHRlcm1UZXJtaW5hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFtQmhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFFekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0seUNBQXlDLENBQUE7QUFFaEQsT0FBTyxFQUVOLG1CQUFtQixHQUduQixNQUFNLHFEQUFxRCxDQUFBO0FBRTVELE9BQU8sRUFRTiw2QkFBNkIsR0FDN0IsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN2QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFrQixNQUFNLDBCQUEwQixDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDakcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDOUQsT0FBTyxFQUNOLHlCQUF5QixFQUN6Qix5QkFBeUIsRUFDekIsZ0NBQWdDLEVBQ2hDLGdDQUFnQyxFQUNoQyxvQkFBb0IsRUFDcEIsbUNBQW1DLEVBQ25DLG9DQUFvQyxFQUNwQyw4Q0FBOEMsRUFDOUMsZ0NBQWdDLEVBQ2hDLG1EQUFtRCxFQUNuRCwwQ0FBMEMsRUFDMUMsK0NBQStDLEVBQy9D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
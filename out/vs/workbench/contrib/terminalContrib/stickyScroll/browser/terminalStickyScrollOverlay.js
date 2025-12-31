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
import { $, addDisposableListener, addStandardDisposableListener, getWindow, } from '../../../../../base/browser/dom.js';
import { throttle } from '../../../../../base/common/decorators.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, MutableDisposable, combinedDisposable, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../../base/common/strings.js';
import './media/stickyScroll.css';
import { localize } from '../../../../../nls.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ITerminalConfigurationService, } from '../../../terminal/browser/terminal.js';
import { openContextMenu } from '../../../terminal/browser/terminalContextMenu.js';
import { TERMINAL_CONFIG_SECTION } from '../../../terminal/common/terminal.js';
import { terminalStrings } from '../../../terminal/common/terminalStrings.js';
import { terminalStickyScrollBackground, terminalStickyScrollHoverBackground, } from './terminalStickyScrollColorRegistry.js';
import { XtermAddonImporter } from '../../../terminal/browser/xterm/xtermAddonImporter.js';
var OverlayState;
(function (OverlayState) {
    /** Initial state/disabled by the alt buffer. */
    OverlayState[OverlayState["Off"] = 0] = "Off";
    OverlayState[OverlayState["On"] = 1] = "On";
})(OverlayState || (OverlayState = {}));
var CssClasses;
(function (CssClasses) {
    CssClasses["Visible"] = "visible";
})(CssClasses || (CssClasses = {}));
var Constants;
(function (Constants) {
    Constants[Constants["StickyScrollPercentageCap"] = 0.4] = "StickyScrollPercentageCap";
})(Constants || (Constants = {}));
let TerminalStickyScrollOverlay = class TerminalStickyScrollOverlay extends Disposable {
    constructor(_instance, _xterm, _xtermColorProvider, _commandDetection, xtermCtor, configurationService, contextKeyService, _contextMenuService, _keybindingService, menuService, _terminalConfigurationService, _themeService) {
        super();
        this._instance = _instance;
        this._xterm = _xterm;
        this._xtermColorProvider = _xtermColorProvider;
        this._commandDetection = _commandDetection;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._themeService = _themeService;
        this._xtermAddonLoader = new XtermAddonImporter();
        this._refreshListeners = this._register(new MutableDisposable());
        this._state = 0 /* OverlayState.Off */;
        this._isRefreshQueued = false;
        this._rawMaxLineCount = 5;
        this._contextMenu = this._register(menuService.createMenu(MenuId.TerminalStickyScrollContext, contextKeyService));
        // Only show sticky scroll in the normal buffer
        this._register(Event.runAndSubscribe(this._xterm.raw.buffer.onBufferChange, (buffer) => {
            this._setState((buffer ?? this._xterm.raw.buffer.active).type === 'normal'
                ? 1 /* OverlayState.On */
                : 0 /* OverlayState.Off */);
        }));
        // React to configuration changes
        this._register(Event.runAndSubscribe(configurationService.onDidChangeConfiguration, (e) => {
            if (!e || e.affectsConfiguration("terminal.integrated.stickyScroll.maxLineCount" /* TerminalStickyScrollSettingId.MaxLineCount */)) {
                this._rawMaxLineCount = configurationService.getValue("terminal.integrated.stickyScroll.maxLineCount" /* TerminalStickyScrollSettingId.MaxLineCount */);
            }
        }));
        // React to terminal location changes
        this._register(this._instance.onDidChangeTarget(() => this._syncOptions()));
        // Eagerly create the overlay
        xtermCtor.then((ctor) => {
            if (this._store.isDisposed) {
                return;
            }
            this._stickyScrollOverlay = this._register(new ctor({
                rows: 1,
                cols: this._xterm.raw.cols,
                allowProposedApi: true,
                ...this._getOptions(),
            }));
            this._refreshGpuAcceleration();
            this._register(configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration(TERMINAL_CONFIG_SECTION)) {
                    this._syncOptions();
                }
            }));
            this._register(this._themeService.onDidColorThemeChange(() => {
                this._syncOptions();
            }));
            this._register(this._xterm.raw.onResize(() => {
                this._syncOptions();
                this._refresh();
            }));
            this._register(this._instance.onDidChangeVisibility((isVisible) => {
                if (isVisible) {
                    this._refresh();
                }
            }));
            this._xtermAddonLoader.importAddon('serialize').then((SerializeAddon) => {
                if (this._store.isDisposed) {
                    return;
                }
                this._serializeAddon = this._register(new SerializeAddon());
                this._xterm.raw.loadAddon(this._serializeAddon);
                // Trigger a render as the serialize addon is required to render
                this._refresh();
            });
        });
    }
    lockHide() {
        this._element?.classList.add('lock-hide');
    }
    unlockHide() {
        this._element?.classList.remove('lock-hide');
    }
    _setState(state) {
        if (this._state === state) {
            return;
        }
        switch (state) {
            case 0 /* OverlayState.Off */: {
                this._setVisible(false);
                this._uninstallRefreshListeners();
                break;
            }
            case 1 /* OverlayState.On */: {
                this._refresh();
                this._installRefreshListeners();
                break;
            }
        }
    }
    _installRefreshListeners() {
        if (!this._refreshListeners.value) {
            this._refreshListeners.value = combinedDisposable(Event.any(this._xterm.raw.onScroll, this._xterm.raw.onLineFeed, 
            // Rarely an update may be required after just a cursor move, like when
            // scrolling horizontally in a pager
            this._xterm.raw.onCursorMove)(() => this._refresh()), addStandardDisposableListener(this._xterm.raw.element.querySelector('.xterm-viewport'), 'scroll', () => this._refresh()));
        }
    }
    _uninstallRefreshListeners() {
        this._refreshListeners.clear();
    }
    _setVisible(isVisible) {
        if (isVisible) {
            this._ensureElement();
        }
        this._element?.classList.toggle("visible" /* CssClasses.Visible */, isVisible);
    }
    _refresh() {
        if (this._isRefreshQueued) {
            return;
        }
        this._isRefreshQueued = true;
        queueMicrotask(() => {
            this._refreshNow();
            this._isRefreshQueued = false;
        });
    }
    _refreshNow() {
        const command = this._commandDetection.getCommandForLine(this._xterm.raw.buffer.active.viewportY);
        // The command from viewportY + 1 is used because this one will not be obscured by sticky
        // scroll.
        this._currentStickyCommand = undefined;
        // No command
        if (!command) {
            this._setVisible(false);
            return;
        }
        // Partial command
        if (!('marker' in command)) {
            const partialCommand = this._commandDetection.currentCommand;
            if (partialCommand?.commandStartMarker && partialCommand.commandExecutedMarker) {
                this._updateContent(partialCommand, partialCommand.commandStartMarker);
                return;
            }
            this._setVisible(false);
            return;
        }
        // If the marker doesn't exist or it was trimmed from scrollback
        const marker = command.marker;
        if (!marker || marker.line === -1) {
            // TODO: It would be nice if we kept the cached command around even if it was trimmed
            // from scrollback
            this._setVisible(false);
            return;
        }
        this._updateContent(command, marker);
    }
    _updateContent(command, startMarker) {
        const xterm = this._xterm.raw;
        if (!xterm.element?.parentElement || !this._stickyScrollOverlay || !this._serializeAddon) {
            return;
        }
        // Hide sticky scroll if the prompt has been trimmed from the buffer
        if (command.promptStartMarker?.line === -1) {
            this._setVisible(false);
            return;
        }
        // Determine sticky scroll line count
        const buffer = xterm.buffer.active;
        const promptRowCount = command.getPromptRowCount();
        const commandRowCount = command.getCommandRowCount();
        const stickyScrollLineStart = startMarker.line - (promptRowCount - 1);
        // Calculate the row offset, this is the number of rows that will be clipped from the top
        // of the sticky overlay because we do not want to show any content above the bounds of the
        // original terminal. This is done because it seems like scrolling flickers more when a
        // partial line can be drawn on the top.
        const isPartialCommand = !('getOutput' in command);
        const rowOffset = !isPartialCommand && command.endMarker
            ? Math.max(buffer.viewportY - command.endMarker.line + 1, 0)
            : 0;
        const maxLineCount = Math.min(this._rawMaxLineCount, Math.floor(xterm.rows * 0.4 /* Constants.StickyScrollPercentageCap */));
        const stickyScrollLineCount = Math.min(promptRowCount + commandRowCount - 1, maxLineCount) - rowOffset;
        const isTruncated = stickyScrollLineCount < promptRowCount + commandRowCount - 1;
        // Hide sticky scroll if it's currently on a line that contains it
        if (buffer.viewportY <= stickyScrollLineStart) {
            this._setVisible(false);
            return;
        }
        // Hide sticky scroll for the partial command if it looks like there is a pager like `less`
        // or `git log` active. This is done by checking if the bottom left cell contains the :
        // character and the cursor is immediately to its right. This improves the behavior of a
        // common case where the top of the text being viewport would otherwise be obscured.
        if (isPartialCommand &&
            buffer.viewportY === buffer.baseY &&
            buffer.cursorY === xterm.rows - 1) {
            const line = buffer.getLine(buffer.baseY + xterm.rows - 1);
            if ((buffer.cursorX === 1 && lineStartsWith(line, ':')) ||
                (buffer.cursorX === 5 && lineStartsWith(line, '(END)'))) {
                this._setVisible(false);
                return;
            }
        }
        // Get the line content of the command from the terminal
        const content = this._serializeAddon.serialize({
            range: {
                start: stickyScrollLineStart + rowOffset,
                end: stickyScrollLineStart + rowOffset + Math.max(stickyScrollLineCount - 1, 0),
            },
        }) + (isTruncated ? '\x1b[0m …' : '');
        // If a partial command's sticky scroll would show nothing, just hide it. This is another
        // edge case when using a pager or interactive editor.
        if (isPartialCommand && removeAnsiEscapeCodes(content).length === 0) {
            this._setVisible(false);
            return;
        }
        // Write content if it differs
        if ((content && this._currentContent !== content) ||
            this._stickyScrollOverlay.cols !== xterm.cols ||
            this._stickyScrollOverlay.rows !== stickyScrollLineCount) {
            this._stickyScrollOverlay.resize(this._stickyScrollOverlay.cols, stickyScrollLineCount);
            // Clear attrs, reset cursor position, clear right
            this._stickyScrollOverlay.write('\x1b[0m\x1b[H\x1b[2J');
            this._stickyScrollOverlay.write(content);
            this._currentContent = content;
            // DEBUG: Log to show the command line we know
            // this._stickyScrollOverlay.write(` [${command?.command}]`);
        }
        if (content) {
            this._currentStickyCommand = command;
            this._setVisible(true);
            // Position the sticky scroll such that it never overlaps the prompt/output of the
            // following command. This must happen after setVisible to ensure the element is
            // initialized.
            if (this._element) {
                const termBox = xterm.element.getBoundingClientRect();
                // Only try reposition if the element is visible, if not a refresh will occur when
                // it becomes visible
                if (termBox.height > 0) {
                    const rowHeight = termBox.height / xterm.rows;
                    const overlayHeight = stickyScrollLineCount * rowHeight;
                    // Adjust sticky scroll content if it would below the end of the command, obscuring the
                    // following command.
                    let endMarkerOffset = 0;
                    if (!isPartialCommand && command.endMarker && command.endMarker.line !== -1) {
                        if (buffer.viewportY + stickyScrollLineCount > command.endMarker.line) {
                            const diff = buffer.viewportY + stickyScrollLineCount - command.endMarker.line;
                            endMarkerOffset = diff * rowHeight;
                        }
                    }
                    this._element.style.bottom = `${termBox.height - overlayHeight + 1 + endMarkerOffset}px`;
                }
            }
        }
        else {
            this._setVisible(false);
        }
    }
    _ensureElement() {
        if (
        // The element is already created
        this._element ||
            // If the overlay is yet to be created, the terminal cannot be opened so defer to next call
            !this._stickyScrollOverlay ||
            // The xterm.js instance isn't opened yet
            !this._xterm?.raw.element?.parentElement) {
            return;
        }
        const overlay = this._stickyScrollOverlay;
        const hoverOverlay = $('.hover-overlay');
        this._element = $('.terminal-sticky-scroll', undefined, hoverOverlay);
        this._xterm.raw.element.parentElement.append(this._element);
        this._register(toDisposable(() => this._element?.remove()));
        // Fill tooltip
        let hoverTitle = localize('stickyScrollHoverTitle', 'Navigate to Command');
        const scrollToPreviousCommandKeybinding = this._keybindingService.lookupKeybinding("workbench.action.terminal.scrollToPreviousCommand" /* TerminalCommandId.ScrollToPreviousCommand */);
        if (scrollToPreviousCommandKeybinding) {
            const label = scrollToPreviousCommandKeybinding.getLabel();
            if (label) {
                hoverTitle +=
                    '\n' +
                        localize('labelWithKeybinding', '{0} ({1})', terminalStrings.scrollToPreviousCommand.value, label);
            }
        }
        const scrollToNextCommandKeybinding = this._keybindingService.lookupKeybinding("workbench.action.terminal.scrollToNextCommand" /* TerminalCommandId.ScrollToNextCommand */);
        if (scrollToNextCommandKeybinding) {
            const label = scrollToNextCommandKeybinding.getLabel();
            if (label) {
                hoverTitle +=
                    '\n' +
                        localize('labelWithKeybinding', '{0} ({1})', terminalStrings.scrollToNextCommand.value, label);
            }
        }
        hoverOverlay.title = hoverTitle;
        const scrollBarWidth = this._xterm.raw._core.viewport
            ?.scrollBarWidth;
        if (scrollBarWidth !== undefined) {
            this._element.style.right = `${scrollBarWidth}px`;
        }
        this._stickyScrollOverlay.open(this._element);
        this._xtermAddonLoader.importAddon('ligatures').then((LigaturesAddon) => {
            if (this._store.isDisposed || !this._stickyScrollOverlay) {
                return;
            }
            this._ligaturesAddon = new LigaturesAddon();
            this._stickyScrollOverlay.loadAddon(this._ligaturesAddon);
        });
        // Scroll to the command on click
        this._register(addStandardDisposableListener(hoverOverlay, 'click', () => {
            if (this._xterm && this._currentStickyCommand) {
                this._xterm.markTracker.revealCommand(this._currentStickyCommand);
                this._instance.focus();
            }
        }));
        // Forward mouse events to the terminal
        this._register(addStandardDisposableListener(hoverOverlay, 'wheel', (e) => this._xterm?.raw.element?.dispatchEvent(new WheelEvent(e.type, e))));
        // Context menu - stop propagation on mousedown because rightClickBehavior listens on
        // mousedown, not contextmenu
        this._register(addDisposableListener(hoverOverlay, 'mousedown', (e) => {
            e.stopImmediatePropagation();
            e.preventDefault();
        }));
        this._register(addDisposableListener(hoverOverlay, 'contextmenu', (e) => {
            e.stopImmediatePropagation();
            e.preventDefault();
            openContextMenu(getWindow(hoverOverlay), e, this._instance, this._contextMenu, this._contextMenuService);
        }));
        // Instead of juggling decorations for hover styles, swap out the theme to indicate the
        // hover state. This comes with the benefit over other methods of working well with special
        // decorative characters like powerline symbols.
        this._register(addStandardDisposableListener(hoverOverlay, 'mouseover', () => (overlay.options.theme = this._getTheme(true))));
        this._register(addStandardDisposableListener(hoverOverlay, 'mouseleave', () => (overlay.options.theme = this._getTheme(false))));
    }
    _syncOptions() {
        if (!this._stickyScrollOverlay) {
            return;
        }
        this._stickyScrollOverlay.resize(this._xterm.raw.cols, this._stickyScrollOverlay.rows);
        this._stickyScrollOverlay.options = this._getOptions();
        this._refreshGpuAcceleration();
    }
    _getOptions() {
        const o = this._xterm.raw.options;
        return {
            cursorInactiveStyle: 'none',
            scrollback: 0,
            logLevel: 'off',
            theme: this._getTheme(false),
            documentOverride: o.documentOverride,
            fontFamily: o.fontFamily,
            fontWeight: o.fontWeight,
            fontWeightBold: o.fontWeightBold,
            fontSize: o.fontSize,
            letterSpacing: o.letterSpacing,
            lineHeight: o.lineHeight,
            drawBoldTextInBrightColors: o.drawBoldTextInBrightColors,
            minimumContrastRatio: o.minimumContrastRatio,
            tabStopWidth: o.tabStopWidth,
            customGlyphs: o.customGlyphs,
        };
    }
    async _refreshGpuAcceleration() {
        if (this._shouldLoadWebgl() && !this._webglAddon) {
            const WebglAddon = await this._xtermAddonLoader.importAddon('webgl');
            if (this._store.isDisposed) {
                return;
            }
            this._webglAddon = this._register(new WebglAddon());
            this._stickyScrollOverlay?.loadAddon(this._webglAddon);
        }
        else if (!this._shouldLoadWebgl() && this._webglAddon) {
            this._webglAddon.dispose();
            this._webglAddon = undefined;
        }
    }
    _shouldLoadWebgl() {
        return (this._terminalConfigurationService.config.gpuAcceleration === 'auto' ||
            this._terminalConfigurationService.config.gpuAcceleration === 'on');
    }
    _getTheme(isHovering) {
        const theme = this._themeService.getColorTheme();
        return {
            ...this._xterm.getXtermTheme(),
            background: isHovering
                ? (theme.getColor(terminalStickyScrollHoverBackground)?.toString() ??
                    this._xtermColorProvider.getBackgroundColor(theme)?.toString())
                : (theme.getColor(terminalStickyScrollBackground)?.toString() ??
                    this._xtermColorProvider.getBackgroundColor(theme)?.toString()),
            selectionBackground: undefined,
            selectionInactiveBackground: undefined,
        };
    }
};
__decorate([
    throttle(0)
], TerminalStickyScrollOverlay.prototype, "_syncOptions", null);
__decorate([
    throttle(0)
], TerminalStickyScrollOverlay.prototype, "_refreshGpuAcceleration", null);
TerminalStickyScrollOverlay = __decorate([
    __param(5, IConfigurationService),
    __param(6, IContextKeyService),
    __param(7, IContextMenuService),
    __param(8, IKeybindingService),
    __param(9, IMenuService),
    __param(10, ITerminalConfigurationService),
    __param(11, IThemeService)
], TerminalStickyScrollOverlay);
export { TerminalStickyScrollOverlay };
function lineStartsWith(line, text) {
    if (!line) {
        return false;
    }
    for (let i = 0; i < text.length; i++) {
        if (line.getCell(i)?.getChars() !== text[i]) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdGlja3lTY3JvbGxPdmVybGF5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N0aWNreVNjcm9sbC9icm93c2VyL3Rlcm1pbmFsU3RpY2t5U2Nyb2xsT3ZlcmxheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQWFoRyxPQUFPLEVBQ04sQ0FBQyxFQUNELHFCQUFxQixFQUNyQiw2QkFBNkIsRUFDN0IsU0FBUyxHQUNULE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sVUFBVSxFQUNWLGlCQUFpQixFQUNqQixrQkFBa0IsRUFDbEIsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0UsT0FBTywwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQU01RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYs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
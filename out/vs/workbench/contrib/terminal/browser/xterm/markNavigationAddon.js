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
import { coalesce } from '../../../../../base/common/arrays.js';
import { Disposable, DisposableStore, MutableDisposable, dispose, } from '../../../../../base/common/lifecycle.js';
import { timeout } from '../../../../../base/common/async.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TERMINAL_OVERVIEW_RULER_CURSOR_FOREGROUND_COLOR } from '../../common/terminalColorRegistry.js';
import { getWindow } from '../../../../../base/browser/dom.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
var Boundary;
(function (Boundary) {
    Boundary[Boundary["Top"] = 0] = "Top";
    Boundary[Boundary["Bottom"] = 1] = "Bottom";
})(Boundary || (Boundary = {}));
export var ScrollPosition;
(function (ScrollPosition) {
    ScrollPosition[ScrollPosition["Top"] = 0] = "Top";
    ScrollPosition[ScrollPosition["Middle"] = 1] = "Middle";
})(ScrollPosition || (ScrollPosition = {}));
let MarkNavigationAddon = class MarkNavigationAddon extends Disposable {
    activate(terminal) {
        this._terminal = terminal;
        this._register(this._terminal.onData(() => {
            this._currentMarker = Boundary.Bottom;
        }));
    }
    constructor(_capabilities, _configurationService, _themeService) {
        super();
        this._capabilities = _capabilities;
        this._configurationService = _configurationService;
        this._themeService = _themeService;
        this._currentMarker = Boundary.Bottom;
        this._selectionStart = null;
        this._isDisposable = false;
        this._commandGuideDecorations = this._register(new MutableDisposable());
    }
    _getMarkers(skipEmptyCommands) {
        const commandCapability = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const partialCommandCapability = this._capabilities.get(3 /* TerminalCapability.PartialCommandDetection */);
        const markCapability = this._capabilities.get(4 /* TerminalCapability.BufferMarkDetection */);
        let markers = [];
        if (commandCapability) {
            markers = coalesce(commandCapability.commands
                .filter((e) => (skipEmptyCommands ? e.exitCode !== undefined : true))
                .map((e) => e.promptStartMarker ?? e.marker));
            // Allow navigating to the current command iff it has been executed, this ignores the
            // skipEmptyCommands flag intenionally as chances are it's not going to be empty if an
            // executed marker exists when this is requested.
            if (commandCapability.currentCommand?.promptStartMarker &&
                commandCapability.currentCommand.commandExecutedMarker) {
                markers.push(commandCapability.currentCommand?.promptStartMarker);
            }
        }
        else if (partialCommandCapability) {
            markers.push(...partialCommandCapability.commands);
        }
        if (markCapability && !skipEmptyCommands) {
            let next = markCapability.markers().next()?.value;
            const arr = [];
            while (next) {
                arr.push(next);
                next = markCapability.markers().next()?.value;
            }
            markers = arr;
        }
        return markers;
    }
    _findCommand(marker) {
        const commandCapability = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (commandCapability) {
            const command = commandCapability.commands.find((e) => e.marker?.line === marker.line || e.promptStartMarker?.line === marker.line);
            if (command) {
                return command;
            }
            if (commandCapability.currentCommand) {
                return commandCapability.currentCommand;
            }
        }
        return undefined;
    }
    clear() {
        // Clear the current marker so successive focus/selection actions are performed from the
        // bottom of the buffer
        this._currentMarker = Boundary.Bottom;
        this._resetNavigationDecorations();
        this._selectionStart = null;
    }
    _resetNavigationDecorations() {
        if (this._navigationDecorations) {
            dispose(this._navigationDecorations);
        }
        this._navigationDecorations = [];
    }
    _isEmptyCommand(marker) {
        if (marker === Boundary.Bottom) {
            return true;
        }
        if (marker === Boundary.Top) {
            return !this._getMarkers(true)
                .map((e) => e.line)
                .includes(0);
        }
        return !this._getMarkers(true).includes(marker);
    }
    scrollToPreviousMark(scrollPosition = 1 /* ScrollPosition.Middle */, retainSelection = false, skipEmptyCommands = true) {
        if (!this._terminal) {
            return;
        }
        if (!retainSelection) {
            this._selectionStart = null;
        }
        let markerIndex;
        const currentLineY = typeof this._currentMarker === 'object'
            ? this.getTargetScrollLine(this._currentMarker.line, scrollPosition)
            : Math.min(getLine(this._terminal, this._currentMarker), this._terminal.buffer.active.baseY);
        const viewportY = this._terminal.buffer.active.viewportY;
        if (typeof this._currentMarker === 'object'
            ? !this._isMarkerInViewport(this._terminal, this._currentMarker)
            : currentLineY !== viewportY) {
            // The user has scrolled, find the line based on the current scroll position. This only
            // works when not retaining selection
            const markersBelowViewport = this._getMarkers(skipEmptyCommands).filter((e) => e.line >= viewportY).length;
            // -1 will scroll to the top
            markerIndex = this._getMarkers(skipEmptyCommands).length - markersBelowViewport - 1;
        }
        else if (this._currentMarker === Boundary.Bottom) {
            markerIndex = this._getMarkers(skipEmptyCommands).length - 1;
        }
        else if (this._currentMarker === Boundary.Top) {
            markerIndex = -1;
        }
        else if (this._isDisposable) {
            markerIndex = this._findPreviousMarker(skipEmptyCommands);
            this._currentMarker.dispose();
            this._isDisposable = false;
        }
        else {
            if (skipEmptyCommands && this._isEmptyCommand(this._currentMarker)) {
                markerIndex = this._findPreviousMarker(true);
            }
            else {
                markerIndex = this._getMarkers(skipEmptyCommands).indexOf(this._currentMarker) - 1;
            }
        }
        if (markerIndex < 0) {
            this._currentMarker = Boundary.Top;
            this._terminal.scrollToTop();
            this._resetNavigationDecorations();
            return;
        }
        this._currentMarker = this._getMarkers(skipEmptyCommands)[markerIndex];
        this._scrollToCommand(this._currentMarker, scrollPosition);
    }
    scrollToNextMark(scrollPosition = 1 /* ScrollPosition.Middle */, retainSelection = false, skipEmptyCommands = true) {
        if (!this._terminal) {
            return;
        }
        if (!retainSelection) {
            this._selectionStart = null;
        }
        let markerIndex;
        const currentLineY = typeof this._currentMarker === 'object'
            ? this.getTargetScrollLine(this._currentMarker.line, scrollPosition)
            : Math.min(getLine(this._terminal, this._currentMarker), this._terminal.buffer.active.baseY);
        const viewportY = this._terminal.buffer.active.viewportY;
        if (typeof this._currentMarker === 'object'
            ? !this._isMarkerInViewport(this._terminal, this._currentMarker)
            : currentLineY !== viewportY) {
            // The user has scrolled, find the line based on the current scroll position. This only
            // works when not retaining selection
            const markersAboveViewport = this._getMarkers(skipEmptyCommands).filter((e) => e.line <= viewportY).length;
            // markers.length will scroll to the bottom
            markerIndex = markersAboveViewport;
        }
        else if (this._currentMarker === Boundary.Bottom) {
            markerIndex = this._getMarkers(skipEmptyCommands).length;
        }
        else if (this._currentMarker === Boundary.Top) {
            markerIndex = 0;
        }
        else if (this._isDisposable) {
            markerIndex = this._findNextMarker(skipEmptyCommands);
            this._currentMarker.dispose();
            this._isDisposable = false;
        }
        else {
            if (skipEmptyCommands && this._isEmptyCommand(this._currentMarker)) {
                markerIndex = this._findNextMarker(true);
            }
            else {
                markerIndex = this._getMarkers(skipEmptyCommands).indexOf(this._currentMarker) + 1;
            }
        }
        if (markerIndex >= this._getMarkers(skipEmptyCommands).length) {
            this._currentMarker = Boundary.Bottom;
            this._terminal.scrollToBottom();
            this._resetNavigationDecorations();
            return;
        }
        this._currentMarker = this._getMarkers(skipEmptyCommands)[markerIndex];
        this._scrollToCommand(this._currentMarker, scrollPosition);
    }
    _scrollToCommand(marker, position) {
        const command = this._findCommand(marker);
        if (command) {
            this.revealCommand(command, position);
        }
        else {
            this._scrollToMarker(marker, position);
        }
    }
    _scrollToMarker(start, position, end, options) {
        if (!this._terminal) {
            return;
        }
        if (!this._isMarkerInViewport(this._terminal, start) || options?.forceScroll) {
            const line = this.getTargetScrollLine(toLineIndex(start), position);
            this._terminal.scrollToLine(line);
        }
        if (!options?.hideDecoration) {
            if (options?.bufferRange) {
                this._highlightBufferRange(options.bufferRange);
            }
            else {
                this.registerTemporaryDecoration(start, end, true);
            }
        }
    }
    _createMarkerForOffset(marker, offset) {
        if (offset === 0 && isMarker(marker)) {
            return marker;
        }
        else {
            const offsetMarker = this._terminal?.registerMarker(-this._terminal.buffer.active.cursorY +
                toLineIndex(marker) -
                this._terminal.buffer.active.baseY +
                offset);
            if (offsetMarker) {
                return offsetMarker;
            }
            else {
                throw new Error(`Could not register marker with offset ${toLineIndex(marker)}, ${offset}`);
            }
        }
    }
    revealCommand(command, position = 1 /* ScrollPosition.Middle */) {
        const marker = 'getOutput' in command ? command.marker : command.commandStartMarker;
        if (!this._terminal || !marker) {
            return;
        }
        const line = toLineIndex(marker);
        const promptRowCount = command.getPromptRowCount();
        const commandRowCount = command.getCommandRowCount();
        this._scrollToMarker(line - (promptRowCount - 1), position, line + (commandRowCount - 1));
    }
    revealRange(range) {
        this._scrollToMarker(range.start.y - 1, 1 /* ScrollPosition.Middle */, range.end.y - 1, {
            bufferRange: range,
            // Ensure scroll shows the line when sticky scroll is enabled
            forceScroll: !!this._configurationService.getValue("terminal.integrated.stickyScroll.enabled" /* TerminalContribSettingId.StickyScrollEnabled */),
        });
    }
    showCommandGuide(command) {
        if (!this._terminal) {
            return;
        }
        if (!command) {
            this._commandGuideDecorations.clear();
            this._activeCommandGuide = undefined;
            return;
        }
        if (this._activeCommandGuide === command) {
            return;
        }
        if (command.marker) {
            this._activeCommandGuide = command;
            // Highlight output
            const store = (this._commandGuideDecorations.value = new DisposableStore());
            if (!command.executedMarker || !command.endMarker) {
                return;
            }
            const startLine = command.marker.line - (command.getPromptRowCount() - 1);
            const decorationCount = toLineIndex(command.endMarker) - startLine;
            // Abort if the command is excessively long to avoid performance on hover/leave
            if (decorationCount > 200) {
                return;
            }
            for (let i = 0; i < decorationCount; i++) {
                const decoration = this._terminal.registerDecoration({
                    marker: this._createMarkerForOffset(startLine, i),
                });
                if (decoration) {
                    store.add(decoration);
                    let renderedElement;
                    store.add(decoration.onRender((element) => {
                        if (!renderedElement) {
                            renderedElement = element;
                            element.classList.add('terminal-command-guide');
                            if (i === 0) {
                                element.classList.add('top');
                            }
                            if (i === decorationCount - 1) {
                                element.classList.add('bottom');
                            }
                        }
                        if (this._terminal?.element) {
                            element.style.marginLeft = `-${getWindow(this._terminal.element).getComputedStyle(this._terminal.element).paddingLeft}`;
                        }
                    }));
                }
            }
        }
    }
    saveScrollState() {
        this._scrollState = { viewportY: this._terminal?.buffer.active.viewportY ?? 0 };
    }
    restoreScrollState() {
        if (this._scrollState && this._terminal) {
            this._terminal.scrollToLine(this._scrollState.viewportY);
            this._scrollState = undefined;
        }
    }
    _highlightBufferRange(range) {
        if (!this._terminal) {
            return;
        }
        this._resetNavigationDecorations();
        const startLine = range.start.y;
        const decorationCount = range.end.y - range.start.y + 1;
        for (let i = 0; i < decorationCount; i++) {
            const decoration = this._terminal.registerDecoration({
                marker: this._createMarkerForOffset(startLine - 1, i),
                x: range.start.x - 1,
                width: range.end.x - 1 - (range.start.x - 1) + 1,
                overviewRulerOptions: undefined,
            });
            if (decoration) {
                this._navigationDecorations?.push(decoration);
                let renderedElement;
                decoration.onRender((element) => {
                    if (!renderedElement) {
                        renderedElement = element;
                        element.classList.add('terminal-range-highlight');
                    }
                });
                decoration.onDispose(() => {
                    this._navigationDecorations = this._navigationDecorations?.filter((d) => d !== decoration);
                });
            }
        }
    }
    registerTemporaryDecoration(marker, endMarker, showOutline) {
        if (!this._terminal) {
            return;
        }
        this._resetNavigationDecorations();
        const color = this._themeService
            .getColorTheme()
            .getColor(TERMINAL_OVERVIEW_RULER_CURSOR_FOREGROUND_COLOR);
        const startLine = toLineIndex(marker);
        const decorationCount = endMarker ? toLineIndex(endMarker) - startLine + 1 : 1;
        for (let i = 0; i < decorationCount; i++) {
            const decoration = this._terminal.registerDecoration({
                marker: this._createMarkerForOffset(marker, i),
                width: this._terminal.cols,
                overviewRulerOptions: i === 0
                    ? {
                        color: color?.toString() || '#a0a0a0cc',
                    }
                    : undefined,
            });
            if (decoration) {
                this._navigationDecorations?.push(decoration);
                let renderedElement;
                decoration.onRender((element) => {
                    if (!renderedElement) {
                        renderedElement = element;
                        element.classList.add('terminal-scroll-highlight');
                        if (showOutline) {
                            element.classList.add('terminal-scroll-highlight-outline');
                        }
                        if (i === 0) {
                            element.classList.add('top');
                        }
                        if (i === decorationCount - 1) {
                            element.classList.add('bottom');
                        }
                    }
                    else {
                        element.classList.add('terminal-scroll-highlight');
                    }
                    if (this._terminal?.element) {
                        element.style.marginLeft = `-${getWindow(this._terminal.element).getComputedStyle(this._terminal.element).paddingLeft}`;
                    }
                });
                // TODO: This is not efficient for a large decorationCount
                decoration.onDispose(() => {
                    this._navigationDecorations = this._navigationDecorations?.filter((d) => d !== decoration);
                });
                // Number picked to align with symbol highlight in the editor
                if (showOutline) {
                    timeout(350).then(() => {
                        if (renderedElement) {
                            renderedElement.classList.remove('terminal-scroll-highlight-outline');
                        }
                    });
                }
            }
        }
    }
    scrollToLine(line, position) {
        this._terminal?.scrollToLine(this.getTargetScrollLine(line, position));
    }
    getTargetScrollLine(line, position) {
        // Middle is treated as 1/4 of the viewport's size because context below is almost always
        // more important than context above in the terminal.
        if (this._terminal && position === 1 /* ScrollPosition.Middle */) {
            return Math.max(line - Math.floor(this._terminal.rows / 4), 0);
        }
        return line;
    }
    _isMarkerInViewport(terminal, marker) {
        const viewportY = terminal.buffer.active.viewportY;
        const line = toLineIndex(marker);
        return line >= viewportY && line < viewportY + terminal.rows;
    }
    scrollToClosestMarker(startMarkerId, endMarkerId, highlight) {
        const detectionCapability = this._capabilities.get(4 /* TerminalCapability.BufferMarkDetection */);
        if (!detectionCapability) {
            return;
        }
        const startMarker = detectionCapability.getMark(startMarkerId);
        if (!startMarker) {
            return;
        }
        const endMarker = endMarkerId ? detectionCapability.getMark(endMarkerId) : startMarker;
        this._scrollToMarker(startMarker, 0 /* ScrollPosition.Top */, endMarker, { hideDecoration: !highlight });
    }
    selectToPreviousMark() {
        if (!this._terminal) {
            return;
        }
        if (this._selectionStart === null) {
            this._selectionStart = this._currentMarker;
        }
        if (this._capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            this.scrollToPreviousMark(1 /* ScrollPosition.Middle */, true, true);
        }
        else {
            this.scrollToPreviousMark(1 /* ScrollPosition.Middle */, true, false);
        }
        selectLines(this._terminal, this._currentMarker, this._selectionStart);
    }
    selectToNextMark() {
        if (!this._terminal) {
            return;
        }
        if (this._selectionStart === null) {
            this._selectionStart = this._currentMarker;
        }
        if (this._capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            this.scrollToNextMark(1 /* ScrollPosition.Middle */, true, true);
        }
        else {
            this.scrollToNextMark(1 /* ScrollPosition.Middle */, true, false);
        }
        selectLines(this._terminal, this._currentMarker, this._selectionStart);
    }
    selectToPreviousLine() {
        if (!this._terminal) {
            return;
        }
        if (this._selectionStart === null) {
            this._selectionStart = this._currentMarker;
        }
        this.scrollToPreviousLine(this._terminal, 1 /* ScrollPosition.Middle */, true);
        selectLines(this._terminal, this._currentMarker, this._selectionStart);
    }
    selectToNextLine() {
        if (!this._terminal) {
            return;
        }
        if (this._selectionStart === null) {
            this._selectionStart = this._currentMarker;
        }
        this.scrollToNextLine(this._terminal, 1 /* ScrollPosition.Middle */, true);
        selectLines(this._terminal, this._currentMarker, this._selectionStart);
    }
    scrollToPreviousLine(xterm, scrollPosition = 1 /* ScrollPosition.Middle */, retainSelection = false) {
        if (!retainSelection) {
            this._selectionStart = null;
        }
        if (this._currentMarker === Boundary.Top) {
            xterm.scrollToTop();
            return;
        }
        if (this._currentMarker === Boundary.Bottom) {
            this._currentMarker = this._registerMarkerOrThrow(xterm, this._getOffset(xterm) - 1);
        }
        else {
            const offset = this._getOffset(xterm);
            if (this._isDisposable) {
                this._currentMarker.dispose();
            }
            this._currentMarker = this._registerMarkerOrThrow(xterm, offset - 1);
        }
        this._isDisposable = true;
        this._scrollToMarker(this._currentMarker, scrollPosition);
    }
    scrollToNextLine(xterm, scrollPosition = 1 /* ScrollPosition.Middle */, retainSelection = false) {
        if (!retainSelection) {
            this._selectionStart = null;
        }
        if (this._currentMarker === Boundary.Bottom) {
            xterm.scrollToBottom();
            return;
        }
        if (this._currentMarker === Boundary.Top) {
            this._currentMarker = this._registerMarkerOrThrow(xterm, this._getOffset(xterm) + 1);
        }
        else {
            const offset = this._getOffset(xterm);
            if (this._isDisposable) {
                this._currentMarker.dispose();
            }
            this._currentMarker = this._registerMarkerOrThrow(xterm, offset + 1);
        }
        this._isDisposable = true;
        this._scrollToMarker(this._currentMarker, scrollPosition);
    }
    _registerMarkerOrThrow(xterm, cursorYOffset) {
        const marker = xterm.registerMarker(cursorYOffset);
        if (!marker) {
            throw new Error(`Could not create marker for ${cursorYOffset}`);
        }
        return marker;
    }
    _getOffset(xterm) {
        if (this._currentMarker === Boundary.Bottom) {
            return 0;
        }
        else if (this._currentMarker === Boundary.Top) {
            return 0 - (xterm.buffer.active.baseY + xterm.buffer.active.cursorY);
        }
        else {
            let offset = getLine(xterm, this._currentMarker);
            offset -= xterm.buffer.active.baseY + xterm.buffer.active.cursorY;
            return offset;
        }
    }
    _findPreviousMarker(skipEmptyCommands = false) {
        if (this._currentMarker === Boundary.Top) {
            return 0;
        }
        else if (this._currentMarker === Boundary.Bottom) {
            return this._getMarkers(skipEmptyCommands).length - 1;
        }
        let i;
        for (i = this._getMarkers(skipEmptyCommands).length - 1; i >= 0; i--) {
            if (this._getMarkers(skipEmptyCommands)[i].line < this._currentMarker.line) {
                return i;
            }
        }
        return -1;
    }
    _findNextMarker(skipEmptyCommands = false) {
        if (this._currentMarker === Boundary.Top) {
            return 0;
        }
        else if (this._currentMarker === Boundary.Bottom) {
            return this._getMarkers(skipEmptyCommands).length - 1;
        }
        let i;
        for (i = 0; i < this._getMarkers(skipEmptyCommands).length; i++) {
            if (this._getMarkers(skipEmptyCommands)[i].line > this._currentMarker.line) {
                return i;
            }
        }
        return this._getMarkers(skipEmptyCommands).length;
    }
};
MarkNavigationAddon = __decorate([
    __param(1, IConfigurationService),
    __param(2, IThemeService)
], MarkNavigationAddon);
export { MarkNavigationAddon };
export function getLine(xterm, marker) {
    // Use the _second last_ row as the last row is likely the prompt
    if (marker === Boundary.Bottom) {
        return xterm.buffer.active.baseY + xterm.rows - 1;
    }
    if (marker === Boundary.Top) {
        return 0;
    }
    return marker.line;
}
export function selectLines(xterm, start, end) {
    if (end === null) {
        end = Boundary.Bottom;
    }
    let startLine = getLine(xterm, start);
    let endLine = getLine(xterm, end);
    if (startLine > endLine) {
        const temp = startLine;
        startLine = endLine;
        endLine = temp;
    }
    // Subtract a line as the marker is on the line the command run, we do not want the next
    // command in the selection for the current command
    endLine -= 1;
    xterm.selectLines(startLine, endLine);
}
function isMarker(value) {
    return typeof value !== 'number';
}
function toLineIndex(line) {
    return isMarker(line) ? line.line : line;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya05hdmlnYXRpb25BZGRvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci94dGVybS9tYXJrTmF2aWdhdGlvbkFkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixpQkFBaUIsRUFDakIsT0FBTyxHQUNQLE1BQU0seUNBQXlDLENBQUE7QUFRaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsK0NBQStDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFHckcsSUFBSyxRQUdKO0FBSEQsV0FBSyxRQUFRO0lBQ1oscUNBQUcsQ0FBQTtJQUNILDJDQUFNLENBQUE7QUFDUCxDQUFDLEVBSEksUUFBUSxLQUFSLFFBQVEsUUFHWjtBQUVELE1BQU0sQ0FBTixJQUFrQixjQUdqQjtBQUhELFdBQWtCLGNBQWM7SUFDL0IsaURBQUcsQ0FBQTtJQUNILHVEQUFNLENBQUE7QUFDUCxDQUFDLEVBSGlCLGNBQWMsS0FBZCxjQUFjLFFBRy9CO0FBU00sSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBWWxELFFBQVEsQ0FBQyxRQUFrQjtRQUMxQixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtRQUN6QixJQUFJ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
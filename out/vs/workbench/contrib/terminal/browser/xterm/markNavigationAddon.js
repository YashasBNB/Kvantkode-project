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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya05hdmlnYXRpb25BZGRvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIveHRlcm0vbWFya05hdmlnYXRpb25BZGRvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEVBQ2pCLE9BQU8sR0FDUCxNQUFNLHlDQUF5QyxDQUFBO0FBUWhELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLCtDQUErQyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBR3JHLElBQUssUUFHSjtBQUhELFdBQUssUUFBUTtJQUNaLHFDQUFHLENBQUE7SUFDSCwyQ0FBTSxDQUFBO0FBQ1AsQ0FBQyxFQUhJLFFBQVEsS0FBUixRQUFRLFFBR1o7QUFFRCxNQUFNLENBQU4sSUFBa0IsY0FHakI7QUFIRCxXQUFrQixjQUFjO0lBQy9CLGlEQUFHLENBQUE7SUFDSCx1REFBTSxDQUFBO0FBQ1AsQ0FBQyxFQUhpQixjQUFjLEtBQWQsY0FBYyxRQUcvQjtBQVNNLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQVlsRCxRQUFRLENBQUMsUUFBa0I7UUFDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUE7UUFDekIsSUFBSSxDQUFD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
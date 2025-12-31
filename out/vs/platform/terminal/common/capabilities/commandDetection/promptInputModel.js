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
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ILogService, LogLevel } from '../../../../log/common/log.js';
import { throttle } from '../../../../../base/common/decorators.js';
var PromptInputState;
(function (PromptInputState) {
    PromptInputState[PromptInputState["Unknown"] = 0] = "Unknown";
    PromptInputState[PromptInputState["Input"] = 1] = "Input";
    PromptInputState[PromptInputState["Execute"] = 2] = "Execute";
})(PromptInputState || (PromptInputState = {}));
let PromptInputModel = class PromptInputModel extends Disposable {
    get value() {
        return this._value;
    }
    get prefix() {
        return this._value.substring(0, this._cursorIndex);
    }
    get suffix() {
        return this._value.substring(this._cursorIndex, this._ghostTextIndex === -1 ? undefined : this._ghostTextIndex);
    }
    get cursorIndex() {
        return this._cursorIndex;
    }
    get ghostTextIndex() {
        return this._ghostTextIndex;
    }
    constructor(_xterm, onCommandStart, onCommandStartChanged, onCommandExecuted, _logService) {
        super();
        this._xterm = _xterm;
        this._logService = _logService;
        this._state = 0 /* PromptInputState.Unknown */;
        this._commandStartX = 0;
        this._lastUserInput = '';
        this._value = '';
        this._cursorIndex = 0;
        this._ghostTextIndex = -1;
        this._onDidStartInput = this._register(new Emitter());
        this.onDidStartInput = this._onDidStartInput.event;
        this._onDidChangeInput = this._register(new Emitter());
        this.onDidChangeInput = this._onDidChangeInput.event;
        this._onDidFinishInput = this._register(new Emitter());
        this.onDidFinishInput = this._onDidFinishInput.event;
        this._onDidInterrupt = this._register(new Emitter());
        this.onDidInterrupt = this._onDidInterrupt.event;
        this._register(Event.any(this._xterm.onCursorMove, this._xterm.onData, this._xterm.onWriteParsed)(() => this._sync()));
        this._register(this._xterm.onData((e) => this._handleUserInput(e)));
        this._register(onCommandStart((e) => this._handleCommandStart(e)));
        this._register(onCommandStartChanged(() => this._handleCommandStartChanged()));
        this._register(onCommandExecuted(() => this._handleCommandExecuted()));
        this._register(this.onDidStartInput(() => this._logCombinedStringIfTrace('PromptInputModel#onDidStartInput')));
        this._register(this.onDidChangeInput(() => this._logCombinedStringIfTrace('PromptInputModel#onDidChangeInput')));
        this._register(this.onDidFinishInput(() => this._logCombinedStringIfTrace('PromptInputModel#onDidFinishInput')));
        this._register(this.onDidInterrupt(() => this._logCombinedStringIfTrace('PromptInputModel#onDidInterrupt')));
    }
    _logCombinedStringIfTrace(message) {
        // Only generate the combined string if trace
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace(message, this.getCombinedString());
        }
    }
    setShellType(shellType) {
        this._shellType = shellType;
    }
    setContinuationPrompt(value) {
        this._continuationPrompt = value;
        this._sync();
    }
    setLastPromptLine(value) {
        this._lastPromptLine = value;
        this._sync();
    }
    setConfidentCommandLine(value) {
        if (this._value !== value) {
            this._value = value;
            this._cursorIndex = -1;
            this._ghostTextIndex = -1;
            this._onDidChangeInput.fire(this._createStateObject());
        }
    }
    getCombinedString(emptyStringWhenEmpty) {
        const value = this._value.replaceAll('\n', '\u23CE');
        if (this._cursorIndex === -1) {
            return value;
        }
        let result = `${value.substring(0, this.cursorIndex)}|`;
        if (this.ghostTextIndex !== -1) {
            result += `${value.substring(this.cursorIndex, this.ghostTextIndex)}[`;
            result += `${value.substring(this.ghostTextIndex)}]`;
        }
        else {
            result += value.substring(this.cursorIndex);
        }
        if (result === '|' && emptyStringWhenEmpty) {
            return '';
        }
        return result;
    }
    serialize() {
        return {
            modelState: this._createStateObject(),
            commandStartX: this._commandStartX,
            lastPromptLine: this._lastPromptLine,
            continuationPrompt: this._continuationPrompt,
            lastUserInput: this._lastUserInput,
        };
    }
    deserialize(serialized) {
        this._value = serialized.modelState.value;
        this._cursorIndex = serialized.modelState.cursorIndex;
        this._ghostTextIndex = serialized.modelState.ghostTextIndex;
        this._commandStartX = serialized.commandStartX;
        this._lastPromptLine = serialized.lastPromptLine;
        this._continuationPrompt = serialized.continuationPrompt;
        this._lastUserInput = serialized.lastUserInput;
    }
    _handleCommandStart(command) {
        if (this._state === 1 /* PromptInputState.Input */) {
            return;
        }
        this._state = 1 /* PromptInputState.Input */;
        this._commandStartMarker = command.marker;
        this._commandStartX = this._xterm.buffer.active.cursorX;
        this._value = '';
        this._cursorIndex = 0;
        this._onDidStartInput.fire(this._createStateObject());
        this._onDidChangeInput.fire(this._createStateObject());
        // Trigger a sync if prompt terminator is set as that could adjust the command start X
        if (this._lastPromptLine) {
            if (this._commandStartX !== this._lastPromptLine.length) {
                const line = this._xterm.buffer.active.getLine(this._commandStartMarker.line);
                if (line?.translateToString(true).startsWith(this._lastPromptLine)) {
                    this._commandStartX = this._lastPromptLine.length;
                    this._sync();
                }
            }
        }
    }
    _handleCommandStartChanged() {
        if (this._state !== 1 /* PromptInputState.Input */) {
            return;
        }
        this._commandStartX = this._xterm.buffer.active.cursorX;
        this._onDidChangeInput.fire(this._createStateObject());
        this._sync();
    }
    _handleCommandExecuted() {
        if (this._state === 2 /* PromptInputState.Execute */) {
            return;
        }
        this._cursorIndex = -1;
        // Remove any ghost text from the input if it exists on execute
        if (this._ghostTextIndex !== -1) {
            this._value = this._value.substring(0, this._ghostTextIndex);
            this._ghostTextIndex = -1;
        }
        const event = this._createStateObject();
        if (this._lastUserInput === '\u0003') {
            this._lastUserInput = '';
            this._onDidInterrupt.fire(event);
        }
        this._state = 2 /* PromptInputState.Execute */;
        this._onDidFinishInput.fire(event);
        this._onDidChangeInput.fire(event);
    }
    _sync() {
        try {
            this._doSync();
        }
        catch (e) {
            this._logService.error('Error while syncing prompt input model', e);
        }
    }
    _doSync() {
        if (this._state !== 1 /* PromptInputState.Input */) {
            return;
        }
        let commandStartY = this._commandStartMarker?.line;
        if (commandStartY === undefined) {
            return;
        }
        const buffer = this._xterm.buffer.active;
        let line = buffer.getLine(commandStartY);
        const absoluteCursorY = buffer.baseY + buffer.cursorY;
        let cursorIndex;
        let commandLine = line?.translateToString(true, this._commandStartX);
        if (this._shellType === "fish" /* PosixShellType.Fish */ && (!line || !commandLine)) {
            commandStartY += 1;
            line = buffer.getLine(commandStartY);
            if (line) {
                commandLine = line.translateToString(true);
                cursorIndex =
                    absoluteCursorY === commandStartY ? buffer.cursorX : commandLine?.trimEnd().length;
            }
        }
        if (line === undefined || commandLine === undefined) {
            this._logService.trace(`PromptInputModel#_sync: no line`);
            return;
        }
        let value = commandLine;
        let ghostTextIndex = -1;
        if (cursorIndex === undefined) {
            if (absoluteCursorY === commandStartY) {
                cursorIndex = this._getRelativeCursorIndex(this._commandStartX, buffer, line);
            }
            else {
                cursorIndex = commandLine.trimEnd().length;
            }
        }
        // From command start line to cursor line
        for (let y = commandStartY + 1; y <= absoluteCursorY; y++) {
            const nextLine = buffer.getLine(y);
            const lineText = nextLine?.translateToString(true);
            if (lineText && nextLine) {
                // Check if the line wrapped without a new line (continuation) or
                // we're on the last line and the continuation prompt is not present, so we need to add the value
                if (nextLine.isWrapped ||
                    (absoluteCursorY === y &&
                        this._continuationPrompt &&
                        !this._lineContainsContinuationPrompt(lineText))) {
                    value += `${lineText}`;
                    const relativeCursorIndex = this._getRelativeCursorIndex(0, buffer, nextLine);
                    if (absoluteCursorY === y) {
                        cursorIndex += relativeCursorIndex;
                    }
                    else {
                        cursorIndex += lineText.length;
                    }
                }
                else if (this._shellType === "fish" /* PosixShellType.Fish */) {
                    if (value.endsWith('\\')) {
                        // Trim off the trailing backslash
                        value = value.substring(0, value.length - 1);
                        value += `${lineText.trim()}`;
                        cursorIndex += lineText.trim().length - 1;
                    }
                    else {
                        if (/^ {6,}/.test(lineText)) {
                            // Was likely a new line
                            value += `\n${lineText.trim()}`;
                            cursorIndex += lineText.trim().length + 1;
                        }
                        else {
                            value += lineText;
                            cursorIndex += lineText.length;
                        }
                    }
                }
                // Verify continuation prompt if we have it, if this line doesn't have it then the
                // user likely just pressed enter.
                else if (this._continuationPrompt === undefined ||
                    this._lineContainsContinuationPrompt(lineText)) {
                    const trimmedLineText = this._trimContinuationPrompt(lineText);
                    value += `\n${trimmedLineText}`;
                    if (absoluteCursorY === y) {
                        const continuationCellWidth = this._getContinuationPromptCellWidth(nextLine, lineText);
                        const relativeCursorIndex = this._getRelativeCursorIndex(continuationCellWidth, buffer, nextLine);
                        cursorIndex += relativeCursorIndex + 1;
                    }
                    else {
                        cursorIndex += trimmedLineText.length + 1;
                    }
                }
            }
        }
        // Below cursor line
        for (let y = absoluteCursorY + 1; y < buffer.baseY + this._xterm.rows; y++) {
            const belowCursorLine = buffer.getLine(y);
            const lineText = belowCursorLine?.translateToString(true);
            if (lineText && belowCursorLine) {
                if (this._shellType === "fish" /* PosixShellType.Fish */) {
                    value += `${lineText}`;
                }
                else if (this._continuationPrompt === undefined ||
                    this._lineContainsContinuationPrompt(lineText)) {
                    value += `\n${this._trimContinuationPrompt(lineText)}`;
                }
                else {
                    value += lineText;
                }
            }
            else {
                break;
            }
        }
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace(`PromptInputModel#_sync: ${this.getCombinedString()}`);
        }
        // Adjust trailing whitespace
        {
            let trailingWhitespace = this._value.length - this._value.trimEnd().length;
            // Handle backspace key
            if (this._lastUserInput === '\x7F') {
                this._lastUserInput = '';
                if (cursorIndex === this._cursorIndex - 1) {
                    // If trailing whitespace is being increased by removing a non-whitespace character
                    if (this._value.trimEnd().length > value.trimEnd().length &&
                        value.trimEnd().length <= cursorIndex) {
                        trailingWhitespace = Math.max(this._value.length - 1 - value.trimEnd().length, 0);
                    }
                    // Standard case; subtract from trailing whitespace
                    else {
                        trailingWhitespace = Math.max(trailingWhitespace - 1, 0);
                    }
                }
            }
            // Handle delete key
            if (this._lastUserInput === '\x1b[3~') {
                this._lastUserInput = '';
                if (cursorIndex === this._cursorIndex) {
                    trailingWhitespace = Math.max(trailingWhitespace - 1, 0);
                }
            }
            const valueLines = value.split('\n');
            const isMultiLine = valueLines.length > 1;
            const valueEndTrimmed = value.trimEnd();
            if (!isMultiLine) {
                // Adjust trimmed whitespace value based on cursor position
                if (valueEndTrimmed.length < value.length) {
                    // Handle space key
                    if (this._lastUserInput === ' ') {
                        this._lastUserInput = '';
                        if (cursorIndex > valueEndTrimmed.length && cursorIndex > this._cursorIndex) {
                            trailingWhitespace++;
                        }
                    }
                    trailingWhitespace = Math.max(cursorIndex - valueEndTrimmed.length, trailingWhitespace, 0);
                }
                // Handle case where a non-space character is inserted in the middle of trailing whitespace
                const charBeforeCursor = cursorIndex === 0 ? '' : value[cursorIndex - 1];
                if (trailingWhitespace > 0 &&
                    cursorIndex === this._cursorIndex + 1 &&
                    this._lastUserInput !== '' &&
                    charBeforeCursor !== ' ') {
                    trailingWhitespace = this._value.length - this._cursorIndex;
                }
            }
            if (isMultiLine) {
                valueLines[valueLines.length - 1] = valueLines.at(-1)?.trimEnd() ?? '';
                const continuationOffset = (valueLines.length - 1) * (this._continuationPrompt?.length ?? 0);
                trailingWhitespace = Math.max(0, cursorIndex - value.length - continuationOffset);
            }
            value = valueLines.map((e) => e.trimEnd()).join('\n') + ' '.repeat(trailingWhitespace);
        }
        ghostTextIndex = this._scanForGhostText(buffer, line, cursorIndex);
        if (this._value !== value ||
            this._cursorIndex !== cursorIndex ||
            this._ghostTextIndex !== ghostTextIndex) {
            this._value = value;
            this._cursorIndex = cursorIndex;
            this._ghostTextIndex = ghostTextIndex;
            this._onDidChangeInput.fire(this._createStateObject());
        }
    }
    _handleUserInput(e) {
        this._lastUserInput = e;
    }
    /**
     * Detect ghost text by looking for italic or dim text in or after the cursor and
     * non-italic/dim text in the first non-whitespace cell following command start and before the cursor.
     */
    _scanForGhostText(buffer, line, cursorIndex) {
        if (!this.value.trim().length) {
            return -1;
        }
        // Check last non-whitespace character has non-ghost text styles
        let ghostTextIndex = -1;
        let proceedWithGhostTextCheck = false;
        let x = buffer.cursorX;
        while (x > 0) {
            const cell = line.getCell(--x);
            if (!cell) {
                break;
            }
            if (cell.getChars().trim().length > 0) {
                proceedWithGhostTextCheck = !this._isCellStyledLikeGhostText(cell);
                break;
            }
        }
        // Check to the end of the line for possible ghost text. For example pwsh's ghost text
        // can look like this `Get-|Ch[ildItem]`
        if (proceedWithGhostTextCheck) {
            let potentialGhostIndexOffset = 0;
            let x = buffer.cursorX;
            while (x < line.length) {
                const cell = line.getCell(x++);
                if (!cell || cell.getCode() === 0) {
                    break;
                }
                if (this._isCellStyledLikeGhostText(cell)) {
                    ghostTextIndex = cursorIndex + potentialGhostIndexOffset;
                    break;
                }
                potentialGhostIndexOffset += cell.getChars().length;
            }
        }
        // Ghost text may not be italic or dimmed, but will have a different style than the
        // rest of the line that precedes it.
        if (ghostTextIndex === -1) {
            ghostTextIndex = this._scanForGhostTextAdvanced(buffer, line, cursorIndex);
        }
        if (ghostTextIndex > -1 && this.value.substring(ghostTextIndex).endsWith(' ')) {
            this._value = this.value.trim();
            if (!this.value.substring(ghostTextIndex)) {
                ghostTextIndex = -1;
            }
        }
        return ghostTextIndex;
    }
    _scanForGhostTextAdvanced(buffer, line, cursorIndex) {
        let ghostTextIndex = -1;
        let currentPos = buffer.cursorX; // Start scanning from the cursor position
        // Map to store styles and their corresponding positions
        const styleMap = new Map();
        // Identify the last non-whitespace character in the line
        let lastNonWhitespaceCell = line.getCell(currentPos);
        let nextCell = lastNonWhitespaceCell;
        // Scan from the cursor position to the end of the line
        while (nextCell && currentPos < line.length) {
            const styleKey = this._getCellStyleAsString(nextCell);
            // Track all occurrences of each unique style in the line
            styleMap.set(styleKey, [...(styleMap.get(styleKey) ?? []), currentPos]);
            // Move to the next cell
            nextCell = line.getCell(++currentPos);
            // Update `lastNonWhitespaceCell` only if the new cell contains visible characters
            if (nextCell?.getChars().trim().length) {
                lastNonWhitespaceCell = nextCell;
            }
        }
        // If there's no valid last non-whitespace cell OR the first and last styles match (indicating no ghost text)
        if (!lastNonWhitespaceCell?.getChars().trim().length ||
            this._cellStylesMatch(line.getCell(this._commandStartX), lastNonWhitespaceCell)) {
            return -1;
        }
        // Retrieve the positions of all cells with the same style as `lastNonWhitespaceCell`
        const positionsWithGhostStyle = styleMap.get(this._getCellStyleAsString(lastNonWhitespaceCell));
        if (positionsWithGhostStyle) {
            // Ensure these positions are contiguous
            for (let i = 1; i < positionsWithGhostStyle.length; i++) {
                if (positionsWithGhostStyle[i] !== positionsWithGhostStyle[i - 1] + 1) {
                    // Discontinuous styles, so may be syntax highlighting vs ghost text
                    return -1;
                }
            }
            // Calculate the ghost text start index
            if (buffer.baseY + buffer.cursorY === this._commandStartMarker?.line) {
                ghostTextIndex = positionsWithGhostStyle[0] - this._commandStartX;
            }
            else {
                ghostTextIndex = positionsWithGhostStyle[0];
            }
        }
        // Ensure no earlier cells in the line match `lastNonWhitespaceCell`'s style,
        // which would indicate the text is not ghost text.
        if (ghostTextIndex !== -1) {
            for (let checkPos = buffer.cursorX; checkPos >= this._commandStartX; checkPos--) {
                const checkCell = line.getCell(checkPos);
                if (!checkCell?.getChars.length) {
                    continue;
                }
                if (checkCell &&
                    checkCell.getCode() !== 0 &&
                    this._cellStylesMatch(lastNonWhitespaceCell, checkCell)) {
                    return -1;
                }
            }
        }
        return ghostTextIndex >= cursorIndex ? ghostTextIndex : -1;
    }
    _getCellStyleAsString(cell) {
        return `${cell.getFgColor()}${cell.getBgColor()}${cell.isBold()}${cell.isItalic()}${cell.isDim()}${cell.isUnderline()}${cell.isBlink()}${cell.isInverse()}${cell.isInvisible()}${cell.isStrikethrough()}${cell.isOverline()}${cell.getFgColorMode()}${cell.getBgColorMode()}`;
    }
    _cellStylesMatch(a, b) {
        if (!a || !b) {
            return false;
        }
        return (a.getFgColor() === b.getFgColor() &&
            a.getBgColor() === b.getBgColor() &&
            a.isBold() === b.isBold() &&
            a.isItalic() === b.isItalic() &&
            a.isDim() === b.isDim() &&
            a.isUnderline() === b.isUnderline() &&
            a.isBlink() === b.isBlink() &&
            a.isInverse() === b.isInverse() &&
            a.isInvisible() === b.isInvisible() &&
            a.isStrikethrough() === b.isStrikethrough() &&
            a.isOverline() === b.isOverline() &&
            a?.getBgColorMode() === b?.getBgColorMode() &&
            a?.getFgColorMode() === b?.getFgColorMode());
    }
    _trimContinuationPrompt(lineText) {
        if (this._lineContainsContinuationPrompt(lineText)) {
            lineText = lineText.substring(this._continuationPrompt.length);
        }
        return lineText;
    }
    _lineContainsContinuationPrompt(lineText) {
        return !!(this._continuationPrompt && lineText.startsWith(this._continuationPrompt.trimEnd()));
    }
    _getContinuationPromptCellWidth(line, lineText) {
        if (!this._continuationPrompt || !lineText.startsWith(this._continuationPrompt.trimEnd())) {
            return 0;
        }
        let buffer = '';
        let x = 0;
        let cell;
        while (buffer !== this._continuationPrompt) {
            cell = line.getCell(x++);
            if (!cell) {
                break;
            }
            buffer += cell.getChars();
        }
        return x;
    }
    _getRelativeCursorIndex(startCellX, buffer, line) {
        return line?.translateToString(true, startCellX, buffer.cursorX).length ?? 0;
    }
    _isCellStyledLikeGhostText(cell) {
        return !!(cell.isItalic() || cell.isDim());
    }
    _createStateObject() {
        return Object.freeze({
            value: this._value,
            prefix: this.prefix,
            suffix: this.suffix,
            cursorIndex: this._cursorIndex,
            ghostTextIndex: this._ghostTextIndex,
        });
    }
};
__decorate([
    throttle(0)
], PromptInputModel.prototype, "_sync", null);
PromptInputModel = __decorate([
    __param(4, ILogService)
], PromptInputModel);
export { PromptInputModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SW5wdXRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi9jYXBhYmlsaXRpZXMvY29tbWFuZERldGVjdGlvbi9wcm9tcHRJbnB1dE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBS25FLElBQVcsZ0JBSVY7QUFKRCxXQUFXLGdCQUFnQjtJQUMxQiw2REFBVyxDQUFBO0lBQ1gseURBQVMsQ0FBQTtJQUNULDZEQUFXLENBQUE7QUFDWixDQUFDLEVBSlUsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQUkxQjtBQTJETSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFZL0MsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFDRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUNELElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQzNCLElBQUksQ0FBQyxZQUFZLEVBQ2pCLElBQUksQ0FBQyxlQUFlLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENB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
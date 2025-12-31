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
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import * as path from '../../../../base/common/path.js';
import { dirname } from '../../../../base/common/resources.js';
import { commonPrefixLength, getLeadingWhitespace, isFalsyOrWhitespace, splitLines, } from '../../../../base/common/strings.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { Text } from './snippetParser.js';
import * as nls from '../../../../nls.js';
import { WORKSPACE_EXTENSION, isSingleFolderWorkspaceIdentifier, toWorkspaceIdentifier, isEmptyWorkspaceIdentifier, } from '../../../../platform/workspace/common/workspace.js';
export const KnownSnippetVariableNames = Object.freeze({
    CURRENT_YEAR: true,
    CURRENT_YEAR_SHORT: true,
    CURRENT_MONTH: true,
    CURRENT_DATE: true,
    CURRENT_HOUR: true,
    CURRENT_MINUTE: true,
    CURRENT_SECOND: true,
    CURRENT_DAY_NAME: true,
    CURRENT_DAY_NAME_SHORT: true,
    CURRENT_MONTH_NAME: true,
    CURRENT_MONTH_NAME_SHORT: true,
    CURRENT_SECONDS_UNIX: true,
    CURRENT_TIMEZONE_OFFSET: true,
    SELECTION: true,
    CLIPBOARD: true,
    TM_SELECTED_TEXT: true,
    TM_CURRENT_LINE: true,
    TM_CURRENT_WORD: true,
    TM_LINE_INDEX: true,
    TM_LINE_NUMBER: true,
    TM_FILENAME: true,
    TM_FILENAME_BASE: true,
    TM_DIRECTORY: true,
    TM_FILEPATH: true,
    CURSOR_INDEX: true, // 0-offset
    CURSOR_NUMBER: true, // 1-offset
    RELATIVE_FILEPATH: true,
    BLOCK_COMMENT_START: true,
    BLOCK_COMMENT_END: true,
    LINE_COMMENT: true,
    WORKSPACE_NAME: true,
    WORKSPACE_FOLDER: true,
    RANDOM: true,
    RANDOM_HEX: true,
    UUID: true,
});
export class CompositeSnippetVariableResolver {
    constructor(_delegates) {
        this._delegates = _delegates;
        //
    }
    resolve(variable) {
        for (const delegate of this._delegates) {
            const value = delegate.resolve(variable);
            if (value !== undefined) {
                return value;
            }
        }
        return undefined;
    }
}
export class SelectionBasedVariableResolver {
    constructor(_model, _selection, _selectionIdx, _overtypingCapturer) {
        this._model = _model;
        this._selection = _selection;
        this._selectionIdx = _selectionIdx;
        this._overtypingCapturer = _overtypingCapturer;
        //
    }
    resolve(variable) {
        const { name } = variable;
        if (name === 'SELECTION' || name === 'TM_SELECTED_TEXT') {
            let value = this._model.getValueInRange(this._selection) || undefined;
            let isMultiline = this._selection.startLineNumber !== this._selection.endLineNumber;
            // If there was no selected text, try to get last overtyped text
            if (!value && this._overtypingCapturer) {
                const info = this._overtypingCapturer.getLastOvertypedInfo(this._selectionIdx);
                if (info) {
                    value = info.value;
                    isMultiline = info.multiline;
                }
            }
            if (value && isMultiline && variable.snippet) {
                // Selection is a multiline string which we indentation we now
                // need to adjust. We compare the indentation of this variable
                // with the indentation at the editor position and add potential
                // extra indentation to the value
                const line = this._model.getLineContent(this._selection.startLineNumber);
                const lineLeadingWhitespace = getLeadingWhitespace(line, 0, this._selection.startColumn - 1);
                let varLeadingWhitespace = lineLeadingWhitespace;
                variable.snippet.walk((marker) => {
                    if (marker === variable) {
                        return false;
                    }
                    if (marker instanceof Text) {
                        varLeadingWhitespace = getLeadingWhitespace(splitLines(marker.value).pop());
                    }
                    return true;
                });
                const whitespaceCommonLength = commonPrefixLength(varLeadingWhitespace, lineLeadingWhitespace);
                value = value.replace(/(\r\n|\r|\n)(.*)/g, (m, newline, rest) => `${newline}${varLeadingWhitespace.substr(whitespaceCommonLength)}${rest}`);
            }
            return value;
        }
        else if (name === 'TM_CURRENT_LINE') {
            return this._model.getLineContent(this._selection.positionLineNumber);
        }
        else if (name === 'TM_CURRENT_WORD') {
            const info = this._model.getWordAtPosition({
                lineNumber: this._selection.positionLineNumber,
                column: this._selection.positionColumn,
            });
            return (info && info.word) || undefined;
        }
        else if (name === 'TM_LINE_INDEX') {
            return String(this._selection.positionLineNumber - 1);
        }
        else if (name === 'TM_LINE_NUMBER') {
            return String(this._selection.positionLineNumber);
        }
        else if (name === 'CURSOR_INDEX') {
            return String(this._selectionIdx);
        }
        else if (name === 'CURSOR_NUMBER') {
            return String(this._selectionIdx + 1);
        }
        return undefined;
    }
}
export class ModelBasedVariableResolver {
    constructor(_labelService, _model) {
        this._labelService = _labelService;
        this._model = _model;
        //
    }
    resolve(variable) {
        const { name } = variable;
        if (name === 'TM_FILENAME') {
            return path.basename(this._model.uri.fsPath);
        }
        else if (name === 'TM_FILENAME_BASE') {
            const name = path.basename(this._model.uri.fsPath);
            const idx = name.lastIndexOf('.');
            if (idx <= 0) {
                return name;
            }
            else {
                return name.slice(0, idx);
            }
        }
        else if (name === 'TM_DIRECTORY') {
            if (path.dirname(this._model.uri.fsPath) === '.') {
                return '';
            }
            return this._labelService.getUriLabel(dirname(this._model.uri));
        }
        else if (name === 'TM_FILEPATH') {
            return this._labelService.getUriLabel(this._model.uri);
        }
        else if (name === 'RELATIVE_FILEPATH') {
            return this._labelService.getUriLabel(this._model.uri, { relative: true, noPrefix: true });
        }
        return undefined;
    }
}
export class ClipboardBasedVariableResolver {
    constructor(_readClipboardText, _selectionIdx, _selectionCount, _spread) {
        this._readClipboardText = _readClipboardText;
        this._selectionIdx = _selectionIdx;
        this._selectionCount = _selectionCount;
        this._spread = _spread;
        //
    }
    resolve(variable) {
        if (variable.name !== 'CLIPBOARD') {
            return undefined;
        }
        const clipboardText = this._readClipboardText();
        if (!clipboardText) {
            return undefined;
        }
        // `spread` is assigning each cursor a line of the clipboard
        // text whenever there the line count equals the cursor count
        // and when enabled
        if (this._spread) {
            const lines = clipboardText.split(/\r\n|\n|\r/).filter((s) => !isFalsyOrWhitespace(s));
            if (lines.length === this._selectionCount) {
                return lines[this._selectionIdx];
            }
        }
        return clipboardText;
    }
}
let CommentBasedVariableResolver = class CommentBasedVariableResolver {
    constructor(_model, _selection, _languageConfigurationService) {
        this._model = _model;
        this._selection = _selection;
        this._languageConfigurationService = _languageConfigurationService;
        //
    }
    resolve(variable) {
        const { name } = variable;
        const langId = this._model.getLanguageIdAtPosition(this._selection.selectionStartLineNumber, this._selection.selectionStartColumn);
        const config = this._languageConfigurationService.getLanguageConfiguration(langId).comments;
        if (!config) {
            return undefined;
        }
        if (name === 'LINE_COMMENT') {
            return config.lineCommentToken || undefined;
        }
        else if (name === 'BLOCK_COMMENT_START') {
            return config.blockCommentStartToken || undefined;
        }
        else if (name === 'BLOCK_COMMENT_END') {
            return config.blockCommentEndToken || undefined;
        }
        return undefined;
    }
};
CommentBasedVariableResolver = __decorate([
    __param(2, ILanguageConfigurationService)
], CommentBasedVariableResolver);
export { CommentBasedVariableResolver };
export class TimeBasedVariableResolver {
    constructor() {
        this._date = new Date();
    }
    static { this.dayNames = [
        nls.localize('Sunday', 'Sunday'),
        nls.localize('Monday', 'Monday'),
        nls.localize('Tuesday', 'Tuesday'),
        nls.localize('Wednesday', 'Wednesday'),
        nls.localize('Thursday', 'Thursday'),
        nls.localize('Friday', 'Friday'),
        nls.localize('Saturday', 'Saturday'),
    ]; }
    static { this.dayNamesShort = [
        nls.localize('SundayShort', 'Sun'),
        nls.localize('MondayShort', 'Mon'),
        nls.localize('TuesdayShort', 'Tue'),
        nls.localize('WednesdayShort', 'Wed'),
        nls.localize('ThursdayShort', 'Thu'),
        nls.localize('FridayShort', 'Fri'),
        nls.localize('SaturdayShort', 'Sat'),
    ]; }
    static { this.monthNames = [
        nls.localize('January', 'January'),
        nls.localize('February', 'February'),
        nls.localize('March', 'March'),
        nls.localize('April', 'April'),
        nls.localize('May', 'May'),
        nls.localize('June', 'June'),
        nls.localize('July', 'July'),
        nls.localize('August', 'August'),
        nls.localize('September', 'September'),
        nls.localize('October', 'October'),
        nls.localize('November', 'November'),
        nls.localize('December', 'December'),
    ]; }
    static { this.monthNamesShort = [
        nls.localize('JanuaryShort', 'Jan'),
        nls.localize('FebruaryShort', 'Feb'),
        nls.localize('MarchShort', 'Mar'),
        nls.localize('AprilShort', 'Apr'),
        nls.localize('MayShort', 'May'),
        nls.localize('JuneShort', 'Jun'),
        nls.localize('JulyShort', 'Jul'),
        nls.localize('AugustShort', 'Aug'),
        nls.localize('SeptemberShort', 'Sep'),
        nls.localize('OctoberShort', 'Oct'),
        nls.localize('NovemberShort', 'Nov'),
        nls.localize('DecemberShort', 'Dec'),
    ]; }
    resolve(variable) {
        const { name } = variable;
        if (name === 'CURRENT_YEAR') {
            return String(this._date.getFullYear());
        }
        else if (name === 'CURRENT_YEAR_SHORT') {
            return String(this._date.getFullYear()).slice(-2);
        }
        else if (name === 'CURRENT_MONTH') {
            return String(this._date.getMonth().valueOf() + 1).padStart(2, '0');
        }
        else if (name === 'CURRENT_DATE') {
            return String(this._date.getDate().valueOf()).padStart(2, '0');
        }
        else if (name === 'CURRENT_HOUR') {
            return String(this._date.getHours().valueOf()).padStart(2, '0');
        }
        else if (name === 'CURRENT_MINUTE') {
            return String(this._date.getMinutes().valueOf()).padStart(2, '0');
        }
        else if (name === 'CURRENT_SECOND') {
            return String(this._date.getSeconds().valueOf()).padStart(2, '0');
        }
        else if (name === 'CURRENT_DAY_NAME') {
            return TimeBasedVariableResolver.dayNames[this._date.getDay()];
        }
        else if (name === 'CURRENT_DAY_NAME_SHORT') {
            return TimeBasedVariableResolver.dayNamesShort[this._date.getDay()];
        }
        else if (name === 'CURRENT_MONTH_NAME') {
            return TimeBasedVariableResolver.monthNames[this._date.getMonth()];
        }
        else if (name === 'CURRENT_MONTH_NAME_SHORT') {
            return TimeBasedVariableResolver.monthNamesShort[this._date.getMonth()];
        }
        else if (name === 'CURRENT_SECONDS_UNIX') {
            return String(Math.floor(this._date.getTime() / 1000));
        }
        else if (name === 'CURRENT_TIMEZONE_OFFSET') {
            const rawTimeOffset = this._date.getTimezoneOffset();
            const sign = rawTimeOffset > 0 ? '-' : '+';
            const hours = Math.trunc(Math.abs(rawTimeOffset / 60));
            const hoursString = hours < 10 ? '0' + hours : hours;
            const minutes = Math.abs(rawTimeOffset) - hours * 60;
            const minutesString = minutes < 10 ? '0' + minutes : minutes;
            return sign + hoursString + ':' + minutesString;
        }
        return undefined;
    }
}
export class WorkspaceBasedVariableResolver {
    constructor(_workspaceService) {
        this._workspaceService = _workspaceService;
        //
    }
    resolve(variable) {
        if (!this._workspaceService) {
            return undefined;
        }
        const workspaceIdentifier = toWorkspaceIdentifier(this._workspaceService.getWorkspace());
        if (isEmptyWorkspaceIdentifier(workspaceIdentifier)) {
            return undefined;
        }
        if (variable.name === 'WORKSPACE_NAME') {
            return this._resolveWorkspaceName(workspaceIdentifier);
        }
        else if (variable.name === 'WORKSPACE_FOLDER') {
            return this._resoveWorkspacePath(workspaceIdentifier);
        }
        return undefined;
    }
    _resolveWorkspaceName(workspaceIdentifier) {
        if (isSingleFolderWorkspaceIdentifier(workspaceIdentifier)) {
            return path.basename(workspaceIdentifier.uri.path);
        }
        let filename = path.basename(workspaceIdentifier.configPath.path);
        if (filename.endsWith(WORKSPACE_EXTENSION)) {
            filename = filename.substr(0, filename.length - WORKSPACE_EXTENSION.length - 1);
        }
        return filename;
    }
    _resoveWorkspacePath(workspaceIdentifier) {
        if (isSingleFolderWorkspaceIdentifier(workspaceIdentifier)) {
            return normalizeDriveLetter(workspaceIdentifier.uri.fsPath);
        }
        const filename = path.basename(workspaceIdentifier.configPath.path);
        let folderpath = workspaceIdentifier.configPath.fsPath;
        if (folderpath.endsWith(filename)) {
            folderpath = folderpath.substr(0, folderpath.length - filename.length - 1);
        }
        return folderpath ? normalizeDriveLetter(folderpath) : '/';
    }
}
export class RandomBasedVariableResolver {
    resolve(variable) {
        const { name } = variable;
        if (name === 'RANDOM') {
            return Math.random().toString().slice(-6);
        }
        else if (name === 'RANDOM_HEX') {
            return Math.random().toString(16).slice(-6);
        }
        else if (name === 'UUID') {
            return generateUuid();
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFZhcmlhYmxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NuaXBwZXQvYnJvd3Nlci9zbmlwcGV0VmFyaWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hFLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLG1CQUFtQixFQUNuQixVQUFVLEdBQ1YsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFHOUQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDMUcsT0FBTyxFQUFFLElBQUksRUFBOEIsTUFBTSxvQkFBb0IsQ0FBQTtBQUVyRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsaUNBQWlDLEVBQ2pDLHFCQUFxQixFQUlyQiwwQkFBMEIsR0FDMUIsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUEwQjtJQUMvRSxZQUFZLEVBQUUsSUFBSTtJQUNsQixrQkFBa0IsRUFBRSxJQUFJO0lBQ3hCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLFlBQVksRUFBRSxJQUFJO0lBQ2xCLFlBQVksRUFBRSxJQUFJO0lBQ2xCLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLGdCQUFnQixFQUFF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
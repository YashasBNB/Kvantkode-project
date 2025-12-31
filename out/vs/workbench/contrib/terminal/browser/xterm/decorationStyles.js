/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fromNow, getDurationString } from '../../../../../base/common/date.js';
import { localize } from '../../../../../nls.js';
var DecorationStyles;
(function (DecorationStyles) {
    DecorationStyles[DecorationStyles["DefaultDimension"] = 16] = "DefaultDimension";
    DecorationStyles[DecorationStyles["MarginLeft"] = -17] = "MarginLeft";
})(DecorationStyles || (DecorationStyles = {}));
export var DecorationSelector;
(function (DecorationSelector) {
    DecorationSelector["CommandDecoration"] = "terminal-command-decoration";
    DecorationSelector["Hide"] = "hide";
    DecorationSelector["ErrorColor"] = "error";
    DecorationSelector["DefaultColor"] = "default-color";
    DecorationSelector["Default"] = "default";
    DecorationSelector["Codicon"] = "codicon";
    DecorationSelector["XtermDecoration"] = "xterm-decoration";
    DecorationSelector["OverviewRuler"] = ".xterm-decoration-overview-ruler";
})(DecorationSelector || (DecorationSelector = {}));
export function getTerminalDecorationHoverContent(command, hoverMessage) {
    let hoverContent = `${localize('terminalPromptContextMenu', 'Show Command Actions')}`;
    hoverContent += '\n\n---\n\n';
    if (!command) {
        if (hoverMessage) {
            hoverContent = hoverMessage;
        }
        else {
            return '';
        }
    }
    else if (command.markProperties || hoverMessage) {
        if (command.markProperties?.hoverMessage || hoverMessage) {
            hoverContent = command.markProperties?.hoverMessage || hoverMessage || '';
        }
        else {
            return '';
        }
    }
    else {
        if (command.duration) {
            const durationText = getDurationString(command.duration);
            if (command.exitCode) {
                if (command.exitCode === -1) {
                    hoverContent += localize('terminalPromptCommandFailed.duration', 'Command executed {0}, took {1} and failed', fromNow(command.timestamp, true), durationText);
                }
                else {
                    hoverContent += localize('terminalPromptCommandFailedWithExitCode.duration', 'Command executed {0}, took {1} and failed (Exit Code {2})', fromNow(command.timestamp, true), durationText, command.exitCode);
                }
            }
            else {
                hoverContent += localize('terminalPromptCommandSuccess.duration', 'Command executed {0} and took {1}', fromNow(command.timestamp, true), durationText);
            }
        }
        else {
            if (command.exitCode) {
                if (command.exitCode === -1) {
                    hoverContent += localize('terminalPromptCommandFailed', 'Command executed {0} and failed', fromNow(command.timestamp, true));
                }
                else {
                    hoverContent += localize('terminalPromptCommandFailedWithExitCode', 'Command executed {0} and failed (Exit Code {1})', fromNow(command.timestamp, true), command.exitCode);
                }
            }
            else {
                hoverContent += localize('terminalPromptCommandSuccess', 'Command executed {0}', fromNow(command.timestamp, true));
            }
        }
    }
    return hoverContent;
}
export function updateLayout(configurationService, element) {
    if (!element) {
        return;
    }
    const fontSize = configurationService.inspect("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */).value;
    const defaultFontSize = configurationService.inspect("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */).defaultValue;
    const lineHeight = configurationService.inspect("terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */).value;
    if (typeof fontSize === 'number' &&
        typeof defaultFontSize === 'number' &&
        typeof lineHeight === 'number') {
        const scalar = fontSize / defaultFontSize <= 1 ? fontSize / defaultFontSize : 1;
        // must be inlined to override the inlined styles from xterm
        element.style.width = `${scalar * 16 /* DecorationStyles.DefaultDimension */}px`;
        element.style.height = `${scalar * 16 /* DecorationStyles.DefaultDimension */ * lineHeight}px`;
        element.style.fontSize = `${scalar * 16 /* DecorationStyles.DefaultDimension */}px`;
        element.style.marginLeft = `${scalar * -17 /* DecorationStyles.MarginLeft */}px`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblN0eWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIveHRlcm0vZGVjb3JhdGlvblN0eWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBS2hELElBQVcsZ0JBR1Y7QUFIRCxXQUFXLGdCQUFnQjtJQUMxQixnRkFBcUIsQ0FBQTtJQUNyQixxRUFBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBSFUsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQUcxQjtBQUVELE1BQU0sQ0FBTixJQUFrQixrQkFTakI7QUFURCxXQUFrQixrQkFBa0I7SUFDbkMsdUVBQWlELENBQUE7SUFDakQsbUNBQWEsQ0FBQTtJQUNiLDBDQUFvQixDQUFBO0lBQ3BCLG9EQUE4QixDQUFBO0lBQzlCLHlDQUFtQixDQUFBO0lBQ25CLHlDQUFtQixDQUFBO0lBQ25CLDBEQUFvQyxDQUFBO0lBQ3BDLHdFQUFrRCxDQUFBO0FBQ25ELENBQUMsRUFUaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQVNuQztBQUVELE1BQU0sVUFBVSxpQ0FBaUMsQ0FDaEQsT0FBcUMsRUFDckMsWUFBcUI7SUFFckIsSUFBSSxZQUFZLEdBQUcsR0FBRyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFBO0lBQ3JGLFlBQVksSUFBSSxhQUFhLENBQUE7SUFDN0IsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2QsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixZQUFZLEdBQUcsWUFBWSxDQUFBO1FBQzVCLENBQUM7YUFBTSxD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
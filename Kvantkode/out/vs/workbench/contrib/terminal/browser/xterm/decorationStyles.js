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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblN0eWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci94dGVybS9kZWNvcmF0aW9uU3R5bGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFLaEQsSUFBVyxnQkFHVjtBQUhELFdBQVcsZ0JBQWdCO0lBQzFCLGdGQUFxQixDQUFBO0lBQ3JCLHFFQUFnQixDQUFBO0FBQ2pCLENBQUMsRUFIVSxnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBRzFCO0FBRUQsTUFBTSxDQUFOLElBQWtCLGtCQVNqQjtBQVRELFdBQWtCLGtCQUFrQjtJQUNuQyx1RUFBaUQsQ0FBQTtJQUNqRCxtQ0FBYSxDQUFBO0lBQ2IsMENBQW9CLENBQUE7SUFDcEIsb0RBQThCLENBQUE7SUFDOUIseUNBQW1CLENBQUE7SUFDbkIseUNBQW1CLENBQUE7SUFDbkIsMERBQW9DLENBQUE7SUFDcEMsd0VBQWtELENBQUE7QUFDbkQsQ0FBQyxFQVRpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBU25DO0FBRUQsTUFBTSxVQUFVLGlDQUFpQyxDQUNoRCxPQUFxQyxFQUNyQyxZQUFxQjtJQUVyQixJQUFJLFlBQVksR0FBRyxHQUFHLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUE7SUFDckYsWUFBWSxJQUFJLGFBQWEsQ0FBQTtJQUM3QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLFlBQVksR0FBRyxZQUFZLENBQUE7UUFDNUIsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7SUFDRixDQUFDO1NBQU0sSUFBSSxPQUFPLENBQUMsY0FBYyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ25ELElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRSxZQUFZLElBQUksWUFBWSxFQUFFLENBQUM7WUFDMUQsWUFBWSxHQUFHLE9BQU8sQ0FBQyxjQUFjLEVBQUUsWUFBWSxJQUFJLFlBQVksSUFBSSxFQUFFLENBQUE7UUFDMUUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7SUFDRixDQUFDO1NBQU0sQ0FBQztRQUNQLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sWUFBWSxHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN4RCxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzdCLFlBQVksSUFBSSxRQUFRLENBQ3ZCLHNDQUFzQyxFQUN0QywyQ0FBMkMsRUFDM0MsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQ2hDLFlBQVksQ0FDWixDQUFBO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxZQUFZLElBQUksUUFBUSxDQUN2QixrREFBa0QsRUFDbEQsMkRBQTJELEVBQzNELE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUNoQyxZQUFZLEVBQ1osT0FBTyxDQUFDLFFBQVEsQ0FDaEIsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFlBQVksSUFBSSxRQUFRLENBQ3ZCLHVDQUF1QyxFQUN2QyxtQ0FBbUMsRUFDbkMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQ2hDLFlBQVksQ0FDWixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3RCLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUM3QixZQUFZLElBQUksUUFBUSxDQUN2Qiw2QkFBNkIsRUFDN0IsaUNBQWlDLEVBQ2pDLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUNoQyxDQUFBO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxZQUFZLElBQUksUUFBUSxDQUN2Qix5Q0FBeUMsRUFDekMsaURBQWlELEVBQ2pELE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUNoQyxPQUFPLENBQUMsUUFBUSxDQUNoQixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsWUFBWSxJQUFJLFFBQVEsQ0FDdkIsOEJBQThCLEVBQzlCLHNCQUFzQixFQUN0QixPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDaEMsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sWUFBWSxDQUFBO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUMzQixvQkFBMkMsRUFDM0MsT0FBcUI7SUFFckIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2QsT0FBTTtJQUNQLENBQUM7SUFDRCxNQUFNLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxPQUFPLGlFQUE0QixDQUFDLEtBQUssQ0FBQTtJQUMvRSxNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxPQUFPLGlFQUE0QixDQUFDLFlBQVksQ0FBQTtJQUM3RixNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxPQUFPLHFFQUE4QixDQUFDLEtBQUssQ0FBQTtJQUNuRixJQUNDLE9BQU8sUUFBUSxLQUFLLFFBQVE7UUFDNUIsT0FBTyxlQUFlLEtBQUssUUFBUTtRQUNuQyxPQUFPLFVBQVUsS0FBSyxRQUFRLEVBQzdCLENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyxRQUFRLEdBQUcsZUFBZSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9FLDREQUE0RDtRQUM1RCxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLE1BQU0sNkNBQW9DLElBQUksQ0FBQTtRQUN2RSxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLE1BQU0sNkNBQW9DLEdBQUcsVUFBVSxJQUFJLENBQUE7UUFDckYsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsR0FBRyxNQUFNLDZDQUFvQyxJQUFJLENBQUE7UUFDMUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxNQUFNLHdDQUE4QixJQUFJLENBQUE7SUFDdkUsQ0FBQztBQUNGLENBQUMifQ==
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../../../base/common/platform.js';
import { localize } from '../../../../../nls.js';
export var TerminalZoomCommandId;
(function (TerminalZoomCommandId) {
    TerminalZoomCommandId["FontZoomIn"] = "workbench.action.terminal.fontZoomIn";
    TerminalZoomCommandId["FontZoomOut"] = "workbench.action.terminal.fontZoomOut";
    TerminalZoomCommandId["FontZoomReset"] = "workbench.action.terminal.fontZoomReset";
})(TerminalZoomCommandId || (TerminalZoomCommandId = {}));
export var TerminalZoomSettingId;
(function (TerminalZoomSettingId) {
    TerminalZoomSettingId["MouseWheelZoom"] = "terminal.integrated.mouseWheelZoom";
})(TerminalZoomSettingId || (TerminalZoomSettingId = {}));
export const terminalZoomConfiguration = {
    ["terminal.integrated.mouseWheelZoom" /* TerminalZoomSettingId.MouseWheelZoom */]: {
        markdownDescription: isMacintosh
            ? localize('terminal.integrated.mouseWheelZoom.mac', 'Zoom the font of the terminal when using mouse wheel and holding `Cmd`.')
            : localize('terminal.integrated.mouseWheelZoom', 'Zoom the font of the terminal when using mouse wheel and holding `Ctrl`.'),
        type: 'boolean',
        default: false,
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuem9vbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi96b29tL2NvbW1vbi90ZXJtaW5hbC56b29tLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFHaEQsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0Qyw0RUFBbUQsQ0FBQTtJQUNuRCw4RUFBcUQsQ0FBQTtJQUNyRCxrRkFBeUQsQ0FBQTtBQUMxRCxDQUFDLEVBSmlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFJdEM7QUFFRCxNQUFNLENBQU4sSUFBa0IscUJBRWpCO0FBRkQsV0FBa0IscUJBQXFCO0lBQ3RDLDhFQUFxRCxDQUFBO0FBQ3RELENBQUMsRUFGaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUV0QztBQUVELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFvRDtJQUN6RixpRkFBc0MsRUFBRTtRQUN2QyxtQkFBbUIsRUFBRSxXQUFXO1lBQy9CLENBQUMsQ0FBQyxRQUFRLENBQ1Isd0NBQXdDLEVBQ3hDLHlFQUF5RSxDQUN6RTtZQUNGLENBQUMsQ0FBQyxRQUFRLENBQ1Isb0NBQW9DLEVBQ3BDLDBFQUEwRSxDQUMxRTtRQUNILElBQUksRUFBRSxTQUFTO1FBQ2YsT0FBTyxFQUFFLEtBQUs7S0FDZDtDQUNELENBQUEifQ==
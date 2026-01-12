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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuem9vbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3pvb20vY29tbW9uL3Rlcm1pbmFsLnpvb20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUdoRCxNQUFNLENBQU4sSUFBa0IscUJBSWpCO0FBSkQsV0FBa0IscUJBQXFCO0lBQ3RDLDRFQUFtRCxDQUFBO0lBQ25ELDhFQUFxRCxDQUFBO0lBQ3JELGtGQUF5RCxDQUFBO0FBQzFELENBQUMsRUFKaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUl0QztBQUVELE1BQU0sQ0FBTixJQUFrQixxQkFFakI7QUFGRCxXQUFrQixxQkFBcUI7SUFDdEMsOEVBQXFELENBQUE7QUFDdEQsQ0FBQyxFQUZpQixxQkFBcUIsS0FBckIscUJBQXFCLFFBRXRDO0FBRUQsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQW9EO0lBQ3pGLGlGQUFzQyxFQUFFO1FBQ3ZDLG1CQUFtQixFQUFFLFdBQVc7WUFDL0IsQ0FBQyxDQUFDLFFBQVEsQ0FDUix3Q0FBd0MsRUFDeEMseUVBQXlFLENBQ3pFO1lBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FDUixvQ0FBb0MsRUFDcEMsMEVBQTBFLENBQzFFO1FBQ0gsSUFBSSxFQUFFLFNBQVM7UUFDZixPQUFPLEVBQUUsS0FBSztLQUNkO0NBQ0QsQ0FBQSJ9
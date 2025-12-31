/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const ITerminalService = createDecorator('terminalService');
export const ITerminalConfigurationService = createDecorator('terminalConfigurationService');
export const ITerminalEditorService = createDecorator('terminalEditorService');
export const ITerminalGroupService = createDecorator('terminalGroupService');
export const ITerminalInstanceService = createDecorator('terminalInstanceService');
export var Direction;
(function (Direction) {
    Direction[Direction["Left"] = 0] = "Left";
    Direction[Direction["Right"] = 1] = "Right";
    Direction[Direction["Up"] = 2] = "Up";
    Direction[Direction["Down"] = 3] = "Down";
})(Direction || (Direction = {}));
export var TerminalConnectionState;
(function (TerminalConnectionState) {
    TerminalConnectionState[TerminalConnectionState["Connecting"] = 0] = "Connecting";
    TerminalConnectionState[TerminalConnectionState["Connected"] = 1] = "Connected";
})(TerminalConnectionState || (TerminalConnectionState = {}));
export const isDetachedTerminalInstance = (t) => typeof t.instanceId !== 'number';
export class TerminalLinkQuickPickEvent extends MouseEvent {
}
export const terminalEditorId = 'terminalEditor';
export var XtermTerminalConstants;
(function (XtermTerminalConstants) {
    XtermTerminalConstants[XtermTerminalConstants["SearchHighlightLimit"] = 20000] = "SearchHighlightLimit";
})(XtermTerminalConstants || (XtermTerminalConstants = {}));
export var LinuxDistro;
(function (LinuxDistro) {
    LinuxDistro[LinuxDistro["Unknown"] = 1] = "Unknown";
    LinuxDistro[LinuxDistro["Fedora"] = 2] = "Fedora";
    LinuxDistro[LinuxDistro["Ubuntu"] = 3] = "Ubuntu";
})(LinuxDistro || (LinuxDistro = {}));
export var TerminalDataTransfers;
(function (TerminalDataTransfers) {
    TerminalDataTransfers["Terminals"] = "Terminals";
})(TerminalDataTransfers || (TerminalDataTransfers = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBYWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQTJENUYsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFtQixpQkFBaUIsQ0FBQyxDQUFBO0FBQ3BGLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGVBQWUsQ0FDM0QsOEJBQThCLENBQzlCLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FDbEMsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFBO0FBQ2pFLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0Isc0JBQXNCLENBQUMsQ0FBQTtBQUNuRyxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FDcEMsZUFBZSxDQUEyQix5QkFBeUIsQ0FBQyxDQUFBO0FBaUVyRSxNQUFNLENBQU4sSUFBa0IsU0FLakI7QUFMRCxXQUFrQixTQUFTO0lBQzFCLHlDQUFRLENBQUE7SUFDUiwyQ0FBUyxDQUFBO0lBQ1QscUNBQU0sQ0FBQTtJQUNOLHlDQUFRLENBQUE7QUFDVCxDQUFDLEVBTGlCLFNBQVMsS0FBVCxTQUFTLFFBSzFCO0FBeUVELE1BQU0sQ0FBTixJQUFrQix1QkFHakI7QUFIRCxXQUFrQix1QkFBdUI7SUFDeEMsaUZBQVUsQ0FBQTtJQUNWLCtFQUFTLENBQUE7QUFDVixDQUFDLEVBSGlCLHVCQUF1QixLQUF2Qix1QkFBdUIsUUFHeEM7QUFtRkQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsQ0FDekMsQ0FBZ0QsRUFDZixFQUFFLENBQUMsT0FBUSxDQUF1QixDQUFDLFVBQVUsS0FBSyxRQUFRLENBQUE7QUF3SjVGLE1BQU0sT0FBTywwQkFBMkIsU0FBUSxVQUFVO0NBQUc7QUEyQjdELE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGdCQUFnQixDQUFBO0FBcW9CaEQsTUFBTSxDQUFOLElBQWtCLHNCQUVqQjtBQUZELFdBQWtCLHNCQUFzQjtJQUN2Qyx1R0FBNEIsQ0FBQTtBQUM3QixDQUFDLEVBRmlCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFFdkM7QUE0TUQsTUFBTSxDQUFOLElBQWtCLFdBSWpCO0FBSkQsV0FBa0IsV0FBVztJQUM1QixtREFBVyxDQUFBO0lBQ1gsaURBQVUsQ0FBQTtJQUNWLGlEQUFVLENBQUE7QUFDWCxDQUFDLEVBSmlCLFdBQVcsS0FBWCxXQUFXLFFBSTVCO0FBRUQsTUFBTSxDQUFOLElBQWtCLHFCQUVqQjtBQUZELFdBQWtCLHFCQUFxQjtJQUN0QyxnREFBdUIsQ0FBQTtBQUN4QixDQUFDLEVBRmlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFFdEMifQ==
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFhaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBMkQ1RixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQW1CLGlCQUFpQixDQUFDLENBQUE7QUFDcEYsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsZUFBZSxDQUMzRCw4QkFBOEIsQ0FDOUIsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUE7QUFDakUsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFBO0FBQ25HLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUNwQyxlQUFlLENBQTJCLHlCQUF5QixDQUFDLENBQUE7QUFpRXJFLE1BQU0sQ0FBTixJQUFrQixTQUtqQjtBQUxELFdBQWtCLFNBQVM7SUFDMUIseUNBQVEsQ0FBQTtJQUNSLDJDQUFTLENBQUE7SUFDVCxxQ0FBTSxDQUFBO0lBQ04seUNBQVEsQ0FBQTtBQUNULENBQUMsRUFMaUIsU0FBUyxLQUFULFNBQVMsUUFLMUI7QUF5RUQsTUFBTSxDQUFOLElBQWtCLHVCQUdqQjtBQUhELFdBQWtCLHVCQUF1QjtJQUN4QyxpRkFBVSxDQUFBO0lBQ1YsK0VBQVMsQ0FBQTtBQUNWLENBQUMsRUFIaUIsdUJBQXVCLEtBQXZCLHVCQUF1QixRQUd4QztBQW1GRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxDQUN6QyxDQUFnRCxFQUNmLEVBQUUsQ0FBQyxPQUFRLENBQXVCLENBQUMsVUFBVSxLQUFLLFFBQVEsQ0FBQTtBQXdKNUYsTUFBTSxPQUFPLDBCQUEyQixTQUFRLFVBQVU7Q0FBRztBQTJCN0QsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUE7QUFxb0JoRCxNQUFNLENBQU4sSUFBa0Isc0JBRWpCO0FBRkQsV0FBa0Isc0JBQXNCO0lBQ3ZDLHVHQUE0QixDQUFBO0FBQzdCLENBQUMsRUFGaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUV2QztBQTRNRCxNQUFNLENBQU4sSUFBa0IsV0FJakI7QUFKRCxXQUFrQixXQUFXO0lBQzVCLG1EQUFXLENBQUE7SUFDWCxpREFBVSxDQUFBO0lBQ1YsaURBQVUsQ0FBQTtBQUNYLENBQUMsRUFKaUIsV0FBVyxLQUFYLFdBQVcsUUFJNUI7QUFFRCxNQUFNLENBQU4sSUFBa0IscUJBRWpCO0FBRkQsV0FBa0IscUJBQXFCO0lBQ3RDLGdEQUF1QixDQUFBO0FBQ3hCLENBQUMsRUFGaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUV0QyJ9
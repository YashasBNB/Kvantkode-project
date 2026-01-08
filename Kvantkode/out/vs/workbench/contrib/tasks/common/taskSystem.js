/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var TaskErrors;
(function (TaskErrors) {
    TaskErrors[TaskErrors["NotConfigured"] = 0] = "NotConfigured";
    TaskErrors[TaskErrors["RunningTask"] = 1] = "RunningTask";
    TaskErrors[TaskErrors["NoBuildTask"] = 2] = "NoBuildTask";
    TaskErrors[TaskErrors["NoTestTask"] = 3] = "NoTestTask";
    TaskErrors[TaskErrors["ConfigValidationError"] = 4] = "ConfigValidationError";
    TaskErrors[TaskErrors["TaskNotFound"] = 5] = "TaskNotFound";
    TaskErrors[TaskErrors["NoValidTaskRunner"] = 6] = "NoValidTaskRunner";
    TaskErrors[TaskErrors["UnknownError"] = 7] = "UnknownError";
})(TaskErrors || (TaskErrors = {}));
export class TaskError {
    constructor(severity, message, code) {
        this.severity = severity;
        this.message = message;
        this.code = code;
    }
}
export var Triggers;
(function (Triggers) {
    Triggers.shortcut = 'shortcut';
    Triggers.command = 'command';
    Triggers.reconnect = 'reconnect';
})(Triggers || (Triggers = {}));
export var TaskExecuteKind;
(function (TaskExecuteKind) {
    TaskExecuteKind[TaskExecuteKind["Started"] = 1] = "Started";
    TaskExecuteKind[TaskExecuteKind["Active"] = 2] = "Active";
})(TaskExecuteKind || (TaskExecuteKind = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1N5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvY29tbW9uL3Rhc2tTeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFXaEcsTUFBTSxDQUFOLElBQWtCLFVBU2pCO0FBVEQsV0FBa0IsVUFBVTtJQUMzQiw2REFBYSxDQUFBO0lBQ2IseURBQVcsQ0FBQTtJQUNYLHlEQUFXLENBQUE7SUFDWCx1REFBVSxDQUFBO0lBQ1YsNkVBQXFCLENBQUE7SUFDckIsMkRBQVksQ0FBQTtJQUNaLHFFQUFpQixDQUFBO0lBQ2pCLDJEQUFZLENBQUE7QUFDYixDQUFDLEVBVGlCLFVBQVUsS0FBVixVQUFVLFFBUzNCO0FBRUQsTUFBTSxPQUFPLFNBQVM7SUFLckIsWUFBWSxRQUFrQixFQUFFLE9BQWUsRUFBRSxJQUFnQjtRQUNoRSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtRQUN4QixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtRQUN0QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtJQUNqQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLEtBQVcsUUFBUSxDQUl4QjtBQUpELFdBQWlCLFFBQVE7SUFDWCxpQkFBUSxHQUFXLFVBQVUsQ0FBQTtJQUM3QixnQkFBTyxHQUFXLFNBQVMsQ0FBQTtJQUMzQixrQkFBUyxHQUFXLFdBQVcsQ0FBQTtBQUM3QyxDQUFDLEVBSmdCLFFBQVEsS0FBUixRQUFRLFFBSXhCO0FBU0QsTUFBTSxDQUFOLElBQWtCLGVBR2pCO0FBSEQsV0FBa0IsZUFBZTtJQUNoQywyREFBVyxDQUFBO0lBQ1gseURBQVUsQ0FBQTtBQUNYLENBQUMsRUFIaUIsZUFBZSxLQUFmLGVBQWUsUUFHaEMifQ==
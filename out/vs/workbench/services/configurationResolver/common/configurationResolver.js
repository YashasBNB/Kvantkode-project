/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IConfigurationResolverService = createDecorator('configurationResolverService');
export var VariableKind;
(function (VariableKind) {
    VariableKind["Unknown"] = "unknown";
    VariableKind["Env"] = "env";
    VariableKind["Config"] = "config";
    VariableKind["Command"] = "command";
    VariableKind["Input"] = "input";
    VariableKind["ExtensionInstallFolder"] = "extensionInstallFolder";
    VariableKind["WorkspaceFolder"] = "workspaceFolder";
    VariableKind["Cwd"] = "cwd";
    VariableKind["WorkspaceFolderBasename"] = "workspaceFolderBasename";
    VariableKind["UserHome"] = "userHome";
    VariableKind["LineNumber"] = "lineNumber";
    VariableKind["ColumnNumber"] = "columnNumber";
    VariableKind["SelectedText"] = "selectedText";
    VariableKind["File"] = "file";
    VariableKind["FileWorkspaceFolder"] = "fileWorkspaceFolder";
    VariableKind["FileWorkspaceFolderBasename"] = "fileWorkspaceFolderBasename";
    VariableKind["RelativeFile"] = "relativeFile";
    VariableKind["RelativeFileDirname"] = "relativeFileDirname";
    VariableKind["FileDirname"] = "fileDirname";
    VariableKind["FileExtname"] = "fileExtname";
    VariableKind["FileBasename"] = "fileBasename";
    VariableKind["FileBasenameNoExtension"] = "fileBasenameNoExtension";
    VariableKind["FileDirnameBasename"] = "fileDirnameBasename";
    VariableKind["ExecPath"] = "execPath";
    VariableKind["ExecInstallFolder"] = "execInstallFolder";
    VariableKind["PathSeparator"] = "pathSeparator";
    VariableKind["PathSeparatorAlias"] = "/";
})(VariableKind || (VariableKind = {}));
export const allVariableKinds = Object.values(VariableKind).filter((value) => typeof value === 'string');
export class VariableError extends ErrorNoTelemetry {
    constructor(variable, message) {
        super(message);
        this.variable = variable;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb25SZXNvbHZlci9jb21tb24vY29uZmlndXJhdGlvblJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBR3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUk1RixNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxlQUFlLENBQzNELDhCQUE4QixDQUM5QixDQUFBO0FBa0ZELE1BQU0sQ0FBTixJQUFZLFlBOEJYO0FBOUJELFdBQVksWUFBWTtJQUN2QixtQ0FBbUIsQ0FBQTtJQUVuQiwyQkFBVyxDQUFBO0lBQ1gsaUNBQWlCLENBQUE7SUFDakIsbUNBQW1CLENBQUE7SUFDbkIsK0JBQWUsQ0FBQTtJQUNmLGlFQUFpRCxDQUFBO0lBRWpELG1EQUFtQyxDQUFBO0lBQ25DLDJCQUFXLENBQUE7SUFDWCxtRUFBbUQsQ0FBQTtJQUNuRCxxQ0FBcUIsQ0FBQTtJQUNyQix5Q0FBeUIsQ0FBQTtJQUN6Qiw2Q0FBNkIsQ0FBQTtJQUM3Qiw2Q0FBNkIsQ0FBQTtJQUM3Qiw2QkFBYSxDQUFBO0lBQ2IsMkRBQTJDLENBQUE7SUFDM0MsMkVBQTJELENBQUE7SUFDM0QsNkNBQTZCLENBQUE7SUFDN0IsMkRBQTJDLENBQUE7SUFDM0MsMkNBQTJCLENBQUE7SUFDM0IsMkNBQTJCLENBQUE7SUFDM0IsNkNBQTZCLENBQUE7SUFDN0IsbUVBQW1ELENBQUE7SUFDbkQsMkRBQTJDLENBQUE7SUFDM0MscUNBQXFCLENBQUE7SUFDckIsdURBQXVDLENBQUE7SUFDdkMsK0NBQStCLENBQUE7SUFDL0Isd0NBQXdCLENBQUE7QUFDekIsQ0FBQyxFQTlCVyxZQUFZLEtBQVosWUFBWSxRQThCdkI7QUFFRCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FDakUsQ0FBQyxLQUFLLEVBQXlCLEVBQUUsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQzNELENBQUE7QUFFRCxNQUFNLE9BQU8sYUFBYyxTQUFRLGdCQUFnQjtJQUNsRCxZQUNpQixRQUFzQixFQUN0QyxPQUFnQjtRQUVoQixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFIRSxhQUFRLEdBQVIsUUFBUSxDQUFjO0lBSXZDLENBQUM7Q0FDRCJ9
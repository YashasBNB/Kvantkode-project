/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import * as paths from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import * as process from '../../../../base/common/process.js';
import * as types from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { allVariableKinds, VariableError, VariableKind, } from './configurationResolver.js';
import { ConfigurationResolverExpression, } from './configurationResolverExpression.js';
export class AbstractVariableResolverService {
    constructor(_context, _labelService, _userHomePromise, _envVariablesPromise) {
        this._contributedVariables = new Map();
        this.resolvableVariables = new Set(allVariableKinds);
        this._context = _context;
        this._labelService = _labelService;
        this._userHomePromise = _userHomePromise;
        if (_envVariablesPromise) {
            this._envVariablesPromise = _envVariablesPromise.then((envVariables) => {
                return this.prepareEnv(envVariables);
            });
        }
    }
    prepareEnv(envVariables) {
        // windows env variables are case insensitive
        if (isWindows) {
            const ev = Object.create(null);
            Object.keys(envVariables).forEach((key) => {
                ev[key.toLowerCase()] = envVariables[key];
            });
            return ev;
        }
        return envVariables;
    }
    async resolveWithEnvironment(environment, folder, value) {
        const expr = ConfigurationResolverExpression.parse(value);
        const env = {
            env: this.prepareEnv(environment),
            userHome: undefined,
        };
        for (const replacement of expr.unresolved()) {
            const resolvedValue = await this.evaluateSingleVariable(env, replacement, folder?.uri);
            if (resolvedValue !== undefined) {
                expr.resolve(replacement, resolvedValue);
            }
        }
        return expr.toObject();
    }
    async resolveAsync(folder, config) {
        const expr = ConfigurationResolverExpression.parse(config);
        const environment = {
            env: await this._envVariablesPromise,
            userHome: await this._userHomePromise,
        };
        for (const replacement of expr.unresolved()) {
            const resolvedValue = await this.evaluateSingleVariable(environment, replacement, folder?.uri);
            if (resolvedValue !== undefined) {
                expr.resolve(replacement, resolvedValue);
            }
        }
        return expr.toObject();
    }
    resolveWithInteractionReplace(folder, config) {
        throw new Error('resolveWithInteractionReplace not implemented.');
    }
    resolveWithInteraction(folder, config) {
        throw new Error('resolveWithInteraction not implemented.');
    }
    contributeVariable(variable, resolution) {
        if (this._contributedVariables.has(variable)) {
            throw new Error('Variable ' + variable + ' is contributed twice.');
        }
        else {
            this.resolvableVariables.add(variable);
            this._contributedVariables.set(variable, resolution);
        }
    }
    fsPath(displayUri) {
        return this._labelService
            ? this._labelService.getUriLabel(displayUri, { noPrefix: true })
            : displayUri.fsPath;
    }
    async evaluateSingleVariable(environment, replacement, folderUri, commandValueMapping) {
        const { name: variable, arg: argument } = replacement;
        // common error handling for all variables that require an open editor
        const getFilePath = (variableKind) => {
            const filePath = this._context.getFilePath();
            if (filePath) {
                return normalizeDriveLetter(filePath);
            }
            throw new VariableError(variableKind, localize('canNotResolveFile', 'Variable {0} can not be resolved. Please open an editor.', replacement.id));
        };
        // common error handling for all variables that require an open editor
        const getFolderPathForFile = (variableKind) => {
            const filePath = getFilePath(variableKind); // throws error if no editor open
            if (this._context.getWorkspaceFolderPathForFile) {
                const folderPath = this._context.getWorkspaceFolderPathForFile();
                if (folderPath) {
                    return normalizeDriveLetter(folderPath);
                }
            }
            throw new VariableError(variableKind, localize('canNotResolveFolderForFile', "Variable {0}: can not find workspace folder of '{1}'.", replacement.id, paths.basename(filePath)));
        };
        // common error handling for all variables that require an open folder and accept a folder name argument
        const getFolderUri = (variableKind) => {
            if (argument) {
                const folder = this._context.getFolderUri(argument);
                if (folder) {
                    return folder;
                }
                throw new VariableError(variableKind, localize('canNotFindFolder', "Variable {0} can not be resolved. No such folder '{1}'.", variableKind, argument));
            }
            if (folderUri) {
                return folderUri;
            }
            if (this._context.getWorkspaceFolderCount() > 1) {
                throw new VariableError(variableKind, localize('canNotResolveWorkspaceFolderMultiRoot', "Variable {0} can not be resolved in a multi folder workspace. Scope this variable using ':' and a workspace folder name.", variableKind));
            }
            throw new VariableError(variableKind, localize('canNotResolveWorkspaceFolder', 'Variable {0} can not be resolved. Please open a folder.', variableKind));
        };
        switch (variable) {
            case 'env':
                if (argument) {
                    if (environment.env) {
                        const env = environment.env[isWindows ? argument.toLowerCase() : argument];
                        if (types.isString(env)) {
                            return env;
                        }
                    }
                    return '';
                }
                throw new VariableError(VariableKind.Env, localize('missingEnvVarName', 'Variable {0} can not be resolved because no environment variable name is given.', replacement.id));
            case 'config':
                if (argument) {
                    const config = this._context.getConfigurationValue(folderUri, argument);
                    if (types.isUndefinedOrNull(config)) {
                        throw new VariableError(VariableKind.Config, localize('configNotFound', "Variable {0} can not be resolved because setting '{1}' not found.", replacement.id, argument));
                    }
                    if (types.isObject(config)) {
                        throw new VariableError(VariableKind.Config, localize('configNoString', "Variable {0} can not be resolved because '{1}' is a structured value.", replacement.id, argument));
                    }
                    return config;
                }
                throw new VariableError(VariableKind.Config, localize('missingConfigName', 'Variable {0} can not be resolved because no settings name is given.', replacement.id));
            case 'command':
                return this.resolveFromMap(VariableKind.Command, replacement.id, argument, commandValueMapping, 'command');
            case 'input':
                return this.resolveFromMap(VariableKind.Input, replacement.id, argument, commandValueMapping, 'input');
            case 'extensionInstallFolder':
                if (argument) {
                    const ext = await this._context.getExtension(argument);
                    if (!ext) {
                        throw new VariableError(VariableKind.ExtensionInstallFolder, localize('extensionNotInstalled', 'Variable {0} can not be resolved because the extension {1} is not installed.', replacement.id, argument));
                    }
                    return this.fsPath(ext.extensionLocation);
                }
                throw new VariableError(VariableKind.ExtensionInstallFolder, localize('missingExtensionName', 'Variable {0} can not be resolved because no extension name is given.', replacement.id));
            default: {
                switch (variable) {
                    case 'workspaceRoot':
                    case 'workspaceFolder': {
                        const uri = getFolderUri(VariableKind.WorkspaceFolder);
                        return uri ? normalizeDriveLetter(this.fsPath(uri)) : undefined;
                    }
                    case 'cwd': {
                        if (!folderUri && !argument) {
                            return process.cwd();
                        }
                        const uri = getFolderUri(VariableKind.Cwd);
                        return uri ? normalizeDriveLetter(this.fsPath(uri)) : undefined;
                    }
                    case 'workspaceRootFolderName':
                    case 'workspaceFolderBasename': {
                        const uri = getFolderUri(VariableKind.WorkspaceFolderBasename);
                        return uri ? normalizeDriveLetter(paths.basename(this.fsPath(uri))) : undefined;
                    }
                    case 'userHome':
                        if (environment.userHome) {
                            return environment.userHome;
                        }
                        throw new VariableError(VariableKind.UserHome, localize('canNotResolveUserHome', 'Variable {0} can not be resolved. UserHome path is not defined', replacement.id));
                    case 'lineNumber': {
                        const lineNumber = this._context.getLineNumber();
                        if (lineNumber) {
                            return lineNumber;
                        }
                        throw new VariableError(VariableKind.LineNumber, localize('canNotResolveLineNumber', 'Variable {0} can not be resolved. Make sure to have a line selected in the active editor.', replacement.id));
                    }
                    case 'columnNumber': {
                        const columnNumber = this._context.getColumnNumber();
                        if (columnNumber) {
                            return columnNumber;
                        }
                        throw new Error(localize('canNotResolveColumnNumber', 'Variable {0} can not be resolved. Make sure to have a column selected in the active editor.', replacement.id));
                    }
                    case 'selectedText': {
                        const selectedText = this._context.getSelectedText();
                        if (selectedText) {
                            return selectedText;
                        }
                        throw new VariableError(VariableKind.SelectedText, localize('canNotResolveSelectedText', 'Variable {0} can not be resolved. Make sure to have some text selected in the active editor.', replacement.id));
                    }
                    case 'file':
                        return getFilePath(VariableKind.File);
                    case 'fileWorkspaceFolder':
                        return getFolderPathForFile(VariableKind.FileWorkspaceFolder);
                    case 'fileWorkspaceFolderBasename':
                        return paths.basename(getFolderPathForFile(VariableKind.FileWorkspaceFolderBasename));
                    case 'relativeFile':
                        if (folderUri || argument) {
                            return paths.relative(this.fsPath(getFolderUri(VariableKind.RelativeFile)), getFilePath(VariableKind.RelativeFile));
                        }
                        return getFilePath(VariableKind.RelativeFile);
                    case 'relativeFileDirname': {
                        const dirname = paths.dirname(getFilePath(VariableKind.RelativeFileDirname));
                        if (folderUri || argument) {
                            const relative = paths.relative(this.fsPath(getFolderUri(VariableKind.RelativeFileDirname)), dirname);
                            return relative.length === 0 ? '.' : relative;
                        }
                        return dirname;
                    }
                    case 'fileDirname':
                        return paths.dirname(getFilePath(VariableKind.FileDirname));
                    case 'fileExtname':
                        return paths.extname(getFilePath(VariableKind.FileExtname));
                    case 'fileBasename':
                        return paths.basename(getFilePath(VariableKind.FileBasename));
                    case 'fileBasenameNoExtension': {
                        const basename = paths.basename(getFilePath(VariableKind.FileBasenameNoExtension));
                        return basename.slice(0, basename.length - paths.extname(basename).length);
                    }
                    case 'fileDirnameBasename':
                        return paths.basename(paths.dirname(getFilePath(VariableKind.FileDirnameBasename)));
                    case 'execPath': {
                        const ep = this._context.getExecPath();
                        if (ep) {
                            return ep;
                        }
                        return replacement.id;
                    }
                    case 'execInstallFolder': {
                        const ar = this._context.getAppRoot();
                        if (ar) {
                            return ar;
                        }
                        return replacement.id;
                    }
                    case 'pathSeparator':
                    case '/':
                        return paths.sep;
                    default: {
                        try {
                            return this.resolveFromMap(VariableKind.Unknown, replacement.id, argument, commandValueMapping, undefined);
                        }
                        catch {
                            return replacement.id;
                        }
                    }
                }
            }
        }
    }
    resolveFromMap(variableKind, match, argument, commandValueMapping, prefix) {
        if (argument && commandValueMapping) {
            const v = prefix === undefined
                ? commandValueMapping[argument]
                : commandValueMapping[prefix + ':' + argument];
            if (typeof v === 'string') {
                return v;
            }
            throw new VariableError(variableKind, localize('noValueForCommand', 'Variable {0} can not be resolved because the command has no value.', match));
        }
        return match;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uUmVzb2x2ZXIvY29tbW9uL3ZhcmlhYmxlUmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxLQUFLLEtBQUssTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RCxPQUFPLEVBQXVCLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BGLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFHN0MsT0FBTyxFQUNOLGdCQUFnQixFQUVoQixhQUFhLEVBQ2IsWUFBWSxHQUNaLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUNOLCtCQUErQixHQUcvQixNQUFNLHNDQUFzQyxDQUFBO0FBa0I3QyxNQUFNLE9BQWdCLCtCQUErQjtJQVdwRCxZQUNDLFFBQWlDLEVBQ2pDLGFBQTZCLEVBQzdCLGdCQUFrQyxFQUNsQyxvQkFBbUQ7UUFSMUMsMEJBQXFCLEdBQW1ELElBQUksR0FBRyxFQUFFLENBQUE7UUFFM0Usd0JBQW1CLEdBQUcsSUFBSSxHQUFHLENBQVMsZ0JBQWdCLENBQUMsQ0FBQTtRQVF0RSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtRQUN4QixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQTtRQUNsQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUE7UUFDeEMsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLElB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
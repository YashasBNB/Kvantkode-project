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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb25SZXNvbHZlci9jb21tb24vdmFyaWFibGVSZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RSxPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hELE9BQU8sRUFBdUIsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEYsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUc3QyxPQUFPLEVBQ04sZ0JBQWdCLEVBRWhCLGFBQWEsRUFDYixZQUFZLEdBQ1osTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQ04sK0JBQStCLEdBRy9CLE1BQU0sc0NBQXNDLENBQUE7QUFrQjdDLE1BQU0sT0FBZ0IsK0JBQStCO0lBV3BELFlBQ0MsUUFBaUMsRUFDakMsYUFBNkIsRUFDN0IsZ0JBQWtDLEVBQ2xDLG9CQUFtRDtRQVIxQywwQkFBcUIsR0FBbUQsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUUzRSx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsQ0FBUyxnQkFBZ0IsQ0FBQyxDQUFBO1FBUXRFLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQTtRQUN4QyxJQUFJLG9C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
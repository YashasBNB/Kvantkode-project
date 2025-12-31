/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Queue } from '../../../../base/common/async.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { LRUCache } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import * as Types from '../../../../base/common/types.js';
import { isCodeEditor, isDiffEditor, } from '../../../../editor/browser/editorBrowser.js';
import { localize } from '../../../../nls.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { VariableError, VariableKind } from '../common/configurationResolver.js';
import { ConfigurationResolverExpression, } from '../common/configurationResolverExpression.js';
import { AbstractVariableResolverService } from '../common/variableResolver.js';
const LAST_INPUT_STORAGE_KEY = 'configResolveInputLru';
const LAST_INPUT_CACHE_SIZE = 5;
export class BaseConfigurationResolverService extends AbstractVariableResolverService {
    static { this.INPUT_OR_COMMAND_VARIABLES_PATTERN = /\${((input|command):(.*?))}/g; }
    constructor(context, envVariablesPromise, editorService, configurationService, commandService, workspaceContextService, quickInputService, labelService, pathService, extensionService, storageService) {
        super({
            getFolderUri: (folderName) => {
                const folder = workspaceContextService
                    .getWorkspace()
                    .folders.filter((f) => f.name === folderName)
                    .pop();
                return folder ? folder.uri : undefined;
            },
            getWorkspaceFolderCount: () => {
                return workspaceContextService.getWorkspace().folders.length;
            },
            getConfigurationValue: (folderUri, section) => {
                return configurationService.getValue(section, folderUri ? { resource: folderUri } : {});
            },
            getAppRoot: () => {
                return context.getAppRoot();
            },
            getExecPath: () => {
                return context.getExecPath();
            },
            getFilePath: () => {
                const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                    filterByScheme: [
                        Schemas.file,
                        Schemas.vscodeUserData,
                        this.pathService.defaultUriScheme,
                    ],
                });
                if (!fileResource) {
                    return undefined;
                }
                return this.labelService.getUriLabel(fileResource, { noPrefix: true });
            },
            getWorkspaceFolderPathForFile: () => {
                const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                    filterByScheme: [
                        Schemas.file,
                        Schemas.vscodeUserData,
                        this.pathService.defaultUriScheme,
                    ],
                });
                if (!fileResource) {
                    return undefined;
                }
                const wsFolder = workspaceContextService.getWorkspaceFolder(fileResource);
                if (!wsFolder) {
                    return undefined;
                }
                return this.labelService.getUriLabel(wsFolder.uri, { noPrefix: true });
            },
            getSelectedText: () => {
                const activeTextEditorControl = editorService.activeTextEditorControl;
                let activeControl = null;
                if (isCodeEditor(activeTextEditorControl)) {
                    activeControl = activeTextEditorControl;
                }
                else if (isDiffEditor(activeTextEditorControl)) {
                    const original = activeTextEditorControl.getOriginalEditor();
                    const modified = activeTextEditorControl.getModifiedEditor();
                    activeControl = original.hasWidgetFocus() ? original : modified;
                }
                const activeModel = activeControl?.getModel();
                const activeSelection = activeControl?.getSelection();
                if (activeModel && activeSelection) {
                    return activeModel.getValueInRange(activeSelection);
                }
                return undefined;
            },
            getLineNumber: () => {
                const activeTextEditorControl = editorService.activeTextEditorControl;
                if (isCodeEditor(activeTextEditorControl)) {
                    const selection = activeTextEditorControl.getSelection();
                    if (selection) {
                        const lineNumber = selection.positionLineNumber;
                        return String(lineNumber);
                    }
                }
                return undefined;
            },
            getColumnNumber: () => {
                const activeTextEditorControl = editorService.activeTextEditorControl;
                if (isCodeEditor(activeTextEditorControl)) {
                    const selection = activeTextEditorControl.getSelection();
                    if (selection) {
                        const columnNumber = selection.positionColumn;
                        return String(columnNumber);
                    }
                }
                return undefined;
            },
            getExtension: (id) => {
                return extensionService.getExtension(id);
            },
        }, labelService, pathService.userHome().then((home) => home.path), envVariablesPromise);
        this.configurationService = configurationService;
        this.commandService = commandService;
        this.workspaceContextService = workspaceContextService;
        this.quickInputService = quickInputService;
        this.labelService = labelService;
        this.pathService = pathService;
        this.storageService = storageService;
        this.userInputAccessQueue = new Queue();
        this.resolvableVariables.add('command');
        this.resolvableVariables.add('input');
    }
    async resolveWithInteractionReplace(folder, config, section, variables, target) {
        // First resolve any non-interactive variables and any contributed variables
        config = await this.resolveAsync(folder, config);
        // Then resolve input variables in the order in which they are encountered
        const parsed = ConfigurationResolverExpression.parse(config);
        await this.resolveWithInteraction(folder, parsed, section, variables, target);
        return parsed.toObject();
    }
    async resolveWithInteraction(folder, config, section, variableToCommandMap, target) {
        const expr = ConfigurationResolverExpression.parse(config);
        // Get values for input variables from UI
        for (const variable of expr.unresolved()) {
            let result;
            // Command
            if (variable.name === 'command') {
                const commandId = (variableToCommandMap ? variableToCommandMap[variable.arg] : undefined) || variable.arg;
                const value = await this.commandService.executeCommand(commandId, expr.toObject());
                if (!Types.isUndefinedOrNull(value)) {
                    if (typeof value !== 'string') {
                        throw new VariableError(VariableKind.Command, localize('commandVariable.noStringType', "Cannot substitute command variable '{0}' because command did not return a result of type string.", commandId));
                    }
                    result = { value };
                }
            }
            // Input
            else if (variable.name === 'input') {
                result = await this.showUserInput(section, variable.arg, await this.resolveInputs(folder, section, target), variableToCommandMap);
            }
            // Contributed variable
            else if (this._contributedVariables.has(variable.inner)) {
                result = { value: await this._contributedVariables.get(variable.inner)() };
            }
            // Not something we can handle
            else {
                continue;
            }
            if (result === undefined) {
                // Skip the entire flow if any input variable was canceled
                return undefined;
            }
            expr.resolve(variable, result);
        }
        return new Map(Iterable.map(expr.resolved(), ([key, value]) => [key.inner, value.value]));
    }
    async resolveInputs(folder, section, target) {
        if (this.workspaceContextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ || !section) {
            return undefined;
        }
        // Look at workspace configuration
        let inputs;
        const overrides = folder ? { resource: folder.uri } : {};
        const result = this.configurationService.inspect(section, overrides);
        if (result) {
            switch (target) {
                case 8 /* ConfigurationTarget.MEMORY */:
                    inputs = result.memoryValue?.inputs;
                    break;
                case 7 /* ConfigurationTarget.DEFAULT */:
                    inputs = result.defaultValue?.inputs;
                    break;
                case 2 /* ConfigurationTarget.USER */:
                    inputs = result.userValue?.inputs;
                    break;
                case 3 /* ConfigurationTarget.USER_LOCAL */:
                    inputs = result.userLocalValue?.inputs;
                    break;
                case 4 /* ConfigurationTarget.USER_REMOTE */:
                    inputs = result.userRemoteValue?.inputs;
                    break;
                case 1 /* ConfigurationTarget.APPLICATION */:
                    inputs = result.applicationValue?.inputs;
                    break;
                case 5 /* ConfigurationTarget.WORKSPACE */:
                    inputs = result.workspaceValue?.inputs;
                    break;
                case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                default:
                    inputs = result.workspaceFolderValue?.inputs;
                    break;
            }
        }
        inputs ??= this.configurationService.getValue(section, overrides)?.inputs;
        return inputs;
    }
    readInputLru() {
        const contents = this.storageService.get(LAST_INPUT_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        const lru = new LRUCache(LAST_INPUT_CACHE_SIZE);
        try {
            if (contents) {
                lru.fromJSON(JSON.parse(contents));
            }
        }
        catch {
            // ignored
        }
        return lru;
    }
    storeInputLru(lru) {
        this.storageService.store(LAST_INPUT_STORAGE_KEY, JSON.stringify(lru.toJSON()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async showUserInput(section, variable, inputInfos, variableToCommandMap) {
        if (!inputInfos) {
            throw new VariableError(VariableKind.Input, localize('inputVariable.noInputSection', "Variable '{0}' must be defined in an '{1}' section of the debug or task configuration.", variable, 'inputs'));
        }
        // Find info for the given input variable
        const info = inputInfos.filter((item) => item.id === variable).pop();
        if (info) {
            const missingAttribute = (attrName) => {
                throw new VariableError(VariableKind.Input, localize('inputVariable.missingAttribute', "Input variable '{0}' is of type '{1}' and must include '{2}'.", variable, info.type, attrName));
            };
            const defaultValueMap = this.readInputLru();
            const defaultValueKey = `${section}.${variable}`;
            const previousPickedValue = defaultValueMap.get(defaultValueKey);
            switch (info.type) {
                case 'promptString': {
                    if (!Types.isString(info.description)) {
                        missingAttribute('description');
                    }
                    const inputOptions = {
                        prompt: info.description,
                        ignoreFocusLost: true,
                        value: variableToCommandMap?.[`input:${variable}`] ?? previousPickedValue ?? info.default,
                    };
                    if (info.password) {
                        inputOptions.password = info.password;
                    }
                    return this.userInputAccessQueue
                        .queue(() => this.quickInputService.input(inputOptions))
                        .then((resolvedInput) => {
                        if (typeof resolvedInput === 'string') {
                            this.storeInputLru(defaultValueMap.set(defaultValueKey, resolvedInput));
                        }
                        return resolvedInput ? { value: resolvedInput, input: info } : undefined;
                    });
                }
                case 'pickString': {
                    if (!Types.isString(info.description)) {
                        missingAttribute('description');
                    }
                    if (Array.isArray(info.options)) {
                        for (const pickOption of info.options) {
                            if (!Types.isString(pickOption) && !Types.isString(pickOption.value)) {
                                missingAttribute('value');
                            }
                        }
                    }
                    else {
                        missingAttribute('options');
                    }
                    const picks = new Array();
                    for (const pickOption of info.options) {
                        const value = Types.isString(pickOption) ? pickOption : pickOption.value;
                        const label = Types.isString(pickOption) ? undefined : pickOption.label;
                        const item = {
                            label: label ? `${label}: ${value}` : value,
                            value: value,
                        };
                        const topValue = variableToCommandMap?.[`input:${variable}`] ?? previousPickedValue ?? info.default;
                        if (value === info.default) {
                            item.description = localize('inputVariable.defaultInputValue', '(Default)');
                            picks.unshift(item);
                        }
                        else if (value === topValue) {
                            picks.unshift(item);
                        }
                        else {
                            picks.push(item);
                        }
                    }
                    const pickOptions = {
                        placeHolder: info.description,
                        matchOnDetail: true,
                        ignoreFocusLost: true,
                    };
                    return this.userInputAccessQueue
                        .queue(() => this.quickInputService.pick(picks, pickOptions, undefined))
                        .then((resolvedInput) => {
                        if (resolvedInput) {
                            const value = resolvedInput.value;
                            this.storeInputLru(defaultValueMap.set(defaultValueKey, value));
                            return { value, input: info };
                        }
                        return undefined;
                    });
                }
                case 'command': {
                    if (!Types.isString(info.command)) {
                        missingAttribute('command');
                    }
                    return this.userInputAccessQueue
                        .queue(() => this.commandService.executeCommand(info.command, info.args))
                        .then((result) => {
                        if (typeof result === 'string' || Types.isUndefinedOrNull(result)) {
                            return { value: result, input: info };
                        }
                        throw new VariableError(VariableKind.Input, localize('inputVariable.command.noStringType', "Cannot substitute input variable '{0}' because command '{1}' did not return a result of type string.", variable, info.command));
                    });
                }
                default:
                    throw new VariableError(VariableKind.Input, localize('inputVariable.unknownType', "Input variable '{0}' can only be of type 'promptString', 'pickString', or 'command'.", variable));
            }
        }
        throw new VariableError(VariableKind.Input, localize('inputVariable.undefinedVariable', "Undefined input variable '{0}' encountered. Remove or define '{0}' to continue.", variable));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUNvbmZpZ3VyYXRpb25SZXNvbHZlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvblJlc29sdmVyL2Jyb3dzZXIvYmFzZUNvbmZpZ3VyYXRpb25SZXNvbHZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTVELE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUE7QUFFekQsT0FBTyxFQUVOLFlBQVksRUFDWixZQUFZLEdBQ1osTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUF3QjdDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBSXBGLE9BQU8sRUFBbUIsYUFBYSxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pHLE9BQU8sRUFDTiwrQkFBK0IsR0FFL0IsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUUvRSxNQUFNLHNCQUFzQixHQUFHLHVCQUF1QixDQUFBO0FBQ3RELE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxDQUFBO0FBRS9CLE1BQU0sT0FBZ0IsZ0NBQWlDLFNBQVEsK0JBQStCO2FBQzdFLHVDQUFrQyxHQUFHLDhCQUE4QixBQUFq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
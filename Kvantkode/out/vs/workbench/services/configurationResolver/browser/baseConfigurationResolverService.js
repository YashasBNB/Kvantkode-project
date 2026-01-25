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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUNvbmZpZ3VyYXRpb25SZXNvbHZlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uUmVzb2x2ZXIvYnJvd3Nlci9iYXNlQ29uZmlndXJhdGlvblJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFNUQsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6RCxPQUFPLEVBRU4sWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQXdCN0MsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFJcEYsT0FBTyxFQUFtQixhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakcsT0FBTyxFQUNOLCtCQUErQixHQUUvQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRS9FLE1BQU0sc0JBQXNCLEdBQUcsdUJBQXVCLENBQUE7QUFDdEQsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUE7QUFFL0IsTUFBTSxPQUFnQixnQ0FBaUMsU0FBUSwrQkFBK0I7YUFDN0UsdUNBQWtDLEdBQUcsOEJBQThCLEFBQWpDLENBQWlDO0lBSW5GLFlBQ0MsT0FHQyxFQUNELG1CQUFpRCxFQUNqRCxhQUE2QixFQUNaLG9CQUEyQyxFQUMzQyxjQUErQixFQUMvQix1QkFBaUQsRUFDakQsaUJBQXFDLEVBQ3JDLFlBQTJCLEVBQzNCLFdBQXlCLEVBQzFDLGdCQUFtQyxFQUNsQixjQUErQjtRQUVoRCxLQUFLLENBQ0o7WUFDQyxZQUFZLEVBQUUsQ0FBQyxVQUFrQixFQUFtQixFQUFFO2dCQUNyRCxNQUFNLE1BQU0sR0FBRyx1QkFBdUI7cUJBQ3BDLFlBQVksRUFBRTtxQkFDZCxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQztxQkFDNUMsR0FBRyxFQUFFLENBQUE7Z0JBQ1AsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUN2QyxDQUFDO1lBQ0QsdUJBQXVCLEVBQUUsR0FBVyxFQUFFO2dCQUNyQyxPQUFPLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUE7WUFDN0QsQ0FBQztZQUNELHFCQUFxQixFQUFFLENBQ3RCLFNBQTBCLEVBQzFCLE9BQWUsRUFDTSxFQUFFO2dCQUN2QixPQUFPLG9CQUFvQixDQUFDLFFBQVEsQ0FDbkMsT0FBTyxFQUNQLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDeEMsQ0FBQTtZQUNGLENBQUM7WUFDRCxVQUFVLEVBQUUsR0FBdUIsRUFBRTtnQkFDcEMsT0FBTyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUE7WUFDNUIsQ0FBQztZQUNELFdBQVcsRUFBRSxHQUF1QixFQUFFO2dCQUNyQyxPQUFPLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUM3QixDQUFDO1lBQ0QsV0FBVyxFQUFFLEdBQXVCLEVBQUU7Z0JBQ3JDLE1BQU0sWUFBWSxHQUFHLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFO29CQUN0RixpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPO29CQUMzQyxjQUFjLEVBQUU7d0JBQ2YsT0FBTyxDQUFDLElBQUk7d0JBQ1osT0FBTyxDQUFDLGNBQWM7d0JBQ3RCLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCO3FCQUNqQztpQkFDRCxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNuQixPQUFPLFNBQVMsQ0FBQTtnQkFDakIsQ0FBQztnQkFDRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZFLENBQUM7WUFDRCw2QkFBNkIsRUFBRSxHQUF1QixFQUFFO2dCQUN2RCxNQUFNLFlBQVksR0FBRyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRTtvQkFDdEYsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsT0FBTztvQkFDM0MsY0FBYyxFQUFFO3dCQUNmLE9BQU8sQ0FBQyxJQUFJO3dCQUNaLE9BQU8sQ0FBQyxjQUFjO3dCQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQjtxQkFDakM7aUJBQ0QsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDbkIsT0FBTyxTQUFTLENBQUE7Z0JBQ2pCLENBQUM7Z0JBQ0QsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQ3pFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDZixPQUFPLFNBQVMsQ0FBQTtnQkFDakIsQ0FBQztnQkFDRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUN2RSxDQUFDO1lBQ0QsZUFBZSxFQUFFLEdBQXVCLEVBQUU7Z0JBQ3pDLE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUFDLHVCQUF1QixDQUFBO2dCQUVyRSxJQUFJLGFBQWEsR0FBdUIsSUFBSSxDQUFBO2dCQUU1QyxJQUFJLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7b0JBQzNDLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQTtnQkFDeEMsQ0FBQztxQkFBTSxJQUFJLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7b0JBQ2xELE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDLGlCQUFpQixFQUFFLENBQUE7b0JBQzVELE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDLGlCQUFpQixFQUFFLENBQUE7b0JBQzVELGFBQWEsR0FBRyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFBO2dCQUNoRSxDQUFDO2dCQUVELE1BQU0sV0FBVyxHQUFHLGFBQWEsRUFBRSxRQUFRLEVBQUUsQ0FBQTtnQkFDN0MsTUFBTSxlQUFlLEdBQUcsYUFBYSxFQUFFLFlBQVksRUFBRSxDQUFBO2dCQUNyRCxJQUFJLFdBQVcsSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDcEMsT0FBTyxXQUFXLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUNwRCxDQUFDO2dCQUNELE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7WUFDRCxhQUFhLEVBQUUsR0FBdUIsRUFBRTtnQkFDdkMsTUFBTSx1QkFBdUIsR0FBRyxhQUFhLENBQUMsdUJBQXVCLENBQUE7Z0JBQ3JFLElBQUksWUFBWSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztvQkFDM0MsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUE7b0JBQ3hELElBQUksU0FBUyxFQUFFLENBQUM7d0JBQ2YsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLGtCQUFrQixDQUFBO3dCQUMvQyxPQUFPLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtvQkFDMUIsQ0FBQztnQkFDRixDQUFDO2dCQUNELE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7WUFDRCxlQUFlLEVBQUUsR0FBdUIsRUFBRTtnQkFDekMsTUFBTSx1QkFBdUIsR0FBRyxhQUFhLENBQUMsdUJBQXVCLENBQUE7Z0JBQ3JFLElBQUksWUFBWSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztvQkFDM0MsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUE7b0JBQ3hELElBQUksU0FBUyxFQUFFLENBQUM7d0JBQ2YsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLGNBQWMsQ0FBQTt3QkFDN0MsT0FBTyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUE7b0JBQzVCLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1lBQ0QsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUU7Z0JBQ3BCLE9BQU8sZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ3pDLENBQUM7U0FDRCxFQUNELFlBQVksRUFDWixXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ2hELG1CQUFtQixDQUNuQixDQUFBO1FBckhnQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUMvQiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ2pELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDckMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDM0IsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFFekIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBaEJ6Qyx5QkFBb0IsR0FBRyxJQUFJLEtBQUssRUFBdUMsQ0FBQTtRQWdJOUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN2QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFUSxLQUFLLENBQUMsNkJBQTZCLENBQzNDLE1BQXdDLEVBQ3hDLE1BQVcsRUFDWCxPQUFnQixFQUNoQixTQUFxQyxFQUNyQyxNQUE0QjtRQUU1Qiw0RUFBNEU7UUFDNUUsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFaEQsMEVBQTBFO1FBQzFFLE1BQU0sTUFBTSxHQUFHLCtCQUErQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM1RCxNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFN0UsT0FBTyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVRLEtBQUssQ0FBQyxzQkFBc0IsQ0FDcEMsTUFBd0MsRUFDeEMsTUFBVyxFQUNYLE9BQWdCLEVBQ2hCLG9CQUFnRCxFQUNoRCxNQUE0QjtRQUU1QixNQUFNLElBQUksR0FBRywrQkFBK0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFMUQseUNBQXlDO1FBQ3pDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDMUMsSUFBSSxNQUFrQyxDQUFBO1lBRXRDLFVBQVU7WUFDVixJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2pDLE1BQU0sU0FBUyxHQUNkLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxHQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksUUFBUSxDQUFDLEdBQUksQ0FBQTtnQkFDMUYsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBQ2xGLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQzt3QkFDL0IsTUFBTSxJQUFJLGFBQWEsQ0FDdEIsWUFBWSxDQUFDLE9BQU8sRUFDcEIsUUFBUSxDQUNQLDhCQUE4QixFQUM5QixrR0FBa0csRUFDbEcsU0FBUyxDQUNULENBQ0QsQ0FBQTtvQkFDRixDQUFDO29CQUNELE1BQU0sR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFBO2dCQUNuQixDQUFDO1lBQ0YsQ0FBQztZQUNELFFBQVE7aUJBQ0gsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUNwQyxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUNoQyxPQUFRLEVBQ1IsUUFBUSxDQUFDLEdBQUksRUFDYixNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLE9BQVEsRUFBRSxNQUFNLENBQUMsRUFDbEQsb0JBQW9CLENBQ3BCLENBQUE7WUFDRixDQUFDO1lBQ0QsdUJBQXVCO2lCQUNsQixJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pELE1BQU0sR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBRSxFQUFFLEVBQUUsQ0FBQTtZQUM1RSxDQUFDO1lBQ0QsOEJBQThCO2lCQUN6QixDQUFDO2dCQUNMLFNBQVE7WUFDVCxDQUFDO1lBRUQsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzFCLDBEQUEwRDtnQkFDMUQsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUVELElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQy9CLENBQUM7UUFFRCxPQUFPLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNGLENBQUM7SUFFTyxLQUFLLENBQUMsYUFBYSxDQUMxQixNQUF3QyxFQUN4QyxPQUFlLEVBQ2YsTUFBNEI7UUFFNUIsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsaUJBQWlCLEVBQUUsaUNBQXlCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMzRixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsa0NBQWtDO1FBQ2xDLElBQUksTUFBcUMsQ0FBQTtRQUN6QyxNQUFNLFNBQVMsR0FBNEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNqRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUMvQyxPQUFPLEVBQ1AsU0FBUyxDQUNULENBQUE7UUFFRCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osUUFBUSxNQUFNLEVBQUUsQ0FBQztnQkFDaEI7b0JBQ0MsTUFBTSxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFBO29CQUNuQyxNQUFLO2dCQUNOO29CQUNDLE1BQU0sR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQTtvQkFDcEMsTUFBSztnQkFDTjtvQkFDQyxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUE7b0JBQ2pDLE1BQUs7Z0JBQ047b0JBQ0MsTUFBTSxHQUFHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFBO29CQUN0QyxNQUFLO2dCQUNOO29CQUNDLE1BQU0sR0FBRyxNQUFNLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQTtvQkFDdkMsTUFBSztnQkFDTjtvQkFDQyxNQUFNLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQTtvQkFDeEMsTUFBSztnQkFDTjtvQkFDQyxNQUFNLEdBQUcsTUFBTSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUE7b0JBQ3RDLE1BQUs7Z0JBRU4sa0RBQTBDO2dCQUMxQztvQkFDQyxNQUFNLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sQ0FBQTtvQkFDNUMsTUFBSztZQUNQLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxLQUFLLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQU0sT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUFFLE1BQU0sQ0FBQTtRQUU5RSxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxZQUFZO1FBQ25CLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLHNCQUFzQixpQ0FBeUIsQ0FBQTtRQUN4RixNQUFNLEdBQUcsR0FBRyxJQUFJLFFBQVEsQ0FBaUIscUJBQXFCLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENBQUM7WUFDSixJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1lBQ25DLENBQUM7UUFDRixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsVUFBVTtRQUNYLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFFTyxhQUFhLENBQUMsR0FBNkI7UUFDbEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLHNCQUFzQixFQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxnRUFHNUIsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsYUFBYSxDQUMxQixPQUFlLEVBQ2YsUUFBZ0IsRUFDaEIsVUFBeUMsRUFDekMsb0JBQWdEO1FBRWhELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksYUFBYSxDQUN0QixZQUFZLENBQUMsS0FBSyxFQUNsQixRQUFRLENBQ1AsOEJBQThCLEVBQzlCLHdGQUF3RixFQUN4RixRQUFRLEVBQ1IsUUFBUSxDQUNSLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxRQUFRLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUNwRSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFFBQWdCLEVBQUUsRUFBRTtnQkFDN0MsTUFBTSxJQUFJLGFBQWEsQ0FDdEIsWUFBWSxDQUFDLEtBQUssRUFDbEIsUUFBUSxDQUNQLGdDQUFnQyxFQUNoQywrREFBK0QsRUFDL0QsUUFBUSxFQUNSLElBQUksQ0FBQyxJQUFJLEVBQ1QsUUFBUSxDQUNSLENBQ0QsQ0FBQTtZQUNGLENBQUMsQ0FBQTtZQUVELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUMzQyxNQUFNLGVBQWUsR0FBRyxHQUFHLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQTtZQUNoRCxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7WUFFaEUsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ25CLEtBQUssY0FBYyxDQUFDLENBQUMsQ0FBQztvQkFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7d0JBQ3ZDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFBO29CQUNoQyxDQUFDO29CQUNELE1BQU0sWUFBWSxHQUFrQjt3QkFDbkMsTUFBTSxFQUFFLElBQUksQ0FBQyxXQUFXO3dCQUN4QixlQUFlLEVBQUUsSUFBSTt3QkFDckIsS0FBSyxFQUNKLG9CQUFvQixFQUFFLENBQUMsU0FBUyxRQUFRLEVBQUUsQ0FBQyxJQUFJLG1CQUFtQixJQUFJLElBQUksQ0FBQyxPQUFPO3FCQUNuRixDQUFBO29CQUNELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUNuQixZQUFZLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUE7b0JBQ3RDLENBQUM7b0JBQ0QsT0FBTyxJQUFJLENBQUMsb0JBQW9CO3lCQUM5QixLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQzt5QkFDdkQsSUFBSSxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUU7d0JBQ3ZCLElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFLENBQUM7NEJBQ3ZDLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQTt3QkFDeEUsQ0FBQzt3QkFDRCxPQUFPLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsYUFBdUIsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtvQkFDbkYsQ0FBQyxDQUFDLENBQUE7Z0JBQ0osQ0FBQztnQkFFRCxLQUFLLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQ25CLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO3dCQUN2QyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtvQkFDaEMsQ0FBQztvQkFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7d0JBQ2pDLEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDOzRCQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0NBQ3RFLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFBOzRCQUMxQixDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUM1QixDQUFDO29CQUtELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUFrQixDQUFBO29CQUN6QyxLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDdkMsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFBO3dCQUN4RSxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUE7d0JBRXZFLE1BQU0sSUFBSSxHQUFtQjs0QkFDNUIsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLEtBQUssS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUs7NEJBQzNDLEtBQUssRUFBRSxLQUFLO3lCQUNaLENBQUE7d0JBRUQsTUFBTSxRQUFRLEdBQ2Isb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLFFBQVEsRUFBRSxDQUFDLElBQUksbUJBQW1CLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQTt3QkFDbkYsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDOzRCQUM1QixJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxXQUFXLENBQUMsQ0FBQTs0QkFDM0UsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTt3QkFDcEIsQ0FBQzs2QkFBTSxJQUFJLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQzs0QkFDL0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTt3QkFDcEIsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7d0JBQ2pCLENBQUM7b0JBQ0YsQ0FBQztvQkFFRCxNQUFNLFdBQVcsR0FBaUM7d0JBQ2pELFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVzt3QkFDN0IsYUFBYSxFQUFFLElBQUk7d0JBQ25CLGVBQWUsRUFBRSxJQUFJO3FCQUNyQixDQUFBO29CQUNELE9BQU8sSUFBSSxDQUFDLG9CQUFvQjt5QkFDOUIsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQzt5QkFDdkUsSUFBSSxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUU7d0JBQ3ZCLElBQUksYUFBYSxFQUFFLENBQUM7NEJBQ25CLE1BQU0sS0FBSyxHQUFJLGFBQWdDLENBQUMsS0FBSyxDQUFBOzRCQUNyRCxJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7NEJBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFBO3dCQUM5QixDQUFDO3dCQUNELE9BQU8sU0FBUyxDQUFBO29CQUNqQixDQUFDLENBQUMsQ0FBQTtnQkFDSixDQUFDO2dCQUVELEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7d0JBQ25DLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUM1QixDQUFDO29CQUNELE9BQU8sSUFBSSxDQUFDLG9CQUFvQjt5QkFDOUIsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFTLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO3lCQUNoRixJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTt3QkFDaEIsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7NEJBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQTt3QkFDdEMsQ0FBQzt3QkFDRCxNQUFNLElBQUksYUFBYSxDQUN0QixZQUFZLENBQUMsS0FBSyxFQUNsQixRQUFRLENBQ1Asb0NBQW9DLEVBQ3BDLHNHQUFzRyxFQUN0RyxRQUFRLEVBQ1IsSUFBSSxDQUFDLE9BQU8sQ0FDWixDQUNELENBQUE7b0JBQ0YsQ0FBQyxDQUFDLENBQUE7Z0JBQ0osQ0FBQztnQkFFRDtvQkFDQyxNQUFNLElBQUksYUFBYSxDQUN0QixZQUFZLENBQUMsS0FBSyxFQUNsQixRQUFRLENBQ1AsMkJBQTJCLEVBQzNCLHNGQUFzRixFQUN0RixRQUFRLENBQ1IsQ0FDRCxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLElBQUksYUFBYSxDQUN0QixZQUFZLENBQUMsS0FBSyxFQUNsQixRQUFRLENBQ1AsaUNBQWlDLEVBQ2pDLGlGQUFpRixFQUNqRixRQUFRLENBQ1IsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyJ9
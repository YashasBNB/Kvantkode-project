/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier, } from '../../../../../platform/extensions/common/extensions.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions, } from '../../../../services/extensionManagement/common/extensionFeatures.js';
import { isProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../../services/extensions/common/extensionsRegistry.js';
import { ILanguageModelToolsService } from '../languageModelToolsService.js';
import { toolsParametersSchemaSchemaId } from './languageModelToolsParametersSchema.js';
const languageModelToolsExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModelTools',
    activationEventsGenerator: (contributions, result) => {
        for (const contrib of contributions) {
            result.push(`onLanguageModelTool:${contrib.name}`);
        }
    },
    jsonSchema: {
        description: localize('vscode.extension.contributes.tools', 'Contributes a tool that can be invoked by a language model in a chat session, or from a standalone command. Registered tools can be used by all extensions.'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [
                {
                    body: {
                        name: '${1}',
                        modelDescription: '${2}',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                '${3:name}': {
                                    type: 'string',
                                    description: '${4:description}',
                                },
                            },
                        },
                    },
                },
            ],
            required: ['name', 'displayName', 'modelDescription'],
            properties: {
                name: {
                    description: localize('toolName', 'A unique name for this tool. This name must be a globally unique identifier, and is also used as a name when presenting this tool to a language model.'),
                    type: 'string',
                    // [\\w-]+ is OpenAI's requirement for tool names
                    pattern: '^(?!copilot_|vscode_)[\\w-]+$',
                },
                toolReferenceName: {
                    markdownDescription: localize('toolName2', "If {0} is enabled for this tool, the user may use '#' with this name to invoke the tool in a query. Otherwise, the name is not required. Name must not contain whitespace.", '`canBeReferencedInPrompt`'),
                    type: 'string',
                    pattern: '^[\\w-]+$',
                },
                displayName: {
                    description: localize('toolDisplayName', 'A human-readable name for this tool that may be used to describe it in the UI.'),
                    type: 'string',
                },
                userDescription: {
                    description: localize('toolUserDescription', 'A description of this tool that may be shown to the user.'),
                    type: 'string',
                },
                modelDescription: {
                    description: localize('toolModelDescription', 'A description of this tool that may be used by a language model to select it.'),
                    type: 'string',
                },
                inputSchema: {
                    description: localize('parametersSchema', 'A JSON schema for the input this tool accepts. The input must be an object at the top level. A particular language model may not support all JSON schema features. See the documentation for the language model family you are using for more information.'),
                    $ref: toolsParametersSchemaSchemaId,
                },
                canBeReferencedInPrompt: {
                    markdownDescription: localize('canBeReferencedInPrompt', 'If true, this tool shows up as an attachment that the user can add manually to their request. Chat participants will receive the tool in {0}.', '`ChatRequest#toolReferences`'),
                    type: 'boolean',
                },
                icon: {
                    markdownDescription: localize('icon', 'An icon that represents this tool. Either a file path, an object with file paths for dark and light themes, or a theme icon reference, like `$(zap)`'),
                    anyOf: [
                        {
                            type: 'string',
                        },
                        {
                            type: 'object',
                            properties: {
                                light: {
                                    description: localize('icon.light', 'Icon path when a light theme is used'),
                                    type: 'string',
                                },
                                dark: {
                                    description: localize('icon.dark', 'Icon path when a dark theme is used'),
                                    type: 'string',
                                },
                            },
                        },
                    ],
                },
                when: {
                    markdownDescription: localize('condition', 'Condition which must be true for this tool to be enabled. Note that a tool may still be invoked by another extension even when its `when` condition is false.'),
                    type: 'string',
                },
                tags: {
                    description: localize('toolTags', "A set of tags that roughly describe the tool's capabilities. A tool user may use these to filter the set of tools to just ones that are relevant for the task at hand, or they may want to pick a tag that can be used to identify just the tools contributed by this extension."),
                    type: 'array',
                    items: {
                        type: 'string',
                        pattern: '^(?!copilot_|vscode_)',
                    },
                },
            },
        },
    },
});
function toToolKey(extensionIdentifier, toolName) {
    return `${extensionIdentifier.value}/${toolName}`;
}
const CopilotAgentModeTag = 'vscode_editing';
let LanguageModelToolsExtensionPointHandler = class LanguageModelToolsExtensionPointHandler {
    static { this.ID = 'workbench.contrib.toolsExtensionPointHandler'; }
    constructor(languageModelToolsService, logService, productService) {
        this._registrationDisposables = new DisposableMap();
        languageModelToolsExtensionPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                for (const rawTool of extension.value) {
                    if (!rawTool.name || !rawTool.modelDescription || !rawTool.displayName) {
                        logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool without name, modelDescription, and displayName: ${JSON.stringify(rawTool)}`);
                        continue;
                    }
                    if (!rawTool.name.match(/^[\w-]+$/)) {
                        logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with invalid id: ${rawTool.name}. The id must match /^[\\w-]+$/.`);
                        continue;
                    }
                    if (rawTool.canBeReferencedInPrompt && !rawTool.toolReferenceName) {
                        logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with 'canBeReferencedInPrompt' set without a 'toolReferenceName': ${JSON.stringify(rawTool)}`);
                        continue;
                    }
                    if ((rawTool.name.startsWith('copilot_') || rawTool.name.startsWith('vscode_')) &&
                        !isProposedApiEnabled(extension.description, 'chatParticipantPrivate')) {
                        logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with name starting with "vscode_" or "copilot_"`);
                        continue;
                    }
                    if (rawTool.tags?.includes(CopilotAgentModeTag)) {
                        if (!isProposedApiEnabled(extension.description, 'languageModelToolsForAgent') &&
                            !isProposedApiEnabled(extension.description, 'chatParticipantPrivate')) {
                            logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with tag "${CopilotAgentModeTag}" without enabling 'languageModelToolsForAgent' proposal`);
                            continue;
                        }
                    }
                    if (rawTool.tags?.some((tag) => tag !== CopilotAgentModeTag &&
                        (tag.startsWith('copilot_') || tag.startsWith('vscode_'))) &&
                        !isProposedApiEnabled(extension.description, 'chatParticipantPrivate')) {
                        logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with tags starting with "vscode_" or "copilot_"`);
                        continue;
                    }
                    const rawIcon = rawTool.icon;
                    let icon;
                    if (typeof rawIcon === 'string') {
                        icon = ThemeIcon.fromString(rawIcon) ?? {
                            dark: joinPath(extension.description.extensionLocation, rawIcon),
                            light: joinPath(extension.description.extensionLocation, rawIcon),
                        };
                    }
                    else if (rawIcon) {
                        icon = {
                            dark: joinPath(extension.description.extensionLocation, rawIcon.dark),
                            light: joinPath(extension.description.extensionLocation, rawIcon.light),
                        };
                    }
                    // If OSS and the product.json is not set up, fall back to checking api proposal
                    const isBuiltinTool = productService.defaultChatAgent?.chatExtensionId
                        ? ExtensionIdentifier.equals(extension.description.identifier, productService.defaultChatAgent.chatExtensionId)
                        : isProposedApiEnabled(extension.description, 'chatParticipantPrivate');
                    const tool = {
                        ...rawTool,
                        source: {
                            type: 'extension',
                            extensionId: extension.description.identifier,
                            isExternalTool: !isBuiltinTool,
                        },
                        inputSchema: rawTool.inputSchema,
                        id: rawTool.name,
                        icon,
                        when: rawTool.when ? ContextKeyExpr.deserialize(rawTool.when) : undefined,
                        requiresConfirmation: !isBuiltinTool,
                        alwaysDisplayInputOutput: !isBuiltinTool,
                        supportsToolPicker: isBuiltinTool ? false : rawTool.canBeReferencedInPrompt,
                    };
                    const disposable = languageModelToolsService.registerToolData(tool);
                    this._registrationDisposables.set(toToolKey(extension.description.identifier, rawTool.name), disposable);
                }
            }
            for (const extension of delta.removed) {
                for (const tool of extension.value) {
                    this._registrationDisposables.deleteAndDispose(toToolKey(extension.description.identifier, tool.name));
                }
            }
        });
    }
};
LanguageModelToolsExtensionPointHandler = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, ILogService),
    __param(2, IProductService)
], LanguageModelToolsExtensionPointHandler);
export { LanguageModelToolsExtensionPointHandler };
class LanguageModelToolDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.languageModelTools;
    }
    render(manifest) {
        const contribs = manifest.contributes?.languageModelTools ?? [];
        if (!contribs.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('toolTableName', 'Name'),
            localize('toolTableDisplayName', 'Display Name'),
            localize('toolTableDescription', 'Description'),
        ];
        const rows = contribs.map((t) => {
            return [
                new MarkdownString(`\`${t.name}\``),
                t.displayName,
                t.userDescription ?? t.modelDescription,
            ];
        });
        return {
            data: {
                headers,
                rows,
            },
            dispose: () => { },
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'languageModelTools',
    label: localize('langModelTools', 'Language Model Tools'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(LanguageModelToolDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vdG9vbHMvbGFuZ3VhZ2VNb2RlbFRvb2xzQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRTlFLE9BQU8sRUFDTixVQUFVLEdBTVYsTUFBTSxzRUFBc0UsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMzRixPQUFPLEtBQUssa0JBQWtCLE1BQU0sOERBQThELENBQUE7QUFDbEcsT0FBTyxFQUFFLDBCQUEwQixFQUFhLE1BQU0saUNB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
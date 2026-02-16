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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi90b29scy9sYW5ndWFnZU1vZGVsVG9vbHNDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFOUUsT0FBTyxFQUNOLFVBQVUsR0FNVixNQUFNLHNFQUFzRSxDQUFBO0FBQzdFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzNGLE9BQU8sS0FBSyxrQkFBa0IsTUFBTSw4REFBOEQsQ0FBQTtBQUNsRyxPQUFPLEVB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
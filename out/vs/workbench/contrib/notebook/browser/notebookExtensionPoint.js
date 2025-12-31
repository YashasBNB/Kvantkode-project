/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { NotebookEditorPriority, } from '../common/notebookCommon.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Extensions, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
const NotebookEditorContribution = Object.freeze({
    type: 'type',
    displayName: 'displayName',
    selector: 'selector',
    priority: 'priority',
});
const NotebookRendererContribution = Object.freeze({
    id: 'id',
    displayName: 'displayName',
    mimeTypes: 'mimeTypes',
    entrypoint: 'entrypoint',
    hardDependencies: 'dependencies',
    optionalDependencies: 'optionalDependencies',
    requiresMessaging: 'requiresMessaging',
});
const NotebookPreloadContribution = Object.freeze({
    type: 'type',
    entrypoint: 'entrypoint',
    localResourceRoots: 'localResourceRoots',
});
const notebookProviderContribution = {
    description: nls.localize('contributes.notebook.provider', 'Contributes notebook document provider.'),
    type: 'array',
    defaultSnippets: [{ body: [{ type: '', displayName: '', selector: [{ filenamePattern: '' }] }] }],
    items: {
        type: 'object',
        required: [
            NotebookEditorContribution.type,
            NotebookEditorContribution.displayName,
            NotebookEditorContribution.selector,
        ],
        properties: {
            [NotebookEditorContribution.type]: {
                type: 'string',
                description: nls.localize('contributes.notebook.provider.viewType', 'Type of the notebook.'),
            },
            [NotebookEditorContribution.displayName]: {
                type: 'string',
                description: nls.localize('contributes.notebook.provider.displayName', 'Human readable name of the notebook.'),
            },
            [NotebookEditorContribution.selector]: {
                type: 'array',
                description: nls.localize('contributes.notebook.provider.selector', 'Set of globs that the notebook is for.'),
                items: {
                    type: 'object',
                    properties: {
                        filenamePattern: {
                            type: 'string',
                            description: nls.localize('contributes.notebook.provider.selector.filenamePattern', 'Glob that the notebook is enabled for.'),
                        },
                        excludeFileNamePattern: {
                            type: 'string',
                            description: nls.localize('contributes.notebook.selector.provider.excludeFileNamePattern', 'Glob that the notebook is disabled for.'),
                        },
                    },
                },
            },
            [NotebookEditorContribution.priority]: {
                type: 'string',
                markdownDeprecationMessage: nls.localize('contributes.priority', 'Controls if the custom editor is enabled automatically when the user opens a file. This may be overridden by users using the `workbench.editorAssociations` setting.'),
                enum: [NotebookEditorPriority.default, NotebookEditorPriority.option],
                markdownEnumDescriptions: [
                    nls.localize('contributes.priority.default', 'The editor is automatically used when the user opens a resource, provided that no other default custom editors are registered for that resource.'),
                    nls.localize('contributes.priority.option', 'The editor is not automatically used when the user opens a resource, but a user can switch to the editor using the `Reopen With` command.'),
                ],
                default: 'default',
            },
        },
    },
};
const defaultRendererSnippet = Object.freeze({
    id: '',
    displayName: '',
    mimeTypes: [''],
    entrypoint: '',
});
const notebookRendererContribution = {
    description: nls.localize('contributes.notebook.renderer', 'Contributes notebook output renderer provider.'),
    type: 'array',
    defaultSnippets: [{ body: [defaultRendererSnippet] }],
    items: {
        defaultSnippets: [{ body: defaultRendererSnippet }],
        allOf: [
            {
                type: 'object',
                required: [NotebookRendererContribution.id, NotebookRendererContribution.displayName],
                properties: {
                    [NotebookRendererContribution.id]: {
                        type: 'string',
                        description: nls.localize('contributes.notebook.renderer.viewType', 'Unique identifier of the notebook output renderer.'),
                    },
                    [NotebookRendererContribution.displayName]: {
                        type: 'string',
                        description: nls.localize('contributes.notebook.renderer.displayName', 'Human readable name of the notebook output renderer.'),
                    },
                    [NotebookRendererContribution.hardDependencies]: {
                        type: 'array',
                        uniqueItems: true,
                        items: { type: 'string' },
                        markdownDescription: nls.localize('contributes.notebook.renderer.hardDependencies', 'List of kernel dependencies the renderer requires. If any of the dependencies are present in the `NotebookKernel.preloads`, the renderer can be used.'),
                    },
                    [NotebookRendererContribution.optionalDependencies]: {
                        type: 'array',
                        uniqueItems: true,
                        items: { type: 'string' },
                        markdownDescription: nls.localize('contributes.notebook.renderer.optionalDependencies', "List of soft kernel dependencies the renderer can make use of. If any of the dependencies are present in the `NotebookKernel.preloads`, the renderer will be preferred over renderers that don't interact with the kernel."),
                    },
                    [NotebookRendererContribution.requiresMessaging]: {
                        default: 'never',
                        enum: ['always', 'optional', 'never'],
                        enumDescriptions: [
                            nls.localize('contributes.notebook.renderer.requiresMessaging.always', "Messaging is required. The renderer will only be used when it's part of an extension that can be run in an extension host."),
                            nls.localize('contributes.notebook.renderer.requiresMessaging.optional', "The renderer is better with messaging available, but it's not requried."),
                            nls.localize('contributes.notebook.renderer.requiresMessaging.never', 'The renderer does not require messaging.'),
                        ],
                        description: nls.localize('contributes.notebook.renderer.requiresMessaging', 'Defines how and if the renderer needs to communicate with an extension host, via `createRendererMessaging`. Renderers with stronger messaging requirements may not work in all environments.'),
                    },
                },
            },
            {
                oneOf: [
                    {
                        required: [
                            NotebookRendererContribution.entrypoint,
                            NotebookRendererContribution.mimeTypes,
                        ],
                        properties: {
                            [NotebookRendererContribution.mimeTypes]: {
                                type: 'array',
                                description: nls.localize('contributes.notebook.selector', 'Set of globs that the notebook is for.'),
                                items: {
                                    type: 'string',
                                },
                            },
                            [NotebookRendererContribution.entrypoint]: {
                                description: nls.localize('contributes.notebook.renderer.entrypoint', 'File to load in the webview to render the extension.'),
                                type: 'string',
                            },
                        },
                    },
                    {
                        required: [NotebookRendererContribution.entrypoint],
                        properties: {
                            [NotebookRendererContribution.entrypoint]: {
                                description: nls.localize('contributes.notebook.renderer.entrypoint', 'File to load in the webview to render the extension.'),
                                type: 'object',
                                required: ['extends', 'path'],
                                properties: {
                                    extends: {
                                        type: 'string',
                                        description: nls.localize('contributes.notebook.renderer.entrypoint.extends', 'Existing renderer that this one extends.'),
                                    },
                                    path: {
                                        type: 'string',
                                        description: nls.localize('contributes.notebook.renderer.entrypoint', 'File to load in the webview to render the extension.'),
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        ],
    },
};
const notebookPreloadContribution = {
    description: nls.localize('contributes.preload.provider', 'Contributes notebook preloads.'),
    type: 'array',
    defaultSnippets: [{ body: [{ type: '', entrypoint: '' }] }],
    items: {
        type: 'object',
        required: [NotebookPreloadContribution.type, NotebookPreloadContribution.entrypoint],
        properties: {
            [NotebookPreloadContribution.type]: {
                type: 'string',
                description: nls.localize('contributes.preload.provider.viewType', 'Type of the notebook.'),
            },
            [NotebookPreloadContribution.entrypoint]: {
                type: 'string',
                description: nls.localize('contributes.preload.entrypoint', 'Path to file loaded in the webview.'),
            },
            [NotebookPreloadContribution.localResourceRoots]: {
                type: 'array',
                items: { type: 'string' },
                description: nls.localize('contributes.preload.localResourceRoots', 'Paths to additional resources that should be allowed in the webview.'),
            },
        },
    },
};
export const notebooksExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'notebooks',
    jsonSchema: notebookProviderContribution,
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            if (contrib.type) {
                result.push(`onNotebookSerializer:${contrib.type}`);
            }
        }
    },
});
export const notebookRendererExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'notebookRenderer',
    jsonSchema: notebookRendererContribution,
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            if (contrib.id) {
                result.push(`onRenderer:${contrib.id}`);
            }
        }
    },
});
export const notebookPreloadExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'notebookPreload',
    jsonSchema: notebookPreloadContribution,
});
class NotebooksDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.notebooks;
    }
    render(manifest) {
        const contrib = manifest.contributes?.notebooks || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [nls.localize('Notebook id', 'ID'), nls.localize('Notebook name', 'Name')];
        const rows = contrib
            .sort((a, b) => a.type.localeCompare(b.type))
            .map((notebook) => {
            return [notebook.type, notebook.displayName];
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
class NotebookRenderersDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.notebookRenderer;
    }
    render(manifest) {
        const contrib = manifest.contributes?.notebookRenderer || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize('Notebook renderer name', 'Name'),
            nls.localize('Notebook mimetypes', 'Mimetypes'),
        ];
        const rows = contrib
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .map((notebookRenderer) => {
            return [notebookRenderer.displayName, notebookRenderer.mimeTypes.join(',')];
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
    id: 'notebooks',
    label: nls.localize('notebooks', 'Notebooks'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(NotebooksDataRenderer),
});
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'notebookRenderer',
    label: nls.localize('notebookRenderer', 'Notebook Renderers'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(NotebookRenderersDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvbm90ZWJvb2tFeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzlGLE9BQU8sRUFDTixzQkFBc0IsR0FHdEIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFNTixVQUFVLEdBQ1YsTUFBTSxtRUFBbUUsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsTUFBTSwwQkFBMEIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ2hELElBQUksRUFBRSxNQUFNO0lBQ1osV0FBVyxFQUFFLGFBQWE7SUFDMUIsUUFBUSxFQUFFLFVBQVU7SUFDcEIsUUFBUSxFQUFFLFVBQVU7Q0FDcEIsQ0FBQyxDQUFBO0FBWUYsTUFBTSw0QkFBNEIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ2xELEVBQUUsRUFBRSxJQUFJO0lBQ1IsV0FBVyxFQUFFLGFBQWE7SUFDMUIsU0FBUyxFQUFFLFdBQVc7SUFDdEIsVUFBVSxFQUFFLFlBQVk7SUFDeEIsZ0JBQWdCLEVBQUUsY0FBYztJQUNoQyxvQkFBb0IsRUFBRSxzQkFBc0I7SUFDNUMsaUJBQWlCLEVBQUUsbUJBQW1CO0NBQ3RDLENBQUMsQ0FBQTtBQVlGLE1BQU0sMkJBQTJCLEdB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
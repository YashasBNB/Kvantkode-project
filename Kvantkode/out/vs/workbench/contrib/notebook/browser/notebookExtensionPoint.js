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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9ub3RlYm9va0V4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDOUYsT0FBTyxFQUNOLHNCQUFzQixHQUd0QixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQU1OLFVBQVUsR0FDVixNQUFNLG1FQUFtRSxDQUFBO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSxNQUFNLDBCQUEwQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDaEQsSUFBSSxFQUFFLE1BQU07SUFDWixXQUFXLEVBQUUsYUFBYTtJQUMxQixRQUFRLEVBQUUsVUFBVTtJQUNwQixRQUFRLEVBQUUsVUFBVTtDQUNwQixDQUFDLENBQUE7QUFZRixNQUFNLDRCQUE0QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDbEQsRUFBRSxFQUFFLElBQUk7SUFDUixXQUFXLEVBQUUsYUFBYTtJQUMxQixTQUFTLEVBQUUsV0FBVztJQUN0QixVQUFVLEVBQUUsWUFBWTtJQUN4QixnQkFBZ0IsRUFBRSxjQUFjO0lBQ2hDLG9CQUFvQixFQUFFLHNCQUFzQjtJQUM1QyxpQkFBaUIsRUFBRSxtQkFBbUI7Q0FDdEMsQ0FBQyxDQUFBO0FBWUYsTUFBTSwyQkFB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
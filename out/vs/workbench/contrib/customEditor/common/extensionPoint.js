/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as nls from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { languagesExtPoint } from '../../../services/language/common/languageService.js';
const Fields = Object.freeze({
    viewType: 'viewType',
    displayName: 'displayName',
    selector: 'selector',
    priority: 'priority',
});
const CustomEditorsContribution = {
    description: nls.localize('contributes.customEditors', 'Contributed custom editors.'),
    type: 'array',
    defaultSnippets: [
        {
            body: [
                {
                    [Fields.viewType]: '$1',
                    [Fields.displayName]: '$2',
                    [Fields.selector]: [
                        {
                            filenamePattern: '$3',
                        },
                    ],
                },
            ],
        },
    ],
    items: {
        type: 'object',
        required: [Fields.viewType, Fields.displayName, Fields.selector],
        properties: {
            [Fields.viewType]: {
                type: 'string',
                markdownDescription: nls.localize('contributes.viewType', 'Identifier for the custom editor. This must be unique across all custom editors, so we recommend including your extension id as part of `viewType`. The `viewType` is used when registering custom editors with `vscode.registerCustomEditorProvider` and in the `onCustomEditor:${id}` [activation event](https://code.visualstudio.com/api/references/activation-events).'),
            },
            [Fields.displayName]: {
                type: 'string',
                description: nls.localize('contributes.displayName', 'Human readable name of the custom editor. This is displayed to users when selecting which editor to use.'),
            },
            [Fields.selector]: {
                type: 'array',
                description: nls.localize('contributes.selector', 'Set of globs that the custom editor is enabled for.'),
                items: {
                    type: 'object',
                    defaultSnippets: [
                        {
                            body: {
                                filenamePattern: '$1',
                            },
                        },
                    ],
                    properties: {
                        filenamePattern: {
                            type: 'string',
                            description: nls.localize('contributes.selector.filenamePattern', 'Glob that the custom editor is enabled for.'),
                        },
                    },
                },
            },
            [Fields.priority]: {
                type: 'string',
                markdownDeprecationMessage: nls.localize('contributes.priority', 'Controls if the custom editor is enabled automatically when the user opens a file. This may be overridden by users using the `workbench.editorAssociations` setting.'),
                enum: ["default" /* CustomEditorPriority.default */, "option" /* CustomEditorPriority.option */],
                markdownEnumDescriptions: [
                    nls.localize('contributes.priority.default', 'The editor is automatically used when the user opens a resource, provided that no other default custom editors are registered for that resource.'),
                    nls.localize('contributes.priority.option', 'The editor is not automatically used when the user opens a resource, but a user can switch to the editor using the `Reopen With` command.'),
                ],
                default: 'default',
            },
        },
    },
};
export const customEditorsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'customEditors',
    deps: [languagesExtPoint],
    jsonSchema: CustomEditorsContribution,
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            const viewType = contrib[Fields.viewType];
            if (viewType) {
                result.push(`onCustomEditor:${viewType}`);
            }
        }
    },
});
class CustomEditorsDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.customEditors;
    }
    render(manifest) {
        const customEditors = manifest.contributes?.customEditors || [];
        if (!customEditors.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize('customEditors view type', 'View Type'),
            nls.localize('customEditors priority', 'Priority'),
            nls.localize('customEditors filenamePattern', 'Filename Pattern'),
        ];
        const rows = customEditors.map((customEditor) => {
            return [
                customEditor.viewType,
                customEditor.priority ?? '',
                coalesce(customEditor.selector.map((x) => x.filenamePattern)).join(', '),
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
    id: 'customEditors',
    label: nls.localize('customEditors', 'Custom Editors'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(CustomEditorsDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jdXN0b21FZGl0b3IvY29tbW9uL2V4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTNFLE9BQU8sRUFDTixVQUFVLEdBTVYsTUFBTSxtRUFBbUUsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV4RixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzVCLFFBQVEsRUFBRSxVQUFVO0lBQ3BCLFdBQVcsRUFBRSxhQUFhO0lBQzFCLFFBQVEsRUFBRSxVQUFVO0lBQ3BCLFFBQVEsRUFBRSxVQUFVO0NBQ3BCLENBQUMsQ0FBQTtBQVNGLE1BQU0seUJBQXlCLEdBQWdCO0lBQzlDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDZCQUE2QixDQUFDO0lBQ3JGLElBQUksRUFBRSxPQUFPO0lBQ2IsZUFBZSxFQUFFO1FBQ2hCO1lBQ0MsSUFBSSxFQUFFO2dCQUNMO29CQUNDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUk7b0JBQ3ZCLENBQUMsTUFBTSxD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
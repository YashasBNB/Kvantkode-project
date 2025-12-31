/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
export var ViewsWelcomeExtensionPointFields;
(function (ViewsWelcomeExtensionPointFields) {
    ViewsWelcomeExtensionPointFields["view"] = "view";
    ViewsWelcomeExtensionPointFields["contents"] = "contents";
    ViewsWelcomeExtensionPointFields["when"] = "when";
    ViewsWelcomeExtensionPointFields["group"] = "group";
    ViewsWelcomeExtensionPointFields["enablement"] = "enablement";
})(ViewsWelcomeExtensionPointFields || (ViewsWelcomeExtensionPointFields = {}));
export const ViewIdentifierMap = {
    explorer: 'workbench.explorer.emptyView',
    debug: 'workbench.debug.welcome',
    scm: 'workbench.scm',
    testing: 'workbench.view.testing',
};
const viewsWelcomeExtensionPointSchema = Object.freeze({
    type: 'array',
    description: nls.localize('contributes.viewsWelcome', 'Contributed views welcome content. Welcome content will be rendered in tree based views whenever they have no meaningful content to display, ie. the File Explorer when no folder is open. Such content is useful as in-product documentation to drive users to use certain features before they are available. A good example would be a `Clone Repository` button in the File Explorer welcome view.'),
    items: {
        type: 'object',
        description: nls.localize('contributes.viewsWelcome.view', 'Contributed welcome content for a specific view.'),
        required: [ViewsWelcomeExtensionPointFields.view, ViewsWelcomeExtensionPointFields.contents],
        properties: {
            [ViewsWelcomeExtensionPointFields.view]: {
                anyOf: [
                    {
                        type: 'string',
                        description: nls.localize('contributes.viewsWelcome.view.view', 'Target view identifier for this welcome content. Only tree based views are supported.'),
                    },
                    {
                        type: 'string',
                        description: nls.localize('contributes.viewsWelcome.view.view', 'Target view identifier for this welcome content. Only tree based views are supported.'),
                        enum: Object.keys(ViewIdentifierMap),
                    },
                ],
            },
            [ViewsWelcomeExtensionPointFields.contents]: {
                type: 'string',
                description: nls.localize('contributes.viewsWelcome.view.contents', 'Welcome content to be displayed. The format of the contents is a subset of Markdown, with support for links only.'),
            },
            [ViewsWelcomeExtensionPointFields.when]: {
                type: 'string',
                description: nls.localize('contributes.viewsWelcome.view.when', 'Condition when the welcome content should be displayed.'),
            },
            [ViewsWelcomeExtensionPointFields.group]: {
                type: 'string',
                description: nls.localize('contributes.viewsWelcome.view.group', 'Group to which this welcome content belongs. Proposed API.'),
            },
            [ViewsWelcomeExtensionPointFields.enablement]: {
                type: 'string',
                description: nls.localize('contributes.viewsWelcome.view.enablement', 'Condition when the welcome content buttons and command links should be enabled.'),
            },
        },
    },
});
export const viewsWelcomeExtensionPointDescriptor = {
    extensionPoint: 'viewsWelcome',
    jsonSchema: viewsWelcomeExtensionPointSchema,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NXZWxjb21lRXh0ZW5zaW9uUG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lVmlld3MvY29tbW9uL3ZpZXdzV2VsY29tZUV4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFHekMsTUFBTSxDQUFOLElBQVksZ0NBTVg7QUFORCxXQUFZLGdDQUFnQztJQUMzQyxpREFBYSxDQUFBO0lBQ2IseURBQXFCLENBQUE7SUFDckIsaURBQWEsQ0FBQTtJQUNiLG1EQUFlLENBQUE7SUFDZiw2REFBeUIsQ0FBQTtBQUMxQixDQUFDLEVBTlcsZ0NBQWdDLEtBQWhDLGdDQUFnQyxRQU0zQztBQVlELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUE4QjtJQUMzRCxRQUFRLEVBQUUsOEJBQThCO0lBQ3hDLEtBQUssRUFBRSx5QkFBeUI7SUFDaEMsR0FBRyxFQUFFLGVBQWU7SUFDcEIsT0FBTyxFQUFFLHdCQUF3QjtDQUNqQyxDQUFBO0FBRUQsTUFBTSxnQ0FBZ0MsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUErQjtJQUNwRixJQUFJLEVBQUUsT0FBTztJQUNiLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwwQkFBMEIsRUFDMUIsd1lBQXdZLENBQ3hZO0lBQ0QsS0FBSyxFQUFFO1FBQ04sSUFBSSxFQUFFLFFBQVE7UUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsK0JBQStCLEVBQy9CLGtEQUFrRCxDQUNsRDtRQUNELFFBQVEsRUFBRSxDQUFDLGdDQUFnQyxDQUFDLElBQUksRUFBRSxnQ0FBZ0MsQ0FBQyxRQUFRLENBQUM7UUFDNUYsVUFBVSxFQUFFO1lBQ1gsQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDeEMsS0FBSyxFQUFFO29CQUNOO3dCQUNDLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixvQ0FBb0MsRUFDcEMsdUZBQXVGLENBQ3ZGO3FCQUNEO29CQUNEO3dCQUNDLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixvQ0FBb0MsRUFDcEMsdUZBQXVGLENBQ3ZGO3dCQUNELElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO3FCQUNwQztpQkFDRDthQUNEO1lBQ0QsQ0FBQyxnQ0FBZ0MsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDNUMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHdDQUF3QyxFQUN4QyxtSEFBbUgsQ0FDbkg7YUFDRDtZQUNELENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3hDLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixvQ0FBb0MsRUFDcEMseURBQXlELENBQ3pEO2FBQ0Q7WUFDRCxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN6QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIscUNBQXFDLEVBQ3JDLDREQUE0RCxDQUM1RDthQUNEO1lBQ0QsQ0FBQyxnQ0FBZ0MsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDOUMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDBDQUEwQyxFQUMxQyxpRkFBaUYsQ0FDakY7YUFDRDtTQUNEO0tBQ0Q7Q0FDRCxDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRztJQUNuRCxjQUFjLEVBQUUsY0FBYztJQUM5QixVQUFVLEVBQUUsZ0NBQWdDO0NBQzVDLENBQUEifQ==
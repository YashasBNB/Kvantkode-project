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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NXZWxjb21lRXh0ZW5zaW9uUG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVWaWV3cy9jb21tb24vdmlld3NXZWxjb21lRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxNQUFNLENBQU4sSUFBWSxnQ0FNWDtBQU5ELFdBQVksZ0NBQWdDO0lBQzNDLGlEQUFhLENBQUE7SUFDYix5REFBcUIsQ0FBQTtJQUNyQixpREFBYSxDQUFBO0lBQ2IsbURBQWUsQ0FBQTtJQUNmLDZEQUF5QixDQUFBO0FBQzFCLENBQUMsRUFOVyxnQ0FBZ0MsS0FBaEMsZ0NBQWdDLFFBTTNDO0FBWUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQThCO0lBQzNELFFBQVEsRUFBRSw4QkFBOEI7SUFDeEMsS0FBSyxFQUFFLHlCQUF5QjtJQUNoQyxHQUFHLEVBQUUsZUFBZTtJQUNwQixPQUFPLEVBQUUsd0JBQXdCO0NBQ2pDLENBQUE7QUFFRCxNQUFNLGdDQUFnQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQStCO0lBQ3BGLElBQUksRUFBRSxPQUFPO0lBQ2IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDBCQUEwQixFQUMxQix3WUFBd1ksQ0FDeFk7SUFDRCxLQUFLLEVBQUU7UUFDTixJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwrQkFBK0IsRUFDL0Isa0RBQWtELENBQ2xEO1FBQ0QsUUFBUSxFQUFFLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxFQUFFLGdDQUFnQyxDQUFDLFFBQVEsQ0FBQztRQUM1RixVQUFVLEVBQUU7WUFDWCxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN4QyxLQUFLLEVBQUU7b0JBQ047d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG9DQUFvQyxFQUNwQyx1RkFBdUYsQ0FDdkY7cUJBQ0Q7b0JBQ0Q7d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG9DQUFvQyxFQUNwQyx1RkFBdUYsQ0FDdkY7d0JBQ0QsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7cUJBQ3BDO2lCQUNEO2FBQ0Q7WUFDRCxDQUFDLGdDQUFnQyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM1QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsd0NBQXdDLEVBQ3hDLG1IQUFtSCxDQUNuSDthQUNEO1lBQ0QsQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDeEMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG9DQUFvQyxFQUNwQyx5REFBeUQsQ0FDekQ7YUFDRDtZQUNELENBQUMsZ0NBQWdDLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3pDLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixxQ0FBcUMsRUFDckMsNERBQTRELENBQzVEO2FBQ0Q7WUFDRCxDQUFDLGdDQUFnQyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUM5QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMENBQTBDLEVBQzFDLGlGQUFpRixDQUNqRjthQUNEO1NBQ0Q7S0FDRDtDQUNELENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHO0lBQ25ELGNBQWMsRUFBRSxjQUFjO0lBQzlCLFVBQVUsRUFBRSxnQ0FBZ0M7Q0FDNUMsQ0FBQSJ9
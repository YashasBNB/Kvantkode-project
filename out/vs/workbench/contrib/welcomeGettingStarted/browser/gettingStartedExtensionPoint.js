/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
const titleTranslated = localize('title', 'Title');
export const walkthroughsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'walkthroughs',
    jsonSchema: {
        description: localize('walkthroughs', 'Contribute walkthroughs to help users getting started with your extension.'),
        type: 'array',
        items: {
            type: 'object',
            required: ['id', 'title', 'description', 'steps'],
            defaultSnippets: [{ body: { id: '$1', title: '$2', description: '$3', steps: [] } }],
            properties: {
                id: {
                    type: 'string',
                    description: localize('walkthroughs.id', 'Unique identifier for this walkthrough.'),
                },
                title: {
                    type: 'string',
                    description: localize('walkthroughs.title', 'Title of walkthrough.'),
                },
                icon: {
                    type: 'string',
                    description: localize('walkthroughs.icon', 'Relative path to the icon of the walkthrough. The path is relative to the extension location. If not specified, the icon defaults to the extension icon if available.'),
                },
                description: {
                    type: 'string',
                    description: localize('walkthroughs.description', 'Description of walkthrough.'),
                },
                featuredFor: {
                    type: 'array',
                    description: localize('walkthroughs.featuredFor', "Walkthroughs that match one of these glob patterns appear as 'featured' in workspaces with the specified files. For example, a walkthrough for TypeScript projects might specify `tsconfig.json` here."),
                    items: {
                        type: 'string',
                    },
                },
                when: {
                    type: 'string',
                    description: localize('walkthroughs.when', 'Context key expression to control the visibility of this walkthrough.'),
                },
                steps: {
                    type: 'array',
                    description: localize('walkthroughs.steps', 'Steps to complete as part of this walkthrough.'),
                    items: {
                        type: 'object',
                        required: ['id', 'title', 'media'],
                        defaultSnippets: [
                            {
                                body: {
                                    id: '$1',
                                    title: '$2',
                                    description: '$3',
                                    completionEvents: ['$5'],
                                    media: {},
                                },
                            },
                        ],
                        properties: {
                            id: {
                                type: 'string',
                                description: localize('walkthroughs.steps.id', 'Unique identifier for this step. This is used to keep track of which steps have been completed.'),
                            },
                            title: {
                                type: 'string',
                                description: localize('walkthroughs.steps.title', 'Title of step.'),
                            },
                            description: {
                                type: 'string',
                                description: localize('walkthroughs.steps.description.interpolated', 'Description of step. Supports ``preformatted``, __italic__, and **bold** text. Use markdown-style links for commands or external links: {0}, {1}, or {2}. Links on their own line will be rendered as buttons.', `[${titleTranslated}](command:myext.command)`, `[${titleTranslated}](command:toSide:myext.command)`, `[${titleTranslated}](https://aka.ms)`),
                            },
                            button: {
                                deprecationMessage: localize('walkthroughs.steps.button.deprecated.interpolated', 'Deprecated. Use markdown links in the description instead, i.e. {0}, {1}, or {2}', `[${titleTranslated}](command:myext.command)`, `[${titleTranslated}](command:toSide:myext.command)`, `[${titleTranslated}](https://aka.ms)`),
                            },
                            media: {
                                type: 'object',
                                description: localize('walkthroughs.steps.media', 'Media to show alongside this step, either an image or markdown content.'),
                                oneOf: [
                                    {
                                        required: ['image', 'altText'],
                                        additionalProperties: false,
                                        properties: {
                                            path: {
                                                deprecationMessage: localize('pathDeprecated', 'Deprecated. Please use `image` or `markdown` instead'),
                                            },
                                            image: {
                                                description: localize('walkthroughs.steps.media.image.path.string', 'Path to an image - or object consisting of paths to light, dark, and hc images - relative to extension directory. Depending on context, the image will be displayed from 400px to 800px wide, with similar bounds on height. To support HIDPI displays, the image will be rendered at 1.5x scaling, for example a 900 physical pixels wide image will be displayed as 600 logical pixels wide.'),
                                                oneOf: [
                                                    {
                                                        type: 'string',
                                                    },
                                                    {
                                                        type: 'object',
                                                        required: ['dark', 'light', 'hc', 'hcLight'],
                                                        properties: {
                                                            dark: {
                                                                description: localize('walkthroughs.steps.media.image.path.dark.string', 'Path to the image for dark themes, relative to extension directory.'),
                                                                type: 'string',
                                                            },
                                                            light: {
                                                                description: localize('walkthroughs.steps.media.image.path.light.string', 'Path to the image for light themes, relative to extension directory.'),
                                                                type: 'string',
                                                            },
                                                            hc: {
                                                                description: localize('walkthroughs.steps.media.image.path.hc.string', 'Path to the image for hc themes, relative to extension directory.'),
                                                                type: 'string',
                                                            },
                                                            hcLight: {
                                                                description: localize('walkthroughs.steps.media.image.path.hcLight.string', 'Path to the image for hc light themes, relative to extension directory.'),
                                                                type: 'string',
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                            altText: {
                                                type: 'string',
                                                description: localize('walkthroughs.steps.media.altText', 'Alternate text to display when the image cannot be loaded or in screen readers.'),
                                            },
                                        },
                                    },
                                    {
                                        required: ['svg', 'altText'],
                                        additionalProperties: false,
                                        properties: {
                                            svg: {
                                                description: localize('walkthroughs.steps.media.image.path.svg', 'Path to an svg, color tokens are supported in variables to support theming to match the workbench.'),
                                                type: 'string',
                                            },
                                            altText: {
                                                type: 'string',
                                                description: localize('walkthroughs.steps.media.altText', 'Alternate text to display when the image cannot be loaded or in screen readers.'),
                                            },
                                        },
                                    },
                                    {
                                        required: ['markdown'],
                                        additionalProperties: false,
                                        properties: {
                                            path: {
                                                deprecationMessage: localize('pathDeprecated', 'Deprecated. Please use `image` or `markdown` instead'),
                                            },
                                            markdown: {
                                                description: localize('walkthroughs.steps.media.markdown.path', 'Path to the markdown document, relative to extension directory.'),
                                                type: 'string',
                                            },
                                        },
                                    },
                                ],
                            },
                            completionEvents: {
                                description: localize('walkthroughs.steps.completionEvents', "Events that should trigger this step to become checked off. If empty or not defined, the step will check off when any of the step's buttons or links are clicked; if the step has no buttons or links it will check on when it is selected."),
                                type: 'array',
                                items: {
                                    type: 'string',
                                    defaultSnippets: [
                                        {
                                            label: 'onCommand',
                                            description: localize('walkthroughs.steps.completionEvents.onCommand', 'Check off step when a given command is executed anywhere in VS Code.'),
                                            body: 'onCommand:${1:commandId}',
                                        },
                                        {
                                            label: 'onLink',
                                            description: localize('walkthroughs.steps.completionEvents.onLink', 'Check off step when a given link is opened via a walkthrough step.'),
                                            body: 'onLink:${2:linkId}',
                                        },
                                        {
                                            label: 'onView',
                                            description: localize('walkthroughs.steps.completionEvents.onView', 'Check off step when a given view is opened'),
                                            body: 'onView:${2:viewId}',
                                        },
                                        {
                                            label: 'onSettingChanged',
                                            description: localize('walkthroughs.steps.completionEvents.onSettingChanged', 'Check off step when a given setting is changed'),
                                            body: 'onSettingChanged:${2:settingName}',
                                        },
                                        {
                                            label: 'onContext',
                                            description: localize('walkthroughs.steps.completionEvents.onContext', 'Check off step when a context key expression is true.'),
                                            body: 'onContext:${2:key}',
                                        },
                                        {
                                            label: 'onExtensionInstalled',
                                            description: localize('walkthroughs.steps.completionEvents.extensionInstalled', 'Check off step when an extension with the given id is installed. If the extension is already installed, the step will start off checked.'),
                                            body: 'onExtensionInstalled:${3:extensionId}',
                                        },
                                        {
                                            label: 'onStepSelected',
                                            description: localize('walkthroughs.steps.completionEvents.stepSelected', 'Check off step as soon as it is selected.'),
                                            body: 'onStepSelected',
                                        },
                                    ],
                                },
                            },
                            doneOn: {
                                description: localize('walkthroughs.steps.doneOn', 'Signal to mark step as complete.'),
                                deprecationMessage: localize('walkthroughs.steps.doneOn.deprecation', 'doneOn is deprecated. By default steps will be checked off when their buttons are clicked, to configure further use completionEvents'),
                                type: 'object',
                                required: ['command'],
                                defaultSnippets: [{ body: { command: '$1' } }],
                                properties: {
                                    command: {
                                        description: localize('walkthroughs.steps.oneOn.command', 'Mark step done when the specified command is executed.'),
                                        type: 'string',
                                    },
                                },
                            },
                            when: {
                                type: 'string',
                                description: localize('walkthroughs.steps.when', 'Context key expression to control the visibility of this step.'),
                            },
                        },
                    },
                },
            },
        },
    },
    activationEventsGenerator: (walkthroughContributions, result) => {
        for (const walkthroughContribution of walkthroughContributions) {
            if (walkthroughContribution.id) {
                result.push(`onWalkthrough:${walkthroughContribution.id}`);
            }
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVHZXR0aW5nU3RhcnRlZC9icm93c2VyL2dldHRpbmdTdGFydGVkRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRTlGLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFFbEQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLENBQ2xGO0lBQ0MsY0FBYyxFQUFFLGNBQWM7SUFDOUIsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsY0FBYyxFQUNkLDRFQUE0RSxDQUM1RTtRQUNELElBQUksRUFBRSxPQUFPO1FBQ2IsS0FBSyxFQUFFO1lBQ04sSUFBSSxFQUFFLFFBQVE7WUFDZCxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUM7WUFDakQsZUFBZSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNwRixVQUFVLEVBQUU7Z0JBQ1gsRUFBRSxFQUFFO29CQUNILElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUseUNBQXlDLENBQUM7aUJBQ25GO2dCQUNELEtB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
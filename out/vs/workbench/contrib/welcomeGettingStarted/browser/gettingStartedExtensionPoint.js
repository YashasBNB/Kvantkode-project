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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWRFeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFFOUYsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtBQUVsRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FDbEY7SUFDQyxjQUFjLEVBQUUsY0FBYztJQUM5QixVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsUUFBUSxDQUNwQixjQUFjLEVBQ2QsNEVBQTRFLENBQzVFO1FBQ0QsSUFBSSxFQUFFLE9BQU87UUFDYixLQUFLLEVBQUU7WUFDTixJQUFJLEVBQUUsUUFBUTtZQUNkLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQztZQUNqRCxlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3BGLFVBQVUsRUFBRTtnQkFDWCxFQUFFLEVBQUU7b0JBQ0gsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSx5Q0FB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
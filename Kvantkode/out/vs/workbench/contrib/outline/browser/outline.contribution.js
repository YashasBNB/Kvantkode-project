/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { OutlinePane } from './outlinePane.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { VIEW_CONTAINER } from '../../files/browser/explorerViewlet.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IOutlinePane } from './outline.js';
// --- actions
import './outlineActions.js';
// --- view
const outlineViewIcon = registerIcon('outline-view-icon', Codicon.symbolClass, localize('outlineViewIcon', 'View icon of the outline view.'));
Registry.as(ViewExtensions.ViewsRegistry).registerViews([
    {
        id: IOutlinePane.Id,
        name: localize2('name', 'Outline'),
        containerIcon: outlineViewIcon,
        ctorDescriptor: new SyncDescriptor(OutlinePane),
        canToggleVisibility: true,
        canMoveView: true,
        hideByDefault: false,
        collapsed: true,
        order: 2,
        weight: 30,
        focusCommand: { id: 'outline.focus' },
    },
], VIEW_CONTAINER);
// --- configurations
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'outline',
    order: 117,
    title: localize('outlineConfigurationTitle', 'Outline'),
    type: 'object',
    properties: {
        ["outline.icons" /* OutlineConfigKeys.icons */]: {
            description: localize('outline.showIcons', 'Render Outline elements with icons.'),
            type: 'boolean',
            default: true,
        },
        ["outline.collapseItems" /* OutlineConfigKeys.collapseItems */]: {
            description: localize('outline.initialState', 'Controls whether Outline items are collapsed or expanded.'),
            type: 'string',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            enum: ['alwaysCollapse', 'alwaysExpand'],
            enumDescriptions: [
                localize('outline.initialState.collapsed', 'Collapse all items.'),
                localize('outline.initialState.expanded', 'Expand all items.'),
            ],
            default: 'alwaysExpand',
        },
        ["outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */]: {
            markdownDescription: localize('outline.showProblem', 'Show errors and warnings on Outline elements. Overwritten by {0} when it is off.', '`#problems.visibility#`'),
            type: 'boolean',
            default: true,
        },
        ["outline.problems.colors" /* OutlineConfigKeys.problemsColors */]: {
            markdownDescription: localize('outline.problem.colors', 'Use colors for errors and warnings on Outline elements. Overwritten by {0} when it is off.', '`#problems.visibility#`'),
            type: 'boolean',
            default: true,
        },
        ["outline.problems.badges" /* OutlineConfigKeys.problemsBadges */]: {
            markdownDescription: localize('outline.problems.badges', 'Use badges for errors and warnings on Outline elements. Overwritten by {0} when it is off.', '`#problems.visibility#`'),
            type: 'boolean',
            default: true,
        },
        'outline.showFiles': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            default: true,
            markdownDescription: localize('filteredTypes.file', 'When enabled, Outline shows `file`-symbols.'),
        },
        'outline.showModules': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            default: true,
            markdownDescription: localize('filteredTypes.module', 'When enabled, Outline shows `module`-symbols.'),
        },
        'outline.showNamespaces': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.namespace', 'When enabled, Outline shows `namespace`-symbols.'),
        },
        'outline.showPackages': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.package', 'When enabled, Outline shows `package`-symbols.'),
        },
        'outline.showClasses': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.class', 'When enabled, Outline shows `class`-symbols.'),
        },
        'outline.showMethods': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.method', 'When enabled, Outline shows `method`-symbols.'),
        },
        'outline.showProperties': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.property', 'When enabled, Outline shows `property`-symbols.'),
        },
        'outline.showFields': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.field', 'When enabled, Outline shows `field`-symbols.'),
        },
        'outline.showConstructors': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.constructor', 'When enabled, Outline shows `constructor`-symbols.'),
        },
        'outline.showEnums': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.enum', 'When enabled, Outline shows `enum`-symbols.'),
        },
        'outline.showInterfaces': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.interface', 'When enabled, Outline shows `interface`-symbols.'),
        },
        'outline.showFunctions': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.function', 'When enabled, Outline shows `function`-symbols.'),
        },
        'outline.showVariables': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.variable', 'When enabled, Outline shows `variable`-symbols.'),
        },
        'outline.showConstants': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.constant', 'When enabled, Outline shows `constant`-symbols.'),
        },
        'outline.showStrings': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.string', 'When enabled, Outline shows `string`-symbols.'),
        },
        'outline.showNumbers': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.number', 'When enabled, Outline shows `number`-symbols.'),
        },
        'outline.showBooleans': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            default: true,
            markdownDescription: localize('filteredTypes.boolean', 'When enabled, Outline shows `boolean`-symbols.'),
        },
        'outline.showArrays': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.array', 'When enabled, Outline shows `array`-symbols.'),
        },
        'outline.showObjects': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.object', 'When enabled, Outline shows `object`-symbols.'),
        },
        'outline.showKeys': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.key', 'When enabled, Outline shows `key`-symbols.'),
        },
        'outline.showNull': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.null', 'When enabled, Outline shows `null`-symbols.'),
        },
        'outline.showEnumMembers': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.enumMember', 'When enabled, Outline shows `enumMember`-symbols.'),
        },
        'outline.showStructs': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.struct', 'When enabled, Outline shows `struct`-symbols.'),
        },
        'outline.showEvents': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.event', 'When enabled, Outline shows `event`-symbols.'),
        },
        'outline.showOperators': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.operator', 'When enabled, Outline shows `operator`-symbols.'),
        },
        'outline.showTypeParameters': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.typeParameter', 'When enabled, Outline shows `typeParameter`-symbols.'),
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL291dGxpbmUvYnJvd3Nlci9vdXRsaW5lLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBa0IsVUFBVSxJQUFJLGNBQWMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUUzQyxjQUFjO0FBRWQsT0FBTyxxQkFBcUIsQ0FBQTtBQUU1QixXQUFXO0FBRVgsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUNuQyxtQkFBbUIsRUFDbkIsT0FBTyxDQUFDLFdBQVcsRUFDbkIsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGdDQUFnQyxDQUFDLENBQzdELENBQUE7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUFpQixjQUFjLENBQUMsYUFBYSxDQUFDLENBQUMsYUFBYSxDQUN0RTtJQUNDO1FBQ0MsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFO1FBQ25CLElBQUksRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQztRQUNsQyxhQUFhLEVBQUUsZUFBZTtRQUM5QixjQUFjLEVBQUUsSUFBSSxjQUFjLENBQUMsV0FBVyxDQUFDO1FBQy9DLG1CQUFtQixFQUFFLElBQUk7UUFDekIsV0FBVyxFQUFFLElBQUk7UUFDakIsYUFBYSxFQUFFLEtBQUs7UUFDcEIsU0FBUyxFQUFFLElBQUk7UUFDZixLQUFLLEVBQUUsQ0FBQztRQUNSLE1BQU0sRUFBRSxFQUFFO1FBQ1YsWUFBWSxFQUFFLEVBQUUsRUFBRSxFQUFFLGVBQWUsRUFBRTtLQUNyQztDQUNELEVBQ0QsY0FBYyxDQUNkLENBQUE7QUFFRCxxQkFBcUI7QUFFckIsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUMscUJBQXFCLENBQUM7SUFDaEcsRUFBRSxFQUFFLFNBQVM7SUFDYixLQUFLLEVBQUUsR0FBRztJQUNWLEtBQUssRUFBRSxRQUFRLENBQUMsMkJBQTJCLEVBQUUsU0FBUyxDQUFDO0lBQ3ZELElBQUksRUFBRSxRQUFRO0lBQ2QsVUFBVSxFQUFFO1FBQ1gsK0NBQXlCLEVBQUU7WUFDMUIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxxQ0FBcUMsQ0FBQztZQUNqRixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCwrREFBaUMsRUFBRTtZQUNsQyxXQUFXLEVBQUUsUUFBUSxDQUNwQixzQkFBc0IsRUFDdEIsMkRBQTJELENBQzNEO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxLQUFLLGlEQUF5QztZQUM5QyxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLENBQUM7WUFDeEMsZ0JBQWdCLEVBQUU7Z0JBQ2pCLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxxQkFBcUIsQ0FBQztnQkFDakUsUUFBUSxDQUFDLCtCQUErQixFQUFFLG1CQUFtQixDQUFDO2FBQzlEO1lBQ0QsT0FBTyxFQUFFLGNBQWM7U0FDdkI7UUFDRCxvRUFBbUMsRUFBRTtZQUNwQyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLHFCQUFxQixFQUNyQixrRkFBa0YsRUFDbEYseUJBQXlCLENBQ3pCO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtTQUNiO1FBQ0Qsa0VBQWtDLEVBQUU7WUFDbkMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix3QkFBd0IsRUFDeEIsNEZBQTRGLEVBQzVGLHlCQUF5QixDQUN6QjtZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELGtFQUFrQyxFQUFFO1lBQ25DLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIseUJBQXlCLEVBQ3pCLDRGQUE0RixFQUM1Rix5QkFBeUIsQ0FDekI7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCxtQkFBbUIsRUFBRTtZQUNwQixJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssaURBQXlDO1lBQzlDLE9BQU8sRUFBRSxJQUFJO1lBQ2IsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixvQkFBb0IsRUFDcEIsNkNBQTZDLENBQzdDO1NBQ0Q7UUFDRCxxQkFBcUIsRUFBRTtZQUN0QixJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssaURBQXlDO1lBQzlDLE9BQU8sRUFBRSxJQUFJO1lBQ2IsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixzQkFBc0IsRUFDdEIsK0NBQStDLENBQy9DO1NBQ0Q7UUFDRCx3QkFBd0IsRUFBRTtZQUN6QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix5QkFBeUIsRUFDekIsa0RBQWtELENBQ2xEO1NBQ0Q7UUFDRCxzQkFBc0IsRUFBRTtZQUN2QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix1QkFBdUIsRUFDdkIsZ0RBQWdELENBQ2hEO1NBQ0Q7UUFDRCxxQkFBcUIsRUFBRTtZQUN0QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixxQkFBcUIsRUFDckIsOENBQThDLENBQzlDO1NBQ0Q7UUFDRCxxQkFBcUIsRUFBRTtZQUN0QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixzQkFBc0IsRUFDdEIsK0NBQStDLENBQy9DO1NBQ0Q7UUFDRCx3QkFBd0IsRUFBRTtZQUN6QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix3QkFBd0IsRUFDeEIsaURBQWlELENBQ2pEO1NBQ0Q7UUFDRCxvQkFBb0IsRUFBRTtZQUNyQixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixxQkFBcUIsRUFDckIsOENBQThDLENBQzlDO1NBQ0Q7UUFDRCwwQkFBMEIsRUFBRTtZQUMzQixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QiwyQkFBMkIsRUFDM0Isb0RBQW9ELENBQ3BEO1NBQ0Q7UUFDRCxtQkFBbUIsRUFBRTtZQUNwQixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixvQkFBb0IsRUFDcEIsNkNBQTZDLENBQzdDO1NBQ0Q7UUFDRCx3QkFBd0IsRUFBRTtZQUN6QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix5QkFBeUIsRUFDekIsa0RBQWtELENBQ2xEO1NBQ0Q7UUFDRCx1QkFBdUIsRUFBRTtZQUN4QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix3QkFBd0IsRUFDeEIsaURBQWlELENBQ2pEO1NBQ0Q7UUFDRCx1QkFBdUIsRUFBRTtZQUN4QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix3QkFBd0IsRUFDeEIsaURBQWlELENBQ2pEO1NBQ0Q7UUFDRCx1QkFBdUIsRUFBRTtZQUN4QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix3QkFBd0IsRUFDeEIsaURBQWlELENBQ2pEO1NBQ0Q7UUFDRCxxQkFBcUIsRUFBRTtZQUN0QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixzQkFBc0IsRUFDdEIsK0NBQStDLENBQy9DO1NBQ0Q7UUFDRCxxQkFBcUIsRUFBRTtZQUN0QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixzQkFBc0IsRUFDdEIsK0NBQStDLENBQy9DO1NBQ0Q7UUFDRCxzQkFBc0IsRUFBRTtZQUN2QixJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssaURBQXlDO1lBQzlDLE9BQU8sRUFBRSxJQUFJO1lBQ2IsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix1QkFBdUIsRUFDdkIsZ0RBQWdELENBQ2hEO1NBQ0Q7UUFDRCxvQkFBb0IsRUFBRTtZQUNyQixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixxQkFBcUIsRUFDckIsOENBQThDLENBQzlDO1NBQ0Q7UUFDRCxxQkFBcUIsRUFBRTtZQUN0QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixzQkFBc0IsRUFDdEIsK0NBQStDLENBQy9DO1NBQ0Q7UUFDRCxrQkFBa0IsRUFBRTtZQUNuQixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixtQkFBbUIsRUFDbkIsNENBQTRDLENBQzVDO1NBQ0Q7UUFDRCxrQkFBa0IsRUFBRTtZQUNuQixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixvQkFBb0IsRUFDcEIsNkNBQTZDLENBQzdDO1NBQ0Q7UUFDRCx5QkFBeUIsRUFBRTtZQUMxQixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QiwwQkFBMEIsRUFDMUIsbURBQW1ELENBQ25EO1NBQ0Q7UUFDRCxxQkFBcUIsRUFBRTtZQUN0QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixzQkFBc0IsRUFDdEIsK0NBQStDLENBQy9DO1NBQ0Q7UUFDRCxvQkFBb0IsRUFBRTtZQUNyQixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixxQkFBcUIsRUFDckIsOENBQThDLENBQzlDO1NBQ0Q7UUFDRCx1QkFBdUIsRUFBRTtZQUN4QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix3QkFBd0IsRUFDeEIsaURBQWlELENBQ2pEO1NBQ0Q7UUFDRCw0QkFBNEIsRUFBRTtZQUM3QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qiw2QkFBNkIsRUFDN0Isc0RBQXNELENBQ3REO1NBQ0Q7S0FDRDtDQUNELENBQUMsQ0FBQSJ9
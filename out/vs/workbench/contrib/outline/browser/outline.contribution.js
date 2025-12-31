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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRsaW5lL2Jyb3dzZXIvb3V0bGluZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQWtCLFVBQVUsSUFBSSxjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBRXJDLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWhGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFFM0MsY0FBYztBQUVkLE9BQU8scUJBQXFCLENBQUE7QUFFNUIsV0FBVztBQUVYLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FDbkMsbUJBQW1CLEVBQ25CLE9BQU8sQ0FBQyxXQUFXLEVBQ25CLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUM3RCxDQUFBO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBaUIsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLGFBQWEsQ0FDdEU7SUFD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
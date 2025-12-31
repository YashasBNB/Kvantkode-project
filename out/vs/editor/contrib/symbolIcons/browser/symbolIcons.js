/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './symbolIcons.css';
import { localize } from '../../../../nls.js';
import { foreground, registerColor } from '../../../../platform/theme/common/colorRegistry.js';
export const SYMBOL_ICON_ARRAY_FOREGROUND = registerColor('symbolIcon.arrayForeground', foreground, localize('symbolIcon.arrayForeground', 'The foreground color for array symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_BOOLEAN_FOREGROUND = registerColor('symbolIcon.booleanForeground', foreground, localize('symbolIcon.booleanForeground', 'The foreground color for boolean symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_CLASS_FOREGROUND = registerColor('symbolIcon.classForeground', {
    dark: '#EE9D28',
    light: '#D67E00',
    hcDark: '#EE9D28',
    hcLight: '#D67E00',
}, localize('symbolIcon.classForeground', 'The foreground color for class symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_COLOR_FOREGROUND = registerColor('symbolIcon.colorForeground', foreground, localize('symbolIcon.colorForeground', 'The foreground color for color symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_CONSTANT_FOREGROUND = registerColor('symbolIcon.constantForeground', foreground, localize('symbolIcon.constantForeground', 'The foreground color for constant symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_CONSTRUCTOR_FOREGROUND = registerColor('symbolIcon.constructorForeground', {
    dark: '#B180D7',
    light: '#652D90',
    hcDark: '#B180D7',
    hcLight: '#652D90',
}, localize('symbolIcon.constructorForeground', 'The foreground color for constructor symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_ENUMERATOR_FOREGROUND = registerColor('symbolIcon.enumeratorForeground', {
    dark: '#EE9D28',
    light: '#D67E00',
    hcDark: '#EE9D28',
    hcLight: '#D67E00',
}, localize('symbolIcon.enumeratorForeground', 'The foreground color for enumerator symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_ENUMERATOR_MEMBER_FOREGROUND = registerColor('symbolIcon.enumeratorMemberForeground', {
    dark: '#75BEFF',
    light: '#007ACC',
    hcDark: '#75BEFF',
    hcLight: '#007ACC',
}, localize('symbolIcon.enumeratorMemberForeground', 'The foreground color for enumerator member symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_EVENT_FOREGROUND = registerColor('symbolIcon.eventForeground', {
    dark: '#EE9D28',
    light: '#D67E00',
    hcDark: '#EE9D28',
    hcLight: '#D67E00',
}, localize('symbolIcon.eventForeground', 'The foreground color for event symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_FIELD_FOREGROUND = registerColor('symbolIcon.fieldForeground', {
    dark: '#75BEFF',
    light: '#007ACC',
    hcDark: '#75BEFF',
    hcLight: '#007ACC',
}, localize('symbolIcon.fieldForeground', 'The foreground color for field symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_FILE_FOREGROUND = registerColor('symbolIcon.fileForeground', foreground, localize('symbolIcon.fileForeground', 'The foreground color for file symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_FOLDER_FOREGROUND = registerColor('symbolIcon.folderForeground', foreground, localize('symbolIcon.folderForeground', 'The foreground color for folder symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_FUNCTION_FOREGROUND = registerColor('symbolIcon.functionForeground', {
    dark: '#B180D7',
    light: '#652D90',
    hcDark: '#B180D7',
    hcLight: '#652D90',
}, localize('symbolIcon.functionForeground', 'The foreground color for function symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_INTERFACE_FOREGROUND = registerColor('symbolIcon.interfaceForeground', {
    dark: '#75BEFF',
    light: '#007ACC',
    hcDark: '#75BEFF',
    hcLight: '#007ACC',
}, localize('symbolIcon.interfaceForeground', 'The foreground color for interface symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_KEY_FOREGROUND = registerColor('symbolIcon.keyForeground', foreground, localize('symbolIcon.keyForeground', 'The foreground color for key symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_KEYWORD_FOREGROUND = registerColor('symbolIcon.keywordForeground', foreground, localize('symbolIcon.keywordForeground', 'The foreground color for keyword symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_METHOD_FOREGROUND = registerColor('symbolIcon.methodForeground', {
    dark: '#B180D7',
    light: '#652D90',
    hcDark: '#B180D7',
    hcLight: '#652D90',
}, localize('symbolIcon.methodForeground', 'The foreground color for method symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_MODULE_FOREGROUND = registerColor('symbolIcon.moduleForeground', foreground, localize('symbolIcon.moduleForeground', 'The foreground color for module symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_NAMESPACE_FOREGROUND = registerColor('symbolIcon.namespaceForeground', foreground, localize('symbolIcon.namespaceForeground', 'The foreground color for namespace symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_NULL_FOREGROUND = registerColor('symbolIcon.nullForeground', foreground, localize('symbolIcon.nullForeground', 'The foreground color for null symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_NUMBER_FOREGROUND = registerColor('symbolIcon.numberForeground', foreground, localize('symbolIcon.numberForeground', 'The foreground color for number symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_OBJECT_FOREGROUND = registerColor('symbolIcon.objectForeground', foreground, localize('symbolIcon.objectForeground', 'The foreground color for object symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_OPERATOR_FOREGROUND = registerColor('symbolIcon.operatorForeground', foreground, localize('symbolIcon.operatorForeground', 'The foreground color for operator symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_PACKAGE_FOREGROUND = registerColor('symbolIcon.packageForeground', foreground, localize('symbolIcon.packageForeground', 'The foreground color for package symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_PROPERTY_FOREGROUND = registerColor('symbolIcon.propertyForeground', foreground, localize('symbolIcon.propertyForeground', 'The foreground color for property symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_REFERENCE_FOREGROUND = registerColor('symbolIcon.referenceForeground', foreground, localize('symbolIcon.referenceForeground', 'The foreground color for reference symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_SNIPPET_FOREGROUND = registerColor('symbolIcon.snippetForeground', foreground, localize('symbolIcon.snippetForeground', 'The foreground color for snippet symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_STRING_FOREGROUND = registerColor('symbolIcon.stringForeground', foreground, localize('symbolIcon.stringForeground', 'The foreground color for string symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_STRUCT_FOREGROUND = registerColor('symbolIcon.structForeground', foreground, localize('symbolIcon.structForeground', 'The foreground color for struct symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_TEXT_FOREGROUND = registerColor('symbolIcon.textForeground', foreground, localize('symbolIcon.textForeground', 'The foreground color for text symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_TYPEPARAMETER_FOREGROUND = registerColor('symbolIcon.typeParameterForeground', foreground, localize('symbolIcon.typeParameterForeground', 'The foreground color for type parameter symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_UNIT_FOREGROUND = registerColor('symbolIcon.unitForeground', foreground, localize('symbolIcon.unitForeground', 'The foreground color for unit symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_VARIABLE_FOREGROUND = registerColor('symbolIcon.variableForeground', {
    dark: '#75BEFF',
    light: '#007ACC',
    hcDark: '#75BEFF',
    hcLight: '#007ACC',
}, localize('symbolIcon.variableForeground', 'The foreground color for variable symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltYm9sSWNvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zeW1ib2xJY29ucy9icm93c2VyL3N5bWJvbEljb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sbUJBQW1CLENBQUE7QUFDMUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFOUYsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsYUFBYSxDQUN4RCw0QkFBNEIsRUFDNUIsVUFBVSxFQUNWLFFBQVEsQ0FDUCw0QkFBNEIsRUFDNUIsOEdBQThHLENBQzlHLENBQ0QsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLGFBQWEsQ0FDMUQsOEJBQThCLEVBQzlCLFVBQVUsRUFDVixRQUFRLENBQ1AsOEJBQThCLEVBQzlCLGdIQUFnSCxDQUNoSCxDQUNELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxhQUFhLENBQ3hELDRCQUE0QixFQUM1QjtJQUNDLElBQUksRUFBRSxTQUFTO0lBQ2YsS0FBSyxFQUFFLFNBQVM7SUFDaEIsTUFBTSxFQUFFLFNBQVM7SUFDakIsT0FBTyxFQUFFLFNBQVM7Q0FDbEIsRUFDRCxRQUFRLENBQ1AsNEJBQTRCLEVBQzVCLDhHQUE4RyxDQUM5RyxDQUNELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxhQUFhLENBQ3hELDRCQUE0QixFQUM1QixVQUFVLEVBQ1YsUUFBUSxDQUNQLDRCQUE0QixFQUM1Qiw4R0FBOEcsQ0FDOUcsQ0FDRCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsYUFBYSxDQUMzRCwrQkFB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
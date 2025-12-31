/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const SEMANTIC_HIGHLIGHTING_SETTING_ID = 'editor.semanticHighlighting';
export function isSemanticColoringEnabled(model, themeService, configurationService) {
    const setting = configurationService.getValue(SEMANTIC_HIGHLIGHTING_SETTING_ID, { overrideIdentifier: model.getLanguageId(), resource: model.uri })?.enabled;
    if (typeof setting === 'boolean') {
        return setting;
    }
    return themeService.getColorTheme().semanticHighlighting;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNDb25maWcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zZW1hbnRpY1Rva2Vucy9jb21tb24vc2VtYW50aWNUb2tlbnNDb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsNkJBQTZCLENBQUE7QUFNN0UsTUFBTSxVQUFVLHlCQUF5QixDQUN4QyxLQUFpQixFQUNqQixZQUEyQixFQUMzQixvQkFBMkM7SUFFM0MsTUFBTSxPQUFPLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUM1QyxnQ0FBZ0MsRUFDaEMsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FDbEUsRUFBRSxPQUFPLENBQUE7SUFDVixJQUFJLE9BQU8sT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUNELE9BQU8sWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDLG9CQUFvQixDQUFBO0FBQ3pELENBQUMifQ==
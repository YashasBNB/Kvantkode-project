/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
export class ToggleRenderControlCharacterAction extends Action2 {
    static { this.ID = 'editor.action.toggleRenderControlCharacter'; }
    constructor() {
        super({
            id: ToggleRenderControlCharacterAction.ID,
            title: {
                ...localize2('toggleRenderControlCharacters', 'Toggle Control Characters'),
                mnemonicTitle: localize({ key: 'miToggleRenderControlCharacters', comment: ['&& denotes a mnemonic'] }, 'Render &&Control Characters'),
            },
            category: Categories.View,
            f1: true,
            toggled: ContextKeyExpr.equals('config.editor.renderControlCharacters', true),
            menu: {
                id: MenuId.MenubarAppearanceMenu,
                group: '4_editor',
                order: 5,
            },
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const newRenderControlCharacters = !configurationService.getValue('editor.renderControlCharacters');
        return configurationService.updateValue('editor.renderControlCharacters', newRenderControlCharacters);
    }
}
registerAction2(ToggleRenderControlCharacterAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlUmVuZGVyQ29udHJvbENoYXJhY3Rlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci90b2dnbGVSZW5kZXJDb250cm9sQ2hhcmFjdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUd6RixNQUFNLE9BQU8sa0NBQW1DLFNBQVEsT0FBTzthQUM5QyxPQUFFLEdBQUcsNENBQTRDLENBQUE7SUFFakU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsa0NBQWtDLENBQUMsRUFBRTtZQUN6QyxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsK0JBQStCLEVBQUUsMkJBQTJCLENBQUM7Z0JBQzFFLGFBQWEsRUFBRSxRQUFRLENBQ3RCLEVBQUUsR0FBRyxFQUFFLGlDQUFpQyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDOUUsNkJBQTZCLENBQzdCO2FBQ0Q7WUFDRCxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7WUFDekIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyx1Q0FBdUMsRUFBRSxJQUFJLENBQUM7WUFDN0UsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMscUJBQXFCO2dCQUNoQyxLQUFLLEVBQUUsVUFBVTtnQkFDakIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxHQUFHLENBQUMsUUFBMEI7UUFDdEMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFFaEUsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDaEUsZ0NBQWdDLENBQ2hDLENBQUE7UUFDRCxPQUFPLG9CQUFvQixDQUFDLFdBQVcsQ0FDdEMsZ0NBQWdDLEVBQ2hDLDBCQUEwQixDQUMxQixDQUFBO0lBQ0YsQ0FBQzs7QUFHRixlQUFlLENBQUMsa0NBQWtDLENBQUMsQ0FBQSJ9
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
class ToggleRenderWhitespaceAction extends Action2 {
    static { this.ID = 'editor.action.toggleRenderWhitespace'; }
    constructor() {
        super({
            id: ToggleRenderWhitespaceAction.ID,
            title: {
                ...localize2('toggleRenderWhitespace', 'Toggle Render Whitespace'),
                mnemonicTitle: localize({ key: 'miToggleRenderWhitespace', comment: ['&& denotes a mnemonic'] }, '&&Render Whitespace'),
            },
            category: Categories.View,
            f1: true,
            toggled: ContextKeyExpr.notEquals('config.editor.renderWhitespace', 'none'),
            menu: {
                id: MenuId.MenubarAppearanceMenu,
                group: '4_editor',
                order: 4,
            },
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const renderWhitespace = configurationService.getValue('editor.renderWhitespace');
        let newRenderWhitespace;
        if (renderWhitespace === 'none') {
            newRenderWhitespace = 'all';
        }
        else {
            newRenderWhitespace = 'none';
        }
        return configurationService.updateValue('editor.renderWhitespace', newRenderWhitespace);
    }
}
registerAction2(ToggleRenderWhitespaceAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlUmVuZGVyV2hpdGVzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL3RvZ2dsZVJlbmRlcldoaXRlc3BhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBR3pGLE1BQU0sNEJBQTZCLFNBQVEsT0FBTzthQUNqQyxPQUFFLEdBQUcsc0NBQXNDLENBQUE7SUFFM0Q7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNEJBQTRCLENBQUMsRUFBRTtZQUNuQyxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsMEJBQTBCLENBQUM7Z0JBQ2xFLGFBQWEsRUFBRSxRQUFRLENBQ3RCLEVBQUUsR0FBRyxFQUFFLDBCQUEwQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDdkUscUJBQXFCLENBQ3JCO2FBQ0Q7WUFDRCxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7WUFDekIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsRUFBRSxNQUFNLENBQUM7WUFDM0UsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMscUJBQXFCO2dCQUNoQyxLQUFLLEVBQUUsVUFBVTtnQkFDakIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxHQUFHLENBQUMsUUFBMEI7UUFDdEMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFFaEUsTUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQVMseUJBQXlCLENBQUMsQ0FBQTtRQUV6RixJQUFJLG1CQUEyQixDQUFBO1FBQy9CLElBQUksZ0JBQWdCLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDakMsbUJBQW1CLEdBQUcsS0FBSyxDQUFBO1FBQzVCLENBQUM7YUFBTSxDQUFDO1lBQ1AsbUJBQW1CLEdBQUcsTUFBTSxDQUFBO1FBQzdCLENBQUM7UUFFRCxPQUFPLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO0lBQ3hGLENBQUM7O0FBR0YsZUFBZSxDQUFDLDRCQUE0QixDQUFDLENBQUEifQ==
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlUmVuZGVyV2hpdGVzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci90b2dnbGVSZW5kZXJXaGl0ZXNwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUd6RixNQUFNLDRCQUE2QixTQUFRLE9BQU87YUFDakMsT0FBRSxHQUFHLHNDQUFzQyxDQUFBO0lBRTNEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDRCQUE0QixDQUFDLEVBQUU7WUFDbkMsS0FBSyxFQUFFO2dCQUNOLEdBQUcsU0FBUyxDQUFDLHdCQUF3QixFQUFFLDBCQUEwQixDQUFDO2dCQUNsRSxhQUFhLEVBQUUsUUFBUSxDQUN0QixFQUFFLEdBQUcsRUFBRSwwQkFBMEIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ3ZFLHFCQUFxQixDQUNyQjthQUNEO1lBQ0QsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLGNBQWMsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLEVBQUUsTUFBTSxDQUFDO1lBQzNFLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLHFCQUFxQjtnQkFDaEMsS0FBSyxFQUFFLFVBQVU7Z0JBQ2pCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsR0FBRyxDQUFDLFFBQTBCO1FBQ3RDLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBRWhFLE1BQU0sZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFTLHlCQUF5QixDQUFDLENBQUE7UUFFekYsSUFBSSxtQkFBMkIsQ0FBQTtRQUMvQixJQUFJLGdCQUFnQixLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLG1CQUFtQixHQUFHLEtBQUssQ0FBQTtRQUM1QixDQUFDO2FBQU0sQ0FBQztZQUNQLG1CQUFtQixHQUFHLE1BQU0sQ0FBQTtRQUM3QixDQUFDO1FBRUQsT0FBTyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtJQUN4RixDQUFDOztBQUdGLGVBQWUsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBIn0=
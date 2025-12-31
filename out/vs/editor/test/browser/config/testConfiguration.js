/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorConfiguration, } from '../../../browser/config/editorConfiguration.js';
import { EditorFontLigatures, EditorFontVariations } from '../../../common/config/editorOptions.js';
import { FontInfo } from '../../../common/config/fontInfo.js';
import { TestAccessibilityService } from '../../../../platform/accessibility/test/common/testAccessibilityService.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
export class TestConfiguration extends EditorConfiguration {
    constructor(opts) {
        super(false, MenuId.EditorContext, opts, null, new TestAccessibilityService());
    }
    _readEnvConfiguration() {
        const envConfig = this.getRawOptions().envConfig;
        return {
            extraEditorClassName: envConfig?.extraEditorClassName ?? '',
            outerWidth: envConfig?.outerWidth ?? 100,
            outerHeight: envConfig?.outerHeight ?? 100,
            emptySelectionClipboard: envConfig?.emptySelectionClipboard ?? true,
            pixelRatio: envConfig?.pixelRatio ?? 1,
            accessibilitySupport: envConfig?.accessibilitySupport ?? 0 /* AccessibilitySupport.Unknown */,
        };
    }
    _readFontInfo(styling) {
        return new FontInfo({
            pixelRatio: 1,
            fontFamily: 'mockFont',
            fontWeight: 'normal',
            fontSize: 14,
            fontFeatureSettings: EditorFontLigatures.OFF,
            fontVariationSettings: EditorFontVariations.OFF,
            lineHeight: 19,
            letterSpacing: 1.5,
            isMonospace: true,
            typicalHalfwidthCharacterWidth: 10,
            typicalFullwidthCharacterWidth: 20,
            canUseHalfwidthRightwardsArrow: true,
            spaceWidth: 10,
            middotWidth: 10,
            wsmiddotWidth: 10,
            maxDigitWidth: 10,
        }, true);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2NvbmZpZy90ZXN0Q29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkcsT0FBTyxFQUFnQixRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUczRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFdkUsTUFBTSxPQUFPLGlCQUFrQixTQUFRLG1CQUFtQjtJQUN6RCxZQUFZLElBQTZDO1FBQ3hELEtBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFa0IscUJBQXFCO1FBQ3ZDLE1BQU0sU0FBUyxHQUFJLElBQUksQ0FBQyxhQUFhLEVBQW9DLENBQUMsU0FBUyxDQUFBO1FBQ25GLE9BQU87WUFDTixvQkFBb0IsRUFBRSxTQUFTLEVBQUUsb0JBQW9CLElBQUksRUFBRTtZQUMzRCxVQUFVLEVBQUUsU0FBUyxFQUFFLFVBQVUsSUFBSSxHQUFHO1lBQ3hDLFdBQVcsRUFBRSxTQUFTLEVBQUUsV0FBVyxJQUFJLEdBQUc7WUFDMUMsdUJBQXVCLEVBQUUsU0FBUyxFQUFFLHVCQUF1QixJQUFJLElBQUk7WUFDbkUsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLElBQUksQ0FBQztZQUN0QyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsb0JBQW9CLHdDQUFnQztTQUNyRixDQUFBO0lBQ0YsQ0FBQztJQUVrQixhQUFhLENBQUMsT0FBcUI7UUFDckQsT0FBTyxJQUFJLFFBQVEsQ0FDbEI7WUFDQyxVQUFVLEVBQUUsQ0FBQztZQUNiLFVBQVUsRUFBRSxVQUFVO1lBQ3RCLFVBQVUsRUFBRSxRQUFRO1lBQ3BCLFFBQVEsRUFBRSxFQUFFO1lBQ1osbUJBQW1CLEVBQUUsbUJBQW1CLENBQUMsR0FBRztZQUM1QyxxQkFBcUIsRUFBRSxvQkFBb0IsQ0FBQyxHQUFHO1lBQy9DLFVBQVUsRUFBRSxFQUFFO1lBQ2QsYUFBYSxFQUFFLEdBQUc7WUFDbEIsV0FBVyxFQUFFLElBQUk7WUFDakIsOEJBQThCLEVBQUUsRUFBRTtZQUNsQyw4QkFBOEIsRUFBRSxFQUFFO1lBQ2xDLDhCQUE4QixFQUFFLElBQUk7WUFDcEMsVUFBVSxFQUFFLEVBQUU7WUFDZCxXQUFXLEVBQUUsRUFBRTtZQUNmLGFBQWEsRUFBRSxFQUFFO1lBQ2pCLGFBQWEsRUFBRSxFQUFFO1NBQ2pCLEVBQ0QsSUFBSSxDQUNKLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==
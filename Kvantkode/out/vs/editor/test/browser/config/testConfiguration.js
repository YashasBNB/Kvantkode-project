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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY29uZmlnL3Rlc3RDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRyxPQUFPLEVBQWdCLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRzNFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQ3JILE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RSxNQUFNLE9BQU8saUJBQWtCLFNBQVEsbUJBQW1CO0lBQ3pELFlBQVksSUFBNkM7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSx3QkFBd0IsRUFBRSxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVrQixxQkFBcUI7UUFDdkMsTUFBTSxTQUFTLEdBQUksSUFBSSxDQUFDLGFBQWEsRUFBb0MsQ0FBQyxTQUFTLENBQUE7UUFDbkYsT0FBTztZQUNOLG9CQUFvQixFQUFFLFNBQVMsRUFBRSxvQkFBb0IsSUFBSSxFQUFFO1lBQzNELFVBQVUsRUFBRSxTQUFTLEVBQUUsVUFBVSxJQUFJLEdBQUc7WUFDeEMsV0FBVyxFQUFFLFNBQVMsRUFBRSxXQUFXLElBQUksR0FBRztZQUMxQyx1QkFBdUIsRUFBRSxTQUFTLEVBQUUsdUJBQXVCLElBQUksSUFBSTtZQUNuRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFVBQVUsSUFBSSxDQUFDO1lBQ3RDLG9CQUFvQixFQUFFLFNBQVMsRUFBRSxvQkFBb0Isd0NBQWdDO1NBQ3JGLENBQUE7SUFDRixDQUFDO0lBRWtCLGFBQWEsQ0FBQyxPQUFxQjtRQUNyRCxPQUFPLElBQUksUUFBUSxDQUNsQjtZQUNDLFVBQVUsRUFBRSxDQUFDO1lBQ2IsVUFBVSxFQUFFLFVBQVU7WUFDdEIsVUFBVSxFQUFFLFFBQVE7WUFDcEIsUUFBUSxFQUFFLEVBQUU7WUFDWixtQkFBbUIsRUFBRSxtQkFBbUIsQ0FBQyxHQUFHO1lBQzVDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDLEdBQUc7WUFDL0MsVUFBVSxFQUFFLEVBQUU7WUFDZCxhQUFhLEVBQUUsR0FBRztZQUNsQixXQUFXLEVBQUUsSUFBSTtZQUNqQiw4QkFBOEIsRUFBRSxFQUFFO1lBQ2xDLDhCQUE4QixFQUFFLEVBQUU7WUFDbEMsOEJBQThCLEVBQUUsSUFBSTtZQUNwQyxVQUFVLEVBQUUsRUFBRTtZQUNkLFdBQVcsRUFBRSxFQUFFO1lBQ2YsYUFBYSxFQUFFLEVBQUU7WUFDakIsYUFBYSxFQUFFLEVBQUU7U0FDakIsRUFDRCxJQUFJLENBQ0osQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9
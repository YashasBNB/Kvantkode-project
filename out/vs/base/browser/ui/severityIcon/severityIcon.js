/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/severityIcon.css';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import Severity from '../../../common/severity.js';
export var SeverityIcon;
(function (SeverityIcon) {
    function className(severity) {
        switch (severity) {
            case Severity.Ignore:
                return 'severity-ignore ' + ThemeIcon.asClassName(Codicon.info);
            case Severity.Info:
                return ThemeIcon.asClassName(Codicon.info);
            case Severity.Warning:
                return ThemeIcon.asClassName(Codicon.warning);
            case Severity.Error:
                return ThemeIcon.asClassName(Codicon.error);
            default:
                return '';
        }
    }
    SeverityIcon.className = className;
})(SeverityIcon || (SeverityIcon = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V2ZXJpdHlJY29uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvc2V2ZXJpdHlJY29uL3NldmVyaXR5SWNvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDeEQsT0FBTyxRQUFRLE1BQU0sNkJBQTZCLENBQUE7QUFFbEQsTUFBTSxLQUFXLFlBQVksQ0FlNUI7QUFmRCxXQUFpQixZQUFZO0lBQzVCLFNBQWdCLFNBQVMsQ0FBQyxRQUFrQjtRQUMzQyxRQUFRLFFBQVEsRUFBRSxDQUFDO1lBQ2xCLEtBQUssUUFBUSxDQUFDLE1BQU07Z0JBQ25CLE9BQU8sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDaEUsS0FBSyxRQUFRLENBQUMsSUFBSTtnQkFDakIsT0FBTyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMzQyxLQUFLLFFBQVEsQ0FBQyxPQUFPO2dCQUNwQixPQUFPLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQzlDLEtBQUssUUFBUSxDQUFDLEtBQUs7Z0JBQ2xCLE9BQU8sU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDNUM7Z0JBQ0MsT0FBTyxFQUFFLENBQUE7UUFDWCxDQUFDO0lBQ0YsQ0FBQztJQWJlLHNCQUFTLFlBYXhCLENBQUE7QUFDRixDQUFDLEVBZmdCLFlBQVksS0FBWixZQUFZLFFBZTVCIn0=
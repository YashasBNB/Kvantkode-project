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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V2ZXJpdHlJY29uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3NldmVyaXR5SWNvbi9zZXZlcml0eUljb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTywwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3hELE9BQU8sUUFBUSxNQUFNLDZCQUE2QixDQUFBO0FBRWxELE1BQU0sS0FBVyxZQUFZLENBZTVCO0FBZkQsV0FBaUIsWUFBWTtJQUM1QixTQUFnQixTQUFTLENBQUMsUUFBa0I7UUFDM0MsUUFBUSxRQUFRLEVBQUUsQ0FBQztZQUNsQixLQUFLLFFBQVEsQ0FBQyxNQUFNO2dCQUNuQixPQUFPLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2hFLEtBQUssUUFBUSxDQUFDLElBQUk7Z0JBQ2pCLE9BQU8sU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDM0MsS0FBSyxRQUFRLENBQUMsT0FBTztnQkFDcEIsT0FBTyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM5QyxLQUFLLFFBQVEsQ0FBQyxLQUFLO2dCQUNsQixPQUFPLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzVDO2dCQUNDLE9BQU8sRUFBRSxDQUFBO1FBQ1gsQ0FBQztJQUNGLENBQUM7SUFiZSxzQkFBUyxZQWF4QixDQUFBO0FBQ0YsQ0FBQyxFQWZnQixZQUFZLEtBQVosWUFBWSxRQWU1QiJ9
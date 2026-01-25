/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as platform from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let TestTextResourcePropertiesService = class TestTextResourcePropertiesService {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    getEOL(resource, language) {
        const eol = this.configurationService.getValue('files.eol', {
            overrideIdentifier: language,
            resource,
        });
        if (eol && typeof eol === 'string' && eol !== 'auto') {
            return eol;
        }
        return platform.isLinux || platform.isMacintosh ? '\n' : '\r\n';
    }
};
TestTextResourcePropertiesService = __decorate([
    __param(0, IConfigurationService)
], TestTextResourcePropertiesService);
export { TestTextResourcePropertiesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFRleHRSZXNvdXJjZVByb3BlcnRpZXNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvdGVzdFRleHRSZXNvdXJjZVByb3BlcnRpZXNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFHL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFM0YsSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FBaUM7SUFHN0MsWUFDeUMsb0JBQTJDO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFDakYsQ0FBQztJQUVKLE1BQU0sQ0FBQyxRQUFhLEVBQUUsUUFBaUI7UUFDdEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUU7WUFDM0Qsa0JBQWtCLEVBQUUsUUFBUTtZQUM1QixRQUFRO1NBQ1IsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLEdBQUcsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUN0RCxPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQyxPQUFPLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7SUFDaEUsQ0FBQztDQUNELENBQUE7QUFqQlksaUNBQWlDO0lBSTNDLFdBQUEscUJBQXFCLENBQUE7R0FKWCxpQ0FBaUMsQ0FpQjdDIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { addMatchMediaChangeListener } from '../../../../base/browser/browser.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IHostColorSchemeService } from '../common/hostColorSchemeService.js';
import { mainWindow } from '../../../../base/browser/window.js';
export class BrowserHostColorSchemeService extends Disposable {
    constructor() {
        super();
        this._onDidSchemeChangeEvent = this._register(new Emitter());
        this.registerListeners();
    }
    registerListeners() {
        addMatchMediaChangeListener(mainWindow, '(prefers-color-scheme: dark)', () => {
            this._onDidSchemeChangeEvent.fire();
        });
        addMatchMediaChangeListener(mainWindow, '(forced-colors: active)', () => {
            this._onDidSchemeChangeEvent.fire();
        });
    }
    get onDidChangeColorScheme() {
        return this._onDidSchemeChangeEvent.event;
    }
    get dark() {
        if (mainWindow.matchMedia(`(prefers-color-scheme: light)`).matches) {
            return false;
        }
        else if (mainWindow.matchMedia(`(prefers-color-scheme: dark)`).matches) {
            return true;
        }
        return false;
    }
    get highContrast() {
        if (mainWindow.matchMedia(`(forced-colors: active)`).matches) {
            return true;
        }
        return false;
    }
}
registerSingleton(IHostColorSchemeService, BrowserHostColorSchemeService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlckhvc3RDb2xvclNjaGVtZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvYnJvd3Nlci9icm93c2VySG9zdENvbG9yU2NoZW1lU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFL0QsTUFBTSxPQUFPLDZCQUE4QixTQUFRLFVBQVU7SUFLNUQ7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQUhTLDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBSzdFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsMkJBQTJCLENBQUMsVUFBVSxFQUFFLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtZQUM1RSxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQUE7UUFDRiwyQkFBMkIsQ0FBQyxVQUFVLEVBQUUseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1lBQ3ZFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNwQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxJQUFJLHNCQUFzQjtRQUN6QixPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUE7SUFDMUMsQ0FBQztJQUVELElBQUksSUFBSTtRQUNQLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3BFLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQzthQUFNLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzFFLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzlELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztDQUNEO0FBRUQsaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsNkJBQTZCLG9DQUE0QixDQUFBIn0=
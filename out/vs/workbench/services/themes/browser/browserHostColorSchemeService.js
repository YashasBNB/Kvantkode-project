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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlckhvc3RDb2xvclNjaGVtZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2Jyb3dzZXIvYnJvd3Nlckhvc3RDb2xvclNjaGVtZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRS9ELE1BQU0sT0FBTyw2QkFBOEIsU0FBUSxVQUFVO0lBSzVEO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFIUyw0QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUs3RSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLDJCQUEyQixDQUFDLFVBQVUsRUFBRSw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7WUFDNUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUFBO1FBQ0YsMkJBQTJCLENBQUMsVUFBVSxFQUFFLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtZQUN2RSxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsSUFBSSxzQkFBc0I7UUFDekIsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFBO0lBQzFDLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDUCxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsK0JBQStCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwRSxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7YUFBTSxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsOEJBQThCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMxRSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM5RCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FDRDtBQUVELGlCQUFpQixDQUFDLHVCQUF1QixFQUFFLDZCQUE2QixvQ0FBNEIsQ0FBQSJ9
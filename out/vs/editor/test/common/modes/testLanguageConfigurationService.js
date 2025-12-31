/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { LanguageConfigurationRegistry, LanguageConfigurationServiceChangeEvent, ResolvedLanguageConfiguration, } from '../../../common/languages/languageConfigurationRegistry.js';
export class TestLanguageConfigurationService extends Disposable {
    constructor() {
        super();
        this._registry = this._register(new LanguageConfigurationRegistry());
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(this._registry.onDidChange((e) => this._onDidChange.fire(new LanguageConfigurationServiceChangeEvent(e.languageId))));
    }
    register(languageId, configuration, priority) {
        return this._registry.register(languageId, configuration, priority);
    }
    getLanguageConfiguration(languageId) {
        return (this._registry.getLanguageConfiguration(languageId) ??
            new ResolvedLanguageConfiguration('unknown', {}));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdExhbmd1YWdlQ29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXMvdGVzdExhbmd1YWdlQ29uZmlndXJhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU5RSxPQUFPLEVBRU4sNkJBQTZCLEVBQzdCLHVDQUF1QyxFQUN2Qyw2QkFBNkIsR0FDN0IsTUFBTSw0REFBNEQsQ0FBQTtBQUVuRSxNQUFNLE9BQU8sZ0NBQ1osU0FBUSxVQUFVO0lBWWxCO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFSUyxjQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLDZCQUE2QixFQUFFLENBQUMsQ0FBQTtRQUUvRCxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzdDLElBQUksT0FBTyxFQUEyQyxDQUN0RCxDQUFBO1FBQ2UsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQUlwRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSx1Q0FBdUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FDakYsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVELFFBQVEsQ0FDUCxVQUFrQixFQUNsQixhQUFvQyxFQUNwQyxRQUFpQjtRQUVqQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVELHdCQUF3QixDQUFDLFVBQWtCO1FBQzFDLE9BQU8sQ0FDTixJQUFJLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQztZQUNuRCxJQUFJLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FDaEQsQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9
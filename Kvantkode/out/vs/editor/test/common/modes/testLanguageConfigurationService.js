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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdExhbmd1YWdlQ29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy90ZXN0TGFuZ3VhZ2VDb25maWd1cmF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBRTlFLE9BQU8sRUFFTiw2QkFBNkIsRUFDN0IsdUNBQXVDLEVBQ3ZDLDZCQUE2QixHQUM3QixNQUFNLDREQUE0RCxDQUFBO0FBRW5FLE1BQU0sT0FBTyxnQ0FDWixTQUFRLFVBQVU7SUFZbEI7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQVJTLGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksNkJBQTZCLEVBQUUsQ0FBQyxDQUFBO1FBRS9ELGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDN0MsSUFBSSxPQUFPLEVBQTJDLENBQ3RELENBQUE7UUFDZSxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBSXBELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNoQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLHVDQUF1QyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUNqRixDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsUUFBUSxDQUNQLFVBQWtCLEVBQ2xCLGFBQW9DLEVBQ3BDLFFBQWlCO1FBRWpCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRUQsd0JBQXdCLENBQUMsVUFBa0I7UUFDMUMsT0FBTyxDQUNOLElBQUksQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDO1lBQ25ELElBQUksNkJBQTZCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUNoRCxDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=
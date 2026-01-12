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
import { MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { URI } from '../../../base/common/uri.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILanguagePackService } from '../../../platform/languagePacks/common/languagePacks.js';
let MainThreadLocalization = class MainThreadLocalization extends Disposable {
    constructor(extHostContext, fileService, languagePackService) {
        super();
        this.fileService = fileService;
        this.languagePackService = languagePackService;
    }
    async $fetchBuiltInBundleUri(id, language) {
        try {
            const uri = await this.languagePackService.getBuiltInExtensionTranslationsUri(id, language);
            return uri;
        }
        catch (e) {
            return undefined;
        }
    }
    async $fetchBundleContents(uriComponents) {
        const contents = await this.fileService.readFile(URI.revive(uriComponents));
        return contents.value.toString();
    }
};
MainThreadLocalization = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLocalization),
    __param(1, IFileService),
    __param(2, ILanguagePackService)
], MainThreadLocalization);
export { MainThreadLocalization };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExvY2FsaXphdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRMb2NhbGl6YXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBK0IsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RixPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBR3ZGLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTtJQUNyRCxZQUNDLGNBQStCLEVBQ0EsV0FBeUIsRUFDakIsbUJBQXlDO1FBRWhGLEtBQUssRUFBRSxDQUFBO1FBSHdCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ2pCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7SUFHakYsQ0FBQztJQUVELEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFVLEVBQUUsUUFBZ0I7UUFDeEQsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsa0NBQWtDLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQzNGLE9BQU8sR0FBRyxDQUFBO1FBQ1gsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxhQUE0QjtRQUN0RCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDakMsQ0FBQztDQUNELENBQUE7QUF0Qlksc0JBQXNCO0lBRGxDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQztJQUl0RCxXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsb0JBQW9CLENBQUE7R0FKVixzQkFBc0IsQ0FzQmxDIn0=
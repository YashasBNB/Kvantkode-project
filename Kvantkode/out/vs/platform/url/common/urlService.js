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
import { first } from '../../../base/common/async.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IProductService } from '../../product/common/productService.js';
export class AbstractURLService extends Disposable {
    constructor() {
        super(...arguments);
        this.handlers = new Set();
    }
    open(uri, options) {
        const handlers = [...this.handlers.values()];
        return first(handlers.map((h) => () => h.handleURL(uri, options)), undefined, false).then((val) => val || false);
    }
    registerHandler(handler) {
        this.handlers.add(handler);
        return toDisposable(() => this.handlers.delete(handler));
    }
}
let NativeURLService = class NativeURLService extends AbstractURLService {
    constructor(productService) {
        super();
        this.productService = productService;
    }
    create(options) {
        let { authority, path, query, fragment } = options
            ? options
            : { authority: undefined, path: undefined, query: undefined, fragment: undefined };
        if (authority && path && path.indexOf('/') !== 0) {
            path = `/${path}`; // URI validation requires a path if there is an authority
        }
        return URI.from({ scheme: this.productService.urlProtocol, authority, path, query, fragment });
    }
};
NativeURLService = __decorate([
    __param(0, IProductService)
], NativeURLService);
export { NativeURLService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXJsL2NvbW1vbi91cmxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBR3hFLE1BQU0sT0FBZ0Isa0JBQW1CLFNBQVEsVUFBVTtJQUEzRDs7UUFHUyxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQTtJQWlCMUMsQ0FBQztJQWJBLElBQUksQ0FBQyxHQUFRLEVBQUUsT0FBeUI7UUFDdkMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUM1QyxPQUFPLEtBQUssQ0FDWCxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUNwRCxTQUFTLEVBQ1QsS0FBSyxDQUNMLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVELGVBQWUsQ0FBQyxPQUFvQjtRQUNuQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMxQixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ3pELENBQUM7Q0FDRDtBQUVNLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsa0JBQWtCO0lBQ3ZELFlBQWdELGNBQStCO1FBQzlFLEtBQUssRUFBRSxDQUFBO1FBRHdDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtJQUUvRSxDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQWdDO1FBQ3RDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPO1lBQ2pELENBQUMsQ0FBQyxPQUFPO1lBQ1QsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFBO1FBRW5GLElBQUksU0FBUyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xELElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFBLENBQUMsMERBQTBEO1FBQzdFLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUMvRixDQUFDO0NBQ0QsQ0FBQTtBQWhCWSxnQkFBZ0I7SUFDZixXQUFBLGVBQWUsQ0FBQTtHQURoQixnQkFBZ0IsQ0FnQjVCIn0=
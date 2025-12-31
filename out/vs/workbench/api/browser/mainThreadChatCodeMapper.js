var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MainThreadChatCodemapper_1;
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { TextEdit } from '../../../editor/common/languages.js';
import { ICodeMapperService, } from '../../contrib/chat/common/chatCodeMapperService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
let MainThreadChatCodemapper = class MainThreadChatCodemapper extends Disposable {
    static { MainThreadChatCodemapper_1 = this; }
    static { this._requestHandlePool = 0; }
    constructor(extHostContext, codeMapperService) {
        super();
        this.codeMapperService = codeMapperService;
        this.providers = this._register(new DisposableMap());
        this._responseMap = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostCodeMapper);
    }
    $registerCodeMapperProvider(handle, displayName) {
        const impl = {
            displayName,
            mapCode: async (uiRequest, response, token) => {
                const requestId = String(MainThreadChatCodemapper_1._requestHandlePool++);
                this._responseMap.set(requestId, response);
                const extHostRequest = {
                    requestId,
                    codeBlocks: uiRequest.codeBlocks,
                    chatRequestId: uiRequest.chatRequestId,
                    location: uiRequest.location,
                };
                try {
                    return await this._proxy
                        .$mapCode(handle, extHostRequest, token)
                        .then((result) => result ?? undefined);
                }
                finally {
                    this._responseMap.delete(requestId);
                }
            },
        };
        const disposable = this.codeMapperService.registerCodeMapperProvider(handle, impl);
        this.providers.set(handle, disposable);
    }
    $unregisterCodeMapperProvider(handle) {
        this.providers.deleteAndDispose(handle);
    }
    $handleProgress(requestId, data) {
        const response = this._responseMap.get(requestId);
        if (response) {
            const edits = data.edits;
            const resource = URI.revive(data.uri);
            if (!edits.length) {
                response.textEdit(resource, []);
            }
            else if (edits.every(TextEdit.isTextEdit)) {
                response.textEdit(resource, edits);
            }
            else {
                response.notebookEdit(resource, edits.map(NotebookDto.fromCellEditOperationDto));
            }
        }
        return Promise.resolve();
    }
};
MainThreadChatCodemapper = MainThreadChatCodemapper_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadCodeMapper),
    __param(1, ICodeMapperService)
], MainThreadChatCodemapper);
export { MainThreadChatCodemapper };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRDb2RlTWFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRDaGF0Q29kZU1hcHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBS0EsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFJTixrQkFBa0IsR0FDbEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUVOLGNBQWMsRUFHZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFHakQsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVOzthQUd4Qyx1QkFBa0IsR0FBVyxDQUFDLEFBQVosQ0FBWTtJQUc3QyxZQUNDLGNBQStCLEVBQ1gsaUJBQXNEO1FBRTFFLEtBQUssRUFBRSxDQUFBO1FBRjhCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFQbkUsY0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQXVCLENBQUMsQ0FBQTtRQUdwRSxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUErQixDQUFBO1FBTzVELElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRUQsMkJBQTJCLENBQUMsTUFBYyxFQUFFLFdBQW1CO1FBQzlELE1BQU0sSUFBSSxHQUF3QjtZQUNqQyxXQUFXO1lBQ1gsT0FBTyxFQUFFLEtBQUssRUFDYixTQUE2QixFQUM3QixRQUE2QixFQUM3QixLQUF3QixFQUN2QixFQUFFO2dCQUNILE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQywwQkFBd0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUE7Z0JBQ3ZFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxjQUFjLEdBQTBCO29CQUM3QyxTQUFTO29CQUNULFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVTtvQkFDaEMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxhQUFhO29CQUN0QyxRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7aUJBQzVCLENBQUE7Z0JBQ0QsSUFBSSxDQUFDO29CQUNKLE9BQU8sTUFBTSxJQUFJLENBQUMsTUFBTTt5QkFDdEIsUUFBUSxDQUFDLE1BQU0sRUFBRSxjQUFjLEVBQUUsS0FBSyxDQUFDO3lCQUN2QyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQTtnQkFDeEMsQ0FBQzt3QkFBUyxDQUFDO29CQUNWLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUE7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsMEJBQTBCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2xGLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsNkJBQTZCLENBQUMsTUFBYztRQUMzQyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFRCxlQUFlLENBQUMsU0FBaUIsRUFBRSxJQUE0QjtRQUM5RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQTtZQUN4QixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNuQixRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUNoQyxDQUFDO2lCQUFNLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbkMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtZQUNqRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3pCLENBQUM7O0FBOURXLHdCQUF3QjtJQURwQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUM7SUFTcEQsV0FBQSxrQkFBa0IsQ0FBQTtHQVJSLHdCQUF3QixDQStEcEMifQ==
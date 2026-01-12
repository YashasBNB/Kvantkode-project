/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { LanguageFeatureRegistry } from '../../../../editor/common/languageFeatureRegistry.js';
import { URI } from '../../../../base/common/uri.js';
import { Position } from '../../../../editor/common/core/position.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { RefCountedDisposable } from '../../../../base/common/lifecycle.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { assertType } from '../../../../base/common/types.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
export var CallHierarchyDirection;
(function (CallHierarchyDirection) {
    CallHierarchyDirection["CallsTo"] = "incomingCalls";
    CallHierarchyDirection["CallsFrom"] = "outgoingCalls";
})(CallHierarchyDirection || (CallHierarchyDirection = {}));
export const CallHierarchyProviderRegistry = new LanguageFeatureRegistry();
export class CallHierarchyModel {
    static async create(model, position, token) {
        const [provider] = CallHierarchyProviderRegistry.ordered(model);
        if (!provider) {
            return undefined;
        }
        const session = await provider.prepareCallHierarchy(model, position, token);
        if (!session) {
            return undefined;
        }
        return new CallHierarchyModel(session.roots.reduce((p, c) => p + c._sessionId, ''), provider, session.roots, new RefCountedDisposable(session));
    }
    constructor(id, provider, roots, ref) {
        this.id = id;
        this.provider = provider;
        this.roots = roots;
        this.ref = ref;
        this.root = roots[0];
    }
    dispose() {
        this.ref.release();
    }
    fork(item) {
        const that = this;
        return new (class extends CallHierarchyModel {
            constructor() {
                super(that.id, that.provider, [item], that.ref.acquire());
            }
        })();
    }
    async resolveIncomingCalls(item, token) {
        try {
            const result = await this.provider.provideIncomingCalls(item, token);
            if (isNonEmptyArray(result)) {
                return result;
            }
        }
        catch (e) {
            onUnexpectedExternalError(e);
        }
        return [];
    }
    async resolveOutgoingCalls(item, token) {
        try {
            const result = await this.provider.provideOutgoingCalls(item, token);
            if (isNonEmptyArray(result)) {
                return result;
            }
        }
        catch (e) {
            onUnexpectedExternalError(e);
        }
        return [];
    }
}
// --- API command support
const _models = new Map();
CommandsRegistry.registerCommand('_executePrepareCallHierarchy', async (accessor, ...args) => {
    const [resource, position] = args;
    assertType(URI.isUri(resource));
    assertType(Position.isIPosition(position));
    const modelService = accessor.get(IModelService);
    let textModel = modelService.getModel(resource);
    let textModelReference;
    if (!textModel) {
        const textModelService = accessor.get(ITextModelService);
        const result = await textModelService.createModelReference(resource);
        textModel = result.object.textEditorModel;
        textModelReference = result;
    }
    try {
        const model = await CallHierarchyModel.create(textModel, position, CancellationToken.None);
        if (!model) {
            return [];
        }
        //
        _models.set(model.id, model);
        _models.forEach((value, key, map) => {
            if (map.size > 10) {
                value.dispose();
                _models.delete(key);
            }
        });
        return [model.root];
    }
    finally {
        textModelReference?.dispose();
    }
});
function isCallHierarchyItemDto(obj) {
    return true;
}
CommandsRegistry.registerCommand('_executeProvideIncomingCalls', async (_accessor, ...args) => {
    const [item] = args;
    assertType(isCallHierarchyItemDto(item));
    // find model
    const model = _models.get(item._sessionId);
    if (!model) {
        return [];
    }
    return model.resolveIncomingCalls(item, CancellationToken.None);
});
CommandsRegistry.registerCommand('_executeProvideOutgoingCalls', async (_accessor, ...args) => {
    const [item] = args;
    assertType(isCallHierarchyItemDto(item));
    // find model
    const model = _models.get(item._sessionId);
    if (!model) {
        return [];
    }
    return model.resolveOutgoingCalls(item, CancellationToken.None);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbEhpZXJhcmNoeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2FsbEhpZXJhcmNoeS9jb21tb24vY2FsbEhpZXJhcmNoeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQWUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRXpGLE1BQU0sQ0FBTixJQUFrQixzQkFHakI7QUFIRCxXQUFrQixzQkFBc0I7SUFDdkMsbURBQXlCLENBQUE7SUFDekIscURBQTJCLENBQUE7QUFDNUIsQ0FBQyxFQUhpQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBR3ZDO0FBK0NELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksdUJBQXVCLEVBQXlCLENBQUE7QUFFakcsTUFBTSxPQUFPLGtCQUFrQjtJQUM5QixNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDbEIsS0FBaUIsRUFDakIsUUFBbUIsRUFDbkIsS0FBd0I7UUFFeEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsT0FBTyxJQUFJLGtCQUFrQixDQUM1QixPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUNwRCxRQUFRLEVBQ1IsT0FBTyxDQUFDLEtBQUssRUFDYixJQUFJLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUNqQyxDQUFBO0lBQ0YsQ0FBQztJQUlELFlBQ1UsRUFBVSxFQUNWLFFBQStCLEVBQy9CLEtBQTBCLEVBQzFCLEdBQXlCO1FBSHpCLE9BQUUsR0FBRixFQUFFLENBQVE7UUFDVixhQUFRLEdBQVIsUUFBUSxDQUF1QjtRQUMvQixVQUFLLEdBQUwsS0FBSyxDQUFxQjtRQUMxQixRQUFHLEdBQUgsR0FBRyxDQUFzQjtRQUVsQyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyQixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbkIsQ0FBQztJQUVELElBQUksQ0FBQyxJQUF1QjtRQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUE7UUFDakIsT0FBTyxJQUFJLENBQUMsS0FBTSxTQUFRLGtCQUFrQjtZQUMzQztnQkFDQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBQzFELENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FBQTtJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsb0JBQW9CLENBQ3pCLElBQXVCLEVBQ3ZCLEtBQXdCO1FBRXhCLElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDcEUsSUFBSSxlQUFlLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDN0IsT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWix5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3QixDQUFDO1FBQ0QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQixDQUN6QixJQUF1QixFQUN2QixLQUF3QjtRQUV4QixJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3BFLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzdCLE9BQU8sTUFBTSxDQUFBO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1oseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUNELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztDQUNEO0FBRUQsMEJBQTBCO0FBRTFCLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFBO0FBRXJELGdCQUFnQixDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBSSxFQUFFLEVBQUU7SUFDNUYsTUFBTSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUE7SUFDakMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUMvQixVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBRTFDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDaEQsSUFBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMvQyxJQUFJLGtCQUEyQyxDQUFBO0lBQy9DLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQixNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUN4RCxNQUFNLE1BQU0sR0FBRyxNQUFNLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3BFLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQTtRQUN6QyxrQkFBa0IsR0FBRyxNQUFNLENBQUE7SUFDNUIsQ0FBQztJQUVELElBQUksQ0FBQztRQUNKLE1BQU0sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDMUYsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBQ0QsRUFBRTtRQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1QixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNuQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxFQUFFLENBQUM7Z0JBQ25CLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFDZixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3BCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEIsQ0FBQztZQUFTLENBQUM7UUFDVixrQkFBa0IsRUFBRSxPQUFPLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUE7QUFFRixTQUFTLHNCQUFzQixDQUFDLEdBQVE7SUFDdkMsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLDhCQUE4QixFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLEVBQUUsRUFBRTtJQUM3RixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFBO0lBQ25CLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBRXhDLGFBQWE7SUFDYixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUMxQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDaEUsQ0FBQyxDQUFDLENBQUE7QUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsOEJBQThCLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksRUFBRSxFQUFFO0lBQzdGLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUE7SUFDbkIsVUFBVSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFFeEMsYUFBYTtJQUNiLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNaLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNoRSxDQUFDLENBQUMsQ0FBQSJ9
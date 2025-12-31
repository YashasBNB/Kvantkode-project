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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbEhpZXJhcmNoeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NhbGxIaWVyYXJjaHkvY29tbW9uL2NhbGxIaWVyYXJjaHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDOUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFlLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUV6RixNQUFNLENBQU4sSUFBa0Isc0JBR2pCO0FBSEQsV0FBa0Isc0JBQXNCO0lBQ3ZDLG1EQUF5QixDQUFBO0lBQ3pCLHFEQUEyQixDQUFBO0FBQzVCLENBQUMsRUFIaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUd2QztBQStDRCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLHVCQUF1QixFQUF5QixDQUFBO0FBRWpHLE1BQU0sT0FBTyxrQkFBa0I7SUFDOUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQ2xCLEtBQWlCLEVBQ2pCLFFBQW1CLEVBQ25CLEtBQXdCO1FBRXhCLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyw2QkFBNkIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDL0QsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sUUFBUSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0UsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELE9BQU8sSUFBSSxrQkFBa0IsQ0FDNUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsRUFDcEQsUUFBUSxFQUNSLE9BQU8sQ0FBQyxLQUFLLEVBQ2IsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FDakMsQ0FBQTtJQUNGLENBQUM7SUFJRCxZQUNVLEVBQVUsRUFDVixRQUErQixFQUMvQixLQUEwQixFQUMxQixHQUF5QjtRQUh6QixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBQ1YsYUFBUSxHQUFSLFFBQVEsQ0FBdUI7UUFDL0IsVUFBSyxHQUFMLEtBQUssQ0FBcUI7UUFDMUIsUUFBRyxHQUFILEdBQUcsQ0FBc0I7UUFFbEMsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckIsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ25CLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBdUI7UUFDM0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLEtBQU0sU0FBUSxrQkFBa0I7WUFDM0M7Z0JBQ0MsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUMxRCxDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQUE7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQixDQUN6QixJQUF1QixFQUN2QixLQUF3QjtRQUV4QixJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3BFLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzdCLE9BQU8sTUFBTSxDQUFBO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1oseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUNELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FDekIsSUFBdUIsRUFDdkIsS0FBd0I7UUFFeEIsSUFBSSxDQUFDO1lBQ0osTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNwRSxJQUFJLGVBQWUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUM3QixPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7Q0FDRDtBQUVELDBCQUEwQjtBQUUxQixNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQTtBQUVyRCxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsOEJBQThCLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksRUFBRSxFQUFFO0lBQzVGLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFBO0lBQ2pDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7SUFDL0IsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUUxQyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ2hELElBQUksU0FBUyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDL0MsSUFBSSxrQkFBMkMsQ0FBQTtJQUMvQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEIsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDeEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNwRSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUE7UUFDekMsa0JBQWtCLEdBQUcsTUFBTSxDQUFBO0lBQzVCLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSixNQUFNLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUNELEVBQUU7UUFDRixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDbkMsSUFBSSxHQUFHLENBQUMsSUFBSSxHQUFHLEVBQUUsRUFBRSxDQUFDO2dCQUNuQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ2YsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNwQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3BCLENBQUM7WUFBUyxDQUFDO1FBQ1Ysa0JBQWtCLEVBQUUsT0FBTyxFQUFFLENBQUE7SUFDOUIsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFBO0FBRUYsU0FBUyxzQkFBc0IsQ0FBQyxHQUFRO0lBQ3ZDLE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVELGdCQUFnQixDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxFQUFFLEVBQUU7SUFDN0YsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQTtJQUNuQixVQUFVLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUV4QyxhQUFhO0lBQ2IsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDMUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1osT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2hFLENBQUMsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLDhCQUE4QixFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLEVBQUUsRUFBRTtJQUM3RixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFBO0lBQ25CLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBRXhDLGFBQWE7SUFDYixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUMxQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDaEUsQ0FBQyxDQUFDLENBQUEifQ==
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../editor/common/core/range.js';
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
export var TypeHierarchyDirection;
(function (TypeHierarchyDirection) {
    TypeHierarchyDirection["Subtypes"] = "subtypes";
    TypeHierarchyDirection["Supertypes"] = "supertypes";
})(TypeHierarchyDirection || (TypeHierarchyDirection = {}));
export const TypeHierarchyProviderRegistry = new LanguageFeatureRegistry();
export class TypeHierarchyModel {
    static async create(model, position, token) {
        const [provider] = TypeHierarchyProviderRegistry.ordered(model);
        if (!provider) {
            return undefined;
        }
        const session = await provider.prepareTypeHierarchy(model, position, token);
        if (!session) {
            return undefined;
        }
        return new TypeHierarchyModel(session.roots.reduce((p, c) => p + c._sessionId, ''), provider, session.roots, new RefCountedDisposable(session));
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
        return new (class extends TypeHierarchyModel {
            constructor() {
                super(that.id, that.provider, [item], that.ref.acquire());
            }
        })();
    }
    async provideSupertypes(item, token) {
        try {
            const result = await this.provider.provideSupertypes(item, token);
            if (isNonEmptyArray(result)) {
                return result;
            }
        }
        catch (e) {
            onUnexpectedExternalError(e);
        }
        return [];
    }
    async provideSubtypes(item, token) {
        try {
            const result = await this.provider.provideSubtypes(item, token);
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
CommandsRegistry.registerCommand('_executePrepareTypeHierarchy', async (accessor, ...args) => {
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
        const model = await TypeHierarchyModel.create(textModel, position, CancellationToken.None);
        if (!model) {
            return [];
        }
        _models.forEach((value, key, map) => {
            if (map.size > 10) {
                value.dispose();
                _models.delete(key);
            }
        });
        for (const root of model.roots) {
            _models.set(root._sessionId, model);
        }
        return model.roots;
    }
    finally {
        textModelReference?.dispose();
    }
});
function isTypeHierarchyItemDto(obj) {
    const item = obj;
    return (typeof obj === 'object' &&
        typeof item.name === 'string' &&
        typeof item.kind === 'number' &&
        URI.isUri(item.uri) &&
        Range.isIRange(item.range) &&
        Range.isIRange(item.selectionRange));
}
CommandsRegistry.registerCommand('_executeProvideSupertypes', async (_accessor, ...args) => {
    const [item] = args;
    assertType(isTypeHierarchyItemDto(item));
    // find model
    const model = _models.get(item._sessionId);
    if (!model) {
        return [];
    }
    return model.provideSupertypes(item, CancellationToken.None);
});
CommandsRegistry.registerCommand('_executeProvideSubtypes', async (_accessor, ...args) => {
    const [item] = args;
    assertType(isTypeHierarchyItemDto(item));
    // find model
    const model = _models.get(item._sessionId);
    if (!model) {
        return [];
    }
    return model.provideSubtypes(item, CancellationToken.None);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZUhpZXJhcmNoeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3R5cGVIaWVyYXJjaHkvY29tbW9uL3R5cGVIaWVyYXJjaHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBZSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFekYsTUFBTSxDQUFOLElBQWtCLHNCQUdqQjtBQUhELFdBQWtCLHNCQUFzQjtJQUN2QywrQ0FBcUIsQ0FBQTtJQUNyQixtREFBeUIsQ0FBQTtBQUMxQixDQUFDLEVBSGlCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFHdkM7QUFtQ0QsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFB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
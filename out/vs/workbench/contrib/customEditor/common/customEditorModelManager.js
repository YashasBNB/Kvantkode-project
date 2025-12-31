/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createSingleCallFunction } from '../../../../base/common/functional.js';
export class CustomEditorModelManager {
    constructor(uriIdentityService) {
        this._references = new Map();
        this._uriIdentityService = uriIdentityService;
    }
    async getAllModels(resource) {
        const keyStart = `${resource.toString()}@@@`;
        const models = [];
        for (const [key, entry] of this._references) {
            if (key.startsWith(keyStart) && entry.model) {
                models.push(await entry.model);
            }
        }
        return models;
    }
    async get(resource, viewType) {
        const key = this.key(resource, viewType);
        const entry = this._references.get(key);
        return entry?.model;
    }
    tryRetain(resource, viewType) {
        const key = this.key(resource, viewType);
        const entry = this._references.get(key);
        if (!entry) {
            return undefined;
        }
        entry.counter++;
        return entry.model.then((model) => {
            return {
                object: model,
                dispose: createSingleCallFunction(() => {
                    if (--entry.counter <= 0) {
                        entry.model.then((x) => x.dispose());
                        this._references.delete(key);
                    }
                }),
            };
        });
    }
    add(resource, viewType, model) {
        const key = this.key(resource, viewType);
        const existing = this._references.get(key);
        if (existing) {
            throw new Error('Model already exists');
        }
        this._references.set(key, { viewType, model, counter: 0 });
        return this.tryRetain(resource, viewType);
    }
    disposeAllModelsForView(viewType) {
        for (const [key, value] of this._references) {
            if (value.viewType === viewType) {
                value.model.then((x) => x.dispose());
                this._references.delete(key);
            }
        }
    }
    key(resource, viewType) {
        resource = this._uriIdentityService.asCanonicalUri(resource);
        return `${resource.toString()}@@@${viewType}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yTW9kZWxNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY3VzdG9tRWRpdG9yL2NvbW1vbi9jdXN0b21FZGl0b3JNb2RlbE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFNaEYsTUFBTSxPQUFPLHdCQUF3QjtJQUdwQyxZQUFZLGtCQUF1QztRQUlsQyxnQkFBVyxHQUFHLElBQUksR0FBRyxFQU9uQyxDQUFBO1FBVkYsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGtCQUFrQixDQUFBO0lBQzlDLENBQUM7SUFXTSxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQWE7UUFDdEMsTUFBTSxRQUFRLEdBQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQTtRQUM1QyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDakIsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUM3QyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUM3QyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBQ00sS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFhLEVBQUUsUUFBZ0I7UUFDL0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDeEMsTUFBTSxLQUFLLEdBQUcs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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
export class TestSecretStorageService {
    constructor() {
        this._storage = new Map();
        this._onDidChangeSecretEmitter = new Emitter();
        this.onDidChangeSecret = this._onDidChangeSecretEmitter.event;
        this.type = 'in-memory';
    }
    async get(key) {
        return this._storage.get(key);
    }
    async set(key, value) {
        this._storage.set(key, value);
        this._onDidChangeSecretEmitter.fire(key);
    }
    async delete(key) {
        this._storage.delete(key);
        this._onDidChangeSecretEmitter.fire(key);
    }
    // Helper method for tests to clear all secrets
    clear() {
        this._storage.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFNlY3JldFN0b3JhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc2VjcmV0cy90ZXN0L2NvbW1vbi90ZXN0U2VjcmV0U3RvcmFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRzFELE1BQU0sT0FBTyx3QkFBd0I7SUFBckM7UUFHa0IsYUFBUSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO1FBQ3BDLDhCQUF5QixHQUFHLElBQUksT0FBTyxFQUFVLENBQUE7UUFDekQsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQTtRQUVqRSxTQUFJLEdBQUcsV0FBb0IsQ0FBQTtJQW9CNUIsQ0FBQztJQWxCQSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQVc7UUFDcEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFXLEVBQUUsS0FBYTtRQUNuQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0IsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFXO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVELCtDQUErQztJQUMvQyxLQUFLO1FBQ0osSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0NBQ0QifQ==
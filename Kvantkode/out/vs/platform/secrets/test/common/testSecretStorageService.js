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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFNlY3JldFN0b3JhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zZWNyZXRzL3Rlc3QvY29tbW9uL3Rlc3RTZWNyZXRTdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHMUQsTUFBTSxPQUFPLHdCQUF3QjtJQUFyQztRQUdrQixhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7UUFDcEMsOEJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQTtRQUN6RCxzQkFBaUIsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFBO1FBRWpFLFNBQUksR0FBRyxXQUFvQixDQUFBO0lBb0I1QixDQUFDO0lBbEJBLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBVztRQUNwQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFhO1FBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3QixJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQVc7UUFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDekIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsK0NBQStDO0lBQy9DLEtBQUs7UUFDSixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3RCLENBQUM7Q0FDRCJ9
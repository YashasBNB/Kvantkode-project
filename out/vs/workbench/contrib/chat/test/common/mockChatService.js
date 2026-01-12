/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
export class MockChatService {
    constructor() {
        this.onDidSubmitRequest = Event.None;
        this.sessions = new Map();
        this.onDidPerformUserAction = undefined;
        this.onDidDisposeSession = undefined;
        this.unifiedViewEnabled = false;
    }
    isEnabled(location) {
        throw new Error('Method not implemented.');
    }
    hasSessions() {
        throw new Error('Method not implemented.');
    }
    getProviderInfos() {
        throw new Error('Method not implemented.');
    }
    startSession(location, token) {
        throw new Error('Method not implemented.');
    }
    addSession(session) {
        this.sessions.set(session.sessionId, session);
    }
    getSession(sessionId) {
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return this.sessions.get(sessionId) ?? {};
    }
    async getOrRestoreSession(sessionId) {
        throw new Error('Method not implemented.');
    }
    loadSessionFromContent(data) {
        throw new Error('Method not implemented.');
    }
    /**
     * Returns whether the request was accepted.
     */
    sendRequest(sessionId, message) {
        throw new Error('Method not implemented.');
    }
    resendRequest(request, options) {
        throw new Error('Method not implemented.');
    }
    adoptRequest(sessionId, request) {
        throw new Error('Method not implemented.');
    }
    removeRequest(sessionid, requestId) {
        throw new Error('Method not implemented.');
    }
    cancelCurrentRequestForSession(sessionId) {
        throw new Error('Method not implemented.');
    }
    clearSession(sessionId) {
        throw new Error('Method not implemented.');
    }
    addCompleteRequest(sessionId, message, variableData, attempt, response) {
        throw new Error('Method not implemented.');
    }
    async getHistory() {
        throw new Error('Method not implemented.');
    }
    async clearAllHistoryEntries() {
        throw new Error('Method not implemented.');
    }
    async removeHistoryEntry(sessionId) {
        throw new Error('Method not implemented.');
    }
    notifyUserAction(event) {
        throw new Error('Method not implemented.');
    }
    transferChatSession(transferredSessionData, toWorkspace) {
        throw new Error('Method not implemented.');
    }
    setChatSessionTitle(sessionId, title) {
        throw new Error('Method not implemented.');
    }
    isEditingLocation(location) {
        throw new Error('Method not implemented.');
    }
    getChatStorageFolder() {
        throw new Error('Method not implemented.');
    }
    logChatIndex() {
        throw new Error('Method not implemented.');
    }
    isPersistedSessionEmpty(sessionId) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL21vY2tDaGF0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFzQjNELE1BQU0sT0FBTyxlQUFlO0lBQTVCO1FBR0MsdUJBQWtCLEdBQXFDLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFFekQsYUFBUSxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFBO1FBc0VoRCwyQkFBc0IsR0FBZ0MsU0FBVSxDQUFBO1FBSWhFLHdCQUFtQixHQUNsQixTQUFVLENBQUE7UUFVWCx1QkFBa0IsR0FBRyxLQUFLLENBQUE7SUFnQjNCLENBQUM7SUFuR0EsU0FBUyxDQUFDLFFBQTJCO1FBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsV0FBVztRQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsZ0JBQWdCO1FBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxZQUFZLENBQUMsUUFBMkIsRUFBRSxLQUF3QjtRQUNqRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELFVBQVUsQ0FBQyxPQUFtQjtRQUM3QixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFDRCxVQUFVLENBQUMsU0FBaUI7UUFDM0IsbUVBQW1FO1FBQ25FLE9BQU8sSUFB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
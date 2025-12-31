/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { generateUuid } from '../../../base/common/uuid.js';
export class InspectProfilingService {
    constructor() {
        this._sessions = new Map();
    }
    async startProfiling(options) {
        const prof = await import('v8-inspect-profiler');
        const session = await prof.startProfiling({
            host: options.host,
            port: options.port,
            checkForPaused: true,
        });
        const id = generateUuid();
        this._sessions.set(id, session);
        return id;
    }
    async stopProfiling(sessionId) {
        const session = this._sessions.get(sessionId);
        if (!session) {
            throw new Error(`UNKNOWN session '${sessionId}'`);
        }
        const result = await session.stop();
        this._sessions.delete(sessionId);
        return result.profile;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsaW5nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2ZpbGluZy9ub2RlL3Byb2ZpbGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRzNELE1BQU0sT0FBTyx1QkFBdUI7SUFBcEM7UUFHa0IsY0FBUyxHQUFHLElBQUksR0FBRyxFQUE0QixDQUFBO0lBdUJqRSxDQUFDO0lBckJBLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBdUM7UUFDM0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUNoRCxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUM7WUFDekMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtZQUNsQixjQUFjLEVBQUUsSUFBSTtTQUNwQixDQUFDLENBQUE7UUFDRixNQUFNLEVBQUUsR0FBRyxZQUFZLEVBQUUsQ0FBQTtRQUN6QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDL0IsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFpQjtRQUNwQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2xELENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNoQyxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUE7SUFDdEIsQ0FBQztDQUNEIn0=
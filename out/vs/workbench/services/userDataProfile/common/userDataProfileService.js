/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Promises } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { equals } from '../../../../base/common/objects.js';
export class UserDataProfileService extends Disposable {
    get currentProfile() {
        return this._currentProfile;
    }
    constructor(currentProfile) {
        super();
        this._onDidChangeCurrentProfile = this._register(new Emitter());
        this.onDidChangeCurrentProfile = this._onDidChangeCurrentProfile.event;
        this._currentProfile = currentProfile;
    }
    async updateCurrentProfile(userDataProfile) {
        if (equals(this._currentProfile, userDataProfile)) {
            return;
        }
        const previous = this._currentProfile;
        this._currentProfile = userDataProfile;
        const joiners = [];
        this._onDidChangeCurrentProfile.fire({
            previous,
            profile: userDataProfile,
            join(promise) {
                joiners.push(promise);
            },
        });
        await Promises.settled(joiners);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvY29tbW9uL3VzZXJEYXRhUHJvZmlsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBSTNELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxVQUFVO0lBU3JELElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUVELFlBQVksY0FBZ0M7UUFDM0MsS0FBSyxFQUFFLENBQUE7UUFYUywrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMzRCxJQUFJLE9BQU8sRUFBaUMsQ0FDNUMsQ0FBQTtRQUNRLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUE7UUFTekUsSUFBSSxDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUE7SUFDdEMsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxlQUFpQztRQUMzRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDbkQsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFBO1FBQ3JDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO1FBQ3RDLE1BQU0sT0FBTyxHQUFvQixFQUFFLENBQUE7UUFDbkMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQztZQUNwQyxRQUFRO1lBQ1IsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxDQUFDLE9BQU87Z0JBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN0QixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ2hDLENBQUM7Q0FDRCJ9
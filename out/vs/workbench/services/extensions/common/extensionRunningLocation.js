/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LocalProcessRunningLocation {
    constructor(affinity) {
        this.affinity = affinity;
        this.kind = 1 /* ExtensionHostKind.LocalProcess */;
    }
    equals(other) {
        return this.kind === other.kind && this.affinity === other.affinity;
    }
    asString() {
        if (this.affinity === 0) {
            return 'LocalProcess';
        }
        return `LocalProcess${this.affinity}`;
    }
}
export class LocalWebWorkerRunningLocation {
    constructor(affinity) {
        this.affinity = affinity;
        this.kind = 2 /* ExtensionHostKind.LocalWebWorker */;
    }
    equals(other) {
        return this.kind === other.kind && this.affinity === other.affinity;
    }
    asString() {
        if (this.affinity === 0) {
            return 'LocalWebWorker';
        }
        return `LocalWebWorker${this.affinity}`;
    }
}
export class RemoteRunningLocation {
    constructor() {
        this.kind = 3 /* ExtensionHostKind.Remote */;
        this.affinity = 0;
    }
    equals(other) {
        return this.kind === other.kind;
    }
    asString() {
        return 'Remote';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUnVubmluZ0xvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvblJ1bm5pbmdMb2NhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLE9BQU8sMkJBQTJCO0lBRXZDLFlBQTRCLFFBQWdCO1FBQWhCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFENUIsU0FBSSwwQ0FBaUM7SUFDTixDQUFDO0lBQ3pDLE1BQU0sQ0FBQyxLQUErQjtRQUM1QyxPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLEtBQUssQ0FBQyxRQUFRLENBQUE7SUFDcEUsQ0FBQztJQUNNLFFBQVE7UUFDZCxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxjQUFjLENBQUE7UUFDdEIsQ0FBQztRQUNELE9BQU8sZUFBZSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDdEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDZCQUE2QjtJQUV6QyxZQUE0QixRQUFnQjtRQUFoQixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBRDVCLFNBQUksNENBQW1DO0lBQ1IsQ0FBQztJQUN6QyxNQUFNLENBQUMsS0FBK0I7UUFDNUMsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxLQUFLLENBQUMsUUFBUSxDQUFBO0lBQ3BFLENBQUM7SUFDTSxRQUFRO1FBQ2QsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sZ0JBQWdCLENBQUE7UUFDeEIsQ0FBQztRQUNELE9BQU8saUJBQWlCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN4QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8scUJBQXFCO0lBQWxDO1FBQ2lCLFNBQUksb0NBQTJCO1FBQy9CLGFBQVEsR0FBRyxDQUFDLENBQUE7SUFPN0IsQ0FBQztJQU5PLE1BQU0sQ0FBQyxLQUErQjtRQUM1QyxPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQTtJQUNoQyxDQUFDO0lBQ00sUUFBUTtRQUNkLE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7Q0FDRCJ9
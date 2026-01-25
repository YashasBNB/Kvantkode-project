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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUnVubmluZ0xvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uUnVubmluZ0xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sT0FBTywyQkFBMkI7SUFFdkMsWUFBNEIsUUFBZ0I7UUFBaEIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUQ1QixTQUFJLDBDQUFpQztJQUNOLENBQUM7SUFDekMsTUFBTSxDQUFDLEtBQStCO1FBQzVDLE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FBQTtJQUNwRSxDQUFDO0lBQ00sUUFBUTtRQUNkLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLGNBQWMsQ0FBQTtRQUN0QixDQUFDO1FBQ0QsT0FBTyxlQUFlLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN0QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sNkJBQTZCO0lBRXpDLFlBQTRCLFFBQWdCO1FBQWhCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFENUIsU0FBSSw0Q0FBbUM7SUFDUixDQUFDO0lBQ3pDLE1BQU0sQ0FBQyxLQUErQjtRQUM1QyxPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLEtBQUssQ0FBQyxRQUFRLENBQUE7SUFDcEUsQ0FBQztJQUNNLFFBQVE7UUFDZCxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxnQkFBZ0IsQ0FBQTtRQUN4QixDQUFDO1FBQ0QsT0FBTyxpQkFBaUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3hDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxxQkFBcUI7SUFBbEM7UUFDaUIsU0FBSSxvQ0FBMkI7UUFDL0IsYUFBUSxHQUFHLENBQUMsQ0FBQTtJQU83QixDQUFDO0lBTk8sTUFBTSxDQUFDLEtBQStCO1FBQzVDLE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFBO0lBQ2hDLENBQUM7SUFDTSxRQUFRO1FBQ2QsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztDQUNEIn0=
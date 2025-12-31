/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function onObservableChange(observable, callback) {
    const o = {
        beginUpdate() { },
        endUpdate() { },
        handlePossibleChange(observable) {
            observable.reportChanges();
        },
        handleChange(_observable, change) {
            callback(change);
        },
    };
    observable.addObserver(o);
    return {
        dispose() {
            observable.removeObserver(o);
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vb2JzZXJ2YWJsZVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE1BQU0sVUFBVSxrQkFBa0IsQ0FDakMsVUFBNkMsRUFDN0MsUUFBNEI7SUFFNUIsTUFBTSxDQUFDLEdBQWM7UUFDcEIsV0FBVyxLQUFJLENBQUM7UUFDaEIsU0FBUyxLQUFJLENBQUM7UUFDZCxvQkFBb0IsQ0FBQyxVQUFVO1lBQzlCLFVBQVUsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUMzQixDQUFDO1FBQ0QsWUFBWSxDQUFjLFdBQStDLEVBQUUsTUFBZTtZQUN6RixRQUFRLENBQUMsTUFBa0IsQ0FBQyxDQUFBO1FBQzdCLENBQUM7S0FDRCxDQUFBO0lBRUQsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN6QixPQUFPO1FBQ04sT0FBTztZQUNOLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQztLQUNELENBQUE7QUFDRixDQUFDIn0=
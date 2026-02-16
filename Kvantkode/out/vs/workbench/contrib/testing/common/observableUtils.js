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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi9vYnNlcnZhYmxlVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsTUFBTSxVQUFVLGtCQUFrQixDQUNqQyxVQUE2QyxFQUM3QyxRQUE0QjtJQUU1QixNQUFNLENBQUMsR0FBYztRQUNwQixXQUFXLEtBQUksQ0FBQztRQUNoQixTQUFTLEtBQUksQ0FBQztRQUNkLG9CQUFvQixDQUFDLFVBQVU7WUFDOUIsVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQzNCLENBQUM7UUFDRCxZQUFZLENBQWMsV0FBK0MsRUFBRSxNQUFlO1lBQ3pGLFFBQVEsQ0FBQyxNQUFrQixDQUFDLENBQUE7UUFDN0IsQ0FBQztLQUNELENBQUE7SUFFRCxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pCLE9BQU87UUFDTixPQUFPO1lBQ04sVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3QixDQUFDO0tBQ0QsQ0FBQTtBQUNGLENBQUMifQ==
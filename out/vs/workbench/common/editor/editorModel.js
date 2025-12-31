/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
/**
 * The editor model is the heavyweight counterpart of editor input. Depending on the editor input, it
 * resolves from a file system retrieve content and may allow for saving it back or reverting it.
 * Editor models are typically cached for some while because they are expensive to construct.
 */
export class EditorModel extends Disposable {
    constructor() {
        super(...arguments);
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.resolved = false;
    }
    /**
     * Causes this model to resolve returning a promise when loading is completed.
     */
    async resolve() {
        this.resolved = true;
    }
    /**
     * Returns whether this model was loaded or not.
     */
    isResolved() {
        return this.resolved;
    }
    /**
     * Find out if this model has been disposed.
     */
    isDisposed() {
        return this._store.isDisposed;
    }
    /**
     * Subclasses should implement to free resources that have been claimed through loading.
     */
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci9lZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTlEOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sV0FBWSxTQUFRLFVBQVU7SUFBM0M7O1FBQ2tCLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDNUQsa0JBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQTtRQUUxQyxhQUFRLEdBQUcsS0FBSyxDQUFBO0lBK0J6QixDQUFDO0lBN0JBOztPQUVHO0lBQ0gsS0FBSyxDQUFDLE9BQU87UUFDWixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtJQUNyQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFRDs7T0FFRztJQUNILFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFBO0lBQzlCLENBQUM7SUFFRDs7T0FFRztJQUNNLE9BQU87UUFDZixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFBO1FBRTFCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0NBQ0QifQ==
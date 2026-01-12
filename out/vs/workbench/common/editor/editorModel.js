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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL2VkaXRvck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFOUQ7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxXQUFZLFNBQVEsVUFBVTtJQUEzQzs7UUFDa0IsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUM1RCxrQkFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFBO1FBRTFDLGFBQVEsR0FBRyxLQUFLLENBQUE7SUErQnpCLENBQUM7SUE3QkE7O09BRUc7SUFDSCxLQUFLLENBQUMsT0FBTztRQUNaLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO0lBQ3JCLENBQUM7SUFFRDs7T0FFRztJQUNILFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUE7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ00sT0FBTztRQUNmLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFMUIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7Q0FDRCJ9
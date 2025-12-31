/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationError, onUnexpectedError } from '../../../../base/common/errors.js';
export class LazyPromise {
    constructor() {
        this._actual = null;
        this._actualOk = null;
        this._actualErr = null;
        this._hasValue = false;
        this._value = null;
        this._hasErr = false;
        this._err = null;
    }
    get [Symbol.toStringTag]() {
        return this.toString();
    }
    _ensureActual() {
        if (!this._actual) {
            this._actual = new Promise((c, e) => {
                this._actualOk = c;
                this._actualErr = e;
                if (this._hasValue) {
                    this._actualOk(this._value);
                }
                if (this._hasErr) {
                    this._actualErr(this._err);
                }
            });
        }
        return this._actual;
    }
    resolveOk(value) {
        if (this._hasValue || this._hasErr) {
            return;
        }
        this._hasValue = true;
        this._value = value;
        if (this._actual) {
            this._actualOk(value);
        }
    }
    resolveErr(err) {
        if (this._hasValue || this._hasErr) {
            return;
        }
        this._hasErr = true;
        this._err = err;
        if (this._actual) {
            this._actualErr(err);
        }
        else {
            // If nobody's listening at this point, it is safe to assume they never will,
            // since resolving this promise is always "async"
            onUnexpectedError(err);
        }
    }
    then(success, error) {
        return this._ensureActual().then(success, error);
    }
    catch(error) {
        return this._ensureActual().then(undefined, error);
    }
    finally(callback) {
        return this._ensureActual().finally(callback);
    }
}
export class CanceledLazyPromise extends LazyPromise {
    constructor() {
        super();
        this._hasErr = true;
        this._err = new CancellationError();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eVByb21pc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vbGF6eVByb21pc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFeEYsTUFBTSxPQUFPLFdBQVc7SUFXdkI7UUFDQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQTtRQUNuQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtRQUNyQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQTtRQUN0QixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQTtRQUNsQixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtJQUNqQixDQUFDO0lBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7UUFDdkIsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUVPLGFBQWE7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUN4QyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtnQkFDbEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUE7Z0JBRW5CLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDNUIsQ0FBQztnQkFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzNCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVNLFNBQVMsQ0FBQyxLQUFVO1FBQzFCLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUVuQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRU0sVUFBVSxDQUFDLEdBQVE7UUFDekIsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1FBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFBO1FBRWYsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLFVBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0QixDQUFDO2FBQU0sQ0FBQztZQUNQLDZFQUE2RTtZQUM3RSxpREFBaUQ7WUFDakQsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdkIsQ0FBQztJQUNGLENBQUM7SUFFTSxJQUFJLENBQUMsT0FBWSxFQUFFLEtBQVU7UUFDbkMsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRU0sS0FBSyxDQUFDLEtBQVU7UUFDdEIsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRU0sT0FBTyxDQUFDLFFBQW9CO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsV0FBVztJQUNuRDtRQUNDLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUE7SUFDcEMsQ0FBQztDQUNEIn0=
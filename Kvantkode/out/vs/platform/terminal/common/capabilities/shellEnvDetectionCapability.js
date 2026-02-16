/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { equals } from '../../../../base/common/objects.js';
import { mapsStrictEqualIgnoreOrder } from '../../../../base/common/map.js';
export class ShellEnvDetectionCapability extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 5 /* TerminalCapability.ShellEnvDetection */;
        this._env = { value: new Map(), isTrusted: true };
        this._onDidChangeEnv = this._register(new Emitter());
        this.onDidChangeEnv = this._onDidChangeEnv.event;
    }
    get env() {
        return this._createStateObject();
    }
    setEnvironment(env, isTrusted) {
        if (equals(this.env.value, env)) {
            return;
        }
        this._env.value.clear();
        for (const [key, value] of Object.entries(env)) {
            if (value !== undefined) {
                this._env.value.set(key, value);
            }
        }
        this._env.isTrusted = isTrusted;
        this._fireEnvChange();
    }
    startEnvironmentSingleVar(clear, isTrusted) {
        if (clear) {
            this._pendingEnv = {
                value: new Map(),
                isTrusted,
            };
        }
        else {
            this._pendingEnv = {
                value: new Map(this._env.value),
                isTrusted: this._env.isTrusted && isTrusted,
            };
        }
    }
    setEnvironmentSingleVar(key, value, isTrusted) {
        if (!this._pendingEnv) {
            return;
        }
        if (key !== undefined && value !== undefined) {
            this._pendingEnv.value.set(key, value);
            this._pendingEnv.isTrusted &&= isTrusted;
        }
    }
    endEnvironmentSingleVar(isTrusted) {
        if (!this._pendingEnv) {
            return;
        }
        this._pendingEnv.isTrusted &&= isTrusted;
        const envDiffers = !mapsStrictEqualIgnoreOrder(this._env.value, this._pendingEnv.value);
        if (envDiffers) {
            this._env = this._pendingEnv;
            this._fireEnvChange();
        }
        this._pendingEnv = undefined;
    }
    deleteEnvironmentSingleVar(key, value, isTrusted) {
        if (!this._pendingEnv) {
            return;
        }
        if (key !== undefined && value !== undefined) {
            this._pendingEnv.value.delete(key);
            this._pendingEnv.isTrusted &&= isTrusted;
        }
    }
    _fireEnvChange() {
        this._onDidChangeEnv.fire(this._createStateObject());
    }
    _createStateObject() {
        return {
            value: Object.fromEntries(this._env.value),
            isTrusted: this._env.isTrusted,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxFbnZEZXRlY3Rpb25DYXBhYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL3NoZWxsRW52RGV0ZWN0aW9uQ2FwYWJpbGl0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFNakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU8zRSxNQUFNLE9BQU8sMkJBQ1osU0FBUSxVQUFVO0lBRG5COztRQUlVLFNBQUksZ0RBQXVDO1FBRzVDLFNBQUksR0FBYyxFQUFFLEtBQUssRUFBRSxJQUFJLEdBQUcsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQU05QyxvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2hELElBQUksT0FBTyxFQUF1QyxDQUNsRCxDQUFBO1FBQ1EsbUJBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQTtJQTJFckQsQ0FBQztJQWxGQSxJQUFJLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFPRCxjQUFjLENBQUMsR0FBMEMsRUFBRSxTQUFrQjtRQUM1RSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FB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
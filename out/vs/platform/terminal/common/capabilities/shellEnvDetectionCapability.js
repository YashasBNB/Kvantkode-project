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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxFbnZEZXRlY3Rpb25DYXBhYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL2NhcGFiaWxpdGllcy9zaGVsbEVudkRldGVjdGlvbkNhcGFiaWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBTWpFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFPM0UsTUFBTSxPQUFPLDJCQUNaLFNBQVEsVUFBVTtJQURuQjs7UUFJVSxTQUFJLGdEQUF1QztRQUc1QyxTQUFJLEdBQWMsRUFBRSxLQUFLLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUE7UUFNOUMsb0JBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNoRCxJQUFJLE9BQU8sRUFBdUMsQ0FDbEQsQ0FBQTtRQUNRLG1CQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUE7SUEyRXJELENBQUM7SUFsRkEsSUFBSSxHQUFHO1FBQ04sT0FBTyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBT0QsY0FBYyxDQUFDLEdBQTBDLEVBQUUsU0FBa0I7UUFDNUUsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxD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
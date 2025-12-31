/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEmptyObject } from '../../base/common/types.js';
import { onUnexpectedError } from '../../base/common/errors.js';
export class Memento {
    static { this.applicationMementos = new Map(); }
    static { this.profileMementos = new Map(); }
    static { this.workspaceMementos = new Map(); }
    static { this.COMMON_PREFIX = 'memento/'; }
    constructor(id, storageService) {
        this.storageService = storageService;
        this.id = Memento.COMMON_PREFIX + id;
    }
    getMemento(scope, target) {
        switch (scope) {
            case 1 /* StorageScope.WORKSPACE */: {
                let workspaceMemento = Memento.workspaceMementos.get(this.id);
                if (!workspaceMemento) {
                    workspaceMemento = new ScopedMemento(this.id, scope, target, this.storageService);
                    Memento.workspaceMementos.set(this.id, workspaceMemento);
                }
                return workspaceMemento.getMemento();
            }
            case 0 /* StorageScope.PROFILE */: {
                let profileMemento = Memento.profileMementos.get(this.id);
                if (!profileMemento) {
                    profileMemento = new ScopedMemento(this.id, scope, target, this.storageService);
                    Memento.profileMementos.set(this.id, profileMemento);
                }
                return profileMemento.getMemento();
            }
            case -1 /* StorageScope.APPLICATION */: {
                let applicationMemento = Memento.applicationMementos.get(this.id);
                if (!applicationMemento) {
                    applicationMemento = new ScopedMemento(this.id, scope, target, this.storageService);
                    Memento.applicationMementos.set(this.id, applicationMemento);
                }
                return applicationMemento.getMemento();
            }
        }
    }
    onDidChangeValue(scope, disposables) {
        return this.storageService.onDidChangeValue(scope, this.id, disposables);
    }
    saveMemento() {
        Memento.workspaceMementos.get(this.id)?.save();
        Memento.profileMementos.get(this.id)?.save();
        Memento.applicationMementos.get(this.id)?.save();
    }
    reloadMemento(scope) {
        let memento;
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                memento = Memento.applicationMementos.get(this.id);
                break;
            case 0 /* StorageScope.PROFILE */:
                memento = Memento.profileMementos.get(this.id);
                break;
            case 1 /* StorageScope.WORKSPACE */:
                memento = Memento.workspaceMementos.get(this.id);
                break;
        }
        memento?.reload();
    }
    static clear(scope) {
        switch (scope) {
            case 1 /* StorageScope.WORKSPACE */:
                Memento.workspaceMementos.clear();
                break;
            case 0 /* StorageScope.PROFILE */:
                Memento.profileMementos.clear();
                break;
            case -1 /* StorageScope.APPLICATION */:
                Memento.applicationMementos.clear();
                break;
        }
    }
}
class ScopedMemento {
    constructor(id, scope, target, storageService) {
        this.id = id;
        this.scope = scope;
        this.target = target;
        this.storageService = storageService;
        this.mementoObj = this.doLoad();
    }
    doLoad() {
        try {
            return this.storageService.getObject(this.id, this.scope, {});
        }
        catch (error) {
            // Seeing reports from users unable to open editors
            // from memento parsing exceptions. Log the contents
            // to diagnose further
            // https://github.com/microsoft/vscode/issues/102251
            onUnexpectedError(`[memento]: failed to parse contents: ${error} (id: ${this.id}, scope: ${this.scope}, contents: ${this.storageService.get(this.id, this.scope)})`);
        }
        return {};
    }
    getMemento() {
        return this.mementoObj;
    }
    reload() {
        // Clear old
        for (const name of Object.getOwnPropertyNames(this.mementoObj)) {
            delete this.mementoObj[name];
        }
        // Assign new
        Object.assign(this.mementoObj, this.doLoad());
    }
    save() {
        if (!isEmptyObject(this.mementoObj)) {
            this.storageService.store(this.id, this.mementoObj, this.scope, this.target);
        }
        else {
            this.storageService.remove(this.id, this.scope);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVtZW50by5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vbWVtZW50by50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVFoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFNL0QsTUFBTSxPQUFPLE9BQU87YUFDSyx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQTthQUN0RCxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUF5QixDQUFBO2FBQ2xELHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUF5QixDQUFBO2FBRXBELGtCQUFhLEdBQUcsVUFBVSxDQUFBO0lBSWxELFlBQ0MsRUFBVSxFQUNGLGNBQStCO1FBQS9CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUV2QyxJQUFJLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFBO0lBQ3JDLENBQUM7SUFFRCxVQUFVLENBQUMsS0FBbUIsRUFBRSxNQUFxQjtRQUNwRCxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsbUNBQTJCLENBQUMsQ0FBQyxDQUFDO2dCQUM3QixJQUFJLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUM3RCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDdkIsZ0JBQWdCLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtvQkFDakYsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFB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
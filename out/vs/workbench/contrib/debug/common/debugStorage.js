/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Breakpoint, DataBreakpoint, ExceptionBreakpoint, Expression, FunctionBreakpoint, } from './debugModel.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { mapValues } from '../../../../base/common/objects.js';
const DEBUG_BREAKPOINTS_KEY = 'debug.breakpoint';
const DEBUG_FUNCTION_BREAKPOINTS_KEY = 'debug.functionbreakpoint';
const DEBUG_DATA_BREAKPOINTS_KEY = 'debug.databreakpoint';
const DEBUG_EXCEPTION_BREAKPOINTS_KEY = 'debug.exceptionbreakpoint';
const DEBUG_WATCH_EXPRESSIONS_KEY = 'debug.watchexpressions';
const DEBUG_CHOSEN_ENVIRONMENTS_KEY = 'debug.chosenenvironment';
const DEBUG_UX_STATE_KEY = 'debug.uxstate';
let DebugStorage = class DebugStorage extends Disposable {
    constructor(storageService, textFileService, uriIdentityService, logService) {
        super();
        this.storageService = storageService;
        this.textFileService = textFileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.breakpoints = observableValue(this, this.loadBreakpoints());
        this.functionBreakpoints = observableValue(this, this.loadFunctionBreakpoints());
        this.exceptionBreakpoints = observableValue(this, this.loadExceptionBreakpoints());
        this.dataBreakpoints = observableValue(this, this.loadDataBreakpoints());
        this.watchExpressions = observableValue(this, this.loadWatchExpressions());
        this._register(storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, undefined, this._store)((e) => {
            if (e.external) {
                switch (e.key) {
                    case DEBUG_BREAKPOINTS_KEY:
                        return this.breakpoints.set(this.loadBreakpoints(), undefined);
                    case DEBUG_FUNCTION_BREAKPOINTS_KEY:
                        return this.functionBreakpoints.set(this.loadFunctionBreakpoints(), undefined);
                    case DEBUG_EXCEPTION_BREAKPOINTS_KEY:
                        return this.exceptionBreakpoints.set(this.loadExceptionBreakpoints(), undefined);
                    case DEBUG_DATA_BREAKPOINTS_KEY:
                        return this.dataBreakpoints.set(this.loadDataBreakpoints(), undefined);
                    case DEBUG_WATCH_EXPRESSIONS_KEY:
                        return this.watchExpressions.set(this.loadWatchExpressions(), undefined);
                }
            }
        }));
    }
    loadDebugUxState() {
        return this.storageService.get(DEBUG_UX_STATE_KEY, 1 /* StorageScope.WORKSPACE */, 'default');
    }
    storeDebugUxState(value) {
        this.storageService.store(DEBUG_UX_STATE_KEY, value, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    loadBreakpoints() {
        let result;
        try {
            result = JSON.parse(this.storageService.get(DEBUG_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */, '[]')).map((breakpoint) => {
                breakpoint.uri = URI.revive(breakpoint.uri);
                return new Breakpoint(breakpoint, this.textFileService, this.uriIdentityService, this.logService, breakpoint.id);
            });
        }
        catch (e) { }
        return result || [];
    }
    loadFunctionBreakpoints() {
        let result;
        try {
            result = JSON.parse(this.storageService.get(DEBUG_FUNCTION_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */, '[]')).map((fb) => {
                return new FunctionBreakpoint(fb, fb.id);
            });
        }
        catch (e) { }
        return result || [];
    }
    loadExceptionBreakpoints() {
        let result;
        try {
            result = JSON.parse(this.storageService.get(DEBUG_EXCEPTION_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */, '[]')).map((exBreakpoint) => {
                return new ExceptionBreakpoint(exBreakpoint, exBreakpoint.id);
            });
        }
        catch (e) { }
        return result || [];
    }
    loadDataBreakpoints() {
        let result;
        try {
            result = JSON.parse(this.storageService.get(DEBUG_DATA_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */, '[]')).map((dbp) => {
                return new DataBreakpoint(dbp, dbp.id);
            });
        }
        catch (e) { }
        return result || [];
    }
    loadWatchExpressions() {
        let result;
        try {
            result = JSON.parse(this.storageService.get(DEBUG_WATCH_EXPRESSIONS_KEY, 1 /* StorageScope.WORKSPACE */, '[]')).map((watchStoredData) => {
                return new Expression(watchStoredData.name, watchStoredData.id);
            });
        }
        catch (e) { }
        return result || [];
    }
    loadChosenEnvironments() {
        const obj = JSON.parse(this.storageService.get(DEBUG_CHOSEN_ENVIRONMENTS_KEY, 1 /* StorageScope.WORKSPACE */, '{}'));
        // back compat from when this was a string map:
        return mapValues(obj, (value) => (typeof value === 'string' ? { type: value } : value));
    }
    storeChosenEnvironments(environments) {
        this.storageService.store(DEBUG_CHOSEN_ENVIRONMENTS_KEY, JSON.stringify(environments), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    storeWatchExpressions(watchExpressions) {
        if (watchExpressions.length) {
            this.storageService.store(DEBUG_WATCH_EXPRESSIONS_KEY, JSON.stringify(watchExpressions.map((we) => ({ name: we.name, id: we.getId() }))), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_WATCH_EXPRESSIONS_KEY, 1 /* StorageScope.WORKSPACE */);
        }
    }
    storeBreakpoints(debugModel) {
        const breakpoints = debugModel.getBreakpoints();
        if (breakpoints.length) {
            this.storageService.store(DEBUG_BREAKPOINTS_KEY, JSON.stringify(breakpoints), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        const functionBreakpoints = debugModel.getFunctionBreakpoints();
        if (functionBreakpoints.length) {
            this.storageService.store(DEBUG_FUNCTION_BREAKPOINTS_KEY, JSON.stringify(functionBreakpoints), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_FUNCTION_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        const dataBreakpoints = debugModel.getDataBreakpoints().filter((dbp) => dbp.canPersist);
        if (dataBreakpoints.length) {
            this.storageService.store(DEBUG_DATA_BREAKPOINTS_KEY, JSON.stringify(dataBreakpoints), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_DATA_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        const exceptionBreakpoints = debugModel.getExceptionBreakpoints();
        if (exceptionBreakpoints.length) {
            this.storageService.store(DEBUG_EXCEPTION_BREAKPOINTS_KEY, JSON.stringify(exceptionBreakpoints), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_EXCEPTION_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */);
        }
    }
};
DebugStorage = __decorate([
    __param(0, IStorageService),
    __param(1, ITextFileService),
    __param(2, IUriIdentityService),
    __param(3, ILogService)
], DebugStorage);
export { DebugStorage };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTdG9yYWdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnU3RvcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRTVGLE9BQU8sRUFDTixVQUFVLEVBQ1YsY0FBYyxFQUNkLG1CQUFtQixFQUNuQixVQUFVLEVBQ1Ysa0JBQWtCLEdBQ2xCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTlELE1BQU0scUJBQXFCLEdBQUcsa0JBQWtCLENBQUE7QUFDaEQsTUFBTSw4QkFBOEIsR0FBRywwQkFBMEIsQ0FBQTtBQUNqRSxNQUFNLDBCQUEwQixHQUFHLHNCQUFzQixDQUFBO0FBQ3pELE1BQU0sK0JBQStCLEdBQUcsMkJBQTJCLENBQUE7QUFDbkUsTUFBTSwyQkFBMkIsR0FBRyx3QkFBd0IsQ0FBQTtBQUM1RCxNQUFNLDZCQUE2QixHQUFHLHlCQUF5QixDQUFBO0FBQy9ELE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFBO0FBT25DLElBQU0s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
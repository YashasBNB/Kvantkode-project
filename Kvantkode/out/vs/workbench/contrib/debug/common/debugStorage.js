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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTdG9yYWdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdTdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFNUYsT0FBTyxFQUNOLFVBQVUsRUFDVixjQUFjLEVBQ2QsbUJBQW1CLEVBQ25CLFVBQVUsRUFDVixrQkFBa0IsR0FDbEIsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFOUQsTUFBTSxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQTtBQUNoRCxNQUFNLDhCQUE4QixHQUFHLDBCQUEwQixDQUFBO0FBQ2pFLE1BQU0sMEJBQTBCLEdBQUcsc0JBQXNCLENBQUE7QUFDekQsTUFBTSwrQkFBK0IsR0FBRywyQkFBMkIsQ0FBQTtBQUNuRSxNQUFNLDJCQUEyQixHQUFHLHdCQUF3QixDQUFBO0FBQzVELE1BQU0sNkJBQTZCLEdBQUcseUJBQXlCLENBQUE7QUFDL0QsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQUE7QUFPbkMs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
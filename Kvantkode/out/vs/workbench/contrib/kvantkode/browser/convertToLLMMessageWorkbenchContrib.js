/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
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
import { URI } from '../../../../base/common/uri.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { IVoidModelService } from '../common/voidModelService.js';
let ConvertContribWorkbenchContribution = class ConvertContribWorkbenchContribution extends Disposable {
    static { this.ID = 'workbench.contrib.void.convertcontrib'; }
    constructor(voidModelService, workspaceContext) {
        super();
        this.voidModelService = voidModelService;
        this.workspaceContext = workspaceContext;
        const initializeURI = (uri) => {
            this.workspaceContext.getWorkspace();
            const voidRulesURI = URI.joinPath(uri, '.voidrules');
            this.voidModelService.initializeModel(voidRulesURI);
        };
        // call
        this._register(this.workspaceContext.onDidChangeWorkspaceFolders((e) => {
            ;
            [...e.changed, ...e.added].forEach((w) => {
                initializeURI(w.uri);
            });
        }));
        this.workspaceContext.getWorkspace().folders.forEach((w) => {
            initializeURI(w.uri);
        });
    }
};
ConvertContribWorkbenchContribution = __decorate([
    __param(0, IVoidModelService),
    __param(1, IWorkspaceContextService)
], ConvertContribWorkbenchContribution);
registerWorkbenchContribution2(ConvertContribWorkbenchContribution.ID, ConvertContribWorkbenchContribution, 2 /* WorkbenchPhase.BlockRestore */);

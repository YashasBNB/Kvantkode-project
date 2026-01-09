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
import { URI } from '../../../../../../base/common/uri.js';
import { assert } from '../../../../../../base/common/assert.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { FilePromptParser } from '../../../common/promptSyntax/parsers/filePromptParser.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * A wrapper class for an `IDynamicVariable` object that that adds functionality
 * to parse nested file references of this variable.
 * See {@link FilePromptParser} for details.
 */
let ChatFileReference = class ChatFileReference extends FilePromptParser {
    /**
     * @throws if the `data` reference is no an instance of `URI`.
     */
    constructor(reference, initService, logService) {
        const { data } = reference;
        assert(data instanceof URI, `Variable data must be an URI, got '${data}'.`);
        super(data, [], initService, logService);
        this.reference = reference;
    }
    /**
     * Note! below are the getters that simply forward to the underlying `IDynamicVariable` object;
     * 		 while we could implement the logic generically using the `Proxy` class here, it's hard
     * 		 to make Typescript to recognize this generic implementation correctly
     */
    get id() {
        return this.reference.id;
    }
    get range() {
        return this.reference.range;
    }
    set range(range) {
        this.reference.range = range;
    }
    get data() {
        return this.uri;
    }
    get prefix() {
        return this.reference.prefix;
    }
    get isFile() {
        return this.reference.isFile;
    }
    get fullName() {
        return this.reference.fullName;
    }
    get icon() {
        return this.reference.icon;
    }
    get modelDescription() {
        return this.reference.modelDescription;
    }
};
ChatFileReference = __decorate([
    __param(1, IInstantiationService),
    __param(2, ILogService)
], ChatFileReference);
export { ChatFileReference };

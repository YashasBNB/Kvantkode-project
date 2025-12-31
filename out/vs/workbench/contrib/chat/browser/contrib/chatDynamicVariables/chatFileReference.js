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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEZpbGVSZWZlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9jaGF0RHluYW1pY1ZhcmlhYmxlcy9jaGF0RmlsZVJlZmVyZW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMzRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUV4Rzs7OztHQUlHO0FBQ0ksSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxnQkFBZ0I7SUFDdEQ7O09BRUc7SUFDSCxZQUNpQixTQUEyQixFQUNwQixXQUFrQyxFQUM1QyxVQUF1QjtRQUVwQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsU0FBUyxDQUFBO1FBRTFCLE1BQU0sQ0FBQyxJQUFJLFlBQVksR0FBRyxFQUFFLHNDQUFzQyxJQUFJLElBQUksQ0FBQyxDQUFBO1FBRTNFLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQVJ4QixjQUFTLEdBQVQsU0FBUyxDQUFrQjtJQVM1QyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUVILElBQVcsRUFBRTtRQUNaLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVELElBQVcsS0FBSztRQUNmLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUE7SUFDNUIsQ0FBQztJQUVELElBQVcsS0FBSyxDQUFDLEtBQWE7UUFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO0lBQzdCLENBQUM7SUFFRCxJQUFXLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUE7SUFDaEIsQ0FBQztJQUVELElBQVcsTUFBTTtRQUNoQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFBO0lBQzdCLENBQUM7SUFFRCxJQUFXLE1BQU07UUFDaEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQTtJQUM3QixDQUFDO0lBRUQsSUFBVyxRQUFRO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUE7SUFDL0IsQ0FBQztJQUVELElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQVcsZ0JBQWdCO1FBQzFCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtJQUN2QyxDQUFDO0NBQ0QsQ0FBQTtBQXpEWSxpQkFBaUI7SUFNM0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFdBQVcsQ0FBQTtHQVBELGlCQUFpQixDQXlEN0IifQ==
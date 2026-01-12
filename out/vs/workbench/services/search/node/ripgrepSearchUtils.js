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
import { ILogService } from '../../../../platform/log/common/log.js';
import { SearchRange } from '../common/search.js';
import * as searchExtTypes from '../common/searchExtTypes.js';
export function anchorGlob(glob) {
    return glob.startsWith('**') || glob.startsWith('/') ? glob : `/${glob}`;
}
export function rangeToSearchRange(range) {
    return new SearchRange(range.start.line, range.start.character, range.end.line, range.end.character);
}
export function searchRangeToRange(range) {
    return new searchExtTypes.Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
}
let OutputChannel = class OutputChannel {
    constructor(prefix, logService) {
        this.prefix = prefix;
        this.logService = logService;
    }
    appendLine(msg) {
        this.logService.debug(`${this.prefix}#search`, msg);
    }
};
OutputChannel = __decorate([
    __param(1, ILogService)
], OutputChannel);
export { OutputChannel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFNlYXJjaFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL25vZGUvcmlwZ3JlcFNlYXJjaFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDakQsT0FBTyxLQUFLLGNBQWMsTUFBTSw2QkFBNkIsQ0FBQTtBQUk3RCxNQUFNLFVBQVUsVUFBVSxDQUFDLElBQVk7SUFDdEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQTtBQUN6RSxDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEtBQTJCO0lBQzdELE9BQU8sSUFBSSxXQUFXLENBQ3JCLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUNoQixLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFDckIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQ2QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQ25CLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEtBQWtCO0lBQ3BELE9BQU8sSUFBSSxjQUFjLENBQUMsS0FBSyxDQUM5QixLQUFLLENBQUMsZUFBZSxFQUNyQixLQUFLLENBQUMsV0FBVyxFQUNqQixLQUFLLENBQUMsYUFBYSxFQUNuQixLQUFLLENBQUMsU0FBUyxDQUNmLENBQUE7QUFDRixDQUFDO0FBTU0sSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYTtJQUN6QixZQUNTLE1BQWMsRUFDUSxVQUF1QjtRQUQ3QyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ1EsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQUNuRCxDQUFDO0lBRUosVUFBVSxDQUFDLEdBQVc7UUFDckIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDcEQsQ0FBQztDQUNELENBQUE7QUFUWSxhQUFhO0lBR3ZCLFdBQUEsV0FBVyxDQUFBO0dBSEQsYUFBYSxDQVN6QiJ9
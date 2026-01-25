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
import { assert } from '../../../../../../base/common/assert.js';
import { PromptFilesLocator } from '../utils/promptFilesLocator.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ObjectCache } from '../../../../../../base/common/objectCache.js';
import { TextModelPromptParser } from '../parsers/textModelPromptParser.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IUserDataProfileService } from '../../../../../services/userDataProfile/common/userDataProfile.js';
/**
 * Provides prompt services.
 */
let PromptsService = class PromptsService extends Disposable {
    constructor(initService, userDataService) {
        super();
        this.initService = initService;
        this.userDataService = userDataService;
        /**
         * Prompt files locator utility.
         */
        this.fileLocator = this.initService.createInstance(PromptFilesLocator);
        // the factory function below creates a new prompt parser object
        // for the provided model, if no active non-disposed parser exists
        this.cache = this._register(new ObjectCache((model) => {
            /**
             * Note! When/if shared with "file" prompts, the `seenReferences` array below must be taken into account.
             * Otherwise consumers will either see incorrect failing or incorrect successful results, based on their
             * use case, timing of their calls to the {@link getSyntaxParserFor} function, and state of this service.
             */
            const parser = initService.createInstance(TextModelPromptParser, model, []);
            parser.start();
            // this is a sanity check and the contract of the object cache,
            // we must return a non-disposed object from this factory function
            parser.assertNotDisposed('Created prompt parser must not be disposed.');
            return parser;
        }));
    }
    /**
     * @throws {Error} if:
     * 	- the provided model is disposed
     * 	- newly created parser is disposed immediately on initialization.
     * 	  See factory function in the {@link constructor} for more info.
     */
    getSyntaxParserFor(model) {
        assert(!model.isDisposed(), 'Cannot create a prompt syntax parser for a disposed model.');
        return this.cache.get(model);
    }
    async listPromptFiles() {
        const userLocations = [this.userDataService.currentProfile.promptsHome];
        const prompts = await Promise.all([
            this.fileLocator.listFilesIn(userLocations).then(withType('user')),
            this.fileLocator.listFiles().then(withType('local')),
        ]);
        return prompts.flat();
    }
    getSourceFolders(type) {
        // sanity check to make sure we don't miss a new
        // prompt type that could be added in the future
        assert(type === 'local' || type === 'user', `Unknown prompt type '${type}'.`);
        const prompts = type === 'user'
            ? [this.userDataService.currentProfile.promptsHome]
            : this.fileLocator.getConfigBasedSourceFolders();
        return prompts.map(addType(type));
    }
};
PromptsService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IUserDataProfileService)
], PromptsService);
export { PromptsService };
/**
 * Utility to add a provided prompt `type` to a prompt URI.
 */
const addType = (type) => {
    return (uri) => {
        return { uri, type: type };
    };
};
/**
 * Utility to add a provided prompt `type` to a list of prompt URIs.
 */
const withType = (type) => {
    return (uris) => {
        return uris.map(addType(type));
    };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9zZXJ2aWNlL3Byb21wdHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBRTNHOztHQUVHO0FBQ0ksSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLFVBQVU7SUFhN0MsWUFDd0IsV0FBbUQsRUFDakQsZUFBeUQ7UUFFbEYsS0FBSyxFQUFFLENBQUE7UUFIaUMsZ0JBQVcsR0FBWCxXQUFXLENBQXVCO1FBQ2hDLG9CQUFlLEdBQWYsZUFBZSxDQUF5QjtRQVBuRjs7V0FFRztRQUNjLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQVFqRixnRUFBZ0U7UUFDaEUsa0VBQWtFO1FBQ2xFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDMUIsSUFBSSxXQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUN6Qjs7Oztl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
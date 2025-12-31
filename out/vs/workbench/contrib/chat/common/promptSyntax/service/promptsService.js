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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvc2VydmljZS9wcm9tcHRzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUUzRzs7R0FFRztBQUNJLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxVQUFVO0lBYTdDLFlBQ3dCLFdBQW1ELEVBQ2pELGVBQXlEO1FBRWxGLEtBQUssRUFBRSxDQUFBO1FBSGlDLGdCQUFXLEdBQVgsV0FBVyxDQUF1QjtRQUNoQyxvQkFBZSxHQUFmLGVBQWUsQ0FBeUI7UUFQbkY7O1dBRUc7UUFDYyxnQkFBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFRakYsZ0VBQWdFO1FBQ2hFLGtFQUFrRTtRQUNsRSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzFCLElBQUksV0FBVyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDekI7Ozs7ZUFJRztZ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
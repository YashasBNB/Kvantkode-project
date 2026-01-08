/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { parseSavedSearchEditor, parseSerializedSearchEditor } from './searchEditorSerialization.js';
import { IWorkingCopyBackupService } from '../../../services/workingCopy/common/workingCopyBackup.js';
import { SearchEditorWorkingCopyTypeId } from './constants.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { createTextBufferFactoryFromStream } from '../../../../editor/common/model/textModel.js';
import { Emitter } from '../../../../base/common/event.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { SEARCH_RESULT_LANGUAGE_ID } from '../../../services/search/common/search.js';
export class SearchConfigurationModel {
    constructor(config) {
        this.config = config;
        this._onConfigDidUpdate = new Emitter();
        this.onConfigDidUpdate = this._onConfigDidUpdate.event;
    }
    updateConfig(config) {
        this.config = config;
        this._onConfigDidUpdate.fire(config);
    }
}
export class SearchEditorModel {
    constructor(resource) {
        this.resource = resource;
    }
    async resolve() {
        return assertIsDefined(searchEditorModelFactory.models.get(this.resource)).resolve();
    }
}
class SearchEditorModelFactory {
    constructor() {
        this.models = new ResourceMap();
    }
    initializeModelFromExistingModel(accessor, resource, config) {
        if (this.models.has(resource)) {
            throw Error('Unable to contruct model for resource that already exists');
        }
        const languageService = accessor.get(ILanguageService);
        const modelService = accessor.get(IModelService);
        const instantiationService = accessor.get(IInstantiationService);
        const workingCopyBackupService = accessor.get(IWorkingCopyBackupService);
        let ongoingResolve;
        this.models.set(resource, {
            resolve: () => {
                if (!ongoingResolve) {
                    ongoingResolve = (async () => {
                        const backup = await this.tryFetchModelFromBackupService(resource, languageService, modelService, workingCopyBackupService, instantiationService);
                        if (backup) {
                            return backup;
                        }
                        return Promise.resolve({
                            resultsModel: modelService.getModel(resource) ??
                                modelService.createModel('', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
                            configurationModel: new SearchConfigurationModel(config),
                        });
                    })();
                }
                return ongoingResolve;
            },
        });
    }
    initializeModelFromRawData(accessor, resource, config, contents) {
        if (this.models.has(resource)) {
            throw Error('Unable to contruct model for resource that already exists');
        }
        const languageService = accessor.get(ILanguageService);
        const modelService = accessor.get(IModelService);
        const instantiationService = accessor.get(IInstantiationService);
        const workingCopyBackupService = accessor.get(IWorkingCopyBackupService);
        let ongoingResolve;
        this.models.set(resource, {
            resolve: () => {
                if (!ongoingResolve) {
                    ongoingResolve = (async () => {
                        const backup = await this.tryFetchModelFromBackupService(resource, languageService, modelService, workingCopyBackupService, instantiationService);
                        if (backup) {
                            return backup;
                        }
                        return Promise.resolve({
                            resultsModel: modelService.createModel(contents ?? '', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
                            configurationModel: new SearchConfigurationModel(config),
                        });
                    })();
                }
                return ongoingResolve;
            },
        });
    }
    initializeModelFromExistingFile(accessor, resource, existingFile) {
        if (this.models.has(resource)) {
            throw Error('Unable to contruct model for resource that already exists');
        }
        const languageService = accessor.get(ILanguageService);
        const modelService = accessor.get(IModelService);
        const instantiationService = accessor.get(IInstantiationService);
        const workingCopyBackupService = accessor.get(IWorkingCopyBackupService);
        let ongoingResolve;
        this.models.set(resource, {
            resolve: async () => {
                if (!ongoingResolve) {
                    ongoingResolve = (async () => {
                        const backup = await this.tryFetchModelFromBackupService(resource, languageService, modelService, workingCopyBackupService, instantiationService);
                        if (backup) {
                            return backup;
                        }
                        const { text, config } = await instantiationService.invokeFunction(parseSavedSearchEditor, existingFile);
                        return {
                            resultsModel: modelService.createModel(text ?? '', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
                            configurationModel: new SearchConfigurationModel(config),
                        };
                    })();
                }
                return ongoingResolve;
            },
        });
    }
    async tryFetchModelFromBackupService(resource, languageService, modelService, workingCopyBackupService, instantiationService) {
        const backup = await workingCopyBackupService.resolve({
            resource,
            typeId: SearchEditorWorkingCopyTypeId,
        });
        let model = modelService.getModel(resource);
        if (!model && backup) {
            const factory = await createTextBufferFactoryFromStream(backup.value);
            model = modelService.createModel(factory, languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource);
        }
        if (model) {
            const existingFile = model.getValue();
            const { text, config } = parseSerializedSearchEditor(existingFile);
            modelService.destroyModel(resource);
            return {
                resultsModel: modelService.createModel(text ?? '', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
                configurationModel: new SearchConfigurationModel(config),
            };
        }
        else {
            return undefined;
        }
    }
}
export const searchEditorModelFactory = new SearchEditorModelFactory();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaEVkaXRvci9icm93c2VyL3NlYXJjaEVkaXRvck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDckcsT0FBTyxFQUF1Qiw2QkFBNkIsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBT3JGLE1BQU0sT0FBTyx3QkFBd0I7SUFJcEMsWUFBbUIsTUFBcUM7UUFBckMsV0FBTSxHQUFOLE1BQU0sQ0FBK0I7UUFIaEQsdUJBQWtCLEdBQUcsSUFBSSxPQUFPLEVBQXVCLENBQUE7UUFDL0Msc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtJQUVOLENBQUM7SUFDNUQsWUFB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
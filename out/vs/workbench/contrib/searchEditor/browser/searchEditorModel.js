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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2hFZGl0b3IvYnJvd3Nlci9zZWFyY2hFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3JHLE9BQU8sRUFBdUIsNkJBQTZCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQU9yRixNQUFNLE9BQU8sd0JBQXdCO0lBSXBDLFlBQW1CLE1BQXFDO1FBQXJDLFdBQU0sR0FBTixNQUFNLENBQStCO1FBSGhELHVCQUFrQixHQUFHLElBQUksT0FBTyxFQUF1QixDQUFBO1FBQy9DLHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7SUFFTixDQUFDO0lBQzVELFlBQVksQ0FB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
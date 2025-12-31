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
import { Color, RGBA } from '../../../../base/common/color.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
let DefaultDocumentColorProvider = class DefaultDocumentColorProvider {
    constructor(_editorWorkerService) {
        this._editorWorkerService = _editorWorkerService;
    }
    async provideDocumentColors(model, _token) {
        return this._editorWorkerService.computeDefaultDocumentColors(model.uri);
    }
    provideColorPresentations(_model, colorInfo, _token) {
        const range = colorInfo.range;
        const colorFromInfo = colorInfo.color;
        const alpha = colorFromInfo.alpha;
        const color = new Color(new RGBA(Math.round(255 * colorFromInfo.red), Math.round(255 * colorFromInfo.green), Math.round(255 * colorFromInfo.blue), alpha));
        const rgb = alpha ? Color.Format.CSS.formatRGB(color) : Color.Format.CSS.formatRGBA(color);
        const hsl = alpha ? Color.Format.CSS.formatHSL(color) : Color.Format.CSS.formatHSLA(color);
        const hex = alpha ? Color.Format.CSS.formatHex(color) : Color.Format.CSS.formatHexA(color);
        const colorPresentations = [];
        colorPresentations.push({ label: rgb, textEdit: { range: range, text: rgb } });
        colorPresentations.push({ label: hsl, textEdit: { range: range, text: hsl } });
        colorPresentations.push({ label: hex, textEdit: { range: range, text: hex } });
        return colorPresentations;
    }
};
DefaultDocumentColorProvider = __decorate([
    __param(0, IEditorWorkerService)
], DefaultDocumentColorProvider);
export { DefaultDocumentColorProvider };
let DefaultDocumentColorProviderFeature = class DefaultDocumentColorProviderFeature extends Disposable {
    constructor(_languageFeaturesService, editorWorkerService) {
        super();
        this._register(_languageFeaturesService.colorProvider.register('*', new DefaultDocumentColorProvider(editorWorkerService)));
    }
};
DefaultDocumentColorProviderFeature = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IEditorWorkerService)
], DefaultDocumentColorProviderFeature);
export { DefaultDocumentColorProviderFeature };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdERvY3VtZW50Q29sb3JQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvZGVmYXVsdERvY3VtZW50Q29sb3JQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBUTlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUV4RSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE0QjtJQUN4QyxZQUFtRCxvQkFBMEM7UUFBMUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtJQUFHLENBQUM7SUFFakcsS0FBSyxDQUFDLHFCQUFxQixDQUMxQixLQUFpQixFQUNqQixNQUF5QjtRQUV6QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVELHlCQUF5QixDQUN4QixNQUFrQixFQUNsQixTQUE0QixFQUM1QixNQUF5QjtRQUV6QixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFBO1FBQzdCLE1BQU0sYUFBYSxHQUFXLFNBQVMsQ0FBQyxLQUFLLENBQUE7UUFDN0MsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQTtRQUNqQyxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FDdEIsSUFBSSxJQUFJLENBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFDcEMsS0FBSyxDQUNMLENBQ0QsQ0FBQTtRQUVELE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDMUYsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMxRixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRTFGLE1BQU0sa0JBQWtCLEdBQXlCLEVBQUUsQ0FBQTtRQUNuRCxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5RSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5RSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5RSxPQUFPLGtCQUFrQixDQUFBO0lBQzFCLENBQUM7Q0FDRCxDQUFBO0FBckNZLDRCQUE0QjtJQUMzQixXQUFBLG9CQUFvQixDQUFBO0dBRHJCLDRCQUE0QixDQXFDeEM7O0FBRU0sSUFBTSxtQ0FBbUMsR0FBekMsTUFBTSxtQ0FBb0MsU0FBUSxVQUFVO0lBQ2xFLFlBQzJCLHdCQUFrRCxFQUN0RCxtQkFBeUM7UUFFL0QsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsU0FBUyxDQUNiLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQzlDLEdBQUcsRUFDSCxJQUFJLDRCQUE0QixDQUFDLG1CQUFtQixDQUFDLENBQ3JELENBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBYlksbUNBQW1DO0lBRTdDLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxvQkFBb0IsQ0FBQTtHQUhWLG1DQUFtQyxDQWEvQyJ9
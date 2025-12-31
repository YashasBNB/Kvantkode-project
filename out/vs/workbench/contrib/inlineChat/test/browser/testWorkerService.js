var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { mock } from '../../../../../base/test/common/mock.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { assertType } from '../../../../../base/common/types.js';
import { EditorWorker } from '../../../../../editor/common/services/editorWebWorker.js';
import { LineRange } from '../../../../../editor/common/core/lineRange.js';
import { MovedText } from '../../../../../editor/common/diff/linesDiffComputer.js';
import { LineRangeMapping, DetailedLineRangeMapping, RangeMapping, } from '../../../../../editor/common/diff/rangeMapping.js';
let TestWorkerService = class TestWorkerService extends mock() {
    constructor(_modelService) {
        super();
        this._modelService = _modelService;
        this._worker = new EditorWorker();
    }
    async computeMoreMinimalEdits(resource, edits, pretty) {
        return undefined;
    }
    async computeDiff(original, modified, options, algorithm) {
        const originalModel = this._modelService.getModel(original);
        const modifiedModel = this._modelService.getModel(modified);
        assertType(originalModel);
        assertType(modifiedModel);
        this._worker.$acceptNewModel({
            url: originalModel.uri.toString(),
            versionId: originalModel.getVersionId(),
            lines: originalModel.getLinesContent(),
            EOL: originalModel.getEOL(),
        });
        this._worker.$acceptNewModel({
            url: modifiedModel.uri.toString(),
            versionId: modifiedModel.getVersionId(),
            lines: modifiedModel.getLinesContent(),
            EOL: modifiedModel.getEOL(),
        });
        const result = await this._worker.$computeDiff(originalModel.uri.toString(), modifiedModel.uri.toString(), options, algorithm);
        if (!result) {
            return result;
        }
        // Convert from space efficient JSON data to rich objects.
        const diff = {
            identical: result.identical,
            quitEarly: result.quitEarly,
            changes: toLineRangeMappings(result.changes),
            moves: result.moves.map((m) => new MovedText(new LineRangeMapping(new LineRange(m[0], m[1]), new LineRange(m[2], m[3])), toLineRangeMappings(m[4]))),
        };
        return diff;
        function toLineRangeMappings(changes) {
            return changes.map((c) => new DetailedLineRangeMapping(new LineRange(c[0], c[1]), new LineRange(c[2], c[3]), c[4]?.map((c) => new RangeMapping(new Range(c[0], c[1], c[2], c[3]), new Range(c[4], c[5], c[6], c[7])))));
        }
    }
};
TestWorkerService = __decorate([
    __param(0, IModelService)
], TestWorkerService);
export { TestWorkerService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFdvcmtlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L3Rlc3QvYnJvd3Nlci90ZXN0V29ya2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFLQSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFVaEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbEYsT0FBTyxFQUNOLGdCQUFnQixFQUNoQix3QkFBd0IsRUFDeEIsWUFBWSxHQUNaLE1BQU0sbURBQW1ELENBQUE7QUFHbkQsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxJQUFJLEVBQXdCO0lBR2xFLFlBQTJCLGFBQTZDO1FBQ3ZFLEtBQUssRUFBRSxDQUFBO1FBRG9DLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBRnZELFlBQU8sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFBO0lBSTdDLENBQUM7SUFFUSxLQUFLLENBQUMsdUJBQXVCLENBQ3JDLFFBQWEsRUFDYixLQUFvQyxFQUNwQyxNQUE0QjtRQUU1QixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRVEsS0FBSyxDQUFDLFdBQVcsQ0FDekIsUUFBYSxFQUNiLFFBQWEsRUFDYixPQUFxQyxFQUNyQyxTQUE0QjtRQUU1QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMzRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUUzRCxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDekIsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRXpCLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDO1lBQzVCLEdBQUcsRUFBRSxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRTtZQUNqQyxTQUFTLEVBQUUsYUFBYSxDQUFDLFlBQVksRUFBRTtZQUN2QyxLQUFLLEVBQUUsYUFBYSxDQUFDLGVBQWUsRUFBRTtZQUN0QyxHQUFHLEVBQUUsYUFBYSxDQUFDLE1BQU0sRUFBRTtTQUMzQixDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQztZQUM1QixHQUFHLEVBQUUsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUU7WUFDakMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxZQUFZLEVBQUU7WUFDdkMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxlQUFlLEVBQUU7WUFDdEMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxNQUFNLEVBQUU7U0FDM0IsQ0FBQyxDQUFBO1FBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FDN0MsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDNUIsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDNUIsT0FBTyxFQUNQLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO1FBQ0QsMERBQTBEO1FBQzFELE1BQU0sSUFBSSxHQUFrQjtZQUMzQixTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7WUFDM0IsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO1lBQzNCLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO1lBQzVDLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FDdEIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLElBQUksU0FBUyxDQUNaLElBQUksZ0JBQWdCLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMxRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDekIsQ0FDRjtTQUNELENBQUE7UUFDRCxPQUFPLElBQUksQ0FBQTtRQUVYLFNBQVMsbUJBQW1CLENBQzNCLE9BQStCO1lBRS9CLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FDakIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLElBQUksd0JBQXdCLENBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDekIsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUNSLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxJQUFJLFlBQVksQ0FDZixJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDakMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ2pDLENBQ0YsQ0FDRCxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFwRlksaUJBQWlCO0lBR2hCLFdBQUEsYUFBYSxDQUFBO0dBSGQsaUJBQWlCLENBb0Y3QiJ9
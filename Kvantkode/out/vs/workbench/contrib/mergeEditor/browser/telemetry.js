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
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
let MergeEditorTelemetry = class MergeEditorTelemetry {
    constructor(telemetryService) {
        this.telemetryService = telemetryService;
    }
    reportMergeEditorOpened(args) {
        this.telemetryService.publicLog2('mergeEditor.opened', {
            conflictCount: args.conflictCount,
            combinableConflictCount: args.combinableConflictCount,
            baseVisible: args.baseVisible,
            isColumnView: args.isColumnView,
            baseTop: args.baseTop,
        });
    }
    reportLayoutChange(args) {
        this.telemetryService.publicLog2('mergeEditor.layoutChanged', {
            baseVisible: args.baseVisible,
            isColumnView: args.isColumnView,
            baseTop: args.baseTop,
        });
    }
    reportMergeEditorClosed(args) {
        this.telemetryService.publicLog2('mergeEditor.closed', {
            conflictCount: args.conflictCount,
            combinableConflictCount: args.combinableConflictCount,
            durationOpenedSecs: args.durationOpenedSecs,
            remainingConflictCount: args.remainingConflictCount,
            accepted: args.accepted,
            conflictsResolvedWithBase: args.conflictsResolvedWithBase,
            conflictsResolvedWithInput1: args.conflictsResolvedWithInput1,
            conflictsResolvedWithInput2: args.conflictsResolvedWithInput2,
            conflictsResolvedWithSmartCombination: args.conflictsResolvedWithSmartCombination,
            manuallySolvedConflictCountThatEqualNone: args.manuallySolvedConflictCountThatEqualNone,
            manuallySolvedConflictCountThatEqualSmartCombine: args.manuallySolvedConflictCountThatEqualSmartCombine,
            manuallySolvedConflictCountThatEqualInput1: args.manuallySolvedConflictCountThatEqualInput1,
            manuallySolvedConflictCountThatEqualInput2: args.manuallySolvedConflictCountThatEqualInput2,
            manuallySolvedConflictCountThatEqualNoneAndStartedWithBase: args.manuallySolvedConflictCountThatEqualNoneAndStartedWithBase,
            manuallySolvedConflictCountThatEqualNoneAndStartedWithInput1: args.manuallySolvedConflictCountThatEqualNoneAndStartedWithInput1,
            manuallySolvedConflictCountThatEqualNoneAndStartedWithInput2: args.manuallySolvedConflictCountThatEqualNoneAndStartedWithInput2,
            manuallySolvedConflictCountThatEqualNoneAndStartedWithBothNonSmart: args.manuallySolvedConflictCountThatEqualNoneAndStartedWithBothNonSmart,
            manuallySolvedConflictCountThatEqualNoneAndStartedWithBothSmart: args.manuallySolvedConflictCountThatEqualNoneAndStartedWithBothSmart,
        });
    }
    reportAcceptInvoked(inputNumber, otherAccepted) {
        this.telemetryService.publicLog2('mergeEditor.action.accept', {
            otherAccepted: otherAccepted,
            isInput1: inputNumber === 1,
        });
    }
    reportSmartCombinationInvoked(otherAccepted) {
        this.telemetryService.publicLog2('mergeEditor.action.smartCombination', {
            otherAccepted: otherAccepted,
        });
    }
    reportRemoveInvoked(inputNumber, otherAccepted) {
        this.telemetryService.publicLog2('mergeEditor.action.remove', {
            otherAccepted: otherAccepted,
            isInput1: inputNumber === 1,
        });
    }
    reportResetToBaseInvoked() {
        this.telemetryService.publicLog2('mergeEditor.action.resetToBase', {});
    }
    reportNavigationToNextConflict() {
        this.telemetryService.publicLog2('mergeEditor.action.goToNextConflict', {});
    }
    reportNavigationToPreviousConflict() {
        this.telemetryService.publicLog2('mergeEditor.action.goToPreviousConflict', {});
    }
    reportConflictCounterClicked() {
        this.telemetryService.publicLog2('mergeEditor.action.conflictCounterClicked', {});
    }
};
MergeEditorTelemetry = __decorate([
    __param(0, ITelemetryService)
], MergeEditorTelemetry);
export { MergeEditorTelemetry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3RlbGVtZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUUvRSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFvQjtJQUNoQyxZQUFnRCxnQkFBbUM7UUFBbkMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtJQUFHLENBQUM7SUFFdkYsdUJBQXVCLENBQUMsSUFPdkI7UUFDQSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQXlDOUIsb0JBQW9CLEVBQUU7WUFDdkIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLHVCQUF1QixFQUFFLElBQUksQ0FBQyx1QkFBdUI7WUFFckQsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87U0FDckIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELGtCQUFrQixDQUFDLElBSWxCO1FBQ0EsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0EyQjlCLDJCQUEyQixFQUFFO1lBQzlCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1NBQ3JCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxJQXVCdkI7UUFDQSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQTZIOUIsb0JBQW9CLEVB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
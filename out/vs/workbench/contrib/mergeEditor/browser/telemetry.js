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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci90ZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFL0UsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBb0I7SUFDaEMsWUFBZ0QsZ0JBQW1DO1FBQW5DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7SUFBRyxDQUFDO0lBRXZGLHVCQUF1QixDQUFDLElBT3ZCO1FBQ0EsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0F5QzlCLG9CQUFvQixFQUFFO1lBQ3ZCLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYTtZQUNqQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsdUJBQXVCO1lBRXJELFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1NBQ3JCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxJQUlsQjtRQUNBLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBMkI5QiwyQkFBMkIsRUFBRTtZQUM5QixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDN0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztTQUNyQixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsdUJBQXVCLENBQUMsSUF1QnZCO1FBQ0EsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0E2SDlCLG9CQUFvQixFQUFFO1lBQ3ZCLGFBQWEsRUFBRSxJQUFJ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
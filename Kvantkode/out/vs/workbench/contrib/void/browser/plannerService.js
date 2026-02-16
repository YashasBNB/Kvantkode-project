import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IPlannerService = createDecorator('voidPlannerService');
class PlannerService extends Disposable {
    buildPlanFromUserMessage(userMessage) {
        const goal = (userMessage || '').trim() || 'Complete the requested task';
        const steps = [];
        const sentences = goal
            .split(/\n+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .flatMap((line) => line.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean));
        if (sentences.length > 1) {
            for (let i = 0; i < Math.min(sentences.length, 6); i += 1) {
                steps.push({
                    id: String(i + 1),
                    title: sentences[i],
                    status: 'pending',
                });
            }
        }
        else {
            steps.push({ id: '1', title: 'Gather context and constraints', status: 'pending' }, { id: '2', title: 'Implement changes in small, staged steps', status: 'pending' }, { id: '3', title: 'Verify behavior (compile/run) and iterate', status: 'pending' });
        }
        return {
            goal,
            steps,
            updatedAt: new Date().toISOString(),
        };
    }
}
registerSingleton(IPlannerService, PlannerService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhbm5lclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9wbGFubmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQXFCNUYsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBa0Isb0JBQW9CLENBQUMsQ0FBQTtBQUVyRixNQUFNLGNBQWUsU0FBUSxVQUFVO0lBR3RDLHdCQUF3QixDQUFDLFdBQW1CO1FBQzNDLE1BQU0sSUFBSSxHQUFHLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLDZCQUE2QixDQUFBO1FBRXhFLE1BQU0sS0FBSyxHQUFvQixFQUFFLENBQUE7UUFDakMsTUFBTSxTQUFTLEdBQUcsSUFBSTthQUNwQixLQUFLLENBQUMsS0FBSyxDQUFDO2FBQ1osR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7YUFDcEIsTUFBTSxDQUFDLE9BQU8sQ0FBQzthQUNmLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBRXJGLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDM0QsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDVixFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2pCLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUNuQixNQUFNLEVBQUUsU0FBUztpQkFDakIsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxDQUFDLElBQUksQ0FDVCxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFDdkUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSwwQ0FBMEMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQ2pGLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsMkNBQTJDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUNsRixDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU87WUFDTixJQUFJO1lBQ0osS0FBSztZQUNMLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtTQUNuQyxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsaUJBQWlCLENBQUMsZUFBZSxFQUFFLGNBQWMsa0NBQTBCLENBQUEifQ==
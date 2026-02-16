import { Disposable } from '../../../../base/common/lifecycle.js'
import {
	InstantiationType,
	registerSingleton,
} from '../../../../platform/instantiation/common/extensions.js'
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js'

export type AgentPlanStepStatus = 'pending' | 'in_progress' | 'blocked' | 'done' | 'failed'

export type AgentPlanStep = {
	id: string
	title: string
	status: AgentPlanStepStatus
}

export type AgentPlan = {
	goal: string
	steps: AgentPlanStep[]
	updatedAt: string
}

export interface IPlannerService {
	readonly _serviceBrand: undefined
	buildPlanFromUserMessage(userMessage: string): AgentPlan
}

export const IPlannerService = createDecorator<IPlannerService>('voidPlannerService')

class PlannerService extends Disposable implements IPlannerService {
	_serviceBrand: undefined

	buildPlanFromUserMessage(userMessage: string): AgentPlan {
		const goal = (userMessage || '').trim() || 'Complete the requested task'

		const steps: AgentPlanStep[] = []
		const sentences = goal
			.split(/\n+/)
			.map((s) => s.trim())
			.filter(Boolean)
			.flatMap((line) => line.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean))

		if (sentences.length > 1) {
			for (let i = 0; i < Math.min(sentences.length, 6); i += 1) {
				steps.push({
					id: String(i + 1),
					title: sentences[i],
					status: 'pending',
				})
			}
		} else {
			steps.push(
				{ id: '1', title: 'Gather context and constraints', status: 'pending' },
				{ id: '2', title: 'Implement changes in small, staged steps', status: 'pending' },
				{ id: '3', title: 'Verify behavior (compile/run) and iterate', status: 'pending' },
			)
		}

		return {
			goal,
			steps,
			updatedAt: new Date().toISOString(),
		}
	}
}

registerSingleton(IPlannerService, PlannerService, InstantiationType.Eager)

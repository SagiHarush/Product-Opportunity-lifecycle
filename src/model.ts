export type RecordEntity = {
  identifier: string;
  blueprint: string;
  title: string;
  properties: Record<string, unknown>;
  relations: Record<string, unknown>;
};

export const STAGES = ["Discovery", "Requirements", "PRD", "Engineering Plan", "Engineering Handoff"] as const;
export type StageIndex = 0 | 1 | 2 | 3 | 4;
export type StageState = "Current" | "Previous stage" | "Upcoming" | "Decision required";
export const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
export const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && !!item.trim()) : [];
export const relationIds = (value: unknown): string[] => [...new Set(strings(value))];
export const QUESTIONS_NOTE = "Unresolved questions are not enforced blockers.";

export function opportunityIdentifier(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || !("identifier" in value) || typeof value.identifier !== "string" || !value.identifier.trim()) return undefined;
  const properties = "properties" in value && value.properties && typeof value.properties === "object" ? value.properties : undefined;
  const blueprint = "blueprint" in value && typeof value.blueprint === "string" ? value.blueprint :
    "blueprintIdentifier" in value && typeof value.blueprintIdentifier === "string" ? value.blueprintIdentifier :
    properties && "$blueprint" in properties && typeof properties.$blueprint === "string" ? properties.$blueprint : undefined;
  return blueprint === "product_opportunity" ? value.identifier.trim() : undefined;
}

type Phase = { index: StageIndex | null; title: string; explanation: string; decision: string };
const PHASES: Record<string, Phase> = {
  Proposed: { index: 0, title: "Discovery assessment", explanation: "Assess the original customer evidence and the agent's interpretation before committing to requirements work.", decision: "Is the problem worth pursuing, and is the evidence sufficient?" },
  "Product Review": { index: 0, title: "Opportunity assessment", explanation: "Assess the original customer evidence and the agent's interpretation before committing to requirements work.", decision: "Is the problem worth pursuing, and is the evidence sufficient?" },
  "Requirements Review": { index: 1, title: "Requirements review", explanation: "Review the requirements, acceptance criteria and unresolved questions before moving to PRD preparation.", decision: "Are the requirements and acceptance criteria clear enough to prepare a PRD?" },
  "PRD Review": { index: 2, title: "PRD review", explanation: "Review the working PRD proposal. An artifact in the approved field is not a recorded approval.", decision: "Approve, revise or reject the proposed product scope in the PRD Review tab." },
  "Engineering Review": { index: 3, title: "Engineering-plan review", explanation: "Review the engineering proposal against the product requirements and PRD before engineering handoff.", decision: "Approve, revise or reject the proposed engineering approach in the Engineering Review tab." },
  "Ready for Engineering": { index: 4, title: "Engineering handoff pending", explanation: "The status indicates readiness. Creating and handing off engineering work is still the next step, not a completed milestone.", decision: "Confirm the scope and acceptance criteria before opening the existing work-item creation form." },
  Approved: { index: null, title: "Approved - meaning needs confirmation", explanation: "No inspected workflow assigns this status. It does not establish an engineering handoff or work-item creation.", decision: "Confirm what this legacy status means before treating any stage as completed." },
  Rejected: { index: null, title: "Opportunity rejected", explanation: "This opportunity is rejected. The available data does not identify which stage rejected it.", decision: "Review the record and clarify the rejection reason before considering any next step." },
};

export function lifecycle(entity: RecordEntity) {
  const status = text(entity.properties.status);
  const phase = Object.hasOwn(PHASES, status) ? PHASES[status] : {
    index: null, title: "Stage unavailable",
    explanation: status ? `The status "${status}" is not recognized. No successful progression can be inferred.` : "No lifecycle status is recorded. No successful progression can be inferred.",
    decision: "Confirm the opportunity's status in its native Port record.",
  };
  const p = entity.properties;
  const artifacts = {
    requirements: !!text(p.requirements), acceptance: !!text(p.acceptance_criteria),
    prdDraft: !!text(p.prd_proposal), prdField: !!text(p.prd),
    engineeringDraft: !!text(p.engineering_plan_proposal), engineeringField: !!text(p.engineering_plan),
  };
  const warnings: string[] = [];
  if (phase.index !== null) {
    if (phase.index < 2 && (artifacts.prdDraft || artifacts.prdField)) warnings.push("PRD content exists ahead of the recorded stage. Check status and artifact consistency.");
    if (phase.index < 3 && (artifacts.engineeringDraft || artifacts.engineeringField)) warnings.push("Engineering content exists ahead of the recorded stage. Check status and artifact consistency.");
    if (phase.index === 2 && artifacts.prdField) warnings.push("The approved PRD field is populated while PRD review is still current. This is not proof of approval.");
    if (phase.index === 3 && artifacts.engineeringField) warnings.push("The approved engineering-plan field is populated while engineering review is still current. This is not proof of approval.");
    if (phase.index >= 3 && !artifacts.prdField) warnings.push("The status is beyond PRD review, but the approved PRD field is empty.");
    if (phase.index === 4 && !artifacts.engineeringField) warnings.push("Readiness is recorded, but the approved engineering-plan field is empty.");
  }
  const states: StageState[] = STAGES.map((_, index) => phase.index === null ? "Decision required" : index < phase.index ? "Previous stage" : index === phase.index ? "Current" : "Upcoming");
  return { status, ...phase, states, artifacts, warnings,
    rejected: status === "Rejected", signalIds: relationIds(entity.relations.signals),
    adoIds: relationIds(entity.relations.ado_work_items), questions: strings(p.open_questions),
    handoffCompleted: false as const,
  };
}

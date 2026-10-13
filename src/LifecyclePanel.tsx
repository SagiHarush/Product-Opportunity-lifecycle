import { useState } from "react";
import { showRunWorkflowDialog } from "@port-labs/plugins-sdk";
import type { OpportunityData } from "./api";
import { lifecycle, STAGES, type StageIndex } from "./model";
import { entityUrl, TABS } from "./navigation";
import { StageDetails } from "./StageDetails";

const stageDecisions = [
  "Assess whether the original evidence supports requirements work.",
  "Review the requirements, acceptance criteria and unresolved questions.",
  "Review the working product proposal in the existing PRD Review tab.",
  "Review the engineering proposal against the product scope.",
  "Confirm readiness before opening the existing engineering handoff form.",
];
export function LifecyclePanel({ data, origin, reviewDisabled }: { data: OpportunityData; origin: string; reviewDisabled: boolean }) {
  const model = lifecycle(data.entity);
  const requirements = data.entity.properties.requirements;
  const requirementsAvailable = typeof requirements === "string" && !!requirements.trim();
  const [selected, setSelected] = useState<StageIndex | null>(null);
  const stage = selected ?? model.index;
  const activeTitle = selected === null ? model.title : STAGES[selected];
  const links = {
    0: { label: "Review customer evidence", tab: TABS.overview },
    1: { label: "Read requirements", tab: TABS.requirements },
    2: { label: "Open PRD Review", tab: TABS.prd },
    3: { label: "Open Engineering Review", tab: TABS.engineering },
    4: { label: "Review engineering scope", tab: TABS.engineering },
  };
  const action = stage === null ? { label: "Open opportunity record", tab: TABS.overview } : links[stage];
  const ready = selected === null && model.status === "Ready for Engineering" && !model.warnings.length;
  const availability = stage === 0 ? `${model.signalIds.length} distinct customer signals` :
    stage === 1 ? `${model.signalIds.length} linked signals | Requirements ${model.artifacts.requirements ? "available" : "missing"} | Acceptance criteria ${model.artifacts.acceptance ? "available" : "missing"}` :
    stage === 2 ? `Working proposal ${model.artifacts.prdDraft ? "available" : "missing"} | Approved-artifact field ${model.artifacts.prdField ? "available" : "empty"}` :
    stage === 3 ? `Working proposal ${model.artifacts.engineeringDraft ? "available" : "missing"} | Product PRD ${model.artifacts.prdField ? "available" : "missing"}` :
    stage === 4 ? `${model.adoIds.length} related ADO items | Created handoff item not verified` : "A reliable stage cannot be inferred.";
  return <section className={`panel ${model.rejected ? "panel--rejected" : ""}`} aria-label="Product opportunity lifecycle">
    <div className="journey-title"><span>Product journey</span><span className={`status-pill ${model.rejected ? "status-pill--rejected" : ""}`}>{model.status || "Status missing"}</span></div>
    <div className="stages" aria-label="Select a stage to inspect">
      {STAGES.map((label, index) => <button key={label} type="button"
        className={`stage stage--${model.states[index].replaceAll(" ", "-").toLowerCase()} ${selected === index ? "stage--selected" : ""}`}
        aria-pressed={selected === index} aria-expanded={selected === index}
        aria-controls="stage-details" aria-current={model.index === index ? "step" : undefined}
        onClick={() => setSelected(selected === index ? null : index as StageIndex)}>
        <span className="stage-number" aria-hidden="true">{index + 1}</span>
        <span className="stage-label">{label}</span><span className="stage-state" title={model.states[index] === "Previous stage" ? "Earlier in the flow; not a recorded approval." : undefined}>{model.states[index]}</span>
      </button>)}
    </div>
    <div className="decision">
      <div className="decision-copy"><h2>{activeTitle}{selected !== null && <span className="inspecting">Stage details</span>}</h2>
        <p>{selected === null ? model.explanation : stageDecisions[selected]}</p>
        <p className="evidence-line">{availability}</p>
      </div>
      <div className="decision-action">
        {data.entity.properties.status === "Requirements Review" && <>
          <button type="button" className="primary" disabled={reviewDisabled || !requirementsAvailable}
            onClick={() => {
              if (reviewDisabled || !requirementsAvailable) return;
              showRunWorkflowDialog({
                workflowIdentifier: "review_approve_requirements", triggerIdentifier: "trigger",
                initialData: { product_opportunity: data.entity.identifier, requirements },
              });
            }}>Review &amp; Approve Requirements <span aria-hidden="true">&rarr;</span></button>
          {!requirementsAvailable && <span className="muted" role="note">Requirements are unavailable. Refresh after generation completes.</span>}
        </>}
        {ready ? <button type="button" className="primary" onClick={() => showRunWorkflowDialog({
          workflowIdentifier: "create_engineering_work_item", triggerIdentifier: "trigger",
          initialData: { product_opportunity: data.entity.identifier },
        })}>Open handoff form <span aria-hidden="true">&rarr;</span></button> :
          <a className="primary" href={entityUrl(origin, data.entity.blueprint, data.entity.identifier, action.tab)}>{action.label} <span aria-hidden="true">&rarr;</span></a>}
      </div>
    </div>
    {!!model.warnings.length && <div className="consistency" role="note"><strong>Check data consistency.</strong> {model.warnings.join(" ")}</div>}
    {!!model.questions.length && <div className="question-bar">
      <details className="questions"><summary>{model.questions.length} unresolved {model.questions.length === 1 ? "question" : "questions"}</summary><ul>{model.questions.map((question, index) => <li key={index}>{question}</li>)}</ul></details>
    </div>
    }
    <div id="stage-details" hidden={selected === null} className="stage-details">
      {selected !== null && <><div className="detail-heading"><h3>{STAGES[selected]}</h3><button className="text-button" onClick={() => setSelected(null)}>Close details</button></div><StageDetails selected={selected} data={data} origin={origin} /></>}
    </div>
  </section>;
}

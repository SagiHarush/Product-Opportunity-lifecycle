import type { OpportunityData } from "./api";
import { lifecycle, text, type StageIndex } from "./model";
import { Markdown } from "./Markdown";
import { entityUrl } from "./navigation";

function Artifact({ label, value }: { label: string; value: unknown }) {
  return <section><h4>{label} <span className="availability">{text(value) ? "Available" : "Not available"}</span></h4><Markdown value={value} /></section>;
}
export function StageDetails({ selected, data, origin }: { selected: StageIndex; data: OpportunityData; origin: string }) {
  const { entity, signals, workItems } = data;
  const p = entity.properties;
  const model = lifecycle(entity);
  switch (selected) {
    case 0: return <div className="details-grid">
      <section><h4>Agent interpretation</h4><Markdown value={p.evidence_summary} />
        {typeof p.confidence === "number" && <p className="muted">Agent confidence: {p.confidence}. This is an assessment, not an approval.</p>}
      </section>
      <section><h4>Original customer evidence - {model.signalIds.length} distinct signals</h4>
        {!model.signalIds.length && <p className="muted">No linked signals.</p>}
        {signals.map(signal => <details key={signal.identifier}><summary>{signal.title}</summary>
          <p className="muted">{text(signal.properties.source_system)}{text(signal.properties.customer) && ` | ${text(signal.properties.customer)}`}{text(signal.properties.author) && ` | ${text(signal.properties.author)}`}{text(signal.properties.signal_timestamp) && ` | ${text(signal.properties.signal_timestamp)}`}</p>
          <h5>Original text</h5><Markdown value={signal.properties.original_text} />
          <a href={entityUrl(origin, signal.blueprint, signal.identifier)}>Open signal in Port</a>
          {/^https?:\/\//i.test(text(signal.properties.source_url)) && <a className="secondary-link" href={text(signal.properties.source_url)}>Open original source</a>}
          <h5>Agent interpretation (not original facts)</h5>
          <p>{text(signal.properties.agent_decision)}{text(signal.properties.analysis_status) && ` | ${text(signal.properties.analysis_status)}`}</p>
          <Markdown value={signal.properties.agent_reasoning} />
          <h5>Evidence found by the agent</h5><Markdown value={signal.properties.evidence_found} />
        </details>)}
      </section>
    </div>;
    case 1: return <div className="details-grid"><Artifact label="Requirements" value={p.requirements} /><Artifact label="Acceptance criteria" value={p.acceptance_criteria} /></div>;
    case 2: return <><p className="muted">The proposal is a working draft. The approved-artifact field may also be populated by generation; its existence alone is not proof of approval.</p><div className="details-grid"><Artifact label="Working PRD proposal" value={p.prd_proposal} /><Artifact label="Approved PRD field" value={p.prd} /></div></>;
    case 3: return <><p className="muted">Compare the working plan against product scope. Field availability does not establish a recorded review.</p><div className="details-grid"><Artifact label="Working engineering proposal" value={p.engineering_plan_proposal} /><Artifact label="Approved engineering-plan field" value={p.engineering_plan} /><Artifact label="Product context - PRD" value={p.prd} /><Artifact label="Acceptance criteria" value={p.acceptance_criteria} /></div></>;
    case 4: return <><h4>{model.index === 4 ? "Ready for the handoff decision" : "Readiness is not established by the current status"}</h4>
      <p>No created work item is verified by the available entity model. Related ADO items are context, not proof of this opportunity's handoff.</p>
      <p className="muted">The creation workflow does not record a dedicated handoff marker or change the opportunity status. No completion is inferred.</p>
      {workItems.map(item => <p key={item.identifier}><a href={entityUrl(origin, item.blueprint, item.identifier)}>#{item.identifier} - {item.title}</a> <span className="availability">Related context only</span></p>)}
      {!model.adoIds.length && <p className="muted">No related ADO work items.</p>}
    </>;
  }
}

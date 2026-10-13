import ReactMarkdown from "react-markdown";
import { text } from "./model";

export function Markdown({ value, empty = "Not available yet." }: { value: unknown; empty?: string }) {
  const content = text(value);
  return content ? <div className="markdown"><ReactMarkdown skipHtml components={{
    img: ({ alt }) => <span>[Image: {alt || "omitted"}]</span>,
    a: ({ href, children }) => href && /^https?:\/\//i.test(href) ? <a href={href}>{children}</a> : <span>{children}</span>,
  }}>{content}</ReactMarkdown></div> : <p className="muted">{empty}</p>;
}

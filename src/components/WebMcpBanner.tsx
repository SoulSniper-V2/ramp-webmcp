import type { WebMcpStatus } from "../webmcp";

export function WebMcpBanner({ status }: { status: WebMcpStatus }) {
  if (status.connected) {
    return (
      <div className="banner ready" role="status">
        <span className="dot" />
        <strong>agent connected</strong>
        <span className="tools">tools: {status.tools.join(", ")}</span>
      </div>
    );
  }
  return (
    <div className="banner" role="status">
      <span className="dot" />
      <span>
        WebMCP not detected. Open in the ChatGPT desktop in-app browser, or Chrome 149+
        with <code>chrome://flags/#enable-webmcp-testing</code>. The mixer works without
        an agent.
      </span>
    </div>
  );
}

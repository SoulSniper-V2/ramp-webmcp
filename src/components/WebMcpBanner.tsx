import type { WebMcpStatus } from "../webmcp";

export function WebMcpBanner({ status }: { status: WebMcpStatus }) {
  if (status.connected) {
    return (
      <div className="banner ready" role="status">
        <span className="dot" />
        <strong>tools ready</strong>
        <span className="tools">tools: {status.tools.join(", ")}</span>
      </div>
    );
  }
  return (
    <div className="banner" role="status">
      <span className="dot" />
      <span>
        {status.error
          ? `WebMCP registration failed: ${status.error}. `
          : status.available ? "Registering WebMCP tools. " : "WebMCP not detected. "}
        Open in a WebMCP-capable browser, or enable{" "}
        <code>chrome://flags/#enable-webmcp-testing</code> in a supported Chrome release.
        The mixer works without an agent.
      </span>
    </div>
  );
}

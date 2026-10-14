import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: "monospace",
            background: "#2B2D42",
            color: "#FFD93D",
            minHeight: "100vh",
            padding: "24px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            boxSizing: "border-box",
          }}
        >
          <h2 style={{ color: "#FF6B6B", fontFamily: "sans-serif" }}>Something broke 🙈</h2>
          <p style={{ color: "white", fontFamily: "sans-serif" }}>
            Take a screenshot of everything below and send it over so it can be fixed.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily: "sans-serif",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#FF8C42",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              marginBottom: "16px",
            }}
          >
            Reload the app
          </button>
          <div>{String(this.state.error && this.state.error.stack ? this.state.error.stack : this.state.error)}</div>
          {this.state.info && <div style={{ marginTop: 16, opacity: 0.8 }}>{this.state.info.componentStack}</div>}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DashboardPage() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">🔬</div>
      <h3>Welcome to MicroManus</h3>
      <p>
        Start a new chat to begin your research. I can search the web, synthesize information,
        and generate reports for you.
      </p>
      <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span className="badge badge-accent">🔍 Web Search</span>
        <span className="badge badge-green">📄 PDF Reports</span>
        <span className="badge badge-orange">🧠 Multi-step Reasoning</span>
      </div>
    </div>
  );
}

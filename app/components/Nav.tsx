export default function Nav() {
  const link = { marginRight: 16 };
  return (
    <nav style={{ marginBottom: 16 }}>
      <a href="/" style={link}>Chat</a>
      <a href="/triage" style={link}>Triage</a>
      <a href="/smoke" style={link}>Smoke test</a>
      <a href="/admin" style={link}>Admin</a>
    </nav>
  );
}

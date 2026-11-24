export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <form method="post" action="/api/login">
        <h1 style={{ fontSize: 28 }}>Rendimiento</h1>
        <label htmlFor="pw" className="muted small">Contraseña</label>
        <input id="pw" name="password" type="password" autoComplete="current-password" required autoFocus />
        {error && <span className="small bad">Contraseña incorrecta</span>}
        <button type="submit" className="primary">Entrar</button>
      </form>
    </main>
  );
}

// Capa de datos para flows: obtiene la lista desde el servidor
export async function loadFlows() {
  try {
    const res = await fetch('/api/flows');
    return await res.json();
  } catch {
    return [];
  }
}

/*
  Tormenta · el turno de la comunidad
  Archivo con reglas del juego (sin interacción con la pantalla).
  Código y comentarios en español.
*/

// CONFIG: todos los números del juego (con unidad en el comentario)
export const CONFIG = {
  TABLERO_ANCHO: 5, // celdas
  TABLERO_ALTO: 5, // celdas
  MAX_TURNOS: 8, // turnos
  ACCIONES_POR_TURNO: 3, // acciones
  FAMILIAS_MIN: 1, // familias por zona (mínimo)
  FAMILIAS_MAX: 3, // familias por zona (máximo)
  AGUA_INICIAL_MIN: 0, // unidades de agua
  AGUA_INICIAL_MAX: 3, // unidades de agua
  UMBRAL_INUNDACION: 6, // unidades de agua (límite para inundarse)
  DRENA_OBJETIVO: 3, // unidades de agua que quita drenar en la zona objetivo
  DRENA_VECINO: 1, // unidades de agua que quita drenar en zonas adyacentes
  LLUVIA_NORMAL: 1, // unidades de agua por turno en zona normal
  LLUVIA_QUEBRADA: 2, // unidades de agua por turno en la fila de la quebrada
  META_PORCENTAJE: 70, // porcentaje objetivo para ganar (%)
} as const

// Tipos exportados según pedido
export type Estado = 'normal' | 'inundada' | 'evacuada'

export type Zona = {
  id: number
  x: number
  y: number
  familias: number // familias originales en la zona
  agua: number // nivel de agua actual (unidades)
  estado: Estado
  esQuebrada: boolean
}

// Generador de azar con semilla (exportado). Devuelve función que retorna [0,1).
// Implementación basada en mulberry32 (sencilla y determinista).
export function createSeededRng(seed: number): () => number {
  let t = seed >>> 0
  return function () {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// Estado interno de la partida
let tablero: Zona[] = []
let turnoActual = 0
let accionesRestantes = CONFIG.ACCIONES_POR_TURNO
let rng: (() => number) | null = null

// Crear/Inicializar partida con una semilla (determinista)
export function iniciarPartida(seed: number): void {
  rng = createSeededRng(seed)
  tablero = []
  turnoActual = 0
  accionesRestantes = CONFIG.ACCIONES_POR_TURNO

  const ancho = CONFIG.TABLERO_ANCHO
  const alto = CONFIG.TABLERO_ALTO

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const id = y * ancho + x
      // familias: entero entre FAMILIAS_MIN y FAMILIAS_MAX
      const familias =
        CONFIG.FAMILIAS_MIN + Math.floor((rng!() * (CONFIG.FAMILIAS_MAX - CONFIG.FAMILIAS_MIN + 1)))
      // agua inicial: entero entre AGUA_INICIAL_MIN y AGUA_INICIAL_MAX
      const agua = Math.floor(rng!() * (CONFIG.AGUA_INICIAL_MAX - CONFIG.AGUA_INICIAL_MIN + 1)) + CONFIG.AGUA_INICIAL_MIN

      const zona: Zona = {
        id,
        x,
        y,
        familias,
        agua,
        estado: 'normal',
        esQuebrada: y === alto - 1,
      }

      tablero.push(zona)
    }
  }
}

// Función auxiliar: buscar zona por id
function obtenerZona(id: number): Zona | undefined {
  return tablero.find((z) => z.id === id)
}

// Acción: avisar — evacúa y queda a salvo (solo si NO está inundada y no estaba evacuada)
export function avisar(id: number): boolean {
  if (accionesRestantes <= 0) return false
  const z = obtenerZona(id)
  if (!z) return false
  if (z.estado === 'inundada') return false
  if (z.estado === 'evacuada') return false

  z.estado = 'evacuada'
  accionesRestantes -= 1
  return true
}

// Acción: drenar — baja agua en objetivo y en vecinos ortogonales
export function drenar(id: number): boolean {
  if (accionesRestantes <= 0) return false
  const z = obtenerZona(id)
  if (!z) return false

  const ancho = CONFIG.TABLERO_ANCHO
  // disminuir objetivo
  z.agua = Math.max(0, z.agua - CONFIG.DRENA_OBJETIVO)

  // vecinos ortogonales
  const vecinos = [
    obtenerZona(id - ancho), // arriba
    obtenerZona(id + ancho), // abajo
    obtenerZona(id - 1), // izquierda
    obtenerZona(id + 1), // derecha
  ].filter((v): v is Zona => !!v)

  for (const v of vecinos) {
    v.agua = Math.max(0, v.agua - CONFIG.DRENA_VECINO)
  }

  accionesRestantes -= 1
  return true
}

// Aplicar lluvia y procesar inundaciones; se usa al terminar turno
export function terminarTurno(): boolean {
  // no se pueden terminar más turnos si no se inició la partida
  if (!rng && tablero.length === 0) return false

  // aplicar lluvia
  for (const z of tablero) {
    z.agua += z.esQuebrada ? CONFIG.LLUVIA_QUEBRADA : CONFIG.LLUVIA_NORMAL
  }

  // procesar inundaciones: si llega a UMBRAL_INUNDACION pasa a inundada y pierde su gente
  for (const z of tablero) {
    if (z.estado !== 'inundada' && z.agua >= CONFIG.UMBRAL_INUNDACION) {
      z.estado = 'inundada'
      // las familias se consideran perdidas (estado usado en cálculos)
    }
  }

  turnoActual += 1
  accionesRestantes = CONFIG.ACCIONES_POR_TURNO
  return true
}

// Consultas y utilidades (solo datos)
export function obtenerTablero(): Zona[] {
  // devolver copia superficial para evitar manipulaciones directas
  return tablero.map((z) => ({ ...z }))
}

export function obtenerTurno(): number {
  return turnoActual
}

export function obtenerAccionesRestantes(): number {
  return accionesRestantes
}

export function familiasTotales(): number {
  return tablero.reduce((s, z) => s + z.familias, 0)
}

export function familiasSalvas(): number {
  return tablero.reduce((s, z) => s + (z.estado === 'evacuada' ? z.familias : 0), 0)
}

export function familiasPerdidas(): number {
  return tablero.reduce((s, z) => s + (z.estado === 'inundada' ? z.familias : 0), 0)
}

export function familiasEnRiesgo(): number {
  return tablero.reduce((s, z) => s + (z.estado === 'normal' ? z.familias : 0), 0)
}

export function porcentajeSalvado(): number {
  const total = familiasTotales()
  if (total === 0) return 0
  return (familiasSalvas() / total) * 100
}

export function objetivoNecesario(): number {
  return Math.ceil((CONFIG.META_PORCENTAJE / 100) * familiasTotales())
}

// Devuelve true si ya es matemáticamente imposible alcanzar la meta
export function esMatematicamenteImposible(): boolean {
  const maxPosible = familiasSalvas() + familiasEnRiesgo()
  return maxPosible < objetivoNecesario()
}

// Estado final: ganador/ perdedor según reglas (se evalúa al terminar los 8 turnos)
export function resultadoFinal(): { ganado: boolean; perdido: boolean } {
  const terminado = turnoActual >= CONFIG.MAX_TURNOS
  if (!terminado) return { ganado: false, perdido: false }

  const ganado = familiasSalvas() >= objetivoNecesario()
  const perdido = !ganado
  return { ganado, perdido }
}

// Exportar función de consulta general para la interfaz (sin UI aquí)
export function estadoParaInterfaz() {
  return {
    turno: turnoActual,
    accionesRestantes,
    familiasSalvas: familiasSalvas(),
    familiasEnRiesgo: familiasEnRiesgo(),
    familiasPerdidas: familiasPerdidas(),
    porcentaje: porcentajeSalvado(),
    objetivo: CONFIG.META_PORCENTAJE,
    maxTurnos: CONFIG.MAX_TURNOS,
    esMatematicamenteImposible: esMatematicamenteImposible(),
  }
}

/*
  NOTAS (para el usuario):
  - Este archivo implementa las reglas solicitadas y no toca la pantalla.
  - Las funciones que modifican estado (`avisar`, `drenar`, `terminarTurno`) devuelven
    booleano según si la acción fue válida, o si la operación se pudo realizar.
*/

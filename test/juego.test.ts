import { beforeEach, describe, expect, it } from 'vitest'
import {
  CONFIG,
  avisar,
  drenar,
  estadoParaInterfaz,
  familiasEnRiesgo,
  familiasSalvas,
  familiasTotales,
  iniciarPartida,
  obtenerAccionesRestantes,
  obtenerTablero,
  obtenerTurno,
  terminarTurno,
} from '../src/juego'

describe('reglas principales del juego', () => {
  beforeEach(() => {
    iniciarPartida(1234)
  })

  it('inicializa un tablero válido y expone el estado de la partida', () => {
    const tablero = obtenerTablero()

    expect(tablero).toHaveLength(CONFIG.TABLERO_ANCHO * CONFIG.TABLERO_ALTO)
    expect(tablero.map((zona) => zona.id)).toEqual(
      Array.from({ length: tablero.length }, (_, id) => id),
    )
    expect(tablero.every((zona) => zona.estado === 'normal')).toBe(true)
    expect(familiasTotales()).toBe(
      tablero.reduce((total, zona) => total + zona.familias, 0),
    )
    expect(estadoParaInterfaz()).toMatchObject({
      turno: 0,
      accionesRestantes: CONFIG.ACCIONES_POR_TURNO,
      familiasSalvas: 0,
    })
  })

  it('permite evacuar una zona una sola vez y actualiza las familias salvas', () => {
    const familiasZona = obtenerTablero()[0].familias

    expect(avisar(0)).toBe(true)
    expect(avisar(0)).toBe(false)
    expect(familiasSalvas()).toBe(familiasZona)
    expect(familiasEnRiesgo()).toBe(familiasTotales() - familiasZona)
    expect(obtenerAccionesRestantes()).toBe(CONFIG.ACCIONES_POR_TURNO - 1)
  })

  it('drena la zona seleccionada y sus vecinas, y avanza el turno con lluvia', () => {
    const centro = 12
    const antesDeDrenar = obtenerTablero()

    expect(drenar(centro)).toBe(true)

    const despuesDeDrenar = obtenerTablero()
    const zonasAfectadas = [centro, centro - CONFIG.TABLERO_ANCHO, centro + CONFIG.TABLERO_ANCHO, centro - 1, centro + 1]

    for (const id of zonasAfectadas) {
      const cantidadDrenada = id === centro ? CONFIG.DRENA_OBJETIVO : CONFIG.DRENA_VECINO
      expect(despuesDeDrenar[id].agua).toBe(
        Math.max(0, antesDeDrenar[id].agua - cantidadDrenada),
      )
    }
    expect(obtenerAccionesRestantes()).toBe(CONFIG.ACCIONES_POR_TURNO - 1)

    expect(terminarTurno()).toBe(true)
    expect(obtenerTurno()).toBe(1)
    expect(obtenerAccionesRestantes()).toBe(CONFIG.ACCIONES_POR_TURNO)

    const despuesDeLluvia = obtenerTablero()
    expect(despuesDeLluvia[0].agua).toBe(
      despuesDeDrenar[0].agua + CONFIG.LLUVIA_NORMAL,
    )
    const zonaDeQuebrada = CONFIG.TABLERO_ANCHO * (CONFIG.TABLERO_ALTO - 1)
    expect(despuesDeLluvia[zonaDeQuebrada].agua).toBe(
      despuesDeDrenar[zonaDeQuebrada].agua + CONFIG.LLUVIA_QUEBRADA,
    )
  })
})

const K_FACTOR = 40

export function calculateNewElos(
  eloA: number,
  eloB: number,
  goalsA: number,
  goalsB: number,
): { newEloA: number; newEloB: number } {
  const expectedA = 1 / (1 + 10 ** ((eloB - eloA) / 400))
  const expectedB = 1 / (1 + 10 ** ((eloA - eloB) / 400))

  let scoreA = 0.5
  let scoreB = 0.5

  if (goalsA > goalsB) {
    scoreA = 1
    scoreB = 0
  } else if (goalsA < goalsB) {
    scoreA = 0
    scoreB = 1
  }

  const newEloA = Math.max(0, Math.round(eloA + K_FACTOR * (scoreA - expectedA)))
  const newEloB = Math.max(0, Math.round(eloB + K_FACTOR * (scoreB - expectedB)))

  return { newEloA, newEloB }
}

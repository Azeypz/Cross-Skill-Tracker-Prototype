export function validActivityHours(value: unknown): value is number | undefined {
  return (
    value === undefined ||
    (typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0 &&
      value <= 24 &&
      Number.isInteger(value * 4))
  )
}

export const activityHoursError =
  'Enter hours greater than 0 and no more than 24, in quarter-hour increments.'

export function formatActivityHours(value: number | undefined) {
  return value === undefined
    ? '\u2014'
    : `${value} ${value === 1 ? 'hour' : 'hours'}`
}